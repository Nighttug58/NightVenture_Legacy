/* ============================================================================
   NIGHTVENTURE — ÉQUIPEMENTS PROCÉDURAUX v1.2 HARD NERF
   --------------------------------------------------------------------------
   Module isolé de génération d'équipements — passe de balancing.

   Objectif de cette v1 :
   - générer des équipements aléatoires par niveau / rareté / slot ;
   - afficher un outil de test dans l'interface ;
   - télécharger les objets générés en JSON ;
   - ne pas modifier l'inventaire réel ;
   - ne pas modifier la sauvegarde ;
   - ne pas casser les objets fixes existants.
   ============================================================================ */

if (!window.Game) {
    window.Game = {};
}

Game.equipementsProceduraux ??= {
    dernierObjet: null,
    derniersObjets: [],
    dernierSet: null
};

/* --------------------------------------------------------------------------
   CONFIGURATION GLOBALE
   -------------------------------------------------------------------------- */

const EP_RARETES = {
    commun: {
        id: "commun",
        nom: "Commun",
        classe: "commun",
        poids: 62,
        multiplicateur: 0.55,
        bonusAleatoires: 0,
        qualiteMin: 0.70,
        qualiteMax: 0.90,
        prixMultiplicateur: 1.00
    },

    "peu-commun": {
        id: "peu-commun",
        nom: "Peu commun",
        classe: "peu-commun",
        poids: 25,
        multiplicateur: 0.70,
        bonusAleatoires: 1,
        qualiteMin: 0.76,
        qualiteMax: 0.98,
        prixMultiplicateur: 1.70
    },

    rare: {
        id: "rare",
        nom: "Rare",
        classe: "rare",
        poids: 9,
        multiplicateur: 0.88,
        bonusAleatoires: 2,
        qualiteMin: 0.82,
        qualiteMax: 1.08,
        prixMultiplicateur: 3.00
    },

    epique: {
        id: "epique",
        nom: "Épique",
        classe: "epique",
        poids: 3,
        multiplicateur: 1.05,
        bonusAleatoires: 3,
        qualiteMin: 0.88,
        qualiteMax: 1.18,
        prixMultiplicateur: 5.50
    },

    legendaire: {
        id: "legendaire",
        nom: "Légendaire",
        classe: "legendaire",
        poids: 1,
        multiplicateur: 1.22,
        bonusAleatoires: 4,
        qualiteMin: 0.94,
        qualiteMax: 1.28,
        prixMultiplicateur: 10.00,
        effetSpecial: true
    }
};

const EP_BALANCE_STATS = {
    // HARD NERF v1.2 : les équipements doivent compléter le personnage,
    // pas devenir la source principale d'un mode dieu.
    pvMax: 0.52,
    manaMax: 0.46,
    staminaMax: 0.46,

    attaque: 0.48,
    attaqueMagique: 0.48,
    defense: 0.34,
    defenseMagique: 0.34,

    force: 0.38,
    dexterite: 0.30,
    intelligence: 0.38,
    vitalite: 0.40,
    chance: 0.26,

    // Stats ultra dangereuses : fortement limitées.
    critique: 0.12,
    esquive: 0.10,
    vitesse: 0.06,
    bonusLoot: 0.22
};

const EP_SLOTS = [
    "arme",
    "casque",
    "armure",
    "gants",
    "chaussures",
    "collier",
    "bague",
    "artefact"
];

