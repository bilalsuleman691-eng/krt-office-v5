// ==========================================
// KRT TRADERS ERP - COMPLETE SCRIPT
// Developed by Bilal Suleman
// Version: 5.0
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
// GET TODAY'S DATE (Pakistan Timezone)
// ==========================================
function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;
    
    overlay.addEventListener('click', dismissIdleScreen);
    document.getElementById('idle-touch-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        dismissIdleScreen();
    });
    
    generateIdleParticles();
}

function generateIdleParticles() {
    const container = document.getElementById('idle-particles');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.className = 'idle-particle';
        const size = Math.random() * 8 + 3;
        p.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random()*100}%;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            opacity:${Math.random()*0.12+0.03};
            animation-duration:${Math.random()*20+15}s;
            animation-delay:${Math.random()*20}s;
            border-radius:${Math.random()>0.5?'50%':'4px'};
        `;
        container.appendChild(p);
    }
}

function showIdleScreen() {
    if (isIdle) return;
    if (document.getElementById('login-screen').style.display !== 'none') return;
    if (document.getElementById('welcome-overlay').style.display !== 'none') return;
    
    isIdle = true;
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;
    
    idleSeconds = 0;
    document.getElementById('idle-timer').textContent = '00:00';
    overlay.style.display = 'flex';
    overlay.style.animation = 'idleIn 0.8s ease';
    document.getElementById('idle-status').textContent = '🔴 IDLE';
    
    generateIdleParticles();
    
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
            alert("❌ Invalid Credentials!");
            document.querySelector('.login-box').style.animation = 'shake 0.5s ease';
            setTimeout(() => document.querySelector('.login-box').style.animation = '', 500);
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
                if (!t.includes("Dashboard") && !t.includes("Reports") && !t.includes("Balance") && !t.includes("Logout")) {
                    item.style.display = "none";
                }
            });
            switchPage('page-Report','REPORTS');
        } else if (roleOrUser === "manager") {
            items.forEach(item => {
                const t = item.innerText;
                if (!t.includes("Dashboard") && !t.includes("Ledgers") && !t.includes("Rent") && !t.includes("Balance") && !t.includes("Logout")) {
                    item.style.display = "none";
                }
            });
            switchPage('page-customer-ledgers','LEDGERS');
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
// CLOUD DATA - FIXED
// ==========================================
async function fetchCloudData() {
    try {
        console.log("🔄 Fetching from Supabase...");
        const { data, error } = await _supabase.from('KRT').select('*').order('id', { ascending: true });
        
        if (error) { 
            console.error("❌ Supabase Error:", error.message); 
            return false; 
        }
        
        if (!data || data.length === 0) {
            console.log("⚠️ No data in Supabase");
            return false;
        }
        
        console.log("📦 Data received:", data.length, "records");
        
        db.in = [];
        db.out = [];
        
        data.forEach((row) => {
            const inQty = Number(row.stock_in || 0);
            const outQty = Number(row.stock_out || 0);
            const price = Number(row.price || 0);
            const date = row.Date ? row.Date.split('T')[0] : new Date().toISOString().split('T')[0];
            
            if (inQty > 0) {
                db.in.push({ 
                    id: row.id, 
                    date: date, 
                    vendor: row.vendor_name || 'factory', 
                    item: row.item_name || 'Unknown', 
                    qty: inQty, 
                    price: price, 
                    total: inQty * price
                });
            }
            
            if (outQty > 0) {
                db.out.push({ 
                    id: row.id, 
                    date: date, 
                    cust: row.customer_name || 'General Sale', 
                    item: row.item_name || 'Unknown', 
                    qty: outQty, 
                    price: price, 
                    total: outQty * price
                });
            }
        });
        
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        console.log("✅ Data loaded:", db.in.length, "IN,", db.out.length, "OUT");
        return true;
    } catch (err) { 
        console.error("❌ Fetch Error:", err); 
        return false;
    }
}

async function fetchCloudRentData() {
    try {
        const { data, error } = await _supabase.from('KRT_RENT').select('*').order('id', { ascending: true });
        if (error) { console.error("Rent Fetch Error:", error); return false; }
        if (!data || data.length === 0) return false;
        
        dbRent = data.map(row => ({ 
            id: row.id, 
            name: row.name, 
            shop: row.shop, 
            date: row.date, 
            month: row.month, 
            debit: Number(row.debit||0), 
            credit: Number(row.credit||0), 
            method: row.method 
        }));
        
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        return true;
    } catch (err) { 
        console.error("❌ Rent Sync Error:", err); 
        return false;
    }
}

async function syncAllCloudData() {
    if (!navigator.onLine) { 
        showNotification("⚠️ No internet! Offline mode.", "warning"); 
        return; 
    }
    
    showNotification("☁️ Syncing...", "info");
    
    try {
        const stockSynced = await fetchCloudData();
        const rentSynced = await fetchCloudRentData();
        
        if (stockSynced || rentSynced) {
            renderAll();
            updateDashboardStats();
            updateItemLists();
            updateCustomerDropdown();
            loadUserTable();
            renderRentTable();
            showNotification("✅ Sync complete!", "success");
        } else {
            showNotification("ℹ️ No new data found.", "info");
        }
    } catch (err) {
        showNotification("❌ Sync failed: " + err.message, "error");
    }
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = "info") {
    const div = document.createElement('div');
    div.className = `toast-notification ${type}`;
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.classList.add('show'), 50);
    setTimeout(() => {
        div.classList.remove('show');
        setTimeout(() => div.remove(), 500);
    }, 3500);
}

// ==========================================
// STOCK IN - FIXED
// ==========================================
async function addIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value || 'factory';
    const item = document.getElementById('in-item').value.trim();
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value) || 0;
    
    if (!date) { showNotification("⚠️ Please select Date!", "warning"); return; }
    if (!item) { showNotification("⚠️ Please enter Item Name!", "warning"); return; }
    if (!qty || qty <= 0) { showNotification("⚠️ Please enter valid Quantity!", "warning"); return; }
    
    try {
        const { data, error } = await _supabase.from('KRT').insert([{ 
            Date: date, 
            item_name: item, 
            stock_in: qty, 
            stock_out: 0, 
            price: price, 
            vendor_name: vendor
        }]).select();
        
        if (error) { 
            showNotification("❌ Cloud error: " + error.message, "error"); 
            return; 
        }
        
        if (data && data.length > 0) {
            db.in.push({ 
                id: data[0].id, 
                date: date, 
                vendor: vendor, 
                item: item, 
                qty: qty, 
                price: price, 
                total: qty * price 
            });
            
            localStorage.setItem('krt_erp_data', JSON.stringify(db));
            renderAll();
            updateDashboardStats();
            updateItemLists();
            
            document.getElementById('in-item').value = "";
            document.getElementById('in-qty').value = "";
            
            showNotification("✅ Stock IN saved!", "success");
        }
    } catch (err) { 
        showNotification("❌ Network error!", "error"); 
    }
}

// ==========================================
// STOCK OUT - FIXED
// ==========================================
async function addOut() {
    const date = document.getElementById('out-date').value;
    const custName = document.getElementById('out-customer').value || "General Sale";
    const item = document.getElementById('out-item').value.trim();
    const qty = Number(document.getElementById('out-qty').value);
    const price = Number(document.getElementById('out-price').value) || 0;
    
    if (!date) { showNotification("⚠️ Please select Date!", "warning"); return; }
    if (!item) { showNotification("⚠️ Please enter Item Name!", "warning"); return; }
    if (!qty || qty <= 0) { showNotification("⚠️ Please enter valid Quantity!", "warning"); return; }
    
    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const available = tin - tout;
    
    if (qty > available && available > 0) {
        if (!confirm(`⚠️ Only ${available} available. Still continue?`)) {
            return;
        }
    }
    
    try {
        const { data, error } = await _supabase.from('KRT').insert([{ 
            Date: date, 
            item_name: item, 
            stock_in: 0, 
            stock_out: qty, 
            price: price, 
            customer_name: custName
        }]).select();
        
        if (error) { 
            showNotification("❌ Cloud error: " + error.message, "error"); 
            return; 
        }
        
        if (data && data.length > 0) {
            db.out.push({ 
                id: data[0].id, 
                item: item, 
                qty: qty, 
                date: date, 
                cust: custName, 
                price: price, 
                total: qty * price 
            });
            
            localStorage.setItem('krt_erp_data', JSON.stringify(db));
            renderAll();
            updateDashboardStats();
            updateItemLists();
            
            document.getElementById('out-item').value = "";
            document.getElementById('out-qty').value = "";
            document.getElementById('stock-status').innerHTML = "";
            
            showNotification("✅ Stock OUT saved!", "success");
        }
    } catch (err) { 
        showNotification("❌ Network error!", "error"); 
    }
}

// ==========================================
// LIVE STOCK CHECK
// ==========================================
function showLiveStock(itemName) {
    const status = document.getElementById('stock-status');
    if (!itemName || !itemName.trim()) { 
        status.innerHTML = ""; 
        return; 
    }
    
    const totalIn = db.in.filter(x => x.item === itemName).reduce((s, x) => s + x.qty, 0);
    const totalOut = db.out.filter(x => x.item === itemName).reduce((s, x) => s + x.qty, 0);
    const balance = totalIn - totalOut;
    
    if (balance > 0) {
        status.style.color = "#10b981";
        status.innerHTML = `✅ Available: <strong>${balance}</strong>`;
    } else if (balance <= 0 && totalIn > 0) {
        status.style.color = "#ef4444";
        status.innerHTML = `⚠️ Out of Stock! (Balance: ${balance})`;
    } else {
        status.style.color = "#94a3b8";
        status.innerHTML = "ℹ️ No record found.";
    }
}

// ==========================================
// RENDER ALL - FIXED
// ==========================================
function renderAll() {
    const today = getTodayDate();
    
    // Today's IN
    const inBody = document.getElementById('today-list-in');
    if (inBody) {
        let html = ""; 
        let c = 1;
        const todayIn = db.in.filter(x => x.date === today);
        
        if (todayIn.length === 0) {
            inBody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:25px;color:#94a3b8;">📭 No entries today</td></tr>`;
        } else {
            todayIn.forEach((x) => {
                const idx = db.in.indexOf(x);
                html += `<tr>
                    <td>${c++}</td>
                    <td><strong>${x.item}</strong></td>
                    <td>${x.vendor}</td>
                    <td>${x.qty}</td>
                    <td>${x.price.toLocaleString()}</td>
                    <td>${x.total.toLocaleString()}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editEntry('in',${idx})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteEntry('in',${idx})">Del</button>
                    </td>
                </tr>`;
            });
            inBody.innerHTML = html;
        }
    }
    
    // Today's OUT
    const outBody = document.getElementById('today-list-out');
    if (outBody) {
        let html = ""; 
        let c = 1;
        const todayOut = db.out.filter(x => x.date === today);
        
        if (todayOut.length === 0) {
            outBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:25px;color:#94a3b8;">📭 No sales today</td></tr>`;
        } else {
            todayOut.forEach((x) => {
                const idx = db.out.indexOf(x);
                html += `<tr>
                    <td>${c++}</td>
                    <td>${x.date}</td>
                    <td>${x.cust}</td>
                    <td><strong>${x.item}</strong></td>
                    <td>${x.qty}</td>
                    <td>${x.price.toLocaleString()}</td>
                    <td>${x.total.toLocaleString()}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editEntry('out',${idx})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteEntry('out',${idx})">Del</button>
                    </td>
                </tr>`;
            });
            outBody.innerHTML = html;
        }
    }
    
    // Balance
    const balBody = document.getElementById('table-balance-body');
    if (balBody) {
        const items = [...new Set([...db.in.map(x=>x.item), ...db.out.map(x=>x.item)])];
        
        if (items.length === 0) {
            balBody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:25px;color:#94a3b8;">📭 No items</td></tr>`;
        } else {
            balBody.innerHTML = items.map(name => {
                if (!name) return "";
                const tin = db.in.filter(x=>x.item===name).reduce((s,x)=>s+x.qty,0);
                const tout = db.out.filter(x=>x.item===name).reduce((s,x)=>s+x.qty,0);
                const inPrice = db.in.find(x=>x.item===name)?.price || 0;
                const outPrice = db.out.find(x=>x.item===name)?.price || 0;
                const bal = tin - tout;
                const profit = (outPrice - inPrice) * tout;
                
                return `<tr>
                    <td>N/A</td>
                    <td><strong>${name}</strong></td>
                    <td style="color:#06b6d4;">${tin}</td>
                    <td style="color:#f59e0b;">${tout}</td>
                    <td style="font-weight:bold;color:${bal<5?'#ef4444':'#10b981'};">${bal}</td>
                    <td style="color:${profit>=0?'#10b981':'#ef4444'};font-weight:bold;">PKR ${profit.toLocaleString()}</td>
                </tr>`;
            }).join('');
        }
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
    
    const act = document.getElementById('recent-activity');
    if (act) {
        const all = [...db.in.map(x=>({...x,type:'IN'})), ...db.out.map(x=>({...x,type:'OUT'}))];
        all.sort((a,b)=>new Date(b.date)-new Date(a.date));
        const recent = all.slice(0,10);
        
        if (recent.length === 0) {
            act.innerHTML = `<p style="color:#94a3b8;text-align:center;padding:20px;">No activity yet</p>`;
        } else {
            act.innerHTML = recent.map(x => `
                <div class="activity-item">
                    <span>
                        <strong>${x.item}</strong> 
                        <span style="color:${x.type==='IN'?'#10b981':'#ef4444'};font-weight:bold;">
                            ${x.type==='IN'?'📥 +':'📤 -'}${x.qty}
                        </span>
                    </span>
                    <span style="color:#94a3b8;font-size:12px;">${x.date}</span>
                </div>
            `).join('');
        }
    }
}

