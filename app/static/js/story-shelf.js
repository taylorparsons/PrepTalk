/**
 * Story Shelf - PrepTalk Hackathon App
 * Main application logic for the jaw-dropping demo
 *
 * @module story-shelf
 */

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'preptalk_story_shelf';
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'literally', 'right', 'I mean'];

const SAMPLE_QUESTIONS = [
  { type: 'Leadership', text: 'Tell me about a time you led a team through a difficult situation.' },
  { type: 'Conflict', text: 'Describe a time you had a disagreement with a coworker. How did you handle it?' },
  { type: 'Failure', text: 'Tell me about a time you failed. What did you learn?' },
  { type: 'Achievement', text: 'What\'s your proudest professional accomplishment?' },
  { type: 'Challenge', text: 'Describe the most challenging project you\'ve worked on.' },
  { type: 'Growth', text: 'Tell me about a time you had to learn something new quickly.' }
];

const MILESTONES = {
  first_story: { icon: '📖', label: 'First story captured!' },
  three_stories: { icon: '📚', label: 'Building your library' },
  five_stories: { icon: '🏆', label: 'Story master' },
  first_ready: { icon: '✨', label: 'Interview-ready story!' },
  practiced_again: { icon: '🔄', label: 'Practice makes progress' },
  low_fillers: { icon: '🎯', label: 'Smooth delivery' },
  streak_3: { icon: '🔥', label: '3 day streak' }
};

// ============================================
// STATE
// ============================================

const state = {
  currentScreen: 'welcome',
  currentQuestion: null,
  isRecording: false,
  recordingStartTime: null,
  transcript: '',
  fillerCounts: {},
  keyMoments: [],
  audioCapture: null,
  recognition: null,

  // Persisted data
  stories: [],
  milestones: [],
  settings: {
    resumeUploaded: false,
    jobUploaded: false
  },
  stats: {
    totalSessions: 0,
    totalMinutes: 0
  }
};

// ============================================
// DOM REFERENCES
// ============================================

const ui = {};

function initUI() {
  // Screens
  ui.screens = {
    welcome: document.getElementById('screen-welcome'),
    setup: document.getElementById('screen-setup'),
    question: document.getElementById('screen-question'),
    practice: document.getElementById('screen-practice'),
    captured: document.getElementById('screen-captured'),
    shelf: document.getElementById('screen-shelf'),
    progress: document.getElementById('screen-progress')
  };

  // Navigation
  ui.navBtns = document.querySelectorAll('.nav-btn');
  ui.storyCount = document.getElementById('story-count');

  // Welcome
  ui.btnStart = document.getElementById('btn-start');

  // Setup
  ui.btnUploadResume = document.getElementById('btn-upload-resume');
  ui.btnUploadJob = document.getElementById('btn-upload-job');
  ui.inputResume = document.getElementById('input-resume');
  ui.inputJob = document.getElementById('input-job');
  ui.btnContinueSetup = document.getElementById('btn-continue-setup');
  ui.btnSkipSetup = document.getElementById('btn-skip-setup');

  // Question
  ui.questionList = document.getElementById('question-list');
  ui.inputCustomQuestion = document.getElementById('input-custom-question');
  ui.btnUseCustom = document.getElementById('btn-use-custom');

  // Practice
  ui.currentQuestion = document.getElementById('current-question');
  ui.timeline = document.getElementById('timeline');
  ui.timelineProgress = document.getElementById('timeline-progress');
  ui.timelineCurrent = document.getElementById('timeline-current');
  ui.visualizer = document.getElementById('visualizer');
  ui.recordingStatus = document.getElementById('recording-status');
  ui.btnRecord = document.getElementById('btn-record');
  ui.btnStop = document.getElementById('btn-stop');
  ui.transcript = document.getElementById('transcript');
  ui.fillerCloud = document.getElementById('filler-cloud');
  ui.fillerWords = document.getElementById('filler-words');

  // Captured
  ui.capturedName = document.getElementById('captured-name');
  ui.capturedTags = document.getElementById('captured-tags');
  ui.capturedMoments = document.getElementById('captured-moments');
  ui.capturedReadiness = document.getElementById('captured-readiness');
  ui.capturedReadinessLabel = document.getElementById('captured-readiness-label');
  ui.prepInsightText = document.getElementById('prep-insight-text');
  ui.btnPracticeAgain = document.getElementById('btn-practice-again');
  ui.btnNewQuestion = document.getElementById('btn-new-question');
  ui.btnViewShelf = document.getElementById('btn-view-shelf');

  // Shelf
  ui.shelfSummary = document.getElementById('shelf-summary');
  ui.shelfGrid = document.getElementById('shelf-grid');
  ui.shelfEmpty = document.getElementById('shelf-empty');
  ui.filterBtns = document.querySelectorAll('.filter-btn');
  ui.btnFirstStory = document.getElementById('btn-first-story');
  ui.btnExportShelf = document.getElementById('btn-export-shelf');

  // Progress
  ui.journeySummary = document.getElementById('journey-summary');
  ui.statStories = document.getElementById('stat-stories');
  ui.statSessions = document.getElementById('stat-sessions');
  ui.statMinutes = document.getElementById('stat-minutes');
  ui.strengthsList = document.getElementById('strengths-list');
  ui.gapsList = document.getElementById('gaps-list');
  ui.milestonesList = document.getElementById('milestones-list');
}

