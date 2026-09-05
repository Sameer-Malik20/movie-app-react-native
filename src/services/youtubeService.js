// 100% Serverless YouTube Service for CinePremium Mobile
// Fetches official YouTube data (Search, Trending, Categories) directly via InnerTube API

const INNERTUBE_CLIENT = {
  clientName: 'WEB',
  clientVersion: '2.20240313.01.00',
  hl: 'en',
  gl: 'IN',
};

// Rich offline fallback cache for immediate offline responsiveness
const FALLBACK_YOUTUBE_VIDEOS = [
  {
    id: 'QI7nGLrHu4g',
    videoId: 'QI7nGLrHu4g',
    title: 'Special 26 (2013) Full Movie | Akshay Kumar, Manoj Bajpayee | Hindi Crime Thriller',
    thumbnail: 'https://i.ytimg.com/vi/QI7nGLrHu4g/hqdefault.jpg',
    channel: 'Goldmines Movies',
    duration: '2:08:15',
    views: '10.7M views',
    publishedTime: '1 year ago',
    category: 'movies',
    isYouTube: true,
  },
  {
    id: 'd96cjJhvlMA',
    videoId: 'd96cjJhvlMA',
    title: 'KGF Chapter 2 Official Trailer (Hindi) | Yash, Sanjay Dutt, Raveena, Prashanth Neel',
    thumbnail: 'https://i.ytimg.com/vi/d96cjJhvlMA/hqdefault.jpg',
    channel: 'Hombale Films',
    duration: '2:56',
    views: '125M views',
    publishedTime: '2 years ago',
    category: 'trailers',
    isYouTube: true,
  },
  {
    id: 'g2jiBmIGwD4',
    videoId: 'g2jiBmIGwD4',
    title: 'Allu Arjun Blockbuster Mass Action Movie Hindi Dubbed | South Action Hit',
    thumbnail: 'https://i.ytimg.com/vi/g2jiBmIGwD4/hqdefault.jpg',
    channel: 'Dhamaka Tv',
    duration: '2:28:33',
    views: '10.9M views',
    publishedTime: '9 months ago',
    category: 'movies',
    isYouTube: true,
  },
  {
    id: 'd0U3qK8z4n8',
    videoId: 'd0U3qK8z4n8',
    title: 'Tauba Tauba | Bad Newz | Vicky Kaushal | Karan Aujla | Official Song',
    thumbnail: 'https://i.ytimg.com/vi/d0U3qK8z4n8/hqdefault.jpg',
    channel: 'Saregama Music',
    duration: '3:20',
    views: '180M views',
    publishedTime: '6 months ago',
    category: 'music',
    isYouTube: true,
  },
  {
    id: 'kJQP7kiw5Fk',
    videoId: 'kJQP7kiw5Fk',
    title: 'Luis Fonsi - Despacito ft. Daddy Yankee',
    thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    channel: 'Luis Fonsi',
    duration: '4:42',
    views: '8.5B views',
    publishedTime: '7 years ago',
    category: 'music',
    isYouTube: true,
  },
  {
    id: 'Xb2n5r9Q2h8',
    videoId: 'Xb2n5r9Q2h8',
    title: 'Pushpa 2: The Rule - Official Hindi Trailer | Allu Arjun, Rashmika Mandanna',
    thumbnail: 'https://i.ytimg.com/vi/Xb2n5r9Q2h8/hqdefault.jpg',
    channel: 'T-Series',
    duration: '2:48',
    views: '64M views',
    publishedTime: '3 months ago',
    category: 'trailers',
    isYouTube: true,
  },
  {
    id: 'fJ9rUzIMcZQ',
    videoId: 'fJ9rUzIMcZQ',
    title: 'Queen (2014) Full Movie | Kangana Ranaut, Rajkummar Rao | Comedy Drama',
    thumbnail: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    channel: 'Viacom18 Studios',
    duration: '2:24:10',
    views: '32M views',
    publishedTime: '4 years ago',
    category: 'comedy',
    isYouTube: true,
  }
];

export const YOUTUBE_CATEGORIES = [
  { id: 'all', label: '🔥 All Trending', query: 'trending hindi movies songs trailers' },
  { id: 'movies', label: '🎬 Hindi Movies', query: 'bollywood full movie hindi dubbed mass action' },
  { id: 'trailers', label: '🍿 Trailers & Teasers', query: 'latest official movie trailers teasers 2025 2026' },
  { id: 'music', label: '🎵 Music Hits', query: 'trending top bollywood songs hindi hit music' },
  { id: 'comedy', label: '😂 Standup & Comedy', query: 'best hindi standup comedy clips movies funny' },
  { id: 'shorts', label: '⚡ Viral Moments', query: 'viral video clips hindi shorts trending' },
];

/**
 * Real-time YouTube search directly using InnerTube endpoint
 */
export const searchYouTube = async (query) => {
  if (!query || !query.trim()) return [];

  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({
        context: {
          client: INNERTUBE_CLIENT,
        },
        query: query.trim(),
      }),
    });

    if (!response.ok) {
      throw new Error(`YouTubei search returned status ${response.status}`);
    }

    const json = await response.json();
    const sections =
      json.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const results = [];
    for (const sec of sections) {
      const items = sec.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId) {
          const videoId = v.videoId;
          results.push({
            id: videoId,
            videoId: videoId,
            title: v.title?.runs?.map((r) => r.text).join('') || 'YouTube Video',
            thumbnail:
              v.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
              `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            channel: v.ownerText?.runs?.[0]?.text || 'YouTube Creator',
            channelAvatar:
              v.channelThumbnailSupportedRendered?.channelThumbnailWithLinkRenderer?.thumbnail
                ?.thumbnails?.[0]?.url,
            duration: v.lengthText?.simpleText || 'Video',
            views:
              v.viewCountText?.simpleText ||
              (v.shortViewCountText?.simpleText ? `${v.shortViewCountText.simpleText} views` : ''),
            publishedTime: v.publishedTimeText?.simpleText || '',
            isYouTube: true,
          });
        }
      }
    }

    return results.length > 0 ? results : FALLBACK_YOUTUBE_VIDEOS;
  } catch (error) {
    console.log('YouTube Search Error:', error.message);
    const lowerQuery = query.toLowerCase();
    const matches = FALLBACK_YOUTUBE_VIDEOS.filter(
      (v) =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.channel.toLowerCase().includes(lowerQuery)
    );
    return matches.length > 0 ? matches : FALLBACK_YOUTUBE_VIDEOS;
  }
};

/**
 * Fetch YouTube category feeds (Trending, Movies, Music, Trailers, etc.)
 */
export const fetchYouTubeCategory = async (categoryId = 'all') => {
  const cat = YOUTUBE_CATEGORIES.find((c) => c.id === categoryId) || YOUTUBE_CATEGORIES[0];
  try {
    const results = await searchYouTube(cat.query);
    return results && results.length > 0 ? results : FALLBACK_YOUTUBE_VIDEOS;
  } catch (e) {
    console.log('Category fetch error:', e.message);
    return FALLBACK_YOUTUBE_VIDEOS.filter((v) => v.category === categoryId || categoryId === 'all');
  }
};

/**
 * Extract YouTube ID from any YouTube URL (short, standard, embed)
 */
export const extractYouTubeId = (url) => {
  if (!url) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/
  );
  return match ? match[1] : null;
};
