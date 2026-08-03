(function () {
  const listEl = document.getElementById('journal-list');
  const placeholderEl = document.getElementById('journal-placeholder');
  const searchEl = document.getElementById('journal-search');
  const filtersEl = document.getElementById('journal-filters');
  const controlsEl = document.getElementById('journal-controls');
  if (!listEl) return;

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const TABLE = 'Journal';

  let allPosts = [];
  let activeTag = null;
  let query = '';

  function showLoading() {
    if (placeholderEl) {
      placeholderEl.hidden = false;
      placeholderEl.textContent = 'Loading posts…';
      placeholderEl.classList.add('journal-loading');
    }
  }

  function showEmpty(msg) {
    if (placeholderEl) {
      placeholderEl.hidden = false;
      placeholderEl.textContent = msg || 'Journal entries coming soon.';
      placeholderEl.classList.remove('journal-loading', 'journal-error');
    }
  }

  function showError(msg) {
    if (placeholderEl) {
      placeholderEl.hidden = false;
      placeholderEl.textContent = msg || 'Could not load posts.';
      placeholderEl.classList.remove('journal-loading');
      placeholderEl.classList.add('journal-error');
    }
  }

  function formatDate(value) {
    if (value == null) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function escapeAttr(text) {
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  }

  // Tags may arrive as a Postgres text[] (array) or a comma separated string.
  function normalizeTags(t) {
    if (Array.isArray(t)) return t.map(String).map(function (s) { return s.trim(); }).filter(Boolean);
    if (typeof t === 'string') return t.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return [];
  }

  // Strip common markdown syntax so list excerpts read as plain text.
  function stripMarkdown(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .replace(/`{1,3}[^`]*`{1,3}/g, ' ')       // code
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')     // images
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')   // links become text
      .replace(/[*_~>#-]/g, ' ')                 // emphasis / headings / quotes / bullets
      .replace(/\s+/g, ' ')
      .trim();
  }

  function excerpt(text, maxLen) {
    const stripped = stripMarkdown(text);
    if (stripped.length <= maxLen) return stripped;
    return stripped.slice(0, maxLen) + '…';
  }

  function tagsMarkup(tags) {
    if (!tags.length) return '';
    return '<div class="journal-tags">' + tags.map(function (t) {
      return '<span class="journal-tag">' + escapeHtml(t) + '</span>';
    }).join('') + '</div>';
  }

  function cardMarkup(post) {
    const title = escapeHtml(post.title || 'Untitled');
    const dateStr = formatDate(post.created_at);
    const excerptStr = escapeHtml(excerpt(post.body, 115));
    const href = 'journal-post.html?id=' + encodeURIComponent(post.id);
    const tags = normalizeTags(post.tags);
    return (
      '<article class="journal-card">' +
      '<h3 class="journal-card-title"><a href="' + href + '">' + title + '</a></h3>' +
      (dateStr ? '<time class="journal-card-date" datetime="' + escapeAttr(post.created_at) + '">' + dateStr + '</time>' : '') +
      tagsMarkup(tags) +
      (excerptStr ? '<p class="journal-card-excerpt">' + excerptStr + '</p>' : '') +
      '<a href="' + href + '" class="journal-card-link">Read more</a>' +
      '</article>'
    );
  }

  function applyFilters() {
    const q = query.trim().toLowerCase();
    return allPosts.filter(function (post) {
      const tags = normalizeTags(post.tags);
      if (activeTag && tags.indexOf(activeTag) === -1) return false;
      if (q) {
        const hay = ((post.title || '') + ' ' + (post.body || '')).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function render() {
    const posts = applyFilters();
    if (posts.length === 0) {
      listEl.innerHTML = '';
      showEmpty(allPosts.length ? 'No entries match your filters.' : 'Journal entries coming soon.');
      return;
    }
    if (placeholderEl) placeholderEl.hidden = true;
    listEl.innerHTML = posts.map(cardMarkup).join('');
  }

  function buildFilters() {
    if (!filtersEl) return;
    const set = {};
    allPosts.forEach(function (p) {
      normalizeTags(p.tags).forEach(function (t) { set[t] = true; });
    });
    const tags = Object.keys(set).sort();
    if (!tags.length) {
      filtersEl.innerHTML = '';
      return;
    }
    const buttons = ['<button type="button" class="journal-filter active" data-tag="">All</button>']
      .concat(tags.map(function (t) {
        return '<button type="button" class="journal-filter" data-tag="' + escapeAttr(t) + '">' + escapeHtml(t) + '</button>';
      }));
    filtersEl.innerHTML = buttons.join('');
    filtersEl.addEventListener('click', function (e) {
      const btn = e.target.closest('.journal-filter');
      if (!btn) return;
      activeTag = btn.getAttribute('data-tag') || null;
      filtersEl.querySelectorAll('.journal-filter').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      render();
    });
  }

  if (searchEl) {
    searchEl.addEventListener('input', function () {
      query = searchEl.value;
      render();
    });
  }

  showLoading();
  supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false })
    .then(function (result) {
      if (result.error) {
        showError(result.error.message || 'Could not load posts.');
        return;
      }
      allPosts = result.data || [];
      if (allPosts.length === 0) {
        showEmpty();
        return;
      }
      if (controlsEl) controlsEl.hidden = false;
      buildFilters();
      render();
    })
    .catch(function (err) {
      showError(err && err.message ? err.message : 'Could not load posts.');
    });
})();
