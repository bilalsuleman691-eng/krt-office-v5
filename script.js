/**
 * ======================================================================
 * KRT TRADERS ERP - Complete Enterprise System
 * Version: 5.0.0
 * Author: Bilal Suleman
 * Description: Full-featured ERP with Cloud Sync, Multi-User, Ledgers, Rent Book
 * ======================================================================
 */

// ======================================================================
// SECTION 1: CONFIGURATION & CONSTANTS
// ======================================================================

const CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co', // REPLACE WITH YOUR URL
    SUPABASE_KEY: 'your-anon-key', // REPLACE WITH YOUR KEY
    TABLE_NAME: 'krt',
    COMPANY_NAME: 'KRT TRADERS',
    CURRENCY: 'PKR',
    APP_VERSION: '5.0.0',
    SYNC_INTERVAL: 60000, // 1 minute
    CACHE_TTL: 300000, // 5 minutes
    RETRY_DELAY: 5000,
    MAX_RETRIES: 3
};

// ======================================================================
// SECTION 2: STATE MANAGEMENT
// ======================================================================

const AppState = {
    currentUser: null,
    users: [],
    stockIn: [],
    stockOut: [],
    balance: {},
    customers: new Set(),
    vendors: new Set(),
    items: new Set(),
    ledgerEntries: [],
    rentEntries: [],
    syncQueue: [],
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    permissions: []
};

// ======================================================================
// SECTION 3: UTILITY FUNCTIONS
// ======================================================================

const Utils = {
    // Date formatting
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },

    formatDateTime: (date) => {
        const d = new Date(date);
        return d.toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // Currency formatting
    formatCurrency: (amount) => {
        return `PKR ${Number(amount).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    },

    // Generate unique ID
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    },

    // Calculate totals
    calculateTotal: (qty, price) => {
        return Number(qty) * Number(price);
    },

    // Debounce function for performance
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Deep clone object
    deepClone: (obj) => {
        return JSON.parse(JSON.stringify(obj));
    },

    // Show toast notification
    toast: (message, type = 'success') => {
        const container = document.getElementById('toast-container');
        if (!container) {
            const newContainer = document.createElement('div');
            newContainer.id = 'toast-container';
            document.body.appendChild(newContainer);
        }
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.getElementById('toast-container').appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    },

    // Confirmation dialog
    confirm: (message, title = 'Confirm Action') => {
        return new Promise((resolve) => {
            const dialog = document.getElementById('confirm-dialog');
            if (!dialog) {
                const newDialog = document.createElement('div');
                newDialog.id = 'confirm-dialog';
                newDialog.className = 'modal';
                newDialog.innerHTML = `
                    <div class="modal-content">
                        <h3 id="confirmTitle">${title}</h3>
                        <p id="confirmMessage">${message}</p>
                        <div class="modal-actions">
                            <button id="confirmCancel" class="btn-secondary">Cancel</button>
                            <button id="confirmOk" class="btn-danger">Confirm</button>
                        </div>
                    </div>
                `;
                document.body.appendChild(newDialog);
                
                const okBtn = document.getElementById('confirmOk');
                const cancelBtn = document.getElementById('confirmCancel');
                
                const cleanup = () => {
                    newDialog.style.display = 'none';
                    okBtn.removeEventListener('click', handleOk);
                    cancelBtn.removeEventListener('click', handleCancel);
                };
                
                const handleOk = () => {
                    cleanup();
                    resolve(true);
                };
                
                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };
                
                okBtn.addEventListener('click', handleOk);
                cancelBtn.addEventListener('click', handleCancel);
                newDialog.style.display = 'flex';
            } else {
                document.getElementById('confirmTitle').textContent = title;
                document.getElementById('confirmMessage').textContent = message;
                dialog.style.display = 'flex';
                
                const okBtn = document.getElementById('confirmOk');
                const cancelBtn = document.getElementById('confirmCancel');
                
                const cleanup = () => {
                    dialog.style.display = 'none';
                    okBtn.removeEventListener('click', handleOk);
                    cancelBtn.removeEventListener('click', handleCancel);
                };
                
                const handleOk = () => {
                    cleanup();
                    resolve(true);
                };
                
                const handleCancel = () => {
                    cleanup();
                    resolve(false);
                };
                
                okBtn.addEventListener('click', handleOk);
                cancelBtn.addEventListener('click', handleCancel);
            }
        });
    },

    // Logging
    log: (message, data = null) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${message}`, data || '');
        
        // Also save to audit log
        const auditLog = JSON.parse(localStorage.getItem('audit_log') || '[]');
        auditLog.push({
            timestamp,
            message,
            user: AppState.currentUser?.name || 'system',
            data: data ? JSON.stringify(data) : null
        });
        if (auditLog.length > 1000) auditLog.shift();
        localStorage.setItem('audit_log', JSON.stringify(auditLog));
    },

    // Error handling
    handleError: (error, context = '') => {
        console.error(`[ERROR] ${context}:`, error);
        Utils.toast(`Error: ${error.message || 'Unknown error'}`, 'error');
        Utils.log(`ERROR - ${context}: ${error.message}`, error);
    }
};

// ======================================================================
// SECTION 4: SUPABASE DATABASE MODULE
// ======================================================================

