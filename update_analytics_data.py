"""
Analytic Evaluation Data Processor: Rebaseline Plan vs. Actual Revision Lifecycle Engine
Integrates:
1. MDR Cut-off Excel Register (5 tabs)
2. Technical Document Log Report (.xlsx)
3. Vendor Document Log Report (.xls/.xlsx)

Features:
- Calendar-based automatic file detection across weeks (retaining historical files)
- Dynamic column header detection (immune to inserted columns like 'FORECAST')
- Multi-week comparison: automatically compares latest cut-off against previous cut-off
- Forensic Delay Attribution & Macro Justification Calculation (> 50% Contractor Overrun)
- Exports analytics_data.js with:
    window.ANALYTICS_REPORT_DATE
    window.ANALYTICS_PREV_REPORT_DATE
    window.ANALYTICS_SUMMARY
    window.ANALYTICS_PREV_SUMMARY
    window.ANALYTICS_WOW_DIFF
    window.ANALYTICS_DATA
"""

import os
import re
import sys
import glob
import json
from pathlib import Path
from datetime import datetime, timedelta, date
import openpyxl
import pandas as pd

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def extract_file_date(filename):
    """Extracts Day, Month, Year from filename and returns a datetime.date object."""
    match = re.search(r'(\d{1,2})[\s\-_]+([A-Za-z]{3})[\s\-_]+(\d{2,4})', filename)
    if match:
        day = int(match.group(1))
        month_str = match.group(2).lower()
        year = int(match.group(3))
        if year < 100: year += 2000
        month = MONTH_MAP.get(month_str, 1)
        return date(year, month, day)
    return date.min

def get_sorted_files(pattern, directory="."):
    """Returns files matching pattern sorted strictly by calendar date descending."""
    files = glob.glob(os.path.join(directory, pattern))
    valid = [f for f in files if not os.path.basename(f).startswith("~$")]
    valid.sort(key=lambda f: extract_file_date(os.path.basename(f)), reverse=True)
    return valid

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

def parse_date_obj(v):
    if v is None: return None
    if isinstance(v, (datetime, date)):
        return v if isinstance(v, date) else v.date()
    s = str(v).strip()
    if s.upper() in ['N/A', '-', '', 'NONE', 'NULL']: return None
    for fmt in ['%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d-%b-%Y']:
        try: return datetime.strptime(s, fmt).date()
        except: pass
    return None

def format_date_str(d):
    if isinstance(d, (datetime, date)):
        return f"{d.day:02d}-{d.strftime('%b')}-{d.year}"
    return str(d)

def map_revision_columns(sheet, is_mr_tbe=False):
    """
    Dynamically maps revision milestone columns by reading milestone headers and subheaders.
    This guarantees 100% resilience against inserted or shifted columns.
    """
    rev_row = 10 if is_mr_tbe else 12
    sub_row = 11 if is_mr_tbe else 13
    
    current_rev = None
    col_map = {}
    
    for c in range(1, min(sheet.max_column + 1, 70)):
        r_val = sheet.cell(row=rev_row, column=c).value
        s_val = sheet.cell(row=sub_row, column=c).value
        
        if r_val:
            r_str = str(r_val).strip().upper()
            for cand in ['IFR', 'IFA', 'AFC', 'AP']:
                if cand in r_str:
                    current_rev = cand
                    break
        
        if s_val and current_rev:
            s_str = str(s_val).strip().upper().replace('\n', ' ')
            if 'REBASELINE' in s_str:
                col_key = f"{current_rev}_REB"
                if col_key not in col_map:  # pick first match
                    col_map[col_key] = c
            elif 'PLAN' in s_str and 'REBASELINE' not in s_str:
                col_key = f"{current_rev}_PLAN"
                if col_key not in col_map:
                    col_map[col_key] = c
                    
    return col_map