// ==========================================
// DELETE ENTRY
// ==========================================
async function deleteEntry(type, index) {
    if (!confirm("⚠️ Delete this record?")) return;
    
    const record = db[type][index];
    if (record && record.id) {
        try {
            const { error } = await _supabase.from('KRT').delete().eq('id', record.id);
            if (error) { 
                showNotification("❌ Delete failed: " + error.message, "error"); 
                return; 
            }
        } catch (err) { 
            showNotification("❌ Network error!", "error"); 
            return; 
        }
    }
    
    db[type].splice(index, 1);
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    renderAll();
    updateDashboardStats();
    showNotification("✅ Deleted!", "success");
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
            price: Number(newPrice) || 0
        }).eq('id', data.id);
        
        if (error) { 
            showNotification("❌ Update failed!", "error"); 
            return; 
        }
        
        db[type][index].qty = Number(newQty);
        db[type][index].price = Number(newPrice) || 0;
        db[type][index].total = Number(newQty) * (Number(newPrice) || 0);
        
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        renderAll();
        updateDashboardStats();
        generateMasterSearch();
        showNotification("✅ Updated!", "success");
    } catch (err) { 
        showNotification("❌ Network error!", "error"); 
    }
}

// ==========================================
// MASTER SEARCH
// ==========================================
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;
    
    if (!from || !to) { 
        showNotification("⚠️ Select both dates!", "warning"); 
        return; 
    }
    
    const fIn = db.in.filter(x => x.date >= from && x.date <= to);
    const fOut = db.out.filter(x => x.date >= from && x.date <= to);
    
    const inTable = document.querySelector("#master-in-table");
    if (inTable) {
        if (fIn.length === 0) {
            inTable.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>`;
        } else {
            inTable.innerHTML = fIn.map((x) => {
                const idx = db.in.indexOf(x);
                return `<tr>
                    <td>${x.date}</td>
                    <td><strong>${x.item}</strong></td>
                    <td>${x.vendor}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editEntry('in',${idx})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteEntry('in',${idx})">Del</button>
                    </td>
                </tr>`;
            }).join('');
        }
    }
    
    const outTable = document.querySelector("#master-out-table");
    if (outTable) {
        if (fOut.length === 0) {
            outTable.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>`;
        } else {
            outTable.innerHTML = fOut.map((x) => {
                const idx = db.out.indexOf(x);
                return `<tr>
                    <td>${x.date}</td>
                    <td><strong>${x.item}</strong></td>
                    <td>${x.cust}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editEntry('out',${idx})">Edit</button>
                        <button class="btn-action btn-delete" onclick="deleteEntry('out',${idx})">Del</button>
                    </td>
                </tr>`;
            }).join('');
        }
    }
    
    showNotification(`✅ Found ${fIn.length + fOut.length} records`, "success");
}

