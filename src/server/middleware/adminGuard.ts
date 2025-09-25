import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from './authz';

// Wrap a route handler to enforce admin. If not available, returns 403.
export function withAdmin(handler: (req: NextRequest, ctx?: any) => Promise<NextResponse> | NextResponse) {
  return async (req: NextRequest, ctx?: any) => {
    try {
      await requireAdmin(); // assume this throws if not admin
      return handler(req, ctx);
    } catch (e:any) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  };
}