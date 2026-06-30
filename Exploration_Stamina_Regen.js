(function () {
    "use strict";

    const NV_STAMINA_REGEN_VERSION =
        "v0.9.5.5-no-animation-reset";

    const NV_STAMINA_REGEN_CONFIG = {
        explorationCostByType: {
            village: 6,
            ville: 6,
            exploration: 10,
            donjon: 14,
            defaut: 10
        },

        /*
            Objectif : même depuis 0, les barres doivent revenir très vite.
            La base est calculée sur max / 300 secondes = plein en 5 minutes maximum.
            Les stats ajoutent un bonus :
            - VIT pour PV
            - INT pour mana
            - DEX pour stamina
        */
        fullRegenSeconds: 300,
        statDivider: 8,
        tickMs: 1000
    };

    const NV_STAMINA_REGEN_STATE = {
        intervalId: null,
        dernierCoutExploration: 0,
        dernierTick: null
    };

    function NVS_hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function NVS_journal(message) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal(message);
        }
    }

    function NVS_estEnCombat() {
        return Boolean(Game?.combat?.actif) || Game?.ui?.vueActive === "combat";
    }

    function NVS_stat(nomStat) {
        if (typeof statTotale === "function") {
            return Number(statTotale(nomStat) || 0);
        }

        return Number(Game.data.personnage?.[nomStat] || 0);
    }

    function NVS_pvMax() {
        if (typeof pvMaxTotal === "function") return Math.max(1, Number(pvMaxTotal() || 1));
        return Math.max(1, Number(Game.data.personnage.pvMax || Game.data.personnage.pv || 100));
    }

    function NVS_manaMax() {
        if (typeof manaMaxTotal === "function") return Math.max(1, Number(manaMaxTotal() || 1));
        return Math.max(1, Number(Game.data.personnage.manaMax || Game.data.personnage.mana || 50));
    }

    function NVS_staminaMax() {
        if (typeof staminaMaxTotal === "function") return Math.max(1, Number(staminaMaxTotal() || 1));
        return Math.max(1, Number(Game.data.personnage.staminaMax || Game.data.personnage.stamina || 100));
    }

    function NVS_clamp(valeur, min, max) {
        return Math.max(min, Math.min(max, valeur));
    }

    function NVS_calculerPourcentageLocal(valeur, maximum) {
        if (typeof calculerPourcentage === "function") {
            return calculerPourcentage(valeur, maximum);
        }

        if (!Number.isFinite(maximum) || maximum <= 0) return 0;
        return Math.min(100, Math.max(0, (valeur / maximum) * 100));
    }

    function NVS_assurerRessources() {
        const personnage =
            Game.data.personnage;

        personnage.pv =
            NVS_clamp(Number(personnage.pv ?? NVS_pvMax()), 0, NVS_pvMax());

        personnage.mana =
            NVS_clamp(Number(personnage.mana ?? NVS_manaMax()), 0, NVS_manaMax());

        personnage.stamina =
            NVS_clamp(Number(personnage.stamina ?? NVS_staminaMax()), 0, NVS_staminaMax());
    }

    function NVS_coutExploration(zone) {
        const cout =
            NV_STAMINA_REGEN_CONFIG.explorationCostByType[zone?.type] ??
            NV_STAMINA_REGEN_CONFIG.explorationCostByType.defaut;

        return Math.max(1, Math.round(cout));
    }

    function NVS_regenParSeconde() {
        const fullSeconds =
            Math.max(1, Number(NV_STAMINA_REGEN_CONFIG.fullRegenSeconds || 300));

        const statDivider =
            Math.max(1, Number(NV_STAMINA_REGEN_CONFIG.statDivider || 8));

        const pvMax =
            NVS_pvMax();

        const manaMax =
            NVS_manaMax();

        const staminaMax =
            NVS_staminaMax();

        return {
            pv: Math.max(1, Math.ceil((pvMax / fullSeconds) + (NVS_stat("vitalite") / statDivider))),
            mana: Math.max(1, Math.ceil((manaMax / fullSeconds) + (NVS_stat("intelligence") / statDivider))),
            stamina: Math.max(1, Math.ceil((staminaMax / fullSeconds) + (NVS_stat("dexterite") / statDivider)))
        };
    }

    function NVS_regenererHorsCombatSecondes(secondes = 1) {
        if (!NVS_hasGame()) return false;
        if (NVS_estEnCombat()) return false;

        NVS_assurerRessources();

        const personnage =
            Game.data.personnage;

        const regen =
            NVS_regenParSeconde();

        const avant =
            {
                pv: Number(personnage.pv || 0),
                mana: Number(personnage.mana || 0),
                stamina: Number(personnage.stamina || 0)
            };

        personnage.pv =
            Math.min(NVS_pvMax(), avant.pv + regen.pv * secondes);

        personnage.mana =
            Math.min(NVS_manaMax(), avant.mana + regen.mana * secondes);

        personnage.stamina =
            Math.min(NVS_staminaMax(), avant.stamina + regen.stamina * secondes);

        const aChange =
            personnage.pv !== avant.pv ||
            personnage.mana !== avant.mana ||
            personnage.stamina !== avant.stamina;

        if (aChange) {
            NV_STAMINA_REGEN_STATE.dernierTick =
                {
                    pv: personnage.pv - avant.pv,
                    mana: personnage.mana - avant.mana,
                    stamina: personnage.stamina - avant.stamina
                };
        }

        return aChange;
    }

    function NVS_tickRegen() {
        NVS_regenererHorsCombatSecondes(1);

        /*
            Ne surtout pas rappeler afficherPersonnage() ici :
            ça reconstruit les barres et reset l'animation de balayage.
            On met seulement à jour les valeurs existantes.
        */
        NVS_majBarresRessourcesSansReset();
    }

    function NVS_demarrerRegenTempsReel() {
        if (NV_STAMINA_REGEN_STATE.intervalId) {
            clearInterval(NV_STAMINA_REGEN_STATE.intervalId);
        }

        NV_STAMINA_REGEN_STATE.intervalId =
            setInterval(NVS_tickRegen, NV_STAMINA_REGEN_CONFIG.tickMs);
    }

    function NVS_peutExplorer(zone) {
        NVS_assurerRessources();

        const cout =
            NVS_coutExploration(zone);

        const stamina =
            Number(Game.data.personnage.stamina || 0);

        return stamina >= cout;
    }

    function NVS_consumerStaminaExploration(zone) {
        const cout =
            NVS_coutExploration(zone);

        const personnage =
            Game.data.personnage;

        personnage.stamina =
            Math.max(0, Number(personnage.stamina || 0) - cout);

        NV_STAMINA_REGEN_STATE.dernierCoutExploration =
            cout;

        return cout;
    }

    function NVS_patchVisiterZoneActuelle() {
        if (typeof visiterZoneActuelle !== "function" || visiterZoneActuelle.__NVS_0952_PATCH) return;

        const original =
            visiterZoneActuelle;

        visiterZoneActuelle = function () {
            const zone =
                typeof obtenirZoneActuelle === "function"
                    ? obtenirZoneActuelle()
                    : null;

            if (!zone) {
                return original();
            }

            const cout =
                NVS_coutExploration(zone);

            if (!NVS_peutExplorer(zone)) {
                NVS_journal(`🟢 Tu es trop épuisé pour explorer ${zone.nom}. Stamina nécessaire : ${cout}.`);

                if (typeof afficherPersonnage === "function") {
                    afficherPersonnage();
                }

                return;
            }

            NVS_consumerStaminaExploration(zone);

            NVS_majBarresRessourcesSansReset();

            return original();
        };

        visiterZoneActuelle.__NVS_0952_PATCH =
            true;
    }

    function NVS_creerLabelRegen(type, valeur) {
        const span =
            document.createElement("span");

        span.className =
            `nvs-regen-label nvs-regen-${type}`;

        span.textContent =
            NVS_estEnCombat()
                ? "regen off"
                : `+${valeur}/sec`;

        if (NVS_estEnCombat()) {
            span.classList.add("nvs-regen-off");
        }

        return span;
    }

    function NVS_trouverBarresRessources() {
        const conteneur =
            document.getElementById("personnage");

        if (!conteneur) return [];

        return [
            {
                selecteur: ".barre-pv",
                type: "pv",
                libelle: "PV",
                valeur: Number(Game.data.personnage.pv || 0),
                max: NVS_pvMax()
            },
            {
                selecteur: ".barre-mana",
                type: "mana",
                libelle: "Mana",
                valeur: Number(Game.data.personnage.mana || 0),
                max: NVS_manaMax()
            },
            {
                selecteur: ".barre-stamina",
                type: "stamina",
                libelle: "Stamina",
                valeur: Number(Game.data.personnage.stamina || 0),
                max: NVS_staminaMax()
            }
        ].map(item => {
            const remplissage =
                conteneur.querySelector(item.selecteur);

            const barre =
                remplissage?.closest(".barre") || null;

            const texte =
                barre?.querySelector(".barre__texte") || null;

            const valeurDOM =
                barre?.querySelector(".barre__valeur") || null;

            return {
                ...item,
                remplissage,
                barre,
                texte,
                valeurDOM
            };
        }).filter(item => item.remplissage && item.barre && item.texte);
    }

    function NVS_majBarresRessourcesSansReset() {
        if (!NVS_hasGame()) return false;

        const regen =
            NVS_regenParSeconde();

        const barres =
            NVS_trouverBarresRessources();

        if (!barres.length) return false;

        barres.forEach(item => {
            const pourcentage =
                NVS_calculerPourcentageLocal(item.valeur, item.max);

            /*
                IMPORTANT :
                On modifie uniquement la largeur et le texte.
                On ne remplace pas le HTML de la barre.
                Donc l'animation CSS ::after ne repart plus de zéro.
            */
            item.remplissage.style.width =
                `${pourcentage}%`;

            if (item.valeurDOM) {
                item.valeurDOM.textContent =
                    `${Math.round(item.valeur)} / ${item.max} (${Math.round(pourcentage)}%)`;
            }

            item.barre.classList.add("nvs-barre-avec-regen");

            let label =
                item.texte.querySelector(`.nvs-regen-label.nvs-regen-${item.type}`);

            if (!label) {
                label =
                    NVS_creerLabelRegen(item.type, regen[item.type]);

                if (item.valeurDOM) {
                    item.valeurDOM.insertAdjacentElement("afterend", label);
                } else {
                    item.texte.appendChild(label);
                }
            }

            label.textContent =
                NVS_estEnCombat()
                    ? "regen off"
                    : `+${regen[item.type]}/sec`;

            label.classList.toggle("nvs-regen-off", NVS_estEnCombat());
        });

        return true;
    }

    function NVS_injecterLabelsRegenDOM() {
        if (!NVS_hasGame()) return;

        const aMisAJourBarres =
            NVS_majBarresRessourcesSansReset();

        if (aMisAJourBarres) return;

        /*
            Fallback ancien affichage :
            Si un jour le panneau revient en <p>PV : ...</p>,
            on garde quand même l'injection.
        */
        const conteneur =
            document.getElementById("personnage");

        if (!conteneur) return;

        const regen =
            NVS_regenParSeconde();

        const lignes =
            Array.from(conteneur.querySelectorAll("p"));

        const config = [
            {
                test: texte => /^PV\s*:/i.test(texte),
                type: "pv",
                valeur: regen.pv
            },
            {
                test: texte => /^Mana\s*:/i.test(texte),
                type: "mana",
                valeur: regen.mana
            },
            {
                test: texte => /^Stamina\s*:/i.test(texte),
                type: "stamina",
                valeur: regen.stamina
            }
        ];

        config.forEach(item => {
            const ligne =
                lignes.find(p => item.test((p.textContent || "").trim()));

            if (!ligne) return;

            ligne.classList.add("nvs-resource-line");

            let label =
                ligne.querySelector(`.nvs-regen-label.nvs-regen-${item.type}`);

            if (!label) {
                label =
                    NVS_creerLabelRegen(item.type, item.valeur);

                ligne.appendChild(label);
            }

            label.textContent =
                NVS_estEnCombat()
                    ? "regen off"
                    : `+${item.valeur}/sec`;

            label.classList.toggle("nvs-regen-off", NVS_estEnCombat());
        });
    }

    function NVS_patchAfficherPersonnageLabels() {
        if (typeof afficherPersonnage !== "function" || afficherPersonnage.__NVS_0953_LABEL_PATCH) return;

        const original =
            afficherPersonnage;

        afficherPersonnage = function () {
            const resultat =
                original();

            NVS_injecterLabelsRegenDOM();

            return resultat;
        };

        afficherPersonnage.__NVS_0953_LABEL_PATCH =
            true;
    }

    function NVS_patchAffichageRessources() {
        if (typeof creerAffichageRessources !== "function" || creerAffichageRessources.__NVS_0952_PATCH) return;

        creerAffichageRessources = function () {
            const personnage =
                Game.data.personnage;

            NVS_assurerRessources();

            const pvMaximum =
                NVS_pvMax();

            const manaMaximum =
                NVS_manaMax();

            const staminaMaximum =
                NVS_staminaMax();

            const xpMaximum =
                typeof xpNiveauSuivant === "function"
                    ? xpNiveauSuivant()
                    : 1;

            const pourcentagePV =
                NVS_calculerPourcentageLocal(personnage.pv, pvMaximum);

            const pourcentageMana =
                NVS_calculerPourcentageLocal(personnage.mana, manaMaximum);

            const pourcentageStamina =
                NVS_calculerPourcentageLocal(personnage.stamina ?? staminaMaximum, staminaMaximum);

            const pourcentageXP =
                NVS_calculerPourcentageLocal(personnage.xp, xpMaximum);

            const regen =
                NVS_regenParSeconde();

            const suffixe =
                NVS_estEnCombat()
                    ? `<span class="nvs-regen-label nvs-regen-off">regen off</span>`
                    : "";

            const labelPV =
                NVS_estEnCombat()
                    ? suffixe
                    : `<span class="nvs-regen-label">+${regen.pv}/sec</span>`;

            const labelMana =
                NVS_estEnCombat()
                    ? suffixe
                    : `<span class="nvs-regen-label">+${regen.mana}/sec</span>`;

            const labelStamina =
                NVS_estEnCombat()
                    ? suffixe
                    : `<span class="nvs-regen-label">+${regen.stamina}/sec</span>`;

            return `
                <p class="nvs-resource-line">
                    <span>PV : ${Math.round(personnage.pv)} / ${pvMaximum}</span>
                    ${labelPV}
                </p>
                ${creerBarreRessource("barre-pv", pourcentagePV)}

                <p class="nvs-resource-line">
                    <span>Mana : ${Math.round(personnage.mana)} / ${manaMaximum}</span>
                    ${labelMana}
                </p>
                ${creerBarreRessource("barre-mana", pourcentageMana)}

                <p class="nvs-resource-line">
                    <span>Stamina : ${Math.round(personnage.stamina ?? staminaMaximum)} / ${staminaMaximum}</span>
                    ${labelStamina}
                </p>
                ${creerBarreRessource("barre-stamina", pourcentageStamina)}

                <p>Niveau : ${personnage.niveau}</p>
                <p>XP : ${personnage.xp} / ${xpMaximum}</p>
                ${creerBarreRessource("barre-xp", pourcentageXP)}
                <p>🟡 Or : ${personnage.or ?? 0}</p>
            `;
        };

        creerAffichageRessources.__NVS_0952_PATCH =
            true;
    }

    function NVS_patchOuvrirExplorationSansCarteBas() {
        if (typeof ouvrirExploration !== "function" || ouvrirExploration.__NVS_0952_REMOVE_CARD_PATCH) return;

        const original =
            ouvrirExploration;

        ouvrirExploration = function () {
            const resultat =
                original();

            /*
                Nettoyage des anciennes cartes ajoutées par v0.9.5.1
                ou par des essais précédents.
            */
            document.getElementById("nvsStaminaRegenCard")?.remove();

            return resultat;
        };

        ouvrirExploration.__NVS_0952_REMOVE_CARD_PATCH =
            true;
    }

    function NVS_injecterStyle() {
        if (document.getElementById("nvsStaminaRegenStyleV0952")) return;

        const style =
            document.createElement("style");

        style.id =
            "nvsStaminaRegenStyleV0952";

        style.textContent =
            `
                .nvs-resource-line {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }

                .nvs-barre-avec-regen .barre__texte {
                    justify-content: flex-start;
                    gap: 8px;
                }

                .nvs-barre-avec-regen .barre__libelle {
                    flex: 0 0 auto;
                }

                .nvs-barre-avec-regen .barre__valeur {
                    margin-left: auto;
                    flex: 0 0 auto;
                }

                .nvs-regen-label {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    min-width: 48px;
                    padding: 2px 7px;
                    border-radius: 999px;
                    background: rgba(80, 220, 130, 0.18);
                    border: 1px solid rgba(80, 220, 130, 0.34);
                    color: #9dffb8;
                    font-size: 0.68rem;
                    font-weight: 800;
                    white-space: nowrap;
                    line-height: 1;
                    text-shadow:
                        0 1px 2px rgba(0, 0, 0, 0.95),
                        0 0 5px rgba(0, 0, 0, 0.75);
                    box-shadow:
                        0 0 8px rgba(80, 220, 130, 0.10),
                        inset 0 0 0 1px rgba(255,255,255,0.055);
                }

                .barre__texte .nvs-regen-label {
                    margin-left: 0;
                }

                .nvs-regen-pv {
                    background: rgba(255, 100, 100, 0.18);
                    border-color: rgba(255, 100, 100, 0.34);
                    color: #ffc0c0;
                }

                .nvs-regen-mana {
                    background: rgba(95, 165, 255, 0.18);
                    border-color: rgba(95, 165, 255, 0.34);
                    color: #b9dcff;
                }

                .nvs-regen-stamina {
                    background: rgba(80, 220, 130, 0.18);
                    border-color: rgba(80, 220, 130, 0.34);
                    color: #9dffb8;
                }

                .nvs-regen-off {
                    background: rgba(220, 80, 80, 0.14);
                    border-color: rgba(220, 80, 80, 0.28);
                    color: #ff9b9b;
                    min-width: 58px;
                }
            `;

        document.head.appendChild(style);
    }

    function NVS_installer() {
        if (!NVS_hasGame()) {
            setTimeout(NVS_installer, 120);
            return;
        }

        NVS_injecterStyle();
        NVS_assurerRessources();
        NVS_patchVisiterZoneActuelle();
        NVS_patchAffichageRessources();
        NVS_patchAfficherPersonnageLabels();
        NVS_patchOuvrirExplorationSansCarteBas();
        NVS_demarrerRegenTempsReel();

        if (typeof afficherPersonnage === "function") {
            afficherPersonnage();
        }

        NVS_injecterLabelsRegenDOM();

        console.log(`✅ Exploration_Stamina_Regen.js chargé — ${NV_STAMINA_REGEN_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVS_installer);
    } else {
        NVS_installer();
    }

    window.NV_STAMINA_REGEN_VERSION =
        NV_STAMINA_REGEN_VERSION;

    window.NV_STAMINA_REGEN_CONFIG =
        NV_STAMINA_REGEN_CONFIG;

    window.NV_STAMINA_REGEN_STATE =
        NV_STAMINA_REGEN_STATE;

    window.NVS_regenererHorsCombatSecondes =
        NVS_regenererHorsCombatSecondes;

    window.NVS_regenParSeconde =
        NVS_regenParSeconde;
})();
