/* ==========================================================================
   NIGHTVENTURE — AUTOMATISEUR DE BALANCE v0.8.4
   --------------------------------------------------------------------------
   But :
   - Lancer beaucoup de simulations automatiquement.
   - Croiser profils joueur, classes, niveaux, équipements, monstres, menaces.
   - Générer UN SEUL rapport TXT compact à donner à ChatGPT pour analyse.
   - Module non destructif : ne modifie pas l'inventaire, le personnage, les zones
     ni les fichiers JSON.
   --------------------------------------------------------------------------
   À charger après :
   script.js
   Combats.js
   Equipements_Proceduraux.js
   Monstres_Proceduraux.js
   Profils_Equipements_Simulateur.js
   ========================================================================== */

(function () {
    const BA_VERSION = "v0.9.3.3"

    if (!window.Game) {
        console.warn("⚠ Automatiseur_Balance.js : Game introuvable. Charge ce fichier après script.js.");
        return;
    }

    Game.automatiseurBalance = Game.automatiseurBalance || {
        dernierRapportTXT: "",
        derniersResultats: [],
        derniereCampagne: null,
        enCours: false
    };

    const BA_CLASSES = [
        "guerrier",
        "mage",
        "voleur",
        "rodeur",
        "paladin",
        "berserker",
        "assassin",
        "necromancien",
        "gardien"
    ];

    const BA_TIERS = [
        "1_commun",
        "3_modeste",
        "5_standard",
        "8_bon",
        "12_rare",
        "15_epique_leger",
        "20_heroique",
        "25_legendaire",
        "30_mythique"
    ];

    const BA_TEMPLATES = [
        "araignee",
        "gobelin",
        "loup",
        "squelette",
        "orc",
        "mage_noir",
        "golem",
        "troll",
        "vampire",
        "dragon"
    ];

    const BA_TEMPLATES_RAPIDE = [
        "araignee",
        "gobelin",
        "loup",
        "orc",
        "mage_noir",
        "golem",
        "dragon"
    ];

    const BA_SCENARIOS = {
        rapide: [
            {
                nom: "Même niveau normal",
                delta: 0,
                menace: "normal"
            },
            {
                nom: "Même niveau fort",
                delta: 0,
                menace: "fort"
            },
            {
                nom: "Monstre +1 normal",
                delta: 1,
                menace: "normal"
            },
            {
                nom: "Monstre +2 fort",
                delta: 2,
                menace: "fort"
            },
            {
                nom: "Même niveau élite",
                delta: 0,
                menace: "elite"
            },
            {
                nom: "Boss +2",
                delta: 2,
                menace: "boss"
            }
        ],

        standard: [
            {
                nom: "Même niveau faible",
                delta: 0,
                menace: "faible"
            },
            {
                nom: "Même niveau normal",
                delta: 0,
                menace: "normal"
            },
            {
                nom: "Même niveau fort",
                delta: 0,
                menace: "fort"
            },
            {
                nom: "Monstre +1 normal",
                delta: 1,
                menace: "normal"
            },
            {
                nom: "Monstre +2 fort",
                delta: 2,
                menace: "fort"
            },
            {
                nom: "Même niveau élite",
                delta: 0,
                menace: "elite"
            },
            {
                nom: "Mini-boss +1",
                delta: 1,
                menace: "mini_boss"
            },
            {
                nom: "Boss +2",
                delta: 2,
                menace: "boss"
            },
            {
                nom: "Boss -2",
                delta: -2,
                menace: "boss"
            }
        ],

        profond: [
            {
                nom: "Même niveau faible",
                delta: 0,
                menace: "faible"
            },
            {
                nom: "Même niveau normal",
                delta: 0,
                menace: "normal"
            },
            {
                nom: "Même niveau fort",
                delta: 0,
                menace: "fort"
            },
            {
                nom: "Monstre +1 normal",
                delta: 1,
                menace: "normal"
            },
            {
                nom: "Monstre +2 normal",
                delta: 2,
                menace: "normal"
            },
            {
                nom: "Monstre +2 fort",
                delta: 2,
                menace: "fort"
            },
            {
                nom: "Monstre +3 fort",
                delta: 3,
                menace: "fort"
            },
            {
                nom: "Même niveau élite",
                delta: 0,
                menace: "elite"
            },
            {
                nom: "Élite +2",
                delta: 2,
                menace: "elite"
            },
            {
                nom: "Mini-boss même niveau",
                delta: 0,
                menace: "mini_boss"
            },
            {
                nom: "Mini-boss +2",
                delta: 2,
                menace: "mini_boss"
            },
            {
                nom: "Boss même niveau",
                delta: 0,
                menace: "boss"
            },
            {
                nom: "Boss +3",
                delta: 3,
                menace: "boss"
            },
            {
                nom: "Boss -3",
                delta: -3,
                menace: "boss"
            }
        ]
    };

    const BA_OBJECTIFS_BASE = {
        faible: {
            min: 75,
            max: 95
        },
        normal: {
            min: 50,
            max: 75
        },
        fort: {
            min: 30,
            max: 60
        },
        elite: {
            min: 15,
            max: 45
        },
        mini_boss: {
            min: 5,
            max: 30
        },
        boss: {
            min: 0,
            max: 20
        }
    };

    function BA_h(valeur) {
        return String(valeur === undefined || valeur === null ? "" : valeur)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function BA_nombre(valeur, fallback) {
        const nombre = Number(valeur);
        return Number.isFinite(nombre) ? nombre : fallback;
    }

    function BA_arrondir(valeur, decimales) {
        const facteur = Math.pow(10, decimales || 0);
        return Math.round(BA_nombre(valeur, 0) * facteur) / facteur;
    }

    function BA_clamp(valeur, min, max) {
        return Math.max(min, Math.min(max, BA_nombre(valeur, min)));
    }

    function BA_moyenne(liste, champ) {
        if (!Array.isArray(liste) || liste.length === 0) return 0;

        return liste.reduce((total, entree) => {
            return total + BA_nombre(entree[champ], 0);
        }, 0) / liste.length;
    }

    function BA_pause(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms || 0);
        });
    }

    function BA_telechargerTexte(nomFichier, contenu) {
        const blob = new Blob(
            [contenu],
            {
                type: "text/plain;charset=utf-8"
            }
        );

        const url = URL.createObjectURL(blob);
        const lien = document.createElement("a");

        lien.href = url;
        lien.download = nomFichier;

        document.body.appendChild(lien);
        lien.click();
        document.body.removeChild(lien);

        URL.revokeObjectURL(url);
    }

    function BA_injecterStyle() {
        if (document.getElementById("baStyles")) return;

        const style = document.createElement("style");
        style.id = "baStyles";
        style.textContent = `
            .ba-grid {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 12px;
            }

            .ba-grid label {
                display: flex;
                flex-direction: column;
                gap: 6px;
                color: var(--text-muted, #b8b8b8);
            }

            .ba-grid input,
            .ba-grid select {
                width: 100%;
            }

            .ba-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 12px;
            }

            .ba-actions button {
                width: auto;
            }

            .ba-progress-wrap {
                margin-top: 14px;
                padding: 10px;
                border: 1px solid rgba(245, 211, 122, 0.18);
                border-radius: var(--radius-md, 8px);
                background: rgba(0, 0, 0, 0.18);
            }

            .ba-progress-bar {
                height: 14px;
                overflow: hidden;
                border-radius: 999px;
                background: rgba(255, 255, 255, 0.08);
            }

            .ba-progress-fill {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, rgba(245, 211, 122, 0.4), rgba(245, 211, 122, 0.9));
                transition: width 0.15s ease-out;
            }

            .ba-mini-stats {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
                margin-top: 12px;
            }

            .ba-mini-stat {
                padding: 8px;
                border: 1px solid rgba(245, 211, 122, 0.14);
                border-radius: var(--radius-md, 8px);
                background: rgba(0, 0, 0, 0.15);
            }

            .ba-mini-stat span {
                display: block;
                color: var(--text-muted, #b8b8b8);
                font-size: 0.85rem;
            }

            .ba-mini-stat strong {
                color: var(--gold, #f5d37a);
            }

            .ba-log {
                max-height: 360px;
                overflow: auto;
                white-space: pre-wrap;
                font-size: 0.85rem;
                padding: 10px;
                border-radius: var(--radius-md, 8px);
                background: rgba(0, 0, 0, 0.32);
            }

            @media (max-width: 800px) {
                .ba-grid,
                .ba-mini-stats {
                    grid-template-columns: 1fr;
                }

                .ba-actions button {
                    width: 100%;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function BA_injecterBoutonMenu() {
        const barre = document.getElementById("barreVuePrincipale");
        if (!barre) return;
        if (document.getElementById("btnAutomatiseurBalance")) return;

        const bouton = document.createElement("button");
        bouton.id = "btnAutomatiseurBalance";
        bouton.type = "button";
        bouton.textContent = "📊 Batch Balance";
        bouton.onclick = function () {
            ouvrirAutomatiseurBalance();
        };

        barre.appendChild(bouton);
    }

    function BA_obtenirTousProfils() {
        const profils = window.PEQ_PROFILS || {};

        return Object.values(profils)
            .filter(profil => {
                if (!profil || !profil.id) return false;
                if (profil.id === "actuel") return false;
                return true;
            })
            .sort((a, b) => {
                const niveauA = BA_nombre(a.niveau, 0);
                const niveauB = BA_nombre(b.niveau, 0);

                if (niveauA !== niveauB) return niveauA - niveauB;

                return String(a.nom || a.id).localeCompare(String(b.nom || b.id));
            });
    }


    function BA_obtenirClasseDepuisProfil(profil) {
        if (!profil) return "inconnue";

        if (profil.classe && profil.classe !== "actuel") {
            return profil.classe;
        }

        const id =
            String(profil.id || "");

        const debutId =
            id.split("_")[0];

        if (BA_CLASSES.includes(debutId)) {
            return debutId;
        }

        if (id.startsWith("aventurier") || id.startsWith("niveau_")) {
            return "aventurier";
        }

        const nom =
            String(profil.nom || "").toLowerCase();

        for (const classe of BA_CLASSES) {
            if (nom.includes(classe)) {
                return classe;
            }
        }

        if (nom.includes("rôdeur") || nom.includes("rodeur")) {
            return "rodeur";
        }

        if (nom.includes("nécromancien") || nom.includes("necromancien")) {
            return "necromancien";
        }

        return "inconnue";
    }

    function BA_obtenirProfilsPreset(preset) {
        const tous = BA_obtenirTousProfils();

        const profilsClasses =
            tous.filter(profil => {
                const classe = BA_obtenirClasseDepuisProfil(profil);
                return BA_CLASSES.includes(classe);
            });

        const source =
            profilsClasses.length >= 20
                ? profilsClasses
                : tous;

        if (preset === "rapide") {
            const idsVoulus = new Set([
                "niveau_1_sans_stuff",
                "aventurier_1_commun",
                "guerrier_1_commun",
                "mage_1_commun",
                "voleur_1_commun",
                "gardien_1_commun",
                "guerrier_5_standard",
                "mage_5_standard",
                "voleur_5_standard",
                "gardien_5_standard",
                "guerrier_15_epique_leger",
                "mage_15_epique_leger",
                "assassin_15_epique_leger",
                "gardien_15_epique_leger",
                "guerrier_30_mythique",
                "mage_30_mythique",
                "assassin_30_mythique",
                "gardien_30_mythique"
            ]);

            const selection =
                tous.filter(profil => idsVoulus.has(profil.id));

            if (selection.length >= 8) {
                return selection;
            }

            return source.filter((profil, index) => index % 5 === 0).slice(0, 24);
        }

        if (preset === "standard") {
            const tiersVoulus = new Set([
                "1_commun",
                "3_modeste",
                "5_standard",
                "8_bon",
                "12_rare",
                "15_epique_leger",
                "20_heroique",
                "25_legendaire",
                "30_mythique"
            ]);

            const selection =
                source.filter(profil => {
                    if (profil.id === "niveau_1_sans_stuff" || profil.id === "aventurier_1_commun") {
                        return true;
                    }

                    return BA_CLASSES.some(classe => {
                        return [...tiersVoulus].some(tier => {
                            return profil.id === `${classe}_${tier}`;
                        });
                    });
                });

            if (selection.length >= 20) {
                return selection;
            }

            return source;
        }

        return source;
    }

    function BA_obtenirTemplates(mode) {
        if (mode === "rapide") {
            return BA_TEMPLATES_RAPIDE.slice();
        }

        return BA_TEMPLATES.slice();
    }

    function BA_obtenirTemplatesPourScenario(modeTemplates, templates, indexBase) {
        if (modeTemplates === "complet") {
            return templates.slice();
        }

        if (modeTemplates === "representatif") {
            return [
                templates[indexBase % templates.length],
                templates[(indexBase + 3) % templates.length],
                templates[(indexBase + 6) % templates.length]
            ].filter((valeur, index, liste) => liste.indexOf(valeur) === index);
        }

        return [
            templates[indexBase % templates.length]
        ];
    }

    function BA_lireConfigDepuisUI() {
        const preset =
            document.getElementById("baPreset")?.value || "standard";

        const modeTemplates =
            document.getElementById("baModeTemplates")?.value || "rotation";

        const potionsPreset =
            document.getElementById("baPotionsPreset")?.value || "0";

        const potions =
            potionsPreset === "0_1_3"
                ? [0, 1, 3]
                : potionsPreset === "0_1"
                    ? [0, 1]
                    : [0];

        return {
            preset,
            modeTemplates,
            potions,
            combatsParCas: BA_clamp(
                Number(document.getElementById("baCombatsParCas")?.value) || 200,
                10,
                5000
            ),
            strategieJoueur:
                document.getElementById("baStrategieJoueur")?.value || "prudent",
            potionId:
                document.getElementById("baPotionId")?.value || "potion_soin",
            niveauMonstreMax: BA_clamp(
                Number(document.getElementById("baNiveauMonstreMax")?.value) || 35,
                1,
                500
            ),
            regenererStuffParCas:
                document.getElementById("baRegenererStuff")?.checked === true,
            logsComplets: false
        };
    }

    function BA_genererCas(config) {
        const profils = BA_obtenirProfilsPreset(config.preset);
        const scenarios = BA_SCENARIOS[config.preset] || BA_SCENARIOS.standard;
        const templates = BA_obtenirTemplates(config.preset);

        const cas = [];
        let compteur = 0;

        profils.forEach((profil, indexProfil) => {
            scenarios.forEach((scenario, indexScenario) => {
                const templatesScenario =
                    BA_obtenirTemplatesPourScenario(
                        config.modeTemplates,
                        templates,
                        indexProfil + indexScenario
                    );

                templatesScenario.forEach(templateId => {
                    config.potions.forEach(potionsMax => {
                        const niveauJoueur =
                            Math.max(1, BA_nombre(profil.niveau, 1));

                        const niveauMonstre =
                            BA_clamp(
                                niveauJoueur + BA_nombre(scenario.delta, 0),
                                1,
                                config.niveauMonstreMax
                            );

                        cas.push({
                            index: ++compteur,
                            profilId: profil.id,
                            profilNom: profil.nom || profil.id,
                            classe: BA_obtenirClasseDepuisProfil(profil),
                            niveauJoueur,
                            scenarioNom: scenario.nom,
                            delta: niveauMonstre - niveauJoueur,
                            niveauMonstre,
                            menace: scenario.menace,
                            templateId,
                            potionsMax
                        });
                    });
                });
            });
        });

        return cas;
    }

    function BA_genererMonstrePourCas(cas) {
        if (typeof window.genererMonstreProcedural !== "function") {
            throw new Error("genererMonstreProcedural introuvable. Vérifie que Monstres_Proceduraux.js est chargé.");
        }

        return window.genererMonstreProcedural({
            modeNiveau: "fixe",
            niveauFixe: cas.niveauMonstre,
            niveauReference: cas.niveauMonstre,
            templateId: cas.templateId,
            typeMenace: cas.menace
        });
    }

    function BA_preparerProfilPourCas(cas, config) {
        if (typeof window.PEQ_creerDetailsProfil !== "function") {
            return null;
        }

        try {
            return window.PEQ_creerDetailsProfil(
                cas.profilId,
                {
                    forcerRegeneration: Boolean(config.regenererStuffParCas)
                }
            );
        } catch (erreur) {
            console.warn("Impossible de préparer le profil", cas.profilId, erreur);
            return null;
        }
    }

    function BA_extraireStatsRapport(rapport) {
        const resultats =
            Array.isArray(rapport?.resultats)
                ? rapport.resultats
                : [];

        const total =
            resultats.length || BA_nombre(rapport?.options?.nombreCombats, 0) || 0;

        if (total <= 0) {
            return {
                total: 0,
                victoires: 0,
                defaites: 0,
                limites: 0,
                tauxVictoire: 0,
                toursMoyens: 0,
                actionsJoueurMoyennes: 0,
                actionsEnnemiMoyennes: 0,
                degatsInfligesMoyens: 0,
                degatsRecusMoyens: 0,
                potionsMoyennes: 0,
                pvJoueurRestantsMoyens: 0,
                pvEnnemiRestantsMoyens: 0,
                critiquesJoueurMoyens: 0,
                esquivesJoueurMoyennes: 0
            };
        }

        const lignes =
            resultats.map(resultat => {
                return {
                    resultat: resultat.resultat || resultat.stats?.resultat || "inconnu",
                    tours: BA_nombre(resultat.stats?.tours, 0),
                    actionsJoueur: BA_nombre(resultat.stats?.actionsJoueur, 0),
                    actionsEnnemi: BA_nombre(resultat.stats?.actionsEnnemi, 0),
                    degatsInfliges: BA_nombre(resultat.stats?.degatsInfliges, 0),
                    degatsRecus: BA_nombre(resultat.stats?.degatsRecus, 0),
                    potionsUtilisees: BA_nombre(resultat.stats?.potionsUtilisees, 0),
                    pvJoueurRestants: BA_nombre(resultat.stats?.pvJoueurRestants, 0),
                    pvEnnemiRestants: BA_nombre(resultat.stats?.pvEnnemiRestants, 0),
                    critiquesJoueur: BA_nombre(resultat.stats?.critiquesJoueur, 0),
                    esquivesJoueur: BA_nombre(resultat.stats?.esquivesJoueur, 0)
                };
            });

        const victoires =
            lignes.filter(ligne => ligne.resultat === "victoire").length;

        const defaites =
            lignes.filter(ligne => ligne.resultat === "defaite").length;

        const limites =
            lignes.filter(ligne => ligne.resultat === "limite_actions").length;

        return {
            total,
            victoires,
            defaites,
            limites,
            tauxVictoire: total ? victoires / total * 100 : 0,
            tauxDefaite: total ? defaites / total * 100 : 0,
            tauxLimite: total ? limites / total * 100 : 0,
            toursMoyens: BA_moyenne(lignes, "tours"),
            actionsJoueurMoyennes: BA_moyenne(lignes, "actionsJoueur"),
            actionsEnnemiMoyennes: BA_moyenne(lignes, "actionsEnnemi"),
            degatsInfligesMoyens: BA_moyenne(lignes, "degatsInfliges"),
            degatsRecusMoyens: BA_moyenne(lignes, "degatsRecus"),
            potionsMoyennes: BA_moyenne(lignes, "potionsUtilisees"),
            pvJoueurRestantsMoyens: BA_moyenne(lignes, "pvJoueurRestants"),
            pvEnnemiRestantsMoyens: BA_moyenne(lignes, "pvEnnemiRestants"),
            critiquesJoueurMoyens: BA_moyenne(lignes, "critiquesJoueur"),
            esquivesJoueurMoyennes: BA_moyenne(lignes, "esquivesJoueur")
        };
    }

    function BA_objectifPourCas(cas) {
        const base =
            BA_OBJECTIFS_BASE[cas.menace] || BA_OBJECTIFS_BASE.normal;

        // Si le monstre est plus haut niveau, le taux de victoire attendu baisse.
        // Si le monstre est plus bas niveau, le taux de victoire attendu monte.
        const ajustement =
            -cas.delta * 5;

        return {
            min: BA_clamp(base.min + ajustement, 1, 98),
            max: BA_clamp(base.max + ajustement, 2, 99)
        };
    }

    function BA_diagnostiquerCas(cas, stats, rapport) {
        const objectif =
            BA_objectifPourCas(cas);

        const taux =
            BA_nombre(stats.tauxVictoire, 0);

        const pvMaxJoueur =
            BA_nombre(rapport?.joueur?.pvMax, 0);

        const ratioDegatsRecus =
            pvMaxJoueur > 0
                ? stats.degatsRecusMoyens / pvMaxJoueur * 100
                : 0;

        let statut = "OK";
        const alertes = [];

        if (taux >= objectif.max + 5) {
            statut = "TROP_FACILE";
            alertes.push("victoire trop haute");
        }

        if (taux <= objectif.min - 5) {
            statut = "TROP_DUR";
            alertes.push("victoire trop basse");
        }

        if (stats.toursMoyens > 40) {
            alertes.push("combat beaucoup trop long");
        } else if (stats.toursMoyens > 25) {
            alertes.push("combat long");
        }

        if (stats.tauxLimite > 2) {
            statut = "LIMITE_ACTIONS";
            alertes.push("limites actions");
        }

        if (cas.niveauJoueur <= 5 && ["normal", "fort"].includes(cas.menace) && taux > 92) {
            statut = "EARLY_TROP_SAFE";
            alertes.push("early game trop safe");
        }

        if (cas.menace === "faible" && taux >= 98 && ratioDegatsRecus < 45) {
            statut = statut === "OK" ? "FAIBLE_TROP_GRATUIT" : statut;
            alertes.push("menace faible trop gratuite");
        }

        if (cas.menace === "normal" && taux >= 84 && ratioDegatsRecus < 70) {
            // v0.9.0 :
            // En v0.8.9, normal est revenu dans la cible globale.
            // On ne le marque trop gratuit que s'il est vraiment trop haut ET peu coûteux.
            statut = statut === "OK" ? "NORMAL_TROP_GRATUIT" : statut;
            alertes.push("menace normale trop gratuite");
        }

        if (cas.niveauJoueur <= 5 && cas.menace === "normal" && taux < 35) {
            statut = "EARLY_TROP_PUNITIF";
            alertes.push("early game trop punitif");
        }

        if (cas.niveauJoueur >= 25 && ["boss", "mini_boss"].includes(cas.menace) && cas.delta >= 0 && taux > 85) {
            statut = "ENDGAME_GODMODE";
            alertes.push("fin de jeu trop god mode");
        }

        if (ratioDegatsRecus < 12 && taux > 90 && cas.menace !== "faible") {
            alertes.push("dégâts reçus trop faibles");
        }

        if (ratioDegatsRecus > 180) {
            if (cas.potionsMax > 0 && stats.toursMoyens > 8) {
                statut = statut === "OK" ? "COMBAT_COUTEUX" : statut;
                alertes.push("combat très coûteux avec potions");
            } else {
                statut = statut === "OK" ? "BURST_EXCESSIF" : statut;
                alertes.push("burst ennemi beaucoup trop violent");
            }
        } else if (ratioDegatsRecus > 120 && taux < 35) {
            alertes.push(cas.potionsMax > 0 ? "combat coûteux" : "burst/tank ennemi excessif");
        }

        if (stats.toursMoyens <= 2 && taux <= 5 && cas.menace !== "boss") {
            statut = statut === "OK" ? "MORT_TROP_RAPIDE" : statut;
            alertes.push("mort trop rapide");
        }

        return {
            statut,
            objectifMin: objectif.min,
            objectifMax: objectif.max,
            ratioDegatsRecus,
            alertes
        };
    }

    async function BA_executerCas(cas, config) {
        BA_preparerProfilPourCas(cas, config);

        const monstre =
            BA_genererMonstrePourCas(cas);

        if (typeof window.lancerSimulationCombatAutomatisee !== "function") {
            throw new Error("lancerSimulationCombatAutomatisee introuvable. Vérifie que Combats.js et Profils_Equipements_Simulateur.js sont chargés.");
        }

        const rapport =
            window.lancerSimulationCombatAutomatisee(
                monstre,
                {
                    nombreCombats: config.combatsParCas,
                    strategieJoueur: config.strategieJoueur,
                    potionsMax: cas.potionsMax,
                    idPotion: config.potionId,
                    logsComplets: false,
                    profilEquipementId: cas.profilId
                }
            );

        const stats =
            BA_extraireStatsRapport(rapport);

        const diagnostic =
            BA_diagnostiquerCas(cas, stats, rapport);

        return {
            ...cas,

            monstreId: monstre.id,
            monstreNom: monstre.nom,
            monstreStats: {
                pvMax: monstre.pvMax,
                attaque: monstre.attaque,
                defense: monstre.defense,
                attaqueMagique: monstre.attaqueMagique,
                defenseMagique: monstre.defenseMagique,
                critique: monstre.critique,
                esquive: monstre.esquive,
                vitesse: monstre.vitesse
            },

            joueurNom: rapport?.joueur?.nom || cas.profilNom,
            joueurStats: {
                pvMax: rapport?.joueur?.pvMax,
                manaMax: rapport?.joueur?.manaMax,
                staminaMax: rapport?.joueur?.staminaMax,
                attaquePhysique: rapport?.joueur?.attaquePhysique,
                defensePhysique: rapport?.joueur?.defensePhysique,
                attaqueMagique: rapport?.joueur?.attaqueMagique,
                defenseMagique: rapport?.joueur?.defenseMagique,
                critique: rapport?.joueur?.critique,
                esquive: rapport?.joueur?.esquive,
                vitesse: rapport?.joueur?.vitesse
            },

            stats,
            diagnostic
        };
    }

    function BA_grouper(resultats, cle) {
        const groupes = {};

        resultats.forEach(resultat => {
            const valeur =
                typeof cle === "function"
                    ? cle(resultat)
                    : resultat[cle];

            const id =
                String(valeur === undefined || valeur === null ? "inconnu" : valeur);

            groupes[id] = groupes[id] || [];
            groupes[id].push(resultat);
        });

        return groupes;
    }

    function BA_resumeGroupe(liste) {
        if (!Array.isArray(liste) || liste.length === 0) {
            return {
                cas: 0,
                victoire: 0,
                tours: 0,
                degats: 0,
                tropFacile: 0,
                tropDur: 0,
                ok: 0
            };
        }

        return {
            cas: liste.length,
            victoire: BA_moyenne(liste.map(item => ({ valeur: item.stats.tauxVictoire })), "valeur"),
            tours: BA_moyenne(liste.map(item => ({ valeur: item.stats.toursMoyens })), "valeur"),
            degats: BA_moyenne(liste.map(item => ({ valeur: item.diagnostic.ratioDegatsRecus })), "valeur"),
            tropFacile: liste.filter(item => ["TROP_FACILE", "EARLY_TROP_SAFE", "ENDGAME_GODMODE"].includes(item.diagnostic.statut)).length,
            tropDur: liste.filter(item => ["TROP_DUR", "EARLY_TROP_PUNITIF"].includes(item.diagnostic.statut)).length,
            ok: liste.filter(item => item.diagnostic.statut === "OK").length
        };
    }

    function BA_ligneGroupe(nom, resume) {
        return [
            String(nom).padEnd(20, " "),
            String(resume.cas).padStart(4, " "),
            `${BA_arrondir(resume.victoire, 1)}%`.padStart(8, " "),
            `${BA_arrondir(resume.tours, 1)}`.padStart(8, " "),
            `${BA_arrondir(resume.degats, 1)}%`.padStart(10, " "),
            String(resume.ok).padStart(5, " "),
            String(resume.tropFacile).padStart(8, " "),
            String(resume.tropDur).padStart(8, " ")
        ].join(" | ");
    }

    function BA_tableGroupes(titre, groupes) {
        const lignes = [];
        lignes.push(titre);
        lignes.push("-".repeat(titre.length));
        lignes.push("Groupe               |  Cas | Vict. moy |  Tours | Dégâts PV% |    OK | Faciles |    Durs");
        lignes.push("-".repeat(92));

        Object.entries(groupes)
            .sort((a, b) => String(a[0]).localeCompare(String(b[0]), "fr", { numeric: true }))
            .forEach(([nom, liste]) => {
                lignes.push(
                    BA_ligneGroupe(
                        nom,
                        BA_resumeGroupe(liste)
                    )
                );
            });

        lignes.push("");
        return lignes.join("\n");
    }

    function BA_ligneCas(resultat) {
        const stats = resultat.stats;
        const diag = resultat.diagnostic;

        return [
            String(resultat.index).padStart(4, " "),
            String(resultat.profilNom).slice(0, 34).padEnd(34, " "),
            String(resultat.templateId).padEnd(12, " "),
            String(resultat.menace).padEnd(9, " "),
            `J${resultat.niveauJoueur}/M${resultat.niveauMonstre}`.padEnd(9, " "),
            `${BA_arrondir(stats.tauxVictoire, 1)}%`.padStart(7, " "),
            `${BA_arrondir(stats.toursMoyens, 1)}`.padStart(6, " "),
            `${BA_arrondir(diag.ratioDegatsRecus, 1)}%`.padStart(9, " "),
            String(resultat.potionsMax).padStart(3, " "),
            String(diag.statut).padEnd(18, " "),
            diag.alertes.join(", ")
        ].join(" | ");
    }

    function BA_genererRapportTXT(resultats, config, dureeMs) {
        const date =
            new Date().toISOString();

        const totalCas =
            resultats.length;

        const totalCombats =
            totalCas * config.combatsParCas;

        const tropFacile =
            resultats.filter(item => ["TROP_FACILE", "EARLY_TROP_SAFE", "ENDGAME_GODMODE"].includes(item.diagnostic.statut));

        const tropDur =
            resultats.filter(item => ["TROP_DUR", "EARLY_TROP_PUNITIF"].includes(item.diagnostic.statut));

        const ok =
            resultats.filter(item => item.diagnostic.statut === "OK");

        const longs =
            resultats.filter(item => item.stats.toursMoyens > 25);

        const limites =
            resultats.filter(item => item.stats.tauxLimite > 0);

        const lignes = [];

        lignes.push("NIGHTVENTURE — RAPPORT GLOBAL DE BALANCE");
        lignes.push("========================================");
        lignes.push("");
        lignes.push("INFORMATIONS");
        lignes.push("------------");
        lignes.push(`Date : ${date}`);
        lignes.push(`Automatiseur : ${BA_VERSION}`);
        lignes.push(`Preset : ${config.preset}`);
        lignes.push(`Mode templates : ${config.modeTemplates}`);
        lignes.push(`Combats par cas : ${config.combatsParCas}`);
        if (config.combatsParCas < 30) {
            lignes.push("Fiabilité : faible — utiliser surtout les moyennes de groupe, pas les lignes individuelles.");
        } else if (config.combatsParCas < 100) {
            lignes.push("Fiabilité : correcte — les moyennes de groupe sont utiles, quelques cas individuels restent bruités.");
        } else {
            lignes.push("Fiabilité : bonne — les résultats individuels sont plus exploitables.");
        }
        lignes.push(`Cas simulés : ${totalCas}`);
        lignes.push(`Combats totaux simulés : ${totalCombats}`);
        lignes.push(`Durée calcul : ${dureeMs} ms`);
        lignes.push(`Stratégie joueur : ${config.strategieJoueur}`);
        lignes.push(`Potions testées : ${config.potions.join(", ")}`);
        lignes.push(`Niveau monstre max : ${config.niveauMonstreMax}`);
        lignes.push(`Regénérer équipement par cas : ${config.regenererStuffParCas ? "oui" : "non"}`);
        lignes.push("");

        lignes.push("RÉSUMÉ GLOBAL");
        lignes.push("-------------");
        lignes.push(`Cas OK : ${ok.length} / ${totalCas}`);
        lignes.push(`Cas trop faciles : ${tropFacile.length} / ${totalCas}`);
        lignes.push(`Cas trop durs : ${tropDur.length} / ${totalCas}`);
        lignes.push(`Cas longs (>25 tours) : ${longs.length} / ${totalCas}`);
        lignes.push(`Cas avec limite actions : ${limites.length} / ${totalCas}`);
        lignes.push("");

        const tauxOk =
            totalCas > 0
                ? ok.length / totalCas * 100
                : 0;

        lignes.push("LECTURE RAPIDE");
        lignes.push("--------------");

        if (tauxOk >= 65 && tropFacile.length < totalCas * 0.20 && tropDur.length < totalCas * 0.20) {
            lignes.push("Diagnostic automatique : balance globalement proche des objectifs demandés, à affiner par classes/templates.");
        } else {
            lignes.push("Diagnostic automatique : balance encore instable.");
        }

        if (tropFacile.length > tropDur.length * 1.5) {
            lignes.push("Tendance principale : le jeu semble encore trop facile sur beaucoup de cas.");
        } else if (tropDur.length > tropFacile.length * 1.5) {
            lignes.push("Tendance principale : le jeu semble trop punitif sur beaucoup de cas.");
        } else {
            lignes.push("Tendance principale : les cas trop faciles et trop durs sont relativement équilibrés.");
        }

        if (longs.length > totalCas * 0.15) {
            lignes.push("Alerte : beaucoup de combats durent trop longtemps. Vérifier PV/défense/esquive.");
        }

        lignes.push("Lecture v0.9.3.3 : menaces/templates conservés ; surveiller le creux de progression niveau 12-15.");

        if (limites.length > 0) {
            lignes.push("Alerte : certaines simulations atteignent la limite d'actions. C'est généralement mauvais signe.");
        }

        lignes.push("");

        lignes.push(
            BA_tableGroupes(
                "PAR NIVEAU JOUEUR",
                BA_grouper(resultats, item => `niv.${item.niveauJoueur}`)
            )
        );

        lignes.push(
            BA_tableGroupes(
                "PAR CLASSE",
                BA_grouper(resultats, "classe")
            )
        );

        lignes.push(
            BA_tableGroupes(
                "PAR TYPE DE MENACE",
                BA_grouper(resultats, "menace")
            )
        );

        lignes.push(
            BA_tableGroupes(
                "PAR POTIONS AUTORISÉES",
                BA_grouper(resultats, item => {
                    return `${item.potionsMax} potion${item.potionsMax > 1 ? "s" : ""}`;
                })
            )
        );

        lignes.push(
            BA_tableGroupes(
                "PAR TEMPLATE MONSTRE",
                BA_grouper(resultats, "templateId")
            )
        );

        lignes.push(
            BA_tableGroupes(
                "PAR ÉCART DE NIVEAU",
                BA_grouper(resultats, item => {
                    return item.delta >= 0 ? `+${item.delta}` : String(item.delta);
                })
            )
        );

        function top(titre, liste, tri, limite) {
            lignes.push(titre);
            lignes.push("-".repeat(titre.length));
            lignes.push("   # | Profil joueur                     | Template     | Menace    | Niveaux   |  Vict. | Tours | DégâtsPV | Pot | Diagnostic         | Alertes");
            lignes.push("-".repeat(170));

            liste.slice()
                .sort(tri)
                .slice(0, limite || 20)
                .forEach(resultat => {
                    lignes.push(BA_ligneCas(resultat));
                });

            lignes.push("");
        }

        top(
            "TOP CAS LES PLUS FACILES",
            resultats,
            (a, b) => b.stats.tauxVictoire - a.stats.tauxVictoire,
            25
        );

        top(
            "TOP CAS LES PLUS DURS",
            resultats,
            (a, b) => a.stats.tauxVictoire - b.stats.tauxVictoire,
            25
        );

        top(
            "TOP CAS LES PLUS LONGS",
            resultats,
            (a, b) => b.stats.toursMoyens - a.stats.toursMoyens,
            25
        );

        top(
            "TOP CAS OÙ LE JOUEUR PREND LE PLUS DE DÉGÂTS",
            resultats,
            (a, b) => b.diagnostic.ratioDegatsRecus - a.diagnostic.ratioDegatsRecus,
            25
        );

        lignes.push("TOUS LES CAS SIMULÉS");
        lignes.push("--------------------");
        lignes.push("   # | Profil joueur                     | Template     | Menace    | Niveaux   |  Vict. | Tours | DégâtsPV | Pot | Diagnostic         | Alertes");
        lignes.push("-".repeat(170));

        resultats.forEach(resultat => {
            lignes.push(BA_ligneCas(resultat));
        });

        lignes.push("");
        lignes.push("NOTES POUR ANALYSE");
        lignes.push("------------------");
        lignes.push("- Vict. = taux de victoire joueur.");
        lignes.push("- DégâtsPV = dégâts reçus moyens en % des PV max du joueur.");
        lignes.push("- Les objectifs sont volontairement durs : le jeu doit faire galérer, surtout au début.");
        lignes.push("- Ce rapport ne contient pas les logs action par action.");
        lignes.push("- Il est conçu pour être donné directement à ChatGPT pour diagnostic de balance.");
        lignes.push("");

        return lignes.join("\n");
    }

    function BA_mettreAJourEstimation() {
        const element =
            document.getElementById("baEstimation");

        if (!element) return;

        try {
            const config = BA_lireConfigDepuisUI();
            const cas = BA_genererCas(config);

            element.innerHTML = `
                <div class="ba-mini-stats">
                    <div class="ba-mini-stat">
                        <span>Cas simulés</span>
                        <strong>${BA_h(cas.length)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Combats totaux</span>
                        <strong>${BA_h(cas.length * config.combatsParCas)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Profils</span>
                        <strong>${BA_h(BA_obtenirProfilsPreset(config.preset).length)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Potions</span>
                        <strong>${BA_h(config.potions.join(", "))}</strong>
                    </div>
                </div>
            `;
        } catch (erreur) {
            element.innerHTML =
                `<p class="texte-danger">Erreur estimation : ${BA_h(erreur.message)}</p>`;
        }
    }

    async function BA_lancerCampagneDepuisUI() {
        if (Game.automatiseurBalance.enCours) {
            ajouterJournal?.("⚠ Une campagne de balance est déjà en cours.");
            return;
        }

        const config =
            BA_lireConfigDepuisUI();

        const cas =
            BA_genererCas(config);

        if (cas.length === 0) {
            alert("Aucun cas à simuler.");
            return;
        }

        Game.automatiseurBalance.enCours = true;
        Game.automatiseurBalance.derniersResultats = [];
        Game.automatiseurBalance.dernierRapportTXT = "";

        const debut =
            Date.now();

        const progressFill =
            document.getElementById("baProgressFill");

        const progressText =
            document.getElementById("baProgressText");

        const log =
            document.getElementById("baLog");

        const bouton =
            document.getElementById("baBtnLancer");

        if (bouton) {
            bouton.disabled = true;
            bouton.textContent = "⏳ Simulation en cours...";
        }

        if (log) {
            log.textContent =
                `Démarrage campagne ${config.preset}...\nCas : ${cas.length}\nCombats totaux : ${cas.length * config.combatsParCas}\n\n`;
        }

        const resultats = [];

        try {
            for (let index = 0; index < cas.length; index++) {
                const casCourant = cas[index];

                const resultat =
                    await BA_executerCas(
                        casCourant,
                        config
                    );

                resultats.push(resultat);

                if (index % 3 === 0 || index === cas.length - 1) {
                    const pourcentage =
                        (index + 1) / cas.length * 100;

                    if (progressFill) {
                        progressFill.style.width =
                            `${pourcentage.toFixed(1)}%`;
                    }

                    if (progressText) {
                        progressText.textContent =
                            `${index + 1} / ${cas.length} cas — ${pourcentage.toFixed(1)}%`;
                    }

                    if (log) {
                        log.textContent +=
                            `[${index + 1}/${cas.length}] ${resultat.profilNom} vs ${resultat.monstreNom} — ${BA_arrondir(resultat.stats.tauxVictoire, 1)}% win — ${resultat.diagnostic.statut}\n`;

                        log.scrollTop =
                            log.scrollHeight;
                    }

                    await BA_pause(0);
                }
            }

            const dureeMs =
                Date.now() - debut;

            const rapportTXT =
                BA_genererRapportTXT(
                    resultats,
                    config,
                    dureeMs
                );

            Game.automatiseurBalance.derniersResultats = resultats;
            Game.automatiseurBalance.dernierRapportTXT = rapportTXT;
            Game.automatiseurBalance.derniereCampagne = {
                config,
                date: new Date().toISOString(),
                dureeMs,
                cas: resultats.length
            };

            const nomFichier =
                `NightVenture_rapport_balance_${config.preset}_${Date.now()}.txt`;

            BA_telechargerTexte(
                nomFichier,
                rapportTXT
            );

            if (log) {
                log.textContent +=
                    `\n✅ Campagne terminée.\nFichier téléchargé : ${nomFichier}\n`;
            }

            BA_afficherSyntheseFinale(resultats, config, dureeMs);

        } catch (erreur) {
            console.error(erreur);

            if (log) {
                log.textContent +=
                    `\n❌ ERREUR : ${erreur.message}\n`;
            }

            alert(`Erreur pendant l'automatisation : ${erreur.message}`);
        } finally {
            Game.automatiseurBalance.enCours = false;

            if (bouton) {
                bouton.disabled = false;
                bouton.textContent = "🚀 Lancer la campagne et télécharger le TXT";
            }
        }
    }

    function BA_afficherSyntheseFinale(resultats, config, dureeMs) {
        const conteneur =
            document.getElementById("baSyntheseFinale");

        if (!conteneur) return;

        const total =
            resultats.length;

        const ok =
            resultats.filter(item => item.diagnostic.statut === "OK").length;

        const faciles =
            resultats.filter(item => ["TROP_FACILE", "EARLY_TROP_SAFE", "ENDGAME_GODMODE"].includes(item.diagnostic.statut)).length;

        const durs =
            resultats.filter(item => ["TROP_DUR", "EARLY_TROP_PUNITIF"].includes(item.diagnostic.statut)).length;

        const longs =
            resultats.filter(item => item.stats.toursMoyens > 25).length;

        conteneur.innerHTML = `
            <div class="item-card">
                <h3>✅ Synthèse finale</h3>

                <div class="ba-mini-stats">
                    <div class="ba-mini-stat">
                        <span>Cas</span>
                        <strong>${BA_h(total)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>OK</span>
                        <strong>${BA_h(ok)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Trop faciles</span>
                        <strong>${BA_h(faciles)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Trop durs</span>
                        <strong>${BA_h(durs)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Combats longs</span>
                        <strong>${BA_h(longs)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Durée</span>
                        <strong>${BA_h(dureeMs)} ms</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Combats/cas</span>
                        <strong>${BA_h(config.combatsParCas)}</strong>
                    </div>
                    <div class="ba-mini-stat">
                        <span>Preset</span>
                        <strong>${BA_h(config.preset)}</strong>
                    </div>
                </div>

                <div class="ba-actions">
                    <button onclick="BA_telechargerDernierRapport()">
                        📄 Retélécharger le dernier rapport TXT
                    </button>
                </div>
            </div>
        `;
    }

    function BA_telechargerDernierRapport() {
        const rapport =
            Game.automatiseurBalance.dernierRapportTXT || "";

        if (!rapport.trim()) {
            alert("Aucun rapport disponible.");
            return;
        }

        BA_telechargerTexte(
            `NightVenture_rapport_balance_${Date.now()}.txt`,
            rapport
        );
    }

    function ouvrirAutomatiseurBalance() {
        BA_injecterStyle();

        if (typeof changerVue === "function") {
            changerVue("automatiseur_balance");
        } else if (Game.ui) {
            Game.ui.vueActive = "automatiseur_balance";
        }

        const titre =
            document.getElementById("titreVuePrincipale");

        if (titre) {
            titre.textContent =
                "📊 Automatiseur de balance";
        }

        const vue =
            document.getElementById("vuePrincipale");

        if (!vue) {
            alert("vuePrincipale introuvable.");
            return;
        }

        vue.innerHTML = `
            <section class="item-card">
                <h2>📊 Automatiseur de simulateur</h2>

                <p>
                    Cet outil lance une campagne complète de simulations :
                    profils joueur, classes, niveaux, équipements, monstres procéduraux,
                    menaces et écarts de niveau. À la fin, il télécharge un seul fichier TXT.
                </p>

                <p>
                    <strong>Conseil :</strong>
                    commence avec le preset <strong>rapide</strong>, puis passe à
                    <strong>standard</strong> quand tout fonctionne.
                </p>
            </section>

            <section class="item-card">
                <h3>⚙ Réglages de campagne</h3>

                <div class="ba-grid">
                    <label>
                        Preset de campagne
                        <select id="baPreset" onchange="BA_mettreAJourEstimation()">
                            <option value="rapide">Rapide — validation express</option>
                            <option value="standard" selected>Standard — recommandé</option>
                            <option value="profond">Profond — gros rapport</option>
                        </select>
                    </label>

                    <label>
                        Couverture des templates
                        <select id="baModeTemplates" onchange="BA_mettreAJourEstimation()">
                            <option value="rotation" selected>Rotation — 1 template par scénario</option>
                            <option value="representatif">Représentatif — 3 templates par scénario</option>
                            <option value="complet">Complet — tous les templates</option>
                        </select>
                    </label>

                    <label>
                        Combats par cas
                        <input id="baCombatsParCas" type="number" min="10" max="5000" value="200" onchange="BA_mettreAJourEstimation()">
                    </label>

                    <label>
                        Potions testées
                        <select id="baPotionsPreset" onchange="BA_mettreAJourEstimation()">
                            <option value="0" selected>0 potion seulement</option>
                            <option value="0_1">0 et 1 potion</option>
                            <option value="0_1_3">0, 1 et 3 potions</option>
                        </select>
                    </label>

                    <label>
                        Stratégie joueur
                        <select id="baStrategieJoueur">
                            <option value="prudent" selected>Prudent</option>
                            <option value="agressif">Agressif</option>
                            <option value="defensif">Défensif</option>
                        </select>
                    </label>

                    <label>
                        ID potion simulée
                        <input id="baPotionId" type="text" value="potion_soin">
                    </label>

                    <label>
                        Niveau max monstre
                        <input id="baNiveauMonstreMax" type="number" min="1" max="500" value="35" onchange="BA_mettreAJourEstimation()">
                    </label>

                    <label>
                        Diversité équipement
                        <span>
                            <input id="baRegenererStuff" type="checkbox" checked onchange="BA_mettreAJourEstimation()">
                            Régénérer le set d'équipement à chaque cas
                        </span>
                    </label>
                </div>

                <div id="baEstimation"></div>

                <div class="ba-actions">
                    <button id="baBtnLancer" onclick="BA_lancerCampagneDepuisUI()">
                        🚀 Lancer la campagne et télécharger le TXT
                    </button>

                    <button onclick="BA_telechargerDernierRapport()">
                        📄 Retélécharger dernier rapport
                    </button>
                </div>
            </section>

            <section class="item-card ba-progress-wrap">
                <h3>Progression</h3>

                <div class="ba-progress-bar">
                    <div id="baProgressFill" class="ba-progress-fill"></div>
                </div>

                <p id="baProgressText">En attente.</p>

                <pre id="baLog" class="ba-log">Aucune campagne lancée.</pre>
            </section>

            <div id="baSyntheseFinale"></div>
        `;

        BA_mettreAJourEstimation();
    }

    function BA_verifierInstallation() {
        const etat = {
            version: BA_VERSION,
            Game: Boolean(window.Game),
            simulateur: typeof window.lancerSimulationCombatAutomatisee === "function",
            generateurMonstres: typeof window.genererMonstreProcedural === "function",
            profils: typeof window.PEQ_creerDetailsProfil === "function",
            nombreProfils: BA_obtenirTousProfils().length,
            bouton: Boolean(document.getElementById("btnAutomatiseurBalance"))
        };

        console.table(etat);
        return etat;
    }

    window.ouvrirAutomatiseurBalance = ouvrirAutomatiseurBalance;
    window.BA_lancerCampagneDepuisUI = BA_lancerCampagneDepuisUI;
    window.BA_mettreAJourEstimation = BA_mettreAJourEstimation;
    window.BA_telechargerDernierRapport = BA_telechargerDernierRapport;
    window.BA_verifierInstallation = BA_verifierInstallation;

    BA_injecterStyle();
    BA_injecterBoutonMenu();

    setTimeout(BA_injecterBoutonMenu, 0);
    setTimeout(BA_injecterBoutonMenu, 250);
    setTimeout(BA_injecterBoutonMenu, 1000);

    console.log("✅ Automatiseur_Balance.js chargé — diagnostic midgame smoothing " + BA_VERSION);
})();
