// ================================================================
// KRT TRADERS ERP - COMPLETE WORKING
// Developed by Bilal Suleman
// ================================================================

// ================================================================
// SUPABASE
// ================================================================
const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ================================================================
// DATA
// ================================================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let rentData = [];
let users = [];

// ================================================================
// LOAD DATA
// ================================================================
function loadData() {
    try {
        const saved = localStorage.getItem('krt_data');
        if (saved) {
            db = JSON.parse(saved);
            console.log('✅ Local data loaded:', db.in.length, 'IN,', db.out.length, 'OUT');
        }
    } catch(e) {
        db = { in: [], out: [], ledgers: {}, opening_balances: {} };
    }
    
    try {
        const savedRent = localStorage.getItem('krt_rent');
        if (savedRent) rentData = JSON.parse(savedRent);
    } catch(e) { rentData = []; }
    
    try {
        const savedUsers = localStorage.getItem('krt_users');
        if (savedUsers) users = JSON.parse(savedUsers);
    } catch(e) { users = []; }
}

function saveData() {
    localStorage.setItem('krt_data', JSON.stringify(db));
    localStorage.setItem('krt_rent', JSON.stringify(rentData));
    localStorage.setItem('krt_users', JSON.stringify(users));
    console.log('💾 Data saved');
}

loadData();

// ================================================================
// TODAY DATE
// ================================================================
function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

// ================================================================
// NOTIFICATION
// ================================================================
function notify(msg, type) {
    type = type || 'info';
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 50);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, 3500);
}

// ================================================================
// SYNC FROM SUPABASE
// ================================================================
async function syncData() {
    if (!navigator.onLine) { 
        notify('⚠️ No internet!', 'warning'); 
        return; 
    }
    
    notify('☁️ Syncing...', 'info');
    console.log('🔄 Syncing from Supabase...');
    
    try {
        // Fetch stock data
        const { data: stock, error: stockErr } = await supabaseClient.from('KRT').select('*').order('id', { ascending: true });
        
        if (stockErr) {
            console.error('❌ Stock error:', stockErr);
            throw stockErr;
        }
        
        if (stock && stock.length > 0) {
            console.log('📦 Stock records:', stock.length);
            db.in = [];
            db.out = [];
            
            stock.forEach(row => {
                const inQty = Number(row.stock_in || 0);
                const outQty = Number(row.stock_out || 0);
                const price = Number(row.price || 0);
                const date = row.Date ? row.Date.split('T')[0] : today();
                
                if (inQty > 0) {
                    db.in.push({ 
                        id: row.id, 
                        date, 
                        vendor: row.vendor_name || 'factory', 
                        item: row.item_name, 
                        qty: inQty, 
                        price: price, 
                        total: inQty * price 
                    });
                }
                if (outQty > 0) {
                    db.out.push({ 
                        id: row.id, 
                        date, 
                        cust: row.customer_name || 'General Sale', 
                        item: row.item_name, 
                        qty: outQty, 
                        price: price, 
                        total: outQty * price 
                    });
                }
            });
            
            saveData();
            console.log('✅ Stock loaded:', db.in.length, 'IN,', db.out.length, 'OUT');
        } else {
            console.log('⚠️ No stock data in Supabase');
        }
        
        // Fetch rent data
        try {
            const { data: rent, error: rentErr } = await supabaseClient.from('KRT_RENT').select('*').order('id', { ascending: true });
            if (!rentErr && rent && rent.length > 0) {
                rentData = rent.map(r => ({ 
                    id: r.id, 
                    name: r.name, 
                    shop: r.shop, 
                    date: r.date, 
                    month: r.month, 
                    debit: Number(r.debit||0), 
                    credit: Number(r.credit||0), 
                    method: r.method 
                }));
                saveData();
                console.log('✅ Rent loaded:', rentData.length);
            }
        } catch(e) {
            console.log('⚠️ No rent data');
        }
        
        renderAll();
        notify('✅ Sync complete!', 'success');
        console.log('✅ Sync complete!');
        
    } catch(e) {
        console.error('❌ Sync error:', e);
        notify('❌ Sync failed: ' + e.message, 'error');
    }
}

