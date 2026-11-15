"""Build private reviewer descriptions from actual staged tables and contracts.

Only descriptive profiles and field definitions are emitted; no observation or
subject rows, executable files, raw contracts, or summary cards are published.
"""
import csv
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
PRIVATE = ROOT / 'backend/private'
SOURCE = ROOT.parent / 'mechanistic_pkpd_benchmark'
PACKETS = json.loads((PRIVATE / 'case-packets.json').read_text())


def read_csv(path):
    with path.open(encoding='utf-8-sig', newline='') as file:
        reader = csv.DictReader(file)
        fields = reader.fieldnames or []
        rows = [{k: (v or '').strip() for k, v in row.items() if k is not None} for row in reader]
    return fields, rows


def pick(row, names, default=''):
    return next((str(row[n]).strip() for n in names if row.get(n)), default)


def counts(rows, field):
    return Counter(row.get(field, '') for row in rows if row.get(field, ''))


def counted(counter, limit=10):
    items = counter.most_common()
    text = '; '.join(f'{value} ({n:,} rows)' for value, n in items[:limit])
    return text + (f'; {len(items)-limit} additional categories' if len(items) > limit else '')


def numbers(rows, field):
    out = []
    for row in rows:
        try:
            value = float(row.get(field, ''))
            if value == value and abs(value) != float('inf'):
                out.append(value)
        except (ValueError, TypeError):
            pass
    return out


def number(value):
    return f'{value:,.6g}'


def time_profile(fields, rows):
    field = next((f for f in ['time', 'requested_time', 'time_day', 'event_time', 'start_time', 'time_hr', 'time_h'] if f in fields), None)
    if not field:
        return ''
    unit_field = next((f for f in ['time_unit', 'time_units'] if f in fields), None)
    groups = defaultdict(list)
    for row in rows:
        unit = row.get(unit_field, '') if unit_field else ('day' if field == 'time_day' else 'units as defined in the dictionary')
        for value in numbers([row], field):
            groups[unit].append(value)
    if not groups:
        return f'The {field} column has no numeric time entries; interpret aggregate or untimed endpoints using their definitions.'
    prefix = f'Numeric {field} entries are supplied for {sum(len(v) for v in groups.values()):,}/{len(rows):,} rows. Their staged ranges are: '
    return prefix + '; '.join(f'{number(min(values))} to {number(max(values))} {unit or "(unit not supplied)"}' for unit, values in groups.items()) + '. Values are summarized in their staged units.'


def definition(row):
    return pick(row, ['definition', 'description', 'analytical_use', 'analysis_role', 'analytical_role'], 'The dictionary does not provide a field-specific definition.')


def dictionary_index(rows):
    index = {}
    for row in rows:
        file = Path(pick(row, ['file', 'file_name'])).name
        variable = pick(row, ['variable', 'variable_name', 'column', 'column_name'])
        if file and variable:
            index[(file, variable)] = row
    return index


def field_details(name, field, rows, dictionary, index):
    declared = index.get((name, field), {})
    text = f'{field} — {definition(declared)}'
    for label, keys in [('Units / domain', ['unit_or_domain', 'units_or_domain', 'unit_or_allowed_values', 'unit_or_format', 'unit']),
                        ('Allowed values / scale', ['allowed_values', 'allowed_values_or_range', 'allowed_values_or_rule', 'allowed_values_or_domain', 'allowed_values_or_missingness', 'allowed_or_format', 'scale_or_transform']),
                        ('Key / relationship', ['key_role', 'key_status', 'key_relationship', 'key_or_relationship']),
                        ('Requiredness', ['requiredness', 'required', 'required_column']),
                        ('Missing-value meaning', ['missing_value_semantics', 'missing_value_meaning', 'missingness_rule', 'missing_semantics'])]:
        value = pick(declared, keys)
        if value:
            text += f' {label}: {value}.'
    blank = sum(not row.get(field, '') for row in rows)
    text += f' Blank cells in this file: {blank:,} of {len(rows):,}.'
    return {'name': field, 'text': text, 'defined': bool(declared), 'blankCells': blank}


def endpoint_profile(fields, rows):
    key = next((f for f in ['endpoint', 'channel', 'observable'] if f in fields), None)
    if not key:
        return ''
    groups = defaultdict(list)
    for row in rows:
        groups[row.get(key) or '(blank endpoint)'].append(row)
    lines = []
    for endpoint, subset in sorted(groups.items()):
        units = sorted({pick(r, ['unit', 'output_unit', 'value_unit']) for r in subset} - {''})
        levels = sorted({pick(r, ['transform', 'scale', 'population_or_individual']) for r in subset} - {''})
        lines.append(f'{endpoint}: {len(subset):,} rows' + (f'; units: {", ".join(units)}' if units else '') + (f'; scale / prediction level: {", ".join(levels)}' if levels else ''))
    return '\n'.join(lines)


