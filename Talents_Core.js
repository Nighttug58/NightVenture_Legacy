/*
NightVenture — Talents core
- Amélioration des talents
- Vue talents
*/

function ameliorerTalent(idTalent) {
    const talent = Game.cache.talentsParId[idTalent];
    if (!talent) return;

    const cout = talent.cout ?? 1;
    const talentJoueur = Game.data.personnage.talents.find(element => element.id === idTalent);
    const niveau = talentJoueur?.niveau ?? 0;

    if (niveau >= talent.niveauMax || Game.data.personnage.pointsTalent < cout) return;

    Game.data.personnage.pointsTalent -= cout;
    if (talentJoueur) {
        talentJoueur.niveau++;
    } else {
        Game.data.personnage.talents.push({ id: idTalent, niveau: 1 });
    }

    ajouterJournal(`🌟 Talent amélioré : ${talent.nom}`);
    rafraichirInterface();
    ouvrirTalents();
}

/* TALENTS Interface Utilisateur & Arbre de Talents */
function ouvrirTalents() {
    changerVue("talents");

    let html = `
        <div class="item-card">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                <h2 style="margin: 0;">🌟 Talents</h2>
                <button onclick="ouvrirExploration()">⬅ Retour</button>
            </div>
            <p>Points de talent disponibles : <strong>${Game.data.personnage.pointsTalent}</strong></p>
        </div>
    `;

    Game.data.talents.forEach(talent => {
        const talentJoueur = Game.data.personnage.talents.find(t => t.id === talent.id);
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
                <button ${niveau >= talent.niveauMax || Game.data.personnage.pointsTalent < (talent.cout ?? 1) ? "disabled" : ""} onclick="ameliorerTalent('${talent.id}')">
                    Améliorer (${talent.cout ?? 1} pt)
                </button>
            </div>
        `;
    });

    afficherVuePrincipale(html);
}
