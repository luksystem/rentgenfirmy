import {
  FileText,
  Image as ImageIcon,
  KeyRound,
  NotebookPen,
  RefreshCcw,
  ShieldCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const QUICK_ADD_CATEGORIES = [
  "photo",
  "file",
  "note",
  "protocol",
  "credential",
  "agreement",
  "change_request",
] as const;

export type QuickAddCategory = (typeof QUICK_ADD_CATEGORIES)[number];

export const QUICK_ADD_CATEGORY_META: Record<
  QuickAddCategory,
  { label: string; description: string; icon: LucideIcon }
> = {
  photo: {
    label: "Zdjęcie",
    description: "Fotografia z instalacji lub obiektu",
    icon: ImageIcon,
  },
  file: {
    label: "Dokumentacja",
    description: "Skan, PDF, plan lub inny plik",
    icon: FileText,
  },
  note: {
    label: "Notatka",
    description: "Notatka ze spotkania — AI pomoże ją sformatować",
    icon: NotebookPen,
  },
  protocol: {
    label: "Protokół",
    description: "Podpisanie istniejącego protokołu w procesie projektu",
    icon: ShieldCheck,
  },
  credential: {
    label: "Linki i hasła",
    description: "Dostęp do systemu — szyfrowane hasło",
    icon: KeyRound,
  },
  agreement: {
    label: "Ustalenie",
    description: "Nowe ustalenie do akceptacji klienta",
    icon: Wrench,
  },
  change_request: {
    label: "Zmiana projektu",
    description: "Zgłoszenie zmiany zakresu lub kosztu",
    icon: RefreshCcw,
  },
};
