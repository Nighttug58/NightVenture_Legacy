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
        base: { force: 8, dexterite: 4, intelligence: 2, vitalite: 7, chance: 3 },
        poids: { force: 1.45, dexterite: 0.75, intelligence: 0.25, vitalite: 1.30, chance: 0.55 },
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
            vitesse: -0.5
        },
        statsDepart: { force: 9, dexterite: 4, intelligence: 2, vitalite: 8, chance: 3 },
        ressourcesDepart: { pv: 198, mana: 62, stamina: 130 },
        competencesDepart: ["metin2_coup_puissant"]
    },
    {
        id: "ninja",
        nom: "Ninja",
        icone: "N",
        description: "Classe rapide et precise, specialisee en dexterite, critique et esquive.",
        ordre: 2,
        base: { force: 4, dexterite: 9, intelligence: 3, vitalite: 4, chance: 5 },
        poids: { force: 0.80, dexterite: 1.80, intelligence: 0.35, vitalite: 0.65, chance: 1.10 },
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
            vitesse: 3
        },
        statsDepart: { force: 5, dexterite: 11, intelligence: 3, vitalite: 4, chance: 6 },
        ressourcesDepart: { pv: 136, mana: 76, stamina: 173 },
        competencesDepart: ["metin2_lame_rapide"]
    },
    {
        id: "sura",
        nom: "Sura",
        icone: "S",
        description: "Guerrier demoniaque hybride, puissant en attaque physique et magie sombre.",
        ordre: 3,
        base: { force: 6, dexterite: 4, intelligence: 7, vitalite: 5, chance: 3 },
        poids: { force: 1.05, dexterite: 0.65, intelligence: 1.35, vitalite: 1.00, chance: 0.55 },
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
        statsDepart: { force: 7, dexterite: 4, intelligence: 9, vitalite: 6, chance: 3 },
        ressourcesDepart: { pv: 170, mana: 164, stamina: 122 },
        competencesDepart: ["metin2_lame_demoniaque"]
    },
    {
        id: "shaman",
        nom: "Shaman",
        icone: "H",
        description: "Classe mystique orientee magie, soutien, resistance magique et controle du rythme.",
        ordre: 4,
        base: { force: 3, dexterite: 4, intelligence: 9, vitalite: 5, chance: 5 },
        poids: { force: 0.45, dexterite: 0.70, intelligence: 1.70, vitalite: 0.95, chance: 0.90 },
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
            vitesse: 0.5
        },
        statsDepart: { force: 3, dexterite: 5, intelligence: 11, vitalite: 6, chance: 6 },
        ressourcesDepart: { pv: 166, mana: 198, stamina: 123 },
        competencesDepart: ["metin2_orbe_spirituel"]
    }
];

const NV_COMPETENCES_METIN2 = [
    {
        id: "metin2_coup_puissant",
        nom: "Coup puissant",
        typeAction: "attaque",
        nature: "physique",
        cible: "ennemi",
        couts: { mana: 0, stamina: 9 },
        coutInitiative: 112,
        puissance: 8,
        multiplicateur: 1.05,
        bonusCritique: 1,
        description: "Frappe lourde de Guerrier.",
        classes: ["guerrier"],
        classe: "guerrier",
        effets: []
    },
    {
        id: "metin2_lame_rapide",
        nom: "Lame rapide",
        typeAction: "attaque",
        nature: "physique",
        cible: "ennemi",
        couts: { mana: 0, stamina: 6 },
        coutInitiative: 86,
        puissance: 5,
        multiplicateur: 0.98,
        bonusCritique: 5,
        bonusEsquive: 1,
        description: "Attaque rapide de Ninja.",
        classes: ["ninja"],
        classe: "ninja",
        effets: []
    },
    {
        id: "metin2_lame_demoniaque",
        nom: "Lame demoniaque",
        typeAction: "attaque",
        nature: "magique",
        cible: "ennemi",
        couts: { mana: 8, stamina: 4 },
        coutInitiative: 102,
        puissance: 9,
        multiplicateur: 1.04,
        bonusCritique: 2,
        description: "Attaque sombre hybride de Sura.",
        classes: ["sura"],
        classe: "sura",
        effets: []
    },
    {
        id: "metin2_orbe_spirituel",
        nom: "Orbe spirituel",
        typeAction: "attaque",
        nature: "magique",
        cible: "ennemi",
        couts: { mana: 9, stamina: 0 },
        coutInitiative: 96,
        puissance: 10,
        multiplicateur: 1.02,
        bonusCritique: 1,
        description: "Projectile mystique de Shaman.",
        classes: ["shaman"],
        classe: "shaman",
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
