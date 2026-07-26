import type { NextRequest } from 'next/server';
import { fromError, ok } from '@/server/lib/http';
import { buildBatchXdr, confirmDeposit, getCurrentTally } from '@/server/service/savings.service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') ?? '';
    const tally = await getCurrentTally(userId);
    return ok(tally);
  } catch (err) {
    return fromError(err);
  }
}
