import type { NextRequest } from 'next/server';
import { fromError, ok } from '@/server/lib/http';
import { buildBatchXdr, getVaultPosition } from '@/server/service/savings.service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') ?? '';
    const vault = await getVaultPosition(userId);
    return ok(vault);
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { userId: string };
    const batchData = await buildBatchXdr(body.userId);
    return ok(batchData);
  } catch (err) {
    return fromError(err);
  }
}
