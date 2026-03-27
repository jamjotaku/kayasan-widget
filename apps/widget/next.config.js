/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 静的書き出しを有効にする
  images: {
    unoptimized: true, // GitHub Pagesでは画像最適化が使えないため
  },
  // リポジトリ名が「kayasan-widget」なら、URLのパスを合わせる
  basePath: '/kayasan-fansite', 
};

module.exports = nextConfig;