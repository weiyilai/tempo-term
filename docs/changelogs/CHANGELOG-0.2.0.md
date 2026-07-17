## 正體中文

### feat

- 介面改成三欄佈局,左右欄的圖示切換器可以拖曳互換位置,連接埠從彈出面板升級成正式欄位面板 (#219)
- 新增 Parallel Worktrees:同一個 repo 可同時開多個 worktree,各自獨立目錄、各自跑 agent;可從終端機選單(⋯)或 git 線圖的分支右鍵建立 (#220, #221, #222, #223, #224, #225)
- 新增 worktree 管理器:狀態列徽章統計數量,點開可看每個 worktree 的分支、未提交改動、agent 狀態與磁碟用量 (#222, #223)
- 建立 worktree 時可順便複製 `.env` 等本機檔案、跑設定指令(每個 repo 各自記住),並直接叫起 Claude 或 Codex (#225)
- 可從管理器開啟既有 worktree:開新分頁或分割在目前窗格旁;已開啟的直接跳轉 (#223)
- 所有窗格統一標題列,關閉鈕不再浮在內容上;終端機與編輯器的標題列改用麵包屑,點路徑段可瀏覽子資料夾並直接切換(終端機 cd、編輯器換檔),SSH 窗格也適用 (#225, #226)

### fix

- 修正從 git 線圖切換 worktree 時,`cd` 指令被打進當下終端機的問題 (#225)
- 移除 worktree 前先關閉裡面的終端機,避免 Windows 上刪除失敗 (#225)

## English

### feat

- Three-column layout: the side columns' icon switchers can be dragged between left and right, and Ports becomes a real panel (#219)
- Parallel Worktrees: run several worktrees of one repo side by side, each with its own directory and agent; create one from the terminal's ⋯ menu or the git graph's branch context menu (#220, #221, #222, #223, #224, #225)
- Worktrees manager: a status-bar badge counts them and opens onto each one's branch, uncommitted work, agent activity, and disk usage (#222, #223)
- Creating a worktree can copy local files like `.env`, run a setup command (remembered per repo), and start Claude or Codex (#225)
- Open an existing worktree from the manager, in a new tab or split beside the current pane; an open one is jumped to instead (#223)
- Every pane shares one header strip and close buttons no longer float over content; terminal and editor headers show a breadcrumb for browsing subfolders and switching in place (cd for terminals, file swap for editors), SSH panes included (#225, #226)

### fix

- Fix switching worktree from the git graph typing `cd` into the focused terminal (#225)
- Close a worktree's terminals before removing it, so removal no longer fails on Windows (#225)
