import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ breaks: true, typographer: true });

/** 将 markdown 转为适配小程序 rich-text 的 HTML（带内联样式） */
export function markdownToRichHTML(markdown: string): string {
  const html = md.render(markdown);
  return html
    .replace(/<h1>/g, '<h1 style="font-size:36rpx;font-weight:700;color:#1a293b;margin:24rpx 0 16rpx;line-height:1.4;">')
    .replace(/<h2>/g, '<h2 style="font-size:32rpx;font-weight:700;color:#1a56db;margin:28rpx 0 14rpx;line-height:1.4;">')
    .replace(/<h3>/g, '<h3 style="font-size:30rpx;font-weight:600;color:#333;margin:22rpx 0 12rpx;line-height:1.4;">')
    .replace(/<p>/g, '<p style="font-size:28rpx;color:#444;line-height:1.8;margin:8rpx 0;">')
    .replace(/<ul>/g, '<ul style="padding-left:24rpx;margin:8rpx 0;">')
    .replace(/<ol>/g, '<ol style="padding-left:24rpx;margin:8rpx 0;">')
    .replace(/<li>/g, '<li style="font-size:28rpx;color:#444;line-height:1.8;margin:4rpx 0;">')
    .replace(/<blockquote>/g, '<blockquote style="background:#f0f5ff;border-left:6rpx solid #1a56db;padding:16rpx 20rpx;margin:16rpx 0;border-radius:0 8rpx 8rpx 0;">')
    .replace(/<strong>/g, '<strong style="font-weight:700;color:#1a293b;">')
    .replace(/<em>/g, '<em style="font-style:italic;color:#555;">')
    .replace(/<hr>/g, '<hr style="border:none;border-top:2rpx solid #eee;margin:24rpx 0;">')
    .replace(/<code>/g, '<code style="background:#f5f5f5;padding:2rpx 8rpx;border-radius:4rpx;font-size:26rpx;color:#e11d48;">')
    .replace(/<pre>/g, '<pre style="background:#f5f5f5;padding:16rpx;border-radius:8rpx;overflow-x:auto;font-size:24rpx;">');
}

/** 从 HTML 中提取 [SUGGESTED_QUESTIONS]，返回清洗后的 HTML 与问题数组 */
export function extractSuggestedQuestions(html: string): { html: string; questions: string[] } {
  const questions: string[] = [];
  const re = /\[SUGGESTED_QUESTIONS\]\s*[\s\S]*?(?=<ol>|<ul>)([\s\S]*?)(<\/ol>|<\/ul>)/i;
  const match = re.exec(html);
  if (match) {
    const listHtml = match[0];
    const liRe = /<li[^>]*>(.*?)<\/li>/gi;
    let liMatch;
    while ((liMatch = liRe.exec(listHtml)) !== null) {
      const q = liMatch[1].replace(/<[^>]+>/g, "").trim();
      if (q) questions.push(q);
    }
    const cleanHtml = html.replace(re, "");
    return { html: cleanHtml, questions };
  }
  return { html, questions };
}
