const MAX_SMS_LENGTH = 1600;

export function normalizePhoneDigits(input: string) {
  const trimmed = input.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (!digits) {
    return null;
  }

  if (hasPlus) {
    return digits;
  }

  if (digits.length === 9 && /^[4-9]/.test(digits)) {
    return `48${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("48")) {
    return digits;
  }

  if (digits.length >= 8 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function formatPhoneForDisplay(digits: string) {
  if (digits.startsWith("48") && digits.length === 11) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return `+${digits}`;
}

export function validateSmsPhone(input: string) {
  const normalized = normalizePhoneDigits(input);
  if (!normalized) {
    return { ok: false as const, error: "Podaj poprawny numer telefonu (np. +48500100200)." };
  }

  if (normalized.length < 8 || normalized.length > 15) {
    return { ok: false as const, error: "Numer telefonu ma nieprawidłową długość." };
  }

  return {
    ok: true as const,
    normalized,
    display: formatPhoneForDisplay(normalized),
  };
}

export function validateSmsMessage(input: string) {
  const message = input.trim();

  if (!message) {
    return { ok: false as const, error: "Treść SMS nie może być pusta." };
  }

  if (message.length > MAX_SMS_LENGTH) {
    return {
      ok: false as const,
      error: `Treść SMS może mieć maksymalnie ${MAX_SMS_LENGTH} znaków.`,
    };
  }

  return { ok: true as const, message };
}
