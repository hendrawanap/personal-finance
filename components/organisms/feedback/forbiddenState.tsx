"use client";

import { ShieldUserIcon } from "hugeicons-react";
import StatePanel from "./statePanel";

type ForbiddenStateProps = {
  title?: string;
  message?: string;
  /** Permission yang kurang — ditampilkan supaya admin tahu apa yang harus diberikan. */
  requiredPermission?: string;
  size?: "md" | "sm";
  className?: string;
};

/**
 * Dipakai penjaga route (routeGuard) dan halaman yang kena 403 dari API.
 *
 * Menyebut nama permission-nya disengaja: tanpa itu laporan yang masuk selalu
 * "halamannya error", dan yang bisa memperbaiki harus menebak baris mana yang
 * kurang di role orang tersebut.
 */
export default function ForbiddenState({
  title = "You do not have access",
  message = "This page needs a permission your account has not been granted. Ask an administrator to add it to your role.",
  requiredPermission,
  size = "md",
  className,
}: ForbiddenStateProps) {
  return (
    <StatePanel size={size} className={className} role="status">
      <ShieldUserIcon size={28} className="text-[#B3452E]" aria-hidden />
      <p className="text-base font-medium text-[#1D1B16]">{title}</p>
      <p className="max-w-md px-6 text-center text-sm text-[#8A8271]">
        {message}
      </p>
      {requiredPermission && (
        <code className="rounded-md bg-[#F2ECDD] px-2 py-1 font-mono text-xs text-[#5C6E5F]">
          {requiredPermission}
        </code>
      )}
    </StatePanel>
  );
}
