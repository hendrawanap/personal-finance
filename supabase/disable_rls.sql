-- ==============================================================================
-- PERSONAL FINANCE DASHBOARD — DISABLE ALL ROW LEVEL SECURITY (RLS)
-- Schema: personal_finance
--
-- Run this script in your Supabase SQL Editor to:
-- 1. Disable Row Level Security (RLS) on all tables in personal_finance.
-- 2. Drop all existing RLS policies and circular helper functions.
-- 3. Transition multi-tenant isolation and authorization to pure backend
--    database queries in Next.js API routes (/api/v1/finance/...).
-- ==============================================================================

-- 1. Ensure schema exists
CREATE SCHEMA IF NOT EXISTS personal_finance;

-- 2. DISABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE IF EXISTS personal_finance.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.budgets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.split_bills DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.split_bill_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.split_bill_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_finance.friends DISABLE ROW LEVEL SECURITY;

-- 3. DROP ALL EXISTING POLICIES (clean up catalog)
-- Profiles
DROP POLICY IF EXISTS "Users can manage own profile" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can manage own profile" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can view all profiles" ON personal_finance.profiles;
DROP POLICY IF EXISTS "Strict: Users can update own profile" ON personal_finance.profiles;

-- Accounts
DROP POLICY IF EXISTS "Users can manage own accounts" ON personal_finance.accounts;
DROP POLICY IF EXISTS "Strict: Users can manage own accounts" ON personal_finance.accounts;

-- Transactions
DROP POLICY IF EXISTS "Users can manage own transactions" ON personal_finance.transactions;
DROP POLICY IF EXISTS "Strict: Users can manage own transactions" ON personal_finance.transactions;

-- Budgets
DROP POLICY IF EXISTS "Users can manage own budgets" ON personal_finance.budgets;
DROP POLICY IF EXISTS "Strict: Users can manage own budgets" ON personal_finance.budgets;

-- Split Bills
DROP POLICY IF EXISTS "Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Users can manage own split bills" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Bill owners have full access" ON personal_finance.split_bills;
DROP POLICY IF EXISTS "Strict: Participants can view shared split bills" ON personal_finance.split_bills;

-- Split Bill Participants
DROP POLICY IF EXISTS "Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Users can manage split bill participants" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Manage participants of own bills" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: View participants of accessible bills" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Participants can view and update own settlement status" ON personal_finance.split_bill_participants;
DROP POLICY IF EXISTS "Strict: Participants can update own settlement" ON personal_finance.split_bill_participants;

-- Split Bill Items
DROP POLICY IF EXISTS "Users can manage split bill items" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Users can manage split bill items" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Manage items of own bills" ON personal_finance.split_bill_items;
DROP POLICY IF EXISTS "Strict: Participants can view items of shared bills" ON personal_finance.split_bill_items;

-- Friends
DROP POLICY IF EXISTS "Users can manage own friends" ON personal_finance.friends;
DROP POLICY IF EXISTS "Strict: Users can manage own friends" ON personal_finance.friends;
DROP POLICY IF EXISTS "Strict: Users can view mutual friendships" ON personal_finance.friends;

-- 4. DROP RLS HELPER FUNCTIONS (no longer needed without RLS)
DROP FUNCTION IF EXISTS personal_finance.is_bill_participant(TEXT);
DROP FUNCTION IF EXISTS personal_finance.is_bill_owner(TEXT);
DROP FUNCTION IF EXISTS personal_finance.can_access_bill(TEXT);

-- 5. GRANT UNRESTRICTED ACCESS TO DATABASE ROLES
GRANT USAGE ON SCHEMA personal_finance TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA personal_finance TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA personal_finance TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA personal_finance TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA personal_finance GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA personal_finance GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA personal_finance GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 6. DROP FOREIGN KEY CONSTRAINTS FROM SPLIT BILLS (split bills do not require accounts)
ALTER TABLE IF EXISTS personal_finance.split_bills
    DROP CONSTRAINT IF EXISTS split_bills_payer_account_id_fkey;
ALTER TABLE IF EXISTS personal_finance.split_bills
    DROP CONSTRAINT IF EXISTS split_bills_linked_transaction_id_fkey;
