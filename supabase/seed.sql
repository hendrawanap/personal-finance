-- ==============================================================================
-- PERSONAL FINANCE DASHBOARD — SEED DATA (MIGRATED FROM LOCAL STORAGE)
-- Schema: personal_finance
-- ==============================================================================

DO $$
DECLARE
    target_user_id UUID := NULL;
BEGIN
    -- If there is a matching user in auth.users, link to it; otherwise leave NULL for dev/standalone
    SELECT id INTO target_user_id FROM auth.users WHERE email = 'hendra@mail.com' LIMIT 1;
    IF target_user_id IS NULL THEN
        SELECT id INTO target_user_id FROM auth.users LIMIT 1;
    END IF;

    -- 1. SEED PROFILE
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

    -- 2. SEED ACCOUNTS
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

    -- 3. SEED TRANSACTIONS
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

    -- 4. SEED SPLIT BILLS
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

    -- 5. SEED SPLIT BILL PARTICIPANTS
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
