"""Prepare private PDF-only literature uploads from the official case archives."""
import hashlib
import io
import json
import re
from pathlib import Path
from zipfile import ZipFile
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / "backend/private"
SOURCE = ROOT.parent / "mechanistic_pkpd_benchmark"
UPLOADS = PRIVATE / "literature-pdfs"
UPLOADS.mkdir(parents=True, exist_ok=True)
packets = json.loads((PRIVATE / "case-packets.json").read_text())
records, objects = [], {}

def label(filename):
    text = Path(filename).stem
    text = re.sub(r"^(?:(?:CASE|GEN|SUPPORT|SUPLIT|CITED_REF|LIT|PMC)[A-Z0-9]*[_-]+)+", "", text)
    text = re.sub(r"[_-](?:fulltext|full_article|full_article_text|full|PDF)$", "", text, flags=re.I)
    return re.sub(r"_+", " ", text).strip()

for case in sorted(packets.values(), key=lambda c: c["number"]):
    archive = SOURCE / case["sourceRoot"] / "data_files/literature.zip"
    seen = set()
    with ZipFile(archive) as z:
        for entry in z.infolist():
            if entry.is_dir() or "__MACOSX" in entry.filename or not entry.filename.lower().endswith(".pdf"):
                continue
            data = z.read(entry)
            if not data.startswith(b"%PDF-"):
                raise ValueError(f"Not a PDF: {archive.name}/{entry.filename}")
            digest = hashlib.sha256(data).hexdigest()
            if digest in seen:
                continue
            seen.add(digest)
            if digest not in objects:
                pdf = PdfReader(io.BytesIO(data))
                if pdf.is_encrypted:
                    if pdf.decrypt("") == 0:
                        raise ValueError(f"Password-protected PDF: {entry.filename}")
                pages = len(pdf.pages)
                if pages < 1:
                    raise ValueError(f"Empty PDF: {entry.filename}")
                objects[digest] = {"path": digest + ".pdf", "bytes": len(data), "pages": pages}
                (UPLOADS / objects[digest]["path"]).write_bytes(data)
            filename = Path(entry.filename).name
            paper = {"id": digest[:32], "title": label(filename), "fileName": filename,
                     "bytes": len(data), "pages": objects[digest]["pages"], "sha256": digest}
            records.append({"case_id": case["id"], "paper_id": paper["id"],
                            "object_path": objects[digest]["path"], "meta": paper})

def sql_string(value):
    return "'" + value.replace("'", "''") + "'"

rows = ["(" + ",".join([sql_string(r["case_id"]), sql_string(r["paper_id"]),
                        sql_string(r["object_path"]), sql_string(json.dumps(r["meta"], ensure_ascii=False)) + "::jsonb"]) + ")" for r in records]
sql = "begin;\n" + (ROOT / "backend/supabase/migrations/202611130006_source_literature.sql").read_text()
sql += "\ninsert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pmxbench-literature','pmxbench-literature',false,26214400,ARRAY['application/pdf']) on conflict(id) do nothing;\n"
sql += "do $$ begin if exists(select 1 from storage.buckets where id='pmxbench-literature' and public) then raise exception 'Literature bucket must stay private'; end if; end $$;\n"
sql += "insert into public.pmx_literature(case_id,paper_id,object_path,meta) values\n" + ",\n".join(rows)
sql += "\non conflict(case_id,paper_id) do update set object_path=excluded.object_path,meta=excluded.meta;\ncommit;\nselect count(*) as paper_references,count(distinct case_id) as cases,count(distinct object_path) as unique_pdfs from pmx_literature;\n"
(PRIVATE / "literature-seed.sql").write_text(sql)
(PRIVATE / "literature-manifest.json").write_text(json.dumps({"papers": records, "objects": objects}, indent=2) + "\n")
print(json.dumps({"cases": len(packets), "paperReferences": len(records), "uniquePDFs": len(objects),
                  "storageMB": round(sum(o["bytes"] for o in objects.values()) / 1024**2, 2)}))
