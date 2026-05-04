/**
 * Social Media & Ads API Stubs
 *
 * Preparado para conectar con las APIs de cada plataforma.
 * Cada función retorna datos vacíos hasta que se configuren las credenciales.
 *
 * APIs planificadas:
 *   - Meta Graph API (Instagram + Facebook)
 *   - LinkedIn Marketing API
 *   - X/Twitter API v2
 *   - Google Ads API (opcional)
 */

/* ─── Config (futuro — env vars) ──────────────────────────────────── */
// VITE_META_ACCESS_TOKEN
// VITE_LINKEDIN_CLIENT_ID / VITE_LINKEDIN_CLIENT_SECRET
// VITE_X_BEARER_TOKEN

export interface SocialChannelStatus {
  channel: string
  label: string
  connected: boolean
  icon: string      // lucide icon name
  color: string
}

export function getSocialChannelStatuses(): SocialChannelStatus[] {
  return [
    { channel: 'instagram',  label: 'Instagram',  connected: false, icon: 'Instagram',  color: '#E4405F' },
    { channel: 'facebook',   label: 'Facebook',   connected: false, icon: 'Facebook',   color: '#1877F2' },
    { channel: 'linkedin',   label: 'LinkedIn',   connected: false, icon: 'Linkedin',   color: '#0A66C2' },
    { channel: 'x_twitter',  label: 'X / Twitter', connected: false, icon: 'Twitter',   color: '#000000' },
    { channel: 'meta_ads',   label: 'Meta Ads',   connected: false, icon: 'Megaphone',  color: '#0668E1' },
  ]
}

/* ─── Instagram (Meta Graph API) ───────────────────────────────────── */
export interface InstagramInsights {
  impressions: number
  reach: number
  followerCount: number
  profileViews: number
  websiteClicks: number
}

export async function getInstagramInsights(
  _period: { since: string; until: string }
): Promise<InstagramInsights | null> {
  // TODO: GET https://graph.facebook.com/v19.0/{ig-user-id}/insights
  // ?metric=impressions,reach,follower_count,profile_views,website_clicks
  // &period=day&since={since}&until={until}
  // &access_token={VITE_META_ACCESS_TOKEN}
  console.log('[Social Stub] getInstagramInsights — API not configured')
  return null
}

/* ─── Facebook Page (Meta Graph API) ───────────────────────────────── */
export interface FacebookPageInsights {
  pageImpressions: number
  pageEngagedUsers: number
  pageFans: number
  pagePostEngagements: number
}

export async function getFacebookPageInsights(
  _period: { since: string; until: string }
): Promise<FacebookPageInsights | null> {
  // TODO: GET https://graph.facebook.com/v19.0/{page-id}/insights
  // ?metric=page_impressions,page_engaged_users,page_fans,page_post_engagements
  // &period=month
  console.log('[Social Stub] getFacebookPageInsights — API not configured')
  return null
}

/* ─── LinkedIn (Marketing API) ─────────────────────────────────────── */
export interface LinkedInAnalytics {
  impressions: number
  clicks: number
  engagement: number
  followers: number
}

export async function getLinkedInAnalytics(
  _period: { since: string; until: string }
): Promise<LinkedInAnalytics | null> {
  // TODO: GET https://api.linkedin.com/rest/organizationalEntityShareStatistics
  // ?q=organizationalEntity&organizationalEntity=urn:li:organization:{org-id}
  // &timeIntervals.timeGranularityType=MONTH
  // Headers: LinkedIn-Version: 202404, Authorization: Bearer {token}
  console.log('[Social Stub] getLinkedInAnalytics — API not configured')
  return null
}

/* ─── X / Twitter (API v2) ─────────────────────────────────────────── */
export interface XAnalytics {
  tweetCount: number
  impressions: number
  likes: number
  retweets: number
  replies: number
  followers: number
}

export async function getXAnalytics(
  _period: { since: string; until: string }
): Promise<XAnalytics | null> {
  // TODO: GET https://api.twitter.com/2/users/{id}/tweets
  // ?tweet.fields=public_metrics
  // &start_time={since}&end_time={until}
  // Headers: Authorization: Bearer {VITE_X_BEARER_TOKEN}
  console.log('[Social Stub] getXAnalytics — API not configured')
  return null
}

/* ─── Meta Ads (Marketing API) ─────────────────────────────────────── */
export interface MetaAdsMetrics {
  spend: number
  impressions: number
  clicks: number
  conversions: number
  cpc: number
  cpm: number
  roas: number
}

export async function getMetaAdsMetrics(
  _adAccountId: string,
  _period: { since: string; until: string }
): Promise<MetaAdsMetrics | null> {
  // TODO: GET https://graph.facebook.com/v19.0/act_{ad-account-id}/insights
  // ?fields=spend,impressions,clicks,actions,cost_per_action_type,cpc,cpm
  // &time_range={'since':'{since}','until':'{until}'}
  console.log('[Social Stub] getMetaAdsMetrics — API not configured')
  return null
}
