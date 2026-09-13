-- ==============================================================================
-- PERSONAL FINANCE DASHBOARD — SUPABASE DATABASE SCHEMA
-- Schema: personal_finance
-- ==============================================================================

-- 1. Enable UUID & Cryptographic extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create and configure personal_finance schema
CREATE SCHEMA IF NOT EXISTS personal_finance;

-- Grant usage and permissions to Supabase roles
GRANT USAGE ON SCHEMA personal_finance TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA personal_finance TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA personal_finance TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA personal_finance TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA personal_finance GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA personal_finance GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA personal_finance GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- ==============================================================================
-- 3. CREATE TABLES
-- ==============================================================================

-- 3.1 PROFILES TABLE
CREATE TABLE IF NOT EXISTS personal_finance.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'User',
    email TEXT,
    currency_symbol TEXT NOT NULL DEFAULT 'Rp',
    currency_code TEXT NOT NULL DEFAULT 'IDR',
    monthly_savings_target NUMERIC(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_profiles_user_id UNIQUE (user_id)
);

-- 3.2 ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS personal_finance.accounts (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    institution TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'investment', 'cash')),
    account_number TEXT NOT NULL DEFAULT '',
    balance NUMERIC(15, 2) NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'IDR',
    accent TEXT NOT NULL DEFAULT 'moss' CHECK (accent IN ('moss', 'brass', 'info', 'stone')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.3 TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS personal_finance.transactions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    account_id TEXT REFERENCES personal_finance.accounts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid', 'pending')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.4 BUDGETS TABLE
CREATE TABLE IF NOT EXISTS personal_finance.budgets (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    allocated NUMERIC(15, 2) NOT NULL DEFAULT 0,
    period TEXT NOT NULL DEFAULT 'Monthly' CHECK (period IN ('Monthly', 'Weekly', 'Yearly')),
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.5 SPLIT BILLS TABLE
CREATE TABLE IF NOT EXISTS personal_finance.split_bills (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    total_amount NUMERIC(15, 2) NOT NULL,
    paid_by TEXT NOT NULL,
    paid_by_current_user BOOLEAN NOT NULL DEFAULT true,
    payer_account_id TEXT REFERENCES personal_finance.accounts(id) ON DELETE SET NULL,
    linked_transaction_id TEXT REFERENCES personal_finance.transactions(id) ON DELETE SET NULL,
    split_method TEXT NOT NULL DEFAULT 'equal' CHECK (split_method IN ('equal', 'exact', 'percentage', 'shares', 'itemized')),
    notes TEXT,
    tax NUMERIC(15, 2) DEFAULT 0,
    tip NUMERIC(15, 2) DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'settled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3.6 SPLIT BILL PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS personal_finance.split_bill_participants (
    id TEXT NOT NULL,
    bill_id TEXT NOT NULL REFERENCES personal_finance.split_bills(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    is_current_user BOOLEAN NOT NULL DEFAULT false,
    share_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    percentage NUMERIC(5, 2),
    shares NUMERIC(10, 2),
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
    settled_at TIMESTAMPTZ,
    PRIMARY KEY (bill_id, id)
);

-- 3.7 SPLIT BILL ITEMS TABLE (For Itemized Split Bills)
CREATE TABLE IF NOT EXISTS personal_finance.split_bill_items (
    id TEXT NOT NULL,
    bill_id TEXT NOT NULL REFERENCES personal_finance.split_bills(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    assigned_to TEXT[] NOT NULL DEFAULT '{}',
    PRIMARY KEY (bill_id, id)
);

-- ==============================================================================
-- 4. INDEXES FOR HIGH QUERY PERFORMANCE
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON personal_finance.accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON personal_finance.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON personal_finance.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON personal_finance.transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON personal_finance.transactions(category);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON personal_finance.budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_user_id ON personal_finance.split_bills(user_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_date ON personal_finance.split_bills(date DESC);
CREATE INDEX IF NOT EXISTS idx_split_bills_status ON personal_finance.split_bills(status);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_bill_id ON personal_finance.split_bill_participants(bill_id);
CREATE INDEX IF NOT EXISTS idx_split_bill_participants_status ON personal_finance.split_bill_participants(status);

-- ==============================================================================
-- 5. AUTOMATIC TIMESTAMP TRIGGER
-- ==============================================================================

CREATE OR REPLACE FUNCTION personal_finance.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON personal_finance.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON personal_finance.profiles
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_updated_at();

DROP TRIGGER IF EXISTS set_accounts_updated_at ON personal_finance.accounts;
CREATE TRIGGER set_accounts_updated_at
    BEFORE UPDATE ON personal_finance.accounts
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_updated_at();

DROP TRIGGER IF EXISTS set_transactions_updated_at ON personal_finance.transactions;
CREATE TRIGGER set_transactions_updated_at
    BEFORE UPDATE ON personal_finance.transactions
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_updated_at();

DROP TRIGGER IF EXISTS set_budgets_updated_at ON personal_finance.budgets;
CREATE TRIGGER set_budgets_updated_at
    BEFORE UPDATE ON personal_finance.budgets
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_updated_at();

DROP TRIGGER IF EXISTS set_split_bills_updated_at ON personal_finance.split_bills;
CREATE TRIGGER set_split_bills_updated_at
    BEFORE UPDATE ON personal_finance.split_bills
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_updated_at();

-- ==============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE personal_finance.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bill_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.split_bill_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Users can manage own profile" ON personal_finance.profiles;
CREATE POLICY "Strict: Users can manage own profile"
    ON personal_finance.profiles
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Accounts Policies
DROP POLICY IF EXISTS "Users can manage own accounts" ON personal_finance.accounts;
CREATE POLICY "Strict: Users can manage own accounts"
    ON personal_finance.accounts
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Transactions Policies
DROP POLICY IF EXISTS "Users can manage own transactions" ON personal_finance.transactions;
CREATE POLICY "Strict: Users can manage own transactions"
    ON personal_finance.transactions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Budgets Policies
DROP POLICY IF EXISTS "Users can manage own budgets" ON personal_finance.budgets;
CREATE POLICY "Strict: Users can manage own budgets"
    ON personal_finance.budgets
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Split Bills Policies
DROP POLICY IF EXISTS "Users can manage own split bills" ON personal_finance.split_bills;
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

-- Split Bill Participants Policies
DROP POLICY IF EXISTS "Users can manage split bill participants" ON personal_finance.split_bill_participants;
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

-- Split Bill Items Policies
DROP POLICY IF EXISTS "Users can manage split bill items" ON personal_finance.split_bill_items;
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

-- ==============================================================================
-- 7. OPTIONAL AUTH SIGNUP TRIGGER (Auto-create profile when user registers)
-- ==============================================================================

CREATE OR REPLACE FUNCTION personal_finance.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO personal_finance.profiles (user_id, name, email, currency_symbol, currency_code, monthly_savings_target)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'Rp',
        'IDR',
        3000
    )
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION personal_finance.handle_new_user();
