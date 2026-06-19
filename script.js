// ==========================================
// KRT TRADERS ERP - COMPLETE SCRIPT
// Developed by Bilal Suleman
// ==========================================

// ==========================================
// SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ==========================================
// GLOBAL DATABASE OBJECTS
// ==========================================
let db = JSON.parse(localStorage.getItem('krt_erp_data')) || { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = JSON.parse(localStorage.getItem('krt_rent_data')) || [];
let extraUsers = JSON.parse(localStorage.getItem('krt_extra_users')) || [];

// ==========================================
// IDLE SCREEN SYSTEM
// ==========================================
const IDLE_TIMEOUT = 30000;
let idleTimer = null;
let isIdle = false;
let idleSeconds = 0;
let idleInterval = null;

// Create Idle Overlay
function createIdleOverlay() {
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
    document.getElementById('idle-touch-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        dismissIdleScreen();
    });
    
    generateIdleParticles();
    generateIdleEmojis();
}

function generateIdleParticles() {
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
}

function generateIdleEmojis() {
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
}

function showIdleScreen() {
    if (isIdle) return;
    if (document.getElementById('login-screen').style.display !== 'none') return;
    if (document.getElementById('welcome-overlay').style.display !== 'none') return;
    
    isIdle = true;
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) { createIdleOverlay(); return showIdleScreen(); }
    
    idleSeconds = 0;
    document.getElementById('idle-timer').textContent = '00:00';
    overlay.style.display = 'flex';
    overlay.style.animation = 'idleIn 0.8s ease';
    document.getElementById('idle-status').textContent = '🔴 IDLE';
    
    generateIdleParticles();
    generateIdleEmojis();
    
    if (idleInterval) clearInterval(idleInterval);
    idleInterval = setInterval(() => {
        idleSeconds++;
        const m = String(Math.floor(idleSeconds/60)).padStart(2,'0');
        const s = String(idleSeconds%60).padStart(2,'0');
        document.getElementById('idle-timer').textContent = `${m}:${s}`;
    }, 1000);
}

function dismissIdleScreen() {
    if (!isIdle) return;
    isIdle = false;
    const overlay = document.getElementById('idle-overlay');
    if (overlay) {
        overlay.style.animation = 'idleOut 0.5s ease forwards';
        setTimeout(() => { overlay.style.display = 'none'; overlay.style.animation = ''; }, 500);
    }
    if (idleInterval) { clearInterval(idleInterval); idleInterval = null; }
    document.getElementById('idle-status').textContent = '🟢 ACTIVE';
    resetIdleTimer();
}

function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (isIdle) return;
    idleTimer = setTimeout(showIdleScreen, IDLE_TIMEOUT);
}

function setupIdleDetection() {
    createIdleOverlay();
    const events = ['mousedown','mousemove','keypress','scroll','touchstart','click','wheel','touchmove'];
    events.forEach(e => document.addEventListener(e, resetIdleTimer));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) resetIdleTimer(); });
    resetIdleTimer();
}
document.addEventListener('DOMContentLoaded', setupIdleDetection);

// ==========================================
// LOGIN SYSTEM
// ==========================================
function login() {
    const u = document.getElementById('user').value.trim().toLowerCase();
    const p = document.getElementById('pass').value.trim();
    
    if (u === "admin" && p === "123") {
        localStorage.setItem('isLoggedIn','true'); localStorage.setItem('userRole','admin');
        showSystem("admin");
    } else if (u === "ali" && p === "123") {
        localStorage.setItem('isLoggedIn','true'); localStorage.setItem('userRole','staff');
        showSystem("staff");
    } else if (u === "sattar" && p === "123") {
        localStorage.setItem('isLoggedIn','true'); localStorage.setItem('userRole','manager');
        showSystem("manager");
    } else {
        const found = extraUsers.find(user => user.id === u && user.pass === p);
        if (found) {
            localStorage.setItem('isLoggedIn','true'); localStorage.setItem('userRole','extra');
            showSystem(found);
            document.getElementById('toggle-btn').style.display = "block";
        } else {
            alert("❌ Ghalat ID ya Password!");
            document.querySelector('#login-screen .login-box').style.animation = 'shake 0.5s ease';
            setTimeout(() => document.querySelector('#login-screen .login-box').style.animation = '', 500);
        }
    }
}

