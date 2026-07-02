// ==========================================
// KRT TRADERS ERP - COMPLETE SCRIPT v5.0
// Developed by Bilal Suleman
// ==========================================

// ==========================================
// SUPABASE CONFIGURATION
// ==========================================
const SUPABASE_URL = 'https://jsxcm1pjdxxgloofdrugz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Gyt7XmMb2fQxDouyHQMTYg_pB8dhGtb';

let _supabase = null;
let isSupabaseConnected = false;

// ==========================================
// GLOBAL VARIABLES
// ==========================================
const IDLE_TIMEOUT = 30000;
let idleTimer = null;
let isIdle = false;
let idleSeconds = 0;
let idleInterval = null;

let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];
let pendingSync = [];

// ==========================================
// INITIALIZE SUPABASE
// ==========================================
try {
    _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log('✅ Supabase client created');
} catch (err) {
    console.error('❌ Supabase init failed:', err);
}

// ==========================================
// TEST SUPABASE CONNECTION
// ==========================================
async function testSupabaseConnection() {
    try {
        if (!_supabase) return;
        
        const { data, error } = await _supabase
            .from('KRT')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            isSupabaseConnected = false;
            showNotification('⚠️ Offline mode', 'warning');
            return;
        }
        
        isSupabaseConnected = true;
        console.log('✅ Connected!');
        showNotification('✅ Connected to database!', 'success');
        await fetchCloudData();
        renderAll();
    } catch (err) {
        isSupabaseConnected = false;
    }
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
        console.error('❌ Load error:', err);
        db = { in: [], out: [], ledgers: {}, opening_balances: {} };
        dbRent = [];
        extraUsers = [];
        pendingSync = [];
    }
}

// ==========================================
// SAVE LOCAL DATA
// ==========================================
function saveLocalData() {
    try {
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
    } catch (err) {
        console.error('❌ Save error:', err);
    }
}

function saveAndRefresh() {
    saveLocalData();
    renderAll();
    updateDashboardStats();
}

// ==========================================
// FETCH CLOUD DATA - KRT TABLE
// ==========================================
async function fetchCloudData() {
    try {
        if (!_supabase || !isSupabaseConnected) return;
        
        const { data, error } = await _supabase
            .from('KRT')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error('❌ Fetch error:', error);
            return;
        }
        
        if (!data || data.length === 0) return;
        
        db.in = [];
        db.out = [];
        
        data.forEach(function(row) {
            try {
                const inQty = Number(row.stock_in || 0);
                const outQty = Number(row.stock_out || 0);
                const price = Number(row.price || 0);
                const date = (row.Date || row.date || '').split('T')[0] || new Date().toISOString().split('T')[0];
                
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
            } catch (rowErr) {
                console.warn('⚠️ Row error:', rowErr);
            }
        });
        
        saveLocalData();
        renderAll();
        updateDashboardStats();
    } catch (err) {
        console.error('❌ Fetch error:', err);
    }
}

// ==========================================
// FETCH CLOUD RENT DATA - KRT_RENT TABLE
// ==========================================
async function fetchCloudRentData() {
    try {
        if (!_supabase || !isSupabaseConnected) return;
        
        const { data, error } = await _supabase
            .from('KRT_RENT')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error('❌ Rent fetch error:', error);
            return;
        }
        
        if (!data || data.length === 0) return;
        
        dbRent = data.map(function(row) {
            return {
                id: row.id,
                name: row.name,
                shop: row.shop,
                date: row.date,
                month: row.month,
                debit: Number(row.debit || 0),
                credit: Number(row.credit || 0),
                method: row.method || 'Cash'
            };
        });
        
        saveLocalData();
        renderRentTable();
    } catch (err) {
        console.error('❌ Rent fetch error:', err);
    }
}

// ==========================================
// SYNC ALL CLOUD DATA
// ==========================================
async function syncAllCloudData() {
    try {
        if (!navigator.onLine) {
            showNotification('⚠️ No internet!', 'warning');
            return;
        }
        
        if (!_supabase || !isSupabaseConnected) {
            showNotification('⚠️ Database not available', 'warning');
            return;
        }
        
        showNotification('☁️ Syncing...', 'info');
        await fetchCloudData();
        await fetchCloudRentData();
        await processPendingSync();
        showNotification('✅ Sync complete!', 'success');
    } catch (err) {
        console.error('❌ Sync error:', err);
        showNotification('❌ Sync failed', 'error');
    }
}

// ==========================================
// PENDING SYNC
// ==========================================
async function processPendingSync() {
    try {
        if (!_supabase || !isSupabaseConnected || !navigator.onLine) return;
        if (pendingSync.length === 0) return;
        
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
            } catch (err) {
                failed.push(op);
            }
        }
        
        pendingSync = failed;
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
    } catch (err) {
        console.error('❌ Pending sync error:', err);
    }
}

