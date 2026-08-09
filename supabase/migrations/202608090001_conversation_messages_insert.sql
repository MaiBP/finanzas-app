create policy "own messages create" on public.conversation_messages for insert with check(user_id=auth.uid() and is_household_member(household_id));
