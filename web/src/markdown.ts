import MarkdownIt from 'markdown-it';

/**
 * 关闭原始 HTML，只渲染 Markdown 语法本身：
 * 既避免了粘贴内容里夹带脚本，也让渲染结果完全由这个实例生成。
 * breaks 打开是因为记事本里换行就该换行，不必写两个空格。
 */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const defaultLinkOpen =
  md.renderer.rules.link_open ??
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank');
  tokens[idx].attrSet('rel', 'noopener noreferrer');
  return defaultLinkOpen(tokens, idx, options, env, self);
};

export function renderMarkdown(source: string): string {
  return md.render(source);
}
