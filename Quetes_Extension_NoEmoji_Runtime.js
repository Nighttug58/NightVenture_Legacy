/*
NightVenture — Quêtes Extension No Emoji Runtime
- Nettoie les textes visibles générés par l'ancienne extension de quêtes
- Conserve les fonctions, états internes et patchs de Quetes_Extension.js
- Ne modifie jamais les ids, classes CSS ou valeurs métier
*/

(function () {
    "use strict";

    const NQX_VERSION = "v0.9.3.3-no-emoji-runtime";
    const NQX_EMOJI_REGEX = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/gu;

    function NQX_cleanText(value) {
        return String(value ?? "")
            .replace(NQX_EMOJI_REGEX, "")
            .replace(/\s+:/g, " :")
            .replace(/\s{2,}/g, " ")
            .trim();
    }

    function NQX_cleanNodeText(node) {
        if (!node || node.nodeType !== Node.TEXT_NODE) return;

        const cleaned = NQX_cleanText(node.nodeValue);
        if (node.nodeValue !== cleaned) {
            node.nodeValue = cleaned;
        }
    }

    function NQX_canCleanElement(element) {
        if (!element || !element.tagName) return false;

        const tag = element.tagName.toLowerCase();
        return !["script", "style", "textarea", "input", "code", "pre"].includes(tag);
    }

    function NQX_cleanElement(root = document.body) {
        if (!root || !NQX_canCleanElement(root)) return;

        const walker = document.createTreeWalker(
            root,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentElement;
                    return NQX_canCleanElement(parent)
                        ? NodeFilter.FILTER_ACCEPT
                        : NodeFilter.FILTER_REJECT;
                }
            }
        );

        const nodes = [];
        while (walker.nextNode()) {
            nodes.push(walker.currentNode);
        }

        nodes.forEach(NQX_cleanNodeText);
    }

    function NQX_patchJournal() {
        if (typeof window.ajouterJournal !== "function") return;
        if (window.ajouterJournal.__NQX_NO_EMOJI_PATCH) return;

        const original = window.ajouterJournal;

        window.ajouterJournal = function (message) {
            return original.call(this, NQX_cleanText(message));
        };

        window.ajouterJournal.__NQX_NO_EMOJI_PATCH = true;
    }

    function NQX_patchQuestButtonBadge() {
        if (typeof window.QX_mettreAJourBadgeNavigationQuetes !== "function") return;
        if (window.QX_mettreAJourBadgeNavigationQuetes.__NQX_NO_EMOJI_PATCH) return;

        const original = window.QX_mettreAJourBadgeNavigationQuetes;

        window.QX_mettreAJourBadgeNavigationQuetes = function (...args) {
            const result = original.apply(this, args);
            const button = document.getElementById("btnQuetes");
            if (button) {
                button.textContent = NQX_cleanText(button.textContent || "Quetes") || "Quetes";
            }
            return result;
        };

        window.QX_mettreAJourBadgeNavigationQuetes.__NQX_NO_EMOJI_PATCH = true;
    }

    function NQX_patchQuestStateLabel() {
        if (typeof window.nomEtatQuete !== "function") return;
        if (window.nomEtatQuete.__NQX_NO_EMOJI_PATCH) return;

        const original = window.nomEtatQuete;

        window.nomEtatQuete = function (...args) {
            return NQX_cleanText(original.apply(this, args));
        };

        window.nomEtatQuete.__NQX_NO_EMOJI_PATCH = true;
    }

    let cleanScheduled = false;

    function NQX_scheduleClean() {
        if (cleanScheduled) return;
        cleanScheduled = true;

        requestAnimationFrame(() => {
            cleanScheduled = false;
            NQX_cleanElement(document.body);
        });
    }

    function NQX_observeDom() {
        if (!document.body || window.__NQX_NO_EMOJI_OBSERVER) return;

        const observer = new MutationObserver(() => {
            NQX_scheduleClean();
        });

        observer.observe(document.body, {
            childList: true,
            characterData: true,
            subtree: true
        });

        window.__NQX_NO_EMOJI_OBSERVER = observer;
    }

    function NQX_install() {
        NQX_patchJournal();
        NQX_patchQuestStateLabel();
        NQX_patchQuestButtonBadge();
        NQX_observeDom();
        NQX_scheduleClean();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", NQX_install);
    } else {
        NQX_install();
    }

    setTimeout(NQX_install, 0);
    setTimeout(NQX_install, 250);
    setTimeout(NQX_install, 1000);

    window.NQX_cleanText = NQX_cleanText;
    window.NQX_cleanElement = NQX_cleanElement;
    window.NQX_VERSION = NQX_VERSION;
})();