const Database = {
    // Initialize Supabase client
    init: () => {
        try {
            if (typeof supabase === 'undefined') {
                throw new Error('Supabase library not loaded');
            }
            window.supabaseClient = supabase.createClient(
                CONFIG.SUPABASE_URL,
                CONFIG.SUPABASE_KEY
            );
            Utils.log('Supabase initialized successfully');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Database.init');
            return false;
        }
    },

    // Test connection
    testConnection: async () => {
        try {
            const { data, error } = await supabaseClient
                .from(CONFIG.TABLE_NAME)
                .select('id')
                .limit(1);
            
            if (error) throw error;
            Utils.log('Database connection successful');
            return true;
        } catch (error) {
            Utils.handleError(error, 'Database.testConnection');
            return false;
        }
    },

    // Get all records
    getAllRecords: async () => {
        try {
            const { data, error } = await supabaseClient
                .from(CONFIG.TABLE_NAME)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            Utils.handleError(error, 'Database.getAllRecords');
            return [];
        }
    },

    // Insert record
    insertRecord: async (record) => {
        try {
            const { data, error } = await supabaseClient
                .from(CONFIG.TABLE_NAME)
                .insert([record])
                .select();
            
            if (error) throw error;
            Utils.log('Record inserted successfully', data);
            return data[0];
        } catch (error) {
            Utils.handleError(error, 'Database.insertRecord');
            return null;
        }
    },

    // Update record
    updateRecord: async (id, updates) => {
        try {
            const { data, error } = await supabaseClient
                .from(CONFIG.TABLE_NAME)
                .update(updates)
                .eq('id', id)
                .select();
            
            if (error) throw error;
            Utils.log('Record updated successfully', data);
            return data[0];
        } catch (error) {
            Utils.handleError(error, 'Database.updateRecord');
            return null;
        }
    },

    // Delete record
    deleteRecord: async (id) => {
        try {
            const { error } = await supabaseClient
                .from(CONFIG.TABLE_NAME)
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            Utils.log('Record deleted successfully', id);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Database.deleteRecord');
            return false;
        }
    },

    // Query records with filters
    queryRecords: async (filters) => {
        try {
            let query = supabaseClient.from(CONFIG.TABLE_NAME).select('*');
            
            Object.keys(filters).forEach(key => {
                query = query.eq(key, filters[key]);
            });
            
            const { data, error } = await query.order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            Utils.handleError(error, 'Database.queryRecords');
            return [];
        }
    },

    // Get records by date range
    getRecordsByDateRange: async (fromDate, toDate) => {
        try {
            const { data, error } = await supabaseClient
                .from(CONFIG.TABLE_NAME)
                .select('*')
                .gte('date', fromDate)
                .lte('date', toDate)
                .order('date', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            Utils.handleError(error, 'Database.getRecordsByDateRange');
            return [];
        }
    }
};

// ======================================================================
// SECTION 5: CACHE MODULE
// ======================================================================

const Cache = {
    get: (key) => {
        try {
            const item = localStorage.getItem(`cache_${key}`);
            if (!item) return null;
            
            const data = JSON.parse(item);
            const now = Date.now();
            
            if (now - data.timestamp > CONFIG.CACHE_TTL) {
                localStorage.removeItem(`cache_${key}`);
                return null;
            }
            
            return data.value;
        } catch (error) {
            return null;
        }
    },

    set: (key, value) => {
        try {
            const data = {
                value,
                timestamp: Date.now()
            };
            localStorage.setItem(`cache_${key}`, JSON.stringify(data));
        } catch (error) {
            Utils.handleError(error, 'Cache.set');
        }
    },

    clear: (key) => {
        if (key) {
            localStorage.removeItem(`cache_${key}`);
        } else {
            // Clear all cache
            Object.keys(localStorage)
                .filter(k => k.startsWith('cache_'))
                .forEach(k => localStorage.removeItem(k));
        }
    },

    getAll: () => {
        const result = {};
        Object.keys(localStorage)
            .filter(k => k.startsWith('cache_'))
            .forEach(k => {
                try {
                    const data = JSON.parse(localStorage.getItem(k));
                    result[k.replace('cache_', '')] = data.value;
                } catch (e) {
                    // Skip invalid cache
                }
            });
        return result;
    }
};

// ======================================================================
// SECTION 6: SYNC SERVICE
// ======================================================================

const SyncService = {
    isSyncing: false,
    queue: [],
    
    // Add to sync queue
    addToQueue: (operation, data) => {
        const syncItem = {
            id: Utils.generateId(),
            operation,
            data,
            timestamp: Date.now(),
            retries: 0
        };
        
        this.queue.push(syncItem);
        localStorage.setItem('sync_queue', JSON.stringify(this.queue));
        this.processQueue();
    },

    // Process sync queue
    processQueue: async () => {
        if (this.isSyncing || this.queue.length === 0) return;
        if (!navigator.onLine) {
            Utils.toast('Offline - Sync will resume when online', 'warning');
            return;
        }

        this.isSyncing = true;
        document.getElementById('syncIcon').className = 'fas fa-sync fa-spin';
        document.getElementById('syncStatus').textContent = 'Syncing...';

        try {
            for (let i = 0; i < this.queue.length; i++) {
                const item = this.queue[i];
                let success = false;

                try {
                    switch (item.operation) {
                        case 'insert':
                            const result = await Database.insertRecord(item.data);
                            if (result) success = true;
                            break;
                        case 'update':
                            success = await Database.updateRecord(item.data.id, item.data.updates);
                            break;
                        case 'delete':
                            success = await Database.deleteRecord(item.data.id);
                            break;
                        default:
                            Utils.log('Unknown sync operation', item.operation);
                    }
                } catch (error) {
                    Utils.handleError(error, 'SyncService.processQueue');
                    item.retries++;
                    if (item.retries < CONFIG.MAX_RETRIES) {
                        // Keep in queue for retry
                        continue;
                    } else {
                        // Remove after max retries
                        Utils.log('Sync item failed after max retries', item);
                    }
                }

                if (success) {
                    this.queue.splice(i, 1);
                    i--;
                }
            }

            localStorage.setItem('sync_queue', JSON.stringify(this.queue));
            AppState.lastSync = new Date();
            Utils.toast('Sync completed successfully', 'success');
            updateSyncStatus('Synced');

        } catch (error) {
            Utils.handleError(error, 'SyncService.processQueue');
            updateSyncStatus('Sync Failed');
        } finally {
            this.isSyncing = false;
            document.getElementById('syncIcon').className = 'fas fa-cloud';
        }
    },

    // Force sync
    forceSync: async () => {
        await this.processQueue();
        await refreshAllData();
    }
};

// ======================================================================
// SECTION 7: AUTHENTICATION MODULE
// ======================================================================

const Auth = {
    // Login function
    login: (username, password) => {
        try {
            // Get users from localStorage
            let users = JSON.parse(localStorage.getItem('erp_users') || '[]');
            
            // Default admin if no users
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
                return false;
            }

            AppState.currentUser = user;
            AppState.permissions = user.permissions;
            localStorage.setItem('current_user', JSON.stringify(user));
            
            Utils.log('User logged in', user);
            Utils.toast(`Welcome ${user.name}!`, 'success');
            
            return true;
        } catch (error) {
            Utils.handleError(error, 'Auth.login');
            return false;
        }
    },

    // Logout function
    logout: () => {
        AppState.currentUser = null;
        localStorage.removeItem('current_user');
        Utils.log('User logged out');
        Utils.toast('Logged out successfully');
        
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('sidebar').style.display = 'none';
        document.getElementById('toggle-btn')?.remove();
    },

    // Check if user is logged in
    isLoggedIn: () => {
        if (AppState.currentUser) return true;
        
        const savedUser = localStorage.getItem('current_user');
        if (savedUser) {
            AppState.currentUser = JSON.parse(savedUser);
            AppState.permissions = AppState.currentUser.permissions || [];
            return true;
        }
        return false;
    },

    // Check permission
    hasPermission: (page) => {
        if (!AppState.currentUser) return false;
        if (AppState.permissions.includes('all')) return true;
        return AppState.permissions.includes(page);
    },

    // Create new user
    createUser: (name, userId, password, permissions) => {
        try {
            let users = JSON.parse(localStorage.getItem('erp_users') || '[]');
            
            if (users.find(u => u.id === userId)) {
                Utils.toast('User ID already exists', 'error');
                return false;
            }

            const newUser = {
                id: userId,
                name: name,
                password: password,
                permissions: permissions,
                created_at: new Date().toISOString()
            };

            users.push(newUser);
            localStorage.setItem('erp_users', JSON.stringify(users));
            Utils.log('User created', newUser);
            Utils.toast(`User ${name} created successfully!`, 'success');
            
            renderUsers();
            return true;
        } catch (error) {
            Utils.handleError(error, 'Auth.createUser');
            return false;
        }
    },

    // Delete user
    deleteUser: async (userId) => {
        if (userId === 'admin') {
            Utils.toast('Cannot delete admin user', 'error');
            return;
        }

        const confirmed = await Utils.confirm(`Delete user ${userId}?`, 'Delete User');
        if (!confirmed) return;

        try {
            let users = JSON.parse(localStorage.getItem('erp_users') || '[]');
            users = users.filter(u => u.id !== userId);
            localStorage.setItem('erp_users', JSON.stringify(users));
            Utils.log('User deleted', userId);
            Utils.toast('User deleted successfully');
            renderUsers();
        } catch (error) {
            Utils.handleError(error, 'Auth.deleteUser');
        }
    }
};

