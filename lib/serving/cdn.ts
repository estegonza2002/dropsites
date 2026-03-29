const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN
const CF_ZONE_ID = process.env.CLOUDFLARE_ZONE_ID
const DEPLOYMENT_BASE_URL = process.env.NEXT_PUBLIC_DEPLOYMENT_BASE_URL ?? 'https://dropsites.io'

/**
 * Purge Cloudflare CDN cache for a deployment's URLs.
 * In development or when CF credentials are missing, logs instead.
 */
export async function purgeDeploymentCache(slug: string): Promise<void> {
  const urls = [
    `${DEPLOYMENT_BASE_URL}/${slug}`,
    `${DEPLOYMENT_BASE_URL}/${slug}/`,
  ]

  if (!CF_API_TOKEN || !CF_ZONE_ID) {
    console.log(`[cdn] Would purge cache for: ${urls.join(', ')}`)
    return
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/purge_cache`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ files: urls }),
      },
    )

    if (!res.ok) {
      const body = await res.text()
      console.error(`[cdn] Purge failed: ${res.status} ${body}`)
    }
  } catch (err) {
    console.error('[cdn] Purge error:', err)
  }
}
