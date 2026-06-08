const { handleError, json } = require('./_lib/http');
const { select } = require('./_lib/supabase');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// KST 기준 오늘/이번주(월~일) UTC 경계 계산
function kstRange(range) {
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const y = nowKst.getUTCFullYear();
  const m = nowKst.getUTCMonth();
  const d = nowKst.getUTCDate();
  const dow = nowKst.getUTCDay(); // 0=일

  // 오늘 KST 00:00 → UTC
  const todayStartUtc = new Date(Date.UTC(y, m, d) - KST_OFFSET_MS);

  if (range === 'today') {
    const end = new Date(todayStartUtc.getTime() + 24 * 60 * 60 * 1000);
    return { from: todayStartUtc, to: end };
  }

  if (range === 'week') {
    // 이번주 월요일 시작 (dow=0 일요일이면 -6)
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    const weekStartKst = new Date(Date.UTC(y, m, d - daysFromMonday) - KST_OFFSET_MS);
    const weekEnd = new Date(weekStartKst.getTime() + 7 * 24 * 60 * 60 * 1000);
    return { from: weekStartKst, to: weekEnd };
  }

  return null; // all
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }

    const range = req.query?.range || 'week';
    let query = 'select=*&order=kickoff_at.asc';
    const bounds = kstRange(range);
    if (bounds) {
      query += `&kickoff_at=gte.${encodeURIComponent(bounds.from.toISOString())}`;
      query += `&kickoff_at=lt.${encodeURIComponent(bounds.to.toISOString())}`;
    }

    const matches = await select('matches', query);
    json(res, 200, { matches });
  } catch (error) {
    handleError(res, error);
  }
};
