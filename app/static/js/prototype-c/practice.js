// ============================================
// UPSTREAM STORY SUGGESTIONS
// ============================================

// Map question types to relevant tags for matching
const QUESTION_TAG_MAP = {
  'Leadership': ['leadership', 'mentorship', 'collaboration'],
  'Technical': ['technical', 'problem-solving', 'innovation'],
  'Conflict': ['conflict', 'communication', 'negotiation'],
  'Teamwork': ['collaboration', 'leadership', 'mentorship'],
  'Problem Solving': ['problem-solving', 'technical', 'results-driven'],
  'Growth': ['growth', 'mentorship', 'leadership']
};

// Currently selected suggestion for use
let selectedSuggestion = null;

/**
 * Find stories that match a question type.
 * Returns stories sorted by readiness (most ready first).
 *
 * @param {string} questionType - The type of question (e.g., 'Leadership')
 * @returns {Array} Matching stories sorted by readiness
 */
function getRelevantStories(questionType) {
  const data = getStories();
  const relevantTags = QUESTION_TAG_MAP[questionType] || [];

  // Score each story by how many relevant tags it has
  const scored = data.stories.map(story => {
    const matchCount = story.tags.filter(tag => relevantTags.includes(tag)).length;
    return { ...story, matchScore: matchCount };
  });

  // Filter to stories with at least one matching tag, sort by readiness
  return scored
    .filter(s => s.matchScore > 0)
    .sort((a, b) => b.readiness - a.readiness);
}

/**
 * Show story suggestions panel for the current question.
 * Called when entering the practice screen.
 *
 * @param {string} questionType - The type of question being asked
 */
function showStorySuggestions(questionType) {
  const suggestions = getRelevantStories(questionType);
  const panel = document.getElementById('story-suggestions');
  const list = document.getElementById('story-suggestions-list');

  if (!panel || !list) return;

  if (suggestions.length === 0) {
    panel.style.display = 'none';
    return;
  }

  // Show top 2 suggestions
  const topSuggestions = suggestions.slice(0, 2);
  selectedSuggestion = topSuggestions[0];

  // Load thresholds from config
  const thresholds = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.thresholds) || { ready: 80, practicing: 40 };

  list.innerHTML = topSuggestions.map((story, idx) => {
    const status = story.readiness >= thresholds.ready ? 'ready' : story.readiness >= thresholds.practicing ? 'practicing' : 'new';
    const statusLabel = status === 'ready' ? 'Interview-ready' : status === 'practicing' ? 'Practiced' : 'New';
    const practiceText = story.practices === 1 ? '1 time' : `${story.practices} times`;

    return `
      <div class="story-suggestion-item ${idx === 0 ? 'selected' : ''}" data-id="${story.id}" onclick="selectSuggestion('${story.id}')">
        <div class="suggestion-name">${story.name}</div>
        <div class="suggestion-meta">
          <span class="suggestion-status suggestion-status--${status}">${statusLabel}</span>
          <span class="suggestion-practices">Practiced ${practiceText}</span>
        </div>
      </div>
    `;
  }).join('');

  panel.style.display = 'block';
}

/**
 * Select a story suggestion
 */
function selectSuggestion(storyId) {
  const data = getStories();
  selectedSuggestion = data.stories.find(s => s.id === storyId);

  // Update UI selection
  document.querySelectorAll('.story-suggestion-item').forEach(item => {
    item.classList.toggle('selected', item.dataset.id === storyId);
  });
}

/**
 * Use the selected story suggestion.
 * Navigates to practice with the story context.
 */
function useStorySuggestion() {
  if (!selectedSuggestion) return;

  // Update the resume cue sidebar with the selected story
  const cueCard = document.querySelector('.sidebar .tip-card-accent .tip-text');
  if (cueCard) {
    cueCard.textContent = `Using your "${selectedSuggestion.name}" story. You've practiced this ${selectedSuggestion.practices} time${selectedSuggestion.practices === 1 ? '' : 's'}.`;
  }

  hideStorySuggestions();
}

