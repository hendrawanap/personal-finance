const DEFAULT_VERSION = "v1";

export const SERVICE_VERSIONS = {
  auth: "v1",
  properties: "v1",
  "property-types": "v1",
  rooms: "v1",
  statuses: "v1",
  "physical-rooms": "v1",
  "room-categories": "v1",
  "room-rates": "v1",
  bookings: "v1",
  deals: "v1",
  activities: "v1",
  "block-dates": "v1",
  roles: "v1",
  users: "v1",
  "app-configs": "v1",
  options: "v1",
  "rate-plans": "v1",
  blog: "v1",
  events: "v1",
  permissions: "v1",
  authors: "v1",
  "content-media": "v1",
  "facility-categories": "v1",
  facilities: "v1",
  galleries: "v1",
  loyalty: "v1",
  "landing-sections": "v1",
  "site-pages": "v1",
  "site-content": "v1",
  reviews: "v1",
  dashboard: "v1",
  "audit-logs": "v1",
} as const;

export type ServiceName = keyof typeof SERVICE_VERSIONS;

export function v(service: ServiceName, path: string = ""): string {
  const version = SERVICE_VERSIONS[service] ?? DEFAULT_VERSION;
  return `/${version}/${service}${path}`;
}
