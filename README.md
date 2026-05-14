# ChatAI Console — OAuth Bridge Extension

Browser extension (Manifest V3) that bridges Google OAuth for [ChatAI Console](../ChatAI-Console) — works with both **Claude.ai** and **MiniApps.ai** accounts.

**Disabled by default.** Enable the bridge from the extension popup only when you need to sign in, thus avoiding any background activity during normal browsing.

## Why this exists

Google registers OAuth client IDs against specific origins. Claude's and MiniApps' client IDs are registered for their own domains, not `localhost`. This extension runs on those domains so the OAuth flow happens in the right origin, then relays the token/code to your local Console server.

## How it works

### Claude

1. Console calls `GET /api/oauth/claude/begin` → gets a Google OAuth URL (with PKCE, `redirect_uri=https://claude.ai/oauth/callback`)
2. Console opens that URL in a popup
3. After Google auth, the browser lands on `claude.ai/oauth/callback?code=...`
4. This extension's content script (`content_claude.js`) runs at `document_start`, checks with the local Console (`/api/oauth/claude/owns-state`) whether this state token belongs to it
5. If yes: stops the page, relays the auth code to Console via `POST /api/oauth/claude/ext-callback`, shows a confirmation UI
6. Console's status poll picks up the code and fills the account form

### MiniApps

1. Console calls `GET /api/oauth/miniapps/begin` → registers a pending session, opens `miniapps.ai` in a tab
2. This extension's content script (`content_miniapps.js`) runs on that tab, polling `GET /api/oauth/miniapps/ext-pending` for a waiting session
3. When found: waits for Google Identity Services (already loaded by MiniApps), calls `google.accounts.id.prompt()` — valid because we're on `miniapps.ai`'s origin
4. Relays the credential JWT to Console via `POST /api/oauth/miniapps/ext-callback`
5. Console fills the account form; the tab is closed automatically

**Neither script does anything during normal browsing** — Claude's script only acts when the URL has `?code=`/`?error=` AND the server confirms the state is its own; MiniApps' script only acts when the server has a pending session.

## Installation

### Chrome / Edge / Brave / Chromium

1. Open `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select this directory (`ChatAI-Console-Extension/`)

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from this directory

## Usage

1. Click the extension icon in your browser toolbar
2. Flip the **Bridge enabled** toggle on
3. Go to ChatAI Console and click **Sign in with Google** for Claude or MiniApps
4. Complete the Google sign-in — the extension handles the rest
5. Turn the toggle **off** when done

When disabled, the extension does absolutely nothing on claude.ai or miniapps.ai.

## Requirements

- **ChatAI Console** running at `http://localhost:5000` (`app.py`)
- A browser tab open on `miniapps.ai` when doing MiniApps sign-in (Console opens it automatically)
- Popups allowed for `localhost:5000` (Console handles this)

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `content_claude.js` | Content script for `claude.ai` — intercepts OAuth callbacks |
| `content_miniapps.js` | Content script for `miniapps.ai` — triggers GIS and relays credential |
| `popup.html` / `popup.js` | Extension popup — shows Console status and active sessions |
| `icon*.png` | Extension icons |

## Permissions

| Permission | Why |
|------------|-----|
| `https://claude.ai/*` | Read URL params on OAuth callback page |
| `https://miniapps.ai/*` | Poll Console and trigger GIS on the correct origin |
| `http://localhost:5000/*` | Communicate with ChatAI Console |

No background service worker, no persistent storage, no external requests beyond localhost and the two target domains.

## License

MIT — see [LICENSE](LICENSE)
