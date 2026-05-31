import { z } from "zod";

export function zodStringOption(options: string[], message: string) {
  if (options.length === 0) {
    return z.string().min(1, message);
  }

  return z.enum([options[0], ...options.slice(1)] as [string, ...string[]], {
    message,
  });
}
