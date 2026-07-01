/* NightVenture — Inventory Interaction UI
   Public entrypoint for inventory popup, pagination, direct drag and item actions.
   Backend temporaire restant : Inventory_Mobile_Paged.js pour pagination, drag/drop et rendu popup. */
(function () {
    "use strict";

    const ENTRY_VERSION = "v0.9.9.23-interaction-integrated-instance";
    const BRIDGE_VERSION = "v0.9.9.23-instance-metadata-integrated";
    const ACTIONS_VERSION = "v0.9.9.23-instance-actions-integrated";
    const BACKEND_SRC = "Inventory_Mobile_Paged.js";
    const BACKEND_ID = "nvInventoryInteractionBackend";
    const MOVE_CLICK_SUPPRESS_MS = 240;
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

    function extractMeta(button) {
        if (!button) return null;
        return {
            id: button.dataset.nviItemId || "",
            key: button.dataset.nviItemKey || "",
            slot: button.closest(".nvi-slot")?.dataset?.slot || button.dataset.nviItemSlot || ""
        };
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
        if (typeof window.NVIMP_closeInventoryPopup === "function") window.NVIMP_closeInventoryPopup();
        else livePopup()?.remove();
    }

    function redrawInventory() {
        if (typeof window.NVI_redessinerVueActive === "function") window.NVI_redessinerVueActive();
        else if (typeof window.NVIMP_applyPagedInventory === "function") window.NVIMP_applyPagedInventory();
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
        const start = Math.max(0, Number(page) || 0) * 30;
        for (let slot = start; slot < start + 30; slot++) {
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

    function installInstanceActions() {
        window.NVI_INSTANCE_ACTIONS_VERSION = ACTIONS_VERSION;
        if (window.__NVI_INSTANCE_ACTIONS) return;
        window.__NVI_INSTANCE_ACTIONS = true;
        window.addEventListener("pointerdown", handleInstanceActions, true);
        window.addEventListener("click", handleInstanceActions, true);
    }

    function installIntegratedInstanceLayer() {
        installMetadataBridge();
        installInstanceActions();
    }

    function dispatchReady() {
        installIntegratedInstanceLayer();
        window.dispatchEvent(new CustomEvent("nv:inventory-interaction-ready", {
            detail: {
                version: ENTRY_VERSION,
                backend: BACKEND_SRC,
                bridge: "integrated",
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
