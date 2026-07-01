/* NightVenture — mouvement direct inventaire */
(function () {
    "use strict";

    let state = null;
    let blockClickUntil = 0;

    function inv() { return Game?.data?.personnage?.inventaire || []; }
    function key(item) { return String(item?.uid || item?.instanceId || item?.id || ""); }
    function slotNo(slot) { const n = Number(slot?.dataset?.slot); return Number.isInteger(n) ? n : -1; }
    function itemData(id) { return inv().find(item => item.id === id) || null; }

    function saveSlot(item, slot) {
        if (!item || slot < 0) return;
        item.slot = slot;
        Game.data.personnage.inventaireSlots ??= {};
        Game.data.personnage.inventaireSlots[key(item)] = slot;
    }

    function moveData(id, targetSlot) {
        const item = itemData(id);
        if (!item || targetSlot < 0) return false;
        const sourceSlot = Number(item.slot);
        const other = inv().find(entry => entry !== item && Number(entry.slot) === targetSlot);
        if (other && Number.isInteger(sourceSlot) && sourceSlot >= 0) saveSlot(other, sourceSlot);
        saveSlot(item, targetSlot);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory direct move");
        return true;
    }

    function findItemNode(id) {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-item[data-nvi-item-id]"))
            .find(node => node.dataset.nviItemId === id) || null;
    }

    function findSlotNode(slot) {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot"))
            .find(node => slotNo(node) === slot) || null;
    }

    function moveDom(id, targetSlot) {
        const item = findItemNode(id);
        const target = findSlotNode(targetSlot);
        if (!item || !target) return;
        const source = item.closest(".nvi-slot");
        const other = target.querySelector(".nvi-item[data-nvi-item-id]");
        if (other && source && other !== item) source.appendChild(other);
        target.appendChild(item);
        [source, target].forEach(slot => {
            if (!slot) return;
            slot.classList.toggle("nvi-slot--occupied", Boolean(slot.querySelector(".nvi-item")));
            slot.classList.toggle("nvi-slot--locked", Boolean(slot.querySelector(".nvi-item--locked")));
        });
    }

    function clearVisuals() {
        document.querySelectorAll(".nvimp-touch-target").forEach(node => node.classList.remove("nvimp-touch-target"));
        document.querySelectorAll(".nvimp-moving").forEach(node => node.classList.remove("nvimp-moving"));
    }

    function down(event) {
        if (Game?.ui?.vueActive !== "inventaire") return;
        if (event.button !== undefined && event.button !== 0) return;
        const item = event.target.closest(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
        if (!item) return;
        const grid = item.closest(".nvi-grid--inventory");
        if (!grid) return;
        state = { id: item.dataset.nviItemId, item, grid, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
        try { item.setPointerCapture(event.pointerId); } catch (_) {}
        event.stopPropagation();
    }

    function move(event) {
        if (!state || state.pointerId !== event.pointerId) return;
        const dx = event.clientX - state.x;
        const dy = event.clientY - state.y;
        if (!state.dragging && Math.hypot(dx, dy) > 8) {
            state.dragging = true;
            blockClickUntil = Date.now() + 900;
            clearVisuals();
            state.item.classList.add("nvimp-moving");
            state.grid.querySelectorAll(".nvi-slot").forEach(slot => {
                if (slot.style.display !== "none") slot.classList.add("nvimp-touch-target");
            });
        }
        if (state.dragging) {
            event.preventDefault();
            event.stopPropagation();
        }
    }

    function up(event) {
        if (!state || state.pointerId !== event.pointerId) return;
        try { state.item.releasePointerCapture(event.pointerId); } catch (_) {}
        const current = state;
        state = null;
        if (!current.dragging) return;
        event.preventDefault();
        event.stopPropagation();
        blockClickUntil = Date.now() + 900;
        const node = document.elementFromPoint(event.clientX, event.clientY);
        const slot = node?.closest?.(".nvi-slot");
        if (slot && current.grid.contains(slot)) {
            const target = slotNo(slot);
            if (moveData(current.id, target)) moveDom(current.id, target);
            if (typeof window.NVIMP_applyPagedInventory === "function") requestAnimationFrame(window.NVIMP_applyPagedInventory);
        }
        clearVisuals();
    }

    function cancel(event) {
        if (!state || state.pointerId !== event.pointerId) return;
        state = null;
        clearVisuals();
    }

    function click(event) {
        if (Date.now() > blockClickUntil) return;
        if (!event.target.closest(".nvi-layout--inventory .nvi-item")) return;
        event.preventDefault();
        event.stopPropagation();
    }

    function install() {
        if (window.__NVIDM_INSTALLED) return;
        window.__NVIDM_INSTALLED = true;
        document.addEventListener("pointerdown", down, true);
        document.addEventListener("pointermove", move, true);
        document.addEventListener("pointerup", up, true);
        document.addEventListener("pointercancel", cancel, true);
        document.addEventListener("click", click, true);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
