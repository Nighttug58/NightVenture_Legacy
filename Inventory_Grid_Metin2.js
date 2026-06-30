(function () {
    "use strict";

    const NV_INVENTORY_GRID_VERSION =
        "v0.9.9.8-persistent-lock-map";

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
        if (typeof echapperHTML === "function") {
            return echapperHTML(value);
        }

        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function NVI_journal(message) {
        if (typeof ajouterJournal === "function") {
            ajouterJournal(message);
        }
    }

    function NVI_objet(idObjet) {
        if (typeof trouverObjet === "function") {
            return trouverObjet(idObjet);
        }

        return Game.cache?.objetsParId?.[idObjet] || null;
    }

    function NVI_objetNom(idObjet) {
        return NVI_objet(idObjet)?.nom || idObjet;
    }

    function NVI_rarete(objet) {
        if (typeof classeRarete === "function") {
            return classeRarete(objet);
        }

        return objet?.rarete || "commun";
    }

    function NVI_typeFiltre(objet) {
        if (typeof obtenirTypeFiltreObjet === "function") {
            return obtenirTypeFiltreObjet(objet);
        }

        return objet?.type || "divers";
    }

    function NVI_estFavori(idObjet) {
        if (typeof estFavori === "function") {
            return estFavori(idObjet);
        }

        return (Game.data.personnage.favoris || []).includes(idObjet);
    }

    function NVI_passeRecherche(objet) {
        if (typeof objetPasseRecherche === "function") {
            return objetPasseRecherche(objet);
        }

        const recherche =
            String(Game.ui.rechercheInventaire || "").toLowerCase();

        if (!recherche) return true;

        return `${objet?.nom || ""} ${objet?.description || ""} ${objet?.type || ""} ${objet?.rarete || ""}`
            .toLowerCase()
            .includes(recherche);
    }

    function NVI_passeFiltre(objet) {
        if (typeof objetPasseFiltre === "function") {
            return objetPasseFiltre(objet);
        }

        return true;
    }

    function NVI_itemVisible(item) {
        const objet =
            NVI_objet(item.id);

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

    function NVI_assurerCarteSlots() {
        const personnage =
            Game.data.personnage;

        personnage.inventaireSlots ??= {};

        if (
            !personnage.inventaireSlots ||
            typeof personnage.inventaireSlots !== "object" ||
            Array.isArray(personnage.inventaireSlots)
        ) {
            personnage.inventaireSlots =
                {};
        }

        return personnage.inventaireSlots;
    }

    function NVI_cleItemInventaire(item) {
        /*
            Pour l'instant l'inventaire stacke les objets par id.
            La clé id est donc stable.
            Plus tard, si on ajoute des instances uniques, on pourra passer
            sur uid sans changer le reste du module.
        */
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function NVI_assurerCarteVerrous() {
        const personnage =
            Game.data.personnage;

        personnage.inventaireVerrous ??= {};

        if (
            !personnage.inventaireVerrous ||
            typeof personnage.inventaireVerrous !== "object" ||
            Array.isArray(personnage.inventaireVerrous)
        ) {
            personnage.inventaireVerrous =
                {};
        }

        return personnage.inventaireVerrous;
    }

    function NVI_lireVerrouPersiste(item) {
        const carte =
            NVI_assurerCarteVerrous();

        const cle =
            NVI_cleItemInventaire(item);

        if (!cle) return false;

        if (Object.prototype.hasOwnProperty.call(carte, cle)) {
            return Boolean(carte[cle]);
        }

        /*
            Migration douce depuis les anciennes versions :
            si l'objet avait déjà un champ verrouille/locked/bloque,
            on le recopie dans la nouvelle carte persistante.
        */
        const ancienEtat =
            Boolean(item?.verrouille || item?.locked || item?.bloque);

        carte[cle] =
            ancienEtat;

        return ancienEtat;
    }

    function NVI_ecrireVerrouPersiste(item, actif) {
        const carte =
            NVI_assurerCarteVerrous();

        const cle =
            NVI_cleItemInventaire(item);

        if (!cle) return;

        const valeur =
            Boolean(actif);

        carte[cle] =
            valeur;

        /*
            On conserve aussi item.verrouille comme miroir lisible,
            mais la source de vérité devient personnage.inventaireVerrous.
        */
        item.verrouille =
            valeur;

        delete item.locked;
        delete item.bloque;
    }

    function NVI_supprimerVerrouPersiste(itemOuId) {
        const carte =
            NVI_assurerCarteVerrous();

        const cle =
            typeof itemOuId === "string"
                ? itemOuId
                : NVI_cleItemInventaire(itemOuId);

        if (!cle) return;

        delete carte[cle];
    }

    function NVI_synchroniserVerrousInventaire() {
        const inventaire =
            Game.data.personnage.inventaire ?? [];

        const clesValides =
            new Set();

        inventaire.forEach(item => {
            const cle =
                NVI_cleItemInventaire(item);

            if (!cle) return;

            clesValides.add(cle);

            const verrou =
                NVI_lireVerrouPersiste(item);

            item.verrouille =
                verrou;

            delete item.locked;
            delete item.bloque;
        });

        const carte =
            NVI_assurerCarteVerrous();

        Object.keys(carte).forEach(cle => {
            if (!clesValides.has(cle)) {
                delete carte[cle];
            }
        });
    }

    function NVI_lireSlotPersiste(item) {
        const carte =
            NVI_assurerCarteSlots();

        const cle =
            NVI_cleItemInventaire(item);

        if (!cle) return null;

        const slot =
            Number(carte[cle]);

        return Number.isInteger(slot) && slot >= 0
            ? slot
            : null;
    }

    function NVI_ecrireSlotPersiste(item, slot) {
        const carte =
            NVI_assurerCarteSlots();

        const cle =
            NVI_cleItemInventaire(item);

        if (!cle) return;

        const slotCorrige =
            Number(slot);

        if (!Number.isInteger(slotCorrige) || slotCorrige < 0) return;

        item.slot =
            slotCorrige;

        carte[cle] =
            slotCorrige;
    }

    function NVI_supprimerSlotPersiste(itemOuId) {
        const carte =
            NVI_assurerCarteSlots();

        const cle =
            typeof itemOuId === "string"
                ? itemOuId
                : NVI_cleItemInventaire(itemOuId);

        if (!cle) return;

        delete carte[cle];
    }

    function NVI_synchroniserSlotsDepuisCarte() {
        NVI_synchroniserVerrousInventaire();

        const inventaire =
            Game.data.personnage.inventaire ?? [];

        const occupied =
            new Set();

        inventaire.forEach(item => {
            const slotPersiste =
                NVI_lireSlotPersiste(item);

            const slotItem =
                Number(item.slot);

            const slot =
                slotPersiste !== null
                    ? slotPersiste
                    : Number.isInteger(slotItem) && slotItem >= 0
                        ? slotItem
                        : null;

            if (
                slot !== null &&
                !occupied.has(slot)
            ) {
                item.slot =
                    slot;

                NVI_ecrireSlotPersiste(item, slot);

                occupied.add(slot);
                return;
            }

            item.slot =
                null;
        });

        inventaire.forEach(item => {
            if (item.slot !== null && item.slot !== undefined) return;

            const slot =
                NVI_freeSlot(
                    occupied,
                    Math.max(NVI_CONFIG.inventorySlots, inventaire.length + 12)
                );

            NVI_ecrireSlotPersiste(item, slot);
            occupied.add(slot);
        });

        /*
            Nettoyage des anciennes clés qui ne correspondent plus à aucun item.
        */
        const clesValides =
            new Set(inventaire.map(NVI_cleItemInventaire));

        const carte =
            NVI_assurerCarteSlots();

        Object.keys(carte).forEach(cle => {
            if (!clesValides.has(cle)) {
                delete carte[cle];
            }
        });
    }

    function NVI_normaliserSlotsInventaire(options = {}) {
        /*
            Version persistante :
            la source de vérité des positions est personnage.inventaireSlots.
            Cela évite qu'un tri de tableau ou une réouverture de page
            remette les items dans l'ordre initial.
        */

        const inventaire =
            Game.data.personnage.inventaire ??= [];

        const compact =
            options.compact === true;

        if (!compact) {
            NVI_synchroniserSlotsDepuisCarte();
            return;
        }

        /*
            Mode compact volontaire :
            utilisé seulement par le bouton Tri auto.
        */
        inventaire.forEach(item => {
            const slot =
                Number(item.slot);

            if (!Number.isInteger(slot) || slot < 0) {
                item.slot =
                    null;
            }
        });
    }

    function NVI_inventoryMaxSlot() {
        const inventaire =
            Game.data.personnage.inventaire ?? [];

        const maxUsed =
            inventaire.reduce(
                (max, item) => Math.max(max, Number(item.slot || 0)),
                0
            );

        return Math.max(NVI_CONFIG.inventorySlots, maxUsed + 9);
    }

    function NVI_estItemVerrouille(item) {
        if (!item) return false;

        return NVI_lireVerrouPersiste(item);
    }

    function NVI_definirVerrouillageItem(item, actif) {
        if (!item) return;

        NVI_ecrireVerrouPersiste(item, actif);
    }

    function NVI_slotsOccupesMap() {
        NVI_synchroniserSlotsDepuisCarte();

        const map =
            new Map();

        (Game.data.personnage.inventaire || []).forEach(item => {
            const slot =
                Number(item.slot);

            if (!Number.isInteger(slot) || slot < 0) return;

            map.set(slot, item);
        });

        return map;
    }

    function NVI_itemsInventaireParSlot() {
        return NVI_slotsOccupesMap();
    }

    function NVI_trierListeCompacte(items) {
        const liste =
            [...items];

        liste.sort((a, b) => {
            const objetA =
                NVI_objet(a.id);

            const objetB =
                NVI_objet(b.id);

            if (!objetA || !objetB) return 0;

            switch (Game.ui.triInventaire) {
                case "nom":
                    return String(objetA.nom || "").localeCompare(String(objetB.nom || ""));

                case "type":
                    return String(objetA.type || "").localeCompare(String(objetB.type || ""));

                case "rarete": {
                    const ordreRarete = {
                        commun: 1,
                        "peu-commun": 2,
                        rare: 3,
                        epique: 4,
                        épique: 4,
                        legendaire: 5,
                        légendaire: 5,
                        mythique: 6
                    };

                    return (ordreRarete[objetB.rarete] || 0) - (ordreRarete[objetA.rarete] || 0);
                }

                case "niveau":
                    return (objetB.niveauRequis || 1) - (objetA.niveauRequis || 1);

                case "prix":
                    return (objetB.prix || 0) - (objetA.prix || 0);

                case "atk":
                    return (objetB.attaque || 0) - (objetA.attaque || 0);

                case "atkMagique":
                    return (objetB.attaqueMagique || 0) - (objetA.attaqueMagique || 0);

                case "def":
                    return (objetB.defense || 0) - (objetA.defense || 0);

                case "defMagique":
                    return (objetB.defenseMagique || 0) - (objetA.defenseMagique || 0);

                default:
                    return 0;
            }
        });

        if (Game.ui.ordreTriInventaire === "desc") {
            liste.reverse();
        }

        return liste;
    }

    function NVI_iconeObjet(objet) {
        if (objet?.image) {
            return `<img src="${objet.image}" alt="${NVI_escape(objet.nom || "Objet")}">`;
        }

        const type =
            String(objet?.type || "").toLowerCase();

        if (type.includes("arme")) return "⚔️";
        if (type.includes("casque")) return "🪖";
        if (type.includes("armure")) return "🛡️";
        if (type.includes("gant")) return "🧤";
        if (type.includes("chaussure") || type.includes("botte")) return "👢";
        if (type.includes("collier")) return "📿";
        if (type.includes("bague")) return "💍";
        if (type.includes("artefact")) return "🔮";
        if (type.includes("consommable") || type.includes("potion")) return "🧪";
        if (type.includes("materiau") || type.includes("matériau") || type.includes("ressource")) return "🌿";
        if (type.includes("quete") || type.includes("quête")) return "📜";

        return "🎁";
    }

    function NVI_selectionKey(contexte, source, idObjet) {
        return `${contexte}:${source}:${idObjet}`;
    }

    function NVI_estSelectionne(contexte, source, idObjet) {
        return NVI_STATE.selection === NVI_selectionKey(contexte, source, idObjet);
    }

    function NVI_selectionner(contexte, source, idObjet) {
        const cle =
            NVI_selectionKey(contexte, source, idObjet);

        NVI_STATE.selection =
            NVI_STATE.selection === cle
                ? null
                : cle;

        NVI_STATE.deleteConfirmId =
            null;

        NVI_redessinerVueActive();
    }

    function NVI_itemElementHTML(item, contexte, source, options = {}) {
        const objet =
            NVI_objet(item.id);

        if (!objet) return "";

        const rarete =
            NVI_rarete(objet);

        const selectionne =
            NVI_estSelectionne(contexte, source, item.id);

        const verrouille =
            source === "player" && NVI_estItemVerrouille(item);

        const peutDrag =
            Boolean(options.draggable) && !verrouille;

        const draggable =
            peutDrag
                ? "true"
                : "false";

        const dragAttr =
            peutDrag
                ? `ondragstart="NVI_dragStart(event, '${item.id}', ${Number(item.slot || 0)})"`
                : "";

        return `
            <button
                type="button"
                class="nvi-item nvi-item--${rarete} ${selectionne ? "nvi-item--selected" : ""} ${verrouille ? "nvi-item--locked" : ""}"
                draggable="${draggable}"
                ${dragAttr}
                onclick="NVI_selectionner('${contexte}', '${source}', '${item.id}')"
                ondblclick="NVI_doubleClickItem('${contexte}', '${source}', '${item.id}')"
                title="${NVI_escape(objet.nom || item.id)}${verrouille ? " — emplacement verrouillé" : ""}"
                data-nvi-item-id="${item.id}"
            >
                <span class="nvi-item__favorite">
                    ${NVI_estFavori(item.id) ? "⭐" : ""}
                </span>

                ${
                    verrouille
                        ? `<span class="nvi-item__lock">🔒</span>`
                        : ""
                }

                <span class="nvi-item__icon">
                    ${NVI_iconeObjet(objet)}
                </span>

                ${
                    Number(item.quantite || 1) > 1
                        ? `<span class="nvi-item__qty">${item.quantite}</span>`
                        : ""
                }
            </button>
        `;
    }

    function NVI_slotHTML(index, item, contexte, source, options = {}) {
        const visible =
            item ? NVI_itemVisible(item) : false;

        const hiddenOccupied =
            item && !visible;

        const verrouille =
            source === "player" && item && NVI_estItemVerrouille(item);

        return `
            <div
                class="nvi-slot ${item ? "nvi-slot--occupied" : ""} ${hiddenOccupied ? "nvi-slot--filtered" : ""} ${verrouille ? "nvi-slot--locked" : ""}"
                data-slot="${index}"
                ${options.droppable ? `ondragover="NVI_dragOver(event)" ondrop="NVI_dropOnSlot(event, ${index})"` : ""}
            >
                ${
                    item && visible
                        ? NVI_itemElementHTML(item, contexte, source, options)
                        : hiddenOccupied
                            ? `<span class="nvi-slot__filtered-dot" title="Objet masqué par les filtres"></span>`
                            : ""
                }
            </div>
        `;
    }

    function NVI_gridInventaireHTML(contexte = "inventaire", source = "player") {
        const slots =
            NVI_itemsInventaireParSlot();

        const total =
            NVI_inventoryMaxSlot();

        let html =
            "";

        for (let i = 0; i < total; i++) {
            html +=
                NVI_slotHTML(
                    i,
                    slots.get(i),
                    contexte,
                    source,
                    {
                        draggable: true,
                        droppable: true
                    }
                );
        }

        return `
            <div
                class="nvi-grid nvi-grid--inventory"
                style="--nvi-columns:${NVI_CONFIG.columnsInventory};"
            >
                ${html}
            </div>
        `;
    }

    function NVI_gridListeHTML(items, contexte, source, totalSlots = NVI_CONFIG.merchantSlots) {
        const visibles =
            NVI_trierListeCompacte(
                (items || []).filter(item => {
                    const objet =
                        NVI_objet(item.id);

                    if (!objet) return false;

                    return NVI_passeFiltre(objet) && NVI_passeRecherche(objet);
                })
            );

        let html =
            "";

        for (let i = 0; i < totalSlots; i++) {
            html +=
                NVI_slotHTML(
                    i,
                    visibles[i] || null,
                    contexte,
                    source,
                    {
                        draggable: false,
                        droppable: false
                    }
                );
        }

        return `
            <div
                class="nvi-grid nvi-grid--merchant"
                style="--nvi-columns:${NVI_CONFIG.columnsMerchant};"
            >
                ${html}
            </div>
        `;
    }

    function NVI_obtenirItemSelectionne() {
        if (!NVI_STATE.selection) return null;

        const [contexte, source, idObjet] =
            NVI_STATE.selection.split(":");

        if (!idObjet) return null;

        if (source === "player") {
            const item =
                (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);

            if (!item) return null;

            return {
                contexte,
                source,
                idObjet,
                item,
                objet: NVI_objet(idObjet)
            };
        }

        if (source === "merchant") {
            const item =
                (Game.ui.marchandActuel?.inventaire || []).find(entree => entree.id === idObjet);

            if (!item) return null;

            return {
                contexte,
                source,
                idObjet,
                item,
                objet: NVI_objet(idObjet)
            };
        }

        return null;
    }

    function NVI_detailsObjet(objet) {
        if (!objet) return "";

        if (typeof creerDetailsObjetInventaire === "function") {
            return creerDetailsObjetInventaire(objet);
        }

        if (typeof creerDetailsObjet === "function") {
            return creerDetailsObjet(objet);
        }

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

        return stats
            .filter(([, key]) => objet[key])
            .map(([label, key]) => `${label} +${objet[key]}`)
            .join(" ");
    }

    function NVI_quantiteInput(max, prefix = "nviActionQty") {
        const value =
            Math.min(
                Math.max(1, Number(NVI_STATE.quantity || 1)),
                Math.max(1, Number(max || 1))
            );

        NVI_STATE.quantity =
            value;

        return `
            <div class="nvi-quantity">
                <button onclick="NVI_modifierQuantite(-1, ${max})">−</button>

                <input
                    id="${prefix}"
                    type="number"
                    min="1"
                    max="${max}"
                    value="${value}"
                    oninput="NVI_setQuantite(this.value, ${max})"
                >

                <button onclick="NVI_modifierQuantite(1, ${max})">+</button>
                <button onclick="NVI_setQuantite(${max}, ${max})">MAX</button>
            </div>
        `;
    }

    function NVI_actionPrix(type, objet, quantite) {
        const prix =
            type === "achat"
                ? Number(objet?.prix || 0)
                : Math.floor(Number(objet?.prix || 0) / 2);

        return prix * Math.max(1, Number(quantite || 1));
    }

    function NVI_detailsPanelHTML(contexte) {
        const selection =
            NVI_obtenirItemSelectionne();

        if (!selection || !selection.objet) {
            return `
                <aside class="nvi-details">
                    <div class="nvi-details__empty">
                        <strong>Aucun objet sélectionné</strong>
                        <span>Clique sur une case pour inspecter un objet.</span>
                    </div>
                </aside>
            `;
        }

        const { source, idObjet, item, objet } =
            selection;

        const rarete =
            NVI_rarete(objet);

        const quantite =
            Number(item.quantite || 1);

        const details =
            NVI_detailsObjet(objet);

        const prixAchat =
            NVI_actionPrix("achat", objet, NVI_STATE.quantity);

        const prixVente =
            NVI_actionPrix("vente", objet, NVI_STATE.quantity);

        let actions =
            "";

        if (source === "player") {
            const verrouille =
                NVI_estItemVerrouille(item);

            actions += `
                <button
                    class="nvi-lock-toggle ${verrouille ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}"
                    onclick="event.stopPropagation(); NVI_toggleVerrouillage('${idObjet}')"
                    title="${verrouille ? "L'objet garde sa case pendant le tri auto" : "L'objet peut être déplacé par le tri auto"}"
                >
                    <span class="nvi-lock-toggle__icon">
                        ${verrouille ? "🔒" : "🔓"}
                    </span>

                    <span class="nvi-lock-toggle__text">
                        ${verrouille ? "Bloqué" : "Débloqué"}
                    </span>
                </button>

                <div class="nvi-details__actions">
                    ${
                        objet.type === "consommable"
                            ? `<button onclick="NVI_utiliserObjetSelectionne('${idObjet}')">Utiliser</button>`
                            : objet.type === "bague"
                                ? `
                                    <button onclick="NVI_equiperObjetSelectionne('${idObjet}', 'bague1')">Bague 1</button>
                                    <button onclick="NVI_equiperObjetSelectionne('${idObjet}', 'bague2')">Bague 2</button>
                                `
                                : `<button onclick="NVI_equiperObjetSelectionne('${idObjet}')">Équiper</button>`
                    }

                    <button onclick="NVI_toggleFavori('${idObjet}')">
                        ${NVI_estFavori(idObjet) ? "Retirer favori" : "Favori"}
                    </button>
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

            actions +=
                NVI_STATE.deleteConfirmId === idObjet
                    ? `
                        <div class="nvi-delete-confirm">
                            <span>Supprimer toute la pile ?</span>
                            <button onclick="NVI_supprimerStack('${idObjet}')">Oui</button>
                            <button onclick="NVI_annulerSuppression()">Non</button>
                        </div>
                    `
                    : `
                        <button class="nvi-danger" onclick="NVI_demanderSuppression('${idObjet}')">
                            Supprimer
                        </button>
                    `;
        }

        if (source === "merchant") {
            actions += `
                <div class="nvi-trade-box">
                    <strong>Achat</strong>
                    ${NVI_quantiteInput(quantite, "nviBuyQty")}
                    <p>Coût : <strong>${prixAchat} or</strong></p>
                    <button onclick="NVI_acheterSelection('${idObjet}')">Acheter</button>
                </div>
            `;
        }

        return `
            <aside class="nvi-details">
                <div class="nvi-details__header">
                    <div class="nvi-details__icon nvi-item--${rarete}">
                        ${NVI_iconeObjet(objet)}
                    </div>

                    <div>
                        <h3 class="${rarete}">
                            ${NVI_escape(objet.nom || idObjet)}
                        </h3>

                        <p>
                            ${NVI_escape(objet.type || "divers")}
                            ·
                            ${NVI_escape(objet.rarete || "commun")}
                            ${quantite > 1 ? ` · x${quantite}` : ""}
                        </p>
                    </div>
                </div>

                <p class="nvi-details__description">
                    ${NVI_escape(objet.description || "Aucune description.")}
                </p>

                ${
                    details
                        ? `<p class="nvi-details__stats">${details}</p>`
                        : ""
                }

                ${actions}
            </aside>
        `;
    }

    function NVI_toolbarHTML(contexte) {
        const filtres =
            Game.constants?.filtresInventaire || [
                { id: "tous", nom: "Tous" },
                { id: "favoris", nom: "⭐ Favoris" },
                { id: "arme", nom: "Armes" },
                { id: "armure", nom: "Armures" },
                { id: "accessoire", nom: "Accessoires" },
                { id: "consommable", nom: "Consommables" },
                { id: "materiau", nom: "Matériaux" },
                { id: "quete", nom: "Quêtes" },
                { id: "divers", nom: "Divers" }
            ];

        const tris =
            Game.constants?.trisInventaire || [
                { id: "nom", nom: "Nom" },
                { id: "type", nom: "Type" },
                { id: "rarete", nom: "Rareté" },
                { id: "niveau", nom: "Niveau requis" },
                { id: "prix", nom: "Prix" }
            ];

        return `
            <div class="nvi-toolbar">
                <div class="nvi-toolbar__top">
                    <div>
                        <h2>${contexte === "marchand" ? "🛒 Marchand" : "🎒 Inventaire"}</h2>
                        ${
                            contexte === "marchand" && Game.ui.marchandActuel
                                ? `<p>${NVI_escape(Game.ui.marchandActuel.nom || "Marchand")}</p>`
                                : `<p>Grille d'inventaire avec cases déplacables.</p>`
                        }
                    </div>

                    <button onclick="NVI_triAutomatiqueInventaire()">🧩 Tri auto</button>
                    <button onclick="ouvrirExploration()">⬅ Retour</button>
                </div>

                <div class="nvi-toolbar__search-row">
                    <input
                        id="nviSearch"
                        type="text"
                        placeholder="🔍 Rechercher..."
                        value="${NVI_escape(Game.ui.rechercheInventaire || "")}"
                        oninput="NVI_changerRecherche(this.value)"
                    >

                    <select onchange="NVI_changerTri(this.value)">
                        ${tris.map(tri => `
                            <option value="${tri.id}" ${Game.ui.triInventaire === tri.id ? "selected" : ""}>
                                ${tri.nom}
                            </option>
                        `).join("")}
                    </select>

                    <button onclick="NVI_inverserOrdreTri()">
                        ${Game.ui.ordreTriInventaire === "asc" ? "▲" : "▼"}
                    </button>
                </div>

                <div class="nvi-filters">
                    ${filtres.map(filtre => {
                        const etat =
                            NVI_etatFiltre(filtre.id);

                        return `
                            <button
                                class="nvi-filter"
                                data-etat="${etat}"
                                onclick="NVI_changerFiltre('${filtre.id}')"
                            >
                                ${filtre.nom}
                            </button>
                        `;
                    }).join("")}
                </div>
            </div>
        `;
    }

    function NVI_etatFiltre(idFiltre) {
        NVI_assurerEtatFiltres();

        if (idFiltre === "tous") {
            const types =
                Game.ui.etatFiltresInventaire.types || {};

            const actif =
                Object.values(types).some(etat => etat !== "neutre") ||
                Game.ui.etatFiltresInventaire.favoris;

            return actif ? "neutre" : "actif";
        }

        if (idFiltre === "favoris") {
            return Game.ui.etatFiltresInventaire.favoris ? "actif" : "neutre";
        }

        return Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";
    }

    function NVI_vueInventaireHTML() {
        return `
            <section class="nvi-window">
                ${NVI_toolbarHTML("inventaire")}

                <div class="nvi-layout nvi-layout--inventory">
                    <div class="nvi-panel">
                        <div class="nvi-panel__title">
                            <strong>Inventaire</strong>
                            <span>${(Game.data.personnage.inventaire || []).length} pile(s)</span>
                        </div>

                        ${NVI_gridInventaireHTML("inventaire", "player")}
                    </div>

                    ${NVI_detailsPanelHTML("inventaire")}
                </div>
            </section>
        `;
    }

    function NVI_vueMarchandHTML() {
        const marchand =
            Game.ui.marchandActuel;

        return `
            <section class="nvi-window">
                ${NVI_toolbarHTML("marchand")}

                <div class="nvi-merchant-mode">
                    <button
                        class="${Game.ui.modeMarchand === "achat" ? "active" : ""}"
                        onclick="NVI_changerModeMarchand('achat')"
                    >
                        Acheter
                    </button>

                    <button
                        class="${Game.ui.modeMarchand === "vente" ? "active" : ""}"
                        onclick="NVI_changerModeMarchand('vente')"
                    >
                        Vendre
                    </button>
                </div>

                <div class="nvi-layout nvi-layout--merchant">
                    <div class="nvi-panel">
                        <div class="nvi-panel__title">
                            <strong>Stock marchand</strong>
                            <span>${(marchand?.inventaire || []).length} pile(s)</span>
                        </div>

                        ${NVI_gridListeHTML(marchand?.inventaire || [], "marchand", "merchant", NVI_CONFIG.merchantSlots)}
                    </div>

                    <div class="nvi-panel">
                        <div class="nvi-panel__title">
                            <strong>Ton inventaire</strong>
                            <span>${Game.data.personnage.or ?? 0} or</span>
                        </div>

                        ${NVI_gridInventaireHTML("marchand", "player")}
                    </div>

                    ${NVI_detailsPanelHTML("marchand")}
                </div>
            </section>
        `;
    }

    function NVI_ouvrirInventaire() {
        NVI_assurerEtatFiltres();

        if (typeof changerVue === "function") {
            changerVue("inventaire");
        } else {
            Game.ui.vueActive = "inventaire";
        }

        NVI_STATE.selection =
            null;

        NVI_STATE.deleteConfirmId =
            null;

        NVI_STATE.quantity =
            1;

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(NVI_vueInventaireHTML());
        }
    }

    function NVI_ouvrirMarchand(idPnj = null) {
        NVI_assurerEtatFiltres();

        if (idPnj) {
            Game.ui.marchandActuel =
                Game.cache?.pnjParId?.[idPnj] || null;
        }

        if (!Game.ui.marchandActuel) {
            NVI_journal("Marchand introuvable.");
            return;
        }

        if (typeof changerVue === "function") {
            changerVue("marchand");
        } else {
            Game.ui.vueActive = "marchand";
        }

        Game.ui.modeMarchand ??= "achat";

        NVI_STATE.selection =
            null;

        NVI_STATE.deleteConfirmId =
            null;

        NVI_STATE.quantity =
            1;

        if (typeof afficherVuePrincipale === "function") {
            afficherVuePrincipale(NVI_vueMarchandHTML());
        }
    }

    function NVI_redessinerVueActive() {
        if (!NVI_hasGame()) return;

        if (Game.ui.vueActive === "marchand" && Game.ui.marchandActuel) {
            if (typeof afficherVuePrincipale === "function") {
                afficherVuePrincipale(NVI_vueMarchandHTML());
            }
            return;
        }

        if (Game.ui.vueActive === "inventaire") {
            if (typeof afficherVuePrincipale === "function") {
                afficherVuePrincipale(NVI_vueInventaireHTML());
            }
        }
    }

    function NVI_changerModeMarchand(mode) {
        Game.ui.modeMarchand =
            mode;

        NVI_STATE.selection =
            null;

        NVI_STATE.quantity =
            1;

        NVI_redessinerVueActive();
    }

    function NVI_changerRecherche(value) {
        Game.ui.rechercheInventaire =
            typeof normaliserTexte === "function"
                ? normaliserTexte(value)
                : String(value || "").toLowerCase();

        NVI_STATE.selection =
            null;

        NVI_redessinerVueActive();

        setTimeout(() => {
            const search =
                document.getElementById("nviSearch");

            if (search) {
                search.focus();
                search.setSelectionRange(search.value.length, search.value.length);
            }
        }, 0);
    }

    function NVI_changerTri(value) {
        Game.ui.triInventaire =
            value;

        Game.ui.ordreTriInventaire =
            Game.constants?.ordreTriParCritere?.[value] || Game.ui.ordreTriInventaire || "asc";

        NVI_redessinerVueActive();
    }

    function NVI_inverserOrdreTri() {
        Game.ui.ordreTriInventaire =
            Game.ui.ordreTriInventaire === "asc"
                ? "desc"
                : "asc";

        if (Game.constants?.ordreTriParCritere) {
            Game.constants.ordreTriParCritere[Game.ui.triInventaire] =
                Game.ui.ordreTriInventaire;
        }

        NVI_redessinerVueActive();
    }

    function NVI_changerFiltre(idFiltre) {
        NVI_assurerEtatFiltres();

        if (idFiltre === "tous") {
            if (typeof reinitialiserFiltresInventaire === "function") {
                reinitialiserFiltresInventaire();
            } else {
                Game.ui.etatFiltresInventaire.favoris =
                    false;

                Object.keys(Game.ui.etatFiltresInventaire.types).forEach(key => {
                    Game.ui.etatFiltresInventaire.types[key] =
                        "neutre";
                });
            }

            NVI_redessinerVueActive();
            return;
        }

        if (idFiltre === "favoris") {
            Game.ui.etatFiltresInventaire.favoris =
                !Game.ui.etatFiltresInventaire.favoris;

            if (typeof synchroniserFiltreInventaireLegacy === "function") {
                synchroniserFiltreInventaireLegacy();
            }

            NVI_redessinerVueActive();
            return;
        }

        const actuel =
            Game.ui.etatFiltresInventaire.types[idFiltre] || "neutre";

        const prochain =
            actuel === "neutre"
                ? "actif"
                : actuel === "actif"
                    ? "exclu"
                    : "neutre";

        Game.ui.etatFiltresInventaire.types[idFiltre] =
            prochain;

        if (typeof synchroniserFiltreInventaireLegacy === "function") {
            synchroniserFiltreInventaireLegacy();
        }

        NVI_redessinerVueActive();
    }

    function NVI_toggleVerrouillage(idObjet) {
        const item =
            (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);

        if (!item) return;

        const etatActuel =
            NVI_estItemVerrouille(item);

        const prochainEtat =
            !etatActuel;

        NVI_definirVerrouillageItem(
            item,
            prochainEtat
        );

        const slot =
            Number(item.slot);

        if (Number.isInteger(slot) && slot >= 0) {
            NVI_ecrireSlotPersiste(item, slot);
        }

        if (prochainEtat) {
            NVI_journal(`🔒 ${NVI_objetNom(idObjet)} est bloqué sur sa case.`);
        } else {
            NVI_journal(`🔓 ${NVI_objetNom(idObjet)} est débloqué.`);
        }

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid persistent lock toggle");
        }

        /*
            On garde la sélection sur le même item.
            Le seul endroit qui change l'état verrouillé/déverrouillé,
            c'est ce bouton.
        */
        NVI_STATE.selection =
            NVI_selectionKey(
                Game.ui.vueActive === "marchand" ? "marchand" : "inventaire",
                "player",
                idObjet
            );

        NVI_redessinerVueActive();
    }

    function NVI_comparerItemsPourTriAuto(a, b) {
        const objetA =
            NVI_objet(a.id);

        const objetB =
            NVI_objet(b.id);

        if (!objetA || !objetB) return 0;

        let resultat =
            0;

        switch (Game.ui.triInventaire) {
            case "nom":
                resultat =
                    String(objetA.nom || "").localeCompare(String(objetB.nom || ""));
                break;

            case "type":
                resultat =
                    String(objetA.type || "").localeCompare(String(objetB.type || ""));
                break;

            case "rarete": {
                const ordreRarete = {
                    commun: 1,
                    "peu-commun": 2,
                    rare: 3,
                    epique: 4,
                    épique: 4,
                    legendaire: 5,
                    légendaire: 5,
                    mythique: 6
                };

                resultat =
                    (ordreRarete[objetB.rarete] || 0) - (ordreRarete[objetA.rarete] || 0);
                break;
            }

            case "niveau":
                resultat =
                    (objetB.niveauRequis || 1) - (objetA.niveauRequis || 1);
                break;

            case "prix":
                resultat =
                    (objetB.prix || 0) - (objetA.prix || 0);
                break;

            case "atk":
                resultat =
                    (objetB.attaque || 0) - (objetA.attaque || 0);
                break;

            case "atkMagique":
                resultat =
                    (objetB.attaqueMagique || 0) - (objetA.attaqueMagique || 0);
                break;

            case "def":
                resultat =
                    (objetB.defense || 0) - (objetA.defense || 0);
                break;

            case "defMagique":
                resultat =
                    (objetB.defenseMagique || 0) - (objetA.defenseMagique || 0);
                break;

            default:
                resultat =
                    String(objetA.nom || "").localeCompare(String(objetB.nom || ""));
                break;
        }

        if (Game.ui.ordreTriInventaire === "desc") {
            resultat =
                -resultat;
        }

        return resultat;
    }

    function NVI_triAutomatiqueInventaire() {
        if (!NVI_hasGame()) return;

        /*
            Source de vérité :
            - positions : personnage.inventaireSlots
            - verrous : personnage.inventaireVerrous

            Le tri auto ne modifie JAMAIS inventaireVerrous.
        */

        NVI_synchroniserVerrousInventaire();
        NVI_synchroniserSlotsDepuisCarte();

        const inventaire =
            Game.data.personnage.inventaire || [];

        const slotsProteges =
            new Map();

        const mobiles =
            [];

        inventaire.forEach(item => {
            const verrou =
                NVI_estItemVerrouille(item);

            const slot =
                Number(item.slot);

            if (!verrou) {
                mobiles.push(item);
                return;
            }

            if (
                Number.isInteger(slot) &&
                slot >= 0 &&
                !slotsProteges.has(slot)
            ) {
                slotsProteges.set(slot, item);
                NVI_ecrireSlotPersiste(item, slot);
                NVI_ecrireVerrouPersiste(item, true);
                return;
            }

            /*
                Collision rare entre deux items bloqués :
                l'item reste bloqué, mais il reçoit une autre case libre.
                Il n'est jamais débloqué.
            */
            const occupied =
                new Set(slotsProteges.keys());

            const nouveauSlot =
                NVI_freeSlot(
                    occupied,
                    Math.max(NVI_CONFIG.inventorySlots, inventaire.length + 12)
                );

            slotsProteges.set(nouveauSlot, item);
            NVI_ecrireSlotPersiste(item, nouveauSlot);
            NVI_ecrireVerrouPersiste(item, true);
        });

        const totalSlots =
            Math.max(
                NVI_CONFIG.inventorySlots,
                inventaire.length + slotsProteges.size + 12
            );

        const freeSlots =
            [];

        for (let slot = 0; slot < totalSlots; slot++) {
            if (!slotsProteges.has(slot)) {
                freeSlots.push(slot);
            }
        }

        mobiles
            .sort(NVI_comparerItemsPourTriAuto)
            .forEach((item, index) => {
                /*
                    On déplace uniquement les items mobiles.
                    On force leur état à false dans la carte persistante
                    pour éviter les vieux miroirs contradictoires.
                */
                NVI_ecrireVerrouPersiste(item, false);

                NVI_ecrireSlotPersiste(
                    item,
                    freeSlots[index] ?? index
                );
            });

        NVI_synchroniserVerrousInventaire();
        NVI_synchroniserSlotsDepuisCarte();

        const nbVerrouilles =
            inventaire.filter(item => NVI_estItemVerrouille(item)).length;

        NVI_journal(
            nbVerrouilles > 0
                ? `🧩 Inventaire trié. ${nbVerrouilles} item(s) bloqué(s) conservé(s).`
                : "🧩 Inventaire trié automatiquement."
        );

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid auto sort persistent locks");
        }

        NVI_redessinerVueActive();
    }

    function NVI_modifierQuantite(delta, max) {
        NVI_setQuantite(
            Number(NVI_STATE.quantity || 1) + Number(delta || 0),
            max
        );
    }

    function NVI_setQuantite(value, max) {
        const quantite =
            Math.max(
                1,
                Math.min(
                    Number(max || 1),
                    Number(value || 1)
                )
            );

        NVI_STATE.quantity =
            quantite;

        NVI_redessinerVueActive();
    }

    function NVI_toggleFavori(idObjet) {
        Game.data.personnage.favoris ??= [];

        if (NVI_estFavori(idObjet)) {
            Game.data.personnage.favoris =
                Game.data.personnage.favoris.filter(id => id !== idObjet);
        } else {
            Game.data.personnage.favoris.push(idObjet);
        }

        NVI_redessinerVueActive();
    }

    function NVI_equiperObjetSelectionne(idObjet, emplacement = null) {
        if (typeof equiperObjetInterface === "function") {
            equiperObjetInterface(idObjet, emplacement);
        } else if (typeof equiperObjet === "function") {
            equiperObjet(idObjet, emplacement);
        }

        NVI_STATE.selection =
            null;

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid equip");
        }

        NVI_redessinerVueActive();
    }

    function NVI_utiliserObjetSelectionne(idObjet) {
        if (typeof utiliserObjet === "function") {
            utiliserObjet(idObjet);
        }

        NVI_STATE.selection =
            null;

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid use");
        }

        NVI_redessinerVueActive();
    }

    function NVI_acheterSelection(idObjet) {
        if (typeof acheterObjet === "function") {
            acheterObjet(idObjet, NVI_STATE.quantity || 1);
        }

        NVI_STATE.quantity =
            1;

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid buy");
        }

        NVI_redessinerVueActive();
    }

    function NVI_vendreSelection(idObjet) {
        if (typeof vendreObjet === "function") {
            vendreObjet(idObjet, NVI_STATE.quantity || 1);
        }

        NVI_STATE.quantity =
            1;

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid sell");
        }

        NVI_redessinerVueActive();
    }

    function NVI_demanderSuppression(idObjet) {
        NVI_STATE.deleteConfirmId =
            idObjet;

        NVI_redessinerVueActive();
    }

    function NVI_annulerSuppression() {
        NVI_STATE.deleteConfirmId =
            null;

        NVI_redessinerVueActive();
    }

    function NVI_supprimerStack(idObjet) {
        const item =
            (Game.data.personnage.inventaire || []).find(entree => entree.id === idObjet);

        if (!item) return;

        const quantite =
            Number(item.quantite || 1);

        if (typeof retirerObjetInventaire === "function") {
            retirerObjetInventaire(idObjet, quantite);
        } else {
            Game.data.personnage.inventaire =
                Game.data.personnage.inventaire.filter(entree => entree.id !== idObjet);
        }

        Game.data.personnage.favoris =
            (Game.data.personnage.favoris || []).filter(id => id !== idObjet);

        NVI_supprimerSlotPersiste(idObjet);
        NVI_supprimerVerrouPersiste(idObjet);

        NVI_journal(`🗑 ${NVI_objetNom(idObjet)} x${quantite} supprimé de l'inventaire.`);

        NVI_STATE.selection =
            null;

        NVI_STATE.deleteConfirmId =
            null;

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid delete");
        }

        NVI_redessinerVueActive();
    }

    function NVI_doubleClickItem(contexte, source, idObjet) {
        const objet =
            NVI_objet(idObjet);

        if (!objet) return;

        if (source === "merchant") {
            NVI_selectionner(contexte, source, idObjet);
            return;
        }

        if (contexte === "marchand" && source === "player") {
            NVI_selectionner(contexte, source, idObjet);
            return;
        }

        if (objet.type === "consommable") {
            NVI_utiliserObjetSelectionne(idObjet);
            return;
        }

        if (objet.type === "bague") {
            NVI_selectionner(contexte, source, idObjet);
            return;
        }

        NVI_equiperObjetSelectionne(idObjet);
    }

    function NVI_dragStart(event, idObjet, slot) {
        const slotElement =
            event.target.closest(".nvi-slot");

        const slotActuel =
            slotElement
                ? Number(slotElement.dataset.slot)
                : Number(slot);

        NVI_STATE.drag =
            {
                idObjet,
                slot: slotActuel
            };

        event.dataTransfer.effectAllowed =
            "move";

        event.dataTransfer.setData(
            "text/plain",
            JSON.stringify(NVI_STATE.drag)
        );
    }

    function NVI_dragOver(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect =
            "move";
    }

    function NVI_majSlotDOMClasses(slotElement) {
        if (!slotElement) return;

        const item =
            slotElement.querySelector(".nvi-item");

        slotElement.classList.toggle(
            "nvi-slot--occupied",
            Boolean(item)
        );

        slotElement.classList.toggle(
            "nvi-slot--locked",
            Boolean(item?.classList.contains("nvi-item--locked"))
        );
    }

    function NVI_deplacerDOMSansRedraw(sourceSlot, targetSlot) {
        const conteneur =
            document.getElementById("vuePrincipale");

        if (!conteneur) return false;

        const sourceSlotElement =
            conteneur.querySelector(`.nvi-grid--inventory .nvi-slot[data-slot="${sourceSlot}"]`);

        const targetSlotElement =
            conteneur.querySelector(`.nvi-grid--inventory .nvi-slot[data-slot="${targetSlot}"]`);

        if (!sourceSlotElement || !targetSlotElement) return false;

        const sourceItemElement =
            sourceSlotElement.querySelector(".nvi-item");

        const targetItemElement =
            targetSlotElement.querySelector(".nvi-item");

        if (!sourceItemElement) return false;

        /*
            On déplace visuellement sans rappeler afficherVuePrincipale().
            Ça évite le retour au snapshot initial de la page.
        */
        if (targetItemElement) {
            const placeholder =
                document.createComment("nvi-swap-placeholder");

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

    function NVI_majSelectionDetailsApresDeplacement() {
        /*
            Après un déplacement, le panneau détail n'a pas besoin d'être recréé.
            Si l'objet sélectionné reste le même, les infos restent valables.
            On évite donc un refresh complet.
        */
    }

    function NVI_dropOnSlot(event, targetSlot) {
        event.preventDefault();

        let drag =
            NVI_STATE.drag;

        try {
            const data =
                event.dataTransfer.getData("text/plain");

            if (data) {
                drag =
                    JSON.parse(data);
            }
        } catch (erreur) {
            // fallback state
        }

        if (!drag || drag.idObjet == null) return;

        const sourceSlot =
            Number(drag.slot);

        const target =
            Number(targetSlot);

        if (!Number.isInteger(sourceSlot) || !Number.isInteger(target)) return;

        if (sourceSlot === target) {
            NVI_STATE.drag =
                null;
            return;
        }

        const inventaire =
            Game.data.personnage.inventaire || [];

        const sourceItem =
            inventaire.find(item =>
                item.id === drag.idObjet &&
                Number(item.slot) === sourceSlot
            ) || inventaire.find(item => item.id === drag.idObjet);

        if (!sourceItem) return;

        if (NVI_estItemVerrouille(sourceItem)) {
            NVI_journal("🔒 Cet objet est verrouillé. Déverrouille-le pour le déplacer.");
            return;
        }

        const cibleItem =
            inventaire.find(item => Number(item.slot) === target);

        if (cibleItem && !NVI_itemVisible(cibleItem)) {
            NVI_journal("Impossible de déposer sur une case masquée par les filtres.");
            return;
        }

        if (cibleItem && NVI_estItemVerrouille(cibleItem)) {
            NVI_journal("🔒 Cette case est verrouillée par un autre objet.");
            return;
        }

        /*
            Mise à jour data d'abord.
            Aucun autre item ne peut avoir le même slot après cette opération.
        */
        if (cibleItem && cibleItem.id !== sourceItem.id) {
            NVI_ecrireSlotPersiste(cibleItem, sourceSlot);
        }

        NVI_ecrireSlotPersiste(sourceItem, target);

        /*
            On déplace le DOM sans reconstruire toute la page.
            C'est le point important de cette version.
        */
        const deplacementDomOk =
            NVI_deplacerDOMSansRedraw(sourceSlot, target);

        NVI_STATE.drag =
            null;

        if (!deplacementDomOk) {
            /*
                Fallback très rare : si le DOM a changé entre drag et drop,
                on redessine seulement dans ce cas.
            */
            NVI_redessinerVueActive();
        } else {
            NVI_majSelectionDetailsApresDeplacement();
        }

        if (typeof NV_demanderAutosave === "function") {
            NV_demanderAutosave("inventory grid move no redraw");
        }
    }

    function NVI_patchCoreFunctions() {
        /*
            Patch très robuste :
            certains anciens modules, notamment Start_Save, peuvent réécrire
            ouvrirInventaire() après le chargement initial. On réaffirme donc
            les points d'entrée plusieurs fois et on corrige aussi le bouton HTML.
        */

        window.NVI_ouvrirInventaire =
            NVI_ouvrirInventaire;

        window.NVI_ouvrirMarchand =
            NVI_ouvrirMarchand;

        window.NVI_redessinerVueActive =
            NVI_redessinerVueActive;

        window.ouvrirInventaire =
            NVI_ouvrirInventaire;

        window.ouvrirMarchand =
            NVI_ouvrirMarchand;

        try {
            ouvrirInventaire =
                NVI_ouvrirInventaire;
        } catch (erreur) {
            // Certains environnements peuvent protéger le binding global.
        }

        try {
            ouvrirMarchand =
                NVI_ouvrirMarchand;
        } catch (erreur) {
            // Certains environnements peuvent protéger le binding global.
        }

        window.actualiserMarchand =
            function () {
                if (typeof verifierProgressionQuetes === "function") {
                    verifierProgressionQuetes();
                }

                if (Game.ui.marchandActuel) {
                    NVI_ouvrirMarchand(Game.ui.marchandActuel.id);
                }
            };

        const boutonInventaire =
            document.getElementById("btnInventaire");

        if (boutonInventaire) {
            boutonInventaire.setAttribute(
                "onclick",
                "NVI_ouvrirInventaire()"
            );

            boutonInventaire.onclick =
                event => {
                    event.preventDefault();
                    NVI_ouvrirInventaire();
                };
        }
    }

    function NVI_forcerEntreesInventaire() {
        NVI_patchCoreFunctions();

        const boutonInventaire =
            document.getElementById("btnInventaire");

        if (boutonInventaire) {
            boutonInventaire.setAttribute(
                "onclick",
                "NVI_ouvrirInventaire()"
            );

            boutonInventaire.onclick =
                event => {
                    event.preventDefault();
                    NVI_ouvrirInventaire();
                };
        }
    }

    function NVI_demarrerSurveillanceEntrees() {
        let repetitions =
            0;

        const interval =
            setInterval(() => {
                NVI_forcerEntreesInventaire();

                repetitions++;

                if (repetitions >= 20) {
                    clearInterval(interval);
                }
            }, 250);
    }

    function NVI_patchAddItemSlots() {
        if (typeof ajouterObjetInventaire !== "function" || ajouterObjetInventaire.__NVI_0994_PATCH) return;

        const original =
            ajouterObjetInventaire;

        window.ajouterObjetInventaire = function (idObjet, quantite = 1) {
            const inventaireAvant =
                Game.data.personnage.inventaire || [];

            const slotsAvant =
                new Map(
                    inventaireAvant.map(item => [
                        item.id,
                        item.slot
                    ])
                );

            const result =
                original(idObjet, quantite);

            /*
                Ne jamais réorganiser tout l'inventaire ici.
                On donne seulement une case au nouvel objet si nécessaire.
            */
            const inventaireApres =
                Game.data.personnage.inventaire || [];

            const occupied =
                new Set(
                    inventaireApres
                        .map(item => Number(item.slot))
                        .filter(slot => Number.isInteger(slot) && slot >= 0)
                );

            inventaireApres.forEach(item => {
                if (item.id !== idObjet) return;

                if (
                    item.slot !== undefined &&
                    item.slot !== null &&
                    Number.isInteger(Number(item.slot)) &&
                    Number(item.slot) >= 0
                ) {
                    item.slot =
                        Number(item.slot);

                    return;
                }

                const slot =
                    NVI_freeSlot(
                        occupied,
                        Math.max(NVI_CONFIG.inventorySlots, inventaireApres.length + 12)
                    );

                NVI_ecrireSlotPersiste(item, slot);

                occupied.add(slot);
            });

            /*
                Restaure les slots existants des autres items si un ancien module
                a essayé de les modifier pendant l'ajout.
            */
            inventaireApres.forEach(item => {
                if (item.id === idObjet) return;

                if (slotsAvant.has(item.id)) {
                    item.slot =
                        slotsAvant.get(item.id);
                }
            });

            if (typeof NV_demanderAutosave === "function") {
                NV_demanderAutosave("inventory grid add stable slot");
            }

            return result;
        };

        window.ajouterObjetInventaire.__NVI_0994_PATCH =
            true;
    }

    function NVI_injecterStyle() {
        if (document.getElementById("nviGridInventoryStyle")) return;

        const style =
            document.createElement("style");

        style.id =
            "nviGridInventoryStyle";

        style.textContent =
            `
                .nvi-window {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }

                .nvi-toolbar {
                    padding: 12px;
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    background:
                        radial-gradient(circle at top right, rgba(245, 211, 122, 0.055), transparent 42%),
                        rgba(0,0,0,0.18);
                }

                .nvi-toolbar__top {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 12px;
                    margin-bottom: 10px;
                }

                .nvi-toolbar__top h2 {
                    margin: 0 0 4px;
                }

                .nvi-toolbar__top p {
                    margin: 0;
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.86rem;
                }

                .nvi-toolbar__search-row {
                    display: grid;
                    grid-template-columns: minmax(180px, 1fr) minmax(130px, 180px) auto;
                    gap: 8px;
                    margin-bottom: 10px;
                }

                .nvi-toolbar__search-row input,
                .nvi-toolbar__search-row select {
                    width: 100%;
                    min-height: 34px;
                    box-sizing: border-box;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.10);
                    background: rgba(0,0,0,0.24);
                    color: var(--text, #f1eadf);
                    padding: 7px 10px;
                    outline: none;
                }

                .nvi-filters {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                }

                .nvi-filter {
                    padding: 6px 9px;
                    border-radius: 999px;
                    font-size: 0.78rem;
                }

                .nvi-filter[data-etat="actif"] {
                    border-color: rgba(80, 220, 130, 0.38);
                    color: #9dffb8;
                    box-shadow: 0 0 10px rgba(80, 220, 130, 0.10);
                }

                .nvi-filter[data-etat="exclu"] {
                    border-color: rgba(255, 100, 100, 0.34);
                    color: #ffb4b4;
                    opacity: 0.72;
                }

                .nvi-layout {
                    display: grid;
                    gap: 12px;
                    align-items: start;
                }

                .nvi-layout--inventory {
                    grid-template-columns: minmax(0, 1fr) minmax(280px, 340px);
                }

                .nvi-layout--merchant {
                    grid-template-columns: minmax(300px, 0.9fr) minmax(300px, 0.9fr) minmax(280px, 340px);
                }

                .nvi-panel,
                .nvi-details {
                    border: 1px solid rgba(255,255,255,0.08);
                    border-radius: 16px;
                    background: rgba(0,0,0,0.16);
                    padding: 12px;
                    box-shadow: 0 6px 18px rgba(0,0,0,0.16);
                }

                .nvi-panel__title {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 10px;
                    color: var(--gold, #f5d37a);
                }

                .nvi-panel__title span {
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.78rem;
                    font-weight: 700;
                }

                .nvi-grid {
                    display: grid;
                    grid-template-columns: repeat(var(--nvi-columns), minmax(38px, 1fr));
                    gap: 5px;
                }

                .nvi-slot {
                    position: relative;
                    aspect-ratio: 1 / 1;
                    min-width: 0;
                    border-radius: 9px;
                    border: 1px solid rgba(255,255,255,0.075);
                    background:
                        linear-gradient(145deg, rgba(255,255,255,0.035), rgba(0,0,0,0.18)),
                        rgba(0,0,0,0.28);
                    box-shadow:
                        inset 0 0 0 1px rgba(0,0,0,0.25),
                        0 2px 7px rgba(0,0,0,0.16);
                }

                .nvi-slot::before {
                    content: "";
                    position: absolute;
                    inset: 5px;
                    border-radius: 6px;
                    border: 1px dashed rgba(255,255,255,0.045);
                    pointer-events: none;
                }

                .nvi-slot--filtered {
                    opacity: 0.45;
                    background: rgba(0,0,0,0.34);
                }

                .nvi-slot__filtered-dot {
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 7px;
                    height: 7px;
                    transform: translate(-50%, -50%);
                    border-radius: 999px;
                    background: rgba(255,255,255,0.22);
                }

                .nvi-item {
                    position: absolute;
                    inset: 3px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.10);
                    background:
                        radial-gradient(circle at top left, rgba(255,255,255,0.12), transparent 45%),
                        rgba(25, 22, 20, 0.96);
                    color: var(--text, #f1eadf);
                    cursor: pointer;
                    user-select: none;
                    overflow: hidden;
                    padding: 0;
                    transition:
                        transform 0.12s ease,
                        box-shadow 0.12s ease,
                        border-color 0.12s ease;
                }

                .nvi-item:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 5px 14px rgba(0,0,0,0.30);
                    border-color: rgba(245, 211, 122, 0.26);
                }

                .nvi-slot--locked {
                    border-color: rgba(255, 95, 95, 0.40);
                    background:
                        linear-gradient(145deg, rgba(255, 95, 95, 0.075), rgba(0,0,0,0.20)),
                        rgba(0,0,0,0.30);
                    box-shadow:
                        inset 0 0 0 1px rgba(255, 95, 95, 0.06),
                        0 0 10px rgba(255, 95, 95, 0.07);
                }

                .nvi-item--locked {
                    cursor: pointer;
                    border-color: rgba(255, 95, 95, 0.52) !important;
                    box-shadow:
                        inset 0 0 0 1px rgba(255, 95, 95, 0.12),
                        inset 0 0 12px rgba(255, 95, 95, 0.06);
                }

                .nvi-item--locked:hover {
                    transform: translateY(-1px);
                    box-shadow:
                        0 5px 14px rgba(0,0,0,0.30),
                        inset 0 0 0 1px rgba(255, 95, 95, 0.14),
                        inset 0 0 12px rgba(255, 95, 95, 0.08);
                }

                .nvi-lock-toggle {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    margin: 10px 0;
                    padding: 9px 10px;
                    border-radius: 12px;
                    font-size: 0.86rem;
                    font-weight: 900;
                    cursor: pointer;
                    user-select: none;
                    transition:
                        border-color 0.15s ease,
                        background 0.15s ease,
                        color 0.15s ease,
                        box-shadow 0.15s ease;
                }

                .nvi-lock-toggle--unlocked {
                    border: 1px solid rgba(80, 220, 130, 0.34);
                    background:
                        radial-gradient(circle at top left, rgba(80, 220, 130, 0.14), transparent 55%),
                        rgba(80, 220, 130, 0.08);
                    color: #a9ffc0;
                    box-shadow: inset 0 0 0 1px rgba(80, 220, 130, 0.055);
                }

                .nvi-lock-toggle--locked {
                    border: 1px solid rgba(255, 95, 95, 0.46);
                    background:
                        radial-gradient(circle at top left, rgba(255, 95, 95, 0.16), transparent 55%),
                        rgba(255, 95, 95, 0.08);
                    color: #ffb7b7;
                    box-shadow:
                        0 0 12px rgba(255, 95, 95, 0.10),
                        inset 0 0 0 1px rgba(255, 95, 95, 0.055);
                }

                .nvi-lock-toggle__icon {
                    line-height: 1;
                }

                .nvi-lock-toggle__text {
                    line-height: 1;
                }

                .nvi-item--selected {
                    box-shadow:
                        0 0 0 2px rgba(245, 211, 122, 0.35),
                        0 0 14px rgba(245, 211, 122, 0.14);
                }

                .nvi-item__icon {
                    font-size: clamp(1.05rem, 2.5vw, 1.7rem);
                    line-height: 1;
                }

                .nvi-item__icon img,
                .nvi-details__icon img {
                    width: 78%;
                    height: 78%;
                    object-fit: contain;
                    display: block;
                }

                .nvi-item__qty {
                    position: absolute;
                    right: 3px;
                    bottom: 2px;
                    min-width: 16px;
                    padding: 1px 4px;
                    border-radius: 999px;
                    background: rgba(0,0,0,0.68);
                    color: #ffffff;
                    font-size: 0.68rem;
                    font-weight: 900;
                    line-height: 1.2;
                    text-align: center;
                }

                .nvi-item__lock {
                    position: absolute;
                    right: 3px;
                    top: 2px;
                    z-index: 3;
                    font-size: 0.64rem;
                    line-height: 1;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.85));
                }

                .nvi-item__favorite {
                    position: absolute;
                    left: 3px;
                    top: 2px;
                    font-size: 0.64rem;
                    line-height: 1;
                    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));
                }

                .nvi-item--commun {
                    border-color: rgba(255,255,255,0.12);
                }

                .nvi-item--peu-commun {
                    border-color: rgba(69, 214, 79, 0.34);
                    box-shadow: inset 0 0 9px rgba(69, 214, 79, 0.06);
                }

                .nvi-item--rare {
                    border-color: rgba(74, 163, 255, 0.38);
                    box-shadow: inset 0 0 10px rgba(74, 163, 255, 0.07);
                }

                .nvi-item--epique,
                .nvi-item--épique {
                    border-color: rgba(255, 77, 255, 0.38);
                    box-shadow: inset 0 0 10px rgba(255, 77, 255, 0.07);
                }

                .nvi-item--legendaire,
                .nvi-item--légendaire {
                    border-color: rgba(255, 157, 0, 0.42);
                    box-shadow: inset 0 0 12px rgba(255, 157, 0, 0.08);
                }

                .nvi-details {
                    position: sticky;
                    top: 190px;
                }

                .nvi-details__empty {
                    min-height: 160px;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 6px;
                    color: var(--text-muted, #c7bdad);
                    text-align: center;
                }

                .nvi-details__header {
                    display: grid;
                    grid-template-columns: 58px minmax(0, 1fr);
                    gap: 10px;
                    align-items: center;
                    margin-bottom: 10px;
                }

                .nvi-details__icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    aspect-ratio: 1 / 1;
                    border-radius: 12px;
                    border: 1px solid rgba(255,255,255,0.10);
                    background: rgba(0,0,0,0.24);
                    font-size: 1.7rem;
                }

                .nvi-details__header h3 {
                    margin: 0 0 3px;
                    font-size: 1.05rem;
                }

                .nvi-details__header p {
                    margin: 0;
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.78rem;
                }

                .nvi-details__description,
                .nvi-details__stats {
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.86rem;
                    line-height: 1.35;
                }

                .nvi-details__stats {
                    padding: 8px;
                    border-radius: 10px;
                    background: rgba(0,0,0,0.18);
                    border: 1px solid rgba(255,255,255,0.06);
                }

                .nvi-details__actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 7px;
                    margin: 10px 0;
                }

                .nvi-danger {
                    width: 100%;
                    margin-top: 6px;
                    border-color: rgba(255, 90, 90, 0.30);
                    color: #ffb4b4;
                }

                .nvi-delete-confirm {
                    display: grid;
                    grid-template-columns: 1fr auto auto;
                    align-items: center;
                    gap: 6px;
                    margin-top: 8px;
                    padding: 8px;
                    border-radius: 10px;
                    border: 1px solid rgba(255, 90, 90, 0.24);
                    background: rgba(255, 90, 90, 0.07);
                    color: #ffcdcd;
                    font-size: 0.82rem;
                }

                .nvi-trade-box {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    margin-top: 10px;
                    padding: 9px;
                    border-radius: 12px;
                    border: 1px solid rgba(245, 211, 122, 0.16);
                    background: rgba(245, 211, 122, 0.055);
                }

                .nvi-trade-box p {
                    margin: 0;
                    color: var(--text-muted, #c7bdad);
                    font-size: 0.84rem;
                }

                .nvi-quantity {
                    display: grid;
                    grid-template-columns: auto minmax(54px, 1fr) auto auto;
                    gap: 5px;
                }

                .nvi-quantity input {
                    min-width: 0;
                    text-align: center;
                    border-radius: 999px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(0,0,0,0.26);
                    color: var(--text, #f1eadf);
                    font-weight: 800;
                }

                .nvi-merchant-mode {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    margin-top: -4px;
                }

                .nvi-merchant-mode button.active {
                    border-color: rgba(245, 211, 122, 0.30);
                    color: var(--gold, #f5d37a);
                    box-shadow: 0 0 12px rgba(245, 211, 122, 0.10);
                }

                @media (max-width: 1180px) {
                    .nvi-layout--merchant {
                        grid-template-columns: 1fr 1fr;
                    }

                    .nvi-layout--merchant .nvi-details {
                        grid-column: 1 / -1;
                        position: static;
                    }
                }

                @media (max-width: 860px) {
                    .nvi-layout--inventory,
                    .nvi-layout--merchant {
                        grid-template-columns: 1fr;
                    }

                    .nvi-details {
                        position: static;
                    }

                    .nvi-toolbar__search-row {
                        grid-template-columns: 1fr;
                    }

                    .nvi-grid {
                        grid-template-columns: repeat(6, minmax(38px, 1fr)) !important;
                    }
                }
            `;

        document.head.appendChild(style);
    }

    function NVI_installer() {
        if (!NVI_hasGame()) {
            setTimeout(NVI_installer, 120);
            return;
        }

        NVI_assurerEtatFiltres();
        NVI_synchroniserVerrousInventaire();
        NVI_normaliserSlotsInventaire();
        NVI_injecterStyle();
        NVI_patchAddItemSlots();
        NVI_patchCoreFunctions();
        NVI_demarrerSurveillanceEntrees();

        console.log(`✅ Inventory_Grid_Metin2.js chargé — ${NV_INVENTORY_GRID_VERSION}`);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NVI_installer);
    } else {
        NVI_installer();
    }

    window.NV_INVENTORY_GRID_VERSION =
        NV_INVENTORY_GRID_VERSION;

    window.NVI_selectionner =
        NVI_selectionner;

    window.NVI_doubleClickItem =
        NVI_doubleClickItem;

    window.NVI_dragStart =
        NVI_dragStart;

    window.NVI_dragOver =
        NVI_dragOver;

    window.NVI_dropOnSlot =
        NVI_dropOnSlot;

    window.NVI_changerRecherche =
        NVI_changerRecherche;

    window.NVI_changerTri =
        NVI_changerTri;

    window.NVI_inverserOrdreTri =
        NVI_inverserOrdreTri;

    window.NVI_changerFiltre =
        NVI_changerFiltre;

    window.NVI_changerModeMarchand =
        NVI_changerModeMarchand;

    window.NVI_modifierQuantite =
        NVI_modifierQuantite;

    window.NVI_setQuantite =
        NVI_setQuantite;

    window.NVI_toggleFavori =
        NVI_toggleFavori;

    window.NVI_equiperObjetSelectionne =
        NVI_equiperObjetSelectionne;

    window.NVI_utiliserObjetSelectionne =
        NVI_utiliserObjetSelectionne;

    window.NVI_acheterSelection =
        NVI_acheterSelection;

    window.NVI_vendreSelection =
        NVI_vendreSelection;

    window.NVI_demanderSuppression =
        NVI_demanderSuppression;

    window.NVI_annulerSuppression =
        NVI_annulerSuppression;

    window.NVI_supprimerStack =
        NVI_supprimerStack;

    window.NVI_toggleVerrouillage =
        NVI_toggleVerrouillage;

    window.NVI_triAutomatiqueInventaire =
        NVI_triAutomatiqueInventaire;

    window.NVI_synchroniserSlotsDepuisCarte =
        NVI_synchroniserSlotsDepuisCarte;

    window.NVI_synchroniserVerrousInventaire =
        NVI_synchroniserVerrousInventaire;

    window.NVI_ouvrirInventaire =
        NVI_ouvrirInventaire;

    window.NVI_ouvrirMarchand =
        NVI_ouvrirMarchand;

    window.NVI_redessinerVueActive =
        NVI_redessinerVueActive;
})();
