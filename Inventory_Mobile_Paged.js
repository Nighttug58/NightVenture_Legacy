/* NightVenture — inventaire mobile paginé + popup intégré */
(function () {
    "use strict";

    const SLOTS_PER_PAGE = 30;
    const MIN_SLOTS = 120;
    const DRAG_THRESHOLD = 8;
    const LONG_PRESS_CLEAR_MS = 430;
    const LONG_PRESS_SUPPRESS_MS = 950;
    const SYNTHETIC_CLICK_SUPPRESS_MS = 220;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    let observer = null;
    let applyPending = false;
    let suppressObserver = false;
    let dragState = null;
    let dragGhost = null;
    let longPressTimer = null;
    let longPressBlockedClick = false;
    let suppressClickUntil = 0;

    function inv() { return Game?.data?.personnage?.inventaire || []; }
    function key(item) { return String(item?.uid || item?.instanceId || item?.id || ""); }
    function itemData(id) { return inv().find(item => item.id === id) || null; }
    function slotNo(slot, fallback = -1) { const n = Number(slot?.dataset?.slot); return Number.isInteger(n) && n >= 0 ? n : fallback; }
    function pageStart(page) { return Math.max(0, Number(page) || 0) * SLOTS_PER_PAGE; }
    function currentPage() { Game.ui.nvInventairePage ??= 0; return Math.max(0, Number(Game.ui.nvInventairePage) || 0); }
    function label(i) { return PAGE_LABELS[i] || String(i + 1); }

    function clearInventorySelectionClasses(root = document) {
        root.querySelectorAll(".nvi-layout--inventory .nvi-item--selected, .nvi-layout--inventory .nvimp-item--popup-open")
            .forEach(item => item.classList.remove("nvi-item--selected", "nvimp-item--popup-open"));
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

    function selectorForItem(id) {
        const raw = String(id || "");
        const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(raw) : raw.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
        return `.nvi-layout--inventory .nvi-item[data-nvi-item-id="${escaped}"]`;
    }

    function objectData(id) {
        if (typeof trouverObjet === "function") return trouverObjet(id);
        return Game?.cache?.objetsParId?.[id] || null;
    }

    function objectName(id) { return objectData(id)?.nom || id; }
    function isFavorite(id) { return (Game?.data?.personnage?.favoris || []).includes(id); }

    function isLocked(id) {
        const item = itemData(id);
        if (!item) return false;
        const map = Game?.data?.personnage?.inventaireVerrous || {};
        const itemKey = key(item);
        if (Object.prototype.hasOwnProperty.call(map, itemKey)) return Boolean(map[itemKey]);
        return Boolean(item.verrouille || item.locked || item.bloque);
    }

    function objectIcon(objet) {
        if (objet?.image) return `<img src="${escapeHtml(objet.image)}" alt="${escapeHtml(objet.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">OBJ</span>`;
    }

    function objectDetails(objet) {
        if (!objet) return "";
        if (typeof creerDetailsObjetInventaire === "function") return creerDetailsObjetInventaire(objet);
        if (typeof creerDetailsObjet === "function") return creerDetailsObjet(objet);
        const stats = [
            ["ATK", "attaque"], ["DEF", "defense"], ["ATK MAGIC", "attaqueMagique"], ["DEF MAGIC", "defenseMagique"],
            ["PV", "pvMax"], ["MANA", "manaMax"], ["FOR", "force"], ["DEX", "dexterite"], ["INT", "intelligence"], ["VIT", "vitalite"]
        ];
        return stats.filter(([, stat]) => objet[stat]).map(([label, stat]) => `${label} +${objet[stat]}`).join(" ");
    }

    function setPage(page) {
        Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        applyPagedInventory();
    }

    function saveSlot(item, slot) {
        const n = Number(slot);
        if (!item || !Number.isInteger(n) || n < 0) return;
        item.slot = n;
        Game.data.personnage.inventaireSlots ??= {};
        Game.data.personnage.inventaireSlots[key(item)] = n;
    }

    function firstFreeSlotInPage(page, ignoredId = null) {
        const start = pageStart(page);
        for (let slot = start; slot < start + SLOTS_PER_PAGE; slot++) {
            const used = inv().some(item => item.id !== ignoredId && Number(item.slot) === slot);
            if (!used) return slot;
        }
        return start;
    }

    function moveData(id, targetSlot, swap = true) {
        const item = itemData(id);
        const target = Number(targetSlot);
        if (!item || !Number.isInteger(target) || target < 0) return false;
        const source = Number(item.slot);
        if (source === target) return true;

        const other = inv().find(entry => entry !== item && Number(entry.slot) === target);
        if (other) {
            if (!swap) return false;
            if (Number.isInteger(source) && source >= 0) saveSlot(other, source);
        }

        saveSlot(item, target);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory move");
        return true;
    }

    function findItemNode(id) {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-item[data-nvi-item-id]"))
            .find(node => node.dataset.nviItemId === id) || null;
    }

    function findSlotNode(slot) {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot"))
            .find(node => slotNo(node) === Number(slot)) || null;
    }

    function moveDom(id, targetSlot) {
        const item = findItemNode(id);
        const target = findSlotNode(targetSlot);
        if (!item || !target) return false;
        const source = item.closest(".nvi-slot");
        const other = target.querySelector(".nvi-item[data-nvi-item-id]");
        if (other && source && other !== item) source.appendChild(other);
        target.appendChild(item);
        [source, target].forEach(slot => {
            if (!slot) return;
            slot.classList.toggle("nvi-slot--occupied", Boolean(slot.querySelector(".nvi-item")));
            slot.classList.toggle("nvi-slot--locked", Boolean(slot.querySelector(".nvi-item--locked")));
        });
        return true;
    }

    function selectedItemId() {
        const popup = document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup[data-nvipr-item-id]");
        if (popup?.dataset?.nviprItemId) return popup.dataset.nviprItemId;
        const selected = document.querySelector(".nvi-layout--inventory .nvimp-item--popup-open[data-nvi-item-id]");
        return selected?.dataset?.nviItemId || null;
    }

    function closeInventoryPopup() {
        clearInventorySelectionClasses();
        const popup = document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
        if (popup) popup.remove();
        document.querySelector(".nvi-layout--inventory")?.classList.add("nvimp-no-details");
    }

    function hasInventoryPopup() {
        return Boolean(document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup[data-nvipr-item-id]"));
    }

    function clearLongPressTimer() {
        if (!longPressTimer) return;
        clearTimeout(longPressTimer);
        longPressTimer = null;
    }

    function clearStaleLongPressSelection(item = null) {
        if (document.activeElement?.closest?.(".nvi-layout--inventory .nvi-item")) document.activeElement.blur();
        if (hasInventoryPopup()) return;
        if (item?.classList) item.classList.remove("nvi-item--selected", "nvimp-item--popup-open");
        else clearInventorySelectionClasses();
    }

    function scheduleLongPressNeutralize(item, pointerId) {
        clearLongPressTimer();
        longPressTimer = setTimeout(() => {
            if (!dragState || dragState.pointerId !== pointerId || dragState.dragging) return;
            longPressBlockedClick = true;
            suppressClickUntil = Date.now() + LONG_PRESS_SUPPRESS_MS;
            clearStaleLongPressSelection(item);
        }, LONG_PRESS_CLEAR_MS);
    }

    function moveSelectedToPage(page) {
        const id = selectedItemId();
        if (!id) return;
        const target = firstFreeSlotInPage(page, id);
        if (!moveData(id, target, true)) return;
        Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        moveDom(id, target);
        applyPagedInventory();
        closeInventoryPopup();
    }

    function injectStyle() {
        // Styles moved to Inventory_Header_Cleanup.css.
    }

    function enhanceToolbar() {
        const toolbar = document.querySelector(".nvi-window .nvi-toolbar");
        if (!toolbar) return;
        toolbar.classList.add("nvimp-toolbar-compact");
        toolbar.classList.toggle("is-expanded", Boolean(Game?.ui?.nvInventaireFiltresOuverts));

        let toggle = toolbar.querySelector(":scope > .nvimp-toolbar-toggle");
        if (!toggle) {
            toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "nvimp-toolbar-toggle";
            toggle.addEventListener("click", event => {
                event.preventDefault();
                Game.ui.nvInventaireFiltresOuverts = !Game.ui.nvInventaireFiltresOuverts;
                applyPagedInventory();
            });
            const top = toolbar.querySelector(".nvi-toolbar__top");
            if (top?.nextSibling) toolbar.insertBefore(toggle, top.nextSibling);
            else toolbar.appendChild(toggle);
        }
        toggle.textContent = Game.ui.nvInventaireFiltresOuverts ? "Masquer tri & filtres" : "Afficher tri & filtres";
    }

    function handlePageButtonEvent(event, page, mode) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        if (mode === "move") moveSelectedToPage(page);
        else setPage(page);
    }

    function buildPager(pageCount, activePage, mode) {
        const pager = document.createElement("div");
        pager.className = mode === "move" ? "nvimp-popup-pager" : "nvimp-pager";
        if (mode === "move") {
            const title = document.createElement("span");
            title.className = "nvimp-popup-pager__label";
            title.textContent = "Déplacer l'objet vers page";
            pager.appendChild(title);
        }
        for (let i = 0; i < pageCount; i++) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nvimp-page-btn" + (i === activePage ? " is-active" : "");
            button.dataset.nvimpPage = String(i);
            button.dataset.nvimpMode = mode;
            button.textContent = label(i);
            if (mode === "move") button.addEventListener("pointerdown", event => handlePageButtonEvent(event, i, mode), true);
            button.addEventListener("click", event => handlePageButtonEvent(event, i, mode), true);
            pager.appendChild(button);
        }
        return pager;
    }

    function findLiveDetails() {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory > .nvi-details"))
            .find(panel => !panel.querySelector(".nvi-details__empty")) || null;
    }

    function refreshItemQuantity(id) {
        const item = itemData(id);
        document.querySelectorAll(selectorForItem(id)).forEach(button => {
            const quantity = Number(item?.quantite || 0);
            let badge = button.querySelector(".nvi-item__qty");
            if (quantity > 1) {
                if (!badge) {
                    badge = document.createElement("span");
                    badge.className = "nvi-item__qty";
                    button.appendChild(badge);
                }
                badge.textContent = String(quantity);
            } else if (badge) badge.remove();
        });
    }

    function removeGridItem(id) {
        document.querySelectorAll(selectorForItem(id)).forEach(button => {
            const slot = button.closest(".nvi-slot");
            button.remove();
            if (slot) {
                slot.classList.remove("nvi-slot--occupied", "nvi-slot--locked");
                if (!slot.children.length) slot.textContent = "";
            }
        });
    }

    function refreshGridItemState(id) {
        const item = itemData(id);
        if (!item) {
            removeGridItem(id);
            return;
        }
        const favorite = isFavorite(id);
        const locked = isLocked(id);
        document.querySelectorAll(selectorForItem(id)).forEach(button => {
            button.classList.remove("nvi-item--selected");
            button.classList.toggle("nvimp-item--popup-open", Boolean(document.querySelector(`.nvi-layout--inventory > .nvi-details.nvipr-popup[data-nvipr-item-id=\"${id}\"]`)));
            button.classList.toggle("nvi-item--locked", locked);
            button.draggable = false;
            let fav = button.querySelector(".nvi-item__favorite");
            if (favorite && !fav) {
                fav = document.createElement("span");
                fav.className = "nvi-item__favorite";
                fav.textContent = "Favori";
                button.prepend(fav);
            }
            if (!favorite && fav) fav.remove();
            let lock = button.querySelector(".nvi-item__lock");
            if (locked && !lock) {
                lock = document.createElement("span");
                lock.className = "nvi-item__lock";
                lock.textContent = "Lock";
                button.prepend(lock);
            }
            if (!locked && lock) lock.remove();
            button.closest(".nvi-slot")?.classList.toggle("nvi-slot--locked", locked);
        });
        refreshItemQuantity(id);
    }

    function refreshPopupState(id) {
        const popup = findLiveDetails();
        if (!popup || popup.dataset.nviprItemId !== id) return;
        const favoriteButton = popup.querySelector("[data-nvipr-action='favorite']");
        if (favoriteButton) favoriteButton.textContent = isFavorite(id) ? "Retirer favori" : "Ajouter favori";
        const lock = popup.querySelector("[data-nvipr-action='lock']");
        if (lock) {
            const locked = isLocked(id);
            lock.classList.toggle("nvi-lock-toggle--locked", locked);
            lock.classList.toggle("nvi-lock-toggle--unlocked", !locked);
            lock.querySelector(".nvi-lock-toggle__text")?.replaceChildren(document.createTextNode(locked ? "Bloqué" : "Libre"));
        }
    }

    function updateAfterStackMutation(id) {
        if (itemData(id)) refreshGridItemState(id);
        else removeGridItem(id);
    }

    function toggleFavoriteNoRedraw(id) {
        Game.data.personnage.favoris ??= [];
        if (isFavorite(id)) Game.data.personnage.favoris = Game.data.personnage.favoris.filter(entry => entry !== id);
        else Game.data.personnage.favoris.push(id);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup favorite");
        refreshGridItemState(id);
        refreshPopupState(id);
    }

    function toggleLockNoRedraw(id) {
        const item = itemData(id);
        if (!item) return;
        const locked = !isLocked(id);
        Game.data.personnage.inventaireVerrous ??= {};
        Game.data.personnage.inventaireVerrous[key(item)] = locked;
        item.verrouille = locked;
        delete item.locked;
        delete item.bloque;
        if (typeof ajouterJournal === "function") ajouterJournal(locked ? `${objectName(id)} est bloqué sur sa case.` : `${objectName(id)} est libre.`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup lock");
        refreshGridItemState(id);
        refreshPopupState(id);
    }

    function equipNoRedraw(id, slot = null) {
        if (typeof equiperObjet === "function") equiperObjet(id, slot);
        else if (typeof equiperObjetInterface === "function") equiperObjetInterface(id, slot);
        updateAfterStackMutation(id);
        closeInventoryPopup();
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup equip");
        if (typeof afficherPersonnage === "function") afficherPersonnage();
        if (typeof afficherJournal === "function") afficherJournal();
    }

    function useNoRedraw(id) {
        const obj = objectData(id);
        if (!obj || obj.type !== "consommable" || typeof appliquerEffetObjet !== "function") return;
        const applied = appliquerEffetObjet(obj);
        if (!applied) {
            if (typeof afficherJournal === "function") afficherJournal();
            return;
        }
        if (typeof retirerObjetInventaire === "function") retirerObjetInventaire(id, 1);
        if (typeof corrigerRessources === "function") corrigerRessources();
        updateAfterStackMutation(id);
        closeInventoryPopup();
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup use");
        if (typeof afficherPersonnage === "function") afficherPersonnage();
        if (typeof afficherJournal === "function") afficherJournal();
    }

    function renderDeleteConfirm(popup, id) {
        const existing = popup.querySelector(".nvi-danger, .nvi-delete-confirm");
        if (!existing) return;
        const box = document.createElement("div");
        box.className = "nvi-delete-confirm";
        box.innerHTML = `<span>Supprimer toute la pile ?</span><button type="button" data-nvipr-action="delete-confirm" data-nvipr-id="${escapeHtml(id)}">Confirmer</button><button type="button" data-nvipr-action="delete-cancel" data-nvipr-id="${escapeHtml(id)}">Annuler</button>`;
        existing.replaceWith(box);
    }

    function renderDeleteButton(popup, id) {
        const existing = popup.querySelector(".nvi-delete-confirm");
        if (!existing) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nvi-danger";
        button.dataset.nviprAction = "delete-open";
        button.dataset.nviprId = id;
        button.textContent = "Jeter l'objet";
        existing.replaceWith(button);
    }

    function deleteStackNoRedraw(id) {
        const item = itemData(id);
        if (!item) return;
        const qty = Number(item.quantite || 1);
        const itemKey = key(item);
        Game.data.personnage.inventaire = inv().filter(entry => entry !== item && entry.id !== id);
        Game.data.personnage.favoris = (Game.data.personnage.favoris || []).filter(entry => entry !== id);
        if (Game.data.personnage.inventaireSlots) delete Game.data.personnage.inventaireSlots[itemKey];
        if (Game.data.personnage.inventaireVerrous) delete Game.data.personnage.inventaireVerrous[itemKey];
        removeGridItem(id);
        if (typeof ajouterJournal === "function") ajouterJournal(`${objectName(id)} x${qty} supprimé de l'inventaire.`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup delete");
        closeInventoryPopup();
        if (typeof afficherJournal === "function") afficherJournal();
    }

    function renderInventoryPopup(id, clickedItem = null) {
        const item = itemData(id);
        const obj = objectData(id);
        const layout = document.querySelector(".nvi-layout--inventory");
        if (!item || !obj || !layout) return;
        clearInventorySelectionClasses();
        if (clickedItem) clickedItem.classList.add("nvimp-item--popup-open");

        let popup = findLiveDetails() || layout.querySelector(":scope > .nvi-details") || document.createElement("aside");
        if (!popup.parentElement) layout.appendChild(popup);

        const rarete = obj.rarete || "commun";
        const qty = Number(item.quantite || 1);
        const stats = objectDetails(obj);
        const favorite = isFavorite(id);
        const locked = isLocked(id);

        popup.className = "nvi-details nvimp-details-popup nvipr-popup";
        popup.dataset.nviprItemId = id;
        popup.innerHTML = `
            <button type="button" class="nvimp-popup-close">×</button>
            <div class="nvi-details__header">
                <div class="nvi-details__icon nvi-item--${escapeHtml(rarete)}">${objectIcon(obj)}</div>
                <div>
                    <h3 class="${escapeHtml(rarete)}">${escapeHtml(obj.nom || id)}</h3>
                    <p data-nvipr-meta="1"><span class="nvipr-meta-line">${escapeHtml(obj.type || "divers")} · ${escapeHtml(obj.rarete || "commun")}</span><span class="nvipr-meta-line">Quantité : ${qty}</span></p>
                </div>
            </div>
            ${stats ? `<p class="nvi-details__stats">${stats}</p>` : ""}
            <p class="nvi-details__description">${escapeHtml(obj.description || "Aucune description.")}</p>
            <div class="nvi-details__actions">
                ${obj.type === "consommable" ? `<button type="button" data-nvipr-action="use" data-nvipr-id="${escapeHtml(id)}">Utiliser</button>` : obj.type === "bague" ? `<button type="button" data-nvipr-action="equip-ring1" data-nvipr-id="${escapeHtml(id)}">Anneau I</button><button type="button" data-nvipr-action="equip-ring2" data-nvipr-id="${escapeHtml(id)}">Anneau II</button>` : `<button type="button" data-nvipr-action="equip" data-nvipr-id="${escapeHtml(id)}">Équiper</button>`}
            </div>
            <div class="nvipr-secondary-row">
                <button type="button" class="nvipr-secondary-action" data-nvipr-action="favorite" data-nvipr-id="${escapeHtml(id)}">${favorite ? "Retirer favori" : "Ajouter favori"}</button>
                <button type="button" class="nvi-lock-toggle ${locked ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" data-nvipr-action="lock" data-nvipr-id="${escapeHtml(id)}"><span class="nvi-lock-toggle__text">${locked ? "Bloqué" : "Libre"}</span></button>
            </div>
            <button type="button" class="nvi-danger" data-nvipr-action="delete-open" data-nvipr-id="${escapeHtml(id)}">Jeter l'objet</button>
        `;
        layout.classList.remove("nvimp-no-details");
        enhancePopupPager(Math.max(1, Math.ceil((Math.max(...Array.from(document.querySelectorAll('.nvi-layout--inventory .nvi-slot')).map(slot => slotNo(slot, 0))) + 1) / SLOTS_PER_PAGE)), currentPage());
    }

    function handlePopupAction(event) {
        if (Game?.ui?.vueActive !== "inventaire") return;
        const close = event.target?.closest?.(".nvi-details.nvipr-popup .nvimp-popup-close");
        if (close) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            closeInventoryPopup();
            return;
        }
        const button = event.target?.closest?.(".nvi-details.nvipr-popup [data-nvipr-action]");
        if (!button) return;
        const popup = button.closest(".nvi-details.nvipr-popup");
        const id = button.dataset.nviprId || popup?.dataset?.nviprItemId;
        if (!id) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const action = button.dataset.nviprAction;
        if (action === "favorite") toggleFavoriteNoRedraw(id);
        else if (action === "lock") toggleLockNoRedraw(id);
        else if (action === "delete-open") renderDeleteConfirm(popup, id);
        else if (action === "delete-cancel") renderDeleteButton(popup, id);
        else if (action === "delete-confirm") deleteStackNoRedraw(id);
        else if (action === "equip") equipNoRedraw(id, null);
        else if (action === "equip-ring1") equipNoRedraw(id, "bague1");
        else if (action === "equip-ring2") equipNoRedraw(id, "bague2");
        else if (action === "use") useNoRedraw(id);
    }

    function handleItemSelection(event) {
        if (Game?.ui?.vueActive !== "inventaire") return;
        const button = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
        if (!button) return;
        if (Date.now() < suppressClickUntil || longPressBlockedClick) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            clearStaleLongPressSelection(button);
            longPressBlockedClick = false;
            return;
        }
        if (document.querySelector(".nvi-slot.nvimp-touch-target")) return;
        const id = button.dataset.nviItemId;
        if (!id) return;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        renderInventoryPopup(id, button);
    }

    function installPopupActions() {
        if (window.__NVIMP_POPUP_ACTIONS) return;
        window.__NVIMP_POPUP_ACTIONS = true;
        document.addEventListener("click", handlePopupAction, true);
        document.addEventListener("click", handleItemSelection, true);
    }

    function installPopupPagerActions() {
        if (window.__NVIMP_POPUP_PAGER_ACTIONS) return;
        window.__NVIMP_POPUP_PAGER_ACTIONS = true;
        const handle = event => {
            if (Game?.ui?.vueActive !== "inventaire") return;
            const button = event.target?.closest?.(".nvi-details.nvipr-popup .nvimp-popup-pager .nvimp-page-btn[data-nvimp-mode='move']");
            if (!button) return;
            const page = Number(button.dataset.nvimpPage);
            if (!Number.isInteger(page) || page < 0) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            if (event.type === "pointerdown") {
                suppressClickUntil = Date.now() + SYNTHETIC_CLICK_SUPPRESS_MS;
                moveSelectedToPage(page);
                return;
            }
            if (Date.now() < suppressClickUntil) return;
            moveSelectedToPage(page);
        };
        document.addEventListener("pointerdown", handle, true);
        document.addEventListener("click", handle, true);
    }

    function installOutsidePopupClose() {
        if (window.__NVIMP_OUTSIDE_POPUP_CLOSE) return;
        window.__NVIMP_OUTSIDE_POPUP_CLOSE = true;
        document.addEventListener("click", event => {
            if (Game?.ui?.vueActive !== "inventaire") return;
            const popup = document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
            if (!popup) return;
            if (event.target?.closest?.(".nvi-details.nvipr-popup")) return;
            if (Date.now() < suppressClickUntil) return;
            closeInventoryPopup();
        }, false);
    }

    function installLegacyInventoryGuards() {
        if (!window.__NVIMP_LEGACY_GUARDS) {
            window.__NVIMP_LEGACY_GUARDS = true;
            document.addEventListener("dblclick", event => {
                if (Game?.ui?.vueActive !== "inventaire") return;
                const item = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
                if (!item) return;
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
            }, true);
        }

        if (typeof window.NVI_doubleClickItem === "function" && !window.NVI_doubleClickItem.__NVIMP_SAFE) {
            const originalDoubleClick = window.NVI_doubleClickItem;
            window.NVI_doubleClickItem = function (contexte, source) {
                if (Game?.ui?.vueActive === "inventaire" && source === "player") return false;
                return originalDoubleClick.apply(this, arguments);
            };
            window.NVI_doubleClickItem.__NVIMP_SAFE = true;
        }

        if (typeof window.NVI_utiliserObjetSelectionne === "function" && !window.NVI_utiliserObjetSelectionne.__NVIMP_SAFE) {
            const originalUse = window.NVI_utiliserObjetSelectionne;
            window.NVI_utiliserObjetSelectionne = function () {
                if (Game?.ui?.vueActive === "inventaire" && document.querySelector(".nvi-layout--inventory")) return false;
                return originalUse.apply(this, arguments);
            };
            window.NVI_utiliserObjetSelectionne.__NVIMP_SAFE = true;
        }
    }

    function ensureSlotRange(grid, first, count) {
        const exists = new Set(Array.from(grid.querySelectorAll(":scope > .nvi-slot")).map(slot => slotNo(slot)));
        for (let slot = first; slot < first + count; slot++) {
            if (exists.has(slot)) continue;
            const node = document.createElement("div");
            node.className = "nvi-slot";
            node.dataset.slot = String(slot);
            grid.appendChild(node);
        }
    }

    function ensureSlots(grid) {
        Array.from(grid.querySelectorAll(":scope > .nvi-slot")).forEach((slot, i) => { if (!slot.dataset.slot) slot.dataset.slot = String(i); });
        const domMax = Array.from(grid.querySelectorAll(":scope > .nvi-slot")).reduce((m, slot) => Math.max(m, slotNo(slot)), -1);
        const dataMax = inv().reduce((m, item) => Math.max(m, Number(item.slot) || 0), -1);
        ensureSlotRange(grid, 0, Math.max(MIN_SLOTS - 1, domMax, dataMax) + 1);
    }

    function applyPager(grid) {
        ensureSlots(grid);
        let slots = Array.from(grid.querySelectorAll(":scope > .nvi-slot"));
        const maxSlot = slots.reduce((m, slot) => Math.max(m, slotNo(slot)), 0);
        const pageCount = Math.max(1, Math.ceil((maxSlot + 1) / SLOTS_PER_PAGE));
        const page = Math.min(currentPage(), pageCount - 1);
        Game.ui.nvInventairePage = page;
        ensureSlotRange(grid, pageStart(page), SLOTS_PER_PAGE);
        slots = Array.from(grid.querySelectorAll(":scope > .nvi-slot"));
        const start = pageStart(page);
        const end = start + SLOTS_PER_PAGE;
        slots.forEach(slot => {
            const visible = slotNo(slot) >= start && slotNo(slot) < end;
            slot.style.display = visible ? "" : "none";
            slot.classList.toggle("nvimp-visible-slot", visible);
        });
        grid.parentElement?.querySelector(":scope > .nvimp-pager")?.remove();
        grid.parentElement?.insertBefore(buildPager(pageCount, page, "navigate"), grid);
        return { pageCount, page };
    }

    function clearDragVisuals() {
        document.querySelectorAll(".nvi-slot.nvimp-touch-target").forEach(node => node.classList.remove("nvimp-touch-target"));
        document.querySelectorAll(".nvi-item.nvimp-moving").forEach(node => node.classList.remove("nvimp-moving"));
    }

    function neutralizeNativeDragTargets(root = document) {
        root.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-item, .nvi-layout--inventory .nvi-grid--inventory .nvi-item *").forEach(node => {
            if (!node?.setAttribute) return;
            node.removeAttribute("onclick");
            node.removeAttribute("ondblclick");
            node.removeAttribute("ondragstart");
            node.removeAttribute("ondragover");
            node.removeAttribute("ondrop");
            node.onclick = null;
            node.ondblclick = null;
            node.ondragstart = null;
            node.ondragover = null;
            node.ondrop = null;
            node.setAttribute("draggable", "false");
            node.style.webkitTouchCallout = "none";
            node.style.userSelect = "none";
            node.style.webkitUserSelect = "none";
            try { node.draggable = false; } catch (_) {}
        });
        root.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot").forEach(slot => {
            slot.removeAttribute("ondragover");
            slot.removeAttribute("ondrop");
            slot.ondragover = null;
            slot.ondrop = null;
        });
    }

    function removeDragGhost() {
        if (!dragGhost) return;
        dragGhost.remove();
        dragGhost = null;
    }

    function updateDragGhost(event) {
        if (!dragGhost) return;
        dragGhost.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0) translate(-50%, -50%)`;
    }

    function createDragGhost(source, event, visible = false) {
        removeDragGhost();
        if (!source) return;
        const rect = source.getBoundingClientRect();
        const ghost = document.createElement("div");
        const icon = source.querySelector(".nvi-item__icon") || source.querySelector(".nvi-item__text-icon");
        ghost.className = "nvi-item nvimp-drag-ghost";
        ghost.setAttribute("draggable", "false");
        ghost.style.width = `${Math.max(42, rect.width)}px`;
        ghost.style.height = `${Math.max(42, rect.height)}px`;
        ghost.style.opacity = visible ? "0.98" : "0";
        ghost.innerHTML = icon ? icon.innerHTML : source.innerHTML;
        document.body.appendChild(ghost);
        dragGhost = ghost;
        if (visible) ghost.classList.add("is-visible");
        updateDragGhost(event);
    }

    function showDragGhost(event) {
        if (!dragGhost && dragState?.item) createDragGhost(dragState.item, event, true);
        if (!dragGhost) return;
        dragGhost.classList.add("is-visible");
        dragGhost.style.opacity = "0.98";
        updateDragGhost(event);
    }

    function finishDrag(event) {
        clearLongPressTimer();
        if (!dragState) return;
        const state = dragState;
        dragState = null;
        if (!state.dragging) {
            removeDragGhost();
            clearDragVisuals();
            if (longPressBlockedClick) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                suppressClickUntil = Date.now() + LONG_PRESS_SUPPRESS_MS;
                clearStaleLongPressSelection(state.item);
                setTimeout(() => { longPressBlockedClick = false; }, LONG_PRESS_SUPPRESS_MS);
            }
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        suppressClickUntil = Date.now() + SYNTHETIC_CLICK_SUPPRESS_MS;

        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".nvi-slot");
        if (target && state.grid.contains(target)) {
            const slot = slotNo(target);
            if (moveData(state.id, slot, true)) {
                moveDom(state.id, slot);
                applyPagedInventory();
            }
        }
        removeDragGhost();
        clearDragVisuals();
    }

    function installDirectDrag() {
        if (window.__NVIMP_DIRECT_DRAG) return;
        window.__NVIMP_DIRECT_DRAG = true;

        document.addEventListener("contextmenu", event => {
            if (Game?.ui?.vueActive !== "inventaire") return;
            const item = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
            if (!item) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            longPressBlockedClick = true;
            suppressClickUntil = Date.now() + LONG_PRESS_SUPPRESS_MS;
            clearLongPressTimer();
            clearStaleLongPressSelection(item);
        }, true);

        document.addEventListener("dragstart", event => {
            if (Game?.ui?.vueActive !== "inventaire") return;
            if (!event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item")) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }, true);

        document.addEventListener("pointerdown", event => {
            if (Game?.ui?.vueActive !== "inventaire") return;
            if (event.button !== undefined && event.button !== 0) return;
            const item = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
            if (!item) return;
            const grid = item.closest(".nvi-grid--inventory");
            if (!grid) return;
            longPressBlockedClick = false;
            suppressClickUntil = 0;
            neutralizeNativeDragTargets(grid);
            dragState = { id: item.dataset.nviItemId, item, grid, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
            scheduleLongPressNeutralize(item, event.pointerId);
            createDragGhost(item, event, false);
            try { item.setPointerCapture(event.pointerId); } catch (_) {}
        }, true);

        document.addEventListener("pointermove", event => {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            const dx = event.clientX - dragState.x;
            const dy = event.clientY - dragState.y;
            if (!dragState.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                dragState.dragging = true;
                longPressBlockedClick = false;
                clearLongPressTimer();
                suppressClickUntil = Date.now() + SYNTHETIC_CLICK_SUPPRESS_MS;
                clearDragVisuals();
                dragState.item.classList.add("nvimp-moving");
                dragState.grid.querySelectorAll(".nvi-slot").forEach(slot => { if (slot.style.display !== "none") slot.classList.add("nvimp-touch-target"); });
            }
            if (dragState.dragging) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                showDragGhost(event);
            }
        }, true);

        document.addEventListener("pointerup", event => {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            try { dragState.item.releasePointerCapture(event.pointerId); } catch (_) {}
            finishDrag(event);
        }, true);

        document.addEventListener("pointercancel", event => {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            dragState = null;
            longPressBlockedClick = false;
            clearLongPressTimer();
            removeDragGhost();
            clearDragVisuals();
        }, true);

        document.addEventListener("click", event => {
            const item = event.target?.closest?.(".nvi-layout--inventory .nvi-item");
            if (!item) return;
            if (Date.now() > suppressClickUntil && !longPressBlockedClick) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            clearStaleLongPressSelection(item);
            longPressBlockedClick = false;
        }, true);
    }

    function removeEmptyDetailsCard() {
        const layout = document.querySelector(".nvi-layout--inventory");
        if (!layout) return;
        layout.querySelector(":scope > .nvi-details:has(.nvi-details__empty)")?.remove();
        const active = layout.querySelector(":scope > .nvi-details:not(:has(.nvi-details__empty))");
        layout.classList.toggle("nvimp-no-details", !active);
    }

    function ensureGoldFooter() {
        document.querySelectorAll(".nvi-window .nvi-panel").forEach(panel => {
            const grid = panel.querySelector(":scope > .nvi-grid");
            if (!grid) return;
            let footer = panel.querySelector(":scope > .nvimp-grid-footer");
            if (!footer) {
                footer = document.createElement("div");
                footer.className = "nvimp-grid-footer";
                footer.innerHTML = `<span class="nvimp-gold"></span>`;
                grid.after(footer);
            }
            const gold = Number(Game?.data?.personnage?.or || 0);
            footer.querySelector(".nvimp-gold").textContent = `Or : ${gold}`;
        });
    }

    function enhancePopupPager(pageCount, page) {
        const details = document.querySelector(".nvi-layout--inventory > .nvi-details:not(:has(.nvi-details__empty))");
        if (!details) return;
        details.querySelector(".nvimp-popup-pager")?.remove();
        details.appendChild(buildPager(pageCount, page, "move"));
    }

    function applyPagedInventory() {
        injectStyle();
        installLegacyInventoryGuards();
        if (Game?.ui?.vueActive !== "inventaire") return;
        suppressObserver = true;
        try {
            enhanceToolbar();
            removeEmptyDetailsCard();
            const grid = document.querySelector(".nvi-layout--inventory .nvi-grid--inventory");
            if (!grid) return;
            const { pageCount, page } = applyPager(grid);
            neutralizeNativeDragTargets(grid);
            ensureGoldFooter();
            enhancePopupPager(pageCount, page);
            installPopupActions();
            installDirectDrag();
            installPopupPagerActions();
            installOutsidePopupClose();
        } finally {
            requestAnimationFrame(() => { suppressObserver = false; });
        }
    }

    function scheduleApply() {
        if (suppressObserver || applyPending) return;
        applyPending = true;
        requestAnimationFrame(() => { applyPending = false; applyPagedInventory(); });
    }

    function observe() {
        if (observer) return;
        const root = document.getElementById("vuePrincipale");
        if (!root) return;
        observer = new MutationObserver(scheduleApply);
        observer.observe(root, { childList: true, subtree: true });
    }

    function install() {
        injectStyle();
        installLegacyInventoryGuards();
        installPopupActions();
        installPopupPagerActions();
        installOutsidePopupClose();
        installDirectDrag();
        observe();
        scheduleApply();
        setTimeout(() => { observe(); installLegacyInventoryGuards(); scheduleApply(); }, 250);
    }

    window.NVIMP_setPage = setPage;
    window.NVIMP_applyPagedInventory = applyPagedInventory;
    window.NVIMP_moveSelectedToPage = moveSelectedToPage;
    window.NVIMP_closeInventoryPopup = closeInventoryPopup;
    window.NVIPR_applyPopupRework = applyPagedInventory;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();