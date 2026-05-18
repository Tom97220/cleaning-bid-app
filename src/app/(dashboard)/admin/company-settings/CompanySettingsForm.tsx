'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface CompanySettings {
  id: string
  company_name: string | null
  address_1: string | null
  address_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
}

interface Props {
  settings: CompanySettings | null
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'

const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

export default function CompanySettingsForm({ settings }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [form, setForm] = useState({
    company_name: settings?.company_name ?? '',
    address_1:    settings?.address_1    ?? '',
    address_2:    settings?.address_2    ?? '',
    city:         settings?.city         ?? '',
    state:        settings?.state        ?? '',
    zip:          settings?.zip          ?? '',
    phone:        settings?.phone        ?? '',
    email:        settings?.email        ?? '',
    logo_url:     settings?.logo_url     ?? '',
  })
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm(prev => ({ ...prev, [field]: e.target.value }))
      setSuccess(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    const payload = {
      company_name: form.company_name.trim() || null,
      address_1:    form.address_1.trim()    || null,
      address_2:    form.address_2.trim()    || null,
      city:         form.city.trim()         || null,
      state:        form.state.trim()        || null,
      zip:          form.zip.trim()          || null,
      phone:        form.phone.trim()        || null,
      email:        form.email.trim()        || null,
      logo_url:     form.logo_url.trim()     || null,
    }

    const { error: err } = settings?.id
      ? await supabase.from('company_settings').update(payload).eq('id', settings.id)
      : await supabase.from('company_settings').insert(payload)

    if (err) {
      setError(err.message)
    } else {
      setSuccess(true)
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Company Info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Company Information</h3>

        <div>
          <label className={labelClass}>Company Name</label>
          <input type="text" value={form.company_name} onChange={set('company_name')}
            placeholder="Acme Cleaning Services" className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Phone</label>
            <input type="tel" value={form.phone} onChange={set('phone')}
              placeholder="(555) 555-5555" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={set('email')}
              placeholder="info@company.com" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Address</h3>

        <div>
          <label className={labelClass}>Address Line 1</label>
          <input type="text" value={form.address_1} onChange={set('address_1')}
            placeholder="123 Main Street" className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Address Line 2 <span className="text-gray-400 font-normal">(optional)</span></label>
          <input type="text" value={form.address_2} onChange={set('address_2')}
            placeholder="Suite 100" className={inputClass} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1">
            <label className={labelClass}>City</label>
            <input type="text" value={form.city} onChange={set('city')}
              placeholder="Chicago" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input type="text" value={form.state} onChange={set('state')}
              placeholder="IL" maxLength={2} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>ZIP</label>
            <input type="text" value={form.zip} onChange={set('zip')}
              placeholder="60601" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Logo</h3>
        <div>
          <label className={labelClass}>
            Logo URL <span className="text-gray-400 font-normal">(optional — public image URL)</span>
          </label>
          <input type="url" value={form.logo_url} onChange={set('logo_url')}
            placeholder="https://example.com/logo.png" className={inputClass} />
        </div>
        {form.logo_url && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={form.logo_url} alt="Logo preview" className="h-12 w-auto object-contain border border-gray-200 rounded p-1" />
            <p className="text-xs text-gray-400">Logo preview</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {success && <p className="text-sm text-green-700 font-medium">Settings saved successfully.</p>}
        {error   && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </form>
  )
}
