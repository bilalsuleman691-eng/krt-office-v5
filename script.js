// --- 1. DATABASE INITIALIZATION ---
let db = JSON.parse(localStorage.getItem('krt_erp_data')) || {
    in: [],
    out: []
};

function saveAndRefresh() {
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    renderAll();
}

/// --- UPDATED LOGIN SYSTEM ---
function login() {
    let u = document.getElementById('user').value.trim();
    let p = document.getElementById('pass').value.trim();

    // 1. Full Access (Admin)
    if(u === "admin" && p === "123") {
        showSystem("admin");
        alert("Khush Amdeed, Bilal Bhai (Admin)!");
    } 
    // 2. Report Only Access (Staff)
    else if(u === "ali" && p === "123") {
        showSystem("staff");
        alert("Staff Login: Sirf Reports ka access hai.");
    } 
    // 3. Ledger & Rent Access (Manager) - NAYA ACCOUNT
    else if(u === "sattar" && p === "786") {
        showSystem("manager");
        alert("Manager Login: Ledgers aur Rent Book ka access hai.");
    }
    else {
        alert("Ghalat ID ya Password!");
    }
}

function showSystem(role) {
    document.getElementById('login-screen').style.display = "none";
    document.getElementById('sidebar').style.display = "block";
    document.getElementById('main-content').style.display = "block";

    const menuItems = document.querySelectorAll('#sidebar ul li');
    
    // Pehle saare menu items dikhao (Reset)
    menuItems.forEach(item => item.style.display = "block");

    if(role === "staff") {
        menuItems.forEach(item => {
            // Sirf Dashboard aur Daily Report dikhao
            if(!item.innerText.includes("Dashboard") && !item.innerText.includes("Daily Report")) {
                item.style.display = "none";
            }
        });
        switchPage('page-Report', 'Daily Report');
    } 
    else if(role === "manager") {
        menuItems.forEach(item => {
            // Sirf Dashboard, Customer Ledgers aur Market Rent Book dikhao
            if(!item.innerText.includes("Dashboard") && 
               !item.innerText.includes("Customer Ledgers") && 
               !item.innerText.includes("Market Rent Book")) {
                item.style.display = "none";
            }
        });
        switchPage('page-customer-ledgers', 'Customer Ledgers'); // Seedha Ledger par le jao
    }

    renderAll();
}
// --- 3. STOCK IN (PURCHASE) ---
function addIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value;
    const item = document.getElementById('in-item').value.trim();
    const barcode = document.getElementById('in-barcode').value;
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value);

    if (!date || !item || qty <= 0) {
        alert("Bilal Bhai, Date, Item aur Qty lazmi likhain!");
        return;
    }

    const entry = {
        date: date, // Kisi bhi date ki entry save hogi
        vendor: vendor,
        item: item,
        barcode: barcode,
        qty: qty,
        price: price,
        total: qty * price
    };

    db.in.push(entry); 
    saveAndRefresh();
    
    document.querySelectorAll('#page-stock-in input').forEach(input => input.value = '');
    alert("Stock IN Saved!");
}

