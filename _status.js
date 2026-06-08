const fs = require('fs');
const envContent = fs.readFileSync('.env.local', 'utf8');
envContent.split('\n').forEach(line => {
  const cleanLine = line.replace(/\r/g, '').trim();
  if (!cleanLine || cleanLine.startsWith('#')) return;
  const idx = cleanLine.indexOf('=');
  if (idx < 0) return;
  const key = cleanLine.slice(0, idx).trim();
  let val = cleanLine.slice(idx + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
  process.env[key] = val;
});
const { classifyPost } = require('./api/_lib/ai');
const { select } = require('./api/_lib/supabase');

const cases = [
  { label: 'A. 기자 done deal (official 마커 없음)', specialty: 'LIV', text: 'Florian Wirtz to Liverpool, here we go! Deal completed, medical done, contract signed until 2030.' },
  { label: 'B. 공식 발표 마커', specialty: 'MUN', text: 'OFFICIAL: Manchester United announce the signing of the midfielder on a five-year deal. ✅ Welcome!' },
  { label: 'C. 단순 루머', specialty: 'CHE', text: 'Chelsea are showing interest in the young striker, talks could begin soon.' },
];

select('team_aliases', 'select=team_code,alias,entity_type&active=eq.true').then(async aliases => {
  for (const c of cases) {
    const post = { id: 't', text: c.text, created_at: new Date().toISOString(), author_handle: 'tester', specialty_team: c.specialty, source_tier: 1, media: [], public_metrics: {} };
    const r = await classifyPost(post, aliases);
    console.log(`${c.label}\n  briefing.status=${r.briefing.status} decision=${r.decision} teams=${JSON.stringify(r.teams)}\n`);
  }
}).catch(e => console.error('ERR', e.message));
