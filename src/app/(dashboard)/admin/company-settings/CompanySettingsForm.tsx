'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface CompanySettings {
  id: string
  company_name: string | null
  phone: string | null
  email: string | null
  logo_url: string | null
}

export interface CompanyLocation {
  id: string
  location_name: string
  address_1: string | null
  address_2: string | null
  city: string | null
  state: string | null
  zip: string | null
  is_default: boolean
}

interface Props {
  settings: CompanySettings | null
  initialLocations: CompanyLocation[]
}

const inputClass =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent'
const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

const emptyLocForm = {
  location_name: '',
  address_1: '',
  address_2: '',
  city: '',
  state: '',
  zip: '',
  is_default: false,
}

export default function CompanySettingsForm({ settings, initialLocations }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ─── Company info ──────────────────────────────────────────────────────────

  const [form, setForm] = useState({
    company_name: settings?.company_name ?? '',
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

  // ─── Locations ─────────────────────────────────────────────────────────────

  const [locations, setLocations] = useState<CompanyLocation[]>(initialLocations)
  const [mode,       setMode]       = useState<'list' | 'add' | 'edit'>('list')
  const [editTarget, setEditTarget] = useState<CompanyLocation | null>(null)
  const [locForm,    setLocForm]    = useState(emptyLocForm)
  const [locSaving,  setLocSaving]  = useState(false)
  const [locError,   setLocError]   = useState<string | null>(null)

  async function fetchLocations() {
    const { data } = await supabase
      .from('company_locations')
      .select('*')
      .order('is_default', { ascending: false })
      .order('location_name')
    setLocations(data ?? [])
  }

  function startAdd() {
    setLocForm(emptyLocForm)
    setEditTarget(null)
    setLocError(null)
    setMode('add')
  }

  function startEdit(loc: CompanyLocation) {
    setLocForm({
      location_name: loc.location_name,
      address_1:     loc.address_1 ?? '',
      address_2:     loc.address_2 ?? '',
      city:          loc.city      ?? '',
      state:         loc.state     ?? '',
      zip:           loc.zip       ?? '',
      is_default:    loc.is_default,
    })
    setEditTarget(loc)
    setLocError(null)
    setMode('edit')
  }

  function cancelLocEdit() {
    setMode('list')
    setEditTarget(null)
    setLocError(null)
  }

  async function saveLocation() {
    if (!locForm.location_name.trim()) {
      setLocError('Location name is required.')
      return
    }
    setLocSaving(true)
    setLocError(null)

    const payload = {
      location_name: locForm.location_name.trim(),
      address_1:     locForm.address_1.trim() || null,
      address_2:     locForm.address_2.trim() || null,
      city:          locForm.city.trim()      || null,
      state:         locForm.state.trim()     || null,
      zip:           locForm.zip.trim()       || null,
      is_default:    locForm.is_default,
    }

    if (mode === 'edit' && editTarget) {
      const { error: err } = await supabase
        .from('company_locations')
        .update(payload)
        .eq('id', editTarget.id)
      if (err) { setLocError(err.message); setLocSaving(false); return }
      if (payload.is_default) {
        await supabase.from('company_locations').update({ is_default: false }).neq('id', editTarget.id)
      }
    } else {
      const { data, error: err } = await supabase
        .from('company_locations')
        .insert(payload)
        .select('id')
        .single()
      if (err) { setLocError(err.message); setLocSaving(false); return }
      if (payload.is_default && data) {
        await supabase.from('company_locations').update({ is_default: false }).neq('id', data.id)
      }
    }

    await fetchLocations()
    setMode('list')
    setLocSaving(false)
  }

  async function deleteLocation(id: string) {
    if (!confirm('Delete this location?')) return
    await supabase.from('company_locations').delete().eq('id', id)
    await fetchLocations()
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">

      {/* Company Info */}
      <form onSubmit={handleSubmit} className="space-y-6">

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
              <img src={form.logo_url} alt="Logo preview"
                className="h-12 w-auto object-contain border border-gray-200 rounded p-1" />
              <p className="text-xs text-gray-400">Logo preview</p>
            </div>
          )}
        </div>

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

      {/* Locations */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Locations</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Addresses shown on report headers and cover pages. Select one per report.
            </p>
          </div>
          {mode === 'list' && (
            <button
              onClick={startAdd}
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-800"
            >
              + Add Location
            </button>
          )}
        </div>

        {/* Location form */}
        {(mode === 'add' || mode === 'edit') && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
            <h4 className="text-sm font-semibold text-gray-800">
              {mode === 'add' ? 'New Location' : 'Edit Location'}
            </h4>

            <div>
              <label className={labelClass}>Location Name</label>
              <input
                type="text"
                value={locForm.location_name}
                onChange={e => setLocForm(prev => ({ ...prev, location_name: e.target.value }))}
                placeholder="Main Office"
                maxLength={50}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Address Line 1</label>
              <input
                type="text"
                value={locForm.address_1}
                onChange={e => setLocForm(prev => ({ ...prev, address_1: e.target.value }))}
                placeholder="123 Main Street"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Address Line 2 <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={locForm.address_2}
                onChange={e => setLocForm(prev => ({ ...prev, address_2: e.target.value }))}
                placeholder="Suite 100"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1">
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  value={locForm.city}
                  onChange={e => setLocForm(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Chicago"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input
                  type="text"
                  value={locForm.state}
                  onChange={e => setLocForm(prev => ({ ...prev, state: e.target.value }))}
                  placeholder="IL"
                  maxLength={2}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>ZIP</label>
                <input
                  type="text"
                  value={locForm.zip}
                  onChange={e => setLocForm(prev => ({ ...prev, zip: e.target.value }))}
                  placeholder="60601"
                  className={inputClass}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={locForm.is_default}
                onChange={e => setLocForm(prev => ({ ...prev, is_default: e.target.checked }))}
                className="accent-brand-600"
              />
              <span className="text-sm text-gray-700">Set as default location</span>
            </label>

            {locError && <p className="text-sm text-red-600">{locError}</p>}

            <div className="flex gap-3">
              <button
                onClick={saveLocation}
                disabled={locSaving}
                className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {locSaving ? 'Saving…' : 'Save Location'}
              </button>
              <button
                onClick={cancelLocEdit}
                className="border border-gray-300 hover:border-gray-400 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Location list */}
        {locations.length === 0 && mode === 'list' ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400">No locations added yet. Click &ldquo;Add Location&rdquo; to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map(loc => {
              const addrParts = [
                loc.address_1,
                loc.address_2,
                [loc.city, loc.state, loc.zip].filter(Boolean).join(', '),
              ].filter(Boolean)

              return (
                <div key={loc.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{loc.location_name}</p>
                      {loc.is_default && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          Default
                        </span>
                      )}
                    </div>
                    {addrParts.length > 0 && (
                      <p className="text-sm text-gray-500 truncate">{addrParts.join(' · ')}</p>
                    )}
                  </div>
                  {mode === 'list' && (
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <button onClick={() => startEdit(loc)}
                        className="text-sm text-brand-600 hover:text-brand-800 font-medium">
                        Edit
                      </button>
                      <button onClick={() => deleteLocation(loc.id)}
                        className="text-sm text-red-500 hover:text-red-700 font-medium">
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