/**
 * Hide the story suggestions panel
 */
function hideStorySuggestions() {
  const panel = document.getElementById('story-suggestions');
  if (panel) panel.style.display = 'none';
}

// ============================================
// STORY PRACTICE (RESCORING)
// ============================================

let currentPracticeStory = null;
let practiceRecording = false;
let practiceStartTime = null;
let practiceTimerInterval = null;

/**
 * Open the story practice modal for a specific story.
 *
 * @param {string} storyId - The ID of the story to practice
 */
function openStoryPractice(storyId) {
  const data = getStories();
  const story = data.stories.find(s => s.id === storyId);

  if (!story) {
    console.warn('PrepTalk: Story not found:', storyId);
    return;
  }

  currentPracticeStory = story;

  // Populate modal
  document.getElementById('practice-story-name').textContent = story.name;
  document.getElementById('practice-readiness-bar').style.width = story.readiness + '%';
  document.getElementById('practice-readiness-value').textContent = story.readiness + '%';
  document.getElementById('practice-count').textContent = story.practices;
  document.getElementById('practice-tags').innerHTML =
    story.tags.map(t => `<span class="story-tag">${t}</span>`).join('');

  // Set dynamic tip based on story state using config thresholds
  const thresholds = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.thresholds) || { ready: 80, practicing: 40 };
  const tipEl = document.getElementById('practice-tip');
  if (story.readiness >= thresholds.ready) {
    tipEl.textContent = 'This story is interview-ready. Practice to keep it sharp.';
  } else if (story.fillersPerMinute > 4) {
    tipEl.textContent = 'Focus on pausing between thoughts instead of filling silence.';
  } else if (story.readiness < 50) {
    tipEl.textContent = 'Take your time. Each practice builds your confidence.';
  } else {
    tipEl.textContent = 'You\'re getting close. One or two more practices should do it.';
  }

  // Reset recording state
  resetPracticeRecording();

  // Show modal
  document.getElementById('story-practice-modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

/**
 * Close the story practice modal
 */
function closeStoryPractice() {
  stopPracticeTimer();
  currentPracticeStory = null;
  practiceRecording = false;

  document.getElementById('story-practice-modal').style.display = 'none';
  document.body.style.overflow = '';

  // Refresh the shelf to show updated scores
  renderStoryShelf();
}

/**
 * Reset the practice recording UI
 */
function resetPracticeRecording() {
  practiceRecording = false;
  practiceStartTime = null;

  document.getElementById('practice-recording-area').style.display = 'block';
  document.getElementById('practice-results').style.display = 'none';
  document.getElementById('practice-mic-btn').classList.remove('recording');
  document.getElementById('practice-mic-label').textContent = 'Start recording';
  document.getElementById('practice-timer').textContent = '0:00';

  stopPracticeTimer();
}

/**
 * Toggle story recording on/off
 */
function toggleStoryRecording() {
  if (!practiceRecording) {
    startPracticeRecording();
  } else {
    stopPracticeRecording();
  }
}

/**
 * Start practice recording
 */
function startPracticeRecording() {
  practiceRecording = true;
  practiceStartTime = Date.now();

  document.getElementById('practice-mic-btn').classList.add('recording');
  document.getElementById('practice-mic-label').textContent = 'Recording... Click to stop';

  // Start timer
  practiceTimerInterval = setInterval(updatePracticeTimer, 1000);
}

/**
 * Stop practice recording and calculate new score
 */
function stopPracticeRecording() {
  practiceRecording = false;
  stopPracticeTimer();

  const duration = (Date.now() - practiceStartTime) / 1000;
  document.getElementById('practice-mic-btn').classList.remove('recording');
  document.getElementById('practice-mic-label').textContent = 'Processing...';

  // Simulate processing delay for realism using configured timing
  const processingDelayMs = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.timings && window.APP_CONFIG.business.timings.processing_delay_ms) || 800;
  setTimeout(() => {
    rescoreStory(duration);
  }, processingDelayMs);
}

/**
 * Update the practice timer display
 */