// ======================================================================
// SECTION 8: STOCK MANAGEMENT MODULE
// ======================================================================

const Stock = {
    // Add Stock In (Purchase)
    addIn: async () => {
        try {
            const date = document.getElementById('in-date').value;
            const vendor = document.getElementById('in-vendor').value.trim();
            const item = document.getElementById('in-item').value.trim();
            const barcode = document.getElementById('in-barcode').value.trim();
            const qty = parseInt(document.getElementById('in-qty').value);
            const price = parseFloat(document.getElementById('in-price').value);

            // Validation
            if (!date || !item || !qty || !price) {
                Utils.toast('Please fill all required fields (Date, Item, Qty, Price)', 'error');
                return;
            }

            if (qty <= 0 || price <= 0) {
                Utils.toast('Quantity and price must be greater than 0', 'error');
                return;
            }

            const total = Utils.calculateTotal(qty, price);
            const entry = {
                id: Utils.generateId(),
                type: 'in',
                date: date,
                vendor: vendor || 'Cash Purchase',
                item: item,
                barcode: barcode || `KRT-${Date.now()}`,
                qty: qty,
                price: price,
                total: total,
                created_at: new Date().toISOString(),
                synced: false
            };

            // Add to local
            AppState.stockIn.push(entry);
            updateStockBalance(entry);
            
            // Add to sync queue
            SyncService.addToQueue('insert', {
                ...entry,
                table: CONFIG.TABLE_NAME
            });

            // Cache update
            Cache.set('stockIn', AppState.stockIn);

            // Update UI
            renderTodayIn();
            updateDashboardStats();
            renderBalanceTable();
            populateItemList();

            // Clear form
            document.getElementById('in-item').value = '';
            document.getElementById('in-barcode').value = '';
            document.getElementById('in-qty').value = '';
            document.getElementById('in-price').value = '';

            Utils.toast(`Stock IN: ${item} - ${qty} units added`, 'success');
            Utils.log('Stock IN added', entry);

        } catch (error) {
            Utils.handleError(error, 'Stock.addIn');
        }
    },

    // Add Stock Out (Sale)
    addOut: async () => {
        try {
            const date = document.getElementById('out-date').value;
            const customer = document.getElementById('out-customer').value.trim();
            const item = document.getElementById('out-item').value.trim();
            const barcode = document.getElementById('out-barcode').value.trim();
            const qty = parseInt(document.getElementById('out-qty').value);
            const price = parseFloat(document.getElementById('out-price').value);

            // Validation
            if (!date || !item || !qty || !price) {
                Utils.toast('Please fill all required fields (Date, Item, Qty, Price)', 'error');
                return;
            }

            if (qty <= 0 || price <= 0) {
                Utils.toast('Quantity and price must be greater than 0', 'error');
                return;
            }

            // Check available stock
            const available = getItemBalance(item);
            if (qty > available) {
                Utils.toast(`Insufficient stock! Available: ${available}`, 'error');
                return;
            }

            const total = Utils.calculateTotal(qty, price);
            const entry = {
                id: Utils.generateId(),
                type: 'out',
                date: date,
                customer: customer || 'Walk-in Customer',
                item: item,
                barcode: barcode || `SALE-${Date.now()}`,
                qty: qty,
                price: price,
                total: total,
                created_at: new Date().toISOString(),
                synced: false
            };

            // Add to local
            AppState.stockOut.push(entry);
            updateStockBalance(entry);
            
            // Add to sync queue
            SyncService.addToQueue('insert', {
                ...entry,
                table: CONFIG.TABLE_NAME
            });

            // Cache update
            Cache.set('stockOut', AppState.stockOut);

            // Update UI
            renderTodayOut();
            updateDashboardStats();
            renderBalanceTable();
            populateItemList();

            // Clear form
            document.getElementById('out-customer').value = '';
            document.getElementById('out-item').value = '';
            document.getElementById('out-barcode').value = '';
            document.getElementById('out-qty').value = '';
            document.getElementById('out-price').value = '';
            document.getElementById('stock-status').innerHTML = '';

            Utils.toast(`Stock OUT: ${item} - ${qty} units sold`, 'success');
            Utils.log('Stock OUT added', entry);

        } catch (error) {
            Utils.handleError(error, 'Stock.addOut');
        }
    },

    // Show live stock status
    showLiveStock: (itemName) => {
        if (!itemName) {
            document.getElementById('stock-status').innerHTML = '';
            return;
        }

        const available = getItemBalance(itemName);
        const status = document.getElementById('stock-status');
        
        if (available > 0) {
            status.innerHTML = `✅ Available Stock: <strong>${available}</strong> units`;
            status.style.color = '#27ae60';
        } else {
            status.innerHTML = `❌ No stock available for "${itemName}"`;
            status.style.color = '#e74c3c';
        }
    },

    // Delete stock entry
    deleteStockEntry: async (id, type) => {
        const confirmed = await Utils.confirm('Delete this entry?', 'Delete Record');
        if (!confirmed) return;

        try {
            // Add to sync queue for deletion
            SyncService.addToQueue('delete', { id });

            if (type === 'in') {
                AppState.stockIn = AppState.stockIn.filter(e => e.id !== id);
                Cache.set('stockIn', AppState.stockIn);
                renderTodayIn();
            } else {
                AppState.stockOut = AppState.stockOut.filter(e => e.id !== id);
                Cache.set('stockOut', AppState.stockOut);
                renderTodayOut();
            }

            // Recalculate balance
            AppState.balance = {};
            AppState.stockIn.forEach(e => updateStockBalance(e));
            AppState.stockOut.forEach(e => updateStockBalance(e));
            
            renderBalanceTable();
            updateDashboardStats();
            Utils.toast('Entry deleted successfully');
            Utils.log('Stock entry deleted', { id, type });

        } catch (error) {
            Utils.handleError(error, 'Stock.deleteStockEntry');
        }
    },

    // Edit stock entry
    editStockEntry: async (id, type) => {
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

            // Prompt for new values
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

            const updates = {
                qty: qty,
                price: price,
                total: Utils.calculateTotal(qty, price)
            };

            // Update local
            if (type === 'in') {
                Object.assign(entry, updates);
                Cache.set('stockIn', AppState.stockIn);
                renderTodayIn();
            } else {
                Object.assign(entry, updates);
                Cache.set('stockOut', AppState.stockOut);
                renderTodayOut();
            }

            // Recalculate balance
            AppState.balance = {};
            AppState.stockIn.forEach(e => updateStockBalance(e));
            AppState.stockOut.forEach(e => updateStockBalance(e));
            
            renderBalanceTable();
            updateDashboardStats();
            
            // Add to sync queue
            SyncService.addToQueue('update', {
                id: id,
                updates: updates
            });

            Utils.toast('Entry updated successfully');
            Utils.log('Stock entry updated', { id, updates });

        } catch (error) {
            Utils.handleError(error, 'Stock.editStockEntry');
        }
    }
};

