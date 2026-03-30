import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ExternalLink, MapPin, Newspaper, Share2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FadeIn } from '../../components/motion/FadeIn'
import { PageHeader } from '../../components/ui/PageHeader'
import { Card } from '../../components/ui/Card'
import { CardBody, CardHeader } from '../../components/ui/CardParts'
import { Callout } from '../../components/ui/Callout'
import EmptyState from '../../components/shared/EmptyState'
import SeoHead from '../../components/seo/SeoHead'
import { DEFAULT_OG_IMAGE, SITE_URL } from '../../lib/metadata'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const SUPABASE_FUNC_URL = `${(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')}/functions/v1`
const DOT = '\u00B7'

const articleCache = new Map()

function formatTimestamp(value) {
  if (!value) return ''

  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildStoryLocation(article) {
  const city = String(article?.city || '').trim()
  const state = String(article?.state || '').trim()
  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return 'India'
}

function buildWhatsAppLink(article) {
  const title = String(article?.title || '').trim() || 'CylinderCheck LPG story'
  const deck = String(article?.deck || '').trim()
  const source = String(article?.source || '').trim()
  const sourceUrl = String(article?.sourceUrl || '').trim()

  const text = [
    'CylinderCheck LPG story',
    title,
    deck,
    source ? `Source: ${source}` : '',
    sourceUrl,
  ].filter(Boolean).join('\n')

  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

function parseMarkdown(markdown) {
  const raw = String(markdown || '').trim()
  if (!raw) return []

  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let paragraph = []
  let list = []

  function flushParagraph() {
    if (!paragraph.length) return
    blocks.push({ type: 'paragraph', content: paragraph.join(' ').trim() })
    paragraph = []
  }

  function flushList() {
    if (!list.length) return
    blocks.push({ type: 'list', items: [...list] })
    list = []
  }

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2].trim(),
      })
      continue
    }

    const listMatch = trimmed.match(/^[-*]\s+(.+)$/)
    if (listMatch) {
      flushParagraph()
      list.push(listMatch[1].trim())
      continue
    }

    if (list.length) {
      flushList()
    }

    paragraph.push(trimmed)
  }

  flushParagraph()
  flushList()
  return blocks
}

