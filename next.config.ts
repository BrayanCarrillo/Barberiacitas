import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  output: "export",
  // Ensure the public directory is served correctly.
  // By default, Next.js serves static assets from the `public` directory at the root.
  // No specific configuration is usually needed for this unless `staticPageGenerationTimeout`
  // or other advanced options related to static generation/export need adjustment.
  // The `public` directory works out-of-the-box for files like `sw.js`.

  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
