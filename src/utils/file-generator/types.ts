/**
 * 文件生成引擎 - 统一中间 JSON 格式
 */

/** 表格类数据（Excel / PDF 表格） */
export interface TableData {
  type: 'table';
  title: string;
  headers: string[];
  rows: string[][];
  styles?: {
    headerColor?: string;
    fontSize?: number;
  };
}

/** 文档类数据（Word / PDF 文档） */
export interface DocumentData {
  type: 'document';
  title: string;
  sections: {
    heading?: string;
    content: string;
    bullets?: string[];
  }[];
}

/** 演示类数据（PPT） */
export interface PresentationData {
  type: 'presentation';
  title: string;
  slides: {
    title: string;
    content: string;
    bullets?: string[];
    notes?: string;
  }[];
}

export type FileGenerationData = TableData | DocumentData | PresentationData;
