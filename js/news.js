(() => {
  const STORAGE_KEY = 'nc-news-posts-v1';

  const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);

  const safeImage = (value, fallback = 'images/social-preview.jpg') => {
    const image = String(value || '');
    return /^(data:image\/|images\/|https?:\/\/)/i.test(image) ? image : fallback;
  };

  const getLocalPosts = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored) ? stored : [];
    } catch (_) {
      return [];
    }
  };

  const getPosts = (includeDrafts = false) => {
    const local = getLocalPosts().filter(post => includeDrafts || post.status !== 'draft');
    return [...local, ...(window.NC_NEWS || [])]
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  };

  const isEnglish = () => document.documentElement.lang === 'en';
  const valueFor = (post, field) => isEnglish() ? (post[`${field}En`] || post[field]) : post[field];
  const dateLabel = value => new Intl.DateTimeFormat(isEnglish() ? 'en-GB' : 'pt-PT', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(`${value}T12:00:00`));

  const cardMarkup = (post, featured = false) => `
    <article class="news-card${featured ? ' news-card-featured' : ''}">
      <a class="news-card-media" href="noticia.html?id=${encodeURIComponent(post.id)}" aria-label="${escapeHtml(valueFor(post, 'title'))}">
        <img src="${safeImage(post.featured)}" alt="" loading="${featured ? 'eager' : 'lazy'}">
      </a>
      <div class="news-card-body">
        <div class="news-meta"><span>${escapeHtml(valueFor(post, 'category'))}</span><time datetime="${escapeHtml(post.date)}">${escapeHtml(dateLabel(post.date))}</time></div>
        <h2><a href="noticia.html?id=${encodeURIComponent(post.id)}">${escapeHtml(valueFor(post, 'title'))}</a></h2>
        <p>${escapeHtml(valueFor(post, 'excerpt'))}</p>
        <a class="news-read" href="noticia.html?id=${encodeURIComponent(post.id)}">${isEnglish() ? 'Read article' : 'Ler artigo'} <span>↗</span></a>
      </div>
    </article>`;

  const renderIndex = () => {
    const featured = document.querySelector('[data-news-featured]');
    const grid = document.querySelector('[data-news-grid]');
    if (!featured || !grid) return;

    const category = document.querySelector('[data-news-filter].is-active')?.dataset.newsFilter || 'all';
    const posts = getPosts().filter(post => category === 'all' || post.category === category);
    featured.innerHTML = posts[0] ? cardMarkup(posts[0], true) : '';
    grid.innerHTML = posts.slice(1).map(post => cardMarkup(post)).join('');

    const empty = document.querySelector('[data-news-empty]');
    if (empty) empty.hidden = posts.length > 0;
  };

  const setupFilters = () => {
    document.querySelectorAll('[data-news-filter]').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-news-filter]').forEach(item => item.classList.remove('is-active'));
        button.classList.add('is-active');
        renderIndex();
      });
    });
  };

  const renderArticle = () => {
    const article = document.querySelector('[data-article]');
    if (!article) return;
    const id = new URLSearchParams(location.search).get('id');
    const post = getPosts().find(item => item.id === id) || getPosts()[0];
    if (!post) return;

    const setText = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value || '';
    };

    setText('[data-article-category]', valueFor(post, 'category'));
    setText('[data-article-title]', valueFor(post, 'title'));
    setText('[data-article-excerpt]', valueFor(post, 'excerpt'));
    setText('[data-article-date]', dateLabel(post.date));
    setText('[data-article-time]', `${post.readTime || 4} ${isEnglish() ? 'min read' : 'min de leitura'}`);
    document.title = `${valueFor(post, 'title')} | Navigator Consulting`;

    const hero = document.querySelector('[data-article-image]');
    if (hero) {
      hero.src = safeImage(post.featured);
      hero.alt = valueFor(post, 'title');
    }

    const body = isEnglish() && Array.isArray(post.bodyEn) ? post.bodyEn : (post.body || []);
    const bodyElement = document.querySelector('[data-article-body]');
    if (bodyElement) bodyElement.innerHTML = body.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('');

    const gallery = document.querySelector('[data-article-gallery]');
    if (gallery) {
      const images = Array.isArray(post.gallery) ? post.gallery : [];
      gallery.hidden = images.length === 0;
      gallery.innerHTML = images.map((image, index) => `
        <figure><img src="${safeImage(image)}" alt="${escapeHtml(valueFor(post, 'title'))} — ${index + 1}" loading="lazy"></figure>
      `).join('');
    }
  };

  window.NC_NEWS_APP = { getPosts, getLocalPosts, storageKey: STORAGE_KEY };
  setupFilters();
  renderIndex();
  renderArticle();
  document.addEventListener('navigator:languagechange', () => {
    renderIndex();
    renderArticle();
  });
})();
