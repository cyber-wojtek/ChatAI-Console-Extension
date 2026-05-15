// content_claude.js — runs at document_idle on claude.ai
// Polls ChatAI Console for a pending Claude auth session, then uses
// google.accounts.oauth2.initCodeClient (popup) to get an auth code
// and relays it back. Does nothing if the extension is disabled.

(function () {
  'use strict';

  const CONSOLE       = 'http://localhost:5000';
  const POLL_INTERVAL = 1500;
  const CLAUDE_CID    = '1062961139910-l2m55cb9h51u5cuc9c56eb3fevouidh9.apps.googleusercontent.com';
  const api           = typeof browser !== 'undefined' ? browser : chrome;

  api.storage.local.get('enabled').then(({ enabled }) => {
    if (enabled) startPolling();
  }).catch(() => {});

  let polling          = false;
  let tokenActive      = false;
  let consecutiveFails = 0;

  function startPolling() {
    if (polling) return;
    polling = true;
    poll();
  }

  async function poll() {
    if (tokenActive) {
      setTimeout(poll, POLL_INTERVAL * 2);
      return;
    }

    let pending = null;
    try {
      const r = await fetch(`${CONSOLE}/api/oauth/claude/ext-pending`, {
        signal: AbortSignal.timeout(2000),
      });
      if (r.ok) {
        pending = await r.json();
        consecutiveFails = 0;
      }
    } catch {
      consecutiveFails++;
    }

    if (pending?.state) {
      await handlePending(pending.state);
    } else {
      const delay = consecutiveFails > 0
        ? Math.min(POLL_INTERVAL * Math.pow(2, consecutiveFails - 1), 30_000)
        : POLL_INTERVAL;
      setTimeout(poll, delay);
    }
  }

  async function handlePending(state) {
    tokenActive = true;

    // Wait for GIS oauth2 client to be available (injected via manifest)
    const oauth2 = await waitForOAuth2();
    if (!oauth2) {
      await reportError(state, 'gis_unavailable');
      tokenActive = false;
      setTimeout(poll, POLL_INTERVAL);
      return;
    }

    let settled = false;

    const client = oauth2.initCodeClient({
      client_id: CLAUDE_CID,
      scope: 'openid profile email',
      ux_mode: 'popup',
      callback: async (resp) => {
        if (settled) return;
        settled = true;
        tokenActive = false;

        if (resp.error) {
          await reportError(state, resp.error);
        } else if (resp.code) {
          await reportCode(state, resp.code);
        } else {
          await reportError(state, 'no_code');
        }
        setTimeout(poll, POLL_INTERVAL);
      },
      error_callback: async (err) => {
        if (settled) return;
        settled = true;
        tokenActive = false;
        await reportError(state, err?.type || 'code_error');
        setTimeout(poll, POLL_INTERVAL);
      },
    });

    try {
      client.requestCode({ state });
    } catch {
      tokenActive = false;
      await reportError(state, 'popup_blocked');
      setTimeout(poll, POLL_INTERVAL);
    }
  }

  function waitForOAuth2(maxWait = 10000) {
    return new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
          resolve(google.accounts.oauth2);
          return;
        }
        if (Date.now() - start > maxWait) { resolve(null); return; }
        setTimeout(check, 200);
      };
      check();
    });
  }

  async function reportCode(state, code) {
    try {
      await fetch(`${CONSOLE}/api/oauth/claude/ext-callback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ state, code }),
      });
    } catch {}
  }

  async function reportError(state, error) {
    try {
      await fetch(`${CONSOLE}/api/oauth/claude/ext-callback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ state, error }),
      });
    } catch {}
  }
})();
