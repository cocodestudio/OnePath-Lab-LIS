import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/login'],
      disallow: ['/dashboard/', '/api/'],
    },
    sitemap: 'https://lis.onepathlab.com/sitemap.xml',
  }
}
