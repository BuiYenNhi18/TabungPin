import type { NextRequest } from 'next/server';
import { fromError, ok } from '@/server/lib/http';
import { addPayment, getDashboardData } from '@/server/service/savings.service';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId') ?? '';
    const data = await getDashboardData(userId);
    return ok(data);
  } catch (err) {
    return fromError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      userId: string;
      amountUsdc: string;
      merchant: string;
    };
    const payment = await addPayment({
      userId: body.userId,
      amountUsdc: BigInt(body.amountUsdc),
      merchant: body.merchant,
    });
    return ok(payment);
  } catch (err) {
    return fromError(err);
  }
}
