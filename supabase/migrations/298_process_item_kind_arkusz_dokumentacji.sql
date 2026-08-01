-- Nowy typ elementu procesu: "Arkusz dokumentacji" — reprezentuje jeden zmapowany arkusz z
-- ogólnego pliku dokumentacji technicznej projektu (RW-Zugi/Rolety/Przyciski/Alarm/HVAC/RACK),
-- osadzony bezpośrednio w karcie elementu na właściwym etapie procesu. Osobna migracja — Postgres
-- nie pozwala użyć nowej wartości enuma w tej samej transakcji, w której ją dodano (ten sam
-- wzorzec co 021_process_kanban.sql / 089_process_note_links.sql / 272_process_snapshot.sql).
alter type process_item_kind add value if not exists 'arkusz_dokumentacji';
