// content.js - スムーズな加速機能追加版
(function() {
  // デフォルト設定
  const defaultSettings = {
    forwardSpeed: 50,
    backwardSpeed: 40,
    speedFactor: 1.0,
    reverseDirection: false
  };
  
  // 現在の設定
  let userSettings = {...defaultSettings};
  
  // Chrome Storageから設定を読み込む
  function loadSettings() {
    if (chrome && chrome.storage) {
      chrome.storage.local.get(defaultSettings, function(result) {
        userSettings = result;
        console.log('設定を読み込みました:', userSettings);
      });
    } else {
      // フォールバック: localStorageを使用
      try {
        const savedSettings = localStorage.getItem('middleClickScrollSettings');
        if (savedSettings) {
          userSettings = JSON.parse(savedSettings);
        }
      } catch (e) {
        console.error('設定の読み込みに失敗:', e);
      }
    }
  }
  
  // 設定メッセージのリスナー
  if (chrome && chrome.runtime) {
    chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
      if (message.action === 'updateSettings') {
        userSettings = message.settings;
        console.log('設定が更新されました:', userSettings);
        // localStorageにもバックアップ
        try {
          localStorage.setItem('middleClickScrollSettings', JSON.stringify(userSettings));
        } catch (e) {}
      }
      return true;
    });
  }
  
  let isMiddleButtonDown = false;
  let scrollActive = false;
  let startX, startY;
  let currentX, currentY;
  let scrollingElement;
  let scrollSpeed = { x: 0, y: 0 };
  let scrollInterval = null;
  let scrollIcon = null;
  let accelerationTimer = null;
  let currentSpeedFactor = 0; // 現在の速度係数（徐々に上昇）
  
  // スクロールアイコンを作成
  function createScrollIcon(x, y) {
    const icon = document.createElement('div');
    icon.style.position = 'fixed';
    icon.style.left = (x - 10) + 'px';
    icon.style.top = (y - 10) + 'px';
    icon.style.width = '20px';
    icon.style.height = '20px';
    icon.style.borderRadius = '50%';
    icon.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    icon.style.border = '2px solid rgba(255, 255, 255, 0.7)';
    icon.style.zIndex = '9997';
    icon.style.pointerEvents = 'none';
    document.body.appendChild(icon);
    return icon;
  }
  
  // スクロール関数 - スムーズな加速
  function performScroll() {
    if (!scrollActive) return;
    
    scrollingElement.scrollLeft += scrollSpeed.x;
    scrollingElement.scrollTop += scrollSpeed.y;
    
    // マウス位置の更新があれば速度を再計算
    if (currentX !== undefined && currentY !== undefined) {
      updateScrollSpeed();
    }
  }
  
  // スクロール速度を更新（マウス位置と設定に基づく）
  function updateScrollSpeed() {
    const dx = currentX - startX;
    const dy = currentY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 方向を反転するか確認
    const directionMultiplier = userSettings.reverseDirection ? 1 : -1;
    
    // 正規化した方向ベクトル
    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;
    
    // マウス移動方向を検出（上下方向優先で判定）
    const isMovingDown = dy > 0;
    
    // 前進/後退に応じた速度設定
    const maxSpeed = isMovingDown ? 
      userSettings.forwardSpeed : 
      userSettings.backwardSpeed;
    
    // スムーズな加速のための計算
    // 距離に応じた速度変化（最小速度から始まり、距離に応じて加速）
    const minSpeedPercent = 0.2; // 最小速度は設定値の20%
    const maxSpeedPercent = 1.0; // 最大速度は設定値の100%
    
    // 距離に応じたスムーズな加速カーブ
    // 短い距離では低速、長い距離では高速
    const startDistance = 10; // 加速開始距離
    const fullSpeedDistance = 100; // 最大速度に達する距離
    
    // 距離に基づく速度係数の計算（0.2から1.0の範囲）
    let distanceSpeedFactor = minSpeedPercent + 
      (maxSpeedPercent - minSpeedPercent) * 
      Math.min(Math.max(distance - startDistance, 0) / (fullSpeedDistance - startDistance), 1);
    
    // ユーザーの感度設定を適用
    const userFactor = userSettings.speedFactor;
    
    // 最終的な速度の計算
    const speedMagnitude = maxSpeed * distanceSpeedFactor * userFactor;
    
    // スクロール速度を設定
    scrollSpeed.x = directionMultiplier * normalizedDx * speedMagnitude;
    scrollSpeed.y = directionMultiplier * normalizedDy * speedMagnitude;
  }
  
  // 中ボタン押下
  document.addEventListener('mousedown', function(e) {
    if (e.button === 1) { // 中ボタン
      e.preventDefault();
      
      // すでにスクロール中なら終了
      if (scrollActive) {
        endScrolling();
        return;
      }
      
      isMiddleButtonDown = true;
      startX = currentX = e.clientX;
      startY = currentY = e.clientY;
      
      // スクロール要素を取得
      scrollingElement = document.scrollingElement || document.documentElement;
      
      // スクロールアイコンを表示
      scrollIcon = createScrollIcon(startX, startY);
    }
  });
  
  // マウス移動
  document.addEventListener('mousemove', function(e) {
    if (isMiddleButtonDown) {
      currentX = e.clientX;
      currentY = e.clientY;
      
      const dx = currentX - startX;
      const dy = currentY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // 少し動いたらスクロール開始（閾値）
      if (!scrollActive && distance > 5) {
        scrollActive = true;
        
        // 初期化時は非常に低速から開始
        currentSpeedFactor = 0.1;
        
        // 速度を初期化
        updateScrollSpeed();
        
        // スクロール開始
        scrollInterval = setInterval(performScroll, 16); // 約60FPS
      }
    }
  });
  
  // スクロール終了処理
  function endScrolling() {
    isMiddleButtonDown = false;
    scrollActive = false;
    currentX = undefined;
    currentY = undefined;
    currentSpeedFactor = 0;
    
    // インターバルを停止
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
    
    // 加速タイマーを停止
    if (accelerationTimer) {
      clearTimeout(accelerationTimer);
      accelerationTimer = null;
    }
    
    // アイコンを削除
    if (scrollIcon) {
      document.body.removeChild(scrollIcon);
      scrollIcon = null;
    }
  }
  
  // マウスボタンを離した時
  document.addEventListener('mouseup', function(e) {
    if (e.button === 1) {
      e.preventDefault();
      endScrolling();
    }
  });
  
  // 通常のクリックでも終了
  document.addEventListener('click', function(e) {
    if (scrollActive) {
      endScrolling();
    }
  });
  
  // ESCキーでも終了
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && scrollActive) {
      endScrolling();
    }
  });
  
  // ページを離れた時
  document.addEventListener('mouseleave', endScrolling);
  window.addEventListener('blur', endScrolling);
  window.addEventListener('beforeunload', endScrolling);
  
  // 初期化処理
  function init() {
    loadSettings();
  }
  
  // 初期化実行
  init();
})();