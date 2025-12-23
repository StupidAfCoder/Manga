const express = require('express');
const router = express.Router();
const Thread = require('../models/Thread');
const Manga = require('../models/Manga');
const { isAuthenticated } = require('../middleware/auth');

// GET /discussions - List all discussion threads
// GET /discussions - List all discussion threads with Search
// GET /discussions - List all threads (Search by Title, Content, or Manga Name)
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let dbQuery = {};

    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(safeSearch, 'i'); // Case-insensitive regex

      // STEP 1: Find any Manga that matches the search name
      const matchingMangas = await Manga.find({ title: regex }).select('_id');
      const matchingMangaIds = matchingMangas.map(m => m._id);

      // STEP 2: Find Threads that match Title OR Content OR the Found Manga IDs
      dbQuery = {
        $or: [
          { title: regex },                  // Match Thread Title
          { content: regex },                // Match Thread Content
          { manga: { $in: matchingMangaIds } } // Match Manga Name
        ]
      };
    }

    const threads = await Thread.find(dbQuery)
      .populate('user', 'username')
      .populate('manga', 'title coverImage')
      .sort({ updatedAt: -1 })
      .limit(20);

    res.render('discussions/list', { 
      title: 'Discussions',
      threads,
      search: search || '' 
    });

  } catch (error) {
    console.error(error);
    res.render('discussions/list', { 
      title: 'Discussions', 
      threads: [], 
      search: '' 
    });
  }
});

// GET /discussions/create - Show create thread form
router.get('/create', isAuthenticated, async (req, res) => {
  try {
    const manga = await Manga.find().sort({ title: 1 });
    res.render('discussions/create', { 
      title: 'Create Discussion',
      manga
    });
  } catch (error) {
    console.error(error);
    res.redirect('/discussions');
  }
});

// POST /discussions/create - Create new thread (CRUD: Create)
router.post('/create', isAuthenticated, async (req, res) => {
  try {
    const { manga, title, content } = req.body;

    if (!manga || !title || !content) {
      req.flash('error', 'All fields are required');
      return res.redirect('/discussions/create');
    }

    const thread = new Thread({
      manga,
      user: req.session.user.id,
      title,
      content
    });

    await thread.save();
    req.flash('success', 'Discussion created successfully!');
    res.redirect(`/discussions/${thread._id}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error creating discussion');
    res.redirect('/discussions/create');
  }
});

// GET /discussions/:id - View thread details
router.get('/:id', async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id)
      .populate('user', 'username')
      .populate('manga', 'title coverImage')
      .populate('replies.user', 'username');

    if (!thread) {
      req.flash('error', 'Discussion not found');
      return res.redirect('/discussions');
    }

    // Increment views
    thread.views += 1;
    await thread.save();

    res.render('discussions/detail', { 
      title: thread.title,
      thread
    });
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error loading discussion');
    res.redirect('/discussions');
  }
});

// POST /discussions/:id/reply - Add reply to thread (CRUD: Create)
router.post('/:id/reply', isAuthenticated, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      req.flash('error', 'Reply content is required');
      return res.redirect(`/discussions/${req.params.id}`);
    }

    const thread = await Thread.findById(req.params.id);
    if (!thread) {
      req.flash('error', 'Discussion not found');
      return res.redirect('/discussions');
    }

    thread.replies.push({
      user: req.session.user.id,
      content
    });

    await thread.save();
    req.flash('success', 'Reply added successfully!');
    res.redirect(`/discussions/${req.params.id}`);
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error adding reply');
    res.redirect(`/discussions/${req.params.id}`);
  }
});

// DELETE /discussions/:id - Delete thread (CRUD: Delete)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      req.flash('error', 'Discussion not found');
      return res.redirect('/discussions');
    }

    // Check if user owns the thread
    if (thread.user.toString() !== req.session.user.id) {
      req.flash('error', 'You can only delete your own discussions');
      return res.redirect('/discussions');
    }

    await Thread.findByIdAndDelete(req.params.id);
    req.flash('success', 'Discussion deleted successfully');
    res.redirect('/discussions');
  } catch (error) {
    console.error(error);
    req.flash('error', 'Error deleting discussion');
    res.redirect('/discussions');
  }
});


module.exports = router;
