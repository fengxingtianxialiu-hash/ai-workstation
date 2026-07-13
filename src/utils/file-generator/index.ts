/**
 * 文件生成引擎
 * 按需加载各库，将中间 JSON 转换为文件
 */
import type { FileGenerationData, TableData, DocumentData, PresentationData } from './types';

export type { FileGenerationData, TableData, DocumentData, PresentationData } from './types';

/**
 * 生成 Excel 文件
 */
export async function generateExcel(data: TableData): Promise<Blob> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const wsData = [data.headers, ...data.rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // 设置列宽
  ws['!cols'] = data.headers.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, ws, data.title || 'Sheet1');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * 生成 Word 文件
 */
export async function generateWord(data: DocumentData): Promise<Blob> {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

  const children: any[] = [];

  // 标题
  children.push(new Paragraph({
    heading: HeadingLevel.TITLE,
    children: [new TextRun({ text: data.title, bold: true })],
  }));

  // 内容
  for (const section of data.sections) {
    if (section.heading) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: section.heading })],
      }));
    }
    children.push(new Paragraph({
      children: [new TextRun({ text: section.content })],
    }));
    if (section.bullets) {
      for (const bullet of section.bullets) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          children: [new TextRun({ text: bullet })],
        }));
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buffer = await Packer.toBlob(doc);
  return buffer;
}

/**
 * 生成 PPT 文件
 */
export async function generatePPT(data: PresentationData): Promise<Blob> {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();

  // 封面
  const cover = pptx.addSlide();
  cover.addText(data.title, {
    x: 1, y: 2, w: 8, h: 2,
    fontSize: 36, bold: true, color: '4F6EF7',
    align: 'center',
  });

  // 内容页
  for (const slide of data.slides) {
    const s = pptx.addSlide();
    s.addText(slide.title, {
      x: 0.5, y: 0.3, w: 9, h: 1,
      fontSize: 24, bold: true, color: '1A1A2E',
    });

    let yPos = 1.5;
    if (slide.content) {
      s.addText(slide.content, {
        x: 0.5, y: yPos, w: 9, h: 1,
        fontSize: 16, color: '5A5B6A',
      });
      yPos += 1.2;
    }

    if (slide.bullets) {
      const bulletText = slide.bullets.map(b => ({ text: `• ${b}\n`, options: { fontSize: 14 } }));
      s.addText(bulletText as any, {
        x: 0.5, y: yPos, w: 9, h: 4,
        color: '5A5B6A',
      });
    }
  }

  const output = await pptx.write({ outputType: 'blob' });
  return output as Blob;
}

/**
 * 生成 PDF 文件
 */
export async function generatePDF(data: FileGenerationData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  if (data.type === 'table') {
    doc.setFontSize(18);
    doc.text(data.title, 14, 22);

    doc.setFontSize(10);
    let y = 35;
    // 表头
    data.headers.forEach((h, i) => {
      doc.text(h, 14 + i * 40, y);
    });
    y += 8;
    // 数据行
    for (const row of data.rows) {
      if (y > 270) { doc.addPage(); y = 20; }
      row.forEach((cell, i) => {
        doc.text(cell, 14 + i * 40, y);
      });
      y += 7;
    }
  } else if (data.type === 'document') {
    doc.setFontSize(20);
    doc.text(data.title, 14, 22);
    let y = 35;
    doc.setFontSize(12);
    for (const section of data.sections) {
      if (y > 260) { doc.addPage(); y = 20; }
      if (section.heading) {
        doc.setFontSize(16);
        doc.text(section.heading, 14, y);
        y += 10;
        doc.setFontSize(12);
      }
      const lines = doc.splitTextToSize(section.content, 180);
      doc.text(lines, 14, y);
      y += lines.length * 6 + 5;
    }
  } else if (data.type === 'presentation') {
    doc.setFontSize(24);
    doc.text(data.title, 14, 40);
    let pageNum = 1;
    for (const slide of data.slides) {
      doc.addPage();
      doc.setFontSize(18);
      doc.text(slide.title, 14, 25);
      doc.setFontSize(12);
      let y = 40;
      if (slide.content) {
        const lines = doc.splitTextToSize(slide.content, 180);
        doc.text(lines, 14, y);
        y += lines.length * 6 + 5;
      }
      if (slide.bullets) {
        for (const b of slide.bullets) {
          doc.text(`• ${b}`, 18, y);
          y += 7;
        }
      }
      pageNum++;
    }
  }

  return doc.output('blob');
}

/**
 * 触发文件下载
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
