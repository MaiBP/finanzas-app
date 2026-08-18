-- CREATE OR REPLACE FUNCTION with an appended, defaulted parameter does NOT replace the existing
-- function in place — Postgres treats the extra parameter as a genuinely different signature and
-- keeps both overloads side by side. Any call that omits p_items (e.g. executeStatementImport)
-- then fails with "Could not choose the best candidate function", because either overload could
-- match. Dropping the old 11-argument overload leaves only the 12-argument one from migration
-- 202608170003 (p_items defaults to null), so every existing call site works unambiguously again.
drop function if exists public.create_financial_transaction_as_user(uuid,uuid,uuid,text,bigint,text,uuid,text,text,date,uuid,text);
