// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Reveal animations on scroll
const revealElements = document.querySelectorAll('.reveal');

const revealOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const revealObserver = new IntersectionObserver(function(entries, observer) {
    entries.forEach(entry => {
        if (!entry.isIntersecting) {
            return;
        }
        
        entry.target.classList.add('active');
        observer.unobserve(entry.target);
    });
}, revealOptions);

revealElements.forEach(el => {
    revealObserver.observe(el);
});

// Theme toggle behavior
const themeToggleBtn = document.getElementById('theme-toggle');

// Check local storage or system preference
const savedTheme = localStorage.getItem('theme');
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

if (savedTheme === 'light' || (!savedTheme && prefersLight)) {
    document.documentElement.classList.add('light');
}

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('light');
        const isLight = document.documentElement.classList.contains('light');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
}

// Toast Notification helper
function showToast(message, duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Feather/Lucide Info Icon (inline svg)
    toast.innerHTML = `
        <div class="toast-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
        </div>
        <div class="toast-content">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Force reflow to trigger CSS transition
    toast.offsetHeight;
    
    toast.classList.add('show');
    
    // Auto dismiss
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        });
    }, duration);
}

// Platform Auto-Detection & Download Handling
const userAgent = window.navigator.userAgent.toLowerCase();
const isApplePlatform = /macintosh|mac os x|mac|ipad|iphone/i.test(userAgent);

if (isApplePlatform) {
    document.querySelectorAll('.download-mac-btn').forEach(btn => {
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
    });
    document.querySelectorAll('.download-win-btn').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
    });
}

const allDownloadBtns = document.querySelectorAll('a[download]');
allDownloadBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const href = btn.href.toLowerCase();
        const isMac = href.includes('mac');
        const isZip = href.includes('.zip');
        let platformName = 'Windows (.exe)';
        if (isMac && isZip) platformName = 'Apple macOS (.zip)';
        else if (isMac) platformName = 'Apple macOS (.dmg)';
        else if (isZip) platformName = 'Windows (.zip)';
        showToast(`Starting download for Meridian ${platformName}...`);
    });
});

// Carousel Feature Logic
const slides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.carousel-indicators .indicator');
const prevBtn = document.getElementById('carousel-prev');
const nextBtn = document.getElementById('carousel-next');
let currentSlideIndex = 0;
let slideInterval = null;

function showSlide(index) {
    if (slides.length === 0) return;
    
    // Wrap around boundaries
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }
    
    // Update active classes on slides
    slides.forEach((slide, i) => {
        if (i === currentSlideIndex) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    // Update active classes on indicators
    indicators.forEach((indicator, i) => {
        if (i === currentSlideIndex) {
            indicator.classList.add('active');
        } else {
            indicator.classList.remove('active');
        }
    });
}

function nextSlide() {
    showSlide(currentSlideIndex + 1);
}

function prevSlide() {
    showSlide(currentSlideIndex - 1);
}

function startAutoSlide() {
    stopAutoSlide();
    slideInterval = setInterval(nextSlide, 5000); // auto slide every 5 seconds
}

function stopAutoSlide() {
    if (slideInterval) {
        clearInterval(slideInterval);
    }
}

// Event Listeners
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        nextSlide();
        startAutoSlide(); // reset timer on manual click
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', () => {
        prevSlide();
        startAutoSlide(); // reset timer on manual click
    });
}

indicators.forEach(indicator => {
    indicator.addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        showSlide(index);
        startAutoSlide(); // reset timer on manual click
    });
});

// Setup hover pause
const carouselWindow = document.querySelector('.carousel-window');
if (carouselWindow) {
    carouselWindow.addEventListener('mouseenter', stopAutoSlide);
    carouselWindow.addEventListener('mouseleave', startAutoSlide);
}

// Initial start
startAutoSlide();

