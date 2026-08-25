/**
 * Curriculum State Helper Module
 * Also manages study-day metrics shown on the dashboard.
 */
class CurriculumHelper {
  constructor() {
    this.name = 'CurriculumHelper';
    this.studyDayData = { startDate: '2026-08-16', studyDates: [] };
  }

  async loadStudyDayData() {
    try {
      const response = await fetch('data/study-days.json', { cache: 'no-store' });
      if (response.ok) {
        this.studyDayData = await response.json();
      }
    } catch (error) {
      console.warn('study-days.json の読み込みに失敗しました:', error);
    }
  }

  getTodayInJapan() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date());

    const values = {};
    parts.forEach(part => {
      if (part.type !== 'literal') values[part.type] = part.value;
    });
    return `${values.year}-${values.month}-${values.day}`;
  }

  dateToUtcValue(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  getElapsedDayNumber() {
    const startDate = this.studyDayData.startDate || '2026-08-16';
    const today = this.getTodayInJapan();
    const diff = this.dateToUtcValue(today) - this.dateToUtcValue(startDate);
    return Math.max(1, Math.floor(diff / 86400000) + 1);
  }

  collectStudyDatesFromIssues() {
    const dates = new Set(this.studyDayData.studyDates || []);
    const items = [
      ...(window.githubManager?.issues || []),
      ...(window.app?.localDailyLogs || [])
    ];

    items.forEach(item => {
      const text = `${item.title || ''}\n${item.body || ''}`;
      const regex = /学習日\s*[:：]\s*(\d{4}-\d{2}-\d{2})/g;
      let match;
      while ((match = regex.exec(text)) !== null) {
        dates.add(match[1]);
      }
    });

    return [...dates].sort();
  }

  getStudyDayCount() {
    return this.collectStudyDatesFromIssues().length;
  }

  ensureStudyDayCard() {
    const targetLabel = [...document.querySelectorAll('.stat-label')]
      .find(el => el.textContent.includes('目標学習ペース'));
    const card = targetLabel?.closest('.card');
    if (!card) return;

    card.innerHTML = `
      <div class="stat-widget">
        <div class="stat-icon green"><i class="fa-solid fa-calendar-check"></i></div>
        <div>
          <div class="stat-value" id="stat-study-days">0日</div>
          <div class="stat-label">学習日数</div>
          <div id="stat-elapsed-days" style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">開始から1日目</div>
        </div>
      </div>
    `;
  }

  updateStudyDayStats() {
    this.ensureStudyDayCard();
    const studyDaysEl = document.getElementById('stat-study-days');
    const elapsedDaysEl = document.getElementById('stat-elapsed-days');

    if (studyDaysEl) studyDaysEl.textContent = `${this.getStudyDayCount()}日`;
    if (elapsedDaysEl) elapsedDaysEl.textContent = `開始から${this.getElapsedDayNumber()}日目`;
  }

  ensureStudyDateInBody(body) {
    if (/学習日\s*[:：]\s*\d{4}-\d{2}-\d{2}/.test(body || '')) return body;
    return `学習日: ${this.getTodayInJapan()}\n${body || ''}`.trim();
  }

  installAppHooks() {
    if (!window.app) return;

    const originalUpdateDashboardStats = window.app.updateDashboardStats.bind(window.app);
    window.app.updateDashboardStats = (...args) => {
      const result = originalUpdateDashboardStats(...args);
      this.updateStudyDayStats();
      return result;
    };

    const originalOpenPromptModal = window.app.openPromptModal.bind(window.app);
    window.app.openPromptModal = (...args) => {
      const result = originalOpenPromptModal(...args);
      const area = document.getElementById('prompt-template-area');
      if (area) {
        area.value = `【本日の1時間作曲学習ログ】\n・学習日: ${this.getTodayInJapan()}\n・対象: Month ${window.app.activeMonth} Week X Day Y\n・タイトル: [Month ${window.app.activeMonth} Week X Day Y]\n・学習時間：1.0時間（※実績時間を記入）\n・学習テーマ：\n・学んだ理論・気づき：\n・分析した既存曲：\n・Studio One / ギターでの実践内容：\n・自作曲への応用アイデア：\n\n上記について評価・フィードバックを行い、該当Issueの登録・更新をお願いします。Issue本文には必ず「学習日: YYYY-MM-DD」を残してください。同じ日に複数Issueを進めても学習日数は1日として扱います。`;
      }
      return result;
    };

    window.app.copyPromptTemplate = () => {
      const area = document.getElementById('prompt-template-area');
      const promptText = area?.value || `学習日: ${this.getTodayInJapan()}`;
      navigator.clipboard.writeText(promptText);
      alert('ChatGPT用学習ログプロンプトをコピーしました！');
    };

    const originalOpenGitHubIssueNewWindow = window.app.openGitHubIssueNewWindow.bind(window.app);
    window.app.openGitHubIssueNewWindow = () => {
      const bodyInput = document.getElementById('log-body-input');
      if (bodyInput) bodyInput.value = this.ensureStudyDateInBody(bodyInput.value);
      originalOpenGitHubIssueNewWindow();
    };

    const originalSaveDailyLogFromModal = window.app.saveDailyLogFromModal.bind(window.app);
    window.app.saveDailyLogFromModal = () => {
      const bodyInput = document.getElementById('log-body-input');
      if (bodyInput) bodyInput.value = this.ensureStudyDateInBody(bodyInput.value);
      originalSaveDailyLogFromModal();
      this.updateStudyDayStats();
    };
  }

  async init() {
    await this.loadStudyDayData();
    this.ensureStudyDayCard();
    this.updateStudyDayStats();

    // app.js is loaded after this file, so install hooks after DOMContentLoaded handlers finish.
    setTimeout(() => {
      this.installAppHooks();
      this.updateStudyDayStats();
    }, 0);
  }
}

window.curriculumHelper = new CurriculumHelper();
document.addEventListener('DOMContentLoaded', () => {
  window.curriculumHelper.init();
});
