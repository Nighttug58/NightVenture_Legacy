/* ========================================================================== 
   MONSTRES PROCÉDURAUX — v1.12.3 STABLE THREATS NightVenture
   Générateur de monstres compatibles Combat V2 — menaces/templates conservés, correction côté progression joueur.
   Ne modifie pas les monstres JSON, ne remplace pas encore les rencontres.
   ========================================================================== */

if (typeof Game !== "undefined") {
    Game.monstresProceduraux ??= {
        derniers: [],
        dernierRapport: null
    };
}

const MP_CONFIG_MENACES = {
    faible: {
        id: "faible",
        nom: "Faible",
        icone: "🟢",
        multiplicateurs: {
            // v1.11 :
            // v0.9.1 a réussi la courbe de progression, mais faible est remonté à 95.8%.
            // On renforce un peu, sans transformer faible en vraie menace.
            pv: 1.60,
            attaque: 1.30,
            defense: 1.05,
            magie: 1.30,
            defenseMagique: 1.05,
            vitesse: 1.00,
            critique: 0.90,
            esquive: 0.74,
            xp: 0.70,
            or: 0.65
        }
    },

    normal: {
        id: "normal",
        nom: "Normal",
        icone: "⚪",
        multiplicateurs: {
            // v1.11 :
            // v0.9.1 place normal à 81.3%, trop au-dessus de la cible.
            // Recalage modéré : plus de pression, mais pas de retour au mur punitif.
            pv: 1.62,
            attaque: 1.47,
            defense: 1.20,
            magie: 1.47,
            defenseMagique: 1.20,
            vitesse: 1.04,
            critique: 1.09,
            esquive: 0.86,
            xp: 1.00,
            or: 1.00
        }
    },

    fort: {
        id: "fort",
        nom: "Fort",
        icone: "🟠",
        multiplicateurs: {
            // Fort est déjà dans la cible globale ; on évite de le durcir.
            pv: 1.66,
            attaque: 1.46,
            defense: 1.25,
            magie: 1.46,
            defenseMagique: 1.25,
            vitesse: 1.05,
            critique: 1.10,
            esquive: 0.88,
            xp: 1.45,
            or: 1.35
        }
    },

    elite: {
        id: "elite",
        nom: "Élite",
        icone: "🟣",
        multiplicateurs: {
            pv: 1.98,
            attaque: 1.70,
            defense: 1.45,
            magie: 1.70,
            defenseMagique: 1.45,
            vitesse: 1.07,
            critique: 1.20,
            esquive: 0.92,
            xp: 2.35,
            or: 2.10
        }
    },

    mini_boss: {
        id: "mini_boss",
        nom: "Mini-boss",
        icone: "🔴",
        multiplicateurs: {
            // v1.12.1 :
            // Rapport v0.9.3 : mini_boss à 3.9%, trop proche du boss.
            // Nouveau rôle : combat unique exigeant, plus dur que fort mais pas mur persistant.
            pv: 1.82,
            attaque: 1.66,
            defense: 1.30,
            magie: 1.66,
            defenseMagique: 1.30,
            vitesse: 1.04,
            critique: 1.17,
            esquive: 0.88,
            xp: 3.75,
            or: 3.25
        }
    },

    boss: {
        id: "boss",
        nom: "Boss",
        icone: "👑",
        multiplicateurs: {
            // v1.10 :
            // Boss plus rapides : moins de PV/def, pression légèrement supérieure.
            pv: 2.96,
            attaque: 2.62,
            defense: 1.84,
            magie: 2.62,
            defenseMagique: 1.84,
            vitesse: 1.05,
            critique: 1.48,
            esquive: 0.94,
            xp: 6.00,
            or: 5.25
        }
    }
};

const MP_TABLE_MENACES_DEFAUT = [
    { id: "faible", poids: 30 },
    { id: "normal", poids: 45 },
    { id: "fort", poids: 18 },
    { id: "elite", poids: 5 },
    { id: "mini_boss", poids: 1.5 },
    { id: "boss", poids: 0.5 }
];

