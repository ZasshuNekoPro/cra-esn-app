import { type NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3101';

export async function GET(
  _request: NextRequest,
  { params }: { params: { token: string } },
) {
  const res = await fetch(`${BACKEND_URL}/api/reports/validate/${params.token}`);

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const body: unknown = await request.json();

  const res = await fetch(`${BACKEND_URL}/api/reports/validate/${params.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
