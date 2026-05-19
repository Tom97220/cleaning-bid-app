'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BuildingTabNav({
  prospectId,
  buildingId,
  activeTab,
}: {
  prospectId: string
  buildingId: string
  activeTab?: string
}) {
  const pathname = usePathname()
  const base     = `/prospects/${prospectId}/buildings/${buildingId}`
  const isBid      = pathname.startsWith(`${base}/bid`)
  const isJobCards = !isBid && activeTab === 'jobcards'
  const isAreas    = !isBid && !isJobCards

  const tabs = [
    { label: 'Areas',     href: base,                     active: isAreas    },
    { label: 'Job Cards', href: `${base}?tab=jobcards`,   active: isJobCards },
    { label: 'Bid',       href: `${base}/bid`,            active: isBid      },
  ]

  return (
    <div className="border-b border-gray-200 px-6 shrink-0">
      <nav className="-mb-px flex gap-6">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              tab.active
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