const MP_TEMPLATES_MONSTRES = {
    rat: {
        id: "rat",
        nomBase: "Rat",
        famille: "bete",
        image: "assets/monstres/rat_geant.png",
        noms: ["Rat galeux", "Rat géant", "Rat des égouts", "Rat vorace"],
        poidsStats: {
            pv: 0.60,
            attaque: 0.80,
            defense: 0.30,
            magie: 0.10,
            defenseMagique: 0.30,
            vitesse: 1.25,
            critique: 0.80,
            esquive: 1.20,
            mana: 0.10,
            stamina: 0.90
        }
    },

    chauve_souris: {
        id: "chauve_souris",
        nomBase: "Chauve-souris",
        famille: "bete",
        image: "assets/monstres/chauve_souris_geante.png",
        noms: ["Chauve-souris géante", "Chauve-souris nocturne", "Vesper des cavernes"],
        poidsStats: {
            pv: 0.55,
            attaque: 0.75,
            defense: 0.25,
            magie: 0.25,
            defenseMagique: 0.45,
            vitesse: 1.65,
            critique: 1.20,
            esquive: 1.65,
            mana: 0.30,
            stamina: 1.15
        }
    },

    loup: {
        id: "loup",
        nomBase: "Loup",
        famille: "bete",
        image: "assets/monstres/loup_affame.png",
        noms: ["Loup affamé", "Loup des brumes", "Loup gris", "Loup rôdeur"],
        poidsStats: {
            pv: 0.90,
            attaque: 1.15,
            defense: 0.60,
            magie: 0.20,
            defenseMagique: 0.55,
            vitesse: 1.30,
            critique: 1.15,
            esquive: 1.10,
            mana: 0.20,
            stamina: 1.25
        }
    },

    gobelin: {
        id: "gobelin",
        nomBase: "Gobelin",
        famille: "humanoide",
        image: "assets/monstres/gobelin_eclaireur.png",
        noms: ["Gobelin éclaireur", "Gobelin pillard", "Gobelin sournois", "Gobelin guerrier"],
        poidsStats: {
            // v1.12.2 : gobelin encore un peu trop gratuit.
            pv: 1.04,
            attaque: 1.10,
            defense: 0.91,
            magie: 0.49,
            defenseMagique: 0.70,
            vitesse: 1.06,
            critique: 1.24,
            esquive: 0.94,
            mana: 0.60,
            stamina: 1.00
        }
    },

    squelette: {
        id: "squelette",
        nomBase: "Squelette",
        famille: "mort_vivant",
        image: "assets/monstres/squelette.png",
        noms: ["Squelette animé", "Squelette soldat", "Osseux errant"],
        poidsStats: {
            // v1.12.2 : squelette trop gratuit, offense et présence relevées.
            pv: 1.08,
            attaque: 1.24,
            defense: 1.14,
            magie: 0.64,
            defenseMagique: 1.04,
            vitesse: 0.79,
            critique: 0.94,
            esquive: 0.50,
            mana: 0.65,
            stamina: 0.95
        }
    },

    zombie: {
        id: "zombie",
        nomBase: "Zombie",
        famille: "mort_vivant",
        image: "assets/monstres/zombie.png",
        noms: ["Zombie putride", "Cadavre animé", "Marcheur corrompu"],
        poidsStats: {
            pv: 1.30,
            attaque: 0.95,
            defense: 0.95,
            magie: 0.25,
            defenseMagique: 0.70,
            vitesse: 0.45,
            critique: 0.30,
            esquive: 0.20,
            mana: 0.30,
            stamina: 0.85
        }
    },

    araignee: {
        id: "araignee",
        nomBase: "Araignée",
        famille: "bete",
        image: "assets/monstres/araignee_geante.png",
        noms: ["Araignée géante", "Tisseuse venimeuse", "Araignée des cavernes"],
        poidsStats: {
            // v1.12.2 : araignée légèrement trop facile, pression/critique relevés.
            pv: 0.88,
            attaque: 1.10,
            defense: 0.72,
            magie: 0.36,
            defenseMagique: 0.72,
            vitesse: 1.21,
            critique: 1.42,
            esquive: 1.13,
            mana: 0.40,
            stamina: 1.10
        }
    },

    orc: {
        id: "orc",
        nomBase: "Orc",
        famille: "humanoide",
        image: "assets/monstres/orc_guerrier.png",
        noms: ["Orc guerrier", "Orc brutal", "Orc berserker", "Orc des collines"],
        poidsStats: {
            pv: 1.20,
            attaque: 1.35,
            defense: 1.10,
            magie: 0.35,
            defenseMagique: 0.75,
            vitesse: 0.80,
            critique: 0.90,
            esquive: 0.55,
            mana: 0.50,
            stamina: 1.30
        }
    },

    mage_noir: {
        id: "mage_noir",
        nomBase: "Mage noir",
        famille: "humanoide",
        image: "assets/monstres/mage_noir.png",
        noms: ["Mage noir", "Adepte occulte", "Sorcier corrompu", "Thaumaturge sombre"],
        poidsStats: {
            // v1.12 :
            // Mage noir ressort dur en v0.9.2, surtout contre les classes magiques.
            // On garde son identité magique, mais on réduit un peu le pic de pression.
            pv: 1.04,
            attaque: 0.58,
            defense: 0.82,
            magie: 1.82,
            defenseMagique: 1.45,
            vitesse: 0.98,
            critique: 1.18,
            esquive: 0.82,
            mana: 1.85,
            stamina: 0.85
        }
    },

    golem: {
        id: "golem",
        nomBase: "Golem",
        famille: "construct",
        image: "assets/monstres/golem_pierre.png",
        noms: ["Golem de pierre", "Sentinelle de roche", "Gardien minéral"],
        poidsStats: {
            // v1.12.2 : golem trop facile ; plus de menace offensive, défense quasi stable.
            pv: 1.90,
            attaque: 1.36,
            defense: 1.74,
            magie: 0.30,
            defenseMagique: 1.68,
            vitesse: 0.38,
            critique: 0.14,
            esquive: 0.08,
            mana: 0.25,
            stamina: 1.05
        }
    },

    troll: {
        id: "troll",
        nomBase: "Troll",
        famille: "geants",
        image: "assets/monstres/troll_caverne.png",
        noms: ["Troll des cavernes", "Troll moussu", "Troll des marais"],
        poidsStats: {
            // v1.12.2 : troll un peu trop safe, pression physique relevée.
            pv: 1.78,
            attaque: 1.34,
            defense: 1.20,
            magie: 0.35,
            defenseMagique: 1.10,
            vitesse: 0.50,
            critique: 0.30,
            esquive: 0.15,
            mana: 0.50,
            stamina: 1.35
        }
    },

    wyverne: {
        id: "wyverne",
        nomBase: "Wyverne",
        famille: "dragonide",
        image: "assets/monstres/wyverne.png",
        noms: ["Wyverne", "Wyverne écarlate", "Wyverne des falaises"],
        poidsStats: {
            pv: 1.35,
            attaque: 1.35,
            defense: 0.95,
            magie: 0.65,
            defenseMagique: 0.90,
            vitesse: 1.20,
            critique: 1.25,
            esquive: 1.10,
            mana: 0.90,
            stamina: 1.45
        }
    },

    vampire: {
        id: "vampire",
        nomBase: "Vampire",
        famille: "mort_vivant",
        image: "assets/monstres/vampire.png",
        noms: ["Vampire ancien", "Noble vampire", "Buveur de sang"],
        poidsStats: {
            pv: 1.08,
            attaque: 1.04,
            defense: 0.90,
            magie: 0.95,
            defenseMagique: 1.05,
            vitesse: 1.20,
            critique: 1.18,
            esquive: 1.08,
            mana: 1.12,
            stamina: 1.05
        }
    },

    lich: {
        id: "lich",
        nomBase: "Liche",
        famille: "mort_vivant",
        image: "assets/monstres/lich.png",
        noms: ["Liche", "Archiliche", "Nécromancien immortel"],
        poidsStats: {
            pv: 1.05,
            attaque: 0.55,
            defense: 1.00,
            magie: 1.85,
            defenseMagique: 1.75,
            vitesse: 0.80,
            critique: 1.05,
            esquive: 0.65,
            mana: 2.00,
            stamina: 0.75
        }
    },

    dragon: {
        id: "dragon",
        nomBase: "Dragon",
        famille: "dragonide",
        image: "assets/monstres/dragon_jeune.png",
        noms: ["Jeune dragon", "Dragon rouge", "Dragon des cendres"],
        poidsStats: {
            pv: 1.78,
            attaque: 1.42,
            defense: 1.36,
            magie: 1.08,
            defenseMagique: 1.32,
            vitesse: 0.76,
            critique: 0.86,
            esquive: 0.48,
            mana: 1.15,
            stamina: 1.48
        }
    },

    demon: {
        id: "demon",
        nomBase: "Démon",
        famille: "demon",
        image: "assets/monstres/seigneur_demon.png",
        noms: ["Démon mineur", "Seigneur démon", "Héraut infernal"],
        poidsStats: {
            pv: 1.55,
            attaque: 1.55,
            defense: 1.25,
            magie: 1.55,
            defenseMagique: 1.25,
            vitesse: 1.00,
            critique: 1.25,
            esquive: 0.85,
            mana: 1.60,
            stamina: 1.35
        }
    }
};


