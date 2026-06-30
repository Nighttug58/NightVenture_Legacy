/*
NightVenture - Classes Metin2
Source officielle runtime des classes jouables.
*/

const NV_CLASSES_METIN2 = [
    {
        id: "guerrier",
        nom: "Guerrier",
        icone: "G",
        description: "Combattant physique solide, base sur la force, la vitalite et la defense.",
        ordre: 1,
        base: { force: 8, dexterite: 4, intelligence: 2, vitalite: 7, chance: 3, vitesse: 4 },
        poids: { force: 1.45, dexterite: 0.75, intelligence: 0.25, vitalite: 1.30, chance: 0.55, vitesse: 0.65 },
        bonusCombat: {
            pvMax: 18,
            manaMax: -8,
            staminaMax: 10,
            attaquePhysique: 4,
            attaqueMagique: -6,
            defensePhysique: 4,
            defenseMagique: 0,
            critique: 0,
            esquive: -1,
            vitesse: 0
        },
        statsDepart: { force: 9, dexterite: 4, intelligence: 2, vitalite: 8, chance: 3, vitesse: 4 },
        ressourcesDepart: { pv: 198, mana: 62, stamina: 130 },
        competencesDepart: ["guerrier_aura_epee"]
    },
    {
        id: "ninja",
        nom: "Ninja",
        icone: "N",
        description: "Classe rapide et precise, specialisee en dexterite, critique, esquive et vitesse.",
        ordre: 2,
        base: { force: 4, dexterite: 9, intelligence: 3, vitalite: 4, chance: 5, vitesse: 9 },
        poids: { force: 0.80, dexterite: 1.80, intelligence: 0.35, vitalite: 0.65, chance: 1.10, vitesse: 1.65 },
        bonusCombat: {
            pvMax: -4,
            manaMax: -4,
            staminaMax: 18,
            attaquePhysique: 3,
            attaqueMagique: -4,
            defensePhysique: -1,
            defenseMagique: -1,
            critique: 4,
            esquive: 4,
            vitesse: 0
        },
        statsDepart: { force: 5, dexterite: 11, intelligence: 3, vitalite: 4, chance: 6, vitesse: 11 },
        ressourcesDepart: { pv: 136, mana: 76, stamina: 173 },
        competencesDepart: ["ninja_embuscade"]
    },
    {
        id: "sura",
        nom: "Sura",
        icone: "S",
        description: "Guerrier demoniaque hybride, puissant en attaque physique et magie sombre.",
        ordre: 3,
        base: { force: 6, dexterite: 4, intelligence: 7, vitalite: 5, chance: 3, vitesse: 5 },
        poids: { force: 1.05, dexterite: 0.65, intelligence: 1.35, vitalite: 1.00, chance: 0.55, vitesse: 0.80 },
        bonusCombat: {
            pvMax: 10,
            manaMax: 24,
            staminaMax: 2,
            attaquePhysique: 2,
            attaqueMagique: 6,
            defensePhysique: 1,
            defenseMagique: 4,
            critique: 1,
            esquive: 0,
            vitesse: 0
        },
        statsDepart: { force: 7, dexterite: 4, intelligence: 9, vitalite: 6, chance: 3, vitesse: 5 },
        ressourcesDepart: { pv: 170, mana: 164, stamina: 122 },
        competencesDepart: ["sura_lame_enchantee"]
    },
    {
        id: "shaman",
        nom: "Shaman",
        icone: "H",
        description: "Classe mystique orientee magie, soutien, resistance magique et controle du rythme.",
        ordre: 4,
        base: { force: 3, dexterite: 4, intelligence: 9, vitalite: 5, chance: 5, vitesse: 5 },
        poids: { force: 0.45, dexterite: 0.70, intelligence: 1.70, vitalite: 0.95, chance: 0.90, vitesse: 0.85 },
        bonusCombat: {
            pvMax: 6,
            manaMax: 38,
            staminaMax: -2,
            attaquePhysique: -4,
            attaqueMagique: 9,
            defensePhysique: 0,
            defenseMagique: 7,
            critique: 1,
            esquive: 0,
            vitesse: 0
        },
        statsDepart: { force: 3, dexterite: 5, intelligence: 11, vitalite: 6, chance: 6, vitesse: 5 },
        ressourcesDepart: { pv: 166, mana: 198, stamina: 123 },
        competencesDepart: ["shaman_rugissement_dragon"]
    }
];

