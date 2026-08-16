/**
 * Main Application & SPA Controller
 */

class AppController {
  constructor() {
    this.curriculumData = null;
    this.activeMonth = 1;
    this.checkedTasks = this.loadTaskState();
  }

  async init() {
    this.setupEventListeners();
    await this.loadCurriculum();
    
    // Initialize components
    this.renderMonthTabs();
    this.renderActiveMonthCurriculum();
    window.githubManager.fetchIssues().then(() => {
      window.githubManager.renderIssues('github-issues-container');
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
      btn.addEventListener('click', (e) => {
        const view = btn.dataset.view;
        this.switchView(view);
      });
    });

    // Search & Filter for GitHub Issues
    const searchInput = document.getElementById('issue-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const labelFilter = document.getElementById('issue-label-select')?.value || 'all';
        window.githubManager.renderIssues('github-issues-container', null, e.target.value, labelFilter);
      });
    }

    const labelSelect = document.getElementById('issue-label-select');
    if (labelSelect) {
      labelSelect.addEventListener('change', (e) => {
        const searchTerm = document.getElementById('issue-search-input')?.value || '';
        window.githubManager.renderIssues('github-issues-container', null, searchTerm, e.target.value);
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
      'curriculum': '6か月カリキュラム・実施計画',
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

  renderActiveMonthCurriculum() {
    const container = document.getElementById('curriculum-month-detail');
    if (!container || !this.curriculumData) return;

    const monthData = this.curriculumData.months.find(m => m.month === this.activeMonth);
    if (!monthData) return;

    let html = `
      <div class="card" style="margin-bottom: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="week-badge" style="margin-bottom: 8px; display: inline-block;">Month ${monthData.month}</span>
            <h2 style="font-size: 1.4rem; color: #ffffff;">${monthData.title}</h2>
            <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 6px; line-height: 1.5;">${monthData.goal}</p>
          </div>
        </div>
      </div>
    `;

    html += monthData.weeks.map(w => {
      const wId = `m${monthData.month}_w${w.week}`;

      return `
        <div class="week-card">
          <div class="week-header">
            <div>
              <span class="week-badge">Week ${w.week}</span>
              <h3 style="display: inline; font-size: 1.1rem; margin-left: 10px; color: #ffffff;">${w.title}</h3>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0;">
            <div>
              <h4 style="font-size: 0.85rem; color: var(--primary-cyan); margin-bottom: 8px;">理論・学習項目</h4>
              <ul style="padding-left: 18px; color: var(--text-muted); font-size: 0.88rem; line-height: 1.6;">
                ${w.topics.map(t => `<li>${t}</li>`).join('')}
              </ul>
            </div>
            <div>
              <h4 style="font-size: 0.85rem; color: var(--accent-purple); margin-bottom: 8px;">分析＆ギター接続</h4>
              <p style="color: var(--text-muted); font-size: 0.85rem; margin-bottom: 6px;"><strong>分析:</strong> ${w.analysis}</p>
              ${w.guitar ? `<ul style="padding-left: 18px; color: var(--text-muted); font-size: 0.85rem;">${w.guitar.map(g=>`<li>${g}</li>`).join('')}</ul>` : ''}
            </div>
          </div>

          <div style="border-top: 1px dashed var(--border-color); padding-top: 12px; margin-top: 12px;">
            <h4 style="font-size: 0.85rem; color: var(--accent-green); margin-bottom: 8px;">実践・課題タスク</h4>
            <div class="task-item">
              <input type="checkbox" id="${wId}_task" ${this.checkedTasks[wId] ? 'checked' : ''} 
                onchange="window.app.toggleTask('${wId}', this.checked)">
              <label for="${wId}_task" style="cursor: pointer;">${w.practice}</label>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }

  toggleTask(taskId, isChecked) {
    this.checkedTasks[taskId] = isChecked;
    this.saveTaskState();
    this.updateDashboardStats();
  }

  updateDashboardStats() {
    // Total checked tasks count
    const totalChecked = Object.values(this.checkedTasks).filter(Boolean).length;
    const totalWeeks = 24; // 24 weeks
    const progressPercent = Math.min(100, Math.round((totalChecked / totalWeeks) * 100));

    const percentEl = document.getElementById('overall-progress-percent');
    const fillEl = document.getElementById('overall-progress-fill');
    if (percentEl) percentEl.textContent = `${progressPercent}%`;
    if (fillEl) fillEl.style.width = `${progressPercent}%`;

    // Completed songs count
    const completedSongs = window.songManager.songs.filter(s => s.status === 'completed').length;
    const completedSongsEl = document.getElementById('stat-completed-songs');
    if (completedSongsEl) completedSongsEl.textContent = `${completedSongs} / 5`;
  }

  renderLatestLogs() {
    const container = document.getElementById('dashboard-latest-logs');
    if (!container) return;

    const latest = window.githubManager.issues.slice(0, 3);
    if (latest.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">最新のログはありません。</p>`;
      return;
    }

    container.innerHTML = latest.map(issue => `
      <div style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: var(--radius-md); margin-bottom: 8px;">
        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
          <a href="${issue.html_url}" target="_blank" style="color: var(--primary-cyan); font-weight: 600; text-decoration: none;">
            #${issue.number} ${issue.title}
          </a>
        </div>
      </div>
    `).join('');
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
    const promptText = `【本日の1時間作曲学習ログ】\n・学習テーマ：\n・学んだ理論・気づき：\n・分析した既存曲：\n・Studio One / ギターでの実践内容：\n・自作曲への応用アイデア：\n\n上記についてGitHub Issue登録・振り返りフィードバックをお願いします。`;
    navigator.clipboard.writeText(promptText);
    alert('ChatGPT用学習ログプロンプトテンプレートをクリップボードにコピーしました！');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
