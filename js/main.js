document.addEventListener('DOMContentLoaded', () => {

    // ========== NAVBAR ==========
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });

    // ========== LOAD UPLOADED PHOTOS FROM INDEXEDDB ==========
    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('gabiPhotoDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('photos')) {
                    db.createObjectStore('photos', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e);
        });
    }

    async function loadUploadedPhotos() {
        try {
            const db = await openDB();
            const tx = db.transaction('photos', 'readonly');
            const request = tx.objectStore('photos').getAll();
            request.onsuccess = () => {
                const photos = request.result;
                if (photos.length === 0) return;

                const grid = document.querySelector('.gallery-grid');

                photos.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

                photos.forEach(photo => {
                    const item = document.createElement('div');
                    item.className = 'gallery-item';
                    item.dataset.category = photo.category;
                    item.innerHTML = `
                        <div class="gallery-frame">
                            <img src="${photo.dataUrl}" alt="${esc(photo.caption)}" loading="lazy">
                            <div class="gallery-caption">${esc(photo.caption)}</div>
                        </div>
                    `;
                    grid.appendChild(item);

                    observer.observe(item);
                });

                rebindGallery();
                loadUploadedPrints(photos.filter(p => p.forSale));
            };
        } catch (e) {
            // IndexedDB not available
        }
    }

    function loadUploadedPrints(forSalePhotos) {
        if (forSalePhotos.length === 0) return;
        const printsGrid = document.querySelector('.prints-grid');
        if (!printsGrid) return;

        forSalePhotos.forEach(photo => {
            const card = document.createElement('div');
            card.className = 'print-card';
            card.innerHTML = `
                <div class="gallery-frame">
                    <img src="${photo.dataUrl}" alt="${esc(photo.caption)}">
                </div>
                <div class="print-info">
                    <h4>${esc(photo.caption)}</h4>
                    <p class="print-sizes">זמין בגדלים: 30x40 / 50x70 / 70x100</p>
                    <a href="#contact" class="print-btn">לפרטים והזמנה</a>
                </div>
            `;
            printsGrid.appendChild(card);
        });
    }

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ========== LOAD SETTINGS FROM LOCALSTORAGE ==========
    function applySettings() {
        const s = JSON.parse(localStorage.getItem('siteSettings') || '{}');
        if (!s.name && !s.phone) return;

        if (s.name) {
            document.querySelectorAll('.nav-logo, .hero-content h1, .about-text h3').forEach(el => {
                if (el.classList.contains('nav-logo')) el.textContent = s.name;
                else if (el.closest('.hero-content')) el.textContent = s.name;
                else if (el.closest('.about-text')) el.textContent = 'שלום, אני ' + s.name;
            });
            const footer = document.querySelector('.footer p');
            if (footer) footer.innerHTML = `&copy; 2026 ${esc(s.name)}. כל הזכויות שמורות.`;
        }

        if (s.tagline) {
            const heroP = document.querySelector('.hero-content p');
            if (heroP) heroP.textContent = s.tagline;
        }

        if (s.about) {
            const aboutTexts = document.querySelectorAll('.about-text p');
            if (aboutTexts.length > 0) {
                const paragraphs = s.about.split('\n').filter(Boolean);
                aboutTexts.forEach((p, i) => {
                    if (paragraphs[i]) p.textContent = paragraphs[i];
                });
            }
        }

        const contactLinks = document.querySelector('.contact-links');
        if (contactLinks && (s.phone || s.email)) {
            contactLinks.innerHTML = '';
            if (s.phone) contactLinks.innerHTML += `<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ''))}" class="contact-link">📞 ${esc(s.phone)}</a>`;
            if (s.email) contactLinks.innerHTML += `<a href="mailto:${esc(s.email)}" class="contact-link">✉️ ${esc(s.email)}</a>`;
            if (s.instagram) contactLinks.innerHTML += `<a href="https://instagram.com/${esc(s.instagram)}" target="_blank" rel="noopener" class="contact-link">📸 @${esc(s.instagram)}</a>`;
            if (s.facebook) contactLinks.innerHTML += `<a href="${esc(s.facebook)}" target="_blank" rel="noopener" class="contact-link">👤 פייסבוק</a>`;
            if (s.whatsapp) contactLinks.innerHTML += `<a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener" class="contact-link">💬 וואטסאפ</a>`;
        }
    }

    // ========== LOAD TESTIMONIALS FROM LOCALSTORAGE ==========
    function applyTestimonials() {
        const testimonials = JSON.parse(localStorage.getItem('siteTestimonials') || '[]');
        if (testimonials.length === 0) return;

        const slider = document.querySelector('.testimonials-slider');
        if (!slider) return;

        slider.innerHTML = testimonials.map(t => `
            <div class="testimonial-card">
                <div class="testimonial-stars">${'⭐'.repeat(t.rating)}</div>
                <p class="testimonial-text">"${esc(t.text)}"</p>
                <div class="testimonial-author">
                    <strong>${esc(t.name)}</strong>
                    <span>${esc(t.service)}</span>
                </div>
            </div>
        `).join('');
    }

    // ========== GALLERY FILTERS ==========
    function rebindGallery() {
        const allItems = document.querySelectorAll('.gallery-item');
        const filterBtns = document.querySelectorAll('.filter-btn');

        filterBtns.forEach(btn => {
            btn.onclick = () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                allItems.forEach(item => {
                    item.classList.toggle('hidden', filter !== 'all' && item.dataset.category !== filter);
                });
            };
        });

        allItems.forEach(item => {
            const frame = item.querySelector('.gallery-frame');
            if (frame && !frame.dataset.bound) {
                frame.dataset.bound = '1';
                frame.addEventListener('click', () => {
                    const visibleFrames = getVisibleImages();
                    const idx = visibleFrames.indexOf(frame);
                    openLightbox(idx >= 0 ? idx : 0);
                });
            }
        });
    }

    const filterBtns = document.querySelectorAll('.filter-btn');
    const galleryItems = document.querySelectorAll('.gallery-item');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;

            document.querySelectorAll('.gallery-item').forEach(item => {
                item.classList.toggle('hidden', filter !== 'all' && item.dataset.category !== filter);
            });
        });
    });

    // ========== SCROLL ANIMATIONS ==========
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });

    galleryItems.forEach(item => observer.observe(item));

    // ========== LIGHTBOX ==========
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

    let currentImages = [];
    let currentIndex = 0;

    function getVisibleImages() {
        return Array.from(document.querySelectorAll('.gallery-item:not(.hidden) .gallery-frame'));
    }

    function openLightbox(index) {
        currentImages = getVisibleImages();
        currentIndex = index;
        const frame = currentImages[currentIndex];
        const img = frame.querySelector('img');
        const caption = frame.querySelector('.gallery-caption');

        const src = img.src;
        lightboxImg.src = src.includes('unsplash.com') ? src.replace('w=600&h=400', 'w=1200&h=800') : src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = caption ? caption.textContent : '';
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function navigate(direction) {
        currentIndex = (currentIndex + direction + currentImages.length) % currentImages.length;
        const frame = currentImages[currentIndex];
        const img = frame.querySelector('img');
        const caption = frame.querySelector('.gallery-caption');

        const src = img.src;
        lightboxImg.src = src.includes('unsplash.com') ? src.replace('w=600&h=400', 'w=1200&h=800') : src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = caption ? caption.textContent : '';
    }

    document.querySelectorAll('.gallery-item .gallery-frame').forEach((frame) => {
        frame.dataset.bound = '1';
        frame.addEventListener('click', () => {
            const visibleFrames = getVisibleImages();
            const visibleIndex = visibleFrames.indexOf(frame);
            openLightbox(visibleIndex >= 0 ? visibleIndex : 0);
        });
    });

    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', () => navigate(-1));
    lightboxNext.addEventListener('click', () => navigate(1));

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') navigate(-1);
        if (e.key === 'ArrowLeft') navigate(1);
    });

    // ========== CONTACT FORM ==========
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.submit-btn');
        btn.textContent = 'ההודעה נשלחה! ✓';
        btn.style.background = '#4a7c59';
        setTimeout(() => {
            btn.textContent = 'שלח הודעה';
            btn.style.background = '';
            form.reset();
        }, 3000);
    });

    // ========== INIT ==========
    applySettings();
    applyTestimonials();
    loadUploadedPhotos();

});
