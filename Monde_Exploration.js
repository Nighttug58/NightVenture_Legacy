/*
NightVenture — Monde et exploration core
- Zone actuelle
- Événements simples
- Voyage
- Sélection PNJ
- Modales zones / régions
*/

function obtenirZoneActuelle() {
    return Game.cache.zonesParId[Game.data.personnage.zoneActuelle] ?? null;
}

function genererEvenementZone(zone) {
    if (!zone.evenements) return "rien";
    const tirage = Math.random() * 100;
    let cumul = 0;

    for (const evenement in zone.evenements) {
        cumul += zone.evenements[evenement];
        if (tirage <= cumul) return evenement;
    }
    return "rien";
}

function executerEvenementZone(evenement, zone) {
    switch (evenement) {
        case "combat": {
            const monstre = genererMonstreZone(zone);
            if (!monstre) {
                ajouterJournal("Aucun monstre défini pour cette zone.");
                break;
            }
            ajouterJournal(`⚔ ${monstre.nom} apparaît !`);
            demarrerCombat(monstre);
            break;
        }
        case "coffre": ajouterJournal("📦 Vous découvrez un coffre."); break;
        case "or": {
            const gain = Math.floor(Math.random() * 5) + 1;
            Game.data.personnage.or += gain;
            const messages = [
                `🟡 Vous trouvez ${gain} pièce(s) d'or près d'une fontaine.`,
                `🟡 Un passant laisse tomber ${gain} pièce(s) d'or.`,
                `🟡 Vous récupérez ${gain} pièce(s) oubliée(s) sur un comptoir.`
            ];
            ajouterJournal(messages[Math.floor(Math.random() * messages.length)]);
            break;
        }
        case "pnj": ajouterJournal("👤 Vous croisez un voyageur."); break;
        case "boss": ajouterJournal("👑 Une présence terrifiante se manifeste."); break;
        case "rien": ajouterJournal("🚶 Vous explorez les environs sans rien découvrir de particulier."); break;
        default: console.warn("Événement inconnu :", evenement); ajouterJournal(`⚠ Événement inconnu : ${evenement}`);
    }
}

function voyagerVersZone(idZone) {
    const zone = obtenirZonesActuelles().find(element => element.id === idZone);
    if (!zone) { ajouterJournal("Zone introuvable."); return; }

    if (!(Game.data.personnage.zonesDebloquees ?? []).includes(idZone)) {
        ajouterJournal(`🔒 ${zone.nom} n'est pas encore débloquée.`);
        return;
    }

    Game.data.personnage.zoneActuelle = idZone;
    Game.ui.pnjSelectionne = null;
    Game.data.personnage.lieuActuel = zone.nom;
    avancerTemps(zone.tempsVoyage ?? 1);

    ajouterJournal(`Vous arrivez à ${zone.nom}.`);
    fermerZones();
    ouvrirExploration();
}

function visiterZoneActuelle() {
    const zone = obtenirZoneActuelle();
    if (!zone) return;
    avancerTemps(0, 10);
    const evenement = genererEvenementZone(zone);
    executerEvenementZone(evenement, zone);
}

function selectionnerPnj(idPnj) {
    Game.ui.pnjSelectionne = Game.ui.pnjSelectionne === idPnj ? null : idPnj;
    ouvrirExploration();
}

/* ZONES Logique Moteur : Générateur d'Événements RND & Voyages */
function creerActionsPnj(personnagePnj) {
    if (!personnagePnj) {
        return `
            <p class="palette-vide">
                Sélectionnez un PNJ pour afficher ses interactions.
            </p>
        `;
    }

    const possedeQuetes =
        Game.data.quetes.some(
            quete =>
                quete.pnj === personnagePnj.id
        );

    return `
        <div class="actions-pnj-rpg">

            <button onclick="parlerPNJ('${personnagePnj.id}')">
                💬 Parler
            </button>

            ${
                possedeQuetes
                    ? `
                        <button onclick="ouvrirQuetesPNJ('${personnagePnj.id}')">
                            📜 Quêtes
                        </button>
                    `
                    : ""
            }

            ${
                personnagePnj.type === "marchand"
                    ? `
                        <button onclick="ouvrirMarchand('${personnagePnj.id}')">
                            🛒 Commerce
                        </button>
                    `
                    : ""
            }

        </div>
    `;
}

