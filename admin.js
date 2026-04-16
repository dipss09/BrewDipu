// ──────────────────────────────────────────────
//  🔥  FIREBASE CONFIGURATION 
// ──────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyD5jNH16Xkzrq6prfqtxOa10HbqEyBPm44",
  authDomain: "brewdipu-f2092.firebaseapp.com",
  projectId: "brewdipu-f2092",
  storageBucket: "brewdipu-f2092.firebasestorage.app",
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
auth.onAuthStateChanged((user) => {
  const loginScreen = document.getElementById("login-screen");
  const appScreen = document.getElementById("app-screen");
  if (user) {
    loginScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");
    loadSettings();
    loadOrders();
    loadProducts();
    loadReviews();
  } else {
    loginScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
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
  const tabs = ['orders', 'products', 'reviews', 'settings'];
  tabs.forEach(t => {
    document.getElementById(`tab-${t}`).classList.add("hidden");
    const btn = document.getElementById(`tab-btn-${t}`);
    btn.classList.remove("bg-primary", "text-white");
    btn.classList.add("text-on-surface-variant");
  });
  
  document.getElementById(`tab-${tabId}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  activeBtn.classList.add("bg-primary", "text-white");
  activeBtn.classList.remove("text-on-surface-variant");
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

function updateOrderStatus(id, newStatus) {
  db.collection("orders").doc(id).update({ status: newStatus });
}

// ──────────────────────────────────────────────
//  ⚙️  STORE SETTINGS (Timing & About)
// ──────────────────────────────────────────────
const autoliveCheckbox = document.getElementById("set-autolive");
const manualOverride = document.getElementById("manual-override-container");

autoliveCheckbox.addEventListener("change", (e) => {
  if(e.target.checked) manualOverride.classList.add("hidden", "opacity-50");
  else manualOverride.classList.remove("hidden", "opacity-50");
});

function loadSettings() {
  db.collection("settings").doc("storeConfig").onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("set-about").value = data.aboutText || "";
      document.getElementById("set-hero-title").value = data.heroTitle || "BrewDipu";
      document.getElementById("set-hero-sub").value = data.heroSub || "Chilled Sips, Crafted by Dipu.";
      document.getElementById("set-story-heading").value = data.storyHeading || "Artisanal Sips,\nBorn at Home.";

      // Auto Live bounds mapping handles floats/ints to "HH:mm"
      const formatTime = (hour) => {
        const h = Math.floor(hour).toString().padStart(2, '0');
        return `${h}:00`;
      };
      
      document.getElementById("set-open").value = formatTime(data.openHour || 16);
      document.getElementById("set-close").value = formatTime(data.closeHour || 22);
      
      document.getElementById("set-autolive").checked = !!data.autoLive;
      document.getElementById("set-isopen").checked = !!data.isOpen;
      
      if(data.autoLive) manualOverride.classList.add("hidden", "opacity-50");
      else manualOverride.classList.remove("hidden", "opacity-50");
    }
  });
}

document.getElementById("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const openTime = document.getElementById("set-open").value; // e.g. "16:00"
  const closeTime = document.getElementById("set-close").value;
  
  const openHour = parseFloat(openTime.split(":")[0]);
  const closeHour = parseFloat(closeTime.split(":")[0]);
  
  const payload = {
    heroTitle: document.getElementById("set-hero-title").value,
    heroSub: document.getElementById("set-hero-sub").value,
    storyHeading: document.getElementById("set-story-heading").value,
    aboutText: document.getElementById("set-about").value,
    openHour: openHour,
    closeHour: closeHour,
    autoLive: document.getElementById("set-autolive").checked,
    isOpen: document.getElementById("set-isopen").checked,
  };
  
  db.collection("settings").doc("storeConfig").set(payload, { merge: true })
    .then(() => {
      const msg = document.getElementById("settings-msg");
      msg.classList.remove("hidden");
      setTimeout(() => msg.classList.add("hidden"), 3000);
    });
});

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
          <img src="${p.img}" class="w-full h-full object-cover">
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
  document.getElementById('product-modal-title').innerText = 'Add Product';
}

document.getElementById("product-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("prod-id").value;
  const fileInput = document.getElementById("prod-img");
  const oldUrl = document.getElementById("prod-img-url").value;
  const btn = e.target.querySelector("button[type='submit']");
  btn.disabled = true;

  const saveProductToDB = (imgUrl) => {
    const payload = {
      name: document.getElementById("prod-name").value,
      price: document.getElementById("prod-price").value,
      badge: document.getElementById("prod-badge").value,
      img: imgUrl,
      desc: document.getElementById("prod-desc").value,
      outOfStock: document.getElementById("prod-outofstock").checked
    };

    const task = id ? db.collection("products").doc(id).update(payload) : db.collection("products").add(payload);
    task.then(() => {
      btn.disabled = false;
      closeProductModal();
    });
  };

  if(fileInput.files.length > 0) {
    const file = fileInput.files[0];
    document.getElementById("upload-progress").classList.remove("hidden");
    const ref = firebase.storage().ref('products/' + Date.now() + '_' + file.name);
    ref.put(file).then(snapshot => snapshot.ref.getDownloadURL()).then(url => {
      document.getElementById("upload-progress").classList.add("hidden");
      saveProductToDB(url);
    }).catch(err => {
      console.error(err);
      alert("Image upload failed");
      btn.disabled = false;
      document.getElementById("upload-progress").classList.add("hidden");
    });
  } else {
    saveProductToDB(oldUrl || "https://placehold.co/400");
  }
});

window.editProduct = function(id) {
  const p = currentProducts.find(x => x.id === id);
  if(!p) return;
  document.getElementById("prod-id").value = p.id;
  document.getElementById("prod-name").value = p.name;
  document.getElementById("prod-price").value = p.price;
  document.getElementById("prod-badge").value = p.badge || "";
  document.getElementById("prod-img").value = "";
  document.getElementById("prod-img-url").value = p.img;
  document.getElementById("prod-desc").value = p.desc;
  document.getElementById("prod-outofstock").checked = p.outOfStock;
  
  document.getElementById('product-modal-title').innerText = 'Edit Product';
  document.getElementById('add-product-modal').classList.remove('hidden');
}

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
