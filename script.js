

const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79'; // Yahan Secret key ki jagah Publishable key dalein
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);


// --- CLOUD SE DATA UTFAYEN KA FUNCTION ---
// --- CLOUD DATA FETCH ---
async function fetchCloudData() {
    try {
        console.log("Cloud se latest data load ho raha hai...");

        const { data, error } = await _supabase
            .from('KRT')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Cloud data fetch error:", error);
            alert("Cloud se data lane mein masla aya: " + error.message);
            return;
        }

        // Purana data clear
        db.in = [];
        db.out = [];

        if (data && data.length > 0) {

            data.forEach(row => {

                let rowDate =
                    row.Date ||
                    (row.created_at
                        ? row.created_at.split('T')[0]
                        : new Date().toISOString().split('T')[0]);

                // STOCK IN
                if (Number(row.stock_in) > 0) {

                    db.in.push({
                        id: row.id,
                        date: rowDate,
                        vendor: row.vendor_name || "Factory",
                        item: row.item_name || "",
                        qty: Number(row.stock_in) || 0,
                        price: Number(row.price) || 0,
                        total: (Number(row.stock_in) || 0) * (Number(row.price) || 0)
                    });

                }

                // STOCK OUT
                else if (Number(row.stock_out) > 0) {

                    db.out.push({
                        id: row.id,
                        date: rowDate,
                        cust: row.customer_name || "General Sale",
                        item: row.item_name || "",
                        qty: Number(row.stock_out) || 0,
                        price: Number(row.price) || 0,
                        total: (Number(row.stock_out) || 0) * (Number(row.price) || 0)
                    });

                }

            });

        }

        // Save Local
        localStorage.setItem('krt_erp_data', JSON.stringify(db));

        // Refresh UI
        renderAll();

        console.log("Cloud Sync Complete");

    } catch (err) {
        console.error("Connection Error:", err);
        alert("Internet ya server ka masla hai!");
    }
}
        // 2. Apne local 'db' object ko khali kar ke naye siray se bharhein
        db.in = [];
        db.out = [];

        if (data) {
            data.forEach(row => {
                // Agar stock_in bara hai zero se toh yeh IN ki entry hai
                if (row.stock_in > 0) {
                    db.in.push({
                        id: row.id,
                        date: row.Date,
                        vendor: row.vendor_name || 'factory',
                        item: row.item_name,
                        qty: row.stock_in,
                        price: row.price,
                        total: row.stock_in * row.price
                    });
                } 
                // Agar stock_out bara hai zero se toh yeh OUT ki entry hai
                else if (row.stock_out > 0) {
                    db.out.push({
                        id: row.id,
                        date: row.Date,
                        cust: row.customer_name || 'General Sale',
                        item: row.item_name,
                        qty: row.stock_out,
                        price: row.price,
                        total: row.stock_out * row.price
                    });
                }
            });
        }

        // 3. LocalStorage mein save karein aur poori screen refresh kar dein
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        renderAll();
        alert("Zabardast! Cloud ka sara data is laptop par sync ho gaya hai.");

    } catch (err) {
        console.error("Fetch Error:", err);
        alert("Internet connection check karein!");
    }
}

// Jab bhi koi user login kare ya page reload ho, toh automatic cloud se data uthaye
window.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        fetchCloudData();
    }
});

/// --- UPDATED LOGIN SYSTEM ---
// --- MERGED LOGIN & PERMISSIONS SYSTEM ---

