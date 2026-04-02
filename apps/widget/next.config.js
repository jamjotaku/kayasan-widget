/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  // ★ ここを「リポジトリ名/widget」にする
  basePath: '/kayasan-fansaite/widget', 
};

module.exports = nextConfig;
