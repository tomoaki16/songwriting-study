/**
 * Main Application & SPA Controller with Week-Issue Matching & Navigation
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

    // Search & Filter for GitHub Issues
    const searchInput = document.getElementById('issue-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const labelFilter = document.getElementById('issue-label-select')?.value || 'all';
        this.renderAllIssuesAndLogs(e.target.value, labelFilter);
      });
    }

    const labelSelect = document.getElementById('issue-label-select');
    if (labelSelect) {
      labelSelect.addEventListener('change', (e) => {
        const searchTerm = document.getElementById('issue-search-input')?.value || '';
        this.renderAllIssuesAndLogs(searchTerm, e.target.value);
      });
    }
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
   * Match GitHub Issues and local logs for a specific Month and Week
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
        state: 'completed',
        isLocal: true,
        labels: [{ name: log.tag || '学習ログ', color: '00f2fe' }]
      })),
      ...(window.githubManager.issues || [])
    ];

    const weekPattern1 = `Month ${monthNum} Week ${weekNum}`.toLowerCase();
    const weekPattern2 = `Week ${weekNum}`.toLowerCase();

    return allIssues.filter(issue => {
      const titleLower = (issue.title || '').toLowerCase();
      const bodyLower = (issue.body || '').toLowerCase();
      const labels = (issue.labels || []).map(l => (l.name || '').toLowerCase());

      // Check title or body match for Week W / Month M Week W
      if (titleLower.includes(weekPattern1) || titleLower.includes(weekPattern2)) return true;
      if (labels.includes(weekPattern2) || labels.includes(`week${weekNum}`)) return true;

      // Special check: if Month 1 and week 1, match Month 1 issue with Week 1 in title/body
      if (labels.includes(`month ${monthNum}`) && (titleLower.includes(`week ${weekNum}`) || bodyLower.includes(`week ${weekNum}`))) {
        return true;
      }

      return false;
    });
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

      const matchedIssuesHtml = matchedIssues.length > 0 ? matchedIssues.map(issue => `
        <div style="background: rgba(255,255,255,0.04); border-left: 3px solid var(--primary-cyan); border-radius: var(--radius-sm); padding: 8px 10px; margin-top: 6px; font-size: 0.82rem;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <a href="${issue.html_url}" target="${issue.isLocal ? '_self' : '_blank'}" style="color: #ffffff; font-weight: 600; text-decoration: none;">
              ${issue.isLocal ? '[ローカル]' : `#${issue.number}`} ${this.escapeHtml(issue.title)}
            </a>
            <span style="font-size: 0.72rem; color: var(--text-muted);">${new Date(issue.created_at).toLocaleDateString('ja-JP')}</span>
          </div>
          <p style="color: var(--text-muted); margin-top: 4px; font-size: 0.78rem; line-height: 1.4;">
            ${this.escapeHtml((issue.body || '').slice(0, 120))}${(issue.body || '').length > 120 ? '...' : ''}
          </p>
        </div>
      `).join('') : `
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
                🔍 Issue一覧で検索
              </button>
              <button class="btn btn-primary" style="padding: 4px 10px; font-size: 0.75rem;" 
                onclick="window.app.openNewLogModalWithWeek(${monthData.month}, ${w.week})">
                ＋ ログを入力
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
              <span style="font-size: 0.78rem; font-weight: 600; color: var(--accent-amber);">✍️ 今週の個人民標・一筆メモ</span>
            </div>
            <input type="text" class="form-control" style="font-size: 0.82rem; padding: 6px 10px;" 
              placeholder="例: Cメジャーのサビ進行3パターン作成を目標にする" 
              value="${this.escapeHtml(customNote)}"
              onchange="window.app.updateWeeklyNote('${wId}', this.value)">
          </div>

          <!-- Associated Week GitHub Issues & Logs -->
          <div style="background: rgba(15, 23, 42, 0.4); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <span style="font-size: 0.82rem; font-weight: 600; color: var(--primary-cyan);">
                📌 今週の関連Issue・日々の学習ログ (${matchedIssues.length}件)
              </span>
            </div>
            ${matchedIssuesHtml}
          </div>

          <!-- Task Checkbox -->
          <div style="border-top: 1px dashed var(--border-color); padding-top: 10px; margin-top: 10px;">
            <h4 style="font-size: 0.82rem; color: var(--accent-green); margin-bottom: 6px;">実践・課題クリア</h4>
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
      this.renderAllIssuesAndLogs(`Week ${weekNum}`, 'all');
    }
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

  renderAllIssuesAndLogs(searchTerm = '', labelFilter = 'all') {
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
        state: 'completed',
        isLocal: true,
        labels: [{ name: log.tag || '学習ログ', color: '00f2fe' }]
      })),
      ...(window.githubManager.issues || [])
    ];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      combinedLogs = combinedLogs.filter(item => 
        item.title.toLowerCase().includes(term) || 
        (item.body && item.body.toLowerCase().includes(term))
      );
    }

    if (labelFilter !== 'all') {
      combinedLogs = combinedLogs.filter(item => 
        item.labels && item.labels.some(l => l.name.toLowerCase() === labelFilter.toLowerCase())
      );
    }

    if (combinedLogs.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <p>該当する学習ログ・Issueは見つかりませんでした。「＋ 新規ログ入力」から追加できます。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = combinedLogs.map(issue => {
      const dateStr = new Date(issue.created_at).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      
      const labelsHtml = (issue.labels || []).map(l => 
        `<span class="label-badge" style="border-left: 2px solid #${l.color || '00f2fe'};">${l.name}</span>`
      ).join('');

      return `
        <div class="issue-card">
          <div class="issue-header">
            <div>
              <span class="label-badge" style="background: ${issue.isLocal ? 'rgba(0, 245, 160, 0.2)' : 'rgba(0, 242, 254, 0.15)'}; color: ${issue.isLocal ? 'var(--accent-green)' : 'var(--primary-cyan)'};">
                ${issue.isLocal ? 'LOCAL LOG' : `ISSUE #${issue.number}`}
              </span>
              <a href="${issue.html_url}" target="${issue.isLocal ? '_self' : '_blank'}" class="issue-title" style="margin-left: 6px;">
                ${window.githubManager.escapeHtml(issue.title)}
              </a>
            </div>
            <span class="issue-number">${dateStr}</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin: 8px 0; white-space: pre-wrap;">${window.githubManager.escapeHtml(issue.body)}</p>
          <div class="issue-labels">
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
      ...this.localDailyLogs.map(l => ({ title: l.title, created_at: l.created_at, url: '#' })),
      ...(window.githubManager.issues || []).map(i => ({ title: `#${i.number} ${i.title}`, created_at: i.created_at, url: i.html_url }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);

    if (all.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">登録されたログはありません。「＋ 新規ログ・Issue入力」から追加できます。</p>`;
      return;
    }

    container.innerHTML = all.map(item => `
      <div style="padding: 10px 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); margin-bottom: 6px; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
        <a href="${item.url}" target="_blank" style="color: var(--primary-cyan); font-weight: 600; text-decoration: none;">
          ${this.escapeHtml(item.title)}
        </a>
        <span style="font-size: 0.75rem; color: var(--text-dim);">${new Date(item.created_at).toLocaleDateString('ja-JP')}</span>
      </div>
    `).join('');
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
    if (titleInput) titleInput.value = `[Month ${monthNum} Week ${weekNum}] 日次学習ログ`;

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
    const promptText = `【本日の1時間作曲学習ログ】\n・対象: Month ${this.activeMonth}\n・タイトル: [Month ${this.activeMonth} Week X] \n・学習テーマ：\n・学んだ理論・気づき：\n・分析した既存曲：\n・Studio One / ギターでの実践内容：\n・自作曲への応用アイデア：\n\n上記についてGitHub Issue ([Month ${this.activeMonth} Week X] 形式のタイトル) の登録・更新およびフィードバックをお願いします。`;
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
