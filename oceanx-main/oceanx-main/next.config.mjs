/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The frontend is fully self-contained (mock service layer only).
  // When the backend lands, point NEXT_PUBLIC_API_BASE_URL at it and flip
  // NEXT_PUBLIC_USE_MOCKS to "false" - no UI changes required.
  env: {
    NEXT_PUBLIC_APP_NAME: 'OceanX'
  }
};

export default nextConfig;
