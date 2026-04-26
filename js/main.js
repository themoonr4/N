let currentTheme = localStorage.getItem('theme') || 'auto';
let currentLang = localStorage.getItem('lang') || 'en';
let isLoggedIn = false;
let bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
let readingHistory = JSON.parse(localStorage.getItem('readingHistory') || '[]');
let currentPage = 1;
let currentFilter = 'all';
let currentBreakingIndex = 0;

const newsData = {
    en: [
        { id: 1, title: "India Creates History! Chandrayaan-3 Successfully Lands on Moon", time: "2 mins ago", category: "tech", views: "125K", comments: "2.3K" },
        { id: 2, title: "PM Modi Announces $10 Billion AI Mission at G20 Summit", time: "15 mins ago", category: "politics", views: "89K", comments: "1.2K" },
        { id: 3, title: "Sensex Hits All-Time High at 75,000 Points", time: "1 hour ago", category: "business", views: "67K", comments: "890" },
        { id: 4, title: "India Wins Cricket World Cup Final Against Australia", time: "2 hours ago", category: "sports", views: "234K", comments: "5.6K" },
        { id: 5, title: "AI Breakthrough: New Model Can Detect Cancer with 99% Accuracy", time: "3 hours ago", category: "tech", views: "156K", comments: "3.4K" },
        { id: 6, title: "Test news 1 - Website working now", time: "Just now", category: "tech", views: "0", comments: "0" },
        { id: 7, title: "Test news 2 - Dark mode working", time: "Just now", category: "tech", views: "0", comments: "0" },
        { id: 8, title: "Welcome to THE MOON", time: "Just now", category: "sports", views: "0", comments: "0" }
    ],
    hi: [
        { id: 1, title: "भारत ने रचा इतिहास! चंद्रयान-3 की सफल लैंडिंग", time: "2 मिनट पहले", category: "tech", views: "125K", comments: "2.3K" },
        { id: 2, title: "पीएम मोदी का G20 में बड़ा ऐलान", time: "15 मिनट पहले", category: "politics", views: "89K", comments: "1.2K" }
    ]
};

const breakingNewsData = {
    en: ["BREAKING: Chandrayaan-3 Lands on Moon!", "BREAKING: Sensex at All-Time High!", "BREAKING: India Wins World Cup!"],
    hi: ["ब्रेकिंग: चंद्रयान-3 की सफल लैंडिंग!", "ब्रेकिंग: सेंसेक्स ने बनाया रिकॉर्ड!", "ब्रेकिंग: भारत ने जीता विश्व कप!"]
};

