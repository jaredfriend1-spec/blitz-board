import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Data,
              },
            },
            {
              type: 'text',
              text: `This is a golf scorecard. It may be rotated sideways or at an angle. Your job is to extract the PAR and HANDICAP (stroke index) for holes 1 through 18 in the correct order.

CRITICAL INSTRUCTIONS:
1. First find the row or column labeled "HOLE" or containing the numbers 1, 2, 3...18 in sequence. Use this as your anchor to identify hole order.
2. The card may be rotated 90 degrees — holes may run top-to-bottom instead of left-to-right. Always read them in numerical order 1-18 regardless of orientation.
3. Find the PAR row/column — values will only be 3, 4, or 5.
4. Find the HANDICAP or HCP or STROKE INDEX row/column — values will be unique integers 1-18.
5. If there are multiple tee rows (Blue, White, Gold, Men's, Women's), use the MEN'S HDCP row for handicap.
6. The scorecard is typically split into FRONT 9 (holes 1-9) and BACK 9 (holes 10-18). Make sure you capture all 18 holes.

Return ONLY a valid JSON object in this exact format, no other text, no markdown:
{
  "holes": [
    { "par": 4, "hcp": 7 },
    { "par": 5, "hcp": 3 },
    { "par": 3, "hcp": 17 }
  ]
}

The array must have exactly 18 objects in order from hole 1 to hole 18. Return ONLY the JSON.`
            }
          ],
        }
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    let parsed: { holes: { par: number; hcp: number }[] }
    try {
      const cleaned = responseText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Could not parse scorecard. Try a clearer image — lay the card flat, shoot straight down, good lighting.'
      }, { status: 422 })
    }

    if (!parsed.holes || parsed.holes.length !== 18) {
      return NextResponse.json({
        success: false,
        error: `Expected 18 holes, got ${parsed.holes?.length ?? 0}. Try shooting the card straight-on with both the front 9 and back 9 visible.`
      }, { status: 422 })
    }

    // Sanitize values
    for (let i = 0; i < 18; i++) {
      const h = parsed.holes[i]
      if (![3, 4, 5].includes(h.par)) parsed.holes[i].par = 4
      if (!h.hcp || h.hcp < 1 || h.hcp > 18) parsed.holes[i].hcp = i + 1
    }

    // Fix duplicate HCPs — reassign sequentially as fallback
    const hcpValues = parsed.holes.map(h => h.hcp)
    if (new Set(hcpValues).size !== 18) {
      parsed.holes = parsed.holes.map((h, i) => ({ ...h, hcp: i + 1 }))
    }

    return NextResponse.json({ success: true, holes: parsed.holes })

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

    return NextResponse.json({
      success: false,
      error: error?.message || 'Server error during scan.'
    }, { status: 500 })
  }
}