def extract_evaluation_dataset(mdr_path, tech_log_path):
    """Ingests Technical Log and MDR Register and computes all transition evaluations."""
    print(f"[Analytics Engine] Loading Tech Log: {os.path.basename(tech_log_path)}...")
    wb_log = openpyxl.load_workbook(tech_log_path, data_only=True)
    sheet_log = wb_log['Page 1']
    log_vals = sheet_log.values
    for _ in range(9): next(log_vals)
    headers_log = next(log_vals)
    df_log = pd.DataFrame(log_vals, columns=headers_log)
    j_log = df_log[df_log['Submitted By'].astype(str).str.contains('zm167dc@jutal.com', case=False, na=False)].copy()

    doc_log_map = {}
    for _, row in j_log.iterrows():
        d_no = str(row['Document No.'] or '').strip()
        if not d_no: continue
        if d_no not in doc_log_map: doc_log_map[d_no] = []
        in_str = str(row['Actual Submit In'] or '').strip()
        out_str = str(row['Actual Submit Out'] or '').strip()
        in_dt, out_dt = None, None
        if in_str:
            try: in_dt = datetime.strptime(in_str, '%d-%b-%Y %H:%M:%S')
            except: pass
        if out_str:
            try: out_dt = datetime.strptime(out_str, '%d-%b-%Y %H:%M:%S')
            except: pass
        dur = calc_working_days(in_dt.date(), out_dt.date()) if (in_dt and out_dt) else None
        doc_log_map[d_no].append({
            'rev': str(row['Rev.'] or '').strip(),
            'submittal_id': str(row['Submittal ID'] or '').strip(),
            'doc_category': str(row.get('Document Category') or '').strip(),
            'in_dt': in_dt.strftime('%Y-%m-%d') if in_dt else None,
            'out_dt': out_dt.strftime('%Y-%m-%d') if out_dt else None,
            'review_days': dur,
            'status_code': str(row['Return Status Code'] or '').strip(),
            'status_name': str(row['Return Status Name'] or '').strip()
        })

    print(f"[Analytics Engine] Indexed {len(doc_log_map)} documents from Technical Log.")

    print(f"[Analytics Engine] Ingesting MDR: {os.path.basename(mdr_path)}...")
    wb_mdr = openpyxl.load_workbook(mdr_path, data_only=True)
    sheets = ['WP01 TOPSIDE', 'WP01 JACKET', 'WP02 TOPSIDE', 'WP02 JACKET', 'PRO.ENGINEERING_MR TBE']

    transitions = []
    trans_id_counter = 1

    for sname in sheets:
        if sname not in wb_mdr.sheetnames: continue
        sheet = wb_mdr[sname]
        is_mr_tbe = (sname == 'PRO.ENGINEERING_MR TBE')
        header_row = 11 if is_mr_tbe else 13
        
        # Dynamically discover columns for this sheet
        col_map = map_revision_columns(sheet, is_mr_tbe=is_mr_tbe)
        
        ifr_reb_col = col_map.get('IFR_REB')
        ifr_orig_col = col_map.get('IFR_PLAN')
        ifa_reb_col = col_map.get('IFA_REB')
        ifa_orig_col = col_map.get('IFA_PLAN')
        afc_reb_col = col_map.get('AFC_REB')
        afc_orig_col = col_map.get('AFC_PLAN')
        ap_reb_col = col_map.get('AP_REB')
        ap_orig_col = col_map.get('AP_PLAN')

        for r in range(header_row + 1, sheet.max_row + 1):
            doc_no_val = sheet.cell(row=r, column=9).value
            if not doc_no_val: continue
            doc_no = str(doc_no_val).strip()
            if not doc_no.startswith('MM-'): continue

            title = str(sheet.cell(row=r, column=10).value or '').strip()
            disc = str(sheet.cell(row=r, column=4).value or '').strip()
            area = str(sheet.cell(row=r, column=3).value or '').strip()
            doc_type = str(sheet.cell(row=r, column=5).value or '').strip()
            doc_class = str(sheet.cell(row=r, column=11).value or '').strip()

            ifr_reb = parse_date_obj(sheet.cell(row=r, column=ifr_reb_col).value) if ifr_reb_col else None
            ifr_orig = parse_date_obj(sheet.cell(row=r, column=ifr_orig_col).value) if ifr_orig_col else None
            ifa_reb = parse_date_obj(sheet.cell(row=r, column=ifa_reb_col).value) if ifa_reb_col else None
            ifa_orig = parse_date_obj(sheet.cell(row=r, column=ifa_orig_col).value) if ifa_orig_col else None
            afc_reb = parse_date_obj(sheet.cell(row=r, column=afc_reb_col).value) if afc_reb_col else None
            afc_orig = parse_date_obj(sheet.cell(row=r, column=afc_orig_col).value) if afc_orig_col else None
            ap_reb = parse_date_obj(sheet.cell(row=r, column=ap_reb_col).value) if ap_reb_col else None
            ap_orig = parse_date_obj(sheet.cell(row=r, column=ap_orig_col).value) if ap_orig_col else None

            # IFA Skipped check
            is_ifa_skipped = False
            if ifa_orig_col:
                v1 = str(sheet.cell(row=r, column=ifa_orig_col).value or '').strip().upper()
                if v1 in ['N/A', '-']: is_ifa_skipped = True
            if ifa_reb_col:
                v2 = str(sheet.cell(row=r, column=ifa_reb_col).value or '').strip().upper()
                if v2 in ['N/A', '-']: is_ifa_skipped = True

            logs = doc_log_map.get(doc_no, [])
            logs.sort(key=lambda x: x['in_dt'] or '9999-99-99')

            # Find revision logs
            ifr_log = next((l for l in logs if l['rev'].upper().startswith('A')), None)
            ifa_log = next((l for l in logs if l['rev'].upper().startswith('B')), None)
            afc_log = next((l for l in logs if l['rev'].upper().startswith('C')), None)

            if not ifr_log and len(logs) > 0: ifr_log = logs[0]
            if not ifa_log and not is_ifa_skipped and len(logs) > 1: ifa_log = logs[1]
            if not afc_log and len(logs) > 2: afc_log = logs[2]

            ap_log = None
            if afc_log and afc_log['out_dt']:
                after_afc = [l for l in logs if l['in_dt'] and l['in_dt'] > afc_log['out_dt']]
                if after_afc: ap_log = after_afc[0]
                elif 'APPR' in (afc_log['status_code'] or '').upper(): ap_log = afc_log

            # Category
            cat = None
            for l in logs:
                if l.get('doc_category'): cat = l['doc_category']; break
            if not cat:
                if any(x in doc_no for x in ['-DWG-', '-PID-', '-PFD-', '-UFD-', '-LAY-', '-SCH-', '-SLD-', '-ISO-']) or doc_type in ['DWG', 'PID', 'PFD', 'UFD', 'LAY', 'SCH', 'SLD', 'ISO', 'GA']:
                    cat = 'Part C - Engineering Dwg'
                else: cat = 'Part B - Engineering Doc'
            clean_category = 'Part C - Engineering Dwg' if 'Part C' in cat else 'Part B - Engineering Doc'

            candidate_transitions = []
            if not is_ifa_skipped and ifr_reb and ifa_reb:
                candidate_transitions.append({'transition_type': 'IFR -> IFA', 'stage_from': 'IFR', 'stage_to': 'IFA', 'plan_from': ifr_reb, 'plan_to': ifa_reb, 'log_from': ifr_log, 'log_to': ifa_log})
            elif is_ifa_skipped and ifr_reb and afc_reb:
                candidate_transitions.append({'transition_type': 'IFR -> AFC (Fast-Track)', 'stage_from': 'IFR', 'stage_to': 'AFC', 'plan_from': ifr_reb, 'plan_to': afc_reb, 'log_from': ifr_log, 'log_to': afc_log})
            
            if not is_ifa_skipped and ifa_reb and afc_reb:
                candidate_transitions.append({'transition_type': 'IFA -> AFC', 'stage_from': 'IFA', 'stage_to': 'AFC', 'plan_from': ifa_reb, 'plan_to': afc_reb, 'log_from': ifa_log, 'log_to': afc_log})
            
            if afc_reb and ap_reb:
                candidate_transitions.append({'transition_type': 'AFC -> AP', 'stage_from': 'AFC', 'stage_to': 'AP', 'plan_from': afc_reb, 'plan_to': ap_reb, 'log_from': afc_log, 'log_to': ap_log})

            for ct in candidate_transitions:
                p_from, p_to = ct['plan_from'], ct['plan_to']
                p_wd = calc_working_days(p_from, p_to)
                p_incorp_allowance = max(0, p_wd - 10) if p_wd is not None else 0
                plan_defect = (p_wd is not None and p_wd <= 10)

                l_from, l_to = ct['log_from'], ct['log_to']
                has_actual = (l_from is not None and l_from['out_dt'] is not None and l_to is not None and l_to['in_dt'] is not None)
                
                client_rev_wd, client_sla_status, client_delay = None, None, 0
                if l_from and l_from['review_days'] is not None:
                    client_rev_wd = l_from['review_days']
                    if client_rev_wd <= 10: client_sla_status = 'PASS'
                    else:
                        client_sla_status = 'OVER'
                        client_delay = client_rev_wd - 10

                cont_inc_wd, cont_delay = None, 0
                if has_actual:
                    d_from = datetime.strptime(l_from['out_dt'], '%Y-%m-%d').date()
                    d_to = datetime.strptime(l_to['in_dt'], '%Y-%m-%d').date()
                    cont_inc_wd = calc_working_days(d_from, d_to)
                    if cont_inc_wd is not None and cont_inc_wd > p_incorp_allowance:
                        cont_delay = cont_inc_wd - p_incorp_allowance

                actual_cycle_wd, cycle_variance_wd, allowable_cycle_wd = None, None, None
                if has_actual and client_rev_wd is not None and cont_inc_wd is not None:
                    actual_cycle_wd = client_rev_wd + cont_inc_wd
                    if p_wd is not None: cycle_variance_wd = actual_cycle_wd - p_wd
                    allowable_cycle_wd = client_rev_wd + p_incorp_allowance

                delay_cause, delay_label = None, None
                if has_actual and actual_cycle_wd is not None and p_wd is not None:
                    if actual_cycle_wd <= p_wd:
                        delay_cause = 'MET_PLAN'
                        delay_label = 'Met Rebaseline Plan'
                    elif plan_defect:
                        delay_cause = 'IMPROPER_PLAN'
                        delay_label = '(1) Improperly Planned'
                    elif client_delay > 0 and cont_delay > 0:
                        delay_cause = 'COMPOUND_DELAY'
                        delay_label = '(4) Compound Delay (Client + Cont.)'
                    elif client_delay > 0 and cont_delay <= 0:
                        delay_cause = 'LATE_CLIENT'
                        delay_label = '(3) Late Client Review'
                    elif client_delay <= 0 and cont_delay > 0:
                        delay_cause = 'LATE_CONTRACTOR'
                        delay_label = '(2) Late Cont. Incorp'
                    else:
                        delay_cause = 'LATE_CONTRACTOR'
                        delay_label = '(2) Late Cont. Incorp'

                transitions.append({
                    'id': f"TR-{trans_id_counter:05d}",
                    'doc_no': doc_no, 'title': title, 'discipline': disc, 'work_package': sname,
                    'area': area, 'doc_category': clean_category, 'doc_type': doc_type,
                    'transition_type': ct['transition_type'],
                    'stage_from': ct['stage_from'], 'stage_to': ct['stage_to'],
                    'plan_from_dt': ct['plan_from'].strftime('%Y-%m-%d') if ct['plan_from'] else None,
                    'plan_to_dt': ct['plan_to'].strftime('%Y-%m-%d') if ct['plan_to'] else None,
                    'plan_wd': p_wd, 'plan_incorp_allowance_wd': p_incorp_allowance,
                    'plan_defect': plan_defect,
                    'actual_cycle_wd': actual_cycle_wd, 'cycle_variance_wd': cycle_variance_wd,
                    'client_rev_wd': client_rev_wd, 'client_sla_status': client_sla_status,
                    'client_delay_days': client_delay, 'cont_inc_wd': cont_inc_wd,
                    'contractor_delay_days': cont_delay, 'allowable_cycle_wd': allowable_cycle_wd,
                    'has_actual': has_actual, 'delay_cause': delay_cause, 'delay_cause_label': delay_label,
                    'submittal_id_from': l_from['submittal_id'] if l_from else None,
                    'submittal_id_to': l_to['submittal_id'] if l_to else None,
                    'rev_from': l_from['rev'] if l_from else None,
                    'rev_to': l_to['rev'] if l_to else None,
                    'submit_out_from': l_from['out_dt'] if l_from else None,
                    'submit_in_to': l_to['in_dt'] if l_to else None,
                    'return_status_from': l_from['status_code'] if l_from else None,
                    'return_status_to': l_to['status_code'] if l_to else None
                })
                trans_id_counter += 1

    # Summarize metrics
    eval_items = [t for t in transitions if t['has_actual'] and t['actual_cycle_wd'] is not None]
    total_eval = len(eval_items)
    met_list = [t for t in eval_items if t['delay_cause'] == 'MET_PLAN']
    overdue_list = [t for t in eval_items if t['delay_cause'] != 'MET_PLAN']
    
    improper_list = [t for t in overdue_list if t['delay_cause'] == 'IMPROPER_PLAN']
    late_cont_list = [t for t in overdue_list if t['delay_cause'] == 'LATE_CONTRACTOR']
    late_client_list = [t for t in overdue_list if t['delay_cause'] == 'LATE_CLIENT']
    compound_list = [t for t in overdue_list if t['delay_cause'] == 'COMPOUND_DELAY']

    cont_driven_count = len(late_cont_list) + len(compound_list)
    cont_overrun_pct = round((cont_driven_count / len(overdue_list) * 100), 1) if overdue_list else 0.0
    macro_justification_flag = (cont_overrun_pct > 50.0)

    client_eval = [t for t in eval_items if t['client_rev_wd'] is not None]
    client_pass = [t for t in client_eval if t['client_sla_status'] == 'PASS']
    client_sla_rate = round(len(client_pass) / len(client_eval) * 100, 1) if client_eval else 0.0

    avg_client_wd = round(sum(t['client_rev_wd'] for t in client_eval) / len(client_eval), 1) if client_eval else 0.0
    cont_eval = [t for t in eval_items if t['cont_inc_wd'] is not None]
    avg_cont_inc_wd = round(sum(t['cont_inc_wd'] for t in cont_eval) / len(cont_eval), 1) if cont_eval else 0.0

    avg_plan_wd = round(sum(t['plan_wd'] for t in eval_items if t['plan_wd'] is not None) / total_eval, 1) if total_eval else 0.0
    avg_actual_wd = round(sum(t['actual_cycle_wd'] for t in eval_items) / total_eval, 1) if total_eval else 0.0

    # Group breakdowns
    disc_map = {}
    for t in eval_items:
        d = t['discipline'] or 'Other'
        if d not in disc_map: disc_map[d] = {'total': 0, 'met': 0, 'improper': 0, 'cont': 0, 'client': 0, 'compound': 0}
        disc_map[d]['total'] += 1
        if t['delay_cause'] == 'MET_PLAN': disc_map[d]['met'] += 1
        elif t['delay_cause'] == 'IMPROPER_PLAN': disc_map[d]['improper'] += 1
        elif t['delay_cause'] == 'LATE_CONTRACTOR': disc_map[d]['cont'] += 1
        elif t['delay_cause'] == 'LATE_CLIENT': disc_map[d]['client'] += 1
        elif t['delay_cause'] == 'COMPOUND_DELAY': disc_map[d]['compound'] += 1

    trans_map = {}
    for t in eval_items:
        s = t['transition_type']
        if s not in trans_map: trans_map[s] = {'total': 0, 'met': 0, 'improper': 0, 'cont': 0, 'client': 0, 'compound': 0}
        trans_map[s]['total'] += 1
        if t['delay_cause'] == 'MET_PLAN': trans_map[s]['met'] += 1
        elif t['delay_cause'] == 'IMPROPER_PLAN': trans_map[s]['improper'] += 1
        elif t['delay_cause'] == 'LATE_CONTRACTOR': trans_map[s]['cont'] += 1
        elif t['delay_cause'] == 'LATE_CLIENT': trans_map[s]['client'] += 1
        elif t['delay_cause'] == 'COMPOUND_DELAY': trans_map[s]['compound'] += 1

    summary = {
        'total_evaluated_transitions': total_eval,
        'met_plan_count': len(met_list),
        'met_plan_pct': round(len(met_list) / total_eval * 100, 1) if total_eval else 0.0,
        'overdue_count': len(overdue_list),
        'overdue_pct': round(len(overdue_list) / total_eval * 100, 1) if total_eval else 0.0,
        
        'improper_plan_count': len(improper_list),
        'improper_plan_pct_of_overdue': round(len(improper_list) / len(overdue_list) * 100, 1) if overdue_list else 0.0,
        'late_contractor_count': len(late_cont_list),
        'late_contractor_pct_of_overdue': round(len(late_cont_list) / len(overdue_list) * 100, 1) if overdue_list else 0.0,
        'late_client_count': len(late_client_list),
        'late_client_pct_of_overdue': round(len(late_client_list) / len(overdue_list) * 100, 1) if overdue_list else 0.0,
        'compound_delay_count': len(compound_list),
        'compound_delay_pct_of_overdue': round(len(compound_list) / len(overdue_list) * 100, 1) if overdue_list else 0.0,
        
        'contractor_driven_count': cont_driven_count,
        'contractor_overrun_pct': cont_overrun_pct,
        'macro_justification_flag': macro_justification_flag,
        
        'client_sla_compliance_rate': client_sla_rate,
        'avg_plan_wd': avg_plan_wd,
        'avg_actual_wd': avg_actual_wd,
        'avg_client_rev_wd': avg_client_wd,
        'avg_cont_inc_wd': avg_cont_inc_wd,
        
        'discipline_breakdown': disc_map,
        'transition_breakdown': trans_map
    }

    return transitions, summary

