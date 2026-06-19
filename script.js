// ========================================
// KRT TRADERS ERP - COMPLETE JAVASCRIPT (FULLY FIXED)
// ========================================

// ========================================
// 1. SUPABASE INITIALIZATION
// ========================================
const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ========================================
// 2. GLOBAL DATABASE OBJECTS
// ========================================
let db = { in: [], out: [], ledgers: {}, opening_balances: {} };
let dbRent = [];
let extraUsers = [];
let billCounter = 1;

// ========================================
// 3. LOAD DATA FROM LOCAL STORAGE
// ========================================
function loadAllData() {
    console.log('Loading data from localStorage...');
    
    // Load main data
    try {
        const stored = localStorage.getItem('krt_erp_data');
        if (stored) {
            db = JSON.parse(stored);
            console.log('Main data loaded:', db);
        } else {
            console.log('No main data found, creating sample...');
            createSampleData();
        }
    } catch (e) {
        console.error('Main data load error:', e);
        createSampleData();
    }

    // Ensure all properties exist
    if (!db.in) db.in = [];
    if (!db.out) db.out = [];
    if (!db.ledgers) db.ledgers = {};
    if (!db.opening_balances) db.opening_balances = {};

    // Load rent data
    try {
        const rentStored = localStorage.getItem('krt_rent_data');
        if (rentStored) {
            dbRent = JSON.parse(rentStored);
            console.log('Rent data loaded:', dbRent);
        }
    } catch (e) {
        dbRent = [];
    }

    // Load users
    try {
        const userStored = localStorage.getItem('krt_extra_users');
        if (userStored) {
            extraUsers = JSON.parse(userStored);
        }
    } catch (e) {
        extraUsers = [];
    }

    // Load bill counter
    try {
        const counter = localStorage.getItem('krt_bill_counter');
        if (counter) {
            billCounter = parseInt(counter);
        }
    } catch (e) {
        billCounter = 1;
    }

    console.log('All data loaded successfully!');
    console.log('Total IN entries:', db.in.length);
    console.log('Total OUT entries:', db.out.length);
}

// ========================================
// 4. CREATE SAMPLE DATA
// ========================================
function createSampleData() {
    console.log('Creating sample data...');
    
    const today = new Date().toISOString().split('T')[0];
    
    db = {
        in: [
            {
                id: 1,
                date: today,
                vendor: 'Al-Noor Traders',
                item: 'Cement',
                barcode: 'CEM001',
                qty: 100,
                price: 1200,
                total: 120000
            },
            {
                id: 2,
                date: today,
                vendor: 'Al-Hassan Builders',
                item: 'Steel Bar 12mm',
                barcode: 'STL012',
                qty: 50,
                price: 8500,
                total: 425000
            },
            {
                id: 3,
                date: today,
                vendor: 'Lahore Traders',
                item: 'Paint White',
                barcode: 'PNT001',
                qty: 30,
                price: 2500,
                total: 75000
            },
            {
                id: 4,
                date: '2026-06-15',
                vendor: 'Karachi Steel',
                item: 'Steel Bar 10mm',
                barcode: 'STL010',
                qty: 80,
                price: 7500,
                total: 600000
            },
            {
                id: 5,
                date: '2026-06-10',
                vendor: 'Islamabad Traders',
                item: 'Cement',
                barcode: 'CEM002',
                qty: 200,
                price: 1100,
                total: 220000
            }
        ],
        out: [
            {
                id: 1,
                date: today,
                cust: 'Bilal Suleman',
                phone: '0300-1234567',
                item: 'Cement',
                barcode: 'CEM001',
                qty: 20,
                price: 1500,
                total: 30000
            },
            {
                id: 2,
                date: today,
                cust: 'Ahmed Traders',
                phone: '0300-7654321',
                item: 'Steel Bar 12mm',
                barcode: 'STL012',
                qty: 10,
                price: 9500,
                total: 95000
            },
            {
                id: 3,
                date: '2026-06-16',
                cust: 'Sattar Bhai',
                phone: '0300-9876543',
                item: 'Paint White',
                barcode: 'PNT001',
                qty: 15,
                price: 3200,
                total: 48000
            },
            {
                id: 4,
                date: '2026-06-14',
                cust: 'Zain Builders',
                phone: '0300-5555555',
                item: 'Steel Bar 10mm',
                barcode: 'STL010',
                qty: 30,
                price: 8500,
                total: 255000
            }
        ],
        ledgers: {},
        opening_balances: {}
    };

    // Save sample data
    localStorage.setItem('krt_erp_data', JSON.stringify(db));
    console.log('Sample data created and saved!');
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
    console.log('Data saved and all views refreshed!');
}