function updatePracticeTimer() {
  if (!practiceStartTime) return;

  const elapsed = Math.floor((Date.now() - practiceStartTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  document.getElementById('practice-timer').textContent =
    `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Stop the practice timer
 */
function stopPracticeTimer() {
  if (practiceTimerInterval) {
    clearInterval(practiceTimerInterval);
    practiceTimerInterval = null;
  }
}

/**
 * Rescore the story based on practice.
 * Simulates improvement based on practice count and duration.
 *
 * @param {number} duration - Practice duration in seconds
 */
function rescoreStory(duration) {
  if (!currentPracticeStory) return;

  const data = getStories();
  const storyIndex = data.stories.findIndex(s => s.id === currentPracticeStory.id);

  if (storyIndex === -1) return;

  const story = data.stories[storyIndex];
  const oldReadiness = story.readiness;

  // Load practice improvement config with fallback
  const practiceConfig = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.practice_improvement) || {
    practice_bonus: { base: 12, min: 2, diminishing_factor: 1.5 },
    duration_sweet_spot: { optimal_min: 60, optimal_max: 240, acceptable_min: 30, acceptable_max: 300, optimal_bonus: 3, acceptable_bonus: 1 },
    readiness_modifiers: { high_threshold: 80, high_modifier: 0.3, medium_threshold: 60, medium_modifier: 0.6 }
  };

  const readinessThresholds = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.thresholds) || {
    ready: 80,
    practicing: 40
  };

  // Calculate improvement based on:
  // - Practice count (diminishing returns)
  // - Duration (sweet spot configuration)
  // - Current readiness (harder to improve when already high)

  let improvement = 0;

  // Base improvement from practice (diminishing returns)
  const { base, min, diminishing_factor } = practiceConfig.practice_bonus;
  const practiceBonus = Math.max(min, base - (story.practices * diminishing_factor));
  improvement += practiceBonus;

  // Duration bonus (optimal range)
  const { optimal_min, optimal_max, acceptable_min, acceptable_max, optimal_bonus, acceptable_bonus } = practiceConfig.duration_sweet_spot;
  if (duration >= optimal_min && duration <= optimal_max) {
    improvement += optimal_bonus;
  } else if (duration >= acceptable_min && duration <= acceptable_max) {
    improvement += acceptable_bonus;
  }

  // Harder to improve at higher levels
  const { high_threshold, high_modifier, medium_threshold, medium_modifier } = practiceConfig.readiness_modifiers;
  if (oldReadiness > high_threshold) {
    improvement = improvement * high_modifier;
  } else if (oldReadiness > medium_threshold) {
    improvement = improvement * medium_modifier;
  }

  // Simulate filler word improvement
  const fillerImprovement = 0.1 + (Math.random() * 0.3);
  const newFillersPerMinute = Math.max(0.5, story.fillersPerMinute - fillerImprovement);

  // Calculate new readiness
  const newReadiness = Math.min(100, Math.round(oldReadiness + improvement));

  // Update story
  story.readiness = newReadiness;
  story.fillersPerMinute = Math.round(newFillersPerMinute * 10) / 10;
  story.practices += 1;

  // Update insight using config tiers
  const tiers = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.tiers) || {
    excellent: { threshold: 90, message: 'Interview-ready. You own this story.' },
    good: { threshold: 75, message: 'Getting sharp. A bit more practice and you\'re there.' },
    fair: { threshold: 50, message: 'Good progress. The structure is solid.' },
    default: { message: 'Keep practicing. Each time gets easier.' }
  };

  if (newReadiness >= tiers.excellent.threshold) {
    story.insight = tiers.excellent.message;
  } else if (newReadiness >= tiers.good.threshold) {
    story.insight = tiers.good.message;
  } else if (newReadiness >= tiers.fair.threshold) {
    story.insight = tiers.fair.message;
  } else {
    story.insight = tiers.default.message;
  }

  data.stats.sessions = (data.stats.sessions || 0) + 1;
  saveStories(data);

  // Update current reference
  currentPracticeStory = story;

  // Show results
  showPracticeResults(oldReadiness, newReadiness, duration);
}

/**
 * Show the practice results comparison
 */
function showPracticeResults(oldReadiness, newReadiness, duration) {
  document.getElementById('practice-recording-area').style.display = 'none';
  document.getElementById('practice-results').style.display = 'block';

  // Update comparison
  document.getElementById('result-before').textContent = oldReadiness + '%';
  document.getElementById('result-after').textContent = newReadiness + '%';

  // Update readiness bar
  document.getElementById('practice-readiness-bar').style.width = newReadiness + '%';
  document.getElementById('practice-readiness-value').textContent = newReadiness + '%';
  document.getElementById('practice-count').textContent = currentPracticeStory.practices;

  // Set result messaging
  const improvement = newReadiness - oldReadiness;
  const iconEl = document.getElementById('practice-result-icon');
  const titleEl = document.getElementById('practice-result-title');
  const insightEl = document.getElementById('practice-result-insight');

  if (improvement >= 8) {
    iconEl.textContent = '🎯';
    titleEl.textContent = 'Significant improvement!';
    insightEl.textContent = 'That practice really paid off. Your delivery is getting stronger.';
  } else if (improvement >= 3) {
    iconEl.textContent = '✓';
    titleEl.textContent = 'Nice progress';
    insightEl.textContent = 'Every practice session builds muscle memory. Keep it up.';
  } else if (improvement > 0) {
    iconEl.textContent = '📈';
    titleEl.textContent = 'Steady progress';
    insightEl.textContent = 'You\'re maintaining and slightly improving. That\'s exactly how mastery works.';
  } else {
    iconEl.textContent = '💪';
    titleEl.textContent = 'Holding steady';
    insightEl.textContent = 'You\'re at a high level. Maintenance practice keeps you sharp.';
  }
}

/**
 * Practice the same story again
 */
function practiceAgain() {
  resetPracticeRecording();
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initializes the prototype on DOM ready.
 * Checks for existing session and restores state if found.
 */
function initPrototype() {
  const state = getState();

  if (state.lastUpdated) {
    console.log(
      'PrepTalk: Restoring session from',
      new Date(state.lastUpdated).toLocaleString()
    );
    restoreState();
  } else {
    console.log('PrepTalk: No existing session found, starting fresh');
    saveState({ currentScreen: 'screen-welcome' });
  }

  // Initialize demo stories if shelf is empty (for demonstration)
  initDemoStories();

  // Initialize story shelf
  renderStoryShelf();

  // Show story suggestions when entering practice screen
  showStorySuggestions('Leadership');
}

// Enhanced navigation that triggers story suggestions
const originalGoToScreen = goToScreen;
window.goToScreen = function(screenId) {
  originalGoToScreen(screenId);

  // When entering practice screen, show relevant story suggestions
  if (screenId === 'screen-practice') {
    // Get current question type from the meta text
    const metaEl = document.querySelector('#screen-practice .text--meta');
    const questionType = metaEl ? metaEl.textContent.split('•')[1]?.trim() || 'Leadership' : 'Leadership';
    showStorySuggestions(questionType);
  }
};

// ============================================
// EXPOSE FUNCTIONS TO GLOBAL SCOPE
// Using namespaced approach to avoid global pollution
// (Required for inline onclick handlers in HTML)
// ============================================
window.PrepTalk = window.PrepTalk || {};
window.PrepTalk.practice = {
  useStorySuggestion,
  hideStorySuggestions,
  closeStoryPractice,
  toggleStoryRecording,
  practiceAgain
};

// Backward compatibility - expose directly on window for existing onclick handlers
// TODO: Migrate HTML to use PrepTalk.practice.functionName() and remove these
window.useStorySuggestion = useStorySuggestion;
window.hideStorySuggestions = hideStorySuggestions;
window.closeStoryPractice = closeStoryPractice;
window.toggleStoryRecording = toggleStoryRecording;
window.practiceAgain = practiceAgain;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initPrototype);
