// ================================================================
// KRT TRADERS ERP - COMPLETE SYSTEM (FIXED VERSION)
// Developed by Bilal Suleman
// Version: 5.1 - Fixed Data Persistence Issue
// ================================================================

// ================================================================
// SECTION 1: SUPABASE CONFIGURATION
// ================================================================

const supabaseUrl = 'https://zeadgtkzqooiswyyuozl.supabase.co';
const supabaseKey = 'sb_publishable_b4jLu7Bx2dsGtLR72i8dMA_OeGcOu79';
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// ================================================================
// SECTION 2: GLOBAL DATABASE OBJECTS
// ================================================================

let db = {
    in: [],
    out: [],
    ledgers: {},
    opening_balances: {}
};

let dbRent = [];
let extraUsers = [];

// ================================================================
// SECTION 3: DATA PERSISTENCE FUNCTIONS
// ================================================================

function loadAllDataFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('krt_erp_data');
        if (savedData) {
            db = JSON.parse(savedData);
            console.log('📦 Local data loaded successfully');
            console.log('📊 IN entries:', db.in.length);
            console.log('📊 OUT entries:', db.out.length);
            console.log('📊 Ledgers:', Object.keys(db.ledgers).length);
        } else {
            console.log('⚠️ No local data found, starting fresh');
            db = { in: [], out: [], ledgers: {}, opening_balances: {} };
        }
    } catch (error) {
        console.error('❌ Error loading local data:', error);
        db = { in: [], out: [], ledgers: {}, opening_balances: {} };
    }

    try {
        const savedRent = localStorage.getItem('krt_rent_data');
        if (savedRent) {
            dbRent = JSON.parse(savedRent);
            console.log('📦 Rent data loaded:', dbRent.length);
        }
    } catch (error) {
        console.error('❌ Error loading rent data:', error);
        dbRent = [];
    }

    try {
        const savedUsers = localStorage.getItem('krt_extra_users');
        if (savedUsers) {
            extraUsers = JSON.parse(savedUsers);
            console.log('📦 Users loaded:', extraUsers.length);
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
        extraUsers = [];
    }
}

function saveAllDataToLocalStorage() {
    try {
        localStorage.setItem('krt_erp_data', JSON.stringify(db));
        localStorage.setItem('krt_rent_data', JSON.stringify(dbRent));
        localStorage.setItem('krt_extra_users', JSON.stringify(extraUsers));
        console.log('💾 All data saved to localStorage');
    } catch (error) {
        console.error('❌ Error saving data:', error);
    }
}

// ================================================================
// SECTION 4: DATE UTILITY FUNCTIONS
// ================================================================

function getCurrentDateInPakistan() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
}

function formatDateForDisplay(dateString) {
    if (!dateString) return 'N/A';
    const parts = dateString.split('-');
    if (parts.length === 3) {
        return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
    return dateString;
}

function isDateInRange(date, fromDate, toDate) {
    return date >= fromDate && date <= toDate;
}

// ================================================================
// SECTION 5: IDLE SCREEN SYSTEM
// ================================================================

const IDLE_TIMEOUT_IN_MILLISECONDS = 30000;
let idleTimerReference = null;
let isIdleScreenActive = false;
let idleScreenSecondsCounter = 0;
let idleScreenIntervalReference = null;

function createIdleScreenOverlay() {
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', function() {
        dismissIdleScreen();
    });

    const touchButton = document.getElementById('idle-touch-btn');
    if (touchButton) {
        touchButton.addEventListener('click', function(event) {
            event.stopPropagation();
            dismissIdleScreen();
        });
    }

    generateIdleParticles();
}

function generateIdleParticles() {
    const container = document.getElementById('idle-particles');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#ec4899'];

    for (let i = 0; i < 30; i++) {
        const particle = document.createElement('div');
        particle.className = 'idle-particle';
        const size = Math.random() * 10 + 4;
        const colorIndex = Math.floor(Math.random() * colors.length);
        const duration = Math.random() * 25 + 15;
        const delay = Math.random() * 25;
        const borderRadius = Math.random() > 0.5 ? '50%' : '4px';

        particle.style.cssText = `
            width: ${size}px;
            height: ${size}px;
            left: ${Math.random() * 100}%;
            background: ${colors[colorIndex]};
            opacity: ${Math.random() * 0.15 + 0.03};
            animation-duration: ${duration}s;
            animation-delay: ${delay}s;
            border-radius: ${borderRadius};
        `;
        container.appendChild(particle);
    }
}

function showIdleScreen() {
    if (isIdleScreenActive) return;

    const loginScreen = document.getElementById('login-screen');
    const welcomeOverlay = document.getElementById('welcome-overlay');

    if (loginScreen && loginScreen.style.display !== 'none') return;
    if (welcomeOverlay && welcomeOverlay.style.display !== 'none') return;

    isIdleScreenActive = true;
    const overlay = document.getElementById('idle-overlay');
    if (!overlay) return;

    idleScreenSecondsCounter = 0;
    const timerElement = document.getElementById('idle-timer');
    if (timerElement) timerElement.textContent = '00:00';

    overlay.style.display = 'flex';
    overlay.style.animation = 'idleIn 0.8s ease';

    const statusElement = document.getElementById('idle-status');
    if (statusElement) statusElement.textContent = '🔴 IDLE';

    generateIdleParticles();

    if (idleScreenIntervalReference) {
        clearInterval(idleScreenIntervalReference);
        idleScreenIntervalReference = null;
    }

    idleScreenIntervalReference = setInterval(function() {
        idleScreenSecondsCounter++;
        const minutes = String(Math.floor(idleScreenSecondsCounter / 60)).padStart(2, '0');
        const seconds = String(idleScreenSecondsCounter % 60).padStart(2, '0');
        const timerElement = document.getElementById('idle-timer');
        if (timerElement) timerElement.textContent = minutes + ':' + seconds;
    }, 1000);
}

function dismissIdleScreen() {
    if (!isIdleScreenActive) return;

    isIdleScreenActive = false;
    const overlay = document.getElementById('idle-overlay');

    if (overlay) {
        overlay.style.animation = 'idleOut 0.5s ease forwards';
        setTimeout(function() {
            overlay.style.display = 'none';
            overlay.style.animation = '';
        }, 500);
    }

    if (idleScreenIntervalReference) {
        clearInterval(idleScreenIntervalReference);
        idleScreenIntervalReference = null;
    }

    const statusElement = document.getElementById('idle-status');
    if (statusElement) statusElement.textContent = '🟢 ACTIVE';

    resetIdleTimer();
}

