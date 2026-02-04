// ============================================
// STORY SHELF
// ============================================

const STORIES_KEY = 'preptalk_stories';
const FILLER_WORDS = ['um', 'uh', 'like', 'you know', 'so', 'basically', 'actually', 'right', 'i mean'];

/**
 * Get demo stories from APP_CONFIG or use fallback data.
 * These represent a realistic mix of story types and readiness levels.
 */
function getDemoStories() {
  // Load from APP_CONFIG if available
  if (window.APP_CONFIG && window.APP_CONFIG.data && window.APP_CONFIG.data.stories && window.APP_CONFIG.data.stories.stories) {
    return window.APP_CONFIG.data.stories.stories;
  }

  // Fallback demo stories
  return [
    {
      id: 'demo_1',
      name: 'Payment Integration Launch',
      tags: ['leadership', 'technical', 'results-driven'],
      readiness: 92,
      fillersPerMinute: 1.2,
      fillerCounts: { um: 1, like: 1 },
      insight: 'Strong story with clear metrics. Interview-ready.',
      questionType: 'Leadership',
      created: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      practices: 4
    },
    {
      id: 'demo_2',
      name: 'Cross-Team Conflict Resolution',
      tags: ['conflict', 'collaboration', 'leadership'],
      readiness: 78,
      fillersPerMinute: 2.4,
      fillerCounts: { um: 2, you_know: 1 },
      insight: 'Good structure. Practice the resolution section once more.',
      questionType: 'Conflict',
      created: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      practices: 3
    },
    {
      id: 'demo_3',
      name: 'Database Migration Project',
      tags: ['technical', 'problem-solving', 'results-driven'],
      readiness: 85,
      fillersPerMinute: 1.8,
      fillerCounts: { so: 2, basically: 1 },
      insight: 'Technical details are crisp. Consider adding team dynamics.',
      questionType: 'Technical',
      created: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      practices: 3
    },
    {
      id: 'demo_4',
      name: 'Mentoring Junior Developer',
      tags: ['leadership', 'mentorship', 'growth'],
      readiness: 65,
      fillersPerMinute: 3.1,
      fillerCounts: { like: 3, um: 2 },
      insight: 'Great story choice. Practice the outcome section.',
      questionType: 'Leadership',
      created: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      practices: 2
    },
    {
      id: 'demo_5',
      name: 'Stakeholder Pushback on Timeline',
      tags: ['conflict', 'communication', 'negotiation'],
      readiness: 71,
      fillersPerMinute: 2.8,
      fillerCounts: { um: 2, right: 2 },
      insight: 'Strong opening. The compromise section needs polish.',
      questionType: 'Conflict',
      created: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      practices: 2
    },
    {
      id: 'demo_6',
      name: 'Product Launch Under Pressure',
      tags: ['leadership', 'pressure', 'results-driven'],
      readiness: 45,
      fillersPerMinute: 4.5,
      fillerCounts: { um: 4, like: 3, so: 2 },
      insight: 'Compelling story. Try slowing down during the crisis section.',
      questionType: 'Leadership',
      created: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      practices: 1
    },
    {
      id: 'demo_7',
      name: 'API Redesign Initiative',
      tags: ['technical', 'innovation', 'collaboration'],
      readiness: 38,
      fillersPerMinute: 5.2,
      fillerCounts: { um: 5, basically: 3, you_know: 2 },
      insight: 'Just captured. Practice a few more times to build confidence.',
      questionType: 'Technical',
      created: new Date().toISOString(),
      practices: 1
    }
  ];
}

/**
 * Initialize demo stories if the shelf is empty.
 * Called on page load to seed realistic demonstration data.
 */
function initDemoStories() {
  const data = getStories();
  if (data.stories.length === 0) {
    const demoStories = getDemoStories();
    data.stories = [...demoStories];
    data.stats.sessions = demoStories.length;
    saveStories(data);
  }
}

/**
 * Calculate readiness score based on filler words per minute.
 * Uses business rules from APP_CONFIG.
 *
 * @param {number} fillersPerMinute - Number of filler words per minute
 * @returns {number} Readiness score (0-100)
 */
