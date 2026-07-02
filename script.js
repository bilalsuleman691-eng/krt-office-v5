// ==========================================
// KRT TRADERS ERP - COMPLETE SCRIPT v5.0
// Developed by Bilal Suleman
// ==========================================

// ==========================================
// SUPABASE CONFIG
// ==========================================
const SUPABASE_URL = "https://jsxcmlpjdxgloofdrugz.supabase.co";
const SUPABASE_KEY = "sb_publishable_Gyt7XmMb2fQxDouyHQMTYg_pB8dhGtb";

let _supabase = null;
let isSupabaseConnected = false;
let isLoading = false;

// ==========================================
// GLOBAL VARIABLES
// ==========================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];
let pendingSync = [];

// ==========================================
// INIT SUPABASE
// ==========================================
try {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client created');
} catch (err) {
    console.error('❌ Supabase init failed:', err);
}

// ==========================================
// TEST CONNECTION
// ==========================================
async function testSupabaseConnection() {
    try {
        if (!_supabase) { isSupabaseConnected = false; return; }
        const { data, error } = await _supabase.from('KRT').select('count', { count: 'exact', head: true });
        if (error) { isSupabaseConnected = false; showNotification('⚠️ Offline mode', 'warning'); return; }
        isSupabaseConnected = true;
        console.log('✅ Connected!');
        showNotification('✅ Connected to database!', 'success');
        await fetchCloudData();
        renderAll();
    } catch (err) { isSupabaseConnected = false; }
}

// ==========================================
// LOAD LOCAL DATA
// ==========================================
function loadLocalData() {
    try {
        const stored = localStorage.getItem('krt_erp_data');
        db = stored ? JSON.parse(stored) : { in: [], out: [], ledgers: {}, opening_balances: {} };
        const rentStored = localStorage.getItem('krt_rent_data');
        dbRent = rentStored ? JSON.parse(rentStored) : [];
        const usersStored = localStorage.getItem('krt_extra_users');
        extraUsers = usersStored ? JSON.parse(usersStored) : [];
        const pendingStored = localStorage.getItem('krt_pending_sync');
        pendingSync = pendingStored ? JSON.parse(pendingStored) : [];
        console.log('✅ Local data loaded');
    } catch (err) {
        db = { in: [], out: [], ledgers: {}, opening_balances: {} };
        dbRent = [];
        extraUsers = [];
        pendingSync = [];
    }
}

function saveLocalData() {
    try {
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
    } catch (err) { console.error('❌ Save error:', err); }
}

function saveAndRefresh() {
    saveLocalData();
    renderAll();
    updateDashboardStats();
}

// ==========================================
// FETCH CLOUD DATA
// ==========================================
async function fetchCloudData() {
    try {
        if (!_supabase || !isSupabaseConnected) return;
        const { data, error } = await _supabase.from('KRT').select('*').order('id', { ascending: true });
        if (error || !data) return;
        db.in = [];
        db.out = [];
        data.forEach(row => {
            const inQty = Number(row.stock_in || 0);
            const outQty = Number(row.stock_out || 0);
            const price = Number(row.price || 0);
            const date = (row.Date || row.date || '').split('T')[0] || new Date().toISOString().split('T')[0];
            if (inQty > 0) {
                db.in.push({ id: row.id, date, vendor: row.vendor_name || 'factory', item: row.item_name || 'Unknown', qty: inQty,
                    price, total: inQty * price });
            }
            if (outQty > 0) {
                db.out.push({ id: row.id, date, cust: row.customer_name || 'General Sale', item: row.item_name || 'Unknown',
                    qty: outQty, price, total: outQty * price });
            }
        });
        saveLocalData();
        renderAll();
        updateDashboardStats();
    } catch (err) { console.error('❌ Fetch error:', err); }
}

async function fetchCloudRentData() {
    try {
        if (!_supabase || !isSupabaseConnected) return;
        const { data, error } = await _supabase.from('KRT_RENT').select('*').order('id', { ascending: true });
        if (error || !data) return;
        dbRent = data.map(row => ({ id: row.id, name: row.name, shop: row.shop, date: row.date, month: row.month, debit: Number(
                row.debit || 0), credit: Number(row.credit || 0), method: row.method || 'Cash' }));
        saveLocalData();
        renderRentTable();
    } catch (err) { console.error('❌ Rent fetch error:', err); }
}

// ==========================================
// SYNC CLOUD
// ==========================================
async function syncAllCloudData() {
    if (isLoading) return;
    isLoading = true;
    const btn = document.querySelector('.sync-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Syncing...';
    }
    try {
        if (!navigator.onLine) { showNotification('⚠️ No internet!', 'warning'); return; }
        if (!_supabase || !isSupabaseConnected) { showNotification('⚠️ Database not available', 'warning'); return; }
        showNotification('☁️ Syncing...', 'info');
        await fetchCloudData();
        await fetchCloudRentData();
        await processPendingSync();
        showNotification('✅ Sync complete!', 'success');
    } catch (err) { console.error('❌ Sync error:', err);
        showNotification('❌ Sync failed!', 'error'); } finally {
        isLoading = false;
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sync"></i> Sync';
        }
    }
}

