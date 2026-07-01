/* NightVenture — Merchant UI
   Buy/Sell merchant flow using inventory-style paged grids and popup trade cards. */
(function () {
    "use strict";

    const NVM_VERSION = "v0.9.9.30-merchant-paged-popup";
    const CONFIG = { slots: 120, slotsPerPage: 30, columns: 6 };
    const STATE = { selection: null, quantity: 1 };

    function hasGame() { return typeof Game !== "undefined" && Game?.data?.personnage; }
    function esc(v) { return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;"); }
    function attr(v) { return esc(v).replace(/`/g, "&#096;"); }
    function js(v) { return String(v ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r"); }
    function norm(v) { return typeof normaliserTexte === "function" ? normaliserTexte(v) : String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
    function journal(message) { if (typeof ajouterJournal === "function") ajouterJournal(String(message || "")); }
    function objectById(id) { return typeof trouverObjet === "function" ? trouverObjet(id) : Game.cache?.objetsParId?.[id] || null; }
    function objectName(id) { return objectById(id)?.nom || id; }
    function itemKey(item) { return String(item?.uid || item?.instanceId || item?.id || ""); }
    function rarity(obj) { return typeof classeRarete === "function" ? classeRarete(obj) : obj?.rarete || "commun"; }
    function filterType(obj) { return typeof obtenirTypeFiltreObjet === "function" ? obtenirTypeFiltreObjet(obj) : obj?.type || "divers"; }
    function isFavorite(id) { return typeof estFavori === "function" ? estFavori(id) : (Game.data.personnage.favoris || []).includes(id); }
    function autosave(reason) { if (typeof NV_demanderAutosave === "function") NV_demanderAutosave(reason); }

    function ensureUi() {
        Game.ui.etatFiltresInventaire ??= { favoris: false, types: { arme: "neutre", armure: "neutre", accessoire: "neutre", consommable: "neutre", materiau: "neutre", quete: "neutre", divers: "neutre" } };
        Game.ui.etatFiltresInventaire.types ??= {};
        Game.ui.triInventaire ??= "nom";
        Game.ui.ordreTriInventaire ??= "asc";
        Game.ui.rechercheInventaire ??= "";
        Game.ui.modeMarchand ??= "acheter";
        if (!Game.ui.nvmPages) Game.ui.nvmPages = { acheter: 0, vendre: 0 };
        Game.ui.nvmPages.acheter ??= 0;
        Game.ui.nvmPages.vendre ??= 0;
    }

    function currentMode() {
        ensureUi();
        return Game.ui.modeMarchand === "vendre" ? "vendre" : "acheter";
    }

    function currentPage() {
        ensureUi();
        return Math.max(0, Number(Game.ui.nvmPages[currentMode()] || 0));
    }

    function setCurrentPage(page) {
        ensureUi();
        Game.ui.nvmPages[currentMode()] = Math.max(0, Number(page) || 0);
    }

    function itemPassesFilters(item) {
        const obj = objectById(item?.id);
        if (!obj) return false;
        if (typeof objetPasseFiltre === "function" && !objetPasseFiltre(obj)) return false;
        if (typeof objetPasseRecherche === "function" && !objetPasseRecherche(obj)) return false;
        if (typeof objetPasseFiltre === "function" || typeof objetPasseRecherche === "function") return true;
        const type = filterType(obj);
        const state = Game.ui.etatFiltresInventaire?.types?.[type] || "neutre";
        if (state === "exclu") return false;
        const active = Object.entries(Game.ui.etatFiltresInventaire?.types || {}).filter(([, value]) => value === "actif").map(([key]) => key);
        if (active.length && !active.includes(type)) return false;
        if (Game.ui.etatFiltresInventaire?.favoris && !isFavorite(obj.id)) return false;
        const query = norm(Game.ui.rechercheInventaire || "");
        return !query || norm(`${obj.nom || ""} ${obj.description || ""} ${obj.type || ""} ${obj.rarete || ""}`).includes(query);
    }

    function syncInventorySlots() {
        const p = Game.data.personnage;
        p.inventaire ??= [];
        p.inventaireSlots ??= {};
        p.inventaireVerrous ??= {};
        const used = new Set();
        const validKeys = new Set();
        const map = new Map();

        p.inventaire.forEach(item => {
            const key = itemKey(item);
            if (key) validKeys.add(key);
            const persisted = Number(p.inventaireSlots[key]);
            const current = Number(item.slot);
            let slot = Number.isInteger(persisted) && persisted >= 0 ? persisted : Number.isInteger(current) && current >= 0 ? current : null;
            if (slot === null || used.has(slot)) {
                for (let i = 0; i < Math.max(CONFIG.slots, p.inventaire.length + 12); i++) {
                    if (!used.has(i)) { slot = i; break; }
                }
            }
            item.slot = slot;
            if (key) p.inventaireSlots[key] = slot;
            used.add(slot);
            if (key && Object.prototype.hasOwnProperty.call(p.inventaireVerrous, key)) item.verrouille = Boolean(p.inventaireVerrous[key]);
            else if (key) p.inventaireVerrous[key] = Boolean(item.verrouille || item.locked || item.bloque);
            delete item.locked;
            delete item.bloque;
            map.set(slot, item);
        });

        Object.keys(p.inventaireSlots).forEach(key => { if (!validKeys.has(key)) delete p.inventaireSlots[key]; });
        Object.keys(p.inventaireVerrous).forEach(key => { if (!validKeys.has(key)) delete p.inventaireVerrous[key]; });
        return map;
    }

    function isLocked(item) {
        const key = itemKey(item);
        const locks = Game.data.personnage.inventaireVerrous || {};
        return Object.prototype.hasOwnProperty.call(locks, key) ? Boolean(locks[key]) : Boolean(item?.verrouille || item?.locked || item?.bloque);
    }

    function setLocked(item, active) {
        if (!item) return;
        Game.data.personnage.inventaireVerrous ??= {};
        const key = itemKey(item);
        if (key) Game.data.personnage.inventaireVerrous[key] = Boolean(active);
        item.verrouille = Boolean(active);
        delete item.locked;
        delete item.bloque;
    }

    function objectLabel(obj) {
        const type = String(obj?.type || "").toLowerCase();
        if (type.includes("arme")) return "ARME";
        if (type.includes("casque")) return "CASQ";
        if (type.includes("armure")) return "ARM";
        if (type.includes("gant")) return "GANT";
        if (type.includes("chaussure") || type.includes("botte")) return "BOT";
        if (type.includes("collier")) return "COL";
        if (type.includes("bague")) return "BAG";
        if (type.includes("consommable") || type.includes("potion")) return "CONS";
        if (type.includes("materiau") || type.includes("matériau") || type.includes("ressource")) return "MAT";
        if (type.includes("quete") || type.includes("quête")) return "QTE";
        return "OBJ";
    }

    function icon(obj) {
        if (obj?.image) return `<img src="${attr(obj.image)}" alt="${attr(obj.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">${esc(objectLabel(obj))}</span>`;
    }

    function objectDetails(obj) {
        if (!obj) return "";
        if (typeof creerDetailsObjetInventaire === "function") return creerDetailsObjetInventaire(obj);
        if (typeof creerDetailsObjet === "function") return creerDetailsObjet(obj);
        const stats = [["ATK", "attaque"], ["DEF", "defense"], ["ATK MAGIC", "attaqueMagique"], ["DEF MAGIC", "defenseMagique"], ["PV", "pvMax"], ["MANA", "manaMax"], ["STAMINA", "staminaMax"], ["FOR", "force"], ["DEX", "dexterite"], ["INT", "intelligence"], ["VIT", "vitalite"], ["LUCK", "chance"]];
        return stats.filter(([, key]) => obj[key]).map(([label, key]) => `${label} +${obj[key]}`).join(" ");
    }

    function rarityScore(obj) {
        const order = { commun: 1, "peu-commun": 2, rare: 3, epique: 4, "épique": 4, legendaire: 5, "légendaire": 5, mythique: 6 };
        return order[obj?.rarete] || 0;
    }

    function compareItems(a, b) {
        const A = objectById(a.item.id), B = objectById(b.item.id);
        if (!A || !B) return 0;
        const mode = Game.ui.triInventaire || "nom";
        let result = 0;
        if (mode === "type") result = String(A.type || "").localeCompare(String(B.type || ""));
        else if (mode === "rarete") result = rarityScore(B) - rarityScore(A);
        else if (mode === "niveau") result = (B.niveauRequis || 1) - (A.niveauRequis || 1);
        else if (mode === "prix") result = (B.prix || 0) - (A.prix || 0);
        else if (mode === "atk") result = (B.attaque || 0) - (A.attaque || 0);
        else if (mode === "atkMagique") result = (B.attaqueMagique || 0) - (A.attaqueMagique || 0);
        else if (mode === "def") result = (B.defense || 0) - (A.defense || 0);
        else if (mode === "defMagique") result = (B.defenseMagique || 0) - (A.defenseMagique || 0);
        else result = String(A.nom || "").localeCompare(String(B.nom || ""));
        return Game.ui.ordreTriInventaire === "desc" ? -result : result;
    }

    function selectionKey(source, token) { return `merchant:${source}:${token}`; }
    function selected(source, token) { return STATE.selection === selectionKey(source, token); }

    function selectItem(source, token) {
        const requiredSource = currentMode() === "acheter" ? "merchant" : "player";
        if (source !== requiredSource) return;
        STATE.selection = STATE.selection === selectionKey(source, token) ? null : selectionKey(source, token);
        STATE.quantity = 1;
        redraw();
    }

    function playerToken(item) { return itemKey(item); }
    function merchantToken(index) { return String(index); }

    function itemButton(item, source, token) {
        const obj = objectById(item.id);
        if (!obj) return "";
        const locked = source === "player" && isLocked(item);
        return `
            <button type="button"
                class="nvi-item nvi-item--${attr(rarity(obj))} ${selected(source, token) ? "nvimp-item--popup-open" : ""} ${locked ? "nvi-item--locked" : ""}"
                draggable="false"
                onclick="NVM_selectionner('${js(source)}', '${js(token)}')"
                title="${attr(obj.nom || item.id)}${locked ? " - emplacement verrouille" : ""}"
                data-nvi-item-id="${attr(item.id)}"
                data-nvi-item-key="${attr(token)}"
                data-nvm-source="${attr(source)}"
                data-nvm-token="${attr(token)}">
                ${isFavorite(item.id) ? `<span class="nvi-item__favorite">Favori</span>` : ""}
                ${locked ? `<span class="nvi-item__lock">Lock</span>` : ""}
                <span class="nvi-item__icon">${icon(obj)}</span>
                ${Number(item.quantite || 1) > 1 ? `<span class="nvi-item__qty">${Number(item.quantite || 1)}</span>` : ""}
            </button>
        `;
    }

    function entriesForMerchant() {
        return (Game.ui.marchandActuel?.inventaire || [])
            .map((item, index) => ({ item, index, token: merchantToken(index), source: "merchant" }))
            .filter(entry => entry.item && objectById(entry.item.id) && itemPassesFilters(entry.item))
            .sort(compareItems);
    }

    function entriesForPlayer() {
        const slots = syncInventorySlots();
        return Array.from(slots.entries())
            .map(([slot, item]) => ({ item, slot, token: playerToken(item), source: "player" }))
            .filter(entry => entry.item && objectById(entry.item.id) && itemPassesFilters(entry.item))
            .sort((a, b) => Number(a.slot) - Number(b.slot));
    }

    function pageCountFor(entries) {
        return Math.max(1, Math.ceil(Math.max(CONFIG.slots, entries.length || 0) / CONFIG.slotsPerPage));
    }

    function pager(pageCount, page) {
        let html = `<div class="nvimp-pager nvm-pager">`;
        for (let i = 0; i < pageCount; i++) html += `<button type="button" class="nvimp-page-btn ${i === page ? "is-active" : ""}" onclick="NVM_changerPage(${i})">${i + 1}</button>`;
        return html + `</div>`;
    }

    function activeEntries() {
        return currentMode() === "acheter" ? entriesForMerchant() : entriesForPlayer();
    }

    function activeGrid() {
        const mode = currentMode();
        const entries = activeEntries();
        const pages = pageCountFor(entries);
        const page = Math.min(currentPage(), pages - 1);
        Game.ui.nvmPages[mode] = page;
        const start = page * CONFIG.slotsPerPage;
        const pageEntries = entries.slice(start, start + CONFIG.slotsPerPage);
        const byLocalSlot = new Map(pageEntries.map((entry, index) => [index, entry]));
        let html = "";
        for (let i = 0; i < CONFIG.slotsPerPage; i++) {
            const entry = byLocalSlot.get(i);
            const item = entry?.item || null;
            const locked = entry?.source === "player" && isLocked(item);
            html += `<div class="nvi-slot ${item ? "nvi-slot--occupied" : ""} ${locked ? "nvi-slot--locked" : ""}" data-slot="${start + i}">${item ? itemButton(item, entry.source, entry.token) : ""}</div>`;
        }
        const title = mode === "acheter" ? "Inventaire marchand" : "Ton inventaire";
        const count = mode === "acheter" ? (Game.ui.marchandActuel?.inventaire || []).length : (Game.data.personnage.inventaire || []).length;
        return `<div class="nvi-panel nvm-panel-active"><div class="nvi-panel__title"><strong>${title}</strong><span>${count} pile(s)</span></div>${pager(pages, page)}<div class="nvi-grid nvi-grid--inventory nvi-grid--merchant" style="--nvi-columns:${CONFIG.columns};">${html}</div><div class="nvimp-grid-footer"><span class="nvimp-gold">Or : ${Number(Game.data.personnage.or || 0)}</span></div></div>`;
    }

    function selectedData() {
        if (!STATE.selection) return null;
        const [, source, token] = STATE.selection.split(":");
        if (source === "player") {
            const item = (Game.data.personnage.inventaire || []).find(entry => playerToken(entry) === token);
            return item ? { source, token, id: item.id, item, obj: objectById(item.id) } : null;
        }
        if (source === "merchant") {
            const index = Number(token);
            const item = Number.isInteger(index) ? (Game.ui.marchandActuel?.inventaire || [])[index] : null;
            return item ? { source, token, id: item.id, item, obj: objectById(item.id), merchantIndex: index } : null;
        }
        return null;
    }

    function quantityInput(max, prefix) {
        const safeMax = Math.max(1, Number(max || 1));
        STATE.quantity = Math.min(Math.max(1, Number(STATE.quantity || 1)), safeMax);
        return `<div class="nvi-quantity"><button onclick="NVM_modifierQuantite(-1, ${safeMax})">-</button><input id="${prefix}" type="number" min="1" max="${safeMax}" value="${STATE.quantity}" oninput="NVM_setQuantite(this.value, ${safeMax})"><button onclick="NVM_modifierQuantite(1, ${safeMax})">+</button><button onclick="NVM_setQuantite(${safeMax}, ${safeMax})">MAX</button></div>`;
    }

    function actionPrice(type, obj, quantity) {
        const price = type === "achat" ? Number(obj?.prix || 0) : Math.floor(Number(obj?.prix || 0) / 2);
        return price * Math.max(1, Number(quantity || 1));
    }

    function popupPanel() {
        const selection = selectedData();
        if (!selection || !selection.obj) return "";
        const { source, id, item, obj } = selection;
        const qty = Number(item.quantite || 1);
        const details = objectDetails(obj);
        const mode = source === "merchant" ? "achat" : "vente";
        const total = actionPrice(mode, obj, STATE.quantity);
        const locked = source === "player" && isLocked(item);
        const actionButton = source === "merchant"
            ? `<button type="button" onclick="NVM_acheterSelection('${js(selection.token)}')">Acheter</button>`
            : `<button type="button" ${locked ? "disabled" : ""} onclick="NVM_vendreSelection('${js(selection.token)}')">Vendre</button>`;
        const lockButton = source === "player" ? `<button type="button" class="nvi-lock-toggle ${locked ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" onclick="NVM_toggleVerrouillage('${js(selection.token)}')"><span class="nvi-lock-toggle__text">${locked ? "Bloque" : "Libre"}</span></button>` : "";
        return `<aside class="nvi-details nvimp-details-popup nvipr-popup nvm-trade-popup" data-nvm-source="${attr(source)}" data-nvm-token="${attr(selection.token)}"><button type="button" class="nvimp-popup-close" onclick="NVM_fermerPopup()">×</button><div class="nvi-details__header"><div class="nvi-details__icon nvi-item--${attr(rarity(obj))}">${icon(obj)}</div><div><h3 class="${attr(rarity(obj))}">${esc(obj.nom || id)}</h3><p><span class="nvipr-meta-line">${esc(obj.type || "divers")} · ${esc(obj.rarete || "commun")}</span><span class="nvipr-meta-line">Quantité : ${qty}</span></p></div></div><p class="nvi-details__description">${esc(obj.description || "Aucune description.")}</p>${details ? `<p class="nvi-details__stats">${details}</p>` : ""}<div class="nvi-trade-box"><strong>${source === "merchant" ? "Acheter" : "Vendre"}</strong>${quantityInput(qty, source === "merchant" ? "nvmBuyQty" : "nvmSellQty")}<p>${source === "merchant" ? "Cout" : "Gain"} : <strong>${total} or</strong></p>${lockButton}${actionButton}</div></aside>`;
    }

    function filterState(id) {
        ensureUi();
        if (id === "tous") {
            const types = Game.ui.etatFiltresInventaire.types || {};
            const active = Object.values(types).some(state => state !== "neutre") || Game.ui.etatFiltresInventaire.favoris;
            return active ? "neutre" : "actif";
        }
        if (id === "favoris") return Game.ui.etatFiltresInventaire.favoris ? "actif" : "neutre";
        return Game.ui.etatFiltresInventaire.types[id] || "neutre";
    }

    function toolbar() {
        const filters = Game.constants?.filtresInventaire || [{ id: "tous", nom: "Tous" }, { id: "favoris", nom: "Favoris" }, { id: "arme", nom: "Armes" }, { id: "armure", nom: "Armures" }, { id: "accessoire", nom: "Accessoires" }, { id: "consommable", nom: "Consommables" }, { id: "materiau", nom: "Materiaux" }, { id: "quete", nom: "Quetes" }, { id: "divers", nom: "Divers" }];
        const sorts = Game.constants?.trisInventaire || [{ id: "nom", nom: "Nom" }, { id: "type", nom: "Type" }, { id: "rarete", nom: "Rarete" }, { id: "niveau", nom: "Niveau requis" }, { id: "prix", nom: "Prix" }, { id: "atk", nom: "ATK" }, { id: "atkMagique", nom: "ATK magique" }, { id: "def", nom: "DEF" }, { id: "defMagique", nom: "DEF magique" }];
        return `<div class="nvi-toolbar nvm-toolbar"><div class="nvi-toolbar__top"><div><h2>Marchand</h2><p>${esc(Game.ui.marchandActuel?.nom || "Marchand")}</p></div><button onclick="NVM_triAutomatiqueInventaire()">Tri auto sac</button><button onclick="ouvrirExploration()">Retour</button></div><div class="nvm-tabs"><button class="nvm-tab ${currentMode() === "acheter" ? "is-active" : ""}" onclick="NVM_changerMode('acheter')">Acheter</button><button class="nvm-tab ${currentMode() === "vendre" ? "is-active" : ""}" onclick="NVM_changerMode('vendre')">Vendre</button></div><div class="nvi-toolbar__search-row"><input id="nvmSearch" type="text" placeholder="Rechercher..." value="${attr(Game.ui.rechercheInventaire || "")}" oninput="NVM_changerRecherche(this.value)"><select onchange="NVM_changerTri(this.value)">${sorts.map(sort => `<option value="${attr(sort.id)}" ${Game.ui.triInventaire === sort.id ? "selected" : ""}>${esc(sort.nom)}</option>`).join("")}</select><button onclick="NVM_inverserOrdreTri()">${Game.ui.ordreTriInventaire === "asc" ? "ASC" : "DESC"}</button></div><div class="nvi-filters">${filters.map(filter => `<button class="nvi-filter" data-etat="${filterState(filter.id)}" onclick="NVM_changerFiltre('${js(filter.id)}')">${esc(filter.nom)}</button>`).join("")}</div></div>`;
    }

    function view() {
        const modeLabel = currentMode() === "acheter" ? "Achat : stock du marchand" : "Vente : ton sac";
        return `<section class="nvi-window nvm-window">${toolbar()}<div class="nvm-mode-hint">${modeLabel}</div><div class="nvi-layout nvi-layout--merchant nvi-layout--inventory nvimp-no-details">${activeGrid()}${popupPanel()}</div></section>`;
    }

    function openMerchant(idPnj) {
        if (!hasGame()) return;
        if (typeof changerVue === "function") changerVue("marchand");
        if (idPnj) Game.ui.marchandActuel = Game.cache?.pnjParId?.[idPnj] || null;
        if (!Game.ui.marchandActuel) { journal("Marchand introuvable."); return; }
        ensureUi();
        syncInventorySlots();
        STATE.selection = null;
        STATE.quantity = 1;
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(view());
    }

    function redraw() {
        if (!hasGame() || Game.ui.vueActive !== "marchand" || !Game.ui.marchandActuel) return;
        syncInventorySlots();
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(view());
    }

    function closePopup() { STATE.selection = null; STATE.quantity = 1; redraw(); }
    function changerMode(mode) { Game.ui.modeMarchand = mode === "vendre" ? "vendre" : "acheter"; STATE.selection = null; STATE.quantity = 1; redraw(); }
    function changerPage(page) { setCurrentPage(page); STATE.selection = null; redraw(); }
    function modifierQuantite(delta, max) { setQuantite(Number(STATE.quantity || 1) + Number(delta || 0), max); }
    function setQuantite(value, max) { STATE.quantity = Math.max(1, Math.min(Number(max || 1), Number(value || 1))); redraw(); }
    function changerRecherche(value) { Game.ui.rechercheInventaire = norm(value); STATE.selection = null; setCurrentPage(0); redraw(); setTimeout(() => { const input = document.getElementById("nvmSearch"); if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); } }, 0); }
    function changerTri(value) { Game.ui.triInventaire = value; Game.ui.ordreTriInventaire = Game.constants?.ordreTriParCritere?.[value] || Game.ui.ordreTriInventaire || "asc"; STATE.selection = null; redraw(); }
    function inverserOrdreTri() { Game.ui.ordreTriInventaire = Game.ui.ordreTriInventaire === "asc" ? "desc" : "asc"; if (Game.constants?.ordreTriParCritere) Game.constants.ordreTriParCritere[Game.ui.triInventaire] = Game.ui.ordreTriInventaire; STATE.selection = null; redraw(); }

    function changerFiltre(id) {
        ensureUi();
        if (id === "tous") {
            if (typeof reinitialiserFiltresInventaire === "function") reinitialiserFiltresInventaire();
            else { Game.ui.etatFiltresInventaire.favoris = false; Object.keys(Game.ui.etatFiltresInventaire.types).forEach(key => Game.ui.etatFiltresInventaire.types[key] = "neutre"); }
        } else if (id === "favoris") Game.ui.etatFiltresInventaire.favoris = !Game.ui.etatFiltresInventaire.favoris;
        else {
            const current = Game.ui.etatFiltresInventaire.types[id] || "neutre";
            Game.ui.etatFiltresInventaire.types[id] = current === "neutre" ? "actif" : current === "actif" ? "exclu" : "neutre";
        }
        if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
        STATE.selection = null;
        setCurrentPage(0);
        redraw();
    }

    function triAutomatiqueInventaire() {
        if (!hasGame()) return;
        syncInventorySlots();
        const items = Game.data.personnage.inventaire || [];
        const lockedSlots = new Map();
        const movable = [];
        items.forEach(item => {
            const slot = Number(item.slot);
            if (isLocked(item) && Number.isInteger(slot) && slot >= 0 && !lockedSlots.has(slot)) lockedSlots.set(slot, item);
            else movable.push({ item });
        });
        const freeSlots = [];
        for (let slot = 0; slot < Math.max(CONFIG.slots, items.length + lockedSlots.size + 12); slot++) if (!lockedSlots.has(slot)) freeSlots.push(slot);
        movable.sort(compareItems).forEach((entry, index) => {
            const slot = freeSlots[index] ?? index;
            entry.item.slot = slot;
            Game.data.personnage.inventaireSlots[itemKey(entry.item)] = slot;
        });
        journal(lockedSlots.size > 0 ? `Inventaire trie. ${lockedSlots.size} item(s) bloque(s) conserve(s).` : "Inventaire trie automatiquement.");
        autosave("merchant inventory auto sort");
        redraw();
    }

    function selectedOrToken(token) {
        const selected = selectedData();
        if (selected && selected.token === token) return selected;
        const playerItem = (Game.data.personnage.inventaire || []).find(item => playerToken(item) === token);
        if (playerItem) return { source: "player", token, id: playerItem.id, item: playerItem, obj: objectById(playerItem.id) };
        const merchantIndex = Number(token);
        const merchantItem = Number.isInteger(merchantIndex) ? (Game.ui.marchandActuel?.inventaire || [])[merchantIndex] : null;
        if (merchantItem) return { source: "merchant", token, id: merchantItem.id, item: merchantItem, obj: objectById(merchantItem.id), merchantIndex };
        return null;
    }

    function toggleLock(token) {
        const selection = selectedOrToken(token);
        if (!selection || selection.source !== "player") return;
        const next = !isLocked(selection.item);
        setLocked(selection.item, next);
        journal(next ? `${objectName(selection.id)} est bloque sur sa case.` : `${objectName(selection.id)} est debloque.`);
        autosave("merchant inventory lock toggle");
        redraw();
    }

    function addMerchantItem(id, quantity) {
        const stock = Game.ui.marchandActuel.inventaire || [];
        const found = stock.find(item => item.id === id);
        if (found) found.quantite = Number(found.quantite || 1) + quantity;
        else stock.push({ id, quantite: quantity });
        Game.ui.marchandActuel.inventaire = stock;
    }

    function buySelection(token) {
        const selection = selectedOrToken(token);
        if (!selection || selection.source !== "merchant" || !selection.obj) return;
        const qty = Math.max(1, Math.min(Number(STATE.quantity || 1), Number(selection.item.quantite || 1)));
        const cost = actionPrice("achat", selection.obj, qty);
        if (Game.data.personnage.or < cost) { journal("Pas assez d'or."); redraw(); return; }
        Game.data.personnage.or -= cost;
        if (typeof ajouterObjetInventaire === "function") ajouterObjetInventaire(selection.id, qty);
        else Game.data.personnage.inventaire.push({ id: selection.id, quantite: qty });
        selection.item.quantite = Number(selection.item.quantite || 1) - qty;
        if (selection.item.quantite <= 0) Game.ui.marchandActuel.inventaire.splice(selection.merchantIndex, 1);
        journal(`Achat : ${selection.obj.nom || selection.id} x${qty}`);
        STATE.selection = null;
        STATE.quantity = 1;
        autosave("merchant buy exact stock");
        redraw();
    }

    function removePlayerStackQuantity(item, qty) {
        item.quantite = Number(item.quantite || 1) - qty;
        if (item.quantite > 0) return;
        const key = itemKey(item);
        Game.data.personnage.inventaire = (Game.data.personnage.inventaire || []).filter(entry => entry !== item);
        if (key && Game.data.personnage.inventaireSlots) delete Game.data.personnage.inventaireSlots[key];
        if (key && Game.data.personnage.inventaireVerrous) delete Game.data.personnage.inventaireVerrous[key];
        const hasSameId = (Game.data.personnage.inventaire || []).some(entry => entry.id === item.id);
        if (!hasSameId) Game.data.personnage.favoris = (Game.data.personnage.favoris || []).filter(id => id !== item.id);
    }

    function sellSelection(token) {
        const selection = selectedOrToken(token);
        if (!selection || selection.source !== "player" || !selection.obj) return;
        if (isLocked(selection.item)) { journal(`${selection.obj.nom || selection.id} est bloque.`); redraw(); return; }
        const qty = Math.max(1, Math.min(Number(STATE.quantity || 1), Number(selection.item.quantite || 1)));
        const gain = actionPrice("vente", selection.obj, qty);
        Game.data.personnage.or += gain;
        removePlayerStackQuantity(selection.item, qty);
        addMerchantItem(selection.id, qty);
        journal(`Vente : ${selection.obj.nom || selection.id} x${qty}`);
        STATE.selection = null;
        STATE.quantity = 1;
        autosave("merchant sell exact stack");
        redraw();
    }

    function patchEntrypoints() {
        window.ouvrirMarchand = openMerchant;
        window.NVI_ouvrirMarchand = openMerchant;
        window.NVM_ouvrirMarchand = openMerchant;
    }

    function install() {
        patchEntrypoints();
        let tries = 0;
        const interval = setInterval(() => { patchEntrypoints(); if (++tries >= 20) clearInterval(interval); }, 250);
        console.log("Inventory_Merchant_UI.js charge — " + NVM_VERSION);
    }

    window.NVM_selectionner = selectItem;
    window.NVM_fermerPopup = closePopup;
    window.NVM_changerMode = changerMode;
    window.NVM_changerPage = changerPage;
    window.NVM_modifierQuantite = modifierQuantite;
    window.NVM_setQuantite = setQuantite;
    window.NVM_changerRecherche = changerRecherche;
    window.NVM_changerTri = changerTri;
    window.NVM_inverserOrdreTri = inverserOrdreTri;
    window.NVM_changerFiltre = changerFiltre;
    window.NVM_triAutomatiqueInventaire = triAutomatiqueInventaire;
    window.NVM_toggleVerrouillage = toggleLock;
    window.NVM_acheterSelection = buySelection;
    window.NVM_vendreSelection = sellSelection;
    window.NVM_VERSION = NVM_VERSION;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
