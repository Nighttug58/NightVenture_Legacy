/* NightVenture — Inventory paged drag backend
   Compact backend for inventory pagination, direct drag/drop, toolbar mobile state, gold footer and outside popup close.
   Popup rendering/actions are handled by Inventory_Interaction_UI.js. */
(function () {
    "use strict";

    const VERSION = "v0.9.9.27-paged-drag-backend";
    const SLOTS_PER_PAGE = 30;
    const MIN_SLOTS = 120;
    const DRAG_THRESHOLD = 8;
    const SYNTHETIC_CLICK_SUPPRESS_MS = 220;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    let observer = null;
    let applyPending = false;
    let suppressObserver = false;
    let dragState = null;
    let dragGhost = null;
    let suppressClickUntil = 0;

    function hasGame() {
        return typeof window.Game !== "undefined" && window.Game?.data?.personnage && window.Game?.ui;
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

    function slotNo(slot, fallback = -1) {
        const n = Number(slot?.dataset?.slot);
        return Number.isInteger(n) && n >= 0 ? n : fallback;
    }

    function pageStart(page) {
        return Math.max(0, Number(page) || 0) * SLOTS_PER_PAGE;
    }

    function currentPage() {
        if (!hasGame()) return 0;
        window.Game.ui.nvInventairePage ??= 0;
        return Math.max(0, Number(window.Game.ui.nvInventairePage) || 0);
    }

    function label(page) {
        return PAGE_LABELS[page] || String(page + 1);
    }

    function itemByKeyAndSlot(itemKey, sourceSlot = null) {
        const slot = Number(sourceSlot);
        if (itemKey && Number.isInteger(slot) && slot >= 0) {
            const exact = inv().find(item => key(item) === itemKey && slotOf(item) === slot);
            if (exact) return exact;
        }
        if (itemKey) {
            const byKey = inv().find(item => key(item) === itemKey);
            if (byKey) return byKey;
        }
        if (Number.isInteger(slot) && slot >= 0) return inv().find(item => slotOf(item) === slot) || null;
        return null;
    }

    function itemNodeByKeyAndSlot(itemKey, sourceSlot = null) {
        const nodes = Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-key]"));
        const slot = Number(sourceSlot);
        if (itemKey && Number.isInteger(slot) && slot >= 0) {
            const exact = nodes.find(node => node.dataset.nviItemKey === itemKey && slotNo(node.closest(".nvi-slot")) === slot);
            if (exact) return exact;
        }
        if (itemKey) return nodes.find(node => node.dataset.nviItemKey === itemKey) || null;
        if (Number.isInteger(slot) && slot >= 0) return nodes.find(node => slotNo(node.closest(".nvi-slot")) === slot) || null;
        return null;
    }

    function slotNode(slot) {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-slot"))
            .find(node => slotNo(node) === Number(slot)) || null;
    }

    function saveSlot(item, slot) {
        const target = Number(slot);
        if (!item || !Number.isInteger(target) || target < 0) return false;
        item.slot = target;
        window.Game.data.personnage.inventaireSlots ??= {};
        window.Game.data.personnage.inventaireSlots[key(item)] = target;
        return true;
    }

    function moveData(itemKey, sourceSlot, targetSlot, swap = true) {
        const item = itemByKeyAndSlot(itemKey, sourceSlot);
        const target = Number(targetSlot);
        if (!item || !Number.isInteger(target) || target < 0) return false;
        const source = slotOf(item);
        if (source === target) return true;

        const other = inv().find(entry => entry !== item && slotOf(entry) === target);
        if (other) {
            if (!swap) return false;
            if (source >= 0) saveSlot(other, source);
        }
        saveSlot(item, target);
        if (typeof window.NV_demanderAutosave === "function") window.NV_demanderAutosave("inventory drag move");
        return true;
    }

    function moveDom(itemKey, sourceSlot, targetSlot) {
        const item = itemNodeByKeyAndSlot(itemKey, sourceSlot);
        const target = slotNode(targetSlot);
        if (!item || !target) return false;
        const source = item.closest(".nvi-slot");
        const other = target.querySelector(".nvi-item[data-nvi-item-key]");
        if (other && source && other !== item) source.appendChild(other);
        target.appendChild(item);
        [source, target].forEach(slot => {
            if (!slot) return;
            slot.classList.toggle("nvi-slot--occupied", Boolean(slot.querySelector(".nvi-item")));
            slot.classList.toggle("nvi-slot--locked", Boolean(slot.querySelector(".nvi-item--locked")));
        });
        item.dataset.nviItemSlot = String(targetSlot);
        return true;
    }

    function closeInventoryPopup() {
        document.querySelectorAll(".nvi-layout--inventory .nvi-item--selected, .nvi-layout--inventory .nvimp-item--popup-open")
            .forEach(item => item.classList.remove("nvi-item--selected", "nvimp-item--popup-open"));
        document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup")?.remove();
        document.querySelector(".nvi-layout--inventory")?.classList.add("nvimp-no-details");
    }

    function setPage(page) {
        if (!hasGame()) return;
        window.Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        applyPagedInventory();
    }

    function handlePageButton(event, page) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        setPage(page);
    }

    function buildPager(pageCount, activePage) {
        const pager = document.createElement("div");
        pager.className = "nvimp-pager";
        for (let page = 0; page < pageCount; page++) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nvimp-page-btn" + (page === activePage ? " is-active" : "");
            button.dataset.nvimpPage = String(page);
            button.dataset.nvimpMode = "navigate";
            button.textContent = label(page);
            button.addEventListener("click", event => handlePageButton(event, page), true);
            pager.appendChild(button);
        }
        return pager;
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
        Array.from(grid.querySelectorAll(":scope > .nvi-slot")).forEach((slot, index) => {
            if (!slot.dataset.slot) slot.dataset.slot = String(index);
        });
        const domMax = Array.from(grid.querySelectorAll(":scope > .nvi-slot")).reduce((max, slot) => Math.max(max, slotNo(slot)), -1);
        const dataMax = inv().reduce((max, item) => Math.max(max, slotOf(item)), -1);
        ensureSlotRange(grid, 0, Math.max(MIN_SLOTS - 1, domMax, dataMax) + 1);
    }

    function applyPager(grid) {
        ensureSlots(grid);
        let slots = Array.from(grid.querySelectorAll(":scope > .nvi-slot"));
        const maxSlot = slots.reduce((max, slot) => Math.max(max, slotNo(slot)), 0);
        const pageCount = Math.max(1, Math.ceil((maxSlot + 1) / SLOTS_PER_PAGE));
        const page = Math.min(currentPage(), pageCount - 1);
        window.Game.ui.nvInventairePage = page;

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
        grid.parentElement?.insertBefore(buildPager(pageCount, page), grid);
        return { pageCount, page };
    }

    function enhanceToolbar() {
        const toolbar = document.querySelector(".nvi-window .nvi-toolbar");
        if (!toolbar || !hasGame()) return;
        toolbar.classList.add("nvimp-toolbar-compact");
        toolbar.classList.toggle("is-expanded", Boolean(window.Game.ui.nvInventaireFiltresOuverts));

        let toggle = toolbar.querySelector(":scope > .nvimp-toolbar-toggle");
        if (!toggle) {
            toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "nvimp-toolbar-toggle";
            toggle.addEventListener("click", event => {
                event.preventDefault();
                window.Game.ui.nvInventaireFiltresOuverts = !window.Game.ui.nvInventaireFiltresOuverts;
                applyPagedInventory();
            });
            const top = toolbar.querySelector(".nvi-toolbar__top");
            if (top?.nextSibling) toolbar.insertBefore(toggle, top.nextSibling);
            else toolbar.appendChild(toggle);
        }
        toggle.textContent = window.Game.ui.nvInventaireFiltresOuverts ? "Masquer tri & filtres" : "Afficher tri & filtres";
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
            const gold = Number(window.Game?.data?.personnage?.or || 0);
            footer.querySelector(".nvimp-gold").textContent = `Or : ${gold}`;
        });
    }

    function neutralizeNativeDragTargets(root = document) {
        root.querySelectorAll(".nvi-layout--inventory .nvi-grid--inventory .nvi-item, .nvi-layout--inventory .nvi-grid--inventory .nvi-item *").forEach(node => {
            if (!node?.setAttribute) return;
            node.setAttribute("draggable", "false");
            node.style.webkitTouchCallout = "none";
            node.style.userSelect = "none";
            node.style.webkitUserSelect = "none";
            try { node.draggable = false; } catch (_) {}
        });
    }

    function clearDragVisuals() {
        document.querySelectorAll(".nvi-slot.nvimp-touch-target").forEach(node => node.classList.remove("nvimp-touch-target"));
        document.querySelectorAll(".nvi-item.nvimp-moving").forEach(node => node.classList.remove("nvimp-moving"));
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
        const icon = source.querySelector(".nvi-item__icon") || source.querySelector(".nvi-item__text-icon");
        const ghost = document.createElement("div");
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
        if (!dragState) return;
        const state = dragState;
        dragState = null;
        if (!state.dragging) {
            removeDragGhost();
            clearDragVisuals();
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        suppressClickUntil = Date.now() + SYNTHETIC_CLICK_SUPPRESS_MS;

        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".nvi-slot");
        if (target && state.grid.contains(target)) {
            const targetSlot = slotNo(target);
            if (moveData(state.key, state.sourceSlot, targetSlot, true)) {
                moveDom(state.key, state.sourceSlot, targetSlot);
                applyPagedInventory();
            }
        }
        removeDragGhost();
        clearDragVisuals();
    }

    function installDirectDrag() {
        if (window.__NVIPD_DIRECT_DRAG) return;
        window.__NVIPD_DIRECT_DRAG = true;

        document.addEventListener("contextmenu", event => {
            if (window.Game?.ui?.vueActive !== "inventaire") return;
            if (!event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-key]")) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }, true);

        document.addEventListener("dragstart", event => {
            if (window.Game?.ui?.vueActive !== "inventaire") return;
            if (!event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item")) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }, true);

        document.addEventListener("pointerdown", event => {
            if (window.Game?.ui?.vueActive !== "inventaire") return;
            if (event.button !== undefined && event.button !== 0) return;
            const item = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-key]");
            if (!item) return;
            const grid = item.closest(".nvi-grid--inventory");
            const sourceSlot = slotNo(item.closest(".nvi-slot"));
            if (!grid || sourceSlot < 0) return;
            suppressClickUntil = 0;
            neutralizeNativeDragTargets(grid);
            dragState = {
                key: item.dataset.nviItemKey || "",
                id: item.dataset.nviItemId || "",
                sourceSlot,
                item,
                grid,
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                dragging: false
            };
            createDragGhost(item, event, false);
            try { item.setPointerCapture(event.pointerId); } catch (_) {}
        }, true);

        document.addEventListener("pointermove", event => {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            const dx = event.clientX - dragState.x;
            const dy = event.clientY - dragState.y;
            if (!dragState.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                dragState.dragging = true;
                suppressClickUntil = Date.now() + SYNTHETIC_CLICK_SUPPRESS_MS;
                clearDragVisuals();
                dragState.item.classList.add("nvimp-moving");
                dragState.grid.querySelectorAll(".nvi-slot").forEach(slot => {
                    if (slot.style.display !== "none") slot.classList.add("nvimp-touch-target");
                });
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
            removeDragGhost();
            clearDragVisuals();
        }, true);

        document.addEventListener("click", event => {
            const item = event.target?.closest?.(".nvi-layout--inventory .nvi-item");
            if (!item) return;
            if (Date.now() > suppressClickUntil) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
        }, true);
    }

    function installOutsidePopupClose() {
        if (window.__NVIPD_OUTSIDE_POPUP_CLOSE) return;
        window.__NVIPD_OUTSIDE_POPUP_CLOSE = true;
        document.addEventListener("click", event => {
            if (window.Game?.ui?.vueActive !== "inventaire") return;
            const popup = document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
            if (!popup) return;
            if (event.target?.closest?.(".nvi-details.nvipr-popup")) return;
            if (event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item")) return;
            if (Date.now() < suppressClickUntil) return;
            closeInventoryPopup();
        }, false);
    }

    function applyPagedInventory() {
        if (!hasGame() || window.Game.ui.vueActive !== "inventaire") return;
        suppressObserver = true;
        try {
            enhanceToolbar();
            const grid = document.querySelector(".nvi-layout--inventory .nvi-grid--inventory");
            if (!grid) return;
            applyPager(grid);
            neutralizeNativeDragTargets(grid);
            ensureGoldFooter();
            installDirectDrag();
            installOutsidePopupClose();
        } finally {
            requestAnimationFrame(() => { suppressObserver = false; });
        }
    }

    function scheduleApply() {
        if (suppressObserver || applyPending) return;
        applyPending = true;
        requestAnimationFrame(() => {
            applyPending = false;
            applyPagedInventory();
        });
    }

    function observe() {
        if (observer) return;
        const root = document.getElementById("vuePrincipale");
        if (!root) return;
        observer = new MutationObserver(scheduleApply);
        observer.observe(root, { childList: true, subtree: true });
    }

    function install() {
        window.NVIMP_VERSION = VERSION;
        window.NVIPD_VERSION = VERSION;
        window.NVIMP_setPage = setPage;
        window.NVIMP_applyPagedInventory = applyPagedInventory;
        window.NVIMP_closeInventoryPopup = closeInventoryPopup;
        window.NVIPR_applyPopupRework = applyPagedInventory;
        window.NVIMP_moveSelectedToPage = function () {
            console.warn("[NightVenture] NVIMP_moveSelectedToPage est legacy; utiliser le popup intégré.");
        };

        installDirectDrag();
        installOutsidePopupClose();
        observe();
        scheduleApply();
        setTimeout(() => { observe(); scheduleApply(); }, 250);
        console.log("Inventory_Mobile_Paged.js charge — " + VERSION);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
