const fs = require('fs');
const path = require('path');
const { requireToken } = require('../../_lib/auth');
const { recordAudit } = require('../../_lib/audit');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { select, supabaseFetch } = require('../../_lib/supabase');

const API_FOOTBALL_BASE_URL = process.env.API_FOOTBALL_BASE_URL || 'https://v3.football.api-sports.io';
const WORLD_CUP_LEAGUE_ID = Number(process.env.API_FOOTBALL_WORLD_CUP_LEAGUE_ID || 1);
const WORLD_CUP_SEASON = Number(process.env.API_FOOTBALL_WORLD_CUP_SEASON || 2026);
const WORLD_CUP_DATA_PROVIDER = String(
  process.env.WORLD_CUP_DATA_PROVIDER || process.env.WORLD_CUP_FIXTURE_PROVIDER || 'openfootball'
).trim().toLowerCase();
const OPENFOOTBALL_WORLD_CUP_URL = process.env.OPENFOOTBALL_WORLD_CUP_URL
  || `https://raw.githubusercontent.com/openfootball/worldcup.json/master/${WORLD_CUP_SEASON}/worldcup.json`;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const COMPLETE_RESULT_STATUSES = new Set(['FT', 'AET', 'PEN']);
const FLAG_BASE_URL = 'https://flagcdn.com/w160';

let countryLookupCache = null;

function apiFootballKey() {
  const key = process.env.API_FOOTBALL_KEY || process.env.API_SPORTS_KEY || process.env.APISPORTS_KEY;
  if (!key) {
    throw Object.assign(new Error('API_FOOTBALL_KEY is required'), { statusCode: 500 });
  }
  return key;
}

