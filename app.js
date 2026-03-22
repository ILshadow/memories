// ==========================================
// إعدادات Google Drive
// ==========================================
const GOOGLE_API_KEY = 'YOUR_API_KEY_HERE';
const GOOGLE_FOLDER_ID = 'YOUR_FOLDER_ID_HERE';

// عناصر واجهة المستخدم
const photoGrid = document.getElementById('photo-grid');
const emptyState = document.getElementById('empty-state');
const errorMessage = document.getElementById('error-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const refreshBtn = document.getElementById('refresh-btn');

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
    if (!GOOGLE_API_KEY || !GOOGLE_FOLDER_ID || GOOGLE_API_KEY === 'AIzaSyBqTvZ6eSO9Od-YOoXLdniRKHlIBbvI-rs' || GOOGLE_FOLDER_ID === '1MYDmYMfh7Ns_ez-956EXgRtwSs-0RvgS') {
        showError("يرجى وضع مفتاح API ومعرف المجلد (Folder ID) في ملف app.js أولاً لكي يعمل الربط مع Google Drive.");
        return;
    }

    showLoading("جاري جلب الصور من Google Drive...");
    errorMessage.classList.add('hidden');

    try {
        // جلب قائمة الملفات من المجلد
        const url = `https://www.googleapis.com/drive/v3/files?q='${GOOGLE_FOLDER_ID}'+in+parents+and+mimeType+contains+'image/'&key=${GOOGLE_API_KEY}&fields=files(id,name)&orderBy=createdTime+desc`;
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
        
        // رابط عرض الصورة المباشر من جوجل درايف
        const imageUrl = `https://drive.google.com/uc?export=view&id=${file.id}`;
        
        // ميلان عشوائي للصورة لتبدو كصور البولارويد الحقيقية
        const rotation = Math.random() * 6 - 3;

        const card = document.createElement('div');
        card.className = 'polaroid group flex flex-col items-center rounded-sm';
        card.style.transform = `rotate(${rotation}deg)`;

        card.innerHTML = `
            <div class="w-full aspect-square overflow-hidden bg-gray-100 mb-4 rounded-sm">
                <img src="${imageUrl}" alt="${caption}" class="w-full h-full object-cover" loading="lazy" />
            </div>
            <div class="w-full text-center px-2 min-h-[3rem] flex items-center justify-center">
                <p class="text-gray-800 font-medium">${caption}</p>
            </div>
        `;
        photoGrid.appendChild(card);
    });
    
    lucide.createIcons();
}

// ربط زر التحديث
refreshBtn.addEventListener('click', fetchPhotosFromDrive);

// بدء التطبيق بجلب الصور تلقائياً عند فتح الموقع
fetchPhotosFromDrive();
