import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!imageBase64 || !apiKey) {
      return NextResponse.json({ success: false, error: "Missing Image or API Key" }, { status: 400 });
    }

    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) || 'image/jpeg';

    // PATH: Stable V1 endpoint / Model: Gemini 2.0 Flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Extract the Par and Handicap for holes 1-18 from this scorecard. IMPORTANT: Return ONLY a raw JSON array of 18 objects like this: [{\"hole\": 1, \"par\": 4, \"hcp\": 5}]. Do not include markdown, code blocks, or any other text." },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       return NextResponse.json({ 
         success: false, 
         error: `Google API: ${data.error?.message || "Check API connection."}` 
       }, { status: response.status });
    }

    let rawContent = data.candidates[0].content.parts[0].text;
    
    // --- JSON REPAIR LOGIC ---
    // This strips out any ```json ... ``` blocks if the AI accidentally adds them
    const sanitizedJson = rawContent.replace(/```json/g, '').replace(/```/g, '').replace(/[\n\r]/g, '').trim();
    
    try {
      const parsedHoles = JSON.parse(sanitizedJson);
      return NextResponse.json({ success: true, holes: parsedHoles });
    } catch (parseError) {
      console.error("JSON Parse Error:", sanitizedJson);
      return NextResponse.json({ success: false, error: "AI returned invalid format. Try a clearer photo." });
    }

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}