/*
NightVenture — Talents core
- Amélioration des talents
- Vue talents

Ce module reste neutre hors partie : aucun crash si le personnage n'existe pas.
*/

function NV_talentsPersonnageActif() {
    return Boolean(Game?.data?.personnage);
}

function NV_retourAccueilDepuisTalents() {
    if (Game?.ui) Game.ui.vueActive = "menu";

    if (typeof window.NV_ouvrirEcranAccueil === "function") {
        window.NV_ouvrirEcranAccueil();
        return;
    }

    if (typeof afficherVuePrincipale === "function") {
        afficherVuePrincipale(`<div class="item-card"><h2>Accueil</h2><p>Aucune partie active.</p></div>`);
    }
}

function ameliorerTalent(idTalent) {
    if (!NV_talentsPersonnageActif()) return;

    const talent = Game.cache?.talentsParId?.[idTalent];
    if (!talent) return;

    const personnage = Game.data.personnage;
    personnage.talents ??= [];
    personnage.pointsTalent = Number(personnage.pointsTalent || 0);

    const cout = talent.cout ?? 1;
    const talentJoueur = personnage.talents.find(element => element.id === idTalent);
    const niveau = talentJoueur?.niveau ?? 0;

    if (niveau >= talent.niveauMax || personnage.pointsTalent < cout) return;

    personnage.pointsTalent -= cout;
    if (talentJoueur) {
        talentJoueur.niveau++;
    } else {
        personnage.talents.push({ id: idTalent, niveau: 1 });
    }

    ajouterJournal(`🌟 Talent amélioré : ${talent.nom}`);
    rafraichirInterface();
    ouvrirTalents();
}

/* TALENTS Interface Utilisateur & Arbre de Talents */
function ouvrirTalents() {
    if (!NV_talentsPersonnageActif()) {
        NV_retourAccueilDepuisTalents();
        return;
    }

    changerVue("talents");

    const personnage = Game.data.personnage;
    personnage.talents ??= [];
    personnage.pointsTalent = Number(personnage.pointsTalent || 0);

    let html = `
        <div class="item-card">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <h2 style="margin: 0;">🌟 Talents</h2>
                <button onclick="ouvrirExploration()">⬅ Retour</button>
            </div>
            <p>Points de talent disponibles : <strong>${personnage.pointsTalent}</strong></p>
        </div>
    `;

    Game.data.talents.forEach(talent => {
        const talentJoueur = personnage.talents.find(t => t.id === talent.id);
        const niveau = talentJoueur ? talentJoueur.niveau : 0;
        
        let bonus = "";
        if (talent.force) bonus += `FOR +${talent.force} `;
        if (talent.dexterite) bonus += `DEX +${talent.dexterite} `;
        if (talent.intelligence) bonus += `INT +${talent.intelligence} `;
        if (talent.vitalite) bonus += `VIT +${talent.vitalite} `;
        if (talent.chance) bonus += `LUCK +${talent.chance} `;

        html += `
            <div class="item-card">
                <h3>${talent.icone || "🌟"} ${talent.nom}</h3>
                <p>${talent.description}</p>
                <p>Niveau : ${niveau} / ${talent.niveauMax}</p>
                <p>Bonus par niveau : <strong>${bonus || "Aucun"}</strong></p>
                <button ${niveau >= talent.niveauMax || personnage.pointsTalent < (talent.cout ?? 1) ? "disabled" : ""} onclick="ameliorerTalent('${talent.id}')">
                    Améliorer (${talent.cout ?? 1} pt)
                </button>
            </div>
        `;
    });

    afficherVuePrincipale(html);
}