const EP_BASES_EQUIPEMENTS = {
    epee: {
        id: "epee",
        nom: "Épée",
        type: "arme",
        slot: "arme",
        famille: "physique",
        poids: 18,
        statsBase: {
            attaque: 1.65,
            force: 0.30,
            staminaMax: 1.10
        },
        statsBonusPossibles: [
            "attaque",
            "force",
            "dexterite",
            "critique",
            "staminaMax",
            "vitesse"
        ]
    },

    hache: {
        id: "hache",
        nom: "Hache",
        type: "arme",
        slot: "arme",
        famille: "physique_lourd",
        poids: 14,
        statsBase: {
            attaque: 2.05,
            force: 0.45,
            critique: 0.15
        },
        statsBonusPossibles: [
            "attaque",
            "force",
            "critique",
            "pvMax",
            "staminaMax"
        ]
    },

    dague: {
        id: "dague",
        nom: "Dague",
        type: "arme",
        slot: "arme",
        famille: "agile",
        poids: 16,
        statsBase: {
            attaque: 1.25,
            dexterite: 0.45,
            critique: 0.35,
            vitesse: 0.18
        },
        statsBonusPossibles: [
            "attaque",
            "dexterite",
            "critique",
            "esquive",
            "vitesse",
            "chance"
        ]
    },

    baton: {
        id: "baton",
        nom: "Bâton",
        type: "arme",
        slot: "arme",
        famille: "magique",
        poids: 18,
        statsBase: {
            attaqueMagique: 1.75,
            intelligence: 0.45,
            manaMax: 3.20
        },
        statsBonusPossibles: [
            "attaqueMagique",
            "intelligence",
            "manaMax",
            "defenseMagique",
            "critique",
            "vitesse"
        ]
    },

    casque_cuir: {
        id: "casque_cuir",
        nom: "Capuche de cuir",
        type: "casque",
        slot: "casque",
        famille: "agile",
        poids: 14,
        statsBase: {
            defense: 0.55,
            esquive: 0.20,
            dexterite: 0.15
        },
        statsBonusPossibles: [
            "defense",
            "esquive",
            "dexterite",
            "vitesse",
            "chance"
        ]
    },

    casque_metal: {
        id: "casque_metal",
        nom: "Casque de métal",
        type: "casque",
        slot: "casque",
        famille: "defensif",
        poids: 16,
        statsBase: {
            defense: 0.90,
            pvMax: 1.80,
            vitalite: 0.18
        },
        statsBonusPossibles: [
            "defense",
            "pvMax",
            "vitalite",
            "defenseMagique",
            "staminaMax"
        ]
    },

    couronne_arcanique: {
        id: "couronne_arcanique",
        nom: "Couronne arcanique",
        type: "casque",
        slot: "casque",
        famille: "magique",
        poids: 10,
        statsBase: {
            defenseMagique: 0.75,
            intelligence: 0.25,
            manaMax: 2.40
        },
        statsBonusPossibles: [
            "intelligence",
            "manaMax",
            "attaqueMagique",
            "defenseMagique",
            "critique"
        ]
    },

    armure_cuir: {
        id: "armure_cuir",
        nom: "Armure de cuir",
        type: "armure",
        slot: "armure",
        famille: "agile",
        poids: 15,
        statsBase: {
            defense: 1.20,
            esquive: 0.25,
            staminaMax: 2.00
        },
        statsBonusPossibles: [
            "defense",
            "esquive",
            "staminaMax",
            "dexterite",
            "vitesse"
        ]
    },

    armure_maille: {
        id: "armure_maille",
        nom: "Cotte de mailles",
        type: "armure",
        slot: "armure",
        famille: "equilibre",
        poids: 15,
        statsBase: {
            defense: 1.65,
            pvMax: 3.00,
            staminaMax: 1.50
        },
        statsBonusPossibles: [
            "defense",
            "pvMax",
            "vitalite",
            "staminaMax",
            "defenseMagique"
        ]
    },

    armure_plaque: {
        id: "armure_plaque",
        nom: "Armure de plaques",
        type: "armure",
        slot: "armure",
        famille: "defensif_lourd",
        poids: 12,
        statsBase: {
            defense: 2.10,
            pvMax: 4.50,
            vitalite: 0.35
        },
        statsBonusPossibles: [
            "defense",
            "pvMax",
            "vitalite",
            "staminaMax",
            "defenseMagique"
        ]
    },

    robe_mage: {
        id: "robe_mage",
        nom: "Robe de mage",
        type: "armure",
        slot: "armure",
        famille: "magique",
        poids: 12,
        statsBase: {
            defenseMagique: 1.50,
            manaMax: 4.00,
            intelligence: 0.35
        },
        statsBonusPossibles: [
            "defenseMagique",
            "manaMax",
            "intelligence",
            "attaqueMagique",
            "critique"
        ]
    },

    gants_force: {
        id: "gants_force",
        nom: "Gants de force",
        type: "gants",
        slot: "gants",
        famille: "physique",
        poids: 15,
        statsBase: {
            attaque: 0.70,
            force: 0.20,
            defense: 0.35
        },
        statsBonusPossibles: [
            "attaque",
            "force",
            "critique",
            "staminaMax",
            "defense"
        ]
    },

    gants_precision: {
        id: "gants_precision",
        nom: "Gants de précision",
        type: "gants",
        slot: "gants",
        famille: "agile",
        poids: 15,
        statsBase: {
            dexterite: 0.25,
            critique: 0.30,
            esquive: 0.15
        },
        statsBonusPossibles: [
            "dexterite",
            "critique",
            "esquive",
            "vitesse",
            "chance"
        ]
    },

    gants_arcanes: {
        id: "gants_arcanes",
        nom: "Gants d'arcanes",
        type: "gants",
        slot: "gants",
        famille: "magique",
        poids: 12,
        statsBase: {
            attaqueMagique: 0.70,
            intelligence: 0.22,
            manaMax: 1.60
        },
        statsBonusPossibles: [
            "attaqueMagique",
            "intelligence",
            "manaMax",
            "critique",
            "defenseMagique"
        ]
    },

    bottes_voyage: {
        id: "bottes_voyage",
        nom: "Bottes de voyage",
        type: "chaussures",
        slot: "chaussures",
        famille: "equilibre",
        poids: 18,
        statsBase: {
            staminaMax: 2.20,
            vitesse: 0.18,
            defense: 0.35
        },
        statsBonusPossibles: [
            "staminaMax",
            "vitesse",
            "esquive",
            "dexterite",
            "defense"
        ]
    },

    bottes_ombre: {
        id: "bottes_ombre",
        nom: "Bottes d'ombre",
        type: "chaussures",
        slot: "chaussures",
        famille: "agile",
        poids: 12,
        statsBase: {
            vitesse: 0.32,
            esquive: 0.35,
            dexterite: 0.18
        },
        statsBonusPossibles: [
            "vitesse",
            "esquive",
            "dexterite",
            "critique",
            "chance"
        ]
    },

    collier_vie: {
        id: "collier_vie",
        nom: "Collier de vie",
        type: "collier",
        slot: "collier",
        famille: "defensif",
        poids: 14,
        statsBase: {
            pvMax: 4.20,
            vitalite: 0.22,
            defense: 0.30
        },
        statsBonusPossibles: [
            "pvMax",
            "vitalite",
            "defense",
            "defenseMagique",
            "staminaMax"
        ]
    },

    collier_sagesse: {
        id: "collier_sagesse",
        nom: "Collier de sagesse",
        type: "collier",
        slot: "collier",
        famille: "magique",
        poids: 14,
        statsBase: {
            manaMax: 4.00,
            intelligence: 0.25,
            defenseMagique: 0.40
        },
        statsBonusPossibles: [
            "manaMax",
            "intelligence",
            "attaqueMagique",
            "defenseMagique",
            "critique"
        ]
    },

    bague_force: {
        id: "bague_force",
        nom: "Bague de force",
        type: "bague",
        slot: "bague",
        famille: "physique",
        poids: 13,
        statsBase: {
            force: 0.22,
            attaque: 0.45
        },
        statsBonusPossibles: [
            "force",
            "attaque",
            "critique",
            "pvMax",
            "staminaMax"
        ]
    },

    bague_mana: {
        id: "bague_mana",
        nom: "Bague de mana",
        type: "bague",
        slot: "bague",
        famille: "magique",
        poids: 13,
        statsBase: {
            manaMax: 3.30,
            intelligence: 0.14
        },
        statsBonusPossibles: [
            "manaMax",
            "intelligence",
            "attaqueMagique",
            "defenseMagique",
            "critique"
        ]
    },

    bague_vivacite: {
        id: "bague_vivacite",
        nom: "Bague de vivacité",
        type: "bague",
        slot: "bague",
        famille: "agile",
        poids: 12,
        statsBase: {
            vitesse: 0.20,
            esquive: 0.22,
            dexterite: 0.15
        },
        statsBonusPossibles: [
            "vitesse",
            "esquive",
            "dexterite",
            "critique",
            "chance"
        ]
    },

    artefact_gardien: {
        id: "artefact_gardien",
        nom: "Artefact du gardien",
        type: "artefact",
        slot: "artefact",
        famille: "defensif",
        poids: 10,
        statsBase: {
            defense: 0.80,
            defenseMagique: 0.80,
            pvMax: 2.80
        },
        statsBonusPossibles: [
            "defense",
            "defenseMagique",
            "pvMax",
            "vitalite",
            "staminaMax"
        ]
    },

    artefact_arcane: {
        id: "artefact_arcane",
        nom: "Artefact arcanique",
        type: "artefact",
        slot: "artefact",
        famille: "magique",
        poids: 10,
        statsBase: {
            attaqueMagique: 0.90,
            manaMax: 3.00,
            intelligence: 0.20
        },
        statsBonusPossibles: [
            "attaqueMagique",
            "manaMax",
            "intelligence",
            "critique",
            "defenseMagique"
        ]
    },

    artefact_chance: {
        id: "artefact_chance",
        nom: "Artefact de fortune",
        type: "artefact",
        slot: "artefact",
        famille: "chance",
        poids: 8,
        statsBase: {
            chance: 0.30,
            critique: 0.25,
            esquive: 0.20
        },
        statsBonusPossibles: [
            "chance",
            "critique",
            "esquive",
            "vitesse",
            "bonusLoot"
        ]
    }
};

