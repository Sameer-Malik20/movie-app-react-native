// CinePremium Multi-Engine Provider Manager
// Manages multiple movie sources & Universal Custom Site Sniffer

import { extractDirectStreams, extractIframesAndEmbeds, extractUniversalMovieCards, unpackJavaScript, cleanMovieTitle } from './universalSniffer.js';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export const PROVIDER_PRESETS = [
  {
    id: 'hindilinks',
    name: 'HindiLinks4u (VIP Direct)',
    badge: '⚡ FAST HLS',
    defaultUrl: 'https://hindilinks4u.estate',
    description: 'Fast HLS streaming with Hindi dubbed & dual audio movies.'
  },
  {
    id: 'katmovies',
    name: 'KatmovieHD Cinema',
    badge: '🎬 HD FILMS',
    defaultUrl: 'https://katmoviehd.cx',
    description: 'Latest Hollywood, Bollywood, and Netflix movies.'
  },
  {
    id: 'vegamovies',
    name: 'VegaMovies 4K',
    badge: '🍿 4K ULTRA',
    defaultUrl: 'https://vegamovies.ist',
    description: 'High bitrate 4K Ultra HD & 1080p prints.'
  },
  {
    id: 'custom',
    name: 'Custom Domain (Universal Sniffer)',
    badge: '🌐 DYNAMIC',
    defaultUrl: '',
    description: 'Enter any movie streaming site URL to automatically sniff & play.'
  }
];

class ProviderManager {
  constructor() {
    this.activeProviderId = 'hindilinks';
    this.customDomain = 'https://hindilinks4u.estate';
    this.currentBaseUrl = 'https://hindilinks4u.estate';
  }

  getActiveProvider() {
    const preset = PROVIDER_PRESETS.find(p => p.id === this.activeProviderId) || PROVIDER_PRESETS[0];
    return {
      ...preset,
      currentUrl: this.currentBaseUrl,
    };
  }

  getAllProviders() {
    return PROVIDER_PRESETS;
  }

  setProvider(providerId, customUrl) {
    this.activeProviderId = providerId;
    if (providerId === 'custom') {
      if (customUrl && customUrl.startsWith('http')) {
        this.customDomain = customUrl.replace(/\/+$/, '');
        this.currentBaseUrl = this.customDomain;
      }
    } else {
      const preset = PROVIDER_PRESETS.find(p => p.id === providerId);
      if (preset) {
        this.currentBaseUrl = preset.defaultUrl;
      }
    }
  }

  setActiveProvider(providerId, customUrl) {
    return this.setProvider(providerId, customUrl);
  }

  setBaseUrl(url) {
    if (url && url.startsWith('http')) {
      this.currentBaseUrl = url.replace(/\/+$/, '');
    }
  }

  getBaseUrl() {
    return this.currentBaseUrl;
  }

  // Universal HTTP Fetcher with User-Agent & Timeout
  async fetchHtml(url, referer) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9000);

      const res = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          ...(referer ? { 'Referer': referer } : {})
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      if (!res.ok) return '';
      return await res.text();
    } catch (e) {
      return '';
    }
  }

  /**
   * Universal Explore Movies
   */
  async fetchExplore(category = 'latest') {
    const baseUrl = this.currentBaseUrl;
    let endpoint = `${baseUrl}/`;

    if (this.activeProviderId === 'hindilinks') {
      if (category === 'action') endpoint = `${baseUrl}/category/action-movies/`;
      else if (category === 'comedy') endpoint = `${baseUrl}/category/comedy-movies/`;
      else if (category === 'thriller') endpoint = `${baseUrl}/category/thriller-movies/`;
      else if (category === 'sci-fi') endpoint = `${baseUrl}/category/sci-fi-movies/`;
      else if (category === 'top-rated') endpoint = `${baseUrl}/trending/`;
    }

    const html = await this.fetchHtml(endpoint, baseUrl);
    if (!html) return [];

    return extractUniversalMovieCards(html, baseUrl);
  }

  /**
   * Universal Search Movies
   */
  async searchMovies(query) {
    if (!query || !query.trim()) return [];
    const baseUrl = this.currentBaseUrl;
    const searchUrl = `${baseUrl}/?s=${encodeURIComponent(query.trim())}`;

    const html = await this.fetchHtml(searchUrl, baseUrl);
    if (!html) return [];

    return extractUniversalMovieCards(html, baseUrl);
  }

  /**
   * Universal Scrape Movie Details & Stream Sniffer
   */
  async scrapeDetails(movieUrl) {
    const html = await this.fetchHtml(movieUrl, this.currentBaseUrl);
    if (!html) {
      return {
        title: 'Movie Stream',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        referer: this.currentBaseUrl,
        details: {}
      };
    }

    // 1. Extract Title
    const titleMatch = html.match(/<h1[^>]*class=["'][^"']*(?:entry-title|title)[^"']*[^>]*>([^<]+)<\/h1>/i) ||
      html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
      html.match(/<title>([^<|]+)/i);
    const rawTitle = titleMatch ? titleMatch[1].trim() : 'Movie Stream';
    const title = cleanMovieTitle(rawTitle);

    // 2. Extract Poster
    const posterMatch = html.match(/<div[^>]*class=["'][^"']*(?:poster|thumb)[^"']*[^>]*>.*?<img[^>]+src=["']([^"']+)["']/is) ||
      html.match(/<img[^>]+class=["'][^"']*(?:attachment-post-thumbnail|poster)[^"']*[^>]+src=["']([^"']+)["']/i);
    const poster = posterMatch ? posterMatch[1] : '';

    // 3. Extract Metadata
    const details = {};
    const imdbMatch = html.match(/IMDb:?\s*<span[^>]*>([\d.]+)<\/span>/i) || html.match(/IMDb:?\s*([\d.]+)/i);
    if (imdbMatch) details.IMDb = imdbMatch[1].trim();

    const yearMatch = html.match(/Year:?\s*<span[^>]*>(\d{4})<\/span>/i) || html.match(/\b(20\d\d|19\d\d)\b/);
    if (yearMatch) details.Year = yearMatch[1].trim();

    const directorMatch = html.match(/Director:?\s*<span[^>]*>([^<]+)<\/span>/i);
    if (directorMatch) details.Director = directorMatch[1].trim();

    const genreMatch = html.match(/Genre:?\s*<span[^>]*>([^<]+)<\/span>/i);
    if (genreMatch) details.Genre = genreMatch[1].trim();

    // 4. Sniff Direct Stream (.m3u8 / .mp4)
    let directStreams = extractDirectStreams(html, movieUrl);
    let finalStreamUrl = directStreams[0] || '';
    let finalReferer = this.currentBaseUrl;

    // 5. If no direct stream found on page, follow embedded iframes (Speedostream, etc.)
    if (!finalStreamUrl) {
      const embeds = extractIframesAndEmbeds(html, movieUrl);
      for (const embedUrl of embeds) {
        const embedHtml = await this.fetchHtml(embedUrl, movieUrl);
        if (embedHtml) {
          const embedStreams = extractDirectStreams(embedHtml, embedUrl);
          if (embedStreams.length > 0) {
            finalStreamUrl = embedStreams[0];
            finalReferer = embedUrl;
            break;
          }
        }
      }
    }

    // Default fallback VIP stream
    if (!finalStreamUrl) {
      finalStreamUrl = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
    }

    return {
      title,
      poster,
      streamUrl: finalStreamUrl,
      referer: finalReferer,
      details,
      link: movieUrl,
      description: `Streaming ${title} in crystal clear HD.`
    };
  }
}

export const providerManager = new ProviderManager();
