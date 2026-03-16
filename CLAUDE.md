# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Chat web application using Google Gemini as the LLM backend. Monorepo with npm workspaces: `server/` (Express.js API) and `client/` (React + Vite).

## Commands

```bash
# Install all dependencies (from root)
npm install

# Development — starts both Express and Vite concurrently
npm run dev
# Vite:    http://localhost:5173  (open in browser)
# Express: http://localhost:3001  (API only)

# Production
npm run build                       # Build React client
NODE_ENV=production npm run start   # Serve everything from Express on :3001

# Workspace-specific
npm run dev --workspace=server
npm run dev --workspace=client
npm run build --workspace=client

# Manual API test
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!", "history": []}'
```

## Architecture

### Monorepo structure
```
project-root/
├── package.json          # npm workspaces config + concurrently
├── server/
│   ├── index.js          # Express server + Gemini integration
│   └── .env              # GEMINI_API_KEY, GEMINI_MODEL, PORT, SYSTEM_PROMPT
└── client/
    ├── vite.config.js    # Vite config with /api proxy to :3001
    └── src/
        ├── App.jsx       # Root component: messages state, history ref, sendMessage()
        └── components/
            ├── MessageList.jsx   # Renders bubbles + loading indicator + auto-scroll
            ├── MessageBubble.jsx # Styles by role: user (right), model (left), error (red)
            └── ChatInput.jsx     # Textarea: Enter=send, Shift+Enter=newline
```

### Key design decisions
- **No CORS**: In dev, Vite proxies `/api/*` to Express. In prod, Express serves the built client as static files.
- **API key security**: `GEMINI_API_KEY` lives only in `server/.env`. Client env only uses `VITE_`-prefixed variables (exposed in bundle).
- **Conversation history**: Stored in `useRef` in `App.jsx`, sent with every request as Gemini-format `{ role, parts: [{ text }] }` array. Lost on page reload.

### API contract

**POST `/api/chat`**
```json
// Request
{ "message": "string", "history": [{ "role": "user|model", "parts": [{ "text": "..." }] }] }

// Response
{ "reply": "string" }
// or on error:
{ "error": "string" }  // status 500
```

## Environment Setup

Copy examples and fill in your key:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
# Get free API key at https://aistudio.google.com/app/apikey
```

**`server/.env` variables:**
- `GEMINI_API_KEY` — required
- `GEMINI_MODEL` — use `gemini-2.5-flash-lite` (15 RPM, 1000 RPD free), `gemini-2.5-flash` (10/500), or `gemini-2.5-pro` (5/100). Gemini 1.x and 2.0 are discontinued.
- `PORT` — defaults to 3001
- `SYSTEM_PROMPT` — system instruction passed to Gemini

## Common Errors

| Error | Fix |
|---|---|
| `400 API key not valid` | Check `GEMINI_API_KEY` in `server/.env` |
| `404 model not found` | Use only `gemini-2.5-*` models (1.x and 2.0 are dead) |
| `429 RESOURCE_EXHAUSTED` | Switch to `gemini-2.5-flash-lite` or wait |
| `Failed to fetch /api/chat` | Ensure both dev servers are running |
| `EADDRINUSE` | Change `PORT` in `server/.env` |
| Client env var is `undefined` | Variable must have `VITE_` prefix |
