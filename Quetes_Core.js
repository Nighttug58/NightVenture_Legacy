/*
NightVenture — Quêtes core
- Parler PNJ
- Accepter / remettre quête
- Progression simple
- Vue quêtes
*/

function parlerPNJ(idPnj) {
    const personnagePnj = Game.cache.pnjParId[idPnj];
    if (!personnagePnj) return;
    ajouterJournal(`${personnagePnj.nom} : ${personnagePnj.dialogue || "..."}`);
}

/* QUETES — Compatibilité core minimale
Le système avancé est fourni par Quetes_Extension.js.
Ces fonctions restent comme points d'entrée stables et fallback léger.
*/
function accepterQuete(idQuete) {
    const personnage = Game.data.personnage;
    personnage.quetes ??= [];

    if (personnage.quetes.some(q => q.id === idQuete)) return;

    const quete = Game.cache.quetesParId[idQuete];
    if (!quete) return;

    personnage.quetes.push({
        id: idQuete,
        progression: 0,
        etat: "en_cours"
    });

    ajouterJournal(`📜 Nouvelle quête : ${quete.nom}`);
    verifierProgressionQuetes();
    rafraichirInterface();
}

function verifierProgressionQuetes() {
    const personnage = Game.data.personnage;
    personnage.quetes ??= [];

    personnage.quetes.forEach(progression => {
        if (progression.etat !== "en_cours") return;

        const quete = Game.cache.quetesParId[progression.id];
        const objectif = quete?.objectif;
        if (!quete || !objectif) return;

        const quantiteObjectif = Math.max(1, Number(objectif.quantite ?? 1));

        if (["posseder", "collecter"].includes(String(objectif.type || "").toLowerCase())) {
            const item = personnage.inventaire.find(o => o.id === objectif.objet);
            progression.progression = Math.min(item?.quantite || 0, quantiteObjectif);
        }

        if ((progression.progression || 0) >= quantiteObjectif) {
            progression.progression = quantiteObjectif;
            progression.etat = "a_rendre";
        }
    });
}

function remettreQuete(idQuete) {
    const personnage = Game.data.personnage;
    const progression = personnage.quetes?.find(q => q.id === idQuete);
    const quete = Game.cache.quetesParId[idQuete];

    if (!progression || !quete || progression.etat !== "a_rendre") return;

    const objectif = quete.objectif || {};

    if (["posseder", "collecter"].includes(String(objectif.type || "").toLowerCase()) && objectif.consommer) {
        retirerObjetInventaire(objectif.objet, objectif.quantite ?? 1);
    }

    const recompense = quete.recompense || {};
    const xp = recompense.xp || 0;
    const or = recompense.or || 0;

    personnage.xp += xp;
    personnage.or += or;

    if (Array.isArray(recompense.objets)) {
        recompense.objets.forEach(item => ajouterObjetInventaire(item.id, item.quantite ?? 1));
    } else if (recompense.objet) {
        ajouterObjetInventaire(recompense.objet, recompense.quantite ?? 1);
    }

    progression.etat = "terminee";

    ajouterJournal(`✅ Quête terminée : ${quete.nom}`);
    if (xp > 0) ajouterJournal(`⭐ +${xp} XP`);
    if (or > 0) ajouterJournal(`🟡 +${or} or`);

    verifierNiveau();
    rafraichirInterface();
}

function ouvrirQuetesPNJ(idPnj) {
    changerVue("quetes_pnj");
    verifierProgressionQuetes();

    const pnj = Game.cache.pnjParId[idPnj];
    const quetesPnj = Game.data.quetes.filter(quete => quete.pnj === idPnj);

    let html = `
        <div class="item-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                <h2 style="margin:0;">📜 Quêtes de ${pnj?.nom || "PNJ"}</h2>
                <button onclick="ouvrirExploration()">⬅ Retour</button>
            </div>
        </div>
    `;

    if (!quetesPnj.length) {
        html += `<div class="item-card">Aucune quête disponible.</div>`;
    }

    quetesPnj.forEach(quete => {
        const progression = Game.data.personnage.quetes.find(q => q.id === quete.id);
        const etat = progression?.etat || "disponible";

        html += `
            <div class="item-card">
                <h3>📜 ${quete.nom}</h3>
                <p>${quete.description || ""}</p>
                <p>${nomEtatQuete(etat)}</p>
                ${!progression ? `<button onclick="accepterQuete('${quete.id}'); ouvrirQuetesPNJ('${idPnj}')">Accepter</button>` : ""}
                ${progression?.etat === "a_rendre" ? `<button onclick="remettreQuete('${quete.id}'); ouvrirQuetesPNJ('${idPnj}')">Réclamer récompense</button>` : ""}
            </div>
        `;
    });

    afficherVuePrincipale(html);
}

function nomEtatQuete(etat) {
    switch (etat) {
        case "disponible": return `<span class="etat-disponible">📜 Disponible</span>`;
        case "en_cours": return `<span class="etat-en-cours">🔄 En cours</span>`;
        case "a_rendre": return `<span class="etat-a-rendre">✅ À rendre</span>`;
        case "terminee": return `<span class="etat-terminee">🏆 Terminée</span>`;
        case "bloquee": return `<span class="etat-bloquee">🔒 Bloquée</span>`;
        default: return String(etat || "inconnu");
    }
}

function ouvrirQuetes() {
    changerVue("quetes");
    verifierProgressionQuetes();

    const journalQuetes = Game.data.personnage.quetes || [];

    let html = `
        <div class="item-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                <h2 style="margin:0;">📜 Journal des quêtes</h2>
                <button onclick="ouvrirExploration()">⬅ Retour</button>
            </div>
        </div>
    `;

    if (!journalQuetes.length) {
        html += `<div class="item-card">Aucune quête active dans le journal.</div>`;
    }

    journalQuetes.forEach(progression => {
        const quete = Game.cache.quetesParId[progression.id];
        if (!quete) return;

        html += `
            <div class="item-card">
                <h3>📜 ${quete.nom}</h3>
                <p>${quete.description || ""}</p>
                <p>État : ${nomEtatQuete(progression.etat)}</p>
                ${progression.etat !== "terminee" ? `<p>Progression : ${progression.progression || 0} / ${quete.objectif?.quantite ?? 1}</p>` : ""}
            </div>
        `;
    });

    afficherVuePrincipale(html);
}
