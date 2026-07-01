// ==========================================
// KRT TRADERS ERP - COMPLETE SCRIPT v5.1
// Cloud-First with Local Backup
// Developed by Bilal Suleman
// ==========================================

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
window.onerror = function(msg, url, line, col, error) {
    console.error('❌ Global Error:', msg, 'at', url, 'line', line);
    console.error('Stack:', error ? error.stack : 'No stack');
    showNotification('⚠️ An error occurred. Check console for details.', 'error');
    return false;
};

window.addEventListener('unhandledrejection', function(e) {
    console.error('❌ Unhandled Promise Rejection:', e.reason);
    showNotification('⚠️ A background operation failed.', 'error');
    e.preventDefault();
});

// ==========================================
// SUPABASE INITIALIZATION
// ==========================================
const supabaseUrl = 'https://jsxcmlpjdxgloofdrugz.supabase.co/rest/v1/';
const supabaseKey = 'sb_publishable_Gyt7XmMb2fQxDouyHQMTYg_pB8dhGtb';
let _supabase = null;
let isSupabaseConnected = false;

try {
    _supabase = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');
    testSupabaseConnection();
} catch (err) {
    console.error('❌ Supabase init failed:', err);
    showNotification('⚠️ Database connection failed. Running in offline mode.', 'warning');
}

// ==========================================
// IDLE SYSTEM VARIABLES
// ==========================================
const IDLE_TIMEOUT = 30000;
let idleTimer = null;
let isIdle = false;
let idleSeconds = 0;
let idleInterval = null;

// ==========================================
// GLOBAL DATABASE OBJECTS
// ==========================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];
let pendingSync = [];

// ==========================================
// TEST SUPABASE CONNECTION
// ==========================================
async function testSupabaseConnection() {
    try {
        if (!_supabase) {
            console.warn('⚠️ Supabase not initialized');
            return;
        }
        
        const { data, error } = await _supabase
            .from('KRT')
            .select('count', { count: 'exact', head: true });
        
        if (error) {
            console.error('❌ Supabase connection test failed:', error);
            isSupabaseConnected = false;
            showNotification('⚠️ Database not accessible. Using offline mode.', 'warning');
            return;
        }
        
        isSupabaseConnected = true;
        console.log('✅ Supabase connected successfully!');
        console.log(`📊 Total records: ${data?.count || 0}`);
        
        if (navigator.onLine) {
            await processPendingSync();
        }
    } catch (err) {
        console.error('❌ Connection test error:', err);
        isSupabaseConnected = false;
    }
}

// ==========================================
// LOAD DATA FROM LOCALSTORAGE
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
        console.log(`📊 IN: ${db.in.length}, OUT: ${db.out.length}, Rent: ${dbRent.length}`);
    } catch (err) {
        console.error('❌ Failed to load local data:', err);
        db = { in: [], out: [], ledgers: {}, opening_balances: {} };
        dbRent = [];
        extraUsers = [];
        pendingSync = [];
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
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
        console.log('💾 Local data saved');
    } catch (err) {
        console.error('❌ Failed to save local data:', err);
        showNotification('⚠️ Failed to save data locally.', 'error');
    }
}

function saveAndRefresh() {
    saveLocalData();
    renderAll();
    updateDashboardStats();
}

// ==========================================
// CLOUD SYNC FUNCTIONS
// ==========================================
async function syncAllCloudData() {
    try {
        if (!navigator.onLine) {
            showNotification("⚠️ No internet! Using offline mode.", "warning");
            await processPendingSync();
            return;
        }
        
        if (!_supabase || !isSupabaseConnected) {
            showNotification('⚠️ Database not available. Running offline.', 'warning');
            return;
        }
        
        showNotification("☁️ Syncing with cloud...", "info");
        
        await fetchCloudData();
        await fetchCloudRentData();
        await processPendingSync();
        
        updateItemLists();
        updateCustomerDropdown();
        loadUserTable();
        
        showNotification("✅ Cloud sync complete!", "success");
        console.log('✅ Full sync completed');
    } catch (err) {
        console.error('❌ Sync failed:', err);
        showNotification("❌ Sync failed: " + err.message, "error");
    }
}

