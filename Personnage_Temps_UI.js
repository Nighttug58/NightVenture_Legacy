/*
NightVenture — Personnage, temps et UI ressources
- Affichage compact du personnage dans le HUD haut
- Temps de jeu
- Barres ressources
- Cartes statistiques

L'ancienne sidebar équipement/monde n'est plus générée ici.
Les actions principales du personnage sont maintenant dans #barreVuePrincipale.
*/

function calculerPourcentage(valeur, maximum) {
    if (!Number.isFinite(maximum) || maximum <= 0) return 0;
    return Math.min(100, Math.max(0, (valeur / maximum) * 100));
}

function obtenirInformationsTemps() {
    const personnage = Game?.data?.personnage;
    if (!personnage) {
        return { jour: 1, heureAffichee: "0h00", periode: "☀️ Jour" };
    }

    const jour = personnage.jour ?? 1;
    const heure = personnage.heure ?? 0;
    const minute = personnage.minute ?? 0;
    const periode = heure >= 6 && heure < 18 ? "☀️ Jour" : "🌙 Nuit";
    const heureAffichee = `${heure}h${String(minute).padStart(2, "0")}`;

    return { jour, heureAffichee, periode };
}

function nouveauJour() {
    if (typeof restockerMarchands === "function") {
        restockerMarchands();
    }
}

/*
Compatibilité ancienne API : certains modules patchent/appellent encore
cette fonction, mais l'équipement permanent de sidebar est supprimé.
*/
function afficherEquipementSidebar() {
    const conteneur = document.getElementById("equipementSidebar");
    if (conteneur) conteneur.innerHTML = "";
}

function afficherPersonnage() {
    const conteneurPersonnage = document.getElementById("personnage");
    if (!conteneurPersonnage) return;

    const personnage = Game?.data?.personnage;
    if (!personnage) {
        conteneurPersonnage.innerHTML = "";
        afficherEquipementSidebar();
        return;
    }

    const pvMaximum = pvMaxTotal();
    const manaMaximum = manaMaxTotal();
    const staminaMaximum = staminaMaxTotal();
    const xpMaximum = xpNiveauSuivant();
    const staminaActuelle = personnage.stamina ?? staminaMaximum;
    const niveauPersonnage = personnage.niveau ?? 1;

    const pourcentagePV = calculerPourcentage(personnage.pv, pvMaximum);
    const pourcentageMana = calculerPourcentage(personnage.mana, manaMaximum);
    const pourcentageStamina = calculerPourcentage(staminaActuelle, staminaMaximum);
    const pourcentageXP = calculerPourcentage(personnage.xp, xpMaximum);

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
            </div>

            <div class="personnage-compact__ressources">
                ${creerBarreRessource("barre-pv", pourcentagePV, personnage.pv, pvMaximum, "❤️ PV")}
                ${creerBarreRessource("barre-mana", pourcentageMana, personnage.mana, manaMaximum, "🔵 Mana")}
                ${creerBarreRessource("barre-stamina", pourcentageStamina, staminaActuelle, staminaMaximum, "🟢 Stamina")}
            </div>

            <div class="personnage-compact__xp">
                ${creerBarreRessource("barre-xp", pourcentageXP, personnage.xp ?? 0, xpMaximum, "🟡 XP")}
            </div>
        </div>
    `;

    afficherEquipementSidebar();
}

function ouvrirFichePersonnage() {
    ouvrirStatistiques();
}

function avancerTemps(heures = 0, minute = 0) {
    const personnage = Game?.data?.personnage;
    if (!personnage) return;

    personnage.minute = Number(personnage.minute || 0) + minute;
    personnage.heure = Number(personnage.heure || 0) + heures;

    while (personnage.minute >= 60) {
        personnage.minute -= 60;
        personnage.heure++;
    }

    while (personnage.heure >= 24) {
        personnage.heure -= 24;
        personnage.jour = Number(personnage.jour || 1) + 1;
        nouveauJour();
    }

    if (typeof rafraichirInterface === "function") {
        rafraichirInterface();
    }
}

function creerBarreRessource(classe, pourcentage, valeurActuelle = null, valeurMax = null, libelle = "") {
    const pourcentageCorrige = Math.max(0, Math.min(100, Number(pourcentage) || 0));
    const pourcentageAffiche = Math.round(pourcentageCorrige);
    const texteValeur = valeurActuelle !== null && valeurMax !== null
        ? `${valeurActuelle} / ${valeurMax} (${pourcentageAffiche}%)`
        : `${pourcentageAffiche}%`;

    return `
        <div class="barre">
            <div class="${classe}" style="width: ${pourcentageCorrige}%;"></div>
            <div class="barre__texte">
                <span class="barre__libelle">${libelle}</span>
                <span class="barre__valeur">${texteValeur}</span>
            </div>
        </div>
    `;
}

function creerCarteStatistique(abreviation, statistique, editable = false) {
    if (!editable) {
        return `<div class="ligne-stat"><span>${abreviation}</span><strong>${statTotale(statistique)}</strong></div>`;
    }

    return `<div class="stat-card"><span>${abreviation}</span><strong>${statTotale(statistique)}</strong><button onclick="ajouterPointStat('${statistique}'); ouvrirStatistiques();">+</button></div>`;
}
