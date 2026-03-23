export function GET() {
  return Response.json({
    ok: true,
    message: 'check-answer endpoint is live',
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const answer = typeof body.answer === 'string' ? body.answer : '';
    const stage = body.stage;

    const normalized = answer.toLowerCase().trim();

    if (stage === 1) {
      if (
        normalized === 'ace of spades' ||
        normalized === 'aceofspades'
      ) {
        return Response.json({ correct: true });
      }
    }

    if (stage === 2) {
      if (normalized === 'trl') {
        return Response.json({ correct: true });
      }
    }

    if (stage === 3) {
      if (normalized === 'con') {
        return Response.json({ correct: true });
      }
    }

    return Response.json({ correct: false });
  } catch (error) {
    return Response.json(
      { correct: false, error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
