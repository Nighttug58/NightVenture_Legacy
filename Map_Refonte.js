(function () {
    "use strict";

    const NV_MAP_VERSION = "v0.9.4.14-no-emoji-direct";
    const NV_MAP_WORLD_IMAGE_SRC = "carte_monde_aetheria_v1.png";
    const NV_MAP_IMAGE_CACHE = {};

    function nvMapEscape(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function nvMapGetRegionActuelle() {
        return (Game.data?.regionsMonde || []).find(region => region.id === Game.data?.personnage?.regionMondeActuelle) || Game.data?.regionsMonde?.[0] || null;
    }

    function nvMapGetZonesActuelles() {
        const region = nvMapGetRegionActuelle();
        return Array.isArray(region?.zones) ? region.zones : [];
    }

    function nvMapGetImage(src) {
        if (!src) return null;
        if (!NV_MAP_IMAGE_CACHE[src]) {
            const image = new Image();
            image.decoding = "async";
            image.src = src;
            image.addEventListener("load", () => {
                try { dessinerCarteRegions(); } catch (erreur) {}
            });
            NV_MAP_IMAGE_CACHE[src] = image;
        }
        return NV_MAP_IMAGE_CACHE[src];
    }

    function nvMapGetTypeText(type) {
        const map = {
            ville: "Ville",
            village: "Village",
            auberge: "Auberge",
            exploration: "Exploration",
            foret: "Foret",
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

    function nvMapGetNodeColor(element, mode) {
        if (mode === "region") return element.couleur || "#6aa8ff";
        const type = element.type || "exploration";
        if (["ville", "village", "auberge"].includes(type)) return "#4caf50";
        if (["donjon", "ruines", "grotte"].includes(type)) return "#cf5d56";
        if (type === "montagne") return "#8e8e98";
        if (["tour", "temple"].includes(type)) return "#8c6cff";
        if (type === "boss") return "#d9862b";
        return "#3f87e8";
    }

    function nvMapGetStatusText(element, mode) {
        if (mode === "region") return element.id === Game.data.personnage.regionMondeActuelle ? "Region actuelle" : "Region";
        const unlocked = (Game.data.personnage.zonesDebloquees || []).includes(element.id);
        const current = Game.data.personnage.zoneActuelle === element.id;
        if (current) return "Zone actuelle";
        if (!unlocked) return "Verrouillee";
        return "Accessible";
    }

    function nvMapInjectStyles() {
        if (document.getElementById("nvMapRefonteStyleV09414")) return;
        const style = document.createElement("style");
        style.id = "nvMapRefonteStyleV09414";
        style.textContent = `
            .modal-zones { width:min(1450px,96vw); max-width:1450px; max-height:92vh; overflow:hidden; padding:16px; background:linear-gradient(180deg, rgba(33,27,21,0.98), rgba(18,16,14,0.98)); border:1px solid rgba(245,211,122,0.22); box-shadow:0 18px 40px rgba(0,0,0,0.45); }
            .modal-header-zones { display:flex; align-items:center; justify-content:space-between; gap:14px; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid rgba(245,211,122,0.12); }
            .modal-header-zones h2 { margin:0; flex:1; text-align:center; color:var(--gold,#f5d37a); }
            #zonesContainer, #regionsContainer { display:grid; grid-template-columns:minmax(290px,340px) minmax(0,1fr); gap:16px; min-height:62vh; height:78vh; }
            #listeZones, #listeRegions { overflow:auto; padding-right:4px; display:flex; flex-direction:column; gap:12px; }
            .nv-map-sidepanel { display:flex; flex-direction:column; gap:12px; }
            .nv-map-current-card, .nv-map-list-card, .nv-map-region-card, .nv-map-focus-card { background:rgba(255,255,255,0.035); border:1px solid rgba(245,211,122,0.12); border-radius:14px; padding:12px; }
            .nv-map-list-card, .nv-map-region-card { cursor:pointer; transition:transform .16s ease, border-color .16s ease, background .16s ease; }
            .nv-map-list-card:hover, .nv-map-region-card:hover { transform:translateY(-1px); border-color:rgba(245,211,122,0.3); background:rgba(255,255,255,0.06); }
            .nv-map-list-card.is-selected, .nv-map-region-card.is-selected { border-color:rgba(245,211,122,0.45); box-shadow:0 0 0 1px rgba(245,211,122,0.12) inset; background:rgba(245,211,122,0.08); }
            .nv-map-list-card.is-current, .nv-map-region-card.is-current { border-left:4px solid #6ddf7a; }
            .nv-map-list-top { display:flex; justify-content:space-between; align-items:flex-start; gap:10px; margin-bottom:6px; }
            .nv-map-list-top h4 { margin:0; color:var(--gold,#f5d37a); }
            .nv-map-mini-status { font-size:.8rem; color:var(--text-muted,#b9b0a1); white-space:nowrap; }
            .nv-map-selected-details p { margin:0 0 8px; color:var(--text-muted,#c7bdad); line-height:1.35; }
            .nv-map-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
            .nv-map-tag { display:inline-flex; align-items:center; padding:5px 9px; border-radius:999px; background:rgba(0,0,0,0.22); border:1px solid rgba(245,211,122,0.12); color:var(--text-muted,#d0c6b6); font-size:.84rem; }
            .nv-map-card-actions { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:8px; margin-top:10px; }
            .carte-container { position:relative; overflow:hidden; min-height:100%; border-radius:16px; border:1px solid rgba(245,211,122,0.16); background:linear-gradient(180deg,#24211d,#181613); box-shadow:inset 0 0 40px rgba(0,0,0,0.35); }
            .carte-canvas { display:block; width:100%; height:100%; }
            .nv-map-overlay { position:absolute; inset:0; z-index:4; pointer-events:none; }
            .nv-map-world { position:absolute; inset:0; pointer-events:none; }
            .nv-map-node { position:absolute; z-index:3; width:24px; height:24px; transform:translate(-50%,-50%); pointer-events:auto; border:none; background:transparent; cursor:pointer; padding:0; }
            .nv-map-node-pin { display:block; width:24px; height:24px; border-radius:999px; border:2px solid rgba(255,255,255,.92); box-shadow:0 3px 10px rgba(0,0,0,.35); }
            .nv-map-node.is-current .nv-map-node-pin { box-shadow:0 0 0 4px rgba(109,223,122,.2), 0 0 16px rgba(109,223,122,.42); }
            .nv-map-node.is-locked { opacity:.45; }
            .nv-map-node-label { position:absolute; transform:translate(-50%, calc(-100% - 16px)); pointer-events:none; color:var(--text,#f1eadf); text-shadow:0 2px 7px rgba(0,0,0,.8); font-size:.78rem; white-space:nowrap; text-align:center; }
            .nv-map-node-label span { display:block; color:var(--text-muted,#d0c6b6); font-size:.72rem; }
            .nv-map-toolbar { position:absolute; top:12px; left:12px; right:12px; z-index:6; display:flex; justify-content:space-between; gap:10px; pointer-events:none; }
            .nv-map-toolbar > * { pointer-events:auto; }
            .nv-map-titlebox, .nv-map-controls, .nv-map-legend-inline { padding:9px 12px; border-radius:12px; background:rgba(18,16,14,.84); border:1px solid rgba(245,211,122,.18); }
            .nv-map-titlebox strong { display:block; color:var(--gold,#f5d37a); margin-bottom:3px; }
            .nv-map-titlebox span, .nv-map-controls span, .nv-map-legend-inline span { color:var(--text-muted,#d0c6b6); font-size:.83rem; }
            .nv-map-right-tools { display:flex; flex-direction:column; align-items:flex-end; gap:8px; }
            .nv-map-controls { display:flex; align-items:center; gap:6px; }
            .nv-map-legend-inline { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:10px; }
            .nv-map-legend-inline .dot { width:10px; height:10px; border-radius:999px; display:inline-block; margin-right:5px; }
            @media (max-width:900px) { #zonesContainer, #regionsContainer { grid-template-columns:1fr; height:auto; max-height:72vh; } .carte-container { min-height:420px; } .nv-map-toolbar { position:static; flex-direction:column; margin:10px; } }
        `;
        document.head.appendChild(style);
    }

    function nvMapEnsureContainer(canvasId) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return null;
        const container = canvas.parentElement;
        if (!container) return null;
        container.classList.add("nv-map-enhanced", "carte-container");
        return { canvas, container };
    }

    function nvMapDrawCanvas(canvasId, backgroundImage = null) {
        const refs = nvMapEnsureContainer(canvasId);
        if (!refs) return;
        const { canvas, container } = refs;
        const width = Math.max(1, Math.floor(container.clientWidth || 800));
        const height = Math.max(1, Math.floor(container.clientHeight || 520));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        const bg = ctx.createLinearGradient(0, 0, 0, height);
        bg.addColorStop(0, "#2b261f");
        bg.addColorStop(1, "#171511");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, width, height);

        if (backgroundImage?.complete && backgroundImage.naturalWidth > 0) {
            ctx.save();
            ctx.globalAlpha = 0.95;
            ctx.drawImage(backgroundImage, 0, 0, width, height);
            ctx.restore();
        }

        ctx.strokeStyle = "rgba(245,211,122,.10)";
        ctx.lineWidth = 1;
        for (let x = 40; x < width; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke(); }
        for (let y = 40; y < height; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke(); }
    }

    function nvMapRender(canvasId, elements, options = {}) {
        const refs = nvMapEnsureContainer(canvasId);
        if (!refs) return;
        const { container } = refs;
        nvMapDrawCanvas(canvasId, options.backgroundImage ? nvMapGetImage(options.backgroundImage) : null);

        let toolbar = container.querySelector(".nv-map-toolbar");
        if (!toolbar) {
            toolbar = document.createElement("div");
            toolbar.className = "nv-map-toolbar";
            container.appendChild(toolbar);
        }

        toolbar.innerHTML = `
            <div class="nv-map-titlebox">
                <strong>${nvMapEscape(options.toolbarTitle || "Carte")}</strong>
                <span>${nvMapEscape(options.toolbarSubtitle || "Carte interactive.")}</span>
                <div style="margin-top:8px;"><button type="button" class="nv-map-close-main" onclick="${canvasId === "carteRegions" ? "fermerRegions()" : "fermerZones()"}">Fermer</button></div>
            </div>
            <div class="nv-map-right-tools">
                <div class="nv-map-controls"><span>Vue 100%</span><button onclick="${canvasId === "carteRegions" ? "dessinerCarteRegions()" : "dessinerCarteMonde()"}">Reset</button></div>
                <div class="nv-map-legend-inline">${(options.legendInline || []).map(item => `<span><i class="dot" style="background:${item.color};"></i>${nvMapEscape(item.label)}</span>`).join("")}</div>
            </div>
        `;

        let overlay = container.querySelector(".nv-map-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "nv-map-overlay";
            container.appendChild(overlay);
        }

        overlay.innerHTML = `<div class="nv-map-world"></div>`;
        const world = overlay.querySelector(".nv-map-world");

        elements.forEach(element => {
            const x = Number(element.mapX || 50);
            const y = Number(element.mapY || 50);
            const color = nvMapGetNodeColor(element, options.mode);
            const isSelected = options.selectionId === element.id;
            const isCurrent = options.currentId === element.id;
            const isLocked = options.mode === "zone" && !(Game.data.personnage.zonesDebloquees || []).includes(element.id);
            const status = nvMapGetStatusText(element, options.mode);
            const node = document.createElement("button");
            node.type = "button";
            node.className = `nv-map-node ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""} ${isLocked ? "is-locked" : ""}`;
            node.style.left = `${x}%`;
            node.style.top = `${y}%`;
            node.title = `${element.nom} - ${status}`;
            node.innerHTML = `<span class="nv-map-node-pin" style="background:${color};"></span>`;
            node.addEventListener("click", event => { event.stopPropagation(); options.onSelect?.(element.id); });
            world.appendChild(node);

            const label = document.createElement("div");
            label.className = `nv-map-node-label ${isSelected || isCurrent ? "is-important-label" : ""}`;
            label.style.left = `${x}%`;
            label.style.top = `${y}%`;
            label.innerHTML = isSelected || isCurrent
                ? `<strong>${nvMapEscape(element.nom)}</strong><span>${nvMapEscape(status)}${options.mode === "zone" && element.type ? ` - ${nvMapEscape(nvMapGetTypeText(element.type))}` : ""}</span>`
                : `<strong>${nvMapEscape(element.nom)}</strong>`;
            world.appendChild(label);
        });
    }

    function nvMapBuildZoneSideList() {
        const zones = nvMapGetZonesActuelles();
        const zoneActuelle = zones.find(zone => zone.id === Game.data.personnage.zoneActuelle) || zones[0] || null;
        const zoneSelectionnee = zones.find(zone => zone.id === Game.ui.zoneSelectionnee) || zoneActuelle || zones[0] || null;
        if (zoneSelectionnee) Game.ui.zoneSelectionnee = zoneSelectionnee.id;

        const currentCard = zoneActuelle ? `
            <div class="nv-map-current-card"><h3>Zone actuelle</h3><p><strong>${nvMapEscape(zoneActuelle.nom)}</strong><br>${nvMapEscape(nvMapGetTypeText(zoneActuelle.type))} - ${zoneActuelle.tempsVoyage ?? 1} h</p></div>
        ` : "";

        const list = zones.map(zone => {
            const isSelected = Game.ui.zoneSelectionnee === zone.id;
            const isCurrent = Game.data.personnage.zoneActuelle === zone.id;
            const unlocked = (Game.data.personnage.zonesDebloquees || []).includes(zone.id);
            const details = isSelected ? `
                <div class="nv-map-selected-details">
                    <p>${nvMapEscape(zone.description || "Aucune description.")}</p>
                    <div class="nv-map-tags"><span class="nv-map-tag">${nvMapEscape(nvMapGetTypeText(zone.type))}</span><span class="nv-map-tag">${unlocked ? "Accessible" : "Verrouillee"}</span><span class="nv-map-tag">${zone.tempsVoyage ?? 1} h</span></div>
                    <div class="nv-map-card-actions" onclick="event.stopPropagation();">
                        ${isCurrent ? `<button disabled>Zone actuelle</button>` : `<button ${unlocked ? "" : "disabled"} onclick="voyagerVersZone('${zone.id}')">Voyager</button>`}
                        <button onclick="selectionnerMap('${zone.id}', 'zone')">Voir</button>
                    </div>
                </div>
            ` : "";

            return `
                <div class="nv-map-list-card ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""}" onclick="selectionnerMap('${zone.id}', 'zone')">
                    <div class="nv-map-list-top"><h4>${nvMapEscape(zone.nom)}</h4><span class="nv-map-mini-status">${!unlocked ? "Verrouillee" : isCurrent ? "Actuelle" : ""}</span></div>
                    ${details}
                </div>
            `;
        }).join("");

        return `<div class="nv-map-sidepanel">${currentCard}<div class="nv-map-list">${list}</div></div>`;
    }

    function nvMapBuildRegionSideList() {
        const regions = Game.data.regionsMonde || [];
        const regionActuelle = regions.find(region => region.id === Game.data.personnage.regionMondeActuelle) || regions[0] || null;
        const regionSelectionnee = regions.find(region => region.id === Game.ui.regionSelectionnee) || regionActuelle || regions[0] || null;
        if (regionSelectionnee) Game.ui.regionSelectionnee = regionSelectionnee.id;

        const currentCard = regionActuelle ? `
            <div class="nv-map-current-card"><h3>Region actuelle</h3><p><strong>${nvMapEscape(regionActuelle.nom)}</strong><br>${(regionActuelle.zones || []).length} zones</p></div>
        ` : "";

        const list = regions.map(region => {
            const isSelected = Game.ui.regionSelectionnee === region.id;
            const isCurrent = Game.data.personnage.regionMondeActuelle === region.id;
            const details = isSelected ? `
                <div class="nv-map-selected-details">
                    <p>${nvMapEscape(region.description || "Aucune description.")}</p>
                    <div class="nv-map-tags"><span class="nv-map-tag">Zones : ${(region.zones || []).length}</span><span class="nv-map-tag">${isCurrent ? "Actuelle" : "Region"}</span></div>
                    <div class="nv-map-card-actions" onclick="event.stopPropagation();">
                        ${isCurrent ? `<button disabled>Region actuelle</button>` : `<button onclick="changerRegionMonde('${region.id}'); fermerRegions(); ouvrirZones();">Voyager</button>`}
                        <button onclick="selectionnerMap('${region.id}', 'region')">Voir</button>
                    </div>
                </div>
            ` : "";

            return `
                <div class="nv-map-region-card ${isSelected ? "is-selected" : ""} ${isCurrent ? "is-current" : ""}" onclick="selectionnerMap('${region.id}', 'region')">
                    <div class="nv-map-list-top"><h4>${nvMapEscape(region.nom)}</h4><span class="nv-map-mini-status">${isCurrent ? "Actuelle" : ""}</span></div>
                    ${details}
                </div>
            `;
        }).join("");

        return `<div class="nv-map-sidepanel">${currentCard}<div class="nv-map-list">${list}</div></div>`;
    }

    function selectionnerMap(id, type) {
        if (type === "zone") {
            Game.ui.zoneSelectionnee = id;
            ouvrirZones();
            return;
        }
        if (type === "region") {
            Game.ui.regionSelectionnee = id;
            ouvrirRegions();
        }
    }

    function dessinerCarteMonde() {
        const region = nvMapGetRegionActuelle();
        nvMapRender("carteMonde", nvMapGetZonesActuelles(), {
            mode: "zone",
            selectionId: Game.ui.zoneSelectionnee,
            currentId: Game.data.personnage.zoneActuelle,
            toolbarTitle: `Carte regionale - ${region?.nom || "Region"}`,
            toolbarSubtitle: "Carte des zones accessibles et verrouillees.",
            legendInline: [
                { label: "Sur", color: "#4caf50" },
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
            selectionId: Game.ui.regionSelectionnee,
            currentId: Game.data.personnage.regionMondeActuelle,
            toolbarTitle: "Carte du monde",
            toolbarSubtitle: "Selectionne une region pour voyager.",
            legendInline: [
                { label: "Region", color: "#6aa8ff" },
                { label: "Actuelle", color: "#4caf50" }
            ],
            backgroundImage: NV_MAP_WORLD_IMAGE_SRC,
            onSelect: id => selectionnerMap(id, "region")
        });
    }

    function ouvrirZones() {
        const zonesActuelles = nvMapGetZonesActuelles();
        if (!zonesActuelles.length) {
            ajouterJournal?.("Aucune zone disponible dans cette region.");
            return;
        }

        if (!Game.ui.zoneSelectionnee || !zonesActuelles.some(zone => zone.id === Game.ui.zoneSelectionnee)) {
            Game.ui.zoneSelectionnee = Game.data.personnage.zoneActuelle || zonesActuelles[0].id;
        }

        const modal = document.getElementById("zonesModal");
        const liste = document.getElementById("listeZones");
        const container = document.getElementById("zonesContainer");
        if (!modal || !liste || !container) return;

        liste.innerHTML = nvMapBuildZoneSideList();
        if (!document.getElementById("carteMonde")) {
            container.querySelector(".carte-container")?.remove();
            container.insertAdjacentHTML("beforeend", `<div class="carte-container"><canvas id="carteMonde" class="carte-canvas"></canvas></div>`);
        }
        modal.style.display = "flex";
        setTimeout(dessinerCarteMonde, 0);
    }

    function fermerZones() {
        const modal = document.getElementById("zonesModal");
        if (modal) modal.style.display = "none";
    }

    function ouvrirRegions() {
        const modal = document.getElementById("regionsModal");
        const liste = document.getElementById("listeRegions");
        const container = document.getElementById("regionsContainer");
        if (!modal || !liste || !container) return;

        if (!Game.ui.regionSelectionnee) Game.ui.regionSelectionnee = Game.data.personnage.regionMondeActuelle || Game.data.regionsMonde?.[0]?.id || null;
        liste.innerHTML = nvMapBuildRegionSideList();
        if (!document.getElementById("carteRegions")) {
            container.querySelector(".carte-container")?.remove();
            container.insertAdjacentHTML("beforeend", `<div class="carte-container"><canvas id="carteRegions" class="carte-canvas"></canvas></div>`);
        }
        modal.style.display = "flex";
        setTimeout(dessinerCarteRegions, 0);
    }

    function fermerRegions() {
        const modal = document.getElementById("regionsModal");
        if (modal) modal.style.display = "none";
    }

    window.selectionnerMap = selectionnerMap;
    window.dessinerCarteMonde = dessinerCarteMonde;
    window.dessinerCarteRegions = dessinerCarteRegions;
    window.ouvrirZones = ouvrirZones;
    window.fermerZones = fermerZones;
    window.ouvrirRegions = ouvrirRegions;
    window.fermerRegions = fermerRegions;
    window.NV_MAP_VERSION = NV_MAP_VERSION;

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", nvMapInjectStyles);
    } else {
        nvMapInjectStyles();
    }
})();
