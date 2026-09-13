-- ==============================================================================
-- PERSONAL FINANCE — FRIENDS & SHARED SPLIT BILLS MIGRATION
-- Schema: personal_finance
--
-- Run this SQL in your Supabase SQL Editor to enable:
-- 1. Friends management (add, list, connect with other users)
-- 2. Sharing split bills with participants
-- 3. Enabling participants to view shared bills and update settlement status
-- ==============================================================================

-- 1. Ensure personal_finance schema exists
CREATE SCHEMA IF NOT EXISTS personal_finance;

-- 2. Add user_id column to split_bill_participants if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'personal_finance' 
          AND table_name = 'split_bill_participants' 
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE personal_finance.split_bill_participants 
        ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Create friends table
CREATE TABLE IF NOT EXISTS personal_finance.friends (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('pending', 'accepted')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_friends_user_email UNIQUE (user_id, email)
);

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON personal_finance.friends(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_friend_user_id ON personal_finance.friends(friend_user_id);
CREATE INDEX IF NOT EXISTS idx_friends_email ON personal_finance.friends(lower(email));
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_user_id ON personal_finance.split_bill_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_email ON personal_finance.split_bill_participants(lower(email));

-- 5. Updated timestamp trigger for friends
DROP TRIGGER IF EXISTS set_friends_updated_at ON personal_finance.friends;
CREATE TRIGGER set_friends_updated_at
    BEFORE UPDATE ON personal_finance.friends
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_updated_at();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE personal_finance.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bill_items ENABLE ROW LEVEL SECURITY;

-- ── 7. FRIENDS POLICIES ──
DROP POLICY IF EXISTS "Strict: Users can manage own friends" ON personal_finance.friends;
CREATE POLICY "Strict: Users can manage own friends"
    ON personal_finance.friends
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Strict: Users can view mutual friendships" ON personal_finance.friends;
CREATE POLICY "Strict: Users can view mutual friendships"
    ON personal_finance.friends
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR friend_user_id = auth.uid());

-- ── 8. PROFILES POLICIES (Allow searching users to add friends) ──
DROP POLICY IF EXISTS "Users can manage own profile" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can manage own profile" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can view all profiles" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can update own profile" ON personal_finance.profiles;

CREATE POLICY "Strict: Users can view all profiles"
    ON personal_finance.profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Strict: Users can update own profile"
    ON personal_finance.profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ── 9. SPLIT BILLS POLICIES (Allow participants to view shared bills) ──
DROP POLICY IF EXISTS "Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Bill owners have full access" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Participants can view shared split bills" ON personal_finance.split_bills;

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
            AND (
                lower(sbp.email) = lower(coalesce(auth.jwt()->>'email', ''))
                OR sbp.user_id = auth.uid()
            )
        )
    );

-- ── 10. SPLIT BILL PARTICIPANTS POLICIES ──
DROP POLICY IF EXISTS "Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Manage participants of own bills" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Participants can view and update own settlement status" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Participants can update own settlement" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: View participants of accessible bills" ON personal_finance.split_bill_participants;

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

CREATE POLICY "Strict: View participants of accessible bills"
    ON personal_finance.split_bill_participants
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.split_bills sb
            WHERE sb.id = split_bill_participants.bill_id
            AND (
                sb.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM personal_finance.split_bill_participants sbp2
                    WHERE sbp2.bill_id = split_bill_participants.bill_id
                    AND (
                        lower(sbp2.email) = lower(coalesce(auth.jwt()->>'email', ''))
                        OR sbp2.user_id = auth.uid()
                    )
                )
            )
        )
    );

CREATE POLICY "Strict: Participants can update own settlement"
    ON personal_finance.split_bill_participants
    FOR UPDATE
    TO authenticated
    USING (
        lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
        OR user_id = auth.uid()
    )
    WITH CHECK (
        lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
        OR user_id = auth.uid()
    );

-- ── 11. SPLIT BILL ITEMS POLICIES ──
DROP POLICY IF EXISTS "Users can manage split bill items" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Manage items of own bills" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Participants can view items of shared bills" ON personal_finance.split_bill_items;

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
            SELECT 1 FROM personal_finance.split_bills sb
            WHERE sb.id = split_bill_items.bill_id
            AND (
                sb.user_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM personal_finance.split_bill_participants sbp
                    WHERE sbp.bill_id = split_bill_items.bill_id
                    AND (
                        lower(sbp.email) = lower(coalesce(auth.jwt()->>'email', ''))
                        OR sbp.user_id = auth.uid()
                    )
                )
            )
        )
    );
