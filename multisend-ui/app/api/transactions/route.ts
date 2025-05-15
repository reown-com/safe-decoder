import { NextResponse } from 'next/server';
import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
// Fetch data starting from row 7 on the correct sheet
const RANGE = 'Transactions List!A7:Z'; // Using the correct sheet name

// Helper to convert sheet data (2D array) to JSON array of objects using fixed indices
function sheetDataToJson(values: any[][]): Record<string, any>[] {
  if (!values || values.length < 2) {
    // Need at least one header row (values[0]) and one data row
    return [];
  }
  // Headers are in values[0], but we map data using fixed indices based on user input
  console.log("Using Headers (from Row 7):", values[0]); // Log the actual headers for reference
  
  const data = [];

  // Start loop from 1 (first data row, which is Row 8 in the sheet)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    
    // Skip if row is likely empty (e.g., first cell is empty)
    if (!row || row[0] === undefined || row[0] === '') continue;

    const nonceStr = row[7] !== undefined ? String(row[7]) : ''; // Nonce is at index 7
    const nonce = parseInt(nonceStr, 10);
    
    const rowObject: Record<string, any> = {
      walletName: row[0] !== undefined ? String(row[0]) : 'N/A', // Index 0
      walletAddress: row[1] !== undefined ? String(row[1]) : 'N/A', // Index 1
      isSafe: row[2] !== undefined ? String(row[2]) : 'N/A',      // Index 2 ('Safe?')
      network: row[3] !== undefined ? String(row[3]) : 'N/A',      // Index 3
      date: row[4] !== undefined ? String(row[4]) : 'N/A',          // Index 4
      currency: row[5] !== undefined ? String(row[5]) : 'N/A',    // Index 5 - Currency
      amount: row[6] !== undefined ? String(row[6]) : 'N/A',      // Index 6 - Transaction Amount
      nonce: !isNaN(nonce) ? nonce : undefined,                  // Index 7 (parsed)
      recipientAddress: row[8] !== undefined ? String(row[8]) : 'N/A', // Index 8 - Recipient 
    };
    data.push(rowObject);
  }
  return data;
}

export async function GET() {
  try {
    const credentialsJson = process.env.GOOGLE_SHEETS_SERVICE_ACCOUNT_CREDENTIALS_JSON;
    if (!credentialsJson) {
      throw new Error('Google Sheets service account credentials JSON not found in environment variables.');
    }
    if (!SPREADSHEET_ID) {
      throw new Error('SPREADSHEET_ID not found in environment variables.');
    }

    const credentials = JSON.parse(credentialsJson);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], // Read-only access
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: RANGE,
    });

    const values = response.data.values;
    // --- DEBUGGING START ---
    console.log("Raw values from Google Sheets:", JSON.stringify(values, null, 2)); 
    // --- DEBUGGING END ---
    
    const jsonData = sheetDataToJson(values || []);

    // --- DEBUGGING START ---
    console.log("JSON data being sent to frontend:", JSON.stringify(jsonData, null, 2));
    // --- DEBUGGING END ---

    return NextResponse.json(jsonData, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error('Error fetching data from Google Sheets API:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
    // Provide more specific error messages if possible
    if (error instanceof Error && 'response' in error && (error as any).response?.status === 403) {
      return NextResponse.json({ error: 'Permission denied. Ensure the service account email has viewer access to the sheet.' }, { status: 403, headers });
    }
     if (error instanceof Error && 'response' in error && (error as any).response?.status === 404) {
      return NextResponse.json({ error: 'Sheet or range not found. Verify SPREADSHEET_ID and RANGE.' }, { status: 404, headers });
    }
    return NextResponse.json({ error: `Google Sheets API Error: ${message}` }, { status: 500, headers });
  }
} 