function login() {
    let userField = document.getElementById('user');
    let passField = document.getElementById('pass');
    
    if(!userField || !passField) return;

    let u = userField.value.trim().toLowerCase();
    let p = passField.value.trim();

    // 1. Bilal Bhai (Admin)
    if (u === "admin" && p === "123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        showSystem("admin");
    } 
    // 2. Ali Bhai (Staff)
    else if (u === "ali" && p === "123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'staff');
        showSystem("staff");
    } 
    // 3. Sattar Bhai (Manager)
    else if (u === "sattar" && p === "123") {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'manager');
        showSystem("manager");
    } 
    // 4. Multi-User (Extra Users check)
    else {
        let found = extraUsers.find(user => user.id === u && user.pass === p);
       if (isLoggedIn === 'true' && savedRole) {
    showSystem(savedRole);
    document.getElementById('toggle-btn').style.display = "block";
}
        else {
            alert("Ghalat ID ya Password!");
        }
    }
}
function showSystem(roleOrUser) {
    // UI Screens dikhao
    document.getElementById('login-screen').style.display = "none";
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('main-content').style.display = "block";
    
    if(document.getElementById('toggle-btn')) {
        document.getElementById('toggle-btn').style.display = "block";
    }

    // Agar roleOrUser ek object hai (Matlab naya user hai)
    if (typeof roleOrUser === "object") {
        applyDynamicPermissions(roleOrUser);
    } 
    // Agar simple string hai (Admin, Staff, Manager)
    else {
        const menuItems = document.querySelectorAll('#sidebar ul li');
        menuItems.forEach(item => item.style.display = "block"); // Reset

        if(roleOrUser === "staff") {
            menuItems.forEach(item => {
                let text = item.innerText;
                if(!text.includes("Dashboard") && !text.includes("Daily Report") && !text.includes("Stock Balance")) { 
                    item.style.display = "none";
                }
            });
            switchPage('page-Report', 'Daily Report');
        } 
        else if(roleOrUser === "manager") {
            menuItems.forEach(item => {
                let text = item.innerText;
                if(!text.includes("Dashboard") && !text.includes("Customer Ledgers") && !text.includes("Market Rent Book") && !text.includes("Stock Balance")) { 
                    item.style.display = "none";
                }
            });
            switchPage('page-customer-ledgers', 'Customer Ledgers');
        }
    }
    
    renderAll();
}
async function addIn() {
    // 1. UI se values lena
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value;
    const item = document.getElementById('in-item').value.trim();
    const barcode = document.getElementById('in-barcode').value; 
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value);

    // 2. Mukammal Validation
    if (!date || !item || qty <= 0) {
        alert("Bilal Bhai, details lazmi likhain!");
        return;
    }

    try {
        console.log("Cloud par data bheja ja raha hai...");

        // 3. Cloud Sync (Supabase) - 'Date' column ke sath match kiya
        const { data, error } = await _supabase.from('KRT').insert([
            { 
                Date: date, // 'created_at' ki jagah ab aapka sahi column 'Date' chalega
                item_name: item, 
                stock_in: qty, 
                stock_out: 0,
                price: price, 
                vendor_name: vendor
            }
        ]).select(); // Yeh line Cloud se auto-generated ID wapas degi
        
        if (error) {
            console.error("Supabase error:", error);
            alert("Cloud sync fail: " + error.message);
            return;
        }

        // 4. Local DB Update (Cloud ID ke sath)
        if (data && data.length > 0) {
            db.in.push({ 
                id: data[0].id, // Cloud wali ID yahan save ho gayi
                date: date, 
                vendor: vendor, 
                item: item, 
                barcode: barcode, 
                qty: qty, 
                price: price, 
                total: qty * price 
            });

            // 5. Save and Refresh
            saveAndRefresh();
            
            // Form Clear
            document.getElementById('in-item').value = "";
            document.getElementById('in-qty').value = "";
            document.getElementById('in-price').value = "";
            
            alert("Stock IN Cloud aur Local dono par save ho gaya!");
        }

    } catch (err) {
        console.error("Connection Error:", err);
        alert("Internet ka masla hai ya connection unstable hai.");
    }
}
// --- 1. LIVE STOCK VIEW FUNCTION ---
function showLiveStock(itemName) {
    const statusDiv = document.getElementById('stock-status');
    if (!itemName || itemName.trim() === "") {
        statusDiv.innerHTML = "";
        return;
    }

    // Aapki global database 'db' se calculation
    // 'db.in' (Stock In) aur 'db.out' (Stock Out) ko filter kar raha hai
    let totalIn = db.in
        .filter(x => x.item === itemName)
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);

    let totalOut = db.out
        .filter(x => x.item === itemName)
        .reduce((sum, x) => sum + Number(x.qty || 0), 0);

    let balance = totalIn - totalOut;

    // Styling aur Display
    if (balance > 0) {
        statusDiv.style.color = "#27ae60"; // Green for Available
        statusDiv.innerHTML = "✅ Available Stock: " + balance;
    } else if (balance <= 0 && totalIn > 0) {
        statusDiv.style.color = "#e74c3c"; // Red for Out of Stock
        statusDiv.innerHTML = "⚠️ Out of Stock! (Balance: " + balance + ")";
    } else {
        statusDiv.style.color = "#7f8c8d"; // Gray for New Item
        statusDiv.innerHTML = "ℹ️ No record found for this item.";
    }
}
// --- 2. DROPDOWN LIST UPDATE ---
function updateItemLists() {
    const list = document.getElementById('items-list');
    if (!list) return;
    const allItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    list.innerHTML = allItems.map(name => `<option value="${name}">`).join('');
}

