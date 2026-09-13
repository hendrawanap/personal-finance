# Dashboard Variants Integration Plan

## Goal

Integrate the four dashboard modes with real data while keeping one shared dashboard entry point, preserving the URL-selected mode/range/tab, and removing every demo fallback that can be mistaken for production data.

The scope decision remains unchanged for this rollout: the dashboard overview API accepts `global` and `property`, but the UI requests `global`. Until property filtering is activated, data-bearing headers must say **All Sanctuaries** rather than presenting a selected property beside global data.

## Current assessment

| Mode | Current state | Integration status |
| --- | --- | --- |
| Executive Overview | Uses the shared overview response for KPIs, point series, tiers, program rules, recent loyalty activity, and content pipeline. | Mostly available. Finish error/loading/empty behavior and remove any fallback content. |
| Loyalty Manager | Uses overview data for members, points totals, redemption rate, point chart, tiers, and expiry policy. Expiry liability, earning channels, and top rewards are hardcoded; several existing metrics fall back to demo values. | Overview endpoint must be enhanced for manager analytics. |
| Loyalty Redemption | Voucher verification and fulfillment already call real APIs. Guest lookup, shift KPIs, fulfillment log, and popular rewards are hardcoded. | Reuse existing member, fulfillment, and reward APIs; add a small dashboard summary for today. |
| Marketing & CMS | Uses overview data for story/deal KPIs and content pipeline, but silently substitutes demo content. Campaign cards, upcoming events, and event attendance are hardcoded. | Reuse existing deals/events APIs; add only the aggregate event count that cannot be safely inferred from a limited list. |

Relevant implementation locations:

- Dashboard routing and the unconditional global overview request: `components/pages/dashboard/index.tsx:25-99` and `components/pages/dashboard/index.tsx:116-193`.
- Executive overview mapping: `components/pages/dashboard/variants/GeneralOverviewDashboard.tsx:318-462`.
- Loyalty manager demo analytics: `components/pages/dashboard/variants/LoyaltyManagerDashboard.tsx:66-136`, `components/pages/dashboard/variants/LoyaltyManagerDashboard.tsx:276-291`, and `components/pages/dashboard/variants/LoyaltyManagerDashboard.tsx:580-788`.
- Redemption station real mutations and demo reads: `components/pages/dashboard/variants/LoyaltyRedemptionDashboard.tsx:29-133`, `components/pages/dashboard/variants/LoyaltyRedemptionDashboard.tsx:140-213`, and `components/pages/dashboard/variants/LoyaltyRedemptionDashboard.tsx:460-610`.
- Marketing demo and fallback content: `components/pages/dashboard/variants/MarketingDashboard.tsx:18-117`, `components/pages/dashboard/variants/MarketingDashboard.tsx:122-207`, and `components/pages/dashboard/variants/MarketingDashboard.tsx:263-594`.

## Data-source map

### Shared `GET /api/v1/dashboard/overview`

Already available:

- `scope`, Jakarta time window, and generated time.
- Member totals, new members, and previous-period comparison.
- Reward redemptions, points redeemed, and vouchers used.
- Active, ending-soon, and scheduled deals.
- Published stories counted by article ID, published-in-period, and drafts.
- Earned/redeemed/expired/adjusted point series and totals.
- Redemption rate using `redeemed points / earned points`.
- Tier distribution and benefits.
- Point-expiry/inactivity configuration.
- Recent loyalty action taxonomy.
- Content pipeline.

Enhance it with:

```ts
manager: {
  expiringIn30Days: {
    points: number
    members: number
  }
  earningSources: Array<{
    key: string
    label: string
    points: number
    share: number
  }>
  topRewards: Array<{
    rewardId: number
    name: string
    category: string | null
    pointsRequired: number
    redemptions: number
    fulfilled: number
    pointsRedeemed: number
    changePercent: number | null
    isAllTiers: boolean
    isAllProperties: boolean
  }>
}
redemptionToday: {
  fulfilledVouchers: number
  pointsBurned: number
  activeVouchersAwaitingUse: number
  newMembers: number
}
marketing: {
  upcomingEvents: number
}
```

