document.addEventListener('DOMContentLoaded', () => {

    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => navLinks.classList.remove('open'));
    });

    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    const params = new URLSearchParams(window.location.search);
    const albumId = params.get('id');

    if (albumId) {
        loadAlbumView(albumId);
    } else {
        loadAlbumsList();
    }

    async function loadAlbumsList() {
        document.getElementById('albumsPage').style.display = '';
        document.getElementById('albumView').style.display = 'none';

        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        const grid = document.getElementById('albumsGrid');
        const empty = document.getElementById('albumsEmpty');

        if (snapshot.empty) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = snapshot.docs.map(doc => {
            const a = doc.data();
            const photoCount = a.photoCount || 0;
            return `
            <a href="albums.html?id=${doc.id}" class="album-card">
                <div class="album-cover" style="background-image: url('${esc(a.coverUrl || '')}')">
                    <div class="album-cover-overlay">
                        <span class="album-count">${photoCount} תמונות</span>
                    </div>
                </div>
                <div class="album-info">
                    <h3>${esc(a.name)}</h3>
                    <p>${esc(a.date || '')}</p>
                </div>
            </a>`;
        }).join('');
    }

    async function loadAlbumView(id) {
        document.getElementById('albumsPage').style.display = 'none';
        document.getElementById('albumView').style.display = '';

        const albumDoc = await db.collection('albums').doc(id).get();
        if (!albumDoc.exists) {
            document.getElementById('albumTitle').textContent = 'האלבום לא נמצא';
            return;
        }

        const album = albumDoc.data();
        document.getElementById('albumTitle').textContent = album.name;
        document.getElementById('albumDate').textContent = album.date || '';
        document.getElementById('albumDesc').textContent = album.description || '';
        document.title = album.name + ' | Gabi Photos';

        const snapshot = await db.collection('albums').doc(id).collection('photos').orderBy('order', 'asc').get();
        const grid = document.getElementById('albumPhotosGrid');

        grid.innerHTML = snapshot.docs.map(doc => {
            const p = doc.data();
            return `
            <div class="gallery-item">
                <div class="gallery-frame">
                    <img src="${esc(p.imageUrl)}" alt="${esc(p.caption)}" loading="lazy">
                    <div class="gallery-caption">${esc(p.caption)}</div>
                </div>
            </div>`;
        }).join('');

        document.querySelectorAll('.gallery-frame').forEach(frame => {
            frame.addEventListener('click', () => {
                const visibleFrames = Array.from(document.querySelectorAll('.gallery-frame'));
                const idx = visibleFrames.indexOf(frame);
                openLightbox(idx >= 0 ? idx : 0);
            });
        });

        // Share
        const shareLink = window.location.origin + window.location.pathname + '?id=' + id;
        document.getElementById('shareBtn').addEventListener('click', () => {
            document.getElementById('shareLinkInput').value = shareLink;
            document.getElementById('sharePopup').classList.add('show');
        });
        document.getElementById('shareCloseBtn').addEventListener('click', () => {
            document.getElementById('sharePopup').classList.remove('show');
        });
        document.getElementById('sharePopup').addEventListener('click', (e) => {
            if (e.target.id === 'sharePopup') document.getElementById('sharePopup').classList.remove('show');
        });
        document.getElementById('shareCopyBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(shareLink).then(() => {
                document.getElementById('shareCopyBtn').textContent = 'הועתק!';
                setTimeout(() => { document.getElementById('shareCopyBtn').textContent = 'העתק קישור'; }, 2000);
            });
        });
        document.getElementById('shareWaBtn').addEventListener('click', () => {
            const msg = encodeURIComponent('היי, הנה אלבום הצילומים: ' + shareLink);
            window.open('https://wa.me/?text=' + msg, '_blank');
        });
    }

    // Lightbox
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxCaption = document.getElementById('lightboxCaption');
    let currentImages = [];
    let currentIndex = 0;

    function openLightbox(index) {
        currentImages = Array.from(document.querySelectorAll('.gallery-frame'));
        currentIndex = index;
        showCurrent();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function showCurrent() {
        const frame = currentImages[currentIndex];
        const img = frame.querySelector('img');
        const caption = frame.querySelector('.gallery-caption');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxCaption.textContent = caption ? caption.textContent : '';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
    document.getElementById('lightboxPrev').addEventListener('click', () => {
        currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        showCurrent();
    });
    document.getElementById('lightboxNext').addEventListener('click', () => {
        currentIndex = (currentIndex + 1) % currentImages.length;
        showCurrent();
    });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowRight') { currentIndex = (currentIndex - 1 + currentImages.length) % currentImages.length; showCurrent(); }
        if (e.key === 'ArrowLeft') { currentIndex = (currentIndex + 1) % currentImages.length; showCurrent(); }
    });

});