// --- 3. THE COMPLETE STOCK OUT FUNCTION ---
// --- UPDATED STOCK OUT FUNCTION ---
// ==========================================
// 1. MUKAMMAL STOCK OUT ENTRY FUNCTION
// ==========================================
async function addOut() {
    // UI se values lena
    const item = document.getElementById('out-item').value.trim();
    const qty = Number(document.getElementById('out-qty').value);
    const date = document.getElementById('out-date').value;
    const price = Number(document.getElementById('out-price')?.value || 0);
    const custName = document.getElementById('out-customer')?.value || "General Sale";

    // A. Mukammal Validation
    if (!item || qty <= 0 || !date) {
        alert("Bilal Bhai, saari details bharein!");
        return;
    }

    // B. Real-time Stock Check (Laptop ke local data se check ho raha hai)
    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const availableStock = tin - tout;

    if (qty > availableStock) {
        alert(`Stock kam hai! Sirf ${availableStock} mojud hain.`);
        return;
    }

    // C. Supabase Cloud Sync
    try {
        console.log("Cloud sync shuru...");
        
        // .select() lagaya hai taake Supabase se auto-generated ID mil jaye
        // 'created_at' hata kar aapke database table ka asli 'Date' column lagaya hai
        const { data, error } = await _supabase.from('KRT').insert([
            { 
                Date: date, 
                item_name: item, 
                stock_in: 0, 
                stock_out: qty,
                price: price,
                customer_name: custName
            }
        ]).select();

        if (error) {
            console.error("Supabase Error:", error);
            alert("Cloud sync fail ho gaya! Check connection.");
            return;
        }

        // D. Local Database Update (Jab Cloud confirm karde tabhi laptop mein save karein)
        if (data && data.length > 0) {
            db.out.push({ 
                id: data[0].id, // Cloud ki ID yahan local mein save ho rahi hai
                item: item, 
                qty: qty, 
                date: date, 
                cust: custName, 
                price: price,
                total: qty * price 
            });

            // E. Save to LocalStorage and Refresh UI
            saveAndRefresh(); 
            
            // F. Form Clear
            document.getElementById('out-qty').value = "";
            if(document.getElementById('out-customer')) document.getElementById('out-customer').value = "";
            document.getElementById('stock-status').innerText = ""; 
            
            alert("Stock OUT Cloud aur Local dono jagah save ho gaya!");
        }

    } catch (err) {
        console.error("Critical Error:", err);
        alert("Internet ya Server ka masla hai!");
    }
}

