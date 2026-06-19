// ========================================
// KRT TRADERS ERP - COMPLETE JAVASCRIPT
// ========================================

// ========================================
// 1. SUPABASE INITIALIZATION
// ========================================
const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ========================================
// 2. GLOBAL DATABASE
// ========================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];
let billCounter = 1;

// ========================================
// 3. LOAD DATA
// ========================================
function loadAllData() {
    console.log('📂 Loading data...');
    
    try {
        const stored = localStorage.getItem('krt_erp_data');
        if (stored) {
            db = JSON.parse(stored);
            console.log('✅ Data loaded:', db.in.length, 'IN,', db.out.length, 'OUT');
        } else {
            console.log('⚠️ No data, creating sample...');
            createSampleData();
        }
    } catch (e) {
        console.error('❌ Load error:', e);
        createSampleData();
    }

    if (!db.in) db.in = [];
    if (!db.out) db.out = [];
    if (!db.ledgers) db.ledgers = {};
    if (!db.opening_balances) db.opening_balances = {};

    try {
        const rentStored = localStorage.getItem('krt_rent_data');
        if (rentStored) dbRent = JSON.parse(rentStored);
    } catch (e) { dbRent = []; }

    try {
        const userStored = localStorage.getItem('krt_extra_users');
        if (userStored) extraUsers = JSON.parse(userStored);
    } catch (e) { extraUsers = []; }

    try {
        const counter = localStorage.getItem('krt_bill_counter');
        if (counter) billCounter = parseInt(counter);
    } catch (e) { billCounter = 1; }
}

// ========================================
// 4. SAMPLE DATA
// ========================================
function createSampleData() {
    console.log('📝 Creating sample data...');
    const today = new Date().toISOString().split('T')[0];
    
    db = {
        in: [
            { id: 1, date: today, vendor: 'Al-Noor Traders', item: '32 gram-pp', barcode: 'N/A', qty: 53, price: 1200, total: 63600 },
            { id: 2, date: today, vendor: 'Al-Hassan Builders', item: '33 gram', barcode: 'N/A', qty: 659, price: 8500, total: 5601500 },
            { id: 3, date: today, vendor: 'Lahore Traders', item: '12 gram', barcode: 'N/A', qty: 102, price: 2500, total: 255000 },
            { id: 4, date: today, vendor: 'Karachi Steel', item: '15 gram', barcode: 'N/A', qty: 29, price: 7500, total: 217500 },
            { id: 5, date: '2026-06-18', vendor: 'Islamabad Traders', item: '32 gram-pp', barcode: 'N/A', qty: 200, price: 1100, total: 220000 }
        ],
        out: [
            { id: 1, date: today, cust: 'Bilal Suleman', phone: '0300-1234567', item: '32 gram-pp', barcode: 'N/A', qty: 34, price: 1500, total: 51000 },
            { id: 2, date: today, cust: 'Ahmed Traders', phone: '0300-7654321', item: '33 gram', barcode: 'N/A', qty: 625, price: 9500, total: 5937500 },
            { id: 3, date: today, cust: 'Sattar Bhai', phone: '0300-9876543', item: '12 gram', barcode: 'N/A', qty: 67, price: 3200, total: 214400 },
            { id: 4, date: today, cust: 'Zain Builders', phone: '0300-5555555', item: '15 gram', barcode: 'N/A', qty: 25, price: 8500, total: 212500 },
            { id: 5, date: '2026-06-18', cust: 'Omar Traders', phone: '0300-4444444', item: '32 gram-pp', barcode: 'N/A', qty: 50, price: 1450, total: 72500 }
        ],
        ledgers: {},
        opening_balances: {}
    };

    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    console.log('✅ Sample data created!');
}

// ========================================
// 5. SAVE AND REFRESH
// ========================================
function saveAndRefresh() {
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    renderAll();
    renderBalanceTable();
    renderRentTable();
    updateDashboard();
    updateItemLists();
    updateCustomerDropdown();
}

