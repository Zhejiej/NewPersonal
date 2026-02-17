(function () {
  const articleEl = document.getElementById('post-content');
  const loadingEl = document.getElementById('post-loading');
  const errorEl = document.getElementById('post-error');
  if (!articleEl) return;

  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
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
    var d = new Date(value);
    return isNaN(d.getTime()) ? value : d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  supabase
    .from(TABLE)
    .select('id, title, created_at, body')
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
      var post = result.data;
      if (!post) {
        if (errorEl) {
          errorEl.textContent = 'Post not found.';
          errorEl.hidden = false;
        }
        return;
      }
      if (errorEl) errorEl.hidden = true;
      articleEl.innerHTML =
        '<h1 class="journal-post-title">' + escapeHtml(post.title || 'Untitled') + '</h1>' +
        (post.created_at ? '<time class="journal-post-date" datetime="' + escapeHtml(String(post.created_at)) + '">' + formatDate(post.created_at) + '</time>' : '') +
        '<div class="journal-post-body">' + escapeHtml(post.body || '').replace(/\n/g, '<br>') + '</div>';
      articleEl.hidden = false;
    })
    .catch(function (err) {
      if (loadingEl) loadingEl.hidden = true;
      if (errorEl) {
        errorEl.textContent = (err && err.message) ? err.message : 'Could not load post.';
        errorEl.hidden = false;
      }
    });
})();
