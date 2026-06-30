/*
NightVenture — PNJ / affichage exploration
- Portraits PNJ
- Lignes PNJ
- Section PNJ de la zone
- Affichage de la zone actuelle
*/

function obtenirIconeRolePnj(personnagePnj) {
    const type =
        normaliserTexte(personnagePnj.type || personnagePnj.role || "");

    if (type.includes("marchand")) return "Marchand";
    if (type.includes("garde")) return "Garde";
    if (type.includes("forgeron")) return "Forgeron";
    if (type.includes("mage")) return "Mage";
    if (type.includes("aubergiste")) return "Aubergiste";
    if (type.includes("soigneur")) return "Soigneur";
    if (type.includes("quete") || type.includes("quête")) return "Quête";

    return "PNJ";
}

function creerPortraitPnjExploration(personnagePnj) {
    const image =
        personnagePnj.image || personnagePnj.portrait || "";

    if (image) {
        return `
            <div class="pnj-rpg__portrait">
                <img
                    src="${image}"
                    alt="${echapperHTML(personnagePnj.nom || "PNJ")}"
                >
            </div>
        `;
    }

    const initiale =
        String(personnagePnj.nom || "?")
            .trim()
            .charAt(0)
            .toUpperCase();

    return `
        <div class="pnj-rpg__portrait pnj-rpg__portrait--initiale">
            ${initiale || "?"}
        </div>
    `;
}

function creerLignePnjExploration(personnagePnj) {
    const selectionne =
        Game.ui.pnjSelectionne === personnagePnj.id;

    const iconeRole =
        obtenirIconeRolePnj(personnagePnj);

    const nom =
        echapperHTML(personnagePnj.nom || "Personnage inconnu");

    const role =
        echapperHTML(personnagePnj.role || personnagePnj.type || "Habitant");

    const dialogue =
        echapperHTML(personnagePnj.dialogue || "Ce personnage semble avoir quelque chose à dire.");

    const classeSelection =
        selectionne
            ? "pnj-rpg pnj-rpg--selectionne"
            : "pnj-rpg";

    return `
        <article
            class="${classeSelection}"
            onclick="selectionnerPnj('${personnagePnj.id}')"
        >

            ${creerPortraitPnjExploration(personnagePnj)}

            <div class="pnj-rpg__contenu">

                <div class="pnj-rpg__ligne-haut">
                    <div>
                        <h4>${nom}</h4>

                        <div class="pnj-rpg__role">
                            <span>${iconeRole}</span>
                            ${role}
                        </div>
                    </div>

                    <div class="pnj-rpg__etat">
                        ${selectionne ? "Sélectionné" : "Cliquer"}
                    </div>
                </div>

                ${
                    selectionne
                        ? `
                            <div
                                class="pnj-rpg__panneau"
                                onclick="event.stopPropagation()"
                            >
                                <p class="pnj-rpg__dialogue">
                                    “${dialogue}”
                                </p>

                                ${creerActionsPnj(personnagePnj)}
                            </div>
                        `
                        : `
                            <p class="pnj-rpg__apercu">
                                “${dialogue}”
                            </p>
                        `
                }

            </div>

        </article>
    `;
}

function creerSectionPnjExploration(zoneTrouvee) {
    const pnjPresents =
        (zoneTrouvee.pnj || [])
            .map(idPnj => Game.cache.pnjParId[idPnj])
            .filter(Boolean);

    if (pnjPresents.length === 0) {
        return "";
    }

    return `
        <section class="section-pnj-rpg">

            <div class="section-pnj-rpg__header">
                <div>
                    <h3>Personnages présents</h3>
                    <p>
                        Des silhouettes animent les lieux. Certains peuvent parler,
                        proposer des quêtes ou commercer.
                    </p>
                </div>
            </div>

            <div class="liste-pnj-rpg">
                ${pnjPresents.map(creerLignePnjExploration).join("")}
            </div>

        </section>
    `;
}

function afficherZoneActuelle() {
    const zoneTrouvee = Game.cache.zonesParId[Game.data.personnage.zoneActuelle];
    if (!zoneTrouvee) return `<div class="item-card"><h2>Zone inconnue</h2></div>`;

    let html = `
    <div class="item-card">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
            <h2 style="margin:0;">${zoneTrouvee.nom}</h2>
            <button onclick="ouvrirZones()">Zones</button>
        </div>
        <p>${zoneTrouvee.description || ""}</p>
        <p>Type : ${zoneTrouvee.type}</p>
    </div>`;

    /* PNJ */
if (zoneTrouvee.pnj && zoneTrouvee.pnj.length > 0) {
    html += creerSectionPnjExploration(zoneTrouvee);
}

    /* MONSTRES */
    if (zoneTrouvee.monstres && zoneTrouvee.monstres.length > 0) {
        html += `
        <div class="item-card">
            <h3>Créatures présentes</h3>
            <ul>
                ${zoneTrouvee.monstres.map(monstreZone => {
                    const monstre = Game.cache.monstresParId[monstreZone.id];
                    if (!monstre) return "";
                    return `<li>${monstre.nom} (${monstreZone.chance}%)</li>`;
                }).join("")}
            </ul>
        </div>`;
    }

    /* ZONES CONNECTÉES */
    if (zoneTrouvee.connexions && zoneTrouvee.connexions.length > 0) {
        html += `
        <div class="item-card">
            <h3>Zones connectées</h3>
            <ul>
                ${zoneTrouvee.connexions.map(idZone => {
                    const zoneDestination = Game.cache.zonesParId[idZone];
                    if (!zoneDestination) return "";
                    const debloquee = (Game.data.personnage.zonesDebloquees ?? []).includes(zoneDestination.id);
                    return `
                    <li>
                        <span class="${debloquee ? "lien-zone" : "lien-zone-verrouillee"}" onclick="voyagerVersZone('${zoneDestination.id}');">
                            ${debloquee ? zoneDestination.nom : "Verrouillée : " + zoneDestination.nom}
                        </span>
                    </li>`;
                }).join("")}
            </ul>
        </div>`;
    }

    /* EXPLORATION */
    let evenementsPossibles = [];
    if (zoneTrouvee.monstres && zoneTrouvee.monstres.length > 0) evenementsPossibles.push("Combat");
    if (zoneTrouvee.pnj && zoneTrouvee.pnj.length > 0) evenementsPossibles.push("Rencontre");

    const marchandPresent = (zoneTrouvee.pnj ?? []).some(idPnj => Game.cache.pnjParId[idPnj]?.type === "marchand");
    if (marchandPresent) evenementsPossibles.push("Commerce");

    const queteDisponible = (zoneTrouvee.pnj ?? []).some(idPnj => Game.data.quetes.some(quete => quete.pnj === idPnj));
    if (queteDisponible) evenementsPossibles.push("Quête");

    evenementsPossibles.push("Découverte");

    const texteEvenements = evenementsPossibles.join("<br>");
    html += `
    <div class="item-card">
        <h3>Exploration</h3>
        <p>Explorer cette zone peut déclencher :<br><br>${texteEvenements}</p>
        <button onclick="visiterZoneActuelle()">Explorer</button>
    </div>`;

    return html;
}
