/** @type {import('tailwindcss').Config} */
module.exports = {
  // ========== 🌙 DARK MODE - KEEP AS IS ==========
  darkMode: "class",

  // ========== 📁 CONTENT - KEEP AS IS ==========
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],

  theme: {
    extend: {
      // ========== 🎨 EXISTING: ANIMATIONS - KEEP AS IS ==========
      animation: {
        shake: "shake 0.4s ease-in-out",
        // ========== NEW: THEME ANIMATIONS ==========
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },

      // ========== 🎨 EXISTING: KEYFRAMES - KEEP AS IS ==========
      keyframes: {
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-4px)" },
          "75%": { transform: "translateX(4px)" },
        },
        // ========== NEW: THEME KEYFRAMES ==========
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },

      // ========== 🎨 EXISTING: BACKGROUND - KEEP AS IS ==========
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },

      // ========== 🎨 NEW: THEME COLORS (CSS VARIABLES) ==========
      colors: {
        // Theme colors from CSS variables
        theme: {
          primary: "var(--color-primary)",
          "primary-hover": "var(--color-primary-hover)",
          secondary: "var(--color-secondary)",
          bg: "var(--color-background)",
          surface: "var(--color-surface)",
          "surface-hover": "var(--color-surface-hover)",
          text: "var(--color-text)",
          "text-secondary": "var(--color-text-secondary)",
          border: "var(--color-border)",
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          error: "var(--color-error)",
          info: "var(--color-info)",
        },
      },

      // ========== 📦 NEW: SPACING SCALE ==========
      spacing: {
        "theme-xs": "var(--spacing-xs)",
        "theme-sm": "var(--spacing-sm)",
        "theme-md": "var(--spacing-md)",
        "theme-lg": "var(--spacing-lg)",
        "theme-xl": "var(--spacing-xl)",
        "theme-2xl": "var(--spacing-2xl)",
      },

      // ========== 🎨 NEW: BORDER RADIUS ==========
      borderRadius: {
        "theme-sm": "var(--radius-sm)",
        "theme-md": "var(--radius-md)",
        "theme-lg": "var(--radius-lg)",
        "theme-xl": "var(--radius-xl)",
        "theme-2xl": "var(--radius-2xl)",
        "theme-full": "var(--radius-full)",
      },

      // ========== 💫 NEW: BOX SHADOWS ==========
      boxShadow: {
        "theme-sm": "var(--shadow-sm)",
        "theme-md": "var(--shadow-md)",
        "theme-lg": "var(--shadow-lg)",
        "theme-xl": "var(--shadow-xl)",
        "theme-2xl": "var(--shadow-2xl)",
      },

      // ========== ⏱️ NEW: TRANSITIONS ==========
      transitionDuration: {
        "theme-fast": "var(--transition-fast)",
        "theme-base": "var(--transition-base)",
        "theme-slow": "var(--transition-slow)",
      },

      // ========== 📱 NEW: BREAKPOINTS ==========
      screens: {
        xs: "475px",
        // sm: '640px',  // default Tailwind
        // md: '768px',  // default Tailwind
        // lg: '1024px', // default Tailwind
        // xl: '1280px', // default Tailwind
        // 2xl: '1536px', // default Tailwind
      },

      // ========== 📝 NEW: RESPONSIVE FONT SIZES ==========
      fontSize: {
        "theme-xs": "clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)",
        "theme-sm": "clamp(0.875rem, 0.8rem + 0.35vw, 1rem)",
        "theme-base": "clamp(1rem, 0.95rem + 0.25vw, 1.125rem)",
        "theme-lg": "clamp(1.125rem, 1rem + 0.5vw, 1.25rem)",
        "theme-xl": "clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)",
        "theme-2xl": "clamp(1.5rem, 1.3rem + 1vw, 2rem)",
        "theme-3xl": "clamp(1.875rem, 1.5rem + 1.5vw, 2.5rem)",
      },
    },
  },

  // ========== 🎨 NEW: CUSTOM PLUGIN FOR THEME UTILITIES ==========
  plugins: [
    function ({ addUtilities, addComponents }) {
      // ========== UTILITY CLASSES ==========
      const newUtilities = {
        // Touch target utilities (Mobile First - 44px minimum)
        ".touch-target": {
          minHeight: "44px",
          minWidth: "44px",
          padding: "0.75rem 1rem",
        },
        ".touch-target-sm": {
          minHeight: "40px",
          minWidth: "40px",
          padding: "0.5rem 0.75rem",
        },
        ".touch-target-lg": {
          minHeight: "56px",
          minWidth: "56px",
          padding: "1rem 1.5rem",
        },

        // Smooth transitions
        ".transition-theme": {
          transition:
            "background-color var(--transition-base), color var(--transition-base), border-color var(--transition-base)",
        },

        // Theme background utilities
        ".bg-theme-primary": {
          backgroundColor: "var(--color-primary)",
        },
        ".bg-theme-surface": {
          backgroundColor: "var(--color-surface)",
        },
        ".bg-theme-bg": {
          backgroundColor: "var(--color-background)",
        },

        // Theme text utilities
        ".text-theme-primary": {
          color: "var(--color-primary)",
        },
        ".text-theme": {
          color: "var(--color-text)",
        },
        ".text-theme-secondary": {
          color: "var(--color-text-secondary)",
        },

        // Theme border utilities
        ".border-theme": {
          borderColor: "var(--color-border)",
        },
        ".border-theme-primary": {
          borderColor: "var(--color-primary)",
        },
      };

      // ========== COMPONENT CLASSES ==========
      const newComponents = {
        // Theme card component
        ".card-theme": {
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          borderRadius: "var(--radius-xl)",
          padding: "var(--spacing-lg)",
          boxShadow: "var(--shadow-md)",
          transition: "all var(--transition-base)",
        },
        ".card-theme:hover": {
          boxShadow: "var(--shadow-lg)",
          transform: "translateY(-2px)",
        },

        // Theme button component
        ".btn-theme": {
          padding: "0.75rem 1rem",
          borderRadius: "var(--radius-md)",
          fontWeight: "600",
          minHeight: "44px",
          minWidth: "44px",
          transition: "all var(--transition-fast)",
          cursor: "pointer",
        },
        ".btn-theme-primary": {
          backgroundColor: "var(--color-primary)",
          color: "#ffffff",
          border: "none",
        },
        ".btn-theme-primary:hover": {
          backgroundColor: "var(--color-primary-hover)",
          transform: "scale(1.02)",
        },
        ".btn-theme-secondary": {
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text)",
          border: "2px solid var(--color-border)",
        },
        ".btn-theme-secondary:hover": {
          backgroundColor: "var(--color-surface-hover)",
        },
      };

      addUtilities(newUtilities, ["responsive", "hover"]);
      addComponents(newComponents);
    },
  ],
};
