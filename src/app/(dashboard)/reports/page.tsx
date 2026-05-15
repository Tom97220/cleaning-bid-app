import Header from '@/components/layout/Header'

export const metadata = { title: 'Reports | CleanBid Pro' }

const reports = [
  {
    title: 'Bid Summary Report',
    description: 'Overview of all bids with status, hours, and pricing',
    category: 'Bidding',
    icon: '📊',
  },
  {
    title: 'Work Loading Detail',
    description: 'Detailed breakdown of labor hours by task and position',
    category: 'Operations',
    icon: '⏱️',
  },
  {
    title: 'Prospect Pipeline',
    description: 'Prospect status, bid values, and win/loss tracking',
    category: 'Sales',
    icon: '📈',
  },
  {
    title: 'Position Cost Analysis',
    description: 'Labor cost comparison across positions and bids',
    category: 'Finance',
    icon: '💰',
  },
  {
    title: 'Task Code Usage',
    description: 'Frequency and hour distribution of task codes across bids',
    category: 'Operations',
    icon: '📋',
  },
  {
    title: 'Bid Proposal Export',
    description: 'Generate printable bid proposals for prospects',
    category: 'Export',
    icon: '📄',
  },
]

export default function ReportsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Reports"
        description="Bid summaries, work loading analysis, and prospect pipeline"
      />

      <div className="p-6">
        <div className="grid grid-cols-3 gap-4">
          {reports.map((report) => (
            <button
              key={report.title}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-brand-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{report.icon}</span>
                <span className="text-xs font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full">
                  {report.category}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 text-sm group-hover:text-brand-700 transition-colors">
                {report.title}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{report.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
