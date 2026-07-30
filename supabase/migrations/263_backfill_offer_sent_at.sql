-- Migracja 261 dodala client_offer_sent_at/settlement_offer_sent_at jako nowe kolumny (NULL dla
-- wszystkich istniejacych wierszy) - oferty/rozliczenia wyslane PRZED tą zmianą nie mialyby
-- blokady ponownej wysylki, dopoki ktos ich nie wyslal jeszcze raz. Backfill: dla kazdego linku,
-- ktory juz istnieje (a wiec zostal komus wyslany w starym, niechronionym flow), ustaw sent_at na
-- czas ostatniego wpisu link_generated/link_regenerated w historii, a w braku historii - na
-- updated_at rekordu.

update public.services s
set client_offer_sent_at = coalesce(
  (
    select (elem->>'at')::timestamptz
    from jsonb_array_elements(coalesce(s.client_offer_history, '[]'::jsonb)) as elem
    where elem->>'type' in ('link_generated', 'link_regenerated')
    order by (elem->>'at')::timestamptz desc
    limit 1
  ),
  s.updated_at
)
where s.client_offer_token is not null
  and s.client_offer_sent_at is null;

update public.services s
set settlement_offer_sent_at = coalesce(
  (
    select (elem->>'at')::timestamptz
    from jsonb_array_elements(coalesce(s.settlement_offer_history, '[]'::jsonb)) as elem
    where elem->>'type' in ('link_generated', 'link_regenerated')
    order by (elem->>'at')::timestamptz desc
    limit 1
  ),
  s.updated_at
)
where s.settlement_offer_token is not null
  and s.settlement_offer_sent_at is null;