// ================================================================
// STOCK IN
// ================================================================
async function addIn() {
    const date = document.getElementById('inDate').value;
    const vendor = document.getElementById('inVendor').value || 'factory';
    const item = document.getElementById('inItem').value.trim();
    const qty = Number(document.getElementById('inQty').value);
    const price = Number(document.getElementById('inPrice').value) || 0;
    
    if (!date) { notify('⚠️ Date required!', 'warning'); return; }
    if (!item) { notify('⚠️ Item required!', 'warning'); return; }
    if (!qty || qty <= 0) { notify('⚠️ Valid quantity required!', 'warning'); return; }
    
    try {
        const { data, error } = await supabaseClient.from('KRT').insert([{ 
            Date: date, 
            item_name: item, 
            stock_in: qty, 
            stock_out: 0, 
            price: price, 
            vendor_name: vendor 
        }]).select();
        
        if (error) { 
            notify('❌ ' + error.message, 'error'); 
            return; 
        }
        
        db.in.push({ 
            id: data[0].id, 
            date, 
            vendor, 
            item, 
            qty, 
            price, 
            total: qty * price 
        });
        
        saveData();
        renderAll();
        
        document.getElementById('inItem').value = '';
        document.getElementById('inQty').value = '';
        
        notify('✅ Stock IN saved!', 'success');
        console.log('✅ Stock IN saved:', item, qty);
        
    } catch(e) {
        notify('❌ Network error!', 'error');
        console.error('❌', e);
    }
}

// ================================================================
// STOCK OUT
// ================================================================
async function addOut() {
    const date = document.getElementById('outDate').value;
    const cust = document.getElementById('outCustomer').value || 'General Sale';
    const item = document.getElementById('outItem').value.trim();
    const qty = Number(document.getElementById('outQty').value);
    const price = Number(document.getElementById('outPrice').value) || 0;
    
    if (!date) { notify('⚠️ Date required!', 'warning'); return; }
    if (!item) { notify('⚠️ Item required!', 'warning'); return; }
    if (!qty || qty <= 0) { notify('⚠️ Valid quantity required!', 'warning'); return; }
    
    try {
        const { data, error } = await supabaseClient.from('KRT').insert([{ 
            Date: date, 
            item_name: item, 
            stock_in: 0, 
            stock_out: qty, 
            price: price, 
            customer_name: cust 
        }]).select();
        
        if (error) { 
            notify('❌ ' + error.message, 'error'); 
            return; 
        }
        
        db.out.push({ 
            id: data[0].id, 
            date, 
            cust, 
            item, 
            qty, 
            price, 
            total: qty * price 
        });
        
        saveData();
        renderAll();
        
        document.getElementById('outItem').value = '';
        document.getElementById('outQty').value = '';
        document.getElementById('stockStatus').innerHTML = '';
        
        notify('✅ Stock OUT saved!', 'success');
        console.log('✅ Stock OUT saved:', item, qty);
        
    } catch(e) {
        notify('❌ Network error!', 'error');
        console.error('❌', e);
    }
}

// ================================================================
// CHECK STOCK
// ================================================================
function checkStock(item) {
    const el = document.getElementById('stockStatus');
    if (!item || !item.trim()) { 
        el.innerHTML = ''; 
        return; 
    }
    
    const tin = db.in.filter(x => x.item === item).reduce((s,x) => s + x.qty, 0);
    const tout = db.out.filter(x => x.item === item).reduce((s,x) => s + x.qty, 0);
    const bal = tin - tout;
    
    if (bal > 0) {
        el.style.color = '#10b981';
        el.innerHTML = '✅ Available: <strong>' + bal + '</strong>';
    } else if (bal <= 0 && tin > 0) {
        el.style.color = '#ef4444';
        el.innerHTML = '⚠️ Out of Stock!';
    } else {
        el.style.color = '#94a3b8';
        el.innerHTML = 'ℹ️ No record found.';
    }
}

