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
// WELCOME ANIMATION SYSTEM (Premium)
// ==========================================
function startWelcomeAnimation() {
    const overlay = document.getElementById('welcome-overlay');
    const welcomeText = document.getElementById('welcome-text');
    const creatorText = document.getElementById('creator-text');
    const loadingBar = document.getElementById('loading-bar');
    
    // Particle Background
    const canvas = document.getElementById('particleCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const particles = [];
        const particleCount = 120;
        
        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                dx: (Math.random() - 0.5) * 0.8,
                dy: (Math.random() - 0.5) * 0.8,
                color: `rgba(241, 196, 15, ${Math.random() * 0.3 + 0.1})`
            });
        }
        
        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.x += p.dx;
                p.y += p.dy;
                if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }
    
    // Typing Effect - Full Message
    const fullMessage = "✦ BISMILLAH ✦\nWELCOME TO KRT TRADERS ERP\n✦ CREATED BY BILAL SULEMAN ✦";
    let charIndex = 0;
    let currentLine = 0;
    const lines = fullMessage.split('\n');
    
    function typeText() {
        if (currentLine < lines.length) {
            if (charIndex < lines[currentLine].length) {
                welcomeText.textContent = lines[currentLine].substring(0, charIndex + 1);
                charIndex++;
                setTimeout(typeText, 60);
            } else {
                currentLine++;
                charIndex = 0;
                if (currentLine < lines.length) {
                    welcomeText.textContent += '\n';
                    setTimeout(typeText, 300);
                } else {
                    // Typing complete
                    welcomeText.style.borderRight = 'none';
                    setTimeout(() => {
                        creatorText.style.opacity = '1';
                        creatorText.style.transition = 'opacity 1s ease';
                    }, 500);
                    
                    // Loading bar animation
                    let progress = 0;
                    const loadInterval = setInterval(() => {
                        progress += Math.random() * 3 + 0.5;
                        if (progress >= 100) {
                            progress = 100;
                            clearInterval(loadInterval);
                            setTimeout(() => {
                                overlay.style.opacity = '0';
                                overlay.style.transition = 'opacity 0.8s ease';
                                setTimeout(() => {
                                    overlay.style.display = 'none';
                                    // Show login
                                    document.getElementById('login-screen').style.display = 'flex';
                                }, 800);
                            }, 600);
                        }
                        loadingBar.style.width = progress + '%';
                    }, 80);
                }
            }
        }
    }
    
    // Start after small delay
    setTimeout(typeText, 800);
}

// ==========================================
// LOGIN SYSTEM
// ==========================================
function login() {
    const userField = document.getElementById('user');
    const passField = document.getElementById('pass');
    
    if (!userField || !passField) return;
    
    const u = userField.value.trim().toLowerCase();
    const p = passField.value.trim();
    
    // Admin
    if (u === "admin" && p === "123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        showSystem("admin");
    }
    // Staff
    else if (u === "ali" && p === "123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'staff');
        showSystem("staff");
    }
    // Manager
    else if (u === "sattar" && p === "123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'manager');
        showSystem("manager");
    }
    // Extra Users
    else {
        const found = extraUsers.find(user => user.id === u && user.pass === p);
        if (found) {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'extra');
            showSystem(found);
            document.getElementById('toggle-btn').style.display = "block";
        } else {
            alert("❌ Ghalat ID ya Password! Please try again.");
            // Shake animation
            const loginBox = document.querySelector('#login-screen > div');
            loginBox.style.animation = 'shake 0.5s ease';
            setTimeout(() => loginBox.style.animation = '', 500);
        }
    }
}

// Add shake animation
const styleSheet = document.createElement("style");
styleSheet.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-15px); }
        75% { transform: translateX(15px); }
    }
