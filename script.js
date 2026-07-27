/**
 * ======================================================================
 * KRT TRADERS ERP - Complete Script
 * Version: 5.0.0
 * ======================================================================
 */

// ======================================================================
// CONFIGURATION
// ======================================================================

const CONFIG = {
    SUPABASE_URL: 'https://jsxcmlpjdxgloofdrugz.supabase.co',
    SUPABASE_KEY: 'sb_publishable_Gyt7XmMb2fQxDouyHQMTYg_pB8dhGtb',
    TABLE_NAME: 'KRT',
    COMPANY: 'KRT TRADERS',
    CURRENCY: 'PKR',
    VERSION: '5.0.0'
};

// ======================================================================
// STATE
// ======================================================================

const AppState = {
    stockIn: [],
    stockOut: [],
    balance: {},
    users: [],
    ledgerEntries: [],
    rentEntries: [],
    currentUser: null,
    isSyncing: false
};

// ======================================================================
// UTILITY FUNCTIONS
// ======================================================================

const Utils = {
    today: () => new Date().toISOString().split('T')[0],

    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    },

    currency: (amount) => {
        return `PKR ${Number(amount || 0).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    },

    formatDate: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    formatDateTime: (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return d.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    calculateTotal: (qty, price) => {
        return Number(qty || 0) * Number(price || 0);
    },

    toast: (message, type = 'success') => {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    confirm: (message, title = 'Confirm') => {
        return new Promise((resolve) => {
            let modal = document.getElementById('confirm-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'confirm-modal';
                modal.className = 'modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <h3 id="confirm-title">${title}</h3>
                        <p id="confirm-message">${message}</p>
                        <div class="modal-actions">
                            <button class="btn-secondary" onclick="closeConfirm()">Cancel</button>
                            <button class="btn-danger" id="confirm-btn">Confirm</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
            } else {
                document.getElementById('confirm-title').textContent = title;
                document.getElementById('confirm-message').textContent = message;
            }

            modal.classList.add('show');
            const btn = document.getElementById('confirm-btn');
            const handler = () => {
                modal.classList.remove('show');
                btn.removeEventListener('click', handler);
                resolve(true);
            };
            btn.addEventListener('click', handler);

            // Handle cancel
            const cancelBtn = modal.querySelector('.btn-secondary');
            const cancelHandler = () => {
                modal.classList.remove('show');
                cancelBtn.removeEventListener('click', cancelHandler);
                resolve(false);
            };
            cancelBtn.addEventListener('click', cancelHandler);
        });
    },

    closeConfirm: () => {
        const modal = document.getElementById('confirm-modal');
        if (modal) modal.classList.remove('show');
    },

    log: (message, data = null) => {
        console.log(`[${new Date().toISOString()}] ${message}`, data || '');
    },

    handleError: (error, context = '') => {
        console.error(`[ERROR] ${context}:`, error);
        Utils.toast(`Error: ${error.message || 'Unknown error'}`, 'error');
        Utils.log(`ERROR - ${context}: ${error.message}`, error);
    }
};

// ======================================================================
// SUPABASE DATABASE
// ======================================================================

const Database = {
    client: null,

    init: function() {
        try {
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded');
            }
            this.client = supabase.createClient(
                CONFIG.SUPABASE_URL,
                CONFIG.SUPABASE_KEY
            );
            Utils.log('✅ Supabase connected');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Database.init');
            return false;
        }
    },

    getAll: async function() {
        try {
            const { data, error } = await this.client
                .from(CONFIG.TABLE_NAME)
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            Utils.handleError(error, 'Database.getAll');
            return [];
        }
    },

    insert: async function(record) {
        try {
            const { data, error } = await this.client
                .from(CONFIG.TABLE_NAME)
                .insert([record])
                .select();

            if (error) throw error;
            Utils.log('✅ Record inserted', data);
            return data?.[0] || null;
        } catch (error) {
            Utils.handleError(error, 'Database.insert');
            return null;
        }
    },

    delete: async function(id) {
        try {
            const { error } = await this.client
                .from(CONFIG.TABLE_NAME)
                .delete()
                .eq('id', id);

            if (error) throw error;
            Utils.log('✅ Record deleted', id);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Database.delete');
            return false;
        }
    },

    getByDateRange: async function(fromDate, toDate) {
        try {
            const { data, error } = await this.client
                .from(CONFIG.TABLE_NAME)
                .select('*')
                .gte('date', fromDate)
                .lte('date', toDate)
                .order('date', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            Utils.handleError(error, 'Database.getByDateRange');
            return [];
        }
    }
};

// ======================================================================
// STOCK BALANCE CALCULATION
// ======================================================================

function calculateStockBalance() {
    AppState.balance = {};

    AppState.stockIn.forEach(entry => {
        const item = entry.item;
        if (!AppState.balance[item]) {
            AppState.balance[item] = {
                item: item,
                totalIn: 0,
                totalOut: 0,
                available: 0,
                cost: 0,
                revenue: 0,
                profit: 0,
                barcode: entry.barcode || ''
            };
        }
        AppState.balance[item].totalIn += entry.qty;
        AppState.balance[item].cost += entry.total;
    });

    AppState.stockOut.forEach(entry => {
        const item = entry.item;
        if (!AppState.balance[item]) {
            AppState.balance[item] = {
                item: item,
                totalIn: 0,
                totalOut: 0,
                available: 0,
                cost: 0,
                revenue: 0,
                profit: 0,
                barcode: entry.barcode || ''
            };
        }
        AppState.balance[item].totalOut += entry.qty;
        AppState.balance[item].revenue += entry.total;
    });

    Object.keys(AppState.balance).forEach(key => {
        const b = AppState.balance[key];
        b.available = b.totalIn - b.totalOut;
        b.profit = b.revenue - b.cost;
    });

    return AppState.balance;
}

function getItemBalance(item) {
    if (!AppState.balance[item]) return 0;
    return AppState.balance[item].available || 0;
}

// ======================================================================
// STOCK IN
// ======================================================================

async function addIn() {
    try {
        const date = document.getElementById('in-date').value;
        const vendor = document.getElementById('in-vendor').value.trim() || 'Cash Purchase';
        const item = document.getElementById('in-item').value.trim();
        const barcode = document.getElementById('in-barcode').value.trim() || `KRT-${Date.now()}`;
        const qty = parseInt(document.getElementById('in-qty').value);
        const price = parseFloat(document.getElementById('in-price').value);

        if (!date || !item || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
            Utils.toast('Please fill all fields correctly', 'error');
            return;
        }

        const total = Utils.calculateTotal(qty, price);
        const entry = {
            id: Utils.generateId(),
            type: 'in',
            date: date,
            vendor: vendor,
            item: item,
            barcode: barcode,
            qty: qty,
            price: price,
            total: total,
            created_at: new Date().toISOString()
        };

        Utils.log('📥 Adding Stock IN', entry);

        // Save locally
        AppState.stockIn.push(entry);
        localStorage.setItem('stockIn', JSON.stringify(AppState.stockIn));

        // Recalculate balance
        calculateStockBalance();
        localStorage.setItem('stockBalance', JSON.stringify(AppState.balance));

        // Update UI
        renderTodayIn();
        renderBalanceTable();
        updateDashboardStats();
        populateItemList();

        // Clear form
        document.getElementById('in-item').value = '';
        document.getElementById('in-barcode').value = '';
        document.getElementById('in-qty').value = '';
        document.getElementById('in-price').value = '';

        Utils.toast(`✅ ${item} - ${qty} units added`, 'success');

        // Save to Supabase
        try {
            await Database.insert(entry);
        } catch (error) {
            Utils.log('⚠️ Cloud save failed, will retry', error);
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            queue.push({ operation: 'insert', data: entry });
            localStorage.setItem('syncQueue', JSON.stringify(queue));
        }

    } catch (error) {
        Utils.handleError(error, 'addIn');
    }
}

// ======================================================================
// STOCK OUT
// ======================================================================

async function addOut() {
    try {
        const date = document.getElementById('out-date').value;
        const customer = document.getElementById('out-customer').value.trim() || 'Walk-in Customer';
        const item = document.getElementById('out-item').value.trim();
        const barcode = document.getElementById('out-barcode').value.trim() || `SALE-${Date.now()}`;
        const qty = parseInt(document.getElementById('out-qty').value);
        const price = parseFloat(document.getElementById('out-price').value);

        if (!date || !item || isNaN(qty) || isNaN(price) || qty <= 0 || price <= 0) {
            Utils.toast('Please fill all fields correctly', 'error');
            return;
        }

        // Check availability
        const available = getItemBalance(item);
        if (qty > available) {
            Utils.toast(`❌ Insufficient stock! Available: ${available}`, 'error');
            return;
        }

        const total = Utils.calculateTotal(qty, price);
        const entry = {
            id: Utils.generateId(),
            type: 'out',
            date: date,
            customer: customer,
            item: item,
            barcode: barcode,
            qty: qty,
            price: price,
            total: total,
            created_at: new Date().toISOString()
        };

        Utils.log('📤 Adding Stock OUT', entry);

        // Save locally
        AppState.stockOut.push(entry);
        localStorage.setItem('stockOut', JSON.stringify(AppState.stockOut));

        // Recalculate balance
        calculateStockBalance();
        localStorage.setItem('stockBalance', JSON.stringify(AppState.balance));

        // Update UI
        renderTodayOut();
        renderBalanceTable();
        updateDashboardStats();
        populateItemList();

        // Clear form
        document.getElementById('out-customer').value = '';
        document.getElementById('out-item').value = '';
        document.getElementById('out-barcode').value = '';
        document.getElementById('out-qty').value = '';
        document.getElementById('out-price').value = '';
        document.getElementById('stock-status').innerHTML = '';

        Utils.toast(`✅ ${item} - ${qty} units sold`, 'success');

        // Save to Supabase
        try {
            await Database.insert(entry);
        } catch (error) {
            Utils.log('⚠️ Cloud save failed, will retry', error);
            const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
            queue.push({ operation: 'insert', data: entry });
            localStorage.setItem('syncQueue', JSON.stringify(queue));
        }

    } catch (error) {
        Utils.handleError(error, 'addOut');
    }
}

// ======================================================================
// DELETE ENTRY
// ======================================================================

async function deleteStockEntry(id, type) {
    const confirmed = await Utils.confirm('Delete this entry?', 'Delete Record');
    if (!confirmed) return;

    try {
        if (type === 'in') {
            AppState.stockIn = AppState.stockIn.filter(e => e.id !== id);
            localStorage.setItem('stockIn', JSON.stringify(AppState.stockIn));
            renderTodayIn();
        } else {
            AppState.stockOut = AppState.stockOut.filter(e => e.id !== id);
            localStorage.setItem('stockOut', JSON.stringify(AppState.stockOut));
            renderTodayOut();
        }

        calculateStockBalance();
        localStorage.setItem('stockBalance', JSON.stringify(AppState.balance));
        renderBalanceTable();
        updateDashboardStats();
        populateItemList();

        // Delete from Supabase
        try {
            await Database.delete(id);
        } catch (error) {
            Utils.log('⚠️ Could not delete from cloud', error);
        }

        Utils.toast('✅ Entry deleted', 'success');

    } catch (error) {
        Utils.handleError(error, 'deleteStockEntry');
    }
}

// ======================================================================
// EDIT ENTRY
// ======================================================================

async function editStockEntry(id, type) {
    try {
        let entry;
        if (type === 'in') {
            entry = AppState.stockIn.find(e => e.id === id);
        } else {
            entry = AppState.stockOut.find(e => e.id === id);
        }

        if (!entry) {
            Utils.toast('Entry not found', 'error');
            return;
        }

        const newQty = prompt(`Enter new quantity (current: ${entry.qty}):`, entry.qty);
        if (newQty === null) return;

        const newPrice = prompt(`Enter new price (current: ${entry.price}):`, entry.price);
        if (newPrice === null) return;

        const qty = parseInt(newQty);
        const price = parseFloat(newPrice);

        if (qty <= 0 || price <= 0) {
            Utils.toast('Quantity and price must be greater than 0', 'error');
            return;
        }

        entry.qty = qty;
        entry.price = price;
        entry.total = Utils.calculateTotal(qty, price);

        localStorage.setItem(type === 'in' ? 'stockIn' : 'stockOut', 
            JSON.stringify(type === 'in' ? AppState.stockIn : AppState.stockOut));

        calculateStockBalance();
        localStorage.setItem('stockBalance', JSON.stringify(AppState.balance));

        if (type === 'in') {
            renderTodayIn();
        } else {
            renderTodayOut();
        }
        renderBalanceTable();
        updateDashboardStats();

        Utils.toast('✅ Entry updated', 'success');

    } catch (error) {
        Utils.handleError(error, 'editStockEntry');
    }
}

// ======================================================================
// RENDER TODAY'S IN
// ======================================================================

function renderTodayIn() {
    const today = Utils.today();
    const entries = AppState.stockIn.filter(e => e.date === today);
    const tbody = document.getElementById('today-list-in');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888; padding:20px;">No IN entries today</td></tr>';
        return;
    }

    entries.forEach((e, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${e.item}</strong></td>
                <td>${e.vendor}</td>
                <td>${e.qty}</td>
                <td>${Utils.currency(e.price)}</td>
                <td>${Utils.currency(e.total)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editStockEntry('${e.id}','in')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteStockEntry('${e.id}','in')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ======================================================================
// RENDER TODAY'S OUT
// ======================================================================

function renderTodayOut() {
    const today = Utils.today();
    const entries = AppState.stockOut.filter(e => e.date === today);
    const tbody = document.getElementById('today-list-out');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888; padding:20px;">No OUT entries today</td></tr>';
        return;
    }

    entries.forEach((e, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${Utils.formatDate(e.date)}</td>
                <td>${e.customer}</td>
                <td><strong>${e.item}</strong></td>
                <td>${e.barcode || '-'}</td>
                <td>${e.qty}</td>
                <td>${Utils.currency(e.price)}</td>
                <td>${Utils.currency(e.total)}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editStockEntry('${e.id}','out')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteStockEntry('${e.id}','out')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ======================================================================
// RENDER BALANCE TABLE
// ======================================================================

function renderBalanceTable() {
    const tbody = document.getElementById('table-balance-body');
    tbody.innerHTML = '';

    const items = Object.keys(AppState.balance);

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888; padding:20px;">No stock available</td></tr>';
        return;
    }

    items.sort().forEach(item => {
        const b = AppState.balance[item];
        const status = b.available > 10 ? 'in-stock' : b.available > 0 ? 'low-stock' : 'out-stock';
        const statusText = b.available > 10 ? '✅ In Stock' : b.available > 0 ? '⚠️ Low' : '❌ Out';

        tbody.innerHTML += `
            <tr>
                <td>${b.barcode || '-'}</td>
                <td><strong>${item}</strong></td>
                <td>${b.totalIn}</td>
                <td>${b.totalOut}</td>
                <td style="font-weight:700; font-size:16px; color:${b.available > 0 ? '#27ae60' : '#e74c3c'}">
                    ${b.available}
                    <span class="status-badge ${status}" style="margin-left:8px;">${statusText}</span>
                </td>
                <td style="font-weight:600; color:${b.profit >= 0 ? '#27ae60' : '#e74c3c'}">
                    ${Utils.currency(b.profit)}
                </td>
            </tr>
        `;
    });
}

// ======================================================================
// UPDATE DASHBOARD
// ======================================================================

function updateDashboardStats() {
    const totalIn = AppState.stockIn.reduce((s, e) => s + e.total, 0);
    const totalOut = AppState.stockOut.reduce((s, e) => s + e.total, 0);
    const items = Object.keys(AppState.balance).length;
    const profit = totalOut - totalIn;

    document.getElementById('dash-total-in').textContent = Utils.currency(totalIn);
    document.getElementById('dash-total-out').textContent = Utils.currency(totalOut);
    document.getElementById('dash-unique-items').textContent = items;
    document.getElementById('dash-revenue').textContent = Utils.currency(totalOut);
    document.getElementById('dash-profit').textContent = Utils.currency(profit);

    // Recent Activity
    const activityDiv = document.getElementById('recent-activity');
    const allEntries = [...AppState.stockIn, ...AppState.stockOut]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

    activityDiv.innerHTML = '';

    if (allEntries.length === 0) {
        activityDiv.innerHTML = '<p style="color:#888; text-align:center; padding:20px;">No activity yet</p>';
        return;
    }

    allEntries.forEach(e => {
        const isIn = e.type === 'in';
        activityDiv.innerHTML += `
            <div style="display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #eee; font-size:13px;">
                <span>
                    <span style="color:${isIn ? '#27ae60' : '#e74c3c'}; font-weight:700;">
                        ${isIn ? '📥 IN' : '📤 OUT'}
                    </span>
                    <strong>${e.item}</strong> × ${e.qty}
                    ${isIn ? `from ${e.vendor}` : `to ${e.customer}`}
                </span>
                <span style="font-weight:600;">${Utils.currency(e.total)}</span>
            </div>
        `;
    });
}

// ======================================================================
// POPULATE ITEM LIST
// ======================================================================

function populateItemList() {
    const datalist = document.getElementById('items-list');
    if (!datalist) return;

    const items = new Set();
    AppState.stockIn.forEach(e => items.add(e.item));
    AppState.stockOut.forEach(e => items.add(e.item));
    Object.keys(AppState.balance).forEach(i => items.add(i));

    datalist.innerHTML = '';
    [...items].sort().forEach(item => {
        datalist.innerHTML += `<option value="${item}">`;
    });
}

// ======================================================================
// LIVE STOCK STATUS
// ======================================================================

function showLiveStock(itemName) {
    const statusDiv = document.getElementById('stock-status');
    if (!itemName || itemName.trim() === '') {
        statusDiv.innerHTML = '';
        return;
    }

    const available = getItemBalance(itemName);
    if (available > 0) {
        statusDiv.innerHTML = `
            <div style="background:#d4edda; color:#155724; padding:10px 15px; border-radius:6px;">
                ✅ Available Stock: <strong>${available}</strong> units
            </div>
        `;
    } else {
        statusDiv.innerHTML = `
            <div style="background:#f8d7da; color:#721c24; padding:10px 15px; border-radius:6px;">
                ❌ No stock available for "${itemName}"
            </div>
        `;
    }
}

// ======================================================================
// REPORTS
// ======================================================================

async function generateCustomReport() {
    try {
        const from = document.getElementById('rep-from-date').value;
        const to = document.getElementById('rep-to-date').value;

        if (!from || !to) {
            Utils.toast('Please select date range', 'error');
            return;
        }

        const inRecords = AppState.stockIn.filter(e => e.date >= from && e.date <= to);
        const outRecords = AppState.stockOut.filter(e => e.date >= from && e.date <= to);

        const inBody = document.getElementById('rep-in-table');
        const outBody = document.getElementById('rep-out-table');

        inBody.innerHTML = '';
        outBody.innerHTML = '';

        let inTotal = 0;
        let outTotal = 0;

        inRecords.forEach(e => {
            inBody.innerHTML += `
                <tr>
                    <td>${Utils.formatDate(e.date)}</td>
                    <td>${e.item}</td>
                    <td>${e.vendor}</td>
                    <td>${e.qty}</td>
                    <td>${Utils.currency(e.price)}</td>
                    <td>${Utils.currency(e.total)}</td>
                </tr>
            `;
            inTotal += e.total;
        });

        outRecords.forEach(e => {
            outBody.innerHTML += `
                <tr>
                    <td>${Utils.formatDate(e.date)}</td>
                    <td>${e.item}</td>
                    <td>${e.customer}</td>
                    <td>${e.qty}</td>
                    <td>${Utils.currency(e.price)}</td>
                    <td>${Utils.currency(e.total)}</td>
                </tr>
            `;
            outTotal += e.total;
        });

        if (inRecords.length > 0) {
            inBody.innerHTML += `
                <tr style="font-weight:bold; background:#27ae60; color:white;">
                    <td colspan="5" style="text-align:right;">TOTAL PURCHASES:</td>
                    <td>${Utils.currency(inTotal)}</td>
                </tr>
            `;
        }

        if (outRecords.length > 0) {
            outBody.innerHTML += `
                <tr style="font-weight:bold; background:#e74c3c; color:white;">
                    <td colspan="5" style="text-align:right;">TOTAL SALES:</td>
                    <td>${Utils.currency(outTotal)}</td>
                </tr>
            `;
        }

        document.getElementById('report-period').textContent =
            `Period: ${Utils.formatDate(from)} to ${Utils.formatDate(to)}`;

        Utils.toast(`✅ Report generated - ${inRecords.length} IN, ${outRecords.length} OUT`, 'success');

    } catch (error) {
        Utils.handleError(error, 'generateCustomReport');
    }
}

// ======================================================================
// SEARCH
// ======================================================================

function generateMasterSearch() {
    try {
        const from = document.getElementById('master-from').value;
        const to = document.getElementById('master-to').value;

        if (!from || !to) {
            Utils.toast('Please select date range', 'error');
            return;
        }

        const inRecords = AppState.stockIn.filter(e => e.date >= from && e.date <= to);
        const outRecords = AppState.stockOut.filter(e => e.date >= from && e.date <= to);

        const inTable = document.getElementById('master-in-table');
        const outTable = document.getElementById('master-out-table');

        inTable.innerHTML = '';
        outTable.innerHTML = '';

        if (inRecords.length === 0) {
            inTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No IN records found</td></tr>';
        } else {
            inRecords.forEach(e => {
                inTable.innerHTML += `
                    <tr>
                        <td>${Utils.formatDate(e.date)}</td>
                        <td><strong>${e.item}</strong></td>
                        <td>${e.vendor}</td>
                        <td>${e.qty}</td>
                        <td>${Utils.currency(e.price)}</td>
                        <td>${Utils.currency(e.total)}</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="editStockEntry('${e.id}','in')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteStockEntry('${e.id}','in')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        if (outRecords.length === 0) {
            outTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No OUT records found</td></tr>';
        } else {
            outRecords.forEach(e => {
                outTable.innerHTML += `
                    <tr>
                        <td>${Utils.formatDate(e.date)}</td>
                        <td><strong>${e.item}</strong></td>
                        <td>${e.customer}</td>
                        <td>${e.qty}</td>
                        <td>${Utils.currency(e.price)}</td>
                        <td>${Utils.currency(e.total)}</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="editStockEntry('${e.id}','out')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-delete" onclick="deleteStockEntry('${e.id}','out')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }

        Utils.toast(`✅ Found ${inRecords.length} IN and ${outRecords.length} OUT records`, 'success');

    } catch (error) {
        Utils.handleError(error, 'generateMasterSearch');
    }
}

// ======================================================================
// LEDGER SYSTEM
// ======================================================================

function saveLedgerEntry() {
    try {
        const date = document.getElementById('led-date').value;
        const customer = document.getElementById('ledger-cust-name').value.trim();
        const item = document.getElementById('led-item').value.trim();
        const qty = parseInt(document.getElementById('led-qty').value) || 0;
        const price = parseFloat(document.getElementById('led-price').value) || 0;
        const debit = parseFloat(document.getElementById('led-debit').value) || 0;
        const credit = parseFloat(document.getElementById('led-credit').value) || 0;
        const method = document.getElementById('led-method').value;

        if (!date || !customer) {
            Utils.toast('Please enter date and customer name', 'error');
            return;
        }

        if (debit === 0 && credit === 0 && qty === 0) {
            Utils.toast('Please enter quantity or amount', 'error');
            return;
        }

        const total = Utils.calculateTotal(qty, price);
        const entry = {
            id: Utils.generateId(),
            date: date,
            customer: customer,
            item: item || '-',
            qty: qty,
            price: price,
            total: total,
            debit: debit,
            credit: credit,
            method: method,
            created_at: new Date().toISOString()
        };

        AppState.ledgerEntries.push(entry);
        localStorage.setItem('ledgerEntries', JSON.stringify(AppState.ledgerEntries));

        renderLedgerTable();
        populateCustomerList();

        document.getElementById('led-date').value = '';
        document.getElementById('led-item').value = '';
        document.getElementById('led-qty').value = '0';
        document.getElementById('led-price').value = '0';
        document.getElementById('led-debit').value = '0';
        document.getElementById('led-credit').value = '0';

        Utils.toast('✅ Ledger entry saved', 'success');

    } catch (error) {
        Utils.handleError(error, 'saveLedgerEntry');
    }
}

function renderLedgerTable() {
    const customerName = document.getElementById('ledger-cust-name').value.trim();
    let entries = AppState.ledgerEntries;

    if (customerName) {
        entries = entries.filter(e =>
            e.customer && e.customer.toLowerCase().includes(customerName.toLowerCase())
        );
    }

    const tbody = document.getElementById('ledger-table-body');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#888; padding:20px;">No entries found</td></tr>';
        updateLedgerTotals([]);
        return;
    }

    entries.forEach((e, i) => {
        tbody.innerHTML += `
            <tr>
                <td>${i + 1}</td>
                <td>${Utils.formatDate(e.date)}</td>
                <td>${e.item || '-'}</td>
                <td>${e.qty || 0}</td>
                <td>${Utils.currency(e.price || 0)}</td>
                <td>${Utils.currency(e.total || 0)}</td>
                <td>${Utils.currency(e.debit || 0)}</td>
                <td>${Utils.currency(e.credit || 0)}</td>
                <td>${e.method || 'Cash'}</td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteLedgerEntry('${e.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    updateLedgerTotals(entries);
}

function updateLedgerTotals(entries) {
    let totalQty = 0;
    let totalPrice = 0;
    let totalValue = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(e => {
        totalQty += Number(e.qty || 0);
        totalPrice += Number(e.price || 0);
        totalValue += Number(e.total || 0);
        totalDebit += Number(e.debit || 0);
        totalCredit += Number(e.credit || 0);
    });

    document.getElementById('total-ledger-qty').textContent = totalQty;
    document.getElementById('total-ledger-price').textContent = Utils.currency(totalPrice);
    document.getElementById('total-ledger-value').textContent = Utils.currency(totalValue);
    document.getElementById('total-ledger-debit').textContent = Utils.currency(totalDebit);
    document.getElementById('total-ledger-credit').textContent = Utils.currency(totalCredit);

    const balance = totalDebit - totalCredit;
    document.getElementById('final-ledger-balance').textContent =
        `Balance: ${Utils.currency(balance)} (${balance >= 0 ? 'Receivable' : 'Payable'})`;
    document.getElementById('final-ledger-balance').style.background = balance >= 0 ? '#f1c40f' : '#e74c3c';
    document.getElementById('final-ledger-balance').style.color = balance >= 0 ? '#1a1a2e' : 'white';
}

async function deleteLedgerEntry(id) {
    const confirmed = await Utils.confirm('Delete this ledger entry?', 'Delete Entry');
    if (!confirmed) return;

    AppState.ledgerEntries = AppState.ledgerEntries.filter(e => e.id !== id);
    localStorage.setItem('ledgerEntries', JSON.stringify(AppState.ledgerEntries));
    renderLedgerTable();
    Utils.toast('✅ Ledger entry deleted', 'success');
}

function populateCustomerList() {
    const datalist = document.getElementById('customer-list');
    const customers = [...new Set(AppState.ledgerEntries.map(e => e.customer).filter(Boolean))];

    datalist.innerHTML = '';
    customers.forEach(c => {
        datalist.innerHTML += `<option value="${c}">`;
    });
}

function showLedger() {
    renderLedgerTable();
}

function updateOpeningBal() {
    const openingBal = parseFloat(document.getElementById('opening-bal').value) || 0;
    localStorage.setItem('ledgerOpeningBalance', openingBal);
    Utils.toast('Opening balance updated');
}

// ======================================================================
// RENT BOOK
// ======================================================================

function addRentEntry() {
    try {
        const date = document.getElementById('rent-date').value;
        const month = document.getElementById('rent-month').value.trim();
        const shopkeeper = document.getElementById('rent-name').value.trim();
        const shopNo = document.getElementById('rent-shop-no').value.trim();
        const debit = parseFloat(document.getElementById('rent-debit').value) || 0;
        const credit = parseFloat(document.getElementById('rent-credit').value) || 0;
        const method = document.getElementById('rent-method').value;

        if (!date || !shopkeeper) {
            Utils.toast('Please enter date and shopkeeper name', 'error');
            return;
        }

        if (debit === 0 && credit === 0) {
            Utils.toast('Please enter either rent amount or advance payment', 'error');
            return;
        }

        const entry = {
            id: Utils.generateId(),
            date: date,
            month: month || new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' }),
            shopkeeper: shopkeeper,
            shopNo: shopNo || '-',
            debit: debit,
            credit: credit,
            method: method,
            created_at: new Date().toISOString()
        };

        AppState.rentEntries.push(entry);
        localStorage.setItem('rentEntries', JSON.stringify(AppState.rentEntries));

        renderRentTable();

        document.getElementById('rent-date').value = '';
        document.getElementById('rent-month').value = '';
        document.getElementById('rent-debit').value = '0';
        document.getElementById('rent-credit').value = '0';

        Utils.toast('✅ Rent entry added', 'success');

    } catch (error) {
        Utils.handleError(error, 'addRentEntry');
    }
}

function renderRentTable() {
    const name = document.getElementById('rent-name').value.trim();
    const shopNo = document.getElementById('rent-shop-no').value.trim();
    let entries = AppState.rentEntries;

    if (name) {
        entries = entries.filter(e =>
            e.shopkeeper && e.shopkeeper.toLowerCase().includes(name.toLowerCase())
        );
    }
    if (shopNo) {
        entries = entries.filter(e => e.shopNo === shopNo);
    }

    const tbody = document.getElementById('rent-main-rows');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888; padding:20px;">No rent entries found</td></tr>';
        updateRentTotals([]);
        return;
    }

    let runningBalance = 0;
    entries.forEach((e, i) => {
        runningBalance += (Number(e.debit || 0) - Number(e.credit || 0));
        tbody.innerHTML += `
            <tr>
                <td>${e.shopNo || '-'}</td>
                <td>${Utils.formatDate(e.date)}</td>
                <td>${e.month || '-'}</td>
                <td>${Utils.currency(e.debit || 0)}</td>
                <td>${Utils.currency(e.credit || 0)}</td>
                <td>${e.method || 'Cash'}</td>
                <td style="font-weight:700; color:${runningBalance >= 0 ? '#27ae60' : '#e74c3c'}">
                    ${Utils.currency(runningBalance)}
                </td>
                <td>
                    <button class="btn-action btn-delete" onclick="deleteRentEntry('${e.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    updateRentTotals(entries);
}

function updateRentTotals(entries) {
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(e => {
        totalDebit += Number(e.debit || 0);
        totalCredit += Number(e.credit || 0);
    });

    document.getElementById('rent-total-debit').textContent = Utils.currency(totalDebit);
    document.getElementById('rent-total-credit').textContent = Utils.currency(totalCredit);

    const balance = totalDebit - totalCredit;
    document.getElementById('rent-final-balance').textContent = Utils.currency(balance);
    document.getElementById('rent-final-balance').style.color = balance >= 0 ? '#27ae60' : '#e74c3c';
}

async function deleteRentEntry(id) {
    const confirmed = await Utils.confirm('Delete this rent entry?', 'Delete Entry');
    if (!confirmed) return;

    AppState.rentEntries = AppState.rentEntries.filter(e => e.id !== id);
    localStorage.setItem('rentEntries', JSON.stringify(AppState.rentEntries));
    renderRentTable();
    Utils.toast('✅ Rent entry deleted', 'success');
}

// ======================================================================
// SETTINGS - USERS
// ======================================================================

function createNewUser() {
    const name = document.getElementById('new-username').value.trim();
    const userId = document.getElementById('new-userid').value.trim();
    const password = document.getElementById('new-password').value.trim();

    const permissions = [];
    document.querySelectorAll('.perm:checked').forEach(cb => {
        permissions.push(cb.value);
    });

    if (!name || !userId || !password) {
        Utils.toast('Please fill all user fields', 'error');
        return;
    }

    if (password.length < 3) {
        Utils.toast('Password must be at least 3 characters', 'error');
        return;
    }

    const users = JSON.parse(localStorage.getItem('erp_users') || '[]');

    if (users.find(u => u.id === userId)) {
        Utils.toast('User ID already exists', 'error');
        return;
    }

    users.push({
        id: userId,
        name: name,
        password: password,
        permissions: permissions,
        created_at: new Date().toISOString()
    });

    localStorage.setItem('erp_users', JSON.stringify(users));
    renderUsers();

    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';
    document.querySelectorAll('.perm:checked').forEach(cb => cb.checked = false);

    Utils.toast(`✅ User ${name} created`, 'success');
}

function renderUsers() {
    const users = JSON.parse(localStorage.getItem('erp_users') || '[]');
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888; padding:20px;">No users</td></tr>';
        return;
    }

    users.forEach(u => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${u.id}</strong></td>
                <td>${u.name}</td>
                <td>${u.permissions.includes('all') ? 'All Permissions' : u.permissions.join(', ') || 'None'}</td>
                <td>
                    ${u.id !== 'admin' ? `
                        <button class="btn-action btn-delete" onclick="deleteUser('${u.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : '<span style="color:#888;">System</span>'}
                </td>
            </tr>
        `;
    });
}

async function deleteUser(userId) {
    const confirmed = await Utils.confirm(`Delete user ${userId}?`, 'Delete User');
    if (!confirmed) return;

    let users = JSON.parse(localStorage.getItem('erp_users') || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('erp_users', JSON.stringify(users));
    renderUsers();
    Utils.toast('✅ User deleted', 'success');
}

// ======================================================================
// SYNC
// ======================================================================

async function syncAllCloudData() {
    if (!navigator.onLine) {
        Utils.toast('You are offline. Will sync when online.', 'warning');
        return;
    }

    if (AppState.isSyncing) return;
    AppState.isSyncing = true;

    Utils.toast('🔄 Syncing...', 'info');

    try {
        // Push queue
        const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        let synced = 0;

        for (const item of queue) {
            if (item.operation === 'insert') {
                const result = await Database.insert(item.data);
                if (result) synced++;
            }
        }

        if (synced > 0) {
            localStorage.setItem('syncQueue', JSON.stringify([]));
        }

        // Pull from cloud
        const cloudData = await Database.getAll();

        if (cloudData.length > 0) {
            const cloudIn = cloudData.filter(r => r.type === 'in');
            const cloudOut = cloudData.filter(r => r.type === 'out');

            const localIds = new Set();
            AppState.stockIn.forEach(e => localIds.add(e.id));
            AppState.stockOut.forEach(e => localIds.add(e.id));

            let newIn = 0;
            let newOut = 0;

            cloudIn.forEach(c => {
                if (!localIds.has(c.id)) {
                    AppState.stockIn.push(c);
                    newIn++;
                }
            });

            cloudOut.forEach(c => {
                if (!localIds.has(c.id)) {
                    AppState.stockOut.push(c);
                    newOut++;
                }
            });

            if (newIn > 0 || newOut > 0) {
                localStorage.setItem('stockIn', JSON.stringify(AppState.stockIn));
                localStorage.setItem('stockOut', JSON.stringify(AppState.stockOut));
                calculateStockBalance();
                localStorage.setItem('stockBalance', JSON.stringify(AppState.balance));

                renderTodayIn();
                renderTodayOut();
                renderBalanceTable();
                updateDashboardStats();
                populateItemList();
            }
        }

        Utils.toast('✅ Sync complete!', 'success');

    } catch (error) {
        Utils.handleError(error, 'syncAllCloudData');
        Utils.toast('Sync failed, will retry later', 'error');
    }

    AppState.isSyncing = false;
}

// ======================================================================
// PAGE NAVIGATION
// ======================================================================

function switchPage(pageId, title) {
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');

    const page = document.getElementById(pageId);
    if (page) page.style.display = 'block';

    document.getElementById('page-title').textContent = `🐘 KRT TRADERS ERP - ${title}`;

    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
    const activeLi = Array.from(document.querySelectorAll('#sidebar ul li'))
        .find(li => li.getAttribute('onclick')?.includes(pageId));
    if (activeLi) activeLi.classList.add('active');

    // Refresh data on page switch
    switch (pageId) {
        case 'page-balance':
            renderBalanceTable();
            break;
        case 'page-dashboard':
            updateDashboardStats();
            break;
        case 'page-stock-in':
            renderTodayIn();
            break;
        case 'page-stock-out':
            renderTodayOut();
            break;
        case 'page-customer-ledgers':
            renderLedgerTable();
            populateCustomerList();
            break;
        case 'page-rent-book':
            renderRentTable();
            break;
        case 'page-settings':
            renderUsers();
            break;
    }

    // Close sidebar on mobile
    document.getElementById('sidebar').classList.remove('open');
}

// ======================================================================
// AUTHENTICATION
// ======================================================================

function login() {
    const username = document.getElementById('user').value.trim();
    const password = document.getElementById('pass').value.trim();

    if (!username || !password) {
        Utils.toast('Please enter username and password', 'error');
        return;
    }

    let users = JSON.parse(localStorage.getItem('erp_users') || '[]');

    if (users.length === 0) {
        users = [{
            id: 'admin',
            name: 'Administrator',
            password: '123',
            permissions: ['all'],
            created_at: new Date().toISOString()
        }];
        localStorage.setItem('erp_users', JSON.stringify(users));
    }

    const user = users.find(u => u.id === username && u.password === password);

    if (!user) {
        Utils.toast('Invalid username or password', 'error');
        return;
    }

    AppState.currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('sidebar').style.display = 'block';

    document.getElementById('user-name').textContent = user.name;

    loadLocalData();
    syncAllCloudData();
    switchPage('page-dashboard', 'DASHBOARD');

    Utils.toast(`✅ Welcome ${user.name}!`, 'success');

    // Start clock
    startClock();
}

function logout() {
    AppState.currentUser = null;
    localStorage.removeItem('currentUser');

    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('sidebar').style.display = 'none';

    Utils.toast('Logged out');
}

// ======================================================================
// CLOCK
// ======================================================================

function startClock() {
    setInterval(() => {
        const clock = document.getElementById('live-clock');
        if (clock) {
            clock.textContent = new Date().toLocaleString('en-PK', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });
        }
    }, 1000);
}

// ======================================================================
// SIDEBAR TOGGLE
// ======================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// ======================================================================
// PRINT
// ======================================================================

function printSection() {
    window.print();
}

// ======================================================================
// LOAD LOCAL DATA
// ======================================================================

function loadLocalData() {
    try {
        const stockIn = localStorage.getItem('stockIn');
        const stockOut = localStorage.getItem('stockOut');
        const stockBalance = localStorage.getItem('stockBalance');
        const ledgerEntries = localStorage.getItem('ledgerEntries');
        const rentEntries = localStorage.getItem('rentEntries');

        if (stockIn) AppState.stockIn = JSON.parse(stockIn);
        if (stockOut) AppState.stockOut = JSON.parse(stockOut);

        if (stockBalance) {
            AppState.balance = JSON.parse(stockBalance);
        } else {
            calculateStockBalance();
        }

        if (ledgerEntries) AppState.ledgerEntries = JSON.parse(ledgerEntries);
        if (rentEntries) AppState.rentEntries = JSON.parse(rentEntries);

        renderTodayIn();
        renderTodayOut();
        renderBalanceTable();
        updateDashboardStats();
        populateItemList();
        renderLedgerTable();
        renderRentTable();
        renderUsers();
        populateCustomerList();

        Utils.log('✅ Local data loaded');

    } catch (error) {
        Utils.handleError(error, 'loadLocalData');
    }
}

// ======================================================================
// WELCOME ANIMATION
// ======================================================================

let loadingProgress = 0;

function startLoadingAnimation() {
    const bar = document.getElementById('loading-bar');
    const text = document.getElementById('welcome-text');

    const messages = [
        '🐘 KRT TRADERS ERP',
        '📦 Loading Stock Data...',
        '🔄 Syncing with Cloud...',
        '🔐 Securing System...',
        '✨ Ready!'
    ];

    const interval = setInterval(() => {
        loadingProgress += Math.random() * 15 + 5;
        if (loadingProgress > 100) loadingProgress = 100;

        bar.style.width = loadingProgress + '%';

        const index = Math.min(Math.floor(loadingProgress / 25), messages.length - 1);
        text.textContent = messages[index];

        if (loadingProgress >= 100) {
            clearInterval(interval);
            setTimeout(() => {
                document.getElementById('welcome-overlay').style.display = 'none';
                document.getElementById('login-screen').style.display = 'flex';

                // Check for saved login
                const savedUser = localStorage.getItem('currentUser');
                if (savedUser) {
                    const user = JSON.parse(savedUser);
                    AppState.currentUser = user;
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('main-content').style.display = 'block';
                    document.getElementById('sidebar').style.display = 'block';
                    document.getElementById('user-name').textContent = user.name;
                    loadLocalData();
                    syncAllCloudData();
                    switchPage('page-dashboard', 'DASHBOARD');
                    startClock();
                }
            }, 300);
        }
    }, 200);
}

// ======================================================================
// TOGGLE SIDEBAR ON MOBILE
// ======================================================================

document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggle-btn');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleSidebar);
    }

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value) input.value = today;
    });
});

// ======================================================================
// KEYBOARD SHORTCUTS
// ======================================================================

document.addEventListener('keydown', function(e) {
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
    }

    if (e.key === 'Escape') {
        Utils.closeConfirm();
        document.getElementById('sidebar')?.classList.remove('open');
    }
});

// ======================================================================
// ONLINE/OFFLINE HANDLING
// ======================================================================

window.addEventListener('online', function() {
    Utils.toast('Back online! Syncing data...', 'success');
    syncAllCloudData();
});

window.addEventListener('offline', function() {
    Utils.toast('You are offline. Changes will sync when online.', 'warning');
});

// ======================================================================
// INITIALIZE
// ======================================================================

// Initialize Supabase
Database.init();

// Start loading animation
startLoadingAnimation();

// Auto sync every 60 seconds
setInterval(() => {
    if (navigator.onLine) {
        const queue = JSON.parse(localStorage.getItem('syncQueue') || '[]');
        if (queue.length > 0) {
            syncAllCloudData();
        }
    }
}, 60000);

// ======================================================================
// EXPOSE GLOBALS
// ======================================================================

window.addIn = addIn;
window.addOut = addOut;
window.deleteStockEntry = deleteStockEntry;
window.editStockEntry = editStockEntry;
window.showLiveStock = showLiveStock;
window.generateCustomReport = generateCustomReport;
window.generateMasterSearch = generateMasterSearch;
window.syncAllCloudData = syncAllCloudData;
window.switchPage = switchPage;
window.login = login;
window.logout = logout;
window.printSection = printSection;
window.toggleSidebar = toggleSidebar;
window.saveLedgerEntry = saveLedgerEntry;
window.showLedger = showLedger;
window.updateOpeningBal = updateOpeningBal;
window.deleteLedgerEntry = deleteLedgerEntry;
window.addRentEntry = addRentEntry;
window.renderRentTable = renderRentTable;
window.deleteRentEntry = deleteRentEntry;
window.createNewUser = createNewUser;
window.deleteUser = deleteUser;
window.closeConfirm = Utils.closeConfirm;

// ======================================================================
// CONSOLE WELCOME
// ======================================================================

console.log('%c🐘 KRT TRADERS ERP v5.0', 'font-size:24px; font-weight:bold; color:#f1c40f;');
console.log('%cEnterprise Resource Planning System', 'font-size:14px; color:#3498db;');
console.log('%c✅ All systems ready!', 'font-size:12px; color:#2ecc71;');
console.log('📊 Current State:', AppState);

// ======================================================================
// END OF SCRIPT
// ======================================================================
