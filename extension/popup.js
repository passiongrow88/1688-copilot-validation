let datasets = [];

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const resultsEl = $("results");
const quotaTitle = $("quotaTitle");
const quotaDetail = $("quotaDetail");
const tableSelect = $("tableSelect");
const preview = $("preview");
const formatSelect = $("format");
const copyButton = $("copy");
const downloadButton = $("download");
const ratingPrompt = $("ratingPrompt");
const paywall = $("paywall");
const proUpgradeLink = $("proUpgradeLink");

$("scan").addEventListener("click", async () => {
  statusEl.textContent = "Scanning visible tables...";
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
      option.textContent = `Table ${index + 1} - ${dataset.rows.length} rows x ${dataset.headers.length} columns`;
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
formatSelect.addEventListener("change", () => {
  updateFormatControls();
  initMonetizationState().catch(() => {});
});
$("dismissRating").addEventListener("click", dismissRatingPrompt);

copyButton.addEventListener("click", async () => {
  try {
    const format = formatSelect.value;
    if (format === "xlsx") {
      statusEl.textContent = "Excel files cannot be copied. Use Download instead.";
      return;
    }
    if (!(await ensureExportAllowed())) return;

    const content = serializeText(currentDataset(), format);
    await navigator.clipboard.writeText(content);
    statusEl.textContent = "Copied to clipboard.";
    await recordExportSuccess("copy");
  } catch (error) {
    statusEl.textContent = `Could not copy: ${error.message}`;
  }
});

downloadButton.addEventListener("click", async () => {
  try {
    const format = formatSelect.value;
    if (!(await ensureExportAllowed())) return;

    const { blob, extension } = createExportBlob(currentDataset(), format);
    const url = URL.createObjectURL(blob);

    await chrome.downloads.download({
      url,
      filename: `tableflow-export-${Date.now()}.${extension}`,
      saveAs: false
    });

    setTimeout(() => URL.revokeObjectURL(url), 30000);
    statusEl.textContent = "Export ready.";
    await recordExportSuccess("download");
  } catch (error) {
    statusEl.textContent = `Could not download: ${error.message}`;
  }
});

initMonetizationState();
updateFormatControls();
chrome.storage.onChanged.addListener(() => {
  initMonetizationState().catch(() => {});
});

function currentDataset() {
  const data = datasets[Number(tableSelect.value || 0)];
  if (!data) throw new Error("Scan a page before exporting.");
  return data;
}

function renderPreview() {
  const data = datasets[Number(tableSelect.value || 0)];
  if (!data) return;

  const rows = data.rows.slice(0, 5);
  const head = `<tr>${data.headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;
  const body = rows
    .map((row) => `<tr>${data.headers.map((_, index) => `<td>${escapeHtml(row[index] || "")}</td>`).join("")}</tr>`)
    .join("");

  preview.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}
function updateFormatControls() {
  const isExcel = formatSelect.value === "xlsx";
  copyButton.disabled = isExcel;
  copyButton.title = isExcel ? "Excel files can be downloaded, not copied to the clipboard." : "";
}

function createExportBlob(data, format) {
  if (format === "xlsx") {
    return {
      blob: createExcelBlob(data),
      extension: "xlsx"
    };
  }

  const content = serializeText(data, format);
  const blobTypes = {
    csv: "text/csv;charset=utf-8",
    json: "application/json;charset=utf-8",
    markdown: "text/markdown;charset=utf-8"
  };

  return {
    blob: new Blob([content], { type: blobTypes[format] }),
    extension: format === "markdown" ? "md" : format
  };
}

function serializeText(data, format) {
  const normalized = normalizeDataset(data);

  if (format === "json") {
    return JSON.stringify(
      normalized.rows.map((row) => Object.fromEntries(normalized.headers.map((header, index) => [header, row[index] || ""]))),
      null,
      2
    );
  }

  if (format === "markdown") {
    const line = (row) => `| ${row.map((cell) => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`;
    return [line(normalized.headers), line(normalized.headers.map(() => "---")), ...normalized.rows.map(line)].join("\n");
  }

  const csvCell = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  return "\uFEFF" + [normalized.headers, ...normalized.rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function createExcelBlob(data) {
  if (!window.XLSX) throw new Error("Excel exporter is not available.");

  const normalized = normalizeDataset(data);
  const worksheet = XLSX.utils.aoa_to_sheet([normalized.headers, ...normalized.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "TableFlow Export");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  return new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });
}

function normalizeDataset(data) {
  const headers = normalizeHeaders(data.headers);
  const rows = data.rows.map((row) => [...row, ...Array(Math.max(0, headers.length - row.length)).fill("")].slice(0, headers.length));
  return { headers, rows };
}

function normalizeHeaders(headers) {
  const counts = new Map();

  return headers.map((header, index) => {
    const base = String(header || "").trim() || `Column ${index + 1}`;
    const count = (counts.get(base) || 0) + 1;
    counts.set(base, count);
    return count === 1 ? base : `${base} ${count}`;
  });
}

async function initMonetizationState() {
  const entitlement = await TableFlowLicense.readEntitlement();
  proUpgradeLink.href = entitlement.paymentUrl;
  setQuotaUi(entitlement);
  setRatingPromptVisibility(entitlement);
}

async function ensureExportAllowed() {
  const entitlement = await TableFlowLicense.readEntitlement();
  if (entitlement.isPro || entitlement.remaining > 0) return true;

  statusEl.textContent = "Your monthly free quota is full. Unlock unlimited exports to keep going.";
  paywall.hidden = false;
  proUpgradeLink.focus();
  return false;
}

async function recordExportSuccess() {
  const entitlement = await TableFlowLicense.recordFreeExport();
  setQuotaUi(entitlement);
  setRatingPromptVisibility(entitlement);
}

async function dismissRatingPrompt() {
  const nextState = { userDismissedRatingPrompt: true };
  await chrome.storage.local.set(nextState);
  ratingPrompt.hidden = true;
}

function setQuotaUi(entitlement) {
  if (entitlement.isPro) {
    quotaTitle.textContent = "Pro unlocked";
    quotaDetail.textContent = "Unlimited exports are active on this browser.";
    paywall.hidden = true;
    copyButton.disabled = formatSelect.value === "xlsx";
    downloadButton.disabled = false;
    return;
  }

  quotaTitle.textContent = "Free monthly exports";
  quotaDetail.textContent = `${entitlement.used} of ${entitlement.limit} used this month.`;
  paywall.hidden = entitlement.remaining > 0;
  if (entitlement.remaining <= 0) {
    copyButton.disabled = true;
    downloadButton.disabled = true;
  } else {
    updateFormatControls();
    downloadButton.disabled = false;
  }
}

function setRatingPromptVisibility(entitlement) {
  ratingPrompt.hidden =
    entitlement.isPro ||
    entitlement.userDismissedRatingPrompt ||
    entitlement.used < entitlement.reviewPromptThreshold;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function extractTables() {
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();
  const isVisible = (element) => {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
  };
  const normalizeHeaders = (headers) => {
    const counts = new Map();
    return headers.map((header, index) => {
      const base = header || `Column ${index + 1}`;
      const count = (counts.get(base) || 0) + 1;
      counts.set(base, count);
      return count === 1 ? base : `${base} ${count}`;
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
      headers = normalizeHeaders(headers);

      const rows = dataRows
        .map((row) => [...row.querySelectorAll(":scope > th, :scope > td")].map((cell) => clean(cell.innerText)))
        .filter((row) => row.some(Boolean))
        .map((row) => [...row, ...Array(Math.max(0, headers.length - row.length)).fill("")].slice(0, headers.length));

      if (!rows.length || headers.length < 2) return null;
      return { id: tableIndex, headers, rows };
    })
    .filter(Boolean);
}
