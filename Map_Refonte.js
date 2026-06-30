(function () {
    "use strict";

    const NV_MAP_VERSION = "v0.9.4.13-compact-list-labels";

    const NV_MAP_STATES = {};

    const NV_MAP_WORLD_IMAGE_SRC = "carte_monde_aetheria_v1.png";

    const NV_MAP_IMAGE_CACHE = {};

    const NV_MAP_DEFAULT_STATE = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        isDragging: false,
        lastX: 0,
        lastY: 0,
        worldWidth: 0,
        worldHeight: 0
    };

    function nvMapState(canvasId) {
        if (!NV_MAP_STATES[canvasId]) {
            NV_MAP_STATES[canvasId] = { ...NV_MAP_DEFAULT_STATE };
        }

        return NV_MAP_STATES[canvasId];
    }

    function nvMapClamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function nvMapGetImage(src) {
        if (!src) return null;

        if (!NV_MAP_IMAGE_CACHE[src]) {
            const image = new Image();
            image.decoding = "async";
            image.src = src;
            image.addEventListener("load", () => {
                try {
                    dessinerCarteRegions?.();
                } catch (erreur) {
                    // pas grave
                }
            });
            NV_MAP_IMAGE_CACHE[src] = image;
        }

        return NV_MAP_IMAGE_CACHE[src];
    }

    function nvMapGetBackgroundImage(canvasId, options = {}) {
        if (options.backgroundImage) {
            return nvMapGetImage(options.backgroundImage);
        }

        if (canvasId === "carteRegions") {
            return nvMapGetImage(NV_MAP_WORLD_IMAGE_SRC);
        }

        return null;
    }

    function nvMapInjectStyles() {
        if (document.getElementById("nvMapRefonteStyleV0943")) return;

        const style = document.createElement("style");
        style.id = "nvMapRefonteStyleV0943";
        style.textContent = `
            .modal-zones {
                width: min(1450px, 96vw);
                max-width: 1450px;
                max-height: 92vh;
                overflow: hidden;
                padding: 16px;
                background:
                    linear-gradient(180deg, rgba(33, 27, 21, 0.98), rgba(18, 16, 14, 0.98));
                border: 1px solid rgba(245, 211, 122, 0.22);
                box-shadow: 0 18px 40px rgba(0,0,0,0.45);
            }

            .modal-header-zones {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 14px;
                margin-bottom: 14px;
                padding-bottom: 10px;
                border-bottom: 1px solid rgba(245, 211, 122, 0.12);
            }

            .modal-header-zones h2 {
                margin: 0;
                flex: 1;
                text-align: center;
                color: var(--gold, #f5d37a);
            }

            #zonesContainer,
            #regionsContainer {
                display: grid;
                grid-template-columns: minmax(290px, 340px) minmax(0, 1fr);
                gap: 16px;
                min-height: 62vh;
                height: 78vh;
            }

            #listeZones,
            #listeRegions {
                overflow: auto;
                padding-right: 4px;
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .nv-map-sidepanel {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .nv-map-focus-card,
            .nv-map-legend,
            .nv-map-list-card,
            .nv-map-region-card {
                background: rgba(255,255,255,0.035);
                border: 1px solid rgba(245, 211, 122, 0.12);
                border-radius: 14px;
                padding: 12px;
            }

            .nv-map-focus-card {
                background:
                    radial-gradient(circle at top right, rgba(245, 211, 122, 0.08), transparent 45%),
                    rgba(255,255,255,0.04);
            }

            .nv-map-focus-card h3,
            .nv-map-list-card h4,
            .nv-map-region-card h4 {
                margin: 0 0 6px;
                color: var(--gold, #f5d37a);
            }

            .nv-map-subtitle {
                color: var(--text-muted, #b9b0a1);
                font-size: 0.9rem;
                margin: 0 0 10px;
            }

            .nv-map-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 6px;
                margin-bottom: 10px;
            }

            .nv-map-tag {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 9px;
                border-radius: 999px;
                background: rgba(0,0,0,0.22);
                border: 1px solid rgba(245, 211, 122, 0.12);
                color: var(--text-muted, #d0c6b6);
                font-size: 0.84rem;
            }

            .nv-map-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 10px;
            }

            .nv-map-actions button {
                flex: 1 1 140px;
            }

            .nv-map-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }

            .nv-map-list-card,
            .nv-map-region-card {
                cursor: pointer;
                transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
            }

            .nv-map-list-card:hover,
            .nv-map-region-card:hover {
                transform: translateY(-1px);
                border-color: rgba(245, 211, 122, 0.3);
                background: rgba(255,255,255,0.06);
            }

            .nv-map-list-card.is-selected,
            .nv-map-region-card.is-selected {
                border-color: rgba(245, 211, 122, 0.45);
                box-shadow: 0 0 0 1px rgba(245, 211, 122, 0.12) inset;
                background: rgba(245, 211, 122, 0.08);
            }

            .nv-map-list-card.is-current,
            .nv-map-region-card.is-current {
                border-left: 4px solid #6ddf7a;
            }

            .nv-map-list-top {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
                margin-bottom: 6px;
            }

            .nv-map-list-card p,
            .nv-map-region-card p {
                margin: 0;
                color: var(--text-muted, #c7bdad);
                line-height: 1.35;
            }

            .nv-map-mini-status {
                font-size: 0.8rem;
                color: var(--text-muted, #b9b0a1);
                white-space: nowrap;
            }

            .nv-map-card-actions {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                gap: 8px;
                margin-top: 10px;
            }

            .nv-map-card-actions button {
                min-height: 36px;
                padding: 7px 10px;
            }

            .nv-map-close-main {
                min-height: 38px;
                padding: 8px 12px;
                border-color: rgba(255, 180, 120, 0.28) !important;
            }

            .carte-container {
                position: relative;
                overflow: hidden;
                min-height: 100%;
                border-radius: 16px;
                border: 1px solid rgba(245, 211, 122, 0.16);
                background:
                    radial-gradient(circle at 20% 10%, rgba(245, 211, 122, 0.08), transparent 30%),
                    radial-gradient(circle at 80% 75%, rgba(75, 125, 180, 0.09), transparent 32%),
                    linear-gradient(180deg, #24211d, #181613);
                box-shadow: inset 0 0 40px rgba(0,0,0,0.35);
                cursor: grab;
                user-select: none;
            }

            .carte-container.is-dragging {
                cursor: grabbing;
            }

            .carte-canvas {
                display: block;
                width: 100%;
                height: 100%;
            }

            .nv-map-toolbar {
                position: absolute;
                top: 12px;
                left: 12px;
                right: 12px;
                z-index: 6;
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 10px;
                pointer-events: none;
            }

            .nv-map-toolbar > * {
                pointer-events: auto;
            }

            .nv-map-titlebox,
            .nv-map-legend-inline,
            .nv-map-controls {
                padding: 9px 12px;
                border-radius: 12px;
                background: rgba(18, 16, 14, 0.84);
                border: 1px solid rgba(245, 211, 122, 0.18);
                backdrop-filter: blur(4px);
            }

            .nv-map-titlebox strong {
                display: block;
                color: var(--gold, #f5d37a);
                font-size: 0.96rem;
                margin-bottom: 3px;
            }

            .nv-map-titlebox span,
            .nv-map-legend-inline span,
            .nv-map-controls span {
                color: var(--text-muted, #d0c6b6);
                font-size: 0.83rem;
            }

            .nv-map-right-tools {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 8px;
            }

            .nv-map-legend-inline {
                display: flex;
                flex-wrap: wrap;
                justify-content: flex-end;
                gap: 10px;
            }

            .nv-map-controls {
                display: flex;
                align-items: center;
                gap: 6px;
            }

            .nv-map-controls button {
                min-height: 30px;
                padding: 4px 9px;
                border-radius: 8px;
            }

            .nv-map-legend-inline .dot,
            .nv-map-legend .dot {
                width: 10px;
                height: 10px;
                border-radius: 999px;
                display: inline-block;
                margin-right: 5px;
            }

            .nv-map-overlay {
                position: absolute;
                inset: 0;
                z-index: 4;
                pointer-events: none;
                transform-origin: 0 0;
            }

            .nv-map-world {
                position: absolute;
                left: 0;
                top: 0;
                transform-origin: 0 0;
                pointer-events: none;
            }

            .nv-map-node {
                position: absolute;
                z-index: 3;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 0;
                transform: translate(-50%, -50%);
                pointer-events: auto;
                border: none;
                background: transparent;
                cursor: pointer;
                padding: 0;
                box-sizing: border-box;
            }

            .nv-map-node-pin {
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                width: 24px;
                height: 24px;
                border-radius: 999px;
                border: 2px solid rgba(255,255,255,0.92);
                background: #3f87e8;
                box-shadow: 0 3px 10px rgba(0,0,0,0.35);
                transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
            }

            .nv-map-node-pin::before {
                content: "";
                width: 8px;
                height: 8px;
                border-radius: 999px;
                background: rgba(255,255,255,0.92);
                box-shadow: 0 0 8px rgba(255,255,255,0.45);
            }

            .nv-map-node-pin::after {
                content: "";
                position: absolute;
                inset: -7px;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,0.14);
                opacity: 0;
                transition: opacity 0.15s ease;
            }

            .nv-map-node:hover .nv-map-node-pin {
                transform: scale(1.08);
                box-shadow: 0 5px 14px rgba(0,0,0,0.42);
            }

            .nv-map-node.is-selected:hover .nv-map-node-pin {
                transform: none !important;
            }

            .nv-map-node:hover .nv-map-node-pin::after,
            .nv-map-node.is-selected .nv-map-node-pin::after,
            .nv-map-node.is-current .nv-map-node-pin::after {
                opacity: 1;
            }

            .nv-map-node.is-selected .nv-map-node-pin {
                transform: none !important;
                animation: none !important;
                box-shadow:
                    0 0 0 4px rgba(245, 211, 122, 0.20),
                    0 0 0 0 rgba(245, 211, 122, 0.34),
                    0 6px 16px rgba(0,0,0,0.45);
            }

            .nv-map-node.is-selected .nv-map-node-pin::after {
                opacity: 1;
                animation: nvMapPinRingPulse 0.55s ease-out;
            }

            @keyframes nvMapPinRingPulse {
                0% {
                    inset: -5px;
                    opacity: 0.95;
                    border-color: rgba(245, 211, 122, 0.75);
                }
                100% {
                    inset: -18px;
                    opacity: 0;
                    border-color: rgba(245, 211, 122, 0);
                }
            }

            .nv-map-node.is-current .nv-map-node-pin {
                box-shadow: 0 0 0 4px rgba(91, 219, 124, 0.24), 0 6px 16px rgba(0,0,0,0.45);
            }

            .nv-map-node.is-locked .nv-map-node-pin {
                opacity: 0.58;
                filter: grayscale(0.3);
            }

            .nv-map-node-label {
                position: absolute;
                z-index: 4;
                min-width: 110px;
                max-width: 180px;
                padding: 7px 10px;
                border-radius: 12px;
                background: rgba(18, 16, 14, 0.92);
                border: 1px solid rgba(245, 211, 122, 0.18);
                color: var(--text, #f2e7d5);
                box-shadow: 0 10px 18px rgba(0,0,0,0.28);
                backdrop-filter: blur(4px);
                font-size: 0.82rem;
                line-height: 1.2;
                pointer-events: none;
                text-align: center;
                transform: translate(-50%, calc(-100% - 18px));
                transform-origin: center bottom;
            }

            .nv-map-node-label strong {
                display: block;
                color: var(--gold, #f5d37a);
                margin-bottom: 3px;
                font-size: 0.86rem;
            }

            .nv-map-world {
                will-change: transform;
            }

            .nv-map-connections {
                display: none;
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: visible;
                pointer-events: none;
                z-index: 1;
            }

            .nv-map-connection-line {
                stroke: rgba(210, 56, 56, 0.92);
                stroke-width: 0.22;
                stroke-linecap: round;
                stroke-linejoin: round;
                stroke-dasharray: 0.9 0.55;
                opacity: 0.95;
                filter: drop-shadow(0 0 1px rgba(80, 10, 10, 0.45));
            }

            .nv-map-node-label,
            .nv-map-node-pin {
                will-change: transform;
            }

            .nv-map-node-label span {
                color: var(--text-muted, #c7bdad);
                font-size: 0.74rem;
            }

            .nv-map-hide-labels .nv-map-node-label {
                display: none;
            }

            .nv-map-low-labels .nv-map-node-label:not(.is-important-label) {
                display: none;
            }

            .nv-map-legend ul {
                margin: 8px 0 0;
                padding: 0;
                list-style: none;
                display: grid;
                gap: 6px;
            }

            .nv-map-legend li {
                display: flex;
                align-items: center;
                color: var(--text-muted, #c7bdad);
                font-size: 0.85rem;
            }


            /*
               v0.9.4.7 — sélection 100% fixe
               Aucune animation de transform, scale, inset ou déplacement.
               La bulle reste strictement à sa position.
            */

            .nv-map-node {
                transform: translate(-50%, -50%) !important;
            }

            .nv-map-node-pin {
                transform: none !important;
                animation: none !important;
                transition:
                    box-shadow 0.14s ease,
                    opacity 0.14s ease,
                    filter 0.14s ease !important;
            }

            .nv-map-node:hover .nv-map-node-pin,
            .nv-map-node.is-selected .nv-map-node-pin,
            .nv-map-node.is-selected:hover .nv-map-node-pin,
            .nv-map-node.is-current .nv-map-node-pin {
                transform: none !important;
                animation: none !important;
            }

            .nv-map-node-pin::after {
                inset: -7px !important;
                transform: none !important;
                animation: none !important;
                transition:
                    opacity 0.14s ease,
                    border-color 0.14s ease !important;
            }

            .nv-map-node.is-selected .nv-map-node-pin {
                box-shadow:
                    0 0 0 4px rgba(245, 211, 122, 0.28),
                    0 0 18px rgba(245, 211, 122, 0.24),
                    0 6px 16px rgba(0,0,0,0.45) !important;
            }

            .nv-map-node.is-selected .nv-map-node-pin::after {
                opacity: 1 !important;
                border-color: rgba(245, 211, 122, 0.62) !important;
            }

            .nv-map-node.is-current .nv-map-node-pin {
                box-shadow:
                    0 0 0 4px rgba(91, 219, 124, 0.24),
                    0 0 16px rgba(91, 219, 124, 0.18),
                    0 6px 16px rgba(0,0,0,0.45) !important;
            }

            @keyframes nvMapPinRingPulse {
                from { opacity: 1; }
                to { opacity: 1; }
            }

            @keyframes nvMapPinPulse {
                from { opacity: 1; }
                to { opacity: 1; }
            }



            /*
               v0.9.4.13 — labels et liste compactes
            */

            .nv-map-node-label {
                min-width: 0 !important;
                max-width: 170px !important;
                padding: 5px 9px !important;
                border-radius: 999px !important;
                background:
                    linear-gradient(180deg, rgba(23, 19, 14, 0.92), rgba(8, 7, 5, 0.90)) !important;
                border: 1px solid rgba(245, 211, 122, 0.30) !important;
                box-shadow:
                    0 4px 12px rgba(0, 0, 0, 0.35),
                    inset 0 0 0 1px rgba(255, 255, 255, 0.035) !important;
                white-space: nowrap !important;
                text-align: center !important;
                transform: translate(-50%, calc(-100% - 14px)) !important;
            }

            .nv-map-node-label strong {
                margin: 0 !important;
                font-size: 0.78rem !important;
                line-height: 1.05 !important;
                color: var(--gold, #f5d37a) !important;
                text-shadow: 0 1px 2px rgba(0,0,0,0.7);
            }

            .nv-map-node-label span {
                display: none !important;
            }

            .nv-map-node-label.is-important-label {
                min-width: 118px !important;
                border-radius: 11px !important;
                padding: 7px 10px !important;
                white-space: normal !important;
                background:
                    radial-gradient(circle at top, rgba(245, 211, 122, 0.10), transparent 55%),
                    rgba(12, 10, 8, 0.94) !important;
                border-color: rgba(245, 211, 122, 0.48) !important;
            }

            .nv-map-node-label.is-important-label strong {
                margin-bottom: 3px !important;
                font-size: 0.82rem !important;
            }

            .nv-map-node-label.is-important-label span {
                display: block !important;
                font-size: 0.68rem !important;
                opacity: 0.82;
            }

            .nv-map-current-card {
                min-height: 88px;
                height: 88px;
                flex: 0 0 88px;
                overflow: hidden;
                background:
                    radial-gradient(circle at top right, rgba(91, 219, 124, 0.10), transparent 50%),
                    rgba(255,255,255,0.045);
                border: 1px solid rgba(91, 219, 124, 0.24);
                border-left: 4px solid rgba(91, 219, 124, 0.76);
                border-radius: 14px;
                padding: 11px 12px;
                box-sizing: border-box;
            }

            .nv-map-current-card h3 {
                margin: 0 0 5px;
                color: var(--gold, #f5d37a);
                font-size: 0.98rem;
                line-height: 1.15;
            }

            .nv-map-current-card p {
                margin: 0;
                color: var(--text-muted, #c7bdad);
                font-size: 0.82rem;
                line-height: 1.28;
            }

            .nv-map-list {
                gap: 7px !important;
            }

            .nv-map-list-card,
            .nv-map-region-card {
                padding: 9px 10px !important;
                border-radius: 12px !important;
            }

            .nv-map-list-card h4,
            .nv-map-region-card h4 {
                margin: 0 !important;
                font-size: 0.92rem;
                line-height: 1.15;
            }

            .nv-map-list-top {
                margin-bottom: 0 !important;
                align-items: center !important;
            }

            .nv-map-mini-status {
                font-size: 0.72rem !important;
                opacity: 0.82;
            }

            .nv-map-selected-details {
                margin-top: 9px;
                padding-top: 9px;
                border-top: 1px solid rgba(245, 211, 122, 0.10);
            }

            .nv-map-selected-details p {
                margin: 0 0 8px !important;
                font-size: 0.83rem;
                line-height: 1.34;
            }

            .nv-map-selected-details .nv-map-tags {
                margin-top: 8px !important;
                margin-bottom: 0 !important;
            }

            .nv-map-selected-details .nv-map-card-actions {
                margin-top: 9px !important;
            }

            .nv-map-sidepanel .nv-map-legend {
                display: none;
            }


            @media (max-width: 1100px) {
                #zonesContainer,
                #regionsContainer {
                    grid-template-columns: 1fr;
                    height: auto;
                }

                .carte-container {
                    min-height: 500px;
                }
            }

            @media (max-width: 750px) {
                .nv-map-toolbar {
                    position: absolute;
                    flex-direction: column;
                    align-items: stretch;
                }

                .nv-map-right-tools {
                    align-items: stretch;
                }

                .nv-map-legend-inline {
                    justify-content: flex-start;
                }
            }
        `;

        document.head.appendChild(style);
    }

    function nvMapGetRegionActuelle() {
        return Game.data.regionsMonde.find(region => region.id === Game.data.personnage.regionMondeActuelle) ?? null;
    }

    function nvMapGetZonesActuelles() {
        const region = nvMapGetRegionActuelle();
        return region?.zones ?? [];
    }

    function nvMapGetNodeColor(element, mode) {
        if (mode === "region") {
            return element.couleur || "#6aa8ff";
        }

        const type = element.type || "exploration";

        if (type === "ville" || type === "village" || type === "auberge") return "#4caf50";
        if (type === "donjon" || type === "ruines" || type === "grotte") return "#cf5d56";
        if (type === "montagne") return "#8e8e98";
        if (type === "tour" || type === "temple") return "#8c6cff";
        if (type === "boss") return "#d9862b";

        return "#3f87e8";
    }

    function nvMapGetStatusText(element, mode) {
        if (mode === "region") {
            return element.id === Game.data.personnage.regionMondeActuelle ? "Région actuelle" : "Région";
        }

        const unlocked =
            (Game.data.personnage.zonesDebloquees ?? []).includes(element.id);

        const current =
            Game.data.personnage.zoneActuelle === element.id;

        if (current) return "Zone actuelle";
        if (!unlocked) return "Verrouillée";

        return "Accessible";
    }

    function nvMapGetTypeText(type) {
        const map = {
            ville: "Ville",
            village: "Village",
            auberge: "Auberge",
            exploration: "Exploration",
            foret: "Forêt",
            donjon: "Donjon",
            ruines: "Ruines",
            grotte: "Grotte",
            montagne: "Montagne",
            boss: "Boss",
            camp: "Camp",
            temple: "Temple",
            tour: "Tour"
        };

        return map[type] || type || "Zone";
    }


    function nvMapGetCanvasSize(canvasId) {
        const canvas =
            document.getElementById(canvasId);

        const container =
            canvas?.parentElement;

        if (!canvas || !container) {
            return {
                width: 1,
                height: 1
            };
        }

        return {
            width: Math.max(1, Math.floor(container.clientWidth || canvas.width || 1)),
            height: Math.max(1, Math.floor(container.clientHeight || canvas.height || 1))
        };
    }

    function nvMapGetWorldSize(canvasId) {
        const taille =
            nvMapGetCanvasSize(canvasId);

        /*
            La carte logique est volontairement plus grande que la fenêtre.
            Plus tard, un background PNG pourra prendre exactement cette zone.
            Le pan sera limité à ce carré/rectangle de monde.
        */
        const multiplicateur =
            canvasId === "carteRegions"
                ? 1.35
                : 1.55;

        const coteBase =
            Math.max(taille.width, taille.height);

        return {
            width: Math.round(coteBase * multiplicateur),
            height: Math.round(coteBase * multiplicateur)
        };
    }

    function nvMapClampPan(canvasId) {
        const state =
            nvMapState(canvasId);

        const taille =
            nvMapGetCanvasSize(canvasId);

        const monde =
            nvMapGetWorldSize(canvasId);

        state.worldWidth =
            monde.width;

        state.worldHeight =
            monde.height;

        const scaledWidth =
            monde.width * state.scale;

        const scaledHeight =
            monde.height * state.scale;

        /*
            Si le monde est plus petit que la fenêtre à cause du dézoom,
            on le centre au lieu de laisser un pan infini.
        */
        if (scaledWidth <= taille.width) {
            state.offsetX =
                (taille.width - scaledWidth) / 2;
        } else {
            state.offsetX =
                nvMapClamp(
                    state.offsetX,
                    taille.width - scaledWidth,
                    0
                );
        }

        if (scaledHeight <= taille.height) {
            state.offsetY =
                (taille.height - scaledHeight) / 2;
        } else {
            state.offsetY =
                nvMapClamp(
                    state.offsetY,
                    taille.height - scaledHeight,
                    0
                );
        }
    }

    function nvMapApplyTransform(canvasId) {
        nvMapClampPan(canvasId);

        const canvas =
            document.getElementById(canvasId);

        if (!canvas) return;

        const container =
            canvas.parentElement;

        const overlay =
            container?.querySelector(".nv-map-overlay");

        const world =
            overlay?.querySelector(".nv-map-world");

        if (!world) return;

        const monde =
            nvMapGetWorldSize(canvasId);

        world.style.width =
            `${monde.width}px`;

        world.style.height =
            `${monde.height}px`;

        const state =
            nvMapState(canvasId);

        world.style.transform =
            `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.scale})`;

        const zoomLabel =
            container.querySelector(".nv-map-zoom-label");

        if (zoomLabel) {
            zoomLabel.textContent =
                `${Math.round(state.scale * 100)}%`;
        }

        overlay.classList.toggle("nv-map-hide-labels", state.scale < 0.58);
        overlay.classList.toggle("nv-map-low-labels", state.scale >= 0.58 && state.scale < 0.78);
    }

    function nvMapResetView(canvasId, redraw = true) {
        const state =
            nvMapState(canvasId);

        state.scale =
            1;

        const taille =
            nvMapGetCanvasSize(canvasId);

        const monde =
            nvMapGetWorldSize(canvasId);

        state.offsetX =
            (taille.width - monde.width) / 2;

        state.offsetY =
            (taille.height - monde.height) / 2;

        nvMapClampPan(canvasId);

        if (redraw) {
            if (canvasId === "carteMonde") dessinerCarteMonde();
            if (canvasId === "carteRegions") dessinerCarteRegions();
        } else {
            nvMapApplyTransform(canvasId);
        }
    }

    function nvMapZoom(canvasId, delta, pivotX = null, pivotY = null) {
        const canvas =
            document.getElementById(canvasId);

        if (!canvas) return;

        const state =
            nvMapState(canvasId);

        const oldScale =
            state.scale;

        const factor =
            delta > 0 ? 1.12 : 0.89;

        const newScale =
            nvMapClamp(oldScale * factor, 0.45, 2.6);

        if (newScale === oldScale) return;

        const rect =
            canvas.getBoundingClientRect();

        const px =
            pivotX ?? rect.width / 2;

        const py =
            pivotY ?? rect.height / 2;

        const worldX =
            (px - state.offsetX) / oldScale;

        const worldY =
            (py - state.offsetY) / oldScale;

        state.scale =
            newScale;

        state.offsetX =
            px - worldX * newScale;

        state.offsetY =
            py - worldY * newScale;

        nvMapClampPan(canvasId);

        if (canvasId === "carteMonde") dessinerCarteMonde();
        if (canvasId === "carteRegions") dessinerCarteRegions();
    }

    function nvMapAttachPanZoom(canvasId) {
        const canvas =
            document.getElementById(canvasId);

        if (!canvas) return;

        const container =
            canvas.parentElement;

        if (!container || container.__NV_MAP_PANZOOM) return;

        container.__NV_MAP_PANZOOM =
            true;

        container.addEventListener("wheel", event => {
            event.preventDefault();

            const rect =
                container.getBoundingClientRect();

            nvMapZoom(
                canvasId,
                event.deltaY < 0 ? 1 : -1,
                event.clientX - rect.left,
                event.clientY - rect.top
            );
        }, { passive: false });

        container.addEventListener("pointerdown", event => {
            if (event.button !== 0) return;

            const target =
                event.target;

            if (
                target.closest?.("button") ||
                target.closest?.(".nv-map-toolbar") ||
                target.closest?.(".nv-map-node")
            ) {
                return;
            }

            const state =
                nvMapState(canvasId);

            state.isDragging =
                true;

            state.lastX =
                event.clientX;

            state.lastY =
                event.clientY;

            container.classList.add("is-dragging");
            container.setPointerCapture?.(event.pointerId);
        });

        container.addEventListener("pointermove", event => {
            const state =
                nvMapState(canvasId);

            if (!state.isDragging) return;

            const dx =
                event.clientX - state.lastX;

            const dy =
                event.clientY - state.lastY;

            state.lastX =
                event.clientX;

            state.lastY =
                event.clientY;

            state.offsetX += dx;
            state.offsetY += dy;

            nvMapClampPan(canvasId);
            nvMapApplyTransform(canvasId);

            nvMapRedrawCanvasOnly(canvasId);
        });

        function stopDrag(event) {
            const state =
                nvMapState(canvasId);

            state.isDragging =
                false;

            container.classList.remove("is-dragging");

            try {
                container.releasePointerCapture?.(event.pointerId);
            } catch (erreur) {
                // pas grave
            }
        }

        container.addEventListener("pointerup", stopDrag);
        container.addEventListener("pointercancel", stopDrag);
        container.addEventListener("pointerleave", stopDrag);
    }


    function nvMapGetElementsForCanvas(canvasId) {
        if (canvasId === "carteMonde") {
            return nvMapGetZonesActuelles();
        }

        if (canvasId === "carteRegions") {
            return Game.data.regionsMonde || [];
        }

        return [];
    }

    function nvMapGetOptionsForCanvas(canvasId) {
        if (canvasId === "carteMonde") {
            return {
                mode: "zone",
                showConnections: true,
                selectionId: Game.ui.zoneSelectionnee,
                currentId: Game.data.personnage.zoneActuelle
            };
        }

        if (canvasId === "carteRegions") {
            return {
                mode: "region",
                showConnections: true,
                selectionId: Game.ui.regionSelectionnee,
                currentId: Game.data.personnage.regionMondeActuelle
            };
        }

        return {
            mode: "zone",
            showConnections: true
        };
    }

    function nvMapRedrawCanvasOnly(canvasId) {
        nvMapDrawCanvas(
            canvasId,
            nvMapGetElementsForCanvas(canvasId),
            nvMapGetOptionsForCanvas(canvasId)
        );
    }

    function nvMapDrawCanvas(canvasId, elements, options = {}) {
        const canvas =
            document.getElementById(canvasId);

        if (!canvas) return;

        const container =
            canvas.parentElement;

        if (!container) return;

        const taille =
            nvMapGetCanvasSize(canvasId);

        const monde =
            nvMapGetWorldSize(canvasId);

        const width =
            monde.width;

        const height =
            monde.height;

        canvas.width =
            taille.width;

        canvas.height =
            taille.height;

        const ctx =
            canvas.getContext("2d");

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, taille.width, taille.height);

        const bg =
            ctx.createLinearGradient(0, 0, 0, taille.height);

        bg.addColorStop(0, "#2b261f");
        bg.addColorStop(1, "#171511");

        ctx.fillStyle =
            bg;

        ctx.fillRect(0, 0, taille.width, taille.height);

        const state =
            nvMapState(canvasId);

        state.worldWidth =
            width;

        state.worldHeight =
            height;

        nvMapClampPan(canvasId);

        ctx.setTransform(state.scale, 0, 0, state.scale, state.offsetX, state.offsetY);

        /*
            Zone de monde bornée : plus tard elle pourra être remplacée
            ou recouverte par un PNG de fond fantasy.
        */
        const worldBg =
            ctx.createLinearGradient(0, 0, 0, height);

        worldBg.addColorStop(0, "#302a22");
        worldBg.addColorStop(1, "#1d1a15");

        ctx.fillStyle =
            worldBg;

        ctx.fillRect(0, 0, width, height);

        const backgroundImage =
            nvMapGetBackgroundImage(canvasId, options);

        if (backgroundImage?.complete && backgroundImage.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha =
                canvasId === "carteRegions"
                    ? 0.96
                    : 0.92;
            ctx.drawImage(backgroundImage, 0, 0, width, height);
            ctx.restore();
        }

        ctx.strokeStyle =
            "rgba(245, 211, 122, 0.20)";

        ctx.lineWidth =
            2 / Math.max(0.7, state.scale);

        ctx.strokeRect(0, 0, width, height);

        ctx.fillStyle =
            "rgba(245, 211, 122, 0.018)";

        for (let i = 0; i < 44; i++) {
            ctx.beginPath();
            ctx.arc(
                (width / 43) * i + ((i % 3) * 11),
                (height / 17) * (i % 17) + 18,
                1 + (i % 4),
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        ctx.strokeStyle =
            "rgba(245, 211, 122, 0.055)";

        ctx.lineWidth =
            1;

        for (let x = 40; x < width; x += 80) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let y = 40; y < height; y += 80) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        const byId =
            Object.fromEntries(elements.map(element => [element.id, element]));

        if (false && options.showConnections && options.renderConnectionsInCanvas !== false) {
            elements.forEach(element => {
                if (!Array.isArray(element.connexions)) return;

                const x1 =
                    (Number(element.mapX || 50) / 100) * width;

                const y1 =
                    (Number(element.mapY || 50) / 100) * height;

                element.connexions.forEach(idConnexion => {
                    const cible =
                        byId[idConnexion];

                    if (!cible) return;
                    if (element.id > cible.id) return;

                    const x2 =
                        (Number(cible.mapX || 50) / 100) * width;

                    const y2 =
                        (Number(cible.mapY || 50) / 100) * height;

                    const gradient =
                        ctx.createLinearGradient(x1, y1, x2, y2);

                    gradient.addColorStop(0, "rgba(245, 211, 122, 0.24)");
                    gradient.addColorStop(1, "rgba(92, 161, 255, 0.18)");

                    ctx.strokeStyle =
                        gradient;

                    ctx.lineWidth =
                        3 / Math.max(0.7, state.scale);

                    ctx.lineCap =
                        "round";

                    ctx.lineJoin =
                        "round";

                    ctx.setLineDash([10 / Math.max(0.8, state.scale), 8 / Math.max(0.8, state.scale)]);
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                    ctx.setLineDash([]);
                });
            });
        }
    }

    function nvMapRenderConnectionOverlay(world, elements) {
        if (!world) return;

        const svgNS =
            "http://www.w3.org/2000/svg";

        const svg =
            document.createElementNS(svgNS, "svg");

        svg.setAttribute("class", "nv-map-connections");
        svg.setAttribute("viewBox", "0 0 100 100");
        svg.setAttribute("preserveAspectRatio", "none");

        const byId =
            Object.fromEntries(elements.map(element => [element.id, element]));

        elements.forEach(element => {
            if (!Array.isArray(element.connexions)) return;

            const x1 =
                Number(element.mapX || 50);

            const y1 =
                Number(element.mapY || 50);

            element.connexions.forEach(idConnexion => {
                const cible = byId[idConnexion];
                if (!cible) return;
                if (element.id > cible.id) return;

                const x2 = Number(cible.mapX || 50);
                const y2 = Number(cible.mapY || 50);

                const line = document.createElementNS(svgNS, "line");
                line.setAttribute("class", "nv-map-connection-line");
                line.setAttribute("x1", String(x1));
                line.setAttribute("y1", String(y1));
                line.setAttribute("x2", String(x2));
                line.setAttribute("y2", String(y2));
                line.setAttribute("vector-effect", "non-scaling-stroke");
                line.setAttribute("shape-rendering", "geometricPrecision");
                svg.appendChild(line);
            });
        });

        world.appendChild(svg);
    }

    function nvMapRender(canvasId, elements, options = {}) {
        const canvas =
            document.getElementById(canvasId);

        if (!canvas) return;

        const container =
            canvas.parentElement;

        if (!container) return;

        container.classList.add("nv-map-enhanced");

        nvMapAttachPanZoom(canvasId);

        let toolbar =
            container.querySelector(".nv-map-toolbar");

        if (!toolbar) {
            toolbar =
                document.createElement("div");

            toolbar.className =
                "nv-map-toolbar";

            container.appendChild(toolbar);
        }

        toolbar.innerHTML = `
            <div class="nv-map-titlebox">
                <strong>${options.toolbarTitle || "Carte"}</strong>
                <span>${options.toolbarSubtitle || "Molette pour zoomer, clic-glisser pour déplacer."}</span>
                <div style="margin-top:8px;">
                    <button
                        type="button"
                        class="nv-map-close-main"
                        onclick="${canvasId === "carteRegions" ? "fermerRegions()" : "fermerZones()"}"
                    >
                        ✕ Fermer
                    </button>
                </div>
            </div>

            <div class="nv-map-right-tools">
                <div class="nv-map-controls">
                    <button onclick="nvMapZoom('${canvasId}', -1)">−</button>
                    <span class="nv-map-zoom-label">100%</span>
                    <button onclick="nvMapZoom('${canvasId}', 1)">+</button>
                    <button onclick="nvMapResetView('${canvasId}')">Reset</button>
                </div>

                <div class="nv-map-legend-inline">
                    ${(options.legendInline || []).map(item => `<span><i class="dot" style="background:${item.color};"></i>${item.label}</span>`).join("")}
                </div>
            </div>
        `;

        let overlay =
            container.querySelector(".nv-map-overlay");

        if (!overlay) {
            overlay =
                document.createElement("div");

            overlay.className =
                "nv-map-overlay";

            container.appendChild(overlay);
        }

        overlay.innerHTML =
            `<div class="nv-map-world"></div>`;

        const world =
            overlay.querySelector(".nv-map-world");

        const monde =
            nvMapGetWorldSize(canvasId);

        world.style.width =
            `${monde.width}px`;

        world.style.height =
            `${monde.height}px`;

        nvMapDrawCanvas(canvasId, elements, { ...options, renderConnectionsInCanvas: false });

        if (false && options.showConnections) {
            nvMapRenderConnectionOverlay(world, elements);
        }

        const width =
            canvas.width;

        const height =
            canvas.height;

        const state =
            nvMapState(canvasId);

        elements.forEach(element => {
            const xPercent =
                Number(element.mapX || 50);

            const yPercent =
                Number(element.mapY || 50);

            const color =
                nvMapGetNodeColor(element, options.mode);

            const isSelected =
                options.selectionId === element.id;

            const isCurrent =
                options.currentId === element.id;

            const isLocked =
                options.mode === "zone" &&
                !(Game.data.personnage.zonesDebloquees ?? []).includes(element.id);

            const status =
                nvMapGetStatusText(element, options.mode);

            const node =
                document.createElement("button");

            node.className =
                `nv-map-node ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""} ${isLocked ? "is-locked" : ""}`;

            node.style.left =
                `${xPercent}%`;

            node.style.top =
                `${yPercent}%`;

            node.type =
                "button";

            node.title =
                `${element.nom} — ${status}`;

            node.innerHTML =
                `<span class="nv-map-node-pin" style="background:${color};"></span>`;

            node.addEventListener("click", event => {
                event.stopPropagation();
                options.onSelect?.(element.id);
            });

            world.appendChild(node);

            const label =
                document.createElement("div");

            const important =
                isSelected || isCurrent;

            label.className =
                `nv-map-node-label ${important ? "is-important-label" : ""}`;

            label.style.left =
                `${xPercent}%`;

            label.style.top =
                `${yPercent}%`;

            label.innerHTML =
                important
                    ? `
                        <strong>${element.nom}</strong>
                        <span>${status}${options.mode === "zone" && element.type ? ` • ${nvMapGetTypeText(element.type)}` : ""}</span>
                    `
                    : `
                        <strong>${element.nom}</strong>
                    `;

            world.appendChild(label);
        });

        nvMapApplyTransform(canvasId);
    }

    function nvMapBuildZoneSideList() {
        const zones =
            nvMapGetZonesActuelles();

        const zoneActuelle =
            zones.find(zone => zone.id === Game.data.personnage.zoneActuelle) ||
            zones[0] ||
            null;

        const zoneSelectionnee =
            zones.find(zone => zone.id === Game.ui.zoneSelectionnee) ||
            zoneActuelle ||
            zones[0] ||
            null;

        if (zoneSelectionnee) {
            Game.ui.zoneSelectionnee =
                zoneSelectionnee.id;
        }

        const currentCard =
            zoneActuelle
                ? `
                    <div class="nv-map-current-card">
                        <h3>Zone actuelle</h3>
                        <p>
                            <strong>${zoneActuelle.nom}</strong>
                            <br>
                            ${nvMapGetTypeText(zoneActuelle.type)} · ${zoneActuelle.tempsVoyage ?? 1} h
                        </p>
                    </div>
                `
                : "";

        const list =
            zones.map(zone => {
                const isSelected =
                    Game.ui.zoneSelectionnee === zone.id;

                const isCurrent =
                    Game.data.personnage.zoneActuelle === zone.id;

                const unlocked =
                    (Game.data.personnage.zonesDebloquees ?? []).includes(zone.id);

                const details =
                    isSelected
                        ? `
                            <div class="nv-map-selected-details">
                                <p>${zone.description || "Aucune description."}</p>

                                <div class="nv-map-tags">
                                    <span class="nv-map-tag">${nvMapGetTypeText(zone.type)}</span>
                                    <span class="nv-map-tag">${unlocked ? "Accessible" : "Verrouillée"}</span>
                                    <span class="nv-map-tag">${zone.tempsVoyage ?? 1} h</span>
                                </div>

                                <div class="nv-map-card-actions" onclick="event.stopPropagation();">
                                    ${
                                        isCurrent
                                            ? `<button disabled>Zone actuelle</button>`
                                            : `<button ${unlocked ? "" : "disabled"} onclick="voyagerVersZone('${zone.id}')">Voyager</button>`
                                    }
                                    <button onclick="selectionnerMap('${zone.id}', 'zone')">Voir</button>
                                </div>
                            </div>
                        `
                        : "";

                return `
                    <div
                        class="nv-map-list-card ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""}"
                        onclick="selectionnerMap('${zone.id}', 'zone')"
                    >
                        <div class="nv-map-list-top">
                            <h4>${zone.nom}</h4>
                            <span class="nv-map-mini-status">
                                ${!unlocked ? "🔒" : isCurrent ? "Actuelle" : ""}
                            </span>
                        </div>

                        ${details}
                    </div>
                `;
            }).join("");

        return `
            <div class="nv-map-sidepanel">
                ${currentCard}
                <div class="nv-map-list">
                    ${list}
                </div>
            </div>
        `;
    }

    function nvMapBuildRegionSideList() {
        const regions =
            Game.data.regionsMonde || [];

        const regionActuelle =
            regions.find(region => region.id === Game.data.personnage.regionMondeActuelle) ||
            regions[0] ||
            null;

        const regionSelectionnee =
            regions.find(region => region.id === Game.ui.regionSelectionnee) ||
            regionActuelle ||
            regions[0] ||
            null;

        if (regionSelectionnee) {
            Game.ui.regionSelectionnee =
                regionSelectionnee.id;
        }

        const currentCard =
            regionActuelle
                ? `
                    <div class="nv-map-current-card">
                        <h3>Région actuelle</h3>
                        <p>
                            <strong>${regionActuelle.nom}</strong>
                            <br>
                            ${(regionActuelle.zones || []).length} zones
                        </p>
                    </div>
                `
                : "";

        const list =
            regions.map(region => {
                const isSelected =
                    Game.ui.regionSelectionnee === region.id;

                const isCurrent =
                    Game.data.personnage.regionMondeActuelle === region.id;

                const details =
                    isSelected
                        ? `
                            <div class="nv-map-selected-details">
                                <p>${region.description || "Aucune description."}</p>

                                <div class="nv-map-tags">
                                    <span class="nv-map-tag">Zones : ${(region.zones || []).length}</span>
                                    <span class="nv-map-tag">${isCurrent ? "Actuelle" : "Région"}</span>
                                </div>

                                <div class="nv-map-card-actions" onclick="event.stopPropagation();">
                                    ${
                                        isCurrent
                                            ? `<button disabled>Région actuelle</button>`
                                            : `<button onclick="changerRegionMonde('${region.id}'); fermerRegions(); ouvrirZones();">Voyager</button>`
                                    }
                                    <button onclick="selectionnerMap('${region.id}', 'region')">Voir</button>
                                </div>
                            </div>
                        `
                        : "";

                return `
                    <div
                        class="nv-map-region-card ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""}"
                        onclick="selectionnerMap('${region.id}', 'region')"
                    >
                        <div class="nv-map-list-top">
                            <h4>${region.nom}</h4>
                            <span class="nv-map-mini-status">
                                ${isCurrent ? "Actuelle" : ""}
                            </span>
                        </div>

                        ${details}
                    </div>
                `;
            }).join("");

        return `
            <div class="nv-map-sidepanel">
                ${currentCard}
                <div class="nv-map-list">
                    ${list}
                </div>
            </div>
        `;
    }

    function selectionnerMap(id, type) {
        if (type === "zone") {
            Game.ui.zoneSelectionnee =
                id;

            ouvrirZones();
            return;
        }

        if (type === "region") {
            Game.ui.regionSelectionnee =
                id;

            ouvrirRegions();
        }
    }

    function dessinerCarteMonde() {
        const region =
            nvMapGetRegionActuelle();

        nvMapRender("carteMonde", nvMapGetZonesActuelles(), {
            mode: "zone",
            showConnections: false,
            selectionId: Game.ui.zoneSelectionnee,
            currentId: Game.data.personnage.zoneActuelle,
            toolbarTitle: `Carte régionale — ${region?.nom || "Région"}`,
            toolbarSubtitle: "Molette = zoom · clic-glisser = déplacement · les noms suivent le zoom et disparaissent au dézoom.",
            legendInline: [
                { label: "Sûr", color: "#4caf50" },
                { label: "Exploration", color: "#3f87e8" },
                { label: "Danger", color: "#cf5d56" },
                { label: "Mystique", color: "#8c6cff" },
                { label: "Boss", color: "#d9862b" }
            ],
            onSelect: id => selectionnerMap(id, "zone")
        });
    }

    function dessinerCarteRegions() {
        nvMapRender("carteRegions", Game.data.regionsMonde || [], {
            mode: "region",
            showConnections: false,
            selectionId: Game.ui.regionSelectionnee,
            currentId: Game.data.personnage.regionMondeActuelle,
            toolbarTitle: "Carte du monde",
            toolbarSubtitle: "Molette = zoom · clic-glisser = déplacement.",
            legendInline: [
                { label: "Région", color: "#6aa8ff" },
                { label: "Actuelle", color: "#4caf50" }
            ],
            backgroundImage: NV_MAP_WORLD_IMAGE_SRC,
            onSelect: id => selectionnerMap(id, "region")
        });
    }

    function ouvrirZones() {
        const zonesActuelles =
            nvMapGetZonesActuelles();

        if (!zonesActuelles.length) {
            ajouterJournal?.("Aucune zone disponible dans cette région.");
            return;
        }

        if (!Game.ui.zoneSelectionnee || !zonesActuelles.some(zone => zone.id === Game.ui.zoneSelectionnee)) {
            Game.ui.zoneSelectionnee =
                Game.data.personnage.zoneActuelle || zonesActuelles[0].id;
        }

        const listeZones =
            document.getElementById("listeZones");

        const zonesModal =
            document.getElementById("zonesModal");

        if (!listeZones || !zonesModal) return;

        listeZones.innerHTML =
            nvMapBuildZoneSideList();

        zonesModal.style.display =
            "flex";

        setTimeout(() => {
            dessinerCarteMonde();
        }, 20);
    }

    function ouvrirRegions() {
        fermerZones();

        const listeRegions =
            document.getElementById("listeRegions");

        const regionsModal =
            document.getElementById("regionsModal");

        if (!listeRegions || !regionsModal) return;

        if (!Game.ui.regionSelectionnee || !(Game.data.regionsMonde || []).some(region => region.id === Game.ui.regionSelectionnee)) {
            Game.ui.regionSelectionnee =
                Game.data.personnage.regionMondeActuelle || Game.data.regionsMonde?.[0]?.id || null;
        }

        listeRegions.innerHTML =
            nvMapBuildRegionSideList();

        regionsModal.style.display =
            "flex";

        setTimeout(() => {
            dessinerCarteRegions();
        }, 20);
    }

    function fermerZones() {
        const modal =
            document.getElementById("zonesModal");

        if (modal) {
            modal.style.display =
                "none";
        }
    }

    function fermerRegions() {
        const modal =
            document.getElementById("regionsModal");

        if (modal) {
            modal.style.display =
                "none";
        }
    }

    function nvMapOnResize() {
        if (document.getElementById("zonesModal")?.style.display === "flex") {
            dessinerCarteMonde();
        }

        if (document.getElementById("regionsModal")?.style.display === "flex") {
            dessinerCarteRegions();
        }
    }

    nvMapInjectStyles();

    window.nvMapZoom =
        nvMapZoom;

    window.nvMapResetView =
        nvMapResetView;

    window.selectionnerMap =
        selectionnerMap;

    window.ouvrirZones =
        ouvrirZones;

    window.ouvrirRegions =
        ouvrirRegions;

    window.fermerZones =
        fermerZones;

    window.fermerRegions =
        fermerRegions;

    window.dessinerCarteMonde =
        dessinerCarteMonde;

    window.dessinerCarteRegions =
        dessinerCarteRegions;

    window.obtenirRegionMondeActuelle =
        nvMapGetRegionActuelle;

    window.obtenirZonesActuelles =
        nvMapGetZonesActuelles;

    window.removeEventListener("resize", nvMapOnResize);
    window.addEventListener("resize", nvMapOnResize);

    console.log(`✅ Map_Refonte.js chargé — ${NV_MAP_VERSION}`);
})();