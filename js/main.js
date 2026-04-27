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
        { id: 1, title: "🏏 IPL 2026: CSK vs GT - Gujarat Titans won toss chose to bowl first. MS Dhoni not playing due to calf injury.", time: "Just now", category: "sports", views: "1.2K", comments: "45" },
        { id: 2, title: "🇮🇳 ISRO Announces Chandrayaan-4 Mission to Moon by 2028 - India's first lunar sample return mission. Budget: ₹2,500 crore.", time: "5 mins ago", category: "tech", views: "5.6K", comments: "234" },
        { id: 3, title: "📱 iPhone 17 Pro Max Launched in India at ₹1,59,900 - A19 chip, 48MP camera, titanium body.", time: "15 mins ago", category: "tech", views: "8.9K", comments: "567" },
        { id: 4, title: "📊 Sensex Crashes 1200 Points on Global Sell-off - US Fed rate hike fears, Nifty below 22,000.", time: "1 hour ago", category: "business", views: "3.4K", comments: "89" },
        { id: 5, title: "🏏 IPL 2026 Playoffs Race: CSK, MI, GT, RCB in contention. Last 10 matches to decide top 4.", time: "2 hours ago", category: "sports", views: "12K", comments: "890" },
        { id: 6, title: "🎓 UPSC Civil Services Final Result 2025 Declared - 850 candidates selected.", time: "3 hours ago", category: "study", views: "45K", comments: "2.3K" },
        { id: 7, title: "💰 Petrol Price Increased by ₹2 per liter - New rates effective midnight. Diesel up by ₹1.50.", time: "4 hours ago", category: "business", views: "23K", comments: "1.1K" },
        { id: 8, title: "🤖 Google Launches Gemini AI 2.0 - 10x faster than ChatGPT. Indian languages supported.", time: "5 hours ago", category: "tech", views: "67K", comments: "4.5K" }
    ],
    hi: [
        { id: 1, title: "आईपीएल 2026: चेन्नई सुपर किंग्स vs गुजरात टाइटंस - गिल ने टॉस जीता", time: "अभी अभी", category: "sports", views: "1.2K", comments: "45" }
    ]
};

const breakingNewsData = {
    en: ["🚨 Chandrayaan-4 Announced for 2028!", "🚨 Sensex Crashes 1200 Points!", "🚨 IPL Playoffs Race Heats Up!"],
    hi: ["🚨 चंद्रयान-4 का ऐलान!", "🚨 सेंसेक्स 1200 अंक गिरा!", "🚨 IPL प्लेऑफ की रेस गरमाई!"]
};

const booksData = {
    trending: [
        { id: 1, title: "Atomic Habits", author: "James Clear", category: "Self-Help", rating: 4.9, reviews: "15.2K", year: 2018, description: "Transform your life with tiny changes", cover: "📖", pages: 320, freeRead: true, tags: ["Habits", "Productivity"] },
        { id: 2, title: "Rich Dad Poor Dad", author: "Robert Kiyosaki", category: "Finance", rating: 4.8, reviews: "42.5K", year: 1997, description: "What rich teach their kids about money", cover: "💰", pages: 336, freeRead: true, tags: ["Finance", "Wealth"] }
    ],
    categories: ["All", "Self-Help", "Finance"]
};

let userBookmarks = JSON.parse(localStorage.getItem('userBookmarks') || '[]');

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed; bottom:80px; left:50%; transform:translateX(-50%); background:${type === 'success' ? '#28a745' : '#17a2b8'}; color:white; padding:0.75rem 1.5rem; border-radius:8px; z-index:2000;`;
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

function renderNews() {
    const newsList = document.getElementById('newsList');
    if (!newsList) {
        console.error("ERROR: Element 'newsList' not found in HTML!");
        return;
    }
    
    let data = (newsData[currentLang] || newsData.en).slice(0, currentPage * 5);
    if (currentFilter !== 'all') data = data.filter(n => n.category === currentFilter);
    
    if (data.length === 0) {
        newsList.innerHTML = '<div style="padding:20px; text-align:center;">📭 No news found. Add news via Telegram bot.</div>';
        return;
    }
    
    newsList.innerHTML = data.map(news => `
        <div class="news-card" data-id="${news.id}">
            <div class="news-title">📰 ${news.title}</div>
            <div class="news-meta">
                <span>🕐 ${news.time}</span>
                <span>🏷️ ${news.category}</span>
                <span>👁️ ${news.views}</span>
            </div>
        </div>
    `).join('');
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
    el.innerHTML = ` 
        <div class="ai-pick-item"><div>🤖 AI Revolution: How to Earn $10K/Month</div><div class="news-meta">👁️ 15.2K reads</div><div class="ai-progress-bar"><div class="ai-progress-fill" style="width: 75%"></div></div></div>
        <div class="ai-pick-item"><div>💰 Top 10 Freelancing Skills for 2026</div><div class="news-meta">👁️ 12.8K reads</div><div class="ai-progress-bar"><div class="ai-progress-fill" style="width: 60%"></div></div></div>
    `;
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
            cards.forEach(card => { 
                if (card.querySelector('.news-title')?.textContent.toLowerCase().includes(term)) { 
                    card.style.display = 'block'; 
                    count++; 
                } else { 
                    card.style.display = 'none'; 
                } 
            });
            const msg = document.getElementById('searchResultMsg');
            if (msg) msg.innerHTML = term ? `🔍 Found ${count} results` : '';
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
        const container = document.getElementById('pwaInstallContainer');
        if (container) container.style.display = 'block';
        document.getElementById('pwaInstallBtn').onclick = async () => { 
            if (deferredPrompt) { 
                deferredPrompt.prompt(); 
                const { outcome } = await deferredPrompt.userChoice; 
                if (outcome === 'accepted' && container) container.style.display = 'none'; 
                deferredPrompt = null; 
            } 
        };
        document.getElementById('pwaDismissBtn').onclick = () => { if (container) container.style.display = 'none'; };
    });
}

function initOfflineMode() {
    function update() { 
        const indicator = document.getElementById('offlineIndicator');
        if (indicator) indicator.style.display = !navigator.onLine ? 'block' : 'none';
    }
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}

function initLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;
    document.getElementById('loginBtn').onclick = () => modal.classList.add('active');
    document.querySelectorAll('.close-modal').forEach(btn => btn.onclick = () => modal.classList.remove('active'));
    window.onclick = (e) => { if (e.target === modal) modal.classList.remove('active'); };
}

function initTranslation() {
    document.getElementById('translateSelect').onchange = (e) => { 
        currentLang = e.target.value; 
        localStorage.setItem('lang', currentLang); 
        renderNews(); 
        renderTrending(); 
    };
}

function initNavigation() {
    document.querySelectorAll('.nav-item[data-page]').forEach(item => {
        item.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        };
    });
    document.getElementById('workspaceToggle')?.addEventListener('click', (e) => { 
        e.preventDefault(); 
        document.getElementById('workspaceMenu')?.classList.toggle('active'); 
    });
}

function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const toggle = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    document.getElementById('hamburger').onclick = toggle;
    document.getElementById('closeSidebar').onclick = toggle;
    if (overlay) overlay.onclick = toggle;
}

function getWeather() {
    const temp = document.getElementById('weatherTemp');
    const loc = document.getElementById('weatherLocation');
    const desc = document.getElementById('weatherDesc');
    if (temp) temp.textContent = "28°C";
    if (loc) loc.textContent = "New Delhi, IN";
    if (desc) desc.textContent = "☀️ Sunny";
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded, initializing...");
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
    getWeather();
    console.log("Initialization complete, renderNews called.");
});
