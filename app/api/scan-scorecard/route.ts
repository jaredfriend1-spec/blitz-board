import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: "No image received." }, { status: 400 });
    }

    // Clean up the base64 string for Google
    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key missing in Vercel settings." }, { status: 500 });
    }

    // Using stable v1 endpoint and Gemini 2.0 Flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Extract the Par and Handicap (HCP / Stroke Index) for holes 1-18 from this golf scorecard. Return ONLY a JSON array of 18 objects like this: [{\"hole\": 1, \"par\": 4, \"hcp\": 5}]. Ensure all 18 holes are present." },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          responseMimeType: "application/json" 
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       return NextResponse.json({ 
         success: false, 
         error: data.error?.message || "Google API refused the request." 
       }, { status: response.status });
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    const parsedHoles = JSON.parse(rawContent);
    
    return NextResponse.json({ success: true, holes: parsedHoles });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}