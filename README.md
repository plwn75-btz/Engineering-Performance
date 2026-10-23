# Z1F & ASK Document Intelligence Hub
### Contract MMC25-5001 & Predecessor Baseline • Document Review Duration & Revision Lifecycle System

An enterprise executive dashboard suite for tracking technical and vendor document review durations, SLA compliance (10 Working Days Mon–Fri), multi-contractor revision workflows, and forensic root cause delay attribution between **Contractor Scopes** and the **Client Engineering Team (PTTEP / PMT)** for both **Z1F Project** and **ASK Project**.

---

## 🌟 Multi-Project Architecture (Z1F & ASK)

The Hub unifies two independent project datasets under a single intuitive web interface with instant button switching and **strict dataset separation** (zero data mixing):
* **⚡ Z1F**: Active project tracking **4 Contractor Scopes** (`Topside without Structure`, `Jacket & Piles`, `Topside Structure`, and `WP2 Pipeline`).
* **🏛️ ASK**: Historical benchmark baseline tracking **4 Work Packages** (`WP01 Topside`, `WP01 Jacket`, `WP02 Topside`, and `WP02 Jacket`).

Switching projects via the top toggle instantly reloads the dashboard with isolated data from `data/z1f/` or `data/ask/` without memory bleed. A standalone, unmerged Z1F version is preserved in `backup_z1f_standalone/`.

---

## 📊 Dashboard Modules

The system consists of four interconnected, high-performance dashboards:

1. **[Technical Document Log Dashboard (`index.html`)](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/ZDoc_Dashboard/index.html)**
   * **Z1F:** 3,780 submittals across 4 Contractor Scopes (72.0% SLA compliance, 7.9 WD avg).
   * **ASK:** 3,290 submittals across 4 Work Packages (61.4% SLA compliance, 10.1 WD avg).
   * **Features:** 10 Working Days contractual benchmark compliance, Review Duration Histogram Tiers with discipline drill-down, transmittal timeline drawer, and dynamic CSV export.

2. **[Vendor Document Log Dashboard (`index_vendor.html`)](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/ZDoc_Dashboard/index_vendor.html)**
   * **Z1F:** 535 submittals across 47 equipment packages (82.0% compliance, 7.8 WD avg).
   * **ASK:** 271 submittals across 22 equipment packages (90.7% compliance, 7.9 WD avg).
   * **Features:** Dynamic horizontal navigation bar for top packages, duration tiers with interactive drill-down modal, multi-transmittal history drawer, and dynamic CSV export.

3. **[EDSR Revision Lifecycle Dashboard (`index_mdr.html`)](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/ZDoc_Dashboard/index_mdr.html)**
   * **Z1F Scope:** 1,430 active unique engineering deliverables across 4 Contractor registers (54 cancelled/strikethrough deliverables excluded).
   * **ASK Scope:** 1,330 active engineering deliverables across 4 Work Packages.
   * **Features:** Multi-stage revision workflow tracking (**IFR** $\to$ **IFA** $\to$ **AFC** $\to$ **AP**), fast-track detection, contractor incorporation duration vs Client review time, and interactive lifecycle detail drawer.

