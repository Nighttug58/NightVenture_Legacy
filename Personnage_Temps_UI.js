/*
NightVenture — Personnage, temps et UI ressources
- Temps de jeu
- Sidebar personnage
- Équipement sidebar
- Barres ressources
- Cartes statistiques
*/

function calculerPourcentage(valeur, maximum) {
    if (!Number.isFinite(maximum) || maximum <= 0) return 0;
    return Math.min(100, Math.max(0, (valeur / maximum) * 100));
}

function obtenirInformationsTemps() {
    const jour = Game.data.personnage.jour ?? 1;
    const heure = Game.data.personnage.heure ?? 0;
    const minute = Game.data.personnage.minute ?? 0;
    const periode = heure >= 6 && heure < 18 ? "☀️ Jour" : "🌙 Nuit";
    const heureAffichee = `${heure}h${String(minute).padStart(2, "0")}`;

    return { jour, heureAffichee, periode };
}

function nouveauJour() { restockerMarchands(); }

/* AFFICHAGE PERSONNAGE Vue d'Ensemble des Ressources, du Combat & de l'Équipement */
/*
ÉQUIPEMENT PERMANENT — désactivé du core

Depuis HUD_Layout.js, l'équipement permanent à gauche
n'est plus affiché. Le core garde seulement ces fonctions en no-op
pour éviter toute erreur avec les anciens appels.
*/

function boutonDesequiper(slot) {
    return "";
}

function bonusObjet(idObjet) {
    if (!idObjet) return "";

    const objet =
        trouverObjet(idObjet);

    if (!objet) return "";

    return creerDetailsObjet(objet, "<br>") || "";
}

function creerCarteEquipement(slot, icone, libelle) {
    return "";
}

function creerAffichageEquipement() {
    return "";
}

function afficherEquipementSidebar() {
    const conteneur =
        document.getElementById("equipementSidebar");

    if (conteneur) {
        conteneur.innerHTML =
            "";
    }
}

function afficherPersonnage() {
    const conteneurPersonnage =
        document.getElementById("personnage");

    if (!conteneurPersonnage) return;

    const personnage =
        Game.data.personnage;

    const region =
        obtenirRegionMondeActuelle()?.nom || "Région inconnue";

    const zone =
        obtenirZoneActuelle()?.nom || "Zone inconnue";

    const informationsTemps =
        obtenirInformationsTemps();

    const pvMaximum =
        pvMaxTotal();

    const manaMaximum =
        manaMaxTotal();

    const staminaMaximum =
        staminaMaxTotal();

    const xpMaximum =
        xpNiveauSuivant();

    const staminaActuelle =
        personnage.stamina ?? staminaMaximum;

    const niveauPersonnage =
        personnage.niveau ?? 1;

    const pourcentagePV =
        calculerPourcentage(personnage.pv, pvMaximum);

    const pourcentageMana =
        calculerPourcentage(personnage.mana, manaMaximum);

    const pourcentageStamina =
        calculerPourcentage(staminaActuelle, staminaMaximum);

    const pourcentageXP =
        calculerPourcentage(personnage.xp, xpMaximum);

    conteneurPersonnage.innerHTML = `
        <div class="personnage-compact">

            <div class="personnage-compact__haut">

                <div class="personnage-compact__identite">
                    <div class="personnage-compact__nom">
                        <strong>${personnage.nom || "Héros"}</strong>
                        <span>Level ${niveauPersonnage}</span>
                        <span>${personnage.classe || "Aventurier"}</span>
                    </div>
                </div>

                <div class="personnage-compact__actions">

                    <button
                        id="btnStatistiquesTop"
                        class="btn-vue btn-action-personnage"
                        onclick="ouvrirStatistiques()"
                    >
                        📈 Statistiques
                        <span id="notifStatistiques" class="notification-bulle"></span>
                    </button>

                    <button
                        id="btnTalentsTop"
                        class="btn-vue btn-action-personnage"
                        onclick="ouvrirTalents()"
                    >
                        🌟 Talents
                        <span id="notifTalents" class="notification-bulle"></span>
                    </button>

                    <button
                        id="saveButton"
                        class="btn-action-personnage"
                        onclick="sauvegarderJeu()"
                    >
                        💾 Sauvegarder
                    </button>

                    <label
                        for="loadFile"
                        class="btn-action-personnage bouton-charger-haut"
                    >
                        📂 Charger
                    </label>

                    <input
                        type="file"
                        id="loadFile"
                        accept=".json"
                        hidden
                        onchange="chargerSauvegardeDepuisInput(event)"
                    >

                </div>

            </div>

            <div class="personnage-compact__ressources">

                ${creerBarreRessource(
                    "barre-pv",
                    pourcentagePV,
                    personnage.pv,
                    pvMaximum,
                    "❤️ PV"
                )}

                ${creerBarreRessource(
                    "barre-mana",
                    pourcentageMana,
                    personnage.mana,
                    manaMaximum,
                    "🔵 Mana"
                )}

                ${creerBarreRessource(
                    "barre-stamina",
                    pourcentageStamina,
                    staminaActuelle,
                    staminaMaximum,
                    "🟢 Stamina"
                )}

            </div>

            <div class="personnage-compact__xp">

                ${creerBarreRessource(
                    "barre-xp",
                    pourcentageXP,
                    personnage.xp ?? 0,
                    xpMaximum,
                    "🟡 XP"
                )}

            </div>

        </div>
    `;

    const infosMondeSidebar =
        document.getElementById("infosMondeSidebar");

    if (infosMondeSidebar) {
        infosMondeSidebar.innerHTML = `
            <div class="infos-monde-sidebar__region">
                📍 ${region}
            </div>

            <div class="infos-monde-sidebar__zone">
                ${zone}
            </div>

            <div class="infos-monde-sidebar__details">
                <span>🟡 ${personnage.or ?? 0} or</span>
                <span>${informationsTemps.periode}</span>
                <span>Jour ${informationsTemps.jour} — ${informationsTemps.heureAffichee}</span>
            </div>
        `;
    }

    afficherEquipementSidebar();
}	