// ==========================================
// SHOW SYSTEM
// ==========================================
function showSystem(roleOrUser) {
    document.getElementById('login-screen').style.display = "none";
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('main-content').style.display = "block";
    document.getElementById('toggle-btn').style.display = "block";
    
    if (typeof roleOrUser === "object") {
        applyDynamicPermissions(roleOrUser);
    } else {
        const items = document.querySelectorAll('#sidebar ul li');
        items.forEach(item => item.style.display = "flex");
        if (roleOrUser === "staff") {
            items.forEach(item => {
                const t = item.innerText;
                if (!t.includes("Dashboard") && !t.includes("Daily Report") && !t.includes("Stock Balance") && !t.includes("Logout")) {
                    item.style.display = "none";
                }
            });
            switchPage('page-Report','DAILY REPORT');
        } else if (roleOrUser === "manager") {
            items.forEach(item => {
                const t = item.innerText;
                if (!t.includes("Dashboard") && !t.includes("Customer Ledgers") && !t.includes("Market Rent Book") && !t.includes("Stock Balance") && !t.includes("Logout")) {
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
}

function applyDynamicPermissions(user) {
    const items = document.querySelectorAll('#sidebar ul li');
    items.forEach(item => {
        const onclick = item.getAttribute('onclick') || "";
        if (onclick.includes('page-dashboard') || onclick.includes('logout')) { item.style.display = "flex"; return; }
        item.style.display = user.perms.some(p => onclick.includes(p)) ? "flex" : "none";
    });
    renderAll();
}

// ==========================================
// CLOUD DATA
// ==========================================
async function fetchCloudData() {
    try {
        const { data, error } = await _supabase.from('KRT').select('*').order('id', { ascending: true });
        if (error) { console.error("Supabase Error:", error.message); return; }
        if (!data || data.length === 0) return;
        
        db.in = []; db.out = [];
        data.forEach(row => {
            const inQty = Number(row.stock_in || 0);
            const outQty = Number(row.stock_out || 0);
            const price = Number(row.price || 0);
            const date = (row.Date || row.date || row.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0];
            
            if (inQty > 0) {
                db.in.push({ id: row.id, date, vendor: row.vendor_name || 'factory', item: row.item_name || 'Unknown', qty: inQty, price, total: inQty * price });
            } else if (outQty > 0) {
                db.out.push({ id: row.id, date, cust: row.customer_name || 'General Sale', item: row.item_name || 'Unknown', qty: outQty, price, total: outQty * price });
            }
        });
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        renderAll();
        updateDashboardStats();
        console.log("✅ Cloud sync complete!");
    } catch (err) { console.error("❌ Fetch Error:", err); }
}

async function fetchCloudRentData() {
    try {
        const { data, error } = await _supabase.from('KRT_RENT').select('*').order('id', { ascending: true });
        if (error) { console.error("Rent Fetch Error:", error); return; }
        if (!data) return;
        dbRent = data.map(row => ({ id: row.id, name: row.name, shop: row.shop, date: row.date, month: row.month, debit: Number(row.debit||0), credit: Number(row.credit||0), method: row.method }));
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        renderRentTable();
        console.log("✅ Rent cloud sync done!");
    } catch (err) { console.error("❌ Rent Sync Error:", err); }
}

async function syncAllCloudData() {
    if (!navigator.onLine) { showNotification("⚠️ Internet nahi hai! Offline mode.", "warning"); return; }
    showNotification("☁️ Cloud sync shuru...", "info");
    try {
        await fetchCloudData();
        await fetchCloudRentData();
        updateItemLists();
        updateCustomerDropdown();
        loadUserTable();
        showNotification("✅ Cloud sync complete!", "success");
    } catch (err) {
        showNotification("❌ Sync failed: " + err.message, "error");
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = "info") {
    const colors = { success: "#27ae60", error: "#e74c3c", warning: "#f39c12", info: "#3498db" };
    const div = document.createElement('div');
    div.className = `toast-notification ${type}`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.classList.add('show'), 50);
    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 500);
    }, 4000);
}

// ==========================================
// STOCK IN
// ==========================================
async function addIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value;
    const item = document.getElementById('in-item').value.trim();
    const barcode = document.getElementById('in-barcode').value;
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value);
    
    if (!date || !item || qty <= 0) { showNotification("⚠️ Bilal Bhai, details lazmi likhain!", "warning"); return; }
    
    try {
        const { data, error } = await _supabase.from('KRT').insert([{ Date: date, item_name: item, stock_in: qty, stock_out: 0, price, vendor_name: vendor }]).select();
        if (error) { showNotification("❌ Cloud sync fail: " + error.message, "error"); return; }
        if (data && data.length > 0) {
            db.in.push({ id: data[0].id, date, vendor: vendor || 'factory', item, barcode, qty, price, total: qty * price });
            saveAndRefresh();
            document.getElementById('in-item').value = "";
            document.getElementById('in-qty').value = "";
            document.getElementById('in-price').value = "";
            document.getElementById('in-barcode').value = "";
            showNotification("✅ Stock IN saved to cloud!", "success");
        }
    } catch (err) { showNotification("❌ Internet ka masla hai!", "error"); }
}