// ============================================
// NAVIGATION
// ============================================

function goToScreen(screenId) {
  Object.values(ui.screens).forEach(screen => {
    screen.classList.remove('active');
  });

  const target = ui.screens[screenId];
  if (target) {
    target.classList.add('active');
    state.currentScreen = screenId;
    window.scrollTo(0, 0);
  }

  // Update nav button states
  ui.navBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === screenId);
  });
}

// ============================================
// STORAGE
// ============================================

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      state.stories = data.stories || [];
      state.milestones = data.milestones || [];
      state.settings = data.settings || state.settings;
      state.stats = data.stats || state.stats;
    }
  } catch (e) {
    console.warn('Failed to load state:', e);
  }
}

function saveState() {
  try {
    const data = {
      stories: state.stories,
      milestones: state.milestones,
      settings: state.settings,
      stats: state.stats,
      version: 1
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save state:', e);
  }
}

// ============================================
// QUESTION LIST
// ============================================

function renderQuestionList() {
  ui.questionList.innerHTML = '';

  SAMPLE_QUESTIONS.forEach((q, index) => {
    const btn = document.createElement('button');
    btn.className = 'question-item';
    btn.innerHTML = `
      <div class="question-item-type">${q.type}</div>
      <div>${q.text}</div>
    `;
    btn.addEventListener('click', () => selectQuestion(q));
    ui.questionList.appendChild(btn);
  });
}

function selectQuestion(question) {
  state.currentQuestion = question;
  ui.currentQuestion.textContent = question.text;
  goToScreen('practice');
  resetPracticeState();
}

// ============================================
// PRACTICE / RECORDING
// ============================================

function resetPracticeState() {
  state.transcript = '';
  state.fillerCounts = {};
  state.keyMoments = [];
  state.recordingStartTime = null;

  ui.transcript.innerHTML = '<p class="transcript-placeholder">Start speaking and your words will appear here...</p>';
  ui.timelineProgress.style.width = '0%';
  ui.timelineCurrent.textContent = '0:00';
  ui.fillerWords.innerHTML = '';

  // Clear timeline moments
  ui.timeline.querySelectorAll('.timeline-moment').forEach(el => el.remove());
}

async function startRecording() {
  try {
    // Initialize speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = 'en-US';

    state.recognition.onresult = handleSpeechResult;
    state.recognition.onerror = (e) => console.error('Speech error:', e);
    state.recognition.onend = () => {
      if (state.isRecording) {
        state.recognition.start(); // Restart if still recording
      }
    };

    state.recognition.start();
    state.isRecording = true;
    state.recordingStartTime = Date.now();

    // Update UI
    ui.btnRecord.hidden = true;
    ui.btnStop.hidden = false;
    ui.recordingStatus.classList.add('recording');
    ui.recordingStatus.querySelector('.status-text').textContent = 'Recording...';
    ui.visualizer.classList.add('active');
    ui.fillerCloud.classList.add('active');

    // Start timeline animation
    updateTimeline();

  } catch (error) {
    console.error('Failed to start recording:', error);
    alert('Could not access microphone. Please check permissions.');
  }
}

function stopRecording() {
  state.isRecording = false;

  if (state.recognition) {
    state.recognition.stop();
    state.recognition = null;
  }

  // Update UI
  ui.btnRecord.hidden = false;
  ui.btnStop.hidden = true;
  ui.recordingStatus.classList.remove('recording');
  ui.recordingStatus.querySelector('.status-text').textContent = 'Processing...';
  ui.visualizer.classList.remove('active');

  // Calculate stats
  const durationMs = Date.now() - state.recordingStartTime;
  const durationMinutes = durationMs / 60000;
  state.stats.totalSessions++;
  state.stats.totalMinutes += Math.round(durationMinutes);

  // Process and capture story
  processStory();
}

function handleSpeechResult(event) {
  let finalTranscript = '';
  let interimTranscript = '';

  for (let i = event.resultIndex; i < event.results.length; i++) {
    const transcript = event.results[i][0].transcript;
    if (event.results[i].isFinal) {
      finalTranscript += transcript;
      detectFillerWords(transcript);
      detectKeyMoments(transcript);
    } else {
      interimTranscript += transcript;
    }
  }

  if (finalTranscript) {
    state.transcript += finalTranscript + ' ';
  }

  // Update transcript display
  const displayText = state.transcript + '<span style="color: var(--color-ink-subtle)">' + interimTranscript + '</span>';
  ui.transcript.innerHTML = `<p>${displayText || '<span class="transcript-placeholder">Listening...</span>'}</p>`;

  // Auto-scroll transcript
  ui.transcript.scrollTop = ui.transcript.scrollHeight;
}

function detectFillerWords(text) {
  const lowerText = text.toLowerCase();

  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      state.fillerCounts[filler] = (state.fillerCounts[filler] || 0) + matches.length;
      updateFillerCloud();
    }
  });
}