`;
document.head.appendChild(styleSheet);

// ==========================================
// SHOW SYSTEM FUNCTION
// ==========================================
function showSystem(roleOrUser) {
    document.getElementById('login-screen').style.display = "none";
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('main-content').style.display = "block";
    document.getElementById('toggle-btn').style.display = "block";
    
    if (typeof roleOrUser === "object") {
        applyDynamicPermissions(roleOrUser);
    } else {
        const menuItems = document.querySelectorAll('#sidebar ul li');
        menuItems.forEach(item => item.style.display = "flex");
        
        if (roleOrUser === "staff") {
            menuItems.forEach(item => {
                const text = item.innerText;
                if (!text.includes("Dashboard") && !text.includes("Daily Report") && 
                    !text.includes("Stock Balance") && !text.includes("Logout")) {
                    item.style.display = "none";
                }
            });
            switchPage('page-Report', 'DAILY REPORT');
        } else if (roleOrUser === "manager") {
            menuItems.forEach(item => {
                const text = item.innerText;
                if (!text.includes("Dashboard") && !text.includes("Customer Ledgers") && 
                    !text.includes("Market Rent Book") && !text.includes("Stock Balance") && !text.includes("Logout")) {
                    item.style.display = "none";
                }
            });
            switchPage('page-customer-ledgers', 'CUSTOMER LEDGERS');
        }
    }
    
    renderAll();
    updateDashboardStats();
    loadUserTable();
}

// ==========================================
// PERMISSIONS SYSTEM
// ==========================================
function applyDynamicPermissions(user) {
    const menuItems = document.querySelectorAll('#sidebar ul li');
    menuItems.forEach(item => {
        const onclickAttr = item.getAttribute('onclick') || "";
        
        if (onclickAttr.includes('page-dashboard') || onclickAttr.includes('logout')) {
            item.style.display = "flex";
            return;
        }
        
        const isAllowed = user.perms.some(p => onclickAttr.includes(p));
        item.style.display = isAllowed ? "flex" : "none";
    });
    renderAll();
}

// ==========================================
// CLOUD DATA FUNCTIONS
// ==========================================
async function fetchCloudData() {
    try {
        console.log("☁️ Cloud se latest data load ho raha hai...");
        
        const { data, error } = await _supabase
            .from('KRT')
            .select('*')
            .order('id', { ascending: true });
            
        if (error) {
            console.error("Supabase Error:", error.message);
            return;
        }
        
        if (!data || data.length === 0) {
            console.log("ℹ️ Cloud par koi data mojud nahi hai.");
            return;
        }
        
        db.in = [];
        db.out = [];
        
        data.forEach(row => {
            const stockIn = Number(row.stock_in || 0);
            const stockOut = Number(row.stock_out || 0);
            const itemPrice = Number(row.price || 0);
            const rowDate = row.Date || row.date || row.created_at;
            const formattedDate = rowDate ? rowDate.split('T')[0] : new Date().toISOString().split('T')[0];
            
            if (stockIn > 0) {
                db.in.push({
                    id: row.id,
                    date: formattedDate,
                    vendor: row.vendor_name || 'factory',
                    item: row.item_name || 'Unknown',
                    qty: stockIn,
                    price: itemPrice,
                    total: stockIn * itemPrice
                });
            } else if (stockOut > 0) {
                db.out.push({
                    id: row.id,
                    date: formattedDate,
                    cust: row.customer_name || 'General Sale',
                    item: row.item_name || 'Unknown',
                    qty: stockOut,
                    price: itemPrice,
                    total: stockOut * itemPrice
                });
            }
        });
        
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        localStorage.setItem('krt_stock_data', JSON.stringify(db));
        
        renderAll();
        updateDashboardStats();
        
        console.log("✅ Cloud sync complete!");
    } catch (err) {
        console.error("❌ Fetch Error:", err);
    }
}

async function fetchCloudRentData() {
    try {
        const { data, error } = await _supabase
            .from('KRT_RENT')
            .select('*')
            .order('id', { ascending: true });
            
        if (error) {
            console.error("Rent Fetch Error:", error);
            return;
        }
        
        if (!data) return;
        
        dbRent = data.map(row => ({
            id: row.id,
            name: row.name,
            shop: row.shop,
            date: row.date,
            month: row.month,
            debit: Number(row.debit || 0),
            credit: Number(row.credit || 0),
            method: row.method
        }));
        
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        
        if (typeof renderRentTable === "function") {
            renderRentTable();
        }
        
        console.log("✅ Rent cloud sync done!");
    } catch (err) {
        console.error("❌ Rent Sync Error:", err);
    }
}

async function syncAllCloudData() {
    if (!navigator.onLine) {
        showNotification("⚠️ Internet nahi hai! Offline mode.", "warning");
        return;
    }
    
    showNotification("☁️ Cloud sync shuru...", "info");
    
    try {
        await fetchCloudData();
        await fetchCloudRentData();
        
        if (typeof updateItemLists === "function") updateItemLists();
        if (typeof updateCustomerDropdown === "function") updateCustomerDropdown();
        if (typeof loadUserTable === "function") loadUserTable();
        
        showNotification("✅ Cloud sync complete!", "success");
    } catch (err) {
        console.error("❌ Cloud Sync Error:", err);
        showNotification("❌ Sync failed: " + err.message, "error");
    }
}

// ==========================================
// NOTIFICATION SYSTEM
// ==========================================
function showNotification(message, type = "info") {
    const colors = {
        success: "#27ae60",
        error: "#e74c3c",
        warning: "#f39c12",
        info: "#3498db"
    };
    
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed; bottom: 30px; right: 30px;
        padding: 15px 25px; border-radius: 10px;
        color: white; font-weight: 600; font-size: 14px;
        z-index: 99999; background: ${colors[type] || '#2c3e50'};
        box-shadow: 0 8px 30px rgba(0,0,0,0.3);
        transform: translateY(100px); opacity: 0;
        transition: all 0.5s ease; max-width: 400px;
        font-family: 'Poppins', sans-serif;
    `;
    div.textContent = message;
    document.body.appendChild(div);
    
    setTimeout(() => {
        div.style.transform = 'translateY(0)';
        div.style.opacity = '1';
    }, 100);
    
    setTimeout(() => {
        div.style.transform = 'translateY(100px)';
        div.style.opacity = '0';
        setTimeout(() => div.remove(), 500);
    }, 4000);
}

