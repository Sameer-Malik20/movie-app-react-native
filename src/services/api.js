// 100% Serverless Direct Scraper Engine for CinePremium Mobile App
// Bridges Provider Manager and Universal Sniffers with offline fallback cache

import { providerManager, PROVIDER_PRESETS } from './engines/providerManager.js';
import { cleanMovieTitle } from './engines/universalSniffer.js';

export { providerManager, PROVIDER_PRESETS, cleanMovieTitle };

export const setSiteDomain = (domain) => {
  providerManager.setBaseUrl(domain);
};

export const getSiteDomain = () => {
  return providerManager.getBaseUrl();
};

// High quality offline fallback cache
const FALLBACK_MOVIES = [
  {
    title: 'Toxic (2026) Hindi Dubbed',
    link: 'https://hindilinks4u.estate/toxic-2026-hindi-dubbed-Watch-online-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjEzODY2MjU1Nl5BMl5BanBnXkFtZTcwMzc1ODUzNg@@._V1_FMjpg_UX613_.jpg',
    quality: '4K UHD',
    imdb: '8.4',
    year: '2026',
    duration: '164 min',
    genre: 'Action, Crime, Thriller',
    description: 'A fairy tale for grown-ups set against the underworld drug and gang cartels with high stakes action.'
  },
  {
    title: 'Dhurandhar: The Revenge (2026)',
    link: 'https://hindilinks4u.estate/dhurandhar-the-revenge-2026-Watch-online-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BM2Y2MjE4ZjAtMDlmZS00MTRmLTk5NDQtNDM4YWYwODJiMmZmXkEyXkFqcGc@._V1_FMjpg_UY711_.jpg',
    quality: 'HINDI',
    imdb: '7.9',
    year: '2026',
    duration: '148 min',
    genre: 'Action, Thriller',
    description: 'An elite undercover agent embarks on a dangerous covert mission across international borders.'
  },
  {
    title: 'Deadpool & Wolverine (2024)',
    link: 'https://hindilinks4u.estate/deadpool-wolverine-2024-hindi-dubbed-Watch-online-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BOTY3MjNhMTAtZWEwYy00NDM3LTljNzYtMDA0NGVlZjNiMzhiXkEyXkFqcGc@._V1_FMjpg_UY672_.jpg',
    quality: 'DUAL AUDIO',
    imdb: '8.1',
    year: '2024',
    duration: '128 min',
    genre: 'Action, Comedy, Sci-Fi',
    description: 'Wolverine is recovering from his injuries when he crosses paths with the loudmouth Deadpool.'
  },
  {
    title: 'Money Plane (2020) Hindi Dubbed',
    link: 'https://hindilinks4u.estate/money-plane-2020-hindi-dubbed-Watch-online-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BZWE1OTg5ZDMtYjllZC00YzE2LTg1N2UtZmI0OTBmMWE3NzFkXkEyXkFqcGc@._V1_FMjpg_UY600_.jpg',
    quality: 'HD',
    imdb: '6.8',
    year: '2020',
    duration: '82 min',
    genre: 'Action, Crime',
    description: 'A professional thief with 40 million in debt and his family\'s life on the line must commit one final heist.'
  },
  {
    title: 'War 2 (2025) Hindi',
    link: 'https://hindilinks4u.estate/war-2-2025-hindi-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BNmU4M2E4MTctZjg1MS00YjBhLWE1NDgtYmI0NmVhNGQzMWY1XkEyXkFqcGc@._V1_FMjpg_UY600_.jpg',
    quality: '1080P FHD',
    imdb: '8.2',
    year: '2025',
    duration: '155 min',
    genre: 'Action, Thriller',
    description: 'Major Kabir Dhaliwal and Colonel Luthra face an extraordinary new international syndicate.'
  },
  {
    title: 'Avatar: Fire and Ash (2025)',
    link: 'https://hindilinks4u.estate/avatar-3-fire-and-ash-2025-hindi-dubbed-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BYzA2Nzk5M2EtNWY4Yi00ZDY4LThkZTgtYjE1Nzg4NmQ0OGQzXkEyXkFqcGc@._V1_FMjpg_UY720_.jpg',
    quality: '4K DOLBY',
    imdb: '8.7',
    year: '2025',
    duration: '190 min',
    genre: 'Sci-Fi, Adventure',
    description: 'Jake Sully and Neytiri encounter the Ash People, a nomadic fire tribe of Na\'vi.'
  },
  {
    title: 'KGF Chapter 3 (2025)',
    link: 'https://hindilinks4u.estate/kgf-chapter-3-2025-hindi-dubbed-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BMjA4NTAyODY1Ml5BMl5BanBnXkFtZTgwNzYwNDgzODE@._V1_FMjpg_UX600_.jpg',
    quality: '4K UHD',
    imdb: '8.9',
    year: '2025',
    duration: '172 min',
    genre: 'Action, Period Drama',
    description: 'Rocky Bhai expands his rule across global ports while facing intelligence agencies and international mafias.'
  },
  {
    title: 'Spider-Man: Beyond the Spider-Verse',
    link: 'https://hindilinks4u.estate/spider-man-beyond-the-spider-verse-2025-hindi-dubbed/',
    poster: 'https://m.media-amazon.com/images/M/MV5BNTA2NDU3OWEtMjE4Ni00NjQ4LWJjZTQtZGVmMDY0ZTExZDA2XkEyXkFqcGc@._V1_FMjpg_UY720_.jpg',
    quality: 'DUAL AUDIO',
    imdb: '8.8',
    year: '2025',
    duration: '140 min',
    genre: 'Animation, Action, Adventure',
    description: 'Miles Morales traverses the multiverse to save the people he loves from catastrophic collapse.'
  },
  {
    title: 'Pushpa 2: The Rule (2024)',
    link: 'https://hindilinks4u.estate/pushpa-2-the-rule-2024-hindi-dubbed-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BNWQzY2IzMzMtOThhYi00MjkzLWIxYmEtMjljZDQ0MTEzNTk5XkEyXkFqcGc@._V1_FMjpg_UY600_.jpg',
    quality: 'HINDI',
    imdb: '8.0',
    year: '2024',
    duration: '180 min',
    genre: 'Action, Crime',
    description: 'Pushpa Raj commands the red sandalwood smuggling empire while Bhanwar Singh Shekhawat seeks retribution.'
  },
  {
    title: 'Fighter (2024) Hindi',
    link: 'https://hindilinks4u.estate/fighter-2024-hindi-full-movie/',
    poster: 'https://m.media-amazon.com/images/M/MV5BZWYzOGEwNTgtNWU3NS00ZTQ0LWJkODUtMmVhMjVhY2E4ZGJmXkEyXkFqcGc@._V1_FMjpg_UY600_.jpg',
    quality: '1080P FHD',
    imdb: '7.6',
    year: '2024',
    duration: '166 min',
    genre: 'Action, War',
    description: 'Top Indian Air Force aviators come together for a specialized counter-terror task force.'
  }
];

