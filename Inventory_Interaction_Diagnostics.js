/* NightVenture — Inventory Interaction Diagnostics */
(function () {
    "use strict";

    const VERSION = "v0.9.9.16-inventory-interaction-diagnostics";
    const warnedIds = new Set();

    function inventory() {
        return Array.isArray(window.Game?.data?.personnage?.inventaire) ? window.Game.data.personnage.inventaire : [];
    }

    function itemName(id) {
        if (typeof window.trouverObjet === "function") return window.trouverObjet(id)?.nom || id;
        return window.Game?.cache?.objetsParId?.[id]?.nom || id;
    }

    function journal(message) {
        if (typeof window.ajouterJournal === "function") window.ajouterJournal(message);
        else console.warn(message);
    }

    function duplicateMap() {
        const map = new Map();
        inventory().forEach(item => {
            if (!item?.id) return;
            if (!map.has(item.id)) map.set(item.id, []);
            map.get(item.id).push(item);
        });
        return map;
    }

    function checkDuplicates(context = "inventory") {
        if (!inventory().length) return;
        duplicateMap().forEach((items, id) => {
            if (items.length <= 1 || warnedIds.has(id)) return;
            warnedIds.add(id);
            journal(`Diagnostic inventaire : ${itemName(id)} existe en ${items.length} piles. Certaines actions popup utilisent encore l'id objet et seront securisees dans la prochaine passe instance-aware.`);
            console.warn("[NightVenture][Inventory diagnostics] duplicate item stacks", { context, id, count: items.length, items });
        });
    }

    function installObserver() {
        const root = document.getElementById("vuePrincipale");
        if (!root || window.__NVI_INTERACTION_DIAGNOSTICS_OBSERVER) return;
        window.__NVI_INTERACTION_DIAGNOSTICS_OBSERVER = new MutationObserver(() => {
            if (window.Game?.ui?.vueActive === "inventaire") checkDuplicates("inventory view mutation");
        });
        window.__NVI_INTERACTION_DIAGNOSTICS_OBSERVER.observe(root, { childList: true, subtree: true });
    }

    function install() {
        window.NVI_INTERACTION_DIAGNOSTICS_VERSION = VERSION;
        installObserver();
        checkDuplicates("install");
        window.addEventListener("nv:inventory-interaction-ready", () => checkDuplicates("interaction ready"));
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