function resetIdleTimer() {
    if (idleTimerReference) {
        clearTimeout(idleTimerReference);
        idleTimerReference = null;
    }

    if (isIdleScreenActive) return;

    idleTimerReference = setTimeout(function() {
        showIdleScreen();
    }, IDLE_TIMEOUT_IN_MILLISECONDS);
}

function setupIdleDetectionSystem() {
    createIdleScreenOverlay();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click', 'wheel', 'touchmove'];
    events.forEach(function(eventName) {
        document.addEventListener(eventName, resetIdleTimer);
    });

    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            resetIdleTimer();
        }
    });

    resetIdleTimer();
}

// Initialize idle detection when DOM is ready
document.addEventListener('DOMContentLoaded', setupIdleDetectionSystem);

// ================================================================
// SECTION 6: LOGIN SYSTEM
// ================================================================

function login() {
    const username = document.getElementById('user').value.trim().toLowerCase();
    const password = document.getElementById('pass').value.trim();

    if (username === 'admin' && password === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'admin');
        showSystem('admin');
        return;
    }

    if (username === 'ali' && password === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'staff');
        showSystem('staff');
        return;
    }

    if (username === 'sattar' && password === '123') {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'manager');
        showSystem('manager');
        return;
    }

    const foundUser = extraUsers.find(function(user) {
        return user.id === username && user.pass === password;
    });

    if (foundUser) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', 'extra');
        showSystem(foundUser);
        const toggleButton = document.getElementById('toggle-btn');
        if (toggleButton) toggleButton.style.display = 'block';
        return;
    }

    alert('❌ Invalid Credentials!');
    const loginBox = document.querySelector('.login-box');
    if (loginBox) {
        loginBox.style.animation = 'shake 0.5s ease';
        setTimeout(function() {
            loginBox.style.animation = '';
        }, 500);
    }
}

// ================================================================
// SECTION 7: SYSTEM DISPLAY
// ================================================================

function showSystem(roleOrUser) {
    const loginScreen = document.getElementById('login-screen');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const toggleButton = document.getElementById('toggle-btn');

    if (loginScreen) loginScreen.style.display = 'none';
    if (sidebar) sidebar.style.display = 'block';
    if (mainContent) mainContent.style.display = 'block';
    if (toggleButton) toggleButton.style.display = 'block';

    if (typeof roleOrUser === 'object') {
        applyDynamicPermissionsToUser(roleOrUser);
    } else {
        const sidebarItems = document.querySelectorAll('#sidebar ul li');
        sidebarItems.forEach(function(item) {
            item.style.display = 'flex';
        });

        if (roleOrUser === 'staff') {
            sidebarItems.forEach(function(item) {
                const text = item.innerText;
                if (!text.includes('Dashboard') && !text.includes('Reports') && !text.includes('Balance') && !text.includes('Logout')) {
                    item.style.display = 'none';
                }
            });
            switchPage('page-Report', 'REPORTS');
        } else if (roleOrUser === 'manager') {
            sidebarItems.forEach(function(item) {
                const text = item.innerText;
                if (!text.includes('Dashboard') && !text.includes('Ledgers') && !text.includes('Rent') && !text.includes('Balance') && !text.includes('Logout')) {
                    item.style.display = 'none';
                }
            });
            switchPage('page-customer-ledgers', 'CUSTOMER LEDGERS');
        }
    }

    renderAllData();
    updateDashboardStatistics();
    loadUsersTable();
    resetIdleTimer();
}

function applyDynamicPermissionsToUser(user) {
    const sidebarItems = document.querySelectorAll('#sidebar ul li');
    sidebarItems.forEach(function(item) {
        const onclickAttribute = item.getAttribute('onclick') || '';

        if (onclickAttribute.includes('page-dashboard') || onclickAttribute.includes('logout')) {
            item.style.display = 'flex';
            return;
        }

        const hasPermission = user.perms.some(function(permission) {
            return onclickAttribute.includes(permission);
        });

        item.style.display = hasPermission ? 'flex' : 'none';
    });

    renderAllData();
}

// ================================================================
// SECTION 8: CLOUD DATA SYNCHRONIZATION (FIXED - MERGE INSTEAD OF REPLACE)
// ================================================================

async function fetchStockDataFromSupabase() {
    try {
        console.log('🔄 Fetching stock data from Supabase...');
        
        const { data, error } = await _supabase.from('KRT').select('*').order('id', { ascending: true });

        if (error) {
            console.error('❌ Supabase error:', error.message);
            return false;
        }

        if (!data || data.length === 0) {
            console.log('⚠️ No data found in Supabase');
            return false;
        }

        console.log('📦 Data received:', data.length, 'records');

        // *** FIX: MERGE data instead of replacing ***
        // Create set of existing IDs
        const existingIds = new Set();
        db.in.forEach(entry => { if (entry.id) existingIds.add(entry.id); });
        db.out.forEach(entry => { if (entry.id) existingIds.add(entry.id); });

        let addedCount = 0;

        data.forEach(function(row) {
            const stockInQuantity = Number(row.stock_in || 0);
            const stockOutQuantity = Number(row.stock_out || 0);
            const price = Number(row.price || 0);
            let date = row.Date;

            if (date) {
                date = date.split('T')[0];
            } else {
                date = new Date().toISOString().split('T')[0];
            }

            // Only add if not already in db
            if (!existingIds.has(row.id)) {
                if (stockInQuantity > 0) {
                    db.in.push({
                        id: row.id,
                        date: date,
                        vendor: row.vendor_name || 'factory',
                        item: row.item_name || 'Unknown',
                        qty: stockInQuantity,
                        price: price,
                        total: stockInQuantity * price
                    });
                    addedCount++;
                }

                if (stockOutQuantity > 0) {
                    db.out.push({
                        id: row.id,
                        date: date,
                        cust: row.customer_name || 'General Sale',
                        item: row.item_name || 'Unknown',
                        qty: stockOutQuantity,
                        price: price,
                        total: stockOutQuantity * price
                    });
                    addedCount++;
                }
            }
        });

        saveAllDataToLocalStorage();
        console.log('✅ Stock data merged successfully');
        console.log('📊 Added new entries:', addedCount);
        console.log('📊 Total IN entries:', db.in.length);
        console.log('📊 Total OUT entries:', db.out.length);

        return true;
    } catch (error) {
        console.error('❌ Error fetching stock data:', error);
        return false;
    }
}

