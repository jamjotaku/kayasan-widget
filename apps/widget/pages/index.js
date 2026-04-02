import React, { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';

const DEFAULT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcUDA9Y3c70dZcVHxAS-o51kCMktANMV31Y7pYFfvnhZfDejfntqIZEKmWA7fKPefrEKChGH9MLOj2/pub?gid=925424429&single=true&output=csv";

const SIZES = { 
  '小': { w: 240, h: 360 }, 
  '中': { w: 320, h: 480 }, 
  '大': { w: 400, h: 600 }, 
  'ワイド': { w: 480, h: 270 } 
};

export default function KayaWidget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [nextPhoto, setNextPhoto] = useState(null); // クロスフェード用
  const [isFading, setIsFading] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('display'); 
  const [config, setConfig] = useState({ interval: 60, size: '中' });
  
  // URL管理
  const [csvUrl, setCsvUrl] = useState(DEFAULT_CSV_URL);
  const [inputUrl, setInputUrl] = useState("");

  const [pomoConfig, setPomoConfig] = useState({ focusTime: 25, breakTime: 5 });
  const [pomoStatus, setPomoStatus] = useState('idle'); 
  const [timeLeft, setTimeLeft] = useState(0);
  const [now, setNow] = useState(new Date());

  // 1. 初期ロード（URLの復元）
  useEffect(() => {
    const savedUrl = localStorage.getItem('custom_csv_url');
    if (savedUrl) {
      setCsvUrl(savedUrl);
      setInputUrl(savedUrl);
    } else {
      setInputUrl(DEFAULT_CSV_URL);
    }
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // 2. データ読み込み (csvUrlが変わるたびに実行)
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();
        const Papa = (await import('papaparse')).default;
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
            const formatted = res.data.map(d => ({
              character: (d['キャラクター'] || d['名前'] || d['member'] || "Unknown").trim(),
              displayName: (d['表示名'] || d['名前'] || "").trim(), // ★名前/表示名を取得
              image: (d['image'] || d['画像'] || d['link'] || "").trim().replace('name=medium', 'name=large'),
            })).filter(d => d.image && d.image.startsWith('http'));
            setAllData(formatted);
          }
        });
      } catch (e) { console.error("CSV読み込みエラー:", e); }
    };
    loadData();
  }, [csvUrl]);

  // 3. 写真のピックアップ（クロスフェード対応）
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    const nextIdx = Math.floor(Math.random() * allData.length);
    const selected = allData[nextIdx];

    if (!currentPhoto) {
      setCurrentPhoto(selected);
    } else {
      setNextPhoto(selected);
      setIsFading(true);
      setTimeout(() => {
        setCurrentPhoto(selected);
        setNextPhoto(null);
        setIsFading(false);
      }, 1500); // 1.5秒かけてフェード
    }
  }, [allData, currentPhoto]);

  useEffect(() => {
    if (allData.length > 0 && !currentPhoto) pickPhoto();
    const timer = setInterval(pickPhoto, (pomoStatus === 'break' ? 10 : config.interval) * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval, pomoStatus, allData.length, currentPhoto]);

  // --- URL更新機能 ---
  const handleUpdateUrl = () => {
    if (!inputUrl.startsWith('http')) return alert("有効なURLを入力してください");
    localStorage.setItem('custom_csv_url', inputUrl);
    setCsvUrl(inputUrl);
    setIsSettingsOpen(false);
    alert("データソースを更新しました");
  };

  // --- 既存ロジック ---
  useEffect(() => {
    if (pomoStatus === 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          const nextS = pomoStatus === 'focus' ? 'break' : 'focus';
          setPomoStatus(nextS);
          return (nextS === 'focus' ? pomoConfig.focusTime : pomoConfig.breakTime) * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [pomoStatus, pomoConfig]);

  const togglePomo = () => {
    if (pomoStatus === 'idle') { setPomoStatus('focus'); setTimeLeft(pomoConfig.focusTime * 60); }
    else { if (confirm("セッションを終了しますか？")) { setPomoStatus('idle'); setTimeLeft(0); } }
  };

  useEffect(() => {
    if (window.electronAPI) {
      const { w, h } = SIZES[config.size];
      window.electronAPI.resizeWindow(w, h);
    }
  }, [config.size]);

  const handleExit = () => { if (confirm("アプリを終了しますか？")) window.close(); };
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  return (
    <div className={`widget-root status-${pomoStatus}`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@800&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        <div className="bg-layer">
          {currentPhoto && (
            <img src={currentPhoto.image} className={`main-photo ${isFading ? 'fade-out' : ''}`} alt="" />
          )}
          {nextPhoto && (
            <img src={nextPhoto.image} className="main-photo next-photo" alt="" />
          )}
        </div>
        
        {!isSettingsOpen && <div className="drag-handle"></div>}

        <div className="ui-container">
          <div className="top-bar">
            <span className="badge">KAYA_SYSTEM</span>
            <div className="top-right no-drag">
              <span className="clock">{timeStr}</span>
              <button className="icon-btn" onClick={() => setIsSettingsOpen(true)}><i className="fas fa-sliders-h"></i></button>
            </div>
          </div>
          <div className="center-content">
            <h1 className="main-title">Kaya</h1>
            <div className="character-tag">{currentPhoto?.character || '---'}</div>
            {/* ★名前の表示を追加 */}
            <div className="display-name">{currentPhoto?.displayName}</div>
          </div>
          <div className="bottom-bar">
            <div className="status-info"><span className="label">MODE</span><div className="val">{pomoStatus.toUpperCase()}</div></div>
            <button className={`pomo-control no-drag ${pomoStatus !== 'idle' ? 'active' : ''}`} onClick={togglePomo}>
              <div className="status-dot"></div>
              <span>{pomoStatus === 'idle' ? 'START' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</span>
            </button>
          </div>
        </div>

        <div className={`settings-modal no-drag ${isSettingsOpen ? 'open' : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>SETTINGS</h2>
              <button className="close-x" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>
            <div className="tab-nav">
              <button className={activeTab === 'display' ? 'active' : ''} onClick={() => setActiveTab('display')}>DISPLAY</button>
              <button className={activeTab === 'timer' ? 'active' : ''} onClick={() => setActiveTab('timer')}>TIMER</button>
              <button className={activeTab === 'system' ? 'active' : ''} onClick={() => setActiveTab('system')}>SYSTEM</button>
            </div>
            <div className="modal-body">
              {activeTab === 'display' && (
                <div className="setting-group">
                  <label>画像切り替え: {config.interval}秒</label>
                  <input type="range" min="10" max="300" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
                  <label>サイズ</label>
                  <div className="btn-grid">{Object.keys(SIZES).map(s => <button key={s} className={config.size === s ? 'active' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>)}</div>
                </div>
              )}
              {activeTab === 'timer' && (
                <div className="setting-group">
                  <label>集中: {pomoConfig.focusTime}分</label>
                  <input type="range" min="1" max="60" step="1" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  <label>休憩: {pomoConfig.breakTime}分</label>
                  <input type="range" min="1" max="30" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                </div>
              )}
              {activeTab === 'system' && (
                <div className="setting-group">
                  <label>CSV DATA SOURCE URL</label>
                  <input 
                    type="text" 
                    className="url-input" 
                    value={inputUrl} 
                    onChange={e => setInputUrl(e.target.value)}
                    placeholder="https://docs.google.com/..."
                  />
                  <button className="update-btn" onClick={handleUpdateUrl}>APPLY & REFRESH</button>
                  <label>APPLICATION</label>
                  <button className="exit-btn" onClick={handleExit}>QUIT_APP</button>
                </div>
              )}
            </div>
            <button className="apply-btn" onClick={() => setIsSettingsOpen(false)}>CLOSE</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: #000; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
        
        /* クロスフェード用のCSS */
        .bg-layer { position: absolute; inset: 0; z-index: 0; }
        .main-photo { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: opacity 1.5s ease-in-out; }
        .fade-out { opacity: 0; }
        .next-photo { z-index: 1; animation: fadeIn 1.5s ease-in-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 0.7; } }

        .drag-handle { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }
        .no-drag { -webkit-app-region: no-drag !important; pointer-events: auto !important; }
        .ui-container { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
        .clock { font-family: 'JetBrains Mono'; font-size: 14px; font-weight: 800; }
        .icon-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 18px; transition: 0.3s; }
        .icon-btn:hover { color: #fff; }
        .main-title { font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; margin: 0; }
        .character-tag { font-family: 'JetBrains Mono'; font-size: 10px; color: #00f2ff; margin-top: 4px; }
        .display-name { font-size: 14px; font-weight: 800; margin-top: 5px; opacity: 0.8; letter-spacing: 1px; }

        .pomo-control { background: rgba(0,0,0,0.8); border: 1px solid #333; color: #fff; padding: 10px 20px; border-radius: 40px; display: flex; align-items: center; gap: 10px; cursor: pointer; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #444; }
        .active .status-dot { background: #00f2ff; box-shadow: 0 0 10px #00f2ff; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

        .settings-modal { position: absolute; inset: 0; background: rgba(10,10,12,0.98); z-index: 100; transform: translateY(100%); transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); }
        .settings-modal.open { transform: translateY(0); }
        .modal-content { padding: 30px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
        .tab-nav { display: flex; gap: 15px; border-bottom: 1px solid #222; margin-bottom: 20px; }
        .tab-nav button { background: none; border: none; color: #444; font-weight: 800; padding-bottom: 10px; cursor: pointer; font-size: 10px; }
        .tab-nav button.active { color: #00f2ff; border-bottom: 2px solid #00f2ff; }
        
        .setting-group label { display: block; font-size: 10px; color: #666; margin: 20px 0 8px 0; }
        .url-input { width: 100%; background: #111; border: 1px solid #333; color: #fff; padding: 10px; border-radius: 6px; font-family: 'JetBrains Mono'; font-size: 10px; margin-bottom: 10px; }
        .update-btn { width: 100%; background: #00f2ff; color: #000; border: none; padding: 10px; border-radius: 6px; font-weight: 800; font-size: 10px; cursor: pointer; }
        .exit-btn { background: #300; color: #f55; border: 1px solid #511; padding: 12px; width: 100%; border-radius: 8px; cursor: pointer; font-family: 'JetBrains Mono'; font-weight: 800; margin-top: 10px; }
        .apply-btn { background: #fff; color: #000; border: none; padding: 14px; border-radius: 8px; font-weight: 800; margin-top: auto; cursor: pointer; }
        .close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }
      `}</style>
    </div>
  );
}
