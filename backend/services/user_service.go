package services

import (
	"Smart-Meeting-Scheduler/config"
	"Smart-Meeting-Scheduler/models"
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	abstractions "github.com/microsoft/kiota-abstractions-go"
	msgraphsdk "github.com/microsoftgraph/msgraph-sdk-go"
	graphmodels "github.com/microsoftgraph/msgraph-sdk-go/models"
	graphusers "github.com/microsoftgraph/msgraph-sdk-go/users"
)

// UserService defines the interface for user operations
type UserService interface {
	// GetAllUsers retrieves all users
	GetAllUsers() ([]models.MSUser, error)

	// GetUserByID retrieves a user by their ID
	GetUserByID(userID string) (*models.MSUser, error)

	// SearchUsers searches for users by query string
	SearchUsers(query string) ([]models.MSUser, error)
}

// GraphUserService implements UserService using Microsoft Graph SDK
type GraphUserService struct {
	graphClient *msgraphsdk.GraphServiceClient
	accessToken string
}

// NewGraphUserService creates a new GraphUserService instance
func NewGraphUserService(accessToken string) (*GraphUserService, error) {
	authProvider := &TokenAuthProvider{AccessToken: accessToken}
	adapter, err := msgraphsdk.NewGraphRequestAdapter(authProvider)
	if err != nil {
		return nil, fmt.Errorf("error creating graph adapter: %v", err)
	}
	client := msgraphsdk.NewGraphServiceClient(adapter)

	return &GraphUserService{
		graphClient: client,
		accessToken: accessToken,
	}, nil
}

// GetAllUsers retrieves all users from Microsoft Graph
func (s *GraphUserService) GetAllUsers() ([]models.MSUser, error) {
	users, err := s.graphClient.Users().Get(context.Background(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get users from Graph: %v", err)
	}

	var msUsers []models.MSUser
	for _, user := range users.GetValue() {
		msUser := convertGraphUserToMSUser(user)
		msUsers = append(msUsers, msUser)
	}

	return msUsers, nil
}

// GetUserByID retrieves a user by their ID from Microsoft Graph
func (s *GraphUserService) GetUserByID(userID string) (*models.MSUser, error) {
	user, err := s.graphClient.Users().ByUserId(userID).Get(context.Background(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to get user from Graph: %v", err)
	}

	msUser := convertGraphUserToMSUser(user)
	return &msUser, nil
}

// SearchUsers searches for users using Microsoft Graph search API
func (s *GraphUserService) SearchUsers(query string) ([]models.MSUser, error) {
	// Format search query: "displayName:query" - Graph API expects quoted format
	searchQuery := fmt.Sprintf("\"displayName:%s\"", query)

	headers := abstractions.NewRequestHeaders()
	headers.Add("ConsistencyLevel", "eventual")

	requestCount := true
	requestParameters := &graphusers.UsersRequestBuilderGetQueryParameters{
		Search:  &searchQuery,
		Orderby: []string{"displayName"},
		Count:   &requestCount,
	}

	configuration := &graphusers.UsersRequestBuilderGetRequestConfiguration{
		Headers:         headers,
		QueryParameters: requestParameters,
	}

	users, err := s.graphClient.Users().Get(context.Background(), configuration)
	if err != nil {
		return nil, fmt.Errorf("failed to search users from Graph: %v", err)
	}

	var msUsers []models.MSUser
	for _, user := range users.GetValue() {
		msUser := convertGraphUserToMSUser(user)
		msUsers = append(msUsers, msUser)
	}

	return msUsers, nil
}

// convertGraphUserToMSUser converts a Graph API user to MSUser model
func convertGraphUserToMSUser(user graphmodels.Userable) models.MSUser {
	msUser := models.MSUser{}

	if id := user.GetId(); id != nil {
		msUser.ID = *id
	}
	if displayName := user.GetDisplayName(); displayName != nil {
		msUser.DisplayName = *displayName
	}
	if mail := user.GetMail(); mail != nil {
		msUser.Email = *mail
	}
	if upn := user.GetUserPrincipalName(); upn != nil {
		msUser.UserPrincipalName = *upn
		// If email is empty, use UPN as email
		if msUser.Email == "" {
			msUser.Email = *upn
		}
	}

	return msUser
}

// DatabaseUserService implements UserService using local database
type DatabaseUserService struct {
	userStore *models.UserStore
}

// NewDatabaseUserService creates a new DatabaseUserService instance
func NewDatabaseUserService(userStore *models.UserStore) *DatabaseUserService {
	return &DatabaseUserService{
		userStore: userStore,
	}
}

// GetAllUsers retrieves all users from the database
func (s *DatabaseUserService) GetAllUsers() ([]models.MSUser, error) {
	return s.userStore.GetAllUsers()
}

// GetUserByID retrieves a user by their ID from the database
func (s *DatabaseUserService) GetUserByID(userID string) (*models.MSUser, error) {
	return s.userStore.GetUserByID(userID)
}

// SearchUsers searches for users in the database
func (s *DatabaseUserService) SearchUsers(query string) ([]models.MSUser, error) {
	return s.userStore.SearchUsers(query)
}

// CreateUserService creates the appropriate UserService based on GRAPH_MODE
func CreateUserService(cfg *config.Config, accessToken string) (UserService, error) {
	// Get GRAPH_MODE from environment
	graphMode := strings.ToLower(os.Getenv("GRAPH_MODE"))

	if graphMode == "real" {
		log.Println("Using GraphUserService (real mode)")
		return NewGraphUserService(accessToken)
	}

	// Mock mode - use database
	log.Println("Using DatabaseUserService (mock mode)")
	if cfg.DB == nil {
		return nil, fmt.Errorf("database connection not available for mock mode")
	}

	userStore := models.NewUserStore(cfg.DB)
	return NewDatabaseUserService(userStore), nil
}
