"""
Z1F Analytic Evaluation Data Processor: Rebaseline Plan vs. Actual Revision Lifecycle Engine
Integrates:
1. Multi-Contractor Engineering Registers (Jacket & Piles, Topside Structure, Topside without Structure 00210, WP2 Pipeline)
2. Z1F Technical Document Log Report (.xlsx)

Features:
- Multi-Contractor scope attribution (Jacket & Piles, Topside Structure, Topside without Structure, WP2 Pipeline)
- Plan vs Actual cycle duration tracking (Mon-Fri Working Days)
- Forensic Delay Attribution:
  (1) Improperly Planned (Plan <= 10 WD allowance)
  (2) Late Incorporation by Contractor
  (3) Late Client Review (> 10 WD SLA)
  (4) Compound Delay (Client Review > 10 WD + Late Cont. Incorp)
- Contractor Entitlement Protection (protects planned incorporation allowance if Client takes > 10 WD)
- Contractual 50% Macro Delay Threshold Evaluation
- Exports analytics_data.js with:
    window.ANALYTICS_REPORT_DATE
    window.Z1F_ANALYTICS_REPORT_DATE
    window.ANALYTICS_SUMMARY
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
    match = re.search(r'(\d{1,2})[\s\-_]+([A-Za-z]{3})[\s\-_]+(\d{2,4})', filename)
    if match:
        day = int(match.group(1))
        month_str = match.group(2).lower()
        year = int(match.group(3))
        if year < 100: year += 2000
        month = MONTH_MAP.get(month_str, 1)
        return date(year, month, day)
    return date.min

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

def process_analytics(mdr_data_path=None, tech_log_path=None):
    # If mdr_data.js exists, we can directly parse the unified deliverable records
    mdr_js_path = Path("mdr_data.js")
    if not mdr_js_path.exists():
        import update_mdr_data
        update_mdr_data.process_mdr()

    print("Loading mdr_data.js for Analytic Evaluation...")
    with open("mdr_data.js", "r", encoding="utf-8") as f:
        content = f.read()

    m = re.search(r'window\.MDR_DATA\s*=\s*(\[.*?\]);', content, re.DOTALL)
    if not m:
        print("Error: Could not extract window.MDR_DATA from mdr_data.js")
        return False
    mdr_records = json.loads(m.group(1))
    print(f"Loaded {len(mdr_records)} deliverables from mdr_data.js.")

    transitions = []
    trans_id_counter = 1

    for item in mdr_records:
        doc_no = item['doc_no']
        title = item['title']
        contractor = item.get('contractor_set', 'General')
        work_package = item.get('work_package', 'General')
        disc = item.get('discipline', 'GEN')
        area = item.get('area', 'GEN')
        cat = item.get('doc_category', 'Part B - Engineering Doc')
        doc_type = item.get('doc_type', 'DOC')

        ifr = item.get('ifr', {})
        ifa = item.get('ifa', {})
        afc = item.get('afc', {})
        ap = item.get('ap', {})

        ifr_plan = parse_date_obj(ifr.get('plan'))
        ifa_plan = parse_date_obj(ifa.get('plan'))
        afc_plan = parse_date_obj(afc.get('plan'))
        ap_plan = parse_date_obj(ap.get('plan'))

        actually_skipped_ifa = bool(ifr.get('submit_out') and afc.get('submit_in') and not ifa.get('submit_in'))
        is_ifa_skipped = ifa.get('is_skipped', False) or (ifa_plan is None and cat == 'Part C - Engineering Dwg') or actually_skipped_ifa

        candidate_transitions = []
        if actually_skipped_ifa or (is_ifa_skipped and not ifa_plan):
            if ifr_plan and afc_plan:
                candidate_transitions.append({
                    'transition_type': 'IFR -> AFC (Fast-Track)',
                    'stage_from': 'IFR', 'stage_to': 'AFC',
                    'plan_from': ifr_plan, 'plan_to': afc_plan,
                    'log_from': ifr, 'log_to': afc
                })
        else:
            if ifr_plan and ifa_plan:
                candidate_transitions.append({
                    'transition_type': 'IFR -> IFA',
                    'stage_from': 'IFR', 'stage_to': 'IFA',
                    'plan_from': ifr_plan, 'plan_to': ifa_plan,
                    'log_from': ifr, 'log_to': ifa
                })
            if ifa_plan and afc_plan:
                candidate_transitions.append({
                    'transition_type': 'IFA -> AFC',
                    'stage_from': 'IFA', 'stage_to': 'AFC',
                    'plan_from': ifa_plan, 'plan_to': afc_plan,
                    'log_from': ifa, 'log_to': afc
                })

        if afc_plan and ap_plan:
            candidate_transitions.append({
                'transition_type': 'AFC -> AP',
                'stage_from': 'AFC', 'stage_to': 'AP',
                'plan_from': afc_plan, 'plan_to': ap_plan,
                'log_from': afc, 'log_to': ap
            })

        for ct in candidate_transitions:
            t_type = ct['transition_type']
            p_from, p_to = ct['plan_from'], ct['plan_to']
            p_wd = calc_working_days(p_from, p_to)
            p_incorp_allowance = max(0, p_wd - 10) if p_wd is not None else 0
            plan_defect = (p_wd is not None and p_wd <= 10)

            l_from, l_to = ct['log_from'], ct['log_to']

            if t_type == 'AFC -> AP':
                # AFC -> AP is an Approval corridor
                # Start: AFC submission in / review out. Completion: AP approval date / AFC approval
                afc_in_str = l_from.get('submit_in')
                afc_out_str = l_from.get('submit_out')
                ap_out_str = l_to.get('submit_out') or l_to.get('actual') or afc_out_str
                is_appr = bool(l_to.get('is_approved') or (l_from.get('status_code') in ['APPR', 'CODE 1', 'CODE 2', 'AWC']))

                has_actual = bool(afc_in_str and (ap_out_str or is_appr))
                
                client_rev_wd = l_from.get('review_days') or (calc_working_days(parse_date_obj(afc_in_str), parse_date_obj(afc_out_str)) if afc_in_str and afc_out_str else 0)
                client_sla_status = 'PASS' if (client_rev_wd is not None and client_rev_wd <= 10) else 'OVER'
                client_delay = max(0, client_rev_wd - 10) if client_rev_wd is not None else 0

                cont_inc_wd = l_to.get('incorp_days') if l_to.get('incorp_days') is not None else 0
                cont_delay = max(0, cont_inc_wd - p_incorp_allowance) if cont_inc_wd is not None else 0

                actual_cycle_wd = (client_rev_wd + cont_inc_wd) if (client_rev_wd is not None and cont_inc_wd is not None) else None
                cycle_variance_wd = (actual_cycle_wd - p_wd) if (actual_cycle_wd is not None and p_wd is not None) else None
                allowable_cycle_wd = (client_rev_wd + p_incorp_allowance) if client_rev_wd is not None else None
            else:
                has_actual = bool(l_from.get('submit_out') and l_to.get('submit_in'))
                
                client_rev_wd, client_sla_status, client_delay = None, None, 0
                if l_from.get('review_days') is not None:
                    client_rev_wd = l_from['review_days']
                    if client_rev_wd <= 10: client_sla_status = 'PASS'
                    else:
                        client_sla_status = 'OVER'
                        client_delay = client_rev_wd - 10

                cont_inc_wd, cont_delay = None, 0
                if has_actual:
                    try:
                        d_from = datetime.strptime(l_from['submit_out'], '%Y-%m-%d').date()
                        d_to = datetime.strptime(l_to['submit_in'], '%Y-%m-%d').date()
                        cont_inc_wd = calc_working_days(d_from, d_to)
                        if cont_inc_wd is not None and cont_inc_wd > p_incorp_allowance:
                            cont_delay = cont_inc_wd - p_incorp_allowance
                    except: pass

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
                'doc_no': doc_no, 'title': title, 'discipline': disc, 'contractor': contractor,
                'work_package': work_package, 'area': area, 'doc_category': cat, 'doc_type': doc_type,
                'transition_type': ct['transition_type'],
                'stage_from': ct['stage_from'], 'stage_to': ct['stage_to'],
                'plan_from_dt': ct['plan_from'].strftime('%Y-%m-%d') if ct['plan_from'] else None,
                'plan_to_dt': ct['plan_to'].strftime('%Y-%m-%d') if ct['plan_to'] else None,
                'plan_cycle_wd': p_wd,
                'plan_wd': p_wd,
                'plan_incorp_allowance_wd': p_incorp_allowance,
                'plan_defect': plan_defect,
                'plan_feasibility': 'DEFECTIVE_IMPROPER' if plan_defect else 'REALISTIC',
                'has_actual': has_actual,
                'actual_from_out_dt': l_from.get('submit_out'),
                'actual_to_in_dt': (l_to.get('submit_out') or l_to.get('actual') or l_from.get('submit_out')) if ct['transition_type'] == 'AFC -> AP' else l_to.get('submit_in'),
                'client_rev_wd': client_rev_wd,
                'client_sla_status': client_sla_status,
                'client_delay_wd': client_delay,
                'client_delay_days': client_delay,
                'cont_inc_wd': cont_inc_wd,
                'cont_delay_wd': cont_delay,
                'contractor_delay_days': cont_delay,
                'actual_cycle_wd': actual_cycle_wd,
                'cycle_variance_wd': cycle_variance_wd,
                'allowable_cycle_wd': allowable_cycle_wd,
                'delay_cause': delay_cause,
                'delay_label': delay_label,
                'delay_cause_label': delay_label,
                'submittal_from': l_from.get('submittal_id'),
                'submittal_to': l_to.get('submittal_id'),
                'status_code_from': l_from.get('status_code'),
                'status_code_to': l_to.get('status_code')
            })
            trans_id_counter += 1

    # Evaluation summaries
    eval_items = [t for t in transitions if t['has_actual'] and t['actual_cycle_wd'] is not None]
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

    summary = {
        'total_transitions': len(transitions),
        'completed_transitions': len(eval_items),
        'met_plan_count': len(met_list),
        'met_plan_pct': round(len(met_list) / len(eval_items) * 100, 1) if eval_items else 0.0,
        'delayed_count': len(overdue_list),
        'delayed_pct': round(len(overdue_list) / len(eval_items) * 100, 1) if eval_items else 0.0,
        'improper_plan_count': len(improper_list),
        'late_contractor_count': len(late_cont_list),
        'late_client_count': len(late_client_list),
        'compound_delay_count': len(compound_list),
        'cont_driven_count': cont_driven_count,
        'cont_overrun_pct': cont_overrun_pct,
        'macro_justification_flag': macro_justification_flag,
        'client_sla_rate': client_sla_rate,
        'avg_client_wd': avg_client_wd,
        'avg_cont_inc_wd': avg_cont_inc_wd,
        'report_date': '16-Oct-2026'
    }

    report_date = "16-Oct-2026"
    out_file = Path("analytics_data.js")
    content = (
        f'window.ANALYTICS_REPORT_DATE = "{report_date}";\n'
        f'window.Z1F_ANALYTICS_REPORT_DATE = "{report_date}";\n'
        'window.ANALYTICS_SUMMARY = ' + json.dumps(summary, indent=2) + ';\n'
        'window.ANALYTICS_DATA = ' + json.dumps(transitions, ensure_ascii=False) + ';'
    )
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(content)

    z1f_dir = Path("data/z1f")
    z1f_dir.mkdir(parents=True, exist_ok=True)
    with open(z1f_dir / "analytics_data.js", "w", encoding="utf-8") as f:
        f.write(content)

    print(f"Successfully generated {out_file} and {z1f_dir / 'analytics_data.js'} with {len(transitions)} transitions (Report Date: {report_date}).")
    print("\n--- Analytics Summary ---")
    print(f"Total Transitions: {len(transitions)} | Completed: {len(eval_items)}")
    print(f"Met Rebaseline Plan: {len(met_list)} ({summary['met_plan_pct']}%)")
    print(f"Delayed Transitions: {len(overdue_list)} ({summary['delayed_pct']}%)")
    print(f"  - Improperly Planned:  {len(improper_list)}")
    print(f"  - Late Cont. Incorp:   {len(late_cont_list)}")
    print(f"  - Late Client Review:  {len(late_client_list)}")
    print(f"  - Compound Delay:      {len(compound_list)}")
    print(f"Contractor Overrun Pct:  {cont_overrun_pct}% (Threshold >50%: {macro_justification_flag})")
    return True

if __name__ == '__main__':
    process_analytics()
