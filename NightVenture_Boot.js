/*
NightVenture — Boot
Lance le chargement après que tous les modules classiques ont été déclarés.
*/

if (typeof chargerDonnees === "function") {
    chargerDonnees();
} else {
    console.error("NightVenture : chargerDonnees() est introuvable.");
}
