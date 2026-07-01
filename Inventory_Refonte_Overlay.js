/* NightVenture — helpers overlay inventaire refonte
 * Phase de nettoyage contrôlée : ce module centralise les derniers hooks overlay
 * qui étaient encore injectés inline dans index.html.
 */
(function () {
    "use strict";

    const TAP_MOVE_LIMIT = 8;
    let tapCandidate = null;

    function escapeHtml(value) {
        if (typeof echapperHTML === "function") return echapperHTML(value);
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function inventoryItem(idObjet) {
        return (window.Game?.data?.personnage?.inventaire || []).find(entry => entry.id === idObjet) || null;
    }

    function objectData(idObjet) {
        if (typeof trouverObjet === "function") return trouverObjet(idObjet);
        return window.Game?.cache?.objetsParId?.[idObjet] || null;
    }

    function itemKey(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function isFavorite(idObjet) {
        return (window.Game?.data?.personnage?.favoris || []).includes(idObjet);
    }

    function isLocked(idObjet) {
        const item = inventoryItem(idObjet);
        if (!item) return false;
        const key = itemKey(item);
        const locks = window.Game?.data?.personnage?.inventaireVerrous || {};
        if (Object.prototype.hasOwnProperty.call(locks, key)) return Boolean(locks[key]);
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
        return stats.filter(([, key]) => objet[key]).map(([label, key]) => `${label} +${objet[key]}`).join(" ");
    }

    function popupIsOpen() {
        return Boolean(document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup[data-nvipr-item-id]"));
    }

    function closeFallbackPopup() {
        document.querySelectorAll(".nvi-layout--inventory .nvi-item--selected").forEach(item => item.classList.remove("nvi-item--selected"));
        document.querySelector(".nvi-layout--inventory > .nvi-details.nvipr-popup")?.remove();
        document.querySelector(".nvi-layout--inventory")?.classList.add("nvimp-no-details");
    }

    function renderFallbackPopup(idObjet, clickedItem) {
        if (popupIsOpen()) return;
        const layout = document.querySelector(".nvi-layout--inventory");
        const item = inventoryItem(idObjet);
        const objet = objectData(idObjet);
        if (!layout || !item || !objet) return;

        document.querySelectorAll(".nvi-layout--inventory .nvi-item--selected").forEach(element => element.classList.remove("nvi-item--selected"));
        clickedItem?.classList?.add("nvi-item--selected");

        let details = layout.querySelector(":scope > .nvi-details:not(.nvipr-popup)") || document.createElement("aside");
        if (!details.parentElement) layout.appendChild(details);

        const rarete = objet.rarete || "commun";
        const quantite = Number(item.quantite || 1);
        const stats = objectDetails(objet);
        const favorite = isFavorite(idObjet);
        const locked = isLocked(idObjet);

        details.className = "nvi-details nvimp-details-popup nvipr-popup";
        details.dataset.nviprItemId = idObjet;
        details.innerHTML = `
            <button type="button" class="nvimp-popup-close">×</button>
            <div class="nvi-details__header">
                <div class="nvi-details__icon nvi-item--${escapeHtml(rarete)}">${objectIcon(objet)}</div>
                <div>
                    <h3 class="${escapeHtml(rarete)}">${escapeHtml(objet.nom || idObjet)}</h3>
                    <p data-nvipr-meta="1"><span class="nvipr-meta-line">${escapeHtml(objet.type || "divers")} · ${escapeHtml(objet.rarete || "commun")}</span><span class="nvipr-meta-line">Quantité : ${quantite}</span></p>
                </div>
            </div>
            ${stats ? `<p class="nvi-details__stats">${stats}</p>` : ""}
            <p class="nvi-details__description">${escapeHtml(objet.description || "Aucune description.")}</p>
            <div class="nvi-details__actions">
                ${objet.type === "consommable" ? `<button type="button" data-nvipr-action="use" data-nvipr-id="${escapeHtml(idObjet)}">Utiliser</button>` : objet.type === "bague" ? `<button type="button" data-nvipr-action="equip-ring1" data-nvipr-id="${escapeHtml(idObjet)}">Anneau I</button><button type="button" data-nvipr-action="equip-ring2" data-nvipr-id="${escapeHtml(idObjet)}">Anneau II</button>` : `<button type="button" data-nvipr-action="equip" data-nvipr-id="${escapeHtml(idObjet)}">Équiper</button>`}
            </div>
            <div class="nvipr-secondary-row">
                <button type="button" class="nvipr-secondary-action" data-nvipr-action="favorite" data-nvipr-id="${escapeHtml(idObjet)}">${favorite ? "Retirer favori" : "Ajouter favori"}</button>
                <button type="button" class="nvi-lock-toggle ${locked ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" data-nvipr-action="lock" data-nvipr-id="${escapeHtml(idObjet)}"><span class="nvi-lock-toggle__text">${locked ? "Bloqué" : "Libre"}</span></button>
            </div>
            <button type="button" class="nvi-danger" data-nvipr-action="delete-open" data-nvipr-id="${escapeHtml(idObjet)}">Jeter l'objet</button>
        `;

        details.querySelector(".nvimp-popup-close")?.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            closeFallbackPopup();
        }, true);

        layout.classList.remove("nvimp-no-details");
        requestAnimationFrame(() => {
            if (typeof window.NVIPR_applyPopupRework === "function") window.NVIPR_applyPopupRework();
            if (typeof window.NVIMP_applyPagedInventory === "function") window.NVIMP_applyPagedInventory();
        });
    }

    function rememberTapCandidate(event) {
        if (window.Game?.ui?.vueActive !== "inventaire") return;
        const item = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
        if (!item) {
            tapCandidate = null;
            return;
        }
        tapCandidate = {
            id: item.dataset.nviItemId,
            item,
            pointerId: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            moved: false
        };
    }

    function updateTapCandidate(event) {
        if (!tapCandidate || tapCandidate.pointerId !== event.pointerId) return;
        if (Math.hypot(event.clientX - tapCandidate.x, event.clientY - tapCandidate.y) > TAP_MOVE_LIMIT) tapCandidate.moved = true;
    }

    function recoverPopupAfterTap(event) {
        if (!tapCandidate || tapCandidate.pointerId !== event.pointerId) return;
        const candidate = tapCandidate;
        tapCandidate = null;
        if (candidate.moved || !candidate.id) return;

        setTimeout(() => {
            if (window.Game?.ui?.vueActive !== "inventaire") return;
            if (popupIsOpen()) return;
            const liveItem = document.querySelector(`.nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id="${CSS?.escape ? CSS.escape(candidate.id) : candidate.id.replace(/\"/g, '\\\"')}"]`);
            renderFallbackPopup(candidate.id, liveItem || candidate.item);
        }, 90);
    }

    function centerFastInventoryGhost(event) {
        if (window.Game?.ui?.vueActive !== "inventaire") return;
        const ghost = document.querySelector(".nvimp-drag-ghost");
        if (!ghost) return;

        if (!ghost.dataset.nvimpFastGhost) {
            const moving = document.querySelector(".nvi-layout--inventory .nvi-item.nvimp-moving");
            const icon = moving?.querySelector?.(".nvi-item__icon") || ghost.querySelector?.(".nvi-item__icon");
            ghost.dataset.nvimpFastGhost = "1";
            ghost.className = "nvimp-drag-ghost is-visible";
            if (icon) ghost.innerHTML = icon.innerHTML;
            ghost.style.transition = "none";
            ghost.style.animation = "none";
            ghost.style.filter = "none";
            ghost.style.boxShadow = "none";
            ghost.style.background = "rgba(28,24,20,.96)";
            ghost.style.border = "1px solid rgba(245,211,122,.45)";
            ghost.style.contain = "layout style paint";
            ghost.style.willChange = "transform";
            ghost.style.pointerEvents = "none";
            ghost.querySelectorAll("*").forEach(node => {
                node.style.pointerEvents = "none";
                node.style.transition = "none";
                node.style.animation = "none";
            });
        }

        ghost.style.opacity = "0.98";
        ghost.style.transform = "translate3d(" + event.clientX + "px," + event.clientY + "px,0) translate(-50%,-50%)";
    }

    function install() {
        if (window.__NV_INVENTORY_REFONTE_OVERLAY) return;
        window.__NV_INVENTORY_REFONTE_OVERLAY = true;
        document.addEventListener("pointerdown", rememberTapCandidate, true);
        document.addEventListener("pointermove", updateTapCandidate, true);
        document.addEventListener("pointerup", recoverPopupAfterTap, true);
        document.addEventListener("pointercancel", () => { tapCandidate = null; }, true);
        document.addEventListener("pointermove", centerFastInventoryGhost, true);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