function ouvrirExploration() {
    changerVue("exploration");
    afficherVuePrincipale(afficherZoneActuelle());
}

function obtenirRegionMondeActuelle() {
    return Game.data.regionsMonde.find(region => region.id === Game.data.personnage.regionMondeActuelle) ?? null;
}

function obtenirZonesActuelles() {
    const region = obtenirRegionMondeActuelle();
    return region?.zones ?? [];
}

function changerRegionMonde(idRegion) {
    const region = Game.data.regionsMonde.find(r => r.id === idRegion);
    if (!region) return;

    Game.data.personnage.regionMondeActuelle = idRegion;
    const premiereZone = region.zones?.[0];

    if (premiereZone) {
        Game.data.personnage.zoneActuelle = premiereZone.id;
        Game.ui.zoneSelectionnee = premiereZone.id;
        if (!Game.data.personnage.zonesDebloquees.includes(premiereZone.id)) {
            Game.data.personnage.zonesDebloquees.push(premiereZone.id);
        }
        Game.data.personnage.lieuActuel = premiereZone.nom;
    }

    Game.ui.pnjSelectionne = null;
    ouvrirExploration();
}


/*
MAP — Fallbacks minimalistes
La vraie carte est fournie par Map_Refonte.js.
Ces fonctions existent seulement pour éviter une erreur si le module map
n'est pas encore chargé ou est temporairement désactivé.
*/
function selectionnerMap(id, type) {
    if (type === "zone") {
        Game.ui.zoneSelectionnee =
            id;

        if (typeof ouvrirZones === "function") {
            ouvrirZones();
        }

        return;
    }

    if (type === "region") {
        Game.ui.regionSelectionnee =
            id;

        if (typeof ouvrirRegions === "function") {
            ouvrirRegions();
        }
    }
}

function ouvrirZones() {
    const modal =
        document.getElementById("zonesModal");

    const liste =
        document.getElementById("listeZones");

    if (!modal || !liste) return;

    const zones =
        obtenirZonesActuelles();

    liste.innerHTML =
        zones.map(zone => {
            const debloquee =
                (Game.data.personnage.zonesDebloquees ?? []).includes(zone.id);

            const actuelle =
                Game.data.personnage.zoneActuelle === zone.id;

            return `
                <div class="item-card">
                    <h3>${zone.nom}</h3>
                    <p>${zone.description || ""}</p>
                    ${
                        actuelle
                            ? `<button disabled>Zone actuelle</button>`
                            : `<button ${debloquee ? "" : "disabled"} onclick="voyagerVersZone('${zone.id}')">
                                ${debloquee ? "Voyager" : "Verrouillée"}
                            </button>`
                    }
                </div>
            `;
        }).join("");

    modal.style.display =
        "flex";
}

function fermerZones() {
    const modal =
        document.getElementById("zonesModal");

    if (modal) {
        modal.style.display =
            "none";
    }
}

function ouvrirRegions() {
    const modal =
        document.getElementById("regionsModal");

    const liste =
        document.getElementById("listeRegions");

    if (!modal || !liste) return;

    liste.innerHTML =
        (Game.data.regionsMonde || []).map(region => `
            <div class="item-card">
                <h3>${region.nom}</h3>
                <p>${region.description || ""}</p>
                <button onclick="changerRegionMonde('${region.id}'); fermerRegions(); ouvrirZones();">
                    Voyager
                </button>
            </div>
        `).join("");

    modal.style.display =
        "flex";
}

function fermerRegions() {
    const modal =
        document.getElementById("regionsModal");

    if (modal) {
        modal.style.display =
            "none";
    }
}

function dessinerCarteMonde() {}
function dessinerCarteRegions() {}
