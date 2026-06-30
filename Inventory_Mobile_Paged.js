/* NightVenture — Inventaire mobile paginé */
(function () {
    "use strict";

    const SLOTS_PER_PAGE = 16;
    const PAGE_LABELS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

    function getPage() {
        Game.ui.nvInventairePage ??= 0;
        return Math.max(0, Number(Game.ui.nvInventairePage) || 0);
    }

    function setPage(page) {
        Game.ui.nvInventairePage = Math.max(0, Number(page) || 0);
        applyPagedInventory();
    }

    function injectStyle() {
        if (document.getElementById("nvInventoryMobilePagedStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryMobilePagedStyle";
        style.textContent = `
            .nvimp-pager,
            .nvimp-popup-pager {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                align-items: center;
            }

            .nvimp-pager {
                justify-content: center;
                margin: 8px 0 10px;
            }

            .nvimp-popup-pager {
                justify-content: center;
                margin-top: 10px;
                padding-top: 8px;
                border-top: 1px solid rgba(255,255,255,0.08);
            }

            .nvimp-page-btn {
                width: 34px !important;
                min-width: 34px !important;
                max-width: 34px !important;
                min-height: 28px !important;
                padding: 4px 0 !important;
                border-radius: 999px !important;
                font-size: 0.72rem !important;
                font-weight: 900 !important;
                line-height: 1 !important;
            }

            .nvimp-page-btn.is-active {
                border-color: rgba(245,211,122,0.65) !important;
                color: #f5d37a !important;
                box-shadow: 0 0 12px rgba(245,211,122,0.18) !important;
            }

            .nvi-layout--inventory .nvi-grid--inventory {
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                gap: 8px !important;
            }

            .nvi-layout--inventory .nvi-slot {
                min-height: 72px !important;
                border-radius: 14px !important;
            }

            .nvi-layout--inventory .nvi-item {
                border-radius: 13px !important;
            }

            .nvi-layout--inventory .nvi-item__icon img {
                width: 88% !important;
                height: 88% !important;
            }

            .nvi-layout--inventory .nvi-item__text-icon {
                font-size: 0.78rem !important;
            }

            .nvi-details.nvimp-details-popup {
                position: fixed !important;
                left: max(10px, env(safe-area-inset-left)) !important;
                right: max(10px, env(safe-area-inset-right)) !important;
                bottom: calc(76px + env(safe-area-inset-bottom)) !important;
                top: auto !important;
                z-index: 980 !important;
                max-height: min(68dvh, 520px) !important;
                overflow: auto !important;
                border-radius: 18px !important;
                background: rgba(12, 10, 9, 0.92) !important;
                backdrop-filter: blur(5px) !important;
                -webkit-backdrop-filter: blur(5px) !important;
                box-shadow: 0 18px 38px rgba(0,0,0,0.45) !important;
            }

            .nvimp-popup-close {
                position: absolute;
                top: 8px;
                right: 8px;
                width: 30px !important;
                min-width: 30px !important;
                min-height: 30px !important;
                padding: 0 !important;
                border-radius: 999px !important;
                font-size: 0.82rem !important;
                z-index: 2;
            }

            .nvi-details.nvimp-details-popup .nvi-details__header {
                padding-right: 32px;
            }

            .nvi-details.nvimp-details-popup .nvi-details__actions button,
            .nvi-details.nvimp-details-popup .nvi-lock-toggle,
            .nvi-details.nvimp-details-popup .nvi-danger,
            .nvi-details.nvimp-details-popup .nvi-trade-box button,
            .nvi-details.nvimp-details-popup .nvi-delete-confirm button {
                min-height: 32px !important;
                padding: 6px 9px !important;
                border-radius: 999px !important;
                font-size: 0.74rem !important;
            }

            .nvi-layout--inventory .nvi-details:not(.nvimp-details-popup) {
                display: none !important;
            }

            @media (min-width: 901px) {
                .nvi-details.nvimp-details-popup {
                    left: 50% !important;
                    right: auto !important;
                    width: min(420px, calc(100vw - 24px)) !important;
                    transform: translateX(-50%);
                }
            }

            @media (max-width: 380px) {
                .nvi-layout--inventory .nvi-slot {
                    min-height: 64px !important;
                }

                .nvi-layout--inventory .nvi-grid--inventory {
                    gap: 6px !important;
                }

                .nvimp-page-btn {
                    width: 30px !important;
                    min-width: 30px !important;
                    max-width: 30px !important;
                    min-height: 26px !important;
                    font-size: 0.68rem !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function pageLabel(index) {
        return PAGE_LABELS[index] || String(index + 1);
    }

    function buildPager(pageCount, activePage, extraClass) {
        const pager = document.createElement("div");
        pager.className = extraClass || "nvimp-pager";
        for (let i = 0; i < pageCount; i++) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "nvimp-page-btn" + (i === activePage ? " is-active" : "");
            button.textContent = pageLabel(i);
            button.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                setPage(i);
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
        pager = buildPager(pageCount, activePage, "nvimp-pager");
        grid.parentElement?.insertBefore(pager, grid);

        return { pageCount, activePage };
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
            close.textContent = "×";
            close.addEventListener("click", function (event) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof NVI_ouvrirInventaire === "function") NVI_ouvrirInventaire();
            });
            details.prepend(close);
        }

        const oldPager = details.querySelector(".nvimp-popup-pager");
        if (oldPager) oldPager.remove();
        details.appendChild(buildPager(pageCount, activePage, "nvimp-popup-pager"));
    }

    function applyPagedInventory() {
        injectStyle();
        if (Game?.ui?.vueActive !== "inventaire") return;

        const grid = document.querySelector(".nvi-layout--inventory .nvi-grid--inventory");
        if (!grid) return;

        const { pageCount, activePage } = applyPagerToGrid(grid);
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
    }

    function install() {
        injectStyle();
        patchRenderHooks();
        requestAnimationFrame(applyPagedInventory);
        setTimeout(applyPagedInventory, 250);
    }

    window.NVIMP_setPage = setPage;
    window.NVIMP_applyPagedInventory = applyPagedInventory;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install);
    } else {
        install();
    }
})();