// ==========================================
// STOCK IN FUNCTION
// ==========================================
async function addIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value;
    const item = document.getElementById('in-item').value.trim();
    const barcode = document.getElementById('in-barcode').value;
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value);
    
    if (!date || !item || qty <= 0) {
        showNotification("⚠️ Bilal Bhai, details lazmi likhain!", "warning");
        return;
    }
    
    try {
        const { data, error } = await _supabase
            .from('KRT')
            .insert([{
                Date: date,
                item_name: item,
                stock_in: qty,
                stock_out: 0,
                price: price,
                vendor_name: vendor
            }])
            .select();
            
        if (error) {
            showNotification("❌ Cloud sync fail: " + error.message, "error");
            return;
        }
        
        if (data && data.length > 0) {
            db.in.push({
                id: data[0].id,
                date: date,
                vendor: vendor || 'factory',
                item: item,
                barcode: barcode,
                qty: qty,
                price: price,
                total: qty * price
            });
            
            saveAndRefresh();
            
            document.getElementById('in-item').value = "";
            document.getElementById('in-qty').value = "";
            document.getElementById('in-price').value = "";
            document.getElementById('in-barcode').value = "";
            
            showNotification("✅ Stock IN saved to cloud!", "success");
        }
    } catch (err) {
        console.error("❌ Connection Error:", err);
        showNotification("❌ Internet ka masla hai!", "error");
    }
}

// ==========================================
// STOCK OUT FUNCTION
// ==========================================
async function addOut() {
    const item = document.getElementById('out-item').value.trim();
    const qty = Number(document.getElementById('out-qty').value);
    const date = document.getElementById('out-date').value;
    const price = Number(document.getElementById('out-price')?.value || 0);
    const custName = document.getElementById('out-customer')?.value || "General Sale";
    const barcode = document.getElementById('out-barcode')?.value || "";
    
    if (!item || qty <= 0 || !date) {
        showNotification("⚠️ Bilal Bhai, saari details bharein!", "warning");
        return;
    }
    
    // Stock Check
    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const availableStock = tin - tout;
    
    if (qty > availableStock) {
        showNotification(`⚠️ Stock kam hai! Sirf ${availableStock} mojud hain.`, "warning");
        return;
    }
    
    try {
        const { data, error } = await _supabase
            .from('KRT')
            .insert([{
                Date: date,
                item_name: item,
                stock_in: 0,
                stock_out: qty,
                price: price,
                customer_name: custName
            }])
            .select();
            
        if (error) {
            showNotification("❌ Cloud sync fail: " + error.message, "error");
            return;
        }
        
        if (data && data.length > 0) {
            db.out.push({
                id: data[0].id,
                item: item,
                qty: qty,
                date: date,
                cust: custName,
                barcode: barcode,
                price: price,
                total: qty * price
            });
            
            saveAndRefresh();
            
            document.getElementById('out-qty').value = "";
            document.getElementById('out-customer').value = "";
            document.getElementById('out-barcode').value = "";
            document.getElementById('stock-status').innerText = "";
            
            showNotification("✅ Stock OUT saved to cloud!", "success");
        }
    } catch (err) {
        console.error("❌ Error:", err);
        showNotification("❌ Internet ka masla hai!", "error");
    }
}