// ======================================================================
// SECTION 9: LEDGER MODULE
// ======================================================================

const Ledger = {
    entries: [],
    
    loadEntries: () => {
        try {
            this.entries = JSON.parse(localStorage.getItem('ledger_entries') || '[]');
            return this.entries;
        } catch (error) {
            Utils.handleError(error, 'Ledger.loadEntries');
            return [];
        }
    },

    saveEntries: () => {
        try {
            localStorage.setItem('ledger_entries', JSON.stringify(this.entries));
        } catch (error) {
            Utils.handleError(error, 'Ledger.saveEntries');
        }
    },

    addEntry: (entry) => {
        try {
            entry.id = Utils.generateId();
            entry.created_at = new Date().toISOString();
            this.entries.push(entry);
            this.saveEntries();
            Utils.log('Ledger entry added', entry);
            return entry;
        } catch (error) {
            Utils.handleError(error, 'Ledger.addEntry');
            return null;
        }
    },

    deleteEntry: async (id) => {
        const confirmed = await Utils.confirm('Delete this ledger entry?', 'Delete Entry');
        if (!confirmed) return;

        try {
            this.entries = this.entries.filter(e => e.id !== id);
            this.saveEntries();
            Utils.toast('Ledger entry deleted');
            Utils.log('Ledger entry deleted', id);
            return true;
        } catch (error) {
            Utils.handleError(error, 'Ledger.deleteEntry');
            return false;
        }
    },

    getCustomerEntries: (customerName) => {
        return this.entries.filter(e => 
            e.customer && e.customer.toLowerCase().includes(customerName.toLowerCase())
        );
    },

    calculateBalance: (entries) => {
        let totalDebit = 0;
        let totalCredit = 0;
        
        entries.forEach(e => {
            totalDebit += Number(e.debit || 0);
            totalCredit += Number(e.credit || 0);
        });
        
        return {
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit
        };
    }
};

// ======================================================================
// SECTION 10: RENT BOOK MODULE
// ======================================================================

const RentBook = {
    entries: [],
    
    loadEntries: () => {
        try {
            this.entries = JSON.parse(localStorage.getItem('rent_entries') || '[]');
            return this.entries;
        } catch (error) {
            Utils.handleError(error, 'RentBook.loadEntries');
            return [];
        }
    },

    saveEntries: () => {
        try {
            localStorage.setItem('rent_entries', JSON.stringify(this.entries));
        } catch (error) {
            Utils.handleError(error, 'RentBook.saveEntries');
        }
    },

    addEntry: (entry) => {
        try {
            entry.id = Utils.generateId();
            entry.created_at = new Date().toISOString();
            this.entries.push(entry);
            this.saveEntries();
            Utils.log('Rent entry added', entry);
            return entry;
        } catch (error) {
            Utils.handleError(error, 'RentBook.addEntry');
            return null;
        }
    },

    deleteEntry: async (id) => {
        const confirmed = await Utils.confirm('Delete this rent entry?', 'Delete Entry');
        if (!confirmed) return;

        try {
            this.entries = this.entries.filter(e => e.id !== id);
            this.saveEntries();
            Utils.toast('Rent entry deleted');
            Utils.log('Rent entry deleted', id);
            return true;
        } catch (error) {
            Utils.handleError(error, 'RentBook.deleteEntry');
            return false;
        }
    },

    getShopkeeperEntries: (name) => {
        return this.entries.filter(e => 
            e.shopkeeper && e.shopkeeper.toLowerCase().includes(name.toLowerCase())
        );
    },

    calculateBalance: (entries) => {
        let totalDebit = 0;
        let totalCredit = 0;
        
        entries.forEach(e => {
            totalDebit += Number(e.debit || 0);
            totalCredit += Number(e.credit || 0);
        });
        
        return {
            totalDebit,
            totalCredit,
            balance: totalDebit - totalCredit
        };
    }
};

// ======================================================================
// SECTION 11: REPORTING MODULE
// ======================================================================

const Reports = {
    // Generate custom report
    generateReport: async () => {
        try {
            const fromDate = document.getElementById('rep-from-date').value;
            const toDate = document.getElementById('rep-to-date').value;

            if (!fromDate || !toDate) {
                Utils.toast('Please select date range', 'error');
                return;
            }

            // Get records from cache or database
            let inRecords = AppState.stockIn.filter(e => 
                e.date >= fromDate && e.date <= toDate
            );
            
            let outRecords = AppState.stockOut.filter(e => 
                e.date >= fromDate && e.date <= toDate
            );

            // If cache is empty, try database
            if (inRecords.length === 0 && outRecords.length === 0) {
                const dbRecords = await Database.getRecordsByDateRange(fromDate, toDate);
                inRecords = dbRecords.filter(r => r.type === 'in');
                outRecords = dbRecords.filter(r => r.type === 'out');
            }

            // Render report
            const inTable = document.getElementById('rep-in-table');
            const outTable = document.getElementById('rep-out-table');
            
            inTable.innerHTML = '';
            outTable.innerHTML = '';

            let inTotal = 0;
            let outTotal = 0;

            inRecords.forEach(e => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${Utils.formatDate(e.date)}</td>
                    <td>${e.item}</td>
                    <td>${e.vendor || '-'}</td>
                    <td>${e.qty}</td>
                    <td>${Utils.formatCurrency(e.price)}</td>
                    <td>${Utils.formatCurrency(e.total)}</td>
                `;
                inTable.appendChild(row);
                inTotal += e.total;
            });

            outRecords.forEach(e => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${Utils.formatDate(e.date)}</td>
                    <td>${e.item}</td>
                    <td>${e.customer || '-'}</td>
                    <td>${e.qty}</td>
                    <td>${Utils.formatCurrency(e.price)}</td>
                    <td>${Utils.formatCurrency(e.total)}</td>
                `;
                outTable.appendChild(row);
                outTotal += e.total;
            });

            // Add totals row
            if (inRecords.length > 0) {
                const totalRow = document.createElement('tr');
                totalRow.style.fontWeight = 'bold';
                totalRow.style.background = '#27ae60';
                totalRow.style.color = 'white';
                totalRow.innerHTML = `
                    <td colspan="5" style="text-align:right;">TOTAL PURCHASES:</td>
                    <td>${Utils.formatCurrency(inTotal)}</td>
                `;
                inTable.appendChild(totalRow);
            }

            if (outRecords.length > 0) {
                const totalRow = document.createElement('tr');
                totalRow.style.fontWeight = 'bold';
                totalRow.style.background = '#e74c3c';
                totalRow.style.color = 'white';
                totalRow.innerHTML = `
                    <td colspan="5" style="text-align:right;">TOTAL SALES:</td>
                    <td>${Utils.formatCurrency(outTotal)}</td>
                `;
                outTable.appendChild(totalRow);
            }

            document.getElementById('report-period').textContent = 
                `Period: ${Utils.formatDate(fromDate)} to ${Utils.formatDate(toDate)}`;

            Utils.toast('Report generated successfully');
            Utils.log('Report generated', { fromDate, toDate, inRecords: inRecords.length, outRecords: outRecords.length });

        } catch (error) {
            Utils.handleError(error, 'Reports.generateReport');
        }
    },

    // Export to Excel
    exportToExcel: () => {
        try {
            const table = document.querySelector('#print-area table');
            if (!table) {
                Utils.toast('No data to export', 'error');
                return;
            }

            let csv = '';
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cols = row.querySelectorAll('td, th');
                const rowData = [];
                cols.forEach(col => {
                    rowData.push(col.textContent.trim());
                });
                csv += rowData.join(',') + '\n';
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            Utils.toast('Report exported to CSV');
            Utils.log('Report exported to Excel');

        } catch (error) {
            Utils.handleError(error, 'Reports.exportToExcel');
        }
    }
};

