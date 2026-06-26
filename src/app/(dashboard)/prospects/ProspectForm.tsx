'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { createProspect, updateProspect, type ActionState } from './actions'
import type { Prospect } from '@/types/prospect'
import { createClient } from '@/lib/supabase/client'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
]

const inputClass =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500'

const labelClass = 'block text-sm font-medium text-gray-700 mb-1'

const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml']
const MAX_LOGO_BYTES = 2 * 1024 * 1024 // 2 MB

interface Props {
  prospect?: Prospect
}

export default function ProspectForm({ prospect }: Props) {
  const action = prospect
    ? updateProspect.bind(null, prospect.id)
    : createProspect

  const [state, formAction, isPending] = useActionState<ActionState, FormData>(action, null)

  const supabase = createClient()
  const [logoUrl,     setLogoUrl]     = useState(prospect?.logo_url ?? '')
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file after an error
    if (!file) return
    setUploadError(null)
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setUploadError('Logo must be a PNG, JPG, or SVG file.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setUploadError('Logo must be 2 MB or smaller.')
      return
    }
    setUploading(true)
    const ext  = file.name.split('.').pop()?.toLowerCase() || 'png'
    const path = `customer/${crypto.randomUUID()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('logos')
      .upload(path, file, { cacheControl: '3600', upsert: false })
    if (upErr) {
      setUploadError(upErr.message)
      setUploading(false)
      return
    }
    const { data } = supabase.storage.from('logos').getPublicUrl(path)
    setLogoUrl(data.publicUrl)
    setUploading(false)
  }

  function removeLogo() {
    setLogoUrl('')
    setUploadError(null)
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="logo_url" value={logoUrl} />
      {state?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {/* Company Information */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Company Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>
              Company Name <span className="text-red-500">*</span>
            </label>
            <input
              name="company_name"
              type="text"
              required
              defaultValue={prospect?.company_name ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Prospect Type</label>
            <select name="prospect_type" defaultValue={prospect?.prospect_type ?? ''} className={inputClass}>
              <option value="">Select type...</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="medical">Medical</option>
              <option value="educational">Educational</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select name="status" defaultValue={prospect?.status ?? 'active'} className={inputClass}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Contact Name</label>
            <input
              name="contact_name"
              type="text"
              defaultValue={prospect?.contact_name ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Contact Title</label>
            <input
              name="contact_title"
              type="text"
              defaultValue={prospect?.contact_title ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input
              name="phone"
              type="tel"
              defaultValue={prospect?.phone ?? ''}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input
              name="email"
              type="email"
              defaultValue={prospect?.email ?? ''}
              className={inputClass}
            />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Address</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>Street Address</label>
            <input
              name="address"
              type="text"
              defaultValue={prospect?.address ?? ''}
              className={inputClass}
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Address 2</label>
            <input
              name="address_2"
              type="text"
              defaultValue={prospect?.address_2 ?? ''}
              placeholder="Suite, floor, unit, etc."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              name="city"
              type="text"
              defaultValue={prospect?.city ?? ''}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>State</label>
              <select name="state" defaultValue={prospect?.state ?? ''} className={inputClass}>
                <option value="">--</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>ZIP</label>
              <input
                name="zip"
                type="text"
                maxLength={10}
                defaultValue={prospect?.zip ?? ''}
                className={inputClass}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Notes */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes</h2>
        <textarea
          name="notes"
          rows={4}
          defaultValue={prospect?.notes ?? ''}
          placeholder="Any additional notes about this prospect..."
          className={inputClass}
        />
      </section>

      {/* Customer Logo */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer Logo</h2>
        <div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            onChange={handleLogoUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-700 disabled:opacity-50"
          />
          <p className="text-xs text-gray-400 mt-1">
            {uploading ? 'Uploading…' : 'PNG, JPG, or SVG up to 2 MB. Saved when you submit the form.'}
          </p>
          {uploadError && <p className="text-sm text-red-600 mt-1">{uploadError}</p>}
        </div>
        {logoUrl && (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Customer logo preview"
              className="h-12 w-auto object-contain border border-gray-200 rounded p-1" />
            <p className="text-xs text-gray-400">Current logo</p>
            <button type="button" onClick={removeLogo}
              className="text-sm text-red-500 hover:text-red-700 font-medium">
              Remove
            </button>
          </div>
        )}
      </section>

      {/* Form Actions */}
      <div className="flex items-center gap-3 pb-6">
        <button
          type="submit"
          disabled={isPending}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {isPending ? 'Saving...' : prospect ? 'Save Changes' : 'Create Prospect'}
        </button>
        <Link href="/prospects" className="text-sm font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </Link>
      </div>
    </form>
  )
}
