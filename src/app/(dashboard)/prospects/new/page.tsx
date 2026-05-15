import Header from '@/components/layout/Header'
import ProspectForm from '../ProspectForm'

export const metadata = { title: 'New Prospect | CleanBid Pro' }

export default function NewProspectPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="New Prospect"
        description="Add a new prospect to the master file"
      />
      <div className="p-6 max-w-3xl">
        <ProspectForm />
      </div>
    </div>
  )
}
