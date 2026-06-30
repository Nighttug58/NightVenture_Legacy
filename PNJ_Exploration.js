/*
NightVenture — PNJ / affichage exploration mobile portrait
- Exploration compacte verticale
- PNJ épurés
- Bouton Explorer prioritaire
- Sans mini-carte intégrée
*/

function obtenirIconeRolePnj(personnagePnj) {
    const type = normaliserTexte(personnagePnj.type || personnagePnj.role || "");

    if (type.includes("marchand")) return "Marchand";
    if (type.includes("garde")) return "Garde";
    if (type.includes("forgeron")) return "Forgeron";
    if (type.includes("mage")) return "Mage";
    if (type.includes("aubergiste")) return "Aubergiste";
    if (type.includes("soigneur")) return "Soigneur";
    if (type.includes("quete") || type.includes("quête")) return "Quête";

    return "PNJ";
}

function NVEXP_injecterStyleMobilePortrait() {
    if (document.getElementById("nvExplorationPortraitStyle")) return;

    const style = document.createElement("style");
    style.id = "nvExplorationPortraitStyle";
    style.textContent = `
        .nv-exploration-mobile {
            display: flex;
            flex-direction: column;
            gap: 10px;
            padding-bottom: 8px;
        }

        .nv-exploration-mobile .item-card {
            margin-bottom: 0;
        }

        .nv-exploration-hero-mobile {
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding: 10px;
        }

        .nv-exploration-hero-mobile__top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
        }

        .nv-exploration-hero-mobile__zone {
            min-width: 0;
        }

        .nv-exploration-hero-mobile__zone small {
            display: block;
            color: var(--text-muted, #c7bdad);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.02em;
            text-transform: uppercase;
        }

        .nv-exploration-hero-mobile__zone strong {
            display: block;
            overflow: hidden;
            color: var(--gold, #f5d37a);
            font-size: clamp(1.1rem, 5vw, 1.45rem);
            line-height: 1.1;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .nv-exploration-hero-mobile__actions {
            display: flex;
            flex: 0 0 auto;
            gap: 6px;
        }

        .nv-exploration-hero-mobile__actions button {
            min-height: 32px;
            padding: 6px 9px;
            border-radius: 999px;
            font-size: 0.74rem;
            white-space: nowrap;
        }

        .nv-exploration-primary-action {
            width: 100%;
            min-height: 48px !important;
            border-radius: 14px !important;
            border-color: rgba(245, 211, 122, 0.42) !important;
            background: linear-gradient(180deg, rgba(168, 134, 75, 0.82), rgba(113, 89, 49, 0.78)) !important;
            color: #fff !important;
            font-size: 1rem !important;
            font-weight: 900;
            letter-spacing: 0.02em;
        }

        .nv-exploration-description {
            margin: 0;
            color: var(--text-muted, #c7bdad);
            font-size: 0.88rem;
            line-height: 1.38;
        }

        .nv-exploration-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .nv-exploration-chip {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 4px 8px;
            border: 1px solid rgba(255, 255, 255, 0.075);
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.14);
            color: var(--text-muted, #c7bdad);
            font-size: 0.72rem;
            font-weight: 800;
            white-space: nowrap;
        }

        .nv-exploration-section-title {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin: 0 0 8px;
        }

        .nv-exploration-section-title h3 {
            margin: 0;
            font-size: 0.98rem;
            line-height: 1.1;
        }

        .nv-exploration-section-title small {
            color: var(--text-muted, #c7bdad);
            font-size: 0.72rem;
            font-weight: 800;
        }

        .nv-compact-stack {
            display: flex;
            flex-direction: column;
            gap: 7px;
        }

        .nv-compact-row,
        .nv-zone-link-mobile {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            min-height: 38px;
            width: 100%;
            padding: 8px 10px;
            border: 1px solid rgba(255, 255, 255, 0.075);
            border-radius: 12px;
            background: rgba(0, 0, 0, 0.12);
            color: var(--text, #f1eadf);
            text-align: left;
        }

        .nv-zone-link-mobile small,
        .nv-compact-row span {
            color: var(--text-muted, #c7bdad);
            font-size: 0.72rem;
            font-weight: 800;
            white-space: nowrap;
        }

        .nv-zone-link-mobile.is-locked {
            opacity: 0.48;
            cursor: not-allowed;
        }

        .nv-empty-mobile {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 34px;
            padding: 8px;
            border: 1px dashed rgba(255, 255, 255, 0.10);
            border-radius: 12px;
            color: var(--text-muted, #c7bdad);
            font-size: 0.78rem;
            text-align: center;
        }

        .pnj-rpg--mobile {
            display: grid;
            grid-template-columns: 42px minmax(0, 1fr);
            gap: 9px;
            align-items: center;
            min-height: 54px;
            padding: 8px;
            border-radius: 13px;
            background: rgba(0, 0, 0, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.075);
        }

        .pnj-rpg--mobile .pnj-rpg__portrait {
            width: 42px;
            height: 42px;
        }

        .pnj-rpg--mobile h4 {
            margin: 0;
            font-size: 0.9rem;
            line-height: 1.1;
        }

        .pnj-rpg--mobile .pnj-rpg__role {
            margin-top: 3px;
            font-size: 0.72rem;
            opacity: 0.84;
        }

        .pnj-rpg--mobile .pnj-rpg__etat {
            align-self: flex-start;
            padding: 3px 7px;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.18);
            color: var(--text-muted, #c7bdad);
            font-size: 0.66rem;
            font-weight: 900;
            white-space: nowrap;
        }

        .pnj-rpg--mobile .pnj-rpg__panneau {
            margin-top: 8px;
            padding: 8px;
            border-radius: 11px;
            background: rgba(0, 0, 0, 0.14);
        }

        .pnj-rpg--mobile .pnj-rpg__dialogue {
            margin: 0 0 8px;
            color: var(--text-muted, #c7bdad);
            font-size: 0.80rem;
            line-height: 1.35;
        }

        .pnj-rpg--mobile .actions-pnj-rpg {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .pnj-rpg--mobile .actions-pnj-rpg button {
            min-height: 30px;
            padding: 6px 9px;
            border-radius: 999px;
            font-size: 0.74rem;
        }

        #giAubergeGratuite {
            display: none !important;
        }

        @media (min-width: 760px) and (orientation: landscape) {
            .nv-exploration-mobile {
                max-width: 760px;
                margin: 0 auto;
            }
        }
    `;

    document.head.appendChild(style);
}

