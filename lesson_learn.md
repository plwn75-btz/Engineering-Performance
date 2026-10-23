# Lessons Learned: ASK Project Document Intelligence Hub

**Document Date:** October 2026  
**Project:** ASK Field Development Project — Document Intelligence Hub  
**Author:** Engineering Team / Antigravity Agentic Assistant  

---

## 1. Executive Summary

This document captures key technical challenges, architectural lessons, edge cases, and root causes encountered and resolved during the ongoing development, multi-week data refresh, and analytical enhancements of the **ASK Document Intelligence Hub**. 

As weekly Excel files are ingested continuously into GitHub without removing historical reports, specific challenges arose around:
1. Document Control schema drift (insertion of unexpected columns like `FORECAST`).
2. Calendar-aware multi-week file sorting vs. alphabetical string sorting across month boundaries.
3. Multi-week comparative analytics (Week-over-Week forensic delta calculations).
4. Micro-typography and CSS layout stability (adding historical reference data without altering or expanding card grid heights).
5. Initial stage filter default ergonomics.

---

## 2. Key Lessons & Engineering Takeaways

### 2.1. Document Control Excel Schema Drift & Dynamic Column Mapping
- **The Challenge:** In the 25-Sep-2026 MDR release (`MM-ASK-1A-GEN01-ENG-MDR-0001_B1- Cut off 25-Sep-26.xlsx`), the Analytic Evaluation dashboard showed data exclusively for the `IFR -> IFA` transition corridor while `IFA -> AFC`, `IFR -> AFC (Fast-Track)`, and `AFC -> AP` rendered completely blank.
- **Root Cause Analysis:** Document Control inserted a new `FORECAST` column into every revision block in the 25-Sep MDR. This expanded each revision block from 6 columns (as seen in the 18-Sep release) to 7 columns. The analytic data extraction script previously relied on fixed column offsets (e.g. column index 28, 34, 40) to read Rebaseline Plan and Actual dates. Because of the +1 offset shift for `AFC` and +2 offset shift for `AP`, the code read text strings (such as `"Code 1"`) instead of dates, causing `isinstance(val, datetime)` checks to fail and dropping 3 of the 4 revision stages.
- **The Solution & Best Practice:**
  1. **Dynamic Header Mapping (`map_revision_columns`):** Never assume fixed column indices for engineering spreadsheets maintained by external teams.
  2. Implement an automated header scanner that inspects Rows 4 to 6 for parent revision names (`IFR`, `IFA`, `AFC`, `AP`) and child field labels (`REBASELINE`, `PLAN`, `ACTUAL`, `RETURN`, `CODE`).
  3. Map the column indices dynamically per worksheet. If a new column (like `FORECAST` or `TARGET`) is added or removed in future drops, the parser adapts automatically.

```python
def map_revision_columns(ws, start_row=4, end_row=6):
    """
    Dynamically scans header rows to identify exact column indices for each revision stage,
    adapting seamlessly to inserted or deleted columns.
    """
    col_map = {'IFR': {}, 'IFA': {}, 'AFC': {}, 'AP': {}}
    # Scans merged header ranges and secondary labels
    # Binds actual openpyxl column coordinates dynamically
    return col_map
```

---

### 2.2. Multi-Week Retention & Calendar Date vs. Lexicographical Sorting
- **The Challenge:** Project stakeholders upload new Excel files to GitHub every week without removing past weeks' files. When attempting to pick the latest file, standard alphabetical string sorting (`max(file_list)`) fails when transitioning between months or date formats (e.g., `'02-Oct-26'` is alphabetically smaller than `'25-Sep-26'`).
- **The Solution & Best Practice:**
  1. **Real Calendar Date Parsing (`extract_file_date_obj`):** Use regex to parse day, 3-letter month, and year into genuine `datetime` objects:
     ```python
     def extract_file_date_obj(filename):
         m = re.search(r'(\d{1,2})[-_\s]([A-Za-z]{3})[-_\s](\d{2,4})', filename)
         if m:
             day = int(m.group(1))
             mon = m.group(2).capitalize()
             yr = int(m.group(3))
             if yr < 100: yr += 2000
             return datetime.strptime(f"{day:02d}-{mon}-{yr}", "%d-%b-%Y")
         return datetime.min
     ```
  2. **Automated Dual-Week Assignment:**
     - Sort all matching files by calendar date object descending.
     - `sorted_files[0]` becomes the **Current/Active Reporting Cut-off**.
     - `sorted_files[1]` becomes the **Previous Week Reference Baseline**.
  3. **Zero Deletion Requirement:** The repository safely retains weeks of historical files without any conflict or manual filename renaming.

---

### 2.3. Week-over-Week Forensic Executive Summary & Trend Delta Engine
- **The Challenge:** Management required immediate forensic visibility into whether overall turnaround performance is improving or deteriorating compared to the previous week, both at a macro summary level and within each KPI metric.
- **The Solution & Best Practice:**
  1. **Automated Dual-Run Batching:** `update_analytics_data.py` processes the current week dataset and the prior week dataset within the same pipeline run.
  2. **Automated Executive Statement Generation:** Automatically computes deltas for:
     - Compliance rate change ($\Delta\%$).
     - Newly completed on-track transitions count ($+N$).
     - Client review average duration and SLA compliance rate ($\Delta \text{WD}, \Delta\%$).
     - Contractor comment incorporation duration ($\Delta \text{WD}$).
     - Contractor delay overrun percentage and contractual threshold status ($> 50\%$).
  3. **Forensic Callout Placement:** The Week-over-Week statement is injected into a dedicated high-contrast glassmorphic callout placed immediately beneath the Executive Forensic Statement paragraph for effortless executive scanning.

---

### 2.4. Zero-Expansion Micro-Typography for KPI Card References
- **The Challenge:** Adding historical reference metrics (e.g., `Prev (18-Sep-2026): 2,130 (+200)`) into the 6 KPI cards risked expanding the card heights, wrapping text awkwardly, or breaking the tight grid alignment with the rest of the dashboard.
- **The Solution & Best Practice:**
  1. **Fixed Baseline Micro-Notes:** Applied `font-size: 0.68rem; line-height: 1.1; margin-top: 4px;` to `.kpi-wow-note`.
  2. **Subtle Palette & Color-Coded Micro-Badges:** Reference text uses muted slate (`#94a3b8` in dark, `#64748b` in light) with green (`.trend-pos`), red (`.trend-neg`), or amber (`.trend-warn`) micro-indicators for instant trend comprehension without visual noise.
  3. **Preserved Vertical Rhythm:** Verified via headless browser screenshot analysis that all 6 KPI cards maintain identical uniform height before and after adding reference notes.

---

### 2.5. Default Filter Ergonomics & Chart Visibility
- **The Challenge:** If a dashboard initializes with an empty or overly restrictive filter (e.g. single stage selection), users might perceive missing data as a system error.
- **The Solution & Best Practice:**
  1. Always set master aggregations (such as `"All Revision Transitions"`) as the initial default state.
  2. Ensure chart series builders evaluate all active lifecycle corridors (`IFR -> IFA`, `IFA -> AFC`, `IFR -> AFC Fast-Track`, `AFC -> AP`) dynamically so stacked and grouped bar charts immediately render all stages upon page load.
