/*
NightVenture - Statistiques et niveaux
- Stats totales
- Ressources max
- Vue statistiques
- XP / montee de niveau
- Points de caracteristiques
*/

function pvMaxTotal() { return 100 + statTotale("vitalite") * 10 + statTotale("pvMax"); }
function manaMaxTotal() { return 50 + statTotale("intelligence") * 10 + statTotale("manaMax"); }
function critiqueTotal() { return statTotale("critique") + statTotale("dexterite") * 0.5; }
function bonusLootTotal() { return statTotale("bonusLoot") + statTotale("chance"); }
function attaqueTotale() { return statTotale("attaque") + statTotale("force") * 2; }
function defenseTotale() { return statTotale("defense") + statTotale("vitalite") * 2; }
function attaqueMagiqueTotale() { return statTotale("attaqueMagique") + statTotale("intelligence") * 2; }
function defenseMagiqueTotale() { return statTotale("defenseMagique") + statTotale("vitalite") * 2; }
function esquiveTotale() { return statTotale("esquive") + statTotale("dexterite") * 0.5; }
function vitesseTotale() { return statTotale("vitesse"); }
function bonusOrTotal() { return statTotale("bonusOr") + statTotale("chance"); }
function staminaMaxTotal() { return 100 + statTotale("staminaMax") + statTotale("dexterite") * 5; }

function statTotale(nomStat) {
    let total = Number(Game.data.personnage[nomStat] || 0);

    Object.values(Game.data.personnage.equipement ?? {}).forEach(idObjet => {
        if (!idObjet) return;
        const objet = trouverObjet(idObjet);
        if (!objet) return;
        total += Number(objet[nomStat] || 0);
    });

    (Game.data.personnage.talents ?? []).forEach(talentJoueur => {
        const talent = Game.cache.talentsParId[talentJoueur.id];
        if (!talent) return;
        total += Number(talent[nomStat] || 0) * Number(talentJoueur.niveau || 0);
    });

    return total;
}

/* STATS Interface Utilisateur & Affichage des Stats */
function ouvrirStatistiques() {
    changerVue("statistiques");

    const personnage = Game.data.personnage;
    const region = obtenirRegionMondeActuelle()?.nom || "Region inconnue";
    const zone = obtenirZoneActuelle()?.nom || "Zone inconnue";

    const statistiques = [
        ["FOR", "force"],
        ["DEX", "dexterite"],
        ["INT", "intelligence"],
        ["VIT", "vitalite"],
        ["CHA", "chance"],
        ["SPE", "vitesse"]
    ];

    const html = `
        <div class="item-card">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:15px;">
                <div>
                    <h2 style="margin:0;">Statistiques</h2>
                    <p style="margin:6px 0 0;">
                        Fiche complete du personnage, caracteristiques et statistiques de combat.
                    </p>
                </div>

                <button onclick="ouvrirExploration()">Retour</button>
            </div>
        </div>

        <div class="fiche-personnage-grid">

            <div class="fiche-personnage-section">
                <h3>Identite</h3>

                <div class="liste-stats">
                    <div class="ligne-stat">
                        <span>Nom</span>
                        <strong>${personnage.nom || "Heros"}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Classe</span>
                        <strong>${personnage.classe || "Aventurier"}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Niveau</span>
                        <strong>${personnage.niveau ?? 1}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Or</span>
                        <strong>${personnage.or ?? 0}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Region</span>
                        <strong>${region}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Zone</span>
                        <strong>${zone}</strong>
                    </div>
                </div>
            </div>

            <div class="fiche-personnage-section">
                <h3>Progression</h3>

                <div class="liste-stats">
                    <div class="ligne-stat">
                        <span>XP</span>
                        <strong>${personnage.xp ?? 0} / ${xpNiveauSuivant()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Points caracteristiques</span>
                        <strong>${personnage.pointsCaracteristiques ?? 0}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Points talents</span>
                        <strong>${personnage.pointsTalent ?? 0}</strong>
                    </div>
                </div>
            </div>

            <div class="fiche-personnage-section">
                <h3>Ressources</h3>

                <div class="liste-stats">
                    <div class="ligne-stat">
                        <span>PV</span>
                        <strong>${personnage.pv} / ${pvMaxTotal()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Mana</span>
                        <strong>${personnage.mana} / ${manaMaxTotal()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>Stamina</span>
                        <strong>${personnage.stamina ?? staminaMaxTotal()} / ${staminaMaxTotal()}</strong>
                    </div>
                </div>
            </div>

            <div class="fiche-personnage-section">
                <h3>Combat</h3>

                <div class="liste-stats">
                    <div class="ligne-stat">
                        <span>ATK</span>
                        <strong>${attaqueTotale()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>DEF</span>
                        <strong>${defenseTotale()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>ATK MAGIC</span>
                        <strong>${attaqueMagiqueTotale()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>DEF MAGIC</span>
                        <strong>${defenseMagiqueTotale()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>PV MAX</span>
                        <strong>${pvMaxTotal()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>MANA MAX</span>
                        <strong>${manaMaxTotal()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>STAMINA MAX</span>
                        <strong>${staminaMaxTotal()}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>CRITIQUE</span>
                        <strong>${critiqueTotal().toFixed(1)}%</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>ESQUIVE</span>
                        <strong>${esquiveTotale().toFixed(1)}%</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>SPE</span>
                        <strong>${vitesseTotale().toFixed(1)}</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>BONUS LOOT</span>
                        <strong>${bonusLootTotal().toFixed(1)}%</strong>
                    </div>

                    <div class="ligne-stat">
                        <span>BONUS OR</span>
                        <strong>${bonusOrTotal().toFixed(1)}%</strong>
                    </div>
                </div>
            </div>

        </div>

        <div class="item-card">
            <h2>Caracteristiques</h2>

            <p>
                Points disponibles :
                <strong>${personnage.pointsCaracteristiques ?? 0}</strong>
            </p>

            <div class="stats-grid">
                ${statistiques.map(([abreviation, statistique]) =>
                    creerCarteStatistique(
                        abreviation,
                        statistique,
                        true
                    )
                ).join("")}
            </div>
        </div>
    `;

    afficherVuePrincipale(html);
}

