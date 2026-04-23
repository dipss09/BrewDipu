// ──────────────────────────────────────────────
//  🔥  FIREBASE CONFIGURATION 
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: ["AIzaSyD5", "jNH16Xkz", "rq6prfqtx", "Oa10HbqEy", "BPm44"].join(""),
  authDomain: "brewdipu-f2092.firebaseapp.com",
  projectId: "brewdipu-f2092",
  storageBucket: "brewdipu-f2092.appspot.com",
  messagingSenderId: "959585483776",
  appId: "1:959585483776:web:65fec5ade570d763546ce5"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
} catch(e) {
  console.error("Firebase init failed:", e);
}

const db = firebase.firestore();
const auth = firebase.auth();

// No hardcoded PRODUCTS array anymore. All driven via Firestore.
// ──────────────────────────────────────────────
//  🔐  AUTH LOGIC
// ──────────────────────────────────────────────
let adminLoaded = false;
auth.onAuthStateChanged((user) => {
  const loginScreen = document.getElementById("login-screen");
  const appScreen = document.getElementById("app-screen");
  if (user) {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    if(!adminLoaded) {
        loadSettings();
        loadOrders();
        loadUsers();
        loadProducts();
        loadOffers();
        loadReviews();
        adminLoaded = true;
    }
  } else {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
    adminLoaded = false; // Reset if logged out
  }
});

document.getElementById("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const pass = document.getElementById("login-password").value;
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  
  auth.signInWithEmailAndPassword(email, pass).catch(err => {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  });
});

document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});

