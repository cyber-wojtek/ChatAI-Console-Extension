// content_claude.js — runs at document_start on claude.ai
// Only intercepts Google OAuth callbacks that were initiated by ChatAI Console
// (verified by checking the state token with the local server before acting).
// Does nothing if the extension is disabled via the popup toggle.

(function () {
  'use strict';

  const url   = new URL(location.href);
  const code  = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // Ignore pages that don't look like an OAuth callback at all
  if ((!code && !error) || !state) return;

  const CONSOLE = 'http://localhost:5000';
  const api     = typeof browser !== 'undefined' ? browser : chrome;

  // Check enabled flag before doing anything
  api.storage.local.get('enabled').then(({ enabled }) => {
    if (!enabled) return;

    // Ask Console whether this state belongs to it before doing anything.
    fetch(`${CONSOLE}/api/oauth/claude/owns-state?state=${encodeURIComponent(state)}`, {
      signal: AbortSignal.timeout(150),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.owned) intercept(); })
      .catch(() => { /* Console not running — leave the page alone */ });
  }).catch(() => { /* storage unavailable — do nothing */ });

  function intercept() {
    window.stop();
    render(code ? 'Delivering auth code to Console…' : 'Auth error — relaying to Console…');

    fetch(`${CONSOLE}/api/oauth/claude/ext-callback`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ code, state, error }),
    })
      .then(r => r.json())
      .then(d => setStatus(d.ok, d.ok
        ? 'Auth code delivered — you can close this tab.'
        : 'Console rejected the code: ' + (d.error || 'unknown')))
      .catch(e => setStatus(false,
        'Could not reach ChatAI Console (is it running on :5000?)\n' + e.message));
  }

  function render(initialMsg) {
    document.documentElement.innerHTML = '<!DOCTYPE html>'
      + '<html lang="en"><head><meta charset="utf-8">'
      + '<title>ChatAI Console — OAuth</title>'
      + '<style>'
      + '*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}'
      + 'body{min-height:100vh;display:flex;align-items:center;justify-content:center;'
      + 'background:#0f1117;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#e2e8f0}'
      + '.card{background:#1a1d27;border:1px solid #2d3148;border-radius:12px;padding:40px 48px;'
      + 'max-width:440px;width:90%;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.4)}'
      + '.logo{font-size:1.4rem;font-weight:700;color:#a78bfa;margin-bottom:6px}'
      + '.sub{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:28px}'
      + '.spinner{width:34px;height:34px;border:3px solid #2d3148;border-top-color:#a78bfa;'
      + 'border-radius:50%;animation:spin .7s linear infinite;margin:0 auto 18px}'
      + '@keyframes spin{to{transform:rotate(360deg)}}'
      + '#msg{font-size:.9rem;line-height:1.6;color:#94a3b8;white-space:pre-line}'
      + '#msg.ok{color:#4ade80}#msg.err{color:#f87171}'
      + '.hint{margin-top:18px;font-size:.72rem;color:#334155}'
      + '</style></head><body>'
      + '<div class="card">'
      + '<div class="logo">✦ ChatAI Console</div>'
      + '<div class="sub">OAuth Bridge · Claude</div>'
      + '<div class="spinner" id="spin"></div>'
      + '<div id="msg">' + escHtml(initialMsg) + '</div>'
      + '<div class="hint">claude.ai will not process this callback</div>'
      + '</div></body></html>';
  }

  function setStatus(ok, msg) {
    const el   = document.getElementById('msg');
    const spin = document.getElementById('spin');
    if (spin) spin.style.display = 'none';
    if (el) { el.textContent = msg; el.className = ok ? 'ok' : 'err'; }
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
