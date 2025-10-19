package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/robfig/cron/v3"
)

type deltaResponse struct {
	Value     []models.MSUser `json:"value"`
	NextLink  string          `json:"@odata.nextLink"`
	DeltaLink string          `json:"@odata.deltaLink"`
}

var syncCron *cron.Cron

// InitUserSync initializes the user sync cron job
func InitUserSync(cfg *config.Config) error {
	if err := initUserStore(cfg); err != nil {
		return fmt.Errorf("failed to initialize user store: %v", err)
	}

	syncCron = cron.New()
	_, err := syncCron.AddFunc("0 2 * * *", func() { // Run at 2 AM every day
		if err := syncUsersWithGraph(cfg); err != nil {
			log.Printf("Error syncing users: %v", err)
		}
	})
	if err != nil {
		return fmt.Errorf("failed to schedule sync job: %v", err)
	}

	syncCron.Start()
	log.Println("User sync scheduled for 2 AM daily")
	return nil
}

// syncUsersWithGraph performs the delta sync with Microsoft Graph
func syncUsersWithGraph(cfg *config.Config) error {
	// Get access token
	token, err := cfg.GetAccessToken()
	if err != nil {
		return fmt.Errorf("failed to get access token: %v", err)
	}

	// Get last delta link from database
	var deltaURL string
	row := userStore.GetDB().QueryRow("SELECT value FROM sync_state WHERE key = 'users_delta'")
	if err := row.Scan(&deltaURL); err != nil {
		// If no delta link exists, start fresh
		deltaURL = fmt.Sprintf("%s/users/delta?$select=id,displayName,mail,userPrincipalName&$top=999", cfg.GraphAPIBase)
	}

	client := &http.Client{Timeout: 60 * time.Second}

	for {
		req, err := http.NewRequest("GET", deltaURL, nil)
		if err != nil {
			return fmt.Errorf("failed to create request: %v", err)
		}

		req.Header.Add("Authorization", "Bearer "+token)
		req.Header.Add("Accept", "application/json")

		resp, err := client.Do(req)
		if err != nil {
			return fmt.Errorf("failed to execute request: %v", err)
		}

		// Handle throttling
		if resp.StatusCode == http.StatusTooManyRequests {
			retryAfter := resp.Header.Get("Retry-After")
			waitTime := 10 * time.Second // default backoff
			if secs := strings.TrimSpace(retryAfter); secs != "" {
				if d, err := time.ParseDuration(secs + "s"); err == nil {
					waitTime = d
				}
			}
			time.Sleep(waitTime)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return fmt.Errorf("failed to read response: %v", err)
		}

		if resp.StatusCode < 200 || resp.StatusCode >= 300 {
			return fmt.Errorf("graph API error: %d - %s", resp.StatusCode, string(body))
		}

		var dr deltaResponse
		if err := json.Unmarshal(body, &dr); err != nil {
			return fmt.Errorf("failed to parse response: %v", err)
		}

		// Begin transaction for batch updates
		tx, err := userStore.GetDB().Begin()
		if err != nil {
			return fmt.Errorf("failed to begin transaction: %v", err)
		}

		// Process users in batch
		for _, user := range dr.Value {
			if user.IsRemoved {
				// Handle deleted user
				if _, err := tx.Exec("DELETE FROM users WHERE id = $1", user.ID); err != nil {
					tx.Rollback()
					return fmt.Errorf("failed to delete user: %v", err)
				}
				continue
			}

			// Upsert user
			if err := userStore.UpsertUser(tx, user); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to upsert user: %v", err)
			}
		}

		// If we have a delta link, save it and finish
		if dr.DeltaLink != "" {
			if _, err := tx.Exec(
				"INSERT INTO sync_state (key, value, last_updated) VALUES ('users_delta', $1, CURRENT_TIMESTAMP) "+
					"ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, last_updated = CURRENT_TIMESTAMP",
				dr.DeltaLink,
			); err != nil {
				tx.Rollback()
				return fmt.Errorf("failed to save delta link: %v", err)
			}
			if err := tx.Commit(); err != nil {
				return fmt.Errorf("failed to commit transaction: %v", err)
			}
			break
		}

		// Commit the current batch
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit transaction: %v", err)
		}

		// If we have a next link, continue to the next page
		if dr.NextLink != "" {
			deltaURL = dr.NextLink
			continue
		}

		// If we have neither delta link nor next link, something's wrong
		return fmt.Errorf("received response with neither deltaLink nor nextLink")
	}

	log.Printf("User sync completed successfully at %v", time.Now())
	return nil
}

// TriggerManualSync triggers a manual sync with Microsoft Graph
func TriggerManualSync(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := syncUsersWithGraph(cfg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to sync users: %v", err)})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "User sync completed successfully"})
	}
}
