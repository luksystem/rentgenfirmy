import { getSupabase } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

const BUCKET = "project-technical-documents";

type TechnicalDocumentRow = Database["public"]["Tables"]["project_technical_documents"]["Row"];

export type ProjectTechnicalDocument = {
  id: string;
  projectId: string;
  storagePath: string;
  fileName: string;
  sizeBytes: number | null;
  uploadedById: string | null;
  uploadedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

function rowToTechnicalDocument(row: TechnicalDocumentRow): ProjectTechnicalDocument {
  return {
    id: row.id,
    projectId: row.project_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    sizeBytes: row.size_bytes,
    uploadedById: row.uploaded_by_id,
    uploadedByName: row.uploaded_by_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Ten plik NIGDY nie może trafić do publicznego dashboardu klienta — wołaj tylko w trybie
 *  zespołu (!readOnly), tak jak dziś chroniony jest moduł Rozdzielnie. */
export async function fetchProjectTechnicalDocument(
  projectId: string,
): Promise<ProjectTechnicalDocument | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("project_technical_documents")
    .select("*")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? rowToTechnicalDocument(data as TechnicalDocumentRow) : null;
}

/** Wgrywa (lub nadpisuje) jedyny plik dokumentacji technicznej projektu — `unique(project_id)`
 *  w bazie sprawia, że powtórne wgranie zastępuje poprzedni wpis, nie duplikuje. */
export async function uploadProjectTechnicalDocument(
  projectId: string,
  file: File,
  uploadedBy: { id: string | null; name: string },
): Promise<ProjectTechnicalDocument> {
  const supabase = getSupabase();
  // Nazwa pliku (z polskimi znakami) trzymana osobno w file_name do wyświetlania — sam klucz w
  // Storage musi być bezpiecznym ASCII, inaczej upload odrzuca żądanie ("Invalid key").
  const extensionMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
  const extension = extensionMatch ? extensionMatch[0] : ".xlsx";
  const storagePath = `${projectId}/${crypto.randomUUID()}${extension}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType:
      file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    upsert: false,
  });
  if (uploadError) throw new Error(uploadError.message);

  const { data: existing } = await supabase
    .from("project_technical_documents")
    .select("storage_path")
    .eq("project_id", projectId)
    .maybeSingle();
  const previousPath = (existing as { storage_path?: string } | null)?.storage_path;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_technical_documents")
    .upsert(
      {
        project_id: projectId,
        storage_path: storagePath,
        file_name: file.name,
        size_bytes: file.size,
        uploaded_by_id: uploadedBy.id,
        uploaded_by_name: uploadedBy.name.trim() || "Zespół",
        updated_at: now,
      },
      { onConflict: "project_id" },
    )
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  if (previousPath && previousPath !== storagePath) {
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return rowToTechnicalDocument(data as TechnicalDocumentRow);
}