// ==========================================
// GENERATE REPORT
// ==========================================
function generateCustomReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;
    
    if (!from || !to) { 
        showNotification("⚠️ Select both dates!", "warning"); 
        return; 
    }
    
    document.getElementById('report-period').innerHTML = `📅 ${from} to ${to}`;
    
    const fIn = db.in.filter(x => x.date >= from && x.date <= to);
    const fOut = db.out.filter(x => x.date >= from && x.date <= to);
    
    const inTable = document.querySelector("#rep-in-table");
    if (inTable) {
        if (fIn.length === 0) {
            inTable.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>`;
        } else {
            inTable.innerHTML = fIn.map(x => `
                <tr>
                    <td>${x.date}</td>
                    <td><strong>${x.item}</strong></td>
                    <td>${x.vendor}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total.toLocaleString()}</td>
                </tr>
            `).join('');
        }
    }
    
    const outTable = document.querySelector("#rep-out-table");
    if (outTable) {
        if (fOut.length === 0) {
            outTable.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>`;
        } else {
            outTable.innerHTML = fOut.map(x => `
                <tr>
                    <td>${x.date}</td>
                    <td><strong>${x.item}</strong></td>
                    <td>${x.cust}</td>
                    <td>${x.qty}</td>
                    <td>${x.price}</td>
                    <td>${x.total.toLocaleString()}</td>
                </tr>
            `).join('');
        }
    }
    
    const tIn = fIn.reduce((s,x)=>s+x.total,0);
    const tOut = fOut.reduce((s,x)=>s+x.total,0);
    const profit = tOut - tIn;
    
    document.querySelectorAll('.report-summary').forEach(el => el.remove());
    
    const summary = document.createElement('div');
    summary.className = 'report-summary';
    summary.style.cssText = `
        display:flex; 
        justify-content:space-around; 
        background:#0f172a; 
        color:white; 
        padding:15px; 
        border-radius:8px; 
        margin-top:20px; 
        flex-wrap:wrap; 
        gap:10px;
    `;
    summary.innerHTML = `
        <span>📥 Total IN: PKR ${tIn.toLocaleString()}</span>
        <span>📤 Total OUT: PKR ${tOut.toLocaleString()}</span>
        <span style="color:${profit>=0?'#10b981':'#ef4444'};font-weight:bold;">
            💰 ${profit>=0?'Profit':'Loss'}: PKR ${Math.abs(profit).toLocaleString()}
        </span>
    `;
    document.getElementById('print-area').appendChild(summary);
    
    showNotification("✅ Report generated!", "success");
}