// ==========================================
// PENDING SYNC
// ==========================================
async function processPendingSync() {
    if (!_supabase || !isSupabaseConnected || !navigator.onLine || pendingSync.length === 0) return;
    const failed = [];
    for (const op of pendingSync) {
        try {
            if (op.type === 'insert') {
                const { error } = await _supabase.from(op.table).insert(op.data);
                if (error) failed.push(op);
            } else if (op.type === 'delete') {
                const { error } = await _supabase.from(op.table).delete().eq('id', op.id);
                if (error) failed.push(op);
            } else if (op.type === 'update') {
                const { error } = await _supabase.from(op.table).update(op.data).eq('id', op.id);
                if (error) failed.push(op);
            }
        } catch (err) { failed.push(op); }
    }
    pendingSync = failed;
    localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
}

function addPendingSync(op) {
    pendingSync.push(op);
    localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
    if (navigator.onLine && isSupabaseConnected) setTimeout(processPendingSync, 2000);
}

// ==========================================
// STOCK IN
// ==========================================
async function addIn() {
    try {
        const date = document.getElementById('in-date').value;
        const vendor = document.getElementById('in-vendor').value || 'factory';
        const item = document.getElementById('in-item').value.trim();
        const barcode = document.getElementById('in-barcode').value || '';
        const qty = Number(document.getElementById('in-qty').value);
        const price = Number(document.getElementById('in-price').value) || 0;
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (!item) { showNotification('⚠️ Enter item!', 'warning'); return; }
        if (qty <= 0 || isNaN(qty)) { showNotification('⚠️ Valid qty!', 'warning'); return; }
        if (price <= 0 || isNaN(price)) { showNotification('⚠️ Enter valid price!', 'warning'); return; }
        const entryData = { date: date, item_name: item, stock_in: qty, stock_out: 0, price, vendor_name: vendor };
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            try {
                const { data, error } = await _supabase.from('KRT').insert([entryData]).select();
                if (!error && data && data.length > 0) {
                    db.in.push({ id: data[0].id, date, vendor, item, barcode, qty, price, total: qty * price });
                    saveAndRefresh();
                    clearInForm();
                    showNotification('✅ Stock IN saved to cloud!', 'success');
                    await fetchCloudData();
                    return;
                }
            } catch (err) { console.error('❌ Cloud error:', err); }
        }
        const tempId = 'local_' + Date.now();
        db.in.push({ id: tempId, date, vendor, item, barcode, qty, price, total: qty * price });
        saveAndRefresh();
        addPendingSync({ type: 'insert', table: 'krt', data: entryData });
        clearInForm();
        showNotification('✅ Stock IN saved locally!', 'warning');
    } catch (err) { console.error('❌ addIn error:', err);
        showNotification('❌ Error: ' + err.message, 'error'); }
}

