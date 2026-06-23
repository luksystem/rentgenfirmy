-- Rola wewnętrzna (Administrator) w procesie akceptacji ustaleń

alter table public.project_agreement_approver_roles
  add column if not exists is_team_role boolean not null default false;

-- Domyślna rola Administrator dla istniejących ustaleń
insert into public.project_agreement_approver_roles (
  agreement_id,
  label,
  position,
  is_required,
  is_client_role,
  is_team_role
)
select a.id, 'Administrator', -1, true, false, true
from public.project_client_agreements a
where not exists (
  select 1
  from public.project_agreement_approver_roles r
  where r.agreement_id = a.id
    and r.is_team_role = true
);

-- Uporządkuj pozycje: Administrator przed Klientem
with ordered as (
  select
    r.id,
    row_number() over (
      partition by r.agreement_id
      order by r.is_team_role desc, r.is_client_role asc, r.position, r.created_at
    ) - 1 as next_position
  from public.project_agreement_approver_roles r
)
update public.project_agreement_approver_roles r
set position = ordered.next_position
from ordered
where r.id = ordered.id;

-- Brakujące akceptacje Administratora dla aktywnych wersji w toku
insert into public.project_agreement_approvals (version_id, role_id, status)
select a.active_version_id, r.id, 'pending'
from public.project_client_agreements a
join public.project_agreement_approver_roles r
  on r.agreement_id = a.id
 and r.is_team_role = true
where a.status = 'pending_client'
  and a.active_version_id is not null
  and not exists (
    select 1
    from public.project_agreement_approvals ap
    where ap.version_id = a.active_version_id
      and ap.role_id = r.id
  );
