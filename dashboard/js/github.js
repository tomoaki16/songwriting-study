/**
 * GitHub API & Daily Log Management Module
 * Repository: tomoaki16/songwriting-study
 *
 * Study metrics policy:
 * - GitHub Issues are the single source of truth.
 * - No VPS-side JSON updates are required for daily operation.
 * - A [Study Metrics] issue provides the historical baseline.
 * - Daily records use:
 *     学習日: YYYY-MM-DD
 *     日次学習時間: XX分
 */

const GITHUB_REPO = 'tomoaki16/songwriting-study';

class GitHubManager {
  constructor() {
    this.tokenKey = 'songwriting_github_pat';
    this.issues = [];
    this.allIssues = [];
    this.loading = false;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey) || '';
  }

  setToken(token) {
    if (token) {
      localStorage.setItem(this.tokenKey, token.trim());
    } else {
      localStorage.removeItem(this.tokenKey);
    }
  }

  /**
   * Filter out non-study/maintenance issues from normal curriculum/log views.
   * The Study Metrics issue is retained in allIssues for aggregation, but hidden
   * from normal study-task lists.
   */
  isStudyTaskIssue(item) {
    if (item.pull_request) return false;

    const title = (item.title || '').toLowerCase();
    const labels = (item.labels || []).map(l => (l.name || '').toLowerCase());
    const excludeKeywords = [
      'maintenance', 'setup', 'infra', 'chore', 'bug', 'refactor', 'admin',
      'ignore', 'ci/cd', 'wontfix', 'duplicate', 'invalid', 'study metrics',
      'メンテナンス', '環境構築', 'インフラ', 'バグ修正', 'リファクタリング'
    ];

    if (labels.some(l => excludeKeywords.includes(l))) return false;
    if (excludeKeywords.some(kw => title.startsWith(`[${kw}]`) || title.includes(`[${kw}]`) || title.includes(kw))) return false;
    return true;
  }

  getIssueStatus(issue) {
    const isClosed = issue.state === 'closed' ||
      (issue.labels || []).some(l => ['完了', 'completed', 'done', 'closed'].includes((l.name || '').toLowerCase()));
    if (isClosed) return 'completed';

    const commentsCount = typeof issue.comments === 'number' ? issue.comments : 0;
    const labels = (issue.labels || []).map(l => (l.name || '').toLowerCase());
    const hasInProgressLabel = labels.some(l => ['進行中', 'in-progress', 'doing', 'wip', '作業中'].includes(l));
    const body = issue.body || '';
    const hasCheckedItems = body.includes('[x]') || body.includes('[X]');

    if (commentsCount > 0 || hasInProgressLabel || hasCheckedItems) return 'in_progress';
    return 'unstarted';
  }

  /**
   * Fetch all issues with pagination so metrics do not break after issue #100.
   */
  async fetchIssues() {
    this.loading = true;
    const token = this.getToken();
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = `token ${token}`;

    try {
      const all = [];
      for (let page = 1; page <= 20; page += 1) {
        const response = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/issues?state=all&per_page=100&page=${page}`,
          { headers }
        );
        if (!response.ok) throw new Error(`GitHub API returned status ${response.status}`);

        const pageData = await response.json();
        all.push(...pageData.filter(item => !item.pull_request));
        if (pageData.length < 100) break;
      }

      this.allIssues = all;
      this.issues = all.filter(item => this.isStudyTaskIssue(item));
      localStorage.setItem('songwriting_cached_all_issues', JSON.stringify(this.allIssues));
      localStorage.setItem('songwriting_cached_issues', JSON.stringify(this.issues));
      this.loading = false;
      return { success: true, issues: this.issues };
    } catch (err) {
      console.warn('GitHub API fetch failed or rate limited, loading cached data:', err);
      this.loading = false;
      this.allIssues = this.getCachedAllIssues();
      this.issues = this.allIssues.filter(item => this.isStudyTaskIssue(item));
      return { success: false, issues: this.issues, error: err.message };
    }
  }

  getCachedAllIssues() {
    const allCached = localStorage.getItem('songwriting_cached_all_issues');
    if (allCached) {
      try { return JSON.parse(allCached); } catch (e) {}
    }

    const oldCached = localStorage.getItem('songwriting_cached_issues');
    if (oldCached) {
      try { return JSON.parse(oldCached); } catch (e) {}
    }
    return [];
  }

  getFallbackIssues() {
    return this.getCachedAllIssues();
  }

  renderIssues(containerId, issuesList = null, searchTerm = '', labelFilter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let items = issuesList || this.issues;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(issue =>
        (issue.title || '').toLowerCase().includes(term) ||
        (issue.body || '').toLowerCase().includes(term)
      );
    }
    if (labelFilter !== 'all') {
      items = items.filter(issue =>
        issue.labels && issue.labels.some(l => (l.name || '').toLowerCase() === labelFilter.toLowerCase())
      );
    }

    if (items.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted);"><p>該当する学習タスク・Issueは見つかりませんでした。</p></div>';
      return;
    }

    container.innerHTML = items.map(issue => {
      const dateStr = new Date(issue.created_at).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
      const status = this.getIssueStatus(issue);
      const labelsHtml = (issue.labels || []).map(l =>
        `<span class="label-badge" style="border-left:2px solid #${l.color || '00f2fe'};">${this.escapeHtml(l.name)}</span>`
      ).join('');
      const titleIcon = status === 'completed'
        ? '<i class="fa-solid fa-circle-check" style="color:var(--accent-green);margin-right:6px;"></i>'
        : status === 'in_progress'
          ? '<i class="fa-solid fa-clock-rotate-left" style="color:var(--primary-cyan);margin-right:6px;"></i>'
          : '<i class="fa-regular fa-circle" style="color:var(--text-muted);margin-right:6px;"></i>';

      return `
        <div class="issue-card issue-${status.replace('_', '-')}">
          <div class="issue-header">
            <a href="${issue.html_url}" target="_blank" class="issue-title">${titleIcon}#${issue.number} ${this.escapeHtml(issue.title)}</a>
            <span class="issue-number">${dateStr}</span>
          </div>
          <p style="font-size:0.88rem;color:var(--text-muted);line-height:1.5;margin:8px 0;">${this.escapeHtml((issue.body || '').slice(0, 150))}${(issue.body || '').length > 150 ? '...' : ''}</p>
          <div class="issue-labels">${labelsHtml}</div>
        </div>`;
    }).join('');
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

window.githubManager = new GitHubManager();

/**
 * Issue-only study metrics aggregator.
 * Historical data is represented by a baseline marker in [Study Metrics].
 * New daily records can live in any Issue body.
 */
function calculateIssueStudyMetrics() {
  const sourceIssues = (window.githubManager && window.githubManager.allIssues && window.githubManager.allIssues.length)
    ? window.githubManager.allIssues
    : ((window.githubManager && window.githubManager.issues) || []);

  let baselineDate = null;
  let baselineMinutes = 0;
  let baselineDays = 0;
  let startDate = '2026-08-16';

  sourceIssues.forEach(issue => {
    const body = issue.body || '';
    const baseDateMatch = body.match(/学習基準日\s*[：:]\s*(\d{4}-\d{2}-\d{2})/);
    if (!baseDateMatch) return;

    const candidateDate = baseDateMatch[1];
    if (!baselineDate || candidateDate > baselineDate) {
      baselineDate = candidateDate;
      const startMatch = body.match(/学習開始日\s*[：:]\s*(\d{4}-\d{2}-\d{2})/);
      const minutesMatch = body.match(/基準累計学習時間\s*[：:]\s*(\d+)\s*分/);
      const daysMatch = body.match(/基準実学習日数\s*[：:]\s*(\d+)\s*日/);
      if (startMatch) startDate = startMatch[1];
      baselineMinutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
      baselineDays = daysMatch ? parseInt(daysMatch[1], 10) : 0;
    }
  });

  const dailyMinutes = new Map();
  sourceIssues.forEach(issue => {
    const lines = (issue.body || '').split(/\r?\n/);
    let currentStudyDate = null;

    lines.forEach(line => {
      const dateMatch = line.match(/^\s*(?:[-*]\s*)?学習日\s*[：:]\s*(\d{4}-\d{2}-\d{2})\s*$/);
      if (dateMatch) {
        currentStudyDate = dateMatch[1];
        return;
      }

      const timeMatch = line.match(/^\s*(?:[-*]\s*)?日次学習時間\s*[：:]\s*(\d+)\s*分\s*$/);
      if (timeMatch && currentStudyDate && (!baselineDate || currentStudyDate > baselineDate)) {
        const minutes = parseInt(timeMatch[1], 10);
        const old = dailyMinutes.get(currentStudyDate) || 0;
        dailyMinutes.set(currentStudyDate, Math.max(old, minutes));
      }
    });
  });

  const addedMinutes = [...dailyMinutes.values()].reduce((sum, n) => sum + n, 0);
  const totalMinutes = baselineMinutes + addedMinutes;
  const studyDays = baselineDays + dailyMinutes.size;

  const todayParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(new Date()).reduce((acc, p) => {
    if (p.type !== 'literal') acc[p.type] = p.value;
    return acc;
  }, {});
  const today = `${todayParts.year}-${todayParts.month}-${todayParts.day}`;

  const toUtcDay = s => {
    const [y, m, d] = s.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  const elapsedDays = Math.max(1, Math.floor((toUtcDay(today) - toUtcDay(startDate)) / 86400000) + 1);

  return { startDate, baselineDate, baselineMinutes, baselineDays, dailyMinutes, totalMinutes, studyDays, elapsedDays };
}

function formatStudyMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes ? `${hours}時間${minutes}分` : `${hours}時間`;
}

/**
 * app.js currently contains legacy time estimation. Patch the running app once
 * so all dashboard refreshes use Issue-only metrics. This is a one-time frontend
 * code deployment; after that, normal daily operation requires Issue updates only.
 */
window.addEventListener('load', () => {
  if (!window.app) return;

  window.app.calculateTotalStudyTime = function() {
    return Math.round((calculateIssueStudyMetrics().totalMinutes / 60) * 100) / 100;
  };

  const originalUpdateDashboardStats = window.app.updateDashboardStats.bind(window.app);
  window.app.updateDashboardStats = function() {
    originalUpdateDashboardStats();
    const metrics = calculateIssueStudyMetrics();

    const timeEl = document.getElementById('stat-total-study-time');
    if (timeEl) timeEl.textContent = formatStudyMinutes(metrics.totalMinutes);

    let studyDaysEl = document.getElementById('stat-study-days');
    if (!studyDaysEl) {
      studyDaysEl = [...document.querySelectorAll('.stat-value')]
        .find(el => (el.textContent || '').includes('1 hr / day'));
      if (studyDaysEl) studyDaysEl.id = 'stat-study-days';
    }

    if (studyDaysEl) {
      studyDaysEl.textContent = `${metrics.studyDays}日`;
      const label = studyDaysEl.parentElement && studyDaysEl.parentElement.querySelector('.stat-label');
      if (label) label.textContent = `学習日数（開始から${metrics.elapsedDays}日目）`;
    }
  };

  window.studyMetrics = {
    calculate: calculateIssueStudyMetrics,
    formatMinutes: formatStudyMinutes
  };

  window.app.updateDashboardStats();
  if (typeof window.app.renderActiveMonthCurriculum === 'function') {
    window.app.renderActiveMonthCurriculum();
  }
});
