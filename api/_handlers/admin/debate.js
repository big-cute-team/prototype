const { requireToken } = require('../../_lib/auth');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { eq, inList, insert, patch, select, supabaseFetch } = require('../../_lib/supabase');

async function loadSummary(id) {
  const rows = await select('article_summaries', `select=article_summary_id,content_type&${eq('article_summary_id', id)}&limit=1`);
  const summary = rows[0];
  if (!summary) throw Object.assign(new Error('article summary not found'), { statusCode: 404 });
  return summary;
}

// 해당 요약의 기존 토론(+투표)을 제거. 쇼츠당 토론 1개 유니크라 재설정 전 비운다.
async function clearDebate(summaryId) {
  const existing = await select('debates', `select=debate_id&${eq('article_summary_id', summaryId)}`);
  const debateIds = existing.map(debate => debate.debate_id);
  if (debateIds.length > 0) {
    await supabaseFetch('debate_votes', { method: 'DELETE', query: inList('debate_id', debateIds) });
  }
  await supabaseFetch('debates', { method: 'DELETE', query: eq('article_summary_id', summaryId) });
}

module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin-debate');
    const body = await parseJsonBody(req);
    if (!body.id) throw Object.assign(new Error('id is required'), { statusCode: 400 });

    const isSetting = Boolean(body.debate_question);
    if (isSetting && (!body.vote_for_label || !body.vote_against_label)) {
      throw Object.assign(new Error('vote_for_label and vote_against_label are required when setting a debate'), { statusCode: 400 });
    }

    const id = body.id;
    await loadSummary(id);

    await clearDebate(id);
    if (isSetting) {
      await insert('debates', [{
        article_summary_id: id,
        topic: body.debate_question,
        option_a: body.vote_for_label,
        option_b: body.vote_against_label,
      }]);
    }
    // 표시 형태 전환: 토론 설정 시 DEBATE, 해제 시 GENERAL
    await patch('article_summaries', eq('article_summary_id', id), {
      content_type: isSetting ? 'DEBATE' : 'GENERAL',
    });

    json(res, 200, {
      ok: true,
      item: {
        id,
        content_type: isSetting ? 'DEBATE' : 'GENERAL',
        debate_question: isSetting ? body.debate_question : null,
        vote_for_label: isSetting ? body.vote_for_label : null,
        vote_against_label: isSetting ? body.vote_against_label : null,
      },
    });
  } catch (error) {
    handleError(res, error);
  }
};
