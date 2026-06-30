(function () {
    "use strict";

    const NV_REST_INN_VERSION = "v0.9.7.3-start-screen-safe";

    const NV_REST_STATE = {
        dernierRepos: null,
        intervalId: null
    };

    const NV_REST_CONFIG = {
        safeZoneTypes: ["village", "ville"],
        safeZoneIds: ["auberge_griffon", "place_marche", "tour_mage", "avant_poste_ouest", "sanctuaire_prelude"],
        baseCost: 8,
        costPerLevel: 3,
        missingResourceDivider: 18,
        restHours: 8,
        tickMs: 500
    };

    function NVR_hasGame() {
        return typeof Game !== "undefined" && Boolean(Game?.data?.personnage);
    }

    function NVR_isStartScreen() {
        return document.body.classList.contains("nv-start-mode");
    }

    function NVR_isExplorationView() {
        return Game?.ui?.vueActive === "exploration";
    }

    function NVR_zoneActuelle() {
        if (typeof obtenirZoneActuelle === "function") return obtenirZoneActuelle();
        const idZone = Game.data?.personnage?.zoneActuelle;
        return Game.cache?.zonesParId?.[idZone] || null;
    }

    function NVR_regionActuelle() {
        if (typeof obtenirRegionMondeActuelle === "function") return obtenirRegionMondeActuelle();
        const idRegion = Game.data?.personnage?.regionMondeActuelle;
        return (Game.data?.regionsMonde || []).find(region => region.id === idRegion) || null;
    }

    function NVR_isSafeZone(zone) {
        if (!zone) return false;
        return (
            NV_REST_CONFIG.safeZoneTypes.includes(zone.type) ||
            NV_REST_CONFIG.safeZoneIds.includes(zone.id) ||
            /auberge|sanctuaire|poste|marche|tour/i.test(zone.nom || "")
        );
    }

    function NVR_pvMax() {
        if (typeof pvMaxTotal === "function") return Math.max(1, Number(pvMaxTotal() || 1));
        return Math.max(1, Number(Game.data.personnage.pvMax || Game.data.personnage.pv || 100));
    }

    function NVR_manaMax() {
        if (typeof manaMaxTotal === "function") return Math.max(1, Number(manaMaxTotal() || 1));
        return Math.max(1, Number(Game.data.personnage.manaMax || Game.data.personnage.mana || 50));
    }

    function NVR_staminaMax() {
        if (typeof staminaMaxTotal === "function") return Math.max(1, Number(staminaMaxTotal() || 1));
        return Math.max(1, Number(Game.data.personnage.staminaMax || Game.data.personnage.stamina || 100));
    }

    function NVR_xpMax() {
        if (typeof xpNiveauSuivant === "function") return Math.max(1, Number(xpNiveauSuivant() || 1));
        return 1;
    }

    function NVR_percent(valeur, maximum) {
        return maximum > 0 ? Math.max(0, Math.min(100, (Number(valeur || 0) / maximum) * 100)) : 0;
    }

    function NVR_missingResources() {
        const personnage = Game.data.personnage;
        return {
            pv: Math.max(0, NVR_pvMax() - Number(personnage.pv || 0)),
            mana: Math.max(0, NVR_manaMax() - Number(personnage.mana || 0)),
            stamina: Math.max(0, NVR_staminaMax() - Number(personnage.stamina || 0))
        };
    }

    function NVR_costRest() {
        const personnage = Game.data.personnage;
        const missing = NVR_missingResources();
        const niveau = Math.max(1, Number(personnage.niveau || 1));
        const missingTotal = missing.pv + missing.mana + missing.stamina;
        return Math.max(1, Math.round(NV_REST_CONFIG.baseCost + niveau * NV_REST_CONFIG.costPerLevel + missingTotal / NV_REST_CONFIG.missingResourceDivider));
    }

    function NVR_estDejaFull() {
        const missing = NVR_missingResources();
        return missing.pv <= 0 && missing.mana <= 0 && missing.stamina <= 0;
    }

    function NVR_journal(message) {
        if (typeof ajouterJournal === "function") ajouterJournal(message);
    }

    function NVR_avancerTempsSansRefresh(heures = 0, minutes = 0) {
        const personnage = Game.data.personnage;
        personnage.minute = Number(personnage.minute || 0) + Number(minutes || 0);
        personnage.heure = Number(personnage.heure || 0) + Number(heures || 0);

        while (personnage.minute >= 60) {
            personnage.minute -= 60;
            personnage.heure++;
        }

        while (personnage.heure >= 24) {
            personnage.heure -= 24;
            personnage.jour = Number(personnage.jour || 1) + 1;
            if (typeof nouveauJour === "function") nouveauJour();
        }
    }

    function NVR_restaurerRessources() {
        const personnage = Game.data.personnage;
        personnage.pv = NVR_pvMax();
        personnage.mana = NVR_manaMax();
        personnage.stamina = NVR_staminaMax();
    }

    function NVR_majBarresHautSansRedraw() {
        const conteneur = document.getElementById("personnage");
        if (!conteneur || !NVR_hasGame()) return;

        const personnage = Game.data.personnage;
        const ressources = [
            { selecteur: ".barre-pv", valeur: Number(personnage.pv || 0), max: NVR_pvMax() },
            { selecteur: ".barre-mana", valeur: Number(personnage.mana || 0), max: NVR_manaMax() },
            { selecteur: ".barre-stamina", valeur: Number(personnage.stamina || 0), max: NVR_staminaMax() },
            { selecteur: ".barre-xp", valeur: Number(personnage.xp || 0), max: NVR_xpMax() }
        ];

        ressources.forEach(ressource => {
            const remplissage = conteneur.querySelector(ressource.selecteur);
            if (!remplissage) return;

            const barre = remplissage.closest(".barre");
            if (!barre) return;

            const pourcentage = NVR_percent(ressource.valeur, ressource.max);
            remplissage.style.width = `${pourcentage}%`;

            const valeur = barre.querySelector(".barre__valeur");
            if (valeur) valeur.textContent = `${Math.round(ressource.valeur)} / ${ressource.max} (${Math.round(pourcentage)}%)`;
        });

        if (typeof NVS_injecterLabelsRegenDOM === "function") NVS_injecterLabelsRegenDOM();
    }

    function NVR_majInfosMondeSansRedraw() {
        const conteneur = document.getElementById("infosMondeSidebar");
        if (!conteneur || !NVR_hasGame()) return;

        const personnage = Game.data.personnage;
        const region = NVR_regionActuelle()?.nom || "Region inconnue";
        const zone = NVR_zoneActuelle()?.nom || "Zone inconnue";
        const heure = Number(personnage.heure || 0);
        const minute = Number(personnage.minute || 0);
        const periode = heure >= 6 && heure < 18 ? "Jour" : "Nuit";
        const heureAffichee = `${heure}h${String(minute).padStart(2, "0")}`;

        conteneur.innerHTML = `
            <div class="infos-monde-sidebar__region">${region}</div>
            <div class="infos-monde-sidebar__zone">${zone}</div>
            <div class="infos-monde-sidebar__details">
                <span>${personnage.or ?? 0} or</span>
                <span>${periode}</span>
                <span>Jour ${personnage.jour ?? 1} - ${heureAffichee}</span>
            </div>
        `;
    }

    function NVR_majPersonnageMinimalSansRedraw() {
        NVR_majBarresHautSansRedraw();
        NVR_majInfosMondeSansRedraw();
        if (typeof NVBU_mettreAJourBoutonExplorer === "function") NVBU_mettreAJourBoutonExplorer();
    }

    function NVR_seReposer() {
        if (!NVR_hasGame()) return;
        const zone = NVR_zoneActuelle();

        if (!NVR_isExplorationView() || NVR_isStartScreen()) {
            NVR_retirerCardRepos();
            return;
        }

        if (!NVR_isSafeZone(zone)) {
            NVR_journal("Tu dois etre dans une zone sure pour te reposer.");
            NVR_retirerCardRepos();
            return;
        }

        if (Game?.combat?.actif) {
            NVR_journal("Impossible de se reposer en combat.");
            return;
        }

        const cout = NVR_costRest();
        const personnage = Game.data.personnage;

        if (Number(personnage.or || 0) < cout) {
            NVR_journal(`Repos impossible : il faut ${cout} or.`);
            NVR_majCardRepos();
            return;
        }

        if (NVR_estDejaFull()) {
            NVR_journal("Tu es deja parfaitement repose.");
            NVR_majCardRepos();
            return;
        }

        personnage.or = Math.max(0, Number(personnage.or || 0) - cout);
        NVR_restaurerRessources();
        NVR_avancerTempsSansRefresh(NV_REST_CONFIG.restHours, 0);
        NV_REST_STATE.dernierRepos = { zoneId: zone?.id, cout, jour: personnage.jour, heure: personnage.heure, minute: personnage.minute };

        NVR_journal(`Repos a ${zone?.nom || "l'auberge"} : ressources restaurees. -${cout} or.`);
        NVR_majPersonnageMinimalSansRedraw();
        NVR_majCardRepos();

        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("rest inn");
    }

    function NVR_resumeManques() {
        const missing = NVR_missingResources();
        const parties = [];
        if (missing.pv > 0) parties.push(`PV +${Math.round(missing.pv)}`);
        if (missing.mana > 0) parties.push(`Mana +${Math.round(missing.mana)}`);
        if (missing.stamina > 0) parties.push(`Stamina +${Math.round(missing.stamina)}`);
        return parties.length ? parties.join(" - ") : "Ressources au maximum";
    }

    function NVR_htmlCard() {
        const zone = NVR_zoneActuelle();
        if (NVR_isStartScreen() || !NVR_isExplorationView() || !NVR_isSafeZone(zone)) return "";

        return `
            <div id="nvRestInnCard" class="nv-rest-inn-compact">
                <div class="nv-rest-inn-compact__main">
                    <strong>Repos</strong>
                    <span id="nvRestInnSummary">Ressources au maximum</span>
                </div>
                <div class="nv-rest-inn-compact__actions">
                    <span id="nvRestInnCost">0 or</span>
                    <button id="nvRestInnButton" class="nv-rest-inn-button" onclick="NVR_seReposer()">Se reposer</button>
                </div>
            </div>
        `;
    }

    function NVR_retirerCardRepos() {
        document.getElementById("nvRestInnCard")?.remove();
    }

    function NVR_creerOuTrouverCardRepos() {
        if (!NVR_hasGame() || NVR_isStartScreen()) {
            NVR_retirerCardRepos();
            return null;
        }

        const conteneur = document.getElementById("vuePrincipale");
        if (!conteneur) return null;

        const zone = NVR_zoneActuelle();
        if (!NVR_isExplorationView() || !NVR_isSafeZone(zone)) {
            NVR_retirerCardRepos();
            return null;
        }

        let card = document.getElementById("nvRestInnCard");
        if (card) return card;

        const html = NVR_htmlCard();
        if (!html) return null;

        const premiereCarte = conteneur.querySelector(".item-card");
        if (premiereCarte) premiereCarte.insertAdjacentHTML("afterend", html);
        else conteneur.insertAdjacentHTML("afterbegin", html);

        return document.getElementById("nvRestInnCard");
    }

    function NVR_majCardRepos() {
        if (!NVR_hasGame() || NVR_isStartScreen() || !NVR_isExplorationView()) {
            NVR_retirerCardRepos();
            return;
        }

        const card = NVR_creerOuTrouverCardRepos();
        if (!card) return;

        const cout = NVR_costRest();
        const full = NVR_estDejaFull();
        const or = Number(Game.data.personnage.or || 0);
        const possible = !full && or >= cout;

        const costNode = document.getElementById("nvRestInnCost");
        const button = document.getElementById("nvRestInnButton");
        const summary = document.getElementById("nvRestInnSummary");

        if (costNode) costNode.textContent = `${cout} or`;
        if (summary) summary.textContent = NVR_resumeManques();
        if (button) {
            button.disabled = !possible;
            button.textContent = full ? "Repos inutile" : or < cout ? "Pas assez d'or" : "Se reposer";
        }

        card.classList.toggle("nv-rest-inn-compact--ready", possible);
        card.classList.toggle("nv-rest-inn-compact--disabled", !possible);
    }

    function NVR_patchOuvrirExploration() {
        if (typeof ouvrirExploration !== "function" || ouvrirExploration.__NVR_REST_PATCH) return;
        const original = ouvrirExploration;
        ouvrirExploration = function () {
            const resultat = original();
            setTimeout(NVR_majCardRepos, 0);
            return resultat;
        };
        ouvrirExploration.__NVR_REST_PATCH = true;
    }

    function NVR_patchAfficherVuePrincipale() {
        if (typeof afficherVuePrincipale !== "function" || afficherVuePrincipale.__NVR_REST_PATCH) return;
        const original = afficherVuePrincipale;
        afficherVuePrincipale = function (html) {
            const resultat = original(html);
            setTimeout(NVR_majCardRepos, 0);
            return resultat;
        };
        afficherVuePrincipale.__NVR_REST_PATCH = true;
    }

    function NVR_demarrerTick() {
        if (NV_REST_STATE.intervalId) clearInterval(NV_REST_STATE.intervalId);
        NV_REST_STATE.intervalId = setInterval(NVR_majCardRepos, NV_REST_CONFIG.tickMs);
    }

    function NVR_injecterStyle() {
        if (document.getElementById("nvRestInnStyle")) return;
        const style = document.createElement("style");
        style.id = "nvRestInnStyle";
        style.textContent = `
            .nv-rest-inn-compact { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 8px 0 10px; padding: 8px 10px; border-radius: 12px; border: 1px solid rgba(245, 211, 122, 0.16); background: rgba(255,255,255,0.032); }
            .nv-rest-inn-compact__main { display: flex; flex-direction: column; min-width: 0; gap: 2px; }
            .nv-rest-inn-compact__main strong { color: var(--gold, #f5d37a); font-size: 0.94rem; line-height: 1.1; }
            .nv-rest-inn-compact__main span { color: var(--text-muted, #c7bdad); font-size: 0.78rem; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 520px; }
            .nv-rest-inn-compact__actions { display: flex; align-items: center; gap: 8px; flex: 0 0 auto; }
            #nvRestInnCost { padding: 4px 8px; border-radius: 999px; background: rgba(245, 211, 122, 0.10); border: 1px solid rgba(245, 211, 122, 0.22); color: var(--gold, #f5d37a); font-size: 0.78rem; font-weight: 800; white-space: nowrap; }
            .nv-rest-inn-button { padding: 6px 10px; min-height: 30px; font-size: 0.82rem; white-space: nowrap; }
            .nv-rest-inn-button:disabled { opacity: 0.55; cursor: not-allowed; filter: grayscale(0.25); }
            .nv-rest-inn-compact--ready { border-color: rgba(80, 220, 130, 0.22); }
            .nv-rest-inn-compact--ready .nv-rest-inn-compact__main strong { color: #9dffb8; }
            .nv-rest-inn-compact--disabled { opacity: 0.86; }
            @media (max-width: 720px) { .nv-rest-inn-compact { align-items: stretch; flex-direction: column; } .nv-rest-inn-compact__main span { white-space: normal; max-width: none; } .nv-rest-inn-compact__actions { justify-content: space-between; } }
        `;
        document.head.appendChild(style);
    }

    function NVR_installer() {
        if (!NVR_hasGame()) {
            setTimeout(NVR_installer, 120);
            return;
        }

        NVR_injecterStyle();
        NVR_patchOuvrirExploration();
        NVR_patchAfficherVuePrincipale();
        NVR_demarrerTick();
        setTimeout(NVR_majCardRepos, 0);
        console.log("Rest_Inn.js charge - " + NV_REST_INN_VERSION);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", NVR_installer);
    else NVR_installer();

    window.NV_REST_INN_VERSION = NV_REST_INN_VERSION;
    window.NV_REST_CONFIG = NV_REST_CONFIG;
    window.NV_REST_STATE = NV_REST_STATE;
    window.NVR_seReposer = NVR_seReposer;
    window.NVR_majCardRepos = NVR_majCardRepos;
})();