const booksData = {
    trending: [
        { id: 1, title: "Atomic Habits", author: "James Clear", category: "Self-Help", rating: 4.9, reviews: "15.2K", year: 2018, description: "Transform your life with tiny changes", cover: "📖", pages: 320, freeRead: true, tags: ["Habits", "Productivity"] },
        { id: 2, title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", category: "Finance", rating: 4.8, reviews: "42.5K", year: 1997, description: "What rich teach their kids about money", cover: "💰", pages: 336, freeRead: true, tags: ["Finance", "Wealth"] },
        { id: 3, title: "The Psychology of Money", author: "Morgan Housel", category: "Finance", rating: 4.7, reviews: "28.3K", year: 2020, description: "Timeless lessons on wealth", cover: "🧠", pages: 256, freeRead: true, tags: ["Money", "Psychology"] },
        { id: 4, title: "Deep Work", author: "Cal Newport", category: "Productivity", rating: 4.6, reviews: "18.7K", year: 2016, description: "Rules for focused success", cover: "⚡", pages: 304, freeRead: false, tags: ["Productivity", "Focus"] }
    ],
    categories: ["All", "Self-Help", "Finance", "Productivity"]
};

let userBookmarks = JSON.parse(localStorage.getItem('userBookmarks') || '[]');

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:${type === 'success' ? '#28a745' : '#17a2b8'}; color:white; padding:0.75rem 1.5rem; border-radius:8px; z-index:2000; animation:slideIn 0.3s;`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function updateLiveTime() {
    const el = document.getElementById('liveTime');
    if (el) el.textContent = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function initVoiceSearch() {
    const btn = document.getElementById('voiceSearchBtn');
    const input = document.getElementById('smartSearchInput');
    if (!btn || !('webkitSpeechRecognition' in window)) return;
    const recognition = new webkitSpeechRecognition();
    recognition.onstart = () => { btn.classList.add('listening'); btn.innerHTML = '<i class="fas fa-microphone-slash"></i>'; };
    recognition.onend = () => { btn.classList.remove('listening'); btn.innerHTML = '<i class="fas fa-microphone"></i>'; };
    recognition.onresult = (e) => { input.value = e.results[0][0].transcript; input.dispatchEvent(new Event('input')); };
    btn.onclick = () => recognition.start();
}

function initAutoTheme() {
    const select = document.getElementById('themeSelect');
    function apply(theme) {
        if (theme === 'dark') document.body.setAttribute('data-theme', 'dark');
        else if (theme === 'light') document.body.removeAttribute('data-theme');
        else if (theme === 'auto') {
            if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.body.setAttribute('data-theme', 'dark');
            else document.body.removeAttribute('data-theme');
        }
        localStorage.setItem('theme', theme);
        if (select) select.value = theme;
    }
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (localStorage.getItem('theme') === 'auto') apply('auto'); });
    select?.addEventListener('change', (e) => apply(e.target.value));
    apply(localStorage.getItem('theme') || 'auto');
}

function addShareButtons(card, news) {
    const container = document.createElement('div');
    container.className = 'share-container';
    const platforms = ['WhatsApp', 'Facebook', 'Twitter', 'Telegram'];
    const icons = { WhatsApp: 'fab fa-whatsapp', Facebook: 'fab fa-facebook', Twitter: 'fab fa-twitter', Telegram: 'fab fa-telegram' };
    platforms.forEach(p => {
        const btn = document.createElement('button');
        btn.className = 'share-btn';
        btn.innerHTML = `<i class="${icons[p]}"></i> ${p}`;
        btn.onclick = (e) => {
            e.stopPropagation();
            const url = encodeURIComponent(window.location.href);
            const text = encodeURIComponent(news.title);
            const shareUrls = { WhatsApp: `https://wa.me/?text=${text}%20${url}`, Facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`, Twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`, Telegram: `https://t.me/share/url?url=${url}&text=${text}` };
            window.open(shareUrls[p], '_blank', 'width=600,height=400');
        };
        container.appendChild(btn);
    });
    card.appendChild(container);
}

function addBookmarkButton(card, news) {
    const btn = document.createElement('button');
    btn.className = 'bookmark-btn';
    const isBookmarked = bookmarks.some(b => b.id === news.id);
    btn.innerHTML = isBookmarked ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
    if (isBookmarked) btn.classList.add('bookmarked');
    btn.onclick = (e) => {
        e.stopPropagation();
        const idx = bookmarks.findIndex(b => b.id === news.id);
        if (idx === -1) { bookmarks.push(news); showToast('Bookmarked!'); }
        else { bookmarks.splice(idx, 1); showToast('Removed', 'info'); }
        localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
        btn.innerHTML = idx === -1 ? '<i class="fas fa-bookmark"></i>' : '<i class="far fa-bookmark"></i>';
        btn.classList.toggle('bookmarked');
    };
    card.appendChild(btn);
}

function renderNews() {
    const newsList = document.getElementById('newsList');
    if (!newsList) return;
    let data = (newsData[currentLang] || newsData.en).slice(0, currentPage * 5);
    if (currentFilter !== 'all') data = data.filter(n => n.category === currentFilter);
    newsList.innerHTML = data.map(news => `<div class="news-card" data-id="${news.id}"><div class="news-title">📰 ${news.title}</div><div class="news-meta"><span>🕐 ${news.time}</span><span>🏷️ ${news.category}</span><span>👁️ ${news.views}</span></div></div>`).join('');
    document.querySelectorAll('.news-card').forEach((card, i) => { addShareButtons(card, data[i]); addBookmarkButton(card, data[i]); });
}

function renderTrending() {
    const el = document.getElementById('trendingList');
    if (!el) return;
    const data = (newsData[currentLang] || newsData.en).slice(0, 5);
    el.innerHTML = data.map((item, i) => `<div class="trending-item">🔥 ${i+1}. ${item.title.substring(0, 60)}<br><small>${item.views} views</small></div>`).join('');
}

function generateAIPicks() {
    const el = document.getElementById('aiPicks');
    if (!el) return;
    el.innerHTML = [ { title: "AI Revolution: How to Earn $10K/Month", views: "15.2K" }, { title: "Top 10 Freelancing Skills", views: "12.8K" } ].map(pick => `<div class="ai-pick-item"><div>🤖 ${pick.title}</div><div class="news-meta">👁️ ${pick.views} reads</div><div class="ai-progress-bar"><div class="ai-progress-fill" style="width: 75%"></div></div></div>`).join('');
}

