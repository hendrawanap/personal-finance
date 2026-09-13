# Dashboard Home Endpoint Gap Analysis

Date: 5 September 2026

Scope: current `/dashboard` home page in `xenia-dashboard-fe`, mapped against the APIs in `xenia-dashboard-be` (and checked against `xenia-app-be` where relevant).

## Executive summary

The dashboard home page is visually complete but is not yet a data dashboard. Apart from the signed-in user's profile and the property list, every KPI, chart, tier figure, recent transaction, and content-pipeline row is hard-coded.

Backend readiness is mixed:

- **Ready to wire:** current user, properties, total loyalty members, tier distribution (including `memberCount`), loyalty configuration, active deal count, and the individual article/event/deal/activity lists.
- **Needs enhancement:** member growth by period, global redemption/action counts, published-story counting, period deltas, property/date filtering, and consistent content-list ordering.
- **Needs new capability:** cross-member points analytics, a unified recent loyalty feed, and a unified content pipeline endpoint.
- **No endpoint required:** current date, quick-action/navigation cards, module directory links, and the legacy-booking feature notice.

The cleanest implementation is one dashboard-specific read endpoint, `GET /api/v1/dashboard/overview`, backed by server-side aggregates. Existing CRUD/list endpoints should remain the source for their feature pages.

## What the page contains today

