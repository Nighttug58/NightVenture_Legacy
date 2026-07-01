/* NightVenture — Popup objet inventaire mobile */
(function () {
    "use strict";

    function injectStyle() {
        if (document.getElementById("nvInventoryPopupReworkStyle")) return;
        const style = document.createElement("style");
        style.id = "nvInventoryPopupReworkStyle";
        style.textContent = `
            .nvi-details.nvimp-details-popup.nvipr-popup {
                position: fixed !important;
                left: max(10px, env(safe-area-inset-left)) !important;
                right: max(10px, env(safe-area-inset-right)) !important;
                bottom: calc(74px + env(safe-area-inset-bottom)) !important;
                top: auto !important;
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

            .nvi-details.nvimp-details-popup.nvipr-popup .nvipr-meta-line {
                display: block !important;
            }

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-details__stats {
                display: block !important;
                margin: 8px 0 8px !important;
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

            .nvi-details.nvimp-details-popup.nvipr-popup .nvi-lock-toggle__icon {
                display: none !important;
            }

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

            .nvi-details.nvimp-details-popup.nvipr-popup .nvimp-popup-pager__label {
                font-size: 0.66rem !important;
            }

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

    function simplifyLock(details) {
        const lock = details.querySelector(".nvi-lock-toggle");
        if (!lock) return null;
        const text = lock.querySelector(".nvi-lock-toggle__text");
        const icon = lock.querySelector(".nvi-lock-toggle__icon");
        if (icon) {
            icon.textContent = "";
            icon.style.display = "none";
        }
        if (text) {
            const raw = String(text.textContent || "").toLowerCase();
            text.textContent = raw.includes("blo") || raw.includes("verrou") ? "Bloqué" : "Libre";
        }
        return lock;
    }

    function rewriteHeader(details) {
        const header = details.querySelector(".nvi-details__header");
        if (!header) return;
        const p = header.querySelector("p");
        if (!p || p.dataset.nviprMeta === "1") return;
        const parts = String(p.textContent || "").split("·").map(part => part.trim()).filter(Boolean);
        const quantity = parts.find(part => /^x\d+/i.test(part)) || "x1";
        const meta = parts.filter(part => !/^x\d+/i.test(part)).join(" · ") || "Objet · commun";
        p.innerHTML = `<span class="nvipr-meta-line">${meta}</span><span class="nvipr-meta-line">Quantité : ${quantity.replace(/^x/i, "")}</span>`;
        p.dataset.nviprMeta = "1";
    }

    function reorderContent(details) {
        const desc = details.querySelector(".nvi-details__description");
        const stats = details.querySelector(".nvi-details__stats");
        if (stats && desc && stats.compareDocumentPosition(desc) & Node.DOCUMENT_POSITION_FOLLOWING) {
            desc.before(stats);
        }

        const actions = details.querySelector(".nvi-details__actions");
        const lock = simplifyLock(details);
        if (!actions) return;

        const buttons = Array.from(actions.querySelectorAll("button"));
        const favorite = buttons.find(button => /favori/i.test(button.textContent || ""));
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
        if (pager && danger) danger.after(pager);
    }

    function applyPopupRework() {
        injectStyle();
        if (Game?.ui?.vueActive !== "inventaire") return;
        const details = document.querySelector(".nvi-layout--inventory > .nvi-details.nvimp-details-popup");
        if (!details || details.querySelector(".nvi-details__empty")) return;
        details.classList.add("nvipr-popup");

        const close = details.querySelector(".nvimp-popup-close");
        if (close) close.textContent = "×";

        rewriteHeader(details);
        reorderContent(details);
    }

    function patch() {
        if (window.__NVIPR_PATCHED) return;
        window.__NVIPR_PATCHED = true;
        const patchNamed = function (name) {
            if (typeof window[name] !== "function") return;
            const original = window[name];
            window[name] = function () {
                const result = original.apply(this, arguments);
                requestAnimationFrame(applyPopupRework);
                setTimeout(applyPopupRework, 50);
                return result;
            };
        };
        patchNamed("NVI_ouvrirInventaire");
        patchNamed("NVI_redessinerVueActive");
        patchNamed("ouvrirInventaire");
    }

    function install() {
        injectStyle();
        patch();
        requestAnimationFrame(applyPopupRework);
        setInterval(applyPopupRework, 500);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install);
    else install();
})();