// ========================================
// 6. RENDER ALL - COMPLETE FIXED
// ========================================
function renderAll() {
    console.log('Rendering all data...');
    const today = new Date().toISOString().split('T')[0];

    // ===== TODAY'S STOCK IN =====
    const inBody = document.getElementById('today-list-in');
    if (inBody) {
        let html = '';
        let counter = 1;
        const todayIn = db.in.filter(x => x.date === today);
        console.log('Today IN entries:', todayIn.length);
        
        if (todayIn.length === 0) {
            html = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:20px;">📭 Aaj ki koi entry nahi hai...</td></tr>`;
        } else {
            todayIn.forEach((x, index) => {
                const originalIndex = db.in.indexOf(x);
                html += `
                    <tr>
                        <td>${counter++}</td>
                        <td><strong>${x.item}</strong></td>
                        <td>${x.vendor || ''}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                        <td>
                            <button onclick="deleteEntry('in', ${originalIndex})" class="btn btn-red btn-sm">Del</button>
                        </td>
                    </tr>
                `;
            });
        }
        inBody.innerHTML = html;
    }

    // ===== TODAY'S STOCK OUT =====
    const outBody = document.getElementById('today-list-out');
    if (outBody) {
        let html = '';
        let counter = 1;
        const todayOut = db.out.filter(x => x.date === today);
        console.log('Today OUT entries:', todayOut.length);
        
        if (todayOut.length === 0) {
            html = `<tr><td colspan="9" style="text-align:center; color:#7f8c8d; padding:20px;">📭 Aaj ki koi sale nahi hai...</td></tr>`;
        } else {
            todayOut.forEach((x, index) => {
                const originalIndex = db.out.indexOf(x);
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
                        <td>
                            <button onclick="deleteEntry('out', ${originalIndex})" class="btn btn-red btn-sm">Del</button>
                        </td>
                    </tr>
                `;
            });
        }
        outBody.innerHTML = html;
    }

    // Update other components
    renderBalanceTable();
    updateDashboard();
    updateItemLists();
    updateCustomerDropdown();
    
    console.log('Render complete!');
}

// ========================================
// 7. BALANCE TABLE - COMPLETE FIXED
// ========================================
function renderBalanceTable() {
    console.log('Rendering balance table...');
    const tbody = document.getElementById('table-balance-body');
    if (!tbody) {
        console.log('Balance table body not found!');
        return;
    }

    // Get all unique items from both IN and OUT
    const allItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    console.log('Unique items found:', allItems);

    if (allItems.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:20px;">📭 Koi item nahi mila. Pehle entries add karein!</td></tr>`;
        return;
    }

    let html = '';
    allItems.forEach(name => {
        if (!name) return;

        // Calculate totals
        const tin = db.in.filter(x => x.item === name).reduce((s, x) => s + (x.qty || 0), 0);
        const tout = db.out.filter(x => x.item === name).reduce((s, x) => s + (x.qty || 0), 0);
        const remaining = tin - tout;

        // Get prices
        const inItem = db.in.find(x => x.item === name);
        const outItem = db.out.find(x => x.item === name);
        const pPrice = inItem?.price || 0;
        const sPrice = outItem?.price || 0;
        const profit = (sPrice - pPrice) * tout;

        // Status
        let status = '';
        if (remaining > 10) status = '<span class="stock-indicator high">✅ High</span>';
        else if (remaining > 0) status = '<span class="stock-indicator medium">⚠️ Medium</span>';
        else if (remaining <= 0 && tin > 0) status = '<span class="stock-indicator low">❌ Low</span>';
        else status = '<span class="stock-indicator">🆕 New</span>';

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
    console.log('Balance table rendered with', allItems.length, 'items');
}

// ========================================
// 8. UPDATE DASHBOARD
// ========================================
function updateDashboard() {
    console.log('Updating dashboard...');
    
    const totalItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])].length;
    const totalIn = db.in.reduce((s, x) => s + (x.qty || 0), 0);
    const totalOut = db.out.reduce((s, x) => s + (x.qty || 0), 0);

    // Calculate profit
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

    // Recent entries in dashboard
    const inBody = document.getElementById('dashboard-in');
    if (inBody) {
        const recentIn = db.in.slice(-5).reverse();
        if (recentIn.length === 0) {
            inBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#7f8c8d;">No entries</td></tr>`;
        } else {
            inBody.innerHTML = recentIn.map(x => `
                <tr><td>${x.item}</td><td>${x.qty}</td><td>${x.vendor || ''}</td><td>${x.date}</td></tr>
            `).join('');
        }
    }

    const outBody = document.getElementById('dashboard-out');
    if (outBody) {
        const recentOut = db.out.slice(-5).reverse();
        if (recentOut.length === 0) {
            outBody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#7f8c8d;">No entries</td></tr>`;
        } else {
            outBody.innerHTML = recentOut.map(x => `
                <tr><td>${x.item}</td><td>${x.qty}</td><td>${x.cust || ''}</td><td>${x.date}</td></tr>
            `).join('');
        }
    }
}

// ========================================
// 9. UPDATE ITEM LISTS
// ========================================
function updateItemLists() {
    const list = document.getElementById('items-list');
    if (!list) return;
    
    const allItems = [...new Set([...db.in.map(x => x.item), ...db.out.map(x => x.item)])];
    list.innerHTML = allItems.map(name => `<option value="${name}">`).join('');
    console.log('Item list updated with', allItems.length, 'items');
}

// ========================================
// 10. UPDATE CUSTOMER DROPDOWN
// ========================================
function updateCustomerDropdown() {
    const list = document.getElementById('customer-list');
    if (!list) return;
    
    if (!db.ledgers) db.ledgers = {};
    const names = Object.keys(db.ledgers);
    list.innerHTML = names.map(name => `<option value="${name}">`).join('');
}

// ========================================
// 11. LIVE STOCK VIEW
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

    if (balance > 10) {
        statusDiv.innerHTML = `<span style="color:#27ae60; font-weight:700;">✅ Available: ${balance} (In Stock)</span>`;
    } else if (balance > 0) {
        statusDiv.innerHTML = `<span style="color:#f39c12; font-weight:700;">⚠️ Available: ${balance} (Low Stock)</span>`;
    } else if (balance <= 0 && tin > 0) {
        statusDiv.innerHTML = `<span style="color:#e74c3c; font-weight:700;">❌ Out of Stock! (Balance: ${balance})</span>`;
    } else {
        statusDiv.innerHTML = `<span style="color:#7f8c8d;">ℹ️ No record found for this item.</span>`;
    }
}

// ========================================
// 12. STOCK IN FUNCTION
// ========================================
async function addIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value;
    const item = document.getElementById('in-item').value.trim();
    const barcode = document.getElementById('in-barcode').value;
    const qty = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value);

    if (!date || !item || qty <= 0 || price <= 0) {
        showToast('Bilal Bhai, saari details lazmi bharein!', 'error');
        return;
    }

    try {
        const { data, error } = await _supabase.from('KRT').insert([
            {
                Date: date,
                item_name: item,
                stock_in: qty,
                stock_out: 0,
                price: price,
                vendor_name: vendor,
                barcode: barcode
            }
        ]).select();

        if (error) {
            showToast('Cloud sync fail: ' + error.message, 'error');
            return;
        }

        if (data && data.length > 0) {
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
            
            document.getElementById('in-item').value = '';
            document.getElementById('in-qty').value = '';
            document.getElementById('in-price').value = '';
            document.getElementById('in-barcode').value = '';

            showToast('Stock IN saved successfully!', 'success');
        }

    } catch (err) {
        showToast('Connection error: ' + err.message, 'error');
    }
}