Definitions:

- `expiringIn30Days.points`: sum of positive remaining point lots expiring in `[now, now + 30 days)`; `members` is the distinct member count over the same lots.
- `earningSources`: group earned points by stored point type. Null/unknown types become **Unclassified**. Do not retain the invented Room/F&B/Spa split unless the database values actually produce those labels.
- `topRewards.redemptions`: non-cancelled redemptions created in the selected range. `fulfilled` is the subset used on property. Trend compares the immediately preceding equal-length period.
- `redemptionToday`: Jakarta calendar day `[00:00, next 00:00)`, independent of the dashboard range selector.
- `activeVouchersAwaitingUse` replaces **Active Web Claims**. It is trackable from active, non-expired vouchers and does not imply an unrecorded web-claim event.
- `marketing.upcomingEvents`: published events with a future `startAt`. Do not report attendee totals or capacity percentages because the event model stores registration links/windows, not bookings or capacity.

### Existing APIs to reuse

| UI content | API/hook | Required adjustment |
| --- | --- | --- |
| Verify voucher | `GET /api/v1/loyalty/redemptions/verify`; `useVerifyVoucher` | Already integrated. |
| Mark voucher used | `POST /api/v1/loyalty/redemptions/fulfill`; `useFulfillVoucher` | Already integrated. Invalidate the dashboard overview query after success. Keep fulfillment property unset while the dashboard remains global. |
| Redemption activity log | `GET /api/v1/loyalty/redemptions/fulfillments`; `useFulfillments` | Add optional `from` and exclusive `before` filters. Render customer, reward, code, points, actor, property, and time. Remove room because the response has no room data. |
| Member lookup | `GET /api/v1/loyalty/members?search=...&limit=5`; `useMembers` | Search name/email/phone, then show active balance and tier. Rename from “checked-in guest/room lookup” to “member points & tier lookup.” Room and checked-in state are not supported by the loyalty model. |
| Tier benefits in member lookup | Existing loyalty tiers query | Match the selected member's `tierId` and show configured benefits. Hide the block when no tier exists. |
| Popular reward catalogue | `GET /api/v1/loyalty/rewards`; `useRewards` | Use for browseable catalog data. Use `overview.manager.topRewards` when popularity/ranking is shown. Replace quota copy with actual tier/property eligibility because reward inventory quotas are not stored. |
| Active campaign cards | `GET /api/v1/deals?availability=active&limit=3`; `useDeals` | Existing response already contains translations, category, benefit, redemption/promo code, eligibility tiers, validity, workflow status, and derived availability. |
| Upcoming event cards | Existing events list with `phase=upcoming`, `status=published`, `limit=4`; `useEvents` | Existing response supplies title, start/end, location, property, and phase. Remove booked/capacity and “Almost Full” labels. |
| Publishing pipeline | Shared dashboard overview | Already available. Remove fallback demo rows and show loading/error/empty states. |

## Frontend integration design

### 1. Keep shared URL state

Keep `variant`, `timeRange`, and `contentTab` in `nuqs`. The selected mode remains shareable and survives navigation. Tab changes should use history `push`; filters/range should use `replace`, consistent with the dashboard URL-state rules.

### 2. Permission-aware modes and widgets

- Executive Overview: `dashboard:read`.
- Loyalty Manager: expose only when the user can read the loyalty widgets being shown. Guard member, tier, reward, and configuration sub-widgets individually.
- Loyalty Redemption: expose for `loyalty-redemption:verify` or `loyalty-redemption:read`; guard member lookup and reward catalogue separately.
- Marketing & CMS: expose when the user can read at least one of blog, deal, or event content; guard each panel independently.
- If a URL contains a mode the user cannot access, normalize it in an effect after permissions finish loading. Never change URL state during render.

This matters because the current selector offers every mode to every dashboard user while only some action buttons are permission-guarded.

