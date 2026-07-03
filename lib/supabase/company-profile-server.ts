import {
  COMPANY_ASSETS_BUCKET,
  extensionForLogoMimeType,
  validateCompanyLogoFile,
} from "@/lib/company/company-logo";
import {
  COMPANY_PROFILE_SETTINGS_ID,
  DEFAULT_COMPANY_PROFILE,
  normalizeCompanyProfile,
  type CompanyProfile,
} from "@/lib/company/company-profile";
import { resolveCompanyProfileDocument } from "@/lib/company/company-profile-document";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function fetchCompanyProfileServer() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("app_settings")
    .select("data")
    .eq("id", COMPANY_PROFILE_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCompanyProfile(data?.data ?? DEFAULT_COMPANY_PROFILE);
}

export async function saveCompanyProfileServer(profile: CompanyProfile) {
  const supabase = getSupabaseServer();
  const normalized = normalizeCompanyProfile(profile);

  const { data, error } = await supabase
    .from("app_settings")
    .upsert(
      {
        id: COMPANY_PROFILE_SETTINGS_ID,
        data: normalized,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .select("data")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeCompanyProfile(data.data);
}

export async function resolveCompanyProfileDocumentServer() {
  const profile = await fetchCompanyProfileServer();
  return resolveCompanyProfileDocument(profile);
}

export async function uploadCompanyLogoServer(file: File) {
  validateCompanyLogoFile(file);

  const supabase = getSupabaseServer();
  const profile = await fetchCompanyProfileServer();
  const extension = extensionForLogoMimeType(file.type || "image/png");
  const storagePath = `logo.${extension}`;
  const fileBuffer = await file.arrayBuffer();

  if (profile.logoStoragePath && profile.logoStoragePath !== storagePath) {
    await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove([profile.logoStoragePath]);
  }

  const { error: uploadError } = await supabase.storage
    .from(COMPANY_ASSETS_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const saved = await saveCompanyProfileServer({
    ...profile,
    logoStoragePath: storagePath,
  });

  return resolveCompanyProfileDocument(saved);
}

export async function removeCompanyLogoServer() {
  const supabase = getSupabaseServer();
  const profile = await fetchCompanyProfileServer();

  if (profile.logoStoragePath) {
    await supabase.storage.from(COMPANY_ASSETS_BUCKET).remove([profile.logoStoragePath]);
  }

  const saved = await saveCompanyProfileServer({
    ...profile,
    logoStoragePath: null,
  });

  return resolveCompanyProfileDocument(saved);
}
