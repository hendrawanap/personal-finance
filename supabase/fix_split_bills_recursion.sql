-- ==============================================================================
-- FIX: INFINITE RECURSION IN SPLIT_BILLS RLS POLICIES (ERROR 42P17)
-- Schema: personal_finance
--
-- Run this script in the Supabase SQL Editor to eliminate mutual RLS recursion
-- between split_bills, split_bill_participants, and split_bill_items.
-- ==============================================================================

-- 1. Helper Functions (SECURITY DEFINER breaks RLS circular evaluation)
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

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION personal_finance.is_bill_participant(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION personal_finance.is_bill_owner(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION personal_finance.can_access_bill(TEXT) TO authenticated;

-- 2. Drop existing recursive policies on Split Bills tables
DROP POLICY IF EXISTS "Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Bill owners have full access" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Participants can view shared split bills" ON personal_finance.split_bills;

DROP POLICY IF EXISTS "Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Manage participants of own bills" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: View participants of accessible bills" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Participants can view and update own settlement status" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Participants can update own settlement" ON personal_finance.split_bill_participants;

DROP POLICY IF EXISTS "Users can manage split bill items" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Users can manage split bill items" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Manage items of own bills" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Participants can view items of shared bills" ON personal_finance.split_bill_items;

-- 3. Re-create non-recursive policies using helper functions

-- ── SPLIT BILLS ──
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

-- ── SPLIT BILL PARTICIPANTS ──
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

-- ── SPLIT BILL ITEMS ──
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
