/**
 * PrepTalk Prototype C - Confident Pro
 *
 * Production-quality JavaScript for the UI prototype.
 * Handles session persistence, navigation, file uploads, and UI interactions.
 *
 * @module prototype-c
 */

// ============================================
// CONSTANTS
// ============================================

/** LocalStorage key for session data */
const STORAGE_KEY = 'preptalk_session';

/** Default session state structure */
const DEFAULT_STATE = {
  currentScreen: 'screen-welcome',
  resumeUploaded: false,
  resumeFileName: null,
  jobUploaded: false,
  jobFileName: null,
  topicsCompleted: [],
  questionsAnswered: 0,
  totalTime: 0,
  insights: {
    continueDoing: [],
    doMoreOf: [],
    startDoing: [],
    doLessOf: [],
    stopDoing: []
  },
  lastUpdated: null
};

// ============================================
// SESSION STATE MANAGEMENT
// ============================================

/**
 * Retrieves the current session state from localStorage.
 * Returns default state if no session exists or parsing fails.
 *
 * @returns {Object} Current session state
 */
function getState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { ...DEFAULT_STATE };
  } catch (error) {
    console.warn('PrepTalk: Failed to parse session state, using defaults', error);
    return { ...DEFAULT_STATE };
  }
}

/**
 * Saves updates to the session state.
 * Merges updates with current state and updates timestamp.
 *
 * @param {Object} updates - Partial state updates to merge
 */
