let datasets = [];

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
const resultsEl = $("results");
const tableSelect = $("tableSelect");
const preview = $("preview");

$("scan").addEventListener("click", async () => {
  statusEl.textContent = "Scanning visible tables…";
  resultsEl.hidden = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractTables
    });

    datasets = result || [];
    if (!datasets.length) {
      statusEl.textContent = "No HTML tables found on this page.";
      return;
    }

    tableSelect.innerHTML = "";
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

$("copy").addEventListener("click", async () => {
  const content = serialize(currentDataset(), $("format").value);
  await navigator.clipboard.writeText(content);
  statusEl.textContent = "Copied to clipboard.";
});

$("download").addEventListener("click", async () => {
  const format = $("format").value;
  const content = serialize(currentDataset(), format);
  const mime = format === "json" ? "application/json" : "text/plain";
  const extension = format === "markdown" ? "md" : format;
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }));
  await chrome.downloads.download({
    url,
    filename: `tableflow-export-${Date.now()}.${extension}`,
    saveAs: true
  });
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  statusEl.textContent = "Export ready.";
});

function currentDataset() {
  return datasets[Number(tableSelect.value || 0)];
}

function renderPreview() {
  const data = currentDataset();
  if (!data) return;
  const rows = data.rows.slice(0, 5);
  const head = `<tr>${data.headers.map(h => `<th>${escapeHtml(h)}</th>`).join("")}</tr>`;
  const body = rows.map(row => `<tr>${data.headers.map((_, i) => `<td>${escapeHtml(row[i] || "")}</td>`).join("")}</tr>`).join("");
  preview.innerHTML = `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function serialize(data, format) {
  if (format === "json") {
    return JSON.stringify(data.rows.map(row =>
      Object.fromEntries(data.headers.map((header, i) => [header, row[i] || ""]))
    ), null, 2);
  }

  if (format === "markdown") {
    const line = (row) => `| ${row.map(cell => String(cell).replace(/\|/g, "\\|")).join(" | ")} |`;
    return [
      line(data.headers),
      line(data.headers.map(() => "---")),
      ...data.rows.map(line)
    ].join("\n");
  }

  const csvCell = value => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [data.headers, ...data.rows].map(row => row.map(csvCell).join(",")).join("\n");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[char]);
}

function extractTables() {
  const clean = (value) => (value || "").replace(/\s+/g, " ").trim();

  return [...document.querySelectorAll("table")]
    .map((table, tableIndex) => {
      const allRows = [...table.querySelectorAll("tr")];
      if (!allRows.length) return null;

      let headers = [...allRows[0].querySelectorAll("th,td")].map(cell => clean(cell.innerText));
      const startsWithHeader = allRows[0].querySelectorAll("th").length > 0;
      let dataRows = startsWithHeader ? allRows.slice(1) : allRows;

      const width = Math.max(headers.length, ...dataRows.map(row => row.querySelectorAll("th,td").length));
      if (!startsWithHeader) headers = Array.from({ length: width }, (_, i) => `Column ${i + 1}`);
      headers = headers.map((header, i) => header || `Column ${i + 1}`);

      const rows = dataRows
        .map(row => [...row.querySelectorAll("th,td")].map(cell => clean(cell.innerText)))
        .filter(row => row.some(Boolean))
        .map(row => [...row, ...Array(Math.max(0, headers.length - row.length)).fill("")].slice(0, headers.length));

      if (!rows.length || headers.length < 2) return null;
      return { id: tableIndex, headers, rows };
    })
    .filter(Boolean);
}