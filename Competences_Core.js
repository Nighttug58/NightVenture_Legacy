/*
NightVenture - Competences Core
- Points de competence +1 par niveau
- Competences de classe niveau 1 a 5
- Scaling des couts et degats en combat
- Vue d'amelioration des competences
*/

(function () {
    "use strict";

    const NV_BASE_ACTIONS_COMPETENCES = ["attaque_simple", "defendre", "fuir", "utiliser_objet"];

    function NV_cloneCompetence(valeur) {
        return JSON.parse(JSON.stringify(valeur));
    }

    function NV_clampCompetence(valeur, min, max) {
        return Math.max(min, Math.min(max, Number(valeur) || 0));
    }

    function NV_escapeCompetence(texte) {
        return String(texte ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function NV_competenceDepuisCache(id) {
        return Game.cache.competencesParId?.[id] || Game.data.competences?.find(c => c.id === id) || null;
    }

    function NV_classePersonnage(personnage = Game.data?.personnage) {
        if (!personnage) return null;
        const classeId = personnage.classeId || String(personnage.classe || "").toLowerCase();
        return Game.cache.classesParId?.[classeId] || Game.data.classes?.find(c => c.id === classeId) || null;
    }

    function NV_idsCompetencesClasse(personnage = Game.data?.personnage) {
        const classe = NV_classePersonnage(personnage);
        return Array.isArray(classe?.competencesDepart) ? classe.competencesDepart.filter(Boolean) : [];
    }

    function NV_maxNiveauCompetence(idCompetence) {
        const competence = NV_competenceDepuisCache(idCompetence);
        return Number(competence?.maxNiveau || competence?.niveauMax || 5) || 5;
    }

    function NV_normaliserCompetencesPersonnage(personnage = Game.data?.personnage) {
        if (!personnage) return null;

        personnage.pointsCompetence = Number(personnage.pointsCompetence ?? 0);
        if (!Number.isFinite(personnage.pointsCompetence) || personnage.pointsCompetence < 0) personnage.pointsCompetence = 0;

        personnage.competencesNiveaux ??= {};
        if (typeof personnage.competencesNiveaux !== "object" || Array.isArray(personnage.competencesNiveaux)) {
            personnage.competencesNiveaux = {};
        }

        const idsClasse = NV_idsCompetencesClasse(personnage);
        idsClasse.forEach(id => {
            const max = NV_maxNiveauCompetence(id);
            const valeur = personnage.competencesNiveaux[id];
            personnage.competencesNiveaux[id] = valeur == null ? 1 : NV_clampCompetence(valeur, 0, max);
        });

        Object.keys(personnage.competencesNiveaux).forEach(id => {
            const max = NV_maxNiveauCompetence(id);
            personnage.competencesNiveaux[id] = NV_clampCompetence(personnage.competencesNiveaux[id], 0, max);
        });

        personnage.competences = [...new Set([...NV_BASE_ACTIONS_COMPETENCES, ...idsClasse])];
        return personnage;
    }

    function NV_niveauCompetence(idCompetence, personnage = Game.data?.personnage) {
        NV_normaliserCompetencesPersonnage(personnage);
        return Number(personnage?.competencesNiveaux?.[idCompetence] || 0);
    }

    function NV_progressionCompetence(competence, niveau) {
        if (!competence) return null;
        const niveauActuel = Math.max(1, Number(niveau) || 1);
        return Array.isArray(competence.progression)
            ? competence.progression.find(p => Number(p.niveau) === niveauActuel) || competence.progression[niveauActuel - 1] || null
            : null;
    }

    function NV_competenceScalee(idCompetence, niveau = null) {
        const base = NV_competenceDepuisCache(idCompetence);
        if (!base) return null;

        const niveauFinal = niveau == null ? NV_niveauCompetence(idCompetence) : Number(niveau) || 0;
        if (niveauFinal <= 0) return { ...NV_cloneCompetence(base), niveauCompetence: 0, verrouillee: true };

        const competence = NV_cloneCompetence(base);
        const progression = NV_progressionCompetence(base, niveauFinal);
        competence.niveauCompetence = niveauFinal;
        competence.niveau = niveauFinal;
        competence.maxNiveau = NV_maxNiveauCompetence(idCompetence);

        if (progression) {
            competence.puissance = Number(progression.puissance ?? competence.puissance ?? 0);
            competence.multiplicateur = Number(progression.multiplicateur ?? competence.multiplicateur ?? 1);
            competence.coutInitiative = Number(progression.coutInitiative ?? competence.coutInitiative ?? 100);
            competence.bonusCritique = Number(progression.bonusCritique ?? competence.bonusCritique ?? 0);
            competence.bonusEsquive = Number(progression.bonusEsquive ?? competence.bonusEsquive ?? 0);
            competence.couts = {
                ...(competence.couts || {}),
                ...(progression.couts || {})
            };
        }

        return competence;
    }

    const NV_trouverCompetenceCombatOriginal = typeof window.trouverCompetenceCombat === "function"
        ? window.trouverCompetenceCombat
        : null;

    window.trouverCompetenceCombat = function (idCompetence) {
        const competenceBase = NV_trouverCompetenceCombatOriginal
            ? NV_trouverCompetenceCombatOriginal(idCompetence)
            : NV_competenceDepuisCache(idCompetence);

        if (!competenceBase) return null;
        const personnage = Game.data?.personnage;
        const idsClasse = NV_idsCompetencesClasse(personnage);

        if (idsClasse.includes(idCompetence)) {
            return NV_competenceScalee(idCompetence);
        }

        return NV_cloneCompetence(competenceBase);
    };

    window.obtenirCompetencesCombatJoueur = function () {
        const personnage = Game.data?.personnage;
        NV_normaliserCompetencesPersonnage(personnage);
        return [...new Set([...NV_BASE_ACTIONS_COMPETENCES, ...NV_idsCompetencesClasse(personnage)])];
    };

    window.verifierMonteeNiveau = function () {
        let coutXp = xpNiveauSuivant();
        const personnage = Game.data.personnage;
        NV_normaliserCompetencesPersonnage(personnage);

        while (personnage.xp >= coutXp) {
            personnage.xp -= coutXp;
            personnage.niveau++;

            const palier = Game.data.niveaux.find(n => Number(n.niveau) === Number(personnage.niveau));
            const pointsStats = palier?.pointsStats ?? 5;
            const pointsTalents = palier?.pointsTalents ?? 1;

            personnage.pointsCaracteristiques += pointsStats;
            personnage.pointsTalent += pointsTalents;
            personnage.pointsCompetence = Number(personnage.pointsCompetence || 0) + 1;

            if (palier) {
                personnage.pvMax += palier.pvBonus || 0;
                personnage.manaMax += palier.manaBonus || 0;
            }

            personnage.pv = pvMaxTotal();
            personnage.mana = manaMaxTotal();
            personnage.stamina = staminaMaxTotal();

            ajouterJournal(`Niveau ${personnage.niveau} atteint !`);
            ajouterJournal(`+${pointsStats} points de caracteristiques`);
            ajouterJournal(`+${pointsTalents} point(s) de talent`);
            ajouterJournal("+1 point de competence");

            coutXp = xpNiveauSuivant();
        }
    };

    function NV_coutsTexteCompetence(competence) {
        const mana = Number(competence?.couts?.mana || 0);
        const stamina = Number(competence?.couts?.stamina || 0);
        return [mana ? `${mana} mana` : "", stamina ? `${stamina} stamina` : ""].filter(Boolean).join(" · ") || "Gratuit";
    }

    function NV_iconeCompetence(competence) {
        return competence?.icone || competence?.image || "assets/competences/competence_placeholder.png";
    }

    function NV_creerCarteCompetence(idCompetence) {
        const niveau = NV_niveauCompetence(idCompetence);
        const base = NV_competenceDepuisCache(idCompetence);
        const max = NV_maxNiveauCompetence(idCompetence);
        const actuelle = NV_competenceScalee(idCompetence, Math.max(1, niveau));
        const suivante = niveau < max ? NV_competenceScalee(idCompetence, niveau + 1) : null;
        const personnage = Game.data.personnage;
        const peutAmeliorer = niveau < max && Number(personnage.pointsCompetence || 0) > 0;

        return `
            <article class="competence-card ${niveau >= max ? "competence-card--max" : ""}">
                <img class="competence-card__icon" src="${NV_escapeCompetence(NV_iconeCompetence(base))}" alt="" onerror="this.classList.add('competence-card__icon--missing'); this.removeAttribute('src');">
                <div class="competence-card__content">
                    <div class="competence-card__header">
                        <div>
                            <h3>${NV_escapeCompetence(base?.nom || idCompetence)}</h3>
                            <p>${NV_escapeCompetence(base?.description || "Competence de classe.")}</p>
                        </div>
                        <strong>Niv. ${niveau}/${max}</strong>
                    </div>
                    <div class="competence-card__stats">
                        <span>Degats : ${Math.round(actuelle?.puissance || 0)}</span>
                        <span>Ratio : x${Number(actuelle?.multiplicateur || 1).toFixed(2)}</span>
                        <span>Cout : ${NV_escapeCompetence(NV_coutsTexteCompetence(actuelle))}</span>
                    </div>
                    ${suivante ? `
                        <div class="competence-card__next">
                            Prochain niveau : degats ${Math.round(suivante.puissance || 0)}, ratio x${Number(suivante.multiplicateur || 1).toFixed(2)}, cout ${NV_escapeCompetence(NV_coutsTexteCompetence(suivante))}
                        </div>
                    ` : `<div class="competence-card__next">Niveau maximum atteint.</div>`}
                    <button ${peutAmeliorer ? "" : "disabled"} onclick="NV_ameliorerCompetence('${NV_escapeCompetence(idCompetence)}')">
                        ${niveau <= 0 ? "Debloquer" : "Ameliorer"}
                    </button>
                </div>
            </article>
        `;
    }

    function ouvrirCompetencesJoueur() {
        if (!Game.data?.personnage) return;
        changerVue("competences_classes");
        const personnage = NV_normaliserCompetencesPersonnage(Game.data.personnage);
        const classe = NV_classePersonnage(personnage);
        const ids = NV_idsCompetencesClasse(personnage);

        const html = `
            <section class="item-card competence-hero">
                <div>
                    <h2>Competences de ${NV_escapeCompetence(classe?.nom || personnage.classe || "classe")}</h2>
                    <p>Chaque competence possede 5 niveaux. Les degats augmentent avec le niveau, mais le cout d'utilisation augmente aussi.</p>
                </div>
                <button onclick="ouvrirExploration()">Retour</button>
            </section>

            <section class="item-card competence-points-panel">
                <span>Points de competence disponibles</span>
                <strong>${Number(personnage.pointsCompetence || 0)}</strong>
                <small>+1 point de competence par niveau gagne.</small>
            </section>

            <section class="competence-grid">
                ${ids.map(NV_creerCarteCompetence).join("") || `<div class="item-card">Aucune competence de classe trouvee.</div>`}
            </section>
        `;

        afficherVuePrincipale(html);
    }

    window.NV_ameliorerCompetence = function (idCompetence) {
        const personnage = NV_normaliserCompetencesPersonnage(Game.data?.personnage);
        if (!personnage) return;

        const ids = NV_idsCompetencesClasse(personnage);
        if (!ids.includes(idCompetence)) {
            ajouterJournal("Competence indisponible pour cette classe.");
            return;
        }

        const niveau = NV_niveauCompetence(idCompetence, personnage);
        const max = NV_maxNiveauCompetence(idCompetence);

        if (niveau >= max) {
            ajouterJournal("Competence deja au niveau maximum.");
            ouvrirCompetencesJoueur();
            return;
        }

        if (Number(personnage.pointsCompetence || 0) <= 0) {
            ajouterJournal("Aucun point de competence disponible.");
            ouvrirCompetencesJoueur();
            return;
        }

        personnage.competencesNiveaux[idCompetence] = niveau + 1;
        personnage.pointsCompetence--;

        const competence = NV_competenceDepuisCache(idCompetence);
        ajouterJournal(`${competence?.nom || idCompetence} niveau ${niveau + 1}`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("competence upgrade");
        ouvrirCompetencesJoueur();
    };

    window.ouvrirCompetencesJoueur = ouvrirCompetencesJoueur;
    window.NV_ouvrirCompetencesClasses = ouvrirCompetencesJoueur;
    window.ouvrirCompetencesClasses = ouvrirCompetencesJoueur;

    document.addEventListener("click", event => {
        const bouton = event.target?.closest?.("#btnCompetencesClasses");
        if (!bouton) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        ouvrirCompetencesJoueur();
    }, true);

    const NV_lancerNouvellePartieOriginal = typeof window.NV_lancerNouvellePartie === "function" ? window.NV_lancerNouvellePartie : null;
    if (NV_lancerNouvellePartieOriginal) {
        window.NV_lancerNouvellePartie = function (...args) {
            const resultat = NV_lancerNouvellePartieOriginal.apply(this, args);
            NV_normaliserCompetencesPersonnage(Game.data?.personnage);
            if (typeof NV_sauvegarderLocalSilencieux === "function") NV_sauvegarderLocalSilencieux();
            return resultat;
        };
    }

    const NV_rafraichirInterfaceOriginal = typeof window.rafraichirInterface === "function" ? window.rafraichirInterface : null;
    if (NV_rafraichirInterfaceOriginal && !NV_rafraichirInterfaceOriginal.__NV_COMPETENCES_PATCH) {
        window.rafraichirInterface = function (...args) {
            NV_normaliserCompetencesPersonnage(Game.data?.personnage);
            return NV_rafraichirInterfaceOriginal.apply(this, args);
        };
        window.rafraichirInterface.__NV_COMPETENCES_PATCH = true;
    }

    function NV_creerBoutonSkillCombat(idCompetence, joueur) {
        const action = trouverCompetenceCombat(idCompetence);
        if (!action) return "";
        const niveau = Number(action.niveauCompetence || 0);
        const max = Number(action.maxNiveau || 5);
        const mana = Number(action.couts?.mana || 0);
        const stamina = Number(action.couts?.stamina || 0);
        const disponible = niveau > 0 && joueur.mana >= mana && joueur.stamina >= stamina;
        const degats = Math.round(Number(action.puissance || 0));

        return `
            <button class="combat-skill-card" ${disponible ? "" : "disabled"} onclick="utiliserCompetenceCombat('${NV_escapeCompetence(idCompetence)}')">
                <img class="combat-skill-card__icon" src="${NV_escapeCompetence(NV_iconeCompetence(action))}" alt="" onerror="this.classList.add('combat-skill-card__icon--missing'); this.removeAttribute('src');">
                <span class="combat-skill-card__name">${NV_escapeCompetence(action.nom || idCompetence)}</span>
                <span class="combat-skill-card__level">${niveau}/${max}</span>
                <small>${degats} deg. · ${NV_escapeCompetence(NV_coutsTexteCompetence(action))}</small>
            </button>
        `;
    }

    window.creerBoutonsActionsCombat = function (combat) {
        const joueur = combat.joueur;
        NV_normaliserCompetencesPersonnage(Game.data?.personnage);
        const idsCompetences = [...new Set(joueur.competences || [])].filter(id => !NV_BASE_ACTIONS_COMPETENCES.includes(id));
        const competencesHTML = idsCompetences.map(id => NV_creerBoutonSkillCombat(id, joueur)).join("");

        return `
            <div class="combat-skill-grid">
                ${competencesHTML || `<p class="combat-skill-empty">Aucune competence de classe.</p>`}
            </div>
            <div class="combat-base-actions">
                <button onclick="attaquerMonstre()"><span>Attaque</span><small>Action simple</small></button>
                <button onclick="defendreCombat()"><span>Defendre</span><small>Reduit les prochains degats</small></button>
                <button onclick="utiliserPotionCombat('potion_soin')"><span>Potion</span><small>Consomme votre tour</small></button>
                <button class="combat-action--equipment" onclick="ouvrirObjetsCombat()"><span>Objets</span><small>Equipement gratuit</small></button>
                <button class="combat-action--flee" onclick="fuirCombat()"><span>Fuir</span><small>Chance : ${calculerChanceFuiteCombat(combat)}%</small></button>
            </div>
        `;
    };

    window.NV_normaliserCompetencesPersonnage = NV_normaliserCompetencesPersonnage;
    window.NV_niveauCompetence = NV_niveauCompetence;
    window.NV_competenceScalee = NV_competenceScalee;

    setTimeout(() => {
        NV_normaliserCompetencesPersonnage(Game.data?.personnage);
    }, 250);
})();
