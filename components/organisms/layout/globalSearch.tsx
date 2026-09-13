"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight01Icon, Search01Icon } from "hugeicons-react";

import { DialogShell } from "@/components/molecules/dashboard/unit/dialogShell";
import { usePermissions } from "@/hooks/usePermissions";
import {
  groupDestinations,
  normalizeText,
  rankDestinations,
  type RankedDestination,
  type SearchDestination,
} from "@/lib/globalSearch";
import { cn } from "@/lib/utils";

/**
 * Global search — lompat ke halaman mana pun tanpa menyusuri menu (⌘K / Ctrl K).
 *
 * Daftar tujuannya BUKAN ditulis di sini: datang dari ROUTE_ACCESS lewat
 * `searchableDestinations`, sudah tersaring permission profil yang login. Jadi
 * menambah halaman ke pencarian = menambah judul di constant/routeAccess.ts,
 * dan halaman yang tidak boleh dibuka orang ini tidak pernah muncul sebagai
 * hasil — bukan muncul lalu ditolak saat diklik.
 *
 * Cakupannya sengaja HALAMAN, bukan isi: ini "jump to page", bukan cari nama
 * tamu atau judul artikel. Mencari data butuh endpoint pencarian lintas modul
 * yang belum ada di xenia-dashboard-be.
 */

const RECENT_KEY = "xenia:recent-pages";
const RECENT_LIMIT = 5;
/** Batas hasil: cukup untuk memilih, tidak cukup untuk jadi daftar yang dibaca. */
const RESULT_LIMIT = 24;

function readRecents(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    // localStorage bisa dilarang (mode privat, kebijakan browser). Riwayat
    // adalah kenyamanan, bukan fitur — gagal diam-diam saja.
    return [];
  }
}

function writeRecents(hrefs: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(hrefs));
  } catch {
    /* sama seperti di atas */
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function GlobalSearch({ open, onClose }: Props) {
  // Ref-nya milik komponen luar karena DialogShell butuh tahu apa yang harus
  // difokuskan, tapi inputnya dirender oleh panel di dalamnya.
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <DialogShell
      open={open}
      onClose={onClose}
      title="Search pages"
      hideHeader
      size="lg"
      align="top"
      bare
      bodyClassName="flex flex-col"
      initialFocusRef={inputRef}
      className="max-h-[85dvh] sm:max-h-[70vh]"
      footer={
        <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-xenia-stone-500">
          <div className="hidden sm:flex items-center gap-x-4">
            <Hint keys="↑ ↓" label="navigate" />
            <Hint keys="↵" label="open" />
            <Hint keys="esc" label="close" />
          </div>
          <span className="sm:hidden text-xenia-stone-400">Tap to select page</span>
          <span className="ml-auto">
            Only pages you have access to
          </span>
        </div>
      }
    >
      <SearchPanel inputRef={inputRef} onClose={onClose} />
    </DialogShell>
  );
}

/**
 * Isi palette. Dipisah karena DialogShell tidak merender anaknya saat tertutup:
 * seluruh state di sini (ketikan, baris aktif, riwayat) lahir saat dibuka dan
 * mati saat ditutup, jadi tidak ada yang perlu di-reset dengan effect.
 */
