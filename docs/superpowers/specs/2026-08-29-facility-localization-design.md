# Facility Localization Design

**Date:** 2026-08-29

## Summary

Add end-to-end localization for facility category names and facility names in
English (`en`), English for Indonesia (`en-id`), and Bahasa Indonesia
(`id-id`). The existing `content.general_translations` table is the localized
source of truth, while the existing columns in the `properties` schema retain
canonical English values for compatibility and fallback.

This change covers fresh database seeds, dashboard facility CRUD and editing,
public property and room facility responses, and landing-page locale
propagation. It does not localize property-specific facility descriptions or
the currently unused master facility description.

## Goals

- Let dashboard users edit facility category names and facility names in three
  supported locales.
- Require English while allowing `en-id` and `id-id` to fall back to English.
- Save the canonical facility record and its translations atomically.
- Return localized category and facility names from public property and room
  endpoints.
- Preserve existing facility IDs, category codes, assignments, highlighted
  facility configuration, and callers that do not supply a locale.
- Seed all three translations for the canonical fresh-database facility
  catalog without reintroducing a highlighted facility category.

## Non-goals

- Localizing `properties.properties_facilities.description`.
- Localizing `properties.rooms_facilities.description`.
- Adding an editor for `properties.facilities.description`.
- Backfilling databases that have already run the baseline seeds.
- Changing the current room-highlight persistence model.
- Localizing unrelated dashboard interface text.

## Data Model

No new table or column is required. Localized values use
`content.general_translations`, whose unique owner key is:

`related_type + related_id + locale + key`

Facility category translations use:

| Column | Value |
| --- | --- |
| `related_type` | `facility_categories` |
| `related_id` | `properties.facility_categories.id` |
| `locale` | `en`, `en-id`, or `id-id` |
| `key` | `name` |
| `value` | localized category name |

Facility item translations use:

| Column | Value |
| --- | --- |
| `related_type` | `facilities` |
| `related_id` | `properties.facilities.id` |
| `locale` | `en`, `en-id`, or `id-id` |
| `key` | `facility_name` |
| `value` | localized facility name |

`properties.facility_categories.name` and
`properties.facilities.facility_name` continue to store the required English
value. An English translation row is also stored so facilities follow the same
CMS translation contract as other localized content.

Empty optional translations are represented by the absence of a
`general_translations` row. Saving an optional locale as blank deletes its row.

## Locale Contract and Fallback

The supported locales are exactly `en`, `en-id`, and `id-id`.

Resolved public and locale-specific dashboard values follow this order:

1. Requested locale translation.
2. `en` translation.
3. Canonical English column in the `properties` table.

An omitted or unsupported public locale resolves as `en`. This preserves
compatibility with existing callers and prevents an unsupported locale from
causing a facility endpoint failure.

## Dashboard Backend

Facility category and item DTOs gain a translations payload. The response
shape contains all supported locales so one editor load can populate every
locale tab.

Conceptual category shape:

```json
{
  "id": 1,
  "type": "room",
  "code": "basic",
  "name": "Basic Facilities",
  "translations": {
    "en": { "name": "Basic Facilities" },
    "en-id": { "name": "Basic Facilities" },
    "id-id": { "name": "Fasilitas Dasar" }
  }
}
```

Conceptual facility item shape:

```json
{
  "id": 10,
  "categoryId": 1,
  "facilityName": "Air Conditioning",
  "translations": {
    "en": { "facilityName": "Air Conditioning" },
    "en-id": { "facilityName": "Air Conditioning" },
    "id-id": { "facilityName": "Pendingin Ruangan" }
  }
}
```

Create and localized update operations validate that `translations.en` is
present and nonblank. The service derives the canonical column from the
English translation rather than accepting two competing English values.

Category/item record writes and translation upserts run in one database
transaction. Translation IDs use the repository's existing numeric ID
generator. Upserts target the table's natural unique owner key. Blank optional
values delete existing translation rows.

Updates used only for facility reassignment may omit `translations`. In that
case the service updates `category_id` and preserves all names and translation
rows. This keeps the existing drag-and-drop flow safe.

Deleting a facility removes its `facilities` translation rows in the same
transaction. Deleting a category removes translation rows for both the
category and any facility items deleted with it.

Facility list endpoints continue returning canonical English in `name` and
`facilityName`, plus the complete translations object. An optional locale may
be supported for resolved reads, but the facility master editor always uses
the complete translation response.

