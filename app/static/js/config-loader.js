/**
 * Config Loader for PrepTalk
 *
 * Loads all configuration files and populates window.APP_CONFIG
 * Must execute synchronously before app initialization
 *
 * Spec: SPEC-2026-001
 * Date: 2026-02-04
 */

(async function() {
  const startTime = performance.now();
  console.log(`[config-loader] Starting config load at ${new Date().toISOString()}`);

  // Fallback defaults for all configs
  const DEFAULTS = {
    ui: {
      welcome: {
        title: "Let's talk through your experience",
        subtitle: "I'm here to help you see what's already there...",
        cta_primary: "Get started →",
        cta_secondary: "How this works"
      },
      setup: {
        title: "Share your background",
        resume_label: "Resume or CV",
        resume_hint: "PDF, DOCX, or TXT (Max 5MB)",
        job_label: "Job description",
        job_hint: "Paste URL or upload file",
        role_label: "Role title (optional)",
        cta: "Continue →"
      },
      errors: {
        resume_required: "Please upload a resume to continue.",
        processing_failed: "Something went wrong. Please try again."
      }
    },
    business: {
      readiness: {
        thresholds: {
          ready: 80,
          practicing: 40
        },
        calculation: {
          filler_penalty_multiplier: 15,
          min_score: 20,
          max_score: 100,
          base_bonus: 20
        },
        tiers: {
          excellent: { threshold: 90, message: 'Interview-ready. You own this story.' },
          good: { threshold: 75, message: 'Getting sharp. A bit more practice and you\'re there.' },
          fair: { threshold: 50, message: 'Good progress. The structure is solid.' },
          default: { message: 'Keep practicing. Each time gets easier.' }
        }
      },
      practice_improvement: {
        practice_bonus: {
          base: 12,
          min: 2,
          diminishing_factor: 1.5
        },
        duration_sweet_spot: {
          optimal_min: 60,
          optimal_max: 240,
          acceptable_min: 30,
          acceptable_max: 300,
          optimal_bonus: 3,
          acceptable_bonus: 1
        },
        readiness_modifiers: {
          high_threshold: 80,
          high_modifier: 0.3,
          medium_threshold: 60,
          medium_modifier: 0.6
        }
      },
      timings: {
        story_capture_autohide_ms: 8000,
        processing_delay_ms: 800,
        ring_animation_duration_ms: 800
      },
      limits: {
        max_stories_for_full_ring: 10,
        demo_stories_count: 7
      }
    },
    features: {
      features: {
        debug_telemetry: {
          enabled: false,
          environments: ["development"],
          override_url_param: "debug"
        }
      },
      environment: "production"
    },
    pdf: {
      filename_pattern: "PrepTalk_Report_{date}.pdf",
      colors: {
        primary_rgb: [45, 90, 71],
        dark_rgb: [30, 30, 30]
      }
    },
    tokens: {
      colors: {
        tags: {},
        status: {}
      },
      animations: {}
    },
    data: {
      stories: { stories: [] },
      topics: { topics: [] },
      questions: { questions: [] }
    }
  };

  /**
   * Fetch a single config file with error handling
   */
  async function fetchConfig(path, fallback) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      console.log(`[config-loader] ✓ Loaded ${path}`);
      return data;
    } catch (error) {
      console.warn(`[config-loader] ✗ Failed to load ${path}:`, error.message);
      console.warn(`[config-loader]   Using fallback defaults for ${path}`);
      return fallback;
    }
  }

  /**
   * Load all config files in parallel
   */
  async function loadAllConfigs() {
    const configs = await Promise.all([
      fetchConfig('/config/ui-strings.json', DEFAULTS.ui),
      fetchConfig('/config/business-rules.json', DEFAULTS.business),
      fetchConfig('/config/features.json', DEFAULTS.features),
      fetchConfig('/config/pdf-template.json', DEFAULTS.pdf),
      fetchConfig('/config/design-tokens.json', DEFAULTS.tokens),
      fetchConfig('/data/demo-stories.json', DEFAULTS.data.stories),
      fetchConfig('/data/topics.json', DEFAULTS.data.topics),
      fetchConfig('/data/questions.json', DEFAULTS.data.questions)
    ]);

    return {
      ui: configs[0],
      business: configs[1],
      features: configs[2],
      pdf: configs[3],
      tokens: configs[4],
      data: {
        stories: configs[5],
        topics: configs[6],
        questions: configs[7]
      }
    };
  }

  /**
   * Detect current environment
   */
  function getEnvironment() {
    const hostname = window.location.hostname;

    // Check if features.json has environment field
    if (window.APP_CONFIG && window.APP_CONFIG.features && window.APP_CONFIG.features.environment) {
      return window.APP_CONFIG.features.environment;
    }

    // Fallback to hostname detection
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    } else if (hostname.includes('staging')) {
      return 'staging';
    } else {
      return 'production';
    }
  }

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Name of feature from features.json
   * @returns {boolean}
   */
  function isFeatureEnabled(featureName) {
    if (!window.APP_CONFIG || !window.APP_CONFIG.features || !window.APP_CONFIG.features.features) {
      return false;
    }

    const feature = window.APP_CONFIG.features.features[featureName];
    if (!feature) {
      return false;
    }

    // Check URL param override
    if (feature.override_url_param) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has(feature.override_url_param)) {
        return true;
      }
    }

    // Check environment match
    const currentEnv = getEnvironment();
    if (feature.environments.includes('all') || feature.environments.includes(currentEnv)) {
      return feature.enabled;
    }

    return false;
  }

  /**
   * Get config value using dot notation path
   * @param {string} path - Dot notation path (e.g., 'business.readiness.thresholds.ready')
   * @returns {any} - Value at path or undefined
   */
  function getConfigValue(path) {
    if (!window.APP_CONFIG) {
      return undefined;
    }

    const keys = path.split('.');
    let value = window.APP_CONFIG;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // Load all configs
  try {
    const configs = await loadAllConfigs();

    // Populate global config object
    window.APP_CONFIG = configs;

    // Export helper functions
    window.isFeatureEnabled = isFeatureEnabled;
    window.getConfigValue = getConfigValue;

    const endTime = performance.now();
    const duration = (endTime - startTime).toFixed(2);
    console.log(`[config-loader] ✓ Config loading complete in ${duration}ms`);
    console.log(`[config-loader] Environment: ${getEnvironment()}`);

    // Log feature flags for debugging
    if (window.APP_CONFIG.features && window.APP_CONFIG.features.features) {
      const enabledFeatures = Object.keys(window.APP_CONFIG.features.features)
        .filter(name => isFeatureEnabled(name));
      if (enabledFeatures.length > 0) {
        console.log(`[config-loader] Enabled features: ${enabledFeatures.join(', ')}`);
      }
    }

  } catch (error) {
    console.error('[config-loader] ✗ Critical error loading configs:', error);

    // Use full defaults on catastrophic failure
    window.APP_CONFIG = DEFAULTS;
    window.isFeatureEnabled = () => false;
    window.getConfigValue = () => undefined;

    console.warn('[config-loader] Using minimal fallback defaults');
  }
})();
