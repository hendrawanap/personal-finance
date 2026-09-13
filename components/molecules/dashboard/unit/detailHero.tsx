"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DetailHeroStat {
    label: string;
    value: ReactNode;
}

interface DetailHeroProps {
    /** Label kecil di atas judul — kategori, tipe event, atau code. */
    eyebrow?: ReactNode;
    title: ReactNode;
    /** Satu baris di bawah judul: tagline atau excerpt. */
    tagline?: ReactNode;
    /** Paragraf ringkas di bawah tagline. */
    summary?: ReactNode;
    /** Angka-angka ringkas. 2×2 di panel kanan, atau strip bawah kalau ada `media`. */
    stats?: DetailHeroStat[];
    /**
     * Sampul. Kalau diisi, dia yang mengambil panel kanan dan `stats` turun
     * menjadi strip di bawah — isi dengan <img>/<video> ber-`h-full w-full
     * object-cover`.
     */
    media?: ReactNode;
    className?: string;
}

function StatCell({
    label,
    value,
    className,
}: DetailHeroStat & { className?: string }) {
    return (
        <div className={cn("min-w-0 p-5", className)}>
            <span className="text-xs text-white/45">{label}</span>
            <p className="mt-2 text-sm break-words">{value ?? "—"}</p>
        </div>
    );
}

/**
 * Pita hero halaman detail CMS — satu bentuk untuk Activities, Blog, Events
 * dan Galleries.
 *
 * Isinya sengaja cuma yang locale-dependent (judul, tagline, ringkasan) plus
 * beberapa angka: begitu tab bahasa di atasnya diganti, seluruh pita ikut
 * berubah dan perbedaan antar versi langsung terbaca.
 */
export function DetailHero({
    eyebrow,
    title,
    tagline,
    summary,
    stats = [],
    media,
    className,
}: DetailHeroProps) {
    const hasSidePanel = Boolean(media) || stats.length > 0;
    // Baris terakhir grid 2 kolom tidak diberi garis bawah.
    const lastRowStart = stats.length - (stats.length % 2 === 0 ? 2 : 1);

    return (
        <section
            className={cn(
                "overflow-hidden rounded-2xl bg-xenia-forest-900 text-white shadow-sm",
                className,
            )}
        >
            <div className={cn("grid", hasSidePanel && "lg:grid-cols-[1.35fr_1fr]")}>
                <div className="min-w-0 p-7 md:p-10">
                    {eyebrow && (
                        <p className="truncate text-xs tracking-[0.18em] text-white/55 uppercase">
                            {eyebrow}
                        </p>
                    )}
                    <h2 className="mt-4 font-serif text-4xl break-words">{title}</h2>
                    {tagline && (
                        <p className="mt-2 text-lg break-words text-white/80">{tagline}</p>
                    )}
                    {summary && (
                        <p className="mt-5 max-w-2xl text-sm leading-7 break-words text-white/70">
                            {summary}
                        </p>
                    )}
                </div>

                {media ? (
                    <div className="relative min-h-[220px] min-w-0 overflow-hidden border-l border-white/10 bg-white/[0.04]">
                        {media}
                    </div>
                ) : stats.length > 0 ? (
                    <div className="grid min-w-0 grid-cols-2 border-l border-white/10 bg-white/[0.04]">
                        {stats.map((stat, index) => (
                            <StatCell
                                key={stat.label}
                                {...stat}
                                className={cn(
                                    index % 2 === 0 && "border-r border-white/10",
                                    index < lastRowStart && "border-b border-white/10",
                                )}
                            />
                        ))}
                    </div>
                ) : null}
            </div>

            {media && stats.length > 0 && (
                <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.04] sm:grid-cols-4">
                    {stats.map((stat, index) => (
                        <StatCell
                            key={stat.label}
                            {...stat}
                            className={cn(
                                index < stats.length - 1 &&
                                    "border-b border-white/10 sm:border-b-0 sm:border-r",
                            )}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}