const EP_AFFIXES = {
    robuste: {
        id: "robuste",
        nom: "robuste",
        position: "prefixe",
        poids: 12,
        stats: {
            pvMax: 3.00,
            defense: 0.25,
            vitalite: 0.16
        }
    },

    brutal: {
        id: "brutal",
        nom: "brutale",
        position: "prefixe",
        poids: 11,
        stats: {
            attaque: 0.55,
            force: 0.18,
            critique: 0.15
        }
    },

    mystique: {
        id: "mystique",
        nom: "mystique",
        position: "prefixe",
        poids: 11,
        stats: {
            attaqueMagique: 0.55,
            intelligence: 0.18,
            manaMax: 2.20
        }
    },

    vive: {
        id: "vive",
        nom: "vive",
        position: "prefixe",
        poids: 10,
        stats: {
            vitesse: 0.16,
            esquive: 0.22,
            dexterite: 0.14
        }
    },

    chanceuse: {
        id: "chanceuse",
        nom: "chanceuse",
        position: "prefixe",
        poids: 8,
        stats: {
            chance: 0.20,
            critique: 0.18,
            bonusLoot: 0.12
        }
    },

    du_loup: {
        id: "du_loup",
        nom: "du Loup",
        position: "suffixe",
        poids: 11,
        stats: {
            attaque: 0.35,
            vitesse: 0.10,
            staminaMax: 1.20
        }
    },

    du_sage: {
        id: "du_sage",
        nom: "du Sage",
        position: "suffixe",
        poids: 10,
        stats: {
            intelligence: 0.22,
            manaMax: 2.80,
            defenseMagique: 0.22
        }
    },

    du_gardien: {
        id: "du_gardien",
        nom: "du Gardien",
        position: "suffixe",
        poids: 10,
        stats: {
            defense: 0.38,
            pvMax: 2.80,
            defenseMagique: 0.24
        }
    },

    du_renard: {
        id: "du_renard",
        nom: "du Renard",
        position: "suffixe",
        poids: 9,
        stats: {
            esquive: 0.35,
            critique: 0.20,
            dexterite: 0.16
        }
    },

    des_arcanes: {
        id: "des_arcanes",
        nom: "des Arcanes",
        position: "suffixe",
        poids: 8,
        stats: {
            attaqueMagique: 0.45,
            critique: 0.20,
            manaMax: 2.00
        }
    },

    du_colosse: {
        id: "du_colosse",
        nom: "du Colosse",
        position: "suffixe",
        poids: 7,
        stats: {
            pvMax: 4.20,
            force: 0.18,
            defense: 0.22
        }
    },

    de_l_aube: {
        id: "de_l_aube",
        nom: "de l'Aube",
        position: "suffixe",
        poids: 6,
        stats: {
            defenseMagique: 0.36,
            manaMax: 2.40,
            chance: 0.14
        }
    }
};

