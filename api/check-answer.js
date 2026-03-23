export default function handler(req, res) {
  const { answer, stage } = req.body;

  const normalized = answer.toLowerCase().trim();

  if (stage === 1) {
    if (
      normalized === "ace of spades" ||
      normalized === "aceofspades"
    ) {
      return res.status(200).json({ correct: true });
    }
  }

  if (stage === 2) {
    if (normalized === "trl") {
      return res.status(200).json({ correct: true });
    }
  }

  if (stage === 3) {
    if (normalized === "con") {
      return res.status(200).json({ correct: true });
    }
  }

  return res.status(200).json({ correct: false });
}
