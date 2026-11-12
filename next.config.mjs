/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  poweredByHeader: false,
  // Supplier bill photos and PDFs are uploaded through a server action.
  experimental: { serverActions: { bodySizeLimit: '8mb' } },
};
