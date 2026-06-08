export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function jsonError(error: unknown) {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Error) {
    const code = "code" in error ? (error as Error & { code?: string }).code : undefined;
    return Response.json({ error: error.message, code }, { status: 500 });
  }

  return Response.json({ error: "Nieoczekiwany błąd." }, { status: 500 });
}