function renderBlocks(blocks) {
  return blocks.map((block, index) => {
    if (block.type === 'heading') {
      const HeadingTag = block.level >= 3 ? 'h4' : block.level === 2 ? 'h3' : 'h2'
      return (
        <HeadingTag key={`heading-${index}`} className="news-article-body__heading">
          {block.content}
        </HeadingTag>
      )
    }

    if (block.type === 'list') {
      return (
        <ul key={`list-${index}`} className="reading-list news-article-body__list">
          {block.items.map((item, itemIndex) => (
            <li key={`list-item-${index}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      )
    }

    return (
      <p key={`paragraph-${index}`} className="type-reading-copy news-article-body__paragraph">
        {block.content}
      </p>
    )
  })
}

function buildArticleMetadata(article, slug) {
  const title = article?.title || 'Published LPG Story'
  const deck = article?.deck || 'Read this published LPG story from CylinderCheck, with source context and related coverage.'
  const path = `/news/${slug}`
  const canonicalUrl = `${SITE_URL}${path}`
  const image = article?.heroImageUrl || DEFAULT_OG_IMAGE

  return {
    title: `${title} | CylinderCheck`,
    description: deck,
    canonicalUrl,
    ogTitle: `${title} | CylinderCheck`,
    ogDescription: deck,
    ogImage: image,
    twitterCard: 'summary_large_image',
    indexable: true,
    schema: [
      {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: title,
        description: deck,
        datePublished: article?.pubDate || null,
        dateModified: article?.scrapedAt || article?.pubDate || null,
        url: canonicalUrl,
        mainEntityOfPage: canonicalUrl,
        image: image ? [image] : undefined,
        author: {
          '@type': 'Organization',
          name: 'CylinderCheck',
        },
        publisher: {
          '@type': 'Organization',
          name: 'CylinderCheck',
        },
        isAccessibleForFree: true,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'News',
            item: `${SITE_URL}/news`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: title,
            item: canonicalUrl,
          },
        ],
      },
    ],
  }
}

export default function NewsArticlePage() {
  const { slug = '' } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [article, setArticle] = useState(null)
  const [relatedArticles, setRelatedArticles] = useState([])

  const fetchArticle = useCallback(async (force = false) => {
    const cacheKey = String(slug || '').trim()

    if (!cacheKey) {
      setError('Story not found.')
      setLoading(false)
      return
    }

    if (!force && articleCache.has(cacheKey)) {
      const cached = articleCache.get(cacheKey)
      setArticle(cached.article)
      setRelatedArticles(cached.relatedArticles)
      setError('')
      setLoading(false)
      return
    }

    if (!SUPABASE_ANON_KEY || !SUPABASE_FUNC_URL.includes('http')) {
      setError('Missing Supabase config. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${SUPABASE_FUNC_URL}/lpg-news?view=published&slug=${encodeURIComponent(cacheKey)}&limit=4`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
      })

      const payload = await response.json()
      if (!response.ok || !payload?.ok || !payload?.article) {
        throw new Error(payload?.error || 'Published story not found.')
      }

      const parsedArticle = {
        ...payload.article,
        pubDate: payload.article.pubDate ? new Date(payload.article.pubDate) : null,
      }
      const parsedRelated = Array.isArray(payload.relatedArticles)
        ? payload.relatedArticles.map((item) => ({
          ...item,
          pubDate: item.pubDate ? new Date(item.pubDate) : null,
        }))
        : []

      articleCache.set(cacheKey, {
        article: parsedArticle,
        relatedArticles: parsedRelated,
      })

      setArticle(parsedArticle)
      setRelatedArticles(parsedRelated)
    } catch (fetchError) {
      setArticle(null)
      setRelatedArticles([])
      setError(fetchError.message || 'Published story is temporarily unavailable.')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    void fetchArticle()
  }, [fetchArticle])

  const metadata = useMemo(
    () => (article ? buildArticleMetadata(article, slug) : null),
    [article, slug],
  )

  const storyLocation = useMemo(
    () => buildStoryLocation(article),
    [article],
  )

  const bodyBlocks = useMemo(
    () => parseMarkdown(article?.bodyMarkdown || article?.deck || ''),
    [article],
  )

  const sourceLabel = article?.sourceDomain || article?.source || 'External source'
  const publishedLabel = article?.pubDate ? formatTimestamp(article.pubDate) : ''
  const updatedLabel = article?.scrapedAt ? formatTimestamp(article.scrapedAt) : ''

  return (
    <div className="page-root reading-page news-article-page">
      {metadata ? <SeoHead metadata={metadata} /> : null}

      <PageHeader
        markerShowStatus={false}
        markerLabel="Published Story"
        markerStatus="clear"
        icon={Newspaper}
        title="News"
        description="Read the reviewed story on-site, then jump to the original source when you want the full external context."
        actions={(
          <Link to="/news" className="btn-ghost">
            <ArrowLeft size={16} />
            <span>Back to News</span>
          </Link>
        )}
      />

      {loading ? (
        <div className="page-section">
          <Card variant="featured" className="news-article-hero motion-safe:animate-pulse">
            <CardBody className="news-article-hero__body">
              <div className="news-article-hero__eyebrow">
                <span className="badge text-[var(--text-muted)] bg-[var(--bg-inset)] border border-[var(--border)]">Loading story</span>
              </div>
              <div className="news-article-skeleton news-article-skeleton--headline" />
              <div className="news-article-skeleton news-article-skeleton--copy" />
              <div className="news-article-skeleton news-article-skeleton--copy news-article-skeleton--short" />
            </CardBody>
          </Card>
        </div>
      ) : error ? (
        <div className="page-section">
          <EmptyState
            title="This story is not available"
            description={error}
            actionText="Back to News"
            onAction={() => navigate('/news')}
          />
        </div>
      ) : article ? (
        <FadeIn delay={0.08}>
          <div className="page-section news-article-layout page-grid-reading">
            <div className="news-article-main">
              <Card variant="featured" className="news-article-hero">
                <CardBody className="news-article-hero__body">
                  <div className="news-article-hero__eyebrow">
                    <div className="news-article-hero__chips">
                      <span className="badge text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-glow)]">
                        {article.category}
                      </span>
                      <span className="badge text-[var(--text-secondary)] bg-[var(--bg-inset)] border border-[var(--border)]">
                        {sourceLabel}
                      </span>
                    </div>
                    <a
                      href={buildWhatsAppLink(article)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost news-article-hero__share"
                    >
                      <Share2 size={15} />
                      <span>Share</span>
                    </a>
                  </div>

                  <div className="news-article-hero__meta">
                    <span>{article.source}</span>
                    <span aria-hidden="true">{DOT}</span>
                    <span className="news-article-hero__location">
                      <MapPin size={13} className="text-[var(--accent)]" />
                      <span>{storyLocation}</span>
                    </span>
                    {publishedLabel ? (
                      <>
                        <span aria-hidden="true">{DOT}</span>
                        <span>{publishedLabel}</span>
                      </>
                    ) : null}
                  </div>

                  <h1 className="news-article-hero__title">
                    {article.title}
                  </h1>

                  {article.deck ? (
                    <p className="type-reading-copy news-article-hero__deck">
                      {article.deck}
                    </p>
                  ) : null}

                  {article.heroImageUrl ? (
                    <div className="news-article-hero__media">
                      <img
                        src={article.heroImageUrl}
                        alt={article.title}
                        className="news-article-hero__image"
                        loading="eager"
                      />
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <Card variant="raised" className="reading-section news-article-body">
                <CardHeader
                  title="Story"
                  meta={<span className="reading-meta">CylinderCheck editorial framing</span>}
                />
                <CardBody>
                  {bodyBlocks.length ? renderBlocks(bodyBlocks) : (
                    <p className="type-reading-copy m-0">
                      This published story is live, but the on-site summary is still being filled in. Use the source panel to open the original coverage.
                    </p>
                  )}
                </CardBody>
              </Card>

              <Card variant="raised" className="reading-section news-article-source-card">
                <CardHeader
                  title="Source and context"
                  meta={<span className="reading-meta">Provenance</span>}
                />
                <CardBody>
                  <p className="type-reading-copy m-0">
                    CylinderCheck publishes a reviewed story card and keeps the original source attached so you can verify the underlying report directly.
                  </p>
                  <div className="news-article-source-card__meta">
                    <div className="news-article-source-card__pill">
                      <span className="kicker kicker--caps">Original source</span>
                      <span className="type-card-title">{article.source}</span>
                    </div>
                    <div className="news-article-source-card__pill">
                      <span className="kicker kicker--caps">Published</span>
                      <span className="type-card-title">{publishedLabel || 'Recently'}</span>
                    </div>
                  </div>
                  {article.sourceUrl ? (
                    <a
                      href={article.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-ghost news-article-source-card__link"
                    >
                      <ExternalLink size={16} />
                      <span>Open original source</span>
                    </a>
                  ) : null}
                </CardBody>
              </Card>
            </div>

            <div className="page-sticky-lg news-article-side">
              <Card variant="inset" className="news-article-facts">
                <CardHeader
                  title="At a glance"
                  meta={<span className="reading-meta">Published details</span>}
                />
                <CardBody className="news-article-facts__body">
                  <div className="news-article-facts__row">
                    <span className="kicker kicker--caps">Category</span>
                    <span className="type-card-copy">{article.category}</span>
                  </div>
                  <div className="news-article-facts__row">
                    <span className="kicker kicker--caps">Location</span>
                    <span className="type-card-copy">{storyLocation}</span>
                  </div>
                  <div className="news-article-facts__row">
                    <span className="kicker kicker--caps">Reviewed source</span>
                    <span className="type-card-copy">{article.source}</span>
                  </div>
                  {updatedLabel ? (
                    <div className="news-article-facts__row">
                      <span className="kicker kicker--caps">Updated</span>
                      <span className="type-card-copy">{updatedLabel}</span>
                    </div>
                  ) : null}
                </CardBody>
              </Card>

              <Card variant="raised" className="news-related-card">
                <CardHeader
                  title="More published stories"
                  meta={<span className="reading-meta">Keep reading</span>}
                />
                <CardBody className="news-related-card__body">
                  {relatedArticles.length ? (
                    <div className="news-related-list">
                      {relatedArticles.map((item, index) => (
                        <Link
                          key={`${item.slug || item.link}-${index}`}
                          to={item.slug ? `/news/${item.slug}` : '/news'}
                          className={`news-related-item${index === 0 ? ' news-related-item--featured' : ''}`}
                        >
                          <span className="news-related-item__category">{item.category}</span>
                          <span className="news-related-item__title">{item.title}</span>
                          {item.deck ? (
                            <span className="news-related-item__deck">{item.deck}</span>
                          ) : null}
                          <span className="news-related-item__meta">
                            {item.source}
                            {item.displayLocation ? ` ${DOT} ${item.displayLocation}` : ''}
                          </span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <Callout tone="accent" edge={false}>
                      <div className="type-note text-[var(--text-secondary)]">
                        More published stories will appear here as the editorial queue grows.
                      </div>
                    </Callout>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </FadeIn>
      ) : null}
    </div>
  )
}