function MP_enregistrerCompetencesProcedurales() {
    if (typeof Game === "undefined") return;

    Game.cache ??= {};
    Game.cache.competencesParId ??= {};

    const competences = {
        mp_entaille_os: {
            id: "mp_entaille_os",
            nom: "Entaille osseuse",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 4 },
            coutInitiative: 105,
            puissance: 5,
            multiplicateur: 1.02,
            bonusCritique: 1
        },

        mp_eclair_noir: {
            id: "mp_eclair_noir",
            nom: "Éclair noir",
            typeAction: "attaque",
            nature: "magique",
            cible: "ennemi",
            couts: { mana: 7, stamina: 0 },
            coutInitiative: 102,
            puissance: 10,
            multiplicateur: 1.12,
            bonusCritique: 3
        },

        mp_poing_roche: {
            id: "mp_poing_roche",
            nom: "Poing de roche",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 8 },
            coutInitiative: 118,
            puissance: 8,
            multiplicateur: 0.92,
            bonusCritique: -2,
            bonusEsquive: -2
        },

        mp_morsure_vampire: {
            id: "mp_morsure_vampire",
            nom: "Morsure vampirique",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 6 },
            coutInitiative: 96,
            puissance: 5,
            multiplicateur: 0.92,
            bonusCritique: 3
        },

        mp_morsure_dragon: {
            id: "mp_morsure_dragon",
            nom: "Morsure draconique",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 9 },
            coutInitiative: 122,
            puissance: 8,
            multiplicateur: 0.84,
            bonusCritique: -1
        },

        mp_griffe_predateur: {
            id: "mp_griffe_predateur",
            nom: "Griffe prédatrice",
            typeAction: "attaque",
            nature: "physique",
            cible: "ennemi",
            couts: { mana: 0, stamina: 5 },
            coutInitiative: 95,
            puissance: 4,
            multiplicateur: 0.98,
            bonusCritique: 2
        }
    };

    Object.entries(competences).forEach(([id, competence]) => {
        Game.cache.competencesParId[id] = {
            ...competence,
            id
        };
    });
}

function MP_obtenirCompetencesPourTemplate(templateId, menaceId) {
    const menace =
        menaceId || "normal";

    const base =
        ["attaque_simple_monstre"];

    const parTemplate = {
        squelette: ["mp_entaille_os", "attaque_simple_monstre"],
        mage_noir: ["mp_eclair_noir", "attaque_simple_monstre"],
        golem: ["mp_poing_roche", "attaque_simple_monstre"],
        vampire: ["mp_morsure_vampire", "attaque_simple_monstre"],
        dragon: ["mp_morsure_dragon", "attaque_simple_monstre"],
        loup: ["mp_griffe_predateur", "attaque_simple_monstre"],
        araignee: ["mp_griffe_predateur", "attaque_simple_monstre"],
        orc: ["attaque_simple_monstre", "mp_griffe_predateur"],
        troll: ["attaque_simple_monstre", "mp_poing_roche"]
    };

    const liste =
        parTemplate[templateId] || base;

    if (menace === "faible") {
        return liste.includes("attaque_simple_monstre")
            ? ["attaque_simple_monstre"]
            : base;
    }

    return liste;
}


const MP_VARIANTES = [
    {
        id: "affame",
        prefixe: "Affamé",
        suffixe: "affamé",
        poids: 18,
        mod: {
            pv: 0.90,
            attaque: 1.12,
            defense: 0.90,
            vitesse: 1.05,
            critique: 1.05,
            esquive: 1.00
        }
    },
    {
        id: "alpha",
        prefixe: "Alpha",
        suffixe: "alpha",
        poids: 12,
        mod: {
            pv: 1.20,
            attaque: 1.15,
            defense: 1.05,
            vitesse: 1.05,
            critique: 1.10,
            esquive: 1.00
        }
    },
    {
        id: "cuirasse",
        prefixe: "Cuirassé",
        suffixe: "cuirassé",
        poids: 12,
        mod: {
            pv: 1.12,
            attaque: 0.95,
            defense: 1.30,
            defenseMagique: 1.15,
            vitesse: 0.85,
            critique: 0.90,
            esquive: 0.70
        }
    },
    {
        id: "vif",
        prefixe: "Vif",
        suffixe: "vif",
        poids: 14,
        mod: {
            pv: 0.90,
            attaque: 1.00,
            defense: 0.90,
            vitesse: 1.30,
            critique: 1.10,
            esquive: 1.25
        }
    },
    {
        id: "enrage",
        prefixe: "Enragé",
        suffixe: "enragé",
        poids: 10,
        mod: {
            pv: 1.00,
            attaque: 1.35,
            defense: 0.80,
            vitesse: 1.05,
            critique: 1.35,
            esquive: 0.85
        }
    },
    {
        id: "ancien",
        prefixe: "Ancien",
        suffixe: "ancien",
        poids: 8,
        mod: {
            pv: 1.30,
            attaque: 1.10,
            defense: 1.20,
            magie: 1.15,
            defenseMagique: 1.25,
            vitesse: 0.90,
            critique: 1.00,
            esquive: 0.80
        }
    },
    {
        id: "spectral",
        prefixe: "Spectral",
        suffixe: "spectral",
        poids: 7,
        mod: {
            pv: 0.95,
            attaque: 0.90,
            defense: 0.85,
            magie: 1.25,
            defenseMagique: 1.40,
            vitesse: 1.10,
            critique: 1.15,
            esquive: 1.45
        }
    }
];

function MP_nombreAleatoire(min, max) {
    return min + Math.random() * (max - min);
}

function MP_entierAleatoire(min, max) {
    return Math.floor(
        MP_nombreAleatoire(min, max + 1)
    );
}

function MP_choisirPondere(table) {
    const total =
        table.reduce((acc, entree) => acc + (Number(entree.poids) || 0), 0);

    if (total <= 0) return table[0];

    let tirage =
        Math.random() * total;

    for (const entree of table) {
        tirage -= Number(entree.poids) || 0;

        if (tirage <= 0) {
            return entree;
        }
    }

    return table[table.length - 1];
}

function MP_arrondir(nombre, decimales = 0) {
    const facteur =
        Math.pow(10, decimales);

    return Math.round((Number(nombre) || 0) * facteur) / facteur;
}