// ==========================================
// STOCK OUT
// ==========================================
async function addOut() {
    const item = document.getElementById('out-item').value.trim();
    const qty = Number(document.getElementById('out-qty').value);
    const date = document.getElementById('out-date').value;
    const price = Number(document.getElementById('out-price')?.value || 0);
    const custName = document.getElementById('out-customer')?.value || "General Sale";
    const barcode = document.getElementById('out-barcode')?.value || "";
    
    if (!item || qty <= 0 || !date) { showNotification("⚠️ Bilal Bhai, saari details bharein!", "warning"); return; }
    
    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const available = tin - tout;
    if (qty > available) { showNotification(`⚠️ Stock kam hai! Sirf ${available} mojud hain.`, "warning"); return; }
    
    try {
        const { data, error } = await _supabase.from('KRT').insert([{ Date: date, item_name: item, stock_in: 0, stock_out: qty, price, customer_name: custName }]).select();
        if (error) { showNotification("❌ Cloud sync fail: " + error.message, "error"); return; }
        if (data && data.length > 0) {
            db.out.push({ id: data[0].id, item, qty, date, cust: custName, barcode, price, total: qty * price });
            saveAndRefresh();
            document.getElementById('out-qty').value = "";
            document.getElementById('out-customer').value = "";
            document.getElementById('out-barcode').value = "";
            document.getElementById('stock-status').innerText = "";
            showNotification("✅ Stock OUT saved to cloud!", "success");
        }
    } catch (err) { showNotification("❌ Internet ka masla hai!", "error"); }
}

// ==========================================
// LIVE STOCK CHECK
// ==========================================
function showLiveStock(itemName) {
    const status = document.getElementById('stock-status');
    if (!itemName || !itemName.trim()) { status.innerHTML = ""; return; }
    const totalIn = db.in.filter(x => x.item === itemName).reduce((s, x) => s + x.qty, 0);
    const totalOut = db.out.filter(x => x.item === itemName).reduce((s, x) => s + x.qty, 0);
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
}