function renderBooks() {
    const newsFeed = document.getElementById('newsFeed');
    if (!newsFeed) return;
    newsFeed.innerHTML = `<div class="books-header"><div class="books-header-content"><i class="fas fa-book-open"></i><h1>📚 Books Library</h1><p>Discover, read, and learn from the world's best books</p></div></div><div class="books-categories" id="booksCategories"></div><div class="books-section"><div class="section-header"><h2><i class="fas fa-fire"></i> Trending Books</h2></div><div class="books-grid" id="trendingBooksGrid"></div></div><div class="reading-goal-card"><div class="goal-content"><div class="goal-icon"><i class="fas fa-bullseye"></i></div><div class="goal-info"><h3>Your Reading Goal 2024</h3><p>You've read <span id="booksReadCount">0</span> out of 12 books</p><div class="goal-progress"><div class="goal-progress-bar" id="goalProgressBar" style="width: 0%"></div></div></div><button class="btn-set-goal" id="setGoalBtn">Set Goal</button></div></div>`;
    const categoriesContainer = document.getElementById('booksCategories');
    if (categoriesContainer) {
        categoriesContainer.innerHTML = `<div class="categories-scroll">${booksData.categories.map(cat => `<button class="category-btn ${cat === 'All' ? 'active' : ''}" data-category="${cat}">${cat}</button>`).join('')}</div>`;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const category = btn.getAttribute('data-category');
                const grid = document.getElementById('trendingBooksGrid');
                let filtered = booksData.trending;
                if (category !== 'All') filtered = booksData.trending.filter(b => b.category === category);
                if (grid) grid.innerHTML = filtered.map(book => `<div class="book-card"><div class="book-cover">${book.cover}</div><div class="book-info"><h3 class="book-title">${book.title}</h3><div class="book-author">by ${book.author}</div><div class="book-rating"><div class="stars">${'⭐'.repeat(Math.floor(book.rating))}</div><span>(${book.reviews})</span></div><p class="book-description">${book.description}</p><div class="book-actions"><button class="btn-read" data-book='${JSON.stringify(book)}'><i class="fas fa-book-open"></i> Read</button><button class="btn-bookmark" data-book-id="${book.id}"><i class="fas fa-bookmark"></i></button></div></div>${book.freeRead ? '<div class="free-badge">FREE</div>' : ''}</div>`).join('');
                attachBookEvents();
            };
        });
    }
    const grid = document.getElementById('trendingBooksGrid');
    if (grid) {
        grid.innerHTML = booksData.trending.map(book => `<div class="book-card"><div class="book-cover">${book.cover}</div><div class="book-info"><h3 class="book-title">${book.title}</h3><div class="book-author">by ${book.author}</div><div class="book-rating"><div class="stars">${'⭐'.repeat(Math.floor(book.rating))}</div><span>(${book.reviews})</span></div><p class="book-description">${book.description}</p><div class="book-actions"><button class="btn-read" data-book='${JSON.stringify(book)}'><i class="fas fa-book-open"></i> Read</button><button class="btn-bookmark" data-book-id="${book.id}"><i class="fas fa-bookmark"></i></button></div></div>${book.freeRead ? '<div class="free-badge">FREE</div>' : ''}</div>`).join('');
        attachBookEvents();
    }
    const readCount = readingHistory.length;
    document.getElementById('booksReadCount')?.setAttribute('data-count', readCount);
    const goal = localStorage.getItem('readingGoal') || 12;
    const percentage = (readCount / goal) * 100;
    document.getElementById('goalProgressBar')?.setAttribute('style', `width: ${Math.min(percentage, 100)}%`);
    document.getElementById('setGoalBtn')?.addEventListener('click', () => { const g = prompt('Set your reading goal:', goal); if (g && !isNaN(g) && g > 0) { localStorage.setItem('readingGoal', g); showToast(`Goal set to ${g} books!`); renderBooks(); } });
}