async function fetchRentDataFromSupabase() {
    try {
        console.log('🔄 Fetching rent data from Supabase...');

        const { data, error } = await _supabase.from('KRT_RENT').select('*').order('id', { ascending: true });

        if (error) {
            console.error('❌ Rent fetch error:', error);
            return false;
        }

        if (!data || data.length === 0) {
            console.log('⚠️ No rent data found');
            return false;
        }

        // *** FIX: MERGE data instead of replacing ***
        const existingIds = new Set(dbRent.map(entry => entry.id));
        let addedCount = 0;

        data.forEach(function(row) {
            if (!existingIds.has(row.id)) {
                dbRent.push({
                    id: row.id,
                    name: row.name,
                    shop: row.shop,
                    date: row.date,
                    month: row.month,
                    debit: Number(row.debit || 0),
                    credit: Number(row.credit || 0),
                    method: row.method
                });
                addedCount++;
            }
        });

        saveAllDataToLocalStorage();
        console.log('✅ Rent data merged successfully');
        console.log('📊 Added new entries:', addedCount);
        console.log('📊 Total rent entries:', dbRent.length);
        return true;
    } catch (error) {
        console.error('❌ Error fetching rent data:', error);
        return false;
    }
}

async function synchronizeWithCloud() {
    if (!navigator.onLine) {
        showNotificationMessage('⚠️ No internet connection! Operating in offline mode.', 'warning');
        return;
    }

    showNotificationMessage('☁️ Synchronizing with cloud...', 'info');

    try {
        const stockSyncResult = await fetchStockDataFromSupabase();
        const rentSyncResult = await fetchRentDataFromSupabase();

        if (stockSyncResult || rentSyncResult) {
            renderAllData();
            updateDashboardStatistics();
            updateItemDropdownList();
            updateCustomerDropdownList();
            loadUsersTable();
            renderRentDataTable();
            showNotificationMessage('✅ Cloud synchronization completed successfully!', 'success');
        } else {
            showNotificationMessage('ℹ️ No new data found in cloud.', 'info');
        }
    } catch (error) {
        showNotificationMessage('❌ Synchronization failed: ' + error.message, 'error');
    }
}

// ================================================================
// SECTION 9: NOTIFICATION SYSTEM
// ================================================================

function showNotificationMessage(message, type) {
    type = type || 'info';

    const notification = document.createElement('div');
    notification.className = 'toast-notification ' + type;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(function() {
        notification.classList.add('show');
    }, 50);

    setTimeout(function() {
        notification.classList.remove('show');
        setTimeout(function() {
            notification.remove();
        }, 500);
    }, 3500);
}

// ================================================================
// SECTION 10: STOCK IN OPERATIONS
// ================================================================

async function addStockIn() {
    const date = document.getElementById('in-date').value;
    const vendor = document.getElementById('in-vendor').value || 'factory';
    const item = document.getElementById('in-item').value.trim();
    const quantity = Number(document.getElementById('in-qty').value);
    const price = Number(document.getElementById('in-price').value) || 0;

    if (!date) {
        showNotificationMessage('⚠️ Please select a date!', 'warning');
        return;
    }

    if (!item) {
        showNotificationMessage('⚠️ Please enter item name!', 'warning');
        return;
    }

    if (!quantity || quantity <= 0) {
        showNotificationMessage('⚠️ Please enter a valid quantity!', 'warning');
        return;
    }

    try {
        const { data, error } = await _supabase.from('KRT').insert([{
            Date: date,
            item_name: item,
            stock_in: quantity,
            stock_out: 0,
            price: price,
            vendor_name: vendor
        }]).select();

        if (error) {
            showNotificationMessage('❌ Cloud error: ' + error.message, 'error');
            return;
        }

        if (data && data.length > 0) {
            db.in.push({
                id: data[0].id,
                date: date,
                vendor: vendor,
                item: item,
                qty: quantity,
                price: price,
                total: quantity * price
            });

            saveAllDataToLocalStorage();
            renderAllData();
            updateDashboardStatistics();
            updateItemDropdownList();

            document.getElementById('in-item').value = '';
            document.getElementById('in-qty').value = '';

            showNotificationMessage('✅ Stock IN saved successfully!', 'success');
        }
    } catch (error) {
        showNotificationMessage('❌ Network error: ' + error.message, 'error');
    }
}

// ================================================================
// SECTION 11: STOCK OUT OPERATIONS
// ================================================================

async function addStockOut() {
    const date = document.getElementById('out-date').value;
    const customer = document.getElementById('out-customer').value || 'General Sale';
    const item = document.getElementById('out-item').value.trim();
    const quantity = Number(document.getElementById('out-qty').value);
    const price = Number(document.getElementById('out-price').value) || 0;

    if (!date) {
        showNotificationMessage('⚠️ Please select a date!', 'warning');
        return;
    }

    if (!item) {
        showNotificationMessage('⚠️ Please enter item name!', 'warning');
        return;
    }

    if (!quantity || quantity <= 0) {
        showNotificationMessage('⚠️ Please enter a valid quantity!', 'warning');
        return;
    }

    // Check stock availability
    const totalIn = db.in.filter(function(x) {
        return x.item === item;
    }).reduce(function(sum, x) {
        return sum + x.qty;
    }, 0);

    const totalOut = db.out.filter(function(x) {
        return x.item === item;
    }).reduce(function(sum, x) {
        return sum + x.qty;
    }, 0);

    const available = totalIn - totalOut;

    if (quantity > available && available > 0) {
        if (!confirm('⚠️ Only ' + available + ' available. Do you want to continue?')) {
            return;
        }
    }

    try {
        const { data, error } = await _supabase.from('KRT').insert([{
            Date: date,
            item_name: item,
            stock_in: 0,
            stock_out: quantity,
            price: price,
            customer_name: customer
        }]).select();

        if (error) {
            showNotificationMessage('❌ Cloud error: ' + error.message, 'error');
            return;
        }

        if (data && data.length > 0) {
            db.out.push({
                id: data[0].id,
                item: item,
                qty: quantity,
                date: date,
                cust: customer,
                price: price,
                total: quantity * price
            });

            saveAllDataToLocalStorage();
            renderAllData();
            updateDashboardStatistics();
            updateItemDropdownList();

            document.getElementById('out-item').value = '';
            document.getElementById('out-qty').value = '';
            document.getElementById('stock-status').innerHTML = '';

            showNotificationMessage('✅ Stock OUT saved successfully!', 'success');
        }
    } catch (error) {
        showNotificationMessage('❌ Network error: ' + error.message, 'error');
    }
}

// ================================================================
// SECTION 12: LIVE STOCK CHECK
// ================================================================

