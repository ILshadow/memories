// ==========================================
// إعدادات GitHub الخاصة بك
// ==========================================
const GITHUB_USERNAME = 'ILshadow'; // اسم المستخدم الخاص بك
const GITHUB_REPO = 'memories';     // اسم المستودع الخاص بك
const GITHUB_BRANCH = 'main';       // اسم الفرع (غالباً main أو master)
const DATA_FILE_PATH = 'data.json';             // اسم الملف الذي سيحفظ البيانات والصور

// ==========================================
// المتغيرات الأساسية
// ==========================================
const AUTO_CAPTIONS = [
    "أفضل يوم على الإطلاق! ✨",
    "أحبك جداً 💖",
    "ذكريات لا تُنسى 🌟",
    "شخصي المفضل 🥰",
    "شريكتي في كل شيء 👯‍♀️",
    "دائماً وأبداً 💗",
    "لحظات حلوة 🍭",
    "توأم روحي 🌸"
];

let photos = [];
let photoToDelete = null;
let currentFileSha = null; // نحتاج هذا لتحديث الملف في جيت هاب

// عناصر واجهة المستخدم
const fileUpload = document.getElementById('file-upload');
const photoGrid = document.getElementById('photo-grid');
const emptyState = document.getElementById('empty-state');
const errorMessage = document.getElementById('error-message');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// تهيئة الأيقونات
lucide.createIcons();

// ==========================================
// دوال التعامل مع GitHub API
// ==========================================

// طلب رمز الوصول (Token) من المستخدم وحفظه محلياً
function getGitHubToken() {
    let token = localStorage.getItem('github_pat');
    if (!token) {
        token = prompt('أدخل رمز الوصول الخاص بـ GitHub (Personal Access Token):\n\nإذا كنت تواجه مشاكل، تأكد أن الرمز يبدأ بـ ghp_ أو github_pat_');
        if (token) {
            token = token.trim();
            localStorage.setItem('github_pat', token);
        }
    }
    return token;
}

// مسح الرمز إذا كان خاطئاً
function resetGitHubToken() {
    localStorage.removeItem('github_pat');
    alert('تم مسح رمز الوصول (Token) المحفوظ. حاول رفع الصورة مرة أخرى لإدخال الرمز الجديد.');
}

// دعم تشفير وفك تشفير النصوص العربية (Unicode) لـ Base64 بطريقة آمنة للملفات الكبيرة
function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

// جلب البيانات من GitHub
async function fetchPhotosFromGitHub() {
    showLoading("جاري تحميل الذكريات...");
    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}?ref=${GITHUB_BRANCH}`;
        const response = await fetch(url);
        
        if (response.status === 404) {
            // الملف غير موجود بعد (أول مرة)
            photos = [];
            currentFileSha = null;
        } else if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || 'فشل في جلب البيانات من GitHub');
        } else {
            const data = await response.json();
            currentFileSha = data.sha;
            // فك تشفير المحتوى
            const contentStr = b64_to_utf8(data.content.replace(/\n/g, ''));
            photos = JSON.parse(contentStr);
        }
        renderPhotos();
    } catch (error) {
        console.error(error);
        if (error.message.includes('Not Found')) {
            showError("لم يتم العثور على المستودع. تأكد أن اسم المستودع (memories) صحيح وأنه ليس فارغاً تماماً (يجب أن يحتوي على ملف واحد على الأقل مثل README).");
        } else {
            showError("خطأ في التحميل: " + error.message);
        }
    } finally {
        hideLoading();
    }
}

// حفظ البيانات إلى GitHub
async function savePhotosToGitHub(commitMessage = "تحديث الصور") {
    const token = getGitHubToken();
    if (!token) {
        showError("لا يمكن الحفظ بدون رمز الوصول (Token). قم بتحديث الصفحة للمحاولة مجدداً.");
        return false;
    }

    showLoading("جاري المزامنة مع GitHub...");
    try {
        const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${DATA_FILE_PATH}`;
        const contentStr = JSON.stringify(photos);
        const encodedContent = utf8_to_b64(contentStr);

        const body = {
            message: commitMessage,
            content: encodedContent,
            branch: GITHUB_BRANCH
        };

        if (currentFileSha) {
            body.sha = currentFileSha;
        }

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('github_pat');
            throw new Error('رمز الوصول (Token) غير صالح أو لا يملك صلاحية (repo). تم مسح الرمز، حاول مجدداً.');
        }

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            
            // معالجة خطأ المستودع الفارغ
            if (errData.message && errData.message.includes('branch')) {
                throw new Error('يبدو أن المستودع فارغ تماماً. يرجى إنشاء ملف README.md في المستودع أولاً لإنشاء الفرع main.');
            }
            
            throw new Error(`خطأ من GitHub: ${errData.message || response.statusText}`);
        }

        const data = await response.json();
        currentFileSha = data.content.sha; // تحديث الـ SHA للمرات القادمة
        errorMessage.classList.add('hidden');
        return true;
    } catch (error) {
        console.error(error);
        showError(error.message + " (اضغط هنا لمسح الرمز السري وإعادة المحاولة)");
        errorMessage.onclick = resetGitHubToken;
        errorMessage.style.cursor = 'pointer';
        return false;
    } finally {
        hideLoading();
    }
}

