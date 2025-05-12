// Variables defined at module scope for wider accessibility
let marketCards;
let selectedMarketInput;
let hawalaForm;
// History tab related variables
let allTransactionRows = [];
let filteredTransactionRows = [];
let currentDisplayDate = null;
let availableTransactionDates = [];
// Sorting variables
let currentSortField = 'market';
let currentSortDirection = 'asc';
let sortByTransactionType = true; // When true, receive transactions will come first

// Function to handle transaction row clicks and redirect to details page
function goToTransactionDetails(url) {
    if (url) {
        window.location.href = url;
    }
}

// Function to handle delete button click
function confirmDelete(event, transactionId) {
    // Prevent the click from bubbling up to the row (which would navigate to details)
    event.stopPropagation();
    
    // Show the delete confirmation modal
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteModal'));
    deleteModal.show();
    
    // Set up the confirm button to actually delete the transaction
    const confirmDeleteBtn = document.getElementById('confirmDelete');
    confirmDeleteBtn.onclick = async function() {
        try {
            const response = await fetch(`/hawala/delete/${transactionId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete transaction');
            }
            
            // Hide the modal
            deleteModal.hide();
            
            // Remove the row from the DOM
            const row = document.querySelector(`tr[data-transaction-id="${transactionId}"]`);
            if (row) {
                row.remove();
            } else {
                // If we couldn't find the row by data attribute, refresh transactions
                fetchAndUpdateTransactions();
                return;
            }
            
            // Update transaction arrays
            allTransactionRows = Array.from(document.querySelectorAll('#historyTab tbody tr:not(.no-transactions)'));
            
            // Re-filter rows
            applyTransactionFilters();
            
            // Update summary statistics
            updateTransactionSummary();
            
            // Show a success toast notification
            showToast('Transaction deleted successfully', 'success');
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showToast('Error deleting transaction. Please try again.', 'error');
        }
    };
}

// Function to handle edit button click
function showEditModal(event, transactionData) {
    // Prevent the click from bubbling up to the row
    event.stopPropagation();
    
    try {
        // Parse transaction data
        const transaction = JSON.parse(transactionData.replace(/&quot;/g, '"'));
        
        // Fill the form fields
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editAmount').value = transaction.amount;
        document.getElementById('editCurrency').value = transaction.currency || 'USD';
        document.getElementById('editMarket').value = transaction.market;
        document.getElementById('editAccountName').value = transaction.accountName;
        document.getElementById('editNusinga').value = transaction.nusinga || '';
        document.getElementById('editTransactionType').value = transaction.transactionType;
        document.getElementById('editPurpose').value = transaction.purpose || '';
        
        // Show the edit modal
        const editModal = new bootstrap.Modal(document.getElementById('editModal'));
        editModal.show();
        
        // Set up the save button
        const confirmEditBtn = document.getElementById('confirmEdit');
        confirmEditBtn.onclick = async function() {
            // Get form and validate
            const form = document.getElementById('editTransactionForm');
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Get form data
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            try {
                const response = await fetch(`/hawala/update/${data.id}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update transaction');
                }
                
                // Get updated transaction data
                const updatedTransaction = await response.json();
                
                // Hide the modal
                editModal.hide();
                
                // Update the row in the table without page reload
                if (updatedTransaction) {
                    // Find the row with this transaction ID
                    const row = document.querySelector(`tr[data-transaction-id="${data.id}"]`);
                    if (row) {
                        // Update the row with new data
                        updateTransactionRow(row, updatedTransaction);
                    } else {
                        // If row can't be found, refresh all transactions
                        fetchAndUpdateTransactions();
                    }
                    
                    // Apply filters again
                    applyTransactionFilters();
                    
                    // Update summary statistics
                    updateTransactionSummary();
                    
                    // Show success notification
                    showToast('Transaction updated successfully', 'success');
                }
            } catch (error) {
                console.error('Error updating transaction:', error);
                showToast('Error updating transaction. Please try again.', 'error');
            }
        };
    } catch (error) {
        console.error('Error showing edit modal:', error);
        alert('Error loading transaction data. Please try again.');
    }
}

// Function to toggle market sort and update the UI
function toggleMarketSort(event) {
    console.log('Toggle market sort called, current direction:', currentSortDirection);
    
    // Toggle sort direction if already sorting by market
    if (currentSortField === 'market') {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = 'market';
        currentSortDirection = 'asc';
    }
    
    console.log('New sort direction:', currentSortDirection);

    // Update sort indicator icon
    const sortIndicator = document.querySelector('.sortable-header .sort-indicator i');
    if (sortIndicator) {
        sortIndicator.className = currentSortDirection === 'asc' ? 'bi bi-sort-alpha-down' : 'bi bi-sort-alpha-up';
    }
    
    // Apply the sorting
    sortTransactions();
    
    // Prevent the default click action and event propagation
    event.preventDefault();
    event.stopPropagation();
    return false;
}

