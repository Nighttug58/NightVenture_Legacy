/* NightVenture — helpers overlay inventaire refonte
 * Phase de nettoyage contrôlée : ce module centralise les derniers hooks overlay
 * qui étaient encore injectés inline dans index.html.
 */
(function () {
    "use strict";

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
        ghost.style.transform = "translate3d(" + Math.round(event.clientX) + "px," + Math.round(event.clientY) + "px,0) translate(-50%,-50%)";
    }

    function install() {
        document.addEventListener("pointermove", centerFastInventoryGhost, true);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
