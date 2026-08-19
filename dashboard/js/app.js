/**
 * Main Application & SPA Controller with Strict Week-Issue Matching & Chronological Sorting
 */

class AppController {
  constructor() {
    this.curriculumData = null;
    this.activeMonth = 1;
    this.checkedTasks = this.loadTaskState();
    this.customWeeklyNotes = this.loadCustomWeeklyNotes();
    this.localDailyLogs = this.loadLocalDailyLogs();
  }

  async init() {
    this.setupEventListeners();
    await this.loadCurriculum();
    
    // Initialize components
    this.renderMonthTabs();
    this.renderActiveMonthCurriculum();
    
    window.githubManager.fetchIssues().then(() => {
      this.renderActiveMonthCurriculum(); // Re-render curriculum so week-matched issues display!
      this.renderAllIssuesAndLogs();
      this.renderLatestLogs();
    });
    
    window.songManager.renderSongPipeline('song-pipeline-container');
    this.updateDashboardStats();
  }

  loadTaskState() {
    const saved = localStorage.getItem('songwriting_task_state');
    return saved ? JSON.parse(saved) : {};
  }

  saveTaskState() {
    localStorage.setItem('songwriting_task_state', JSON.stringify(this.checkedTasks));
  }

  loadCustomWeeklyNotes() {
    const saved = localStorage.getItem('songwriting_weekly_notes');
    return saved ? JSON.parse(saved) : {};
  }

  saveCustomWeeklyNotes() {
    localStorage.setItem('songwriting_weekly_notes', JSON.stringify(this.customWeeklyNotes));
  }

  loadLocalDailyLogs() {
    const saved = localStorage.getItem('songwriting_local_logs');
    return saved ? JSON.parse(saved) : [];
  }

  saveLocalDailyLogs() {
    localStorage.setItem('songwriting_local_logs', JSON.stringify(this.localDailyLogs));
  }

  async loadCurriculum() {
    try {
      const res = await fetch('data/curriculum.json');
      this.curriculumData = await res.json();
    } catch (e) {
      console.error('Failed to load curriculum.json:', e);
    }
  }

  setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-item button').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Search & Filters for GitHub Issues
    const searchInput = document.getElementById('issue-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.triggerIssueFilters());
    }

    const labelSelect = document.getElementById('issue-label-select');
    if (labelSelect) {
      labelSelect.addEventListener('change', () => this.triggerIssueFilters());
    }

