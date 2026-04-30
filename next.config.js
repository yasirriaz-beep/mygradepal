const { withSentryConfig } = require("@sentry/nextjs")

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: "mygradepal",
  project: "javascript-nextjs",
  silent: true,
})