// Function to sort transactions by market name and transaction type
function sortTransactions() {
    try {
        if (!filteredTransactionRows || filteredTransactionRows.length === 0) {
            console.log('No rows to sort');
            return;
        }
        
        console.log(`Sorting ${filteredTransactionRows.length} rows by ${currentSortField}, direction: ${currentSortDirection}`);
        
        // Create a copy of the filtered rows for sorting
        const rowsToSort = [...filteredTransactionRows];
        
        // Sort the rows
        rowsToSort.sort((a, b) => {
            try {
                // Get market names for comparison
                const marketA = a.querySelector('td[data-market]').getAttribute('data-market').toUpperCase();
                const marketB = b.querySelector('td[data-market]').getAttribute('data-market').toUpperCase();
                
                // Get transaction types if we need to sort by them first
                if (sortByTransactionType) {
                    const typeA = a.querySelector('td[data-transaction-type]').getAttribute('data-transaction-type');
                    const typeB = b.querySelector('td[data-transaction-type]').getAttribute('data-transaction-type');
                    
                    // If markets are the same, sort by transaction type (receive first)
                    if (marketA === marketB) {
                        // For receive transactions, return -1 to place them first
                        // For send transactions, return 1 to place them last
                        if (typeA === 'receive' && typeB !== 'receive') return -1;
                        if (typeA !== 'receive' && typeB === 'receive') return 1;
                    }
                }
                
                // Sort by market name according to current direction
                const comparison = marketA.localeCompare(marketB);
                return currentSortDirection === 'asc' ? comparison : -comparison;
            } catch (err) {
                console.error('Error comparing rows:', err);
                return 0; // Keep original order if comparison fails
            }
        });
        
        // Get table body and apply the new order
        const tbody = document.querySelector('#historyTab .table tbody');
        if (!tbody) return;
        
        // Remove all existing rows from DOM temporarily for the sort
        const noTransactionsRow = tbody.querySelector('.no-transactions');
        if (noTransactionsRow) {
            tbody.removeChild(noTransactionsRow);
        }
        
        // Clear the filtered rows from the DOM
        rowsToSort.forEach(row => {
            if (row.parentNode === tbody) {
                tbody.removeChild(row);
            }
        });
        
        // Append sorted rows
        rowsToSort.forEach(row => tbody.appendChild(row));
        
        // Add back the no-transactions row if it existed
        if (noTransactionsRow) {
            tbody.appendChild(noTransactionsRow);
        }
        
        console.log('Sorted rows by market. Direction:', currentSortDirection, 'Row count:', rowsToSort.length);
    } catch (error) {
        console.error('Error sorting transactions:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    // Set up event listeners
    setupEventListeners();
    // Initialize history tab if we're on that tab
    initializeHistoryTabIfActive();
    
    // If we're already on the history tab (in URL params), ensure sorting is applied
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'history') {
        // Force a sort on initial load - this helps ensure the sorting is applied
        setTimeout(() => {
            console.log('Applying initial sort to market column');
            sortTransactions();
        }, 100);
    }
    
    // Log initialization for debugging
    console.log('Hawala script initialized');
});

function initializeElements() {
    try {
        marketCards = document.querySelectorAll('.market-card');
        selectedMarketInput = document.getElementById('selectedMarket');
        hawalaForm = document.getElementById('hawalaForm');

        if (!selectedMarketInput) {
            console.error('Selected market input not found');
            return;
        }
        if (!hawalaForm) {
            console.error('Hawala form not found');
            return;
        }
        if (marketCards.length === 0) {
            console.warn('No market cards found. Please add markets first.');
        } else {
            console.log('Market cards found:', marketCards.length);
        }
    } catch (error) {
        console.error('Error initializing elements:', error);
    }
}

function initializeHistoryTabIfActive() {
    // Check if we're on the history tab (either via URL parameter or default state)
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    const isHistoryTab = tabParam === 'history';
    
    if (isHistoryTab) {
        // If we're on history tab, initialize it immediately
        console.log('History tab is active, initializing...');
        initializeHistoryTab();
    } else {
        // Otherwise, set up listener for tab change
        console.log('History tab not active, setting up listener for tab changes');
        const historyTab = document.getElementById('history-tab');
        if (historyTab) {
            historyTab.addEventListener('shown.bs.tab', function(e) {
                console.log('History tab shown, initializing...');
                initializeHistoryTab();
            });
        }
    }
}

