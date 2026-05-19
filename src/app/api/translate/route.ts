import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { texts } = (await req.json()) as { texts: string[] }

  if (!texts?.length) {
    return NextResponse.json({ translations: [] })
  }

  const prompt = `Translate each of the following cleaning industry phrases to Spanish.
Return a JSON array where each element has "en" (the original text, copied exactly) and "es" (the Spanish translation).
Use concise, field-appropriate language for custodial staff. No explanations or extra text.

Texts:
${texts.map((t, i) => `${i + 1}. ${t}`).join('\n')}

Return ONLY valid JSON, example format:
[{"en":"Sweep and mop floors","es":"Barrer y trapear pisos"}]`

  console.log('[translate] ANTHROPIC_API_KEY present:', !!process.env.ANTHROPIC_API_KEY)

  const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system:
        'You are a professional translator specializing in cleaning industry and custodial services. ' +
        'Always respond with valid JSON only — no markdown, no prose.',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!apiRes.ok) {
    const err = await apiRes.text()
    return NextResponse.json({ error: err }, { status: apiRes.status })
  }

  const data = (await apiRes.json()) as { content?: { type: string; text: string }[] }
  const raw = data.content?.find(b => b.type === 'text')?.text ?? '[]'

  try {
    // Strip markdown code fences if Claude wraps the JSON
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const translations = JSON.parse(cleaned) as { en: string; es: string }[]
    return NextResponse.json({ translations })
  } catch {
    return NextResponse.json({ error: 'Could not parse translation response', raw }, { status: 500 })
  }
}
