const nameInput = document.getElementById("petName");
const enabledInput = document.getElementById("petEnabled");
const statusEl = document.getElementById("status");

chrome.storage.local.get({ petName: "Mochi", petEnabled: true }, ({ petName, petEnabled }) => {
  nameInput.value = petName;
  enabledInput.checked = petEnabled;
});

document.getElementById("save").addEventListener("click", async () => {
  const petName = nameInput.value.trim() || "Mochi";
  const petEnabled = enabledInput.checked;
  await chrome.storage.local.set({ petName, petEnabled });
  statusEl.textContent = "Saved. Refresh open webpages to apply changes.";
});