const EP_EFFETS_SPECIAUX_LEGENDAIRES = [
    {
        id: "mana_sur_critique",
        nom: "Écho arcanique",
        description: "Les coups critiques restaurent parfois un peu de mana."
    },
    {
        id: "stamina_sur_esquive",
        nom: "Réflexes parfaits",
        description: "Les esquives restaurent parfois un peu de stamina."
    },
    {
        id: "bouclier_debut_combat",
        nom: "Garde ancestrale",
        description: "Octroie une protection légère au début du combat."
    },
    {
        id: "bonus_loot",
        nom: "Fortune ancienne",
        description: "Augmente légèrement la qualité des loots trouvés."
    }
];

/* --------------------------------------------------------------------------
   OUTILS GÉNÉRAUX
   -------------------------------------------------------------------------- */

function EP_clamp(nombre, min, max) {
    return Math.max(
        min,
        Math.min(
            max,
            Number(nombre) || 0
        )
    );
}

function EP_randFloat(min, max) {
    return min + Math.random() * (max - min);
}

function EP_randInt(min, max) {
    return Math.floor(
        EP_randFloat(
            min,
            max + 1
        )
    );
}

function EP_choisirAleatoire(liste) {
    if (!Array.isArray(liste) || liste.length === 0) return null;

    return liste[
        EP_randInt(
            0,
            liste.length - 1
        )
    ];
}

