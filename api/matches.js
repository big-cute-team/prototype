const { requireToken } = require('./_lib/auth');
const { recordAudit } = require('./_lib/audit');
const { handleError, json, parseJsonBody } = require('./_lib/http');
const { eq, insert, patch, select, supabaseFetch } = require('./_lib/supabase');

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

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);

      // 승부예측 투표 (공개, 토큰 불필요)
      if (body.action === 'vote') {
        if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
        if (!['for', 'against'].includes(body.choice)) {
          throw Object.assign(new Error("choice must be 'for' or 'against'"), { statusCode: 400 });
        }
        await supabaseFetch('rpc/increment_match_vote', {
          method: 'POST',
          body: { p_match_id: body.id, p_choice: body.choice },
        });
        const rows = await select('matches', `select=prediction_for_count,prediction_against_count&${eq('id', body.id)}&limit=1`);
        json(res, 200, { ok: true, counts: rows[0] || null });
        return;
      }

      // 경기 생성 (어드민)
      requireToken(req, 'ADMIN_TOKEN', 'admin');
      const list = Array.isArray(body) ? body : Array.isArray(body.matches) ? body.matches : [body];
      const rows = list.map(normalizeMatch);
      const inserted = await insert('matches', rows);
      await recordAudit('admin_matches_create', { count: inserted.length, actor: 'admin-ui' });
      json(res, 200, { ok: true, matches: inserted });
      return;
    }

    // 경기 부분 수정 (어드민) — 예측 설정 / 스코어 / 상태
    if (req.method === 'PATCH') {
      requireToken(req, 'ADMIN_TOKEN', 'admin');
      const body = await parseJsonBody(req);
      const id = body.id || req.query?.id;
      if (!id) throw Object.assign(new Error('id is required'), { statusCode: 400 });

      const updates = { updated_at: new Date().toISOString() };
      if ('prediction_question' in body) updates.prediction_question = body.prediction_question || null;
      if ('prediction_for_label' in body) updates.prediction_for_label = body.prediction_for_label || null;
      if ('prediction_against_label' in body) updates.prediction_against_label = body.prediction_against_label || null;
      if ('is_featured' in body) updates.is_featured = Boolean(body.is_featured);
      if ('competition' in body) updates.competition = body.competition || null;
      if ('group_name' in body) updates.group_name = body.group_name || null;

      const hasScore = body.home_score !== undefined && body.home_score !== null && body.home_score !== ''
        && body.away_score !== undefined && body.away_score !== null && body.away_score !== '';
      if ('home_score' in body) updates.home_score = hasScore ? Number(body.home_score) : null;
      if ('away_score' in body) updates.away_score = hasScore ? Number(body.away_score) : null;
      if (body.status && ['scheduled', 'live', 'finished'].includes(body.status)) {
        updates.status = body.status;
      } else if (hasScore) {
        updates.status = 'finished';
      }

      const updated = await patch('matches', eq('id', id), updates);
      await recordAudit('admin_matches_update', { match_id: id, actor: 'admin-ui' });
      json(res, 200, { ok: true, match: updated[0] });
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
