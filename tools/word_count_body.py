# Body word count of a .docx (excludes tables, figure/table captions and the reference list).
# Usage: python tools/word_count_body.py manuscript/M2_manuscript_draft.docx
import re, sys, zipfile
x = zipfile.ZipFile(sys.argv[1]).read("word/document.xml").decode("utf8")
x = re.sub(r"<w:tbl>.*?</w:tbl>", "", x, flags=re.S)
paras = ["".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)) for p in re.findall(r"<w:p[ >].*?</w:p>", x, flags=re.S)]
paras = [p for p in paras if p.strip()]
ref = next(i for i, p in enumerate(paras) if p.strip() == "References")
body = [p for p in paras[:ref] if not re.match(r"^(Table|Fig\.) \d+\. ", p)]
title = body[:5]
n = lambda ps: sum(len(p.split()) for p in ps)
print("body words (incl. title block):", n(body), "| title block:", n(title), "| body without title block:", n(body) - n(title))
