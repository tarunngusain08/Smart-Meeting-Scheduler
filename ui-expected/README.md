# Gruve Scheduler - AI-Powered Meeting Assistant

Smart scheduling made easy with AI. Automatically find optimal meeting times across multiple time zones with Microsoft Teams integration.

## Features

- 🎨 Beautiful landing page with organic animations
- 🔐 Microsoft Teams OAuth authentication
- 🤖 AI-powered chat interface for scheduling
- 🌍 Cross-timezone intelligence
- ⚡ Lightning-fast meeting coordination
- 👥 Team collaboration support

## Prerequisites

- Node.js 18+ and npm
- Backend server running on `http://localhost:8080`
- Microsoft Teams OAuth credentials configured in backend

## Installation

```bash
npm install
```

## Running the Application

### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Application Flow

1. **Landing Page** (`/`)
   - Users see the Gruve Scheduler landing page
   - Click "Sign in with Microsoft Teams" button
   - Redirects to backend auth endpoint (`http://localhost:8080/auth/login`)

2. **Authentication** (`/auth/callback`)
   - Microsoft Teams redirects back with auth code
   - Frontend exchanges code for tokens via backend
   - User data and session stored in localStorage
   - Redirects to chat interface

3. **Chat Interface** (`/chat`)
   - Protected route (requires authentication)
   - AI-powered chat for scheduling meetings
   - Uses `/api/chat.ts` to communicate with AI backend
   - Real-time meeting coordination

## Project Structure

```
src/
├── api/
│   └── chat.ts                 # AI chat API integration
├── components/
│   ├── LandingPage.tsx         # Landing page with Teams auth
│   ├── AuthCallback.tsx        # OAuth callback handler
│   ├── ChatInterface.tsx       # Main chat interface (uses chat API)
│   ├── ChatInput.tsx           # Chat input component
│   ├── ChatMessage.tsx         # Message display component
│   ├── Header.tsx              # App header with logout
│   ├── Sidebar.tsx             # Meeting sidebar
│   └── ui/                     # Reusable UI components
└── App.tsx                     # Main app with routing
```

## Environment Configuration

The application expects the backend to be running on:
- **Backend API:** `http://localhost:8080`
- **AI Chat Endpoint:** `https://radhey.app.n8n.cloud/webhook/handle-user-prompt`

To change these, update:
- Backend URL in `src/components/LandingPage.tsx` (line 17)
- Backend URL in `src/components/AuthCallback.tsx` (line 20)
- AI endpoint in `src/api/chat.ts` (line 16)

## Authentication Flow Details

### Sign In
1. User clicks "Sign in with Microsoft Teams"
2. Redirects to `http://localhost:8080/auth/login?redirect_uri=...`
3. Backend redirects to Microsoft Teams OAuth
4. User authorizes the application
5. Microsoft redirects to backend with auth code
6. Backend redirects to frontend `/auth/callback?code=...&state=...`
7. Frontend exchanges code for tokens via backend POST
8. Backend returns user data and session ID
9. Frontend stores in localStorage and redirects to `/chat`

### Sign Out
1. User clicks logout in header dropdown
2. Clears localStorage (session_id, user)
3. Calls backend `/auth/logout` endpoint
4. Redirects to landing page

## API Integration

### Chat API (`src/api/chat.ts`)

Every time the user sends a message in the chat interface, it calls:

```typescript
const response = await handleUserPrompt(chatInput);
```

This sends the user's message to the AI backend and returns the assistant's response.

**Request:**
```json
{
  "chatInput": "Schedule a meeting with the team"
}
```

**Response:**
```json
{
  "index": 0,
  "message": {
    "role": "assistant",
    "content": "I'll help you schedule a meeting...",
    "refusal": null,
    "annotations": []
  },
  "logprobs": null,
  "finish_reason": "stop"
}
```

## Troubleshooting

### Authentication Issues
- Ensure backend is running on `http://localhost:8080`
- Check Microsoft Teams OAuth credentials in backend
- Verify redirect URIs match in Azure AD app registration

### Chat Not Working
- Check AI endpoint is accessible: `https://radhey.app.n8n.cloud/webhook/handle-user-prompt`
- Verify network requests in browser DevTools
- Check console for error messages

### Build Errors
- Run `npm install` to ensure all dependencies are installed
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Routing
- **Lucide React** - Icons
- **Radix UI** - Accessible components
- **Motion** - Animations

## License

All rights reserved © 2025 Gruve Scheduler