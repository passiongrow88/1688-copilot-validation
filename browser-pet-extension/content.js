(() => {
  const ROOT_ID = "my-browser-pet-root";
  if (document.getElementById(ROOT_ID)) return;

  chrome.storage.local.get({ petEnabled: true, petName: "Mochi" }, ({ petEnabled, petName }) => {
    if (!petEnabled) return;

    const pet = document.createElement("button");
    pet.id = ROOT_ID;
    pet.type = "button";
    pet.setAttribute("aria-label", `${petName}, your browser pet`);
    pet.innerHTML = `<span class="mbp-pet" aria-hidden="true">🐱</span><span class="mbp-bubble">Hi, I'm ${escapeHtml(petName)}!</span>`;
    document.documentElement.appendChild(pet);

    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    pet.addEventListener("pointerdown", (event) => {
      dragging = true;
      const rect = pet.getBoundingClientRect();
      offsetX = event.clientX - rect.left;
      offsetY = event.clientY - rect.top;
      pet.setPointerCapture(event.pointerId);
      pet.classList.add("mbp-dragging");
    });

    pet.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const left = Math.max(0, Math.min(window.innerWidth - pet.offsetWidth, event.clientX - offsetX));
      const top = Math.max(0, Math.min(window.innerHeight - pet.offsetHeight, event.clientY - offsetY));
      pet.style.left = `${left}px`;
      pet.style.top = `${top}px`;
      pet.style.right = "auto";
      pet.style.bottom = "auto";
    });

    pet.addEventListener("pointerup", async (event) => {
      dragging = false;
      pet.releasePointerCapture(event.pointerId);
      pet.classList.remove("mbp-dragging");
      const rect = pet.getBoundingClientRect();
      await chrome.storage.local.set({ petPosition: { left: rect.left, top: rect.top } });
    });

    pet.addEventListener("click", () => {
      if (dragging) return;
      pet.classList.remove("mbp-happy");
      void pet.offsetWidth;
      pet.classList.add("mbp-happy");
      pet.querySelector(".mbp-bubble").textContent = `${petName} is happy to see you!`;
    });

    chrome.storage.local.get("petPosition", ({ petPosition }) => {
      if (!petPosition) return;
      pet.style.left = `${Math.min(petPosition.left, window.innerWidth - 80)}px`;
      pet.style.top = `${Math.min(petPosition.top, window.innerHeight - 80)}px`;
      pet.style.right = "auto";
      pet.style.bottom = "auto";
    });
  });

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }
})();
