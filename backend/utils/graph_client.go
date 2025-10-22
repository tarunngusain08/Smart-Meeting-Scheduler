package utils

import (
	"context"
	"fmt"
	"time"

	"github.com/Azure/azure-sdk-for-go/sdk/azcore"
	"github.com/Azure/azure-sdk-for-go/sdk/azcore/policy"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
)

// GetGraphClient creates a new Microsoft Graph client using the provided access token
func GetGraphClient(accessToken string) (*msgraphsdk.GraphServiceClient, error) {
	// Initialize the auth provider with the access token
	authProvider := NewAccessTokenAuthProvider(accessToken)

	// Create the Graph client
	graphClient, err := msgraphsdk.NewGraphServiceClientWithCredentials(authProvider, nil)
	if err != nil {
		return nil, err
	}

	return graphClient, nil
}

// AccessTokenAuthProvider implements the auth provider interface for Graph SDK
type AccessTokenAuthProvider struct {
	accessToken string
}

func NewAccessTokenAuthProvider(token string) *AccessTokenAuthProvider {
	return &AccessTokenAuthProvider{
		accessToken: token,
	}
}

// GetToken implements the azcore.TokenCredential interface
func (a *AccessTokenAuthProvider) GetToken(ctx context.Context, options policy.TokenRequestOptions) (azcore.AccessToken, error) {
	return azcore.AccessToken{
		Token:     a.accessToken,
		ExpiresOn: time.Now().Add(time.Hour), // Token expires in 1 hour
	}, nil
}

// GetAuthorizationToken implements the auth provider interface for backward compatibility
func (a *AccessTokenAuthProvider) GetAuthorizationToken(ctx context.Context, url string, additionalAuthenticationContext map[string]interface{}) (string, error) {
	return fmt.Sprintf("Bearer %s", a.accessToken), nil
}
