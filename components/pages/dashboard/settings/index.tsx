'use client';

import Link from 'next/link';
import { ArrowRight01Icon } from 'hugeicons-react';

import { Heading } from '@/components/molecules/dashboard/head';
import { PageShell } from '@/components/molecules/dashboard/pageShell';
import EmptyState from '@/components/organisms/feedback/emptyState';
import { usePermissions } from '@/hooks/usePermissions';

/**
 * Kartu di halaman ini dulunya array kedua yang ditulis tangan di file
 * komponen. Sekarang diturunkan dari entry ber-`card` di ROUTE_ACCESS, jadi
 * kartu yang muncul dan halaman yang boleh dibuka selalu sama.
 */
export default function SettingsPage() {
  const { settingCards } = usePermissions();

  return (
    <PageShell>
      <Heading
        title="Settings"
        subtitle="Manage your application configuration and preferences."
        noIcon
      />

      {/* Menu cards */}
      {settingCards.length === 0 ? (
        <EmptyState
          title="Nothing to configure"
          message="Your account has no settings permissions. Ask an administrator if you need access here."
          size="sm"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {settingCards.map((menu) => (
            <MenuCard key={menu.href} {...menu} />
          ))}
        </div>
      )}
    </PageShell>
  );
}

/** Kartu navigasi hub — link yang bisa diklik utuh, bukan tombol. Warna token. */
function MenuCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative rounded-2xl border border-xenia-border bg-white p-5 transition-all duration-200 hover:border-xenia-moss-600 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-xenia-moss-600 focus-visible:ring-offset-2 focus-visible:ring-offset-xenia-canvas"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-xenia-canvas text-xenia-moss-600 transition-colors duration-200 group-hover:bg-xenia-moss-600 group-hover:text-xenia-canvas">
          <Icon size={22} />
        </div>
        <span className="flex h-8 w-8 items-center justify-center rounded-full text-xenia-stone-500 transition-all duration-200 group-hover:translate-x-1 group-hover:text-xenia-moss-600">
          <ArrowRight01Icon size={20} />
        </span>
      </div>

      <h3 className="mt-4 font-medium text-xenia-ink-900">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-xenia-stone-500">
        {description}
      </p>
    </Link>
  );
}
