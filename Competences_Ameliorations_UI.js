/*
NightVenture - Competences Ameliorations UI
Branche les boutons d'utilisation des livres, pierres et noyaux sur la page Competences.
Version cap 21 : base 10, livre +1, pierre +1, noyau +1.
*/

(function () {
    "use strict";

    let injectionPlanifiee = false;

    function NV_escapeHtml(valeur) {
        return String(valeur ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function NV_quantiteInventaire(idObjet) {
        if (!idObjet) return 0;
        return (Game.data.personnage?.inventaire || [])
            .filter(entree => entree?.id === idObjet)
            .reduce((total, entree) => total + Number(entree.quantite || 0), 0);
    }

    function NV_objetDepuisId(idObjet) {
        return Game.cache.objetsParId?.[idObjet] || Game.data.objets?.find(objet => objet?.id === idObjet) || null;
    }

    function NV_idsCompetencesSpecialisationActive() {
        const personnage = Game.data?.personnage;
        if (!personnage || typeof NV_specialisationActive !== "function") return [];
        const spec = NV_specialisationActive(personnage);
        return Array.isArray(spec?.competences) ? spec.competences.filter(Boolean) : [];
    }

    function NV_itemRequisPourCompetence(idCompetence) {
        if (typeof NV_etatCompetencePersonnage !== "function") return { termine: true };

        const etat = NV_etatCompetencePersonnage(idCompetence);
        const max = Number(etat?.niveauMax || 10);
        const maxAbsolu = Number(etat?.niveauMaxAbsolu || Game.data?.ameliorationsCompetences?.niveauMaxAbsolu || 21);
        const niveau = Number(etat?.niveau || 1);

        if (etat?.masterisee || max >= maxAbsolu) {
            return {
                termine: true,
                niveau,
                niveauMax: max,
                texte: "Competence Masterisee",
                signature: `${idCompetence}|done|${niveau}|${max}`
            };
        }

        if (max < 15) {
            const itemId = Game.cache.itemsAmeliorationCompetences?.livresParCompetence?.[idCompetence]
                || Game.data.ameliorationsCompetences?.livresParCompetence?.[idCompetence]
                || null;
            return {
                itemId,
                niveau,
                niveauMax: max,
                type: "livre_competence",
                label: "Utiliser le livre (+1)",
                texte: "Debloque et monte cette competence de +1, jusqu'au niveau 15.",
                signature: `${idCompetence}|${itemId}|${niveau}|${max}|${NV_quantiteInventaire(itemId)}`
            };
        }

        if (max < 20) {
            return {
                itemId: "pierre_ame",
                niveau,
                niveauMax: max,
                type: "pierre_ame",
                label: "Utiliser Pierre d'ame (+1)",
                texte: "Debloque et monte cette competence de +1, jusqu'au niveau 20.",
                signature: `${idCompetence}|pierre_ame|${niveau}|${max}|${NV_quantiteInventaire("pierre_ame")}`
            };
        }

        return {
            itemId: "noyau_demoniaque",
            niveau,
            niveauMax: max,
            type: "noyau_demoniaque",
            label: "Utiliser Noyau demoniaque (+1)",
            texte: "Masterise la competence et debloque le niveau 21.",
            signature: `${idCompetence}|noyau_demoniaque|${niveau}|${max}|${NV_quantiteInventaire("noyau_demoniaque")}`
        };
    }

    function NV_creerActionsAmelioration(idCompetence) {
        const info = NV_itemRequisPourCompetence(idCompetence);
        if (info.termine) {
            return `
                <div class="competence-card__upgrade-actions competence-card__upgrade-actions--done" data-upgrade-signature="${NV_escapeHtml(info.signature)}">
                    <strong>${NV_escapeHtml(info.texte || "Competence Masterisee")}</strong>
                </div>
            `;
        }

        const objet = NV_objetDepuisId(info.itemId);
        const quantite = NV_quantiteInventaire(info.itemId);
        const niveauAuMax = Number(info.niveau || 0) >= Number(info.niveauMax || 0);
        const utilisable = Boolean(info.itemId && objet && quantite > 0 && niveauAuMax);

        let raison = "";
        if (!niveauAuMax) raison = `Atteins d'abord le niveau ${info.niveauMax}.`;
        else if (!objet) raison = "Objet requis introuvable dans les donnees.";
        else if (quantite <= 0) raison = "Objet requis absent de l'inventaire.";

        return `
            <div class="competence-card__upgrade-actions" data-upgrade-signature="${NV_escapeHtml(info.signature)}">
                <div class="competence-card__upgrade-info">
                    <strong>${NV_escapeHtml(objet?.nom || info.itemId || "Objet requis")}</strong>
                    <small>${NV_escapeHtml(info.texte)}</small>
                    <span>Possede : ${quantite}</span>
                </div>
                <button
                    type="button"
                    class="competence-card__upgrade-button ${utilisable ? "" : "competence-card__upgrade-button--blocked"}"
                    data-skill-upgrade-button="true"
                    data-competence-id="${NV_escapeHtml(idCompetence)}"
                    data-item-id="${NV_escapeHtml(info.itemId || "")}"
                    data-upgrade-usable="${utilisable ? "1" : "0"}"
                    onclick="return NV_cliquerBoutonAmeliorationCompetence(event, this);"
                >${NV_escapeHtml(info.label)}</button>
                ${raison ? `<small class="competence-card__upgrade-warning">${NV_escapeHtml(raison)}</small>` : ""}
            </div>
        `;
    }

    function NV_nettoyerAffichageNiveauxCompetences(carte, idCompetence) {
        const etat = typeof NV_etatCompetencePersonnage === "function" ? NV_etatCompetencePersonnage(idCompetence) : null;
        const niveau = Number(etat?.niveau || 1);
        const niveauFort = carte.querySelector(".competence-card__header strong");
        if (niveauFort) niveauFort.textContent = `Niv. ${niveau}`;

        carte.querySelectorAll(".competence-card__stats span").forEach(span => {
            if (span.textContent.trim().startsWith("Max actuel")) span.remove();
        });

        carte.querySelector(".competence-card__progression")?.remove();
        carte.querySelector(".competence-card__requirement")?.remove();
    }

    function NV_injecterBoutonsAmeliorationCompetences() {
        const vue = document.getElementById("vuePrincipale");
        if (!vue || Game.ui?.vueActive !== "competences_classes") return;

        if (typeof NV_normaliserCompetencesPersonnage === "function") {
            NV_normaliserCompetencesPersonnage(Game.data?.personnage);
        }

        const ids = NV_idsCompetencesSpecialisationActive();
        if (!ids.length) return;

        const cartes = [...vue.querySelectorAll(".competence-grid .competence-card")];
        cartes.forEach((carte, index) => {
            const idCompetence = ids[index];
            if (!idCompetence) return;

            carte.dataset.competenceId = idCompetence;
            NV_nettoyerAffichageNiveauxCompetences(carte, idCompetence);

            const contenu = carte.querySelector(".competence-card__content");
            if (!contenu) return;

            const html = NV_creerActionsAmelioration(idCompetence);
            const signatureMatch = html.match(/data-upgrade-signature="([^"]*)"/);
            const nouvelleSignature = signatureMatch?.[1] || "";
            const blocExistant = carte.querySelector(".competence-card__upgrade-actions");

            if (blocExistant && blocExistant.dataset.upgradeSignature === nouvelleSignature) {
                return;
            }

            blocExistant?.remove();
            contenu.insertAdjacentHTML("beforeend", html);
        });
    }

    function NV_planifierInjectionBoutonsAmelioration() {
        if (injectionPlanifiee) return;
        injectionPlanifiee = true;
        requestAnimationFrame(() => {
            injectionPlanifiee = false;
            NV_injecterBoutonsAmeliorationCompetences();
        });
    }

    function NV_cliquerBoutonAmeliorationCompetence(event, bouton) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();
        }

        const itemId = bouton?.dataset?.itemId || "";
        const competenceId = bouton?.dataset?.competenceId || bouton?.closest?.(".competence-card")?.dataset?.competenceId || "";

        console.log("NV upgrade click", { itemId, competenceId, usable: bouton?.dataset?.upgradeUsable, bouton });

        if (!itemId || !competenceId) {
            const message = "Bouton d'amelioration incomplet : item ou competence manquant.";
            console.warn(message, { itemId, competenceId });
            if (typeof ajouterJournal === "function") ajouterJournal(message);
            return false;
        }

        if (typeof window.utiliserObjetAmeliorationCompetence !== "function") {
            const message = "Fonction utiliserObjetAmeliorationCompetence introuvable.";
            console.error(message);
            if (typeof ajouterJournal === "function") ajouterJournal(message);
            return false;
        }

        const resultat = window.utiliserObjetAmeliorationCompetence(itemId, competenceId);
        console.log("NV upgrade result", resultat);

        if (typeof ajouterJournal === "function" && resultat?.message) {
            ajouterJournal(resultat.message);
        }

        if (typeof window.ouvrirCompetencesJoueur === "function") {
            window.ouvrirCompetencesJoueur();
        } else if (typeof window.rafraichirInterface === "function") {
            window.rafraichirInterface();
        }

        NV_planifierInjectionBoutonsAmelioration();
        return false;
    }

    document.addEventListener("click", event => {
        const bouton = event.target?.closest?.("[data-skill-upgrade-button]");
        if (!bouton) return;
        NV_cliquerBoutonAmeliorationCompetence(event, bouton);
    }, true);

    const observer = new MutationObserver(mutations => {
        const doitInjecter = mutations.some(mutation => {
            return [...mutation.addedNodes, ...mutation.removedNodes].some(node => {
                if (!node?.querySelector && !node?.matches) return false;
                if (node.matches?.(".competence-card") || node.matches?.(".competence-grid")) return true;
                return Boolean(node.querySelector?.(".competence-card, .competence-grid"));
            });
        });
        if (doitInjecter) NV_planifierInjectionBoutonsAmelioration();
    });

    function NV_demarrerObserverAmelioration() {
        const cible = document.getElementById("vuePrincipale") || document.body;
        if (!cible) return;
        observer.observe(cible, { childList: true, subtree: true });
        NV_planifierInjectionBoutonsAmelioration();
    }

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", NV_demarrerObserverAmelioration);
    } else {
        NV_demarrerObserverAmelioration();
    }

    window.NV_injecterBoutonsAmeliorationCompetences = NV_injecterBoutonsAmeliorationCompetences;
    window.NV_cliquerBoutonAmeliorationCompetence = NV_cliquerBoutonAmeliorationCompetence;
})();