function updateFillerCloud() {
  const sorted = Object.entries(state.fillerCounts).sort((a, b) => b[1] - a[1]);

  ui.fillerWords.innerHTML = sorted.map(([word, count]) => `
    <span class="filler-word ${count > 3 ? 'highlight' : ''}">
      ${word} <span class="filler-count">${count}</span>
    </span>
  `).join('');
}

function detectKeyMoments(text) {
  const lowerText = text.toLowerCase();
  const elapsed = (Date.now() - state.recordingStartTime) / 1000;

  // Detect story structure moments
  const patterns = [
    { pattern: /problem|challenge|issue|difficult/i, label: 'Problem', type: 'problem' },
    { pattern: /decided|chose|led|initiated/i, label: 'Decision', type: 'decision' },
    { pattern: /convinced|persuaded|proposed/i, label: 'Persuasion', type: 'persuasion' },
    { pattern: /result|outcome|achieved|improved|increased|reduced/i, label: 'Result', type: 'result' },
    { pattern: /learned|realized|grew|changed/i, label: 'Learning', type: 'learning' }
  ];

  patterns.forEach(({ pattern, label, type }) => {
    if (pattern.test(lowerText)) {
      // Avoid duplicates within 10 seconds
      const recent = state.keyMoments.find(m => m.type === type && elapsed - m.time < 10);
      if (!recent) {
        state.keyMoments.push({ type, label, time: elapsed, text: text.substring(0, 50) });
        addTimelineMoment(elapsed, label);
      }
    }
  });
}

function addTimelineMoment(seconds, label) {
  const maxDuration = 180; // 3 minutes max
  const percent = Math.min((seconds / maxDuration) * 100, 100);

  const moment = document.createElement('div');
  moment.className = 'timeline-moment';
  moment.style.left = `${percent}%`;
  moment.dataset.label = label;
  ui.timeline.appendChild(moment);
}

function updateTimeline() {
  if (!state.isRecording) return;

  const elapsed = (Date.now() - state.recordingStartTime) / 1000;
  const maxDuration = 180;
  const percent = Math.min((elapsed / maxDuration) * 100, 100);

  ui.timelineProgress.style.width = `${percent}%`;

  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);
  ui.timelineCurrent.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  requestAnimationFrame(updateTimeline);
}

// ============================================
// STORY PROCESSING
// ============================================

function processStory() {
  // Simulate Gemini processing (in real app, this calls the API)
  setTimeout(() => {
    const story = extractStory();
    state.stories.push(story);
    checkMilestones(story);
    saveState();
    showCapturedStory(story);
  }, 1500);
}

