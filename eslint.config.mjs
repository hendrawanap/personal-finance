import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Aturan UI dashboard (lihat AGENTS.md → "Komponen wajib").
 * Sementara `warn` supaya CI tidak merah di kode lama; naikkan ke `error`
 * per folder yang sudah dimigrasi.
 */
const uiConsistencyRules = {
  files: ["app/**/*.tsx", "components/**/*.tsx"],
  rules: {
    "no-restricted-syntax": [
      "warn",
      {
        // bg-[#4F6B52], text-[#1D1B16]/60, border-[#E2D9C2] …
        selector:
          "JSXAttribute[name.name='className'] Literal[value=/\\[#[0-9a-fA-F]{3,8}\\]/], " +
          "JSXAttribute[name.name='className'] TemplateElement[value.raw=/\\[#[0-9a-fA-F]{3,8}\\]/]",
        message:
          "Warna hex di className dilarang — pakai token xenia-* dari app/globals.css (mis. bg-xenia-moss-600).",
      },
      {
        // Tailwind default palette yang bukan bagian tema (red-600, neutral-500, sky-100 …)
        selector:
          "JSXAttribute[name.name='className'] Literal[value=/\\b(bg|text|border|ring)-(red|neutral|gray|zinc|slate|stone|sky|blue|emerald|green|amber|yellow|orange)-[0-9]{2,3}\\b/]",
        message:
          "Palet Tailwind bawaan tidak dipakai di dashboard — pakai token xenia-* (danger/ok/warn/info) atau StatusBadge/NoticeBox.",
      },
      {
        selector: "CallExpression[callee.object.name='window'][callee.property.name='confirm']",
        message: "Pakai <ConfirmDialog> dari molecules/dashboard/unit, bukan window.confirm.",
      },
    ],
  },
};

// Komponen fondasi boleh memakai token internal apa pun; aturan di atas ditujukan ke halaman.
const foundationOverrides = {
  files: ["components/organisms/layout/**", "components/ui/**"],
  rules: { "no-restricted-syntax": "off" },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  uiConsistencyRules,
  foundationOverrides,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
