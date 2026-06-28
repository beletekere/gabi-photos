document.addEventListener('DOMContentLoaded', () => {

    const CLOUDINARY_CLOUD = 'dkpg6thzt';
    const CLOUDINARY_PRESET = 'gabi_photos';
    const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`;

    // ========== AUTH ==========
    const DEFAULT_USER = 'admin';
    const DEFAULT_PASS = 'admin123';

    function getCredentials() {
        const stored = localStorage.getItem('adminCredentials');
        if (stored) return JSON.parse(stored);
        return { username: DEFAULT_USER, password: DEFAULT_PASS };
    }

    function setCredentials(username, password) {
        localStorage.setItem('adminCredentials', JSON.stringify({ username, password }));
    }

    function isLoggedIn() {
        return sessionStorage.getItem('adminLoggedIn') === 'true';
    }

    const loginScreen = document.getElementById('loginScreen');
    const adminApp = document.getElementById('adminApp');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    async function showApp() {
        loginScreen.style.display = 'none';
        adminApp.style.display = 'block';
        await seedDefaultPhotos();
        loadPhotos();
        loadAlbums();
        loadReviews();
        loadSettings();
    }

    async function seedDefaultPhotos() {
        const snapshot = await db.collection('photos').limit(1).get();
        if (!snapshot.empty) return;

        const demos = [
            { imageUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=600&h=400&fit=crop', caption: 'יער בערפל', category: 'nature', forSale: true },
            { imageUrl: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&h=400&fit=crop', caption: 'שביל ביער', category: 'nature', forSale: false },
            { imageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=600&h=400&fit=crop', caption: 'עיר בשקיעה', category: 'street', forSale: false },
            { imageUrl: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=600&h=400&fit=crop', caption: 'נוף הרים', category: 'nature', forSale: false },
            { imageUrl: 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&h=400&fit=crop', caption: 'גשר בלילה', category: 'street', forSale: false },
            { imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&h=400&fit=crop', caption: 'חוף זהוב', category: 'nature', forSale: false },
            { imageUrl: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&h=400&fit=crop', caption: 'סמטה ישנה', category: 'street', forSale: true },
            { imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&h=400&fit=crop', caption: 'שקיעה בהרים', category: 'nature', forSale: true },
            { imageUrl: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=600&h=400&fit=crop', caption: 'רחוב גשום', category: 'street', forSale: false },
        ];

        for (let i = 0; i < demos.length; i++) {
            await db.collection('photos').add({
                ...demos[i],
                createdAt: new Date(Date.now() + i).toISOString()
            });
        }
    }

    if (isLoggedIn()) showApp();

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const creds = getCredentials();
        if (username === creds.username && password === creds.password) {
            sessionStorage.setItem('adminLoggedIn', 'true');
            showApp();
        } else {
            loginError.textContent = 'שם משתמש או סיסמה שגויים';
        }
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
        sessionStorage.removeItem('adminLoggedIn');
        location.reload();
    });

    // ========== CHANGE PASSWORD ==========
    document.getElementById('changePassBtn').addEventListener('click', () => {
        document.getElementById('passwordModal').classList.add('show');
    });
    document.getElementById('passCancel').addEventListener('click', () => {
        document.getElementById('passwordModal').classList.remove('show');
    });
    document.getElementById('passSave').addEventListener('click', () => {
        const current = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirm = document.getElementById('confirmPass').value;
        const creds = getCredentials();
        if (current !== creds.password) { toast('סיסמה נוכחית שגויה', true); return; }
        if (newPass.length < 4) { toast('סיסמה חדשה חייבת להכיל לפחות 4 תווים', true); return; }
        if (newPass !== confirm) { toast('הסיסמאות אינן תואמות', true); return; }
        setCredentials(creds.username, newPass);
        document.getElementById('passwordModal').classList.remove('show');
        document.getElementById('currentPass').value = '';
        document.getElementById('newPass').value = '';
        document.getElementById('confirmPass').value = '';
        toast('הסיסמה שונתה בהצלחה');
    });

    // ========== TABS ==========
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
        });
    });

    // ========== UPLOAD TO CLOUDINARY ==========
    async function uploadToCloudinary(file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_PRESET);
        formData.append('folder', 'gabi-photos');

        const res = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
        const data = await res.json();
        return data.secure_url;
    }

    // ========== PHOTOS ==========
    let pendingFiles = [];
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewGrid = document.getElementById('previewGrid');

    document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.classList.add('dragover'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => { e.preventDefault(); uploadArea.classList.remove('dragover'); handleFiles(e.dataTransfer.files); });

    fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

    function handleFiles(files) {
        pendingFiles = [];
        previewGrid.innerHTML = '';
        let fileIdx = 0;
        Array.from(files).forEach((file) => {
            if (!file.type.startsWith('image/')) return;
            const idx = fileIdx++;
            pendingFiles.push({ file, caption: '', category: 'nature' });
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.dataset.idx = idx;
                div.innerHTML = `
                    <button class="remove-preview" data-idx="${idx}">✕</button>
                    <img src="${e.target.result}" alt="">
                    <input type="text" placeholder="כיתוב..." class="preview-caption" data-idx="${idx}">
                    <select class="preview-category" data-idx="${idx}">
                        <option value="nature">טבע</option>
                        <option value="street">רחוב</option>
                    </select>
                `;
                previewGrid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
        uploadPreview.style.display = 'block';
    }

    previewGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-preview')) {
            const idx = +e.target.dataset.idx;
            pendingFiles[idx] = null;
            e.target.parentElement.remove();
            if (pendingFiles.filter(Boolean).length === 0) uploadPreview.style.display = 'none';
        }
    });

    document.getElementById('cancelUpload').addEventListener('click', () => {
        pendingFiles = [];
        previewGrid.innerHTML = '';
        uploadPreview.style.display = 'none';
    });

    document.getElementById('confirmUpload').addEventListener('click', async () => {
        const btn = document.getElementById('confirmUpload');
        btn.textContent = 'מעלה...';
        btn.disabled = true;
        let count = 0;

        for (let i = 0; i < pendingFiles.length; i++) {
            if (!pendingFiles[i]) continue;
            const captionEl = document.querySelector(`.preview-caption[data-idx="${i}"]`);
            const categoryEl = document.querySelector(`.preview-category[data-idx="${i}"]`);
            try {
                const imageUrl = await uploadToCloudinary(pendingFiles[i].file);
                await db.collection('photos').add({
                    imageUrl,
                    caption: captionEl ? captionEl.value.trim() || 'ללא כיתוב' : 'ללא כיתוב',
                    category: categoryEl ? categoryEl.value : 'nature',
                    forSale: false,
                    createdAt: new Date(Date.now() + count).toISOString()
                });
                count++;
            } catch (err) {
                toast('שגיאה בהעלאת תמונה: ' + err.message, true);
            }
        }

        pendingFiles = [];
        previewGrid.innerHTML = '';
        uploadPreview.style.display = 'none';
        btn.textContent = 'העלה הכל';
        btn.disabled = false;
        loadPhotos();
        toast(`${count} תמונות הועלו בהצלחה`);
    });

    async function loadPhotos() {
        const snapshot = await db.collection('photos').orderBy('createdAt', 'desc').get();
        const grid = document.getElementById('photosGrid');
        const empty = document.getElementById('photosEmpty');

        if (snapshot.empty) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = snapshot.docs.map(doc => {
            const p = doc.data();
            return `
            <div class="photo-card" data-category="${esc(p.category)}" data-id="${doc.id}">
                <img src="${esc(p.imageUrl)}" alt="${esc(p.caption)}">
                <div class="photo-card-body">
                    <div class="caption">${esc(p.caption)}</div>
                    <span class="category-badge">${p.category === 'nature' ? 'טבע' : 'רחוב'}</span>
                    ${p.forSale ? '<span class="sale-badge">למכירה</span>' : ''}
                </div>
                <div class="photo-card-actions">
                    <button class="btn btn-outline btn-small edit-photo" data-id="${doc.id}">ערוך</button>
                    <button class="btn btn-danger btn-small delete-photo" data-id="${doc.id}">מחק</button>
                </div>
            </div>`;
        }).join('');
    }

    // Filter photos
    document.querySelectorAll('.filter-bar .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-bar .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const filter = btn.dataset.filter;
            document.querySelectorAll('.photo-card').forEach(card => {
                card.style.display = (filter === 'all' || card.dataset.category === filter) ? '' : 'none';
            });
        });
    });

    // Edit / Delete photo
    let editingPhotoId = null;

    document.getElementById('photosGrid').addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-photo');
        const deleteBtn = e.target.closest('.delete-photo');

        if (editBtn) {
            editingPhotoId = editBtn.dataset.id;
            const doc = await db.collection('photos').doc(editingPhotoId).get();
            const photo = doc.data();
            if (!photo) return;
            document.getElementById('modalImg').src = photo.imageUrl;
            document.getElementById('editCaption').value = photo.caption;
            document.getElementById('editCategory').value = photo.category;
            document.getElementById('editForSale').value = photo.forSale ? 'yes' : 'no';
            document.getElementById('editModal').classList.add('show');
        }

        if (deleteBtn) {
            if (!confirm('למחוק את התמונה?')) return;
            await db.collection('photos').doc(deleteBtn.dataset.id).delete();
            loadPhotos();
            toast('התמונה נמחקה');
        }
    });

    document.getElementById('modalSave').addEventListener('click', async () => {
        await db.collection('photos').doc(editingPhotoId).update({
            caption: document.getElementById('editCaption').value.trim() || 'ללא כיתוב',
            category: document.getElementById('editCategory').value,
            forSale: document.getElementById('editForSale').value === 'yes'
        });
        document.getElementById('editModal').classList.remove('show');
        loadPhotos();
        toast('התמונה עודכנה');
    });

    document.getElementById('modalCancel').addEventListener('click', () => {
        document.getElementById('editModal').classList.remove('show');
    });

    // ========== REVIEWS ==========
    async function loadReviews() {
        const snapshot = await db.collection('reviews').orderBy('createdAt', 'desc').get();
        const pendingList = document.getElementById('pendingReviewsList');
        const approvedList = document.getElementById('approvedReviewsList');
        const pendingEmpty = document.getElementById('pendingEmpty');
        const approvedEmpty = document.getElementById('approvedEmpty');

        const pending = [];
        const approved = [];
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.approved) approved.push({ id: doc.id, ...data });
            else pending.push({ id: doc.id, ...data });
        });

        pendingEmpty.style.display = pending.length ? 'none' : 'block';
        approvedEmpty.style.display = approved.length ? 'none' : 'block';

        pendingList.innerHTML = pending.map(r => `
            <div class="testimonial-admin-card" data-id="${r.id}">
                <div class="test-content">
                    <strong>${esc(r.name)}</strong>
                    <span class="test-service">${esc(r.service || '')}</span>
                    <div>${'⭐'.repeat(r.rating || 5)}</div>
                    <p>"${esc(r.text)}"</p>
                    <div style="font-size:0.75rem;color:#888;margin-top:4px">${r.createdAt ? new Date(r.createdAt).toLocaleDateString('he-IL') : ''}</div>
                </div>
                <div class="test-actions" style="flex-direction:column;gap:6px">
                    <button class="btn btn-success btn-small approve-review" data-id="${r.id}">אשר</button>
                    <button class="btn btn-danger btn-small delete-review" data-id="${r.id}">מחק</button>
                </div>
            </div>`).join('');

        approvedList.innerHTML = approved.map(r => `
            <div class="testimonial-admin-card" data-id="${r.id}">
                <div class="test-content">
                    <strong>${esc(r.name)}</strong>
                    <span class="test-service">${esc(r.service || '')}</span>
                    <div>${'⭐'.repeat(r.rating || 5)}</div>
                    <p>"${esc(r.text)}"</p>
                </div>
                <div class="test-actions">
                    <button class="btn btn-danger btn-small delete-review" data-id="${r.id}">מחק</button>
                </div>
            </div>`).join('');
    }

    document.getElementById('pendingReviewsList').addEventListener('click', async (e) => {
        const approveBtn = e.target.closest('.approve-review');
        const deleteBtn = e.target.closest('.delete-review');
        if (approveBtn) {
            await db.collection('reviews').doc(approveBtn.dataset.id).update({ approved: true });
            loadReviews();
            toast('הביקורת אושרה ומופיעה באתר');
        }
        if (deleteBtn) {
            if (!confirm('למחוק ביקורת זו?')) return;
            await db.collection('reviews').doc(deleteBtn.dataset.id).delete();
            loadReviews();
            toast('הביקורת נמחקה');
        }
    });

    document.getElementById('approvedReviewsList').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-review');
        if (deleteBtn) {
            if (!confirm('למחוק ביקורת זו?')) return;
            await db.collection('reviews').doc(deleteBtn.dataset.id).delete();
            loadReviews();
            toast('הביקורת נמחקה');
        }
    });

    // ========== SETTINGS ==========
    async function loadSettings() {
        const doc = await db.collection('settings').doc('site').get();
        if (!doc.exists) {
            const defaults = {
                name: 'Gabi Photos',
                tagline: 'לוכד רגעים מהטבע והרחוב',
                phone: '054-792-9628',
                email: 'gmeneh777@gmail.com',
                instagram: 'gabi_smeneh',
                facebook: '',
                whatsapp: '972547929628',
                about: 'צלם עם אהבה גדולה לטבע ולרחובות העיר. אני מאמין שכל רגע מחזיק בתוכו סיפור, וכל מה שצריך זה לדעת מתי ללחוץ על הכפתור.\nאני מצלם בעיקר נופים, צמחייה, חיות בר, ורחובות עם אופי — סמטאות ישנות, שווקים צבעוניים, ואנשים בסביבתם הטבעית.\nמוזמנים לצפות בעבודות שלי וליצור קשר לכל שאלה או הזמנה.'
            };
            await db.collection('settings').doc('site').set(defaults);
        }
        const s = (await db.collection('settings').doc('site').get()).data();
        document.getElementById('siteName').value = s.name || '';
        document.getElementById('siteTagline').value = s.tagline || '';
        document.getElementById('sitePhone').value = s.phone || '';
        document.getElementById('siteEmail').value = s.email || '';
        document.getElementById('siteInstagram').value = s.instagram || '';
        document.getElementById('siteFacebook').value = s.facebook || '';
        document.getElementById('siteWhatsapp').value = s.whatsapp || '';
        document.getElementById('siteAbout').value = s.about || '';
    }

    document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
        const settings = {
            name: document.getElementById('siteName').value.trim(),
            tagline: document.getElementById('siteTagline').value.trim(),
            phone: document.getElementById('sitePhone').value.trim(),
            email: document.getElementById('siteEmail').value.trim(),
            instagram: document.getElementById('siteInstagram').value.trim(),
            facebook: document.getElementById('siteFacebook').value.trim(),
            whatsapp: document.getElementById('siteWhatsapp').value.trim(),
            about: document.getElementById('siteAbout').value.trim()
        };
        await db.collection('settings').doc('site').set(settings);
        toast('ההגדרות נשמרו בהצלחה');
    });

    // ========== ALBUMS ==========
    let editingAlbumId = null;
    let albumPendingFiles = [];

    async function loadAlbums() {
        const snapshot = await db.collection('albums').orderBy('createdAt', 'desc').get();
        const grid = document.getElementById('albumsAdminGrid');
        const empty = document.getElementById('albumsAdminEmpty');

        if (snapshot.empty) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        grid.innerHTML = snapshot.docs.map(doc => {
            const a = doc.data();
            return `
            <div class="photo-card" data-id="${doc.id}">
                <img src="${esc(a.coverUrl || '')}" alt="${esc(a.name)}" style="${a.coverUrl ? '' : 'background:var(--beige)'}">
                <div class="photo-card-body">
                    <div class="caption">${esc(a.name)}</div>
                    <span class="category-badge">${esc(a.date || '')}</span>
                    <span class="category-badge">${a.photoCount || 0} תמונות</span>
                </div>
                <div class="photo-card-actions">
                    <button class="btn btn-outline btn-small album-photos-btn" data-id="${doc.id}">תמונות</button>
                    <button class="btn btn-outline btn-small album-share-btn" data-id="${doc.id}">שתף</button>
                    <button class="btn btn-danger btn-small album-delete-btn" data-id="${doc.id}">מחק</button>
                </div>
            </div>`;
        }).join('');
    }

    document.getElementById('addAlbumBtn').addEventListener('click', () => {
        editingAlbumId = null;
        document.getElementById('albumModalTitle').textContent = 'אלבום חדש';
        document.getElementById('albumName').value = '';
        document.getElementById('albumDate').value = '';
        document.getElementById('albumDescription').value = '';
        document.getElementById('albumFileInput').value = '';
        document.getElementById('albumPreviewGrid').innerHTML = '';
        albumPendingFiles = [];
        document.getElementById('albumModal').classList.add('show');
    });

    document.getElementById('albumFileInput').addEventListener('change', (e) => {
        const grid = document.getElementById('albumPreviewGrid');
        Array.from(e.target.files).forEach(file => {
            if (!file.type.startsWith('image/')) return;
            albumPendingFiles.push(file);
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `<img src="${ev.target.result}" alt=""><input type="text" placeholder="כיתוב..." class="album-photo-caption">`;
                grid.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    });

    document.getElementById('albumSave').addEventListener('click', async () => {
        const name = document.getElementById('albumName').value.trim();
        if (!name) { toast('נא להזין שם לאלבום', true); return; }

        const btn = document.getElementById('albumSave');
        btn.textContent = 'שומר...';
        btn.disabled = true;

        let coverUrl = '';
        const photoUrls = [];

        for (let i = 0; i < albumPendingFiles.length; i++) {
            try {
                const url = await uploadToCloudinary(albumPendingFiles[i]);
                const captionEl = document.querySelectorAll('.album-photo-caption')[i];
                photoUrls.push({ imageUrl: url, caption: captionEl ? captionEl.value.trim() || '' : '', order: i });
                if (i === 0) coverUrl = url;
            } catch (err) {
                toast('שגיאה בהעלאת תמונה', true);
            }
        }

        const shareToken = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);

        const albumData = {
            name,
            date: document.getElementById('albumDate').value,
            description: document.getElementById('albumDescription').value.trim(),
            coverUrl,
            photoCount: photoUrls.length,
            shareToken,
            createdAt: new Date().toISOString()
        };

        const albumRef = await db.collection('albums').add(albumData);

        for (const photo of photoUrls) {
            await albumRef.collection('photos').add(photo);
        }

        btn.textContent = 'שמור';
        btn.disabled = false;
        albumPendingFiles = [];
        document.getElementById('albumModal').classList.remove('show');
        loadAlbums();
        toast(`אלבום "${name}" נוצר עם ${photoUrls.length} תמונות`);
    });

    document.getElementById('albumCancel').addEventListener('click', () => {
        document.getElementById('albumModal').classList.remove('show');
    });

    document.getElementById('albumsAdminGrid').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.album-delete-btn');
        const photosBtn = e.target.closest('.album-photos-btn');
        const shareBtn = e.target.closest('.album-share-btn');

        if (deleteBtn) {
            if (!confirm('למחוק את האלבום וכל התמונות שבו?')) return;
            const id = deleteBtn.dataset.id;
            const photos = await db.collection('albums').doc(id).collection('photos').get();
            for (const doc of photos.docs) { await doc.ref.delete(); }
            await db.collection('albums').doc(id).delete();
            loadAlbums();
            toast('האלבום נמחק');
        }

        if (shareBtn) {
            const id = shareBtn.dataset.id;
            const albumDoc = await db.collection('albums').doc(id).get();
            let token = albumDoc.data().shareToken;
            if (!token) {
                token = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
                await db.collection('albums').doc(id).update({ shareToken: token });
            }
            const base = window.location.href.split('admin.html')[0];
            const siteUrl = base + 'albums.html?id=' + id + '&token=' + token;

            document.getElementById('shareAlbumLink').value = siteUrl;
            document.getElementById('shareAlbumModal').classList.add('show');

            document.getElementById('shareAlbumCopy').onclick = () => {
                const input = document.getElementById('shareAlbumLink');
                input.select();
                document.execCommand('copy');
                document.getElementById('shareAlbumCopy').textContent = 'הועתק!';
                setTimeout(() => { document.getElementById('shareAlbumCopy').textContent = 'העתק קישור'; }, 2000);
            };
            document.getElementById('shareAlbumWa').onclick = () => {
                const msg = encodeURIComponent('היי, הנה אלבום הצילומים: ' + siteUrl);
                window.open('https://wa.me/?text=' + msg, '_blank');
            };
            document.getElementById('shareAlbumClose').onclick = () => {
                document.getElementById('shareAlbumModal').classList.remove('show');
            };
        }

        if (photosBtn) {
            const id = photosBtn.dataset.id;
            editingAlbumId = id;
            const albumDoc = await db.collection('albums').doc(id).get();
            document.getElementById('albumPhotosTitle').textContent = 'תמונות: ' + albumDoc.data().name;

            const snapshot = await db.collection('albums').doc(id).collection('photos').orderBy('order', 'asc').get();
            const grid = document.getElementById('albumPhotosAdminGrid');
            grid.innerHTML = snapshot.docs.map(doc => {
                const p = doc.data();
                return `
                <div class="photo-card" data-id="${doc.id}">
                    <img src="${esc(p.imageUrl)}" alt="${esc(p.caption)}">
                    <div class="photo-card-body">
                        <div class="caption">${esc(p.caption || 'ללא כיתוב')}</div>
                    </div>
                    <div class="photo-card-actions">
                        <button class="btn btn-danger btn-small album-photo-delete" data-id="${doc.id}">מחק</button>
                    </div>
                </div>`;
            }).join('');

            document.getElementById('albumPhotosModal').classList.add('show');
        }
    });

    document.getElementById('albumPhotosAdminGrid').addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.album-photo-delete');
        if (!deleteBtn || !editingAlbumId) return;
        if (!confirm('למחוק תמונה זו מהאלבום?')) return;
        await db.collection('albums').doc(editingAlbumId).collection('photos').doc(deleteBtn.dataset.id).delete();
        const remaining = await db.collection('albums').doc(editingAlbumId).collection('photos').get();
        await db.collection('albums').doc(editingAlbumId).update({ photoCount: remaining.size });
        deleteBtn.closest('.photo-card').remove();
        toast('התמונה נמחקה מהאלבום');
    });

    document.getElementById('albumAddPhotosInput').addEventListener('change', async (e) => {
        if (!editingAlbumId) return;
        const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
        if (!files.length) return;
        toast('מעלה ' + files.length + ' תמונות...');

        const existing = await db.collection('albums').doc(editingAlbumId).collection('photos').get();
        let order = existing.size;

        for (const file of files) {
            const url = await uploadToCloudinary(file);
            await db.collection('albums').doc(editingAlbumId).collection('photos').add({ imageUrl: url, caption: '', order: order++ });
        }

        const firstPhoto = (await db.collection('albums').doc(editingAlbumId).collection('photos').orderBy('order', 'asc').limit(1).get()).docs[0];
        await db.collection('albums').doc(editingAlbumId).update({
            photoCount: order,
            coverUrl: firstPhoto ? firstPhoto.data().imageUrl : ''
        });

        document.querySelectorAll('.album-photos-btn[data-id="' + editingAlbumId + '"]')[0]?.click();
        loadAlbums();
        toast(files.length + ' תמונות נוספו לאלבום');
    });

    document.getElementById('albumPhotosClose').addEventListener('click', () => {
        document.getElementById('albumPhotosModal').classList.remove('show');
    });

    // ========== MODAL CLOSE ON OVERLAY ==========
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('show'); });
    });

    // ========== TOAST ==========
    function toast(msg, isError) {
        let el = document.querySelector('.toast');
        if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
        el.textContent = msg;
        el.classList.toggle('error', !!isError);
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    }

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

});