function EP_choisirPondere(liste, clePoids = "poids") {
    const elements =
        Array.isArray(liste)
            ? liste.filter(Boolean)
            : [];

    if (elements.length === 0) return null;

    const poidsTotal =
        elements.reduce((total, element) => {
            return total + Math.max(0, Number(element[clePoids]) || 0);
        }, 0);

    if (poidsTotal <= 0) {
        return EP_choisirAleatoire(elements);
    }

    let tirage =
        Math.random() * poidsTotal;

    for (const element of elements) {
        tirage -=
            Math.max(0, Number(element[clePoids]) || 0);

        if (tirage <= 0) {
            return element;
        }
    }

    return elements[elements.length - 1];
}

function EP_normaliserRarete(rarete) {
    const valeur =
        String(rarete || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/_/g, "-");

    if (valeur === "epique") return "epique";
    if (valeur === "legendaire") return "legendaire";
    if (valeur === "peu-commun") return "peu-commun";
    if (valeur === "rare") return "rare";

    return "commun";
}

function EP_genererUid(prefixe = "eq") {
    return `${prefixe}_${Date.now()}_${Math.floor(Math.random() * 1_000_000)}`;
}

function EP_arrondirStat(nomStat, valeur) {
    const statsDecimales = [
        "critique",
        "esquive",
        "vitesse",
        "bonusLoot"
    ];

    const nombre =
        Number(valeur) || 0;

    if (statsDecimales.includes(nomStat)) {
        return Number(
            Math.max(
                0,
                Math.round(nombre * 10) / 10
            ).toFixed(1)
        );
    }

    return Math.max(
        0,
        Math.round(nombre)
    );
}

function EP_echapperHTML(valeur) {
    const div =
        document.createElement("div");

    div.textContent =
        String(valeur ?? "");

    return div.innerHTML;
}

function EP_listeBasesParSlot(slot) {
    return Object.values(EP_BASES_EQUIPEMENTS)
        .filter(base => !slot || base.slot === slot);
}

function EP_listeRaretes() {
    return Object.values(EP_RARETES);
}

function EP_listeAffixes() {
    return Object.values(EP_AFFIXES);
}

function EP_choisirRarete(options = {}) {
    if (options.rarete) {
        return EP_RARETES[
            EP_normaliserRarete(options.rarete)
        ] || EP_RARETES.commun;
    }

    const raretes =
        EP_listeRaretes()
            .map(rarete => ({
                ...rarete,
                poids: Number(options.poidsRaretes?.[rarete.id]) || rarete.poids
            }));

    return EP_choisirPondere(raretes) || EP_RARETES.commun;
}

function EP_choisirBaseEquipement(options = {}) {
    let bases =
        EP_listeBasesParSlot(options.slot);

    if (options.type) {
        bases =
            bases.filter(base => base.type === options.type);
    }

    if (options.baseId) {
        return EP_BASES_EQUIPEMENTS[options.baseId] || bases[0] || null;
    }

    return EP_choisirPondere(bases) || bases[0] || null;
}

function EP_choisirAffixes(base, rarete) {
    const nombre =
        Math.max(
            0,
            Number(rarete?.bonusAleatoires) || 0
        );

    if (nombre <= 0) return [];

    const statsPossibles =
        new Set(base.statsBonusPossibles || []);

    const affixesCompatibles =
        EP_listeAffixes()
            .filter(affixe => {
                return Object.keys(affixe.stats || {})
                    .some(stat => statsPossibles.has(stat));
            });

    const choisis = [];
    const idsUtilises = new Set();

    while (
        choisis.length < nombre &&
        idsUtilises.size < affixesCompatibles.length
    ) {
        const candidats =
            affixesCompatibles.filter(affixe => !idsUtilises.has(affixe.id));

        const affixe =
            EP_choisirPondere(candidats);

        if (!affixe) break;

        idsUtilises.add(affixe.id);
        choisis.push(affixe);
    }

    return choisis;
}

function EP_calculerValeurStat(niveau, coefficient, rarete) {
    const qualite =
        EP_randFloat(
            rarete.qualiteMin,
            rarete.qualiteMax
        );

    return niveau * coefficient * rarete.multiplicateur * qualite;
}

function EP_ajouterStat(stats, nomStat, valeur) {
    stats[nomStat] =
        (Number(stats[nomStat]) || 0) +
        (Number(valeur) || 0);
}

function EP_appliquerStatsCoefficients(stats, coefficients, niveau, rarete) {
    Object.entries(coefficients || {})
        .forEach(([nomStat, coefficient]) => {
            const valeurBrute =
                EP_calculerValeurStat(
                    niveau,
                    coefficient,
                    rarete
                );

            const multiplicateurStat =
                Number(EP_BALANCE_STATS[nomStat]) || 1;

            const valeurEquilibree =
                valeurBrute * multiplicateurStat;

            EP_ajouterStat(
                stats,
                nomStat,
                valeurEquilibree
            );
        });
}

