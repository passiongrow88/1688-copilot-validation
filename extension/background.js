importScripts("license.js");

chrome.runtime.onInstalled.addListener(() => {
  TableFlowLicense.getInstallId().catch(() => {});
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "TABLEFLOW_LICENSE_TOKEN") return false;

  TableFlowLicense.saveLicenseToken(message.token)
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));

  return true;
});