// ========================================
// 13. STOCK OUT FUNCTION
// ========================================
async function addOut() {
    const date = document.getElementById('out-date').value;
    const customer = document.getElementById('out-customer').value;
    const phone = document.getElementById('out-phone').value;
    const item = document.getElementById('out-item').value.trim();
    const barcode = document.getElementById('out-barcode').value;
    const qty = Number(document.getElementById('out-qty').value);
    const price = Number(document.getElementById('out-price').value);

    if (!date || !item || qty <= 0 || price <= 0) {
        showToast('Bilal Bhai, saari details bharein!', 'error');
        return;
    }

    // Stock check
    const tin = db.in.filter(x => x.item === item).reduce((s, x) => s + (x.qty || 0), 0);
    const tout = db.out.filter(x => x.item === item).reduce((s, x) => s + (x.qty || 0), 0);
    const available = tin - tout;

    if (qty > available) {
        showToast(`Stock kam hai! Sirf ${available} available.`, 'error');
        return;
    }

    try {
        const { data, error } = await _supabase.from('KRT').insert([
            {
                Date: date,
                item_name: item,
                stock_in: 0,
                stock_out: qty,
                price: price,
                customer_name: customer,
                phone: phone,
                barcode: barcode
            }
        ]).select();

        if (error) {
            showToast('Cloud sync fail: ' + error.message, 'error');
            return;
        }

        if (data && data.length > 0) {
            db.out.push({
                id: data[0].id,
                date: date,
                cust: customer,
                phone: phone,
                item: item,
                barcode: barcode,
                qty: qty,
                price: price,
                total: qty * price
            });

            saveAndRefresh();

            document.getElementById('out-qty').value = '';
            document.getElementById('out-price').value = '';
            document.getElementById('out-item').value = '';
            document.getElementById('out-barcode').value = '';
            document.getElementById('stock-status').innerHTML = '';

            showToast('Stock OUT registered successfully!', 'success');
        }

    } catch (err) {
        showToast('Connection error: ' + err.message, 'error');
    }
}

// ========================================
// 14. DELETE ENTRY
// ========================================
async function deleteEntry(type, index) {
    if (!confirm('Bilal Bhai, kya aap waqai ye record delete karna chahte hain?')) return;

    const record = db[type][index];
    if (record && record.id) {
        try {
            const { error } = await _supabase.from('KRT').delete().eq('id', record.id);
            if (error) {
                showToast('Cloud delete fail: ' + error.message, 'error');
                return;
            }
        } catch (err) {
            showToast('Internet issue: ' + err.message, 'error');
            return;
        }
    }

    db[type].splice(index, 1);
    saveAndRefresh();
    showToast('Record deleted successfully!', 'success');
}