async function fetchCloudData() {
    try {
        if (!_supabase || !isSupabaseConnected) {
            console.warn('⚠️ Supabase not connected, skipping cloud fetch');
            return;
        }
        
        console.log('📥 Fetching cloud data...');
        
        const { data, error } = await _supabase
            .from('KRT')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error("❌ Supabase Error:", error.message);
            isSupabaseConnected = false;
            showNotification('⚠️ Failed to fetch cloud data', 'error');
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('ℹ️ No cloud data found');
            return;
        }
        
        db.in = [];
        db.out = [];
        
        data.forEach(function(row) {
            try {
                const inQty = Number(row.stock_in || 0);
                const outQty = Number(row.stock_out || 0);
                const price = Number(row.price || 0);
                const date = (row.Date || row.date || row.created_at || '').split('T')[0] || new Date().toISOString().split('T')[0];
                
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
                console.warn('⚠️ Error processing row:', rowErr);
            }
        });
        
        saveLocalData();
        renderAll();
        updateDashboardStats();
        console.log(`✅ Cloud sync complete! IN: ${db.in.length}, OUT: ${db.out.length}`);
    } catch (err) {
        console.error("❌ Fetch Error:", err);
        isSupabaseConnected = false;
        showNotification('⚠️ Failed to sync cloud data', 'error');
    }
}

async function fetchCloudRentData() {
    try {
        if (!_supabase || !isSupabaseConnected) {
            console.warn('⚠️ Supabase not connected, skipping rent fetch');
            return;
        }
        
        const { data, error } = await _supabase
            .from('KRT_RENT')
            .select('*')
            .order('id', { ascending: true });
        
        if (error) {
            console.error("❌ Rent Fetch Error:", error.message);
            isSupabaseConnected = false;
            return;
        }
        
        if (!data || data.length === 0) {
            console.log('ℹ️ No rent data found');
            return;
        }
        
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
        console.log(`✅ Rent sync complete! ${dbRent.length} records`);
    } catch (err) {
        console.error("❌ Rent Sync Error:", err);
        isSupabaseConnected = false;
    }
}

// ==========================================
// PENDING SYNC QUEUE
// ==========================================
async function processPendingSync() {
    try {
        if (!_supabase || !isSupabaseConnected || !navigator.onLine) {
            console.log('⏳ Cannot process pending sync - offline or disconnected');
            return;
        }
        
        if (pendingSync.length === 0) {
            console.log('✅ No pending syncs');
            return;
        }
        
        console.log(`📤 Processing ${pendingSync.length} pending operations...`);
        const failed = [];
        
        for (const op of pendingSync) {
            try {
                if (op.type === 'insert') {
                    const { error } = await _supabase.from(op.table).insert(op.data);
                    if (error) {
                        console.error('❌ Pending insert failed:', error);
                        failed.push(op);
                    } else {
                        console.log('✅ Pending insert synced');
                    }
                } else if (op.type === 'delete') {
                    const { error } = await _supabase.from(op.table).delete().eq('id', op.id);
                    if (error) {
                        console.error('❌ Pending delete failed:', error);
                        failed.push(op);
                    } else {
                        console.log('✅ Pending delete synced');
                    }
                } else if (op.type === 'update') {
                    const { error } = await _supabase.from(op.table).update(op.data).eq('id', op.id);
                    if (error) {
                        console.error('❌ Pending update failed:', error);
                        failed.push(op);
                    } else {
                        console.log('✅ Pending update synced');
                    }
                }
            } catch (opErr) {
                console.error('❌ Pending operation failed:', opErr);
                failed.push(op);
            }
        }
        
        pendingSync = failed;
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
        
        if (failed.length > 0) {
            console.warn(`⚠️ ${failed.length} operations still pending`);
        } else {
            console.log('✅ All pending operations synced');
        }
    } catch (err) {
        console.error('❌ Failed to process pending sync:', err);
    }
}

function addPendingSync(op) {
    try {
        pendingSync.push(op);
        localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
        console.log(`📝 Added to pending sync: ${op.type} on ${op.table}`);
        
        if (navigator.onLine && isSupabaseConnected) {
            setTimeout(processPendingSync, 1000);
        }
    } catch (err) {
        console.error('❌ Failed to add pending sync:', err);
    }
}

