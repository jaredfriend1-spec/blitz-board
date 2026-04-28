import { NextResponse } from 'next/server';

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
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY is missing in Vercel." }, { status: 500 });
    }

    // STABLE v1 URL with the 'latest' alias for Flash
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Read this scorecard. Extract Par and Handicap for holes 1-18. Output ONLY a raw JSON array of 18 objects: [{\"hole\": 1, \"par\": 4, \"hcp\": 5}]. No markdown, no backticks, no extra text." },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }]
        // We omit generationConfig here to ensure the v1 endpoint accepts the request without field errors.
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       return NextResponse.json({ 
         success: false, 
         error: `Google API Error: ${data.error?.message || "Check your API key or model access."}` 
       }, { status: response.status });
    }

    // Get the text and strip any markdown backticks the AI might have added
    let rawContent = data.candidates[0].content.parts[0].text;
    const sanitizedJson = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsedHoles = JSON.parse(sanitizedJson);
    
    return NextResponse.json({ success: true, holes: parsedHoles });

  } catch (error: any) {
    console.error("Vision Error:", error);
    return NextResponse.json({ success: false, error: `Server Error: ${error.message}` }, { status: 500 });
  }
}