(function () {
    "use strict";

    const NV_INVENTORY_GRID_VERSION = "v0.9.9.11-no-player-legacy-ui";

    const NVI_CONFIG = {
        inventorySlots: 72,
        merchantSlots: 48,
        columnsInventory: 9,
        columnsMerchant: 8
    };

    const NVI_STATE = {
        selection: null,
        drag: null,
        deleteConfirmId: null,
        quantity: 1
    };

    function NVI_hasGame() {
        return typeof Game !== "undefined" && Game?.data?.personnage;
    }

    function NVI_escape(value) {
        if (typeof echapperHTML === "function") return echapperHTML(value);
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function NVI_escapeAttr(value) {
        return NVI_escape(value).replace(/`/g, "&#096;");
    }

    function NVI_escapeJs(value) {
        return String(value ?? "")
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r");
    }

    function NVI_journal(message) {
        if (typeof ajouterJournal === "function") ajouterJournal(String(message || ""));
    }

    function NVI_objet(idObjet) {
        if (typeof trouverObjet === "function") return trouverObjet(idObjet);
        return Game.cache?.objetsParId?.[idObjet] || null;
    }

    function NVI_objetNom(idObjet) {
        return NVI_objet(idObjet)?.nom || idObjet;
    }

    function NVI_rarete(objet) {
        if (typeof classeRarete === "function") return classeRarete(objet);
        return objet?.rarete || "commun";
    }

    function NVI_typeFiltre(objet) {
        if (typeof obtenirTypeFiltreObjet === "function") return obtenirTypeFiltreObjet(objet);
        return objet?.type || "divers";
    }

    function NVI_estFavori(idObjet) {
        if (typeof estFavori === "function") return estFavori(idObjet);
        return (Game.data.personnage.favoris || []).includes(idObjet);
    }

    function NVI_normaliserTexte(value) {
        if (typeof normaliserTexte === "function") return normaliserTexte(value);
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
    }

    function NVI_passeRecherche(objet) {
        if (typeof objetPasseRecherche === "function") return objetPasseRecherche(objet);
        const recherche = NVI_normaliserTexte(Game.ui.rechercheInventaire || "");
        if (!recherche) return true;
        return NVI_normaliserTexte(`${objet?.nom || ""} ${objet?.description || ""} ${objet?.type || ""} ${objet?.rarete || ""}`).includes(recherche);
    }

    function NVI_passeFiltre(objet) {
        if (typeof objetPasseFiltre === "function") return objetPasseFiltre(objet);
        const typeFiltre = NVI_typeFiltre(objet);
        const etat = Game.ui.etatFiltresInventaire?.types?.[typeFiltre] || "neutre";
        if (etat === "exclu") return false;
        const actifs = Object.entries(Game.ui.etatFiltresInventaire?.types || {})
            .filter(([, value]) => value === "actif")
            .map(([key]) => key);
        if (actifs.length && !actifs.includes(typeFiltre)) return false;
        if (Game.ui.etatFiltresInventaire?.favoris && !NVI_estFavori(objet.id)) return false;
        return true;
    }

    function NVI_itemVisible(item) {
        const objet = NVI_objet(item?.id);
        if (!objet) return false;
        return NVI_passeFiltre(objet) && NVI_passeRecherche(objet);
    }

    function NVI_assurerEtatFiltres() {
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

    function NVI_cleItemInventaire(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function NVI_assurerCarteSlots() {
        const personnage = Game.data.personnage;
        personnage.inventaireSlots ??= {};
        if (!personnage.inventaireSlots || typeof personnage.inventaireSlots !== "object" || Array.isArray(personnage.inventaireSlots)) personnage.inventaireSlots = {};
        return personnage.inventaireSlots;
    }

    function NVI_assurerCarteVerrous() {
        const personnage = Game.data.personnage;
        personnage.inventaireVerrous ??= {};
        if (!personnage.inventaireVerrous || typeof personnage.inventaireVerrous !== "object" || Array.isArray(personnage.inventaireVerrous)) personnage.inventaireVerrous = {};
        return personnage.inventaireVerrous;
    }

    function NVI_freeSlot(occupied, totalSlots) {
        for (let i = 0; i < totalSlots; i++) if (!occupied.has(i)) return i;
        return totalSlots;
    }

    function NVI_lireVerrouPersiste(item) {
        const carte = NVI_assurerCarteVerrous();
        const cle = NVI_cleItemInventaire(item);
        if (!cle) return false;
        if (Object.prototype.hasOwnProperty.call(carte, cle)) return Boolean(carte[cle]);
        const ancienEtat = Boolean(item?.verrouille || item?.locked || item?.bloque);
        carte[cle] = ancienEtat;
        return ancienEtat;
    }

    function NVI_ecrireVerrouPersiste(item, actif) {
        const carte = NVI_assurerCarteVerrous();
        const cle = NVI_cleItemInventaire(item);
        if (!cle) return;
        carte[cle] = Boolean(actif);
        item.verrouille = Boolean(actif);
        delete item.locked;
        delete item.bloque;
    }

    function NVI_supprimerVerrouPersiste(itemOuCle) {
        const carte = NVI_assurerCarteVerrous();
        const cle = typeof itemOuCle === "string" ? itemOuCle : NVI_cleItemInventaire(itemOuCle);
        if (cle) delete carte[cle];
    }

    function NVI_lireSlotPersiste(item) {
        const carte = NVI_assurerCarteSlots();
        const cle = NVI_cleItemInventaire(item);
        if (!cle) return null;
        const slot = Number(carte[cle]);
        return Number.isInteger(slot) && slot >= 0 ? slot : null;
    }

    function NVI_ecrireSlotPersiste(item, slot) {
        const carte = NVI_assurerCarteSlots();
        const cle = NVI_cleItemInventaire(item);
        const slotCorrige = Number(slot);
        if (!cle || !Number.isInteger(slotCorrige) || slotCorrige < 0) return;
        item.slot = slotCorrige;
        carte[cle] = slotCorrige;
    }

    function NVI_supprimerSlotPersiste(itemOuCle) {
        const carte = NVI_assurerCarteSlots();
        const cle = typeof itemOuCle === "string" ? itemOuCle : NVI_cleItemInventaire(itemOuCle);
        if (cle) delete carte[cle];
    }

    function NVI_synchroniserVerrousInventaire() {
        const inventaire = Game.data.personnage.inventaire ?? [];
        const clesValides = new Set();
        inventaire.forEach(item => {
            const cle = NVI_cleItemInventaire(item);
            if (!cle) return;
            clesValides.add(cle);
            item.verrouille = NVI_lireVerrouPersiste(item);
            delete item.locked;
            delete item.bloque;
        });
        const carte = NVI_assurerCarteVerrous();
        Object.keys(carte).forEach(cle => {
            if (!clesValides.has(cle)) delete carte[cle];
        });
    }

    function NVI_synchroniserSlotsDepuisCarte() {
        NVI_synchroniserVerrousInventaire();
        const inventaire = Game.data.personnage.inventaire ?? [];
        const occupied = new Set();
        inventaire.forEach(item => {
            const persisted = NVI_lireSlotPersiste(item);
            const current = Number(item.slot);
            const slot = persisted !== null ? persisted : Number.isInteger(current) && current >= 0 ? current : null;
            if (slot !== null && !occupied.has(slot)) {
                NVI_ecrireSlotPersiste(item, slot);
                occupied.add(slot);
                return;
            }
            item.slot = null;
        });
        inventaire.forEach(item => {
            if (item.slot !== null && item.slot !== undefined) return;
            const slot = NVI_freeSlot(occupied, Math.max(NVI_CONFIG.inventorySlots, inventaire.length + 12));
            NVI_ecrireSlotPersiste(item, slot);
            occupied.add(slot);
        });
        const clesValides = new Set(inventaire.map(NVI_cleItemInventaire));
        const slots = NVI_assurerCarteSlots();
        Object.keys(slots).forEach(cle => {
            if (!clesValides.has(cle)) delete slots[cle];
        });
    }

    function NVI_normaliserSlotsInventaire() {
        Game.data.personnage.inventaire ??= [];
        NVI_synchroniserSlotsDepuisCarte();
    }

    function NVI_inventoryMaxSlot() {
        const inventaire = Game.data.personnage.inventaire ?? [];
        const maxUsed = inventaire.reduce((max, item) => Math.max(max, Number(item.slot || 0)), 0);
        return Math.max(NVI_CONFIG.inventorySlots, maxUsed + 9);
    }

    function NVI_estItemVerrouille(item) {
        return Boolean(item && NVI_lireVerrouPersiste(item));
    }

    function NVI_slotsOccupesMap() {
        NVI_synchroniserSlotsDepuisCarte();
        const map = new Map();
        (Game.data.personnage.inventaire || []).forEach(item => {
            const slot = Number(item.slot);
            if (Number.isInteger(slot) && slot >= 0) map.set(slot, item);
        });
        return map;
    }

    function NVI_labelObjet(objet) {
        const type = String(objet?.type || "").toLowerCase();
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

    function NVI_iconeObjet(objet) {
        if (objet?.image) return `<img src="${NVI_escapeAttr(objet.image)}" alt="${NVI_escapeAttr(objet.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">${NVI_escape(NVI_labelObjet(objet))}</span>`;
    }

    function NVI_selectionKey(contexte, source, idObjet) {
        return `${contexte}:${source}:${idObjet}`;
    }

    function NVI_estSelectionne(contexte, source, idObjet) {
        return NVI_STATE.selection === NVI_selectionKey(contexte, source, idObjet);
    }

    function NVI_selectionner(contexte, source, idObjet) {
        if (contexte === "inventaire" && source === "player") return;
        const cle = NVI_selectionKey(contexte, source, idObjet);
        NVI_STATE.selection = NVI_STATE.selection === cle ? null : cle;
        NVI_STATE.deleteConfirmId = null;
        NVI_redessinerVueActive();
    }

    function NVI_itemElementHTML(item, contexte, source, options = {}) {
        const objet = NVI_objet(item.id);
        if (!objet) return "";
        const isPlayerInventory = contexte === "inventaire" && source === "player";
        const rarete = NVI_rarete(objet);
        const selectionne = !isPlayerInventory && NVI_estSelectionne(contexte, source, item.id);
        const verrouille = source === "player" && NVI_estItemVerrouille(item);
        const peutDrag = !isPlayerInventory && Boolean(options.draggable) && !verrouille;
        const idJs = NVI_escapeJs(item.id);
        const contexteJs = NVI_escapeJs(contexte);
        const sourceJs = NVI_escapeJs(source);
        const dragAttr = peutDrag ? `ondragstart="NVI_dragStart(event, '${idJs}', ${Number(item.slot || 0)})"` : "";
        const clickAttr = isPlayerInventory ? "" : `onclick="NVI_selectionner('${contexteJs}', '${sourceJs}', '${idJs}')"`;
        const dblClickAttr = isPlayerInventory ? "" : `ondblclick="NVI_doubleClickItem('${contexteJs}', '${sourceJs}', '${idJs}')"`;

        return `
            <button
                type="button"
                class="nvi-item nvi-item--${NVI_escapeAttr(rarete)} ${selectionne ? "nvi-item--selected" : ""} ${verrouille ? "nvi-item--locked" : ""}"
                draggable="${peutDrag ? "true" : "false"}"
                ${dragAttr}
                ${clickAttr}
                ${dblClickAttr}
                title="${NVI_escapeAttr(objet.nom || item.id)}${verrouille ? " - emplacement verrouille" : ""}"
                data-nvi-item-id="${NVI_escapeAttr(item.id)}"
            >
                ${NVI_estFavori(item.id) ? `<span class="nvi-item__favorite">Favori</span>` : ""}
                ${verrouille ? `<span class="nvi-item__lock">Lock</span>` : ""}
                <span class="nvi-item__icon">${NVI_iconeObjet(objet)}</span>
                ${Number(item.quantite || 1) > 1 ? `<span class="nvi-item__qty">${Number(item.quantite || 1)}</span>` : ""}
            </button>
        `;
    }

    function NVI_slotHTML(index, item, contexte, source, options = {}) {
        const isPlayerInventory = contexte === "inventaire" && source === "player";
        const visible = item ? NVI_itemVisible(item) : false;
        const hiddenOccupied = item && !visible;
        const verrouille = source === "player" && item && NVI_estItemVerrouille(item);
        const droppableAttr = !isPlayerInventory && options.droppable ? `ondragover="NVI_dragOver(event)" ondrop="NVI_dropOnSlot(event, ${index})"` : "";
        return `
            <div
                class="nvi-slot ${item ? "nvi-slot--occupied" : ""} ${hiddenOccupied ? "nvi-slot--filtered" : ""} ${verrouille ? "nvi-slot--locked" : ""}"
                data-slot="${index}"
                ${droppableAttr}
            >
                ${item && visible ? NVI_itemElementHTML(item, contexte, source, options) : hiddenOccupied ? `<span class="nvi-slot__filtered-dot" title="Objet masque par les filtres"></span>` : ""}
            </div>
        `;
    }

    function NVI_gridInventaireHTML(contexte = "inventaire", source = "player") {
        const slots = NVI_slotsOccupesMap();
        const total = NVI_inventoryMaxSlot();
        let html = "";
        for (let i = 0; i < total; i++) html += NVI_slotHTML(i, slots.get(i), contexte, source, { draggable: true, droppable: true });
        return `<div class="nvi-grid nvi-grid--inventory" style="--nvi-columns:${NVI_CONFIG.columnsInventory};">${html}</div>`;
    }

    function NVI_gridMarchandHTML() {
        const items = Game.ui.marchandActuel?.inventaire || [];
        const total = Math.max(NVI_CONFIG.merchantSlots, items.length);
        let html = "";
        for (let i = 0; i < total; i++) html += NVI_slotHTML(i, items[i] || null, "marchand", "merchant", { draggable: false, droppable: false });
        return `<div class="nvi-grid nvi-grid--merchant" style="--nvi-columns:${NVI_CONFIG.columnsMerchant};">${html}</div>`;
    }

    function NVI_obtenirItemSelectionne() {
        if (!NVI_STATE.selection) return null;
        const [contexte, source, idObjet] = NVI_STATE.selection.split(":");
        if (!idObjet) return null;
        if (source === "player") {
            const item = (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);
            if (!item) return null;
            return { contexte, source, idObjet, item, objet: NVI_objet(idObjet) };
        }
        if (source === "merchant") {
            const item = (Game.ui.marchandActuel?.inventaire || []).find(entree => entree.id === idObjet);
            if (!item) return null;
            return { contexte, source, idObjet, item, objet: NVI_objet(idObjet) };
        }
        return null;
    }

    function NVI_detailsObjet(objet) {
        if (!objet) return "";
        if (typeof creerDetailsObjetInventaire === "function") return creerDetailsObjetInventaire(objet);
        if (typeof creerDetailsObjet === "function") return creerDetailsObjet(objet);
        const stats = [
            ["ATK", "attaque"], ["DEF", "defense"], ["ATK MAGIC", "attaqueMagique"], ["DEF MAGIC", "defenseMagique"],
            ["PV", "pvMax"], ["MANA", "manaMax"], ["STAMINA", "staminaMax"],
            ["FOR", "force"], ["DEX", "dexterite"], ["INT", "intelligence"], ["VIT", "vitalite"], ["LUCK", "chance"]
        ];
        return stats.filter(([, key]) => objet[key]).map(([label, key]) => `${label} +${objet[key]}`).join(" ");
    }

    function NVI_quantiteInput(max, prefix = "nviActionQty") {
        const value = Math.min(Math.max(1, Number(NVI_STATE.quantity || 1)), Math.max(1, Number(max || 1)));
        NVI_STATE.quantity = value;
        return `
            <div class="nvi-quantity">
                <button onclick="NVI_modifierQuantite(-1, ${max})">-</button>
                <input id="${prefix}" type="number" min="1" max="${max}" value="${value}" oninput="NVI_setQuantite(this.value, ${max})">
                <button onclick="NVI_modifierQuantite(1, ${max})">+</button>
                <button onclick="NVI_setQuantite(${max}, ${max})">MAX</button>
            </div>
        `;
    }

    function NVI_actionPrix(type, objet, quantite) {
        const prix = type === "achat" ? Number(objet?.prix || 0) : Math.floor(Number(objet?.prix || 0) / 2);
        return prix * Math.max(1, Number(quantite || 1));
    }

    function NVI_detailsPanelHTML(contexte) {
        const selection = NVI_obtenirItemSelectionne();
        if (!selection || !selection.objet) {
            return `
                <aside class="nvi-details">
                    <div class="nvi-details__empty">
                        <strong>Aucun objet selectionne</strong>
                        <span>Clique sur une case pour inspecter un objet.</span>
                    </div>
                </aside>
            `;
        }
        const { source, idObjet, item, objet } = selection;
        const rarete = NVI_rarete(objet);
        const quantite = Number(item.quantite || 1);
        const details = NVI_detailsObjet(objet);
        const prixAchat = NVI_actionPrix("achat", objet, NVI_STATE.quantity);
        const prixVente = NVI_actionPrix("vente", objet, NVI_STATE.quantity);
        let actions = "";

        if (source === "player" && contexte === "marchand") {
            const verrouille = NVI_estItemVerrouille(item);
            actions += `
                <button class="nvi-lock-toggle ${verrouille ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" onclick="event.stopPropagation(); NVI_toggleVerrouillage('${NVI_escapeJs(idObjet)}')">
                    <span class="nvi-lock-toggle__text">${verrouille ? "Bloque" : "Debloque"}</span>
                </button>
                <div class="nvi-trade-box">
                    <strong>Vente</strong>
                    ${NVI_quantiteInput(quantite, "nviSellQty")}
                    <p>Gain : <strong>${prixVente} or</strong></p>
                    <button onclick="NVI_vendreSelection('${NVI_escapeJs(idObjet)}')">Vendre</button>
                </div>
            `;
        }

        if (source === "merchant") {
            actions += `
                <div class="nvi-trade-box">
                    <strong>Achat</strong>
                    ${NVI_quantiteInput(quantite, "nviBuyQty")}
                    <p>Cout : <strong>${prixAchat} or</strong></p>
                    <button onclick="NVI_acheterSelection('${NVI_escapeJs(idObjet)}')">Acheter</button>
                </div>
            `;
        }

        return `
            <aside class="nvi-details">
                <div class="nvi-details__header">
                    <div class="nvi-details__icon nvi-item--${NVI_escapeAttr(rarete)}">${NVI_iconeObjet(objet)}</div>
                    <div>
                        <h3 class="${NVI_escapeAttr(rarete)}">${NVI_escape(objet.nom || idObjet)}</h3>
                        <p>${NVI_escape(objet.type || "divers")} · ${NVI_escape(objet.rarete || "commun")}${quantite > 1 ? ` · x${quantite}` : ""}</p>
                    </div>
                </div>
                <p class="nvi-details__description">${NVI_escape(objet.description || "Aucune description.")}</p>
                ${details ? `<p class="nvi-details__stats">${details}</p>` : ""}
                ${actions}
            </aside>
        `;
    }

    function NVI_etatFiltre(idFiltre) {
        NVI_assurerEtatFiltres();
        if (idFiltre === "tous") {
            const types = Game.ui.etatFiltresInventaire.types || {};
            const actif = Object.values(types).some(etat => etat !== "neutre") || Game.ui.etatFiltresInventaire.favoris;
            return actif ? "neutre" : "actif";
        }
        if (idFiltre === "favoris") return Game.ui.etatFiltresInventaire.favoris ? "actif" : "neutre";
        return Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
    }

    function NVI_toolbarHTML(contexte) {
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
                        <h2>${contexte === "marchand" ? "Marchand" : "Inventaire"}</h2>
                        ${contexte === "marchand" && Game.ui.marchandActuel ? `<p>${NVI_escape(Game.ui.marchandActuel.nom || "Marchand")}</p>` : `<p>Inventaire refonte.</p>`}
                    </div>
                    <button onclick="NVI_triAutomatiqueInventaire()">Tri auto</button>
                    <button onclick="ouvrirExploration()">Retour</button>
                </div>
                <div class="nvi-toolbar__search-row">
                    <input id="nviSearch" type="text" placeholder="Rechercher..." value="${NVI_escapeAttr(Game.ui.rechercheInventaire || "")}" oninput="NVI_changerRecherche(this.value)">
                    <select onchange="NVI_changerTri(this.value)">
                        ${tris.map(tri => `<option value="${NVI_escapeAttr(tri.id)}" ${Game.ui.triInventaire === tri.id ? "selected" : ""}>${NVI_escape(tri.nom)}</option>`).join("")}
                    </select>
                    <button onclick="NVI_inverserOrdreTri()">${Game.ui.ordreTriInventaire === "asc" ? "ASC" : "DESC"}</button>
                </div>
                <div class="nvi-filters">
                    ${filtres.map(filtre => `<button class="nvi-filter" data-etat="${NVI_etatFiltre(filtre.id)}" onclick="NVI_changerFiltre('${NVI_escapeJs(filtre.id)}')">${NVI_escape(filtre.nom)}</button>`).join("")}
                </div>
            </div>
        `;
    }

    function NVI_vueInventaireHTML() {
        return `
            <section class="nvi-window">
                ${NVI_toolbarHTML("inventaire")}
                <div class="nvi-layout nvi-layout--inventory nvimp-no-details">
                    <div class="nvi-panel">
                        <div class="nvi-panel__title"><strong>Sac</strong><span>${(Game.data.personnage.inventaire || []).length} pile(s)</span></div>
                        ${NVI_gridInventaireHTML("inventaire", "player")}
                    </div>
                </div>
            </section>
        `;
    }

    function NVI_vueMarchandHTML() {
        return `
            <section class="nvi-window">
                ${NVI_toolbarHTML("marchand")}
                <div class="nvi-layout nvi-layout--merchant">
                    <div class="nvi-panel">
                        <div class="nvi-panel__title"><strong>Marchand</strong><span>${(Game.ui.marchandActuel?.inventaire || []).length} objet(s)</span></div>
                        ${NVI_gridMarchandHTML()}
                    </div>
                    <div class="nvi-panel">
                        <div class="nvi-panel__title"><strong>Ton sac</strong><span>${(Game.data.personnage.inventaire || []).length} pile(s)</span></div>
                        ${NVI_gridInventaireHTML("marchand", "player")}
                    </div>
                    ${NVI_detailsPanelHTML("marchand")}
                </div>
            </section>
        `;
    }

    function NVI_ouvrirInventaire() {
        if (!NVI_hasGame()) return;
        if (typeof changerVue === "function") changerVue("inventaire");
        NVI_assurerEtatFiltres();
        NVI_normaliserSlotsInventaire();
        NVI_STATE.selection = null;
        NVI_STATE.deleteConfirmId = null;
        NVI_STATE.quantity = 1;
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(NVI_vueInventaireHTML());
    }

    function NVI_ouvrirMarchand(idPnj) {
        if (!NVI_hasGame()) return;
        if (typeof changerVue === "function") changerVue("marchand");
        if (idPnj) Game.ui.marchandActuel = Game.cache?.pnjParId?.[idPnj] || null;
        if (!Game.ui.marchandActuel) {
            NVI_journal("Marchand introuvable.");
            return;
        }
        NVI_assurerEtatFiltres();
        NVI_normaliserSlotsInventaire();
        NVI_STATE.selection = null;
        NVI_STATE.deleteConfirmId = null;
        NVI_STATE.quantity = 1;
        if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(NVI_vueMarchandHTML());
    }

    function NVI_redessinerVueActive() {
        if (!NVI_hasGame()) return;
        if (Game.ui.vueActive === "marchand" && Game.ui.marchandActuel) {
            if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(NVI_vueMarchandHTML());
            return;
        }
        if (Game.ui.vueActive === "inventaire") {
            if (typeof afficherVuePrincipale === "function") afficherVuePrincipale(NVI_vueInventaireHTML());
        }
    }

    function NVI_changerModeMarchand(mode) {
        Game.ui.modeMarchand = mode;
        NVI_STATE.selection = null;
        NVI_STATE.quantity = 1;
        NVI_redessinerVueActive();
    }

    function NVI_changerRecherche(value) {
        Game.ui.rechercheInventaire = NVI_normaliserTexte(value);
        NVI_STATE.selection = null;
        NVI_redessinerVueActive();
        setTimeout(() => {
            const search = document.getElementById("nviSearch");
            if (search) {
                search.focus();
                search.setSelectionRange(search.value.length, search.value.length);
            }
        }, 0);
    }

    function NVI_changerTri(value) {
        Game.ui.triInventaire = value;
        Game.ui.ordreTriInventaire = Game.constants?.ordreTriParCritere?.[value] || Game.ui.ordreTriInventaire || "asc";
        NVI_redessinerVueActive();
    }

    function NVI_inverserOrdreTri() {
        Game.ui.ordreTriInventaire = Game.ui.ordreTriInventaire === "asc" ? "desc" : "asc";
        if (Game.constants?.ordreTriParCritere) Game.constants.ordreTriParCritere[Game.ui.triInventaire] = Game.ui.ordreTriInventaire;
        NVI_redessinerVueActive();
    }

    function NVI_changerFiltre(idFiltre) {
        NVI_assurerEtatFiltres();
        if (idFiltre === "tous") {
            if (typeof reinitialiserFiltresInventaire === "function") reinitialiserFiltresInventaire();
            else {
                Game.ui.etatFiltresInventaire.favoris = false;
                Object.keys(Game.ui.etatFiltresInventaire.types).forEach(key => Game.ui.etatFiltresInventaire.types[key] = "neutre");
            }
            NVI_STATE.selection = null;
            NVI_redessinerVueActive();
            return;
        }
        if (idFiltre === "favoris") {
            Game.ui.etatFiltresInventaire.favoris = !Game.ui.etatFiltresInventaire.favoris;
            if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
            NVI_STATE.selection = null;
            NVI_redessinerVueActive();
            return;
        }
        const actuel = Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
        Game.ui.etatFiltresInventaire.types[idFiltre] = actuel === "neutre" ? "actif" : actuel === "actif" ? "exclu" : "neutre";
        if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
        NVI_STATE.selection = null;
        NVI_redessinerVueActive();
    }

    function NVI_toggleVerrouillage(idObjet) {
        const item = (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);
        if (!item) return;
        const prochainEtat = !NVI_estItemVerrouille(item);
        NVI_ecrireVerrouPersiste(item, prochainEtat);
        const slot = Number(item.slot);
        if (Number.isInteger(slot) && slot >= 0) NVI_ecrireSlotPersiste(item, slot);
        NVI_journal(prochainEtat ? `${NVI_objetNom(idObjet)} est bloque sur sa case.` : `${NVI_objetNom(idObjet)} est debloque.`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid persistent lock toggle");
        NVI_STATE.selection = NVI_selectionKey(Game.ui.vueActive === "marchand" ? "marchand" : "inventaire", "player", idObjet);
        NVI_redessinerVueActive();
    }

    function NVI_comparerItemsPourTriAuto(a, b) {
        const objetA = NVI_objet(a.id);
        const objetB = NVI_objet(b.id);
        if (!objetA || !objetB) return 0;
        let resultat = 0;
        switch (Game.ui.triInventaire) {
            case "nom": resultat = String(objetA.nom || "").localeCompare(String(objetB.nom || "")); break;
            case "type": resultat = String(objetA.type || "").localeCompare(String(objetB.type || "")); break;
            case "rarete": {
                const ordreRarete = { commun: 1, "peu-commun": 2, rare: 3, epique: 4, "épique": 4, legendaire: 5, "légendaire": 5, mythique: 6 };
                resultat = (ordreRarete[objetB.rarete] || 0) - (ordreRarete[objetA.rarete] || 0);
                break;
            }
            case "niveau": resultat = (objetB.niveauRequis || 1) - (objetA.niveauRequis || 1); break;
            case "prix": resultat = (objetB.prix || 0) - (objetA.prix || 0); break;
            case "atk": resultat = (objetB.attaque || 0) - (objetA.attaque || 0); break;
            case "atkMagique": resultat = (objetB.attaqueMagique || 0) - (objetA.attaqueMagique || 0); break;
            case "def": resultat = (objetB.defense || 0) - (objetA.defense || 0); break;
            case "defMagique": resultat = (objetB.defenseMagique || 0) - (objetA.defenseMagique || 0); break;
            default: resultat = String(objetA.nom || "").localeCompare(String(objetB.nom || "")); break;
        }
        return Game.ui.ordreTriInventaire === "desc" ? -resultat : resultat;
    }

    function NVI_triAutomatiqueInventaire() {
        if (!NVI_hasGame()) return;
        NVI_synchroniserVerrousInventaire();
        NVI_synchroniserSlotsDepuisCarte();
        const inventaire = Game.data.personnage.inventaire || [];
        const slotsProteges = new Map();
        const mobiles = [];
        inventaire.forEach(item => {
            const verrou = NVI_estItemVerrouille(item);
            const slot = Number(item.slot);
            if (!verrou) {
                mobiles.push(item);
                return;
            }
            if (Number.isInteger(slot) && slot >= 0 && !slotsProteges.has(slot)) {
                slotsProteges.set(slot, item);
                NVI_ecrireSlotPersiste(item, slot);
                NVI_ecrireVerrouPersiste(item, true);
                return;
            }
            const nouveauSlot = NVI_freeSlot(new Set(slotsProteges.keys()), Math.max(NVI_CONFIG.inventorySlots, inventaire.length + 12));
            slotsProteges.set(nouveauSlot, item);
            NVI_ecrireSlotPersiste(item, nouveauSlot);
            NVI_ecrireVerrouPersiste(item, true);
        });
        const totalSlots = Math.max(NVI_CONFIG.inventorySlots, inventaire.length + slotsProteges.size + 12);
        const freeSlots = [];
        for (let slot = 0; slot < totalSlots; slot++) if (!slotsProteges.has(slot)) freeSlots.push(slot);
        mobiles.sort(NVI_comparerItemsPourTriAuto).forEach((item, index) => {
            NVI_ecrireVerrouPersiste(item, false);
            NVI_ecrireSlotPersiste(item, freeSlots[index] ?? index);
        });
        NVI_synchroniserVerrousInventaire();
        NVI_synchroniserSlotsDepuisCarte();
        const nbVerrouilles = inventaire.filter(item => NVI_estItemVerrouille(item)).length;
        NVI_journal(nbVerrouilles > 0 ? `Inventaire trie. ${nbVerrouilles} item(s) bloque(s) conserve(s).` : "Inventaire trie automatiquement.");
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid auto sort persistent locks");
        NVI_redessinerVueActive();
    }

    function NVI_modifierQuantite(delta, max) {
        NVI_setQuantite(Number(NVI_STATE.quantity || 1) + Number(delta || 0), max);
    }

    function NVI_setQuantite(value, max) {
        NVI_STATE.quantity = Math.max(1, Math.min(Number(max || 1), Number(value || 1)));
        NVI_redessinerVueActive();
    }

    function NVI_toggleFavori(idObjet) {
        Game.data.personnage.favoris ??= [];
        if (NVI_estFavori(idObjet)) Game.data.personnage.favoris = Game.data.personnage.favoris.filter(id => id !== idObjet);
        else Game.data.personnage.favoris.push(idObjet);
        NVI_redessinerVueActive();
    }

    function NVI_equiperObjetSelectionne(idObjet, emplacement = null) {
        if (typeof equiperObjetInterface === "function") equiperObjetInterface(idObjet, emplacement);
        else if (typeof equiperObjet === "function") equiperObjet(idObjet, emplacement);
        NVI_STATE.selection = null;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid equip");
        NVI_redessinerVueActive();
    }

    function NVI_utiliserObjetSelectionne(idObjet) {
        if (typeof utiliserObjet === "function") utiliserObjet(idObjet);
        NVI_STATE.selection = null;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid use");
        NVI_redessinerVueActive();
    }

    function NVI_acheterSelection(idObjet) {
        if (typeof acheterObjet === "function") acheterObjet(idObjet, NVI_STATE.quantity || 1);
        NVI_STATE.quantity = 1;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid buy");
        NVI_redessinerVueActive();
    }

    function NVI_vendreSelection(idObjet) {
        if (typeof vendreObjet === "function") vendreObjet(idObjet, NVI_STATE.quantity || 1);
        NVI_STATE.quantity = 1;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid sell");
        NVI_redessinerVueActive();
    }

    function NVI_demanderSuppression(idObjet) {
        NVI_STATE.deleteConfirmId = idObjet;
        NVI_redessinerVueActive();
    }

    function NVI_annulerSuppression() {
        NVI_STATE.deleteConfirmId = null;
        NVI_redessinerVueActive();
    }

    function NVI_supprimerStack(idObjet) {
        const item = (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);
        if (!item) return;
        const quantite = Number(item.quantite || 1);
        const itemKey = NVI_cleItemInventaire(item);
        Game.data.personnage.inventaire = (Game.data.personnage.inventaire || []).filter(entree => entree !== item);
        const sameRemaining = (Game.data.personnage.inventaire || []).some(entree => entree.id === idObjet);
        if (!sameRemaining) Game.data.personnage.favoris = (Game.data.personnage.favoris || []).filter(id => id !== idObjet);
        NVI_supprimerSlotPersiste(itemKey);
        NVI_supprimerVerrouPersiste(itemKey);
        NVI_journal(`${NVI_objetNom(idObjet)} x${quantite} supprime de l'inventaire.`);
        NVI_STATE.selection = null;
        NVI_STATE.deleteConfirmId = null;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid delete one stack");
        NVI_redessinerVueActive();
    }

    function NVI_doubleClickItem(contexte, source, idObjet) {
        if (contexte === "inventaire" && source === "player") return false;
        const objet = NVI_objet(idObjet);
        if (!objet) return;
        if (source === "merchant" || contexte === "marchand") {
            NVI_selectionner(contexte, source, idObjet);
            return;
        }
        if (objet.type === "consommable") {
            NVI_utiliserObjetSelectionne(idObjet);
            return;
        }
        NVI_equiperObjetSelectionne(idObjet);
    }

    function NVI_dragStart(event, idObjet, slot) {
        const slotElement = event.target.closest(".nvi-slot");
        const slotActuel = slotElement ? Number(slotElement.dataset.slot) : Number(slot);
        NVI_STATE.drag = { idObjet, slot: slotActuel };
        if (!event.dataTransfer) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", JSON.stringify(NVI_STATE.drag));
    }

    function NVI_dragOver(event) {
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    }

    function NVI_deplacerDOMSansRedraw(sourceSlot, targetSlot) {
        const conteneur = document.getElementById("vuePrincipale");
        if (!conteneur) return false;
        const sourceSlotElement = conteneur.querySelector(`.nvi-grid--inventory .nvi-slot[data-slot="${sourceSlot}"]`);
        const targetSlotElement = conteneur.querySelector(`.nvi-grid--inventory .nvi-slot[data-slot="${targetSlot}"]`);
        const sourceItemElement = sourceSlotElement?.querySelector(".nvi-item");
        if (!sourceSlotElement || !targetSlotElement || !sourceItemElement) return false;
        const targetItemElement = targetSlotElement.querySelector(".nvi-item");
        if (targetItemElement) {
            const placeholder = document.createComment("nvi-swap-placeholder");
            sourceSlotElement.appendChild(placeholder);
            targetSlotElement.appendChild(sourceItemElement);
            sourceSlotElement.appendChild(targetItemElement);
            placeholder.remove();
        } else targetSlotElement.appendChild(sourceItemElement);
        [sourceSlotElement, targetSlotElement].forEach(slot => {
            slot.classList.toggle("nvi-slot--occupied", Boolean(slot.querySelector(".nvi-item")));
            slot.classList.toggle("nvi-slot--locked", Boolean(slot.querySelector(".nvi-item--locked")));
        });
        return true;
    }

    function NVI_dropOnSlot(event, targetSlot) {
        event.preventDefault();
        let drag = NVI_STATE.drag;
        try {
            const data = event.dataTransfer?.getData("text/plain");
            if (data) drag = JSON.parse(data);
        } catch (erreur) {}
        if (!drag || drag.idObjet == null) return;
        const sourceSlot = Number(drag.slot);
        const target = Number(targetSlot);
        if (!Number.isInteger(sourceSlot) || !Number.isInteger(target) || sourceSlot === target) {
            NVI_STATE.drag = null;
            return;
        }
        const inventaire = Game.data.personnage.inventaire || [];
        const sourceItem = inventaire.find(item => item.id === drag.idObjet && Number(item.slot) === sourceSlot) || inventaire.find(item => item.id === drag.idObjet);
        if (!sourceItem || NVI_estItemVerrouille(sourceItem)) return;
        const cibleItem = inventaire.find(item => Number(item.slot) === target);
        if (cibleItem && (!NVI_itemVisible(cibleItem) || NVI_estItemVerrouille(cibleItem))) return;
        if (cibleItem && cibleItem.id !== sourceItem.id) NVI_ecrireSlotPersiste(cibleItem, sourceSlot);
        NVI_ecrireSlotPersiste(sourceItem, target);
        const deplacementDomOk = NVI_deplacerDOMSansRedraw(sourceSlot, target);
        NVI_STATE.drag = null;
        if (!deplacementDomOk) NVI_redessinerVueActive();
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid move no redraw");
    }

    function NVI_patchCoreFunctions() {
        window.NVI_ouvrirInventaire = NVI_ouvrirInventaire;
        window.NVI_ouvrirMarchand = NVI_ouvrirMarchand;
        window.NVI_redessinerVueActive = NVI_redessinerVueActive;
        window.ouvrirInventaire = NVI_ouvrirInventaire;
        window.ouvrirMarchand = NVI_ouvrirMarchand;
        try { ouvrirInventaire = NVI_ouvrirInventaire; } catch (erreur) {}
        try { ouvrirMarchand = NVI_ouvrirMarchand; } catch (erreur) {}
        const boutonInventaire = document.getElementById("btnInventaire");
        if (boutonInventaire) {
            boutonInventaire.setAttribute("onclick", "NVI_ouvrirInventaire()");
            boutonInventaire.onclick = event => {
                event.preventDefault();
                NVI_ouvrirInventaire();
            };
        }
    }

    function NVI_demarrerSurveillanceEntrees() {
        let repetitions = 0;
        const interval = setInterval(() => {
            NVI_patchCoreFunctions();
            repetitions++;
            if (repetitions >= 20) clearInterval(interval);
        }, 250);
    }

    function NVI_patchAddItemSlots() {
        if (typeof ajouterObjetInventaire !== "function" || ajouterObjetInventaire.__NVI_0999_PATCH) return;
        const original = ajouterObjetInventaire;
        window.ajouterObjetInventaire = function (idObjet, quantite = 1) {
            const result = original(idObjet, quantite);
            NVI_synchroniserSlotsDepuisCarte();
            if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid add stable slot");
            return result;
        };
        window.ajouterObjetInventaire.__NVI_0999_PATCH = true;
    }

    function NVI_injecterStyle() {
        document.getElementById("nviGridInventoryStyle")?.remove();
    }

    function NVI_installer() {
        if (!NVI_hasGame()) {
            setTimeout(NVI_installer, 120);
            return;
        }
        NVI_injecterStyle();
        NVI_patchAddItemSlots();
        NVI_patchCoreFunctions();
        NVI_demarrerSurveillanceEntrees();
        console.log("Inventory_Grid_Metin2.js charge — " + NV_INVENTORY_GRID_VERSION);
    }

    window.NVI_ouvrirInventaire = NVI_ouvrirInventaire;
    window.NVI_ouvrirMarchand = NVI_ouvrirMarchand;
    window.NVI_redessinerVueActive = NVI_redessinerVueActive;
    window.NVI_changerModeMarchand = NVI_changerModeMarchand;
    window.NVI_changerRecherche = NVI_changerRecherche;
    window.NVI_changerTri = NVI_changerTri;
    window.NVI_inverserOrdreTri = NVI_inverserOrdreTri;
    window.NVI_changerFiltre = NVI_changerFiltre;
    window.NVI_toggleVerrouillage = NVI_toggleVerrouillage;
    window.NVI_triAutomatiqueInventaire = NVI_triAutomatiqueInventaire;
    window.NVI_modifierQuantite = NVI_modifierQuantite;
    window.NVI_setQuantite = NVI_setQuantite;
    window.NVI_toggleFavori = NVI_toggleFavori;
    window.NVI_equiperObjetSelectionne = NVI_equiperObjetSelectionne;
    window.NVI_utiliserObjetSelectionne = NVI_utiliserObjetSelectionne;
    window.NVI_acheterSelection = NVI_acheterSelection;
    window.NVI_vendreSelection = NVI_vendreSelection;
    window.NVI_demanderSuppression = NVI_demanderSuppression;
    window.NVI_annulerSuppression = NVI_annulerSuppression;
    window.NVI_supprimerStack = NVI_supprimerStack;
    window.NVI_selectionner = NVI_selectionner;
    window.NVI_doubleClickItem = NVI_doubleClickItem;
    window.NVI_dragStart = NVI_dragStart;
    window.NVI_dragOver = NVI_dragOver;
    window.NVI_dropOnSlot = NVI_dropOnSlot;
    window.NVI_VERSION = NV_INVENTORY_GRID_VERSION;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", NVI_installer);
    else NVI_installer();
})();