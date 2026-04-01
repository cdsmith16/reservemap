import { useEffect } from 'react'

const DEFAULT_TITLE = 'ReserveMap — Credit Card Dining Benefits, Mapped'
const DEFAULT_DESC =
  'Find restaurants where your credit card dining benefits apply. Filter by Amex Global Dining Access and Chase Sapphire Reserve. 10,000+ restaurants across the US.'

export function useSEO({ title, description, schema } = {}) {
  useEffect(() => {
    const prevTitle = document.title
    if (title) document.title = title

    const setMeta = (selector, value) => {
      if (!value) return
      let el = document.querySelector(selector)
      if (!el) {
        el = document.createElement('meta')
        const [attr, val] = selector.replace('meta[', '').replace(']', '').split('=')
        el.setAttribute(attr, val.replace(/"/g, ''))
        document.head.appendChild(el)
      }
      el.setAttribute('content', value)
    }

    if (description) {
      setMeta('meta[name="description"]', description)
      setMeta('meta[property="og:description"]', description)
    }
    if (title) {
      setMeta('meta[property="og:title"]', title)
    }

    let schemaScript = null
    if (schema) {
      schemaScript = document.createElement('script')
      schemaScript.type = 'application/ld+json'
      schemaScript.setAttribute('data-page-schema', 'true')
      schemaScript.textContent = JSON.stringify(schema)
      document.head.appendChild(schemaScript)
    }

    return () => {
      document.title = prevTitle || DEFAULT_TITLE
      if (description) {
        setMeta('meta[name="description"]', DEFAULT_DESC)
        setMeta('meta[property="og:description"]', DEFAULT_DESC)
      }
      if (title) {
        setMeta('meta[property="og:title"]', DEFAULT_TITLE)
      }
      if (schemaScript) schemaScript.remove()
    }
  }, [title, description, schema])
}

export function citySchema(cityDisplay, restaurants) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Restaurants with Credit Card Dining Benefits in ${cityDisplay}`,
    numberOfItems: restaurants.length,
    itemListElement: restaurants.slice(0, 50).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Restaurant',
        name: r.name,
        address: r.address,
        ...(r.website ? { url: r.website } : {}),
      },
    })),
  }
}

export function faqSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  }
}

export function breadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      ...(item.url
        ? { item: `https://reservemap.vercel.app${item.url}` }
        : {}),
    })),
  }
}

// Consistent slug generation — must match the Python script in cities-index.json
export function citySlug(city, state) {
  const slug = city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return state ? `${slug}-${state.toLowerCase().trim()}` : slug
}

export function cityDisplay(name, state) {
  return state ? `${name}, ${state}` : name
}