function clearInForm() {
    ['in-date', 'in-vendor', 'in-item', 'in-barcode', 'in-qty', 'in-price'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ==========================================
// STOCK OUT
// ==========================================
async function addOut() {
    try {
        const date = document.getElementById('out-date').value;
        const cust = document.getElementById('out-customer').value.trim() || 'General Sale';
        const item = document.getElementById('out-item').value.trim();
        const barcode = document.getElementById('out-barcode').value || '';
        const qty = Number(document.getElementById('out-qty').value);
        const price = Number(document.getElementById('out-price').value) || 0;
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (!item) { showNotification('⚠️ Enter item!', 'warning'); return; }
        if (qty <= 0 || isNaN(qty)) { showNotification('⚠️ Valid qty!', 'warning'); return; }
        if (price <= 0 || isNaN(price)) { showNotification('⚠️ Enter valid price!', 'warning'); return; }
        const totalIn = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
        const totalOut = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
        if (qty > totalIn - totalOut) { showNotification(`⚠️ Only ${totalIn - totalOut} available!`, 'warning'); return; }
        const entryData = { date: date, item_name: item, stock_in: 0, stock_out: qty, price, customer_name: cust };
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            try {
                const { data, error } = await _supabase.from('KRT').insert([entryData]).select();
                if (!error && data && data.length > 0) {
                    db.out.push({ id: data[0].id, date, cust, item, barcode, qty, price, total: qty * price });
                    saveAndRefresh();
                    clearOutForm();
                    showNotification('✅ Stock OUT saved to cloud!', 'success');
                    await fetchCloudData();
                    return;
                }
            } catch (err) { console.error('❌ Cloud error:', err); }
        }
        const tempId = 'local_' + Date.now();
        db.out.push({ id: tempId, date, cust, item, barcode, qty, price, total: qty * price });
        saveAndRefresh();
        addPendingSync({ type: 'insert', table: 'krt', data: entryData });
        clearOutForm();
        showNotification('✅ Stock OUT saved locally!', 'warning');
    } catch (err) { console.error('❌ addOut error:', err);
        showNotification('❌ Error: ' + err.message, 'error'); }
}

function clearOutForm() {
    ['out-date', 'out-customer', 'out-item', 'out-barcode', 'out-qty', 'out-price'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const status = document.getElementById('stock-status');
    if (status) status.innerHTML = '';
}

// ==========================================
// DELETE ENTRY - FIXED with ID
// ==========================================
async function deleteEntry(type, id) {
    if (!confirm('⚠️ Delete this record?')) return;
    const index = db[type].findIndex(x => x.id === id);
    if (index === -1) { showNotification('⚠️ Record not found!', 'error'); return; }
    const record = db[type][index];
    if (record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
        try { await _supabase.from('KRT').delete().eq('id', record.id); } catch (err) { addPendingSync({ type: 'delete',
                table: 'krt', id: record.id }); }
    }
    db[type].splice(index, 1);
    saveAndRefresh();
    showNotification('✅ Record deleted!', 'success');
}

// ==========================================
// EDIT ENTRY - FIXED with ID
// ==========================================
async function editEntry(type, id) {
    const index = db[type].findIndex(x => x.id === id);
    if (index === -1) { showNotification('⚠️ Record not found!', 'error'); return; }
    const record = db[type][index];
    const newQty = prompt('New Quantity:', record.qty);
    if (newQty === null) return;
    const newPrice = prompt('New Price:', record.price);
    if (newPrice === null) return;
    const qtyNum = Number(newQty);
    const priceNum = Number(newPrice) || 0;
    if (isNaN(qtyNum) || qtyNum < 0) { showNotification('⚠️ Invalid qty!', 'warning'); return; }
    if (priceNum < 0) { showNotification('⚠️ Invalid price!', 'warning'); return; }
    if (record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
        try {
            await _supabase.from('KRT').update({ stock_in: type === 'in' ? qtyNum : 0, stock_out: type === 'out' ? qtyNum : 0,
                price: priceNum }).eq('id', record.id);
        } catch (err) { addPendingSync({ type: 'update', table: 'krt', id: record.id, data: { stock_in: type === 'in' ?
                    qtyNum : 0, stock_out: type === 'out' ? qtyNum : 0, price: priceNum } }); }
    }
    db[type][index].qty = qtyNum;
    db[type][index].price = priceNum;
    db[type][index].total = qtyNum * priceNum;
    saveAndRefresh();
    showNotification('✅ Updated!', 'success');
}

// ==========================================
// RENDER ALL - FIXED with ID
// ==========================================
function renderAll() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const inBody = document.getElementById('today-list-in');
        if (inBody) {
            let html = '',
                c = 1;
            db.in.forEach((x) => {
                if (x.date === today) {
                    html += `<tr><td>${c++}</td><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.vendor)}</td><td>${x.qty}</td><td>${x.price || 0}</td><td>${(x.qty * (x.price || 0)).toLocaleString()}</td>
                        <td><button class="btn-action btn-edit" onclick="editEntry('in','${x.id}')">✏️</button><button class="btn-action btn-delete" onclick="deleteEntry('in','${x.id}')">🗑️</button></td></tr>`;
                }
            });
            inBody.innerHTML = html || `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">📭 No entries today</td></tr>`;
        }
        const outBody = document.getElementById('today-list-out');
        if (outBody) {
            let html = '',
                c = 1;
            db.out.forEach((x) => {
                if (x.date === today) {
                    html += `<tr><td>${c++}</td><td>${x.date}</td><td>${escapeHtml(x.cust)}</td><td>${escapeHtml(x.item)}</td><td>${x.barcode || 'N/A'}</td><td>${x.qty}</td><td>${x.price || 0}</td><td>${(x.qty * (x.price || 0)).toLocaleString()}</td>
                        <td><button class="btn-action btn-edit" onclick="editEntry('out','${x.id}')">✏️</button><button class="btn-action btn-delete" onclick="deleteEntry('out','${x.id}')">🗑️</button></td></tr>`;
                }
            });
            outBody.innerHTML = html || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">📭 No sales today</td></tr>`;
        }
        const balBody = document.getElementById('table-balance-body');
        if (balBody) {
            const items = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
            balBody.innerHTML = items.map(name => {
                if (!name) return '';
                const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
                const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
                const totalInValue = db.in.filter(x => x.item === name).reduce((s, x) => s + (x.qty * x.price), 0);
                const totalOutValue = db.out.filter(x => x.item === name).reduce((s, x) => s + (x.qty * x.price), 0);
                const profit = totalOutValue - totalInValue;
                const bal = tin - tout;
                const inItem = db.in.find(x => x.item === name);
                return `<tr><td>${inItem ? escapeHtml(inItem.barcode) : 'N/A'}</td><td style="font-weight:600;">${escapeHtml(name)}</td>
                    <td style="color:#2980b9;">${tin}</td><td style="color:#e67e22;">${tout}</td>
                    <td style="font-weight:bold;color:${bal < 5 ? '#e74c3c' : '#27ae60'};">${bal}</td>
                    <td style="color:${profit >= 0 ? '#27ae60' : '#e74c3c'};font-weight:bold;">PKR ${profit.toLocaleString()}</td></tr>`;
            }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888;">📭 No items</td></tr>`;
        }
        updateItemLists();
        updateDashboardStats();
    } catch (err) { console.error('❌ renderAll error:', err); }
}

// ==========================================
// DASHBOARD
// ==========================================
function updateDashboardStats() {
    try {
        const totalIn = db.in.reduce((s, x) => s + x.qty, 0);
        const totalOut = db.out.reduce((s, x) => s + x.qty, 0);
        const totalInValue = db.in.reduce((s, x) => s + (x.qty * x.price), 0);
        const totalOutValue = db.out.reduce((s, x) => s + (x.qty * x.price), 0);
        const totalProfit = totalOutValue - totalInValue;
        const uniqueItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
        const el1 = document.getElementById('dash-total-in');
        if (el1) el1.textContent = totalIn;
        const el2 = document.getElementById('dash-total-out');
        if (el2) el2.textContent = totalOut;
        const el3 = document.getElementById('dash-unique-items');
        if (el3) el3.textContent = uniqueItems.length;
        const el4 = document.getElementById('dash-revenue');
        if (el4) el4.textContent = 'PKR ' + totalOutValue.toLocaleString();
        const el5 = document.getElementById('dash-profit');
        if (el5) { el5.textContent = 'PKR ' + totalProfit.toLocaleString();
            el5.style.color = totalProfit >= 0 ? '#27ae60' : '#e74c3c'; }
        const act = document.getElementById('recent-activity');
        if (act) {
            const all = [...db.in.map(x => ({ ...x,
                type: 'IN' })), ...db.out.map(x => ({ ...x,
                type: 'OUT' }))];
            all.sort((a, b) => new Date(b.date) - new Date(a.date));
            const recent = all.slice(0, 10);
            act.innerHTML = recent.length ? recent.map(x => `
                <div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #f0f0f0;">
                    <span><span style="font-weight:600;">${escapeHtml(x.item)}</span> <span style="color:${x.type === 'IN' ? '#27ae60' : '#e74c3c'};font-weight:bold;">${x.type === 'IN' ? '📥 +' : '📤 -'}${x.qty}</span></span>
                    <span style="color:#7f8c8d;font-size:12px;">${x.date}</span>
                </div>
            `).join('') : `<p style="color:#7f8c8d;text-align:center;padding:20px;">No activity yet</p>`;
        }
    } catch (err) { console.error('❌ Dashboard error:', err); }
}

function escapeHtml(text) { if (!text) return '';
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML; }

function updateItemLists() {
    const list = document.getElementById('items-list');
    if (!list) return;
    const items = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    list.innerHTML = items.map(name => `<option value="${escapeHtml(name)}">`).join('');
}

function updateCustomerDropdown() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    list.innerHTML = Object.keys(db.ledgers).map(name => `<option value="${escapeHtml(name)}">`).join('');
}

