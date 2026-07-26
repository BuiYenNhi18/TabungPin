import type { NextRequest } from 'next/server';
import { env } from '@/server/config/env';

/**
 * SSE proxy route: manual fetch + ReadableStream (pitfall #9)
 * Client subscribes, we forward Horizon payment events.
 */
export async function GET(req: NextRequest) {
  const account = req.nextUrl.searchParams.get('account') ?? '';
  const HORIZON_URL = env.STELLAR_HORIZON_URL;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial hello
      controller.enqueue(encoder.encode('data: {"type":"connected"}\n\n'));

      if (!account) {
        controller.enqueue(encoder.encode('data: {"type":"no_account"}\n\n'));
        controller.close();
        return;
      }

      try {
        // Use manual fetch + ReadableStream (NOT sdk.stream())
        const horizonRes = await fetch(
          `${HORIZON_URL}/accounts/${account}/payments?cursor=now&limit=10`,
          {
            headers: { Accept: 'text/event-stream' },
            signal: req.signal,
          },
        );

        if (!horizonRes.ok || !horizonRes.body) {
          controller.enqueue(
            encoder.encode(`data: {"type":"error","message":"Horizon unavailable"}\n\n`),
          );
          controller.close();
          return;
        }

        const reader = horizonRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split('\n\n');
          buffer = chunks.pop() ?? '';

          for (const chunk of chunks) {
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== 'hello') {
                  try {
                    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ type: 'payment', ...parsed })}\n\n`),
                    );
                  } catch {
                    // skip
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        if (!req.signal.aborted) {
          controller.enqueue(encoder.encode(`data: {"type":"error","message":"Stream ended"}\n\n`));
        }
      } finally {
        controller.close();
      }
    },

    cancel() {
      // cleanup on client disconnect
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
