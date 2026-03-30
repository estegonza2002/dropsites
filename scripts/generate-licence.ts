#!/usr/bin/env npx tsx
/**
 * CLI script for generating DropSites licence keys.
 *
 * Usage:
 *   LICENCE_SIGNING_KEY=secret npx tsx scripts/generate-licence.ts \
 *     --customer "Acme Corp" \
 *     --expires 2027-12-31 \
 *     --deployments 100 \
 *     --features "custom-domains,white-label"
 */

import { generateLicenceKey } from '../lib/licence/generate'

function parseArgs(argv: string[]): Record<string, string> {
  const args: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--') && i + 1 < argv.length) {
      const key = arg.slice(2)
      i++
      args[key] = argv[i]
    }
  }
  return args
}

function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!args['customer']) {
    console.error('Error: --customer is required')
    console.error(
      'Usage: npx tsx scripts/generate-licence.ts --customer "Name" --expires 2027-12-31 --deployments 100 --features "feat1,feat2"',
    )
    process.exit(1)
  }

  if (!args['expires']) {
    console.error('Error: --expires is required (YYYY-MM-DD format)')
    process.exit(1)
  }

  if (!args['deployments']) {
    console.error('Error: --deployments is required')
    process.exit(1)
  }

  if (!process.env.LICENCE_SIGNING_KEY) {
    console.error('Error: LICENCE_SIGNING_KEY environment variable must be set')
    process.exit(1)
  }

  const expiresAt = new Date(args['expires'])
  if (isNaN(expiresAt.getTime())) {
    console.error('Error: --expires must be a valid date (YYYY-MM-DD)')
    process.exit(1)
  }

  const deploymentLimit = parseInt(args['deployments'], 10)
  if (isNaN(deploymentLimit) || deploymentLimit < 0) {
    console.error('Error: --deployments must be a non-negative integer')
    process.exit(1)
  }

  const features = args['features']
    ? args['features'].split(',').map((f) => f.trim()).filter(Boolean)
    : []

  const key = generateLicenceKey({
    customer: args['customer'],
    expiresAt,
    deploymentLimit,
    features,
  })

  console.log('\nGenerated licence key:\n')
  console.log(key)
  console.log('\nSet this as the DROPSITES_LICENCE_KEY environment variable.')
}

main()
