/** @type {import('next').NextConfig} */

/** Mirror server flag so client bundles see beta feedback when only ENABLE_BETA_FEEDBACK is set (e.g. Vercel). */
const betaFeedbackPublicEnv =
  process.env.NEXT_PUBLIC_ENABLE_BETA_FEEDBACK ?? process.env.ENABLE_BETA_FEEDBACK ?? ""

const resourceDebugPublicEnv =
  process.env.NEXT_PUBLIC_MASTRIFY_RESOURCE_DEBUG ?? process.env.MASTRIFY_RESOURCE_DEBUG ?? ""

const nextConfig = {
  env: {
    NEXT_PUBLIC_ENABLE_BETA_FEEDBACK: betaFeedbackPublicEnv,
    NEXT_PUBLIC_MASTRIFY_RESOURCE_DEBUG: resourceDebugPublicEnv,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig