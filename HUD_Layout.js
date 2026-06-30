(function () {
    "use strict";

    const NV_HUD_LAYOUT_VERSION = "v0.9.8.3-no-emoji-hud";

    const NV_HUD_STATE = {
        navigationOriginalParent: null,
        navigationOriginalNextSibling: null,
        intervalId: null,
        observer: null,
        installe: false
    };

    function NVHUD_hasGame() {
        return typeof Game !== "undefined" && Boolean(Game?.data?.personnage);
    }

    function NVHUD_estModePlaying() {
        return Boolean(document.body?.classList?.contains("nv-mode-playing"))
            && !document.body.classList.contains("nv-start-mode");
    }

    function NVHUD_peutAfficherHud() {
        return NVHUD_hasGame() && NVHUD_estModePlaying();
    }

    function NVHUD_zoneActuelle() {
        if (!NVHUD_hasGame()) return null;
        if (typeof obtenirZoneActuelle === "function") return obtenirZoneActuelle();
        const idZone = Game.data?.personnage?.zoneActuelle;
        return Game.cache?.zonesParId?.[idZone] || null;
    }

    function NVHUD_regionActuelle() {
        if (!NVHUD_hasGame()) return null;
        if (typeof obtenirRegionMondeActuelle === "function") return obtenirRegionMondeActuelle();
        const idRegion = Game.data?.personnage?.regionMondeActuelle;
        return (Game.data?.regionsMonde || []).find(region => region.id === idRegion) || null;
    }

    function NVHUD_infosTemps() {
        const personnage = Game.data.personnage;
        const heure = Number(personnage.heure || 0);
        const minute = Number(personnage.minute || 0);
        const periode = heure >= 6 && heure < 18 ? "Jour" : "Nuit";

        return {
            jour: personnage.jour ?? 1,
            heureAffichee: `${heure}h${String(minute).padStart(2, "0")}`,
            periode
        };
    }

    function NVHUD_preparerNavigationOriginale() {
        const navigation = document.getElementById("barreVuePrincipale");
        if (!navigation || NV_HUD_STATE.navigationOriginalParent) return;
        NV_HUD_STATE.navigationOriginalParent = navigation.parentElement;
        NV_HUD_STATE.navigationOriginalNextSibling = navigation.nextSibling;
    }

    function NVHUD_creerOuTrouverHudMonde() {
        if (!NVHUD_peutAfficherHud()) return null;

        const personnageCompact = document.querySelector("#topCharacterBar .personnage-compact");
        if (!personnageCompact) return null;

        let hud = document.getElementById("nvHudWorldInfo");
        if (hud) return hud;

        hud = document.createElement("div");
        hud.id = "nvHudWorldInfo";
        hud.className = "nv-hud-world-info";

        const xp = personnageCompact.querySelector(".personnage-compact__xp");
        if (xp) xp.insertAdjacentElement("afterend", hud);
        else personnageCompact.appendChild(hud);

        return hud;
    }

    function NVHUD_mettreAJourInfosMonde() {
        if (!NVHUD_peutAfficherHud()) return;

        const hud = NVHUD_creerOuTrouverHudMonde();
        if (!hud) return;

        const personnage = Game.data.personnage;
        const region = NVHUD_regionActuelle()?.nom || "Région inconnue";
        const zone = NVHUD_zoneActuelle()?.nom || "Zone inconnue";
        const temps = NVHUD_infosTemps();

        hud.innerHTML = `
            <div class="nv-hud-world-info__location">
                <span class="nv-hud-chip nv-hud-chip--region">Région : ${region}</span>
                <span class="nv-hud-chip nv-hud-chip--zone">Zone actuelle : ${zone}</span>
            </div>
            <div class="nv-hud-world-info__state">
                <span class="nv-hud-chip nv-hud-chip--gold">Or : ${personnage.or ?? 0}</span>
                <span class="nv-hud-chip">${temps.periode}</span>
                <span class="nv-hud-chip">Jour ${temps.jour} - ${temps.heureAffichee}</span>
            </div>
        `;
    }

    function NVHUD_deplacerNavigationDansHeader() {
        if (!NVHUD_peutAfficherHud()) return;

        const header = document.getElementById("topCharacterBar");
        const personnage = document.getElementById("personnage");
        const navigation = document.getElementById("barreVuePrincipale");
        if (!header || !personnage || !navigation) return;

        NVHUD_preparerNavigationOriginale();
        if (navigation.parentElement === header) return;

        navigation.classList.add("nv-hud-navigation");
        personnage.insertAdjacentElement("afterend", navigation);
    }

    function NVHUD_desactiverSidebarGauche() {
        if (!NVHUD_peutAfficherHud()) return;

        const navigationPrincipale = document.getElementById("navigationPrincipale");
        const infosMonde = document.getElementById("infosMondeSidebar");
        const equipement = document.getElementById("equipementSidebar");
        const journal = document.getElementById("journalSection");

        if (infosMonde) infosMonde.innerHTML = "";
        if (equipement) equipement.innerHTML = "";
        if (journal) journal.classList.add("nv-hud-hidden-sidebar-part");
        if (navigationPrincipale) navigationPrincipale.classList.add("nv-hud-sidebar-disabled");
    }

    function NVHUD_nettoyerHorsPartie() {
        const hud = document.getElementById("nvHudWorldInfo");
        if (hud) hud.remove();

        const navigation = document.getElementById("barreVuePrincipale");
        const navigationPrincipale = document.getElementById("navigationPrincipale");
        const journal = document.getElementById("journalSection");
        const infosMonde = document.getElementById("infosMondeSidebar");
        const equipement = document.getElementById("equipementSidebar");

        if (navigation) {
            navigation.classList.remove("nv-hud-navigation");
            const parentOriginal = NV_HUD_STATE.navigationOriginalParent;
            if (parentOriginal && navigation.parentElement !== parentOriginal) {
                const nextSibling = NV_HUD_STATE.navigationOriginalNextSibling;
                if (nextSibling && nextSibling.parentElement === parentOriginal) {
                    parentOriginal.insertBefore(navigation, nextSibling);
                } else {
                    parentOriginal.appendChild(navigation);
                }
            }
        }

        if (navigationPrincipale) navigationPrincipale.classList.remove("nv-hud-sidebar-disabled");
        if (journal) journal.classList.remove("nv-hud-hidden-sidebar-part");
        if (infosMonde && !NVHUD_peutAfficherHud()) infosMonde.innerHTML = "";
        if (equipement && !NVHUD_peutAfficherHud()) equipement.innerHTML = "";
    }

    function NVHUD_appliquerLayoutSiPossible() {
        if (!NVHUD_peutAfficherHud()) {
            NVHUD_arreterTick();
            NVHUD_nettoyerHorsPartie();
            return;
        }

        NVHUD_injecterStyle();
        NVHUD_mettreAJourInfosMonde();
        NVHUD_deplacerNavigationDansHeader();
        NVHUD_desactiverSidebarGauche();
        NVHUD_demarrerTick();
    }

    function NVHUD_patchAfficherEquipementSidebar() {
        if (typeof afficherEquipementSidebar !== "function" || afficherEquipementSidebar.__NVHUD_0983_PATCH) return;

        const original = afficherEquipementSidebar;
        afficherEquipementSidebar = function () {
            if (!NVHUD_peutAfficherHud()) return original.apply(this, arguments);
            const equipement = document.getElementById("equipementSidebar");
            if (equipement) equipement.innerHTML = "";
            return undefined;
        };

        afficherEquipementSidebar.__NVHUD_0983_PATCH = true;
    }

    function NVHUD_patchAfficherPersonnage() {
        if (typeof afficherPersonnage !== "function" || afficherPersonnage.__NVHUD_0983_PATCH) return;

        const original = afficherPersonnage;
        afficherPersonnage = function () {
            const resultat = original.apply(this, arguments);
            NVHUD_appliquerLayoutSiPossible();
            return resultat;
        };

        afficherPersonnage.__NVHUD_0983_PATCH = true;
    }

    function NVHUD_patchAfficherVuePrincipale() {
        if (typeof afficherVuePrincipale !== "function" || afficherVuePrincipale.__NVHUD_0983_PATCH) return;

        const original = afficherVuePrincipale;
        afficherVuePrincipale = function (html) {
            const resultat = original.apply(this, arguments);
            requestAnimationFrame(NVHUD_appliquerLayoutSiPossible);
            return resultat;
        };

        afficherVuePrincipale.__NVHUD_0983_PATCH = true;
    }

    function NVHUD_demarrerTick() {
        if (NV_HUD_STATE.intervalId || !NVHUD_peutAfficherHud()) return;

        NV_HUD_STATE.intervalId = setInterval(() => {
            if (!NVHUD_peutAfficherHud()) {
                NVHUD_arreterTick();
                NVHUD_nettoyerHorsPartie();
                return;
            }

            NVHUD_mettreAJourInfosMonde();
            NVHUD_deplacerNavigationDansHeader();
            NVHUD_desactiverSidebarGauche();
        }, 500);
    }

    function NVHUD_arreterTick() {
        if (!NV_HUD_STATE.intervalId) return;
        clearInterval(NV_HUD_STATE.intervalId);
        NV_HUD_STATE.intervalId = null;
    }

    function NVHUD_observerModeUI() {
        if (NV_HUD_STATE.observer || !document.body) return;

        NV_HUD_STATE.observer = new MutationObserver(() => {
            requestAnimationFrame(NVHUD_appliquerLayoutSiPossible);
        });

        NV_HUD_STATE.observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"]
        });
    }

    function NVHUD_injecterStyle() {
        if (document.getElementById("nvHudLayoutStyle")) return;

        const style = document.createElement("style");
        style.id = "nvHudLayoutStyle";
        style.textContent = `
            body.nv-mode-playing #appShell { padding: 16px 18px; }
            body.nv-mode-playing #topCharacterBar { position: sticky; top: 0; z-index: 200; padding: 12px 14px 14px; }
            body.nv-mode-playing #gameLayout { display: block !important; }
            body.nv-mode-playing #navigationPrincipale.nv-hud-sidebar-disabled { display: none !important; }
            body.nv-mode-playing #infosMondeSidebar,
            body.nv-mode-playing #equipementSidebar,
            body.nv-mode-playing .nv-hud-hidden-sidebar-part { display: none !important; }
            body.nv-mode-playing #main { width: 100%; max-width: none; }
            body.nv-mode-playing #vuePrincipale { width: 100%; box-sizing: border-box; }
            body.nv-mode-playing #topCharacterBar #personnage { width: 100%; }
            body.nv-mode-playing #topCharacterBar .personnage-compact { display: flex; flex-direction: column; gap: 10px; }
            body.nv-mode-playing #topCharacterBar .personnage-compact__haut { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
            body.nv-mode-playing #topCharacterBar .personnage-compact__ressources { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
            body.nv-mode-playing #topCharacterBar .personnage-compact__xp { margin-top: 0; }
            body.nv-mode-playing .nv-hud-world-info { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 9px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.07); background: radial-gradient(circle at top right, rgba(245, 211, 122, 0.055), transparent 48%), rgba(0,0,0,0.16); }
            body.nv-mode-playing .nv-hud-world-info__location,
            body.nv-mode-playing .nv-hud-world-info__state { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; min-width: 0; }
            body.nv-mode-playing .nv-hud-world-info__location { flex: 1 1 auto; }
            body.nv-mode-playing .nv-hud-world-info__state { justify-content: flex-end; flex: 0 0 auto; }
            body.nv-mode-playing .nv-hud-chip { display: inline-flex; align-items: center; max-width: 100%; padding: 4px 8px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.07); background: rgba(0,0,0,0.20); color: var(--text-muted, #c7bdad); font-size: 0.78rem; font-weight: 700; line-height: 1.1; white-space: nowrap; }
            body.nv-mode-playing .nv-hud-chip--region { color: var(--gold, #f5d37a); border-color: rgba(245, 211, 122, 0.20); background: rgba(245, 211, 122, 0.08); }
            body.nv-mode-playing .nv-hud-chip--zone { color: var(--text, #f1eadf); }
            body.nv-mode-playing .nv-hud-chip--gold { color: #ffd86a; border-color: rgba(255, 216, 106, 0.18); background: rgba(255, 216, 106, 0.07); }
            body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation { display: flex !important; flex-direction: row !important; flex-wrap: wrap; align-items: center; justify-content: center; gap: 7px; width: 100%; margin: 10px 0 0; padding: 8px 8px 0; border-top: 1px solid rgba(255,255,255,0.07); }
            body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation button { width: auto !important; min-height: 32px; padding: 7px 10px; border-radius: 999px; font-size: 0.83rem; line-height: 1; flex: 0 0 auto; }
            body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation button.vue-active,
            body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation button.actif,
            body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation button.active { box-shadow: 0 0 0 1px rgba(245, 211, 122, 0.22), 0 0 12px rgba(245, 211, 122, 0.10); }
            @media (max-width: 980px) {
                body.nv-mode-playing #appShell { padding: 10px; }
                body.nv-mode-playing #topCharacterBar .personnage-compact__haut { align-items: flex-start; flex-direction: column; }
                body.nv-mode-playing #topCharacterBar .personnage-compact__actions { justify-content: flex-start; }
                body.nv-mode-playing .nv-hud-world-info { align-items: stretch; flex-direction: column; }
                body.nv-mode-playing .nv-hud-world-info__state { justify-content: flex-start; }
            }
            @media (max-width: 720px) {
                body.nv-mode-playing #topCharacterBar .personnage-compact__ressources { grid-template-columns: 1fr; }
                body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation { justify-content: flex-start; overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
                body.nv-mode-playing #barreVuePrincipale.nv-hud-navigation button { white-space: nowrap; }
            }
        `;

        document.head.appendChild(style);
    }

    function NVHUD_installer() {
        if (NV_HUD_STATE.installe) {
            NVHUD_appliquerLayoutSiPossible();
            return;
        }

        NV_HUD_STATE.installe = true;
        NVHUD_preparerNavigationOriginale();
        NVHUD_injecterStyle();
        NVHUD_patchAfficherEquipementSidebar();
        NVHUD_patchAfficherPersonnage();
        NVHUD_patchAfficherVuePrincipale();
        NVHUD_observerModeUI();
        NVHUD_appliquerLayoutSiPossible();
        console.log(`HUD_Layout.js charge — ${NV_HUD_LAYOUT_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVHUD_installer);
    } else {
        NVHUD_installer();
    }

    window.NV_HUD_LAYOUT_VERSION = NV_HUD_LAYOUT_VERSION;
    window.NVHUD_mettreAJourInfosMonde = NVHUD_mettreAJourInfosMonde;
    window.NVHUD_appliquerLayoutSiPossible = NVHUD_appliquerLayoutSiPossible;
})();
