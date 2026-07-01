// ==========================================
// KRT TRADERS ERP - COMPLETE SCRIPT
// 100% LOCALSTORAGE - NO SUPABASE
// Developed by Bilal Suleman
// ==========================================

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
window.onerror = function(msg, url, line, col, error) {
    console.error('❌ Global Error:', msg, 'at', url, 'line', line);
    if (error) console.error('Stack:', error.stack);
    showNotification('⚠️ An error occurred. Check console.', 'error');
    return false;
};

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
    showNotification('⚠️ A background operation failed.', 'error');
    e.preventDefault();
});

// ==========================================
// GLOBAL DATABASE OBJECTS
// ==========================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];

// ==========================================
// LOAD DATA FROM LOCALSTORAGE
// ==========================================
function loadLocalData() {
    try {
        // Load main data
        const stored = localStorage.getItem('krt_erp_data');
        if (stored) {
            const parsed = JSON.parse(stored);
            db.in = parsed.in || [];
            db.out = parsed.out || [];
            db.ledgers = parsed.ledgers || {};
            db.opening_balances = parsed.opening_balances || {};
            console.log('✅ Local data loaded: IN=' + db.in.length + ', OUT=' + db.out.length);
        } else {
            db = { in: [], out: [], ledgers: {}, opening_balances: {} };
            console.log('ℹ️ No local data found, starting fresh');
        }
        
        // Load rent data
        const rentStored = localStorage.getItem('krt_rent_data');
        dbRent = rentStored ? JSON.parse(rentStored) : [];
        
        // Load users
        const usersStored = localStorage.getItem('krt_extra_users');
        extraUsers = usersStored ? JSON.parse(usersStored) : [];
        
        // Load ledgers separately
        const ledgersStored = localStorage.getItem('krt_ledgers_data');
        if (ledgersStored) {
            db.ledgers = JSON.parse(ledgersStored);
        }
        const openingStored = localStorage.getItem('krt_opening_balances');
        if (openingStored) {
            db.opening_balances = JSON.parse(openingStored);
        }
        
    } catch (err) {
        console.error('❌ Failed to load local data:', err);
        db = { in: [], out: [], ledgers: {}, opening_balances: {} };
        dbRent = [];
        extraUsers = [];
    }
}

// ==========================================
// SAVE DATA TO LOCALSTORAGE
// ==========================================
function saveLocalData() {
    try {
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        localStorage.setItem('krt_ledgers_data', JSON.stringify(db.ledgers));
        localStorage.setItem('krt_opening_balances', JSON.stringify(db.opening_balances));
        console.log('✅ Data saved to localStorage');
        return true;
    } catch (err) {
        console.error('❌ Failed to save local data:', err);
        return false;
    }
}

// ==========================================
// SAVE AND REFRESH
// ==========================================
function saveAndRefresh() {
    saveLocalData();
    renderAll();
    updateDashboardStats();
}

// ==========================================
// IDLE SCREEN SYSTEM
// ==========================================
const IDLE_TIMEOUT = 30000;
let idleTimer = null;
let isIdle = false;
let idleSeconds = 0;
let idleInterval = null;

function createIdleOverlay() {
    try {
        if (document.getElementById('idle-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'idle-overlay';
        overlay.innerHTML = `
            <div id="idle-status">🟢 ACTIVE</div>
            <div id="idle-particles"></div>
            <div id="idle-content">
                <span id="idle-icon">🐘</span>
                <h1 id="idle-title">⚡ <span class="highlight">KRT</span> ERP</h1>
                <div id="idle-timer">00:00</div>
                <p id="idle-message">🌟 An <strong>elephant never forgets</strong> —<br>and neither does your KRT ERP!<br>Your session is <strong>paused</strong>, ready to resume.</p>
                <button id="idle-touch-btn"><span class="icon">👆</span> Touch to Continue</button>
                <div id="idle-motto">✦ <span>Bilal Suleman</span> • KRT TRADERS ERP v5.0 ✦</div>
            </div>
            <div id="idle-version">✦ MEMORY DRIVEN • ELEPHANT NEVER FORGETS ✦</div>
        `;
        document.body.appendChild(overlay);
        overlay.addEventListener('click', dismissIdleScreen);
        const touchBtn = document.getElementById('idle-touch-btn');
        if (touchBtn) {
            touchBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                dismissIdleScreen();
            });
        }
        generateIdleParticles();
        generateIdleEmojis();
    } catch (err) {
        console.error('❌ Failed to create idle overlay:', err);
    }
}

function generateIdleParticles() {
    try {
        const container = document.getElementById('idle-particles');
        if (!container) return;
        container.innerHTML = '';
        const colors = ['#f1c40f', '#e67e22', '#3498db', '#27ae60', '#e74c3c', '#9b59b6'];
        for (let i = 0; i < 30; i++) {
            const p = document.createElement('div');
            p.className = 'idle-particle';
            const size = Math.random() * 10 + 4;
            p.style.cssText = `
                width:${size}px; height:${size}px;
                left:${Math.random()*100}%;
                background:${colors[Math.floor(Math.random()*colors.length)]};
                opacity:${Math.random()*0.15+0.05};
                animation-duration:${Math.random()*20+15}s;
                animation-delay:${Math.random()*20}s;
                border-radius:${Math.random()>0.5?'50%':'4px'};
            `;
            container.appendChild(p);
        }
    } catch (err) {
        console.error('❌ Failed to generate particles:', err);
    }
}

function generateIdleEmojis() {
    try {
        const overlay = document.getElementById('idle-overlay');
        if (!overlay) return;
        document.querySelectorAll('.floating-emoji').forEach(el => el.remove());
        const emojis = ['🐘','🌟','✨','💎','⚡','🔥','💫','🎯','🏆','👑','🦋','🌈'];
        for (let i = 0; i < 20; i++) {
            const e = document.createElement('div');
            e.className = 'floating-emoji';
            e.textContent = emojis[Math.floor(Math.random()*emojis.length)];
            e.style.cssText = `
                left:${Math.random()*100}%;
                font-size:${Math.random()*30+20}px;
                animation-duration:${Math.random()*30+20}s;
                animation-delay:${Math.random()*30}s;
                opacity:${Math.random()*0.05+0.03};
            `;
            overlay.appendChild(e);
        }
    } catch (err) {
        console.error('❌ Failed to generate emojis:', err);
    }
}