// ================================================================
// RENDER ALL
// ================================================================
function renderAll() {
    const d = today();
    console.log('📅 Rendering for date:', d);
    console.log('📊 Data:', db.in.length, 'IN,', db.out.length, 'OUT');
    
    // Today IN
    const inBody = document.getElementById('todayIn');
    if (inBody) {
        const todayIn = db.in.filter(x => x.date === d);
        if (todayIn.length === 0) {
            inBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">📭 No entries today</td></tr>';
        } else {
            let html = '';
            todayIn.forEach((x, i) => {
                const idx = db.in.indexOf(x);
                html += '<tr><td>' + (i+1) + '</td><td><strong>' + x.item + '</strong></td><td>' + x.vendor + '</td><td>' + x.qty + '</td><td>' + x.price + '</td><td>' + x.total + '</td><td><button class="btn-action btn-edit" onclick="editEntry(\'in\',' + idx + ')">Edit</button> <button class="btn-action btn-del" onclick="deleteEntry(\'in\',' + idx + ')">Del</button></td></tr>';
            });
            inBody.innerHTML = html;
        }
    }
    
    // Today OUT
    const outBody = document.getElementById('todayOut');
    if (outBody) {
        const todayOut = db.out.filter(x => x.date === d);
        if (todayOut.length === 0) {
            outBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">📭 No sales today</td></tr>';
        } else {
            let html = '';
            todayOut.forEach((x, i) => {
                const idx = db.out.indexOf(x);
                html += '<tr><td>' + (i+1) + '</td><td>' + x.date + '</td><td>' + x.cust + '</td><td><strong>' + x.item + '</strong></td><td>' + x.qty + '</td><td>' + x.price + '</td><td>' + x.total + '</td><td><button class="btn-action btn-edit" onclick="editEntry(\'out\',' + idx + ')">Edit</button> <button class="btn-action btn-del" onclick="deleteEntry(\'out\',' + idx + ')">Del</button></td></tr>';
            });
            outBody.innerHTML = html;
        }
    }
    
    // Balance
    const balBody = document.getElementById('balanceBody');
    if (balBody) {
        const items = [...new Set([...db.in.map(x=>x.item), ...db.out.map(x=>x.item)])];
        if (items.length === 0) {
            balBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px;color:#94a3b8;">📭 No items</td></tr>';
        } else {
            let html = '';
            items.forEach(name => {
                const tin = db.in.filter(x=>x.item===name).reduce((s,x)=>s+x.qty,0);
                const tout = db.out.filter(x=>x.item===name).reduce((s,x)=>s+x.qty,0);
                const inPrice = db.in.find(x=>x.item===name)?.price || 0;
                const outPrice = db.out.find(x=>x.item===name)?.price || 0;
                const bal = tin - tout;
                const profit = (outPrice - inPrice) * tout;
                html += '<tr><td><strong>' + name + '</strong></td><td style="color:#06b6d4;">' + tin + '</td><td style="color:#f59e0b;">' + tout + '</td><td style="font-weight:bold;color:' + (bal < 5 ? '#ef4444' : '#10b981') + ';">' + bal + '</td><td style="color:' + (profit >= 0 ? '#10b981' : '#ef4444') + ';font-weight:bold;">PKR ' + profit.toLocaleString() + '</td></tr>';
            });
            balBody.innerHTML = html;
        }
    }
    
    updateStats();
    updateItemsList();
    updateCustomerList();
}

// ================================================================
// UPDATE STATS
// ================================================================
function updateStats() {
    const totalIn = db.in.reduce((s,x) => s + x.qty, 0);
    const totalOut = db.out.reduce((s,x) => s + x.qty, 0);
    const items = [...new Set([...db.in.map(x=>x.item), ...db.out.map(x=>x.item)])];
    const revenue = db.out.reduce((s,x) => s + x.total, 0);
    
    document.getElementById('totalIn').textContent = totalIn;
    document.getElementById('totalOut').textContent = totalOut;
    document.getElementById('totalItems').textContent = items.length;
    document.getElementById('totalRevenue').textContent = 'PKR ' + revenue.toLocaleString();
    
    // Recent Activity
    const act = document.getElementById('recentActivity');
    if (act) {
        const all = [...db.in.map(x=>({...x,type:'IN'})), ...db.out.map(x=>({...x,type:'OUT'}))];
        all.sort((a,b) => new Date(b.date) - new Date(a.date));
        const recent = all.slice(0,10);
        if (recent.length === 0) {
            act.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No activity</p>';
        } else {
            act.innerHTML = recent.map(x => '<div class="activity-item"><span><strong>' + x.item + '</strong> <span style="color:' + (x.type === 'IN' ? '#10b981' : '#ef4444') + ';font-weight:bold;">' + (x.type === 'IN' ? '📥 +' : '📤 -') + x.qty + '</span></span><span style="color:#94a3b8;font-size:12px;">' + x.date + '</span></div>').join('');
        }
    }
}

