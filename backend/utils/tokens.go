package utils

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GenerateState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.URLEncoding.EncodeToString(b)
}

func GetAccessTokenFromContext(c *gin.Context) string {
	token, _ := c.Get("access_token")
	if t, ok := token.(string); ok {
		return t
	}
	return ""
}

func GetUserProfile(token string) ([]byte, error) {
	req, err := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me", nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %v", err)
	}

	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to execute request: %v", err)
	}
	defer res.Body.Close()

	if res.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(res.Body)
		return nil, fmt.Errorf("graph API error: status=%d, body=%s", res.StatusCode, string(body))
	}

	return io.ReadAll(res.Body)
}

func GetUserCalendar(token string) ([]byte, error) {
	req, _ := http.NewRequest("GET", "https://graph.microsoft.com/v1.0/me/calendar/events", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	return io.ReadAll(res.Body)
}
