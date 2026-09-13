export interface Permission {
  id: string;
  name: string;
  label: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionListResponse {
  data: Permission[];
  errors: string[] | null;
}

/** Grup permission by resource prefix, buat modal assign */
export interface PermissionGroup {
  resource: string;
  permissions: Permission[];
}