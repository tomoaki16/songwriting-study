/**
 * Curriculum State Helper Module
 * Manages study-day and cumulative study-time metrics shown on the dashboard.
 */
class CurriculumHelper {
  constructor() {
    this.name = 'CurriculumHelper';
    this.studyDayData = { startDate: '2026-08-16', studyDates: [] };
    this.studyTimeData = {
      baselineThroughDate: '2026-08-25',
      baselineMinutes: 756,
      baselineLabel: '12時間36分'
    };
  }

  async loadStudyDayData() {
    try {
      const response = await fetch('data/study-days.json', { cache: 'no-store' });
      if (response.ok) this.studyDayData = await response.json();
    } catch (error) {
      console.warn('study-days.json の読み込みに失敗しました:', error);
    }
  }

  async loadStudyTimeData() {
    try {
      const response = await fetch('data/study-time.json', { cache: 'no-store' });
      if (response.ok) this.studyTimeData = await response.json();
    } catch (error) {
      console.warn('study-time.json の読み込みに失敗しました:', error);
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

  getAllStudyItems() {
    return [
      ...(window.githubManager?.issues || []),
      ...(window.app?.localDailyLogs || [])
    ];
  }

  collectStudyDatesFromIssues() {
    const dates = new Set(this.studyDayData.studyDates || []);

    this.getAllStudyItems().forEach(item => {
      const text = `${item.title || ''}\n${item.body || ''}`;
      const regex = /学習日\s*[:：]\s*(\d{4}-\d{2}-\d{2})/g;
      let match;
      while ((match = regex.exec(text)) !== null) dates.add(match[1]);
    });

    return [...dates].sort();
  }

  getStudyDayCount() {
    return this.collectStudyDatesFromIssues().length;
  }

  collectDailyStudyMinutesAfterBaseline() {
    const baselineDate = this.studyTimeData.baselineThroughDate || '2026-08-25';
    const dailyMinutes = new Map();

    this.getAllStudyItems().forEach(item => {
      const text = `${item.title || ''}\n${item.body || ''}`;
      const dateMatches = [...text.matchAll(/学習日\s*[:：]\s*(\d{4}-\d{2}-\d{2})/g)];
      const minuteMatches = [...text.matchAll(/日次学習時間\s*[:：]\s*(\d+)\s*分/g)];
      if (dateMatches.length === 0 || minuteMatches.length === 0) return;

      const count = Math.min(dateMatches.length, minuteMatches.length);
      for (let i = 0; i < count; i += 1) {
        const date = dateMatches[i][1];
        const minutes = parseInt(minuteMatches[i][1], 10);
        if (!Number.isFinite(minutes) || minutes <= 0 || date <= baselineDate) continue;

        // One daily total per calendar date. If duplicated accidentally, keep the largest value
        // rather than adding Issue-level entries together.
        dailyMinutes.set(date, Math.max(dailyMinutes.get(date) || 0, minutes));
      }
    });

    return dailyMinutes;
  }

  getTotalStudyMinutes() {
    const baseline = Number(this.studyTimeData.baselineMinutes) || 0;
    const additional = [...this.collectDailyStudyMinutesAfterBaseline().values()]
      .reduce((sum, minutes) => sum + minutes, 0);
    return baseline + additional;
  }

  getTotalStudyHours() {
    return Math.round((this.getTotalStudyMinutes() / 60) * 10) / 10;
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
    const totalTimeEl = document.getElementById('stat-total-study-time');

    if (studyDaysEl) studyDaysEl.textContent = `${this.getStudyDayCount()}日`;
    if (elapsedDaysEl) elapsedDaysEl.textContent = `開始から${this.getElapsedDayNumber()}日目`;
    if (totalTimeEl) totalTimeEl.textContent = `${this.getTotalStudyHours()} 時間`;
  }

  ensureStudyDateInBody(body) {
    if (/学習日\s*[:：]\s*\d{4}-\d{2}-\d{2}/.test(body || '')) return body;
    return `学習日: ${this.getTodayInJapan()}\n${body || ''}`.trim();
  }

  installAppHooks() {
    if (!window.app) return;

    // Replace the old per-Issue estimate entirely. No 1-hour fallback is allowed.
    window.app.calculateTotalStudyTime = () => this.getTotalStudyHours();

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
        area.value = `【本日の1時間作曲学習ログ】\n・学習日: ${this.getTodayInJapan()}\n・日次学習時間: XX分（その日の全学習が終わった時点の合計を、1日1回だけ記入）\n・対象: Month ${window.app.activeMonth} Week X Day Y\n・タイトル: [Month ${window.app.activeMonth} Week X Day Y]\n・学習テーマ：\n・学んだ理論・気づき：\n・分析した既存曲：\n・Studio One / ギターでの実践内容：\n・自作曲への応用アイデア：\n\n上記について評価・フィードバックを行い、該当Issueの登録・更新をお願いします。Issue本文には必ず「学習日: YYYY-MM-DD」を残してください。「日次学習時間: XX分」は、その日の最後に更新するIssueの本文へ1日1回だけ記録してください。同じ日に複数Issueを進めても学習日数・学習時間を重複加算しません。`;
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
    await Promise.all([this.loadStudyDayData(), this.loadStudyTimeData()]);
    this.ensureStudyDayCard();
    this.updateStudyDayStats();

    // app.js is loaded after this file, so install hooks after DOMContentLoaded handlers finish.
    setTimeout(() => {
      this.installAppHooks();
      window.app?.updateDashboardStats();
      this.updateStudyDayStats();
    }, 0);
  }
}

window.curriculumHelper = new CurriculumHelper();
document.addEventListener('DOMContentLoaded', () => {
  window.curriculumHelper.init();
});