function calculateReadiness(fillersPerMinute) {
  // Load calculation config with fallback
  const config = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.calculation) || {
    filler_penalty_multiplier: 15,
    min_score: 20,
    max_score: 100,
    base_bonus: 20
  };

  const { filler_penalty_multiplier, min_score, max_score, base_bonus } = config;

  return Math.min(max_score, Math.max(min_score, 100 - (fillersPerMinute * filler_penalty_multiplier) + base_bonus));
}

/**
 * Get story status based on readiness score.
 * Uses thresholds from APP_CONFIG.
 *
 * @param {number} readiness - Readiness score (0-100)
 * @returns {string} Status ('ready', 'practicing', or 'new')
 */
function getStoryStatus(readiness) {
  // Load thresholds with fallback
  const thresholds = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.thresholds) || {
    ready: 80,
    practicing: 40
  };

  if (readiness >= thresholds.ready) return 'ready';
  if (readiness >= thresholds.practicing) return 'practicing';
  return 'new';
}

/**
 * Get stories from localStorage
 */
function getStories() {
  try {
    const stored = localStorage.getItem(STORIES_KEY);
    return stored ? JSON.parse(stored) : { stories: [], stats: { sessions: 0 } };
  } catch (e) {
    return { stories: [], stats: { sessions: 0 } };
  }
}

/**
 * Save stories to localStorage
 */
function saveStories(data) {
  localStorage.setItem(STORIES_KEY, JSON.stringify(data));
}

// Current tag filter state
let currentTagFilter = 'all';

/**
 * Get tag colors from APP_CONFIG or use fallback values.
 */
function getTagColors() {
  // Load from APP_CONFIG if available
  if (window.APP_CONFIG && window.APP_CONFIG.tokens && window.APP_CONFIG.tokens.colors && window.APP_CONFIG.tokens.colors.tags) {
    const configTags = window.APP_CONFIG.tokens.colors.tags;
    // If config has values, use them
    if (Object.keys(configTags).length > 0) {
      return configTags;
    }
  }

  // Fallback tag colors
  return {
    'leadership': '#2D8A5A',
    'technical': '#4A7A9A',
    'conflict': '#9A4A4A',
    'collaboration': '#7A5A9A',
    'results-driven': '#5A8A7A',
    'problem-solving': '#8A7A4A',
    'mentorship': '#4A9A8A',
    'communication': '#9A6A4A',
    'innovation': '#6A4A9A',
    'growth': '#4A8A6A',
    'negotiation': '#8A4A6A',
    'pressure': '#6A8A4A'
  };
}

/**
 * Render the story shelf
 */
