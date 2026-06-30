/* NightVenture — HUD personnage minimal intégré à Exploration */
(function () {
    "use strict";

    function pct(value, max) {
        max = Math.max(1, Number(max) || 1);
        return Math.min(100, Math.max(0, ((Number(value) || 0) / max) * 100));
    }

    function maxFrom(fnName, fallback) {
        if (typeof window[fnName] === "function") return Math.max(1, Number(window[fnName]()) || 1);
        return Math.max(1, Number(fallback) || 1);
    }

    function injectStyle() {
        if (document.getElementById("nvExplorationInlineHudStyle")) return;
        const style = document.createElement("style");
        style.id = "nvExplorationInlineHudStyle";
        style.textContent = "body.nv-mode-playing #topCharacterBar #personnage,body.nv-mode-playing #topCharacterBar .nv-hud-world-info,body.nv-mode-playing #topCharacterBar .nv-hud-collapse-button{display:none!important}body.nv-mode-playing #topCharacterBar{position:static!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.nv-inline-hud{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;padding:10px}.nv-inline-hud-top{display:grid;grid-template-columns:minmax(0,1fr)auto;gap:7px;align-items:start}.nv-inline-hud-title{min-width:0}.nv-inline-hud-title strong{display:block;color:#f5d37a;font-size:clamp(.76rem,3.2vw,.94rem);line-height:1.18;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;word-break:normal}.nv-inline-hud-title span{display:block;color:#c7bdad;font-size:clamp(.66rem,2.8vw,.76rem);line-height:1.15;font-weight:800;margin-top:3px;white-space:normal;overflow:visible;text-overflow:clip}.nv-inline-hud button{min-width:42px!important;width:auto!important;max-width:54px!important;min-height:28px!important;padding:4px 8px!important;border-radius:999px!important;font-size:.66rem!important;line-height:1!important;white-space:nowrap}.nv-inline-res{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.nv-inline-res-item{padding:5px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(0,0,0,.13);min-width:0}.nv-inline-res-label{display:flex;justify-content:space-between;gap:3px;margin-bottom:4px;color:#c7bdad;font-size:.56rem;font-weight:900}.nv-inline-res-bar{height:7px;overflow:hidden;border-radius:999px;background:rgba(0,0,0,.34)}.nv-inline-res-fill{height:100%;border-radius:999px;background:rgba(245,211,122,.78)}.nv-inline-res-item:nth-child(1) .nv-inline-res-fill{background:rgba(210,75,67,.82)}.nv-inline-res-item:nth-child(2) .nv-inline-res-fill{background:rgba(87,137,220,.82)}.nv-inline-res-item:nth-child(3) .nv-inline-res-fill{background:rgba(96,176,98,.82)}.nv-inline-meta{display:flex;flex-wrap:wrap;gap:5px}.nv-inline-meta span{padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.14);color:#c7bdad;font-size:.68rem;font-weight:800}.nv-exploration-hero-mobile__actions button[onclick*=ouvrirZones]{display:none!important}";
        document.head.appendChild(style);
    }

    function resource(label, value, max) {
        const box = document.createElement("div");
        box.className = "nv-inline-res-item";
        box.innerHTML = "<div class='nv-inline-res-label'><span>" + label + "</span><span>" + Math.round(value) + "/" + Math.round(max) + "</span></div><div class='nv-inline-res-bar'><div class='nv-inline-res-fill' style='width:" + pct(value, max) + "%'></div></div>";
        return box;
    }

    function buildHud() {
        const p = Game?.data?.personnage;
        if (!p) return null;
        const zone = typeof obtenirZoneActuelle === "function" ? obtenirZoneActuelle() : Game?.cache?.zonesParId?.[p.zoneActuelle];
        const region = typeof obtenirRegionMondeActuelle === "function" ? obtenirRegionMondeActuelle() : null;
        const pvMax = maxFrom("pvMaxTotal", p.pvMax || p.pv || 1);
        const manaMax = maxFrom("manaMaxTotal", p.manaMax || p.mana || 1);
        const staMax = maxFrom("staminaMaxTotal", p.staminaMax || p.stamina || 1);
        const xpMax = maxFrom("xpNiveauSuivant", p.xpMax || p.xp || 1);
        const hud = document.createElement("div");
        hud.className = "item-card nv-inline-hud";
        hud.innerHTML = "<div class='nv-inline-hud-top'><div class='nv-inline-hud-title'><strong></strong><span></span></div><button type='button'>Map</button></div><div class='nv-inline-meta'></div><div class='nv-inline-res'></div>";
        hud.querySelector("strong").textContent = (p.nom || "Héros") + " - " + (p.classe || "Aventurier") + " - Level" + (p.niveau || 1);
        hud.querySelector(".nv-inline-hud-title span").textContent = "Or : " + (p.or || 0);
        hud.querySelector("button").addEventListener("click", function () {
            if (typeof ouvrirZones === "function") ouvrirZones();
        });
        const meta = hud.querySelector(".nv-inline-meta");
        const zoneChip = document.createElement("span");
        zoneChip.textContent = zone?.nom || "Zone inconnue";
        const regionChip = document.createElement("span");
        regionChip.textContent = region?.nom || "Région inconnue";
        meta.appendChild(zoneChip);
        meta.appendChild(regionChip);
        const row = hud.querySelector(".nv-inline-res");
        row.appendChild(resource("PV", p.pv || pvMax, pvMax));
        row.appendChild(resource("Mana", p.mana || manaMax, manaMax));
        row.appendChild(resource("Sta", p.stamina || staMax, staMax));
        row.appendChild(resource("XP", p.xp || 0, xpMax));
        return hud;
    }

    function integrate() {
        injectStyle();
        if (Game?.ui?.vueActive !== "exploration") return;
        const root = document.querySelector("#vuePrincipale .nv-exploration-mobile");
        if (!root) return;
        const hud = buildHud();
        if (!hud) return;
        const current = root.querySelector(".nv-inline-hud");
        if (current) current.replaceWith(hud);
        else root.prepend(hud);
    }

    function patch() {
        if (typeof afficherVuePrincipale !== "function" || afficherVuePrincipale.__NV_INLINE_HUD) return;
        const original = afficherVuePrincipale;
        afficherVuePrincipale = function () {
            const result = original.apply(this, arguments);
            requestAnimationFrame(integrate);
            return result;
        };
        afficherVuePrincipale.__NV_INLINE_HUD = true;
    }

    function startTicker() {
        if (window.__NV_INLINE_HUD_TICKER) return;
        window.__NV_INLINE_HUD_TICKER = setInterval(function () {
            if (Game?.ui?.vueActive === "exploration") integrate();
        }, 350);
    }

    function install() {
        injectStyle();
        patch();
        startTicker();
        requestAnimationFrame(integrate);
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();
