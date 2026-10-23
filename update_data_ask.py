"""
ASK Technical Document Review Tracking Data Processor
Processes "ASK Technical Document Log Report" Excel files (.xlsx),
calculates review durations in Mon-Fri working days (<= 10 WD vs > 10 WD vs Pending),
and generates data/ask/data.js.
"""

import sys
import os
import re
import glob
import json
from pathlib import Path
from datetime import datetime, timedelta, date
import openpyxl
import pandas as pd

def calc_working_days(d1, d2):
    if d1 is None or d2 is None: return None
    if d2 < d1: return 0
    cur = d1 + timedelta(days=1)
    work_days = 0
    while cur <= d2:
        if cur.weekday() < 5:
            work_days += 1
        cur += timedelta(days=1)
    return work_days

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def extract_file_date_obj(filename):
    match = re.search(r'(\d{1,2})[\s\-_]+([A-Za-z]{3})[\s\-_]+(\d{2,4})', filename)
    if match:
        day = int(match.group(1))
        month_str = match.group(2).lower()
        year = int(match.group(3))
        if year < 100: year += 2000
        month = MONTH_MAP.get(month_str, 1)
        return date(year, month, day)
    return date.min

def attribute_ask_work_package(doc_no, area, disc_name):
    doc_u = str(doc_no or '').upper()
    area_u = str(area or '').upper()
    disc_u = str(disc_name or '').upper()

    if 'WP01' in area_u or '-WP01-' in doc_u or '-1A-' in doc_u:
        if 'STR' in doc_u or 'STRUCTURAL' in disc_u or 'NAVAL' in disc_u:
            return 'WP01 JACKET'
        return 'WP01 TOPSIDE'
    if 'WP02' in area_u or '-WP02-' in doc_u or '-1B-' in doc_u:
        if 'STR' in doc_u or 'STRUCTURAL' in disc_u or 'NAVAL' in disc_u:
            return 'WP02 JACKET'
        return 'WP02 TOPSIDE'

    if 'JACKET' in disc_u: return 'WP01 JACKET'
    if 'TOPSIDE' in disc_u: return 'WP01 TOPSIDE'
    return 'General & Multi-Discipline'

def process_ask_tech_file(excel_path=None, output_dir="."):
    if not excel_path:
        # Search in main directory first, fallback to archive_ask
        files = glob.glob("*ASK Technical Document Log Report*.xlsx") + glob.glob("archive_ask/*ASK Technical Document Log Report*.xlsx")
        valid = [f for f in files if not os.path.basename(f).startswith("~$")]
        if not valid:
            print("Error: No ASK Technical Document Log Report found in main folder.")
            return False
        valid.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
        excel_path = valid[0]

    print(f"Loading ASK Technical Log: {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb['Page 1']
    data = sheet.values
    for _ in range(9): next(data)
    headers = next(data)
    df = pd.DataFrame(data, columns=headers)

    # Filter contractor zm167dc@jutal.com or jutal.com
    df = df.dropna(subset=['Document No.']).copy()
    j_df = df[df['Submitted By'].astype(str).str.contains('zm167dc@jutal.com|jutal.com', case=False, na=False)].copy()
    if len(j_df) == 0:
        j_df = df.copy()

    print(f"Total valid ASK submittals: {len(j_df)}")

    j_df['in_dt'] = pd.to_datetime(j_df['Actual Submit In'], format='%d-%b-%Y %H:%M:%S', errors='coerce')
    j_df['out_dt'] = pd.to_datetime(j_df['Actual Submit Out'], format='%d-%b-%Y %H:%M:%S', errors='coerce')

    def compute_duration(row):
        if pd.isna(row['in_dt']) or pd.isna(row['out_dt']):
            return None
        return calc_working_days(row['in_dt'].date(), row['out_dt'].date())

    j_df['duration_days'] = j_df.apply(compute_duration, axis=1)

    def get_category(row):
        dur = row['duration_days']
        if pd.isna(dur): return 'Pending'
        if dur <= 10: return '<= 10 Days'
        return '> 10 Days'

    j_df['category'] = j_df.apply(get_category, axis=1)

    records = []
    for _, row in j_df.iterrows():
        dur = row['duration_days']
        dur_val = int(dur) if pd.notna(dur) else None
        doc_no = str(row['Document No.'] or '').strip().replace('\u2010', '-')
        area = str(row['Area'] or '').strip()
        disc_name = str(row['Discipline Name'] or 'Unassigned').strip()
        cat = str(row['Document Category'] or '').strip()
        sub_by = str(row['Submitted By'] or '').strip()

        contractor = attribute_ask_work_package(doc_no, area, disc_name)

        records.append({
            'submittal_id': str(row['Submittal ID'] or '').strip(),
            'doc_no': doc_no,
            'doc_title': str(row['Document Title'] or '').strip(),
            'rev': str(row['Rev.'] or '').strip(),
            'doc_category': cat,
            'contractor': contractor,
            'discipline_code': str(row['Discipline Code'] or '').strip(),
            'discipline_name': disc_name,
            'doc_type_code': str(row['Doc Type Code'] or '').strip(),
            'doc_type_name': str(row['Doc Type Name'] or '').strip(),
            'actual_submit_in': str(row['Actual Submit In'] or '').strip(),
            'actual_submit_out': str(row['Actual Submit Out'] or '').strip(),
            'duration_days': dur_val,
            'category': row['category'],
            'status': str(row['Status'] or '').strip(),
            'return_status_code': str(row['Return Status Code'] or '').strip(),
            'return_status_name': str(row['Return Status Name'] or '').strip(),
            'submitted_by': sub_by,
            'area': area
        })

    m = re.search(r'(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})', os.path.basename(excel_path))
    report_date = f"{m.group(1).zfill(2)}-{m.group(2).capitalize()}-{m.group(3)}" if m else "25-Sep-2026"

    # Save directly to ask_data.js in main folder
    out_main = Path("ask_data.js")
    with open(out_main, 'w', encoding='utf-8') as f:
        f.write(f'window.TECH_REPORT_DATE = "{report_date}";\n')
        f.write(f'window.ASK_TECH_REPORT_DATE = "{report_date}";\n')
        f.write('window.RAW_DATA = ' + json.dumps(records, ensure_ascii=False) + ';')

    # Also sync to output_dir/data.js if specified and different
    if output_dir and output_dir != ".":
        os.makedirs(output_dir, exist_ok=True)
        with open(Path(output_dir) / "data.js", 'w', encoding='utf-8') as f:
            f.write(f'window.TECH_REPORT_DATE = "{report_date}";\n')
            f.write(f'window.ASK_TECH_REPORT_DATE = "{report_date}";\n')
            f.write('window.RAW_DATA = ' + json.dumps(records, ensure_ascii=False) + ';')

    print(f"-> Generated {out_main} with {len(records)} records (Report Date: {report_date}).")
    return True

if __name__ == '__main__':
    process_ask_tech_file()
