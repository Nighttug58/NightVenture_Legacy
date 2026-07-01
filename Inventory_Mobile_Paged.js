/* NightVenture — Inventaire mobile paginé */
(function () {
    "use strict";

    const SLOTS_PER_PAGE = 30;
    const MIN_MOBILE_SLOTS = 120;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    let moveModeItemId = null;
    let longPressTimer = null;
    let observer = null;
    let applyPending = false;
    let suppressObserver = false;

    function getPage() {
        Game.ui.nvInventairePage ??= 0;
        return Math.max(0, Number(Game.ui.nvInventairePage) || 0);
    }

    function setPage(page) {
        Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        applyPagedInventory();
    }

    function pageLabel(index) {
        return PAGE_LABELS[index] || String(index + 1);
    }

    function itemKey(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function inventory() {
        return Game?.data?.personnage?.inventaire || [];
    }

    function findItem(id) {
        return inventory().find(item => item.id === id) || null;
    }

    function slotMap() {
        const map = new Map();
        inventory().forEach(item => {
            const slot = Number(item.slot);
            if (Number.isInteger(slot) && slot >= 0) map.set(slot, item);
        });
        return map;
    }

    function persistSlot(item, slot) {
        if (!item) return;
        const corrected = Number(slot);
        if (!Number.isInteger(corrected) || corrected < 0) return;
        item.slot = corrected;
        Game.data.personnage.inventaireSlots ??= {};
        Game.data.personnage.inventaireSlots[itemKey(item)] = corrected;
    }

    function selectedItemId() {
        const selected = document.querySelector(".nvi-layout--inventory .nvi-item--selected[data-nvi-item-id]");
        if (selected?.dataset?.nviItemId) return selected.dataset.nviItemId;
        const selectedDom = document.querySelector(".nvi-layout--inventory .nvi-item[data-nvi-item-id][aria-selected='true']");
        if (selectedDom?.dataset?.nviItemId) return selectedDom.dataset.nviItemId;
        return moveModeItemId;
    }

    function firstSlotOfPage(page) {
        return Math.max(0, Number(page) || 0) * SLOTS_PER_PAGE;
    }

    function firstFreeSlotInPage(page, ignoredId = null) {
        const start = firstSlotOfPage(page);
        const used = slotMap();
        for (let i = start; i < start + SLOTS_PER_PAGE; i++) {
            const occupant = used.get(i);
            if (!occupant || occupant.id === ignoredId) return i;
        }
        return start;
    }

    function moveItemToSlot(idObjet, targetSlot) {
        const item = findItem(idObjet);
        if (!item) return false;

        const sourceSlot = Number(item.slot);
        const target = Number(targetSlot);
        if (!Number.isInteger(target) || target < 0) return false;
        if (sourceSlot === target) return true;

        const occupant = inventory().find(entry => entry !== item && Number(entry.slot) === target);
        if (occupant && Number.isInteger(sourceSlot) && sourceSlot >= 0) {
            persistSlot(occupant, sourceSlot);
        }

        persistSlot(item, target);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("mobile inventory move item");
        return true;
    }

    function moveSelectedToPage(page) {
        const id = selectedItemId();
        if (!id) return;
        const target = firstFreeSlotInPage(page, id);
        if (moveItemToSlot(id, target)) {
            moveModeItemId = null;
            Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
            if (typeof NVI_redessinerVueActive === "function") NVI_redessinerVueActive();
            scheduleApply();
        }
    }

    function compareForSort(a, b) {
        const getObj = id => {
            if (typeof trouverObjet === "function") return trouverObjet(id);
            return Game.cache?.objetsParId?.[id] || {};
        };
        const oa = getObj(a.id);
        const ob = getObj(b.id);
        const mode = Game.ui.triInventaire || "nom";
        let result = 0;
        if (mode === "type") result = String(oa.type || "").localeCompare(String(ob.type || ""));
        else if (mode === "niveau") result = Number(ob.niveauRequis || 1) - Number(oa.niveauRequis || 1);
        else if (mode === "prix") result = Number(ob.prix || 0) - Number(oa.prix || 0);
        else if (mode === "rarete") {
            const ordre = { commun: 1, "peu-commun": 2, rare: 3, epique: 4, "épique": 4, legendaire: 5, "légendaire": 5, mythique: 6 };
            result = (ordre[ob.rarete] || 0) - (ordre[oa.rarete] || 0);
        } else {
            result = String(oa.nom || a.id).localeCompare(String(ob.nom || b.id));
        }
        return Game.ui.ordreTriInventaire === "desc" ? -result : result;
    }

    function mobilePageSort() {
        const items = inventory();
        if (items.length === 0) return;

        const maxSlot = Math.max(MIN_MOBILE_SLOTS - 1, ...items.map(item => Number(item.slot) || 0));
        const pageCount = Math.max(1, Math.ceil((maxSlot + 1) / SLOTS_PER_PAGE));

        for (let page = 0; page < pageCount; page++) {
            const start = firstSlotOfPage(page);
            const end = start + SLOTS_PER_PAGE;
            const pageItems = items.filter(item => Number(item.slot) >= start && Number(item.slot) < end);
            const locked = pageItems.filter(item => item.verrouille === true || item.locked === true || item.bloque === true);
            const movable = pageItems.filter(item => !locked.includes(item)).sort(compareForSort);
            const lockedSlots = new Map(locked.map(item => [Number(item.slot), item]));
            const freeSlots = [];
            for (let slot = start; slot < end; slot++) if (!lockedSlots.has(slot)) freeSlots.push(slot);
            movable.forEach((item, index) => persistSlot(item, freeSlots[index] ?? start + index));
        }

        if (typeof ajouterJournal === "function") ajouterJournal("Inventaire trié page par page.");
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("mobile inventory page sort");
        if (typeof NVI_redessinerVueActive === "function") NVI_redessinerVueActive();
        scheduleApply();
    }

    function filtersExpanded() {
        return Boolean(Game?.ui?.nvInventaireFiltresOuverts);
    }

    function setFiltersExpanded(value) {
        Game.ui.nvInventaireFiltresOuverts = Boolean(value);
        applyPagedInventory();
    }

    function injectStyle() {
        if (document.getElementById("nvInventoryMobilePagedStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryMobilePagedStyle";
        style.textContent = `
            .nvimp-pager, .nvimp-popup-pager { display:flex; flex-wrap:wrap; gap:8px; align-items:center; }
            .nvimp-pager { justify-content:center; margin:8px 0 10px; }
            .nvimp-popup-pager { justify-content:center; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,.10); }
            .nvimp-popup-pager__label { width:100%; color:var(--text-muted,#c7bdad); font-size:.68rem; font-weight:900; letter-spacing:.04em; text-align:center; text-transform:uppercase; }
            .nvimp-page-btn { width:36px!important; min-width:36px!important; max-width:36px!important; min-height:30px!important; padding:4px 0!important; border-radius:999px!important; font-size:.74rem!important; font-weight:900!important; line-height:1!important; }
            .nvimp-page-btn.is-active { border-color:rgba(245,211,122,.65)!important; color:#f5d37a!important; box-shadow:0 0 12px rgba(245,211,122,.18)!important; }

            .nvi-toolbar.nvimp-toolbar-compact { padding:10px!important; }
            .nvi-toolbar.nvimp-toolbar-compact .nvi-toolbar__top { margin-bottom:8px!important; }
            .nvimp-toolbar-toggle { width:100%!important; min-height:34px!important; margin:2px 0 0!important; border-radius:999px!important; font-size:.78rem!important; font-weight:900!important; }
            .nvi-toolbar.nvimp-toolbar-compact:not(.is-expanded) .nvi-toolbar__search-row,
            .nvi-toolbar.nvimp-toolbar-compact:not(.is-expanded) .nvi-filters { display:none!important; }
            .nvi-toolbar.nvimp-toolbar-compact.is-expanded .nvi-toolbar__search-row { display:grid!important; margin-top:8px!important; }
            .nvi-toolbar.nvimp-toolbar-compact.is-expanded .nvi-filters { display:flex!important; max-height:31dvh; overflow:auto; padding-top:8px; }
            .nvi-toolbar.nvimp-toolbar-compact .nvi-filter { flex:1 1 calc(50% - 6px); min-height:32px!important; }

            .nvi-layout--inventory .nvi-grid--inventory { grid-template-columns:repeat(5,minmax(0,1fr))!important; gap:6px!important; touch-action:manipulation; }
            .nvi-layout--inventory .nvi-slot { min-height:58px!important; border-radius:12px!important; }
            .nvi-layout--inventory .nvi-slot.nvimp-touch-target { border-color:rgba(245,211,122,.70)!important; box-shadow:0 0 14px rgba(245,211,122,.16)!important; }
            .nvi-layout--inventory .nvi-item { border-radius:11px!important; touch-action:none; user-select:none; -webkit-user-select:none; }
            .nvi-layout--inventory .nvi-item.nvimp-moving { outline:2px solid #f5d37a!important; outline-offset:-2px; filter:brightness(1.2); }
            .nvi-layout--inventory .nvi-item__icon img { width:86%!important; height:86%!important; }
            .nvi-layout--inventory .nvi-item__text-icon { font-size:.72rem!important; }
            .nvi-layout--inventory .nvi-item__favorite, .nvi-layout--inventory .nvi-item__lock, .nvi-layout--inventory .nvi-item__qty { font-size:.52rem!important; padding:1px 3px!important; }
            @media (max-width:380px) { .nvi-layout--inventory .nvi-slot { min-height:52px!important; } .nvi-layout--inventory .nvi-grid--inventory { gap:5px!important; } .nvimp-page-btn { width:32px!important; min-width:32px!important; max-width:32px!important; min-height:28px!important; font-size:.68rem!important; } }
        `;
        document.head.appendChild(style);
    }

    function enhanceToolbar() {
        const toolbar = document.querySelector(".nvi-window .nvi-toolbar");
        if (!toolbar) return;
        toolbar.classList.add("nvimp-toolbar-compact");
        toolbar.classList.toggle("is-expanded", filtersExpanded());

        let toggle = toolbar.querySelector(":scope > .nvimp-toolbar-toggle");
        if (!toggle) {
            toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "nvimp-toolbar-toggle";
            toggle.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                setFiltersExpanded(!filtersExpanded());
            });
            const top = toolbar.querySelector(".nvi-toolbar__top");
            if (top?.nextSibling) toolbar.insertBefore(toggle, top.nextSibling);
            else toolbar.appendChild(toggle);
        }
        toggle.textContent = filtersExpanded() ? "Masquer tri & filtres" : "Afficher tri & filtres";

        const triButton = Array.from(toolbar.querySelectorAll(".nvi-toolbar__top button"))
            .find(button => String(button.textContent || "").trim().toLowerCase() === "tri auto");
        if (triButton && !triButton.__NVIMP_MOBILE_SORT) {
            triButton.__NVIMP_MOBILE_SORT = true;
            triButton.removeAttribute("onclick");
            triButton.onclick = function (event) {
                event.preventDefault();
                event.stopPropagation();
                mobilePageSort();
            };
        }
    }

    function buildPager(pageCount, activePage, extraClass, mode = "navigate") {
        const pager = document.createElement("div");
        pager.className = extraClass || "nvimp-pager";
        if (mode === "move") {
            const label = document.createElement("span");
            label.className = "nvimp-popup-pager__label";
            label.textContent = "Déplacer l'objet vers page";
            pager.appendChild(label);
        }
        for (let i = 0; i < pageCount; i++) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nvimp-page-btn" + (i === activePage ? " is-active" : "");
            button.textContent = pageLabel(i);
            button.setAttribute("aria-label", mode === "move" ? "Déplacer vers page " + pageLabel(i) : "Afficher page " + pageLabel(i));
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (mode === "move") moveSelectedToPage(i);
                else setPage(i);
            });
            pager.appendChild(button);
        }
        return pager;
    }

    function ensureMobileSlotCount(grid) {
        const slots = Array.from(grid.querySelectorAll(":scope > .nvi-slot"));
        const highest = slots.reduce((max, slot) => Math.max(max, Number(slot.dataset.slot) || 0), -1);
        for (let i = highest + 1; i < MIN_MOBILE_SLOTS; i++) {
            const slot = document.createElement("div");
            slot.className = "nvi-slot";
            slot.dataset.slot = String(i);
            grid.appendChild(slot);
        }
    }

    function applyPagerToGrid(grid) {
        ensureMobileSlotCount(grid);
        const slots = Array.from(grid.querySelectorAll(":scope > .nvi-slot"));
        if (slots.length === 0) return { pageCount: 1, activePage: 0 };
        const pageCount = Math.max(1, Math.ceil(slots.length / SLOTS_PER_PAGE));
        const activePage = Math.min(getPage(), pageCount - 1);
        Game.ui.nvInventairePage = activePage;
        slots.forEach((slot, index) => {
            const visible = index >= activePage * SLOTS_PER_PAGE && index < (activePage + 1) * SLOTS_PER_PAGE;
            slot.style.display = visible ? "" : "none";
        });
        let pager = grid.parentElement?.querySelector(":scope > .nvimp-pager");
        if (pager) pager.remove();
        pager = buildPager(pageCount, activePage, "nvimp-pager", "navigate");
        grid.parentElement?.insertBefore(pager, grid);
        return { pageCount, activePage };
    }

    function enableTouchMove(grid) {
        const slots = Array.from(grid.querySelectorAll(":scope > .nvi-slot"));
        slots.forEach(slot => {
            if (slot.__NVIMP_TOUCH) return;
            slot.__NVIMP_TOUCH = true;
            slot.addEventListener("click", function (event) {
                if (!moveModeItemId) return;
                event.preventDefault();
                event.stopPropagation();
                const targetSlot = Number(slot.dataset.slot);
                if (moveItemToSlot(moveModeItemId, targetSlot)) {
                    moveModeItemId = null;
                    if (typeof NVI_redessinerVueActive === "function") NVI_redessinerVueActive();
                    scheduleApply();
                }
            }, true);
        });

        grid.querySelectorAll(".nvi-item[data-nvi-item-id]").forEach(item => {
            if (item.__NVIMP_LONGPRESS) return;
            item.__NVIMP_LONGPRESS = true;
            item.addEventListener("pointerdown", function () {
                clearTimeout(longPressTimer);
                const id = item.dataset.nviItemId;
                longPressTimer = setTimeout(function () {
                    moveModeItemId = id;
                    document.querySelectorAll(".nvi-item.nvimp-moving").forEach(el => el.classList.remove("nvimp-moving"));
                    item.classList.add("nvimp-moving");
                    grid.querySelectorAll(".nvi-slot").forEach(el => el.classList.add("nvimp-touch-target"));
                    if (typeof ajouterJournal === "function") ajouterJournal("Mode déplacement actif.");
                }, 420);
            });
            item.addEventListener("pointerup", function () { clearTimeout(longPressTimer); });
            item.addEventListener("pointercancel", function () { clearTimeout(longPressTimer); });
            item.addEventListener("pointerleave", function () { clearTimeout(longPressTimer); });
        });
    }

    function enhanceDetailsMovePager(pageCount, activePage) {
        const details = document.querySelector(".nvi-layout--inventory > .nvi-details:not(:has(.nvi-details__empty))");
        if (!details) return;
        const oldPager = details.querySelector(".nvimp-popup-pager");
        if (oldPager) oldPager.remove();
        const movePager = buildPager(pageCount, activePage, "nvimp-popup-pager", "move");
        details.appendChild(movePager);
    }

    function applyPagedInventory() {
        injectStyle();
        if (Game?.ui?.vueActive !== "inventaire") return;

        suppressObserver = true;
        try {
            enhanceToolbar();
            const grid = document.querySelector(".nvi-layout--inventory .nvi-grid--inventory");
            if (!grid) return;
            const { pageCount, activePage } = applyPagerToGrid(grid);
            enableTouchMove(grid);
            enhanceDetailsMovePager(pageCount, activePage);
        } finally {
            requestAnimationFrame(function () {
                suppressObserver = false;
            });
        }
    }

    function scheduleApply() {
        if (suppressObserver || applyPending) return;
        applyPending = true;
        requestAnimationFrame(function () {
            applyPending = false;
            applyPagedInventory();
        });
    }

    function observeInventoryView() {
        if (observer) return;
        const root = document.getElementById("vuePrincipale");
        if (!root) return;

        observer = new MutationObserver(scheduleApply);
        observer.observe(root, { childList: true, subtree: true });
    }

    function install() {
        injectStyle();
        observeInventoryView();
        scheduleApply();
        setTimeout(function () {
            observeInventoryView();
            scheduleApply();
        }, 250);
    }

    window.NVIMP_setPage = setPage;
    window.NVIMP_applyPagedInventory = applyPagedInventory;
    window.NVIMP_moveSelectedToPage = moveSelectedToPage;
    window.NVIMP_mobilePageSort = mobilePageSort;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();