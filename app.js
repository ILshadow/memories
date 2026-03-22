// ==========================================
// إعدادات Google Drive وكلمة المرور
// ==========================================
const GOOGLE_API_KEY = 'AIzaSyBqTvZ6eSO9Od-YOoXLdniRKHlIBbvI-rs';
const GOOGLE_FOLDER_ID = '1MYDmYMfh7Ns_ez-956EXgRtwSs-0RvgS';
const APP_PASSWORD = 'LoveYouForever-2026-Secret'; // كلمة المرور الخاصة بكما

// حالة تسجيل الدخول
let isAuthenticated = false;
let allPhotos = [];
let currentView = 'polaroid';

// عناصر واجهة المستخدم
const photoGrid = document.getElementById('photo-grid');
const emptyState = document.getElementById('empty-state');
const errorMessage = document.getElementById('error-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const refreshBtn = document.getElementById('refresh-btn');
const viewBtns = document.querySelectorAll('.view-btn');

// عناصر النافذة المنبثقة (Modal)
const imageModal = document.getElementById('image-modal');
const modalImage = document.getElementById('modal-image');
const modalDownload = document.getElementById('modal-download');
const modalClose = document.getElementById('modal-close');

// عناصر نافذة كلمة المرور
const passwordModal = document.getElementById('password-modal');
const passwordInput = document.getElementById('password-input');
const passwordSubmit = document.getElementById('password-submit');
const passwordCancel = document.getElementById('password-cancel');
const passwordError = document.getElementById('password-error');

// تهيئة الأيقونات
lucide.createIcons();

function showLoading(text) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
    loadingOverlay.classList.add('flex');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
    loadingOverlay.classList.remove('flex');
}

function showError(msg) {
    errorMessage.textContent = msg;
    errorMessage.classList.remove('hidden');
}

// جلب الصور من Google Drive
async function fetchPhotosFromDrive() {
    if (!GOOGLE_API_KEY || !GOOGLE_FOLDER_ID || GOOGLE_API_KEY === 'YOUR_API_KEY_HERE' || GOOGLE_FOLDER_ID === 'YOUR_FOLDER_ID_HERE') {
        showError("يرجى وضع مفتاح API ومعرف المجلد (Folder ID) في ملف app.js أولاً لكي يعمل الربط مع Google Drive.");
        return;
    }

    showLoading("جاري جلب الصور من Google Drive...");
    errorMessage.classList.add('hidden');

    try {
        // جلب قائمة الملفات من المجلد
        const url = `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&key=${GOOGLE_API_KEY}&fields=files(id,name,thumbnailLink,webContentLink)&orderBy=createdTime+desc`;
        const response = await fetch(url);
        
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error.message || "فشل الاتصال بـ Google Drive");
        }

        const data = await response.json();
        allPhotos = data.files;
        renderPhotos();
    } catch (error) {
        console.error(error);
        showError("خطأ: " + error.message);
    } finally {
        hideLoading();
    }
}

