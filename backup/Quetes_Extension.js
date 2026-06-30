/*
NightVenture — Quêtes Extension v0.9.3.3 RC1
Ajoute plusieurs types d'objectifs sans réécrire script.js.

À charger APRÈS :
- script.js
- Combats.js
- Gameplay_Integration.js / RC4
*/

(function () {
    "use strict";

    const QX_VERSION = "v0.9.3.3-rc5-arc-rewards-collapsible";

    function QX_hasGame() {
        return typeof Game !== "undefined" && Game && Game.data && Game.data.personnage;
    }

    function QX_personnage() {
        return QX_hasGame() ? Game.data.personnage : null;
    }

    function QX_escape(valeur) {
        if (typeof echapperHTML === "function") return echapperHTML(valeur);
        return String(valeur ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function QX_journal(message) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal(message);
        } else {
            console.log(message);
        }
    }

    function QX_quantiteObjectif(objectif) {
        return Math.max(1, Number(objectif?.quantite ?? 1) || 1);
    }

    function QX_getObjectif(quete) {
        return quete?.objectif || {};
    }

    function QX_getTypeObjectif(quete) {
        return String(QX_getObjectif(quete).type || "posseder").toLowerCase();
    }

    function QX_trouverProgression(idQuete) {
        const personnage = QX_personnage();
        if (!personnage) return null;
        personnage.quetes ??= [];
        return personnage.quetes.find(q => q.id === idQuete) || null;
    }

    function QX_assurerDetailsProgression(progression) {
        progression.details ??= {};
        progression.progression ??= 0;
        progression.etat ??= "en_cours";
        return progression.details;
    }

    function QX_trouverQuete(idQuete) {
        return Game.cache?.quetesParId?.[idQuete] || Game.data?.quetes?.find(q => q.id === idQuete) || null;
    }

    function QX_zoneActuelleId() {
        return QX_personnage()?.zoneActuelle || null;
    }

    function QX_nomZone(idZone) {
        const zone = Game.cache?.zonesParId?.[idZone];
        return zone?.nom || idZone || "zone inconnue";
    }

    function QX_nomPnj(idPnj) {
        const pnj = Game.cache?.pnjParId?.[idPnj];
        return pnj?.nom || idPnj || "PNJ inconnu";
    }

    function QX_nomObjet(idObjet) {
        const objet = Game.cache?.objetsParId?.[idObjet];
        return objet?.nom || idObjet || "objet inconnu";
    }

    function QX_possedeObjet(idObjet) {
        const personnage = QX_personnage();
        if (!personnage) return 0;

        const item =
            personnage.inventaire?.find(entree => entree.id === idObjet);

        return Math.max(0, Number(item?.quantite || 0));
    }

    function QX_estBossVaincu(zoneId) {
        const etat =
            QX_personnage()?.progressionCombat;

        if (!etat?.bossPersistants) return false;

        const entree =
            etat.bossPersistants[zoneId];

        return entree?.vaincu === true;
    }

    function QX_estMiniBossVaincu(zoneId) {
        const etat =
            QX_personnage()?.progressionCombat;

        if (!etat?.miniBossUniques) return false;

        const entree =
            etat.miniBossUniques[zoneId];

        return entree?.vaincu === true;
    }

    function QX_zoneDebloquee(idZone) {
        const zones =
            QX_personnage()?.zonesDebloquees || [];

        return zones.includes(idZone);
    }

    function QX_objectifCorrespondMonstre(objectif, monstre) {
        if (!objectif || !monstre) return false;

        const zoneObjectif =
            objectif.zone || objectif.zoneId || null;

        const zoneMonstre =
            monstre.zoneId || monstre.integrationZoneId || QX_zoneActuelleId();

        if (zoneObjectif && zoneObjectif !== zoneMonstre) {
            return false;
        }

        const idObjectif =
            objectif.monstre || objectif.monstreId || objectif.idMonstre || null;

        if (idObjectif) {
            const idsPossibles = [
                monstre.id,
                monstre.baseId,
                monstre.monstreId,
                monstre.templateId,
                monstre.template,
                monstre.sourceId
            ].filter(Boolean);

            if (!idsPossibles.includes(idObjectif)) {
                return false;
            }
        }

        const typeMenace =
            objectif.typeMenace || objectif.menace || null;

        if (typeMenace && typeMenace !== monstre.typeMenace && typeMenace !== monstre.nomMenace) {
            return false;
        }

        return true;
    }

    function QX_estObjectifAuto(quete) {
        const type = QX_getTypeObjectif(quete);
        return [
            "posseder",
            "collecter",
            "visiter",
            "parler",
            "boss",
            "mini_boss",
            "miniboss",
            "debloquer_zone",
            "zone_debloquee"
        ].includes(type);
    }

    function QX_calculerProgressionAuto(quete, progression) {
        const objectif =
            QX_getObjectif(quete);

        const type =
            QX_getTypeObjectif(quete);

        const quantite =
            QX_quantiteObjectif(objectif);

        if (type === "posseder" || type === "collecter") {
            return Math.min(QX_possedeObjet(objectif.objet), quantite);
        }

        if (type === "visiter") {
            const zone =
                objectif.zone || objectif.zoneId;

            return QX_zoneActuelleId() === zone ? quantite : Math.min(progression.progression || 0, quantite);
        }

        if (type === "parler") {
            return Math.min(progression.progression || 0, quantite);
        }

        if (type === "boss") {
            const zone =
                objectif.zone || objectif.zoneId;

            return QX_estBossVaincu(zone) ? quantite : Math.min(progression.progression || 0, quantite);
        }

        if (type === "mini_boss" || type === "miniboss") {
            const zone =
                objectif.zone || objectif.zoneId;

            return QX_estMiniBossVaincu(zone) ? quantite : Math.min(progression.progression || 0, quantite);
        }

        if (type === "debloquer_zone" || type === "zone_debloquee") {
            const zone =
                objectif.zone || objectif.zoneId;

            return QX_zoneDebloquee(zone) ? quantite : Math.min(progression.progression || 0, quantite);
        }

        return Math.min(progression.progression || 0, quantite);
    }

    function QX_mettreAJourUneQuete(progression) {
        if (!progression || progression.etat !== "en_cours") return;

        const quete =
            QX_trouverQuete(progression.id);

        if (!quete) return;

        const objectif =
            QX_getObjectif(quete);

        const quantite =
            QX_quantiteObjectif(objectif);

        if (QX_estObjectifAuto(quete)) {
            progression.progression =
                QX_calculerProgressionAuto(quete, progression);
        } else {
            progression.progression =
                Math.min(progression.progression || 0, quantite);
        }

        if (progression.progression >= quantite) {
            progression.progression = quantite;
            progression.etat = "a_rendre";
            QX_journal(`✅ Objectif accompli : ${quete.nom}`);
        }
    }

    function QX_verifierProgressionQuetes() {
        const personnage =
            QX_personnage();

        if (!personnage) return;

        personnage.quetes ??= [];

        personnage.quetes.forEach(progression => {
            QX_assurerDetailsProgression(progression);
            QX_mettreAJourUneQuete(progression);
        });

        QX_mettreAJourBadgeNavigationQuetes();
    }

    function QX_decrireObjectif(quete, progression = null) {
        const objectif =
            QX_getObjectif(quete);

        const type =
            QX_getTypeObjectif(quete);

        const quantite =
            QX_quantiteObjectif(objectif);

        const valeur =
            Math.min(Number(progression?.progression || 0), quantite);

        const suffixe =
            `${valeur} / ${quantite}`;

        if (type === "posseder") {
            return `Posséder ${quantite} × ${QX_nomObjet(objectif.objet)} — ${suffixe}`;
        }

        if (type === "collecter") {
            return `Collecter ${quantite} × ${QX_nomObjet(objectif.objet)} — ${suffixe}`;
        }

        if (type === "tuer") {
            if (objectif.zone) {
                return `Vaincre ${quantite} créature(s) dans ${QX_nomZone(objectif.zone)} — ${suffixe}`;
            }

            if (objectif.monstre || objectif.monstreId) {
                return `Vaincre ${quantite} × ${objectif.monstre || objectif.monstreId} — ${suffixe}`;
            }

            return `Vaincre ${quantite} ennemi(s) — ${suffixe}`;
        }

        if (type === "parler") {
            return `Parler à ${QX_nomPnj(objectif.pnj)} — ${suffixe}`;
        }

        if (type === "visiter") {
            return `Visiter ${QX_nomZone(objectif.zone || objectif.zoneId)} — ${suffixe}`;
        }

        if (type === "boss") {
            return `Vaincre le boss de ${QX_nomZone(objectif.zone || objectif.zoneId)} — ${suffixe}`;
        }

        if (type === "mini_boss" || type === "miniboss") {
            return `Vaincre le mini-boss de ${QX_nomZone(objectif.zone || objectif.zoneId)} — ${suffixe}`;
        }

        if (type === "debloquer_zone" || type === "zone_debloquee") {
            return `Débloquer ${QX_nomZone(objectif.zone || objectif.zoneId)} — ${suffixe}`;
        }

        return `Objectif ${type} — ${suffixe}`;
    }

    function QX_estQueteTerminee(idQuete) {
        const personnage =
            QX_personnage();

        if (!personnage || !idQuete) return false;

        const progression =
            personnage.quetes?.find(q => q.id === idQuete);

        return progression?.etat === "terminee";
    }

    function QX_quetesNarrativesDebloquees(quete) {
        /*
            RÈGLE DE DESIGN RC3 :
            - quetesRequises = prérequis narratif.
            - Si ce n'est pas terminé, la quête est cachée.
            - C'est le seul cas où une quête est cachée.
        */

        const requises =
            Array.isArray(quete?.quetesRequises)
                ? quete.quetesRequises
                : [];

        if (requises.length === 0) return true;

        return requises.every(QX_estQueteTerminee);
    }

    function QX_liste(valeur) {
        if (!valeur) return [];
        if (Array.isArray(valeur)) return valeur.filter(Boolean);
        return [valeur].filter(Boolean);
    }

    function QX_regionActuelleId() {
        return QX_personnage()?.regionMondeActuelle || null;
    }

    function QX_estBossZoneVaincu(idZone) {
        return QX_estBossVaincu(idZone);
    }

    function QX_estMiniBossZoneVaincu(idZone) {
        return QX_estMiniBossVaincu(idZone);
    }

    function QX_obtenirConditionsAcceptation(quete) {
        /*
            Conditions non narratives :
            - elles ne cachent pas la quête.
            - elles bloquent seulement le bouton Accepter.
            - elles s'affichent au joueur.
        */

        const personnage =
            QX_personnage();

        const conditions = [];

        if (!personnage || !quete) return conditions;

        if (quete.niveauMin) {
            const requis =
                Number(quete.niveauMin) || 1;

            conditions.push({
                ok: Number(personnage.niveau || 1) >= requis,
                texte: `Atteindre le niveau ${requis}`
            });
        }

        QX_liste(quete.regionRequise || quete.regionsRequises).forEach(idRegion => {
            const region =
                Game.data?.regionsMonde?.find(r => r.id === idRegion);

            conditions.push({
                ok: QX_regionActuelleId() === idRegion,
                texte: `Être dans la région : ${region?.nom || idRegion}`
            });
        });

        QX_liste(quete.zoneActuelleRequise || quete.zonesActuellesRequises).forEach(idZone => {
            conditions.push({
                ok: QX_zoneActuelleId() === idZone,
                texte: `Être dans la zone : ${QX_nomZone(idZone)}`
            });
        });

        QX_liste(quete.zoneDebloqueeRequise || quete.zonesDebloqueesRequises).forEach(idZone => {
            conditions.push({
                ok: QX_zoneDebloquee(idZone),
                texte: `Débloquer la zone : ${QX_nomZone(idZone)}`
            });
        });

        QX_liste(quete.zoneVisiteeRequise || quete.zonesVisiteesRequises).forEach(idZone => {
            const visitees =
                personnage.zonesVisitees || [];

            conditions.push({
                ok: visitees.includes(idZone) || QX_zoneActuelleId() === idZone,
                texte: `Visiter la zone : ${QX_nomZone(idZone)}`
            });
        });

        QX_liste(quete.bossVaincuRequis || quete.bossVaincusRequis).forEach(idZone => {
            conditions.push({
                ok: QX_estBossZoneVaincu(idZone),
                texte: `Vaincre le boss de : ${QX_nomZone(idZone)}`
            });
        });

        QX_liste(quete.miniBossVaincuRequis || quete.miniBossVaincusRequis || quete.minibossVaincuRequis).forEach(idZone => {
            conditions.push({
                ok: QX_estMiniBossZoneVaincu(idZone),
                texte: `Vaincre le mini-boss de : ${QX_nomZone(idZone)}`
            });
        });

        QX_liste(quete.objetsRequis || quete.objetRequis).forEach(entree => {
            const idObjet =
                typeof entree === "string"
                    ? entree
                    : entree.id || entree.objet;

            const quantite =
                typeof entree === "string"
                    ? 1
                    : Number(entree.quantite || 1);

            conditions.push({
                ok: QX_possedeObjet(idObjet) >= quantite,
                texte: `Posséder ${quantite} × ${QX_nomObjet(idObjet)}`
            });
        });

        return conditions;
    }

    function QX_conditionsAcceptationOK(quete) {
        return QX_obtenirConditionsAcceptation(quete)
            .every(condition => condition.ok);
    }

    function QX_conditionsManquantes(quete) {
        return QX_obtenirConditionsAcceptation(quete)
            .filter(condition => !condition.ok);
    }

    function QX_queteVisible(quete) {
        /*
            RC3 :
            - Une quête sans quetesRequises est visible, même bloquée.
            - Une quête avec quetesRequises reste cachée tant que la quête précédente n'est pas terminée.
            - Les autres conditions n'affectent PAS la visibilité.
        */

        if (!QX_personnage() || !quete) return false;

        return QX_quetesNarrativesDebloquees(quete);
    }

    function QX_queteAcceptable(quete) {
        if (!QX_queteVisible(quete)) return false;
        return QX_conditionsAcceptationOK(quete);
    }

    function QX_creerBlocConditionsQuete(quete) {
        const conditions =
            QX_obtenirConditionsAcceptation(quete);

        if (conditions.length === 0) return "";

        const toutesOK =
            conditions.every(condition => condition.ok);

        return `
            <div class="qx-conditions-quete ${toutesOK ? "qx-conditions-quete--ok" : "qx-conditions-quete--bloquee"}">
                <p><strong>${toutesOK ? "Conditions remplies" : "Conditions pour débloquer"}</strong></p>

                <ul>
                    ${conditions.map(condition => `
                        <li class="${condition.ok ? "qx-condition-ok" : "qx-condition-ko"}">
                            ${condition.ok ? "✅" : "🔒"} ${QX_escape(condition.texte)}
                        </li>
                    `).join("")}
                </ul>
            </div>
        `;
    }

    function QX_nomEtatQuete(etat) {
        if (etat === "bloquee") {
            return `<span class="etat-bloquee">🔒 Bloquée</span>`;
        }

        if (typeof nomEtatQuete === "function") {
            return nomEtatQuete(etat);
        }

        return etat;
    }

    function QX_donnerRecompense(quete) {
        const personnage =
            QX_personnage();

        if (!personnage) return;

        const recompense =
            quete.recompense || {};

        const xp =
            Number(recompense.xp || 0);

        const or =
            Number(recompense.or || 0);

        personnage.xp =
            (Number(personnage.xp) || 0) + xp;

        personnage.or =
            (Number(personnage.or) || 0) + or;

        if (Array.isArray(recompense.objets)) {
            recompense.objets.forEach(item => {
                if (!item?.id) return;
                if (typeof ajouterObjetInventaire === "function") {
                    ajouterObjetInventaire(item.id, item.quantite ?? 1);
                }
            });
        } else if (recompense.objet && typeof ajouterObjetInventaire === "function") {
            ajouterObjetInventaire(recompense.objet, recompense.quantite ?? 1);
        }

        QX_journal(`✅ Quête terminée ! : ${quete.nom}`);
        if (xp > 0) QX_journal(`⭐ +${xp} XP`);
        if (or > 0) QX_journal(`🟡 +${or} or`);

        if (Array.isArray(recompense.objets)) {
            recompense.objets.forEach(item => {
                if (!item?.id || !item.quantite) return;
                QX_journal(`📦 ${QX_nomObjet(item.id)} x${item.quantite}`);
            });
        }
    }

    function QX_remettreQuete(idQuete) {
        const personnage =
            QX_personnage();

        if (!personnage) return;

        const progression =
            personnage.quetes?.find(q => q.id === idQuete);

        if (!progression || progression.etat !== "a_rendre") return;

        const quete =
            QX_trouverQuete(idQuete);

        if (!quete) return;

        const objectif =
            QX_getObjectif(quete);

        const type =
            QX_getTypeObjectif(quete);

        if ((type === "posseder" || type === "collecter") && objectif.consommer) {
            if (typeof retirerObjetInventaire === "function") {
                retirerObjetInventaire(objectif.objet, QX_quantiteObjectif(objectif));
                QX_journal(`${QX_quantiteObjectif(objectif)} ${QX_nomObjet(objectif.objet)} remis au PNJ.`);
            }
        }

        progression.etat = "terminee";
        progression.dateTerminee = {
            jour: personnage.jour ?? null,
            heure: personnage.heure ?? null,
            zone: personnage.zoneActuelle ?? null
        };

        QX_donnerRecompense(quete);

        QX_verifierRecompensesArcs();

        if (typeof verifierNiveau === "function") {
            verifierNiveau();
        } else if (typeof rafraichirInterface === "function") {
            rafraichirInterface();
        }
    }

    function QX_accepterQuete(idQuete) {
        const personnage =
            QX_personnage();

        if (!personnage) return;

        personnage.quetes ??= [];

        const deja =
            personnage.quetes.find(q => q.id === idQuete);

        if (deja) return;

        const quete =
            QX_trouverQuete(idQuete);

        if (!quete) return;

        if (!QX_queteVisible(quete)) {
            QX_journal("🔒 Cette quête n'est pas encore disponible.");
            return;
        }

        if (!QX_queteAcceptable(quete)) {
            QX_journal(`🔒 Quête bloquée : ${quete.nom}`);

            QX_conditionsManquantes(quete).forEach(condition => {
                QX_journal(`   - ${condition.texte}`);
            });

            return;
        }

        personnage.quetes.push({
            id: idQuete,
            progression: 0,
            etat: "en_cours",
            details: {},
            dateAcceptation: {
                jour: personnage.jour ?? null,
                heure: personnage.heure ?? null,
                zone: personnage.zoneActuelle ?? null
            }
        });

        QX_verifierProgressionQuetes();
        QX_journal(`📜 Nouvelle quête : ${quete.nom}`);

        if (typeof rafraichirInterface === "function") {
            rafraichirInterface();
        }
    }

    function QX_signalerMonstreTue(monstre) {
        const personnage =
            QX_personnage();

        if (!personnage || !monstre) return;

        personnage.quetes ??= [];

        personnage.quetes.forEach(progression => {
            if (progression.etat !== "en_cours") return;

            const quete =
                QX_trouverQuete(progression.id);

            if (!quete) return;

            const objectif =
                QX_getObjectif(quete);

            const type =
                QX_getTypeObjectif(quete);

            const quantite =
                QX_quantiteObjectif(objectif);

            QX_assurerDetailsProgression(progression);

            if (type === "tuer" && QX_objectifCorrespondMonstre(objectif, monstre)) {
                progression.progression =
                    Math.min((Number(progression.progression) || 0) + 1, quantite);

                QX_journal(`📜 Progression quête : ${quete.nom} (${progression.progression}/${quantite})`);
            }

            if (type === "boss") {
                const zone =
                    objectif.zone || objectif.zoneId;

                const estBoss =
                    monstre.integrationType === "boss_persistant" ||
                    monstre.typeMenace === "boss" ||
                    monstre.nomMenace === "boss";

                if (estBoss && (!zone || zone === (monstre.zoneId || QX_zoneActuelleId()))) {
                    progression.progression = quantite;
                }
            }

            if (type === "mini_boss" || type === "miniboss") {
                const zone =
                    objectif.zone || objectif.zoneId;

                const estMiniBoss =
                    monstre.integrationType === "mini_boss_unique" ||
                    monstre.typeMenace === "mini_boss" ||
                    monstre.nomMenace === "mini_boss";

                if (estMiniBoss && (!zone || zone === (monstre.zoneId || QX_zoneActuelleId()))) {
                    progression.progression = quantite;
                }
            }

            QX_mettreAJourUneQuete(progression);
        });

        if (typeof ouvrirQuetes === "function" && Game.ui?.vueActive === "quetes") {
            ouvrirQuetes();
        }
    }

    function QX_signalerParler(idPnj) {
        const personnage =
            QX_personnage();

        if (!personnage || !idPnj) return;

        personnage.quetes ??= [];

        personnage.quetes.forEach(progression => {
            if (progression.etat !== "en_cours") return;

            const quete =
                QX_trouverQuete(progression.id);

            if (!quete) return;

            const objectif =
                QX_getObjectif(quete);

            const type =
                QX_getTypeObjectif(quete);

            if (type !== "parler") return;

            if (objectif.pnj && objectif.pnj !== idPnj) return;

            const quantite =
                QX_quantiteObjectif(objectif);

            progression.progression =
                Math.min((Number(progression.progression) || 0) + 1, quantite);

            QX_mettreAJourUneQuete(progression);
        });
    }

    function QX_signalerVisiter(idZone) {
        const personnage =
            QX_personnage();

        if (!personnage || !idZone) return;

        personnage.zonesVisitees ??= [];
        if (!personnage.zonesVisitees.includes(idZone)) {
            personnage.zonesVisitees.push(idZone);
        }

        personnage.quetes ??= [];

        personnage.quetes.forEach(progression => {
            if (progression.etat !== "en_cours") return;

            const quete =
                QX_trouverQuete(progression.id);

            if (!quete) return;

            const objectif =
                QX_getObjectif(quete);

            const type =
                QX_getTypeObjectif(quete);

            if (type !== "visiter") return;

            const zoneObjectif =
                objectif.zone || objectif.zoneId;

            if (zoneObjectif && zoneObjectif !== idZone) return;

            progression.progression =
                QX_quantiteObjectif(objectif);

            QX_mettreAJourUneQuete(progression);
        });
    }


    /* --------------------------
       RC2 — Quest Tracker & PNJ Indicators
       -------------------------- */

    function QX_obtenirQuetesPnj(idPnj) {
        const personnage =
            QX_personnage();

        if (!personnage || !idPnj) return [];

        return (Game.data.quetes || [])
            .filter(quete => quete.pnj === idPnj)
            .filter(QX_queteVisible)
            .map(quete => ({
                quete,
                progression: QX_trouverProgression(quete.id)
            }));
    }

    function QX_statutPnjQuetes(idPnj) {
        const donnees =
            QX_obtenirQuetesPnj(idPnj);

        if (donnees.some(d => d.progression?.etat === "a_rendre")) {
            return {
                niveau: 4,
                icone: "✅",
                texte: "Quête à rendre",
                classe: "qx-pnj-badge--rendre"
            };
        }

        if (donnees.some(d => !d.progression && QX_queteAcceptable(d.quete))) {
            return {
                niveau: 3,
                icone: "📜",
                texte: "Quête disponible",
                classe: "qx-pnj-badge--disponible"
            };
        }

        if (donnees.some(d => d.progression?.etat === "en_cours")) {
            return {
                niveau: 2,
                icone: "🔄",
                texte: "Quête en cours",
                classe: "qx-pnj-badge--cours"
            };
        }

        if (donnees.some(d => !d.progression && !QX_queteAcceptable(d.quete))) {
            return {
                niveau: 1,
                icone: "🔒",
                texte: "Quête bloquée",
                classe: "qx-pnj-badge--bloquee"
            };
        }

        if (donnees.length > 0 && donnees.every(d => d.progression?.etat === "terminee")) {
            return {
                niveau: 0,
                icone: "🏆",
                texte: "Quêtes terminées",
                classe: "qx-pnj-badge--terminee"
            };
        }

        return null;
    }

    function QX_creerBadgePnjQuete(idPnj) {
        const statut =
            QX_statutPnjQuetes(idPnj);

        if (!statut) return "";

        return `
            <div class="qx-pnj-badge ${statut.classe}" title="${QX_escape(statut.texte)}">
                ${statut.icone} ${QX_escape(statut.texte)}
            </div>
        `;
    }

    function QX_queteLieeZone(quete, progression, zoneId) {
        if (!quete || !zoneId) return false;

        const objectif =
            QX_getObjectif(quete);

        const type =
            QX_getTypeObjectif(quete);

        const zoneObjectif =
            objectif.zone || objectif.zoneId || null;

        if (["tuer", "visiter", "boss", "mini_boss", "miniboss"].includes(type)) {
            return zoneObjectif === zoneId;
        }

        if (["debloquer_zone", "zone_debloquee"].includes(type)) {
            return zoneObjectif === zoneId;
        }

        const pnjQuete =
            quete.pnj ? Game.cache?.pnjParId?.[quete.pnj] : null;

        const zone =
            Game.cache?.zonesParId?.[zoneId];

        if (progression?.etat === "a_rendre" && zone?.pnj?.includes(quete.pnj)) {
            return true;
        }

        if (!progression && zone?.pnj?.includes(quete.pnj)) {
            return true;
        }

        return false;
    }

    function QX_obtenirQuetesLieesZoneActuelle() {
        const personnage =
            QX_personnage();

        if (!personnage) return [];

        const zoneId =
            QX_zoneActuelleId();

        const resultats = [];

        (Game.data.quetes || []).forEach(quete => {
            if (!QX_queteVisible(quete)) return;

            const progression =
                QX_trouverProgression(quete.id);

            // Le tracker d'exploration montre :
            // - quêtes actives liées à la zone
            // - quêtes à rendre dans la zone
            // - quêtes disponibles chez PNJ présents
            // - évite d'encombrer avec les quêtes terminées
            if (progression?.etat === "terminee") return;

            if (QX_queteLieeZone(quete, progression, zoneId)) {
                resultats.push({ quete, progression });
            }
        });

        const priorite = entree => {
            if (entree.progression?.etat === "a_rendre") return 0;
            if (!entree.progression) return 1;
            if (entree.progression?.etat === "en_cours") return 2;
            return 3;
        };

        return resultats.sort((a, b) => priorite(a) - priorite(b));
    }

    function QX_classeEtatQuete(etat) {
        if (etat === "a_rendre") return "qx-quete--rendre";
        if (etat === "en_cours") return "qx-quete--cours";
        if (etat === "terminee") return "qx-quete--terminee";
        return "qx-quete--disponible";
    }

    function QX_texteActionZone(quete, progression) {
        if (!progression) {
            const pnj =
                Game.cache?.pnjParId?.[quete.pnj];

            return pnj
                ? `Disponible auprès de ${pnj.nom || quete.pnj}`
                : "Quête disponible";
        }

        if (progression.etat === "a_rendre") {
            const pnj =
                Game.cache?.pnjParId?.[quete.pnj];

            return pnj
                ? `À rendre à ${pnj.nom || quete.pnj}`
                : "À rendre";
        }

        if (progression.etat === "en_cours") {
            return QX_decrireObjectif(quete, progression);
        }

        return "Terminée";
    }

    function QX_creerMiniCarteQueteZone(quete, progression) {
        const etat =
            progression?.etat || "disponible";

        const objectif =
            QX_escape(QX_texteActionZone(quete, progression));

        let bouton = "";

        if (!progression) {
            bouton = `
                <button onclick="accepterQuete('${quete.id}')">
                    Accepter
                </button>
            `;
        } else if (progression.etat === "a_rendre") {
            bouton = `
                <button onclick="remettreQuete('${quete.id}')">
                    Réclamer
                </button>
            `;
        }

        return `
            <article class="qx-zone-quete ${QX_classeEtatQuete(etat)}">
                <div class="qx-zone-quete__haut">
                    <strong>📜 ${QX_escape(quete.nom)}</strong>
                    <span>${nomEtatQuete(etat)}</span>
                </div>

                <p>${objectif}</p>

                ${bouton ? `<div class="qx-zone-quete__actions">${bouton}</div>` : ""}
            </article>
        `;
    }

    function QX_creerTrackerZoneActuelle() {
        const quetes =
            QX_obtenirQuetesLieesZoneActuelle();

        const zone =
            Game.cache?.zonesParId?.[QX_zoneActuelleId()];

        if (quetes.length === 0) {
            return `
                <div class="item-card qx-zone-tracker">
                    <h3>📜 Quêtes liées à cette zone</h3>
                    <p class="palette-vide">
                        Aucune quête active ou disponible ici pour le moment.
                    </p>
                </div>
            `;
        }

        return `
            <div class="item-card qx-zone-tracker">
                <h3>📜 Quêtes liées à cette zone</h3>
                <p>
                    Zone actuelle :
                    <strong>${QX_escape(zone?.nom || QX_zoneActuelleId())}</strong>
                </p>

                <div class="qx-zone-quetes-liste">
                    ${quetes.map(entree =>
                        QX_creerMiniCarteQueteZone(entree.quete, entree.progression)
                    ).join("")}
                </div>
            </div>
        `;
    }

    function QX_compterQuetesParEtat() {
        const personnage =
            QX_personnage();

        const compteur = {
            a_rendre: 0,
            en_cours: 0,
            terminee: 0,
            total: 0
        };

        if (!personnage?.quetes) return compteur;

        personnage.quetes.forEach(progression => {
            compteur.total++;
            if (progression.etat === "a_rendre") compteur.a_rendre++;
            if (progression.etat === "en_cours") compteur.en_cours++;
            if (progression.etat === "terminee") compteur.terminee++;
        });

        return compteur;
    }

    function QX_mettreAJourBadgeNavigationQuetes() {
        const bouton =
            document.getElementById("btnQuetes");

        if (!bouton) return;

        const compteur =
            QX_compterQuetesParEtat();

        const texteBase =
            "📜 Quêtes";

        if (compteur.a_rendre > 0) {
            bouton.textContent =
                `${texteBase} ✅${compteur.a_rendre}`;
            bouton.title =
                `${compteur.a_rendre} quête(s) à rendre`;
            return;
        }

        if (compteur.en_cours > 0) {
            bouton.textContent =
                `${texteBase} 🔄${compteur.en_cours}`;
            bouton.title =
                `${compteur.en_cours} quête(s) en cours`;
            return;
        }

        bouton.textContent =
            texteBase;

        bouton.title =
            "Quêtes";
    }

    function QX_grouperJournalQuetes() {
        const personnage =
            QX_personnage();

        const groupes = {
            a_rendre: [],
            en_cours: [],
            terminee: []
        };

        if (!personnage?.quetes) return groupes;

        personnage.quetes.forEach(progression => {
            const quete =
                QX_trouverQuete(progression.id);

            if (!quete) return;

            if (progression.etat === "a_rendre") groupes.a_rendre.push({ quete, progression });
            else if (progression.etat === "terminee") groupes.terminee.push({ quete, progression });
            else groupes.en_cours.push({ quete, progression });
        });

        return groupes;
    }

    function QX_creerSectionJournalQuetes(titre, entrees, vide) {
        return `
            <section class="qx-journal-section">
                <h3>${titre}</h3>

                ${
                    entrees.length === 0
                        ? `<div class="item-card"><p class="palette-vide">${vide}</p></div>`
                        : entrees.map(entree =>
                            QX_creerCarteQuete(entree.quete, entree.progression, null)
                        ).join("")
                }
            </section>
        `;
    }

    function QX_patchExplorationTracker() {
        if (typeof ouvrirExploration !== "function" || ouvrirExploration.__QX_RC2_tracker) return;

        const originalOuvrirExploration =
            ouvrirExploration;

        ouvrirExploration = function () {
            originalOuvrirExploration();

            const conteneur =
                document.getElementById("vuePrincipale");

            if (!conteneur) return;

            if (document.getElementById("qxZoneTracker")) return;

            const wrapper =
                document.createElement("div");

            wrapper.id =
                "qxZoneTracker";

            wrapper.innerHTML =
                QX_creerTrackerZoneActuelle();

            // On place le tracker au début de la vue, juste après la carte de zone.
            const deuxiemeElement =
                conteneur.children?.[1] || null;

            if (deuxiemeElement) {
                conteneur.insertBefore(wrapper, deuxiemeElement);
            } else {
                conteneur.appendChild(wrapper);
            }

            QX_mettreAJourBadgeNavigationQuetes();
        };

        ouvrirExploration.__QX_RC2_tracker = true;
    }

    function QX_patchPnjIndicators() {
        if (typeof creerLignePnjExploration !== "function" || creerLignePnjExploration.__QX_RC2_pnj) return;

        creerLignePnjExploration = function (personnagePnj) {
            const selectionne =
                Game.ui.pnjSelectionne === personnagePnj.id;

            const iconeRole =
                obtenirIconeRolePnj(personnagePnj);

            const nom =
                QX_escape(personnagePnj.nom || "Personnage inconnu");

            const role =
                QX_escape(personnagePnj.role || personnagePnj.type || "Habitant");

            const dialogue =
                QX_escape(personnagePnj.dialogue || "Ce personnage semble avoir quelque chose à dire.");

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

                                ${QX_creerBadgePnjQuete(personnagePnj.id)}
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
        };

        creerLignePnjExploration.__QX_RC2_pnj = true;
    }

    function QX_patchActionsPnjResume() {
        if (typeof creerActionsPnj !== "function" || creerActionsPnj.__QX_RC2_actions) return;

        const originalCreerActionsPnj =
            creerActionsPnj;

        creerActionsPnj = function (personnagePnj) {
            const htmlOriginal =
                originalCreerActionsPnj(personnagePnj);

            if (!personnagePnj) return htmlOriginal;

            const donnees =
                QX_obtenirQuetesPnj(personnagePnj.id);

            if (donnees.length === 0) return htmlOriginal;

            const resume =
                donnees
                    .filter(entree => entree.progression?.etat !== "terminee" || donnees.length <= 3)
                    .slice(0, 4)
                    .map(entree => {
                        const etat =
                            entree.progression?.etat || "disponible";

                        return `
                            <div class="qx-pnj-quete-mini ${QX_classeEtatQuete(etat)}">
                                <span>${nomEtatQuete(etat)}</span>
                                <strong>${QX_escape(entree.quete.nom)}</strong>
                            </div>
                        `;
                    })
                    .join("");

            return `
                <div class="qx-pnj-quetes-resume">
                    ${resume}
                </div>
                ${htmlOriginal}
            `;
        };

        creerActionsPnj.__QX_RC2_actions = true;
    }


    function QX_patchActionsPnjQuestlines() {
        if (typeof creerActionsPnj !== "function" || creerActionsPnj.__QX_RC4_questlines) return;

        const originalCreerActionsPnj =
            creerActionsPnj;

        creerActionsPnj = function (personnagePnj) {
            const htmlOriginal =
                originalCreerActionsPnj(personnagePnj);

            if (!personnagePnj) return htmlOriginal;

            const resume =
                QX_creerResumeQuestlinePnj(personnagePnj.id);

            if (!resume) return htmlOriginal;

            return `
                ${resume}
                ${htmlOriginal}
            `;
        };

        creerActionsPnj.__QX_RC4_questlines = true;
    }

    function QX_injecterStylesRC2() {
        if (document.getElementById("qxStylesRC2")) return;

        const style =
            document.createElement("style");

        style.id =
            "qxStylesRC2";

        style.textContent = `
            .qx-zone-tracker {
                border-color: rgba(245, 211, 122, 0.35);
                box-shadow:
                    0 0 12px rgba(245, 211, 122, 0.10),
                    inset 0 0 14px rgba(245, 211, 122, 0.03);
            }

            .qx-zone-quetes-liste {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-top: 10px;
            }

            .qx-zone-quete {
                padding: 10px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.16);
                border-left: 4px solid rgba(245, 211, 122, 0.45);
                border-radius: var(--radius-md, 8px);
            }

            .qx-zone-quete__haut {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                flex-wrap: wrap;
            }

            .qx-zone-quete__haut strong {
                color: var(--gold, #f5d37a);
            }

            .qx-zone-quete__actions {
                margin-top: 8px;
            }

            .qx-zone-quete__actions button {
                width: auto;
                padding: 8px 12px;
            }

            .qx-quete--rendre {
                border-left-color: var(--success, #45d64f);
            }

            .qx-quete--cours {
                border-left-color: var(--info, #4aa3ff);
            }

            .qx-quete--terminee {
                border-left-color: var(--legendary, #ff9d00);
                opacity: 0.82;
            }

            .qx-quete--disponible {
                border-left-color: var(--gold, #f5d37a);
            }

            .qx-pnj-badge {
                display: inline-flex;
                align-items: center;
                gap: 5px;
                margin-top: 6px;
                padding: 3px 8px;
                border-radius: 999px;
                font-size: 0.75rem;
                font-weight: bold;
                line-height: 1.2;
                background: rgba(0, 0, 0, 0.22);
                border: 1px solid rgba(245, 211, 122, 0.25);
            }

            .qx-pnj-badge--rendre {
                color: var(--success, #45d64f);
                border-color: rgba(69, 214, 79, 0.45);
            }

            .qx-pnj-badge--disponible {
                color: var(--gold, #f5d37a);
                border-color: rgba(245, 211, 122, 0.45);
            }

            .qx-pnj-badge--cours {
                color: var(--info, #4aa3ff);
                border-color: rgba(74, 163, 255, 0.45);
            }

            .qx-pnj-badge--terminee {
                color: var(--legendary, #ff9d00);
                border-color: rgba(255, 157, 0, 0.45);
            }

            .qx-pnj-badge--bloquee {
                color: #bcbcbc;
                border-color: rgba(188, 188, 188, 0.35);
                opacity: 0.85;
            }

            .etat-bloquee {
                color: #bcbcbc;
                font-weight: bold;
            }

            .qx-carte-quete-bloquee {
                opacity: 0.88;
                border-color: rgba(188, 188, 188, 0.35);
            }

            .qx-conditions-quete {
                margin: 10px 0;
                padding: 10px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.16);
                border-radius: var(--radius-md, 8px);
            }

            .qx-conditions-quete p {
                margin-top: 0;
                color: var(--gold, #f5d37a);
            }

            .qx-conditions-quete ul {
                margin-bottom: 0;
            }

            .qx-condition-ok {
                color: var(--success, #45d64f);
            }

            .qx-condition-ko {
                color: var(--text-muted, #bcbcbc);
            }

            .qx-arc-section {
                margin-bottom: 16px;
                padding: 12px;
                background: rgba(0, 0, 0, 0.12);
                border: 1px solid rgba(245, 211, 122, 0.20);
                border-radius: var(--radius-lg, 10px);
            }

            .qx-arc-header {
                display: grid;
                grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
                gap: 12px;
                align-items: start;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(245, 211, 122, 0.14);
            }

            .qx-arc-header h3 {
                margin: 0 0 4px;
                color: var(--gold, #f5d37a);
            }

            .qx-arc-header p {
                margin: 0;
                color: var(--text-muted, #bcbcbc);
                font-size: 0.92rem;
            }

            .qx-arc-resume {
                padding: 8px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: var(--radius-md, 8px);
            }

            .qx-arc-resume__progression {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 6px;
            }

            .qx-arc-resume__progression span {
                color: var(--text-muted, #bcbcbc);
                font-size: 0.85rem;
            }

            .qx-arc-resume__progression strong {
                color: var(--gold, #f5d37a);
            }

            .qx-arc-barre {
                height: 8px;
                overflow: hidden;
                background: #111;
                border: 1px solid rgba(245, 211, 122, 0.18);
                border-radius: 999px;
            }

            .qx-arc-barre__remplissage {
                height: 100%;
                background: linear-gradient(to right, var(--gold-dark, #7c6236), var(--gold, #f5d37a));
                transition: width 0.25s ease;
            }

            .qx-arc-resume p {
                margin-top: 6px;
                color: var(--text-muted, #bcbcbc);
                font-size: 0.82rem;
            }

            .qx-arc-recompense-statut {
                color: var(--gold, #f5d37a) !important;
                font-weight: bold;
            }

            .qx-arc-section--details {
                display: block;
                padding: 0;
                overflow: hidden;
            }

            .qx-arc-summary {
                display: block;
                list-style: none;
                cursor: pointer;
                padding: 12px;
                user-select: none;
                transition: background 0.18s ease;
            }

            .qx-arc-summary::-webkit-details-marker {
                display: none;
            }

            .qx-arc-summary:hover {
                background: rgba(245, 211, 122, 0.045);
            }

            .qx-arc-summary .qx-arc-header {
                margin-bottom: 0;
                padding-bottom: 0;
                border-bottom: 0;
            }

            .qx-arc-summary .qx-arc-header h3::before {
                content: "▶ ";
                display: inline-block;
                transition: transform 0.18s ease;
                color: var(--gold, #f5d37a);
            }

            .qx-arc-section--details[open] .qx-arc-summary .qx-arc-header h3::before {
                content: "▼ ";
            }

            .qx-arc-section--details > .qx-arc-liste {
                padding: 0 12px 12px;
            }

            .qx-arc-section--details:not([open]) {
                opacity: 0.92;
            }

            .qx-arc-liste {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .qx-quete-card-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 10px;
                flex-wrap: wrap;
            }

            .qx-quete-card-header h3 {
                margin-bottom: 4px;
            }

            .qx-quete-card-meta {
                display: flex;
                gap: 6px;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .qx-quete-card-meta span {
                padding: 3px 8px;
                color: var(--text-muted, #bcbcbc);
                background: rgba(0, 0, 0, 0.24);
                border: 1px solid rgba(245, 211, 122, 0.14);
                border-radius: 999px;
                font-size: 0.78rem;
            }

            .qx-pnj-arcs {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin-bottom: 10px;
            }

            .qx-pnj-arc {
                padding: 8px;
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(245, 211, 122, 0.14);
                border-left: 3px solid var(--gold, #f5d37a);
                border-radius: var(--radius-md, 8px);
            }

            .qx-pnj-arc__titre {
                color: var(--gold, #f5d37a);
                font-weight: bold;
                margin-bottom: 6px;
            }

            .qx-pnj-arc__categorie {
                margin-top: 6px;
            }

            .qx-pnj-arc__categorie > span {
                display: inline-flex;
                padding: 2px 7px;
                margin-bottom: 5px;
                color: var(--text-muted, #bcbcbc);
                background: rgba(0, 0, 0, 0.18);
                border: 1px solid rgba(255, 255, 255, 0.08);
                border-radius: 999px;
                font-size: 0.75rem;
            }

            .qx-pnj-arc__liste {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }

            .qx-quete-arc-ligne {
                display: grid;
                grid-template-columns: 30px auto minmax(0, 1fr);
                align-items: center;
                gap: 6px;
                padding: 5px 6px;
                background: rgba(255, 255, 255, 0.025);
                border: 1px solid rgba(245, 211, 122, 0.08);
                border-radius: var(--radius-md, 8px);
                font-size: 0.83rem;
            }

            .qx-quete-arc-ligne--bloquee {
                opacity: 0.80;
            }

            .qx-quete-arc-ligne__ordre {
                color: var(--gold, #f5d37a);
                font-weight: bold;
                text-align: center;
            }

            .qx-quete-arc-ligne__etat {
                white-space: nowrap;
            }

            .qx-quete-arc-ligne strong {
                color: var(--text, #e8dcc2);
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }

            @media (max-width: 850px) {
                .qx-arc-header {
                    grid-template-columns: 1fr;
                }

                .qx-quete-card-meta {
                    justify-content: flex-start;
                }
            }

            @media (max-width: 700px) {
                .qx-quete-arc-ligne {
                    grid-template-columns: 24px 1fr;
                }

                .qx-quete-arc-ligne__etat {
                    grid-column: 2;
                }

                .qx-quete-arc-ligne strong {
                    grid-column: 2;
                    white-space: normal;
                }
            }

            .qx-pnj-quetes-resume {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 10px;
            }

            .qx-pnj-quete-mini {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                padding: 6px 8px;
                background: rgba(0, 0, 0, 0.20);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-left: 3px solid rgba(245, 211, 122, 0.35);
                border-radius: var(--radius-md, 8px);
                font-size: 0.86rem;
            }

            .qx-pnj-quete-mini strong {
                color: var(--gold, #f5d37a);
                text-align: right;
            }

            .qx-journal-section {
                display: flex;
                flex-direction: column;
                gap: 6px;
                margin-bottom: 14px;
            }

            .qx-journal-section > h3 {
                margin: 8px 0 4px;
                color: var(--gold, #f5d37a);
            }

            @media (max-width: 700px) {
                .qx-zone-quete__actions button {
                    width: 100%;
                }

                .qx-pnj-quete-mini {
                    flex-direction: column;
                    align-items: flex-start;
                }

                .qx-pnj-quete-mini strong {
                    text-align: left;
                }
            }
        `;

        document.head.appendChild(style);
    }


    /* --------------------------
       RC4 — Questlines & Arcs narratifs
       -------------------------- */

    function QX_categorieQuete(quete) {
        return String(quete?.categorie || "secondaire").toLowerCase();
    }

    function QX_libelleCategorieQuete(categorie) {
        const c =
            String(categorie || "secondaire").toLowerCase();

        const labels = {
            principale: "📖 Principale",
            secondaire: "📜 Secondaire",
            chasse: "🗡 Chasse",
            exploration: "🧭 Exploration",
            donjon: "🏰 Donjon",
            boss: "👑 Boss",
            artisanat: "⚒ Artisanat"
        };

        return labels[c] || `📜 ${c}`;
    }

    function QX_idArcQuete(quete) {
        return quete?.ligneQuete || quete?.arc || "quetes_diverses";
    }

    function QX_titreArcQuete(quete) {
        return quete?.chapitre || quete?.titreArc || "Quêtes diverses";
    }

    function QX_ordreQuete(quete) {
        return Number(quete?.ordre ?? quete?.ordreArc ?? 9999);
    }

    function QX_metaQuete(quete) {
        return {
            idArc: QX_idArcQuete(quete),
            titre: QX_titreArcQuete(quete),
            ordre: QX_ordreQuete(quete),
            categorie: QX_categorieQuete(quete),
            libelleCategorie: QX_libelleCategorieQuete(QX_categorieQuete(quete))
        };
    }

    function QX_ordreEtat(etat) {
        if (etat === "a_rendre") return 0;
        if (etat === "en_cours") return 1;
        if (etat === "bloquee") return 2;
        if (etat === "disponible") return 3;
        if (etat === "terminee") return 4;
        return 9;
    }

    function QX_grouperEntreesParArc(entrees) {
        const groupesMap =
            new Map();

        entrees.forEach(entree => {
            const quete =
                entree.quete;

            if (!quete) return;

            const meta =
                QX_metaQuete(quete);

            if (!groupesMap.has(meta.idArc)) {
                groupesMap.set(meta.idArc, {
                    idArc: meta.idArc,
                    titre: meta.titre,
                    ordreMin: meta.ordre,
                    entrees: []
                });
            }

            const groupe =
                groupesMap.get(meta.idArc);

            groupe.ordreMin =
                Math.min(groupe.ordreMin, meta.ordre);

            groupe.entrees.push(entree);
        });

        return Array.from(groupesMap.values())
            .map(groupe => {
                groupe.entrees.sort((a, b) => {
                    const metaA = QX_metaQuete(a.quete);
                    const metaB = QX_metaQuete(b.quete);

                    const etatA = a.progression?.etat || (QX_queteAcceptable(a.quete) ? "disponible" : "bloquee");
                    const etatB = b.progression?.etat || (QX_queteAcceptable(b.quete) ? "disponible" : "bloquee");

                    return (
                        metaA.ordre - metaB.ordre ||
                        QX_ordreEtat(etatA) - QX_ordreEtat(etatB) ||
                        String(a.quete.nom || "").localeCompare(String(b.quete.nom || ""))
                    );
                });

                return groupe;
            })
            .sort((a, b) =>
                a.ordreMin - b.ordreMin ||
                String(a.titre || "").localeCompare(String(b.titre || ""))
            );
    }

    function QX_obtenirEntreesJournalConnues() {
        const personnage =
            QX_personnage();

        if (!personnage?.quetes) return [];

        return personnage.quetes
            .map(progression => {
                const quete =
                    QX_trouverQuete(progression.id);

                if (!quete) return null;

                return { quete, progression };
            })
            .filter(Boolean);
    }

    function QX_obtenirEntreesPnjVisibles(idPnj) {
        return (Game.data.quetes || [])
            .filter(quete => quete.pnj === idPnj)
            .filter(QX_queteVisible)
            .map(quete => ({
                quete,
                progression: QX_trouverProgression(quete.id)
            }));
    }

    function QX_statsArc(groupe) {
        const total =
            groupe.entrees.length;

        const terminees =
            groupe.entrees.filter(entree =>
                entree.progression?.etat === "terminee"
            ).length;

        const aRendre =
            groupe.entrees.filter(entree =>
                entree.progression?.etat === "a_rendre"
            ).length;

        const enCours =
            groupe.entrees.filter(entree =>
                entree.progression?.etat === "en_cours"
            ).length;

        const disponibles =
            groupe.entrees.filter(entree =>
                !entree.progression && QX_queteAcceptable(entree.quete)
            ).length;

        const bloquees =
            groupe.entrees.filter(entree =>
                !entree.progression && !QX_queteAcceptable(entree.quete)
            ).length;

        const pourcentage =
            total > 0
                ? Math.round((terminees / total) * 100)
                : 0;

        return {
            total,
            terminees,
            aRendre,
            enCours,
            disponibles,
            bloquees,
            pourcentage
        };
    }

    function QX_creerResumeArc(groupe, mode = "journal") {
        const stats =
            QX_statsArc(groupe);

        const details =
            [
                stats.aRendre ? `✅ ${stats.aRendre} à rendre` : "",
                stats.enCours ? `🔄 ${stats.enCours} en cours` : "",
                stats.disponibles ? `📜 ${stats.disponibles} disponible(s)` : "",
                stats.bloquees ? `🔒 ${stats.bloquees} bloquée(s)` : "",
                stats.terminees ? `🏆 ${stats.terminees} terminée(s)` : ""
            ].filter(Boolean).join(" · ");

        const texteProgression =
            mode === "journal"
                ? `${stats.terminees}/${stats.total} connue(s) terminée(s)`
                : `${stats.total} quête(s) visible(s)`;

        const statutRecompense =
            QX_statutArcRecompense(groupe.idArc);

        return `
            <div class="qx-arc-resume">
                <div class="qx-arc-resume__progression">
                    <span>${QX_escape(texteProgression)}</span>
                    <strong>${stats.pourcentage}%</strong>
                </div>

                <div class="qx-arc-barre">
                    <div class="qx-arc-barre__remplissage" style="width:${stats.pourcentage}%"></div>
                </div>

                ${details ? `<p>${QX_escape(details)}</p>` : ""}
                ${statutRecompense ? `<p class="qx-arc-recompense-statut">${QX_escape(statutRecompense)}</p>` : ""}
            </div>
        `;
    }

    function QX_creerHeaderArc(groupe, mode = "journal") {
        return `
            <header class="qx-arc-header">
                <div>
                    <h3>📖 ${QX_escape(groupe.titre)}</h3>
                    <p>
                        ${
                            mode === "journal"
                                ? "Quêtes connues de cet arc."
                                : "Quêtes visibles auprès de ce PNJ."
                        }
                    </p>
                </div>

                ${QX_creerResumeArc(groupe, mode)}
            </header>
        `;
    }

    function QX_creerSectionArc(groupe, mode = "journal", indexArc = 0) {
        const contenu =
            `
                <div class="qx-arc-liste">
                    ${groupe.entrees.map(entree =>
                        QX_creerCarteQuete(entree.quete, entree.progression, mode === "pnj" ? entree.quete.pnj : null)
                    ).join("")}
                </div>
            `;

        /*
            RC5 :
            - En vue PNJ, les arcs deviennent repliables.
            - Premier arc ouvert.
            - Les autres fermés.
            - Chaque arc s'ouvre/ferme indépendamment.
        */

        if (mode === "pnj") {
            return `
                <details class="qx-arc-section qx-arc-section--details" ${indexArc === 0 ? "open" : ""}>
                    <summary class="qx-arc-summary">
                        ${QX_creerHeaderArc(groupe, mode)}
                    </summary>

                    ${contenu}
                </details>
            `;
        }

        return `
            <section class="qx-arc-section">
                ${QX_creerHeaderArc(groupe, mode)}
                ${contenu}
            </section>
        `;
    }

    function QX_regrouperQuetesParCategorie(entrees) {
        const ordreCategories = [
            "principale",
            "boss",
            "donjon",
            "chasse",
            "exploration",
            "artisanat",
            "secondaire"
        ];

        const groupes =
            new Map();

        entrees.forEach(entree => {
            const categorie =
                QX_categorieQuete(entree.quete);

            if (!groupes.has(categorie)) {
                groupes.set(categorie, []);
            }

            groupes.get(categorie).push(entree);
        });

        return Array.from(groupes.entries())
            .sort((a, b) => {
                const ia = ordreCategories.indexOf(a[0]);
                const ib = ordreCategories.indexOf(b[0]);

                return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
            })
            .map(([categorie, liste]) => {
                liste.sort((a, b) => {
                    const metaA = QX_metaQuete(a.quete);
                    const metaB = QX_metaQuete(b.quete);

                    return (
                        metaA.ordre - metaB.ordre ||
                        String(a.quete.nom || "").localeCompare(String(b.quete.nom || ""))
                    );
                });

                return { categorie, liste };
            });
    }


    /* --------------------------
       RC5 — Récompenses de fin d'arc
       -------------------------- */

    function QX_assurerProgressionQuetes() {
        const personnage =
            QX_personnage();

        if (!personnage) return null;

        personnage.progressionQuetes ??= {};
        personnage.progressionQuetes.arcsRecompenses ??= {};

        return personnage.progressionQuetes;
    }

    function QX_arcDejaRecompense(idArc) {
        const progressionQuetes =
            QX_assurerProgressionQuetes();

        if (!progressionQuetes || !idArc) return false;

        return progressionQuetes.arcsRecompenses?.[idArc] === true;
    }

    function QX_marquerArcRecompense(idArc) {
        const progressionQuetes =
            QX_assurerProgressionQuetes();

        if (!progressionQuetes || !idArc) return;

        progressionQuetes.arcsRecompenses[idArc] =
            true;
    }

    function QX_obtenirQuetesArc(idArc) {
        if (!idArc) return [];

        return (Game.data.quetes || [])
            .filter(quete => QX_idArcQuete(quete) === idArc)
            .sort((a, b) =>
                QX_ordreQuete(a) - QX_ordreQuete(b) ||
                String(a.nom || "").localeCompare(String(b.nom || ""))
            );
    }

    function QX_arcEntierementTermine(idArc) {
        const quetesArc =
            QX_obtenirQuetesArc(idArc);

        if (quetesArc.length === 0) return false;

        return quetesArc.every(quete =>
            QX_estQueteTerminee(quete.id)
        );
    }

    function QX_quetesArcConnues(idArc) {
        const personnage =
            QX_personnage();

        if (!personnage || !idArc) return [];

        return (personnage.quetes || [])
            .map(progression => {
                const quete =
                    QX_trouverQuete(progression.id);

                if (!quete) return null;
                if (QX_idArcQuete(quete) !== idArc) return null;

                return { quete, progression };
            })
            .filter(Boolean);
    }

    function QX_arcConnuTermine(idArc) {
        /*
            Pour l'affichage : regarde seulement les quêtes connues du joueur.
            Pour la récompense réelle : on utilise QX_arcEntierementTermine.
        */

        const connues =
            QX_quetesArcConnues(idArc);

        if (connues.length === 0) return false;

        return connues.every(entree =>
            entree.progression?.etat === "terminee"
        );
    }

    function QX_obtenirConfigRecompenseArc(idArc) {
        if (!idArc) return null;

        const quetesArc =
            QX_obtenirQuetesArc(idArc);

        for (const quete of quetesArc) {
            const config =
                quete.recompenseArc;

            if (!config) continue;

            const configArc =
                config.idArc || config.arc || idArc;

            if (configArc === idArc) {
                return {
                    ...config,
                    idArc,
                    sourceQuete: quete.id
                };
            }
        }

        return null;
    }

    function QX_donnerRecompenseArc(idArc) {
        if (!idArc) return false;
        if (QX_arcDejaRecompense(idArc)) return false;
        if (!QX_arcEntierementTermine(idArc)) return false;

        const personnage =
            QX_personnage();

        if (!personnage) return false;

        const config =
            QX_obtenirConfigRecompenseArc(idArc);

        if (!config) return false;

        const xp =
            Number(config.xp || 0);

        const or =
            Number(config.or || 0);

        personnage.xp =
            (Number(personnage.xp) || 0) + xp;

        personnage.or =
            (Number(personnage.or) || 0) + or;

        if (Array.isArray(config.objets)) {
            config.objets.forEach(item => {
                if (!item?.id) return;
                if (typeof ajouterObjetInventaire === "function") {
                    ajouterObjetInventaire(item.id, item.quantite ?? 1);
                }
            });
        }

        QX_marquerArcRecompense(idArc);

        const queteSource =
            QX_trouverQuete(config.sourceQuete);

        const titreArc =
            queteSource?.chapitre ||
            config.nom ||
            idArc;

        QX_journal("━━━━━━━━━━━━━━━━━━━━");
        QX_journal(`🏆 Arc terminé : ${titreArc}`);
        if (xp > 0) QX_journal(`⭐ Bonus d'arc : +${xp} XP`);
        if (or > 0) QX_journal(`🟡 Bonus d'arc : +${or} or`);

        if (Array.isArray(config.objets)) {
            config.objets.forEach(item => {
                if (!item?.id) return;
                QX_journal(`📦 Bonus d'arc : ${QX_nomObjet(item.id)} x${item.quantite ?? 1}`);
            });
        }

        QX_journal("━━━━━━━━━━━━━━━━━━━━");

        if (typeof verifierNiveau === "function") {
            verifierNiveau();
        }

        return true;
    }

    function QX_verifierRecompensesArcs() {
        const arcs =
            new Set((Game.data.quetes || []).map(QX_idArcQuete));

        arcs.forEach(idArc => {
            QX_donnerRecompenseArc(idArc);
        });
    }

    function QX_statutArcRecompense(idArc) {
        if (QX_arcDejaRecompense(idArc)) {
            return "🏆 Récompense d'arc récupérée";
        }

        if (QX_obtenirConfigRecompenseArc(idArc) && QX_arcEntierementTermine(idArc)) {
            return "🎁 Récompense d'arc disponible";
        }

        if (QX_obtenirConfigRecompenseArc(idArc) && QX_arcConnuTermine(idArc)) {
            return "🔒 Suite de l'arc peut encore exister";
        }

        if (QX_obtenirConfigRecompenseArc(idArc)) {
            return "🎁 Récompense d'arc prévue";
        }

        return "";
    }

    function QX_creerCarteQueteCompacteArc(quete, progression) {
        const meta =
            QX_metaQuete(quete);

        const etat =
            progression?.etat || (QX_queteAcceptable(quete) ? "disponible" : "bloquee");

        return `
            <div class="qx-quete-arc-ligne ${etat === "bloquee" ? "qx-quete-arc-ligne--bloquee" : ""}">
                <span class="qx-quete-arc-ligne__ordre">${Number.isFinite(meta.ordre) ? meta.ordre : "?"}</span>
                <span class="qx-quete-arc-ligne__etat">${QX_nomEtatQuete(etat)}</span>
                <strong>${QX_escape(quete.nom)}</strong>
            </div>
        `;
    }

    function QX_creerResumeQuestlinePnj(idPnj) {
        /*
            Anti-spoil :
            - utilise uniquement les quêtes visibles par QX_queteVisible.
            - donc les suites avec quetesRequises non terminées restent cachées.
        */

        const entrees =
            QX_obtenirEntreesPnjVisibles(idPnj);

        if (entrees.length === 0) return "";

        const arcs =
            QX_grouperEntreesParArc(entrees);

        return `
            <div class="qx-pnj-arcs">
                ${arcs.map(groupe => `
                    <div class="qx-pnj-arc">
                        <div class="qx-pnj-arc__titre">
                            📖 ${QX_escape(groupe.titre)}
                        </div>

                        ${QX_regrouperQuetesParCategorie(groupe.entrees).map(categorieGroupe => `
                            <div class="qx-pnj-arc__categorie">
                                <span>${QX_escape(QX_libelleCategorieQuete(categorieGroupe.categorie))}</span>

                                <div class="qx-pnj-arc__liste">
                                    ${categorieGroupe.liste.map(entree =>
                                        QX_creerCarteQueteCompacteArc(entree.quete, entree.progression)
                                    ).join("")}
                                </div>
                            </div>
                        `).join("")}
                    </div>
                `).join("")}
            </div>
        `;
    }

    function QX_creerCarteQuete(quete, progression, contextePnj = null) {
        const acceptable =
            QX_queteAcceptable(quete);

        const etat =
            progression?.etat || (acceptable ? "disponible" : "bloquee");

        const objectifHTML =
            progression
                ? `<p><strong>Objectif :</strong> ${QX_escape(QX_decrireObjectif(quete, progression))}</p>`
                : acceptable
                    ? `<p><strong>Objectif :</strong> ${QX_escape(QX_decrireObjectif(quete, { progression: 0 }))}</p>`
                    : `<p><strong>Quête non disponible pour le moment.</strong></p>`;

        let action = "";

        if (!progression && acceptable) {
            action = `
                <button onclick="accepterQuete('${quete.id}'); ${contextePnj ? `ouvrirQuetesPNJ('${contextePnj}')` : "ouvrirQuetes()"};">
                    Accepter
                </button>
            `;
        } else if (!progression && !acceptable) {
            action = `
                <button disabled title="Conditions non remplies">
                    🔒 Bloquée
                </button>
            `;
        } else if (progression.etat === "a_rendre") {
            action = `
                <button onclick="remettreQuete('${quete.id}'); ${contextePnj ? `ouvrirQuetesPNJ('${contextePnj}')` : "ouvrirQuetes()"};">
                    Réclamer récompense
                </button>
            `;
        }

        const recompense =
            quete.recompense || {};

        const recompenseTexte =
            [
                recompense.xp ? `⭐ ${recompense.xp} XP` : "",
                recompense.or ? `🟡 ${recompense.or} or` : "",
                Array.isArray(recompense.objets)
                    ? recompense.objets.map(item => `📦 ${QX_nomObjet(item.id)} x${item.quantite ?? 1}`).join(" — ")
                    : ""
            ].filter(Boolean).join(" — ");

        const conditionsHTML =
            !progression
                ? QX_creerBlocConditionsQuete(quete)
                : "";

        const meta =
            QX_metaQuete(quete);

        return `
            <div class="item-card ${etat === "bloquee" ? "qx-carte-quete-bloquee" : ""}">
                <div class="qx-quete-card-header">
                    <h3>📜 ${QX_escape(quete.nom)}</h3>

                    <div class="qx-quete-card-meta">
                        <span>${QX_escape(meta.libelleCategorie)}</span>
                        <span>Étape ${Number.isFinite(meta.ordre) ? meta.ordre : "?"}</span>
                    </div>
                </div>

                <p>${QX_escape(quete.description || "")}</p>
                <p>État : ${QX_nomEtatQuete(etat)}</p>
                ${objectifHTML}
                ${conditionsHTML}
                ${recompenseTexte ? `<p><strong>Récompense :</strong> ${QX_escape(recompenseTexte)}</p>` : ""}
                ${action}
            </div>
        `;
    }

    function QX_ouvrirQuetesPNJ(idPnj) {
        if (typeof changerVue === "function") {
            changerVue("quetes_pnj");
        }

        QX_verifierProgressionQuetes();

        const personnagePnj =
            Game.cache?.pnjParId?.[idPnj];

        const entrees =
            QX_obtenirEntreesPnjVisibles(idPnj);

        const arcs =
            QX_grouperEntreesParArc(entrees);

        let html = `
            <div class="item-card">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                    <div>
                        <h2 style="margin:0;">📜 Quêtes de ${QX_escape(personnagePnj?.nom || idPnj)}</h2>
                        <p style="margin:6px 0 0;">
                            Les suites narratives restent cachées tant que l'étape précédente n'est pas terminée.
                        </p>
                    </div>
                    <button onclick="ouvrirExploration()">⬅ Retour</button>
                </div>
            </div>
        `;

        if (arcs.length === 0) {
            html += `<div class="item-card">Aucune quête disponible.</div>`;
        } else {
            html += arcs.map((groupe, indexArc) =>
                QX_creerSectionArc(groupe, "pnj", indexArc)
            ).join("");
        }

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(html);
        }

        QX_mettreAJourBadgeNavigationQuetes();
    }

    function QX_ouvrirQuetes() {
        if (typeof changerVue === "function") {
            changerVue("quetes");
        }

        QX_verifierProgressionQuetes();

        const entrees =
            QX_obtenirEntreesJournalConnues();

        const arcs =
            QX_grouperEntreesParArc(entrees);

        let html = `
            <div class="item-card">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                    <div>
                        <h2 style="margin:0;">📜 Journal des quêtes</h2>
                        <p style="margin:6px 0 0;">
                            Journal regroupé par arcs narratifs connus.
                        </p>
                    </div>
                    <button onclick="ouvrirExploration()">⬅ Retour</button>
                </div>
            </div>
        `;

        if (arcs.length === 0) {
            html += `<div class="item-card">Aucune quête active dans le journal.</div>`;
        } else {
            html += arcs.map((groupe, indexArc) =>
                QX_creerSectionArc(groupe, "journal", indexArc)
            ).join("");
        }

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(html);
        }

        QX_mettreAJourBadgeNavigationQuetes();
    }

    function QX_patchFonctions() {
        QX_injecterStylesRC2();
        QX_patchPnjIndicators();
        QX_patchActionsPnjQuestlines();

        // Anti-spoil conservé :
        // - pas de tracker "Quêtes liées à cette zone"
        // - les suites narratives restent cachées par quetesRequises
        QX_mettreAJourBadgeNavigationQuetes();

        if (typeof accepterQuete === "function" && !accepterQuete.__QX_patche) {
            accepterQuete = QX_accepterQuete;
            accepterQuete.__QX_patche = true;
        }

        if (typeof verifierProgressionQuetes === "function" && !verifierProgressionQuetes.__QX_patche) {
            verifierProgressionQuetes = QX_verifierProgressionQuetes;
            verifierProgressionQuetes.__QX_patche = true;
        }

        if (typeof remettreQuete === "function" && !remettreQuete.__QX_patche) {
            remettreQuete = QX_remettreQuete;
            remettreQuete.__QX_patche = true;
        }

        if (typeof ouvrirQuetesPNJ === "function" && !ouvrirQuetesPNJ.__QX_patche) {
            ouvrirQuetesPNJ = QX_ouvrirQuetesPNJ;
            ouvrirQuetesPNJ.__QX_patche = true;
        }

        if (typeof ouvrirQuetes === "function" && !ouvrirQuetes.__QX_patche) {
            ouvrirQuetes = QX_ouvrirQuetes;
            ouvrirQuetes.__QX_patche = true;
        }

        if (typeof parlerPNJ === "function" && !parlerPNJ.__QX_patche) {
            const originalParlerPNJ = parlerPNJ;

            parlerPNJ = function (idPnj) {
                originalParlerPNJ(idPnj);
                QX_signalerParler(idPnj);
                QX_verifierProgressionQuetes();
                if (typeof rafraichirInterface === "function") {
                    rafraichirInterface();
                }
            };

            parlerPNJ.__QX_patche = true;
        }

        if (typeof voyagerVersZone === "function" && !voyagerVersZone.__QX_patche) {
            const originalVoyagerVersZone = voyagerVersZone;

            voyagerVersZone = function (idZone) {
                originalVoyagerVersZone(idZone);
                if (QX_zoneActuelleId() === idZone) {
                    QX_signalerVisiter(idZone);
                    QX_verifierProgressionQuetes();
                }
            };

            voyagerVersZone.__QX_patche = true;
        }

        if (typeof recolterRecompenses === "function" && !recolterRecompenses.__QX_patche) {
            const originalRecolterRecompenses = recolterRecompenses;

            recolterRecompenses = function () {
                const monstre =
                    Game.combat?.actif?.monstre || null;

                originalRecolterRecompenses();

                if (monstre) {
                    QX_signalerMonstreTue(monstre);
                    QX_verifierProgressionQuetes();
                }
            };

            recolterRecompenses.__QX_patche = true;
        }

        if (typeof terminerCombat === "function" && !terminerCombat.__QX_patche) {
            const originalTerminerCombat = terminerCombat;

            terminerCombat = function (resultat) {
                const combatAvant =
                    Game.combat?.actif || null;

                const ennemi =
                    combatAvant?.ennemi || combatAvant?.monstre || null;

                originalTerminerCombat(resultat);

                if (resultat === "victoire" && ennemi) {
                    QX_signalerMonstreTue(ennemi);
                    QX_verifierProgressionQuetes();
                }
            };

            terminerCombat.__QX_patche = true;
        }
    }

    window.QX_verifierProgressionQuetes = QX_verifierProgressionQuetes;
    window.QX_signalerMonstreTue = QX_signalerMonstreTue;
    window.QX_signalerParler = QX_signalerParler;
    window.QX_signalerVisiter = QX_signalerVisiter;
    window.QX_mettreAJourBadgeNavigationQuetes = QX_mettreAJourBadgeNavigationQuetes;
    window.QX_conditionsManquantes = QX_conditionsManquantes;
    window.QX_queteAcceptable = QX_queteAcceptable;
    window.QX_metaQuete = QX_metaQuete;
    window.QX_grouperEntreesParArc = QX_grouperEntreesParArc;
    window.QX_verifierRecompensesArcs = QX_verifierRecompensesArcs;
    window.QX_donnerRecompenseArc = QX_donnerRecompenseArc;
    window.QX_VERSION = QX_VERSION;

    function QX_installer() {
        QX_patchFonctions();

        // Deuxième passe au cas où certains scripts ont été chargés après.
        setTimeout(QX_patchFonctions, 0);
        setTimeout(QX_patchFonctions, 500);

        console.log("✅ Quetes_Extension.js chargé — " + QX_VERSION);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", QX_installer);
    } else {
        QX_installer();
    }
})();