// ==========================================
// LIVE STOCK CHECK
// ==========================================
function showLiveStock(itemName) {
    const statusDiv = document.getElementById('stock-status');
    if (!itemName || itemName.trim() === "") {
        statusDiv.innerHTML = "";
        return;
    }
    
    let totalIn = db.in
        .filter(x => x.item === itemName)
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);
        
    let totalOut = db.out
        .filter(x => x.item === itemName)
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);
        
    let balance = totalIn - totalOut;
    
    if (balance > 0) {
        statusDiv.style.color = "#27ae60";
        statusDiv.innerHTML = `✅ Available Stock: <strong>${balance}</strong>`;
    } else if (balance <= 0 && totalIn > 0) {
        statusDiv.style.color = "#e74c3c";
        statusDiv.innerHTML = `⚠️ Out of Stock! (Balance: ${balance})`;
    } else {
        statusDiv.style.color = "#7f8c8d";
        statusDiv.innerHTML = "ℹ️ No record found for this item.";
    }
}

// ==========================================
// RENDER ALL FUNCTION
// ==========================================
function renderAll() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Today's Stock IN
    const todayInBody = document.getElementById('today-list-in');
    if (todayInBody) {
        let htmlIn = "";
        let counterIn = 1;
        db.in.forEach((x, originalIndex) => {
            if (x.date === today) {
                htmlIn += `
                    <tr>
                        <td style="padding:10px;">${counterIn++}</td>
                        <td style="padding:10px;">${x.item}</td>
                        <td style="padding:10px;">${x.vendor}</td>
                        <td style="padding:10px;">${x.qty}</td>
                        <td style="padding:10px;">${x.price.toLocaleString()}</td>
                        <td style="padding:10px;">${x.total.toLocaleString()}</td>
                        <td style="padding:10px; text-align:center;">
                            <button onclick="deleteEntry('in', ${originalIndex})" class="btn-action btn-delete">Del</button>
                        </td>
                    </tr>`;
            }
        });
        todayInBody.innerHTML = htmlIn || `<tr><td colspan="7" style="text-align:center; padding:30px; color:#7f8c8d;">📭 Aaj ki koi entry nahi hai...</td></tr>`;
    }
    
    // Today's Stock OUT
    const outTableBody = document.querySelector('#today-list-out');
    if (outTableBody) {
        let htmlOut = "";
        let counterOut = 1;
        db.out.forEach((x, originalIndex) => {
            if (x.date === today) {
                htmlOut += `
                    <tr>
                        <td style="padding:10px;">${counterOut++}</td>
                        <td style="padding:10px;">${x.date}</td>
                        <td style="padding:10px;">${x.cust}</td>
                        <td style="padding:10px;">${x.item}</td>
                        <td style="padding:10px;">${x.barcode || 'N/A'}</td>
                        <td style="padding:10px;">${x.qty}</td>
                        <td style="padding:10px;">${x.price.toLocaleString()}</td>
                        <td style="padding:10px;">${x.total.toLocaleString()}</td>
                        <td style="padding:10px; text-align:center;">
                            <button onclick="deleteEntry('out', ${originalIndex})" class="btn-action btn-delete">Del</button>
                        </td>
                    </tr>`;
            }
        });
        outTableBody.innerHTML = htmlOut || `<tr><td colspan="9" style="text-align:center; padding:30px; color:#7f8c8d;">📭 Aaj ki koi sale nahi hai...</td></tr>`;
    }
    
    // Stock Balance
    const balTableBody = document.getElementById('table-balance-body');
    if (balTableBody) {
        const uniqueItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
        balTableBody.innerHTML = uniqueItems.map(name => {
            if (!name) return "";
            const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
            const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
            const pPrice = db.in.find(x => x.item === name)?.price || 0;
            const sPrice = db.out.find(x => x.item === name)?.price || 0;
            const remainingStock = tin - tout;
            
            return `<tr>
                <td style="padding:10px;">${db.in.find(x => x.item === name)?.barcode || 'N/A'}</td>
                <td style="padding:10px; font-weight:600;">${name}</td>
                <td style="padding:10px; color:#2980b9;">${tin}</td>
                <td style="padding:10px; color:#e67e22;">${tout}</td>
                <td style="padding:10px; font-weight:bold; color:${remainingStock < 5 ? '#e74c3c' : '#27ae60'};">${remainingStock}</td>
                <td style="padding:10px; color:#27ae60; font-weight:bold;">PKR ${((sPrice - pPrice) * tout).toLocaleString()}</td>
            </tr>`;
        }).join('') || `<tr><td colspan="6" style="text-align:center; padding:30px; color:#7f8c8d;">📭 Koi item nahi hai</td></tr>`;
    }
    
    updateItemLists();
    updateDashboardStats();
}