// ==========================================
// CUSTOMER LEDGERS
// ==========================================
function updateCustomerDropdown() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    
    const customers = Object.keys(db.ledgers);
    list.innerHTML = customers.map(name => `<option value="${name}">`).join('');
}

function saveLedgerEntry() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const date = document.getElementById('led-date').value;
    const item = document.getElementById('led-item').value || '-';
    const ctn = parseFloat(document.getElementById('led-ctn').value) || 0;
    const debit = parseFloat(document.getElementById('led-debit').value) || 0;
    const credit = parseFloat(document.getElementById('led-credit').value) || 0;
    const method = document.getElementById('led-method').value;
    
    if (!name) { showNotification("⚠️ Customer Name required!", "warning"); return; }
    if (!date) { showNotification("⚠️ Date required!", "warning"); return; }
    
    if (!db.ledgers[name]) { 
        db.ledgers[name] = []; 
        db.opening_balances[name] = 0; 
    }
    
    db.ledgers[name].push({ date, item, ctn, debit, credit, method });
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
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
    
    if (name) { 
        db.opening_balances[name] = val; 
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        showLedger(); 
    }
}

function showLedger() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;
    
    const opening = parseFloat(db.opening_balances[name]) || 0;
    document.getElementById('opening-bal').value = opening;
    
    if (!name || !db.ledgers[name]) {
        document.getElementById('total-ctn').textContent = "0";
        document.getElementById('total-debit').textContent = "0";
        document.getElementById('total-credit').textContent = "0";
        document.getElementById('final-balance').textContent = "💰 Balance: 0";
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">No entries</td></tr>`;
        return;
    }
    
    let tCtn = 0, tDebit = 0, tCredit = 0;
    let html = "";
    
    db.ledgers[name].forEach((x, i) => {
        tCtn += Number(x.ctn||0); 
        tDebit += Number(x.debit||0); 
        tCredit += Number(x.credit||0);
        
        html += `<tr>
            <td>${i+1}</td>
            <td>${x.date}</td>
            <td>${x.item}</td>
            <td>${x.ctn}</td>
            <td style="color:#ef4444;">${x.debit.toLocaleString()}</td>
            <td style="color:#10b981;">${x.credit.toLocaleString()}</td>
            <td>${x.method}</td>
            <td>
                <button class="btn-action btn-edit" onclick="editLedger('${name}',${i})">Edit</button>
                <button class="btn-action btn-delete" onclick="delLedger('${name}',${i})">Del</button>
            </td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    document.getElementById('total-ctn').textContent = tCtn;
    document.getElementById('total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('total-credit').textContent = tCredit.toLocaleString();
    
    const balance = (opening + tDebit) - tCredit;
    const balanceEl = document.getElementById('final-balance');
    balanceEl.textContent = `💰 Balance: ${balance.toLocaleString()}`;
    balanceEl.style.background = balance >= 0 ? '#10b981' : '#ef4444';
    balanceEl.style.color = 'white';
    balanceEl.style.padding = '6px 12px';
    balanceEl.style.borderRadius = '6px';
}

function delLedger(custName, index) {
    if (!confirm("⚠️ Delete this entry?")) return;
    db.ledgers[custName].splice(index, 1);
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    showLedger();
    showNotification("✅ Deleted!", "success");
}

function editLedger(custName, index) {
    const entry = db.ledgers[custName][index];
    const nDebit = prompt("New Debit:", entry.debit);
    const nCredit = prompt("New Credit:", entry.credit);
    
    if (nDebit !== null && nCredit !== null) {
        db.ledgers[custName][index].debit = Number(nDebit);
        db.ledgers[custName][index].credit = Number(nCredit);
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        showLedger();
        showNotification("✅ Updated!", "success");
    }
}

// ==========================================
// RENT BOOK
// ==========================================
function addRentEntry() {
    const name = document.getElementById('rent-name').value.trim();
    const shop = document.getElementById('rent-shop-no').value || '-';
    const date = document.getElementById('rent-date').value;
    const month = document.getElementById('rent-month').value || '-';
    const debit = parseFloat(document.getElementById('rent-debit').value) || 0;
    const credit = parseFloat(document.getElementById('rent-credit').value) || 0;
    const method = document.getElementById('rent-method').value;
    
    if (!name) { showNotification("⚠️ Name required!", "warning"); return; }
    if (!date) { showNotification("⚠️ Date required!", "warning"); return; }
    
    dbRent.push({ name, shop, date, month, debit, credit, method });
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
    renderRentTable();
    showNotification(`✅ Entry saved for ${name}!`, "success");
}

function renderRentTable() {
    const tbody = document.getElementById('rent-main-rows');
    const searchName = document.getElementById('rent-name').value.trim();
    if (!tbody) return;
    
    let tDebit = 0, tCredit = 0;
    const filtered = dbRent.filter(x => x.name.toLowerCase() === searchName.toLowerCase());
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:25px;color:#94a3b8;">📭 No records</td></tr>`;
    } else {
        let html = "";
        filtered.forEach((r) => {
            const idx = dbRent.indexOf(r);
            tDebit += r.debit; 
            tCredit += r.credit;
            
            html += `<tr>
                <td>${r.shop||'N/A'}</td>
                <td>${r.date}</td>
                <td>${r.month}</td>
                <td style="color:#ef4444;font-weight:600;">${r.debit.toLocaleString()}</td>
                <td style="color:#10b981;font-weight:600;">${r.credit.toLocaleString()}</td>
                <td>${r.method}</td>
                <td><button class="btn-action btn-delete" onclick="deleteRentEntry(${idx})">Del</button></td>
            </tr>`;
        });
        tbody.innerHTML = html;
    }
    
    document.getElementById('rent-total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('rent-total-credit').textContent = tCredit.toLocaleString();
    document.getElementById('rent-final-balance').textContent = (tDebit - tCredit).toLocaleString();
}

function deleteRentEntry(index) {
    if (!confirm("⚠️ Delete this entry?")) return;
    dbRent.splice(index, 1);
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
    renderRentTable();
    showNotification("✅ Deleted!", "success");
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
    
    if (!name || !id || !pass) { 
        showNotification("⚠️ Fill all fields!", "warning"); 
        return; 
    }
    
    extraUsers.push({ id, pass, name, perms });
    localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
    loadUserTable();
    
    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';
    document.querySelectorAll('.perm').forEach(cb => cb.checked = false);
    
    showNotification(`✅ User "${name}" created!`, "success");
}

function loadUserTable() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    
    if (extraUsers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No users</td></tr>`;
    } else {
        tbody.innerHTML = extraUsers.map((u, i) => `
            <tr>
                <td><strong>${u.id}</strong></td>
                <td>${u.name}</td>
                <td><small>${u.perms.join(', ')}</small></td>
                <td><button class="btn-action btn-delete" onclick="deleteExtraUser(${i})">Del</button></td>
            </tr>
        `).join('');
    }
}

function deleteExtraUser(index) {
    if (!confirm("⚠️ Delete this user?")) return;
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
    if (sb.style.left === "0px" || sb.style.left === "") {
        sb.style.left = "-250px";
        document.getElementById('main-content').style.marginLeft = "0";
    } else {
        sb.style.left = "0px";
        document.getElementById('main-content').style.marginLeft = "250px";
    }
}

// ==========================================
// SWITCH PAGE
// ==========================================
function switchPage(pageId, title) {
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    document.getElementById(pageId).style.display = 'block';
    document.getElementById('page-title').innerHTML = `<i class="fas fa-chart-line"></i> KRT ERP - ${title}`;
    
    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('#sidebar ul li').forEach(li => {
        if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(pageId)) {
            li.classList.add('active');
        }
    });
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.left = "-250px";
        document.getElementById('main-content').style.marginLeft = "0";
    }
    
    resetIdleTimer();
}

// ==========================================
// LOGOUT
// ==========================================
function logout() {
    if (!confirm("🚪 Logout?")) return;
    
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
    if (!db || !db.in) { 
        showNotification("⚠️ Data not loaded!", "warning"); 
        return; 
    }
    window.print();
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
    console.log("🚀 KRT ERP v5.0 Loading...");
    console.log("📦 Developed by Bilal Suleman");
    
    renderAll();
    renderRentTable();
    loadUserTable();
    updateCustomerDropdown();
    updateItemLists();
    
    if (navigator.onLine) {
        await fetchCloudData();
        renderAll();
    } else {
        showNotification("⚠️ Offline mode", "warning");
    }
    
    const loggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('userRole');
    
    if (loggedIn === 'true') {
        if (role === 'admin') showSystem('admin');
        else if (role === 'staff') showSystem('staff');
        else if (role === 'manager') showSystem('manager');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const rentName = document.getElementById('rent-name');
    if (rentName) rentName.addEventListener('input', renderRentTable);
});

document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') { 
        e.preventDefault(); 
        syncAllCloudData(); 
    }
    
    if (e.key === 'Escape') { 
        const sb = document.getElementById('sidebar'); 
        if (sb && sb.style.left === "0px") toggleSidebar(); 
    }
});

console.log("✅ KRT ERP v5.0 Loaded!");
