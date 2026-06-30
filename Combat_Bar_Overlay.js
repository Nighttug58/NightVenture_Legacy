/*
NightVenture - Combat bar overlays
Affiche les variations de PV/Mana/Stamina directement au centre des barres.
*/

function creerPopupVariationBarreCombat(combat, camp, cle, actuelle, precedente) {
    if (!combat?.animation?.active || combat.animation.stage !== "impact") return "";
    if (!["pv", "mana", "stamina"].includes(cle)) return "";

    const delta = Number(actuelle) - Number(precedente);
    if (!Number.isFinite(delta) || Math.round(delta) === 0) return "";

    const valeur = Math.abs(Math.round(delta));
    const type = delta < 0 ? "damage" : "heal";
    const signe = delta < 0 ? "-" : "+";

    return `<span class="combat-resource-popup combat-resource-popup--${type}" aria-hidden="true">${signe}${valeur}</span>`;
}

function creerBarreCombatEtat(combat, camp, cle, classe, libelle) {
    const combattant = combat[camp];
    const maximum = cle === "initiative" ? Game.combat.config.seuilInitiative : combattant[`${cle}Max`];
    const actuelle = Number(combattant[cle]) || 0;
    const precedente = Number(combat.animation?.previous?.[camp]?.[cle] ?? actuelle);
    const pourcentage = calculerPourcentage(actuelle, maximum);
    const pourcentageAvant = calculerPourcentage(precedente, maximum);
    const animee = combat.animation?.stage === "impact" && precedente !== actuelle;
    const popup = creerPopupVariationBarreCombat(combat, camp, cle, actuelle, precedente);

    return `
        <div class="barre barre--combat" data-resource="${camp}-${cle}">
            <div class="${classe} ${animee ? "combat-bar-fill--animated" : ""}" style="--bar-from:${pourcentageAvant}%; --bar-to:${pourcentage}%; width:${pourcentage}%;"></div>
            <div class="barre__texte">
                <span class="barre__libelle">${libelle}</span>
                <span class="barre__valeur">${Math.round(actuelle)} / ${Math.round(maximum)} (${Math.round(pourcentage)}%)</span>
            </div>
            ${popup}
        </div>
    `;
}

function creerFeedbackActionCombat() {
    return "";
}