// ======================================================================
// SECTION 12: SEARCH MODULE
// ======================================================================

const Search = {
    // Master search
    masterSearch: () => {
        try {
            const fromDate = document.getElementById('master-from').value;
            const toDate = document.getElementById('master-to').value;

            if (!fromDate || !toDate) {
                Utils.toast('Please select date range', 'error');
                return;
            }

            // Search in local data
            let inRecords = AppState.stockIn.filter(e => 
                e.date >= fromDate && e.date <= toDate
            );
            
            let outRecords = AppState.stockOut.filter(e => 
                e.date >= fromDate && e.date <= toDate
            );

            // Search in database if local data is insufficient
            if (inRecords.length === 0 && outRecords.length === 0) {
                Utils.toast('Searching in cloud...', 'info');
                // Trigger sync and retry
                SyncService.forceSync();
                setTimeout(() => {
                    inRecords = AppState.stockIn.filter(e => 
                        e.date >= fromDate && e.date <= toDate
                    );
                    outRecords = AppState.stockOut.filter(e => 
                        e.date >= fromDate && e.date <= toDate
                    );
                    renderSearchResults(inRecords, outRecords);
                }, 2000);
            } else {
                renderSearchResults(inRecords, outRecords);
            }

        } catch (error) {
            Utils.handleError(error, 'Search.masterSearch');
        }
    },

    // Global search
    globalSearch: (query) => {
        if (!query || query.length < 2) {
            document.getElementById('page-dashboard')?.style.setProperty('display', '');
            return;
        }

        try {
            const results = [];
            
            // Search in stock IN
            AppState.stockIn.forEach(e => {
                if (e.item.toLowerCase().includes(query.toLowerCase()) ||
                    (e.vendor && e.vendor.toLowerCase().includes(query.toLowerCase())) ||
                    (e.barcode && e.barcode.includes(query))) {
                    results.push({ ...e, type: 'Stock IN' });
                }
            });

            // Search in stock OUT
            AppState.stockOut.forEach(e => {
                if (e.item.toLowerCase().includes(query.toLowerCase()) ||
                    (e.customer && e.customer.toLowerCase().includes(query.toLowerCase())) ||
                    (e.barcode && e.barcode.includes(query))) {
                    results.push({ ...e, type: 'Stock OUT' });
                }
            });

            // Search in ledger
            const ledgerEntries = Ledger.loadEntries();
            ledgerEntries.forEach(e => {
                if (e.customer && e.customer.toLowerCase().includes(query.toLowerCase())) {
                    results.push({ ...e, type: 'Ledger' });
                }
            });

            // Display results
            displaySearchResults(results);

        } catch (error) {
            Utils.handleError(error, 'Search.globalSearch');
        }
    }
};

// ======================================================================
// SECTION 13: UI RENDER FUNCTIONS
// ======================================================================