function initializeHistoryTab() {
    try {
        // Get all transaction rows
        allTransactionRows = Array.from(document.querySelectorAll('#historyTab tbody tr:not(.no-transactions)'));
        
        // Extract unique dates from transactions and ensure midnight UTC
        availableTransactionDates = [...new Set(allTransactionRows.map(row => {
            const dateCell = row.querySelector('td[data-date]');
            if (!dateCell) return null;
            const date = new Date(dateCell.getAttribute('data-date'));
            return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0];
        }))].filter(Boolean).sort().reverse(); // Sort dates in descending order
        
        console.log('Available dates found:', availableTransactionDates);
        
        // Set initial date from URL or use the most recent date
        const urlParams = new URLSearchParams(window.location.search);
        currentDisplayDate = urlParams.get('date') || availableTransactionDates[0] || new Date().toISOString().split('T')[0];
        
        console.log('Current display date set to:', currentDisplayDate);
        
        // Apply market filter if present in URL
        const marketParam = urlParams.get('market');
        const marketFilter = document.getElementById('marketFilter');
        if (marketParam && marketFilter) {
            marketFilter.value = marketParam;
        }
        
        // Initialize date picker if it exists
        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            // If flatpickr is available
            if (typeof flatpickr === 'function') {
                flatpickr(dateFilter, {
                    dateFormat: "Y-m-d",
                    enableTime: false,
                    maxDate: "today",
                    defaultDate: currentDisplayDate,
                    onChange: function(selectedDates) {
                        if (selectedDates.length > 0) {
                            // Convert to UTC midnight to match our stored dates
                            const selectedDate = new Date(Date.UTC(
                                selectedDates[0].getFullYear(),
                                selectedDates[0].getMonth(),
                                selectedDates[0].getDate()
                            ));
                            currentDisplayDate = selectedDate.toISOString().split('T')[0];
                            console.log('Date changed to:', currentDisplayDate);
                            
                            // Ensure market sorting is maintained when changing dates
                            currentSortField = 'market';
                            currentSortDirection = 'asc';
                            
                            applyTransactionFilters();
                            updatePageURL();
                            initializeDatePagination();
                            
                            // Additional call to sortTransactions as a failsafe
                            setTimeout(() => {
                                console.log('Re-applying market sort after flatpickr date change');
                                sortTransactions();
                            }, 50);
                        }
                    }
                });
            }
        }
        
        // Set up market filter change event
        if (marketFilter) {
            marketFilter.addEventListener('change', () => {
                console.log('Market filter changed to:', marketFilter.value);
                applyTransactionFilters();
                updatePageURL();
            });
        }
        
        // Initially filter and display transactions
        applyTransactionFilters();
        
        // Set up pagination
        initializeDatePagination();
        
        // Update form return URLs
        updateFormReturnUrls();
        
        // Update summary statistics
        updateTransactionSummary();
        
        // Update sort indicator to reflect default sort
        const sortIndicator = document.querySelector('.sortable-header .sort-indicator i');
        if (sortIndicator) {
            sortIndicator.className = currentSortDirection === 'asc' ? 'bi bi-sort-alpha-down' : 'bi bi-sort-alpha-up';
        }
        
    } catch (error) {
        console.error('Error initializing history tab:', error);
    }
}

function applyTransactionFilters() {
    console.log('Applying transaction filters...');
    
    const marketFilter = document.getElementById('marketFilter');
    const selectedMarket = marketFilter ? marketFilter.value : '';
    
    // Hide all rows initially
    allTransactionRows.forEach(row => row.style.display = 'none');
    
    // Ensure sorting is set to market by default
    currentSortField = 'market';
    currentSortDirection = 'asc';
    
    // First filter by selected date
    filteredTransactionRows = allTransactionRows.filter(row => {
        const dateCell = row.querySelector('td[data-date]');
        if (!dateCell) return false;
        
        const rowDate = new Date(dateCell.getAttribute('data-date'));
        const rowDateStr = new Date(Date.UTC(
            rowDate.getFullYear(),
            rowDate.getMonth(),
            rowDate.getDate()
        )).toISOString().split('T')[0];
        
        return rowDateStr === currentDisplayDate;
    });
    
    console.log(`Found ${filteredTransactionRows.length} transactions for date ${currentDisplayDate}`);
    
    // Then apply market filter if selected
    if (selectedMarket) {
        filteredTransactionRows = filteredTransactionRows.filter(row => {
            const marketCell = row.querySelector('td[data-market]');
            return marketCell && marketCell.getAttribute('data-market') === selectedMarket;
        });
        console.log(`After market filter, ${filteredTransactionRows.length} transactions remain`);
    }
    
    // Apply sorting to the filtered rows (be explicit about sorting by market name)
    currentSortField = 'market'; // Ensure we always sort by market name
    sortTransactions();
    
    // Show filtered rows after sorting
    filteredTransactionRows.forEach(row => row.style.display = '');
    
    // Handle no results case
    const tbody = document.querySelector('#historyTab tbody');
    if (!tbody) return;
    
    // Remove any existing "no transactions" message
    const existingNoTransactions = tbody.querySelector('.no-transactions');
    if (existingNoTransactions) {
        existingNoTransactions.remove();
    }
    
    // Add "no transactions" message if needed
    if (filteredTransactionRows.length === 0) {
        const noTransactionsRow = document.createElement('tr');
        noTransactionsRow.className = 'no-transactions';
        const formattedDate = new Date(currentDisplayDate).toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        noTransactionsRow.innerHTML = `<td colspan="9" class="text-center">No transactions found for ${formattedDate}${selectedMarket ? ` in market: ${selectedMarket}` : ''}</td>`;
        tbody.appendChild(noTransactionsRow);
    }
    
    // Update summary statistics
    updateTransactionSummary();
}

