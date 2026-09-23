import { NextRequest } from "next/server";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { apiSuccess, apiUnauthorized } from "@/lib/api/response";
import { AuthProfile } from "@/types/auth/profile";
import { PERMISSIONS } from "@/types/auth/permission.type";

export async function GET(request: NextRequest) {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return apiUnauthorized();
  }

  const { user, supabase, isOffline } = auth;

  let userName = user.name || "User";

  if (!isOffline && supabase) {
    try {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("user_id", user.id)
        .limit(1);

      if (profiles && profiles.length > 0 && profiles[0].name) {
        userName = profiles[0].name;
      }
    } catch (err) {
      console.warn("Could not fetch profile in /auth/me:", err);
    }
  }

  const authProfile: AuthProfile = {
    id: user.id,
    name: userName,
    email: user.email || "",
    roles: ["admin"],
    permissions: [...PERMISSIONS],
    propertyScope: { kind: "all" },
  };

  return apiSuccess(authProfile);
}
