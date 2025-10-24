# AI Barista PWA

## Overview
AI Barista is a Progressive Web App that helps Indonesian coffee lovers discover cafes, learn about coffee, and get AI-powered recommendations. The app uses Google's Gemini AI to provide personalized coffee shop recommendations and answer coffee-related questions.

## Recent Changes (October 24, 2025)
- **Security Enhancement**: Moved Gemini API key from frontend to backend to prevent exposure
- **Backend Architecture**: Added Express.js backend server to proxy Gemini API calls
- **Port Configuration**: Frontend now runs on port 5000 (required for Replit environment)
- **Authentication Fix**: Fixed circular dependency in AuthContext with proper initial load tracking
- **Build Configuration**: Removed import maps from index.html to work with Vite bundler
- **Production Readiness**: Backend now listens on 0.0.0.0 in production for proper deployment
- **Deployment**: Configured VM deployment to run both backend and frontend processes
- **Tailwind CSS Production Setup**: Replaced CDN with properly bundled Tailwind CSS v4 for production builds

## Project Architecture

### Frontend (React + Vite + TypeScript)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.2
- **Routing**: React Router DOM v7 (HashRouter for PWA compatibility)
- **Styling**: Tailwind CSS v4 with PostCSS (@tailwindcss/postcss)
- **State Management**: React Context API for authentication, chat history, posts, and wishlists

### Backend (Express.js)
- **Framework**: Express 5.1
- **API**: Proxies requests to Google Gemini AI
- **Endpoints**:
  - `POST /api/chat` - Streaming AI chat responses
  - `POST /api/analysis` - Coffee shop analysis
  - `POST /api/generate-title` - Generate conversation titles

### Key Features
1. **Authentication System**: Mock authentication with local storage (users can sign up/login)
2. **AI Chat**: Chat with AI barista for coffee recommendations and questions
3. **Coffee Shop Recommendations**: AI-powered recommendations with Google Search grounding
4. **Social Feed**: Share coffee experiences and discoveries
5. **Wishlist**: Save favorite coffee shops
6. **Profile Management**: View and edit user profiles

## Project Structure
```
├── components/          # React components (BottomNav, ChatMessage, CoffeeCard, etc.)
├── context/            # React contexts (Auth, ChatHistory, Post, Wishlist)
├── hooks/              # Custom hooks (useSyncedLocalStorage)
├── pages/              # Page components (Feed, AskAI, Profile, etc.)
├── server/             # Express backend server
│   └── index.js        # Backend API endpoints
├── services/           # Frontend services (geminiService for API calls)
├── App.tsx             # Main app component with routing
├── index.tsx           # App entry point
├── types.ts            # TypeScript type definitions
└── vite.config.ts      # Vite configuration
```

## Environment Variables
- `GEMINI_API_KEY` - Google Gemini API key (stored in Replit Secrets, used by backend)

## Development
The app runs two workflows:
1. **Backend** - Express server on port 3001 (localhost only)
2. **Frontend** - Vite dev server on port 5000 (0.0.0.0 for Replit proxy)

## Deployment
- **Deployment Type**: VM (always running)
- **Build Command**: `npm run build` - Builds the frontend into the dist folder
- **Run Command**: `npm start` - Runs the Express server in production mode
- **Production Setup**: 
  - Backend listens on port 5000 (or PORT env var) on 0.0.0.0
  - Serves built static files from the dist folder
  - Handles client-side routing by serving index.html for all non-API routes
  - API endpoints are available at /api/*
- **Production URL**: Uses Replit's domain with port 5000

## User Preferences
None configured yet.

## Notes
- The app uses HashRouter instead of BrowserRouter for better PWA support
- Authentication is mock-based using localStorage (no real passwords are checked)
- The frontend proxies `/api/*` requests to the backend on port 3001
- Tailwind CSS v4 is properly configured with PostCSS for production builds
