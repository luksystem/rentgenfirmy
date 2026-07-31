-- Nowa wartość statusu rozdzielni: "nie ruszone" — dokładnie odpowiada szóstej opcji z
-- rozwijanej listy Excela w arkuszu "RW - Zugi" (kolumna P), używanej dla pozycji, których
-- jeszcze nikt nie dotknął (np. świeżo zaimportowany, "czysty" plik). Osobna migracja — Postgres
-- nie pozwala użyć nowej wartości enuma w tej samej transakcji, w której ją dodano.
alter type switchboard_circuit_status add value if not exists 'nie_ruszone';