function showIdleScreen() {
    try {
        if (isIdle) return;
        const loginScreen = document.getElementById('login-screen');
        const welcomeOverlay = document.getElementById('welcome-overlay');
        if (!loginScreen || !welcomeOverlay) return;
        if (loginScreen.style.display !== 'none') return;
        if (welcomeOverlay.style.display !== 'none') return;
        
        isIdle = true;
        let overlay = document.getElementById('idle-overlay');
        if (!overlay) {
            createIdleOverlay();
            overlay = document.getElementById('idle-overlay');
            if (!overlay) return;
        }
        
        idleSeconds = 0;
        const timerEl = document.getElementById('idle-timer');
        if (timerEl) timerEl.textContent = '00:00';
        overlay.style.display = 'flex';
        overlay.style.animation = 'idleIn 0.8s ease';
        const statusEl = document.getElementById('idle-status');
        if (statusEl) statusEl.textContent = '🔴 IDLE';
        
        generateIdleParticles();
        generateIdleEmojis();
        
        if (idleInterval) clearInterval(idleInterval);
        idleInterval = setInterval(function() {
            idleSeconds++;
            const m = String(Math.floor(idleSeconds/60)).padStart(2,'0');
            const s = String(idleSeconds%60).padStart(2,'0');
            const timer = document.getElementById('idle-timer');
            if (timer) timer.textContent = `${m}:${s}`;
        }, 1000);
    } catch (err) {
        console.error('❌ Failed to show idle screen:', err);
    }
}

function dismissIdleScreen() {
    try {
        if (!isIdle) return;
        isIdle = false;
        const overlay = document.getElementById('idle-overlay');
        if (overlay) {
            overlay.style.animation = 'idleOut 0.5s ease forwards';
            setTimeout(function() {
                overlay.style.display = 'none';
                overlay.style.animation = '';
            }, 500);
        }
        if (idleInterval) {
            clearInterval(idleInterval);
            idleInterval = null;
        }
        const statusEl = document.getElementById('idle-status');
        if (statusEl) statusEl.textContent = '🟢 ACTIVE';
        resetIdleTimer();
    } catch (err) {
        console.error('❌ Failed to dismiss idle screen:', err);
    }
}

function resetIdleTimer() {
    try {
        if (idleTimer) clearTimeout(idleTimer);
        if (isIdle) return;
        idleTimer = setTimeout(showIdleScreen, IDLE_TIMEOUT);
    } catch (err) {
        console.error('❌ Failed to reset idle timer:', err);
    }
}

function setupIdleDetection() {
    try {
        createIdleOverlay();
        const events = ['mousedown','mousemove','keypress','scroll','touchstart','click','wheel','touchmove'];
        events.forEach(function(e) {
            document.addEventListener(e, resetIdleTimer);
        });
        document.addEventListener('visibilitychange', function() {
            if (!document.hidden) resetIdleTimer();
        });
        resetIdleTimer();
    } catch (err) {
        console.error('❌ Failed to setup idle detection:', err);
    }
}

// ==========================================
// LOGIN SYSTEM
// ==========================================
function login() {
    try {
        const userInput = document.getElementById('user');
        const passInput = document.getElementById('pass');
        if (!userInput || !passInput) {
            showNotification('⚠️ Login form not found!', 'error');
            return;
        }
        
        const u = userInput.value.trim().toLowerCase();
        const p = passInput.value.trim();
        
        if (u === "admin" && p === "123") {
            localStorage.setItem('isLoggedIn','true');
            localStorage.setItem('userRole','admin');
            showSystem("admin");
        } else if (u === "ali" && p === "123") {
            localStorage.setItem('isLoggedIn','true');
            localStorage.setItem('userRole','staff');
            showSystem("staff");
        } else if (u === "sattar" && p === "123") {
            localStorage.setItem('isLoggedIn','true');
            localStorage.setItem('userRole','manager');
            showSystem("manager");
        } else {
            const found = extraUsers.find(function(user) {
                return user.id === u && user.pass === p;
            });
            if (found) {
                localStorage.setItem('isLoggedIn','true');
                localStorage.setItem('userRole','extra');
                showSystem(found);
                const toggleBtn = document.getElementById('toggle-btn');
                if (toggleBtn) toggleBtn.style.display = "block";
            } else {
                showNotification("❌ Ghalat ID ya Password!", "error");
                const loginBox = document.querySelector('#login-screen .login-box');
                if (loginBox) {
                    loginBox.style.animation = 'shake 0.5s ease';
                    setTimeout(function() {
                        loginBox.style.animation = '';
                    }, 500);
                }
            }
        }
    } catch (err) {
        console.error('❌ Login error:', err);
        showNotification('⚠️ Login failed. Please try again.', 'error');
    }
}

// ==========================================
// SHOW SYSTEM
// ==========================================
function showSystem(roleOrUser) {
    try {
        const loginScreen = document.getElementById('login-screen');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const toggleBtn = document.getElementById('toggle-btn');
        
        if (loginScreen) loginScreen.style.display = "none";
        if (sidebar) sidebar.style.display = "block";
        if (mainContent) mainContent.style.display = "block";
        if (toggleBtn) toggleBtn.style.display = "block";
        
        if (typeof roleOrUser === "object") {
            applyDynamicPermissions(roleOrUser);
        } else {
            const items = document.querySelectorAll('#sidebar ul li');
            items.forEach(function(item) {
                item.style.display = "flex";
            });
            if (roleOrUser === "staff") {
                items.forEach(function(item) {
                    const t = item.innerText || '';
                    if (!t.includes("Dashboard") && !t.includes("Daily Report") && 
                        !t.includes("Stock Balance") && !t.includes("Logout")) {
                        item.style.display = "none";
                    }
                });
                switchPage('page-Report','DAILY REPORT');
            } else if (roleOrUser === "manager") {
                items.forEach(function(item) {
                    const t = item.innerText || '';
                    if (!t.includes("Dashboard") && !t.includes("Customer Ledgers") && 
                        !t.includes("Market Rent Book") && !t.includes("Stock Balance") && 
                        !t.includes("Logout")) {
                        item.style.display = "none";
                    }
                });
                switchPage('page-customer-ledgers','CUSTOMER LEDGERS');
            }
        }
        renderAll();
        updateDashboardStats();
        loadUserTable();
        resetIdleTimer();
    } catch (err) {
        console.error('❌ Failed to show system:', err);
        showNotification('⚠️ Failed to load system. Please refresh.', 'error');
    }
}

