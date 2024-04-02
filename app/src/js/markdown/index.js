export async function htmlToMarkdown(html) {
  const { default: TurndownService } = await import("turndown");
  const { gfm, tables } = await import("turndown-plugin-gfm");
  const turndownService = new TurndownService();
  turndownService.use([gfm, tables]);
  const md = turndownService.turndown(html);
  return md;
}

export async function markdownToHtml(markdown) {
  const showdown = await import("showdown");
  const converter = new showdown.Converter();
  converter.setFlavor("github");
  const html = converter.makeHtml(markdown);
  return html;
}
