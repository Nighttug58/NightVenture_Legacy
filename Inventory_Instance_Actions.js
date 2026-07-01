/* NightVenture — Instance-aware inventory popup actions */
(function () {
    "use strict";

    const VERSION = "v0.9.9.20-instance-actions-equip";
    const MOVE_CLICK_SUPPRESS_MS = 240;
    const DUPLICATE_UNSAFE_ACTIONS = new Set([]);
    const duplicateWarnings = new Set();
    let suppressMoveClickUntil = 0;

    function inv() { return Array.isArray(window.Game?.data?.personnage?.inventaire) ? window.Game.data.personnage.inventaire : []; }
    function key(item) { return String(item?.uid || item?.instanceId || item?.id || ""); }
    function slotOf(item) { const n = Number(item?.slot); return Number.isInteger(n) && n >= 0 ? n : -1; }
    function objectData(id) { return typeof window.trouverObjet === "function" ? window.trouverObjet(id) : window.Game?.cache?.objetsParId?.[id] || null; }
    function objectName(id) { return objectData(id)?.nom || id; }
    function journal(message) { if (typeof window.ajouterJournal === "function") window.ajouterJournal(message); }
    function autosave(reason) { if (typeof window.NV_demanderAutosave === "function") window.NV_demanderAutosave(reason); }

    function popup() { return document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup[data-nvipr-item-id]"); }
    function slotNode(slot) { return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot")).find(node => Number(node.dataset.slot) === Number(slot)) || null; }
    function itemNodeByKey(itemKey) { return document.querySelector(`.nvi-layout--inventory .nvi-item[data-nvi-item-key="${CSS.escape(itemKey)}"]`); }

    function duplicateCount(id) {
        if (!id) return 0;
        return inv().filter(entry => entry?.id === id).length;
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
        else popup()?.remove();
    }

    function redrawInventory() {
        if (typeof window.NVI_redessinerVueActive === "function") window.NVI_redessinerVueActive();
        else if (typeof window.NVIMP_applyPagedInventory === "function") window.NVIMP_applyPagedInventory();
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

    function handleLock(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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

    function handleDeleteConfirm(event) {
        const resolved = resolvePopupItem();
        if (!resolved) return false;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

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
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
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

    function intercept(event) {
        if (window.Game?.ui?.vueActive !== "inventaire") return;
        const actionButton = event.target?.closest?.(".nvi-details.nvipr-popup [data-nvipr-action]");
        if (actionButton) {
            const action = actionButton.dataset.nviprAction;
            if (action === "lock") handleLock(event);
            else if (action === "delete-confirm") handleDeleteConfirm(event);
            else if (action === "use") handleUse(event);
            else if (action === "equip" || action === "equip-ring1" || action === "equip-ring2") handleEquip(event, action);
            else handleDuplicateUnsafeAction(event, action);
            return;
        }
        const pageButton = event.target?.closest?.(".nvi-details.nvipr-popup .nvimp-popup-pager .nvimp-page-btn[data-nvimp-mode='move']");
        if (pageButton) handleMovePage(event, pageButton);
    }

    function install() {
        if (window.__NVI_INSTANCE_ACTIONS) return;
        window.__NVI_INSTANCE_ACTIONS = true;
        window.NVI_INSTANCE_ACTIONS_VERSION = VERSION;
        window.addEventListener("pointerdown", intercept, true);
        window.addEventListener("click", intercept, true);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();