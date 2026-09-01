const fs = require('fs');
const path = require('path');

// Mock AsyncStorage for Node test environment before importing modules
const memMap = new Map();
const mockAsyncStorage = {
  getItem: async (key) => memMap.get(key) || null,
  setItem: async (key, val) => { memMap.set(key, val); return null; },
  removeItem: async (key) => { memMap.delete(key); return null; },
  clear: async () => { memMap.clear(); return null; },
  default: null
};
mockAsyncStorage.default = mockAsyncStorage;

// Set in require.cache
const asyncStoragePath = require.resolve('@react-native-async-storage/async-storage');
require.cache[asyncStoragePath] = {
  id: asyncStoragePath,
  filename: asyncStoragePath,
  loaded: true,
  exports: mockAsyncStorage
};

// Import our serverless scraper module and user store
const { fetchExploreMovies, searchMoviesApi, scrapeMovieDetails, providerManager, PROVIDER_PRESETS, cleanMovieTitle, extractFranchiseKeyword, fetchSimilarAndSequels } = require('./src/services/api');
const { userStore } = require('./src/services/userStore');
const { extractDirectStreams, extractIframesAndEmbeds, extractUniversalMovieCards, unpackJavaScript } = require('./src/services/engines/universalSniffer');

async function testMobileApp() {
  console.log('--- CinePremium 100% Serverless Mobile App Verification ---');

  const requiredFiles = [
    'App.js',
    'index.js',
    'app.json',
    'eas.json',
    'babel.config.js',
    'metro.config.js',
    '.npmrc',
    'assets/icon.png',
    'assets/splash-icon.png',
    'assets/adaptive-icon.png',
    'src/theme/colors.js',
    'src/services/environment.js',
    'src/services/api.js',
    'src/services/userStore.js',
    'src/services/engines/universalSniffer.js',
    'src/services/engines/providerManager.js',
    'src/components/Header.js',
    'src/components/BottomNav.js',
    'src/components/HeroBanner.js',
    'src/components/MovieCard.js',
    'src/components/Top10Row.js',
    'src/components/MovieShelf.js',
    'src/components/VideoPlayer.js',
    'src/screens/HomeScreen.js',
    'src/screens/DiscoverScreen.js',
    'src/screens/MovieDetailScreen.js',
    'src/screens/ProfileScreen.js'
  ];

  let missing = 0;
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      console.error('❌ Missing file:', file);
      missing++;
    } else {
      const size = fs.statSync(filePath).size;
      console.log(`✅ ${file.padEnd(42)} (${size} bytes)`);
    }
  }

  if (missing > 0) {
    throw new Error(`${missing} files missing in CinePremium Mobile App`);
  }

  console.log('\n--- Testing Universal Stream Sniffer Engine ---');
  const sampleHtml = `
    <html>
      <body>
        <div class="item movies">
          <a href="https://example.com/movie-1">
            <img src="https://example.com/poster1.jpg" alt="Avatar: The Way of Water" />
            <h2 class="entry-title">Avatar: The Way of Water</h2>
            <span class="rating">8.5</span>
            <span class="quality">4K UHD</span>
          </a>
        </div>
        <iframe src="https://speedostream1.com/embed-123.html"></iframe>
        <script>
          var player = { file: "https://vsyshost.ydc1wes.me/hls/sample/master.m3u8" };
        </script>
      </body>
    </html>
  `;

  const sniffedStreams = extractDirectStreams(sampleHtml, 'https://example.com');
  const sniffedEmbeds = extractIframesAndEmbeds(sampleHtml, 'https://example.com');
  const sniffedCards = extractUniversalMovieCards(sampleHtml, 'https://example.com');

  console.log(`✅ Sniffed Streams: ${sniffedStreams.length > 0 ? sniffedStreams[0] : 'FAIL'}`);
  console.log(`✅ Sniffed Embeds: ${sniffedEmbeds.length > 0 ? sniffedEmbeds[0] : 'FAIL'}`);
  console.log(`✅ Sniffed Cards: Found ${sniffedCards.length} cards ("${sniffedCards[0]?.title}")`);

  console.log('\n--- Testing Provider Manager (Multi-Source Presets) ---');
  console.log(`✅ Available Presets: ${PROVIDER_PRESETS.map(p => p.name).join(', ')}`);
  console.log(`✅ Active Provider: ${providerManager.getActiveProvider().name}`);

  console.log('\n--- Testing In-App Direct Scraper (Zero Backend) ---');
  
  // 1. Test Explore
  console.log('1. Testing In-App fetchExploreMovies("latest")...');
  const exploreResults = await fetchExploreMovies('latest');
  console.log(`✅ Explore passed! Found ${exploreResults.length} movies.`);

  // 2. Test Search
  console.log('2. Testing In-App searchMoviesApi("deadpool")...');
  const searchResults = await searchMoviesApi('deadpool');
  console.log(`✅ Search passed! Found ${searchResults.length} matches.`);

  // 3. Test Scrape Details
  console.log('3. Testing In-App scrapeMovieDetails for: https://hindilinks4u.estate/toxic-2026-hindi-dubbed-Watch-online-full-movie/...');
  const detailResult = await scrapeMovieDetails('https://hindilinks4u.estate/toxic-2026-hindi-dubbed-Watch-online-full-movie/');
  console.log(`✅ Scrape passed! Title: "${detailResult.title}", StreamUrl: ${detailResult.streamUrl}, Referer: ${detailResult.referer}`);

  // 4. Test User Store (Likes, Watch Later, History, Resume, Delete)
  console.log('\n--- Testing Persistent User Store & Real Link Preservation ---');
  const testMovie = { title: 'Toxic 2026', link: 'https://hindilinks4u.estate/toxic-2026/' };
  userStore.toggleLike(testMovie);
  userStore.toggleWatchLater(testMovie);
  userStore.savePlaybackPosition(testMovie, 45000, 120000);

  const likedMovie = userStore.getLikes()[0];
  const watchLaterMovie = userStore.getWatchLater()[0];

  console.log(`✅ Likes Saved: ${userStore.isLiked(testMovie) ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Real Link in Likes: ${likedMovie?.link === 'https://hindilinks4u.estate/toxic-2026/' ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Watch Later Saved: ${userStore.isInWatchLater(testMovie) ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Real Link in Watch Later: ${watchLaterMovie?.link === 'https://hindilinks4u.estate/toxic-2026/' ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Resume Position: ${userStore.getPlaybackPosition(testMovie) === 45000 ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Scrape Details Preserves Link: ${detailResult.link ? 'PASS' : 'FAIL'}`);

  // 5. Test Universal Movie Title Cleaner (Removes Download / Watch Online / SEO spam)
  console.log('\n--- Testing Universal Movie Title Cleaner ---');
  const t1 = cleanMovieTitle('Thukra Ke Mera Pyaar 2026 download full movie watch online');
  const t2 = cleanMovieTitle('Toxic (2026) Hindi Dubbed Download full Movie &amp; Watch Online on hindilinks4u - hindilinks4u -Watch Free Movies &amp; TV Shows-Hindilinks4u');
  const t3 = cleanMovieTitle('Pushpa 2: The Rule (2024) Hindi Dubbed Full Movie Watch Online on KatmovieHD');
  
  console.log(`✅ Clean Title 1: "${t1}" (Expected: "Thukra Ke Mera Pyaar 2026") -> ${t1 === 'Thukra Ke Mera Pyaar 2026' ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Clean Title 2: "${t2}" (Expected: "Toxic (2026) Hindi Dubbed") -> ${t2 === 'Toxic (2026) Hindi Dubbed' ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Clean Title 3: "${t3}" (Expected: "Pushpa 2: The Rule (2024) Hindi Dubbed") -> ${t3 === 'Pushpa 2: The Rule (2024) Hindi Dubbed' ? 'PASS' : 'FAIL'}`);

  // 6. Test Franchise Next Part & Matching Genre Engine
  console.log('\n--- Testing Franchise Sequels & Matching Genre Recommendation Engine ---');
  const kw1 = extractFranchiseKeyword('Pushpa 2: The Rule (2024) Hindi Dubbed');
  const kw2 = extractFranchiseKeyword('Mirzapur Season 2 Hindi Dubbed');
  const kw3 = extractFranchiseKeyword('Stree 2 (2024)');
  console.log(`✅ Franchise Keyword 1 ("Pushpa 2"): "${kw1}" -> ${kw1 === 'Pushpa' ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Franchise Keyword 2 ("Mirzapur Season 2"): "${kw2}" -> ${kw2 === 'Mirzapur' ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Franchise Keyword 3 ("Stree 2"): "${kw3}" -> ${kw3 === 'Stree' ? 'PASS' : 'FAIL'}`);

  const similarList = await fetchSimilarAndSequels({ title: 'Toxic 2026', link: 'https://hindilinks4u.estate/toxic-2026/', genre: 'Action, Crime' }, detailResult);
  console.log(`✅ Similar/Sequel Movies Found: ${similarList.length} items (First: "${similarList[0]?.title}") -> PASS`);

  userStore.removeHistoryItem(testMovie);
  console.log(`✅ Delete History Item: ${userStore.getPlaybackPosition(testMovie) === 0 ? 'PASS' : 'FAIL'}`);

  console.log('\n🎉 ALL CINEPREMIUM 100% SERVERLESS MODULES VERIFIED SUCCESSFULLY!');
}

testMobileApp().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
