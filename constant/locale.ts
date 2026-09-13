export const STANDARD_LOCALES = [
  { code: 'en', label: 'English', required: true },
  { code: 'en-id', label: 'English (Indonesia)', required: false },
  { code: 'id-id', label: 'Indonesia', required: false },
] as const

export type StandardLocaleCode = (typeof STANDARD_LOCALES)[number]['code']

export const STANDARD_LOCALE_LABELS: Record<StandardLocaleCode, string> = {
  en: 'English',
  'en-id': 'English (Indonesia)',
  'id-id': 'Indonesia',
}

export const standardLocaleLabel = (code: string): string =>
  (STANDARD_LOCALE_LABELS as Record<string, string>)[code] ?? code
