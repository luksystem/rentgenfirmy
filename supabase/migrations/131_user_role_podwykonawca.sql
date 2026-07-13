-- Nowa rola użytkownika: podwykonawca

alter type public.user_role add value if not exists 'podwykonawca';

notify pgrst, 'reload schema';
