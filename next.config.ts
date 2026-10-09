import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Import .svg files as React components.
  turbopack: {
    rules: {
      '*.svg': { loaders: ['@svgr/webpack'], as: '*.js' },
    },
  },
  // Lets the dev server be opened through an ngrok tunnel; otherwise its scripts are blocked and the page never hydrates.
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok-free.dev', '*.ngrok.app', '*.ngrok.io'],
};

export default nextConfig;
