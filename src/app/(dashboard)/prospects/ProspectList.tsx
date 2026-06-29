'use client'

import { useRouter } from 'next/navigation'
import ProspectSearch, { type ProspectRow } from '@/components/ProspectSearch'

export default function ProspectList() {
  const router = useRouter()

  function handleSelect(row: ProspectRow) {
    router.push(`/prospects/${row.prospect_id}`)
  }

  return <ProspectSearch onSelect={handleSelect} />
}