function attachBookEvents() {
    document.querySelectorAll('.btn-read').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const book = JSON.parse(btn.getAttribute('data-book'));
            if (!readingHistory.find(h => h.id === book.id)) {
                readingHistory.unshift({ id: book.id, title: book.title, author: book.author, cover: book.cover, readDate: new Date().toISOString() });
                localStorage.setItem('readingHistory', JSON.stringify(readingHistory));
                showToast(`Started reading "${book.title}"`);
                renderBooks();
            }
            showToast(`Opening "${book.title}"...`);
        };
    });
    document.querySelectorAll('.btn-bookmark').forEach(btn => {
        btn.onclick = (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-book-id'));
            const book = booksData.trending.find(b => b.id === id);
            const idx = userBookmarks.findIndex(b => b.id === id);
            if (idx === -1) { userBookmarks.push(book); showToast(`"${book.title}" bookmarked`); }
            else { userBookmarks.splice(idx, 1); showToast(`Removed from bookmarks`); }
            localStorage.setItem('userBookmarks', JSON.stringify(userBookmarks));
            renderBooks();
        };
    });
}

function startBreakingNews() {
    const el = document.getElementById('breakingText');
    if (!el) return;
    setInterval(() => {
        const data = breakingNewsData[currentLang] || breakingNewsData.en;
        el.style.animation = 'fadeOut 0.3s';
        setTimeout(() => { currentBreakingIndex = (currentBreakingIndex + 1) % data.length; el.textContent = data[currentBreakingIndex]; el.style.animation = 'fadeIn 0.3s'; }, 300);
    }, 5000);
}

function initSmartSearch() {
    const input = document.getElementById('smartSearchInput');
    if (!input) return;
    let timer;
    input.oninput = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            const term = input.value.toLowerCase();
            const cards = document.querySelectorAll('.news-card');
            let count = 0;
            cards.forEach(card => { if (card.querySelector('.news-title')?.textContent.toLowerCase().includes(term)) { card.style.display = 'block'; count++; } else card.style.display = 'none'; });
            const msg = document.getElementById('searchResultMsg');
            if (msg && term) msg.innerHTML = `🔍 Found ${count} results`;
        }, 300);
    };
}

function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            currentPage = 1;
            renderNews();
        };
    });
}

function initLoadMore() {
    document.getElementById('loadMoreBtn')?.addEventListener('click', () => { currentPage++; renderNews(); });
}

function initBackToTop() {
    const btn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => { if (window.scrollY > 300) btn.style.display = 'flex'; else btn.style.display = 'none'; });
    btn.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
}

function initPWA() {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        document.getElementById('pwaInstallContainer').style.display = 'block';
        document.getElementById('pwaInstallBtn').onclick = async () => { if (deferredPrompt) { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === 'accepted') document.getElementById('pwaInstallContainer').style.display = 'none'; deferredPrompt = null; } };
        document.getElementById('pwaDismissBtn').onclick = () => { document.getElementById('pwaInstallContainer').style.display = 'none'; };
    });
}

function initOfflineMode() {
    function update() { document.getElementById('offlineIndicator').style.display = !navigator.onLine ? 'block' : 'none'; }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}

function initLoginModal() {
    const modal = document.getElementById('loginModal');
    document.getElementById('loginBtn').onclick = () => modal.classList.add('active');
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => modal.classList.remove('active'));
    window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`${btn.getAttribute('data-tab')}Tab`).classList.add('active');
        };
    });
    document.getElementById('loginSubmitBtn').onclick = () => { showToast('Login successful!'); modal.classList.remove('active'); isLoggedIn = true; };
    document.getElementById('signupSubmitBtn').onclick = () => { showToast('Account created!'); modal.classList.remove('active'); };
}

function initTranslation() {
    document.getElementById('translateSelect').onchange = (e) => { currentLang = e.target.value; localStorage.setItem('lang', currentLang); renderNews(); renderTrending(); };
}

function initNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const page = item.getAttribute('data-page');
            if (page === 'books') renderBooks();
            else renderNews();
        };
    });
    document.getElementById('workspaceToggle')?.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('workspaceMenu')?.classList.toggle('active'); });
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    document.getElementById('hamburger').onclick = toggle;
    document.getElementById('closeSidebar').onclick = toggle;
    overlay.onclick = toggle;
}

document.addEventListener('DOMContentLoaded', () => {
    setInterval(updateLiveTime, 1000);
    initVoiceSearch();
    initAutoTheme();
    initSmartSearch();
    initFilters();
    initLoadMore();
    initBackToTop();
    initPWA();
    initOfflineMode();
    initLoginModal();
    initTranslation();
    initNavigation();
    initSidebar();
    startBreakingNews();
    renderNews();
    renderTrending();
    generateAIPicks();
});
