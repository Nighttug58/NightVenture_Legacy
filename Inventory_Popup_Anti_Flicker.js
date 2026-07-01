/* NightVenture — Anti flash ancien panneau inventaire */
(function () {
    "use strict";

    function injectStyle() {
        if (document.getElementById("nvInventoryPopupAntiFlickerStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryPopupAntiFlickerStyle";
        style.textContent = `
            .nvi-layout--inventory > .nvi-details.nvimp-details-popup:not(:has(.nvi-details__empty)) {
                position: fixed !important;
                left: max(10px, env(safe-area-inset-left)) !important;
                right: max(10px, env(safe-area-inset-right)) !important;
                top: calc(12px + env(safe-area-inset-top)) !important;
                bottom: auto !important;
                z-index: 1190 !important;
                width: auto !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                transform: none !important;
                transform-origin: top center !important;
            }

            .nvi-layout--inventory > .nvi-details.nvimp-details-popup:not(:has(.nvi-details__empty)):not(.nvipr-popup) {
                opacity: 0 !important;
                pointer-events: none !important;
            }

            .nvi-layout--inventory > .nvi-details.nvimp-details-popup.nvipr-popup {
                top: calc(12px + env(safe-area-inset-top)) !important;
                bottom: auto !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }
        `;
        document.head.appendChild(style);
    }

    function install() {
        injectStyle();
        setTimeout(injectStyle, 50);
        setTimeout(injectStyle, 250);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