// ==========================================
// UPDATE DASHBOARD STATS
// ==========================================
function updateDashboardStats() {
    const totalIn = db.in.reduce((s, x) => s + x.qty, 0);
    const totalOut = db.out.reduce((s, x) => s + x.qty, 0);
    const uniqueItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    const totalRevenue = db.out.reduce((s, x) => s + x.total, 0);
    
    document.getElementById('dash-total-in').textContent = totalIn;
    document.getElementById('dash-total-out').textContent = totalOut;
    document.getElementById('dash-unique-items').textContent = uniqueItems.length;
    document.getElementById('dash-revenue').textContent = 'PKR ' + totalRevenue.toLocaleString();
    
    // Recent Activity
    const activityDiv = document.getElementById('recent-activity');
    if (activityDiv) {
        const allEntries = [...db.in.map(x => ({...x, type: 'IN'})), ...db.out.map(x => ({...x, type: 'OUT'}))];
        allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recent = allEntries.slice(0, 10);
        
        if (recent.length === 0) {
            activityDiv.innerHTML = `<p style="color:#7f8c8d; text-align:center; padding:20px;">No activity yet</p>`;
        } else {
            activityDiv.innerHTML = recent.map(x => `
                <div style="display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #f0f0f0;">
                    <span><span style="font-weight:600;">${x.item}</span> 
                        <span style="color:${x.type === 'IN' ? '#27ae60' : '#e74c3c'}; font-weight:bold;">
                            ${x.type === 'IN' ? '📥 +' : '📤 -'}${x.qty}
                        </span>
                    </span>
                    <span style="color:#7f8c8d; font-size:12px;">${x.date}</span>
                </div>
            `).join('');
        }
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
            const { error } = await _supabase
                .from('KRT')
                .delete()
                .eq('id', record.id);
                
            if (error) {
                showNotification("❌ Cloud delete fail: " + error.message, "error");
                return;
            }
        } catch (err) {
            showNotification("❌ Internet ka masla hai!", "error");
            return;
        }
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
        const { error } = await _supabase
            .from('KRT')
            .update({
                stock_in: type === 'in' ? Number(newQty) : 0,
                stock_out: type === 'out' ? Number(newQty) : 0,
                price: Number(newPrice)
            })
            .eq('id', data.id);
            
        if (error) {
            showNotification("❌ Update failed: " + error.message, "error");
            return;
        }
        
        db[type][index].qty = Number(newQty);
        db[type][index].price = Number(newPrice);
        db[type][index].total = Number(newQty) * Number(newPrice);
        
        saveAndRefresh();
        generateMasterSearch();
        showNotification("✅ Updated successfully!", "success");
    } catch (err) {
        showNotification("❌ Internet issue!", "error");
    }
}

