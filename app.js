// ==========================================
// إعدادات Google Drive وكلمة المرور
// ==========================================
const GOOGLE_API_KEY = 'AIzaSyBqTvZ6eSO9Od-YOoXLdniRKHlIBbvI-rs';
const GOOGLE_FOLDER_ID = '1MYDmYMfh7Ns_ez-956EXgRtwSs-0RvgS';
const APP_PASSWORD = 'LoveYouForever-2026-Secret'; // كلمة المرور الخاصة بكما

// حالة تسجيل الدخول
let isAuthenticated = false;

// عناصر واجهة المستخدم
const photoGrid = document.getElementById('photo-grid');
const emptyState = document.getElementById('empty-state');
const errorMessage = document.getElementById('error-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const refreshBtn = document.getElementById('refresh-btn');

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
        renderPhotos(data.files);
    } catch (error) {
        console.error(error);
        showError("خطأ: " + error.message);
    } finally {
        hideLoading();
    }
}

// عرض الصور في الموقع
function renderPhotos(files) {
    if (!files || files.length === 0) {
        emptyState.classList.remove('hidden');
        photoGrid.classList.add('hidden');
        photoGrid.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    photoGrid.classList.remove('hidden');
    photoGrid.innerHTML = '';

    files.forEach(file => {
        // استخدام اسم الملف كتعليق للصورة (مع إزالة الامتداد مثل .jpg أو .png)
        const caption = file.name.replace(/\.[^/.]+$/, "");
        
        // استخدام رابط المصغرة من جوجل درايف (مع تكبير الدقة إلى 1000 بكسل بدلاً من 220 الافتراضية)
        // هذا الرابط يعمل دائماً ولا يتأثر بسياسات حظر ملفات تعريف الارتباط (Cookies)
        const imageUrl = file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s1000') : `https://drive.google.com/uc?export=view&id=${file.id}`;
        
        // رابط التحميل المباشر للصورة الأصلية
        const downloadUrl = file.webContentLink || `https://drive.google.com/uc?export=download&id=${file.id}`;
        
        // ميلان عشوائي للصورة لتبدو كصور البولارويد الحقيقية
        const rotation = Math.random() * 6 - 3;

        const card = document.createElement('div');
        card.className = 'polaroid group flex flex-col items-center cursor-pointer';
        card.style.transform = `rotate(${rotation}deg)`;
        
        // عند الضغط على الصورة، تفتح النافذة المنبثقة
        card.onclick = () => openModal(imageUrl, downloadUrl);

        card.innerHTML = `
            <div class="w-full aspect-square overflow-hidden bg-pink-50 mb-3 sm:mb-4 rounded-2xl">
                <img src="${imageUrl}" alt="${caption}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
            </div>
            <div class="w-full text-center px-2 min-h-[2.5rem] flex items-center justify-center">
                <p class="text-gray-700 font-medium text-sm sm:text-base">${caption}</p>
            </div>
        `;
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