The route wraps the home component in `Suspense` because its two view filters are stored in the URL ([`app/dashboard/page.tsx:1`](../app/dashboard/page.tsx#L1), [`components/pages/dashboard/index.tsx:59`](../components/pages/dashboard/index.tsx#L59)).

The page contains:

1. Header: user greeting, selected sanctuary/property, current date, and quick actions.
2. Four KPI cards: total loyalty members; vouchers and redemptions; active deals and offers; published CMS stories.
3. Loyalty points chart: earned versus redeemed over 7D/30D/90D/1Y, totals, and redemption/burn rate.
4. Membership tier distribution and program rules.
5. Recent loyalty transactions.
6. Content and publishing pipeline, filterable by article/event/deal/activity.
7. Static module directory and an optional legacy-booking notice.

The hard-coded datasets are explicit in the source: KPIs ([`components/pages/dashboard/index.tsx:68`](../components/pages/dashboard/index.tsx#L68)), points analytics ([`components/pages/dashboard/index.tsx:116`](../components/pages/dashboard/index.tsx#L116)), tier distribution ([`components/pages/dashboard/index.tsx:170`](../components/pages/dashboard/index.tsx#L170)), recent loyalty activity ([`components/pages/dashboard/index.tsx:207`](../components/pages/dashboard/index.tsx#L207)), and content pipeline ([`components/pages/dashboard/index.tsx:266`](../components/pages/dashboard/index.tsx#L266)).

Only these reads are live:

- `GET /api/v1/auth/profile` through `useProfile()`.
- `GET /api/v1/properties` through `useProperties()`.
- The selected property ID itself comes from the persisted Zustand store, not an API call.

This can be seen where the component initializes its data at [`components/pages/dashboard/index.tsx:468`](../components/pages/dashboard/index.tsx#L468), with the client services at [`services/auth/auth.service.ts:30`](../services/auth/auth.service.ts#L30) and [`services/property/property.service.ts:16`](../services/property/property.service.ts#L16).

## Endpoint map

Legend:

- **Ready**: backend response is sufficient; frontend wiring is still required unless noted.
- **Enhance**: an endpoint exists, but its contract cannot reliably produce the displayed content.
- **Add**: no suitable endpoint or underlying capability exists.
- **Static**: the content should remain client-side/navigation-driven.

| Dashboard content | Current frontend | Existing backend capability | Status | Required work |
| --- | --- | --- | --- | --- |
| User greeting | Live `useProfile()` | `GET /api/v1/auth/profile` | **Ready and wired** | Add normal loading/error presentation only if desired. |
| Active sanctuary/property name | Live property list plus persisted `selectedUnitId` | `GET /api/v1/properties` | **Ready and wired** | It currently only changes the badge/name; preserve that UI behavior for now. The new dashboard API still accepts both explicit scopes for later use. |
| Current date | Browser-generated | None needed | **Static** | No API. |
| Quick actions | Permission-gated links | Existing create/redeem/enrol feature endpoints are invoked on destination pages | **Static** | No dashboard read API. Keep permission gates. |
| Total loyalty members | Hard-coded | `GET /api/v1/loyalty/members?limit=1` returns `meta.total` ([member controller](../../xenia-dashboard-be/src/modules/loyalty/member/member.controller.ts#L32), [member service](../../xenia-dashboard-be/src/modules/loyalty/member/member.service.ts#L58)) | **Ready for current total; enhance for trend** | Wire `meta.total`. Add `joinedFrom`, `joinedTo`, and optional `propertyId`, or expose summary fields, for “new this month” and month-over-month percentage. Current query supports search/tier/sort only ([DTO](../../xenia-dashboard-be/src/modules/loyalty/member/dto/query-member.dto.ts#L11)). |
| Rewards redeemed | Hard-coded; replaces “pending front-desk verification” | A redemption creation means points were spent and a voucher was issued. `GET /api/v1/loyalty/redemptions/fulfillments` is cross-member but only covers vouchers later used at a property ([service](../../xenia-dashboard-be/src/modules/loyalty/redemption/redemption.service.ts#L476)). | **Enhance** | Make the general redemption list cross-member by making `memberId` optional; add `propertyId`, `createdFrom`, `createdTo`, and status filters. Today the list requires one `memberId` ([DTO](../../xenia-dashboard-be/src/modules/loyalty/redemption/dto/query-redemption.dto.ts#L13)). The KPI should count `reward_redeemed` actions, not an invented pending state. |
| Vouchers used | Not currently shown as a live value | Cross-member fulfilment history and `meta.total` already exist. | **Ready** | Use as the card's secondary operational value if desired: “N vouchers used this period.” Do not call fulfilment “reward redeemed”; fulfilment is the later voucher-use event. |
| Redemption month-over-month delta | Hard-coded | No period summary | **Add** | Add current/prior-period counts to the dashboard summary or a redemption statistics endpoint. Do not calculate this by downloading paginated rows. |
| Active deals & offers | Hard-coded | `GET /api/v1/deals?workflowStatus=published&availability=active&limit=1` returns `meta.total`; property filtering is supported ([controller](../../xenia-dashboard-be/src/modules/deals/presentation/controllers/deals.controller.ts#L88), [DTO](../../xenia-dashboard-be/src/modules/deals/presentation/dtos/deal.dto.ts#L245), [repository](../../xenia-dashboard-be/src/modules/deals/infrastructure/database/repositories/deal.repository.ts#L180)) | **Ready** | Wire the filtered total. |
| Deals ending soon | Hard-coded | Deals support `availability=ending_soon` | **Ready, verify semantics** | Wire a second filtered count. Confirm that “ending soon” is exactly the UI's next-seven-days rule; otherwise accept an `endingBefore` boundary. |
| Scheduled deals | Replaces the untrackable hard-coded “claims” figure | `GET /api/v1/deals?workflowStatus=scheduled&limit=1` returns `meta.total`. | **Ready** | Use “N scheduled” as the KPI's secondary value. Keep “M ending in the next 7 days” as its subtext. This is actionable and requires no speculative tracking model. |
| Published CMS stories | Hard-coded | `GET /api/v1/blog/articles?status=published&limit=1` returns a total ([controller](../../xenia-dashboard-be/src/modules/blog/blog.controller.ts#L33)) | **Enhance for correctness** | The list count currently counts translation rows, so one story with multiple locales can inflate the KPI ([service](../../xenia-dashboard-be/src/modules/blog/blog.service.ts#L173)). Count distinct article IDs for a “stories” KPI. Add publication date boundaries for “published this week.” |
| Drafts awaiting review | Hard-coded | `GET /api/v1/blog/articles?status=draft&limit=1` can return a draft translation-row total | **Enhance** | Define editorial “awaiting review” separately from generic draft if review is a real workflow. Otherwise label it “draft translations” or return distinct draft stories. |
| Points earned/redeemed chart | Hard-coded Chart.js series | Per-member history exists at `GET /api/v1/loyalty/members/:id/movements` and already accepts date boundaries, but there is no cross-member statistics read. The point controller only earns, adjusts, and reads one balance ([point controller](../../xenia-dashboard-be/src/modules/loyalty/point/point.controller.ts#L25)). | **Add** | Add a global aggregate grouped by time bucket and movement family, e.g. `GET /api/v1/dashboard/loyalty/points-series?from=&to=&bucket=day&propertyId=`. Return numeric earned, redeemed, expired, adjusted, and net values. |
| Earned total, redeemed total, burn/redemption rate | Hard-coded | Same raw movement data as above, but no cross-member aggregate | **Add** | Return totals in the same points-series response. Specify the rate formula; recommended: `redeemed / earned`, with null rather than 0 when earned is zero. |
| Membership tier distribution | Hard-coded | `GET /api/v1/loyalty/tiers` already attaches `memberCount` to every tier ([tier controller](../../xenia-dashboard-be/src/modules/loyalty/tier/tier.controller.ts#L34), [tier service](../../xenia-dashboard-be/src/modules/loyalty/tier/tier.service.ts#L85)) | **Ready** | Wire tier names, colours/presentation metadata, member counts, and computed percentage. Define where members with no tier appear. |
| Tier benefits text | Hard-coded | Tier responses contain benefits | **Ready** | Render live benefits or intentionally keep shortened marketing copy in the UI. |
| Program rules | Hard-coded “12 months of inactivity” sentence | `GET /api/v1/loyalty/config` contains separate point-expiry and member-inactivity settings | **Ready; frontend correction needed** | Wire configuration values and phrase them accurately. Point expiry and inactivity policy are separate concepts in the current configuration screen. |
| Recent loyalty transactions | Hard-coded mixed activity feed | Cross-member fulfilments are available; generic audit logs also exist and record loyalty actions. Point movements remain member-scoped. | **Enhance or add** | Preferred: add `GET /api/v1/dashboard/loyalty/activity` returning normalized action codes and display data. The agreed labels are listed below. Alternative: enrich/filter `GET /api/v1/audit-logs`, including `propertyId`, display name, reward, points, and status. |
| Content & publishing pipeline | Hard-coded mixed rows | Separate lists exist: `GET /api/v1/blog/articles`, `/events`, `/deals`, and `/activities`. Events and activities also provide useful count summaries. | **Available underneath; add aggregate** | A frontend four-request merge is possible, but a unified endpoint is preferable for globally correct ordering, consistent statuses, and fewer requests: `GET /api/v1/dashboard/content-pipeline?type=&status=&propertyId=&limit=`. |
| Content type tabs | URL state via `contentTab` | No API currently called | **Ready after pipeline wiring** | Pass the selected type to the unified pipeline endpoint, or enable/disable the corresponding individual query. Preserve the existing URL behavior. |
| Module directory | Static links | None needed | **Static** | No API. Permission-filter unavailable modules if that is the intended access model. |
| Legacy booking compatibility notice | Feature flag | None needed | **Static** | No API unless feature flags are later moved to server-managed configuration. |

## Existing content-list endpoints that can be reused

| Endpoint | Useful existing filters/metadata | Dashboard use |
| --- | --- | --- |
| `GET /api/v1/blog/articles` | locale, publication status, category, search, page, limit; pagination total | Article rows and article counts, after fixing distinct-story semantics where required. |
| `GET /api/v1/events` | status, event phase, property, search, pagination; all/ongoing/upcoming/ended counts | Event rows and event lifecycle summaries. |
| `GET /api/v1/deals` | property, tier, category, benefit type, workflow status, availability, pagination total | Active/ending-soon deals and deal pipeline rows. |
| `GET /api/v1/activities` | status, surface, property, pagination; status counts | Activity pipeline rows and draft/published/archived totals. |

There is no corresponding admin aggregation in `xenia-app-be`; loyalty data ownership remains in `xenia-dashboard-be`, so the dashboard backend is the correct place for these additions.

## Recommended API shape

### Primary endpoint

`GET /api/v1/dashboard/overview`

Suggested query parameters:

- `scope` — required enum: `global | property`.
- `propertyId` — required when `scope=property` and rejected when `scope=global`.
- `range` — `7D | 30D | 90D | 1Y`.
- `contentType` — `all | article | event | deal | activity`.
- `contentLimit` and `activityLimit` — small bounded limits.

Both scopes belong in the API contract from the start. `global` aggregates all properties; `property` applies the supplied property ID to every section that has a property dimension. A section that is genuinely global should be explicitly documented as such rather than silently ignoring the requested scope.

Suggested response sections:

```json
{
  "data": {
    "scope": {
      "type": "global",
      "propertyId": null,
      "timezone": "Asia/Jakarta",
      "from": "2026-08-07T00:00:00+07:00",
      "toExclusive": "2026-09-05T12:34:56.789+07:00",
      "generatedAt": "2026-09-05T12:34:56.789+07:00"
    },
    "kpis": {
      "members": {
        "total": 0,
        "newInPeriod": 0,
        "previousPeriodNew": 0,
        "changePercent": null
      },
      "redemptions": {
        "rewardsRedeemed": 0,
        "previousPeriodRewardsRedeemed": 0,
        "changePercent": null,
        "pointsRedeemed": 0,
        "vouchersUsed": 0
      },
      "deals": {
        "active": 0,
        "endingSoon": 0,
        "scheduled": 0
      },
      "stories": {
        "published": 0,
        "publishedInPeriod": 0,
        "draft": 0
      }
    },
    "points": {
      "bucket": "day",
      "series": [
        { "at": "2026-09-05", "earned": 0, "redeemed": 0, "expired": 0, "adjusted": 0 }
      ],
      "totals": { "earned": 0, "redeemed": 0, "net": 0 },
      "redemptionRate": null
    },
    "tiers": [],
    "programRules": {},
    "recentLoyaltyActivity": [],
    "contentPipeline": []
  }
}
```

### Loyalty action names

Use stable machine codes in the response and map them to these user-facing labels:

| API action code | Dashboard label | Meaning |
| --- | --- | --- |
| `points_earned` | Points earned | Positive points awarded from a transaction or welcome bonus. |
| `points_adjusted` | Points adjusted | Manual positive or negative staff adjustment. |
| `reward_redeemed` | Reward redeemed | Member spent points and received a voucher. This is the correct action for the redemption KPI. |
| `voucher_used` | Voucher used | The issued voucher was fulfilled at a property. |
| `voucher_cancelled` | Voucher cancelled | Voucher was cancelled and points were returned. |
| `points_expired` | Points expired | A point lot expired. |
| `points_forfeited` | Points forfeited | Points were removed by the inactivity policy. |
| `points_reversed` | Points reversed | A previous point operation was reversed. |
| `member_enrolled` | Member enrolled | A loyalty member was created/enrolled. |
| `tier_changed` | Tier changed | A member moved to another tier. |

The chart is deliberately different: its two principal series should remain **Points earned** and **Points redeemed**, because it aggregates point flow. The feed/KPI should say **Reward redeemed** for the business event that spends those points and issues a voucher. The database movement types already distinguish `earn`, `redeem`, `expire`, `reversal`, `adjustment`, and `forfeit` (`xenia-dashboard-be/src/common/infrastructure/database/drizzle/generated/schema.ts:84-91`).

### Time semantics

Use these rules consistently in the backend:

- Canonical business timezone: `Asia/Jakarta`, configured server-side and echoed in the response. Do not accept arbitrary browser timezones for business reporting.
- Store and query timestamps as UTC instants, but calculate calendar boundaries in `Asia/Jakarta`.
- Use half-open intervals: `from <= timestamp < toExclusive`. This prevents double counting at adjacent boundaries.
- `7D`, `30D`, and `90D` start at local midnight 6, 29, or 89 days before today and end at `generatedAt`, so today is included as a partial bucket.
- `1Y` starts at local midnight on the same date one year earlier and ends at `generatedAt`.
- Bucket `7D` and `30D` by local day, `90D` by local week, and `1Y` by local month. Return the exact bucket start timestamp; the frontend should only format labels.
- Period-over-period comparison uses the immediately preceding interval with the same elapsed duration. For month-to-date KPI copy, compare against the same elapsed portion of the previous calendar month, not the whole previous month.
- Return `changePercent: null` when the previous value is zero. This is more truthful than an artificial 0% or infinity.
- The agreed redemption rate is `redeemedPoints / earnedPoints`. Return `null` when `earnedPoints` is zero; otherwise return a decimal ratio (for example `0.421`), leaving percentage formatting to the frontend.

This endpoint should be permission-aware. Sections the user cannot read should either be omitted with an explicit `unavailableSections` list or returned as `null`; do not turn one missing permission into failure of the entire dashboard.

### Why an aggregate endpoint is preferable

- Avoids roughly 10–15 client requests and repeated loading/error states.
- Calculates period boundaries, prior-period comparisons, distinct counts, and rates consistently.
- Produces a genuinely global recent feed and globally ordered content pipeline.
- Lets SQL aggregate data without downloading paginated records.
- Gives the frontend one stable, dashboard-specific contract while existing feature endpoints remain focused on CRUD/list screens.

## Accepted product decisions

1. **Scope:** the API supports explicit `global` and `property` scopes. No section may silently apply a different scope. The frontend can choose when to expose/switch this behavior separately.
2. **No pending-verification metric:** replace it with real loyalty action data. Use **Reward redeemed** for points spent plus voucher issued, and **Voucher used** for fulfilment.
3. **No deal claims:** claims are not currently trackable. Replace the figure with the existing **scheduled deals** count.
4. **Story identity:** count distinct article IDs, never translation rows.
5. **Redemption rate:** `redeemedPoints / earnedPoints`.
6. **Time:** use server-controlled `Asia/Jakarta` boundaries, UTC storage/query instants, and half-open intervals as specified above.

## Recommended delivery order

1. **Remove misleading data risk:** replace hard-coded values with loading/empty states or clearly marked demo data.
2. **Wire ready data:** profile/property (already wired), member total, tier distribution, program rules, active/ending-soon deals.
3. **Correct existing aggregates:** distinct published stories plus date/property filters for members, redemptions, and content.
4. **Add dashboard aggregates:** points series/totals, recent loyalty activity, and unified content pipeline.
5. **Add contract/integration tests:** verify permission-partial responses, empty data, timezone boundaries, prior-period math, distinct story counting, action normalization, and both scopes.

## Source notes

- Dashboard home UI: [`components/pages/dashboard/index.tsx`](../components/pages/dashboard/index.tsx)
- Dashboard route: [`app/dashboard/page.tsx`](../app/dashboard/page.tsx)
- Backend global prefix and API docs: `xenia-dashboard-be/src/main.ts:23-30`, `xenia-dashboard-be/src/common/presentation/swagger/swagger.ts:4-20`
- No dedicated dashboard aggregation module is currently registered: `xenia-dashboard-be/src/app.module.ts:113-126`
- Existing dashboard filters correctly use URL state; any API wiring should preserve `timeRange` and `contentTab` as URL-backed state.
