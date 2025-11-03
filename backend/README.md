# Gruve Meeting Scheduler Assistant - Go Backend

## Features

- Microsoft SSO (Azure AD, OAuth2, OIDC)
- Secure token/session management
- Microsoft Graph API integration
- **Meeting Invite Sender** - Modular system for sending calendar invitations
- Gin-based REST API
- PostgreSQL database with mock mode support

## Setup

1. Clone repo and enter `/backend`
2. Create `.env` file with required configuration (see [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md))
3. Install dependencies: ```go mod tidy```
4. Start PostgreSQL: ```docker-compose up -d postgres``` (for mock mode)
5. Verify configuration: ```go run verify_config.go```
6. Run server: ```go run main.go```
7. Test login:
   - Visit `http://localhost:8080/auth/login`
   - Complete Microsoft sign-in
   - Inspect `/auth/callback` response

## API Routes

### Authentication
| Route             | Method | Description                      |
|-------------------|--------|----------------------------------|
| `/`               | GET    | Health check                     |
| `/auth/login`     | GET    | Redirect to Microsoft login      |
| `/auth/callback`  | GET/POST | Handle OAuth2 callback         |
| `/auth/logout`    | POST   | Logout user                      |

### Graph API (Protected)
| Route                       | Method | Description                      |
|-----------------------------|--------|----------------------------------|
| `/graph/me`                 | GET    | Get user profile                 |
| `/graph/calendar`           | GET    | Get calendar events              |
| `/graph/users/search`       | GET    | Search users                     |
| `/graph/users`              | GET    | Get all users                    |
| `/graph/user/current`       | GET    | Get current user                 |

### Calendar & Meetings (Protected)
| Route                       | Method | Description                      |
|-----------------------------|--------|----------------------------------|
| `/api/calendar/events`      | GET    | Get calendar events              |
| `/api/calendar/availability`| POST   | Check availability               |
| `/api/calendar/meetings`    | POST   | Create meeting (sends invites)   |
| `/api/calendar/findTimes`   | POST   | Find available meeting times     |

## Security

- Tokens stored server-side or in secure cookies
- CSRF protection via `state` param
- OIDC token verification

## Meeting Invite Sender

The backend includes a modular meeting invite sender system that supports multiple delivery methods:

### Quick Start

1. **SendGrid Mode** (Recommended for initial setup):
   ```bash
   # Add to .env
   INVITE_SENDER_MODE=sendgrid
   SENDGRID_API_KEY=SG.your_api_key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

2. **Microsoft Graph Mode** (Native Outlook integration):
   ```bash
   # Add to .env
   INVITE_SENDER_MODE=graph
   # Access token from user session automatically
   ```

### Features

- ✅ RFC-5545 compliant `.ics` calendar invitations
- ✅ SMTP delivery via SendGrid
- ✅ Native Outlook calendar integration via Microsoft Graph
- ✅ Asynchronous sending (non-blocking)
- ✅ Automatic RSVP support
- ✅ Works with all major email clients

### Documentation

- [Invite Sender Module README](services/INVITE_SENDER_README.md) - Complete module documentation
- [Environment Variables Guide](ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Implementation Summary](services/IMPLEMENTATION_SUMMARY.md) - Technical details

### Testing

```bash
# Verify configuration
go run verify_config.go

# Run tests
go test ./services -v

# Test specific components
go test ./services -v -run TestSendGrid
go test ./services -v -run TestGraph
```

## Project Structure

```
backend/
├── config/           # Configuration and database setup
├── handlers/         # HTTP route handlers
├── middleware/       # Authentication middleware
├── migrations/       # Database migrations
├── models/           # Data models
├── services/         # External services (Graph API, Invite Sender)
│   ├── graph.go
│   ├── local.go
│   ├── interface.go
│   ├── invite_interface.go     # Invite sender interface
│   ├── invite_sendgrid.go      # SendGrid implementation
│   ├── invite_graph.go         # Graph API implementation
│   └── invite_factory.go       # Factory pattern
└── utils/            # Utility functions
```

## Deployment

- Update `REDIRECT_URI` for production domain
- Add production URI in Azure App Registration
- Use HTTPS in production
- Configure SendGrid sender authentication
- Use managed secrets (AWS Secrets Manager, Azure Key Vault)
- Enable database SSL (`DB_SSLMODE=require`)
- Set `GIN_MODE=release`