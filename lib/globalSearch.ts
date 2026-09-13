/**
 * Pencocokan & peringkat untuk global search (lompat ke halaman).
 *
 * File ini SENGAJA murni: tidak mengimpor apa pun — tidak React, tidak
 * `@/constant/routeAccess`, tidak ikon — supaya bisa diuji dengan
 * `node --test --experimental-strip-types lib/globalSearch.test.ts`.
 *
 * Yang menentukan halaman mana yang BOLEH muncul ada di lib/access.ts
 * (`searchableDestinations`). Di sini cuma soal urutan: daftar yang masuk
 * sudah tersaring permission.
 */

export type SearchDestination = {
  /** Path tujuan, sekaligus identitas baris. */
  href: string;
  title: string;
  /** Grup sidebar tempat halaman ini bernaung — dipakai sebagai label grup. */
  section?: string;
  /** Sinonim yang tidak muncul di judul: "promo" untuk Deals, "rbac" untuk Permissions. */
  keywords?: readonly string[];
};

export type RankedDestination = SearchDestination & { score: number };

/**
 * Samakan bentuk teks sebelum dibandingkan: huruf kecil, aksen dibuang, dan
 * semua pemisah (spasi, '-', '/', '&') jadi satu spasi. Dengan begitu
 * "redeem-points", "Redeem & Verify" dan "redeem points" sama-sama terjangkau
 * oleh ketikan "redeem p".
 */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    // NFKD memecah "e" beraksen jadi huruf + tanda; tandanya ikut terbuang
    // oleh pembersihan di baris berikutnya.
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Bobot per bidang: judul paling menentukan, path paling lemah. */
const FIELD_WEIGHT = {
  title: 6,
  section: 3,
  keyword: 2,
  path: 1,
} as const;

/**
 * Nilai satu token terhadap satu bidang.
 *
 * Posisi kecocokan ikut menentukan: awal bidang > awal kata > tengah kata.
 * Tanpa ini "room" memberi nilai sama untuk "Rooms" dan "Master Facility for
 * Room", padahal yang dicari orang hampir selalu yang pertama.
 */
function fieldScore(token: string, text: string, weight: number): number {
  if (!text) return 0;
  const at = text.indexOf(token);
  if (at < 0) return 0;
  if (at === 0) return weight * 3;
  if (text[at - 1] === " ") return weight * 2;
  return weight;
}

type Indexed = {
  destination: SearchDestination;
  title: string;
  section: string;
  keywords: string[];
  path: string;
  /** Huruf pertama tiap kata judul, untuk ketikan singkatan ("lc" → Loyalty Configuration). */
  initials: string;
};

function indexDestination(destination: SearchDestination): Indexed {
  const title = normalizeText(destination.title);
  return {
    destination,
    title,
    section: normalizeText(destination.section ?? ""),
    keywords: (destination.keywords ?? []).map(normalizeText),
    path: normalizeText(destination.href),
    initials: title
      .split(" ")
      .map((word) => word[0] ?? "")
      .join(""),
  };
}

function tokenScore(token: string, entry: Indexed): number {
  let best = fieldScore(token, entry.title, FIELD_WEIGHT.title);
  best = Math.max(best, fieldScore(token, entry.section, FIELD_WEIGHT.section));
  for (const keyword of entry.keywords) {
    best = Math.max(best, fieldScore(token, keyword, FIELD_WEIGHT.keyword));
  }
  return Math.max(best, fieldScore(token, entry.path, FIELD_WEIGHT.path));
}

/** Kedalaman path, dipakai sebagai pemecah seri: hub menang atas sub-halamannya. */
function depthOf(href: string): number {
  return href.split("/").filter(Boolean).length;
}

/**
 * Urutkan tujuan berdasarkan kecocokan dengan `query`.
 *
 * - Query kosong → daftar dikembalikan APA ADANYA (urutan ROUTE_ACCESS, yaitu
 *   urutan sidebar). Palette yang baru dibuka sebaiknya terlihat seperti menu,
 *   bukan seperti hasil pencarian acak.
 * - Setiap token harus ketemu di suatu tempat. "add room" tidak boleh
 *   memunculkan "Add Property" hanya karena "add"-nya cocok.
 * - Seri dipecah oleh kedalaman path lalu judul, jadi hasilnya stabil dan
 *   tidak berubah-ubah antar render.
 */
export function rankDestinations(
  destinations: readonly SearchDestination[],
  query: string,
): RankedDestination[] {
  const normalized = normalizeText(query);
  if (!normalized) {
    return destinations.map((destination) => ({ ...destination, score: 0 }));
  }

  const tokens = normalized.split(" ");
  const compact = normalized.replace(/ /g, "");
  const ranked: RankedDestination[] = [];

  for (const destination of destinations) {
    const entry = indexDestination(destination);

    let score = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const value = tokenScore(token, entry);
      if (value === 0) {
        matchedAll = false;
        break;
      }
      score += value;
    }

    // Singkatan hanya menyelamatkan ketikan yang GAGAL total, dan cuma kalau
    // ketikannya satu kata — "um" → User Management. Kalau sudah cocok normal,
    // menambahkannya cuma mengacak urutan.
    if (!matchedAll) {
      if (tokens.length > 1 || compact.length < 2) continue;
      if (!entry.initials.startsWith(compact)) continue;
      score = FIELD_WEIGHT.title * 2;
    }

    // Judul yang diawali persis oleh ketikan selalu naik ke atas: mengetik
    // "media" harus memberi halaman Media, bukan "Master Facility for Room"
    // yang kebetulan mengumpulkan nilai dari beberapa bidang.
    if (entry.title.startsWith(normalized)) score += FIELD_WEIGHT.title * 4;

    ranked.push({ ...destination, score });
  }

  return ranked.sort(
    (a, b) =>
      b.score - a.score ||
      depthOf(a.href) - depthOf(b.href) ||
      a.title.localeCompare(b.title),
  );
}

export type DestinationGroup = {
  label: string;
  items: RankedDestination[];
};

/**
 * Kelompokkan menurut `section`, mempertahankan urutan kemunculan pertama tiap
 * section. Dipakai saat palette dibuka tanpa ketikan; hasil pencarian sengaja
 * dibiarkan datar supaya peringkatnya tidak dipecah grup.
 */
export function groupDestinations(
  destinations: readonly RankedDestination[],
): DestinationGroup[] {
  const groups: DestinationGroup[] = [];
  const index = new Map<string, DestinationGroup>();

  for (const destination of destinations) {
    const label = destination.section ?? "Other";
    let group = index.get(label);
    if (!group) {
      group = { label, items: [] };
      index.set(label, group);
      groups.push(group);
    }
    group.items.push(destination);
  }

  return groups;
}