function EP_finaliserStats(stats) {
    const statsFinales = {};

    Object.entries(stats || {})
        .forEach(([nomStat, valeur]) => {
            const valeurArrondie =
                EP_arrondirStat(
                    nomStat,
                    valeur
                );

            if (valeurArrondie !== 0) {
                statsFinales[nomStat] =
                    valeurArrondie;
            }
        });

    return statsFinales;
}

function EP_genererNomEquipement(base, rarete, affixes) {
    const prefixe =
        affixes.find(affixe => affixe.position === "prefixe");

    const suffixe =
        affixes.find(affixe => affixe.position === "suffixe");

    const morceaux = [];

    morceaux.push(base.nom);

    if (prefixe) {
        morceaux.push(prefixe.nom);
    }

    if (suffixe) {
        morceaux.push(suffixe.nom);
    }

    if (rarete.id === "legendaire" && !prefixe && !suffixe) {
        morceaux.push("légendaire");
    }

    return morceaux.join(" ");
}

function EP_genererDescriptionEquipement(base, niveau, rarete, affixes) {
    const nomsAffixes =
        affixes.map(affixe => affixe.nom).join(", ");

    if (nomsAffixes) {
        return `Équipement procédural de niveau ${niveau}. Affixes : ${nomsAffixes}.`;
    }

    return `Équipement procédural de niveau ${niveau}.`;
}

function EP_calculerPrixEquipement(niveau, rarete, stats) {
    const sommeStats =
        Object.values(stats || {})
            .reduce((total, valeur) => total + Math.max(0, Number(valeur) || 0), 0);

    return Math.max(
        1,
        Math.round(
            (niveau * 8 + sommeStats * 4) * rarete.prixMultiplicateur
        )
    );
}

function EP_choisirEffetSpecialLegendaire() {
    return EP_choisirAleatoire(EP_EFFETS_SPECIAUX_LEGENDAIRES);
}

/* --------------------------------------------------------------------------
   API PRINCIPALE DE GÉNÉRATION
   -------------------------------------------------------------------------- */

function genererEquipementAleatoire(options = {}) {
    const niveau =
        EP_clamp(
            Number(options.niveau) || Number(Game.data?.personnage?.niveau) || 1,
            1,
            999
        );

    const rarete =
        EP_choisirRarete(options);

    const base =
        EP_choisirBaseEquipement(options);

    if (!base) {
        console.warn("Aucune base d'équipement disponible pour la génération.", options);
        return null;
    }

    const affixes =
        EP_choisirAffixes(
            base,
            rarete
        );

    let statsBrutes = {};

    EP_appliquerStatsCoefficients(
        statsBrutes,
        base.statsBase,
        niveau,
        rarete
    );

    affixes.forEach(affixe => {
        EP_appliquerStatsCoefficients(
            statsBrutes,
            affixe.stats,
            niveau,
            rarete
        );
    });

    const stats =
        EP_finaliserStats(statsBrutes);

    const effetSpecial =
        rarete.effetSpecial
            ? EP_choisirEffetSpecialLegendaire()
            : null;

    const objet = {
        uid: EP_genererUid("eq"),
        genere: true,
        baseId: base.id,
        nom: EP_genererNomEquipement(base, rarete, affixes),
        type: base.type,
        slot: base.slot,
        famille: base.famille,
        niveau,
        niveauRequis: niveau,
        rarete: rarete.id,
        prix: 0,
        description: "",
        affixes: affixes.map(affixe => affixe.id),
        effetSpecial: effetSpecial ? { ...effetSpecial } : null,
        ...stats
    };

    objet.prix =
        EP_calculerPrixEquipement(
            niveau,
            rarete,
            stats
        );

    objet.description =
        EP_genererDescriptionEquipement(
            base,
            niveau,
            rarete,
            affixes
        );

    Game.equipementsProceduraux.dernierObjet =
        objet;

    return objet;
}

function genererLotEquipementsAleatoires(options = {}) {
    const quantite =
        EP_clamp(
            Number(options.quantite) || 10,
            1,
            500
        );

    const objets = [];

    for (let i = 0; i < quantite; i++) {
        const objet =
            genererEquipementAleatoire(options);

        if (objet) {
            objets.push(objet);
        }
    }

    Game.equipementsProceduraux.derniersObjets =
        objets;

    return objets;
}

