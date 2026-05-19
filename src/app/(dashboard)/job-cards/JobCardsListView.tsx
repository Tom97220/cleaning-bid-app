'use client'

import { useRouter } from 'next/navigation'
import BuildingSearch, { type SearchRow } from '@/components/BuildingSearch'

export default function JobCardsListView() {
  const router = useRouter()

  function handleSelect(row: SearchRow) {
    router.push(`/prospects/${row.prospect_id}/buildings/${row.building_id}?tab=jobcards`)
  }

  return <BuildingSearch onSelect={handleSelect} />
}
