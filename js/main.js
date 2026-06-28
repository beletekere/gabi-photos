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

    // ========== NO SCROLL ANIMATIONS — CLEAN LOAD ==========

    // ========== LIGHTBOX ==========
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');

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

    function bindFrame(frame) {
        if (frame.dataset.bound) return;
        frame.dataset.bound = '1';
        frame.addEventListener('click', () => {
            const visibleFrames = getVisibleImages();
            const idx = visibleFrames.indexOf(frame);
            openLightbox(idx >= 0 ? idx : 0);
        });
    }

    document.querySelectorAll('.gallery-item .gallery-frame').forEach(bindFrame);

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', () => navigate(-1));
    document.getElementById('lightboxNext').addEventListener('click', () => navigate(1));
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') navigate(-1);
        if (e.key === 'ArrowLeft') navigate(1);
    });

    // ========== GALLERY FILTERS ==========
    function rebindFilters() {
        const allItems = document.querySelectorAll('.gallery-item');
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                allItems.forEach(item => {
                    item.classList.toggle('hidden', filter !== 'all' && item.dataset.category !== filter);
                });
            };
        });
    }
    rebindFilters();

    // ========== LOAD PHOTOS FROM FIREBASE ==========
    async function loadPhotosFromFirebase() {
        try {
            const snapshot = await db.collection('photos').get();
            if (snapshot.empty) return;

            const photos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            photos.sort((a, b) => {
                const tA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt).getTime();
                const tB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt).getTime();
                return tA - tB;
            });

            const grid = document.querySelector('.gallery-grid');
            const printsGrid = document.querySelector('.prints-grid');

            photos.forEach(photo => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                item.dataset.category = photo.category;
                item.innerHTML = `
                    <div class="gallery-frame">
                        <img src="${esc(photo.imageUrl)}" alt="${esc(photo.caption)}" loading="lazy">
                        <div class="gallery-caption">${esc(photo.caption)}</div>
                    </div>
                `;
                grid.appendChild(item);
                bindFrame(item.querySelector('.gallery-frame'));

                if (photo.forSale && printsGrid) {
                    const card = document.createElement('div');
                    card.className = 'print-card';
                    card.innerHTML = `
                        <div class="gallery-frame">
                            <img src="${esc(photo.imageUrl)}" alt="${esc(photo.caption)}">
                        </div>
                        <div class="print-info">
                            <h4>${esc(photo.caption)}</h4>
                            <p class="print-sizes">זמין בגדלים: 30x40 / 50x70 / 70x100</p>
                            <a href="#contact" class="print-btn">לפרטים והזמנה</a>
                        </div>
                    `;
                    printsGrid.appendChild(card);
                }
            });

            rebindFilters();
        } catch (e) {
            // Firebase not available
        }
    }

    // ========== LOAD TESTIMONIALS FROM FIREBASE ==========
    async function loadTestimonialsFromFirebase() {
        try {
            const snapshot = await db.collection('testimonials').orderBy('createdAt', 'asc').get();
            if (snapshot.empty) return;

            const slider = document.querySelector('.testimonials-slider');
            if (!slider) return;

            slider.innerHTML = snapshot.docs.map(doc => {
                const t = doc.data();
                return `
                <div class="testimonial-card">
                    <div class="testimonial-stars">${'⭐'.repeat(t.rating)}</div>
                    <p class="testimonial-text">"${esc(t.text)}"</p>
                    <div class="testimonial-author">
                        <strong>${esc(t.name)}</strong>
                        <span>${esc(t.service)}</span>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            // Firebase not available
        }
    }

    // ========== LOAD SETTINGS FROM FIREBASE ==========
    async function loadSettingsFromFirebase() {
        try {
            const doc = await db.collection('settings').doc('site').get();
            if (!doc.exists) return;
            const s = doc.data();

            if (s.name) {
                const logo = document.querySelector('.nav-logo');
                const heroH1 = document.querySelector('.hero-content h1');
                const aboutH3 = document.querySelector('.about-text h3');
                const footer = document.querySelector('.footer p');
                if (logo) logo.textContent = s.name;
                if (heroH1) heroH1.textContent = s.name;
                if (aboutH3) aboutH3.textContent = 'שלום, אני ' + s.name;
                if (footer) footer.innerHTML = `&copy; 2026 ${esc(s.name)}. כל הזכויות שמורות. <a href="admin.html" style="color:var(--beige);opacity:0.5;text-decoration:none;margin-right:16px">ניהול</a>`;
            }

            if (s.tagline) {
                const heroP = document.querySelector('.hero-content p');
                if (heroP) heroP.textContent = s.tagline;
            }

            if (s.about) {
                const aboutTexts = document.querySelectorAll('.about-text p');
                const paragraphs = s.about.split('\n').filter(Boolean);
                aboutTexts.forEach((p, i) => { if (paragraphs[i]) p.textContent = paragraphs[i]; });
            }

            const contactLinks = document.querySelector('.contact-links');
            if (contactLinks && (s.phone || s.email)) {
                contactLinks.innerHTML = '';
                if (s.phone) contactLinks.innerHTML += `<a href="tel:${esc(s.phone.replace(/[^+\d]/g, ''))}" class="contact-link">📞 ${esc(s.phone)}</a>`;
                if (s.email) contactLinks.innerHTML += `<a href="mailto:${esc(s.email)}" class="contact-link">✉️ ${esc(s.email)}</a>`;
                if (s.instagram) contactLinks.innerHTML += `<a href="https://www.instagram.com/${esc(s.instagram)}" target="_blank" rel="noopener" class="contact-link">📸 @${esc(s.instagram)}</a>`;
                if (s.facebook) contactLinks.innerHTML += `<a href="${esc(s.facebook)}" target="_blank" rel="noopener" class="contact-link">👤 פייסבוק</a>`;
                if (s.whatsapp) contactLinks.innerHTML += `<a href="https://wa.me/${esc(s.whatsapp)}" target="_blank" rel="noopener" class="contact-link">💬 וואטסאפ</a>`;
            }
        } catch (e) {
            // Firebase not available
        }
    }

    // ========== WHATSAPP POPUP ==========
    const waPopup = document.getElementById('waPopup');
    document.getElementById('whatsappBtn').addEventListener('click', () => {
        waPopup.classList.add('show');
    });
    document.getElementById('waCancel').addEventListener('click', () => {
        waPopup.classList.remove('show');
    });
    waPopup.addEventListener('click', (e) => {
        if (e.target === waPopup) waPopup.classList.remove('show');
    });
    document.getElementById('waSend').addEventListener('click', () => {
        const msg = encodeURIComponent('היי, ראיתי את תיק העבודות שלך באתר ואני מתעניין/ת בשירותי הצילום שלך. אשמח לשמוע פרטים נוספים על מחירים וזמינות. תודה!');
        window.open('https://wa.me/972547929628?text=' + msg, '_blank');
        waPopup.classList.remove('show');
    });

    // ========== CONTACT FORM ==========
    const form = document.getElementById('contactForm');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('.submit-btn');
        btn.textContent = 'ההודעה נשלחה! ✓';
        btn.style.background = '#4a7c59';
        setTimeout(() => { btn.textContent = 'שלח הודעה'; btn.style.background = ''; form.reset(); }, 3000);
    });

    // ========== UTILS ==========
    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ========== INIT ==========
    loadSettingsFromFirebase();
    loadTestimonialsFromFirebase();
    loadPhotosFromFirebase();

});
