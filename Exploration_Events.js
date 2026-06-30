(function () {
    "use strict";

    const NV_EXPLORATION_EVENTS_VERSION =
        "v0.9.5-auto-events-no-emoji";

    const NV_EXPLORATION_STATE = {
        dernierEvenement: null,
        compteurExploration: 0
    };

    const NV_TEXTES_AMBIANCE_ZONE = {
        auberge_griffon: [
            "L'odeur du bois ciré et des plats chauds flotte dans l'air.",
            "Quelques aventuriers murmurent autour des tables.",
            "Le feu de l'âtre crépite doucement."
        ],
        place_marche: [
            "La foule se presse entre les étals du marché.",
            "Des marchands vantent leurs marchandises à pleine voix.",
            "Les pavés résonnent sous les pas des voyageurs."
        ],
        foret_brumes: [
            "La brume glisse entre les arbres tordus.",
            "Des branches craquent quelque part dans l'ombre.",
            "L'humidité s'accroche à tes vêtements."
        ],
        catacombes_oubliees: [
            "L'air devient froid entre les murs de pierre.",
            "Un écho lointain résonne dans les galeries.",
            "Des ossements craquent sous tes pas."
        ],
        tour_mage: [
            "Des particules bleutées flottent dans l'air.",
            "Les pierres de la tour vibrent d'une magie ancienne.",
            "Des murmures arcaniques semblent venir des murs."
        ],
        lac_cristallin: [
            "La surface du lac reflète une lumière étrange.",
            "Des vaguelettes claires viennent mourir sur les pierres.",
            "Une fraîcheur surnaturelle entoure les berges."
        ],
        sanctuaire_arcanique: [
            "Des runes faibles brillent encore sur les dalles.",
            "Le silence du sanctuaire semble presque vivant.",
            "L'air tremble autour des autels anciens."
        ],
        ruines_anciennes: [
            "Des colonnes brisées se dressent dans la poussière.",
            "Chaque pierre semble porter le poids d'un âge oublié.",
            "Le vent s'engouffre entre les arches effondrées."
        ],
        avant_poste_ouest: [
            "Des gardes observent l'horizon depuis les palissades.",
            "Le bois des barricades grince sous le vent.",
            "Un calme prudent règne sur l'avant-poste."
        ],
        grotte_reliques: [
            "Des gouttes d'eau tombent lentement dans l'obscurité.",
            "Une faible lueur se reflète sur les parois humides.",
            "L'écho de tes pas se perd dans la grotte."
        ],
        sanctuaire_prelude: [
            "Une paix étrange règne entre les colonnes du sanctuaire.",
            "Des rubans votifs flottent dans le vent.",
            "Les pierres tièdes semblent garder une ancienne bénédiction."
        ]
    };

    const NV_TEXTES_AMBIANCE_TYPE = {
        village: [
            "La vie locale continue autour de toi.",
            "Tu prends le temps d'observer les environs.",
            "Quelques passants te dévisagent brièvement."
        ],
        ville: [
            "Les rues sont animées et pleines de mouvement.",
            "Tu avances parmi les conversations et les cris marchands.",
            "La ville révèle peu à peu ses habitudes."
        ],
        exploration: [
            "Tu progresses avec prudence dans la zone.",
            "Le terrain change à chaque pas.",
            "Tu explores les alentours en restant sur tes gardes."
        ],
        donjon: [
            "L'obscurité semble plus dense ici.",
            "Chaque couloir peut cacher un danger.",
            "Tu avances lentement entre les murs froids."
        ]
    };

    const NV_PROFILS_EVENEMENTS = {
        village: {
            or: 22,
            rumeur: 18,
            ressource: 10,
            repos: 8,
            rencontre: 12,
            rien_ambiance: 30
        },
        ville: {
            or: 24,
            rumeur: 20,
            ressource: 8,
            repos: 8,
            rencontre: 14,
            rien_ambiance: 26
        },
        exploration: {
            combat: 38,
            ressource: 17,
            coffre: 9,
            piege: 8,
            indice: 10,
            rien_ambiance: 18
        },
        donjon: {
            combat: 54,
            coffre: 14,
            piege: 13,
            indice: 8,
            ressource: 4,
            rien_ambiance: 7
        },
        defaut: {
            combat: 30,
            coffre: 8,
            or: 10,
            ressource: 10,
            indice: 9,
            piege: 6,
            rien_ambiance: 27
        }
    };

    const NV_MESSAGES_RESULTAT = {
        rumeur: [
            "Tu entends une rumeur sur une route dangereuse.",
            "Une conversation attire ton attention quelques instants.",
            "Un voyageur raconte avoir vu des lumières étranges au loin.",
            "Quelques mots murmurés parlent d'un danger qui approche."
        ],
        rencontre: [
            "Tu croises un voyageur pressé qui disparaît rapidement.",
            "Une silhouette inconnue t'observe avant de s'éloigner.",
            "Un habitant du coin te salue brièvement.",
            "Tu remarques une personne louche qui évite ton regard."
        ],
        indice: [
            "Tu remarques des traces qui semblent mener plus loin.",
            "Un détail étrange attire ton attention.",
            "Tu découvres un signe gravé presque effacé.",
            "Quelque chose ici semble lié à une histoire oubliée."
        ],
        rien_ambiance: [
            "Rien de particulier ne se produit.",
            "Tu poursuis ton exploration sans découverte notable.",
            "La zone reste calme pour l'instant.",
            "Tu ne trouves rien d'utile cette fois."
        ]
    };

    function NVX_hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function NVX_randInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function NVX_choisir(tableau) {
        if (!Array.isArray(tableau) || !tableau.length) return "";
        return tableau[Math.floor(Math.random() * tableau.length)];
    }

    function NVX_choisirPondere(poids) {
        const entrees =
            Object.entries(poids || {})
                .filter(([, valeur]) => Number(valeur) > 0);

        if (!entrees.length) return "rien_ambiance";

        const total =
            entrees.reduce((somme, [, valeur]) => somme + Number(valeur), 0);

        let tirage =
            Math.random() * total;

        for (const [id, valeur] of entrees) {
            tirage -= Number(valeur);
            if (tirage <= 0) return id;
        }

        return entrees[entrees.length - 1][0];
    }

    function NVX_zoneActuelle() {
        if (typeof obtenirZoneActuelle === "function") {
            return obtenirZoneActuelle();
        }

        const idZone =
            Game.data?.personnage?.zoneActuelle;

        return Game.cache?.zonesParId?.[idZone] || null;
    }

    function NVX_nomObjet(idObjet) {
        const objet =
            typeof trouverObjet === "function"
                ? trouverObjet(idObjet)
                : Game.cache?.objetsParId?.[idObjet];

        return objet?.nom || idObjet;
    }

    function NVX_ajouterObjet(idObjet, quantite = 1) {
        if (!idObjet || quantite <= 0) return;

        if (typeof ajouterObjetInventaire === "function") {
            ajouterObjetInventaire(idObjet, quantite);
            return;
        }

        const inventaire =
            Game.data.personnage.inventaire ??= [];

        const item =
            inventaire.find(entree => entree.id === idObjet);

        if (item) {
            item.quantite =
                Number(item.quantite || 0) + quantite;
        } else {
            inventaire.push({
                id: idObjet,
                quantite
            });
        }
    }

    function NVX_ambianceZone(zone) {
        return NVX_choisir(
            NV_TEXTES_AMBIANCE_ZONE[zone?.id] ||
            NV_TEXTES_AMBIANCE_TYPE[zone?.type] ||
            NV_TEXTES_AMBIANCE_TYPE.exploration
        );
    }

    function NVX_profilZone(zone) {
        const profil =
            NV_PROFILS_EVENEMENTS[zone?.type] ||
            NV_PROFILS_EVENEMENTS.defaut;

        const base =
            { ...profil };

        /*
            On garde les poids JSON existants comme direction principale,
            puis on ajoute des nouveaux événements autour.
        */
        Object.entries(zone?.evenements || {}).forEach(([id, valeur]) => {
            base[id] =
                Math.max(Number(base[id] || 0), Number(valeur || 0));
        });

        return base;
    }

    function NVX_journal(message) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal(message);
        }
    }

    function NVX_evenementRessource(zone) {
        let idObjet =
            "paquet_herbes";

        if (zone?.type === "donjon") {
            idObjet =
                Math.random() < 0.65
                    ? "potion_soin"
                    : "cristal_perdu";
        } else if (zone?.id === "grotte_reliques" || zone?.id === "sanctuaire_arcanique") {
            idObjet =
                Math.random() < 0.55
                    ? "cristal_perdu"
                    : "potion_soin";
        } else if (zone?.type === "village" || zone?.type === "ville") {
            idObjet =
                Math.random() < 0.60
                    ? "potion_soin"
                    : "paquet_herbes";
        }

        const quantite =
            idObjet === "potion_soin"
                ? 1
                : NVX_randInt(1, 2);

        NVX_ajouterObjet(idObjet, quantite);

        NVX_journal(`Ressource : tu récupères ${NVX_nomObjet(idObjet)} x${quantite}.`);
    }

    function NVX_evenementPiege(zone) {
        const personnage =
            Game.data.personnage;

        const pvMax =
            typeof pvMaxTotal === "function"
                ? pvMaxTotal()
                : Math.max(1, Number(personnage.pvMax || personnage.pv || 100));

        const degats =
            Math.max(1, Math.round(pvMax * (0.04 + Math.random() * 0.05)));

        personnage.pv =
            Math.max(1, Number(personnage.pv || pvMax) - degats);

        const messages = [
            `Piège : une dalle cède sous tes pas. Tu perds ${degats} PV.`,
            `Piège : un piège rudimentaire se déclenche. Tu perds ${degats} PV.`,
            `Piège : le terrain se dérobe brièvement. Tu perds ${degats} PV.`
        ];

        NVX_journal(NVX_choisir(messages));
    }

    function NVX_evenementRepos(zone) {
        const personnage =
            Game.data.personnage;

        const pvMax =
            typeof pvMaxTotal === "function"
                ? pvMaxTotal()
                : Number(personnage.pvMax || personnage.pv || 100);

        const manaMax =
            typeof manaMaxTotal === "function"
                ? manaMaxTotal()
                : Number(personnage.manaMax || personnage.mana || 50);

        const staminaMax =
            typeof staminaMaxTotal === "function"
                ? staminaMaxTotal()
                : Number(personnage.staminaMax || personnage.stamina || 100);

        const soin =
            Math.max(2, Math.round(pvMax * 0.08));

        personnage.pv =
            Math.min(pvMax, Number(personnage.pv || 0) + soin);

        personnage.mana =
            Math.min(manaMax, Number(personnage.mana || 0) + Math.round(manaMax * 0.06));

        personnage.stamina =
            Math.min(staminaMax, Number(personnage.stamina || 0) + Math.round(staminaMax * 0.08));

        NVX_journal(`Repos : tu trouves un moment de répit. PV +${soin}.`);
    }

    function NVX_evenementOr(zone) {
        const personnage =
            Game.data.personnage;

        const gain =
            NVX_randInt(2, 9) + Math.floor(Number(personnage.niveau || 1) / 2);

        personnage.or =
            Number(personnage.or || 0) + gain;

        const messages = [
            `Or : tu trouves ${gain} pièce(s) d'or.`,
            `Or : tu récupères ${gain} pièce(s) oubliée(s).`,
            `Or : une petite bourse contient ${gain} pièce(s) d'or.`
        ];

        NVX_journal(NVX_choisir(messages));
    }

    function NVX_evenementRumeur(zone) {
        NVX_journal(`Rumeur : ${NVX_choisir(NV_MESSAGES_RESULTAT.rumeur)}`);
    }

    function NVX_evenementRencontre(zone) {
        NVX_journal(`Rencontre : ${NVX_choisir(NV_MESSAGES_RESULTAT.rencontre)}`);
    }

    function NVX_evenementIndice(zone) {
        NVX_journal(`Indice : ${NVX_choisir(NV_MESSAGES_RESULTAT.indice)}`);
    }

    function NVX_evenementRien(zone) {
        NVX_journal(`Exploration : ${NVX_choisir(NV_MESSAGES_RESULTAT.rien_ambiance)}`);
    }

    function NVX_afficherAmbianceAvantEvenement(zone, evenement) {
        const ambiance =
            NVX_ambianceZone(zone);

        if (!ambiance) return;

        NVX_journal(`Zone : ${zone?.nom || "Zone inconnue"} - ${ambiance}`);
    }

    function NVX_patchGenererEvenementZone() {
        if (typeof genererEvenementZone !== "function" || genererEvenementZone.__NVX_095_PATCH) return;

        const original =
            genererEvenementZone;

        genererEvenementZone = function (zone) {
            if (!zone) {
                return original(zone);
            }

            const profil =
                NVX_profilZone(zone);

            return NVX_choisirPondere(profil);
        };

        genererEvenementZone.__NVX_095_PATCH =
            true;
    }

    function NVX_patchExecuterEvenementZone() {
        if (typeof executerEvenementZone !== "function" || executerEvenementZone.__NVX_095_PATCH) return;

        const original =
            executerEvenementZone;

        executerEvenementZone = function (evenement, zone) {
            NV_EXPLORATION_STATE.dernierEvenement =
                evenement;

            NVX_afficherAmbianceAvantEvenement(zone, evenement);

            switch (evenement) {
                case "ressource":
                    NVX_evenementRessource(zone);
                    break;

                case "piege":
                case "piège":
                    NVX_evenementPiege(zone);
                    break;

                case "repos":
                case "campement":
                    NVX_evenementRepos(zone);
                    break;

                case "rumeur":
                    NVX_evenementRumeur(zone);
                    break;

                case "rencontre":
                    NVX_evenementRencontre(zone);
                    break;

                case "indice":
                    NVX_evenementIndice(zone);
                    break;

                case "rien_ambiance":
                    NVX_evenementRien(zone);
                    break;

                case "or":
                    NVX_evenementOr(zone);
                    break;

                default:
                    original(evenement, zone);
                    break;
            }

            if (typeof afficherPersonnage === "function") {
                afficherPersonnage();
            }

            if (typeof NV_demanderAutosave === "function") {
                NV_demanderAutosave("exploration event");
            }
        };

        executerEvenementZone.__NVX_095_PATCH =
            true;
    }

    function NVX_patchVisiterZoneActuelle() {
        if (typeof visiterZoneActuelle !== "function" || visiterZoneActuelle.__NVX_095_PATCH) return;

        const original =
            visiterZoneActuelle;

        visiterZoneActuelle = function () {
            NV_EXPLORATION_STATE.compteurExploration++;

            return original();
        };

        visiterZoneActuelle.__NVX_095_PATCH =
            true;
    }

    function NVX_patchExplorationCard() {
        if (typeof ouvrirExploration !== "function" || ouvrirExploration.__NVX_095_CARD_PATCH) return;

        const original =
            ouvrirExploration;

        ouvrirExploration = function () {
            original();

            const conteneur =
                document.getElementById("vuePrincipale");

            if (!conteneur || document.getElementById("nvxExplorationAutoCard")) return;

            const zone =
                NVX_zoneActuelle();

            const carte =
                document.createElement("div");

            carte.id =
                "nvxExplorationAutoCard";

            carte.className =
                "item-card nvx-exploration-card";

            carte.innerHTML =
                `
                    <h3>Exploration automatique</h3>
                    <p>
                        Bouton Explorer conservé : les événements sont tirés automatiquement.
                    </p>
                    <p class="nvx-exploration-mini">
                        Zone : <strong>${zone?.nom || "Inconnue"}</strong>
                        ${NV_EXPLORATION_STATE.dernierEvenement ? ` - Dernier événement : <strong>${NV_EXPLORATION_STATE.dernierEvenement}</strong>` : ""}
                    </p>
                `;

            conteneur.appendChild(carte);
        };

        ouvrirExploration.__NVX_095_CARD_PATCH =
            true;
    }

    function NVX_injecterStyle() {
        if (document.getElementById("nvxExplorationEventsStyle")) return;

        const style =
            document.createElement("style");

        style.id =
            "nvxExplorationEventsStyle";

        style.textContent =
            `
                .nvx-exploration-card {
                    border-color: rgba(245, 211, 122, 0.16);
                    background:
                        radial-gradient(circle at top right, rgba(245, 211, 122, 0.055), transparent 45%),
                        rgba(255,255,255,0.035);
                }

                .nvx-exploration-card h3 {
                    margin-top: 0;
                    color: var(--gold, #f5d37a);
                }

                .nvx-exploration-mini {
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.88rem;
                    margin-bottom: 0;
                }
            `;

        document.head.appendChild(style);
    }

    function NVX_installer() {
        if (!NVX_hasGame()) {
            setTimeout(NVX_installer, 120);
            return;
        }

        NVX_injecterStyle();
        NVX_patchGenererEvenementZone();
        NVX_patchExecuterEvenementZone();
        NVX_patchVisiterZoneActuelle();
        NVX_patchExplorationCard();

        console.log(`Exploration_Events.js chargé — ${NV_EXPLORATION_EVENTS_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVX_installer);
    } else {
        NVX_installer();
    }

    window.NVX_EXPLORATION_EVENTS_VERSION =
        NV_EXPLORATION_EVENTS_VERSION;

    window.NVX_EXPLORATION_STATE =
        NV_EXPLORATION_STATE;

    window.NVX_ambianceZone =
        NVX_ambianceZone;
})();
