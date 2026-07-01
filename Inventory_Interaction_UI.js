/* NightVenture — Inventory Interaction UI
   Entrypoint renamed from Inventory_Mobile_Paged.js.
   The implementation is still loaded from the former file during the safe migration step. */
(function () {
    "use strict";

    if (window.__NVI_INTERACTION_ENTRYPOINT_LOADED) return;
    window.__NVI_INTERACTION_ENTRYPOINT_LOADED = true;

    const alreadyLoaded = window.NVIMP_applyPagedInventory || document.querySelector('script[src="Inventory_Mobile_Paged.js"]');
    if (alreadyLoaded) return;

    const current = document.currentScript;
    const script = document.createElement("script");
    script.src = "Inventory_Mobile_Paged.js";
    script.async = false;
    script.dataset.nvModule = "inventory-interaction-backend";

    if (current?.parentNode) current.parentNode.insertBefore(script, current.nextSibling);
    else document.head.appendChild(script);
})();
