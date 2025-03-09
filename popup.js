document.addEventListener('DOMContentLoaded', function() {
    // デフォルト設定
    const defaultSettings = {
      forwardSpeed: 50,
      backwardSpeed: 40,
      speedFactor: 1.0,
      reverseDirection: false
    };
    
    // DOM要素
    const forwardSpeed = document.getElementById('forwardSpeed');
    const backwardSpeed = document.getElementById('backwardSpeed');
    const sensitivity = document.getElementById('sensitivity');
    const reverse = document.getElementById('reverse');
    
    const forwardSpeedInput = document.getElementById('forwardSpeedInput');
    const backwardSpeedInput = document.getElementById('backwardSpeedInput');
    const sensitivityInput = document.getElementById('sensitivityInput');
    
    const resetButton = document.getElementById('reset');
    const saveButton = document.getElementById('save');
    
    // 設定を読み込む
    chrome.storage.local.get(defaultSettings, function(settings) {
      // スライダーに値を設定
      forwardSpeed.value = settings.forwardSpeed;
      backwardSpeed.value = settings.backwardSpeed;
      sensitivity.value = settings.speedFactor;
      reverse.checked = settings.reverseDirection;
      
      // 数値入力欄にも値を設定
      forwardSpeedInput.value = settings.forwardSpeed;
      backwardSpeedInput.value = settings.backwardSpeed;
      sensitivityInput.value = settings.speedFactor.toFixed(1);
    });
    
    // スライダーの変更イベント - 数値入力欄に反映
    forwardSpeed.addEventListener('input', function() {
      forwardSpeedInput.value = this.value;
    });
    
    backwardSpeed.addEventListener('input', function() {
      backwardSpeedInput.value = this.value;
    });
    
    sensitivity.addEventListener('input', function() {
      sensitivityInput.value = parseFloat(this.value).toFixed(1);
    });
    
    // 数値入力欄の変更イベント - スライダーに反映
    forwardSpeedInput.addEventListener('input', function() {
      let value = parseInt(this.value);
      // NaNチェック
      if (isNaN(value)) value = 0;
      // 範囲チェック
      if (value < 0) value = 0;
      if (value > 100) value = 100;
      forwardSpeed.value = value;
      // 入力フィールドが空の場合は何もしない
      if (this.value !== '') {
        this.value = value; // 範囲外の入力を修正
      }
    });
    
    backwardSpeedInput.addEventListener('input', function() {
      let value = parseInt(this.value);
      // NaNチェック
      if (isNaN(value)) value = 0;
      // 範囲チェック
      if (value < 0) value = 0;
      if (value > 100) value = 100;
      backwardSpeed.value = value;
      // 入力フィールドが空の場合は何もしない
      if (this.value !== '') {
        this.value = value; // 範囲外の入力を修正
      }
    });
    
    sensitivityInput.addEventListener('input', function() {
      let value = parseFloat(this.value);
      // NaNチェック
      if (isNaN(value)) value = 0.5;
      // 範囲チェック
      if (value < 0.5) value = 0.5;
      if (value > 3.0) value = 3.0;
      value = Math.round(value * 10) / 10; // 小数点第一位まで
      sensitivity.value = value;
      // 入力フィールドが空の場合は何もしない
      if (this.value !== '') {
        this.value = value.toFixed(1); // 範囲外の入力を修正
      }
    });
    
    // フォーカスを失ったときにも値をチェック（空欄対策）
    forwardSpeedInput.addEventListener('blur', function() {
      if (this.value === '') {
        this.value = forwardSpeed.value;
      }
    });
    
    backwardSpeedInput.addEventListener('blur', function() {
      if (this.value === '') {
        this.value = backwardSpeed.value;
      }
    });
    
    sensitivityInput.addEventListener('blur', function() {
      if (this.value === '') {
        this.value = parseFloat(sensitivity.value).toFixed(1);
      }
    });
    
    // リセットボタン
    resetButton.addEventListener('click', function() {
      // スライダーをリセット
      forwardSpeed.value = defaultSettings.forwardSpeed;
      backwardSpeed.value = defaultSettings.backwardSpeed;
      sensitivity.value = defaultSettings.speedFactor;
      reverse.checked = defaultSettings.reverseDirection;
      
      // 数値入力欄もリセット
      forwardSpeedInput.value = defaultSettings.forwardSpeed;
      backwardSpeedInput.value = defaultSettings.backwardSpeed;
      sensitivityInput.value = defaultSettings.speedFactor.toFixed(1);
    });
    
    // 保存ボタン
    saveButton.addEventListener('click', function() {
      const newSettings = {
        forwardSpeed: parseInt(forwardSpeed.value),
        backwardSpeed: parseInt(backwardSpeed.value),
        speedFactor: parseFloat(sensitivity.value),
        reverseDirection: reverse.checked
      };
      
      chrome.storage.local.set(newSettings, function() {
        console.log('設定を保存しました');
        
        // タブにメッセージを送信（設定更新を通知）
        try {
          chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs && tabs.length > 0 && tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: 'updateSettings',
                settings: newSettings
              }).catch(function(error) {
                console.log('メッセージ送信エラー（無視可）:', error);
              });
            }
          });
        } catch (e) {
          console.log('設定更新通知エラー（無視可）:', e);
        }
        
        // 保存完了フィードバック
        saveButton.textContent = '保存完了！';
        setTimeout(() => {
          saveButton.textContent = '保存';
        }, 1500);
      });
    });
  });