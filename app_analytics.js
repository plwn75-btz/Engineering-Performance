/**
 * ASK Analytic Evaluation: Rebaseline Plan vs. Actual Turnaround Controller
 * Manages forensic delay attribution, macro statement calculation,
 * interactive Chart.js visualizations, multi-attribute filtering,
 * drill-down timeline drawer, and CSV exports.
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    allData: Array.isArray(window.ANALYTICS_DATA) ? window.ANALYTICS_DATA : [],
    summary: window.ANALYTICS_SUMMARY || {},
    filteredData: [],
    selectedWorkPackage: 'ALL',
    selectedTransition: 'ALL',
    selectedCause: 'ALL',
    selectedDiscipline: 'ALL',
    selectedChip: 'ALL',
    searchQuery: '',
    currentPage: 1,
    pageSize: 50,
    sortColumn: 'cycle_variance_wd',
    sortDirection: 'desc',
    theme: localStorage.getItem('ask_dash_theme') || 'dark',
    selectedItem: null,
    charts: {
      delayCauseChart: null,
      disciplineDelayChart: null,
      transitionStageChart: null
    }
  };

  // --- DOM Elements ---
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportAnalyticsCsvBtn: document.getElementById('exportAnalyticsCsvBtn'),
    headerTotalBadge: document.getElementById('headerTotalBadge'),
    headerReportDate: document.getElementById('headerReportDate'),

    // Modals
    openSlaDefBtn: document.getElementById('openSlaDefBtn'),
    slaDefModal: document.getElementById('slaDefModal'),
    closeSlaDefModalBtn: document.getElementById('closeSlaDefModalBtn'),
    closeSlaDefModalBtn2: document.getElementById('closeSlaDefModalBtn2'),

    openUploadBtn: document.getElementById('openUploadBtn'),
    uploadModal: document.getElementById('uploadModal'),
    closeUploadModalBtn: document.getElementById('closeUploadModalBtn'),
    dropZone: document.getElementById('dropZone'),
    fileInput: document.getElementById('fileInput'),
    uploadStatus: document.getElementById('uploadStatus'),

    // Executive Statement Banner
    macroVerdictBadge: document.getElementById('macroVerdictBadge'),
    macroStatementText: document.getElementById('macroStatementText'),
    wowTrendStatement: document.getElementById('wowTrendStatement'),
    wowTrendText: document.getElementById('wowTrendText'),
    qa1Answer: document.getElementById('qa1Answer'),
    qa2Answer: document.getElementById('qa2Answer'),
    qa3Answer: document.getElementById('qa3Answer'),

    // KPIs
    kpiTotalEval: document.getElementById('kpiTotalEval'),
    kpiScopeTag: document.getElementById('kpiScopeTag'),
    kpiWowTotal: document.getElementById('kpiWowTotal'),
    kpiMetPlanCount: document.getElementById('kpiMetPlanCount'),
    kpiMetPlanRate: document.getElementById('kpiMetPlanRate'),
    kpiWowMet: document.getElementById('kpiWowMet'),
    kpiOverdueCount: document.getElementById('kpiOverdueCount'),
    kpiOverdueRate: document.getElementById('kpiOverdueRate'),
    kpiWowOverdue: document.getElementById('kpiWowOverdue'),
    kpiClientSlaRate: document.getElementById('kpiClientSlaRate'),
    kpiAvgClientWd: document.getElementById('kpiAvgClientWd'),
    kpiWowClient: document.getElementById('kpiWowClient'),
    kpiAvgContIncWd: document.getElementById('kpiAvgContIncWd'),
    kpiAvgPlanIncWd: document.getElementById('kpiAvgPlanIncWd'),
    kpiWowIncorp: document.getElementById('kpiWowIncorp'),
    kpiContOverrunPct: document.getElementById('kpiContOverrunPct'),
    kpiWowOverrun: document.getElementById('kpiWowOverrun'),

    // Work Package Tabs
    wpTabsContainer: document.getElementById('wpTabsContainer'),
    tabCountAll: document.getElementById('tabCountAll'),
    tabCountWP01Top: document.getElementById('tabCountWP01Top'),
    tabCountWP01Jkt: document.getElementById('tabCountWP01Jkt'),
    tabCountWP02Top: document.getElementById('tabCountWP02Top'),
    tabCountWP02Jkt: document.getElementById('tabCountWP02Jkt'),
    tabCountProEng: document.getElementById('tabCountProEng'),

    // Filters
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    transitionSelect: document.getElementById('transitionSelect'),
    causeSelect: document.getElementById('causeSelect'),
    disciplineSelect: document.getElementById('disciplineSelect'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),

    // Table
    analyticsTable: document.getElementById('analyticsTable'),
    analyticsTableBody: document.getElementById('analyticsTableBody'),
    tableShowingCount: document.getElementById('tableShowingCount'),
    tableTotalFilteredCount: document.getElementById('tableTotalFilteredCount'),
    paginationInfo: document.getElementById('paginationInfo'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),

    // Drawer
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    analyticsDrawer: document.getElementById('analyticsDrawer'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    drawerTransitionBadge: document.getElementById('drawerTransitionBadge'),
    drawerDocNo: document.getElementById('drawerDocNo'),
    drawerDocTitle: document.getElementById('drawerDocTitle'),
    drawerContent: document.getElementById('drawerContent'),

    // Charts
    chartAttributionCount: document.getElementById('chartAttributionCount')
  };

  // --- Theme Management ---
  function applyTheme(theme) {
    state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ask_dash_theme', theme);

    if (el.themeIcon) {
      if (theme === 'light') {
        el.themeIcon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>`;
      } else {
        el.themeIcon.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>`;
      }
    }

    // Re-render charts for theme contrast
    renderCharts();
  }

  // --- Init ---
  function init() {
    applyTheme(state.theme);

    if (window.ANALYTICS_REPORT_DATE && el.headerReportDate) {
      el.headerReportDate.textContent = `Cut-off ${window.ANALYTICS_REPORT_DATE}`;
    }

    // Explicitly set default filters
    if (el.transitionSelect) el.transitionSelect.value = 'ALL';
    if (el.causeSelect) el.causeSelect.value = 'ALL';
    if (el.disciplineSelect) el.disciplineSelect.value = 'ALL';
    if (el.searchInput) el.searchInput.value = '';
    state.selectedTransition = 'ALL';
    state.selectedCause = 'ALL';
    state.selectedDiscipline = 'ALL';
    state.selectedWorkPackage = 'ALL';
    state.selectedChip = 'ALL';

    populateDisciplineDropdown();
    updateTabCounts();
    bindEvents();
    applyFilters();
  }

  // --- Populate Discipline Dropdown ---
  function populateDisciplineDropdown() {
    const discSet = new Set();
    state.allData.forEach(d => {
      if (d.discipline) discSet.add(d.discipline.trim());
    });
    const sortedDisc = Array.from(discSet).sort();
    
    el.disciplineSelect.innerHTML = '<option value="ALL">All Disciplines</option>';
    sortedDisc.forEach(disc => {
      const opt = document.createElement('option');
      opt.value = disc;
      opt.textContent = `${disc} Discipline`;
      el.disciplineSelect.appendChild(opt);
    });
  }

  // --- Update Scope Tab Counts ---
  function updateTabCounts() {
    const wpCounts = { 'ALL': 0, 'WP01 TOPSIDE': 0, 'WP01 JACKET': 0, 'WP02 TOPSIDE': 0, 'WP02 JACKET': 0, 'PRO.ENGINEERING_MR TBE': 0 };
    state.allData.forEach(d => {
      if (d.has_actual) {
        wpCounts['ALL']++;
        if (wpCounts[d.work_package] !== undefined) {
          wpCounts[d.work_package]++;
        }
      }
    });

    if (el.tabCountAll) el.tabCountAll.textContent = wpCounts['ALL'].toLocaleString();
    if (el.tabCountWP01Top) el.tabCountWP01Top.textContent = wpCounts['WP01 TOPSIDE'].toLocaleString();
    if (el.tabCountWP01Jkt) el.tabCountWP01Jkt.textContent = wpCounts['WP01 JACKET'].toLocaleString();
    if (el.tabCountWP02Top) el.tabCountWP02Top.textContent = wpCounts['WP02 TOPSIDE'].toLocaleString();
    if (el.tabCountWP02Jkt) el.tabCountWP02Jkt.textContent = wpCounts['WP02 JACKET'].toLocaleString();
    if (el.tabCountProEng) el.tabCountProEng.textContent = wpCounts['PRO.ENGINEERING_MR TBE'].toLocaleString();
  }

  // --- Filtering Logic ---
  function applyFilters() {
    let result = state.allData.filter(d => d.has_actual && d.actual_cycle_wd !== null);

    // 1. Work Package
    if (state.selectedWorkPackage !== 'ALL') {
      result = result.filter(d => d.work_package === state.selectedWorkPackage);
    }

    // 2. Transition Stage
    if (state.selectedTransition !== 'ALL') {
      result = result.filter(d => d.transition_type === state.selectedTransition);
    }

    // 3. Delay Cause
    if (state.selectedCause !== 'ALL') {
      result = result.filter(d => d.delay_cause === state.selectedCause);
    }

    // 4. Discipline
    if (state.selectedDiscipline !== 'ALL') {
      result = result.filter(d => d.discipline === state.selectedDiscipline);
    }

    // 5. Quick Chips
    if (state.selectedChip === 'OVERDUE_ONLY') {
      result = result.filter(d => d.delay_cause !== 'MET_PLAN');
    } else if (state.selectedChip === 'CONT_OVERRUN') {
      result = result.filter(d => d.delay_cause === 'LATE_CONTRACTOR' || d.delay_cause === 'COMPOUND_DELAY');
    } else if (state.selectedChip === 'CLIENT_OVERRUN') {
      result = result.filter(d => d.client_sla_status === 'OVER');
    } else if (state.selectedChip === 'IMPROPER_ONLY') {
      result = result.filter(d => d.delay_cause === 'IMPROPER_PLAN');
    } else if (state.selectedChip === 'FAST_TRACK') {
      result = result.filter(d => d.transition_type.includes('Fast-Track'));
    } else if (state.selectedChip === 'MET_ONLY') {
      result = result.filter(d => d.delay_cause === 'MET_PLAN');
    }

    // 6. Search Query
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(d => 
        (d.doc_no && d.doc_no.toLowerCase().includes(q)) ||
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.discipline && d.discipline.toLowerCase().includes(q)) ||
        (d.submittal_id_from && d.submittal_id_from.toLowerCase().includes(q)) ||
        (d.submittal_id_to && d.submittal_id_to.toLowerCase().includes(q))
      );
    }

    // 7. Sort
    result.sort((a, b) => {
      let valA = a[state.sortColumn];
      let valB = b[state.sortColumn];

      if (valA === null || valA === undefined) valA = -999999;
      if (valB === null || valB === undefined) valB = -999999;

      if (typeof valA === 'string') {
        return state.sortDirection === 'asc' 
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      } else {
        return state.sortDirection === 'asc'
          ? (valA > valB ? 1 : -1)
          : (valA < valB ? 1 : -1);
      }
    });

    state.filteredData = result;
    state.currentPage = 1;

    updateKPIsAndVerdict();
    renderTable();
    renderCharts();
  }

  // --- Dynamic KPIs & Verdict Update ---
  function updateKPIsAndVerdict() {
    const total = state.filteredData.length;
    const metList = state.filteredData.filter(d => d.delay_cause === 'MET_PLAN');
    const overdueList = state.filteredData.filter(d => d.delay_cause !== 'MET_PLAN');
    
    const improperList = overdueList.filter(d => d.delay_cause === 'IMPROPER_PLAN');
    const lateContList = overdueList.filter(d => d.delay_cause === 'LATE_CONTRACTOR');
    const lateClientList = overdueList.filter(d => d.delay_cause === 'LATE_CLIENT');
    const compoundList = overdueList.filter(d => d.delay_cause === 'COMPOUND_DELAY');

    const contDriven = lateContList.length + compoundList.length;
    const contOverrunPct = overdueList.length > 0 
      ? (contDriven / overdueList.length * 100).toFixed(1)
      : '0.0';

    const clientEval = state.filteredData.filter(d => d.client_rev_wd !== null);
    const clientPass = clientEval.filter(d => d.client_sla_status === 'PASS');
    const clientSlaRate = clientEval.length > 0 
      ? (clientPass.length / clientEval.length * 100).toFixed(1)
      : '0.0';

    const avgPlanWd = total > 0 ? (state.filteredData.reduce((acc, d) => acc + (d.plan_wd || 0), 0) / total).toFixed(1) : '0.0';
    const avgActualWd = total > 0 ? (state.filteredData.reduce((acc, d) => acc + (d.actual_cycle_wd || 0), 0) / total).toFixed(1) : '0.0';
    const avgClientWd = clientEval.length > 0 ? (clientEval.reduce((acc, d) => acc + d.client_rev_wd, 0) / clientEval.length).toFixed(1) : '0.0';
    
    const contEval = state.filteredData.filter(d => d.cont_inc_wd !== null);
    const avgContIncWd = contEval.length > 0 ? (contEval.reduce((acc, d) => acc + d.cont_inc_wd, 0) / contEval.length).toFixed(1) : '0.0';
    const avgPlanIncWd = total > 0 ? (state.filteredData.reduce((acc, d) => acc + (d.plan_incorp_allowance_wd || 0), 0) / total).toFixed(1) : '0.0';

    // Update KPI Card DOM
    if (el.kpiTotalEval) el.kpiTotalEval.textContent = total.toLocaleString();
    if (el.kpiScopeTag) el.kpiScopeTag.textContent = state.selectedWorkPackage === 'ALL' ? 'All Work Packages' : state.selectedWorkPackage;
    if (el.headerTotalBadge) el.headerTotalBadge.textContent = `${total.toLocaleString()} Evaluated Transitions`;

    if (el.kpiMetPlanCount) el.kpiMetPlanCount.textContent = metList.length.toLocaleString();
    if (el.kpiMetPlanRate) el.kpiMetPlanRate.textContent = total > 0 ? `${(metList.length / total * 100).toFixed(1)}%` : '0.0%';

    if (el.kpiOverdueCount) el.kpiOverdueCount.textContent = overdueList.length.toLocaleString();
    if (el.kpiOverdueRate) el.kpiOverdueRate.textContent = total > 0 ? `${(overdueList.length / total * 100).toFixed(1)}%` : '0.0%';

    if (el.kpiClientSlaRate) el.kpiClientSlaRate.textContent = `${clientSlaRate}%`;
    if (el.kpiAvgClientWd) el.kpiAvgClientWd.textContent = `${avgClientWd} WD`;

    if (el.kpiAvgContIncWd) el.kpiAvgContIncWd.textContent = `${avgContIncWd} WD`;
    if (el.kpiAvgPlanIncWd) el.kpiAvgPlanIncWd.textContent = `${avgPlanIncWd} WD`;

    if (el.kpiContOverrunPct) el.kpiContOverrunPct.textContent = `${contOverrunPct}%`;

    // Macro Verdict Banner Update
    const isMacroOverrun = parseFloat(contOverrunPct) > 50.0;
    if (el.macroVerdictBadge) {
      if (isMacroOverrun) {
        el.macroVerdictBadge.className = 'verdict-badge overrun-alert';
        el.macroVerdictBadge.innerHTML = `⚠️ Contractor Overrun: ${contOverrunPct}% of Delays (> 50% Threshold)`;
      } else {
        el.macroVerdictBadge.className = 'verdict-badge cause-met';
        el.macroVerdictBadge.innerHTML = `✅ Balanced Delay Distribution (${contOverrunPct}% Cont. Overrun)`;
      }
    }

    if (el.macroStatementText) {
      if (isMacroOverrun) {
        el.macroStatementText.innerHTML = `
          Forensic delay attribution across <strong>${total.toLocaleString()} evaluated revision transitions</strong> reveals that 
          <strong>${contDriven.toLocaleString()} out of ${overdueList.length.toLocaleString()} delayed transitions (${contOverrunPct}%)</strong> 
          are driven by Contractor comment incorporation exceeding planned allowances. Because this exceeds the contractual <strong>50% threshold</strong>, 
          it provides conclusive analytical justification that the Contractor's Rebaseline Plan was 
          <strong>systematically over-optimistic and improperly planned</strong> relative to their actual engineering capacity.`;
      } else {
        el.macroStatementText.innerHTML = `
          Forensic delay attribution across <strong>${total.toLocaleString()} evaluated transitions</strong> shows balanced friction: 
          Client review accounted for <strong>${lateClientList.length.toLocaleString()} delays</strong>, while Contractor incorporation accounted for 
          <strong>${lateContList.length.toLocaleString()} delays</strong> and <strong>${compoundList.length.toLocaleString()} compound delays</strong>.`;
      }
    }

    // 3 Q&A Cards Update
    if (el.qa1Answer) {
      el.qa1Answer.innerHTML = `<strong>${improperList.length.toLocaleString()} transitions (${overdueList.length > 0 ? (improperList.length / overdueList.length * 100).toFixed(1) : 0}%)</strong> were structurally defective (&le; 10 WD allowance, leaving 0 days for incorporation). Combined with ${contOverrunPct}% Contractor overrun, the plan was systematically unachievable.`;
    }
    if (el.qa2Answer) {
      el.qa2Answer.innerHTML = `<strong>${total > 0 ? (metList.length / total * 100).toFixed(1) : 0}% (${metList.length.toLocaleString()} transitions)</strong> met or beat the Rebaseline Plan. However, <strong>${total > 0 ? (overdueList.length / total * 100).toFixed(1) : 0}% (${overdueList.length.toLocaleString()} transitions)</strong> were overdue, averaging ${avgActualWd} WD vs ${avgPlanWd} WD planned.`;
    }
    if (el.qa3Answer) {
      el.qa3Answer.innerHTML = `<strong>Late Cont. Incorp (${overdueList.length > 0 ? (lateContList.length / overdueList.length * 100).toFixed(1) : 0}%)</strong> is the top driver, followed by <strong>Improper Plan (${overdueList.length > 0 ? (improperList.length / overdueList.length * 100).toFixed(1) : 0}%)</strong>, <strong>Compound Delay (${overdueList.length > 0 ? (compoundList.length / overdueList.length * 100).toFixed(1) : 0}%)</strong>, and <strong>Late Client Review (${overdueList.length > 0 ? (lateClientList.length / overdueList.length * 100).toFixed(1) : 0}%)</strong>.`;
    }

    if (el.chartAttributionCount) {
      el.chartAttributionCount.textContent = `${overdueList.length.toLocaleString()} Delays`;
    }

    // Week-over-Week Reference Notes and Trend Statement
    const prevSum = window.ANALYTICS_PREV_SUMMARY;
    const wowDiff = window.ANALYTICS_WOW_DIFF;
    const prevDate = window.ANALYTICS_PREV_REPORT_DATE;

    if (wowDiff && el.wowTrendText) {
      el.wowTrendText.innerHTML = wowDiff.statement;
      if (el.wowTrendStatement) el.wowTrendStatement.style.display = 'flex';
    } else if (el.wowTrendStatement) {
      el.wowTrendStatement.style.display = 'none';
    }

    if (prevSum) {
      const pTotal = prevSum.total_evaluated_transitions || 0;
      const dTotal = total - pTotal;
      const signTotal = dTotal >= 0 ? `+${dTotal}` : `${dTotal}`;
      if (el.kpiWowTotal) {
        el.kpiWowTotal.innerHTML = `Prev (${prevDate || 'Last Week'}): ${pTotal.toLocaleString()} (<span class="${dTotal >= 0 ? 'trend-pos' : 'trend-neg'}">${signTotal}</span>)`;
      }

      const pMetPct = prevSum.met_plan_pct !== undefined ? prevSum.met_plan_pct : 0;
      const curMetPct = total > 0 ? parseFloat((metList.length / total * 100).toFixed(1)) : 0;
      const dMetPct = (curMetPct - pMetPct).toFixed(1);
      const signMetPct = dMetPct >= 0 ? `+${dMetPct}%` : `${dMetPct}%`;
      if (el.kpiWowMet) {
        el.kpiWowMet.innerHTML = `Prev: ${pMetPct}% (${(prevSum.met_plan_count || 0).toLocaleString()}) &bull; <span class="${dMetPct >= 0 ? 'trend-pos' : 'trend-neg'}">${signMetPct}</span>`;
      }

      const pOverduePct = prevSum.overdue_pct !== undefined ? prevSum.overdue_pct : 0;
      const curOverduePct = total > 0 ? parseFloat((overdueList.length / total * 100).toFixed(1)) : 0;
      const dOverduePct = (curOverduePct - pOverduePct).toFixed(1);
      const signOverduePct = dOverduePct >= 0 ? `+${dOverduePct}%` : `${dOverduePct}%`;
      if (el.kpiWowOverdue) {
        el.kpiWowOverdue.innerHTML = `Prev: ${pOverduePct}% (${(prevSum.overdue_count || 0).toLocaleString()}) &bull; <span class="${dOverduePct <= 0 ? 'trend-pos' : 'trend-neg'}">${signOverduePct}</span>`;
      }

      const pSla = prevSum.client_sla_compliance_rate !== undefined ? prevSum.client_sla_compliance_rate : 0;
      const curSla = parseFloat(clientSlaRate);
      const dSla = (curSla - pSla).toFixed(1);
      const signSla = dSla >= 0 ? `+${dSla}%` : `${dSla}%`;
      if (el.kpiWowClient) {
        el.kpiWowClient.innerHTML = `Prev: ${pSla}% (${prevSum.avg_client_rev_wd} WD) &bull; <span class="${dSla >= 0 ? 'trend-pos' : 'trend-neg'}">${signSla}</span>`;
      }

      const pIncorp = prevSum.avg_cont_inc_wd !== undefined ? prevSum.avg_cont_inc_wd : 0;
      const curIncorp = parseFloat(avgContIncWd);
      const dIncorp = (curIncorp - pIncorp).toFixed(1);
      const signIncorp = dIncorp >= 0 ? `+${dIncorp} WD` : `${dIncorp} WD`;
      if (el.kpiWowIncorp) {
        el.kpiWowIncorp.innerHTML = `Prev: ${pIncorp} WD &bull; <span class="${dIncorp <= 0 ? 'trend-pos' : 'trend-warn'}">${signIncorp}</span>`;
      }

      const pOverrun = prevSum.contractor_overrun_pct !== undefined ? prevSum.contractor_overrun_pct : 0;
      const curOverrun = parseFloat(contOverrunPct);
      const dOverrun = (curOverrun - pOverrun).toFixed(1);
      const signOverrun = dOverrun >= 0 ? `+${dOverrun}%` : `${dOverrun}%`;
      if (el.kpiWowOverrun) {
        el.kpiWowOverrun.innerHTML = `Prev: ${pOverrun}% &bull; <span class="${dOverrun <= 0 ? 'trend-pos' : 'trend-warn'}">${signOverrun}</span>`;
      }
    }
  }

  // --- Table Rendering ---
  function renderTable() {
    const total = state.filteredData.length;
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const pageItems = state.filteredData.slice(startIndex, startIndex + state.pageSize);

    if (el.tableShowingCount) el.tableShowingCount.textContent = pageItems.length.toLocaleString();
    if (el.tableTotalFilteredCount) el.tableTotalFilteredCount.textContent = total.toLocaleString();

    const totalPages = Math.ceil(total / state.pageSize) || 1;
    if (el.paginationInfo) el.paginationInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;
    if (el.prevPageBtn) el.prevPageBtn.disabled = state.currentPage <= 1;
    if (el.nextPageBtn) el.nextPageBtn.disabled = state.currentPage >= totalPages;

    if (!pageItems.length) {
      el.analyticsTableBody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align: center; padding: 40px; color: var(--text-muted);">
            No revision transitions matching the selected filters.
          </td>
        </tr>`;
      return;
    }

    let rowsHtml = '';
    pageItems.forEach(item => {
      // Cause Badge
      let badgeClass = 'cause-met';
      let icon = '✅';
      if (item.delay_cause === 'IMPROPER_PLAN') {
        badgeClass = 'cause-improper';
        icon = '🟣';
      } else if (item.delay_cause === 'LATE_CONTRACTOR') {
        badgeClass = 'cause-contractor';
        icon = '🟡';
      } else if (item.delay_cause === 'LATE_CLIENT') {
        badgeClass = 'cause-client';
        icon = '🔴';
      } else if (item.delay_cause === 'COMPOUND_DELAY') {
        badgeClass = 'cause-compound';
        icon = '🟠';
      } else if (item.delay_cause === 'PENDING') {
        badgeClass = 'cause-pending';
        icon = '⚪';
      }

      // Client SLA Tag
      let clientSlaBadge = '';
      if (item.client_rev_wd !== null) {
        if (item.client_sla_status === 'PASS') {
          clientSlaBadge = `<span class="client-sla-tag pass" title="Within Contractual 10 WD SLA">Pass (${item.client_rev_wd} WD)</span>`;
        } else {
          clientSlaBadge = `<span class="client-sla-tag over" title="Over Contractual 10 WD SLA by +${item.client_delay_days} WD">+${item.client_delay_days} WD Over (${item.client_rev_wd} WD)</span>`;
        }
      }

      // Variance styling
      let varianceHtml = '-';
      if (item.cycle_variance_wd !== null) {
        if (item.cycle_variance_wd <= 0) {
          varianceHtml = `<span style="color: var(--color-within10); font-weight: 700;">${item.cycle_variance_wd} WD</span>`;
        } else {
          varianceHtml = `<span style="color: var(--color-over10); font-weight: 700;">+${item.cycle_variance_wd} WD</span>`;
        }
      }

      // Contractor Incorp
      let contIncorpHtml = '-';
      if (item.cont_inc_wd !== null) {
        const isContOver = item.cont_inc_wd > (item.plan_incorp_allowance_wd || 0);
        contIncorpHtml = `<span style="${isContOver ? 'color: #f59e0b; font-weight: 700;' : ''}">${item.cont_inc_wd} WD</span> <span style="font-size: 0.72rem; color: var(--text-muted);">/ ${item.plan_incorp_allowance_wd}</span>`;
      }

      // Contractor Allowable Extended Cycle Tooltip
      let allowableHtml = '-';
      if (item.allowable_cycle_wd !== null) {
        allowableHtml = `<span style="font-weight: 600; color: #38bdf8;" title="Client Actual (${item.client_rev_wd || 10} WD) + Contractor Allowance (${item.plan_incorp_allowance_wd} WD)">${item.allowable_cycle_wd} WD</span>`;
      }

      rowsHtml += `
        <tr style="border-bottom: 1px solid var(--border-color); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          <td style="padding: 7px 6px; font-family: 'JetBrains Mono', monospace; font-weight: 600; color: var(--text-primary); white-space: nowrap; text-align: left;">
            ${escapeHtml(item.doc_no)}
          </td>
          <td style="padding: 7px 8px; text-align: left;">
            <div style="font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 280px;" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); display: flex; gap: 6px; align-items: center; justify-content: flex-start; margin-top: 3px;">
              <span class="info-pill" style="padding: 1px 5px; font-size: 0.68rem;">${escapeHtml(item.discipline || 'GEN')}</span>
              <span>${escapeHtml(item.work_package)}</span>
            </div>
          </td>
          <td style="padding: 7px 4px; white-space: nowrap; text-align: center; width: 110px;">
            <span style="font-weight: 600; font-size: 0.8rem; color: #818cf8;">${escapeHtml(item.transition_type)}</span>
            <div style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(item.rev_from || 'Start')} ➔ ${escapeHtml(item.rev_to || 'Target')}</div>
          </td>
          <td style="padding: 7px 5px; text-align: center; font-weight: 600;">
            ${item.plan_wd !== null ? item.plan_wd + ' WD' : '-'}
            ${item.plan_feasibility === 'DEFECTIVE_IMPROPER' ? '<div style="font-size: 0.68rem; color: #c4b5fd;">&le; 10 WD Defective</div>' : ''}
          </td>
          <td style="padding: 7px 5px; text-align: center; font-weight: 600;">
            ${item.actual_cycle_wd !== null ? item.actual_cycle_wd + ' WD' : '-'}
          </td>
          <td style="padding: 7px 5px; text-align: center;">
            ${varianceHtml}
          </td>
          <td style="padding: 7px 5px; text-align: center; white-space: nowrap;">
            ${clientSlaBadge}
          </td>
          <td style="padding: 7px 5px; text-align: center; white-space: nowrap;">
            ${contIncorpHtml}
          </td>
          <td style="padding: 7px 5px; text-align: center;">
            ${allowableHtml}
          </td>
          <td style="padding: 7px 6px; text-align: center; white-space: nowrap;">
            <span class="cause-badge ${badgeClass}">${icon} ${escapeHtml(item.delay_cause_label)}</span>
          </td>
          <td style="padding: 7px 8px; text-align: center; width: 110px; min-width: 110px; white-space: nowrap;">
            <button class="action-btn" style="padding: 5px 12px; font-size: 0.75rem; white-space: nowrap; display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-width: 85px;" onclick="window.viewTransitionDetails('${item.id}')">
              <span>Details</span><span>🔍</span>
            </button>
          </td>
        </tr>`;
    });

    el.analyticsTableBody.innerHTML = rowsHtml;
  }

  // --- Interactive Drawer View ---
  window.viewTransitionDetails = function (itemId) {
    const item = state.allData.find(d => d.id === itemId);
    if (!item) return;

    state.selectedItem = item;

    if (el.drawerTransitionBadge) el.drawerTransitionBadge.textContent = item.transition_type;
    if (el.drawerDocNo) el.drawerDocNo.textContent = item.doc_no;
    if (el.drawerDocTitle) el.drawerDocTitle.textContent = item.title;

    // Timeline Bar Segments
    const planTotal = item.plan_wd || 1;
    const planClientPct = Math.min(100, Math.round((10 / planTotal) * 100));
    const planContPct = Math.max(0, 100 - planClientPct);

    const actTotal = item.actual_cycle_wd || 1;
    const actClientWd = item.client_rev_wd || 0;
    const actContWd = item.cont_inc_wd || 0;
    const actClientPct = Math.min(100, Math.round((actClientWd / actTotal) * 100));
    const actContPct = Math.max(0, 100 - actClientPct);

    // Forensic Verdict Text Explanation
    let verdictExplanation = '';
    if (item.delay_cause === 'MET_PLAN') {
      verdictExplanation = `
        <strong>On Track / Compliant:</strong> The actual revision cycle turnaround (${item.actual_cycle_wd} working days) 
        was completely within or ahead of the Contractor's Rebaseline Plan (${item.plan_wd} working days).`;
    } else if (item.delay_cause === 'IMPROPER_PLAN') {
      verdictExplanation = `
        <strong>(1) Improperly Planned:</strong> In the Rebaseline Plan, the Contractor allocated only <strong>${item.plan_wd} working days</strong> 
        between revisions. Since the Client is contractually entitled to 10 Working Days for engineering review, this plan provided 
        <strong>${item.plan_incorp_allowance_wd} working days</strong> for comment incorporation. This schedule was unachievable from the start.`;
    } else if (item.delay_cause === 'LATE_CLIENT') {
      verdictExplanation = `
        <strong>(3) Late Client Review:</strong> Although the total cycle (${item.actual_cycle_wd} WD) exceeded the original plan (${item.plan_wd} WD), 
        the Client took <strong>${item.client_rev_wd} working days</strong> to review (+${item.client_delay_days} WD over the 10 WD SLA). 
        The Contractor completed incorporation in <strong>${item.cont_inc_wd} working days</strong>, adhering to their planned allowance 
        (${item.plan_incorp_allowance_wd} WD). Under contractual rights, this delay is <strong>100% attributable to Late Client Review</strong>.`;
    } else if (item.delay_cause === 'LATE_CONTRACTOR') {
      verdictExplanation = `
        <strong>(2) Late Contractor Incorporation:</strong> The Client fulfilled their contractual SLA by returning comments in 
        <strong>${item.client_rev_wd} working days</strong> (&le; 10 WD SLA). However, the Contractor took <strong>${item.cont_inc_wd} working days</strong> 
        to incorporate comments, exceeding their planned allowance (${item.plan_incorp_allowance_wd} WD) by <strong>+${item.contractor_delay_days} working days</strong>. 
        This overdue cycle is 100% attributable to the Contractor.`;
    } else if (item.delay_cause === 'COMPOUND_DELAY') {
      verdictExplanation = `
        <strong>(4) Compound Delay (Client + Contractor):</strong> Both parties contributed to the overdue schedule. 
        The Client exceeded their 10 WD review SLA by <strong>+${item.client_delay_days} working days</strong> (${item.client_rev_wd} WD review), 
        AND the Contractor exceeded their incorporation allowance by <strong>+${item.contractor_delay_days} working days</strong> (${item.cont_inc_wd} WD incorp). 
        Joint corrective action is required.`;
    }

    el.drawerContent.innerHTML = `
      <div style="margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px solid var(--border-color);">
        <div style="font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px;">Metadata & Work Package</div>
        <div style="font-size: 0.85rem; color: var(--text-primary);">
          <strong>Work Package:</strong> ${escapeHtml(item.work_package)} &bull; <strong>Discipline:</strong> ${escapeHtml(item.discipline || 'Unassigned')} &bull; <strong>Area:</strong> ${escapeHtml(item.area || 'GEN')}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px;">
          <strong>Category:</strong> ${escapeHtml(item.doc_category)} &bull; <strong>Type:</strong> ${escapeHtml(item.doc_type || '-')}
        </div>
      </div>

      <!-- Timeline Comparison Diagram -->
      <div class="timeline-comparison-panel">
        <div style="font-size: 0.82rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #818cf8; margin-bottom: 12px;">
          Contractual Revision Cycle Comparison
        </div>

        <!-- Planned Row -->
        <div class="timeline-row">
          <div class="timeline-row-label">
            <span>REBASELINE PLAN CYCLE:</span>
            <span>${item.plan_wd || 0} Working Days</span>
          </div>
          <div class="timeline-bar-container">
            <div class="timeline-segment client" style="width: ${planClientPct}%;" title="Client Contractual SLA Allocation (10 WD)">
              Client Review: 10 WD
            </div>
            <div class="timeline-segment cont-allowance" style="width: ${planContPct}%;" title="Contractor Planned Allowance (${item.plan_incorp_allowance_wd} WD)">
              Cont. Allowance: ${item.plan_incorp_allowance_wd} WD
            </div>
          </div>
        </div>

        <!-- Actual Row -->
        <div class="timeline-row">
          <div class="timeline-row-label">
            <span>ACTUAL CYCLE EXECUTION:</span>
            <span>${item.actual_cycle_wd || 0} Working Days (${item.cycle_variance_wd > 0 ? '+' + item.cycle_variance_wd + ' WD Over' : 'Met Plan'})</span>
          </div>
          <div class="timeline-bar-container">
            <div class="timeline-segment ${item.client_sla_status === 'OVER' ? 'client-over' : 'client'}" style="width: ${actClientPct}%;" title="Actual Client Review (${item.client_rev_wd} WD)">
              Client: ${item.client_rev_wd || 0} WD ${item.client_sla_status === 'OVER' ? '(+' + item.client_delay_days + ' Over SLA)' : '(Pass)'}
            </div>
            <div class="timeline-segment ${item.cont_inc_wd > item.plan_incorp_allowance_wd ? 'cont-over' : 'cont-actual'}" style="width: ${actContPct}%;" title="Actual Contractor Incorp (${item.cont_inc_wd} WD)">
              Incorp: ${item.cont_inc_wd || 0} WD ${item.contractor_delay_days > 0 ? '(+' + item.contractor_delay_days + ' Over)' : ''}
            </div>
          </div>
        </div>

        <!-- Allowable Extended Row -->
        <div class="timeline-row">
          <div class="timeline-row-label">
            <span>CONTRACTOR ALLOWABLE EXTENDED CYCLE:</span>
            <span>${item.allowable_cycle_wd || 0} Working Days</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">
            Client Review (${item.client_rev_wd || 10} WD) + Entitled Contractor Incorporation Allowance (${item.plan_incorp_allowance_wd} WD) = <strong>${item.allowable_cycle_wd} WD</strong>.
          </div>
        </div>
      </div>

      <!-- Forensic Assessment Verdict Box -->
      <div class="verdict-box">
        <div class="verdict-box-title">⚖️ Forensic Contractual Verdict: ${escapeHtml(item.delay_cause_label)}</div>
        <div class="verdict-box-text">
          ${verdictExplanation}
        </div>
      </div>

      <!-- Raw Log Dates & Transmittal IDs -->
      <div style="margin-top: 20px; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 14px; border-radius: 8px;">
        <div style="font-weight: 700; color: var(--text-secondary); margin-bottom: 8px; text-transform: uppercase;">Audit Trail & meDMS Transmittals</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <span style="color: var(--text-muted);">From Revision (${item.stage_from}):</span><br>
            <strong>${item.rev_from || '-'}</strong> (Submittal: ${item.submittal_id_from || '-'})<br>
            <span style="color: var(--text-muted);">Submit In:</span> ${item.actual_in_from || '-'}<br>
            <span style="color: var(--text-muted);">Submit Out:</span> ${item.actual_out_from || '-'} (Status: ${item.status_code_from || '-'})
          </div>
          <div>
            <span style="color: var(--text-muted);">To Revision (${item.stage_to}):</span><br>
            <strong>${item.rev_to || '-'}</strong> (Submittal: ${item.submittal_id_to || '-'})<br>
            <span style="color: var(--text-muted);">Submit In:</span> ${item.actual_in_to || '-'}<br>
            <span style="color: var(--text-muted);">Status Code:</span> ${item.status_code_to || '-'}
          </div>
        </div>
      </div>
    `;

    openDrawer();
  };

  function openDrawer() {
    if (el.analyticsDrawer) el.analyticsDrawer.classList.add('open');
    if (el.drawerBackdrop) el.drawerBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (el.analyticsDrawer) el.analyticsDrawer.classList.remove('open');
    if (el.drawerBackdrop) el.drawerBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  // --- Chart.js Rendering ---
  function renderCharts() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const textColor = isLight ? '#334155' : '#9ca3af';
    const gridColor = isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)';

    // 1. Root Cause Attribution Donut Chart
    const causeCounts = {
      'MET_PLAN': 0,
      'IMPROPER_PLAN': 0,
      'LATE_CONTRACTOR': 0,
      'LATE_CLIENT': 0,
      'COMPOUND_DELAY': 0
    };

    state.filteredData.forEach(d => {
      if (causeCounts[d.delay_cause] !== undefined) {
        causeCounts[d.delay_cause]++;
      }
    });

    const ctxCause = document.getElementById('delayCauseChart');
    if (ctxCause) {
      if (state.charts.delayCauseChart) state.charts.delayCauseChart.destroy();

      state.charts.delayCauseChart = new Chart(ctxCause, {
        type: 'doughnut',
        data: {
          labels: [
            'Met Rebaseline Plan',
            '(1) Improperly Planned',
            '(2) Late Cont. Incorp',
            '(3) Late Client Review',
            '(4) Compound Delay'
          ],
          datasets: [{
            data: [
              causeCounts['MET_PLAN'],
              causeCounts['IMPROPER_PLAN'],
              causeCounts['LATE_CONTRACTOR'],
              causeCounts['LATE_CLIENT'],
              causeCounts['COMPOUND_DELAY']
            ],
            backgroundColor: [
              '#10b981', // emerald (Met Plan)
              '#8b5cf6', // purple (Improper Plan)
              '#f59e0b', // amber (Late Cont. Incorp)
              '#0284c7', // ocean blue (Late Client Review)
              '#dc2626'  // crimson red (Compound Delay)
            ],
            borderWidth: 2,
            borderColor: isLight ? '#ffffff' : '#111827'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                color: textColor,
                boxWidth: 12,
                font: { family: 'Outfit', size: 11 }
              }
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const val = context.raw || 0;
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${context.label}: ${val.toLocaleString()} (${pct}%)`;
                }
              }
            }
          },
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const causeKeys = ['MET_PLAN', 'IMPROPER_PLAN', 'LATE_CONTRACTOR', 'LATE_CLIENT', 'COMPOUND_DELAY'];
              const chosen = causeKeys[index];
              el.causeSelect.value = chosen;
              state.selectedCause = chosen;
              applyFilters();
            }
          }
        }
      });
    }

    // 2. Discipline Delay Breakdown Stacked Bar Chart
    const discMap = {};
    state.filteredData.forEach(d => {
      const disc = d.discipline || 'Other';
      if (!discMap[disc]) {
        discMap[disc] = { 'MET_PLAN': 0, 'IMPROPER_PLAN': 0, 'LATE_CONTRACTOR': 0, 'LATE_CLIENT': 0, 'COMPOUND_DELAY': 0, 'total': 0 };
      }
      discMap[disc][d.delay_cause] = (discMap[disc][d.delay_cause] || 0) + 1;
      discMap[disc].total++;
    });

    // Top 8 disciplines by volume
    const sortedDiscs = Object.keys(discMap).sort((a, b) => discMap[b].total - discMap[a].total).slice(0, 8);

    const ctxDisc = document.getElementById('disciplineDelayChart');
    if (ctxDisc) {
      if (state.charts.disciplineDelayChart) state.charts.disciplineDelayChart.destroy();

      state.charts.disciplineDelayChart = new Chart(ctxDisc, {
        type: 'bar',
        data: {
          labels: sortedDiscs,
          datasets: [
            {
              label: 'Late Cont. Incorp',
              data: sortedDiscs.map(k => discMap[k]['LATE_CONTRACTOR'] || 0),
              backgroundColor: '#f59e0b',
              stack: 'Stack 0'
            },
            {
              label: 'Improper Plan',
              data: sortedDiscs.map(k => discMap[k]['IMPROPER_PLAN'] || 0),
              backgroundColor: '#8b5cf6',
              stack: 'Stack 0'
            },
            {
              label: 'Late Client Review',
              data: sortedDiscs.map(k => discMap[k]['LATE_CLIENT'] || 0),
              backgroundColor: '#0284c7',
              stack: 'Stack 0'
            },
            {
              label: 'Compound Delay',
              data: sortedDiscs.map(k => discMap[k]['COMPOUND_DELAY'] || 0),
              backgroundColor: '#dc2626',
              stack: 'Stack 0'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              stacked: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Outfit', size: 11 } }
            },
            y: {
              stacked: true,
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: textColor, boxWidth: 10, font: { family: 'Outfit', size: 10 } }
            }
          },
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              const index = elements[0].index;
              const chosenDisc = sortedDiscs[index];
              el.disciplineSelect.value = chosenDisc;
              state.selectedDiscipline = chosenDisc;
              applyFilters();
            }
          }
        }
      });
    }

    // 3. Transition Stage Performance Bar Chart
    const stages = ['IFR -> IFA', 'IFA -> AFC', 'IFR -> AFC (Fast-Track)', 'AFC -> AP'];
    const stageData = stages.map(s => {
      const items = state.filteredData.filter(d => d.transition_type === s);
      const met = items.filter(d => d.delay_cause === 'MET_PLAN').length;
      const cont = items.filter(d => d.delay_cause === 'LATE_CONTRACTOR').length;
      const client = items.filter(d => d.delay_cause === 'LATE_CLIENT').length;
      const improper = items.filter(d => d.delay_cause === 'IMPROPER_PLAN').length;
      const compound = items.filter(d => d.delay_cause === 'COMPOUND_DELAY').length;
      return { s, met, cont, client, improper, compound };
    });

    const ctxStage = document.getElementById('transitionStageChart');
    if (ctxStage) {
      if (state.charts.transitionStageChart) state.charts.transitionStageChart.destroy();

      state.charts.transitionStageChart = new Chart(ctxStage, {
        type: 'bar',
        data: {
          labels: ['IFR ➔ IFA', 'IFA ➔ AFC', 'IFR ➔ AFC (Fast-Track)', 'AFC ➔ AP'],
          datasets: [
            {
              label: 'Met Plan',
              data: stageData.map(x => x.met),
              backgroundColor: '#10b981'
            },
            {
              label: 'Late Cont. Incorp',
              data: stageData.map(x => x.cont),
              backgroundColor: '#f59e0b'
            },
            {
              label: 'Late Client Review',
              data: stageData.map(x => x.client),
              backgroundColor: '#0284c7'
            },
            {
              label: 'Improper Plan',
              data: stageData.map(x => x.improper),
              backgroundColor: '#8b5cf6'
            },
            {
              label: 'Compound Delay',
              data: stageData.map(x => x.compound),
              backgroundColor: '#dc2626'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Outfit', size: 11 } }
            },
            y: {
              grid: { color: gridColor },
              ticks: { color: textColor, font: { family: 'Outfit', size: 10 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: textColor, boxWidth: 10, font: { family: 'Outfit', size: 10 } }
            }
          }
        }
      });
    }
  }

  // --- CSV Export ---
  function exportCsv() {
    if (!state.filteredData.length) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Document No.',
      'Document Title',
      'Work Package',
      'Discipline',
      'Area',
      'Category',
      'Transition Type',
      'Planned Cycle (WD)',
      'Contractor Planned Incorp Allowance (WD)',
      'Actual Cycle (WD)',
      'Cycle Variance (WD)',
      'Client Review (WD)',
      'Client Review SLA Status',
      'Contractor Incorp (WD)',
      'Contractor Allowable Extended Cycle (WD)',
      'Delay Attribution Cause',
      'Client Delay Days (WD)',
      'Contractor Delay Days (WD)',
      'Submittal ID From',
      'Submittal ID To'
    ];

    const rows = state.filteredData.map(d => [
      `"${(d.doc_no || '').replace(/"/g, '""')}"`,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      `"${(d.work_package || '').replace(/"/g, '""')}"`,
      `"${(d.discipline || '').replace(/"/g, '""')}"`,
      `"${(d.area || '').replace(/"/g, '""')}"`,
      `"${(d.doc_category || '').replace(/"/g, '""')}"`,
      `"${(d.transition_type || '').replace(/"/g, '""')}"`,
      d.plan_wd !== null ? d.plan_wd : '',
      d.plan_incorp_allowance_wd !== null ? d.plan_incorp_allowance_wd : '',
      d.actual_cycle_wd !== null ? d.actual_cycle_wd : '',
      d.cycle_variance_wd !== null ? d.cycle_variance_wd : '',
      d.client_rev_wd !== null ? d.client_rev_wd : '',
      `"${(d.client_sla_status || '').replace(/"/g, '""')}"`,
      d.cont_inc_wd !== null ? d.cont_inc_wd : '',
      d.allowable_cycle_wd !== null ? d.allowable_cycle_wd : '',
      `"${(d.delay_cause_label || '').replace(/"/g, '""')}"`,
      d.client_delay_days || 0,
      d.contractor_delay_days || 0,
      `"${(d.submittal_id_from || '').replace(/"/g, '""')}"`,
      `"${(d.submittal_id_to || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ASK_Analytic_Evaluation_Report_${(window.ANALYTICS_REPORT_DATE || 'latest').replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Theme toggle
    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', () => {
        applyTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    // Work Package Tabs
    if (el.wpTabsContainer) {
      el.wpTabsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.wp-tab');
        if (!btn) return;
        el.wpTabsContainer.querySelectorAll('.wp-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.selectedWorkPackage = btn.getAttribute('data-wp');
        applyFilters();
      });
    }

    // Filters
    if (el.transitionSelect) {
      el.transitionSelect.addEventListener('change', () => {
        state.selectedTransition = el.transitionSelect.value;
        applyFilters();
      });
    }
    if (el.causeSelect) {
      el.causeSelect.addEventListener('change', () => {
        state.selectedCause = el.causeSelect.value;
        applyFilters();
      });
    }
    if (el.disciplineSelect) {
      el.disciplineSelect.addEventListener('change', () => {
        state.selectedDiscipline = el.disciplineSelect.value;
        applyFilters();
      });
    }
    if (el.pageSizeSelect) {
      el.pageSizeSelect.addEventListener('change', () => {
        state.pageSize = parseInt(el.pageSizeSelect.value, 10) || 50;
        state.currentPage = 1;
        renderTable();
      });
    }

    // Search Input
    if (el.searchInput) {
      el.searchInput.addEventListener('input', () => {
        state.searchQuery = el.searchInput.value;
        if (el.clearSearchBtn) el.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        applyFilters();
      });
    }
    if (el.clearSearchBtn) {
      el.clearSearchBtn.addEventListener('click', () => {
        el.searchInput.value = '';
        state.searchQuery = '';
        el.clearSearchBtn.style.display = 'none';
        applyFilters();
      });
    }

    // Quick Chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.selectedChip = chip.getAttribute('data-chip');
        applyFilters();
      });
    });

    // Table Header Sorting
    if (el.analyticsTable) {
      el.analyticsTable.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const col = th.getAttribute('data-sort');
          if (state.sortColumn === col) {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortColumn = col;
            state.sortDirection = 'desc';
          }
          applyFilters();
        });
      });
    }

    // Pagination
    if (el.prevPageBtn) {
      el.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          renderTable();
          el.analyticsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
    if (el.nextPageBtn) {
      el.nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
        if (state.currentPage < totalPages) {
          state.currentPage++;
          renderTable();
          el.analyticsTable.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    // Drawer close
    if (el.closeDrawerBtn) el.closeDrawerBtn.addEventListener('click', closeDrawer);
    if (el.drawerBackdrop) el.drawerBackdrop.addEventListener('click', closeDrawer);

    // Modals
    if (el.openSlaDefBtn) {
      el.openSlaDefBtn.addEventListener('click', () => {
        if (el.slaDefModal) el.slaDefModal.style.display = 'flex';
      });
    }
    const closeSla = () => { if (el.slaDefModal) el.slaDefModal.style.display = 'none'; };
    if (el.closeSlaDefModalBtn) el.closeSlaDefModalBtn.addEventListener('click', closeSla);
    if (el.closeSlaDefModalBtn2) el.closeSlaDefModalBtn2.addEventListener('click', closeSla);

    if (el.openUploadBtn) {
      el.openUploadBtn.addEventListener('click', () => {
        if (el.uploadModal) el.uploadModal.style.display = 'flex';
      });
    }
    if (el.closeUploadModalBtn) {
      el.closeUploadModalBtn.addEventListener('click', () => {
        if (el.uploadModal) el.uploadModal.style.display = 'none';
      });
    }

    // Reset Filters
    if (el.refreshBtn) {
      el.refreshBtn.addEventListener('click', () => {
        state.selectedWorkPackage = 'ALL';
        state.selectedTransition = 'ALL';
        state.selectedCause = 'ALL';
        state.selectedDiscipline = 'ALL';
        state.selectedChip = 'ALL';
        state.searchQuery = '';
        state.currentPage = 1;
        state.sortColumn = 'cycle_variance_wd';
        state.sortDirection = 'desc';

        if (el.searchInput) el.searchInput.value = '';
        if (el.clearSearchBtn) el.clearSearchBtn.style.display = 'none';
        if (el.transitionSelect) el.transitionSelect.value = 'ALL';
        if (el.causeSelect) el.causeSelect.value = 'ALL';
        if (el.disciplineSelect) el.disciplineSelect.value = 'ALL';

        el.wpTabsContainer.querySelectorAll('.wp-tab').forEach(b => b.classList.remove('active'));
        const allTab = el.wpTabsContainer.querySelector('.wp-tab[data-wp="ALL"]');
        if (allTab) allTab.classList.add('active');

        document.querySelectorAll('.quick-chip').forEach(c => c.classList.remove('active'));
        const allChip = document.querySelector('.quick-chip[data-chip="ALL"]');
        if (allChip) allChip.classList.add('active');

        applyFilters();
      });
    }

    // Export CSV
    if (el.exportAnalyticsCsvBtn) {
      el.exportAnalyticsCsvBtn.addEventListener('click', exportCsv);
    }

    // Drag and Drop Upload
    if (el.dropZone && el.fileInput) {
      ['dragenter', 'dragover'].forEach(eventName => {
        el.dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          el.dropZone.style.borderColor = '#38bdf8';
          el.dropZone.style.background = 'rgba(56, 189, 248, 0.1)';
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        el.dropZone.addEventListener(eventName, (e) => {
          e.preventDefault();
          el.dropZone.style.borderColor = 'var(--border-color)';
          el.dropZone.style.background = 'transparent';
        });
      });

      el.dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) uploadFile(files[0]);
      });

      el.fileInput.addEventListener('change', () => {
        if (el.fileInput.files.length) {
          uploadFile(el.fileInput.files[0]);
        }
      });
    }
  }

  // --- Upload File Handler ---
  function uploadFile(file) {
    if (!el.uploadStatus) return;
    el.uploadStatus.style.display = 'block';
    el.uploadStatus.innerHTML = `<span style="color: #38bdf8;">⏳ Uploading and processing ${escapeHtml(file.name)}...</span>`;

    const formData = new FormData();
    formData.append('file', file);

    fetch('/api/upload', {
      method: 'POST',
      body: formData
    })
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          el.uploadStatus.innerHTML = `<span style="color: #10b981;">✅ Successfully processed! Reloading dashboard...</span>`;
          setTimeout(() => window.location.reload(), 1500);
        } else {
          el.uploadStatus.innerHTML = `<span style="color: #f43f5e;">❌ Error: ${escapeHtml(data.error || 'Upload failed')}</span>`;
        }
      })
      .catch(err => {
        el.uploadStatus.innerHTML = `<span style="color: #f43f5e;">❌ Network error: ${escapeHtml(err.message)}</span>`;
      });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