// ==========================================
// MASTER SEARCH
// ==========================================
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;
    
    if (!from || !to) {
        showNotification("⚠️ Pehle Dates select karein!", "warning");
        return;
    }
    
    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);
    
    // Stock IN Table
    const inTable = document.querySelector("#master-in-table");
    if (inTable) {
        inTable.innerHTML = filteredIn.map((x) => {
            const originalIndex = db.in.indexOf(x);
            return `<tr>
                <td style="padding:10px;">${x.date}</td>
                <td style="padding:10px;">${x.item}</td>
                <td style="padding:10px;">${x.vendor}</td>
                <td style="padding:10px;">${x.qty}</td>
                <td style="padding:10px;">${x.price}</td>
                <td style="padding:10px;">${x.total}</td>
                <td style="padding:10px; text-align:center;">
                    <button onclick="editEntry('in', ${originalIndex})" class="btn-action btn-edit">Edit</button>
                    <button onclick="deleteEntry('in', ${originalIndex})" class="btn-action btn-delete">Del</button>
                </td>
            </tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">No records found</td></tr>`;
    }
    
    // Stock OUT Table
    const outTable = document.querySelector("#master-out-table");
    if (outTable) {
        outTable.innerHTML = filteredOut.map((x) => {
            const originalIndex = db.out.indexOf(x);
            return `<tr>
                <td style="padding:10px;">${x.date}</td>
                <td style="padding:10px;">${x.item}</td>
                <td style="padding:10px;">${x.cust}</td>
                <td style="padding:10px;">${x.qty}</td>
                <td style="padding:10px;">${x.price}</td>
                <td style="padding:10px;">${x.total}</td>
                <td style="padding:10px; text-align:center;">
                    <button onclick="editEntry('out', ${originalIndex})" class="btn-action btn-edit">Edit</button>
                    <button onclick="deleteEntry('out', ${originalIndex})" class="btn-action btn-delete">Del</button>
                </td>
            </tr>`;
        }).join('') || `<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">No records found</td></tr>`;
    }
    
    showNotification(`✅ Found ${filteredIn.length + filteredOut.length} records`, "success");
}

// ==========================================
// GENERATE CUSTOM REPORT
// ==========================================
function generateCustomReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;
    
    if (!from || !to) {
        showNotification("⚠️ Dono dates select karein!", "warning");
        return;
    }
    
    document.getElementById('report-period').innerText = `📅 Period: ${from} to ${to}`;
    
    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);
    
    // Stock IN
    const inTable = document.querySelector("#rep-in-table");
    if (inTable) {
        inTable.innerHTML = filteredIn.map(x => `
            <tr>
                <td style="padding:8px;">${x.date}</td>
                <td style="padding:8px;">${x.item}</td>
                <td style="padding:8px;">${x.vendor}</td>
                <td style="padding:8px;">${x.qty}</td>
                <td style="padding:8px;">${x.price}</td>
                <td style="padding:8px;">${x.total.toLocaleString()}</td>
            </tr>
        `).join('') || `<tr><td colspan="6" style="text-align:center; padding:20px; color:#7f8c8d;">No records</td></tr>`;
    }
    
    // Stock OUT
    const outTable = document.querySelector("#rep-out-table");
    if (outTable) {
        outTable.innerHTML = filteredOut.map(x => `
            <tr>
                <td style="padding:8px;">${x.date}</td>
                <td style="padding:8px;">${x.item}</td>
                <td style="padding:8px;">${x.cust}</td>
                <td style="padding:8px;">${x.qty}</td>
                <td style="padding:8px;">${x.price}</td>
                <td style="padding:8px;">${x.total.toLocaleString()}</td>
            </tr>
        `).join('') || `<tr><td colspan="6" style="text-align:center; padding:20px; color:#7f8c8d;">No records</td></tr>`;
    }
    
    const totalIn = filteredIn.reduce((s, x) => s + x.total, 0);
    const totalOut = filteredOut.reduce((s, x) => s + x.total, 0);
    
    // Add summary
    const summary = document.createElement('div');
    summary.style.cssText = `
        display: flex; justify-content: space-around; 
        background: #2c3e50; color: white; 
        padding: 15px; border-radius: 8px; 
        margin-top: 20px; flex-wrap: wrap; gap: 10px;
    `;
    summary.innerHTML = `
        <span>📥 Total IN: PKR ${totalIn.toLocaleString()}</span>
        <span>📤 Total OUT: PKR ${totalOut.toLocaleString()}</span>
        <span style="color: ${totalOut - totalIn >= 0 ? '#2ecc71' : '#e74c3c'}; font-weight:bold;">
            💰 Profit: PKR ${(totalOut - totalIn).toLocaleString()}
        </span>
    `;
    
    const existingSummary = document.querySelector('.report-summary');
    if (existingSummary) existingSummary.remove();
    summary.className = 'report-summary';
    document.getElementById('print-area').appendChild(summary);
    
    showNotification("✅ Report generated!", "success");
}

