/* NightVenture — compatibility shim
   Deprecated filename kept temporarily for modules still requesting Inventory_Mobile_Paged.js.
   Real backend: Inventory_Paged_Drag_UI.js. */
(function () {
    "use strict";

    const SHIM_VERSION = "v0.9.9.28-mobile-paged-shim";
    const BACKEND_SRC = "Inventory_Paged_Drag_UI.js";
    const BACKEND_ID = "nvInventoryPagedDragBackend";

    window.NVIMP_SHIM_VERSION = SHIM_VERSION;
    window.NVIMP_COMPAT_BACKEND_SRC = BACKEND_SRC;

    function backendReady() {
        return Boolean(window.NVIPD_VERSION && typeof window.NVIMP_applyPagedInventory === "function");
    }

    function loadBackend() {
        if (backendReady()) return;
        if (document.getElementById(BACKEND_ID) || document.querySelector(`script[src="${BACKEND_SRC}"]`)) return;
        const script = document.createElement("script");
        script.id = BACKEND_ID;
        script.src = BACKEND_SRC;
        script.async = false;
        script.dataset.nvModule = "inventory-paged-drag-ui";
        script.onerror = () => console.error(`[NightVenture] Impossible de charger ${BACKEND_SRC}`);
        const current = document.currentScript;
        if (current?.parentNode) current.parentNode.insertBefore(script, current.nextSibling);
        else document.head.appendChild(script);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", loadBackend);
    else loadBackend();
})();
