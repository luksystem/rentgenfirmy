-- Uzupełnij brakującą datę utworzenia projektu (starsze rekordy).
update public.projects
set created_at = last_changed_at
where created_at is null;
