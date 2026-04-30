import crypto from 'crypto';
import { google } from 'googleapis';

const ALLOWED_ORIGINS = new Set([
  'https://cardmechanic.shop',
  'https://www.cardmechanic.shop',
]);

const SECRET = process.env.PUZZLE_SECRET;
const STAGE_1_ANSWERS = process.env.PUZZLE_ANSWER_STAGE_1;
const STAGE_2_ANSWERS = process.env.PUZZLE_ANSWER_STAGE_2;
const STAGE_3_ANSWERS = process.env.PUZZLE_ANSWER_STAGE_3;
const FINAL_ANSWERS = process.env.PUZZLE_FINAL_ANSWER;

const GOOGLE_CLIENT_EMAIL = process.env.GOOGLE_CLIENT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

const DISCOUNT_CODE = process.env.PUZZLE_DISCOUNT_CODE || 'MECHANIC40';

if (!SECRET) throw new Error('PUZZLE_SECRET is not set');
if (!STAGE_1_ANSWERS) throw new Error('PUZZLE_ANSWER_STAGE_1 is not set');
if (!STAGE_2_ANSWERS) throw new Error('PUZZLE_ANSWER_STAGE_2 is not set');
if (!STAGE_3_ANSWERS) throw new Error('PUZZLE_ANSWER_STAGE_3 is not set');
if (!FINAL_ANSWERS) throw new Error('PUZZLE_FINAL_ANSWER is not set');

if (!GOOGLE_CLIENT_EMAIL) throw new Error('GOOGLE_CLIENT_EMAIL is not set');
if (!GOOGLE_PRIVATE_KEY) throw new Error('GOOGLE_PRIVATE_KEY is not set');
if (!GOOGLE_SHEET_ID) throw new Error('GOOGLE_SHEET_ID is not set');

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

function json(data, origin, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...buildCorsHeaders(origin),
    },
  });
}

function signToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET)
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifyToken(token) {
  try {
    const [encodedPayload, signature] = token.split('.');
    if (!encodedPayload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', SECRET)
      .update(encodedPayload)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    return JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8')
    );
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,!?]/g, '');
}

function parseAnswers(raw) {
  return new Set(
    String(raw)
      .split('|')
      .map(v => normalizeText(v))
      .filter(Boolean)
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

async function getSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
}

async function getExistingClaims(sheets) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: 'A:G',
  });

  const rows = response.data.values || [];
  if (rows.length <= 1) return [];

  return rows.slice(1).map(row => ({
    timestamp: row[0] || '',
    name: row[1] || '',
    email: row[2] || '',
    placement: row[3] || '',
    rewardType: row[4] || '',
    tokenHash: row[5] || '',
    claimStatus: row[6] || '',
  }));
}

function getRewardForPlacement(placement) {
  if (placement === 1) {
    return {
      rewardType: 'cash_100',
      claimMessage:
        'You were the FIRST to solve the puzzle! You have won the $100 cash prize!! You will be contacted via email within 48 hours.',
    };
  }

  if (placement === 2) {
    return {
      rewardType: 'four_beta_decks',
      claimMessage:
        'You were the SECOND to solve the puzzle! You have won 4 CANIS LUPUS Beta Edition decks!! You will be contacted via email within 48 hours.',
    };
  }

  return {
    rewardType: 'discount_40',
    discountCode: DISCOUNT_CODE,
    claimMessage: `You solved the puzzle! Your reward is 40% off all CANIS LUPUS decks. Code: ${DISCOUNT_CODE}`,
  };
}

const stage1Answers = parseAnswers(STAGE_1_ANSWERS);
const stage2Answers = parseAnswers(STAGE_2_ANSWERS);
const stage3Answers = parseAnswers(STAGE_3_ANSWERS);
const finalAnswers = parseAnswers(FINAL_ANSWERS);