// Render today's stock IN
function renderTodayIn() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = AppState.stockIn.filter(e => e.date === today);
    const tbody = document.getElementById('today-list-in');
    tbody.innerHTML = '';

    if (todayEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No entries today</td></tr>';
        return;
    }

    todayEntries.forEach((e, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${e.item}</td>
            <td>${e.vendor || '-'}</td>
            <td>${e.qty}</td>
            <td>${Utils.formatCurrency(e.price)}</td>
            <td>${Utils.formatCurrency(e.total)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="Stock.editStockEntry('${e.id}','in')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="Stock.deleteStockEntry('${e.id}','in')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render today's stock OUT
function renderTodayOut() {
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = AppState.stockOut.filter(e => e.date === today);
    const tbody = document.getElementById('today-list-out');
    tbody.innerHTML = '';

    if (todayEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color:#888;">No entries today</td></tr>';
        return;
    }

    todayEntries.forEach((e, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${Utils.formatDate(e.date)}</td>
            <td>${e.customer || '-'}</td>
            <td>${e.item}</td>
            <td>${e.barcode || '-'}</td>
            <td>${e.qty}</td>
            <td>${Utils.formatCurrency(e.price)}</td>
            <td>${Utils.formatCurrency(e.total)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="Stock.editStockEntry('${e.id}','out')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="Stock.deleteStockEntry('${e.id}','out')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render balance table
function renderBalanceTable() {
    const tbody = document.getElementById('table-balance-body');
    tbody.innerHTML = '';

    const items = Object.keys(AppState.balance);
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No stock available</td></tr>';
        return;
    }

    items.forEach(item => {
        const data = AppState.balance[item];
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.barcode || '-'}</td>
            <td><strong>${item}</strong></td>
            <td>${data.totalIn}</td>
            <td>${data.totalOut}</td>
            <td style="font-weight:700; color:${data.available > 0 ? '#27ae60' : '#e74c3c'}">${data.available}</td>
            <td>${Utils.formatCurrency(data.profit || 0)}</td>
        `;
        tbody.appendChild(row);
    });
}

// Render ledger table
function renderLedgerTable() {
    const customerName = document.getElementById('ledger-cust-name').value.trim();
    let entries = Ledger.loadEntries();
    
    if (customerName) {
        entries = entries.filter(e => 
            e.customer && e.customer.toLowerCase().includes(customerName.toLowerCase())
        );
    }

    const tbody = document.getElementById('ledger-table-body');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; color:#888;">No entries found</td></tr>';
        updateLedgerTotals([]);
        return;
    }

    entries.forEach((e, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${i + 1}</td>
            <td>${Utils.formatDate(e.date)}</td>
            <td>${e.item || '-'}</td>
            <td>${e.qty || 0}</td>
            <td>${Utils.formatCurrency(e.price || 0)}</td>
            <td>${Utils.formatCurrency(e.total || 0)}</td>
            <td>${Utils.formatCurrency(e.debit || 0)}</td>
            <td>${Utils.formatCurrency(e.credit || 0)}</td>
            <td>${e.method || 'Cash'}</td>
            <td>
                <button class="btn-action btn-delete" onclick="Ledger.deleteEntry('${e.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateLedgerTotals(entries);
}

// Update ledger totals
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
    document.getElementById('total-ledger-price').textContent = Utils.formatCurrency(totalPrice);
    document.getElementById('total-ledger-value').textContent = Utils.formatCurrency(totalValue);
    document.getElementById('total-ledger-debit').textContent = Utils.formatCurrency(totalDebit);
    document.getElementById('total-ledger-credit').textContent = Utils.formatCurrency(totalCredit);
    
    const balance = totalDebit - totalCredit;
    document.getElementById('final-ledger-balance').textContent = 
        `Balance: ${Utils.formatCurrency(balance)} (${balance >= 0 ? 'Receivable' : 'Payable'})`;
    document.getElementById('final-ledger-balance').style.background = balance >= 0 ? '#f1c40f' : '#e74c3c';
    document.getElementById('final-ledger-balance').style.color = balance >= 0 ? '#1a1a2e' : 'white';
}

// Render rent book table
function renderRentTable() {
    const name = document.getElementById('rent-name').value.trim();
    const shopNo = document.getElementById('rent-shop-no').value.trim();
    let entries = RentBook.loadEntries();
    
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
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:#888;">No rent entries found</td></tr>';
        updateRentTotals([]);
        return;
    }

    let runningBalance = 0;
    entries.forEach((e, i) => {
        runningBalance += (Number(e.debit || 0) - Number(e.credit || 0));
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${e.shopNo || '-'}</td>
            <td>${Utils.formatDate(e.date)}</td>
            <td>${e.month || '-'}</td>
            <td>${Utils.formatCurrency(e.debit || 0)}</td>
            <td>${Utils.formatCurrency(e.credit || 0)}</td>
            <td>${e.method || 'Cash'}</td>
            <td style="font-weight:700; color:${runningBalance >= 0 ? '#27ae60' : '#e74c3c'}">
                ${Utils.formatCurrency(runningBalance)}
            </td>
            <td>
                <button class="btn-action btn-delete" onclick="RentBook.deleteEntry('${e.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });

    updateRentTotals(entries);
}

// Update rent totals
function updateRentTotals(entries) {
    let totalDebit = 0;
    let totalCredit = 0;

    entries.forEach(e => {
        totalDebit += Number(e.debit || 0);
        totalCredit += Number(e.credit || 0);
    });

    document.getElementById('rent-total-debit').textContent = Utils.formatCurrency(totalDebit);
    document.getElementById('rent-total-credit').textContent = Utils.formatCurrency(totalCredit);
    
    const balance = totalDebit - totalCredit;
    document.getElementById('rent-final-balance').textContent = Utils.formatCurrency(balance);
    document.getElementById('rent-final-balance').style.color = balance >= 0 ? '#27ae60' : '#e74c3c';
}

// Render users table
function renderUsers() {
    const users = JSON.parse(localStorage.getItem('erp_users') || '[]');
    const tbody = document.getElementById('user-table-body');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">No users</td></tr>';
        return;
    }

    users.forEach(u => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${u.id}</strong></td>
            <td>${u.name}</td>
            <td>${u.permissions.includes('all') ? 'All Permissions' : u.permissions.join(', ') || 'None'}</td>
            <td>
                ${u.id !== 'admin' ? `
                    <button class="btn-action btn-delete" onclick="Auth.deleteUser('${u.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : '<span style="color:#888;">System</span>'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Populate item list for autocomplete
function populateItemList() {
    const datalist = document.getElementById('items-list');
    const items = Object.keys(AppState.balance);
    
    // Add items from all records
    AppState.stockIn.forEach(e => items.push(e.item));
    AppState.stockOut.forEach(e => items.push(e.item));
    
    const uniqueItems = [...new Set(items)];
    datalist.innerHTML = '';
    uniqueItems.forEach(item => {
        const option = document.createElement('option');
        option.value = item;
        datalist.appendChild(option);
    });
}

// Update dashboard stats
function updateDashboardStats() {
    const totalIn = AppState.stockIn.reduce((sum, e) => sum + e.total, 0);
    const totalOut = AppState.stockOut.reduce((sum, e) => sum + e.total, 0);
    const uniqueItems = Object.keys(AppState.balance).length;
    const profit = totalOut - totalIn;

    document.getElementById('dash-total-in').textContent = Utils.formatCurrency(totalIn);
    document.getElementById('dash-total-out').textContent = Utils.formatCurrency(totalOut);
    document.getElementById('dash-unique-items').textContent = uniqueItems;
    document.getElementById('dash-revenue').textContent = Utils.formatCurrency(totalOut);
    document.getElementById('dash-profit').textContent = Utils.formatCurrency(profit);

    // Update recent activity
    const activityDiv = document.getElementById('recent-activity');
    const allEntries = [...AppState.stockIn, ...AppState.stockOut]
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10);

    if (allEntries.length === 0) {
        activityDiv.innerHTML = '<p style="color:#888; text-align:center;">No recent activity</p>';
        return;
    }

    activityDiv.innerHTML = '';
    allEntries.forEach(e => {
        const div = document.createElement('div');
        div.style.cssText = `
            display: flex; justify-content: space-between; 
            padding: 8px 12px; border-bottom: 1px solid #eee;
            font-size: 13px;
        `;
        div.innerHTML = `
            <span>
                <strong>${e.type === 'in' ? '📥 IN' : '📤 OUT'}</strong>
                ${e.item} × ${e.qty}
                ${e.type === 'in' ? `from ${e.vendor || 'vendor'}` : `to ${e.customer || 'customer'}`}
            </span>
            <span>${Utils.formatCurrency(e.total)}</span>
        `;
        activityDiv.appendChild(div);
    });
}

// Update sync status
function updateSyncStatus(status) {
    document.getElementById('syncStatus').textContent = status;
    const icon = document.getElementById('syncIcon');
    if (status === 'Syncing...') {
        icon.className = 'fas fa-sync fa-spin';
    } else if (status === 'Synced') {
        icon.className = 'fas fa-cloud';
        icon.style.color = '#27ae60';
    } else if (status === 'Sync Failed') {
        icon.className = 'fas fa-exclamation-triangle';
        icon.style.color = '#e74c3c';
    } else {
        icon.className = 'fas fa-cloud';
        icon.style.color = '';
    }
}

// Display search results
function displaySearchResults(results) {
    // Implementation depends on UI design
    // For now, show in a modal or dedicated section
    Utils.toast(`Found ${results.length} results`, 'info');
    console.log('Search results:', results);
}

// Render search results in master search
function renderSearchResults(inRecords, outRecords) {
    const inTable = document.getElementById('master-in-table');
    const outTable = document.getElementById('master-out-table');
    
    inTable.innerHTML = '';
    outTable.innerHTML = '';

    if (inRecords.length === 0 && outRecords.length === 0) {
        Utils.toast('No records found in this date range', 'info');
        inTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No records found</td></tr>';
        outTable.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#888;">No records found</td></tr>';
        return;
    }

    inRecords.forEach(e => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${Utils.formatDate(e.date)}</td>
            <td>${e.item}</td>
            <td>${e.vendor || '-'}</td>
            <td>${e.qty}</td>
            <td>${Utils.formatCurrency(e.price)}</td>
            <td>${Utils.formatCurrency(e.total)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="Stock.editStockEntry('${e.id}','in')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="Stock.deleteStockEntry('${e.id}','in')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        inTable.appendChild(row);
    });

    outRecords.forEach(e => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${Utils.formatDate(e.date)}</td>
            <td>${e.item}</td>
            <td>${e.customer || '-'}</td>
            <td>${e.qty}</td>
            <td>${Utils.formatCurrency(e.price)}</td>
            <td>${Utils.formatCurrency(e.total)}</td>
            <td>
                <button class="btn-action btn-edit" onclick="Stock.editStockEntry('${e.id}','out')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-action btn-delete" onclick="Stock.deleteStockEntry('${e.id}','out')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        outTable.appendChild(row);
    });

    Utils.toast(`Found ${inRecords.length} IN and ${outRecords.length} OUT records`, 'success');
}

// ======================================================================
// SECTION 14: STOCK BALANCE HELPER FUNCTIONS
// ======================================================================

// Update stock balance for a single entry
function updateStockBalance(entry) {
    const item = entry.item;
    
    if (!AppState.balance[item]) {
        AppState.balance[item] = {
            item: item,
            totalIn: 0,
            totalOut: 0,
            available: 0,
            profit: 0,
            barcode: entry.barcode || ''
        };
    }

    if (entry.type === 'in') {
        AppState.balance[item].totalIn += entry.qty;
        AppState.balance[item].profit -= entry.total; // Cost
    } else {
        AppState.balance[item].totalOut += entry.qty;
        AppState.balance[item].profit += entry.total; // Revenue
    }

    AppState.balance[item].available = 
        AppState.balance[item].totalIn - AppState.balance[item].totalOut;
}

// Get balance for a specific item
function getItemBalance(item) {
    if (!AppState.balance[item]) return 0;
    return AppState.balance[item].available;
}

// ======================================================================
// SECTION 15: PAGE NAVIGATION
// ======================================================================

function switchPage(pageId, title) {
    // Check permissions
    const pageName = pageId.replace('page-', '');
    if (!Auth.hasPermission(pageName) && !Auth.hasPermission('all')) {
        Utils.toast('You don\'t have permission to access this page', 'error');
        return;
    }

    // Hide all pages
    document.querySelectorAll('.erp-page').forEach(p => p.style.display = 'none');
    
    // Show selected page
    const page = document.getElementById(pageId);
    if (page) page.style.display = 'block';
    
    // Update title
    document.getElementById('page-title').textContent = `🐘 KRT TRADERS ERP - ${title}`;
    
    // Update sidebar active state
    document.querySelectorAll('#sidebar ul li').forEach(li => li.classList.remove('active'));
    const activeLi = Array.from(document.querySelectorAll('#sidebar ul li'))
        .find(li => li.getAttribute('onclick')?.includes(pageId));
    if (activeLi) activeLi.classList.add('active');

    // Render page content if needed
    switch(pageId) {
        case 'page-balance':
            renderBalanceTable();
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
        case 'page-dashboard':
            updateDashboardStats();
            break;
    }
}

// Populate customer list
function populateCustomerList() {
    const entries = Ledger.loadEntries();
    const customers = [...new Set(entries.map(e => e.customer).filter(Boolean))];
    const datalist = document.getElementById('customer-list');
    datalist.innerHTML = '';
    customers.forEach(c => {
        const option = document.createElement('option');
        option.value = c;
        datalist.appendChild(option);
    });
}

// Show ledger for selected customer
function showLedger() {
    renderLedgerTable();
}

// Update opening balance
function updateOpeningBal() {
    const openingBal = parseFloat(document.getElementById('opening-bal').value) || 0;
    localStorage.setItem('ledger_opening_balance', openingBal);
    Utils.toast('Opening balance updated');
}

// ======================================================================
// SECTION 16: RENT BOOK FUNCTIONS
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
            date: date,
            month: month || new Date(date).toLocaleString('default', { month: 'long', year: 'numeric' }),
            shopkeeper: shopkeeper,
            shopNo: shopNo || '-',
            debit: debit,
            credit: credit,
            method: method
        };

        RentBook.addEntry(entry);
        renderRentTable();
        
        // Clear fields
        document.getElementById('rent-date').value = '';
        document.getElementById('rent-month').value = '';
        document.getElementById('rent-debit').value = '0';
        document.getElementById('rent-credit').value = '0';

        Utils.toast('Rent entry added successfully');

    } catch (error) {
        Utils.handleError(error, 'addRentEntry');
    }
}

// ======================================================================
// SECTION 17: LEDGER FUNCTIONS
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

        const total = qty > 0 ? Utils.calculateTotal(qty, price) : 0;

        const entry = {
            date: date,
            customer: customer,
            item: item || '-',
            qty: qty,
            price: price,
            total: total,
            debit: debit,
            credit: credit,
            method: method
        };

        Ledger.addEntry(entry);
        renderLedgerTable();
        populateCustomerList();

        // Clear fields
        document.getElementById('led-date').value = '';
        document.getElementById('led-item').value = '';
        document.getElementById('led-qty').value = '0';
        document.getElementById('led-price').value = '0';
        document.getElementById('led-debit').value = '0';
        document.getElementById('led-credit').value = '0';

        Utils.toast('Ledger entry saved successfully');

    } catch (error) {
        Utils.handleError(error, 'saveLedgerEntry');
    }
}

// ======================================================================
// SECTION 18: SETTINGS FUNCTIONS
// ======================================================================

function createNewUser() {
    const name = document.getElementById('new-username').value.trim();
    const userId = document.getElementById('new-userid').value.trim();
    const password = document.getElementById('new-password').value.trim();
    
    // Get selected permissions
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

    Auth.createUser(name, userId, password, permissions);
    
    // Clear fields
    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';
    document.querySelectorAll('.perm:checked').forEach(cb => cb.checked = false);
}

// ======================================================================
// SECTION 19: SYNC & REFRESH FUNCTIONS
// ======================================================================

async function syncAllCloudData() {
    if (!navigator.onLine) {
        Utils.toast('You are offline. Sync will resume when online.', 'warning');
        return;
    }

    Utils.toast('Syncing with cloud...', 'info');
    await SyncService.forceSync();
    await refreshAllData();
}

async function refreshAllData() {
    try {
        const records = await Database.getAllRecords();
        
        if (records && records.length > 0) {
            // Separate IN and OUT
            const inRecords = records.filter(r => r.type === 'in');
            const outRecords = records.filter(r => r.type === 'out');
            
            // Update local state if cloud has newer data
            if (inRecords.length > AppState.stockIn.length) {
                AppState.stockIn = inRecords;
                Cache.set('stockIn', inRecords);
            }
            
            if (outRecords.length > AppState.stockOut.length) {
                AppState.stockOut = outRecords;
                Cache.set('stockOut', outRecords);
            }
            
            // Recalculate balance
            AppState.balance = {};
            AppState.stockIn.forEach(e => updateStockBalance(e));
            AppState.stockOut.forEach(e => updateStockBalance(e));
        }

        // Update UI
        renderTodayIn();
        renderTodayOut();
        renderBalanceTable();
        updateDashboardStats();
        populateItemList();
        
        Utils.log('Data refreshed from cloud');
        Utils.toast('Data refreshed successfully');

    } catch (error) {
        Utils.handleError(error, 'refreshAllData');
    }
}

// ======================================================================
// SECTION 20: LOGIN/LOGOUT FUNCTIONS
// ======================================================================

function login() {
    const username = document.getElementById('user').value.trim();
    const password = document.getElementById('pass').value.trim();

    if (!username || !password) {
        Utils.toast('Please enter username and password', 'error');
        return;
    }

    if (Auth.login(username, password)) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('sidebar').style.display = 'block';
        
        // Show toggle button on mobile
        if (window.innerWidth <= 768) {
            const toggleBtn = document.createElement('button');
            toggleBtn.id = 'toggle-btn';
            toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
            toggleBtn.onclick = toggleSidebar;
            document.body.appendChild(toggleBtn);
        }

        // Load data
        loadLocalData();
        refreshAllData();
        
        // Start auto sync
        startAutoSync();
        
        // Update user name
        document.getElementById('userName').textContent = AppState.currentUser.name;
        
        // Show default page
        switchPage('page-dashboard', 'DASHBOARD');
    }
}