// ================================================================
// UPDATE LISTS
// ================================================================
function updateItemsList() {
    const list = document.getElementById('itemsList');
    if (!list) return;
    const items = [...new Set([...db.in.map(x=>x.item), ...db.out.map(x=>x.item)])];
    list.innerHTML = items.map(name => '<option value="' + name + '">').join('');
}

function updateCustomerList() {
    const list = document.getElementById('customerList');
    if (!list) return;
    const customers = Object.keys(db.ledgers);
    list.innerHTML = customers.map(name => '<option value="' + name + '">').join('');
}

// ================================================================
// DELETE
// ================================================================
async function deleteEntry(type, index) {
    if (!confirm('Delete this record?')) return;
    const record = db[type][index];
    if (record && record.id) {
        try {
            await supabaseClient.from('KRT').delete().eq('id', record.id);
        } catch(e) {}
    }
    db[type].splice(index, 1);
    saveData();
    renderAll();
    notify('✅ Deleted!', 'success');
}

// ================================================================
// EDIT
// ================================================================
async function editEntry(type, index) {
    const data = db[type][index];
    const newQty = prompt('New quantity:', data.qty);
    if (newQty === null) return;
    const newPrice = prompt('New price:', data.price);
    if (newPrice === null) return;
    
    try {
        await supabaseClient.from('KRT').update({
            stock_in: type === 'in' ? Number(newQty) : 0,
            stock_out: type === 'out' ? Number(newQty) : 0,
            price: Number(newPrice) || 0
        }).eq('id', data.id);
    } catch(e) {}
    
    db[type][index].qty = Number(newQty);
    db[type][index].price = Number(newPrice) || 0;
    db[type][index].total = Number(newQty) * (Number(newPrice) || 0);
    saveData();
    renderAll();
    notify('✅ Updated!', 'success');
}

// ================================================================
// SEARCH
// ================================================================
function searchRecords() {
    const from = document.getElementById('searchFrom').value;
    const to = document.getElementById('searchTo').value;
    if (!from || !to) { notify('⚠️ Select both dates!', 'warning'); return; }
    
    const fin = db.in.filter(x => x.date >= from && x.date <= to);
    const fout = db.out.filter(x => x.date >= from && x.date <= to);
    
    const inTable = document.getElementById('searchInTable');
    if (inTable) {
        if (fin.length === 0) {
            inTable.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>';
        } else {
            inTable.innerHTML = fin.map(x => {
                const idx = db.in.indexOf(x);
                return '<tr><td>' + x.date + '</td><td><strong>' + x.item + '</strong></td><td>' + x.vendor + '</td><td>' + x.qty + '</td><td>' + x.price + '</td><td>' + x.total + '</td><td><button class="btn-action btn-edit" onclick="editEntry(\'in\',' + idx + ')">Edit</button> <button class="btn-action btn-del" onclick="deleteEntry(\'in\',' + idx + ')">Del</button></td></tr>';
            }).join('');
        }
    }
    
    const outTable = document.getElementById('searchOutTable');
    if (outTable) {
        if (fout.length === 0) {
            outTable.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>';
        } else {
            outTable.innerHTML = fout.map(x => {
                const idx = db.out.indexOf(x);
                return '<tr><td>' + x.date + '</td><td><strong>' + x.item + '</strong></td><td>' + x.cust + '</td><td>' + x.qty + '</td><td>' + x.price + '</td><td>' + x.total + '</td><td><button class="btn-action btn-edit" onclick="editEntry(\'out\',' + idx + ')">Edit</button> <button class="btn-action btn-del" onclick="deleteEntry(\'out\',' + idx + ')">Del</button></td></tr>';
            }).join('');
        }
    }
    
    notify('✅ Found ' + (fin.length + fout.length) + ' records', 'success');
}