// ==========================================
// 2. MUKAMMAL MAIN RENDER FUNCTION (FIXED)
// ==========================================
function renderAll() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const todayInBody = document.getElementById('today-list-in');
    const outTableBody = document.querySelector('#table-out tbody');
    const balTableBody = document.querySelector('#table-balance tbody');

    // A. Rendering Today's IN (Original Database Indexing Ke Sath)
    if(todayInBody) {
        let htmlIn = "";
        let counterIn = 1;
        db.in.forEach((x, originalIndex) => {
            if (x.date === today) {
                htmlIn += `
                    <tr>
                        <td>${counterIn++}</td>
                        <td>${x.item}</td>
                        <td>${x.vendor}</td>
                        <td>${x.qty}</td>
                        <td>${x.price.toLocaleString()}</td>
                        <td>${x.total.toLocaleString()}</td>
                        <td><button onclick="deleteEntry('in', ${originalIndex})" style="background:#e74c3c; color:white; border:none; padding:2px 6px; border-radius:3px; cursor:pointer;">🗑 Del</button></td>
                    </tr>`;
            }
        });
        todayInBody.innerHTML = htmlIn || `<tr><td colspan="7" style="text-align:center; color:gray;">Aaj ki koi entry nahi hai...</td></tr>`;
    }

    // B. Rendering Today's OUT (Original Database Indexing Ke Sath taake galat item delete na ho)
    if(outTableBody) {
        let htmlOut = "";
        let counterOut = 1;
        db.out.forEach((x, originalIndex) => {
            if (x.date === today) {
                htmlOut += `
                    <tr>
                        <td>${counterOut++}</td>
                        <td>${x.date}</td>
                        <td>${x.cust}</td>
                        <td>${x.item}</td>
                        <td>${x.bc || '0'}</td>
                        <td>${x.qty}</td>
                        <td>${x.price.toLocaleString()}</td>
                        <td>${x.total.toLocaleString()}</td>
                        <td><button onclick="deleteEntry('out', ${originalIndex})" style="background:#e74c3c; color:white; border:none; padding:2px 6px; border-radius:3px; cursor:pointer;">Del</button></td>
                    </tr>`;
            }
        });
        outTableBody.innerHTML = htmlOut || `<tr><td colspan="9" style="text-align:center; color:gray;">Aaj ki koi sale nahi hai...</td></tr>`;
    }

    // C. Balance & Profit Table (Commas formatting ke sath)
    if(balTableBody) {
        const uniqueItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
        balTableBody.innerHTML = uniqueItems.map(name => {
            if(!name) return "";
            const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
            const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
            const pPrice = db.in.find(x => x.item === name)?.price || 0;
            const sPrice = db.out.find(x => x.item === name)?.price || 0;
            const remainingStock = tin - tout;
            
            return `<tr>
                <td>${db.in.find(x => x.item === name)?.barcode || 'N/A'}</td>
                <td style="font-weight:bold;">${name}</td>
                <td style="color:blue;">${tin}</td>
                <td style="color:orange;">${tout}</td>
                <td style="font-weight:bold; color:${remainingStock < 5 ? 'red' : 'green'};">${remainingStock}</td>
                <td style="color:green; font-weight:bold;">${((sPrice - pPrice) * tout).toLocaleString()}</td>
            </tr>`;
        }).join('');
    }

    // Refresh Dropdowns
    if (typeof updateItemLists === "function") {
        updateItemLists();
    }
}
// --- 6. REPORTS & SEARCH ---
function generateCustomReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;

    if(!from || !to) { alert("Dono dates select karein!"); return; }

    document.getElementById('report-period').innerText = `Period: ${from} to ${to}`;

    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    let inHTML = filteredIn.map(x => `<tr><td>${x.date}</td><td>${x.item}</td><td>${x.vendor}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td></tr>`).join('');
    document.querySelector("#rep-in-table tbody").innerHTML = inHTML || "<tr><td colspan='6'>No Record</td></tr>";

    let outHTML = filteredOut.map(x => `<tr><td>${x.date}</td><td>${x.item}</td><td>${x.cust}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td></tr>`).join('');
    document.querySelector("#rep-out-table tbody").innerHTML = outHTML || "<tr><td colspan='6'>No Record</td></tr>";

    const totalIn = filteredIn.reduce((s, x) => s + x.total, 0);
    const totalOut = filteredOut.reduce((s, x) => s + x.total, 0);
    document.getElementById('sum-in').innerText = "PKR " + totalIn.toLocaleString();
    document.getElementById('sum-out').innerText = "PKR " + totalOut.toLocaleString();
    document.getElementById('sum-profit').innerText = "PKR " + (totalOut - totalIn).toLocaleString();
}

