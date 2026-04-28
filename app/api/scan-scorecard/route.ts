import { NextResponse } from 'next/server';

// FORCE VERCEL TO TREAT THIS AS A LIVE FUNCTION
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: "No image received." }, { status: 400 });
    }

    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key missing in Vercel." }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "You are a golf data extraction tool. Read this scorecard and extract the Par and Handicap (HCP / Stroke Index) for holes 1 through 18. Return ONLY a valid JSON array of exactly 18 objects. Use this exact format: [{\"hole\": 1, \"par\": 4, \"hcp\": 5}]. Do not include markdown formatting, backticks, or any other text." },
            { inline_data: { mime_type: mimeType, data: base64Data } }
          ]
        }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       return NextResponse.json({ success: false, error: data.error?.message || "Google API Refusal" }, { status: response.status });
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    return NextResponse.json({ success: true, holes: JSON.parse(rawContent) });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}