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
const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79';
let _supabase = null;
let isSupabaseConnected = false;

try {
    _supabase = supabase.createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');
    // Test connection
    testSupabaseConnection();
} catch (err) {
    console.error('❌ Supabase init failed:', err);
    showNotification('⚠️ Database connection failed. Running in offline mode.', 'warning');
}

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
        
        // Process pending syncs if any
        if (navigator.onLine) {
            await processPendingSync();
        }
    } catch (err) {
        console.error('❌ Connection test error:', err);
        isSupabaseConnected = false;
    }
}

// ==========================================
// GLOBAL DATABASE OBJECTS
// ==========================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];
let pendingSync = [];

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
        
        // Clear local data
        db.in = [];
        db.out = [];
        
        // Process cloud data
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
// PENDING SYNC QUEUE (Offline Support)
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
        
        // Try to process immediately if online
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
        
        // Validation
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
        
        // Check for duplicate
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
        
        // Try cloud insert
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            try {
                console.log('📤 Saving to cloud...');
                const { data, error } = await _supabase
                    .from('KRT')
                    .insert([entryData])
                    .select();
                
                if (error) {
                    console.error('❌ Cloud insert failed:', error);
                    // Save locally and add to pending
                    saveStockInLocal(date, vendor, item, barcode, qty, price);
                    addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
                    showNotification('⚠️ Cloud save failed. Saved locally.', 'warning');
                    clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput);
                    return;
                }
                
                // ✅ Cloud success
                if (data && data.length > 0) {
                    console.log('✅ Cloud save success:', data[0]);
                    // Add to local DB with cloud ID
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
                    await fetchCloudData(); // Refresh
                    return;
                }
            } catch (cloudErr) {
                console.error('❌ Cloud error:', cloudErr);
                // Fallback to local
                saveStockInLocal(date, vendor, item, barcode, qty, price);
                addPendingSync({ type: 'insert', table: 'KRT', data: entryData });
                showNotification('⚠️ Cloud error. Saved locally.', 'warning');
                clearInForm(dateInput, itemInput, qtyInput, priceInput, barcodeInput);
                return;
            }
        }
        
        // Offline or disconnected - save locally
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
        
        // Validation
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
        
        const entryData = {
            Date: date,
            item_name: item,
            stock_in: 0,
            stock_out: qty,
            price: price,
            customer_name: custName
        };
        
        // Try cloud insert
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
        
        // Offline - save locally
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
        
        // Delete from cloud if it's a cloud record
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
            // Remove from pending sync if exists
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
        
        // Add to local
        const tempId = 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        dbRent.push({ id: tempId, ...entryData });
        saveLocalData();
        renderRentTable();
        
        // Try cloud sync
        if (_supabase && isSupabaseConnected && navigator.onLine) {
            _supabase.from('KRT_RENT').insert([entryData])
                .then(function(result) {
                    if (result.error) {
                        console.error('❌ Rent cloud insert failed:', result.error);
                        addPendingSync({ type: 'insert', table: 'KRT_RENT', data: entryData });
                    } else {
                        console.log('✅ Rent entry synced to cloud');
                        // Update local with cloud ID
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
        
        // Clear form
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
        
        // Remove existing toasts with same message
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
// APP STARTUP
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    try {
        loadLocalData();
        
        // Render everything
        renderAll();
        renderRentTable();
        loadUserTable();
        updateCustomerDropdown();
        updateItemLists();
        
        // Check cloud connection and sync
        setTimeout(function() {
            testSupabaseConnection();
            if (navigator.onLine && isSupabaseConnected) {
                syncAllCloudData();
            }
        }, 2000);
        
        // Check login status
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
});

// ==========================================
// OTHER FUNCTIONS (Keep from original)
// ==========================================
// Keep all other functions from your original code:
// - login(), showSystem(), logout()
// - toggleSidebar(), switchPage()
// - editEntry(), generateMasterSearch()
// - printSection(), showLedger()
// - updateOpeningBal(), saveLedgerEntry()
// - etc.

// [Add your existing functions here...]
