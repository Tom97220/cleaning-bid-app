'use client'

import { useRouter } from 'next/navigation'
import BuildingSearch, { type SearchRow } from '@/components/BuildingSearch'

export default function ReportsSearchView() {
  const router = useRouter()

  function handleSelect(row: SearchRow) {
    const params = new URLSearchParams({
      prospectId: row.prospect_id,
      buildingId: row.building_id,
    })
    router.push(`/reports?${params.toString()}`)
  }

  // Consolidated recap: prospectId only → reports/page.tsx renders
  // ConsolidatedReportsView (its own building checklist handles selection).
  function handleSelectProspect(prospectId: string) {
    const params = new URLSearchParams({ prospectId })
    router.push(`/reports?${params.toString()}`)
  }

  return (
    <BuildingSearch
      groupByProspect
      onSelect={handleSelect}
      onSelectProspect={handleSelectProspect}
    />
  )
}
