import { NextResponse } from "next/server"

// Server route that proxies a screenshot request to an external screenshot/rendering service.
// Assumptions:
// - We try to use `process.env.AGENT_API_URL` + `/screenshot` if present, otherwise fall back to a sensible path.
// - The provider accepts a POST JSON body { url, fullPage, width } and returns an image binary (png/jpeg).
// - The API key to authenticate is provided in `process.env.BROWSER_API_KEY` and will be set as a Bearer token.
// If your provider uses a different contract (different endpoint or parameters), adjust this file accordingly.

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { url } = body || {}
    if (!url) return NextResponse.json({ error: "missing url" }, { status: 400 })

    const apiKey = process.env.BROWSER_API_KEY
    const apiBase = process.env.AGENT_API_URL || "https://agent-api.browser.cash/"

    // Build a prioritized list of candidate endpoints to try.
    const commonPaths = ['/v1/screenshot', '/screenshot', '/v1/renderer/screenshot', '/api/screenshot']
    const normalize = (path: string) => `${apiBase.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`
    const candidates: string[] = []
    if (process.env.AGENT_SCREENSHOT_PATH) candidates.push(normalize(process.env.AGENT_SCREENSHOT_PATH))
    for (const p of commonPaths) {
      const ep = normalize(p)
      if (!candidates.includes(ep)) candidates.push(ep)
    }

    try {
      // eslint-disable-next-line no-console
      console.log(`[screenshot] request received for url=${url}`)
      // eslint-disable-next-line no-console
      console.log(`[screenshot] candidate endpoints=${candidates.join(', ')} apiKeySet=${Boolean(apiKey)}`)
    } catch (e) {}

    // helper to call provider and return { res, text }
    const callProvider = async (endpoint: string) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ url, fullPage: true, width: 1280 }),
        })
        const text = await res.text().catch(() => '(no body)')
        return { res, text }
      } catch (err) {
        return { res: null, text: String(err) }
      }
    }

    let providerRes: any = null
    let providerText: string | null = null
    let lastErr: string | null = null
    for (const ep of candidates) {
      // eslint-disable-next-line no-console
      console.log(`[screenshot] trying provider endpoint: ${ep}`)
      const attempt = await callProvider(ep)
      if (!attempt.res) {
        lastErr = attempt.text
        continue
      }
      providerRes = attempt.res
      providerText = attempt.text
      break
    }

    if (!providerRes) {
      console.error('[screenshot] all provider attempts failed', lastErr)
      // dev-friendly fallback: return a placeholder SVG so UI doesn't break
      if (process.env.NODE_ENV !== 'production') {
        const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='720'><rect width='100%' height='100%' fill='#0f172a'/><text x='50%' y='45%' fill='#fff' font-family='Arial, Helvetica, sans-serif' font-size='28' text-anchor='middle'>Screenshot provider unreachable</text><text x='50%' y='55%' fill='#9ca3af' font-family='Arial, Helvetica, sans-serif' font-size='18' text-anchor='middle'>Tried: ${candidates.join(', ')}</text></svg>`
        const base64 = Buffer.from(svg).toString('base64')
        return NextResponse.json({ image: `data:image/svg+xml;base64,${base64}`, tried: candidates })
      }
      return NextResponse.json({ error: 'screenshot provider unreachable', details: lastErr }, { status: 502 })
    }

    if (!providerRes.ok) {
      // provider returned an error status
      // eslint-disable-next-line no-console
      console.error(`[screenshot] provider error status=${providerRes.status} body=${providerText}`)
      if (providerRes.status === 404 && process.env.NODE_ENV !== 'production') {
        const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='720'><rect width='100%' height='100%' fill='#0f172a'/><text x='50%' y='45%' fill='#fff' font-family='Arial, Helvetica, sans-serif' font-size='28' text-anchor='middle'>Screenshot provider not found (404)</text><text x='50%' y='55%' fill='#9ca3af' font-family='Arial, Helvetica, sans-serif' font-size='18' text-anchor='middle'>Tried: ${candidates.join(', ')}</text></svg>`
        const base64 = Buffer.from(svg).toString('base64')
        return NextResponse.json({ image: `data:image/svg+xml;base64,${base64}`, tried: candidates })
      }
      return NextResponse.json({ error: 'screenshot provider error', status: providerRes.status, body: providerText, tried: candidates }, { status: 502 })
    }

    const arrayBuffer = await providerRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const base64 = buffer.toString('base64')

    // eslint-disable-next-line no-console
    console.log(`[screenshot] provider OK, returning image for url=${url}`)
    return NextResponse.json({ image: `data:image/png;base64,${base64}` })
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[screenshot] unexpected error", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
