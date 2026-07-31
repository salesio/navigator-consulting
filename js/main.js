// Navigator Consulting — shared behaviour
document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  if (toggle && links) {
    const closeMenu = () => {
      links.classList.remove('open');
      toggle.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Abrir menu');
      document.body.classList.remove('menu-open');
      document.body.style.overflow = '';
    };

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      toggle.setAttribute('aria-label', isOpen ? 'Fechar menu' : 'Abrir menu');
      document.body.classList.toggle('menu-open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu();
    });
    document.addEventListener('click', event => {
      if (links.classList.contains('open') && !links.contains(event.target) && !toggle.contains(event.target)) {
        closeMenu();
      }
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });
  }

  // Subtle scroll parallax for large screens. Disabled for reduced motion
  // and small viewports to keep navigation and scrolling responsive.
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreenQuery = window.matchMedia('(max-width: 760px)');
  const parallaxItems = [
    ...Array.from(document.querySelectorAll('.hero-visual')).map(el => ({ el, speed: 0.045, limit: 28, media: true })),
    ...Array.from(document.querySelectorAll('.split-media')).map(el => ({ el, speed: 0.032, limit: 20, media: true })),
    ...Array.from(document.querySelectorAll('.hero-arc')).map(el => ({ el, speed: 0.07, limit: 42, media: false }))
  ];

  parallaxItems.forEach(item => {
    item.el.classList.add(item.media ? 'parallax-media' : 'parallax-active');
  });

  let parallaxFrame = 0;
  const resetParallax = () => {
    parallaxItems.forEach(item => item.el.style.setProperty('--parallax-shift', '0px'));
  };
  const updateParallax = () => {
    parallaxFrame = 0;
    if (motionQuery.matches || smallScreenQuery.matches) {
      resetParallax();
      return;
    }

    const viewportCenter = window.innerHeight / 2;
    parallaxItems.forEach(item => {
      const rect = item.el.getBoundingClientRect();
      if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
      const distance = viewportCenter - (rect.top + rect.height / 2);
      const shift = Math.max(-item.limit, Math.min(item.limit, distance * item.speed));
      item.el.style.setProperty('--parallax-shift', `${shift.toFixed(2)}px`);
    });
  };
  const scheduleParallax = () => {
    if (!parallaxFrame) parallaxFrame = requestAnimationFrame(updateParallax);
  };

  if (parallaxItems.length) {
    updateParallax();
    window.addEventListener('scroll', scheduleParallax, { passive: true });
    window.addEventListener('resize', scheduleParallax, { passive: true });
    motionQuery.addEventListener?.('change', scheduleParallax);
    smallScreenQuery.addEventListener?.('change', scheduleParallax);
  }

  // Reveal-on-scroll
  const revealEls = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Contact form fallback: opens a pre-addressed email in the visitor's mail app.
  const form = document.querySelector('.contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      const subject = `Pedido de contacto — ${data.get('assunto') || 'Navigator Consulting'}`;
      const body = [
        `Nome: ${data.get('nome') || ''}`,
        `Empresa: ${data.get('empresa') || ''}`,
        `Email: ${data.get('email') || ''}`,
        `Telefone: ${data.get('telefone') || ''}`,
        '',
        `${data.get('mensagem') || ''}`
      ].join('\n');
      const status = form.querySelector('.form-status');
      if (status) status.textContent = 'A abrir a sua aplicação de email…';
      window.location.href = `mailto:info@navigatorconsulting.co.mz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  // Current year in footer
  document.querySelectorAll('[data-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
});
