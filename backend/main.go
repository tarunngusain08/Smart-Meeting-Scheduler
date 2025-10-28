package main

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/handlers"
	"Smart-Meeting-Scheduler/middleware"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Set Gin to release mode in production
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Security headers middleware
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Next()
	})

	// Add CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", cfg.FrontendURL)
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	r.GET("/", handlers.HealthCheck)
	r.GET("/auth/login", handlers.Login(cfg))
	r.GET("/auth/callback", handlers.Callback(cfg))
	r.POST("/auth/callback", handlers.Callback(cfg))
	r.POST("/auth/logout", handlers.Logout)

	auth := r.Group("/graph")
	auth.Use(middleware.AuthMiddleware(cfg))
	auth.GET("/me", handlers.GraphMe(cfg))
	auth.GET("/calendar", handlers.GraphCalendar(cfg))
	auth.GET("/users/search", handlers.SearchUsers(cfg))
	auth.GET("/users", handlers.GetAllUsers(cfg))
	// Temporarily disable auth for current user endpoint
	auth.GET("/user/current", handlers.GetCurrentUser(cfg))

	// Calendar API endpoints for Microsoft Graph integration
	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware(cfg))
	api.GET("/calendar/events", handlers.CalendarEvents(cfg))
	api.POST("/calendar/availability", handlers.CalendarAvailability(cfg))
	api.POST("/calendar/meetings", handlers.CreateMeeting(cfg))
	api.POST("/calendar/findTimes", handlers.FindMeetingTimes(cfg))

	// Test endpoint without authentication
	r.POST("/api/test/findTimes", handlers.FindMeetingTimes(cfg))
	r.GET("/graph/test/user/current", handlers.GetCurrentUser(cfg))

	r.Run(":" + cfg.Port)
}
