package utils

import (
	"Smart-Meeting-Scheduler/models"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"
)

var (
	sessions = make(map[string]models.Session)
	mutex    sync.RWMutex
)

func GenerateSessionID() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func CreateSession(accessToken, refreshToken string, expiresIn int) string {
	sessionID := GenerateSessionID()
	session := models.Session{
		ID:           sessionID,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(time.Duration(expiresIn) * time.Second),
	}

	mutex.Lock()
	sessions[sessionID] = session
	mutex.Unlock()

	return sessionID
}

func GetSession(sessionID string) (models.Session, bool) {
	mutex.RLock()
	session, exists := sessions[sessionID]
	mutex.RUnlock()

	if !exists {
		return models.Session{}, false
	}

	// If token is expired and we have a refresh token, try to refresh
	if time.Now().After(session.ExpiresAt) && session.RefreshToken != "" {
		if newSession, err := refreshSession(session); err == nil {
			mutex.Lock()
			sessions[sessionID] = newSession
			mutex.Unlock()
			return newSession, true
		}
		// If refresh failed, remove the session
		DeleteSession(sessionID)
		return models.Session{}, false
	}

	return session, true
}

func DeleteSession(sessionID string) {
	mutex.Lock()
	delete(sessions, sessionID)
	mutex.Unlock()
}

func refreshSession(session models.Session) (models.Session, error) {
	data := url.Values{}
	data.Set("client_id", os.Getenv("CLIENT_ID"))
	data.Set("client_secret", os.Getenv("CLIENT_SECRET"))
	data.Set("refresh_token", session.RefreshToken)
	data.Set("grant_type", "refresh_token")
	data.Set("scope", "openid profile email offline_access User.Read Calendars.Read Calendars.ReadWrite")

	tokenEndpoint := os.Getenv("OAUTH_TOKEN_ENDPOINT")
	if tokenEndpoint == "" {
		tokenEndpoint = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
	}
	req, err := http.NewRequest("POST", tokenEndpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return models.Session{}, err
	}

	req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return models.Session{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return models.Session{}, fmt.Errorf("failed to refresh token: %d", resp.StatusCode)
	}

	var tokenResp models.RefreshTokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tokenResp); err != nil {
		return models.Session{}, err
	}

	newSession := models.Session{
		ID:           session.ID,
		AccessToken:  tokenResp.AccessToken,
		RefreshToken: session.RefreshToken, // Keep the refresh token
		ExpiresAt:    time.Now().Add(time.Duration(tokenResp.ExpiresIn) * time.Second),
	}

	return newSession, nil
}
