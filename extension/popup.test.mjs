import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function createElement(id) {
  return {
    id,
    value: "",
    checked: false,
    hidden: false,
    textContent: "",
    classList: { toggle() {} },
    addEventListener(type, handler) {
      this[`on${type}`] = handler;
    },
    replaceChildren() {},
    appendChild() {}
  };
}

function createHarness({ apiUrl = "", fetchImpl } = {}) {
  const ids = [
    "status", "results", "tableSelect", "preview", "scan", "format", "copy", "download",
    "upgrade", "activate", "clearLicense", "licenseKey", "licenseStatus", "planBadge", "mergeTables"
  ];
  const elements = Object.fromEntries(ids.map((id) => [id, createElement(id)]));
  elements.format.value = "csv";

  const storageData = {};
  const chrome = {
    runtime: {
      getURL: (path) => `chrome-extension://test/${path}`,
      getManifest: () => ({ version: "0.2.0" })
    },
    tabs: {
      created: [],
      create({ url }) { this.created.push(url); },
      async query() { return [{ id: 1 }]; }
    },
    scripting: { async executeScript() { return [{ result: [] }]; } },
    downloads: { async download() { return 1; } },
    storage: {
      local: {
        async get(keys) {
          return Object.fromEntries(keys.filter((key) => key in storageData).map((key) => [key, storageData[key]]));
        },
        async set(values) { Object.assign(storageData, values); },
        async remove(keys) { keys.forEach((key) => delete storageData[key]); }
      }
    }
  };

  const context = {
    console,
    Blob,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL() {} },
    Date,
    fetch: fetchImpl || (async () => { throw new Error("network down"); }),
    TABLEFLOW_LICENSE_API_URL: apiUrl,
    chrome,
    navigator: { clipboard: { async writeText(text) { context.clipboard = text; } } },
    document: {
      getElementById: (id) => elements[id],
      createElement: () => createElement("option")
    }
  };
  context.globalThis = context;

  const source = fs.readFileSync(new URL("./popup.js", import.meta.url), "utf8");
  vm.runInNewContext(`${source}; globalThis.__api = { serialize, mergeCompatibleTables, exportDataset, setPlan, activateLicense, initializePlan, currentDataset };`, context);
  return { context, elements, chrome, storageData, api: context.__api };
}

async function flushAsync() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function setDatasets(context, datasets) {
  vm.runInContext(`datasets = ${JSON.stringify(datasets)}`, vm.createContext(context));
}

const sameA = { headers: ["Order", "Total"], rows: [["A", "10"]] };
const sameB = { headers: ["Order", "Total"], rows: [["B", "20"]] };
const different = { headers: ["Order", "Currency"], rows: [["C", "USD"]] };

{
  const h = createHarness();
  setDatasets(h.context, [sameA, sameB]);
  h.elements.mergeTables.checked = true;
  assert.throws(() => h.api.exportDataset(), /Founder Pro is required/);
}

{
  const h = createHarness();
  setDatasets(h.context, [sameA, sameB]);
  h.elements.mergeTables.checked = true;
  h.api.setPlan(true);
  assert.equal(JSON.stringify(h.api.exportDataset().rows), JSON.stringify([["A", "10"], ["B", "20"]]));
}

{
  const h = createHarness();
  setDatasets(h.context, [sameA, different]);
  h.elements.mergeTables.checked = true;
  h.api.setPlan(true);
  assert.throws(() => h.api.exportDataset(), /No other table has the same columns/);
}

{
  const h = createHarness();
  await flushAsync();
  h.elements.licenseKey.value = "TFP-1234";
  await h.api.activateLicense();
  assert.equal(h.elements.licenseStatus.textContent, "License verification is not connected to production yet.");
}

{
  const h = createHarness({ apiUrl: "https://license.test", fetchImpl: async () => { throw new Error("offline"); } });
  await flushAsync();
  h.elements.licenseKey.value = "TFP-1234";
  await h.api.activateLicense();
  assert.match(h.elements.licenseStatus.textContent, /offline/);
}

{
  const h = createHarness({ apiUrl: "https://license.test", fetchImpl: async () => ({ ok: true, json: async () => ({ active: false, message: "Invalid license" }) }) });
  await flushAsync();
  h.elements.licenseKey.value = "TFP-1234";
  await h.api.activateLicense();
  assert.match(h.elements.licenseStatus.textContent, /Invalid license/);
}

{
  const h = createHarness({ apiUrl: "https://license.test", fetchImpl: async () => ({ ok: true, json: async () => ({ active: false, message: "License revoked" }) }) });
  await flushAsync();
  h.elements.licenseKey.value = "TFP-1234";
  await h.api.activateLicense();
  assert.match(h.elements.licenseStatus.textContent, /License revoked/);
}

{
  const h = createHarness({ apiUrl: "https://license.test", fetchImpl: async () => ({ ok: true, json: async () => ({ active: true, plan: "founder-pro" }) }) });
  await flushAsync();
  h.elements.licenseKey.value = "TFP-ABCDE-9999";
  await h.api.activateLicense();
  assert.equal(h.elements.planBadge.textContent, "Founder Pro");
  assert.equal(h.storageData.tableflowLicenseLast4, "9999");
  assert.equal("tableflowLicense" in h.storageData, false);
}

{
  const h = createHarness();
  h.api.setPlan(true);
  await h.elements.clearLicense.onclick();
  assert.equal(h.elements.planBadge.textContent, "Free");
}

{
  const h = createHarness();
  const csv = h.api.serialize(sameA, "csv");
  const json = h.api.serialize(sameA, "json");
  const markdown = h.api.serialize(sameA, "markdown");
  assert.equal(csv, "Order,Total\nA,10");
  assert.match(json, /"Order": "A"/);
  assert.match(markdown, /\| Order \| Total \|/);
}

console.log("popup tests ok");
