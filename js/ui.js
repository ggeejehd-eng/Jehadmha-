// UI Management - إدارة واجهة المستخدم مع دعم Firebase
import { firebaseManager } from './firebase.js';

class UIManager {
    constructor() {
        this.currentSection = 'posts';
        this.currentTheme = 'light';
        this.currentLanguage = 'ar';
        this.toasts = [];
        this.messageUpdateInterval = null;
        
        this.initializeUI();
    }

    // تهيئة واجهة المستخدم
    initializeUI() {
        this.loadSettings();
        this.setupEventListeners();
        this.updateFeatureVisibility();
        this.setupMessageUpdates();
    }

    // إعداد تحديثات الرسائل
    setupMessageUpdates() {
        // تحديث الرسائل عند تحميل Firebase
        firebaseManager.onInitialized(() => {
            this.renderMessages();
        });
    }

    // تحميل الإعدادات
    async loadSettings() {
        const settings = await window.dataManager.getSettings();
        this.currentTheme = settings.theme || 'light';
        this.currentLanguage = settings.language || 'ar';
        
        this.applyTheme(this.currentTheme);
        this.applyLanguage(this.currentLanguage);
    }

    // إعداد مستمعي الأحداث
    setupEventListeners() {
        // تبديل التبويبات
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('tab-item')) {
                this.switchTab(e.target.dataset.tab);
            }
        });

        // تبديل الثيم
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('theme-toggle') || e.target.closest('.theme-toggle')) {
                this.toggleTheme();
            }
        });

        // تبديل اللغة
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('language-toggle')) {
                this.toggleLanguage();
            }
        });

        // زر لقطة الشاشة
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('screenshot-btn')) {
                this.takeScreenshot();
            }
        });

        // إغلاق النوافذ المنبثقة
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                this.closeModal();
            }
        });

        // مراقبة تغييرات البيانات
        window.dataManager.addWatcher((event, data) => {
            if (event === 'featureChanged') {
                this.updateFeatureVisibility();
            } else if (event === 'newMessage') {
                // تحديث فوري للرسائل عند وصول رسالة جديدة
                if (this.currentSection === 'messages') {
                    this.renderMessages();
                }
            }
        });
    }

    // تبديل التبويبات
    async switchTab(tabName) {
        // التحقق من تفعيل الميزة
        const settings = await window.dataManager.getSettings();
        if (!settings.features[tabName]) {
            this.showToast('هذه الميزة معطلة حالياً', 'warning');
            return;
        }

        this.currentSection = tabName;
        
        // تحديث التبويبات النشطة
        document.querySelectorAll('.tab-item').forEach(tab => {
            tab.classList.remove('active');
        });
        
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
        });

        // تفعيل التبويب الحالي
        const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
        const activePane = document.getElementById(`${tabName}Tab`);
        
        if (activeTab) activeTab.classList.add('active');
        if (activePane) activePane.classList.add('active');

        // تحديث المحتوى
        this.refresh();
    }

    // تحديث المحتوى
    refresh() {
        switch (this.currentSection) {
            case 'posts':
                this.renderPosts();
                break;
            case 'messages':
                this.renderMessages();
                break;
            case 'stories':
                this.renderStories();
                break;
            case 'watch':
                this.renderWatchPage();
                break;
            case 'novels':
                this.renderNovels();
                break;
        }
    }

    // عرض المنشورات
    async renderPosts() {
        const postsContainer = document.getElementById('postsContainer');
        if (!postsContainer) return;

        const posts = await window.dataManager.getPosts();

        if (posts.length === 0) {
            postsContainer.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14,2 14,8 20,8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <h3>لا توجد منشورات</h3>
                    <p>ابدأ بإنشاء منشورك الأول</p>
                </div>
            `;
            return;
        }

        postsContainer.innerHTML = posts.map(post => {
            const author = window.dataManager.getUserById(post.userId);
            const currentUser = window.authManager.getCurrentUser();
            const isLiked = post.likedBy && post.likedBy.includes(currentUser?.id);
            const timeAgo = this.getTimeAgo(post.timestamp);

            return `
                <div class="card post-card">
                    <div class="post-header">
                        <img src="${author?.avatar || 'assets/images/avatar-male.png'}" alt="${author?.username}" class="post-avatar">
                        <div class="post-author">
                            <h4>${author?.username || 'مستخدم'}</h4>
                            <p class="post-time">${timeAgo}</p>
                        </div>
                    </div>
                    <div class="post-content">
                        <p>${post.content}</p>
                        ${post.image ? `<img src="${post.image}" alt="منشور" class="post-image">` : ''}
                    </div>
                    <div class="post-actions">
                        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="window.uiManager.togglePostLike('${post.id}')">
                            <svg class="action-icon" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            <span>${post.likes || 0}</span>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // عرض الرسائل مع دعم Firebase
    async renderMessages() {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;

        try {
            // عرض مؤشر التحميل
            messagesContainer.innerHTML = `
                <div class="loading-state">
                    <div class="spinner"></div>
                    <p>جاري تحميل الرسائل...</p>
                </div>
            `;

            const messages = window.dataManager.getMessages();
            const currentUser = window.authManager.getCurrentUser();

            if (!currentUser) {
                messagesContainer.innerHTML = `
                    <div class="empty-state">
                        <p>يرجى تسجيل الدخول لعرض الرسائل</p>
                    </div>
                `;
                return;
            }

            if (messages.length === 0) {
                messagesContainer.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                        <h3>لا توجد رسائل</h3>
                        <p>ابدأ محادثة جديدة</p>
                    </div>
                `;
                return;
            }

            // عرض الرسائل
            const messagesHTML = messages.map(message => {
                const sender = window.dataManager.getUserById(message.senderId);
                const isCurrentUser = message.senderId === currentUser.id;
                const timeAgo = this.getTimeAgo(message.timestamp);

                return `
                    <div class="message ${isCurrentUser ? 'message-sent' : 'message-received'}">
                        <div class="message-content">
                            <div class="message-header">
                                <img src="${sender?.avatar || 'assets/images/avatar-male.png'}" alt="${sender?.username}" class="message-avatar">
                                <span class="message-sender">${sender?.username || 'مستخدم'}</span>
                                <span class="message-time">${timeAgo}</span>
                            </div>
                            <div class="message-body">
                                <p>${message.content}</p>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            messagesContainer.innerHTML = messagesHTML;

            // التمرير إلى أسفل
            setTimeout(() => {
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }, 100);

        } catch (error) {
            console.error('Error rendering messages:', error);
            messagesContainer.innerHTML = `
                <div class="error-state">
                    <p>حدث خطأ أثناء تحميل الرسائل</p>
                    <button class="btn btn-primary" onclick="window.uiManager.renderMessages()">إعادة المحاولة</button>
                </div>
            `;
        }
    }

    // عرض الستوريات
    async renderStories() {
        const storiesContainer = document.getElementById('storiesContainer');
        if (!storiesContainer) return;

        try {
            const stories = await window.dataManager.getActiveStories();

            if (stories.length === 0) {
                storiesContainer.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <path d="M12 6v6l4 2"/>
                        </svg>
                        <h3>لا توجد ستوريات</h3>
                        <p>أضف ستوري جديد</p>
                    </div>
                `;
                return;
            }

            storiesContainer.innerHTML = stories.map(story => {
                const author = window.dataManager.getUserById(story.userId);
                const timeAgo = this.getTimeAgo(story.timestamp);

                return `
                    <div class="card story-card">
                        <div class="story-header">
                            <img src="${author?.avatar || 'assets/images/avatar-male.png'}" alt="${author?.username}" class="post-avatar">
                            <div class="story-author">
                                <h4>${author?.username || 'مستخدم'}</h4>
                                <p>${timeAgo}</p>
                            </div>
                        </div>
                        <div class="story-content">
                            ${story.media ? `<img src="${story.media}" alt="ستوري" class="story-media">` : ''}
                            <p>${story.content}</p>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error rendering stories:', error);
            storiesContainer.innerHTML = `
                <div class="error-state">
                    <p>حدث خطأ أثناء تحميل الستوريات</p>
                </div>
            `;
        }
    }

    // عرض الروايات
    async renderNovels() {
        const novelsContainer = document.getElementById('novelsContainer');
        if (!novelsContainer) return;

        try {
            const novels = await window.dataManager.getNovels();

            if (novels.length === 0) {
                novelsContainer.innerHTML = `
                    <div class="empty-state">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <h3>لا توجد روايات</h3>
                        <p>اكتب رواية جديدة</p>
                    </div>
                `;
                return;
            }

            novelsContainer.innerHTML = novels.map(novel => {
                const author = window.dataManager.getUserById(novel.authorId);
                const timeAgo = this.getTimeAgo(novel.timestamp);

                return `
                    <div class="card novel-card">
                        <div class="card-header">
                            <h3 class="card-title">${novel.title}</h3>
                            <p class="text-muted">بقلم: ${author?.username || 'مستخدم'} • ${timeAgo}</p>
                        </div>
                        <div class="card-body">
                            <p class="card-text">${novel.content}</p>
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error rendering novels:', error);
            novelsContainer.innerHTML = `
                <div class="error-state">
                    <p>حدث خطأ أثناء تحميل الروايات</p>
                </div>
            `;
        }
    }

    // عرض صفحة المشاهدة
    renderWatchPage() {
        const watchContainer = document.getElementById('watchContainer');
        if (!watchContainer) return;

        watchContainer.innerHTML = `
            <div class="watch-layout">
                <div class="video-container">
                    <div class="video-placeholder">
                        <svg class="video-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="23 7 16 12 23 17 23 7"/>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                        </svg>
                        <p>مشغل الفيديو</p>
                    </div>
                </div>
                <div class="video-controls">
                    <div class="row">
                        <div class="col-md-6">
                            <h4>مشاهدة من الهاتف</h4>
                            <input type="file" id="localVideo" accept="video/*" class="form-control">
                        </div>
                        <div class="col-md-6">
                            <h4>مشاهدة من YouTube</h4>
                            <div class="d-flex gap-2">
                                <input type="url" id="youtubeUrl" placeholder="رابط YouTube" class="form-control">
                                <button class="btn btn-primary" onclick="loadYouTubeVideo()">تشغيل</button>
                            </div>
                        </div>
                    </div>
                    <div class="mt-3">
                        <button class="btn btn-secondary me-2" onclick="playVideo()">تشغيل</button>
                        <button class="btn btn-secondary me-2" onclick="pauseVideo()">إيقاف</button>
                        <button class="btn btn-secondary" onclick="skipVideo()">تقديم 10 ثواني</button>
                    </div>
                </div>
            </div>
        `;
    }

    // إعجاب بمنشور
    async togglePostLike(postId) {
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            this.showToast('يرجى تسجيل الدخول للإعجاب بالمنشورات', 'error');
            return;
        }
        try {
            await window.dataManager.togglePostLike(postId, currentUser.id);
            this.renderPosts(); // إعادة عرض المنشورات لتحديث حالة الإعجاب
        } catch (error) {
            console.error('Error toggling post like:', error);
            this.showToast('حدث خطأ أثناء الإعجاب بالمنشور', 'error');
        }
    }

    // تحديث رؤية الميزات بناءً على الإعدادات
    async updateFeatureVisibility() {
        const settings = await window.dataManager.getSettings();
        const features = settings.features || {};

        document.querySelectorAll('.tab-item').forEach(tab => {
            const tabName = tab.dataset.tab;
            if (features[tabName] === false) {
                tab.style.display = 'none';
            } else {
                tab.style.display = '';
            }
        });
    }

    // تبديل الثيم (فاتح/داكن)
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
        window.dataManager.updateSettings({ theme: this.currentTheme });
    }

    // تطبيق الثيم
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // تبديل اللغة (عربي/إنجليزي)
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'ar' ? 'en' : 'ar';
        this.applyLanguage(this.currentLanguage);
        window.dataManager.updateSettings({ language: this.currentLanguage });
    }

    // تطبيق اللغة
    applyLanguage(lang) {
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        document.documentElement.lang = lang;

        // تحديث نصوص التبويبات
        document.querySelectorAll('[data-translate]').forEach(element => {
            const arText = element.dataset.translate;
            const enText = element.dataset.translateEn || ''; // افترض وجود data-translate-en
            element.querySelector('span').textContent = lang === 'ar' ? arText : enText;
        });

        // تحديث نصوص الأزرار
        document.querySelectorAll('[data-original-text]').forEach(button => {
            const originalText = button.dataset.originalText;
            const enText = button.dataset.originalTextEn || '';
            button.textContent = lang === 'ar' ? originalText : enText;
        });

        // تحديث placeholder للبحث
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.placeholder = lang === 'ar' ? 'البحث في المحتوى...' : 'Search content...';
        }

        // تحديث placeholder للرسائل
        const messageInput = document.getElementById('messageInput');
        if (messageInput) {
            messageInput.placeholder = lang === 'ar' ? 'اكتب رسالتك...' : 'Type your message...';
        }
    }

    // عرض رسائل التوست
    showToast(message, type = 'info', duration = 3000) {
        const toastContainer = document.getElementById('toastContainer') || (() => {
            const div = document.createElement('div');
            div.id = 'toastContainer';
            div.className = 'toast-container';
            document.body.appendChild(div);
            return div;
        })();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        toastContainer.appendChild(toast);

        // إزالة التوست بعد مدة معينة
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }

    // عرض نافذة منبثقة (Modal)
    showModal(title, content, actions = []) {
        let modal = document.getElementById('appModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'appModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
                <div class="modal-footer">
                    ${actions.map(action => `<button class="btn ${action.class || ''}" id="${action.id}">${action.text}</button>`).join('')}
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';

        // إضافة مستمعي الأحداث للأزرار
        actions.forEach(action => {
            const btn = document.getElementById(action.id);
            if (btn) {
                btn.onclick = () => {
                    action.handler();
                    this.closeModal();
                };
            }
        });
    }

    // إغلاق النافذة المنبثقة
    closeModal() {
        const modal = document.getElementById('appModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // جلب الوقت النسبي (مثال: منذ 5 دقائق)
    getTimeAgo(timestamp) {
        const now = Date.now();
        const seconds = Math.floor((now - timestamp) / 1000);

        if (seconds < 60) return `${seconds} ثوانٍ مضت`;

        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} دقائق مضت`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ساعات مضت`;

        const days = Math.floor(hours / 24);
        if (days < 7) return `${days} أيام مضت`;

        const weeks = Math.floor(days / 7);
        if (weeks < 4) return `${weeks} أسابيع مضت`;

        const months = Math.floor(days / 30);
        if (months < 12) return `${months} أشهر مضت`;

        const years = Math.floor(days / 365);
        return `${years} سنوات مضت`;
    }

    // أخذ لقطة شاشة (مثال)
    async takeScreenshot() {
        this.showToast('جاري أخذ لقطة شاشة...', 'info');
        const currentUser = window.authManager.getCurrentUser();
        if (!currentUser) {
            this.showToast('يرجى تسجيل الدخول لأخذ لقطة شاشة', 'error');
            return;
        }
        try {
            // هنا يمكن إضافة منطق فعلي لأخذ لقطة شاشة باستخدام مكتبة خارجية أو API المتصفح
            // حالياً، هذا مجرد مثال لتسجيل النشاط
            await window.dataManager.addScreenshot(currentUser.id, window.location.pathname);
            this.showToast('تم تسجيل لقطة الشاشة بنجاح!', 'success');
        } catch (error) {
            console.error('Error taking screenshot:', error);
            this.showToast('فشل أخذ لقطة الشاشة', 'error');
        }
    }
}

window.uiManager = new UIManager();


