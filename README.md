# Talk Timer

(English follows Japanese)

## 概要
Talk Timer は、学会座長がセッションをスムーズに進行するためのカウントアップ式タイマーです。テーマは [CMFYZMSK4000404LAFJFFGDRC](https://tweakcn.com/themes/cmfyzmsk4000404lafjffgdrc) に着想を得たシンプルかつスタイリッシュなガラスモーフィズム調のデザインです。チャイム音は Web Audio API でリアルタイムに合成しており、外部音声ファイルは使用していません。

## 主な特徴
- 0 秒からカウントアップし、デフォルトでは合計 25 分（15 分・5 分・5 分）のチャイムマーカーを表示
- 単一の進行バー上にマーカーをプロットし、現在位置と次の鈴のタイミングを視覚的に把握可能
- 各マーカー到達時に自動で 1・2・3 鈴を再生、手動で鳴らすボタンと音量・ミュート設定も搭載
- 設定時間を超えた後も経過時間を継続表示し、「超過 +00:30」のように超過分をハイライト
- チャイムマーカーは累積の分・秒単位で編集・追加・削除でき、設定は `localStorage` に保存
- 音量調整・ミュート・言語（日本語/英語）の設定を保存
- 大きな経過時間表示、単一バーでの進捗可視化、次マーカーと鈴回数の予告表示
- 開始/一時停止/再開/リセット/次マーカーへスキップ/手動鈴の操作ボタン
- キーボードショートカット：Space（開始/停止）、R（リセット）、→（次マーカー）
- ARIA・フォーカスリング・十分なコントラストによるアクセシビリティ配慮
- Web Audio API による金属的な鈴音の合成（外部音源なし）
- 完全な静的サイトとして GitHub Pages で動作（ビルド不要）

## 使い方
1. ブラウザで `index.html` を開きます（または GitHub Pages に公開した URL にアクセスします）。
2. 右上の音量スライダーとミュートボタン、言語切替ボタンで初期設定を行います。
3. 「開始」ボタンを押すとタイマーがスタートし、同時に Web Audio API が有効化されます。
4. 「一時停止」「再開」「リセット」「次へ」で進行を調整できます。手動鈴ボタンで任意のチャイムを即時再生できます。
5. チャイム設定欄で各マーカーの時刻（累積時間）を変更したり、新しいマーカーを追加すると、次回以降も同じ設定が保存されます。既定の 25 分を超えてもカウントアップは継続し、「超過 +00:30」のように超過時間を表示します。

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
- 鈴音: Web Audio API によるリアルタイム合成（外部音源なし）

---

## Overview
Talk Timer is a count-up session timer tailored for conference chairs. The styling follows the elegant, glassmorphism-inspired tone of [CMFYZMSK4000404LAFJFFGDRC](https://tweakcn.com/themes/cmfyzmsk4000404lafjffgdrc). The bell tones are synthesised live with the Web Audio API—no external audio files are bundled.

## Features
- Counts up from 0 with a default 25-minute schedule (15 + 5 + 5 minutes) covering presentation, warning, and Q&A markers
- Visualises milestones along a single progress bar with clear previews of the next bell
- Automatic 1/2/3 bell sequences at each marker plus manual chime buttons with volume and mute controls
- Continues beyond the plan and highlights overtime such as “Overtime +00:30”
- Edit, add, or remove cumulative minute/second markers; all settings persist via `localStorage`
- Persists language (JA/EN), volume, and mute selections
- Prominent elapsed time display, marker labels, and next bell forecast
- Start / Pause / Resume / Reset / Skip / Manual chime controls
- Keyboard shortcuts: Space (start/pause), R (reset), → (skip to next marker)
- Accessibility-conscious with ARIA roles, focus outlines, and strong contrast
- Bell tones are synthesised with the Web Audio API—no external audio files required
- Ships as a pure static site and is ready for GitHub Pages—no build tools needed

## How to use
1. Open `index.html` in your browser (or visit the deployed GitHub Pages site).
2. Adjust the volume slider, mute toggle, and language button in the header.
3. Press **Start** to begin timing—this user gesture also unlocks the Web Audio API.
4. Use **Pause**, **Resume**, **Reset**, **Skip**, and the manual chime buttons to control the flow.
5. Adjust the cumulative time for each chime marker (and add more markers if necessary); your preferences persist for future visits. The timer keeps counting beyond the default 25-minute plan and clearly shows overtime such as “Overtime +00:30”.

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
- Bell tones: generated in real time with the Web Audio API (no external audio files)

