import { NextRequest, NextResponse } from 'next/server';

const OPENCHAIN_LOOKUP_URL = 'https://api.openchain.xyz/signature-database/v1/lookup';
const SELECTOR_REGEX = /^0x[0-9a-fA-F]{8}$/;

export async function GET(request: NextRequest) {
  const selector = request.nextUrl.searchParams.get('function') ?? request.nextUrl.searchParams.get('selector');

  if (!selector || !SELECTOR_REGEX.test(selector)) {
    return NextResponse.json({ error: 'Invalid selector' }, { status: 400 });
  }

  try {
    const url = new URL(OPENCHAIN_LOOKUP_URL);
    url.searchParams.set('function', selector.toLowerCase());

    const response = await fetch(url.toString(), {
      headers: {
        accept: 'application/json'
      }
    });

    if (!response.ok) {
      const body = await response.text();
      return NextResponse.json(
        {
          error: 'OpenChain lookup failed',
          status: response.status,
          details: body
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('OpenChain proxy error:', error);
    return NextResponse.json({ error: 'OpenChain proxy error' }, { status: 502 });
  }
}
