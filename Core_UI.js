/*
NightVenture - UI Core
- Vue principale
- Navigation
- Rafraichissement interface
- Notifications simples

Le Core UI ne doit jamais supposer qu'un personnage existe au boot.
*/

function NV_personnageActifCoreUI() {
    return Boolean(Game?.data?.personnage);
}

function NV_vueHorsPartieCoreUI(vue = Game?.ui?.vueActive) {
    return ["menu", "new_game", "competences_classes"].includes(vue);
}

function changerVue(vue) {
    if (!NV_personnageActifCoreUI() && !NV_vueHorsPartieCoreUI(vue)) {
        Game.ui.vueActive = "menu";
    } else {
        Game.ui.vueActive = vue;
    }
    mettreAJourTitreVue();
    mettreAJourBarreVue();
}

function afficherVuePrincipale(html) {
    const conteneur = document.getElementById("vuePrincipale");
    if (!conteneur) return;

    conteneur.innerHTML = html;

    mettreAJourTitreVue();
    mettreAJourBarreVue();
    mettreAJourNotifications();
    if (typeof initialiserSelectionItemsVuePrincipale === "function") {
        initialiserSelectionItemsVuePrincipale();
    }
}

function mettreAJourTitreVue() {
    const titre = document.getElementById("titreVuePrincipale");
    if (!titre) return;

    const titres = {
        menu: "Accueil",
        new_game: "Nouvelle partie",
        exploration: "Exploration",
        combat: "Combat",
        inventaire: "Inventaire",
        quetes: "Journal des quetes",
        talents: "Talents",
        marchand: "Marchand",
        quetes_pnj: "Quetes du PNJ",
        statistiques: "Statistiques",
        fiche_personnage: "Statistiques",
        equipement: "Equipement",
        journal: "Journal d'aventure",
        competences_classes: "Competences"
    };

    titre.textContent = titres[Game.ui.vueActive] || "Accueil";
}

function mettreAJourBarreVue() {
    const boutons = {
        exploration: "btnExploration",
        inventaire: "btnInventaire",
        quetes: "btnQuetes",
        journal: "btnJournal",
        competences_classes: "btnCompetencesClasses"
    };

    Object.values(boutons).forEach(idBouton => {
        const bouton = document.getElementById(idBouton);
        if (!bouton) return;

        bouton.classList.remove("vue-active");
        bouton.classList.remove("actif");
        bouton.classList.remove("active");
    });

    const idBoutonActif = boutons[Game.ui.vueActive];
    if (!idBoutonActif) return;

    const boutonActif = document.getElementById(idBoutonActif);
    if (!boutonActif) return;

    boutonActif.classList.add("vue-active");
    boutonActif.classList.add("actif");
    boutonActif.classList.add("active");
}

function rafraichirInterface() {
    if (!NV_personnageActifCoreUI()) {
        Game.ui.vueActive = NV_vueHorsPartieCoreUI(Game.ui.vueActive) ? Game.ui.vueActive : "menu";
        mettreAJourTitreVue();
        mettreAJourBarreVue();
        mettreAJourNotifications();

        if (typeof window.NV_ouvrirEcranAccueil === "function" && Game.ui.vueActive !== "new_game") {
            window.NV_ouvrirEcranAccueil();
        }
        return;
    }

    if (typeof afficherPersonnage === "function") afficherPersonnage();
    if (typeof afficherJournal === "function") afficherJournal();
    if (typeof verifierProgressionQuetes === "function") verifierProgressionQuetes();
    mettreAJourTitreVue();
    mettreAJourBarreVue();
    mettreAJourNotifications();

    switch (Game.ui.vueActive) {
        case "exploration":
            if (typeof ouvrirExploration === "function") ouvrirExploration();
            break;
        case "inventaire":
            if (typeof ouvrirInventaire === "function") ouvrirInventaire();
            break;
        case "marchand":
            if (Game.ui.marchandActuel && typeof ouvrirMarchand === "function") ouvrirMarchand(Game.ui.marchandActuel.id);
            break;
        case "quetes":
            if (typeof ouvrirQuetes === "function") ouvrirQuetes();
            break;
        case "talents":
            if (typeof ouvrirTalents === "function") ouvrirTalents();
            break;
        case "statistiques":
            if (typeof ouvrirStatistiques === "function") ouvrirStatistiques();
            break;
        case "fiche_personnage":
            if (typeof ouvrirFichePersonnage === "function") ouvrirFichePersonnage();
            break;
        case "journal":
            if (typeof ouvrirJournalComplet === "function") ouvrirJournalComplet();
            break;
        case "combat":
            if (typeof ouvrirCombat === "function") ouvrirCombat();
            break;
        case "competences_classes":
            if (typeof NV_ouvrirCompetencesClasses === "function") NV_ouvrirCompetencesClasses();
            break;
        case "menu":
        case "new_game":
            break;
        default:
            Game.ui.vueActive = "exploration";
            if (typeof ouvrirExploration === "function") ouvrirExploration();
            break;
    }
}

function creerTooltipEquipement(idObjet) {
    if (!idObjet) return "";

    const objet = trouverObjet(idObjet);
    if (!objet) return "";

    const bonus = creerDetailsObjet(objet, "<br>") + creerDetailsEffetsObjet(objet, "<br>");

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
    const personnage = Game?.data?.personnage;

    if (!personnage) {
        if (notifStats) notifStats.style.display = "none";
        if (notifTalents) notifTalents.style.display = "none";
        return;
    }

    if (notifStats) notifStats.style.display = Number(personnage.pointsCaracteristiques || 0) > 0 ? "block" : "none";
    if (notifTalents) notifTalents.style.display = Number(personnage.pointsTalent || 0) > 0 ? "block" : "none";
}