function ouvrirFichePersonnage() {
    ouvrirStatistiques();
}

/* AFFICHAGE PERSONNAGE Composants UI Communs & Éléments Temporels */
function avancerTemps(heures = 0, minute = 0) {
    Game.data.personnage.minute += minute;
    Game.data.personnage.heure += heures;

    while (Game.data.personnage.minute >= 60) {
        Game.data.personnage.minute -= 60;
        Game.data.personnage.heure++;
    }

    while (Game.data.personnage.heure >= 24) {
        Game.data.personnage.heure -= 24;
        Game.data.personnage.jour++;
        nouveauJour();
    }

    rafraichirInterface();
}

function creerBarreRessource(classe, pourcentage, valeurActuelle = null, valeurMax = null, libelle = "") {
    const pourcentageCorrige =
        Math.max(
            0,
            Math.min(
                100,
                Number(pourcentage) || 0
            )
        );

    const pourcentageAffiche =
        Math.round(pourcentageCorrige);

    const texteValeur =
        valeurActuelle !== null && valeurMax !== null
            ? `${valeurActuelle} / ${valeurMax} (${pourcentageAffiche}%)`
            : `${pourcentageAffiche}%`;

    return `
        <div class="barre">
            <div
                class="${classe}"
                style="width: ${pourcentageCorrige}%;"
            ></div>

            <div class="barre__texte">
                <span class="barre__libelle">
                    ${libelle}
                </span>

                <span class="barre__valeur">
                    ${texteValeur}
                </span>
            </div>
        </div>
    `;
}

/* AFFICHAGE STATISTIQUES Fiche, Attributs et Bonus Dérivés */
function creerCarteStatistique(abreviation, statistique, editable = false) {
    if (!editable) {
        return `<div class="ligne-stat"><span>${abreviation}</span><strong>${statTotale(statistique)}</strong></div>`;
    }
    return `<div class="stat-card"><span>${abreviation}</span><strong>${statTotale(statistique)}</strong><button onclick="ajouterPointStat('${statistique}'); ouvrirStatistiques();">+</button></div>`;
}