function logout() {
    Auth.logout();
    clearInterval(window.syncInterval);
}

// ======================================================================
// SECTION 21: SIDEBAR TOGGLE
// ======================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const currentLeft = sidebar.style.left;
    sidebar.style.left = currentLeft === '0px' ? '-240px' : '0px';
}

// ======================================================================
// SECTION 22: PRINT & EXPORT FUNCTIONS
// ======================================================================

function printSection() {
    window.print();
}

function generateCustomReport() {
    Reports.generateReport();
}

function generateMasterSearch() {
    Search.masterSearch();
}

// ======================================================================
// SECTION 23: AUTO SYNC
// ======================================================================

function startAutoSync() {
    if (window.syncInterval) clearInterval(window.syncInterval);
    
    window.syncInterval = setInterval(() => {
        if (navigator.onLine && !SyncService.isSyncing) {
            SyncService.processQueue();
        }
    }, CONFIG.SYNC_INTERVAL);
}

// ======================================================================
// SECTION 24: LOAD LOCAL DATA
// ======================================================================

function loadLocalData() {
    // Load from cache
    const cachedIn = Cache.get('stockIn');
    const cachedOut = Cache.get('stockOut');
    
    if (cachedIn) {
        AppState.stockIn = cachedIn;
        cachedIn.forEach(e => updateStockBalance(e));
    }
    
    if (cachedOut) {
        AppState.stockOut = cachedOut;
        cachedOut.forEach(e => updateStockBalance(e));
    }

    // Load ledger entries
    Ledger.loadEntries();
    
    // Load rent entries
    RentBook.loadEntries();

    // Load sync queue
    const queue = localStorage.getItem('sync_queue');
    if (queue) {
        try {
            SyncService.queue = JSON.parse(queue);
        } catch (e) {
            SyncService.queue = [];
        }
    }

    // Update UI
    renderTodayIn();
    renderTodayOut();
    renderBalanceTable();
    updateDashboardStats();
    populateItemList();
    populateCustomerList();
    renderLedgerTable();
    renderRentTable();
    
    Utils.log('Local data loaded');
}

