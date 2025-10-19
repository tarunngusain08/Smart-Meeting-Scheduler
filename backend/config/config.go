package config

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/coreos/go-oidc"
	"github.com/joho/godotenv"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/microsoft"
)

type loggingTransport struct {
	rt http.RoundTripper
}

func (t *loggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	log.Printf("[DEBUG] Making request to: %s", req.URL)
	resp, err := t.rt.RoundTrip(req)
	if err != nil {
		log.Printf("[ERROR] Request failed: %v", err)
		return resp, err
	}

	body, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	log.Printf("[DEBUG] Response: status=%d, body=%s", resp.StatusCode, string(body))

	// Restore the body for subsequent readers
	resp.Body = io.NopCloser(strings.NewReader(string(body)))
	return resp, err
}

type Config struct {
	ClientID     string
	ClientSecret string
	TenantID     string
	RedirectURI  string
	FrontendURL  string
	AuthorityURL string
	GraphAPIBase string
	Port         string
	Provider     *oidc.Provider
	OAuth2Config *oauth2.Config
	Verifier     *oidc.IDTokenVerifier
}

// GetAccessToken gets a client credentials access token for application permissions
func (c *Config) GetAccessToken() (string, error) {
	ctx := context.Background()
	conf := &oauth2.Config{
		ClientID:     c.ClientID,
		ClientSecret: c.ClientSecret,
		Endpoint:     microsoft.AzureADEndpoint(c.TenantID),
	}

	token, err := conf.Exchange(ctx, "",
		oauth2.SetAuthURLParam("grant_type", "client_credentials"),
		oauth2.SetAuthURLParam("scope", "https://graph.microsoft.com/.default"))
	if err != nil {
		return "", fmt.Errorf("failed to get token: %v", err)
	}

	return token.AccessToken, nil
}

func LoadConfig() *Config {
	_ = godotenv.Load()
	clientID := os.Getenv("CLIENT_ID")
	clientSecret := os.Getenv("CLIENT_SECRET")
	tenantID := os.Getenv("TENANT_ID")
	redirectURI := os.Getenv("REDIRECT_URI")
	frontendURL := os.Getenv("FRONTEND_URL")
	authorityURL := strings.TrimRight(os.Getenv("AUTHORITY_URL"), "/")
	graphAPIBase := os.Getenv("GRAPH_API_BASE")
	port := os.Getenv("PORT")

	issuerURL := fmt.Sprintf("%s/%s/v2.0", authorityURL, tenantID)
	log.Printf("Using issuer URL: %s", issuerURL)

	// Create a custom HTTP client with logging
	httpClient := &http.Client{
		Transport: &loggingTransport{http.DefaultTransport},
	}

	ctx := context.WithValue(context.Background(), oauth2.HTTPClient, httpClient)
	provider, err := oidc.NewProvider(ctx, issuerURL)
	if err != nil {
		log.Printf("OIDC provider error. URL: %s, Error: %v", issuerURL, err)
		log.Fatalf("Failed to get OIDC provider: %v", err)
	}
	log.Printf("Successfully connected to OIDC provider")

	oidcConfig := &oidc.Config{
		ClientID: clientID,
	}
	verifier := provider.Verifier(oidcConfig)

	log.Printf("Configuring OAuth2 with Redirect URI: %s", redirectURI)

	endpoint := provider.Endpoint()
	log.Printf("OAuth2 endpoints - Auth: %s, Token: %s", endpoint.AuthURL, endpoint.TokenURL)

	log.Printf("Client Secret length: %d", len(clientSecret))
	log.Printf("Client Secret format check: starts with letter/number? %v, contains ~? %v",
		(clientSecret[0] >= 'A' && clientSecret[0] <= 'Z') || (clientSecret[0] >= 'a' && clientSecret[0] <= 'z') || (clientSecret[0] >= '0' && clientSecret[0] <= '9'),
		strings.Contains(clientSecret, "~"),
	)

	oauth2Config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURI,
		Endpoint:     endpoint,
		Scopes:       []string{"openid", "profile", "email", "offline_access", "User.Read", "User.ReadBasic.All", "Calendars.Read"},
	}

	return &Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		TenantID:     tenantID,
		RedirectURI:  redirectURI,
		FrontendURL:  frontendURL,
		AuthorityURL: authorityURL,
		GraphAPIBase: graphAPIBase,
		Port:         port,
		Provider:     provider,
		OAuth2Config: oauth2Config,
		Verifier:     verifier,
	}
}
