(() => {
  const STORAGE_KEY = 'nc-news-posts-v1';
  const form = document.querySelector('[data-editor-form]');
  if (!form) return;

  let featuredData = '';
  let galleryData = [];

  const readPosts = () => {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  };

  const writePosts = posts => localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  const slugify = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .slice(0, 64);

  const resizeImage = file => new Promise((resolve, reject) => {
    if (!file?.type?.startsWith('image/')) return reject(new Error('Ficheiro inválido'));
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const max = 1500;
        const ratio = Math.min(1, max / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * ratio);
        canvas.height = Math.round(image.height * ratio);
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', .82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  const renderImagePreviews = () => {
    const featuredPreview = document.querySelector('[data-featured-preview]');
    if (featuredPreview) featuredPreview.innerHTML = featuredData
      ? `<img src="${featuredData}" alt="Pré-visualização da imagem destacada">`
      : '<span>A imagem destacada aparecerá aqui</span>';

    const galleryPreview = document.querySelector('[data-gallery-preview]');
    if (galleryPreview) galleryPreview.innerHTML = galleryData.length
      ? galleryData.map((image, index) => `<figure><img src="${image}" alt="Galeria ${index + 1}"></figure>`).join('')
      : '<p>Adicione várias imagens para testar a galeria masonry.</p>';
  };

  const renderPosts = () => {
    const list = document.querySelector('[data-editor-posts]');
    const posts = readPosts();
    if (!list) return;
    list.innerHTML = '';
    if (!posts.length) {
      const empty = document.createElement('p');
      empty.className = 'editor-empty';
      empty.textContent = 'Ainda não existem artigos criados neste navegador.';
      list.appendChild(empty);
      return;
    }

    posts.forEach(post => {
      const item = document.createElement('article');
      item.className = 'editor-post-item';
      const copy = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = post.title;
      const meta = document.createElement('span');
      meta.textContent = `${post.category} · ${post.status === 'draft' ? 'Draft' : 'Publicado localmente'}`;
      copy.append(title, meta);

      const actions = document.createElement('div');
      const view = document.createElement('a');
      view.href = `noticia.html?id=${encodeURIComponent(post.id)}`;
      view.textContent = 'Ver';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Eliminar';
      remove.addEventListener('click', () => {
        writePosts(readPosts().filter(item => item.id !== post.id));
        renderPosts();
      });
      actions.append(view, remove);
      item.append(copy, actions);
      list.appendChild(item);
    });
  };

  document.querySelector('[name="featured"]')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    featuredData = await resizeImage(file);
    renderImagePreviews();
  });

  document.querySelector('[name="gallery"]')?.addEventListener('change', async event => {
    const files = Array.from(event.target.files || []).slice(0, 8);
    galleryData = await Promise.all(files.map(resizeImage));
    renderImagePreviews();
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const title = data.get('title').trim();
    const id = `${slugify(title)}-${Date.now().toString(36)}`;
    const fallbackImage = {
      'Governação Corporativa': 'images/governance-team.webp',
      'Crimes Financeiros': 'images/financial-crime-expert.webp',
      'Gestão Estratégica': 'images/strategy-advisor.webp',
      'Compliance': 'images/compliance-expert.webp',
      'Gestão de Risco': 'images/risk-advisor.webp',
      'ESG': 'images/values-teamwork.webp'
    }[data.get('category')] || 'images/social-preview.jpg';

    const post = {
      id,
      title,
      category: data.get('category'),
      excerpt: data.get('excerpt').trim(),
      body: data.get('body').split(/\n\s*\n/).map(value => value.trim()).filter(Boolean),
      featured: featuredData || fallbackImage,
      gallery: galleryData,
      date: data.get('date'),
      readTime: Number(data.get('readTime')) || 4,
      status: data.get('status')
    };

    writePosts([post, ...readPosts()]);
    const message = document.querySelector('[data-editor-status]');
    if (message) message.textContent = post.status === 'draft'
      ? 'Draft guardado neste navegador.'
      : 'Artigo publicado localmente e disponível na página de Notícias deste navegador.';
    form.reset();
    featuredData = '';
    galleryData = [];
    document.querySelector('[name="date"]').value = new Date().toISOString().slice(0, 10);
    renderImagePreviews();
    renderPosts();
  });

  document.querySelector('[data-export-posts]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(readPosts(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'navigator-noticias.json';
    link.click();
    URL.revokeObjectURL(link.href);
  });

  document.querySelector('[name="date"]').value = new Date().toISOString().slice(0, 10);
  renderImagePreviews();
  renderPosts();
})();
