"""
Document Review Tracking Data Processor
Processes "ASK Technical Document Log Report" Excel files,
extracts submissions by zm167dc@jutal.com, calculates review durations,
categorizes review times (<=10 days vs >10 days vs Pending),
and generates data.js for the interactive dashboard.
"""

import sys
import os
import re
import glob
import json
from pathlib import Path
import datetime
from datetime import datetime, timedelta, date
import openpyxl
import pandas as pd

def calc_working_days(d1, d2):
    if d1 is None or d2 is None: return None
    if d2 < d1: return 0
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
        return date(year, month, day)
    return date.min

def process_file(excel_path=None):
    if not excel_path:
        files = [f for f in glob.glob("ASK Technical Document Log Report*.xlsx") if not os.path.basename(f).startswith("~$")]
        if not files:
            print("Error: No 'ASK Technical Document Log Report' Excel file found in current folder.")
            return False
        files.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
        excel_path = files[0]

    print(f"Loading: {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb['Page 1']
    data = sheet.values
    for _ in range(9):
        next(data)
    headers = next(data)
    df = pd.DataFrame(data, columns=headers)

    # Filter contractor zm167dc@jutal.com
    j_df = df[df['Submitted By'].astype(str).str.contains('zm167dc@jutal.com', case=False, na=False)].copy()
    print(f"Found {len(j_df)} submissions from Contractor (zm167dc@jutal.com).")

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
            'submittal_id': str(row['Submittal ID'] or '').strip(),
            'doc_no': str(row['Document No.'] or '').strip(),
            'doc_title': str(row['Document Title'] or '').strip(),
            'rev': str(row['Rev.'] or '').strip(),
            'doc_category': str(row['Document Category'] or '').strip(),
            'discipline_code': str(row['Discipline Code'] or '').strip(),
            'discipline_name': str(row['Discipline Name'] or 'Unassigned').strip(),
            'doc_type_code': str(row['Doc Type Code'] or '').strip(),
            'doc_type_name': str(row['Doc Type Name'] or '').strip(),
            'actual_submit_in': str(row['Actual Submit In'] or '').strip(),
            'actual_submit_out': str(row['Actual Submit Out'] or '').strip(),
            'duration_days': dur_val,
            'category': row['category'],
            'status': str(row['Status'] or '').strip(),
            'return_status_code': str(row['Return Status Code'] or '').strip(),
            'return_status_name': str(row['Return Status Name'] or '').strip(),
            'area': str(row['Area'] or '').strip()
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
        # Fallback to latest record date
        valid_dates = [r['actual_submit_in'] for r in records if r.get('actual_submit_in')]
        report_date = sorted(valid_dates, reverse=True)[0] if valid_dates else "18-Sep-2026"

    out_path = Path("data.js")
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(f'window.TECH_REPORT_DATE = "{report_date}";\n')
        f.write('window.RAW_DATA = ' + json.dumps(records, ensure_ascii=False) + ';')

    print(f"-> Generated {out_path} with {len(records)} records (Report Date: {report_date}).")
    
    # Detailed category breakdown
    print("\n--- Document Category Breakdown ---")
    cat_counts = pd.Series([r['doc_category'] for r in records]).value_counts()
    print(cat_counts)
    
    part_b_records = [r for r in records if r['doc_category'] == 'Part B - Engineering Doc']
    b_w10 = sum(1 for r in part_b_records if r['category'] == '<= 10 Days')
    b_o10 = sum(1 for r in part_b_records if r['category'] == '> 10 Days')
    b_pend = sum(1 for r in part_b_records if r['category'] == 'Pending')
    b_comp = b_w10 + b_o10
    print(f"\n--- Part B - Engineering Doc (Focus) ---")
    print(f"Total: {len(part_b_records)}")
    print(f"Completed: {b_comp}")
    print(f"  - <= 10 Days: {b_w10} ({b_w10/b_comp*100:.1f}%)")
    print(f"  - > 10 Days:  {b_o10} ({b_o10/b_comp*100:.1f}%)")
    print(f"Pending: {b_pend} ({b_pend/len(part_b_records)*100:.1f}%)")
    return True

if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    process_file(arg)
