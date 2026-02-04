/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/templates/**/*.html",
    "./app/static/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        // Nordic Warmth palette - Scandinavian hygge
        nordic: {
          birch: '#F5F0E8',      // Light wood tone
          oak: '#E8DFD0',        // Warm wood tone
          cream: '#FEFDFB',      // Soft cream background
          linen: '#FAF8F5',      // Off-white surface
          stone: '#E5E0D8',      // Warm gray border
          slate: '#6B7B8A',      // Muted blue-gray accent
          sky: '#8A9BA8',        // Light blue-gray
          ink: '#3D3A36',        // Warm dark text
          muted: '#6B6860',      // Secondary text
          sage: '#7A8B7A',       // Soft green accent
          coral: '#C4847A',      // Warm accent
          amber: '#D4A574',      // Golden accent
        }
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      borderRadius: {
        'nordic': '12px',
      },
      boxShadow: {
        'nordic': '0 8px 24px rgba(61, 58, 54, 0.08)',
        'nordic-lg': '0 20px 50px rgba(61, 58, 54, 0.12)',
      }
    },
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    themes: [
      {
        nordic: {
          "primary": "#6B7B8A",          // Muted blue-gray
          "primary-content": "#FEFDFB",
          "secondary": "#7A8B7A",         // Sage green
          "secondary-content": "#FEFDFB",
          "accent": "#D4A574",            // Amber
          "accent-content": "#3D3A36",
          "neutral": "#3D3A36",           // Warm ink
          "neutral-content": "#FAF8F5",
          "base-100": "#FEFDFB",          // Cream
          "base-200": "#FAF8F5",          // Linen
          "base-300": "#F5F0E8",          // Birch
          "base-content": "#3D3A36",
          "info": "#8A9BA8",              // Sky
          "info-content": "#3D3A36",
          "success": "#7A8B7A",           // Sage
          "success-content": "#FEFDFB",
          "warning": "#D4A574",           // Amber
          "warning-content": "#3D3A36",
          "error": "#C4847A",             // Coral
          "error-content": "#FEFDFB",
        },
      },
      "light",
      "dark",
    ],
    defaultTheme: "nordic",
  },
}
