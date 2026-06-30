/*
NightVenture - Competences Ameliorations UI
Branche les boutons d'utilisation des livres, pierres et noyaux sur la page Competences.
Version robuste : handler global + delegation + logs de debug.
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
        const max = Number(etat?.niveauMax || 5);
        const maxAbsolu = Number(etat?.niveauMaxAbsolu || Game.data?.ameliorationsCompetences?.niveauMaxAbsolu || 16);
        const niveau = Number(etat?.niveau || 1);

        if (etat?.masterisee || max >= maxAbsolu) {
            return {
                termine: true,
                niveau,
                niveauMax: max,
                texte: "Competence Masterisee"
            };
        }

        if (max < 10) {
            const itemId = Game.cache.itemsAmeliorationCompetences?.livresParCompetence?.[idCompetence]
                || Game.data.ameliorationsCompetences?.livresParCompetence?.[idCompetence]
                || null;
            return {
                itemId,
                niveau,
                niveauMax: max,
                type: "livre_competence",
                label: "Utiliser le livre",
                texte: "Augmente le niveau max de cette competence de +1, jusqu'au niveau 10."
            };
        }

        if (max < 15) {
            return {
                itemId: "pierre_ame",
                niveau,
                niveauMax: max,
                type: "pierre_ame",
                label: "Utiliser Pierre d'ame",
                texte: "Augmente le niveau max de cette competence de +1, jusqu'au niveau 15."
            };
        }

        return {
            itemId: "noyau_demoniaque",
            niveau,
            niveauMax: max,
            type: "noyau_demoniaque",
            label: "Utiliser Noyau demoniaque",
            texte: "Masterise la competence et debloque le niveau 16."
        };
    }

    function NV_creerActionsAmelioration(idCompetence) {
        const info = NV_itemRequisPourCompetence(idCompetence);
        if (info.termine) {
            return `
                <div class="competence-card__upgrade-actions competence-card__upgrade-actions--done">
                    <strong>${NV_escapeHtml(info.texte || "Competence Masterisee")}</strong>
                </div>
            `;
        }

        const objet = NV_objetDepuisId(info.itemId);
        const quantite = NV_quantiteInventaire(info.itemId);
        const niveauAuMax = Number(info.niveau || 0) >= Number(info.niveauMax || 0);
        const utilisable = Boolean(info.itemId && objet && quantite > 0 && niveauAuMax);

        let raison = "";
        if (!niveauAuMax) raison = `Atteins d'abord le niveau ${info.niveauMax}/${info.niveauMax}.`;
        else if (!objet) raison = "Objet requis introuvable dans les donnees.";
        else if (quantite <= 0) raison = "Objet requis absent de l'inventaire.";

        return `
            <div class="competence-card__upgrade-actions">
                <div class="competence-card__upgrade-info">
                    <strong>${NV_escapeHtml(objet?.nom || info.itemId || "Objet requis")}</strong>
                    <small>${NV_escapeHtml(info.texte)}</small>
                    <span>Possede : ${quantite}</span>
                </div>
                <button
                    type="button"
                    class="competence-card__upgrade-button"
                    data-skill-upgrade-button="true"
                    data-competence-id="${NV_escapeHtml(idCompetence)}"
                    data-item-id="${NV_escapeHtml(info.itemId || "")}"
                    onclick="return NV_cliquerBoutonAmeliorationCompetence(event, this);"
                    ${utilisable ? "" : "disabled"}
                >${NV_escapeHtml(info.label)}</button>
                ${raison ? `<small class="competence-card__upgrade-warning">${NV_escapeHtml(raison)}</small>` : ""}
            </div>
        `;
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
            carte.querySelector(".competence-card__upgrade-actions")?.remove();

            const contenu = carte.querySelector(".competence-card__content");
            if (!contenu) return;

            contenu.insertAdjacentHTML("beforeend", NV_creerActionsAmelioration(idCompetence));
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

        console.log("NV upgrade click", { itemId, competenceId, bouton });

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

        if (!resultat?.ok && typeof ajouterJournal === "function" && resultat?.message) {
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

    const observer = new MutationObserver(NV_planifierInjectionBoutonsAmelioration);

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
