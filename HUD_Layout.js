(function () {
    "use strict";

    const NV_HUD_LAYOUT_VERSION =
        "v0.9.8.1-hud-rework-horizontal";

    const NV_HUD_STATE = {
        navigationOriginalParent: null,
        navigationOriginalNextSibling: null,
        intervalId: null
    };

    function NVHUD_hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function NVHUD_zoneActuelle() {
        if (typeof obtenirZoneActuelle === "function") {
            return obtenirZoneActuelle();
        }

        const idZone =
            Game.data?.personnage?.zoneActuelle;

        return Game.cache?.zonesParId?.[idZone] || null;
    }

    function NVHUD_regionActuelle() {
        if (typeof obtenirRegionMondeActuelle === "function") {
            return obtenirRegionMondeActuelle();
        }

        const idRegion =
            Game.data?.personnage?.regionMondeActuelle;

        return (Game.data?.regionsMonde || []).find(region => region.id === idRegion) || null;
    }

    function NVHUD_infosTemps() {
        const personnage =
            Game.data.personnage;

        const heure =
            Number(personnage.heure || 0);

        const minute =
            Number(personnage.minute || 0);

        const periode =
            heure >= 6 && heure < 18
                ? "☀️ Jour"
                : "🌙 Nuit";

        return {
            jour: personnage.jour ?? 1,
            heureAffichee: `${heure}h${String(minute).padStart(2, "0")}`,
            periode
        };
    }

    function NVHUD_creerOuTrouverHudMonde() {
        const personnageCompact =
            document.querySelector("#topCharacterBar .personnage-compact");

        if (!personnageCompact) return null;

        let hud =
            document.getElementById("nvHudWorldInfo");

        if (hud) return hud;

        hud =
            document.createElement("div");

        hud.id =
            "nvHudWorldInfo";

        hud.className =
            "nv-hud-world-info";

        const xp =
            personnageCompact.querySelector(".personnage-compact__xp");

        if (xp) {
            xp.insertAdjacentElement("afterend", hud);
        } else {
            personnageCompact.appendChild(hud);
        }

        return hud;
    }

    function NVHUD_mettreAJourInfosMonde() {
        if (!NVHUD_hasGame()) return;

        const hud =
            NVHUD_creerOuTrouverHudMonde();

        if (!hud) return;

        const personnage =
            Game.data.personnage;

        const region =
            NVHUD_regionActuelle()?.nom || "Région inconnue";

        const zone =
            NVHUD_zoneActuelle()?.nom || "Zone inconnue";

        const temps =
            NVHUD_infosTemps();

        hud.innerHTML = `
            <div class="nv-hud-world-info__location">
                <span class="nv-hud-chip nv-hud-chip--region">
                    📍 ${region}
                </span>

                <span class="nv-hud-chip nv-hud-chip--zone">
                    ${zone}
                </span>
            </div>

            <div class="nv-hud-world-info__state">
                <span class="nv-hud-chip nv-hud-chip--gold">
                    🟡 ${personnage.or ?? 0} or
                </span>

                <span class="nv-hud-chip">
                    ${temps.periode}
                </span>

                <span class="nv-hud-chip">
                    Jour ${temps.jour} — ${temps.heureAffichee}
                </span>
            </div>
        `;
    }

    function NVHUD_deplacerNavigationDansHeader() {
        const header =
            document.getElementById("topCharacterBar");

        const personnage =
            document.getElementById("personnage");

        const navigation =
            document.getElementById("barreVuePrincipale");

        if (!header || !personnage || !navigation) return;

        if (!NV_HUD_STATE.navigationOriginalParent) {
            NV_HUD_STATE.navigationOriginalParent =
                navigation.parentElement;

            NV_HUD_STATE.navigationOriginalNextSibling =
                navigation.nextSibling;
        }

        if (navigation.parentElement === header) return;

        navigation.classList.add("nv-hud-navigation");

        /*
            On place la navigation directement sous le bloc personnage.
            Visuellement, elle arrive sous la XP car elle est dans le header,
            après #personnage.
        */
        personnage.insertAdjacentElement("afterend", navigation);
    }

    function NVHUD_desactiverSidebarGauche() {
        const navigationPrincipale =
            document.getElementById("navigationPrincipale");

        const infosMonde =
            document.getElementById("infosMondeSidebar");

        const equipement =
            document.getElementById("equipementSidebar");

        const journal =
            document.getElementById("journalSection");

        if (infosMonde) {
            infosMonde.innerHTML =
                "";
        }

        if (equipement) {
            equipement.innerHTML =
                "";
        }

        if (journal) {
            journal.classList.add("nv-hud-hidden-sidebar-part");
        }

        if (navigationPrincipale) {
            navigationPrincipale.classList.add("nv-hud-sidebar-disabled");
        }
    }

    function NVHUD_patchAfficherEquipementSidebar() {
        if (typeof afficherEquipementSidebar !== "function" || afficherEquipementSidebar.__NVHUD_0981_PATCH) return;

        afficherEquipementSidebar = function () {
            const equipement =
                document.getElementById("equipementSidebar");

            if (equipement) {
                equipement.innerHTML =
                    "";
            }
        };

        afficherEquipementSidebar.__NVHUD_0981_PATCH =
            true;
    }

    function NVHUD_patchAfficherPersonnage() {
        if (typeof afficherPersonnage !== "function" || afficherPersonnage.__NVHUD_0981_PATCH) return;

        const original =
            afficherPersonnage;

        afficherPersonnage = function () {
            const resultat =
                original();

            /*
                Le core écrit encore dans #infosMondeSidebar.
                On reprend ces infos dans le HUD haut puis on vide la sidebar.
            */
            NVHUD_mettreAJourInfosMonde();
            NVHUD_deplacerNavigationDansHeader();
            NVHUD_desactiverSidebarGauche();

            return resultat;
        };

        afficherPersonnage.__NVHUD_0981_PATCH =
            true;
    }

    function NVHUD_patchAfficherVuePrincipale() {
        if (typeof afficherVuePrincipale !== "function" || afficherVuePrincipale.__NVHUD_0981_PATCH) return;

        const original =
            afficherVuePrincipale;

        afficherVuePrincipale = function (html) {
            const resultat =
                original(html);

            setTimeout(() => {
                NVHUD_mettreAJourInfosMonde();
                NVHUD_deplacerNavigationDansHeader();
                NVHUD_desactiverSidebarGauche();
            }, 0);

            return resultat;
        };

        afficherVuePrincipale.__NVHUD_0981_PATCH =
            true;
    }

    function NVHUD_demarrerTick() {
        if (NV_HUD_STATE.intervalId) {
            clearInterval(NV_HUD_STATE.intervalId);
        }

        NV_HUD_STATE.intervalId =
            setInterval(() => {
                if (!NVHUD_hasGame()) return;

                NVHUD_mettreAJourInfosMonde();
                NVHUD_deplacerNavigationDansHeader();
                NVHUD_desactiverSidebarGauche();
            }, 500);
    }

    function NVHUD_injecterStyle() {
        if (document.getElementById("nvHudLayoutStyle")) return;

        const style =
            document.createElement("style");

        style.id =
            "nvHudLayoutStyle";

        style.textContent =
            `
                /*
                    HUD horizontal NightVenture
                    - sidebar gauche désactivée
                    - navigation sous le bandeau personnage
                    - infos monde dans le bandeau haut
                */

                #appShell {
                    padding: 16px 18px;
                }

                #topCharacterBar {
                    position: sticky;
                    top: 0;
                    z-index: 200;
                    padding: 12px 14px 14px;
                }

                #gameLayout {
                    display: block !important;
                }

                #navigationPrincipale.nv-hud-sidebar-disabled {
                    display: none !important;
                }

                #infosMondeSidebar,
                #equipementSidebar,
                .nv-hud-hidden-sidebar-part {
                    display: none !important;
                }

                #main {
                    width: 100%;
                    max-width: none;
                }

                #vuePrincipale {
                    width: 100%;
                    box-sizing: border-box;
                }

                #topCharacterBar #personnage {
                    width: 100%;
                }

                #topCharacterBar .personnage-compact {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }

                #topCharacterBar .personnage-compact__haut {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 14px;
                }

                #topCharacterBar .personnage-compact__ressources {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 10px;
                }

                #topCharacterBar .personnage-compact__xp {
                    margin-top: 0;
                }

                .nv-hud-world-info {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 10px;
                    padding: 8px 9px;
                    border-radius: 14px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background:
                        radial-gradient(circle at top right, rgba(245, 211, 122, 0.055), transparent 48%),
                        rgba(0,0,0,0.16);
                }

                .nv-hud-world-info__location,
                .nv-hud-world-info__state {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 6px;
                    min-width: 0;
                }

                .nv-hud-world-info__location {
                    flex: 1 1 auto;
                }

                .nv-hud-world-info__state {
                    justify-content: flex-end;
                    flex: 0 0 auto;
                }

                .nv-hud-chip {
                    display: inline-flex;
                    align-items: center;
                    max-width: 100%;
                    padding: 4px 8px;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.07);
                    background: rgba(0,0,0,0.20);
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.78rem;
                    font-weight: 700;
                    line-height: 1.1;
                    white-space: nowrap;
                }

                .nv-hud-chip--region {
                    color: var(--gold, #f5d37a);
                    border-color: rgba(245, 211, 122, 0.20);
                    background: rgba(245, 211, 122, 0.08);
                }

                .nv-hud-chip--zone {
                    color: var(--text, #f1eadf);
                }

                .nv-hud-chip--gold {
                    color: #ffd86a;
                    border-color: rgba(255, 216, 106, 0.18);
                    background: rgba(255, 216, 106, 0.07);
                }

                #barreVuePrincipale.nv-hud-navigation {
                    display: flex !important;
                    flex-direction: row !important;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: center;
                    gap: 7px;
                    width: 100%;
                    margin: 10px 0 0;
                    padding: 8px 8px 0;
                    border-top: 1px solid rgba(255,255,255,0.07);
                }

                #barreVuePrincipale.nv-hud-navigation button {
                    width: auto !important;
                    min-height: 32px;
                    padding: 7px 10px;
                    border-radius: 999px;
                    font-size: 0.83rem;
                    line-height: 1;
                    flex: 0 0 auto;
                }

                #barreVuePrincipale.nv-hud-navigation button.vue-active,
                #barreVuePrincipale.nv-hud-navigation button.actif,
                #barreVuePrincipale.nv-hud-navigation button.active {
                    box-shadow:
                        0 0 0 1px rgba(245, 211, 122, 0.22),
                        0 0 12px rgba(245, 211, 122, 0.10);
                }

                @media (max-width: 980px) {
                    #appShell {
                        padding: 10px;
                    }

                    #topCharacterBar .personnage-compact__haut {
                        align-items: flex-start;
                        flex-direction: column;
                    }

                    #topCharacterBar .personnage-compact__actions {
                        justify-content: flex-start;
                    }

                    .nv-hud-world-info {
                        align-items: stretch;
                        flex-direction: column;
                    }

                    .nv-hud-world-info__state {
                        justify-content: flex-start;
                    }
                }

                @media (max-width: 720px) {
                    #topCharacterBar .personnage-compact__ressources {
                        grid-template-columns: 1fr;
                    }

                    #barreVuePrincipale.nv-hud-navigation {
                        justify-content: flex-start;
                        overflow-x: auto;
                        flex-wrap: nowrap;
                        padding-bottom: 4px;
                    }

                    #barreVuePrincipale.nv-hud-navigation button {
                        white-space: nowrap;
                    }
                }
            `;

        document.head.appendChild(style);
    }

    function NVHUD_installer() {
        if (!NVHUD_hasGame()) {
            setTimeout(NVHUD_installer, 120);
            return;
        }

        NVHUD_injecterStyle();
        NVHUD_patchAfficherEquipementSidebar();
        NVHUD_patchAfficherPersonnage();
        NVHUD_patchAfficherVuePrincipale();

        NVHUD_mettreAJourInfosMonde();
        NVHUD_deplacerNavigationDansHeader();
        NVHUD_desactiverSidebarGauche();
        NVHUD_demarrerTick();

        console.log(`✅ HUD_Layout.js chargé — ${NV_HUD_LAYOUT_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVHUD_installer);
    } else {
        NVHUD_installer();
    }

    window.NV_HUD_LAYOUT_VERSION =
        NV_HUD_LAYOUT_VERSION;

    window.NVHUD_mettreAJourInfosMonde =
        NVHUD_mettreAJourInfosMonde;
})();