function initializeDatePagination() {
    console.log('Initializing date pagination...');
    
    const pagination = document.getElementById('pagination');
    if (!pagination) {
        console.error('Pagination element not found');
        return;
    }
    
    // Clear existing pagination
    pagination.innerHTML = '';
    
    // If no dates available, don't show pagination
    if (!availableTransactionDates.length) {
        console.log('No dates available for pagination');
        return;
    }
    
    const currentDateIndex = availableTransactionDates.indexOf(currentDisplayDate);
    console.log('Current date index:', currentDateIndex, 'of', availableTransactionDates.length);
    
    // If current date isn't in available dates, use the first available date
    if (currentDateIndex === -1 && availableTransactionDates.length > 0) {
        currentDisplayDate = availableTransactionDates[0];
        console.log('Current date not found in available dates, using:', currentDisplayDate);
    }
    
    // Previous date button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item${currentDateIndex === availableTransactionDates.length - 1 || currentDateIndex === -1 ? ' disabled' : ''}`;
    prevLi.innerHTML = '<a class="page-link" href="#" aria-label="Previous"><i class="bi bi-chevron-left"></i></a>';
    
    if (currentDateIndex < availableTransactionDates.length - 1 && currentDateIndex !== -1) {
        prevLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentDisplayDate = availableTransactionDates[currentDateIndex + 1];
            console.log('Navigating to previous date:', currentDisplayDate);
            
            // Update date picker if available
            const dateFilter = document.getElementById('dateFilter');
            if (dateFilter && dateFilter._flatpickr) {
                dateFilter._flatpickr.setDate(currentDisplayDate, true);
            }
            
            // Ensure market sorting is applied with the new date
            currentSortField = 'market';
            currentSortDirection = 'asc';
            
            applyTransactionFilters();
            updatePageURL();
            initializeDatePagination();
            
            // Additional call to sortTransactions as a failsafe
            setTimeout(() => {
                console.log('Re-applying market sort after date change');
                sortTransactions();
            }, 50);
        });
    }
    pagination.appendChild(prevLi);
    
    // Current date indicator
    const currentLi = document.createElement('li');
    currentLi.className = 'page-item active';
    const formattedDate = new Date(currentDisplayDate + 'T00:00:00Z').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    currentLi.innerHTML = `<span class="page-link">${formattedDate}</span>`;
    pagination.appendChild(currentLi);
    
    // Next date button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item${currentDateIndex === 0 || currentDateIndex === -1 ? ' disabled' : ''}`;
    nextLi.innerHTML = '<a class="page-link" href="#" aria-label="Next"><i class="bi bi-chevron-right"></i></a>';
    
    if (currentDateIndex > 0) {
        nextLi.querySelector('a').addEventListener('click', (e) => {
            e.preventDefault();
            currentDisplayDate = availableTransactionDates[currentDateIndex - 1];
            console.log('Navigating to next date:', currentDisplayDate);
            
            // Update date picker if available
            const dateFilter = document.getElementById('dateFilter');
            if (dateFilter && dateFilter._flatpickr) {
                dateFilter._flatpickr.setDate(currentDisplayDate, true);
            }
            
            // Ensure market sorting is applied with the new date
            currentSortField = 'market';
            currentSortDirection = 'asc';
            
            applyTransactionFilters();
            updatePageURL();
            initializeDatePagination();
            
            // Additional call to sortTransactions as a failsafe
            setTimeout(() => {
                console.log('Re-applying market sort after date change');
                sortTransactions();
            }, 50);
        });
    }
    pagination.appendChild(nextLi);
}

function updatePageURL() {
    const params = new URLSearchParams(window.location.search);
    
    // Keep the tab parameter
    params.set('tab', 'history');
    
    // Update date parameter
    params.set('date', currentDisplayDate);
    
    // Update market parameter if present
    const marketFilter = document.getElementById('marketFilter');
    if (marketFilter && marketFilter.value) {
        params.set('market', marketFilter.value);
    } else {
        params.delete('market');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ date: currentDisplayDate }, '', newUrl);
    
    // Update form return URLs
    updateFormReturnUrls();
}

