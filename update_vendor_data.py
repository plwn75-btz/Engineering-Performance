"""
Vendor Document Review Tracking Data Processor
Processes "ASK Vendor Document Log Report" Excel files (.xls/.xlsx),
extracts submissions by contractor (zm167dc@jutal.com, supaporns@jutal.com),
calculates review durations in working days (<= 10 WD vs > 10 WD vs Pending),
and generates vendor_data.js for the interactive dashboard.
"""

import sys
import os
import re
import glob
import json
from pathlib import Path
from datetime import datetime, timedelta
import xlrd
import pandas as pd

def calc_working_days(d1, d2):
    if d1 is None or d2 is None:
        return None
    if d2 < d1:
        return 0
    cur = d1 + timedelta(days=1)
    work_days = 0
    while cur <= d2:
        if cur.weekday() < 5:  # Monday to Friday (0-4)
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
        from datetime import date
        return date(year, month, day)
    from datetime import date
    return date.min

def process_vendor_file(excel_path=None):
    if not excel_path:
        files = [f for f in glob.glob("ASK Vendor Document Log Report*.xls*") if not os.path.basename(f).startswith("~$")]
        if not files:
            print("Error: No 'ASK Vendor Document Log Report' Excel file found in current folder.")
            return False
        files.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
        excel_path = files[0]

    print(f"Loading Vendor Report: {excel_path}...")
    wb = xlrd.open_workbook(excel_path)
    sh = wb.sheet_by_name('Page 1')
    
    # Header is at row index 9
    headers = [str(sh.cell_value(9, c)).strip() for c in range(sh.ncols)]
    data = []
    for r in range(10, sh.nrows):
        data.append([sh.cell_value(r, c) for c in range(sh.ncols)])
    
    df = pd.DataFrame(data, columns=headers)
    print(f"Total raw rows in vendor report: {len(df)}")

    # All submissions in this report are from Jutal contractor (zm167dc / supaporns)
    # If filtered by @jutal.com:
    j_df = df[df['Submitted By'].astype(str).str.contains('jutal.com', case=False, na=False)].copy()
    if len(j_df) == 0:
        j_df = df.copy()  # fallback if no jutal emails
    print(f"Found {len(j_df)} submissions from Contractor (Jutal).")

    j_df['in_dt'] = pd.to_datetime(j_df['Actual Submit In'], format='%d-%b-%Y %H:%M:%S', errors='coerce')
    j_df['out_dt'] = pd.to_datetime(j_df['Actual Submit Out'], format='%d-%b-%Y %H:%M:%S', errors='coerce')

    def compute_duration(row):
        if pd.isna(row['in_dt']) or pd.isna(row['out_dt']):
            return None
        return calc_working_days(row['in_dt'].date(), row['out_dt'].date())

    j_df['duration_days'] = j_df.apply(compute_duration, axis=1)

    def get_category(row):
        dur = row['duration_days']
        if pd.isna(dur):
            return 'Pending'
        if dur <= 10:
            return '<= 10 Days'
        else:
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
            'doc_category': str(row.get('Document Category', '') or 'Vendor Document').strip(),
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

    # Extract report date from filename or records
    base_name = Path(excel_path).name
    m = re.search(r'(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{2,4})', base_name)
    if m:
        day = m.group(1).zfill(2)
        mon = m.group(2).capitalize()
        yr = m.group(3)
        if len(yr) == 2: yr = "20" + yr
        report_date = f"{day}-{mon}-{yr}"
    else:
        valid_dates = [r['actual_submit_in'] for r in records if r.get('actual_submit_in')]
        report_date = sorted(valid_dates, reverse=True)[0] if valid_dates else "18-Sep-2026"

    out_path = Path("vendor_data.js")
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'window.VENDOR_REPORT_DATE = "{report_date}";\n')
        f.write('window.RAW_VENDOR_DATA = ' + json.dumps(records, ensure_ascii=False) + ';')

    print(f"-> Generated {out_path} with {len(records)} records (Report Date: {report_date}).")

    # Summary
    completed = [r for r in records if r['category'] != 'Pending']
    w10 = [r for r in completed if r['category'] == '<= 10 Days']
    o10 = [r for r in completed if r['category'] == '> 10 Days']
    pending = [r for r in records if r['category'] == 'Pending']
    
    print("\n--- Vendor Document Performance Summary ---")
    print(f"Total Submissions: {len(records)}")
    print(f"Completed Reviews: {len(completed)}")
    if completed:
        avg_wd = sum(r['duration_days'] for r in completed) / len(completed)
        print(f"  - Within 10 Working Days (Meet Agreement): {len(w10)} ({len(w10)/len(completed)*100:.1f}%)")
        print(f"  - Over 10 Working Days (Over Agreement):   {len(o10)} ({len(o10)/len(completed)*100:.1f}%)")
        print(f"  - Avg Review Duration: {avg_wd:.1f} Working Days")
    print(f"Pending Client Reviews: {len(pending)} ({len(pending)/len(records)*100:.1f}%)")
    
    print("\n--- Vendor Package Breakdown ---")
    pkg_counts = pd.Series([r['vendor_package_name'] for r in records]).value_counts()
    print(pkg_counts.head(10))

    print("\n--- Discipline Breakdown ---")
    disc_counts = pd.Series([r['discipline_name'] for r in records]).value_counts()
    print(disc_counts)
    return True

if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    process_vendor_file(arg)
