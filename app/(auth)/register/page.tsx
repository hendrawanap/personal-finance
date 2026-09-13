import { Suspense } from "react";
import RegisterPage from "@/components/pages/auth/register";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden bg-xenia-forest-950">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-xenia-forest-950 via-xenia-forest-900 to-xenia-moss-600" />
          <p className="relative text-sm text-xenia-canvas/70">Loading...</p>
        </div>
      }
    >
      <RegisterPage />
    </Suspense>
  );
}
