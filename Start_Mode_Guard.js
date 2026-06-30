/*
NightVenture - Start Mode Guard
Assure que les ecrans Accueil / Nouvelle partie restent propres :
aucun HUD gameplay, aucune ancienne sidebar, aucune info personnage.
*/

(function () {
    "use strict";

    const STYLE_ID = "nvStartModeGuardStyle";
    const VERSION = "v1-start-screen-clean-hud";

    function NVSMG_injecterStyle() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            body.nv-start-mode #topCharacterBar,
            body.nv-start-mode #navigationPrincipale,
            body.nv-start-mode #barreVuePrincipale,
            body.nv-start-mode #infosMondeSidebar,
            body.nv-start-mode #equipementSidebar,
            body.nv-start-mode #journalSection,
            body.nv-start-mode #journalMini,
            body.nv-start-mode #journalNotifications {
                display: none !important;
                visibility: hidden !important;
                pointer-events: none !important;
            }

            body.nv-start-mode #gameLayout {
                display: block !important;
            }

            body.nv-start-mode #main {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
            }

            body.nv-start-mode #vuePrincipale {
                width: 100% !important;
                max-width: none !important;
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(style);
    }

    function NVSMG_estModeStart() {
        return document.body?.classList?.contains("nv-start-mode");
    }

    function NVSMG_nettoyerSiStartMode() {
        if (!NVSMG_estModeStart()) return;

        const personnage = document.getElementById("personnage");
        if (personnage) {
            personnage.innerHTML = "";
        }

        const infosMonde = document.getElementById("infosMondeSidebar");
        if (infosMonde) infosMonde.innerHTML = "";

        const equipement = document.getElementById("equipementSidebar");
        if (equipement) equipement.innerHTML = "";

        const journalMini = document.getElementById("journalMini");
        if (journalMini) journalMini.innerHTML = "";
    }

    function NVSMG_installerObserver() {
        const observer = new MutationObserver(NVSMG_nettoyerSiStartMode);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
            childList: true,
            subtree: true
        });
    }

    function NVSMG_installer() {
        NVSMG_injecterStyle();
        NVSMG_installerObserver();
        NVSMG_nettoyerSiStartMode();
        console.log(`✅ Start_Mode_Guard.js charge — ${VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVSMG_installer);
    } else {
        NVSMG_installer();
    }

    window.NV_START_MODE_GUARD_VERSION = VERSION;
    window.NVSMG_nettoyerSiStartMode = NVSMG_nettoyerSiStartMode;
})();
