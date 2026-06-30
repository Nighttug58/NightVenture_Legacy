/*
NightVenture — Combat legacy
Ancien moteur de combat conservé pour compatibilité.
Le moteur avancé reste dans Combats.js.
*/

function genererMonstreZone(zone) {
    if (!zone.monstres || zone.monstres.length === 0) return null;

    const tirage = Math.random() * 100;
    let cumul = 0;

    for (const entree of zone.monstres) {
        cumul += entree.chance;
        if (tirage <= cumul) return Game.cache.monstresParId[entree.id];
    }
    return Game.cache.monstresParId[zone.monstres[0].id];
}

function genererLootMonstre(monstre) {
    if (!monstre.loot) return [];
    const recompenses = [];

    monstre.loot.forEach(loot => {
        const tirage = Math.random() * 100;
        if (tirage > loot.chance) return;

        const min = loot.quantiteMin ?? 1;
        const max = loot.quantiteMax ?? 1;
        const quantite = Math.floor(Math.random() * (max - min + 1)) + min;

        recompenses.push({ id: loot.id, quantite: quantite });
    });

    return recompenses;
}


/*
COMBAT — Wrappers de compatibilité
Le moteur actif est Combats.js. Ces fonctions restent dans le core
comme points d'entrée stables pour Gameplay_Integration.js, les anciens
onclick et les fallbacks de développement.
*/
function demarrerCombat(monstre) {
    if (typeof demarrerCombatV2 === "function") {
        return demarrerCombatV2(monstre);
    }

    if (!monstre) return;

    Game.combat.actif = {
        monstre,
        pv: monstre.pv ?? 1,
        pvMax: monstre.pvMax ?? monstre.pv ?? 1,
        termine: false
    };

    ouvrirCombat();
}

function attaquerMonstre() {
    if (typeof attaquerMonstreV2 === "function") {
        return attaquerMonstreV2();
    }

    const combat =
        Game.combat.actif;

    if (!combat?.monstre) return;

    const monstre =
        combat.monstre;

    const degats =
        Math.max(1, attaqueTotale() - (monstre.defense || 0));

    combat.pv =
        Math.max(0, combat.pv - degats);

    if (combat.pv <= 0) {
        combat.termine =
            true;
    }

    ouvrirCombat();
}

function recolterRecompenses() {
    const combat =
        Game.combat.actif;

    if (!combat?.monstre) return;

    const monstre =
        combat.monstre;

    const xp =
        monstre.xp || 0;

    const or =
        monstre.or || 0;

    const loot =
        genererLootMonstre(monstre);

    Game.data.personnage.xp +=
        xp;

    Game.data.personnage.or +=
        or;

    loot.forEach(item => {
        ajouterObjetInventaire(item.id, item.quantite);
    });

    ajouterJournal(`🏆 ${monstre.nom} vaincu`);
    if (xp > 0) ajouterJournal(`⭐ +${xp} XP`);
    if (or > 0) ajouterJournal(`🟡 +${or} or`);

    loot.forEach(item => {
        const objet =
            trouverObjet(item.id);

        ajouterJournal(`📦 ${objet?.nom || item.id} x${item.quantite}`);
    });

    verifierNiveau();
    quitterCombat();
}

function quitterCombat() {
    if (typeof quitterCombatV2 === "function") {
        return quitterCombatV2();
    }

    Game.combat.actif =
        null;

    ouvrirExploration();
}

function ouvrirCombat() {
    if (typeof ouvrirCombatV2 === "function") {
        return ouvrirCombatV2();
    }

    const combat =
        Game.combat.actif;

    if (!combat?.monstre) {
        ouvrirExploration();
        return;
    }

    changerVue("combat");

    const monstre =
        combat.monstre;

    const pv =
        combat.pv ?? 0;

    const pvMax =
        combat.pvMax ?? monstre.pvMax ?? monstre.pv ?? 1;

    const html = `
        <div class="item-card">
            <h2>⚔ Combat</h2>
            <h3>${monstre.nom}</h3>
            ${creerBarreRessource(
                "barre-pv",
                calculerPourcentage(pv, pvMax),
                pv,
                pvMax,
                "❤️ PV"
            )}
        </div>

        <div class="item-card">
            ${
                combat.termine
                    ? `<button onclick="recolterRecompenses()">Récolter récompenses</button>`
                    : `
                        <button onclick="attaquerMonstre()">Attaquer</button>
                        <button onclick="quitterCombat()">Fuir</button>
                    `
            }
        </div>
    `;

    afficherVuePrincipale(html);
}