// ==========================================
// دوال واجهة المستخدم والمنطق
// ==========================================

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

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.6));
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function renderPhotos() {
    if (photos.length === 0) {
        emptyState.classList.remove('hidden');
        photoGrid.classList.add('hidden');
        photoGrid.innerHTML = '';
        return;
    }

    emptyState.classList.add('hidden');
    photoGrid.classList.remove('hidden');
    photoGrid.innerHTML = '';

    photos.forEach(photo => {
        const card = document.createElement('div');
        card.className = 'polaroid group flex flex-col items-center rounded-sm';
        card.style.transform = `rotate(${photo.rotation}deg)`;
        card.id = `photo-${photo.id}`;

        card.innerHTML = `
            <button onclick="requestDelete('${photo.id}')" class="absolute top-2 left-2 p-2 bg-rose-100 text-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-rose-200 z-10">
                <i data-lucide="trash-2" width="18" height="18"></i>
            </button>
            <div class="w-full aspect-square overflow-hidden bg-gray-100 mb-4 rounded-sm">
                <img src="${photo.dataUrl}" alt="Memory" class="w-full h-full object-cover" />
            </div>
            <div class="w-full text-center px-2 min-h-[3rem] flex items-center justify-center relative">
                <p id="caption-text-${photo.id}" onclick="startEdit('${photo.id}')" class="text-gray-800 font-medium cursor-pointer hover:text-rose-600 transition-colors flex items-center gap-2">
                    <span>${photo.caption}</span>
                    <i data-lucide="edit-2" width="14" height="14" class="opacity-0 group-hover:opacity-50"></i>
                </p>
                <input type="text" id="caption-input-${photo.id}" class="hidden w-full text-center border-b-2 border-rose-300 focus:outline-none focus:border-rose-500 bg-transparent text-gray-800 font-medium" value="${photo.caption}">
            </div>
        `;
        photoGrid.appendChild(card);
    });
    
    lucide.createIcons();
}

window.startEdit = function(id) {
    const textEl = document.getElementById(`caption-text-${id}`);
    const inputEl = document.getElementById(`caption-input-${id}`);
    
    textEl.classList.add('hidden');
    inputEl.classList.remove('hidden');
    inputEl.focus();

    const saveEdit = async () => {
        const newCaption = inputEl.value.trim() || "بدون تعليق";
        const photo = photos.find(p => p.id === id);
        if (photo && photo.caption !== newCaption) {
            photo.caption = newCaption;
            renderPhotos(); // تحديث الواجهة فوراً
            await savePhotosToGitHub("تعديل تعليق الصورة"); // الحفظ في جيت هاب
        } else {
            renderPhotos();
        }
    };

    inputEl.addEventListener('blur', saveEdit, { once: true });
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            inputEl.blur();
        }
    });
};

window.requestDelete = function(id) {
    photoToDelete = id;
    deleteModal.classList.remove('hidden');
    deleteModal.classList.add('flex');
};

cancelDeleteBtn.addEventListener('click', () => {
    photoToDelete = null;
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
});

confirmDeleteBtn.addEventListener('click', async () => {
    if (photoToDelete) {
        photos = photos.filter(p => p.id !== photoToDelete);
        renderPhotos(); // تحديث الواجهة فوراً
        deleteModal.classList.add('hidden');
        deleteModal.classList.remove('flex');
        
        await savePhotosToGitHub("حذف صورة"); // الحفظ في جيت هاب
        photoToDelete = null;
    }
});

fileUpload.addEventListener('change', async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // نطلب التوكن قبل البدء بمعالجة الصور لنتأكد من صلاحية الرفع
    const token = getGitHubToken();
    if (!token) {
        e.target.value = '';
        return;
    }

    showLoading("جاري معالجة الصور...");
    const newPhotos = [];
    for (let i = 0; i < files.length; i++) {
        try {
            const dataUrl = await compressImage(files[i]);
            const randomCaption = AUTO_CAPTIONS[Math.floor(Math.random() * AUTO_CAPTIONS.length)];
            newPhotos.push({
                id: generateId(),
                dataUrl,
                caption: randomCaption,
                date: Date.now(),
                rotation: Math.random() * 6 - 3
            });
        } catch (err) {
            console.error("Error compressing image", err);
        }
    }

    photos = [...newPhotos, ...photos];
    renderPhotos(); // عرض الصور فوراً
    e.target.value = ''; 
    
    // رفع التحديث إلى جيت هاب
    await savePhotosToGitHub("إضافة صور جديدة");
});

// بدء التطبيق بجلب البيانات من جيت هاب
fetchPhotosFromGitHub();