// ==========================================
// LIVE STOCK CHECK
// ==========================================
function showLiveStock(itemName) {
    try {
        const status = document.getElementById('stock-status');
        if (!status) return;
        if (!itemName || !itemName.trim()) {
            status.innerHTML = '';
            return;
        }
        const totalIn = db.in.filter(x => x.item === itemName).reduce((s, x) => s + x.qty, 0);
        const totalOut = db.out.filter(x => x.item === itemName).reduce((s, x) => s + x.qty, 0);
        const balance = totalIn - totalOut;
        if (balance > 0) {
            status.style.color = '#27ae60';
            status.innerHTML = `✅ Available: <strong>${balance}</strong>`;
        } else if (balance <= 0 && totalIn > 0) {
            status.style.color = '#e74c3c';
            status.innerHTML = `⚠️ Out of Stock! (Balance: ${balance})`;
        } else {
            status.style.color = '#7f8c8d';
            status.innerHTML = 'ℹ️ No record found.';
        }
    } catch (err) { console.error('❌ showLiveStock error:', err); }
}

// ==========================================
// RENT BOOK - FIXED with Filter
// ==========================================
function addRentEntry() {
    try {
        const name = document.getElementById('rent-name').value.trim();
        const shop = document.getElementById('rent-shop-no').value.trim() || 'N/A';
        const date = document.getElementById('rent-date').value;
        const month = document.getElementById('rent-month').value.trim();
        const debit = Number(document.getElementById('rent-debit').value) || 0;
        const credit = Number(document.getElementById('rent-credit').value) || 0;
        const method = document.getElementById('rent-method').value || 'Cash';

        if (!name) { showNotification('⚠️ Enter shopkeeper name!', 'warning'); return; }
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (debit === 0 && credit === 0) { showNotification('⚠️ Enter rent or advance!', 'warning'); return; }

        const entryData = { name, shop, date, month, debit, credit, method };
        const tempId = 'local_' + Date.now();
        dbRent.push({ id: tempId, ...entryData });
        saveLocalData();
        renderRentTable();

        if (_supabase && isSupabaseConnected && navigator.onLine) {
            _supabase.from('krt_rent').insert([entryData])
                .then(result => {
                    if (!result.error && result.data && result.data.length > 0) {
                        const idx = dbRent.findIndex(x => x.id === tempId);
                        if (idx !== -1) { dbRent[idx].id = result.data[0].id;
                            saveLocalData(); }
                    }
                })
                .catch(() => addPendingSync({ type: 'insert', table: 'krt_rent', data: entryData }));
        } else { addPendingSync({ type: 'insert', table: 'krt_rent', data: entryData }); }

        document.getElementById('rent-name').value = '';
        document.getElementById('rent-shop-no').value = '';
        document.getElementById('rent-date').value = '';
        document.getElementById('rent-month').value = '';
        document.getElementById('rent-debit').value = '';
        document.getElementById('rent-credit').value = '';
        showNotification('✅ Rent entry saved!', 'success');
    } catch (err) { console.error('❌ addRentEntry error:', err); }
}

function renderRentTable() {
    try {
        const tbody = document.getElementById('rent-main-rows');
        if (!tbody) return;
        
        const filterText = document.getElementById('rent-filter')?.value?.toLowerCase() || '';
        const filtered = filterText ? dbRent.filter(r => r.name.toLowerCase().includes(filterText)) : dbRent;
        
        let html = '',
            totalDebit = 0,
            totalCredit = 0;

        // Calculate cumulative balance per shopkeeper
        const shopkeepers = {};
        filtered.forEach(r => {
            if (!shopkeepers[r.name]) shopkeepers[r.name] = { debit: 0, credit: 0 };
            shopkeepers[r.name].debit += r.debit;
            shopkeepers[r.name].credit += r.credit;
        });

        filtered.forEach((r) => {
            totalDebit += r.debit;
            totalCredit += r.credit;
            const balance = shopkeepers[r.name].debit - shopkeepers[r.name].credit;
            html += `<tr>
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.shop || 'N/A')}</td>
                <td>${r.date}</td>
                <td>${escapeHtml(r.month || '')}</td>
                <td style="color:#e74c3c;">${r.debit.toLocaleString()}</td>
                <td style="color:#27ae60;">${r.credit.toLocaleString()}</td>
                <td>${escapeHtml(r.method)}</td>
                <td style="font-weight:bold;color:${balance >= 0 ? '#e74c3c' : '#27ae60'};">${balance.toLocaleString()}</td>
                <td><button class="btn-action btn-delete" onclick="deleteRentEntry('${r.id}')">🗑️</button></td>
            </tr>`;
        });

        tbody.innerHTML = html || `<tr><td colspan="9" style="text-align:center;padding:20px;color:#888;">📭 No entries</td></tr>`;

        const td = document.getElementById('rent-total-debit');
        if (td) td.textContent = totalDebit.toLocaleString();
        const tc = document.getElementById('rent-total-credit');
        if (tc) tc.textContent = totalCredit.toLocaleString();
        const bal = document.getElementById('rent-final-balance');
        if (bal) {
            const finalBal = totalDebit - totalCredit;
            bal.textContent = finalBal.toLocaleString();
            bal.style.color = finalBal >= 0 ? '#e74c3c' : '#27ae60';
        }
    } catch (err) { console.error('❌ renderRentTable error:', err); }
}

function deleteRentEntry(id) {
    if (!confirm('⚠️ Delete this entry?')) return;
    const index = dbRent.findIndex(x => x.id === id);
    if (index === -1) return;
    const record = dbRent[index];
    if (record && record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator
        .onLine) {
        _supabase.from('krt_rent').delete().eq('id', record.id).catch(() => addPendingSync({ type: 'delete', table: 'krt_rent',
            id: record.id }));
    }
    dbRent.splice(index, 1);
    saveLocalData();
    renderRentTable();
    showNotification('✅ Rent entry deleted!', 'success');
}

// ==========================================
// LEDGERS
// ==========================================
function saveLedgerEntry() {
    try {
        const name = document.getElementById('ledger-cust-name').value.trim();
        const date = document.getElementById('led-date').value;
        const item = document.getElementById('led-item').value.trim();
        const qty = Number(document.getElementById('led-qty').value) || 0;
        const price = Number(document.getElementById('led-price').value) || 0;
        const debit = Number(document.getElementById('led-debit').value) || 0;
        const credit = Number(document.getElementById('led-credit').value) || 0;
        const method = document.getElementById('led-method').value || 'Cash';

        if (!name) { showNotification('⚠️ Enter customer name!', 'warning'); return; }
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (debit === 0 && credit === 0) { showNotification('⚠️ Enter debit or credit!', 'warning'); return; }

        if (!db.ledgers[name]) db.ledgers[name] = [];
        if (!db.opening_balances[name]) db.opening_balances[name] = 0;

        const total = qty * price;
        db.ledgers[name].push({ date, item, qty, price, total, debit, credit, method });
        saveLocalData();
        showLedger();

        document.getElementById('ledger-cust-name').value = '';
        document.getElementById('led-date').value = '';
        document.getElementById('led-item').value = '';
        document.getElementById('led-qty').value = '';
        document.getElementById('led-price').value = '';
        document.getElementById('led-debit').value = '';
        document.getElementById('led-credit').value = '';
        showNotification('✅ Ledger entry saved!', 'success');
    } catch (err) { console.error('❌ saveLedgerEntry error:', err); }
}

function updateOpeningBal() {
    try {
        const name = document.getElementById('ledger-cust-name').value.trim();
        const val = Number(document.getElementById('opening-bal').value) || 0;
        if (name) {
            db.opening_balances[name] = val;
            saveLocalData();
            showLedger();
        }
    } catch (err) { console.error('❌ updateOpeningBal error:', err); }
}

function showLedger() {
    try {
        const name = document.getElementById('ledger-cust-name').value.trim();
        const tbody = document.getElementById('ledger-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        let totalQty = 0,
            totalPrice = 0,
            totalValue = 0,
            totalDebit = 0,
            totalCredit = 0;

        if (name && db.ledgers[name]) {
            const opening = db.opening_balances[name] || 0;
            let runningBalance = opening;

            db.ledgers[name].forEach((entry, i) => {
                totalQty += entry.qty || 0;
                totalPrice += entry.price || 0;
                totalValue += entry.total || 0;
                totalDebit += entry.debit || 0;
                totalCredit += entry.credit || 0;
                runningBalance += (entry.debit || 0) - (entry.credit || 0);

                tbody.innerHTML += `<tr>
                    <td>${i+1}</td>
                    <td>${entry.date}</td>
                    <td>${escapeHtml(entry.item || '')}</td>
                    <td>${entry.qty || 0}</td>
                    <td>${(entry.price || 0).toLocaleString()}</td>
                    <td>${(entry.total || 0).toLocaleString()}</td>
                    <td style="color:#e74c3c;">${(entry.debit || 0).toLocaleString()}</td>
                    <td style="color:#27ae60;">${(entry.credit || 0).toLocaleString()}</td>
                    <td>${escapeHtml(entry.method || 'Cash')}</td>
                    <td>
                        <button class="btn-action btn-edit" onclick="editLedger('${escapeHtml(name)}',${i})">✏️</button>
                        <button class="btn-action btn-delete" onclick="delLedger('${escapeHtml(name)}',${i})">🗑️</button>
                    </td>
                </tr>`;
            });
        }

        document.getElementById('total-ledger-qty').textContent = totalQty;
        document.getElementById('total-ledger-price').textContent = totalPrice.toLocaleString();
        document.getElementById('total-ledger-value').textContent = totalValue.toLocaleString();
        document.getElementById('total-ledger-debit').textContent = totalDebit.toLocaleString();
        document.getElementById('total-ledger-credit').textContent = totalCredit.toLocaleString();
        const finalBal = document.getElementById('final-ledger-balance');
        if (finalBal) {
            const opening = db.opening_balances[name] || 0;
            const balance = opening + totalDebit - totalCredit;
            finalBal.textContent = `Balance: ${balance.toLocaleString()}`;
            finalBal.style.color = balance >= 0 ? '#e74c3c' : '#27ae60';
        }
    } catch (err) { console.error('❌ showLedger error:', err); }
}

function delLedger(custName, index) {
    if (!confirm('⚠️ Delete this entry?')) return;
    if (db.ledgers[custName] && db.ledgers[custName][index]) {
        db.ledgers[custName].splice(index, 1);
        if (db.ledgers[custName].length === 0) {
            delete db.ledgers[custName];
            delete db.opening_balances[custName];
        }
        saveLocalData();
        showLedger();
        showNotification('✅ Entry deleted!', 'success');
    }
}

function editLedger(custName, index) {
    const entry = db.ledgers[custName] && db.ledgers[custName][index];
    if (!entry) { showNotification('⚠️ Entry not found!', 'error'); return; }
    const newDebit = prompt('New Debit:', entry.debit);
    if (newDebit === null) return;
    const newCredit = prompt('New Credit:', entry.credit);
    if (newCredit === null) return;
    db.ledgers[custName][index].debit = Number(newDebit) || 0;
    db.ledgers[custName][index].credit = Number(newCredit) || 0;
    saveLocalData();
    showLedger();
    showNotification('✅ Updated!', 'success');
}

// ==========================================
// USERS
// ==========================================
function loadUserTable() {
    try {
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;
        tbody.innerHTML = extraUsers.map((u, i) =>
            `<tr><td>${escapeHtml(u.id)}</td><td>${escapeHtml(u.name)}</td><td><small>${escapeHtml(u.perms ? u.perms.join(', ') : '')}</small></td>
            <td><button class="btn-action btn-delete" onclick="deleteExtraUser(${i})">🗑️</button></td></tr>`
        ).join('') || `<tr><td colspan="4" style="text-align:center;padding:20px;color:#888;">No users</td></tr>`;
    } catch (err) { console.error('❌ loadUserTable error:', err); }
}

function deleteExtraUser(index) {
    if (!confirm('⚠️ Delete user?')) return;
    extraUsers.splice(index, 1);
    saveLocalData();
    loadUserTable();
    showNotification('✅ User deleted!', 'success');
}

function createNewUser() {
    try {
        const name = document.getElementById('new-username').value.trim();
        const id = document.getElementById('new-userid').value.trim();
        const pass = document.getElementById('new-password').value.trim();
        const perms = [];
        document.querySelectorAll('.perm:checked').forEach(cb => perms.push(cb.value));
        if (!name) { showNotification('⚠️ Enter name!', 'warning'); return; }
        if (!id) { showNotification('⚠️ Enter user ID!', 'warning'); return; }
        if (!pass) { showNotification('⚠️ Enter password!', 'warning'); return; }
        if (extraUsers.some(u => u.id === id)) { showNotification('⚠️ User ID exists!', 'warning'); return; }
        extraUsers.push({ id, pass, name, perms });
        saveLocalData();
        loadUserTable();
        document.getElementById('new-username').value = '';
        document.getElementById('new-userid').value = '';
        document.getElementById('new-password').value = '';
        document.querySelectorAll('.perm:checked').forEach(cb => cb.checked = false);
        showNotification(`✅ User "${name}" created!`, 'success');
    } catch (err) { console.error('❌ createNewUser error:', err); }
}

// ==========================================
// LOGIN / LOGOUT
// ==========================================
function login() {
    try {
        const u = document.getElementById('user').value.trim().toLowerCase();
        const p = document.getElementById('pass').value.trim();
        if (u === 'admin' && p === '123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'admin');
            showSystem('admin');
        } else if (u === 'ali' && p === '123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'staff');
            showSystem('staff');
        } else if (u === 'sattar' && p === '123') {
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userRole', 'manager');
            showSystem('manager');
        } else {
            const found = extraUsers.find(user => user.id === u && user.pass === p);
            if (found) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('userRole', 'extra');
                showSystem(found);
            } else {
                showNotification('❌ Wrong ID or Password!', 'error');
            }
        }
    } catch (err) { console.error('❌ Login error:', err); }
}

