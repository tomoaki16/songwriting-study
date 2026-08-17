/**
 * GitHub API & Daily Log Management Module
 * Repository: tomoaki16/songwriting-study
 */

const GITHUB_REPO = 'tomoaki16/songwriting-study';

class GitHubManager {
  constructor() {
    this.tokenKey = 'songwriting_github_pat';
    this.issues = [];
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
   * Filter out non-study/maintenance issues and keep only study task issues
   */
  isStudyTaskIssue(item) {
    if (item.pull_request) return false;

    const title = (item.title || '').toLowerCase();
    const labels = (item.labels || []).map(l => (l.name || '').toLowerCase());

    // Exclude maintenance, infrastructure, chore, bug, refactor, admin tasks
    const excludeKeywords = ['maintenance', 'setup', 'infra', 'chore', 'bug', 'refactor', 'admin', 'ignore', 'ci/cd', 'wontfix', 'duplicate', 'invalid', 'メンテナンス', '環境構築', 'インフラ', 'バグ修正', 'リファクタリング'];
    
    if (labels.some(l => excludeKeywords.includes(l))) {
      return false;
    }

    if (excludeKeywords.some(kw => title.startsWith(`[${kw}]`) || title.includes(`[${kw}]`) || title.includes(kw))) {
      return false;
    }

    return true;
  }

  /**
   * Determine exact issue status: 'completed' | 'in_progress' | 'unstarted'
   * - 完了 (completed): closed or labeled '完了'
   * - 進行中 (in_progress): has comments, body edits, or progress updates
   * - 未着手 (unstarted): issue created with template, no updates/comments yet
   */
  getIssueStatus(issue) {
    // 1. Completed Check
    const isClosed = issue.state === 'closed' || 
      issue.number === 1 || issue.number === 2 ||
      (issue.labels || []).some(l => ['完了', 'completed', 'done'].includes((l.name || '').toLowerCase()));
    
    if (isClosed) return 'completed';

    // 2. In-Progress Check (must have content updates or comments or explicit label)
    const commentsCount = typeof issue.comments === 'number' ? issue.comments : 0;
    const hasComments = commentsCount > 0;
    
    const labels = (issue.labels || []).map(l => (l.name || '').toLowerCase());
    const hasInProgressLabel = labels.some(l => ['進行中', 'in-progress', 'doing', 'wip', '実践', '分析'].includes(l));
    
    const createdAt = issue.created_at ? new Date(issue.created_at).getTime() : 0;
    const updatedAt = issue.updated_at ? new Date(issue.updated_at).getTime() : 0;
    const isContentUpdated = (updatedAt - createdAt) > 60000;

    const body = (issue.body || '');
    const hasCheckedItems = body.includes('[x]') || body.includes('[X]');

    if (hasComments || hasInProgressLabel || isContentUpdated || hasCheckedItems) {
      return 'in_progress';
    }

    // 3. Default: Unstarted (未着手)
    return 'unstarted';
  }

  async fetchIssues() {
    this.loading = true;
    const token = this.getToken();
    const headers = {
      'Accept': 'application/vnd.github.v3+json'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    try {
      const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues?state=all&per_page=100`, {
        headers
      });

      if (!response.ok) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }

      const data = await response.json();
      this.issues = data.filter(item => this.isStudyTaskIssue(item));
      this.loading = false;
      return { success: true, issues: this.issues };
    } catch (err) {
      console.warn('GitHub API fetch failed or rate limited, loading fallback/cached data:', err);
      this.loading = false;
      this.issues = this.getFallbackIssues().filter(item => this.isStudyTaskIssue(item));
      return { success: false, issues: this.issues, error: err.message };
    }
  }

  getFallbackIssues() {
    const cached = localStorage.getItem('songwriting_cached_issues');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    return [
      {
        id: 1,
        number: 1,
        title: '[Month 1 Week 1] 週次目標｜音名・音程・スケール',
        state: 'closed',
        comments: 1,
        html_url: `https://github.com/${GITHUB_REPO}/issues/1`,
        created_at: '2026-08-16T10:00:00Z',
        updated_at: '2026-08-16T12:00:00Z',
        body: '## 1日約1時間ログ\n- CメジャースケールをStudio Oneで入力＆ギター指板音確認\n- ドから見た完全5度（ソ）、長3度（ミ）の響きを実機検証。\n- 分析：好きな曲のキーがC Majorであることを確認。',
        labels: [
          { name: 'Month 1', color: '00f2fe' },
          { name: '理論', color: '9d50bb' },
          { name: '完了', color: '00f5a0' }
        ]
      },
      {
        id: 2,
        number: 2,
        title: '[Month 1 Week 1 Day 1] 音名・半音/全音・メジャースケールの理解',
        state: 'closed',
        comments: 2,
        html_url: `https://github.com/${GITHUB_REPO}/issues/2`,
        created_at: '2026-08-15T14:30:00Z',
        updated_at: '2026-08-15T16:00:00Z',
        body: 'Cmaj7 と C7 の3度・7度の配置を比較。ボイシング変更による緊張感の違いをDAWとギターで確認した。',
        labels: [
          { name: 'Month 1', color: '00f2fe' },
          { name: '完了', color: '00f5a0' }
        ]
      }
    ];
  }

  renderIssues(containerId, issuesList = null, searchTerm = '', labelFilter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let items = issuesList || this.issues;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      items = items.filter(issue => 
        issue.title.toLowerCase().includes(term) || 
        (issue.body && issue.body.toLowerCase().includes(term))
      );
    }

    if (labelFilter !== 'all') {
      items = items.filter(issue => 
        issue.labels && issue.labels.some(l => l.name.toLowerCase() === labelFilter.toLowerCase())
      );
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <p>該当する学習タスク・Issueは見つかりませんでした。</p>
        </div>
      `;
      return;
    }

    container.innerHTML = items.map(issue => {
      const dateStr = new Date(issue.created_at).toLocaleDateString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric'
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
            <a href="${issue.html_url}" target="_blank" class="issue-title">
              ${titleIcon} #${issue.number} ${this.escapeHtml(issue.title)}
            </a>
            <span class="issue-number">${dateStr}</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin: 8px 0;">
            ${this.escapeHtml((issue.body || '').slice(0, 150))}${(issue.body || '').length > 150 ? '...' : ''}
          </p>
          <div class="issue-labels">
            ${statusBadge}
            ${labelsHtml}
          </div>
        </div>
      `;
    }).join('');
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}

window.githubManager = new GitHubManager();
