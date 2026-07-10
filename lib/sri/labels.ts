// Etykiety PL dla kryteriów wpływu (prezentacja). Nie wpływa na obliczenia.
export const CRITERION_PL: Record<string, string> = {
  energy_efficiency: "Efektywność energetyczna",
  maintenance_and_fault_prediction: "Utrzymanie i predykcja awarii",
  comfort: "Komfort",
  convenience: "Wygoda",
  health_wellbeing_accessibility: "Zdrowie i dostępność",
  information_to_occupants: "Informacja dla użytkowników",
  energy_flexibility_and_storage: "Elastyczność energetyczna",
};

export const BUILDING_TYPE_PL: Record<string, string> = {
  residential: "Mieszkalny",
  non_residential: "Niemieszkalny",
};

export const CLIMATE_ZONE_PL: Record<string, string> = {
  north_europe: "Europa Północna",
  south_europe: "Europa Południowa",
  west_europe: "Europa Zachodnia",
  north_east_europe: "Europa Północno-Wschodnia",
  south_east_europe: "Europa Południowo-Wschodnia",
};

export const VERIFICATION_STATUS_PL: Record<string, string> = {
  confirmed: "Potwierdzona",
  uncertain: "Niepewna",
  to_verify: "Do weryfikacji",
  no_data: "Brak danych",
};
