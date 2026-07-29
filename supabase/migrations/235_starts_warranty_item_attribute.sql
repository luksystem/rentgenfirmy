-- D19 SS2a poprawione (docs/CLAUDE.md, odwiazanie od etapow) - "gwarancja biegnie od protokolu
-- przekazania rozdzielni (Etap 7)" bylo hardkodowanym zalozeniem w tresci decyzji, nigdy
-- zaimplementowanym w kodzie (systemHandoverAt jest dzis czysto recznym polem). Wlasciciel
-- potwierdzil: protokol koncowy jest PODPISYWANY, wiec signed_at wystarcza jako zrodlo daty -
-- atrybut na ELEMENCIE szablonu (process_items), nie na etapie. Przy wielu etapach zamykajacych
-- nie ma pytania "ktory protokol" - decyduje flaga na elemencie, nie pozycja/etap.
alter table public.process_items
  add column starts_warranty boolean not null default false;

comment on column public.process_items.starts_warranty is
  'Faza 7/D26 (docs/CLAUDE.md - odwiazanie od etapow) - element, ktorego podpisanie (signed_at) '
  'wypelnia projects.system_handover_at, o ile puste. Atrybut szablonu (standard firmy, D1) - '
  'nieedytowalny per projekt. Edytor: components/process/process-template-editor.tsx.';

create or replace function public.apply_warranty_start_on_item_signature()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_warranty boolean;
begin
  if new.signed_at is not null and old.signed_at is null then
    select pi.starts_warranty into v_starts_warranty
    from process_items pi
    where pi.id::text = new.template_item_id;

    if coalesce(v_starts_warranty, false) then
      update projects
      set system_handover_at = new.signed_at::date
      where id = new.project_id
        and system_handover_at is null;
    end if;
  end if;
  return new;
end;
$$;

comment on function public.apply_warranty_start_on_item_signature is
  'Faza 7/D26 - podpisanie elementu z process_items.starts_warranty=true wypelnia '
  'projects.system_handover_at (tylko gdy puste - nie nadpisuje recznej korekty). Miekkie '
  'odniesienie template_item_id -> process_items.id (element moze nie istniec, jesli szablon '
  'zostal edytowany po zakotwiczeniu projektu - wtedy select nic nie zwraca, trigger nic nie robi).';

create trigger project_process_items_apply_warranty_start
  after update of signed_at on public.project_process_items
  for each row execute function public.apply_warranty_start_on_item_signature();
