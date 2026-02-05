/**
 * Session persistence for crash recovery.
 *
 * Handles:
 * - Periodic auto-save (browser crash recovery)
 * - beforeunload save (graceful shutdown)
 * - IndexedDB for large data (transcripts)
 * - localStorage for small data (settings)
 *
 * Corporate network safe:
 * - No SharedArrayBuffer (triggers security scans)
 * - No excessive storage operations
 * - Respects storage quotas
 *
 * @module audio/session-persistence
 */

const DB_NAME = 'preptalk_sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';
const AUTO_SAVE_INTERVAL_MS = 5000; // Save every 5 seconds
const MAX_STORED_SESSIONS = 5; // Keep last 5 sessions

let db = null;
let autoSaveTimer = null;
let currentSessionId = null;
let pendingWrites = [];

/**
 * Initialize IndexedDB for session storage.
 * Falls back to localStorage if IndexedDB unavailable.
 */
export async function initSessionStorage() {
  if (!window.indexedDB) {
    console.warn('IndexedDB not available, using localStorage fallback');
    return false;
  }

  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('IndexedDB failed, using localStorage fallback');
      resolve(false);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(true);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Start a new session with auto-save.
 *
 * @param {string} sessionId - Unique session identifier
 * @param {Object} initialData - Initial session data
 */
export function startSession(sessionId, initialData = {}) {
  currentSessionId = sessionId;

  const session = {
    id: sessionId,
    ...initialData,
    transcript: [],
    startedAt: Date.now(),
    timestamp: Date.now()
  };

  // Save immediately
  saveSession(session);

  // Start auto-save timer
  startAutoSave();

  // Save on page unload
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return session;
}

/**
 * Update current session data.
 * Batches updates to avoid excessive writes.
 *
 * @param {Object} updates - Data to merge into session
 */
export function updateSession(updates) {
  if (!currentSessionId) return;

  pendingWrites.push({
    ...updates,
    timestamp: Date.now()
  });
}

/**
 * Add transcript entry to current session.
 *
 * @param {Object} entry - Transcript entry {role, text, timestamp}
 */
export function addTranscript(entry) {
  updateSession({
    transcriptEntry: entry
  });
}

/**
 * End current session, final save.
 *
 * @param {Object} finalData - Final session data (scores, etc.)
 */
export async function endSession(finalData = {}) {
  if (!currentSessionId) return;

  stopAutoSave();
  window.removeEventListener('beforeunload', handleBeforeUnload);
  document.removeEventListener('visibilitychange', handleVisibilityChange);

  // Flush all pending writes
  await flushPendingWrites();

  // Save final state
  const session = await getSession(currentSessionId);
  if (session) {
    session.endedAt = Date.now();
    session.completed = true;
    Object.assign(session, finalData);
    await saveSession(session);
  }

  currentSessionId = null;
}

/**
 * Get session by ID.
 *
 * @param {string} sessionId
 * @returns {Promise<Object|null>}
 */
export async function getSession(sessionId) {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(sessionId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
  }

  // localStorage fallback
  try {
    const data = localStorage.getItem(`preptalk_session_${sessionId}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

/**
 * Get most recent incomplete session for recovery.
 *
 * @returns {Promise<Object|null>}
 */
export async function getRecoverableSession() {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');

      // Get most recent
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const session = cursor.value;
          // Only return if not completed and less than 24 hours old
          if (!session.completed && Date.now() - session.timestamp < 24 * 60 * 60 * 1000) {
            resolve(session);
            return;
          }
        }
        resolve(null);
      };

      request.onerror = () => resolve(null);
    });
  }

  // localStorage fallback
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('preptalk_session_'));
    if (keys.length === 0) return null;

    let newest = null;
    for (const key of keys) {
      const session = JSON.parse(localStorage.getItem(key));
      if (!session.completed && (!newest || session.timestamp > newest.timestamp)) {
        newest = session;
      }
    }

    if (newest && Date.now() - newest.timestamp < 24 * 60 * 60 * 1000) {
      return newest;
    }
  } catch (e) {
    // Ignore
  }

  return null;
}

/**
 * Delete a session.
 *
 * @param {string} sessionId
 */
export async function deleteSession(sessionId) {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(sessionId);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  localStorage.removeItem(`preptalk_session_${sessionId}`);
  return true;
}

/**
 * Clean up old sessions to respect storage limits.
 */
export async function cleanupOldSessions() {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const sessions = [];

      index.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          sessions.push(cursor.value);
          cursor.continue();
        } else {
          // Sort by timestamp, keep newest MAX_STORED_SESSIONS
          sessions.sort((a, b) => b.timestamp - a.timestamp);
          const toDelete = sessions.slice(MAX_STORED_SESSIONS);
          for (const session of toDelete) {
            store.delete(session.id);
          }
          resolve(toDelete.length);
        }
      };
    });
  }

  // localStorage cleanup
  const keys = Object.keys(localStorage)
    .filter(k => k.startsWith('preptalk_session_'))
    .map(k => ({
      key: k,
      timestamp: JSON.parse(localStorage.getItem(k))?.timestamp || 0
    }))
    .sort((a, b) => b.timestamp - a.timestamp);

  const toDelete = keys.slice(MAX_STORED_SESSIONS);
  for (const { key } of toDelete) {
    localStorage.removeItem(key);
  }

  return toDelete.length;
}

// === Internal Functions ===

async function saveSession(session) {
  if (db) {
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(session);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  }

  // localStorage fallback
  try {
    // Check storage quota (rough estimate)
    const data = JSON.stringify(session);
    if (data.length > 5 * 1024 * 1024) {
      // Over 5MB, trim transcript
      session.transcript = session.transcript.slice(-50);
    }
    localStorage.setItem(`preptalk_session_${session.id}`, JSON.stringify(session));
    return true;
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Clear old sessions and retry
      await cleanupOldSessions();
      try {
        localStorage.setItem(`preptalk_session_${session.id}`, JSON.stringify(session));
        return true;
      } catch (e2) {
        return false;
      }
    }
    return false;
  }
}

async function flushPendingWrites() {
  if (pendingWrites.length === 0) return;
  if (!currentSessionId) return;

  const session = await getSession(currentSessionId) || {
    id: currentSessionId,
    transcript: [],
    timestamp: Date.now()
  };

  // Apply all pending updates
  for (const update of pendingWrites) {
    if (update.transcriptEntry) {
      session.transcript.push(update.transcriptEntry);
    } else {
      Object.assign(session, update);
    }
    session.timestamp = update.timestamp;
  }

  pendingWrites = [];
  await saveSession(session);
}

function startAutoSave() {
  if (autoSaveTimer) return;

  autoSaveTimer = setInterval(() => {
    flushPendingWrites();
  }, AUTO_SAVE_INTERVAL_MS);
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

function handleBeforeUnload() {
  // Synchronous save attempt
  if (currentSessionId && pendingWrites.length > 0) {
    const session = JSON.parse(
      localStorage.getItem(`preptalk_session_${currentSessionId}`) || '{}'
    );
    for (const update of pendingWrites) {
      if (update.transcriptEntry) {
        session.transcript = session.transcript || [];
        session.transcript.push(update.transcriptEntry);
      } else {
        Object.assign(session, update);
      }
    }
    session.timestamp = Date.now();
    session.closedUnexpectedly = true;
    try {
      localStorage.setItem(`preptalk_session_${currentSessionId}`, JSON.stringify(session));
    } catch (e) {
      // Best effort
    }
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    // Flush when tab goes to background
    flushPendingWrites();
  }
}
