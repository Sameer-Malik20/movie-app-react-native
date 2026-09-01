// Universal Regex & Video Stream Sniffer Engine for CinePremium
// Extracts direct HLS (.m3u8), MP4, iframes, packed JS, and movie cards from any movie website

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

/**
 * Universal Movie Title Cleaner
 * Strips SEO spam, download keywords, watch online tags, and site domains to produce clean, pure titles
 */
export function cleanMovieTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== 'string') return '';
  let clean = rawTitle
    // 1. Decode HTML entities
    .replace(/&amp;/gi, '&')
    .replace(/&#038;/gi, '&')
    .replace(/&#8211;/gi, '-')
    .replace(/&#8217;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    // 2. Remove "Download full movie & watch online on ..."
    .replace(/download\s+(full\s+)?movie\s*(&|and)?\s*watch\s*online\s*(on\s*[\w\d.-]+)?/gi, '')
    .replace(/watch\s+online\s+(full\s+movie\s+)?(on\s*[\w\d.-]+)?/gi, '')
    .replace(/watch\s+free\s+movies\s*(&|and)?\s*tv\s*shows/gi, '')
    .replace(/download\s+full\s+movie/gi, '')
    .replace(/download\s+hd\s+movie/gi, '')
    .replace(/full\s+movie\s+watch\s+online/gi, '')
    .replace(/full\s+movie\s+download/gi, '')
    .replace(/full\s+movie/gi, '')
    .replace(/watch\s+online/gi, '')
    .replace(/watch\s+free/gi, '')
    .replace(/free\s+download/gi, '')
    .replace(/download\s+online/gi, '')
    .replace(/download\s+hub/gi, '')
    .replace(/\bdownload\b/gi, '')
    // 3. Remove website domain names / branding tags
    .replace(/[-|•–—~:]?\s*(?:on\s*)?hindilinks4u[\w\d.-]*/gi, '')
    .replace(/[-|•–—~:]?\s*(?:on\s*)?katmoviehd[\w\d.-]*/gi, '')
    .replace(/[-|•–—~:]?\s*(?:on\s*)?vegamovies[\w\d.-]*/gi, '')
    .replace(/[-|•–—~:]?\s*(?:on\s*)?cinepremium[\w\d.-]*/gi, '')
    .replace(/[-|•–—~:]?\s*(?:on\s*)?filmyzilla[\w\d.-]*/gi, '')
    .replace(/[-|•–—~:]?\s*(?:on\s*)?bollyflix[\w\d.-]*/gi, '')
    .replace(/[-|•–—~:]?\s*(?:on\s*)?moviesmod[\w\d.-]*/gi, '')
    // 4. Clean trailing and leading punctuation/dashes/pipes/colons
    .replace(/[-|•–—~:,\s]+$/g, '')
    .replace(/^[-|•–—~:,\s]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return clean || rawTitle.trim();
}

/**
 * Dean Edwards Packer JavaScript Unpacker (eval(p,a,c,k,e,d))
 */
export function unpackJavaScript(packedCode) {
  if (!packedCode || typeof packedCode !== 'string') return '';
  try {
    const packerRegex = /eval\(function\(p,a,c,k,e,[rd]\)\{.*return\s+p\}\('(.*?)',(\d+),(\d+),'(.*?)'\.split\('\|'\)/s;
    const match = packedCode.match(packerRegex);
    if (!match) return packedCode;

    let [, payload, radixStr, countStr, symStr] = match;
    const radix = parseInt(radixStr, 10);
    const count = parseInt(countStr, 10);
    const symtab = symStr.split('|');

    function unbase(val, rad) {
      const alphabet = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      if (val === 0) return '0';
      let res = '';
      let n = val;
      while (n > 0) {
        res = alphabet[n % rad] + res;
        n = Math.floor(n / rad);
      }
      return res;
    }

    const dict = {};
    for (let i = count - 1; i >= 0; i--) {
      const key = unbase(i, radix);
      dict[key] = symtab[i] || key;
    }

    const unpacked = payload.replace(/\b[0-9a-zA-Z]+\b/g, (w) => (dict[w] !== undefined ? dict[w] : w));
    return unpacked;
  } catch (e) {
    return packedCode;
  }
}

/**
 * Universal Stream Sniffer - Detects .m3u8, .mp4, HLS stream URLs from HTML / Script
 */
export function extractDirectStreams(html, pageUrl) {
  if (!html) return [];
  const streams = [];

  // 1. Check for Unpacked JS inside the html
  let fullText = html;
  if (html.includes('eval(function(p,a,c,k,e,')) {
    const unpacked = unpackJavaScript(html);
    fullText += '\n' + unpacked;
  }

  // 2. Regex for direct .m3u8 (HLS master or playlist)
  const m3u8Regex = /["'](https?:\/\/[^"'\s]+\.m3u8[^"'\s]*)["']/gi;
  let match;
  while ((match = m3u8Regex.exec(fullText)) !== null) {
    const url = match[1].replace(/\\/g, '');
    if (!streams.includes(url)) streams.push(url);
  }

  // 3. Regex for file: "https://...mp4" or sources: [{file: "..."}]
  const fileRegex = /(?:file|source|src)\s*:\s*["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm)[^"'\s]*)["']/gi;
  while ((match = fileRegex.exec(fullText)) !== null) {
    const url = match[1].replace(/\\/g, '');
    if (!streams.includes(url)) streams.push(url);
  }

  // 4. Regex for video tag <source src="...">
  const sourceTagRegex = /<source[^>]+src=["'](https?:\/\/[^"'\s]+)["']/gi;
  while ((match = sourceTagRegex.exec(fullText)) !== null) {
    const url = match[1];
    if (!streams.includes(url)) streams.push(url);
  }

  return streams;
}

/**
 * Universal Embed / Iframe Sniffer - Detects external video player providers
 */
export function extractIframesAndEmbeds(html, pageUrl) {
  if (!html) return [];
  const embeds = [];

  // 1. Check <iframe src="...">
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = iframeRegex.exec(html)) !== null) {
    let url = match[1];
    if (url.startsWith('//')) url = 'https:' + url;
    if (url.startsWith('http') && !url.includes('google') && !url.includes('facebook') && !url.includes('ad')) {
      embeds.push(url);
    }
  }

  // 2. Check embedded player URLs (Speedostream, Streamtape, Doodstream, Vidcloud, SuperEmbed, etc.)
  const playerRegex = /["'](https?:\/\/(?:speedostream\w*|streamtape|dood\w*|vidcloud|streamwish|filemoon|mixdrop|vidsrc|2embed|superembed)[^"'\s]+)["']/gi;
  while ((match = playerRegex.exec(html)) !== null) {
    const url = match[1].replace(/\\/g, '');
    if (!embeds.includes(url)) embeds.push(url);
  }

  return embeds;
}

/**
 * Universal Movie Cards Extractor - Parses movie grids from any WordPress/Dooplay/Psycho/Toro/Grid site
 */
export function extractUniversalMovieCards(html, baseUrl) {
  if (!html) return [];
  const movies = [];
  const cleanBase = (baseUrl || '').replace(/\/+$/, '');

  // Regex patterns covering standard movie card HTML layouts:
  // 1. Standard <article class="item movies"> ... <img src="..."> <a href="..."> <h3/h2>Title</h2>
  // 2. <div class="movie-card"> ... </div>
  // 3. <div class="item"> ... </div>
  const cardBlockRegex = /<(?:article|div|li)[^>]*class=["'][^"']*(?:item|movie|post|film|card|poster)[^"']*["'][^>]*>(.*?)<\/(?:article|div|li)>/gis;

  let match;
  while ((match = cardBlockRegex.exec(html)) !== null) {
    const block = match[1];

    // Extract Title
    const titleMatch = block.match(/<(?:h2|h3|h4|span|a)[^>]*class=["'][^"']*(?:title|entry-title|name)[^"']*[^>]*>(?:<a[^>]*>)?([^<]+)/i) ||
      block.match(/title=["']([^"']+)["']/i) ||
      block.match(/alt=["']([^"']+)["']/i);
    const rawTitle = titleMatch ? titleMatch[1].trim() : '';
    const cleanTitle = cleanMovieTitle(rawTitle);
    if (!cleanTitle || cleanTitle.length < 2) continue;

    // Extract Link
    const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["']/i);
    let link = linkMatch ? linkMatch[1] : '';
    if (!link || link.startsWith('#') || link.startsWith('javascript:')) continue;
    if (link.startsWith('/')) link = cleanBase + link;

    // Extract Poster
    const posterMatch = block.match(/<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["']/i);
    let poster = posterMatch ? posterMatch[1] : '';
    if (poster.startsWith('//')) poster = 'https:' + poster;
    if (poster.startsWith('/')) poster = cleanBase + poster;

    // Extract Rating / IMDb
    const ratingMatch = block.match(/class=["'][^"']*(?:rating|imdb|score)[^"']*["'][^>]*>([^<]+)/i) ||
      block.match(/<span[^>]*class=["'][^"']*star[^"']*["'][^>]*>([^<]+)/i);
    const imdb = ratingMatch ? ratingMatch[1].trim().replace(/[^\d.]/g, '') : '8.0';

    // Extract Quality (4K, HD, 1080p, etc.)
    const qualityMatch = block.match(/class=["'][^"']*(?:quality|res|hd)[^"']*["'][^>]*>([^<]+)/i) ||
      block.match(/<(?:span|div)[^>]*>([1-4]k|1080p|720p|hd|cam|dvd)<\/(?:span|div)>/i);
    const quality = qualityMatch ? qualityMatch[1].trim().toUpperCase() : 'HD';

    // Extract Year
    const yearMatch = cleanTitle.match(/\b(19\d\d|20\d\d)\b/) || block.match(/class=["'][^"']*(?:year|date)[^"']*["'][^>]*>([^<]+)/i);
    const year = yearMatch ? yearMatch[1].trim() : '2026';

    // Avoid duplicates
    if (!movies.some(m => m.link === link || m.title.toLowerCase() === cleanTitle.toLowerCase())) {
      movies.push({
        title: cleanTitle,
        link,
        poster: poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
        quality,
        imdb: imdb || '7.8',
        year,
        duration: '130 min',
        genre: 'Action, Cinema',
        description: `Watch ${cleanTitle} in crystal clear HD with zero ads.`
      });
    }

    if (movies.length >= 60) break;
  }

  return movies;
}
