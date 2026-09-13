# Back navigation

Every back affordance in the dashboard is **real back navigation**. None of
them is a link to a fixed parent route.

That matters because the dashboard keeps view state in the URL (see
AGENTS.md / `docs/preserve-filter-tab-state.md`). A back arrow hardcoded to
`/dashboard/blog` throws away the filters, tab, page and scroll position the
user had on the list — and lands somewhere else entirely when they arrived
from a different page. Going back properly returns them to exactly where they
were, with the URL state intact.

## The pieces

| File | Role |
| --- | --- |
| `hooks/useGoBack.ts` | `useGoBack(fallbackUrl?)` → a `goBack` callback. The only way to go back. |
| `components/atoms/backButton.tsx` | `<BackButton fallbackUrl className>` — a `<button>` that calls it. |
| `lib/navigationHistory.ts` | `resolveBackTarget()` — where should back actually land? |
| `components/organisms/providers/navigationHistoryTracker.tsx` | Feeds its fallback signal. Mounted once in `Providers`. |

## Back skips entries that only differ by query string

Tabs push: `tabParser` and `tabEnumParser` in `lib/urlState.ts` use
`history: 'push'`, so flipping through four tabs on a detail page leaves four
history entries that all share that page's pathname. One plain step back would
land on the *same page* with an older `?tab=`, which reads as a broken button.

So `goBack()` walks back past the whole run of entries whose **pathname**
matches the current one and jumps straight to the nearest entry with a
different pathname — in a single traversal, with no intermediate render. The
query string of *that* entry is preserved, which is the entire point: you get
the list back on page 2 with your search still in it.

This governs only the in-app back affordance. The browser's own back button
still steps through tab changes one at a time, which is what pushing them was
for.

## `fallbackUrl` is a fallback, not a destination

`goBack()` uses `fallbackUrl` **only** when there is nothing left to go back
to, which now covers two cases:

- this tab has no in-app history — a pasted URL, a new tab, a hard refresh; and
- every entry behind the current one is this same page with a different query
  (someone landed on a detail page cold and only changed tabs).

Omitted, it is `/dashboard`.

`Heading`'s existing `backUrl` prop kept its name and every call site, but it
means exactly this fallback. Same for `ActivityStatusStrip`'s `backUrl`,
`VoucherForm`'s `cancelPath` and `MemberForm`'s `cancelHref`.

## How the target is resolved

1. **The Navigation API** (`window.navigation`) when the browser has it. Its
   entry list is same-origin only *and* exposes each entry's URL, so the
   same-path run can be measured exactly and skipped with one `traverseTo()`.
   An entry with no URL is opaque to us; the walk stops there rather than
   jumping into something it cannot identify.
2. **Otherwise** a counter of client-side pathname changes, incremented by
   `NavigationHistoryTracker`. It cannot see query-only pushes, so on those
   browsers back degrades to a single step — correct for the common case,
   just not tab-skipping. Chrome/Edge, Safari 18.4+ and Firefox 138+ all take
   path 1.

The tracker deliberately does **not** read `useSearchParams()`: doing so in a
root provider would force every page dynamic (see AGENTS.md rule 4).

When unsure, both signals answer "nowhere" and the caller falls back — a back
button that goes somewhere sensible beats one that leaves the dashboard.

## Writing new pages

```tsx
// Header arrow
<Heading title="Edit voucher" backUrl="/dashboard/loyalty/vouchers" />

// Standalone arrow / text button
<BackButton fallbackUrl="/dashboard/media" className="...">
  <ArrowLeft01Icon size={18} />
</BackButton>

// Cancel on a form, or back from inside a handler
const goBack = useGoBack('/dashboard/room')
<Buttons style="second" onClick={goBack}>Cancel</Buttons>
```

Do not write `<Link href="/dashboard/...">` with a back arrow or a Cancel
label, and do not call `router.back()` directly in a component — it has no
fallback and does not skip same-path entries. The one intentional exception is
the auth pages' "Back to sign in", which is a link to the landing site's login
page on another origin, not back navigation.

Unit tests: `node --test --experimental-strip-types lib/navigationHistory.test.ts`.
