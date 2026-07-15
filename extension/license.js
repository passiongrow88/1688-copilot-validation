var TableFlowLicense = (() => {
  const EXTENSION_ID = "kfillajkflijbagdncmlagmlfgfddgjj";
  const FREE_MONTHLY_EXPORT_LIMIT = 10;
  const REVIEW_PROMPT_THRESHOLD = 5;
  const PRO_PAYMENT_BASE_URL = "https://buy.stripe.com/7sYdR80Qi2BF2qveqJdfG06";
  const LICENSE_PUBLIC_KEY = {
    kty: "RSA",
    n: "y-RnF79_9EaDDBs47VIHgNoxvQR04J4x3EcYvTYO5gm3NByToMe-Ycm1B-WBIagjMuMaXyciBP2iwem0wdsXi_rBgcB2dMyAwDQg62wulzUS2ARdGYyYN440ymZNAt_0ldF09anq78owfi0JlRbYZFPEsPbHnbLB7NZeA0_WQChd65dO6ofzH1d4dZyKlUs3n_8Js_nGZSx5-cVk80gbgh2Jmi5v8V4zWWcbATYo7HefmPPrnc51pVCSTMlqTXyH4ehOpqX86b7_KLIEHE5CosSQVEWEZrsW-o-b0JGj5Dc3OlUh6fzSpE-NdFZnupNxkhPncJ6CeLdKDMp6pjOOVQ",
    e: "AQAB"
  };

  const storageDefaults = {
    installId: "",
    usageMonth: "",
    monthlyExportCount: 0,
    proLicenseToken: "",
    proLicensePayload: null,
    userDismissedRatingPrompt: false
  };

  function currentMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }

  async function getInstallId() {
    const state = await chrome.storage.local.get({ installId: "" });
    if (state.installId) return state.installId;

    const installId = crypto.randomUUID();
    await chrome.storage.local.set({ installId });
    return installId;
  }

  async function getUsageState() {
    const state = await chrome.storage.local.get(storageDefaults);
    const month = currentMonth();
    if (state.usageMonth !== month) {
      const nextState = { usageMonth: month, monthlyExportCount: 0 };
      await chrome.storage.local.set(nextState);
      return { ...state, ...nextState };
    }
    return state;
  }

  async function readEntitlement() {
    const installId = await getInstallId();
    const state = await getUsageState();
    const licensePayload = state.proLicenseToken ? await verifyLicenseToken(state.proLicenseToken, installId) : null;
    const isPro = Boolean(licensePayload);
    const used = Number(state.monthlyExportCount || 0);
    return {
      installId,
      isPro,
      licensePayload,
      used,
      limit: FREE_MONTHLY_EXPORT_LIMIT,
      remaining: isPro ? Infinity : Math.max(0, FREE_MONTHLY_EXPORT_LIMIT - used),
      reviewPromptThreshold: REVIEW_PROMPT_THRESHOLD,
      userDismissedRatingPrompt: Boolean(state.userDismissedRatingPrompt),
      paymentUrl: buildPaymentUrl(installId)
    };
  }

  async function recordFreeExport() {
    const entitlement = await readEntitlement();
    if (entitlement.isPro) return entitlement;

    const nextCount = Math.min(FREE_MONTHLY_EXPORT_LIMIT, entitlement.used + 1);
    await chrome.storage.local.set({
      usageMonth: currentMonth(),
      monthlyExportCount: nextCount
    });
    return readEntitlement();
  }

  function buildPaymentUrl(installId) {
    const url = new URL(PRO_PAYMENT_BASE_URL);
    url.searchParams.set("client_reference_id", installId);
    return url.toString();
  }

  async function saveLicenseToken(token) {
    const installId = await getInstallId();
    const payload = await verifyLicenseToken(token, installId);
    if (!payload) throw new Error("License verification failed.");

    await chrome.storage.local.set({
      proLicenseToken: token,
      proLicensePayload: payload,
      proUnlockedAt: new Date().toISOString()
    });
    return payload;
  }

  async function verifyLicenseToken(token, installId) {
    try {
      const parts = String(token || "").split(".");
      if (parts.length !== 3) return null;

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      const header = JSON.parse(decodeBase64UrlToText(encodedHeader));
      const payload = JSON.parse(decodeBase64UrlToText(encodedPayload));

      if (header.alg !== "RS256") return null;
      if (payload.aud !== "tableflow-extension") return null;
      if (payload.plan !== "pro_lifetime") return null;
      if (payload.installId !== installId) return null;
      if (payload.exp && payload.exp * 1000 < Date.now()) return null;

      const key = await crypto.subtle.importKey(
        "jwk",
        LICENSE_PUBLIC_KEY,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );
      const signature = decodeBase64UrlToBytes(encodedSignature);
      const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
      const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
      return valid ? payload : null;
    } catch (_) {
      return null;
    }
  }

  function decodeBase64UrlToText(value) {
    return new TextDecoder().decode(decodeBase64UrlToBytes(value));
  }

  function decodeBase64UrlToBytes(value) {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const raw = atob(base64);
    return Uint8Array.from(raw, (character) => character.charCodeAt(0));
  }

  return {
    EXTENSION_ID,
    FREE_MONTHLY_EXPORT_LIMIT,
    REVIEW_PROMPT_THRESHOLD,
    buildPaymentUrl,
    getInstallId,
    readEntitlement,
    recordFreeExport,
    saveLicenseToken,
    verifyLicenseToken
  };
})();

globalThis.TableFlowLicense = TableFlowLicense;
