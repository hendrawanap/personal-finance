# PRD — Personal Finance Dashboard

## 1. Overview & Vision
A modern, intuitive personal finance and wealth management dashboard designed for tracking cash flow, monitoring budgets, managing multiple accounts, and analyzing financial trends.

## 2. Core Modules

### 2.1 Overview & Executive Dashboard (`/dashboard`)
- High-level KPIs: Net Worth, Total Income, Total Expenses, Net Savings rate.
- Quick budget progress indicators by category.
- Linked accounts summary with balances.
- Recent transaction feed with category tags and status.
- Time range filters (7D, 30D, 90D, 1Y) preserved in URL via `nuqs`.

### 2.2 Transactions (`/dashboard/transactions`)
- Full transaction history with search, type filter (Income, Expense), and status (Paid, Pending).
- URL-driven filtering, debounced search, and pagination.
- Add and edit transaction modal or form.
- Export to Excel (`.xlsx`).

### 2.3 Accounts (`/dashboard/accounts`)
- Support for checking, savings, credit cards, cash, and investment accounts.
- Account-level metrics: Liquid cash, liabilities, investments.
- Active account filter context across the app.

### 2.4 Budgets (`/dashboard/budgets`)
- Category-based budget allocation (Housing, Groceries, Utilities, Dining, etc.).
- Utilization progress bars with warning thresholds for near-limit budgets.
- Monthly allowance versus actual spend.

### 2.5 Analytics & Reports (`/dashboard/analytics`)
- Historical cash flow comparisons across months.
- Expense breakdown by category and ratio of fixed vs discretionary spend.
- Savings trajectory against targets.

### 2.6 Settings & Preferences (`/dashboard/settings`)
- Currency preferences, default views, notification settings.
- Category & tag management.

### 2.7 Split Bill & Group Expenses (`/dashboard/split-bills`)
- Split group expenses across dinner, rent, utilities, and trips.
- Support 5 split methods: Equal, Exact amounts, Percentage shares, Proportional ratio/shares, and Itemized receipt breakdown with proportional tax & tip.
- Track receivables ("You are owed") and payables ("You owe") with interactive settlement toggles.
- Optional automatic transaction logging for fronted bills (expenses) and settlement reimbursements (income).
- Copy formatted chat summaries for WhatsApp/Telegram/iMessage, view QR code payment helper, and export split records to Excel (`.xlsx`).

## 3. Design System & Coding Standards
- Complies with `AGENTS.md`: URL state (`nuqs`), true browser back navigation (`useGoBack`), `PageShell`, `Heading`, `DataTable`, `Buttons`, and design system tokens.

