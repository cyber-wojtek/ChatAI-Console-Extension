// Opens the onboarding page on first install so the user sees the data
// disclosure and can make an explicit consent choice before the bridge activates.
const api = typeof browser !== 'undefined' ? browser : chrome;

api.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    api.tabs.create({ url: api.runtime.getURL('onboarding.html') });
  }
});