// عرض الصور في الموقع
function renderPhotos() {
    if (!allPhotos || allPhotos.length === 0) {
        emptyState.classList.remove('hidden');
        photoGrid.classList.add('hidden');
        photoGrid.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    photoGrid.classList.remove('hidden');
    photoGrid.innerHTML = '';
    
    // إعداد شكل الشبكة بناءً على العرض المختار
    if (currentView === 'polaroid') {
        photoGrid.className = 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8';
    } else if (currentView === 'grid') {
        photoGrid.className = 'grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3';
    } else if (currentView === 'story') {
        photoGrid.className = 'flex flex-col items-center gap-8 sm:gap-12 max-w-2xl mx-auto w-full';
    }

    allPhotos.forEach(file => {
        // استخدام اسم الملف كتعليق للصورة (مع إزالة الامتداد مثل .jpg أو .png)
        const caption = file.name.replace(/\.[^/.]+$/, "");
        
        // استخدام رابط المصغرة من جوجل درايف (مع تكبير الدقة إلى 1000 بكسل بدلاً من 220 الافتراضية)
        // هذا الرابط يعمل دائماً ولا يتأثر بسياسات حظر ملفات تعريف الارتباط (Cookies)
        const imageUrl = file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s1000') : `https://drive.google.com/uc?export=view&id=${file.id}`;
        
        // رابط التحميل المباشر للصورة الأصلية
        const downloadUrl = file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`;
        
        const card = document.createElement('div');
        
        // عند الضغط على الصورة، تفتح النافذة المنبثقة
        card.onclick = () => openModal(imageUrl, downloadUrl);

        if (currentView === 'polaroid') {
            const rotation = Math.random() * 6 - 3;
            card.className = 'bg-white p-3 sm:p-4 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer group';
            card.style.transform = `rotate(${rotation}deg)`;
            card.innerHTML = `
                <div class="w-full aspect-square overflow-hidden bg-pink-50 mb-3 sm:mb-4 rounded-2xl">
                    <img src="${imageUrl}" alt="${caption}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div class="w-full text-center px-2 min-h-[1.5rem] flex items-center justify-center">
                    <i data-lucide="heart" class="text-pink-300 fill-pink-100" width="16" height="16"></i>
                </div>
            `;
        } else if (currentView === 'grid') {
            card.className = 'bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group overflow-hidden aspect-square';
            card.style.transform = 'none';
            card.innerHTML = `
                <img src="${imageUrl}" alt="${caption}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
            `;
        } else if (currentView === 'story') {
            card.className = 'bg-white p-4 sm:p-6 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group w-full';
            card.style.transform = 'none';
            card.innerHTML = `
                <div class="w-full h-[50vh] sm:h-[60vh] overflow-hidden bg-pink-50 rounded-2xl mb-4">
                    <img src="${imageUrl}" alt="${caption}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                </div>
                <div class="w-full flex justify-center">
                    <i data-lucide="heart" class="text-rose-400 fill-rose-200" width="24" height="24"></i>
                </div>
            `;
        }
        
        photoGrid.appendChild(card);
    });
    
    lucide.createIcons();
}

// ==========================================
// وظائف النافذة المنبثقة (Modal)
// ==========================================

function openModal(imgSrc, downloadUrl) {
    modalImage.src = imgSrc;
    modalDownload.href = downloadUrl;
    
    imageModal.classList.remove('hidden');
    imageModal.classList.add('flex');
    // تأخير بسيط للسماح بتطبيق display:flex قبل تغيير الشفافية
    setTimeout(() => {
        imageModal.classList.remove('opacity-0');
    }, 10);
    document.body.style.overflow = 'hidden'; // منع التمرير في الخلفية
}

function closeModal() {
    imageModal.classList.add('opacity-0');
    setTimeout(() => {
        imageModal.classList.add('hidden');
        imageModal.classList.remove('flex');
        modalImage.src = '';
    }, 300);
    document.body.style.overflow = ''; // إعادة التمرير
}

// إغلاق النافذة عند الضغط على زر الإغلاق
modalClose.addEventListener('click', closeModal);

// إغلاق النافذة عند الضغط خارج الصورة
imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        closeModal();
    }
});

// إغلاق النافذة عند الضغط على زر Escape في الكيبورد
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !imageModal.classList.contains('hidden')) {
        closeModal();
    }
});

// ==========================================
// وظائف تغيير شكل العرض (View Switcher)
// ==========================================
viewBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // تحديث الأزرار
        viewBtns.forEach(b => {
            b.classList.remove('bg-pink-400', 'text-white', 'shadow-md', 'active');
            b.classList.add('text-pink-400', 'hover:bg-pink-50');
        });
        btn.classList.remove('text-pink-400', 'hover:bg-pink-50');
        btn.classList.add('bg-pink-400', 'text-white', 'shadow-md', 'active');
        
        currentView = btn.dataset.view;
        
        // إعادة رسم الصور بالشكل الجديد إذا كانت موجودة
        if (allPhotos.length > 0) {
            renderPhotos();
        }
    });
});

// ==========================================
// وظائف نافذة كلمة المرور
// ==========================================

function showPasswordModal() {
    if (isAuthenticated) {
        fetchPhotosFromDrive();
        return;
    }
    passwordInput.value = '';
    passwordError.classList.add('hidden');
    passwordModal.classList.remove('hidden');
    passwordModal.classList.add('flex');
    setTimeout(() => {
        passwordModal.classList.remove('opacity-0');
        passwordModal.querySelector('div').classList.remove('scale-95');
    }, 10);
}

function hidePasswordModal() {
    passwordModal.classList.add('opacity-0');
    passwordModal.querySelector('div').classList.add('scale-95');
    setTimeout(() => {
        passwordModal.classList.add('hidden');
        passwordModal.classList.remove('flex');
    }, 300);
}

passwordSubmit.addEventListener('click', () => {
    if (passwordInput.value === APP_PASSWORD) {
        isAuthenticated = true;
        hidePasswordModal();
        fetchPhotosFromDrive();
    } else {
        passwordError.classList.remove('hidden');
    }
});

passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        passwordSubmit.click();
    }
});

passwordCancel.addEventListener('click', hidePasswordModal);

// ربط زر التحديث
refreshBtn.addEventListener('click', showPasswordModal);

// بدء التطبيق بجلب الصور تلقائياً عند فتح الموقع
// تم إيقاف الجلب التلقائي لكي يطلب كلمة المرور أولاً عند الضغط على زر التحديث
