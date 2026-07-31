-- Preferencje widzetow strony glownej per uzytkownik.
-- NULL = uzyj domyslnego zestawu widzetow dla roli (patrz lib/home-widgets/registry.ts).

alter table public.profiles
  add column if not exists home_widgets jsonb null;

comment on column public.profiles.home_widgets is
  'Lista ID wybranych przez usera widzetow strony glownej. NULL = uzyj domyslnego zestawu dla roli.';