// ========================================
// 15. REPORTS
// ========================================
function generateCustomReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;

    if (!from || !to) {
        showToast('Dono dates select karein!', 'error');
        return;
    }

    document.getElementById('report-period').textContent = `Period: ${from} to ${to}`;

    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    const inBody = document.querySelector('#rep-in-table tbody');
    if (inBody) {
        if (filteredIn.length === 0) {
            inBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#7f8c8d; padding:20px;">📭 No records found</td></tr>`;
        } else {
            inBody.innerHTML = filteredIn.map(x => `
                <tr>
                    <td>${x.date}</td>
                    <td>${x.item}</td>
                    <td>${x.vendor || ''}</td>
                    <td>${x.qty}</td>
                    <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                    <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                </tr>
            `).join('');
        }
    }

    const outBody = document.querySelector('#rep-out-table tbody');
    if (outBody) {
        if (filteredOut.length === 0) {
            outBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#7f8c8d; padding:20px;">📭 No records found</td></tr>`;
        } else {
            outBody.innerHTML = filteredOut.map(x => `
                <tr>
                    <td>${x.date}</td>
                    <td>${x.item}</td>
                    <td>${x.cust || ''}</td>
                    <td>${x.qty}</td>
                    <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                    <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                </tr>
            `).join('');
        }
    }

    const totalIn = filteredIn.reduce((s, x) => s + (x.total || 0), 0);
    const totalOut = filteredOut.reduce((s, x) => s + (x.total || 0), 0);

    document.getElementById('sum-in').textContent = `PKR ${totalIn.toLocaleString()}`;
    document.getElementById('sum-out').textContent = `PKR ${totalOut.toLocaleString()}`;
    document.getElementById('sum-profit').textContent = `PKR ${(totalOut - totalIn).toLocaleString()}`;
}

