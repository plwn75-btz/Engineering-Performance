"""
ASK Vendor Document Review Tracking Data Processor
Processes "ASK Vendor Document Log Report" Excel files (.xls/.xlsx),
calculates review durations in Mon-Fri working days (<= 10 WD vs > 10 WD vs Pending),
and generates data/ask/vendor_data.js.
"""

import sys
import os
import re
import glob
import json
from pathlib import Path
from datetime import datetime, timedelta, date
import xlrd
import pandas as pd

def calc_working_days(d1, d2):
    if d1 is None or d2 is None: return None
    if d2 < d1: return 0
    cur = d1 + timedelta(days=1)
    work_days = 0
    while cur <= d2:
        if cur.weekday() < 5: work_days += 1
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

def process_ask_vendor_file(excel_path=None, output_dir="data/ask"):
    if not excel_path:
        files = glob.glob("archive_ask/*ASK Vendor Document Log Report*.xls*") + glob.glob("*ASK Vendor Document Log Report*.xls*")
        valid = [f for f in files if not os.path.basename(f).startswith("~$")]
        if not valid:
            print("Error: No ASK Vendor Document Log Report found.")
            return False
        valid.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
        excel_path = valid[0]

    print(f"Loading ASK Vendor Report: {excel_path}...")
    wb = xlrd.open_workbook(excel_path)
    sh = wb.sheet_by_name('Page 1')
    
    headers = [str(sh.cell_value(9, c)).strip() for c in range(sh.ncols)]
    data = []
    for r in range(10, sh.nrows):
        data.append([sh.cell_value(r, c) for c in range(sh.ncols)])
    
    df = pd.DataFrame(data, columns=headers)
    df = df.dropna(subset=['Document No.']).copy()
    j_df = df[df['Submitted By'].astype(str).str.contains('jutal.com', case=False, na=False)].copy()
    if len(j_df) == 0: j_df = df.copy()

    print(f"Total valid ASK vendor submittals: {len(j_df)}")

    j_df['in_dt'] = pd.to_datetime(j_df['Actual Submit In'], format='%d-%b-%Y %H:%M:%S', errors='coerce')
    j_df['out_dt'] = pd.to_datetime(j_df['Actual Submit Out'], format='%d-%b-%Y %H:%M:%S', errors='coerce')

    def compute_duration(row):
        if pd.isna(row['in_dt']) or pd.isna(row['out_dt']): return None
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
        records.append({
            'submittal_id': str(row.get('Submittal ID', '') or '').strip(),
            'doc_no': str(row.get('Document No.', '') or '').strip(),
            'doc_title': str(row.get('Document Title', '') or '').strip(),
            'rev': str(row.get('Rev.', '') or '').strip(),
            'asset_doctype': str(row.get('Asset Doctype', '') or 'Vendor Document').strip(),
            'doc_category': str(row.get('Document Category', '') or 'Part D - Vendor Doc').strip(),
            'vendor_package_code': str(row.get('Vendor Package Code', '') or '').strip(),
            'vendor_package_name': str(row.get('Vendor Package Name', '') or 'General').strip(),
            'discipline_code': str(row.get('Discipline Code', '') or '').strip(),
            'discipline_name': str(row.get('Discipline Name', '') or 'Unassigned').strip(),
            'doc_type_code': str(row.get('Doc Type Code', '') or '').strip(),
            'doc_type_name': str(row.get('Doc Type Name', '') or '').strip(),
            'actual_submit_in': str(row.get('Actual Submit In', '') or '').strip(),
            'actual_submit_out': str(row.get('Actual Submit Out', '') or '').strip(),
            'duration_days': dur_val,
            'category': row['category'],
            'status': str(row.get('Status', '') or '').strip(),
            'return_status_code': str(row.get('Return Status Code', '') or '').strip(),
            'return_status_name': str(row.get('Return Status Name', '') or '').strip(),
            'submitted_by': str(row.get('Submitted By', '') or '').strip(),
            'area': str(row.get('Area', '') or '').strip()
        })

    m = re.search(r'(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})', os.path.basename(excel_path))
    report_date = f"{m.group(1).zfill(2)}-{m.group(2).capitalize()}-{m.group(3)}" if m else "25-Sep-2026"

    os.makedirs(output_dir, exist_ok=True)
    out_path = Path(output_dir) / "vendor_data.js"
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'window.VENDOR_REPORT_DATE = "{report_date}";\n')
        f.write(f'window.ASK_VENDOR_REPORT_DATE = "{report_date}";\n')
        f.write('window.RAW_VENDOR_DATA = ' + json.dumps(records, ensure_ascii=False) + ';')

    print(f"-> Generated {out_path} with {len(records)} records (Report Date: {report_date}).")
    return True

if __name__ == '__main__':
    process_ask_vendor_file()
