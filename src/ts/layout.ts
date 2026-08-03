/**
 * Shared layout. Renders the navbar and footer into placeholder elements so the
 * markup lives in one place instead of being copy pasted into every page.
 *
 * Each page provides placeholders and loads this script BEFORE main.js, like so.
 *   <div data-shared="nav"></div>
 *   ...page content...
 *   <div data-shared="footer"></div>
 *   <script src="js/layout.js"></script>
 *   <script src="js/main.js"></script>
 *
 * This runs synchronously at execution time (the script sits at the end of the body,
 * after the placeholders), so main.js setNavActive() and initMobileNav() find the nav.
 */
(function () {
  interface NavLink {
    href: string;
    label: string;
  }

  // Single source of truth for the top nav. Add a page here and it appears everywhere.
  const NAV_LINKS: NavLink[] = [
    { href: 'index.html', label: 'Home' },
    { href: 'about.html', label: 'About' },
    { href: 'projects.html', label: 'Projects' },
    { href: 'journal.html', label: 'Journal' },
    { href: 'contact.html', label: 'Contact' },
  ];

  // Footer sitemap. The top nav plus the secondary pages.
  const FOOTER_LINKS: NavLink[] = [
    { href: 'index.html', label: 'Home' },
    { href: 'about.html', label: 'About' },
    { href: 'projects.html', label: 'Projects' },
    { href: 'journal.html', label: 'Journal' },
    { href: 'resume.html', label: 'Résumé' },
    { href: 'contact.html', label: 'Contact' },
  ];

  const SOCIALS = [
    {
      href: 'https://www.linkedin.com/in/zhejie-jiang-9b7451284/',
      label: 'LinkedIn',
      icon: 'fab fa-linkedin',
    },
    {
      href: 'https://www.instagram.com/jk.y_06/?hl=en/',
      label: 'Instagram',
      icon: 'fab fa-instagram',
    },
    { href: 'https://github.com/Zhejiej', label: 'GitHub', icon: 'fab fa-github' },
  ];

  function socialsMarkup(): string {
    return SOCIALS.map(
      (s) =>
        '<a href="' +
        s.href +
        '" target="_blank" rel="noopener noreferrer" aria-label="' +
        s.label +
        '"><i class="' +
        s.icon +
        '"></i></a>'
    ).join('\n');
  }

  function navMarkup(): string {
    const links = NAV_LINKS.map(
      (l) => '<li><a href="' + l.href + '">' + l.label + '</a></li>'
    ).join('\n');

    return (
      '<nav class="navbar">' +
      '<div class="logo">ZJ</div>' +
      '<button type="button" class="nav-toggle" aria-label="Toggle menu" aria-expanded="false">' +
      '<i class="fas fa-bars" aria-hidden="true"></i>' +
      '</button>' +
      '<ul class="nav-links">' +
      links +
      '</ul>' +
      '<button type="button" class="theme-toggle" aria-label="Toggle dark mode">' +
      '<span class="icon-light" aria-hidden="true"><i class="fas fa-sun"></i></span>' +
      '<span class="icon-dark" aria-hidden="true"><i class="fas fa-moon"></i></span>' +
      '</button>' +
      '</nav>'
    );
  }

  function footerNavMarkup(): string {
    return (
      '<ul class="footer-nav">' +
      FOOTER_LINKS.map(
        (l) => '<li><a href="' + l.href + '">' + l.label + '</a></li>'
      ).join('') +
      '</ul>'
    );
  }

  function footerMarkup(): string {
    const year = new Date().getFullYear();
    return (
      '<footer>' +
      footerNavMarkup() +
      '<div class="socials">' +
      socialsMarkup() +
      '</div>' +
      '<p class="footer-copy">&copy; ' +
      year +
      ' Zhejie Jiang</p>' +
      '</footer>'
    );
  }

  const navSlot = document.querySelector('[data-shared="nav"]');
  if (navSlot) navSlot.outerHTML = navMarkup();

  const footerSlot = document.querySelector('[data-shared="footer"]');
  if (footerSlot) footerSlot.outerHTML = footerMarkup();
})();