function showSystem(roleOrUser) {
    try {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('sidebar').style.display = 'block';
        document.getElementById('main-content').style.display = 'block';
        if (typeof roleOrUser === 'object') {
            const items = document.querySelectorAll('#sidebar ul li');
            items.forEach(item => {
                const onclick = item.getAttribute('onclick') || '';
                if (onclick.includes('page-dashboard') || onclick.includes('logout')) { item.style.display = 'flex'; return; }
                let hasPerm = false;
                if (roleOrUser.perms) hasPerm = roleOrUser.perms.some(p => onclick.includes(p));
                item.style.display = hasPerm ? 'flex' : 'none';
            });
        } else {
            const items = document.querySelectorAll('#sidebar ul li');
            items.forEach(item => item.style.display = 'flex');
            if (roleOrUser === 'staff') {
                items.forEach(item => {
                    const t = item.innerText || '';
                    if (!t.includes('Dashboard') && !t.includes('Report') && !t.includes('Balance') && !t.includes(
                            'Logout')) {
                        item.style.display = 'none';
                    }
                });
            } else if (roleOrUser === 'manager') {
                items.forEach(item => {
                    const t = item.innerText || '';
                    if (!t.includes('Dashboard') && !t.includes('Ledgers') && !t.includes('Rent Book') && !t
                        .includes('Balance') && !t.includes('Logout')) {
                        item.style.display = 'none';
                    }
                });
            }
        }
        renderAll();
        updateDashboardStats();
        loadUserTable();
    } catch (err) { console.error('❌ showSystem error:', err); }
}

function logout() {
    if (!confirm('🚪 Logout?')) return;
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    location.reload();
}

// ==========================================
// SIDEBAR
// ==========================================
function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const mc = document.getElementById('main-content');
    if (!sb || !mc) return;
    if (sb.style.left === '0px') { sb.style.left = '-240px';
        mc.style.marginLeft = '0'; } else { sb.style.left = '0px';
        mc.style.marginLeft = '240px'; }
}

function switchPage(pageId, title) {
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    const page = document.getElementById(pageId);
    if (page) page.style.display = 'block';
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = `🐘 KRT TRADERS ERP - ${title}`;
}

// ==========================================
// SEARCH / REPORT - FIXED with ID
// ==========================================
function generateMasterSearch() {
    try {
        const from = document.getElementById('master-from').value;
        const to = document.getElementById('master-to').value;
        if (!from || !to) { showNotification('⚠️ Select dates!', 'warning'); return; }
        const fIn = db.in.filter(x => x.date >= from && x.date <= to);
        const fOut = db.out.filter(x => x.date >= from && x.date <= to);
        const inTable = document.getElementById('master-in-table');
        if (inTable) {
            inTable.innerHTML = fIn.map(x => `<tr><td>${x.date}</td><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.vendor)}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
                <td><button class="btn-action btn-edit" onclick="editEntry('in','${x.id}')">✏️</button><button class="btn-action btn-delete" onclick="deleteEntry('in','${x.id}')">🗑️</button></td></tr>`).join('') ||
                `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">No records</td></tr>`;
        }
        const outTable = document.getElementById('master-out-table');
        if (outTable) {
            outTable.innerHTML = fOut.map(x => `<tr><td>${x.date}</td><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.cust)}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total}</td>
                <td><button class="btn-action btn-edit" onclick="editEntry('out','${x.id}')">✏️</button><button class="btn-action btn-delete" onclick="deleteEntry('out','${x.id}')">🗑️</button></td></tr>`).join('') ||
                `<tr><td colspan="7" style="text-align:center;padding:20px;color:#888;">No records</td></tr>`;
        }
        showNotification(`✅ Found ${fIn.length + fOut.length} records`, 'success');
    } catch (err) { console.error('❌ generateMasterSearch error:', err); }
}

function generateCustomReport() {
    try {
        const from = document.getElementById('rep-from-date').value;
        const to = document.getElementById('rep-to-date').value;
        if (!from || !to) { showNotification('⚠️ Select dates!', 'warning'); return; }
        const fIn = db.in.filter(x => x.date >= from && x.date <= to);
        const fOut = db.out.filter(x => x.date >= from && x.date <= to);
        const totalInValue = fIn.reduce((s, x) => s + x.total, 0);
        const totalOutValue = fOut.reduce((s, x) => s + x.total, 0);
        const inTable = document.querySelector('#rep-in-table');
        if (inTable) {
            inTable.innerHTML = fIn.map(x => `<tr><td>${x.date}</td><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.vendor)}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total.toLocaleString()}</td></tr>`)
                .join('') ||
                `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888;">No records</td></tr>`;
        }
        const outTable = document.querySelector('#rep-out-table');
        if (outTable) {
            outTable.innerHTML = fOut.map(x => `<tr><td>${x.date}</td><td>${escapeHtml(x.item)}</td><td>${escapeHtml(x.cust)}</td><td>${x.qty}</td><td>${x.price}</td><td>${x.total.toLocaleString()}</td></tr>`)
                .join('') ||
                `<tr><td colspan="6" style="text-align:center;padding:20px;color:#888;">No records</td></tr>`;
        }
        const existing = document.querySelector('.report-summary');
        if (existing) existing.remove();
        const summary = document.createElement('div');
        summary.className = 'report-summary';
        summary.style.cssText =
            'display:flex;justify-content:space-around;background:#2c3e50;color:white;padding:15px;border-radius:8px;margin-top:20px;flex-wrap:wrap;';
        summary.innerHTML = `
            <span>📥 Total IN: PKR ${totalInValue.toLocaleString()}</span>
            <span>📤 Total OUT: PKR ${totalOutValue.toLocaleString()}</span>
            <span style="color:${totalOutValue - totalInValue >= 0 ? '#2ecc71' : '#e74c3c'};font-weight:bold;">
                💰 Profit: PKR ${(totalOutValue - totalInValue).toLocaleString()}
            </span>
        `;
        const printArea = document.getElementById('print-area');
        if (printArea) printArea.appendChild(summary);
        document.getElementById('report-period').textContent = `📅 Period: ${from} to ${to}`;
        showNotification('✅ Report generated!', 'success');
    } catch (err) { console.error('❌ generateCustomReport error:', err); }
}

