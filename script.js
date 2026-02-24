// ============================================
// TKS - MODERN TECH INTERACTIVE JAVASCRIPT
// ============================================

// ============================================
// 1. THEME MANAGER
// ============================================
const ThemeManager = {
    STORAGE_KEY: 'tks-theme',
    DARK_CLASS: 'dark',

    init() {
        this.applyStoredTheme();
        this.attachListeners();
    },

    applyStoredTheme() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY) || 'dark';
        this.setTheme(savedTheme);
    },

    setTheme(theme) {
        const html = document.documentElement;
        html.classList.toggle(this.DARK_CLASS, theme === 'dark');
        localStorage.setItem(this.STORAGE_KEY, theme);
    },

    toggle() {
        const isDark = document.documentElement.classList.contains(this.DARK_CLASS);
        this.setTheme(isDark ? 'light' : 'dark');
    },

    attachListeners() {
        const toggles = document.querySelectorAll('#themeToggle, #themeToggleMobile');
        toggles.forEach(btn => {
            btn.removeEventListener('click', this._handleToggle); // Verhindert doppelte Listener
            this._handleToggle = (e) => {
                e.preventDefault();
                this.toggle();
            };
            btn.addEventListener('click', this._handleToggle);
        });
    }
};

// ============================================
// 2. MOBILE MENU
// ============================================
const MobileMenu = {
    init() {
        const hamburger = document.getElementById('hamburger');
        const mobileMenu = document.getElementById('mobileMenu');
        if (!hamburger || !mobileMenu) return;

        // Listener zurücksetzen
        hamburger.replaceWith(hamburger.cloneNode(true));
        const newHamburger = document.getElementById('hamburger');

        newHamburger.addEventListener('click', () => {
            newHamburger.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        mobileMenu.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                newHamburger.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });
    }
};

// ============================================
// 3. SMART SLOW COUNTER
// ============================================
const Counter = {
    hasAnimated: false,
    init() {
        if (this.hasAnimated) return;
        const elements = document.querySelectorAll('.stat-number');
        if (!elements.length) return;

        const observer = new IntersectionObserver((entries, obs) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounters(elements);
                    this.hasAnimated = true;
                    obs.disconnect();
                }
            });
        }, { threshold: 0.5 });

        elements.forEach(el => observer.observe(el));
    },

    animateCounters(elements) {
        elements.forEach((el, index) => {
            const target = parseInt(el.dataset.target, 10);
            const duration = 4000;
            setTimeout(() => this.animate(el, target, duration), index * 200);
        });
    },

    animate(el, target, duration) {
        let start = null;
        const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const percent = Math.min(progress / duration, 1);
            const eased = easeOutQuart(percent);
            const value = Math.floor(eased * target);
            el.textContent = value.toLocaleString();
            if (progress < duration) requestAnimationFrame(step);
            else el.textContent = target.toLocaleString();
        };
        requestAnimationFrame(step);
    }
};

// ============================================
// 4. SCROLL ANIMATIONS
// ============================================
const ScrollAnimations = {
    init() {
        const elements = document.querySelectorAll('.scroll-animate');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) entry.target.classList.add('visible');
            });
        }, { threshold: 0.1 });
        elements.forEach(el => observer.observe(el));
    }
};

// ============================================
// 5. 3D CUBE
// ============================================
const Cube3D = {
    init() {
        const cube = document.querySelector('.cube');
        if (!cube) return;
        document.addEventListener('mousemove', (e) => {
            const x = (e.clientY - window.innerHeight / 2) / 15;
            const y = (e.clientX - window.innerWidth / 2) / 15;
            cube.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
        });
    }
};

// ============================================
// 6. SMOOTH SCROLL
// ============================================
const SmoothScroll = {
    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;
                
                // Falls Link auf index.html verweist, normal navigieren
                if (href.includes('index.html')) return;

                const target = document.querySelector(href);
                if (!target) return;
                
                e.preventDefault();
                window.scrollTo({
                    top: target.offsetTop - 64,
                    behavior: 'smooth'
                });
            });
        });
    }
};

