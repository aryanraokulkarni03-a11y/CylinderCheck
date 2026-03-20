import { useEffect } from 'react'

function upsertMeta(selector, attrs, content) {
  let node = document.head.querySelector(selector)
  if (!node) {
    node = document.createElement('meta')
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value))
    document.head.appendChild(node)
  }
  node.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let node = document.head.querySelector(`link[rel="${rel}"]`)
  if (!node) {
    node = document.createElement('link')
    node.setAttribute('rel', rel)
    document.head.appendChild(node)
  }
  node.setAttribute('href', href)
}

export function SeoHead({ metadata }) {
  useEffect(() => {
    if (!metadata) return

    document.title = metadata.title

    upsertMeta('meta[name="description"]', { name: 'description' }, metadata.description)
    upsertMeta('meta[name="robots"]', { name: 'robots' }, metadata.indexable ? 'index,follow' : 'noindex,nofollow')
    upsertMeta('meta[property="og:type"]', { property: 'og:type' }, 'website')
    upsertMeta('meta[property="og:title"]', { property: 'og:title' }, metadata.ogTitle)
    upsertMeta('meta[property="og:description"]', { property: 'og:description' }, metadata.ogDescription)
    upsertMeta('meta[property="og:url"]', { property: 'og:url' }, metadata.canonicalUrl)
    upsertMeta('meta[property="og:image"]', { property: 'og:image' }, metadata.ogImage)
    upsertMeta('meta[name="twitter:card"]', { name: 'twitter:card' }, metadata.twitterCard)
    upsertMeta('meta[name="twitter:title"]', { name: 'twitter:title' }, metadata.ogTitle)
    upsertMeta('meta[name="twitter:description"]', { name: 'twitter:description' }, metadata.ogDescription)
    upsertMeta('meta[name="twitter:image"]', { name: 'twitter:image' }, metadata.ogImage)
    upsertLink('canonical', metadata.canonicalUrl)

    document
      .querySelectorAll('script[data-cc-schema="true"]')
      .forEach((node) => node.parentNode?.removeChild(node))

    ;(metadata.schema || []).forEach((schemaObject) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.ccSchema = 'true'
      script.textContent = JSON.stringify(schemaObject)
      document.head.appendChild(script)
    })
  }, [metadata])

  return null
}

export default SeoHead