function updateFormReturnUrls() {
    document.querySelectorAll('form[action^="/toggle-hawala-status/"] input[name="returnUrl"]').forEach(input => {
        const tabElement = document.querySelector('.nav-link.active');
        const activeTab = tabElement ? tabElement.getAttribute('id').split('-')[0] : 'transfer';
        
        const params = new URLSearchParams();
        params.set('tab', activeTab);
        
        if (activeTab === 'history') {
            params.set('date', currentDisplayDate);
            
            const marketFilter = document.getElementById('marketFilter');
            if (marketFilter && marketFilter.value) {
                params.set('market', marketFilter.value);
            }
        }
        
        input.value = `/hawala?${params.toString()}`;
    });
}

function updateTransactionSummary() {
    // Check if all required elements exist
    const receiveBoxUsd = document.querySelector('.receive-box .amount.amount-usd');
    const receiveBoxIqd = document.querySelector('.receive-box .amount.amount-iqd');
    const receiveCount = document.getElementById('receiveCount');
    
    const sendBoxUsd = document.querySelector('.send-box .amount.amount-usd');
    const sendBoxIqd = document.querySelector('.send-box .amount.amount-iqd');
    const sendCount = document.getElementById('sendCount');
    
    const balanceBoxUsd = document.querySelector('.balance-box .amount#totalBalance');
    const balanceBoxIqd = document.querySelector('.balance-box .amount.amount-iqd');
    const totalCount = document.getElementById('totalCount');
    
    if (!receiveBoxUsd || !receiveBoxIqd || !receiveCount ||
        !sendBoxUsd || !sendBoxIqd || !sendCount ||
        !balanceBoxUsd || !balanceBoxIqd || !totalCount) {
        console.warn("Missing summary elements");
        return; // Some elements are missing, can't update summary
    }
    
    let totalReceivedUSD = 0;
    let totalReceivedIQD = 0;
    let totalSentUSD = 0;
    let totalSentIQD = 0;
    let receiveCountVal = 0;
    let sendCountVal = 0;
    
    // Calculate totals based on filtered rows
    filteredTransactionRows.forEach(row => {
        if (!row.classList.contains('no-transactions')) {
            // Get the amount cell which now contains the transaction type data attribute
            const amountCell = row.querySelector('td[data-transaction-type]');
            if (!amountCell) return;
            
            const amountText = amountCell.textContent.trim();
            const type = amountCell.getAttribute('data-transaction-type').toLowerCase();
            let amount = 0;
            
            if (amountText.startsWith('IQD')) {
                amount = parseFloat(amountText.replace('IQD', '').replace(/,/g, ''));
                if (isNaN(amount)) amount = 0;
                
                if (type === 'receive') {
                    totalReceivedIQD += amount;
                    receiveCountVal++;
                } else if (type === 'send') {
                    totalSentIQD += amount;
                    sendCountVal++;
                }
            } else if (amountText.startsWith('€')) {
                // Skip Euro transactions but still count them
                if (type === 'receive') {
                    receiveCountVal++;
                } else if (type === 'send') {
                    sendCountVal++;
                }
            } else {
                amount = parseFloat(amountText.replace('$', '').replace(/,/g, ''));
                if (isNaN(amount)) amount = 0;
                
                if (type === 'receive') {
                    totalReceivedUSD += amount;
                    receiveCountVal++;
                } else if (type === 'send') {
                    totalSentUSD += amount;
                    sendCountVal++;
                }
            }
        }
    });
    
    // Update summary display
    receiveBoxUsd.textContent = `$${totalReceivedUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    receiveBoxIqd.textContent = `IQD: ${totalReceivedIQD.toLocaleString()}`;
    receiveCount.textContent = `${receiveCountVal} Transactions`;
    
    sendBoxUsd.textContent = `$${totalSentUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    sendBoxIqd.textContent = `IQD: ${totalSentIQD.toLocaleString()}`;
    sendCount.textContent = `${sendCountVal} Transactions`;
    
    const balanceUSD = totalReceivedUSD - totalSentUSD;
    const balanceIQD = totalReceivedIQD - totalSentIQD;
    
    // Update balances with proper formatting and colors
    balanceBoxUsd.textContent = `$${Math.abs(balanceUSD).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    balanceBoxUsd.classList.remove('text-danger', 'text-success');
    balanceBoxUsd.classList.add(balanceUSD >= 0 ? 'text-success' : 'text-danger');
    
    balanceBoxIqd.textContent = `IQD: ${Math.abs(balanceIQD).toLocaleString()}`;
    balanceBoxIqd.classList.remove('text-danger', 'text-success');
    balanceBoxIqd.classList.add(balanceIQD >= 0 ? 'text-success' : 'text-danger');
    
    const formattedDate = new Date(currentDisplayDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    totalCount.textContent = `${receiveCountVal + sendCountVal} Transactions on ${formattedDate}`;
}

function clearDateFilter() {
    const dateFilter = document.getElementById('dateFilter');
    if (!dateFilter || !dateFilter._flatpickr) return;
    
    // Reset to most recent date
    currentDisplayDate = availableTransactionDates[0] || new Date().toISOString().split('T')[0];
    dateFilter._flatpickr.setDate(currentDisplayDate);
    
    // Ensure market sorting is maintained when clearing date filter
    currentSortField = 'market';
    currentSortDirection = 'asc';
    
    applyTransactionFilters();
    updatePageURL();
    initializeDatePagination();
    
    // Additional call to sortTransactions as a failsafe
    setTimeout(() => {
        console.log('Re-applying market sort after clearing date filter');
        sortTransactions();
    }, 50);
}

function clearMarketFilter() {
    const marketFilter = document.getElementById('marketFilter');
    if (!marketFilter) return;
    
    marketFilter.value = '';
    
    // Ensure market sorting is maintained when clearing market filter
    currentSortField = 'market';
    currentSortDirection = 'asc';
    
    applyTransactionFilters();
    updatePageURL();
    
    // Additional call to sortTransactions as a failsafe
    setTimeout(() => {
        console.log('Re-applying market sort after clearing market filter');
        sortTransactions();
    }, 50);
}

function setupEventListeners() {
    try {
        // Set up market card click listeners
        if (marketCards && marketCards.length > 0) {
            console.log('Setting up click listeners for', marketCards.length, 'market cards');
            
            marketCards.forEach(card => {
                card.addEventListener('click', function() {
                    console.log('Market card clicked:', this.dataset.market);
                    
                    // Remove selection from all cards
                    marketCards.forEach(c => c.classList.remove('selected-market'));
                    
                    // Add selection to clicked card
                    this.classList.add('selected-market');
                    
                    // Set the value in the input field
                    selectedMarketInput.value = this.dataset.market;
                    console.log('Selected market updated to:', selectedMarketInput.value);
                });
                
                // Check if the card already has data-market attribute
                console.log('Market card data:', card.dataset.market);
            });
        }

        // Set up form submit listener
        if (hawalaForm) {
            hawalaForm.addEventListener('submit', handleFormSubmit);
        }
        
        // Add ripple animation to submit button on click (same as bank page)
        const submitBtn = document.querySelector('#hawalaForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.addEventListener('click', function(e) {
                // Remove any existing ripple
                const oldRipple = this.querySelector('.ripple-effect');
                if (oldRipple) oldRipple.remove();
                // Create ripple
                const ripple = document.createElement('span');
                ripple.className = 'ripple-effect';
                ripple.style.position = 'absolute';
                ripple.style.left = `${e.offsetX}px`;
                ripple.style.top = `${e.offsetY}px`;
                ripple.style.width = ripple.style.height = Math.max(this.offsetWidth, this.offsetHeight) + 'px';
                ripple.style.background = 'rgba(255,255,255,0.5)';
                ripple.style.borderRadius = '50%';
                ripple.style.transform = 'translate(-50%, -50%) scale(0)';
                ripple.style.opacity = '0.75';
                ripple.style.pointerEvents = 'none';
                ripple.style.transition = 'transform 0.6s cubic-bezier(0.4,0,0.2,1), opacity 0.6s';
                ripple.classList.add('ripple-animate');
                this.appendChild(ripple);
                setTimeout(() => {
                    ripple.style.transform = 'translate(-50%, -50%) scale(2.5)';
                    ripple.style.opacity = '0';
                }, 10);
                setTimeout(() => ripple.remove(), 650);
            });
        }
        
        // Add event listeners for date and market filter clear buttons
        const clearDateBtn = document.querySelector('button[onclick="clearDateFilter()"]');
        if (clearDateBtn) {
            clearDateBtn.addEventListener('click', clearDateFilter);
        }
        
        const clearMarketBtn = document.querySelector('button[onclick="clearMarketFilter()"]');
        if (clearMarketBtn) {
            clearMarketBtn.addEventListener('click', clearMarketFilter);
        }
        
        // Removed event listeners for print and export buttons
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        // Check if market is selected - make sure to provide a clear error message
        if (!selectedMarketInput || !selectedMarketInput.value) {
            console.error('Market not selected or selectedMarketInput not found');
            alert('Please select a market first');
            return;
        }
        
        // Use browser's built-in form validation
        if (!this.checkValidity()) {
            // If form is invalid, trigger browser validation UI
            this.reportValidity();
            return;
        }
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        const requestData = {
            ...data,
            amount: data.amount.toString(),
            nusinga: data.nusinga || '',
            purpose: data.purpose || ''
        };

        // Log for debugging
        console.log('Submitting form data:', requestData);

        const response = await fetch('/hawala/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save transaction');
            } else {
                throw new Error('Server returned ' + response.status + ' ' + response.statusText);
            }
        }

        const result = await response.json();
            
        // Update modal content
        document.getElementById('successMessage').textContent = 
            `Your ${data.transactionType.toLowerCase()} transaction has been processed successfully!`;
        
        const currencySymbol = {
            'USD': '$',
            'EUR': '€',
            'IQD': 'IQD '
        }[data.currency] || '$';
        
        document.getElementById('modalAmount').textContent = `${currencySymbol}${data.amount}`;
        document.getElementById('modalMarket').textContent = data.market;
        document.getElementById('modalAccountName').textContent = data.accountName;
        document.getElementById('modalNusinga').textContent = data.nusinga || '-';
        document.getElementById('modalType').textContent = data.transactionType;
        document.getElementById('modalPurpose').textContent = data.purpose || '-';
        
        // Show success modal
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
        
        // Handle dynamic content update instead of page reload
        document.getElementById('successModal').addEventListener('hidden.bs.modal', function() {
            // If we're on the history tab, update the transaction list dynamically
            const historyTab = document.getElementById('history-tab');
            if (historyTab && historyTab.classList.contains('active')) {
                // Refresh transaction data without page reload
                fetchAndUpdateTransactions();
            }
        });
        
        // Reset form and selection
        this.reset();
        marketCards?.forEach(c => c.classList.remove('selected-market'));
        selectedMarketInput.value = '';
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error connecting to server. Please try again. If the problem persists, refresh the page.');
    }
}

async function fetchAndUpdateTransactions() {
    try {
        // Fetch updated transaction data
        const response = await fetch('/api/hawala-transactions');
        if (!response.ok) {
            throw new Error('Failed to fetch updated transaction data');
        }
        
        const transactions = await response.json();
        
        // Get current date and market filters
        const dateFilter = document.getElementById('dateFilter');
        const marketFilter = document.getElementById('marketFilter');
        const currentDate = dateFilter._flatpickr ? dateFilter._flatpickr.selectedDates[0] : new Date();
        const selectedMarket = marketFilter ? marketFilter.value : '';
        
        // Create a transaction row for each transaction
        const tableBody = document.querySelector('#historyTab tbody');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Process transactions to match the current filter
        const utcDate = new Date(Date.UTC(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate()
        )).toISOString().split('T')[0];
        
        // Filter transactions for current date
        const filteredTransactions = transactions.filter(transaction => {
            const transDate = new Date(transaction.date);
            const transDateStr = new Date(Date.UTC(
                transDate.getFullYear(), 
                transDate.getMonth(), 
                transDate.getDate()
            )).toISOString().split('T')[0];
            
            return transDateStr === utcDate && 
                  (!selectedMarket || transaction.market === selectedMarket);
        });
        
        // If no transactions, show message
        if (filteredTransactions.length === 0) {
            const noTransactionsRow = document.createElement('tr');
            noTransactionsRow.className = 'no-transactions';
            const formattedDate = new Date(utcDate).toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
            noTransactionsRow.innerHTML = `<td colspan="9" class="text-center">No transactions found for ${formattedDate}${selectedMarket ? ` in market: ${selectedMarket}` : ''}</td>`;
            tableBody.appendChild(noTransactionsRow);
        } else {
            // Add each transaction to the table
            filteredTransactions.forEach(transaction => {
                // Create a new row with the transaction data
                const row = createTransactionRow(transaction);
                tableBody.appendChild(row);
            });
        }
        
        // Update global transaction rows arrays
        allTransactionRows = Array.from(document.querySelectorAll('#historyTab tbody tr:not(.no-transactions)'));
        filteredTransactionRows = [...allTransactionRows];
        
        // Refresh dates
        availableTransactionDates = [...new Set(transactions.map(t => {
            const date = new Date(t.date);
            return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0];
        }))].filter(Boolean).sort().reverse();
        
        // Apply sorting
        sortTransactions();
        
        // Update pagination
        initializeDatePagination();
        
        // Update summary statistics
        updateTransactionSummary();
    } catch (error) {
        console.error('Error fetching transactions:', error);
    }
}

// Helper function to create a transaction row
function createTransactionRow(transaction) {
    const row = document.createElement('tr');
    row.className = transaction.confirmed ? 'highlighted' : '';
    row.style.cursor = 'pointer';
    row.setAttribute('data-transaction-id', transaction.id);
    
    // Format date for display
    const transDate = new Date(transaction.date);
    const formattedDate = transDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    
    // Format amount with currency symbol
    let formattedAmount;
    if (transaction.currency === 'IQD') {
        formattedAmount = `IQD ${parseFloat(transaction.amount).toLocaleString()}`;
    } else if (transaction.currency === 'EUR') {
        formattedAmount = `€${parseFloat(transaction.amount).toLocaleString()}`;
    } else {
        formattedAmount = `$${parseFloat(transaction.amount).toLocaleString()}`;
    }
    
    // Create transaction data for edit modal
    const transactionData = JSON.stringify(transaction).replace(/"/g, '&quot;');
    
    // Add detail page URL
    const detailPageUrl = `/transaction/hawala/${transaction.id}`;
    
    // Create row content
    row.innerHTML = `
        <td>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" ${transaction.confirmed ? 'checked' : ''}>
                <form action="/toggle-hawala-status/${transaction.id}" method="post" style="display:none;">
                    <input type="hidden" name="returnUrl" value="/hawala?tab=history">
                </form>
            </div>
        </td>
        <td data-market="${transaction.market}">${transaction.market}</td>
        <td>${transaction.accountName}</td>
        <td>${transaction.nusinga || '-'}</td>
        <td data-transaction-type="${transaction.transactionType}">${formattedAmount}</td>
        <td>${transaction.purpose || '-'}</td>
        <td data-date="${transaction.date}" data-full-date="${transaction.date}">${formattedDate}</td>
        <td>
            <div class="d-flex justify-content-center">
                <button class="btn btn-sm btn-primary me-1" onclick="showEditModal(event, '${transactionData}')">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete(event, '${transaction.id}')">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    // Add click event listener for navigating to details
    row.addEventListener('click', function(e) {
        if (!e.target.closest('button')) {
            goToTransactionDetails(detailPageUrl);
        }
    });
    
    // Add click handler for the checkbox
    const checkbox = row.querySelector('.form-check-input');
    checkbox.addEventListener('click', async function(e) {
        e.stopPropagation();
        toggleTransactionStatus(transaction.id, checkbox);
    });
    
    return row;
}

// Function to update a transaction row with new data
function updateTransactionRow(row, transaction) {
    // Format date for display
    const transDate = new Date(transaction.date);
    const formattedDate = transDate.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
    });
    
    // Format amount with currency symbol
    let formattedAmount;
    if (transaction.currency === 'IQD') {
        formattedAmount = `IQD ${parseFloat(transaction.amount).toLocaleString()}`;
    } else if (transaction.currency === 'EUR') {
        formattedAmount = `€${parseFloat(transaction.amount).toLocaleString()}`;
    } else {
        formattedAmount = `$${parseFloat(transaction.amount).toLocaleString()}`;
    }
    
    // Create transaction data for edit modal
    const transactionData = JSON.stringify(transaction).replace(/"/g, '&quot;');
    
    // Update the row cells with new data
    const cells = row.querySelectorAll('td');
    
    // Skip the checkbox cell (index 0)
    // Update market cell (index 1)
    cells[1].textContent = transaction.market;
    cells[1].setAttribute('data-market', transaction.market);
    
    // Update account name cell (index 2)
    cells[2].textContent = transaction.accountName;
    
    // Update nusinga cell (index 3)
    cells[3].textContent = transaction.nusinga || '-';
    
    // Update amount cell (index 4)
    cells[4].textContent = formattedAmount;
    cells[4].setAttribute('data-transaction-type', transaction.transactionType);
    
    // Update purpose cell (index 5)
    cells[5].textContent = transaction.purpose || '-';
    
    // Update date cell (index 6)
    cells[6].textContent = formattedDate;
    cells[6].setAttribute('data-date', transaction.date);
    cells[6].setAttribute('data-full-date', transaction.date);
    
    // Update action buttons cell (index 7)
    cells[7].querySelector('.btn-primary').setAttribute('onclick', `showEditModal(event, '${transactionData}')`);
    cells[7].querySelector('.btn-danger').setAttribute('onclick', `confirmDelete(event, '${transaction.id}')`);
}