function checkLiveStock(itemName) {
    const statusElement = document.getElementById('stock-status');

    if (!itemName || !itemName.trim()) {
        statusElement.innerHTML = '';
        return;
    }

    const totalIn = db.in.filter(function(x) {
        return x.item === itemName;
    }).reduce(function(sum, x) {
        return sum + x.qty;
    }, 0);

    const totalOut = db.out.filter(function(x) {
        return x.item === itemName;
    }).reduce(function(sum, x) {
        return sum + x.qty;
    }, 0);

    const availableBalance = totalIn - totalOut;

    if (availableBalance > 0) {
        statusElement.style.color = '#10b981';
        statusElement.innerHTML = '✅ Available: <strong>' + availableBalance + '</strong>';
    } else if (availableBalance <= 0 && totalIn > 0) {
        statusElement.style.color = '#ef4444';
        statusElement.innerHTML = '⚠️ Out of Stock! (Balance: ' + availableBalance + ')';
    } else {
        statusElement.style.color = '#94a3b8';
        statusElement.innerHTML = 'ℹ️ No record found for this item.';
    }
}

// ================================================================
// SECTION 13: RENDER ALL DATA
// ================================================================

function renderAllData() {
    const today = getCurrentDateInPakistan();

    // TODAY'S STOCK IN
    const inTableBody = document.getElementById('today-list-in');
    if (inTableBody) {
        const todayInEntries = db.in.filter(function(entry) {
            return entry.date === today;
        });

        if (todayInEntries.length === 0) {
            inTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:25px;color:#94a3b8;">📭 No stock in entries today</td></tr>';
        } else {
            let html = '';
            let counter = 1;

            todayInEntries.forEach(function(entry) {
                const index = db.in.indexOf(entry);
                html += '<tr>' +
                    '<td>' + (counter++) + '</td>' +
                    '<td><strong>' + entry.item + '</strong></td>' +
                    '<td>' + entry.vendor + '</td>' +
                    '<td>' + entry.qty + '</td>' +
                    '<td>' + entry.price.toLocaleString() + '</td>' +
                    '<td>' + entry.total.toLocaleString() + '</td>' +
                    '<td>' +
                    '<button class="btn-action btn-edit" onclick="editEntry(\'in\',' + index + ')">Edit</button> ' +
                    '<button class="btn-action btn-delete" onclick="deleteEntry(\'in\',' + index + ')">Del</button>' +
                    '</td>' +
                    '</tr>';
            });

            inTableBody.innerHTML = html;
        }
    }

    // TODAY'S STOCK OUT
    const outTableBody = document.getElementById('today-list-out');
    if (outTableBody) {
        const todayOutEntries = db.out.filter(function(entry) {
            return entry.date === today;
        });

        if (todayOutEntries.length === 0) {
            outTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:25px;color:#94a3b8;">📭 No stock out entries today</td></tr>';
        } else {
            let html = '';
            let counter = 1;

            todayOutEntries.forEach(function(entry) {
                const index = db.out.indexOf(entry);
                html += '<tr>' +
                    '<td>' + (counter++) + '</td>' +
                    '<td>' + entry.date + '</td>' +
                    '<td>' + entry.cust + '</td>' +
                    '<td><strong>' + entry.item + '</strong></td>' +
                    '<td>' + entry.qty + '</td>' +
                    '<td>' + entry.price.toLocaleString() + '</td>' +
                    '<td>' + entry.total.toLocaleString() + '</td>' +
                    '<td>' +
                    '<button class="btn-action btn-edit" onclick="editEntry(\'out\',' + index + ')">Edit</button> ' +
                    '<button class="btn-action btn-delete" onclick="deleteEntry(\'out\',' + index + ')">Del</button>' +
                    '</td>' +
                    '</tr>';
            });

            outTableBody.innerHTML = html;
        }
    }

    // STOCK BALANCE
    const balanceTableBody = document.getElementById('table-balance-body');
    if (balanceTableBody) {
        const uniqueItems = [];

        db.in.forEach(function(entry) {
            if (uniqueItems.indexOf(entry.item) === -1) {
                uniqueItems.push(entry.item);
            }
        });

        db.out.forEach(function(entry) {
            if (uniqueItems.indexOf(entry.item) === -1) {
                uniqueItems.push(entry.item);
            }
        });

        if (uniqueItems.length === 0) {
            balanceTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:25px;color:#94a3b8;">📭 No items in inventory</td></tr>';
        } else {
            let html = '';

            uniqueItems.forEach(function(itemName) {
                const totalIn = db.in.filter(function(entry) {
                    return entry.item === itemName;
                }).reduce(function(sum, entry) {
                    return sum + entry.qty;
                }, 0);

                const totalOut = db.out.filter(function(entry) {
                    return entry.item === itemName;
                }).reduce(function(sum, entry) {
                    return sum + entry.qty;
                }, 0);

                const purchasePrice = db.in.find(function(entry) {
                    return entry.item === itemName;
                })?.price || 0;

                const salePrice = db.out.find(function(entry) {
                    return entry.item === itemName;
                })?.price || 0;

                const available = totalIn - totalOut;
                const profit = (salePrice - purchasePrice) * totalOut;
                const profitColor = profit >= 0 ? '#10b981' : '#ef4444';
                const availableColor = available < 5 ? '#ef4444' : '#10b981';

                html += '<tr>' +
                    '<td><strong>' + itemName + '</strong></td>' +
                    '<td style="color:#06b6d4;">' + totalIn + '</td>' +
                    '<td style="color:#f59e0b;">' + totalOut + '</td>' +
                    '<td style="font-weight:bold;color:' + availableColor + ';">' + available + '</td>' +
                    '<td style="color:' + profitColor + ';font-weight:bold;">PKR ' + profit.toLocaleString() + '</td>' +
                    '</tr>';
            });

            balanceTableBody.innerHTML = html;
        }
    }

    updateItemDropdownList();
    updateDashboardStatistics();
}

// ================================================================
// SECTION 14: DASHBOARD STATISTICS
// ================================================================

