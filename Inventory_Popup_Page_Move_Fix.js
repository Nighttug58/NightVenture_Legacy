/* NightVenture — déplacement page depuis popup inventaire */
(function () {
    "use strict";

    const SLOTS_PER_PAGE = 30;
    let lastHandledAt = 0;

    function inventory() {
        return Game?.data?.personnage?.inventaire || [];
    }

    function itemKey(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function findItem(idObjet) {
        return inventory().find(item => item.id === idObjet) || null;
    }

    function persistSlot(item, slot) {
        if (!item) return;
        const corrected = Number(slot);
        if (!Number.isInteger(corrected) || corrected < 0) return;
        item.slot = corrected;
        Game.data.personnage.inventaireSlots ??= {};
        Game.data.personnage.inventaireSlots[itemKey(item)] = corrected;
    }

    function firstSlotOfPage(page) {
        return Math.max(0, Number(page) || 0) * SLOTS_PER_PAGE;
    }

    function cssEscape(value) {
        if (typeof CSS !== "undefined" && CSS.escape) return CSS.escape(String(value));
        return String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"");
    }

    function domSlotOccupied(slot, ignoredId) {
        const target = document.querySelector(`.nvi-layout--inventory .nvi-grid--inventory .nvi-slot[data-slot="${cssEscape(slot)}"]`);
        const occupant = target?.querySelector(".nvi-item[data-nvi-item-id]");
        if (!occupant) return false;
        return occupant.dataset.nviItemId !== ignoredId;
    }

    function dataSlotOccupied(slot, ignoredId) {
        return inventory().some(item => {
            if (item.id === ignoredId) return false;
            return Number(item.slot) === Number(slot);
        });
    }

    function firstFreeSlotInPage(page, ignoredId) {
        const start = firstSlotOfPage(page);
        for (let slot = start; slot < start + SLOTS_PER_PAGE; slot++) {
            if (!dataSlotOccupied(slot, ignoredId) && !domSlotOccupied(slot, ignoredId)) return slot;
        }
        return start + SLOTS_PER_PAGE - 1;
    }

    function moveItemData(idObjet, targetSlot) {
        const item = findItem(idObjet);
        if (!item) return false;

        const target = Number(targetSlot);
        if (!Number.isInteger(target) || target < 0) return false;

        if (dataSlotOccupied(target, idObjet)) {
            return false;
        }

        persistSlot(item, target);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("popup page move");
        return true;
    }

    function moveItemDom(idObjet, targetSlot) {
        const item = document.querySelector(`.nvi-layout--inventory .nvi-item[data-nvi-item-id="${cssEscape(idObjet)}"]`);
        const target = document.querySelector(`.nvi-layout--inventory .nvi-grid--inventory .nvi-slot[data-slot="${cssEscape(targetSlot)}"]`);
        if (!item || !target) return false;

        const source = item.closest(".nvi-slot");
        const occupant = target.querySelector(".nvi-item[data-nvi-item-id]");
        if (occupant && occupant.dataset.nviItemId !== idObjet) return false;

        target.appendChild(item);

        [source, target].forEach(slot => {
            if (!slot) return;
            slot.classList.toggle("nvi-slot--occupied", Boolean(slot.querySelector(".nvi-item")));
            slot.classList.toggle("nvi-slot--locked", Boolean(slot.querySelector(".nvi-item--locked")));
        });
        return true;
    }

    function itemIdFromPopup(button) {
        const details = button.closest(".nvi-details[data-nvipr-item-id]");
        if (details?.dataset?.nviprItemId) return details.dataset.nviprItemId;

        const live = document.querySelector(".nvi-layout--inventory > .nvi-details[data-nvipr-item-id]");
        if (live?.dataset?.nviprItemId) return live.dataset.nviprItemId;

        const selected = document.querySelector(".nvi-layout--inventory .nvi-item--selected[data-nvi-item-id]");
        return selected?.dataset?.nviItemId || null;
    }

    function pageFromButton(button) {
        const explicit = Number(button.dataset.nvimpPage);
        if (Number.isInteger(explicit) && explicit >= 0) return explicit;
        const buttons = Array.from(button.parentElement?.querySelectorAll(".nvimp-page-btn") || []);
        return buttons.indexOf(button);
    }

    function movePopupItemToPage(page, forcedId) {
        const idObjet = forcedId || itemIdFromPopup(document.activeElement);
        if (!idObjet || page < 0) return false;

        let targetSlot = firstFreeSlotInPage(page, idObjet);
        if (!moveItemData(idObjet, targetSlot)) {
            targetSlot = firstFreeSlotInPage(page, idObjet);
            if (!moveItemData(idObjet, targetSlot)) return false;
        }

        Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        if (!moveItemDom(idObjet, targetSlot)) {
            if (typeof window.NVIMP_applyPagedInventory === "function") requestAnimationFrame(window.NVIMP_applyPagedInventory);
        }

        const details = document.querySelector(".nvi-layout--inventory > .nvi-details[data-nvipr-item-id]");
        if (details) details.dataset.nviprItemId = idObjet;

        if (typeof window.NVIMP_applyPagedInventory === "function") {
            requestAnimationFrame(window.NVIMP_applyPagedInventory);
        }
        return true;
    }

    function handlePageButton(event) {
        if (Game?.ui?.vueActive !== "inventaire") return;
        const button = event.target?.closest?.(".nvimp-popup-pager .nvimp-page-btn");
        if (!button) return;

        if (event.type === "click" && Date.now() - lastHandledAt < 550) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return;
        }

        const page = pageFromButton(button);
        const idObjet = itemIdFromPopup(button);
        if (!idObjet || page < 0) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        lastHandledAt = Date.now();
        movePopupItemToPage(page, idObjet);
    }

    function install() {
        if (window.__NVIPM_PAGE_MOVE_FIX) return;
        window.__NVIPM_PAGE_MOVE_FIX = true;
        document.addEventListener("pointerdown", handlePageButton, true);
        document.addEventListener("click", handlePageButton, true);
    }

    window.NVIMP_movePopupItemToPageHard = movePopupItemToPage;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
