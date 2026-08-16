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

    // 1. Exclude maintenance, infrastructure, chore, bug, refactor, admin tasks
    const excludeKeywords = ['maintenance', 'setup', 'infra', 'chore', 'bug', 'refactor', 'admin', 'ignore', 'ci/cd', 'wontfix', 'duplicate', 'invalid', 'メンテナンス', '環境構築', 'インフラ', 'バグ修正', 'リファクタリング'];
    
    // If any label matches exclude keywords -> exclude
    if (labels.some(l => excludeKeywords.includes(l))) {
      return false;
    }

    // If title contains explicit maintenance/infra/bug prefix -> exclude
    if (excludeKeywords.some(kw => title.startsWith(`[${kw}]`) || title.includes(`[${kw}]`) || title.includes(kw))) {
      return false;
    }

    // 2. Target study task issues (Month M / Week W / Day D / Songs / Music Theory)
    return true;
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
      // Filter ONLY study task issues (excluding PRs and maintenance issues)
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

    // Default seed issues for initial viewing
    return [
      {
        id: 1,
        number: 1,
        title: '[Month 1 Week 1 Day 1] 音名・半音/全音・メジャースケールの理解',
        state: 'open',
        html_url: `https://github.com/${GITHUB_REPO}/issues/1`,
        created_at: '2026-08-16T10:00:00Z',
        body: '## 1日約1時間ログ\n- CメジャースケールをStudio Oneで入力＆ギター指板音確認\n- ドから見た完全5度（ソ）、長3度（ミ）の響きを実機検証。\n- 分析：好きな曲のキーがC Majorであることを確認。',
        labels: [
          { name: 'Month 1', color: '00f2fe' },
          { name: '理論', color: '9d50bb' },
          { name: '学習ログ', color: '00f5a0' }
        ]
      },
      {
        id: 2,
        number: 2,
        title: '[Month 1 Week 1 Day 2] 音程と度数（3度・5度・7度）の確認',
        state: 'open',
        html_url: `https://github.com/${GITHUB_REPO}/issues/2`,
        created_at: '2026-08-15T14:30:00Z',
        body: 'Cmaj7 と C7 の3度・7度の配置を比較。ボイシング変更による緊張感の違いをDAWとギターで確認した。',
        labels: [
          { name: 'Month 1', color: '00f2fe' },
          { name: '実践', color: 'ffb199' }
        ]
      }
    ];
  }

  renderIssues(containerId, issuesList = null, searchTerm = '', labelFilter = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    let items = issuesList || this.issues;

    // Filter by search & label
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
      
      const labelsHtml = (issue.labels || []).map(l => 
        `<span class="label-badge" style="border-left: 2px solid #${l.color || '00f2fe'};">${l.name}</span>`
      ).join('');

      return `
        <div class="issue-card">
          <div class="issue-header">
            <a href="${issue.html_url}" target="_blank" class="issue-title">
              #${issue.number} ${this.escapeHtml(issue.title)}
            </a>
            <span class="issue-number">${dateStr}</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted); line-height: 1.5; margin: 8px 0;">
            ${this.escapeHtml((issue.body || '').slice(0, 150))}${(issue.body || '').length > 150 ? '...' : ''}
          </p>
          <div class="issue-labels">
            <span class="label-badge" style="background: rgba(0, 242, 254, 0.15); color: var(--primary-cyan);">
              ${issue.state.toUpperCase()}
            </span>
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
