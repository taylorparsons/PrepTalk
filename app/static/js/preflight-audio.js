/**
 * Adaptive Audio Scout - Preflight check for PrepTalk
 *
 * Runs BEFORE main app to:
 * 1. Check network conditions (bandwidth, latency, connection type)
 * 2. Check device capabilities (CPU, memory, battery)
 * 3. Set optimal audio parameters dynamically
 * 4. Provide fallbacks for unsupported features
 * 5. Display debug telemetry overlay (when ?debug=1)
 *
 * For Google Hackathon - demonstrates production-quality adaptive streaming
 *
 * DEBUG MODE:
 * - Enable with URL param: ?debug=1
 * - Shows sidebar telemetry card with quality indicator
 * - Displays toast notifications when quality changes
 * - Updates in real-time via window.updateAudioDebugOverlay()
 */

(function() {
  'use strict';

  // Default configuration (fallback)
  const DEFAULT_CONFIG = {
    sampleRate: 24000,
    frameSize: 60,
    bitrate: 64000,
    bufferSize: 2048,
    profile: 'medium'
  };

  /**
   * Measure network latency by pinging a lightweight endpoint
   */
  async function measureLatency() {
    try {
      const start = performance.now();
      await fetch('/health', { method: 'HEAD' });
      const latency = performance.now() - start;
      return Math.round(latency);
    } catch (e) {
      return 100; // Assume moderate latency on error
    }
  }

  /**
   * Determine optimal audio configuration based on environment
   */
  async function determineAudioConfig() {
    const connection = navigator.connection;
    const latency = await measureLatency();

    // Network metrics
    const bandwidth = connection?.downlink || 10; // Mbps
    const effectiveType = connection?.effectiveType || '4g';
    const rtt = connection?.rtt || latency;

    // Device metrics
    const cores = navigator.hardwareConcurrency || 4;
    const memory = navigator.deviceMemory || 4; // GB
    const battery = navigator.getBattery ? await navigator.getBattery() : null;
    const lowBattery = battery && !battery.charging && battery.level < 0.2;

    // Decision matrix for audio quality
    let profile, sampleRate, frameSize, bitrate, bufferSize;

    // High quality: Fast network, powerful device
    if (bandwidth > 5 && effectiveType === '4g' && cores >= 4 && !lowBattery) {
      profile = 'high';
      sampleRate = 48000;
      frameSize = 20; // Low latency
      bitrate = 128000;
      bufferSize = 2048;
    }
    // Medium quality: Moderate network
    else if (bandwidth > 2 && rtt < 200) {
      profile = 'medium';
      sampleRate = 24000;
      frameSize = 40;
      bitrate = 64000;
      bufferSize = 2048;
    }
    // Low quality: Poor network or limited device
    else {
      profile = 'low';
      sampleRate = 16000;
      frameSize = 60; // Higher latency tolerance
      bitrate = 32000;
      bufferSize = 4096; // Larger buffer for stability
    }

    return {
      sampleRate,
      frameSize,
      bitrate,
      bufferSize,
      profile,
      telemetry: {
        bandwidth,
        effectiveType,
        latency,
        rtt,
        cores,
        memory,
        lowBattery,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Check for required browser features
   */
  function checkFeatures() {
    const features = {
      localStorage: !!window.localStorage,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      mediaRecorder: !!window.MediaRecorder,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      audioWorklet: !!(window.AudioWorklet || window.AudioContext?.prototype?.audioWorklet)
    };

    const missing = Object.keys(features).filter(k => !features[k]);

    if (missing.length > 0) {
      console.warn('⚠️ Missing features:', missing);
      // Non-critical features just log warnings
      if (missing.includes('audioWorklet')) {
        console.warn('AudioWorklet not available - will use fallback');
      }
    }

    return { features, missing };
  }

  /**
   * Initialize adaptive audio configuration
   */
  async function init() {
    console.log('🔍 PrepTalk Audio Scout: Analyzing environment...');

    try {
      // 1. Feature detection
      const { features, missing } = checkFeatures();

      // 2. Critical feature check
      if (!features.audioContext || !features.getUserMedia) {
        throw new Error('Browser does not support required audio features');
      }

      // 3. Determine optimal configuration
      const config = await determineAudioConfig();

      // 4. Store globally for app to use
      window.PREPTALK_AUDIO_CONFIG = config;

      // 5. Log telemetry for debugging/demo
      console.log('✅ Audio Scout Complete:', {
        profile: config.profile,
        sampleRate: `${config.sampleRate / 1000}kHz`,
        frameSize: `${config.frameSize}ms`,
        bitrate: `${config.bitrate / 1000}kbps`,
        network: config.telemetry.effectiveType,
        bandwidth: `${config.telemetry.bandwidth.toFixed(1)} Mbps`,
        latency: `${config.telemetry.latency}ms`
      });

      // 6. Visual indicator for demo (optional)
      const debugMode = new URLSearchParams(window.location.search).get('debug') === '1';
      if (debugMode) {
        showDebugBadge(config);
        showDebugOverlay(config);
      }

      // 7. Store last config for change detection
      window.PREPTALK_AUDIO_LAST_CONFIG = config;

    } catch (error) {
      console.error('❌ Audio Scout failed:', error.message);

      // Fallback to defaults
      window.PREPTALK_AUDIO_CONFIG = DEFAULT_CONFIG;

      // Show error to user if critical
      if (!checkFeatures().features.audioContext) {
        document.body.innerHTML = `
          <div style="padding:40px;text-align:center;font-family:system-ui">
            <h1>🎙️ Audio Not Supported</h1>
            <p style="color:#666">Your browser doesn't support voice features.</p>
            <p style="color:#666;font-size:14px">Try Chrome, Firefox, or Safari.</p>
          </div>
        `;
        throw error;
      }
    }
  }

  /**
   * Show debug badge with current quality settings (for demos)
   */
  function showDebugBadge(config) {
    const badge = document.createElement('div');
    badge.id = 'audio-scout-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: rgba(0,0,0,0.85);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 11px;
      font-family: monospace;
      z-index: 9999;
      line-height: 1.6;
    `;

    const profileColor = {
      high: '#10B981',
      medium: '#F59E0B',
      low: '#EF4444'
    }[config.profile];

    badge.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;color:${profileColor}">
        🎙️ Audio: ${config.profile.toUpperCase()}
      </div>
      <div>Sample: ${config.sampleRate / 1000}kHz</div>
      <div>Frame: ${config.frameSize}ms</div>
      <div>Network: ${config.telemetry.effectiveType}</div>
      <div>Latency: ${config.telemetry.latency}ms</div>
    `;

    document.body.appendChild(badge);
  }

  /**
   * Show debug overlay in sidebar with telemetry data
   */
  function showDebugOverlay(config) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => showDebugOverlay(config));
      return;
    }

    const card = document.getElementById('debug-telemetry-card');
    if (!card) {
      console.warn('Debug telemetry card not found in DOM');
      return;
    }

    // Show the card
    card.style.display = 'block';

    // Update quality indicator
    updateDebugQuality(config.profile);

    // Update telemetry stats
    document.getElementById('debug-sample-rate').textContent = `${config.sampleRate / 1000} kHz`;
    document.getElementById('debug-frame-size').textContent = `${config.frameSize} ms`;
    document.getElementById('debug-network-type').textContent = config.telemetry.effectiveType || 'unknown';
    document.getElementById('debug-latency').textContent = `${config.telemetry.latency} ms`;
    document.getElementById('debug-bandwidth').textContent = `${config.telemetry.bandwidth.toFixed(1)} Mbps`;

    // Expose update function globally for runtime changes
    window.updateAudioDebugOverlay = updateDebugOverlay;
  }

  /**
   * Update debug quality indicator
   */
  function updateDebugQuality(profile) {
    const qualityText = document.getElementById('debug-quality-text');
    const qualityDot = document.getElementById('debug-quality-dot');
    const qualityFill = document.getElementById('debug-quality-fill');

    const profileConfig = {
      high: { text: 'HIGH', width: '100%', class: 'quality-high' },
      medium: { text: 'MEDIUM', width: '60%', class: 'quality-medium' },
      low: { text: 'LOW', width: '30%', class: 'quality-low' }
    };

    const config = profileConfig[profile] || profileConfig.medium;

    qualityText.textContent = config.text;
    qualityFill.style.width = config.width;

    // Remove old classes
    ['quality-high', 'quality-medium', 'quality-low'].forEach(c => {
      qualityDot.classList.remove(c);
      qualityFill.classList.remove(c);
    });

    // Add new class
    qualityDot.classList.add(config.class);
    qualityFill.classList.add(config.class);
  }

  /**
   * Update debug overlay with new config (runtime updates)
   */
  function updateDebugOverlay(newConfig) {
    const lastConfig = window.PREPTALK_AUDIO_LAST_CONFIG;

    // Update quality if changed
    if (lastConfig && lastConfig.profile !== newConfig.profile) {
      updateDebugQuality(newConfig.profile);

      // Show toast notification for quality change
      showDebugToast(lastConfig.profile, newConfig.profile, newConfig);
    }

    // Update telemetry stats
    document.getElementById('debug-sample-rate').textContent = `${newConfig.sampleRate / 1000} kHz`;
    document.getElementById('debug-frame-size').textContent = `${newConfig.frameSize} ms`;
    document.getElementById('debug-network-type').textContent = newConfig.telemetry.effectiveType || 'unknown';
    document.getElementById('debug-latency').textContent = `${newConfig.telemetry.latency} ms`;
    document.getElementById('debug-bandwidth').textContent = `${newConfig.telemetry.bandwidth.toFixed(1)} Mbps`;

    // Store new config
    window.PREPTALK_AUDIO_LAST_CONFIG = newConfig;
    window.PREPTALK_AUDIO_CONFIG = newConfig;
  }

  /**
   * Show toast notification for quality changes
   */
  function showDebugToast(oldProfile, newProfile, config) {
    // Create toast element if doesn't exist
    let toast = document.getElementById('debug-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'debug-toast';
      toast.className = 'debug-toast';
      document.body.appendChild(toast);
    }

    // Determine toast type and message
    const isUpgrade = (oldProfile === 'low' && newProfile !== 'low') ||
                      (oldProfile === 'medium' && newProfile === 'high');
    const isDowngrade = (oldProfile === 'high' && newProfile !== 'high') ||
                        (oldProfile === 'medium' && newProfile === 'low');

    const toastConfig = {
      upgrade: {
        icon: '⬆️',
        title: 'Audio Quality Improved',
        class: 'toast-success',
        message: `Upgraded to ${newProfile.toUpperCase()} quality (${config.sampleRate / 1000}kHz)`
      },
      downgrade: {
        icon: '⬇️',
        title: 'Audio Quality Adjusted',
        class: 'toast-warning',
        message: `Switched to ${newProfile.toUpperCase()} quality for stability`
      },
      change: {
        icon: '🔄',
        title: 'Audio Settings Changed',
        class: 'toast-warning',
        message: `Now using ${newProfile.toUpperCase()} quality profile`
      }
    };

    const toastData = isUpgrade ? toastConfig.upgrade :
                      isDowngrade ? toastConfig.downgrade :
                      toastConfig.change;

    // Update toast content
    toast.innerHTML = `
      <span class="debug-toast-icon">${toastData.icon}</span>
      <div class="debug-toast-content">
        <p class="debug-toast-title">${toastData.title}</p>
        <p class="debug-toast-message">${toastData.message}</p>
      </div>
    `;

    // Update toast class
    toast.className = `debug-toast ${toastData.class}`;

    // Show toast with animation
    setTimeout(() => toast.classList.add('visible'), 10);

    // Hide after 4 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
    }, 4000);
  }

  // Run scout immediately
  init();
})();
