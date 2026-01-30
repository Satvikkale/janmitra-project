export const runtime = 'nodejs';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function GET(req: NextRequest, { params }: any) {
const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
const accessToken = (token as any)?.accessToken as string | undefined;
if (!accessToken) return new Response('Unauthorized', { status: 401 });

const api = process.env.NEXT_PUBLIC_API_BASE!;
const r = await fetch(`${api}/v1/complaints/${params.id}/events`, {
  headers: { Authorization: `Bearer ${accessToken}` },
  cache: 'no-store',
});
return new Response(await r.text(), {
  status: r.status,
  headers: { 'Content-Type': 'application/json' },
});
}