package config

import (
	"database/sql"
	"fmt"
	"os"
	"strconv"

	_ "github.com/lib/pq"
)

type DBConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	DBName   string
}

func defaultEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func NewDBConfig() *DBConfig {
	port := 5432
	if portStr := os.Getenv("DB_PORT"); portStr != "" {
		if p, err := strconv.Atoi(portStr); err == nil {
			port = p
		}
	}

	return &DBConfig{
		Host:     defaultEnv("DB_HOST", "localhost"),
		Port:     port,
		User:     defaultEnv("DB_USER", "scheduler"),
		Password: defaultEnv("DB_PASSWORD", "scheduler"),
		DBName:   defaultEnv("DB_NAME", "meeting_scheduler"),
	}
}

func (c *DBConfig) ConnectDB() (*sql.DB, error) {
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		c.Host, c.Port, c.User, c.Password, c.DBName)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, err
	}

	err = db.Ping()
	if err != nil {
		return nil, err
	}

	return db, nil
}
