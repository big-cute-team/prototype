const { requireToken } = require('../../_lib/auth');
const { handleError, json, parseJsonBody } = require('../../_lib/http');
const { inList, patch, select, supabaseFetch } = require('../../_lib/supabase');

// PostgREST는 DELETE/PATCH에 필터를 요구한다. 전체 대상은 PK not-null로 표현.
const ALL = pk => `${pk}=not.is.null`;

// 정규화된 새 스키마는 단일 테이블 삭제가 불가능하다(FK 자식 존재).
// 자식 → 부모 순서로 지운다. card_news_publications는 발행 로그라 참조만 해제(보존).
module.exports = async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      json(res, 405, { error: 'Method not allowed' });
      return;
    }
    requireToken(req, 'ADMIN_TOKEN', 'admin');
    const body = await parseJsonBody(req);

    const all = body.all === true;
    const ids = Array.isArray(body.ids) ? body.ids : [];
    if (!all && ids.length === 0) {
      throw Object.assign(new Error('ids array or all:true is required'), { statusCode: 400 });
    }

    // 자식 테이블은 article_summary_id 기준 필터
    const bySummary = all ? ALL('article_summary_id') : inList('article_summary_id', ids);

    // 1) 카드뉴스 발행 로그: 보존하되 참조 해제 (FK NULL 허용)
    await patch('card_news_publications', bySummary, { article_summary_id: null }).catch(() => {});

    // 2) 토론/투표 (debate_votes → debates)
    const debates = await select('debates', `select=debate_id&${bySummary}`);
    const debateIds = debates.map(debate => debate.debate_id);
    if (debateIds.length > 0) {
      await supabaseFetch('debate_votes', { method: 'DELETE', query: inList('debate_id', debateIds) });
    }
    await supabaseFetch('debates', { method: 'DELETE', query: bySummary });

    // 3) 요약에 매달린 사용자활동·태그·이력
    for (const table of ['team_tags', 'article_status_logs', 'article_views', 'likes']) {
      await supabaseFetch(table, { method: 'DELETE', query: bySummary });
    }
    // 댓글 좋아요(comment_likes) → 댓글(comments)
    const comments = await select('comments', `select=comment_id&${bySummary}`);
    const commentIds = comments.map(comment => comment.comment_id);
    if (commentIds.length > 0) {
      await supabaseFetch('comment_likes', { method: 'DELETE', query: inList('comment_id', commentIds) });
    }
    await supabaseFetch('comments', { method: 'DELETE', query: bySummary });

    // 4) 원문 (unmatched_keywords → raw_articles)
    const raws = await select('raw_articles', `select=raw_article_id&${bySummary}`);
    const rawIds = raws.map(raw => raw.raw_article_id);
    if (rawIds.length > 0) {
      await supabaseFetch('unmatched_keywords', { method: 'DELETE', query: inList('raw_article_id', rawIds) });
    }
    await supabaseFetch('raw_articles', { method: 'DELETE', query: bySummary });

    // 5) 요약 본체
    const deleted = await supabaseFetch('article_summaries', {
      method: 'DELETE',
      query: all ? ALL('article_summary_id') : inList('article_summary_id', ids),
      prefer: 'return=representation',
    });
    const count = Array.isArray(deleted) ? deleted.length : 0;

    json(res, 200, { ok: true, deleted: count });
  } catch (error) {
    handleError(res, error);
  }
};