## Dashboard Frontend

The facility master board remains an English-first administrative overview.
Its category headings, item rows, confirmation copy, and mutation success
messages use the canonical English values.

The add and edit dialogs follow the existing CMS locale-tab pattern:

- English
- English (Indonesia)
- Bahasa Indonesia

Category forms expose a localized category name in each tab. Item rows expose
a localized facility name in each tab. English inputs are required. Optional
locale inputs explain that blank values fall back to English.

The form submits one atomic category or item translation payload. Existing
facility selectors, property/room assignment screens, and room detail previews
continue using the canonical English fields and require no interaction change.

## Public Backend

The property facility endpoint and both room list/detail flows accept a locale
and resolve category and facility names through `general_translations`.
Queries should fetch the requested locale and English fallback without an N+1
query per facility.

Property facility groups localize:

- Group `name` from the facility category translation.
- Item `name` from the facility translation.
- Featured facility `name` from the facility translation.

Room facility groups localize the same category and item fields. Highlighted
room items reuse the already-resolved facility items, so their localized names
remain identical to the source group.

The synthetic highlighted group is not reintroduced into the facility master
or seed. Its display label is selected from a small locale-aware system-label
mapping in the public backend so `id-id` responses do not contain an English
heading.

## Landing Frontend

Property-facility and room requests pass the route locale to the public
backend. Any BFF route or cached service involved in these requests includes
locale in its parameters and cache identity. Rendering components continue to
consume the same response fields; only the returned text changes.

The public response remains backward compatible for requests without locale,
which receive English.

## Fresh Seed Behavior

Both active facility seed paths insert translations for every seeded category
and facility:

- `en`: current canonical English wording.
- `en-id`: current canonical English wording.
- `id-id`: Indonesian wording.

Translation rows are idempotent on
`related_type + related_id + locale + key`. Seed reruns update the value rather
than creating duplicates. Facility IDs and category IDs continue to come from
the existing deterministic seed flow, and translation IDs use the appropriate
numeric ID generation strategy for that seed environment.

The seed continues to contain only real property and room facility categories.
It does not seed a `highlighted` category or a “Room Feature(s) You May Like”
facility category.

Following the previously approved fresh-database assumption, no migration is
added to backfill existing installations.

## Error Handling

- Reject localized create/update requests when the English value is blank.
- Reject locale keys outside `en`, `en-id`, and `id-id` in dashboard writes.
- Treat blank optional locale values as deletion, not as an empty public label.
- Preserve all translations when an item is only moved to another category.
- Fall back to English for unsupported or missing public locales.
- Roll back the facility record and translation changes together if any write
  fails.

## Verification

### Database and seeders

- Every seeded category name has three translation rows.
- Every seeded facility name has three translation rows.
- A second seed run creates no duplicate translation or assignment rows.
- Existing category codes, facility IDs, assignments, and room configs remain
  unchanged.
- No highlighted master category is seeded.

### Dashboard backend

- DTO validation requires English and rejects unsupported locales.
- Create and update write canonical English plus all nonblank translations.
- Clearing an optional locale deletes its row.
- Reassignment-only updates preserve translations.
- Category/item deletion removes owned translations.
- Translation write failures roll back canonical changes.
- Facility reads return complete three-locale translation shapes with fallback
  values suitable for the editor.

### Dashboard frontend

- Locale-tab form state produces the expected category and item payloads.
- English validation blocks submission while optional locales may be blank.
- Editing existing data loads all three values.
- Drag-and-drop reassignment does not send or clear translations.
- Focused tests, lint, and the production build pass.

### Public backend and landing frontend

- Requested `id-id` names are returned when present.
- Missing `id-id` and `en-id` rows fall back to English.
- Missing English translation rows fall back to canonical columns.
- Property groups, featured property facilities, room groups, and room
  highlights use the same localized facility names.
- Landing property and room requests forward locale and isolate cached results
  by locale.
- Focused tests and production builds pass.

## Repositories in Scope

- `xenia-db-copy`: fresh baseline and facility translation seed data.
- `xenia-dashboard-be`: translation-aware facility CRUD and seed script.
- `xenia-dashboard-fe`: three-locale facility editor.
- `xenia-app-be`: localized public property and room facility responses.
- `xenia-landing-fe`: locale propagation and cache separation.

