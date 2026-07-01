/* NightVenture — Inventory Interaction UI
   Public entrypoint for inventory popup, pagination, direct drag and item actions.
   TODO migration: absorb the temporary backend file and delete Inventory_Mobile_Paged.js. */
(function () {
    "use strict";

    const ENTRY_VERSION = "v0.9.9.15-interaction-entrypoint";
    const BACKEND_SRC = "Inventory_Mobile_Paged.js";
    const BACKEND_ID = "nvInventoryInteractionBackend";

    if (window.__NVI_INTERACTION_ENTRYPOINT_LOADED) return;
    window.__NVI_INTERACTION_ENTRYPOINT_LOADED = true;

    window.NVI_INTERACTION_VERSION = ENTRY_VERSION;
    window.NVI_INTERACTION_BACKEND_SRC = BACKEND_SRC;

    function backendReady() {
        return typeof window.NVIMP_applyPagedInventory === "function" || typeof window.NVIPR_applyPopupRework === "function";
    }

    function existingBackendScript() {
        return document.getElementById(BACKEND_ID) || document.querySelector(`script[src="${BACKEND_SRC}"]`);
    }

    function dispatchReady() {
        window.dispatchEvent(new CustomEvent("nv:inventory-interaction-ready", {
            detail: {
                version: ENTRY_VERSION,
                backend: BACKEND_SRC,
                ready: backendReady()
            }
        }));
    }

    if (backendReady()) {
        dispatchReady();
        return;
    }

    const existing = existingBackendScript();
    if (existing) {
        existing.addEventListener("load", dispatchReady, { once: true });
        existing.addEventListener("error", () => console.error(`[NightVenture] Impossible de charger ${BACKEND_SRC}`), { once: true });
        return;
    }

    const script = document.createElement("script");
    script.id = BACKEND_ID;
    script.src = BACKEND_SRC;
    script.async = false;
    script.dataset.nvModule = "inventory-interaction-backend";
    script.dataset.nvTemporaryBackend = "true";
    script.onload = dispatchReady;
    script.onerror = () => console.error(`[NightVenture] Impossible de charger ${BACKEND_SRC}`);

    const current = document.currentScript;
    if (current?.parentNode) current.parentNode.insertBefore(script, current.nextSibling);
    else document.head.appendChild(script);
})();