// ============================================
// 7. MAIN APP INIT
// ============================================
function initializeNavbar() {
    ThemeManager.attachListeners();
    MobileMenu.init();
    SmoothScroll.init();
}

document.addEventListener('DOMContentLoaded', () => {
    ScrollAnimations.init();
    Cube3D.init();
    SmoothScroll.init();
    
    // Theme sofort anwenden
    ThemeManager.applyStoredTheme();

    // Falls Header bereits geladen (durch include.js) oder noch nicht
    if (document.getElementById('hamburger')) {
        initializeNavbar();
    }
    
    document.addEventListener('headerLoaded', initializeNavbar);

    // Loader & Counter
    window.addEventListener('load', () => {
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            setTimeout(() => {
                loadingOverlay.style.opacity = '0';
                setTimeout(() => {
                    loadingOverlay.remove();
                    Counter.init();
                }, 500);
            }, 8000);
        } else {
            Counter.init();
        }
    });
});

// ============================================
// 8. UPLOAD FILE HANDLER (Kontakt-Formular)
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileUploadInput');
    const uploadArea = document.querySelector('.upload-file-area');
    const fileList = document.getElementById('fileList');
    const uploadMessage = document.querySelector('.upload-file-message');
    const pdfLinkInput = document.getElementById('pdf_link');
    const formStatus = document.getElementById('formStatus');
    const submitBtn = document.getElementById('submitBtn');
    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const allowedExtensions = ['.pdf', '.dwg', '.dxf'];

    let uploadedFiles = [];

    if (!fileInput || !uploadArea) return;

    if (uploadArea.dataset.initialized === 'true') return;
    uploadArea.dataset.initialized = 'true';

    if (!fileInput.name) {
        fileInput.name = 'attachment';
    }

    const contactForm = document.getElementById('contactForm');
    let firebaseServicesPromise = null;

    function getFirebaseConfig() {
        const config = window.TKS_FIREBASE_CONFIG;
        if (!config || typeof config !== 'object') return null;

        const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
        const isValid = requiredKeys.every((key) => typeof config[key] === 'string' && config[key].trim() !== '');

        return isValid ? config : null;
    }

    async function getFirebaseServices() {
        if (firebaseServicesPromise) return firebaseServicesPromise;

        firebaseServicesPromise = (async () => {
            const config = getFirebaseConfig();
            if (!config) return null;

            const [{ initializeApp }, { getStorage, ref, uploadBytes, getDownloadURL }] = await Promise.all([
                import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
                import('https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js')
            ]);

            const app = initializeApp(config, 'tks-contact-upload');
            const storage = getStorage(app);
            return { storage, ref, uploadBytes, getDownloadURL };
        })();

        return firebaseServicesPromise;
    }

    function sanitizeFileName(fileName) {
        return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    }

    function sanitizePathSegment(value) {
        return value
            .toString()
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^a-z0-9_-]/g, '')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    async function uploadFilesToFirebase(files, userName) {
        if (!files.length) return [];

        const firebase = await getFirebaseServices();
        if (!firebase) return [];

        const folder = (window.TKS_FIREBASE_STORAGE_PATH || 'contact_uploads').replace(/\/+$/, '');
        const safeUserName = sanitizePathSegment(userName || '') || 'unknown_user';
        const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const links = [];

        for (let index = 0; index < files.length; index += 1) {
            const file = files[index];
            const safeFileName = sanitizeFileName(file.name);
            const storageRef = firebase.ref(firebase.storage, `${folder}/${safeUserName}/${stamp}-${index}-${safeFileName}`);

            await firebase.uploadBytes(storageRef, file, {
                contentType: file.type || 'application/octet-stream'
            });

            const downloadUrl = await firebase.getDownloadURL(storageRef);
            links.push(downloadUrl);
        }

        return links;
    }

    function clearContactForm() {
        if (!contactForm) return;
        contactForm.reset();
        uploadedFiles = [];
        if (pdfLinkInput) {
            pdfLinkInput.value = '';
        }
        renderFileList();
        syncFilesToInput();
    }

    function syncFilesToInput() {
        const dataTransfer = new DataTransfer();
        uploadedFiles.forEach(file => dataTransfer.items.add(file));
        fileInput.files = dataTransfer.files;
    }

    // Click to upload
    uploadArea.addEventListener('click', (e) => {
        if (e.target === fileInput || e.target.closest('.upload-file-remove')) return;
        fileInput.click();
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        handleFiles(files);
    });

    // Drag & Drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('drag-over');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('drag-over');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('drag-over');
        const files = Array.from(e.dataTransfer.files);
        handleFiles(files);
    });

    function handleFiles(files) {
        files.forEach(file => {
            // Check max 4 files limit
            if (uploadedFiles.length >= 4) {
                alert('Maximum 4 Dateien sind erlaubt');
                return;
            }

            // Validate file size
            if (file.size > maxFileSize) {
                alert(`${file.name} ist zu groß (max. 5MB)`);
                return;
            }

            // Validate file extension
            const fileName = file.name.toLowerCase();
            const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
            
            if (!hasValidExtension) {
                alert(`${file.name} ist nicht erlaubt (nur PDF, DWG, DXF)`);
                return;
            }

            // Check if file already uploaded
            if (uploadedFiles.some(f => f.name === file.name && f.size === file.size)) {
                alert(`${file.name} wurde bereits hinzugefügt`);
                return;
            }

            uploadedFiles.push(file);
        });

        renderFileList();
        syncFilesToInput();
    }

    function renderFileList() {
        fileList.innerHTML = '';

        if (uploadedFiles.length === 0) {
            uploadMessage.style.display = 'block';
            return;
        }

        uploadMessage.style.display = 'none';

        uploadedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'upload-file-item';
            fileItem.innerHTML = `
                <span class="upload-file-name">${file.name}</span>
                <span class="upload-file-item-size">${(file.size / 1024).toFixed(2)} KB</span>
                <button type="button" class="upload-file-remove" data-index="${index}">✕</button>
            `;

            fileItem.querySelector('.upload-file-remove').addEventListener('click', () => {
                uploadedFiles.splice(index, 1);
                renderFileList();
                syncFilesToInput();
            });

            fileList.appendChild(fileItem);
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            if (contactForm.dataset.submitting === 'true') {
                e.preventDefault();
                return;
            }

            const hasFiles = uploadedFiles.length > 0;
            if (!hasFiles) {
                setTimeout(() => {
                    clearContactForm();
                }, 0);
                return;
            }

            e.preventDefault();
            contactForm.dataset.submitting = 'true';

            if (submitBtn) {
                submitBtn.disabled = true;
            }

            if (formStatus) {
                formStatus.innerHTML = 'Dateien werden hochgeladen...';
            }

            try {
                const nameField = contactForm.querySelector('input[name="name"]');
                const userName = nameField ? nameField.value : '';
                const links = await uploadFilesToFirebase(uploadedFiles, userName);

                if (pdfLinkInput) {
                    pdfLinkInput.value = links.join('\n');
                }

                syncFilesToInput();
                contactForm.submit();
                setTimeout(() => {
                    clearContactForm();
                }, 0);
            } catch (error) {
                console.error('Firebase Upload Fehler:', error);
                if (formStatus) {
                    formStatus.innerHTML = 'Upload fehlgeschlagen. Bitte erneut versuchen.';
                }
                if (submitBtn) {
                    submitBtn.disabled = false;
                }
                contactForm.dataset.submitting = 'false';
            }
        });
    }

    window.addEventListener('pageshow', (event) => {
        if (event.persisted) {
            clearContactForm();
        }
    });
});
