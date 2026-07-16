/**
 * 知识库全文检索引擎
 * 基于 flexsearch 实现客户端全文检索
 */
import FlexSearch from 'flexsearch';
import type { KnowledgeChunk, KnowledgeSearchResult, KnowledgeDocument, KnowledgeBase } from '@/types/model';

/** 检索阈值 */
const SEARCH_THRESHOLD = 0.6;
/** 最大返回结果数 */
const MAX_RESULTS = 5;
/** 最大注入结果数 */
const MAX_INJECT = 3;

/** 索引实例缓存（按知识库 ID） */
const indexCache = new Map<string, FlexSearch.Index>();

/** 检索结果缓存（对话级） */
const resultCache = new Map<string, KnowledgeSearchResult[]>();

/**
 * 创建或获取 flexsearch 索引
 */
function getIndex(knowledgeBaseId: string): FlexSearch.Index {
  if (indexCache.has(knowledgeBaseId)) {
    return indexCache.get(knowledgeBaseId)!;
  }

  const index = new FlexSearch.Index({
    tokenize: 'forward',
    resolution: 9,
    // 中文分词：按字符 n-gram
    encode: (str: string) => {
      // 简单中文分词：按字符拆分 + 保留英文单词
      const tokens: string[] = [];
      let i = 0;
      while (i < str.length) {
        const char = str[i];
        if (/[\u4e00-\u9fa5]/.test(char)) {
          // 中文字符：单字 + 双字组合
          tokens.push(char);
          if (i + 1 < str.length && /[\u4e00-\u9fa5]/.test(str[i + 1])) {
            tokens.push(char + str[i + 1]);
          }
          i++;
        } else if (/[a-zA-Z0-9]/.test(char)) {
          // 英文/数字：收集连续字符作为一个 token
          let word = '';
          while (i < str.length && /[a-zA-Z0-9]/.test(str[i])) {
            word += str[i].toLowerCase();
            i++;
          }
          if (word.length >= 2) tokens.push(word);
        } else {
          i++;
        }
      }
      return tokens;
    },
  });

  indexCache.set(knowledgeBaseId, index);
  return index;
}

/**
 * 为知识库构建索引
 */
export function buildIndex(knowledgeBaseId: string, chunks: KnowledgeChunk[]): void {
  const index = getIndex(knowledgeBaseId);
  index.clear();

  for (const chunk of chunks) {
    // 索引内容：标题 + 摘要 + 关键词 + 内容
    const searchable = [
      chunk.title,
      chunk.summary || '',
      (chunk.keywords || []).join(' '),
      chunk.content,
    ].join(' ');

    index.add(chunk.id, searchable);
  }
}

/**
 * 清除索引缓存
 */
export function clearIndex(knowledgeBaseId: string): void {
  const index = indexCache.get(knowledgeBaseId);
  if (index) {
    index.clear();
    indexCache.delete(knowledgeBaseId);
  }
}

/**
 * 清除所有索引缓存
 */
export function clearAllIndexes(): void {
  indexCache.clear();
  resultCache.clear();
}

/**
 * 检索知识库
 */
export function searchKnowledge(
  query: string,
  knowledgeBaseIds: string[],
  allChunks: Map<string, KnowledgeChunk[]>,
  allDocuments: Map<string, KnowledgeDocument>,
  allKnowledgeBases: Map<string, KnowledgeBase>,
  cacheKey?: string
): KnowledgeSearchResult[] {
  // 检查缓存
  if (cacheKey && resultCache.has(cacheKey)) {
    return resultCache.get(cacheKey)!;
  }

  const results: KnowledgeSearchResult[] = [];

  for (const kbId of knowledgeBaseIds) {
    const index = indexCache.get(kbId);
    if (!index) continue;

    const kb = allKnowledgeBases.get(kbId);
    if (!kb) continue;

    // 执行检索
    const matches = index.search(query, {
      limit: MAX_RESULTS,
    });

    const chunkMap = new Map((allChunks.get(kbId) || []).map(c => [c.id, c]));

    if (Array.isArray(matches)) {
      for (const chunkId of matches) {
        const chunk = chunkMap.get(chunkId);
        if (!chunk) continue;

        const doc = allDocuments.get(chunk.documentId);
        if (!doc) continue;

        // 计算相关度分数
        const score = calculateRelevance(query, chunk);

        if (score >= SEARCH_THRESHOLD) {
          results.push({
            chunk,
            score,
            documentTitle: doc.title,
            knowledgeBaseName: kb.name,
          });
        }
      }
    }
  }

  // 按分数降序排序
  results.sort((a, b) => b.score - a.score);

  // 去重合并（同一文档的多个块合并）
  const deduped = deduplicateResults(results);

  // 限制注入数量
  const final = deduped.slice(0, MAX_INJECT);

  // 缓存结果
  if (cacheKey) {
    resultCache.set(cacheKey, final);
  }

  return final;
}

/**
 * 计算相关度分数
 */
function calculateRelevance(query: string, chunk: KnowledgeChunk): number {
  const queryLower = query.toLowerCase();
  const contentLower = chunk.content.toLowerCase();
  const titleLower = chunk.title.toLowerCase();
  const summaryLower = (chunk.summary || '').toLowerCase();

  let score = 0;

  // 标题匹配（权重最高）
  if (titleLower.includes(queryLower)) {
    score += 0.4;
  }

  // 摘要匹配
  if (summaryLower && summaryLower.includes(queryLower)) {
    score += 0.3;
  }

  // 内容匹配
  if (contentLower.includes(queryLower)) {
    score += 0.2;
  }

  // 关键词匹配
  if (chunk.keywords && chunk.keywords.some(k => k.toLowerCase().includes(queryLower))) {
    score += 0.1;
  }

  // 分词匹配（部分匹配）
  const queryWords = queryLower.split(/[\s,，、]+/).filter(w => w.length >= 2);
  for (const word of queryWords) {
    if (contentLower.includes(word)) {
      score += 0.05;
    }
  }

  return Math.min(score, 1.0);
}

/**
 * 去重合并：同一文档的多个块合并
 */
function deduplicateResults(results: KnowledgeSearchResult[]): KnowledgeSearchResult[] {
  const docMap = new Map<string, KnowledgeSearchResult>();

  for (const result of results) {
    const docId = result.chunk.documentId;
    if (docMap.has(docId)) {
      // 已有该文档的结果，合并内容
      const existing = docMap.get(docId)!;
      existing.score = Math.max(existing.score, result.score);
      // 合并内容（取较长的）
      if (result.chunk.content.length > existing.chunk.content.length) {
        existing.chunk = result.chunk;
      }
    } else {
      docMap.set(docId, { ...result });
    }
  }

  return Array.from(docMap.values()).sort((a, b) => b.score - a.score);
}

/**
 * 格式化检索结果为注入文本
 */
export function formatSearchResultsForInjection(results: KnowledgeSearchResult[]): string {
  if (results.length === 0) return '';

  const parts: string[] = ['[知识库参考]'];

  for (const result of results) {
    const content = result.chunk.summary || result.chunk.content.slice(0, 200);
    parts.push(
      `来源：《${result.knowledgeBaseName}》- ${result.documentTitle} - ${result.chunk.title}\n---\n${content}\n---`
    );
  }

  return parts.join('\n\n');
}

/**
 * 清除对话级缓存
 */
export function clearResultCache(cacheKey?: string): void {
  if (cacheKey) {
    resultCache.delete(cacheKey);
  } else {
    resultCache.clear();
  }
}
