# Frontend Configuration

This file contains environment variables for the frontend application. Copy this file to `.env` in the UI directory and modify the values as needed.

## Environment Variables

### Backend API Configuration
- `VITE_BACKEND_URL`: URL of the backend server (default: http://localhost:8080)

### AI Chat Service Configuration
- `VITE_CHAT_API_URL`: URL of the AI chat service for handling user prompts (default: https://radhey.app.n8n.cloud/webhook/handle-user-prompt)

### Avatar Service Configuration
- `VITE_AVATAR_API_URL`: Base URL for avatar generation service (default: https://api.dicebear.com/7.x/avataaars/svg)

## Usage

1. Copy this file to `.env` in the UI directory
2. Modify the values according to your environment
3. Restart the development server

## Example

```
VITE_BACKEND_URL=http://localhost:8080
VITE_CHAT_API_URL=https://my-custom-chat-api.com/webhook/chat
VITE_AVATAR_API_URL=https://my-avatar-service.com/api/avatar
```
