/**
 * Audio system preloader.
 *
 * Warms up workers and caches during browser idle time,
 * so voice features are instant when user needs them.
 *
 * Usage:
 *   import { preloadAudioSystem } from './audio/preloader.js';
 *   preloadAudioSystem(); // Call on page load
 *
 * @module audio/preloader
 */

import { preloadAudioWorklet } from './capture.js';
import { preloadNetworkWorker } from '../transport-v2.js';

let preloadStarted = false;
let preloadComplete = false;

/**
 * Preload all audio-related workers and modules.
 * Uses requestIdleCallback to avoid competing with page load.
 *
 * @param {Object} options
 * @param {boolean} options.immediate - Skip idle callback, load now
 * @param {Function} options.onComplete - Called when preload finishes
 */
export function preloadAudioSystem({ immediate = false, onComplete } = {}) {
  if (preloadStarted) {
    if (preloadComplete && onComplete) {
      onComplete();
    }
    return;
  }

  preloadStarted = true;

  const doPreload = async () => {
    try {
      // Preload in parallel
      await Promise.all([
        preloadAudioWorklet(),
        Promise.resolve(preloadNetworkWorker())
      ]);

      preloadComplete = true;
      onComplete?.();
    } catch (error) {
      console.warn('Audio preload partial failure:', error);
      // Don't block - modules will load on demand
      preloadComplete = true;
      onComplete?.();
    }
  };

  if (immediate) {
    doPreload();
  } else if (typeof requestIdleCallback !== 'undefined') {
    // Preload when browser is idle (won't block page load)
    requestIdleCallback(() => {
      doPreload();
    }, { timeout: 5000 }); // Max 5 second delay
  } else {
    // Fallback: slight delay to let critical resources load first
    setTimeout(doPreload, 1000);
  }
}

/**
 * Check if preload is complete.
 */
export function isPreloadComplete() {
  return preloadComplete;
}

/**
 * Wait for preload to complete.
 * Returns immediately if already done.
 */
export function waitForPreload() {
  if (preloadComplete) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const check = () => {
      if (preloadComplete) {
        resolve();
      } else {
        setTimeout(check, 50);
      }
    };
    check();
  });
}
