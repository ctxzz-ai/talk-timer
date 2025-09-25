# Talk Timer

(English follows Japanese)

## 概要
Talk Timer は、学会座長がセッションをスムーズに進行するためのタイマーです。テーマは [CMFYZMSK4000404LAFJFFGDRC](https://tweakcn.com/themes/cmfyzmsk4000404lafjffgdrc) に着想を得たシンプルかつスタイリッシュなガラスモーフィズム調のデザインです。初期化時にチャイムを MP3 データとして生成するため、外部音声ファイルの配置は不要です。

## 主な特徴
- デフォルトのチャイム時刻: 10 分（発表 5 分前）、15 分（発表終了）、20 分（質疑終了）
- 任意の時刻を追加できるチャイムマーカー（分・秒単位で編集可能、追加マーカーは削除も可能）
- 各マーカー到達時に自動で 1・2・3 鈴を再生、手動で鳴らすボタンも搭載
- 音量調整・ミュート・言語（日本語/英語）設定を保存
- 大きな残り時間表示、区間ごとの進捗バー、次区間と鈴の回数を予告
- 開始/一時停止/再開/リセット/次マーカーへスキップ/手動鈴の操作ボタン
- キーボードショートカット：Space（開始/停止）、R（リセット）、→（次マーカー）
- ARIA・フォーカスリング・十分なコントラストによるアクセシビリティ配慮
- 完全な静的サイトとして GitHub Pages で動作（ビルド不要）

## 使い方
1. ブラウザで `index.html` を開きます（または GitHub Pages に公開した URL にアクセスします）。
2. 右上の音量スライダーとミュートボタン、言語切替ボタンで初期設定を行います。
3. 「開始」ボタンを押すとタイマーがスタートし、同時に Web Audio API が有効化されます。
4. 「一時停止」「再開」「リセット」「次へ」で進行を調整できます。手動鈴ボタンで任意のチャイムを即時再生できます。
5. チャイム設定欄で各マーカーの時刻（累積時間）を変更したり、新しいマーカーを追加すると、次回以降も同じ設定が保存されます。

### 自動再生制限について
初回に「開始」または手動鈴ボタンなど、ユーザー操作を行うことで AudioContext が有効になり、以降は自動でチャイムが鳴ります。音声が再生されない場合は、ブラウザの権限やサウンド設定をご確認ください。

## GitHub Pages への公開手順
1. このリポジトリを GitHub にプッシュします。
2. GitHub 上で `Settings` → `Pages` を開きます。
3. "Build and deployment" の "Source" を `Deploy from a branch` に設定します。
4. "Branch" で公開したいブランチ（例: `main`）と `/ (root)` を選択し保存します。
5. 数分後、表示された URL (`https://<ユーザー名>.github.io/<リポジトリ名>/`) で公開されます。

## ライセンス / クレジット
- デザインテーマ: [Tweak – CMFYZMSK4000404LAFJFFGDRC](https://tweakcn.com/themes/cmfyzmsk4000404lafjffgdrc)
- チャイム音: Web Audio API のオシレーターとエンベロープを用いて合成し、初期化時に MP3 データとして生成（外部音源ファイル未使用）

---

## Overview
Talk Timer is a flexible countdown tool tailored for conference chairs. The styling follows the elegant, glassmorphism-inspired tone of [CMFYZMSK4000404LAFJFFGDRC](https://tweakcn.com/themes/cmfyzmsk4000404lafjffgdrc). Chimes are synthesised with the Web Audio API and captured into MP3 data during initialisation, so no external audio assets are required.

## Features
- Default chime markers at 10, 15, and 20 minutes (5 minutes before the talk, end of presentation, end of Q&A)
- Add as many additional chime markers as needed—each marker is editable in minutes/seconds and extra markers can be removed
- Automatic 1/2/3 bell chimes when each marker is reached, plus manual chime buttons
- Persisted language (JA/EN), volume, mute, and section times via `localStorage`
- Prominent time display, per-section progress bars, and next section preview with bell count
- Start / Pause / Resume / Reset / Skip to next marker / Manual chime controls
- Keyboard shortcuts: Space (start/pause), R (reset), → (skip to next marker)
- Accessibility-conscious with ARIA roles, focus outlines, and strong contrast
- Runs as a pure static site and is ready for GitHub Pages—no build tools needed

## How to use
1. Open `index.html` in your browser (or visit the deployed GitHub Pages site).
2. Adjust the volume slider, mute toggle, and language button in the header.
3. Press **Start** to begin the countdown—this user gesture also unlocks the Web Audio API.
4. Use **Pause**, **Resume**, **Reset**, **Skip**, and the manual chime buttons to control the flow.
5. Adjust the cumulative time for each chime marker (and add more markers if necessary); your preferences persist for future visits.

### About autoplay restrictions
The first user interaction (e.g., Start or a manual chime) activates the `AudioContext`. If you do not hear audio afterwards, please review your browser permissions or sound output settings.

## Deploying to GitHub Pages
1. Push this project to a GitHub repository.
2. On GitHub, navigate to `Settings` → `Pages`.
3. Under **Build and deployment**, choose `Deploy from a branch`.
4. Select the branch you wish to publish (e.g., `main`) and the `/ (root)` folder, then save.
5. After a short build, your site will be available at `https://<username>.github.io/<repository>/`.

## Credits & Licensing
- Theme inspiration: [Tweak – CMFYZMSK4000404LAFJFFGDRC](https://tweakcn.com/themes/cmfyzmsk4000404lafjffgdrc)
- Chime sounds: synthesised in-browser with oscillators/envelopes and stored as MP3 data at initialisation (no external audio files)

