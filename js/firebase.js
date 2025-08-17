// Firebase Configuration and Management - إدارة Firebase مع جميع الميزات
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";
import { getDatabase, ref, push, set, onValue, onChildAdded, update, remove, query, orderByChild, equalTo, limitToLast } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";

class FirebaseManager {
    constructor() {
        this.app = null;
        this.database = null;
        this.analytics = null;
        this.isInitialized = false;
        this.initializationCallbacks = [];
        
        this.initialize();
    }

    // تهيئة Firebase
    async initialize() {
        try {
            // إعدادات Firebase
            const firebaseConfig = {
                apiKey: "AIzaSyDAESNvfUuhHdlLQLt-paJHIWtypYLZN64",
                authDomain: "jehad-fdf3b.firebaseapp.com",
                databaseURL: "https://jehad-fdf3b-default-rtdb.europe-west1.firebasedatabase.app",
                projectId: "jehad-fdf3b",
                storageBucket: "jehad-fdf3b.firebasestorage.app",
                messagingSenderId: "337523232354",
                appId: "1:337523232354:web:19ec6c1cadb1ea7db40b3b",
                measurementId: "G-TQ2H75KK4S"
            };

            // تهيئة Firebase
            this.app = initializeApp(firebaseConfig);
            this.database = getDatabase(this.app);
            
            // تهيئة Analytics (اختياري)
            try {
                this.analytics = getAnalytics(this.app);
            } catch (error) {
                console.warn("Analytics not available:", error);
            }

            this.isInitialized = true;
            console.log("Firebase initialized successfully");

            // تشغيل callbacks التهيئة
            this.initializationCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (error) {
                    console.error("Error in initialization callback:", error);
                }
            });

        } catch (error) {
            console.error("Error initializing Firebase:", error);
            this.isInitialized = false;
        }
    }

    // إضافة callback للتهيئة
    onInitialized(callback) {
        if (this.isInitialized) {
            callback();
        } else {
            this.initializationCallbacks.push(callback);
        }
    }

    // التحقق من حالة التهيئة
    isReady() {
        return this.isInitialized && this.database !== null;
    }

    // === وظائف الرسائل ===

    // إرسال رسالة
    async sendMessage(messageData) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const messagesRef = ref(this.database, "messages");
            const newMessageRef = push(messagesRef);
            const messageId = newMessageRef.key;
            
            const message = {
                id: messageId,
                senderId: messageData.senderId,
                receiverId: messageData.receiverId,
                content: messageData.content,
                type: messageData.type || "text",
                timestamp: Date.now(), // Use client-side timestamp for now
                read: false
            };

            await set(newMessageRef, message);
            console.log("Message sent successfully:", messageId);
            
            return message;
        } catch (error) {
            console.error("Error sending message:", error);
            throw error;
        }
    }

    // جلب الرسائل الموجودة
    async getExistingMessages() {
        if (!this.isReady()) {
            return [];
        }

        try {
            const messagesRef = ref(this.database, "messages");
            const messagesQuery = query(messagesRef, orderByChild("timestamp"));
            const snapshot = await new Promise(resolve => onValue(messagesQuery, resolve, { onlyOnce: true }));
            const messages = [];
            
            snapshot.forEach(childSnapshot => {
                const message = childSnapshot.val();
                if (message) {
                    messages.push(message);
                }
            });

            console.log(`Loaded ${messages.length} existing messages`);
            return messages;
        } catch (error) {
            console.error("Error fetching existing messages:", error);
            return [];
        }
    }

    // الاستماع للرسائل الجديدة
    listenForMessages(callback) {
        if (!this.isReady()) {
            console.warn("Firebase not ready for listening to messages");
            return;
        }

        try {
            const messagesRef = ref(this.database, "messages");
            onChildAdded(messagesRef, (snapshot) => {
                const message = snapshot.val();
                if (message && callback) {
                    callback(message);
                }
            });

            console.log("Started listening for new messages");
        } catch (error) {
            console.error("Error setting up message listener:", error);
        }
    }

    // === وظائف المنشورات ===

    // حفظ منشور
    async savePost(postData) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const postsRef = ref(this.database, "posts");
            const newPostRef = push(postsRef);
            const postId = newPostRef.key;
            
            const post = {
                id: postId,
                userId: postData.userId,
                content: postData.content,
                image: postData.image || null,
                timestamp: Date.now(),
                likes: 0,
                likedBy: []
            };

            await set(newPostRef, post);
            console.log("Post saved successfully:", postId);
            
            return post;
        } catch (error) {
            console.error("Error saving post:", error);
            throw error;
        }
    }

    // جلب المنشورات
    async getPosts() {
        if (!this.isReady()) {
            return [];
        }

        try {
            const postsRef = ref(this.database, "posts");
            const postsQuery = query(postsRef, orderByChild("timestamp"));
            const snapshot = await new Promise(resolve => onValue(postsQuery, resolve, { onlyOnce: true }));
            const posts = [];
            
            snapshot.forEach(childSnapshot => {
                const post = childSnapshot.val();
                if (post) {
                    posts.push(post);
                }
            });

            // ترتيب المنشورات من الأحدث للأقدم
            posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            console.log(`Loaded ${posts.length} posts`);
            return posts;
        } catch (error) {
            console.error("Error fetching posts:", error);
            return [];
        }
    }

    // تحديث إعجاب المنشور
    async togglePostLike(postId, userId) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const postRef = ref(this.database, `posts/${postId}`);
            const snapshot = await new Promise(resolve => onValue(postRef, resolve, { onlyOnce: true }));
            const post = snapshot.val();
            
            if (!post) {
                throw new Error("Post not found");
            }

            const likedBy = post.likedBy || [];
            const likes = post.likes || 0;

            let newLikedBy = [...likedBy];
            let newLikes = likes;

            if (newLikedBy.includes(userId)) {
                // إزالة إعجاب
                newLikedBy = newLikedBy.filter(id => id !== userId);
                newLikes--;
            } else {
                // إضافة إعجاب
                newLikedBy.push(userId);
                newLikes++;
            }

            await update(postRef, {
                likes: newLikes,
                likedBy: newLikedBy
            });

            console.log("Post like updated successfully");
        } catch (error) {
            console.error("Error updating post like:", error);
            throw error;
        }
    }

    // === وظائف الستوري ===

    // حفظ ستوري
    async saveStory(storyData) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const storiesRef = ref(this.database, "stories");
            const newStoryRef = push(storiesRef);
            const storyId = newStoryRef.key;
            
            const story = {
                id: storyId,
                userId: storyData.userId,
                content: storyData.content,
                media: storyData.media || null,
                timestamp: Date.now(),
                expiresAt: storyData.expiresAt
            };

            await set(newStoryRef, story);
            console.log("Story saved successfully:", storyId);
            
            return story;
        } catch (error) {
            console.error("Error saving story:", error);
            throw error;
        }
    }

    // جلب الستوريات النشطة
    async getActiveStories() {
        if (!this.isReady()) {
            return [];
        }

        try {
            const now = Date.now();
            const storiesRef = ref(this.database, "stories");
            const storiesQuery = query(storiesRef, orderByChild("timestamp"));
            const snapshot = await new Promise(resolve => onValue(storiesQuery, resolve, { onlyOnce: true }));
            const stories = [];
            
            snapshot.forEach(childSnapshot => {
                const story = childSnapshot.val();
                if (story && new Date(story.expiresAt).getTime() > now) {
                    stories.push(story);
                }
            });

            console.log(`Loaded ${stories.length} active stories`);
            return stories;
        } catch (error) {
            console.error("Error fetching active stories:", error);
            return [];
        }
    }

    // === وظائف الروايات ===

    // حفظ رواية
    async saveNovel(novelData) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const novelsRef = ref(this.database, "novels");
            const newNovelRef = push(novelsRef);
            const novelId = newNovelRef.key;
            
            const novel = {
                id: novelId,
                title: novelData.title,
                content: novelData.content,
                authorId: novelData.authorId,
                timestamp: Date.now()
            };

            await set(newNovelRef, novel);
            console.log("Novel saved successfully:", novelId);
            
            return novel;
        } catch (error) {
            console.error("Error saving novel:", error);
            throw error;
        }
    }

    // جلب الروايات
    async getNovels() {
        if (!this.isReady()) {
            return [];
        }

        try {
            const novelsRef = ref(this.database, "novels");
            const novelsQuery = query(novelsRef, orderByChild("timestamp"));
            const snapshot = await new Promise(resolve => onValue(novelsQuery, resolve, { onlyOnce: true }));
            const novels = [];
            
            snapshot.forEach(childSnapshot => {
                const novel = childSnapshot.val();
                if (novel) {
                    novels.push(novel);
                }
            });

            // ترتيب الروايات من الأحدث للأقدم
            novels.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            
            console.log(`Loaded ${novels.length} novels`);
            return novels;
        } catch (error) {
            console.error("Error fetching novels:", error);
            return [];
        }
    }

    // === وظائف المستخدمين ===

    // إضافة مستخدم جديد
    async addUser(userData) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }
        try {
            const usersRef = ref(this.database, "users");
            const newUserRef = push(usersRef);
            const userId = newUserRef.key;

            const user = {
                id: userId,
                username: userData.username,
                passwordHash: userData.passwordHash,
                avatar: userData.avatar || "./assets/images/avatar-male.png", // Default avatar
                isAdmin: userData.isAdmin || false,
                createdAt: Date.now(),
                lastActive: Date.now()
            };
            await set(newUserRef, user);
            console.log("User added successfully:", userId);
            return user;
        } catch (error) {
            console.error("Error adding user:", error);
            throw error;
        }
    }

    // حفظ بيانات المستخدم
    async saveUserData(userId, userData) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const userRef = ref(this.database, `users/${userId}`);
            await update(userRef, {
                ...userData,
                lastUpdated: Date.now()
            });

            console.log("User data saved successfully:", userId);
        } catch (error) {
            console.error("Error saving user data:", error);
            throw error;
        }
    }

    // جلب بيانات المستخدم
    async getUserData(userId) {
        if (!this.isReady()) {
            return null;
        }

        try {
            const userRef = ref(this.database, `users/${userId}`);
            const snapshot = await new Promise(resolve => onValue(userRef, resolve, { onlyOnce: true }));
            return snapshot.val();
        } catch (error) {
            console.error("Error fetching user data:", error);
            return null;
        }
    }

    // جلب جميع المستخدمين
    async getUsers() {
        if (!this.isReady()) {
            return [];
        }
        try {
            const usersRef = ref(this.database, "users");
            const snapshot = await new Promise(resolve => onValue(usersRef, resolve, { onlyOnce: true }));
            const users = [];
            snapshot.forEach(childSnapshot => {
                users.push(childSnapshot.val());
            });
            return users;
        } catch (error) {
            console.error("Error fetching users:", error);
            return [];
        }
    }

    // جلب مستخدم بالاسم
    async getUserByUsername(username) {
        if (!this.isReady()) {
            return null;
        }
        try {
            const usersRef = ref(this.database, "users");
            const userQuery = query(usersRef, orderByChild("username"), equalTo(username));
            const snapshot = await new Promise(resolve => onValue(userQuery, resolve, { onlyOnce: true }));
            let user = null;
            snapshot.forEach(childSnapshot => {
                user = childSnapshot.val();
            });
            return user;
        } catch (error) {
            console.error("Error fetching user by username:", error);
            return null;
        }
    }

    // جلب مستخدم بالمعرف
    async getUserById(userId) {
        return this.getUserData(userId);
    }

    // === وظائف الإعدادات ===

    // حفظ الإعدادات
    async saveSettings(settings) {
        if (!this.isReady()) {
            throw new Error("Firebase not ready");
        }

        try {
            const settingsRef = ref(this.database, "settings");
            await set(settingsRef, {
                ...settings,
                lastUpdated: Date.now()
            });

            console.log("Settings saved successfully");
        } catch (error) {
            console.error("Error saving settings:", error);
            throw error;
        }
    }

    // جلب الإعدادات
    async getSettings() {
        if (!this.isReady()) {
            return null;
        }

        try {
            const settingsRef = ref(this.database, "settings");
            const snapshot = await new Promise(resolve => onValue(settingsRef, resolve, { onlyOnce: true }));
            return snapshot.val();
        } catch (error) {
            console.error("Error fetching settings:", error);
            return null;
        }
    }

    // === وظائف تسجيل النشاط ===

    // تسجيل نشاط المستخدم
    async logUserActivity(userId, activityType, data = {}) {
        if (!this.isReady()) {
            return;
        }

        try {
            const activitiesRef = ref(this.database, "activities");
            const newActivityRef = push(activitiesRef);
            
            const activity = {
                userId: userId,
                type: activityType,
                data: data,
                timestamp: Date.now(),
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            await set(newActivityRef, activity);
            console.log("User activity logged:", activityType);
        } catch (error) {
            console.error("Error logging user activity:", error);
        }
    }

    // جلب سجلات لقطات الشاشة (مثال على نشاط)
    async getScreenshots() {
        if (!this.isReady()) {
            return [];
        }
        try {
            const activitiesRef = ref(this.database, "activities");
            const screenshotsQuery = query(activitiesRef, orderByChild("type"), equalTo("screenshot"));
            const snapshot = await new Promise(resolve => onValue(screenshotsQuery, resolve, { onlyOnce: true }));
            const screenshots = [];
            snapshot.forEach(childSnapshot => {
                screenshots.push(childSnapshot.val());
            });
            return screenshots;
        } catch (error) {
            console.error("Error fetching screenshots:", error);
            return [];
        }
    }

    // حفظ لقطة شاشة (مثال على نشاط)
    async saveScreenshot(screenshotData) {
        return this.logUserActivity(screenshotData.userId, "screenshot", { page: screenshotData.page });
    }

    // === وظائف الإحصائيات ===

    // جلب إحصائيات الاستخدام
    async getUsageStats() {
        if (!this.isReady()) {
            return null;
        }

        try {
            const messagesRef = ref(this.database, "messages");
            const postsRef = ref(this.database, "posts");
            const storiesRef = ref(this.database, "stories");
            const novelsRef = ref(this.database, "novels");
            const usersRef = ref(this.database, "users");

            const [messagesSnapshot, postsSnapshot, storiesSnapshot, novelsSnapshot, usersSnapshot] = await Promise.all([
                new Promise(resolve => onValue(messagesRef, resolve, { onlyOnce: true })),
                new Promise(resolve => onValue(postsRef, resolve, { onlyOnce: true })),
                new Promise(resolve => onValue(storiesRef, resolve, { onlyOnce: true })),
                new Promise(resolve => onValue(novelsRef, resolve, { onlyOnce: true })),
                new Promise(resolve => onValue(usersRef, resolve, { onlyOnce: true }))
            ]);

            const stats = {
                totalMessages: messagesSnapshot.size,
                totalPosts: postsSnapshot.size,
                totalStories: storiesSnapshot.size,
                totalNovels: novelsSnapshot.size,
                totalUsers: usersSnapshot.size,
                lastUpdated: Date.now()
            };

            console.log("Usage stats:", stats);
            return stats;
        } catch (error) {
            console.error("Error fetching usage stats:", error);
            return null;
        }
    }

    // === وظائف الصيانة ===

    // تنظيف البيانات القديمة
    async cleanupOldData() {
        if (!this.isReady()) {
            return;
        }

        try {
            const now = Date.now();
            const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

            // حذف الستوريات المنتهية الصلاحية
            const storiesRef = ref(this.database, "stories");
            const storiesQuery = query(storiesRef, orderByChild("expiresAt"), limitToLast(100)); // Limit to avoid large reads
            const storiesSnapshot = await new Promise(resolve => onValue(storiesQuery, resolve, { onlyOnce: true }));
            
            storiesSnapshot.forEach(childSnapshot => {
                const story = childSnapshot.val();
                if (story && story.expiresAt < now) {
                    remove(childSnapshot.ref); // Use remove with ref
                }
            });

            // حذف الأنشطة القديمة (أكثر من 30 يوم)
            const activitiesRef = ref(this.database, "activities");
            const activitiesQuery = query(activitiesRef, orderByChild("timestamp"), limitToLast(100)); // Limit to avoid large reads
            const activitiesSnapshot = await new Promise(resolve => onValue(activitiesQuery, resolve, { onlyOnce: true }));
            
            activitiesSnapshot.forEach(childSnapshot => {
                const activity = childSnapshot.val();
                if (activity && activity.timestamp < thirtyDaysAgo) {
                    remove(childSnapshot.ref); // Use remove with ref
                }
            });

            console.log("Cleanup completed.");
        } catch (error) {
            console.error("Error during data cleanup:", error);
        }
    }
}

window.firebaseManager = new FirebaseManager();


