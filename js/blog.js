(function () {
  const listEl = document.getElementById('blog-list');
  const placeholderEl = document.getElementById('blog-placeholder');
  if (!listEl) return;

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const TABLE = 'Blogs';

  function showLoading() {
    if (placeholderEl) {
      placeholderEl.textContent = 'Loading posts…';
      placeholderEl.classList.add('blog-loading');
    }
  }

  function showEmpty() {
    if (placeholderEl) {
      placeholderEl.textContent = 'Monthly blog coming soon.';
      placeholderEl.classList.remove('blog-loading', 'blog-error');
    }
  }

  function showError(msg) {
    if (placeholderEl) {
      placeholderEl.textContent = msg || 'Could not load posts.';
      placeholderEl.classList.remove('blog-loading');
      placeholderEl.classList.add('blog-error');
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

  function excerpt(text, maxLen) {
    if (!text || typeof text !== 'string') return '';
    const stripped = text.replace(/\s+/g, ' ').trim();
    if (stripped.length <= maxLen) return stripped;
    return stripped.slice(0, maxLen) + '…';
  }

  function renderList(posts) {
    if (!Array.isArray(posts) || posts.length === 0) {
      showEmpty();
      return;
    }
    if (placeholderEl) placeholderEl.hidden = true;

    listEl.innerHTML = posts.map(function (post) {
      const title = (post.title || 'Untitled').replace(/</g, '&lt;');
      const dateStr = formatDate(post.created_at);
      const excerptStr = excerpt(post.body, 115);
      const href = 'blog-post.html?id=' + encodeURIComponent(post.id);
      return (
        '<article class="blog-card">' +
        '<h3 class="blog-card-title"><a href="' + href + '">' + title + '</a></h3>' +
        (dateStr ? '<time class="blog-card-date" datetime="' + (post.created_at || '') + '">' + dateStr + '</time>' : '') +
        (excerptStr ? '<p class="blog-card-excerpt">' + excerptStr.replace(/</g, '&lt;') + '</p>' : '') +
        '<a href="' + href + '" class="blog-card-link">Read more</a>' +
        '</article>'
      );
    }).join('');
  }

  showLoading();
  supabase
    .from(TABLE)
    .select('id, title, created_at, body')
    .order('created_at', { ascending: false })
    .then(function (result) {
      if (result.error) {
        showError(result.error.message || 'Could not load posts.');
        return;
      }
      renderList(result.data || []);
    })
    .catch(function (err) {
      showError(err && err.message ? err.message : 'Could not load posts.');
    });
})();
