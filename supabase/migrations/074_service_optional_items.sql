-- Opcjonalne pozycje w ofercie/rozliczeniu serwisowym (wybór klienta przy akceptacji)
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS optional_items jsonb NOT NULL DEFAULT '[]'::jsonb;
