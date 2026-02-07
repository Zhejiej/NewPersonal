/**
 * Portfolio shared behavior: nav active state, star animation (home only), bubbles.
 */
const THEME_KEY = 'portfolio-theme';

function init(): void {
  initTheme();
  setNavActive();
  initMobileNav();
  initContactForm();
  if (document.body.classList.contains('page-home')) {
    startStarAnimation();
    initBubbles();
  }
}

/**
 * Contact form: submit via fetch, then show success message without leaving the page.
 */
function initContactForm(): void {
  const form = document.getElementById('contact-form') as HTMLFormElement | null;
  const successEl = document.getElementById('form-success');
  const submitBtn = document.getElementById('submit-btn');
  if (!form || !successEl) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!submitBtn) return;
    (submitBtn as HTMLButtonElement).disabled = true;
    (submitBtn as HTMLButtonElement).textContent = 'Sending...';

    const formData = new FormData(form);
    fetch(form.action, { method: 'POST', body: formData })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          form.hidden = true;
          successEl.hidden = false;
        } else {
          (submitBtn as HTMLButtonElement).disabled = false;
          (submitBtn as HTMLButtonElement).textContent = 'Submit';
          if (successEl.previousElementSibling === form) {
            const err = document.createElement('p');
            err.className = 'form-error';
            err.setAttribute('role', 'alert');
            err.textContent = 'Something went wrong. Please try again or email directly.';
            form.after(err);
          }
        }
      })
      .catch(() => {
        (submitBtn as HTMLButtonElement).disabled = false;
        (submitBtn as HTMLButtonElement).textContent = 'Submit';
        const err = form.nextElementSibling;
        if (err?.classList?.contains('form-error')) return;
        const errEl = document.createElement('p');
        errEl.className = 'form-error';
        errEl.setAttribute('role', 'alert');
        errEl.textContent = 'Something went wrong. Please try again or email directly.';
        form.after(errEl);
      });
  });
}

/**
 * Dark mode: apply saved or system preference, then wire toggle button.
 */
function initTheme(): void {
  const root = document.documentElement;
  const saved = localStorage.getItem(THEME_KEY) as 'light' | 'dark' | null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved === 'dark' || (!saved && prefersDark)) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.setAttribute('data-theme', 'light');
  }

  const toggle = document.querySelector<HTMLButtonElement>('.theme-toggle');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    const isDark = root.getAttribute('data-theme') === 'dark';
    const next = isDark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
  });
}

/**
 * Mobile nav: toggle menu when hamburger is clicked; close when a link is clicked.
 */
function initMobileNav(): void {
  const toggle = document.querySelector<HTMLButtonElement>('.nav-toggle');
  const navbar = document.querySelector<HTMLElement>('.navbar');
  const navLinks = document.querySelector('.nav-links');
  if (!toggle || !navbar || !navLinks) return;

  toggle.addEventListener('click', () => {
    const isOpen = navbar.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      navbar.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
}

/**
 * Set .active on the nav link that matches the current page.
 */
function setNavActive(): void {
  const path = window.location.pathname;
  const page = path.slice(path.lastIndexOf('/') + 1) || 'index.html';
  const navLinks = document.querySelectorAll<HTMLAnchorElement>('.nav-links a');
  const isHome = page === '' || page === 'index.html';
  navLinks.forEach((link) => {
    const href = link.getAttribute('href') ?? '';
    const isHomeLink = href === '#' || href === '' || href === 'index.html';
    const isCurrent = isHomeLink ? isHome : href === page;
    link.classList.toggle('active', isCurrent);
    if (isCurrent) {
      link.setAttribute('aria-current', 'page');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

/**
 * Star animation: create falling stars, only when .stars container or page-home exists.
 */
function startStarAnimation(): void {
  const starsContainer = document.querySelector('.stars');
  const container = starsContainer ?? document.body;

  function createStar(): void {
    const el = document.createElement('div');
    el.setAttribute('class', 'star');
    el.style.left = Math.random() * window.innerWidth + 'px';
    const size = Math.random() * 15;
    el.style.fontSize = 12 + size + 'px';
    container.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 6000);
  }

  setInterval(createStar, 350);
}

/**
 * Bubble effect: create a container and spawn bubble elements with random size/position/delay.
 */
function initBubbles(): void {
  const existing = document.getElementById('bubbles-container');
  if (existing) return;

  const container = document.createElement('div');
  container.id = 'bubbles-container';
  container.className = 'bubbles-container';
  document.body.insertBefore(container, document.body.firstChild);

  const count = 28;
  for (let i = 0; i < count; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    const size = 20 + Math.random() * 60;
    bubble.style.width = size + 'px';
    bubble.style.height = size + 'px';
    bubble.style.left = Math.random() * 100 + '%';
    bubble.style.animationDelay = Math.random() * 8 + 's';
    bubble.style.animationDuration = 8 + Math.random() * 8 + 's';
    container.appendChild(bubble);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
