/* NightVenture — Inventory Grid UI */
(function () {
    "use strict";

    const NVI_VERSION = "v0.9.9.14-inventory-grid-ui";
    const SLOT_COUNT = 72;

    function hasGame() { return typeof Game !== "undefined" && Game?.data?.personnage; }
    function esc(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
    function obj(id) { return typeof trouverObjet === "function" ? trouverObjet(id) : Game.cache?.objetsParId?.[id] || null; }
    function key(item) { return String(item?.uid || item?.instanceId || item?.id || ""); }
    function rare(o) { return typeof classeRarete === "function" ? classeRarete(o) : o?.rarete || "commun"; }
    function fav(id) { return typeof estFavori === "function" ? estFavori(id) : (Game.data.personnage.favoris || []).includes(id); }
    function norm(v) { return typeof normaliserTexte === "function" ? normaliserTexte(v) : String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }

    function ensureUi() {
        Game.ui.etatFiltresInventaire ??= { favoris: false, types: { arme: "neutre", armure: "neutre", accessoire: "neutre", consommable: "neutre", materiau: "neutre", quete: "neutre", divers: "neutre" } };
        Game.ui.etatFiltresInventaire.types ??= {};
        Game.ui.triInventaire ??= "nom";
        Game.ui.ordreTriInventaire ??= "asc";
        Game.ui.rechercheInventaire ??= "";
    }

    function typeOf(o) { return typeof obtenirTypeFiltreObjet === "function" ? obtenirTypeFiltreObjet(o) : o?.type || "divers"; }
    function visible(item) {
        const o = obj(item?.id);
        if (!o) return false;
        if (typeof objetPasseFiltre === "function" && !objetPasseFiltre(o)) return false;
        if (typeof objetPasseRecherche === "function" && !objetPasseRecherche(o)) return false;
        if (typeof objetPasseFiltre === "function" || typeof objetPasseRecherche === "function") return true;
        const t = typeOf(o);
        const state = Game.ui.etatFiltresInventaire?.types?.[t] || "neutre";
        if (state === "exclu") return false;
        const active = Object.entries(Game.ui.etatFiltresInventaire?.types || {}).filter(([, v]) => v === "actif").map(([k]) => k);
        if (active.length && !active.includes(t)) return false;
        if (Game.ui.etatFiltresInventaire?.favoris && !fav(o.id)) return false;
        const q = norm(Game.ui.rechercheInventaire || "");
        return !q || norm(`${o.nom || ""} ${o.description || ""} ${o.type || ""} ${o.rarete || ""}`).includes(q);
    }

    function syncSlots() {
        const p = Game.data.personnage;
        p.inventaire ??= [];
        p.inventaireSlots ??= {};
        p.inventaireVerrous ??= {};
        const used = new Set();
        const map = new Map();
        p.inventaire.forEach(item => {
            const k = key(item);
            const persisted = Number(p.inventaireSlots[k]);
            const current = Number(item.slot);
            let slot = Number.isInteger(persisted) && persisted >= 0 ? persisted : Number.isInteger(current) && current >= 0 ? current : null;
            if (slot === null || used.has(slot)) {
                for (let i = 0; i < Math.max(SLOT_COUNT, p.inventaire.length + 12); i++) if (!used.has(i)) { slot = i; break; }
            }
            item.slot = slot;
            if (k) p.inventaireSlots[k] = slot;
            used.add(slot);
            if (k && Object.prototype.hasOwnProperty.call(p.inventaireVerrous, k)) item.verrouille = Boolean(p.inventaireVerrous[k]);
            else if (k) p.inventaireVerrous[k] = Boolean(item.verrouille || item.locked || item.bloque);
            delete item.locked;
            delete item.bloque;
            map.set(slot, item);
        });
        return map;
    }

    function locked(item) {
        const k = key(item);
        return Boolean(Game.data.personnage.inventaireVerrous?.[k] || item?.verrouille);
    }

    function icon(o) {
        if (o?.image) return `<img src="${esc(o.image)}" alt="${esc(o.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">OBJ</span>`;
    }

    function itemHtml(item) {
        const o = obj(item.id);
        if (!o) return "";
        const lock = locked(item);
        return `<button type="button" class="nvi-item nvi-item--${esc(rare(o))} ${lock ? "nvi-item--locked" : ""}" draggable="false" title="${esc(o.nom || item.id)}" data-nvi-item-id="${esc(item.id)}">${fav(item.id) ? `<span class="nvi-item__favorite">Favori</span>` : ""}${lock ? `<span class="nvi-item__lock">Lock</span>` : ""}<span class="nvi-item__icon">${icon(o)}</span>${Number(item.quantite || 1) > 1 ? `<span class="nvi-item__qty">${Number(item.quantite || 1)}</span>` : ""}</button>`;
    }

    function gridHtml() {
        const map = syncSlots();
        const max = Math.max(...Array.from(map.keys()), 0);
        const total = Math.max(SLOT_COUNT, max + 9);
        let html = "";
        for (let i = 0; i < total; i++) {
            const item = map.get(i);
            const show = item ? visible(item) : false;
            html += `<div class="nvi-slot ${item ? "nvi-slot--occupied" : ""} ${item && !show ? "nvi-slot--filtered" : ""} ${item && locked(item) ? "nvi-slot--locked" : ""}" data-slot="${i}">${item && show ? itemHtml(item) : ""}</div>`;
        }
        return `<div class="nvi-grid nvi-grid--inventory" style="--nvi-columns:9;">${html}</div>`;
    }

    function filterState(id) {
        if (id === "favoris") return Game.ui.etatFiltresInventaire?.favoris ? "actif" : "neutre";
        if (id === "tous") return "neutre";
        return Game.ui.etatFiltresInventaire?.types?.[id] || "neutre";
    }

    function toolbarHtml() {
        const filters = Game.constants?.filtresInventaire || [{ id: "tous", nom: "Tous" }, { id: "favoris", nom: "Favoris" }, { id: "arme", nom: "Armes" }, { id: "armure", nom: "Armures" }, { id: "accessoire", nom: "Accessoires" }, { id: "consommable", nom: "Consommables" }, { id: "materiau", nom: "Materiaux" }, { id: "quete", nom: "Quetes" }, { id: "divers", nom: "Divers" }];
        const sorts = Game.constants?.trisInventaire || [{ id: "nom", nom: "Nom" }, { id: "type", nom: "Type" }, { id: "rarete", nom: "Rarete" }, { id: "niveau", nom: "Niveau" }, { id: "prix", nom: "Prix" }];
        return `<div class="nvi-toolbar"><div class="nvi-toolbar__top"><div><h2>Inventaire</h2><p>Inventaire refonte.</p></div><button onclick="NVI_triAutomatiqueInventaire()">Tri auto</button><button onclick="ouvrirExploration()">Retour</button></div><div class="nvi-toolbar__search-row"><input id="nviSearch" type="text" placeholder="Rechercher..." value="${esc(Game.ui.rechercheInventaire || "")}" oninput="NVI_changerRecherche(this.value)"><select onchange="NVI_changerTri(this.value)">${sorts.map(s => `<option value="${esc(s.id)}" ${Game.ui.triInventaire === s.id ? "selected" : ""}>${esc(s.nom)}</option>`).join("")}</select><button onclick="NVI_inverserOrdreTri()">${Game.ui.ordreTriInventaire === "asc" ? "ASC" : "DESC"}</button></div><div class="nvi-filters">${filters.map(f => `<button class="nvi-filter" data-etat="${filterState(f.id)}" onclick="NVI_changerFiltre('${esc(f.id)}')">${esc(f.nom)}</button>`).join("")}</div></div>`;
    }

    function renderHtml() {
        return `<section class="nvi-window">${toolbarHtml()}<div class="nvi-layout nvi-layout--inventory nvimp-no-details"><div class="nvi-panel"><div class="nvi-panel__title"><strong>Sac</strong><span>${(Game.data.personnage.inventaire || []).length} pile(s)</span></div>${gridHtml()}</div></div></section>`;
    }

    function openInventory() {
        if (!hasGame()) return;
        if (typeof changerVue === "function") changerVue("inventaire");
        ensureUi();
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(renderHtml());
    }

    function redraw() {
        if (!hasGame()) return;
        if (Game.ui.vueActive === "inventaire") afficherVuePrincipale(renderHtml());
        else if (Game.ui.vueActive === "marchand" && typeof NVM_redessinerVueActive === "function") NVM_redessinerVueActive();
    }

    function changeSearch(value) {
        Game.ui.rechercheInventaire = norm(value);
        redraw();
        setTimeout(() => { const input = document.getElementById("nviSearch"); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }, 0);
    }

    function changeSort(value) { Game.ui.triInventaire = value; redraw(); }
    function invertSort() { Game.ui.ordreTriInventaire = Game.ui.ordreTriInventaire === "asc" ? "desc" : "asc"; redraw(); }

    function changeFilter(id) {
        ensureUi();
        if (id === "tous") {
            if (typeof reinitialiserFiltresInventaire === "function") reinitialiserFiltresInventaire();
            else { Game.ui.etatFiltresInventaire.favoris = false; Object.keys(Game.ui.etatFiltresInventaire.types).forEach(k => Game.ui.etatFiltresInventaire.types[k] = "neutre"); }
        } else if (id === "favoris") Game.ui.etatFiltresInventaire.favoris = !Game.ui.etatFiltresInventaire.favoris;
        else {
            const current = Game.ui.etatFiltresInventaire.types[id] || "neutre";
            Game.ui.etatFiltresInventaire.types[id] = current === "neutre" ? "actif" : current === "actif" ? "exclu" : "neutre";
        }
        if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
        redraw();
    }

    function compareItems(a, b) {
        const A = obj(a.id), B = obj(b.id);
        if (!A || !B) return 0;
        const mode = Game.ui.triInventaire || "nom";
        let r = 0;
        if (mode === "type") r = String(A.type || "").localeCompare(String(B.type || ""));
        else if (mode === "prix") r = (B.prix || 0) - (A.prix || 0);
        else r = String(A.nom || "").localeCompare(String(B.nom || ""));
        return Game.ui.ordreTriInventaire === "desc" ? -r : r;
    }

    function autoSort() {
        const items = Game.data.personnage.inventaire || [];
        const lockedSlots = new Map(), movable = [];
        syncSlots();
        items.forEach(item => locked(item) ? lockedSlots.set(Number(item.slot), item) : movable.push(item));
        const free = [];
        for (let i = 0; i < Math.max(SLOT_COUNT, items.length + 12); i++) if (!lockedSlots.has(i)) free.push(i);
        movable.sort(compareItems).forEach((item, i) => { item.slot = free[i] ?? i; Game.data.personnage.inventaireSlots[key(item)] = item.slot; });
        if (typeof ajouterJournal === "function") ajouterJournal("Inventaire trie automatiquement.");
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid auto sort");
        redraw();
    }

    function install() {
        if (!hasGame()) { setTimeout(install, 120); return; }
        window.ouvrirInventaire = openInventory;
        window.NVI_ouvrirInventaire = openInventory;
        window.NVI_redessinerVueActive = redraw;
        const btn = document.getElementById("btnInventaire");
        if (btn) btn.onclick = e => { e.preventDefault(); openInventory(); };
        console.log("Inventory_Grid_UI.js charge — " + NVI_VERSION);
    }

    window.NVI_changerRecherche = changeSearch;
    window.NVI_changerTri = changeSort;
    window.NVI_inverserOrdreTri = invertSort;
    window.NVI_changerFiltre = changeFilter;
    window.NVI_triAutomatiqueInventaire = autoSort;
    window.NVI_VERSION = NVI_VERSION;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();