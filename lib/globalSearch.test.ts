import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import type { SearchDestination } from './globalSearch'

const { groupDestinations, normalizeText, rankDestinations } = createRequire(
  import.meta.url,
)('./globalSearch.ts') as typeof import('./globalSearch')

const PAGES: SearchDestination[] = [
  { href: '/dashboard', title: 'Dashboard', section: 'Dashboard', keywords: ['home', 'overview'] },
  { href: '/dashboard/transactions', title: 'Transactions', section: 'Finance', keywords: ['expenses', 'income'] },
  { href: '/dashboard/accounts', title: 'Accounts', section: 'Finance' },
  { href: '/dashboard/budgets', title: 'Budgets', section: 'Finance' },
  { href: '/dashboard/analytics', title: 'Analytics', section: 'Insights' },
  { href: '/dashboard/settings', title: 'Settings', section: 'System' },
]

const titles = (query: string) => rankDestinations(PAGES, query).map((d: SearchDestination) => d.title)

test('an empty query keeps the registry order untouched', () => {
  assert.deepEqual(titles('   '), PAGES.map((p) => p.title))
})

test('the page whose title starts with the query wins', () => {
  assert.equal(titles('trans')[0], 'Transactions')
  assert.equal(titles('acc')[0], 'Accounts')
  assert.equal(titles('budg')[0], 'Budgets')
})

test('every token has to match', () => {
  assert.deepEqual(titles('trans'), ['Transactions'])
})

test('keywords reach pages the title does not name', () => {
  assert.equal(titles('income')[0], 'Transactions')
})

test('section names are searchable', () => {
  assert.deepEqual(titles('insights'), ['Analytics'])
})

test('separators are noise in searches', () => {
  assert.deepEqual(titles('transactions'), ['Transactions'])
})
