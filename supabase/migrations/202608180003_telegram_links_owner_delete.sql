-- Lets a user unlink their own Telegram account directly from the web (Ajustes), using their own
-- RLS-scoped session client rather than a security-definer function — mirrors "own telegram link
-- read", just for delete. Re-linking afterward still goes through link_telegram_account as usual.
create policy "own telegram link delete" on public.telegram_links for delete using (user_id = auth.uid());