function addOut() {
    const date = document.getElementById('out-date').value;
    const cust = document.getElementById('out-customer').value;
    const item = document.getElementById('out-item').value.trim();
    const bc = document.getElementById('out-barcode').value;
    const qty = Number(document.getElementById('out-qty').value);
    const price = Number(document.getElementById('out-price').value);

    if(!date || !item || qty <= 0) {
        alert("Date, Item aur Qty sahi likhain!");
        return;
    }

    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
    const currentStock = tin - tout;

    if(qty > currentStock) {
        alert("Stock kam hai! Total bacha: " + currentStock);
        return;
    }

    const newSale = { 
        date: date, 
        cust: cust, 
        item: item, 
        bc: bc, 
        qty: qty, 
        price: price,
        total: qty * price
    };

    db.out.push(newSale);
    saveAndRefresh();
    
    document.querySelectorAll('#page-stock-out input').forEach(input => input.value = '');
    alert("Sale Saved!");
}
// --- 5. MAIN RENDER FUNCTION (Table Display Logic) ---
// --- 5. MAIN RENDER FUNCTION ---
function renderAll() {
    // Aaj ki date format: YYYY-MM-DD
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const todayInBody = document.getElementById('today-list-in');
    const outTableBody = document.querySelector('#table-out tbody');
    const balTableBody = document.querySelector('#table-balance tbody');

    // A. Today's Stock IN
    if(todayInBody) {
        todayInBody.innerHTML = "";
        let count = 1;
        db.in.forEach((x, index) => {
            if(x.date === today) {
                todayInBody.innerHTML += `
                    <tr>
                        <td>${count++}</td><td>${x.item}</td><td>${x.vendor}</td>
                        <td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
                        <td><button onclick="deleteEntry('in', ${index})">🗑 Del</button></td>
                    </tr>`;
            }
        });
    }

    // B. Today's Stock OUT
    if(outTableBody) {
        outTableBody.innerHTML = "";
        let count = 1;
        db.out.forEach((x, index) => {
            if(x.date === today) { 
                outTableBody.innerHTML += `
                    <tr>
                        <td>${count++}</td>
                        <td>${x.date}</td>
                        <td>${x.cust}</td>
                        <td>${x.item}</td>
                        <td>${x.bc || '0'}</td>
                        <td>${x.qty}</td>
                        <td>${x.price}</td>
                        <td>${x.total}</td>
                        <td style="text-align:center;">
                            <button onclick="deleteEntry('out', ${index})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">Del</button>
                        </td>
                    </tr>`;
            }
        });
    }

    // C. Balance Table (Hamesha poora stock dikhayega)
    if(balTableBody) {
        const uniqueItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
        balTableBody.innerHTML = uniqueItems.map(name => {
            if(!name) return "";
            const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
            const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
            const pPrice = db.in.find(x => x.item === name)?.price || 0;
            const sPrice = db.out.find(x => x.item === name)?.price || 0;
            return `<tr>
                <td>${db.in.find(x => x.item === name)?.barcode || 'N/A'}</td>
                <td>${name}</td><td>${tin}</td><td>${tout}</td>
                <td>${tin - tout}</td><td>${(sPrice - pPrice) * tout}</td>
            </tr>`;
        }).join('');
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

function deleteEntry(type, index) {
    if(confirm("Waqai delete karna hai?")) {
        db[type].splice(index, 1);
        saveAndRefresh();
    }
}

function switchPage(pageId, titleText) {
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(pageId);
    if(target) target.style.display = 'block';
    document.getElementById('page-title').innerText = "KRT TRADERS ERP - " + titleText;
}


// --- 6. MASTER SEARCH & EDITOR LOGIC ---

// 1. Search Function (Master)
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;

    if(!from || !to) {
        alert("Bilal Bhai, pehle From aur To date select karein!");
        return;
    }

    // Filter Data according to dates
    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    // Render Stock IN Table
    let inHTML = filteredIn.map((x) => {
        const originalIndex = db.in.indexOf(x); 
        return `<tr>
            <td>${x.date}</td><td>${x.item}</td><td>${x.vendor}</td>
            <td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
            <td>
                <button onclick="editEntry('in', ${originalIndex})" style="background:#3498db; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">Edit</button>
                <button onclick="deleteEntryMaster('in', ${originalIndex})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; margin-left:5px;">Del</button>
            </td>
        </tr>`;
    }).join('');
    document.querySelector("#master-in-table tbody").innerHTML = inHTML || "<tr><td colspan='7' style='text-align:center;'>No Purchase Record Found</td></tr>";

    // Render Stock OUT Table
    let outHTML = filteredOut.map((x) => {
        const originalIndex = db.out.indexOf(x);
        return `<tr>
            <td>${x.date}</td><td>${x.item}</td><td>${x.cust}</td>
            <td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
            <td>
                <button onclick="editEntry('out', ${originalIndex})" style="background:#3498db; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px;">Edit</button>
                <button onclick="deleteEntryMaster('out', ${originalIndex})" style="background:#e74c3c; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; margin-left:5px;">Del</button>
            </td>
        </tr>`;
    }).join('');
    document.querySelector("#master-out-table tbody").innerHTML = outHTML || "<tr><td colspan='7' style='text-align:center;'>No Sale Record Found</td></tr>";
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

function showLedger() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;

    const opening = db.opening_balances[name] || 0;
    document.getElementById('opening-bal').value = opening;
    
    tbody.innerHTML = "";
    if (!name || !db.ledgers[name]) {
        document.getElementById('total-ctn').innerText = "0";
        document.getElementById('total-debit').innerText = "0";
        document.getElementById('total-credit').innerText = "0";
        document.getElementById('final-balance').innerText = "Balance: 0";
        return;
    }

    let tCtn = 0, tDebit = 0, tCredit = 0;

    db.ledgers[name].forEach((x, index) => {
        tCtn += x.ctn;
        tDebit += x.debit;
        tCredit += x.credit;
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${x.date}</td>
                <td>${x.item}</td>
                <td>${x.ctn}</td>
                <td>${x.debit}</td>
                <td>${x.credit}</td>
                <td>${x.method}</td>
                <td><button onclick="delLedger('${name}', ${index})" style="background:red; color:white; border:none; cursor:pointer;">Del</button></td>
            </tr>`;
    });

    document.getElementById('total-ctn').innerText = tCtn;
    document.getElementById('total-debit').innerText = tDebit;
    document.getElementById('total-credit').innerText = tCredit;
    
    const currentBalance = (opening + tDebit) - tCredit;
    document.getElementById('final-balance').innerText = "Kul Udhaar: " + currentBalance.toLocaleString();
    updateCustomerDropdown();
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

// --- LOGOUT LOGIC ---
function logout() {
    if (confirm("Bilal Bhai, Logout karna chahte hain?")) {
        // Login screen wapas lao aur baaki sab hide
        document.getElementById('login-screen').style.display = "flex";
        document.getElementById('sidebar').style.display = "none";
        document.getElementById('main-content').style.display = "none";
        document.getElementById('toggle-btn').style.display = "none";
        
        // Input fields saaf kardo
        document.getElementById('user').value = "";
        document.getElementById('pass').value = "";
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


