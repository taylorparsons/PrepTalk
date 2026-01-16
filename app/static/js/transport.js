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
    reconnectDelayMs = 600,
    heartbeatIntervalMs = 10000
  } = {}) {
    this.url = url || LiveTransport.defaultUrl();
    this.onStatus = onStatus;
    this.onTranscript = onTranscript;
    this.onSession = onSession;
    this.onAudio = onAudio;
    this.onError = onError;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.ws = null;
    this.openPromise = null;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectDelayMs = reconnectDelayMs;
    this.reconnectTimer = null;
    this.heartbeatIntervalMs = heartbeatIntervalMs;
    this.heartbeatTimer = null;
  }

  static defaultUrl() {
    if (typeof window === 'undefined') return '';
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${window.location.host}/ws/live`;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    if (this.ws && this.ws.readyState === WebSocket.CONNECTING && this.openPromise) {
      return this.openPromise;
    }

    if (typeof WebSocket === 'undefined') {
      return Promise.reject(new Error('WebSocket not supported.'));
    }

    this.shouldReconnect = true;
    this._clearReconnectTimer();

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.openPromise = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        this.reconnectAttempts = 0;
        this.onOpen?.();
        this.onStatus?.({ type: 'status', state: 'connected' });
        this._startHeartbeat();
        resolve();
      });
      this.ws.addEventListener('error', (event) => {
        this.onError?.(event);
        reject(new Error('WebSocket connection failed.'));
      });
    });

    this.ws.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        this._handleMessage(event.data);
        return;
      }

      if (event.data instanceof ArrayBuffer) {
        this.onAudio?.(event.data);
        return;
      }

      if (event.data instanceof Blob) {
        event.data.arrayBuffer().then((buffer) => {
          this.onAudio?.(buffer);
        });
      }
    });

    this.ws.addEventListener('close', () => {
      this._stopHeartbeat();
      if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
        this._scheduleReconnect();
        return;
      }
      this.onClose?.();
      this.onStatus?.({ type: 'status', state: 'disconnected' });
    });

    return this.openPromise;
  }

  start(interviewId, userId, { resume = false } = {}) {
    const payload = { type: 'start', interview_id: interviewId, user_id: userId };
    if (resume) {
      payload.resume = true;
    }
    this.send(payload);
  }

  stop() {
    this.shouldReconnect = false;
    this.send({ type: 'stop' });
    this.close();
  }

  sendAudio(pcm16) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (!pcm16) return;
    if (pcm16 instanceof ArrayBuffer) {
      this.ws.send(pcm16);
      return;
    }
    if (ArrayBuffer.isView(pcm16)) {
      this.ws.send(pcm16);
      return;
    }
    if (pcm16.buffer) {
      const slice = pcm16.buffer.slice(
        pcm16.byteOffset || 0,
        (pcm16.byteOffset || 0) + (pcm16.byteLength || pcm16.buffer.byteLength)
      );
      this.ws.send(slice);
    }
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  close() {
    this.shouldReconnect = false;
    this._clearReconnectTimer();
    this._stopHeartbeat();
    if (!this.ws) return;
    if (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
      return;
    }
    this.ws.close();
  }

  bargeIn() {
    this.send({ type: 'barge_in' });
  }

  _startHeartbeat() {
    if (this.heartbeatTimer || !this.heartbeatIntervalMs) return;
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', ts: Date.now() });
      }
    }, this.heartbeatIntervalMs);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _scheduleReconnect() {
    this.reconnectAttempts += 1;
    this.onStatus?.({ type: 'status', state: 'reconnecting', attempt: this.reconnectAttempts });
    const delay = this.reconnectDelayMs * this.reconnectAttempts;
    this._clearReconnectTimer();
    this.reconnectTimer = setTimeout(() => {
      this.connect().then(() => {
        this.onStatus?.({ type: 'status', state: 'reconnected' });
      }).catch(() => {
        // Let the next close attempt schedule another retry.
      });
    }, delay);
  }

  _clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  _handleMessage(message) {
    let payload;
    try {
      payload = JSON.parse(message);
    } catch (error) {
      this.onError?.(error);
      return;
    }

    if (!payload?.type) return;
    if (payload.type === 'status') {
      this.onStatus?.(payload);
    } else if (payload.type === 'transcript') {
      this.onTranscript?.(payload);
    } else if (payload.type === 'session') {
      this.onSession?.(payload);
    } else if (payload.type === 'audio') {
      this.onAudio?.(payload);
    } else if (payload.type === 'error') {
      this.onError?.(payload);
    }
  }
}
