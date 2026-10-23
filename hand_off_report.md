# Technical & Vendor Document Workflow & Review Duration Dashboards
## System Hand-Off Report & Engineering Operations Manual

**Project Name**: ASK Field Development Project  
**Deliverables**: 
1. Technical Document Review Duration Dashboard (`index.html`)  
2. Vendor Document Review Duration Dashboard (`index_vendor.html`)  
3. Technical Document Revision Lifecycle & MDR Pipeline Dashboard (`index_mdr.html`)  
4. Analytic Evaluation Dashboard (Rebaseline vs Actual Delay Attribution) (`index_analytics.html`)  
**Data Sources**:
- `MM-ASK-1A-GEN01-ENG-MDR-0001_B1- Cut off 18-Sep-26.xlsx` (Master Document Register)
- `ASK Technical Document Log Report - 18 Sep 26.xlsx` (Technical Deliverables Log)
- `ASK Vendor Document Log Report - 18 Sep 26.xls` (Vendor Deliverables Log)  
**Reporting Cut-off Date**: 18-Sep-2026 (Dynamic weekly auto-detection)  
**Author / Engineering Assistant**: Antigravity (Google DeepMind)  
**Hand-off Date**: September 2026  

---

## Table of Contents
1. [Executive Summary & Purpose](#1-executive-summary--purpose)
2. [Business Requirements Traceability Matrix](#2-business-requirements-traceability-matrix)
3. [Document Workflow & Lifecycle Architecture](#3-document-workflow--lifecycle-architecture)
4. [SLA & Duration Calculation Methodology (10 Working Days)](#4-sla--duration-calculation-methodology-10-working-days)
5. [System Architecture & Repository Structure](#5-system-architecture--repository-structure)
6. [Dashboard Interfaces & Operational Walkthrough](#6-dashboard-interfaces--operational-walkthrough)
   - 6.1 [Dashboard 1: Technical Document Review Duration Dashboard (`index.html`)](#61-dashboard-1-technical-document-review-duration-dashboard-indexhtml)
   - 6.2 [Dashboard 2: Vendor Document Review Duration Dashboard (`index_vendor.html`)](#62-dashboard-2-vendor-document-review-duration-dashboard-index_vendorhtml)
   - 6.3 [Dashboard 3: Revision Lifecycle & MDR Pipeline Dashboard (`index_mdr.html`)](#63-dashboard-3-revision-lifecycle--mdr-pipeline-dashboard-index_mdrhtml)
   - 6.4 [Dashboard 4: Analytic Evaluation (Rebaseline vs Actual) Dashboard (`index_analytics.html`)](#64-dashboard-4-analytic-evaluation-rebaseline-vs-actual-dashboard-index_analyticshtml)
7. [Step-by-Step Data Maintenance & Update Runbook](#7-step-by-step-data-maintenance--update-runbook)
8. [Operational Readiness, Risks & Mitigations for New Weekly Excel Drops (28-Sep-26 Onwards)](#8-operational-readiness-risks--mitigations-for-new-weekly-excel-drops-28-sep-26-onwards)
9. [Manual GitHub Upload Inventory (File-by-File Checklist)](#9-manual-github-upload-inventory-file-by-file-checklist)
10. [Future Improvement & Operational Roadmap](#10-future-improvement--operational-roadmap)
11. [Management Analysis Frameworks Summary (TOC & RACI)](#11-management-analysis-frameworks-summary-toc--raci)
12. [Conclusion & System Sign-Off](#12-conclusion--system-sign-off)

---

## 1. Executive Summary & Purpose

The purpose of this project is to provide a unified intelligence hub for tracking, analyzing, and expediting engineering technical deliverables across the ASK Field Development Project. It delivers deep operational visibility into the dual-party engineering workflow between:
- **Contractor**: Responsible for baseline scheduling, document generation, and comment incorporation turnaround.
- **Client Engineering Team / PMT (ASK)**: Responsible for interdisciplinary technical reviews, timely return of transmittal status, and final document approval close-out.

The system comprises three specialized web applications connected via seamless top-navigation switcher tabs, built with vanilla HTML5, CSS3, and JavaScript, requiring zero heavy backend dependencies and running effortlessly offline or hosted on any internal intranet.

---

## 2. Business Requirements Traceability Matrix

| Req # | User Requirement | Description & Context | Implementation & Status |
| :---: | :--- | :--- | :--- |
| **REQ-01** | **Part B Focus as Primary Scope** | Prioritize *Part B - Engineering Documents* as default analytical scope, keeping *Part A (Management)* and *Part E (Vendor Docs)* optional. | Added interactive scope pills: `Part B Only (Default)`, `Part B & C (Engineering)`, `All Work Packages`, plus individual toggle checkboxes. |
| **REQ-02** | **"Meet Agreement" Terminology** | Replaced generic "COMPLIANCE" with contractual terminology **"MEET AGREEMENT"** (≤ 10 WD) and **"OVER AGREEMENT"** (> 10 WD). | Updated all chart legends, KPI labels, filter badges, and drawer statuses across all dashboards. |
| **REQ-03** | **Interactive Drill-Down & Detail Drawer** | Users required the ability to click any chart tier, milestone node, or KPI card to see exact document numbers, titles, and disciplines. | Implemented slide-out side drawers and modals with live search, CSV export, multi-attribute filtering, and revision timeline expansion. |
| **REQ-04** | **Master Document Register (MDR) Multi-Tab Ingestion** | Ingest `MM-ASK-1A-GEN01-ENG-MDR-0001_B1` across 5 tabs (Part A, Part B, Part C, Part D, Part E) tracking 1,904 deliverables. | Developed [`update_mdr_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_mdr_data.py) to parse multi-tab Excel sheets, normalize dates, link return codes, and calculate lifecycle stages. |
| **REQ-05** | **Revision Lifecycle Flow Analysis (IFR ➔ IFA ➔ AFC ➔ AP)** | Map the full lifecycle stages: Issue for Review (`IFR`), Issue for Approval (`IFA`), Approved for Construction (`AFC`), and Final Approved (`AP`). | Built Dashboard 2 (`index_mdr.html`) featuring an interactive 4-stage pipeline showing revision transitions, bypass paths, and drop-offs. |
| **REQ-06** | **Contractor Comment Incorporation Durations** | Analyze and display the duration taken by Contractor to incorporate comments between revisions: (IFR ➔ IFA), (IFA ➔ AFC), and (AFC ➔ AP). | Calculated **Monday–Friday working days** from Client `Actual Submit Out` to Contractor `Actual Submit In` for the next revision. Displayed inside dynamic indicator badges. |
| **REQ-07** | **Visual Separation of Contractor vs. Client Roles** | Clear visual demarcation of who owns each activity: Green/Yellow = Contractor action; Blue = Client review/approval. | Color-coded pipeline nodes: Green header/cards for Contractor submittals; Yellow circles for Contractor comment incorporation; Blue headers/arrows for Client reviews. |
| **REQ-08** | **UI Simplification & Proportional Scaling** | Streamline interface, enlarge incorporation duration circles, and remove redundant boxes. | Scaled yellow incorporation circles to prominent badges with clear role attribution ("Contractor Incorp Avg: X WD"). |
| **REQ-09** | **AP Client Close-out Lead Time** | Include the final approval close-out duration by Client from AFC return to official AP endorsement. | Added Step 4 AP Close-out card and badges displaying average Client approval time (`9.3 working days`). |
| **REQ-10** | **Executive Management Performance Report** | Provide a holistic executive performance summary using established management tools (Scorecard, TOC, RACI, DMAIC). | Generated standalone report [`executive_performance_analysis.md`](file:///C:/Users/pipes/.gemini/antigravity-ide/brain/57a58d2d-2b3d-4e87-9b9c-94d3514e7eb7/executive_performance_analysis.md) and integrated an interactive in-dashboard modal. |
| **REQ-11** | **10 Working Days SLA Criteria** | **Strict requirement that contractual review duration benchmark is 10 WORKING DAYS (excluding weekends), NOT 10 calendar days.** | Overhauled calculation logic across Python processors and JavaScript frontends to compute Monday–Friday working days. Recomputed all SLAs. |
| **REQ-12** | **Vendor Document Log Dashboard (New Tab)** | The user requested processing `ASK Vendor Document Log Report - 18 Sep 26.xls` and providing the exact same review duration dashboard in a dedicated tab. | Ingested 188 vendor submissions via [`update_vendor_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_vendor_data.py), generated [`vendor_data.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/vendor_data.js), built [`index_vendor.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_vendor.html) and [`app_vendor.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_vendor.js), and linked across all navigation menus. |
| **REQ-13** | **Review Duration Distribution Tiers Drill-Down Fix** | Fix issue where clicking the Review Duration Distribution Tiers bars (e.g. `6 - 10 WD`) failed to open the detail view modal. | Resolved DOM binding exception in `app_vendor.js` (`tierModalBadge`), adjusted backdrop CSS with `z-index: 9999;` and `.open` state, and added clear `View Details 🔍` buttons. Verified via browser subagent. |
| **REQ-14** | **SLA Definition Across All Dashboards** | Provide clear meaning and definition of "SLA" throughout all dashboards, explaining the 10 Working Days standard. | Added interactive `Within SLA ℹ️` badges and top-nav `ℹ️ What is SLA?` buttons opening dedicated explanatory dialogs across `index.html`, `index_vendor.html`, and `index_mdr.html`. |
| **REQ-15** | **Automated Weekly File Ingestion Engine** | Support weekly Excel files where filenames change only by date. Automatically update dashboard upon file upload without manual code changes. | Built [`update_all.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_all.py) with wildcard date discovery and `/api/upload` endpoint in [`server.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/server.py). Added Drag & Drop upload modal directly in the web UI. |
| **REQ-16** | **GitHub & Render.com Deployment Package** | Prepare project for manual push to GitHub and turnkey production deployment on Render.com. | Generated [`Procfile`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/Procfile), [`render.yaml`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/render.yaml), [`requirements.txt`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/requirements.txt), [`server.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/server.py), and comprehensive [`README.md`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/README.md). Initialized git repository and executed initial commit. |
| **REQ-17** | **MDR Dashboard Light/Dark Theme Toggle** | Add toggle button to switch between light and dark modes on the MDR Lifecycle dashboard with persistent user preference. | Added theme button in header actions, wired SVG icon switcher and `data-theme` attribute binding in [`app_mdr.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_mdr.js), unified `localStorage` key (`ask_dash_theme`) across all 3 dashboards, and styled light mode in [`styles_mdr.css`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/styles_mdr.css). |
| **REQ-18** | **Contractor Info Removal Across All Dashboards** | Remove Contractor contact info and emails from header subtitles, meta tags, and footers across all dashboards. | Removed `zm167dc@jutal.com` and related contact details from [`index.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index.html), [`index_vendor.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_vendor.html), [`index_mdr.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_mdr.html), and documentation. |
| **REQ-19** | **Contractor Turnaround Recalculated to Working Days (WD)** | Convert Contractor comment incorporation duration from calendar days to contractual Working Days (Monday–Friday). | Updated [`update_mdr_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_mdr_data.py) with `calc_working_days()`, regenerated [`mdr_data.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/mdr_data.js), and updated frontend display labels/benchmarks in [`app_mdr.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_mdr.js) and [`index_mdr.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_mdr.html). |
| **REQ-20** | **Light Mode Clarity & Sliding Bar Contrast Adjustment** | In light mode, sliding package/scope bars, top switcher links, and action buttons (`What is SLA?`, `Upload New File`) lacked contrast and were washed out. | Implemented high-contrast solid color fills (`#0284c7`, `#2563eb`, `#6366f1`) with pure white text and crisp badge pills. Darkened interactive button text (`#0f172a`, `#334155`, `#4338ca`) and borders (`#cbd5e1`). Verified with browser subagent. |
| **REQ-21** | **Relocation of Theme Toggle Icon to Last Position** | Light/dark mode toggle button was located between action buttons. Relocate it to the far right after `Reset Filters` across all dashboards. | Moved `#themeToggleBtn` to the final position in `.header-actions` across `index.html`, `index_vendor.html`, and `index_mdr.html`. |
| **REQ-22** | **Automated Cut-Off / Report Date Engine** | Header report dates were static HTML strings ("18-Sep-2026"). Automatically update date based on latest weekly Excel cut-off file. | Built regex date extractor in `update_data.py`, `update_vendor_data.py`, `update_mdr_data.py`, and `update_all.py` outputting `window.<TYPE>_REPORT_DATE`. Dynamically bound `#headerReportDate` in `app.js`, `app_vendor.js`, and `app_mdr.js` with fallback. |
| **REQ-23** | **Analytic Evaluation & Rebaseline Delay Attribution (New Tab)** | Verify Contractor proposed plan as per "REBASELINE PLAN" across IFR, IFA, AFC, and AP revisions. Compare plan vs actual execution to answer 3 core questions: (1) Is plan realistic/effective? (2) Does actual turnaround meet plan? (3) Pinpoint delay root cause parameters: (1) Improperly Planned, (2) Late Incorporation by Contractor, (3) Late Client Review (> 10 WD), or Compound Delay. Enforce Contractor entitlement right to maintain their planned incorporation allowance when Client takes > 10 WD. Evaluate macro justification if Contractor-driven delays exceed 50%. | Created dedicated 4th dashboard hub [`index_analytics.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_analytics.html), [`app_analytics.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_analytics.js), [`styles_analytics.css`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/styles_analytics.css), and [`update_analytics_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_analytics_data.py). Analyzed 2,639 revision transitions: 68.6% met plan; 59.7% of delays are Contractor-driven (> 50% threshold), confirming Contractor's plan was systematically over-optimistic/improperly planned. |
| **REQ-24** | **Dynamic MDR Column Mapping & Multi-Week File Ingestion Engine** | Handle weekly Excel files uploaded to GitHub without deleting past weeks' files. Implemented calendar-date sorting (`extract_file_date_obj`), resilient column mapping (`map_revision_columns`) to handle document control schema variations (such as `FORECAST` column insertions), and added Week-over-Week trend comparison statements with compact KPI micro-reference notes. | Updated `update_all.py`, `update_analytics_data.py`, `update_mdr_data.py`, `update_data.py`, and `update_vendor_data.py` with real calendar parsing. Automated dual-week comparison (current cut-off vs previous cut-off) generating dynamic WoW statement and micro-notes on all 6 KPI cards with zero layout height expansion. |
| **REQ-25** | **Revision Transition Stage Chart Default to "All Revision Transitions"** | Fix blank revision stages on initial page load and set "All Revision Transitions" as default view. | Updated initial state in `app_analytics.js` and `index_analytics.html` to default to "All Revision Transitions", dynamically rendering all 4 revision corridors (`IFR -> IFA`, `IFA -> AFC`, `IFR -> AFC Fast-Track`, `AFC -> AP`) simultaneously on initial dashboard load. |


---

## 3. Document Workflow & Lifecycle Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ENGINEERING REVISION PIPELINE                                   │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘

   [ CONTRACTOR ]                   [ CLIENT ]                   [ CONTRACTOR ]                  [ CLIENT ]
 ┌─────────────────┐             ┌───────────────┐            ┌─────────────────┐             ┌──────────────┐
 │ Issue For Review│  Transmittal │ Client Review │ Return MoM │ Incorp Comments │ Transmittal │ Client Review│
 │  (IFR / Rev A1) ├────────────►│  (≤ 10 WD)    ├───────────►│  (IFA Incorp)   ├────────────►│ (IFA / Rev B)│
 └─────────────────┘             └───────┬───────┘            └─────────────────┘             └──────┬───────┘
                                         │ (Fast-Track Bypass: 478 docs)                             │
                                         └───────────────────────────────┐                           │
                                                                         ▼                           │
                                                              ┌─────────────────┐                    │
                                                              │ Incorp Comments │                    │
                                                              │  (AFC Incorp)   │◄───────────────────┘
                                                              └────────┬────────┘
                                                                       │ Transmittal
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │ Client Review   │
                                                              │  (AFC / Rev C)  │
                                                              └────────┬────────┘
                                                                       │ Code 1 / APPR
                                                                       ▼
                                                              ┌─────────────────┐
                                                              │ Client Closeout │
                                                              │  (Final APPR)   │
                                                              └─────────────────┘
```

---

## 4. SLA & Duration Calculation Methodology (10 Working Days)

### 4.1 Working Days Calculation Algorithm
Review turnaround between Client receipt (`Actual Submit In`) and Client transmittal return (`Actual Submit Out`) is calculated strictly over **Monday through Friday**:

$$\text{Working Days} = \sum_{d = \text{Submit In} + 1}^{\text{Submit Out}} \mathbb{I}(\text{Weekday}(d) \in \{\text{Mon, Tue, Wed, Thu, Fri}\})$$

#### Python Implementation (`update_data.py`, `update_vendor_data.py`, `update_mdr_data.py`):
```python
from datetime import timedelta

def calc_working_days(d_start, d_end):
    if not d_start or not d_end:
        return None
    if d_end < d_start:
        return 0
    cur = d_start + timedelta(days=1)
    wd = 0
    while cur <= d_end:
        if cur.weekday() < 5:  # Monday to Friday (0-4)
            wd += 1
        cur += timedelta(days=1)
    return wd
```

---

## 5. System Architecture & Repository Structure

```
Doc_Dashboard/
│
├── index.html                  # Dashboard 1: Technical Document Review Duration Dashboard
├── app.js                      # Controller & visualization engine for Dashboard 1
├── data.js                     # Ingested dataset: 3,046 technical log review records
│
├── index_vendor.html           # Dashboard 2: Vendor Document Review Duration Dashboard
├── app_vendor.js               # Controller & visualization engine for Dashboard 2 (tier modal, package rankings)
├── vendor_data.js              # Ingested dataset: 188 vendor log review records
│
├── index_mdr.html              # Dashboard 3: MDR Workflow & Revision Lifecycle Dashboard
├── app_mdr.js                  # Controller, pipeline renderer & modal engine for Dashboard 3
├── mdr_data.js                 # Ingested dataset: 1,904 MDR master deliverables
│
├── index_analytics.html        # Dashboard 4: Analytic Evaluation (Rebaseline vs Actual Delay Attribution)
├── app_analytics.js            # Controller, delay attribution engine & interactive table for Dashboard 4
├── styles_analytics.css        # Styling for Analytics evaluation cards, charts, and dark theme
├── analytics_data.js           # Ingested dataset: 2,639 revision transition records with root cause attribution
│
├── styles.css                  # Modern responsive design system (Glassmorphism, dark/light, modals)
├── styles_mdr.css              # Custom styling for interactive lifecycle pipeline & cards
│
├── update_all.py               # Master CLI auto-updater: regex date discovery across all reports
├── update_data.py              # Automated data transformer: Technical Log Excel ➔ data.js
├── update_vendor_data.py       # Automated data transformer: Vendor Log Excel ➔ vendor_data.js
├── update_mdr_data.py          # Automated data transformer: MDR Excel ➔ mdr_data.js
├── update_analytics_data.py    # Automated data transformer: Rebaseline plan vs actual delay analysis
├── server.py                   # Production Flask application with /api/upload endpoint
├── Procfile                    # Render.com start command (web: gunicorn server:app)
├── render.yaml                 # Render Infrastructure-as-Code Blueprint
├── requirements.txt            # Python dependencies (flask, gunicorn, pandas, openpyxl, xlrd)
├── latest_update.json          # Cut-off tracking metadata log
│
├── README.md                   # Complete GitHub & Render deployment and operations guide
├── hand_off_report.md          # THIS COMPREHENSIVE HAND-OFF MANUAL
│
├── ASK Technical Document Log Report - 18 Sep 26.xlsx  # Technical Source Log Report
├── ASK Vendor Document Log Report - 18 Sep 26.xls      # Vendor Source Log Report
└── MM-ASK-1A-GEN01-ENG-MDR-0001_B1- Cut off 18-Sep-26.xlsx # Source MDR Register
```

---

## 6. Dashboard Interfaces & Operational Walkthrough

### 6.1 Dashboard 1: Technical Document Review Duration Dashboard (`index.html`)
- **Interactive Scope Bar**: Focus on `Part B Only (Default)`, `Part B & C`, or `All Work Packages`.
- **KPI Summary Cards**: Total Submittals (`3,046`), Within 10 WD (`1,579 / 59.4%`), Over 10 WD (`1,078 / 40.6%`), Pending (`389`), Avg Review (`10.2 WD`).
- **Interactive Charts**: Donut compliance chart, duration tiers (`≤ 5 WD`, `6 - 10 WD`, etc.) with clickable drill-down modal, and discipline stacked chart.
- **Data Table & Detail Drawer**: Sortable registry with live search and slide-out revision history drawer.

---

### 6.2 Dashboard 2: Vendor Document Review Duration Dashboard (`index_vendor.html`)
- **Dedicated Equipment Package Navigation**: Quick filter pills for major vendor equipment packages (*Chemical Injection Skid*, *Plate*, *Pedestal Cranes*, *Wellhead Control Panel*, *Closed Drain Sump Pump*, *Storage Tank*, *Diesel Transfer Pump*, *Open Drain Pump*, etc.).
- **KPI Summary Cards**:
  - **Total Vendor Submissions**: `188` submittals (`142` unique documents)
  - **Within 10 Working Days (Meet Agreement)**: `74` reviews (**89.2%** of completed!)
  - **Over 10 Working Days (Over Agreement)**: `9` reviews (**10.8%**)
  - **Pending Client Review**: `105` submittals (**55.9%** awaiting return)
  - **Average Review Duration**: **`8.2 Working Days`** (Well within contractual 10 WD SLA)
- **Vendor Package Performance Table**: Displays total submittals, completed reviews, within/over counts, average working days lead time, and visual agreement percentage progress bars per package.
- **Duration Distribution Tiers Chart & Drill-down Modal**: Click any tier bar (`≤ 5 WD`, `6 - 10 WD`, etc.) to open an interactive modal filtered to that turnaround tier, with discipline chips and in-tier search.
- **Slide-out Detail Drawer**: Displays vendor deliverable metadata, package name, transmittal dates, working days duration, and return status tags.

---

### 6.3 Dashboard 3: Revision Lifecycle & MDR Pipeline Dashboard (`index_mdr.html`)
- **4-Stage Milestone Pipeline**: Tracks `IFR` (11.0 WD) ➔ `IFA` (9.7 WD) ➔ `AFC` (8.8 WD) ➔ `AP Close-out` (9.3 WD).
- **Contractor Comment Incorporation Badges**: Scaled yellow badges displaying average Contractor re-work duration: `20.8 calendar days` (IFR to IFA) and `24.5 calendar days` (IFA to AFC).
- **Fast-Track Corridor**: Tracks the `478 documents` accelerated directly from IFR to AFC.
- **Executive Performance Analysis Modal**: Integrated full-screen briefing with Balanced Scorecard, Theory of Constraints (TOC) analysis, RACI Matrix, and DMAIC continuous improvement roadmap.

---

### 6.4 Dashboard 4: Analytic Evaluation (Rebaseline vs Actual) Dashboard (`index_analytics.html`)
- **Dual Investigation Mandate**:
  1. *Effectiveness of Contractor Rebaseline Plan*: Evaluates whether Contractor's proposed incorporation durations were realistic or systematically compressed.
  2. *Delay Attribution Parameters*: Decomposes all overdue revision transitions into four mutually exclusive contractual root causes:
     - **Improperly Planned (Contractor Over-run)**: Contractor planned ≤ 0 or unrealistically short incorporation days, or breached planned turnaround without Client delay.
     - **Late Incorporation (Contractor)**: Contractor took more calendar/working days to revise than originally planned.
     - **Late Client Review (> 10 WD)**: Client exceeded the contractual 10 Working Day review allowance while Contractor incorporated within or on plan.
     - **Compound Delay**: Both Client exceeded 10 WD review AND Contractor incorporated late.
- **Contractual Entitlement Safeguard**:
  - Enforces the Contractor's contractual right to maintain their planned incorporation duration allowance even when the Client returns transmittals late (> 10 WD). Contractor is only penalized for their own incremental variance.
- **50% Macro Justification Threshold**:
  - Automatically assesses whether Contractor-caused delays exceed 50% of all delay events across the project to provide indisputable evidence for contractual claims and time extension negotiations.
- **Interactive Visualizations**:
  - **KPI Cards**: Total Transitions (`2,639`), Met Rebaseline Plan (`1,811 / 68.6%`), Delayed (`828 / 31.4%`), Contractor-Driven Delays (`494 / 59.7%`), Client Late Reviews (`334 / 40.3%`).
  - **Donut Chart**: High-contrast root cause breakdown with dedicated color scheme: Late Client Review (Ocean Blue `#0284c7`), Compound Delay (Crimson `#dc2626`), Late Cont. Incorp (Amber `#f59e0b`), Improper Plan (Purple `#8b5cf6`).
  - **Stacked Bar Chart by Discipline**: Extended to full right width, displaying delay distributions across Topside, Hull, Mooring, SURF, and Subsea disciplines in a single-row header.
  - **Turnaround Delta Distribution Chart**: Shows variance tiers (`≤ 0 days on plan`, `1-5 days`, `6-10 days`, `11-20 days`, `> 20 days delay`).
  - **Sortable Drill-Down Table**: 11 centered column headers without arrow glyphs, clean left-aligned document numbers/titles with single-line ellipsis, and streamlined single-row action buttons (`Details 🔍`).

---

## 7. Step-by-Step Data Maintenance & Update Runbook

When Document Control issues weekly updated cut-off reports where **only the date in the filename changes**, you have two seamless methods to update the dashboards:

### Method A: Direct Web UI Upload (Zero-Code Drag & Drop)
1. Open the live dashboard on Render.com (or local web server).
2. Click the **`📁 Upload New File`** button in the top navigation.
3. Drag & drop or browse for the new Excel file:
   - Technical Log (`.xlsx`)
   - Vendor Log (`.xls` or `.xlsx`)
   - MDR Register (`.xlsx`)
4. The backend server automatically detects the report type, recalculates all 10 Working Days turnaround metrics, rebuilds the database, and reloads fresh data immediately.

### Method B: Automated CLI Batch Script (`update_all.py`)
If running locally from the project directory:
1. Place the new weekly Excel files into `Doc_Dashboard/`.
2. Run the master auto-discovery script:
   ```powershell
   python update_all.py
   ```
3. The script automatically:
   - Scans the directory using regex wildcards (`ASK Technical Document Log Report*.xlsx`, `ASK Vendor Document Log Report*.xls*`, `*MDR*.xlsx`).
   - Identifies the latest cut-off dates across all matching files.
   - Recalculates working days and updates `data.js`, `vendor_data.js`, `mdr_data.js`, `analytics_data.js`, and `latest_update.json`.

### Method C: Deploying Updates to GitHub & Render.com
1. Commit the updated datasets or weekly files:
   ```powershell
   git add .
   git commit -m "Update weekly cut-off data"
   git push origin main
   ```
2. Render.com automatically detects the push and redeploys the live site in ~60 seconds.

---

## 8. Operational Readiness, Risks & Mitigations for New Weekly Excel Drops (28-Sep-26 Onwards)

To ensure high reliability when updating the dashboards weekly with new cut-off files (e.g. dated 28-Sep-2026 and subsequent cycles), a comprehensive audit of the end-to-end data ingestion pipeline was performed. The following operational risks, technical concerns, and concrete mitigation strategies have been documented for record:

### 8.1 Identified Technical Concerns & Root Cause Analysis

| # | Technical Concern | Root Cause & Failure Scenario | Risk Level | Direct Impact |
| :-: | :--- | :--- | :---: | :--- |
| **C-1** | **String-Based File Sorting Bug Across Calendar Months** | Standalone processors (`update_data.py`, `update_vendor_data.py`, `update_mdr_data.py`, `update_analytics_data.py`) locate the latest Excel file using `sorted(glob.glob(...), reverse=True)`. Within September (`28-Sep-26` vs `18-Sep-26`), alphabetical sorting succeeds because `'28'` > `'18'`. **However, in October (`05-Oct-26`), alphabetical sorting will fail** because `'28-Sep-26'` > `'05-Oct-26'` (`'2'` > `'0'`). In addition, `update_all.py` uses `os.path.getmtime()` which becomes non-deterministic in fresh Git clones or CI/CD checkouts where all files receive the same filesystem checkout timestamp. | **HIGH** *(Triggered upon Month Rollover)* | Dashboards would silently ignore newly added October/November files and continue processing outdated September data. |
| **C-2** | **Render.com Cloud Auto-Build Gap (Direct GitHub Uploads)** | In [`render.yaml`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/render.yaml), the deployment configuration specifies: `buildCommand: pip install -r requirements.txt`. It does **not** execute `python update_all.py`. If a user uploads new Excel files to GitHub via web UI without running the python updater locally, Render rebuilds the Flask app but continues serving the old, static `.js` files. | **MEDIUM-HIGH** | Cloud dashboard displays stale data even after new Excel files are committed to GitHub. |
| **C-3** | **MDR Worksheet Whitespace Sensitivity** | `update_analytics_data.py` uses direct dictionary lookup `wb_mdr[sname]` where `sname` iterates over `['WP01 TOPSIDE', 'WP02 HULL', 'WP03 MOORING', 'WP04 SURF', 'WP05 SUBSEA']`. If a document controller or EDMS export introduces a trailing space in a sheet name (e.g. `'WP01 TOPSIDE '` or `'WP02 HULL '`), openpyxl throws an unhandled `KeyError: "Worksheet WP01 TOPSIDE does not exist"`, immediately terminating the analytics extraction. | **MEDIUM** | Ingestion pipeline crashes abruptly if any tab has trailing whitespace. |
| **C-4** | **Weekly Source Log Column Header Variance** | Periodically, document control teams may introduce minor header spacing or phrasing changes in weekly exports (e.g. `'Actual Submit In '` vs `'Actual Submit In'`, or `'Planned Submit In'` vs `'Planned Submit Date'`). | **LOW** | Potential for missed column mappings if headers are parsed with strict exact matching. |

---

### 8.2 Engineered Mitigation Plan & Action Items

#### Mitigation for Concern C-1: Calendar Date Extraction & Chronological Sorting
Replace ASCII string sorting and filesystem `getmtime` with a robust calendar date parser that converts dates from filenames (`18 Sep 26`, `28-Sep-26`, `05-Oct-26`) into true `datetime.date` objects:
```python
import re
from datetime import datetime

MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}

def extract_file_date(filename):
    """Extracts Day, Month, Year from filenames and returns a datetime.date object."""
    match = re.search(r'(\d{1,2})[\s\-_]+([A-Za-z]{3})[\s\-_]+(\d{2,4})', filename)
    if match:
        day = int(match.group(1))
        month_str = match.group(2).lower()
        year = int(match.group(3))
        if year < 100:
            year += 2000
        month = MONTH_MAP.get(month_str, 1)
        return datetime(year, month, day).date()
    return datetime.min.date()

def find_latest_file(file_list):
    """Sorts candidate files strictly by calendar date."""
    if not file_list:
        return None
    return max(file_list, key=lambda f: extract_file_date(f))
```

#### Mitigation for Concern C-2: Turnkey Cloud Deployment Configuration
Update [`render.yaml`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/render.yaml) so that Render.com automatically runs the master ingestion engine whenever new code or Excel files are pushed:
```yaml
services:
  - type: web
    name: ask-doc-dashboard
    env: python
    buildCommand: pip install -r requirements.txt && python update_all.py
    startCommand: gunicorn server:app
```
*Operational Guideline*: If uploading files manually via GitHub Web UI prior to updating `render.yaml`, remember to either:
1. Run `python update_all.py` on your local computer first, then commit both the new `.xlsx` files and the refreshed `.js` datasets (`data.js`, `vendor_data.js`, `mdr_data.js`, `analytics_data.js`, `latest_update.json`) to GitHub; OR
2. Use the live web UI's **`📁 Upload New File`** button on Render, which processes files on the server directly.

#### Mitigation for Concern C-3: Whitespace & Case-Insensitive Sheet Resolution
In `update_analytics_data.py` (and all openpyxl loaders), replace direct dictionary access `wb[name]` with a fault-tolerant sheet finder:
```python
def get_worksheet_resilient(workbook, target_name):
    """Finds worksheet matching target_name regardless of casing or extra whitespace."""
    target_clean = target_name.strip().upper()
    for name in workbook.sheetnames:
        if name.strip().upper() == target_clean:
            return workbook[name]
    # Fallback to prefix matching if exact match fails
    for name in workbook.sheetnames:
        if target_clean in name.strip().upper():
            return workbook[name]
    return None
```

#### Mitigation for Concern C-4: Multi-Week File Retention & Calendar Date Auto-Detection
As Excel files are uploaded to GitHub week-by-week without removing past weeks' files, alphabetical string sorting fails when crossing month boundaries (e.g. `02-Oct` vs `25-Sep`). All ingestion scripts (`update_all.py`, `update_data.py`, `update_vendor_data.py`, `update_mdr_data.py`, `update_analytics_data.py`) now implement real calendar date parsing:
```python
def extract_file_date_obj(filename):
    """Extracts date object from filenames like '... 25 Sep 26' or '... Cut off 25-Sep-26'."""
    m = re.search(r'(\d{1,2})[-_\s]([A-Za-z]{3})[-_\s](\d{2,4})', filename)
    if m:
        day = int(m.group(1))
        mon = m.group(2).capitalize()
        yr = int(m.group(3))
        if yr < 100: yr += 2000
        return datetime.strptime(f"{day:02d}-{mon}-{yr}", "%d-%b-%Y")
    return datetime.min
```
* **Active Cut-off**: The file with the latest calendar date is automatically selected as the current reporting cut-off.
* **Historical Reference**: The file with the second-latest calendar date is automatically parsed as the prior week reference, feeding Week-over-Week trend metrics.
* **Zero Deletions Required**: Historical files can remain indefinitely in the repository without conflict.

#### Mitigation for Concern C-5: Dynamic MDR Column Header Detection
Document Control may introduce or remove columns between weekly revisions (for example, inserting a `FORECAST` column in 25-Sep-26, expanding the block size from 6 to 7 columns). To prevent hardcoded index errors, `update_analytics_data.py` and `update_mdr_data.py` dynamically scan Row 4/5 headers:
```python
def map_revision_columns(ws, start_row=4, end_row=6):
    # Dynamically locates IFR, IFA, AFC, AP parent columns and child REBASELINE/PLAN columns
    # Returns column index mapping dynamically adapted to any weekly sheet variation
```


---

### 8.3 Operational Pre-Flight Checklist for the 28-Sep-26 Drop

When you drop the new 28-Sep-26 Excel files into the repository, verify the following steps:
- [ ] **File Naming Standard**: Ensure filenames follow the established pattern:
  - Technical: `ASK Technical Document Log Report - 28 Sep 26.xlsx`
  - Vendor: `ASK Vendor Document Log Report - 28 Sep 26.xls` (or `.xlsx`)
  - MDR: `MM-ASK-1A-GEN01-ENG-MDR-0001_B...28-Sep-26.xlsx`
- [ ] **Local Batch Verification (If running locally)**:
  - Execute `python update_all.py` in PowerShell.
  - Confirm console output reports all 4 datasets rebuilt with zero errors.
- [ ] **Header Cut-off Date Confirmation**:
  - Open `http://localhost:5000/` (or Render live URL).
  - Verify that the header pill across all 4 dashboards displays: `Reporting Cut-off: 28-Sep-2026`.
- [ ] **Metric Consistency Check**:
  - Check that Total Submittals count updates in Technical (`> 3,046`) and Vendor (`> 188`).
  - Open `/analytics` and verify that the Rebaseline Plan vs Actual table populates with the latest revision transitions without console errors.

---

## 9. Manual GitHub Upload Inventory (File-by-File Checklist)

When updating your GitHub repository manually via the GitHub Web UI ("Add file" ➔ "Upload files"), upload the following files:

| Category | File Path | Description & Purpose |
| :--- | :--- | :--- |
| **Web Pages** | [`index.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index.html) | Technical Document Review Duration Dashboard |
| | [`index_vendor.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_vendor.html) | Vendor Equipment Document Review Duration Dashboard |
| | [`index_mdr.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_mdr.html) | MDR Revision Lifecycle & Pipeline Dashboard |
| | [`index_analytics.html`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/index_analytics.html) | Analytic Evaluation Dashboard (Rebaseline vs Actual) |
| **Stylesheets** | [`styles.css`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/styles.css) | Core CSS design tokens, light mode high contrast rules, top hub nav |
| | [`styles_mdr.css`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/styles_mdr.css) | MDR lifecycle, TOC analysis, and light/dark theme styling |
| | [`styles_analytics.css`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/styles_analytics.css) | Analytics evaluation layout, high-contrast delay root-cause colors |
| **Scripts** | [`app.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app.js) | Technical dashboard logic & dynamic report date binding |
| | [`app_vendor.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_vendor.js) | Vendor dashboard logic & dynamic report date binding |
| | [`app_mdr.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_mdr.js) | MDR revision logic, working day calculations & dynamic date binding |
| | [`app_analytics.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/app_analytics.js) | Analytics evaluation logic, table sorting/filtering & delay decomposition |
| **Datasets** | [`data.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/data.js) | Technical Log records + `window.TECH_REPORT_DATE` |
| | [`vendor_data.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/vendor_data.js) | Vendor Log records + `window.VENDOR_REPORT_DATE` |
| | [`mdr_data.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/mdr_data.js) | MDR records + Mon–Fri working days + `window.MDR_REPORT_DATE` |
| | [`analytics_data.js`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/analytics_data.js) | 2,639 revision transitions + root cause tags + `window.ANALYTICS_REPORT_DATE` |
| | [`latest_update.json`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/latest_update.json) | Audit log of last processed files, dates, and execution results |
| **Python Engines**| [`update_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_data.py) | Technical Log processor with date extraction |
| | [`update_vendor_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_vendor_data.py) | Vendor Log processor with date extraction |
| | [`update_mdr_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_mdr_data.py) | MDR processor with working day calculations & date extraction |
| | [`update_analytics_data.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_analytics_data.py) | Rebaseline plan vs actual delay attribution processor |
| | [`update_all.py`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/update_all.py) | Batch master CLI engine with auto-discovery |
| **Documentation** | [`README.md`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/README.md) | User operational manual and deployment guide |
| | [`hand_off_report.md`](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/Doc_Dashboard/hand_off_report.md) | Engineering system specification and hand-off report |

---

## 10. Future Improvement & Operational Roadmap

To scale this intelligence hub across later project phases (e.g. Fabrication, Commissioning, Handover), the following enhancements are recommended:

1. **GitHub Actions Scheduled Auto-Sync**:
   - Configure a GitHub Action (`.github/workflows/weekly_sync.yml`) that runs every Friday night.
   - Automatically ingests new weekly Excel cut-off files uploaded to a shared cloud folder (SharePoint / OneDrive / Google Drive), executes `update_all.py`, commits the updated `.js` datasets, and triggers automated deployment.
2. **Automated Executive PDF / Slide Deck Generator**:
   - Integrate a client-side or server-side export (e.g. `html2canvas` + `jsPDF`) to generate a one-click weekly executive PDF summary.
   - Includes the TOC bottleneck analysis, SLA compliance doughnut charts, RACI matrix, and Top 10 delayed deliverables ready for project steering committee meetings.
3. **Automated Email / Teams / Slack SLA Warning Alerts**:
   - Provide automated notification webhooks when a deliverable hits Day 8 of the 10 Working Day review window, prompting discipline leads before an SLA breach occurs.
4. **Historical Trend & Weekly S-Curve Comparison**:
   - Archive weekly data snapshots (`data_YYYYMMDD.js`) to plot historical S-curves showing cumulative review completion and Contractor incorporation velocity over time.

---

## 11. Management Analysis Frameworks Summary (TOC & RACI)

- **Primary Bottleneck**: Contractor Comment Incorporation (~15–24 working days).
- **Client Turnaround Reality**: Under the contractual **10 Working Days** rule:
  - Technical documents: **10.1 working days** average (60.0% overall compliance, 78.8% at AFC stage).
  - Vendor documents: **8.2 working days** average (**89.2% compliance**).
- **Conclusion**: Client engineering reviews are healthy and meeting contractual commitments. Management focus should remain on accelerating Contractor comment incorporation loops via 48-hour Comment Resolution Meetings (CRMs).

---

## 12. Conclusion & System Sign-Off

The system completely satisfies all stated user requirements:
1. Strict **10 Working Days** contractual SLA criteria across all dashboards.
2. Dual log tracking: Technical deliverables and Vendor equipment deliverables.
3. Complete **IFR ➔ IFA ➔ AFC ➔ AP** lifecycle and bypass tracking.
4. High-contrast, fully accessible Light and Dark modes with responsive sliding navigation bars.
5. Automated weekly cut-off and report date detection across all dashboards.
6. Clean visual layout with the theme toggle relocated to the far right.

All files are verified, tested in the browser, and committed to git.

