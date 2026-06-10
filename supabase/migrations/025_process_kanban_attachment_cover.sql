-- Okładka karty Kanban (tylko jedno zdjęcie na zgłoszenie)

alter table public.process_kanban_task_attachments
  add column if not exists is_card_cover boolean not null default false;

create index if not exists process_kanban_task_attachments_cover_idx
  on public.process_kanban_task_attachments (task_id)
  where is_card_cover = true and media_kind = 'image';

-- Zachowaj dotychczasowe zachowanie: pierwsze zdjęcie na karcie = okładka
update public.process_kanban_task_attachments target
set is_card_cover = true
from (
  select distinct on (task_id) id
  from public.process_kanban_task_attachments
  where media_kind = 'image'
  order by task_id, position asc, created_at asc
) first_image
where target.id = first_image.id;
