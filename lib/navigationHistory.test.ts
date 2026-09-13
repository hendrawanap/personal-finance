import assert from 'node:assert/strict'
import test, { afterEach } from 'node:test'

import { createRequire } from 'node:module'
const {
    canGoBack,
    getNavigationDepth,
    recordNavigation,
    resetNavigationDepth,
    resolveBackTarget,
    traverseTo,
} = createRequire(import.meta.url)('./navigationHistory.ts') as typeof import('./navigationHistory')

const globals = globalThis as { window?: unknown }

/** A fake Navigation API whose entry list is the given URLs, newest last. */
function withHistory(urls: (string | null)[], currentIndex = urls.length - 1) {
    const entries = urls.map((url, index) => ({ key: `k${index}`, url }))
    const traversed: string[] = []

    globals.window = {
        navigation: {
            entries: () => entries,
            currentEntry: { ...entries[currentIndex], index: currentIndex },
            traverseTo: (key: string) => {
                traversed.push(key)
                return { committed: Promise.resolve(), finished: Promise.resolve() }
            },
        },
    }

    return traversed
}

afterEach(() => {
    resetNavigationDepth()
    delete globals.window
})

test('server render can never go back', () => {
    assert.deepEqual(resolveBackTarget(), { kind: 'fallback' })
    assert.equal(canGoBack(), false)
})

test('a cold load has no in-app history, so back falls back', () => {
    globals.window = {}
    assert.equal(getNavigationDepth(), 0)
    assert.deepEqual(resolveBackTarget(), { kind: 'fallback' })
})

test('without the Navigation API, one pathname change earns a single step back', () => {
    globals.window = {}
    recordNavigation()
    assert.deepEqual(resolveBackTarget(), { kind: 'back' })
    assert.equal(canGoBack(), true)
})

test('the Navigation API wins over the counter when the browser has one', () => {
    globals.window = { navigation: { canGoBack: false } }
    recordNavigation()
    assert.deepEqual(resolveBackTarget(), { kind: 'fallback' })
})

test('the previous entry is used when it is already a different page', () => {
    withHistory([
        'https://x.test/dashboard/blog?page=2',
        'https://x.test/dashboard/blog/my-post',
    ])
    assert.deepEqual(resolveBackTarget(), { kind: 'traverse', key: 'k0' })
})

test('a run of same-path entries is skipped in one jump', () => {
    // The list, then a detail page the user flipped through four tabs on.
    withHistory([
        'https://x.test/dashboard/blog?page=2&q=bali',
        'https://x.test/dashboard/blog/my-post',
        'https://x.test/dashboard/blog/my-post?tab=seo',
        'https://x.test/dashboard/blog/my-post?tab=media',
        'https://x.test/dashboard/blog/my-post?tab=content&lang=id',
    ])
    assert.deepEqual(resolveBackTarget(), { kind: 'traverse', key: 'k0' })
})

test('a history made only of this page falls back instead of replaying tabs', () => {
    withHistory([
        'https://x.test/dashboard/blog/my-post',
        'https://x.test/dashboard/blog/my-post?tab=seo',
        'https://x.test/dashboard/blog/my-post?tab=media',
    ])
    assert.deepEqual(resolveBackTarget(), { kind: 'fallback' })
})

test('forward entries are ignored — only what is behind the current one counts', () => {
    const urls = [
        'https://x.test/dashboard/blog',
        'https://x.test/dashboard/blog/my-post',
        'https://x.test/dashboard/blog/my-post?tab=seo',
    ]
    // The user already went back once, so they sit on the detail page's first entry.
    withHistory(urls, 1)
    assert.deepEqual(resolveBackTarget(), { kind: 'traverse', key: 'k0' })
})

test('an opaque entry stops the walk rather than being jumped into', () => {
    withHistory([
        'https://x.test/dashboard/blog',
        null,
        'https://x.test/dashboard/blog/my-post?tab=seo',
    ])
    assert.deepEqual(resolveBackTarget(), { kind: 'fallback' })
})

test('traversing asks the browser for that exact entry', async () => {
    const traversed = withHistory([
        'https://x.test/dashboard/blog',
        'https://x.test/dashboard/blog/my-post?tab=seo',
    ])
    const target = resolveBackTarget()
    assert.equal(target.kind, 'traverse')
    await traverseTo(target.kind === 'traverse' ? target.key : '')
    assert.deepEqual(traversed, ['k0'])
})

test('traversing reports failure when the browser cannot do it', () => {
    globals.window = {}
    assert.equal(traverseTo('k0'), null)
})
