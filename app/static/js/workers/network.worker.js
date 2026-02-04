/**
 * Dedicated worker for WebSocket communication.
 * Handles connection, batching, and reconnection off main thread.
 *
 * @module network.worker
 */

let ws = null;

const config = {
  url: null,
  maxReconnectAttempts: 3,
  reconnectDelayMs: 600,
  heartbeatIntervalMs: 10000,
  batchIntervalMs: 60 // Batch audio frames every 60ms
};

const state = {
  shouldReconnect: true,
  reconnectAttempts: 0,
  reconnectTimer: null,
  heartbeatTimer: null,
  audioBatch: [],
  batchTimer: null,
  totalBytesSent: 0,
  totalBatchesSent: 0,
  // Transcript cache for recovery
  transcriptCache: [],
  lastTranscriptBackup: 0
};

// === Connection Management ===

function connect() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    return;
  }

  state.shouldReconnect = true;
  clearReconnectTimer();

  try {
    ws = new WebSocket(config.url);
    ws.binaryType = 'arraybuffer';
  } catch (error) {
    postMessage({ type: 'error', message: 'Failed to create WebSocket' });
    return;
  }

  ws.onopen = () => {
    state.reconnectAttempts = 0;
    postMessage({ type: 'status', state: 'connected' });
    startHeartbeat();
    startBatchTimer();
  };

  ws.onmessage = (event) => {
    if (typeof event.data === 'string') {
      handleJsonMessage(event.data);
    } else if (event.data instanceof ArrayBuffer) {
      // Transfer audio back to main thread (zero-copy)
      postMessage(
        { type: 'audio', buffer: event.data },
        [event.data]
      );
    }
  };

  ws.onerror = () => {
    postMessage({ type: 'error', message: 'WebSocket error' });
  };

  ws.onclose = (event) => {
    stopHeartbeat();
    stopBatchTimer();

    // Code 1006 = abnormal closure (network issue, server crash)
    // Send transcript backup so main thread can save to localStorage
    if (event.code === 1006 || event.code !== 1000) {
      sendTranscriptBackup();
    }

    if (state.shouldReconnect && state.reconnectAttempts < config.maxReconnectAttempts) {
      scheduleReconnect();
    } else {
      // Final disconnect - send backup and notify
      sendTranscriptBackup();
      postMessage({
        type: 'status',
        state: 'disconnected',
        code: event.code,
        reason: event.reason,
        hasBackup: state.transcriptCache.length > 0
      });
    }
  };
}

function disconnect() {
  state.shouldReconnect = false;
  clearReconnectTimer();
  stopHeartbeat();
  stopBatchTimer();
  flushBatch(); // Send any remaining audio

  if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
    ws.close(1000, 'Client disconnect');
  }
  ws = null;
}

// === Reconnection with Exponential Backoff ===

function scheduleReconnect() {
  state.reconnectAttempts++;
  // Exponential backoff: 600ms, 1200ms, 2400ms
  const delay = config.reconnectDelayMs * Math.pow(2, state.reconnectAttempts - 1);

  postMessage({
    type: 'status',
    state: 'reconnecting',
    attempt: state.reconnectAttempts,
    maxAttempts: config.maxReconnectAttempts,
    delayMs: delay
  });

  clearReconnectTimer();
  state.reconnectTimer = setTimeout(connect, delay);
}

function clearReconnectTimer() {
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
}

// === Heartbeat ===

function startHeartbeat() {
  if (state.heartbeatTimer) return;
  state.heartbeatTimer = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
    }
  }, config.heartbeatIntervalMs);
}

function stopHeartbeat() {
  if (state.heartbeatTimer) {
    clearInterval(state.heartbeatTimer);
    state.heartbeatTimer = null;
  }
}

// === Audio Batching ===

function startBatchTimer() {
  if (state.batchTimer) return;
  state.batchTimer = setInterval(flushBatch, config.batchIntervalMs);
}

function stopBatchTimer() {
  if (state.batchTimer) {
    clearInterval(state.batchTimer);
    state.batchTimer = null;
  }
}

function queueAudio(buffer) {
  if (!buffer || buffer.byteLength === 0) return;
  state.audioBatch.push(buffer);
}

function flushBatch() {
  if (state.audioBatch.length === 0) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  // Calculate total size
  const totalBytes = state.audioBatch.reduce((sum, b) => sum + b.byteLength, 0);
  if (totalBytes === 0) return;

  // Concatenate all buffered frames into one message
  const combined = new Int16Array(totalBytes / 2);
  let offset = 0;

  for (const buffer of state.audioBatch) {
    const view = new Int16Array(buffer);
    combined.set(view, offset);
    offset += view.length;
  }

  // Clear batch before sending (in case send is slow)
  state.audioBatch = [];

  // Send combined buffer
  ws.send(combined.buffer);

  // Track stats for debugging
  state.totalBytesSent += combined.buffer.byteLength;
  state.totalBatchesSent++;
}

// === Message Handling ===

function handleJsonMessage(data) {
  try {
    const payload = JSON.parse(data);

    // Cache transcripts for recovery on disconnect
    if (payload.type === 'transcript') {
      state.transcriptCache.push({
        ...payload,
        cachedAt: Date.now()
      });
      // Keep last 100 transcript entries
      if (state.transcriptCache.length > 100) {
        state.transcriptCache.shift();
      }
    }

    postMessage(payload);
  } catch (e) {
    postMessage({ type: 'error', message: 'Invalid JSON from server' });
  }
}

/**
 * Send cached transcript to main thread for localStorage backup.
 * Called when connection is lost unexpectedly.
 */
function sendTranscriptBackup() {
  if (state.transcriptCache.length === 0) return;

  postMessage({
    type: 'transcript_backup',
    transcripts: state.transcriptCache,
    timestamp: Date.now()
  });
}

function sendJson(payload) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

// === Worker Message Handler ===

onmessage = (event) => {
  const { type, ...data } = event.data;

  switch (type) {
    case 'connect':
      if (data.url) {
        config.url = data.url;
      }
      if (data.maxReconnectAttempts !== undefined) {
        config.maxReconnectAttempts = data.maxReconnectAttempts;
      }
      if (data.batchIntervalMs !== undefined) {
        config.batchIntervalMs = data.batchIntervalMs;
      }
      connect();
      break;

    case 'disconnect':
      disconnect();
      break;

    case 'audio':
      queueAudio(data.buffer);
      break;

    case 'send':
      sendJson(data.payload);
      break;

    case 'start':
      sendJson({
        type: 'start',
        interview_id: data.interview_id,
        user_id: data.user_id,
        resume: data.resume,
        live_model: data.live_model
      });
      break;

    case 'stop':
      sendJson({ type: 'stop' });
      break;

    case 'barge_in':
      sendJson({ type: 'barge_in' });
      break;

    case 'get_stats':
      postMessage({
        type: 'stats',
        totalBytesSent: state.totalBytesSent,
        totalBatchesSent: state.totalBatchesSent,
        avgBatchSize: state.totalBatchesSent > 0
          ? Math.round(state.totalBytesSent / state.totalBatchesSent)
          : 0
      });
      break;
  }
};
