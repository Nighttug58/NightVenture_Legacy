/* NightVenture — Actions popup inventaire sans recharge */
(function () {
    "use strict";

    function inventory() {
        return Game?.data?.personnage?.inventaire || [];
    }

    function itemKey(item) {
        return String(item?.uid || item?.instanceId || item?.id || "");
    }

    function findItem(idObjet) {
        return inventory().find(item => item.id === idObjet) || null;
    }

    function escapeJs(value) {
        return String(value || "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    }

    function currentPopup() {
        return document.querySelector(".nvi-details.nvimp-details-popup.nvipr-popup");
    }

    function itemButtons(idObjet) {
        return Array.from(document.querySelectorAll(".nvi-item[data-nvi-item-id]")).filter(button => button.dataset.nviItemId === idObjet);
    }

    function selectedIdFromPopup() {
        const details = currentPopup();
        if (!details) return null;
        const candidates = Array.from(details.querySelectorAll("[onclick]"));
        for (const node of candidates) {
            const onclick = node.getAttribute("onclick") || "";
            const match = onclick.match(/'([^']+)'/);
            if (match?.[1]) return match[1];
        }
        return null;
    }

    function isFavorite(idObjet) {
        return (Game?.data?.personnage?.favoris || []).includes(idObjet);
    }

    function setFavorite(idObjet, active) {
        Game.data.personnage.favoris ??= [];
        if (active && !Game.data.personnage.favoris.includes(idObjet)) Game.data.personnage.favoris.push(idObjet);
        if (!active) Game.data.personnage.favoris = Game.data.personnage.favoris.filter(id => id !== idObjet);

        const details = currentPopup();
        details?.querySelectorAll("button").forEach(button => {
            const onclick = button.getAttribute("onclick") || "";
            if (onclick.includes("NVI_toggleFavori") && onclick.includes("'" + idObjet + "'")) {
                button.textContent = active ? "Retirer favori" : "Ajouter favori";
            }
        });

        itemButtons(idObjet).forEach(button => {
            let badge = button.querySelector(".nvi-item__favorite");
            if (active && !badge) {
                badge = document.createElement("span");
                badge.className = "nvi-item__favorite";
                badge.textContent = "Favori";
                button.prepend(badge);
            }
            if (!active && badge) badge.remove();
        });
    }

    function readLock(idObjet) {
        const item = findItem(idObjet);
        if (!item) return false;
        const key = itemKey(item);
        const map = Game.data.personnage.inventaireVerrous || {};
        if (Object.prototype.hasOwnProperty.call(map, key)) return Boolean(map[key]);
        return Boolean(item.verrouille || item.locked || item.bloque);
    }

    function setLock(idObjet, active) {
        const item = findItem(idObjet);
        if (!item) return;
        const key = itemKey(item);
        Game.data.personnage.inventaireVerrous ??= {};
        Game.data.personnage.inventaireVerrous[key] = Boolean(active);
        item.verrouille = Boolean(active);
        delete item.locked;
        delete item.bloque;

        const details = currentPopup();
        const lock = details?.querySelector(".nvi-lock-toggle");
        const text = lock?.querySelector(".nvi-lock-toggle__text");
        const icon = lock?.querySelector(".nvi-lock-toggle__icon");
        if (text) text.textContent = active ? "Bloqué" : "Libre";
        if (icon) {
            icon.textContent = "";
            icon.style.display = "none";
        }
        lock?.classList.toggle("nvi-lock-toggle--locked", active);
        lock?.classList.toggle("nvi-lock-toggle--unlocked", !active);

        itemButtons(idObjet).forEach(button => {
            button.classList.toggle("nvi-item--locked", active);
            const slot = button.closest(".nvi-slot");
            slot?.classList.toggle("nvi-slot--locked", active);
            let badge = button.querySelector(".nvi-item__lock");
            if (active && !badge) {
                badge = document.createElement("span");
                badge.className = "nvi-item__lock";
                badge.textContent = "Lock";
                button.prepend(badge);
            }
            if (!active && badge) badge.remove();
        });
    }

    function requestDelete(idObjet) {
        const details = currentPopup();
        if (!details) return;
        const danger = details.querySelector(".nvi-danger");
        if (!danger) return;

        const confirm = document.createElement("div");
        confirm.className = "nvi-delete-confirm nvipr-delete-confirm-inline";
        confirm.innerHTML = "<span>Jeter cet objet ?</span><button type='button' onclick=\"NVI_supprimerStack('" + escapeJs(idObjet) + "')\">Confirmer</button><button type='button' onclick=\"NVI_annulerSuppression()\">Annuler</button>";
        danger.replaceWith(confirm);
    }

    function cancelDelete() {
        const details = currentPopup();
        if (!details) return;
        const confirm = details.querySelector(".nvi-delete-confirm");
        if (!confirm) return;
        const idObjet = selectedIdFromPopup();
        if (!idObjet) return;

        const danger = document.createElement("button");
        danger.type = "button";
        danger.className = "nvi-danger";
        danger.textContent = "Jeter l'objet";
        danger.setAttribute("onclick", "NVI_demanderSuppression('" + escapeJs(idObjet) + "')");
        confirm.replaceWith(danger);
    }

    function autosave(reason) {
        if (typeof NV_demanderAutosave === "function") NV_demanderAutosave(reason);
    }

    function patchActions() {
        if (window.__NVIPR_NO_RELOAD_ACTIONS) return;
        window.__NVIPR_NO_RELOAD_ACTIONS = true;

        const toggleFavori = function (idObjet) {
            setFavorite(idObjet, !isFavorite(idObjet));
            autosave("inventory popup favorite toggle");
        };

        const toggleVerrouillage = function (idObjet) {
            const next = !readLock(idObjet);
            setLock(idObjet, next);
            if (typeof ajouterJournal === "function") ajouterJournal(next ? "Objet bloqué sur sa case." : "Objet libéré.");
            autosave("inventory popup lock toggle");
        };

        const demanderSuppression = function (idObjet) {
            requestDelete(idObjet);
        };

        const annulerSuppression = function () {
            cancelDelete();
        };

        window.NVI_toggleFavori = toggleFavori;
        window.NVI_toggleVerrouillage = toggleVerrouillage;
        window.NVI_demanderSuppression = demanderSuppression;
        window.NVI_annulerSuppression = annulerSuppression;

        try { NVI_toggleFavori = toggleFavori; } catch (erreur) {}
        try { NVI_toggleVerrouillage = toggleVerrouillage; } catch (erreur) {}
        try { NVI_demanderSuppression = demanderSuppression; } catch (erreur) {}
        try { NVI_annulerSuppression = annulerSuppression; } catch (erreur) {}
    }

    function install() {
        patchActions();
        setTimeout(patchActions, 250);
        setTimeout(patchActions, 1000);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
