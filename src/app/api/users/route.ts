import { fromError, ok } from '@/server/lib/http';
import { listUsers } from '@/server/service/savings.service';

export async function GET() {
  try {
    const users = await listUsers();
    return ok(users);
  } catch (err) {
    return fromError(err);
  }
}
