/**
 * ASK Vendor Document Review Duration Dashboard - Application Logic
 */

(function () {
  'use strict';

  // State Management
  const state = {
    rawData: window.RAW_VENDOR_DATA || [],
    filteredData: [],
    currentPage: 1,
    pageSize: 25,
    sortField: 'actual_submit_in',
    sortDirection: 'desc',
    activeCategory: 'ALL',       // ALL | <= 10 Days | > 10 Days | Pending
    activePackage: 'ALL',        // ALL or Package Name
    activeDiscipline: 'ALL',     // ALL or Discipline Name
    activeRev: 'ALL',            // ALL or Rev
    activeStatus: 'ALL',         // ALL or Return Status Name
    activeTier: null,            // Duration Tier Filter
    tierModalSelectedDisc: 'ALL',
    tierModalSearchQuery: '',
    currentTier: null,
    currentTierItems: [],
    searchQuery: '',
    theme: localStorage.getItem('ask_vendor_theme') || 'dark',
    docsMap: new Map()           // Grouping by doc_no for multi-revision lookup
  };

  // DOM Elements
  const el = {
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    themeIcon: document.getElementById('themeIcon'),
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    searchInput: document.getElementById('searchInput'),
    disciplineSelect: document.getElementById('disciplineSelect'),
    packageSelect: document.getElementById('packageSelect'),
    revSelect: document.getElementById('revSelect'),
    statusSelect: document.getElementById('statusSelect'),
    categoryPills: document.getElementById('categoryPills'),
    vendorPkgNav: document.getElementById('vendorPkgNav'),
    filterStatusText: document.getElementById('filterStatusText'),

    // KPI Elements
    kpiTotal: document.getElementById('kpiTotal'),
    kpiUniqueDocs: document.getElementById('kpiUniqueDocs'),
    kpiWithin10: document.getElementById('kpiWithin10'),
    kpiWithinPct: document.getElementById('kpiWithinPct'),
    kpiOver10: document.getElementById('kpiOver10'),
    kpiOverPct: document.getElementById('kpiOverPct'),
    kpiPending: document.getElementById('kpiPending'),
    kpiPendingPct: document.getElementById('kpiPendingPct'),
    kpiAvgDuration: document.getElementById('kpiAvgDuration'),

    // Pill Counts
    countAll: document.getElementById('countAll'),
    countWithin: document.getElementById('countWithin'),
    countOver: document.getElementById('countOver'),
    countPending: document.getElementById('countPending'),

    // Charts & Tables
    donutChartContainer: document.getElementById('donutChartContainer'),
    tierChartContainer: document.getElementById('tierChartContainer'),
    packageChartContainer: document.getElementById('packageChartContainer'),
    mainDocTable: document.getElementById('mainDocTable'),
    tableBody: document.getElementById('tableBody'),
    tableRecordCountText: document.getElementById('tableRecordCountText'),
    pageSizeSelect: document.getElementById('pageSizeSelect'),
    paginationInfo: document.getElementById('paginationInfo'),
    paginationControls: document.getElementById('paginationControls'),

    // Drawer Elements
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    historyDrawer: document.getElementById('historyDrawer'),
    drawerCloseBtn: document.getElementById('drawerCloseBtn'),
    drawerDocNo: document.getElementById('drawerDocNo'),
    drawerDocTitle: document.getElementById('drawerDocTitle'),
    drawerPackage: document.getElementById('drawerPackage'),
    drawerDiscipline: document.getElementById('drawerDiscipline'),
    drawerRevCount: document.getElementById('drawerRevCount'),
    drawerTimeline: document.getElementById('drawerTimeline'),

    // Tier Modal Elements
    tierModalBackdrop: document.getElementById('tierModalBackdrop'),
    tierModalCloseBtn: document.getElementById('tierModalCloseBtn'),
    tierModalBadge: document.getElementById('tierModalBadge'),
    tierModalTitle: document.getElementById('tierModalTitle'),
    tierModalSubtitle: document.getElementById('tierModalSubtitle'),
    tierModalCountBadge: document.getElementById('tierModalCountBadge'),
    tierDisciplineChips: document.getElementById('tierDisciplineChips'),
    tierDocTableBody: document.getElementById('tierDocTableBody'),
    tierDocSearchInput: document.getElementById('tierDocSearchInput'),
    btnFilterMainByTier: document.getElementById('btnFilterMainByTier'),
    activeTierBadge: document.getElementById('activeTierBadge'),
    activeTierLabel: document.getElementById('activeTierLabel'),
    clearTierFilterBtn: document.getElementById('clearTierFilterBtn'),

    // SLA & Upload Modal Elements
    openSlaDefBtn: document.getElementById('openSlaDefBtn'),
    slaBadgeBtn: document.getElementById('slaBadgeBtn'),
    slaModalBackdrop: document.getElementById('slaModalBackdrop'),
    slaModalCloseBtn: document.getElementById('slaModalCloseBtn'),
    openUploadBtn: document.getElementById('openUploadBtn'),
    uploadModalBackdrop: document.getElementById('uploadModalBackdrop'),
    uploadModalCloseBtn: document.getElementById('uploadModalCloseBtn'),
    uploadDropzone: document.getElementById('uploadDropzone'),
    fileUploadInput: document.getElementById('fileUploadInput'),
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
    const packages = new Set();
    const revisions = new Set();
    const statuses = new Set();

    state.rawData.forEach(d => {
      if (d.discipline_name) disciplines.add(d.discipline_name);
      if (d.vendor_package_name) packages.add(d.vendor_package_name);
      if (d.rev) revisions.add(d.rev);
      if (d.return_status_name) statuses.add(d.return_status_name);
    });

    // Discipline select
    const sortedDiscs = Array.from(disciplines).sort();
    sortedDiscs.forEach(disc => {
      const opt = document.createElement('option');
      opt.value = disc;
      const count = state.rawData.filter(x => x.discipline_name === disc).length;
      opt.textContent = `${disc} (${formatNumber(count)})`;
      el.disciplineSelect.appendChild(opt);
    });

    // Package select
    const sortedPkgs = Array.from(packages).sort();
    sortedPkgs.forEach(pkg => {
      const opt = document.createElement('option');
      opt.value = pkg;
      const count = state.rawData.filter(x => x.vendor_package_name === pkg).length;
      opt.textContent = `${pkg} (${formatNumber(count)})`;
      el.packageSelect.appendChild(opt);
    });

    // Revision select
    const sortedRevs = Array.from(revisions).sort();
    sortedRevs.forEach(rev => {
      const opt = document.createElement('option');
      opt.value = rev;
      const count = state.rawData.filter(x => x.rev === rev).length;
      opt.textContent = `Rev ${rev} (${formatNumber(count)})`;
      el.revSelect.appendChild(opt);
    });

    // Status select
    const sortedStatuses = Array.from(statuses).sort();
    sortedStatuses.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      const count = state.rawData.filter(x => x.return_status_name === st).length;
      opt.textContent = `${st} (${formatNumber(count)})`;
      el.statusSelect.appendChild(opt);
    });
  }

  // Filter Data
  function applyFilters() {
    let result = state.rawData;

    // Package Nav Scope Filter
    if (state.activePackage !== 'ALL') {
      result = result.filter(item => item.vendor_package_name === state.activePackage);
    }

    // Category / SLA Pill Filter
    if (state.activeCategory !== 'ALL') {
      result = result.filter(item => item.category === state.activeCategory);
    }

    // Discipline Filter
    if (state.activeDiscipline !== 'ALL') {
      result = result.filter(item => item.discipline_name === state.activeDiscipline);
    }

    // Revision Filter
    if (state.activeRev !== 'ALL') {
      result = result.filter(item => item.rev === state.activeRev);
    }

    // Status Filter
    if (state.activeStatus !== 'ALL') {
      result = result.filter(item => item.return_status_name === state.activeStatus);
    }

    // Duration Tier Filter
    if (state.activeTier) {
      result = result.filter(item => {
        if (item.category === 'Pending' || item.duration_days === null) return false;
        const dur = item.duration_days;
        if (state.activeTier.min !== null && dur < state.activeTier.min) return false;
        if (state.activeTier.max !== null && dur > state.activeTier.max) return false;
        return true;
      });
    }

    // Free Search Filter
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        return (
          (item.doc_no && item.doc_no.toLowerCase().includes(q)) ||
          (item.doc_title && item.doc_title.toLowerCase().includes(q)) ||
          (item.submittal_id && item.submittal_id.toLowerCase().includes(q)) ||
          (item.vendor_package_name && item.vendor_package_name.toLowerCase().includes(q)) ||
          (item.discipline_name && item.discipline_name.toLowerCase().includes(q)) ||
          (item.return_status_name && item.return_status_name.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      let valA = a[state.sortField];
      let valB = b[state.sortField];

      if (state.sortField === 'actual_submit_in' || state.sortField === 'actual_submit_out') {
        valA = parseDateObj(valA) || (state.sortDirection === 'asc' ? new Date(9999, 0) : new Date(0));
        valB = parseDateObj(valB) || (state.sortDirection === 'asc' ? new Date(9999, 0) : new Date(0));
      } else if (state.sortField === 'duration_days') {
        valA = valA !== null ? valA : (state.sortDirection === 'asc' ? 999999 : -1);
        valB = valB !== null ? valB : (state.sortDirection === 'asc' ? 999999 : -1);
      } else {
        valA = (valA || '').toString().toLowerCase();
        valB = (valB || '').toString().toLowerCase();
      }

      if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    state.filteredData = result;
    state.currentPage = 1;

    renderKPIs();
    renderCharts();
    renderTable();
    updateFilterStatusText();
  }

  function updateFilterStatusText() {
    const total = state.filteredData.length;
    let desc = `Showing ${formatNumber(total)} of ${formatNumber(state.rawData.length)} submissions`;
    if (state.activePackage !== 'ALL') {
      desc += ` &bull; Package: <strong>${state.activePackage}</strong>`;
    }
    if (state.activeCategory !== 'ALL') {
      desc += ` &bull; Status: <strong>${state.activeCategory}</strong>`;
    }
    if (state.activeTier) {
      desc += ` &bull; Tier: <strong>${state.activeTier.label}</strong>`;
    }
    el.filterStatusText.innerHTML = desc;
  }

  // Render KPI Metrics
  function renderKPIs() {
    const data = state.filteredData;
    const total = data.length;

    const uniqueDocs = new Set(data.map(d => d.doc_no)).size;
    const completed = data.filter(d => d.category !== 'Pending' && d.duration_days !== null);
    const within10 = data.filter(d => d.category === '<= 10 Days');
    const over10 = data.filter(d => d.category === '> 10 Days');
    const pending = data.filter(d => d.category === 'Pending');

    const withinPct = completed.length > 0 ? ((within10.length / completed.length) * 100).toFixed(1) : '0.0';
    const overPct = completed.length > 0 ? ((over10.length / completed.length) * 100).toFixed(1) : '0.0';
    const pendingPct = total > 0 ? ((pending.length / total) * 100).toFixed(1) : '0.0';

    let avgDur = 0;
    if (completed.length > 0) {
      const sum = completed.reduce((acc, d) => acc + (d.duration_days || 0), 0);
      avgDur = (sum / completed.length).toFixed(1);
    }

    el.kpiTotal.textContent = formatNumber(total);
    el.kpiUniqueDocs.textContent = formatNumber(uniqueDocs);

    el.kpiWithin10.textContent = formatNumber(within10.length);
    el.kpiWithinPct.textContent = `${withinPct}%`;

    el.kpiOver10.textContent = formatNumber(over10.length);
    el.kpiOverPct.textContent = `${overPct}%`;

    el.kpiPending.textContent = formatNumber(pending.length);
    el.kpiPendingPct.textContent = `${pendingPct}%`;

    el.kpiAvgDuration.innerHTML = `${avgDur} <span style="font-size:16px; font-weight:500; color:var(--text-secondary);">WD</span>`;

    // Update Category Pill Counts
    el.countAll.textContent = formatNumber(total);
    el.countWithin.textContent = formatNumber(within10.length);
    el.countOver.textContent = formatNumber(over10.length);
    el.countPending.textContent = formatNumber(pending.length);
  }

  // Render Charts
  function renderCharts() {
    renderDonutChart();
    renderTierChart();
    renderPackageChart();
  }

  // Donut Chart: Agreement Compliance
  function renderDonutChart() {
    const container = el.donutChartContainer;
    container.innerHTML = '';

    const completed = state.filteredData.filter(d => d.category !== 'Pending' && d.duration_days !== null);
    const within10 = completed.filter(d => d.category === '<= 10 Days').length;
    const over10 = completed.filter(d => d.category === '> 10 Days').length;
    const pending = state.filteredData.filter(d => d.category === 'Pending').length;
    const total = state.filteredData.length;

    if (total === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:13px;">No data matching current filters</div>';
      return;
    }

    const withinPct = completed.length > 0 ? Math.round((within10 / completed.length) * 100) : 0;
    const overPct = completed.length > 0 ? Math.round((over10 / completed.length) * 100) : 0;

    const size = 180;
    const strokeWidth = 24;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const wLen = (within10 / total) * circumference;
    const oLen = (over10 / total) * circumference;
    const pLen = (pending / total) * circumference;

    const wOffset = 0;
    const oOffset = -wLen;
    const pOffset = -(wLen + oLen);

    const svg = `
      <div style="display:flex; align-items:center; justify-content:center; gap:30px; flex-wrap:wrap; width:100%;">
        <div style="position:relative; width:${size}px; height:${size}px;">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform: rotate(-90deg); border-radius:50%;">
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="transparent" stroke="rgba(255,255,255,0.05)" stroke-width="${strokeWidth}"/>
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="transparent" stroke="#10b981" stroke-width="${strokeWidth}"
              stroke-dasharray="${wLen} ${circumference}" stroke-dashoffset="${wOffset}" style="transition: stroke-dasharray 0.6s ease;"/>
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="transparent" stroke="#f43f5e" stroke-width="${strokeWidth}"
              stroke-dasharray="${oLen} ${circumference}" stroke-dashoffset="${oOffset}" style="transition: stroke-dasharray 0.6s ease;"/>
            <circle cx="${size/2}" cy="${size/2}" r="${radius}" fill="transparent" stroke="#f59e0b" stroke-width="${strokeWidth}"
              stroke-dasharray="${pLen} ${circumference}" stroke-dashoffset="${pOffset}" style="transition: stroke-dasharray 0.6s ease;"/>
          </svg>
          <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
            <span style="font-size:24px; font-weight:800; color:var(--text-primary); line-height:1;">${withinPct}%</span>
            <span style="font-size:11px; font-weight:600; color:#10b981; margin-top:2px;">Meet SLA</span>
          </div>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px; min-width:180px;">
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:10px; height:10px; border-radius:3px; background:#10b981;"></span>
              <span style="color:var(--text-secondary);">&le; 10 Working Days:</span>
            </div>
            <strong style="color:var(--text-primary);">${formatNumber(within10)} (${withinPct}%)</strong>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:10px; height:10px; border-radius:3px; background:#f43f5e;"></span>
              <span style="color:var(--text-secondary);">> 10 Working Days:</span>
            </div>
            <strong style="color:var(--text-primary);">${formatNumber(over10)} (${overPct}%)</strong>
          </div>
          <div style="display:flex; align-items:center; justify-content:space-between; font-size:12px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:10px; height:10px; border-radius:3px; background:#f59e0b;"></span>
              <span style="color:var(--text-secondary);">Pending Review:</span>
            </div>
            <strong style="color:var(--text-primary);">${formatNumber(pending)}</strong>
          </div>
        </div>
      </div>
    `;
    container.innerHTML = svg;
  }

  // Duration Distribution Tiers Chart
  function renderTierChart() {
    const container = el.tierChartContainer;
    container.innerHTML = '';

    const tiers = [
      { label: '≤ 5 WD', min: 0, max: 5, color: '#10b981' },
      { label: '6 - 10 WD', min: 6, max: 10, color: '#34d399' },
      { label: '11 - 15 WD', min: 11, max: 15, color: '#fbbf24' },
      { label: '16 - 20 WD', min: 16, max: 20, color: '#fb923c' },
      { label: '> 20 WD', min: 21, max: null, color: '#f43f5e' }
    ];

    const completed = state.filteredData.filter(d => d.category !== 'Pending' && d.duration_days !== null);
    const totalComp = completed.length;

    if (totalComp === 0) {
      container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted); font-size:13px;">No completed reviews to display</div>';
      return;
    }

    const counts = tiers.map(t => {
      const items = completed.filter(d => {
        const dur = d.duration_days;
        if (t.min !== null && dur < t.min) return false;
        if (t.max !== null && dur > t.max) return false;
        return true;
      });
      return { ...t, count: items.length, items };
    });

    const maxCount = Math.max(...counts.map(c => c.count), 1);

    let html = `<div style="display:flex; flex-direction:column; gap:12px; padding:10px 0;">`;
    counts.forEach(t => {
      const pct = totalComp > 0 ? ((t.count / totalComp) * 100).toFixed(1) : 0;
      const barWidth = Math.max((t.count / maxCount) * 100, 4);
      const isSelected = state.activeTier && state.activeTier.label === t.label;

      html += `
        <div class="tier-bar-row ${isSelected ? 'active' : ''}" data-tier-label="${t.label}" style="display:flex; align-items:center; gap:12px; cursor:pointer; padding:8px 12px; border-radius:8px; transition:all 0.2s; ${isSelected ? 'background:rgba(56,189,248,0.15); border:1px solid rgba(56,189,248,0.3);' : ''}">
          <div style="width:80px; font-size:12px; font-weight:600; color:var(--text-secondary); text-align:right;">
            ${t.label}
          </div>
          <div style="flex:1; height:24px; background:rgba(255,255,255,0.04); border-radius:6px; overflow:hidden; position:relative;">
            <div style="width:${barWidth}%; height:100%; background:${t.color}; border-radius:6px; transition:width 0.5s ease; opacity:${isSelected ? '1' : '0.85'};"></div>
            <span style="position:absolute; right:8px; top:50%; transform:translateY(-50%); font-size:11px; font-weight:600; color:var(--text-primary);">
              ${formatNumber(t.count)} (${pct}%)
            </span>
          </div>
          <button type="button" class="tier-inspect-btn" style="cursor:pointer; display:inline-flex; align-items:center; gap:4px; font-size:11px; padding:4px 8px; border-radius:6px; background:var(--bg-card); border:1px solid var(--border-color); color:var(--text-primary); transition:all 0.2s;">
            View Details 🔍
          </button>
        </div>
      `;
    });
    html += `</div>`;
    container.innerHTML = html;

    // Attach click events to bars to open drilldown modal
    container.querySelectorAll('.tier-bar-row').forEach(row => {
      row.addEventListener('click', () => {
        const tierLabel = row.dataset.tierLabel;
        const tierObj = counts.find(c => c.label === tierLabel);
        if (tierObj) {
          openTierModal(tierObj);
        }
      });
    });
  }

  // Vendor Package Breakdown Chart
  function renderPackageChart() {
    const container = el.packageChartContainer;
    container.innerHTML = '';

    const data = state.filteredData;
    if (data.length === 0) {
      container.innerHTML = '<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:20px;">No package records found</div>';
      return;
    }

    // Group by package
    const pkgMap = new Map();
    data.forEach(item => {
      const pkg = item.vendor_package_name || 'General';
      if (!pkgMap.has(pkg)) {
        pkgMap.set(pkg, { name: pkg, total: 0, completed: 0, within10: 0, over10: 0, pending: 0, durSum: 0 });
      }
      const entry = pkgMap.get(pkg);
      entry.total++;
      if (item.category === 'Pending') {
        entry.pending++;
      } else if (item.duration_days !== null) {
        entry.completed++;
        entry.durSum += item.duration_days;
        if (item.category === '<= 10 Days') entry.within10++;
        else if (item.category === '> 10 Days') entry.over10++;
      }
    });

    const pkgList = Array.from(pkgMap.values()).sort((a, b) => b.total - a.total);

    let tableHtml = `
      <table class="data-table" style="font-size:12px; margin-top:6px;">
        <thead>
          <tr>
            <th>Vendor Equipment Package</th>
            <th style="text-align:center;">Total Submittals</th>
            <th style="text-align:center;">Completed Reviews</th>
            <th style="text-align:center;">Within 10 WD</th>
            <th style="text-align:center;">Over 10 WD</th>
            <th style="text-align:center;">Pending</th>
            <th style="text-align:right;">Avg Review (WD)</th>
            <th style="min-width:140px;">SLA Agreement Rate</th>
          </tr>
        </thead>
        <tbody>
    `;

    pkgList.forEach(pkg => {
      const avgDur = pkg.completed > 0 ? (pkg.durSum / pkg.completed).toFixed(1) : '-';
      const complianceRate = pkg.completed > 0 ? Math.round((pkg.within10 / pkg.completed) * 100) : 0;
      const isSelected = state.activePackage === pkg.name;

      tableHtml += `
        <tr class="package-row" data-package="${pkg.name}" style="cursor:pointer; ${isSelected ? 'background:rgba(56,189,248,0.12);' : ''}">
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:8px; height:8px; border-radius:50%; background:#38bdf8;"></span>
              <strong>${pkg.name}</strong>
            </div>
          </td>
          <td style="text-align:center;">${formatNumber(pkg.total)}</td>
          <td style="text-align:center; font-weight:600;">${formatNumber(pkg.completed)}</td>
          <td style="text-align:center; color:#10b981; font-weight:600;">${formatNumber(pkg.within10)}</td>
          <td style="text-align:center; color:#f43f5e; font-weight:600;">${formatNumber(pkg.over10)}</td>
          <td style="text-align:center; color:#f59e0b;">${formatNumber(pkg.pending)}</td>
          <td style="text-align:right; font-weight:700;">${avgDur}</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="flex:1; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
                <div style="width:${complianceRate}%; height:100%; background:${complianceRate >= 80 ? '#10b981' : '#f59e0b'}; border-radius:4px;"></div>
              </div>
              <span style="font-size:11px; font-weight:700; color:${complianceRate >= 80 ? '#10b981' : '#f59e0b'}; width:36px; text-align:right;">
                ${pkg.completed > 0 ? complianceRate + '%' : 'N/A'}
              </span>
            </div>
          </td>
        </tr>
      `;
    });

    tableHtml += `</tbody></table>`;
    container.innerHTML = tableHtml;

    // Attach click events on package rows to filter dashboard
    container.querySelectorAll('.package-row').forEach(row => {
      row.addEventListener('click', () => {
        const pkgName = row.dataset.package;
        if (state.activePackage === pkgName) {
          state.activePackage = 'ALL';
        } else {
          state.activePackage = pkgName;
        }
        updatePackageTabs();
        applyFilters();
      });
    });
  }

  function updatePackageTabs() {
    el.vendorPkgNav.querySelectorAll('.pkg-tab').forEach(tab => {
      if (tab.dataset.package === state.activePackage) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    el.packageSelect.value = state.activePackage;
  }

  // Render Data Table
  function renderTable() {
    const data = state.filteredData;
    const total = data.length;

    let pageSize = state.pageSize === 'ALL' ? total : parseInt(state.pageSize, 10);
    const totalPages = Math.ceil(total / (pageSize || 1)) || 1;

    if (state.currentPage > totalPages) state.currentPage = totalPages;
    const startIdx = (state.currentPage - 1) * pageSize;
    const endIdx = pageSize === total ? total : Math.min(startIdx + pageSize, total);

    const pageData = data.slice(startIdx, endIdx);

    el.tableRecordCountText.textContent = total > 0 
      ? `Showing ${startIdx + 1}–${endIdx} of ${formatNumber(total)} records`
      : 'No records found';

    el.paginationInfo.textContent = `Page ${state.currentPage} of ${totalPages}`;

    // Table rows
    let rowsHtml = '';
    if (pageData.length === 0) {
      rowsHtml = `
        <tr>
          <td colspan="12" style="text-align:center; padding:30px; color:var(--text-muted);">
            No vendor documents found matching the selected filters.
          </td>
        </tr>
      `;
    } else {
      pageData.forEach(d => {
        let badgeHtml = '';
        if (d.category === '<= 10 Days') {
          badgeHtml = `<span class="badge-tag" style="background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-weight:600;">Meet Agreement (&le; 10 WD)</span>`;
        } else if (d.category === '> 10 Days') {
          badgeHtml = `<span class="badge-tag" style="background:rgba(244,63,94,0.15); color:#f43f5e; border:1px solid rgba(244,63,94,0.3); font-weight:600;">Over Agreement (> 10 WD)</span>`;
        } else {
          badgeHtml = `<span class="badge-tag" style="background:rgba(245,158,11,0.15); color:#f59e0b; border:1px solid rgba(245,158,11,0.3); font-weight:600;">Pending Review</span>`;
        }

        const durText = d.duration_days !== null ? `<strong>${d.duration_days}</strong> WD` : '<span style="color:var(--text-muted);">-</span>';

        rowsHtml += `
          <tr data-doc-no="${escapeHtml(d.doc_no)}">
            <td style="font-family:monospace; font-size:11px; color:#38bdf8;">${escapeHtml(d.submittal_id)}</td>
            <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(d.doc_no)}</td>
            <td style="max-width:300px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(d.doc_title)}">${escapeHtml(d.doc_title)}</td>
            <td style="text-align:center;"><span class="badge-tag">${escapeHtml(d.rev)}</span></td>
            <td><span class="badge-tag" style="background:rgba(56,189,248,0.1); color:#bae6fd;">${escapeHtml(d.vendor_package_name)}</span></td>
            <td>${escapeHtml(d.discipline_name)}</td>
            <td style="font-size:11px; white-space:nowrap;">${escapeHtml(d.actual_submit_in || '-')}</td>
            <td style="font-size:11px; white-space:nowrap;">${escapeHtml(d.actual_submit_out || '-')}</td>
            <td style="text-align:right;">${durText}</td>
            <td>${escapeHtml(d.return_status_name || '-')}</td>
            <td>${badgeHtml}</td>
            <td style="text-align:center;">
              <button class="btn btn-secondary btn-view-doc" data-doc-no="${escapeHtml(d.doc_no)}" style="padding:4px 8px; font-size:11px;">
                View
              </button>
            </td>
          </tr>
        `;
      });
    }

    el.tableBody.innerHTML = rowsHtml;

    // Attach row / view button click listeners
    el.tableBody.querySelectorAll('.btn-view-doc').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDrawer(btn.dataset.docNo);
      });
    });

    el.tableBody.querySelectorAll('tr[data-doc-no]').forEach(tr => {
      tr.addEventListener('click', () => {
        openDrawer(tr.dataset.docNo);
      });
    });

    renderPaginationControls(totalPages);
  }

  function renderPaginationControls(totalPages) {
    const controls = el.paginationControls;
    controls.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'btn-icon';
    prevBtn.innerHTML = '&lsaquo;';
    prevBtn.disabled = state.currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (state.currentPage > 1) {
        state.currentPage--;
        renderTable();
      }
    });
    controls.appendChild(prevBtn);

    // Page indicator numbers (up to 5)
    let startPage = Math.max(1, state.currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    for (let p = startPage; p <= endPage; p++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `btn-icon ${p === state.currentPage ? 'active' : ''}`;
      pageBtn.textContent = p;
      pageBtn.style.fontSize = '12px';
      pageBtn.style.fontWeight = p === state.currentPage ? '700' : '500';
      if (p === state.currentPage) {
        pageBtn.style.background = '#38bdf8';
        pageBtn.style.color = '#0b0f19';
      }
      pageBtn.addEventListener('click', () => {
        state.currentPage = p;
        renderTable();
      });
      controls.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn-icon';
    nextBtn.innerHTML = '&rsaquo;';
    nextBtn.disabled = state.currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (state.currentPage < totalPages) {
        state.currentPage++;
        renderTable();
      }
    });
    controls.appendChild(nextBtn);
  }

  // Open Document Detail Drawer
  function openDrawer(docNo) {
    const history = state.docsMap.get(docNo) || [];
    if (history.length === 0) return;

    const latest = history[history.length - 1];

    el.drawerDocNo.textContent = docNo;
    el.drawerDocTitle.textContent = latest.doc_title || 'Untitled Document';
    el.drawerPackage.textContent = latest.vendor_package_name || 'General';
    el.drawerDiscipline.textContent = latest.discipline_name || 'Unassigned';
    el.drawerRevCount.textContent = `${history.length} submission(s)`;

    let timelineHtml = '';
    // Sort chronological
    const sortedHist = [...history].sort((a, b) => {
      const dA = parseDateObj(a.actual_submit_in) || new Date(0);
      const dB = parseDateObj(b.actual_submit_in) || new Date(0);
      return dB - dA; // newest first
    });

    sortedHist.forEach(item => {
      let statusTag = '';
      if (item.category === '<= 10 Days') {
        statusTag = `<span class="badge-tag" style="background:rgba(16,185,129,0.15); color:#10b981; font-weight:600;">Meet Agreement (${item.duration_days} Working Days)</span>`;
      } else if (item.category === '> 10 Days') {
        statusTag = `<span class="badge-tag" style="background:rgba(244,63,94,0.15); color:#f43f5e; font-weight:600;">Over Agreement (${item.duration_days} Working Days)</span>`;
      } else {
        statusTag = `<span class="badge-tag" style="background:rgba(245,158,11,0.15); color:#f59e0b; font-weight:600;">Pending Client Review</span>`;
      }

      timelineHtml += `
        <div class="timeline-item" style="padding:14px; border:1px solid var(--border-color); border-radius:12px; margin-bottom:12px; background:rgba(255,255,255,0.02);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="badge-tag" style="background:#38bdf8; color:#0b0f19; font-weight:700;">Rev ${escapeHtml(item.rev)}</span>
              <span style="font-family:monospace; font-size:11px; color:var(--text-muted);">${escapeHtml(item.submittal_id)}</span>
            </div>
            ${statusTag}
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; font-size:12px; margin-top:8px;">
            <div>
              <span style="color:var(--text-muted); display:block; font-size:11px;">ACTUAL SUBMIT IN:</span>
              <strong style="color:var(--text-primary);">${escapeHtml(item.actual_submit_in || '-')}</strong>
            </div>
            <div>
              <span style="color:var(--text-muted); display:block; font-size:11px;">ACTUAL SUBMIT OUT:</span>
              <strong style="color:var(--text-primary);">${escapeHtml(item.actual_submit_out || 'Pending')}</strong>
            </div>
          </div>
          <div style="margin-top:8px; padding-top:8px; border-top:1px dashed var(--border-color); display:flex; align-items:center; justify-content:space-between; font-size:12px;">
            <span style="color:var(--text-muted);">Return Status:</span>
            <strong style="color:#bae6fd;">${escapeHtml(item.return_status_name || '-')}</strong>
          </div>
        </div>
      `;
    });

    el.drawerTimeline.innerHTML = timelineHtml;
    el.historyDrawer.classList.add('open');
    el.drawerBackdrop.classList.add('open');
  }

  function closeDrawer() {
    el.historyDrawer.classList.remove('open');
    el.drawerBackdrop.classList.remove('open');
  }

  // Tier Drill-down Modal
  function openTierModal(tierObj) {
    state.currentTier = tierObj;
    state.currentTierItems = tierObj.items;
    state.tierModalSelectedDisc = 'ALL';
    state.tierModalSearchQuery = '';

    if (el.tierModalTitle) el.tierModalTitle.textContent = `Tier: ${tierObj.label}`;
    if (el.tierModalSubtitle) el.tierModalSubtitle.textContent = `Turnaround range: ${tierObj.min !== null ? tierObj.min : 0} to ${tierObj.max !== null ? tierObj.max : '∞'} Working Days`;
    if (el.tierModalBadge) el.tierModalBadge.style.background = tierObj.color;
    if (el.tierModalCountBadge) el.tierModalCountBadge.textContent = `${formatNumber(tierObj.count)} Deliverables`;
    if (el.tierDocSearchInput) el.tierDocSearchInput.value = '';

    // Render discipline chips
    const discCounts = new Map();
    tierObj.items.forEach(d => {
      const disc = d.discipline_name || 'Unassigned';
      discCounts.set(disc, (discCounts.get(disc) || 0) + 1);
    });

    let chipsHtml = `
      <button class="tier-disc-chip active" data-disc="ALL" style="padding:4px 10px; border-radius:12px; font-size:11px; background:#38bdf8; color:#0b0f19; font-weight:700; border:none; cursor:pointer;">
        All Disciplines (${formatNumber(tierObj.count)})
      </button>
    `;

    Array.from(discCounts.entries()).sort((a, b) => b[1] - a[1]).forEach(([disc, cnt]) => {
      chipsHtml += `
        <button class="tier-disc-chip" data-disc="${escapeHtml(disc)}" style="padding:4px 10px; border-radius:12px; font-size:11px; background:rgba(255,255,255,0.06); color:var(--text-secondary); border:1px solid var(--border-color); cursor:pointer;">
          ${escapeHtml(disc)} (${cnt})
        </button>
      `;
    });

    el.tierDisciplineChips.innerHTML = chipsHtml;

    el.tierDisciplineChips.querySelectorAll('.tier-disc-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        el.tierDisciplineChips.querySelectorAll('.tier-disc-chip').forEach(b => {
          b.style.background = 'rgba(255,255,255,0.06)';
          b.style.color = 'var(--text-secondary)';
          b.classList.remove('active');
        });
        btn.classList.add('active');
        btn.style.background = '#38bdf8';
        btn.style.color = '#0b0f19';
        state.tierModalSelectedDisc = btn.dataset.disc;
        renderTierModalTable();
      });
    });

    renderTierModalTable();
    el.tierModalBackdrop.classList.add('open');
  }

  function renderTierModalTable() {
    let items = state.currentTierItems;

    if (state.tierModalSelectedDisc !== 'ALL') {
      items = items.filter(d => d.discipline_name === state.tierModalSelectedDisc);
    }

    if (state.tierModalSearchQuery) {
      const q = state.tierModalSearchQuery.toLowerCase();
      items = items.filter(d => 
        (d.doc_no && d.doc_no.toLowerCase().includes(q)) ||
        (d.doc_title && d.doc_title.toLowerCase().includes(q)) ||
        (d.submittal_id && d.submittal_id.toLowerCase().includes(q)) ||
        (d.vendor_package_name && d.vendor_package_name.toLowerCase().includes(q))
      );
    }

    el.tierModalCountBadge.textContent = `${formatNumber(items.length)} Deliverables`;

    let html = '';
    if (items.length === 0) {
      html = `<tr><td colspan="10" style="text-align:center; padding:20px; color:var(--text-muted);">No documents match filter in this tier</td></tr>`;
    } else {
      items.forEach(d => {
        html += `
          <tr>
            <td style="font-family:monospace; font-size:11px; color:#38bdf8;">${escapeHtml(d.submittal_id)}</td>
            <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(d.doc_no)}</td>
            <td style="max-width:260px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(d.doc_title)}">${escapeHtml(d.doc_title)}</td>
            <td style="text-align:center;"><span class="badge-tag">${escapeHtml(d.rev)}</span></td>
            <td><span class="badge-tag" style="background:rgba(56,189,248,0.1); color:#bae6fd;">${escapeHtml(d.vendor_package_name)}</span></td>
            <td>${escapeHtml(d.discipline_name)}</td>
            <td style="font-size:11px;">${escapeHtml(d.actual_submit_in || '-')}</td>
            <td style="font-size:11px;">${escapeHtml(d.actual_submit_out || '-')}</td>
            <td style="text-align:right; font-weight:700; color:${state.currentTier.color};">${d.duration_days} WD</td>
            <td>${escapeHtml(d.return_status_name || '-')}</td>
          </tr>
        `;
      });
    }
    el.tierDocTableBody.innerHTML = html;
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
      // Running locally or offline without python web server
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

  // Export to CSV
  function exportCSV() {
    const data = state.filteredData;
    if (data.length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = [
      'Submittal ID',
      'Document No.',
      'Document Title',
      'Rev.',
      'Vendor Package',
      'Discipline',
      'Actual Submit In',
      'Actual Submit Out',
      'Duration (Working Days)',
      'Agreement Status',
      'Return Status Name',
      'Submitted By'
    ];

    const rows = data.map(d => [
      `"${(d.submittal_id || '').replace(/"/g, '""')}"`,
      `"${(d.doc_no || '').replace(/"/g, '""')}"`,
      `"${(d.doc_title || '').replace(/"/g, '""')}"`,
      `"${(d.rev || '').replace(/"/g, '""')}"`,
      `"${(d.vendor_package_name || '').replace(/"/g, '""')}"`,
      `"${(d.discipline_name || '').replace(/"/g, '""')}"`,
      `"${(d.actual_submit_in || '').replace(/"/g, '""')}"`,
      `"${(d.actual_submit_out || '').replace(/"/g, '""')}"`,
      d.duration_days !== null ? d.duration_days : '',
      `"${(d.category || '').replace(/"/g, '""')}"`,
      `"${(d.return_status_name || '').replace(/"/g, '""')}"`,
      `"${(d.submitted_by || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ASK_Vendor_Document_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Escape HTML helper
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Setup Event Handlers
  function setupEvents() {
    // Theme toggle
    el.themeToggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('ask_vendor_theme', state.theme);
    });

    // Package Nav Tabs
    el.vendorPkgNav.querySelectorAll('.pkg-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        state.activePackage = tab.dataset.package;
        updatePackageTabs();
        applyFilters();
      });
    });

    // Search input
    let searchTimeout;
    el.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.searchQuery = e.target.value;
        applyFilters();
      }, 200);
    });

    // Select filters
    el.disciplineSelect.addEventListener('change', (e) => {
      state.activeDiscipline = e.target.value;
      applyFilters();
    });

    el.packageSelect.addEventListener('change', (e) => {
      state.activePackage = e.target.value;
      updatePackageTabs();
      applyFilters();
    });

    el.revSelect.addEventListener('change', (e) => {
      state.activeRev = e.target.value;
      applyFilters();
    });

    el.statusSelect.addEventListener('change', (e) => {
      state.activeStatus = e.target.value;
      applyFilters();
    });

    // Category pills
    el.categoryPills.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.categoryPills.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeCategory = btn.dataset.category;
        applyFilters();
      });
    });

    // Page size
    el.pageSizeSelect.addEventListener('change', (e) => {
      state.pageSize = e.target.value;
      state.currentPage = 1;
      renderTable();
    });

    // Table sorting
    el.mainDocTable.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.dataset.sort;
        if (state.sortField === field) {
          state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortField = field;
          state.sortDirection = 'desc';
        }
        applyFilters();
      });
    });

    // Drawer close
    el.drawerCloseBtn.addEventListener('click', closeDrawer);
    el.drawerBackdrop.addEventListener('click', closeDrawer);

    // Tier Modal close
    el.tierModalCloseBtn.addEventListener('click', closeTierModal);
    el.tierModalBackdrop.addEventListener('click', (e) => {
      if (e.target === el.tierModalBackdrop) closeTierModal();
    });

    // Tier modal search
    el.tierDocSearchInput.addEventListener('input', (e) => {
      state.tierModalSearchQuery = e.target.value;
      renderTierModalTable();
    });

    // Apply Tier filter to main table
    el.btnFilterMainByTier.addEventListener('click', () => {
      state.activeTier = state.currentTier;
      el.activeTierBadge.style.display = 'inline-flex';
      el.activeTierLabel.textContent = `Tier: ${state.currentTier.label}`;
      closeTierModal();
      applyFilters();
    });

    // Clear Tier filter button
    el.clearTierFilterBtn.addEventListener('click', () => {
      state.activeTier = null;
      el.activeTierBadge.style.display = 'none';
      applyFilters();
    });

    // Reset filters
    el.resetFiltersBtn.addEventListener('click', () => {
      state.activeCategory = 'ALL';
      state.activePackage = 'ALL';
      state.activeDiscipline = 'ALL';
      state.activeRev = 'ALL';
      state.activeStatus = 'ALL';
      state.activeTier = null;
      state.searchQuery = '';
      el.searchInput.value = '';
      el.disciplineSelect.value = 'ALL';
      el.packageSelect.value = 'ALL';
      el.revSelect.value = 'ALL';
      el.statusSelect.value = 'ALL';
      el.activeTierBadge.style.display = 'none';
      el.categoryPills.querySelectorAll('.pill-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.category === 'ALL');
      });
      updatePackageTabs();
      applyFilters();
    });

    // Export CSV
    el.exportCsvBtn.addEventListener('click', exportCSV);

    // SLA Modal Handlers
    if (el.openSlaDefBtn) el.openSlaDefBtn.addEventListener('click', openSlaModal);
    if (el.slaBadgeBtn) el.slaBadgeBtn.addEventListener('click', openSlaModal);
    if (el.slaModalCloseBtn) el.slaModalCloseBtn.addEventListener('click', closeSlaModal);
    if (el.slaModalBackdrop) {
      el.slaModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.slaModalBackdrop) closeSlaModal();
      });
    }

    // Upload Modal Handlers
    if (el.openUploadBtn) el.openUploadBtn.addEventListener('click', openUploadModal);
    if (el.uploadModalCloseBtn) el.uploadModalCloseBtn.addEventListener('click', closeUploadModal);
    if (el.uploadModalBackdrop) {
      el.uploadModalBackdrop.addEventListener('click', (e) => {
        if (e.target === el.uploadModalBackdrop) closeUploadModal();
      });
    }

    // Upload Dropzone & File Input
    if (el.fileUploadInput) {
      el.fileUploadInput.addEventListener('change', (e) => {
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

    // Keyboard ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeDrawer();
        closeTierModal();
        closeSlaModal();
        closeUploadModal();
      }
    });
  }

  function initReportDate() {
    const dateEl = document.getElementById('headerReportDate');
    if (!dateEl) return;
    if (window.VENDOR_REPORT_DATE) {
      dateEl.textContent = `Report Date: ${window.VENDOR_REPORT_DATE}`;
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

  // Initialize
  function init() {
    document.documentElement.setAttribute('data-theme', state.theme);
    initReportDate();
    initDataIndex();
    setupEvents();
    applyFilters();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