function updateDashboardStatistics() {
    const totalStockIn = db.in.reduce(function(sum, entry) {
        return sum + entry.qty;
    }, 0);

    const totalStockOut = db.out.reduce(function(sum, entry) {
        return sum + entry.qty;
    }, 0);

    const uniqueItems = [];

    db.in.forEach(function(entry) {
        if (uniqueItems.indexOf(entry.item) === -1) {
            uniqueItems.push(entry.item);
        }
    });

    db.out.forEach(function(entry) {
        if (uniqueItems.indexOf(entry.item) === -1) {
            uniqueItems.push(entry.item);
        }
    });

    const totalRevenue = db.out.reduce(function(sum, entry) {
        return sum + entry.total;
    }, 0);

    document.getElementById('dash-total-in').textContent = totalStockIn;
    document.getElementById('dash-total-out').textContent = totalStockOut;
    document.getElementById('dash-unique-items').textContent = uniqueItems.length;
    document.getElementById('dash-revenue').textContent = 'PKR ' + totalRevenue.toLocaleString();

    // RECENT ACTIVITY
    const recentActivityElement = document.getElementById('recent-activity');

    if (recentActivityElement) {
        const allActivities = [];

        db.in.forEach(function(entry) {
            allActivities.push({
                item: entry.item,
                qty: entry.qty,
                date: entry.date,
                type: 'IN'
            });
        });

        db.out.forEach(function(entry) {
            allActivities.push({
                item: entry.item,
                qty: entry.qty,
                date: entry.date,
                type: 'OUT'
            });
        });

        allActivities.sort(function(a, b) {
            return new Date(b.date) - new Date(a.date);
        });

        const recentActivities = allActivities.slice(0, 10);

        if (recentActivities.length === 0) {
            recentActivityElement.innerHTML = '<p style="color:#94a3b8;text-align:center;padding:20px;">No activity recorded yet</p>';
        } else {
            let html = '';

            recentActivities.forEach(function(activity) {
                const color = activity.type === 'IN' ? '#10b981' : '#ef4444';
                const icon = activity.type === 'IN' ? '📥 +' : '📤 -';

                html += '<div class="activity-item">' +
                    '<span><strong>' + activity.item + '</strong> <span style="color:' + color + ';font-weight:bold;">' + icon + activity.qty + '</span></span>' +
                    '<span style="color:#94a3b8;font-size:12px;">' + activity.date + '</span>' +
                    '</div>';
            });

            recentActivityElement.innerHTML = html;
        }
    }
}

// ================================================================
// SECTION 15: DELETE ENTRY
// ================================================================

async function deleteEntry(type, index) {
    if (!confirm('⚠️ Are you sure you want to delete this record?')) {
        return;
    }

    const record = db[type][index];

    if (record && record.id) {
        try {
            const { error } = await _supabase.from('KRT').delete().eq('id', record.id);

            if (error) {
                showNotificationMessage('❌ Delete failed: ' + error.message, 'error');
                return;
            }
        } catch (error) {
            showNotificationMessage('❌ Network error!', 'error');
            return;
        }
    }

    db[type].splice(index, 1);
    saveAllDataToLocalStorage();
    renderAllData();
    updateDashboardStatistics();

    showNotificationMessage('✅ Record deleted successfully!', 'success');
}

// ================================================================
// SECTION 16: EDIT ENTRY
// ================================================================

async function editEntry(type, index) {
    const data = db[type][index];

    const newQuantity = prompt('Enter new quantity:', data.qty);
    if (newQuantity === null) return;

    const newPrice = prompt('Enter new price:', data.price);
    if (newPrice === null) return;

    try {
        const { error } = await _supabase.from('KRT').update({
            stock_in: type === 'in' ? Number(newQuantity) : 0,
            stock_out: type === 'out' ? Number(newQuantity) : 0,
            price: Number(newPrice) || 0
        }).eq('id', data.id);

        if (error) {
            showNotificationMessage('❌ Update failed: ' + error.message, 'error');
            return;
        }

        db[type][index].qty = Number(newQuantity);
        db[type][index].price = Number(newPrice) || 0;
        db[type][index].total = Number(newQuantity) * (Number(newPrice) || 0);

        saveAllDataToLocalStorage();
        renderAllData();
        updateDashboardStatistics();

        const searchPage = document.getElementById('page-search');
        if (searchPage && searchPage.style.display !== 'none') {
            generateMasterSearch();
        }

        showNotificationMessage('✅ Entry updated successfully!', 'success');
    } catch (error) {
        showNotificationMessage('❌ Network error!', 'error');
    }
}

// ================================================================
// SECTION 17: MASTER SEARCH
// ================================================================

function generateMasterSearch() {
    const fromDate = document.getElementById('master-from').value;
    const toDate = document.getElementById('master-to').value;

    if (!fromDate || !toDate) {
        showNotificationMessage('⚠️ Please select both dates!', 'warning');
        return;
    }

    const filteredIn = db.in.filter(function(entry) {
        return entry.date >= fromDate && entry.date <= toDate;
    });

    const filteredOut = db.out.filter(function(entry) {
        return entry.date >= fromDate && entry.date <= toDate;
    });

    // SEARCH RESULTS - STOCK IN
    const inSearchTable = document.querySelector('#master-in-table');

    if (inSearchTable) {
        if (filteredIn.length === 0) {
            inSearchTable.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No stock in records found</td></tr>';
        } else {
            let html = '';

            filteredIn.forEach(function(entry) {
                const index = db.in.indexOf(entry);

                html += '<tr>' +
                    '<td>' + entry.date + '</td>' +
                    '<td><strong>' + entry.item + '</strong></td>' +
                    '<td>' + entry.vendor + '</td>' +
                    '<td>' + entry.qty + '</td>' +
                    '<td>' + entry.price + '</td>' +
                    '<td>' + entry.total + '</td>' +
                    '<td>' +
                    '<button class="btn-action btn-edit" onclick="editEntry(\'in\',' + index + ')">Edit</button> ' +
                    '<button class="btn-action btn-delete" onclick="deleteEntry(\'in\',' + index + ')">Del</button>' +
                    '</td>' +
                    '</tr>';
            });

            inSearchTable.innerHTML = html;
        }
    }

    // SEARCH RESULTS - STOCK OUT
    const outSearchTable = document.querySelector('#master-out-table');

    if (outSearchTable) {
        if (filteredOut.length === 0) {
            outSearchTable.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;color:#94a3b8;">No stock out records found</td></tr>';
        } else {
            let html = '';

            filteredOut.forEach(function(entry) {
                const index = db.out.indexOf(entry);

                html += '<tr>' +
                    '<td>' + entry.date + '</td>' +
                    '<td><strong>' + entry.item + '</strong></td>' +
                    '<td>' + entry.cust + '</td>' +
                    '<td>' + entry.qty + '</td>' +
                    '<td>' + entry.price + '</td>' +
                    '<td>' + entry.total + '</td>' +
                    '<td>' +
                    '<button class="btn-action btn-edit" onclick="editEntry(\'out\',' + index + ')">Edit</button> ' +
                    '<button class="btn-action btn-delete" onclick="deleteEntry(\'out\',' + index + ')">Del</button>' +
                    '</td>' +
                    '</tr>';
            });

            outSearchTable.innerHTML = html;
        }
    }

    const totalRecordsFound = filteredIn.length + filteredOut.length;
    showNotificationMessage('✅ Found ' + totalRecordsFound + ' records', 'success');
}

