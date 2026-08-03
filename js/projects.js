(function () {
  const listEl = document.getElementById('projects-list');
  const filtersEl = document.getElementById('project-filters');
  if (!listEl) return;

  // Single source of truth for the project cards. Add entries here.
  const PROJECTS = [
    {
      title: 'ChiGame',
      image: 'images/chigame.png',
      tags: ['Node.js', 'Socket.io'],
      description:
        'UChicago CS collaborative game hosting and development platform. Contributed real-time multiplayer features as part of the Adding Games II group.',
      repo: 'https://github.com/uchicago-cs/chigame',
    },
    {
      title: 'StyleStack',
      image: 'images/stylestack.png',
      tags: ['TypeScript', 'PostgreSQL', 'Hackathon'],
      description: 'Hackathon project for organizing, discovering, and buying your personal style.',
      repo: 'https://github.com/Zhejiej/StyleStack',
    },
    {
      title: 'Rabble',
      image: 'images/rabble.png',
      tags: ['Django', 'REST API', 'CI/CD'],
      description:
        'Reddit-inspired platform with Django REST Framework. Features posts, comments, and SubRabble communities.',
      repo: 'https://github.com/Zhejiej/Rabble',
    },
    {
      title: 'Empathy',
      image: 'images/p3.png',
      tags: ['Web'],
      description: 'Collaborative project: an interactive experience exploring empathy and perspective-taking.',
      demo: 'https://izbuzz.github.io/emPathy/',
    },
    {
      title: 'Firebase Demo',
      image: 'images/p1.png',
      tags: ['Firebase'],
      description: 'Web app using Firebase for auth and data. Built to explore real-time backend and hosting.',
      demo: 'https://zhejiej.github.io/firebase_project/',
    },
    {
      title: 'Rock Paper Scissors (ML)',
      image: 'images/p2.png',
      tags: ['Teachable Machine'],
      description:
        'Browser game using Google Teachable Machine for hand-gesture recognition. Play RPS against the camera.',
      demo: 'https://zhejiej.github.io/rockPaperScissors_teachableMachine/',
    },
  ];

  let activeTag = null;

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text == null ? '' : text;
    return div.innerHTML;
  }

  function escapeAttr(text) {
    return String(text == null ? '' : text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function tagsMarkup(tags) {
    return tags.map(function (t) {
      return '<span class="project-tag">' + escapeHtml(t) + '</span>';
    }).join('');
  }

  function linksMarkup(p) {
    let html = '';
    if (p.repo) {
      html += '<a href="' + escapeAttr(p.repo) + '" target="_blank" rel="noopener noreferrer" class="pbtn">' +
        '<i class="fab fa-github" aria-hidden="true"></i> Repo</a>';
    }
    if (p.demo) {
      html += '<a href="' + escapeAttr(p.demo) + '" target="_blank" rel="noopener noreferrer" class="pbtn">' +
        '<i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i> Live demo</a>';
    }
    return html;
  }

  function cardMarkup(p) {
    return (
      '<div class="project">' +
      '<h2>' + escapeHtml(p.title) + '</h2>' +
      '<img src="' + escapeAttr(p.image) + '" alt="' + escapeAttr(p.title) + ' project screenshot" loading="lazy">' +
      '<div class="project-tags">' + tagsMarkup(p.tags) + '</div>' +
      '<p>' + escapeHtml(p.description) + '</p>' +
      '<div class="project-links">' + linksMarkup(p) + '</div>' +
      '</div>'
    );
  }

  function render() {
    const shown = activeTag
      ? PROJECTS.filter(function (p) { return p.tags.indexOf(activeTag) !== -1; })
      : PROJECTS;
    listEl.innerHTML = shown.map(cardMarkup).join('');
  }

  function buildFilters() {
    if (!filtersEl) return;
    const set = {};
    PROJECTS.forEach(function (p) { p.tags.forEach(function (t) { set[t] = true; }); });
    const tags = Object.keys(set).sort();
    const buttons = ['<button type="button" class="project-filter active" data-tag="">All</button>']
      .concat(tags.map(function (t) {
        return '<button type="button" class="project-filter" data-tag="' + escapeAttr(t) + '">' + escapeHtml(t) + '</button>';
      }));
    filtersEl.innerHTML = buttons.join('');
    filtersEl.addEventListener('click', function (e) {
      const btn = e.target.closest('.project-filter');
      if (!btn) return;
      activeTag = btn.getAttribute('data-tag') || null;
      filtersEl.querySelectorAll('.project-filter').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      render();
    });
  }

  buildFilters();
  render();
})();
