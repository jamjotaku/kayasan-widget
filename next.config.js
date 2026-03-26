/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // すべてのパスを「./（現在の場所から）」に強制する設定
  assetPrefix: './', 
  trailingSlash: true,
  images: { unoptimized: true },
}

module.exports = nextConfig