4. **[Analytic Evaluation: Rebaseline vs Actual Dashboard (`index_analytics.html`)](file:///c:/Users/pipes/OneDrive/Documents/Google_AntiGravity/Project/ZDoc_Dashboard/index_analytics.html)**
   * **Z1F Analytics:** 4,154 planned transitions / 2,689 evaluated actuals (58.2% contractor-driven delay rate, >50% Macro justification: **TRUE**).
   * **ASK Analytics:** 3,234 planned transitions / 2,299 evaluated actuals across all 4 corridors (63.8% contractor delay rate, >50% Macro justification: **TRUE**).
   * **Features:** Forensic delay attribution: (1) Improperly Planned, (2) Late Contractor Incorporation, (3) Late Client Review (> 10 WD), (4) Compound Delay, with contractor entitlement protection for Client overruns.

---

## 📖 Definition of "SLA" (Service Level Agreement)

> [!IMPORTANT]
> **SLA = Service Level Agreement**
> In the Z1F Project contract (MMC25-5001), the SLA establishes the procedural standard and maximum turnaround period allowed for the **Client Engineering Team** to review and return submitted deliverables.

* **Contractual Benchmark:** **10 Working Days (WD)**.
* **Meet Agreement (Within SLA):** Review duration **$\le$ 10 Working Days**. The document was evaluated, commented, and returned within the agreed window.
* **Over Agreement (Exceeded SLA):** Review duration **$>$ 10 Working Days**. The document exceeded contractual turnaround, triggering delay tracking.
* **Calculation Formula:**
  $$\text{Working Days} = \text{Count of days between } [\text{Actual Submit In}] \text{ and } [\text{Actual Submit Out}]$$
  * **Start Date:** The first business day following official transmittal receipt (`Actual Submit In`).
  * **Working Days Only:** Monday through Friday are counted. Saturdays and Sundays are excluded.
  * **End Date:** The date the official transmittal is issued back (`Actual Submit Out`).
* **Interactive Modals:** Every dashboard contains an **"ℹ️ What is SLA?"** button and interactive SLA badges explaining these rules in detail with visual examples.

---

## 🏗️ 4 Contractor Scopes in Z1F

| Contractor Set | Scope Description | Primary Data Source | Unique Deliverables |
| :--- | :--- | :--- | :--- |
| **Topside without Structure** | Package 00210 Multi-Discipline Engineering (Electrical, Inst, Piping, Process, Mech, Telecom - Worley / GCME) | `00210 EDSR as of WE 42 16 Oct 26.xlsm` | 560 docs |
| **Jacket & Piles** | WP1B Substructure & Piling Detailed Design (Jutal) | `Z1F Jacket EDSR cut-off_16Oct26.xlsx` | 526 docs |
| **Topside Structure** | WP1A Topsides Structural & Naval Architecture Detailed Design (Jutal TS) | `Z1F Topsides EDSR cut-off_16Oct26.xlsx` | 201 docs |
| **WP2 Pipeline** | Subsea Pipelines & Rigid Spools (TJE / Mermaid / COES / Thoresen) | `Att.2. WP2 Engineering Progress Measurement_161026R1_Updated.xlsx` | 143 docs |
| **Total Combined** | **Full Z1F Project Engineering Scope (Excluding Strikethrough/Cancelled)** | **All 4 Multi-EDSR Registers** | **1,430 docs** |

---

## 🔍 Review Duration Distribution Tiers Drill-down

Deliverables are grouped into turnaround tiers:
* **$\le 5$ WD:** Rapid review turnaround.
* **6 – 10 WD:** Contractual compliance sweet spot (contract limit is 10 WD).
* **11 – 15 WD:** Slight delay ($1-5$ days over SLA).
* **16 – 20 WD:** Moderate delay.
* **$> 20$ WD:** Significant bottleneck requiring management escalation.

### How to View Details:
* Simply **click on any tier bar** or click the **`View Details 🔍`** button next to each tier row.
* An interactive **Tier Deliverables Modal** opens showing:
  * Total deliverable count and working-day range.
  * Quick-filter discipline chips (e.g. *All Disciplines*, *Mechanical*, *Structural*).
  * In-tier real-time search box.
  * Complete registry table showing Submittal ID, Document No, Rev, Contractor Scope, Dates, Working Days, and Return Status.
  * An **"Apply Filter to Main Table"** button to filter the main registry table by the chosen tier.

---

## 🎨 Visual Aesthetics & High-Contrast Light/Dark Themes

All dashboards feature synchronized, persistent Light and Dark themes (`z1f_dash_theme` / `z1f_vendor_theme` in `localStorage`):

* **Contractor Scope Navigation Bar**:
  * Active contractor pills (e.g. *Topside without Structure [1,179]*, *Jacket & Piles [1,073]*, *Topside Structure [420]*, *WP2 Pipeline [416]*) render with vibrant primary highlights and high contrast badge counters.
* **Header Actions & Theme Toggle Placement**:
  * Action buttons (`What is SLA?`, `Upload New File`, `Export CSV`, `Reset Filters`) feature high contrast borders and text in both dark and light modes.
  * The light/dark mode toggle button (`#themeToggleBtn`) is positioned at the **far right as the last icon** across all dashboards, keeping primary actions unobstructed.

---

## ⚡ Automated Weekly Data Update Engine (`update_all.py`)

When new weekly reports arrive from the 4 Contractors or Document Control:
1. Place new Excel files in root workspace (e.g. `16 Oct 26`, `23 Oct 26`, etc.).
2. Run:
   ```bash
   python update_all.py
   ```
3. The batch engine executes:
   * **`update_data.py`**: Scans newest `Z1F Technical Document Log Report*.xlsx`, attributes contractor scope, recalculates 10 WD turnaround, and generates `data.js`.
   * **`update_vendor_data.py`**: Scans newest `Z1F Vendor Document Log Report*.xls*`, extracts package taxonomy, and generates `vendor_data.js`.
   * **`update_mdr_data.py`**: Merges all 4 EDSR registers with Technical Log actuals and generates `mdr_data.js`.
   * **`update_analytics_data.py`**: Runs forensic delay attribution and generates `analytics_data.js`.
   * **`latest_update.json`**: Writes execution audit timestamp.

---

## 🛠️ File Structure

```text
ZDoc_Dashboard/
├── archive_ask/                # Archived legacy ASK Excel cut-off files
├── 16102026/                   # Z1F cut-off reference files (16-Oct-2026)
├── backup_z1f_standalone/      # Standalone unmerged Z1F backup for safety
├── data/                       # Isolated Multi-Project Datasets
│   ├── z1f/                    # Z1F data.js, vendor_data.js, mdr_data.js, analytics_data.js
│   └── ask/                    # ASK data.js, vendor_data.js, mdr_data.js, analytics_data.js
├── index.html                  # Dashboard 1: Technical Document Log (Z1F & ASK)
├── app.js                      # Logic for Dashboard 1 (Dynamic scope pills & Chart.js)
├── index_vendor.html           # Dashboard 2: Vendor Document Log (Z1F & ASK)
├── app_vendor.js               # Logic for Dashboard 2 (47 packages Z1F, 22 packages ASK)
├── index_mdr.html              # Dashboard 3: EDSR Revision Lifecycle (Z1F & ASK)
├── app_mdr.js                  # Logic for Dashboard 3 (Multi-corridor lifecycle & drawer)
├── index_analytics.html        # Dashboard 4: Analytic Evaluation (Rebaseline vs Actual)
├── app_analytics.js            # Logic for Dashboard 4 (Forensic Delay Attribution)
├── project_manager.js          # Multi-Project State Switcher (Z1F <-> ASK)
├── styles.css                  # Core design tokens, high contrast theme
├── styles_mdr.css              # EDSR design tokens, lifecycle timeline, modals
├── styles_analytics.css        # Analytic evaluation layout, verdict banner, Chart.js
├── update_data.py              # Parser for Z1F Technical Document Log
├── update_vendor_data.py       # Parser for Z1F Vendor Document Log
├── update_mdr_data.py          # Multi-EDSR parser merging 4 Z1F Contractor registers
├── update_analytics_data.py    # Forensic delay attribution calculator for Z1F
├── update_data_ask.py          # Parser for ASK Technical Document Log
├── update_vendor_data_ask.py   # Parser for ASK Vendor Document Log
├── update_mdr_data_ask.py      # Parser for ASK MDR Register (corrected columns)
├── update_analytics_data_ask.py# Forensic delay attribution calculator for ASK
├── update_all.py               # Batch master CLI engine with auto-discovery
├── server.py                   # Production Flask server with /api/upload endpoint
├── requirements.txt            # Python dependencies (flask, gunicorn, pandas, openpyxl, xlrd)
├── latest_update.json          # Audit metadata recording latest file sources & cut-off dates
├── spec.md                     # Comprehensive System Specification
├── hand_off_report.md          # Operations, deployment & hand-off manual
├── lesson_learn.md             # Technical challenges, edge cases & lessons learned
└── README.md                   # System documentation & operating guide
```

---

## 🚀 Running Locally

To run the local application server:
```bash
python -m http.server 8000
```
Or start the full Flask API server:
```bash
python server.py
```
Open your browser to:
* **Technical Log:** [http://localhost:8000/index.html](http://localhost:8000/index.html)
* **Vendor Log:** [http://localhost:8000/index_vendor.html](http://localhost:8000/index_vendor.html)
* **EDSR Lifecycle:** [http://localhost:8000/index_mdr.html](http://localhost:8000/index_mdr.html)
* **Analytic Evaluation:** [http://localhost:8000/index_analytics.html](http://localhost:8000/index_analytics.html)

---

## 🌐 Web Launching & Deployment (GitHub & Render.com)

### 1. Push to GitHub
```bash
git add .
git commit -m "Deploy Z1F and ASK Document Intelligence Hub"
git push origin main
```

### 2. Deploy on Render.com
1. Log in to [Render.com](https://render.com/) and click **New +** $\to$ **Web Service**.
2. Connect your GitHub repository (`ZDoc_Dashboard`).
3. Set the following build and run options:
   * **Environment:** `Python 3`
   * **Build Command:** `pip install -r requirements.txt`
   * **Start Command:** `gunicorn server:app`
   * **Plan:** `Free`
4. Click **Create Web Service**. Render will build and provide a public live HTTPS URL for your team.