function SearchPanel({
  inputRef,
  onClose,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
}) {
  const router = useRouter();
  const { searchDestinations, isLoading } = usePermissions();

  // Ketikan di sini TIDAK masuk URL, beda dengan search di halaman list. Aturan
  // nuqs di AGENTS.md memisahkan keduanya: yang masuk URL adalah state tampilan
  // (apa yang sedang dilihat), sedangkan isi palette adalah state interaksi yang
  // umurnya selama dialog terbuka — menaruhnya di URL akan menumpuk riwayat
  // per-huruf dan mengotori link yang di-share.
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  // Dibaca sekali saat panel mount — yaitu tiap kali palette dibuka — sehingga
  // riwayat dari tab lain ikut terbawa tanpa langganan apa pun.
  const [recents, setRecents] = useState<string[]>(readRecents);

  const listRef = useRef<HTMLDivElement>(null);

  const searching = normalizeText(query).length > 0;

  const rows = useMemo(() => {
    const ranked = rankDestinations(searchDestinations, query);

    if (searching) {
      // Hasil pencarian dibiarkan datar: memecahnya per section akan mengubur
      // kecocokan terbaik di bawah judul grup.
      return ranked.slice(0, RESULT_LIMIT).map((destination) => ({
        key: `result:${destination.href}`,
        group: "",
        destination,
      }));
    }

    // Riwayat disaring ulang lewat daftar yang sudah berizin, jadi halaman yang
    // permission-nya dicabut hilang dari riwayat dengan sendirinya — tidak perlu
    // membersihkan localStorage saat role berubah.
    const byHref = new Map(ranked.map((item) => [item.href, item]));
    const recent = recents
      .map((href) => byHref.get(href))
      .filter((item): item is RankedDestination => Boolean(item))
      .slice(0, RECENT_LIMIT);

    const result = recent.map((destination) => ({
      key: `recent:${destination.href}`,
      group: "Recent",
      destination,
    }));

    for (const group of groupDestinations(ranked)) {
      for (const destination of group.items) {
        result.push({
          key: `all:${destination.href}`,
          group: group.label,
          destination,
        });
      }
    }
    return result;
  }, [searchDestinations, query, searching, recents]);

  // Dijepit saat render, bukan di-reset lewat effect: daftarnya juga berubah
  // saat GET /auth/profile selesai, dan effect yang memanggil setState di sana
  // menghasilkan satu render dengan indeks di luar batas.
  const active = rows.length === 0 ? -1 : Math.min(activeIndex, rows.length - 1);

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const go = (destination: SearchDestination) => {
    const next = [
      destination.href,
      ...recents.filter((href) => href !== destination.href),
    ].slice(0, RECENT_LIMIT);
    setRecents(next);
    writeRecents(next);

    onClose();
    router.push(destination.href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(active + 1, rows.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(active - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[active];
      if (row) go(row.destination);
    }
  };

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-xenia-divider px-4 py-3 sm:px-5 sm:py-4">
        <Search01Icon
          size={18}
          strokeWidth={1.75}
          className="shrink-0 text-xenia-stone-500"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="Search pages — try “transactions”, “budgets”, “accounts”, “analytics”"
          aria-label="Search pages"
          role="combobox"
          aria-expanded
          aria-controls="global-search-results"
          aria-activedescendant={
            active >= 0 ? `global-search-${active}` : undefined
          }
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent text-sm sm:text-base text-xenia-ink-900 outline-none placeholder:text-xenia-stone-400"
        />
      </div>

      <div
        ref={listRef}
        id="global-search-results"
        role="listbox"
        aria-label="Pages"
        className="min-h-0 flex-1 overflow-y-auto px-2 py-2"
      >
        {isLoading ? (
          <Message>Loading the pages you can open…</Message>
        ) : rows.length === 0 ? (
          <Message>
            {searching ? (
              <>
                No page matches{" "}
                <span className="font-medium text-xenia-ink-900">{query}</span>
              </>
            ) : (
              "No pages are available for your account yet."
            )}
          </Message>
        ) : (
          rows.map((row, index) => {
            const startsGroup =
              row.group !== "" && row.group !== rows[index - 1]?.group;

            return (
              <div key={row.key}>
                {startsGroup && (
                  <p className="px-3 pt-3 pb-1 text-[11px] font-medium tracking-wide text-xenia-stone-500 uppercase">
                    {row.group}
                  </p>
                )}
                <button
                  type="button"
                  id={`global-search-${index}`}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  onClick={() => go(row.destination)}
                  onMouseMove={() => setActiveIndex(index)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    index === active
                      ? "bg-xenia-sage-100"
                      : "hover:bg-xenia-surface-hover",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-xenia-ink-900">
                    {row.destination.title}
                  </span>
                  {searching && row.destination.section && (
                    <span className="shrink-0 text-xs text-xenia-stone-500">
                      {row.destination.section}
                    </span>
                  )}
                  <ArrowRight01Icon
                    size={14}
                    strokeWidth={1.75}
                    className={cn(
                      "shrink-0 text-xenia-stone-400",
                      index === active ? "opacity-100" : "opacity-0",
                    )}
                  />
                </button>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

function Hint({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <kbd className="rounded border border-xenia-border bg-white px-1.5 py-0.5 font-sans text-[10px] text-xenia-stone-700">
        {keys}
      </kbd>
      {label}
    </span>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 py-10 text-center text-sm text-xenia-stone-500">
      {children}
    </p>
  );
}
