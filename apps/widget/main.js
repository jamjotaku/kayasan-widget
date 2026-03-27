const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 320,
    height: 480,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    webPreferences: {
      // フォルダ移動に合わせて preload.js のパスに注意
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // 外部URLから通信するために必須
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // ★ ここに「公開したファンサイト」のURLを入力してください
  // 例: https://[ユーザー名].github.io/[リポジトリ名]/
  const REMOTE_URL = 'https://jamjotaku.github.io/kayasan-fansite/';

  if (app.isPackaged) {
    // ★ ビルド後（.exe）は、ローカルファイルではなくネット上の最新版を読み込む
    win.loadURL(REMOTE_URL).catch(err => {
      console.error("サイトの読み込みに失敗しました。オフラインかもしれません:", err);
      // 失敗した時のために、念のためローカルファイルもバックアップとして残すならここ
      // win.loadFile(path.join(__dirname, 'out', 'index.html'));
    });
  } else {
    // 開発時は今まで通り Codespaces のローカルサーバー (localhost:3000)
    win.loadURL('http://localhost:3000');
  }

  // win.webContents.openDevTools();
}

// UIからのサイズ変更命令を受信
ipcMain.on('resize-window', (event, { w, h }) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.setSize(w, h);
    win.center();
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
