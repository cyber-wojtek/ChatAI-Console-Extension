# ChatAI Console — OAuth Bridge Extension

Browser extension (Manifest V3) that bridges Google OAuth for [ChatAI Console](../ChatAI-Console) — works with **Claude.ai**.

**Disabled by default.** Enable the bridge from the extension popup only when you need to sign in, thus avoiding any background activity during normal browsing.

## Why this exists

Google registers OAuth client IDs against specific origins. Claude's client ID is registered for their own domain, not `localhost`. This extension runs on that domain so the OAuth flow happens in the right origin, then relays the token/code to your local Console server.

## How it works

### Claude

1. Console calls `GET /api/oauth/claude/begin` → registers a pending session, opens `claude.ai` in a tab
2. This extension's content script (`content_claude.js`) runs on that tab, polling `GET /api/oauth/claude/ext-pending` for a waiting session
3. When found: triggers `google.accounts.oauth2.initCodeClient` (popup) on `claude.ai` to get an auth code
4. Relays the auth code to Console via `POST /api/oauth/claude/ext-callback`
5. Console's status poll picks up the code and fills the account form

**Neither script does anything during normal browsing** — Claude's script only acts when the URL has `?code=`/`?error=` AND the server confirms the state on its own.

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
3. Go to ChatAI Console and click **Sign in with Google** for Claude
4. Complete the Google sign-in — the extension handles the rest
5. Turn the toggle **off** when done if you wish

When disabled, the extension does absolutely nothing on claude.ai.

## Requirements

- **ChatAI Console** running at `http://localhost:5000` (`app.py`)
- Popups allowed for `localhost:5000` (Console handles this)
- Popups allowed for `claude.ai`

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3) |
| `content_claude.js` | Content script for `claude.ai` — intercepts OAuth callbacks |
| `popup.html` / `popup.js` | Extension popup — shows Console status and active sessions |
| `icon*.png` | Extension icons |

## Permissions

| Permission | Why |
|------------|-----|
| `https://claude.ai/*` | Read URL params on OAuth callback page |
| `http://localhost:5000/*` | Communicate with ChatAI Console |

No background service worker, no persistent storage, no external requests beyond localhost and the two target domains.

## License

MIT — see [LICENSE](LICENSE)
