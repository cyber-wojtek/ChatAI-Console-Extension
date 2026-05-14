const CONSOLE = 'http://localhost:5000';
const api     = typeof browser !== 'undefined' ? browser : chrome;

const dot         = document.getElementById('dot');
const statusTxt   = document.getElementById('status-txt');
const miniappsEl  = document.getElementById('miniapps-status');
const openBtn     = document.getElementById('open-btn');
const toggle      = document.getElementById('enabledToggle');
const mainContent = document.getElementById('main-content');

// Load persisted state (default: disabled, no consent yet)
api.storage.local.get(['enabled', 'consentGiven']).then(({ enabled, consentGiven }) => {
  if (!consentGiven) {
    // Haven't seen the onboarding page — open it
    api.tabs.create({ url: api.runtime.getURL('onboarding.html') });
    window.close();
    return;
  }
  toggle.checked = !!enabled;
  applyEnabledState(!!enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  api.storage.local.set({ enabled });
  applyEnabledState(enabled);
});

function applyEnabledState(enabled) {
  mainContent.classList.toggle('disabled-overlay', !enabled);
  if (enabled) checkStatus();
}

function checkStatus() {
  Promise.all([
    fetch(`${CONSOLE}/api/accounts`,                   { signal: AbortSignal.timeout(2500) }).catch(() => null),
    fetch(`${CONSOLE}/api/oauth/miniapps/ext-pending`, { signal: AbortSignal.timeout(2500) }).catch(() => null),
  ]).then(async ([accR, pendR]) => {
    if (accR?.ok) {
      dot.className         = 'dot online';
      statusTxt.textContent = 'online';
    } else {
      dot.className         = 'dot offline';
      statusTxt.textContent = 'offline — start app.py';
    }

    if (pendR?.ok) {
      const pend = await pendR.json().catch(() => null);
      if (pend?.state) {
        miniappsEl.textContent = 'session active — open miniapps.ai';
        miniappsEl.className   = 'bridge-status active';
      }
    }
  });
}

openBtn.addEventListener('click', () => {
  api.tabs.create({ url: CONSOLE });
});
