/* NightVenture — HUD personnage minimal intégré à Exploration */
(function () {
    "use strict";

    const KEY = "nightventure.hud.collapsed";

    function isCollapsed() {
        try { return localStorage.getItem(KEY) === "1"; } catch (e) { return false; }
    }

    function setCollapsed(value) {
        try { localStorage.setItem(KEY, value ? "1" : "0"); } catch (e) {}
    }

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
        style.textContent = "body.nv-mode-playing #topCharacterBar #personnage,body.nv-mode-playing #topCharacterBar .nv-hud-world-info,body.nv-mode-playing #topCharacterBar .nv-hud-collapse-button{display:none!important}body.nv-mode-playing #topCharacterBar{position:static!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}.nv-inline-hud{display:flex;flex-direction:column;gap:8px;margin-bottom:10px;padding:10px}.nv-inline-hud-top{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.nv-inline-hud-title{min-width:0}.nv-inline-hud-title small{display:block;color:#c7bdad;font-size:.68rem;font-weight:800;text-transform:uppercase}.nv-inline-hud-title strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f5d37a;font-size:1.1rem}.nv-inline-hud-title span{display:block;color:#f1eadf;font-size:.76rem;font-weight:800}.nv-inline-hud button{min-height:30px!important;padding:5px 9px!important;border-radius:999px!important;font-size:.7rem!important;white-space:nowrap}.nv-inline-res{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.nv-inline-res-item{padding:5px;border:1px solid rgba(255,255,255,.08);border-radius:10px;background:rgba(0,0,0,.13);min-width:0}.nv-inline-res-label{display:flex;justify-content:space-between;gap:3px;margin-bottom:4px;color:#c7bdad;font-size:.56rem;font-weight:900}.nv-inline-res-bar{height:7px;overflow:hidden;border-radius:999px;background:rgba(0,0,0,.34)}.nv-inline-res-fill{height:100%;border-radius:999px;background:rgba(245,211,122,.78)}.nv-inline-extra{display:flex;flex-wrap:wrap;gap:5px}.nv-inline-extra span{padding:3px 7px;border-radius:999px;background:rgba(0,0,0,.14);color:#c7bdad;font-size:.68rem;font-weight:800}.nv-inline-hud.is-collapsed .nv-inline-extra{display:none}";
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
        const collapsed = isCollapsed();
        const pvMax = maxFrom("pvMaxTotal", p.pvMax || p.pv || 1);
        const manaMax = maxFrom("manaMaxTotal", p.manaMax || p.mana || 1);
        const staMax = maxFrom("staminaMaxTotal", p.staminaMax || p.stamina || 1);
        const xpMax = maxFrom("xpNiveauSuivant", p.xpMax || p.xp || 1);
        const hud = document.createElement("div");
        hud.className = "item-card nv-inline-hud" + (collapsed ? " is-collapsed" : "");
        hud.innerHTML = "<div class='nv-inline-hud-top'><div class='nv-inline-hud-title'><small>Zone actuelle</small><strong></strong><span></span></div><button type='button'></button></div><div class='nv-inline-res'></div><div class='nv-inline-extra'></div>";
        hud.querySelector("strong").textContent = zone?.nom || "Zone inconnue";
        hud.querySelector(".nv-inline-hud-title span").textContent = (p.nom || "Héros") + " - Niveau " + (p.niveau || 1);
        const button = hud.querySelector("button");
        button.textContent = collapsed ? "Afficher HUD" : "Masquer HUD";
        button.addEventListener("click", function () {
            setCollapsed(!isCollapsed());
            if (typeof ouvrirExploration === "function") ouvrirExploration();
        });
        const row = hud.querySelector(".nv-inline-res");
        row.appendChild(resource("PV", p.pv || pvMax, pvMax));
        row.appendChild(resource("Mana", p.mana || manaMax, manaMax));
        row.appendChild(resource("Sta", p.stamina || staMax, staMax));
        row.appendChild(resource("XP", p.xp || 0, xpMax));
        const extra = hud.querySelector(".nv-inline-extra");
        extra.innerHTML = "<span>Classe : " + (p.classe || "Aventurier") + "</span><span>Région : " + (region?.nom || "Inconnue") + "</span><span>Or : " + (p.or || 0) + "</span>";
        return hud;
    }

    function integrate() {
        injectStyle();
        if (Game?.ui?.vueActive !== "exploration") return;
        const root = document.querySelector("#vuePrincipale .nv-exploration-mobile");
        if (!root || root.querySelector(".nv-inline-hud")) return;
        const hud = buildHud();
        if (hud) root.prepend(hud);
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

    function install() { injectStyle(); patch(); requestAnimationFrame(integrate); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();