function renderStoryShelf() {
  const data = getStories();
  const shelf = document.getElementById('stories-shelf');
  const empty = document.getElementById('stories-empty');
  const stats = document.getElementById('stories-stats');
  const actions = document.getElementById('stories-actions');
  const fillerCard = document.getElementById('filler-trend-card');

  if (!shelf) return;

  if (data.stories.length === 0) {
    empty.style.display = 'block';
    stats.style.display = 'none';
    actions.style.display = 'none';
    fillerCard.style.display = 'none';
    // Hide sidebar rings and tag filter when empty
    const sidebarRings = document.getElementById('sidebar-rings-section');
    const tagFilterSection = document.getElementById('tag-filter-section');
    if (sidebarRings) sidebarRings.style.display = 'none';
    if (tagFilterSection) tagFilterSection.style.display = 'none';
    shelf.innerHTML = '';
    shelf.appendChild(empty);
    return;
  }

  empty.style.display = 'none';
  stats.style.display = 'flex';
  actions.style.display = 'block';

  // Show tag filter section
  const tagFilterSection = document.getElementById('tag-filter-section');
  if (tagFilterSection) {
    tagFilterSection.style.display = 'flex';
    renderTagFilter(data.stories);
  }

  // Show and update sidebar rings section
  const sidebarRings = document.getElementById('sidebar-rings-section');
  if (sidebarRings) {
    sidebarRings.style.display = 'block';
    renderProgressRings(data.stories);
  }

  // Filter stories by current tag
  const filteredStories = currentTagFilter === 'all'
    ? data.stories
    : data.stories.filter(s => s.tags.includes(currentTagFilter));

  // Update stats
  const thresholds = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.thresholds) || { ready: 80 };
  const readyCount = data.stories.filter(s => s.readiness >= thresholds.ready).length;
  document.getElementById('stat-story-count').textContent = data.stories.length;
  document.getElementById('stat-ready-count').textContent = readyCount;
  document.getElementById('stat-practice-count').textContent = data.stats.sessions || 0;

  // Render story cards (clickable to practice)
  shelf.innerHTML = filteredStories.map(story => {
    const status = getStoryStatus(story.readiness);
    const icon = status === 'ready' ? '📗' : status === 'practicing' ? '📘' : '📙';
    const label = status === 'ready' ? 'Interview-ready' : status === 'practicing' ? 'Practicing' : 'Needs work';
    const practiceText = story.practices === 1 ? 'Practiced once' : `Practiced ${story.practices} times`;

    return `
      <div class="story-card" data-status="${status}" data-id="${story.id}"
           data-tags="${story.tags.join(',')}"
           onclick="openStoryPractice('${story.id}')" role="button" tabindex="0"
           onkeypress="if(event.key==='Enter')openStoryPractice('${story.id}')">
        <div class="story-card-header">
          <span class="story-card-icon">${icon}</span>
          <span class="story-card-name">${story.name}</span>
        </div>
        <div class="story-card-tags">
          ${story.tags.slice(0, 3).map(t => `<span class="story-tag" onclick="event.stopPropagation(); filterByTag('${t}')">${t}</span>`).join('')}
        </div>
        <div class="story-card-readiness">
          <div class="readiness-bar">
            <div class="readiness-fill" style="width: ${story.readiness}%"></div>
          </div>
          <span class="readiness-label">${label}</span>
        </div>
        <div class="story-card-meta">
          <span class="story-card-practices">${practiceText}</span>
          <span class="story-card-action">Click to practice →</span>
        </div>
      </div>
    `;
  }).join('');

  // Show message if filter returns no results
  if (filteredStories.length === 0 && currentTagFilter !== 'all') {
    shelf.innerHTML = `
      <div class="stories-empty stories-empty--filter">
        <p>No stories with tag "${currentTagFilter}"</p>
        <button class="btn btn-outline btn-sm" onclick="filterByTag('all')">Show all stories</button>
      </div>
    `;
  }

  // Update filler trend if we have data
  if (data.stories.length >= 2) {
    fillerCard.style.display = 'block';
    renderFillerTrend(data.stories);
  }

  // Update nav badge
  const navStories = document.getElementById('nav-stories');
  if (navStories && data.stories.length > 0) {
    navStories.innerHTML = `My Stories <span class="nav-badge">${data.stories.length}</span>`;
  }
}

/**
 * Render the Apple-style progress rings (sidebar version)
 */
function renderProgressRings(stories) {
  const totalCount = stories.length;
  const thresholds = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.readiness && window.APP_CONFIG.business.readiness.thresholds) || { ready: 80 };
  const readyCount = stories.filter(s => s.readiness >= thresholds.ready).length;

  // Calculate filtered count if a tag is selected
  const filteredStories = currentTagFilter === 'all'
    ? stories
    : stories.filter(s => s.tags.includes(currentTagFilter));
  const filteredCount = filteredStories.length;

  // Update center display based on filter
  const mainValue = document.getElementById('rings-main-value');
  const mainLabel = document.getElementById('rings-main-label');

  if (mainValue && mainLabel) {
    if (currentTagFilter === 'all') {
      mainValue.textContent = totalCount;
      mainLabel.textContent = totalCount === 1 ? 'Story' : 'Stories';
    } else {
      mainValue.textContent = filteredCount;
      mainLabel.textContent = currentTagFilter;
    }
  }

  // Calculate ring progress (max stories = full ring for demo)
  const maxStories = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.limits && window.APP_CONFIG.business.limits.max_stories_for_full_ring) || 10;
  const totalProgress = Math.min(1, totalCount / maxStories);
  const readyProgress = totalCount > 0 ? readyCount / totalCount : 0;
  const filterProgress = totalCount > 0 ? filteredCount / totalCount : 0;

  // Animate rings (using sidebar radii: 70, 52, 34)
  animateRing('ring-total', totalProgress, 70);
  animateRing('ring-ready', readyProgress, 52);
  animateRing('ring-filter', filterProgress, 34);

  // Update legend
  const legendTotal = document.getElementById('legend-total');
  const legendReady = document.getElementById('legend-ready');
  if (legendTotal) legendTotal.textContent = totalCount;
  if (legendReady) legendReady.textContent = readyCount;

  // Show/hide filter legend
  const filterRow = document.getElementById('legend-filter-row');
  if (filterRow) {
    if (currentTagFilter !== 'all') {
      filterRow.style.display = 'flex';
      const filterText = document.getElementById('legend-filter-text');
      const filterValue = document.getElementById('legend-filter');
      if (filterText) filterText.textContent = currentTagFilter;
      if (filterValue) filterValue.textContent = filteredCount;

      // Update inner ring color based on tag
      const innerRing = document.getElementById('ring-filter');
      const tagColors = getTagColors();
      if (innerRing) innerRing.style.stroke = tagColors[currentTagFilter] || '#7A5A9A';
    } else {
      filterRow.style.display = 'none';
    }
  }

  // Update ring tooltips with current values
  updateRingTooltips(totalCount, readyCount, filteredCount);
}

