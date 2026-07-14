import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ProjectContactRow } from "@/lib/supabase/database.types";
import { rowToContact } from "@/lib/supabase/contact-mappers";
import type {
  ProjectContact,
  ProjectContactInput,
  ProjectContactRole,
} from "@/lib/viz/project-contact-types";

type ProjectContactRowLocal = ProjectContactRow;

function resolveDisplayName(
  row: ProjectContactRowLocal,
  contact?: { first_name: string | null; last_name: string | null } | null,
) {
  if (row.display_name?.trim()) {
    return row.display_name.trim();
  }
  if (contact) {
    return [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim() || null;
  }
  return null;
}

function rowToProjectContact(
  row: ProjectContactRowLocal,
  contact?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null,
): ProjectContact {
  return {
    id: row.id,
    projectId: row.project_id,
    contactId: row.contact_id,
    roleCode: row.role_code as ProjectContactRole,
    displayName: resolveDisplayName(row, contact),
    email: row.email?.trim() || contact?.email || null,
    phone: row.phone?.trim() || contact?.phone || null,
    notes: row.notes,
    isPrimary: row.is_primary,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contactFirstName: contact?.first_name ?? null,
    contactLastName: contact?.last_name ?? null,
    contactEmail: contact?.email ?? null,
    contactPhone: contact?.phone ?? null,
  };
}

export async function listProjectContacts(projectId: string): Promise<ProjectContact[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_contacts")
    .select("*")
    .eq("project_id", projectId)
    .order("is_primary", { ascending: false })
    .order("sort_order")
    .order("created_at");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as ProjectContactRowLocal[];
  const contactIds = [...new Set(rows.map((row) => row.contact_id).filter(Boolean))] as string[];

  const { data: contacts } = contactIds.length
    ? await supabase
        .from("contacts")
        .select("id, first_name, last_name, email, phone")
        .in("id", contactIds)
    : { data: [] };

  const contactById = new Map((contacts ?? []).map((row) => [row.id as string, row]));

  return rows.map((row) =>
    rowToProjectContact(row, row.contact_id ? contactById.get(row.contact_id) : null),
  );
}

export async function createProjectContact(projectId: string, input: ProjectContactInput) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_contacts")
    .insert({
      project_id: projectId,
      contact_id: input.contactId ?? null,
      role_code: input.roleCode,
      display_name: input.displayName?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      notes: input.notes?.trim() || null,
      is_primary: input.isPrimary ?? false,
      sort_order: input.sortOrder ?? 0,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const row = data as ProjectContactRowLocal;
  if (row.contact_id) {
    const { data: contact } = await supabase
      .from("contacts")
      .select("id, first_name, last_name, email, phone")
      .eq("id", row.contact_id)
      .maybeSingle();
    return rowToProjectContact(row, contact);
  }

  return rowToProjectContact(row, null);
}

export async function deleteProjectContact(contactLinkId: string) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("project_contacts").delete().eq("id", contactLinkId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listContactsForPicker() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("last_name")
    .order("first_name")
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => rowToContact(row));
}