### 3. Query ownership

- Parent page owns `useDashboardOverview` and passes its response to Executive Overview and Loyalty Manager.
- Marketing owns the existing deal and event list hooks; it still receives shared overview data for KPIs and publishing pipeline.
- Redemption owns the existing fulfillment, member, tiers, and reward hooks; it receives shared overview data only for `redemptionToday` and ranked rewards.
- Use `enabled` conditions so detail queries run only for the active mode and allowed widget. The overview request can stay shared because it feeds three modes.
- After voucher fulfillment, invalidate both fulfillment keys and `dashboardOverviewKeys.all` so the shift KPI, recent activity, and points totals update together.

### 4. Honest UI states

- Loading: skeleton or neutral ellipsis; never a production-looking sample number.
- Error: localized retry per affected panel so one failed resource does not blank the whole mode.
- Empty: explicit “No … yet/in this period” message.
- Zero: render `0`, not an empty state.
- Remove all `overview?.value ?? 2845`-style numeric fallbacks and every hardcoded production row.

## Delivery sequence

### Phase 1 — Contract and aggregate coverage

1. Extend dashboard domain entity, repository interface, use case response, FE type, and focused tests with `manager`, `redemptionToday`, and `marketing` sections.
2. Add repository queries for 30-day expiry exposure, point-type distribution, ranked rewards, today's redemption summary, and upcoming-event count.
3. Preserve Jakarta half-open boundaries and global/property request validation.
4. Add repository/use-case tests for zero earned points, cancelled vouchers, expired active vouchers, missing point type, previous-period trend, and day-boundary records.

### Phase 2 — Executive and Loyalty Manager

1. Keep Executive Overview on the existing fields and remove residual fallbacks.
2. Replace Loyalty Manager fallback totals, liability card, earning channels, manager note, and top rewards with the enhanced response.
3. Replace “claims” language with redemptions/fulfillments throughout.
4. Add loading/error/empty states for tier and ranked-reward panels.

### Phase 3 — Redemption Station

1. Keep the working verify/fulfill flow.
2. Add fulfillment date filters in BE/FE and connect today's activity log.
3. Connect member search and tier benefits; remove room/check-in assumptions.
4. Connect today's four KPIs and popular rewards.
5. Invalidate all related caches after fulfillment and verify the refreshed values.

### Phase 4 — Marketing & CMS

1. Connect active campaign cards through `useDeals`.
2. Connect upcoming events through `useEvents` and use the aggregate upcoming-event count.
3. Replace attendance/capacity copy with stored date, location, property, registration window, and phase.
4. Remove content-pipeline fallback rows and add panel-level loading/error/empty states.

### Phase 5 — Access, quality, and rollout

1. Filter modes and sub-widgets by permissions and normalize unauthorized URL modes.
2. Verify keyboard tabs, URL persistence, responsive layouts, and no hidden query firing.
3. Run focused backend tests, backend lint/build, frontend lint/build, and dashboard smoke tests for all four modes.
4. Validate with fixtures for empty database, zero earned points, one-tier setup, expired voucher, cancelled redemption, and unpublished content.

## Acceptance criteria

- No dashboard mode displays demo customers, rewards, campaigns, events, metrics, trends, capacities, or fallback content.
- Executive Overview remains fully served by the overview endpoint.
- Loyalty Manager's liability, earning sources, and rankings are calculated from persisted data.
- Redemption verification and fulfillment still work, and successful fulfillment refreshes every affected panel.
- “Active Web Claims” is replaced with **Active Vouchers Awaiting Use**.
- Member lookup does not claim room/check-in knowledge the system cannot prove.
- Marketing does not show attendance/capacity because those facts are not stored.
- Story totals remain distinct article counts.
- Redemption rate remains redeemed points divided by earned points, returning null/“—” when earned is zero.
- All time windows use Asia/Jakarta semantics and half-open boundaries.
- Global data is labeled global; no selected property name is shown beside global metrics.