// ================================================================
// REPORT
// ================================================================
function generateReport() {
    const from = document.getElementById('repFrom').value;
    const to = document.getElementById('repTo').value;
    if (!from || !to) { notify('⚠️ Select both dates!', 'warning'); return; }
    
    document.getElementById('reportPeriod').textContent = '📅 ' + from + ' to ' + to;
    
    const fin = db.in.filter(x => x.date >= from && x.date <= to);
    const fout = db.out.filter(x => x.date >= from && x.date <= to);
    
    const inTable = document.getElementById('repInTable');
    if (inTable) {
        if (fin.length === 0) {
            inTable.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>';
        } else {
            inTable.innerHTML = fin.map(x => '<tr><td>' + x.date + '</td><td><strong>' + x.item + '</strong></td><td>' + x.vendor + '</td><td>' + x.qty + '</td><td>' + x.price + '</td><td>' + x.total.toLocaleString() + '</td></tr>').join('');
        }
    }
    
    const outTable = document.getElementById('repOutTable');
    if (outTable) {
        if (fout.length === 0) {
            outTable.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>';
        } else {
            outTable.innerHTML = fout.map(x => '<tr><td>' + x.date + '</td><td><strong>' + x.item + '</strong></td><td>' + x.cust + '</td><td>' + x.qty + '</td><td>' + x.price + '</td><td>' + x.total.toLocaleString() + '</td></tr>').join('');
        }
    }
    
    const totalIn = fin.reduce((s,x) => s + x.total, 0);
    const totalOut = fout.reduce((s,x) => s + x.total, 0);
    const profit = totalOut - totalIn;
    
    document.querySelectorAll('.report-summary').forEach(el => el.remove());
    const summary = document.createElement('div');
    summary.className = 'report-summary';
    summary.style.cssText = 'display:flex;justify-content:space-around;background:#0f172a;color:white;padding:15px;border-radius:8px;margin-top:20px;flex-wrap:wrap;gap:10px;';
    summary.innerHTML = '<span>📥 Total IN: PKR ' + totalIn.toLocaleString() + '</span><span>📤 Total OUT: PKR ' + totalOut.toLocaleString() + '</span><span style="color:' + (profit >= 0 ? '#10b981' : '#ef4444') + ';font-weight:bold;">💰 ' + (profit >= 0 ? 'Profit' : 'Loss') + ': PKR ' + Math.abs(profit).toLocaleString() + '</span>';
    document.getElementById('reportArea').appendChild(summary);
    notify('✅ Report generated!', 'success');
}

// ================================================================
// LEDGER
// ================================================================
function saveLedger() {
    const name = document.getElementById('ledgerName').value.trim();
    const date = document.getElementById('ledDate').value;
    if (!name || !date) { notify('⚠️ Name and Date required!', 'warning'); return; }
    if (!db.ledgers[name]) { db.ledgers[name] = []; db.opening_balances[name] = 0; }
    db.ledgers[name].push({
        date,
        item: document.getElementById('ledItem').value || '-',
        ctn: Number(document.getElementById('ledCtn').value) || 0,
        debit: Number(document.getElementById('ledDebit').value) || 0,
        credit: Number(document.getElementById('ledCredit').value) || 0,
        method: document.getElementById('ledMethod').value
    });
    saveData();
    showLedger();
    notify('✅ Ledger saved!', 'success');
}

function updateOpening() {
    const name = document.getElementById('ledgerName').value.trim();
    const val = Number(document.getElementById('openingBal').value) || 0;
    if (name) { db.opening_balances[name] = val; saveData(); showLedger(); }
}