// ==========================================
// EXPORT DATA - NEW FUNCTION
// ==========================================
function exportAllData() {
    try {
        // Export Stock IN
        let csvIn = 'Date,Item,Vendor,Qty,Price,Total\n';
        db.in.forEach(x => {
            csvIn += `${x.date},${x.item},${x.vendor},${x.qty},${x.price},${x.total}\n`;
        });
        downloadCSV(csvIn, 'stock_in_data.csv');

        // Export Stock OUT
        let csvOut = 'Date,Item,Customer,Qty,Price,Total\n';
        db.out.forEach(x => {
            csvOut += `${x.date},${x.item},${x.cust},${x.qty},${x.price},${x.total}\n`;
        });
        downloadCSV(csvOut, 'stock_out_data.csv');

        // Export Rent Book
        let csvRent = 'Name,Shop,Date,Month,Debit,Credit,Method\n';
        dbRent.forEach(x => {
            csvRent += `${x.name},${x.shop},${x.date},${x.month},${x.debit},${x.credit},${x.method}\n`;
        });
        downloadCSV(csvRent, 'rent_book_data.csv');

        showNotification('✅ All data exported!', 'success');
    } catch (err) { console.error('❌ Export error:', err);
        showNotification('❌ Export failed!', 'error'); }
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

// ==========================================
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = 'info') {
    try {
        const colors = { success: '#27ae60', error: '#e74c3c', warning: '#f39c12', info: '#3498db' };
        const existing = document.querySelectorAll('.toast-notification');
        existing.forEach(el => { if (el.textContent === message) el.remove(); });
        const div = document.createElement('div');
        div.className = `toast-notification ${type}`;
        div.textContent = message;
        div.style.cssText = `
            position:fixed;bottom:20px;right:20px;padding:12px 24px;
            background:white;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.2);
            border-left:4px solid ${colors[type] || '#3498db'};
            z-index:999999;font-family:'Poppins',sans-serif;
            max-width:400px;transform:translateY(100px);opacity:0;
            transition:all 0.4s ease;font-size:14px;
        `;
        document.body.appendChild(div);
        setTimeout(() => { div.style.transform = 'translateY(0)';
            div.style.opacity = '1'; }, 50);
        setTimeout(() => { div.style.transform = 'translateY(100px)';
            div.style.opacity = '0';
            setTimeout(() => { if (div.parentNode) div.remove(); }, 400); }, 4000);
    } catch (err) { console.error('❌ showNotification error:', err); }
}

function printSection() { window.print(); }

// ==========================================
// STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    try {
        loadLocalData();
        renderAll();
        renderRentTable();
        loadUserTable();
        updateCustomerDropdown();
        updateItemLists();
        setTimeout(() => {
            testSupabaseConnection();
            if (navigator.onLine && isSupabaseConnected) syncAllCloudData();
        }, 2000);
        const loggedIn = localStorage.getItem('isLoggedIn');
        const role = localStorage.getItem('userRole');
        if (loggedIn === 'true') {
            if (role === 'admin') showSystem('admin');
            else if (role === 'staff') showSystem('staff');
            else if (role === 'manager') showSystem('manager');
        }
        console.log('🚀 KRT TRADERS ERP v5.0 Loaded!');
        console.log('📦 Developed by Bilal Suleman');
    } catch (err) { console.error('❌ Startup error:', err);
        showNotification('⚠️ Error loading app: ' + err.message, 'error'); }
});

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') { e.preventDefault();
        syncAllCloudData(); }
    if (e.key === 'Escape') { const sb = document.getElementById('sidebar'); if (sb && sb.style.left === '0px') toggleSidebar(); }
    if (e.key === 'Enter') { const pass = document.getElementById('pass'); if (pass && document.activeElement === pass)
            login(); }
});

// ==========================================
// CLOCK
// ==========================================
function updateClock() {
    const el = document.getElementById('live-clock');
    if (el) {
        const now = new Date();
        el.textContent = now.toLocaleString('en-PK', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit' });
    }
}
setInterval(updateClock, 10000);
updateClock();

// ==========================================
// WELCOME
// ==========================================
(function() {
    const overlay = document.getElementById('welcome-overlay');
    const bar = document.getElementById('loading-bar');
    if (bar) {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 3 + 0.5;
            if (progress >= 100) { progress = 100;
                clearInterval(interval);
                setTimeout(() => { overlay.style.display = 'none';
                    document.getElementById('login-screen').style.display = 'flex'; }, 500); }
            bar.style.width = progress + '%';
        }, 70);
    } else {
        setTimeout(() => { overlay.style.display = 'none';
            document.getElementById('login-screen').style.display = 'flex'; }, 1000);
    }
})();

console.log('🐘 KRT TRADERS ERP v5.0 - Ready!');
