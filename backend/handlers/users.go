package handlers

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"Smart-Meeting-Scheduler/services"
	"Smart-Meeting-Scheduler/utils"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// getUserService creates or retrieves the appropriate UserService based on GRAPH_MODE
// For real mode, it uses the access token from context
// For mock mode, it reuses the database connection from config
func getUserService(cfg *config.Config, c *gin.Context) (services.UserService, error) {
	// Get access token from context (set by auth middleware)
	accessToken := utils.GetAccessTokenFromContext(c)
	if accessToken == "" {
		// If no token in context, try to get from session
		// This is a fallback for endpoints that might not have auth middleware
		accessToken = ""
	}

	return services.CreateUserService(cfg, accessToken)
}

// SearchUsers handles user search requests
// Uses Graph API in real mode, database in mock mode
func SearchUsers(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userService, err := getUserService(cfg, c)
		if err != nil {
			log.Printf("Failed to create user service: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize user service"})
			return
		}

		query := c.Query("q")

		var users []models.MSUser

		if query == "" {
			// If no query, return all users
			users, err = userService.GetAllUsers()
		} else {
			// Search users
			users, err = userService.SearchUsers(query)
		}

		if err != nil {
			log.Printf("Failed to fetch users: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}

		c.JSON(http.StatusOK, users)
	}
}

// GetAllUsers retrieves all users
// Uses Graph API in real mode, database in mock mode
func GetAllUsers(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		userService, err := getUserService(cfg, c)
		if err != nil {
			log.Printf("Failed to create user service: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize user service"})
			return
		}

		users, err := userService.GetAllUsers()
		if err != nil {
			log.Printf("Failed to fetch all users: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
			return
		}

		c.JSON(http.StatusOK, users)
	}
}

// GetCurrentUser retrieves the current authenticated user's information
// Uses Graph API in real mode, database in mock mode
func GetCurrentUser(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the user ID from the session (this should be set by the auth middleware)
		userID := c.GetString("user_id")

		// For testing without auth, use a test user ID
		if userID == "" {
			userID = "0bcef1ba-a180-4211-9ab7-18139716434f" // Tarun's user ID for testing
		}

		userService, err := getUserService(cfg, c)
		if err != nil {
			log.Printf("Failed to create user service: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to initialize user service"})
			return
		}

		user, err := userService.GetUserByID(userID)
		if err != nil {
			log.Printf("Failed to fetch current user %s: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user information"})
			return
		}

		c.JSON(http.StatusOK, user)
	}
}
