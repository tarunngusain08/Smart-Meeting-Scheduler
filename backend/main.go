package main

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/handlers"
	"Smart-Meeting-Scheduler/middleware"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.LoadConfig()

	// Set Gin to release mode in production
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// ---------------------------
	// 🔐 Security Headers
	// ---------------------------
	r.Use(func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		c.Next()
	})

	// ---------------------------
	// 🌍 CORS Middleware
	// ---------------------------
	r.Use(func(c *gin.Context) {
		// If UI is served from same origin, you can set this to that origin (or remove CORS)
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

	// ---------------------------
	// 🧱 API + Auth routes (register these FIRST)
	// ---------------------------
	r.GET("/health", handlers.HealthCheck)

	r.GET("/auth/login", handlers.Login(cfg))
	r.GET("/auth/callback", handlers.Callback(cfg))
	r.POST("/auth/callback", handlers.Callback(cfg))
	r.GET("/auth/me", handlers.AuthMe(cfg))
	r.POST("/auth/logout", handlers.Logout(cfg))

	auth := r.Group("/graph")
	auth.Use(middleware.AuthMiddleware(cfg))
	auth.GET("/me", handlers.GraphMe(cfg))
	auth.GET("/calendar", handlers.GraphCalendar(cfg))
	auth.GET("/users/search", handlers.SearchUsers(cfg))
	auth.GET("/users", handlers.GetAllUsers(cfg))
	auth.GET("/user/current", handlers.GetCurrentUser(cfg))

	api := r.Group("/api")
	api.Use(middleware.AuthMiddleware(cfg))
	api.GET("/calendar/events", handlers.CalendarEvents(cfg))
	api.POST("/calendar/availability", handlers.CalendarAvailability(cfg))
	api.POST("/calendar/meetings", handlers.CreateMeeting(cfg))
	api.POST("/calendar/findTimes", handlers.FindMeetingTimes(cfg))

	// Test endpoints (no auth)
	r.POST("/api/test/findTimes", handlers.FindMeetingTimes(cfg))
	r.GET("/graph/test/user/current", handlers.GetCurrentUser(cfg))

	// ---------------------------
	// 🌐 Serve static asset directories (no catch-all)
	// ---------------------------
	// Serve JS/CSS bundles: /assets/*
	r.Static("/assets", "./ui/dist/assets")
	// Serve images (if any): /images/*
	r.Static("/images", "./ui/dist/images")
	// If there are other static directories, expose them explicitly:
	// r.Static("/media", "./ui/dist/media")

	// ---------------------------
	// 🧩 SPA fallback — serve index.html for unknown GET routes
	// ---------------------------
	r.NoRoute(func(c *gin.Context) {
		if c.Request.Method != http.MethodGet {
			c.Next()
			return
		}
		// Serve the SPA entrypoint
		c.File("./ui/dist/index.html")
	})

	// ---------------------------
	// 🚀 Start Server
	// ---------------------------
	r.Run(":" + cfg.Port)
}