// ==========================================
// STOCK IN - CLOUD FIRST
// ==========================================
async function addIn() {
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
        
        if (!date) {
            showNotification("⚠️ Bilal Bhai, date select karein!", "warning");
            return;
        }
        if (!item) {
            showNotification("⚠️ Bilal Bhai, item name lazmi hai!", "warning");
            return;
        }
        if (qty <= 0 || isNaN(qty)) {
            showNotification("⚠️ Bilal Bhai, sahi quantity likhain!", "warning");
            return;
        }
        if (price <= 0 || isNaN(price)) {
            showNotification("⚠️ Bilal Bhai, sahi price likhain!", "warning");
            return;
        }
        
        const duplicate = db.in.some(function(x) {
            return x.item === item && x.date === date && x.vendor === vendor && x.qty === qty && x.price === price;
        });
        if (duplicate) {
            showNotification("⚠️ Yeh entry pehle se mojud hai!", "warning");
            return;
        }
        
        const entryData = {
            Date: date,
            item_name: item,
            stock_in: qty,
            stock_out: 0,
            price: price,
            vendor_name: vendor || 'factory'
        };
        
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            try {
                console.log('📤 Saving to cloud...');
                const { data, error } = await _supabase
                    .from('KRT')
                    .insert([entryData])
                    .select();
                
                if (error) {
                    console.error('❌ Cloud insert failed:', error);
                    saveStockInLocal(date, vendor, item, barcode, qty, price);
                    addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
                    showNotification('⚠️ Cloud save failed. Saved locally.', 'warning');
                    clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput);
                    return;
                }
                
                if (data && data.length > 0) {
                    console.log('✅ Cloud save success:', data[0]);
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
                    clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput);
                    showNotification("✅ Stock IN saved to cloud!", "success");
                    await fetchCloudData();
                    return;
                }
            } catch (cloudErr) {
                console.error('❌ Cloud error:', cloudErr);
                saveStockInLocal(date, vendor, item, barcode, qty, price);
                addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
                showNotification('⚠️ Cloud error. Saved locally.', 'warning');
                clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput);
                return;
            }
        }
        
        saveStockInLocal(date, vendor, item, barcode, qty, price);
        addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
        showNotification("✅ Stock IN saved locally! Will sync when online.", "warning");
        clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput);
        
    } catch (err) {
        console.error('❌ addIn error:', err);
        showNotification('❌ Error saving stock IN: ' + err.message, 'error');
    }
}

function saveStockInLocal(date, vendor, item, barcode, qty, price) {
    const tempId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    db.in.push({
        id: tempId,
        date: date,
        vendor: vendor || 'factory',
        item: item,
        barcode: barcode,
        qty: qty,
        price: price,
        total: qty * price
    });
    saveAndRefresh();
}

function clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput) {
    if (dateInput) dateInput.value = '';
    if (itemInput) itemInput.value = '';
    if (qtyInput) qtyInput.value = '';
    if (priceInput) priceInput.value = '';
    if (barcodeInput) barcodeInput.value = '';
}

// ==========================================
// STOCK OUT - CLOUD FIRST
// ==========================================
async function addOut() {
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
        
        const date = dateInput.value;
        const custName = customerInput.value.trim() || "General Sale";
        const item = itemInput.value.trim();
        const barcode = barcodeInput ? barcodeInput.value : "";
        const qty = Number(qtyInput.value);
        const price = Number(priceInput.value);
        
        if (!date) {
            showNotification("⚠️ Bilal Bhai, date select karein!", "warning");
            return;
        }
        if (!item) {
            showNotification("⚠️ Bilal Bhai, item name lazmi hai!", "warning");
            return;
        }
        if (qty <= 0 || isNaN(qty)) {
            showNotification("⚠️ Bilal Bhai, sahi quantity likhain!", "warning");
            return;
        }
        if (price <= 0 || isNaN(price)) {
            showNotification("⚠️ Bilal Bhai, sahi price likhain!", "warning");
            return;
        }
        
        const totalIn = db.in.filter(function(x) { return x.item === item; }).reduce(function(s, x) { return s + x.qty; }, 0);
        const totalOut = db.out.filter(function(x) { return x.item === item; }).reduce(function(s, x) { return s + x.qty; }, 0);
        const available = totalIn - totalOut;
        
        if (qty > available) {
            showNotification(`⚠️ Stock kam hai! Sirf ${available} mojud hain.`, "warning");
            return;
        }
        
        const duplicate = db.out.some(function(x) {
            return x.item === item && x.date === date && x.cust === custName && x.qty === qty && x.price === price;
        });
        if (duplicate) {
            showNotification("⚠️ Yeh sale pehle se recorded hai!", "warning");
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
                console.log('📤 Saving sale to cloud...');
                const { data, error } = await _supabase
                    .from('KRT')
                    .insert([entryData])
                    .select();
                
                if (error) {
                    console.error('❌ Cloud insert failed:', error);
                    saveStockOutLocal(date, custName, item, barcode, qty, price);
                    addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
                    showNotification('⚠️ Cloud save failed. Saved locally.', 'warning');
                    clearOutForm(qtyInput, customerInput, barcodeInput);
                    return;
                }
                
                if (data && data.length > 0) {
                    console.log('✅ Cloud save success:', data[0]);
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
                    clearOutForm(qtyInput, customerInput, barcodeInput);
                    showNotification("✅ Stock OUT saved to cloud!", "success");
                    await fetchCloudData();
                    return;
                }
            } catch (cloudErr) {
                console.error('❌ Cloud error:', cloudErr);
                saveStockOutLocal(date, custName, item, barcode, qty, price);
                addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
                showNotification('⚠️ Cloud error. Saved locally.', 'warning');
                clearOutForm(qtyInput, customerInput, barcodeInput);
                return;
            }
        }
        
        saveStockOutLocal(date, custName, item, barcode, qty, price);
        addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
        showNotification("✅ Stock OUT saved locally! Will sync when online.", "warning");
        clearOutForm(qtyInput, customerInput, barcodeInput);
        
    } catch (err) {
        console.error('❌ addOut error:', err);
        showNotification('❌ Error saving stock OUT: ' + err.message, 'error');
    }
}

