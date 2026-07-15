const TABLEFLOW_EXTENSION_ID = "kfillajkflijbagdncmlagmlfgfddgjj";
const statusEl = document.getElementById("status");

activate().catch(() => {
  statusEl.textContent = "We could not activate Pro automatically. Please contact support with your Stripe payment email.";
});

async function activate() {
  const sessionId = new URLSearchParams(location.search).get("session_id");
  if (!sessionId) {
    statusEl.textContent = "Missing Stripe checkout session. Please contact support with your payment email.";
    return;
  }

  const response = await fetch(`/api/tableflow/license/claim?session_id=${encodeURIComponent(sessionId)}`);
  const result = await response.json();
  if (!response.ok || !result.token) {
    statusEl.textContent = result.error || "Payment verified, but license activation failed.";
    return;
  }

  if (!globalThis.chrome?.runtime?.sendMessage) {
    statusEl.textContent = "TableFlow extension was not detected. Open Chrome with TableFlow installed, then revisit this page.";
    return;
  }

  chrome.runtime.sendMessage(
    TABLEFLOW_EXTENSION_ID,
    { type: "TABLEFLOW_LICENSE_TOKEN", token: result.token },
    (reply) => {
      if (chrome.runtime.lastError || !reply?.ok) {
        statusEl.textContent = "Payment verified, but TableFlow did not accept the license. Please open the extension and try again.";
        return;
      }
      statusEl.textContent = "TableFlow Pro is active. You can close this tab and continue exporting without monthly limits.";
    }
  );
}