// ========================================
// 6. RENDER BALANCE TABLE
// ========================================
function renderBalanceTable() {
    console.log('📊 Rendering balance...');
    const tbody = document.getElementById('table-balance-body');
    if (!tbody) return;

    const allItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    
    if (allItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#7f8c8d;">📭 Koi item nahi mila</td></tr>`;
        return;
    }

    let html = '';
    allItems.forEach(name => {
        if (!name) return;

        const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + (x.qty || 0), 0);
        const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + (x.qty || 0), 0);
        const remaining = tin - tout;

        const inItem = db.in.find(x => x.item === name);
        const outItem = db.out.find(x => x.item === name);
        const pPrice = inItem?.price || 0;
        const sPrice = outItem?.price || 0;
        const profit = (sPrice - pPrice) * tout;

        let status = '';
        if (remaining > 10) status = '<span class="status-high">✅ High</span>';
        else if (remaining > 0) status = '<span class="status-medium">⚠️ Medium</span>';
        else if (remaining <= 0 && tin > 0) status = '<span class="status-low">❌ Low</span>';
        else status = '<span class="status-new">🆕 New</span>';

        const barcode = inItem?.barcode || outItem?.barcode || 'N/A';

        html += `
            <tr>
                <td><code>${barcode}</code></td>
                <td><strong>${name}</strong></td>
                <td style="color:#27ae60; font-weight:bold;">${tin}</td>
                <td style="color:#e74c3c; font-weight:bold;">${tout}</td>
                <td style="font-weight:bold; font-size:16px; color:${remaining > 0 ? '#27ae60' : '#e74c3c'};">${remaining}</td>
                <td>${status}</td>
                <td style="color:${profit > 0 ? '#27ae60' : '#e74c3c'}; font-weight:bold;">PKR ${profit.toLocaleString()}</td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
    console.log('✅ Balance rendered:', allItems.length, 'items');
}

// ========================================
// 7. RENDER ALL
// ========================================
function renderAll() {
    console.log('🔄 Rendering all...');
    const today = new Date().toISOString().split('T')[0];

    // Today's IN
    const inBody = document.getElementById('today-list-in');
    if (inBody) {
        let html = '';
        let counter = 1;
        const todayIn = db.in.filter(x => x.date === today);
        if (todayIn.length === 0) {
            html = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">📭 Aaj ki koi entry nahi hai</td></tr>`;
        } else {
            todayIn.forEach((x) => {
                const idx = db.in.indexOf(x);
                html += `
                    <tr>
                        <td>${counter++}</td>
                        <td><strong>${x.item}</strong></td>
                        <td>${x.vendor || ''}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                        <td><button onclick="deleteEntry('in', ${idx})" class="btn btn-red btn-sm">Del</button></td>
                    </tr>
                `;
            });
        }
        inBody.innerHTML = html;
    }

    // Today's OUT
    const outBody = document.getElementById('today-list-out');
    if (outBody) {
        let html = '';
        let counter = 1;
        const todayOut = db.out.filter(x => x.date === today);
        if (todayOut.length === 0) {
            html = `<tr><td colspan="9" style="text-align:center; padding:20px; color:#7f8c8d;">📭 Aaj ki koi sale nahi hai</td></tr>`;
        } else {
            todayOut.forEach((x) => {
                const idx = db.out.indexOf(x);
                html += `
                    <tr>
                        <td>${counter++}</td>
                        <td>${x.date}</td>
                        <td>${x.cust || ''}</td>
                        <td>${x.phone || ''}</td>
                        <td>${x.item}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                        <td><button onclick="deleteEntry('out', ${idx})" class="btn btn-red btn-sm">Del</button></td>
                    </tr>
                `;
            });
        }
        outBody.innerHTML = html;
    }

    renderBalanceTable();
    updateDashboard();
    updateItemLists();
    updateCustomerDropdown();
}

// ========================================
// 8. UPDATE DASHBOARD
// ========================================
function updateDashboard() {
    const totalItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])].length;
    const totalIn = db.in.reduce((s, x) => s + (x.qty || 0), 0);
    const totalOut = db.out.reduce((s, x) => s + (x.qty || 0), 0);

    let totalProfit = 0;
    const items = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    items.forEach(name => {
        const pPrice = db.in.find(x => x.item === name)?.price || 0;
        const outData = db.out.filter(x => x.item === name);
        outData.forEach(x => {
            totalProfit += ((x.price || 0) - pPrice) * (x.qty || 0);
        });
    });

    document.getElementById('total-items').textContent = totalItems;
    document.getElementById('total-in').textContent = totalIn;
    document.getElementById('total-out').textContent = totalOut;
    document.getElementById('total-profit').textContent = `PKR ${totalProfit.toLocaleString()}`;

    // Recent entries
    const inBody = document.getElementById('dashboard-in');
    if (inBody) {
        const recent = db.in.slice(-5).reverse();
        inBody.innerHTML = recent.length === 0 ? 
            `<tr><td colspan="4" style="text-align:center; color:#7f8c8d;">No entries</td></tr>` :
            recent.map(x => `<tr><td>${x.item}</td><td>${x.qty}</td><td>${x.vendor || ''}</td><td>${x.date}</td></tr>`).join('');
    }

    const outBody = document.getElementById('dashboard-out');
    if (outBody) {
        const recent = db.out.slice(-5).reverse();
        outBody.innerHTML = recent.length === 0 ?
            `<tr><td colspan="4" style="text-align:center; color:#7f8c8d;">No entries</td></tr>` :
            recent.map(x => `<tr><td>${x.item}</td><td>${x.qty}</td><td>${x.cust || ''}</td><td>${x.date}</td></tr>`).join('');
    }
}