/**
 * Update ring hover tooltip content
 */
function updateRingTooltips(total, ready, filtered) {
  const outerRing = document.getElementById('ring-total');
  const middleRing = document.getElementById('ring-ready');
  const innerRing = document.getElementById('ring-filter');

  if (outerRing) {
    outerRing.setAttribute('onmouseenter', `showStoriesRingTooltip('Total: ${total} stories collected')`);
  }
  if (middleRing) {
    middleRing.setAttribute('onmouseenter', `showStoriesRingTooltip('Interview-ready: ${ready} of ${total}')`);
  }
  if (innerRing && currentTagFilter !== 'all') {
    innerRing.setAttribute('onmouseenter', `showStoriesRingTooltip('${currentTagFilter}: ${filtered} stories')`);
  }
}

/**
 * Show tooltip for stories rings (separate from progress page)
 */
function showStoriesRingTooltip(text) {
  const tooltip = document.getElementById('stories-ring-tooltip');
  if (tooltip) {
    tooltip.textContent = text;
    tooltip.classList.add('visible');
  }
}

/**
 * Hide stories ring tooltip
 */
function hideStoriesRingTooltip() {
  const tooltip = document.getElementById('stories-ring-tooltip');
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}

/**
 * Animate a progress ring to a target value
 */
function animateRing(ringId, progress, radius) {
  const ring = document.getElementById(ringId);
  if (!ring) return;

  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);

  ring.style.strokeDasharray = circumference;
  ring.style.strokeDashoffset = offset;
}

/**
 * Render the tag filter chips
 */
