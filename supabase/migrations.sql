-- =====================================================================
-- Migration: Add Google Auth, ownership, and peer flag system
-- Run this entire file in Supabase SQL Editor
-- =====================================================================

-- 1. Add created_by to expenses
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Create user_links: maps auth user → group member (one-to-one)
CREATE TABLE IF NOT EXISTS user_links (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  member_id  bigint NOT NULL UNIQUE REFERENCES members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- 3. Create expense_flags: peer flagging system
CREATE TABLE IF NOT EXISTS expense_flags (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expense_id BIGINT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL REFERENCES auth.users(id),
  member_id  BIGINT REFERENCES members(id),
  note       TEXT NOT NULL DEFAULT '',
  resolved   BOOLEAN NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. RLS: expenses (replace old allow-all)
DROP POLICY IF EXISTS "allow all" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated
  USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 5. RLS: expense_splits (restrict via parent expense)
DROP POLICY IF EXISTS "allow all" ON expense_splits;
CREATE POLICY "splits_select" ON expense_splits FOR SELECT TO authenticated USING (true);
CREATE POLICY "splits_insert" ON expense_splits FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid()));
CREATE POLICY "splits_delete" ON expense_splits FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid()));

-- 6. RLS: members
DROP POLICY IF EXISTS "allow all" ON members;
CREATE POLICY "members_select" ON members FOR SELECT TO authenticated USING (true);
CREATE POLICY "members_manage" ON members FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. RLS: user_links
ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_links_select" ON user_links FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_links_insert" ON user_links FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_links_delete" ON user_links FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 8. RLS: expense_flags
ALTER TABLE expense_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flags_select" ON expense_flags FOR SELECT TO authenticated USING (true);
CREATE POLICY "flags_insert" ON expense_flags FOR INSERT TO authenticated
  WITH CHECK (flagged_by = auth.uid());
CREATE POLICY "flags_resolve" ON expense_flags FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM expenses WHERE id = expense_id AND created_by = auth.uid()));
