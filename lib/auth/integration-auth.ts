import { HttpError } from "@/lib/auth/http-error";
import { isAdministratorRole, isIntegrationOperator } from "@/lib/auth/types";
import { requireAuthenticatedProfile } from "@/lib/auth/api-auth";

export { isIntegrationOperator };

export async function requireIntegrationAdmin() {
  const session = await requireAuthenticatedProfile();
  if (!isAdministratorRole(session.profile.role)) {
    throw new HttpError(403, "Brak uprawnień do zarządzania integracjami.");
  }
  return session;
}

export async function requireIntegrationOperator() {
  const session = await requireAuthenticatedProfile();
  if (!isIntegrationOperator(session.profile.role)) {
    throw new HttpError(403, "Brak uprawnień do tej operacji.");
  }
  return session;
}

export async function requireIntegrationViewer() {
  return requireIntegrationOperator();
}
