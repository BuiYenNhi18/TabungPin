import { fromError, ok } from '@/server/lib/http';
import { seedDemoData } from '@/server/service/savings.service';

export async function POST() {
  try {
    const result = await seedDemoData();
    return ok(result);
  } catch (err) {
    return fromError(err);
  }
}
