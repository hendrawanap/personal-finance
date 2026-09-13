/**
 * Legacy booking engine flag.
 *
 * Booking will be handled by a third-party system, so the built-in booking
 * module (bookings, block dates) and the pricing machinery that only exists
 * to feed it (room rates, daily-rate calendar, property rate plans) are
 * hidden by default. Set NEXT_PUBLIC_LEGACY_BOOKING=true to bring the whole
 * legacy behavior back exactly as it was.
 *
 * Physical Rooms sits under this flag too (2026-09-11). Per-unit inventory
 * (room number, floor, wing, housekeeping status) has exactly one consumer:
 * app-be counts availability off `properties.physical_rooms` when
 * `app_config.booking_inventory_mode = 'PHYSICAL_ROOM'`. With booking gone
 * the table is write-only, so the page, the entry point on Rooms and the
 * physical-room hints on the Room form all follow the flag.
 *
 * One thing the flag does NOT restore: dashboard-be used to recalculate
 * `rooms.total_unit` / `available_unit` from the physical-room count on every
 * write, silently overwriting what an editor typed on the Room form. That
 * recalc was removed rather than flagged (the BE has no build-time flag), so
 * the Room form is now the only writer of those two columns. If per-unit
 * inventory ever comes back, decide then which side owns them — see
 * `physical-rooms.service.ts`.
 *
 * Room Categories is deliberately NOT here: it feeds the public landing site
 * (ShanayaRoomSection → /api/v1/room-categories) and must stay reachable.
 *
 * NEXT_PUBLIC_ vars are inlined at build time — the flag must be set when
 * `next build` runs (e.g. as a Docker build arg), not at container start.
 */
export const LEGACY_BOOKING_ENABLED =
  process.env.NEXT_PUBLIC_LEGACY_BOOKING === 'true'
