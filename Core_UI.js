/*
NightVenture — UI Core
- Vue principale
- Navigation
- Rafraîchissement interface
- Notifications simples
*/

/* VUE PRINCIPALE */
function changerVue(vue) {
    Game.ui.vueActive = vue;
    mettreAJourTitreVue();
    mettreAJourBarreVue();
}

function afficherVuePrincipale(html) {
    const conteneur =
        document.getElementById("vuePrincipale");

    if (!conteneur) return;

    conteneur.innerHTML =
        html;

    mettreAJourTitreVue();
    mettreAJourBarreVue();
    mettreAJourNotifications();

    initialiserSelectionItemsVuePrincipale();
}

function mettreAJourTitreVue() {
    const titre =
        document.getElementById("titreVuePrincipale");

    if (!titre) return;

    const titres = {
        exploration: "🌍 Exploration",
        combat: "⚔ Combat",
        inventaire: "🎒 Inventaire",
        quetes: "📜 Journal des quêtes",
        talents: "🌟 Talents",
        marchand: "🛒 Marchand",
        quetes_pnj: "📜 Quêtes du PNJ",
        statistiques: "📈 Statistiques",
        fiche_personnage: "📈 Statistiques",
        equipement: "🛡 Équipement",
        journal: "📜 Journal d'aventure",
        simulateur_combat: "🧪 Simulateur de combat",
        equipements_proceduraux: "⚒ Équipements procéduraux",
        monstres_proceduraux: "👹 Monstres procéduraux",
        profils_equipements: "🧍 Profils d'équipement simulés"
    };

    titre.textContent =
        titres[Game.ui.vueActive] || "🌍 Exploration";
}

function mettreAJourBarreVue() {
    const boutons = {
        exploration: "btnExploration",
        inventaire: "btnInventaire",
        quetes: "btnQuetes",
        journal: "btnJournal",
        simulateur_combat: "btnSimulateurCombat",
        equipements_proceduraux: "btnEquipementsProceduraux",
        monstres_proceduraux: "btnMonstresProceduraux",
        profils_equipements: "btnProfilsEquipements"
    };

    Object.values(boutons).forEach(idBouton => {
        const bouton =
            document.getElementById(idBouton);

        if (!bouton) return;

        bouton.classList.remove("vue-active");
        bouton.classList.remove("actif");
        bouton.classList.remove("active");
    });

    const idBoutonActif =
        boutons[Game.ui.vueActive];

    if (!idBoutonActif) return;

    const boutonActif =
        document.getElementById(idBoutonActif);

    if (!boutonActif) return;

    boutonActif.classList.add("vue-active");
    boutonActif.classList.add("actif");
    boutonActif.classList.add("active");
}

function rafraichirInterface() {
    afficherPersonnage();
    afficherJournal();

    verifierProgressionQuetes();

    mettreAJourTitreVue();
    mettreAJourBarreVue();
    mettreAJourNotifications();

    switch (Game.ui.vueActive) {
        case "exploration":
            ouvrirExploration();
            break;

        case "inventaire":
            ouvrirInventaire();
            break;

        case "marchand":
            if (Game.ui.marchandActuel) {
                ouvrirMarchand(Game.ui.marchandActuel.id);
            }
            break;

        case "quetes":
            ouvrirQuetes();
            break;

        case "talents":
            ouvrirTalents();
            break;

        case "statistiques":
            ouvrirStatistiques();
            break;

        case "fiche_personnage":
            ouvrirFichePersonnage();
            break;

        case "journal":
            ouvrirJournalComplet();
            break;

        case "combat":
            ouvrirCombat();
            break;

        default:
            ouvrirExploration();
            break;
    }
}

function creerTooltipEquipement(idObjet) {
    if (!idObjet) return "";
    const objet = trouverObjet(idObjet);
    if (!objet) return "";

    let bonus =
    creerDetailsObjet(objet, "<br>") +
    creerDetailsEffetsObjet(objet, "<br>");

    return `
        <div class="tooltip-text">
            <b class="${classeRarete(objet)}">${objet.nom}</b><br>
            <small>${objet.type}</small><br>
            <small class="${classeRarete(objet)}">${objet.rarete || "commun"}</small><br><br>
            ${objet.description || "Aucune description."}<br><br>
            ${bonus}
            Prix : ${objet.prix || 0} or
        </div>
    `;
}

function mettreAJourNotifications() {
    const notifStats = document.getElementById("notifStatistiques");
    const notifTalents = document.getElementById("notifTalents");

    if (notifStats) notifStats.style.display = Game.data.personnage.pointsCaracteristiques > 0 ? "block" : "none";
    if (notifTalents) notifTalents.style.display = Game.data.personnage.pointsTalent > 0 ? "block" : "none";
}