// ========================================
// 9. UPDATE LISTS
// ========================================
function updateItemLists() {
    const list = document.getElementById('items-list');
    if (!list) return;
    const allItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    list.innerHTML = allItems.map(name => `<option value="${name}">`).join('');
}

function updateCustomerDropdown() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    if (!db.ledgers) db.ledgers = {};
    const names = Object.keys(db.ledgers);
    list.innerHTML = names.map(name => `<option value="${name}">`).join('');
}

// ========================================
// 10. LIVE STOCK
// ========================================
function showLiveStock(itemName) {
    const statusDiv = document.getElementById('stock-status');
    if (!itemName || itemName.trim() === '') {
        statusDiv.innerHTML = '';
        return;
    }
    const tin = db.in.filter(x => x.item === itemName).reduce((s, x) => s + (x.qty || 0), 0);
    const tout = db.out.filter(x => x.item === itemName).reduce((s, x) => s + (x.qty || 0), 0);
    const balance = tin - tout;
    if (balance > 10) statusDiv.innerHTML = `<span style="color:#27ae60; font-weight:700;">✅ Available: ${balance}</span>`;
    else if (balance > 0) statusDiv.innerHTML = `<span style="color:#f39c12; font-weight:700;">⚠️ Available: ${balance}</span>`;
    else if (balance <= 0 && tin > 0) statusDiv.innerHTML = `<span style="color:#e74c3c; font-weight:700;">❌ Out of Stock!</span>`;
    else statusDiv.innerHTML = `<span style="color:#7f8c8d;">ℹ️ No record found</span>`;
}

// ========================================
// 11. TOAST
// ========================================
function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.style.background = type === 'error' ? '#ff4757' : '#00d4aa';
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

