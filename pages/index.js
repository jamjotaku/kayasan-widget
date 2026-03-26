import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQcUDA9Y3c70dZcVHxAS-o51kCMktANMV31Y7pYFfvnhZfDejfntqIZEKmWA7fKPefrEKChGH9MLOj2/pub?gid=925424429&single=true&output=csv";

const SIZES = { 
  '小': { w: 240, h: 360 }, 
  '中': { w: 320, h: 480 }, 
  '大': { w: 400, h: 600 }, 
  'ワイド': { w: 480, h: 270 } 
};

export default function KayaWidget() {
  const [allData, setAllData] = useState([]);
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('display'); 
  const [config, setConfig] = useState({ interval: 60, size: '中' });
  const [pomoConfig, setPomoConfig] = useState({ focusTime: 25, breakTime: 5 });
  const [pomoStatus, setPomoStatus] = useState('idle'); // idle, focus, break
  const [timeLeft, setTimeLeft] = useState(0);
  const [now, setNow] = useState(new Date());

  // --- 1. データ読み込み ---
  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    const loadData = async () => {
      try {
        const response = await fetch(CSV_URL);
        const csvText = await response.text();
        const Papa = (await import('papaparse')).default;
        Papa.parse(csvText, {
          header: true, skipEmptyLines: true,
          complete: (res) => {
            const formatted = res.data.map(d => ({
              character: (d['キャラクター'] || d['名前'] || d['member'] || "Unknown").trim(),
              image: (d['image'] || d['画像'] || d['link'] || "").trim().replace('name=medium', 'name=large'),
            })).filter(d => d.image && d.image.startsWith('http'));
            setAllData(formatted);
          }
        });
      } catch (e) { console.error("CSV Load Error:", e); }
    };
    loadData();
    return () => clearInterval(clock);
  }, []);

  // --- 2. スライドショーロジック ---
  const pickPhoto = useCallback(() => {
    if (allData.length === 0) return;
    const photo = allData[Math.floor(Math.random() * allData.length)];
    setCurrentPhoto(photo);
  }, [allData]);

  useEffect(() => {
    pickPhoto();
    // 休憩中は10秒、通常時は設定された間隔で切り替え
    const timer = setInterval(pickPhoto, (pomoStatus === 'break' ? 10 : config.interval) * 1000);
    return () => clearInterval(timer);
  }, [pickPhoto, config.interval, pomoStatus]);

  // --- 3. ポモドーロタイマーロジック ---
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
    if (pomoStatus === 'idle') {
      setPomoStatus('focus');
      setTimeLeft(pomoConfig.focusTime * 60);
    } else {
      if (confirm("セッションを終了しますか？")) {
        setPomoStatus('idle');
        setTimeLeft(0);
      }
    }
  };

  // --- 4. ウィンドウサイズ変更 ---
  useEffect(() => {
    if (window.electronAPI) {
      const { w, h } = SIZES[config.size];
      window.electronAPI.resizeWindow(w, h);
    }
  }, [config.size]);

  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  return (
    <div className={`widget-root status-${pomoStatus}`}>
      <Head>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,900&family=Montserrat:wght@800&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet" />
      </Head>

      <div className="main-wrapper">
        {/* 背景画像 */}
        <div className="bg-layer">
          {currentPhoto && <img src={currentPhoto.image} className="main-photo" alt="" />}
        </div>
        
        {/* ドラッグ用ハンドル */}
        <div className="drag-handle"></div>

        {/* UIレイヤー */}
        <div className="ui-container">
          <div className="top-bar">
            <span className="badge">KAYA_SYSTEM</span>
            <div className="top-right">
              <span className="clock">{timeStr}</span>
              <button className="icon-btn" onClick={() => setIsSettingsOpen(true)}>
                <i className="fas fa-sliders-h"></i>
              </button>
            </div>
          </div>

          <div className="center-content">
            <h1 className="main-title">Kaya</h1>
            <div className="character-tag">{currentPhoto?.character || '---'}</div>
          </div>

          <div className="bottom-bar">
            <div className="status-info">
              <span className="label">MODE</span>
              <div className="val">{pomoStatus.toUpperCase()}</div>
            </div>
            <button className={`pomo-control ${pomoStatus !== 'idle' ? 'active' : ''}`} onClick={togglePomo}>
              <div className="status-dot"></div>
              <span>{pomoStatus === 'idle' ? 'START' : `${Math.floor(timeLeft/60)}:${String(timeLeft%60).padStart(2,'0')}`}</span>
            </button>
          </div>
        </div>

        {/* 設定モーダル */}
        <div className={`settings-modal ${isSettingsOpen ? 'open' : ''}`}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>SETTINGS</h2>
              <button className="close-x" onClick={() => setIsSettingsOpen(false)}>&times;</button>
            </div>

            <div className="tab-nav">
              <button className={activeTab === 'display' ? 'active' : ''} onClick={() => setActiveTab('display')}>DISPLAY</button>
              <button className={activeTab === 'timer' ? 'active' : ''} onClick={() => setActiveTab('timer')}>TIMER</button>
            </div>

            <div className="modal-body">
              {activeTab === 'display' && (
                <div className="setting-group">
                  <label>間隔: {config.interval}秒</label>
                  <input type="range" min="10" max="300" step="10" value={config.interval} onChange={e => setConfig({...config, interval: parseInt(e.target.value)})} />
                  
                  <label>サイズ</label>
                  <div className="btn-grid">
                    {Object.keys(SIZES).map(s => (
                      <button key={s} className={config.size === s ? 'active' : ''} onClick={() => setConfig({...config, size: s})}>{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'timer' && (
                <div className="setting-group">
                  <label>集中時間: {pomoConfig.focusTime}分</label>
                  <input type="range" min="1" max="60" step="1" value={pomoConfig.focusTime} onChange={e => setPomoConfig({...pomoConfig, focusTime: parseInt(e.target.value)})} />
                  
                  <label>休憩時間: {pomoConfig.breakTime}分</label>
                  <input type="range" min="1" max="30" step="1" value={pomoConfig.breakTime} onChange={e => setPomoConfig({...pomoConfig, breakTime: parseInt(e.target.value)})} />
                </div>
              )}
            </div>

            <button className="apply-btn" onClick={() => setIsSettingsOpen(false)}>APPLY CHANGES</button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        body { margin: 0; background: transparent; overflow: hidden; font-family: 'Montserrat', sans-serif; color: white; }
        .main-wrapper { width: 100vw; height: 100vh; position: relative; background: rgba(0, 0, 0, 0.85); /* 真っ黒より少し透かすとかっこいい */border-radius: 20px; /* 角丸を強くする */overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); }
        .main-photo { width: 100%; height: 100%; object-fit: cover; opacity: 0.7; transition: 0.8s ease-in-out; }
        .drag-handle { position: absolute; inset: 0; z-index: 5; -webkit-app-region: drag; }
        .ui-container { position: absolute; inset: 0; z-index: 10; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; pointer-events: none; }
        
        .top-bar, .bottom-bar { display: flex; justify-content: space-between; align-items: center; }
        .top-right { display: flex; align-items: center; gap: 12px; pointer-events: auto; }
        .badge { font-family: 'JetBrains Mono'; font-size: 8px; opacity: 0.4; letter-spacing: 2px; }
        .clock { font-family: 'JetBrains Mono'; font-size: 14px; font-weight: 800; }
        
        .icon-btn { background: none; border: none; color: #666; cursor: pointer; font-size: 16px; transition: 0.3s; -webkit-app-region: no-drag; }
        .icon-btn:hover { color: #fff; }

        .center-content { text-align: center; }
        .main-title { font-family: 'Playfair Display', serif; font-style: italic; font-size: 48px; margin: 0; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .character-tag { font-family: 'JetBrains Mono'; font-size: 10px; color: #00f2ff; margin-top: 4px; letter-spacing: 1px; }

        .pomo-control { background: rgba(0,0,0,0.8); border: 1px solid #333; color: #fff; padding: 10px 20px; border-radius: 40px; display: flex; align-items: center; gap: 10px; cursor: pointer; pointer-events: auto; -webkit-app-region: no-drag; transition: 0.3s; }
        .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #444; }
        .active .status-dot { background: #00f2ff; box-shadow: 0 0 10px #00f2ff; animation: pulse 2s infinite; }
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

        /* Settings Modal */
        .settings-modal { position: absolute; inset: 0; background: rgba(10,10,12,0.95); backdrop-filter: blur(10px); z-index: 100; transform: translateY(100%); transition: 0.4s cubic-bezier(0.19, 1, 0.22, 1); pointer-events: auto; }
        .settings-modal.open { transform: translateY(0); }
        .modal-content { padding: 30px; height: 100%; display: flex; flex-direction: column; box-sizing: border-box; }
        .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .modal-header h2 { font-family: 'JetBrains Mono'; font-size: 14px; margin: 0; color: #555; }
        .close-x { background: none; border: none; color: #fff; font-size: 24px; cursor: pointer; }

        .tab-nav { display: flex; gap: 20px; margin-bottom: 25px; border-bottom: 1px solid #222; }
        .tab-nav button { background: none; border: none; color: #444; font-weight: 800; padding-bottom: 10px; cursor: pointer; font-size: 11px; }
        .tab-nav button.active { color: #00f2ff; border-bottom: 2px solid #00f2ff; }

        .setting-group label { display: block; font-size: 10px; color: #666; margin: 20px 0 8px 0; font-family: 'JetBrains Mono'; }
        input[type="range"] { width: 100%; accent-color: #00f2ff; cursor: pointer; }
        .btn-grid { display: flex; gap: 6px; margin-top: 10px; }
        .btn-grid button { flex: 1; padding: 10px; background: #111; border: 1px solid #222; color: #444; border-radius: 6px; cursor: pointer; font-size: 10px; font-weight: 800; transition: 0.3s; }
        .btn-grid button.active { border-color: #00f2ff; color: #00f2ff; background: rgba(0,242,255,0.05); }

        .apply-btn { background: #fff; color: #000; border: none; padding: 14px; border-radius: 8px; font-weight: 800; margin-top: auto; cursor: pointer; font-size: 11px; letter-spacing: 1px; }
      `}</style>
    </div>
  );
}
