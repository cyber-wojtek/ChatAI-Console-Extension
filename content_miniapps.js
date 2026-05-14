// content_miniapps.js — runs at document_idle on miniapps.ai
// Does nothing unless ChatAI Console has an active miniapps OAuth session waiting.
// Polls Console for a pending state, then uses GIS (already loaded by miniapps.ai)
// to get a Google ID token credential, and relays it back to Console.

(function () {
  'use strict';

  const CONSOLE        = 'http://localhost:5000';
  const POLL_INTERVAL  = 1500;   // ms between checks for a pending session
  const GIS_TIMEOUT    = 90_000; // ms to wait for user to complete Google sign-in
  const MINIAPPS_CID   = '1011544206507-a5rcko9t7su3cqd1lthf7useqa9aeoue.apps.googleusercontent.com';

  let polling        = false;
  let gisActive      = false;
  let consecutiveFails = 0;

  // Start polling for a pending OAuth session once the page is settled
  startPolling();

  function startPolling() {
    if (polling) return;
    polling = true;
    poll();
  }

  async function poll() {
    if (gisActive) {
      setTimeout(poll, POLL_INTERVAL * 2);
      return;
    }

    let pending = null;
    try {
      const r = await fetch(`${CONSOLE}/api/oauth/miniapps/ext-pending`, {
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
      // Back off exponentially when Console is unreachable (max ~30s)
      const delay = consecutiveFails > 0
        ? Math.min(POLL_INTERVAL * Math.pow(2, consecutiveFails - 1), 30_000)
        : POLL_INTERVAL;
      setTimeout(poll, delay);
    }
  }

  async function handlePending(state) {
    gisActive = true;

    // Wait for GIS to be available (miniapps.ai loads it themselves)
    const gis = await waitForGIS();
    if (!gis) {
      await reportError(state, 'gis_unavailable');
      gisActive = false;
      setTimeout(poll, POLL_INTERVAL);
      return;
    }

    let settled = false;
    const deadline = setTimeout(async () => {
      if (!settled) {
        settled = true;
        await reportError(state, 'timeout');
        gisActive = false;
        setTimeout(poll, POLL_INTERVAL);
      }
    }, GIS_TIMEOUT);

    gis.cancel();  // reset any prior GIS state on this page
    gis.initialize({
      client_id:   MINIAPPS_CID,
      callback:    async (resp) => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        gisActive = false;

        if (resp.credential) {
          await reportCredential(state, resp.credential);
        } else {
          await reportError(state, 'no_credential');
        }
        setTimeout(poll, POLL_INTERVAL);
      },
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    // Show the One Tap / sign-in prompt
    gis.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        const reason = notification.isSkippedMoment()
          ? notification.getSkippedReason()
          : notification.getNotDisplayedReason();
        if (!settled) {
          settled = true;
          clearTimeout(deadline);
          gisActive = false;
          reportError(state, 'prompt_not_displayed:' + reason);
          setTimeout(poll, POLL_INTERVAL);
        }
      }
    });
  }

  function waitForGIS(maxWait = 8000) {
    return new Promise(resolve => {
      const start = Date.now();
      const check = () => {
        if (typeof google !== 'undefined' && google?.accounts?.id) {
          resolve(google.accounts.id);
        } else if (Date.now() - start > maxWait) {
          resolve(null);
        } else {
          setTimeout(check, 200);
        }
      };
      check();
    });
  }

  async function reportCredential(state, credential) {
    try {
      await fetch(`${CONSOLE}/api/oauth/miniapps/ext-callback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ state, credential }),
      });
    } catch { /* Console gone — state will expire */ }
  }

  async function reportError(state, error) {
    try {
      await fetch(`${CONSOLE}/api/oauth/miniapps/ext-callback`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ state, error }),
      });
    } catch { /* ignore */ }
  }
})();