// In-Memory Live Cache
const cache = {
  explore: new Map(),
  search: new Map(),
  details: new Map()
};

/**
 * 1. Fetch Explore / Categorized Movies
 */
export const fetchExploreMovies = async (category = 'latest') => {
  const cacheKey = `${providerManager.getBaseUrl()}_${category}`;
  if (cache.explore.has(cacheKey)) {
    return cache.explore.get(cacheKey);
  }

  try {
    const movies = await providerManager.fetchExplore(category);
    if (movies && movies.length > 0) {
      cache.explore.set(cacheKey, movies);
      return movies;
    }
  } catch (e) {
    console.log('fetchExploreMovies error:', e.message);
  }

  return FALLBACK_MOVIES;
};

/**
 * 2. Search Movies by Keyword
 */
export const searchMoviesApi = async (query) => {
  if (!query || !query.trim()) return [];
  const cacheKey = `${providerManager.getBaseUrl()}_${query.trim().toLowerCase()}`;
  if (cache.search.has(cacheKey)) {
    return cache.search.get(cacheKey);
  }

  try {
    const matches = await providerManager.searchMovies(query);
    if (matches && matches.length > 0) {
      cache.search.set(cacheKey, matches);
      return matches;
    }
  } catch (e) {
    console.log('searchMoviesApi error:', e.message);
  }

  // Fallback keyword filter
  const q = query.toLowerCase();
  return FALLBACK_MOVIES.filter(m => m.title.toLowerCase().includes(q));
};

/**
 * 3. Scrape Movie Details and Direct VIP Video Stream
 */