function extractStory() {
  // In production, Gemini would extract this
  // For demo, we use heuristics

  const totalFillers = Object.values(state.fillerCounts).reduce((a, b) => a + b, 0);
  const duration = (Date.now() - state.recordingStartTime) / 1000;
  const fillersPerMinute = totalFillers / (duration / 60);

  // Generate story name from transcript
  const name = generateStoryName(state.transcript);

  // Generate tags based on question type and content
  const tags = generateTags(state.transcript, state.currentQuestion);

  // Calculate readiness (inverse of filler rate + key moments)
  const readiness = Math.min(100, Math.max(20,
    100 - (fillersPerMinute * 10) + (state.keyMoments.length * 10)
  ));

  // Generate insight
  const insight = generateInsight(state.keyMoments, fillersPerMinute);

  return {
    id: `story_${Date.now()}`,
    name,
    tags,
    keyMoments: state.keyMoments,
    transcript: state.transcript,
    fillerCounts: { ...state.fillerCounts },
    fillersPerMinute,
    readiness: Math.round(readiness),
    practices: 1,
    insight,
    questionType: state.currentQuestion?.type || 'General',
    created: new Date().toISOString(),
    lastPracticed: new Date().toISOString()
  };
}

function generateStoryName(transcript) {
  // Look for key nouns/projects mentioned
  const patterns = [
    /(?:the|a|our)\s+(\w+\s+(?:project|migration|system|launch|initiative|team|product))/i,
    /(?:led|built|created|managed|designed)\s+(?:the\s+)?(\w+(?:\s+\w+)?)/i,
    /(\w+)\s+(?:migration|rollout|implementation|redesign)/i
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match) {
      return toTitleCase(match[1]);
    }
  }

  // Fallback to question type
  return state.currentQuestion?.type + ' Story' || 'My Story';
}

function generateTags(transcript, question) {
  const tags = [];
  const lower = transcript.toLowerCase();

  // Add question type tag
  if (question?.type) {
    tags.push(question.type.toLowerCase());
  }

  // Detect additional applicable tags
  const tagPatterns = [
    { pattern: /team|led|managed|coordinated/i, tag: 'leadership' },
    { pattern: /technical|code|system|architecture/i, tag: 'technical' },
    { pattern: /conflict|disagree|difficult conversation/i, tag: 'conflict resolution' },
    { pattern: /persuad|convinc|stakeholder|executive/i, tag: 'persuasion' },
    { pattern: /deadline|pressure|tight timeline/i, tag: 'under pressure' },
    { pattern: /fail|mistake|wrong|learned/i, tag: 'growth mindset' },
    { pattern: /customer|client|user/i, tag: 'customer focus' },
    { pattern: /data|metrics|measure|improve/i, tag: 'data-driven' }
  ];

  tagPatterns.forEach(({ pattern, tag }) => {
    if (pattern.test(lower) && !tags.includes(tag)) {
      tags.push(tag);
    }
  });

  return tags.slice(0, 5); // Max 5 tags
}

function generateInsight(keyMoments, fillersPerMinute) {
  const insights = [];

  // Insight based on key moments
  if (keyMoments.length === 0) {
    insights.push("Try to include a clear problem, action, and result in your story.");
  } else if (keyMoments.length >= 3) {
    insights.push("Great story structure! You hit the key moments.");
  }

  // Insight based on fillers
  if (fillersPerMinute > 5) {
    insights.push("Take a breath before transitioning between ideas - it'll reduce filler words naturally.");
  } else if (fillersPerMinute < 2) {
    insights.push("Smooth delivery! Your pacing is confident.");
  }

  // Insight based on moment types
  const hasPersuasion = keyMoments.some(m => m.type === 'persuasion');
  const hasResult = keyMoments.some(m => m.type === 'result');

  if (hasPersuasion) {
    insights.push("The persuasion moment is strong - consider leading with it.");
  }

  if (!hasResult) {
    insights.push("Try ending with a specific, quantified result.");
  }

  return insights[0] || "Keep practicing - you're building something valuable.";
}

