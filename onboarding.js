const api = typeof browser !== 'undefined' ? browser : chrome;

const btnAccept  = document.getElementById('btn-accept');
const btnDecline = document.getElementById('btn-decline');
const doneMsg    = document.getElementById('done-msg');
const doneIcon   = document.getElementById('done-icon');
const doneText   = document.getElementById('done-text');
const choiceRow  = document.querySelector('.choice-row');
const note       = document.querySelector('.note');

btnAccept.addEventListener('click', () => {
  api.storage.local.set({ enabled: true, consentGiven: true });
  showDone(true);
});

btnDecline.addEventListener('click', () => {
  api.storage.local.set({ enabled: false, consentGiven: true });
  showDone(false);
});

function showDone(accepted) {
  choiceRow.style.display = 'none';
  note.style.display = 'none';
  doneMsg.style.display = 'block';
  if (accepted) {
    doneIcon.textContent = '✓';
    doneText.textContent = 'Bridge enabled — you can now sign in via ChatAI Console.';
    doneText.style.color = '#4ade80';
  } else {
    doneIcon.textContent = '—';
    doneText.textContent = 'Bridge disabled — use manual session keys in ChatAI Console.';
    doneText.style.color = '#94a3b8';
  }
}
