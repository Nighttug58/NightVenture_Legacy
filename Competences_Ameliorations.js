/*
NightVenture - Competences Ameliorations
Point 2 : generation automatique des items d'amelioration de competences.
- 1 livre par competence
- 1 pierre_ame globale
- 1 noyau_demoniaque global
*/

(function () {
    "use strict";

    function NV_titreDepuisIdCompetence(idCompetence) {
        const competence = Game.cache.competencesParId?.[idCompetence]
            || Game.data.competences?.find(c => c.id === idCompetence)
            || null;
        return competence?.nom || String(idCompetence || "competence").replaceAll("_", " ");
    }

    function NV_objetBaseAmelioration({ id, nom, type, rarete, image }) {
        return {
            id,
            nom,
            type,
            rarete,
            prix: 0,
            description: "Objet d'amelioration de competence. Les tables de drop seront definies plus tard.",
            image: image || "",
            force: 0,
            dexterite: 0,
            intelligence: 0,
            vitalite: 0,
            chance: 0,
            attaque: 0,
            attaqueMagique: 0,
            defense: 0,
            defenseMagique: 0,
            pvMax: 0,
            manaMax: 0,
            staminaMax: 0,
            critique: 0,
            esquive: 0,
            bonusLoot: 0,
            bonusOr: 0,
            soin: 0,
            xp: 0,
            niveauRequis: 0,
            empilable: true,
            consommableCompetence: true,
            tableDrop: null,
            effets: []
        };
    }

    function NV_ajouterOuRemplacerObjetAmelioration(objet) {
        if (!objet?.id) return;
        Game.data.objets ??= [];
        Game.cache.objetsParId ??= {};

        const index = Game.data.objets.findIndex(existant => existant?.id === objet.id);
        if (index >= 0) {
            Game.data.objets[index] = { ...Game.data.objets[index], ...objet };
        } else {
            Game.data.objets.push(objet);
        }
        Game.cache.objetsParId[objet.id] = Game.data.objets.find(existant => existant?.id === objet.id) || objet;
    }

    function NV_creerLivreCompetence(idCompetence, idLivre, regle) {
        const nomCompetence = NV_titreDepuisIdCompetence(idCompetence);
        return {
            ...NV_objetBaseAmelioration({
                id: idLivre,
                nom: `Livre de competence : ${nomCompetence}`,
                type: regle?.typeItem || "livre_competence",
                rarete: regle?.rarete || "rare",
                image: `assets/items/competences/${idLivre}.png`
            }),
            competenceId: idCompetence,
            typeAmeliorationCompetence: "livre_competence",
            niveauMaxDepart: Number(regle?.niveauMaxDepart || 5),
            niveauMaxFinal: Number(regle?.niveauMaxFinal || 10),
            itemParCompetence: true
        };
    }

    function NV_creerItemGlobalAmelioration(idItem, itemSchema, regle, typeFallback) {
        return {
            ...NV_objetBaseAmelioration({
                id: itemSchema?.id || regle?.id || idItem,
                nom: itemSchema?.nom || regle?.nom || idItem,
                type: itemSchema?.type || regle?.typeItem || typeFallback,
                rarete: itemSchema?.rarete || regle?.rarete || "rare",
                image: itemSchema?.image || regle?.image || `assets/items/competences/${idItem}.png`
            }),
            typeAmeliorationCompetence: itemSchema?.type || regle?.typeItem || typeFallback,
            niveauMaxDepart: Number(itemSchema?.niveauMaxDepart ?? regle?.niveauMaxDepart ?? 0),
            niveauMaxFinal: Number(itemSchema?.niveauMaxFinal ?? regle?.niveauMaxFinal ?? 0),
            rendMasterisee: Boolean(itemSchema?.rendMasterisee || regle?.rendMasterisee),
            itemParCompetence: false
        };
    }

    function NV_genererItemsAmeliorationCompetences() {
        const schema = Game.data?.ameliorationsCompetences || {};
        const regles = schema.regles || {};
        const livres = schema.livresParCompetence || {};
        const regleLivre = regles.livresCompetence || {};
        let livresGeneres = 0;

        Object.entries(livres).forEach(([idCompetence, idLivre]) => {
            if (!idCompetence || !idLivre) return;
            NV_ajouterOuRemplacerObjetAmelioration(NV_creerLivreCompetence(idCompetence, idLivre, regleLivre));
            livresGeneres++;
        });

        const itemsGlobaux = schema.itemsGlobaux || {};
        const pierre = NV_creerItemGlobalAmelioration("pierre_ame", itemsGlobaux.pierre_ame, regles.pierreAme, "pierre_ame");
        const noyau = NV_creerItemGlobalAmelioration("noyau_demoniaque", itemsGlobaux.noyau_demoniaque, regles.noyauDemoniaque, "noyau_demoniaque");

        NV_ajouterOuRemplacerObjetAmelioration(pierre);
        NV_ajouterOuRemplacerObjetAmelioration(noyau);

        Game.cache.itemsAmeliorationCompetences = {
            livresParCompetence: { ...livres },
            itemsGlobaux: {
                pierre_ame: pierre.id,
                noyau_demoniaque: noyau.id
            },
            totalLivres: livresGeneres,
            totalItems: livresGeneres + 2
        };

        return Game.cache.itemsAmeliorationCompetences;
    }

    window.NV_genererItemsAmeliorationCompetences = NV_genererItemsAmeliorationCompetences;
})();
