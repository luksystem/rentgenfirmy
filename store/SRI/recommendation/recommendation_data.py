# -*- coding: utf-8 -*-
"""SRI Recommendation Engine — konfiguracja.

Warstwa POMOCNICZA nad oficjalna metodologia SRI. NIE zmienia punktacji.
Zawiera wylacznie parametry logiki rekomendacji (bez UI, ofert, kosztow, ROI).
"""

# ─────────────────────────────────────────────────────────────────────────────
# Wymiary biznesowe -> kryteria SRI (impact criteria)
# Kolejnosc = kolejnosc prezentacji w Business Impact.
# ─────────────────────────────────────────────────────────────────────────────
BUSINESS_DIMENSIONS = [
    ("energy_efficiency",  "Efektywnosc energetyczna", ["energy_efficiency"]),
    ("comfort",            "Komfort",                  ["comfort"]),
    ("maintenance",        "Utrzymanie",               ["maintenance_and_fault_prediction"]),
    ("safety",             "Bezpieczenstwo",           ["health_wellbeing_accessibility"]),
    ("operation",          "Eksploatacja",             ["convenience", "information_to_occupants"]),
    ("energy_flexibility", "Elastycznosc energetyczna", ["energy_flexibility_and_storage"]),
]

# Progi poziomu wplywu na podstawie MAKS impact score (FLmax) dla kryterium (0..~5)
def impact_level(score):
    if score >= 3:
        return "wysoki"
    if score == 2:
        return "sredni"
    if score == 1:
        return "niski"
    return "brak"


# ─────────────────────────────────────────────────────────────────────────────
# PRIORITY ENGINE (Critical / High / Medium / Low)
# Priorytet = jak bardzo usluga jest wazna do wdrozenia (wplyw + fundamentalnosc).
# ─────────────────────────────────────────────────────────────────────────────
PRIORITY_WEIGHTS = {
    "gain":     0.50,  # wplyw na wynik SRI (Expected Gain)
    "leverage": 0.30,  # ile innych uslug wspoldzieli funkcje tej uslugi (fundament)
    "domains":  0.20,  # przez ile domen przechodza funkcje tej uslugi
}
# Progi na znormalizowanym wyniku priorytetu [0..1]
PRIORITY_THRESHOLDS = [
    ("Critical", 0.60),
    ("High",     0.38),
    ("Medium",   0.20),
    ("Low",      0.0),
]

# ─────────────────────────────────────────────────────────────────────────────
# RECOMMENDATION RANKING (kolejnosc wdrazania — co robic najpierw)
# Suma wag = 1.0
# ─────────────────────────────────────────────────────────────────────────────
RANKING_WEIGHTS = {
    "expected_gain":     0.30,  # oczekiwany przyrost SRI
    "energy_potential":  0.15,  # potencjal energetyczny (EE + elastycznosc)
    "ease":              0.15,  # latwosc wdrozenia (im mniej sprzetu fiz., tym wyzej)
    "service_leverage":  0.12,  # liczba uslug korzystajacych z tych samych funkcji
    "domains":           0.10,  # liczba domen objetych funkcjami
    "prereq_readiness":  0.10,  # gotowosc prerekwizytow (im plytsze, tym wyzej)
    "criteria":          0.08,  # liczba Impact Criteria, ktore usluga poprawia
}

# Kryteria "energetyczne" do liczenia potencjalu energetycznego
ENERGY_CRITERIA = ["energy_efficiency", "energy_flexibility_and_storage"]