// ==========================================
// CUSTOMER LEDGER FUNCTIONS
// ==========================================
function updateCustomerDropdown() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    const names = Object.keys(db.ledgers);
    list.innerHTML = names.map(name => `<option value="${name}">`).join('');
}

function saveLedgerEntry() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const date = document.getElementById('led-date').value;
    const item = document.getElementById('led-item').value;
    const ctn = parseFloat(document.getElementById('led-ctn').value) || 0;
    const debit = parseFloat(document.getElementById('led-debit').value) || 0;
    const credit = parseFloat(document.getElementById('led-credit').value) || 0;
    const method = document.getElementById('led-method').value;
    
    if (!name || !date) {
        showNotification("⚠️ Customer Name aur Date lazmi hai!", "warning");
        return;
    }
    
    if (!db.ledgers[name]) {
        db.ledgers[name] = [];
        db.opening_balances[name] = 0;
    }
    
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
    if (name) {
        db.opening_balances[name] = val;
        saveAndRefresh();
        showLedger();
    }
}

function showLedger() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;
    
    const opening = parseFloat(db.opening_balances[name]) || 0;
    document.getElementById('opening-bal').value = opening;
    
    tbody.innerHTML = "";
    if (!name || !db.ledgers[name]) {
        resetLedgerTotals();
        return;
    }
    
    let tCtn = 0, tDebit = 0, tCredit = 0;
    
    db.ledgers[name].forEach((x, index) => {
        tCtn += Number(x.ctn || 0);
        tDebit += Number(x.debit || 0);
        tCredit += Number(x.credit || 0);
        
        tbody.innerHTML += `
            <tr>
                <td style="padding:8px;">${index + 1}</td>
                <td style="padding:8px;">${x.date}</td>
                <td style="padding:8px;">${x.item}</td>
                <td style="padding:8px;">${x.ctn}</td>
                <td style="padding:8px;">${x.debit.toLocaleString()}</td>
                <td style="padding:8px;">${x.credit.toLocaleString()}</td>
                <td style="padding:8px;">${x.method}</td>
                <td style="padding:8px; text-align:center;">
                    <button onclick="editLedger('${name}', ${index})" class="btn-action btn-edit">Edit</button>
                    <button onclick="delLedger('${name}', ${index})" class="btn-action btn-delete">Del</button>
                </td>
            </tr>`;
    });
    
    document.getElementById('total-ctn').innerText = tCtn;
    document.getElementById('total-debit').innerText = tDebit.toLocaleString();
    document.getElementById('total-credit').innerText = tCredit.toLocaleString();
    
    const currentBalance = (opening + tDebit) - tCredit;
    document.getElementById('final-balance').innerText = `💰 Balance: ${currentBalance.toLocaleString()}`;
}

