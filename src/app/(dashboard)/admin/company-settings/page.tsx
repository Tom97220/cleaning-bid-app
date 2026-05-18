import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/supabase/auth'
import Header from '@/components/layout/Header'
import CompanySettingsForm from './CompanySettingsForm'

export const metadata = { title: 'Company Settings | CleanBid Pro' }

export default async function CompanySettingsPage() {
  const role = await getUserRole()
  if (role !== 'admin') redirect('/')

  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('company_settings')
    .select('*')
    .maybeSingle()

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Company Settings"
        description="Company information shown on report headers and cover pages"
      />
      <div className="p-6 max-w-2xl">
        <CompanySettingsForm settings={settings} />
      </div>
    </div>
  )
}