function MP_echapperHTML(valeur) {
    const div =
        document.createElement("div");

    div.textContent =
        String(valeur ?? "");

    return div.innerHTML;
}

function MP_genererUID(prefixe = "mob") {
    return `${prefixe}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function MP_obtenirNiveauJoueurActuel() {
    if (typeof Game === "undefined") return 1;

    return Math.max(
        1,
        Number(Game.data?.personnage?.niveau) || 1
    );
}

function MP_obtenirTemplate(templateId) {
    if (templateId && templateId !== "aleatoire") {
        return MP_TEMPLATES_MONSTRES[templateId] || MP_TEMPLATES_MONSTRES.rat;
    }

    const templates =
        Object.values(MP_TEMPLATES_MONSTRES)
            .map(template => {
                let poids = 10;

                if (["dragon", "demon", "lich"].includes(template.id)) {
                    poids = 3;
                }

                if (["rat", "loup", "gobelin", "squelette"].includes(template.id)) {
                    poids = 14;
                }

                return {
                    id: template.id,
                    poids,
                    template
                };
            });

    return MP_choisirPondere(templates).template;
}

function MP_obtenirMenace(typeMenace) {
    if (typeMenace && typeMenace !== "aleatoire") {
        return MP_CONFIG_MENACES[typeMenace] || MP_CONFIG_MENACES.normal;
    }

    const choix =
        MP_choisirPondere(MP_TABLE_MENACES_DEFAUT);

    return MP_CONFIG_MENACES[choix.id] || MP_CONFIG_MENACES.normal;
}

function MP_genererNiveauDepuisFenetre(niveauReference, offsetBas, offsetHaut) {
    const niveauMin =
        Math.max(
            1,
            Number(niveauReference) + Number(offsetBas)
        );

    const niveauMax =
        Math.max(
            niveauMin,
            Number(niveauReference) + Number(offsetHaut)
        );

    const table = [];

    for (let niveau = niveauMin; niveau <= niveauMax; niveau++) {
        const distance =
            Math.abs(niveau - niveauReference);

        const poids =
            Math.max(
                1,
                10 - distance * 1.5
            );

        table.push({ niveau, poids });
    }

    return MP_choisirPondere(table).niveau;
}

function MP_genererVariante(typeMenace) {
    if (typeMenace === "faible" && Math.random() < 0.65) {
        return null;
    }

    if (typeMenace === "normal" && Math.random() < 0.45) {
        return null;
    }

    const entree =
        MP_choisirPondere(MP_VARIANTES);

    return entree || null;
}

function MP_appliquerModificateur(valeur, mod, cle) {
    if (!mod) return valeur;

    return valeur * (Number(mod[cle]) || 1);
}

function MP_creerNomMonstre(template, menace, variante, niveau) {
    const base =
        template.noms[
            MP_entierAleatoire(0, template.noms.length - 1)
        ] || template.nomBase;

    const menacePrefixe = {
        faible: "",
        normal: "",
        fort: "Robuste",
        elite: "Élite",
        mini_boss: "Champion",
        boss: "Seigneur"
    }[menace.id] || "";

    const morceaux = [];

    if (menacePrefixe) {
        morceaux.push(menacePrefixe);
    }

    morceaux.push(base);

    if (variante?.suffixe) {
        morceaux.push(variante.suffixe);
    }

    if (menace.id === "boss") {
        morceaux.push(`niv. ${niveau}`);
    }

    return morceaux.join(" ");
}

function MP_calculerStatsBaseNiveau(niveau) {
    const n =
        Math.max(1, Number(niveau) || 1);

    // v1.4 :
    // Courbe corrigée après le rapport profond :
    // - le hard buff v1.3 faisait subir 110% à 160% des PV du joueur en moyenne ;
    // - on réduit surtout le burst offensif ;
    // - on conserve assez de PV pour éviter de revenir aux combats gratuits.
    return {
        pv: 52 + n * 15.50,
        mana: 12 + n * 5.60,
        stamina: 64 + n * 5.80,

        attaque: 6 + n * 3.10,
        defense: 2 + n * 1.08,
        attaqueMagique: 5 + n * 2.90,
        defenseMagique: 2 + n * 1.00,

        vitesse: 7 + n * 0.32,
        critique: 3 + n * 0.14,
        esquive: 2 + n * 0.09,

        xp: 9 + n * 11,
        or: 3 + n * 5
    };
}

function MP_calculerStatMonstre(base, poids, menace, variante, cleBase, clePoids, cleMenace, decimales = 0) {
    const valeurBase =
        Number(base[cleBase]) || 0;

    const poidsTemplate =
        Number(poids[clePoids]) || 1;

    const multiplicateurMenace =
        Number(menace.multiplicateurs[cleMenace]) || 1;

    const multiplicateurVariante =
        Number(variante?.mod?.[clePoids]) || 1;

    const variance =
        MP_nombreAleatoire(0.92, 1.08);

    return MP_arrondir(
        valeurBase * poidsTemplate * multiplicateurMenace * multiplicateurVariante * variance,
        decimales
    );
}

function MP_appliquerCapsEtDangerMonstre(monstre) {
    const niveau =
        Math.max(1, Number(monstre?.niveau) || 1);

    // v1.4 :
    // Critique / esquive restent utiles mais ne doivent plus transformer
    // chaque monstre en machine à burst ou en mur intouchable.
    const capCritique =
        Math.min(42, 5 + niveau * 0.38);

    const capEsquive =
        Math.min(24, 3 + niveau * 0.22);

    const capVitesse =
        Math.min(48, 8 + niveau * 0.52);

    monstre.critique =
        MP_arrondir(Math.min(Number(monstre.critique) || 0, capCritique), 1);

    monstre.esquive =
        MP_arrondir(Math.min(Number(monstre.esquive) || 0, capEsquive), 1);

    monstre.vitesse =
        MP_arrondir(Math.max(1, Math.min(Number(monstre.vitesse) || 1, capVitesse)), 1);

    monstre.pvMax =
        Math.max(1, Math.round(Number(monstre.pvMax) || Number(monstre.pv) || 1));

    monstre.pv =
        monstre.pvMax;

    monstre.manaMax =
        Math.max(0, Math.round(Number(monstre.manaMax) || Number(monstre.mana) || 0));

    monstre.mana =
        monstre.manaMax;

    monstre.staminaMax =
        Math.max(30, Math.round(Number(monstre.staminaMax) || Number(monstre.stamina) || 30));

    monstre.stamina =
        monstre.staminaMax;

    return monstre;
}

function genererMonstreProcedural(options = {}) {
    const niveauReference =
        Math.max(
            1,
            Number(options.niveauReference) || MP_obtenirNiveauJoueurActuel()
        );

    const modeNiveau =
        options.modeNiveau || "fenetre";

    const niveau =
        modeNiveau === "fixe"
            ? Math.max(1, Number(options.niveauFixe) || niveauReference)
            : MP_genererNiveauDepuisFenetre(
                niveauReference,
                Number(options.offsetBas ?? -6),
                Number(options.offsetHaut ?? 3)
            );

    const template =
        MP_obtenirTemplate(options.templateId || "aleatoire");

    const menace =
        MP_obtenirMenace(options.typeMenace || "aleatoire");

    const variante =
        MP_genererVariante(menace.id);

    const base =
        MP_calculerStatsBaseNiveau(niveau);

    const poids =
        template.poidsStats;

    const nom =
        MP_creerNomMonstre(
            template,
            menace,
            variante,
            niveau
        );

    const pv =
        Math.max(
            1,
            MP_calculerStatMonstre(base, poids, menace, variante, "pv", "pv", "pv")
        );

    const mana =
        Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "mana", "mana", "magie")
        );

    const stamina =
        Math.max(
            20,
            MP_calculerStatMonstre(base, poids, menace, variante, "stamina", "stamina", "attaque")
        );

    const monstre = {
        id: MP_genererUID("mob_proc"),
        uid: MP_genererUID("mob_uid"),
        genere: true,
        procedural: true,

        nom,
        nomBase: template.nomBase,
        templateId: template.id,
        famille: template.famille,
        typeMenace: menace.id,
        nomMenace: menace.nom,
        varianteId: variante?.id || null,
        varianteNom: variante?.suffixe || null,

        niveau,
        niveauReference,

        pv,
        pvMax: pv,
        mana,
        manaMax: mana,
        stamina,
        staminaMax: stamina,

        attaque: Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "attaque", "attaque", "attaque")
        ),
        defense: Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "defense", "defense", "defense")
        ),
        attaqueMagique: Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "attaqueMagique", "magie", "magie")
        ),
        defenseMagique: Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "defenseMagique", "defenseMagique", "defenseMagique")
        ),
        critique: Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "critique", "critique", "critique", 1)
        ),
        esquive: Math.max(
            0,
            MP_calculerStatMonstre(base, poids, menace, variante, "esquive", "esquive", "esquive", 1)
        ),
        vitesse: Math.max(
            1,
            MP_calculerStatMonstre(base, poids, menace, variante, "vitesse", "vitesse", "vitesse", 1)
        ),

        xp: Math.max(
            1,
            MP_calculerStatMonstre(base, { xp: 1 }, menace, null, "xp", "xp", "xp")
        ),
        or: Math.max(
            0,
            MP_calculerStatMonstre(base, { or: 1 }, menace, null, "or", "or", "or")
        ),

        loot: [],
        competences: MP_obtenirCompetencesPourTemplate(template.id, menace.id),
        ia: {
            profil: menace.id === "boss" || menace.id === "mini_boss"
                ? "prudent"
                : "agressif"
        },

        description: `Monstre procédural ${menace.nom.toLowerCase()} de niveau ${niveau}.`,
        image: template.image || ""
    };

    return monstre;
}

function genererLotMonstresProceduraux(options = {}) {
    const quantite =
        Math.max(
            1,
            Math.min(
                500,
                Number(options.quantite) || 1
            )
        );

    const monstres = [];

    for (let index = 0; index < quantite; index++) {
        monstres.push(
            genererMonstreProcedural(options)
        );
    }

    return monstres;
}

function ouvrirTestMonstresProceduraux() {
    changerVue("monstres_proceduraux");

    const niveauJoueur =
        MP_obtenirNiveauJoueurActuel();

    const templatesOptions =
        [
            `<option value="aleatoire">Aléatoire</option>`,
            ...Object.values(MP_TEMPLATES_MONSTRES).map(template => {
                return `
                    <option value="${MP_echapperHTML(template.id)}">
                        ${MP_echapperHTML(template.id)} — ${MP_echapperHTML(template.nomBase)}
                    </option>
                `;
            })
        ].join("");

    const menacesOptions =
        [
            `<option value="aleatoire">Aléatoire pondéré</option>`,
            ...Object.values(MP_CONFIG_MENACES).map(menace => {
                return `
                    <option value="${MP_echapperHTML(menace.id)}">
                        ${menace.icone} ${MP_echapperHTML(menace.nom)}
                    </option>
                `;
            })
        ].join("");

    const derniers =
        Game.monstresProceduraux?.derniers || [];

    const dernierRapport =
        Game.monstresProceduraux?.dernierRapport || null;

    let html = `
        <div class="item-card">
            <h2>👹 Générateur de monstres procéduraux</h2>

            <p>
                Génère des monstres compatibles avec Combat V2 à partir d'un niveau,
                d'un template et d'un type de menace.
            </p>

            <p class="texte-muted">
                Version isolée : les monstres générés ne remplacent pas encore les monstres JSON
                et ne sont pas encore injectés dans les zones. La simulation rapide utilise le simulateur Combat V2 sans modifier la partie.
            </p>
        </div>

        <div class="item-card generateur-monstre-formulaire">
            <h3>⚙ Réglages génération</h3>

            <label>
                Mode de niveau
                <select id="mpModeNiveau">
                    <option value="fenetre" selected>Fenêtre autour du joueur</option>
                    <option value="fixe">Niveau fixe</option>
                </select>
            </label>

            <label>
                Niveau de référence joueur
                <input
                    id="mpNiveauReference"
                    type="number"
                    min="1"
                    max="999"
                    value="${niveauJoueur}"
                >
            </label>

            <label>
                Offset bas
                <input
                    id="mpOffsetBas"
                    type="number"
                    min="-100"
                    max="0"
                    value="-6"
                >
            </label>

            <label>
                Offset haut
                <input
                    id="mpOffsetHaut"
                    type="number"
                    min="0"
                    max="100"
                    value="3"
                >
            </label>

            <label>
                Niveau fixe
                <input
                    id="mpNiveauFixe"
                    type="number"
                    min="1"
                    max="999"
                    value="${niveauJoueur}"
                >
            </label>

            <label>
                Template de monstre
                <select id="mpTemplateId">
                    ${templatesOptions}
                </select>
            </label>

            <label>
                Type de menace
                <select id="mpTypeMenace">
                    ${menacesOptions}
                </select>
            </label>

            <label>
                Quantité
                <input
                    id="mpQuantite"
                    type="number"
                    min="1"
                    max="500"
                    value="10"
                >
            </label>

            <div class="generateur-monstre-actions">
                <button onclick="MP_genererDepuisUI(1)">
                    🎲 Générer 1 monstre
                </button>

                <button onclick="MP_genererDepuisUI()">
                    📦 Générer le lot
                </button>

                <button onclick="MP_genererUnParMenaceDepuisUI()">
                    👑 Générer chaque menace
                </button>

                <button onclick="MP_telechargerDerniersMonstresJSON()">
                    💾 Télécharger JSON monstres
                </button>
            </div>
        </div>

        <div class="item-card generateur-monstre-formulaire">
            <h3>🧪 Simulation rapide</h3>

            <p class="texte-muted">
                Après génération, clique sur “Simuler 100” ou “Simuler 1000” sur une carte de monstre.
                Le rapport est aussi envoyé dans le simulateur Combat V2 pour téléchargement TXT/JSON.
            </p>

            <label>
                Nombre de combats par défaut
                <input
                    id="mpSimulationCombats"
                    type="number"
                    min="1"
                    max="50000"
                    value="1000"
                >
            </label>

            <label>
                Stratégie joueur
                <select id="mpSimulationStrategie">
                    <option value="agressif">Agressif</option>
                    <option value="prudent" selected>Prudent</option>
                    <option value="defensif">Défensif</option>
                </select>
            </label>

            <label>
                Potions simulées par combat
                <input
                    id="mpSimulationPotions"
                    type="number"
                    min="0"
                    max="20"
                    value="0"
                >
            </label>

            <label>
                Potion utilisée
                <input
                    id="mpSimulationPotionId"
                    type="text"
                    value="potion_soin"
                >
            </label>

            <label class="simulateur-combat-checkbox">
                <input
                    id="mpSimulationLogsComplets"
                    type="checkbox"
                >
                Inclure les logs détaillés dans le JSON
            </label>

            <div class="generateur-monstre-actions">
                <button onclick="MP_simulerPremierMonstreGenereDepuisUI()">
                    🧪 Simuler le premier monstre généré
                </button>

                <button onclick="MP_telechargerDernierRapportSimulationJSON()">
                    💾 Télécharger rapport JSON
                </button>

                <button onclick="MP_telechargerDernierRapportSimulationTXT()">
                    📄 Télécharger rapport TXT
                </button>
            </div>
        </div>

        <div id="mpResultatsSimulation" class="generateur-monstre-resultats">
            ${
                dernierRapport && typeof creerAffichageRapportSimulationCombat === "function"
                    ? creerAffichageRapportSimulationCombat(dernierRapport)
                    : `
                        <div class="item-card">
                            <p>Aucun rapport de simulation procédurale pour le moment.</p>
                        </div>
                    `
            }
        </div>

        <div id="mpResultats" class="generateur-monstre-resultats">
            ${
                derniers.length > 0
                    ? MP_creerAffichageListeMonstres(derniers)
                    : `
                        <div class="item-card">
                            <p>Aucun monstre généré pour le moment.</p>
                        </div>
                    `
            }
        </div>
    `;

    afficherVuePrincipale(html);
}

function MP_lireOptionsDepuisUI(quantiteForcee = null) {
    const quantiteChamp =
        Number(
            document.getElementById("mpQuantite")?.value
        ) || 1;

    const quantite =
        quantiteForcee !== null && quantiteForcee !== undefined
            ? quantiteForcee
            : quantiteChamp;

    return {
        modeNiveau:
            document.getElementById("mpModeNiveau")?.value || "fenetre",

        niveauReference:
            Number(
                document.getElementById("mpNiveauReference")?.value
            ) || MP_obtenirNiveauJoueurActuel(),

        offsetBas:
            Number(
                document.getElementById("mpOffsetBas")?.value ?? -6
            ),

        offsetHaut:
            Number(
                document.getElementById("mpOffsetHaut")?.value ?? 3
            ),

        niveauFixe:
            Number(
                document.getElementById("mpNiveauFixe")?.value
            ) || MP_obtenirNiveauJoueurActuel(),

        templateId:
            document.getElementById("mpTemplateId")?.value || "aleatoire",

        typeMenace:
            document.getElementById("mpTypeMenace")?.value || "aleatoire",

        quantite:
            Math.max(
                1,
                Math.min(
                    500,
                    Number(quantite) || 1
                )
            )
    };
}

function MP_genererDepuisUI(quantiteForcee = null) {
    const options =
        MP_lireOptionsDepuisUI(quantiteForcee);

    const monstres =
        genererLotMonstresProceduraux(options);

    Game.monstresProceduraux.derniers =
        monstres;

    Game.monstresProceduraux.dernierRapport =
        null;

    const conteneur =
        document.getElementById("mpResultats");

    if (conteneur) {
        conteneur.innerHTML =
            MP_creerAffichageListeMonstres(monstres);
    }

    const conteneurSimulation =
        document.getElementById("mpResultatsSimulation");

    if (conteneurSimulation) {
        conteneurSimulation.innerHTML = `
            <div class="item-card">
                <p>Monstres générés. Choisis un monstre à simuler.</p>
            </div>
        `;
    }

    if (typeof ajouterJournal === "function") {
        ajouterJournal(`👹 ${monstres.length} monstre(s) procédural(aux) généré(s).`);
    }
}

function MP_genererUnParMenaceDepuisUI() {
    const optionsBase =
        MP_lireOptionsDepuisUI(1);

    const monstres =
        Object.keys(MP_CONFIG_MENACES)
            .map(typeMenace => {
                return genererMonstreProcedural({
                    ...optionsBase,
                    typeMenace
                });
            });

    Game.monstresProceduraux.derniers =
        monstres;

    Game.monstresProceduraux.dernierRapport =
        null;

    const conteneur =
        document.getElementById("mpResultats");

    if (conteneur) {
        conteneur.innerHTML =
            MP_creerAffichageListeMonstres(monstres);
    }

    const conteneurSimulation =
        document.getElementById("mpResultatsSimulation");

    if (conteneurSimulation) {
        conteneurSimulation.innerHTML = `
            <div class="item-card">
                <p>Menaces générées. Choisis un monstre à simuler.</p>
            </div>
        `;
    }

    if (typeof ajouterJournal === "function") {
        ajouterJournal("👑 Un monstre par type de menace a été généré.");
    }
}

function MP_creerAffichageListeMonstres(monstres) {
    const total =
        monstres.length;

    const resume =
        MP_calculerResumeMonstresProceduraux(monstres);

    return `
        <div class="item-card">
            <h3>📦 Résultat</h3>
            <p>Monstres générés : <strong>${total}</strong></p>

            <div class="generateur-monstre-resume">
                <div><span>Niveau moyen</span><strong>${MP_arrondir(resume.niveauMoyen, 1)}</strong></div>
                <div><span>PV moyens</span><strong>${MP_arrondir(resume.pvMoyen, 1)}</strong></div>
                <div><span>Attaque moyenne</span><strong>${MP_arrondir(resume.attaqueMoyenne, 1)}</strong></div>
                <div><span>Défense moyenne</span><strong>${MP_arrondir(resume.defenseMoyenne, 1)}</strong></div>
                <div><span>Vitesse moyenne</span><strong>${MP_arrondir(resume.vitesseMoyenne, 1)}</strong></div>
            </div>
        </div>

        ${monstres.map(MP_creerCarteMonstreProcedural).join("")}
    `;
}

function MP_calculerResumeMonstresProceduraux(monstres) {
    const total =
        Math.max(1, monstres.length);

    function moyenne(champ) {
        return monstres.reduce((acc, monstre) => {
            return acc + (Number(monstre[champ]) || 0);
        }, 0) / total;
    }

    return {
        niveauMoyen: moyenne("niveau"),
        pvMoyen: moyenne("pvMax"),
        attaqueMoyenne: moyenne("attaque"),
        defenseMoyenne: moyenne("defense"),
        vitesseMoyenne: moyenne("vitesse")
    };
}

function MP_creerCarteMonstreProcedural(monstre) {
    const menace =
        MP_CONFIG_MENACES[monstre.typeMenace] || MP_CONFIG_MENACES.normal;

    return `
        <article class="item-card monstre-procedural-card">
            <div class="monstre-procedural-card__header">
                <div>
                    <h3>${menace.icone} ${MP_echapperHTML(monstre.nom)}</h3>
                    <p>
                        ${MP_echapperHTML(monstre.nomMenace)} — Niveau ${monstre.niveau}
                        — Template : ${MP_echapperHTML(monstre.templateId)}
                    </p>
                </div>

                <div class="monstre-procedural-badge">
                    ${MP_echapperHTML(monstre.typeMenace)}
                </div>
            </div>

            ${monstre.image ? `<img src="${MP_echapperHTML(monstre.image)}" class="portrait-monstre">` : ""}

            <div class="monstre-procedural-stats">
                ${MP_creerStatMonstre("PV", monstre.pvMax)}
                ${MP_creerStatMonstre("Mana", monstre.manaMax)}
                ${MP_creerStatMonstre("Stamina", monstre.staminaMax)}
                ${MP_creerStatMonstre("Attaque", monstre.attaque)}
                ${MP_creerStatMonstre("Défense", monstre.defense)}
                ${MP_creerStatMonstre("ATK magique", monstre.attaqueMagique)}
                ${MP_creerStatMonstre("DEF magique", monstre.defenseMagique)}
                ${MP_creerStatMonstre("Critique", monstre.critique)}
                ${MP_creerStatMonstre("Esquive", monstre.esquive)}
                ${MP_creerStatMonstre("Vitesse", monstre.vitesse)}
                ${MP_creerStatMonstre("XP", monstre.xp)}
                ${MP_creerStatMonstre("Or", monstre.or)}
            </div>

            <div class="generateur-monstre-actions monstre-procedural-actions">
                <button onclick="MP_simulerMonstreProceduralDepuisId('${MP_echapperHTML(monstre.id)}', 100)">
                    🧪 Simuler 100
                </button>

                <button onclick="MP_simulerMonstreProceduralDepuisId('${MP_echapperHTML(monstre.id)}', 1000)">
                    📊 Simuler 1000
                </button>

                <button onclick="MP_simulerMonstreProceduralDepuisId('${MP_echapperHTML(monstre.id)}')">
                    ⚙ Simuler réglages
                </button>
            </div>

            <details>
                <summary>Voir JSON</summary>
                <pre>${MP_echapperHTML(JSON.stringify(monstre, null, 2))}</pre>
            </details>
        </article>
    `;
}

function MP_creerStatMonstre(libelle, valeur) {
    return `
        <div class="monstre-procedural-stat">
            <span>${MP_echapperHTML(libelle)}</span>
            <strong>${MP_echapperHTML(MP_arrondir(valeur, 1))}</strong>
        </div>
    `;
}

function MP_lireOptionsSimulationDepuisUI(nombreCombatsForce = null) {
    const nombreChamp =
        Number(
            document.getElementById("mpSimulationCombats")?.value
        ) || 1000;

    const nombreCombats =
        nombreCombatsForce !== null && nombreCombatsForce !== undefined
            ? nombreCombatsForce
            : nombreChamp;

    return {
        nombreCombats:
            Math.max(
                1,
                Math.min(
                    50000,
                    Number(nombreCombats) || 1
                )
            ),

        strategieJoueur:
            document.getElementById("mpSimulationStrategie")?.value || "prudent",

        potionsMax:
            Math.max(
                0,
                Math.min(
                    20,
                    Number(document.getElementById("mpSimulationPotions")?.value) || 0
                )
            ),

        idPotion:
            document.getElementById("mpSimulationPotionId")?.value || "potion_soin",

        logsComplets:
            document.getElementById("mpSimulationLogsComplets")?.checked === true
    };
}

function MP_obtenirMonstreProceduralParId(idMonstre) {
    return (Game.monstresProceduraux?.derniers || [])
        .find(monstre => monstre.id === idMonstre || monstre.uid === idMonstre) || null;
}

function MP_preparerMonstrePourSimulation(monstre) {
    const copie =
        JSON.parse(
            JSON.stringify(monstre)
        );

    copie.id ??=
        copie.uid || MP_genererUID("mob_proc_sim");

    copie.pv =
        copie.pvMax ?? copie.pv ?? 1;

    copie.pvMax =
        copie.pvMax ?? copie.pv ?? 1;

    copie.mana =
        copie.manaMax ?? copie.mana ?? 0;

    copie.manaMax =
        copie.manaMax ?? copie.mana ?? 0;

    copie.stamina =
        copie.staminaMax ?? copie.stamina ?? 0;

    copie.staminaMax =
        copie.staminaMax ?? copie.stamina ?? 0;

    copie.loot ??=
        [];

    copie.competences ??=
        [];

    copie.ia ??=
        {
            profil: "agressif"
        };

    return copie;
}

function MP_simulerMonstreProcedural(monstre, nombreCombatsForce = null) {
    if (!monstre) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal("⚠ Aucun monstre procédural à simuler.");
        }

        return;
    }

    if (typeof lancerSimulationCombatAutomatisee !== "function") {
        if (typeof ajouterJournal === "function") {
            ajouterJournal("⚠ Le simulateur de combat n'est pas chargé ou la fonction lancerSimulationCombatAutomatisee est introuvable.");
        }

        return;
    }

    const options =
        MP_lireOptionsSimulationDepuisUI(nombreCombatsForce);

    const monstreSimulation =
        MP_preparerMonstrePourSimulation(monstre);

    const rapport =
        lancerSimulationCombatAutomatisee(
            monstreSimulation,
            {
                ...options,
                idMonstre: monstreSimulation.id,
                source: "monstre_procedural"
            }
        );

    Game.monstresProceduraux.dernierRapport =
        rapport;

    Game.simulateurCombat ??=
        {
            dernierRapport: null
        };

    Game.simulateurCombat.dernierRapport =
        rapport;

    const conteneur =
        document.getElementById("mpResultatsSimulation");

    if (conteneur) {
        conteneur.innerHTML =
            typeof creerAffichageRapportSimulationCombat === "function"
                ? creerAffichageRapportSimulationCombat(rapport)
                : MP_creerAffichageRapportSimulationMinimal(rapport);
    }

    if (typeof ajouterJournal === "function") {
        ajouterJournal(`🧪 Simulation procédurale terminée : ${rapport.resume.total} combats contre ${monstreSimulation.nom}.`);
    }
}

function MP_simulerMonstreProceduralDepuisId(idMonstre, nombreCombatsForce = null) {
    const monstre =
        MP_obtenirMonstreProceduralParId(idMonstre);

    if (!monstre) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal(`⚠ Monstre procédural introuvable : ${idMonstre}`);
        }

        return;
    }

    MP_simulerMonstreProcedural(
        monstre,
        nombreCombatsForce
    );
}

function MP_simulerPremierMonstreGenereDepuisUI() {
    const monstre =
        (Game.monstresProceduraux?.derniers || [])[0] || null;

    MP_simulerMonstreProcedural(
        monstre,
        null
    );
}

function MP_creerAffichageRapportSimulationMinimal(rapport) {
    if (!rapport?.resume) {
        return `
            <div class="item-card">
                <p>Rapport de simulation indisponible.</p>
            </div>
        `;
    }

    const resume =
        rapport.resume;

    return `
        <div class="item-card simulateur-combat-rapport">
            <h3>📊 Résultat de simulation procédurale</h3>

            <p>
                Monstre :
                <strong>${MP_echapperHTML(rapport.monstre?.nom || "Monstre")}</strong>
            </p>

            <div class="generateur-monstre-resume">
                <div><span>Combats</span><strong>${MP_echapperHTML(resume.total)}</strong></div>
                <div><span>Victoires</span><strong>${MP_echapperHTML(resume.victoires)}</strong></div>
                <div><span>Défaites</span><strong>${MP_echapperHTML(resume.defaites)}</strong></div>
                <div><span>Taux victoire</span><strong>${MP_echapperHTML(MP_arrondir(resume.tauxVictoire, 1))}%</strong></div>
                <div><span>Tours moyens</span><strong>${MP_echapperHTML(MP_arrondir(resume.moyenneTours, 1))}</strong></div>
            </div>
        </div>
    `;
}

function MP_telechargerDernierRapportSimulationJSON() {
    if (typeof telechargerRapportSimulationCombatJSON === "function") {
        telechargerRapportSimulationCombatJSON();
        return;
    }

    const rapport =
        Game.monstresProceduraux?.dernierRapport;

    if (!rapport) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal("⚠ Aucun rapport procédural à télécharger.");
        }

        return;
    }

    MP_telechargerBlob(
        JSON.stringify(rapport, null, 2),
        `simulation_monstre_procedural_${rapport.monstre?.id || "monstre"}_${Date.now()}.json`,
        "application/json"
    );
}

function MP_telechargerDernierRapportSimulationTXT() {
    if (typeof telechargerRapportSimulationCombatTXT === "function") {
        telechargerRapportSimulationCombatTXT();
        return;
    }

    const rapport =
        Game.monstresProceduraux?.dernierRapport;

    if (!rapport) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal("⚠ Aucun rapport procédural à télécharger.");
        }

        return;
    }

    const lignes = [
        "SIMULATION MONSTRE PROCÉDURAL — NIGHTVENTURE",
        "=============================================",
        "",
        `Monstre : ${rapport.monstre?.nom || "Monstre"}`,
        `Combats : ${rapport.resume?.total || 0}`,
        `Victoires : ${rapport.resume?.victoires || 0}`,
        `Défaites : ${rapport.resume?.defaites || 0}`,
        `Taux victoire : ${MP_arrondir(rapport.resume?.tauxVictoire || 0, 1)}%`,
        `Tours moyens : ${MP_arrondir(rapport.resume?.moyenneTours || 0, 1)}`,
        `Dégâts reçus moyens : ${MP_arrondir(rapport.resume?.moyenneDegatsRecus || 0, 1)}`,
        `PV joueur restants moyens : ${MP_arrondir(rapport.resume?.moyennePvJoueurRestants || 0, 1)}`
    ];

    MP_telechargerBlob(
        lignes.join("\n"),
        `simulation_monstre_procedural_${rapport.monstre?.id || "monstre"}_${Date.now()}.txt`,
        "text/plain"
    );
}

function MP_telechargerBlob(contenu, nomFichier, typeMime) {
    const blob =
        new Blob(
            [contenu],
            {
                type: typeMime
            }
        );

    const url =
        URL.createObjectURL(blob);

    const lien =
        document.createElement("a");

    lien.href =
        url;

    lien.download =
        nomFichier;

    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    URL.revokeObjectURL(url);
}

function MP_telechargerDerniersMonstresJSON() {
    const monstres =
        Game.monstresProceduraux?.derniers || [];

    if (monstres.length === 0) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal("⚠ Aucun monstre procédural à télécharger.");
        }

        return;
    }

    const contenu =
        JSON.stringify(
            {
                date: new Date().toISOString(),
                nombre: monstres.length,
                monstres
            },
            null,
            2
        );

    const blob =
        new Blob(
            [contenu],
            {
                type: "application/json"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const lien =
        document.createElement("a");

    lien.href =
        url;

    lien.download =
        `monstres_proceduraux_${Date.now()}.json`;

    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    URL.revokeObjectURL(url);
}

MP_enregistrerCompetencesProcedurales();

console.log("✅ Monstres_Proceduraux.js chargé — v1.12.3 menaces/templates conservés");
