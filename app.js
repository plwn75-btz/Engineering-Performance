/**
 * ASK Technical Document Review Duration Dashboard - Application Logic
 */

(function () {
  'use strict';

  // State Management
  const state = {
    rawData: window.RAW_DATA || [],
    filteredData: [],
    currentPage: 1,
    pageSize: 25,
    sortField: 'actual_submit_in',
    sortDirection: 'desc',
    activeCategory: 'ALL',
    activeDocCategory: 'Part B - Engineering Doc', // Default focus requested by user
    activeDiscipline: 'ALL',
    activeRev: 'ALL',
    activeStatus: 'ALL',
    activeTier: null, // Active duration tier filter { label, min, max }
    tierModalSelectedDisc: 'ALL',
    tierModalSearchQuery: '',
    currentTier: null,
    currentTierItems: [],
    searchQuery: '',
    theme: localStorage.getItem('ask_dash_theme') || 'dark',
    docsMap: new Map() // Grouping by doc_no for fast multi-revision lookup
  };

  // DOM Elements
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    searchInput: document.getElementById('searchInput'),
    disciplineSelect: document.getElementById('disciplineSelect'),
    revSelect: document.getElementById('revSelect'),
    statusSelect: document.getElementById('statusSelect'),
    categoryPills: document.getElementById('categoryPills'),
    filterStatusText: document.getElementById('filterStatusText'),
    
    // KPI elements
    kpiTotal: document.getElementById('kpiTotal'),
    kpiUniqueDocs: document.getElementById('kpiUniqueDocs'),
    kpiWithin10: document.getElementById('kpiWithin10'),
    kpiWithinPct: document.getElementById('kpiWithinPct'),
    kpiOver10: document.getElementById('kpiOver10'),
    kpiOverPct: document.getElementById('kpiOverPct'),
    kpiPending: document.getElementById('kpiPending'),
    kpiPendingPct: document.getElementById('kpiPendingPct'),
    kpiAvgDuration: document.getElementById('kpiAvgDuration'),
    kpiMedianDuration: document.getElementById('kpiMedianDuration'),
    
    // Pill counts
    countAll: document.getElementById('countAll'),
    countWithin: document.getElementById('countWithin'),
    countOver: document.getElementById('countOver'),
    countPending: document.getElementById('countPending'),

    // Charts & Tables
    donutChartContainer: document.getElementById('donutChartContainer'),
    tierChartContainer: document.getElementById('tierChartContainer'),
    disciplineTableBody: document.getElementById('disciplineTableBody'),
    revChartContainer: document.getElementById('revChartContainer'),
    mainDocTable: document.getElementById('mainDocTable'),
    tableBody: document.getElementById('tableBody'),
    tableRecordCountText: document.getElementById('tableRecordCountText'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),

    // Drawer elements
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    historyDrawer: document.getElementById('historyDrawer'),
    drawerCloseBtn: document.getElementById('drawerCloseBtn'),
    drawerDocNo: document.getElementById('drawerDocNo'),
    drawerDocTitle: document.getElementById('drawerDocTitle'),
    drawerDiscipline: document.getElementById('drawerDiscipline'),
    drawerRevCount: document.getElementById('drawerRevCount'),
    drawerTimeline: document.getElementById('drawerTimeline'),

    // Tier Modal elements
    tierModalBackdrop: document.getElementById('tierModalBackdrop'),
    tierModalCloseBtn: document.getElementById('tierModalCloseBtn'),
    tierModalTitle: document.getElementById('tierModalTitle'),
    tierModalSubtitle: document.getElementById('tierModalSubtitle'),
    tierModalCountBadge: document.getElementById('tierModalCountBadge'),
    tierDisciplineChips: document.getElementById('tierDisciplineChips'),
    tierDocTableBody: document.getElementById('tierDocTableBody'),
    tierDocSearchInput: document.getElementById('tierDocSearchInput'),
    btnFilterMainByTier: document.getElementById('btnFilterMainByTier'),
    activeTierBadge: document.getElementById('activeTierBadge'),
    clearTierFilterBtn: document.getElementById('clearTierFilterBtn'),

    // SLA & Upload Modal Elements
    openSlaDefBtn: document.getElementById('openSlaDefBtn'),
    slaBadgeBtn: document.getElementById('slaBadgeBtn'),
    slaModalBackdrop: document.getElementById('slaModalBackdrop'),
    closeSlaModalBtn: document.getElementById('closeSlaModalBtn'),
    closeSlaModalBtn2: document.getElementById('closeSlaModalBtn2'),
    openUploadBtn: document.getElementById('openUploadBtn'),
    uploadModalBackdrop: document.getElementById('uploadModalBackdrop'),
    closeUploadModalBtn: document.getElementById('closeUploadModalBtn'),
    closeUploadModalBtn2: document.getElementById('closeUploadModalBtn2'),
    uploadDropzone: document.getElementById('uploadDropzone'),
    excelFileInput: document.getElementById('excelFileInput'),
    uploadStatusBox: document.getElementById('uploadStatusBox')
  };

  // Helper Functions
  function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
  }

  function parseDateObj(dateStr) {
    if (!dateStr) return null;
    const parts = dateStr.split(' ');
    if (parts.length < 2) return null;
    const dParts = parts[0].split('-');
    if (dParts.length !== 3) return null;
    const day = parseInt(dParts[0], 10);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames.indexOf(dParts[1]);
    const year = parseInt(dParts[2], 10);
    const tParts = parts[1].split(':');
    const hours = parseInt(tParts[0] || '0', 10);
    const mins = parseInt(tParts[1] || '0', 10);
    const secs = parseInt(tParts[2] || '0', 10);
    return new Date(year, month, day, hours, mins, secs);
  }

  // Pre-process & index documents
  function initDataIndex() {
    state.docsMap.clear();
    state.rawData.forEach(item => {
      const docNo = item.doc_no || 'UNKNOWN';
      if (!state.docsMap.has(docNo)) {
        state.docsMap.set(docNo, []);
      }
      state.docsMap.get(docNo).push(item);
    });

    // Populate Filter Dropdowns
    const disciplines = new Set();
    const revisions = new Set();
    const statuses = new Set();

    state.rawData.forEach(d => {
      if (d.discipline_name) disciplines.add(d.discipline_name);
      if (d.rev) revisions.add(d.rev);
      if (d.return_status_code) statuses.add(d.return_status_code);
    });

    // Populate Discipline Select
    const sortedDiscs = Array.from(disciplines).sort();
    sortedDiscs.forEach(disc => {
      const opt = document.createElement('option');
      opt.value = disc;
      const count = state.rawData.filter(x => x.discipline_name === disc).length;
      opt.textContent = `${disc} (${formatNumber(count)})`;
      el.disciplineSelect.appendChild(opt);
    });

    // Populate Rev Select
    const sortedRevs = Array.from(revisions).sort((a, b) => {
      if (a === '-') return 1;
      if (b === '-') return -1;
      return a.localeCompare(b);
    });
    sortedRevs.forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      const count = state.rawData.filter(x => x.rev === r).length;
      opt.textContent = `Rev ${r} (${formatNumber(count)})`;
      el.revSelect.appendChild(opt);
    });

    // Populate Status Select
    const sortedStatuses = Array.from(statuses).sort();
    sortedStatuses.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s;
      const count = state.rawData.filter(x => x.return_status_code === s).length;
      opt.textContent = `${s} (${formatNumber(count)})`;
      el.statusSelect.appendChild(opt);
    });

    // Populate Category Tab Counts
    const countPartB = state.rawData.filter(x => x.doc_category === 'Part B - Engineering Doc').length;
    const countPartA = state.rawData.filter(x => x.doc_category === 'Part A - Project Management Doc').length;
    const countPartE = state.rawData.filter(x => x.doc_category === 'Part E - Fabrication Doc').length;
    const countPartC = state.rawData.filter(x => x.doc_category === 'Part C - Engineering Dwg').length;
    const countPartAll = state.rawData.length;

    const elTabB = document.getElementById('tabCountPartB');
    const elTabA = document.getElementById('tabCountPartA');
    const elTabE = document.getElementById('tabCountPartE');
    const elTabC = document.getElementById('tabCountPartC');
    const elTabAll = document.getElementById('tabCountPartAll');

    if (elTabB) elTabB.textContent = formatNumber(countPartB);
    if (elTabA) elTabA.textContent = formatNumber(countPartA);
    if (elTabE) elTabE.textContent = formatNumber(countPartE);
    if (elTabC) elTabC.textContent = formatNumber(countPartC);
    if (elTabAll) elTabAll.textContent = formatNumber(countPartAll);
  }

  // Filter Application
  function applyFilters() {
    const q = state.searchQuery.toLowerCase().trim();
    const cat = state.activeCategory;
    const disc = state.activeDiscipline;
    const rev = state.activeRev;
    const status = state.activeStatus;

    state.filteredData = state.rawData.filter(item => {
      // Document Category Scope (Part B focus by default, Part A & Part E optional)
      if (state.activeDocCategory !== 'ALL' && item.doc_category !== state.activeDocCategory) {
        return false;
      }

      // Review Duration Category filter (<= 10d, > 10d, Pending)
      if (cat !== 'ALL' && item.category !== cat) return false;

      // Discipline filter
      if (disc !== 'ALL' && item.discipline_name !== disc) return false;

      // Revision filter
      if (rev !== 'ALL' && item.rev !== rev) return false;

      // Status filter
      if (status !== 'ALL' && item.return_status_code !== status) return false;

      // Active Tier filter (if user filtered by a duration tier)
      if (state.activeTier) {
        if (item.duration_days === null || item.duration_days === undefined) return false;
        if (item.duration_days < state.activeTier.min || item.duration_days > state.activeTier.max) return false;
      }

      // Search Query
      if (q) {
        const docNo = (item.doc_no || '').toLowerCase();
        const title = (item.doc_title || '').toLowerCase();
        const subId = (item.submittal_id || '').toLowerCase();
        if (!docNo.includes(q) && !title.includes(q) && !subId.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // Sort Data
    sortData();

    // Update active tier badge in UI
    if (el.activeTierBadge && el.clearTierFilterBtn) {
      if (state.activeTier) {
        el.activeTierBadge.style.display = 'block';
        el.clearTierFilterBtn.innerHTML = `Tier: ${state.activeTier.label} &times;`;
      } else {
        el.activeTierBadge.style.display = 'none';
      }
    }

    // Reset pagination to page 1
    state.currentPage = 1;

    // Update UI components
    updateKPIs();
    renderCharts();
    renderDisciplineTable();
    renderRevisionChart();
    renderTable();
  }

  function sortData() {
    const field = state.sortField;
    const dir = state.sortDirection === 'asc' ? 1 : -1;

    state.filteredData.sort((a, b) => {
      let valA = a[field];
      let valB = b[field];

      if (field === 'duration_days') {
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        return (valA - valB) * dir;
      }

      if (field === 'actual_submit_in' || field === 'actual_submit_out') {
        const dtA = parseDateObj(valA);
        const dtB = parseDateObj(valB);
        if (!dtA) return 1;
        if (!dtB) return -1;
        return (dtA - dtB) * dir;
      }

      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
      return valA.localeCompare(valB) * dir;
    });
  }

  // Update KPI Cards & Pill Counts
  function updateKPIs() {
    const total = state.filteredData.length;
    const within10 = state.filteredData.filter(d => d.category === '<= 10 Days').length;
    const over10 = state.filteredData.filter(d => d.category === '> 10 Days').length;
    const pending = state.filteredData.filter(d => d.category === 'Pending').length;
    const completed = within10 + over10;

    const uniqueDocs = new Set(state.filteredData.map(d => d.doc_no)).size;

    // Durations for completed
    const durations = state.filteredData
      .filter(d => d.duration_days !== null && d.duration_days !== undefined)
      .map(d => d.duration_days)
      .sort((a, b) => a - b);

    let avgDuration = 0;
    let medianDuration = 0;
    if (durations.length > 0) {
      avgDuration = (durations.reduce((sum, v) => sum + v, 0) / durations.length).toFixed(1);
      const mid = Math.floor(durations.length / 2);
      medianDuration = durations.length % 2 !== 0 ? durations[mid] : ((durations[mid - 1] + durations[mid]) / 2).toFixed(1);
    }

    const withinPct = completed > 0 ? ((within10 / completed) * 100).toFixed(1) : '0.0';
    const overPct = completed > 0 ? ((over10 / completed) * 100).toFixed(1) : '0.0';
    const pendingPct = total > 0 ? ((pending / total) * 100).toFixed(1) : '0.0';

    // Update KPI Elements
    el.kpiTotal.textContent = formatNumber(total);
    el.kpiUniqueDocs.textContent = formatNumber(uniqueDocs);
    el.kpiWithin10.textContent = formatNumber(within10);
    el.kpiWithinPct.textContent = `${withinPct}%`;
    el.kpiOver10.textContent = formatNumber(over10);
    el.kpiOverPct.textContent = `${overPct}%`;
    el.kpiPending.textContent = formatNumber(pending);
    el.kpiPendingPct.textContent = `${pendingPct}%`;
    el.kpiAvgDuration.innerHTML = `${avgDuration} <span style="font-size: 16px; font-weight: 500;">Working Days</span>`;
    el.kpiMedianDuration.textContent = `${medianDuration} WD`;

    // Compute pill counts within the current Document Category scope
    const scopedItems = state.rawData.filter(item => {
      if (state.activeDocCategory !== 'ALL' && item.doc_category !== state.activeDocCategory) return false;
      if (state.activeDiscipline !== 'ALL' && item.discipline_name !== state.activeDiscipline) return false;
      if (state.activeRev !== 'ALL' && item.rev !== state.activeRev) return false;
      if (state.activeStatus !== 'ALL' && item.return_status_code !== state.activeStatus) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase().trim();
        const docNo = (item.doc_no || '').toLowerCase();
        const title = (item.doc_title || '').toLowerCase();
        const subId = (item.submittal_id || '').toLowerCase();
        if (!docNo.includes(q) && !title.includes(q) && !subId.includes(q)) return false;
      }
      return true;
    });

    const scopeTotal = scopedItems.length;
    const scopeWithin10 = scopedItems.filter(d => d.category === '<= 10 Days').length;
    const scopeOver10 = scopedItems.filter(d => d.category === '> 10 Days').length;
    const scopePending = scopedItems.filter(d => d.category === 'Pending').length;

    // Update Pill counts
    el.countAll.textContent = formatNumber(scopeTotal);
    el.countWithin.textContent = formatNumber(scopeWithin10);
    el.countOver.textContent = formatNumber(scopeOver10);
    el.countPending.textContent = formatNumber(scopePending);

    const scopeLabel = state.activeDocCategory === 'ALL' ? 'All Document Categories' : state.activeDocCategory;
    el.filterStatusText.textContent = `Showing ${formatNumber(total)} of ${formatNumber(scopeTotal)} submissions (${scopeLabel})`;
  }

  // Render Visual Charts (Donut & Tiers) using Native Crisp SVG
  function renderCharts() {
    renderDonutChart();
    renderTierChart();
  }

  function renderDonutChart() {
    const within10 = state.filteredData.filter(d => d.category === '<= 10 Days').length;
    const over10 = state.filteredData.filter(d => d.category === '> 10 Days').length;
    const pending = state.filteredData.filter(d => d.category === 'Pending').length;
    const total = within10 + over10 + pending;

    if (total === 0) {
      el.donutChartContainer.innerHTML = '<div style="color:var(--text-muted);font-size:13px;">No data matching current filters</div>';
      return;
    }

    const slices = [
      { label: 'Within 10 Working Days (≤ 10 WD)', count: within10, color: '#10b981', category: '<= 10 Days' },
      { label: 'Over 10 Working Days (> 10 WD)', count: over10, color: '#f43f5e', category: '> 10 Days' },
      { label: 'Pending Review', count: pending, color: '#f59e0b', category: 'Pending' }
    ];

    // Compute SVG arcs
    const size = 200;
    const center = size / 2;
    const radius = 80;
    const holeRadius = 54;

    let currentAngle = -Math.PI / 2;
    let paths = '';

    slices.forEach((slice, idx) => {
      if (slice.count === 0) return;
      const angle = (slice.count / total) * (Math.PI * 2);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      const x1 = center + radius * Math.cos(startAngle);
      const y1 = center + radius * Math.sin(startAngle);
      const x2 = center + radius * Math.cos(endAngle);
      const y2 = center + radius * Math.sin(endAngle);

      const x3 = center + holeRadius * Math.cos(endAngle);
      const y3 = center + holeRadius * Math.sin(endAngle);
      const x4 = center + holeRadius * Math.cos(startAngle);
      const y4 = center + holeRadius * Math.sin(startAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${x3} ${y3}`,
        `A ${holeRadius} ${holeRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
        'Z'
      ].join(' ');

      const pct = ((slice.count / total) * 100).toFixed(1);
      paths += `
        <path d="${pathData}" fill="${slice.color}" opacity="0.9" style="cursor:pointer;transition:opacity 0.2s;" data-cat="${slice.category}">
          <title>${slice.label}: ${formatNumber(slice.count)} (${pct}%)</title>
        </path>
      `;
    });

    const completed = within10 + over10;
    const complianceRate = completed > 0 ? ((within10 / completed) * 100).toFixed(1) : '0';

    let legendHtml = '<div class="donut-legend">';
    slices.forEach(s => {
      const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0';
      legendHtml += `
        <div class="donut-legend-item" data-cat="${s.category}" style="display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;">
            <span class="donut-legend-color" style="background:${s.color};"></span>
            <span style="font-size:12px;font-weight:500;">${s.label}</span>
          </div>
          <div style="font-size:12px;font-family:'JetBrains Mono',monospace;font-weight:600;">
            ${formatNumber(s.count)} <span style="color:var(--text-muted);font-size:11px;">(${pct}%)</span>
          </div>
        </div>
      `;
    });
    legendHtml += '</div>';

    el.donutChartContainer.innerHTML = `
      <div style="display:flex;align-items:center;width:100%;justify-content:center;flex-wrap:wrap;gap:12px;">
        <div style="position:relative;width:${size}px;height:${size}px;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            ${paths}
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none;">
            <span style="font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;">MEET AGREEMENT</span>
            <span style="font-size:22px;font-weight:800;color:var(--color-within10);">${complianceRate}%</span>
            <span style="font-size:10px;color:var(--text-muted);">&le; 10 Working Days</span>
          </div>
        </div>
        ${legendHtml}
      </div>
    `;

    // Add click event on legend & donut slices to filter category
    el.donutChartContainer.querySelectorAll('[data-cat]').forEach(node => {
      node.addEventListener('click', () => {
        const cat = node.getAttribute('data-cat');
        setCategoryFilter(cat);
      });
    });
  }

  function renderTierChart() {
    const tiers = [
      { label: '≤ 5 WD', min: -999, max: 5, count: 0, color: '#10b981' },
      { label: '6 - 10 WD', min: 6, max: 10, count: 0, color: '#34d399' },
      { label: '11 - 15 WD', min: 11, max: 15, count: 0, color: '#fbbf24' },
      { label: '16 - 20 WD', min: 16, max: 20, count: 0, color: '#f97316' },
      { label: '21 - 30 WD', min: 21, max: 30, count: 0, color: '#f43f5e' },
      { label: '> 30 WD', min: 31, max: 9999, count: 0, color: '#991b1b' }
    ];

    // Compute tier counts from current scope (category, discipline, rev, status, search)
    const scopeData = state.rawData.filter(item => {
      if (state.activeDocCategory !== 'ALL' && item.doc_category !== state.activeDocCategory) return false;
      if (state.activeDiscipline !== 'ALL' && item.discipline_name !== state.activeDiscipline) return false;
      if (state.activeRev !== 'ALL' && item.rev !== state.activeRev) return false;
      if (state.activeStatus !== 'ALL' && item.return_status_code !== state.activeStatus) return false;
      if (state.searchQuery) {
        const q = state.searchQuery.toLowerCase().trim();
        const docNo = (item.doc_no || '').toLowerCase();
        const title = (item.doc_title || '').toLowerCase();
        const subId = (item.submittal_id || '').toLowerCase();
        if (!docNo.includes(q) && !title.includes(q) && !subId.includes(q)) return false;
      }
      return true;
    });

    scopeData.forEach(d => {
      if (d.duration_days !== null && d.duration_days !== undefined) {
        const dur = d.duration_days;
        for (const t of tiers) {
          if (dur >= t.min && dur <= t.max) {
            t.count++;
            break;
          }
        }
      }
    });

    const maxCount = Math.max(...tiers.map(t => t.count), 1);

    let barsHtml = '';
    tiers.forEach((t, index) => {
      const pct = (t.count / maxCount) * 100;
      const isActive = state.activeTier && state.activeTier.label === t.label;
      barsHtml += `
        <div class="tier-bar-row ${isActive ? 'active' : ''}" data-tier-idx="${index}" title="Click to view disciplines and documents for ${t.label}">
          <div style="width:85px;font-weight:600;color:var(--text-secondary);text-align:right;">${t.label}</div>
          <div style="flex:1;background:var(--bg-secondary);height:22px;border-radius:var(--radius-sm);overflow:hidden;position:relative;">
            <div style="width:${pct}%;background:${t.color};height:100%;border-radius:var(--radius-sm);transition:width 0.4s ease;"></div>
          </div>
          <div style="width:50px;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--text-primary);text-align:right;">
            ${formatNumber(t.count)}
          </div>
          <span class="tier-inspect-btn">View Details 🔍</span>
        </div>
      `;
    });

    el.tierChartContainer.innerHTML = `
      <div style="width:100%;padding:4px 8px;">
        ${barsHtml}
      </div>
    `;

    // Attach click listeners to each tier row to open detail modal
    el.tierChartContainer.querySelectorAll('.tier-bar-row').forEach(row => {
      row.addEventListener('click', () => {
        const idx = parseInt(row.getAttribute('data-tier-idx'), 10);
        const tier = tiers[idx];
        openTierModal(tier, scopeData);
      });
    });
  }

  // Tier Detail Modal Logic
  function openTierModal(tier, scopeData) {
    state.currentTier = tier;
    state.tierModalSelectedDisc = 'ALL';
    state.tierModalSearchQuery = '';
    if (el.tierDocSearchInput) el.tierDocSearchInput.value = '';

    // Filter items in this tier
    const tierItems = (scopeData || state.rawData).filter(d => {
      if (state.activeDocCategory !== 'ALL' && d.doc_category !== state.activeDocCategory) return false;
      if (d.duration_days === null || d.duration_days === undefined) return false;
      return d.duration_days >= tier.min && d.duration_days <= tier.max;
    });

    state.currentTierItems = tierItems;

    el.tierModalTitle.textContent = `Review Duration Tier: ${tier.label}`;
    el.tierModalCountBadge.textContent = `${formatNumber(tierItems.length)} Documents`;
    el.tierModalCountBadge.style.color = tier.color;
    el.tierModalCountBadge.style.borderColor = tier.color;
    el.tierModalCountBadge.style.background = 'rgba(255, 255, 255, 0.05)';

    const scopeLabel = state.activeDocCategory === 'ALL' ? 'All Document Categories' : state.activeDocCategory;
    el.tierModalSubtitle.textContent = `Breakdown of disciplines and documents completed in ${tier.label} (${scopeLabel})`;

    renderTierModalDisciplines();
    renderTierModalDocs();

    el.tierModalBackdrop.classList.add('open');
  }

  function renderTierModalDisciplines() {
    const discCounts = new Map();
    state.currentTierItems.forEach(d => {
      const name = d.discipline_name || 'Unassigned';
      discCounts.set(name, (discCounts.get(name) || 0) + 1);
    });

    const sortedDiscs = Array.from(discCounts.entries()).sort((a, b) => b[1] - a[1]);
    const total = state.currentTierItems.length;

    let chipsHtml = `
      <div class="tier-disc-chip ${state.tierModalSelectedDisc === 'ALL' ? 'active' : ''}" data-disc="ALL">
        All Disciplines <span class="tab-badge">${formatNumber(total)}</span>
      </div>
    `;

    sortedDiscs.forEach(([disc, count]) => {
      const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
      const isAct = state.tierModalSelectedDisc === disc;
      chipsHtml += `
        <div class="tier-disc-chip ${isAct ? 'active' : ''}" data-disc="${disc}">
          ${disc} <span class="tab-badge">${formatNumber(count)} (${pct}%)</span>
        </div>
      `;
    });

    el.tierDisciplineChips.innerHTML = chipsHtml;

    el.tierDisciplineChips.querySelectorAll('.tier-disc-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        state.tierModalSelectedDisc = chip.getAttribute('data-disc');
        renderTierModalDisciplines();
        renderTierModalDocs();
      });
    });
  }

  function renderTierModalDocs() {
    const q = (state.tierModalSearchQuery || '').toLowerCase().trim();
    const selDisc = state.tierModalSelectedDisc;

    const filtered = state.currentTierItems.filter(item => {
      if (selDisc !== 'ALL' && item.discipline_name !== selDisc) return false;
      if (q) {
        const docNo = (item.doc_no || '').toLowerCase();
        const title = (item.doc_title || '').toLowerCase();
        const subId = (item.submittal_id || '').toLowerCase();
        if (!docNo.includes(q) && !title.includes(q) && !subId.includes(q)) return false;
      }
      return true;
    });

    const heading = document.getElementById('tierDocListHeading');
    if (heading) {
      heading.textContent = `Documents (${formatNumber(filtered.length)}${selDisc !== 'ALL' ? ' - ' + selDisc : ''})`;
    }

    if (filtered.length === 0) {
      el.tierDocTableBody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">
            No documents found matching search criteria.
          </td>
        </tr>
      `;
      return;
    }

    let rowsHtml = '';
    filtered.forEach(row => {
      let durColor = 'var(--text-primary)';
      if (row.category === '<= 10 Days') durColor = 'var(--color-within10)';
      else if (row.category === '> 10 Days') durColor = 'var(--color-over10)';

      let statusClass = 'status-default';
      const rCode = (row.return_status_code || '').toUpperCase();
      if (rCode.startsWith('APPR')) statusClass = 'status-appr';
      else if (rCode.startsWith('AWC')) statusClass = 'status-awc';
      else if (rCode === 'NA') statusClass = 'status-na';
      else if (rCode === 'REC') statusClass = 'status-rec';

      const statusBadge = row.return_status_code 
        ? `<span class="badge-status ${statusClass}" title="${row.return_status_name}">${row.return_status_code}</span>` 
        : '-';

      rowsHtml += `
        <tr>
          <td>
            <span class="doc-no" data-doc="${row.doc_no}" title="Click to view history">${row.doc_no}</span>
            <div style="font-size:10px;color:var(--text-muted);">${row.submittal_id}</div>
          </td>
          <td style="text-align:center;"><span class="rev-badge">${row.rev}</span></td>
          <td style="font-weight:500;">${row.discipline_name}</td>
          <td><div class="doc-title-cell" style="max-width:260px;" title="${row.doc_title}">${row.doc_title}</div></td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;">${row.actual_submit_in || '-'}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:11px;">${row.actual_submit_out || '-'}</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;color:${durColor};">${row.duration_days} WD</td>
          <td style="text-align:center;">${statusBadge}</td>
        </tr>
      `;
    });

    el.tierDocTableBody.innerHTML = rowsHtml;

    // Attach click to open document history drawer from inside the modal
    el.tierDocTableBody.querySelectorAll('[data-doc]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const docNo = btn.getAttribute('data-doc');
        openHistoryDrawer(docNo);
      });
    });
  }

  function closeTierModal() {
    el.tierModalBackdrop.classList.remove('open');
  }

  // SLA Definition Modal Handlers
  function openSlaModal() {
    if (el.slaModalBackdrop) el.slaModalBackdrop.classList.add('open');
  }

  function closeSlaModal() {
    if (el.slaModalBackdrop) el.slaModalBackdrop.classList.remove('open');
  }

  // Upload Modal Handlers
  function openUploadModal() {
    if (el.uploadModalBackdrop) {
      if (el.uploadStatusBox) {
        el.uploadStatusBox.style.display = 'none';
        el.uploadStatusBox.innerHTML = '';
      }
      el.uploadModalBackdrop.classList.add('open');
    }
  }

  function closeUploadModal() {
    if (el.uploadModalBackdrop) el.uploadModalBackdrop.classList.remove('open');
  }

  function handleUploadFile(file) {
    if (!file) return;
    const box = el.uploadStatusBox;
    if (!box) return;
    box.style.display = 'block';
    box.style.background = 'rgba(56, 189, 248, 0.12)';
    box.style.color = '#38bdf8';
    box.style.border = '1px solid rgba(56, 189, 248, 0.35)';
    box.innerHTML = `⏳ Uploading and processing <strong>${file.name}</strong>... Please wait.`;

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
        box.innerHTML = `✅ <strong>Success!</strong> ${data.message}<br><small style="color:var(--text-secondary);">Reloading fresh dashboard data...</small>`;
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        box.style.background = 'rgba(244, 63, 94, 0.15)';
        box.style.color = '#f43f5e';
        box.style.border = '1px solid rgba(244, 63, 94, 0.4)';
        box.innerHTML = `❌ <strong>Upload Error:</strong> ${data.error || 'Processing failed.'}`;
      }
    })
    .catch(err => {
      // Running locally or offline without python web server
      box.style.background = 'rgba(245, 158, 11, 0.15)';
      box.style.color = '#fbbf24';
      box.style.border = '1px solid rgba(245, 158, 11, 0.4)';
      box.innerHTML = `
        <strong>File Selected:</strong> ${file.name}<br>
        <span style="font-size:12px; color:var(--text-primary); margin-top:6px; display:block; line-height:1.5;">
          ⚡ On <strong>Render.com</strong>, the live Python backend auto-updates the dashboard dynamically upon upload.<br>
          ⚡ On your local machine, save this file into the folder and run: <code>python update_all.py</code>.
        </span>
      `;
    });
  }

  // Discipline Classification Summary Table
  function renderDisciplineTable() {
    const discMap = new Map();

    state.filteredData.forEach(d => {
      const name = d.discipline_name || 'Unassigned';
      if (!discMap.has(name)) {
        discMap.set(name, { total: 0, w10: 0, o10: 0, pending: 0, durSum: 0, durCount: 0 });
      }
      const s = discMap.get(name);
      s.total++;
      if (d.category === '<= 10 Days') {
        s.w10++;
        s.durSum += d.duration_days;
        s.durCount++;
      } else if (d.category === '> 10 Days') {
        s.o10++;
        s.durSum += d.duration_days;
        s.durCount++;
      } else {
        s.pending++;
      }
    });

    const sorted = Array.from(discMap.entries()).sort((a, b) => b[1].total - a[1].total);

    let rowsHtml = '';
    sorted.forEach(([name, s]) => {
      const completed = s.w10 + s.o10;
      const compPct = completed > 0 ? ((s.w10 / completed) * 100).toFixed(1) : '0.0';
      const avgDays = s.durCount > 0 ? (s.durSum / s.durCount).toFixed(1) : '-';

      // Width percentages for mini stacked progress bar
      const pW10 = s.total > 0 ? (s.w10 / s.total) * 100 : 0;
      const pO10 = s.total > 0 ? (s.o10 / s.total) * 100 : 0;
      const pPend = s.total > 0 ? (s.pending / s.total) * 100 : 0;

      rowsHtml += `
        <tr data-disc="${name}">
          <td style="font-weight:600;color:var(--text-primary);">${name}</td>
          <td style="text-align:right;font-weight:700;">${formatNumber(s.total)}</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--color-within10);">${formatNumber(s.w10)}</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--color-within10);">${compPct}%</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--color-over10);">${formatNumber(s.o10)}</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:600;color:var(--color-pending);">${formatNumber(s.pending)}</td>
          <td style="text-align:right;font-family:'JetBrains Mono',monospace;font-weight:700;">${avgDays !== '-' ? avgDays + ' WD' : '-'}</td>
          <td>
            <div class="progress-bar-wrap" title="≤10 WD: ${s.w10}, >10 WD: ${s.o10}, Pending: ${s.pending}">
              <div class="progress-segment" style="width:${pW10}%;background:var(--color-within10);"></div>
              <div class="progress-segment" style="width:${pO10}%;background:var(--color-over10);"></div>
              <div class="progress-segment" style="width:${pPend}%;background:var(--color-pending);"></div>
            </div>
          </td>
        </tr>
      `;
    });

    el.disciplineTableBody.innerHTML = rowsHtml;

    // Click handler to filter by discipline
    el.disciplineTableBody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const disc = row.getAttribute('data-disc');
        el.disciplineSelect.value = disc;
        state.activeDiscipline = disc;
        applyFilters();
      });
    });
  }

  // Revision Turnaround Performance
  function renderRevisionChart() {
    const revMap = new Map();
    state.filteredData.forEach(d => {
      const r = d.rev || '-';
      if (!revMap.has(r)) {
        revMap.set(r, { total: 0, w10: 0, o10: 0, pending: 0, durSum: 0, durCount: 0 });
      }
      const s = revMap.get(r);
      s.total++;
      if (d.category === '<= 10 Days') {
        s.w10++;
        s.durSum += d.duration_days;
        s.durCount++;
      } else if (d.category === '> 10 Days') {
        s.o10++;
        s.durSum += d.duration_days;
        s.durCount++;
      } else {
        s.pending++;
      }
    });

    // Top revisions sorted by total
    const sorted = Array.from(revMap.entries())
      .filter(([r]) => r !== '-' && r !== 'X')
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6);

    let cardsHtml = '';
    sorted.forEach(([rev, s]) => {
      const completed = s.w10 + s.o10;
      const compPct = completed > 0 ? ((s.w10 / completed) * 100).toFixed(1) : '0';
      const avgDays = s.durCount > 0 ? (s.durSum / s.durCount).toFixed(1) : '-';

      cardsHtml += `
        <div style="background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:var(--radius-md);padding:14px;flex:1;min-width:140px;cursor:pointer;" data-rev="${rev}">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <span class="rev-badge" style="font-size:13px;padding:3px 8px;">Rev ${rev}</span>
            <span style="font-size:12px;color:var(--text-muted);">${formatNumber(s.total)} docs</span>
          </div>
          <div style="font-size:20px;font-weight:800;color:var(--text-primary);margin-bottom:4px;">
            ${avgDays !== '-' ? avgDays + ' Days' : 'Pending'}
          </div>
          <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between;">
            <span>Meet Agreement:</span>
            <span style="font-weight:700;color:var(--color-within10);">${compPct}% (${s.w10}/${completed})</span>
          </div>
        </div>
      `;
    });

    el.revChartContainer.innerHTML = `
      <div style="display:flex;gap:14px;width:100%;flex-wrap:wrap;padding:4px;">
        ${cardsHtml}
      </div>
    `;

    el.revChartContainer.querySelectorAll('[data-rev]').forEach(item => {
      item.addEventListener('click', () => {
        const rev = item.getAttribute('data-rev');
        el.revSelect.value = rev;
        state.activeRev = rev;
        applyFilters();
      });
    });
  }

  // Main Documents Table & Pagination
  function renderTable() {
    const total = state.filteredData.length;
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, total);
    const pageRecords = state.filteredData.slice(startIndex, endIndex);

    if (total === 0) {
      el.tableBody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align:center;padding:40px;color:var(--text-muted);">
            No document reviews found matching the current filters.
          </td>
        </tr>
      `;
      el.tableRecordCountText.textContent = 'Showing 0 of 0 submissions';
      el.paginationInfo.textContent = 'Page 0 of 0';
      el.paginationControls.innerHTML = '';
      return;
    }

    el.tableRecordCountText.textContent = `Showing ${formatNumber(startIndex + 1)} - ${formatNumber(endIndex)} of ${formatNumber(total)} submissions`;

    let rowsHtml = '';
    pageRecords.forEach(row => {
      let catBadge = '';
      let durDisplay = '';

      if (row.category === '<= 10 Days') {
        catBadge = `<span class="badge-category badge-within10">≤ 10 WD</span>`;
        durDisplay = `<span class="duration-val within10">${row.duration_days} WD</span>`;
      } else if (row.category === '> 10 Days') {
        catBadge = `<span class="badge-category badge-over10">> 10 WD</span>`;
        durDisplay = `<span class="duration-val over10">${row.duration_days} WD</span>`;
      } else {
        catBadge = `<span class="badge-category badge-pending">Pending</span>`;
        durDisplay = `<span class="duration-val pending">-</span>`;
      }

      // Return status badge
      let statusClass = 'status-default';
      const rCode = (row.return_status_code || '').toUpperCase();
      if (rCode.startsWith('APPR')) statusClass = 'status-appr';
      else if (rCode.startsWith('AWC')) statusClass = 'status-awc';
      else if (rCode === 'NA') statusClass = 'status-na';
      else if (rCode === 'REC') statusClass = 'status-rec';

      const statusBadge = row.return_status_code 
        ? `<span class="badge-status ${statusClass}" title="${row.return_status_name}">${row.return_status_code}</span>` 
        : '<span style="color:var(--text-muted);font-size:11px;">-</span>';

      rowsHtml += `
        <tr>
          <td>
            <span class="doc-no" data-doc="${row.doc_no}" title="Click to view all revision history">${row.doc_no}</span>
            <div style="font-size:11px;color:var(--text-muted);display:flex;align-items:center;gap:6px;margin-top:2px;">
              <span>${row.submittal_id}</span>
              <span class="badge-tag" style="font-size:10px;padding:0 5px;">${row.doc_category || ''}</span>
            </div>
          </td>
          <td style="text-align:center;">
            <span class="rev-badge">${row.rev}</span>
          </td>
          <td>
            <div style="font-weight:500;">${row.discipline_name}</div>
          </td>
          <td>
            <div class="doc-title-cell" title="${row.doc_title}">${row.doc_title}</div>
          </td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${row.actual_submit_in || '-'}</td>
          <td style="font-family:'JetBrains Mono',monospace;font-size:12px;">${row.actual_submit_out || '<span style="color:var(--color-pending)">Under Review</span>'}</td>
          <td style="text-align:right;">${durDisplay}</td>
          <td style="text-align:center;">${catBadge}</td>
          <td style="text-align:center;">${statusBadge}</td>
          <td style="text-align:center;">
            <button class="btn btn-secondary btn-history" data-doc="${row.doc_no}" style="padding:4px 8px;font-size:11px;">
              History
            </button>
          </td>
        </tr>
      `;
    });

    el.tableBody.innerHTML = rowsHtml;

    // Attach click events for document history drawer
    el.tableBody.querySelectorAll('[data-doc]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const docNo = btn.getAttribute('data-doc');
        openHistoryDrawer(docNo);
      });
    });

    // Render Pagination Controls
    renderPagination(total);
  }

  function renderPagination(total) {
    const totalPages = Math.ceil(total / state.pageSize) || 1;
    el.paginationInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;

    let controlsHtml = '';

    // First & Prev Buttons
    controlsHtml += `
      <button class="page-btn" id="btnPageFirst" ${state.currentPage === 1 ? 'disabled' : ''} title="First Page">&laquo;</button>
      <button class="page-btn" id="btnPagePrev" ${state.currentPage === 1 ? 'disabled' : ''} title="Previous Page">&lsaquo;</button>
    `;

    // Visible page numbers window
    const maxButtons = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
      controlsHtml += `
        <button class="page-btn ${p === state.currentPage ? 'active' : ''}" data-page="${p}">${p}</button>
      `;
    }

    // Next & Last Buttons
    controlsHtml += `
      <button class="page-btn" id="btnPageNext" ${state.currentPage === totalPages ? 'disabled' : ''} title="Next Page">&rsaquo;</button>
      <button class="page-btn" id="btnPageLast" ${state.currentPage === totalPages ? 'disabled' : ''} title="Last Page">&raquo;</button>
    `;

    el.paginationControls.innerHTML = controlsHtml;

    // Attach pagination listeners
    el.paginationControls.querySelectorAll('[data-page]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.currentPage = parseInt(btn.getAttribute('data-page'), 10);
        renderTable();
      });
    });

    const btnFirst = document.getElementById('btnPageFirst');
    const btnPrev = document.getElementById('btnPagePrev');
    const btnNext = document.getElementById('btnPageNext');
    const btnLast = document.getElementById('btnPageLast');

    if (btnFirst) btnFirst.addEventListener('click', () => { state.currentPage = 1; renderTable(); });
    if (btnPrev) btnPrev.addEventListener('click', () => { if (state.currentPage > 1) { state.currentPage--; renderTable(); } });
    if (btnNext) btnNext.addEventListener('click', () => { if (state.currentPage < totalPages) { state.currentPage++; renderTable(); } });
    if (btnLast) btnLast.addEventListener('click', () => { state.currentPage = totalPages; renderTable(); });
  }

  // Document Revision History Drawer
  function openHistoryDrawer(docNo) {
    const revisions = state.docsMap.get(docNo) || [];
    if (revisions.length === 0) return;

    // Sort chronologically by submit in
    const sorted = [...revisions].sort((a, b) => {
      const dtA = parseDateObj(a.actual_submit_in) || new Date(0);
      const dtB = parseDateObj(b.actual_submit_in) || new Date(0);
      return dtA - dtB;
    });

    const first = sorted[0];
    el.drawerDocNo.textContent = docNo;
    el.drawerDocTitle.textContent = first.doc_title || 'No Title';
    el.drawerDiscipline.textContent = first.discipline_name || 'Unassigned';
    el.drawerRevCount.textContent = `${sorted.length} (${sorted.map(s => s.rev).join(' → ')})`;

    let timelineHtml = '';
    sorted.forEach((revItem, idx) => {
      let dotClass = 'pending';
      let badge = '';

      if (revItem.category === '<= 10 Days') {
        dotClass = 'within10';
        badge = `<span class="badge-category badge-within10">Meet Agreement (${revItem.duration_days} Working Days)</span>`;
      } else if (revItem.category === '> 10 Days') {
        dotClass = 'over10';
        badge = `<span class="badge-category badge-over10">Over Agreement (${revItem.duration_days} Working Days)</span>`;
      } else {
        dotClass = 'pending';
        badge = `<span class="badge-category badge-pending">Currently Under Review</span>`;
      }

      timelineHtml += `
        <div class="timeline-item">
          <div class="timeline-dot ${dotClass}"></div>
          <div class="timeline-card">
            <div class="timeline-card-header">
              <span class="rev-badge" style="font-size:13px;padding:3px 9px;">Rev ${revItem.rev}</span>
              ${badge}
            </div>
            <div class="timeline-dates">
              <div>
                <div class="timeline-date-label">Contractor Submitted:</div>
                <div class="timeline-date-val">${revItem.actual_submit_in || '-'}</div>
              </div>
              <div>
                <div class="timeline-date-label">Client Returned:</div>
                <div class="timeline-date-val">${revItem.actual_submit_out || '<span style="color:var(--color-pending)">Pending</span>'}</div>
              </div>
            </div>
            <div style="font-size:12px;color:var(--text-muted);display:flex;align-items:center;justify-content:space-between;border-top:1px solid var(--border-color);padding-top:8px;">
              <span>Submittal ID: <strong>${revItem.submittal_id}</strong></span>
              <span>Status: <strong>${revItem.return_status_name || revItem.return_status_code || 'Pending'}</strong></span>
            </div>
          </div>
        </div>
      `;
    });

    el.drawerTimeline.innerHTML = timelineHtml;
    el.drawerBackdrop.classList.add('open');
  }

  function closeHistoryDrawer() {
    el.drawerBackdrop.classList.remove('open');
  }

  // Set Category Filter from Pills or Donut
  function setCategoryFilter(category) {
    state.activeCategory = category;
    el.categoryPills.querySelectorAll('.pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-category') === category);
    });
    applyFilters();
  }

  // Export Filtered Table to CSV
  function exportToCsv() {
    if (state.filteredData.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Submittal ID',
      'Document No.',
      'Rev.',
      'Document Title',
      'Discipline',
      'Doc Type',
      'Contractor Actual Submit In',
      'Client Actual Submit Out',
      'Duration (Days)',
      'Review Category',
      'Return Status Code',
      'Return Status Name'
    ];

    const rows = state.filteredData.map(d => [
      `"${d.submittal_id || ''}"`,
      `"${d.doc_no || ''}"`,
      `"${d.rev || ''}"`,
      `"${(d.doc_title || '').replace(/"/g, '""')}"`,
      `"${d.discipline_name || ''}"`,
      `"${d.doc_type_name || ''}"`,
      `"${d.actual_submit_in || ''}"`,
      `"${d.actual_submit_out || ''}"`,
      d.duration_days !== null && d.duration_days !== undefined ? d.duration_days : '',
      `"${d.category || ''}"`,
      `"${d.return_status_code || ''}"`,
      `"${d.return_status_name || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ASK_Doc_Review_Report_${state.activeCategory.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Theme Management
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    updateThemeIcon();

    el.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('ask_dash_theme', state.theme);
      updateThemeIcon();
    });
  }

  function updateThemeIcon() {
    if (state.theme === 'dark') {
      el.themeIcon.innerHTML = `
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      `;
    } else {
      el.themeIcon.innerHTML = `
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      `;
    }
  }

  // Event Listeners Setup
  function initListeners() {
    // Search input (debounced)
    let searchTimer;
    el.searchInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.searchQuery = el.searchInput.value;
        applyFilters();
      }, 250);
    });

    // Dropdowns
    el.disciplineSelect.addEventListener('change', () => {
      state.activeDiscipline = el.disciplineSelect.value;
      applyFilters();
    });

    el.revSelect.addEventListener('change', () => {
      state.activeRev = el.revSelect.value;
      applyFilters();
    });

    el.statusSelect.addEventListener('change', () => {
      state.activeStatus = el.statusSelect.value;
      applyFilters();
    });

    // Category Pills
    el.categoryPills.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-category');
        setCategoryFilter(cat);
      });
    });

    // Page Size
    el.pageSizeSelect.addEventListener('change', () => {
      state.pageSize = parseInt(el.pageSizeSelect.value, 10);
      state.currentPage = 1;
      renderTable();
    });

    // Document Category Scope Tabs (Part B focus by default, Part A & Part E optional)
    document.querySelectorAll('.doc-category-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.doc-category-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeDocCategory = tab.getAttribute('data-category-scope');
        applyFilters();
      });
    });

    // Reset Filters
    el.resetFiltersBtn.addEventListener('click', () => {
      state.searchQuery = '';
      el.searchInput.value = '';
      state.activeCategory = 'ALL';
      state.activeDocCategory = 'Part B - Engineering Doc'; // Reset back to default focus Part B
      state.activeDiscipline = 'ALL';
      el.disciplineSelect.value = 'ALL';
      state.activeRev = 'ALL';
      el.revSelect.value = 'ALL';
      state.activeStatus = 'ALL';
      el.statusSelect.value = 'ALL';
      state.activeTier = null; // Clear tier filter

      // Reset category scope tabs
      document.querySelectorAll('.doc-category-tab').forEach(t => {
        t.classList.toggle('active', t.getAttribute('data-category-scope') === 'Part B - Engineering Doc');
      });

      el.categoryPills.querySelectorAll('.pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-category') === 'ALL');
      });
      applyFilters();
    });

    // Tier Modal Search Input (debounced)
    if (el.tierDocSearchInput) {
      let tierSearchTimer;
      el.tierDocSearchInput.addEventListener('input', () => {
        clearTimeout(tierSearchTimer);
        tierSearchTimer = setTimeout(() => {
          state.tierModalSearchQuery = el.tierDocSearchInput.value;
          renderTierModalDocs();
        }, 200);
      });
    }

    // Filter main dashboard by this tier button
    if (el.btnFilterMainByTier) {
      el.btnFilterMainByTier.addEventListener('click', () => {
        if (state.currentTier) {
          state.activeTier = state.currentTier;
          if (state.tierModalSelectedDisc !== 'ALL') {
            state.activeDiscipline = state.tierModalSelectedDisc;
            el.disciplineSelect.value = state.tierModalSelectedDisc;
          }
          closeTierModal();
          applyFilters();

          // Smooth scroll to table
          const tableCard = document.querySelector('.table-card');
          if (tableCard) {
            tableCard.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    // Clear Tier Filter Button
    if (el.clearTierFilterBtn) {
      el.clearTierFilterBtn.addEventListener('click', () => {
        state.activeTier = null;
        applyFilters();
      });
    }

    // Tier Modal Close Listeners
    if (el.tierModalCloseBtn) el.tierModalCloseBtn.addEventListener('click', closeTierModal);
    if (el.tierModalBackdrop) {
      el.tierModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.tierModalBackdrop) {
          closeTierModal();
        }
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && el.tierModalBackdrop.classList.contains('open')) {
        closeTierModal();
      }
    });

    // CSV Export
    el.exportCsvBtn.addEventListener('click', exportToCsv);

    // Table Header Sorting
    el.mainDocTable.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort');
        if (state.sortField === field) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = field;
          state.sortDirection = field === 'duration_days' ? 'desc' : 'asc';
        }

        // Update sorting indicators
        el.mainDocTable.querySelectorAll('th[data-sort]').forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
        });
        th.classList.add(state.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');

        sortData();
        renderTable();
      });
    });

    // Drawer Close Listeners
    el.drawerCloseBtn.addEventListener('click', closeHistoryDrawer);
    el.drawerBackdrop.addEventListener('click', (e) => {
      if (e.target === el.drawerBackdrop) {
        closeHistoryDrawer();
      }
    });

    // SLA Modal Listeners
    if (el.openSlaDefBtn) el.openSlaDefBtn.addEventListener('click', openSlaModal);
    if (el.slaBadgeBtn) el.slaBadgeBtn.addEventListener('click', openSlaModal);
    if (el.closeSlaModalBtn) el.closeSlaModalBtn.addEventListener('click', closeSlaModal);
    if (el.closeSlaModalBtn2) el.closeSlaModalBtn2.addEventListener('click', closeSlaModal);
    if (el.slaModalBackdrop) {
      el.slaModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.slaModalBackdrop) closeSlaModal();
      });
    }

    // Upload Modal Listeners
    if (el.openUploadBtn) el.openUploadBtn.addEventListener('click', openUploadModal);
    if (el.closeUploadModalBtn) el.closeUploadModalBtn.addEventListener('click', closeUploadModal);
    if (el.closeUploadModalBtn2) el.closeUploadModalBtn2.addEventListener('click', closeUploadModal);
    if (el.uploadModalBackdrop) {
      el.uploadModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.uploadModalBackdrop) closeUploadModal();
      });
    }

    // Upload Dropzone & File Input
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

    // Escape Key Handler for All Modals & Drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el.drawerBackdrop && el.drawerBackdrop.classList.contains('open')) closeHistoryDrawer();
        if (el.tierModalBackdrop && el.tierModalBackdrop.classList.contains('open')) closeTierModal();
        if (el.slaModalBackdrop && el.slaModalBackdrop.classList.contains('open')) closeSlaModal();
        if (el.uploadModalBackdrop && el.uploadModalBackdrop.classList.contains('open')) closeUploadModal();
      }
    });
  }

  function initReportDate() {
    const dateEl = document.getElementById('headerReportDate');
    if (!dateEl) return;
    if (window.TECH_REPORT_DATE) {
      dateEl.textContent = `Report Date: ${window.TECH_REPORT_DATE}`;
      return;
    }
    if (state.rawData && state.rawData.length > 0) {
      let maxDate = null;
      for (const item of state.rawData) {
        const dStr = item.actual_submit_out || item.actual_submit_in;
        if (dStr) {
          const d = new Date(dStr);
          if (!isNaN(d.getTime()) && (!maxDate || d > maxDate)) {
            maxDate = d;
          }
        }
      }
      if (maxDate) {
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const day = String(maxDate.getDate()).padStart(2, '0');
        const mon = months[maxDate.getMonth()];
        const yr = maxDate.getFullYear();
        dateEl.textContent = `Report Date: ${day}-${mon}-${yr}`;
      }
    }
  }

  // Bootstrap Application
  function init() {
    initTheme();
    initReportDate();
    initDataIndex();
    initListeners();
    applyFilters();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
