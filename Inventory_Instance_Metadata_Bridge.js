/* NightVenture — Inventory Instance Metadata Bridge */
(function () {
    "use strict";

    const VERSION = "v0.9.9.16-instance-metadata-bridge";
    let lastClickedMeta = null;

    function extractMeta(button) {
        if (!button) return null;
        const slot = button.closest(".nvi-slot")?.dataset?.slot || button.dataset.nviItemSlot || "";
        return {
            id: button.dataset.nviItemId || "",
            key: button.dataset.nviItemKey || "",
            slot: slot
        };
    }

    function livePopup() {
        return document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
    }

    function attachMetaToPopup() {
        const popup = livePopup();
        if (!popup || !lastClickedMeta) return;
        if (popup.dataset.nviprItemId && popup.dataset.nviprItemId !== lastClickedMeta.id) return;
        popup.dataset.nviprItemKey = lastClickedMeta.key;
        popup.dataset.nviprSlot = lastClickedMeta.slot;
    }

    function installClickCapture() {
        if (window.__NVI_INSTANCE_META_CLICK_CAPTURE) return;
        window.__NVI_INSTANCE_META_CLICK_CAPTURE = true;
        document.addEventListener("click", event => {
            if (window.Game?.ui?.vueActive !== "inventaire") return;
            const button = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
            if (!button) return;
            lastClickedMeta = extractMeta(button);
            setTimeout(attachMetaToPopup, 0);
            requestAnimationFrame(attachMetaToPopup);
        }, true);
    }

    function installObserver() {
        const root = document.getElementById("vuePrincipale");
        if (!root || window.__NVI_INSTANCE_META_OBSERVER) return;
        window.__NVI_INSTANCE_META_OBSERVER = new MutationObserver(attachMetaToPopup);
        window.__NVI_INSTANCE_META_OBSERVER.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-nvipr-item-id"] });
    }

    function install() {
        window.NVI_INSTANCE_METADATA_BRIDGE_VERSION = VERSION;
        installClickCapture();
        installObserver();
        attachMetaToPopup();
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
