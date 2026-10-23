/**
 * ZDoc Dashboard Multi-Project Switcher Module
 * Supports switching between Z1F and ASK without data mix-up.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'zdoc_active_project';
  const DEFAULT_PROJECT = 'Z1F';

  // Available projects configuration
  window.ZDOC_PROJECTS = {
    'Z1F': {
      id: 'Z1F',
      name: 'Z1F',
      dataPath: 'data/z1f/',
      scopeType: 'contractor', // Contractor scopes: Topside without Structure, Jacket & Piles, etc.
      scopeLabel: 'Contractor Scopes',
      defaultScope: 'ALL',
      scopes: [
        { id: 'ALL', label: 'All Contractors' },
        { id: 'Topside without Structure', label: 'Topside without Structure' },
        { id: 'Jacket & Piles', label: 'Jacket & Piles' },
        { id: 'Topside Structure', label: 'Topside Structure' },
        { id: 'WP2 Pipeline', label: 'WP2 Pipeline' },
        { id: 'Project Management & Ops', label: 'PMT & Ops' }
      ]
    },
    'ASK': {
      id: 'ASK',
      name: 'ASK',
      dataPath: 'data/ask/',
      scopeType: 'work_package', // Work packages: WP01 TOPSIDE, WP01 JACKET, WP02, etc.
      scopeLabel: 'Work Packages',
      defaultScope: 'ALL',
      scopes: [
        { id: 'ALL', label: 'All Work Packages' },
        { id: 'WP01 TOPSIDE', label: 'WP01 Topside' },
        { id: 'WP01 JACKET', label: 'WP01 Jacket' },
        { id: 'WP02 TOPSIDE', label: 'WP02 Topside' },
        { id: 'WP02 JACKET', label: 'WP02 Jacket' }
      ]
    }
  };

  function getActiveProject() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved && window.ZDOC_PROJECTS[saved]) ? saved : DEFAULT_PROJECT;
  }

  function setActiveProject(projectId) {
    if (!window.ZDOC_PROJECTS[projectId]) return;
    localStorage.setItem(STORAGE_KEY, projectId);
    // Reload page to cleanly load the isolated dataset without memory mix-up
    window.location.reload();
  }

  window.ZDocProjectManager = {
    getActiveProject: getActiveProject,
    setActiveProject: setActiveProject,
    getConfig: function () {
      return window.ZDOC_PROJECTS[getActiveProject()];
    },
    initSwitcherUI: function () {
      const active = getActiveProject();
      const container = document.getElementById('projectSwitcher');
      if (!container) return;

      container.innerHTML = `
        <div class="project-pill-group" role="tablist" aria-label="Select Project">
          <button type="button" class="project-pill ${active === 'Z1F' ? 'active' : ''}" data-project="Z1F" title="Switch to Z1F">
            <span class="proj-icon">⚡</span>
            <span class="proj-label">Z1F</span>
          </button>
          <button type="button" class="project-pill ${active === 'ASK' ? 'active' : ''}" data-project="ASK" title="Switch to ASK">
            <span class="proj-icon">🏛️</span>
            <span class="proj-label">ASK</span>
          </button>
        </div>
      `;

      container.querySelectorAll('.project-pill').forEach(btn => {
        btn.addEventListener('click', function () {
          const target = this.getAttribute('data-project');
          if (target && target !== active) {
            setActiveProject(target);
          }
        });
      });

      // Remove contract badge if present in DOM
      const badgeEl = document.getElementById('projectHeaderBadge');
      if (badgeEl) {
        badgeEl.remove();
      }

      // Update project prefix in header title
      const titlePrefixEl = document.getElementById('projectHeaderTitlePrefix');
      if (titlePrefixEl) {
        titlePrefixEl.textContent = window.ZDOC_PROJECTS[active].name;
      }
    }
  };

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.ZDocProjectManager.initSwitcherUI);
  } else {
    window.ZDocProjectManager.initSwitcherUI();
  }
})();
