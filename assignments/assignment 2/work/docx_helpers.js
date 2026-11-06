// Shared helpers for the Assignment 2 Word documents (report and viva guide).
// Style: black text and headings only, no header or footer, Times New Roman.
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ImageRun,
  AlignmentType, BorderStyle, LevelFormat, HeadingLevel, TableLayoutType, VerticalAlign, ShadingType,
} = require("docx");

const FONT = "Times New Roman", MONO = "Consolas", BLACK = "000000";

function makeHelpers(cfg = {}) {
  const BODY = cfg.body || 22, SMALL = cfg.small || 18, CAP = cfg.cap || 19, LINE = cfg.line || 252;
  let tableNo = 0, figNo = 0;

  // inline markup: **bold**  *italic*  `code`  _{sub}  ^{sup}
  function runs(text, o = {}) {
    const size = o.size || BODY;
    const parts = String(text).split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|_\{[^}]+\}|\^\{[^}]+\})/g).filter(Boolean);
    return parts.map((p) => {
      const base = { font: FONT, size, color: BLACK, bold: o.bold, italics: o.italics };
      if (p.startsWith("**")) return new TextRun({ ...base, text: p.slice(2, -2), bold: true });
      if (p.startsWith("*")) return new TextRun({ ...base, text: p.slice(1, -1), italics: true });
      if (p.startsWith("`")) return new TextRun({ ...base, text: p.slice(1, -1), font: MONO, size: size - 3 });
      if (p.startsWith("_{")) return new TextRun({ ...base, text: p.slice(2, -1), subScript: true });
      if (p.startsWith("^{")) return new TextRun({ ...base, text: p.slice(2, -1), superScript: true });
      return new TextRun({ ...base, text: p });
    });
  }
  const P = (t, o = {}) => new Paragraph({
    children: runs(t, o), alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { after: o.after ?? 100, before: o.before ?? 0, line: LINE }, keepNext: o.keepNext, indent: o.indent,
  });
  const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t })], keepNext: true });
  const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })], keepNext: true });
  const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t })], keepNext: true });
  const BUL = (t, o = {}) => new Paragraph({ numbering: { reference: "bullets", level: o.level || 0 }, children: runs(t, o),
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 40, line: LINE } });
  const NUM = (t, ref = "numbers") => new Paragraph({ numbering: { reference: ref, level: 0 }, children: runs(t),
    alignment: AlignmentType.JUSTIFIED, spacing: { after: 40, line: LINE } });

  const RULE = (sz) => ({ style: BorderStyle.SINGLE, size: sz, color: BLACK });
  const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  function tcell(text, width, o) {
    return new TableCell({
      width: { size: width, type: WidthType.DXA },
      borders: { top: o.top ? RULE(o.top) : NONE, bottom: o.bottom ? RULE(o.bottom) : NONE, left: NONE, right: NONE },
      margins: { top: 20, bottom: 20, left: 60, right: 60 }, verticalAlign: VerticalAlign.CENTER,
      shading: o.shade ? { type: ShadingType.CLEAR, color: "auto", fill: "EDEDED" } : undefined,
      children: [new Paragraph({ children: runs(text, { size: o.size || SMALL, bold: o.bold }), alignment: o.align,
        spacing: { after: 0, line: 228 }, keepNext: o.keepNext })],
    });
  }
  // three-rule table; widths in DXA; align: string like "lccr" (one letter per column)
  function table(caption, headers, rows, widths, align, note, o = {}) {
    tableNo += 1;
    const al = (i) => ({ l: AlignmentType.LEFT, c: AlignmentType.CENTER, r: AlignmentType.RIGHT }[(align || "")[i] || (i ? "c" : "l")]);
    const total = widths.reduce((a, b) => a + b, 0);
    const out = [];
    if (caption) out.push(new Paragraph({ children: [new TextRun({ text: `Table ${tableNo}. `, bold: true, font: FONT, size: CAP }), ...runs(caption, { size: CAP })],
      keepNext: true, spacing: { before: 100, after: 60 }, alignment: AlignmentType.LEFT }));
    out.push(new Table({
      layout: TableLayoutType.FIXED, width: { size: total, type: WidthType.DXA }, columnWidths: widths,
      alignment: AlignmentType.CENTER,
      borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => tcell(h, widths[i], { top: 12, bottom: 6, bold: true, align: al(i), keepNext: true, size: o.size })) }),
        ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((c, i) => tcell(c, widths[i], {
          bottom: k === rows.length - 1 ? 12 : (o.lines ? 2 : 0), align: al(i), keepNext: o.keep !== false && (k < rows.length - 1 || Boolean(note)),
          size: o.size, bold: (o.boldRows || []).includes(k), shade: (o.shadeRows || []).includes(k) })) })),
      ],
    }));
    out.push(note ? new Paragraph({ children: runs(note, { size: SMALL }), spacing: { before: 40, after: 120 }, alignment: AlignmentType.JUSTIFIED })
                  : new Paragraph({ children: [], spacing: { after: 60 } }));
    return out;
  }

  function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }
  function figure(file, caption, widthIn = 6.2) {
    figNo += 1;
    const buf = fs.readFileSync(file);
    const { w, h } = pngSize(buf);
    const wpx = Math.round(widthIn * 96), hpx = Math.round(wpx * h / w);
    return [
      new Paragraph({ children: [new ImageRun({ type: "png", data: buf, transformation: { width: wpx, height: hpx },
        altText: { title: `Figure ${figNo}`, description: caption.replace(/[*`_^{}]/g, ""), name: path.basename(file) } })],
        alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 60, after: 40 } }),
      new Paragraph({ children: [new TextRun({ text: `Figure ${figNo}. `, bold: true, font: FONT, size: CAP }), ...runs(caption, { size: CAP })],
        alignment: AlignmentType.JUSTIFIED, spacing: { after: 140 }, keepLines: true }),
    ];
  }

  const heading = (id, name, size, opts = {}) => ({
    id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
    run: { font: FONT, size, bold: true, italics: opts.italics, color: BLACK },
    paragraph: { spacing: { before: opts.before, after: opts.after }, outlineLevel: opts.level, keepNext: true },
  });

  function build(outFile, meta, body, margins = 1080) {
    const doc = new Document({
      creator: meta.creator, title: meta.title,
      styles: {
        default: { document: { run: { font: FONT, size: BODY, color: BLACK } } },
        paragraphStyles: [
          heading("Heading1", "Heading 1", cfg.h1 || 26, { before: 200, after: 80, level: 0 }),
          heading("Heading2", "Heading 2", cfg.h2 || 22, { before: 140, after: 60, level: 1 }),
          heading("Heading3", "Heading 3", cfg.h3 || 21, { before: 100, after: 40, level: 2, italics: true }),
        ],
      },
      numbering: {
        config: [
          { reference: "bullets", levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 220 } }, run: { color: BLACK } } },
            { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 220 } }, run: { color: BLACK } } }] },
          ...["numbers", "numbers2", "numbers3"].map((reference) => ({ reference, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 360, hanging: 260 } }, run: { color: BLACK } } }] })),
        ],
      },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: margins, right: margins, bottom: margins, left: margins } } },
        children: body,
      }],
    });
    return Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(outFile, buf); console.log(`wrote ${outFile}: ${tableNo} tables, ${figNo} figures`); });
  }

  return { runs, P, H1, H2, H3, BUL, NUM, table, figure, build, AlignmentType, Paragraph, TextRun };
}

module.exports = { makeHelpers };
