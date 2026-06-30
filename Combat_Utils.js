/*
NightVenture — Combat Utils
- Generation des monstres par zone
- Generation du loot de monstre

Fonctions utilitaires partagees par l'exploration, les combats et les integrations gameplay.
*/

function genererMonstreZone(zone) {
    if (!zone?.monstres || zone.monstres.length === 0) return null;

    const tirage = Math.random() * 100;
    let cumul = 0;

    for (const entree of zone.monstres) {
        cumul += Number(entree.chance || 0);
        if (tirage <= cumul) return Game.cache.monstresParId?.[entree.id] || null;
    }

    return Game.cache.monstresParId?.[zone.monstres[0].id] || null;
}

function genererLootMonstre(monstre) {
    if (!monstre?.loot) return [];
    const recompenses = [];

    monstre.loot.forEach(loot => {
        const tirage = Math.random() * 100;
        if (tirage > Number(loot.chance || 0)) return;

        const min = Number(loot.quantiteMin ?? 1);
        const max = Number(loot.quantiteMax ?? 1);
        const quantite = Math.floor(Math.random() * (max - min + 1)) + min;

        recompenses.push({ id: loot.id, quantite });
    });

    return recompenses;
}
