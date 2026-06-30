/* NightVenture — HUD personnage minimal intégré à Exploration */
(function () {
    "use strict";

    function pct(value, max) {
        max = Math.max(1, Number(max) || 1);
        return Math.min(100, Math.max(0, ((Number(value) || 0) / max) * 100));
    }

    function pctText(value, max) {
        return pct(value, max).toFixed(1) + "%";
    }

    function maxFrom(fnName, fallback) {
        if (typeof window[fnName] === "function") return Math.max(1, Number(window[fnName]()) || 1);
        return Math.max(1, Number(fallback) || 1);
    }

    function injectStyle() {
        if (document.getElementById("nvExplorationInlineHudStyle")) return;
        const style = document.createElement("style");
        style.id = "nvExplorationInlineHudStyle";
        style.textContent = "body.nv-mode-playing #topCharacterBar #personnage,body.nv-mode-playing #topCharacterBar .nv-hud-world-info,body.nv-mode-playing #topCharacterBar .nv-hud-collapse-button{display:none!important}body.nv-mode-playing #topCharacterBar{position:static!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.nv-inline-hud{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;padding:10px}.nv-inline-hud-top{display:grid;grid-template-columns:minmax(0,1fr)auto;gap:7px;align-items:start}.nv-inline-hud-title{min-width:0}.nv-inline-hud-title strong{display:block;color:#f5d37a;font-size:clamp(.76rem,3.2vw,.94rem);line-height:1.18;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;word-break:normal}.nv-inline-hud-title span{display:block;color:#c7bdad;font-size:clamp(.66rem,2.8vw,.76rem);line-height:1.15;font-weight:800;margin-top:3px;white-space:normal;overflow:visible;text-overflow:clip}.nv-inline-hud button{min-width:42px!important;width:auto!important;max-width:54px!important;min-height:28px!important;padding:4px 8px!important;border-radius:999px!important;font-size:.66rem!important;line-height:1!important;white-space:nowrap}.nv-inline-xp{width:100%}.nv-inline-res{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.nv-inline-res-item{min-width:0}.nv-inline-bar{position:relative;height:26px;overflow:hidden;border:1px solid rgba(255,255,255,.1);border-radius:11px;background:rgba(0,0,0,.32)}.nv-inline-bar-fill{position:absolute;left:0;top:0;bottom:0;border-radius:inherit;background:rgba(245,211,122,.78)}.nv-inline-bar-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 5px;color:#fff;font-size:.64rem;font-weight:900;text-shadow:0 1px 2px rgba(0,0,0,.8);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.nv-inline-xp .nv-inline-bar{height:28px}.nv-inline-xp .nv-inline-bar-text{font-size:.68rem}.nv-inline-res-item:nth-child(1) .nv-inline-bar-fill{background:rgba(210,75,67,.82)}.nv-inline-res-item:nth-child(2) .nv-inline-bar-fill{background:rgba(87,137,220,.82)}.nv-inline-res-item:nth-child(3) .nv-inline-bar-fill{background:rgba(96,176,98,.82)}.nv-inline-meta{display:flex;flex-wrap:wrap;gap:5px}.nv-inline-meta span{padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.14);color:#c7bdad;font-size:.68rem;font-weight:800}.nv-exploration-hero-mobile__actions button[onclick*=ouvrirZones]{display:none!important}";
        document.head.appendChild(style);
    }

    function resource(label, value, max, className) {
        const box = document.createElement("div");
        box.className = "nv-inline-res-item" + (className ? " " + className : "");
        const roundedValue = Math.round(Number(value) || 0);
        const roundedMax = Math.round(Number(max) || 1);
        const percent = pct(value, max);
        const percentLabel = pctText(value, max);
        box.innerHTML = "<div class='nv-inline-bar'><div class='nv-inline-bar-fill' style='width:" + percent + "%'></div><div class='nv-inline-bar-text'><span>" + label + "</span><span>" + roundedValue + "/" + roundedMax + "</span><span>" + percentLabel + "</span></div></div>";
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
        hud.innerHTML = "<div class='nv-inline-hud-top'><div class='nv-inline-hud-title'><strong></strong><span></span></div><button type='button'>Map</button></div><div class='nv-inline-xp'></div><div class='nv-inline-res'></div><div class='nv-inline-meta'></div>";
        hud.querySelector("strong").textContent = (p.nom || "Héros") + " - " + (p.classe || "Aventurier") + " - Level : " + (p.niveau || 1) + " - Or : " + (p.or || 0);
        hud.querySelector(".nv-inline-hud-title span").textContent = "";
        hud.querySelector("button").addEventListener("click", function () {
            if (typeof ouvrirZones === "function") ouvrirZones();
        });
        const xpRow = hud.querySelector(".nv-inline-xp");
        xpRow.appendChild(resource("XP", p.xp || 0, xpMax, "nv-inline-res-item--xp"));
        const row = hud.querySelector(".nv-inline-res");
        row.appendChild(resource("PV", p.pv || pvMax, pvMax));
        row.appendChild(resource("Mana", p.mana || manaMax, manaMax));
        row.appendChild(resource("Sta", p.stamina || staMax, staMax));
        const meta = hud.querySelector(".nv-inline-meta");
        const zoneChip = document.createElement("span");
        zoneChip.textContent = zone?.nom || "Zone inconnue";
        const regionChip = document.createElement("span");
        regionChip.textContent = region?.nom || "Région inconnue";
        meta.appendChild(zoneChip);
        meta.appendChild(regionChip);
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
