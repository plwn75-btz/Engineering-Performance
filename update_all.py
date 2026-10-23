"""
ZDoc Intelligence Hub - Multi-Project Batch Data Processor & Auto-Updater
Supports both Z1F and ASK datasets.
Ensures zero data mix-up by keeping outputs strictly isolated in:
  - data/z1f/ (and root compatibility files)
  - data/ask/

Supports automatic newest date detection across weekly files.
Can be executed from CLI:
  - python update_all.py        (updates both Z1F and ASK)
  - python update_all.py z1f    (updates Z1F only)
  - python update_all.py ask    (updates ASK only)
Or imported by server.py to handle file uploads via process_single_uploaded_file().
"""

import os
import sys
import glob
import re
import json
from pathlib import Path
from datetime import datetime, date

# Import Z1F processors
import update_data
import update_vendor_data
import update_mdr_data
import update_analytics_data

# Import ASK processors
import update_data_ask
import update_vendor_data_ask
import update_mdr_data_ask
import update_analytics_data_ask

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
        return date(year, month, day)
    return date.min

def get_latest_file(pattern, directory="."):
    """Finds the newest weekly file matching the pattern based strictly on calendar date."""
    files = glob.glob(os.path.join(directory, pattern)) + \
            glob.glob(os.path.join(directory, "16102026", pattern)) + \
            glob.glob(os.path.join(directory, "archive_ask", pattern))
    valid_files = [f for f in files if not os.path.basename(f).startswith("~$")]
    if not valid_files:
        return None
    valid_files.sort(key=lambda x: extract_file_date_obj(os.path.basename(x)), reverse=True)
    return valid_files[0]

def extract_date_from_filename(filename):
    base = os.path.basename(filename)
    m = re.search(r'(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{2,4})', base)
    if m:
        return m.group(1).replace('-', ' ')
    m2 = re.search(r'(\d{4}[-\s]\d{2}[-\s]\d{2})', base)
    if m2:
        return m2.group(1)
    return "16 Oct 2026"

