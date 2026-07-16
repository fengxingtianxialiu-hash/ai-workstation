/**
 * 文档解析器
 * 解析 .txt/.md 文档，识别标题层级，建立文档结构
 */
import type { DocumentStructure, HeadingNode } from '@/types/model';

/**
 * 解析 Markdown/纯文本文档的标题结构
 */
export function parseDocumentStructure(content: string): DocumentStructure {
  const headings: HeadingNode[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // 匹配 Markdown 标题 (# 到 ######)
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        position: content.indexOf(line),
      });
    }
  }

  return { headings };
}

/**
 * 按文档结构分块
 * 策略：按标题层级切分，每个块包含一个完整章节/条目
 * 块大小目标：300-800 字，支持 100 字重叠
 */
export interface ChunkResult {
  title: string;
  content: string;
  position: number;
  index: number;
}

export function chunkDocument(
  content: string,
  structure: DocumentStructure,
  options: {
    minChunkSize?: number;
    maxChunkSize?: number;
    overlap?: number;
  } = {}
): ChunkResult[] {
  const {
    minChunkSize = 300,
    maxChunkSize = 800,
    overlap = 100,
  } = options;

  const headings = structure.headings;
  const chunks: ChunkResult[] = [];

  if (headings.length === 0) {
    // 无标题结构，按段落分块
    return chunkByParagraphs(content, minChunkSize, maxChunkSize, overlap);
  }

  // 按标题分块
  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings[i + 1];

    // 计算当前块的起止位置
    const start = heading.position;
    const end = nextHeading ? nextHeading.position : content.length;
    const sectionContent = content.slice(start, end).trim();

    // 如果块太大，进一步按子标题或段落切分
    if (sectionContent.length > maxChunkSize) {
      const subChunks = splitLargeChunk(sectionContent, heading.text, minChunkSize, maxChunkSize, overlap);
      for (const sub of subChunks) {
        chunks.push({
          title: sub.title,
          content: sub.content,
          position: start + sub.position,
          index: chunks.length,
        });
      }
    } else if (sectionContent.length >= minChunkSize * 0.5) {
      // 块大小合理
      chunks.push({
        title: heading.text,
        content: sectionContent,
        position: start,
        index: chunks.length,
      });
    }
    // 太小的块跳过（可能是空章节）
  }

  // 处理标题前的内容（如果有）
  if (headings.length > 0 && headings[0].position > 0) {
    const preamble = content.slice(0, headings[0].position).trim();
    if (preamble.length >= minChunkSize * 0.5) {
      chunks.unshift({
        title: '前言',
        content: preamble,
        position: 0,
        index: 0,
      });
      // 重新编号
      chunks.forEach((c, i) => (c.index = i));
    }
  }

  return chunks;
}

/**
 * 按段落分块（无标题结构的文档）
 */
function chunkByParagraphs(
  content: string,
  minSize: number,
  maxSize: number,
  overlap: number
): ChunkResult[] {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks: ChunkResult[] = [];
  let currentContent = '';
  let currentPosition = 0;

  for (const para of paragraphs) {
    if (currentContent.length + para.length > maxSize && currentContent.length >= minSize) {
      chunks.push({
        title: `段落 ${chunks.length + 1}`,
        content: currentContent.trim(),
        position: currentPosition,
        index: chunks.length,
      });
      // 重叠：保留最后 overlap 字符
      const overlapText = currentContent.slice(-overlap);
      currentContent = overlapText + '\n\n' + para;
      currentPosition = content.indexOf(para) - overlap;
    } else {
      if (currentContent.length === 0) {
        currentPosition = content.indexOf(para);
      }
      currentContent += (currentContent ? '\n\n' : '') + para;
    }
  }

  // 最后一个块
  if (currentContent.trim().length >= minSize * 0.5) {
    chunks.push({
      title: `段落 ${chunks.length + 1}`,
      content: currentContent.trim(),
      position: currentPosition,
      index: chunks.length,
    });
  }

  return chunks;
}

/**
 * 拆分过大的块
 */
function splitLargeChunk(
  content: string,
  title: string,
  minSize: number,
  maxSize: number,
  overlap: number
): { title: string; content: string; position: number }[] {
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0);
  const parts: { title: string; content: string; position: number }[] = [];
  let currentContent = '';
  let partIndex = 0;

  for (const para of paragraphs) {
    if (currentContent.length + para.length > maxSize && currentContent.length >= minSize) {
      parts.push({
        title: partIndex === 0 ? title : `${title}（续${partIndex}）`,
        content: currentContent.trim(),
        position: content.indexOf(currentContent.trim()),
      });
      partIndex++;
      const overlapText = currentContent.slice(-overlap);
      currentContent = overlapText + '\n\n' + para;
    } else {
      currentContent += (currentContent ? '\n\n' : '') + para;
    }
  }

  if (currentContent.trim().length >= minSize * 0.5) {
    parts.push({
      title: partIndex === 0 ? title : `${title}（续${partIndex}）`,
      content: currentContent.trim(),
      position: content.indexOf(currentContent.trim()),
    });
  }

  return parts;
}

/**
 * 提取关键词（简单实现：提取高频名词性短语）
 */
export function extractKeywords(content: string, maxKeywords: number = 10): string[] {
  // 简单实现：按标点和空格分词，过滤短词和停用词
  const stopWords = new Set([
    '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个',
    '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好',
    '自己', '这', '他', '她', '它', '们', '那', '里', '就', '又', '之', '与',
    '及', '等', '或', '并', '而', '但', '如', '于', '其', '将', '已', '对',
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
    'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
    'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  ]);

  const words = content
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !stopWords.has(w));

  // 统计词频
  const freq = new Map<string, number>();
  for (const word of words) {
    freq.set(word, (freq.get(word) || 0) + 1);
  }

  // 按频率排序取前 N 个
  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}