// ========================================
// 12. ADD IN
// ========================================
async function addIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value;
    const item = document.getElementById('in-item').value.trim();
    const barcode = document.getElementById('in-barcode').value || 'N/A';
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value);

    if (!date || !item || qty <= 0 || price <= 0) {
        showToast('Saari details bharein!', 'error');
        return;
    }

    try {
        const { data, error } = await _supabase.from('KRT').insert([
            { Date: date, item_name: item, stock_in: qty, stock_out: 0, price: price, vendor_name: vendor, barcode: barcode }
        ]).select();

        if (error) { showToast('Cloud error: ' + error.message, 'error'); return; }

        if (data && data.length > 0) {
            db.in.push({ id: data[0].id, date, vendor, item, barcode, qty, price, total: qty * price });
            saveAndRefresh();
            document.getElementById('in-item').value = '';
            document.getElementById('in-qty').value = '';
            document.getElementById('in-price').value = '';
            document.getElementById('in-barcode').value = '';
            showToast('✅ Stock IN saved!');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ========================================
// 13. ADD OUT
// ========================================
async function addOut() {
    const date = document.getElementById('out-date').value;
    const customer = document.getElementById('out-customer').value;
    const phone = document.getElementById('out-phone').value;
    const item = document.getElementById('out-item').value.trim();
    const barcode = document.getElementById('out-barcode').value || 'N/A';
    const qty = Number(document.getElementById('out-qty').value);
    const price = Number(document.getElementById('out-price').value);

    if (!date || !item || qty <= 0 || price <= 0) {
        showToast('Saari details bharein!', 'error');
        return;
    }

    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + (x.qty || 0), 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + (x.qty || 0), 0);
    const available = tin - tout;

    if (qty > available) {
        showToast(`Stock kam hai! Sirf ${available} available.`, 'error');
        return;
    }

    try {
        const { data, error } = await _supabase.from('KRT').insert([
            { Date: date, item_name: item, stock_in: 0, stock_out: qty, price: price, customer_name: customer, phone: phone, barcode: barcode }
        ]).select();

        if (error) { showToast('Cloud error: ' + error.message, 'error'); return; }

        if (data && data.length > 0) {
            db.out.push({ id: data[0].id, date, cust: customer, phone, item, barcode, qty, price, total: qty * price });
            saveAndRefresh();
            document.getElementById('out-qty').value = '';
            document.getElementById('out-price').value = '';
            document.getElementById('out-item').value = '';
            document.getElementById('out-barcode').value = '';
            document.getElementById('stock-status').innerHTML = '';
            showToast('✅ Stock OUT registered!');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ========================================
// 14. DELETE ENTRY
// ========================================
async function deleteEntry(type, index) {
    if (!confirm('Delete this record?')) return;
    const record = db[type][index];
    if (record && record.id) {
        try {
            const { error } = await _supabase.from('KRT').delete().eq('id', record.id);
            if (error) { showToast('Cloud delete failed', 'error'); return; }
        } catch (err) { showToast('Internet issue', 'error'); return; }
    }
    db[type].splice(index, 1);
    saveAndRefresh();
    showToast('✅ Deleted!');
}

// ========================================
// 15. GENERATE REPORT
// ========================================
function generateCustomReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;
    
    if (!from || !to) {
        showToast('⚠️ Pehle From aur To Date select karein!', 'error');
        return;
    }

    document.getElementById('report-period').textContent = `📅 Period: ${from} to ${to}`;

    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    const inBody = document.getElementById('rep-in-table-body');
    if (inBody) {
        if (filteredIn.length === 0) {
            inBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#7f8c8d;">📭 No records</td></tr>`;
        } else {
            inBody.innerHTML = filteredIn.map(x => `
                <tr><td>${x.date}</td><td>${x.item}</td><td>${x.vendor || ''}</td>
                <td>${x.qty}</td><td>${x.price.toLocaleString()}</td><td>${x.total.toLocaleString()}</td></tr>
            `).join('');
        }
    }

    const outBody = document.getElementById('rep-out-table-body');
    if (outBody) {
        if (filteredOut.length === 0) {
            outBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px; color:#7f8c8d;">📭 No records</td></tr>`;
        } else {
            outBody.innerHTML = filteredOut.map(x => `
                <tr><td>${x.date}</td><td>${x.item}</td><td>${x.cust || ''}</td>
                <td>${x.qty}</td><td>${x.price.toLocaleString()}</td><td>${x.total.toLocaleString()}</td></tr>
            `).join('');
        }
    }

    const totalIn = filteredIn.reduce((s, x) => s + (x.total || 0), 0);
    const totalOut = filteredOut.reduce((s, x) => s + (x.total || 0), 0);
    const profit = totalOut - totalIn;

    document.getElementById('sum-in').textContent = `PKR ${totalIn.toLocaleString()}`;
    document.getElementById('sum-out').textContent = `PKR ${totalOut.toLocaleString()}`;
    document.getElementById('sum-profit').textContent = `PKR ${profit.toLocaleString()}`;
    document.getElementById('sum-profit').style.color = profit > 0 ? '#00d4aa' : '#ff4757';

    showToast('✅ Report generated!');
}

// ========================================
// 16. MASTER SEARCH
// ========================================
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;
    
    if (!from || !to) {
        showToast('⚠️ Pehle From aur To Date select karein!', 'error');
        return;
    }

    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    const inBody = document.getElementById('master-in-body');
    if (inBody) {
        if (filteredIn.length === 0) {
            inBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">📭 No records</td></tr>`;
        } else {
            inBody.innerHTML = filteredIn.map((x) => {
                const idx = db.in.indexOf(x);
                return `
                    <tr>
                        <td>${x.date}</td><td>${x.item}</td><td>${x.vendor || ''}</td>
                        <td>${x.qty}</td><td>${x.price.toLocaleString()}</td><td>${x.total.toLocaleString()}</td>
                        <td><button onclick="deleteEntry('in', ${idx})" class="btn btn-red btn-sm">Del</button></td>
                    </tr>
                `;
            }).join('');
        }
    }

    const outBody = document.getElementById('master-out-body');
    if (outBody) {
        if (filteredOut.length === 0) {
            outBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">📭 No records</td></tr>`;
        } else {
            outBody.innerHTML = filteredOut.map((x) => {
                const idx = db.out.indexOf(x);
                return `
                    <tr>
                        <td>${x.date}</td><td>${x.item}</td><td>${x.cust || ''}</td>
                        <td>${x.qty}</td><td>${x.price.toLocaleString()}</td><td>${x.total.toLocaleString()}</td>
                        <td><button onclick="deleteEntry('out', ${idx})" class="btn btn-red btn-sm">Del</button></td>
                    </tr>
                `;
            }).join('');
        }
    }

    showToast(`✅ Found ${filteredIn.length + filteredOut.length} records`);
}

// ========================================
// 17. BILLING
// ========================================
function addBillRow() {
    const tbody = document.getElementById('bill-items-body');
    const rowCount = tbody.children.length;
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${rowCount + 1}</td>
        <td style="text-align:left;">
            <input type="text" id="bill-item-${rowCount}" placeholder="Item">
        </td>
        <td>
            <input type="number" id="bill-qty-${rowCount}" placeholder="0" oninput="calculateBill()">
        </td>
        <td>
            <input type="number" id="bill-price-${rowCount}" placeholder="0" oninput="calculateBill()">
        </td>
        <td id="bill-total-${rowCount}" style="font-weight:600;">0</td>
        <td>
            <button onclick="removeBillRow(this)" class="btn btn-red btn-sm">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    calculateBill();
}

function removeBillRow(btn) {
    const tbody = document.getElementById('bill-items-body');
    if (tbody.children.length <= 1) { showToast('At least one row!', 'error'); return; }
    btn.closest('tr').remove();
    renumberBillRows();
    calculateBill();
}

function renumberBillRows() {
    const rows = document.getElementById('bill-items-body').children;
    rows.forEach((row, idx) => row.children[0].textContent = idx + 1);
}

function calculateBill() {
    const rows = document.getElementById('bill-items-body').children;
    let grandTotal = 0;
    Array.from(rows).forEach((row, idx) => {
        const qty = Number(document.getElementById(`bill-qty-${idx}`)?.value || 0);
        const price = Number(document.getElementById(`bill-price-${idx}`)?.value || 0);
        const total = qty * price;
        const totalCell = document.getElementById(`bill-total-${idx}`);
        if (totalCell) totalCell.textContent = total.toLocaleString();
        grandTotal += total;
    });
    document.getElementById('bill-grand-total').textContent = `PKR ${grandTotal.toLocaleString()}`;
}

function saveBill() {
    const customer = document.getElementById('bill-customer').value.trim();
    if (!customer) { showToast('Customer name required!', 'error'); return; }

    const rows = document.getElementById('bill-items-body').children;
    let items = [];
    Array.from(rows).forEach((row, idx) => {
        const item = document.getElementById(`bill-item-${idx}`)?.value.trim();
        const qty = Number(document.getElementById(`bill-qty-${idx}`)?.value || 0);
        const price = Number(document.getElementById(`bill-price-${idx}`)?.value || 0);
        if (item && qty > 0 && price > 0) items.push({ item, qty, price, total: qty * price });
    });

    if (items.length === 0) { showToast('Add at least one item!', 'error'); return; }

    const billData = {
        number: `KRT-${new Date().getFullYear()}-${String(billCounter).padStart(3, '0')}`,
        date: document.getElementById('bill-date').value || new Date().toISOString().split('T')[0],
        customer,
        phone: document.getElementById('bill-phone').value,
        address: document.getElementById('bill-address').value,
        items,
        grandTotal: items.reduce((s, x) => s + x.total, 0)
    };

    const bills = JSON.parse(localStorage.getItem('krt_bills')) || [];
    bills.push(billData);
    localStorage.setItem('krt_bills', JSON.stringify(bills));
    localStorage.setItem('krt_bill_counter', billCounter + 1);
    billCounter++;
    document.getElementById('bill-number').textContent = `KRT-${new Date().getFullYear()}-${String(billCounter).padStart(3, '0')}`;
    showToast(`✅ Bill ${billData.number} saved!`);
}

function clearBill() {
    if (confirm('Clear all bill entries?')) {
        document.getElementById('bill-customer').value = '';
        document.getElementById('bill-phone').value = '';
        document.getElementById('bill-address').value = '';
        document.getElementById('bill-date').value = new Date().toISOString().split('T')[0];
        const tbody = document.getElementById('bill-items-body');
        tbody.innerHTML = '';
        addBillRow();
        document.getElementById('bill-grand-total').textContent = 'PKR 0';
    }
}

// ========================================
// 18. LEDGERS
// ========================================
function saveLedgerEntry() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const date = document.getElementById('led-date').value;
    const item = document.getElementById('led-item').value;
    const ctn = Number(document.getElementById('led-ctn').value) || 0;
    const debit = Number(document.getElementById('led-debit').value) || 0;
    const credit = Number(document.getElementById('led-credit').value) || 0;
    const method = document.getElementById('led-method').value;

    if (!name || !date) { showToast('Customer and Date required!', 'error'); return; }

    if (!db.ledgers) db.ledgers = {};
    if (!db.ledgers[name]) db.ledgers[name] = [];

    db.ledgers[name].push({ date, item, ctn, debit, credit, method });
    saveAndRefresh();
    updateCustomerDropdown();
    showLedger();
    showToast('✅ Ledger entry saved!');
}

function showLedger() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;

    if (!db.opening_balances) db.opening_balances = {};
    const opening = db.opening_balances[name] || 0;
    document.getElementById('opening-bal').value = opening;

    tbody.innerHTML = '';
    if (!name || !db.ledgers || !db.ledgers[name]) {
        document.getElementById('total-ctn').textContent = '0';
        document.getElementById('total-debit').textContent = '0';
        document.getElementById('total-credit').textContent = '0';
        document.getElementById('final-balance').textContent = 'Balance: 0';
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
                    <button onclick="editLedger('${name}', ${index})" class="btn btn-blue btn-sm">Edit</button>
                    <button onclick="delLedger('${name}', ${index})" class="btn btn-red btn-sm">Del</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('total-ctn').textContent = tCtn;
    document.getElementById('total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('total-credit').textContent = tCredit.toLocaleString();
    const balance = (opening + tDebit) - tCredit;
    document.getElementById('final-balance').textContent = `Balance: ${balance.toLocaleString()}`;
}

function updateOpeningBal() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const val = Number(document.getElementById('opening-bal').value) || 0;
    if (name) {
        if (!db.opening_balances) db.opening_balances = {};
        db.opening_balances[name] = val;
        saveAndRefresh();
        showLedger();
    }
}

function delLedger(custName, index) {
    if (confirm('Delete this entry?')) {
        db.ledgers[custName].splice(index, 1);
        saveAndRefresh();
        showLedger();
        showToast('✅ Deleted!');
    }
}

function editLedger(custName, index) {
    const entry = db.ledgers[custName][index];
    const nDebit = prompt('New Debit:', entry.debit);
    if (nDebit === null) return;
    const nCredit = prompt('New Credit:', entry.credit);
    if (nCredit === null) return;
    db.ledgers[custName][index].debit = Number(nDebit);
    db.ledgers[custName][index].credit = Number(nCredit);
    saveAndRefresh();
    showLedger();
    showToast('✅ Updated!');
}

// ========================================
// 19. RENT BOOK
// ========================================
function addRentEntry() {
    const name = document.getElementById('rent-name').value.trim();
    const shop = document.getElementById('rent-shop-no').value;
    const date = document.getElementById('rent-date').value;
    const month = document.getElementById('rent-month').value;
    const debit = Number(document.getElementById('rent-debit').value) || 0;
    const credit = Number(document.getElementById('rent-credit').value) || 0;
    const method = document.getElementById('rent-method').value;

    if (!name || !date) { showToast('Name and Date required!', 'error'); return; }

    dbRent.push({ name, shop, date, month, debit, credit, method });
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
    renderRentTable();
    showToast('✅ Rent entry saved!');
}

function renderRentTable() {
    const tbody = document.getElementById('rent-main-rows');
    const searchName = document.getElementById('rent-name').value.trim();
    if (!tbody) return;

    tbody.innerHTML = '';
    let tDebit = 0, tCredit = 0;
    const filtered = dbRent.filter(x => x.name.toLowerCase() === searchName.toLowerCase());

    if (filtered.length > 0) {
        filtered.forEach((r, index) => {
            tDebit += r.debit;
            tCredit += r.credit;
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${r.date}</td>
                    <td>${r.month}</td>
                    <td style="color:#e74c3c;">${r.debit.toLocaleString()}</td>
                    <td style="color:#27ae60;">${r.credit.toLocaleString()}</td>
                    <td>${r.method}</td>
                    <td><button onclick="deleteRent(${index})" class="btn btn-red btn-sm">Del</button></td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:20px; color:#7f8c8d;">📭 No records found</td></tr>`;
    }

    document.getElementById('rent-total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('rent-total-credit').textContent = tCredit.toLocaleString();
    document.getElementById('rent-final-balance').textContent = (tDebit - tCredit).toLocaleString();
}

function deleteRent(index) {
    if (confirm('Delete this entry?')) {
        dbRent.splice(index, 1);
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        renderRentTable();
        showToast('✅ Deleted!');
    }
}

// ========================================
// 20. MULTI-USER
// ========================================
function createNewUser() {
    const name = document.getElementById('new-username').value.trim();
    const id = document.getElementById('new-userid').value.trim();
    const pass = document.getElementById('new-password').value.trim();
    const perms = [];
    document.querySelectorAll('.perm:checked').forEach(cb => perms.push(cb.value));

    if (!name || !id || !pass) { showToast('All fields required!', 'error'); return; }

    extraUsers.push({ id, pass, name, perms });
    localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
    loadUserTable();
    showToast('✅ User created!');
    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';
    document.querySelectorAll('.perm').forEach(cb => cb.checked = false);
}

function loadUserTable() {
    const tbody = document.getElementById('user-table-body');
    if (!tbody) return;
    tbody.innerHTML = extraUsers.map((u, index) => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td><small>${u.perms.join(', ')}</small></td>
            <td><button onclick="deleteExtraUser(${index})" class="btn btn-red btn-sm">Del</button></td>
        </tr>
    `).join('');
}

function deleteExtraUser(index) {
    if (confirm('Delete user?')) {
        extraUsers.splice(index, 1);
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        loadUserTable();
        showToast('✅ User deleted!');
    }
}

// ========================================
// 21. CLOUD SYNC
// ========================================
async function syncAllCloudData() {
    if (!navigator.onLine) { showToast('No internet!', 'error'); return; }
    showToast('☁️ Syncing...', 'info');
    try {
        const { data, error } = await _supabase.from('KRT').select('*').order('id', { ascending: true });
        if (error) { showToast('Sync error: ' + error.message, 'error'); return; }
        if (data && data.length > 0) {
            db.in = [];
            db.out = [];
            data.forEach(row => {
                const stockIn = Number(row.stock_in || 0);
                const stockOut = Number(row.stock_out || 0);
                const price = Number(row.price || 0);
                const date = row.Date || row.date || new Date().toISOString().split('T')[0];
                const formattedDate = date.split('T')[0];
                if (stockIn > 0) {
                    db.in.push({ id: row.id, date: formattedDate, vendor: row.vendor_name || '', item: row.item_name || '', qty: stockIn, price, total: stockIn * price, barcode: row.barcode || 'N/A' });
                } else if (stockOut > 0) {
                    db.out.push({ id: row.id, date: formattedDate, cust: row.customer_name || '', phone: row.phone || '', item: row.item_name || '', qty: stockOut, price, total: stockOut * price, barcode: row.barcode || 'N/A' });
                }
            });
            localStorage.setItem('krt_erp_data', JSON.stringify(db));
            saveAndRefresh();
            showToast('✅ Sync complete! ' + data.length + ' records');
        } else {
            showToast('⚠️ No data in cloud');
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

// ========================================
// 22. BACKUP
// ========================================
function exportBackup() {
    const data = { db, dbRent, extraUsers, billCounter };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krt_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('✅ Backup exported!');
}

function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const data = JSON.parse(ev.target.result);
                db = data.db || db;
                dbRent = data.dbRent || dbRent;
                extraUsers = data.extraUsers || extraUsers;
                billCounter = data.billCounter || billCounter;
                localStorage.setItem('krt_erp_data', JSON.stringify(db));
                localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
                localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
                localStorage.setItem('krt_bill_counter', billCounter);
                saveAndRefresh();
                loadUserTable();
                renderRentTable();
                showToast('✅ Backup imported!');
            } catch (err) { showToast('Invalid file!', 'error'); }
        };
        reader.readAsText(file);
    };
    input.click();
}

function addSampleData() {
    if (confirm('Add sample data?')) {
        const today = new Date().toISOString().split('T')[0];
        const samplesIn = [
            { date: today, vendor: 'Al-Noor Traders', item: '32 gram-pp', barcode: 'N/A', qty: 53, price: 1200 },
            { date: today, vendor: 'Al-Hassan Builders', item: '33 gram', barcode: 'N/A', qty: 659, price: 8500 },
            { date: today, vendor: 'Lahore Traders', item: '12 gram', barcode: 'N/A', qty: 102, price: 2500 },
            { date: today, vendor: 'Karachi Steel', item: '15 gram', barcode: 'N/A', qty: 29, price: 7500 }
        ];
        const samplesOut = [
            { date: today, cust: 'Bilal Suleman', phone: '0300-1234567', item: '32 gram-pp', barcode: 'N/A', qty: 34, price: 1500 },
            { date: today, cust: 'Ahmed Traders', phone: '0300-7654321', item: '33 gram', barcode: 'N/A', qty: 625, price: 9500 },
            { date: today, cust: 'Sattar Bhai', phone: '0300-9876543', item: '12 gram', barcode: 'N/A', qty: 67, price: 3200 },
            { date: today, cust: 'Zain Builders', phone: '0300-5555555', item: '15 gram', barcode: 'N/A', qty: 25, price: 8500 }
        ];
        samplesIn.forEach(x => {
            db.in.push({ id: Date.now() + Math.random(), ...x, total: x.qty * x.price });
        });
        samplesOut.forEach(x => {
            db.out.push({ id: Date.now() + Math.random(), ...x, total: x.qty * x.price });
        });
        saveAndRefresh();
        showToast('✅ Sample data added!');
    }
}

function clearAllData() {
    if (confirm('⚠️ Clear all data? This cannot be undone!')) {
        if (confirm('Are you sure?')) {
            db = { in: [], out: [], ledgers: {}, opening_balances: {} };
            dbRent = [];
            localStorage.setItem('krt_erp_data', JSON.stringify(db));
            localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
            saveAndRefresh();
            renderRentTable();
            showToast('🗑️ All data cleared!');
        }
    }
}

// ========================================
// 23. LOGIN SYSTEM
// ========================================
function login() {
    const u = document.getElementById('user').value.trim().toLowerCase();
    const p = document.getElementById('pass').value.trim();
    const error = document.getElementById('login-error');

    if (u === 'admin' && p === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        showSystem('admin');
        return;
    }
    if (u === 'ali' && p === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'staff');
        showSystem('staff');
        return;
    }
    if (u === 'sattar' && p === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'manager');
        showSystem('manager');
        return;
    }

    const found = extraUsers.find(user => user.id === u && user.pass === p);
    if (found) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'extra');
        localStorage.setItem('extraUser', JSON.stringify(found));
        showSystem(found);
        return;
    }

    error.style.display = 'block';
}

function showSystem(roleOrUser) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('toggle-btn').style.display = 'block';

    loadAllData();
    renderAll();
    loadUserTable();
    renderRentTable();
    showToast('Welcome to KRT ERP!');
}

function logout() {
    if (confirm('Logout?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('extraUser');
        location.reload();
    }
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const mc = document.getElementById('main-content');
    if (sb.style.left === '0px' || sb.style.left === '') {
        sb.style.left = '-300px';
        mc.style.marginLeft = '0';
        sb.classList.remove('open');
    } else {
        sb.style.left = '0px';
        mc.style.marginLeft = '280px';
        sb.classList.add('open');
    }
}

function switchPage(pageId, title) {
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    const page = document.getElementById(pageId);
    if (page) page.style.display = 'block';
    document.getElementById('page-title').textContent = `KRT TRADERS ERP - ${title}`;
    if (pageId === 'page-balance') renderBalanceTable();
    if (pageId === 'page-dashboard') updateDashboard();
    
    if (window.innerWidth <= 992) {
        const sb = document.getElementById('sidebar');
        const mc = document.getElementById('main-content');
        sb.style.left = '-300px';
        mc.style.marginLeft = '0';
        sb.classList.remove('open');
    }
}

// ========================================
// 24. CLOCK
// ========================================
function updateClock() {
    const now = new Date();
    const clock = document.getElementById('clock-display');
    if (clock) {
        clock.textContent = now.toLocaleString('en-PK', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
        });
    }
}
setInterval(updateClock, 1000);

// ========================================
// 25. INIT
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 KRT ERP Starting...');
    loadAllData();

    const today = new Date().toISOString().split('T')[0];
    ['in-date', 'out-date', 'led-date', 'rent-date', 'bill-date', 'rep-from-date', 'rep-to-date', 'master-from', 'master-to'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'rep-from-date' || id === 'master-from') {
                const d = new Date();
                d.setDate(d.getDate() - 30);
                el.value = d.toISOString().split('T')[0];
            } else if (id === 'rep-to-date' || id === 'master-to') {
                el.value = today;
            } else {
                el.value = today;
            }
        }
    });

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        const role = localStorage.getItem('userRole');
        if (role === 'admin') showSystem('admin');
        else if (role === 'staff') showSystem('staff');
        else if (role === 'manager') showSystem('manager');
        else {
            const userData = localStorage.getItem('extraUser');
            if (userData) {
                try { showSystem(JSON.parse(userData)); } 
                catch (e) { showSystem('admin'); }
            }
        }
    }

    const billNumber = document.getElementById('bill-number');
    if (billNumber) {
        billNumber.textContent = `KRT-${new Date().getFullYear()}-${String(billCounter).padStart(3, '0')}`;
    }

    const rentName = document.getElementById('rent-name');
    if (rentName) {
        rentName.addEventListener('input', renderRentTable);
    }

    console.log('✅ KRT ERP Ready!');
    console.log(`📊 IN: ${db.in.length}, OUT: ${db.out.length}`);
});