function apiFootballUrl(pathname, params = {}) {
  const url = new URL(pathname.replace(/^\//, ''), `${API_FOOTBALL_BASE_URL.replace(/\/$/, '')}/`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url;
}

function apiFootballErrorsText(errors) {
  if (!errors) return '';
  if (Array.isArray(errors)) return errors.filter(Boolean).join(', ');
  if (typeof errors === 'string') return errors;
  if (typeof errors === 'object') {
    return Object.entries(errors)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('; ');
  }
  return String(errors);
}

async function apiFootballGet(pathname, params = {}) {
  const response = await fetch(apiFootballUrl(pathname, params), {
    method: 'GET',
    headers: { 'x-apisports-key': apiFootballKey() },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(`API-Football request failed: ${response.statusText}`), {
      statusCode: response.status >= 500 ? 502 : response.status,
      payload,
    });
  }
  const errorText = apiFootballErrorsText(payload?.errors);
  if (errorText) {
    throw Object.assign(new Error(`API-Football error: ${errorText}`), {
      statusCode: 502,
      payload,
    });
  }
  return Array.isArray(payload?.response) ? payload.response : [];
}

async function optionalApiFootballGet(pathname, params = {}) {
  try {
    return await apiFootballGet(pathname, params);
  } catch (error) {
    console.warn(`Optional API-Football ${pathname} lookup failed`, error.message);
    return [];
  }
}

function dateValueFromKstDate(date) {
  const kst = new Date(date.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayKstDateValue() {
  return dateValueFromKstDate(new Date());
}

function addDaysToDateValue(dateValue, days) {
  const [year, month, day] = String(dateValue || '').split('-').map(Number);
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function normalizeDateValue(value, label) {
  const raw = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw Object.assign(new Error(`${label} must be YYYY-MM-DD`), { statusCode: 400 });
  }
  return raw;
}

function syncDateRange(input = {}, syncType = 'schedule') {
  const today = todayKstDateValue();
  const defaultFrom = syncType === 'result' ? addDaysToDateValue(today, -3) : today;
  const from = normalizeDateValue(input.from || input.date || defaultFrom, 'from');
  const requestedDays = Number(input.days || 0);
  const defaultTo = syncType === 'result' ? today : addDaysToDateValue(from, 6);
  const to = normalizeDateValue(input.to || (requestedDays > 0 ? addDaysToDateValue(from, requestedDays - 1) : defaultTo), 'to');
  if (to < from) throw Object.assign(new Error('to must be on or after from'), { statusCode: 400 });
  return { from, to };
}

function kstPartsFromIso(value) {
  const source = new Date(value);
  if (Number.isNaN(source.getTime())) {
    throw Object.assign(new Error('fixture.date is invalid'), { statusCode: 502 });
  }
  const kst = new Date(source.getTime() + KST_OFFSET_MS);
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, '0');
  const day = String(kst.getUTCDate()).padStart(2, '0');
  const hour = String(kst.getUTCHours()).padStart(2, '0');
  const minute = String(kst.getUTCMinutes()).padStart(2, '0');
  return {
    iso: source.toISOString(),
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function loadCountryLookup() {
  if (countryLookupCache) return countryLookupCache;
  const byName = new Map();
  const byCode = new Map();
  const sourcePath = path.resolve(process.cwd(), 'src', 'epl', 'todayFixtureCountries.js');
  let source = '';
  try {
    source = fs.readFileSync(sourcePath, 'utf8');
  } catch (error) {
    console.warn(`Country lookup file not found: ${sourcePath}`, error.message);
    countryLookupCache = { byName, byCode };
    return countryLookupCache;
  }
  const rowPattern = /\[\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/g;
  let match;
  while ((match = rowPattern.exec(source))) {
    const [, nameEn, nameKo, code, flagCode] = match;
    const country = {
      nameEn,
      nameKo,
      code: String(code || '').trim().toUpperCase(),
      flagCode,
      flagUrl: `${FLAG_BASE_URL}/${flagCode}.png`,
    };
    if (country.nameEn) byName.set(normalizeName(country.nameEn), country);
    if (country.nameKo) byName.set(normalizeName(country.nameKo), country);
    if (country.code) byCode.set(country.code, country);
  }
  const aliasPattern = /\[\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/g;
  while ((match = aliasPattern.exec(source))) {
    const [, alias, code] = match;
    const country = byCode.get(String(code || '').trim().toUpperCase());
    if (alias && country) byName.set(normalizeName(alias), country);
  }
  countryLookupCache = { byName, byCode };
  return countryLookupCache;
}

function countryFromOpenFootballTeamName(name) {
  const normalized = normalizeName(name);
  const lookup = loadCountryLookup();
  return lookup.byName.get(normalized) || lookup.byCode.get(String(name || '').trim().toUpperCase()) || null;
}

function parseOpenFootballKickoff(dateValue, timeValue) {
  const dateMatch = String(dateValue || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = String(timeValue || '').trim().match(/^(\d{1,2}):(\d{2})(?:\s*UTC([+-]\d{1,2})(?::?(\d{2}))?)?$/i);
  if (!dateMatch || !timeMatch) {
    throw Object.assign(new Error(`Invalid openfootball kickoff: ${dateValue} ${timeValue}`), { statusCode: 502 });
  }
  const [, year, month, day] = dateMatch;
  const [, hour, minute, offsetHour = '0', offsetMinute = '0'] = timeMatch;
  const localMillis = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  const sign = offsetHour.trim().startsWith('-') ? -1 : 1;
  const offsetMinutes = sign * (Math.abs(Number(offsetHour)) * 60 + Number(offsetMinute || 0));
  return new Date(localMillis - offsetMinutes * 60 * 1000).toISOString();
}

function openFootballFixtureId(match, index) {
  const ordinal = Number(match?.num || index + 1);
  return -Number(`${WORLD_CUP_SEASON}${String(ordinal).padStart(3, '0')}`);
}

function isOpenFootballPlaceholderTeamName(name) {
  const value = String(name || '').trim().toUpperCase();
  return /^[WL]\d+$/.test(value)
    || /^\d[A-L]$/.test(value)
    || /^\d[A-L](?:\/[A-L])+$/.test(value);
}

function openFootballTeam(name) {
  const teamName = String(name || '').trim();
  const country = countryFromOpenFootballTeamName(teamName);
  if (country) {
    return {
      name: teamName,
      nameKo: country.nameKo,
      code: country.code,
      flagUrl: country.flagUrl,
    };
  }
  const placeholderCode = isOpenFootballPlaceholderTeamName(teamName) ? teamName.toUpperCase() : '';
  return {
    name: teamName || null,
    nameKo: null,
    code: placeholderCode || null,
    flagUrl: null,
  };
}

function rowFromOpenFootballMatch(match, index, context) {
  const kickoff = kstPartsFromIso(parseOpenFootballKickoff(match.date, match.time));
  const home = openFootballTeam(match.team1);
  const away = openFootballTeam(match.team2);
  const fullTimeScore = Array.isArray(match.score?.ft) ? match.score.ft : null;
  const completed = Boolean(fullTimeScore);

  const row = {
    api_fixture_id: openFootballFixtureId(match, index),
    season: WORLD_CUP_SEASON,
    league_id: WORLD_CUP_LEAGUE_ID,
    round: String(match.round || '').trim() || null,
    group_label: String(match.group || match.round || '').trim() || null,
    kickoff_at: kickoff.iso,
    kickoff_date_kst: kickoff.date,
    kickoff_time_kst: kickoff.time,
    home_team_id: null,
    home_team_name_api: home.name,
    home_team_name_ko: home.nameKo,
    home_code: home.code,
    home_flag_url: home.flagUrl,
    home_logo_url: null,
    away_team_id: null,
    away_team_name_api: away.name,
    away_team_name_ko: away.nameKo,
    away_code: away.code,
    away_flag_url: away.flagUrl,
    away_logo_url: null,
    venue_name_api: String(match.ground || '').trim() || null,
    venue_name_ko: null,
    venue_city_api: null,
    venue_city_ko: null,
    status_short: completed ? 'FT' : 'NS',
    status_long: completed ? 'Match Finished' : 'Not Started',
    home_score: fullTimeScore ? numericScore(fullTimeScore[0]) : null,
    away_score: fullTimeScore ? numericScore(fullTimeScore[1]) : null,
    raw_fixture: { source: 'openfootball', ...match },
    updated_at: context.now,
  };

  if (context.syncType === 'schedule') {
    row.last_schedule_synced_at = context.now;
  }
  if (context.syncType === 'result' && completed) {
    row.last_result_synced_at = context.now;
  }
  return row;
}

async function fetchOpenFootballWorldCup() {
  const response = await fetch(OPENFOOTBALL_WORLD_CUP_URL);
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || !Array.isArray(payload.matches)) {
    throw Object.assign(new Error(`openfootball worldcup.json request failed: ${response.statusText}`), {
      statusCode: response.status >= 500 ? 502 : response.status || 502,
      payload,
    });
  }
  return payload.matches;
}

async function syncOpenFootballFixtures(syncType, input = {}) {
  const range = syncDateRange(input, syncType);
  const matches = await fetchOpenFootballWorldCup();
  const context = {
    syncType,
    now: new Date().toISOString(),
  };
  const rows = matches
    .map((match, index) => rowFromOpenFootballMatch(match, index, context))
    .filter(row => row.kickoff_date_kst >= range.from && row.kickoff_date_kst <= range.to);
  const upserted = await upsertRowsForSync(rows, syncType);
  const completedCount = rows.filter(row => COMPLETE_RESULT_STATUSES.has(row.status_short)).length;

  return {
    provider: 'openfootball',
    range,
    fixture_count: rows.length,
    source_fixture_count: matches.length,
    saved_count: upserted.length,
    completed_count: completedCount,
    fixtures: upserted,
  };
}

function buildTeamLookup(teamRows) {
  const byId = new Map();
  const byName = new Map();
  (teamRows || []).forEach(row => {
    const team = row?.team || row;
    if (!team) return;
    if (team.id !== undefined && team.id !== null) byId.set(String(team.id), team);
    if (team.name) byName.set(normalizeName(team.name), team);
  });
  return { byId, byName };
}

function buildGroupLookup(standingsRows) {
  const byTeamId = new Map();
  const byTeamName = new Map();
  (standingsRows || []).forEach(row => {
    const sections = row?.league?.standings || [];
    sections.forEach(section => {
      (section || []).forEach(entry => {
        const label = String(entry?.group || '').trim();
        const team = entry?.team || {};
        if (!label) return;
        if (team.id !== undefined && team.id !== null) byTeamId.set(String(team.id), label);
        if (team.name) byTeamName.set(normalizeName(team.name), label);
      });
    });
  });
  return { byTeamId, byTeamName };
}

function lookupTeam(rawTeam, lookup) {
  const team = rawTeam || {};
  const fromId = team.id !== undefined && team.id !== null ? lookup.byId.get(String(team.id)) : null;
  const fromName = team.name ? lookup.byName.get(normalizeName(team.name)) : null;
  const source = fromId || fromName || {};
  return {
    id: team.id ?? source.id ?? null,
    name: team.name || source.name || null,
    code: String(source.code || team.code || '').trim().toUpperCase() || null,
    logo: team.logo || source.logo || null,
  };
}

function groupLabelForFixture(fixtureRow, groupLookup) {
  const leagueRound = String(fixtureRow?.league?.round || '').trim();
  const home = fixtureRow?.teams?.home || {};
  const away = fixtureRow?.teams?.away || {};
  const homeGroup = home.id !== undefined && home.id !== null
    ? groupLookup.byTeamId.get(String(home.id))
    : groupLookup.byTeamName.get(normalizeName(home.name));
  const awayGroup = away.id !== undefined && away.id !== null
    ? groupLookup.byTeamId.get(String(away.id))
    : groupLookup.byTeamName.get(normalizeName(away.name));
  if (homeGroup && homeGroup === awayGroup) return homeGroup;
  return homeGroup || awayGroup || leagueRound || null;
}

function numericScore(value) {
  if (value === undefined || value === null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function rowFromFixture(fixtureRow, context) {
  const fixture = fixtureRow?.fixture || {};
  const fixtureId = fixture.id;
  if (fixtureId === undefined || fixtureId === null) return null;

  const league = fixtureRow?.league || {};
  const venue = fixture.venue || {};
  const status = fixture.status || {};
  const home = lookupTeam(fixtureRow?.teams?.home, context.teamLookup);
  const away = lookupTeam(fixtureRow?.teams?.away, context.teamLookup);
  const kickoff = kstPartsFromIso(fixture.date);
  const statusShort = String(status.short || '').trim() || null;
  const completed = COMPLETE_RESULT_STATUSES.has(statusShort);

  const row = {
    api_fixture_id: Number(fixtureId),
    season: Number(league.season || WORLD_CUP_SEASON),
    league_id: Number(league.id || WORLD_CUP_LEAGUE_ID),
    round: String(league.round || '').trim() || null,
    group_label: groupLabelForFixture(fixtureRow, context.groupLookup),
    kickoff_at: kickoff.iso,
    kickoff_date_kst: kickoff.date,
    kickoff_time_kst: kickoff.time,
    home_team_id: home.id === null ? null : Number(home.id),
    home_team_name_api: home.name,
    home_team_name_ko: null,
    home_code: home.code,
    home_flag_url: null,
    home_logo_url: home.logo,
    away_team_id: away.id === null ? null : Number(away.id),
    away_team_name_api: away.name,
    away_team_name_ko: null,
    away_code: away.code,
    away_flag_url: null,
    away_logo_url: away.logo,
    venue_name_api: String(venue.name || '').trim() || null,
    venue_name_ko: null,
    venue_city_api: String(venue.city || '').trim() || null,
    venue_city_ko: null,
    status_short: statusShort,
    status_long: String(status.long || '').trim() || null,
    home_score: numericScore(fixtureRow?.goals?.home),
    away_score: numericScore(fixtureRow?.goals?.away),
    raw_fixture: fixtureRow,
    updated_at: context.now,
  };

  if (context.syncType === 'schedule') {
    row.last_schedule_synced_at = context.now;
  }
  if (context.syncType === 'result' && completed) {
    row.last_result_synced_at = context.now;
  }
  return row;
}

async function upsertWorldCupFixtures(rows) {
  if (rows.length === 0) return [];
  return supabaseFetch('world_cup_fixtures', {
    method: 'POST',
    query: 'on_conflict=api_fixture_id',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: rows,
  });
}

async function upsertRowsForSync(rows, syncType) {
  if (syncType !== 'result') return upsertWorldCupFixtures(rows);
  const completedRows = rows.filter(row => COMPLETE_RESULT_STATUSES.has(row.status_short));
  const otherRows = rows.filter(row => !COMPLETE_RESULT_STATUSES.has(row.status_short));
  const [otherUpserted, completedUpserted] = await Promise.all([
    upsertWorldCupFixtures(otherRows),
    upsertWorldCupFixtures(completedRows),
  ]);
  return [...otherUpserted, ...completedUpserted];
}

async function syncApiFootballFixtures(syncType, input = {}) {
  const range = syncDateRange(input, syncType);
  const params = {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    from: range.from,
    to: range.to,
    timezone: 'Asia/Seoul',
  };
  const fixtures = await apiFootballGet('/fixtures', params);
  const [teams, standings] = await Promise.all([
    optionalApiFootballGet('/teams', { league: WORLD_CUP_LEAGUE_ID, season: WORLD_CUP_SEASON }),
    optionalApiFootballGet('/standings', { league: WORLD_CUP_LEAGUE_ID, season: WORLD_CUP_SEASON }),
  ]);
  const context = {
    syncType,
    now: new Date().toISOString(),
    teamLookup: buildTeamLookup(teams),
    groupLookup: buildGroupLookup(standings),
  };
  const rows = fixtures.map(row => rowFromFixture(row, context)).filter(Boolean);
  const upserted = await upsertRowsForSync(rows, syncType);
  const completedCount = rows.filter(row => COMPLETE_RESULT_STATUSES.has(row.status_short)).length;

  return {
    provider: 'api-football',
    range,
    fixture_count: fixtures.length,
    source_fixture_count: fixtures.length,
    saved_count: upserted.length,
    completed_count: completedCount,
    fixtures: upserted,
  };
}

async function syncFixtures(syncType, input = {}) {
  if (WORLD_CUP_DATA_PROVIDER === 'api-football' || WORLD_CUP_DATA_PROVIDER === 'apifootball') {
    return syncApiFootballFixtures(syncType, input);
  }
  if (WORLD_CUP_DATA_PROVIDER && WORLD_CUP_DATA_PROVIDER !== 'openfootball') {
    throw Object.assign(new Error(`Unsupported WORLD_CUP_DATA_PROVIDER: ${WORLD_CUP_DATA_PROVIDER}`), {
      statusCode: 500,
    });
  }
  return syncOpenFootballFixtures(syncType, input);
}

function listQueryFromRequest(req) {
  const limit = Math.max(1, Math.min(Number(req.query?.limit || 200), 500));
  const parts = [`select=*`, 'order=kickoff_at.asc', `limit=${limit}`];
  const from = req.query?.from ? normalizeDateValue(req.query.from, 'from') : null;
  const to = req.query?.to ? normalizeDateValue(req.query.to, 'to') : null;
  const status = String(req.query?.status || 'all').trim();
  const resultsOnly = ['1', 'true', 'yes'].includes(String(req.query?.results_only || '').toLowerCase());

  if (from) parts.push(`kickoff_date_kst=gte.${encodeURIComponent(from)}`);
  if (to) parts.push(`kickoff_date_kst=lte.${encodeURIComponent(to)}`);
  if (resultsOnly || status === 'completed') {
    parts.push('status_short=in.(FT,AET,PEN)');
  } else if (status && status !== 'all') {
    parts.push(`status_short=eq.${encodeURIComponent(status)}`);
  }
  return parts.join('&');
}

async function listFixtures(req, res) {
  const rows = await select('world_cup_fixtures', listQueryFromRequest(req));
  json(res, 200, { fixtures: rows || [] });
}

async function syncFromRequest(req, res) {
  const body = await parseJsonBody(req);
  const action = String(body.action || req.query?.action || 'schedule').trim();
  const syncType = action.includes('result') ? 'result' : 'schedule';
  const result = await syncFixtures(syncType, body);
  await recordAudit(`world_cup_${syncType}_sync`, {
    actor: body.actor || 'admin-ui',
    from: result.range.from,
    to: result.range.to,
    provider: result.provider,
    fixture_count: result.fixture_count,
    saved_count: result.saved_count,
    completed_count: result.completed_count,
  }).catch(() => {});
  json(res, 200, { ok: true, sync_type: syncType, ...result });
}

module.exports = async function handler(req, res) {
  try {
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    if (req.method === 'GET') {
      await listFixtures(req, res);
      return;
    }
    if (req.method === 'POST') {
      await syncFromRequest(req, res);
      return;
    }
    json(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    handleError(res, error);
  }
};