function saveState(updates) {
  const current = getState();
  const newState = {
    ...current,
    ...updates,
    lastUpdated: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
}

/**
 * Clears all session data from localStorage.
 */
function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Navigates to a screen by ID.
 * Hides all screens, shows the target, scrolls to top, and saves state.
 *
 * @param {string} screenId - The ID of the screen element to show
 */
function goToScreen(screenId) {
  const targetScreen = document.getElementById(screenId);

  if (!targetScreen) {
    console.warn(`PrepTalk: Screen "${screenId}" not found`);
    return;
  }

  // Hide all screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });

  // Show target screen
  targetScreen.classList.add('active');

  // Scroll to top for clean transition
  window.scrollTo(0, 0);

  // Persist navigation state
  saveState({ currentScreen: screenId });
}

// ============================================
// FILE UPLOADS
// ============================================

/**
 * Handles resume file upload.
 * Updates dropzone UI and saves upload state.
 *
 * @param {HTMLInputElement} input - The file input element
 */
function handleResumeUpload(input) {
  if (input.files.length === 0) return;

  const file = input.files[0];
  const dropzone = document.getElementById('dropzone-resume');

  if (!dropzone) return;

  // Update UI
  dropzone.classList.add('has-file');

  const textEl = dropzone.querySelector('.dropzone-text');
  const hintEl = dropzone.querySelector('.dropzone-hint');

  if (textEl) textEl.textContent = file.name;
  if (hintEl) hintEl.textContent = 'File uploaded ✓';

  // Save state
  saveState({
    resumeUploaded: true,
    resumeFileName: file.name
  });
}

/**
 * Handles job description file upload.
 * Updates dropzone UI and saves upload state.
 *
 * @param {HTMLInputElement} input - The file input element
 */
function handleJobUpload(input) {
  if (input.files.length === 0) return;

  const file = input.files[0];
  const dropzone = document.getElementById('dropzone-job');

  if (!dropzone) return;

  // Update UI
  dropzone.classList.add('has-file');

  const textEl = dropzone.querySelector('.dropzone-text');
  const hintEl = dropzone.querySelector('.dropzone-hint');

  if (textEl) textEl.textContent = file.name;
  if (hintEl) hintEl.textContent = 'File uploaded ✓';

  // Save state
  saveState({
    jobUploaded: true,
    jobFileName: file.name
  });
}

// ============================================
// STATE RESTORATION
// ============================================

/**
 * Restores UI state from saved session.
 * Called on page load to resume previous session.
 */
function restoreState() {
  const state = getState();

  if (!state.lastUpdated) return;

  // Resume from last screen if it exists
  if (state.currentScreen) {
    const screen = document.getElementById(state.currentScreen);
    if (screen) {
      goToScreen(state.currentScreen);
    }
  }

  // Restore resume dropzone
  if (state.resumeUploaded) {
    const resumeDropzone = document.getElementById('dropzone-resume');
    if (resumeDropzone) {
      resumeDropzone.classList.add('has-file');
      const textEl = resumeDropzone.querySelector('.dropzone-text');
      const hintEl = resumeDropzone.querySelector('.dropzone-hint');
      if (textEl) textEl.textContent = state.resumeFileName || 'Resume uploaded';
      if (hintEl) hintEl.textContent = 'File ready ✓';
    }
  }

  // Restore job dropzone
  if (state.jobUploaded) {
    const jobDropzone = document.getElementById('dropzone-job');
    if (jobDropzone) {
      jobDropzone.classList.add('has-file');
      const textEl = jobDropzone.querySelector('.dropzone-text');
      const hintEl = jobDropzone.querySelector('.dropzone-hint');
      if (textEl) textEl.textContent = state.jobFileName || 'Job description uploaded';
      if (hintEl) hintEl.textContent = 'File ready ✓';
    }
  }
}

// ============================================
// PROGRESS RING TOOLTIPS
// ============================================

/**
 * Shows a tooltip for progress ring on hover.
 *
 * @param {string} text - Tooltip text to display
 */
function showRingTooltip(text) {
  const tooltip = document.getElementById('ring-tooltip');
  if (tooltip) {
    tooltip.textContent = text;
    tooltip.classList.add('visible');
  }
}

/**
 * Hides the progress ring tooltip.
 */
function hideRingTooltip() {
  const tooltip = document.getElementById('ring-tooltip');
  if (tooltip) {
    tooltip.classList.remove('visible');
  }
}

// ============================================
// PDF EXPORT
// ============================================

/**
 * Exports the session insights as a PDF report.
 * Template-based approach with proper page handling.
 */
function exportPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // === DESIGN TOKENS ===
  // Load colors from APP_CONFIG with fallback defaults
  const colors = (window.APP_CONFIG && window.APP_CONFIG.pdf && window.APP_CONFIG.pdf.colors) || {
    primary_rgb: [45, 90, 71],
    secondary_rgb: [74, 106, 138],
    dark_rgb: [30, 30, 30],
    gray_rgb: [120, 120, 120],
    light_rgb: [248, 248, 246],
    white_rgb: [255, 255, 255],
    border_rgb: [220, 220, 220]
  };

  // Maintain backward compatibility with old color names
  colors.green = colors.primary_rgb;
  colors.blue = colors.secondary_rgb;
  colors.dark = colors.dark_rgb;
  colors.gray = colors.gray_rgb;
  colors.light = colors.light_rgb;
  colors.white = colors.white_rgb;
  colors.border = colors.border_rgb;

  const layout = {
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    margin: 20,
    get contentWidth() { return this.pageWidth - (this.margin * 2); },
    lineHeight: 5,
    sectionGap: 12,
    itemGap: 5
  };

  let y = 0;
  let pageNum = 1;

  // === TEMPLATE FUNCTIONS ===

  function checkPageBreak(needed) {
    const footerSpace = 14;
    if (y + needed > layout.pageHeight - footerSpace) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = layout.margin;
      addPageHeader();
    }
  }

  function addPageHeader() {
    if (pageNum > 1) {
      doc.setDrawColor(...(colors.primary_rgb || colors.green || [45, 90, 71]));
      doc.setLineWidth(1.5);
      doc.circle(layout.margin + 6, y + 6, 5, 'S');
      doc.setTextColor(...(colors.primary_rgb || colors.green || [45, 90, 71]));
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PrepTalk', layout.margin + 16, y + 8);
      doc.setTextColor(...(colors.gray_rgb || colors.gray || [120, 120, 120]));
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Continued', layout.margin + 50, y + 8);
      y += 20;
    }
  }

  function addSection(title, subtitle, items, color) {
    const sectionHeight = 15 + (items.length * 14);
    checkPageBreak(sectionHeight);

    // Title
    doc.setTextColor(...color);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, layout.margin, y);
    y += 5;

    // Subtitle
    doc.setTextColor(...(colors.gray_rgb || colors.gray || [120, 120, 120]));
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(subtitle, layout.margin, y);
    y += 8;

    // Items
    doc.setTextColor(...(colors.dark_rgb || colors.dark || [30, 30, 30]));
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
      const lines = doc.splitTextToSize('• ' + item, layout.contentWidth - 10);
      lines.forEach(line => {
        doc.text(line, layout.margin + 4, y);
        y += layout.itemGap;
      });
      y += 1;
    });

    y += layout.sectionGap;
  }

  function addFooter() {
    const footerY = layout.pageHeight - 10;

    // Compact footer - one size up
    doc.setDrawColor(...colors.green);
    doc.setLineWidth(0.7);
    doc.circle(layout.margin + 3, footerY, 2, 'S');

    doc.setTextColor(...colors.gray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('You already have the stories. Now go tell them. — Prep', layout.margin + 8, footerY + 0.5);

    // Page number
    doc.setFont('helvetica', 'normal');
    const pageText = 'Page ' + pageNum;
    doc.text(pageText, layout.pageWidth - layout.margin - doc.getTextWidth(pageText), footerY + 0.5);
  }

  // === CONTENT DATA ===
  // Load sections from APP_CONFIG with fallback
  const sections = ((window.APP_CONFIG && window.APP_CONFIG.pdf && window.APP_CONFIG.pdf.sections) || [
    {
      title: 'Continue',
      subtitle: 'These are working beautifully. Keep doing exactly this.',
      color_key: 'secondary_rgb',
      items: [
        'Your stories flow naturally and are easy to follow. Interviewers can track your thinking without getting lost.',
        'Using specific numbers like "23% improvement" sticks in memory far longer than saying "significant impact."',
        'Your pace is steady and grounded. That calm energy builds trust and makes you sound confident.'
      ]
    },
    {
      title: 'Lean Into',
      subtitle: "You're already doing this well. A bit more would make it shine.",
      color_key: 'primary_rgb',
      items: [
        'The payment integration story is your strongest. Use it for leadership, technical, and collaboration questions.',
        'Naming specific tools like Kubernetes and Terraform sounds more credible than "various technologies."',
        'Quantified outcomes are what interviewers remember when comparing candidates at the end of the day.'
      ]
    },
    {
      title: 'Add',
      subtitle: 'New elements that could elevate your answers.',
      color_key: 'secondary_rgb',
      items: [
        'A "lesson learned" ending shows self-awareness and growth mindset. Interviewers love candidates who reflect.',
        "Mentioning what you'd do differently demonstrates maturity and continuous improvement. It's disarming and authentic.",
        "Connecting your past to this role shows you've done your homework and can see yourself in their future."
      ]
    },
    {
      title: 'Refine',
      subtitle: 'Small adjustments that could tighten your stories.',
      color_key: 'gray_rgb',
      items: [
        'Your action moments are the most compelling part. Getting there faster gives you more time for the good stuff.'
      ]
    }
  ]).map(section => ({
    ...section,
    color: colors[section.color_key] || colors.primary_rgb || [45, 90, 71]
  }));

  // === RENDER PAGE 1 HEADER ===
  doc.setFillColor(...colors.green);
  doc.rect(0, 0, layout.pageWidth, 38, 'F');

  // Logo
  doc.setDrawColor(...colors.white);
  doc.setLineWidth(2.5);
  doc.circle(layout.margin + 10, 19, 8, 'S');

  // Title
  doc.setTextColor(...colors.white);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('PrepTalk', layout.margin + 24, 22);

  // Date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  doc.text(date, layout.pageWidth - layout.margin - doc.getTextWidth(date), 22);

  // Tagline
  doc.setFontSize(9);
  doc.text('Interview Practice Report', layout.margin, 34);

  // === NOTE FROM PREP ===
  y = 48;
  doc.setFillColor(...colors.light);
  doc.roundedRect(layout.margin, y, layout.contentWidth, 18, 2, 2, 'F');

  doc.setTextColor(...colors.green);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('A note from Prep:', layout.margin + 6, y + 8);

  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'normal');
  doc.text("You did the hard part. You showed up. Here's what I noticed about your stories.", layout.margin + 6, y + 14);

  // === SESSION STATS ===
  y = 74;
  doc.setTextColor(...colors.dark);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Session Summary', layout.margin, y);
  y += 6;
  doc.setTextColor(...colors.gray);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Topics: 2 of 3   |   Questions: 5 of 6   |   Time: 18 min', layout.margin, y);

  // Divider
  y += 10;
  doc.setDrawColor(...colors.border);
  doc.line(layout.margin, y, layout.pageWidth - layout.margin, y);
  y += 12;

  // === RENDER SECTIONS ===
  sections.forEach(section => {
    addSection(section.title, section.subtitle, section.items, section.color);
  });

  // === FINAL FOOTER ===
  addFooter();

  // Save the PDF with configured filename pattern
  const filenamePattern = (window.APP_CONFIG && window.APP_CONFIG.pdf && window.APP_CONFIG.pdf.filename_pattern)
    || 'PrepTalk_Report_{date}.pdf';
  const filename = filenamePattern.replace('{date}', new Date().toISOString().split('T')[0]);
  doc.save(filename);
}

