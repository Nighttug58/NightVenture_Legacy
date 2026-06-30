/*
NightVenture — Quêtes Extension loader
- Le fichier complet original est sauvegardé dans backup/Quetes_Extension.js
- Ce loader garde la compatibilité runtime
- Le module NoEmoji nettoie les textes visibles générés par l'extension
*/

(function () {
    "use strict";

    const scripts = [
        "backup/Quetes_Extension.js",
        "Quetes_Extension_NoEmoji_Runtime.js"
    ];

    if (document.currentScript && document.readyState === "loading") {
        scripts.forEach(src => {
            document.write(`<script src="${src}"><\/script>`);
        });
        return;
    }

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    scripts.reduce(
        (chain, src) => chain.then(() => loadScript(src)),
        Promise.resolve()
    ).catch(error => {
        console.error("Impossible de charger l'extension de quêtes.", error);
    });
})();