function creerPortraitPnjExploration(personnagePnj) {
    const image = personnagePnj.image || personnagePnj.portrait || "";

    if (image) {
        return `
            <div class="pnj-rpg__portrait">
                <img src="${image}" alt="${echapperHTML(personnagePnj.nom || "PNJ")}">
            </div>
        `;
    }

    const initiale = String(personnagePnj.nom || "?").trim().charAt(0).toUpperCase();
    return `<div class="pnj-rpg__portrait pnj-rpg__portrait--initiale">${initiale || "?"}</div>`;
}

function creerLignePnjExploration(personnagePnj) {
    const selectionne = Game.ui.pnjSelectionne === personnagePnj.id;
    const iconeRole = obtenirIconeRolePnj(personnagePnj);
    const nom = echapperHTML(personnagePnj.nom || "Personnage inconnu");
    const role = echapperHTML(personnagePnj.role || personnagePnj.type || "Habitant");
    const dialogue = echapperHTML(personnagePnj.dialogue || "Ce personnage semble avoir quelque chose à dire.");
    const classeSelection = selectionne
        ? "pnj-rpg pnj-rpg--selectionne pnj-rpg--mobile"
        : "pnj-rpg pnj-rpg--mobile";

    return `
        <article class="${classeSelection}" onclick="selectionnerPnj('${personnagePnj.id}')">
            ${creerPortraitPnjExploration(personnagePnj)}

            <div class="pnj-rpg__contenu">
                <div class="pnj-rpg__ligne-haut">
                    <div>
                        <h4>${nom}</h4>
                        <div class="pnj-rpg__role"><span>${iconeRole}</span>${role}</div>
                    </div>
                    <div class="pnj-rpg__etat">${selectionne ? "Ouvert" : "Voir"}</div>
                </div>

                ${selectionne ? `
                    <div class="pnj-rpg__panneau" onclick="event.stopPropagation()">
                        <p class="pnj-rpg__dialogue">“${dialogue}”</p>
                        ${creerActionsPnj(personnagePnj)}
                    </div>
                ` : ""}
            </div>
        </article>
    `;
}

function creerSectionPnjExploration(zoneTrouvee) {
    const pnjPresents = (zoneTrouvee.pnj || [])
        .map(idPnj => Game.cache.pnjParId[idPnj])
        .filter(Boolean);

    return `
        <div class="item-card nv-exploration-card-mobile">
            <div class="nv-exploration-section-title">
                <h3>PNJ</h3>
                <small>${pnjPresents.length}</small>
            </div>
            ${pnjPresents.length > 0
                ? `<div class="nv-compact-stack">${pnjPresents.map(creerLignePnjExploration).join("")}</div>`
                : `<div class="nv-empty-mobile">Aucun PNJ visible.</div>`
            }
        </div>
    `;
}