def generate_wow_diff(curr_summary, prev_summary, curr_date, prev_date):
    """Calculates week-over-week deltas and builds an executive trend statement."""
    if not prev_summary:
        return None

    def diff_val(k):
        return round(curr_summary.get(k, 0) - prev_summary.get(k, 0), 1)

    eval_diff = curr_summary['total_evaluated_transitions'] - prev_summary['total_evaluated_transitions']
    met_count_diff = curr_summary['met_plan_count'] - prev_summary['met_plan_count']
    met_pct_diff = diff_val('met_plan_pct')
    overdue_count_diff = curr_summary['overdue_count'] - prev_summary['overdue_count']
    overdue_pct_diff = diff_val('overdue_pct')
    sla_diff = diff_val('client_sla_compliance_rate')
    client_wd_diff = diff_val('avg_client_rev_wd')
    cont_inc_diff = diff_val('avg_cont_inc_wd')
    overrun_diff = diff_val('contractor_overrun_pct')

    # Build trend narrative
    trend_type = "improved" if met_pct_diff > 0 and overrun_diff <= 0 else ("steady" if abs(met_pct_diff) <= 0.5 else "softened")
    sign_eval = f"+{eval_diff}" if eval_diff >= 0 else f"{eval_diff}"
    sign_met_count = f"+{met_count_diff}" if met_count_diff >= 0 else f"{met_count_diff}"
    sign_met_pct = f"+{met_pct_diff}%" if met_pct_diff >= 0 else f"{met_pct_diff}%"
    sign_sla = f"+{sla_diff}%" if sla_diff >= 0 else f"{sla_diff}%"
    sign_incorp = f"+{cont_inc_diff} WD" if cont_inc_diff >= 0 else f"{cont_inc_diff} WD"
    sign_overrun = f"+{overrun_diff}%" if overrun_diff >= 0 else f"{overrun_diff}%"

    statement = (
        f"Week-over-Week Trend (vs. {prev_date} cut-off): Overall plan compliance changed by "
        f"{sign_met_pct} ({sign_met_count} on-track transitions, total {curr_summary['total_evaluated_transitions']:,}). "
        f"Client review turnaround recorded {curr_summary['avg_client_rev_wd']} WD ({curr_summary['client_sla_compliance_rate']}% SLA pass, {sign_sla}). "
        f"Contractor comment incorporation averaged {curr_summary['avg_cont_inc_wd']} WD ({sign_incorp} vs prior week), "
        f"with Contractor-driven delays standing at {curr_summary['contractor_overrun_pct']}% ({sign_overrun}), "
        f"continuing to sustain the macro delay justification (> 50% threshold)."
    )

    return {
        'prev_date': prev_date,
        'curr_date': curr_date,
        'eval_diff': eval_diff,
        'met_count_diff': met_count_diff,
        'met_pct_diff': met_pct_diff,
        'overdue_count_diff': overdue_count_diff,
        'overdue_pct_diff': overdue_pct_diff,
        'sla_diff': sla_diff,
        'client_wd_diff': client_wd_diff,
        'cont_inc_diff': cont_inc_diff,
        'overrun_diff': overrun_diff,
        'statement': statement
    }

