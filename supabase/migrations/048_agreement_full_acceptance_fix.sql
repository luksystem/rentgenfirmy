-- Naprawa ustaleń błędnie oznaczonych jako zaakceptowane bez pełnej akceptacji wszystkich ról

-- Uzupełnij brakujące wiersze akceptacji dla wymaganych ról na aktywnej wersji
insert into public.project_agreement_approvals (version_id, role_id, status)
select a.active_version_id, r.id, 'pending'
from public.project_client_agreements a
join public.project_agreement_approver_roles r
  on r.agreement_id = a.id
 and r.is_required = true
where a.status = 'pending_client'
  and a.active_version_id is not null
  and not exists (
    select 1
    from public.project_agreement_approvals ap
    where ap.version_id = a.active_version_id
      and ap.role_id = r.id
  );

-- Cofnij status „accepted”, gdy wymagana rola nie ma akceptacji
update public.project_client_agreements a
set
  status = 'pending_client',
  client_responded_at = null,
  updated_at = now()
where a.status = 'accepted'
  and a.active_version_id is not null
  and exists (
    select 1
    from public.project_agreement_approver_roles r
    where r.agreement_id = a.id
      and r.is_required = true
      and not exists (
        select 1
        from public.project_agreement_approvals ap
        where ap.version_id = a.active_version_id
          and ap.role_id = r.id
          and ap.status = 'accepted'
      )
  );
