## 正體中文

### feat
- SSH 連線：可以直接在 TempoTerm 開 SSH 連線，連線資料與金鑰 passphrase 可選擇記住（存在系統 keychain）
- SSH 本機埠轉發：連線時支援 `-L` 本機埠轉發
- SFTP 遠端檔案：SSH 連線開著時，可在檔案總管瀏覽、上傳、下載並直接編輯遠端檔案
- AI 助手更懂上下文：助手會看到你目前開啟的檔案，編輯器也支援行內（ghost text）補全，按 Tab 接受
- 執行中主動提示更新：app 開著時若有新版本會主動提示，不必重開才發現
- 雲端 API 金鑰改存本機加密檔：OpenAI 等 provider 金鑰與 GitHub token 改用綁機器的加密檔保存，跨重啟與開發／正式版切換都不再遺失（SSH 密碼仍走系統 keychain）
- 關閉未存檔分頁會先確認：關有未存變更的分頁會跳確認，分頁上以圓點標示未存，hover 才顯示關閉的 X

### fix
- 關檔不存檔會真的還原：選不存檔關閉後再開同一個檔，會回到磁碟上最後存檔的內容，不再保留被丟棄的編輯
- 聊天面板排版：助手回覆裡的長程式碼與路徑會自動換行不再被切掉；輸入框改為單行起跳、隨內容長高並與按鈕對齊，字級調為 13px
- 終端機初始欄數：把首次尺寸計算延後一個影格，避免量到 0 寬時用預設 80 欄開出 PTY
- 編輯器補全：偵測到 ghost text 建議時，Tab 會接受補全而不是插入縮排
- OpenAI 與 Google 的模型清單還原為現役世代
- SFTP 在 session 結束後才完成開啟的連線會被正確關閉，不留殘連線

## English

### feat
- SSH connections: open SSH sessions directly in TempoTerm; connection details and key passphrases can be remembered (stored in the OS keychain)
- SSH local port forwarding (`-L`)
- SFTP remote files: while an SSH session is active, browse, upload, download, and edit remote files from the file explorer
- Context-aware assistant: the assistant sees the file you currently have open, and the editor offers inline ghost-text completions you accept with Tab
- Proactive update prompt: a new version is surfaced while the app is running, so you don't have to relaunch to find it
- Cloud API keys in a local encrypted file: provider keys (OpenAI and others) and the GitHub token move to a machine-bound encrypted file so they survive restarts and dev/release switches; SSH secrets stay in the OS keychain
- Confirm before closing an unsaved tab: closing a tab with unsaved changes asks first, and a dot marks the unsaved tab while the close X appears on hover

### fix
- Closing without saving truly reverts: after closing a file without saving, reopening it shows the last saved content on disk instead of the discarded edits
- Chat panel layout: long code and file paths in replies wrap instead of clipping; the input starts a single row, grows with its content, aligns with its buttons, and uses 13px text
- Terminal initial columns: defer the first size measurement by a frame so the PTY no longer opens at the default 80 columns when width measures 0 at mount
- Editor completion: Tab accepts an inline ghost-text suggestion instead of inserting an indent when one is visible
- Restore current-gen OpenAI and Google model presets
- SFTP sessions that finish opening after teardown are now closed, leaving no orphan connection