function toTitleCase(str) {
  return str.replace(/\w\S*/g, txt =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
}

// ============================================
// CAPTURED STORY DISPLAY
// ============================================

function showCapturedStory(story) {
  ui.capturedName.textContent = story.name;

  // Tags
  ui.capturedTags.innerHTML = story.tags.map(tag =>
    `<span class="story-tag">${tag}</span>`
  ).join('');

  // Key moments
  ui.capturedMoments.innerHTML = story.keyMoments.slice(0, 4).map(m =>
    `<div class="story-moment">${m.label}: "${m.text}..."</div>`
  ).join('') || '<div class="story-moment">Practice more to capture key moments</div>';

  // Readiness animation
  ui.capturedReadiness.style.width = '0%';
  setTimeout(() => {
    ui.capturedReadiness.style.width = `${story.readiness}%`;
  }, 300);

  ui.capturedReadinessLabel.textContent =
    story.readiness >= 80 ? 'Interview-ready!' :
    story.readiness >= 50 ? 'Getting there' : 'Needs practice';

  // Prep's insight
  ui.prepInsightText.textContent = story.insight;

  goToScreen('captured');
}

// ============================================
// MILESTONES
// ============================================

function checkMilestones(newStory) {
  const earned = [];

  // First story
  if (state.stories.length === 1 && !hasMilestone('first_story')) {
    earned.push('first_story');
  }

  // Three stories
  if (state.stories.length === 3 && !hasMilestone('three_stories')) {
    earned.push('three_stories');
  }

  // Five stories
  if (state.stories.length === 5 && !hasMilestone('five_stories')) {
    earned.push('five_stories');
  }

  // First interview-ready
  if (newStory.readiness >= 80 && !hasMilestone('first_ready')) {
    earned.push('first_ready');
  }

  // Low fillers
  if (newStory.fillersPerMinute < 2 && !hasMilestone('low_fillers')) {
    earned.push('low_fillers');
  }

  // Add earned milestones
  earned.forEach(id => {
    state.milestones.push({
      id,
      ...MILESTONES[id],
      date: new Date().toISOString()
    });
  });
}

function hasMilestone(id) {
  return state.milestones.some(m => m.id === id);
}

// ============================================
// SHELF DISPLAY
// ============================================

function renderShelf(filter = 'all') {
  const filtered = state.stories.filter(story => {
    if (filter === 'all') return true;
    if (filter === 'ready') return story.readiness >= 80;
    if (filter === 'practicing') return story.readiness >= 40 && story.readiness < 80;
    if (filter === 'new') return story.readiness < 40;
    return true;
  });

  ui.shelfSummary.textContent = `You have ${state.stories.length} stor${state.stories.length === 1 ? 'y' : 'ies'}`;

  if (filtered.length === 0) {
    ui.shelfEmpty.hidden = false;
    ui.shelfGrid.innerHTML = '';
    ui.shelfGrid.appendChild(ui.shelfEmpty);
    return;
  }

  ui.shelfEmpty.hidden = true;

  ui.shelfGrid.innerHTML = filtered.map(story => {
    const status = story.readiness >= 80 ? 'ready' :
                   story.readiness >= 40 ? 'practicing' : 'new';
    const icon = status === 'ready' ? '📗' :
                 status === 'practicing' ? '📘' : '📙';

    return `
      <div class="shelf-story-card" data-status="${status}" data-id="${story.id}">
        <div class="story-card-header">
          <span class="story-card-icon">${icon}</span>
          <h3 class="story-card-name">${story.name}</h3>
        </div>
        <div class="story-card-tags">
          ${story.tags.slice(0, 3).map(t => `<span class="story-tag">${t}</span>`).join('')}
        </div>
        <div class="story-card-readiness">
          <div class="readiness-bar">
            <div class="readiness-fill" style="width: ${story.readiness}%"></div>
          </div>
          <span class="readiness-label">${story.practices} practice${story.practices > 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }).join('');

  // Update badge
  ui.storyCount.textContent = state.stories.length;
  ui.storyCount.hidden = state.stories.length === 0;
}

// ============================================
// PROGRESS DISPLAY
// ============================================

function renderProgress() {
  // Stats
  ui.statStories.textContent = state.stories.length;
  ui.statSessions.textContent = state.stats.totalSessions;
  ui.statMinutes.textContent = state.stats.totalMinutes;

  // Journey summary
  if (state.stories.length === 0) {
    ui.journeySummary.textContent = 'Start practicing to track your progress';
  } else {
    const readyCount = state.stories.filter(s => s.readiness >= 80).length;
    ui.journeySummary.textContent = `${readyCount} interview-ready stor${readyCount === 1 ? 'y' : 'ies'}`;
  }

  // Strengths (question types with high readiness)
  const byType = {};
  state.stories.forEach(story => {
    const type = story.questionType;
    if (!byType[type]) byType[type] = [];
    byType[type].push(story.readiness);
  });

  const strengths = Object.entries(byType)
    .map(([type, scores]) => ({
      type,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .filter(t => t.avg >= 60)
    .sort((a, b) => b.avg - a.avg);

  if (strengths.length > 0) {
    ui.strengthsList.innerHTML = strengths.map(s => `
      <div class="progress-item">
        <span class="progress-item-label">${s.type}</span>
        <span class="progress-item-value">+${Math.round(s.avg)}%</span>
      </div>
    `).join('');
  }

  // Gaps (question types with low readiness or not practiced)
  const gaps = Object.entries(byType)
    .map(([type, scores]) => ({
      type,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length
    }))
    .filter(t => t.avg < 50)
    .sort((a, b) => a.avg - b.avg);

  if (gaps.length > 0) {
    ui.gapsList.innerHTML = gaps.map(g => `
      <div class="progress-item">
        <span class="progress-item-label">${g.type}</span>
        <span class="progress-item-value negative">Needs reps</span>
      </div>
    `).join('');
  }

  // Milestones
  if (state.milestones.length > 0) {
    ui.milestonesList.innerHTML = state.milestones
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(m => `
        <div class="milestone-item">
          <span class="milestone-icon">${m.icon}</span>
          <div class="milestone-content">
            <div class="milestone-label">${m.label}</div>
            <div class="milestone-date">${new Date(m.date).toLocaleDateString()}</div>
          </div>
        </div>
      `).join('');
  }
}

// ============================================
// EXPORT
// ============================================

function exportShelf() {
  const data = {
    stories: state.stories,
    milestones: state.milestones,
    stats: state.stats,
    exportedAt: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preptalk-stories-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// EVENT LISTENERS
// ============================================

function initEventListeners() {
  // Navigation
  ui.navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const screen = btn.dataset.screen;
      if (screen === 'shelf') renderShelf();
      if (screen === 'progress') renderProgress();
      goToScreen(screen);
    });
  });

  // Welcome
  ui.btnStart.addEventListener('click', () => goToScreen('setup'));

  // Setup
  ui.btnUploadResume.addEventListener('click', () => ui.inputResume.click());
  ui.btnUploadJob.addEventListener('click', () => ui.inputJob.click());

  ui.inputResume.addEventListener('change', () => {
    if (ui.inputResume.files.length > 0) {
      document.getElementById('card-resume').classList.add('uploaded');
      ui.btnUploadResume.textContent = 'Uploaded ✓';
      state.settings.resumeUploaded = true;
    }
  });

  ui.inputJob.addEventListener('change', () => {
    if (ui.inputJob.files.length > 0) {
      document.getElementById('card-job').classList.add('uploaded');
      ui.btnUploadJob.textContent = 'Uploaded ✓';
      state.settings.jobUploaded = true;
    }
  });

  ui.btnContinueSetup.addEventListener('click', () => {
    renderQuestionList();
    goToScreen('question');
  });

  ui.btnSkipSetup.addEventListener('click', () => {
    renderQuestionList();
    goToScreen('question');
  });

  // Question
  ui.btnUseCustom.addEventListener('click', () => {
    const text = ui.inputCustomQuestion.value.trim();
    if (text) {
      selectQuestion({ type: 'Custom', text });
    }
  });

  // Practice
  ui.btnRecord.addEventListener('click', startRecording);
  ui.btnStop.addEventListener('click', stopRecording);

  // Captured
  ui.btnPracticeAgain.addEventListener('click', () => {
    goToScreen('practice');
    resetPracticeState();
  });

  ui.btnNewQuestion.addEventListener('click', () => {
    goToScreen('question');
  });

  ui.btnViewShelf.addEventListener('click', () => {
    renderShelf();
    goToScreen('shelf');
  });

  // Shelf
  ui.filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      ui.filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderShelf(btn.dataset.filter);
    });
  });

  ui.btnFirstStory?.addEventListener('click', () => {
    renderQuestionList();
    goToScreen('question');
  });

  ui.btnExportShelf.addEventListener('click', exportShelf);
}

// ============================================
// INITIALIZATION
// ============================================

function init() {
  initUI();
  loadState();
  initEventListeners();

  // Update story count badge
  ui.storyCount.textContent = state.stories.length;
  ui.storyCount.hidden = state.stories.length === 0;

  console.log('PrepTalk Story Shelf initialized');
}

document.addEventListener('DOMContentLoaded', init);
