#!/usr/bin/env python3
# Validateur JSON simple pour NightVenture.
# À placer à la racine du projet, puis lancer : python validate_json.py

import json
from pathlib import Path
from collections import Counter

DATA = Path("data")
FILES = [
    "monstres", "niveaux", "objets", "personnage", "pnj", "quetes", "talents",
    "zones", "classes", "competences", "craftitems", "historique", "monde"
]

def load(name):
    with open(DATA / f"{name}.json", "r", encoding="utf-8") as f:
        return json.load(f)

def list_from(data, key):
    if isinstance(data, dict) and key in data:
        return data[key]
    return data

def main():
    data = {name: load(name) for name in FILES if (DATA / f"{name}.json").exists()}

    objets = list_from(data.get("objets", []), "objets")
    monstres = list_from(data.get("monstres", []), "monstres")
    pnjs = data.get("pnj", {}).get("pnj", [])
    quetes = data.get("quetes", {}).get("quetes", [])
    talents = data.get("talents", {}).get("talents", [])
    regions = data.get("zones", {}).get("regions_monde", [])
    classes = data.get("classes", [])
    competences = data.get("competences", [])
    craftitems = data.get("craftitems", {}).get("itemsCraft", [])

    zones = []
    for region in regions:
        for zone in region.get("zones", []):
            zones.append(zone)

    ids = {
        "objets": {o.get("id") for o in objets},
        "monstres": {m.get("id") for m in monstres},
        "pnj": {p.get("id") for p in pnjs},
        "quetes": {q.get("id") for q in quetes},
        "talents": {t.get("id") for t in talents},
        "zones": {z.get("id") for z in zones},
        "regions": {r.get("id") for r in regions},
        "classes": {c.get("id") for c in classes},
        "competences": {c.get("id") for c in competences},
        "craftitems": {i.get("id") for i in craftitems},
    }

    problems = []

    def add(kind, message):
        problems.append((kind, message))

    for name, values in ids.items():
        values_list = list(values)
        if None in values:
            add("ERREUR", f"{name}: au moins une entrée sans id")

    for monstre in monstres:
        for loot in monstre.get("loot", []):
            if loot.get("id") not in ids["objets"]:
                add("ERREUR", f"{monstre.get('id')}: loot objet inconnu {loot.get('id')}")

    for zone in zones:
        for id_pnj in zone.get("pnj", []):
            if id_pnj not in ids["pnj"]:
                add("ERREUR", f"{zone.get('id')}: PNJ inconnu {id_pnj}")
        for entree in zone.get("monstres", []):
            if entree.get("id") not in ids["monstres"]:
                add("ERREUR", f"{zone.get('id')}: monstre inconnu {entree.get('id')}")
        for conn in zone.get("connexions", []):
            if conn not in ids["zones"]:
                add("ERREUR", f"{zone.get('id')}: connexion zone inconnue {conn}")

    for region in regions:
        for conn in region.get("connexions", []):
            if conn not in ids["regions"]:
                add("AVERTISSEMENT", f"{region.get('id')}: connexion région inconnue {conn}")

    for pnj in pnjs:
        for item in pnj.get("inventaire", []):
            if item.get("id") not in ids["objets"]:
                add("ERREUR", f"{pnj.get('id')}: vend objet inconnu {item.get('id')}")

    for quete in quetes:
        qid = quete.get("id")
        if quete.get("pnj") and quete["pnj"] not in ids["pnj"]:
            add("ERREUR", f"{qid}: PNJ inconnu {quete['pnj']}")
        for prereq in quete.get("quetesRequises", []):
            if prereq not in ids["quetes"]:
                add("ERREUR", f"{qid}: quête requise inconnue {prereq}")
        obj = quete.get("objectif", {}) or {}
        for key in ["zone", "zoneId"]:
            if obj.get(key) and obj[key] not in ids["zones"]:
                add("BLOQUANT", f"{qid}: objectif zone inconnue {obj[key]}")
        if obj.get("objet") and obj["objet"] not in ids["objets"]:
            add("ERREUR", f"{qid}: objectif objet inconnu {obj['objet']}")
        if obj.get("pnj") and obj["pnj"] not in ids["pnj"]:
            add("ERREUR", f"{qid}: objectif PNJ inconnu {obj['pnj']}")
        for key in ["zonesDebloqueesRequises", "bossVaincusRequis", "miniBossVaincusRequis"]:
            for val in quete.get(key, []):
                if val not in ids["zones"]:
                    add("BLOQUANT", f"{qid}: {key} zone inconnue {val}")
        for reward_key in ["recompense", "recompenseArc"]:
            for item in (quete.get(reward_key, {}) or {}).get("objets", []):
                if item.get("id") not in ids["objets"]:
                    add("ERREUR", f"{qid}: {reward_key} objet inconnu {item.get('id')}")

    for classe in classes:
        for comp in classe.get("competencesDepart", []):
            if comp not in ids["competences"]:
                add("ERREUR", f"{classe.get('id')}: compétence inconnue {comp}")

    for item in craftitems:
        for source in item.get("sources", []):
            if source not in ids["monstres"]:
                add("ERREUR", f"{item.get('id')}: source monstre inconnue {source}")

    print("Validation NightVenture JSON")
    print("============================")
    print(f"Problèmes trouvés : {len(problems)}")
    for kind, message in problems:
        print(f"[{kind}] {message}")

    return 1 if any(kind in {"ERREUR", "BLOQUANT"} for kind, _ in problems) else 0

if __name__ == "__main__":
    raise SystemExit(main())