// ================================================================
// SECTION 18: GENERATE REPORT
// ================================================================

function generateCustomReport() {
    const fromDate = document.getElementById('rep-from-date').value;
    const toDate = document.getElementById('rep-to-date').value;

    if (!fromDate || !toDate) {
        showNotificationMessage('⚠️ Please select both dates!', 'warning');
        return;
    }

    document.getElementById('report-period').innerHTML = '📅 Period: ' + fromDate + ' to ' + toDate;

    const filteredIn = db.in.filter(function(entry) {
        return entry.date >= fromDate && entry.date <= toDate;
    });

    const filteredOut = db.out.filter(function(entry) {
        return entry.date >= fromDate && entry.date <= toDate;
    });

    // REPORT - STOCK IN
    const inReportTable = document.querySelector('#rep-in-table');

    if (inReportTable) {
        if (filteredIn.length === 0) {
            inReportTable.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No stock in records found</td></tr>';
        } else {
            let html = '';

            filteredIn.forEach(function(entry) {
                html += '<tr>' +
                    '<td>' + entry.date + '</td>' +
                    '<td><strong>' + entry.item + '</strong></td>' +
                    '<td>' + entry.vendor + '</td>' +
                    '<td>' + entry.qty + '</td>' +
                    '<td>' + entry.price + '</td>' +
                    '<td>' + entry.total.toLocaleString() + '</td>' +
                    '</tr>';
            });

            inReportTable.innerHTML = html;
        }
    }

    // REPORT - STOCK OUT
    const outReportTable = document.querySelector('#rep-out-table');

    if (outReportTable) {
        if (filteredOut.length === 0) {
            outReportTable.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:20px;color:#94a3b8;">No stock out records found</td></tr>';
        } else {
            let html = '';

            filteredOut.forEach(function(entry) {
                html += '<tr>' +
                    '<td>' + entry.date + '</td>' +
                    '<td><strong>' + entry.item + '</strong></td>' +
                    '<td>' + entry.cust + '</td>' +
                    '<td>' + entry.qty + '</td>' +
                    '<td>' + entry.price + '</td>' +
                    '<td>' + entry.total.toLocaleString() + '</td>' +
                    '</tr>';
            });

            outReportTable.innerHTML = html;
        }
    }

    // REPORT SUMMARY
    const totalInValue = filteredIn.reduce(function(sum, entry) {
        return sum + entry.total;
    }, 0);

    const totalOutValue = filteredOut.reduce(function(sum, entry) {
        return sum + entry.total;
    }, 0);

    const profit = totalOutValue - totalInValue;
    const profitColor = profit >= 0 ? '#10b981' : '#ef4444';
    const profitLabel = profit >= 0 ? 'Profit' : 'Loss';

    document.querySelectorAll('.report-summary').forEach(function(element) {
        element.remove();
    });

    const summaryElement = document.createElement('div');
    summaryElement.className = 'report-summary';
    summaryElement.style.cssText = 'display:flex;justify-content:space-around;background:#0f172a;color:white;padding:15px;border-radius:8px;margin-top:20px;flex-wrap:wrap;gap:10px;';
    summaryElement.innerHTML =
        '<span>📥 Total IN: PKR ' + totalInValue.toLocaleString() + '</span>' +
        '<span>📤 Total OUT: PKR ' + totalOutValue.toLocaleString() + '</span>' +
        '<span style="color:' + profitColor + ';font-weight:bold;">💰 ' + profitLabel + ': PKR ' + Math.abs(profit).toLocaleString() + '</span>';

    const printArea = document.getElementById('print-area');
    if (printArea) {
        printArea.appendChild(summaryElement);
    }

    showNotificationMessage('✅ Report generated successfully!', 'success');
}

// ================================================================
// SECTION 19: CUSTOMER LEDGERS
// ================================================================

function updateCustomerDropdownList() {
    const customerList = document.getElementById('customer-list');
    if (!customerList) return;

    const customers = Object.keys(db.ledgers);
    let html = '';

    customers.forEach(function(name) {
        html += '<option value="' + name + '">';
    });

    customerList.innerHTML = html;
}

function saveLedgerEntry() {
    const customerName = document.getElementById('ledger-cust-name').value.trim();
    const date = document.getElementById('led-date').value;
    const item = document.getElementById('led-item').value || '-';
    const ctn = parseFloat(document.getElementById('led-ctn').value) || 0;
    const debitAmount = parseFloat(document.getElementById('led-debit').value) || 0;
    const creditAmount = parseFloat(document.getElementById('led-credit').value) || 0;
    const paymentMethod = document.getElementById('led-method').value;

    if (!customerName) {
        showNotificationMessage('⚠️ Please enter customer name!', 'warning');
        return;
    }

    if (!date) {
        showNotificationMessage('⚠️ Please select a date!', 'warning');
        return;
    }

    if (!db.ledgers[customerName]) {
        db.ledgers[customerName] = [];
        db.opening_balances[customerName] = 0;
    }

    db.ledgers[customerName].push({
        date: date,
        item: item,
        ctn: ctn,
        debit: debitAmount,
        credit: creditAmount,
        method: paymentMethod
    });

    saveAllDataToLocalStorage();
    updateCustomerDropdownList();
    displayLedgerData();

    document.getElementById('led-item').value = '';
    document.getElementById('led-ctn').value = '0';
    document.getElementById('led-debit').value = '0';
    document.getElementById('led-credit').value = '0';

    showNotificationMessage('✅ Entry saved for ' + customerName + '!', 'success');
}

function updateOpeningBalance() {
    const customerName = document.getElementById('ledger-cust-name').value.trim();
    const openingBalance = parseFloat(document.getElementById('opening-bal').value) || 0;

    if (customerName) {
        db.opening_balances[customerName] = openingBalance;
        saveAllDataToLocalStorage();
        displayLedgerData();
    }
}