function renderTagFilter(stories) {
  const chips = document.getElementById('tag-filter-chips');
  if (!chips) return;

  // Collect all unique tags with counts
  const tagCounts = {};
  stories.forEach(story => {
    story.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  // Sort by count (most common first)
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6); // Limit to 6 tags

  const tagColors = getTagColors();
  chips.innerHTML = `
    <button class="tag-chip ${currentTagFilter === 'all' ? 'tag-chip--active' : ''}"
            data-tag="all" onclick="filterByTag('all')">All</button>
    ${sortedTags.map(([tag, count]) => `
      <button class="tag-chip ${currentTagFilter === tag ? 'tag-chip--active' : ''}"
              data-tag="${tag}" onclick="filterByTag('${tag}')"
              style="${currentTagFilter === tag ? `background: ${tagColors[tag] || '#7A5A9A'}; color: white;` : ''}">
        ${tag} <span class="tag-count">${count}</span>
      </button>
    `).join('')}
  `;
}

/**
 * Filter stories by tag
 */
function filterByTag(tag) {
  currentTagFilter = tag;
  renderStoryShelf();
}

/**
 * Render the filler word trend mini-chart
 */
function renderFillerTrend(stories) {
  const chart = document.getElementById('filler-trend-chart');
  const insight = document.getElementById('filler-trend-insight');
  if (!chart) return;

  // Get last 8 sessions
  const recent = stories.slice(-8);
  const rates = recent.map(s => s.fillersPerMinute || 0);
  const maxRate = Math.max(...rates, 1);

  chart.innerHTML = rates.map(rate => {
    const height = Math.max(4, (rate / maxRate) * 40);
    return `<div class="filler-bar" style="height: ${height}px"></div>`;
  }).join('');

  // Generate insight
  if (rates.length >= 2) {
    const first = rates[0];
    const last = rates[rates.length - 1];
    if (last < first * 0.7) {
      insight.textContent = `You're using ${Math.round((1 - last/first) * 100)}% fewer filler words. Great progress!`;
      document.getElementById('tip-filler-words').style.display = 'block';
      document.getElementById('tip-filler-text').textContent = insight.textContent;
    } else if (last > first * 1.3) {
      insight.textContent = 'Filler words increased recently. Try pausing between thoughts.';
    } else {
      insight.textContent = 'Filler words staying consistent. Keep practicing!';
    }
  }
}

/**
 * Capture a story from practice session
 * Called when user completes a practice
 */
function captureStory(transcript, questionType, duration) {
  const data = getStories();

  // Count filler words
  const fillerCounts = {};
  let totalFillers = 0;
  const lowerTranscript = transcript.toLowerCase();

  FILLER_WORDS.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'gi');
    const matches = lowerTranscript.match(regex);
    if (matches) {
      fillerCounts[filler] = matches.length;
      totalFillers += matches.length;
    }
  });

  const durationMinutes = duration / 60;
  const fillersPerMinute = durationMinutes > 0 ? totalFillers / durationMinutes : 0;

  // Extract story name (simplified version)
  let name = questionType + ' Story';
  const projectMatch = transcript.match(/(?:the|a|our)\s+(\w+\s+(?:project|migration|system|launch|team))/i);
  if (projectMatch) {
    name = projectMatch[1].replace(/^\w/, c => c.toUpperCase());
  }

  // Generate tags
  const tags = [questionType.toLowerCase()];
  if (/team|led|managed/i.test(transcript)) tags.push('leadership');
  if (/technical|code|system/i.test(transcript)) tags.push('technical');
  if (/conflict|disagree/i.test(transcript)) tags.push('conflict');
  if (/result|outcome|improved|increased/i.test(transcript)) tags.push('results-driven');

  // Calculate readiness using config values
  const readiness = calculateReadiness(fillersPerMinute);

  // Generate insight
  let insight = 'Keep practicing to polish this story.';
  if (fillersPerMinute < 2) {
    insight = 'Smooth delivery! This story is getting interview-ready.';
  } else if (fillersPerMinute > 5) {
    insight = 'Try taking a breath between thoughts to reduce filler words.';
  }

  const story = {
    id: 'story_' + Date.now(),
    name,
    tags: [...new Set(tags)].slice(0, 4),
    readiness: Math.round(readiness),
    fillersPerMinute: Math.round(fillersPerMinute * 10) / 10,
    fillerCounts,
    insight,
    questionType,
    created: new Date().toISOString(),
    practices: 1
  };

  data.stories.push(story);
  data.stats.sessions = (data.stats.sessions || 0) + 1;
  saveStories(data);

  // Show capture notification
  showStoryCaptureCard(story);

  return story;
}

/**
 * Show the story capture notification card
 */
function showStoryCaptureCard(story) {
  const card = document.getElementById('story-capture-card');
  if (!card) return;

  document.getElementById('captured-story-name').textContent = story.name;
  document.getElementById('captured-story-tags').innerHTML =
    story.tags.map(t => `<span class="story-tag">${t}</span>`).join('');
  document.getElementById('captured-story-insight').textContent = story.insight;

  card.style.display = 'block';

  // Auto-hide after configured delay
  const autoHideMs = (window.APP_CONFIG && window.APP_CONFIG.business && window.APP_CONFIG.business.timings && window.APP_CONFIG.business.timings.story_capture_autohide_ms) || 8000;
  setTimeout(() => {
    card.style.display = 'none';
  }, autoHideMs);
}

/**
 * Hide the story capture card
 */
function hideStoryCaptureCard() {
  const card = document.getElementById('story-capture-card');
  if (card) card.style.display = 'none';
}

/**
 * Export stories as JSON
 */
function exportStories() {
  const data = getStories();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `preptalk-stories-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

