// src/lib/analytics.js
import posthog from 'posthog-js'

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let isInitialized = false

/**
 * Initializes PostHog using environment variables.
 * Disables automatic capture of pageviews as we handle it manually.
 */
export const initAnalytics = () => {
  if (POSTHOG_KEY && !isInitialized) {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true, // Captures generic clicks, rageclicks, etc.
      capture_pageview: false, // We handle SPA pageviews manually via React Router
      capture_pageleave: true,
      opt_in_site_apps: true,
      person_profiles: 'always', 
    })
    isInitialized = true
  }
}

/**
 * Tracks a custom event in PostHog.
 * @param {string} eventName The name of the event.
 * @param {object} properties Optional properties for the event.
 */
export const trackEvent = (eventName, properties = {}) => {
  if (isInitialized) {
    posthog.capture(eventName, properties)
  }
}

/**
 * Tracks a pageview manually. Call this on route changes.
 * @param {string} url The current path/url
 */
export const trackPageView = (url) => {
  if (isInitialized) {
    const currentUrl = typeof url === 'string' && url.trim()
      ? new URL(url, window.location.origin).toString()
      : window.location.href

    posthog.capture('$pageview', {
      $current_url: currentUrl,
    })
  }
}

/**
 * Links anonymous usage to a signed-in user ID.
 * @param {string} distinctId The user's unique ID from Supabase.
 * @param {object} properties User traits (email, etc).
 */
export const identifyUser = (distinctId, properties = {}) => {
  if (isInitialized && distinctId) {
    posthog.identify(distinctId, properties)
  }
}

/**
 * Resets the current tracking session, removing identity/traits.
 * Call this on logout.
 */
export const resetIdentity = () => {
  if (isInitialized) {
    posthog.reset()
  }
}
