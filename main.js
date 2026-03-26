const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 320,           // デフォルトの「中」サイズ
    height: 480,
    frame: false,         // ★枠（タイトルバー）を消してウィジェット化
    transparent: true,    // ★背景の透明化を許可
    alwaysOnTop: true,    // 常に最前面に表示
    resizable: false,     // ユーザーによる自由な引き伸ばしを禁止（UI側で制御）
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // スプレッドシート読み込みに必須
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 読み込み先の切り替え
  if (app.isPackaged) {
    // ビルド後は out/index.html を読み込む
    const indexPath = path.join(__dirname, 'out', 'index.html');
    win.loadFile(indexPath).catch(err => console.error("ファイルの読み込みに失敗:", err));
  } else {
    // 開発時は localhost:3000
    win.loadURL('http://localhost:3000');
  }

  // デバッグ用（もし不具合が出た時だけ復活させてください）
  // win.webContents.openDevTools();
}

// UI（index.js）からのサイズ変更命令を受信
ipcMain.on('resize-window', (event, { w, h }) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.setSize(w, h);
    win.center(); // サイズが変わったときに画面中央に移動（お好みで）
  }
});

// アプリの準備ができたら起動
app.whenReady().then(createWindow);

// ウィンドウがすべて閉じられたら終了
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
