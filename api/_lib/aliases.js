const { supabaseFetch } = require('./supabase');

// 새 DB(figures + figure_aliases + teams)에서 classifyPost/matchAliasRows가 기대하는
// alias 행 [{ alias, team_code, korean_name }] 을 만든다.
// 구 team_aliases 테이블의 대체(설계상 매칭 사전은 figures/figure_aliases).
async function loadAliases() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let figs;
    try {
      figs = await supabaseFetch('figures', {
        query: 'select=name_en,name_ko,teams(short_name),figure_aliases(alias)',
        headers: { Range: `${from}-${from + 999}` },
      });
    } catch (error) {
      console.error('loadAliases figures fetch failed', error.message);
      break;
    }
    if (!Array.isArray(figs) || figs.length === 0) break;
    for (const fig of figs) {
      const code = fig.teams?.short_name;
      if (!code) continue; // 무소속(team_id NULL)은 팀 매핑 불가 → 제외
      const koreanName = fig.name_ko || null;
      const names = new Set();
      if (fig.name_en) names.add(fig.name_en);
      if (fig.name_ko) names.add(fig.name_ko);
      for (const a of fig.figure_aliases || []) if (a.alias) names.add(a.alias);
      for (const alias of names) rows.push({ alias, team_code: code, korean_name: koreanName });
    }
    if (figs.length < 1000) break;
  }
  return rows;
}

module.exports = { loadAliases };
