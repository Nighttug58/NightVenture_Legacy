/*
NightVenture — Journal et sauvegardes
- Journal mini / complet
- Notifications journal
- Téléchargement journal
- Sauvegarde / chargement JSON
*/

function ajouterJournal(message) {
    const texte =
        String(message ?? "").trim();

    if (!texte) return;

    const journal =
        assurerHistoriqueJournal();

    journal.push(texte);

    if (journal.length > 1000) {
        journal.splice(0, journal.length - 1000);
    }

    afficherJournal();
    declencherNotificationJournal(texte);
}

function creerSauvegarde() {
    return {
        personnage: Game.data.personnage,
        historique: Game.data.historique,
        monde: Game.data.monde
    };
}

/* Rendu Graphique & Exportation du Journal de Bord */
const JournalNotificationsState = {
    max: 20,
    items: []
};

function assurerHistoriqueJournal() {
    if (!Game.data.historique || typeof Game.data.historique !== "object") {
        Game.data.historique = {};
    }

    if (!Array.isArray(Game.data.historique.journal)) {
        Game.data.historique.journal = [];
    }

    return Game.data.historique.journal;
}

function echapperHTML(valeur) {
    return String(valeur ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function creerEntreeJournalMiniHTML(message) {
    return `
        <article class="journal-mini-entree">
            <p>${echapperHTML(message)}</p>
        </article>
    `;
}

function creerEntreeJournalCompletHTML(message, numeroEntree) {
    return `
        <article class="journal-complet-entree">
            <div class="journal-complet-entree__meta">
                <span>Entrée #${numeroEntree}</span>
                <span>Journal d’aventure</span>
            </div>

            <p class="journal-complet-entree__message">
                ${echapperHTML(message)}
            </p>
        </article>
    `;
}

function declencherNotificationJournal(message) {
    const conteneur =
        document.getElementById("journalNotifications");

    if (!conteneur) return;

    const texte =
        String(message ?? "").trim();

    if (!texte) return;

    while (JournalNotificationsState.items.length >= JournalNotificationsState.max) {
        const plusAncienne =
            JournalNotificationsState.items.shift();

        if (plusAncienne?.element?.isConnected) {
            plusAncienne.element.remove();
        }
    }

    const id =
        `journal-notification-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const element =
        document.createElement("div");

    element.className =
        "journal-notification";

    element.dataset.notificationId =
        id;

    element.innerHTML = `
        <p class="journal-notification__message">
            ${echapperHTML(texte)}
        </p>
    `;

    const entree =
        { id, element };

    JournalNotificationsState.items.push(entree);
    conteneur.appendChild(element);

    let dejaNettoye =
        false;

    const nettoyer = () => {
        if (dejaNettoye) return;
        dejaNettoye = true;

        JournalNotificationsState.items =
            JournalNotificationsState.items.filter(
                item => item.id !== id
            );

        if (element.isConnected) {
            element.remove();
        }
    };

    element.addEventListener("animationend", nettoyer, { once: true });
    element.addEventListener("animationcancel", nettoyer, { once: true });
}

function ouvrirJournalComplet() {
    changerVue("journal");

    const journal =
        assurerHistoriqueJournal();

    const html = `
        <div class="journal-complet-vue">

            <div class="item-card journal-complet-header">
                <div class="journal-complet-header__texte">
                    <h2>📜 Journal d’aventure</h2>
                    <p class="journal-complet-sous-titre">
                        Historique complet conservé dans la sauvegarde
                        (maximum ${1000} entrées).
                    </p>
                </div>

                <div class="journal-complet-actions">
                    <button onclick="telechargerJournal()">💾 Exporter</button>
                    <button onclick="ouvrirExploration()">⬅ Retour</button>
                </div>
            </div>

            <div class="panel-base journal-complet-panel">
                <div class="journal-complet-toolbar">
                    <span id="journalCompletCompteur">
                        ${journal.length} ${journal.length > 1 ? "entrées" : "entrée"}
                    </span>
                </div>

                <div id="journalComplet"></div>
            </div>

        </div>
    `;

    afficherVuePrincipale(html);
    afficherJournal();
}

function afficherJournal() {
    const journal =
        assurerHistoriqueJournal();

    const ancreCompatibilite =
        document.getElementById("journal");

    if (ancreCompatibilite) {
        ancreCompatibilite.textContent =
            journal.join("\n");
    }

    /*
        MINI JOURNAL
        - garde les 20 dernières entrées en mémoire affichée
        - hauteur fixe côté CSS
        - ordre chronologique : ancien en haut, récent en bas
        - scroll automatique en bas après nouvelle entrée
    */

    const conteneurMini =
        document.getElementById("journalMini");

    if (conteneurMini) {
        const journalMini =
            journal.slice(-20);

        conteneurMini.innerHTML =
            journalMini.length > 0
                ? journalMini.map(message =>
                    creerEntreeJournalMiniHTML(message)
                ).join("")
                : `
                    <div class="journal-mini-entree--vide">
                        <p>Aucune entrée de journal pour le moment.</p>
                    </div>
                `;

        activerDefilementGlisseJournalMini();

        requestAnimationFrame(() => {
            conteneurMini.scrollTop =
                conteneurMini.scrollHeight;
        });
    }

    /*
        JOURNAL COMPLET
        - historique complet
        - ancien en haut
        - dernier message en bas
    */

    const conteneurComplet =
        document.getElementById("journalComplet");

    const compteurComplet =
        document.getElementById("journalCompletCompteur");

    if (compteurComplet) {
        compteurComplet.textContent =
            `${journal.length} ${journal.length > 1 ? "entrées" : "entrée"} affichées`;
    }

    if (conteneurComplet) {
        conteneurComplet.innerHTML =
            journal.length > 0
                ? journal.map((message, index) => {
                    const numeroEntree =
                        index + 1;

                    return creerEntreeJournalCompletHTML(
                        message,
                        numeroEntree
                    );
                }).join("")
                : `
                    <div class="journal-complet-entree--vide">
                        Aucune entrée de journal pour le moment.
                    </div>
                `;

        requestAnimationFrame(() => {
            conteneurComplet.scrollTop =
                conteneurComplet.scrollHeight;
        });
    }
}

function telechargerJournal() {
    const contenu = Game.data.historique.journal.join("\n");
    const blob = new Blob([contenu], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `NightVenture_Journal_J${Game.data.personnage.jour}.txt`;
    lien.click();
    URL.revokeObjectURL(url);
}

function activerDefilementGlisseJournalMini() {
    const journalMini =
        document.getElementById("journalMini");

    if (!journalMini) return;

    if (journalMini.dataset.dragScrollInitialise === "1") return;

    journalMini.dataset.dragScrollInitialise =
        "1";

    let glissementActif =
        false;

    let positionDepartY =
        0;

    let scrollDepart =
        0;

    journalMini.addEventListener("pointerdown", event => {
        if (event.button !== undefined && event.button !== 0) return;

        glissementActif =
            true;

        positionDepartY =
            event.clientY;

        scrollDepart =
            journalMini.scrollTop;

        journalMini.classList.add("journal-mini--drag");

        if (journalMini.setPointerCapture) {
            journalMini.setPointerCapture(event.pointerId);
        }
    });

    journalMini.addEventListener("pointermove", event => {
        if (!glissementActif) return;

        const distance =
            event.clientY - positionDepartY;

        journalMini.scrollTop =
            scrollDepart - distance;

        event.preventDefault();
    });

    function terminerGlissement(event) {
        if (!glissementActif) return;

        glissementActif =
            false;

        journalMini.classList.remove("journal-mini--drag");

        if (journalMini.releasePointerCapture) {
            try {
                journalMini.releasePointerCapture(event.pointerId);
            } catch (erreur) {
                // Sécurité : certains navigateurs peuvent déjà avoir relâché le pointer.
            }
        }
    }

    journalMini.addEventListener("pointerup", terminerGlissement);
    journalMini.addEventListener("pointercancel", terminerGlissement);
}

/* Gestionnaires de Fichiers (Save & Load JSON) */

async function sauvegarderJeu() {
    const saveData =
        creerSauvegarde();

    const json =
        JSON.stringify(saveData, null, 2);

    const blob =
        new Blob(
            [json],
            { type: "application/json" }
        );

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href =
        url;

    a.download =
        "sauvegarde.json";

    a.click();

    URL.revokeObjectURL(url);

    ajouterJournal("💾 Partie sauvegardée.");
}

async function chargerSauvegardeDepuisInput(event) {
    const file =
        event.target.files[0];

    if (!file) return;

    const text =
        await file.text();

    const save =
        JSON.parse(text);

    Game.data.personnage =
        save.personnage;

    Game.data.historique =
        save.historique;

    Game.data.monde =
        save.monde ?? {};

    Game.data.personnage.inventaire ??= [];
    Game.data.personnage.equipement ??= {};
    Game.data.personnage.quetes ??= [];
    Game.data.personnage.talents ??= [];
    Game.data.personnage.pointsTalent ??= 0;

    Game.data.historique.journal ??= [];

    Game.data.personnage.minute ??= 0;
    Game.data.personnage.pvMax ??= 0;
    Game.data.personnage.manaMax ??= 0;
    Game.data.personnage.staminaMax ??= 0;

    Game.data.personnage.dernierRestockMarchands ??=
        Game.data.personnage.jour ?? 1;

    Game.data.personnage.regionMondeActuelle ??=
        Game.data.regionsMonde[0]?.id ?? null;

    if (!obtenirZoneActuelle()) {
        Game.data.personnage.zoneActuelle =
            obtenirZonesActuelles()[0]?.id ?? null;
    }

    Game.data.personnage.zonesDebloquees ??=
        obtenirZonesActuelles()
            .filter(zone => zone.debloqueeParDefaut)
            .map(zone => zone.id);

    Game.data.personnage.jour ??= 1;
    Game.data.personnage.heure ??= 8;
    Game.data.personnage.minute ??= 0;

    Game.ui.pnjSelectionne =
        null;

    event.target.value =
        "";

    ajouterJournal("📂 Sauvegarde chargée.");

    rafraichirInterface();
}
