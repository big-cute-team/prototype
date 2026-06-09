const { requireToken } = require('./_lib/auth');
const { recordAudit } = require('./_lib/audit');
const { handleError, json, parseJsonBody } = require('./_lib/http');
const { insert, select, supabaseFetch } = require('./_lib/supabase');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const STATUSES = ['scheduled', 'live', 'finished'];
const TARGET_TEAM_CODES = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];

// KST 기준 오늘/이번주(월~일) UTC 경계 계산
function kstRange(range) {
  const nowKst = new Date(Date.now() + KST_OFFSET_MS);
  const y = nowKst.getUTCFullYear();
  const m = nowKst.getUTCMonth();
  const d = nowKst.getUTCDate();
  const dow = nowKst.getUTCDay(); // 0=일

  const todayStartUtc = new Date(Date.UTC(y, m, d) - KST_OFFSET_MS);

  if (range === 'today') {
    return { from: todayStartUtc, to: new Date(todayStartUtc.getTime() + 24 * 60 * 60 * 1000) };
  }
  if (range === 'week') {
    const daysFromMonday = dow === 0 ? 6 : dow - 1;
    const weekStartKst = new Date(Date.UTC(y, m, d - daysFromMonday) - KST_OFFSET_MS);
    return { from: weekStartKst, to: new Date(weekStartKst.getTime() + 7 * 24 * 60 * 60 * 1000) };
  }
  return null; // all
}

function normalizeMatch(m) {
  if (!m.kickoff_at) throw Object.assign(new Error('kickoff_at is required'), { statusCode: 400 });
  if (!m.home_team || !m.away_team) throw Object.assign(new Error('home_team and away_team are required'), { statusCode: 400 });

  const status = STATUSES.includes(m.status) ? m.status : 'scheduled';
  const teamTags = Array.isArray(m.team_tags)
    ? m.team_tags.filter(t => TARGET_TEAM_CODES.includes(String(t).toUpperCase())).map(t => String(t).toUpperCase())
    : [];
  const hasScore = m.home_score !== undefined && m.home_score !== null && m.home_score !== ''
    && m.away_score !== undefined && m.away_score !== null && m.away_score !== '';

  return {
    competition: m.competition || null,
    kickoff_at: new Date(m.kickoff_at).toISOString(),
    home_team: String(m.home_team).trim(),
    away_team: String(m.away_team).trim(),
    home_flag: m.home_flag || null,
    away_flag: m.away_flag || null,
    group_name: m.group_name || null,
    home_score: hasScore ? Number(m.home_score) : null,
    away_score: hasScore ? Number(m.away_score) : null,
    status: hasScore && status === 'scheduled' ? 'finished' : status,
    team_tags: teamTags,
    is_featured: Boolean(m.is_featured),
  };
}

module.exports = async function handler(req, res) {
  try {
    // 공개 조회 (인증 불필요)
    if (req.method === 'GET') {
      const range = req.query?.range || 'week';
      let query = 'select=*&order=kickoff_at.asc';
      const bounds = kstRange(range);
      if (bounds) {
        query += `&kickoff_at=gte.${encodeURIComponent(bounds.from.toISOString())}`;
        query += `&kickoff_at=lt.${encodeURIComponent(bounds.to.toISOString())}`;
      }
      const matches = await select('matches', query);
      json(res, 200, { matches });
      return;
    }

    // 쓰기 작업은 어드민 토큰 필요
    if (req.method === 'POST') {
      requireToken(req, 'ADMIN_TOKEN', 'admin');
      const body = await parseJsonBody(req);
      const list = Array.isArray(body) ? body : Array.isArray(body.matches) ? body.matches : [body];
      const rows = list.map(normalizeMatch);
      const inserted = await insert('matches', rows);
      await recordAudit('admin_matches_create', { count: inserted.length, actor: 'admin-ui' });
      json(res, 200, { ok: true, matches: inserted });
      return;
    }

    if (req.method === 'DELETE') {
      requireToken(req, 'ADMIN_TOKEN', 'admin');
      const id = req.query?.id;
      if (!id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
      await supabaseFetch('matches', { method: 'DELETE', query: `id=eq.${encodeURIComponent(id)}` });
      await recordAudit('admin_matches_delete', { match_id: id, actor: 'admin-ui' });
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    handleError(res, error);
  }
};
