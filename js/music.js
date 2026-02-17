(function () {
  const currentEl = document.getElementById('music-current');
  const playlistEl = document.getElementById('music-playlist');
  const placeholderEl = document.getElementById('music-placeholder');
  const modalEl = document.getElementById('music-modal');
  const playerEl = document.getElementById('music-modal-player');
  const modalCloseBtn = modalEl && modalEl.querySelector('.music-modal-close');
  const modalBackdrop = modalEl && modalEl.querySelector('.music-modal-backdrop');

  if (!currentEl || !playlistEl) return;

  const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const TABLE = 'FavoriteSong';

  function getYoutubeVideoId(url) {
    if (!url || typeof url !== 'string') return null;
    var trimmed = url.trim();
    var m = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function escapeHtml(text) {
    if (text == null || text === '') return '';
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatDate(value) {
    if (value == null) return '';
    var d = new Date(value);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  function openModal(embedUrl) {
    if (!modalEl || !playerEl) return;
    playerEl.innerHTML = '<iframe src="' + escapeHtml(embedUrl) + '" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
    modalEl.setAttribute('aria-hidden', 'false');
    modalEl.classList.add('music-modal-open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalEl || !playerEl) return;
    playerEl.innerHTML = '';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.classList.remove('music-modal-open');
    document.body.style.overflow = '';
  }

  function playSong(link) {
    if (!link) return;
    var videoId = getYoutubeVideoId(link);
    if (videoId) {
      openModal('https://www.youtube.com/embed/' + videoId + '?autoplay=1');
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  }

  function renderCurrent(song) {
    if (!song) {
      currentEl.innerHTML = '<p class="music-empty">No favorite song set.</p>';
      currentEl.hidden = false;
      return;
    }
    var name = escapeHtml(song.song_name || 'Untitled');
    var author = song.author ? escapeHtml(song.author) : '';
    var note = song.note ? '<p class="music-note">' + escapeHtml(song.note).replace(/\n/g, '<br>') + '</p>' : '';
    var link = song.link ? escapeHtml(song.link) : '';
    var videoId = getYoutubeVideoId(song.link);
    var thumbHtml = '';
    if (videoId) {
      var thumbUrl = 'https://img.youtube.com/vi/' + videoId + '/hqdefault.jpg';
      thumbHtml = '<div class="music-thumb-wrap"><img src="' + thumbUrl + '" alt="" class="music-thumb"></div>';
    }
    var playBtnHtml = link ? '<div class="music-actions"><button type="button" class="music-play-btn" data-link="' + link + '" aria-label="Play"><i class="fas fa-play" aria-hidden="true"></i> Play</button></div>' : '';
    currentEl.innerHTML =
      thumbHtml +
      playBtnHtml +
      '<p class="music-song-name">' + name + '</p>' +
      (author ? '<p class="music-author">' + author + '</p>' : '') +
      note;
    currentEl.hidden = false;
  }

  function renderPlaylist(songs) {
    if (!Array.isArray(songs) || songs.length === 0) {
      playlistEl.innerHTML = '<p class="music-playlist-empty">No previous favorites yet.</p>';
      playlistEl.hidden = false;
      return;
    }
    playlistEl.innerHTML = songs.map(function (song) {
      var name = escapeHtml(song.song_name || 'Untitled');
      var author = song.author ? escapeHtml(song.author) : '';
      var dateStr = formatDate(song.created_at);
      var note = song.note ? escapeHtml(song.note).replace(/\n/g, ' ').trim().slice(0, 80) : '';
      if (note && song.note.length > 80) note += '…';
      var link = song.link ? ' data-link="' + escapeHtml(song.link) + '"' : '';
      return (
        '<article class="music-card">' +
        '<div class="music-card-info">' +
        '<p class="music-card-name">' + name + '</p>' +
        (author ? '<p class="music-card-author">' + author + '</p>' : '') +
        (dateStr ? '<time class="music-card-date" datetime="' + escapeHtml(String(song.created_at)) + '">' + dateStr + '</time>' : '') +
        (note ? '<p class="music-card-note">' + note + '</p>' : '') +
        '</div>' +
        (song.link ? '<button type="button" class="music-play-btn music-play-btn-sm" aria-label="Play ' + name + '"' + link + '><i class="fas fa-play" aria-hidden="true"></i></button>' : '') +
        '</article>'
      );
    }).join('');
    playlistEl.hidden = false;
  }

  playlistEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.music-play-btn[data-link]');
    if (btn && btn.dataset.link) playSong(btn.dataset.link);
  });

  currentEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.music-play-btn[data-link]');
    if (btn && btn.dataset.link) playSong(btn.dataset.link);
  });

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeModal);

  modalEl && modalEl.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  placeholderEl.textContent = 'Loading…';
  placeholderEl.classList.add('music-loading');

  supabase
    .from(TABLE)
    .select('song_name, author, link, note, created_at')
    .order('created_at', { ascending: false })
    .then(function (result) {
      if (placeholderEl) {
        placeholderEl.hidden = true;
        placeholderEl.classList.remove('music-loading', 'music-error');
      }
      if (result.error) {
        if (placeholderEl) {
          placeholderEl.textContent = result.error.message || 'Could not load music.';
          placeholderEl.classList.add('music-error');
          placeholderEl.hidden = false;
        }
        return;
      }
      var rows = result.data || [];
      var current = rows[0] || null;
      var playlist = rows.slice(1);
      renderCurrent(current);
      renderPlaylist(playlist);
    })
    .catch(function (err) {
      if (placeholderEl) {
        placeholderEl.textContent = (err && err.message) ? err.message : 'Could not load music.';
        placeholderEl.classList.remove('music-loading');
        placeholderEl.classList.add('music-error');
        placeholderEl.hidden = false;
      }
    });
})();
