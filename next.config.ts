import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Gera .next/standalone: a imagem carrega só o necessário e roda com `node server.js`.
  output: 'standalone',
};

export default nextConfig;
