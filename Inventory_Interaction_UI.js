/* NightVenture — Inventory Interaction UI
   Public entrypoint for inventory popup, pagination, direct drag and item actions.
   Backend temporaire restant : Inventory_Mobile_Paged.js pour pagination et drag/drop. */
(function () {
    "use strict";

    const ENTRY_VERSION = "v0.9.9.26-interaction-popup-renderer";
    const BRIDGE_VERSION = "v0.9.9.26-instance-metadata-integrated";
    const ACTIONS_VERSION = "v0.9.9.26-instance-actions-integrated";
    const POPUP_VERSION = "v0.9.9.26-popup-renderer-integrated";
    const BACKEND_SRC = "Inventory_Mobile_Paged.js";
    const BACKEND_ID = "nvInventoryInteractionBackend";
    const SLOTS_PER_PAGE = 30;
    const MOVE_CLICK_SUPPRESS_MS = 240;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    const DUPLICATE_UNSAFE_ACTIONS = new Set([]);

    let lastClickedMeta = null;
    let suppressMoveClickUntil = 0;
    const duplicateWarnings = new Set();

    if (window.__NVI_INTERACTION_ENTRYPOINT_LOADED) return;
    window.__NVI_INTERACTION_ENTRYPOINT_LOADED = true;

    window.NVI_INTERACTION_VERSION = ENTRY_VERSION;
    window.NVI_INTERACTION_BACKEND_SRC = BACKEND_SRC;
    window.NVI_INTERACTION_BRIDGE_SRC = "integrated";
    window.NVI_INTERACTION_ACTIONS_SRC = "integrated";
    window.NVI_INTERACTION_POPUP_SRC = "integrated";
    window.__NVIMP_POPUP_ACTIONS = true;
    window.__NVIMP_POPUP_PAGER_ACTIONS = true;

    function backendReady() {
        return typeof window.NVIMP_applyPagedInventory === "function" || typeof window.NVIPR_applyPopupRework === "function";
    }

    function existingBackendScript() {
        return document.getElementById(BACKEND_ID) || document.querySelector(`script[src="${BACKEND_SRC}"]`);
    }

    function inv() {
        return Array.isArray(window.Game?.data?.personnage?.inventaire) ? window.Game.data.personnage.inventaire : [];
    }

    function key(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function slotOf(item) {
        const slot = Number(item?.slot);
        return Number.isInteger(slot) && slot >= 0 ? slot : -1;
    }

    function css(value) {
        const raw = String(value ?? "");
        return window.CSS?.escape ? CSS.escape(raw) : raw.replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function objectData(id) {
        return typeof window.trouverObjet === "function" ? window.trouverObjet(id) : window.Game?.cache?.objetsParId?.[id] || null;
    }

    function objectName(id) {
        return objectData(id)?.nom || id;
    }

    function objectIcon(obj) {
        if (obj?.image) return `<img src="${escapeHtml(obj.image)}" alt="${escapeHtml(obj.nom || "Objet")}">`;
        return `<span class="nvi-item__text-icon">OBJ</span>`;
    }

    function objectDetails(obj) {
        if (!obj) return "";
        if (typeof window.creerDetailsObjetInventaire === "function") return window.creerDetailsObjetInventaire(obj);
        if (typeof window.creerDetailsObjet === "function") return window.creerDetailsObjet(obj);
        const stats = [
            ["ATK", "attaque"], ["DEF", "defense"], ["ATK MAGIC", "attaqueMagique"], ["DEF MAGIC", "defenseMagique"],
            ["PV", "pvMax"], ["MANA", "manaMax"], ["STAMINA", "staminaMax"],
            ["FOR", "force"], ["DEX", "dexterite"], ["INT", "intelligence"], ["VIT", "vitalite"], ["LUCK", "chance"]
        ];
        return stats.filter(([, stat]) => obj[stat]).map(([label, stat]) => `${label} +${obj[stat]}`).join(" ");
    }

    function journal(message) {
        if (typeof window.ajouterJournal === "function") window.ajouterJournal(message);
    }

    function autosave(reason) {
        if (typeof window.NV_demanderAutosave === "function") window.NV_demanderAutosave(reason);
    }

    function livePopup() {
        return document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
    }

    function popup() {
        return document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup[data-nvipr-item-id]");
    }

    function inventoryLayout() {
        return document.querySelector(".nvi-layout--inventory");
    }

    function slotNode(slot) {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot"))
            .find(node => Number(node.dataset.slot) === Number(slot)) || null;
    }

    function itemNodeByKey(itemKey) {
        return document.querySelector(`.nvi-layout--inventory .nvi-item[data-nvi-item-key="${css(itemKey)}"]`);
    }

    function itemNodesById(id) {
        return Array.from(document.querySelectorAll(`.nvi-layout--inventory .nvi-item[data-nvi-item-id="${css(id)}"]`));
    }

    function duplicateCount(id) {
        if (!id) return 0;
        return inv().filter(entry => entry?.id === id).length;
    }

    function isFavoriteId(id) {
        return (window.Game?.data?.personnage?.favoris || []).includes(id);
    }

    function isLockedItem(item) {
        if (!item) return false;
        const itemKey = key(item);
        const locks = window.Game?.data?.personnage?.inventaireVerrous || {};
        if (Object.prototype.hasOwnProperty.call(locks, itemKey)) return Boolean(locks[itemKey]);
        return Boolean(item.verrouille || item.locked || item.bloque);
    }

    function label(page) {
        return PAGE_LABELS[page] || String(page + 1);
    }

    function currentPage() {
        window.Game.ui.nvInventairePage ??= 0;
        return Math.max(0, Number(window.Game.ui.nvInventairePage) || 0);
    }

    function pageCount() {
        const slots = Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot"));
        const maxDom = slots.reduce((max, slot) => Math.max(max, Number(slot.dataset.slot) || 0), 0);
        const maxData = inv().reduce((max, item) => Math.max(max, slotOf(item)), 0);
        return Math.max(1, Math.ceil((Math.max(maxDom, maxData) + 1) / SLOTS_PER_PAGE));
    }

    function buildPopupPager() {
        const count = pageCount();
        const active = Math.min(currentPage(), count - 1);
        let html = `<div class="nvimp-popup-pager"><span class="nvimp-popup-pager__label">Déplacer l'objet vers page</span>`;
        for (let page = 0; page < count; page++) {
            html += `<button type="button" class="nvimp-page-btn${page === active ? " is-active" : ""}" data-nvimp-page="${page}" data-nvimp-mode="move">${label(page)}</button>`;
        }
        return html + `</div>`;
    }

    function clearInventorySelectionClasses(root = document) {
        root.querySelectorAll(".nvi-layout--inventory .nvi-item--selected, .nvi-layout--inventory .nvimp-item--popup-open")
            .forEach(item => item.classList.remove("nvi-item--selected", "nvimp-item--popup-open"));
    }

    function extractMeta(button) {
        if (!button) return null;
        return {
            id: button.dataset.nviItemId || "",
            key: button.dataset.nviItemKey || "",
            slot: button.closest(".nvi-slot")?.dataset?.slot || button.dataset.nviItemSlot || ""
        };
    }

    function resolveItemFromMeta(meta) {
        if (!meta) return null;
        let item = meta.key ? inv().find(entry => key(entry) === meta.key) : null;
        const slot = Number(meta.slot);
        if (!item && Number.isInteger(slot) && slot >= 0) item = inv().find(entry => entry.id === meta.id && slotOf(entry) === slot);
        if (!item) item = inv().find(entry => entry.id === meta.id) || null;
        return item;
    }

    function attachMetaToPopup() {
        const box = livePopup();
        if (!box || !lastClickedMeta) return;
        if (box.dataset.nviprItemId && box.dataset.nviprItemId !== lastClickedMeta.id) return;
        box.dataset.nviprItemKey = lastClickedMeta.key;
        box.dataset.nviprSlot = lastClickedMeta.slot;
    }

    function resolvePopupItem() {
        const box = popup();
        if (!box) return null;
        const id = box.dataset.nviprItemId || "";
        const itemKey = box.dataset.nviprItemKey || "";
        const slot = Number(box.dataset.nviprSlot);
        let item = itemKey ? inv().find(entry => key(entry) === itemKey) : null;
        if (!item && Number.isInteger(slot) && slot >= 0) item = inv().find(entry => entry.id === id && slotOf(entry) === slot);
        if (!item) item = inv().find(entry => entry.id === id) || null;
        return item ? { box, id: item.id, key: key(item), slot: slotOf(item), item } : null;
    }

    function closePopup() {
        clearInventorySelectionClasses();
        livePopup()?.remove();
        inventoryLayout()?.classList.add("nvimp-no-details");
    }

    function redrawInventory() {
        if (typeof window.NVI_redessinerVueActive === "function") window.NVI_redessinerVueActive();
        else if (typeof window.NVIMP_applyPagedInventory === "function") window.NVIMP_applyPagedInventory();
    }

    function renderInventoryPopupFromButton(button) {
        const layout = inventoryLayout();
        const meta = extractMeta(button);
        const item = resolveItemFromMeta(meta);
        const obj = item ? objectData(item.id) : null;
        if (!layout || !item || !obj) return false;

        lastClickedMeta = { id: item.id, key: key(item), slot: String(slotOf(item)) };
        clearInventorySelectionClasses();
        button.classList.add("nvimp-item--popup-open");

        let box = livePopup() || document.createElement("aside");
        if (!box.parentElement) layout.appendChild(box);

        const rarete = obj.rarete || "commun";
        const qty = Number(item.quantite || 1);
        const stats = objectDetails(obj);
        const favorite = isFavoriteId(item.id);
        const locked = isLockedItem(item);

        box.className = "nvi-details nvimp-details-popup nvipr-popup";
        box.dataset.nviprItemId = item.id;
        box.dataset.nviprItemKey = key(item);
        box.dataset.nviprSlot = String(slotOf(item));
        box.innerHTML = `
            <button type="button" class="nvimp-popup-close">×</button>
            <div class="nvi-details__header">
                <div class="nvi-details__icon nvi-item--${escapeHtml(rarete)}">${objectIcon(obj)}</div>
                <div>
                    <h3 class="${escapeHtml(rarete)}">${escapeHtml(obj.nom || item.id)}</h3>
                    <p data-nvipr-meta="1"><span class="nvipr-meta-line">${escapeHtml(obj.type || "divers")} · ${escapeHtml(obj.rarete || "commun")}</span><span class="nvipr-meta-line">Quantité : ${qty}</span></p>
                </div>
            </div>
            ${stats ? `<p class="nvi-details__stats">${stats}</p>` : ""}
            <p class="nvi-details__description">${escapeHtml(obj.description || "Aucune description.")}</p>
            <div class="nvi-details__actions">
                ${obj.type === "consommable" ? `<button type="button" data-nvipr-action="use" data-nvipr-id="${escapeHtml(item.id)}">Utiliser</button>` : obj.type === "bague" ? `<button type="button" data-nvipr-action="equip-ring1" data-nvipr-id="${escapeHtml(item.id)}">Anneau I</button><button type="button" data-nvipr-action="equip-ring2" data-nvipr-id="${escapeHtml(item.id)}">Anneau II</button>` : `<button type="button" data-nvipr-action="equip" data-nvipr-id="${escapeHtml(item.id)}">Équiper</button>`}
            </div>
            <div class="nvipr-secondary-row">
                <button type="button" class="nvipr-secondary-action" data-nvipr-action="favorite" data-nvipr-id="${escapeHtml(item.id)}">${favorite ? "Retirer favori" : "Ajouter favori"}</button>
                <button type="button" class="nvi-lock-toggle ${locked ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" data-nvipr-action="lock" data-nvipr-id="${escapeHtml(item.id)}"><span class="nvi-lock-toggle__text">${locked ? "Bloqué" : "Libre"}</span></button>
            </div>
            <button type="button" class="nvi-danger" data-nvipr-action="delete-open" data-nvipr-id="${escapeHtml(item.id)}">Jeter l'objet</button>
            ${buildPopupPager()}
        `;
        layout.classList.remove("nvimp-no-details");
        return true;
    }

    function refreshFavoriteVisual(id, active) {
        itemNodesById(id).forEach(node => {
            let badge = node.querySelector(".nvi-item__favorite");
            if (active && !badge) {
                badge = document.createElement("span");
                badge.className = "nvi-item__favorite";
                badge.textContent = "Favori";
                node.prepend(badge);
            } else if (!active && badge) badge.remove();
        });
        const box = popup();
        if (box?.dataset?.nviprItemId === id) {
            const button = box.querySelector("[data-nvipr-action='favorite']");
            if (button) button.textContent = active ? "Retirer favori" : "Ajouter favori";
        }
    }

    function refreshPopupLockText(box, locked) {
        const button = box?.querySelector?.("[data-nvipr-action='lock']");
        if (!button) return;
        button.classList.toggle("nvi-lock-toggle--locked", locked);
        button.classList.toggle("nvi-lock-toggle--unlocked", !locked);
        const text = button.querySelector(".nvi-lock-toggle__text");
        if (text) text.textContent = locked ? "Bloqué" : "Libre";
    }

    function refreshItemVisual(itemKey, locked) {
        const node = itemNodeByKey(itemKey);
        if (!node) return;
        node.classList.toggle("nvi-item--locked", locked);
        const slot = node.closest(".nvi-slot");
        if (slot) slot.classList.toggle("nvi-slot--locked", locked);
        let badge = node.querySelector(".nvi-item__lock");
        if (locked && !badge) {
            badge = document.createElement("span");
            badge.className = "nvi-item__lock";
            badge.textContent = "Lock";
            node.prepend(badge);
        } else if (!locked && badge) badge.remove();
    }

    function renderDeleteConfirm(box, id) {
        const existing = box?.querySelector?.(".nvi-danger, .nvi-delete-confirm");
        if (!existing) return false;
        const confirm = document.createElement("div");
        confirm.className = "nvi-delete-confirm";
        confirm.innerHTML = `<span>Supprimer toute la pile ?</span><button type="button" data-nvipr-action="delete-confirm" data-nvipr-id="${escapeHtml(id)}">Confirmer</button><button type="button" data-nvipr-action="delete-cancel" data-nvipr-id="${escapeHtml(id)}">Annuler</button>`;
        existing.replaceWith(confirm);
        return true;
    }

    function renderDeleteButton(box, id) {
        const existing = box?.querySelector?.(".nvi-delete-confirm");
        if (!existing) return false;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nvi-danger";
        button.dataset.nviprAction = "delete-open";
        button.dataset.nviprId = id;
        button.textContent = "Jeter l'objet";
        existing.replaceWith(button);
        return true;
    }

    function removeExactItem(resolved) {
        window.Game.data.personnage.inventaire = inv().filter(entry => entry !== resolved.item);
        if (window.Game.data.personnage.inventaireSlots) delete window.Game.data.personnage.inventaireSlots[resolved.key];
        if (window.Game.data.personnage.inventaireVerrous) delete window.Game.data.personnage.inventaireVerrous[resolved.key];
        const hasSameId = inv().some(entry => entry.id === resolved.id);
        if (!hasSameId) window.Game.data.personnage.favoris = (window.Game.data.personnage.favoris || []).filter(entry => entry !== resolved.id);
    }

    function consumeOneFromExactStack(resolved) {
        const qty = Number(resolved.item.quantite || 1);
        if (qty > 1) {
            resolved.item.quantite = qty - 1;
            return false;
        }
        removeExactItem(resolved);
        return true;
    }

    function refreshAfterCharacterChange(reason) {
        if (typeof window.corrigerRessources === "function") window.corrigerRessources();
        autosave(reason);
        closePopup();
        redrawInventory();
        if (typeof window.afficherPersonnage === "function") window.afficherPersonnage();
        if (typeof window.afficherJournal === "function") window.afficherJournal();
    }

    function stopActionEvent(event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    function handleClose(event) {
        stopActionEvent(event);
        closePopup();
        return true;
    }

    function handleFavorite(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        stopActionEvent(event);
        window.Game.data.personnage.favoris ??= [];
        const active = !isFavoriteId(resolved.id);
        if (active) window.Game.data.personnage.favoris.push(resolved.id);
        else window.Game.data.personnage.favoris = window.Game.data.personnage.favoris.filter(entry => entry !== resolved.id);
        refreshFavoriteVisual(resolved.id, active);
        journal(active ? `${objectName(resolved.id)} ajouté aux favoris.` : `${objectName(resolved.id)} retiré des favoris.`);
        autosave("inventory object favorite");
        return true;
    }

    function handleLock(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        stopActionEvent(event);
        const next = !Boolean(window.Game.data.personnage.inventaireVerrous?.[resolved.key] || resolved.item.verrouille);
        window.Game.data.personnage.inventaireVerrous ??= {};
        window.Game.data.personnage.inventaireVerrous[resolved.key] = next;
        resolved.item.verrouille = next;
        delete resolved.item.locked;
        delete resolved.item.bloque;
        refreshItemVisual(resolved.key, next);
        refreshPopupLockText(resolved.box, next);
        journal(next ? `${objectName(resolved.id)} est bloqué sur sa case.` : `${objectName(resolved.id)} est libre.`);
        autosave("inventory instance lock");
        return true;
    }

    function handleDeleteOpen(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        stopActionEvent(event);
        renderDeleteConfirm(resolved.box, resolved.id);
        return true;
    }

    function handleDeleteCancel(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        stopActionEvent(event);
        renderDeleteButton(resolved.box, resolved.id);
        return true;
    }

    function handleDeleteConfirm(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        stopActionEvent(event);
        const qty = Number(resolved.item.quantite || 1);
        removeExactItem(resolved);
        journal(`${objectName(resolved.id)} x${qty} supprimé de l'inventaire.`);
        autosave("inventory instance delete");
        closePopup();
        redrawInventory();
        return true;
    }

    function handleUse(event) {
        const resolved = resolvePopupItem();
        const obj = resolved ? objectData(resolved.id) : null;
        if (!resolved || !obj || obj.type !== "consommable" || typeof window.appliquerEffetObjet !== "function") return false;
        stopActionEvent(event);
        const applied = window.appliquerEffetObjet(obj);
        if (!applied) {
            if (typeof window.afficherJournal === "function") window.afficherJournal();
            return true;
        }
        consumeOneFromExactStack(resolved);
        refreshAfterCharacterChange("inventory instance use");
        return true;
    }

    function forcedEquipSlot(action, obj) {
        if (action === "equip-ring1") return "bague1";
        if (action === "equip-ring2") return "bague2";
        if (obj?.type === "bague") return "bague1";
        return null;
    }

    function equipmentSlotFor(action, obj) {
        const forced = forcedEquipSlot(action, obj);
        return forced || obj?.type || "";
    }

    function handleEquip(event, action) {
        const resolved = resolvePopupItem();
        const obj = resolved ? objectData(resolved.id) : null;
        const p = window.Game?.data?.personnage;
        if (!resolved || !obj || !p?.equipement) return false;
        const slot = equipmentSlotFor(action, obj);
        if (!slot) return false;
        stopActionEvent(event);

        if (p.niveau < (obj.niveauRequis || 1)) {
            journal(`${obj.nom} nécessite le niveau ${obj.niveauRequis}.`);
            if (typeof window.afficherJournal === "function") window.afficherJournal();
            return true;
        }
        if (!Object.prototype.hasOwnProperty.call(p.equipement, slot)) {
            journal("Cet objet ne peut pas être équipé.");
            if (typeof window.afficherJournal === "function") window.afficherJournal();
            return true;
        }
        if (obj.type !== "bague" && Object.values(p.equipement).includes(resolved.id)) {
            journal(`${obj.nom} est déjà équipé.`);
            if (typeof window.afficherJournal === "function") window.afficherJournal();
            return true;
        }

        const previousId = p.equipement[slot];
        if (previousId) {
            if (typeof window.ajouterObjetInventaire === "function") window.ajouterObjetInventaire(previousId, 1);
            const previousObj = objectData(previousId);
            if (previousObj) journal(`${previousObj.nom} retiré.`);
        }

        consumeOneFromExactStack(resolved);
        p.equipement[slot] = resolved.id;
        journal(`${obj.nom} équipé.`);
        refreshAfterCharacterChange("inventory instance equip");
        return true;
    }

    function handleDuplicateUnsafeAction(event, action) {
        if (!DUPLICATE_UNSAFE_ACTIONS.has(action)) return false;
        const resolved = resolvePopupItem();
        if (!resolved || duplicateCount(resolved.id) <= 1) return false;
        stopActionEvent(event);
        const warnKey = `${action}:${resolved.id}`;
        if (!duplicateWarnings.has(warnKey)) {
            duplicateWarnings.add(warnKey);
            journal(`${objectName(resolved.id)} existe en plusieurs piles : action ${action} bloquée pour éviter de cibler la mauvaise pile.`);
        }
        return true;
    }

    function firstFreeSlotInPage(page, movingItem) {
        const start = Math.max(0, Number(page) || 0) * SLOTS_PER_PAGE;
        for (let slot = start; slot < start + SLOTS_PER_PAGE; slot++) {
            const used = inv().some(entry => entry !== movingItem && slotOf(entry) === slot);
            if (!used) return slot;
        }
        return start;
    }

    function moveDom(itemKey, targetSlot) {
        const node = itemNodeByKey(itemKey);
        const target = slotNode(targetSlot);
        if (!node || !target) return false;
        const source = node.closest(".nvi-slot");
        const other = target.querySelector(".nvi-item[data-nvi-item-key]");
        if (other && source && other !== node) source.appendChild(other);
        target.appendChild(node);
        [source, target].forEach(slot => {
            if (!slot) return;
            slot.classList.toggle("nvi-slot--occupied", Boolean(slot.querySelector(".nvi-item")));
            slot.classList.toggle("nvi-slot--locked", Boolean(slot.querySelector(".nvi-item--locked")));
        });
        node.dataset.nviItemSlot = String(targetSlot);
        return true;
    }

    function handleMovePage(event, button) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        const page = Number(button.dataset.nvimpPage);
        if (!Number.isInteger(page) || page < 0) return false;
        if (event.type === "click" && Date.now() < suppressMoveClickUntil) return true;
        stopActionEvent(event);
        suppressMoveClickUntil = Date.now() + MOVE_CLICK_SUPPRESS_MS;
        const sourceSlot = slotOf(resolved.item);
        const targetSlot = firstFreeSlotInPage(page, resolved.item);
        const other = inv().find(entry => entry !== resolved.item && slotOf(entry) === targetSlot);
        window.Game.data.personnage.inventaireSlots ??= {};
        if (other && sourceSlot >= 0) {
            other.slot = sourceSlot;
            window.Game.data.personnage.inventaireSlots[key(other)] = sourceSlot;
        }
        resolved.item.slot = targetSlot;
        window.Game.data.personnage.inventaireSlots[resolved.key] = targetSlot;
        resolved.box.dataset.nviprSlot = String(targetSlot);
        if (!moveDom(resolved.key, targetSlot)) redrawInventory();
        if (typeof window.NVIMP_applyPagedInventory === "function") window.NVIMP_applyPagedInventory();
        closePopup();
        autosave("inventory instance move page");
        return true;
    }

    function handleItemSelection(event) {
        if (window.Game?.ui?.vueActive !== "inventaire") return;
        const button = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
        if (!button) return;
        stopActionEvent(event);
        renderInventoryPopupFromButton(button);
    }

    function handleInstanceActions(event) {
        if (window.Game?.ui?.vueActive !== "inventaire") return;
        const closeButton = event.target?.closest?.(".nvi-details.nvipr-popup .nvimp-popup-close");
        if (closeButton) {
            handleClose(event);
            return;
        }
        const actionButton = event.target?.closest?.(".nvi-details.nvipr-popup [data-nvipr-action]");
        if (actionButton) {
            const action = actionButton.dataset.nviprAction;
            if (action === "favorite") handleFavorite(event);
            else if (action === "lock") handleLock(event);
            else if (action === "delete-open") handleDeleteOpen(event);
            else if (action === "delete-cancel") handleDeleteCancel(event);
            else if (action === "delete-confirm") handleDeleteConfirm(event);
            else if (action === "use") handleUse(event);
            else if (action === "equip" || action === "equip-ring1" || action === "equip-ring2") handleEquip(event, action);
            else handleDuplicateUnsafeAction(event, action);
            return;
        }
        const pageButton = event.target?.closest?.(".nvi-details.nvipr-popup .nvimp-popup-pager .nvimp-page-btn[data-nvimp-mode='move']");
        if (pageButton) handleMovePage(event, pageButton);
    }

    function installMetadataBridge() {
        window.NVI_INSTANCE_METADATA_BRIDGE_VERSION = BRIDGE_VERSION;
        if (!window.__NVI_INSTANCE_META_CLICK_CAPTURE) {
            window.__NVI_INSTANCE_META_CLICK_CAPTURE = true;
            document.addEventListener("click", event => {
                if (window.Game?.ui?.vueActive !== "inventaire") return;
                const button = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
                if (!button) return;
                lastClickedMeta = extractMeta(button);
                setTimeout(attachMetaToPopup, 0);
                requestAnimationFrame(attachMetaToPopup);
            }, true);
        }

        const root = document.getElementById("vuePrincipale");
        if (root && !window.__NVI_INSTANCE_META_OBSERVER) {
            window.__NVI_INSTANCE_META_OBSERVER = new MutationObserver(attachMetaToPopup);
            window.__NVI_INSTANCE_META_OBSERVER.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "data-nvipr-item-id"] });
        }
        attachMetaToPopup();
    }

    function installPopupRenderer() {
        window.NVI_INTERACTION_POPUP_VERSION = POPUP_VERSION;
        if (window.__NVI_INTERACTION_POPUP_RENDERER) return;
        window.__NVI_INTERACTION_POPUP_RENDERER = true;
        window.addEventListener("click", handleItemSelection, true);
    }

    function installInstanceActions() {
        window.NVI_INSTANCE_ACTIONS_VERSION = ACTIONS_VERSION;
        if (window.__NVI_INSTANCE_ACTIONS) return;
        window.__NVI_INSTANCE_ACTIONS = true;
        window.addEventListener("pointerdown", handleInstanceActions, true);
        window.addEventListener("click", handleInstanceActions, true);
    }

    function installIntegratedInstanceLayer() {
        installMetadataBridge();
        installPopupRenderer();
        installInstanceActions();
    }

    function dispatchReady() {
        installIntegratedInstanceLayer();
        window.dispatchEvent(new CustomEvent("nv:inventory-interaction-ready", {
            detail: {
                version: ENTRY_VERSION,
                backend: BACKEND_SRC,
                bridge: "integrated",
                popup: "integrated",
                actions: "integrated",
                ready: backendReady()
            }
        }));
    }

    if (backendReady()) {
        dispatchReady();
        return;
    }

    const existing = existingBackendScript();
    if (existing) {
        existing.addEventListener("load", dispatchReady, { once: true });
        existing.addEventListener("error", () => console.error(`[NightVenture] Impossible de charger ${BACKEND_SRC}`), { once: true });
        return;
    }

    const script = document.createElement("script");
    script.id = BACKEND_ID;
    script.src = BACKEND_SRC;
    script.async = false;
    script.dataset.nvModule = "inventory-interaction-backend";
    script.dataset.nvTemporaryBackend = "true";
    script.onload = dispatchReady;
    script.onerror = () => console.error(`[NightVenture] Impossible de charger ${BACKEND_SRC}`);

    const current = document.currentScript;
    if (current?.parentNode) current.parentNode.insertBefore(script, current.nextSibling);
    else document.head.appendChild(script);
})();
