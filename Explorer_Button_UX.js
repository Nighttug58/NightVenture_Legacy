(function () {
    "use strict";

    const NV_EXPLORER_BUTTON_UX_VERSION =
        "v0.9.5.7-no-redraw-explore";

    const NV_EXPLORER_BUTTON_UX_STATE = {
        intervalId: null
    };

    function NVBU_hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function NVBU_zoneActuelle() {
        if (typeof obtenirZoneActuelle === "function") {
            return obtenirZoneActuelle();
        }

        const idZone =
            Game.data?.personnage?.zoneActuelle;

        return Game.cache?.zonesParId?.[idZone] || null;
    }

    function NVBU_staminaMax() {
        if (typeof staminaMaxTotal === "function") {
            return Math.max(1, Number(staminaMaxTotal() || 1));
        }

        return Math.max(
            1,
            Number(Game.data.personnage.staminaMax || Game.data.personnage.stamina || 100)
        );
    }

    function NVBU_coutExploration(zone) {
        const config =
            window.NV_STAMINA_REGEN_CONFIG?.explorationCostByType || {
                village: 6,
                ville: 6,
                exploration: 10,
                donjon: 14,
                defaut: 10
            };

        const cout =
            config[zone?.type] ?? config.defaut ?? 10;

        return Math.max(1, Math.round(Number(cout) || 10));
    }

    function NVBU_trouverBoutonExplorer() {
        const conteneur =
            document.getElementById("vuePrincipale");

        if (!conteneur) return null;

        return (
            document.getElementById("nvExplorerButtonUX") ||
            Array.from(conteneur.querySelectorAll("button"))
                .find(button => {
                    const onclick =
                        button.getAttribute("onclick") || "";

                    return onclick.includes("visiterZoneActuelle");
                }) ||
            null
        );
    }

    function NVBU_assurerBlocEtat(bouton) {
        if (!bouton) return null;

        let bloc =
            document.getElementById("nvExplorerButtonStateUX");

        if (bloc) return bloc;

        bloc =
            document.createElement("div");

        bloc.id =
            "nvExplorerButtonStateUX";

        bloc.className =
            "nv-explorer-state";

        bouton.insertAdjacentElement("afterend", bloc);

        return bloc;
    }

    function NVBU_mettreAJourBoutonExplorer() {
        if (!NVBU_hasGame()) return;

        const bouton =
            NVBU_trouverBoutonExplorer();

        if (!bouton) return;

        bouton.id =
            "nvExplorerButtonUX";

        bouton.classList.add("nv-explorer-button");

        const zone =
            NVBU_zoneActuelle();

        const cout =
            NVBU_coutExploration(zone);

        const stamina =
            Math.max(0, Math.round(Number(Game.data.personnage.stamina || 0)));

        const staminaMax =
            NVBU_staminaMax();

        const assez =
            stamina >= cout;

        bouton.disabled =
            !assez;

        bouton.classList.toggle("nv-explorer-button--ready", assez);
        bouton.classList.toggle("nv-explorer-button--empty", !assez);

        bouton.innerHTML =
            assez
                ? `🧭 Explorer <span>${cout} stamina</span>`
                : `🟢 Épuisé <span>${cout} requis</span>`;

        const bloc =
            NVBU_assurerBlocEtat(bouton);

        if (!bloc) return;

        const manque =
            Math.max(0, cout - stamina);

        bloc.classList.toggle("is-ready", assez);
        bloc.classList.toggle("is-empty", !assez);

        bloc.innerHTML =
            assez
                ? `
                    <strong>Prêt à explorer</strong>
                    <span>${stamina} / ${staminaMax} stamina disponible</span>
                `
                : `
                    <strong>Stamina insuffisante</strong>
                    <span>Il manque ${manque} stamina. Patiente quelques secondes.</span>
                `;
    }

    function NVBU_patchOuvrirExploration() {
        if (typeof ouvrirExploration !== "function" || ouvrirExploration.__NVBU_0956_PATCH) return;

        const original =
            ouvrirExploration;

        ouvrirExploration = function () {
            const resultat =
                original();

            setTimeout(NVBU_mettreAJourBoutonExplorer, 0);

            return resultat;
        };

        ouvrirExploration.__NVBU_0956_PATCH =
            true;
    }

    function NVBU_avancerTempsSansRefresh(heures = 0, minutes = 0) {
        const personnage =
            Game.data.personnage;

        personnage.minute =
            Number(personnage.minute || 0) + Number(minutes || 0);

        personnage.heure =
            Number(personnage.heure || 0) + Number(heures || 0);

        while (personnage.minute >= 60) {
            personnage.minute -= 60;
            personnage.heure++;
        }

        while (personnage.heure >= 24) {
            personnage.heure -= 24;
            personnage.jour =
                Number(personnage.jour || 1) + 1;

            if (typeof nouveauJour === "function") {
                nouveauJour();
            }
        }
    }

    function NVBU_consumerStamina(zone) {
        const cout =
            NVBU_coutExploration(zone);

        Game.data.personnage.stamina =
            Math.max(
                0,
                Number(Game.data.personnage.stamina || 0) - cout
            );

        return cout;
    }

    function NVBU_mettreAJourBarresHautSansRedraw() {
        const conteneur =
            document.getElementById("personnage");

        if (!conteneur || !Game?.data?.personnage) return;

        const ressources = [
            {
                selecteur: ".barre-pv",
                valeur: Number(Game.data.personnage.pv || 0),
                max: typeof pvMaxTotal === "function" ? pvMaxTotal() : Number(Game.data.personnage.pvMax || 1)
            },
            {
                selecteur: ".barre-mana",
                valeur: Number(Game.data.personnage.mana || 0),
                max: typeof manaMaxTotal === "function" ? manaMaxTotal() : Number(Game.data.personnage.manaMax || 1)
            },
            {
                selecteur: ".barre-stamina",
                valeur: Number(Game.data.personnage.stamina || 0),
                max: typeof staminaMaxTotal === "function" ? staminaMaxTotal() : Number(Game.data.personnage.staminaMax || 1)
            },
            {
                selecteur: ".barre-xp",
                valeur: Number(Game.data.personnage.xp || 0),
                max: typeof xpNiveauSuivant === "function" ? xpNiveauSuivant() : 1
            }
        ];

        ressources.forEach(ressource => {
            const remplissage =
                conteneur.querySelector(ressource.selecteur);

            if (!remplissage) return;

            const barre =
                remplissage.closest(".barre");

            if (!barre) return;

            const pourcentage =
                ressource.max > 0
                    ? Math.max(0, Math.min(100, (ressource.valeur / ressource.max) * 100))
                    : 0;

            remplissage.style.width =
                `${pourcentage}%`;

            const valeur =
                barre.querySelector(".barre__valeur");

            if (valeur) {
                valeur.textContent =
                    `${Math.round(ressource.valeur)} / ${ressource.max} (${Math.round(pourcentage)}%)`;
            }
        });

        if (typeof NVS_regenParSeconde === "function" && typeof NVBU_mettreAJourBoutonExplorer === "function") {
            NVBU_mettreAJourBoutonExplorer();
        }
    }

    function NVBU_explorerSansRedessinerVue() {
        const zone =
            NVBU_zoneActuelle();

        if (!zone) return;

        const cout =
            NVBU_coutExploration(zone);

        const stamina =
            Number(Game.data.personnage.stamina || 0);

        if (stamina < cout) {
            if (typeof ajouterJournal === "function") {
                ajouterJournal(`🟢 Stamina insuffisante pour explorer ${zone.nom}.`);
            }

            NVBU_mettreAJourBoutonExplorer();
            return;
        }

        NVBU_consumerStamina(zone);

        /*
            On avance le temps sans appeler avancerTemps(),
            car avancerTemps() lance rafraichirInterface(),
            ce qui reconstruit toute la vue et reset certaines animations.
        */
        NVBU_avancerTempsSansRefresh(0, 10);

        if (typeof genererEvenementZone === "function" && typeof executerEvenementZone === "function") {
            const evenement =
                genererEvenementZone(zone);

            executerEvenementZone(evenement, zone);
        }

        NVBU_mettreAJourBarresHautSansRedraw();
        NVBU_mettreAJourBoutonExplorer();

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("exploration no-redraw");
        }
    }

    function NVBU_patchVisiterZoneActuelle() {
        if (typeof visiterZoneActuelle !== "function" || visiterZoneActuelle.__NVBU_0957_PATCH) return;

        /*
            Patch volontairement final :
            on ne rappelle pas l'ancienne fonction, parce qu'elle passe par
            avancerTemps() puis rafraichirInterface(), ce qui recrée toute
            la vue exploration pendant le spam click.
        */
        visiterZoneActuelle = function () {
            return NVBU_explorerSansRedessinerVue();
        };

        visiterZoneActuelle.__NVBU_0957_PATCH =
            true;
    }

    function NVBU_injecterStyle() {
        if (document.getElementById("nvExplorerButtonUXStyle")) return;

        const style =
            document.createElement("style");

        style.id =
            "nvExplorerButtonUXStyle";

        style.textContent =
            `
                #nvExplorerButtonUX,
                .nv-explorer-button {
                    display: inline-flex !important;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    min-width: 180px;
                    margin-top: 8px;
                    transition:
                        opacity 0.18s ease,
                        filter 0.18s ease,
                        transform 0.12s ease,
                        box-shadow 0.18s ease;
                }

                #nvExplorerButtonUX span {
                    opacity: 0.86;
                    font-size: 0.82em;
                    font-weight: 700;
                }

                #nvExplorerButtonUX:not(:disabled):hover {
                    transform: translateY(-1px);
                    box-shadow:
                        0 0 0 1px rgba(245, 211, 122, 0.18),
                        0 8px 18px rgba(0,0,0,0.28);
                }

                #nvExplorerButtonUX:disabled,
                .nv-explorer-button--empty {
                    cursor: not-allowed !important;
                    opacity: 0.56;
                    filter: grayscale(0.25);
                    box-shadow: none !important;
                }

                .nv-explorer-state {
                    margin-top: 9px;
                    padding: 8px 10px;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.065);
                    background: rgba(0,0,0,0.16);
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.84rem;
                    line-height: 1.25;
                }

                .nv-explorer-state strong {
                    display: block;
                    margin-bottom: 2px;
                    color: var(--gold, #f5d37a);
                    font-size: 0.86rem;
                }

                .nv-explorer-state span {
                    display: block;
                }

                .nv-explorer-state.is-ready {
                    border-color: rgba(80, 220, 130, 0.20);
                    background:
                        radial-gradient(circle at left, rgba(80, 220, 130, 0.08), transparent 48%),
                        rgba(0,0,0,0.16);
                }

                .nv-explorer-state.is-ready strong {
                    color: #9dffb8;
                }

                .nv-explorer-state.is-empty {
                    border-color: rgba(255, 190, 80, 0.22);
                    background:
                        radial-gradient(circle at left, rgba(255, 190, 80, 0.08), transparent 48%),
                        rgba(0,0,0,0.16);
                }

                .nv-explorer-state.is-empty strong {
                    color: #ffd58a;
                }
            `;

        document.head.appendChild(style);
    }

    function NVBU_demarrerInterval() {
        if (NV_EXPLORER_BUTTON_UX_STATE.intervalId) {
            clearInterval(NV_EXPLORER_BUTTON_UX_STATE.intervalId);
        }

        NV_EXPLORER_BUTTON_UX_STATE.intervalId =
            setInterval(NVBU_mettreAJourBoutonExplorer, 500);
    }

    function NVBU_installer() {
        if (!NVBU_hasGame()) {
            setTimeout(NVBU_installer, 120);
            return;
        }

        NVBU_injecterStyle();
        NVBU_patchOuvrirExploration();
        NVBU_patchVisiterZoneActuelle();
        NVBU_demarrerInterval();

        setTimeout(NVBU_mettreAJourBoutonExplorer, 0);

        console.log(`✅ Explorer_Button_UX.js chargé — ${NV_EXPLORER_BUTTON_UX_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVBU_installer);
    } else {
        NVBU_installer();
    }

    window.NV_EXPLORER_BUTTON_UX_VERSION =
        NV_EXPLORER_BUTTON_UX_VERSION;

    window.NVBU_mettreAJourBoutonExplorer =
        NVBU_mettreAJourBoutonExplorer;
})();
