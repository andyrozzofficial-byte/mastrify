/** @type {import('next').NextConfig} */

/** Mirror server flag so client bundles see beta feedback when only ENABLE_BETA_FEEDBACK is set (e.g. Vercel). */
const betaFeedbackPublicEnv =
  process.env.NEXT_PUBLIC_ENABLE_BETA_FEEDBACK ?? process.env.ENABLE_BETA_FEEDBACK ?? ""

const nextConfig = {
  env: {
    NEXT_PUBLIC_ENABLE_BETA_FEEDBACK: betaFeedbackPublicEnv,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig