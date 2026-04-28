import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    // The browser sends a prefix like "data:image/jpeg;base64,...". 
    // Gemini just wants the raw base64 string, so we split it off.
    const base64Data = imageBase64.split(',')[1];
    
    // Extract the mime type dynamically (e.g., image/jpeg or image/png)
    const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';')) || 'image/jpeg';

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "API key missing." }, { status: 500 });
    }

    // Ping the free Gemini 1.5 Flash model
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
          responseMimeType: "application/json" // Forces Gemini to return strict JSON
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
       console.error("Gemini API Error:", data);
       throw new Error("API responded with an error");
    }

    const rawContent = data.candidates[0].content.parts[0].text;
    const parsedHoles = JSON.parse(rawContent);
    
    return NextResponse.json({ success: true, holes: parsedHoles });

  } catch (error) {
    console.error("Vision API Error:", error);
    return NextResponse.json({ success: false, error: "Failed to read scorecard." }, { status: 500 });
  }
}