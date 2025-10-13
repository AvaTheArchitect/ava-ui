/** @type {import('next').NextConfig} */
import path from "path";
import { fileURLToPath } from "url";
import { AlphaTabWebPackPlugin } from "@coderline/alphatab/webpack";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nextConfig = {
  // ✅ PRESERVE: Your original ESLint disable
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ PRESERVE: Your Turbopack configuration (Next.js 15+)
  turbopack: {
    resolveAlias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@lib": path.resolve(__dirname, "lib"),
    },
  },

  // ✅ UPDATED: Your webpack with AlphaTab plugin added
  webpack: (config, { isServer }) => {
    config.resolve.alias["@"] = path.resolve(__dirname, "src");
    config.resolve.alias["@components"] = path.resolve(
      __dirname,
      "src/components"
    );
    config.resolve.alias["@lib"] = path.resolve(__dirname, "lib");

    // 🎸 ADD AlphaTab plugin for client-side only
    if (!isServer) {
      config.plugins.push(new AlphaTabWebPackPlugin());
    }

    return config;
  },

  // 🎵 PRESERVE: Your maestro-music-data serving
  async rewrites() {
    return [
      {
        source: "/maestro-music-data/:path*",
        destination: "/maestro-music-data/:path*",
      },
    ];
  },

  // 🎵 PRESERVE: Your CORS headers for music data access
  async headers() {
    return [
      {
        source: "/maestro-music-data/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