// --- 1. SAHI DELETE FUNCTION (Cloud + Local) ---
async function deleteEntry(type, index) {
    if(confirm("Bilal Bhai, kya aap waqai ye record delete karna chahte hain?")) {
        const record = db[type][index];

        // 1. Agar record ke paas cloud ki ID hai, to pehle cloud se urao
        if (record && record.id) {
            try {
                const { error } = await _supabase
                    .from('KRT')
                    .delete()
                    .eq('id', record.id);

                if (error) {
                    alert("Cloud se delete fail ho gaya: " + error.message);
                    return; // Agar cloud se delete na ho, to local se bhi mat urao
                }
            } catch (err) {
                alert("Internet ka masla hai, cloud se delete nahi ho saka.");
                return;
            }
        }

        // 2. Local database se delete karein (Is se laptop ka apna data theek hoga)
        db[type].splice(index, 1);
        
        // 3. Laptop ke local storage mein save karein aur UI refresh karein
        saveAndRefresh(); // Is se stock balance ka table khud hi naye siray se calculate hoga
        
        // 4. Agar Master Search khuli hai to usay bhi refresh karo
        if(document.getElementById('master-in-table')) {
            generateMasterSearch(); 
        }
        
        alert("Record is laptop aur cloud dono se delete ho gaya! Dosre laptop par 'Fetch' dabein.");
    }
}
// --- 2. MASTER SEARCH RENDER (Sahi Buttons ke sath) ---
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;

    if(!from || !to) { alert("Pehle Dates select karein!"); return; }

    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    // Stock IN Table
    document.querySelector("#master-in-table tbody").innerHTML = filteredIn.map((x) => {
        const originalIndex = db.in.indexOf(x); 
        return `<tr>
            <td>${x.date}</td><td>${x.item}</td><td>${x.vendor}</td>
            <td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
            <td>
                <button onclick="editEntry('in', ${originalIndex})" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:3px;">Edit</button>
                <button onclick="deleteEntry('in', ${originalIndex})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px;">Del</button>
            </td>
        </tr>`;
    }).join('') || "<tr><td colspan='7'>No Record</td></tr>";

    // Stock OUT Table
    document.querySelector("#master-out-table tbody").innerHTML = filteredOut.map((x) => {
        const originalIndex = db.out.indexOf(x);
        return `<tr>
            <td>${x.date}</td><td>${x.item}</td><td>${x.cust}</td>
            <td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
            <td>
                <button onclick="editEntry('out', ${originalIndex})" style="background:#3498db; color:white; border:none; padding:5px 10px; border-radius:3px;">Edit</button>
                <button onclick="deleteEntry('out', ${originalIndex})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:3px;">Del</button>
            </td>
        </tr>`;
    }).join('') || "<tr><td colspan='7'>No Record</td></tr>";
}
// 2. Specialized Delete for Master Search
function deleteEntryMaster(type, index) {
    if(confirm("Kya aap waqai ye record delete karna chahte hain?")) {
        db[type].splice(index, 1);
        saveAndRefresh(); // LocalStorage update aur main tables refresh
        generateMasterSearch(); // Master Search table ko foran refresh karein
    }
}

// 3. Edit Entry Function
function editEntry(type, index) {
    const data = db[type][index];
    
    const newQty = prompt(`Nayi Quantity likhain (Purani: ${data.qty}):`, data.qty);
    if (newQty === null) return; // Cancel press kiya

    const newPrice = prompt(`Nayi Price likhain (Purani: ${data.price}):`, data.price);
    if (newPrice === null) return; // Cancel press kiya

    // Data Update
    db[type][index].qty = Number(newQty);
    db[type][index].price = Number(newPrice);
    db[type][index].total = Number(newQty) * Number(newPrice);
    
    saveAndRefresh(); // Database save karein
    generateMasterSearch(); // List refresh karein
    alert("Record successfully update ho gaya!");
}


// --- 1. EXTRA USERS DATABASE ---
// Yeh sirf un accounts ke liye hai jo aap Multi-User tab se banayenge
let extraUsers = JSON.parse(localStorage.getItem('krt_extra_users')) || [];

