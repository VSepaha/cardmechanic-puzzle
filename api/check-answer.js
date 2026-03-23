export default function handler(req, res) {
  // Allow a quick browser test
  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      message: 'check-answer endpoint is live'
    });
  }

  // Only allow POST for answer checking
  if (req.method !== 'POST') {
    return res.status(405).json({ correct: false, error: 'Method not allowed' });
  }

  const body = req.body || {};
  const answer = typeof body.answer === 'string' ? body.answer : '';
  const stage = body.stage;

  const normalized = answer.toLowerCase().trim();

  if (stage === 1) {
    if (
      normalized === 'ace of spades' ||
      normalized === 'aceofspades'
    ) {
      return res.status(200).json({ correct: true });
    }
  }

  if (stage === 2) {
    if (normalized === 'trl') {
      return res.status(200).json({ correct: true });
    }
  }

  if (stage === 3) {
    if (normalized === 'con') {
      return res.status(200).json({ correct: true });
    }
  }

  return res.status(200).json({ correct: false });
}
