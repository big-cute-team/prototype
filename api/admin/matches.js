const { requireToken } = require('../_lib/auth');
const { recordAudit } = require('../_lib/audit');
const { handleError, json, parseJsonBody } = require('../_lib/http');
const { insert, select, supabaseFetch } = require('../_lib/supabase');

const STATUSES = ['scheduled', 'live', 'finished'];
const TARGET_TEAM_CODES = ['ARS', 'CHE', 'LIV', 'MCI', 'MUN', 'TOT'];

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
    requireToken(req, 'ADMIN_TOKEN', 'admin');

    if (req.method === 'GET') {
      const matches = await select('matches', 'select=*&order=kickoff_at.asc');
      json(res, 200, { matches });
      return;
    }

    if (req.method === 'POST') {
      const body = await parseJsonBody(req);
      const list = Array.isArray(body) ? body : Array.isArray(body.matches) ? body.matches : [body];
      const rows = list.map(normalizeMatch);
      const inserted = await insert('matches', rows);
      await recordAudit('admin_matches_create', { count: inserted.length, actor: 'admin-ui' });
      json(res, 200, { ok: true, matches: inserted });
      return;
    }

    if (req.method === 'DELETE') {
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