// --- 2. MULTI-USER LOGIN LOGIC (Existing login ke andar fit karein) ---
// Isko apne purane login function ke bilkul niche check karwane ke liye istemal karein
function checkExtraUsers(u, p) {
    let found = extraUsers.find(user => user.id === u && user.pass === p);
    if (found) {
        // Naye user ko login karwao aur permissions apply karo
        document.getElementById('login-screen').style.display = "none";
        document.getElementById('sidebar').style.display = "block";
        document.getElementById('main-content').style.display = "block";
        
        applyDynamicPermissions(found);
        alert("Khush Amdeed, " + found.name + "!");
        return true; 
    }
    return false;
}

// --- 3. PERMISSIONS CONTROL (Naye Users ke liye) ---
function applyDynamicPermissions(user) {
    const menuItems = document.querySelectorAll('#sidebar ul li');
    menuItems.forEach(item => {
        let onclickAttr = item.getAttribute('onclick') || "";
        
        // Dashboard hamesha sabko dikhega
        if(onclickAttr.includes('page-dashboard')) {
            item.style.display = "block";
            return;
        }

        // Check karein ke user ke paas is page ki permission hai ya nahi
        let isAllowed = user.perms.some(p => onclickAttr.includes(p));
        item.style.display = isAllowed ? "block" : "none";
    });
    renderAll();
}

// --- 4. MULTI-USER MANAGEMENT (Sirf Admin Tab ke liye) ---
function createNewUser() {
    let name = document.getElementById('new-username').value;
    let id = document.getElementById('new-userid').value;
    let pass = document.getElementById('new-password').value;
    
    let selectedPerms = [];
    document.querySelectorAll('.perm:checked').forEach(cb => {
        selectedPerms.push(cb.value);
    });

    if(!name || !id || !pass) { 
        alert("Bilal Bhai, saari details bharein!"); 
        return; 
    }

    // Naya user save karein
    extraUsers.push({ id: id, pass: pass, name: name, perms: selectedPerms });
    localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
    
    alert("Naya Account Ban Gaya!");
    loadUserTable(); // Table refresh
    
    // Form clear karein
    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';
    document.querySelectorAll('.perm').forEach(cb => cb.checked = false);
}

function loadUserTable() {
    let tbody = document.getElementById('user-table-body');
    if(!tbody) return;
    
    tbody.innerHTML = extraUsers.map((u, index) => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td><small>${u.perms.join(', ')}</small></td>
            <td><button onclick="deleteExtraUser(${index})" style="background:red; color:white; border:none; border-radius:3px; cursor:pointer;">Del</button></td>
        </tr>
    `).join('');
}

function deleteExtraUser(index) {
    if(confirm("Kya aap is user ko delete karna chahte hain?")) {
        extraUsers.splice(index, 1);
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        loadUserTable();
    }
}


// Database structure check
if (!db.ledgers) db.ledgers = {}; 
if (!db.opening_balances) db.opening_balances = {};

// Drop-down list ko update karne ke liye
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

    if (!name || !date) { alert("Customer Name aur Date lazmi hai!"); return; }

    // Agar naya customer hai to ledger create karein
    if (!db.ledgers[name]) {
        db.ledgers[name] = [];
        db.opening_balances[name] = 0;
    }

    const entry = { date, item, ctn, debit, credit, method };
    db.ledgers[name].push(entry);

    saveAndRefresh();
    updateCustomerDropdown();
    showLedger();
    
    // Reset form fields
    document.getElementById('led-item').value = "";
    document.getElementById('led-ctn').value = "0";
    document.getElementById('led-debit').value = "0";
    document.getElementById('led-credit').value = "0";
    alert("Entry Save Ho Gayi!");
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

// --- CUSTOMER LEDGER FIXED ---
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
                <td>${index + 1}</td>
                <td>${x.date}</td>
                <td>${x.item}</td>
                <td>${x.ctn}</td>
                <td>${x.debit.toLocaleString()}</td>
                <td>${x.credit.toLocaleString()}</td>
                <td>${x.method}</td>
                <td>
                    <button onclick="editLedger('${name}', ${index})" style="background:#3498db; color:white; border:none; padding:3px 7px; border-radius:3px; cursor:pointer;">Edit</button>
                    <button onclick="delLedger('${name}', ${index})" style="background:#e74c3c; color:white; border:none; padding:3px 7px; border-radius:3px; cursor:pointer;">Del</button>
                </td>
            </tr>`;
    });

    document.getElementById('total-ctn').innerText = tCtn;
    document.getElementById('total-debit').innerText = tDebit.toLocaleString();
    document.getElementById('total-credit').innerText = tCredit.toLocaleString();
    
    // Asal calculation: Opening + Udhaar (Debit) - Wasuli (Credit)
    const currentBalance = (opening + tDebit) - tCredit;
    document.getElementById('final-balance').innerText = "Kul Udhaar: " + currentBalance.toLocaleString();
}

