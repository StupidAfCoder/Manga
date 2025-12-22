const express = require('express');
const router = express.Router();
const Manga = require('../models/Manga');

// GET / - Home page with featured manga
router.get('/', async (req, res) => {
  try {
    // Get recent manga
    const recentManga = await Manga.find()
      .sort({ createdAt: -1 })
      .limit(8);

    // Get top rated
    const topRated = await Manga.find()
      .sort({ averageRating: -1, ratingCount: -1 })
      .limit(6);

    res.render('index', { 
      title: 'MangaVerse - Your Manga Community',
      recentManga,
      topRated
    });
  } catch (error) {
    console.error(error);
    res.render('index', { 
      title: 'MangaVerse',
      recentManga: [],
      topRated: []
    });
  }
});

// NOTE: Trending page removed - route intentionally omitted

// GET /top-rated - Top rated manga page
router.get('/top-rated', async (req, res) => {
  try {
    const topManga = await Manga.find({ ratingCount: { $gt: 0 } })
      .sort({ averageRating: -1, ratingCount: -1 })
      .limit(20);

    res.render('top-rated', { 
      title: 'Top Rated Manga',
      manga: topManga
    });
  } catch (error) {
    console.error(error);
    res.render('top-rated', { 
      title: 'Top Rated Manga',
      manga: []
    });
  }
});

// GET /search - Search manga
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    let results = [];

    if (query) {
      results = await Manga.find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { author: { $regex: query, $options: 'i' } },
          { genres: { $regex: query, $options: 'i' } }
        ]
      }).limit(20);
    }

    res.render('search', { 
      title: 'Search Results',
      query,
      results
    });
  } catch (error) {
    console.error(error);
    res.render('search', { 
      title: 'Search',
      query: '',
      results: []
    });
  }
});

// GET /search/suggestions - JSON autocomplete suggestions
router.get('/search/suggestions', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    // Find candidate documents by loose regex (title / author / genres)
    const candidates = await Manga.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } },
        { genres: { $regex: q, $options: 'i' } }
      ]
    }).limit(50).lean();

    const qLower = q.toLowerCase();

    // Simple Levenshtein distance for basic fuzzy ranking
    function levenshtein(a, b) {
      const m = a.length, n = b.length;
      const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
      for (let i = 0; i <= m; i++) dp[i][0] = i;
      for (let j = 0; j <= n; j++) dp[0][j] = j;
      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
      }
      return dp[m][n];
    }

    // Score candidates by simple heuristics then by fuzzy distance
    const scored = candidates.map(c => {
      const title = (c.title || '').toString();
      const author = (c.author || '').toString();
      const titleLower = title.toLowerCase();
      let score = 0;

      if (titleLower.startsWith(qLower)) score += 200;
      else if (titleLower.includes(qLower)) score += 150;

      if (author.toLowerCase().includes(qLower)) score += 60;

      // Subtract normalized edit distance (lower is better)
      const dist = levenshtein(titleLower, qLower);
      score -= dist;

      return { doc: c, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 8).map(s => ({
      id: s.doc._id,
      title: s.doc.title,
      author: s.doc.author || '',
      cover: s.doc.cover || ''
    }));

    res.json(top);
  } catch (error) {
    console.error('Suggestion error', error);
    res.status(500).json([]);
  }
});

module.exports = router;
