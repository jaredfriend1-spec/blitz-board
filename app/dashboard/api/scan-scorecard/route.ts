import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ success: false, error: "No image was received by the server." }, { status: 400 });
    }

    const base64Data = imageBase64.split(',')[1];
    const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API Key is missing from the server environment." }, { status: 500 });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "You are a golf data extraction tool. Read this scorecard and extract the Par and Handicap (HCP / Stroke Index) for holes 1 through 18. Return ONLY a valid JSON array of exactly 18 objects. Use this exact format: [{\"hole\": 1, \"par\": 4, \"hcp\": 5}]. Do not include markdown formatting, backticks, or any other text." },
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
    
    // If Google rejects the request, send their exact error back to the frontend
    if (!response.ok) {
       console.error("Gemini API Error Response:", data);
       return NextResponse.json({ success: false, error: `Google API Error: ${data.error?.message || 'Unknown'}` }, { status: response.status });
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    const parsedHoles = JSON.parse(rawContent);
    
    return NextResponse.json({ success: true, holes: parsedHoles });

  } catch (error: any) {
    console.error("Vision API Crash:", error);
    return NextResponse.json({ success: false, error: `Server crashed: ${error.message}` }, { status: 500 });
  }
}