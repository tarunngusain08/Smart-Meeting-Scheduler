package models

import (
	"database/sql"
	"encoding/json"
	"time"
)

type User struct {
	ID                string          `json:"id" db:"id"`
	DisplayName       string          `json:"displayName" db:"display_name"`
	Email             string          `json:"mail,omitempty" db:"email"`
	UserPrincipalName string          `json:"userPrincipalName,omitempty" db:"user_principal_name"`
}

type MSUser struct {
	User
	LastSynced        time.Time       `json:"lastSynced" db:"last_synced"`
	IsRemoved         bool           `json:"-"`                        // Indicates if user was removed
	RawJSON           json.RawMessage `json:"-" db:"-"`                // Store raw JSON for future fields

// UnmarshalJSON implements custom JSON unmarshaling to handle @removed field
func (u *MSUser) UnmarshalJSON(data []byte) error {
	type Alias MSUser
	aux := &struct {
		*Alias
		Removed *struct{} `json:"@removed,omitempty"`
	}{
		Alias: (*Alias)(u),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	u.IsRemoved = aux.Removed != nil
	u.RawJSON = json.RawMessage(data)
	return nil
}

type UserStore struct {
	db *sql.DB
}

func NewUserStore(db *sql.DB) *UserStore {
	return &UserStore{db: db}
}

// GetDB returns the database instance
func (s *UserStore) GetDB() *sql.DB {
	return s.db
}

// UpsertUser updates or inserts a single user within a transaction
func (s *UserStore) UpsertUser(tx *sql.Tx, user MSUser) error {
	_, err := tx.Exec(`
		INSERT INTO users (id, display_name, email, user_principal_name, last_synced, raw_json)
		VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5)
		ON CONFLICT (id) DO UPDATE SET
			display_name = EXCLUDED.display_name,
			email = EXCLUDED.email,
			user_principal_name = EXCLUDED.user_principal_name,
			last_synced = CURRENT_TIMESTAMP,
			raw_json = EXCLUDED.raw_json
	`, user.ID, user.DisplayName, user.Email, user.UserPrincipalName, user.RawJSON)
	return err
}

// UpsertUsers updates or inserts multiple users
func (s *UserStore) UpsertUsers(users []MSUser) error {
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	for _, user := range users {
		if err := s.UpsertUser(tx, user); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// SearchUsers searches for users by name or email with smart matching
func (s *UserStore) SearchUsers(query string) ([]MSUser, error) {
	// Add % at the end for partial matching, but also check for exact start of words
	startsWithPattern := query + "%"
	containsPattern := "%" + query + "%"

	rows, err := s.db.Query(`
		WITH RankedUsers AS (
			SELECT 
				id, 
				display_name, 
				email, 
				user_principal_name, 
				last_synced,
				CASE
					-- Highest priority: Starts with match in display name or email
					WHEN display_name ILIKE $1 OR email ILIKE $1 THEN 1
					-- Medium priority: Contains match
					WHEN display_name ILIKE $2 OR email ILIKE $2 THEN 2
					-- Lower priority: UPN match
					WHEN user_principal_name ILIKE $2 THEN 3
					ELSE 4
				END as match_rank,
				-- Use similarity for tie-breaking within same rank
				GREATEST(
					SIMILARITY(LOWER(display_name), LOWER($3)),
					SIMILARITY(LOWER(email), LOWER($3))
				) as similarity_score
			FROM users
			WHERE 
				display_name ILIKE $2 OR
				email ILIKE $2 OR
				user_principal_name ILIKE $2 OR
				-- Add fuzzy matching using pg_trgm
				similarity(LOWER(display_name), LOWER($3)) > 0.3 OR
				similarity(LOWER(email), LOWER($3)) > 0.3
		)
		SELECT 
			id, 
			display_name, 
			email, 
			user_principal_name, 
			last_synced
		FROM RankedUsers
		ORDER BY 
			match_rank,
			similarity_score DESC
		LIMIT 10
	`, startsWithPattern, containsPattern, query)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []MSUser
	for rows.Next() {
		var user MSUser
		err := rows.Scan(&user.ID, &user.DisplayName, &user.Email, &user.UserPrincipalName, &user.LastSynced)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}