/* NIVEAUX Logique Systeme & Moteur d'XP */
function verifierMonteeNiveau() {
    let coutXp = xpNiveauSuivant();
    const personnage = Game.data.personnage;

    while (personnage.xp >= coutXp) {
        personnage.xp -= coutXp;
        personnage.niveau++;

        const palier = Game.data.niveaux.find(n => Number(n.niveau) === Number(personnage.niveau));

        personnage.pointsCaracteristiques += palier?.pointsStats ?? 5;
        personnage.pointsTalent += palier?.pointsTalents ?? 1;

        if (palier) {
            personnage.pvMax += palier.pvBonus || 0;
            personnage.manaMax += palier.manaBonus || 0;
        }

        personnage.pv = pvMaxTotal();
        personnage.mana = manaMaxTotal();
        personnage.stamina = staminaMaxTotal();

        ajouterJournal(`Niveau ${personnage.niveau} atteint !`);
        ajouterJournal(`+${palier?.pointsStats ?? 5} points de caracteristiques`);
        ajouterJournal(`+${palier?.pointsTalents ?? 1} point(s) de talent`);

        coutXp = xpNiveauSuivant();
    }
}

function xpNiveauSuivant() {
    const niveau = Game.data.niveaux.find(n => Number(n.niveau) === Number(Game.data.personnage.niveau));
    if (!niveau) {
        const dernierNiveau = Game.data.niveaux[Game.data.niveaux.length - 1];
        return dernierNiveau ? dernierNiveau.xpRequise : 999999;
    }
    return niveau.xpRequise;
}

function ajouterPointStat(nomStat) {
    if (Game.data.personnage.pointsCaracteristiques <= 0) {
        ajouterJournal("Aucun point disponible.");
        return;
    }

    Game.data.personnage[nomStat] = Number(Game.data.personnage[nomStat] || 0) + 1;
    Game.data.personnage.pointsCaracteristiques--;

    ajouterJournal(`+1 ${nomStat}`);
    rafraichirInterface();
}

/* NIVEAUX Elements de Liaison d'Interface */
function verifierNiveau() {
    verifierMonteeNiveau();
    rafraichirInterface();
}
