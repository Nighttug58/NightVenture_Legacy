(function () {
    "use strict";

    const NV_INVENTORY_GRID_VERSION = "v0.9.9.9-no-emoji-direct";

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

    function NVI_freeSlot(occupied, totalSlots) {
        for (let i = 0; i < totalSlots; i++) {
            if (!occupied.has(i)) return i;
        }
        return totalSlots;
    }

    function NVI_cleItemInventaire(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function NVI_assurerCarteSlots() {
        const personnage = Game.data.personnage;
        personnage.inventaireSlots ??= {};
        if (!personnage.inventaireSlots || typeof personnage.inventaireSlots !== "object" || Array.isArray(personnage.inventaireSlots)) {
            personnage.inventaireSlots = {};
        }
        return personnage.inventaireSlots;
    }

    function NVI_assurerCarteVerrous() {
        const personnage = Game.data.personnage;
        personnage.inventaireVerrous ??= {};
        if (!personnage.inventaireVerrous || typeof personnage.inventaireVerrous !== "object" || Array.isArray(personnage.inventaireVerrous)) {
            personnage.inventaireVerrous = {};
        }
        return personnage.inventaireVerrous;
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

    function NVI_supprimerVerrouPersiste(itemOuId) {
        const carte = NVI_assurerCarteVerrous();
        const cle = typeof itemOuId === "string" ? itemOuId : NVI_cleItemInventaire(itemOuId);
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

    function NVI_supprimerSlotPersiste(itemOuId) {
        const carte = NVI_assurerCarteSlots();
        const cle = typeof itemOuId === "string" ? itemOuId : NVI_cleItemInventaire(itemOuId);
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
            const slotPersiste = NVI_lireSlotPersiste(item);
            const slotItem = Number(item.slot);
            const slot = slotPersiste !== null
                ? slotPersiste
                : Number.isInteger(slotItem) && slotItem >= 0
                    ? slotItem
                    : null;

            if (slot !== null && !occupied.has(slot)) {
                item.slot = slot;
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
        const carte = NVI_assurerCarteSlots();
        Object.keys(carte).forEach(cle => {
            if (!clesValides.has(cle)) delete carte[cle];
        });
    }

    function NVI_normaliserSlotsInventaire(options = {}) {
        const inventaire = Game.data.personnage.inventaire ??= [];
        if (options.compact === true) {
            inventaire.forEach(item => {
                const slot = Number(item.slot);
                if (!Number.isInteger(slot) || slot < 0) item.slot = null;
            });
            return;
        }
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

    function NVI_definirVerrouillageItem(item, actif) {
        if (item) NVI_ecrireVerrouPersiste(item, actif);
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

    function NVI_itemsInventaireParSlot() {
        return NVI_slotsOccupesMap();
    }

    function NVI_trierListeCompacte(items) {
        const liste = [...items];
        liste.sort(NVI_comparerItemsPourTriAuto);
        return liste;
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
        if (objet?.image) return `<img src="${objet.image}" alt="${NVI_escape(objet.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">${NVI_escape(NVI_labelObjet(objet))}</span>`;
    }

    function NVI_selectionKey(contexte, source, idObjet) {
        return `${contexte}:${source}:${idObjet}`;
    }

    function NVI_estSelectionne(contexte, source, idObjet) {
        return NVI_STATE.selection === NVI_selectionKey(contexte, source, idObjet);
    }

    function NVI_selectionner(contexte, source, idObjet) {
        const cle = NVI_selectionKey(contexte, source, idObjet);
        NVI_STATE.selection = NVI_STATE.selection === cle ? null : cle;
        NVI_STATE.deleteConfirmId = null;
        NVI_redessinerVueActive();
    }

    function NVI_itemElementHTML(item, contexte, source, options = {}) {
        const objet = NVI_objet(item.id);
        if (!objet) return "";

        const rarete = NVI_rarete(objet);
        const selectionne = NVI_estSelectionne(contexte, source, item.id);
        const verrouille = source === "player" && NVI_estItemVerrouille(item);
        const peutDrag = Boolean(options.draggable) && !verrouille;
        const dragAttr = peutDrag ? `ondragstart="NVI_dragStart(event, '${item.id}', ${Number(item.slot || 0)})"` : "";

        return `
            <button
                type="button"
                class="nvi-item nvi-item--${rarete} ${selectionne ? "nvi-item--selected" : ""} ${verrouille ? "nvi-item--locked" : ""}"
                draggable="${peutDrag ? "true" : "false"}"
                ${dragAttr}
                onclick="NVI_selectionner('${contexte}', '${source}', '${item.id}')"
                ondblclick="NVI_doubleClickItem('${contexte}', '${source}', '${item.id}')"
                title="${NVI_escape(objet.nom || item.id)}${verrouille ? " - emplacement verrouille" : ""}"
                data-nvi-item-id="${item.id}"
            >
                ${NVI_estFavori(item.id) ? `<span class="nvi-item__favorite">Favori</span>` : ""}
                ${verrouille ? `<span class="nvi-item__lock">Lock</span>` : ""}
                <span class="nvi-item__icon">${NVI_iconeObjet(objet)}</span>
                ${Number(item.quantite || 1) > 1 ? `<span class="nvi-item__qty">${item.quantite}</span>` : ""}
            </button>
        `;
    }

    function NVI_slotHTML(index, item, contexte, source, options = {}) {
        const visible = item ? NVI_itemVisible(item) : false;
        const hiddenOccupied = item && !visible;
        const verrouille = source === "player" && item && NVI_estItemVerrouille(item);

        return `
            <div
                class="nvi-slot ${item ? "nvi-slot--occupied" : ""} ${hiddenOccupied ? "nvi-slot--filtered" : ""} ${verrouille ? "nvi-slot--locked" : ""}"
                data-slot="${index}"
                ${options.droppable ? `ondragover="NVI_dragOver(event)" ondrop="NVI_dropOnSlot(event, ${index})"` : ""}
            >
                ${item && visible ? NVI_itemElementHTML(item, contexte, source, options) : hiddenOccupied ? `<span class="nvi-slot__filtered-dot" title="Objet masque par les filtres"></span>` : ""}
            </div>
        `;
    }

    function NVI_gridInventaireHTML(contexte = "inventaire", source = "player") {
        const slots = NVI_itemsInventaireParSlot();
        const total = NVI_inventoryMaxSlot();
        let html = "";

        for (let i = 0; i < total; i++) {
            html += NVI_slotHTML(i, slots.get(i), contexte, source, { draggable: true, droppable: true });
        }

        return `<div class="nvi-grid nvi-grid--inventory" style="--nvi-columns:${NVI_CONFIG.columnsInventory};">${html}</div>`;
    }

    function NVI_gridMarchandHTML() {
        const items = Game.ui.marchandActuel?.inventaire || [];
        let html = "";
        const total = Math.max(NVI_CONFIG.merchantSlots, items.length);

        for (let i = 0; i < total; i++) {
            const item = items[i] || null;
            html += NVI_slotHTML(i, item, "marchand", "merchant", { draggable: false, droppable: false });
        }

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
            ["ATK", "attaque"],
            ["DEF", "defense"],
            ["ATK MAGIC", "attaqueMagique"],
            ["DEF MAGIC", "defenseMagique"],
            ["PV", "pvMax"],
            ["MANA", "manaMax"],
            ["STAMINA", "staminaMax"],
            ["FOR", "force"],
            ["DEX", "dexterite"],
            ["INT", "intelligence"],
            ["VIT", "vitalite"],
            ["LUCK", "chance"]
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

        if (source === "player") {
            const verrouille = NVI_estItemVerrouille(item);
            actions += `
                <button class="nvi-lock-toggle ${verrouille ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" onclick="event.stopPropagation(); NVI_toggleVerrouillage('${idObjet}')" title="${verrouille ? "L'objet garde sa case pendant le tri auto" : "L'objet peut etre deplace par le tri auto"}">
                    <span class="nvi-lock-toggle__icon">${verrouille ? "Lock" : "Libre"}</span>
                    <span class="nvi-lock-toggle__text">${verrouille ? "Bloque" : "Debloque"}</span>
                </button>

                <div class="nvi-details__actions">
                    ${objet.type === "consommable"
                        ? `<button onclick="NVI_utiliserObjetSelectionne('${idObjet}')">Utiliser</button>`
                        : objet.type === "bague"
                            ? `<button onclick="NVI_equiperObjetSelectionne('${idObjet}', 'bague1')">Bague 1</button><button onclick="NVI_equiperObjetSelectionne('${idObjet}', 'bague2')">Bague 2</button>`
                            : `<button onclick="NVI_equiperObjetSelectionne('${idObjet}')">Equiper</button>`
                    }
                    <button onclick="NVI_toggleFavori('${idObjet}')">${NVI_estFavori(idObjet) ? "Retirer favori" : "Favori"}</button>
                </div>
            `;

            if (contexte === "marchand") {
                actions += `
                    <div class="nvi-trade-box">
                        <strong>Vente</strong>
                        ${NVI_quantiteInput(quantite, "nviSellQty")}
                        <p>Gain : <strong>${prixVente} or</strong></p>
                        <button onclick="NVI_vendreSelection('${idObjet}')">Vendre</button>
                    </div>
                `;
            }

            actions += NVI_STATE.deleteConfirmId === idObjet
                ? `<div class="nvi-delete-confirm"><span>Supprimer toute la pile ?</span><button onclick="NVI_supprimerStack('${idObjet}')">Oui</button><button onclick="NVI_annulerSuppression()">Non</button></div>`
                : `<button class="nvi-danger" onclick="NVI_demanderSuppression('${idObjet}')">Supprimer</button>`;
        }

        if (source === "merchant") {
            actions += `
                <div class="nvi-trade-box">
                    <strong>Achat</strong>
                    ${NVI_quantiteInput(quantite, "nviBuyQty")}
                    <p>Cout : <strong>${prixAchat} or</strong></p>
                    <button onclick="NVI_acheterSelection('${idObjet}')">Acheter</button>
                </div>
            `;
        }

        return `
            <aside class="nvi-details">
                <div class="nvi-details__header">
                    <div class="nvi-details__icon nvi-item--${rarete}">${NVI_iconeObjet(objet)}</div>
                    <div>
                        <h3 class="${rarete}">${NVI_escape(objet.nom || idObjet)}</h3>
                        <p>${NVI_escape(objet.type || "divers")} · ${NVI_escape(objet.rarete || "commun")}${quantite > 1 ? ` · x${quantite}` : ""}</p>
                    </div>
                </div>
                <p class="nvi-details__description">${NVI_escape(objet.description || "Aucune description.")}</p>
                ${details ? `<p class="nvi-details__stats">${details}</p>` : ""}
                ${actions}
            </aside>
        `;
    }

    function NVI_toolbarHTML(contexte) {
        const filtres = Game.constants?.filtresInventaire || [
            { id: "tous", nom: "Tous" },
            { id: "favoris", nom: "Favoris" },
            { id: "arme", nom: "Armes" },
            { id: "armure", nom: "Armures" },
            { id: "accessoire", nom: "Accessoires" },
            { id: "consommable", nom: "Consommables" },
            { id: "materiau", nom: "Materiaux" },
            { id: "quete", nom: "Quetes" },
            { id: "divers", nom: "Divers" }
        ];

        const tris = Game.constants?.trisInventaire || [
            { id: "nom", nom: "Nom" },
            { id: "type", nom: "Type" },
            { id: "rarete", nom: "Rarete" },
            { id: "niveau", nom: "Niveau requis" },
            { id: "prix", nom: "Prix" }
        ];

        return `
            <div class="nvi-toolbar">
                <div class="nvi-toolbar__top">
                    <div>
                        <h2>${contexte === "marchand" ? "Marchand" : "Inventaire"}</h2>
                        ${contexte === "marchand" && Game.ui.marchandActuel
                            ? `<p>${NVI_escape(Game.ui.marchandActuel.nom || "Marchand")}</p>`
                            : `<p>Grille d'inventaire avec cases deplacables.</p>`
                        }
                    </div>
                    <button onclick="NVI_triAutomatiqueInventaire()">Tri auto</button>
                    <button onclick="ouvrirExploration()">Retour</button>
                </div>

                <div class="nvi-toolbar__search-row">
                    <input id="nviSearch" type="text" placeholder="Rechercher..." value="${NVI_escape(Game.ui.rechercheInventaire || "")}" oninput="NVI_changerRecherche(this.value)">
                    <select onchange="NVI_changerTri(this.value)">
                        ${tris.map(tri => `<option value="${tri.id}" ${Game.ui.triInventaire === tri.id ? "selected" : ""}>${tri.nom}</option>`).join("")}
                    </select>
                    <button onclick="NVI_inverserOrdreTri()">${Game.ui.ordreTriInventaire === "asc" ? "ASC" : "DESC"}</button>
                </div>

                <div class="nvi-filters">
                    ${filtres.map(filtre => `<button class="nvi-filter" data-etat="${NVI_etatFiltre(filtre.id)}" onclick="NVI_changerFiltre('${filtre.id}')">${NVI_escape(filtre.nom)}</button>`).join("")}
                </div>
            </div>
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

    function NVI_vueInventaireHTML() {
        return `
            <section class="nvi-window">
                ${NVI_toolbarHTML("inventaire")}
                <div class="nvi-layout nvi-layout--inventory">
                    <div class="nvi-panel">
                        <div class="nvi-panel__title"><strong>Sac</strong><span>${(Game.data.personnage.inventaire || []).length} pile(s)</span></div>
                        ${NVI_gridInventaireHTML("inventaire", "player")}
                    </div>
                    ${NVI_detailsPanelHTML("inventaire")}
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
            NVI_redessinerVueActive();
            return;
        }

        if (idFiltre === "favoris") {
            Game.ui.etatFiltresInventaire.favoris = !Game.ui.etatFiltresInventaire.favoris;
            if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
            NVI_redessinerVueActive();
            return;
        }

        const actuel = Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
        Game.ui.etatFiltresInventaire.types[idFiltre] = actuel === "neutre" ? "actif" : actuel === "actif" ? "exclu" : "neutre";
        if (typeof synchroniserFiltreInventaireLegacy === "function") synchroniserFiltreInventaireLegacy();
        NVI_redessinerVueActive();
    }

    function NVI_toggleVerrouillage(idObjet) {
        const item = (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);
        if (!item) return;
        const prochainEtat = !NVI_estItemVerrouille(item);
        NVI_definirVerrouillageItem(item, prochainEtat);
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
        if (typeof retirerObjetInventaire === "function") retirerObjetInventaire(idObjet, quantite);
        else Game.data.personnage.inventaire = Game.data.personnage.inventaire.filter(entree => entree.id !== idObjet);
        Game.data.personnage.favoris = (Game.data.personnage.favoris || []).filter(id => id !== idObjet);
        NVI_supprimerSlotPersiste(idObjet);
        NVI_supprimerVerrouPersiste(idObjet);
        NVI_journal(`${NVI_objetNom(idObjet)} x${quantite} supprime de l'inventaire.`);
        NVI_STATE.selection = null;
        NVI_STATE.deleteConfirmId = null;
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid delete");
        NVI_redessinerVueActive();
    }

    function NVI_doubleClickItem(contexte, source, idObjet) {
        const objet = NVI_objet(idObjet);
        if (!objet) return;
        if (source === "merchant" || (contexte === "marchand" && source === "player") || objet.type === "bague") {
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
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", JSON.stringify(NVI_STATE.drag));
    }

    function NVI_dragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    }

    function NVI_majSlotDOMClasses(slotElement) {
        if (!slotElement) return;
        const item = slotElement.querySelector(".nvi-item");
        slotElement.classList.toggle("nvi-slot--occupied", Boolean(item));
        slotElement.classList.toggle("nvi-slot--locked", Boolean(item?.classList.contains("nvi-item--locked")));
    }

    function NVI_deplacerDOMSansRedraw(sourceSlot, targetSlot) {
        const conteneur = document.getElementById("vuePrincipale");
        if (!conteneur) return false;
        const sourceSlotElement = conteneur.querySelector(`.nvi-grid--inventory .nvi-slot[data-slot="${sourceSlot}"]`);
        const targetSlotElement = conteneur.querySelector(`.nvi-grid--inventory .nvi-slot[data-slot="${targetSlot}"]`);
        if (!sourceSlotElement || !targetSlotElement) return false;
        const sourceItemElement = sourceSlotElement.querySelector(".nvi-item");
        const targetItemElement = targetSlotElement.querySelector(".nvi-item");
        if (!sourceItemElement) return false;

        if (targetItemElement) {
            const placeholder = document.createComment("nvi-swap-placeholder");
            sourceSlotElement.appendChild(placeholder);
            targetSlotElement.appendChild(sourceItemElement);
            sourceSlotElement.appendChild(targetItemElement);
            placeholder.remove();
        } else {
            targetSlotElement.appendChild(sourceItemElement);
        }

        NVI_majSlotDOMClasses(sourceSlotElement);
        NVI_majSlotDOMClasses(targetSlotElement);
        return true;
    }

    function NVI_dropOnSlot(event, targetSlot) {
        event.preventDefault();
        let drag = NVI_STATE.drag;
        try {
            const data = event.dataTransfer.getData("text/plain");
            if (data) drag = JSON.parse(data);
        } catch (erreur) {
            // fallback state
        }

        if (!drag || drag.idObjet == null) return;
        const sourceSlot = Number(drag.slot);
        const target = Number(targetSlot);
        if (!Number.isInteger(sourceSlot) || !Number.isInteger(target)) return;
        if (sourceSlot === target) {
            NVI_STATE.drag = null;
            return;
        }

        const inventaire = Game.data.personnage.inventaire || [];
        const sourceItem = inventaire.find(item => item.id === drag.idObjet && Number(item.slot) === sourceSlot) || inventaire.find(item => item.id === drag.idObjet);
        if (!sourceItem) return;

        if (NVI_estItemVerrouille(sourceItem)) {
            NVI_journal("Cet objet est verrouille. Deverrouille-le pour le deplacer.");
            return;
        }

        const cibleItem = inventaire.find(item => Number(item.slot) === target);
        if (cibleItem && !NVI_itemVisible(cibleItem)) {
            NVI_journal("Impossible de deposer sur une case masquee par les filtres.");
            return;
        }
        if (cibleItem && NVI_estItemVerrouille(cibleItem)) {
            NVI_journal("Cette case est verrouillee par un autre objet.");
            return;
        }

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

        window.actualiserMarchand = function () {
            if (typeof verifierProgressionQuetes === "function") verifierProgressionQuetes();
            if (Game.ui.marchandActuel) NVI_ouvrirMarchand(Game.ui.marchandActuel.id);
        };

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
            const inventaireAvant = Game.data.personnage.inventaire || [];
            const slotsAvant = new Map(inventaireAvant.map(item => [item.id, item.slot]));
            const result = original(idObjet, quantite);
            const inventaireApres = Game.data.personnage.inventaire || [];
            const occupied = new Set(inventaireApres.map(item => Number(item.slot)).filter(slot => Number.isInteger(slot) && slot >= 0));

            inventaireApres.forEach(item => {
                if (item.id !== idObjet) return;
                if (item.slot !== undefined && item.slot !== null && Number.isInteger(Number(item.slot)) && Number(item.slot) >= 0) {
                    item.slot = Number(item.slot);
                    return;
                }
                const slot = NVI_freeSlot(occupied, Math.max(NVI_CONFIG.inventorySlots, inventaireApres.length + 12));
                NVI_ecrireSlotPersiste(item, slot);
                occupied.add(slot);
            });

            inventaireApres.forEach(item => {
                if (item.id === idObjet) return;
                if (slotsAvant.has(item.id)) item.slot = slotsAvant.get(item.id);
            });

            if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory grid add stable slot");
            return result;
        };

        window.ajouterObjetInventaire.__NVI_0999_PATCH = true;
    }

    function NVI_injecterStyle() {
        if (document.getElementById("nviGridInventoryStyle")) return;
        const style = document.createElement("style");
        style.id = "nviGridInventoryStyle";
        style.textContent = `
            .nvi-window { display: flex; flex-direction: column; gap: 12px; }
            .nvi-toolbar { padding: 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; background: radial-gradient(circle at top right, rgba(245,211,122,0.055), transparent 42%), rgba(0,0,0,0.18); }
            .nvi-toolbar__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
            .nvi-toolbar__top h2 { margin: 0 0 4px; }
            .nvi-toolbar__top p { margin: 0; color: var(--text-muted, #c7bdad); font-size: 0.86rem; }
            .nvi-toolbar__search-row { display: grid; grid-template-columns: minmax(180px, 1fr) minmax(130px, 180px) auto; gap: 8px; margin-bottom: 10px; }
            .nvi-toolbar__search-row input, .nvi-toolbar__search-row select { width: 100%; min-height: 34px; box-sizing: border-box; border-radius: 999px; border: 1px solid rgba(255,255,255,0.10); background: rgba(0,0,0,0.24); color: var(--text, #f1eadf); padding: 7px 10px; outline: none; }
            .nvi-filters { display: flex; flex-wrap: wrap; gap: 6px; }
            .nvi-filter { padding: 6px 9px; border-radius: 999px; font-size: 0.78rem; }
            .nvi-filter[data-etat="actif"] { border-color: rgba(80,220,130,0.38); color: #9dffb8; box-shadow: 0 0 10px rgba(80,220,130,0.10); }
            .nvi-filter[data-etat="exclu"] { border-color: rgba(255,100,100,0.34); color: #ffb4b4; opacity: 0.72; }
            .nvi-layout { display: grid; gap: 12px; align-items: start; }
            .nvi-layout--inventory { grid-template-columns: minmax(0, 1fr) minmax(280px, 340px); }
            .nvi-layout--merchant { grid-template-columns: minmax(300px, 0.9fr) minmax(300px, 0.9fr) minmax(280px, 340px); }
            .nvi-panel, .nvi-details { border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; background: rgba(0,0,0,0.16); padding: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.16); }
            .nvi-panel__title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; color: var(--text-muted, #c7bdad); }
            .nvi-grid { display: grid; grid-template-columns: repeat(var(--nvi-columns), minmax(34px, 1fr)); gap: 5px; }
            .nvi-slot { position: relative; aspect-ratio: 1 / 1; min-height: 38px; border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; background: rgba(0,0,0,0.24); overflow: hidden; }
            .nvi-slot--locked { border-color: rgba(245,211,122,0.36); }
            .nvi-slot--filtered { opacity: 0.38; }
            .nvi-item { position: relative; width: 100%; height: 100%; padding: 0; border: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.20)); color: var(--text, #f1eadf); cursor: pointer; overflow: hidden; }
            .nvi-item--selected { outline: 2px solid var(--gold, #f5d37a); outline-offset: -2px; }
            .nvi-item--locked { filter: saturate(0.85); }
            .nvi-item__icon img { width: 80%; height: 80%; object-fit: contain; display: block; }
            .nvi-item__text-icon { display: inline-flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em; color: var(--gold, #f5d37a); }
            .nvi-item__favorite, .nvi-item__lock, .nvi-item__qty { position: absolute; z-index: 2; padding: 1px 4px; border-radius: 999px; background: rgba(0,0,0,0.72); color: var(--gold, #f5d37a); font-size: 0.58rem; line-height: 1.2; }
            .nvi-item__favorite { left: 2px; top: 2px; }
            .nvi-item__lock { right: 2px; top: 2px; }
            .nvi-item__qty { right: 2px; bottom: 2px; color: #fff; }
            .nvi-details { position: sticky; top: 10px; }
            .nvi-details__empty { min-height: 140px; display: flex; flex-direction: column; justify-content: center; gap: 6px; color: var(--text-muted, #c7bdad); }
            .nvi-details__header { display: flex; gap: 12px; align-items: center; margin-bottom: 10px; }
            .nvi-details__icon { width: 54px; height: 54px; border: 1px solid rgba(255,255,255,0.10); border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.22); }
            .nvi-details__icon img { width: 84%; height: 84%; object-fit: contain; }
            .nvi-details__description { color: var(--text-muted, #c7bdad); line-height: 1.45; }
            .nvi-details__stats { color: var(--gold, #f5d37a); font-weight: bold; }
            .nvi-details__actions, .nvi-trade-box, .nvi-delete-confirm { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
            .nvi-trade-box { padding: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(0,0,0,0.16); }
            .nvi-quantity { display: flex; gap: 5px; align-items: center; }
            .nvi-quantity input { width: 68px; text-align: center; }
            .nvi-danger { border-color: rgba(255, 100, 100, 0.35) !important; color: #ffb4b4 !important; }
            .nvi-lock-toggle { display: flex; gap: 6px; align-items: center; margin-top: 8px; }
            @media (max-width: 900px) { .nvi-layout, .nvi-layout--inventory, .nvi-layout--merchant { grid-template-columns: 1fr; } .nvi-details { position: static; } .nvi-grid { grid-template-columns: repeat(6, minmax(34px, 1fr)); } .nvi-toolbar__search-row { grid-template-columns: 1fr; } }
        `;
        document.head.appendChild(style);
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