function addPendingSync(op) {
    try {
        pendingSync.push(op);
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
        if (navigator.onLine && isSupabaseConnected) {
            setTimeout(processPendingSync, 2000);
        }
    } catch (err) {
        console.error('❌ Add pending error:', err);
    }
}

// ==========================================
// STOCK IN
// ==========================================
async function addIn() {
    alert("addIn function called");
    try {
        const dateInput = document.getElementById('in-date');
        const vendorInput = document.getElementById('in-vendor');
        const itemInput = document.getElementById('in-item');
        const barcodeInput = document.getElementById('in-barcode');
        const qtyInput = document.getElementById('in-qty');
        const priceInput = document.getElementById('in-price');
        
        const date = dateInput ? dateInput.value : '';
        const vendor = vendorInput ? vendorInput.value : 'factory';
        const item = itemInput ? itemInput.value.trim() : '';
        const barcode = barcodeInput ? barcodeInput.value : '';
        const qty = Number(qtyInput ? qtyInput.value : 0);
        const price = Number(priceInput ? priceInput.value : 0) || 0;
        
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (!item) { showNotification('⚠️ Enter item name!', 'warning'); return; }
        if (qty <= 0 || isNaN(qty)) { showNotification('⚠️ Valid quantity!', 'warning'); return; }
        
        const entryData = {
            Date: date,
            item_name: item,
            stock_in: qty,
            stock_out: 0,
            price: price,
            vendor_name: vendor
        };
        
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            try {
                const { data, error } = await _supabase
                    .from('KRT')
                    .insert([entryData])
                    .select();
                console.log("Entry Data:", entryData);
console.log("Data:", data);
console.log("Error:", error);

if (error) {
    alert(error.message);
}
                
                if (!error && data && data.length > 0) {
                    db.in.push({
                        id: data[0].id,
                        date: date,
                        vendor: vendor,
                        item: item,
                        barcode: barcode,
                        qty: qty,
                        price: price,
                        total: qty * price
                    });
                    saveAndRefresh();
                    clearInForm();
                    showNotification('✅ Stock IN saved to cloud!', 'success');
                    await fetchCloudData();
                    return;
                }
            } catch (err) {
                console.error('❌ Cloud error:', err);
            }
        }
        
        // Local save
        const tempId = 'local_' + Date.now();
        db.in.push({
            id: tempId,
            date: date,
            vendor: vendor,
            item: item,
            barcode: barcode,
            qty: qty,
            price: price,
            total: qty * price
        });
        saveAndRefresh();
        addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
        clearInForm();
        showNotification('✅ Stock IN saved locally!', 'warning');
        
    } catch (err) {
        console.error('❌ addIn error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

function clearInForm() {
    const fields = ['in-date', 'in-vendor', 'in-item', 'in-barcode', 'in-qty', 'in-price'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

// ==========================================
// STOCK OUT
// ==========================================
async function addOut() {
    try {
        const dateInput = document.getElementById('out-date');
        const customerInput = document.getElementById('out-customer');
        const itemInput = document.getElementById('out-item');
        const barcodeInput = document.getElementById('out-barcode');
        const qtyInput = document.getElementById('out-qty');
        const priceInput = document.getElementById('out-price');
        
        const date = dateInput ? dateInput.value : '';
        const custName = customerInput ? customerInput.value.trim() || 'General Sale' : 'General Sale';
        const item = itemInput ? itemInput.value.trim() : '';
        const barcode = barcodeInput ? barcodeInput.value : '';
        const qty = Number(qtyInput ? qtyInput.value : 0);
        const price = Number(priceInput ? priceInput.value : 0) || 0;
        
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (!item) { showNotification('⚠️ Enter item name!', 'warning'); return; }
        if (qty <= 0 || isNaN(qty)) { showNotification('⚠️ Valid quantity!', 'warning'); return; }
        
        // Check stock
        const totalIn = db.in.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
        const totalOut = db.out.filter(x => x.item === item).reduce((s, x) => s + x.qty, 0);
        const available = totalIn - totalOut;
        
        if (qty > available) {
            showNotification(`⚠️ Only ${available} available!`, 'warning');
            return;
        }
        
        const entryData = {
            Date: date,
            item_name: item,
            stock_in: 0,
            stock_out: qty,
            price: price,
            customer_name: custName
        };
        
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            try {
                const { data, error } = await _supabase
                    .from('KRT')
                    .insert([entryData])
                    .select();
                
                if (!error && data && data.length > 0) {
                    db.out.push({
                        id: data[0].id,
                        date: date,
                        cust: custName,
                        item: item,
                        barcode: barcode,
                        qty: qty,
                        price: price,
                        total: qty * price
                    });
                    saveAndRefresh();
                    clearOutForm();
                    showNotification('✅ Stock OUT saved to cloud!', 'success');
                    await fetchCloudData();
                    return;
                }
            } catch (err) {
                console.error('❌ Cloud error:', err);
            }
        }
        
        // Local save
        const tempId = 'local_' + Date.now();
        db.out.push({
            id: tempId,
            date: date,
            cust: custName,
            item: item,
            barcode: barcode,
            qty: qty,
            price: price,
            total: qty * price
        });
        saveAndRefresh();
        addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
        clearOutForm();
        showNotification('✅ Stock OUT saved locally!', 'warning');
        
    } catch (err) {
        console.error('❌ addOut error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

function clearOutForm() {
    const fields = ['out-date', 'out-customer', 'out-item', 'out-barcode', 'out-qty', 'out-price'];
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    const statusEl = document.getElementById('stock-status');
    if (statusEl) statusEl.innerHTML = '';
}

// ==========================================
// DELETE ENTRY
// ==========================================
async function deleteEntry(type, index) {
    try {
        if (!confirm('⚠️ Delete this record?')) return;
        
        const record = db[type] && db[type][index];
        if (!record) {
            showNotification('⚠️ Record not found!', 'error');
            return;
        }
        
        if (record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
            try {
                await _supabase.from('KRT').delete().eq('id', record.id);
            } catch (err) {
                addPendingSync({ type: 'delete', table: 'KRT', id: record.id });
            }
        }
        
        db[type].splice(index, 1);
        saveAndRefresh();
        showNotification('✅ Record deleted!', 'success');
    } catch (err) {
        console.error('❌ deleteEntry error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

// ==========================================
// EDIT ENTRY
// ==========================================
async function editEntry(type, index) {
    try {
        const record = db[type] && db[type][index];
        if (!record) {
            showNotification('⚠️ Record not found!', 'error');
            return;
        }
        
        const newQty = prompt('New Quantity:', record.qty);
        if (newQty === null) return;
        const newPrice = prompt('New Price:', record.price);
        if (newPrice === null) return;
        
        const qtyNum = Number(newQty);
        const priceNum = Number(newPrice) || 0;
        if (isNaN(qtyNum) || qtyNum < 0) {
            showNotification('⚠️ Invalid quantity!', 'warning');
            return;
        }
        
        if (record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
            try {
                await _supabase.from('KRT').update({
                    stock_in: type === 'in' ? qtyNum : 0,
                    stock_out: type === 'out' ? qtyNum : 0,
                    price: priceNum
                }).eq('id', record.id);
            } catch (err) {
                addPendingSync({ type: 'update', table: 'KRT', id: record.id, data: { stock_in: type === 'in' ? qtyNum : 0, stock_out: type === 'out' ? qtyNum : 0, price: priceNum } });
            }
        }
        
        db[type][index].qty = qtyNum;
        db[type][index].price = priceNum;
        db[type][index].total = qtyNum * priceNum;
        saveAndRefresh();
        showNotification('✅ Updated!', 'success');
    } catch (err) {
        console.error('❌ editEntry error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
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
            let html = '', c = 1;
            db.in.forEach(function(x, i) {
                if (x.date === today) {
                    html += `<tr>
                        <td>${c++}</td>
                        <td>${escapeHtml(x.item)}</td>
                        <td>${escapeHtml(x.vendor)}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${(x.qty * (x.price || 0)).toLocaleString()}</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="editEntry('in',${i})">✏️</button>
                            <button class="btn-action btn-delete" onclick="deleteEntry('in',${i})">🗑️</button>
                        </td>
                    </tr>`;
                }
            });
            inBody.innerHTML = html || `<tr><td colspan="7" style="text-align:center;padding:30px;color:#7f8c8d;">📭 No entries today</td></tr>`;
        }
        
        // Today's OUT
        const outBody = document.getElementById('today-list-out');
        if (outBody) {
            let html = '', c = 1;
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
                        <td>
                            <button class="btn-action btn-edit" onclick="editEntry('out',${i})">✏️</button>
                            <button class="btn-action btn-delete" onclick="deleteEntry('out',${i})">🗑️</button>
                        </td>
                    </tr>`;
                }
            });
            outBody.innerHTML = html || `<tr><td colspan="9" style="text-align:center;padding:30px;color:#7f8c8d;">📭 No sales today</td></tr>`;
        }
        
        // Stock Balance
        const balBody = document.getElementById('table-balance-body');
        if (balBody) {
            const items = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
            balBody.innerHTML = items.map(function(name) {
                if (!name) return '';
                
                const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
                const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + x.qty, 0);
                const totalInValue = db.in.filter(x => x.item === name).reduce((s, x) => s + (x.qty * x.price), 0);
                const totalOutValue = db.out.filter(x => x.item === name).reduce((s, x) => s + (x.qty * x.price), 0);
                const profit = totalOutValue - totalInValue;
                const bal = tin - tout;
                const inItem = db.in.find(x => x.item === name);
                
                return `<tr>
                    <td>${inItem ? escapeHtml(inItem.barcode) : 'N/A'}</td>
                    <td style="font-weight:600;">${escapeHtml(name)}</td>
                    <td style="color:#2980b9;">${tin}</td>
                    <td style="color:#e67e22;">${tout}</td>
                    <td style="font-weight:bold;color:${bal < 5 ? '#e74c3c' : '#27ae60'};">${bal}</td>
                    <td style="color:${profit >= 0 ? '#27ae60' : '#e74c3c'};font-weight:bold;">
                        PKR ${profit.toLocaleString()}
                    </td>
                </tr>`;
            }).join('') || `<tr><td colspan="6" style="text-align:center;padding:30px;color:#7f8c8d;">📭 No items</td></tr>`;
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
        const totalIn = db.in.reduce((s, x) => s + x.qty, 0);
        const totalOut = db.out.reduce((s, x) => s + x.qty, 0);
        const totalInValue = db.in.reduce((s, x) => s + (x.qty * x.price), 0);
        const totalOutValue = db.out.reduce((s, x) => s + (x.qty * x.price), 0);
        const totalProfit = totalOutValue - totalInValue;
        const uniqueItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
        
        const el1 = document.getElementById('dash-total-in');
        const el2 = document.getElementById('dash-total-out');
        const el3 = document.getElementById('dash-unique-items');
        const el4 = document.getElementById('dash-revenue');
        const el5 = document.getElementById('dash-profit');
        
        if (el1) el1.textContent = totalIn;
        if (el2) el2.textContent = totalOut;
        if (el3) el3.textContent = uniqueItems.length;
        if (el4) el4.textContent = 'PKR ' + totalOutValue.toLocaleString();
        if (el5) {
            el5.textContent = 'PKR ' + totalProfit.toLocaleString();
            el5.style.color = totalProfit >= 0 ? '#27ae60' : '#e74c3c';
        }
    } catch (err) {
        console.error('❌ updateDashboardStats error:', err);
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
    } catch (err) {
        console.error('❌ showLiveStock error:', err);
    }
}

// ==========================================
// UPDATE ITEM LISTS
// ==========================================
function updateItemLists() {
    try {
        const list = document.getElementById('items-list');
        if (!list) return;
        const items = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
        list.innerHTML = items.map(name => `<option value="${escapeHtml(name)}">`).join('');
    } catch (err) {
        console.error('❌ updateItemLists error:', err);
    }
}

function updateCustomerDropdown() {
    try {
        const list = document.getElementById('customer-list');
        if (!list) return;
        list.innerHTML = Object.keys(db.ledgers).map(name => `<option value="${escapeHtml(name)}">`).join('');
    } catch (err) {
        console.error('❌ updateCustomerDropdown error:', err);
    }
}

// ==========================================
// RENT BOOK
// ==========================================
function addRentEntry() {
    try {
        const nameInput = document.getElementById('rent-name');
        const dateInput = document.getElementById('rent-date');
        const debitInput = document.getElementById('rent-debit');
        const creditInput = document.getElementById('rent-credit');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const date = dateInput ? dateInput.value : '';
        const debit = Number(debitInput ? debitInput.value : 0) || 0;
        const credit = Number(creditInput ? creditInput.value : 0) || 0;
        
        if (!name) { showNotification('⚠️ Enter name!', 'warning'); return; }
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (debit === 0 && credit === 0) { showNotification('⚠️ Enter debit or credit!', 'warning'); return; }
        
        const entryData = { name, date, debit, credit, shop: '', month: '', method: 'Cash' };
        const tempId = 'local_' + Date.now();
        
        dbRent.push({ id: tempId, ...entryData });
        saveLocalData();
        renderRentTable();
        
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            _supabase.from('KRT_RENT').insert([entryData]).then(result => {
                if (!result.error && result.data && result.data.length > 0) {
                    const idx = dbRent.findIndex(x => x.id === tempId);
                    if (idx !== -1) {
                        dbRent[idx].id = result.data[0].id;
                        saveLocalData();
                    }
                }
            }).catch(() => {
                addPendingSync({ type: 'insert', table: 'KRT_RENT', data: entryData });
            });
        } else {
            addPendingSync({ type: 'insert', table: 'KRT_RENT', data: entryData });
        }
        
        if (nameInput) nameInput.value = '';
        if (dateInput) dateInput.value = '';
        if (debitInput) debitInput.value = '';
        if (creditInput) creditInput.value = '';
        showNotification('✅ Rent entry saved!', 'success');
    } catch (err) {
        console.error('❌ addRentEntry error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

function renderRentTable() {
    try {
        const tbody = document.getElementById('rent-main-rows');
        if (!tbody) return;
        
        let html = '', totalDebit = 0, totalCredit = 0;
        
        dbRent.forEach(function(r, i) {
            totalDebit += r.debit;
            totalCredit += r.credit;
            html += `<tr>
                <td>${escapeHtml(r.name)}</td>
                <td>${r.date}</td>
                <td style="color:#e74c3c;">${r.debit}</td>
                <td style="color:#27ae60;">${r.credit}</td>
                <td><button class="btn-action btn-delete" onclick="deleteRentEntry(${i})">🗑️</button></td>
            </tr>`;
        });
        
        tbody.innerHTML = html || `<tr><td colspan="5" style="text-align:center;padding:20px;color:#7f8c8d;">📭 No entries</td></tr>`;
        
        const totalDebitEl = document.getElementById('rent-total-debit');
        const totalCreditEl = document.getElementById('rent-total-credit');
        if (totalDebitEl) totalDebitEl.textContent = totalDebit;
        if (totalCreditEl) totalCreditEl.textContent = totalCredit;
    } catch (err) {
        console.error('❌ renderRentTable error:', err);
    }
}

function deleteRentEntry(index) {
    try {
        if (!confirm('⚠️ Delete this entry?')) return;
        const record = dbRent[index];
        if (record && record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
            _supabase.from('KRT_RENT').delete().eq('id', record.id).catch(() => {
                addPendingSync({ type: 'delete', table: 'KRT_RENT', id: record.id });
            });
        }
        dbRent.splice(index, 1);
        saveLocalData();
        renderRentTable();
        showNotification('✅ Rent entry deleted!', 'success');
    } catch (err) {
        console.error('❌ deleteRentEntry error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

// ==========================================
// CUSTOMER LEDGERS
// ==========================================
function saveLedgerEntry() {
    try {
        const nameInput = document.getElementById('ledger-cust-name');
        const dateInput = document.getElementById('led-date');
        const debitInput = document.getElementById('led-debit');
        const creditInput = document.getElementById('led-credit');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const date = dateInput ? dateInput.value : '';
        const debit = Number(debitInput ? debitInput.value : 0) || 0;
        const credit = Number(creditInput ? creditInput.value : 0) || 0;
        
        if (!name) { showNotification('⚠️ Enter customer name!', 'warning'); return; }
        if (!date) { showNotification('⚠️ Select date!', 'warning'); return; }
        if (debit === 0 && credit === 0) { showNotification('⚠️ Enter debit or credit!', 'warning'); return; }
        
        if (!db.ledgers[name]) db.ledgers[name] = [];
        if (!db.opening_balances[name]) db.opening_balances[name] = 0;
        
        db.ledgers[name].push({ date, debit, credit, item: '', method: 'Cash' });
        saveLocalData();
        showLedger();
        
        if (nameInput) nameInput.value = '';
        if (dateInput) dateInput.value = '';
        if (debitInput) debitInput.value = '';
        if (creditInput) creditInput.value = '';
        showNotification('✅ Ledger entry saved!', 'success');
    } catch (err) {
        console.error('❌ saveLedgerEntry error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

function showLedger() {
    try {
        const nameInput = document.getElementById('ledger-cust-name');
        const tbody = document.getElementById('ledger-table-body');
        if (!tbody || !nameInput) return;
        
        const name = nameInput.value.trim();
        tbody.innerHTML = '';
        let totalDebit = 0, totalCredit = 0;
        
        if (name && db.ledgers[name]) {
            db.ledgers[name].forEach(function(entry, i) {
                totalDebit += entry.debit;
                totalCredit += entry.credit;
                tbody.innerHTML += `<tr>
                    <td>${i+1}</td>
                    <td>${entry.date}</td>
                    <td>${entry.debit}</td>
                    <td>${entry.credit}</td>
                </tr>`;
            });
        }
        
        const totalDebitEl = document.getElementById('total-debit');
        const totalCreditEl = document.getElementById('total-credit');
        const balanceEl = document.getElementById('final-balance');
        if (totalDebitEl) totalDebitEl.textContent = totalDebit;
        if (totalCreditEl) totalCreditEl.textContent = totalCredit;
        if (balanceEl) balanceEl.textContent = `Balance: ${totalDebit - totalCredit}`;
    } catch (err) {
        console.error('❌ showLedger error:', err);
    }
}

// ==========================================
// USER MANAGEMENT
// ==========================================
function loadUserTable() {
    try {
        const tbody = document.getElementById('user-table-body');
        if (!tbody) return;
        tbody.innerHTML = extraUsers.map(function(u, i) {
            return `<tr>
                <td>${escapeHtml(u.id)}</td>
                <td>${escapeHtml(u.name)}</td>
                <td><small>${escapeHtml(u.perms ? u.perms.join(', ') : '')}</small></td>
                <td><button class="btn-action btn-delete" onclick="deleteExtraUser(${i})">🗑️</button></td>
            </tr>`;
        }).join('') || `<tr><td colspan="4" style="text-align:center;padding:20px;color:#7f8c8d;">No users</td></tr>`;
    } catch (err) {
        console.error('❌ loadUserTable error:', err);
    }
}

function deleteExtraUser(index) {
    try {
        if (!confirm('⚠️ Delete user?')) return;
        extraUsers.splice(index, 1);
        saveLocalData();
        loadUserTable();
        showNotification('✅ User deleted!', 'success');
    } catch (err) {
        console.error('❌ deleteExtraUser error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

function createNewUser() {
    try {
        const nameInput = document.getElementById('new-username');
        const idInput = document.getElementById('new-userid');
        const passInput = document.getElementById('new-password');
        const permCheckboxes = document.querySelectorAll('.perm:checked');
        
        const name = nameInput ? nameInput.value.trim() : '';
        const id = idInput ? idInput.value.trim() : '';
        const pass = passInput ? passInput.value.trim() : '';
        const perms = [];
        permCheckboxes.forEach(cb => perms.push(cb.value));
        
        if (!name) { showNotification('⚠️ Enter name!', 'warning'); return; }
        if (!id) { showNotification('⚠️ Enter user ID!', 'warning'); return; }
        if (!pass) { showNotification('⚠️ Enter password!', 'warning'); return; }
        if (extraUsers.some(u => u.id === id)) { showNotification('⚠️ User ID exists!', 'warning'); return; }
        
        extraUsers.push({ id, pass, name, perms });
        saveLocalData();
        loadUserTable();
        if (nameInput) nameInput.value = '';
        if (idInput) idInput.value = '';
        if (passInput) passInput.value = '';
        permCheckboxes.forEach(cb => cb.checked = false);
        showNotification(`✅ User "${name}" created!`, 'success');
    } catch (err) {
        console.error('❌ createNewUser error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

// ==========================================
// LOGIN / LOGOUT
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
    } catch (err) {
        console.error('❌ Login error:', err);
        showNotification('❌ Login failed!', 'error');
    }
}

function showSystem(roleOrUser) {
    try {
        const loginScreen = document.getElementById('login-screen');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const toggleBtn = document.getElementById('toggle-btn');
        
        if (loginScreen) loginScreen.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';
        if (mainContent) mainContent.style.display = 'block';
        if (toggleBtn) toggleBtn.style.display = 'block';
        
        if (typeof roleOrUser === 'object') {
            applyDynamicPermissions(roleOrUser);
        } else {
            const items = document.querySelectorAll('#sidebar ul li');
            items.forEach(item => item.style.display = 'flex');
            if (roleOrUser === 'staff') {
                items.forEach(item => {
                    const t = item.innerText || '';
                    if (!t.includes('Dashboard') && !t.includes('Daily Report') && 
                        !t.includes('Stock Balance') && !t.includes('Logout')) {
                        item.style.display = 'none';
                    }
                });
                switchPage('page-Report', 'DAILY REPORT');
            } else if (roleOrUser === 'manager') {
                items.forEach(item => {
                    const t = item.innerText || '';
                    if (!t.includes('Dashboard') && !t.includes('Customer Ledgers') && 
                        !t.includes('Market Rent Book') && !t.includes('Stock Balance') && 
                        !t.includes('Logout')) {
                        item.style.display = 'none';
                    }
                });
                switchPage('page-customer-ledgers', 'CUSTOMER LEDGERS');
            }
        }
        renderAll();
        updateDashboardStats();
        loadUserTable();
        resetIdleTimer();
    } catch (err) {
        console.error('❌ showSystem error:', err);
        showNotification('❌ Failed to load system!', 'error');
    }
}

function applyDynamicPermissions(user) {
    try {
        const items = document.querySelectorAll('#sidebar ul li');
        items.forEach(item => {
            const onclick = item.getAttribute('onclick') || '';
            if (onclick.includes('page-dashboard') || onclick.includes('logout')) {
                item.style.display = 'flex';
                return;
            }
            let hasPerm = false;
            if (user.perms) {
                hasPerm = user.perms.some(p => onclick.includes(p));
            }
            item.style.display = hasPerm ? 'flex' : 'none';
        });
        renderAll();
    } catch (err) {
        console.error('❌ applyDynamicPermissions error:', err);
    }
}

function logout() {
    try {
        if (!confirm('🚪 Logout?')) return;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        location.reload();
    } catch (err) {
        console.error('❌ logout error:', err);
        location.reload();
    }
}

// ==========================================
// SIDEBAR / PAGE SWITCH
// ==========================================
function toggleSidebar() {
    try {
        const sb = document.getElementById('sidebar');
        const mc = document.getElementById('main-content');
        if (!sb || !mc) return;
        if (sb.style.left === '0px') {
            sb.style.left = '-260px';
            mc.style.marginLeft = '0';
        } else {
            sb.style.left = '0px';
            mc.style.marginLeft = '260px';
        }
    } catch (err) {
        console.error('❌ toggleSidebar error:', err);
    }
}

function switchPage(pageId, title) {
    try {
        document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
        const page = document.getElementById(pageId);
        if (page) page.style.display = 'block';
        const titleEl = document.getElementById('page-title');
        if (titleEl) {
            titleEl.innerHTML = `<i class="fas fa-chart-line" style="color:#f1c40f; margin-right:12px;"></i>KRT TRADERS ERP - ${title}`;
        }
        resetIdleTimer();
    } catch (err) {
        console.error('❌ switchPage error:', err);
    }
}

// ==========================================
// IDLE SYSTEM
// ==========================================
function setupIdleDetection() {
    try {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(e => document.addEventListener(e, resetIdleTimer));
        resetIdleTimer();
    } catch (err) {
        console.error('❌ setupIdleDetection error:', err);
    }
}

function resetIdleTimer() {
    try {
        if (idleTimer) clearTimeout(idleTimer);
        if (isIdle) return;
        idleTimer = setTimeout(showIdleScreen, IDLE_TIMEOUT);
    } catch (err) {
        console.error('❌ resetIdleTimer error:', err);
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
            overlay = document.createElement('div');
            overlay.id = 'idle-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:999999;flex-direction:column;color:white;';
            overlay.innerHTML = `
                <div style="text-align:center;">
                    <h1 style="font-size:60px;">🐘</h1>
                    <h2 style="color:#f1c40f;">KRT ERP</h2>
                    <div id="idle-timer" style="font-size:48px;font-weight:bold;margin:20px;">00:00</div>
                    <p style="color:#7f8c8d;">Session paused. Click to continue.</p>
                    <button onclick="dismissIdleScreen()" style="margin-top:20px;padding:10px 30px;background:#f1c40f;border:none;border-radius:5px;font-size:16px;cursor:pointer;">Continue</button>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
        idleSeconds = 0;
        if (idleInterval) clearInterval(idleInterval);
        idleInterval = setInterval(() => {
            idleSeconds++;
            const timer = document.getElementById('idle-timer');
            if (timer) {
                const m = String(Math.floor(idleSeconds/60)).padStart(2,'0');
                const s = String(idleSeconds%60).padStart(2,'0');
                timer.textContent = `${m}:${s}`;
            }
        }, 1000);
    } catch (err) {
        console.error('❌ showIdleScreen error:', err);
    }
}

function dismissIdleScreen() {
    try {
        isIdle = false;
        const overlay = document.getElementById('idle-overlay');
        if (overlay) overlay.style.display = 'none';
        if (idleInterval) clearInterval(idleInterval);
        resetIdleTimer();
    } catch (err) {
        console.error('❌ dismissIdleScreen error:', err);
    }
}

// ==========================================
// SEARCH / REPORT
// ==========================================
function generateMasterSearch() {
    try {
        const fromInput = document.getElementById('master-from');
        const toInput = document.getElementById('master-to');
        if (!fromInput || !toInput) {
            showNotification('⚠️ Form not found!', 'error');
            return;
        }
        
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) {
            showNotification('⚠️ Select dates!', 'warning');
            return;
        }
        
        const fIn = db.in.filter(x => x.date >= from && x.date <= to);
        const fOut = db.out.filter(x => x.date >= from && x.date <= to);
        
        const inTable = document.getElementById('master-in-table');
        const outTable = document.getElementById('master-out-table');
        
        if (inTable) {
            inTable.innerHTML = fIn.map(x => `<tr>
                <td>${x.date}</td>
                <td>${escapeHtml(x.item)}</td>
                <td>${escapeHtml(x.vendor)}</td>
                <td>${x.qty}</td>
                <td>${x.price}</td>
                <td>${x.total}</td>
            </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;">No records</td></tr>`;
        }
        
        if (outTable) {
            outTable.innerHTML = fOut.map(x => `<tr>
                <td>${x.date}</td>
                <td>${escapeHtml(x.item)}</td>
                <td>${escapeHtml(x.cust)}</td>
                <td>${x.qty}</td>
                <td>${x.price}</td>
                <td>${x.total}</td>
            </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;">No records</td></tr>`;
        }
        
        showNotification(`✅ Found ${fIn.length + fOut.length} records`, 'success');
    } catch (err) {
        console.error('❌ generateMasterSearch error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
}

function generateCustomReport() {
    try {
        const fromInput = document.getElementById('rep-from-date');
        const toInput = document.getElementById('rep-to-date');
        if (!fromInput || !toInput) {
            showNotification('⚠️ Form not found!', 'error');
            return;
        }
        
        const from = fromInput.value;
        const to = toInput.value;
        if (!from || !to) {
            showNotification('⚠️ Select dates!', 'warning');
            return;
        }
        
        const fIn = db.in.filter(x => x.date >= from && x.date <= to);
        const fOut = db.out.filter(x => x.date >= from && x.date <= to);
        const totalInValue = fIn.reduce((s, x) => s + x.total, 0);
        const totalOutValue = fOut.reduce((s, x) => s + x.total, 0);
        
        const inTable = document.querySelector('#rep-in-table');
        const outTable = document.querySelector('#rep-out-table');
        
        if (inTable) {
            inTable.innerHTML = fIn.map(x => `<tr>
                <td>${x.date}</td>
                <td>${escapeHtml(x.item)}</td>
                <td>${escapeHtml(x.vendor)}</td>
                <td>${x.qty}</td>
                <td>${x.price}</td>
                <td>${x.total.toLocaleString()}</td>
            </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;">No records</td></tr>`;
        }
        
        if (outTable) {
            outTable.innerHTML = fOut.map(x => `<tr>
                <td>${x.date}</td>
                <td>${escapeHtml(x.item)}</td>
                <td>${escapeHtml(x.cust)}</td>
                <td>${x.qty}</td>
                <td>${x.price}</td>
                <td>${x.total.toLocaleString()}</td>
            </tr>`).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;">No records</td></tr>`;
        }
        
        const summary = document.querySelector('.report-summary') || document.createElement('div');
        summary.className = 'report-summary';
        summary.style.cssText = 'display:flex;justify-content:space-around;background:#2c3e50;color:white;padding:15px;border-radius:8px;margin-top:20px;flex-wrap:wrap;';
        summary.innerHTML = `
            <span>📥 Total IN: PKR ${totalInValue.toLocaleString()}</span>
            <span>📤 Total OUT: PKR ${totalOutValue.toLocaleString()}</span>
            <span style="color:${totalOutValue - totalInValue >= 0 ? '#2ecc71' : '#e74c3c'};font-weight:bold;">
                💰 Profit: PKR ${(totalOutValue - totalInValue).toLocaleString()}
            </span>
        `;
        const printArea = document.getElementById('print-area');
        if (printArea) {
            const existing = printArea.querySelector('.report-summary');
            if (existing) existing.remove();
            printArea.appendChild(summary);
        }
        showNotification('✅ Report generated!', 'success');
    } catch (err) {
        console.error('❌ generateCustomReport error:', err);
        showNotification('❌ Error: ' + err.message, 'error');
    }
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
        
        setTimeout(() => {
            div.style.transform = 'translateY(0)';
            div.style.opacity = '1';
        }, 50);
        
        setTimeout(() => {
            div.style.transform = 'translateY(100px)';
            div.style.opacity = '0';
            setTimeout(() => { if (div.parentNode) div.remove(); }, 400);
        }, 4000);
    } catch (err) {
        console.error('❌ showNotification error:', err);
    }
}

// ==========================================
// PRINT
// ==========================================
function printSection() {
    try {
        window.print();
    } catch (err) {
        console.error('❌ print error:', err);
        showNotification('❌ Print error!', 'error');
    }
}

// ==========================================
// APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    try {
        loadLocalData();
        setupIdleDetection();
        renderAll();
        renderRentTable();
        loadUserTable();
        updateCustomerDropdown();
        updateItemLists();
        
        setTimeout(function() {
            testSupabaseConnection();
            if (navigator.onLine && isSupabaseConnected) {
                syncAllCloudData();
            }
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
    } catch (err) {
        console.error('❌ Startup error:', err);
        showNotification('⚠️ Error loading app: ' + err.message, 'error');
    }
});

// ==========================================
// KEYBOARD SHORTCUTS
// ==========================================
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        syncAllCloudData();
    }
    if (e.key === 'Escape') {
        const sb = document.getElementById('sidebar');
        if (sb && sb.style.left === '0px') toggleSidebar();
    }
    if (e.key === 'Enter') {
        const passInput = document.getElementById('pass');
        if (passInput && document.activeElement === passInput) login();
    }
});
