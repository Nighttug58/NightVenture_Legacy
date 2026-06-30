/* NightVenture — Inventaire mobile paginé */
(function () {
    "use strict";

    const SLOTS_PER_PAGE = 16;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    let moveModeItemId = null;
    let longPressTimer = null;

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
        const popup = document.querySelector(".nvi-details.nvimp-details-popup");
        const icon = popup?.querySelector(".nvi-details__icon img");
        if (!popup || !icon) return null;
        const selectedByTitle = document.querySelector(".nvi-layout--inventory .nvi-item[data-nvi-item-id][title]");
        return selectedByTitle?.dataset?.nviItemId || null;
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
            requestAnimationFrame(applyPagedInventory);
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

        const maxSlot = Math.max(71, ...items.map(item => Number(item.slot) || 0));
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
        requestAnimationFrame(applyPagedInventory);
    }

    function injectStyle() {
        if (document.getElementById("nvInventoryMobilePagedStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryMobilePagedStyle";
        style.textContent = `
            .nvimp-pager, .nvimp-popup-pager { display:flex; flex-wrap:wrap; gap:6px; align-items:center; }
            .nvimp-pager { justify-content:center; margin:8px 0 10px; }
            .nvimp-popup-pager { justify-content:center; margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,.08); }
            .nvimp-popup-pager__label { width:100%; color:var(--text-muted,#c7bdad); font-size:.68rem; font-weight:900; letter-spacing:.04em; text-align:center; text-transform:uppercase; }
            .nvimp-page-btn { width:34px!important; min-width:34px!important; max-width:34px!important; min-height:28px!important; padding:4px 0!important; border-radius:999px!important; font-size:.72rem!important; font-weight:900!important; line-height:1!important; }
            .nvimp-page-btn.is-active { border-color:rgba(245,211,122,.65)!important; color:#f5d37a!important; box-shadow:0 0 12px rgba(245,211,122,.18)!important; }
            .nvi-layout--inventory .nvi-grid--inventory { grid-template-columns:repeat(4,minmax(0,1fr))!important; gap:8px!important; touch-action:manipulation; }
            .nvi-layout--inventory .nvi-slot { min-height:72px!important; border-radius:14px!important; }
            .nvi-layout--inventory .nvi-slot.nvimp-touch-target { border-color:rgba(245,211,122,.70)!important; box-shadow:0 0 14px rgba(245,211,122,.16)!important; }
            .nvi-layout--inventory .nvi-item { border-radius:13px!important; touch-action:none; user-select:none; -webkit-user-select:none; }
            .nvi-layout--inventory .nvi-item.nvimp-moving { outline:2px solid #f5d37a!important; outline-offset:-2px; filter:brightness(1.2); }
            .nvi-layout--inventory .nvi-item__icon img { width:88%!important; height:88%!important; }
            .nvi-layout--inventory .nvi-item__text-icon { font-size:.78rem!important; }
            .nvimp-touch-hint { margin:6px 0 0; color:#f5d37a; font-size:.72rem; font-weight:850; text-align:center; }
            .nvi-details.nvimp-details-popup { position:fixed!important; left:max(10px,env(safe-area-inset-left))!important; right:max(10px,env(safe-area-inset-right))!important; bottom:calc(76px + env(safe-area-inset-bottom))!important; top:auto!important; z-index:980!important; max-height:min(68dvh,520px)!important; overflow:auto!important; border-radius:18px!important; background:rgba(12,10,9,.92)!important; backdrop-filter:blur(5px)!important; -webkit-backdrop-filter:blur(5px)!important; box-shadow:0 18px 38px rgba(0,0,0,.45)!important; }
            .nvimp-popup-close { position:absolute; top:8px; right:8px; min-width:64px!important; min-height:30px!important; padding:0 10px!important; border-radius:999px!important; font-size:.72rem!important; font-weight:900!important; z-index:2; }
            .nvi-details.nvimp-details-popup .nvi-details__header { padding-right:78px; margin-bottom:8px!important; }
            .nvi-details.nvimp-details-popup h3 { margin:0 0 3px!important; font-size:1rem!important; line-height:1.1!important; }
            .nvi-details.nvimp-details-popup .nvi-details__description, .nvi-details.nvimp-details-popup .nvi-details__stats { margin:8px 0!important; font-size:.82rem!important; line-height:1.35!important; }
            .nvi-details.nvimp-details-popup .nvi-details__actions, .nvi-details.nvimp-details-popup .nvi-delete-confirm, .nvi-details.nvimp-details-popup .nvi-trade-box { display:grid!important; grid-template-columns:repeat(2,minmax(0,1fr))!important; gap:6px!important; margin-top:8px!important; }
            .nvi-details.nvimp-details-popup .nvi-trade-box { grid-template-columns:1fr!important; padding:9px!important; }
            .nvi-details.nvimp-details-popup .nvi-lock-toggle { display:grid!important; grid-template-columns:1fr!important; justify-items:center!important; min-height:32px!important; margin-top:8px!important; }
            .nvi-details.nvimp-details-popup .nvi-details__actions button, .nvi-details.nvimp-details-popup .nvi-lock-toggle, .nvi-details.nvimp-details-popup .nvi-danger, .nvi-details.nvimp-details-popup .nvi-trade-box button, .nvi-details.nvimp-details-popup .nvi-delete-confirm button { width:100%!important; min-height:34px!important; padding:7px 9px!important; border-radius:999px!important; font-size:.74rem!important; font-weight:850!important; line-height:1.05!important; }
            .nvi-details.nvimp-details-popup .nvi-danger { grid-column:1 / -1; }
            .nvi-details.nvimp-details-popup .nvi-quantity { justify-content:center; }
            .nvi-layout--inventory .nvi-details:not(.nvimp-details-popup) { display:none!important; }
            @media (min-width:901px) { .nvi-details.nvimp-details-popup { left:50%!important; right:auto!important; width:min(420px,calc(100vw - 24px))!important; transform:translateX(-50%); } }
            @media (max-width:380px) { .nvi-layout--inventory .nvi-slot { min-height:64px!important; } .nvi-layout--inventory .nvi-grid--inventory { gap:6px!important; } .nvimp-page-btn { width:30px!important; min-width:30px!important; max-width:30px!important; min-height:26px!important; font-size:.68rem!important; } }
        `;
        document.head.appendChild(style);
    }

    function renameButton(button) {
        const text = String(button.textContent || "").trim().toLowerCase();
        const replacements = { "equiper":"Équiper", "utiliser":"Utiliser", "favori":"Ajouter favori", "retirer favori":"Retirer favori", "supprimer":"Jeter l'objet", "bague 1":"Anneau I", "bague 2":"Anneau II", "vendre":"Vendre", "acheter":"Acheter", "oui":"Confirmer", "non":"Annuler", "max":"MAX" };
        if (replacements[text]) button.textContent = replacements[text];
    }

    function polishPopupButtons(details) {
        details.querySelectorAll("button").forEach(renameButton);
        const lockText = details.querySelector(".nvi-lock-toggle__text");
        if (lockText) {
            const normalized = String(lockText.textContent || "").trim().toLowerCase();
            if (normalized === "bloque") lockText.textContent = "Verrouillé";
            if (normalized === "debloque") lockText.textContent = "Libre";
        }
        const lockIcon = details.querySelector(".nvi-lock-toggle__icon");
        if (lockIcon) {
            const normalized = String(lockIcon.textContent || "").trim().toLowerCase();
            if (normalized === "lock") lockIcon.textContent = "Case bloquée";
            if (normalized === "libre") lockIcon.textContent = "Case libre";
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

    function applyPagerToGrid(grid) {
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
                    requestAnimationFrame(applyPagedInventory);
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
                    if (typeof ajouterJournal === "function") ajouterJournal("Mode déplacement : touche une case pour déplacer l'objet.");
                }, 420);
            });
            item.addEventListener("pointerup", function () { clearTimeout(longPressTimer); });
            item.addEventListener("pointercancel", function () { clearTimeout(longPressTimer); });
            item.addEventListener("pointerleave", function () { clearTimeout(longPressTimer); });
        });
    }

    function enhanceDetailsPopup(pageCount, activePage) {
        const details = document.querySelector(".nvi-layout--inventory > .nvi-details");
        if (!details) return;
        const isEmpty = Boolean(details.querySelector(".nvi-details__empty"));
        details.classList.toggle("nvimp-details-popup", !isEmpty);
        if (isEmpty) return;
        if (!details.querySelector(".nvimp-popup-close")) {
            const close = document.createElement("button");
            close.type = "button";
            close.className = "nvimp-popup-close";
            close.textContent = "Fermer";
            close.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof NVI_ouvrirInventaire === "function") NVI_ouvrirInventaire();
            });
            details.prepend(close);
        }
        polishPopupButtons(details);
        const oldPager = details.querySelector(".nvimp-popup-pager");
        if (oldPager) oldPager.remove();
        const movePager = buildPager(pageCount, activePage, "nvimp-popup-pager", "move");
        const hint = document.createElement("div");
        hint.className = "nvimp-touch-hint";
        hint.textContent = "Mobile : appui long sur un item, puis touche une case pour le déplacer.";
        movePager.appendChild(hint);
        details.appendChild(movePager);
    }

    function applyPagedInventory() {
        injectStyle();
        if (Game?.ui?.vueActive !== "inventaire") return;
        const grid = document.querySelector(".nvi-layout--inventory .nvi-grid--inventory");
        if (!grid) return;
        const { pageCount, activePage } = applyPagerToGrid(grid);
        enableTouchMove(grid);
        enhanceDetailsPopup(pageCount, activePage);
    }

    function patchRenderHooks() {
        if (window.__NVIMP_PATCHED) return;
        window.__NVIMP_PATCHED = true;
        if (typeof afficherVuePrincipale === "function") {
            const originalAfficher = afficherVuePrincipale;
            afficherVuePrincipale = function () {
                const result = originalAfficher.apply(this, arguments);
                requestAnimationFrame(applyPagedInventory);
                return result;
            };
        }
        const patchNamed = function (name) {
            if (typeof window[name] !== "function") return;
            const original = window[name];
            window[name] = function () {
                const result = original.apply(this, arguments);
                requestAnimationFrame(applyPagedInventory);
                return result;
            };
        };
        patchNamed("NVI_ouvrirInventaire");
        patchNamed("NVI_redessinerVueActive");
        patchNamed("ouvrirInventaire");
        if (typeof window.NVI_triAutomatiqueInventaire === "function") {
            window.NVI_triAutomatiqueInventaire = mobilePageSort;
            try { NVI_triAutomatiqueInventaire = mobilePageSort; } catch (erreur) {}
        }
    }

    function install() {
        injectStyle();
        patchRenderHooks();
        requestAnimationFrame(applyPagedInventory);
        setTimeout(applyPagedInventory, 250);
    }

    window.NVIMP_setPage = setPage;
    window.NVIMP_applyPagedInventory = applyPagedInventory;
    window.NVIMP_moveSelectedToPage = moveSelectedToPage;
    window.NVIMP_mobilePageSort = mobilePageSort;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