function applyDynamicPermissions(user) {
    try {
        const items = document.querySelectorAll('#sidebar ul li');
        items.forEach(function(item) {
            const onclick = item.getAttribute('onclick') || "";
            if (onclick.includes('page-dashboard') || onclick.includes('logout')) {
                item.style.display = "flex";
                return;
            }
            let hasPerm = false;
            if (user.perms) {
                hasPerm = user.perms.some(function(p) {
                    return onclick.includes(p);
                });
            }
            item.style.display = hasPerm ? "flex" : "none";
        });
        renderAll();
    } catch (err) {
        console.error('❌ Failed to apply permissions:', err);
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = "info") {
    try {
        document.querySelectorAll('.toast-notification').forEach(function(el) {
            if (el.textContent === message) el.remove();
        });
        
        const div = document.createElement('div');
        div.className = `toast-notification ${type}`;
        div.textContent = message;
        document.body.appendChild(div);
        
        setTimeout(function() { div.classList.add('show'); }, 50);
        setTimeout(function() {
            div.classList.remove('show');
            setTimeout(function() { if (div.parentNode) div.remove(); }, 500);
        }, 4000);
    } catch (err) {
        console.error('❌ Failed to show notification:', err);
    }
}

// ==========================================
// STOCK IN - 100% LOCALSTORAGE
// ==========================================
function addIn() {
    try {
        const dateInput = document.getElementById('in-date');
        const vendorInput = document.getElementById('in-vendor');
        const itemInput = document.getElementById('in-item');
        const barcodeInput = document.getElementById('in-barcode');
        const qtyInput = document.getElementById('in-qty');
        const priceInput = document.getElementById('in-price');
        
        if (!dateInput || !itemInput || !qtyInput || !priceInput) {
            showNotification('⚠️ Form elements not found!', 'error');
            return;
        }
        
        const date = dateInput.value;
        const vendor = vendorInput ? vendorInput.value : '';
        const item = itemInput.value.trim();
        const barcode = barcodeInput ? barcodeInput.value : '';
        const qty = Number(qtyInput.value);
        const price = Number(priceInput.value);
        
        if (!date) { showNotification("⚠️ Date select karein!", "warning"); return; }
        if (!item) { showNotification("⚠️ Item name lazmi hai!", "warning"); return; }
        if (qty <= 0 || isNaN(qty)) { showNotification("⚠️ Sahi quantity likhain!", "warning"); return; }
        if (price <= 0 || isNaN(price)) { showNotification("⚠️ Sahi price likhain!", "warning"); return; }
        
        // Check duplicate
        const duplicate = db.in.some(function(x) {
            return x.item === item && x.date === date && x.vendor === vendor && x.qty === qty && x.price === price;
        });
        if (duplicate) {
            showNotification("⚠️ Yeh entry pehle se mojud hai!", "warning");
            return;
        }
        
        // Generate unique ID
        const id = 'in_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // Save locally
        db.in.push({ 
            id: id, 
            date: date, 
            vendor: vendor || 'factory', 
            item: item, 
            barcode: barcode, 
            qty: qty, 
            price: price, 
            total: qty * price 
        });
        saveAndRefresh();
        
        // Clear form
        dateInput.value = '';
        if (itemInput) itemInput.value = '';
        if (qtyInput) qtyInput.value = '';
        if (priceInput) priceInput.value = '';
        if (barcodeInput) barcodeInput.value = '';
        
        showNotification("✅ Stock IN saved locally!", "success");
    } catch (err) {
        console.error('❌ addIn error:', err);
        showNotification('❌ Error saving stock IN: ' + err.message, 'error');
    }
}

// ==========================================
// STOCK OUT - 100% LOCALSTORAGE
// ==========================================
function addOut() {
    try {
        const dateInput = document.getElementById('out-date');
        const customerInput = document.getElementById('out-customer');
        const itemInput = document.getElementById('out-item');
        const barcodeInput = document.getElementById('out-barcode');
        const qtyInput = document.getElementById('out-qty');
        const priceInput = document.getElementById('out-price');
        
        if (!dateInput || !itemInput || !qtyInput || !priceInput || !customerInput) {
            showNotification('⚠️ Form elements not found!', 'error');
            return;
        }
        
        const item = itemInput.value.trim();
        const qty = Number(qtyInput.value);
        const date = dateInput.value;
        const price = Number(priceInput.value);
        const custName = customerInput.value.trim() || "General Sale";
        const barcode = barcodeInput ? barcodeInput.value : "";
        
        if (!date) { showNotification("⚠️ Date select karein!", "warning"); return; }
        if (!item) { showNotification("⚠️ Item name lazmi hai!", "warning"); return; }
        if (qty <= 0 || isNaN(qty)) { showNotification("⚠️ Sahi quantity likhain!", "warning"); return; }
        if (price <= 0 || isNaN(price)) { showNotification("⚠️ Sahi price likhain!", "warning"); return; }
        
        // Check stock availability
        const totalIn = db.in.filter(function(x) { return x.item === item; }).reduce(function(s, x) { return s + x.qty; }, 0);
        const totalOut = db.out.filter(function(x) { return x.item === item; }).reduce(function(s, x) { return s + x.qty; }, 0);
        const available = totalIn - totalOut;
        
        if (qty > available) {
            showNotification(`⚠️ Stock kam hai! Sirf ${available} mojud hain.`, "warning");
            return;
        }
        
        // Check duplicate
        const duplicate = db.out.some(function(x) {
            return x.item === item && x.date === date && x.cust === custName && x.qty === qty && x.price === price;
        });
        if (duplicate) {
            showNotification("⚠️ Yeh sale pehle se recorded hai!", "warning");
            return;
        }
        
        // Generate unique ID
        const id = 'out_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        // Save locally
        db.out.push({ 
            id: id, 
            item: item, 
            qty: qty, 
            date: date, 
            cust: custName, 
            barcode: barcode, 
            price: price, 
            total: qty * price 
        });
        saveAndRefresh();
        
        // Clear form
        if (qtyInput) qtyInput.value = "";
        if (customerInput) customerInput.value = "";
        if (barcodeInput) barcodeInput.value = "";
        const statusEl = document.getElementById('stock-status');
        if (statusEl) statusEl.innerHTML = "";
        
        showNotification("✅ Stock OUT saved locally!", "success");
    } catch (err) {
        console.error('❌ addOut error:', err);
        showNotification('❌ Error saving stock OUT: ' + err.message, 'error');
    }
}

// ==========================================
// LIVE STOCK CHECK
// ==========================================
function showLiveStock(itemName) {
    try {
        const status = document.getElementById('stock-status');
        if (!status) return;
        if (!itemName || !itemName.trim()) {
            status.innerHTML = "";
            return;
        }
        const totalIn = db.in.filter(function(x) { return x.item === itemName; }).reduce(function(s, x) { return s + x.qty; }, 0);
        const totalOut = db.out.filter(function(x) { return x.item === itemName; }).reduce(function(s, x) { return s + x.qty; }, 0);
        const balance = totalIn - totalOut;
        if (balance > 0) {
            status.style.color = "#27ae60";
            status.innerHTML = `✅ Available Stock: <strong>${balance}</strong>`;
        } else if (balance <= 0 && totalIn > 0) {
            status.style.color = "#e74c3c";
            status.innerHTML = `⚠️ Out of Stock! (Balance: ${balance})`;
        } else {
            status.style.color = "#7f8c8d";
            status.innerHTML = "ℹ️ No record found for this item.";
        }
    } catch (err) {
        console.error('❌ showLiveStock error:', err);
    }
}

// ==========================================
// RENDER ALL
// ==========================================
function renderAll() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // Today's IN
        const inBody = document.getElementById('today-list-in');
        if (inBody) {
            let html = "";
            let c = 1;
            db.in.forEach(function(x, i) {
                if (x.date === today) {
                    html += `<tr>
                        <td>${c++}</td>
                        <td>${escapeHtml(x.item)}</td>
                        <td>${escapeHtml(x.vendor)}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${(x.qty * (x.price || 0)).toLocaleString()}</td>
                        <td><button class="btn-action btn-delete" onclick="deleteEntry('in',${i})">Del</button></td>
                    </tr>`;
                }
            });
            inBody.innerHTML = html || `<tr><td colspan="7" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Aaj ki koi entry nahi hai...</td></tr>`;
        }
        
        // Today's OUT
        const outBody = document.getElementById('today-list-out');
        if (outBody) {
            let html = "";
            let c = 1;
            db.out.forEach(function(x, i) {
                if (x.date === today) {
                    html += `<tr>
                        <td>${c++}</td>
                        <td>${x.date}</td>
                        <td>${escapeHtml(x.cust)}</td>
                        <td>${escapeHtml(x.item)}</td>
                        <td>${x.barcode || 'N/A'}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${(x.qty * (x.price || 0)).toLocaleString()}</td>
                        <td><button class="btn-action btn-delete" onclick="deleteEntry('out',${i})">Del</button></td>
                    </tr>`;
                }
            });
            outBody.innerHTML = html || `<tr><td colspan="9" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Aaj ki koi sale nahi hai...</td></tr>`;
        }
        
        // Balance
        const balBody = document.getElementById('table-balance-body');
        if (balBody) {
            const items = [...new Set([...db.in.map(function(x) { return x.item; }), ...db.out.map(function(x) { return x.item; })])];
            balBody.innerHTML = items.map(function(name) {
                if (!name) return "";
                const tin = db.in.filter(function(x) { return x.item === name; }).reduce(function(s, x) { return s + x.qty; }, 0);
                const tout = db.out.filter(function(x) { return x.item === name; }).reduce(function(s, x) { return s + x.qty; }, 0);
                const inItem = db.in.find(function(x) { return x.item === name; });
                const outItem = db.out.find(function(x) { return x.item === name; });
                const pPrice = inItem ? inItem.price : 0;
                const sPrice = outItem ? outItem.price : 0;
                const bal = tin - tout;
                return `<tr>
                    <td>${inItem ? escapeHtml(inItem.barcode) : 'N/A'}</td>
                    <td style="font-weight:600;">${escapeHtml(name)}</td>
                    <td style="color:#2980b9;">${tin}</td>
                    <td style="color:#e67e22;">${tout}</td>
                    <td style="font-weight:bold;color:${bal<5?'#e74c3c':'#27ae60'};">${bal}</td>
                    <td style="color:#27ae60;font-weight:bold;">PKR ${((sPrice - pPrice) * tout).toLocaleString()}</td>
                </tr>`;
            }).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Koi item nahi hai</td></tr>`;
        }
        
        updateItemLists();
        updateDashboardStats();
    } catch (err) {
        console.error('❌ renderAll error:', err);
    }
}

// ==========================================
// HTML ESCAPE
// ==========================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// DASHBOARD STATS
// ==========================================
function updateDashboardStats() {
    try {
        const totalIn = db.in.reduce(function(s, x) { return s + x.qty; }, 0);
        const totalOut = db.out.reduce(function(s, x) { return s + x.qty; }, 0);
        const uniqueItems = [...new Set([...db.in.map(function(x) { return x.item; }), ...db.out.map(function(x) { return x.item; })])];
        const revenue = db.out.reduce(function(s, x) { return s + (x.qty * (x.price || 0)); }, 0);
        
        const el1 = document.getElementById('dash-total-in');
        const el2 = document.getElementById('dash-total-out');
        const el3 = document.getElementById('dash-unique-items');
        const el4 = document.getElementById('dash-revenue');
        if (el1) el1.textContent = totalIn;
        if (el2) el2.textContent = totalOut;
        if (el3) el3.textContent = uniqueItems.length;
        if (el4) el4.textContent = 'PKR ' + revenue.toLocaleString();
        
        // Recent Activity
        const act = document.getElementById('recent-activity');
        if (act) {
            const all = [
                ...db.in.map(function(x) { return Object.assign({}, x, { type: 'IN' }); }),
                ...db.out.map(function(x) { return Object.assign({}, x, { type: 'OUT' }); })
            ];
            all.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
            const recent = all.slice(0, 10);
            act.innerHTML = recent.length ? recent.map(function(x) {
                return `<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f0f0f0;">
                    <span><span style="font-weight:600;">${escapeHtml(x.item)}</span> <span style="color:${x.type==='IN'?'#27ae60':'#e74c3c'};font-weight:bold;">${x.type==='IN'?'📥 +':'📤 -'}${x.qty}</span></span>
                    <span style="color:#7f8c8d;font-size:12px;">${x.date}</span>
                </div>`;
            }).join('') : `<p style="color:#7f8c8d;text-align:center;padding:20px;">No activity yet</p>`;
        }
    } catch (err) {
        console.error('❌ updateDashboardStats error:', err);
    }
}

// ==========================================
// DELETE ENTRY - LOCALSTORAGE
// ==========================================
function deleteEntry(type, index) {
    try {
        if (!confirm("⚠️ Bilal Bhai, kya aap waqai ye record delete karna chahte hain?")) return;
        
        const record = db[type] && db[type][index];
        if (!record) {
            showNotification("⚠️ Record not found!", "error");
            return;
        }
        
        db[type].splice(index, 1);
        saveAndRefresh();
        showNotification("✅ Record deleted!", "success");
    } catch (err) {
        console.error('❌ deleteEntry error:', err);
        showNotification('❌ Error deleting record: ' + err.message, 'error');
    }
}

// ==========================================
// EDIT ENTRY - LOCALSTORAGE
// ==========================================
function editEntry(type, index) {
    try {
        const data = db[type] && db[type][index];
        if (!data) {
            showNotification("⚠️ Record not found!", "error");
            return;
        }
        
        const newQty = prompt("New Qty:", data.qty);
        if (newQty === null) return;
        const newPrice = prompt("New Price:", data.price);
        if (newPrice === null) return;
        
        const qtyNum = Number(newQty);
        const priceNum = Number(newPrice);
        if (isNaN(qtyNum) || qtyNum < 0) {
            showNotification("⚠️ Invalid quantity!", "warning");
            return;
        }
        if (isNaN(priceNum) || priceNum < 0) {
            showNotification("⚠️ Invalid price!", "warning");
            return;
        }
        
        db[type][index].qty = qtyNum;
        db[type][index].price = priceNum;
        db[type][index].total = qtyNum * priceNum;
        saveAndRefresh();
        generateMasterSearch();
        showNotification("✅ Updated successfully!", "success");
    } catch (err) {
        console.error('❌ editEntry error:', err);
        showNotification('❌ Error updating record: ' + err.message, 'error');
    }
}

// ==========================================
// MASTER SEARCH
// ==========================================
function generateMasterSearch() {
    try {
        const fromInput = document.getElementById('master-from');
        const toInput = document.getElementById('master-to');
        if (!fromInput || !toInput) {
            showNotification('⚠️ Search elements not found!', 'error');
            return;
        }
        
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) {
            showNotification("⚠️ Pehle Dates select karein!", "warning");
            return;
        }
        
        const fIn = db.in.filter(function(x) { return x.date >= from && x.date <= to; });
        const fOut = db.out.filter(function(x) { return x.date >= from && x.date <= to; });
        
        const inTable = document.getElementById("master-in-table");
        if (inTable) {
            inTable.innerHTML = fIn.map(function(x) {
                const idx = db.in.indexOf(x);
                return `<tr>
                    <td>${x.date}</td>
                    <td>${escapeHtml(x.item)}</td>
                    <td>${escapeHtml(x.vendor)}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editEntry('in',${idx})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteEntry('in',${idx})">Del</button>
                    </td>
                </tr>`;
            }).join('') || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d;">No records found</td></tr>`;
        }
        
        const outTable = document.getElementById("master-out-table");
        if (outTable) {
            outTable.innerHTML = fOut.map(function(x) {
                const idx = db.out.indexOf(x);
                return `<tr>
                    <td>${x.date}</td>
                    <td>${escapeHtml(x.item)}</td>
                    <td>${escapeHtml(x.cust)}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editEntry('out',${idx})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteEntry('out',${idx})">Del</button>
                    </td>
                </tr>`;
            }).join('') || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d;">No records found</td></tr>`;
        }
        showNotification(`✅ Found ${fIn.length + fOut.length} records`, "success");
    } catch (err) {
        console.error('❌ generateMasterSearch error:', err);
        showNotification('❌ Error searching records: ' + err.message, 'error');
    }
}