function displayLedgerData() {
    const customerName = document.getElementById('ledger-cust-name').value.trim();
    const ledgerTableBody = document.getElementById('ledger-table-body');

    if (!ledgerTableBody) return;

    const openingBalance = parseFloat(db.opening_balances[customerName]) || 0;
    document.getElementById('opening-bal').value = openingBalance;

    if (!customerName || !db.ledgers[customerName]) {
        document.getElementById('total-ctn').textContent = '0';
        document.getElementById('total-debit').textContent = '0';
        document.getElementById('total-credit').textContent = '0';
        document.getElementById('final-balance').textContent = '💰 Balance: 0';

        ledgerTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:#94a3b8;">No entries found for this customer</td></tr>';
        return;
    }

    let totalCTN = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    let html = '';

    db.ledgers[customerName].forEach(function(entry, index) {
        totalCTN += Number(entry.ctn || 0);
        totalDebit += Number(entry.debit || 0);
        totalCredit += Number(entry.credit || 0);

        html += '<tr>' +
            '<td>' + (index + 1) + '</td>' +
            '<td>' + entry.date + '</td>' +
            '<td>' + entry.item + '</td>' +
            '<td>' + entry.ctn + '</td>' +
            '<td style="color:#ef4444;">' + entry.debit.toLocaleString() + '</td>' +
            '<td style="color:#10b981;">' + entry.credit.toLocaleString() + '</td>' +
            '<td>' + entry.method + '</td>' +
            '<td>' +
            '<button class="btn-action btn-edit" onclick="editLedgerEntry(\'' + customerName + '\',' + index + ')">Edit</button> ' +
            '<button class="btn-action btn-delete" onclick="deleteLedgerEntry(\'' + customerName + '\',' + index + ')">Del</button>' +
            '</td>' +
            '</tr>';
    });

    ledgerTableBody.innerHTML = html;

    document.getElementById('total-ctn').textContent = totalCTN;
    document.getElementById('total-debit').textContent = totalDebit.toLocaleString();
    document.getElementById('total-credit').textContent = totalCredit.toLocaleString();

    const finalBalance = (openingBalance + totalDebit) - totalCredit;
    const balanceElement = document.getElementById('final-balance');
    balanceElement.textContent = '💰 Balance: ' + finalBalance.toLocaleString();
    balanceElement.style.background = finalBalance >= 0 ? '#10b981' : '#ef4444';
    balanceElement.style.color = 'white';
    balanceElement.style.padding = '6px 12px';
    balanceElement.style.borderRadius = '6px';
}

function deleteLedgerEntry(customerName, index) {
    if (!confirm('⚠️ Are you sure you want to delete this ledger entry?')) {
        return;
    }

    db.ledgers[customerName].splice(index, 1);
    saveAllDataToLocalStorage();
    displayLedgerData();

    showNotificationMessage('✅ Ledger entry deleted!', 'success');
}

function editLedgerEntry(customerName, index) {
    const entry = db.ledgers[customerName][index];

    const newDebit = prompt('Enter new debit amount:', entry.debit);
    if (newDebit === null) return;

    const newCredit = prompt('Enter new credit amount:', entry.credit);
    if (newCredit === null) return;

    db.ledgers[customerName][index].debit = Number(newDebit);
    db.ledgers[customerName][index].credit = Number(newCredit);

    saveAllDataToLocalStorage();
    displayLedgerData();

    showNotificationMessage('✅ Ledger entry updated!', 'success');
}

// ================================================================
// SECTION 20: RENT BOOK
// ================================================================

function addRentEntry() {
    const name = document.getElementById('rent-name').value.trim();
    const shop = document.getElementById('rent-shop-no').value || '-';
    const date = document.getElementById('rent-date').value;
    const month = document.getElementById('rent-month').value || '-';
    const debit = parseFloat(document.getElementById('rent-debit').value) || 0;
    const credit = parseFloat(document.getElementById('rent-credit').value) || 0;
    const method = document.getElementById('rent-method').value;

    if (!name) {
        showNotificationMessage('⚠️ Please enter shopkeeper name!', 'warning');
        return;
    }

    if (!date) {
        showNotificationMessage('⚠️ Please select a date!', 'warning');
        return;
    }

    dbRent.push({
        name: name,
        shop: shop,
        date: date,
        month: month,
        debit: debit,
        credit: credit,
        method: method
    });

    saveAllDataToLocalStorage();
    renderRentDataTable();

    showNotificationMessage('✅ Rent entry saved for ' + name + '!', 'success');
}

function renderRentDataTable() {
    const rentTableBody = document.getElementById('rent-main-rows');
    const searchName = document.getElementById('rent-name').value.trim();

    if (!rentTableBody) return;

    let totalDebit = 0;
    let totalCredit = 0;

    const filteredRentEntries = dbRent.filter(function(entry) {
        return entry.name.toLowerCase() === searchName.toLowerCase();
    });

    if (filteredRentEntries.length === 0) {
        rentTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:25px;color:#94a3b8;">📭 No rent records found</td></tr>';
    } else {
        let html = '';

        filteredRentEntries.forEach(function(entry) {
            const index = dbRent.indexOf(entry);
            totalDebit += entry.debit;
            totalCredit += entry.credit;

            html += '<tr>' +
                '<td>' + (entry.shop || 'N/A') + '</td>' +
                '<td>' + entry.date + '</td>' +
                '<td>' + entry.month + '</td>' +
                '<td style="color:#ef4444;font-weight:600;">' + entry.debit.toLocaleString() + '</td>' +
                '<td style="color:#10b981;font-weight:600;">' + entry.credit.toLocaleString() + '</td>' +
                '<td>' + entry.method + '</td>' +
                '<td><button class="btn-action btn-delete" onclick="deleteRentEntry(' + index + ')">Del</button></td>' +
                '</tr>';
        });

        rentTableBody.innerHTML = html;
    }

    document.getElementById('rent-total-debit').textContent = totalDebit.toLocaleString();
    document.getElementById('rent-total-credit').textContent = totalCredit.toLocaleString();
    document.getElementById('rent-final-balance').textContent = (totalDebit - totalCredit).toLocaleString();
}

function deleteRentEntry(index) {
    if (!confirm('⚠️ Are you sure you want to delete this rent entry?')) {
        return;
    }

    dbRent.splice(index, 1);
    saveAllDataToLocalStorage();
    renderRentDataTable();

    showNotificationMessage('✅ Rent entry deleted!', 'success');
}

// ================================================================
// SECTION 21: MULTI-USER MANAGEMENT
// ================================================================

