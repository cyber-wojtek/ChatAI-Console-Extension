const CONSOLE = 'http://localhost:5000';

const dot          = document.getElementById('dot');
const statusTxt    = document.getElementById('status-txt');
const miniappsEl   = document.getElementById('miniapps-status');
const openBtn      = document.getElementById('open-btn');

// Check Console health + pending miniapps session
Promise.all([
  fetch(`${CONSOLE}/api/accounts`,               { signal: AbortSignal.timeout(2500) }).catch(() => null),
  fetch(`${CONSOLE}/api/oauth/miniapps/ext-pending`, { signal: AbortSignal.timeout(2500) }).catch(() => null),
]).then(async ([accR, pendR]) => {
  if (accR?.ok) {
    dot.className     = 'dot online';
    statusTxt.textContent = 'online';
  } else {
    dot.className     = 'dot offline';
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

openBtn.addEventListener('click', () => {
  // Use chrome or browser (Firefox) API
  const api = typeof chrome !== 'undefined' ? chrome : browser;
  api.tabs.create({ url: CONSOLE });
});