// ========================================
// 16. MASTER SEARCH
// ========================================
function generateMasterSearch() {
    const from = document.getElementById('master-from').value;
    const to = document.getElementById('master-to').value;

    if (!from || !to) {
        showToast('Pehle dates select karein!', 'error');
        return;
    }

    const filteredIn = db.in.filter(x => x.date >= from && x.date <= to);
    const filteredOut = db.out.filter(x => x.date >= from && x.date <= to);

    const inBody = document.querySelector('#master-in-table tbody');
    if (inBody) {
        if (filteredIn.length === 0) {
            inBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:20px;">📭 No records found</td></tr>`;
        } else {
            inBody.innerHTML = filteredIn.map((x) => {
                const originalIndex = db.in.indexOf(x);
                return `
                    <tr>
                        <td>${x.date}</td>
                        <td>${x.item}</td>
                        <td>${x.vendor || ''}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                        <td>
                            <button onclick="editEntry('in', ${originalIndex})" class="btn btn-blue btn-sm">Edit</button>
                            <button onclick="deleteEntry('in', ${originalIndex})" class="btn btn-red btn-sm">Del</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    const outBody = document.querySelector('#master-out-table tbody');
    if (outBody) {
        if (filteredOut.length === 0) {
            outBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:20px;">📭 No records found</td></tr>`;
        } else {
            outBody.innerHTML = filteredOut.map((x) => {
                const originalIndex = db.out.indexOf(x);
                return `
                    <tr>
                        <td>${x.date}</td>
                        <td>${x.item}</td>
                        <td>${x.cust || ''}</td>
                        <td>${x.qty}</td>
                        <td>${x.price ? x.price.toLocaleString() : '0'}</td>
                        <td>${x.total ? x.total.toLocaleString() : '0'}</td>
                        <td>
                            <button onclick="editEntry('out', ${originalIndex})" class="btn btn-blue btn-sm">Edit</button>
                            <button onclick="deleteEntry('out', ${originalIndex})" class="btn btn-red btn-sm">Del</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }
}

// ========================================
// 17. EDIT ENTRY
// ========================================
async function editEntry(type, index) {
    const data = db[type][index];
    const newQty = prompt('New Qty:', data.qty);
    if (newQty === null) return;
    const newPrice = prompt('New Price:', data.price);
    if (newPrice === null) return;

    try {
        const { error } = await _supabase.from('KRT').update({
            stock_in: type === 'in' ? Number(newQty) : 0,
            stock_out: type === 'out' ? Number(newQty) : 0,
            price: Number(newPrice)
        }).eq('id', data.id);

        if (error) {
            showToast(error.message, 'error');
            return;
        }

        db[type][index].qty = Number(newQty);
        db[type][index].price = Number(newPrice);
        db[type][index].total = Number(newQty) * Number(newPrice);

        saveAndRefresh();
        generateMasterSearch();
        showToast('Updated successfully!', 'success');

    } catch (err) {
        showToast('Internet issue: ' + err.message, 'error');
    }
}

// ========================================
// 18. BILLING SYSTEM
// ========================================
function addBillRow() {
    const tbody = document.getElementById('bill-items-body');
    const rowCount = tbody.children.length;
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
        <td>${rowCount + 1}</td>
        <td style="text-align:left;">
            <input type="text" id="bill-item-${rowCount}" placeholder="Item" style="border:none; background:transparent; padding:0; width:100%;">
        </td>
        <td>
            <input type="number" id="bill-qty-${rowCount}" placeholder="0" oninput="calculateBill()" style="border:none; background:transparent; padding:0; width:60px; text-align:center;">
        </td>
        <td>
            <input type="number" id="bill-price-${rowCount}" placeholder="0" oninput="calculateBill()" style="border:none; background:transparent; padding:0; width:80px; text-align:center;">
        </td>
        <td id="bill-total-${rowCount}" style="font-weight:600;">0</td>
        <td>
            <button onclick="removeBillRow(this)" class="btn btn-red btn-sm" style="padding:2px 10px;">✕</button>
        </td>
    `;
    tbody.appendChild(tr);
    calculateBill();
}

function removeBillRow(btn) {
    const tbody = document.getElementById('bill-items-body');
    if (tbody.children.length <= 1) {
        showToast('At least one row required!', 'error');
        return;
    }
    btn.closest('tr').remove();
    renumberBillRows();
    calculateBill();
}

function renumberBillRows() {
    const rows = document.getElementById('bill-items-body').children;
    rows.forEach((row, idx) => {
        row.children[0].textContent = idx + 1;
    });
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
    const phone = document.getElementById('bill-phone').value.trim();
    const address = document.getElementById('bill-address').value.trim();

    if (!customer) {
        showToast('Customer name required!', 'error');
        return;
    }

    const rows = document.getElementById('bill-items-body').children;
    let items = [];

    Array.from(rows).forEach((row, idx) => {
        const item = document.getElementById(`bill-item-${idx}`)?.value.trim();
        const qty = Number(document.getElementById(`bill-qty-${idx}`)?.value || 0);
        const price = Number(document.getElementById(`bill-price-${idx}`)?.value || 0);
        if (item && qty > 0 && price > 0) {
            items.push({ item, qty, price, total: qty * price });
        }
    });

    if (items.length === 0) {
        showToast('Add at least one item!', 'error');
        return;
    }

    const billData = {
        number: `KRT-${new Date().getFullYear()}-${String(billCounter).padStart(3, '0')}`,
        date: document.getElementById('bill-date').value || new Date().toISOString().split('T')[0],
        customer,
        phone,
        address,
        items,
        grandTotal: items.reduce((s, x) => s + x.total, 0)
    };

    const bills = JSON.parse(localStorage.getItem('krt_bills')) || [];
    bills.push(billData);
    localStorage.setItem('krt_bills', JSON.stringify(bills));
    localStorage.setItem('krt_bill_counter', billCounter + 1);
    billCounter++;

    showToast(`Bill ${billData.number} saved!`, 'success');
    printBill();
}

function printBill() {
    window.print();
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
// 19. CUSTOMER LEDGERS
// ========================================
function saveLedgerEntry() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const date = document.getElementById('led-date').value;
    const item = document.getElementById('led-item').value;
    const ctn = Number(document.getElementById('led-ctn').value) || 0;
    const debit = Number(document.getElementById('led-debit').value) || 0;
    const credit = Number(document.getElementById('led-credit').value) || 0;
    const method = document.getElementById('led-method').value;

    if (!name || !date) {
        showToast('Customer Name aur Date lazmi hai!', 'error');
        return;
    }

    if (!db.ledgers) db.ledgers = {};
    if (!db.ledgers[name]) {
        db.ledgers[name] = [];
    }

    db.ledgers[name].push({ date, item, ctn, debit, credit, method });
    saveAndRefresh();
    updateCustomerDropdown();
    showLedger();

    document.getElementById('led-item').value = '';
    document.getElementById('led-ctn').value = '0';
    document.getElementById('led-debit').value = '0';
    document.getElementById('led-credit').value = '0';

    showToast('Entry saved!', 'success');
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

function showLedger() {
    const name = document.getElementById('ledger-cust-name').value.trim();
    const tbody = document.getElementById('ledger-table-body');
    if (!tbody) return;

    if (!db.opening_balances) db.opening_balances = {};
    const opening = db.opening_balances[name] || 0;
    document.getElementById('opening-bal').value = opening;

    tbody.innerHTML = '';
    if (!name || !db.ledgers || !db.ledgers[name]) {
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
                    <button onclick="editLedger('${name}', ${index})" class="btn btn-blue btn-sm">Edit</button>
                    <button onclick="delLedger('${name}', ${index})" class="btn btn-red btn-sm">Del</button>
                </td>
            </tr>
        `;
    });

    document.getElementById('total-ctn').textContent = tCtn;
    document.getElementById('total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('total-credit').textContent = tCredit.toLocaleString();

    const currentBalance = (opening + tDebit) - tCredit;
    document.getElementById('final-balance').textContent = `Balance: ${currentBalance.toLocaleString()}`;
}

function resetLedgerTotals() {
    document.getElementById('total-ctn').textContent = '0';
    document.getElementById('total-debit').textContent = '0';
    document.getElementById('total-credit').textContent = '0';
    document.getElementById('final-balance').textContent = 'Balance: 0';
}

function delLedger(custName, index) {
    if (confirm('Kya ye entry delete kar dein?')) {
        db.ledgers[custName].splice(index, 1);
        saveAndRefresh();
        showLedger();
        showToast('Entry deleted!', 'success');
    }
}

function editLedger(custName, index) {
    const entry = db.ledgers[custName][index];
    const nDebit = prompt('Naya Debit (Udhaar):', entry.debit);
    if (nDebit === null) return;
    const nCredit = prompt('Naya Credit (Wasuli):', entry.credit);
    if (nCredit === null) return;

    db.ledgers[custName][index].debit = Number(nDebit);
    db.ledgers[custName][index].credit = Number(nCredit);
    saveAndRefresh();
    showLedger();
    showToast('Updated!', 'success');
}

// ========================================
// 20. RENT BOOK
// ========================================
function addRentEntry() {
    const name = document.getElementById('rent-name').value.trim();
    const shop = document.getElementById('rent-shop-no').value;
    const date = document.getElementById('rent-date').value;
    const month = document.getElementById('rent-month').value;
    const debit = Number(document.getElementById('rent-debit').value) || 0;
    const credit = Number(document.getElementById('rent-credit').value) || 0;
    const method = document.getElementById('rent-method').value;

    if (!name || !date) {
        showToast('Customer Name aur Date lazmi likhain!', 'error');
        return;
    }

    dbRent.push({ name, shop, date, month, debit, credit, method });
    localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));

    showToast(`${name} ki entry save ho gayi!`, 'success');
    renderRentTable();
    document.getElementById('rent-debit').value = '0';
    document.getElementById('rent-credit').value = '0';
}

function renderRentTable() {
    const tbody = document.getElementById('rent-main-rows');
    const searchName = document.getElementById('rent-name').value.trim();
    if (!tbody) return;

    tbody.innerHTML = '';
    let tDebit = 0;
    let tCredit = 0;

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
                    <td>
                        <button onclick="deleteRent(${index})" class="btn btn-red btn-sm">Del</button>
                    </td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:20px;">📭 Naya Customer hai ya naam sahi nahi likha...</td></tr>`;
    }

    document.getElementById('rent-total-debit').textContent = tDebit.toLocaleString();
    document.getElementById('rent-total-credit').textContent = tCredit.toLocaleString();
    document.getElementById('rent-final-balance').textContent = (tDebit - tCredit).toLocaleString();
}

function deleteRent(index) {
    if (confirm('Kya ye entry delete kar dein?')) {
        dbRent.splice(index, 1);
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        renderRentTable();
        showToast('Entry deleted!', 'success');
    }
}

// ========================================
// 21. MULTI-USER MANAGEMENT
// ========================================
function createNewUser() {
    const name = document.getElementById('new-username').value.trim();
    const id = document.getElementById('new-userid').value.trim();
    const pass = document.getElementById('new-password').value.trim();

    const selectedPerms = [];
    document.querySelectorAll('.perm:checked').forEach(cb => {
        selectedPerms.push(cb.value);
    });

    if (!name || !id || !pass) {
        showToast('Bilal Bhai, saari details bharein!', 'error');
        return;
    }

    extraUsers.push({ id, pass, name, perms: selectedPerms });
    localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));

    showToast('Naya Account Ban Gaya!', 'success');
    loadUserTable();

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
            <td>
                <button onclick="deleteExtraUser(${index})" class="btn btn-red btn-sm">Del</button>
            </td>
        </tr>
    `).join('');
}

function deleteExtraUser(index) {
    if (confirm('Kya aap is user ko delete karna chahte hain?')) {
        extraUsers.splice(index, 1);
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        loadUserTable();
        showToast('User deleted!', 'success');
    }
}

// ========================================
// 22. TOAST NOTIFICATION
// ========================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.style.display = 'block';
    setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// ========================================
// 23. CLOCK UPDATE
// ========================================
function updateClock() {
    const now = new Date();
    const clock = document.getElementById('clock-display');
    if (clock) {
        clock.textContent = now.toLocaleString('en-PK', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }
}
setInterval(updateClock, 1000);

// ========================================
// 24. LOGIN SYSTEM
// ========================================
function login() {
    const userField = document.getElementById('user');
    const passField = document.getElementById('pass');
    const errorMsg = document.getElementById('login-error');

    if (!userField || !passField) return;

    const u = userField.value.trim().toLowerCase();
    const p = passField.value.trim();

    errorMsg.style.display = 'none';

    // Admin
    if (u === 'admin' && p === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        showSystem('admin');
        showToast('Welcome Admin!', 'success');
        return;
    }

    // Staff
    if (u === 'ali' && p === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'staff');
        showSystem('staff');
        showToast('Welcome Staff!', 'success');
        return;
    }

    // Manager
    if (u === 'sattar' && p === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'manager');
        showSystem('manager');
        showToast('Welcome Manager!', 'success');
        return;
    }

    // Extra Users
    const found = extraUsers.find(user => user.id === u && user.pass === p);
    if (found) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'extra');
        localStorage.setItem('extraUser', JSON.stringify(found));
        showSystem(found);
        showToast(`Welcome ${found.name}!`, 'success');
        return;
    }

    errorMsg.style.display = 'block';
}

function showSystem(roleOrUser) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('sidebar').style.display = 'block';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('toggle-btn').style.display = 'block';

    // Apply permissions
    if (typeof roleOrUser === 'object') {
        applyDynamicPermissions(roleOrUser);
    } else {
        const menuItems = document.querySelectorAll('#sidebar ul li');
        menuItems.forEach(item => item.style.display = 'flex');

        if (roleOrUser === 'staff') {
            menuItems.forEach(item => {
                const text = item.innerText;
                if (!text.includes('Dashboard') && !text.includes('Stock IN') && 
                    !text.includes('Stock OUT') && !text.includes('Stock Balance')) {
                    item.style.display = 'none';
                }
            });
            switchPage('page-dashboard', 'DASHBOARD');
        } else if (roleOrUser === 'manager') {
            menuItems.forEach(item => {
                const text = item.innerText;
                if (!text.includes('Dashboard') && !text.includes('Customer Ledgers') && 
                    !text.includes('RENT BOOK') && !text.includes('Stock Balance')) {
                    item.style.display = 'none';
                }
            });
            switchPage('page-customer-ledgers', 'LEDGERS');
        }
    }

    // Load data and render
    loadAllData();
    renderAll();
    loadUserTable();
    renderRentTable();
}

function applyDynamicPermissions(user) {
    const menuItems = document.querySelectorAll('#sidebar ul li');
    menuItems.forEach(item => {
        const onclickAttr = item.getAttribute('onclick') || '';
        
        if (onclickAttr.includes('page-dashboard')) {
            item.style.display = 'flex';
            return;
        }

        const isAllowed = user.perms.some(p => onclickAttr.includes(p));
        item.style.display = isAllowed ? 'flex' : 'none';
    });
    renderAll();
}

// ========================================
// 25. LOGOUT
// ========================================
function logout() {
    if (confirm('Bilal Bhai, kya aap waqai logout karna chahte hain?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('extraUser');
        location.reload();
    }
}

// ========================================
// 26. SIDEBAR TOGGLE
// ========================================
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

// ========================================
// 27. PAGE SWITCHING
// ========================================
function switchPage(pageId, title) {
    document.querySelectorAll('.erp-page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    
    const page = document.getElementById(pageId);
    if (page) {
        page.style.display = 'block';
        page.classList.add('active');
    }
    
    document.getElementById('page-title').textContent = `KRT TRADERS ERP - ${title}`;

    // Auto close sidebar on mobile
    if (window.innerWidth <= 992) {
        const sb = document.getElementById('sidebar');
        const mc = document.getElementById('main-content');
        sb.style.left = '-300px';
        mc.style.marginLeft = '0';
        sb.classList.remove('open');
    }

    // Refresh specific pages
    if (pageId === 'page-balance') renderBalanceTable();
    if (pageId === 'page-dashboard') updateDashboard();
}

// ========================================
// 28. CLOUD SYNC
// ========================================
async function fetchCloudData() {
    try {
        console.log('Cloud se latest data load ho raha hai...');

        const { data, error } = await _supabase
            .from('KRT')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            showToast('Supabase Error: ' + error.message, 'error');
            return;
        }

        if (!data || data.length === 0) {
            console.log('Supabase par koi data nahi hai.');
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
                    total: stockIn * itemPrice,
                    barcode: row.barcode || ''
                });
            } else if (stockOut > 0) {
                db.out.push({
                    id: row.id,
                    date: formattedDate,
                    cust: row.customer_name || 'General Sale',
                    phone: row.phone || '',
                    item: row.item_name || 'Unknown',
                    qty: stockOut,
                    price: itemPrice,
                    total: stockOut * itemPrice,
                    barcode: row.barcode || ''
                });
            }
        });

        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        saveAndRefresh();
        console.log('Cloud sync done and UI updated successfully!');

    } catch (err) {
        console.error('Fetch Error:', err);
        showToast('Sync error: ' + err.message, 'error');
    }
}

async function fetchCloudRentData() {
    try {
        const { data, error } = await _supabase
            .from('KRT_RENT')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('Rent Fetch Error:', error);
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
        renderRentTable();
        console.log('Rent cloud sync done ✅');

    } catch (err) {
        console.error('Rent Sync Error:', err);
    }
}

async function syncAllCloudData() {
    if (!navigator.onLine) {
        showToast('Internet nahi hai!', 'error');
        return;
    }

    showToast('Syncing from cloud...', 'info');
    await fetchCloudData();
    await fetchCloudRentData();
    showToast('Sync complete!', 'success');
}

// ========================================
// 29. BACKUP FUNCTIONS
// ========================================
function exportBackup() {
    const data = {
        db: db,
        dbRent: dbRent,
        extraUsers: extraUsers,
        billCounter: billCounter,
        exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `krt_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exported!', 'success');
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
                showToast('Backup imported successfully!', 'success');
            } catch (err) {
                showToast('Invalid backup file!', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAllData() {
    if (confirm('Bilal Bhai, kya aap poora data delete karna chahte hain? Yeh action undo nahi ho sakta!')) {
        if (confirm('Pakee? Saara data local aur cloud se delete ho jayega?')) {
            db = { in: [], out: [], ledgers: {}, opening_balances: {} };
            dbRent = [];
            localStorage.setItem('krt_erp_data', JSON.stringify(db));
            localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
            saveAndRefresh();
            renderRentTable();
            showToast('All data cleared!', 'info');
        }
    }
}

function addSampleData() {
    if (confirm('Sample data add karein? (Existing data delete nahi hoga)')) {
        const today = new Date().toISOString().split('T')[0];
        
        const sampleIn = [
            { date: today, vendor: 'Al-Noor Traders', item: 'Cement', barcode: 'CEM001', qty: 100, price: 1200, total: 120000 },
            { date: today, vendor: 'Al-Hassan Builders', item: 'Steel Bar 12mm', barcode: 'STL012', qty: 50, price: 8500, total: 425000 },
            { date: today, vendor: 'Lahore Traders', item: 'Paint White', barcode: 'PNT001', qty: 30, price: 2500, total: 75000 }
        ];
        
        const sampleOut = [
            { date: today, cust: 'Bilal Suleman', phone: '0300-1234567', item: 'Cement', barcode: 'CEM001', qty: 20, price: 1500, total: 30000 },
            { date: today, cust: 'Ahmed Traders', phone: '0300-7654321', item: 'Steel Bar 12mm', barcode: 'STL012', qty: 10, price: 9500, total: 95000 }
        ];

        sampleIn.forEach(x => {
            db.in.push({ id: Date.now() + Math.random(), ...x });
        });
        
        sampleOut.forEach(x => {
            db.out.push({ id: Date.now() + Math.random(), ...x });
        });

        saveAndRefresh();
        showToast('Sample data added successfully!', 'success');
    }
}

// ========================================
// 30. PRINT SECTION
// ========================================
function printSection() {
    window.print();
}

// ========================================
// 31. INITIALIZATION - FIXED
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 KRT ERP Initializing...');
    
    // Load data first
    loadAllData();
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    ['in-date', 'out-date', 'led-date', 'rent-date', 'bill-date'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = today;
    });

    // Check login state
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const role = localStorage.getItem('userRole');

    if (isLoggedIn === 'true') {
        if (role === 'admin') {
            showSystem('admin');
        } else if (role === 'staff') {
            showSystem('staff');
        } else if (role === 'manager') {
            showSystem('manager');
        } else {
            const userData = localStorage.getItem('extraUser');
            if (userData) {
                try {
                    showSystem(JSON.parse(userData));
                } catch (e) {
                    showSystem('admin');
                }
            } else {
                showSystem('admin');
            }
        }
    }

    // Initialize bill number
    const billNumber = document.getElementById('bill-number');
    if (billNumber) {
        billNumber.textContent = `KRT-${new Date().getFullYear()}-${String(billCounter).padStart(3, '0')}`;
    }

    // Rent name input live search
    const rentName = document.getElementById('rent-name');
    if (rentName) {
        rentName.addEventListener('input', renderRentTable);
    }

    console.log('✅ KRT ERP Initialized Successfully!');
    console.log(`📊 Total IN: ${db.in.length}, Total OUT: ${db.out.length}`);
});

// ========================================
// 32. SUPABASE TABLE SCHEMA
// ========================================
/*
CREATE TABLE KRT (
    id BIGSERIAL PRIMARY KEY,
    Date DATE,
    item_name TEXT,
    stock_in INTEGER DEFAULT 0,
    stock_out INTEGER DEFAULT 0,
    price DECIMAL(10,2) DEFAULT 0,
    vendor_name TEXT,
    customer_name TEXT,
    phone TEXT,
    barcode TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE KRT_RENT (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    shop TEXT,
    date DATE,
    month TEXT,
    debit DECIMAL(10,2) DEFAULT 0,
    credit DECIMAL(10,2) DEFAULT 0,
    method TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
*/
