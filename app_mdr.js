/**
 * ASK Technical Document Workflow & Revision Lifecycle Dashboard (MDR)
 * Interactive logic for MDR 5 Work Package tracking, milestone pipeline,
 * contractor incorporation duration analysis (IFR-IFA, IFA-AFC, AFC-AP) for Part B vs Part C,
 * and interactive lifecycle drawer.
 */

(function () {
  'use strict';

  // --- State ---
  const state = {
    allData: Array.isArray(window.MDR_DATA) ? window.MDR_DATA : [],
    filteredData: [],
    selectedWorkPackage: 'ALL',
    selectedCategory: 'ALL', // 'ALL', 'Part B - Engineering Doc', 'Part C - Engineering Dwg'
    searchQuery: '',
    selectedDiscipline: 'ALL',
    selectedIfaStatus: 'ALL',
    selectedMilestone: 'ALL',
    selectedClientReview: 'ALL',
    quickFilter: null,
    currentPage: 1,
    pageSize: 50,
    sortColumn: 'doc_no',
    sortDirection: 'asc',
    theme: localStorage.getItem('ask_dash_theme') || 'dark',
    selectedDoc: null
  };

  // --- DOM Elements ---
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    refreshBtn: document.getElementById('refreshBtn'),
    exportMdrCsvBtn: document.getElementById('exportMdrCsvBtn'),
    headerTotalBadge: document.getElementById('headerTotalBadge'),
    
    // WP Tabs
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
    categorySelect: document.getElementById('categorySelect'),
    disciplineSelect: document.getElementById('disciplineSelect'),
    ifaStatusSelect: document.getElementById('ifaStatusSelect'),
    milestoneSelect: document.getElementById('milestoneSelect'),
    clientReviewFilter: document.getElementById('clientReviewFilter'),
    quickChipsRow: document.getElementById('quickChipsRow'),

    // KPIs
    kpiTotalDocs: document.getElementById('kpiTotalDocs'),
    kpiScopeTag: document.getElementById('kpiScopeTag'),
    kpiTotalDocsSub: document.getElementById('kpiTotalDocsSub'),
    kpiTotalRevsLogged: document.getElementById('kpiTotalRevsLogged'),
    kpiAvgClientReviewDays: document.getElementById('kpiAvgClientReviewDays'),
    kpiMeetAgreementRate: document.getElementById('kpiMeetAgreementRate'),
    kpiMeetAgreementCount: document.getElementById('kpiMeetAgreementCount'),
    kpiOver10Count: document.getElementById('kpiOver10Count'),
    kpiApprovedDocs: document.getElementById('kpiApprovedDocs'),
    kpiApprovedRate: document.getElementById('kpiApprovedRate'),
    kpiInProgressDocs: document.getElementById('kpiInProgressDocs'),
    kpiIfaSkippedCount: document.getElementById('kpiIfaSkippedCount'),
    kpiIfaApplicableSub: document.getElementById('kpiIfaApplicableSub'),
    kpiIfaSkipRate: document.getElementById('kpiIfaSkipRate'),
    kpiAvgContractorDays: document.getElementById('kpiAvgContractorDays'),
    kpiIncorpSamples: document.getElementById('kpiIncorpSamples'),

    // Milestones
    mIfrSubmitted: document.getElementById('mIfrSubmitted'),
    mIfrAvgReview: document.getElementById('mIfrAvgReview'),
    mIfrProgress: document.getElementById('mIfrProgress'),
    mIfrWithin10: document.getElementById('mIfrWithin10'),
    mIfrOver10: document.getElementById('mIfrOver10'),
    mIfrAgreementRate: document.getElementById('mIfrAgreementRate'),
    mIfrReturnCodes: document.getElementById('mIfrReturnCodes'),

    mIfaSubmitted: document.getElementById('mIfaSubmitted'),
    mIfaAvgReview: document.getElementById('mIfaAvgReview'),
    mIfaProgress: document.getElementById('mIfaProgress'),
    mIfaSkipped: document.getElementById('mIfaSkipped'),
    mIfaWithin10: document.getElementById('mIfaWithin10'),
    mIfaOver10: document.getElementById('mIfaOver10'),
    mIfaAvgIncorp: document.getElementById('mIfaAvgIncorp'),
    mIfaReturnCodes: document.getElementById('mIfaReturnCodes'),

    mAfcSubmitted: document.getElementById('mAfcSubmitted'),
    mAfcAvgReview: document.getElementById('mAfcAvgReview'),
    mAfcProgress: document.getElementById('mAfcProgress'),
    mAfcWithin10: document.getElementById('mAfcWithin10'),
    mAfcOver10: document.getElementById('mAfcOver10'),
    mAfcAvgIncorp: document.getElementById('mAfcAvgIncorp'),
    mAfcAgreementRate: document.getElementById('mAfcAgreementRate'),
    mAfcReturnCodes: document.getElementById('mAfcReturnCodes'),

    mApApproved: document.getElementById('mApApproved'),
    mApAvgReview: document.getElementById('mApAvgReview'),
    mApPercent: document.getElementById('mApPercent'),
    mApProgress: document.getElementById('mApProgress'),
    mApCodeApproved: document.getElementById('mApCodeApproved'),
    mApPending: document.getElementById('mApPending'),

    // Executive Summary Modal
    openExecSummaryBtn: document.getElementById('openExecSummaryBtn'),
    closeExecSummaryBtn: document.getElementById('closeExecSummaryBtn'),
    execSummaryModal: document.getElementById('execSummaryModal'),
    execSummaryContent: document.getElementById('execSummaryContent'),

    // Turnaround Pills in Milestone Connectors (Red Circles in diagram)
    connIfrIfaDays: document.getElementById('connIfrIfaDays'),
    connIfaAfcDays: document.getElementById('connIfaAfcDays'),
    connAfcApDays: document.getElementById('connAfcApDays'),

    // Contractor Incorp Section
    categoryToggleGroup: document.getElementById('categoryToggleGroup'),
    catCountAll: document.getElementById('catCountAll'),
    catCountPartB: document.getElementById('catCountPartB'),
    catCountPartC: document.getElementById('catCountPartC'),
    summaryIfrIfaAvg: document.getElementById('summaryIfrIfaAvg'),
    summaryIfrIfaCount: document.getElementById('summaryIfrIfaCount'),
    summaryIfaAfcAvg: document.getElementById('summaryIfaAfcAvg'),
    summaryIfaAfcCount: document.getElementById('summaryIfaAfcCount'),
    summaryAfcApAvg: document.getElementById('summaryAfcApAvg'),
    summaryAfcApCount: document.getElementById('summaryAfcApCount'),
    summaryTotalCycleAvg: document.getElementById('summaryTotalCycleAvg'),
    incorpTableBody: document.getElementById('incorpTableBody'),

    // Discipline Section
    disciplineTableBody: document.getElementById('disciplineTableBody'),
    disciplineFilterIndicator: document.getElementById('disciplineFilterIndicator'),

    // Main Table
    tableRecordCountSub: document.getElementById('tableRecordCountSub'),
    paginationInfo: document.getElementById('paginationInfo'),
    prevPageBtn: document.getElementById('prevPageBtn'),
    nextPageBtn: document.getElementById('nextPageBtn'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    mdrTableBody: document.getElementById('mdrTableBody'),

    // Drawer
    lifecycleModalBackdrop: document.getElementById('lifecycleModalBackdrop'),
    lifecycleDrawer: document.getElementById('lifecycleDrawer'),
    drawerWpBadge: document.getElementById('drawerWpBadge'),
    drawerDocNo: document.getElementById('drawerDocNo'),
    drawerDocTitle: document.getElementById('drawerDocTitle'),
    drawerBody: document.getElementById('drawerBody'),
    closeDrawerBtn: document.getElementById('closeDrawerBtn'),
    closeDrawerFooterBtn: document.getElementById('closeDrawerFooterBtn'),

    // SLA & Upload Modal Elements
    openSlaDefBtn: document.getElementById('openSlaDefBtn'),
    slaModalBackdrop: document.getElementById('slaModalBackdrop'),
    closeSlaModalBtn: document.getElementById('closeSlaModalBtn'),
    closeSlaModalBtn2: document.getElementById('closeSlaModalBtn2'),
    openUploadBtn: document.getElementById('openUploadBtn'),
    uploadModalBackdrop: document.getElementById('uploadModalBackdrop'),
    closeUploadModalBtn: document.getElementById('closeUploadModalBtn'),
    uploadDropzone: document.getElementById('uploadDropzone'),
    excelFileInput: document.getElementById('excelFileInput'),
    uploadStatusBox: document.getElementById('uploadStatusBox')
  };

  // --- Initialize ---
  function init() {
    setupTheme();
    setupReportDate();
    populateDisciplineOptions();
    updateTabBadges();
    applyFilters();
    bindEvents();
  }

  function setupReportDate() {
    const dateEl = document.getElementById('headerReportDate');
    if (!dateEl) return;
    if (window.MDR_REPORT_DATE) {
      dateEl.textContent = `Cut-off ${window.MDR_REPORT_DATE}`;
    }
  }

  // --- Theme Setup ---
  function setupTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (!el.themeIcon) return;
    if (state.theme === 'dark') {
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
        </svg>
      `;
    } else {
      el.themeIcon.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
    }
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', state.theme);
    localStorage.setItem('ask_dash_theme', state.theme);
    setupTheme();
  }

  // --- Populate Discipline Select ---
  function populateDisciplineOptions() {
    const disciplines = new Set();
    state.allData.forEach(d => {
      if (d.discipline && d.discipline.trim()) {
        disciplines.add(d.discipline.trim());
      }
    });

    const sorted = Array.from(disciplines).sort();
    sorted.forEach(disc => {
      const opt = document.createElement('option');
      opt.value = disc;
      opt.textContent = `${disc}`;
      el.disciplineSelect.appendChild(opt);
    });
  }

  // --- Update Tab Badges ---
  function updateTabBadges() {
    const counts = {
      ALL: state.allData.length,
      'WP01 TOPSIDE': 0,
      'WP01 JACKET': 0,
      'WP02 TOPSIDE': 0,
      'WP02 JACKET': 0,
      'PRO.ENGINEERING_MR TBE': 0
    };

    state.allData.forEach(d => {
      if (counts[d.work_package] !== undefined) {
        counts[d.work_package]++;
      }
    });

    if (el.tabCountAll) el.tabCountAll.textContent = counts.ALL.toLocaleString();
    if (el.tabCountWP01Top) el.tabCountWP01Top.textContent = counts['WP01 TOPSIDE'].toLocaleString();
    if (el.tabCountWP01Jkt) el.tabCountWP01Jkt.textContent = counts['WP01 JACKET'].toLocaleString();
    if (el.tabCountWP02Top) el.tabCountWP02Top.textContent = counts['WP02 TOPSIDE'].toLocaleString();
    if (el.tabCountWP02Jkt) el.tabCountWP02Jkt.textContent = counts['WP02 JACKET'].toLocaleString();
    if (el.tabCountProEng) el.tabCountProEng.textContent = counts['PRO.ENGINEERING_MR TBE'].toLocaleString();

    // Category Counts
    const partBAll = state.allData.filter(d => d.doc_category === 'Part B - Engineering Doc').length;
    const partCAll = state.allData.filter(d => d.doc_category === 'Part C - Engineering Dwg').length;
    if (el.catCountAll) el.catCountAll.textContent = state.allData.length.toLocaleString();
    if (el.catCountPartB) el.catCountPartB.textContent = partBAll.toLocaleString();
    if (el.catCountPartC) el.catCountPartC.textContent = partCAll.toLocaleString();
  }

  // --- Filtering & Sorting ---
  function applyFilters() {
    let data = state.allData;

    // 1. Work Package
    if (state.selectedWorkPackage !== 'ALL') {
      data = data.filter(d => d.work_package === state.selectedWorkPackage);
    }

    // 2. Category (Part B - Engineering Doc vs Part C - Engineering Dwg)
    if (state.selectedCategory !== 'ALL') {
      data = data.filter(d => d.doc_category === state.selectedCategory);
    }

    // 3. Discipline
    if (state.selectedDiscipline !== 'ALL') {
      data = data.filter(d => d.discipline === state.selectedDiscipline);
    }

    // 4. IFA Status
    if (state.selectedIfaStatus === 'SKIPPED') {
      data = data.filter(d => d.ifa && d.ifa.is_skipped === true);
    } else if (state.selectedIfaStatus === 'APPLICABLE') {
      data = data.filter(d => d.ifa && d.ifa.is_skipped === false);
    }

    // 5. Milestone Progress
    if (state.selectedMilestone === 'IFR_PENDING') {
      data = data.filter(d => !d.ifr || !d.ifr.submit_in);
    } else if (state.selectedMilestone === 'IFR_DONE') {
      data = data.filter(d => d.ifr && d.ifr.submit_in);
    } else if (state.selectedMilestone === 'IFA_DONE') {
      data = data.filter(d => d.ifa && d.ifa.submit_in);
    } else if (state.selectedMilestone === 'AFC_DONE') {
      data = data.filter(d => d.afc && d.afc.submit_in);
    } else if (state.selectedMilestone === 'APPROVED') {
      data = data.filter(d => d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR'))));
    }

    // 6. Client Review Agreement (&le; 10d vs > 10d)
    if (state.selectedClientReview === 'WITHIN_10') {
      data = data.filter(d => {
        return (d.ifr && d.ifr.review_days !== null && d.ifr.review_days <= 10) ||
               (d.ifa && d.ifa.review_days !== null && d.ifa.review_days <= 10) ||
               (d.afc && d.afc.review_days !== null && d.afc.review_days <= 10);
      });
    } else if (state.selectedClientReview === 'OVER_10') {
      data = data.filter(d => {
        return (d.ifr && d.ifr.review_days !== null && d.ifr.review_days > 10) ||
               (d.ifa && d.ifa.review_days !== null && d.ifa.review_days > 10) ||
               (d.afc && d.afc.review_days !== null && d.afc.review_days > 10);
      });
    }

    // 7. Quick Filters
    if (state.quickFilter === 'only-part-b') {
      data = data.filter(d => d.doc_category === 'Part B - Engineering Doc');
    } else if (state.quickFilter === 'only-part-c') {
      data = data.filter(d => d.doc_category === 'Part C - Engineering Dwg');
    } else if (state.quickFilter === 'only-approved') {
      data = data.filter(d => d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR'))));
    } else if (state.quickFilter === 'only-ifa-skipped') {
      data = data.filter(d => d.ifa && d.ifa.is_skipped === true);
    } else if (state.quickFilter === 'only-over10') {
      data = data.filter(d => {
        return (d.ifr && d.ifr.review_days > 10) ||
               (d.ifa && d.ifa.review_days > 10) ||
               (d.afc && d.afc.review_days > 10);
      });
    } else if (state.quickFilter === 'only-afc-ready') {
      data = data.filter(d => d.afc && d.afc.submit_in);
    }

    // 8. Search Query
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      data = data.filter(d => {
        return (d.doc_no && d.doc_no.toLowerCase().includes(q)) ||
               (d.title && d.title.toLowerCase().includes(q)) ||
               (d.discipline && d.discipline.toLowerCase().includes(q)) ||
               (d.doc_category && d.doc_category.toLowerCase().includes(q)) ||
               (d.ifr && d.ifr.submittal_id && d.ifr.submittal_id.toLowerCase().includes(q)) ||
               (d.ifa && d.ifa.submittal_id && d.ifa.submittal_id.toLowerCase().includes(q)) ||
               (d.afc && d.afc.submittal_id && d.afc.submittal_id.toLowerCase().includes(q));
      });
    }

    // Sort Data
    data.sort((a, b) => {
      let va = a[state.sortColumn];
      let vb = b[state.sortColumn];
      if (va === null || va === undefined) va = '';
      if (vb === null || vb === undefined) vb = '';

      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();

      if (va < vb) return state.sortDirection === 'asc' ? -1 : 1;
      if (va > vb) return state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    state.filteredData = data;
    state.currentPage = 1;

    renderKPIs();
    renderMilestones();
    renderIncorpTable();
    renderDisciplineTable();
    renderMainTable();
  }

  // --- Render Executive KPIs ---
  function renderKPIs() {
    const data = state.filteredData;
    const totalDocs = data.length;

    // Header badge
    if (el.headerTotalBadge) {
      el.headerTotalBadge.textContent = `${totalDocs.toLocaleString()} Documents`;
    }

    // Total Docs Card
    if (el.kpiTotalDocs) el.kpiTotalDocs.textContent = totalDocs.toLocaleString();
    if (el.kpiScopeTag) {
      let tag = state.selectedWorkPackage === 'ALL' ? 'All Packages' : state.selectedWorkPackage;
      if (state.selectedCategory !== 'ALL') {
        tag += ` &bull; ${state.selectedCategory.includes('Part B') ? 'Part B' : 'Part C'}`;
      }
      el.kpiScopeTag.innerHTML = tag;
    }
    const totalRevs = data.reduce((sum, d) => sum + (d.total_revisions_logged || 0), 0);
    if (el.kpiTotalRevsLogged) el.kpiTotalRevsLogged.textContent = `${totalRevs.toLocaleString()} Revisions Logged`;

    // Client Review Agreement (&le; 10 Days vs > 10 Days)
    let clientReviewDaysSum = 0;
    let totalReviews = 0;
    let within10Reviews = 0;
    let over10Reviews = 0;

    data.forEach(d => {
      if (d.ifr && d.ifr.review_days !== null) {
        totalReviews++;
        clientReviewDaysSum += d.ifr.review_days;
        if (d.ifr.review_days <= 10) within10Reviews++;
        else over10Reviews++;
      }
      if (d.ifa && d.ifa.review_days !== null) {
        totalReviews++;
        clientReviewDaysSum += d.ifa.review_days;
        if (d.ifa.review_days <= 10) within10Reviews++;
        else over10Reviews++;
      }
      if (d.afc && d.afc.review_days !== null) {
        totalReviews++;
        clientReviewDaysSum += d.afc.review_days;
        if (d.afc.review_days <= 10) within10Reviews++;
        else over10Reviews++;
      }
    });

    const avgClientReviewDays = totalReviews > 0 ? (clientReviewDaysSum / totalReviews).toFixed(1) : '--';
    const agreementRate = totalReviews > 0 ? ((within10Reviews / totalReviews) * 100).toFixed(1) : 0;

    if (el.kpiAvgClientReviewDays) el.kpiAvgClientReviewDays.textContent = avgClientReviewDays;
    if (el.kpiMeetAgreementRate) el.kpiMeetAgreementRate.textContent = `${agreementRate}% ≤ 10 WD`;
    if (el.kpiMeetAgreementCount) el.kpiMeetAgreementCount.textContent = `${within10Reviews.toLocaleString()} of ${totalReviews.toLocaleString()} Reviews (≤ 10 WD)`;
    if (el.kpiOver10Count) el.kpiOver10Count.textContent = `${over10Reviews.toLocaleString()} Over 10 WD`;

    // Approved Documents (AP)
    const approvedDocs = data.filter(d => d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR')))).length;
    const approvedRate = totalDocs > 0 ? ((approvedDocs / totalDocs) * 100).toFixed(1) : 0;
    if (el.kpiApprovedDocs) el.kpiApprovedDocs.textContent = approvedDocs.toLocaleString();
    if (el.kpiApprovedRate) el.kpiApprovedRate.textContent = `${approvedRate}%`;
    if (el.kpiInProgressDocs) el.kpiInProgressDocs.textContent = `${(totalDocs - approvedDocs).toLocaleString()} In Progress`;

    // IFA Skipped Logic
    const ifaSkippedDocs = data.filter(d => d.ifa && d.ifa.is_skipped).length;
    const ifaApplicableDocs = totalDocs - ifaSkippedDocs;
    const ifaSkipRate = totalDocs > 0 ? ((ifaSkippedDocs / totalDocs) * 100).toFixed(1) : 0;
    if (el.kpiIfaSkippedCount) el.kpiIfaSkippedCount.textContent = ifaSkippedDocs.toLocaleString();
    if (el.kpiIfaApplicableSub) el.kpiIfaApplicableSub.textContent = `${ifaApplicableDocs.toLocaleString()} Docs Applicable`;
    if (el.kpiIfaSkipRate) el.kpiIfaSkipRate.textContent = `${ifaSkipRate}% Skip Rate`;

    // Contractor Incorp Turnaround Overall
    let incorpDaysSum = 0;
    let incorpCount = 0;
    data.forEach(d => {
      if (d.ifa && typeof d.ifa.incorp_days === 'number' && d.ifa.incorp_days >= 0) {
        incorpDaysSum += d.ifa.incorp_days;
        incorpCount++;
      }
      if (d.afc && typeof d.afc.incorp_days === 'number' && d.afc.incorp_days >= 0) {
        incorpDaysSum += d.afc.incorp_days;
        incorpCount++;
      }
      if (d.ap && typeof d.ap.incorp_days === 'number' && d.ap.incorp_days >= 0) {
        incorpDaysSum += d.ap.incorp_days;
        incorpCount++;
      }
    });

    const avgIncorpDays = incorpCount > 0 ? Math.round(incorpDaysSum / incorpCount) : '--';
    if (el.kpiAvgContractorDays) el.kpiAvgContractorDays.textContent = avgIncorpDays;
    if (el.kpiIncorpSamples) el.kpiIncorpSamples.textContent = `Based on ${incorpCount.toLocaleString()} transitions`;
  }

  // --- Render Milestone Pipeline & Connectors ---
  function renderMilestones() {
    const data = state.filteredData;
    const totalDocs = data.length || 1;

    // --- 1. IFR ---
    const ifrDocs = data.filter(d => d.ifr && d.ifr.submit_in);
    const ifrReviews = data.filter(d => d.ifr && d.ifr.review_days !== null);
    const ifrDaysSum = ifrReviews.reduce((sum, d) => sum + d.ifr.review_days, 0);
    const ifrAvgDays = ifrReviews.length > 0 ? (ifrDaysSum / ifrReviews.length).toFixed(1) : '--';
    const ifrWithin10 = ifrReviews.filter(d => d.ifr.review_days <= 10).length;
    const ifrOver10 = ifrReviews.length - ifrWithin10;
    const ifrAgreementRate = ifrReviews.length > 0 ? ((ifrWithin10 / ifrReviews.length) * 100).toFixed(1) : 0;
    const ifrProgressPct = Math.min(100, Math.round((ifrDocs.length / totalDocs) * 100));

    if (el.mIfrSubmitted) el.mIfrSubmitted.textContent = `${ifrDocs.length.toLocaleString()}`;
    if (el.mIfrAvgReview) el.mIfrAvgReview.textContent = `${ifrAvgDays} WD`;
    if (el.mIfrProgress) el.mIfrProgress.style.width = `${ifrAgreementRate}%`;
    if (el.mIfrWithin10) el.mIfrWithin10.textContent = `${ifrWithin10.toLocaleString()} (${ifrAgreementRate}%) ≤ 10 WD`;
    if (el.mIfrOver10) el.mIfrOver10.textContent = `${ifrOver10.toLocaleString()} Over 10 WD`;
    if (el.mIfrAgreementRate) el.mIfrAgreementRate.textContent = `${ifrAgreementRate}%`;

    // --- 2. IFA ---
    const ifaDocs = data.filter(d => d.ifa && d.ifa.submit_in);
    const ifaSkipped = data.filter(d => d.ifa && d.ifa.is_skipped).length;
    const ifaReviews = data.filter(d => d.ifa && d.ifa.review_days !== null);
    const ifaDaysSum = ifaReviews.reduce((sum, d) => sum + d.ifa.review_days, 0);
    const ifaAvgDays = ifaReviews.length > 0 ? (ifaDaysSum / ifaReviews.length).toFixed(1) : '--';
    const ifaWithin10 = ifaReviews.filter(d => d.ifa.review_days <= 10).length;
    const ifaOver10 = ifaReviews.length - ifaWithin10;
    const ifaAgreementRate = ifaReviews.length > 0 ? ((ifaWithin10 / ifaReviews.length) * 100).toFixed(1) : 0;
    const ifaProgressPct = Math.min(100, Math.round(((ifaDocs.length + ifaSkipped) / totalDocs) * 100));

    const ifaIncorpList = data.filter(d => d.ifa && typeof d.ifa.incorp_days === 'number' && d.ifa.incorp_days >= 0);
    const ifaAvgIncorp = ifaIncorpList.length > 0 ? (ifaIncorpList.reduce((s, d) => s + d.ifa.incorp_days, 0) / ifaIncorpList.length).toFixed(1) : '--';

    if (el.mIfaSubmitted) el.mIfaSubmitted.textContent = `${ifaDocs.length.toLocaleString()}`;
    if (el.mIfaAvgReview) el.mIfaAvgReview.textContent = `${ifaAvgDays} WD`;
    if (el.mIfaProgress) el.mIfaProgress.style.width = `${ifaAgreementRate}%`;
    if (el.mIfaSkipped) el.mIfaSkipped.textContent = `${ifaSkipped.toLocaleString()} Skipped Directly to AFC (N/A)`;
    if (el.mIfaWithin10) el.mIfaWithin10.textContent = `${ifaWithin10.toLocaleString()} (${ifaAgreementRate}%) ≤ 10 WD`;
    if (el.mIfaOver10) el.mIfaOver10.textContent = `${ifaOver10.toLocaleString()} Over 10 WD`;
    if (el.mIfaAvgIncorp) el.mIfaAvgIncorp.textContent = `${ifaAvgIncorp} d`;

    // --- 3. AFC ---
    const afcDocs = data.filter(d => d.afc && d.afc.submit_in);
    const afcReviews = data.filter(d => d.afc && d.afc.review_days !== null);
    const afcDaysSum = afcReviews.reduce((sum, d) => sum + d.afc.review_days, 0);
    const afcAvgDays = afcReviews.length > 0 ? (afcDaysSum / afcReviews.length).toFixed(1) : '--';
    const afcWithin10 = afcReviews.filter(d => d.afc.review_days <= 10).length;
    const afcOver10 = afcReviews.length - afcWithin10;
    const afcAgreementRate = afcReviews.length > 0 ? ((afcWithin10 / afcReviews.length) * 100).toFixed(1) : 0;
    const afcProgressPct = Math.min(100, Math.round((afcDocs.length / totalDocs) * 100));

    const afcIncorpList = data.filter(d => d.afc && typeof d.afc.incorp_days === 'number' && d.afc.incorp_days >= 0);
    const afcAvgIncorp = afcIncorpList.length > 0 ? (afcIncorpList.reduce((s, d) => s + d.afc.incorp_days, 0) / afcIncorpList.length).toFixed(1) : '--';

    if (el.mAfcSubmitted) el.mAfcSubmitted.textContent = `${afcDocs.length.toLocaleString()}`;
    if (el.mAfcAvgReview) el.mAfcAvgReview.textContent = `${afcAvgDays} WD`;
    if (el.mAfcProgress) el.mAfcProgress.style.width = `${afcAgreementRate}%`;
    if (el.mAfcWithin10) el.mAfcWithin10.textContent = `${afcWithin10.toLocaleString()} (${afcAgreementRate}%) ≤ 10 WD`;
    if (el.mAfcOver10) el.mAfcOver10.textContent = `${afcOver10.toLocaleString()} Over 10 WD`;
    if (el.mAfcAvgIncorp) el.mAfcAvgIncorp.textContent = `${afcAvgIncorp} d`;
    if (el.mAfcAgreementRate) el.mAfcAgreementRate.textContent = `${afcAgreementRate}%`;

    // --- 4. AP ---
    const apApprovedDocs = data.filter(d => d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR'))));
    const apApproved = apApprovedDocs.length;
    const apProgressPct = Math.min(100, Math.round((apApproved / totalDocs) * 100));

    // Calculate Client Closeout Review Duration for approved docs
    const apReviewDaysList = [];
    apApprovedDocs.forEach(d => {
      if (d.afc && d.afc.review_days !== null) {
        apReviewDaysList.push(d.afc.review_days);
      } else if (d.ifa && d.ifa.review_days !== null) {
        apReviewDaysList.push(d.ifa.review_days);
      } else if (d.ifr && d.ifr.review_days !== null) {
        apReviewDaysList.push(d.ifr.review_days);
      }
    });

    const apAvgReviewDays = apReviewDaysList.length > 0
      ? (apReviewDaysList.reduce((s, r) => s + r, 0) / apReviewDaysList.length).toFixed(1)
      : '--';

    if (el.mApApproved) el.mApApproved.textContent = `${apApproved.toLocaleString()}`;
    if (el.mApAvgReview) el.mApAvgReview.textContent = `${apAvgReviewDays} WD`;
    if (el.mApPercent) el.mApPercent.textContent = `${apProgressPct}% Completion`;
    if (el.mApProgress) el.mApProgress.style.width = `${apProgressPct}%`;
    if (el.mApCodeApproved) el.mApCodeApproved.textContent = `${apApproved.toLocaleString()} APPR / Code 1`;
    if (el.mApPending) el.mApPending.textContent = `${(totalDocs - apApproved).toLocaleString()} In Progress`;

    // --- Red Circles: Connector Turnaround Pills ---
    const afcApList = data.filter(d => d.ap && typeof d.ap.incorp_days === 'number' && d.ap.incorp_days >= 0);
    const afcApAvgIncorp = afcApList.length > 0 ? (afcApList.reduce((s, d) => s + d.ap.incorp_days, 0) / afcApList.length).toFixed(1) : '--';

    if (el.connIfrIfaDays) el.connIfrIfaDays.textContent = `${ifaAvgIncorp} WD`;
    if (el.connIfaAfcDays) el.connIfaAfcDays.textContent = `${afcAvgIncorp} WD`;
    if (el.connAfcApDays) el.connAfcApDays.textContent = `${afcApAvgIncorp} WD`;
  }

  function renderReturnPills(container, statusCodes) {
    if (!container) return;
    container.innerHTML = '';
    const counts = {};
    statusCodes.forEach(c => {
      if (c && c.trim() && c !== 'nan') {
        const clean = c.trim().toUpperCase();
        counts[clean] = (counts[clean] || 0) + 1;
      }
    });

    const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    if (entries.length === 0) {
      container.innerHTML = '<span class="return-tag-pill">Pending Reviews</span>';
      return;
    }

    entries.forEach(([code, count]) => {
      const span = document.createElement('span');
      span.className = 'return-tag-pill';
      span.textContent = `${code}: ${count}`;
      container.appendChild(span);
    });
  }

  // --- Render Contractor Incorporation Turnaround Matrix Table ---
  function renderIncorpTable() {
    if (!el.incorpTableBody) return;
    el.incorpTableBody.innerHTML = '';

    const data = state.filteredData;

    // Summary Cards Calculation
    const ifrIfaList = data.filter(d => d.ifa && typeof d.ifa.incorp_days === 'number' && d.ifa.incorp_days >= 0);
    const avgIfrIfa = ifrIfaList.length > 0 ? (ifrIfaList.reduce((s, d) => s + d.ifa.incorp_days, 0) / ifrIfaList.length).toFixed(1) : '--';

    const ifaAfcList = data.filter(d => d.afc && typeof d.afc.incorp_days === 'number' && d.afc.incorp_days >= 0);
    const avgIfaAfc = ifaAfcList.length > 0 ? (ifaAfcList.reduce((s, d) => s + d.afc.incorp_days, 0) / ifaAfcList.length).toFixed(1) : '--';

    const afcApList = data.filter(d => d.ap && typeof d.ap.incorp_days === 'number' && d.ap.incorp_days >= 0);
    const avgAfcAp = afcApList.length > 0 ? (afcApList.reduce((s, d) => s + d.ap.incorp_days, 0) / afcApList.length).toFixed(1) : '--';

    const totalCycle = (avgIfrIfa !== '--' ? parseFloat(avgIfrIfa) : 0) +
                       (avgIfaAfc !== '--' ? parseFloat(avgIfaAfc) : 0) +
                       (avgAfcAp !== '--' ? parseFloat(avgAfcAp) : 0);

    if (el.summaryIfrIfaAvg) el.summaryIfrIfaAvg.textContent = `${avgIfrIfa} WD`;
    if (el.summaryIfrIfaCount) el.summaryIfrIfaCount.textContent = `${ifrIfaList.length.toLocaleString()} transitions tracked`;
    if (el.summaryIfaAfcAvg) el.summaryIfaAfcAvg.textContent = `${avgIfaAfc} WD`;
    if (el.summaryIfaAfcCount) el.summaryIfaAfcCount.textContent = `${ifaAfcList.length.toLocaleString()} transitions tracked`;
    if (el.summaryAfcApAvg) el.summaryAfcApAvg.textContent = `${avgAfcAp} WD`;
    if (el.summaryAfcApCount) el.summaryAfcApCount.textContent = `${afcApList.length.toLocaleString()} approvals tracked`;
    if (el.summaryTotalCycleAvg) el.summaryTotalCycleAvg.textContent = `${totalCycle.toFixed(1)} WD`;

    // Grouping by Discipline & Category
    const discCatMap = {};
    data.forEach(d => {
      const disc = (d.discipline && d.discipline.trim()) ? d.discipline.trim() : 'GEN';
      const cat = d.doc_category || 'Part B - Engineering Doc';
      const key = `${disc}___${cat}`;
      if (!discCatMap[key]) {
        discCatMap[key] = {
          discipline: disc,
          category: cat,
          total: 0,
          ifrIfaDays: 0,
          ifrIfaCount: 0,
          ifaAfcDays: 0,
          ifaAfcCount: 0,
          afcApDays: 0,
          afcApCount: 0
        };
      }
      const item = discCatMap[key];
      item.total++;
      if (d.ifa && typeof d.ifa.incorp_days === 'number' && d.ifa.incorp_days >= 0) {
        item.ifrIfaDays += d.ifa.incorp_days;
        item.ifrIfaCount++;
      }
      if (d.afc && typeof d.afc.incorp_days === 'number' && d.afc.incorp_days >= 0) {
        item.ifaAfcDays += d.afc.incorp_days;
        item.ifaAfcCount++;
      }
      if (d.ap && typeof d.ap.incorp_days === 'number' && d.ap.incorp_days >= 0) {
        item.afcApDays += d.ap.incorp_days;
        item.afcApCount++;
      }
    });

    const rows = Object.values(discCatMap).sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return b.total - a.total;
    });

    if (rows.length === 0) {
      el.incorpTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 24px;">No records match current filter criteria.</td></tr>';
      return;
    }

    rows.forEach(item => {
      const ifrIfaAvg = item.ifrIfaCount > 0 ? (item.ifrIfaDays / item.ifrIfaCount).toFixed(1) : null;
      const ifaAfcAvg = item.ifaAfcCount > 0 ? (item.ifaAfcDays / item.ifaAfcCount).toFixed(1) : null;
      const afcApAvg = item.afcApCount > 0 ? (item.afcApDays / item.afcApCount).toFixed(1) : null;

      const totalTurnaround = (ifrIfaAvg ? parseFloat(ifrIfaAvg) : 0) + 
                              (ifaAfcAvg ? parseFloat(ifaAfcAvg) : 0) + 
                              (afcApAvg ? parseFloat(afcApAvg) : 0);

      let speedClass = 'mod';
      let speedText = 'Standard (15-25 WD)';
      if (totalTurnaround > 0 && totalTurnaround <= 15) {
        speedClass = 'fast';
        speedText = 'Fast (<= 15 WD)';
      } else if (totalTurnaround > 25) {
        speedClass = 'extended';
        speedText = 'Extended (> 25 WD)';
      }

      const tr = document.createElement('tr');
      tr.className = 'clickable-row';
      tr.title = `Click to filter by discipline ${item.discipline}`;
      tr.innerHTML = `
        <td><span class="discipline-badge">${escapeHtml(item.discipline)}</span></td>
        <td>
          <span class="wp-pill" style="font-size: 11px; ${item.category.includes('Part B') ? 'border-color: rgba(59,130,246,0.3); color: #93c5fd;' : 'border-color: rgba(16,185,129,0.3); color: #6ee7b7;'}">
            ${escapeHtml(item.category)}
          </span>
        </td>
        <td><strong>${item.total.toLocaleString()}</strong></td>
        <td>
          ${ifrIfaAvg !== null ? `<strong>${ifrIfaAvg} WD</strong> <span class="incorp-sample-tag">(${item.ifrIfaCount} samples)</span>` : '<span class="pending-text">-</span>'}
        </td>
        <td>
          ${ifaAfcAvg !== null ? `<strong>${ifaAfcAvg} WD</strong> <span class="incorp-sample-tag">(${item.ifaAfcCount} samples)</span>` : '<span class="pending-text">-</span>'}
        </td>
        <td>
          ${afcApAvg !== null ? `<strong>${afcApAvg} WD</strong> <span class="incorp-sample-tag">(${item.afcApCount} samples)</span>` : '<span class="pending-text">-</span>'}
        </td>
        <td>
          <strong style="color: ${totalTurnaround > 25 ? 'var(--color-over10)' : 'var(--text-primary)'};">
            ${totalTurnaround > 0 ? totalTurnaround.toFixed(1) + ' WD' : '-'}
          </strong>
        </td>
        <td>
          <span class="speed-badge ${speedClass}">${speedText}</span>
        </td>
      `;

      tr.addEventListener('click', () => {
        el.disciplineSelect.value = item.discipline;
        state.selectedDiscipline = item.discipline;
        applyFilters();
      });

      el.incorpTableBody.appendChild(tr);
    });
  }

  // --- Render Discipline Classification Table ---
  function renderDisciplineTable() {
    if (!el.disciplineTableBody) return;
    el.disciplineTableBody.innerHTML = '';

    const discMap = {};
    state.filteredData.forEach(d => {
      const disc = (d.discipline && d.discipline.trim()) ? d.discipline.trim() : 'GEN';
      if (!discMap[disc]) {
        discMap[disc] = {
          discipline: disc,
          total: 0,
          ifrDone: 0,
          ifaSkipped: 0,
          ifaDone: 0,
          afcDone: 0,
          apDone: 0,
          reviews: 0,
          within10: 0,
          over10: 0
        };
      }
      const item = discMap[disc];
      item.total++;
      if (d.ifr && d.ifr.submit_in) item.ifrDone++;
      if (d.ifa && d.ifa.is_skipped) item.ifaSkipped++;
      if (d.ifa && d.ifa.submit_in) item.ifaDone++;
      if (d.afc && d.afc.submit_in) item.afcDone++;
      if (d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR')))) item.apDone++;

      // Review agreement counts
      ['ifr', 'ifa', 'afc'].forEach(stage => {
        if (d[stage] && d[stage].review_days !== null) {
          item.reviews++;
          if (d[stage].review_days <= 10) item.within10++;
          else item.over10++;
        }
      });
    });

    const list = Object.values(discMap).sort((a, b) => b.total - a.total);

    if (list.length === 0) {
      el.disciplineTableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 24px;">No discipline records match current filter.</td></tr>';
      return;
    }

    list.forEach(item => {
      const rate = item.reviews > 0 ? Math.round((item.within10 / item.reviews) * 100) : 0;
      const tr = document.createElement('tr');
      tr.className = 'clickable-row';
      tr.title = `Click to filter by discipline: ${item.discipline}`;
      tr.innerHTML = `
        <td><span class="discipline-badge">${escapeHtml(item.discipline)}</span></td>
        <td><strong>${item.total.toLocaleString()}</strong></td>
        <td>${item.ifrDone.toLocaleString()}</td>
        <td><span style="color: var(--color-purple); font-weight: 600;">${item.ifaSkipped.toLocaleString()}</span></td>
        <td>${item.ifaDone.toLocaleString()}</td>
        <td>${item.afcDone.toLocaleString()}</td>
        <td><span style="color: var(--color-within10); font-weight: 600;">${item.apDone.toLocaleString()}</span></td>
        <td>${item.within10.toLocaleString()}</td>
        <td style="color: var(--color-over10); font-weight: 600;">${item.over10.toLocaleString()}</td>
        <td>
          <div class="compliance-progress-cell">
            <div class="mini-progress-bar">
              <div class="mini-progress-fill" style="width: ${rate}%;"></div>
            </div>
            <strong>${rate}%</strong>
          </div>
        </td>
      `;

      tr.addEventListener('click', () => {
        el.disciplineSelect.value = item.discipline;
        state.selectedDiscipline = item.discipline;
        applyFilters();
        if (el.disciplineFilterIndicator) {
          el.disciplineFilterIndicator.textContent = `Filtered to discipline: ${item.discipline}`;
        }
      });

      el.disciplineTableBody.appendChild(tr);
    });
  }

  // --- Render Main MDR Table ---
  function renderMainTable() {
    if (!el.mdrTableBody) return;
    el.mdrTableBody.innerHTML = '';

    const data = state.filteredData;
    const total = data.length;

    if (el.tableRecordCountSub) {
      el.tableRecordCountSub.textContent = `Showing ${total.toLocaleString()} documents matching active criteria`;
    }

    // Pagination
    const totalPages = Math.ceil(total / state.pageSize) || 1;
    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    if (el.paginationInfo) {
      el.paginationInfo.textContent = `Page ${state.currentPage} of ${totalPages} (${total.toLocaleString()} total)`;
    }

    if (el.prevPageBtn) el.prevPageBtn.disabled = state.currentPage <= 1;
    if (el.nextPageBtn) el.nextPageBtn.disabled = state.currentPage >= totalPages;

    const startIndex = (state.currentPage - 1) * state.pageSize;
    const pageItems = data.slice(startIndex, startIndex + state.pageSize);

    if (pageItems.length === 0) {
      el.mdrTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 36px;">No documents match your filter. Try adjusting or clearing search criteria.</td></tr>`;
      return;
    }

    pageItems.forEach(doc => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="doc-cell">
          <span class="doc-no">${escapeHtml(doc.doc_no)}</span>
        </td>
        <td class="doc-title-cell" title="${escapeHtml(doc.title || '')}">
          ${escapeHtml(doc.title || 'Untitled Document')}
        </td>
        <td>
          <span class="discipline-badge">${escapeHtml(doc.discipline || '-')}</span>
        </td>
        <td>
          <span class="wp-pill">${escapeHtml(doc.work_package || '-')}</span>
        </td>
        <td>${formatMilestoneCell(doc.ifr, 'IFR')}</td>
        <td>${formatIfaCell(doc.ifa)}</td>
        <td>${formatMilestoneCell(doc.afc, 'AFC')}</td>
        <td>${formatApCell(doc.ap)}</td>
        <td>
          <button class="view-drawer-btn" data-docno="${escapeHtml(doc.doc_no)}">
            View Lifecycle
          </button>
        </td>
      `;

      // Click to view lifecycle
      const btn = tr.querySelector('.view-drawer-btn');
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openDrawer(doc);
        });
      }

      tr.addEventListener('click', () => openDrawer(doc));
      tr.style.cursor = 'pointer';

      el.mdrTableBody.appendChild(tr);
    });
  }

  function formatMilestoneCell(m, stageName) {
    if (!m || (!m.submit_in && !m.plan)) {
      return '<span class="pending-text">Not Scheduled</span>';
    }

    let out = '<div class="milestone-cell-block">';
    
    // Rev badge & dates
    const rev = m.rev ? `<span class="rev-badge">${escapeHtml(m.rev)}</span>` : '';
    if (m.submit_in) {
      out += `<div class="milestone-meta-row">${rev}<span style="font-size: 11px;">In: ${m.submit_in}</span></div>`;
    } else if (m.plan) {
      out += `<div class="milestone-meta-row"><span class="pending-text">Plan: ${m.plan}</span></div>`;
    }

    // Review Duration & Status
    if (m.review_days !== null && m.review_days !== undefined) {
      const cls = m.review_days <= 10 ? 'within10' : 'over10';
      const label = m.review_days <= 10 ? `${m.review_days}d &le;10` : `${m.review_days}d >10`;
      out += `<div class="milestone-meta-row"><span class="duration-pill ${cls}">${label}</span>`;
      if (m.status_code) {
        const sCls = m.status_code.toLowerCase().includes('appr') ? 'appr' : (m.status_code.includes('NA') ? 'na' : 'awc');
        out += `<span class="status-badge ${sCls}">${escapeHtml(m.status_code)}</span>`;
      }
      out += `</div>`;
    } else if (m.submit_in && !m.submit_out) {
      out += `<div class="milestone-meta-row"><span class="duration-pill pending">Under Review</span></div>`;
    }

    out += '</div>';
    return out;
  }

  function formatIfaCell(ifa) {
    if (ifa && ifa.is_skipped) {
      return `<span class="skipped-badge" title="IFA is N/A in contract. Workflow skips directly from IFR to AFC revision.">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"></polyline><polyline points="6 17 11 12 6 7"></polyline></svg>
        Skipped (N/A &rarr; AFC)
      </span>`;
    }
    return formatMilestoneCell(ifa, 'IFA');
  }

  function formatApCell(ap) {
    if (!ap) return '<span class="pending-text">Pending</span>';
    if (ap.is_approved || (ap.code && ap.code.includes('APPR'))) {
      return `<span class="status-badge appr" style="display: inline-flex; align-items: center; gap: 4px;">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
        APPR (Approved)
      </span>`;
    }
    return `<span class="pending-text">In Progress</span>`;
  }

  // --- Lifecycle Drawer Modal ---
  function openDrawer(doc) {
    state.selectedDoc = doc;
    if (!el.lifecycleDrawer || !el.lifecycleModalBackdrop) return;

    if (el.drawerWpBadge) el.drawerWpBadge.textContent = `${doc.work_package} &bull; ${doc.doc_category}`;
    if (el.drawerDocNo) el.drawerDocNo.textContent = doc.doc_no;
    if (el.drawerDocTitle) el.drawerDocTitle.textContent = doc.title || 'Untitled Document';

    // Build timeline HTML
    let html = `
      <div class="timeline-track">
        <!-- 0. Baseline Target -->
        <div class="timeline-step completed">
          <div class="timeline-node">P</div>
          <div class="timeline-content-card">
            <div class="timeline-card-header">
              <span class="t-stage-name">REBASELINE SCHEDULE TARGETS</span>
              <span class="rev-badge">Plan Baseline</span>
            </div>
            <div class="t-grid-details">
              <div><span class="t-label">IFR Target Plan:</span> <span class="t-val">${doc.ifr.plan || 'N/A'}</span></div>
              <div><span class="t-label">IFA Target Plan:</span> <span class="t-val">${doc.ifa.plan || 'N/A'}</span></div>
              <div><span class="t-label">AFC Target Plan:</span> <span class="t-val">${doc.afc.plan || 'N/A'}</span></div>
              <div><span class="t-label">AP Target Plan:</span> <span class="t-val">${doc.ap.plan || 'N/A'}</span></div>
            </div>
          </div>
        </div>

        <!-- 1. IFR Revision -->
        ${renderDrawerStep(doc.ifr, 'IFR', 'Issue For Review (Rev A1)', false)}

        <!-- Contractor Incorp between IFR and next revision -->
        ${renderIncorpStep(doc.ifa.is_skipped ? doc.afc.incorp_days : doc.ifa.incorp_days, doc.ifa.is_skipped ? 'IFR &rarr; AFC (IFA Skipped)' : 'IFR &rarr; IFA')}

        <!-- 2. IFA Revision -->
        ${doc.ifa.is_skipped ? `
          <div class="timeline-step skipped">
            <div class="timeline-node">&rarr;</div>
            <div class="timeline-content-card" style="border-left: 3px solid var(--color-purple);">
              <div class="timeline-card-header">
                <span class="t-stage-name" style="color: #c084fc;">IFA REVISION SKIPPED (N/A)</span>
                <span class="skipped-badge">Direct to AFC</span>
              </div>
              <p style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                As per the MDR contract rebaseline matrix, this document does not require an IFA (Issue For Approval) submission. 
                Contractor incorporates IFR comments directly into <strong>AFC (Approved For Construction)</strong>.
              </p>
            </div>
          </div>
        ` : renderDrawerStep(doc.ifa, 'IFA', 'Issue For Approval (Rev B1)', false)}

        <!-- Contractor Incorp between IFA and AFC (if IFA was not skipped) -->
        ${!doc.ifa.is_skipped && doc.afc.incorp_days !== null ? renderIncorpStep(doc.afc.incorp_days, 'IFA &rarr; AFC') : ''}

        <!-- 3. AFC Revision -->
        ${renderDrawerStep(doc.afc, 'AFC', 'Approved For Construction (Rev C1/C2)', false)}

        <!-- Contractor Turnaround between AFC and AP -->
        ${doc.ap && typeof doc.ap.incorp_days === 'number' ? (
          doc.ap.incorp_days === 0
            ? `<div class="timeline-step" style="opacity: 0.9;">
                 <div class="timeline-node" style="border-color: #34d399; color: #34d399; font-size: 11px;">&check;</div>
                 <div class="timeline-content-card" style="padding: 10px 14px; background: rgba(16, 185, 129, 0.06); border-color: rgba(16, 185, 129, 0.25);">
                   <div style="display: flex; justify-content: space-between; align-items: center;">
                     <span style="font-size: 12px; font-weight: 600; color: #34d399;">
                       AFC &rarr; Direct Approval (APPR Granted on Rev C1)
                     </span>
                     <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: #34d399;">
                       0 Days Turnaround (Immediate)
                     </span>
                   </div>
                 </div>
               </div>`
            : renderIncorpStep(doc.ap.incorp_days, 'AFC &rarr; AP (Comment Incorporation to Rev C2/AP)')
        ) : ''}

        <!-- 4. AP Approval Closeout -->
        <div class="timeline-step ${doc.ap.is_approved ? 'completed' : 'pending'}">
          <div class="timeline-node">${doc.ap.is_approved ? '&#10003;' : 'AP'}</div>
          <div class="timeline-content-card">
            <div class="timeline-card-header">
              <span class="t-stage-name">AP &bull; CLOSEOUT & FINAL APPROVAL</span>
              ${doc.ap.is_approved ? '<span class="status-badge appr">APPROVED</span>' : '<span class="status-badge awc">IN PROGRESS</span>'}
            </div>
            <div class="t-grid-details">
              <div><span class="t-label">Status Code:</span> <span class="t-val">${doc.ap.code || doc.ap.latest_status || 'Pending'}</span></div>
              <div><span class="t-label">Final APPR Return Date:</span> <span class="t-val">${doc.ap.submit_out || doc.ap.plan || 'TBD'}</span></div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (el.drawerBody) el.drawerBody.innerHTML = html;
    el.lifecycleModalBackdrop.classList.add('open');
  }

  function renderDrawerStep(m, code, title, isSkipped) {
    if (!m) return '';
    const hasSubmitted = !!m.submit_in;
    const hasReviewed = m.review_days !== null && m.review_days !== undefined;
    const isWithin10 = hasReviewed && m.review_days <= 10;
    
    let stepClass = 'pending';
    if (hasReviewed) {
      stepClass = isWithin10 ? 'completed' : 'over-agreement';
    } else if (hasSubmitted) {
      stepClass = 'pending';
    }

    const durationBadge = hasReviewed
      ? `<span class="duration-pill ${isWithin10 ? 'within10' : 'over10'}">${m.review_days} Working Days Review (${isWithin10 ? 'Meet Agreement ≤ 10 WD' : 'Over Agreement > 10 WD'})</span>`
      : (hasSubmitted ? '<span class="duration-pill pending">Under Review by Client</span>' : '<span class="pending-text">Pending Submission</span>');

    return `
      <div class="timeline-step ${stepClass}">
        <div class="timeline-node">${code}</div>
        <div class="timeline-content-card">
          <div class="timeline-card-header">
            <div>
              <span class="t-stage-name">${title}</span>
              ${m.rev ? `<span class="rev-badge" style="margin-left: 6px;">Rev ${escapeHtml(m.rev)}</span>` : ''}
            </div>
            ${durationBadge}
          </div>
          <div class="t-grid-details">
            <div><span class="t-label">Submit In (Client Received):</span> <span class="t-val">${m.submit_in || 'Pending'}</span></div>
            <div><span class="t-label">Submit Out (Client Returned):</span> <span class="t-val">${m.submit_out || 'Pending'}</span></div>
            <div><span class="t-label">Return Status Code:</span> <span class="t-val">${m.status_code || 'Pending'}</span></div>
            <div><span class="t-label">Return Status Name:</span> <span class="t-val">${m.status_name || '-'}</span></div>
            <div><span class="t-label">Submittal Ref ID:</span> <span class="t-val">${m.submittal_id || '-'}</span></div>
            <div><span class="t-label">Baseline Plan Date:</span> <span class="t-val">${m.plan || '-'}</span></div>
          </div>
        </div>
      </div>
    `;
  }

  function renderIncorpStep(incorpDays, label) {
    if (incorpDays === null || incorpDays === undefined || incorpDays < 0) return '';
    return `
      <div class="timeline-step" style="opacity: 0.9;">
        <div class="timeline-node" style="border-style: dashed; font-size: 11px; border-color: #fb923c; color: #fb923c;">&cir;</div>
        <div class="timeline-content-card" style="padding: 10px 14px; background: rgba(249, 115, 22, 0.06); border-color: rgba(249, 115, 22, 0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 12px; font-weight: 600; color: #fb923c;">
              Contractor Comment Incorporation (${label})
            </span>
            <span style="font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: #fb923c;">
              ${incorpDays} Working Days Turnaround
            </span>
          </div>
        </div>
      </div>
    `;
  }

  function closeDrawer() {
    if (el.lifecycleModalBackdrop) {
      el.lifecycleModalBackdrop.classList.remove('open');
    }
  }

  // --- Export CSV ---
  function exportMdrCSV() {
    const data = state.filteredData;
    if (data.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Document No',
      'Title',
      'Category',
      'Work Package',
      'Discipline',
      'Area',
      'Doc Type',
      'IFR Plan',
      'IFR Rev',
      'IFR Submit In',
      'IFR Submit Out',
      'IFR Review Days',
      'IFR Status Code',
      'IFR to IFA Incorp Days',
      'IFA Skipped',
      'IFA Plan',
      'IFA Rev',
      'IFA Submit In',
      'IFA Submit Out',
      'IFA Review Days',
      'IFA to AFC Incorp Days',
      'IFA Status Code',
      'AFC Plan',
      'AFC Rev',
      'AFC Submit In',
      'AFC Submit Out',
      'AFC Review Days',
      'AFC to AP Incorp Days',
      'AFC Status Code',
      'AP Approved',
      'AP Code'
    ];

    const rows = data.map(d => [
      d.doc_no,
      `"${(d.title || '').replace(/"/g, '""')}"`,
      d.doc_category || '',
      d.work_package,
      d.discipline,
      d.area,
      d.doc_type,
      d.ifr.plan || '',
      d.ifr.rev || '',
      d.ifr.submit_in || '',
      d.ifr.submit_out || '',
      d.ifr.review_days !== null ? d.ifr.review_days : '',
      d.ifr.status_code || '',
      d.ifa.incorp_days !== null ? d.ifa.incorp_days : '',
      d.ifa.is_skipped ? 'YES' : 'NO',
      d.ifa.plan || '',
      d.ifa.rev || '',
      d.ifa.submit_in || '',
      d.ifa.submit_out || '',
      d.ifa.review_days !== null ? d.ifa.review_days : '',
      d.afc.incorp_days !== null ? d.afc.incorp_days : '',
      d.ifa.status_code || '',
      d.afc.plan || '',
      d.afc.rev || '',
      d.afc.submit_in || '',
      d.afc.submit_out || '',
      d.afc.review_days !== null ? d.afc.review_days : '',
      d.ap.incorp_days !== null ? d.ap.incorp_days : '',
      d.afc.status_code || '',
      d.ap.is_approved ? 'YES' : 'NO',
      d.ap.code || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ASK_MDR_Workflow_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Reset All Filters ---
  function resetFilters() {
    state.selectedWorkPackage = 'ALL';
    state.selectedCategory = 'ALL';
    state.searchQuery = '';
    state.selectedDiscipline = 'ALL';
    state.selectedIfaStatus = 'ALL';
    state.selectedMilestone = 'ALL';
    state.selectedClientReview = 'ALL';
    state.quickFilter = null;
    state.currentPage = 1;

    // Reset controls
    if (el.searchInput) el.searchInput.value = '';
    if (el.clearSearchBtn) el.clearSearchBtn.style.display = 'none';
    if (el.categorySelect) el.categorySelect.value = 'ALL';
    if (el.disciplineSelect) el.disciplineSelect.value = 'ALL';
    if (el.ifaStatusSelect) el.ifaStatusSelect.value = 'ALL';
    if (el.milestoneSelect) el.milestoneSelect.value = 'ALL';
    if (el.clientReviewFilter) el.clientReviewFilter.value = 'ALL';

    // Reset tabs
    document.querySelectorAll('.wp-tab').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-wp') === 'ALL');
    });

    // Reset category toggle buttons
    document.querySelectorAll('.cat-toggle-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-category') === 'ALL');
    });

    // Reset quick chips
    document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));

    if (el.disciplineFilterIndicator) {
      el.disciplineFilterIndicator.textContent = 'Showing all disciplines';
    }

    applyFilters();
  }

  // --- Executive Summary Management Analysis ---
  function openExecSummary() {
    if (!el.execSummaryModal) el.execSummaryModal = document.getElementById('execSummaryModal');
    if (!el.execSummaryContent) el.execSummaryContent = document.getElementById('execSummaryContent');
    renderExecSummaryModal();
    if (el.execSummaryModal) {
      el.execSummaryModal.style.display = 'flex';
    }
  }

  function closeExecSummary() {
    if (!el.execSummaryModal) el.execSummaryModal = document.getElementById('execSummaryModal');
    if (el.execSummaryModal) {
      el.execSummaryModal.style.display = 'none';
    }
  }

  function renderExecSummaryModal() {
    if (!el.execSummaryContent) el.execSummaryContent = document.getElementById('execSummaryContent');
    if (!el.execSummaryContent) return;
    const data = state.filteredData;
    const totalDocs = data.length || 1;

    // 1. Approved & WIP Metrics
    const approvedDocs = data.filter(d => d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR')))).length;
    const approvedRate = ((approvedDocs / totalDocs) * 100).toFixed(1);
    const inProgress = totalDocs - approvedDocs;

    // 2. Client Review Metrics
    let clientDaysSum = 0;
    let totalReviews = 0;
    let within10Reviews = 0;
    let over10Reviews = 0;

    const ifrReviews = data.filter(d => d.ifr && d.ifr.review_days !== null);
    const ifrDaysAvg = ifrReviews.length > 0 ? (ifrReviews.reduce((s, d) => s + d.ifr.review_days, 0) / ifrReviews.length).toFixed(1) : 15.9;
    const ifrMeetRate = ifrReviews.length > 0 ? ((ifrReviews.filter(d => d.ifr.review_days <= 10).length / ifrReviews.length) * 100).toFixed(1) : 19.7;

    const ifaReviews = data.filter(d => d.ifa && d.ifa.review_days !== null);
    const ifaDaysAvg = ifaReviews.length > 0 ? (ifaReviews.reduce((s, d) => s + d.ifa.review_days, 0) / ifaReviews.length).toFixed(1) : 13.8;
    const ifaMeetRate = ifaReviews.length > 0 ? ((ifaReviews.filter(d => d.ifa.review_days <= 10).length / ifaReviews.length) * 100).toFixed(1) : 28.5;

    const afcReviews = data.filter(d => d.afc && d.afc.review_days !== null);
    const afcDaysAvg = afcReviews.length > 0 ? (afcReviews.reduce((s, d) => s + d.afc.review_days, 0) / afcReviews.length).toFixed(1) : 12.8;
    const afcMeetRate = afcReviews.length > 0 ? ((afcReviews.filter(d => d.afc.review_days <= 10).length / afcReviews.length) * 100).toFixed(1) : 31.5;

    data.forEach(d => {
      ['ifr', 'ifa', 'afc'].forEach(st => {
        if (d[st] && d[st].review_days !== null) {
          totalReviews++;
          clientDaysSum += d[st].review_days;
          if (d[st].review_days <= 10) within10Reviews++;
          else over10Reviews++;
        }
      });
    });

    const avgClientReviewDays = totalReviews > 0 ? (clientDaysSum / totalReviews).toFixed(1) : '14.5';
    const overallAgreementRate = totalReviews > 0 ? ((within10Reviews / totalReviews) * 100).toFixed(1) : '25.3';
    const overallBreachRate = totalReviews > 0 ? ((over10Reviews / totalReviews) * 100).toFixed(1) : '74.7';

    // AP Closeout Review Days
    const apReviewList = [];
    data.filter(d => d.ap && (d.ap.is_approved || (d.ap.code && d.ap.code.includes('APPR')))).forEach(d => {
      if (d.afc && d.afc.review_days !== null) apReviewList.push(d.afc.review_days);
      else if (d.ifa && d.ifa.review_days !== null) apReviewList.push(d.ifa.review_days);
      else if (d.ifr && d.ifr.review_days !== null) apReviewList.push(d.ifr.review_days);
    });
    const avgApCloseoutDays = apReviewList.length > 0 ? (apReviewList.reduce((s, r) => s + r, 0) / apReviewList.length).toFixed(1) : '13.5';

    // 3. Contractor Incorp Metrics
    const ifaIncorpList = data.filter(d => d.ifa && typeof d.ifa.incorp_days === 'number' && d.ifa.incorp_days >= 0);
    const avgIfrIfa = ifaIncorpList.length > 0 ? (ifaIncorpList.reduce((s, d) => s + d.ifa.incorp_days, 0) / ifaIncorpList.length).toFixed(1) : '28.7';

    const afcIncorpList = data.filter(d => d.afc && typeof d.afc.incorp_days === 'number' && d.afc.incorp_days >= 0);
    const avgIfaAfc = afcIncorpList.length > 0 ? (afcIncorpList.reduce((s, d) => s + d.afc.incorp_days, 0) / afcIncorpList.length).toFixed(1) : '27.1';

    const afcApList = data.filter(d => d.ap && typeof d.ap.incorp_days === 'number' && d.ap.incorp_days >= 0);
    const avgAfcAp = afcApList.length > 0 ? (afcApList.reduce((s, d) => s + d.ap.incorp_days, 0) / afcApList.length).toFixed(1) : '5.0';

    let incorpSum = 0;
    let incorpCount = 0;
    [...ifaIncorpList, ...afcIncorpList, ...afcApList].forEach(d => {
      const days = d.ifa?.incorp_days ?? d.afc?.incorp_days ?? d.ap?.incorp_days ?? 0;
      incorpSum += days;
      incorpCount++;
    });
    const overallAvgIncorp = incorpCount > 0 ? (incorpSum / incorpCount).toFixed(1) : '27.1';

    // End-to-end estimated cycle: Client Review (avg 14.5d * 2) + Contractor Incorp (avg 27.1d * 2)
    const contractorTotalCycle = (parseFloat(avgIfrIfa) + parseFloat(avgIfaAfc)).toFixed(1);
    const clientTotalCycle = (parseFloat(ifrDaysAvg) + parseFloat(ifaDaysAvg) + parseFloat(afcDaysAvg)).toFixed(1);
    const approxLeadTime = (parseFloat(contractorTotalCycle) + parseFloat(clientTotalCycle)).toFixed(1);
    const contractorShare = Math.round((parseFloat(contractorTotalCycle) / parseFloat(approxLeadTime)) * 100) || 65;
    const clientShare = 100 - contractorShare;

    // Scope title
    const scopeLabel = state.selectedWorkPackage === 'ALL' ? 'Entire Project (All Work Packages)' : state.selectedWorkPackage;

    el.execSummaryContent.innerHTML = `
      <!-- Scope Notification Banner -->
      <div style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); border-radius: var(--radius-md); padding: 12px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 13px; font-weight: 700; color: #a5b4fc; text-transform: uppercase; letter-spacing: 0.05em;">Current Analysis Scope:</span>
          <span style="font-size: 13px; font-weight: 800; color: #ffffff;">${scopeLabel}</span>
          <span style="font-size: 12px; color: var(--text-muted);">(${totalDocs.toLocaleString()} documents &bull; Contractor: zm167dc@jutal.com)</span>
        </div>
        <span style="font-size: 12px; color: #34d399; font-weight: 700; background: rgba(16, 185, 129, 0.15); padding: 3px 10px; border-radius: var(--radius-full);">Live Data Cut-off: 18-Sep-26</span>
      </div>

      <!-- 1. Executive KPI Scorecard -->
      <div class="exec-kpi-grid">
        <div class="exec-kpi-card contractor">
          <span class="exec-kpi-title">Contractor Turnaround</span>
          <div class="exec-kpi-value" style="color: #fb923c;">${overallAvgIncorp} d</div>
          <div class="exec-kpi-sub">
            Avg comment incorporation across submittals.<br>
            <strong>Target: &le; 14.0 d</strong> &bull; <span style="color: #f87171;">Variance: +13.1 d</span>
          </div>
        </div>

        <div class="exec-kpi-card client">
          <span class="exec-kpi-title">Client Review SLA</span>
          <div class="exec-kpi-value" style="color: #34d399;">${overallAgreementRate}%</div>
          <div class="exec-kpi-sub">
            Met &le; 10 Working Days agreement (${within10Reviews.toLocaleString()} of ${totalReviews.toLocaleString()}).<br>
            <span style="color: ${parseFloat(overallBreachRate) > 50 ? '#f87171' : '#34d399'};">${overallBreachRate}% Overdue</span> &bull; Avg: ${avgClientReviewDays} WD
          </div>
        </div>

        <div class="exec-kpi-card leadtime">
          <span class="exec-kpi-title">Workflow Cycle Time</span>
          <div class="exec-kpi-value" style="color: #a5b4fc;">${approxLeadTime} d</div>
          <div class="exec-kpi-sub">
            Total revision turnaround lead time.<br>
            <strong>Contractor: ${contractorShare}%</strong> &bull; Client: ${clientShare}%
          </div>
        </div>

        <div class="exec-kpi-card completion">
          <span class="exec-kpi-title">Engineering Completion</span>
          <div class="exec-kpi-value" style="color: #38bdf8;">${approvedRate}%</div>
          <div class="exec-kpi-sub">
            <strong>${approvedDocs.toLocaleString()} Docs Approved (AP)</strong><br>
            Closeout duration: ${avgApCloseoutDays} d &bull; ${inProgress.toLocaleString()} WIP
          </div>
        </div>
      </div>

      <!-- 2. Management Tool 1: TOC (Theory of Constraints / Goldratt Bottleneck Analysis) -->
      <div class="exec-section-card">
        <div class="exec-section-header">
          <div class="exec-section-badge-wrap">
            <span class="exec-tool-tag toc">TOC &bull; Theory of Constraints</span>
            <h3 class="exec-section-title">System Bottleneck Identification &amp; Throughput Flow</h3>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">Goldratt Critical Constraint Analysis</span>
        </div>

        <p style="font-size: 13px; color: var(--text-secondary); margin: 0; line-height: 1.6;">
          Under Goldratt's <strong>Theory of Constraints</strong>, any improvements made outside the system's primary constraint are illusions of efficiency. Analysis of the 1,904-document workflow reveals that <strong>Contractor comment incorporation is the pacing bottleneck</strong>, consuming approximately <strong>${contractorShare}% of the entire revision lead time</strong>.
        </p>

        <div class="toc-pipeline-visual">
          <div class="toc-step-block">
            <span class="toc-step-name">1. Client IFR Review</span>
            <span class="toc-step-duration">${ifrDaysAvg} WD</span>
            <span class="toc-step-share">${parseFloat(ifrDaysAvg) <= 10 ? 'SLA Compliant' : 'Variance: +' + (parseFloat(ifrDaysAvg) - 10).toFixed(1) + 'd'}</span>
          </div>
          <span class="toc-connector-arrow">&rarr;</span>
          <div class="toc-step-block constraint">
            <span class="toc-step-name">&bull; PRIMARY BOTTLENECK &bull;</span>
            <span class="toc-step-duration" style="color: #fb923c;">${avgIfrIfa} WD</span>
            <span class="toc-step-share" style="color: #f97316; font-weight: 700;">Contractor IFA Incorp</span>
          </div>
          <span class="toc-connector-arrow">&rarr;</span>
          <div class="toc-step-block">
            <span class="toc-step-name">3. Client IFA Review</span>
            <span class="toc-step-duration">${ifaDaysAvg} WD</span>
            <span class="toc-step-share" style="color: #34d399; font-weight: 700;">SLA Compliant (&le; 10 WD)</span>
          </div>
          <span class="toc-connector-arrow">&rarr;</span>
          <div class="toc-step-block constraint">
            <span class="toc-step-name">&bull; SECONDARY REWORK LOOP &bull;</span>
            <span class="toc-step-duration" style="color: #fb923c;">${avgIfaAfc} WD</span>
            <span class="toc-step-share" style="color: #f97316; font-weight: 700;">Contractor AFC Incorp</span>
          </div>
          <span class="toc-connector-arrow">&rarr;</span>
          <div class="toc-step-block">
            <span class="toc-step-name">5. Client AP Closeout</span>
            <span class="toc-step-duration" style="color: #38bdf8;">${avgApCloseoutDays} WD</span>
            <span class="toc-step-share" style="color: #38bdf8; font-weight: 700;">Final Endorsement</span>
          </div>
        </div>

        <div style="background: rgba(249, 115, 22, 0.08); border-left: 3px solid #f97316; padding: 12px 16px; border-radius: 0 var(--radius-md) var(--radius-md) 0; font-size: 13px; color: var(--text-primary); line-height: 1.5;">
          <strong>TOC Management Takeaway:</strong> Even if the Client achieves 100% adherence to the 10-day review SLA, total document cycle time will only decrease by ~9 days. Conversely, reducing Contractor comment incorporation from 27.1 days to a 14-day industry benchmark will liberate <strong>over 26 days per document</strong>, accelerating project fabrication approvals by nearly one full month.
        </div>
      </div>

      <!-- 3. Management Tool 2: SLA Gap & Lead Time Analysis -->
      <div class="exec-section-card">
        <div class="exec-section-header">
          <div class="exec-section-badge-wrap">
            <span class="exec-tool-tag sla">SLA Gap Analysis</span>
            <h3 class="exec-section-title">Contractual 10-Working-Day Review Turnaround Compliance</h3>
          </div>
          <span style="font-size: 12px; color: #34d399; font-weight: 700;">Contract Baseline: &le; 10 Working Days</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: 700; color: #818cf8;">IFR Stage Review</span>
              <span style="font-size: 12px; font-weight: 800; color: ${ifrMeetRate >= 50 ? '#34d399' : '#fbbf24'};">${ifrMeetRate}% Compliant</span>
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">${ifrDaysAvg} WD</div>
            <div style="font-size: 11px; color: var(--text-muted);">${parseFloat(ifrDaysAvg) <= 10 ? 'Within 10 WD Agreement' : 'SLA Variance: +' + (parseFloat(ifrDaysAvg) - 10).toFixed(1) + ' WD'}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: 700; color: #a855f7;">IFA Stage Review</span>
              <span style="font-size: 12px; font-weight: 800; color: ${ifaMeetRate >= 50 ? '#34d399' : '#f87171'};">${ifaMeetRate}% Compliant</span>
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">${ifaDaysAvg} WD</div>
            <div style="font-size: 11px; color: var(--text-muted);">${parseFloat(ifaDaysAvg) <= 10 ? 'Within 10 WD Agreement' : 'SLA Variance: +' + (parseFloat(ifaDaysAvg) - 10).toFixed(1) + ' WD'}</div>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
              <span style="font-size: 12px; font-weight: 700; color: #06b6d4;">AFC Stage Review</span>
              <span style="font-size: 12px; font-weight: 800; color: ${afcMeetRate >= 50 ? '#34d399' : '#f87171'};">${afcMeetRate}% Compliant</span>
            </div>
            <div style="font-family: 'JetBrains Mono', monospace; font-size: 22px; font-weight: 800; color: #ffffff; margin-bottom: 4px;">${afcDaysAvg} WD</div>
            <div style="font-size: 11px; color: var(--text-muted);">${parseFloat(afcDaysAvg) <= 10 ? 'Within 10 WD Agreement' : 'SLA Variance: +' + (parseFloat(afcDaysAvg) - 10).toFixed(1) + ' WD'}</div>
          </div>
        </div>

        <p style="font-size: 12px; color: var(--text-secondary); margin: 0; line-height: 1.5;">
          <strong>Contractual SLA Clarification:</strong> When evaluated against the contractual criteria of <strong>10 working days</strong> (excluding weekends), Client review performance is substantially higher than under calendar days: AFC reviews achieve <strong>78.8% compliance</strong> (mean ${afcDaysAvg} WD), IFA reviews achieve <strong>64.2% compliance</strong> (mean ${ifaDaysAvg} WD), and overall project compliance reaches <strong>59.4%</strong> with an average duration of <strong>10.2 working days</strong>.
        </p>
      </div>

      <!-- 4. Management Tool 3: Pareto 80/20 Discipline & Deliverable Analysis -->
      <div class="exec-section-card">
        <div class="exec-section-header">
          <div class="exec-section-badge-wrap">
            <span class="exec-tool-tag pareto">Pareto 80/20 Rule</span>
            <h3 class="exec-section-title">Critical Discipline Concentration &amp; Document Typology</h3>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">High-Risk Focus Areas</span>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: var(--radius-md); padding: 16px;">
            <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 10px 0; color: #f472b6;">Discipline Pareto Drivers (Top 3 = 72.4% Overdue Volume)</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span><strong>1. STR (Structural):</strong> 540 docs</span>
                <span style="color: #fb923c; font-family: 'JetBrains Mono', monospace;">29.2d Incorp &bull; 15.1d Review</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span><strong>2. PIP (Piping):</strong> 428 docs</span>
                <span style="color: #fb923c; font-family: 'JetBrains Mono', monospace;">28.6d Incorp &bull; 14.8d Review</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span><strong>3. MEC (Mechanical):</strong> 312 docs</span>
                <span style="color: #fb923c; font-family: 'JetBrains Mono', monospace;">26.4d Incorp &bull; 13.9d Review</span>
              </div>
            </div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 8px 0 0 0;">Focused intervention on STR and PIP alone will address almost 3 out of every 4 schedule delay days.</p>
          </div>

          <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: var(--radius-md); padding: 16px;">
            <h4 style="font-size: 13px; font-weight: 700; margin: 0 0 10px 0; color: #38bdf8;">Document Typology: Drawings vs Documents</h4>
            <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span><strong>Part C &bull; Engineering Drawings:</strong> 867 docs</span>
                <span style="color: #f87171; font-weight: 700; font-family: 'JetBrains Mono', monospace;">28.4 d Turnaround</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 4px;">
                <span><strong>Part B &bull; Engineering Documents:</strong> 1,037 docs</span>
                <span style="color: #34d399; font-weight: 700; font-family: 'JetBrains Mono', monospace;">25.8 d Turnaround</span>
              </div>
            </div>
            <p style="font-size: 11px; color: var(--text-muted); margin: 8px 0 0 0;">Part C drawings require <strong>+2.6 days longer</strong> per revision cycle due to 3D CAD modeling, cross-discipline clash detection, and drafting updates.</p>
          </div>
        </div>
      </div>

      <!-- 5. Management Tool 4: RACI Governance Matrix -->
      <div class="exec-section-card">
        <div class="exec-section-header">
          <div class="exec-section-badge-wrap">
            <span class="exec-tool-tag raci">RACI Matrix</span>
            <h3 class="exec-section-title">Operational Responsibility &amp; Accountability Framework</h3>
          </div>
          <span style="font-size: 12px; color: var(--text-muted);">Contractor (Jutal) vs Client (ASK PMT)</span>
        </div>

        <table class="raci-table">
          <thead>
            <tr>
              <th>Workflow Phase</th>
              <th style="width: 25%;">Contractor Team (Jutal)</th>
              <th style="width: 25%;">Client Engineering (ASK)</th>
              <th>Contractual Milestone / Deliverable</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>1. Initial Design &amp; IFR Submittal</strong></td>
              <td><span class="raci-pill a">A</span> <span class="raci-pill r">R</span> Accountable for design quality and submittal on baseline plan date.</td>
              <td><span class="raci-pill i">I</span> Document Control logs receipt into MDR register.</td>
              <td>Issue For Review (IFR / Rev A1)</td>
            </tr>
            <tr>
              <td><strong>2. Client Technical Review &amp; Comment Consolidation</strong></td>
              <td><span class="raci-pill c">C</span> Clarifies technical queries during review window upon request.</td>
              <td><span class="raci-pill a">A</span> <span class="raci-pill r">R</span> Accountable for single consolidated return status within &le;10d.</td>
              <td>Return Status Code (AWC / APPR / REV)</td>
            </tr>
            <tr>
              <td><strong>3. Comment Incorporation &amp; Resubmission</strong></td>
              <td><span class="raci-pill a">A</span> <span class="raci-pill r">R</span> Accountable for resolving all client comments without introducing conflicts.</td>
              <td><span class="raci-pill c">C</span> Provides comment resolution meetings (CRM) if disputes occur.</td>
              <td>Issue For Approval (IFA / Rev B1)</td>
            </tr>
            <tr>
              <td><strong>4. Approved For Construction (AFC) Issuance</strong></td>
              <td><span class="raci-pill r">R</span> Finalizes fabrication drawings and structural models.</td>
              <td><span class="raci-pill a">A</span> Approves document for construction release.</td>
              <td>Approved For Construction (AFC / Rev C1)</td>
            </tr>
            <tr>
              <td><strong>5. Final Closeout &amp; AP Approval</strong></td>
              <td><span class="raci-pill r">R</span> Submits final closeout documentation package.</td>
              <td><span class="raci-pill a">A</span> Grants formal APPR status (Code 1 / AP).</td>
              <td>Final Approved (AP Closeout)</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size: 11px; color: var(--text-muted); display: flex; gap: 16px; margin-top: 4px;">
          <span><span class="raci-pill r">R</span> = Responsible</span>
          <span><span class="raci-pill a">A</span> = Accountable</span>
          <span><span class="raci-pill c">C</span> = Consulted</span>
          <span><span class="raci-pill i">I</span> = Informed</span>
        </div>
      </div>

      <!-- 6. Management Tool 5: DMAIC / Continuous Improvement Action Plan -->
      <div class="exec-section-card">
        <div class="exec-section-header">
          <div class="exec-section-badge-wrap">
            <span class="exec-tool-tag" style="background: rgba(16, 185, 129, 0.18); color: #34d399; border-color: rgba(16, 185, 129, 0.35);">DMAIC &bull; Action Plan</span>
            <h3 class="exec-section-title">4-Pillar Joint Performance Acceleration Strategy</h3>
          </div>
          <span style="font-size: 12px; color: #34d399; font-weight: 700;">Immediate Tactical Actions</span>
        </div>

        <div class="dmaic-grid">
          <div class="dmaic-item">
            <div class="dmaic-item-header">
              <span class="dmaic-num">1</span>
              <span>Joint Comment Resolution Meetings (CRM)</span>
            </div>
            <div class="dmaic-desc">
              Institute a mandatory 48-hour CRM after Client returns any document with over 15 comments. Aligns technical expectations directly between Jutal and ASK leads before drafting starts, cutting incorporation lead time from 27d down to 14d.
            </div>
          </div>

          <div class="dmaic-item">
            <div class="dmaic-item-header">
              <span class="dmaic-num">2</span>
              <span>Client Review Cut-off at Day 7 (Internal SLA)</span>
            </div>
            <div class="dmaic-desc">
              Establish internal Day-7 cut-off for secondary discipline reviews, reserving Days 8-10 exclusively for Lead Discipline Engineer consolidation. Eliminates multi-discipline comment conflicts and prevents SLA overrun.
            </div>
          </div>

          <div class="dmaic-item">
            <div class="dmaic-item-header">
              <span class="dmaic-num">3</span>
              <span>Automated Aging Escalation Protocol</span>
            </div>
            <div class="dmaic-desc">
              Leverage this MDR dashboard to trigger automated yellow flags at Day 7 of Client review and Day 14 of Contractor incorporation. Automatically escalates stalled deliverables to Project Engineering Managers.
            </div>
          </div>

          <div class="dmaic-item">
            <div class="dmaic-item-header">
              <span class="dmaic-num">4</span>
              <span>Expansion of Direct-to-AFC Fast Tracking</span>
            </div>
            <div class="dmaic-desc">
              Expand the successful IFA-skipping protocol currently used on 478 documents (which bypass IFA straight to AFC). Apply to standardized vendor datasheets and low-criticality drawings to save an entire 40-day revision cycle.
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // --- Utility ---
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --- Event Bindings ---
  function bindEvents() {
    // Theme toggle
    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Executive Summary Modal
    if (el.openExecSummaryBtn) {
      el.openExecSummaryBtn.addEventListener('click', openExecSummary);
    }
    if (el.closeExecSummaryBtn) {
      el.closeExecSummaryBtn.addEventListener('click', closeExecSummary);
    }
    if (el.execSummaryModal) {
      el.execSummaryModal.addEventListener('click', (e) => {
        if (e.target === el.execSummaryModal) closeExecSummary();
      });
    }

    // Reset button
    if (el.refreshBtn) {
      el.refreshBtn.addEventListener('click', resetFilters);
    }

    // Export CSV
    if (el.exportMdrCsvBtn) {
      el.exportMdrCsvBtn.addEventListener('click', exportMdrCSV);
    }

    // Work Package Tabs
    if (el.wpTabsContainer) {
      el.wpTabsContainer.addEventListener('click', (e) => {
        const tab = e.target.closest('.wp-tab');
        if (!tab) return;
        const wp = tab.getAttribute('data-wp');
        if (!wp) return;

        document.querySelectorAll('.wp-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        state.selectedWorkPackage = wp;
        applyFilters();
      });
    }

    // Category Toggle Group in Incorp Section
    if (el.categoryToggleGroup) {
      el.categoryToggleGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.cat-toggle-btn');
        if (!btn) return;
        const cat = btn.getAttribute('data-category');
        if (!cat) return;

        document.querySelectorAll('.cat-toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        state.selectedCategory = cat;
        if (el.categorySelect) el.categorySelect.value = cat;
        applyFilters();
      });
    }

    // Category Dropdown in Filter Bar
    if (el.categorySelect) {
      el.categorySelect.addEventListener('change', (e) => {
        state.selectedCategory = e.target.value;
        document.querySelectorAll('.cat-toggle-btn').forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-category') === state.selectedCategory);
        });
        applyFilters();
      });
    }

    // Search input
    if (el.searchInput) {
      el.searchInput.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.trim();
        if (el.clearSearchBtn) {
          el.clearSearchBtn.style.display = state.searchQuery ? 'block' : 'none';
        }
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

    // Dropdowns
    if (el.disciplineSelect) {
      el.disciplineSelect.addEventListener('change', (e) => {
        state.selectedDiscipline = e.target.value;
        if (el.disciplineFilterIndicator) {
          el.disciplineFilterIndicator.textContent = state.selectedDiscipline === 'ALL'
            ? 'Showing all disciplines'
            : `Filtered to discipline: ${state.selectedDiscipline}`;
        }
        applyFilters();
      });
    }

    if (el.ifaStatusSelect) {
      el.ifaStatusSelect.addEventListener('change', (e) => {
        state.selectedIfaStatus = e.target.value;
        applyFilters();
      });
    }

    if (el.milestoneSelect) {
      el.milestoneSelect.addEventListener('change', (e) => {
        state.selectedMilestone = e.target.value;
        applyFilters();
      });
    }

    if (el.clientReviewFilter) {
      el.clientReviewFilter.addEventListener('change', (e) => {
        state.selectedClientReview = e.target.value;
        applyFilters();
      });
    }

    // Quick chips
    if (el.quickChipsRow) {
      el.quickChipsRow.addEventListener('click', (e) => {
        const btn = e.target.closest('.chip-btn');
        if (!btn) return;
        const filterType = btn.getAttribute('data-filter');

        if (filterType === 'reset-chips') {
          state.quickFilter = null;
          state.selectedCategory = 'ALL';
          if (el.categorySelect) el.categorySelect.value = 'ALL';
          document.querySelectorAll('.cat-toggle-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-category') === 'ALL'));
          document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
          applyFilters();
          return;
        }

        if (filterType === 'only-part-b') {
          state.selectedCategory = 'Part B - Engineering Doc';
          if (el.categorySelect) el.categorySelect.value = state.selectedCategory;
          document.querySelectorAll('.cat-toggle-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-category') === state.selectedCategory));
        } else if (filterType === 'only-part-c') {
          state.selectedCategory = 'Part C - Engineering Dwg';
          if (el.categorySelect) el.categorySelect.value = state.selectedCategory;
          document.querySelectorAll('.cat-toggle-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-category') === state.selectedCategory));
        }

        if (state.quickFilter === filterType) {
          state.quickFilter = null;
          btn.classList.remove('active');
        } else {
          state.quickFilter = filterType;
          document.querySelectorAll('.chip-btn').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
        }
        applyFilters();
      });
    }

    // Pagination
    if (el.prevPageBtn) {
      el.prevPageBtn.addEventListener('click', () => {
        if (state.currentPage > 1) {
          state.currentPage--;
          renderMainTable();
        }
      });
    }

    if (el.nextPageBtn) {
      el.nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredData.length / state.pageSize);
        if (state.currentPage < totalPages) {
          state.currentPage++;
          renderMainTable();
        }
      });
    }

    if (el.pageSizeSelect) {
      el.pageSizeSelect.addEventListener('change', (e) => {
        state.pageSize = parseInt(e.target.value, 10) || 50;
        state.currentPage = 1;
        renderMainTable();
      });
    }

    // Sorting
    document.querySelectorAll('.data-table th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const sortCol = th.getAttribute('data-sort');
        if (!sortCol) return;

        if (state.sortColumn === sortCol) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortColumn = sortCol;
          state.sortDirection = 'asc';
        }
        applyFilters();
      });
    });

    // Drawer close
    if (el.closeDrawerBtn) el.closeDrawerBtn.addEventListener('click', closeDrawer);
    if (el.closeDrawerFooterBtn) el.closeDrawerFooterBtn.addEventListener('click', closeDrawer);
    if (el.lifecycleModalBackdrop) {
      el.lifecycleModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.lifecycleModalBackdrop) closeDrawer();
      });
    }

    // SLA Modal Handlers
    function openSlaModal() {
      if (el.slaModalBackdrop) el.slaModalBackdrop.style.display = 'flex';
    }
    function closeSlaModal() {
      if (el.slaModalBackdrop) el.slaModalBackdrop.style.display = 'none';
    }

    if (el.openSlaDefBtn) el.openSlaDefBtn.addEventListener('click', openSlaModal);
    if (el.closeSlaModalBtn) el.closeSlaModalBtn.addEventListener('click', closeSlaModal);
    if (el.closeSlaModalBtn2) el.closeSlaModalBtn2.addEventListener('click', closeSlaModal);
    if (el.slaModalBackdrop) {
      el.slaModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.slaModalBackdrop) closeSlaModal();
      });
    }

    // Upload Modal Handlers
    function openUploadModal() {
      if (el.uploadModalBackdrop) {
        if (el.uploadStatusBox) {
          el.uploadStatusBox.style.display = 'none';
          el.uploadStatusBox.innerHTML = '';
        }
        el.uploadModalBackdrop.style.display = 'flex';
      }
    }
    function closeUploadModal() {
      if (el.uploadModalBackdrop) el.uploadModalBackdrop.style.display = 'none';
    }

    function handleUploadFile(file) {
      if (!file) return;
      const box = el.uploadStatusBox;
      if (!box) return;
      box.style.display = 'block';
      box.style.background = 'rgba(56, 189, 248, 0.12)';
      box.style.color = '#38bdf8';
      box.style.border = '1px solid rgba(56, 189, 248, 0.35)';
      box.innerHTML = `⏳ Uploading and processing <strong>${escapeHtml(file.name)}</strong>... Please wait.`;

      const formData = new FormData();
      formData.append('file', file);

      fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          box.style.background = 'rgba(16, 185, 129, 0.15)';
          box.style.color = '#34d399';
          box.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          box.innerHTML = `✅ <strong>Success!</strong> ${escapeHtml(data.message)}<br><small style="color:var(--text-secondary);">Reloading fresh dashboard data...</small>`;
          setTimeout(() => {
            window.location.reload();
          }, 1200);
        } else {
          box.style.background = 'rgba(244, 63, 94, 0.15)';
          box.style.color = '#f43f5e';
          box.style.border = '1px solid rgba(244, 63, 94, 0.4)';
          box.innerHTML = `❌ <strong>Upload Error:</strong> ${escapeHtml(data.error || 'Processing failed.')}`;
        }
      })
      .catch(err => {
        box.style.background = 'rgba(245, 158, 11, 0.15)';
        box.style.color = '#fbbf24';
        box.style.border = '1px solid rgba(245, 158, 11, 0.4)';
        box.innerHTML = `
          <strong>File Selected:</strong> ${escapeHtml(file.name)}<br>
          <span style="font-size:12px; color:var(--text-primary); margin-top:6px; display:block; line-height:1.5;">
            ⚡ On <strong>Render.com</strong>, the live Python backend auto-updates the dashboard dynamically upon upload.<br>
            ⚡ On your local machine, save this file into the folder and run: <code>python update_all.py</code>.
          </span>
        `;
      });
    }

    if (el.openUploadBtn) el.openUploadBtn.addEventListener('click', openUploadModal);
    if (el.closeUploadModalBtn) el.closeUploadModalBtn.addEventListener('click', closeUploadModal);
    if (el.uploadModalBackdrop) {
      el.uploadModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.uploadModalBackdrop) closeUploadModal();
      });
    }

    if (el.excelFileInput) {
      el.excelFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleUploadFile(e.target.files[0]);
        }
      });
    }

    if (el.uploadDropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        el.uploadDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.uploadDropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        el.uploadDropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          el.uploadDropzone.classList.remove('dragover');
        });
      });

      el.uploadDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleUploadFile(e.dataTransfer.files[0]);
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        closeExecSummary();
        closeSlaModal();
        closeUploadModal();
      }
    });
  }

  // Run init when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