function showLedger() {
    const name = document.getElementById('ledgerName').value.trim();
    const body = document.getElementById('ledgerBody');
    if (!body) return;
    if (!name || !db.ledgers[name]) {
        body.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">No entries</td></tr>';
        document.getElementById('ledTotalCtn').textContent = '0';
        document.getElementById('ledTotalDebit').textContent = '0';
        document.getElementById('ledTotalCredit').textContent = '0';
        document.getElementById('ledFinalBalance').textContent = 'Balance: 0';
        return;
    }
    let tCtn = 0, tDebit = 0, tCredit = 0;
    let html = '';
    db.ledgers[name].forEach((x, i) => {
        tCtn += x.ctn; tDebit += x.debit; tCredit += x.credit;
        html += '<tr><td>' + (i+1) + '</td><td>' + x.date + '</td><td>' + x.item + '</td><td>' + x.ctn + '</td><td style="color:#ef4444;">' + x.debit + '</td><td style="color:#10b981;">' + x.credit + '</td><td>' + x.method + '</td><td><button class="btn-action btn-edit" onclick="editLedger(\'' + name + '\',' + i + ')">Edit</button> <button class="btn-action btn-del" onclick="delLedger(\'' + name + '\',' + i + ')">Del</button></td></tr>';
    });
    body.innerHTML = html;
    document.getElementById('ledTotalCtn').textContent = tCtn;
    document.getElementById('ledTotalDebit').textContent = tDebit;
    document.getElementById('ledTotalCredit').textContent = tCredit;
    const opening = db.opening_balances[name] || 0;
    document.getElementById('ledFinalBalance').textContent = 'Balance: ' + ((opening + tDebit) - tCredit).toLocaleString();
}

function delLedger(name, index) {
    if (!confirm('Delete?')) return;
    db.ledgers[name].splice(index, 1);
    saveData();
    showLedger();
    notify('✅ Deleted!', 'success');
}

function editLedger(name, index) {
    const entry = db.ledgers[name][index];
    const d = prompt('New debit:', entry.debit);
    if (d === null) return;
    const c = prompt('New credit:', entry.credit);
    if (c === null) return;
    db.ledgers[name][index].debit = Number(d);
    db.ledgers[name][index].credit = Number(c);
    saveData();
    showLedger();
    notify('✅ Updated!', 'success');
}

// ================================================================
// RENT
// ================================================================
function addRent() {
    const name = document.getElementById('rentName').value.trim();
    const date = document.getElementById('rentDate').value;
    if (!name || !date) { notify('⚠️ Name and Date required!', 'warning'); return; }
    rentData.push({
        name,
        shop: document.getElementById('rentShop').value || '-',
        date,
        month: document.getElementById('rentMonth').value || '-',
        debit: Number(document.getElementById('rentDebit').value) || 0,
        credit: Number(document.getElementById('rentCredit').value) || 0,
        method: document.getElementById('rentMethod').value
    });
    saveData();
    showRent();
    notify('✅ Rent saved!', 'success');
}

function showRent() {
    const name = document.getElementById('rentName').value.trim();
    const body = document.getElementById('rentBody');
    if (!body) return;
    const filtered = rentData.filter(x => x.name.toLowerCase() === name.toLowerCase());
    if (filtered.length === 0) {
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No records</td></tr>';
        document.getElementById('rentTotalDebit').textContent = '0';
        document.getElementById('rentTotalCredit').textContent = '0';
        document.getElementById('rentFinalBalance').textContent = '0';
        return;
    }
    let tDebit = 0, tCredit = 0;
    let html = '';
    filtered.forEach(r => {
        const idx = rentData.indexOf(r);
        tDebit += r.debit; tCredit += r.credit;
        html += '<tr><td>' + r.shop + '</td><td>' + r.date + '</td><td>' + r.month + '</td><td style="color:#ef4444;">' + r.debit + '</td><td style="color:#10b981;">' + r.credit + '</td><td>' + r.method + '</td><td><button class="btn-action btn-del" onclick="delRent(' + idx + ')">Del</button></td></tr>';
    });
    body.innerHTML = html;
    document.getElementById('rentTotalDebit').textContent = tDebit;
    document.getElementById('rentTotalCredit').textContent = tCredit;
    document.getElementById('rentFinalBalance').textContent = tDebit - tCredit;
}

function delRent(index) {
    if (!confirm('Delete?')) return;
    rentData.splice(index, 1);
    saveData();
    showRent();
    notify('✅ Deleted!', 'success');
}

// ================================================================
// USERS
// ================================================================
function createUser() {
    const name = document.getElementById('newName').value;
    const id = document.getElementById('newId').value;
    const pass = document.getElementById('newPass').value;
    if (!name || !id || !pass) { notify('⚠️ Fill all fields!', 'warning'); return; }
    const perms = [];
    document.querySelectorAll('.perm:checked').forEach(cb => perms.push(cb.value));
    users.push({ id, pass, name, perms });
    saveData();
    loadUsers();
    document.getElementById('newName').value = '';
    document.getElementById('newId').value = '';
    document.getElementById('newPass').value = '';
    document.querySelectorAll('.perm').forEach(cb => cb.checked = false);
    notify('✅ User created!', 'success');
}

