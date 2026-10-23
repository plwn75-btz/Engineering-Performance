"""
Unified Document Intelligence Data Processor & Auto-Updater
Automatically detects the newest weekly Excel files matching project naming patterns:
1. Technical Document Log: "ASK Technical Document Log Report - <DATE>.xlsx" -> data.js
2. Vendor Document Log: "ASK Vendor Document Log Report - <DATE>.xls*" -> vendor_data.js
3. MDR Register: "*MDR* - Cut off <DATE>.xlsx" -> mdr_data.js

Recalculates all review turnaround durations in 10 Working Days (Mon-Fri, excluding weekends).
Can be called from CLI (python update_all.py) or imported by server.py when files are uploaded.
"""

import os
import sys
import glob
import re
import json
from pathlib import Path
from datetime import datetime

# Import sub-processors
import update_data
import update_vendor_data
import update_mdr_data
import update_analytics_data

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def extract_file_date_obj(filename):
    """Extracts Day, Month, Year from filename and returns a datetime.date object."""
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

def get_latest_file(pattern, directory="."):
    """Finds the newest weekly file matching the pattern based strictly on calendar date."""
    files = glob.glob(os.path.join(directory, pattern))
    valid_files = [f for f in files if not os.path.basename(f).startswith("~$")]
    if not valid_files:
        return None
    valid_files.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
    return valid_files[0]

def extract_date_from_filename(filename):
    """Attempts to extract a human-readable date string from the filename."""
    base = os.path.basename(filename)
    m = re.search(r'(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4})', base)
    if m:
        return m.group(1).replace('-', ' ')
    m2 = re.search(r'(\d{4}[-\s]\d{2}[-\s]\d{2})', base)
    if m2:
        return m2.group(1)
    return "Latest"

def update_all(base_dir="."):
    """Finds latest files for all 3 categories and runs full update pipeline."""
    results = {}
    print("=" * 70)
    print("ASK Document Intelligence Hub - Automated Batch Data Refresh")
    print("=" * 70)

    # 1. Technical Document Log
    tech_file = get_latest_file("ASK Technical Document Log Report*.xlsx", base_dir)
    if tech_file:
        tech_date = extract_date_from_filename(tech_file)
        print(f"\n[1/3] Found Technical Log: {os.path.basename(tech_file)} (Date: {tech_date})")
        try:
            update_data.process_file(tech_file)
            results["technical"] = {
                "file": os.path.basename(tech_file),
                "date": tech_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing Technical Log: {e}")
            results["technical"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[1/3] No Technical Document Log Excel file found.")
        results["technical"] = {"status": "not_found"}

    # 2. Vendor Document Log
    vendor_file = get_latest_file("ASK Vendor Document Log Report*.xls*", base_dir)
    if vendor_file:
        vendor_date = extract_date_from_filename(vendor_file)
        print(f"\n[2/3] Found Vendor Log: {os.path.basename(vendor_file)} (Date: {vendor_date})")
        try:
            update_vendor_data.process_vendor_file(vendor_file)
            results["vendor"] = {
                "file": os.path.basename(vendor_file),
                "date": vendor_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing Vendor Log: {e}")
            results["vendor"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[2/3] No Vendor Document Log Excel file found.")
        results["vendor"] = {"status": "not_found"}

    # 3. Master Document Register (MDR)
    mdr_file = get_latest_file("*MDR*.xlsx", base_dir)
    if mdr_file:
        mdr_date = extract_date_from_filename(mdr_file)
        print(f"\n[3/3] Found MDR Register: {os.path.basename(mdr_file)} (Date: {mdr_date})")
        try:
            update_mdr_data.process_mdr(mdr_file)
            results["mdr"] = {
                "file": os.path.basename(mdr_file),
                "date": mdr_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing MDR Register: {e}")
            results["mdr"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[3/4] No MDR file found matching '*MDR*.xlsx'. Skipping MDR processing.")
        results["mdr"] = {"status": "skipped", "reason": "file not found"}

    # 4. Rebaseline Plan Analytic Evaluation Dataset
    print(f"\n[4/4] Generating Rebaseline Plan Analytic Evaluation (analytics_data.js)...")
    try:
        update_analytics_data.process_analytics(mdr_file, tech_file, vendor_file)
        results["analytics"] = {"status": "success"}
    except Exception as e:
        print(f"Error processing Analytic Evaluation: {e}")
        results["analytics"] = {"error": str(e), "status": "failed"}

    # Write summary metadata
    meta_path = os.path.join(base_dir, "latest_update.json")
    results["updated_at"] = datetime.now().isoformat()
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    print("\n" + "=" * 70)
    print("Auto-update complete! Saved execution report to latest_update.json.")
    print("=" * 70)
    return results

def process_single_uploaded_file(filepath):
    """Processes an uploaded file based on its filename or content."""
    fname = os.path.basename(filepath).lower()
    date_str = extract_date_from_filename(filepath)
    
    if "vendor" in fname:
        print(f"Processing uploaded Vendor Document Log: {filepath}...")
        update_vendor_data.process_vendor_file(filepath)
        return {
            "type": "Vendor Document Log",
            "file": os.path.basename(filepath),
            "date": date_str,
            "target": "vendor_data.js"
        }
    elif "mdr" in fname:
        print(f"Processing uploaded MDR Master Document Register: {filepath}...")
        update_mdr_data.process_mdr(filepath)
        print("Regenerating Analytic Evaluation dataset...")
        try:
            update_analytics_data.process_analytics(mdr_path=filepath)
        except Exception as e:
            print(f"Warning: could not update analytics dataset: {e}")
        return {
            "type": "Master Document Register (MDR)",
            "file": os.path.basename(filepath),
            "date": date_str,
            "target": "mdr_data.js & analytics_data.js"
        }
    elif "technical" in fname or "log report" in fname:
        print(f"Processing uploaded Technical Document Log: {filepath}...")
        update_data.process_file(filepath)
        print("Regenerating Analytic Evaluation dataset...")
        try:
            update_analytics_data.process_analytics(tech_log_path=filepath)
        except Exception as e:
            print(f"Warning: could not update analytics dataset: {e}")
        return {
            "type": "Technical Document Log",
            "file": os.path.basename(filepath),
            "date": date_str,
            "target": "data.js & analytics_data.js"
        }
    else:
        # Fallback inspection: default to technical log
        print(f"Unknown naming pattern. Trying technical log parser for {filepath}...")
        try:
            update_data.process_file(filepath)
            try:
                update_analytics_data.process_analytics(tech_log_path=filepath)
            except:
                pass
            return {
                "type": "Technical Document Log (Inferred)",
                "file": os.path.basename(filepath),
                "date": date_str,
                "target": "data.js & analytics_data.js"
            }
        except Exception as e:
            raise ValueError(f"Could not process uploaded file '{filepath}': {e}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        custom_file = sys.argv[1]
        if os.path.isfile(custom_file):
            process_single_uploaded_file(custom_file)
        else:
            update_all(custom_file)
    else:
        update_all()