// ======================================================================
// SECTION 25: KEYBOARD SHORTCUTS
// ======================================================================

document.addEventListener('keydown', (e) => {
    // Ctrl+K for global search
    if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        document.getElementById('globalSearch')?.focus();
    }
    
    // Escape to close dialogs
    if (e.key === 'Escape') {
        const dialog = document.getElementById('confirm-dialog');
        if (dialog && dialog.style.display === 'flex') {
            document.getElementById('confirmCancel')?.click();
        }
    }

    // F1 for help
    if (e.key === 'F1') {
        e.preventDefault();
        Utils.toast('KRT ERP v5.0 - Press Ctrl+K for search', 'info');
    }

    // Ctrl+S to save (when in forms)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const activePage = document.querySelector('.erp-page[style*="display: block"]');
        if (activePage) {
            const saveBtn = activePage.querySelector('.btn-primary, .btn-danger, .btn-info');
            if (saveBtn) saveBtn.click();
        }
    }
});

// ======================================================================
// SECTION 26: NETWORK STATUS HANDLING
// ======================================================================

window.addEventListener('online', () => {
    AppState.isOnline = true;
    Utils.toast('Back online! Syncing data...', 'success');
    SyncService.processQueue();
    refreshAllData();
});

window.addEventListener('offline', () => {
    AppState.isOnline = false;
    Utils.toast('You are offline. Changes will sync when online.', 'warning');
});

// ======================================================================
// SECTION 27: WELCOME & LOADING ANIMATION
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
                startClock();
            }, 300);
        }
    }, 200);
}

// ======================================================================
// SECTION 28: LIVE CLOCK
// ======================================================================

function startClock() {
    const clock = document.getElementById('live-clock');
    if (!clock) return;
    
    setInterval(() => {
        const now = new Date();
        clock.textContent = now.toLocaleString('en-PK', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    }, 1000);
}

// ======================================================================
// SECTION 29: DARK MODE TOGGLE
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
    const darkModeToggle = document.getElementById('darkModeToggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = darkModeToggle.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.className = 'fas fa-sun';
                localStorage.setItem('dark_mode', 'enabled');
            } else {
                icon.className = 'fas fa-moon';
                localStorage.setItem('dark_mode', 'disabled');
            }
        });

        // Load dark mode preference
        if (localStorage.getItem('dark_mode') === 'enabled') {
            document.body.classList.add('dark-mode');
            darkModeToggle.querySelector('i').className = 'fas fa-sun';
        }
    }
});

// ======================================================================
// SECTION 30: GLOBAL SEARCH
// ======================================================================

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', Utils.debounce((e) => {
            const query = e.target.value.trim();
            if (query.length >= 2) {
                Search.globalSearch(query);
            }
        }, 300));
    }
});

// ======================================================================
// SECTION 31: ADD IN/OUT FUNCTIONS (Global)
// ======================================================================

function addIn() {
    Stock.addIn();
}

function addOut() {
    Stock.addOut();
}

function showLiveStock(itemName) {
    Stock.showLiveStock(itemName);
}

// ======================================================================
// SECTION 32: INITIALIZATION
// ======================================================================

// Initialize Supabase
Database.init();

// Start loading animation
startLoadingAnimation();

// Check for saved login
if (Auth.isLoggedIn()) {
    setTimeout(() => {
        document.getElementById('welcome-overlay').style.display = 'none';
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('sidebar').style.display = 'block';
        
        loadLocalData();
        refreshAllData();
        startAutoSync();
        startClock();
        
        document.getElementById('userName').textContent = AppState.currentUser.name;
        switchPage('page-dashboard', 'DASHBOARD');
    }, 1000);
}

// Handle resize for sidebar toggle
window.addEventListener('resize', () => {
    const toggleBtn = document.getElementById('toggle-btn');
    if (window.innerWidth > 768 && toggleBtn) {
        toggleBtn.remove();
        document.getElementById('sidebar').style.left = '0px';
    } else if (window.innerWidth <= 768 && !toggleBtn && document.getElementById('sidebar').style.display !== 'none') {
        const newToggle = document.createElement('button');
        newToggle.id = 'toggle-btn';
        newToggle.innerHTML = '<i class="fas fa-bars"></i>';
        newToggle.onclick = toggleSidebar;
        document.body.appendChild(newToggle);
        document.getElementById('sidebar').style.left = '-240px';
    }
});

// Console welcome message
console.log(`
%c🐘 KRT TRADERS ERP v5.0
%cEnterprise Resource Planning System
%cDeveloped by Bilal Suleman
%c© 2026 KRT Traders - All Rights Reserved
`, 'font-size: 24px; font-weight: bold; color: #f1c40f;',
'font-size: 14px; color: #3498db;',
'font-size: 12px; color: #2ecc71;',
'font-size: 10px; color: #888;');

// ======================================================================
// END OF SCRIPT
// ======================================================================
