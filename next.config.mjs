const githubPages = process.env.GITHUB_ACTIONS === 'true' || process.env.NEXT_PUBLIC_DEPLOY_TARGET === 'github-pages';
const repoBase = '/fundacion-meriggi';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: githubPages ? repoBase : '',
  assetPrefix: githubPages ? repoBase : '',
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
