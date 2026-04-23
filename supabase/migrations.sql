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

-- =====================================================================
-- Migration: User identity, audit trail, multi-currency
-- Run this block in Supabase SQL Editor (after the block above)
-- =====================================================================

-- 1. Merge user_links into members (Google account IS the member)
ALTER TABLE members ADD COLUMN IF NOT EXISTS
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

-- Copy existing links into members.user_id
UPDATE members m
  SET user_id = ul.user_id
  FROM user_links ul
  WHERE ul.member_id = m.id;

DROP TABLE IF EXISTS user_links;

-- Update members RLS: owner can update their own row; anyone can insert (creating profile)
DROP POLICY IF EXISTS "members_manage" ON members;
CREATE POLICY "members_insert" ON members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "members_delete" ON members FOR DELETE TO authenticated
  USING (user_id IS NULL);

-- 2. Expense audit log (no FK on expense_id — append-only, survives deletions)
CREATE TABLE IF NOT EXISTS expense_audit (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  expense_id      bigint,
  action          text NOT NULL,            -- 'create' | 'update' | 'delete'
  changed_by      uuid NOT NULL REFERENCES auth.users(id),
  changed_by_name text,
  changed_at      timestamptz DEFAULT now(),
  snapshot        jsonb NOT NULL
);
ALTER TABLE expense_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_select" ON expense_audit FOR SELECT TO authenticated USING (true);
CREATE POLICY "audit_insert" ON expense_audit FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 3. Exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
  from_currency text NOT NULL,
  to_currency   text NOT NULL,
  rate          numeric(12, 6) NOT NULL,
  updated_at    timestamptz DEFAULT now(),
  updated_by    uuid REFERENCES auth.users(id),
  PRIMARY KEY (from_currency, to_currency)
);
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates_select" ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "rates_upsert" ON exchange_rates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed placeholder rates (editable via app UI)
INSERT INTO exchange_rates (from_currency, to_currency, rate)
VALUES ('THB', 'MYR', 0.130000), ('THB', 'SGD', 0.040000)
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- =====================================================================
-- Migration: Multi-currency expense entry (THB / MYR / SGD)
-- Run this block after the block above
-- =====================================================================

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS
  currency text NOT NULL DEFAULT 'THB';

-- =====================================================================
-- Fix: allow users to delete their own member row (delete account)
-- Run this block if "ลบบัญชีนี้" button shows permission error
-- =====================================================================

DROP POLICY IF EXISTS "members_delete" ON members;
CREATE POLICY "members_delete" ON members FOR DELETE TO authenticated
  USING (user_id IS NULL OR user_id = auth.uid());

-- =====================================================================
-- Migration: Add avatar_url to members for profile picture display
-- Run this block in Supabase SQL Editor
-- =====================================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS avatar_url text;

-- =====================================================================
-- Migration: Allow claiming unlinked member rows (manual member → Google account)
-- Run this block in Supabase SQL Editor
-- =====================================================================

DROP POLICY IF EXISTS "members_update" ON members;
CREATE POLICY "members_update" ON members FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- Fix: delete flags when the flagging member is deleted
-- Run this block in Supabase SQL Editor
-- =====================================================================

ALTER TABLE expense_flags
  DROP CONSTRAINT expense_flags_member_id_fkey,
  ADD CONSTRAINT expense_flags_member_id_fkey
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;
