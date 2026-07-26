import { type NextRequest, NextResponse } from 'next/server';
import { fromError, ok } from '@/server/lib/http';
import { fetchRecentPayments } from '@/server/lib/stellar';

export async function GET(req: NextRequest) {
  try {
    const account = req.nextUrl.searchParams.get('account') ?? '';
    if (!account) {
      return ok([]);
    }
    const records = await fetchRecentPayments(account, 10);
    return ok(records);
  } catch (err) {
    return fromError(err);
  }
}