export const scrapeMovieDetails = async (movieUrl) => {
  if (!movieUrl) {
    return {
      title: 'Movie Stream',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      referer: providerManager.getBaseUrl(),
      details: {}
    };
  }

  if (cache.details.has(movieUrl)) {
    return cache.details.get(movieUrl);
  }

  try {
    const result = await providerManager.scrapeDetails(movieUrl);
    if (result && result.streamUrl) {
      cache.details.set(movieUrl, result);
      return result;
    }
  } catch (e) {
    console.log('scrapeMovieDetails error:', e.message);
  }

  return {
    title: 'CinePremium VIP Stream',
    poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    referer: providerManager.getBaseUrl(),
    link: movieUrl,
    details: {
      IMDb: '8.4',
      Year: '2026',
      Quality: '4K Ultra HD',
      Audio: 'Hindi 5.1 / Dolby Digital'
    }
  };
};

/**
 * 4. Get Top 10 Trending Movies
 */
export const getTop10Movies = async () => {
  const all = await fetchExploreMovies('latest');
  return all.slice(0, 10);
};

/**
 * 5. Extract franchise keyword to find next parts, seasons, sequels
 */
export const extractFranchiseKeyword = (rawTitle) => {
  if (!rawTitle) return '';
  const clean = cleanMovieTitle(rawTitle);
  const base = clean
    .replace(/\b(19\d\d|20\d\d)\b/g, '')
    .replace(/\b(season\s*\d+|part\s*\d+|chapter\s*\d+|episode\s*\d+)\b/gi, '')
    .replace(/\b(hindi\s*dubbed|dual\s*audio|hindi|telugu|tamil|punjabi|english)\b/gi, '')
    .replace(/[:\-–—].*$/, '')
    .replace(/\b(2|3|4|5|6|7|8|9|ii|iii|iv|v)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();

  return base.length >= 3 ? base : '';
};

/**
 * 6. Fetch Next Parts, Franchise Sequels and Genre-Related Movies
 */
export const fetchSimilarAndSequels = async (movie, details) => {
  const currentTitle = details?.title || movie?.title || '';
  const currentLink = movie?.link || movie?.url || details?.link || '';
  const currentGenre = (details?.details?.Genre || movie?.genre || '').toLowerCase();
  
  const results = [];
  const seenIds = new Set();
  if (currentLink) seenIds.add(currentLink);
  if (currentTitle) seenIds.add(cleanMovieTitle(currentTitle).toLowerCase());

  // 1. Next Part / Franchise Sequels / Episodes Search
  const franchiseWord = extractFranchiseKeyword(currentTitle);
  if (franchiseWord && franchiseWord.length >= 3) {
    try {
      const franchiseMatches = await searchMoviesApi(franchiseWord);
      for (const item of franchiseMatches) {
        const itemLink = item.link || item.url || '';
        const itemTitle = cleanMovieTitle(item.title || '').toLowerCase();
        if (!seenIds.has(itemLink) && !seenIds.has(itemTitle)) {
          seenIds.add(itemLink);
          seenIds.add(itemTitle);
          results.push(item);
        }
      }
    } catch (e) {}
  }

  // 2. Exact Genre Matching
  let targetCategory = 'latest';
  if (currentGenre.includes('action')) targetCategory = 'action';
  else if (currentGenre.includes('comedy')) targetCategory = 'comedy';
  else if (currentGenre.includes('thriller') || currentGenre.includes('crime')) targetCategory = 'thriller';
  else if (currentGenre.includes('sci-fi') || currentGenre.includes('science')) targetCategory = 'sci-fi';
  else if (currentGenre.includes('bollywood') || currentGenre.includes('hindi')) targetCategory = 'bollywood';
  else if (currentGenre.includes('hollywood') || currentGenre.includes('english')) targetCategory = 'hollywood';
  else if (currentGenre.includes('dual')) targetCategory = 'dual-audio';

  try {
    const genreMatches = await fetchExploreMovies(targetCategory);
    for (const item of genreMatches) {
      const itemLink = item.link || item.url || '';
      const itemTitle = cleanMovieTitle(item.title || '').toLowerCase();
      if (!seenIds.has(itemLink) && !seenIds.has(itemTitle)) {
        seenIds.add(itemLink);
        seenIds.add(itemTitle);
        results.push(item);
      }
    }
  } catch (e) {}

  // 3. Fallback to top-rated if needed
  if (results.length < 6) {
    try {
      const topRated = await fetchExploreMovies('top-rated');
      for (const item of topRated) {
        const itemLink = item.link || item.url || '';
        const itemTitle = cleanMovieTitle(item.title || '').toLowerCase();
        if (!seenIds.has(itemLink) && !seenIds.has(itemTitle)) {
          seenIds.add(itemLink);
          seenIds.add(itemTitle);
          results.push(item);
        }
      }
    } catch (e) {}
  }

  return results.slice(0, 16);
};
