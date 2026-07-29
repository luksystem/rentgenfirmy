-- project_process_items.template_item_id jest typu uuid (nie text, jak zalozylem w 235) -
-- zlapane przez test tablicy prawdy przed jakimkolwiek prawdziwym uzyciem.
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
    where pi.id::text = new.template_item_id::text;

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
