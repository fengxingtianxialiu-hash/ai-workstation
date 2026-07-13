/**
 * 从 AI 响应文本中提取结构化文件生成数据
 */
import type { FileGenerationData, TableData, DocumentData, PresentationData } from '@/utils/file-generator/types';

/** 文件类型映射 */
const FILE_TYPE_MAP: Record<string, string> = {
  table: '表格',
  document: '文档',
  presentation: '演示文稿',
};

/** 文件扩展名映射 */
const FILE_EXT_MAP: Record<string, string> = {
  table: 'xlsx',
  document: 'docx',
  presentation: 'pptx',
};

export interface ParsedFileData {
  data: FileGenerationData;
  type: string;
  typeName: string;
  extension: string;
}

/**
 * 从文本中提取 JSON 代码块
 */
function extractJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  // 匹配 ```json ... ``` 或 ``` ... ``` 中的 JSON
  const regex = /```(?:json)?\s*\n?([\s\S]*?)\n?```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    blocks.push(match[1].trim());
  }
  return blocks;
}

/**
 * 尝试解析 JSON 字符串为文件生成数据
 */
function tryParseFileData(jsonStr: string): FileGenerationData | null {
  try {
    const parsed = JSON.parse(jsonStr);
    // 检查是否是文件生成数据结构
    if (parsed && typeof parsed === 'object') {
      if (parsed.type === 'table' && parsed.title && parsed.headers && parsed.rows) {
        return parsed as TableData;
      }
      if (parsed.type === 'document' && parsed.title && parsed.sections) {
        return parsed as DocumentData;
      }
      if (parsed.type === 'presentation' && parsed.title && parsed.slides) {
        return parsed as PresentationData;
      }
    }
  } catch {
    // 不是有效 JSON
  }
  return null;
}

/**
 * 从 AI 响应文本中解析文件生成数据
 * 返回解析结果，如果未找到则返回 null
 */
export function parseFileGenerationData(text: string): ParsedFileData | null {
  // 先尝试从代码块中提取
  const jsonBlocks = extractJsonBlocks(text);
  for (const block of jsonBlocks) {
    const data = tryParseFileData(block);
    if (data) {
      return {
        data,
        type: data.type,
        typeName: FILE_TYPE_MAP[data.type] || data.type,
        extension: FILE_EXT_MAP[data.type] || 'txt',
      };
    }
  }

  // 如果没有代码块，尝试从整个文本中查找 JSON
  const jsonMatch = text.match(/\{[\s\S]*"type"\s*:\s*"(table|document|presentation)"[\s\S]*\}/);
  if (jsonMatch) {
    const data = tryParseFileData(jsonMatch[0]);
    if (data) {
      return {
        data,
        type: data.type,
        typeName: FILE_TYPE_MAP[data.type] || data.type,
        extension: FILE_EXT_MAP[data.type] || 'txt',
      };
    }
  }

  return null;
}

/**
 * 获取文件名（基于标题和扩展名）
 */
export function getFileName(title: string, extension: string): string {
  const cleanTitle = title.replace(/[\\/:*?"<>|]/g, '_').trim();
  return `${cleanTitle || '文档'}.${extension}`;
}
