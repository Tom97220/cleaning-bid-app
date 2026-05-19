'use client'

import { useRouter } from 'next/navigation'
import BuildingSearch, { type SearchRow } from '@/components/BuildingSearch'

export default function ProspectList() {
  const router = useRouter()

  function handleSelect(row: SearchRow) {
    router.push(`/prospects/${row.prospect_id}/buildings/${row.building_id}`)
  }

  return <BuildingSearch onSelect={handleSelect} />
}
