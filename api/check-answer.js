const ALLOWED_ORIGINS = new Set([
  'https://cardmechanic.shop',
  'https://www.cardmechanic.shop',
]);

const SECRET = process.env.PUZZLE_SECRET || 'change-this-secret';

function buildCorsHeaders(origin) {
  const allowedOrigin = ALLOWED_ORIGINS.has(origin)
    ? origin
    : 'https://cardmechanic.shop';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function signToken(payload) {
  const json = JSON.stringify(payload);
  const base64 = Buffer.from(json).toString('base64url');
  const sig = Buffer.from(base64 + SECRET).toString('base64url');
  return `${base64}.${sig}`;
}

function verifyToken(token) {
  try {
    const [base64, sig] = token.split('.');
    const expected = Buffer.from(base64 + SECRET).toString('base64url');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(base64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
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
    const action = body.action;

    if (action === 'check-answer') {
      const answer = typeof body.answer === 'string' ? body.answer : '';
      const stage = body.stage;
      const normalized = answer.toLowerCase().trim();

      if (stage === 1) {
        if (normalized === 'ace of spades' || normalized === 'aceofspades') {
          return json({
            correct: true,
            fragmentTitle: 'Fragment I recovered',
            fragmentValue: 'Value = 1',
            nextStage: 2,
            accessToken: signToken({ unlockedStage: 2 }),
          }, origin);
        }
      }

      if (stage === 2) {
        if (normalized === 'trl') {
          return json({
            correct: true,
            fragmentTitle: 'Fragment II recovered',
            fragmentValue: 'Keyword = TRL',
            nextStage: 3,
            accessToken: signToken({ unlockedStage: 3 }),
          }, origin);
        }
      }

      if (stage === 3) {
        if (normalized === 'con') {
          return json({
            correct: true,
            fragmentTitle: 'Fragment III recovered',
            fragmentValue: 'CON',
            nextStage: 4,
            accessToken: signToken({ unlockedStage: 4 }),
          }, origin);
        }
      }

      return json({ correct: false }, origin);
    }

    if (action === 'authorize-stage') {
      const token = typeof body.token === 'string' ? body.token : '';
      const stage = body.stage;
      const payload = verifyToken(token);

      if (!payload || payload.unlockedStage !== stage) {
        return json({ authorized: false }, origin);
      }

      return json({ authorized: true }, origin);
    }

    return json({ error: 'Unknown action' }, origin, 400);
  } catch {
    return json({ error: 'Invalid request' }, origin, 400);
  }
}

function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(origin),
    },
  });
}
