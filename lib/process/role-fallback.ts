import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rezolwer łańcucha fallbacku ról (/docs/04 §2.2). role_fallback w bazie NIE ma
 * zabezpieczenia przed cyklem (świadoma decyzja — docs/08: "wystarczy limit głębokości
 * w kodzie, nie trzeba constraintu"), więc ograniczenie głębokości i wykrywanie cyklu
 * żyje wyłącznie tutaj.
 *
 * Czysta funkcja — nie robi I/O, żeby dało się ją testować i reużyć (asystent planowania,
 * zastępstwa urlopowe) bez zależności od Supabase.
 */
export type RoleFallbackCoverage = {
  /** Rola, która faktycznie pokrywa odpowiedzialność (może być tą samą co roleCode, jeśli slot jest obsadzony wprost). */
  coveredByRoleCode: string;
  userId: string;
  /** Kody ról odwiedzone po drodze (bez roleCode), w kolejności. Pusta tablica = pokrycie wprost. */
  via: string[];
};

export function resolveRoleFallback(
  roleCode: string,
  activeHolderByRole: ReadonlyMap<string, string>,
  fallbackEdgeByRole: ReadonlyMap<string, string>,
  maxDepth = 5,
): RoleFallbackCoverage | null {
  const directHolder = activeHolderByRole.get(roleCode);
  if (directHolder) {
    return { coveredByRoleCode: roleCode, userId: directHolder, via: [] };
  }

  const visited = new Set<string>([roleCode]);
  const via: string[] = [];
  let current = roleCode;

  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next = fallbackEdgeByRole.get(current);
    if (!next) {
      return null;
    }
    if (visited.has(next)) {
      // Cykl w danych (role_fallback nie ma zabezpieczenia w bazie) — przerywamy, nie pętlimy się.
      return null;
    }
    visited.add(next);
    via.push(next);

    const holder = activeHolderByRole.get(next);
    if (holder) {
      return { coveredByRoleCode: next, userId: holder, via };
    }
    current = next;
  }

  return null;
}

/**
 * Wariant z I/O — pobiera aktywne sloty projektu i cały słownik fallbacku, woła resolveRoleFallback.
 * Do użycia w kodzie serwerowym/klienckim, gdzie potrzebne jest jedno konkretne pokrycie.
 */
export async function resolveRoleFallbackForProject(
  supabase: SupabaseClient,
  projectId: string,
  roleCode: string,
  maxDepth = 5,
): Promise<RoleFallbackCoverage | null> {
  const [{ data: slotRows, error: slotError }, { data: fallbackRows, error: fallbackError }] = await Promise.all([
    supabase
      .from("project_role_slot")
      .select("role_code, user_id")
      .eq("project_id", projectId)
      .is("to_date", null),
    supabase.from("role_fallback").select("role_code, fallback_role_code").order("priority", { ascending: true }),
  ]);

  if (slotError) throw new Error(slotError.message);
  if (fallbackError) throw new Error(fallbackError.message);

  const activeHolderByRole = new Map<string, string>();
  (slotRows ?? []).forEach((row) => {
    if (!activeHolderByRole.has(row.role_code)) {
      activeHolderByRole.set(row.role_code, row.user_id);
    }
  });

  const fallbackEdgeByRole = new Map<string, string>();
  (fallbackRows ?? []).forEach((row) => {
    if (!fallbackEdgeByRole.has(row.role_code)) {
      fallbackEdgeByRole.set(row.role_code, row.fallback_role_code);
    }
  });

  return resolveRoleFallback(roleCode, activeHolderByRole, fallbackEdgeByRole, maxDepth);
}
