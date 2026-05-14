import { type NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';

const BACKEND_URL = process.env['BACKEND_URL'] ?? 'http://localhost:3101';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.accessToken) {
    return new NextResponse(null, { status: 401 });
  }

  const res = await fetch(
    `${BACKEND_URL}/api/reports/validation/${params.id}/pdf`,
    { headers: { Authorization: `Bearer ${session.accessToken}` } },
  );

  if (!res.ok) {
    return new NextResponse(null, { status: res.status });
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="rapport.pdf"',
    },
  });
}
