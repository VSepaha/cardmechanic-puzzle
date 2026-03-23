const ALLOWED_ORIGINS = new Set([
  'https://cardmechanic.shop',
  'https://www.cardmechanic.shop',
]);

function buildCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://cardmechanic.shop';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export function GET(request) {
  const origin = request.headers.get('origin') || 'https://cardmechanic.shop';
  return new Response(
    JSON.stringify({ ok: true, message: 'check-answer endpoint is live' }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...buildCorsHeaders(origin),
      },
    }
  );
}

export function OPTIONS(request) {
  const origin = request.headers.get('origin') || 'https://cardmechanic.shop';
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(origin),
  });
}

export async function POST(request) {
  const origin = request.headers.get('origin') || 'https://cardmechanic.shop';

  try {
    const body = await request.json();
    const answer = typeof body.answer === 'string' ? body.answer : '';
    const stage = body.stage;
    const normalized = answer.toLowerCase().trim();

    let correct = false;

    if (stage === 1) {
      correct =
        normalized === 'ace of spades' ||
        normalized === 'aceofspades';
    } else if (stage === 2) {
      correct = normalized === 'trl';
    } else if (stage === 3) {
      correct = normalized === 'con';
    }

    return new Response(JSON.stringify({ correct }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...buildCorsHeaders(origin),
      },
    });
  } catch {
    return new Response(JSON.stringify({ correct: false, error: 'Invalid request body' }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        ...buildCorsHeaders(origin),
      },
    });
  }
}
