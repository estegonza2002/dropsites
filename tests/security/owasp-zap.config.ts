/**
 * OWASP ZAP Automation Framework configuration for DropSites.
 *
 * Usage:
 *   1. Export to JSON via `JSON.stringify(zapConfig, null, 2)` and feed to ZAP CLI:
 *      zap.sh -cmd -autorun zap-config.json
 *   2. Or import in a Node script that orchestrates ZAP via the REST API.
 */

export const ZAP_BASE_URL = process.env.ZAP_TARGET_URL ?? 'http://localhost:3000'

export const zapConfig = {
  env: {
    contexts: [
      {
        name: 'DropSites Full',
        urls: [`${ZAP_BASE_URL}`],
        includePaths: [
          `${ZAP_BASE_URL}/.*`,
        ],
        excludePaths: [
          // Third-party hosted pages we do not own
          'https://checkout.stripe.com/.*',
          'https://accounts.google.com/.*',
          'https://github.com/login/.*',
          // Static asset hashes (noise)
          `${ZAP_BASE_URL}/_next/static/.*`,
        ],
        authentication: {
          method: 'browser',
          parameters: {
            loginPageUrl: `${ZAP_BASE_URL}/login`,
            loginPageWait: 5,
          },
          verification: {
            method: 'response',
            loggedInRegex: 'dashboard',
            loggedOutRegex: 'Sign in',
          },
        },
      },
    ],
    parameters: {
      failOnError: true,
      progressToStdout: true,
    },
  },

  jobs: [
    // -----------------------------------------------------------------------
    // 1. Spider: crawl the app
    // -----------------------------------------------------------------------
    {
      type: 'spider',
      parameters: {
        context: 'DropSites Full',
        maxDuration: 5, // minutes
        maxDepth: 10,
        maxChildren: 50,
      },
      urls: [
        `${ZAP_BASE_URL}/`,
        `${ZAP_BASE_URL}/login`,
        `${ZAP_BASE_URL}/signup`,
        `${ZAP_BASE_URL}/dashboard`,
        `${ZAP_BASE_URL}/dashboard/deployments`,
        `${ZAP_BASE_URL}/dashboard/settings`,
      ],
    },

    // -----------------------------------------------------------------------
    // 2. AJAX Spider: catch client-rendered routes
    // -----------------------------------------------------------------------
    {
      type: 'spiderAjax',
      parameters: {
        context: 'DropSites Full',
        maxDuration: 5,
        maxCrawlDepth: 5,
      },
    },

    // -----------------------------------------------------------------------
    // 3. Active scan: API endpoints
    // -----------------------------------------------------------------------
    {
      type: 'activeScan',
      parameters: {
        context: 'DropSites Full',
        maxRuleDurationInMins: 2,
        maxScanDurationInMins: 20,
        policy: 'Default Policy',
      },
      urls: [
        // Core API v1
        `${ZAP_BASE_URL}/api/v1/deployments`,
        `${ZAP_BASE_URL}/api/v1/deployments/test-slug`,
        `${ZAP_BASE_URL}/api/v1/deployments/test-slug/password`,
        `${ZAP_BASE_URL}/api/v1/deployments/test-slug/disable`,
        `${ZAP_BASE_URL}/api/v1/deployments/test-slug/duplicate`,
        // Upload
        `${ZAP_BASE_URL}/api/upload`,
        // Auth
        `${ZAP_BASE_URL}/api/auth/callback`,
        // Health
        `${ZAP_BASE_URL}/api/health`,
        // Analytics
        `${ZAP_BASE_URL}/api/v1/analytics`,
        // Webhooks
        `${ZAP_BASE_URL}/api/v1/webhooks`,
        // Abuse
        `${ZAP_BASE_URL}/api/v1/abuse/report`,
      ],
    },

    // -----------------------------------------------------------------------
    // 4. Passive scan: headers, cookies, info leaks
    // -----------------------------------------------------------------------
    {
      type: 'passiveScan-wait',
      parameters: {
        maxDuration: 5,
      },
    },

    // -----------------------------------------------------------------------
    // 5. Report
    // -----------------------------------------------------------------------
    {
      type: 'report',
      parameters: {
        template: 'traditional-html',
        reportDir: './reports',
        reportFile: 'zap-report',
        reportTitle: 'DropSites OWASP ZAP Scan Report',
        reportDescription: 'Automated security scan for DropSites',
      },
      risks: ['High', 'Medium', 'Low', 'Informational'],
    },
  ],

  /** Alert thresholds — fail the scan if any High alerts remain. */
  alertFilters: [
    {
      ruleId: 10096, // Timestamp Disclosure — acceptable
      newRisk: 'False Positive',
    },
  ],
}

export default zapConfig
