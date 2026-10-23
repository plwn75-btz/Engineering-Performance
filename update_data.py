"""
Z1F Technical Document Review Tracking Data Processor
Processes "Z1F Technical Document Log Report" Excel files (.xlsx),
extracts all technical submittals, assigns Contractor work packages,
calculates review durations in Mon-Fri working days (<= 10 WD vs > 10 WD vs Pending),
and generates data.js for the interactive dashboard.
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

def load_known_deliverable_registers():
    """Builds sets of deliverable document numbers from the 4 EDSR/Progress workbooks."""
    registers = {
        'Jacket & Piles': set(),
        'Topside Structure': set(),
        'Topside without Structure': set(),
        'WP2 Pipeline': set()
    }
    
    # 1. Jacket EDSR
    j_files = glob.glob("*Jacket*EDSR*.xlsx") + glob.glob("16102026/*Jacket*EDSR*.xlsx")
    if j_files:
        try:
            wb = openpyxl.load_workbook(j_files[0], data_only=True)
            if 'EDSR' in wb.sheetnames:
                for r in wb['EDSR'].iter_rows(min_row=4):
                    c_doc = r[2]
                    if bool(c_doc.font and c_doc.font.strike): continue
                    d = str(c_doc.value or '').strip().upper()
                    if d.startswith('MM-ZTK'): registers['Jacket & Piles'].add(d)
        except Exception as e:
            print(f"Warning loading Jacket EDSR: {e}")

    # 2. Topside Structure EDSR
    t_files = glob.glob("*Topsides*EDSR*.xlsx") + glob.glob("16102026/*Topsides*EDSR*.xlsx")
    if t_files:
        try:
            wb = openpyxl.load_workbook(t_files[0], data_only=True)
            if 'EDSR' in wb.sheetnames:
                for r in wb['EDSR'].iter_rows(min_row=4):
                    c_doc = r[3]
                    if bool(c_doc.font and c_doc.font.strike): continue
                    d = str(c_doc.value or '').strip().upper()
                    if d.startswith('MM-ZTK'): registers['Topside Structure'].add(d)
        except Exception as e:
            print(f"Warning loading Topside Structure EDSR: {e}")

    # 3. Topside without Structure (00210 EDSR)
    w_files = glob.glob("*00210*EDSR*.xlsm") + glob.glob("16102026/*00210*EDSR*.xlsm")
    if w_files:
        try:
            wb = openpyxl.load_workbook(w_files[0], read_only=True, data_only=True)
            if 'DEL' in wb.sheetnames:
                for r in wb['DEL'].iter_rows(min_row=2, max_col=2, values_only=True):
                    d = str(r[0] or '').strip().upper()
                    if d.startswith('MM-ZTK'): registers['Topside without Structure'].add(d)
        except Exception as e:
            print(f"Warning loading Topside without Structure EDSR: {e}")

    # 4. WP2 Pipeline Progress
    p_files = glob.glob("*WP2*Progress*.xlsx") + glob.glob("16102026/*WP2*Progress*.xlsx")
    if p_files:
        try:
            wb = openpyxl.load_workbook(p_files[0], read_only=True, data_only=True)
            if 'MDR-Detailed Design-A10' in wb.sheetnames:
                for r in wb['MDR-Detailed Design-A10'].iter_rows(min_row=11, max_col=10, values_only=True):
                    d = str(r[8] or '').strip().upper()
                    if d.startswith('MM-ZTK'): registers['WP2 Pipeline'].add(d)
        except Exception as e:
            print(f"Warning loading WP2 Progress: {e}")

    return registers

def attribute_contractor(doc_no, area, disc_name, cat, submitted_by, registers):
    d_norm = str(doc_no or '').strip().upper().replace('\u2010', '-')
    
    # 1. Exact match in EDSR registers
    if d_norm in registers['Jacket & Piles']: return 'Jacket & Piles'
    if d_norm in registers['Topside Structure']: return 'Topside Structure'
    if d_norm in registers['Topside without Structure']: return 'Topside without Structure'
    if d_norm in registers['WP2 Pipeline']: return 'WP2 Pipeline'

    # 2. Heuristic inference based on document coding and scope
    area_u = str(area or '').upper()
    disc_u = str(disc_name or '').upper()
    cat_u = str(cat or '').upper()
    sub_u = str(submitted_by or '').lower()

    if 'PIPELINE' in disc_u or area_u.startswith('IP') or 'mermaid' in sub_u:
        return 'WP2 Pipeline'
    if any(area_u == a for a in ['ZWP20', 'ZWP21', 'ZWP22', 'ZWP23']) and ('STRUCTURAL' in disc_u or 'NAVAL' in disc_u):
        return 'Jacket & Piles'
    if area_u in ['ZWPX', 'ZAWTIKA Z1F TS'] and ('STRUCTURAL' in disc_u or 'NAVAL' in disc_u):
        return 'Topside Structure'
    if any(k in disc_u for k in ['ELECTRICAL', 'INSTRUMENTATION', 'PROCESS', 'PIPING', 'TELECOMMUNICATION', 'MECHANICAL']):
        return 'Topside without Structure'
    if any(k in cat_u for k in ['PART A', 'PROJECT MANAGEMENT', 'FABRICATION', 'TRANSPORTATION', 'PRE-COMM']):
        return 'Project Management & Ops'
    
    return 'General & Multi-Discipline'

def process_file(excel_path=None):
    if not excel_path:
        files = [f for f in (glob.glob("Z1F Technical Document Log Report*.xlsx") + glob.glob("16102026/Z1F Technical Document Log Report*.xlsx")) if not os.path.basename(f).startswith("~$")]
        if not files:
            print("Error: No 'Z1F Technical Document Log Report' Excel file found.")
            return False
        files.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
        excel_path = files[0]

    print(f"Loading Technical Document Log: {excel_path}...")
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    sheet = wb['Page 1']
    data = sheet.values
    for _ in range(9):
        next(data)
    headers = next(data)
    df = pd.DataFrame(data, columns=headers)

    print(f"Total raw technical rows: {len(df)}")
    # Drop completely empty rows
    df = df.dropna(subset=['Document No.']).copy()
    print(f"Valid document submittals: {len(df)}")

    # Load 4 registers for contractor attribution
    registers = load_known_deliverable_registers()
    print(f"Loaded deliverable registers: Jacket={len(registers['Jacket & Piles'])}, Topside Structure={len(registers['Topside Structure'])}, Topside without Structure={len(registers['Topside without Structure'])}, WP2={len(registers['WP2 Pipeline'])}")

    df['in_dt'] = pd.to_datetime(df['Actual Submit In'], format='%d-%b-%Y %H:%M:%S', errors='coerce')
    df['out_dt'] = pd.to_datetime(df['Actual Submit Out'], format='%d-%b-%Y %H:%M:%S', errors='coerce')

    def compute_duration(row):
        if pd.isna(row['in_dt']) or pd.isna(row['out_dt']):
            return None
        return calc_working_days(row['in_dt'].date(), row['out_dt'].date())

    df['duration_days'] = df.apply(compute_duration, axis=1)

    def get_category(row):
        dur = row['duration_days']
        if pd.isna(dur):
            return 'Pending'
        if dur <= 10:
            return '<= 10 Days'
        else:
            return '> 10 Days'

    df['category'] = df.apply(get_category, axis=1)

    records = []
    for _, row in df.iterrows():
        dur = row['duration_days']
        dur_val = int(dur) if pd.notna(dur) else None
        doc_no = str(row['Document No.'] or '').strip().replace('\u2010', '-')
        area = str(row['Area'] or '').strip()
        disc_name = str(row['Discipline Name'] or 'Unassigned').strip()
        cat = str(row['Document Category'] or '').strip()
        sub_by = str(row['Submitted By'] or '').strip()
        
        contractor = attribute_contractor(doc_no, area, disc_name, cat, sub_by, registers)

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
        report_date = "16-Oct-2026"

    out_path = Path("data.js")
    content = (
        f'window.TECH_REPORT_DATE = "{report_date}";\n'
        f'window.Z1F_TECH_REPORT_DATE = "{report_date}";\n'
        'window.RAW_DATA = ' + json.dumps(records, ensure_ascii=False) + ';'
    )
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(content)

    z1f_dir = Path("data/z1f")
    z1f_dir.mkdir(parents=True, exist_ok=True)
    with open(z1f_dir / "data.js", 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"-> Generated {out_path} and {z1f_dir / 'data.js'} with {len(records)} records (Report Date: {report_date}).")
    
    # Contractor Breakdown Summary
    print("\n--- Contractor / Work Package Breakdown ---")
    cont_counts = pd.Series([r['contractor'] for r in records]).value_counts()
    print(cont_counts)

    # Completed vs Pending
    completed = [r for r in records if r['category'] != 'Pending']
    w10 = [r for r in completed if r['category'] == '<= 10 Days']
    o10 = [r for r in completed if r['category'] == '> 10 Days']
    pend = [r for r in records if r['category'] == 'Pending']
    print(f"\nTotal: {len(records)} | Completed: {len(completed)} | Pending: {len(pend)}")
    if completed:
        avg_wd = sum(r['duration_days'] for r in completed) / len(completed)
        print(f"<= 10 WD (Meet Agreement): {len(w10)} ({len(w10)/len(completed)*100:.1f}%)")
        print(f"> 10 WD (Over Agreement):  {len(o10)} ({len(o10)/len(completed)*100:.1f}%)")
        print(f"Average Review Duration:    {avg_wd:.1f} Working Days")
    return True

if __name__ == '__main__':
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    process_file(arg)
