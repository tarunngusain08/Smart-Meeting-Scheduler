# Gruve Meeting Scheduler Assistant - Go Backend

## Features

- Microsoft SSO (Azure AD, OAuth2, OIDC)
- Secure token/session management
- Microsoft Graph API integration
- Gin-based REST API

## Setup

1. Clone repo and enter `/backend`
2. Copy `.env.example` to `.env` and fill in secrets
3. Install dependencies: ```go mod tidy```
4. Run server: ```go run main.go```
5. Test login:
- Visit `http://localhost:8080/auth/login`
- Complete Microsoft sign-in
- Inspect `/auth/callback` response

## API Routes

| Route             | Method | Description                      |
|-------------------|--------|----------------------------------|
| `/`               | GET    | Health check                     |
| `/auth/login`     | GET    | Redirect to Microsoft login      |
| `/auth/callback`  | GET    | Handle OAuth2 callback           |
| `/auth/logout`    | POST   | Logout user                      |
| `/graph/me`       | GET    | Get user profile (Graph API)     |
| `/graph/calendar` | GET    | Get calendar events (Graph API)  |

## Security

- Tokens stored server-side or in secure cookies
- CSRF protection via `state` param
- OIDC token verification

## Deployment

- Update `REDIRECT_URI` for production
- Add production URI in Azure App Registration
- Use HTTPS in production