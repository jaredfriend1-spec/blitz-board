import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { imageBase64 } = await request.json()

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: 'No image provided' }, { status: 400 })
    }

    // Strip the data:image/jpeg;base64, prefix if present
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
              text: `This is a golf scorecard image. Extract the par value and handicap index (stroke index) for all 18 holes.

Return ONLY a valid JSON object in this exact format, no other text:
{
  "holes": [
    { "par": 4, "hcp": 7 },
    { "par": 5, "hcp": 3 },
    ...
  ]
}

Rules:
- The array must have exactly 18 objects, one per hole in order (hole 1 through hole 18)
- par must be 3, 4, or 5
- hcp (handicap index / stroke index) must be a unique integer from 1 to 18
- If you cannot read a value clearly, make a reasonable guess based on typical golf course layouts
- Return ONLY the JSON, no markdown, no explanation`
            }
          ],
        }
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse the JSON response
    let parsed: { holes: { par: number; hcp: number }[] }
    try {
      // Strip any accidental markdown fences
      const cleaned = responseText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(cleaned)
    } catch {
      return NextResponse.json({ 
        success: false, 
        error: 'Could not parse scorecard. Try a clearer image with the scorecard facing the camera straight-on.' 
      }, { status: 422 })
    }

    // Validate structure
    if (!parsed.holes || parsed.holes.length !== 18) {
      return NextResponse.json({ 
        success: false, 
        error: `Expected 18 holes, got ${parsed.holes?.length ?? 0}. Try a clearer image.` 
      }, { status: 422 })
    }

    // Validate each hole
    for (let i = 0; i < 18; i++) {
      const h = parsed.holes[i]
      if (![3, 4, 5].includes(h.par)) parsed.holes[i].par = 4
      if (!h.hcp || h.hcp < 1 || h.hcp > 18) parsed.holes[i].hcp = i + 1
    }

    // Check HCP uniqueness — if dupes exist, reassign sequentially
    const hcpValues = parsed.holes.map(h => h.hcp)
    const unique = new Set(hcpValues).size === 18
    if (!unique) {
      // Fallback: assign 1-18 in order if the scan produced duplicates
      parsed.holes = parsed.holes.map((h, i) => ({ ...h, hcp: i + 1 }))
    }

    return NextResponse.json({ success: true, holes: parsed.holes })

  } catch (error: any) {
    console.error('Scan scorecard error:', error)
    
    // Handle Anthropic API key missing
    if (error?.status === 401 || error?.message?.includes('API key')) {
      return NextResponse.json({ 
        success: false, 
        error: 'API key not configured. Add ANTHROPIC_API_KEY to your Vercel environment variables.' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: false, 
      error: error?.message || 'Server error during scan.' 
    }, { status: 500 })
  }
}