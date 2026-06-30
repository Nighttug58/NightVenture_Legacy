/*
NightVenture - Classes Metin2
Source officielle runtime des classes, specialisations et competences.
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
        bonusCombat: { pvMax: 18, manaMax: -8, staminaMax: 10, attaquePhysique: 4, attaqueMagique: -6, defensePhysique: 4, defenseMagique: 0, critique: 0, esquive: -1, vitesse: 0 },
        statsDepart: { force: 9, dexterite: 4, intelligence: 2, vitalite: 8, chance: 3, vitesse: 4 },
        ressourcesDepart: { pv: 198, mana: 62, stamina: 130 },
        specialisationDepart: "guerrier_corps_a_corps",
        specialisations: [
            { id: "guerrier_corps_a_corps", nom: "Corps a Corps", description: "Style offensif du Guerrier, rapide et brutal.", competences: ["guerrier_aura_epee", "guerrier_berserk", "guerrier_moulinet_epee", "guerrier_triple_entaille", "guerrier_charge"] },
            { id: "guerrier_mental", nom: "Mental", description: "Style defensif et lourd du Guerrier, base sur l'impact et la resistance.", competences: ["guerrier_corps_puissant", "guerrier_coup_epee", "guerrier_pilon", "guerrier_frappe_esprit", "guerrier_tremblement"] }
        ]
    },
    {
        id: "ninja",
        nom: "Ninja",
        icone: "N",
        description: "Classe rapide et precise, specialisee en dexterite, critique, esquive et vitesse.",
        ordre: 2,
        base: { force: 4, dexterite: 9, intelligence: 3, vitalite: 4, chance: 5, vitesse: 9 },
        poids: { force: 0.80, dexterite: 1.80, intelligence: 0.35, vitalite: 0.65, chance: 1.10, vitesse: 1.65 },
        bonusCombat: { pvMax: -4, manaMax: -4, staminaMax: 18, attaquePhysique: 3, attaqueMagique: -4, defensePhysique: -1, defenseMagique: -1, critique: 4, esquive: 4, vitesse: 0 },
        statsDepart: { force: 5, dexterite: 11, intelligence: 3, vitalite: 4, chance: 6, vitesse: 11 },
        ressourcesDepart: { pv: 136, mana: 76, stamina: 173 },
        specialisationDepart: "ninja_assassin",
        specialisations: [
            { id: "ninja_assassin", nom: "Assassin", description: "Style dague, critique et attaque dans le dos.", competences: ["ninja_embuscade", "ninja_attaque_rapide", "ninja_dague_tournoyante", "ninja_furtivite", "ninja_nuage_poison"] },
            { id: "ninja_archer", nom: "Archer", description: "Style distance, fleches rapides et tirs elementaires.", competences: ["ninja_tir_repetitif", "ninja_pluie_fleches", "ninja_fleche_feu", "ninja_fleche_poison", "ninja_pas_plume"] }
        ]
    },
    {
        id: "sura",
        nom: "Sura",
        icone: "S",
        description: "Guerrier demoniaque hybride, puissant en attaque physique et magie sombre.",
        ordre: 3,
        base: { force: 6, dexterite: 4, intelligence: 7, vitalite: 5, chance: 3, vitesse: 5 },
        poids: { force: 1.05, dexterite: 0.65, intelligence: 1.35, vitalite: 1.00, chance: 0.55, vitesse: 0.80 },
        bonusCombat: { pvMax: 10, manaMax: 24, staminaMax: 2, attaquePhysique: 2, attaqueMagique: 6, defensePhysique: 1, defenseMagique: 4, critique: 1, esquive: 0, vitesse: 0 },
        statsDepart: { force: 7, dexterite: 4, intelligence: 9, vitalite: 6, chance: 3, vitesse: 5 },
        ressourcesDepart: { pv: 170, mana: 164, stamina: 122 },
        specialisationDepart: "sura_armes_magiques",
        specialisations: [
            { id: "sura_armes_magiques", nom: "Armes Magiques", description: "Style hybride, arme enchantee et magie demoniaque de contact.", competences: ["sura_lame_enchantee", "sura_armure_enchantee", "sura_peur", "sura_tourbillon_dragon", "sura_doigt_de_lame"] },
            { id: "sura_magie_noire", nom: "Magie Noire", description: "Style lanceur de sorts, orbes noires et flammes spirituelles.", competences: ["sura_frappe_obscure", "sura_esprit_flamme", "sura_protection_tenebres", "sura_frappe_fantome", "sura_orbe_noire"] }
        ]
    },
    {
        id: "shaman",
        nom: "Shaman",
        icone: "H",
        description: "Classe mystique orientee magie, soutien, resistance magique et controle du rythme.",
        ordre: 4,
        base: { force: 3, dexterite: 4, intelligence: 9, vitalite: 5, chance: 5, vitesse: 5 },
        poids: { force: 0.45, dexterite: 0.70, intelligence: 1.70, vitalite: 0.95, chance: 0.90, vitesse: 0.85 },
        bonusCombat: { pvMax: 6, manaMax: 38, staminaMax: -2, attaquePhysique: -4, attaqueMagique: 9, defensePhysique: 0, defenseMagique: 7, critique: 1, esquive: 0, vitesse: 0 },
        statsDepart: { force: 3, dexterite: 5, intelligence: 11, vitalite: 6, chance: 6, vitesse: 5 },
        ressourcesDepart: { pv: 166, mana: 198, stamina: 123 },
        specialisationDepart: "shaman_dragon",
        specialisations: [
            { id: "shaman_dragon", nom: "Dragon", description: "Style offensif du Shaman, talismans et puissance draconique.", competences: ["shaman_talisman_volant", "shaman_rugissement_dragon", "shaman_dragon_chassant", "shaman_benediction", "shaman_aide_dragon"] },
            { id: "shaman_soin", nom: "Soin", description: "Style lumiere et foudre, soutien converti en attaques pour cette V1.", competences: ["shaman_jet_lumiere", "shaman_griffe_eclair", "shaman_appel_eclair", "shaman_soin", "shaman_acceleration"] }
        ]
    }
];

NV_CLASSES_METIN2.forEach(classe => {
    const spec = classe.specialisations.find(s => s.id === classe.specialisationDepart) || classe.specialisations[0];
    classe.competencesDepart = spec ? [...spec.competences] : [];
});

const NV_COMPETENCE_SPECS_METIN2 = [
    ["guerrier", "guerrier_corps_a_corps", "Corps a Corps", "guerrier_aura_epee", "Aura de l'Epee", "physique", "stamina", 7, 30, 1, 2, "Concentre l'aura de l'epee pour frapper plus lourdement."],
    ["guerrier", "guerrier_corps_a_corps", "Corps a Corps", "guerrier_berserk", "Berserk", "physique", "stamina", 6, 28, 3, 2, "Canalise une rage offensive dans une attaque brutale."],
    ["guerrier", "guerrier_corps_a_corps", "Corps a Corps", "guerrier_moulinet_epee", "Moulinet a l'Epee", "physique", "stamina", 8, 34, 1, 3, "Un large arc de lame qui balaye l'ennemi."],
    ["guerrier", "guerrier_corps_a_corps", "Corps a Corps", "guerrier_triple_entaille", "Triple Entaille", "physique", "stamina", 9, 38, 2, 3, "Trois frappes rapides concentrees sur une meme cible."],
    ["guerrier", "guerrier_corps_a_corps", "Corps a Corps", "guerrier_charge", "Charge", "physique", "stamina", 10, 42, 2, 4, "Percute l'adversaire avec une charge decisive."],
    ["guerrier", "guerrier_mental", "Mental", "guerrier_corps_puissant", "Corps Puissant", "physique", "stamina", 6, 29, 0, 2, "Transforme l'endurance en impact frontal."],
    ["guerrier", "guerrier_mental", "Mental", "guerrier_coup_epee", "Coup d'Epee", "physique", "stamina", 8, 33, 1, 2, "Frappe nette et lourde d'un guerrier mental."],
    ["guerrier", "guerrier_mental", "Mental", "guerrier_pilon", "Pilon", "physique", "stamina", 10, 40, 0, 3, "Ecrase l'ennemi avec une attaque descendante."],
    ["guerrier", "guerrier_mental", "Mental", "guerrier_frappe_esprit", "Frappe de l'Esprit", "physique", "stamina", 11, 44, 1, 4, "Libere une pression spirituelle dans la lame."],
    ["guerrier", "guerrier_mental", "Mental", "guerrier_tremblement", "Tremblement", "physique", "stamina", 12, 48, 0, 4, "Un choc de guerre qui fait vaciller la cible."],

    ["ninja", "ninja_assassin", "Assassin", "ninja_embuscade", "Embuscade", "physique", "stamina", 5, 27, 4, 2, "Frappe sournoise, rapide et critique."],
    ["ninja", "ninja_assassin", "Assassin", "ninja_attaque_rapide", "Attaque Rapide", "physique", "stamina", 6, 29, 5, 2, "Assaut fulgurant avec une courte recuperation."],
    ["ninja", "ninja_assassin", "Assassin", "ninja_dague_tournoyante", "Dague Tournoyante", "physique", "stamina", 7, 33, 5, 3, "Enchaine une rotation de dagues aceree."],
    ["ninja", "ninja_assassin", "Assassin", "ninja_furtivite", "Furtivite", "physique", "stamina", 8, 36, 8, 3, "Sort de l'ombre pour porter un coup precis."],
    ["ninja", "ninja_assassin", "Assassin", "ninja_nuage_poison", "Nuage Empoisonne", "physique", "stamina", 9, 39, 6, 4, "Une attaque empoisonnee qui profite des ouvertures."],
    ["ninja", "ninja_archer", "Archer", "ninja_tir_repetitif", "Tir Repetitif", "physique", "stamina", 5, 26, 3, 2, "Decoche une sequence de fleches rapides."],
    ["ninja", "ninja_archer", "Archer", "ninja_pluie_fleches", "Pluie de Fleches", "physique", "stamina", 7, 32, 2, 3, "Arrose la zone d'une salve concentree."],
    ["ninja", "ninja_archer", "Archer", "ninja_fleche_feu", "Fleche de Feu", "physique", "stamina", 8, 36, 4, 3, "Une fleche incandescente a fort impact."],
    ["ninja", "ninja_archer", "Archer", "ninja_fleche_poison", "Fleche Empoisonnee", "physique", "stamina", 9, 38, 5, 4, "Fleche vicieuse qui perce les defenses."],
    ["ninja", "ninja_archer", "Archer", "ninja_pas_plume", "Pas de Plume", "physique", "stamina", 6, 31, 7, 2, "Tir agile porte dans un mouvement evasif."],

    ["sura", "sura_armes_magiques", "Armes Magiques", "sura_lame_enchantee", "Lame Enchantee", "magique", "hybrid", 8, 35, 2, 2, "Une lame sombre chargee d'energie demoniaque."],
    ["sura", "sura_armes_magiques", "Armes Magiques", "sura_armure_enchantee", "Armure Enchantee", "magique", "hybrid", 7, 32, 1, 2, "Convertit l'energie defensive en riposte occulte."],
    ["sura", "sura_armes_magiques", "Armes Magiques", "sura_peur", "Peur", "magique", "mana", 8, 34, 2, 3, "Impose une pression demoniaque a l'ennemi."],
    ["sura", "sura_armes_magiques", "Armes Magiques", "sura_tourbillon_dragon", "Tourbillon du Dragon", "magique", "hybrid", 10, 43, 2, 4, "Dechaine un cercle d'energie noire."],
    ["sura", "sura_armes_magiques", "Armes Magiques", "sura_doigt_de_lame", "Doigt de Lame", "magique", "mana", 11, 46, 3, 4, "Transperce la cible avec une pointe d'energie."],
    ["sura", "sura_magie_noire", "Magie Noire", "sura_frappe_obscure", "Frappe Obscure", "magique", "mana", 8, 36, 2, 2, "Projectile noir compact et violent."],
    ["sura", "sura_magie_noire", "Magie Noire", "sura_esprit_flamme", "Esprit de Flamme", "magique", "mana", 9, 40, 2, 3, "Invoque une flamme spirituelle instable."],
    ["sura", "sura_magie_noire", "Magie Noire", "sura_protection_tenebres", "Protection des Tenebres", "magique", "mana", 7, 34, 1, 2, "Retourne une partie des tenebres en attaque."],
    ["sura", "sura_magie_noire", "Magie Noire", "sura_frappe_fantome", "Frappe Fantome", "magique", "mana", 10, 44, 3, 4, "Un coup spectral qui ignore les reflexes."],
    ["sura", "sura_magie_noire", "Magie Noire", "sura_orbe_noire", "Orbe Noire", "magique", "mana", 12, 50, 4, 5, "Orbe concentree de magie noire pure."],

    ["shaman", "shaman_dragon", "Dragon", "shaman_talisman_volant", "Talisman Volant", "magique", "mana", 7, 32, 1, 2, "Projette un talisman charge d'esprit."],
    ["shaman", "shaman_dragon", "Dragon", "shaman_rugissement_dragon", "Rugissement du Dragon", "magique", "mana", 9, 39, 1, 3, "Onde draconique spirituelle qui frappe a distance."],
    ["shaman", "shaman_dragon", "Dragon", "shaman_dragon_chassant", "Dragon Chassant", "magique", "mana", 10, 43, 2, 4, "Un dragon d'energie poursuit sa cible."],
    ["shaman", "shaman_dragon", "Dragon", "shaman_benediction", "Benediction", "magique", "mana", 6, 30, 1, 2, "Transforme une benediction en choc sacre."],
    ["shaman", "shaman_dragon", "Dragon", "shaman_aide_dragon", "Aide du Dragon", "magique", "mana", 8, 36, 3, 3, "Appelle la faveur du dragon pour amplifier l'attaque."],
    ["shaman", "shaman_soin", "Soin", "shaman_jet_lumiere", "Jet de Lumiere", "magique", "mana", 7, 31, 1, 2, "Trait lumineux concentre sur l'ennemi."],
    ["shaman", "shaman_soin", "Soin", "shaman_griffe_eclair", "Griffe de l'Eclair", "magique", "mana", 8, 35, 2, 3, "Lacere la cible avec une griffe de foudre."],
    ["shaman", "shaman_soin", "Soin", "shaman_appel_eclair", "Appel de l'Eclair", "magique", "mana", 10, 42, 2, 4, "Fait tomber l'eclair sur l'adversaire."],
    ["shaman", "shaman_soin", "Soin", "shaman_soin", "Soin", "magique", "mana", 6, 29, 0, 2, "Canalise l'energie vitale en onde offensive pour cette V1."],
    ["shaman", "shaman_soin", "Soin", "shaman_acceleration", "Acceleration", "magique", "mana", 7, 33, 3, 2, "Convertit la vitesse spirituelle en impact magique."]
];

function NV_progressionCompetenceMetin2(base, fin, coutType, cooldown, critiqueBase) {
    const progression = [];
    for (let niveau = 1; niveau <= 5; niveau++) {
        const t = (niveau - 1) / 4;
        const puissance = Math.round(base + (fin - base) * t);
        const multiplicateur = Number((0.96 + 0.08 * niveau + (fin >= 40 ? 0.03 : 0)).toFixed(2));
        let couts;
        if (coutType === "stamina") {
            couts = { mana: 0, stamina: Math.round(6 + niveau * 3 + fin / 12) };
        } else if (coutType === "hybrid") {
            couts = { mana: Math.round(5 + niveau * 4 + fin / 14), stamina: Math.round(3 + niveau * 2) };
        } else {
            couts = { mana: Math.round(7 + niveau * 5 + fin / 10), stamina: 0 };
        }
        progression.push({ niveau, puissance, multiplicateur, couts, coutInitiative: 100 + niveau * 2 + cooldown, bonusCritique: critiqueBase + niveau - 1 });
    }
    return progression;
}

function NV_creerCompetenceMetin2(spec) {
    const [classe, specialisation, specialisationNom, id, nom, nature, coutType, base, fin, critiqueBase, cooldownTours, description] = spec;
    const progression = NV_progressionCompetenceMetin2(base, fin, coutType, cooldownTours, critiqueBase);
    const niveau1 = progression[0];
    return {
        id,
        nom,
        specialisation,
        specialisationNom,
        typeAction: "attaque",
        nature,
        cible: "ennemi",
        icone: `assets/competences/${id}.png`,
        image: `assets/competences/${id}.png`,
        maxNiveau: 5,
        cooldownTours,
        couts: niveau1.couts,
        coutInitiative: niveau1.coutInitiative,
        puissance: niveau1.puissance,
        multiplicateur: niveau1.multiplicateur,
        bonusCritique: niveau1.bonusCritique,
        description: `Competence ${specialisationNom} de ${classe.charAt(0).toUpperCase() + classe.slice(1)} inspiree de Metin2 : ${description}`,
        classes: [classe],
        classe,
        progression,
        effets: []
    };
}

const NV_COMPETENCES_METIN2 = NV_COMPETENCE_SPECS_METIN2.map(NV_creerCompetenceMetin2);

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
