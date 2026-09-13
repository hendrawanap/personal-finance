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
-- 7. SPLIT BILLS — OWNER OR AUTHORIZED PARTICIPANT
-- Owner has full access; participants can view the bill they are involved in
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
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bill_participants sbp
            WHERE sbp.bill_id = personal_finance.split_bills.id
            AND lower(sbp.email) = lower(coalesce(auth.jwt()->>'email', ''))
        )
    );

-- ==============================================================================
-- 8. SPLIT BILL PARTICIPANTS — OWNER OR SELF PARTICIPANT
-- ==============================================================================
CREATE POLICY "Strict: Manage participants of own bills"
    ON personal_finance.split_bill_participants
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bills sb
            WHERE sb.id = split_bill_participants.bill_id
            AND sb.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bills sb
            WHERE sb.id = split_bill_participants.bill_id
            AND sb.user_id = auth.uid()
        )
    );

CREATE POLICY "Strict: Participants can view and update own settlement status"
    ON personal_finance.split_bill_participants
    FOR SELECT
    TO authenticated
    USING (
        lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    );

CREATE POLICY "Strict: Participants can update own settlement"
    ON personal_finance.split_bill_participants
    FOR UPDATE
    TO authenticated
    USING (
        lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    )
    WITH CHECK (
        lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    );

-- ==============================================================================
-- 9. SPLIT BILL ITEMS — OWNER OR PARTICIPANTS OF BILL
-- ==============================================================================
CREATE POLICY "Strict: Manage items of own bills"
    ON personal_finance.split_bill_items
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bills sb
            WHERE sb.id = split_bill_items.bill_id
            AND sb.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bills sb
            WHERE sb.id = split_bill_items.bill_id
            AND sb.user_id = auth.uid()
        )
    );

CREATE POLICY "Strict: Participants can view items of shared bills"
    ON personal_finance.split_bill_items
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bill_participants sbp
            WHERE sbp.bill_id = split_bill_items.bill_id
            AND lower(sbp.email) = lower(coalesce(auth.jwt()->>'email', ''))
        )
    );
