(function () {
  const articleEl = document.getElementById('post-content');
  const loadingEl = document.getElementById('post-loading');
  const errorEl = document.getElementById('post-error');
  const navEl = document.getElementById('post-nav');
  if (!articleEl) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) {
    if (loadingEl) loadingEl.hidden = true;
    if (errorEl) {
      errorEl.textContent = 'Post not found.';
      errorEl.hidden = false;
    }
    return;
  }

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const TABLE = 'Journal';

  function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function normalizeTags(t) {
    if (Array.isArray(t)) return t.map(String).map(function (s) { return s.trim(); }).filter(Boolean);
    if (typeof t === 'string') return t.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return [];
  }

  // Render body as sanitized markdown when the libs are present; otherwise fall
  // back to escaped plain text with line breaks.
  function renderBody(body) {
    const raw = body || '';
    if (window.marked && window.DOMPurify) {
      const html = window.marked.parse(raw);
      return window.DOMPurify.sanitize(html);
    }
    return escapeHtml(raw).replace(/\n/g, '<br>');
  }

  function tagsMarkup(tags) {
    if (!tags.length) return '';
    return '<div class="journal-tags">' + tags.map(function (t) {
      return '<span class="journal-tag">' + escapeHtml(t) + '</span>';
    }).join('') + '</div>';
  }

  function renderPost(post) {
    const tags = normalizeTags(post.tags);
    const hasViews = typeof post.views === 'number';
    articleEl.innerHTML =
      '<h1 class="journal-post-title">' + escapeHtml(post.title || 'Untitled') + '</h1>' +
      '<div class="journal-post-meta">' +
      (post.created_at ? '<time class="journal-post-date" datetime="' + escapeAttr(post.created_at) + '">' + formatDate(post.created_at) + '</time>' : '') +
      (hasViews ? '<span class="journal-post-views" id="post-views"><i class="fas fa-eye" aria-hidden="true"></i> ' + post.views + '</span>' : '<span class="journal-post-views" id="post-views" hidden></span>') +
      '</div>' +
      tagsMarkup(tags) +
      '<div class="journal-post-body journal-markdown">' + renderBody(post.body) + '</div>';
    articleEl.hidden = false;
  }

  // Fetch the ordered id/title list to build Newer/Older navigation.
  function renderPrevNext(currentId) {
    if (!navEl) return;
    supabase
      .from(TABLE)
      .select('id, title, created_at')
      .order('created_at', { ascending: false })
      .then(function (result) {
        if (result.error || !Array.isArray(result.data)) return;
        const posts = result.data;
        const idx = posts.findIndex(function (p) { return String(p.id) === String(currentId); });
        if (idx === -1) return;
        const newer = posts[idx - 1]; // list is newest first
        const older = posts[idx + 1];
        let html = '';
        if (newer) {
          html += '<a class="journal-post-nav-link prev" href="journal-post.html?id=' + encodeURIComponent(newer.id) + '">' +
            '<span class="journal-post-nav-dir">&larr; Newer</span>' +
            '<span class="journal-post-nav-title">' + escapeHtml(newer.title || 'Untitled') + '</span></a>';
        } else {
          html += '<span></span>';
        }
        if (older) {
          html += '<a class="journal-post-nav-link next" href="journal-post.html?id=' + encodeURIComponent(older.id) + '">' +
            '<span class="journal-post-nav-dir">Older &rarr;</span>' +
            '<span class="journal-post-nav-title">' + escapeHtml(older.title || 'Untitled') + '</span></a>';
        } else {
          html += '<span></span>';
        }
        navEl.innerHTML = html;
        navEl.hidden = false;
      })
      .catch(function () { /* nav is optional */ });
  }

  // Increment and display the view count. Does nothing if the RPC or column is not set up yet.
  function bumpViews(currentId) {
    supabase.rpc('increment_post_views', { post_id: Number(currentId) }).then(function (result) {
      if (result.error || result.data == null) return;
      const el = document.getElementById('post-views');
      if (el) {
        el.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i> ' + result.data;
        el.hidden = false;
      }
    }).catch(function () { /* view counting is optional */ });
  }

  supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle()
    .then(function (result) {
      if (loadingEl) loadingEl.hidden = true;
      if (result.error) {
        if (errorEl) {
          errorEl.textContent = result.error.message || 'Could not load post.';
          errorEl.hidden = false;
        }
        return;
      }
      const post = result.data;
      if (!post) {
        if (errorEl) {
          errorEl.textContent = 'Post not found.';
          errorEl.hidden = false;
        }
        return;
      }
      if (errorEl) errorEl.hidden = true;
      document.title = (post.title || 'Journal Entry') + ' | Zhejie Jiang';
      renderPost(post);
      renderPrevNext(id);
      bumpViews(id);
    })
    .catch(function (err) {
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) {
        errorEl.textContent = (err && err.message) ? err.message : 'Could not load post.';
        errorEl.hidden = false;
      }
    });
})();
