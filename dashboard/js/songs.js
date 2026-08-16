/**
 * 5-Song Pipeline Management Module
 */

class SongPipelineManager {
  constructor() {
    this.storageKey = 'songwriting_songs_data';
    this.songs = this.loadSongs();
  }

  getDefaultSongs() {
    return [
      {
        id: 'song01',
        number: 'Song 01',
        title: 'Untitled Track 1',
        status: 'idea',
        key: 'C Major',
        bpm: 120,
        theme: '明るいロックポップス・サビの解放感',
        leadInstrument: 'Guitar / Vocal',
        nextStep: 'Month 2で8〜16小節のコード進行とサビメロディ確定',
        notes: 'Month 1〜2のアイデアから派生。'
      },
      {
        id: 'song02',
        number: 'Song 02',
        title: 'Untitled Track 2',
        status: 'backlog',
        key: 'A Minor',
        bpm: 105,
        theme: 'エモーショナルなバラード・メロウなベース',
        leadInstrument: 'Bass / Vocal',
        nextStep: 'Month 3よりコード進行とドラムパターン打ち込み開始',
        notes: 'Month 3リズムセクション理解後に着手。'
      },
      {
        id: 'song03',
        number: 'Song 03',
        title: 'Untitled Track 3',
        status: 'backlog',
        key: 'G Major',
        bpm: 128,
        theme: 'アップテンポバンドサウンド・ギターカッティング',
        leadInstrument: 'Guitar',
        nextStep: 'Month 4より着手',
        notes: 'Month 4曲設計手法を適用。'
      },
      {
        id: 'song04',
        number: 'Song 04',
        title: 'Untitled Track 4',
        status: 'backlog',
        key: 'E Minor',
        bpm: 96,
        theme: 'ミディアムグルーヴ・空間系ギター',
        leadInstrument: 'Guitar / Drums',
        nextStep: 'Month 5より素材作り開始',
        notes: 'Month 5録音・音作りを適用。'
      },
      {
        id: 'song05',
        number: 'Song 05',
        title: 'Untitled Track 5',
        status: 'backlog',
        key: 'D Major',
        bpm: 116,
        theme: '半年間の学習成果を統合した総仕上げ楽曲',
        leadInstrument: 'All Ensemble',
        nextStep: 'Month 5〜6でフル制作',
        notes: 'Month 6全知識統合。'
      }
    ];
  }

  loadSongs() {
    const data = localStorage.getItem(this.storageKey);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {}
    }
    return this.getDefaultSongs();
  }

  saveSongs() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.songs));
  }

  updateSong(id, updatedFields) {
    const song = this.songs.find(s => s.id === id);
    if (song) {
      Object.assign(song, updatedFields);
      this.saveSongs();
      return true;
    }
    return false;
  }

  getStatusBadge(status) {
    const map = {
      'backlog': { label: 'Backlog', class: 'text-muted' },
      'idea': { label: 'Idea (骨格)', class: 'cyan' },
      'structuring': { label: 'Structuring', class: 'amber' },
      'arrangement': { label: 'Arrangement', class: 'cyan' },
      'production': { label: 'Production', class: 'purple' },
      'mixing': { label: 'Mixing', class: 'purple' },
      'completed': { label: 'Complete (完成)', class: 'green' }
    };
    return map[status] || { label: status, class: 'cyan' };
  }

  renderSongPipeline(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = this.songs.map(song => {
      const badge = this.getStatusBadge(song.status);

      return `
        <div class="song-card status-${song.status}">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="song-number">${song.number}</span>
            <span class="label-badge" style="background: rgba(255,255,255,0.08);">${badge.label}</span>
          </div>

          <div style="margin: 8px 0 12px 0;">
            <input type="text" class="song-title-input" value="${this.escapeHtml(song.title)}" 
              onchange="window.songManager.updateSongTitle('${song.id}', this.value)" placeholder="曲タイトルを入力">
          </div>

          <div class="song-meta-row">
            <span>Key: <strong style="color: var(--primary-cyan);">${song.key}</strong></span>
            <span>BPM: <strong style="color: var(--primary-cyan);">${song.bpm}</strong></span>
          </div>

          <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
            <strong>テーマ:</strong> ${this.escapeHtml(song.theme)}
          </div>

          <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 12px;">
            <strong>次の一歩:</strong> ${this.escapeHtml(song.nextStep)}
          </div>

          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label" style="font-size: 0.75rem;">ステータス変更</label>
            <select class="status-select" onchange="window.songManager.updateSongStatus('${song.id}', this.value)">
              <option value="backlog" ${song.status === 'backlog' ? 'selected' : ''}>Backlog (未着手)</option>
              <option value="idea" ${song.status === 'idea' ? 'selected' : ''}>Idea (構想・短曲)</option>
              <option value="structuring" ${song.status === 'structuring' ? 'selected' : ''}>Structuring (骨格)</option>
              <option value="arrangement" ${song.status === 'arrangement' ? 'selected' : ''}>Arrangement (フルアレンジ)</option>
              <option value="production" ${song.status === 'production' ? 'selected' : ''}>Production (録音・トラック)</option>
              <option value="mixing" ${song.status === 'mixing' ? 'selected' : ''}>Mixing (音調整)</option>
              <option value="completed" ${song.status === 'completed' ? 'selected' : ''}>Completed (完成・音源出力)</option>
            </select>
          </div>
        </div>
      `;
    }).join('');
  }

  updateSongTitle(id, newTitle) {
    this.updateSong(id, { title: newTitle });
  }

  updateSongStatus(id, newStatus) {
    this.updateSong(id, { status: newStatus });
    this.renderSongPipeline('song-pipeline-container');
    if (window.app) window.app.updateDashboardStats();
  }

  escapeHtml(str) {
    return (str || '')
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

window.songManager = new SongPipelineManager();