def flatten_text(value):
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return '\n'.join(flatten_text(v) for v in value)
    if isinstance(value, dict):
        return '\n'.join(f'{key.replace("_", " ")}: {flatten_text(v)}' for key, v in value.items())
    return str(value)


def block(blocks, id, label, text):
    if text:
        blocks.append({'id': id, 'label': label, 'text': text})


def make_table_guide(name, fields, rows, dictionary, index, contract):
    n = len(rows)
    roles = [(f, counts(rows, f)) for f in ['record_role', 'dataset_role', 'reporting_role', 'target_kind', 'target_type', 'event_role'] if f in fields]
    endpoints = next((counts(rows, f) for f in ['endpoint', 'channel', 'observable'] if f in fields), Counter())
    ids = [(f, len(counts(rows, f))) for f in ['subject_id', 'patient_id', 'study_id', 'dataset_id', 'protocol_id', 'context_id', 'scenario_id'] if f in fields and counts(rows, f)]
    ids_text = '; '.join(f'{count:,} distinct {field} values' for field, count in ids)
    prefix = f'{n:,} rows × {len(fields)} columns.'
    purpose = {
        'observed_data.csv': 'The measured endpoint evidence used to construct or assess the model in this case.',
        'prediction_targets.csv': 'The ordered reporting index specifying the predictions the submitted model must produce.',
        'treatment_events.csv': 'The executable treatment and intervention schedules that drive this case’s model inputs.',
        'dosing_events.csv': 'The administered-dose and intervention schedules that drive this case’s model inputs.',
        'subject_covariates.csv': 'The subject-level characteristics and grouping variables used to connect subjects with their model parameters and observations.',
        'covariate_events.csv': 'The staged changes in covariates over time, linked to the relevant subject and occasion.',
        'protocol.csv': 'The study, arm, and scenario context used to interpret the dose events, observations, and requested predictions.',
        'tissue_context.csv': 'The tissue, measurement, and physiological context needed to interpret the case’s observed quantities.',
        'darlow_regimen_links.csv': 'The explicit mapping from source study records to their applicable regimen context.',
        'study_design_metadata.csv': 'The study-design metadata defining the staged conditions and their interpretation.'
    }.get(name, 'Case-specific structured inputs supporting model construction and reporting.')
    summary = f'{purpose} {prefix}'
    if endpoints:
        top = endpoints.most_common(4)
        summary += ' Includes ' + ', '.join(f'{v} ({c:,} rows)' for v, c in top) + (f', plus {len(endpoints)-4} other endpoint types.' if len(endpoints)>4 else '.')
    if name == 'input_variable_dictionary.csv':
        described_files = sorted({Path(pick(r, ['file', 'file_name'])).name for r in rows} - {''})
        summary = f'{n:,} field-definition entries across {len(described_files)} staged files. It specifies the field meanings, unit domains, coding, keys, and missingness rules that the model must preserve.'
    blocks = []
    block(blocks, 'scope', 'Records and scope', ids_text + ('. ' if ids_text else '') + time_profile(fields, rows))
    if roles:
        block(blocks, 'roles', 'Assigned analytical roles', '\n'.join(f'{field}: {counted(counter, 30)}.' for field, counter in roles))
    evidence = []
    for field in ['data_kind', 'source_value_type', 'individual_or_aggregate', 'summary_statistic', 'observation_level', 'censoring_status', 'censoring_or_blq']:
        if field in fields and counts(rows, field):
            evidence.append(f'{field}: {counted(counts(rows, field), 12)}.')
    if evidence:
        block(blocks, 'evidence', 'Evidence type and reporting scale', '\n'.join(evidence))
    role = contract.get('input_files', {}).get(name)
    if isinstance(role, dict):
        role = '\n'.join(f'{k.replace("_", " ")}: {flatten_text(v)}' for k, v in role.items() if k not in ['columns', 'members'])
    block(blocks, 'use', 'How this file is used', role or '')
    if name == 'prediction_targets.csv':
        outputs = counts(rows, 'output_field')
        block(blocks, 'outputs', 'Requested output arrays', '\n'.join(f'{value}: {count:,} requested values' for value, count in outputs.items()))
        join_fields = [f for f in ['source_record_id', 'record_id', 'join_key', 'join_key_type', 'target_id', 'output_index'] if f in fields]
        block(blocks, 'order', 'Linking and order', 'Reporting keys: ' + ', '.join(join_fields) + '. Preserve the declared target-to-source linkage, output_field groups, and output_index order. Use each target’s stated prediction level, transformation, and units.' if join_fields else '')
    if name in ['treatment_events.csv', 'dosing_events.csv']:
        schedules = []
        for field in ['event_type', 'treatment', 'intervention_id', 'route', 'dose_unit', 'amount_unit', 'rate_unit', 'duration_unit', 'repeat_unit', 'event_role', 'application_rule', 'same_time_order', 'applies_once']:
            if field in fields and counts(rows, field):
                schedules.append(f'{field}: {counted(counts(rows, field), 15)}.')
        block(blocks, 'schedules', 'Regimens and event handling', '\n'.join(schedules))
        dose_ranges = []
        for value_field, unit_field in [('amount','amount_unit'),('dose_value','dose_unit'),('dose','dose_unit'),('rate','rate_unit'),('duration','duration_unit'),('repeat_every','repeat_unit'),('infusion_duration','duration_unit')]:
            if value_field not in fields:
                continue
            grouped = defaultdict(list)
            for row in rows:
                for value in numbers([row], value_field):
                    grouped[row.get(unit_field) or 'units per dictionary'].append(value)
            for unit, values in grouped.items():
                dose_ranges.append(f'{value_field}: {number(min(values))} to {number(max(values))} {unit} ({len(values)} numeric entries).')
        block(blocks, 'dose-ranges', 'Dose, rate, duration and repetition', '\n'.join(dose_ranges))
    if name == 'subject_covariates.csv':
        values = []
        for field in ['age', 'weight', 'height', 'body_surface_area', 'lean_body_mass', 'sex', 'SEX', 'WT', 'AGE']:
            if field not in fields:
                continue
            nums = numbers(rows, field)
            if nums:
                unit = sorted(counts(rows, field + '_unit'))
                values.append(f'{field}: {number(min(nums))} to {number(max(nums))}' + (' ' + ', '.join(unit) if unit else '; units follow the field dictionary'))
            elif len(counts(rows, field)) <= 10:
                values.append(f'{field}: {counted(counts(rows, field))}')
        block(blocks, 'covariates', 'Covariates supplied', '\n'.join(values))
    if name == 'input_variable_dictionary.csv':
        actual = []
        base = CURRENT_FOLDER
        for csv_file in sorted(base.glob('*.csv')):
            if csv_file.name == name:
                continue
            actual_fields, _ = read_csv(csv_file)
            missing = [f for f in actual_fields if (csv_file.name, f) not in index]
            actual.append(f'{csv_file.name}: {len(actual_fields)-len(missing)}/{len(actual_fields)} columns have matching dictionary entries' + (f'; unmatched: {", ".join(missing)}' if missing else '') + '.')
        block(blocks, 'coverage', 'Dictionary coverage', '\n'.join(actual))
    blank_fields = [(f, sum(not row.get(f, '') for row in rows)) for f in fields if any(word in f.lower() for word in ['uncertainty', 'lloq', 'censor', 'context_id'])]
    blank_fields = [(f, count) for f, count in blank_fields if count]
    block(blocks, 'missingness', 'Fields requiring missingness interpretation', '\n'.join(f'{f}: {count:,}/{n:,} blank cells.' for f, count in blank_fields) + (' Use the field-specific meaning below; a blank may represent unavailable or inapplicable source information.' if blank_fields else ''))
    ep = endpoint_profile(fields, rows)
    detail_fields = [field_details(name, f, rows, dictionary, index) for f in fields]
    for i, field in enumerate(detail_fields):
        field['id'] = f'field-{i}'
    return {'summary': summary, 'rows': n, 'columns': len(fields), 'blocks': blocks,
            'endpointCoverage': ep, 'fields': detail_fields}


