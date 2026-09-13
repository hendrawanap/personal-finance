-- ==============================================================================
-- PERSONAL FINANCE DASHBOARD — STRICT ROW LEVEL SECURITY (RLS) MIGRATION
-- Schema: personal_finance
--
-- Run this script in your Supabase SQL Editor to enforce strict multi-tenant
-- data isolation so that all data is exclusively accessible by the authenticated
-- data owner (auth.uid()) or authorized split bill participants.
-- ==============================================================================

-- 1. Ensure RLS is enabled on all tables
ALTER TABLE personal_finance.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bill_items ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old permissive policies
DROP POLICY IF EXISTS "Users can manage own profile" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Users can manage own accounts" ON personal_finance.accounts;
DROP POLICY IF EXISTS "Users can manage own transactions" ON personal_finance.transactions;
DROP POLICY IF EXISTS "Users can manage own budgets" ON personal_finance.budgets;
DROP POLICY IF EXISTS "Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Users can manage split bill items" ON personal_finance.split_bill_items;

DROP POLICY IF EXISTS "Strict: Users can manage own profile" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can manage own accounts" ON personal_finance.accounts;
DROP POLICY IF EXISTS "Strict: Users can manage own transactions" ON personal_finance.transactions;
DROP POLICY IF EXISTS "Strict: Users can manage own budgets" ON personal_finance.budgets;
DROP POLICY IF EXISTS "Strict: Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Users can manage split bill items" ON personal_finance.split_bill_items;

-- ==============================================================================
-- 3. PROFILES — STRICT ISOLATION
-- Only the authenticated user matching user_id can select, insert, update, delete
-- ==============================================================================
CREATE POLICY "Strict: Users can manage own profile"
    ON personal_finance.profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 4. ACCOUNTS — STRICT ISOLATION
-- Only the owner can view or modify accounts
-- ==============================================================================
CREATE POLICY "Strict: Users can manage own accounts"
    ON personal_finance.accounts
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 5. TRANSACTIONS — STRICT ISOLATION
-- Only the owner can view or modify transactions
-- ==============================================================================
CREATE POLICY "Strict: Users can manage own transactions"
    ON personal_finance.transactions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 6. BUDGETS — STRICT ISOLATION
-- Only the owner can view or modify budgets
-- ==============================================================================
CREATE POLICY "Strict: Users can manage own budgets"
    ON personal_finance.budgets
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ==============================================================================
-- 7. HELPER FUNCTIONS (SECURITY DEFINER breaks RLS circular evaluation)
-- ==============================================================================
CREATE OR REPLACE FUNCTION personal_finance.is_bill_participant(check_bill_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = personal_finance, public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM personal_finance.split_bill_participants sbp
        WHERE sbp.bill_id = check_bill_id
        AND (
            sbp.user_id = auth.uid()
            OR (sbp.email IS NOT NULL AND lower(sbp.email) = lower(coalesce(auth.jwt()->>'email', '')))
        )
    );
$$;

CREATE OR REPLACE FUNCTION personal_finance.is_bill_owner(check_bill_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = personal_finance, public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM personal_finance.split_bills sb
        WHERE sb.id = check_bill_id
        AND sb.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION personal_finance.can_access_bill(check_bill_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = personal_finance, public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM personal_finance.split_bills sb
        WHERE sb.id = check_bill_id
        AND (
            sb.user_id = auth.uid()
            OR personal_finance.is_bill_participant(check_bill_id)
        )
    );
$$;

GRANT EXECUTE ON FUNCTION personal_finance.is_bill_participant(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION personal_finance.is_bill_owner(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION personal_finance.can_access_bill(TEXT) TO authenticated;

-- ==============================================================================
-- 8. SPLIT BILLS — OWNER OR AUTHORIZED PARTICIPANT
-- ==============================================================================
CREATE POLICY "Strict: Bill owners have full access"
    ON personal_finance.split_bills
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Strict: Participants can view shared split bills"
    ON personal_finance.split_bills
    FOR SELECT
    TO authenticated
    USING (personal_finance.is_bill_participant(id));

-- ==============================================================================
-- 9. SPLIT BILL PARTICIPANTS — OWNER OR SELF PARTICIPANT
-- ==============================================================================
CREATE POLICY "Strict: Manage participants of own bills"
    ON personal_finance.split_bill_participants
    FOR ALL
    TO authenticated
    USING (personal_finance.is_bill_owner(bill_id))
    WITH CHECK (personal_finance.is_bill_owner(bill_id));

CREATE POLICY "Strict: View participants of accessible bills"
    ON personal_finance.split_bill_participants
    FOR SELECT
    TO authenticated
    USING (
        personal_finance.can_access_bill(bill_id)
        OR user_id = auth.uid()
        OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
    );

CREATE POLICY "Strict: Participants can update own settlement"
    ON personal_finance.split_bill_participants
    FOR UPDATE
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
    )
    WITH CHECK (
        user_id = auth.uid()
        OR (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
    );

-- ==============================================================================
-- 10. SPLIT BILL ITEMS — OWNER OR PARTICIPANTS OF BILL
-- ==============================================================================
CREATE POLICY "Strict: Manage items of own bills"
    ON personal_finance.split_bill_items
    FOR ALL
    TO authenticated
    USING (personal_finance.is_bill_owner(bill_id))
    WITH CHECK (personal_finance.is_bill_owner(bill_id));

CREATE POLICY "Strict: Participants can view items of shared bills"
    ON personal_finance.split_bill_items
    FOR SELECT
    TO authenticated
    USING (personal_finance.can_access_bill(bill_id));