// ──────────────────────────────────────────────
//  👉  TAB NAVIGATION
// ──────────────────────────────────────────────
function switchTab(tabId) {
  const tabs = ['orders', 'products', 'reviews', 'users', 'settings', 'offers'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.add("hidden");
    const btn = document.getElementById(`tab-btn-${t}`);
    if(btn) {
      btn.classList.remove("bg-primary", "text-white");
      btn.classList.add("text-on-surface-variant");
    }
  });
  
  document.getElementById(`tab-${tabId}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if(activeBtn) {
    activeBtn.classList.add("bg-primary", "text-white");
    activeBtn.classList.remove("text-on-surface-variant");
  }
}

// ──────────────────────────────────────────────
//  📋  ORDERS MANAGEMENT
// ──────────────────────────────────────────────
function loadOrders() {
  db.collection("orders").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const tbody = document.getElementById("orders-tbody");
    if(snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">No orders yet.</td></tr>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const st = data.status || "Pending";
      const badgeColor = st === "Pending" ? "bg-red-100 text-red-800" : (st === "Confirmed" ? "bg-orange-100 text-orange-800" : "bg-green-100 text-green-800");
      
      const itemsList = data.items ? data.items.map(i => `${i.qty}x ${i.name}`).join("<br/>") : "-";

      html += `
      <tr class="hover:bg-surface-container transition-colors">
        <td class="p-4 text-sm font-bold">${data.timeString}</td>
        <td class="p-4"><span class="font-bold">${data.name}</span><br/><span class="text-xs text-on-surface-variant">${data.address}</span></td>
        <td class="p-4 text-sm">${data.phone}<br/>${data.email}</td>
        <td class="p-4 text-sm">${itemsList}<br/><span class="font-black mt-1 inline-block">₹${data.total}</span></td>
        <td class="p-4"><span class="px-3 py-1 rounded-full text-xs font-bold ${badgeColor}">${st}</span></td>
        <td class="p-4">
          <select onchange="updateOrderStatus('${doc.id}', this.value)" class="text-sm p-2 rounded border border-outline/20">
            <option value="Pending" ${st==='Pending'?'selected':''}>Pending</option>
            <option value="Confirmed" ${st==='Confirmed'?'selected':''}>Confirmed</option>
            <option value="Delivered" ${st==='Delivered'?'selected':''}>Delivered</option>
          </select>
        </td>
      </tr>`;
    });
    tbody.innerHTML = html;
  });
}

window.updateOrderStatus = function(id, newStatus) {
  db.collection("orders").doc(id).update({ status: newStatus });
};

// ──────────────────────────────────────────────
//  👥  USERS & REFERRALS MANAGEMENT
// ──────────────────────────────────────────────
function loadUsers() {
  db.collection("users").orderBy("createdAt", "desc").onSnapshot(snapshot => {
    const tbody = document.getElementById("users-tbody");
    if(snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-on-surface-variant">No users found.</td></tr>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const code = data.referralCode || "NONE";
      const pts = data.points || 0;
      const refCount = data.referralCount || 0;

      html += `
      <tr class="hover:bg-surface-container transition-colors">
        <td class="p-4"><span class="font-bold">${data.name || 'Anonymous'}</span><br/><span class="text-xs text-on-surface-variant">${data.address || 'No address'}</span></td>
        <td class="p-4 text-sm">${data.phone || '-'}<br/>${data.email || '-'}</td>
        <td class="p-4 text-sm font-mono font-bold text-secondary tracking-widest">${code}</td>
        <td class="p-4 text-sm font-black">${refCount}</td>
        <td class="p-4"><span class="px-3 py-1 bg-primary/10 text-primary font-black rounded-full">${pts}</span></td>
        <td class="p-4">
          <div class="flex gap-2">
            <button onclick="updateUserPoints('${doc.id}', 100)" class="p-2 bg-surface-container-high rounded border hover:bg-green-100 items-center justify-center flex" title="Add 100 Points"><span class="material-symbols-outlined text-sm">add</span></button>
            <button onclick="updateUserPoints('${doc.id}', -100)" class="p-2 bg-surface-container-high rounded border hover:bg-red-100 items-center justify-center flex" title="Deduct 100 Points"><span class="material-symbols-outlined text-sm">remove</span></button>
            <button onclick="updateUserPoints('${doc.id}', 'reset')" class="p-2 bg-surface-container-high rounded border hover:bg-red-50 text-error items-center justify-center flex" title="Reset to 0"><span class="material-symbols-outlined text-sm">restart_alt</span></button>
          </div>
        </td>
      </tr>`;
    });
    tbody.innerHTML = html;
  });
}

window.updateUserPoints = function(uid, amount) {
   if(amount === 'reset') {
      if(confirm("Are you sure you want to completely reset this user's points to 0?")) {
          db.collection("users").doc(uid).update({ points: 0 });
      }
   } else {
      let change = parseInt(amount);
      if(confirm(`Adjust points by ${change}?`)) {
          db.collection("users").doc(uid).update({ 
               points: firebase.firestore.FieldValue.increment(change)
          }).then(() => {
              // Ensure we don't go below 0 visually by next snapshot, but we can also prevent it here:
              db.collection("users").doc(uid).get().then(doc => {
                 if(doc.data().points < 0) doc.ref.update({points: 0});
              });
          });
      }
   }
};

// ──────────────────────────────────────────────
//  ⚙️  STORE SETTINGS (Timing & About)
// ──────────────────────────────────────────────
const autoliveCheckbox = document.getElementById("set-autolive");
const manualOverride = document.getElementById("manual-override-container");

autoliveCheckbox.addEventListener("change", (e) => {
  if(e.target.checked) manualOverride.classList.add("hidden", "opacity-50");
  else manualOverride.classList.remove("hidden", "opacity-50");
});

let currentSettings = {};

function loadSettings() {
  db.collection("settings").doc("storeConfig").onSnapshot(doc => {
    if (doc.exists) {
      currentSettings = doc.data();
      const data = currentSettings;
      document.getElementById("set-about").value = data.aboutText || "";
      document.getElementById("set-hero-title").value = data.heroTitle || "BrewDipu";
      document.getElementById("set-hero-sub").value = data.heroSub || "Chilled Sips, Crafted by Dipu.";
      document.getElementById("set-story-heading").value = data.storyHeading || "Artisanal Sips,\nBorn at Home.";
      // Note: set-story-file is an input type="file", we can't set its value.
      
      
      // Contact & Social
      document.getElementById("set-whatsapp").value = data.whatsapp || "918101244865";
      document.getElementById("set-email").value = data.email || "brewdipu@gmail.com";
      document.getElementById("set-instagram").value = data.instagram || "https://instagram.com/brewdipu";
      
      // EmailJS
      if (data.emailjs) {
        document.getElementById("set-emailjs-public").value = data.emailjs.publicKey || "";
        document.getElementById("set-emailjs-service").value = data.emailjs.serviceId || "";
        document.getElementById("set-emailjs-template").value = data.emailjs.templateId || "";
      }
      
      // Features (Why BrewDipu)
      if (data.features) {
        document.getElementById("set-f1-title").value = data.features.f1Title || "Homemade Pureness";
        document.getElementById("set-f1-desc").value = data.features.f1Desc || "Zero preservatives. Just raw, natural ingredients prepared in small batches to ensure absolute quality in every sip.";
        document.getElementById("set-f2-title").value = data.features.f2Title || "Always Fresh";
        document.getElementById("set-f2-desc").value = data.features.f2Desc || "Small batches. Made to order for peak flavor profile.";
        document.getElementById("set-f3-title").value = data.features.f3Title || "Affordable Luxury";
        document.getElementById("set-f3-desc").value = data.features.f3Desc || "High-end cafe experience delivered fresh to your door at honest prices.";
        document.getElementById("set-f4-title").value = data.features.f4Title || "Local Delivery";
        document.getElementById("set-f4-desc").value = data.features.f4Desc || "Every order supports a local artisan and a dream of crafting better coffee for everyone.";
      }

      // Collections — dynamic array
      if (data.collectionsData && data.collectionsData.length) {
        renderCollectionRows(data.collectionsData);
      } else if (data.collections) {
        // Backward compat: convert old c1..c4 keys to array
        const legacyArr = [];
        for (let i = 1; i <= 4; i++) {
          const t = data.collections['c'+i+'Title'];
          const s = data.collections['c'+i+'Sub'];
          const img = data.collectionsImg ? (data.collectionsImg[i-1] || '') : '';
          if (t) legacyArr.push({ title: t, sub: s || '', img: img });
        }
        renderCollectionRows(legacyArr);
      } else {
        renderCollectionRows([]);
      }

      if(data.schedule) {
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        days.forEach(day => {
          if (data.schedule[day]) {
            document.getElementById(`${day.toLowerCase()}-open`).value = data.schedule[day].open || "09:00";
            document.getElementById(`${day.toLowerCase()}-close`).value = data.schedule[day].close || "22:00";
            document.getElementById(`${day.toLowerCase()}-closed`).checked = !!data.schedule[day].closedAllDay;
            if(data.schedule[day].closedAllDay) {
                document.getElementById(`${day.toLowerCase()}-open`).disabled = true;
                document.getElementById(`${day.toLowerCase()}-close`).disabled = true;
            } else {
                document.getElementById(`${day.toLowerCase()}-open`).disabled = false;
                document.getElementById(`${day.toLowerCase()}-close`).disabled = false;
            }
          }
        });
      }

      document.getElementById("set-autolive").checked = !!data.autoLive;
      document.getElementById("set-isopen").checked = !!data.isOpen;
      
      if(data.autoLive) manualOverride.classList.add("hidden", "opacity-50");
      else manualOverride.classList.remove("hidden", "opacity-50");
    }
  });
}

document.getElementById("settings-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector("button[type='submit']");
  submitBtn.disabled = true;

  const schedule = {
    Sun: { open: document.getElementById("sun-open").value, close: document.getElementById("sun-close").value, closedAllDay: document.getElementById("sun-closed").checked },
    Mon: { open: document.getElementById("mon-open").value, close: document.getElementById("mon-close").value, closedAllDay: document.getElementById("mon-closed").checked },
    Tue: { open: document.getElementById("tue-open").value, close: document.getElementById("tue-close").value, closedAllDay: document.getElementById("tue-closed").checked },
    Wed: { open: document.getElementById("wed-open").value, close: document.getElementById("wed-close").value, closedAllDay: document.getElementById("wed-closed").checked },
    Thu: { open: document.getElementById("thu-open").value, close: document.getElementById("thu-close").value, closedAllDay: document.getElementById("thu-closed").checked },
    Fri: { open: document.getElementById("fri-open").value, close: document.getElementById("fri-close").value, closedAllDay: document.getElementById("fri-closed").checked },
    Sat: { open: document.getElementById("sat-open").value, close: document.getElementById("sat-close").value, closedAllDay: document.getElementById("sat-closed").checked },
  };

  // Image Upload Processing
  const progressText = document.getElementById("settings-upload-progress");
  const filePromises = [];
  
  // Process Story Image
  const storyFile = document.getElementById("set-story-file").files[0];
  let finalStoryImg = currentSettings.storyImg || "";
  if(storyFile) {
     filePromises.push(compressAndGetBase64(storyFile).then(url => finalStoryImg = url));
  }

  // Process Insta Gallery
  let finalInstaGallery = currentSettings.instaGallery ? [...currentSettings.instaGallery] : Array(6).fill("");
  for(let i=1; i<=6; i++) {
     const f = document.getElementById(`set-ig-${i}`).files[0];
     if(f) {
        filePromises.push(compressAndGetBase64(f).then(url => finalInstaGallery[i-1] = url));
     }
  }

  // Process Collection Images (dynamic)
  const collectionRows = document.querySelectorAll('#collections-list .collec-row');
  let finalCollectionsData = currentSettings.collectionsData ? JSON.parse(JSON.stringify(currentSettings.collectionsData)) : [];
  // Resize array to match current rows
  while (finalCollectionsData.length < collectionRows.length) finalCollectionsData.push({ title: '', sub: '', img: '' });
  finalCollectionsData = finalCollectionsData.slice(0, collectionRows.length);

  collectionRows.forEach((row, idx) => {
    finalCollectionsData[idx].title = row.querySelector('.collec-title').value;
    finalCollectionsData[idx].sub   = row.querySelector('.collec-sub').value;
    const imgFile = row.querySelector('.collec-img-file').files[0];
    if (imgFile) {
      filePromises.push(compressAndGetBase64(imgFile).then(url => finalCollectionsData[idx].img = url));
    }
  });

  if(filePromises.length > 0) {
     progressText.classList.remove("hidden");
     try {
       await Promise.all(filePromises);
     } catch (err) {
       alert("Error compressing images. Only valid images below maximum limits are allowed.");
       submitBtn.disabled = false;
       progressText.classList.add("hidden");
       return;
     }
     progressText.classList.add("hidden");
  }

  const payload = {
    heroTitle: document.getElementById("set-hero-title").value,
    heroSub: document.getElementById("set-hero-sub").value,
    storyHeading: document.getElementById("set-story-heading").value,
    storyImg: finalStoryImg,
    instaGallery: finalInstaGallery,
    aboutText: document.getElementById("set-about").value,
    whatsapp: document.getElementById("set-whatsapp").value,
    email: document.getElementById("set-email").value,
    instagram: document.getElementById("set-instagram").value,
    emailjs: {
       publicKey: document.getElementById("set-emailjs-public").value,
       serviceId: document.getElementById("set-emailjs-service").value,
       templateId: document.getElementById("set-emailjs-template").value,
    },
    features: {
       f1Title: document.getElementById("set-f1-title").value,
       f1Desc: document.getElementById("set-f1-desc").value,
       f2Title: document.getElementById("set-f2-title").value,
       f2Desc: document.getElementById("set-f2-desc").value,
       f3Title: document.getElementById("set-f3-title").value,
       f3Desc: document.getElementById("set-f3-desc").value,
       f4Title: document.getElementById("set-f4-title").value,
       f4Desc: document.getElementById("set-f4-desc").value,
    },
    collectionsData: finalCollectionsData,
    schedule: schedule,
    autoLive: document.getElementById("set-autolive").checked,
    isOpen: document.getElementById("set-isopen").checked,
  };
  
  db.collection("settings").doc("storeConfig").set(payload, { merge: true })
    .then(() => {
      const msg = document.getElementById("settings-msg");
      msg.classList.remove("hidden");
      submitBtn.disabled = false;
      // Clear file inputs after success
      document.getElementById("set-story-file").value = "";
      for(let i=1; i<=6; i++) document.getElementById(`set-ig-${i}`).value = "";
      document.querySelectorAll('#collections-list .collec-img-file').forEach(f => f.value = '');
      setTimeout(() => msg.classList.add("hidden"), 3000);
    });
});

// ── Dynamic Collections Helpers ──────────────────────────────────
window.addCollectionRow = function(data = {}) {
  const list = document.getElementById('collections-list');
  const idx = list.querySelectorAll('.collec-row').length + 1;
  const div = document.createElement('div');
  div.className = 'collec-row p-4 bg-surface-container-low rounded-2xl border border-outline/10 flex flex-col gap-2 relative';
  div.innerHTML = `
    <div class="flex justify-between items-center mb-1">
      <span class="text-xs text-primary font-bold">Collection ${idx}</span>
      <button type="button" onclick="this.closest('.collec-row').remove(); renumberCollectionRows()" class="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1">
        <span class="material-symbols-outlined text-sm">delete</span> Remove
      </button>
    </div>
    <input type="text" class="collec-title w-full bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="e.g. Cold Coffee" value="${data.title||''}">
    <input type="text" class="collec-sub w-full bg-white rounded-xl p-3 text-sm border border-outline/20" placeholder="e.g. Brewed for 18 hours" value="${data.sub||''}">
    ${data.img ? `<img src="${data.img}" class="w-16 h-16 object-cover rounded-lg border border-outline/20 mb-1">` : ''}
    <input type="file" class="collec-img-file w-full bg-surface-container-lowest rounded-xl p-2 border border-outline/10 text-xs" accept="image/*">
  `;
  list.appendChild(div);
};

window.renumberCollectionRows = function() {
  document.querySelectorAll('#collections-list .collec-row').forEach((row, i) => {
    const label = row.querySelector('span.text-primary');
    if (label) label.textContent = 'Collection ' + (i + 1);
  });
};

function renderCollectionRows(dataArr) {
  const list = document.getElementById('collections-list');
  list.innerHTML = '';
  if (!dataArr || dataArr.length === 0) {
    // Default 4 empty rows
    for (let i = 0; i < 4; i++) addCollectionRow();
    return;
  }
  dataArr.forEach(item => addCollectionRow(item));
}

// ──────────────────────────────────────────────
//  🚀  BASE64 IMAGE COMPRESSOR Helper
// ──────────────────────────────────────────────
function compressAndGetBase64(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        } else if (height > maxWidth) {
          width *= maxWidth / height;
          height = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        // Heavily compress jpeg (0.6 quality gives very small footprint suitable for Firestore)
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (e) => reject("Image processing failed");
    };
    reader.onerror = (e) => reject("File reading failed");
  });
}

// ──────────────────────────────────────────────
//  📦  PRODUCT CRUD (Replaces Inventory)
// ──────────────────────────────────────────────
let currentProducts = [];

function loadProducts() {
  db.collection("products").onSnapshot(snapshot => {
    // Optional Seeder trigger if completely empty
    if(snapshot.empty && !window.seededOnce) {
      window.seededOnce = true;
      seedInitialProducts();
    }

    const grid = document.getElementById("products-grid");
    currentProducts = [];
    let html = "";
    snapshot.forEach(doc => {
      const p = doc.data();
      p.id = doc.id;
      currentProducts.push(p);
      const isAvail = !p.outOfStock;
      
      html += `
      <div class="glass-card p-6 rounded-2xl flex flex-col justify-between h-full bg-white relative group">
        <div class="relative w-full h-40 rounded-xl overflow-hidden mb-4">
          <img src="${p.img}" class="w-full h-full object-contain bg-surface-container">
        </div>
        <div>
          <h4 class="font-bold text-primary mb-1">${p.name}</h4>
          <p class="text-xs text-on-surface-variant line-clamp-2 mb-2">${p.desc}</p>
          <div class="font-black text-primary mb-4">₹${p.price}</div>
        </div>
        <div class="mt-auto pt-4 border-t border-outline/10 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold ${isAvail ? 'text-secondary' : 'text-outline'}">${isAvail ? 'In Stock' : 'Out of Stock'}</span>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" onchange="toggleProductStock('${p.id}', this.checked)" class="sr-only peer" ${isAvail ? 'checked' : ''}>
              <div class="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
            </label>
          </div>
          <div class="flex gap-2">
            <button onclick="editProduct('${p.id}')" class="flex-1 py-2 text-xs font-bold bg-surface-container-high rounded border border-outline/20 hover:bg-surface-container-highest transition-colors text-primary">Edit</button>
            <button onclick="deleteProduct('${p.id}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded border border-red-100 hover:bg-red-100 transition-colors">Delete</button>
          </div>
        </div>
      </div>`;
    });
    if(html === "") html = `<div class="p-8 text-center text-on-surface-variant col-span-full">No products found.</div>`;
    grid.innerHTML = html;
  });
}

function closeProductModal() {
  document.getElementById('add-product-modal').classList.add('hidden');
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('prod-original-price').value = '';
  document.getElementById('product-modal-title').innerText = 'Add Product';
  const preview = document.getElementById('prod-img-preview');
  if (preview) preview.innerHTML = '';
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("prod-id").value;
  const fileInput = document.getElementById("prod-img");
  const oldUrl = document.getElementById("prod-img-url").value;
  const btn = e.target.querySelector("button[type='submit']");
  btn.disabled = true;

  // Gather existing images from preview (kept ones)
  let existingImages = [];
  document.querySelectorAll('#prod-img-preview img').forEach(img => existingImages.push(img.dataset.url));

  const saveProductToDB = (newImageUrls) => {
    const allImages = [...existingImages, ...newImageUrls];
    if (allImages.length === 0) allImages.push(oldUrl || 'https://placehold.co/400');
    const payload = {
      name: document.getElementById("prod-name").value,
      price: document.getElementById("prod-price").value,
      originalPrice: document.getElementById("prod-original-price").value ? Number(document.getElementById("prod-original-price").value) : null,
      badge: document.getElementById("prod-badge").value,
      img: allImages[0],        // keep backward compat
      images: allImages,
      desc: document.getElementById("prod-desc").value,
      outOfStock: document.getElementById("prod-outofstock").checked
    };
    const task = id ? db.collection("products").doc(id).update(payload) : db.collection("products").add(payload);
    task.then(() => { btn.disabled = false; closeProductModal(); });
  };

  if (fileInput.files.length > 0) {
    document.getElementById("upload-progress").classList.remove("hidden");
    const compressionPromises = Array.from(fileInput.files).map(f => compressAndGetBase64(f));
    try {
      const newUrls = await Promise.all(compressionPromises);
      document.getElementById("upload-progress").classList.add("hidden");
      saveProductToDB(newUrls);
    } catch (err) {
      console.error(err);
      document.getElementById("upload-progress").classList.add("hidden");
      alert("Image compression failed.");
      btn.disabled = false;
    }
  } else {
    const newUrlField = document.getElementById("prod-img-newurl");
    if (newUrlField && newUrlField.value.trim() !== "") {
      const urlLines = newUrlField.value.split('\n').map(u => u.trim()).filter(Boolean);
      saveProductToDB(urlLines);
    } else {
      saveProductToDB([]);
    }
  }
});

window.editProduct = function(id) {
  const p = currentProducts.find(x => x.id === id);
  if(!p) return;
  document.getElementById("prod-id").value = p.id;
  document.getElementById("prod-name").value = p.name;
  document.getElementById("prod-price").value = p.price;
  document.getElementById("prod-original-price").value = p.originalPrice || "";
  document.getElementById("prod-badge").value = p.badge || "";
  document.getElementById("prod-img").value = "";
  document.getElementById("prod-img-newurl").value = "";
  document.getElementById("prod-img-url").value = p.img;
  document.getElementById("prod-desc").value = p.desc;
  document.getElementById("prod-outofstock").checked = p.outOfStock;

  // Render image previews
  const preview = document.getElementById('prod-img-preview');
  const imgs = p.images && p.images.length ? p.images : (p.img ? [p.img] : []);
  preview.innerHTML = imgs.map((url, i) => `
    <div class="relative" id="img-preview-${i}">
      <img src="${url}" data-url="${url}" class="w-16 h-16 object-cover rounded-lg border border-outline/20" title="Image ${i+1}">
      <button type="button" onclick="removePreviewImg(${i})" class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-black hover:bg-red-700">×</button>
    </div>`).join('');

  document.getElementById('product-modal-title').innerText = 'Edit Product';
  document.getElementById('add-product-modal').classList.remove('hidden');
};

window.removePreviewImg = function(i) {
  const el = document.getElementById('img-preview-'+i);
  if (el) el.remove();
};

window.deleteProduct = function(id) {
  if(confirm("Are you sure you want to delete this product?")) {
    db.collection("products").doc(id).delete();
  }
}

window.toggleProductStock = function(id, isAvailable) {
  db.collection("products").doc(id).update({ outOfStock: !isAvailable });
};

// ──────────────────────────────────────────────
//  ⭐  REVIEW MANAGEMENT
// ──────────────────────────────────────────────
function loadReviews() {
  db.collection("reviews").orderBy("timestamp", "desc").onSnapshot(snapshot => {
    const grid = document.getElementById("reviews-grid");
    if(snapshot.empty) {
      grid.innerHTML = `<div class="p-8 text-center text-on-surface-variant col-span-full">No reviews submitted yet.</div>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const rev = doc.data();
      const isApproved = rev.status === "approved";
      
      html += `
      <div class="glass-card p-6 rounded-2xl bg-white border ${isApproved ? 'border-secondary/20' : 'border-outline/20'}">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h4 class="font-bold text-primary">${rev.name}</h4>
            <div class="flex text-secondary text-sm"><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span><span class="material-symbols-outlined text-sm">star</span></div>
          </div>
          <span class="px-3 py-1 rounded-full text-xs font-bold ${isApproved ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
            ${isApproved ? 'Approved' : 'Pending'}
          </span>
        </div>
        <p class="text-sm text-on-surface-variant italic mb-6">"${rev.text}"</p>
        <div class="flex gap-2 border-t border-outline/10 pt-4">
          <button onclick="updateReview('${doc.id}', 'approved')" class="flex-1 py-2 text-xs font-bold rounded border ${isApproved ? 'bg-secondary text-white' : 'hover:bg-green-50 text-secondary border-secondary'} transition-colors">Approve</button>
          <button onclick="updateReview('${doc.id}', 'rejected')" class="flex-1 py-2 text-xs font-bold rounded border ${!isApproved ? 'bg-red-50 text-red-600' : 'hover:bg-red-50 text-outline'} transition-colors">Reject/Hide</button>
        </div>
      </div>`;
    });
    grid.innerHTML = html;
  });
}