function genererSetEquipementProcedural(options = {}) {
    const niveau =
        Number(options.niveau) || Number(Game.data?.personnage?.niveau) || 1;

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

    const set =
        slots.map((slot, index) => {
            const objet =
                genererEquipementAleatoire({
                    ...options,
                    niveau,
                    slot
                });

            if (objet && slot === "bague") {
                objet.slot =
                    index === 6
                        ? "bague1"
                        : "bague2";
            }

            return objet;
        }).filter(Boolean);

    Game.equipementsProceduraux.dernierSet =
        set;

    Game.equipementsProceduraux.derniersObjets =
        set;

    return set;
}

function calculerStatsTotalesObjetsProceduraux(objets) {
    const stats = {};

    const champsIgnores = new Set([
        "uid",
        "genere",
        "baseId",
        "nom",
        "type",
        "slot",
        "famille",
        "niveau",
        "niveauRequis",
        "rarete",
        "prix",
        "description",
        "affixes",
        "effetSpecial",
        "image"
    ]);

    for (const objet of objets || []) {
        Object.entries(objet || {})
            .forEach(([cle, valeur]) => {
                if (champsIgnores.has(cle)) return;
                if (typeof valeur !== "number") return;

                stats[cle] =
                    (stats[cle] || 0) + valeur;
            });
    }

    return stats;
}

/* --------------------------------------------------------------------------
   INTERFACE DE TEST
   -------------------------------------------------------------------------- */

function ouvrirTestEquipementsProceduraux() {
    if (typeof changerVue === "function") {
        changerVue("equipements_proceduraux");
    }

    const optionsRaretes =
        EP_listeRaretes()
            .map(rarete => {
                return `
                    <option value="${rarete.id}">
                        ${rarete.nom}
                    </option>
                `;
            })
            .join("");

    const optionsSlots =
        EP_SLOTS
            .map(slot => {
                return `
                    <option value="${slot}">
                        ${slot}
                    </option>
                `;
            })
            .join("");

    const html = `
        <div class="item-card">
            <h2>⚒ Générateur d'équipements procéduraux</h2>

            <p>
                Module de test isolé. Les objets générés ici ne sont pas encore
                ajoutés à l'inventaire et ne modifient pas la sauvegarde.
            </p>

            <p class="texte-muted">
                Cette étape sert uniquement à valider la génération : rareté,
                niveau, affixes, stats et noms.
            </p>
        </div>

        <div class="item-card generateur-equipement-formulaire">
            <h3>⚙ Réglages</h3>

            <label>
                Niveau de l'objet
                <input
                    id="epNiveauObjet"
                    type="number"
                    min="1"
                    max="999"
                    value="${Game.data?.personnage?.niveau || 1}"
                >
            </label>

            <label>
                Slot
                <select id="epSlotObjet">
                    <option value="">Aléatoire</option>
                    ${optionsSlots}
                </select>
            </label>

            <label>
                Rareté
                <select id="epRareteObjet">
                    <option value="">Aléatoire pondérée</option>
                    ${optionsRaretes}
                </select>
            </label>

            <label>
                Quantité pour génération multiple
                <input
                    id="epQuantiteObjets"
                    type="number"
                    min="1"
                    max="500"
                    value="10"
                >
            </label>

            <div class="generateur-equipement-actions">
                <button onclick="EP_genererObjetDepuisUI()">
                    🎲 Générer 1 objet
                </button>

                <button onclick="EP_genererLotDepuisUI()">
                    🎲 Générer plusieurs objets
                </button>

                <button onclick="EP_genererSetDepuisUI()">
                    🧰 Générer un set complet
                </button>

                <button onclick="EP_telechargerDerniersObjets()">
                    💾 Télécharger JSON
                </button>
            </div>
        </div>

        <div id="epResultats" class="generateur-equipement-resultats">
            <div class="item-card">
                <p>
                    Aucun objet généré pour le moment.
                </p>
            </div>
        </div>
    `;

    if (typeof afficherVuePrincipale === "function") {
        afficherVuePrincipale(html);
    } else {
        document.body.innerHTML = html;
    }
}

function EP_lireOptionsDepuisUI() {
    const niveau =
        Number(document.getElementById("epNiveauObjet")?.value) || 1;

    const slot =
        document.getElementById("epSlotObjet")?.value || null;

    const rarete =
        document.getElementById("epRareteObjet")?.value || null;

    const quantite =
        Number(document.getElementById("epQuantiteObjets")?.value) || 10;

    return {
        niveau,
        slot,
        rarete,
        quantite
    };
}

function EP_genererObjetDepuisUI() {
    const options =
        EP_lireOptionsDepuisUI();

    const objet =
        genererEquipementAleatoire(options);

    Game.equipementsProceduraux.derniersObjets =
        objet ? [objet] : [];

    EP_afficherObjetsGeneres(
        Game.equipementsProceduraux.derniersObjets
    );
}

