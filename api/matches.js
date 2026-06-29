const { requireToken } = require('./_lib/auth');
const { handleError, json, parseJsonBody } = require('./_lib/http');
const { eq, insert, patch, select, supabaseFetch } = require('./_lib/supabase');

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const STATUSES = ['SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED'];

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

// 새 matches(match_id, home_team_text/away_team_text) → 프론트가 기대하는 구 형태(id, home_team/away_team)
function toLegacyMatch(m) {
  return {
    ...m,
    id: m.match_id,
    home_team: m.home_team_text,
    away_team: m.away_team_text,
    team_tags: [], // 새 스키마는 home/away_team_id FK 사용. 텍스트 경기엔 태그 없음
  };
}

function normalizeMatch(m) {
  if (!m.kickoff_at) throw Object.assign(new Error('kickoff_at is required'), { statusCode: 400 });
  if (!m.home_team || !m.away_team) throw Object.assign(new Error('home_team and away_team are required'), { statusCode: 400 });

  const inputStatus = String(m.status || '').toUpperCase();
  const status = STATUSES.includes(inputStatus) ? inputStatus : 'SCHEDULED';
  const hasScore = m.home_score !== undefined && m.home_score !== null && m.home_score !== ''
    && m.away_score !== undefined && m.away_score !== null && m.away_score !== '';

  return {
    competition: m.competition || null,
    kickoff_at: new Date(m.kickoff_at).toISOString(),
    home_team_text: String(m.home_team).trim(),
    away_team_text: String(m.away_team).trim(),
    home_flag: m.home_flag || null,
    away_flag: m.away_flag || null,
    group_name: m.group_name || null,
    home_score: hasScore ? Number(m.home_score) : null,
    away_score: hasScore ? Number(m.away_score) : null,
    status: hasScore && status === 'SCHEDULED' ? 'FINISHED' : status,
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
      json(res, 200, { matches: matches.map(toLegacyMatch) });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);

      // 승부예측 투표 (공개, 토큰 불필요). RPC가 없어 read-modify-write로 처리.
      if (body.action === 'vote') {
        if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
        if (!['for', 'against'].includes(body.choice)) {
          throw Object.assign(new Error("choice must be 'for' or 'against'"), { statusCode: 400 });
        }
        const col = body.choice === 'for' ? 'prediction_for_count' : 'prediction_against_count';
        const current = await select('matches', `select=match_id,${col}&${eq('match_id', body.id)}&limit=1`);
        if (!current[0]) throw Object.assign(new Error('match not found'), { statusCode: 404 });
        await patch('matches', eq('match_id', body.id), { [col]: (current[0][col] || 0) + 1 });
        const rows = await select('matches', `select=prediction_for_count,prediction_against_count&${eq('match_id', body.id)}&limit=1`);
        json(res, 200, { ok: true, counts: rows[0] || null });
        return;
      }

      // 경기 생성 (어드민)
      requireToken(req, 'ADMIN_TOKEN', 'admin');
      const list = Array.isArray(body) ? body : Array.isArray(body.matches) ? body.matches : [body];
      const rows = list.map(normalizeMatch);
      const inserted = await insert('matches', rows);
      json(res, 200, { ok: true, matches: inserted.map(toLegacyMatch) });
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
      const inputStatus = String(body.status || '').toUpperCase();
      if (body.status && STATUSES.includes(inputStatus)) {
        updates.status = inputStatus;
      } else if (hasScore) {
        updates.status = 'FINISHED';
      }

      const updated = await patch('matches', eq('match_id', id), updates);
      json(res, 200, { ok: true, match: updated[0] ? toLegacyMatch(updated[0]) : null });
      return;
    }

    if (req.method === 'DELETE') {
      requireToken(req, 'ADMIN_TOKEN', 'admin');
      const id = req.query?.id;
      if (!id) throw Object.assign(new Error('id is required'), { statusCode: 400 });
      await supabaseFetch('matches', { method: 'DELETE', query: eq('match_id', id) });
      json(res, 200, { ok: true });
      return;
    }

    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    handleError(res, error);
  }
};
