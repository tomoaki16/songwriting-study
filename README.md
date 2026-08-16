# 6か月作曲学習計画

> 1日約1時間、基礎理解・楽曲分析・実践・応用・振り返りを繰り返し、6か月間でオリジナル曲5曲を完成させる。

---

## 0. このカリキュラムの目的

半年間、作曲を基礎から体系的に学習し、最終的に**オリジナル曲5曲を完成させる**。

単に5曲を作ることが目的ではなく、

**基礎理解（Learn） → 楽曲分析（Analyze） → 小さな実践（Practice） → 自作曲への応用（Apply） → 振り返り（Review）**

を繰り返し、自分で考えて作曲・編曲できる力を身につける。

### 学習条件

* **期間**: 6か月
* **学習時間**: 1日約1時間（週約7時間を上限の目安とする）
* **DAW**: Studio One
* **ギター**: 演奏可能
* **ベース**: 録音可能だが作曲・編曲面を優先
* **ドラム**: 主に打ち込み
* **最終成果**: オリジナル曲5曲完成
* **標準教材**: 現在使用中の作曲テキスト。学習内容とページの対応は [`curriculum/textbook-reference.md`](curriculum/textbook-reference.md) に一元管理する。

### 標準教材の使い方

テキストを最初から順番に消化するのではなく、6か月カリキュラムを主軸にして必要なページを参照する。
日別の学習Issueを作る際は、ChatGPTが `curriculum/textbook-reference.md` と対象月のカリキュラムを確認し、その日の `📖 使用テキスト` としてページを明記する。

---

## 6か月カリキュラム

| 月 | テーマ | 概要 | 詳細リンク |
| --- | --- | --- | --- |
| Month 1 | **基礎** | 音楽の仕組みと作曲の基礎（音名・音程・スケール・コード・機能・リズム・構成） | [Month 1 詳細](curriculum/month1.md) |
| Month 2 | **コード・メロディ** | コード進行の設計、ノンダイアトニックコード、メロディの基礎と統合（Song 01骨格制作） | [Month 2 詳細](curriculum/month2.md) |
| Month 3 | **リズム・アレンジ** | ドラム・ベース・ギターの役割分担、音数と緩急の調整（Song 01フルアレンジ） | [Month 3 詳細](curriculum/month3.md) |
| Month 4 | **楽曲制作** | 曲の事前設計、展開作り、リファレンス分析、1曲を完成させる力 | [Month 4 詳細](curriculum/month4.md) |
| Month 5 | **録音・ミックス** | 録音・音作り・ミックス基礎・リファレンス比較（聴ける音源への変換） | [Month 5 詳細](curriculum/month5.md) |
| Month 6 | **5曲完成** | 5曲の集中制作・完成、全曲ブラッシュアップ、半年間レビュー | [Month 6 詳細](curriculum/month6.md) |

* **標準教材ページ対応表**: [curriculum/textbook-reference.md](curriculum/textbook-reference.md)

---

## 5曲の制作ダッシュボード

| 曲 | 仮タイトル | ステータス | 現在地と次の一歩 |
| --- | --- | --- | --- |
| [Song 01](songs/song01.md) | 未定 | Idea | Month 2で骨格作成、Month 3〜4でフルアレンジ・完成へ |
| [Song 02](songs/song02.md) | 未定 | Backlog | Month 3から制作開始、Month 5で完成 |
| [Song 03](songs/song03.md) | 未定 | Backlog | Month 4から制作開始、Month 6前半で完成 |
| [Song 04](songs/song04.md) | 未定 | Backlog | Month 5から素材作り、Month 6で完成 |
| [Song 05](songs/song05.md) | 未定 | Backlog | Month 5から素材作り、Month 6で完成 |

---

## 重要な運用ルール

1. **計画を絶対視しない**: 理解度や進捗によって週次計画を変更してOK。月間目標は比較的固定し、週次課題で調整する。
2. **進捗管理・日々の更新**: 日々の進捗アップデートや振り返りは、GitHub連携したChatGPTを通じてやり取り・記録を行う。
3. **学習時間をGitHub管理に使いすぎない**: 1日約1時間のため、手動の記録作業に時間を使いすぎず学習実務を優先する。
4. **「理解した」の基準を厳しくする**: 「説明できる → 既存曲で見つけられる → 自分で使える」まで進めて習得とする。
5. **毎週必ず音を作る**: 理論だけで終わらせず、DAWやギターで短いフレーズや音を作る。
6. **既存曲分析を継続する**: 全期間を通して「プロはどうしているか → 自分の曲はどうか」を比較する。
7. **5曲完成を最優先する**: ノートだけ残って未完成を避ける。「これは自分の曲作りにどう使えるか？」を常に意識する。
8. **標準教材とIssueを対応させる**: 日別Issueには、対応する教材ページがある場合は必ず `📖 使用テキスト` を記載する。

---

## ChatGPT 連携・運用ガイド

GitHubと連携したChatGPTに本リポジトリを読み込ませ、Issue登録や進捗更新を行わせるためのシステム指示書を用意しています。

* **ChatGPT用指示書**: [`CHATGPT_INSTRUCTIONS.md`](CHATGPT_INSTRUCTIONS.md)
* **教材ページ対応表**: [`curriculum/textbook-reference.md`](curriculum/textbook-reference.md)
* **初回の指示方法**: ChatGPTに以下のようにチャットしてください。
  > 「リポジトリ `tomoaki16/songwriting-study` と [`CHATGPT_INSTRUCTIONS.md`](CHATGPT_INSTRUCTIONS.md) を読み込んで、今後の学習対話からGitHub Issueの自動登録・更新・アドバイスを行ってください。」

---

## 専用Webダッシュボード (Dedicated Page)

進捗、各月実施計画、日々の学習ログ（GitHub Issues連動）、5曲の制作パイプラインを一元管理・閲覧できる専用Webアプリケーションを提供しています。

* **公開URL (SSL)**: [https://app.clubneutrino.com/songwriting/](https://app.clubneutrino.com/songwriting/)
* **IP直接アクセス**: [http://210.131.221.233/](http://210.131.221.233/)
* **ローカル閲覧**: [`dashboard/index.html`](dashboard/index.html) をブラウザで開く
* **VPS配信手順**:
  ```bash
  # VPS上での配備スクリプト実行例
  cd /var/www/songwriting-study/dashboard
  chmod +x vps/deploy.sh
  ./vps/deploy.sh
  ```
* **Docker起動例**:
  ```bash
  docker build -t songwriting-dashboard ./dashboard/vps
  docker run -d -p 8080:80 songwriting-dashboard
  ```

---

## 最終ゴール

半年終了時点で大切なのは「なぜこのコードなのか」「なぜここでベースを動かすのか」「なぜここではギターを弾かないのか」「なぜこのサビが盛り上がるのか」を考えながら、自分で1曲を設計し、アレンジし、録音し、完成まで持っていけること。

その成果として**完成したオリジナル曲5曲**をGitHub上で管理・蓄積する。