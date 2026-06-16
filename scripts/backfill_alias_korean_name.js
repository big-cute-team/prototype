// team_aliases.korean_name 백필 (1회 실행).
// big6_aliases.json은 인물 단위(name + aliases[한글 포함])로 묶여 있으므로,
// 각 인물의 한글 표기를 골라 그 인물의 모든 별칭 행(name + aliases)에 채운다.
//
// 실행: node scripts/backfill_alias_korean_name.js
// (.env.local 의 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 사용)

const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const file = path.join(__dirname, '..', '.env.local');
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}

function restBase() {
  return String(process.env.SUPABASE_URL || '').replace(/\/$/, '').replace(/\/rest\/v1$/, '');
}

const hasHangul = v => /[가-힣]/.test(String(v || ''));

async function patchKoreanName(teamCode, alias, koreanName) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url =
    `${restBase()}/rest/v1/team_aliases` +
    `?team_code=eq.${encodeURIComponent(teamCode)}` +
    `&alias=eq.${encodeURIComponent(alias)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify({ korean_name: koreanName }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PATCH ${alias} 실패: ${res.status} ${text}`);
  return text ? JSON.parse(text) : [];
}

async function main() {
  loadEnvLocal();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요합니다');
  }

  const seed = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'big6_aliases.json'), 'utf8'));
  let updated = 0;
  let skipped = 0;

  for (const entry of seed) {
    const names = [entry.name, ...(entry.aliases || [])].filter(Boolean);
    const koreanName = names.find(hasHangul);
    if (!koreanName) {
      skipped += 1;
      console.warn(`[skip] 한글 표기 없음: ${entry.name} (${entry.team})`);
      continue;
    }
    for (const alias of names) {
      const rows = await patchKoreanName(entry.team, alias, koreanName);
      updated += Array.isArray(rows) ? rows.length : 0;
    }
  }

  console.log(`\n완료: ${updated}개 행에 korean_name 적용, ${skipped}개 인물 스킵(한글 없음).`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