window.updateReview = function(id, status) {
  db.collection("reviews").doc(id).update({ status: status });
}

// Fallback seed function so website isn't completely empty initially
function seedInitialProducts() {
  const seed = [
    { name: "Caramel Cloud Cold Brew", desc: "Velvety foam layered over our signature 18-hour steep, finished with house-made caramel.", price: 149, badge: "⭐ Best Seller", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAI6bqWnV0eVhM2O80smaAPhKZFI-FT2yStUZg6x25CTYRxKrbJ1_EwiHqdP-z2JAEh2Mt7M2UpaTqeRv9LxGfMNVWc7FpvlFou7uMSgpPSwIOi78vmSOQUm2sGZ6v63p3hXSWx14igFVv4hqozF6Gyr39eGd1AF-A6uwlFvWbF474rnHGS3GIaTQS0JKPKXkt7JlPCLnfkTEBkMF9JXzO4BUPdhR1rCIt8qhN-bC4F188wKXgwMPNk35lW-EsHKE7fdTJVNzetQNY", outOfStock: false },
    { name: "Midnight Mojito", desc: "Deep berry infusion with muddled garden mint and a sharp citrus kick. Refreshment redefined.", price: 129, badge: "🌿 Fresh", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuB5LGsFaMQsbTUvg6V0D9fspBYiroXPnhIbkT37XKWHjwMf9BIfuCCe78eBxUOYHN3xEgnW7qQnjxTwyCE_9Zsq69yNdR-kUUY4x-8mRStukBAaPwTf2ZgUruX_LsOvfsVECUn-sPF5bbXsWHb5oY-Q4pgjqhKMK3P5M3mKZDBuQTKjfnASrQXPqLjT4Q7k2MpDCBs6ahJBjJVLaIawepdF2dEgNw9Nk17nOrxk7d8KDka1E0CyK68YVfDNUM2r1BoR_PknTYJmw3U", outOfStock: false },
    { name: "Dipu's Mini-Brew Keychain", desc: "Individually handcrafted resin keychains. A tiny piece of BrewDipu to carry everywhere.", price: 89, badge: "🎨 Handmade", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBg3px03BErm9fszHgQXGvDPcbasCwngej2BR1hOvOJz-oIK-Qcv24uy-LPv5ElFxx5yMIBXk2zBpxoCthQ6USl864ekLf00Kx4HtayCXVIftcWap9plu7XwLUdVU8wM7LftQfza51WviuznGClnw0i2SCwXQqFCRKkb3Vmwci-2qgmFL3VH2KYks33BH8dCOVh9thysVhPVm9S6pPzB0tppaCuB2narmQlLTezsJsMhCD_Tt-27kwXGyEIDlSJ7_XqAEbSX-Q99LM", outOfStock: false },
    { name: "Sunrise Orange Burst", desc: "Freshly squeezed oranges blended with a hint of ginger. Pure, organic, no added sugar.", price: 99, badge: "🍊 Organic", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIntQ-ubtNMEvijaYU5lNeNGFs8vLYNcKKN9H3CmkVMycEJRm1vfNBYI2le0aZqU682HqK-s_l-1zhg7FMcY7_HigBSIYacu36QvRKe4jMvXqPbC4HhiS-KUruCZgVS7Sdmx_ca3r6Shf2H0W_CxMaP3dHqgU4yBuEu5Q5PLFGbvpjf4acHMBJfMl8IgRZ1tWJ25ovHLS2omkedNxpNxgZ_XJsPQUS6rVwGS-ZHDmEBokWR5Xx-xKWA9ueCdtcRHsInH91b63VGJY", outOfStock: false },
    { name: "Classic Cold Brew", desc: "No-frills, full-flavour. The original BrewDipu slow-steeped cold brew. Bold, smooth, iconic.", price: 119, badge: "🏆 Classic", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCrPHB9YCAT75EtF4hVagAl11ELzw5MsHEZR0kPmkn0IxnCWITy0gy6GziNw1zi8gaZLUS56R6kqXjBBh67nKIQi_fXsyBgmaLzPtGmMHLAxgssHVJdy1E_3Ud-tzosQj-F34bKSkjxW5TERUIaTH-eM-s-J7w_aaT2cyzoV_w4uQEYiEc4hka7a8smMj8EnxMx4D9cVoRYdFv1GlqMWfxcu5OpwWvA6aDZyNDuspvsncnHnMgp2cWt0rSLyELFYL-HRq3KSMWxP0U", outOfStock: false },
    { name: "Dragon Berry Cooler", desc: "Dragonfruit, mint, and sparkling water fused into one electrifying, Insta-worthy cooler.", price: 139, badge: "🔥 Trending", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDG5dgLYqM4_p9H4qSZGU_1UGOu29_5DLGSxSR-S9I1Ky7kVn8Q9zDiX5am5l0RqDuEmMeNIxb-j7LHhx2r4-KuvsO1WWdIndFOaREFzRQT26Mr0dI_M33zefuCoWL9O7y-yQ9fLQij3nR4fHkAOmWyH8c8Yr56XPAvHe1fSGt7EQN7SILqPZKbZgAk5X1yTOo_Ikapc8HiX8cpBNbA74xWANTxOvE3q1XAbuqAeZbe6N7edSj5Z0HnO1N2hhlYjXuvMmSTz1zDoKs", outOfStock: false }
  ];
  seed.forEach(s => db.collection("products").add(s));
}

// ──────────────────────────────────────────────
//  🎁  OFFERS & PROMO CODES MANAGEMENT
// ──────────────────────────────────────────────
window.toggleOfferImageField = function() {
  const type = document.getElementById("offer-type").value;
  const imgBlock = document.getElementById("offer-img-block");
  const discountBlock = document.getElementById("offer-discount-block");
  if(type === "freeGift") {
    imgBlock.classList.remove("hidden");
    // only require image on new entries, not edits
    if(!document.getElementById("offer-code").getAttribute("data-editing")) {
      document.getElementById("offer-img").required = false; // optional for freeGift too
    }
  } else {
    imgBlock.classList.add("hidden");
    document.getElementById("offer-img").required = false;
  }

  if(type === "discountCode" || type === "brew20") {
    discountBlock.classList.remove("hidden");
  } else {
    discountBlock.classList.add("hidden");
  }
}

let currentEditOfferUses = 0;
let currentEditOfferImg = null;
let currentEditOfferDesc = "";

window.closeOfferModal = function() {
  document.getElementById("add-offer-modal").classList.add("hidden");
  document.getElementById("offer-form").reset();
  document.getElementById("offer-code").disabled = false;
  document.getElementById("offer-code").removeAttribute("data-editing");
  document.getElementById("offer-modal-title").textContent = "Add Reward / Code";
  document.getElementById("offer-discount-pct").value = 20;
  currentEditOfferUses = 0;
  currentEditOfferImg = null;
  currentEditOfferDesc = "";
  toggleOfferImageField();
}

// Open modal pre-filled with a fresh RWD- Reward Code
window.openNewRewardCode = function() {
  closeOfferModal(); // reset state
  const code = "RWD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  document.getElementById("offer-code").value = code;
  document.getElementById("offer-type").value = "rewardCode";
  document.getElementById("offer-limit").value = 1;
  document.getElementById("offer-modal-title").textContent = "Create 600pts Reward Code";
  document.getElementById("add-offer-modal").classList.remove("hidden");
  toggleOfferImageField();
}

function loadOffers() {
  db.collection("promoCodes").onSnapshot(snapshot => {
    const grid = document.getElementById("offers-grid");
    if(snapshot.empty) {
      grid.innerHTML = `<div class="p-8 text-center text-on-surface-variant col-span-full">No active offers. Use the buttons above to create one.</div>`;
      return;
    }

    let html = "";
    snapshot.forEach(doc => {
      const data = doc.data();
      const code = doc.id;
      const isGift = data.type === 'freeGift';
      const isReward = data.type === 'rewardCode';
      const isDiscount = data.type === 'discountCode' || data.type === 'brew20';
      const discountPct = data.discountPct || 20;
      const typeLabel = isGift ? '🎁 Free Gift' : isReward ? '🎟️ Reward Code' : `💎 ${discountPct}% Discount`;
      const typeBg = isGift ? 'bg-green-50 text-green-700 border-green-200'
                   : isReward ? 'bg-purple-50 text-purple-700 border-purple-200'
                   : 'bg-blue-50 text-blue-700 border-blue-200';
      const uses = data.uses || 0;
      const limit = data.limit;
      const remaining = limit ? limit - uses : null;
      const isExpired = limit && uses >= limit;

      html += `
      <div class="glass-card p-5 rounded-2xl flex flex-col bg-white border ${isExpired ? 'border-red-200 opacity-60' : 'border-outline/10'} relative">
        ${isExpired ? '<div class="absolute top-3 right-3 text-[10px] font-black bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest">Expired</div>' : ''}
        <span class="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border self-start mb-3 ${typeBg}">${typeLabel}</span>
        <h4 class="font-mono text-lg font-black text-secondary tracking-widest mb-1">${code}</h4>
        ${data.desc ? `<p class="text-xs text-on-surface-variant mb-3 leading-relaxed">${data.desc}</p>` : ''}
        ${data.img ? `<img src="${data.img}" class="w-full h-28 object-contain bg-surface-container rounded-xl mb-3 border border-outline/10">` : ''}
        <div class="flex justify-between text-xs text-on-surface-variant border-t border-outline/10 pt-3 mb-3">
          <span>Uses: <strong class="text-primary">${uses}</strong></span>
          <span>Limit: <strong class="text-primary">${limit || '∞'}</strong></span>
          ${remaining !== null ? `<span>Left: <strong class="${remaining <= 3 ? 'text-red-600' : 'text-primary'}">${remaining}</strong></span>` : ''}
        </div>
        <div class="flex gap-2 mt-auto">
          <button onclick="editOffer('${code}')" class="flex-1 py-2 text-xs font-bold bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors border border-blue-100">✏️ Edit</button>
          <button onclick="deleteOffer('${code}')" class="flex-1 py-2 text-xs font-bold bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors border border-red-100">🗑️ Delete</button>
        </div>
      </div>`;
    });
    grid.innerHTML = html;
  });
}

document.getElementById("offer-form").addEventListener("submit", (e) => {
  e.preventDefault();
  let code = document.getElementById("offer-code").value.trim().toUpperCase();
  const type = document.getElementById("offer-type").value;
  const limitInput = document.getElementById("offer-limit").value;
  // rewardCode defaults to 1 use; others default to 30
  const limit = parseInt(limitInput) || (type === "rewardCode" ? 1 : 30);
  const desc = document.getElementById("offer-desc").value.trim();
  const btn = e.target.querySelector("button[type='submit']");
  const originalCode = document.getElementById("offer-code").getAttribute("data-editing"); // set when editing
  const isEdit = !!originalCode;

  if(!code) {
    code = "RWD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  btn.disabled = true;

  const saveToDB = (imgUrl = null) => {
    const payload = {
      type: type,
      limit: limit,
      desc: desc,
      uses: isEdit ? currentEditOfferUses : 0
    };
    if (type === "discountCode" || type === "brew20") {
      payload.discountPct = parseInt(document.getElementById("offer-discount-pct").value) || 20;
    }
    if(imgUrl) {
      payload.img = imgUrl;
    } else if (isEdit && currentEditOfferImg) {
      payload.img = currentEditOfferImg;
    }

    const doSave = () => db.collection("promoCodes").doc(code).set(payload).then(() => {
      btn.disabled = false;
      closeOfferModal();
    }).catch(err => {
      alert("Error saving offer: " + err.message);
      btn.disabled = false;
    });

    // If code was renamed, delete old doc first
    if(isEdit && originalCode !== code) {
      db.collection("promoCodes").doc(originalCode).delete().then(doSave).catch(doSave);
    } else {
      doSave();
    }
  };

  const fileInput = document.getElementById("offer-img");
  if(type === "freeGift" && fileInput.files.length > 0) {
     document.getElementById("offer-upload-progress").classList.remove("hidden");
     compressAndGetBase64(fileInput.files[0]).then(base64Url => {
       document.getElementById("offer-upload-progress").classList.add("hidden");
       saveToDB(base64Url);
     }).catch(err => {
       console.error(err);
       btn.disabled = false;
       document.getElementById("offer-upload-progress").classList.add("hidden");
       alert("Error compressing offer image.");
     });
  } else {
     saveToDB();
  }
});

window.editOffer = function(code) {
  db.collection("promoCodes").doc(code).get().then(doc => {
    if(!doc.exists) return;
    const data = doc.data();
    document.getElementById("offer-code").value = code;
    document.getElementById("offer-code").disabled = false; // allow renaming
    document.getElementById("offer-code").setAttribute("data-editing", code); // track original ID
    document.getElementById("offer-type").value = data.type === "brew20" ? "discountCode" : (data.type || "discountCode");
    document.getElementById("offer-limit").value = data.limit || 1;
    document.getElementById("offer-desc").value = data.desc || "";
    document.getElementById("offer-discount-pct").value = data.discountPct || 20;
    document.getElementById("offer-modal-title").textContent = "Edit Offer: " + code;
    currentEditOfferUses = data.uses || 0;
    currentEditOfferImg = data.img || null;

    toggleOfferImageField();
    document.getElementById("offer-img").required = false;

    document.getElementById("add-offer-modal").classList.remove("hidden");
  });
};

window.deleteOffer = function(codeId) {
  if(confirm("Are you sure you want to permanently delete this code and offer?")) {
    db.collection("promoCodes").doc(codeId).delete();
  }
};
