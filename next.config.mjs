/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // As artes dos personagens vêm do CDN do AniList e do Imgur.
    // Sem liberar aqui, o componente <Image> recusa a URL.
    remotePatterns: [
      { protocol: 'https', hostname: 's4.anilist.co' },
      { protocol: 'https', hostname: 'i.imgur.com' },
      { protocol: 'https', hostname: 'cdn.myanimelist.net' }
    ]
  }
};

export default nextConfig;