function loadUsers() {
    const body = document.getElementById('userTable');
    if (!body) return;
    if (users.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No users</td></tr>';
    } else {
        body.innerHTML = users.map((u, i) => '<tr><td><strong>' + u.id + '</strong></td><td>' + u.name + '</td><td><small>' + u.perms.join(', ') + '</small></td><td><button class="btn-action btn-del" onclick="delUser(' + i + ')">Del</button></td></tr>').join('');
    }
}

function delUser(index) {
    if (!confirm('Delete user?')) return;
    users.splice(index, 1);
    saveData();
    loadUsers();
    notify('✅ User deleted!', 'success');
}

// ================================================================
// LOGIN - FIXED
// ================================================================
function loginUser() {
    const u = document.getElementById('username').value.trim().toLowerCase();
    const p = document.getElementById('password').value.trim();
    
    console.log('🔑 Login attempt:', u);
    
    // Default admin
    if (u === 'admin' && p === '123') {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        showApp();
        return;
    }
    
    // Check extra users
    const found = users.find(x => x.id === u && x.pass === p);
    if (found) {
        localStorage.setItem('loggedIn', 'true');
        localStorage.setItem('userRole', 'user');
        showApp();
        return;
    }
    
    alert('❌ Invalid credentials! Use admin / 123');
    console.log('❌ Login failed for:', u);
}

function showApp() {
    console.log('✅ Login successful!');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('toggleBtn').style.display = 'block';
    renderAll();
    if (navigator.onLine) {
        setTimeout(syncData, 500);
    }
}

function logoutUser() {
    if (!confirm('Logout?')) return;
    localStorage.removeItem('loggedIn');
    location.reload();
}

// ================================================================
// SIDEBAR
// ================================================================
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    if (sb.style.left === '0px' || sb.style.left === '') {
        sb.style.left = '-240px';
        document.getElementById('mainContent').style.marginLeft = '0';
    } else {
        sb.style.left = '0px';
        document.getElementById('mainContent').style.marginLeft = '240px';
    }
}

function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.style.display = 'none');
    const target = document.getElementById('page-' + page);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
    document.querySelectorAll('#sidebar ul li').forEach(li => {
        if (li.textContent.toLowerCase().includes(page)) li.classList.add('active');
    });
    
    if (window.innerWidth <= 768) {
        document.getElementById('sidebar').style.left = '-240px';
        document.getElementById('mainContent').style.marginLeft = '0';
    }
    
    if (page === 'dashboard') renderAll();
    if (page === 'ledger') { updateCustomerList(); showLedger(); }
    if (page === 'rent') showRent();
    if (page === 'settings') loadUsers();
}

// ================================================================
// FORCE LOGIN - EMERGENCY
// ================================================================
function forceLogin() {
    localStorage.setItem('loggedIn', 'true');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('toggleBtn').style.display = 'block';
    renderAll();
    if (navigator.onLine) {
        setTimeout(syncData, 500);
    }
    notify('✅ Force login successful!', 'success');
    console.log('✅ Force login successful!');
}

// ================================================================
// STARTUP
// ================================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 KRT ERP v5.0 Starting...');
    
    // Load local data
    loadData();
    console.log('📊 Local data:', db.in.length, 'IN,', db.out.length, 'OUT');
    
    // Render from local
    renderAll();
    loadUsers();
    updateCustomerList();
    updateItemsList();
    
    // Force sync from Supabase on every refresh
    if (navigator.onLine) {
        console.log('🔄 Syncing from Supabase...');
        setTimeout(syncData, 500);
    } else {
        notify('⚠️ Offline mode', 'warning');
    }
    
    // Check login
    if (localStorage.getItem('loggedIn') === 'true') {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('toggleBtn').style.display = 'block';
        renderAll();
        console.log('✅ Already logged in');
    } else {
        console.log('🔑 Please login');
    }
});

// Rent live search
document.getElementById('rentName')?.addEventListener('input', showRent);

console.log('✅ KRT ERP v5.0 Ready!');
console.log('🔑 Login: admin / 123');
