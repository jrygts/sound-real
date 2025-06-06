export const dynamic = 'force-dynamic';
import { cookies, headers } from 'next/headers';

export async function GET() {
  return Response.json({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SUPABASE_SITE_URL: process.env.SUPABASE_SITE_URL,
    hostHeader: headers().get('host'),
    cookiePreview: cookies().getAll().slice(0,2)
  });
} 