// Ledger Delete Function
function delLedger(custName, index) {
    if(confirm("Kya ye entry delete kar dein?")) {
        db.ledgers[custName].splice(index, 1);
        saveAndRefresh();
        showLedger();
    }
}

// Ledger Edit Function
function editLedger(custName, index) {
    let entry = db.ledgers[custName][index];
    let nDebit = prompt("Naya Debit (Udhaar):", entry.debit);
    let nCredit = prompt("Naya Credit (Wasuli):", entry.credit);
    
    if(nDebit !== null && nCredit !== null) {
        db.ledgers[custName][index].debit = Number(nDebit);
        db.ledgers[custName][index].credit = Number(nCredit);
        saveAndRefresh();
        showLedger();
    }
}
// Rent Database
let dbRent = JSON.parse(localStorage.getItem('krt_rent_data')) || [];

function addRentEntry() {
    const nameInput = document.getElementById('rent-name').value.trim();
    const shopInput = document.getElementById('rent-shop-no').value;
    const dateInput = document.getElementById('rent-date').value;
    const monthInput = document.getElementById('rent-month').value;
    const debitInput = parseFloat(document.getElementById('rent-debit').value) || 0;
    const creditInput = parseFloat(document.getElementById('rent-credit').value) || 0;
    const methodInput = document.getElementById('rent-method').value;

    if(!nameInput || !dateInput) {
        alert("Bilal Bhai, Customer ka Naam aur Date lazmi likhain!");
        return;
    }

    // Naya Entry Object
    const newEntry = {
        name: nameInput,
        shop: shopInput,
        date: dateInput,
        month: monthInput,
        debit: debitInput,
        credit: creditInput,
        method: methodInput
    };

    // Data Save karein
    dbRent.push(newEntry);
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));

    alert(nameInput + " ki entry save ho gayi!");
    
    // Foran Ledger Update karein (Wahi logic jo aapne manga)
    renderRentTable(); 
}

