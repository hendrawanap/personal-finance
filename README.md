# Personal Finance Dashboard

A production-ready personal finance dashboard built with Next.js 16, React 19, and Tailwind CSS v4.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI & Components**: React 19, Tailwind CSS v4, Radix UI, shadcn primitives
- **Icons**: Hugeicons React
- **State Management**:
  - URL State (search, filter, tab, pagination): [nuqs](https://nuqs.47ng.com/)
  - Client Store (persisted active account): Zustand
  - Server Cache: TanStack React Query v5
- **Table**: TanStack Table v8 with controlled URL pagination & sorting
- **Language**: TypeScript 5 with strict mode

## Features

- **Dashboard Overview**: Financial KPIs (Net Worth, Income, Expenses, Savings Rate), category budgets, linked accounts, and recent transactions.
- **Transactions Management**: Filterable, searchable, and paginated transaction ledger.
- **Accounts**: Multi-account balances (Checking, Savings, Credit Cards, Investments).
- **Budgets**: Visual category budget allocation with progress thresholds.
- **Analytics**: Cash flow velocity and historical monthly comparisons.
- **Coding Conventions**: Documented in `AGENTS.md` (URL state, back navigation, UI consistency).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Scripts

- `npm run dev`: Start Next.js development server
- `npm run build`: Build production bundle
- `npm run start`: Start production server
- `npm run lint`: Run ESLint checks