// ============================================
// END SESSION
// ============================================

/**
 * Shows the End Session screen with data preview.
 * Displays what data is stored locally.
 */
function showEndSession() {
  const preview = document.getElementById('data-preview');
  const state = getState();

  if (preview) {
    if (state.lastUpdated) {
      const data = {
        lastUpdated: new Date(state.lastUpdated).toLocaleString(),
        currentScreen: state.currentScreen,
        resumeUploaded: state.resumeUploaded,
        jobUploaded: state.jobUploaded,
        topicsCompleted: state.topicsCompleted || [],
        questionsAnswered: state.questionsAnswered || 0
      };
      preview.textContent = JSON.stringify(data, null, 2);
    } else {
      preview.textContent = 'No session data found.';
    }
  }

  goToScreen('screen-end');
}

/**
 * Keeps session data and shows confirmation.
 * Data remains in localStorage for future sessions.
 */
function keepDataAndClose() {
  alert(
    'Your progress has been saved! You can close this tab now.\n\n' +
    'When you return, we\'ll pick up where you left off.'
  );
}

/**
 * Deletes all session data after confirmation.
 * Clears localStorage and returns to welcome screen.
 */
function deleteDataAndClose() {
  const confirmed = confirm(
    'Are you sure you want to delete all session data?\n\n' +
    'This cannot be undone.'
  );

  if (confirmed) {
    clearState();
    alert(
      'All session data has been deleted.\n\n' +
      'You can safely close this tab now.'
    );
    goToScreen('screen-welcome');
  }
}