// Yeh function naam check karke table update karega
function renderRentTable() {
    const tbody = document.getElementById('rent-main-rows');
    const searchName = document.getElementById('rent-name').value.trim();
    if(!tbody) return;

    tbody.innerHTML = "";
    let tDebit = 0;
    let tCredit = 0;

    // Filter: Agar naam likha hai toh sirf uska data dikhao, warna khali rakho ya sab dikhao
    const filtered = dbRent.filter(x => x.name.toLowerCase() === searchName.toLowerCase());

   if(filtered.length > 0) {
        filtered.forEach((r, index) => {
            tDebit += r.debit;
            tCredit += r.credit;
            
            tbody.innerHTML += `
                <tr>
                    <td>${r.shop}</td>
                    <td>${r.date}</td>
                    <td>${r.month}</td>
                    <td style="color:red;">${r.debit.toLocaleString()}</td>
                    <td style="color:green;">${r.credit.toLocaleString()}</td>
                    <td>${r.method}</td>
                    <td><button onclick="deleteRent(${index})" style="background:red; color:white; border:none; padding:2px 8px; border-radius:3px;">Del</button></td>
                </tr>`;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:gray;">Naya Customer hai ya naam sahi nahi likha...</td></tr>`;
    }

    // Totals Update
    document.getElementById('rent-total-debit').innerText = tDebit.toLocaleString();
    document.getElementById('rent-total-credit').innerText = tCredit.toLocaleString();
    document.getElementById('rent-final-balance').innerText = (tDebit - tCredit).toLocaleString();
}

// Naam likhte hi table update ho (Live Search jaisa)
document.getElementById('rent-name').addEventListener('input', renderRentTable);

// --- SIDEBAR TOGGLE LOGIC ---
function toggleSidebar() {
    let sb = document.getElementById('sidebar');
    let mc = document.getElementById('main-content');

    if (sb.style.left === "0px" || sb.style.left === "") {
        // Sidebar ko hide karo
        sb.style.left = "-250px";
        mc.style.marginLeft = "0";
    } else {
        // Sidebar ko wapas lao
        sb.style.left = "0px";
        mc.style.marginLeft = "250px";
    }
}

// --- LOGOUT LOGIC (MUKAMMAL) ---
function logout() {
    // 1. Confirm karein ke Bilal Bhai waqai logout karna chahte hain
    if (confirm("Bilal Bhai, kya aap waqai system band (Logout) karna chahte hain?")) {
        
        // 2. LocalStorage se login data khatam karein
        localStorage.removeItem('isLoggedIn'); 
        localStorage.removeItem('userRole');
        
        // 3. (Optional) Agar aapne koi aur session data rakha hai toh wo bhi clear kardein
        // localStorage.clear(); // Yeh saara data urha dega, isliye soch samajh kar use karein

        // 4. Page ko reload karein taake login screen wapas aa jaye
        // Reload karne se code ka reset hona pakka ho jata hai
        location.reload(); 
        
        // 5. User ko login screen par dhakelna (Extra safety)
        setTimeout(() => {
            window.location.href = "#"; // Ya jo bhi aapka login page/section hai
        }, 100);
    }
}
// --- LOGIN FUNCTION UPDATE ---
// Apne purane login() function ke andar jahan system show hota hai, 
// wahan ye line lazmi add karein:
// document.getElementById('toggle-btn').style.display = "block";


function switchPage(pageId, title) {
    // 1. Saare pages hide karo
    let pages = document.querySelectorAll('.erp-page');
    pages.forEach(p => p.style.display = 'none');

    // 2. Selected page dikhao
    document.getElementById(pageId).style.display = 'block';
    document.getElementById('page-title').innerText = "KRT TRADERS ERP - " + title;

    // 3. AGAR MOBILE HAI, TO SIDEBAR BAND KAR DO
    if (window.innerWidth <= 768) {
        let sb = document.getElementById('sidebar');
        let mc = document.getElementById('main-content');
        
        sb.style.left = "-250px";
        mc.style.marginLeft = "0";
    }
}

async function addStockData(itemName, stockIn, stockOut) {
  const { data, error } = await _supabase
    .from('KRT')
    .insert([
      { 
        item_name: itemName, 
        stock_in: stockIn, 
        stock_out: stockOut 
      }
    ]);

  if (error) {
    console.error('Error inserting data:', error);
  } else {
    alert('Stock updated successfully!');
  }
}


async function fetchCloudData() {
    try {
        console.log("Cloud sync shuru ho raha hai...");
        
      
// --- AUTO-CHECK ON LOAD ---
// Jab bhi page refresh ho ya dobara khule, ye check karega ke user login hai ya nahi
window.addEventListener('load', () => {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const savedRole = localStorage.getItem('userRole');

    if (isLoggedIn === 'true' && savedRole) {
        showSystem(savedRole);
        document.getElementById('toggle-btn').style.display = "block";
    } else {
        document.getElementById('login-screen').style.display = "flex";
        document.getElementById('sidebar').style.display = "none";
        document.getElementById('main-content').style.display = "none";
    }
});
// Jab page load ho, to automatic cloud se data khinche
window.addEventListener('DOMContentLoaded', (event) => {
    if (localStorage.getItem('isLoggedIn') === 'true') {
        console.log("System loaded. Fetching fresh cloud data...");
        fetchCloudData(); // Yeh function cloud se data la kar db.in aur db.out ko refresh kar dega
    }
});
wo na type kty huy code pura ni aya ya baki ka code hai ab mera data sai save hoga na 