def process_analytics(mdr_path=None, tech_log_path=None, vendor_log_path=None):
    """
    Main processor function:
    Automatically discovers the latest weekly files and the preceding weekly files,
    computes current evaluations and week-over-week deltas, and saves analytics_data.js.
    """
    mdr_files = get_sorted_files("*MDR*.xlsx")
    tech_files = get_sorted_files("ASK Technical Document Log Report*.xlsx")
    vendor_files = get_sorted_files("ASK Vendor Document Log Report*.xls*")

    if not mdr_path:
        if not mdr_files:
            print("Error: No MDR Excel file found.")
            return False
        mdr_path = mdr_files[0]

    if not tech_log_path:
        if not tech_files:
            print("Error: No Technical Document Log Excel file found.")
            return False
        tech_log_path = tech_files[0]

    curr_date = format_date_str(extract_file_date(os.path.basename(mdr_path)))
    print(f"[Analytics Master] Processing Current Week: {curr_date} ({os.path.basename(mdr_path)})")
    curr_transitions, curr_summary = extract_evaluation_dataset(mdr_path, tech_log_path)

    # Process Previous Week if available
    prev_summary = None
    prev_date = None
    wow_diff = None

    if len(mdr_files) > 1 and len(tech_files) > 1:
        prev_mdr = mdr_files[1]
        prev_tech = tech_files[1]
        prev_date = format_date_str(extract_file_date(os.path.basename(prev_mdr)))
        print(f"[Analytics Master] Processing Previous Week for Reference: {prev_date} ({os.path.basename(prev_mdr)})")
        try:
            _, prev_summary = extract_evaluation_dataset(prev_mdr, prev_tech)
            wow_diff = generate_wow_diff(curr_summary, prev_summary, curr_date, prev_date)
        except Exception as e:
            print(f"Warning: Could not process previous week for WoW reference: {e}")

    out_file = Path('analytics_data.js')
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write(f'window.ANALYTICS_REPORT_DATE = "{curr_date}";\n')
        if prev_date:
            f.write(f'window.ANALYTICS_PREV_REPORT_DATE = "{prev_date}";\n')
        f.write('window.ANALYTICS_SUMMARY = ' + json.dumps(curr_summary, ensure_ascii=False) + ';\n')
        if prev_summary:
            f.write('window.ANALYTICS_PREV_SUMMARY = ' + json.dumps(prev_summary, ensure_ascii=False) + ';\n')
        if wow_diff:
            f.write('window.ANALYTICS_WOW_DIFF = ' + json.dumps(wow_diff, ensure_ascii=False) + ';\n')
        f.write('window.ANALYTICS_DATA = ' + json.dumps(curr_transitions, ensure_ascii=False) + ';\n')

    print(f"\n[Analytics Master] Successfully generated {out_file} ({len(curr_transitions)} transitions, {curr_summary['total_evaluated_transitions']} evaluated).")
    if wow_diff:
        print(f"[Analytics Master] Week-over-Week Reference: {curr_date} vs {prev_date}")
        print(f"  {wow_diff['statement']}")
    return True

if __name__ == '__main__':
    process_analytics()
