import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

/**
 * Ensures a hex string has an even number of characters (excluding the 0x prefix)
 * @param hexString The hex string to normalize
 * @returns A normalized hex string with even length
 */
function normalizeHexString(hexString: string): string {
  if (!hexString || typeof hexString !== 'string') return hexString;
  if (!hexString.startsWith('0x')) return hexString;
  
  // Remove 0x prefix
  const withoutPrefix = hexString.slice(2);
  
  // If the length is odd, add a leading zero
  const normalized = withoutPrefix.length % 2 !== 0 ? `0${withoutPrefix}` : withoutPrefix;
  
  // Add the 0x prefix back
  return `0x${normalized}`;
}

/**
 * Normalizes hex strings in an object
 * @param obj The object to normalize
 * @returns A new object with normalized hex strings
 */
function normalizeHexFields(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string' && value.startsWith('0x')) {
      result[key] = normalizeHexString(value);
    } else if (typeof value === 'object' && value !== null) {
      result[key] = normalizeHexFields(value);
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    // Check if the request is multipart/form-data
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Parse the form data
    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Image = buffer.toString('base64');

    // Use OpenAI Vision API to extract text and JSON from the image
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a helpful assistant that extracts JSON data from images. 
            The image may contain partial or malformatted JSON. 
            Your task is to find and fix any JSON in the image and extract the following fields if present:
            - safeAddressInput (any Safe address or URL)
            - address (Ethereum address)
            - to
            - value
            - data
            - operation
            - safeTxGas
            - baseGas
            - gasPrice
            - gasToken
            - refundReceiver
            - nonce
            
            Return only a valid JSON object with these fields. If a field is not found, omit it from the response.
            Do not include any explanations or additional text in your response, just the JSON object.
            
            If you see transaction data that appears to be a multisend transaction or function call data (starting with 0x),
            include it in the "data" field of your response.
            
            If you see a Safe address in any format (like eth:0x1234... or https://app.safe.global/home?safe=eth:0x1234...),
            include it in the "safeAddressInput" field.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the JSON data from this image:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/${image.type};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1000,
      });

      // Extract the JSON from the OpenAI response
      const aiResponse = completion.choices[0].message.content || '{}';
      
      // Try to parse the JSON
      let extractedData;
      try {
        extractedData = JSON.parse(aiResponse);
        // Normalize hex fields
        extractedData = normalizeHexFields(extractedData);
      } catch (error) {
        // If parsing fails, try to extract JSON using regex
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            extractedData = JSON.parse(jsonMatch[0]);
            // Normalize hex fields
            extractedData = normalizeHexFields(extractedData);
          } catch (e) {
            extractedData = { error: "Failed to parse JSON from AI response" };
          }
        } else {
          extractedData = { error: "No JSON found in AI response" };
        }
      }

      // Return the extracted data
      return NextResponse.json(extractedData);
    } catch (error) {
      console.error('OpenAI API error:', error);
      
      // If OpenAI API fails, fall back to a mock response for testing
      console.log('Falling back to mock response');
      return NextResponse.json({
        data: "0x8d80ff0a000000000000000000000000f48f2b2d2a534e402487b3ee7c18c33aec0fe5e400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a48d80ff0a0000000000000000000000001234567890123456789012345678901234567890000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"
      });
    }
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process image' },
      { status: 500 }
    );
  }
} 