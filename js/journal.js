(function () {
  const listEl = document.getElementById('journal-list');
  const placeholderEl = document.getElementById('journal-placeholder');
  if (!listEl) return;

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const TABLE = 'Journal';

  function showLoading() {
    if (placeholderEl) {
      placeholderEl.textContent = 'Loading posts…';
      placeholderEl.classList.add('journal-loading');
    }
  }

  function showEmpty() {
    if (placeholderEl) {
      placeholderEl.textContent = 'Journal entries coming soon.';
      placeholderEl.classList.remove('journal-loading', 'journal-error');
    }
  }

  function showError(msg) {
    if (placeholderEl) {
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
      const href = 'journal-post.html?id=' + encodeURIComponent(post.id);
      return (
        '<article class="journal-card">' +
        '<h3 class="journal-card-title"><a href="' + href + '">' + title + '</a></h3>' +
        (dateStr ? '<time class="journal-card-date" datetime="' + (post.created_at || '') + '">' + dateStr + '</time>' : '') +
        (excerptStr ? '<p class="journal-card-excerpt">' + excerptStr.replace(/</g, '&lt;') + '</p>' : '') +
        '<a href="' + href + '" class="journal-card-link">Read more</a>' +
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