function createNewUser() {
    const fullName = document.getElementById('new-username').value;
    const userId = document.getElementById('new-userid').value;
    const password = document.getElementById('new-password').value;
    const permissions = [];

    document.querySelectorAll('.perm:checked').forEach(function(checkbox) {
        permissions.push(checkbox.value);
    });

    if (!fullName || !userId || !password) {
        showNotificationMessage('⚠️ Please fill all fields!', 'warning');
        return;
    }

    extraUsers.push({
        id: userId,
        pass: password,
        name: fullName,
        perms: permissions
    });

    saveAllDataToLocalStorage();
    loadUsersTable();

    document.getElementById('new-username').value = '';
    document.getElementById('new-userid').value = '';
    document.getElementById('new-password').value = '';

    document.querySelectorAll('.perm').forEach(function(checkbox) {
        checkbox.checked = false;
    });

    showNotificationMessage('✅ User "' + fullName + '" created successfully!', 'success');
}

function loadUsersTable() {
    const usersTableBody = document.getElementById('user-table-body');

    if (!usersTableBody) return;

    if (extraUsers.length === 0) {
        usersTableBody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px;color:#94a3b8;">No users created yet</td></tr>';
    } else {
        let html = '';

        extraUsers.forEach(function(user, index) {
            html += '<tr>' +
                '<td><strong>' + user.id + '</strong></td>' +
                '<td>' + user.name + '</td>' +
                '<td><small>' + user.perms.join(', ') + '</small></td>' +
                '<td><button class="btn-action btn-delete" onclick="deleteExtraUser(' + index + ')">Del</button></td>' +
                '</tr>';
        });

        usersTableBody.innerHTML = html;
    }
}

function deleteExtraUser(index) {
    if (!confirm('⚠️ Are you sure you want to delete this user?')) {
        return;
    }

    extraUsers.splice(index, 1);
    saveAllDataToLocalStorage();
    loadUsersTable();

    showNotificationMessage('✅ User deleted successfully!', 'success');
}

// ================================================================
// SECTION 22: SIDEBAR AND NAVIGATION
// ================================================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');

    if (sidebar.style.left === '0px' || sidebar.style.left === '') {
        sidebar.style.left = '-250px';
        mainContent.style.marginLeft = '0';
    } else {
        sidebar.style.left = '0px';
        mainContent.style.marginLeft = '250px';
    }
}

function switchPage(pageId, pageTitle) {
    // Hide all pages
    document.querySelectorAll('.erp-page').forEach(function(page) {
        page.style.display = 'none';
    });

    // Show selected page
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) {
        selectedPage.style.display = 'block';
    }

    // Update page title
    const titleElement = document.getElementById('page-title');
    if (titleElement) {
        titleElement.innerHTML = '<i class="fas fa-chart-line"></i> KRT ERP - ' + pageTitle;
    }

    // Update active sidebar item
    document.querySelectorAll('#sidebar ul li').forEach(function(item) {
        item.classList.remove('active');
    });

    document.querySelectorAll('#sidebar ul li').forEach(function(item) {
        const onclickAttribute = item.getAttribute('onclick') || '';
        if (onclickAttribute.includes(pageId)) {
            item.classList.add('active');
        }
    });

    // Close sidebar on mobile
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');

        if (sidebar) sidebar.style.left = '-250px';
        if (mainContent) mainContent.style.marginLeft = '0';
    }

    resetIdleTimer();
}

function logout() {
    if (!confirm('🚪 Are you sure you want to logout?')) {
        return;
    }

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');

    if (idleTimerReference) {
        clearTimeout(idleTimerReference);
        idleTimerReference = null;
    }

    if (idleScreenIntervalReference) {
        clearInterval(idleScreenIntervalReference);
        idleScreenIntervalReference = null;
    }

    const idleOverlay = document.getElementById('idle-overlay');
    if (idleOverlay) idleOverlay.style.display = 'none';

    isIdleScreenActive = false;

    location.reload();
}

function printReport() {
    if (!db || !db.in) {
        showNotificationMessage('⚠️ Data not loaded yet!', 'warning');
        return;
    }

    window.print();
}

// ================================================================
// SECTION 23: ITEM DROPDOWN UPDATE
// ================================================================

function updateItemDropdownList() {
    const itemList = document.getElementById('items-list');

    if (!itemList) return;

    const uniqueItems = [];

    db.in.forEach(function(entry) {
        if (uniqueItems.indexOf(entry.item) === -1) {
            uniqueItems.push(entry.item);
        }
    });

    db.out.forEach(function(entry) {
        if (uniqueItems.indexOf(entry.item) === -1) {
            uniqueItems.push(entry.item);
        }
    });

    let html = '';

    uniqueItems.forEach(function(item) {
        html += '<option value="' + item + '">';
    });

    itemList.innerHTML = html;
}

// ================================================================
// SECTION 24: APPLICATION STARTUP
// ================================================================

document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 KRT ERP v5.1 - Starting Application');
    console.log('📦 Developed by Bilal Suleman');
    console.log('🐘 Elephant Never Forgets!');

    // Load all data from localStorage
    loadAllDataFromLocalStorage();

    // Render all data
    renderAllData();
    renderRentDataTable();
    loadUsersTable();
    updateCustomerDropdownList();
    updateItemDropdownList();

    // Sync with cloud if online (MERGE mode - preserves existing data)
    if (navigator.onLine) {
        await fetchStockDataFromSupabase();
        await fetchRentDataFromSupabase();
        renderAllData();
        renderRentDataTable();
    } else {
        showNotificationMessage('⚠️ Offline mode - Using local data only', 'warning');
    }

    // Check if user is already logged in
    const isLoggedIn = localStorage.getItem('isLoggedIn');

    if (isLoggedIn === 'true') {
        const loginScreen = document.getElementById('login-screen');
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const toggleButton = document.getElementById('toggle-btn');

        if (loginScreen) loginScreen.style.display = 'none';
        if (sidebar) sidebar.style.display = 'block';
        if (mainContent) mainContent.style.display = 'block';
        if (toggleButton) toggleButton.style.display = 'block';

        renderAllData();
    }
});

// ================================================================
// SECTION 25: EVENT LISTENERS
// ================================================================

// Rent book live search
document.addEventListener('DOMContentLoaded', function() {
    const rentNameInput = document.getElementById('rent-name');

    if (rentNameInput) {
        rentNameInput.addEventListener('input', renderRentDataTable);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Ctrl + S = Sync
    if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        synchronizeWithCloud();
    }

    // Escape = Close sidebar
    if (event.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');

        if (sidebar && sidebar.style.left === '0px') {
            toggleSidebar();
        }
    }
});

console.log('✅ KRT ERP v5.1 - Application Ready!');
console.log('📊 Total IN entries:', db.in.length);
console.log('📊 Total OUT entries:', db.out.length);
console.log('📊 Total customers:', Object.keys(db.ledgers).length);
console.log('📊 Total rent entries:', dbRent.length);
console.log('📊 Total users:', extraUsers.length);
