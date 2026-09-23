-- ==============================================================================
-- PERSONAL FINANCE DASHBOARD — COMPLETE SUPABASE SETUP (SCHEMA + SEED DATA)
-- Schema: personal_finance
-- Run this in the Supabase SQL Editor to initialize the schema, tables, RLS, and seed data.
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

-- 3.7 SPLIT BILL ITEMS TABLE
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
-- 6. ROW LEVEL SECURITY (RLS) DISABLED
-- All tables operate under pure backend database queries with application-level
-- tenant isolation and authorization in Next.js API routes (/api/v1/finance/...).
-- ==============================================================================

ALTER TABLE IF EXISTS personal_finance.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.split_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.split_bill_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.split_bill_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.friends DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 7. AUTH SIGNUP TRIGGER (Optional: Auto-create profile when user registers)
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

-- ==============================================================================
-- 8. SEED INITIAL DATA (MIGRATED FROM YOUR LOCAL STORAGE)
-- ==============================================================================

DO $$
DECLARE
    target_user_id UUID := NULL;
BEGIN
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'hendra@mail.com' LIMIT 1;
    IF target_user_id IS NULL THEN
        SELECT id INTO target_user_id FROM auth.users LIMIT 1;
    END IF;

    -- 8.1 Profile
    INSERT INTO personal_finance.profiles (user_id, name, email, currency_symbol, currency_code, monthly_savings_target)
    VALUES (
        target_user_id,
        'Hendra',
        'hendra@mail.com',
        'Rp',
        'IDR',
        3000
    )
    ON CONFLICT (user_id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        currency_symbol = EXCLUDED.currency_symbol,
        currency_code = EXCLUDED.currency_code,
        monthly_savings_target = EXCLUDED.monthly_savings_target;

    -- 8.2 Accounts
    INSERT INTO personal_finance.accounts (id, user_id, name, institution, type, account_number, balance, currency, accent, created_at, updated_at)
    VALUES (
        'acc-1789284071843-0uzy',
        target_user_id,
        'BCA',
        'BCA',
        'checking',
        '•••• 2904',
        -105600,
        'IDR',
        'moss',
        '2026-09-13T07:21:11.843Z',
        '2026-09-13T10:02:43.105Z'
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        institution = EXCLUDED.institution,
        type = EXCLUDED.type,
        account_number = EXCLUDED.account_number,
        balance = EXCLUDED.balance,
        currency = EXCLUDED.currency,
        accent = EXCLUDED.accent,
        updated_at = EXCLUDED.updated_at;

    -- 8.3 Transactions
    INSERT INTO personal_finance.transactions (id, user_id, date, description, category, account_id, amount, type, status, notes, created_at)
    VALUES
    (
        'tx-1789293763105-asnj',
        target_user_id,
        '2026-09-13',
        'Split Bill: Rocket',
        'Dining Out & Entertainment',
        'acc-1789284071843-0uzy',
        32000,
        'expense',
        'paid',
        'Fronted bill for 2 participants',
        '2026-09-13T10:02:43.105Z'
    ),
    (
        'tx-1789289954592-41mn',
        target_user_id,
        '2026-09-13',
        'Split Bill: Rocket',
        'Dining Out & Entertainment',
        'acc-1789284071843-0uzy',
        32000,
        'expense',
        'paid',
        'Fronted bill for 2 participants',
        '2026-09-13T08:59:14.592Z'
    ),
    (
        'tx-1789289778208-czje',
        target_user_id,
        '2026-09-13',
        'Split Bill: Tomoro',
        'Dining Out & Entertainment',
        'acc-1789284071843-0uzy',
        41600,
        'expense',
        'paid',
        'Fronted bill for 2 participants',
        '2026-09-13T08:56:18.208Z'
    )
    ON CONFLICT (id) DO UPDATE SET
        date = EXCLUDED.date,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        account_id = EXCLUDED.account_id,
        amount = EXCLUDED.amount,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes;

    -- 8.4 Split Bills
    INSERT INTO personal_finance.split_bills (id, user_id, title, date, category, total_amount, paid_by, paid_by_current_user, payer_account_id, linked_transaction_id, split_method, status, created_at, updated_at)
    VALUES
    (
        'sb-1789293763105-fue9',
        target_user_id,
        'Rocket',
        '2026-09-13',
        'Dining Out & Entertainment',
        32000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        'tx-1789293763105-asnj',
        'equal',
        'pending',
        '2026-09-13T10:02:43.105Z',
        '2026-09-13T10:02:43.105Z'
    ),
    (
        'sb-1789293652244-wvmy',
        target_user_id,
        'Beras',
        '2026-09-10',
        'Dining Out & Entertainment',
        74500,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T10:00:52.244Z',
        '2026-09-13T10:03:04.931Z'
    ),
    (
        'sb-1789293607574-dsb4',
        target_user_id,
        'Sate',
        '2026-09-10',
        'Dining Out & Entertainment',
        36000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T10:00:07.574Z',
        '2026-09-13T10:03:12.539Z'
    ),
    (
        'sb-1789293573837-iuvr',
        target_user_id,
        'Mie Ayam',
        '2026-09-12',
        'Dining Out & Entertainment',
        18000,
        'Wawa',
        false,
        NULL,
        NULL,
        'equal',
        'pending',
        '2026-09-13T09:59:33.837Z',
        '2026-09-13T10:03:19.058Z'
    ),
    (
        'sb-1789293555091-u4aj',
        target_user_id,
        'Telur',
        '2026-09-12',
        'Dining Out & Entertainment',
        28000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T09:59:15.091Z',
        '2026-09-13T10:03:24.996Z'
    ),
    (
        'sb-1789293537400-519g',
        target_user_id,
        'Indomaret',
        '2026-09-12',
        'Dining Out & Entertainment',
        45250,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'exact',
        'pending',
        '2026-09-13T09:58:57.400Z',
        '2026-09-13T10:03:30.965Z'
    ),
    (
        'sb-1789293500046-uyfg',
        target_user_id,
        'Soto',
        '2026-09-12',
        'Dining Out & Entertainment',
        20000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T09:58:20.046Z',
        '2026-09-13T10:03:36.907Z'
    ),
    (
        'sb-1789293446771-mwmj',
        target_user_id,
        'Gorengan Cak Nono',
        '2026-09-12',
        'Dining Out & Entertainment',
        8000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T09:57:26.771Z',
        '2026-09-13T10:03:42.080Z'
    ),
    (
        'sb-1789293424463-scnv',
        target_user_id,
        'Rujak',
        '2026-09-08',
        'Dining Out & Entertainment',
        32000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T09:57:04.463Z',
        '2026-09-13T10:03:55.599Z'
    ),
    (
        'sb-1789290315661-2tw5',
        target_user_id,
        'WSS',
        '2026-09-09',
        'Dining Out & Entertainment',
        100000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'exact',
        'pending',
        '2026-09-13T09:05:15.661Z',
        '2026-09-13T10:04:11.113Z'
    ),
    (
        'sb-1789290106938-v9ah',
        target_user_id,
        'Po kang',
        '2026-09-08',
        'Dining Out & Entertainment',
        28000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T09:01:46.938Z',
        '2026-09-13T10:29:29.252Z'
    ),
    (
        'sb-1789289954592-2tmp',
        target_user_id,
        'Rocket',
        '2026-09-07',
        'Dining Out & Entertainment',
        32000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        'tx-1789289954592-41mn',
        'equal',
        'pending',
        '2026-09-13T08:59:14.592Z',
        '2026-09-13T10:30:44.420Z'
    ),
    (
        'sb-1789289890483-4npo',
        target_user_id,
        'Tomoro',
        '2026-09-08',
        'Dining Out & Entertainment',
        41600,
        'Wawa',
        false,
        NULL,
        NULL,
        'equal',
        'pending',
        '2026-09-13T08:58:10.483Z',
        '2026-09-13T10:30:58.980Z'
    ),
    (
        'sb-1789289730587-icu9',
        target_user_id,
        'Nina Rasa',
        '2026-09-06',
        'Dining Out & Entertainment',
        34000,
        'Hendra',
        true,
        'acc-1789284071843-0uzy',
        NULL,
        'equal',
        'pending',
        '2026-09-13T08:55:30.587Z',
        '2026-09-13T10:31:07.903Z'
    )
    ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        date = EXCLUDED.date,
        category = EXCLUDED.category,
        total_amount = EXCLUDED.total_amount,
        paid_by = EXCLUDED.paid_by,
        paid_by_current_user = EXCLUDED.paid_by_current_user,
        payer_account_id = EXCLUDED.payer_account_id,
        linked_transaction_id = EXCLUDED.linked_transaction_id,
        split_method = EXCLUDED.split_method,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at;

    -- 8.5 Split Bill Participants
    INSERT INTO personal_finance.split_bill_participants (id, bill_id, name, email, is_current_user, share_amount, status, settled_at)
    VALUES
    -- sb-1789293763105-fue9 (Rocket)
    ('p-me', 'sb-1789293763105-fue9', 'Hendra', 'hendra@mail.com', true, 16000, 'paid', '2026-09-13T10:02:43.105Z'),
    ('p-1789293752979-1', 'sb-1789293763105-fue9', 'Wawa', NULL, false, 16000, 'unpaid', NULL),

    -- sb-1789293652244-wvmy (Beras)
    ('p-me', 'sb-1789293652244-wvmy', 'Hendra', 'hendra@mail.com', true, 37250, 'paid', '2026-09-13T10:00:52.244Z'),
    ('p-1789293615140-1', 'sb-1789293652244-wvmy', 'Wawa', NULL, false, 37250, 'unpaid', NULL),

    -- sb-1789293607574-dsb4 (Sate)
    ('p-me', 'sb-1789293607574-dsb4', 'Hendra', 'hendra@mail.com', true, 18000, 'paid', '2026-09-13T10:00:07.574Z'),
    ('p-1789293599166-1', 'sb-1789293607574-dsb4', 'Wawa', NULL, false, 18000, 'unpaid', NULL),

    -- sb-1789293573837-iuvr (Mie Ayam)
    ('p-me', 'sb-1789293573837-iuvr', 'Hendra', 'hendra@mail.com', true, 9000, 'unpaid', NULL),
    ('p-1789293561416-1', 'sb-1789293573837-iuvr', 'Wawa', NULL, false, 9000, 'paid', '2026-09-13T09:59:33.837Z'),

    -- sb-1789293555091-u4aj (Telur)
    ('p-me', 'sb-1789293555091-u4aj', 'Hendra', 'hendra@mail.com', true, 14000, 'paid', '2026-09-13T09:59:15.091Z'),
    ('p-1789293543742-1', 'sb-1789293555091-u4aj', 'Wawa', NULL, false, 14000, 'unpaid', NULL),

    -- sb-1789293537400-519g (Indomaret)
    ('p-me', 'sb-1789293537400-519g', 'Hendra', 'hendra@mail.com', true, 0, 'paid', '2026-09-13T09:58:57.400Z'),
    ('p-1789293501485-1', 'sb-1789293537400-519g', 'Wawa', NULL, false, 45250, 'unpaid', NULL),

    -- sb-1789293500046-uyfg (Soto)
    ('p-me', 'sb-1789293500046-uyfg', 'Hendra', 'hendra@mail.com', true, 10000, 'paid', '2026-09-13T09:58:20.046Z'),
    ('p-1789293487188-1', 'sb-1789293500046-uyfg', 'Wawa', NULL, false, 10000, 'unpaid', NULL),

    -- sb-1789293446771-mwmj (Gorengan Cak Nono)
    ('p-me', 'sb-1789293446771-mwmj', 'Hendra', 'hendra@mail.com', true, 4000, 'paid', '2026-09-13T09:57:26.771Z'),
    ('p-1789293426108-1', 'sb-1789293446771-mwmj', 'Wawa', NULL, false, 4000, 'unpaid', NULL),

    -- sb-1789293424463-scnv (Rujak)
    ('p-me', 'sb-1789293424463-scnv', 'Hendra', 'hendra@mail.com', true, 16000, 'paid', '2026-09-13T09:57:04.463Z'),
    ('p-1789293412980-1', 'sb-1789293424463-scnv', 'Wawa', NULL, false, 16000, 'unpaid', NULL),

    -- sb-1789290315661-2tw5 (WSS)
    ('p-me', 'sb-1789290315661-2tw5', 'Hendra', 'hendra@mail.com', true, 43500, 'paid', '2026-09-13T09:05:15.661Z'),
    ('p-1789290230064-1', 'sb-1789290315661-2tw5', 'Wawa', NULL, false, 56500, 'unpaid', NULL),

    -- sb-1789290106938-v9ah (Po kang)
    ('p-me', 'sb-1789290106938-v9ah', 'Hendra', 'hendra@mail.com', true, 14000, 'paid', '2026-09-13T09:01:46.938Z'),
    ('p-1789290994714-1', 'sb-1789290106938-v9ah', 'Wawa', NULL, false, 14000, 'unpaid', NULL),

    -- sb-1789289954592-2tmp (Rocket)
    ('p-me', 'sb-1789289954592-2tmp', 'Hendra', 'hendra@mail.com', true, 16000, 'paid', '2026-09-13T08:59:14.592Z'),
    ('p-1789289939548-1', 'sb-1789289954592-2tmp', 'Wawa', NULL, false, 16000, 'unpaid', NULL),

    -- sb-1789289890483-4npo (Tomoro)
    ('p-me', 'sb-1789289890483-4npo', 'Hendra', 'hendra@mail.com', true, 20800, 'unpaid', NULL),
    ('p-1789289876960-1', 'sb-1789289890483-4npo', 'Wawa', NULL, false, 20800, 'paid', '2026-09-13T08:58:10.483Z'),

    -- sb-1789289730587-icu9 (Nina Rasa)
    ('p-me', 'sb-1789289730587-icu9', 'Hendra', 'hendra@mail.com', true, 17000, 'paid', '2026-09-13T08:55:30.587Z'),
    ('p-1789289693396-1', 'sb-1789289730587-icu9', 'Wawa', NULL, false, 17000, 'unpaid', NULL)
    ON CONFLICT (bill_id, id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        is_current_user = EXCLUDED.is_current_user,
        share_amount = EXCLUDED.share_amount,
        status = EXCLUDED.status,
        settled_at = EXCLUDED.settled_at;

END $$;