function resetLedgerTotals() {
    document.getElementById('total-ctn').innerText = "0";
    document.getElementById('total-debit').innerText = "0";
    document.getElementById('total-credit').innerText = "0";
    document.getElementById('final-balance').innerText = "💰 Balance: 0";
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
// RENT BOOK FUNCTIONS
// ==========================================
function addRentEntry() {
    const name = document.getElementById('rent-name').value.trim();
    const shop = document.getElementById('rent-shop-no').value;
    const date = document.getElementById('rent-date').value;
    const month = document.getElementById('rent-month').value;
    const debit = parseFloat(document.getElementById('rent-debit').value) || 0;
    const credit = parseFloat(document.getElementById('rent-credit').value) || 0;
    const method = document.getElementById('rent-method').value;
    
    if (!name || !date) {
        showNotification("⚠️ Customer Name aur Date lazmi likhain!", "warning");
        return;
    }
    
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
    let tDebit = 0;
    let tCredit = 0;
    
    const filtered = dbRent.filter(x => x.name.toLowerCase() === searchName.toLowerCase());
    
    if (filtered.length > 0) {
        filtered.forEach((r, index) => {
            tDebit += r.debit;
            tCredit += r.credit;
            
            tbody.innerHTML += `
                <tr>
                    <td style="padding:8px;">${r.shop || 'N/A'}</td>
                    <td style="padding:8px;">${r.date}</td>
                    <td style="padding:8px;">${r.month}</td>
                    <td style="padding:8px; color:#e74c3c; font-weight:600;">${r.debit.toLocaleString()}</td>
                    <td style="padding:8px; color:#27ae60; font-weight:600;">${r.credit.toLocaleString()}</td>
                    <td style="padding:8px;">${r.method}</td>
                    <td style="padding:8px; text-align:center;">
                        <button onclick="deleteRentEntry(${index})" class="btn-action btn-delete">Del</button>
                    </td>
                </tr>`;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#7f8c8d;">📭 Naya Customer hai ya naam sahi nahi likha...</td></tr>`;
    }
    
    document.getElementById('rent-total-debit').innerText = tDebit.toLocaleString();
    document.getElementById('rent-total-credit').innerText = tCredit.toLocaleString();
    document.getElementById('rent-final-balance').innerText = (tDebit - tCredit).toLocaleString();
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
    
    const selectedPerms = [];
    document.querySelectorAll('.perm:checked').forEach(cb => {
        selectedPerms.push(cb.value);
    });
    
    if (!name || !id || !pass) {
        showNotification("⚠️ Bilal Bhai, saari details bharein!", "warning");
        return;
    }
    
    extraUsers.push({ id, pass, name, perms: selectedPerms });
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
    
    tbody.innerHTML = extraUsers.map((u, index) => `
        <tr>
            <td style="padding:10px;">${u.id}</td>
            <td style="padding:10px;">${u.name}</td>
            <td style="padding:10px;"><small>${u.perms.join(', ')}</small></td>
            <td style="padding:10px; text-align:center;">
                <button onclick="deleteExtraUser(${index})" class="btn-action btn-delete">Del</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center; padding:20px; color:#7f8c8d;">No users created yet</td></tr>`;
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
    const pages = document.querySelectorAll('.erp-page');
    pages.forEach(p => p.style.display = 'none');
    
    document.getElementById(pageId).style.display = 'block';
    document.getElementById('page-title').innerHTML = 
        `<i class="fas fa-chart-line" style="color:#f1c40f; margin-right:12px;"></i>KRT TRADERS ERP - ${title}`;
    
    // Mobile sidebar close
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.left = "-260px";
        document.getElementById('main-content').style.marginLeft = "0";
    }
}

// ==========================================
// LOGOUT
// ==========================================
function logout() {
    if (!confirm("🚪 Bilal Bhai, kya aap waqai logout karna chahte hain?")) return;
    
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    location.reload();
}

// ==========================================
// PRINT SECTION
// ==========================================
function printSection() {
    if (!db || !db.in) {
        showNotification("⚠️ Pehle data mukammal load hone dein!", "warning");
        return;
    }
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
    const allItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    list.innerHTML = allItems.map(name => `<option value="${name}">`).join('');
}

// ==========================================
// APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    // Show welcome animation first
    startWelcomeAnimation();
    
    // Initialize
    renderAll();
    renderRentTable();
    loadUserTable();
    updateCustomerDropdown();
    updateItemLists();
    
    // Cloud sync
    if (navigator.onLine) {
        await syncAllCloudData();
    }
    
    // Restore session
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('userRole');
    
    if (isLoggedIn === 'true') {
        if (role === 'admin') showSystem('admin');
        else if (role === 'staff') showSystem('staff');
        else if (role === 'manager') showSystem('manager');
    }
});

// ==========================================
// RENT NAME INPUT LISTENER (Live Search)
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const rentNameField = document.getElementById('rent-name');
    if (rentNameField) {
        rentNameField.addEventListener('input', renderRentTable);
    }
});

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', (e) => {
    // Ctrl + S to sync
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        syncAllCloudData();
    }
    // Escape to close sidebar
    if (e.key === 'Escape') {
        const sb = document.getElementById('sidebar');
        if (sb && sb.style.left === "0px") {
            toggleSidebar();
        }
    }
});

console.log("🚀 KRT TRADERS ERP v5.0 Loaded Successfully!");
console.log("📦 Developed by Bilal Suleman");
console.log("☁️ Cloud Sync Enabled");
