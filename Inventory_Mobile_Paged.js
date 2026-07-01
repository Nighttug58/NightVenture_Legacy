/* NightVenture — inventaire mobile paginé + déplacement direct */
(function () {
    "use strict";

    const SLOTS_PER_PAGE = 30;
    const MIN_SLOTS = 120;
    const DRAG_THRESHOLD = 8;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    let observer = null;
    let applyPending = false;
    let suppressObserver = false;
    let dragState = null;
    let suppressClickUntil = 0;

    function inv() { return Game?.data?.personnage?.inventaire || []; }
    function key(item) { return String(item?.uid || item?.instanceId || item?.id || ""); }
    function itemData(id) { return inv().find(item => item.id === id) || null; }
    function slotNo(slot, fallback = -1) { const n = Number(slot?.dataset?.slot); return Number.isInteger(n) && n >= 0 ? n : fallback; }
    function pageStart(page) { return Math.max(0, Number(page) || 0) * SLOTS_PER_PAGE; }
    function currentPage() { Game.ui.nvInventairePage ??= 0; return Math.max(0, Number(Game.ui.nvInventairePage) || 0); }
    function label(i) { return PAGE_LABELS[i] || String(i + 1); }

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
        const selected = document.querySelector(".nvi-layout--inventory .nvi-item--selected[data-nvi-item-id]");
        return selected?.dataset?.nviItemId || null;
    }

    function closeInventoryPopup() {
        document.querySelectorAll(".nvi-layout--inventory .nvi-item--selected").forEach(item => item.classList.remove("nvi-item--selected"));
        const popup = document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
        if (popup) popup.remove();
        document.querySelector(".nvi-layout--inventory")?.classList.add("nvimp-no-details");
    }

    function moveSelectedToPage(page) {
        const id = selectedItemId();
        if (!id) return;
        const target = firstFreeSlotInPage(page, id);
        if (!moveData(id, target, true)) return;
        Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        moveDom(id, target);
        applyPagedInventory();
        const popup = document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup");
        if (popup) popup.dataset.nviprItemId = id;
    }

    function injectStyle() {
        if (document.getElementById("nvInventoryMobilePagedStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryMobilePagedStyle";
        style.textContent = `
            .nvimp-pager,.nvimp-popup-pager{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center}.nvimp-pager{margin:8px 0 10px}.nvimp-popup-pager{margin-top:10px;padding-top:8px;border-top:1px solid rgba(255,255,255,.10)}.nvimp-popup-pager__label{width:100%;color:var(--text-muted,#c7bdad);font-size:.68rem;font-weight:900;letter-spacing:.04em;text-align:center;text-transform:uppercase}.nvimp-page-btn{width:36px!important;min-width:36px!important;max-width:36px!important;min-height:30px!important;padding:4px 0!important;border-radius:999px!important;font-size:.74rem!important;font-weight:900!important;line-height:1!important}.nvimp-page-btn.is-active{border-color:rgba(245,211,122,.65)!important;color:#f5d37a!important;box-shadow:0 0 12px rgba(245,211,122,.18)!important}
            .nvi-toolbar.nvimp-toolbar-compact{padding:10px!important}.nvi-toolbar.nvimp-toolbar-compact .nvi-toolbar__top{margin-bottom:8px!important}.nvimp-toolbar-toggle{width:100%!important;min-height:34px!important;margin:2px 0 0!important;border-radius:999px!important;font-size:.78rem!important;font-weight:900!important}.nvi-toolbar.nvimp-toolbar-compact:not(.is-expanded) .nvi-toolbar__search-row,.nvi-toolbar.nvimp-toolbar-compact:not(.is-expanded) .nvi-filters{display:none!important}.nvi-toolbar.nvimp-toolbar-compact.is-expanded .nvi-toolbar__search-row{display:grid!important;margin-top:8px!important}.nvi-toolbar.nvimp-toolbar-compact.is-expanded .nvi-filters{display:flex!important;max-height:31dvh;overflow:auto;padding-top:8px}.nvi-toolbar.nvimp-toolbar-compact .nvi-filter{flex:1 1 calc(50% - 6px);min-height:32px!important}
            .nvi-layout--inventory.nvimp-no-details{grid-template-columns:minmax(0,1fr)!important}.nvi-layout--inventory .nvi-details:has(.nvi-details__empty){display:none!important}.nvi-layout--inventory .nvi-panel__title{display:none!important;margin:0!important}.nvi-layout--inventory .nvi-grid--inventory{grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;touch-action:manipulation}.nvi-layout--inventory .nvi-slot{min-height:58px!important;border-radius:12px!important;pointer-events:auto!important}.nvi-layout--inventory .nvi-slot.nvimp-touch-target{border-color:rgba(245,211,122,.70)!important;box-shadow:0 0 14px rgba(245,211,122,.16)!important}.nvi-layout--inventory .nvi-item{border-radius:11px!important;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-user-drag:none}.nvi-layout--inventory .nvi-item *,.nvi-layout--inventory .nvi-item img{pointer-events:none;-webkit-user-drag:none;user-drag:none}.nvi-layout--inventory .nvi-item.nvimp-moving{outline:2px solid #f5d37a!important;outline-offset:-2px;filter:brightness(1.18);opacity:.86}.nvi-layout--inventory .nvi-item__icon img{width:86%!important;height:86%!important}.nvi-layout--inventory .nvi-item__text-icon{font-size:.72rem!important}.nvi-layout--inventory .nvi-item__favorite,.nvi-layout--inventory .nvi-item__lock,.nvi-layout--inventory .nvi-item__qty{font-size:.52rem!important;padding:1px 3px!important}
            .nvimp-grid-footer{display:flex;justify-content:flex-start;align-items:center;margin-top:8px;min-height:24px}.nvimp-gold{display:inline-flex;align-items:center;justify-content:flex-start;min-height:24px;padding:4px 10px;border:1px solid rgba(245,211,122,.22);border-radius:999px;background:rgba(0,0,0,.18);color:#f5d37a;font-size:.78rem;font-weight:900;letter-spacing:.02em}@media(max-width:380px){.nvi-layout--inventory .nvi-slot{min-height:52px!important}.nvi-layout--inventory .nvi-grid--inventory{gap:5px!important}.nvimp-page-btn{width:32px!important;min-width:32px!important;max-width:32px!important;min-height:28px!important;font-size:.68rem!important}}
        `;
        document.head.appendChild(style);
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
            if (mode === "move") {
                button.addEventListener("pointerdown", event => handlePageButtonEvent(event, i, mode), true);
            }
            button.addEventListener("click", event => handlePageButtonEvent(event, i, mode), true);
            pager.appendChild(button);
        }
        return pager;
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
                suppressClickUntil = Date.now() + 700;
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
            node.setAttribute("draggable", "false");
            try { node.draggable = false; } catch (_) {}
        });
    }

    function finishDrag(event) {
        if (!dragState) return;
        const state = dragState;
        dragState = null;
        if (!state.dragging) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        suppressClickUntil = Date.now() + 900;

        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.(".nvi-slot");
        if (target && state.grid.contains(target)) {
            const slot = slotNo(target);
            if (moveData(state.id, slot, true)) {
                moveDom(state.id, slot);
                applyPagedInventory();
            }
        }
        clearDragVisuals();
    }

    function installDirectDrag() {
        if (window.__NVIMP_DIRECT_DRAG) return;
        window.__NVIMP_DIRECT_DRAG = true;

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
            neutralizeNativeDragTargets(grid);
            dragState = { id: item.dataset.nviItemId, item, grid, pointerId: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
            try { item.setPointerCapture(event.pointerId); } catch (_) {}
        }, true);

        document.addEventListener("pointermove", event => {
            if (!dragState || dragState.pointerId !== event.pointerId) return;
            const dx = event.clientX - dragState.x;
            const dy = event.clientY - dragState.y;
            if (!dragState.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
                dragState.dragging = true;
                suppressClickUntil = Date.now() + 900;
                clearDragVisuals();
                dragState.item.classList.add("nvimp-moving");
                dragState.grid.querySelectorAll(".nvi-slot").forEach(slot => { if (slot.style.display !== "none") slot.classList.add("nvimp-touch-target"); });
            }
            if (dragState.dragging) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
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
            clearDragVisuals();
        }, true);

        document.addEventListener("click", event => {
            if (Date.now() > suppressClickUntil) return;
            if (!event.target?.closest?.(".nvi-layout--inventory .nvi-item")) return;
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
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
        installPopupPagerActions();
        installOutsidePopupClose();
        installDirectDrag();
        observe();
        scheduleApply();
        setTimeout(() => { observe(); scheduleApply(); }, 250);
    }

    window.NVIMP_setPage = setPage;
    window.NVIMP_applyPagedInventory = applyPagedInventory;
    window.NVIMP_moveSelectedToPage = moveSelectedToPage;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();