function EP_genererLotDepuisUI() {
    const options =
        EP_lireOptionsDepuisUI();

    const objets =
        genererLotEquipementsAleatoires(options);

    EP_afficherObjetsGeneres(objets);
}

function EP_genererSetDepuisUI() {
    const options =
        EP_lireOptionsDepuisUI();

    const objets =
        genererSetEquipementProcedural(options);

    EP_afficherObjetsGeneres(objets);
}

function EP_afficherObjetsGeneres(objets) {
    const conteneur =
        document.getElementById("epResultats");

    if (!conteneur) return;

    const liste =
        Array.isArray(objets)
            ? objets
            : [];

    if (liste.length === 0) {
        conteneur.innerHTML = `
            <div class="item-card">
                <p>Aucun objet généré.</p>
            </div>
        `;
        return;
    }

    const statsSet =
        calculerStatsTotalesObjetsProceduraux(liste);

    const statsSetHtml =
        EP_creerBlocStatsObjet(statsSet);

    conteneur.innerHTML = `
        <div class="item-card">
            <h3>📦 Résultat</h3>
            <p>Objets générés : <strong>${liste.length}</strong></p>
            ${liste.length > 1 ? statsSetHtml : ""}
        </div>

        ${liste.map(EP_creerCarteEquipementProcedural).join("")}
    `;
}

function EP_creerCarteEquipementProcedural(objet) {
    const rarete =
        EP_RARETES[objet.rarete] || EP_RARETES.commun;

    return `
        <article class="item-card equipement-procedural-card">
            <div class="equipement-procedural-card__header">
                <div>
                    <h3 class="${rarete.classe}">
                        ${EP_echapperHTML(objet.nom)}
                    </h3>

                    <p class="texte-muted">
                        ${EP_echapperHTML(rarete.nom)} — Niveau ${objet.niveau} — Slot ${EP_echapperHTML(objet.slot)}
                    </p>
                </div>

                <strong>
                    ${objet.prix} or
                </strong>
            </div>

            <p>
                ${EP_echapperHTML(objet.description)}
            </p>

            ${EP_creerBlocStatsObjet(objet)}

            ${
                objet.effetSpecial
                    ? `
                        <div class="equipement-procedural-effet">
                            <strong>✨ ${EP_echapperHTML(objet.effetSpecial.nom)}</strong>
                            <p>${EP_echapperHTML(objet.effetSpecial.description)}</p>
                        </div>
                    `
                    : ""
            }

            <details>
                <summary>Données JSON</summary>
                <pre>${EP_echapperHTML(JSON.stringify(objet, null, 2))}</pre>
            </details>
        </article>
    `;
}

function EP_creerBlocStatsObjet(objetOuStats) {
    const champsIgnores = new Set([
        "uid",
        "genere",
        "baseId",
        "nom",
        "type",
        "slot",
        "famille",
        "niveau",
        "niveauRequis",
        "rarete",
        "prix",
        "description",
        "affixes",
        "effetSpecial",
        "image"
    ]);

    const lignes =
        Object.entries(objetOuStats || {})
            .filter(([cle, valeur]) => {
                if (champsIgnores.has(cle)) return false;
                return typeof valeur === "number" && valeur !== 0;
            })
            .map(([cle, valeur]) => {
                return `
                    <div class="equipement-procedural-stat">
                        <span>${EP_echapperHTML(cle)}</span>
                        <strong>+${EP_echapperHTML(valeur)}</strong>
                    </div>
                `;
            })
            .join("");

    if (!lignes) return "";

    return `
        <div class="equipement-procedural-stats">
            ${lignes}
        </div>
    `;
}

function EP_telechargerDerniersObjets() {
    const objets =
        Game.equipementsProceduraux.derniersObjets || [];

    if (!objets.length) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal("⚠ Aucun équipement procédural à télécharger.");
        }

        return;
    }

    const contenu =
        JSON.stringify(
            {
                date: new Date().toISOString(),
                version: "equipements_proceduraux_v1",
                objets
            },
            null,
            2
        );

    const blob =
        new Blob(
            [contenu],
            { type: "application/json" }
        );

    const url =
        URL.createObjectURL(blob);

    const lien =
        document.createElement("a");

    lien.href =
        url;

    lien.download =
        `equipements_proceduraux_${Date.now()}.json`;

    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);

    URL.revokeObjectURL(url);
}

console.log("✅ Equipements_Proceduraux.js chargé — v1.2 hard nerf équipements");
