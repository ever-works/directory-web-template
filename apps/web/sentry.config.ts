export const sentryWebpackPluginOptions = {
  silent: true,
  org: process.env.SENTRY_ORG || "your-org-name",
  project: process.env.SENTRY_PROJECT || "your-project-name",

  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: "/monitoring",
  hideSourceMaps: true,
  disableLogger: true,
}; 