function creerListeCreaturesExploration(zoneTrouvee) {
    const monstres = zoneTrouvee.monstres || [];

    return `
        <div class="item-card nv-exploration-card-mobile">
            <div class="nv-exploration-section-title">
                <h3>Créatures</h3>
                <small>${monstres.length}</small>
            </div>
            ${monstres.length > 0
                ? `<div class="nv-compact-stack">
                    ${monstres.map(monstreZone => {
                        const monstre = Game.cache.monstresParId[monstreZone.id];
                        if (!monstre) return "";
                        return `
                            <div class="nv-compact-row">
                                <strong>${echapperHTML(monstre.nom)}</strong>
                                <span>${monstreZone.chance}%</span>
                            </div>
                        `;
                    }).join("")}
                </div>`
                : `<div class="nv-empty-mobile">Aucune créature connue.</div>`
            }
        </div>
    `;
}

function creerListeConnexionsExploration(zoneTrouvee) {
    const connexions = zoneTrouvee.connexions || [];

    return `
        <div class="item-card nv-exploration-card-mobile">
            <div class="nv-exploration-section-title">
                <h3>Sorties</h3>
                <small>${connexions.length}</small>
            </div>
            ${connexions.length > 0
                ? `<div class="nv-compact-stack">
                    ${connexions.map(idZone => {
                        const zoneDestination = Game.cache.zonesParId[idZone];
                        if (!zoneDestination) return "";
                        const debloquee = (Game.data.personnage.zonesDebloquees ?? []).includes(zoneDestination.id);
                        return `
                            <button class="nv-zone-link-mobile ${debloquee ? "" : "is-locked"}" ${debloquee ? "" : "disabled"} onclick="voyagerVersZone('${zoneDestination.id}')">
                                <strong>${echapperHTML(zoneDestination.nom)}</strong>
                                <small>${debloquee ? "Voyager" : "Verrouillée"}</small>
                            </button>
                        `;
                    }).join("")}
                </div>`
                : `<div class="nv-empty-mobile">Aucune sortie directe.</div>`
            }
        </div>
    `;
}

function creerEvenementsExploration(zoneTrouvee) {
    const evenements = [];

    if (zoneTrouvee.monstres && zoneTrouvee.monstres.length > 0) evenements.push("Combat");
    if (zoneTrouvee.pnj && zoneTrouvee.pnj.length > 0) evenements.push("Rencontre");

    const marchandPresent = (zoneTrouvee.pnj ?? []).some(idPnj => Game.cache.pnjParId[idPnj]?.type === "marchand");
    if (marchandPresent) evenements.push("Commerce");

    evenements.push("Découverte");

    return evenements.map(evenement => `<span class="nv-exploration-chip">${evenement}</span>`).join("");
}

function afficherZoneActuelle() {
    NVEXP_injecterStyleMobilePortrait();

    const zoneTrouvee = Game.cache.zonesParId[Game.data.personnage.zoneActuelle];
    if (!zoneTrouvee) return `<div class="item-card"><h2>Zone inconnue</h2></div>`;

    const region = typeof obtenirRegionMondeActuelle === "function" ? obtenirRegionMondeActuelle() : null;
    const tempsVoyage = Number(zoneTrouvee.tempsVoyage ?? 1);

    return `
        <section class="nv-exploration-mobile">
            <div class="item-card nv-exploration-hero-mobile">
                <div class="nv-exploration-hero-mobile__top">
                    <div class="nv-exploration-hero-mobile__zone">
                        <small>Zone actuelle</small>
                        <strong>${echapperHTML(zoneTrouvee.nom)}</strong>
                    </div>
                    <div class="nv-exploration-hero-mobile__actions">
                        <button onclick="ouvrirZones()">Carte</button>
                        <button onclick="typeof GI_ouvrirProgressionCombat === 'function' && GI_ouvrirProgressionCombat()">Menaces</button>
                    </div>
                </div>

                <button class="nv-exploration-primary-action" onclick="visiterZoneActuelle()">Explorer</button>

                <div class="nv-exploration-chip-row">
                    <span class="nv-exploration-chip">${echapperHTML(region?.nom || "Région inconnue")}</span>
                    <span class="nv-exploration-chip">${echapperHTML(zoneTrouvee.type || "zone")}</span>
                    <span class="nv-exploration-chip">Voyage ${tempsVoyage}h</span>
                </div>

                <p class="nv-exploration-description">${echapperHTML(zoneTrouvee.description || "Aucune description.")}</p>

                <div class="nv-exploration-chip-row">
                    ${creerEvenementsExploration(zoneTrouvee)}
                </div>
            </div>

            ${creerListeConnexionsExploration(zoneTrouvee)}
            ${creerSectionPnjExploration(zoneTrouvee)}
            ${creerListeCreaturesExploration(zoneTrouvee)}

            <div id="nvExplorationMenacesSlot" class="nv-exploration-menaces-slot"></div>
        </section>
    `;
}
