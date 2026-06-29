import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Detect image type from base64 data
const detectMediaType = (base64: string): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' => {
  if (base64.startsWith('iVBOR')) return 'image/png'
  if (base64.startsWith('R0lGOD')) return 'image/gif'
  if (base64.startsWith('UklGR')) return 'image/webp'
  return 'image/jpeg'
}

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
    const mediaType = detectMediaType(base64Data)

    // ── TWO-STEP VISION APPROACH ───────────────────────────────
    // Step 1: Have Claude describe what it sees, find the data structure
    // Step 2: Have Claude extract structured JSON from its own description
    // This dramatically improves accuracy vs one-shot extraction

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64Data },
            },
            {
              type: 'text',
              text: `You are a vision expert analyzing a golf scorecard photograph. Be methodical and accurate.

STEP 1 — DESCRIBE WHAT YOU SEE:
First, describe the scorecard image carefully:
- Is the image rotated? (0°, 90°, 180°, 270°)
- Is the card lying flat or at an angle?
- Are holes 1-18 visible? Are they in one row, two rows, or vertical columns?
- What rows/labels do you see? (e.g. "PAR", "HCP", "MEN", "WOMEN", "BLUE TEES", "WHITE TEES")
- Is there a separate FRONT 9 (holes 1-9) and BACK 9 (holes 10-18) section?

STEP 2 — IDENTIFY THE ANCHOR ROW:
Find the row/column that contains the hole numbers 1, 2, 3, 4, 5, 6, 7, 8, 9 (and 10-18 if visible). This is your anchor for reading data in hole order.

STEP 3 — IDENTIFY PAR:
The PAR row contains only the values 3, 4, or 5. Total typically equals 70, 71, 72, or 73 for 18 holes.

STEP 4 — IDENTIFY HANDICAP/STROKE INDEX:
The HCP row contains unique integers 1-18 (each used exactly once across 18 holes). Look for labels: "HCP", "HDCP", "HANDICAP", "STROKE", "SI", "INDEX".
- If you see multiple HCP rows (Men's, Women's, etc.), use MEN'S HCP unless the card only has one.
- Each of the values 1-18 should appear EXACTLY ONCE across all 18 holes.

STEP 5 — RETURN JSON:
After your analysis, return ONLY this JSON structure on the LAST line of your response (no markdown, no explanation after):

{"holes":[{"par":4,"hcp":7},{"par":5,"hcp":3}, ... 18 total objects ...]}

CRITICAL RULES:
- Array must have EXACTLY 18 objects
- Hole order: index 0 = hole 1, index 17 = hole 18
- par values: only 3, 4, or 5
- hcp values: each integer 1-18 used exactly once across the 18 holes
- If you cannot read a specific value confidently, make your best guess based on visible patterns
- DO NOT default to sequential 1-18 for HCP unless that's what you actually see on the card

Now analyze the scorecard step by step, then provide the JSON.`
            }
          ],
        }
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response — could be at the end of analysis text
    let parsed: { holes: { par: number; hcp: number }[] }
    try {
      // Try to find JSON in the response — look for last { ... } block
      const jsonMatch = responseText.match(/\{[\s\S]*"holes"[\s\S]*\}/g)
      const jsonStr = jsonMatch ? jsonMatch[jsonMatch.length - 1] : responseText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(jsonStr)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Could not parse scorecard data. Try: 1) Lay the card flat on a dark surface, 2) Shoot straight down (no angle), 3) Ensure all 18 holes are clearly visible, 4) Good lighting with no glare.'
      }, { status: 422 })
    }

    if (!parsed.holes || parsed.holes.length !== 18) {
      return NextResponse.json({
        success: false,
        error: `Expected 18 holes, got ${parsed.holes?.length ?? 0}. Make sure both the front 9 and back 9 are clearly visible in the photo.`
      }, { status: 422 })
    }

    // ── SANITIZE PAR VALUES (keep model's HCP — user can edit) ──
    for (let i = 0; i < 18; i++) {
      const h = parsed.holes[i]
      if (![3, 4, 5].includes(h.par)) parsed.holes[i].par = 4
      if (typeof h.hcp !== 'number' || h.hcp < 1 || h.hcp > 18) parsed.holes[i].hcp = i + 1
    }

    // ── REPORT HCP DUPLICATES but DON'T destroy data ──
    // User will see warning in the courses UI and can edit
    const hcpValues = parsed.holes.map(h => h.hcp)
    const hasDuplicates = new Set(hcpValues).size !== 18

    return NextResponse.json({
      success: true,
      holes: parsed.holes,
      warning: hasDuplicates ? 'Some HCP values are duplicated — please review and adjust before saving.' : null
    })

  } catch (error: any) {
    console.error('Scan scorecard error:', error)

    if (error?.status === 401 || error?.message?.includes('API key')) {
      return NextResponse.json({
        success: false,
        error: 'API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.'
      }, { status: 500 })
    }

    if (error?.message?.includes('credit') || error?.message?.includes('balance')) {
      return NextResponse.json({
        success: false,
        error: 'Anthropic credit balance too low. Add credits at console.anthropic.com.'
      }, { status: 500 })
    }

    if (error?.status === 529 || error?.message?.includes('overloaded')) {
      return NextResponse.json({
        success: false,
        error: 'Vision service is busy right now. Please try again in a moment.'
      }, { status: 503 })
    }

    return NextResponse.json({
      success: false,
      error: error?.message || 'Server error during scan.'
    }, { status: 500 })
  }
}