/* NightVenture — Popup objet inventaire mobile stable */
(function () {
    "use strict";

    let observer = null;
    let applyPending = false;

    function injectStyle() {
        if (document.getElementById("nvInventoryPopupReworkStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryPopupReworkStyle";
        style.textContent = `
            .nvi-layout--inventory > .nvi-details.nvimp-details-popup:not(:has(.nvi-details__empty)):not(.nvipr-popup) {
                position: fixed !important;
                left: max(10px, env(safe-area-inset-left)) !important;
                right: max(10px, env(safe-area-inset-right)) !important;
                top: calc(12px + env(safe-area-inset-top)) !important;
                bottom: auto !important;
                z-index: 1190 !important;
                width: auto !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                opacity: 0 !important;
                pointer-events: none !important;
                transform: none !important;
                transform-origin: top center !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup {
                position: fixed !important;
                left: max(10px, env(safe-area-inset-left)) !important;
                right: max(10px, env(safe-area-inset-right)) !important;
                top: calc(12px + env(safe-area-inset-top)) !important;
                bottom: auto !important;
                z-index: 1200 !important;
                width: auto !important;
                height: auto !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 12px !important;
                border-radius: 18px !important;
                background: rgba(12, 10, 9, 0.96) !important;
                border: 1px solid rgba(245, 211, 122, 0.16) !important;
                box-shadow: 0 18px 44px rgba(0, 0, 0, 0.58) !important;
                backdrop-filter: blur(5px) !important;
                -webkit-backdrop-filter: blur(5px) !important;
                transform-origin: top center !important;
                opacity: 1 !important;
                pointer-events: auto !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvimp-popup-close {
                position: absolute !important;
                top: 8px !important;
                right: 8px !important;
                left: auto !important;
                width: 28px !important;
                min-width: 28px !important;
                max-width: 28px !important;
                height: 28px !important;
                min-height: 28px !important;
                padding: 0 !important;
                border-radius: 8px !important;
                font-size: 1rem !important;
                font-weight: 900 !important;
                line-height: 1 !important;
                z-index: 3 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__header {
                display: grid !important;
                grid-template-columns: 54px minmax(0, 1fr) !important;
                gap: 10px !important;
                align-items: center !important;
                min-height: 56px !important;
                margin: 0 36px 10px 0 !important;
                padding: 0 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__icon {
                width: 54px !important;
                height: 54px !important;
                border-radius: 13px !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__header > div:last-child {
                min-width: 0 !important;
                display: flex !important;
                flex-direction: column !important;
                gap: 3px !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__header h3 {
                margin: 0 !important;
                font-size: 0.94rem !important;
                line-height: 1.1 !important;
                white-space: nowrap !important;
                overflow: hidden !important;
                text-overflow: ellipsis !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__header p {
                margin: 0 !important;
                color: #c7bdad !important;
                font-size: 0.72rem !important;
                font-weight: 850 !important;
                line-height: 1.18 !important;
                white-space: normal !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvipr-meta-line { display: block !important; }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__stats {
                display: block !important;
                margin: 8px 0 !important;
                padding: 8px 9px !important;
                border-radius: 12px !important;
                background: rgba(245, 211, 122, 0.08) !important;
                border: 1px solid rgba(245, 211, 122, 0.12) !important;
                color: #f5d37a !important;
                font-size: 0.78rem !important;
                font-weight: 850 !important;
                line-height: 1.32 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__description {
                margin: 8px 0 10px !important;
                color: #d3cabd !important;
                font-size: 0.78rem !important;
                line-height: 1.34 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__actions {
                display: grid !important;
                grid-template-columns: 1fr !important;
                gap: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: 0 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__actions button:not(.nvipr-secondary-action) {
                width: 100% !important;
                min-height: 34px !important;
                padding: 7px 10px !important;
                border-radius: 11px !important;
                font-size: 0.76rem !important;
                font-weight: 900 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvipr-secondary-row {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 8px !important;
                margin-top: 8px !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvipr-secondary-row button,
            .nvi-details.nvimp-details-popup.nvipr-popup .nvipr-secondary-row .nvi-lock-toggle {
                width: 100% !important;
                min-height: 31px !important;
                padding: 6px 8px !important;
                border-radius: 10px !important;
                font-size: 0.72rem !important;
                font-weight: 850 !important;
                line-height: 1.05 !important;
                margin: 0 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-lock-toggle__icon { display: none !important; }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-danger {
                display: block !important;
                width: 100% !important;
                min-height: 32px !important;
                margin: 8px 0 0 !important;
                padding: 6px 10px !important;
                border-radius: 10px !important;
                border-color: rgba(255, 90, 90, 0.52) !important;
                background: rgba(145, 28, 28, 0.58) !important;
                color: #ffd6d6 !important;
                font-size: 0.74rem !important;
                font-weight: 900 !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-delete-confirm {
                display: grid !important;
                grid-template-columns: 1fr 1fr !important;
                gap: 8px !important;
                margin-top: 8px !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-delete-confirm span {
                grid-column: 1 / -1 !important;
                font-size: 0.76rem !important;
                color: #ffd6d6 !important;
                text-align: center !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvimp-popup-pager {
                margin-top: 10px !important;
                padding-top: 8px !important;
                border-top: 1px solid rgba(255,255,255,0.10) !important;
                gap: 7px !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvimp-popup-pager__label { font-size: 0.66rem !important; }
            .nvi-details.nvimp-details-popup.nvipr-popup .nvimp-page-btn {
                width: 32px !important;
                min-width: 32px !important;
                max-width: 32px !important;
                min-height: 26px !important;
                font-size: 0.68rem !important;
            }

            @media (min-width: 720px) {
                .nvi-details.nvimp-details-popup.nvipr-popup {
                    left: 50% !important;
                    right: auto !important;
                    width: min(430px, calc(100vw - 24px)) !important;
                    transform: translateX(-50%) !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        if (typeof echapperHTML === "function") return echapperHTML(value);
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function selectorForItem(idObjet) {
        const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(String(idObjet)) : String(idObjet).replace(/\\/g, "\\\\").replace(/\"/g, "\\\"");
        return `.nvi-layout--inventory .nvi-item[data-nvi-item-id="${escaped}"]`;
    }

    function itemKey(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function objectData(idObjet) {
        if (typeof trouverObjet === "function") return trouverObjet(idObjet);
        return Game?.cache?.objetsParId?.[idObjet] || null;
    }

    function inventoryItem(idObjet) {
        return (Game?.data?.personnage?.inventaire || []).find(entry => entry.id === idObjet) || null;
    }

    function objectName(idObjet) {
        return objectData(idObjet)?.nom || idObjet;
    }

    function isFavorite(idObjet) {
        return (Game?.data?.personnage?.favoris || []).includes(idObjet);
    }

    function isLocked(idObjet) {
        const item = inventoryItem(idObjet);
        if (!item) return false;
        const key = itemKey(item);
        const map = Game.data.personnage.inventaireVerrous || {};
        if (Object.prototype.hasOwnProperty.call(map, key)) return Boolean(map[key]);
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

    function findLiveDetails() {
        return Array.from(document.querySelectorAll(".nvi-layout--inventory > .nvi-details"))
            .find(panel => !panel.querySelector(".nvi-details__empty")) || null;
    }

    function selectedIdFromDetails(details) {
        if (details?.dataset?.nviprItemId) return details.dataset.nviprItemId;
        const selectedItem = document.querySelector(".nvi-layout--inventory .nvi-item--selected[data-nvi-item-id]");
        if (selectedItem?.dataset?.nviItemId) return selectedItem.dataset.nviItemId;
        const action = details?.querySelector("[onclick*='NVI_toggleFavori'], [onclick*='NVI_equiperObjetSelectionne'], [onclick*='NVI_utiliserObjetSelectionne'], [onclick*='NVI_toggleVerrouillage']");
        const match = String(action?.getAttribute("onclick") || "").match(/'([^']+)'/);
        return match?.[1] || null;
    }

    function selectedIdFromAction(button) {
        if (button?.dataset?.nviprId) return button.dataset.nviprId;
        const details = button?.closest?.(".nvi-details.nvipr-popup");
        if (details?.dataset?.nviprItemId) return details.dataset.nviprItemId;
        const match = String(button?.getAttribute?.("onclick") || "").match(/'([^']+)'/);
        return match?.[1] || null;
    }

    function ensureCloseButton(details) {
        let close = details.querySelector(".nvimp-popup-close");
        if (!close) {
            close = document.createElement("button");
            close.type = "button";
            close.className = "nvimp-popup-close";
            close.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                closeDirectPopup();
            });
            details.prepend(close);
        }
        close.textContent = "×";
    }

    function closeDirectPopup() {
        document.querySelectorAll(".nvi-layout--inventory .nvi-item--selected").forEach(item => item.classList.remove("nvi-item--selected"));
        const details = findLiveDetails();
        if (details) details.remove();
    }

    function refreshGridItemState(idObjet) {
        const item = inventoryItem(idObjet);
        const favorite = isFavorite(idObjet);
        const locked = isLocked(idObjet);

        document.querySelectorAll(selectorForItem(idObjet)).forEach(button => {
            button.classList.toggle("nvi-item--selected", Boolean(item));
            button.classList.toggle("nvi-item--locked", locked);
            button.draggable = !locked;

            let favoriteBadge = button.querySelector(".nvi-item__favorite");
            if (favorite && !favoriteBadge) {
                favoriteBadge = document.createElement("span");
                favoriteBadge.className = "nvi-item__favorite";
                favoriteBadge.textContent = "Favori";
                button.prepend(favoriteBadge);
            }
            if (!favorite && favoriteBadge) favoriteBadge.remove();

            let lockBadge = button.querySelector(".nvi-item__lock");
            if (locked && !lockBadge) {
                lockBadge = document.createElement("span");
                lockBadge.className = "nvi-item__lock";
                lockBadge.textContent = "Lock";
                button.prepend(lockBadge);
            }
            if (!locked && lockBadge) lockBadge.remove();

            const slot = button.closest(".nvi-slot");
            if (slot) slot.classList.toggle("nvi-slot--locked", locked);
        });
    }

    function refreshPopupState(idObjet) {
        const details = findLiveDetails();
        if (!details || details.dataset.nviprItemId !== idObjet) return;

        const favorite = isFavorite(idObjet);
        const favoriteButton = details.querySelector("[data-nvipr-action='favorite'], [onclick*='NVI_toggleFavori']");
        if (favoriteButton) {
            favoriteButton.textContent = favorite ? "Retirer favori" : "Ajouter favori";
            favoriteButton.classList.add("nvipr-secondary-action");
        }

        simplifyLock(details, idObjet);
    }

    function toggleFavoriteNoRedraw(idObjet) {
        Game.data.personnage.favoris ??= [];
        if (isFavorite(idObjet)) Game.data.personnage.favoris = Game.data.personnage.favoris.filter(id => id !== idObjet);
        else Game.data.personnage.favoris.push(idObjet);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup favorite no redraw");
        refreshGridItemState(idObjet);
        refreshPopupState(idObjet);
    }

    function toggleLockNoRedraw(idObjet) {
        const item = inventoryItem(idObjet);
        if (!item) return;
        const nextState = !isLocked(idObjet);
        const key = itemKey(item);
        Game.data.personnage.inventaireVerrous ??= {};
        Game.data.personnage.inventaireVerrous[key] = nextState;
        item.verrouille = nextState;
        delete item.locked;
        delete item.bloque;
        if (Number.isInteger(Number(item.slot)) && Number(item.slot) >= 0) {
            Game.data.personnage.inventaireSlots ??= {};
            Game.data.personnage.inventaireSlots[key] = Number(item.slot);
        }
        if (typeof ajouterJournal === "function") ajouterJournal(nextState ? `${objectName(idObjet)} est bloqué sur sa case.` : `${objectName(idObjet)} est libre.`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup lock no redraw");
        refreshGridItemState(idObjet);
        refreshPopupState(idObjet);
    }

    function renderDeleteConfirm(details, idObjet) {
        const existing = details.querySelector(".nvi-danger, .nvi-delete-confirm");
        if (!existing) return;
        const box = document.createElement("div");
        box.className = "nvi-delete-confirm";
        box.innerHTML = `
            <span>Supprimer toute la pile ?</span>
            <button type="button" data-nvipr-action="delete-confirm" data-nvipr-id="${escapeHtml(idObjet)}">Confirmer</button>
            <button type="button" data-nvipr-action="delete-cancel" data-nvipr-id="${escapeHtml(idObjet)}">Annuler</button>
        `;
        existing.replaceWith(box);
    }

    function renderDeleteButton(details, idObjet) {
        const existing = details.querySelector(".nvi-delete-confirm");
        if (!existing) return;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "nvi-danger";
        button.dataset.nviprAction = "delete-open";
        button.dataset.nviprId = idObjet;
        button.textContent = "Jeter l'objet";
        existing.replaceWith(button);
    }

    function deleteStackNoRedraw(idObjet) {
        const item = inventoryItem(idObjet);
        if (!item) return;
        const quantity = Number(item.quantite || 1);
        const key = itemKey(item);

        Game.data.personnage.inventaire = (Game.data.personnage.inventaire || []).filter(entry => entry !== item && entry.id !== idObjet);
        Game.data.personnage.favoris = (Game.data.personnage.favoris || []).filter(id => id !== idObjet);
        if (Game.data.personnage.inventaireSlots) delete Game.data.personnage.inventaireSlots[key];
        if (Game.data.personnage.inventaireVerrous) delete Game.data.personnage.inventaireVerrous[key];

        document.querySelectorAll(selectorForItem(idObjet)).forEach(button => {
            const slot = button.closest(".nvi-slot");
            button.remove();
            if (slot) {
                slot.classList.remove("nvi-slot--occupied", "nvi-slot--locked");
                if (!slot.children.length) slot.textContent = "";
            }
        });

        if (typeof ajouterJournal === "function") ajouterJournal(`${objectName(idObjet)} x${quantity} supprimé de l'inventaire.`);
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave("inventory popup delete no redraw");
        closeDirectPopup();
    }

    function simplifyLock(details, idObjet) {
        const lock = details.querySelector(".nvi-lock-toggle, [data-nvipr-action='lock']");
        if (!lock) return null;

        const locked = idObjet ? isLocked(idObjet) : lock.classList.contains("nvi-lock-toggle--locked");
        const text = lock.querySelector(".nvi-lock-toggle__text");
        const icon = lock.querySelector(".nvi-lock-toggle__icon");

        if (icon) {
            icon.textContent = "";
            icon.style.display = "none";
        }
        if (text) text.textContent = locked ? "Bloqué" : "Libre";
        else lock.textContent = locked ? "Bloqué" : "Libre";

        lock.classList.add("nvi-lock-toggle");
        lock.classList.toggle("nvi-lock-toggle--locked", locked);
        lock.classList.toggle("nvi-lock-toggle--unlocked", !locked);
        return lock;
    }

    function rewriteHeader(details) {
        const header = details.querySelector(".nvi-details__header");
        const p = header?.querySelector("p");
        if (!p || p.dataset.nviprMeta === "1") return;

        const parts = String(p.textContent || "").split("·").map(part => part.trim()).filter(Boolean);
        const quantity = parts.find(part => /^x\d+/i.test(part)) || "x1";
        const meta = parts.filter(part => !/^x\d+/i.test(part)).join(" · ") || "Objet · commun";

        p.innerHTML = `<span class="nvipr-meta-line">${meta}</span><span class="nvipr-meta-line">Quantité : ${quantity.replace(/^x/i, "")}</span>`;
        p.dataset.nviprMeta = "1";
    }

    function convertNativeActions(details, idObjet) {
        details.querySelectorAll("button[onclick]").forEach(button => {
            const onclick = String(button.getAttribute("onclick") || "");
            if (onclick.includes("NVI_toggleFavori")) {
                button.dataset.nviprAction = "favorite";
                button.dataset.nviprId = idObjet;
                button.removeAttribute("onclick");
            } else if (onclick.includes("NVI_toggleVerrouillage")) {
                button.dataset.nviprAction = "lock";
                button.dataset.nviprId = idObjet;
                button.removeAttribute("onclick");
            } else if (onclick.includes("NVI_demanderSuppression")) {
                button.dataset.nviprAction = "delete-open";
                button.dataset.nviprId = idObjet;
                button.removeAttribute("onclick");
            } else if (onclick.includes("NVI_annulerSuppression")) {
                button.dataset.nviprAction = "delete-cancel";
                button.dataset.nviprId = idObjet;
                button.removeAttribute("onclick");
            } else if (onclick.includes("NVI_supprimerStack")) {
                button.dataset.nviprAction = "delete-confirm";
                button.dataset.nviprId = idObjet;
                button.removeAttribute("onclick");
            }
        });
    }

    function reorderContent(details, idObjet) {
        const desc = details.querySelector(".nvi-details__description");
        const stats = details.querySelector(".nvi-details__stats");
        if (stats && desc && stats.nextElementSibling !== desc) desc.before(stats);

        convertNativeActions(details, idObjet);

        const actions = details.querySelector(".nvi-details__actions");
        const lock = simplifyLock(details, idObjet);
        if (!actions) return;

        const buttons = Array.from(actions.querySelectorAll("button"));
        const favorite = buttons.find(button => button.dataset.nviprAction === "favorite" || /favori/i.test(button.textContent || ""));
        if (favorite) favorite.classList.add("nvipr-secondary-action");

        let row = details.querySelector(".nvipr-secondary-row");
        if (!row) {
            row = document.createElement("div");
            row.className = "nvipr-secondary-row";
        }

        if (favorite && favorite.parentElement !== row) row.appendChild(favorite);
        if (lock && lock.parentElement !== row) row.appendChild(lock);
        if (row.children.length && row.parentElement !== details) actions.after(row);

        const danger = details.querySelector(".nvi-danger, .nvi-delete-confirm");
        if (danger && row.parentElement && danger.previousElementSibling !== row) row.after(danger);

        const pager = details.querySelector(".nvimp-popup-pager");
        if (pager && danger && pager.previousElementSibling !== danger) danger.after(pager);

        refreshPopupState(idObjet);
    }

    function renderDirectPopup(idObjet, clickedItem = null) {
        const item = inventoryItem(idObjet);
        const objet = objectData(idObjet);
        if (!item || !objet) return;

        document.querySelectorAll(".nvi-layout--inventory .nvi-item--selected").forEach(element => element.classList.remove("nvi-item--selected"));
        if (clickedItem) clickedItem.classList.add("nvi-item--selected");

        const layout = document.querySelector(".nvi-layout--inventory");
        if (!layout) return;

        let details = findLiveDetails() || layout.querySelector(":scope > .nvi-details");
        if (!details) {
            details = document.createElement("aside");
            layout.appendChild(details);
        }

        const rarete = objet.rarete || "commun";
        const quantite = Number(item.quantite || 1);
        const detailsStats = objectDetails(objet);
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
            ${detailsStats ? `<p class="nvi-details__stats">${detailsStats}</p>` : ""}
            <p class="nvi-details__description">${escapeHtml(objet.description || "Aucune description.")}</p>
            <div class="nvi-details__actions">
                ${objet.type === "consommable" ? `<button type="button" onclick="NVI_utiliserObjetSelectionne('${escapeHtml(idObjet)}')">Utiliser</button>` : objet.type === "bague" ? `<button type="button" onclick="NVI_equiperObjetSelectionne('${escapeHtml(idObjet)}', 'bague1')">Anneau I</button><button type="button" onclick="NVI_equiperObjetSelectionne('${escapeHtml(idObjet)}', 'bague2')">Anneau II</button>` : `<button type="button" onclick="NVI_equiperObjetSelectionne('${escapeHtml(idObjet)}')">Équiper</button>`}
            </div>
            <div class="nvipr-secondary-row">
                <button type="button" class="nvipr-secondary-action" data-nvipr-action="favorite" data-nvipr-id="${escapeHtml(idObjet)}">${favorite ? "Retirer favori" : "Ajouter favori"}</button>
                <button type="button" class="nvi-lock-toggle ${locked ? "nvi-lock-toggle--locked" : "nvi-lock-toggle--unlocked"}" data-nvipr-action="lock" data-nvipr-id="${escapeHtml(idObjet)}"><span class="nvi-lock-toggle__text">${locked ? "Bloqué" : "Libre"}</span></button>
            </div>
            <button type="button" class="nvi-danger" data-nvipr-action="delete-open" data-nvipr-id="${escapeHtml(idObjet)}">Jeter l'objet</button>
        `;

        ensureCloseButton(details);
        if (typeof window.NVIMP_applyPagedInventory === "function") requestAnimationFrame(window.NVIMP_applyPagedInventory);
    }

    function applyPopupRework() {
        injectStyle();
        if (Game?.ui?.vueActive !== "inventaire") return;

        const details = findLiveDetails();
        if (!details) return;

        const idObjet = selectedIdFromDetails(details);
        if (idObjet) details.dataset.nviprItemId = idObjet;

        details.classList.add("nvimp-details-popup", "nvipr-popup");
        details.style.display = "block";
        details.style.opacity = "1";
        details.style.pointerEvents = "auto";

        ensureCloseButton(details);
        rewriteHeader(details);
        reorderContent(details, idObjet);
    }

    function scheduleApply() {
        if (applyPending) return;
        applyPending = true;
        requestAnimationFrame(function () {
            applyPending = false;
            applyPopupRework();
        });
    }

    function handleDirectAction(event) {
        if (Game?.ui?.vueActive !== "inventaire") return;
        const button = event.target?.closest?.(".nvi-details.nvipr-popup [data-nvipr-action]");
        if (!button) return;

        const idObjet = selectedIdFromAction(button);
        if (!idObjet) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        const details = button.closest(".nvi-details.nvipr-popup");
        const action = button.dataset.nviprAction;
        if (action === "favorite") toggleFavoriteNoRedraw(idObjet);
        else if (action === "lock") toggleLockNoRedraw(idObjet);
        else if (action === "delete-open") renderDeleteConfirm(details, idObjet);
        else if (action === "delete-cancel") renderDeleteButton(details, idObjet);
        else if (action === "delete-confirm") deleteStackNoRedraw(idObjet);
    }

    function handleDirectSelection(event) {
        if (Game?.ui?.vueActive !== "inventaire") return;
        if (document.querySelector(".nvi-slot.nvimp-touch-target")) return;
        const button = event.target?.closest?.(".nvi-layout--inventory .nvi-grid--inventory .nvi-item[data-nvi-item-id]");
        if (!button) return;

        const idObjet = button.dataset.nviItemId;
        if (!idObjet) return;

        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        renderDirectPopup(idObjet, button);
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
        document.addEventListener("click", handleDirectAction, true);
        document.addEventListener("click", handleDirectSelection, true);
        observeInventoryView();
        scheduleApply();
        setTimeout(function () {
            observeInventoryView();
            scheduleApply();
        }, 250);
    }

    window.NVIPR_applyPopupRework = applyPopupRework;

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
