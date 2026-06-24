document.addEventListener('DOMContentLoaded', () => {

    const DB_NAME = 'gabiPhotoDB';
    const DB_VERSION = 1;
    let db = null;

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('photos')) {
                    db.createObjectStore('photos', { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => { db = e.target.result; resolve(db); };
            request.onerror = (e) => reject(e);
        });
    }

    function dbPut(storeName, data) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).put(data);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    function dbDelete(storeName, id) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            tx.objectStore(storeName).delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }

    function dbGetAll(storeName) {
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const request = tx.objectStore(storeName).getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (e) => reject(e);
        });
    }

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

    function showApp() {
        loginScreen.style.display = 'none';
        adminApp.style.display = 'block';
        loadPhotos();
        loadTestimonials();
        loadSettings();
    }

    if (isLoggedIn()) {
        showApp();
    }

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

        if (current !== creds.password) {
            toast('סיסמה נוכחית שגויה', true);
            return;
        }
        if (newPass.length < 4) {
            toast('סיסמה חדשה חייבת להכיל לפחות 4 תווים', true);
            return;
        }
        if (newPass !== confirm) {
            toast('הסיסמאות אינן תואמות', true);
            return;
        }

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

    // ========== PHOTOS ==========
    let pendingFiles = [];

    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewGrid = document.getElementById('previewGrid');

    document.getElementById('uploadBtn').addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });

    function handleFiles(files) {
        pendingFiles = [];
        previewGrid.innerHTML = '';

        Array.from(files).forEach((file, i) => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                pendingFiles.push({
                    dataUrl: e.target.result,
                    name: file.name
                });

                const div = document.createElement('div');
                div.className = 'preview-item';
                div.innerHTML = `
                    <button class="remove-preview" data-idx="${pendingFiles.length - 1}">✕</button>
                    <img src="${e.target.result}" alt="">
                    <input type="text" placeholder="כיתוב..." class="preview-caption" data-idx="${pendingFiles.length - 1}">
                    <select class="preview-category" data-idx="${pendingFiles.length - 1}">
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
            if (pendingFiles.filter(Boolean).length === 0) {
                uploadPreview.style.display = 'none';
            }
        }
    });

    document.getElementById('cancelUpload').addEventListener('click', () => {
        pendingFiles = [];
        previewGrid.innerHTML = '';
        uploadPreview.style.display = 'none';
    });

    document.getElementById('confirmUpload').addEventListener('click', async () => {
        const captions = document.querySelectorAll('.preview-caption');
        const categories = document.querySelectorAll('.preview-category');
        let count = 0;

        for (let i = 0; i < pendingFiles.length; i++) {
            if (!pendingFiles[i]) continue;

            const resized = await resizeImage(pendingFiles[i].dataUrl, 1200);

            const photo = {
                id: Date.now() + '-' + i,
                dataUrl: resized,
                caption: captions[i] ? captions[i].value.trim() || 'ללא כיתוב' : 'ללא כיתוב',
                category: categories[i] ? categories[i].value : 'nature',
                forSale: false,
                createdAt: new Date().toISOString()
            };

            await dbPut('photos', photo);
            count++;
        }

        pendingFiles = [];
        previewGrid.innerHTML = '';
        uploadPreview.style.display = 'none';
        loadPhotos();
        toast(`${count} תמונות הועלו בהצלחה`);
    });

    function resizeImage(dataUrl, maxWidth) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let w = img.width;
                let h = img.height;

                if (w > maxWidth) {
                    h = (maxWidth / w) * h;
                    w = maxWidth;
                }

                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.85));
            };
            img.src = dataUrl;
        });
    }

    async function loadPhotos() {
        const photos = await dbGetAll('photos');
        const grid = document.getElementById('photosGrid');
        const empty = document.getElementById('photosEmpty');

        if (photos.length === 0) {
            grid.innerHTML = '';
            empty.style.display = 'block';
            return;
        }

        empty.style.display = 'none';
        photos.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        grid.innerHTML = photos.map(p => `
            <div class="photo-card" data-category="${esc(p.category)}" data-id="${esc(p.id)}">
                <img src="${esc(p.dataUrl)}" alt="${esc(p.caption)}">
                <div class="photo-card-body">
                    <div class="caption">${esc(p.caption)}</div>
                    <span class="category-badge">${p.category === 'nature' ? 'טבע' : 'רחוב'}</span>
                    ${p.forSale ? '<span class="sale-badge">למכירה</span>' : ''}
                </div>
                <div class="photo-card-actions">
                    <button class="btn btn-outline btn-small edit-photo" data-id="${esc(p.id)}">ערוך</button>
                    <button class="btn btn-danger btn-small delete-photo" data-id="${esc(p.id)}">מחק</button>
                </div>
            </div>
        `).join('');
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
            const photos = await dbGetAll('photos');
            const photo = photos.find(p => p.id === editingPhotoId);
            if (!photo) return;

            document.getElementById('modalImg').src = photo.dataUrl;
            document.getElementById('editCaption').value = photo.caption;
            document.getElementById('editCategory').value = photo.category;
            document.getElementById('editForSale').value = photo.forSale ? 'yes' : 'no';
            document.getElementById('editModal').classList.add('show');
        }

        if (deleteBtn) {
            if (!confirm('למחוק את התמונה?')) return;
            await dbDelete('photos', deleteBtn.dataset.id);
            loadPhotos();
            toast('התמונה נמחקה');
        }
    });

    document.getElementById('modalSave').addEventListener('click', async () => {
        const photos = await dbGetAll('photos');
        const photo = photos.find(p => p.id === editingPhotoId);
        if (!photo) return;

        photo.caption = document.getElementById('editCaption').value.trim() || 'ללא כיתוב';
        photo.category = document.getElementById('editCategory').value;
        photo.forSale = document.getElementById('editForSale').value === 'yes';

        await dbPut('photos', photo);
        document.getElementById('editModal').classList.remove('show');
        loadPhotos();
        toast('התמונה עודכנה');
    });

    document.getElementById('modalCancel').addEventListener('click', () => {
        document.getElementById('editModal').classList.remove('show');
    });

    // ========== TESTIMONIALS ==========
    function getTestimonials() {
        return JSON.parse(localStorage.getItem('siteTestimonials') || '[]');
    }

    function saveTestimonials(list) {
        localStorage.setItem('siteTestimonials', JSON.stringify(list));
    }

    let editingTestId = null;

    function loadTestimonials() {
        let testimonials = getTestimonials();

        if (testimonials.length === 0) {
            testimonials = [
                { id: '1', name: 'רונית כהן', service: 'אירוע משפחתי', rating: 5, text: 'גבי צילם לנו את יום ההולדת של הבת שלנו והתוצאות היו מדהימות. הוא הצליח ללכוד רגעים שאפילו לא שמנו לב אליהם. ממליצים בחום!' },
                { id: '2', name: 'אייל ברק', service: 'צילום תדמית', rating: 5, text: 'הזמנתי צילום תדמית לפרופיל העסקי שלי. גבי גרם לי להרגיש בנוח מול המצלמה, והתמונות יצאו טבעיות ומקצועיות.' },
                { id: '3', name: 'מיכל ודני לוי', service: 'הדפסה לסלון', rating: 5, text: 'קנינו הדפסה של צילום הנוף שלו לסלון, ואנשים תמיד שואלים מאיפה זה. איכות מטורפת ושירות אדיב.' },
                { id: '4', name: 'יוסי אברהם', service: 'צילום נדל"ן', rating: 5, text: 'גבי צילם את הדירה שלנו למכירה. התמונות היו ברמה אחרת לגמרי — הדירה נמכרה תוך שבועיים! שווה כל שקל.' },
                { id: '5', name: 'שירה מזרחי', service: 'צילום משפחתי', rating: 5, text: 'עשינו צילומי משפחה בטבע וזה היה חוויה נפלאה. גבי סבלני, יצירתי ומקצועי. התמונות מושלמות!' }
            ];
            saveTestimonials(testimonials);
        }

        renderTestimonials(testimonials);
    }

    function renderTestimonials(testimonials) {
        const list = document.getElementById('testimonialsList');
        list.innerHTML = testimonials.map(t => `
            <div class="testimonial-admin-card" data-id="${esc(t.id)}">
                <div class="test-content">
                    <strong>${esc(t.name)}</strong>
                    <span class="test-service">${esc(t.service)}</span>
                    <div>${'⭐'.repeat(t.rating)}</div>
                    <p>"${esc(t.text)}"</p>
                </div>
                <div class="test-actions">
                    <button class="btn btn-outline btn-small edit-test" data-id="${esc(t.id)}">ערוך</button>
                    <button class="btn btn-danger btn-small delete-test" data-id="${esc(t.id)}">מחק</button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('addTestimonialBtn').addEventListener('click', () => {
        editingTestId = null;
        document.getElementById('testName').value = '';
        document.getElementById('testService').value = '';
        document.getElementById('testRating').value = '5';
        document.getElementById('testText').value = '';
        document.getElementById('testimonialModal').classList.add('show');
    });

    document.getElementById('testimonialsList').addEventListener('click', (e) => {
        const editBtn = e.target.closest('.edit-test');
        const deleteBtn = e.target.closest('.delete-test');

        if (editBtn) {
            editingTestId = editBtn.dataset.id;
            const testimonials = getTestimonials();
            const t = testimonials.find(x => x.id === editingTestId);
            if (!t) return;

            document.getElementById('testName').value = t.name;
            document.getElementById('testService').value = t.service;
            document.getElementById('testRating').value = t.rating;
            document.getElementById('testText').value = t.text;
            document.getElementById('testimonialModal').classList.add('show');
        }

        if (deleteBtn) {
            if (!confirm('למחוק את ההמלצה?')) return;
            let testimonials = getTestimonials();
            testimonials = testimonials.filter(t => t.id !== deleteBtn.dataset.id);
            saveTestimonials(testimonials);
            renderTestimonials(testimonials);
            toast('ההמלצה נמחקה');
        }
    });

    document.getElementById('testSave').addEventListener('click', () => {
        const name = document.getElementById('testName').value.trim();
        const text = document.getElementById('testText').value.trim();
        if (!name || !text) { toast('נא למלא שם וטקסט', true); return; }

        let testimonials = getTestimonials();
        const entry = {
            id: editingTestId || Date.now().toString(),
            name,
            service: document.getElementById('testService').value.trim(),
            rating: +document.getElementById('testRating').value,
            text
        };

        if (editingTestId) {
            const idx = testimonials.findIndex(t => t.id === editingTestId);
            if (idx >= 0) testimonials[idx] = entry;
        } else {
            testimonials.push(entry);
        }

        saveTestimonials(testimonials);
        renderTestimonials(testimonials);
        document.getElementById('testimonialModal').classList.remove('show');
        toast(editingTestId ? 'ההמלצה עודכנה' : 'ההמלצה נוספה');
    });

    document.getElementById('testCancel').addEventListener('click', () => {
        document.getElementById('testimonialModal').classList.remove('show');
    });

    // ========== SETTINGS ==========
    function getSettings() {
        return JSON.parse(localStorage.getItem('siteSettings') || '{}');
    }

    function loadSettings() {
        const s = getSettings();
        document.getElementById('siteName').value = s.name || 'גבי סמינה';
        document.getElementById('siteTagline').value = s.tagline || 'לוכד רגעים מהטבע והרחוב';
        document.getElementById('sitePhone').value = s.phone || '';
        document.getElementById('siteEmail').value = s.email || '';
        document.getElementById('siteInstagram').value = s.instagram || '';
        document.getElementById('siteFacebook').value = s.facebook || '';
        document.getElementById('siteWhatsapp').value = s.whatsapp || '';
        document.getElementById('siteAbout').value = s.about || '';
    }

    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
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
        localStorage.setItem('siteSettings', JSON.stringify(settings));
        toast('ההגדרות נשמרו בהצלחה');
    });

    // ========== MODAL CLOSE ON OVERLAY ==========
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.remove('show');
        });
    });

    // ========== TOAST ==========
    function toast(msg, isError) {
        let el = document.querySelector('.toast');
        if (!el) {
            el = document.createElement('div');
            el.className = 'toast';
            document.body.appendChild(el);
        }
        el.textContent = msg;
        el.classList.toggle('error', !!isError);
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3000);
    }

    // ========== UTILS ==========
    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    // ========== INIT ==========
    openDB().then(() => {
        if (isLoggedIn()) {
            loadPhotos();
        }
    });

});
