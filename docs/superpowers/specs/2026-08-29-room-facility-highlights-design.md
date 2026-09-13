# Room Facility Highlights Design

## Goal

Let dashboard users choose up to six facilities already assigned to a room and highlight them as “Room Feature(s) You May Like”, while storing only the ordered highlighted facility IDs in `properties.rooms.configs`.

## Scope

- `xenia-db-copy`: remove legacy room config data, remove the highlighted master category, retain its useful facilities under the normal room-facilities category, and seed normalized room-facility assignments without reading legacy JSON.
- `xenia-dashboard-be`: make the room-facilities replacement API read and write highlights atomically with the relation rows.
- `xenia-dashboard-fe`: add highlight selection to the existing room Facility tab.
- `xenia-app-be`: synthesize the existing public `highlighted` facility group from the saved ID list so `xenia-landing-fe` remains compatible.
- `xenia-landing-fe`: no source change; its current `facility_groups` lookup remains the public presentation contract.

## Data Contract

The only supported room config key is:

```json
{
  "highlighted_facility_ids": [12, 18, 21]
}
```

The list is ordered, contains unique positive facility IDs, and has at most six entries. Every ID must identify an active room-type facility assigned to the same room through `properties.rooms_facilities`.

Fresh seeded rooms start with `{}` and no highlights. Saving room facilities creates or replaces `highlighted_facility_ids`; unrelated future config keys are preserved by merging the key rather than replacing the full object.

## Dashboard API

`GET /rooms/:roomId/facilities` returns ordered links:

```json
[
  { "facilityId": 12, "isHighlighted": true },
  { "facilityId": 18, "isHighlighted": false }
]
```

`PUT /rooms/:roomId/facilities` accepts the same link shape. The backend rejects duplicate facility IDs, more than six highlighted links, missing or inactive facilities, and non-room facilities. One database transaction soft-deletes the previous relation set, inserts the replacement set, and updates `rooms.configs.highlighted_facility_ids`.

An omitted `isHighlighted` is treated as `false` for compatibility with older dashboard clients.

## Dashboard UI

The existing room Facility tab remains the owner of both selections. Above the full facility checklist, a “Room Feature(s) You May Like” panel lists only currently checked room facilities. Each item has a highlight toggle and the panel shows `n/6 selected`.

At six selections, other highlight toggles are disabled until one is cleared. Unchecking a facility also removes it from the highlight list. The existing Save Changes button sends membership and highlight flags in one request.

## Seed Transition

The baseline room rows use `{}` for `configs`. The facility master seed creates only `basic` and `room_facilities` room categories. The former highlighted-category items—Private pool, Balcony / terrace, Bathtub, Seating area, Separate dining area, and In-room safe—move into `room_facilities`, retaining stable facility names and avoiding duplicate `(facility_name, type)` rows.

The old config-reading migration is replaced with an explicit seed derived from the legacy room data. It inserts the same normalized room-facility memberships by room ID and canonical facility name, is idempotent, and does not populate highlights.

## Public Read Path

`xenia-app-be` reads `highlighted_facility_ids` with each room, resolves those IDs against that room’s normalized facility groups, and appends a synthetic group with code `highlighted`, name `Room Feature(s) You May Like`, and icon `star`. Invalid or stale IDs are ignored, and configured order is retained.

This preserves the response consumed by the landing room card and detail page without retaining a fake master category.

## Error Handling and Compatibility

- Empty facility replacements are valid and store an empty highlighted list.
- Invalid highlight requests return HTTP 400 and make no database changes.
- Existing clients that only send `facilityId` remain valid.
- The fresh-database assumption means no cleanup migration is provided for already-running databases.
- The legacy room JSON is removed from the baseline rather than retained as rollback data.

## Verification

- Database tests prove baseline configs are empty, the highlighted category is absent, moved facility items remain selectable, normalized assignments are present, and reruns are idempotent.
- Dashboard backend tests prove config parsing/merging, uniqueness, type checks, and the six-item limit.
- Dashboard frontend tests prove highlight toggling, automatic removal, and the six-item cap; lint and production build validate the interactive component boundary.
- Public API tests prove the synthetic group filters stale IDs and preserves configured order.
