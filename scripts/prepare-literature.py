"""Prepare curator-designated primary PDFs; retain background source history."""
import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / 'backend/private'
SOURCES = ROOT.parent / 'mechanistic_pkpd_benchmark/case_summary_cards_source'
UPLOADS = PRIVATE / 'key-literature-pdfs'
UPLOADS.mkdir(parents=True, exist_ok=True)
manifest = json.loads((SOURCES / 'manifest.json').read_text())
packets = json.loads((PRIVATE / 'case-packets.json').read_text())
by_slug = {p['slug']: p for p in packets.values()}
prior = PRIVATE / 'literature-manifest.json'
old_titles = {(p['case_id'], p['paper_id']): p['meta']['title'] for p in json.loads(prior.read_text())['papers']} if prior.exists() else {}
records, objects = [], {}
for case in manifest['cases']:
    packet = by_slug[case['case_id']]
    assert packet['sourceRoot'].endswith(case['track'] + '/' + case['case_id'])
    for order, source in enumerate(case['source_files'], 1):
        file = SOURCES / case['track'] / case['case_id'] / source['file']
        data = file.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        assert digest == source['sha256'], f'Primary PDF changed: {file}'
        assert data.startswith(b'%PDF-')
        reader = PdfReader(file)
        if reader.is_encrypted:
            assert reader.decrypt('') != 0
        assert len(reader.pages) == source['pages']
        assert len(data) == source['bytes'] and len(data) <= 25 * 1024**2
        title = re.sub(r'^SOURCE_FILE(?:_\d+)?__', '', file.stem).replace('_', ' ')
        paper_id = digest[:32]
        title = old_titles.get((packet['id'], paper_id), title)
        paper = {'id': paper_id, 'title': title, 'fileName': file.name,
                 'bytes': len(data), 'pages': len(reader.pages), 'sha256': digest,
                 'keySource': True, 'sourceOrder': order}
        records.append({'case_id': packet['id'], 'paper_id': paper_id,
                        'object_path': digest + '.pdf', 'meta': paper})
        objects[digest] = {'path': digest + '.pdf', 'bytes': len(data), 'pages': len(reader.pages)}
        (UPLOADS / (digest + '.pdf')).write_bytes(data)

def literal(value):
    return "'" + value.replace("'", "''") + "'"
rows = ['(' + ','.join([literal(r['case_id']), literal(r['paper_id']), literal(r['object_path']), literal(json.dumps(r['meta'])) + '::jsonb', 'true']) + ')' for r in records]
sql = 'begin;\n' + (ROOT / 'backend/supabase/migrations/202611150007_case_material_guides.sql').read_text()
sql += "\ninsert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pmxbench-literature','pmxbench-literature',false,26214400,ARRAY['application/pdf']) on conflict(id) do nothing;\n"
sql += "do $$ begin if exists(select 1 from storage.buckets where id='pmxbench-literature' and public) then raise exception 'Literature bucket must stay private'; end if; end $$;\n"
sql += 'insert into pmx_literature(case_id,paper_id,object_path,meta,is_key_source) values\n' + ',\n'.join(rows)
sql += '\non conflict(case_id,paper_id) do update set object_path=excluded.object_path,meta=excluded.meta,is_key_source=true;\ncommit;\n'
sql += 'select count(*) as key_source_references,count(distinct case_id) as cases,count(distinct object_path) as unique_key_pdfs from pmx_literature where is_key_source;\n'
(PRIVATE / 'key-literature-seed.sql').write_text(sql)
(PRIVATE / 'key-literature-manifest.json').write_text(json.dumps({'papers': records, 'objects': objects}, indent=2) + '\n')
print(json.dumps({'cases': len(manifest['cases']), 'keyReferences': len(records), 'uniquePDFs': len(objects), 'MB': round(sum(o['bytes'] for o in objects.values())/1024**2, 2)}))
