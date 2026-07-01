/* NightVenture — Inventory Interaction Diagnostics */
(function () {
    "use strict";

    const VERSION = "v0.9.9.29-inventory-interaction-health-clean";
    const EXPECTED_BACKEND_SRC = "Inventory_Paged_Drag_UI.js";
    let lastStatus = null;

    function inventoryViewActive() {
        return window.Game?.ui?.vueActive === "inventaire";
    }

    function moduleStatus() {
        return {
            entrypoint: Boolean(window.NVI_INTERACTION_VERSION),
            backend: Boolean(window.NVIMP_applyPagedInventory || window.NVIPR_applyPopupRework),
            backendSource: window.NVI_INTERACTION_BACKEND_SRC === EXPECTED_BACKEND_SRC,
            pagedDrag: Boolean(window.NVIPD_VERSION),
            bridge: Boolean(window.NVI_INSTANCE_METADATA_BRIDGE_VERSION),
            popup: Boolean(window.NVI_INTERACTION_POPUP_VERSION || window.NVI_INTERACTION_POPUP_SRC === "integrated"),
            actions: Boolean(window.NVI_INSTANCE_ACTIONS_VERSION),
            diagnostics: VERSION
        };
    }

    function sameStatus(a, b) {
        return Boolean(
            a && b &&
            a.entrypoint === b.entrypoint &&
            a.backend === b.backend &&
            a.backendSource === b.backendSource &&
            a.pagedDrag === b.pagedDrag &&
            a.bridge === b.bridge &&
            a.popup === b.popup &&
            a.actions === b.actions
        );
    }

    function checkHealth(context = "manual") {
        const status = moduleStatus();
        if (sameStatus(status, lastStatus)) return status;
        lastStatus = status;

        const missing = Object.entries(status)
            .filter(([key, value]) => key !== "diagnostics" && !value)
            .map(([key]) => key);

        if (missing.length) {
            console.warn("[NightVenture][Inventory diagnostics] modules manquants", { context, missing, status });
        } else {
            console.info("[NightVenture][Inventory diagnostics] modules inventaire OK", { context, status });
        }
        return status;
    }

    function installObserver() {
        const root = document.getElementById("vuePrincipale");
        if (!root || window.__NVI_INTERACTION_DIAGNOSTICS_OBSERVER) return;
        window.__NVI_INTERACTION_DIAGNOSTICS_OBSERVER = new MutationObserver(() => {
            if (inventoryViewActive()) checkHealth("inventory view mutation");
        });
        window.__NVI_INTERACTION_DIAGNOSTICS_OBSERVER.observe(root, { childList: true, subtree: true });
    }

    function install() {
        window.NVI_INTERACTION_DIAGNOSTICS_VERSION = VERSION;
        window.NVI_INTERACTION_HEALTH_CHECK = checkHealth;
        installObserver();
        checkHealth("install");
        window.addEventListener("nv:inventory-interaction-ready", () => checkHealth("interaction ready"));
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
