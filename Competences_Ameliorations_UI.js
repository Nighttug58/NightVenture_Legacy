/*
NightVenture - Competences Ameliorations UI
Point 6 : branche les boutons d'utilisation des livres, pierres et noyaux sur la page Competences.
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
                    class="competence-card__upgrade-button"
                    data-skill-upgrade-button="true"
                    data-competence-id="${NV_escapeHtml(idCompetence)}"
                    data-item-id="${NV_escapeHtml(info.itemId || "") }"
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

    document.addEventListener("click", event => {
        const bouton = event.target?.closest?.("[data-skill-upgrade-button]");
        if (!bouton) return;

        event.preventDefault();
        event.stopPropagation();

        const itemId = bouton.dataset.itemId;
        const competenceId = bouton.dataset.competenceId;
        if (!itemId || !competenceId || typeof utiliserObjetAmeliorationCompetence !== "function") return;

        const resultat = utiliserObjetAmeliorationCompetence(itemId, competenceId);
        if (!resultat?.ok && typeof ajouterJournal === "function" && resultat?.message) {
            ajouterJournal(resultat.message);
        }

        if (typeof ouvrirCompetencesJoueur === "function") ouvrirCompetencesJoueur();
        NV_planifierInjectionBoutonsAmelioration();
    }, true);

    const observer = new MutationObserver(NV_planifierInjectionBoutonsAmelioration);
    window.addEventListener("DOMContentLoaded", () => {
        const cible = document.getElementById("vuePrincipale") || document.body;
        observer.observe(cible, { childList: true, subtree: true });
        NV_planifierInjectionBoutonsAmelioration();
    });

    window.NV_injecterBoutonsAmeliorationCompetences = NV_injecterBoutonsAmeliorationCompetences;
})();