function saveStockOutLocal(date, custName, item, barcode, qty, price) {
    const tempId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
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
}

function clearOutForm(qtyInput, customerInput, barcodeInput) {
    if (qtyInput) qtyInput.value = "";
    if (customerInput) customerInput.value = "";
    if (barcodeInput) barcodeInput.value = "";
    const statusEl = document.getElementById('stock-status');
    if (statusEl) statusEl.innerHTML = "";
}

// ==========================================
// DELETE ENTRY WITH CLOUD SYNC
// ==========================================
async function deleteEntry(type, index) {
    try {
        if (!confirm("⚠️ Bilal Bhai, kya aap waqai ye record delete karna chahte hain?")) return;
        
        const record = db[type] && db[type][index];
        if (!record) {
            showNotification("⚠️ Record not found!", "error");
            return;
        }
        
        if (record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
            try {
                const { error } = await _supabase.from('KRT').delete().eq('id', record.id);
                if (error) {
                    console.error('❌ Cloud delete failed:', error);
                    addPendingSync({ type: 'delete', table: 'KRT', id: record.id });
                } else {
                    console.log('✅ Cloud delete success');
                }
            } catch (err) {
                console.error('❌ Cloud delete error:', err);
                addPendingSync({ type: 'delete', table: 'KRT', id: record.id });
            }
        } else if (record.id && record.id.toString().startsWith('local_')) {
            pendingSync = pendingSync.filter(function(op) {
                return !(op.type === 'insert' && op.data && op.data.id === record.id);
            });
            localStorage.setItem('krt_pending_sync', JSON.stringify(pendingSync));
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
// EDIT ENTRY
// ==========================================
async function editEntry(type, index) {
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
        
        if (data.id && !data.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
            try {
                const { error } = await _supabase.from('KRT').update({
                    stock_in: type === 'in' ? qtyNum : 0,
                    stock_out: type === 'out' ? qtyNum : 0,
                    price: priceNum
                }).eq('id', data.id);
                if (error) {
                    console.error('❌ Update failed:', error);
                    addPendingSync({ type: 'update', table: 'KRT', id: data.id, data: { stock_in: type === 'in' ? qtyNum : 0, stock_out: type === 'out' ? qtyNum : 0, price: priceNum } });
                }
            } catch (err) {
                console.error('❌ Update error:', err);
                addPendingSync({ type: 'update', table: 'KRT', id: data.id, data: { stock_in: type === 'in' ? qtyNum : 0, stock_out: type === 'out' ? qtyNum : 0, price: priceNum } });
            }
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
// RENDER ALL
// ==========================================
function renderAll() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
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

// ==========================================
// RENT FUNCTIONS
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
        
        if (!name) {
            showNotification("⚠️ Customer Name lazmi hai!", "warning");
            return;
        }
        if (!date) {
            showNotification("⚠️ Date lazmi hai!", "warning");
            return;
        }
        if (debit === 0 && credit === 0) {
            showNotification("⚠️ Debit ya Credit value lazmi hai!", "warning");
            return;
        }
        
        const entryData = {
            name: name,
            shop: shop,
            date: date,
            month: month,
            debit: debit,
            credit: credit,
            method: method
        };
        
        const tempId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        dbRent.push({ id: tempId, ...entryData });
        saveLocalData();
        renderRentTable();
        
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            _supabase.from('KRT_RENT').insert([entryData])
                .then(function(result) {
                    if (result.error) {
                        console.error('❌ Rent cloud insert failed:', result.error);
                        addPendingSync({ type: 'insert', table: 'KRT_RENT', data: entryData });
                    } else {
                        console.log('✅ Rent entry synced to cloud');
                        if (result.data && result.data.length > 0) {
                            const idx = dbRent.findIndex(function(x) { return x.id === tempId; });
                            if (idx !== -1) {
                                dbRent[idx].id = result.data[0].id;
                                saveLocalData();
                            }
                        }
                    }
                })
                .catch(function(err) {
                    console.error('❌ Rent cloud insert error:', err);
                    addPendingSync({ type: 'insert', table: 'KRT_RENT', data: entryData });
                });
        } else {
            addPendingSync({ type: 'insert', table: 'KRT_RENT', data: entryData });
        }
        
        if (nameInput) nameInput.value = '';
        if (shopInput) shopInput.value = '';
        if (debitInput) debitInput.value = '0';
        if (creditInput) creditInput.value = '0';
        
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
        const record = dbRent[index];
        if (record && record.id && !record.id.toString().startsWith('local_') && _supabase && isSupabaseConnected && navigator.onLine) {
            _supabase.from('KRT_RENT').delete().eq('id', record.id)
                .then(function(result) {
                    if (result.error) {
                        console.error('❌ Rent delete failed:', result.error);
                        addPendingSync({ type: 'delete', table: 'KRT_RENT', id: record.id });
                    }
                })
                .catch(function(err) {
                    console.error('❌ Rent delete error:', err);
                    addPendingSync({ type: 'delete', table: 'KRT_RENT', id: record.id });
                });
        }
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
// CUSTOMER LEDGERS
// ==========================================
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
        
        if (!name) {
            showNotification("⚠️ Customer Name lazmi hai!", "warning");
            return;
        }
        if (!date) {
            showNotification("⚠️ Date lazmi hai!", "warning");
            return;
        }
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
        
        if (!name) {
            showNotification("⚠️ Bilal Bhai, naam likhain!", "warning");
            return;
        }
        if (!id) {
            showNotification("⚠️ Bilal Bhai, user ID likhain!", "warning");
            return;
        }
        if (!pass) {
            showNotification("⚠️ Bilal Bhai, password likhain!", "warning");
            return;
        }
        
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

// ==========================================
// LOGIN / LOGOUT / SHOW SYSTEM
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
// SIDEBAR / PAGE SWITCHING
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
// IDLE SCREEN FUNCTIONS
// ==========================================
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
        console.log('✅ Idle detection setup complete');
    } catch (err) {
        console.error('❌ Failed to setup idle detection:', err);
    }
}

// ==========================================
// SEARCH / REPORT FUNCTIONS
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
// NOTIFICATIONS
// ==========================================
function showNotification(message, type = "info") {
    try {
        const colors = {
            success: "#27ae60",
            error: "#e74c3c",
            warning: "#f39c12",
            info: "#3498db"
        };
        
        const existing = document.querySelectorAll('.toast-notification');
        existing.forEach(function(el) {
            if (el.textContent === message) {
                el.remove();
            }
        });
        
        const div = document.createElement('div');
        div.className = `toast-notification ${type}`;
        div.textContent = message;
        div.style.borderLeft = '4px solid ' + (colors[type] || '#3498db');
        document.body.appendChild(div);
        
        setTimeout(function() {
            div.classList.add('show');
        }, 50);
        
        setTimeout(function() {
            div.classList.remove('show');
            setTimeout(function() {
                if (div.parentNode) div.remove();
            }, 500);
        }, 4000);
    } catch (err) {
        console.error('❌ Failed to show notification:', err);
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
// APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    try {
        loadLocalData();
        
        renderAll();
        renderRentTable();
        loadUserTable();
        updateCustomerDropdown();
        updateItemLists();
        
        setupIdleDetection();
        
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
        
        console.log("🚀 KRT TRADERS ERP v5.1 Loaded!");
        console.log("📦 Developed by Bilal Suleman");
        console.log(`📊 Status: ${isSupabaseConnected ? '🟢 Connected to Supabase' : '🟡 Offline mode'}`);
        
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
        if (sb && sb.style.left === "0px") {
            toggleSidebar();
        }
    }
    if (e.key === 'Enter') {
        const passInput = document.getElementById('pass');
        if (passInput && document.activeElement === passInput) {
            login();
        }
    }
});