def update_z1f(base_dir="."):
    """Finds latest Z1F files and runs the full Z1F data pipeline."""
    results = {}
    print("\n" + "=" * 75)
    print(">>> PROCESSING Z1F DATASETS")
    print("=" * 75)

    # 1. Technical Document Log
    tech_file = get_latest_file("Z1F Technical Document Log Report*.xlsx", base_dir)
    if tech_file:
        tech_date = extract_date_from_filename(tech_file)
        print(f"\n[1/4] Found Z1F Technical Log: {os.path.basename(tech_file)} (Date: {tech_date})")
        try:
            update_data.process_file(tech_file)
            results["technical"] = {
                "file": os.path.basename(tech_file),
                "date": tech_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing Z1F Technical Log: {e}")
            results["technical"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[1/4] No Z1F Technical Document Log file found.")
        results["technical"] = {"status": "not_found"}

    # 2. Vendor Document Log
    vendor_file = get_latest_file("Z1F Vendor Document Log Report*.xls*", base_dir)
    if vendor_file:
        vendor_date = extract_date_from_filename(vendor_file)
        print(f"\n[2/4] Found Z1F Vendor Log: {os.path.basename(vendor_file)} (Date: {vendor_date})")
        try:
            update_vendor_data.process_vendor_file(vendor_file)
            results["vendor"] = {
                "file": os.path.basename(vendor_file),
                "date": vendor_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing Z1F Vendor Log: {e}")
            results["vendor"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[2/4] No Z1F Vendor Document Log file found.")
        results["vendor"] = {"status": "not_found"}

    # 3. Master Deliverable Registers (4 Contractor Sets)
    print(f"\n[3/4] Ingesting 4 Sets of Contractor Engineering Deliverable Registers (Z1F EDSR)...")
    try:
        update_mdr_data.process_mdr(tech_file)
        results["mdr"] = {
            "registers": ["Jacket EDSR", "Topside Structure EDSR", "Topside without Structure (00210)", "WP2 Pipeline Progress"],
            "status": "success"
        }
    except Exception as e:
        print(f"Error processing Z1F MDR/EDSR Registers: {e}")
        results["mdr"] = {"error": str(e), "status": "failed"}

    # 4. Analytic Evaluation Dataset
    print(f"\n[4/4] Generating Z1F Rebaseline Plan vs Actual Analytic Evaluation (data/z1f/analytics_data.js)...")
    try:
        update_analytics_data.process_analytics()
        results["analytics"] = {"status": "success"}
    except Exception as e:
        print(f"Error processing Z1F Analytic Evaluation: {e}")
        results["analytics"] = {"error": str(e), "status": "failed"}

    return results

def update_ask(base_dir="."):
    """Finds latest ASK files and runs the full ASK data pipeline."""
    results = {}
    print("\n" + "=" * 75)
    print(">>> PROCESSING ASK PROJECT DATASETS (Arthit / South Sawan Baseline)")
    print("=" * 75)

    # 1. Technical Document Log
    tech_file = get_latest_file("*ASK Technical Document Log Report*.xlsx", base_dir)
    if tech_file:
        tech_date = extract_date_from_filename(tech_file)
        print(f"\n[1/4] Found ASK Technical Log: {os.path.basename(tech_file)} (Date: {tech_date})")
        try:
            update_data_ask.process_ask_tech_file(tech_file)
            results["technical"] = {
                "file": os.path.basename(tech_file),
                "date": tech_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing ASK Technical Log: {e}")
            results["technical"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[1/4] No ASK Technical Document Log file found.")
        results["technical"] = {"status": "not_found"}

    # 2. Vendor Document Log
    vendor_file = get_latest_file("*ASK Vendor Document Log Report*.xls*", base_dir)
    if vendor_file:
        vendor_date = extract_date_from_filename(vendor_file)
        print(f"\n[2/4] Found ASK Vendor Log: {os.path.basename(vendor_file)} (Date: {vendor_date})")
        try:
            update_vendor_data_ask.process_ask_vendor_file(vendor_file)
            results["vendor"] = {
                "file": os.path.basename(vendor_file),
                "date": vendor_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing ASK Vendor Log: {e}")
            results["vendor"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[2/4] No ASK Vendor Document Log file found.")
        results["vendor"] = {"status": "not_found"}

    # 3. Master Deliverable Registers (4 Work Packages: WP01 TOPSIDE, WP01 JACKET, WP02 TOPSIDE, WP02 JACKET)
    mdr_file = get_latest_file("*MM-ASK-1A-GEN01-ENG-MDR-0001*.xlsx", base_dir)
    if mdr_file:
        mdr_date = extract_date_from_filename(mdr_file)
        print(f"\n[3/4] Found ASK MDR Register: {os.path.basename(mdr_file)} (Date: {mdr_date})")
        try:
            update_mdr_data_ask.process_ask_mdr(mdr_file, tech_file)
            results["mdr"] = {
                "file": os.path.basename(mdr_file),
                "date": mdr_date,
                "status": "success"
            }
        except Exception as e:
            print(f"Error processing ASK MDR Register: {e}")
            results["mdr"] = {"error": str(e), "status": "failed"}
    else:
        print("\n[3/4] No ASK MDR Register file found.")
        results["mdr"] = {"status": "not_found"}

    # 4. Analytic Evaluation Dataset
    print(f"\n[4/4] Generating ASK Rebaseline Plan vs Actual Analytic Evaluation (data/ask/analytics_data.js)...")
    try:
        update_analytics_data_ask.process_ask_analytics()
        results["analytics"] = {"status": "success"}
    except Exception as e:
        print(f"Error processing ASK Analytic Evaluation: {e}")
        results["analytics"] = {"error": str(e), "status": "failed"}

    return results

def update_all(target="all", base_dir="."):
    """Runs batch update for Z1F, ASK, or both."""
    overall = {}
    target_clean = str(target).lower().strip()

    if target_clean in ["z1f", "all"]:
        overall["z1f"] = update_z1f(base_dir)

    if target_clean in ["ask", "all"]:
        overall["ask"] = update_ask(base_dir)

    meta_path = os.path.join(base_dir, "latest_update.json")
    overall["updated_at"] = datetime.now().isoformat()
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(overall, f, indent=2)

    # Synchronize to flat root files (z1f_*.js and ask_*.js) for zero-subfolder GitHub deployment
    import shutil
    for fname in ["data.js", "vendor_data.js", "mdr_data.js", "analytics_data.js"]:
        z1f_src = os.path.join(base_dir, "data", "z1f", fname)
        ask_src = os.path.join(base_dir, "data", "ask", fname)
        if os.path.exists(z1f_src):
            shutil.copy2(z1f_src, os.path.join(base_dir, f"z1f_{fname}"))
        if os.path.exists(ask_src):
            shutil.copy2(ask_src, os.path.join(base_dir, f"ask_{fname}"))

    print("\n" + "=" * 75)
    print("Batch data processing completed! Saved summary to latest_update.json and flat root datasets.")
    print("=" * 75)
    return overall

def process_single_uploaded_file(file_path):
    """
    Intelligently routes an uploaded Excel file to the appropriate Z1F or ASK updater.
    Called automatically by server.py /api/upload.
    """
    filename = os.path.basename(file_path)
    fn_upper = filename.upper()
    file_date = extract_date_from_filename(filename)

    # 1. ASK Project Files
    if "ASK" in fn_upper:
        if "TECHNICAL" in fn_upper:
            print(f"Detected uploaded ASK Technical Document Log: {filename}")
            update_data_ask.process_ask_tech_file(file_path)
            update_analytics_data_ask.process_ask_analytics()
            return {"type": "ASK Technical Document Log", "file": filename, "date": file_date}
        elif "VENDOR" in fn_upper:
            print(f"Detected uploaded ASK Vendor Document Log: {filename}")
            update_vendor_data_ask.process_ask_vendor_file(file_path)
            return {"type": "ASK Vendor Document Log", "file": filename, "date": file_date}
        elif "MDR" in fn_upper:
            print(f"Detected uploaded ASK MDR Register: {filename}")
            update_mdr_data_ask.process_ask_mdr(file_path)
            update_analytics_data_ask.process_ask_analytics()
            return {"type": "ASK Master Deliverable Register", "file": filename, "date": file_date}

    # 2. Z1F Project Files
    if "TECHNICAL" in fn_upper:
        print(f"Detected uploaded Z1F Technical Document Log: {filename}")
        update_data.process_file(file_path)
        update_analytics_data.process_analytics()
        return {"type": "Z1F Technical Document Log", "file": filename, "date": file_date}

    if "VENDOR" in fn_upper:
        print(f"Detected uploaded Z1F Vendor Document Log: {filename}")
        update_vendor_data.process_vendor_file(file_path)
        return {"type": "Z1F Vendor Document Log", "file": filename, "date": file_date}

    if any(k in fn_upper for k in ["EDSR", "JACKET", "TOPSIDE", "00210", "WP2"]):
        print(f"Detected uploaded Z1F EDSR / Deliverable Register: {filename}")
        update_mdr_data.process_mdr()
        update_analytics_data.process_analytics()
        return {"type": "Z1F Deliverable Register (EDSR)", "file": filename, "date": file_date}

    # Fallback: re-run update_all
    print(f"Unrecognized specific pattern for '{filename}'. Running batch update_all...")
    update_all("all")
    return {"type": "General Excel Document", "file": filename, "date": file_date}

if __name__ == "__main__":
    target_arg = sys.argv[1] if len(sys.argv) > 1 else "all"
    update_all(target_arg)
