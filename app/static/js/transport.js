export class LiveTransport {
  constructor({ url, onStatus, onTranscript, onSession, onError, onOpen, onClose } = {}) {
    this.url = url || LiveTransport.defaultUrl();
    this.onStatus = onStatus;
    this.onTranscript = onTranscript;
    this.onSession = onSession;
    this.onError = onError;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.ws = null;
    this.openPromise = null;
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

    this.ws = new WebSocket(this.url);
    this.ws.binaryType = 'arraybuffer';

    this.openPromise = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', () => {
        this.onOpen?.();
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
      }
    });

    this.ws.addEventListener('close', () => {
      this.onClose?.();
    });

    return this.openPromise;
  }

  start(interviewId) {
    this.send({ type: 'start', interview_id: interviewId });
  }

  stop() {
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
    if (pcm16.buffer) {
      this.ws.send(pcm16.buffer);
    }
  }

  send(payload) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(payload));
  }

  close() {
    if (!this.ws) return;
    if (this.ws.readyState === WebSocket.CLOSING || this.ws.readyState === WebSocket.CLOSED) {
      return;
    }
    this.ws.close();
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
    } else if (payload.type === 'error') {
      this.onError?.(payload);
    }
  }
}
