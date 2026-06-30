/* ============================================================================
   NIGHTVENTURE — PROFILS JOUEUR / CLASSES / ÉQUIPEMENTS v0.8.8
   --------------------------------------------------------------------------
   Module additionnel chargé après :
   - script.js
   - Combats.js
   - Equipements_Proceduraux.js
   - Monstres_Proceduraux.js

   Objectif :
   - ajouter des profils joueur équipés procéduralement au simulateur ;
   - permettre de visualiser les profils générés ;
   - afficher stats de base, bonus équipement, stats finales ;
   - ne pas modifier l'inventaire réel ;
   - ne pas modifier la sauvegarde ;
   - ne pas modifier les loots réels.
   ============================================================================ */

(function () {
    "use strict";

    if (!window.Game) {
        window.Game = {};
    }

    Game.profilsEquipementSimulation = Game.profilsEquipementSimulation || {
        dernierProfil: null,
        dernierSet: [],
        dernierSnapshot: null,
        derniersDetails: null,
        snapshotsParProfil: {}
    };

    Game.profilsEquipementSimulation.snapshotsParProfil =
        Game.profilsEquipementSimulation.snapshotsParProfil || {};

    const PEQ_VERSION = "v0.9.3.3-midgame-smoothing";

    const PEQ_CLASSES = {
        aventurier: {
            id: "aventurier",
            nom: "Aventurier",
            icone: "🧍",
            description: "Profil équilibré sans spécialisation forte.",
            base: { force: 4, dexterite: 4, intelligence: 4, vitalite: 4, chance: 4 },
            poids: { force: 1.00, dexterite: 1.00, intelligence: 1.00, vitalite: 1.00, chance: 0.75 },
            bonusCombat: { pvMax: 0, manaMax: 0, staminaMax: 0, attaquePhysique: 0, attaqueMagique: 0, defensePhysique: 0, defenseMagique: 0, critique: 0, esquive: 0, vitesse: 0 }
        },

        guerrier: {
            id: "guerrier",
            nom: "Guerrier",
            icone: "⚔️",
            description: "FOR/VIT. Solide, physique, fiable. Peu magique.",
            base: { force: 6, dexterite: 3, intelligence: 2, vitalite: 5, chance: 3 },
            poids: { force: 1.35, dexterite: 0.70, intelligence: 0.35, vitalite: 1.20, chance: 0.55 },
            bonusCombat: { pvMax: 8, manaMax: -8, staminaMax: 8, attaquePhysique: 2, attaqueMagique: -4, defensePhysique: 2, defenseMagique: -1, critique: 0, esquive: -1, vitesse: -0.5 }
        },

        mage: {
            id: "mage",
            nom: "Mage",
            icone: "🔮",
            description: "INT/CHA. Très fort en magie, fragile physiquement.",
            base: { force: 2, dexterite: 3, intelligence: 8, vitalite: 4, chance: 5 },
            poids: { force: 0.30, dexterite: 0.55, intelligence: 1.75, vitalite: 0.85, chance: 0.85 },
            bonusCombat: { pvMax: 18, manaMax: 38, staminaMax: -2, attaquePhysique: -5, attaqueMagique: 11, defensePhysique: 3, defenseMagique: 8, critique: 0.6, esquive: -0.4, vitesse: -0.1 }
        },

        voleur: {
            id: "voleur",
            nom: "Voleur",
            icone: "🗡️",
            description: "DEX/CHA. Rapide, critique, esquive, mais moins tanky.",
            base: { force: 3, dexterite: 7, intelligence: 3, vitalite: 3, chance: 4 },
            poids: { force: 0.70, dexterite: 1.65, intelligence: 0.45, vitalite: 0.55, chance: 1.15 },
            bonusCombat: { pvMax: -2, manaMax: -4, staminaMax: 14, attaquePhysique: 2.5, attaqueMagique: -3, defensePhysique: 0, defenseMagique: -1, critique: 2.5, esquive: 2.2, vitesse: 2 }
        },

        rodeur: {
            id: "rodeur",
            nom: "Rôdeur",
            icone: "🏹",
            description: "DEX/FOR. Offensif, mobile, stable.",
            base: { force: 5, dexterite: 6, intelligence: 3, vitalite: 4, chance: 2 },
            poids: { force: 1.05, dexterite: 1.35, intelligence: 0.45, vitalite: 0.85, chance: 0.70 },
            bonusCombat: { pvMax: 2, manaMax: -3, staminaMax: 12, attaquePhysique: 3, attaqueMagique: -2, defensePhysique: 1, defenseMagique: 0, critique: 1, esquive: 1, vitesse: 1 }
        },

        paladin: {
            id: "paladin",
            nom: "Paladin",
            icone: "🛡️",
            description: "FOR/VIT/INT. Tank sacré, bonne défense, magie correcte.",
            base: { force: 5, dexterite: 2, intelligence: 4, vitalite: 7, chance: 2 },
            poids: { force: 1.10, dexterite: 0.35, intelligence: 0.80, vitalite: 1.55, chance: 0.50 },
            bonusCombat: { pvMax: 24, manaMax: 8, staminaMax: 4, attaquePhysique: 2, attaqueMagique: 1, defensePhysique: 6, defenseMagique: 4, critique: -0.5, esquive: -1, vitesse: -1 }
        },

        berserker: {
            id: "berserker",
            nom: "Berserker",
            icone: "🪓",
            description: "FOR pure. Très gros dégâts, défense moins stable.",
            base: { force: 7, dexterite: 4, intelligence: 1, vitalite: 4, chance: 2 },
            poids: { force: 1.65, dexterite: 0.70, intelligence: 0.20, vitalite: 0.80, chance: 0.40 },
            bonusCombat: { pvMax: -4, manaMax: -14, staminaMax: 10, attaquePhysique: 5, attaqueMagique: -6, defensePhysique: -3, defenseMagique: -4, critique: 1, esquive: -2, vitesse: -0.4 }
        },

        assassin: {
            id: "assassin",
            nom: "Assassin",
            icone: "🥷",
            description: "DEX/CHA extrême. Critique et vitesse, très fragile.",
            base: { force: 4, dexterite: 8, intelligence: 2, vitalite: 2, chance: 4 },
            poids: { force: 0.85, dexterite: 1.90, intelligence: 0.25, vitalite: 0.35, chance: 1.10 },
            bonusCombat: { pvMax: -10, manaMax: -8, staminaMax: 16, attaquePhysique: 4.5, attaqueMagique: -5, defensePhysique: -3, defenseMagique: -3, critique: 4, esquive: 2.8, vitesse: 3 }
        },

        necromancien: {
            id: "necromancien",
            nom: "Nécromancien",
            icone: "💀",
            description: "INT/VIT. Mage sombre plus résistant qu’un mage pur.",
            base: { force: 2, dexterite: 2, intelligence: 8, vitalite: 6, chance: 4 },
            poids: { force: 0.25, dexterite: 0.35, intelligence: 1.55, vitalite: 1.20, chance: 0.85 },
            bonusCombat: { pvMax: 24, manaMax: 28, staminaMax: -2, attaquePhysique: -5, attaqueMagique: 8, defensePhysique: 3, defenseMagique: 6, critique: 1, esquive: -0.8, vitesse: -0.8 }
        },

        gardien: {
            id: "gardien",
            nom: "Gardien",
            icone: "🪨",
            description: "VIT extrême. Très tanky, lent, dégâts faibles.",
            base: { force: 4, dexterite: 1, intelligence: 2, vitalite: 8, chance: 4 },
            poids: { force: 0.82, dexterite: 0.20, intelligence: 0.35, vitalite: 1.70, chance: 0.50 },
            bonusCombat: { pvMax: 28, manaMax: -6, staminaMax: 6, attaquePhysique: 1, attaqueMagique: -4, defensePhysique: 5, defenseMagique: 3, critique: -1.5, esquive: -2.2, vitesse: -2.2 }
        }
    };


    const PEQ_COMPETENCES_PROFIL = {
        peq_frappe_puissante: {
            id: "peq_frappe_puissante",
            nom: "Frappe puissante",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 8 },
            coutInitiative: 114,
            puissance: 6,
            multiplicateur: 0.98,
            bonusCritique: 1
        },

        peq_coup_furieux: {
            id: "peq_coup_furieux",
            nom: "Coup furieux",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 10 },
            coutInitiative: 118,
            puissance: 6,
            multiplicateur: 1.00,
            bonusCritique: 3,
            bonusEsquive: -1
        },

        peq_projectile_arcanique: {
            id: "peq_projectile_arcanique",
            nom: "Projectile arcanique",
            typeAction: "attaque",
            nature: "magique",
            cible: "ennemi",
            couts: { mana: 8, stamina: 0 },
            coutInitiative: 96,
            puissance: 9,
            multiplicateur: 1.02,
            bonusCritique: 1
        },

        peq_trait_ombre: {
            id: "peq_trait_ombre",
            nom: "Trait d’ombre",
            typeAction: "attaque",
            nature: "magique",
            cible: "ennemi",
            couts: { mana: 7, stamina: 0 },
            coutInitiative: 102,
            puissance: 9,
            multiplicateur: 1.00,
            bonusCritique: 2
        },

        peq_attaque_precise: {
            id: "peq_attaque_precise",
            nom: "Attaque précise",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 6 },
            coutInitiative: 92,
            puissance: 5,
            multiplicateur: 0.98,
            bonusCritique: 5
        },

        peq_tir_rapide: {
            id: "peq_tir_rapide",
            nom: "Tir rapide",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 5 },
            coutInitiative: 88,
            puissance: 4,
            multiplicateur: 0.95,
            bonusCritique: 2
        },

        peq_jugement_sacre: {
            id: "peq_jugement_sacre",
            nom: "Jugement sacré",
            typeAction: "attaque",
            nature: "magique",
            cible: "ennemi",
            couts: { mana: 7, stamina: 3 },
            coutInitiative: 104,
            puissance: 8,
            multiplicateur: 1.02,
            bonusCritique: 0
        },

        peq_frappe_bouclier: {
            id: "peq_frappe_bouclier",
            nom: "Frappe de bouclier",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 7 },
            coutInitiative: 115,
            puissance: 6,
            multiplicateur: 0.92,
            bonusCritique: -1
        }
    };

    function PEQ_enregistrerCompetencesProfil() {
        if (typeof Game === "undefined") return;

        Game.cache ??= {};
        Game.cache.competencesParId ??= {};

        Object.entries(PEQ_COMPETENCES_PROFIL).forEach(([id, competence]) => {
            Game.cache.competencesParId[id] = {
                ...competence,
                id
            };
        });
    }

    function PEQ_obtenirCompetencesProfil(classeId) {
        const classe =
            String(classeId || "aventurier");

        const base =
            ["attaque_simple", "defendre", "fuir", "utiliser_objet"];

        const parClasse = {
            aventurier: ["attaque_simple", "defendre", "fuir", "utiliser_objet"],
            guerrier: ["peq_frappe_puissante", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            mage: ["peq_projectile_arcanique", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            voleur: ["peq_attaque_precise", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            rodeur: ["peq_tir_rapide", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            paladin: ["peq_jugement_sacre", "peq_frappe_puissante", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            berserker: ["peq_coup_furieux", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            assassin: ["peq_attaque_precise", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            necromancien: ["peq_trait_ombre", "attaque_simple", "defendre", "fuir", "utiliser_objet"],
            gardien: ["peq_frappe_bouclier", "attaque_simple", "defendre", "fuir", "utiliser_objet"]
        };

        return parClasse[classe] || base;
    }


    const PEQ_TIERS_PROFILS = [
        {
            id: "1_commun",
            niveau: 1,
            nomCourt: "niv. 1 — commun",
            description: "Début de jeu avec set commun. Profil utile pour tester les premières zones.",
            raretes: [
                { id: "commun", poids: 95 },
                { id: "peu-commun", poids: 5 }
            ]
        },
        {
            id: "3_modeste",
            niveau: 3,
            nomCourt: "niv. 3 — modeste",
            description: "Début de progression avec un équipement un peu moins punitif.",
            raretes: [
                { id: "commun", poids: 56 },
                { id: "peu-commun", poids: 39 },
                { id: "rare", poids: 5 }
            ]
        },
        {
            id: "5_standard",
            niveau: 5,
            nomCourt: "niv. 5 — standard",
            description: "Aventurier mieux stabilisé pour éviter le creux de progression.",
            raretes: [
                { id: "commun", poids: 22 },
                { id: "peu-commun", poids: 55 },
                { id: "rare", poids: 21 },
                { id: "epique", poids: 2 }
            ]
        },
        {
            id: "8_bon",
            niveau: 8,
            nomCourt: "niv. 8 — bon équipement",
            description: "Profil de milieu de progression légèrement renforcé.",
            raretes: [
                { id: "peu-commun", poids: 34 },
                { id: "rare", poids: 52 },
                { id: "epique", poids: 14 }
            ]
        },
        {
            id: "12_rare",
            niveau: 12,
            nomCourt: "niv. 12 — rare",
            description: "Profil avancé pour élites et mini-boss intermédiaires.",
            raretes: [
                { id: "peu-commun", poids: 10 },
                { id: "rare", poids: 65 },
                { id: "epique", poids: 23 },
                { id: "legendaire", poids: 2 }
            ]
        },
        {
            id: "15_epique_leger",
            niveau: 15,
            nomCourt: "niv. 15 — épique léger",
            description: "Profil puissant mais pas encore suréquipé.",
            raretes: [
                { id: "rare", poids: 55 },
                { id: "epique", poids: 38 },
                { id: "legendaire", poids: 7 }
            ]
        },
        {
            id: "20_heroique",
            niveau: 20,
            nomCourt: "niv. 20 — héroïque",
            description: "Haut niveau, bon équipement, mais réserve encore de la place aux talents futurs.",
            raretes: [
                { id: "rare", poids: 30 },
                { id: "epique", poids: 52 },
                { id: "legendaire", poids: 18 }
            ]
        },
        {
            id: "25_legendaire",
            niveau: 25,
            nomCourt: "niv. 25 — légendaire",
            description: "Profil de fin de jeu moins god mode, toujours puissant.",
            raretes: [
                { id: "rare", poids: 12 },
                { id: "epique", poids: 58 },
                { id: "legendaire", poids: 30 }
            ]
        },
        {
            id: "30_mythique",
            niveau: 30,
            nomCourt: "niv. 30 — mythique",
            description: "Plafond actuel. Puissant, mais moins défensif qu'en v0.9.0.",
            raretes: [
                { id: "epique", poids: 57 },
                { id: "legendaire", poids: 43 }
            ]
        }
    ];

    function PEQ_creerProfilClasse(classe, tier) {
        return {
            id: `${classe.id}_${tier.id}`,
            nom: `${classe.icone} ${classe.nom} — ${tier.nomCourt}`,
            description: `${classe.description} ${tier.description}`,
            niveau: tier.niveau,
            classe: classe.id,
            classeNom: classe.nom,
            genereSet: true,
            raretes: tier.raretes
        };
    }

    function PEQ_creerProfilsClasses() {
        const profils = {};

        Object.values(PEQ_CLASSES)
            .filter(classe => classe.id !== "aventurier")
            .forEach(classe => {
                PEQ_TIERS_PROFILS.forEach(tier => {
                    const profil = PEQ_creerProfilClasse(classe, tier);
                    profils[profil.id] = profil;
                });
            });

        return profils;
    }

    const PEQ_PROFILS = {
        actuel: {
            id: "actuel",
            nom: "Personnage actuel",
            description: "Utilise les vraies stats et le vrai équipement actuellement chargé.",
            niveau: null,
            classe: "actuel",
            genereSet: false,
            raretes: []
        },

        niveau_1_sans_stuff: {
            id: "niveau_1_sans_stuff",
            nom: "🧍 Aventurier — niv. 1 sans équipement",
            description: "Profil fragile pour tester le début absolu sans équipement.",
            niveau: 1,
            classe: "aventurier",
            genereSet: false,
            raretes: []
        },

        aventurier_1_commun: {
            id: "aventurier_1_commun",
            nom: "🧍 Aventurier — niv. 1 commun",
            description: "Profil équilibré niveau 1 avec set commun.",
            niveau: 1,
            classe: "aventurier",
            genereSet: true,
            raretes: [
                { id: "commun", poids: 95 },
                { id: "peu-commun", poids: 5 }
            ]
        },

        ...PEQ_creerProfilsClasses()
    };

    const PEQ_STATS_EQUIPEMENT = [
        "attaque",
        "defense",
        "attaqueMagique",
        "defenseMagique",
        "pvMax",
        "manaMax",
        "staminaMax",
        "force",
        "dexterite",
        "intelligence",
        "vitalite",
        "chance",
        "critique",
        "esquive",
        "vitesse",
        "bonusLoot"
    ];

    const PEQ_STATS_FINALES = [
        "pvMax",
        "manaMax",
        "staminaMax",
        "attaquePhysique",
        "defensePhysique",
        "attaqueMagique",
        "defenseMagique",
        "force",
        "dexterite",
        "intelligence",
        "vitalite",
        "chance",
        "critique",
        "esquive",
        "vitesse",
        "bonusLoot"
    ];

    const PEQ_LIBELLES_STATS = {
        pvMax: "PV max",
        manaMax: "Mana max",
        staminaMax: "Stamina max",
        attaque: "Attaque",
        defense: "Défense",
        attaquePhysique: "Attaque physique",
        defensePhysique: "Défense physique",
        attaqueMagique: "Attaque magique",
        defenseMagique: "Défense magique",
        force: "Force",
        dexterite: "Dextérité",
        intelligence: "Intelligence",
        vitalite: "Vitalité",
        chance: "Chance",
        critique: "Critique",
        esquive: "Esquive",
        vitesse: "Vitesse",
        bonusLoot: "Bonus loot"
    };

    const PEQ_SLOTS_LIBELLES = {
        arme: "Arme",
        casque: "Casque",
        armure: "Armure",
        gants: "Gants",
        chaussures: "Chaussures",
        collier: "Collier",
        bague1: "Bague 1",
        bague2: "Bague 2",
        bague: "Bague",
        artefact: "Artefact"
    };

    window.PEQ_CLASSES = PEQ_CLASSES;
    window.PEQ_TIERS_PROFILS = PEQ_TIERS_PROFILS;
    window.PEQ_PROFILS = PEQ_PROFILS;

    function PEQ_echapperHTML(valeur) {
        return String(valeur ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function PEQ_cloner(objet) {
        return JSON.parse(
            JSON.stringify(objet)
        );
    }

    function PEQ_arrondir(nombre, decimales = 1) {
        const facteur =
            Math.pow(10, decimales);

        return Math.round((Number(nombre) || 0) * facteur) / facteur;
    }

    function PEQ_arrondirStat(nomStat, valeur) {
        const statsDecimales = [
            "critique",
            "esquive",
            "vitesse",
            "bonusLoot"
        ];

        if (statsDecimales.includes(nomStat)) {
            return PEQ_arrondir(valeur, 1);
        }

        return Math.round(Number(valeur) || 0);
    }

    function PEQ_clamp(nombre, min, max) {
        return Math.max(
            min,
            Math.min(
                max,
                Number(nombre) || 0
            )
        );
    }

    function PEQ_choisirPondere(liste) {
        if (!Array.isArray(liste) || liste.length === 0) {
            return null;
        }

        const total =
            liste.reduce((somme, entree) => {
                return somme + (Number(entree.poids) || 0);
            }, 0);

        if (total <= 0) {
            return liste[0];
        }

        let tirage =
            Math.random() * total;

        for (const entree of liste) {
            tirage -=
                Number(entree.poids) || 0;

            if (tirage <= 0) {
                return entree;
            }
        }

        return liste[liste.length - 1];
    }

    function PEQ_obtenirProfil(idProfil) {
        return PEQ_PROFILS[idProfil] || PEQ_PROFILS.actuel;
    }

    function PEQ_listeProfilsOptionsHTML(idSelectionne = "actuel") {
        return Object.values(PEQ_PROFILS)
            .map(profil => {
                const selected =
                    profil.id === idSelectionne
                        ? "selected"
                        : "";

                return `
                    <option value="${PEQ_echapperHTML(profil.id)}" ${selected}>
                        ${PEQ_echapperHTML(profil.nom)}
                    </option>
                `;
            })
            .join("");
    }

    function PEQ_genererStatsVides() {
        const stats = {};

        PEQ_STATS_EQUIPEMENT.forEach(cle => {
            stats[cle] = 0;
        });

        return stats;
    }

    function PEQ_obtenirClasseProfil(classeId) {
        return PEQ_CLASSES[classeId] || PEQ_CLASSES.aventurier;
    }

    function PEQ_calculerPointsStatsDisponibles(niveau) {
        const niveauCorrige =
            Math.max(1, Number(niveau) || 1);

        // Le joueur gagne des points régulièrement, mais on garde une réserve de puissance
        // pour les futurs talents / compétences / passifs.
        return 8 + (niveauCorrige - 1) * 4;
    }

    function PEQ_repartirPointsStatsSelonClasse(niveau, classeId = "aventurier") {
        const classe =
            PEQ_obtenirClasseProfil(classeId);

        const stats = {
            force: Number(classe.base.force) || 0,
            dexterite: Number(classe.base.dexterite) || 0,
            intelligence: Number(classe.base.intelligence) || 0,
            vitalite: Number(classe.base.vitalite) || 0,
            chance: Number(classe.base.chance) || 0
        };

        const poids =
            classe.poids || PEQ_CLASSES.aventurier.poids;

        const pointsDisponibles =
            PEQ_calculerPointsStatsDisponibles(niveau);

        const totalPoids =
            Object.values(poids)
                .reduce((total, valeur) => total + (Number(valeur) || 0), 0);

        const restes = [];
        let pointsAttribues = 0;

        Object.keys(stats).forEach(stat => {
            const partExacte =
                pointsDisponibles * ((Number(poids[stat]) || 0) / totalPoids);

            const points =
                Math.floor(partExacte);

            stats[stat] += points;
            pointsAttribues += points;

            restes.push({
                stat,
                reste: partExacte - points
            });
        });

        let pointsRestants =
            pointsDisponibles - pointsAttribues;

        restes
            .sort((a, b) => b.reste - a.reste)
            .forEach(entree => {
                if (pointsRestants <= 0) return;

                stats[entree.stat] += 1;
                pointsRestants -= 1;
            });

        return {
            ...stats,
            pointsDisponibles,
            classeId: classe.id,
            classeNom: classe.nom,
            classeDescription: classe.description,
            repartition: {
                force: stats.force - (Number(classe.base.force) || 0),
                dexterite: stats.dexterite - (Number(classe.base.dexterite) || 0),
                intelligence: stats.intelligence - (Number(classe.base.intelligence) || 0),
                vitalite: stats.vitalite - (Number(classe.base.vitalite) || 0),
                chance: stats.chance - (Number(classe.base.chance) || 0)
            }
        };
    }

    function PEQ_calculerBaseJoueurParNiveau(niveau, classeId = "aventurier") {
        const niveauCorrige =
            Math.max(
                1,
                Number(niveau) || 1
            );

        const classe =
            PEQ_obtenirClasseProfil(classeId);

        const repartition =
            PEQ_repartirPointsStatsSelonClasse(niveauCorrige, classe.id);

        const force = repartition.force;
        const dexterite = repartition.dexterite;
        const intelligence = repartition.intelligence;
        const vitalite = repartition.vitalite;
        const chance = repartition.chance;

        const bonus =
            classe.bonusCombat || {};

        const base = {
            niveau: niveauCorrige,
            classe: classe.id,
            classeNom: classe.nom,
            classeIcone: classe.icone,
            classeDescription: classe.description,
            pointsStatsDisponibles: repartition.pointsDisponibles,
            repartitionPointsStats: repartition.repartition,

            force,
            dexterite,
            intelligence,
            vitalite,
            chance,

            pvMax:
                72 + niveauCorrige * 9 + vitalite * 7 + force * 1.2 + (Number(bonus.pvMax) || 0),

            manaMax:
                38 + niveauCorrige * 4 + intelligence * 6.2 + chance * 0.8 + (Number(bonus.manaMax) || 0),

            staminaMax:
                52 + niveauCorrige * 4.5 + dexterite * 3.2 + vitalite * 1.6 + (Number(bonus.staminaMax) || 0),

            attaquePhysique:
                3 + niveauCorrige * 0.85 + force * 1.05 + dexterite * 0.32 + (Number(bonus.attaquePhysique) || 0),

            defensePhysique:
                2 + niveauCorrige * 0.58 + vitalite * 0.78 + force * 0.20 + (Number(bonus.defensePhysique) || 0),

            attaqueMagique:
                3 + niveauCorrige * 0.82 + intelligence * 1.16 + chance * 0.16 + (Number(bonus.attaqueMagique) || 0),

            defenseMagique:
                2 + niveauCorrige * 0.50 + intelligence * 0.42 + vitalite * 0.32 + (Number(bonus.defenseMagique) || 0),

            critique:
                2 + dexterite * 0.12 + chance * 0.11 + (Number(bonus.critique) || 0),

            esquive:
                2 + dexterite * 0.10 + chance * 0.07 + (Number(bonus.esquive) || 0),

            vitesse:
                7 + dexterite * 0.075 + (Number(bonus.vitesse) || 0),

            bonusLoot:
                chance * 0.025
        };

        return {
            ...base,
            pvMax: Math.max(1, Math.round(base.pvMax)),
            manaMax: Math.max(0, Math.round(base.manaMax)),
            staminaMax: Math.max(0, Math.round(base.staminaMax)),
            attaquePhysique: PEQ_arrondirStat("attaque", Math.max(1, base.attaquePhysique)),
            defensePhysique: PEQ_arrondirStat("defense", Math.max(0, base.defensePhysique)),
            attaqueMagique: PEQ_arrondirStat("attaqueMagique", Math.max(0, base.attaqueMagique)),
            defenseMagique: PEQ_arrondirStat("defenseMagique", Math.max(0, base.defenseMagique)),
            critique: PEQ_clamp(PEQ_arrondirStat("critique", base.critique), 0, 28),
            esquive: PEQ_clamp(PEQ_arrondirStat("esquive", base.esquive), 0, 20),
            vitesse: PEQ_clamp(PEQ_arrondirStat("vitesse", base.vitesse), 1, 28),
            bonusLoot: PEQ_arrondirStat("bonusLoot", base.bonusLoot)
        };
    }

    function PEQ_creerBaseDepuisSnapshotActuel(snapshot) {
        const baseStats =
            snapshot.baseStats || {};

        return {
            niveau: snapshot.niveau || Game.data?.personnage?.niveau || 1,
            pvMax: snapshot.pvMax || snapshot.pv || 1,
            manaMax: snapshot.manaMax || snapshot.mana || 0,
            staminaMax: snapshot.staminaMax || snapshot.stamina || 0,
            attaquePhysique: baseStats.attaquePhysique || 0,
            defensePhysique: baseStats.defensePhysique || 0,
            attaqueMagique: baseStats.attaqueMagique || 0,
            defenseMagique: baseStats.defenseMagique || 0,
            force: baseStats.force || Game.data?.personnage?.force || 0,
            dexterite: baseStats.dexterite || Game.data?.personnage?.dexterite || 0,
            intelligence: baseStats.intelligence || Game.data?.personnage?.intelligence || 0,
            vitalite: baseStats.vitalite || Game.data?.personnage?.vitalite || 0,
            chance: baseStats.chance || Game.data?.personnage?.chance || 0,
            critique: baseStats.critique || 0,
            esquive: baseStats.esquive || 0,
            vitesse: baseStats.vitesse || 0,
            bonusLoot: baseStats.bonusLoot || 0
        };
    }

    const PEQ_BASES_EQUIPEMENT_PAR_CLASSE = {
        guerrier: {
            arme: ["epee", "hache"],
            casque: ["casque_metal"],
            armure: ["armure_maille", "armure_plaque"],
            gants: ["gants_force"],
            chaussures: ["bottes_voyage"],
            collier: ["collier_vie"],
            bague: ["bague_force"],
            artefact: ["artefact_gardien"]
        },
        mage: {
            arme: ["baton"],
            casque: ["couronne_arcanique"],
            armure: ["robe_mage"],
            gants: ["gants_arcanes"],
            chaussures: ["bottes_voyage"],
            collier: ["collier_sagesse"],
            bague: ["bague_mana"],
            artefact: ["artefact_arcane"]
        },
        voleur: {
            arme: ["dague"],
            casque: ["casque_cuir"],
            armure: ["armure_cuir"],
            gants: ["gants_precision"],
            chaussures: ["bottes_ombre"],
            collier: ["collier_vie"],
            bague: ["bague_vivacite"],
            artefact: ["artefact_chance"]
        },
        rodeur: {
            arme: ["dague", "epee"],
            casque: ["casque_cuir"],
            armure: ["armure_cuir", "armure_maille"],
            gants: ["gants_precision"],
            chaussures: ["bottes_voyage", "bottes_ombre"],
            collier: ["collier_vie"],
            bague: ["bague_vivacite", "bague_force"],
            artefact: ["artefact_chance"]
        },
        paladin: {
            arme: ["epee"],
            casque: ["casque_metal"],
            armure: ["armure_plaque", "armure_maille"],
            gants: ["gants_force"],
            chaussures: ["bottes_voyage"],
            collier: ["collier_vie", "collier_sagesse"],
            bague: ["bague_force", "bague_mana"],
            artefact: ["artefact_gardien"]
        },
        berserker: {
            arme: ["hache"],
            casque: ["casque_metal"],
            armure: ["armure_maille"],
            gants: ["gants_force"],
            chaussures: ["bottes_voyage"],
            collier: ["collier_vie"],
            bague: ["bague_force"],
            artefact: ["artefact_gardien"]
        },
        assassin: {
            arme: ["dague"],
            casque: ["casque_cuir"],
            armure: ["armure_cuir"],
            gants: ["gants_precision"],
            chaussures: ["bottes_ombre"],
            collier: ["collier_vie"],
            bague: ["bague_vivacite"],
            artefact: ["artefact_chance"]
        },
        necromancien: {
            arme: ["baton"],
            casque: ["couronne_arcanique"],
            armure: ["robe_mage"],
            gants: ["gants_arcanes"],
            chaussures: ["bottes_voyage"],
            collier: ["collier_sagesse", "collier_vie"],
            bague: ["bague_mana"],
            artefact: ["artefact_arcane"]
        },
        gardien: {
            arme: ["epee", "hache"],
            casque: ["casque_metal"],
            armure: ["armure_plaque"],
            gants: ["gants_force"],
            chaussures: ["bottes_voyage"],
            collier: ["collier_vie"],
            bague: ["bague_force"],
            artefact: ["artefact_gardien"]
        },
        aventurier: {}
    };

    function PEQ_choisirBaseIdPourClasse(classeId, slot) {
        const preferenceClasse =
            PEQ_BASES_EQUIPEMENT_PAR_CLASSE[classeId] || PEQ_BASES_EQUIPEMENT_PAR_CLASSE.aventurier;

        const liste =
            preferenceClasse?.[slot] || [];

        if (!liste.length) return null;

        return liste[
            Math.floor(Math.random() * liste.length)
        ];
    }

    function PEQ_genererSetPourProfil(profil) {
        if (!profil || !profil.genereSet) {
            return [];
        }

        if (typeof window.genererEquipementAleatoire !== "function") {
            console.warn("Générateur d'équipements procéduraux introuvable.");
            return [];
        }

        const slots = [
            "arme",
            "casque",
            "armure",
            "gants",
            "chaussures",
            "collier",
            "bague",
            "bague",
            "artefact"
        ];

        const set = [];

        slots.forEach((slot, index) => {
            const entreeRarete =
                PEQ_choisirPondere(profil.raretes);

            const rareteChoisie =
                entreeRarete?.id || "commun";

            const variationNiveau =
                Math.floor(Math.random() * 3) - 1;

            const niveauObjet =
                Math.max(
                    1,
                    Number(profil.niveau) + variationNiveau
                );

            const baseId =
                PEQ_choisirBaseIdPourClasse(
                    profil.classe || "aventurier",
                    slot
                );

            const optionsGeneration = {
                niveau: niveauObjet,
                slot,
                rarete: rareteChoisie
            };

            if (baseId) {
                optionsGeneration.baseId = baseId;
            }

            const objet =
                window.genererEquipementAleatoire(optionsGeneration);

            if (!objet) return;

            if (slot === "bague") {
                objet.slot =
                    index === 6
                        ? "bague1"
                        : "bague2";
            }

            objet.profilClasse = profil.classe || "aventurier";

            set.push(objet);
        });

        return set;
    }

    function PEQ_calculerStatsSet(set) {
        const stats =
            PEQ_genererStatsVides();

        if (typeof window.calculerStatsTotalesObjetsProceduraux === "function") {
            const statsModule =
                window.calculerStatsTotalesObjetsProceduraux(set || []);

            PEQ_STATS_EQUIPEMENT.forEach(cle => {
                stats[cle] =
                    PEQ_arrondirStat(cle, statsModule[cle] || 0);
            });

            return stats;
        }

        for (const objet of set || []) {
            PEQ_STATS_EQUIPEMENT.forEach(cle => {
                if (typeof objet[cle] !== "number") return;

                stats[cle] +=
                    Number(objet[cle]) || 0;
            });
        }

        PEQ_STATS_EQUIPEMENT.forEach(cle => {
            stats[cle] =
                PEQ_arrondirStat(cle, stats[cle]);
        });

        return stats;
    }

    function PEQ_creerSnapshotJoueurActuel() {
        if (typeof window.creerSnapshotCombatJoueur === "function") {
            return window.creerSnapshotCombatJoueur();
        }

        const personnage =
            Game.data?.personnage || {};

        const pvMax =
            typeof window.pvMaxTotal === "function"
                ? window.pvMaxTotal()
                : personnage.pvMax || personnage.pv || 100;

        const manaMax =
            typeof window.manaMaxTotal === "function"
                ? window.manaMaxTotal()
                : personnage.manaMax || personnage.mana || 50;

        const staminaMax =
            typeof window.staminaMaxTotal === "function"
                ? window.staminaMaxTotal()
                : personnage.staminaMax || personnage.stamina || 50;

        return {
            id: "joueur_actuel",
            camp: "joueur",
            type: "joueur",
            nom: personnage.nom || "Personnage actuel",
            niveau: personnage.niveau || 1,
            pv: pvMax,
            pvMax,
            mana: manaMax,
            manaMax,
            stamina: staminaMax,
            staminaMax,
            initiative: 0,
            defenseActive: false,
            baseStats: {
                attaquePhysique: personnage.attaqueBase || personnage.attaque || 0,
                defensePhysique: personnage.defenseBase || personnage.defense || 0,
                attaqueMagique: personnage.attaqueMagique || 0,
                defenseMagique: personnage.defenseMagique || 0,
                critique: personnage.critique || 0,
                esquive: personnage.esquive || 0,
                vitesse: personnage.vitesse || 10,
                force: personnage.force || 0,
                dexterite: personnage.dexterite || 0,
                intelligence: personnage.intelligence || 0,
                vitalite: personnage.vitalite || 0,
                chance: personnage.chance || 0,
                bonusLoot: personnage.bonusLoot || 0
            },
            effets: [],
            competences:
                typeof window.obtenirCompetencesCombatJoueur === "function"
                    ? window.obtenirCompetencesCombatJoueur()
                    : ["attaque_simple", "defendre", "fuir", "utiliser_objet"]
        };
    }

    function PEQ_appliquerCapsProfilSimule(stats) {
        const niveau =
            Math.max(1, Number(stats?.niveau) || 1);

        const caps = {
            pvMax: 110 + niveau * 85,
            manaMax: 80 + niveau * 35,
            staminaMax: 90 + niveau * 25,

            attaquePhysique: 12 + niveau * 13.5,
            attaqueMagique: 12 + niveau * 13.5,
            defensePhysique: 10 + niveau * 9.5,
            defenseMagique: 10 + niveau * 8.5,

            critique: Math.min(32, 5 + niveau * 0.65),
            esquive: Math.min(24, 5 + niveau * 0.45),
            vitesse: Math.min(34, 8 + niveau * 0.65)
        };

        stats.pvMax =
            Math.round(Math.min(Number(stats.pvMax) || 1, caps.pvMax));

        stats.manaMax =
            Math.round(Math.min(Number(stats.manaMax) || 0, caps.manaMax));

        stats.staminaMax =
            Math.round(Math.min(Number(stats.staminaMax) || 0, caps.staminaMax));

        stats.attaquePhysique =
            PEQ_arrondirStat("attaque", Math.min(Number(stats.attaquePhysique) || 0, caps.attaquePhysique));

        stats.attaqueMagique =
            PEQ_arrondirStat("attaqueMagique", Math.min(Number(stats.attaqueMagique) || 0, caps.attaqueMagique));

        stats.defensePhysique =
            PEQ_arrondirStat("defense", Math.min(Number(stats.defensePhysique) || 0, caps.defensePhysique));

        stats.defenseMagique =
            PEQ_arrondirStat("defenseMagique", Math.min(Number(stats.defenseMagique) || 0, caps.defenseMagique));

        stats.critique =
            PEQ_arrondirStat("critique", Math.min(Number(stats.critique) || 0, caps.critique));

        stats.esquive =
            PEQ_arrondirStat("esquive", Math.min(Number(stats.esquive) || 0, caps.esquive));

        stats.vitesse =
            PEQ_arrondirStat("vitesse", Math.min(Number(stats.vitesse) || 1, caps.vitesse));

        return stats;
    }


    function PEQ_appliquerAjustementProgression091(stats) {
        const niveau =
            Math.max(1, Number(stats?.niveau) || 1);

        function mult(cle, valeur) {
            stats[cle] =
                PEQ_arrondirStat(
                    cle,
                    (Number(stats[cle]) || 0) * valeur
                );
        }

        function add(cle, valeur) {
            stats[cle] =
                PEQ_arrondirStat(
                    cle,
                    (Number(stats[cle]) || 0) + valeur
                );
        }

        // v0.9.3 — Midgame & Class Recovery
        // Rapport v0.9.2 :
        // - menaces globales bonnes ;
        // - mage/nécromancien/paladin trop bas ;
        // - niveaux 8-15 trop durs.
        // On corrige donc le joueur simulé, pas les menaces globales.
        if (niveau >= 3 && niveau <= 8) {
            const centre =
                Math.max(0, 1 - Math.abs(niveau - 5) / 4);

            const aide =
                0.06 + centre * 0.07;

            mult("pvMax", 1 + aide);
            mult("defensePhysique", 1 + aide * 0.85);
            mult("defenseMagique", 1 + aide * 0.70);
            mult("attaquePhysique", 1.025 + centre * 0.025);
            mult("attaqueMagique", 1.025 + centre * 0.025);
            mult("staminaMax", 1.035);
            mult("manaMax", 1.035);

            add("pvMax", 4 + niveau * 1.15);
            add("defensePhysique", 0.5 + centre * 0.6);
            add("defenseMagique", 0.4 + centre * 0.5);
        }

        // v0.9.3.3 :
        // Le rapport v0.9.3.2 montre un creux très net niveau 12 (32%)
        // et encore bas niveau 15 (37.4%).
        // On ajoute un coussin de transition limité au midgame, sans toucher au endgame.
        if (niveau >= 10 && niveau <= 15) {
            const centreMid =
                PEQ_clamp(1 - Math.abs(niveau - 12) / 5, 0, 1);

            mult("pvMax", 1.035 + centreMid * 0.045);
            mult("defensePhysique", 1.025 + centreMid * 0.035);
            mult("defenseMagique", 1.025 + centreMid * 0.035);
            mult("attaquePhysique", 1.015 + centreMid * 0.020);
            mult("attaqueMagique", 1.020 + centreMid * 0.025);
            add("pvMax", 4 + niveau * (0.35 + centreMid * 0.35));
        }

        // v0.9.3.2 :
        // Niveau 25-30 encore trop confortable, surtout niv.30 à 60.8%.
        // On retire un peu de survie/défense, mais on garde de l'offense pour éviter les combats mous.
        if (niveau >= 25) {
            const t =
                PEQ_clamp((niveau - 25) / 5, 0, 1);

            mult("pvMax", 0.95 - t * 0.055);
            mult("defensePhysique", 0.925 - t * 0.070);
            mult("defenseMagique", 0.94 - t * 0.065);
            mult("esquive", 0.935 - t * 0.060);
            mult("attaquePhysique", 1.020 + t * 0.020);
            mult("attaqueMagique", 1.020 + t * 0.020);
            mult("vitesse", 1.020 + t * 0.025);
        }

        stats.pvMax = Math.max(1, Math.round(Number(stats.pvMax) || 1));
        stats.manaMax = Math.max(0, Math.round(Number(stats.manaMax) || 0));
        stats.staminaMax = Math.max(0, Math.round(Number(stats.staminaMax) || 0));

        stats.critique = PEQ_clamp(PEQ_arrondirStat("critique", Number(stats.critique) || 0), 0, 34);
        stats.esquive = PEQ_clamp(PEQ_arrondirStat("esquive", Number(stats.esquive) || 0), 0, 24);
        stats.vitesse = PEQ_clamp(PEQ_arrondirStat("vitesse", Number(stats.vitesse) || 1), 1, 36);

        return stats;
    }

    function PEQ_appliquerAjustementClasseBalance087(classeId, stats) {
        const classe =
            String(classeId || "aventurier");

        const niveau =
            Math.max(1, Number(stats.niveau) || 1);

        function mult(cle, valeur) {
            stats[cle] =
                PEQ_arrondirStat(
                    cle,
                    (Number(stats[cle]) || 0) * valeur
                );
        }

        function add(cle, valeur) {
            stats[cle] =
                PEQ_arrondirStat(
                    cle,
                    (Number(stats[cle]) || 0) + valeur
                );
        }

        // v0.8.8 :
        // Le rapport v0.8.7 montre une surcorrection : mage/nécromancien
        // passent de trop faibles à trop dominants. On les recentre.
        if (classe === "mage") {
            // v0.9.3 :
            // Mage reste trop bas en v0.9.2 (≈32.7%).
            // Petit secours offensif/survie, sans revenir au surboost v0.8.7.
            mult("pvMax", 1.19);
            mult("manaMax", 1.15);
            mult("attaqueMagique", 1.30);
            mult("defensePhysique", 1.14);
            mult("defenseMagique", 1.11);
            mult("vitesse", 1.02);
            add("pvMax", 8 + niveau * 1.08);
            add("attaqueMagique", 3 + niveau * 0.44);
        }

        if (classe === "necromancien") {
            // v0.9.3.2 :
            // Nécromancien reste le plus bas en v0.9.3.1 (34.4%).
            // Micro-secours réel, sans toucher aux autres classes.
            mult("pvMax", 1.22);
            mult("manaMax", 1.12);
            mult("attaqueMagique", 1.23);
            mult("defensePhysique", 1.13);
            mult("defenseMagique", 1.12);
            mult("vitesse", 0.99);
            add("pvMax", 10 + niveau * 1.20);
            add("attaqueMagique", 2.5 + niveau * 0.36);
        }

        // Les classes physiques sont plutôt correctes ; on évite les gros nerfs.
        if (classe === "guerrier") {
            mult("attaquePhysique", 0.94);
            mult("defensePhysique", 0.96);
            mult("pvMax", 0.98);
        }

        if (classe === "berserker") {
            mult("attaquePhysique", 0.91);
            mult("defensePhysique", 0.95);
            mult("pvMax", 0.97);
            mult("critique", 0.95);
        }

        // Paladin : trop long en fin de jeu. Moins mur, plus résolutif.
        if (classe === "paladin") {
            // v0.9.3 :
            // Paladin est devenu un peu trop bas en v0.9.2.
            // On lui rend un peu de stabilité, sans recréer les combats interminables.
            mult("pvMax", 0.91);
            mult("defensePhysique", 0.85);
            mult("defenseMagique", 0.88);
            mult("attaquePhysique", 1.13);
            mult("attaqueMagique", 1.11);
            mult("vitesse", 1.10);
        }

        if (classe === "rodeur") {
            mult("attaquePhysique", 0.97);
            mult("vitesse", 0.98);
            mult("critique", 0.97);
        }

        // Voleur/assassin étaient un peu trop bas et encaissaient trop.
        if (classe === "voleur") {
            // v0.9.0 : léger secours survie/offense.
            mult("pvMax", 1.10);
            mult("defensePhysique", 1.12);
            mult("attaquePhysique", 1.06);
            mult("esquive", 1.08);
        }

        if (classe === "assassin") {
            // v0.9.0 : même logique que voleur, sans le rendre tanky.
            mult("pvMax", 1.13);
            mult("defensePhysique", 1.10);
            mult("attaquePhysique", 1.06);
            mult("esquive", 1.07);
        }

        // Gardien : encore trop long. On réduit davantage son mur,
        // mais on augmente la résolution du combat.
        if (classe === "gardien") {
            // v0.9.0 : moins de mur, un peu plus de résolution.
            mult("pvMax", 0.84);
            mult("defensePhysique", 0.78);
            mult("defenseMagique", 0.83);
            mult("attaquePhysique", 1.24);
            mult("vitesse", 1.22);
        }

        stats.pvMax = Math.max(1, Math.round(Number(stats.pvMax) || 1));
        stats.manaMax = Math.max(0, Math.round(Number(stats.manaMax) || 0));
        stats.staminaMax = Math.max(0, Math.round(Number(stats.staminaMax) || 0));

        stats.attaquePhysique = PEQ_arrondirStat("attaque", Math.max(1, Number(stats.attaquePhysique) || 1));
        stats.attaqueMagique = PEQ_arrondirStat("attaqueMagique", Math.max(0, Number(stats.attaqueMagique) || 0));
        stats.defensePhysique = PEQ_arrondirStat("defense", Math.max(0, Number(stats.defensePhysique) || 0));
        stats.defenseMagique = PEQ_arrondirStat("defenseMagique", Math.max(0, Number(stats.defenseMagique) || 0));

        stats.critique = PEQ_clamp(PEQ_arrondirStat("critique", Number(stats.critique) || 0), 0, 34);
        stats.esquive = PEQ_clamp(PEQ_arrondirStat("esquive", Number(stats.esquive) || 0), 0, 24);
        stats.vitesse = PEQ_clamp(PEQ_arrondirStat("vitesse", Number(stats.vitesse) || 1), 1, 36);

        return stats;
    }

    function PEQ_creerDetailsProfil(idProfil, options = {}) {
        const profil =
            PEQ_obtenirProfil(idProfil);

        const forcerRegeneration =
            Boolean(options.forcerRegeneration);

        const cache =
            Game.profilsEquipementSimulation.snapshotsParProfil[profil.id];

        if (!forcerRegeneration && cache) {
            Game.profilsEquipementSimulation.dernierProfil = cache.profil;
            Game.profilsEquipementSimulation.dernierSet = cache.set;
            Game.profilsEquipementSimulation.dernierSnapshot = cache.snapshot;
            Game.profilsEquipementSimulation.derniersDetails = cache;
            return cache;
        }

        if (profil.id === "actuel") {
            const snapshotActuel =
                PEQ_creerSnapshotJoueurActuel();

            const baseActuelle =
                PEQ_creerBaseDepuisSnapshotActuel(snapshotActuel);

            const detailsActuel = {
                profil,
                base: baseActuelle,
                statsSet: PEQ_genererStatsVides(),
                statsFinales: PEQ_creerBaseDepuisSnapshotActuel(snapshotActuel),
                set: [],
                snapshot: snapshotActuel,
                dateGeneration: new Date().toISOString(),
                estProfilActuel: true
            };

            Game.profilsEquipementSimulation.snapshotsParProfil[profil.id] =
                detailsActuel;

            Game.profilsEquipementSimulation.dernierProfil = profil;
            Game.profilsEquipementSimulation.dernierSet = [];
            Game.profilsEquipementSimulation.dernierSnapshot = snapshotActuel;
            Game.profilsEquipementSimulation.derniersDetails = detailsActuel;

            return detailsActuel;
        }

        const base =
            PEQ_calculerBaseJoueurParNiveau(
                profil.niveau,
                profil.classe || "aventurier"
            );

        const set =
            PEQ_genererSetPourProfil(
                profil
            );

        const statsSet =
            PEQ_calculerStatsSet(
                set
            );

        const statsFinales = {
            niveau: profil.niveau,
            pvMax: Math.round(base.pvMax + (statsSet.pvMax || 0)),
            manaMax: Math.round(base.manaMax + (statsSet.manaMax || 0)),
            staminaMax: Math.round(base.staminaMax + (statsSet.staminaMax || 0)),

            force: PEQ_arrondirStat("force", base.force + (statsSet.force || 0)),
            dexterite: PEQ_arrondirStat("dexterite", base.dexterite + (statsSet.dexterite || 0)),
            intelligence: PEQ_arrondirStat("intelligence", base.intelligence + (statsSet.intelligence || 0)),
            vitalite: PEQ_arrondirStat("vitalite", base.vitalite + (statsSet.vitalite || 0)),
            chance: PEQ_arrondirStat("chance", base.chance + (statsSet.chance || 0)),

            attaquePhysique: PEQ_arrondirStat("attaque", base.attaquePhysique + (statsSet.attaque || 0)),
            defensePhysique: PEQ_arrondirStat("defense", base.defensePhysique + (statsSet.defense || 0)),
            attaqueMagique: PEQ_arrondirStat("attaqueMagique", base.attaqueMagique + (statsSet.attaqueMagique || 0)),
            defenseMagique: PEQ_arrondirStat("defenseMagique", base.defenseMagique + (statsSet.defenseMagique || 0)),

            critique: PEQ_clamp(PEQ_arrondirStat("critique", base.critique + (statsSet.critique || 0)), 0, 32),
            esquive: PEQ_clamp(PEQ_arrondirStat("esquive", base.esquive + (statsSet.esquive || 0)), 0, 24),
            vitesse: PEQ_clamp(PEQ_arrondirStat("vitesse", base.vitesse + (statsSet.vitesse || 0)), 1, 34),
            bonusLoot: PEQ_arrondirStat("bonusLoot", (statsSet.bonusLoot || 0))
        };

        PEQ_appliquerCapsProfilSimule(statsFinales);
        PEQ_appliquerAjustementClasseBalance087(profil.classe || "aventurier", statsFinales);
        PEQ_appliquerAjustementProgression091(statsFinales);
        PEQ_appliquerCapsProfilSimule(statsFinales);

        const snapshot = {
            id: "joueur_simule",
            camp: "joueur",
            type: "joueur",
            nom: profil.nom,
            niveau: profil.niveau,

            pv: statsFinales.pvMax,
            pvMax: statsFinales.pvMax,
            mana: statsFinales.manaMax,
            manaMax: statsFinales.manaMax,
            stamina: statsFinales.staminaMax,
            staminaMax: statsFinales.staminaMax,

            initiative: 0,
            defenseActive: false,

            baseStats: {
                attaquePhysique: statsFinales.attaquePhysique,
                defensePhysique: statsFinales.defensePhysique,
                attaqueMagique: statsFinales.attaqueMagique,
                defenseMagique: statsFinales.defenseMagique,
                critique: statsFinales.critique,
                esquive: statsFinales.esquive,
                vitesse: statsFinales.vitesse,

                force: statsFinales.force,
                dexterite: statsFinales.dexterite,
                intelligence: statsFinales.intelligence,
                vitalite: statsFinales.vitalite,
                chance: statsFinales.chance,
                bonusLoot: statsFinales.bonusLoot
            },

            effets: [],
            competences:
                PEQ_obtenirCompetencesProfil(profil.classe || "aventurier"),

            profilSimulation: {
                id: profil.id,
                nom: profil.nom,
                description: profil.description,
                classe: profil.classe || "aventurier",
                classeNom: base.classeNom || profil.classeNom || "Aventurier",
                pointsStatsDisponibles: base.pointsStatsDisponibles || 0,
                repartitionPointsStats: base.repartitionPointsStats || {}
            },

            equipementsProceduraux: set
        };

        const details = {
            profil,
            base,
            statsSet,
            statsFinales,
            set,
            snapshot,
            dateGeneration: new Date().toISOString(),
            estProfilActuel: false
        };

        Game.profilsEquipementSimulation.snapshotsParProfil[profil.id] =
            details;

        Game.profilsEquipementSimulation.dernierProfil = profil;
        Game.profilsEquipementSimulation.dernierSet = set;
        Game.profilsEquipementSimulation.dernierSnapshot = snapshot;
        Game.profilsEquipementSimulation.derniersDetails = details;

        return details;
    }

    function PEQ_creerSnapshotJoueurDepuisProfil(idProfil, options = {}) {
        return PEQ_creerDetailsProfil(idProfil, options).snapshot;
    }

    function PEQ_creerBlocStatSimple(nomStat, valeur, prefixe = "") {
        const libelle =
            PEQ_LIBELLES_STATS[nomStat] || nomStat;

        const valeurPropre =
            PEQ_arrondirStat(nomStat, valeur);

        const signe =
            prefixe || "";

        return `
            <div class="peq-stat">
                <span>${PEQ_echapperHTML(libelle)}</span>
                <strong>${PEQ_echapperHTML(signe)}${PEQ_echapperHTML(valeurPropre)}</strong>
            </div>
        `;
    }

    function PEQ_creerGrilleStats(titre, stats, cles, options = {}) {
        const prefixe =
            options.prefixe || "";

        const lignes =
            cles.map(cle => {
                const valeur =
                    Number(stats[cle]) || 0;

                if (options.masquerZero && valeur === 0) {
                    return "";
                }

                return PEQ_creerBlocStatSimple(
                    cle,
                    valeur,
                    prefixe
                );
            })
            .join("");

        if (!lignes.trim()) {
            return "";
        }

        return `
            <div class="item-card peq-bloc-stats">
                <h3>${PEQ_echapperHTML(titre)}</h3>
                <div class="peq-stats-grid">
                    ${lignes}
                </div>
            </div>
        `;
    }

    function PEQ_creerResumeProfil(details) {
        const stats =
            details.statsFinales;

        const base =
            details.base || {};

        return `
            <div class="peq-resume-grid">
                <div>
                    <span>Classe</span>
                    <strong>${PEQ_echapperHTML(base.classeIcone || "🧍")} ${PEQ_echapperHTML(base.classeNom || details.profil.classeNom || "Aventurier")}</strong>
                </div>
                <div>
                    <span>Niveau</span>
                    <strong>${PEQ_echapperHTML(stats.niveau || details.snapshot.niveau || 1)}</strong>
                </div>
                <div>
                    <span>Points stats</span>
                    <strong>${PEQ_echapperHTML(base.pointsStatsDisponibles ?? "—")}</strong>
                </div>
                <div>
                    <span>PV</span>
                    <strong>${PEQ_echapperHTML(stats.pvMax)}</strong>
                </div>
                <div>
                    <span>Attaque</span>
                    <strong>${PEQ_echapperHTML(stats.attaquePhysique)}</strong>
                </div>
                <div>
                    <span>Magie</span>
                    <strong>${PEQ_echapperHTML(stats.attaqueMagique)}</strong>
                </div>
                <div>
                    <span>Défense</span>
                    <strong>${PEQ_echapperHTML(stats.defensePhysique)}</strong>
                </div>
                <div>
                    <span>Vitesse</span>
                    <strong>${PEQ_echapperHTML(stats.vitesse)}</strong>
                </div>
            </div>
        `;
    }

    function PEQ_creerBlocRepartitionClasse(details) {
        const base =
            details.base || {};

        if (!base.repartitionPointsStats) return "";

        const repartition =
            base.repartitionPointsStats;

        const total =
            base.pointsStatsDisponibles || 0;

        const lignes =
            ["force", "dexterite", "intelligence", "vitalite", "chance"]
                .map(stat => {
                    const valeur =
                        Number(repartition[stat]) || 0;

                    return `
                        <div class="peq-stat">
                            <span>${PEQ_echapperHTML(PEQ_LIBELLES_STATS[stat] || stat)}</span>
                            <strong>+${PEQ_echapperHTML(valeur)}</strong>
                        </div>
                    `;
                })
                .join("");

        return `
            <div class="item-card peq-bloc-classe">
                <h3>${PEQ_echapperHTML(base.classeIcone || "🧍")} Classe : ${PEQ_echapperHTML(base.classeNom || "Aventurier")}</h3>
                <p>${PEQ_echapperHTML(base.classeDescription || "Profil équilibré.")}</p>
                <p class="texte-muted">
                    Points attribués automatiquement selon la classe :
                    <strong>${PEQ_echapperHTML(total)}</strong>
                </p>
                <div class="peq-stats-grid">
                    ${lignes}
                </div>
            </div>
        `;
    }

    function PEQ_creerCarteEquipement(objet) {
        const statsHTML =
            PEQ_STATS_EQUIPEMENT
                .filter(cle => typeof objet[cle] === "number" && objet[cle] !== 0)
                .map(cle => PEQ_creerBlocStatSimple(cle, objet[cle], "+"))
                .join("");

        const affixes =
            Array.isArray(objet.affixes) && objet.affixes.length
                ? objet.affixes.map(affixe => {
                    return PEQ_echapperHTML(affixe.nom || affixe.id || affixe);
                }).join(", ")
                : "Aucun";

        const effetSpecialHTML =
            objet.effetSpecial
                ? `
                    <div class="peq-effet-special">
                        <strong>${PEQ_echapperHTML(objet.effetSpecial.nom || "Effet spécial")}</strong>
                        <p>${PEQ_echapperHTML(objet.effetSpecial.description || "")}</p>
                    </div>
                `
                : "";

        return `
            <div class="item-card peq-equipement-card">
                <div class="peq-equipement-header">
                    <div>
                        <h4 class="${PEQ_echapperHTML(objet.rarete || "commun")}">
                            ${PEQ_echapperHTML(objet.nom || "Équipement")}
                        </h4>
                        <p>
                            ${PEQ_echapperHTML(PEQ_SLOTS_LIBELLES[objet.slot] || objet.slot || "Slot")}
                            — niveau ${PEQ_echapperHTML(objet.niveau || 1)}
                            — ${PEQ_echapperHTML(objet.rarete || "commun")}
                        </p>
                    </div>
                    <span class="peq-slot-badge">
                        ${PEQ_echapperHTML(PEQ_SLOTS_LIBELLES[objet.slot] || objet.slot || "?")}
                    </span>
                </div>

                <p class="texte-muted">
                    Affixes : ${affixes}
                </p>

                <div class="peq-stats-grid peq-stats-grid-small">
                    ${statsHTML || "<p class='texte-muted'>Aucun bonus numérique.</p>"}
                </div>

                ${effetSpecialHTML}
            </div>
        `;
    }

    function PEQ_creerBlocEquipements(details) {
        if (!details.set || details.set.length === 0) {
            return `
                <div class="item-card">
                    <h3>🧰 Équipement simulé</h3>
                    <p>Aucun équipement procédural pour ce profil.</p>
                </div>
            `;
        }

        return `
            <div class="item-card">
                <h3>🧰 Set d'équipement généré</h3>
                <p class="texte-muted">
                    Ce set est temporaire. Il sert au simulateur et ne va pas dans ton inventaire réel.
                </p>
            </div>

            <div class="peq-equipements-grid">
                ${details.set.map(PEQ_creerCarteEquipement).join("")}
            </div>
        `;
    }

    function PEQ_creerHTMLProfil(details) {
        const profil =
            details.profil;

        const statsFinales =
            details.statsFinales;

        const statsSetPourFinales = {
            pvMax: details.statsSet.pvMax,
            manaMax: details.statsSet.manaMax,
            staminaMax: details.statsSet.staminaMax,
            attaquePhysique: details.statsSet.attaque,
            defensePhysique: details.statsSet.defense,
            attaqueMagique: details.statsSet.attaqueMagique,
            defenseMagique: details.statsSet.defenseMagique,
            force: details.statsSet.force,
            dexterite: details.statsSet.dexterite,
            intelligence: details.statsSet.intelligence,
            vitalite: details.statsSet.vitalite,
            chance: details.statsSet.chance,
            critique: details.statsSet.critique,
            esquive: details.statsSet.esquive,
            vitesse: details.statsSet.vitesse,
            bonusLoot: details.statsSet.bonusLoot
        };

        return `
            <div class="item-card peq-profil-header">
                <h2>🧍 ${PEQ_echapperHTML(profil.nom)}</h2>
                <p>${PEQ_echapperHTML(profil.description)}</p>
                <p class="texte-muted">
                    Généré le ${PEQ_echapperHTML(new Date(details.dateGeneration).toLocaleString())}
                </p>
                ${PEQ_creerResumeProfil(details)}
            </div>

            ${PEQ_creerBlocRepartitionClasse(details)}

            <div class="peq-trois-colonnes">
                ${PEQ_creerGrilleStats(
                    "🧬 Base du profil",
                    details.base,
                    PEQ_STATS_FINALES,
                    { masquerZero: false }
                )}

                ${PEQ_creerGrilleStats(
                    "⚒ Bonus de l'équipement",
                    statsSetPourFinales,
                    PEQ_STATS_FINALES,
                    { masquerZero: true, prefixe: "+" }
                )}

                ${PEQ_creerGrilleStats(
                    "✅ Stats finales simulées",
                    statsFinales,
                    PEQ_STATS_FINALES,
                    { masquerZero: false }
                )}
            </div>

            ${PEQ_creerBlocEquipements(details)}

            <div class="item-card">
                <details>
                    <summary>Voir JSON du profil simulé</summary>
                    <pre>${PEQ_echapperHTML(JSON.stringify(details, null, 2))}</pre>
                </details>
            </div>
        `;
    }

    function PEQ_afficherProfilDansConteneur(idProfil, idConteneur, options = {}) {
        const conteneur =
            document.getElementById(idConteneur);

        if (!conteneur) return null;

        const details =
            PEQ_creerDetailsProfil(idProfil, options);

        conteneur.innerHTML =
            PEQ_creerHTMLProfil(details);

        return details;
    }

    function PEQ_telechargerDernierProfil() {
        const details =
            Game.profilsEquipementSimulation.derniersDetails;

        if (!details) {
            alert("Aucun profil à télécharger pour le moment.");
            return;
        }

        const blob =
            new Blob(
                [JSON.stringify(details, null, 2)],
                { type: "application/json" }
            );

        const url =
            URL.createObjectURL(blob);

        const lien =
            document.createElement("a");

        lien.href = url;
        lien.download = `profil_equipement_${details.profil.id}_${Date.now()}.json`;
        lien.click();

        URL.revokeObjectURL(url);
    }

    function PEQ_visualiserProfilDepuisPage(forcerRegeneration = false) {
        const idProfil =
            document.getElementById("peqProfilVisualiseur")?.value || "actuel";

        PEQ_afficherProfilDansConteneur(
            idProfil,
            "peqResultatVisualiseur",
            { forcerRegeneration }
        );
    }

    function PEQ_ouvrirSimulateurAvecProfilVisualise() {
        const details =
            Game.profilsEquipementSimulation.derniersDetails;

        if (!details) {
            alert("Visualise d'abord un profil.");
            return;
        }

        if (typeof window.ouvrirSimulateurCombat === "function") {
            window.ouvrirSimulateurCombat();

            setTimeout(() => {
                const select =
                    document.getElementById("simulateurProfilEquipement");

                if (select) {
                    select.value = details.profil.id;
                }

                PEQ_previsualiserProfilDepuisSimulateur(false);
            }, 0);
        }
    }

    function ouvrirVisualiseurProfilsEquipements() {
        if (typeof window.changerVue === "function") {
            window.changerVue("profils_equipements");
        } else {
            Game.ui = Game.ui || {};
            Game.ui.vueActive = "profils_equipements";
        }

        const html = `
            <div class="item-card">
                <h2>🧍 Profils d'équipement simulés</h2>
                <p>
                    Cette page permet de visualiser le faux joueur utilisé par le simulateur :
                    niveau, statistiques de base, bonus d'équipement, statistiques finales et pièces générées.
                </p>
                <p class="texte-muted">
                    Rien ici ne modifie l'inventaire réel, le personnage réel ou la sauvegarde.
                </p>
            </div>

            <div class="item-card peq-formulaire">
                <label>
                    Profil à visualiser
                    <select id="peqProfilVisualiseur">
                        ${PEQ_listeProfilsOptionsHTML("guerrier_5_standard")}
                    </select>
                </label>

                <div class="peq-actions">
                    <button onclick="PEQ_visualiserProfilDepuisPage(false)">👁 Visualiser</button>
                    <button onclick="PEQ_visualiserProfilDepuisPage(true)">🎲 Régénérer le profil</button>
                    <button onclick="PEQ_telechargerDernierProfil()">💾 Télécharger JSON</button>
                    <button onclick="PEQ_ouvrirSimulateurAvecProfilVisualise()">🧪 Ouvrir dans le simulateur</button>
                </div>
            </div>

            <div id="peqResultatVisualiseur"></div>
        `;

        if (typeof window.afficherVuePrincipale === "function") {
            window.afficherVuePrincipale(html);
        } else {
            const vue =
                document.getElementById("vuePrincipale");

            if (vue) {
                vue.innerHTML = html;
            }
        }

        PEQ_visualiserProfilDepuisPage(true);
    }

    function PEQ_injecterStyle() {
        if (document.getElementById("peq-style-v072")) return;

        const style =
            document.createElement("style");

        style.id = "peq-style-v072";
        style.textContent = `
            .peq-formulaire {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .peq-formulaire label,
            .simulateur-profil-equipement-label {
                display: flex;
                flex-direction: column;
                gap: 6px;
                color: var(--text-muted);
            }

            .peq-actions,
            .simulateur-profil-equipement-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }

            .peq-actions button,
            .simulateur-profil-equipement-actions button {
                width: auto;
            }

            .peq-profil-header {
                border-color: rgba(245, 211, 122, 0.24);
            }

            .peq-resume-grid {
                display: grid;
                grid-template-columns: repeat(6, minmax(0, 1fr));
                gap: 8px;
                margin-top: 12px;
            }

            .peq-resume-grid div,
            .peq-stat {
                display: flex;
                justify-content: space-between;
                gap: 8px;
                padding: 8px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: var(--radius-md, 8px);
            }

            .peq-resume-grid span,
            .peq-stat span {
                color: var(--text-muted);
            }

            .peq-resume-grid strong,
            .peq-stat strong {
                color: var(--gold);
            }

            .peq-trois-colonnes {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 10px;
            }

            .peq-stats-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-top: 10px;
            }

            .peq-stats-grid-small {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .peq-equipements-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            .peq-equipement-card {
                border-color: rgba(245, 211, 122, 0.16);
            }

            .peq-equipement-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
            }

            .peq-equipement-header h4 {
                margin-bottom: 4px;
            }

            .peq-slot-badge {
                flex-shrink: 0;
                padding: 5px 8px;
                color: var(--gold);
                border: 1px solid rgba(245, 211, 122, 0.18);
                border-radius: var(--radius-md, 8px);
                background: rgba(245, 211, 122, 0.08);
                font-size: 0.82rem;
            }

            .peq-effet-special {
                margin-top: 10px;
                padding: 10px;
                border: 1px solid rgba(245, 211, 122, 0.20);
                border-radius: var(--radius-md, 8px);
                background: rgba(245, 211, 122, 0.06);
            }

            .peq-effet-special p {
                margin-bottom: 0;
            }

            .peq-apercu-simulateur {
                margin-top: 10px;
            }

            .peq-apercu-simulateur .peq-trois-colonnes {
                grid-template-columns: 1fr;
            }

            .peq-apercu-simulateur .peq-equipements-grid {
                grid-template-columns: 1fr;
            }

            .peq-bloc-stats pre,
            #peqResultatVisualiseur pre {
                max-height: 320px;
                overflow: auto;
                padding: 10px;
                background: rgba(0, 0, 0, 0.35);
                border-radius: var(--radius-md, 8px);
                white-space: pre-wrap;
                font-size: 0.82rem;
            }

            @media (max-width: 1200px) {
                .peq-resume-grid {
                    grid-template-columns: repeat(3, minmax(0, 1fr));
                }

                .peq-trois-colonnes {
                    grid-template-columns: 1fr;
                }
            }

            @media (max-width: 800px) {
                .peq-resume-grid,
                .peq-stats-grid,
                .peq-equipements-grid {
                    grid-template-columns: 1fr;
                }

                .peq-actions button,
                .simulateur-profil-equipement-actions button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function PEQ_injecterSelectProfilSimulateur() {
        const formulaire =
            document.querySelector(".simulateur-combat-formulaire") ||
            document.querySelector("#vuePrincipale form") ||
            document.getElementById("vuePrincipale");

        if (!formulaire) return;

        if (document.getElementById("simulateurProfilEquipement")) return;

        const selectHTML = `
            <div class="item-card simulateur-profil-equipement-zone">
                <label class="simulateur-profil-equipement-label">
                    Profil joueur / équipement simulé
                    <select id="simulateurProfilEquipement">
                        ${PEQ_listeProfilsOptionsHTML("actuel")}
                    </select>
                </label>

                <p class="texte-muted simulateur-profil-equipement-aide">
                    Ces profils ne modifient pas la vraie sauvegarde. Ils servent uniquement
                    à tester les monstres contre une progression d'équipement réaliste.
                </p>

                <div class="simulateur-profil-equipement-actions">
                    <button onclick="PEQ_previsualiserProfilDepuisSimulateur(false)">👁 Visualiser le profil</button>
                    <button onclick="PEQ_previsualiserProfilDepuisSimulateur(true)">🎲 Régénérer</button>
                    <button onclick="ouvrirVisualiseurProfilsEquipements()">🧍 Page profils</button>
                </div>

                <div id="simulateurProfilEquipementApercu" class="peq-apercu-simulateur"></div>
            </div>
        `;

        const labelStrategie =
            document.getElementById("simulateurStrategieJoueur")?.closest("label");

        if (labelStrategie) {
            labelStrategie.insertAdjacentHTML(
                "afterend",
                selectHTML
            );
            return;
        }

        formulaire.insertAdjacentHTML(
            "beforeend",
            selectHTML
        );
    }

    function PEQ_previsualiserProfilDepuisSimulateur(forcerRegeneration = false) {
        const idProfil =
            document.getElementById("simulateurProfilEquipement")?.value || "actuel";

        return PEQ_afficherProfilDansConteneur(
            idProfil,
            "simulateurProfilEquipementApercu",
            { forcerRegeneration }
        );
    }

    function PEQ_creerInfoProfilPourRapport(details) {
        const listeEquipements =
            details.set && details.set.length
                ? details.set.map(objet => {
                    return `- ${objet.nom} (${objet.rarete}, niv. ${objet.niveau})`;
                }).join("\n")
                : "Aucun équipement procédural généré.";

        return {
            id: details.profil.id,
            nom: details.profil.nom,
            description: details.profil.description,
            niveau: details.snapshot.niveau,
            statsFinales: details.statsFinales,
            statsBase: details.base,
            bonusEquipement: details.statsSet,
            equipements: listeEquipements
        };
    }

    function PEQ_preparerOptionsSimulationAvecProfil(options = {}) {
        const profilId =
            options.profilEquipementId || "actuel";

        const details =
            PEQ_creerDetailsProfil(profilId, {
                forcerRegeneration: false
            });

        return {
            ...options,
            profilEquipementId: details.profil.id,
            profilEquipementNom: details.profil.nom,
            snapshotJoueurSimulation: details.snapshot,
            infosProfilSimulation: PEQ_creerInfoProfilPourRapport(details)
        };
    }

    function PEQ_installerInjectionSimulateur() {
        const originalOuvrirSimulateur =
            window.ouvrirSimulateurCombat;

        if (typeof originalOuvrirSimulateur === "function" && !originalOuvrirSimulateur.peqPatched) {
            const fonctionPatchee =
                function ouvrirSimulateurCombatAvecProfils() {
                    originalOuvrirSimulateur();
                    PEQ_injecterStyle();
                    PEQ_injecterSelectProfilSimulateur();
                };

            fonctionPatchee.peqPatched = true;
            window.ouvrirSimulateurCombat = fonctionPatchee;
        }

        const originalLireOptions =
            window.lireOptionsSimulationCombatDepuisUI;

        if (typeof originalLireOptions === "function" && !originalLireOptions.peqPatched) {
            const fonctionPatchee =
                function lireOptionsSimulationCombatDepuisUIAvecProfil() {
                    const options =
                        originalLireOptions();

                    options.profilEquipementId =
                        document.getElementById("simulateurProfilEquipement")?.value || "actuel";

                    return options;
                };

            fonctionPatchee.peqPatched = true;
            window.lireOptionsSimulationCombatDepuisUI = fonctionPatchee;
        }
    }


    function PEQ_obtenirActionSimulationDepuisId(idAction) {
        if (!idAction) return null;

        if (typeof idAction === "object") {
            return idAction;
        }

        return Game.cache?.competencesParId?.[idAction] || null;
    }

    function PEQ_acteurPeutPayerActionSimulation(acteur, action) {
        if (!acteur || !action) return false;

        const mana =
            Number(action?.couts?.mana) || 0;

        const stamina =
            Number(action?.couts?.stamina) || 0;

        return (
            (Number(acteur.mana) || 0) >= mana &&
            (Number(acteur.stamina) || 0) >= stamina
        );
    }

    function PEQ_choisirCompetenceOffensiveSimulation(acteur, options = {}) {
        if (!acteur || !Array.isArray(acteur.competences)) return null;

        const prefererMagique =
            Boolean(options.prefererMagique);

        const competences =
            acteur.competences
                .map(PEQ_obtenirActionSimulationDepuisId)
                .filter(action => {
                    return (
                        action &&
                        action.typeAction === "attaque" &&
                        PEQ_acteurPeutPayerActionSimulation(acteur, action)
                    );
                });

        if (!competences.length) return null;

        competences.sort((a, b) => {
            const scoreA =
                (Number(a.puissance) || 0) +
                (Number(a.multiplicateur) || 1) * 10 +
                (prefererMagique && a.nature === "magique" ? 8 : 0) +
                (!prefererMagique && a.nature === "physique" ? 3 : 0) +
                (Number(a.bonusCritique) || 0) * 0.6 -
                (Number(a.couts?.mana) || 0) * 0.12 -
                (Number(a.couts?.stamina) || 0) * 0.08;

            const scoreB =
                (Number(b.puissance) || 0) +
                (Number(b.multiplicateur) || 1) * 10 +
                (prefererMagique && b.nature === "magique" ? 8 : 0) +
                (!prefererMagique && b.nature === "physique" ? 3 : 0) +
                (Number(b.bonusCritique) || 0) * 0.6 -
                (Number(b.couts?.mana) || 0) * 0.12 -
                (Number(b.couts?.stamina) || 0) * 0.08;

            return scoreB - scoreA;
        });

        return competences[0];
    }


    function PEQ_appliquerAjustementMidgame093(stats, niveau) {
        if (!stats || typeof stats !== "object") return stats;

        const n =
            Number(niveau || stats.niveau || stats.level || 1);

        function mult(cle, facteur) {
            if (typeof stats[cle] === "number") {
                stats[cle] *= facteur;
            }
        }

        function add(cle, valeur) {
            if (typeof stats[cle] === "number") {
                stats[cle] += valeur;
            }
        }

        // v0.9.3.3 :
        // Le niveau 8 est maintenant correct, mais 12-15 reste trop dur.
        // On garde un buff léger au niveau 8, plus visible autour de 12.
        if (n >= 8 && n <= 15) {
            const centreMid =
                Math.max(0, 1 - Math.abs(n - 12) / 5);

            mult("pvMax", 1.045 + centreMid * 0.055);
            mult("defensePhysique", 1.035 + centreMid * 0.045);
            mult("defenseMagique", 1.035 + centreMid * 0.040);
            mult("attaquePhysique", 1.020 + centreMid * 0.025);
            mult("attaqueMagique", 1.030 + centreMid * 0.030);
            add("pvMax", 5 + n * (0.50 + centreMid * 0.28));
        }

        // Niveau 5 reste un peu bas, mais il ne faut pas le surprotéger.
        if (n >= 5 && n < 8) {
            mult("pvMax", 1.025);
            mult("defensePhysique", 1.02);
            mult("defenseMagique", 1.02);
        }

        return stats;
    }

    function PEQ_installerIACompetencesSimulation087() {
        if (
            typeof window.choisirActionSimulationJoueur !== "function" ||
            typeof window.choisirActionSimulationEnnemi !== "function"
        ) {
            return;
        }

        if (!window.choisirActionSimulationJoueur.peq087Patched) {
            const originalJoueur =
                window.choisirActionSimulationJoueur;

            const fonctionJoueur =
                function choisirActionSimulationJoueurCompetences087(combatSimulation) {
                    const joueur =
                        combatSimulation?.joueur;

                    const classe =
                        String(joueur?.profilSimulation?.classe || "");

                    const ratioPV =
                        joueur?.pvMax
                            ? joueur.pv / joueur.pvMax
                            : 1;

                    // On laisse l'ancienne IA gérer les potions et la défense d'urgence.
                    if (
                        combatSimulation?.strategieJoueur === "prudent" &&
                        ratioPV <= 0.34
                    ) {
                        return originalJoueur(combatSimulation);
                    }

                    const prefereMagique =
                        classe === "mage" ||
                        classe === "necromancien" ||
                        classe === "paladin";

                    const chanceUsage =
                        classe === "mage" || classe === "necromancien"
                            ? 0.66
                            : classe === "paladin"
                                ? 0.58
                                : 0.48;

                    const competence =
                        PEQ_choisirCompetenceOffensiveSimulation(
                            joueur,
                            {
                                prefererMagique: prefereMagique
                            }
                        );

                    if (competence && Math.random() < chanceUsage) {
                        return competence;
                    }

                    return originalJoueur(combatSimulation);
                };

            fonctionJoueur.peq087Patched = true;
            window.choisirActionSimulationJoueur = fonctionJoueur;
        }

        if (!window.choisirActionSimulationEnnemi.peq087Patched) {
            const originalEnnemi =
                window.choisirActionSimulationEnnemi;

            const fonctionEnnemi =
                function choisirActionSimulationEnnemiCompetences087(combatSimulation) {
                    const ennemi =
                        combatSimulation?.ennemi;

                    const competence =
                        PEQ_choisirCompetenceOffensiveSimulation(
                            ennemi,
                            {
                                prefererMagique:
                                    (Number(ennemi?.baseStats?.attaqueMagique) || 0) >
                                    (Number(ennemi?.baseStats?.attaquePhysique) || 0)
                            }
                        );

                    if (competence && Math.random() < 0.48) {
                        return competence;
                    }

                    return originalEnnemi(combatSimulation);
                };

            fonctionEnnemi.peq087Patched = true;
            window.choisirActionSimulationEnnemi = fonctionEnnemi;
        }
    }

    function PEQ_installerSimulationAvecProfil() {
        const fonctionsNecessaires = [
            "creerSnapshotCombatMonstre",
            "creerStatsSimulationCombatVides",
            "ajouterLogSimulationCombat",
            "obtenirActeurPretSimulationCombat",
            "vitesseEffective",
            "choisirActionSimulationJoueur",
            "choisirActionSimulationEnnemi",
            "appliquerActionSimulationCombat",
            "calculerResumeSimulationCombat"
        ];

        const simulateurPret =
            fonctionsNecessaires.every(nomFonction => typeof window[nomFonction] === "function");

        if (!simulateurPret) {
            console.warn(
                "Profils équipements : le simulateur complet n'est pas encore disponible pour override. La visualisation reste active."
            );
            return;
        }

        if (!window.simulerUnCombatAutomatise?.peqPatched) {
            const fonctionPatchee =
                function simulerUnCombatAutomatiseAvecProfil(monstre, options = {}) {
                    const joueur =
                        PEQ_cloner(
                            options.snapshotJoueurSimulation ||
                            PEQ_creerSnapshotJoueurActuel()
                        );

                    const ennemi =
                        PEQ_cloner(
                            window.creerSnapshotCombatMonstre(monstre)
                        );

                    joueur.pv = joueur.pvMax;
                    joueur.mana = joueur.manaMax;
                    joueur.stamina = joueur.staminaMax;
                    joueur.initiative = 0;
                    joueur.defenseActive = false;

                    ennemi.pv = ennemi.pvMax;
                    ennemi.mana = ennemi.manaMax;
                    ennemi.stamina = ennemi.staminaMax;
                    ennemi.initiative = 0;
                    ennemi.defenseActive = false;

                    const stats =
                        window.creerStatsSimulationCombatVides();

                    const logs = [];

                    const combatSimulation = {
                        indexCombat: options.indexCombat || 1,
                        tour: 1,
                        joueur,
                        ennemi,
                        stats,
                        logs,
                        statut: "en_cours",
                        potionsRestantes: Number(options.potionsMax) || 0,
                        idPotion: options.idPotion || "potion_soin",
                        strategieJoueur: options.strategieJoueur || "prudent"
                    };

                    window.ajouterLogSimulationCombat(
                        combatSimulation,
                        `⚔ Combat ${combatSimulation.indexCombat} : ${ennemi.nom} apparaît contre ${joueur.nom}.`
                    );

                    const limiteActions = 500;
                    let compteurActions = 0;

                    while (
                        combatSimulation.statut === "en_cours" &&
                        compteurActions < limiteActions
                    ) {
                        const acteur =
                            window.obtenirActeurPretSimulationCombat(
                                combatSimulation
                            );

                        if (!acteur) {
                            joueur.initiative +=
                                window.vitesseEffective(joueur);

                            ennemi.initiative +=
                                window.vitesseEffective(ennemi);

                            continue;
                        }

                        const cible =
                            acteur.camp === "joueur"
                                ? ennemi
                                : joueur;

                        const action =
                            acteur.camp === "joueur"
                                ? window.choisirActionSimulationJoueur(combatSimulation)
                                : window.choisirActionSimulationEnnemi(combatSimulation);

                        window.appliquerActionSimulationCombat(
                            combatSimulation,
                            acteur,
                            cible,
                            action
                        );

                        compteurActions++;

                        if (ennemi.pv <= 0 && joueur.pv <= 0) {
                            combatSimulation.statut =
                                acteur.camp === "joueur"
                                    ? "victoire"
                                    : "defaite";
                            break;
                        }

                        if (ennemi.pv <= 0) {
                            combatSimulation.statut = "victoire";
                            break;
                        }

                        if (joueur.pv <= 0) {
                            combatSimulation.statut = "defaite";
                            break;
                        }

                        if (acteur.camp === "ennemi") {
                            combatSimulation.tour++;
                        }
                    }

                    if (combatSimulation.statut === "en_cours") {
                        combatSimulation.statut = "limite_actions";
                    }

                    stats.resultat = combatSimulation.statut;
                    stats.pvJoueurRestants = Math.max(0, joueur.pv);
                    stats.pvEnnemiRestants = Math.max(0, ennemi.pv);
                    stats.tours = combatSimulation.tour;

                    window.ajouterLogSimulationCombat(
                        combatSimulation,
                        `🏁 Résultat : ${combatSimulation.statut}. PV joueur : ${stats.pvJoueurRestants}/${joueur.pvMax}. PV ennemi : ${stats.pvEnnemiRestants}/${ennemi.pvMax}.`
                    );

                    return {
                        index: combatSimulation.indexCombat,
                        resultat: combatSimulation.statut,
                        stats,
                        logs: options.logsComplets ? logs : []
                    };
                };

            fonctionPatchee.peqPatched = true;
            window.simulerUnCombatAutomatise = fonctionPatchee;
        }

        if (!window.lancerSimulationCombatAutomatisee?.peqPatched) {
            const fonctionPatchee =
                function lancerSimulationCombatAutomatiseeAvecProfils(monstre, options = {}) {
                    const debut = Date.now();

                    const optionsAvecProfil =
                        PEQ_preparerOptionsSimulationAvecProfil(options);

                    const nombreCombats =
                        Math.max(
                            1,
                            Number(optionsAvecProfil.nombreCombats) || 1
                        );

                    const resultats = [];

                    for (let index = 0; index < nombreCombats; index++) {
                        const resultat =
                            window.simulerUnCombatAutomatise(
                                monstre,
                                {
                                    ...optionsAvecProfil,
                                    indexCombat: index + 1
                                }
                            );

                        resultats.push(resultat);
                    }

                    const snapshotJoueur =
                        optionsAvecProfil.snapshotJoueurSimulation;

                    const optionsRapport = {
                        ...optionsAvecProfil
                    };

                    delete optionsRapport.snapshotJoueurSimulation;

                    const rapport = {
                        date: new Date().toISOString(),

                        monstre: {
                            id: monstre.id,
                            nom: monstre.nom,
                            niveau: monstre.niveau,
                            pvMax: monstre.pvMax ?? monstre.pv,
                            attaque: monstre.attaque,
                            defense: monstre.defense,
                            attaqueMagique: monstre.attaqueMagique,
                            defenseMagique: monstre.defenseMagique,
                            critique: monstre.critique,
                            esquive: monstre.esquive,
                            vitesse: monstre.vitesse ?? 0,
                            typeMenace: monstre.typeMenace || monstre.menace || null,
                            procedural: Boolean(monstre.procedural || monstre.genere)
                        },

                        joueur: {
                            nom: snapshotJoueur.nom,
                            niveau: snapshotJoueur.niveau,
                            profilEquipementId: optionsAvecProfil.profilEquipementId,
                            profilEquipementNom: optionsAvecProfil.profilEquipementNom,
                            pvMax: snapshotJoueur.pvMax,
                            manaMax: snapshotJoueur.manaMax,
                            staminaMax: snapshotJoueur.staminaMax,
                            attaquePhysique: snapshotJoueur.baseStats.attaquePhysique,
                            defensePhysique: snapshotJoueur.baseStats.defensePhysique,
                            attaqueMagique: snapshotJoueur.baseStats.attaqueMagique,
                            defenseMagique: snapshotJoueur.baseStats.defenseMagique,
                            critique: snapshotJoueur.baseStats.critique,
                            esquive: snapshotJoueur.baseStats.esquive,
                            vitesse: snapshotJoueur.baseStats.vitesse,
                            equipementsProceduraux: snapshotJoueur.equipementsProceduraux || []
                        },

                        profilSimulation: optionsAvecProfil.infosProfilSimulation,
                        options: optionsRapport,
                        resume: window.calculerResumeSimulationCombat(resultats),
                        resultats,
                        dureeSimulationMs: Date.now() - debut
                    };

                    return rapport;
                };

            fonctionPatchee.peqPatched = true;
            window.lancerSimulationCombatAutomatisee = fonctionPatchee;
        }
    }

    window.PEQ_calculerBaseJoueurParNiveau = PEQ_calculerBaseJoueurParNiveau;
    window.PEQ_repartirPointsStatsSelonClasse = PEQ_repartirPointsStatsSelonClasse;
    window.PEQ_creerDetailsProfil = PEQ_creerDetailsProfil;
    window.PEQ_creerSnapshotJoueurDepuisProfil = PEQ_creerSnapshotJoueurDepuisProfil;
    window.PEQ_visualiserProfilDepuisPage = PEQ_visualiserProfilDepuisPage;
    window.PEQ_previsualiserProfilDepuisSimulateur = PEQ_previsualiserProfilDepuisSimulateur;
    window.PEQ_telechargerDernierProfil = PEQ_telechargerDernierProfil;
    window.PEQ_ouvrirSimulateurAvecProfilVisualise = PEQ_ouvrirSimulateurAvecProfilVisualise;
    window.ouvrirVisualiseurProfilsEquipements = ouvrirVisualiseurProfilsEquipements;

    PEQ_injecterStyle();
    PEQ_installerInjectionSimulateur();
    PEQ_installerSimulationAvecProfil();
    PEQ_installerIACompetencesSimulation087();
    setTimeout(PEQ_installerIACompetencesSimulation087, 250);
    setTimeout(PEQ_installerIACompetencesSimulation087, 1000);

    PEQ_enregistrerCompetencesProfil();

    console.log("✅ Profils_Equipements_Simulateur.js chargé — lissage midgame 12-15 " + PEQ_VERSION);
})();