// Function to show toast notifications
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Generate a unique ID for the toast
    const toastId = 'toast-' + Date.now();
    
    // Set background color based on type
    let bgColor = 'bg-info';
    if (type === 'success') bgColor = 'bg-success';
    if (type === 'error') bgColor = 'bg-danger';
    if (type === 'warning') bgColor = 'bg-warning';
    
    // Create toast element
    const toastHtml = `
        <div id="${toastId}" class="toast ${bgColor} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Add toast to container
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { autohide: true, delay: 3000 });
    toast.show();
    
    // Remove toast from DOM after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function () {
        this.remove();
    });
}

// Function to toggle transaction status via AJAX
async function toggleTransactionStatus(transactionId, checkbox) {
    try {
        // Make AJAX call to toggle status
        const response = await fetch(`/hawala-history/confirm/${transactionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to update transaction status');
        }
        
        // Get the row
        const row = checkbox.closest('tr');
        
        // Toggle highlighted class
        row.classList.toggle('highlighted');
        
        // Update summary statistics
        updateTransactionSummary();
        
        // Show success toast
        showToast('Transaction status updated', 'success');
    } catch (error) {
        console.error('Error updating status:', error);
        
        // Revert checkbox state on error
        checkbox.checked = !checkbox.checked;
        
        // Show error toast
        showToast('Failed to update transaction status', 'error');
    }
}