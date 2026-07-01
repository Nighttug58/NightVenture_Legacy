/* NightVenture — Inventory Interaction UI
   Public entrypoint for inventory popup, pagination, direct drag and item actions.
   TODO migration: absorb the temporary backend file and delete Inventory_Mobile_Paged.js. */
(function () {
    "use strict";

    const ENTRY_VERSION = "v0.9.9.17-interaction-entrypoint-instance-actions";
    const BACKEND_SRC = "Inventory_Mobile_Paged.js";
    const BACKEND_ID = "nvInventoryInteractionBackend";
    const BRIDGE_SRC = "Inventory_Instance_Metadata_Bridge.js";
    const BRIDGE_ID = "nvInventoryInstanceMetadataBridge";
    const ACTIONS_SRC = "Inventory_Instance_Actions.js";
    const ACTIONS_ID = "nvInventoryInstanceActions";

    if (window.__NVI_INTERACTION_ENTRYPOINT_LOADED) return;
    window.__NVI_INTERACTION_ENTRYPOINT_LOADED = true;

    window.NVI_INTERACTION_VERSION = ENTRY_VERSION;
    window.NVI_INTERACTION_BACKEND_SRC = BACKEND_SRC;
    window.NVI_INTERACTION_BRIDGE_SRC = BRIDGE_SRC;
    window.NVI_INTERACTION_ACTIONS_SRC = ACTIONS_SRC;

    function backendReady() {
        return typeof window.NVIMP_applyPagedInventory === "function" || typeof window.NVIPR_applyPopupRework === "function";
    }

    function existingBackendScript() {
        return document.getElementById(BACKEND_ID) || document.querySelector(`script[src="${BACKEND_SRC}"]`);
    }

    function loadScriptOnce(id, src, moduleName, anchorId) {
        if (document.getElementById(id) || document.querySelector(`script[src="${src}"]`)) return;
        const script = document.createElement("script");
        script.id = id;
        script.src = src;
        script.async = false;
        script.dataset.nvModule = moduleName;
        const anchor = document.getElementById(anchorId) || document.currentScript;
        if (anchor?.parentNode) anchor.parentNode.insertBefore(script, anchor.nextSibling);
        else document.head.appendChild(script);
    }

    function loadInstanceModules() {
        if (!window.NVI_INSTANCE_METADATA_BRIDGE_VERSION) loadScriptOnce(BRIDGE_ID, BRIDGE_SRC, "inventory-instance-metadata-bridge", BACKEND_ID);
        if (!window.NVI_INSTANCE_ACTIONS_VERSION) loadScriptOnce(ACTIONS_ID, ACTIONS_SRC, "inventory-instance-actions", BRIDGE_ID);
    }

    function dispatchReady() {
        loadInstanceModules();
        window.dispatchEvent(new CustomEvent("nv:inventory-interaction-ready", {
            detail: {
                version: ENTRY_VERSION,
                backend: BACKEND_SRC,
                bridge: BRIDGE_SRC,
                actions: ACTIONS_SRC,
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