const NV_COMPETENCES_METIN2 = [
    {
        id: "guerrier_aura_epee",
        nom: "Aura de l'Epee",
        typeAction: "attaque",
        nature: "physique",
        cible: "ennemi",
        icone: "assets/competences/guerrier_aura_epee.png",
        image: "assets/competences/guerrier_aura_epee.png",
        maxNiveau: 5,
        couts: { mana: 0, stamina: 8 },
        coutInitiative: 108,
        puissance: 7,
        multiplicateur: 1.0,
        bonusCritique: 1,
        description: "Competence de Guerrier inspiree de Metin2 : concentre l'aura de l'epee pour frapper plus lourdement.",
        classes: ["guerrier"],
        classe: "guerrier",
        progression: [
            { niveau: 1, puissance: 7, multiplicateur: 1.0, couts: { mana: 0, stamina: 8 }, coutInitiative: 108, bonusCritique: 1 },
            { niveau: 2, puissance: 11, multiplicateur: 1.07, couts: { mana: 0, stamina: 12 }, coutInitiative: 110, bonusCritique: 2 },
            { niveau: 3, puissance: 16, multiplicateur: 1.14, couts: { mana: 0, stamina: 16 }, coutInitiative: 112, bonusCritique: 3 },
            { niveau: 4, puissance: 22, multiplicateur: 1.22, couts: { mana: 0, stamina: 21 }, coutInitiative: 114, bonusCritique: 4 },
            { niveau: 5, puissance: 30, multiplicateur: 1.32, couts: { mana: 0, stamina: 27 }, coutInitiative: 116, bonusCritique: 5 }
        ],
        effets: []
    },
    {
        id: "ninja_embuscade",
        nom: "Embuscade",
        typeAction: "attaque",
        nature: "physique",
        cible: "ennemi",
        icone: "assets/competences/ninja_embuscade.png",
        image: "assets/competences/ninja_embuscade.png",
        maxNiveau: 5,
        couts: { mana: 0, stamina: 7 },
        coutInitiative: 82,
        puissance: 5,
        multiplicateur: 0.96,
        bonusCritique: 4,
        bonusEsquive: 1,
        description: "Competence de Ninja inspiree de Metin2 : frappe sournoise, rapide et critique.",
        classes: ["ninja"],
        classe: "ninja",
        progression: [
            { niveau: 1, puissance: 5, multiplicateur: 0.96, couts: { mana: 0, stamina: 7 }, coutInitiative: 82, bonusCritique: 4, bonusEsquive: 1 },
            { niveau: 2, puissance: 9, multiplicateur: 1.02, couts: { mana: 0, stamina: 10 }, coutInitiative: 84, bonusCritique: 6, bonusEsquive: 1 },
            { niveau: 3, puissance: 14, multiplicateur: 1.08, couts: { mana: 0, stamina: 14 }, coutInitiative: 86, bonusCritique: 8, bonusEsquive: 2 },
            { niveau: 4, puissance: 20, multiplicateur: 1.15, couts: { mana: 0, stamina: 18 }, coutInitiative: 88, bonusCritique: 10, bonusEsquive: 2 },
            { niveau: 5, puissance: 27, multiplicateur: 1.24, couts: { mana: 0, stamina: 23 }, coutInitiative: 90, bonusCritique: 13, bonusEsquive: 3 }
        ],
        effets: []
    },
    {
        id: "sura_lame_enchantee",
        nom: "Lame Enchantee",
        typeAction: "attaque",
        nature: "magique",
        cible: "ennemi",
        icone: "assets/competences/sura_lame_enchantee.png",
        image: "assets/competences/sura_lame_enchantee.png",
        maxNiveau: 5,
        couts: { mana: 9, stamina: 4 },
        coutInitiative: 100,
        puissance: 8,
        multiplicateur: 1.02,
        bonusCritique: 2,
        description: "Competence de Sura inspiree de Metin2 : une lame sombre chargee d'energie demoniaque.",
        classes: ["sura"],
        classe: "sura",
        progression: [
            { niveau: 1, puissance: 8, multiplicateur: 1.02, couts: { mana: 9, stamina: 4 }, coutInitiative: 100, bonusCritique: 2 },
            { niveau: 2, puissance: 13, multiplicateur: 1.09, couts: { mana: 13, stamina: 6 }, coutInitiative: 102, bonusCritique: 3 },
            { niveau: 3, puissance: 19, multiplicateur: 1.16, couts: { mana: 18, stamina: 8 }, coutInitiative: 104, bonusCritique: 4 },
            { niveau: 4, puissance: 26, multiplicateur: 1.24, couts: { mana: 24, stamina: 10 }, coutInitiative: 106, bonusCritique: 5 },
            { niveau: 5, puissance: 35, multiplicateur: 1.34, couts: { mana: 31, stamina: 13 }, coutInitiative: 108, bonusCritique: 7 }
        ],
        effets: []
    },
    {
        id: "shaman_rugissement_dragon",
        nom: "Rugissement du Dragon",
        typeAction: "attaque",
        nature: "magique",
        cible: "ennemi",
        icone: "assets/competences/shaman_rugissement_dragon.png",
        image: "assets/competences/shaman_rugissement_dragon.png",
        maxNiveau: 5,
        couts: { mana: 10, stamina: 0 },
        coutInitiative: 96,
        puissance: 9,
        multiplicateur: 1.0,
        bonusCritique: 1,
        description: "Competence de Shaman inspiree de Metin2 : une onde draconique spirituelle qui frappe a distance.",
        classes: ["shaman"],
        classe: "shaman",
        progression: [
            { niveau: 1, puissance: 9, multiplicateur: 1.0, couts: { mana: 10, stamina: 0 }, coutInitiative: 96, bonusCritique: 1 },
            { niveau: 2, puissance: 14, multiplicateur: 1.07, couts: { mana: 15, stamina: 0 }, coutInitiative: 98, bonusCritique: 2 },
            { niveau: 3, puissance: 21, multiplicateur: 1.14, couts: { mana: 21, stamina: 0 }, coutInitiative: 100, bonusCritique: 3 },
            { niveau: 4, puissance: 29, multiplicateur: 1.22, couts: { mana: 28, stamina: 0 }, coutInitiative: 102, bonusCritique: 4 },
            { niveau: 5, puissance: 39, multiplicateur: 1.32, couts: { mana: 36, stamina: 0 }, coutInitiative: 104, bonusCritique: 5 }
        ],
        effets: []
    }
];

function NV_clonerClassesMetin2(valeur) {
    return JSON.parse(JSON.stringify(valeur));
}

function NV_enregistrerClassesEtCompetences() {
    if (!window.Game) {
        throw new Error("Game indisponible pour charger les classes Metin2.");
    }

    Game.data.classes = NV_clonerClassesMetin2(NV_CLASSES_METIN2);
    Game.data.competences = NV_clonerClassesMetin2(NV_COMPETENCES_METIN2);

    Game.cache.classesParId = {};
    Game.cache.competencesParId = {};

    Game.data.classes.forEach(classe => {
        Game.cache.classesParId[classe.id] = classe;
    });

    Game.data.competences.forEach(competence => {
        Game.cache.competencesParId[competence.id] = competence;
    });
}

window.NV_CLASSES_METIN2 = NV_CLASSES_METIN2;
window.NV_COMPETENCES_METIN2 = NV_COMPETENCES_METIN2;
window.NV_enregistrerClassesEtCompetences = NV_enregistrerClassesEtCompetences;
