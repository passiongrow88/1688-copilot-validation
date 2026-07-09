let datasets = [];
let isPro = false;

const PRICING_URL = "https://passiongrow88.github.io/1688-copilot-validation/tableflow-pricing/";
const LICENSE_API_URL = ""; // Set to the production HTTPS endpoint before release.

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const resultsEl = $("results");
const tableSelect = $("tableSelect");
const preview = $("preview");

initializePlan();

$("upgrade").addEventListener("click", () => chrome.tabs.create({ url: PRICING_URL }));
$("activate").addEventListener("click", activateLicense);
$("clearLicense").addEventListener("click", async () => {
  await chrome.storage.local.remove(["tableflowLicense", "tableflowPlan"]);
  setPlan(false);
  $("licenseKey").value = "";
  $("licenseStatus").textContent = "Free plan active.";
});

$("scan").addEventListener("click", async () => {
  statusEl.textContent = "Scanning visible tables…";
  resultsEl.hidden = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error("No active webpage is available.");

    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTables
    });

    datasets = result || [];
    if (!datasets.length) {
      statusEl.textContent = "No visible HTML tables found on this page.";
      return;
    }

    tableSelect.replaceChildren();
    datasets.forEach((dataset, index) => {
      const option = document.createElement("option");
      option.value = String(index);
      option.textContent = `Table ${index + 1} · ${dataset.rows.length} rows × ${dataset.headers.length} columns`;
      tableSelect.appendChild(option);
    });

    statusEl.textContent = `Found ${datasets.length} table${datasets.length > 1 ? "s" : ""}.`;
    resultsEl.hidden = false;
    renderPreview();
  } catch (error) {
    statusEl.textContent = `Could not scan this page: ${error.message}`;
  }
});

tableSelect.addEventListener("change", renderPreview);

$("mergeTables").addEventListener("change", (event) => {
  if (event.target.checked && !isPro) {
    event.target.checked = false;
    statusEl.textContent = "Multi-table merge is a Founder Pro feature.";
    chrome.tabs.create({ url: PRICING_URL });
  }
});

$("copy").addEventListener("click", async () => {
  try {
    const content = serialize(exportDataset(), $("format").value);
    await navigator.clipboard.writeText(content);
    statusEl.textContent = "Copied to clipboard.";
  } catch (error) {
    statusEl.textContent = `Could not copy: ${error.message}`;
  }
});

$("download").addEventListener("click", async () => {
  try {
    const format = $("format").value;
    const content = serialize(exportDataset(), format);
    const mimeTypes = { csv: "text/csv", json: "application/json", markdown: "text/markdown" };
    const extension = format === "markdown" ? "md" : format;
    const url = URL.createObjectURL(new Blob([content], { type: `${mimeTypes[format]};charset=utf-8` }));

    await chrome.downloads.download({
      url,
      filename: `tableflow-export-${Date.now()}.${extension}`,
      saveAs: true
    });

    setTimeout(() => URL.revokeObjectURL(url), 30000);
    statusEl.textContent = "Export ready.";
  } catch (error) {
    statusEl.textContent = `Could not download: ${error.message}`;
  }
});

async function initializePlan() {
  const saved = await chrome.storage.local.get(["tableflowLicense", "tableflowPlan"]);
  if (saved.tableflowLicense) $("licenseKey").value = saved.tableflowLicense;
  setPlan(saved.tableflowPlan === "pro");
}

