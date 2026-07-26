import type { NextRequest } from 'next/server';
import { fromError, ok } from '@/server/lib/http';
import { confirmDeposit } from '@/server/service/savings.service';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { tallyId: string };
    const result = await confirmDeposit(body.tallyId);
    return ok(result);
  } catch (err) {
    return fromError(err);
  }
}
