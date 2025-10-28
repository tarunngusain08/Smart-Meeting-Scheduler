package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// userStore is our database connection for user operations
var userStore *models.UserStore

// initUserStore initializes the user store with a database connection
func initUserStore(cfg *config.Config) error {
	if userStore != nil {
		return nil
	}

	dbCfg := config.NewDBConfig()
	db, err := dbCfg.ConnectDB()
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}

	userStore = models.NewUserStore(db)
	return nil
}

// SyncUsers syncs users from Microsoft Graph to local database
func SyncUsers(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := initUserStore(cfg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize database"})
			return
		}

		accessToken := c.GetString("access_token")
		if accessToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No access token found"})
			return
		}

		// Fetch users from Microsoft Graph
		url := fmt.Sprintf("%s/users?$select=id,displayName,mail,userPrincipalName&$top=999", cfg.GraphAPIBase)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
			return
		}

		req.Header.Add("Authorization", "Bearer "+accessToken)
		req.Header.Add("Accept", "application/json")

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}
		defer resp.Body.Close()

		var result struct {
			Value []models.MSUser `json:"value"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse response"})
			return
		}

		// Update local database
		if err := userStore.UpsertUsers(result.Value); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update local database"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Users synced successfully", "count": len(result.Value)})
	}
}

// SearchUsers handles user search requests using the local database
// If no query is provided, returns all users
func SearchUsers(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := initUserStore(cfg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize database"})
			return
		}

		query := c.Query("q")
		
		var users []models.MSUser
		var err error
		
		if query == "" {
			// If no query, return all users
			users, err = userStore.GetAllUsers()
		} else {
			// Search in local database
			users, err = userStore.SearchUsers(query)
		}
		
		if err != nil {
			log.Printf("Failed to fetch users: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}

		c.JSON(http.StatusOK, users)
	}
}

// GetAllUsers retrieves all users from the database
func GetAllUsers(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		if err := initUserStore(cfg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize database"})
			return
		}

		users, err := userStore.GetAllUsers()
		if err != nil {
			log.Printf("Failed to fetch all users: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}

		c.JSON(http.StatusOK, users)
	}
}

// GetCurrentUser retrieves the current authenticated user's information from database
func GetCurrentUser(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the user ID from the session (this should be set by the auth middleware)
		userID := c.GetString("user_id")
		
		// For testing without auth, use a test user ID
		if userID == "" {
			userID = "0bcef1ba-a180-4211-9ab7-18139716434f" // Tarun's user ID for testing
		}

		if err := initUserStore(cfg); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize database"})
			return
		}

		user, err := userStore.GetUserByID(userID)
		if err != nil {
			log.Printf("Failed to fetch current user %s: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user information"})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}