async function activateLicense() {
  const key = $("licenseKey").value.trim();
  if (!key) {
    $("licenseStatus").textContent = "Enter the license key sent after purchase.";
    return;
  }
  if (!LICENSE_API_URL) {
    $("licenseStatus").textContent = "License verification is not connected to production yet.";
    return;
  }

  $("licenseStatus").textContent = "Verifying…";
  try {
    const response = await fetch(`${LICENSE_API_URL}/license/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: key, extensionVersion: chrome.runtime.getManifest().version })
    });
    if (!response.ok) throw new Error("Verification service rejected the request.");
    const result = await response.json();
    if (!result.active) throw new Error(result.message || "This license is not active.");

    await chrome.storage.local.set({ tableflowLicense: key, tableflowPlan: "pro" });
    setPlan(true);
    $("licenseStatus").textContent = "Founder Pro activated.";
  } catch (error) {
    setPlan(false);
    $("licenseStatus").textContent = `Could not activate: ${error.message}`;
  }
}

function setPlan(pro) {
  isPro = pro;
  $("planBadge").textContent = pro ? "Founder Pro" : "Free";
  $("planBadge").classList.toggle("pro", pro);
  $("upgrade").hidden = pro;
  if (!pro) $("mergeTables").checked = false;
}

function currentDataset() {
  const data = datasets[Number(tableSelect.value || 0)];
  if (!data) throw new Error("Scan a page before exporting.");
  return data;
}

function exportDataset() {
  if (!$("mergeTables").checked) return currentDataset();
  if (!isPro) throw new Error("Founder Pro is required to merge tables.");
  return mergeCompatibleTables(datasets);
}

function mergeCompatibleTables(allDatasets) {
  const first = currentDataset();
  const compatible = allDatasets.filter((item) => JSON.stringify(item.headers) === JSON.stringify(first.headers));
  if (compatible.length < 2) throw new Error("No other table has the same columns.");
  return { headers: first.headers, rows: compatible.flatMap((item) => item.rows) };
}

function renderPreview() {
  const data = datasets[Number(tableSelect.value || 0)];
  if (!data) return;
  const rows = data.rows.slice(0, 5);
  const head = `<tr>${data.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  const body = rows.map((row) => `<tr>${data.headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`).join("");
  preview.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function serialize(data, format) {
  if (format === "json") {
    return JSON.stringify(data.rows.map((row) => Object.fromEntries(data.headers.map((header, index) => [header, row[index] || ""]))), null, 2);
  }
  if (format === "markdown") {
    const line = (row) => `| ${row.map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`;
    return [line(data.headers), line(data.headers.map(() => "---")), ...data.rows.map(line)].join("\n");
  }
  const csvCell = (value) => {
    const valueText = String(value ?? "");
    return /[",\n]/.test(valueText) ? `"${valueText.replace(/"/g, '""')}"` : valueText;
  };
  return [data.headers, ...data.rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]);
}

function extractTables() {
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const makeHeadersUnique = (headers) => {
    const counts = new Map();
    return headers.map((header, index) => {
      const base = header || `Column ${index + 1}`;
      const count = (counts.get(base) || 0) + 1;
      counts.set(base, count);
      return count === 1 ? base : `${base} (${count})`;
    });
  };

  return [...document.querySelectorAll("table")]
    .filter(isVisible)
    .map((table, tableIndex) => {
      const allRows = [...table.querySelectorAll("tr")].filter((row) => row.closest("table") === table);
      if (!allRows.length) return null;
      let headers = [...allRows[0].querySelectorAll(":scope > th, :scope > td")].map((cell) => clean(cell.innerText));
      const startsWithHeader = allRows[0].querySelectorAll(":scope > th").length > 0;
      const dataRows = startsWithHeader ? allRows.slice(1) : allRows;
      const widths = dataRows.map((row) => row.querySelectorAll(":scope > th, :scope > td").length);
      const width = Math.max(headers.length, ...widths, 0);
      if (!startsWithHeader) headers = Array.from({ length: width }, (_, index) => `Column ${index + 1}`);
      headers = makeHeadersUnique(headers);
      const rows = dataRows
        .map((row) => [...row.querySelectorAll(":scope > th, :scope > td")].map((cell) => clean(cell.innerText)))
        .filter((row) => row.some(Boolean))
        .map((row) => [...row, ...Array(Math.max(0, headers.length - row.length)).fill("")].slice(0, headers.length));
      if (!rows.length || headers.length < 2) return null;
      return { id: tableIndex, headers, rows };
    })
    .filter(Boolean);
}
