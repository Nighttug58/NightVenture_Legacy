/* NightVenture — UI marchand extrait de l'inventaire */
(function () {
    "use strict";

    const NVM_VERSION = "v0.9.9.12-merchant-ui";
    const NVM_CONFIG = {
        inventorySlots: 72,
        merchantSlots: 48,
        columnsInventory: 9,
        columnsMerchant: 8
    };

    const NVM_STATE = {
        selection: null,
        quantity: 1
    };

    function hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function escapeHtml(value) {
        if (typeof echapperHTML === "function") return echapperHTML(value);
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, "&#096;");
    }

    function escapeJs(value) {
        return String(value ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");
    }

    function journal(message) {
        if (typeof ajouterJournal === "function") ajouterJournal(String(message || ""));
    }

    function objet(idObjet) {
        if (typeof trouverObjet === "function") return trouverObjet(idObjet);
        return Game.cache?.objetsParId?.[idObjet] || null;
    }

    function objetNom(idObjet) {
        return objet(idObjet)?.nom || idObjet;
    }

    function rarete(objetData) {
        if (typeof classeRarete === "function") return classeRarete(objetData);
        return objetData?.rarete || "commun";
    }

    function typeFiltre(objetData) {
        if (typeof obtenirTypeFiltreObjet === "function") return obtenirTypeFiltreObjet(objetData);
        return objetData?.type || "divers";
    }

    function estFavoriObjet(idObjet) {
        if (typeof estFavori === "function") return estFavori(idObjet);
        return (Game.data.personnage.favoris || []).includes(idObjet);
    }

    function normaliser(value) {
        if (typeof normaliserTexte === "function") return normaliserTexte(value);
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function passeRecherche(objetData) {
        if (typeof objetPasseRecherche === "function") return objetPasseRecherche(objetData);
        const recherche = normaliser(Game.ui.rechercheInventaire || "");
        if (!recherche) return true;
        return normaliser(`${objetData?.nom || ""} ${objetData?.description || ""} ${objetData?.type || ""} ${objetData?.rarete || ""}`).includes(recherche);
    }

    function passeFiltre(objetData) {
        if (typeof objetPasseFiltre === "function") return objetPasseFiltre(objetData);
        const filtreType = typeFiltre(objetData);
        const etat = Game.ui.etatFiltresInventaire?.types?.[filtreType] || "neutre";
        if (etat === "exclu") return false;
        const actifs = Object.entries(Game.ui.etatFiltresInventaire?.types || {})
            .filter(([, value]) => value === "actif")
            .map(([key]) => key);
        if (actifs.length && !actifs.includes(filtreType)) return false;
        if (Game.ui.etatFiltresInventaire?.favoris && !estFavoriObjet(objetData.id)) return false;
        return true;
    }

    function itemVisible(item) {
        const obj = objet(item?.id);
        if (!obj) return false;
        return passeFiltre(obj) && passeRecherche(obj);
    }

    function assurerEtatFiltres() {
        Game.ui.etatFiltresInventaire ??= {
            favoris: false,
            types: {
                arme: "neutre",
                armure: "neutre",
                accessoire: "neutre",
                consommable: "neutre",
                materiau: "neutre",
                quete: "neutre",
                divers: "neutre"
            }
        };
        Game.ui.etatFiltresInventaire.types ??= {};
        Game.ui.triInventaire ??= "nom";
        Game.ui.ordreTriInventaire ??= "asc";
        Game.ui.rechercheInventaire ??= "";
    }

    function itemKey(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function slotsMap() {
        const personnage = Game.data.personnage;
        personnage.inventaire ??= [];
        personnage.inventaireSlots ??= {};
        const occupied = new Set();
        personnage.inventaire.forEach(item => {
            const key = itemKey(item);
            const persisted = Number(personnage.inventaireSlots[key]);
            const current = Number(item.slot);
            let slot = Number.isInteger(persisted) && persisted >= 0 ? persisted : Number.isInteger(current) && current >= 0 ? current : null;
            if (slot !== null && occupied.has(slot)) slot = null;
            if (slot === null) {
                for (let i = 0; i < Math.max(NVM_CONFIG.inventorySlots, personnage.inventaire.length + 12); i++) {
                    if (!occupied.has(i)) {
                        slot = i;
                        break;
                    }
                }
            }
            item.slot = slot;
            if (key) personnage.inventaireSlots[key] = slot;
            occupied.add(slot);
        });
        const validKeys = new Set(personnage.inventaire.map(itemKey));
        Object.keys(personnage.inventaireSlots).forEach(key => {
            if (!validKeys.has(key)) delete personnage.inventaireSlots[key];
        });
        const map = new Map();
        personnage.inventaire.forEach(item => map.set(Number(item.slot), item));
        return map;
    }

    function isLocked(item) {
        const locks = Game.data.personnage.inventaireVerrous || {};
        const key = itemKey(item);
        if (Object.prototype.hasOwnProperty.call(locks, key)) return Boolean(locks[key]);
        return Boolean(item?.verrouille || item?.locked || item?.bloque);
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

    function labelObjet(objetData) {
        const type = String(objetData?.type || "").toLowerCase();
        if (type.includes("arme")) return "ARME";
        if (type.includes("casque")) return "CASQ";
        if (type.includes("armure")) return "ARM";
        if (type.includes("gant")) return "GANT";
        if (type.includes("chaussure") || type.includes("botte")) return "BOT";
        if (type.includes("collier")) return "COL";
        if (type.includes("bague")) return "BAG";
        if (type.includes("artefact")) return "ART";
        if (type.includes("consommable") || type.includes("potion")) return "CONS";
        if (type.includes("materiau") || type.includes("matériau") || type.includes("ressource")) return "MAT";
        if (type.includes("quete") || type.includes("quête")) return "QTE";
        return "OBJ";
    }

    function iconObjet(objetData) {
        if (objetData?.image) return `<img src="${escapeAttr(objetData.image)}" alt="${escapeAttr(objetData.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">${escapeHtml(labelObjet(objetData))}</span>`;
    }

    function selectionKey(source, idObjet) {
        return `marchand:${source}:${idObjet}`;
    }

    function isSelected(source, idObjet) {
        return NVM_STATE.selection === selectionKey(source, idObjet);
    }

    function selectItem(source, idObjet) {
        const key = selectionKey(source, idObjet);
        NVM_STATE.selection = NVM_STATE.selection === key ? null : key;
        redraw();
    }

    function itemButtonHTML(item, source) {
        const obj = objet(item.id);
        if (!obj) return "";
        const rarity = rarete(obj);
        const locked = source === "player" && isLocked(item);
        return `
            <button
                type="button"
                class="nvi-item nvi-item--${escapeAttr(rarity)} ${isSelected(source, item.id) ? "nvi-item--selected" : ""} ${locked ? "nvi-item--locked" : ""}"
                draggable="false"
                onclick="NVM_selectionner('${escapeJs(source)}', '${escapeJs(item.id)}')"
                ondblclick="NVM_selectionner('${escapeJs(source)}', '${escapeJs(item.id)}')"
                title="${escapeAttr(obj.nom || item.id)}${locked ? " - emplacement verrouille" : ""}"
                data-nvi-item-id="${escapeAttr(item.id)}"
            >
                ${estFavoriObjet(item.id) ? `<span class="nvi-item__favorite">Favori</span>` : ""}
                ${locked ? `<span class="nvi-item__lock">Lock</span>` : ""}
                <span class="nvi-item__icon">${iconObjet(obj)}</span>
                ${Number(item.quantite || 1) > 1 ? `<span class="nvi-item__qty">${Number(item.quantite || 1)}</span>` : ""}
            </button>
        `;
    }

    function inventorySlotHTML(index, item) {
        const visible = item ? itemVisible(item) : false;
        const hidden = item && !visible;
        return `
            <div class="nvi-slot ${item ? "nvi-slot--occupied" : ""} ${hidden ? "nvi-slot--filtered" : ""} ${item && isLocked(item) ? "nvi-slot--locked" : ""}" data-slot="${index}">
                ${item && visible ? itemButtonHTML(item, "player") : hidden ? `<span class="nvi-slot__filtered-dot" title="Objet masque par les filtres"></span>` : ""}
            </div>
        `;
    }

    function playerGridHTML() {
        const slots = slotsMap();
        const maxUsed = Math.max(...Array.from(slots.keys()), 0);
        const total = Math.max(NVM_CONFIG.inventorySlots, maxUsed + 9);
        let html = "";
        for (let i = 0; i < total; i++) html += inventorySlotHTML(i, slots.get(i));
        return `<div class="nvi-grid nvi-grid--inventory" style="--nvi-columns:${NVM_CONFIG.columnsInventory};">${html}</div>`;
    }

    function merchantGridHTML() {
        const items = Game.ui.marchandActuel?.inventaire || [];
        const total = Math.max(NVM_CONFIG.merchantSlots, items.length);
        let html = "";
        for (let i = 0; i < total; i++) {
            const item = items[i] || null;
            html += `
                <div class="nvi-slot ${item ? "nvi-slot--occupied" : ""}" data-slot="${i}">
                    ${item ? itemButtonHTML(item, "merchant") : ""}
                </div>
            `;
        }
        return `<div class="nvi-grid nvi-grid--merchant" style="--nvi-columns:${NVM_CONFIG.columnsMerchant};">${html}</div>`;
    }

    function selectedData() {
        if (!NVM_STATE.selection) return null;
        const [, source, idObjet] = NVM_STATE.selection.split(":");
        if (!idObjet) return null;
        if (source === "player") {
            const item = (Game.data.personnage.inventaire || []).find(entry => entry.id === idObjet);
            if (!item) return null;
            return { source, idObjet, item, objet: objet(idObjet) };
        }
        if (source === "merchant") {
            const item = (Game.ui.marchandActuel?.inventaire || []).find(entry => entry.id === idObjet);
            if (!item) return null;
            return { source, idObjet, item, objet: objet(idObjet) };
        }
        return null;
    }

    function objectDetails(objetData) {
        if (!objetData) return "";
        if (typeof creerDetailsObjetInventaire === "function") return creerDetailsObjetInventaire(objetData);
        if (typeof creerDetailsObjet === "function") return creerDetailsObjet(objetData);
        const stats = [
            ["ATK", "attaque"], ["DEF", "defense"], ["ATK MAGIC", "attaqueMagique"], ["DEF MAGIC", "defenseMagique"],
            ["PV", "pvMax"], ["MANA", "manaMax"], ["STAMINA", "staminaMax"],
            ["FOR", "force"], ["DEX", "dexterite"], ["INT", "intelligence"], ["VIT", "vitalite"], ["LUCK", "chance"]
        ];
        return stats.filter(([, key]) => objetData[key]).map(([label, key]) => `${label} +${objetData[key]}`).join(" ");
    }

    function quantityInput(max, prefix) {
        const value = Math.min(Math.max(1, Number(NVM_STATE.quantity || 1)), Math.max(1, Number(max || 1)));
        NVM_STATE.quantity = value;
        return `
            <div class="nvi-quantity">
                <button onclick="NVM_modifierQuantite(-1, ${max})">-</button>
                <input id="${prefix}" type="number" min="1" max="${max}" value="${value}" oninput="NVM_setQuantite(this.value, ${max})">
                <button onclick="NVM_modifierQuantite(1, ${max})">+</button>
                <button onclick="NVM_setQuantite(${max}, ${max})">MAX</button>
            </div>
        `;
    }

    function actionPrice(type, objetData, quantity) {
        const prix = type === "achat" ? Number(objetData?.prix || 0) : Math.floor(Number(objetData?.prix || 0) / 2);
        return prix * Math.max(1, Number(quantity || 1));
    }

    function detailsHTML() {
        const selection = selectedData();
        if (!selection || !selection.objet) {
            return `
                <aside class="nvi-details">
                    <div class="nvi-details__empty">
                        <strong>Aucun objet selectionne</strong>
                        <span>Clique sur une case du marchand ou du sac.</span>
                    </div>
                </aside>
            `;
        }

        const { source, idObjet, item, objet: obj } = selection;
        const rarity = rarete(obj);
        const qty = Number(item.quantite || 1);
        const details = objectDetails(obj);
        let actions = "";

        if (source === "player") {
            const locked = isLocked(item);
            const prixVente = actionPrice("vente", obj, NVM_STATE.quantity);
            actions = `
                <button class="nvi-lock-toggle ${locked ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" onclick="event.stopPropagation(); NVM_toggleVerrouillage('${escapeJs(idObjet)}')">
                    <span class="nvi-lock-toggle__text">${locked ? "Bloque" : "Debloque"}</span>
                </button>
                <div class="nvi-trade-box">
                    <strong>Vente</strong>
                    ${quantityInput(qty, "nvmSellQty")}
                    <p>Gain : <strong>${prixVente} or</strong></p>
                    <button onclick="NVM_vendreSelection('${escapeJs(idObjet)}')">Vendre</button>
                </div>
            `;
        }

        if (source === "merchant") {
            const prixAchat = actionPrice("achat", obj, NVM_STATE.quantity);
            actions = `
                <div class="nvi-trade-box">
                    <strong>Achat</strong>
                    ${quantityInput(qty, "nvmBuyQty")}
                    <p>Cout : <strong>${prixAchat} or</strong></p>
                    <button onclick="NVM_acheterSelection('${escapeJs(idObjet)}')">Acheter</button>
                </div>
            `;
        }

        return `
            <aside class="nvi-details">
                <div class="nvi-details__header">
                    <div class="nvi-details__icon nvi-item--${escapeAttr(rarity)}">${iconObjet(obj)}</div>
                    <div>
                        <h3 class="${escapeAttr(rarity)}">${escapeHtml(obj.nom || idObjet)}</h3>
                        <p>${escapeHtml(obj.type || "divers")} · ${escapeHtml(obj.rarete || "commun")}${qty > 1 ? ` · x${qty}` : ""}</p>
                    </div>
                </div>
                <p class="nvi-details__description">${escapeHtml(obj.description || "Aucune description.")}</p>
                ${details ? `<p class="nvi-details__stats">${details}</p>` : ""}
                ${actions}
            </aside>
        `;
    }

    function etatFiltre(idFiltre) {
        assurerEtatFiltres();
        if (idFiltre === "tous") {
            const types = Game.ui.etatFiltresInventaire.types || {};
            const actif = Object.values(types).some(etat => etat !== "neutre") || Game.ui.etatFiltresInventaire.favoris;
            return actif ? "neutre" : "actif";
        }
        if (idFiltre === "favoris") return Game.ui.etatFiltresInventaire.favoris ? "actif" : "neutre";
        return Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
    }

    function toolbarHTML() {
        const filtres = Game.constants?.filtresInventaire || [
            { id: "tous", nom: "Tous" }, { id: "favoris", nom: "Favoris" }, { id: "arme", nom: "Armes" },
            { id: "armure", nom: "Armures" }, { id: "accessoire", nom: "Accessoires" }, { id: "consommable", nom: "Consommables" },
            { id: "materiau", nom: "Materiaux" }, { id: "quete", nom: "Quetes" }, { id: "divers", nom: "Divers" }
        ];
        const tris = Game.constants?.trisInventaire || [
            { id: "nom", nom: "Nom" }, { id: "type", nom: "Type" }, { id: "rarete", nom: "Rarete" },
            { id: "niveau", nom: "Niveau requis" }, { id: "prix", nom: "Prix" }, { id: "atk", nom: "ATK" },
            { id: "atkMagique", nom: "ATK magique" }, { id: "def", nom: "DEF" }, { id: "defMagique", nom: "DEF magique" }
        ];
        return `
            <div class="nvi-toolbar">
                <div class="nvi-toolbar__top">
                    <div>
                        <h2>Marchand</h2>
                        <p>${escapeHtml(Game.ui.marchandActuel?.nom || "Marchand")}</p>
                    </div>
                    <button onclick="NVM_triAutomatiqueInventaire()">Tri auto</button>
                    <button onclick="ouvrirExploration()">Retour</button>
                </div>
                <div class="nvi-toolbar__search-row">
                    <input id="nvmSearch" type="text" placeholder="Rechercher..." value="${escapeAttr(Game.ui.rechercheInventaire || "")}" oninput="NVM_changerRecherche(this.value)">
                    <select onchange="NVM_changerTri(this.value)">
                        ${tris.map(tri => `<option value="${escapeAttr(tri.id)}" ${Game.ui.triInventaire === tri.id ? "selected" : ""}>${escapeHtml(tri.nom)}</option>`).join("")}
                    </select>
                    <button onclick="NVM_inverserOrdreTri()">${Game.ui.ordreTriInventaire === "asc" ? "ASC" : "DESC"}</button>
                </div>
                <div class="nvi-filters">
                    ${filtres.map(filtre => `<button class="nvi-filter" data-etat="${etatFiltre(filtre.id)}" onclick="NVM_changerFiltre('${escapeJs(filtre.id)}')">${escapeHtml(filtre.nom)}</button>`).join("")}
                </div>
            </div>
        `;
    }

    function merchantViewHTML() {
        return `
            <section class="nvi-window nvm-window">
                ${toolbarHTML()}
                <div class="nvi-layout nvi-layout--merchant">
                    <div class="nvi-panel">
                        <div class="nvi-panel__title"><strong>Marchand</strong><span>${(Game.ui.marchandActuel?.inventaire || []).length} objet(s)</span></div>
                        ${merchantGridHTML()}
                    </div>
                    <div class="nvi-panel">
                        <div class="nvi-panel__title"><strong>Ton sac</strong><span>${(Game.data.personnage.inventaire || []).length} pile(s)</span></div>
                        ${playerGridHTML()}
                    </div>
                    ${detailsHTML()}
                </div>
            </section>
        `;
    }

    function openMerchant(idPnj) {
        if (!hasGame()) return;
        if (typeof changerVue === "function") changerVue("marchand");
        if (idPnj) Game.ui.marchandActuel = Game.cache?.pnjParId?.[idPnj] || null;
        if (!Game.ui.marchandActuel) {
            journal("Marchand introuvable.");
            return;
        }
        assurerEtatFiltres();
        NVM_STATE.selection = null;
        NVM_STATE.quantity = 1;
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(merchantViewHTML());
    }

    function redraw() {
        if (!hasGame() || Game.ui.vueActive !== "marchand" || !Game.ui.marchandActuel) return;
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(merchantViewHTML());
    }

    function modifierQuantite(delta, max) {
        setQuantite(Number(NVM_STATE.quantity || 1) + Number(delta || 0), max);
    }

    function setQuantite(value, max) {
        NVM_STATE.quantity = Math.max(1, Math.min(Number(max || 1), Number(value || 1)));
        redraw();
    }

    function changerRecherche(value) {
        Game.ui.rechercheInventaire = normaliser(value);
        NVM_STATE.selection = null;
        redraw();
        setTimeout(() => {
            const search = document.getElementById("nvmSearch");
            if (search) {
                search.focus();
                search.setSelectionRange(search.value.length, search.value.length);
            }
        }, 0);
    }

    function changerTri(value) {
        Game.ui.triInventaire = value;
        Game.ui.ordreTriInventaire = Game.constants?.ordreTriParCritere?.[value] || Game.ui.ordreTriInventaire || "asc";
        redraw();
    }

    function inverserOrdreTri() {
        Game.ui.ordreTriInventaire = Game.ui.ordreTriInventaire === "asc" ? "desc" : "asc";
        if (Game.constants?.ordreTriParCritere) Game.constants.ordreTriParCritere[Game.ui.triInventaire] = Game.ui.ordreTriInventaire;
        redraw();
    }

    function changerFiltre(idFiltre) {
        assurerEtatFiltres();
        if (idFiltre === "tous") {
            if (typeof reinitialiserFiltresInventaire === "function") reinitialiserFiltresInventaire();
            else {
                Game.ui.etatFiltresInventaire.favoris = false;
                Object.keys(Game.ui.etatFiltresInventaire.types).forEach(key => Game.ui.etatFiltresInventaire.types[key] = "neutre");
            }
            NVM_STATE.selection = null;
            redraw();
            return;
        }
        if (idFiltre === "favoris") {
            Game.ui.etatFiltresInventaire.favoris = !Game.ui.etatFiltresInventaire.favoris;
            if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
            NVM_STATE.selection = null;
            redraw();
            return;
        }
        const actuel = Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
        Game.ui.etatFiltresInventaire.types[idFiltre] = actuel === "neutre" ? "actif" : actuel === "actif" ? "exclu" : "neutre";
        if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
        NVM_STATE.selection = null;
        redraw();
    }

    function comparerItems(a, b) {
        const objA = objet(a.id);
        const objB = objet(b.id);
        if (!objA || !objB) return 0;
        let result = 0;
        switch (Game.ui.triInventaire) {
            case "nom": result = String(objA.nom || "").localeCompare(String(objB.nom || "")); break;
            case "type": result = String(objA.type || "").localeCompare(String(objB.type || "")); break;
            case "rarete": {
                const ordreRarete = { commun: 1, "peu-commun": 2, rare: 3, epique: 4, "épique": 4, legendaire: 5, "légendaire": 5, mythique: 6 };
                result = (ordreRarete[objB.rarete] || 0) - (ordreRarete[objA.rarete] || 0);
                break;
            }
            case "niveau": result = (objB.niveauRequis || 1) - (objA.niveauRequis || 1); break;
            case "prix": result = (objB.prix || 0) - (objA.prix || 0); break;
            case "atk": result = (objB.attaque || 0) - (objA.attaque || 0); break;
            case "atkMagique": result = (objB.attaqueMagique || 0) - (objA.attaqueMagique || 0); break;
            case "def": result = (objB.defense || 0) - (objA.defense || 0); break;
            case "defMagique": result = (objB.defenseMagique || 0) - (objA.defenseMagique || 0); break;
            default: result = String(objA.nom || "").localeCompare(String(objB.nom || "")); break;
        }
        return Game.ui.ordreTriInventaire === "desc" ? -result : result;
    }

    function triAutomatiqueInventaire() {
        if (!hasGame()) return;
        const inventaire = Game.data.personnage.inventaire || [];
        const lockedSlots = new Map();
        const movable = [];
        inventaire.forEach(item => {
            const slot = Number(item.slot);
            if (isLocked(item) && Number.isInteger(slot) && slot >= 0 && !lockedSlots.has(slot)) {
                lockedSlots.set(slot, item);
            } else {
                movable.push(item);
            }
        });
        const totalSlots = Math.max(NVM_CONFIG.inventorySlots, inventaire.length + lockedSlots.size + 12);
        const freeSlots = [];
        for (let slot = 0; slot < totalSlots; slot++) if (!lockedSlots.has(slot)) freeSlots.push(slot);
        movable.sort(comparerItems).forEach((item, index) => {
            item.slot = freeSlots[index] ?? index;
            Game.data.personnage.inventaireSlots ??= {};
            Game.data.personnage.inventaireSlots[itemKey(item)] = item.slot;
        });
        journal(lockedSlots.size > 0 ? `Inventaire trie. ${lockedSlots.size} item(s) bloque(s) conserve(s).` : "Inventaire trie automatiquement.");
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("merchant inventory auto sort");
        redraw();
    }

    function toggleLock(idObjet) {
        const item = (Game.data.personnage.inventaire || []).find(entry => entry.id === idObjet);
        if (!item) return;
        const next = !isLocked(item);
        setLocked(item, next);
        journal(next ? `${objetNom(idObjet)} est bloque sur sa case.` : `${objetNom(idObjet)} est debloque.`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("merchant inventory lock toggle");
        redraw();
    }

    function buySelection(idObjet) {
        if (typeof acheterObjet === "function") acheterObjet(idObjet, NVM_STATE.quantity || 1);
        NVM_STATE.quantity = 1;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("merchant buy");
        redraw();
    }

    function sellSelection(idObjet) {
        if (typeof vendreObjet === "function") vendreObjet(idObjet, NVM_STATE.quantity || 1);
        NVM_STATE.quantity = 1;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("merchant sell");
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
        const interval = setInterval(() => {
            patchEntrypoints();
            tries++;
            if (tries >= 20) clearInterval(interval);
        }, 250);
        console.log("Inventory_Merchant_UI.js charge — " + NVM_VERSION);
    }

    window.NVM_selectionner = selectItem;
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
    window.NVM_redessinerVueActive = redraw;
    window.NVM_VERSION = NVM_VERSION;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();