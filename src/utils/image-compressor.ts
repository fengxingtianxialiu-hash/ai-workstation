/**
 * 图片压缩管线
 * 选择 → 校验 → 压缩 → base64
 */

export interface CompressOptions {
  /** 长边最大像素 */
  maxDimension?: number;
  /** JPEG 质量 0-1 */
  quality?: number;
  /** 最大文件大小（字节） */
  maxSize?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
  maxDimension: 1280,
  quality: 0.75,
  maxSize: 500 * 1024, // 500KB
};

/**
 * 压缩图片
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的 base64 字符串
 */
export async function compressImage(
  file: File,
  options?: CompressOptions
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // 计算缩放尺寸
      let { width, height } = img;
      if (width > opts.maxDimension || height > opts.maxDimension) {
        if (width > height) {
          height = Math.round((height / width) * opts.maxDimension);
          width = opts.maxDimension;
        } else {
          width = Math.round((width / height) * opts.maxDimension);
          height = opts.maxDimension;
        }
      }

      // Canvas 重绘
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      // 导出为 JPEG（质量压缩）
      let dataUrl = canvas.toDataURL('image/jpeg', opts.quality);

      // 如果还是太大，降低质量重试
      if (dataUrl.length * 0.75 > opts.maxSize && opts.quality > 0.3) {
        dataUrl = canvas.toDataURL('image/jpeg', opts.quality * 0.7);
      }

      resolve(dataUrl);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('图片加载失败'));
    };

    img.src = url;
  });
}

/**
 * 校验图片文件
 */
export function validateImage(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: '不支持的图片格式，请使用 JPEG/PNG/GIF/WebP' };
  }
  if (file.size > 20 * 1024 * 1024) {
    return { valid: false, error: '图片大小不能超过 20MB' };
  }
  return { valid: true };
}
