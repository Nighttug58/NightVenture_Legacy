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

    mettreAJourBarreVue();
}

function afficherVuePrincipale(html) {
    const conteneur = document.getElementById("vuePrincipale");
    if (!conteneur) return;

    conteneur.innerHTML = html;

    mettreAJourBarreVue();
    mettreAJourNotifications();

    if (typeof initialiserSelectionItemsVuePrincipale === "function") {
        initialiserSelectionItemsVuePrincipale();
    }
}

function mettreAJourBarreVue() {
    const boutons = {
        exploration: "btnExploration",
        inventaire: "btnInventaire",
        quetes: "btnQuetes",
        journal: "btnJournal",
        statistiques: "btnStatistiquesTop",
        talents: "btnTalentsTop",
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
        case "progression_combat":
            if (typeof GI_ouvrirProgressionCombat === "function") GI_ouvrirProgressionCombat();
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

function NV_estPleinEcranActif() {
    return Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
    );
}

function NV_mettreAJourBoutonPleinEcran() {
    const bouton = document.getElementById("btnFullscreenToggle");
    if (!bouton) return;

    const actif = NV_estPleinEcranActif();
    bouton.textContent = actif ? "Quitter plein écran" : "Plein écran";
    bouton.setAttribute("aria-pressed", actif ? "true" : "false");
    bouton.classList.toggle("nv-fullscreen-active", actif);
}

function NV_installerBoutonPleinEcran() {
    const barre = document.getElementById("barreVuePrincipale");
    if (!barre || document.getElementById("btnFullscreenToggle")) return;

    const bouton = document.createElement("button");
    bouton.id = "btnFullscreenToggle";
    bouton.type = "button";
    bouton.className = "btn-action-personnage nv-fullscreen-button";
    bouton.setAttribute("aria-pressed", "false");
    bouton.textContent = "Plein écran";
    bouton.addEventListener("click", NV_toggleFullscreen);

    const boutonSauvegarde = document.getElementById("saveButton");
    if (boutonSauvegarde && boutonSauvegarde.parentElement === barre) {
        barre.insertBefore(bouton, boutonSauvegarde);
    } else {
        barre.appendChild(bouton);
    }

    NV_mettreAJourBoutonPleinEcran();
}

async function NV_toggleFullscreen() {
    const cible = document.documentElement;

    try {
        if (NV_estPleinEcranActif()) {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            else if (document.msExitFullscreen) document.msExitFullscreen();
        } else {
            if (cible.requestFullscreen) await cible.requestFullscreen();
            else if (cible.webkitRequestFullscreen) cible.webkitRequestFullscreen();
            else if (cible.msRequestFullscreen) cible.msRequestFullscreen();
            else {
                throw new Error("API plein écran non disponible sur ce navigateur.");
            }
        }
    } catch (erreur) {
        console.warn("Plein écran indisponible :", erreur);
        if (typeof ajouterJournal === "function") {
            ajouterJournal("Plein écran indisponible sur ce navigateur ou ce mode d'affichage.");
        }
    } finally {
        NV_mettreAJourBoutonPleinEcran();
    }
}

document.addEventListener("fullscreenchange", NV_mettreAJourBoutonPleinEcran);
document.addEventListener("webkitfullscreenchange", NV_mettreAJourBoutonPleinEcran);
document.addEventListener("msfullscreenchange", NV_mettreAJourBoutonPleinEcran);
document.addEventListener("DOMContentLoaded", function () {
    NV_installerBoutonPleinEcran();
    NV_mettreAJourBoutonPleinEcran();
});

window.NV_toggleFullscreen = NV_toggleFullscreen;
window.NV_mettreAJourBoutonPleinEcran = NV_mettreAJourBoutonPleinEcran;
window.NV_installerBoutonPleinEcran = NV_installerBoutonPleinEcran;
