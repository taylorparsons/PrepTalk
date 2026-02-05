/**
 * Transport layer using Web Worker for WebSocket.
 * All network I/O happens off main thread.
 *
 * Supports preloading - call preloadNetworkWorker() early to warm cache.
 *
 * @module transport-v2
 */

let preloadedWorker = null;
let workerPreloaded = false;

/**
 * Preload the network worker.
 * Call this on page load (before user needs voice).
 * Worker will be warm and ready when session starts.
 */
export function preloadNetworkWorker() {
  if (workerPreloaded || preloadedWorker) return;

  try {
    preloadedWorker = new Worker('/static/js/workers/network.worker.js');
    workerPreloaded = true;

    // Keep worker alive but idle
    preloadedWorker.onmessage = () => {
      // Ignore messages during preload phase
    };
  } catch (error) {
    console.warn('Network worker preload failed:', error);
    preloadedWorker = null;
    workerPreloaded = false;
  }
}

/**
 * LiveTransport using Web Worker for all network I/O.
 */
export class LiveTransport {
  constructor({
    url,
    onStatus,
    onTranscript,
    onSession,
    onAudio,
    onError,
    onOpen,
    onClose,
    maxReconnectAttempts = 3,
    batchIntervalMs = 60
  } = {}) {
    this.url = url || LiveTransport.defaultUrl();
    this.onStatus = onStatus;
    this.onTranscript = onTranscript;
    this.onSession = onSession;
    this.onAudio = onAudio;
    this.onError = onError;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.batchIntervalMs = batchIntervalMs;

    this.worker = null;
    this.connected = false;
    this.connecting = false;
  }

  static defaultUrl() {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws/live`;
  }

  /**
   * Connect to WebSocket via worker.
   * Uses preloaded worker if available.
   */
  connect() {
    if (this.connected) return Promise.resolve();
    if (this.connecting) return this._connectPromise;

    this.connecting = true;

    this._connectPromise = new Promise((resolve, reject) => {
      // Use preloaded worker or create new
      if (preloadedWorker && workerPreloaded) {
        this.worker = preloadedWorker;
        preloadedWorker = null;
        workerPreloaded = false;
      } else {
        try {
          this.worker = new Worker('/static/js/workers/network.worker.js');
        } catch (error) {
          this.connecting = false;
          reject(new Error('Failed to create network worker'));
          return;
        }
      }

      // Set up message handler
      this.worker.onmessage = (event) => {
        this._handleWorkerMessage(event.data);

        // Resolve on first successful connect
        if (event.data.type === 'status' && event.data.state === 'connected') {
          this.connected = true;
          this.connecting = false;
          resolve();
        }

        // Reject on connection failure
        if (event.data.type === 'error' && this.connecting) {
          this.connecting = false;
          reject(new Error(event.data.message || 'Connection failed'));
        }
      };

      this.worker.onerror = (error) => {
        this.connecting = false;
        reject(new Error('Worker error'));
      };

      // Tell worker to connect
      this.worker.postMessage({
        type: 'connect',
        url: this.url,
        maxReconnectAttempts: this.maxReconnectAttempts,
        batchIntervalMs: this.batchIntervalMs
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.connecting) {
          this.connecting = false;
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });

    return this._connectPromise;
  }

  /**
   * Handle messages from the worker.
   */
  _handleWorkerMessage(data) {
    if (!data?.type) return;

    switch (data.type) {
      case 'status':
        if (data.state === 'connected') {
          this.connected = true;
          this.onOpen?.();
        } else if (data.state === 'disconnected') {
          this.connected = false;
          this.onClose?.();
        } else if (data.state === 'reconnecting') {
          this.connected = false;
        } else if (data.state === 'reconnected') {
          this.connected = true;
        }
        this.onStatus?.(data);
        break;

      case 'transcript':
        this.onTranscript?.(data);
        break;

      case 'session':
        this.onSession?.(data);
        break;

      case 'audio':
        // Audio comes as transferable ArrayBuffer
        this.onAudio?.(data.buffer);
        break;

      case 'error':
        this.onError?.(data);
        break;

      case 'stats':
        // Debug stats from worker
        console.log('Network stats:', data);
        break;
    }
  }

  /**
   * Start a live session.
   */
  start(interviewId, userId, options = {}) {
    if (!this.worker) return;

    this.worker.postMessage({
      type: 'start',
      interview_id: interviewId,
      user_id: userId,
      resume: options.resume,
      live_model: options.liveModel
    });
  }

  /**
   * Stop the current session and close connection.
   */
  stop() {
    if (!this.worker) return;

    this.worker.postMessage({ type: 'stop' });
    this.close();
  }

  /**
   * Send audio data to server.
   * Uses transferable for zero-copy performance.
   *
   * @param {Int16Array} pcm16 - PCM audio data
   */
  sendAudio(pcm16) {
    if (!this.worker || !this.connected) return;
    if (!pcm16 || pcm16.length === 0) return;

    // Create a copy of the buffer to transfer
    const buffer = pcm16.buffer.slice(
      pcm16.byteOffset,
      pcm16.byteOffset + pcm16.byteLength
    );

    // Transfer ownership to worker (zero-copy)
    this.worker.postMessage(
      { type: 'audio', buffer },
      [buffer]
    );
  }

  /**
   * Send a JSON message.
   */
  send(payload) {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'send', payload });
  }

  /**
   * Close the connection and terminate worker.
   */
  close() {
    this.connected = false;
    this.connecting = false;

    if (!this.worker) return;

    this.worker.postMessage({ type: 'disconnect' });

    // Give worker time to cleanup, then terminate
    setTimeout(() => {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
    }, 100);
  }

  /**
   * Signal barge-in (user started speaking).
   */
  bargeIn() {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'barge_in' });
  }

  /**
   * Get network stats for debugging.
   */
  getStats() {
    if (!this.worker) return;
    this.worker.postMessage({ type: 'get_stats' });
  }
}

/**
 * Check if Web Workers are supported.
 */
export function isWorkerSupported() {
  return typeof Worker !== 'undefined';
}
