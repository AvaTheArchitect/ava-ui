// tailwind.config.js - FINAL COMPLETE MAESTRO.AI COLOR SYSTEM
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // 🎸 Existing Colors (from early conversions)
        "cyber-blue": "#00f5ff",
        "cyber-orange": "#ff6b35",
        "cyber-yellow": "#f7931e",
        "cyber-green": "#00ff88",
        "cyber-red": "#ff6b6b",

        // 🔒 SIMON PRIME COLOR SYSTEM V29 (LOCKED - DO NOT MODIFY)
        "simon-orange": "#f97316", // text-orange-500 (titles)
        "simon-purple": "#581c87", // purple-900 (background)
        "simon-gray": "#111827", // gray-900 (background)
        "simon-blue": "#3b82f6", // blue-500 (base blue)
        "simon-blue-light": "#93c5fd", // blue-300 (borders)
        "simon-blue-text": "#bfdbfe", // blue-200 (text)
        "simon-blue-hover": "#60a5fa", // blue-400 (hover borders)
        "simon-purple-shadow": "#581c87", // purple-900 (shadows)

        // 🎼 Tab Player Colors (for future Songsterr-style components)
        "tab-bg-light": "#ffffff", // White background (light mode)
        "tab-bg-dark": "#1a1a1a", // Dark background (dark mode)
        "tab-text-light": "#333333", // Dark text (light mode)
        "tab-text-dark": "#e5e5e5", // Light text (dark mode)
        "tab-line": "#cccccc", // Tab lines (light mode)
        "tab-line-dark": "#444444", // Tab lines (dark mode)
        "tab-fret": "#2563eb", // Fret numbers (blue)
        "tab-chord": "#dc2626", // Chord highlights (red)
      },
      backgroundImage: {
        // 🎸 Legacy Gradients (from guitar/early components)
        "cyber-gradient":
          "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
        "title-gradient": "linear-gradient(45deg, #ff6b35, #f7931e, #00f5ff)",
        "button-gradient": "linear-gradient(45deg, #333, #555)",
        "start-gradient": "linear-gradient(45deg, #00f5ff, #0080ff)",
        "stop-gradient": "linear-gradient(45deg, #ff6b6b, #ee5a52)",
        "active-gradient": "linear-gradient(45deg, #ff6b35, #f7931e)",

        // 🔒 SIMON PRIME GRADIENTS V29 (LOCKED - DO NOT MODIFY)
        "simon-main":
          "linear-gradient(to bottom right, #111827, #581c87, #111827)",
        "simon-card":
          "linear-gradient(to bottom right, rgba(59, 130, 246, 0.05), rgba(59, 130, 246, 0.05))",

        // 🎨 Component-Specific Gradients
        "about-gradient": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        "contact-gradient":
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        "practice-gradient":
          "linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 50%, #45b7d1 100%)",
      },
      animation: {
        shimmer: "shimmer 3s ease-in-out infinite",
        "pulse-slow": "pulse 2s infinite",
        "spin-slow": "spin 1s linear infinite",
        float: "float 6s ease-in-out infinite",
        glow: "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        shimmer: {
          "0%, 100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": {
            "box-shadow": "0 0 5px #00f5ff, 0 0 10px #00f5ff, 0 0 15px #00f5ff",
          },
          "100%": {
            "box-shadow":
              "0 0 10px #00f5ff, 0 0 20px #00f5ff, 0 0 30px #00f5ff",
          },
        },
      },
      backdropBlur: {
        xs: "2px",
        sm: "4px",
        md: "8px",
        lg: "16px",
        xl: "20px",
        "2xl": "24px",
        "3xl": "32px",
      },
      // 🔒 SIMON PRIME SAFELIST V29 (PREVENTS TAILWIND PURGING)
      safelist: [
        // Background gradients
        "bg-gradient-to-br",
        "bg-gradient-to-r",
        "from-gray-900",
        "via-purple-900",
        "to-gray-900",
        "from-slate-900",
        "to-slate-900",

        // Simon Prime text colors
        "text-orange-500",
        "text-blue-200",
        "text-blue-200/80",
        "text-blue-200/70",
        "text-gray-400",
        "text-cyan-400",
        "text-white",

        // Simon Prime card system
        "bg-blue-500/5",
        "bg-blue-500/10",
        "bg-white/5",
        "bg-white/10",
        "bg-white/20",

        // Borders
        "border-blue-300/20",
        "border-blue-400/30",
        "border-white/10",
        "border-white/20",
        "border-white/30",

        // Shadows
        "shadow-lg",
        "shadow-2xl",
        "shadow-purple-900/20",
        "shadow-cyan-400/20",
        "shadow-orange-400/40",
        "shadow-blue-400/40",
        "shadow-purple-400/40",
        "shadow-emerald-400/40",
        "shadow-pink-400/40",
        "shadow-indigo-400/40",

        // Effects
        "backdrop-blur-lg",
        "backdrop-blur-xl",

        // Hover states
        "hover:bg-blue-500/10",
        "hover:bg-white/10",
        "hover:bg-white/20",
        "hover:border-blue-400/30",
        "hover:border-cyan-400/30",
        "hover:-translate-y-1",
        "hover:-translate-y-2",
        "hover:scale-105",
        "hover:shadow-lg",
        "hover:shadow-2xl",

        // Transitions
        "transition-all",
        "transition-colors",
        "duration-200",
        "duration-300",
        "ease-in-out",

        // Button gradients
        "from-cyan-400",
        "to-blue-500",
        "from-orange-500",
        "to-red-500",
        "from-purple-500",
        "to-purple-600",
        "from-emerald-500",
        "to-emerald-600",
        "from-pink-500",
        "to-rose-600",
        "from-blue-500",
        "to-blue-600",
        "from-indigo-500",
        "to-indigo-600",

        // Layout
        "min-h-screen",
        "max-w-6xl",
        "mx-auto",
        "grid-cols-1",
        "lg:grid-cols-2",
        "xl:grid-cols-3",
        "md:grid-cols-2",
        "md:grid-cols-4",
        "gap-4",
        "gap-6",
        "gap-8",
        "p-8",
        "rounded-2xl",
        "rounded-xl",
        "rounded-lg",

        // Animation classes
        "animate-pulse",
        "animate-spin",
        "animate-bounce",
      ],
    },
  },
  plugins: [],
};
