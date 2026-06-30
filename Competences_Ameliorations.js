/*
NightVenture - Competences Ameliorations
- Generation automatique des items d'amelioration de competences
- Fonction centrale d'utilisation des livres, pierres et noyaux
- Livre +1, Pierre d'ame +1, Noyau demoniaque +1, cap final niveau 21.
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
            niveauMaxDepart: Number(regle?.niveauMaxDepart || 10),
            niveauMaxFinal: Number(regle?.niveauMaxFinal || 15),
            gainNiveauMax: Number(regle?.gainNiveauMax || 1),
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
            gainNiveauMax: Number(itemSchema?.gainNiveauMax ?? regle?.gainNiveauMax ?? 1),
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

    function NV_resultatAmelioration(ok, message, details = {}) {
        return { ok: Boolean(ok), message, ...details };
    }

    function NV_objetAmelioration(idObjet) {
        return Game.cache.objetsParId?.[idObjet] || Game.data.objets?.find(objet => objet?.id === idObjet) || null;
    }

    function NV_competenceAmeliorable(idCompetence) {
        return Game.cache.competencesParId?.[idCompetence] || Game.data.competences?.find(competence => competence?.id === idCompetence) || null;
    }

    function NV_peutConsommerObjetAmelioration(idObjet) {
        if (typeof possedeObjet === "function") return possedeObjet(idObjet);
        return Game.data.personnage?.inventaire?.some(item => item.id === idObjet && Number(item.quantite || 0) > 0);
    }

    function NV_consommeObjetAmelioration(idObjet) {
        if (typeof retirerObjetInventaire === "function") return retirerObjetInventaire(idObjet, 1);

        const inventaire = Game.data.personnage?.inventaire || [];
        const item = inventaire.find(entree => entree.id === idObjet);
        if (!item) return false;
        item.quantite = Number(item.quantite || 0) - 1;
        if (item.quantite <= 0) {
            Game.data.personnage.inventaire = inventaire.filter(entree => entree.id !== idObjet);
        }
        return true;
    }

    function NV_verifierPreconditionsAmelioration(objet, competence, etat) {
        if (!objet?.typeAmeliorationCompetence) {
            return NV_resultatAmelioration(false, "Cet objet n'est pas un objet d'amelioration de competence.");
        }

        if (!competence || !etat) {
            return NV_resultatAmelioration(false, "Competence introuvable ou indisponible pour la specialisation active.");
        }

        if (Number(etat.niveau || 0) < Number(etat.niveauMax || 0)) {
            return NV_resultatAmelioration(false, "La competence doit d'abord atteindre son niveau maximum actuel.", {
                niveau: etat.niveau,
                niveauMax: etat.niveauMax
            });
        }

        return NV_resultatAmelioration(true, "Preconditions valides.");
    }

    function NV_monterCompetenceAuNiveauMax(etat) {
        etat.niveau = Math.max(Number(etat.niveau || 1), Number(etat.niveauMax || 1));
        return etat.niveau;
    }

    function NV_appliquerGainNiveauMax(etat, niveauMaxActuel, niveauMaxFinal, gain) {
        etat.niveauMax = Math.min(niveauMaxActuel + Math.max(1, Number(gain) || 1), niveauMaxFinal);
        etat.niveau = etat.niveauMax;
    }

    function NV_utiliserLivreCompetence(objet, competence, etat) {
        if (objet.competenceId !== competence.id) {
            return NV_resultatAmelioration(false, "Ce livre ne correspond pas a cette competence.");
        }

        const niveauMaxDepart = Number(objet.niveauMaxDepart || 10);
        const niveauMaxFinal = Number(objet.niveauMaxFinal || 15);
        const gain = Number(objet.gainNiveauMax || 1);
        const niveauMaxActuel = Number(etat.niveauMax || niveauMaxDepart);

        if (niveauMaxActuel < niveauMaxDepart || niveauMaxActuel >= niveauMaxFinal) {
            return NV_resultatAmelioration(false, `Ce livre fonctionne seulement du niveau ${niveauMaxDepart} au niveau ${niveauMaxFinal}.`);
        }

        NV_appliquerGainNiveauMax(etat, niveauMaxActuel, niveauMaxFinal, gain);
        etat.livresUtilises = Number(etat.livresUtilises || 0) + 1;

        return NV_resultatAmelioration(true, `${competence.nom} passe au niveau ${etat.niveau}.`, {
            palier: "livre_competence",
            niveau: etat.niveau,
            niveauMax: etat.niveauMax
        });
    }

    function NV_utiliserPierreAme(objet, competence, etat) {
        const niveauMaxDepart = Number(objet.niveauMaxDepart || 15);
        const niveauMaxFinal = Number(objet.niveauMaxFinal || 20);
        const gain = Number(objet.gainNiveauMax || 1);
        const niveauMaxActuel = Number(etat.niveauMax || 10);

        if (niveauMaxActuel < niveauMaxDepart || niveauMaxActuel >= niveauMaxFinal) {
            return NV_resultatAmelioration(false, `La Pierre d'ame fonctionne seulement du niveau ${niveauMaxDepart} au niveau ${niveauMaxFinal}.`);
        }

        NV_appliquerGainNiveauMax(etat, niveauMaxActuel, niveauMaxFinal, gain);
        etat.pierresAmeUtilisees = Number(etat.pierresAmeUtilisees || 0) + 1;

        return NV_resultatAmelioration(true, `${competence.nom} passe au niveau ${etat.niveau}.`, {
            palier: "pierre_ame",
            niveau: etat.niveau,
            niveauMax: etat.niveauMax
        });
    }

    function NV_utiliserNoyauDemoniaque(objet, competence, etat) {
        const niveauMaxDepart = Number(objet.niveauMaxDepart || 20);
        const niveauMaxFinal = Number(objet.niveauMaxFinal || 21);
        const niveauMaxActuel = Number(etat.niveauMax || 10);

        if (etat.noyauDemoniaqueUtilise || etat.masterisee) {
            return NV_resultatAmelioration(false, "Cette competence est deja Masterisee.");
        }

        if (niveauMaxActuel !== niveauMaxDepart) {
            return NV_resultatAmelioration(false, `Le Noyau demoniaque fonctionne seulement au niveau ${niveauMaxDepart}.`);
        }

        etat.niveauMax = niveauMaxFinal;
        etat.niveau = niveauMaxFinal;
        etat.masterisee = true;
        etat.noyauDemoniaqueUtilise = true;

        return NV_resultatAmelioration(true, `${competence.nom} est maintenant Masterisee au niveau ${etat.niveau}.`, {
            palier: "noyau_demoniaque",
            niveau: etat.niveau,
            niveauMax: etat.niveauMax,
            masterisee: true
        });
    }

    function utiliserObjetAmeliorationCompetence(idObjet, idCompetence) {
        const personnage = Game.data?.personnage;
        if (!personnage) return NV_resultatAmelioration(false, "Personnage indisponible.");

        if (typeof NV_normaliserCompetencesPersonnage === "function") {
            NV_normaliserCompetencesPersonnage(personnage);
        }

        const objet = NV_objetAmelioration(idObjet);
        const competence = NV_competenceAmeliorable(idCompetence);
        const etat = typeof NV_etatCompetencePersonnage === "function"
            ? NV_etatCompetencePersonnage(idCompetence, personnage)
            : personnage.competencesProgression?.[idCompetence];

        if (!objet) return NV_resultatAmelioration(false, "Objet introuvable.");
        if (!NV_peutConsommerObjetAmelioration(idObjet)) return NV_resultatAmelioration(false, "Vous ne possedez pas cet objet.");

        const preconditions = NV_verifierPreconditionsAmelioration(objet, competence, etat);
        if (!preconditions.ok) {
            if (typeof ajouterJournal === "function") ajouterJournal(preconditions.message);
            return preconditions;
        }

        let resultat;
        switch (objet.typeAmeliorationCompetence) {
            case "livre_competence":
                resultat = NV_utiliserLivreCompetence(objet, competence, etat);
                break;
            case "pierre_ame":
                resultat = NV_utiliserPierreAme(objet, competence, etat);
                break;
            case "noyau_demoniaque":
                resultat = NV_utiliserNoyauDemoniaque(objet, competence, etat);
                break;
            default:
                resultat = NV_resultatAmelioration(false, "Type d'objet d'amelioration inconnu.");
        }

        if (!resultat.ok) {
            if (typeof ajouterJournal === "function") ajouterJournal(resultat.message);
            return resultat;
        }

        NV_monterCompetenceAuNiveauMax(etat);

        const consomme = NV_consommeObjetAmelioration(idObjet);
        if (!consomme) return NV_resultatAmelioration(false, "Impossible de consommer l'objet.");

        personnage.competencesProgression ??= {};
        personnage.competencesNiveaux ??= {};
        personnage.competencesProgression[idCompetence] = etat;
        personnage.competencesNiveaux[idCompetence] = etat.niveau;

        if (typeof ajouterJournal === "function") {
            ajouterJournal(`${objet.nom} utilise.`);
            ajouterJournal(resultat.message);
        }
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("competence item level up");
        if (typeof rafraichirInterface === "function") rafraichirInterface();

        return resultat;
    }

    window.NV_genererItemsAmeliorationCompetences = NV_genererItemsAmeliorationCompetences;
    window.utiliserObjetAmeliorationCompetence = utiliserObjetAmeliorationCompetence;
    window.NV_utiliserObjetAmeliorationCompetence = utiliserObjetAmeliorationCompetence;
})();