// ==========================================
// RENDER ALL
// ==========================================
function renderAll() {
    const today = new Date().toISOString().split('T')[0];
    
    // Today's IN
    const inBody = document.getElementById('today-list-in');
    if (inBody) {
        let html = ""; let c = 1;
        db.in.forEach((x, i) => {
            if (x.date === today) {
                html += `<tr><td>${c++}</td><td>${x.item}</td><td>${x.vendor}</td><td>${x.qty}</td><td>${x.price.toLocaleString()}</td><td>${x.total.toLocaleString()}</td><td><button class="btn-action btn-delete" onclick="deleteEntry('in',${i})">Del</button></td></tr>`;
            }
        });
        inBody.innerHTML = html || `<tr><td colspan="7" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Aaj ki koi entry nahi hai...</td></tr>`;
    }
    
    // Today's OUT
    const outBody = document.getElementById('today-list-out');
    if (outBody) {
        let html = ""; let c = 1;
        db.out.forEach((x, i) => {
            if (x.date === today) {
                html += `<tr><td>${c++}</td><td>${x.date}</td><td>${x.cust}</td><td>${x.item}</td><td>${x.barcode||'N/A'}</td><td>${x.qty}</td><td>${x.price.toLocaleString()}</td><td>${x.total.toLocaleString()}</td><td><button class="btn-action btn-delete" onclick="deleteEntry('out',${i})">Del</button></td></tr>`;
            }
        });
        outBody.innerHTML = html || `<tr><td colspan="9" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Aaj ki koi sale nahi hai...</td></tr>`;
    }
    
    // Balance
    const balBody = document.getElementById('table-balance-body');
    if (balBody) {
        const items = [...new Set([...db.in.map(x=>x.item), ...db.out.map(x=>x.item)])];
        balBody.innerHTML = items.map(name => {
            if (!name) return "";
            const tin = db.in.filter(x=>x.item===name).reduce((s,x)=>s+x.qty,0);
            const tout = db.out.filter(x=>x.item===name).reduce((s,x)=>s+x.qty,0);
            const pPrice = db.in.find(x=>x.item===name)?.price || 0;
            const sPrice = db.out.find(x=>x.item===name)?.price || 0;
            const bal = tin - tout;
            return `<tr><td>${db.in.find(x=>x.item===name)?.barcode||'N/A'}</td><td style="font-weight:600;">${name}</td><td style="color:#2980b9;">${tin}</td><td style="color:#e67e22;">${tout}</td><td style="font-weight:bold;color:${bal<5?'#e74c3c':'#27ae60'};">${bal}</td><td style="color:#27ae60;font-weight:bold;">PKR ${((sPrice-pPrice)*tout).toLocaleString()}</td></tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Koi item nahi hai</td></tr>`;
    }
    
    updateItemLists();
    updateDashboardStats();
}

// ==========================================
// DASHBOARD STATS
// ==========================================
function updateDashboardStats() {
    document.getElementById('dash-total-in').textContent = db.in.reduce((s,x)=>s+x.qty,0);
    document.getElementById('dash-total-out').textContent = db.out.reduce((s,x)=>s+x.qty,0);
    document.getElementById('dash-unique-items').textContent = [...new Set([...db.in.map(x=>x.item),...db.out.map(x=>x.item)])].length;
    document.getElementById('dash-revenue').textContent = 'PKR ' + db.out.reduce((s,x)=>s+x.total,0).toLocaleString();
    
    // Recent Activity
    const act = document.getElementById('recent-activity');
    if (act) {
        const all = [...db.in.map(x=>({...x,type:'IN'})), ...db.out.map(x=>({...x,type:'OUT'}))];
        all.sort((a,b)=>new Date(b.date)-new Date(a.date));
        const recent = all.slice(0,10);
        act.innerHTML = recent.length ? recent.map(x => `
            <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f0f0f0;">
                <span><span style="font-weight:600;">${x.item}</span> <span style="color:${x.type==='IN'?'#27ae60':'#e74c3c'};font-weight:bold;">${x.type==='IN'?'📥 +':'📤 -'}${x.qty}</span></span>
                <span style="color:#7f8c8d;font-size:12px;">${x.date}</span>
            </div>
        `).join('') : `<p style="color:#7f8c8d;text-align:center;padding:20px;">No activity yet</p>`;
    }
}

// ==========================================
// DELETE ENTRY
// ==========================================
async function deleteEntry(type, index) {
    if (!confirm("⚠️ Bilal Bhai, kya aap waqai ye record delete karna chahte hain?")) return;
    const record = db[type][index];
    if (record && record.id) {
        try {
            const { error } = await _supabase.from('KRT').delete().eq('id', record.id);
            if (error) { showNotification("❌ Cloud delete fail: " + error.message, "error"); return; }
        } catch (err) { showNotification("❌ Internet ka masla hai!", "error"); return; }
    }
    db[type].splice(index, 1);
    saveAndRefresh();
    showNotification("✅ Record deleted from cloud & local!", "success");
}

// ==========================================
// EDIT ENTRY
// ==========================================
async function editEntry(type, index) {
    const data = db[type][index];
    const newQty = prompt("New Qty:", data.qty);
    if (newQty === null) return;
    const newPrice = prompt("New Price:", data.price);
    if (newPrice === null) return;
    try {
        const { error } = await _supabase.from('KRT').update({
            stock_in: type === 'in' ? Number(newQty) : 0,
            stock_out: type === 'out' ? Number(newQty) : 0,
            price: Number(newPrice)
        }).eq('id', data.id);
        if (error) { showNotification("❌ Update failed: " + error.message, "error"); return; }
        db[type][index].qty = Number(newQty);
        db[type][index].price = Number(newPrice);
        db[type][index].total = Number(newQty) * Number(newPrice);
        saveAndRefresh();
        generateMasterSearch();
        showNotification("✅ Updated successfully!", "success");
    } catch (err) { showNotification("❌ Internet issue!", "error"); }
}

// ==========================================
// MASTER SEARCH
// ==========================================
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;
    if (!from || !to) { showNotification("⚠️ Pehle Dates select karein!", "warning"); return; }
    
    const fIn = db.in.filter(x => x.date >= from && x.date <= to);
    const fOut = db.out.filter(x => x.date >= from && x.date <= to);
    
    const inTable = document.querySelector("#master-in-table");
    if (inTable) {
        inTable.innerHTML = fIn.map((x) => {
            const idx = db.in.indexOf(x);
            return `<tr><td>${x.date}</td><td>${x.item}</td><td>${x.vendor}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td><td><button class="btn-action btn-edit" onclick="editEntry('in',${idx})">Edit</button><button class="btn-action btn-delete" onclick="deleteEntry('in',${idx})">Del</button></td></tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d;">No records found</td></tr>`;
    }
    
    const outTable = document.querySelector("#master-out-table");
    if (outTable) {
        outTable.innerHTML = fOut.map((x) => {
            const idx = db.out.indexOf(x);
            return `<tr><td>${x.date}</td><td>${x.item}</td><td>${x.cust}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td><td><button class="btn-action btn-edit" onclick="editEntry('out',${idx})">Edit</button><button class="btn-action btn-delete" onclick="deleteEntry('out',${idx})">Del</button></td></tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#7f8c8d;">No records found</td></tr>`;
    }
    showNotification(`✅ Found ${fIn.length + fOut.length} records`, "success");
}

// ==========================================
// GENERATE REPORT
// ==========================================
function generateCustomReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;
    if (!from || !to) { showNotification("⚠️ Dono dates select karein!", "warning"); return; }
    
    document.getElementById('report-period').innerText = `📅 Period: ${from} to ${to}`;
    const fIn = db.in.filter(x => x.date >= from && x.date <= to);
    const fOut = db.out.filter(x => x.date >= from && x.date <= to);
    
    document.querySelector("#rep-in-table").innerHTML = fIn.map(x => `<tr><td>${x.date}</td><td>${x.item}</td><td>${x.vendor}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total.toLocaleString()}</td></tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#7f8c8d;">No records</td></tr>`;
    document.querySelector("#rep-out-table").innerHTML = fOut.map(x => `<tr><td>${x.date}</td><td>${x.item}</td><td>${x.cust}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total.toLocaleString()}</td></tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#7f8c8d;">No records</td></tr>`;
    
    const tIn = fIn.reduce((s,x)=>s+x.total,0);
    const tOut = fOut.reduce((s,x)=>s+x.total,0);
    
    // Remove old summary
    document.querySelectorAll('.report-summary').forEach(el => el.remove());
    const summary = document.createElement('div');
    summary.className = 'report-summary';
    summary.style.cssText = 'display:flex;justify-content:space-around;background:#2c3e50;color:white;padding:15px;border-radius:8px;margin-top:20px;flex-wrap:wrap;gap:10px;';
    summary.innerHTML = `<span>📥 Total IN: PKR ${tIn.toLocaleString()}</span><span>📤 Total OUT: PKR ${tOut.toLocaleString()}</span><span style="color:${tOut-tIn>=0?'#2ecc71':'#e74c3c'};font-weight:bold;">💰 Profit: PKR ${(tOut-tIn).toLocaleString()}</span>`;
    document.getElementById('print-area').appendChild(summary);
    showNotification("✅ Report generated!", "success");
}

// ==========================================
// CUSTOMER LEDGERS
// ==========================================
function updateCustomerDropdown() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    list.innerHTML = Object.keys(db.ledgers).map(name => `<option value="${name}">`).join('');
}

function saveLedgerEntry() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const date = document.getElementById('led-date').value;
    const item = document.getElementById('led-item').value;
    const ctn = parseFloat(document.getElementById('led-ctn').value) || 0;
    const debit = parseFloat(document.getElementById('led-debit').value) || 0;
    const credit = parseFloat(document.getElementById('led-credit').value) || 0;
    const method = document.getElementById('led-method').value;
    if (!name || !date) { showNotification("⚠️ Customer Name aur Date lazmi hai!", "warning"); return; }
    if (!db.ledgers[name]) { db.ledgers[name] = []; db.opening_balances[name] = 0; }
    db.ledgers[name].push({ date, item, ctn, debit, credit, method });
    saveAndRefresh();
    updateCustomerDropdown();
    showLedger();
    document.getElementById('led-item').value = "";
    document.getElementById('led-ctn').value = "0";
    document.getElementById('led-debit').value = "0";
    document.getElementById('led-credit').value = "0";
    showNotification(`✅ Entry saved for ${name}!`, "success");
}

function updateOpeningBal() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const val = parseFloat(document.getElementById('opening-bal').value) || 0;
    if (name) { db.opening_balances[name] = val; saveAndRefresh(); showLedger(); }
}

function showLedger() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;
    const opening = parseFloat(db.opening_balances[name]) || 0;
    document.getElementById('opening-bal').value = opening;
    tbody.innerHTML = "";
    if (!name || !db.ledgers[name]) {
        document.getElementById('total-ctn').textContent = "0";
        document.getElementById('total-debit').textContent = "0";
        document.getElementById('total-credit').textContent = "0";
        document.getElementById('final-balance').textContent = "💰 Balance: 0";
        return;
    }
    let tCtn=0, tDebit=0, tCredit=0;
    db.ledgers[name].forEach((x, i) => {
        tCtn += Number(x.ctn||0); tDebit += Number(x.debit||0); tCredit += Number(x.credit||0);
        tbody.innerHTML += `<tr><td>${i+1}</td><td>${x.date}</td><td>${x.item}</td><td>${x.ctn}</td><td>${x.debit.toLocaleString()}</td><td>${x.credit.toLocaleString()}</td><td>${x.method}</td><td><button class="btn-action btn-edit" onclick="editLedger('${name}',${i})">Edit</button><button class="btn-action btn-delete" onclick="delLedger('${name}',${i})">Del</button></td></tr>`;
    });
    document.getElementById('total-ctn').textContent = tCtn;
    document.getElementById('total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('total-credit').textContent = tCredit.toLocaleString();
    document.getElementById('final-balance').textContent = `💰 Balance: ${((opening+tDebit)-tCredit).toLocaleString()}`;
}

function delLedger(custName, index) {
    if (!confirm("⚠️ Kya ye entry delete kar dein?")) return;
    db.ledgers[custName].splice(index, 1);
    saveAndRefresh();
    showLedger();
    showNotification("✅ Entry deleted!", "success");
}

function editLedger(custName, index) {
    const entry = db.ledgers[custName][index];
    const nDebit = prompt("Naya Debit (Udhaar):", entry.debit);
    const nCredit = prompt("Naya Credit (Wasuli):", entry.credit);
    if (nDebit !== null && nCredit !== null) {
        db.ledgers[custName][index].debit = Number(nDebit);
        db.ledgers[custName][index].credit = Number(nCredit);
        saveAndRefresh();
        showLedger();
        showNotification("✅ Updated!", "success");
    }
}

// ==========================================
// RENT BOOK
// ==========================================
function addRentEntry() {
    const name = document.getElementById('rent-name').value.trim();
    const shop = document.getElementById('rent-shop-no').value;
    const date = document.getElementById('rent-date').value;
    const month = document.getElementById('rent-month').value;
    const debit = parseFloat(document.getElementById('rent-debit').value) || 0;
    const credit = parseFloat(document.getElementById('rent-credit').value) || 0;
    const method = document.getElementById('rent-method').value;
    if (!name || !date) { showNotification("⚠️ Customer Name aur Date lazmi likhain!", "warning"); return; }
    dbRent.push({ name, shop, date, month, debit, credit, method });
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
    renderRentTable();
    showNotification(`✅ ${name} ki entry save ho gayi!`, "success");
}

function renderRentTable() {
    const tbody = document.getElementById('rent-main-rows');
    const searchName = document.getElementById('rent-name').value.trim();
    if (!tbody) return;
    tbody.innerHTML = "";
    let tDebit=0, tCredit=0;
    const filtered = dbRent.filter(x => x.name.toLowerCase() === searchName.toLowerCase());
    if (filtered.length > 0) {
        filtered.forEach((r, i) => {
            tDebit += r.debit; tCredit += r.credit;
            tbody.innerHTML += `<tr><td>${r.shop||'N/A'}</td><td>${r.date}</td><td>${r.month}</td><td style="color:#e74c3c;font-weight:600;">${r.debit.toLocaleString()}</td><td style="color:#27ae60;font-weight:600;">${r.credit.toLocaleString()}</td><td>${r.method}</td><td><button class="btn-action btn-delete" onclick="deleteRentEntry(${i})">Del</button></td></tr>`;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#7f8c8d;">📭 Naya Customer hai ya naam sahi nahi likha...</td></tr>`;
    }
    document.getElementById('rent-total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('rent-total-credit').textContent = tCredit.toLocaleString();
    document.getElementById('rent-final-balance').textContent = (tDebit - tCredit).toLocaleString();
}

function deleteRentEntry(index) {
    if (!confirm("⚠️ Kya ye entry delete kar dein?")) return;
    dbRent.splice(index, 1);
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
    renderRentTable();
    showNotification("✅ Rent entry deleted!", "success");
}

// ==========================================
// MULTI-USER MANAGEMENT
// ==========================================
function createNewUser() {
    const name = document.getElementById('new-username').value;
    const id = document.getElementById('new-userid').value;
    const pass = document.getElementById('new-password').value;
    const perms = [];
    document.querySelectorAll('.perm:checked').forEach(cb => perms.push(cb.value));
    if (!name || !id || !pass) { showNotification("⚠️ Bilal Bhai, saari details bharein!", "warning"); return; }
    extraUsers.push({ id, pass, name, perms });
    localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
    loadUserTable();
    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';
    document.querySelectorAll('.perm').forEach(cb => cb.checked = false);
    showNotification(`✅ New user "${name}" created!`, "success");
}

function loadUserTable() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    tbody.innerHTML = extraUsers.map((u, i) => `
        <tr><td>${u.id}</td><td>${u.name}</td><td><small>${u.perms.join(', ')}</small></td><td><button class="btn-action btn-delete" onclick="deleteExtraUser(${i})">Del</button></td></tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center;padding:20px;color:#7f8c8d;">No users created yet</td></tr>`;
}

function deleteExtraUser(index) {
    if (!confirm("⚠️ Kya aap is user ko delete karna chahte hain?")) return;
    extraUsers.splice(index, 1);
    localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
    loadUserTable();
    showNotification("✅ User deleted!", "success");
}

// ==========================================
// SIDEBAR TOGGLE
// ==========================================
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const mc = document.getElementById('main-content');
    if (sb.style.left === "0px" || sb.style.left === "") {
        sb.style.left = "-260px";
        mc.style.marginLeft = "0";
    } else {
        sb.style.left = "0px";
        mc.style.marginLeft = "260px";
    }
}

// ==========================================
// SWITCH PAGE
// ==========================================
function switchPage(pageId, title) {
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    document.getElementById('page-title').innerHTML = `<i class="fas fa-chart-line" style="color:#f1c40f; margin-right:12px;"></i>KRT TRADERS ERP - ${title}`;
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.left = "-260px";
        document.getElementById('main-content').style.marginLeft = "0";
    }
    resetIdleTimer();
}

// ==========================================
// LOGOUT
// ==========================================
function logout() {
    if (!confirm("🚪 Bilal Bhai, kya aap waqai logout karna chahte hain?")) return;
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    if (idleTimer) clearTimeout(idleTimer);
    if (idleInterval) clearInterval(idleInterval);
    document.getElementById('idle-overlay').style.display = 'none';
    isIdle = false;
    location.reload();
}

// ==========================================
// PRINT SECTION
// ==========================================
function printSection() {
    if (!db || !db.in) { showNotification("⚠️ Pehle data mukammal load hone dein!", "warning"); return; }
    window.print();
}

// ==========================================
// SAVE AND REFRESH
// ==========================================
function saveAndRefresh() {
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    renderAll();
}

// ==========================================
// UPDATE ITEM LISTS
// ==========================================
function updateItemLists() {
    const list = document.getElementById('items-list');
    if (!list) return;
    const items = [...new Set([...db.in.map(x=>x.item), ...db.out.map(x=>x.item)])];
    list.innerHTML = items.map(name => `<option value="${name}">`).join('');
}

// ==========================================
// APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    renderAll();
    renderRentTable();
    loadUserTable();
    updateCustomerDropdown();
    updateItemLists();
    
    if (navigator.onLine) await syncAllCloudData();
    
    const loggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('userRole');
    if (loggedIn === 'true') {
        if (role === 'admin') showSystem('admin');
        else if (role === 'staff') showSystem('staff');
        else if (role === 'manager') showSystem('manager');
    }
});

// Rent name live search
document.addEventListener('DOMContentLoaded', () => {
    const rentName = document.getElementById('rent-name');
    if (rentName) rentName.addEventListener('input', renderRentTable);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); syncAllCloudData(); }
    if (e.key === 'Escape') { const sb = document.getElementById('sidebar'); if (sb && sb.style.left === "0px") toggleSidebar(); }
});

console.log("🚀 KRT TRADERS ERP v5.0 Loaded!");
console.log("📦 Developed by Bilal Suleman");
console.log("🐘 Elephant Never Forgets!");