    const statusSelect = document.getElementById('issue-status-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', () => this.triggerIssueFilters());
    }

    const sortSelect = document.getElementById('issue-sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => this.triggerIssueFilters());
    }
  }

  triggerIssueFilters() {
    const searchTerm = document.getElementById('issue-search-input')?.value || '';
    const labelFilter = document.getElementById('issue-label-select')?.value || 'all';
    const statusFilter = document.getElementById('issue-status-select')?.value || 'active';
    const sortOrder = document.getElementById('issue-sort-select')?.value || 'asc';
    this.renderAllIssuesAndLogs(searchTerm, labelFilter, statusFilter, sortOrder);
  }

  switchView(viewId) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(panel => panel.classList.remove('active'));

    const activeNav = document.querySelector(`.nav-item button[data-view="${viewId}"]`);
    if (activeNav) activeNav.parentElement.classList.add('active');

    const activePanel = document.getElementById(`view-${viewId}`);
    if (activePanel) activePanel.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    const titleMap = {
      'dashboard': 'ダッシュボード Overview',
      'curriculum': '6か月カリキュラム・週間目標',
      'issues': '日々の学習ログ・GitHub Issues',
      'songs': '5曲制作パイプライン',
      'notes': '作曲理論・分析メモ ノート',
      'settings': '設定・連携管理'
    };
    if (pageTitle) pageTitle.textContent = titleMap[viewId] || 'ダッシュボード';
  }

  renderMonthTabs() {
    const container = document.getElementById('month-tab-container');
    if (!container || !this.curriculumData) return;

    container.innerHTML = this.curriculumData.months.map(m => `
      <button class="month-tab-btn ${m.month === this.activeMonth ? 'active' : ''}" 
        onclick="window.app.selectMonth(${m.month})">
        Month ${m.month}
      </button>
    `).join('');
  }

  selectMonth(monthNum) {
    this.activeMonth = monthNum;
    this.renderMonthTabs();
    this.renderActiveMonthCurriculum();
  }

  /**
   * Match GitHub Issues and local logs for a specific Month and Week strictly.
   * Prevents "Week 1" from matching "Week 10", "Week 11", etc. via word boundary regex \bWeek\s*(\d+)\b
   */
  getIssuesForWeek(monthNum, weekNum) {
    const allIssues = [
      ...this.localDailyLogs.map(log => ({
        id: `local_${log.id}`,
        number: log.id,
        title: log.title,
        body: log.body,
        created_at: log.created_at,
        html_url: '#',
        state: 'closed',
        comments: 1,
        isLocal: true,
        labels: [{ name: log.tag || '学習ログ', color: '00f2fe' }]
      })),
      ...(window.githubManager.issues || [])
    ];

    const filtered = allIssues.filter(issue => {
      const title = issue.title || '';
      const body = issue.body || '';
      const labels = (issue.labels || []).map(l => l.name || '').join(' ');
      const fullText = `${title} ${labels}`;

      // If Month is specified in title/label, check if it matches monthNum
      const monthMatch = fullText.match(/\bMonth\s*(\d+)\b/i);
      if (monthMatch) {
        const issueMonth = parseInt(monthMatch[1], 10);
        if (issueMonth !== monthNum) return false;
      }

      // Extract Week number strictly using word boundary regex \bWeek\s*(\d+)\b
      const weekMatch = fullText.match(/\bWeek\s*(\d+)\b/i) || body.match(/\bWeek\s*(\d+)\b/i);
      if (weekMatch) {
        const issueWeek = parseInt(weekMatch[1], 10);
        return issueWeek === weekNum;
      }

      return false;
    });

    // Sort ascending: Day 1 -> Day 2 -> Day 3 (small day number / oldest issue first)
    return filtered.sort((a, b) => {
      const matchA = (a.title.match(/Day\s*(\d+)/i) || a.body.match(/Day\s*(\d+)/i) || [])[1];
      const matchB = (b.title.match(/Day\s*(\d+)/i) || b.body.match(/Day\s*(\d+)/i) || [])[1];

      if (matchA && matchB) {
        return parseInt(matchA, 10) - parseInt(matchB, 10);
      }
      if (matchA) return -1;
      if (matchB) return 1;

      const numA = typeof a.number === 'number' ? a.number : a.id;
      const numB = typeof b.number === 'number' ? b.number : b.id;
      return numA - numB;
    });
  }

  getIssueStatus(issue) {
    if (window.githubManager && typeof window.githubManager.getIssueStatus === 'function') {
      return window.githubManager.getIssueStatus(issue);
    }

    const isClosed = issue.state === 'closed' || 
      (issue.labels || []).some(l => ['完了', 'completed', 'done', 'closed'].includes((l.name || '').toLowerCase()));
    
    if (isClosed) return 'completed';

    const commentsCount = typeof issue.comments === 'number' ? issue.comments : 0;
    const hasComments = commentsCount > 0;
    const labels = (issue.labels || []).map(l => (l.name || '').toLowerCase());
    const hasInProgressLabel = labels.some(l => ['進行中', 'in-progress', 'doing', 'wip', '作業中'].includes(l));
    const body = (issue.body || '');
    const hasCheckedItems = body.includes('[x]') || body.includes('[X]');

    if (hasComments || hasInProgressLabel || hasCheckedItems) {
      return 'in_progress';
    }

    return 'unstarted';
  }

  renderActiveMonthCurriculum() {
    const container = document.getElementById('curriculum-month-detail');
    if (!container || !this.curriculumData) return;

    const monthData = this.curriculumData.months.find(m => m.month === this.activeMonth);
    if (!monthData) return;

    let html = `
      <div class="card" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
          <div>
            <span class="week-badge" style="margin-bottom: 6px;">Month ${monthData.month}</span>
            <h2 style="font-size: 1.3rem; color: #ffffff;">${monthData.title}</h2>
            <p style="color: var(--text-muted); font-size: 0.88rem; margin-top: 4px; line-height: 1.5;">${monthData.goal}</p>
          </div>
        </div>
      </div>
    `;

    html += monthData.weeks.map(w => {
      const wId = `m${monthData.month}_w${w.week}`;
      const customNote = this.customWeeklyNotes[wId] || '';
      const matchedIssues = this.getIssuesForWeek(monthData.month, w.week);
      
      const completedCount = matchedIssues.filter(i => this.getIssueStatus(i) === 'completed').length;
      const inProgressCount = matchedIssues.filter(i => this.getIssueStatus(i) === 'in_progress').length;
      const unstartedCount = matchedIssues.filter(i => this.getIssueStatus(i) === 'unstarted').length;
      const percent = matchedIssues.length > 0 ? Math.round((completedCount / matchedIssues.length) * 100) : 0;

      const matchedIssuesHtml = matchedIssues.length > 0 ? matchedIssues.map(issue => {
        const status = this.getIssueStatus(issue);
        
        let cardBg = 'rgba(255,255,255,0.03)';
        let borderLeftColor = 'var(--border-color)';
        let statusBadge = '';
        let titleIcon = '';

        if (status === 'completed') {
          cardBg = 'rgba(0, 245, 160, 0.12)';
          borderLeftColor = 'var(--accent-green)';
          statusBadge = `<span class="label-badge badge-completed"><i class="fa-solid fa-check"></i> 完了</span>`;
          titleIcon = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green); margin-right: 6px;"></i>`;
        } else if (status === 'in_progress') {
          cardBg = 'rgba(0, 242, 254, 0.08)';
          borderLeftColor = 'var(--primary-cyan)';
          statusBadge = `<span class="label-badge badge-in-progress"><i class="fa-solid fa-spinner fa-spin-pulse"></i> 進行中</span>`;
          titleIcon = `<i class="fa-solid fa-clock-rotate-left" style="color: var(--primary-cyan); margin-right: 6px;"></i>`;
        } else {
          cardBg = 'rgba(255, 255, 255, 0.02)';
          borderLeftColor = 'rgba(255,255,255,0.2)';
          statusBadge = `<span class="label-badge badge-unstarted"><i class="fa-regular fa-circle"></i> 未着手</span>`;
          titleIcon = `<i class="fa-regular fa-circle" style="color: var(--text-muted); margin-right: 6px;"></i>`;
        }

        return `
          <div style="background: ${cardBg}; border-left: 4px solid ${borderLeftColor}; border-radius: var(--radius-sm); padding: 10px 12px; margin-top: 8px; font-size: 0.84rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
              <a href="${issue.html_url}" target="${issue.isLocal ? '_self' : '_blank'}" style="color: #ffffff; font-weight: 700; text-decoration: none;">
                ${titleIcon}
                ${issue.isLocal ? '[ローカル]' : `#${issue.number}`} ${this.escapeHtml(issue.title)}
              </a>
              <div style="display: flex; align-items: center; gap: 8px;">
                ${statusBadge}
                <span style="font-size: 0.72rem; color: var(--text-muted);">${new Date(issue.created_at).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
            <p style="color: var(--text-muted); margin-top: 6px; font-size: 0.8rem; line-height: 1.4; white-space: pre-wrap;">
              ${this.escapeHtml((issue.body || '').slice(0, 150))}${(issue.body || '').length > 150 ? '...' : ''}
            </p>
          </div>
        `;
      }).join('') : `
        <p style="color: var(--text-dim); font-size: 0.78rem; font-style: italic; margin-top: 4px;">
          まだ登録されたIssueログはありません。「＋ この週のログを入力」またはChatGPTから登録できます。
        </p>
      `;

      return `
        <div class="week-card">
          <div class="week-header">
            <div>
              <span class="week-badge">Week ${w.week}</span>
              <h3 style="display: inline; font-size: 1.05rem; margin-left: 8px; color: #ffffff;">${w.title}</h3>
            </div>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;">
              <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.75rem;" 
                onclick="window.app.filterIssuesForWeek(${monthData.month}, ${w.week})">
                <i class="fa-solid fa-magnifying-glass"></i> Issue一覧で検索
              </button>
              <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" 
                onclick="window.app.openNewLogModalWithWeek(${monthData.month}, ${w.week})">
                <i class="fa-solid fa-plus"></i> ログを入力
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 14px 0;">
            <div>
              <h4 style="font-size: 0.85rem; color: var(--primary-cyan); margin-bottom: 6px;">理論・学習項目</h4>
              <ul style="padding-left: 16px; color: var(--text-muted); font-size: 0.85rem; line-height: 1.6;">
                ${w.topics.map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
            <div>
              <h4 style="font-size: 0.85rem; color: var(--accent-purple); margin-bottom: 6px;">分析＆ギター接続</h4>
              <p style="color: var(--text-muted); font-size: 0.82rem; margin-bottom: 4px;"><strong>分析:</strong> ${w.analysis}</p>
              ${w.guitar ? `<ul style="padding-left: 16px; color: var(--text-muted); font-size: 0.82rem;">${w.guitar.map(g=>`<li>${g}</li>`).join('')}</ul>` : ''}
            </div>
          </div>

          <!-- Weekly Custom Goal / Personal Memo -->
          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--accent-amber);">
                <i class="fa-solid fa-pen-to-square" style="margin-right: 4px;"></i> 今週の個人民標・一筆メモ
              </span>
            </div>
            <input type="text" class="form-control" style="font-size: 0.82rem; padding: 6px 10px;" 
              placeholder="例: Cメジャーのサビ進行3パターン作成を目標にする" 
              value="${this.escapeHtml(customNote)}"
              onchange="window.app.updateWeeklyNote('${wId}', this.value)">
          </div>

          <!-- Associated Week GitHub Issues & Logs -->
          <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 0.82rem; font-weight: 600; color: var(--primary-cyan);">
                <i class="fa-solid fa-link" style="margin-right: 4px;"></i> 今週の関連Issue・日々の学習ログ (${matchedIssues.length}件 / Day 1 ➔ Day 7 順)
              </span>
            </div>
            ${matchedIssues.length > 0 ? `
              <div class="completed-progress-banner">
                <span><i class="fa-solid fa-chart-pie"></i> 今週のタスク進行: <strong>完了 ${completedCount} / 進行中 ${inProgressCount} / 未着手 ${unstartedCount} 件 (${percent}%)</strong></span>
                ${percent === 100 ? '<span>🎉 今週の目標クリア！</span>' : ''}
              </div>
            ` : ''}
            ${matchedIssuesHtml}
          </div>

          <!-- Task Checkbox -->
          <div style="border-top: 1px dashed var(--border-color); padding-top: 10px; margin-top: 10px;">
            <h4 style="font-size: 0.82rem; color: var(--accent-green); margin-bottom: 6px;">
              <i class="fa-solid fa-square-check" style="margin-right: 4px;"></i> 実践・課題クリア
            </h4>
            <div class="task-item">
              <input type="checkbox" id="${wId}_task" ${this.checkedTasks[wId] ? 'checked' : ''} 
                onchange="window.app.toggleTask('${wId}', this.checked)">
              <label for="${wId}_task" style="cursor: pointer; font-size: 0.85rem;">${w.practice}</label>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  filterIssuesForWeek(monthNum, weekNum) {
    this.switchView('issues');
    const searchInput = document.getElementById('issue-search-input');
    if (searchInput) {
      searchInput.value = `Week ${weekNum}`;
    }
    const statusSelect = document.getElementById('issue-status-select');
    if (statusSelect) {
      statusSelect.value = 'all'; // Show all for week search
    }
    this.triggerIssueFilters();
  }

  updateWeeklyNote(weekId, text) {
    this.customWeeklyNotes[weekId] = text;
    this.saveCustomWeeklyNotes();
  }

  toggleTask(taskId, isChecked) {
    this.checkedTasks[taskId] = isChecked;
    this.saveTaskState();
    this.updateDashboardStats();
  }

  updateDashboardStats() {
    const totalChecked = Object.values(this.checkedTasks).filter(Boolean).length;
    const totalWeeks = 24;
    const progressPercent = Math.min(100, Math.round((totalChecked / totalWeeks) * 100));

    const percentEl = document.getElementById('overall-progress-percent');
    const fillEl = document.getElementById('overall-progress-fill');
    if (percentEl) percentEl.textContent = `${progressPercent}%`;
    if (fillEl) fillEl.style.width = `${progressPercent}%`;

    const completedSongs = window.songManager.songs.filter(s => s.status === 'completed').length;
    const completedSongsEl = document.getElementById('stat-completed-songs');
    if (completedSongsEl) completedSongsEl.textContent = `${completedSongs} / 5`;
  }

  renderAllIssuesAndLogs(searchTerm = '', labelFilter = 'all', statusFilter = 'active', sortOrder = 'asc') {
    const container = document.getElementById('github-issues-container');
    if (!container) return;

    let combinedLogs = [
      ...this.localDailyLogs.map(log => ({
        id: `local_${log.id}`,
        number: log.id,
        title: log.title,
        body: log.body,
        created_at: log.created_at,
        html_url: '#',
        state: 'closed',
        comments: 1,
        isLocal: true,
        labels: [{ name: log.tag || '学習ログ', color: '00f2fe' }]
      })),
      ...(window.githubManager.issues || [])
    ];

    if (searchTerm) {
      const term = searchTerm.trim().toLowerCase();
      // Strict regex matching for "week X" search to prevent "week 1" matching "week 10", "week 11" etc.
      const weekSearchMatch = term.match(/^week\s*(\d+)$/i);
      if (weekSearchMatch) {
        const targetWeek = parseInt(weekSearchMatch[1], 10);
        combinedLogs = combinedLogs.filter(item => {
          const text = `${item.title} ${(item.labels||[]).map(l=>l.name).join(' ')} ${item.body}`;
          const wMatch = text.match(/\bWeek\s*(\d+)\b/i);
          return wMatch && parseInt(wMatch[1], 10) === targetWeek;
        });
      } else {
        combinedLogs = combinedLogs.filter(item => 
          item.title.toLowerCase().includes(term) || 
          (item.body && item.body.toLowerCase().includes(term))
        );
      }
    }

    if (labelFilter !== 'all') {
      combinedLogs = combinedLogs.filter(item => 
        item.labels && item.labels.some(l => l.name.toLowerCase() === labelFilter.toLowerCase())
      );
    }

    // Default statusFilter is 'active' (Hide completed issues by default!)
    if (statusFilter === 'active') {
      combinedLogs = combinedLogs.filter(item => this.getIssueStatus(item) !== 'completed');
    } else if (statusFilter === 'completed') {
      combinedLogs = combinedLogs.filter(item => this.getIssueStatus(item) === 'completed');
    } else if (statusFilter === 'in_progress') {
      combinedLogs = combinedLogs.filter(item => this.getIssueStatus(item) === 'in_progress');
    } else if (statusFilter === 'unstarted') {
      combinedLogs = combinedLogs.filter(item => this.getIssueStatus(item) === 'unstarted');
    }

    if (combinedLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <p>該当する学習ログ・Issueは見つかりませんでした。「＋ 新規ログ入力」から追加できます。</p>
        </div>
      `;
      return;
    }

    // Chronological Order Sorting (Month 1 -> Week 1 -> Day 1 -> Day 2 ... -> Week 2 Day 1 ...)
    combinedLogs.sort((a, b) => {
      // Month
      const monthA = parseInt((a.title.match(/Month\s*(\d+)/i) || a.body.match(/Month\s*(\d+)/i) || [])[1] || 999, 10);
      const monthB = parseInt((b.title.match(/Month\s*(\d+)/i) || b.body.match(/Month\s*(\d+)/i) || [])[1] || 999, 10);
      if (monthA !== monthB) {
        return sortOrder === 'asc' ? monthA - monthB : monthB - monthA;
      }

      // Week
      const weekA = parseInt((a.title.match(/Week\s*(\d+)/i) || a.body.match(/Week\s*(\d+)/i) || [])[1] || 999, 10);
      const weekB = parseInt((b.title.match(/Week\s*(\d+)/i) || b.body.match(/Week\s*(\d+)/i) || [])[1] || 999, 10);
      if (weekA !== weekB) {
        return sortOrder === 'asc' ? weekA - weekB : weekB - weekA;
      }

      // Day
      const dayA = parseInt((a.title.match(/Day\s*(\d+)/i) || a.body.match(/Day\s*(\d+)/i) || [])[1] || 999, 10);
      const dayB = parseInt((b.title.match(/Day\s*(\d+)/i) || b.body.match(/Day\s*(\d+)/i) || [])[1] || 999, 10);
      if (dayA !== dayB) {
        return sortOrder === 'asc' ? dayA - dayB : dayB - dayA;
      }

      // Secondary sort by issue number or creation date
      const numA = typeof a.number === 'number' ? a.number : (parseInt(a.id, 10) || 0);
      const numB = typeof b.number === 'number' ? b.number : (parseInt(b.id, 10) || 0);
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    container.innerHTML = combinedLogs.map(issue => {
      const dateStr = new Date(issue.created_at).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      const status = this.getIssueStatus(issue);
      
      const labelsHtml = (issue.labels || []).map(l => 
        `<span class="label-badge" style="border-left: 2px solid #${l.color || '00f2fe'};">${this.escapeHtml(l.name)}</span>`
      ).join('');

      let statusBadge = '';
      let titleIcon = '';
      let cardClass = '';

      if (status === 'completed') {
        statusBadge = `<span class="label-badge badge-completed"><i class="fa-solid fa-circle-check"></i> 完了</span>`;
        titleIcon = `<i class="fa-solid fa-circle-check" style="color: var(--accent-green); margin-right: 6px;"></i>`;
        cardClass = 'issue-completed';
      } else if (status === 'in_progress') {
        statusBadge = `<span class="label-badge badge-in-progress"><i class="fa-solid fa-spinner fa-spin-pulse"></i> 進行中</span>`;
        titleIcon = `<i class="fa-solid fa-clock-rotate-left" style="color: var(--primary-cyan); margin-right: 6px;"></i>`;
        cardClass = 'issue-in-progress';
      } else {
        statusBadge = `<span class="label-badge badge-unstarted"><i class="fa-regular fa-circle"></i> 未着手</span>`;
        titleIcon = `<i class="fa-regular fa-circle" style="color: var(--text-muted); margin-right: 6px;"></i>`;
        cardClass = 'issue-unstarted';
      }

      return `
        <div class="issue-card ${cardClass}">
          <div class="issue-header">
            <div>
              ${titleIcon}
              <span class="label-badge" style="background: ${issue.isLocal ? 'rgba(0, 245, 160, 0.2)' : 'rgba(0, 242, 254, 0.15)'}; color: ${issue.isLocal ? 'var(--accent-green)' : 'var(--primary-cyan)'}; margin-right: 4px;">
                ${issue.isLocal ? 'LOCAL LOG' : `ISSUE #${issue.number}`}
              </span>
              <a href="${issue.html_url}" target="${issue.isLocal ? '_self' : '_blank'}" class="issue-title" style="margin-left: 4px;">
                ${window.githubManager.escapeHtml(issue.title)}
              </a>
            </div>
            <span class="issue-number">${dateStr}</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin: 8px 0; white-space: pre-wrap;">${window.githubManager.escapeHtml(issue.body)}</p>
          <div class="issue-labels">
            ${statusBadge}
            ${labelsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  renderLatestLogs() {
    const container = document.getElementById('dashboard-latest-logs');
    if (!container) return;

    const all = [
      ...this.localDailyLogs.map(l => ({ title: l.title, created_at: l.created_at, url: '#', status: 'completed' })),
      ...(window.githubManager.issues || []).map(i => ({ 
        title: `#${i.number} ${i.title}`, 
        created_at: i.created_at, 
        url: i.html_url,
        status: this.getIssueStatus(i)
      }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

    if (all.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">登録されたログはありません。「＋ 新規ログ・Issue入力」から追加できます。</p>`;
      return;
    }

    container.innerHTML = all.map(item => {
      let statusBadge = '';
      let itemBg = 'rgba(255,255,255,0.03)';
      let borderLeft = 'var(--border-color)';

      if (item.status === 'completed') {
        statusBadge = `<span class="label-badge badge-completed" style="font-size: 0.65rem; padding: 2px 6px;">完了</span>`;
        itemBg = 'rgba(0, 245, 160, 0.12)';
        borderLeft = 'var(--accent-green)';
      } else if (item.status === 'in_progress') {
        statusBadge = `<span class="label-badge badge-in-progress" style="font-size: 0.65rem; padding: 2px 6px;">進行中</span>`;
        itemBg = 'rgba(0, 242, 254, 0.08)';
        borderLeft = 'var(--primary-cyan)';
      } else {
        statusBadge = `<span class="label-badge badge-unstarted" style="font-size: 0.65rem; padding: 2px 6px;">未着手</span>`;
        itemBg = 'rgba(255, 255, 255, 0.02)';
        borderLeft = 'rgba(255,255,255,0.2)';
      }

      return `
        <div style="padding: 10px 12px; background: ${itemBg}; border-left: 4px solid ${borderLeft}; border-radius: var(--radius-md); margin-bottom: 6px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
          <a href="${item.url}" target="_blank" style="color: #ffffff; font-weight: 600; text-decoration: none;">
            ${this.escapeHtml(item.title)}
          </a>
          <div style="display: flex; align-items: center; gap: 6px;">
            ${statusBadge}
            <span style="font-size: 0.75rem; color: var(--text-dim);">${new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  /* Log Input Modal Handler */
  openNewLogModal() {
    const modal = document.getElementById('new-log-modal');
    if (modal) modal.classList.add('active');
  }

  openNewLogModalWithWeek(monthNum, weekNum) {
    const select = document.getElementById('log-week-select');
    if (select) select.value = `Month ${monthNum} Week ${weekNum}`;
    
    const titleInput = document.getElementById('log-title-input');
    if (titleInput) titleInput.value = `[Month ${monthNum} Week ${weekNum} Day 1] 日次学習ログ`;

    this.openNewLogModal();
  }

  closeNewLogModal() {
    const modal = document.getElementById('new-log-modal');
    if (modal) modal.classList.remove('active');
  }

  saveDailyLogFromModal() {
    const weekSelect = document.getElementById('log-week-select')?.value || '';
    const title = document.getElementById('log-title-input')?.value || '学習ログ';
    const tag = document.getElementById('log-tag-select')?.value || '理論';
    const body = document.getElementById('log-body-input')?.value || '';

    if (!body.trim()) {
      alert('学習メモの内容を入力してください');
      return;
    }

    const newLog = {
      id: Date.now(),
      title: title.startsWith('[') ? title : `[${weekSelect}] ${title}`,
      tag,
      body,
      created_at: new Date().toISOString()
    };

    this.localDailyLogs.unshift(newLog);
    this.saveLocalDailyLogs();
    this.closeNewLogModal();

    // Reset input
    document.getElementById('log-body-input').value = '';

    // Refresh views
    this.renderActiveMonthCurriculum();
    this.renderAllIssuesAndLogs();
    this.renderLatestLogs();
    alert('学習ログを保存しました！');
  }

  openGitHubIssueNewWindow() {
    const weekSelect = document.getElementById('log-week-select')?.value || '';
    const title = document.getElementById('log-title-input')?.value || '学習ログ';
    const body = document.getElementById('log-body-input')?.value || '';

    const fullTitle = encodeURIComponent(title.startsWith('[') ? title : `[${weekSelect}] ${title}`);
    const fullBody = encodeURIComponent(body);
    const url = `https://github.com/tomoaki16/songwriting-study/issues/new?title=${fullTitle}&body=${fullBody}`;
    window.open(url, '_blank');
  }

  openPromptModal() {
    const modal = document.getElementById('prompt-modal');
    if (modal) modal.classList.add('active');
  }

  closePromptModal() {
    const modal = document.getElementById('prompt-modal');
    if (modal) modal.classList.remove('active');
  }

  copyPromptTemplate() {
    const promptText = `【本日の1時間作曲学習ログ】\n・対象: Month ${this.activeMonth}\n・タイトル: [Month ${this.activeMonth} Week X Day Y] \n・学習テーマ：\n・学んだ理論・気づき：\n・分析した既存曲：\n・Studio One / ギターでの実践内容：\n・自作曲への応用アイデア：\n\n上記について評価・フィードバックを行い、該当Issueの更新（進捗メモ追記またはコメント追加で「進行中」へ変更、学習完了時は「完了」ラベル付与またはstate:closed）をお願いします。`;
    navigator.clipboard.writeText(promptText);
    alert('ChatGPT用学習ログプロンプトをコピーしました！');
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