// ==========================================
// GENERATE REPORT
// ==========================================
function generateCustomReport() {
    try {
        const fromInput = document.getElementById('rep-from-date');
        const toInput = document.getElementById('rep-to-date');
        if (!fromInput || !toInput) {
            showNotification('⚠️ Report elements not found!', 'error');
            return;
        }
        
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) {
            showNotification("⚠️ Dono dates select karein!", "warning");
            return;
        }
        
        const periodEl = document.getElementById('report-period');
        if (periodEl) periodEl.innerText = `📅 Period: ${from} to ${to}`;
        
        const fIn = db.in.filter(function(x) { return x.date >= from && x.date <= to; });
        const fOut = db.out.filter(function(x) { return x.date >= from && x.date <= to; });
        
        const inTable = document.querySelector("#rep-in-table");
        if (inTable) {
            inTable.innerHTML = fIn.map(function(x) {
                return `<tr>
                    <td>${x.date}</td>
                    <td>${escapeHtml(x.item)}</td>
                    <td>${escapeHtml(x.vendor)}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total.toLocaleString()}</td>
                </tr>`;
            }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#7f8c8d;">No records</td></tr>`;
        }
        
        const outTable = document.querySelector("#rep-out-table");
        if (outTable) {
            outTable.innerHTML = fOut.map(function(x) {
                return `<tr>
                    <td>${x.date}</td>
                    <td>${escapeHtml(x.item)}</td>
                    <td>${escapeHtml(x.cust)}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total.toLocaleString()}</td>
                </tr>`;
            }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#7f8c8d;">No records</td></tr>`;
        }
        
        const tIn = fIn.reduce(function(s, x) { return s + x.total; }, 0);
        const tOut = fOut.reduce(function(s, x) { return s + x.total; }, 0);
        
        document.querySelectorAll('.report-summary').forEach(function(el) { el.remove(); });
        const summary = document.createElement('div');
        summary.className = 'report-summary';
        summary.style.cssText = 'display:flex;justify-content:space-around;background:#2c3e50;color:white;padding:15px;border-radius:8px;margin-top:20px;flex-wrap:wrap;gap:10px;';
        summary.innerHTML = `
            <span>📥 Total IN: PKR ${tIn.toLocaleString()}</span>
            <span>📤 Total OUT: PKR ${tOut.toLocaleString()}</span>
            <span style="color:${tOut-tIn>=0?'#2ecc71':'#e74c3c'};font-weight:bold;">💰 Profit: PKR ${(tOut-tIn).toLocaleString()}</span>
        `;
        const printArea = document.getElementById('print-area');
        if (printArea) printArea.appendChild(summary);
        showNotification("✅ Report generated!", "success");
    } catch (err) {
        console.error('❌ generateCustomReport error:', err);
        showNotification('❌ Error generating report: ' + err.message, 'error');
    }
}

// ==========================================
// CUSTOMER LEDGERS - LOCALSTORAGE
// ==========================================
function updateCustomerDropdown() {
    try {
        const list = document.getElementById('customer-list');
        if (!list) return;
        list.innerHTML = Object.keys(db.ledgers).map(function(name) {
            return `<option value="${escapeHtml(name)}">`;
        }).join('');
    } catch (err) {
        console.error('❌ updateCustomerDropdown error:', err);
    }
}

function saveLedgerEntry() {
    try {
        const nameInput = document.getElementById('ledger-cust-name');
        const dateInput = document.getElementById('led-date');
        const itemInput = document.getElementById('led-item');
        const ctnInput = document.getElementById('led-ctn');
        const debitInput = document.getElementById('led-debit');
        const creditInput = document.getElementById('led-credit');
        const methodInput = document.getElementById('led-method');
        
        if (!nameInput || !dateInput) {
            showNotification('⚠️ Form elements not found!', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const date = dateInput.value;
        const item = itemInput ? itemInput.value : '';
        const ctn = parseFloat(ctnInput ? ctnInput.value : 0) || 0;
        const debit = parseFloat(debitInput ? debitInput.value : 0) || 0;
        const credit = parseFloat(creditInput ? creditInput.value : 0) || 0;
        const method = methodInput ? methodInput.value : 'Cash';
        
        if (!name) { showNotification("⚠️ Customer Name lazmi hai!", "warning"); return; }
        if (!date) { showNotification("⚠️ Date lazmi hai!", "warning"); return; }
        if (debit === 0 && credit === 0) {
            showNotification("⚠️ Debit ya Credit value lazmi hai!", "warning");
            return;
        }
        
        if (!db.ledgers[name]) {
            db.ledgers[name] = [];
            db.opening_balances[name] = 0;
        }
        db.ledgers[name].push({ date: date, item: item, ctn: ctn, debit: debit, credit: credit, method: method });
        saveLocalData();
        updateCustomerDropdown();
        showLedger();
        if (itemInput) itemInput.value = "";
        if (ctnInput) ctnInput.value = "0";
        if (debitInput) debitInput.value = "0";
        if (creditInput) creditInput.value = "0";
        showNotification(`✅ Entry saved for ${name}!`, "success");
    } catch (err) {
        console.error('❌ saveLedgerEntry error:', err);
        showNotification('❌ Error saving ledger entry: ' + err.message, 'error');
    }
}

function updateOpeningBal() {
    try {
        const nameInput = document.getElementById('ledger-cust-name');
        const balInput = document.getElementById('opening-bal');
        if (!nameInput || !balInput) return;
        const name = nameInput.value.trim();
        const val = parseFloat(balInput.value) || 0;
        if (name) {
            db.opening_balances[name] = val;
            saveLocalData();
            showLedger();
        }
    } catch (err) {
        console.error('❌ updateOpeningBal error:', err);
    }
}

function showLedger() {
    try {
        const nameInput = document.getElementById('ledger-cust-name');
        const tbody = document.getElementById('ledger-table-body');
        if (!tbody || !nameInput) return;
        const name = nameInput.value.trim();
        const opening = parseFloat(db.opening_balances[name]) || 0;
        const balInput = document.getElementById('opening-bal');
        if (balInput) balInput.value = opening;
        tbody.innerHTML = "";
        const totalCtn = document.getElementById('total-ctn');
        const totalDebit = document.getElementById('total-debit');
        const totalCredit = document.getElementById('total-credit');
        const finalBalance = document.getElementById('final-balance');
        
        if (!name || !db.ledgers[name]) {
            if (totalCtn) totalCtn.textContent = "0";
            if (totalDebit) totalDebit.textContent = "0";
            if (totalCredit) totalCredit.textContent = "0";
            if (finalBalance) finalBalance.textContent = "💰 Balance: 0";
            return;
        }
        let tCtn = 0, tDebit = 0, tCredit = 0;
        db.ledgers[name].forEach(function(x, i) {
            tCtn += Number(x.ctn || 0);
            tDebit += Number(x.debit || 0);
            tCredit += Number(x.credit || 0);
            tbody.innerHTML += `<tr>
                <td>${i+1}</td>
                <td>${x.date}</td>
                <td>${escapeHtml(x.item)}</td>
                <td>${x.ctn}</td>
                <td>${x.debit.toLocaleString()}</td>
                <td>${x.credit.toLocaleString()}</td>
                <td>${escapeHtml(x.method)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editLedger('${escapeHtml(name)}',${i})">Edit</button>
                    <button class="btn-action btn-delete" onclick="delLedger('${escapeHtml(name)}',${i})">Del</button>
                </td>
            </tr>`;
        });
        if (totalCtn) totalCtn.textContent = tCtn;
        if (totalDebit) totalDebit.textContent = tDebit.toLocaleString();
        if (totalCredit) totalCredit.textContent = tCredit.toLocaleString();
        if (finalBalance) finalBalance.textContent = `💰 Balance: ${((opening + tDebit) - tCredit).toLocaleString()}`;
    } catch (err) {
        console.error('❌ showLedger error:', err);
    }
}

function delLedger(custName, index) {
    try {
        if (!confirm("⚠️ Kya ye entry delete kar dein?")) return;
        if (db.ledgers[custName] && db.ledgers[custName][index]) {
            db.ledgers[custName].splice(index, 1);
            if (db.ledgers[custName].length === 0) {
                delete db.ledgers[custName];
                delete db.opening_balances[custName];
            }
            saveLocalData();
            showLedger();
            showNotification("✅ Entry deleted!", "success");
        }
    } catch (err) {
        console.error('❌ delLedger error:', err);
        showNotification('❌ Error deleting entry: ' + err.message, 'error');
    }
}

function editLedger(custName, index) {
    try {
        const entry = db.ledgers[custName] && db.ledgers[custName][index];
        if (!entry) {
            showNotification("⚠️ Entry not found!", "error");
            return;
        }
        const nDebit = prompt("Naya Debit (Udhaar):", entry.debit);
        if (nDebit === null) return;
        const nCredit = prompt("Naya Credit (Wasuli):", entry.credit);
        if (nCredit === null) return;
        db.ledgers[custName][index].debit = Number(nDebit) || 0;
        db.ledgers[custName][index].credit = Number(nCredit) || 0;
        saveLocalData();
        showLedger();
        showNotification("✅ Updated!", "success");
    } catch (err) {
        console.error('❌ editLedger error:', err);
        showNotification('❌ Error updating entry: ' + err.message, 'error');
    }
}

// ==========================================
// RENT BOOK - LOCALSTORAGE
// ==========================================
function addRentEntry() {
    try {
        const nameInput = document.getElementById('rent-name');
        const shopInput = document.getElementById('rent-shop-no');
        const dateInput = document.getElementById('rent-date');
        const monthInput = document.getElementById('rent-month');
        const debitInput = document.getElementById('rent-debit');
        const creditInput = document.getElementById('rent-credit');
        const methodInput = document.getElementById('rent-method');
        
        if (!nameInput || !dateInput) {
            showNotification('⚠️ Form elements not found!', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const shop = shopInput ? shopInput.value : '';
        const date = dateInput.value;
        const month = monthInput ? monthInput.value : '';
        const debit = parseFloat(debitInput ? debitInput.value : 0) || 0;
        const credit = parseFloat(creditInput ? creditInput.value : 0) || 0;
        const method = methodInput ? methodInput.value : 'Cash';
        
        if (!name) { showNotification("⚠️ Customer Name lazmi hai!", "warning"); return; }
        if (!date) { showNotification("⚠️ Date lazmi hai!", "warning"); return; }
        if (debit === 0 && credit === 0) {
            showNotification("⚠️ Debit ya Credit value lazmi hai!", "warning");
            return;
        }
        
        const id = 'rent_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        dbRent.push({ id: id, name: name, shop: shop, date: date, month: month, debit: debit, credit: credit, method: method });
        saveLocalData();
        renderRentTable();
        showNotification(`✅ ${name} ki entry save ho gayi!`, "success");
    } catch (err) {
        console.error('❌ addRentEntry error:', err);
        showNotification('❌ Error saving rent entry: ' + err.message, 'error');
    }
}

function renderRentTable() {
    try {
        const tbody = document.getElementById('rent-main-rows');
        const nameInput = document.getElementById('rent-name');
        if (!tbody || !nameInput) return;
        
        const searchName = nameInput.value.trim();
        tbody.innerHTML = "";
        let tDebit = 0, tCredit = 0;
        
        let filtered = dbRent;
        if (searchName) {
            filtered = dbRent.filter(function(x) {
                return x.name.toLowerCase() === searchName.toLowerCase();
            });
        }
        
        if (filtered.length > 0) {
            filtered.forEach(function(r, i) {
                tDebit += r.debit;
                tCredit += r.credit;
                const globalIdx = dbRent.indexOf(r);
                tbody.innerHTML += `<tr>
                    <td>${escapeHtml(r.shop || 'N/A')}</td>
                    <td>${r.date}</td>
                    <td>${escapeHtml(r.month)}</td>
                    <td style="color:#e74c3c;font-weight:600;">${r.debit.toLocaleString()}</td>
                    <td style="color:#27ae60;font-weight:600;">${r.credit.toLocaleString()}</td>
                    <td>${escapeHtml(r.method)}</td>
                    <td><button class="btn-action btn-delete" onclick="deleteRentEntry(${globalIdx})">Del</button></td>
                </tr>`;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Naya Customer hai ya naam sahi nahi likha...</td></tr>`;
        }
        
        const totalDebit = document.getElementById('rent-total-debit');
        const totalCredit = document.getElementById('rent-total-credit');
        const finalBalance = document.getElementById('rent-final-balance');
        if (totalDebit) totalDebit.textContent = tDebit.toLocaleString();
        if (totalCredit) totalCredit.textContent = tCredit.toLocaleString();
        if (finalBalance) finalBalance.textContent = (tDebit - tCredit).toLocaleString();
    } catch (err) {
        console.error('❌ renderRentTable error:', err);
    }
}

function deleteRentEntry(index) {
    try {
        if (!confirm("⚠️ Kya ye entry delete kar dein?")) return;
        dbRent.splice(index, 1);
        saveLocalData();
        renderRentTable();
        showNotification("✅ Rent entry deleted!", "success");
    } catch (err) {
        console.error('❌ deleteRentEntry error:', err);
        showNotification('❌ Error deleting rent entry: ' + err.message, 'error');
    }
}

// ==========================================
// MULTI-USER MANAGEMENT
// ==========================================
function createNewUser() {
    try {
        const nameInput = document.getElementById('new-username');
        const idInput = document.getElementById('new-userid');
        const passInput = document.getElementById('new-password');
        const permCheckboxes = document.querySelectorAll('.perm:checked');
        
        if (!nameInput || !idInput || !passInput) {
            showNotification('⚠️ Form elements not found!', 'error');
            return;
        }
        
        const name = nameInput.value.trim();
        const id = idInput.value.trim();
        const pass = passInput.value.trim();
        const perms = [];
        permCheckboxes.forEach(function(cb) { perms.push(cb.value); });
        
        if (!name) { showNotification("⚠️ Bilal Bhai, naam likhain!", "warning"); return; }
        if (!id) { showNotification("⚠️ Bilal Bhai, user ID likhain!", "warning"); return; }
        if (!pass) { showNotification("⚠️ Bilal Bhai, password likhain!", "warning"); return; }
        
        if (extraUsers.some(function(u) { return u.id === id; })) {
            showNotification("⚠️ Ye user ID pehle se mojud hai!", "warning");
            return;
        }
        
        extraUsers.push({ id: id, pass: pass, name: name, perms: perms });
        saveLocalData();
        loadUserTable();
        if (nameInput) nameInput.value = '';
        if (idInput) idInput.value = '';
        if (passInput) passInput.value = '';
        permCheckboxes.forEach(function(cb) { cb.checked = false; });
        showNotification(`✅ New user "${name}" created!`, "success");
    } catch (err) {
        console.error('❌ createNewUser error:', err);
        showNotification('❌ Error creating user: ' + err.message, 'error');
    }
}

function loadUserTable() {
    try {
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;
        tbody.innerHTML = extraUsers.map(function(u, i) {
            return `<tr>
                <td>${escapeHtml(u.id)}</td>
                <td>${escapeHtml(u.name)}</td>
                <td><small>${escapeHtml(u.perms.join(', '))}</small></td>
                <td><button class="btn-action btn-delete" onclick="deleteExtraUser(${i})">Del</button></td>
            </tr>`;
        }).join('') || `<tr><td colspan="4" style="text-align:center;padding:20px;color:#7f8c8d;">No users created yet</td></tr>`;
    } catch (err) {
        console.error('❌ loadUserTable error:', err);
    }
}

function deleteExtraUser(index) {
    try {
        if (!confirm("⚠️ Kya aap is user ko delete karna chahte hain?")) return;
        extraUsers.splice(index, 1);
        saveLocalData();
        loadUserTable();
        showNotification("✅ User deleted!", "success");
    } catch (err) {
        console.error('❌ deleteExtraUser error:', err);
        showNotification('❌ Error deleting user: ' + err.message, 'error');
    }
}

// ==========================================
// SIDEBAR TOGGLE
// ==========================================
function toggleSidebar() {
    try {
        const sb = document.getElementById('sidebar');
        const mc = document.getElementById('main-content');
        if (!sb || !mc) return;
        const currentLeft = sb.style.left || '';
        if (currentLeft === "0px" || currentLeft === "") {
            sb.style.left = "-260px";
            mc.style.marginLeft = "0";
        } else {
            sb.style.left = "0px";
            mc.style.marginLeft = "260px";
        }
    } catch (err) {
        console.error('❌ toggleSidebar error:', err);
    }
}

// ==========================================
// SWITCH PAGE
// ==========================================
function switchPage(pageId, title) {
    try {
        document.querySelectorAll('.erp-page').forEach(function(p) {
            p.style.display = 'none';
        });
        const page = document.getElementById(pageId);
        if (page) page.style.display = 'block';
        
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-chart-line" style="color:#f1c40f; margin-right:12px;"></i>KRT TRADERS ERP - ${title}`;
        }
        
        if (window.innerWidth <= 768) {
            const sb = document.getElementById('sidebar');
            const mc = document.getElementById('main-content');
            if (sb) sb.style.left = "-260px";
            if (mc) mc.style.marginLeft = "0";
        }
        resetIdleTimer();
    } catch (err) {
        console.error('❌ switchPage error:', err);
    }
}

// ==========================================
// LOGOUT
// ==========================================
function logout() {
    try {
        if (!confirm("🚪 Bilal Bhai, kya aap waqai logout karna chahte hain?")) return;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        if (idleTimer) clearTimeout(idleTimer);
        if (idleInterval) clearInterval(idleInterval);
        const overlay = document.getElementById('idle-overlay');
        if (overlay) overlay.style.display = 'none';
        isIdle = false;
        location.reload();
    } catch (err) {
        console.error('❌ logout error:', err);
        location.reload();
    }
}

// ==========================================
// PRINT SECTION
// ==========================================
function printSection() {
    try {
        if (!db || !db.in) {
            showNotification("⚠️ Pehle data mukammal load hone dein!", "warning");
            return;
        }
        window.print();
    } catch (err) {
        console.error('❌ printSection error:', err);
        showNotification('❌ Error printing: ' + err.message, 'error');
    }
}

// ==========================================
// UPDATE ITEM LISTS
// ==========================================
function updateItemLists() {
    try {
        const list = document.getElementById('items-list');
        if (!list) return;
        const items = [...new Set([...db.in.map(function(x) { return x.item; }), ...db.out.map(function(x) { return x.item; })])];
        list.innerHTML = items.map(function(name) {
            return `<option value="${escapeHtml(name)}">`;
        }).join('');
    } catch (err) {
        console.error('❌ updateItemLists error:', err);
    }
}

// ==========================================
// SYNC FUNCTION (Now just reloads from localStorage)
// ==========================================
function syncAllCloudData() {
    loadLocalData();
    renderAll();
    renderRentTable();
    updateDashboardStats();
    updateItemLists();
    updateCustomerDropdown();
    loadUserTable();
    showNotification('✅ Data reloaded from localStorage!', 'success');
}

// ==========================================
// APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Setup idle detection
        setupIdleDetection();
        
        // Load all data
        loadLocalData();
        
        // Initial render
        renderAll();
        renderRentTable();
        loadUserTable();
        updateCustomerDropdown();
        updateItemLists();
        
        // Check login status
        const loggedIn = localStorage.getItem('isLoggedIn');
        const role = localStorage.getItem('userRole');
        
        if (loggedIn === 'true') {
            if (role === 'admin') showSystem('admin');
            else if (role === 'staff') showSystem('staff');
            else if (role === 'manager') showSystem('manager');
        }
        
        console.log("🚀 KRT TRADERS ERP v5.0 Loaded! (100% LocalStorage)");
        console.log("📦 Developed by Bilal Suleman");
        console.log("🐘 Elephant Never Forgets!");
    } catch (err) {
        console.error('❌ Startup error:', err);
        showNotification('⚠️ Error loading app: ' + err.message, 'error');
    }
});

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    try {
        const rentName = document.getElementById('rent-name');
        if (rentName) {
            rentName.addEventListener('input', renderRentTable);
        }
        
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                syncAllCloudData();
            }
            if (e.key === 'Escape') {
                const sb = document.getElementById('sidebar');
                if (sb && sb.style.left === "0px") {
                    toggleSidebar();
                }
            }
        });
        
        const passInput = document.getElementById('pass');
        if (passInput) {
            passInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    login();
                }
            });
        }
        const userInput = document.getElementById('user');
        if (userInput) {
            userInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    document.getElementById('pass').focus();
                }
            });
        }
        
        console.log('✅ Event listeners setup complete');
    } catch (err) {
        console.error('❌ Failed to setup event listeners:', err);
    }
});
