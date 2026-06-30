/*
NightVenture - Competences Core
- 2 specialisations par classe
- Progression personnage par competence
- Points de competence +1 par niveau
- Cooldowns par tours joueur
- Affichage natif du cap 21
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

    function NV_specialisationsClasse(personnage = Game.data?.personnage) {
        const classe = NV_classePersonnage(personnage);
        return Array.isArray(classe?.specialisations) ? classe.specialisations : [];
    }

    function NV_specialisationActive(personnage = Game.data?.personnage) {
        if (!personnage) return null;
        const classe = NV_classePersonnage(personnage);
        const specialisations = NV_specialisationsClasse(personnage);
        if (specialisations.length === 0) return null;

        let active = specialisations.find(spec => spec.id === personnage.specialisationId);
        if (!active) {
            active = specialisations.find(spec => spec.id === classe?.specialisationDepart) || specialisations[0];
            personnage.specialisationId = active.id;
            personnage.specialisationNom = active.nom;
        }
        return active;
    }

    function NV_idsCompetencesClasse(personnage = Game.data?.personnage) {
        const active = NV_specialisationActive(personnage);
        return Array.isArray(active?.competences) ? active.competences.filter(Boolean) : [];
    }

    function NV_niveauMaxBaseCompetence(idCompetence) {
        const schema = Game.data?.ameliorationsCompetences || {};
        const competence = NV_competenceDepuisCache(idCompetence);
        return Number(schema.niveauMaxBase || competence?.maxNiveau || competence?.niveauMax || 10) || 10;
    }

    function NV_niveauMaxAbsoluCompetences() {
        return Number(Game.data?.ameliorationsCompetences?.niveauMaxAbsolu || 21) || 21;
    }

    function NV_creerEtatProgressionCompetence(idCompetence, ancienEtat, ancienNiveau) {
        const baseMax = NV_niveauMaxBaseCompetence(idCompetence);
        const maxAbsolu = NV_niveauMaxAbsoluCompetences();
        const niveauMaxLu = ancienEtat && typeof ancienEtat === "object" ? ancienEtat.niveauMax : null;
        const niveauLu = ancienEtat && typeof ancienEtat === "object" ? ancienEtat.niveau : ancienNiveau;
        const niveauMax = NV_clampCompetence(niveauMaxLu ?? baseMax, baseMax, maxAbsolu);
        const niveau = NV_clampCompetence(niveauLu ?? 1, 1, niveauMax);

        return {
            id: idCompetence,
            niveau,
            niveauMax,
            masterisee: Boolean(ancienEtat?.masterisee || niveauMax >= maxAbsolu),
            livresUtilises: NV_clampCompetence(ancienEtat?.livresUtilises ?? 0, 0, 5),
            pierresAmeUtilisees: NV_clampCompetence(ancienEtat?.pierresAmeUtilisees ?? 0, 0, 5),
            noyauDemoniaqueUtilise: Boolean(ancienEtat?.noyauDemoniaqueUtilise || niveauMax >= maxAbsolu),
            niveauMaxBase: baseMax,
            niveauMaxAbsolu: maxAbsolu
        };
    }

    function NV_normaliserCompetencesPersonnage(personnage = Game.data?.personnage) {
        if (!personnage) return null;

        personnage.pointsCompetence = Number(personnage.pointsCompetence ?? 0);
        if (!Number.isFinite(personnage.pointsCompetence) || personnage.pointsCompetence < 0) personnage.pointsCompetence = 0;

        const active = NV_specialisationActive(personnage);
        personnage.specialisationId = active?.id || null;
        personnage.specialisationNom = active?.nom || null;

        const idsClasse = NV_idsCompetencesClasse(personnage);
        const anciensProgression = personnage.competencesProgression && typeof personnage.competencesProgression === "object" && !Array.isArray(personnage.competencesProgression)
            ? personnage.competencesProgression
            : {};
        const anciensNiveaux = personnage.competencesNiveaux && typeof personnage.competencesNiveaux === "object" && !Array.isArray(personnage.competencesNiveaux)
            ? personnage.competencesNiveaux
            : {};

        personnage.competencesProgression = {};
        personnage.competencesNiveaux = {};

        idsClasse.forEach(id => {
            const etat = NV_creerEtatProgressionCompetence(id, anciensProgression[id], anciensNiveaux[id]);
            personnage.competencesProgression[id] = etat;
            personnage.competencesNiveaux[id] = etat.niveau;
        });

        personnage.competences = [...new Set([...NV_BASE_ACTIONS_COMPETENCES, ...idsClasse])];
        return personnage;
    }

    function NV_etatCompetencePersonnage(idCompetence, personnage = Game.data?.personnage) {
        NV_normaliserCompetencesPersonnage(personnage);
        return personnage?.competencesProgression?.[idCompetence] || null;
    }

    function NV_niveauCompetence(idCompetence, personnage = Game.data?.personnage) {
        return Number(NV_etatCompetencePersonnage(idCompetence, personnage)?.niveau || 0);
    }

    function NV_niveauMaxCompetencePersonnage(idCompetence, personnage = Game.data?.personnage) {
        return Number(NV_etatCompetencePersonnage(idCompetence, personnage)?.niveauMax || NV_niveauMaxBaseCompetence(idCompetence));
    }

    function NV_maxNiveauCompetence(idCompetence, personnage = Game.data?.personnage) {
        return NV_niveauMaxCompetencePersonnage(idCompetence, personnage);
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
        const etat = NV_etatCompetencePersonnage(idCompetence);

        competence.niveauCompetence = niveauFinal;
        competence.niveau = niveauFinal;
        competence.maxNiveau = etat?.niveauMax || NV_niveauMaxBaseCompetence(idCompetence);
        competence.niveauMaxBase = etat?.niveauMaxBase || NV_niveauMaxBaseCompetence(idCompetence);
        competence.niveauMaxAbsolu = etat?.niveauMaxAbsolu || NV_niveauMaxAbsoluCompetences();
        competence.masterisee = Boolean(etat?.masterisee || competence.maxNiveau >= competence.niveauMaxAbsolu);

        if (progression) {
            competence.puissance = Number(progression.puissance ?? competence.puissance ?? 0);
            competence.multiplicateur = Number(progression.multiplicateur ?? competence.multiplicateur ?? 1);
            competence.coutInitiative = Number(progression.coutInitiative ?? competence.coutInitiative ?? 100);
            competence.bonusCritique = Number(progression.bonusCritique ?? competence.bonusCritique ?? 0);
            competence.bonusEsquive = Number(progression.bonusEsquive ?? competence.bonusEsquive ?? 0);
            competence.couts = { ...(competence.couts || {}), ...(progression.couts || {}) };
        }

        return competence;
    }

    function NV_estCompetenceDeClasse(idCompetence, personnage = Game.data?.personnage) {
        return NV_idsCompetencesClasse(personnage).includes(idCompetence);
    }

    function NV_cooldownsCombat(combat = Game.combat?.actif) {
        if (!combat?.joueur) return {};
        combat.joueur.cooldowns ??= {};
        return combat.joueur.cooldowns;
    }

    function NV_cooldownRestant(idCompetence, combat = Game.combat?.actif) {
        return Math.max(0, Number(NV_cooldownsCombat(combat)[idCompetence] || 0));
    }

    function NV_reduireCooldownsApresAction(idAction) {
        const combat = Game.combat?.actif;
        if (!combat?.joueur || combat.acteurCourant !== "joueur") return;

        const cooldowns = NV_cooldownsCombat(combat);
        Object.keys(cooldowns).forEach(id => {
            if (id === idAction) return;
            cooldowns[id] = Math.max(0, Number(cooldowns[id] || 0) - 1);
            if (cooldowns[id] <= 0) delete cooldowns[id];
        });

        if (NV_estCompetenceDeClasse(idAction)) {
            const competence = NV_competenceDepuisCache(idAction);
            const cooldown = Math.max(0, Number(competence?.cooldownTours || 0));
            if (cooldown > 0) cooldowns[idAction] = cooldown;
        }
    }

    const NV_trouverCompetenceCombatOriginal = typeof window.trouverCompetenceCombat === "function" ? window.trouverCompetenceCombat : null;
    window.trouverCompetenceCombat = function (idCompetence) {
        const competenceBase = NV_trouverCompetenceCombatOriginal ? NV_trouverCompetenceCombatOriginal(idCompetence) : NV_competenceDepuisCache(idCompetence);
        if (!competenceBase) return null;
        if (NV_estCompetenceDeClasse(idCompetence)) return NV_competenceScalee(idCompetence);
        return NV_cloneCompetence(competenceBase);
    };

    window.obtenirCompetencesCombatJoueur = function () {
        const personnage = Game.data?.personnage;
        NV_normaliserCompetencesPersonnage(personnage);
        return [...new Set([...NV_BASE_ACTIONS_COMPETENCES, ...NV_idsCompetencesClasse(personnage)])];
    };

    const NV_utiliserCompetenceCombatOriginal = typeof window.utiliserCompetenceCombat === "function" ? window.utiliserCompetenceCombat : null;
    if (NV_utiliserCompetenceCombatOriginal) {
        window.utiliserCompetenceCombat = function (idCompetence) {
            if (NV_estCompetenceDeClasse(idCompetence)) {
                const restant = NV_cooldownRestant(idCompetence);
                if (restant > 0) {
                    const competence = NV_competenceDepuisCache(idCompetence);
                    if (typeof ajouterLigneCombat === "function") ajouterLigneCombat(`${competence?.nom || idCompetence} recharge encore ${restant} tour(s).`);
                    if (typeof ouvrirCombat === "function") ouvrirCombat();
                    return;
                }
            }
            return NV_utiliserCompetenceCombatOriginal.apply(this, arguments);
        };
    }

    const NV_resoudreActionCombatOriginal = typeof window.resoudreActionCombat === "function" ? window.resoudreActionCombat : null;
    if (NV_resoudreActionCombatOriginal) {
        window.resoudreActionCombat = function (action, options = {}) {
            const combat = Game.combat?.actif;
            const estActionJoueur = combat?.acteurCourant === "joueur";
            const idAction = action?.id || null;
            const resultat = NV_resoudreActionCombatOriginal.apply(this, arguments);
            if (estActionJoueur && idAction) NV_reduireCooldownsApresAction(idAction);
            return resultat;
        };
    }

    window.verifierMonteeNiveau = function () {
        const personnage = Game.data?.personnage;
        if (!personnage) return;

        let coutXp = xpNiveauSuivant();
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

    function NV_objetAmeliorationDepuisId(itemId) {
        return Game.cache.objetsParId?.[itemId] || Game.data.objets?.find(objet => objet?.id === itemId) || null;
    }

    function NV_idLivreCompetence(idCompetence) {
        return Game.cache.itemsAmeliorationCompetences?.livresParCompetence?.[idCompetence]
            || Game.data.ameliorationsCompetences?.livresParCompetence?.[idCompetence]
            || null;
    }

    function NV_nomObjetAmelioration(itemId, fallback) {
        return NV_objetAmeliorationDepuisId(itemId)?.nom || fallback || itemId || "Objet requis";
    }

    function NV_palierActuelCompetence(etat) {
        const max = Number(etat?.niveauMax || 10);
        const maxAbsolu = Number(etat?.niveauMaxAbsolu || NV_niveauMaxAbsoluCompetences());
        const baseMax = Number(etat?.niveauMaxBase || NV_niveauMaxBaseCompetence(etat?.id));

        if (etat?.masterisee || max >= maxAbsolu) return "Masterisee";
        if (max <= baseMax) return "Base";
        if (max <= 15) return "Livres";
        if (max <= 20) return "Pierre d'ame";
        return "Noyau demoniaque";
    }

    function NV_infoProchainPalierCompetence(idCompetence, etat) {
        const max = Number(etat?.niveauMax || 10);
        const maxAbsolu = Number(etat?.niveauMaxAbsolu || NV_niveauMaxAbsoluCompetences());

        if (etat?.masterisee || max >= maxAbsolu) {
            return {
                titre: "Masterisee",
                texte: `Niveau maximum absolu debloque (${maxAbsolu}).`,
                itemId: null
            };
        }

        if (max < 15) {
            const livreId = NV_idLivreCompetence(idCompetence);
            return {
                titre: "Prochain palier : Livre de competence",
                texte: `Objet requis pour augmenter le niveau max jusqu'a 15 : ${NV_nomObjetAmelioration(livreId, "Livre de competence")}.`,
                itemId: livreId
            };
        }

        if (max < 20) {
            return {
                titre: "Prochain palier : Pierre d'ame",
                texte: `Objet requis pour augmenter le niveau max jusqu'a 20 : ${NV_nomObjetAmelioration("pierre_ame", "Pierre d'ame")}.`,
                itemId: "pierre_ame"
            };
        }

        return {
            titre: "Prochain palier : Noyau demoniaque",
            texte: `Objet requis pour Masteriser la competence au niveau ${maxAbsolu} : ${NV_nomObjetAmelioration("noyau_demoniaque", "Noyau demoniaque")}.`,
            itemId: "noyau_demoniaque"
        };
    }

    function NV_creerResumePalierCompetence(idCompetence, etat) {
        const info = NV_infoProchainPalierCompetence(idCompetence, etat);
        const max = Number(etat?.niveauMax || 10);
        const maxAbsolu = Number(etat?.niveauMaxAbsolu || NV_niveauMaxAbsoluCompetences());
        const prochainObjet = info.itemId ? NV_nomObjetAmelioration(info.itemId, info.itemId) : null;

        return `
            <div class="competence-card__tier">
                <span>Palier : ${NV_escapeCompetence(NV_palierActuelCompetence(etat))}</span>
                <span>Limite debloquee : ${max}/${maxAbsolu}</span>
                <span>${prochainObjet ? `Prochain objet : ${NV_escapeCompetence(prochainObjet)}` : NV_escapeCompetence(info.texte)}</span>
            </div>
        `;
    }

    function NV_creerCarteSpecialisation(spec) {
        const personnage = Game.data.personnage;
        const active = personnage.specialisationId === spec.id;
        return `
            <article class="competence-spec-card ${active ? "competence-spec-card--active" : ""}">
                <div>
                    <h3>${NV_escapeCompetence(spec.nom)}</h3>
                    <p>${NV_escapeCompetence(spec.description || "Specialisation de classe.")}</p>
                    <small>${(spec.competences || []).length} competence(s)</small>
                </div>
                <button ${active ? "disabled" : ""} onclick="NV_choisirSpecialisation('${NV_escapeCompetence(spec.id)}')">${active ? "Active" : "Choisir"}</button>
            </article>
        `;
    }

    function NV_creerCarteCompetence(idCompetence) {
        const niveau = NV_niveauCompetence(idCompetence);
        const base = NV_competenceDepuisCache(idCompetence);
        const etat = NV_etatCompetencePersonnage(idCompetence);
        const max = NV_niveauMaxCompetencePersonnage(idCompetence);
        const maxAbsolu = NV_niveauMaxAbsoluCompetences();
        const actuelle = NV_competenceScalee(idCompetence, Math.max(1, niveau));
        const suivante = niveau < max ? NV_competenceScalee(idCompetence, niveau + 1) : null;
        const personnage = Game.data.personnage;
        const peutAmeliorer = niveau < max && Number(personnage.pointsCompetence || 0) > 0;
        const cooldown = Number(base?.cooldownTours || 0);
        const masterisee = Boolean(etat?.masterisee || max >= maxAbsolu);
        const messageProchain = suivante
            ? `Prochain niveau : degats ${Math.round(suivante.puissance || 0)}, ratio x${Number(suivante.multiplicateur || 1).toFixed(2)}, cout ${NV_escapeCompetence(NV_coutsTexteCompetence(suivante))}`
            : masterisee
                ? `Competence Masterisee au niveau ${maxAbsolu}.`
                : "Niveau maximum actuel atteint. Utilise l'objet requis pour debloquer le prochain palier.";

        return `
            <article class="competence-card ${niveau >= max ? "competence-card--max" : ""} ${masterisee ? "competence-card--mastered" : ""}">
                <img class="competence-card__icon" src="${NV_escapeCompetence(NV_iconeCompetence(base))}" alt="" onerror="this.classList.add('competence-card__icon--missing'); this.removeAttribute('src');">
                <div class="competence-card__content">
                    <div class="competence-card__header">
                        <div>
                            <h3>${NV_escapeCompetence(base?.nom || idCompetence)} ${masterisee ? `<span class="competence-card__master-label">Masterisee</span>` : ""}</h3>
                            <p>${NV_escapeCompetence(base?.description || "Competence de classe.")}</p>
                        </div>
                        <strong>Niv. ${niveau}</strong>
                    </div>
                    <div class="competence-card__stats">
                        <span>Degats : ${Math.round(actuelle?.puissance || 0)}</span>
                        <span>Ratio : x${Number(actuelle?.multiplicateur || 1).toFixed(2)}</span>
                        <span>Cout : ${NV_escapeCompetence(NV_coutsTexteCompetence(actuelle))}</span>
                        <span>Recharge : ${cooldown} tour(s)</span>
                    </div>
                    ${NV_creerResumePalierCompetence(idCompetence, etat)}
                    <div class="competence-card__next">${messageProchain}</div>
                    <button ${peutAmeliorer ? "" : "disabled"} onclick="NV_ameliorerCompetence('${NV_escapeCompetence(idCompetence)}')">Ameliorer</button>
                </div>
            </article>
        `;
    }

    function ouvrirCompetencesJoueur() {
        if (!Game.data?.personnage) return;
        changerVue("competences_classes");
        const personnage = NV_normaliserCompetencesPersonnage(Game.data.personnage);
        const classe = NV_classePersonnage(personnage);
        const specialisations = NV_specialisationsClasse(personnage);
        const ids = NV_idsCompetencesClasse(personnage);

        const html = `
            <section class="item-card competence-hero">
                <div>
                    <h2>Competences de ${NV_escapeCompetence(classe?.nom || personnage.classe || "classe")}</h2>
                    <p>Choisis une specialisation, puis ameliore ses competences jusqu'au cap 21 via points, livres, pierres d'ame et noyau demoniaque.</p>
                </div>
                <button onclick="ouvrirExploration()">Retour</button>
            </section>

            <section class="competence-specialisations">
                ${specialisations.map(NV_creerCarteSpecialisation).join("")}
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

    window.NV_choisirSpecialisation = function (specialisationId) {
        const personnage = Game.data?.personnage;
        const specialisations = NV_specialisationsClasse(personnage);
        const spec = specialisations.find(s => s.id === specialisationId);
        if (!personnage || !spec) return;

        personnage.specialisationId = spec.id;
        personnage.specialisationNom = spec.nom;
        personnage.competencesProgression = {};
        personnage.competencesNiveaux = {};
        personnage.competences = [];
        NV_normaliserCompetencesPersonnage(personnage);
        ajouterJournal(`Specialisation choisie : ${spec.nom}`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("specialisation change");
        ouvrirCompetencesJoueur();
    };

    window.NV_ameliorerCompetence = function (idCompetence) {
        const personnage = NV_normaliserCompetencesPersonnage(Game.data?.personnage);
        if (!personnage) return;

        const ids = NV_idsCompetencesClasse(personnage);
        if (!ids.includes(idCompetence)) {
            ajouterJournal("Competence indisponible pour cette specialisation.");
            return;
        }

        const etat = NV_etatCompetencePersonnage(idCompetence, personnage);
        const niveau = Number(etat?.niveau || 0);
        const max = Number(etat?.niveauMax || NV_niveauMaxBaseCompetence(idCompetence));

        if (niveau >= max) {
            ajouterJournal("Competence deja au niveau maximum actuel.");
            ouvrirCompetencesJoueur();
            return;
        }

        if (Number(personnage.pointsCompetence || 0) <= 0) {
            ajouterJournal("Aucun point de competence disponible.");
            ouvrirCompetencesJoueur();
            return;
        }

        etat.niveau = niveau + 1;
        personnage.competencesProgression[idCompetence] = etat;
        personnage.competencesNiveaux[idCompetence] = etat.niveau;
        personnage.pointsCompetence--;

        const competence = NV_competenceDepuisCache(idCompetence);
        ajouterJournal(`${competence?.nom || idCompetence} niveau ${etat.niveau}`);
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
            const personnage = Game.data?.personnage;
            const classe = NV_classePersonnage(personnage);
            personnage.specialisationId = classe?.specialisationDepart || classe?.specialisations?.[0]?.id || null;
            personnage.specialisationNom = classe?.specialisations?.find(s => s.id === personnage.specialisationId)?.nom || null;
            personnage.competencesProgression = {};
            personnage.competencesNiveaux = {};
            NV_normaliserCompetencesPersonnage(personnage);
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
        const cooldown = NV_cooldownRestant(idCompetence);
        const disponible = niveau > 0 && joueur.mana >= mana && joueur.stamina >= stamina && cooldown <= 0;
        const degats = Math.round(Number(action.puissance || 0));
        const cooldownMax = Number(action.cooldownTours || 0);

        return `
            <button class="combat-skill-card ${cooldown > 0 ? "combat-skill-card--cooldown" : ""}" ${disponible ? "" : "disabled"} onclick="utiliserCompetenceCombat('${NV_escapeCompetence(idCompetence)}')">
                <img class="combat-skill-card__icon" src="${NV_escapeCompetence(NV_iconeCompetence(action))}" alt="" onerror="this.classList.add('combat-skill-card__icon--missing'); this.removeAttribute('src');">
                <span class="combat-skill-card__name">${NV_escapeCompetence(action.nom || idCompetence)}</span>
                <span class="combat-skill-card__level">${niveau}/${max}</span>
                ${cooldown > 0 ? `<span class="combat-skill-card__cooldown">${cooldown}</span>` : ""}
                <small>${degats} deg. · ${NV_escapeCompetence(NV_coutsTexteCompetence(action))} · CD ${cooldownMax}</small>
            </button>
        `;
    }

    window.creerBoutonsActionsCombat = function (combat) {
        const joueur = combat.joueur;
        NV_normaliserCompetencesPersonnage(Game.data?.personnage);
        joueur.cooldowns ??= {};
        const idsCompetences = [...new Set(joueur.competences || [])].filter(id => !NV_BASE_ACTIONS_COMPETENCES.includes(id));
        const competencesHTML = idsCompetences.map(id => NV_creerBoutonSkillCombat(id, joueur)).join("");

        return `
            <div class="combat-skill-grid">
                ${competencesHTML || `<p class="combat-skill-empty">Aucune competence de classe.</p>`}
            </div>
            <div class="combat-base-actions">
                <button onclick="attaquerMonstre()"><span>Attaque</span><small>Action simple / recharge les skills</small></button>
                <button onclick="defendreCombat()"><span>Defendre</span><small>Reduit les prochains degats</small></button>
                <button onclick="utiliserPotionCombat('potion_soin')"><span>Potion</span><small>Consomme votre tour</small></button>
                <button class="combat-action--equipment" onclick="ouvrirObjetsCombat()"><span>Objets</span><small>Equipement gratuit</small></button>
                <button class="combat-action--flee" onclick="fuirCombat()"><span>Fuir</span><small>Chance : ${calculerChanceFuiteCombat(combat)}%</small></button>
            </div>
        `;
    };

    window.NV_normaliserCompetencesPersonnage = NV_normaliserCompetencesPersonnage;
    window.NV_niveauCompetence = NV_niveauCompetence;
    window.NV_niveauMaxCompetencePersonnage = NV_niveauMaxCompetencePersonnage;
    window.NV_maxNiveauCompetence = NV_maxNiveauCompetence;
    window.NV_etatCompetencePersonnage = NV_etatCompetencePersonnage;
    window.NV_competenceScalee = NV_competenceScalee;
    window.NV_specialisationsClasse = NV_specialisationsClasse;
    window.NV_specialisationActive = NV_specialisationActive;
    window.NV_cooldownRestant = NV_cooldownRestant;

    setTimeout(() => {
        NV_normaliserCompetencesPersonnage(Game.data?.personnage);
    }, 250);
})();