export function GET(request) {
  const origin = request.headers.get('origin') || 'https://cardmechanic.shop';

  return json(
    {
      ok: true,
      message: 'check-answer endpoint is live',
    },
    origin
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
    const action = body.action;

    if (action === 'check-answer') {
      const answer = normalizeText(body.answer);
      const stage = Number(body.stage);

      if (stage === 1) {
        if (stage1Answers.has(answer)) {
          return json(
            {
              correct: true,
              fragmentTitle: 'Fragment I recovered',
              fragmentValue: 'Value = 1',
              nextStage: 2,
              accessToken: signToken({
                unlockedStage: 2,
                issuedAt: Date.now(),
              }),
            },
            origin
          );
        }

        return json({ correct: false }, origin);
      }

      if (stage === 2) {
        if (stage2Answers.has(answer)) {
          return json(
            {
              correct: true,
              fragmentTitle: 'Fragment II recovered',
              fragmentValue: 'Keyword = TRL',
              nextStage: 3,
              accessToken: signToken({
                unlockedStage: 3,
                issuedAt: Date.now(),
              }),
            },
            origin
          );
        }

        return json({ correct: false }, origin);
      }

      if (stage === 3) {
        if (stage3Answers.has(answer)) {
          return json(
            {
              correct: true,
              fragmentTitle: 'Fragment III recovered',
              fragmentValue: 'CON',
              nextStage: 4,
              accessToken: signToken({
                unlockedStage: 4,
                issuedAt: Date.now(),
              }),
            },
            origin
          );
        }

        return json({ correct: false }, origin);
      }

      return json({ correct: false, error: 'Invalid stage' }, origin, 400);
    }

    if (action === 'authorize-stage') {
      const token = String(body.token || '');
      const stage = Number(body.stage);

      const payload = verifyToken(token);

      if (!payload) return json({ authorized: false }, origin);
      if (payload.unlockedStage !== stage) return json({ authorized: false }, origin);

      return json({ authorized: true }, origin);
    }

    if (action === 'submit-final-answer') {
      const token = String(body.token || '');
      const answer = normalizeText(body.answer);

      const payload = verifyToken(token);

      if (!payload || payload.unlockedStage !== 4) {
        return json(
          {
            correct: false,
            error: 'Unauthorized',
          },
          origin,
          403
        );
      }

      if (!finalAnswers.has(answer)) {
        return json({ correct: false }, origin);
      }

      return json(
        {
          correct: true,
          claimToken: signToken({
            unlockedStage: 5,
            issuedAt: Date.now(),
          }),
        },
        origin
      );
    }

    if (action === 'claim-reward') {
      const token = String(body.token || '');
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim();

      const payload = verifyToken(token);

      if (!payload || payload.unlockedStage !== 5) {
        return json(
          {
            claimed: false,
            error: 'Unauthorized',
          },
          origin,
          403
        );
      }

      if (!name || !isValidEmail(email)) {
        return json(
          {
            claimed: false,
            error: 'Please provide a valid name and email.',
          },
          origin,
          400
        );
      }

      const tokenHash = hashToken(token);
      const sheets = await getSheetsClient();
      const existingClaims = await getExistingClaims(sheets);

      const duplicate = existingClaims.find(row => row.tokenHash === tokenHash);
      if (duplicate) {
        return json(
          {
            claimed: false,
            error: 'This reward has already been claimed.',
          },
          origin,
          409
        );
      }

      const placement = existingClaims.length + 1;
      const reward = getRewardForPlacement(placement);
      const timestamp = new Date().toISOString();

      await sheets.spreadsheets.values.append({
        spreadsheetId: GOOGLE_SHEET_ID,
        range: 'A:G',
        valueInputOption: 'RAW',
        requestBody: {
          values: [[
            timestamp,
            name,
            email,
            placement,
            reward.rewardType,
            tokenHash,
            'claimed',
          ]],
        },
      });

      return json(
        {
          claimed: true,
          placement,
          rewardType: reward.rewardType,
          discountCode: reward.discountCode || null,
          claimMessage: reward.claimMessage,
        },
        origin
      );
    }

    return json(
      {
        error: 'Unknown action',
      },
      origin,
      400
    );
  } catch (error) {
    console.error('API error:', error);
    return json(
      {
        error: 'Invalid request',
      },
      origin,
      400
    );
  }
}
