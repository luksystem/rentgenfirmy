-- Blokada ponownej wyslki tego samego linku wyceny/rozliczenia (dwie osoby klikajace "Wyslij" po
-- zmianie kwot). Ustawiane atomowo (UPDATE ... WHERE sent_at IS NULL) w momencie faktycznej
-- wyslki maila; zerowane przy wygenerowaniu nowego linku (regeneracja = swiadoma zgoda na ponowna
-- wyslke).

alter table public.services
  add column if not exists client_offer_sent_at timestamptz,
  add column if not exists settlement_offer_sent_at timestamptz;
