/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  // Check builds use NEXT_DIST_DIR so they never overwrite the .next folder a running `next dev` is serving.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};
