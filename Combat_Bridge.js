/*
NightVenture — Combat Bridge
- Points d'entree stables pour les anciens onclick et Gameplay_Integration.js
- Le moteur avance reste dans Combats.js
- Les fonctions fallback restent disponibles si le moteur avance n'est pas encore charge
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

    const combat = Game.combat.actif;
    if (!combat?.monstre) return;

    const monstre = combat.monstre;
    const degats = Math.max(1, attaqueTotale() - (monstre.defense || 0));

    combat.pv = Math.max(0, combat.pv - degats);

    if (combat.pv <= 0) {
        combat.termine = true;
    }

    ouvrirCombat();
}

function recolterRecompenses() {
    const combat = Game.combat.actif;
    if (!combat?.monstre || !Game.data?.personnage) return;

    const monstre = combat.monstre;
    const xp = monstre.xp || 0;
    const or = monstre.or || 0;
    const loot = typeof genererLootMonstre === "function" ? genererLootMonstre(monstre) : [];

    Game.data.personnage.xp += xp;
    Game.data.personnage.or += or;

    loot.forEach(item => {
        ajouterObjetInventaire(item.id, item.quantite);
    });

    ajouterJournal(`Vaincu : ${monstre.nom}`);
    if (xp > 0) ajouterJournal(`XP +${xp}`);
    if (or > 0) ajouterJournal(`Or +${or}`);

    loot.forEach(item => {
        const objet = trouverObjet(item.id);
        ajouterJournal(`Butin : ${objet?.nom || item.id} x${item.quantite}`);
    });

    verifierNiveau();
    quitterCombat();
}

function quitterCombat() {
    if (typeof quitterCombatV2 === "function") {
        return quitterCombatV2();
    }

    Game.combat.actif = null;
    ouvrirExploration();
}

function ouvrirCombat() {
    if (typeof ouvrirCombatV2 === "function") {
        return ouvrirCombatV2();
    }

    const combat = Game.combat.actif;

    if (!combat?.monstre) {
        ouvrirExploration();
        return;
    }

    changerVue("combat");

    const monstre = combat.monstre;
    const pv = combat.pv ?? 0;
    const pvMax = combat.pvMax ?? monstre.pvMax ?? monstre.pv ?? 1;

    const html = `
        <div class="item-card">
            <h2>Combat</h2>
            <h3>${monstre.nom}</h3>
            ${creerBarreRessource(
                "barre-pv",
                calculerPourcentage(pv, pvMax),
                pv,
                pvMax,
                "PV"
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