def literal(value):
    return "'" + value.replace("'", "''") + "'"


guides, checks = {}, []
for case in sorted(PACKETS.values(), key=lambda c: c['number']):
    CURRENT_FOLDER = SOURCE / case['sourceRoot'] / 'data_files'
    contract = json.loads((CURRENT_FOLDER / 'model_construction_contract.json').read_text())
    _, dictionary = read_csv(CURRENT_FOLDER / 'input_variable_dictionary.csv')
    index = dictionary_index(dictionary)
    objective = contract.get('scientific_objective', contract.get('scientific_aim', ''))
    constraints = contract.get('scientific_constraints', {})
    scope = constraints.get('case_scope', '')
    boundary = constraints.get('claim_boundary', contract.get('claim_boundary', ''))
    if boundary and boundary not in scope:
        scope += ('\n' if scope else '') + flatten_text(boundary)
    guide = {'objective': flatten_text(objective), 'scope': scope, 'files': {}, 'inputHashes': {}}
    for material in case['materials']:
        name = material['name']
        file = CURRENT_FOLDER / name
        assert file.is_file(), f'Missing actual staged file: {file}'
        guide['inputHashes'][name] = hashlib.sha256(file.read_bytes()).hexdigest()
        if file.suffix == '.csv':
            fields, rows = read_csv(file)
            entry = make_table_guide(name, fields, rows, dictionary, index, contract)
        elif name == 'model_construction_contract.json':
            artifacts = contract.get('fixed_required_artifacts', contract.get('required_artifacts', []))
            if isinstance(artifacts, dict):
                artifacts = list(artifacts)
            blocks = []
            block(blocks, 'scope', 'Case-specific constraints', flatten_text(constraints))
            for key in ['observation_policy', 'event_policy', 'endpoint_policy', 'cohort_policy', 'claim_boundary', 'input_relationships']:
                if key in contract:
                    block(blocks, key, key.replace('_', ' ').capitalize(), flatten_text(contract[key]))
            initialization = contract.get('initialization_policy', {})
            block(blocks, 'initialization', 'Initialization and estimation', initialization.get('rule', '') if isinstance(initialization, dict) else flatten_text(initialization))
            block(blocks, 'artifacts', 'Required deliverables', '\n'.join(str(a) for a in artifacts))
            sensitivity = contract.get('sensitivity_analysis_framework', {})
            block(blocks, 'analysis', 'Required analysis scope', '\n'.join(flatten_text(sensitivity[k]) for k in ['scope', 'eligible_factors', 'factor_ranges', 'endpoints'] if k in sensitivity))
            entry = {'summary': f'The modeling and submission specification for this case. {flatten_text(objective)} It requires {len(artifacts)} named output artifacts and defines how the staged inputs can be used.', 'blocks': blocks, 'fields': [], 'requiredArtifacts': len(artifacts)}
        elif file.suffix == '.zip':
            with ZipFile(file) as z:
                members = [info for info in z.infolist() if not info.is_dir() and '__MACOSX' not in info.filename]
            kinds = Counter(Path(m.filename).suffix.upper().lstrip('.') or 'OTHER' for m in members)
            role = contract.get('input_files', {}).get(name, '')
            if isinstance(role, dict):
                role = role.get('role', '')
            entry = {'summary': f'The participant-supplied supporting-source archive for this case: {len(members)} files ({", ".join(f"{n} {kind}" for kind,n in sorted(kinds.items()))}). Its sources support the model-building decisions described in the contract.', 'blocks': [{'id':'use','label':'Role in model construction','text':role or 'Supporting scientific evidence supplied to the model builder.'}, {'id':'key-sources','label':'Key reference-model papers','text':'The curator-designated papers on which this case was based are available in Key literature. The staged archive is described here to show the supporting material supplied to the model builder.'}], 'fields': [], 'archiveFiles': len(members), 'archiveTypes': dict(kinds)}
        else:
            raise ValueError(f'Unrecognized staged material: {name}')
        guide['files'][name] = entry
    assert set(guide['files']) == {m['name'] for m in case['materials']}
    guide['revision'] = 'materials-' + hashlib.sha256(json.dumps(guide, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:24]
    guides[case['id']] = guide
    checks.append({'case': case['number'], 'files': len(guide['files']), 'csvRows': {name: d['rows'] for name, d in guide['files'].items() if 'rows' in d}})

sql = 'begin;\n'
for case_id, guide in guides.items():
    sql += 'insert into pmx_material_guides(case_id,payload) values(' + literal(case_id) + ',' + literal(json.dumps(guide, ensure_ascii=False)) + '::jsonb) on conflict(case_id) do update set payload=excluded.payload;\n'
sql += 'commit;\nselect count(*) as case_material_guides from pmx_material_guides;\n'
(PRIVATE / 'material-guides.json').write_text(json.dumps(guides, ensure_ascii=False, indent=2) + '\n')
# Keep browser-editor imports bounded and reviewable.
rows = sql.splitlines()
for start in range(0, len(guides), 10):
    part = ['begin;'] + rows[1+start:1+min(start+10,len(guides))] + ['commit;', 'select count(*) as case_material_guides from pmx_material_guides;']
    (PRIVATE / f'material-guides-part-{start//10+1}.sql').write_text('\n'.join(part)+'\n')
(PRIVATE / 'material-guides-checks.json').write_text(json.dumps(checks, indent=2)+'\n')
print(json.dumps({'cases':len(guides),'fileDescriptions':sum(len(g['files']) for g in guides.values()),'fieldDefinitions':sum(len(f.get('fields',[])) for g in guides.values() for f in g['files'].values()),'sqlParts':(len(guides)+9)//10}))
