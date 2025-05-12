let currentForm = null;
let currentDate = null;
let currentPage = 1;
let allRows = [];
let filteredRows = [];
let availableDates = [];
let currentSortField = 'bank'; // Default sort field (bank name)
let currentSortDirection = 'asc'; // Default sort direction

document.addEventListener('DOMContentLoaded', () => {
    const dateFilter = document.getElementById('dateFilter');
    const bankFilter = document.getElementById('bankFilter');
    
    // Get all transaction rows
    allRows = Array.from(document.querySelectorAll('tbody tr:not(.no-transactions)'));
    filteredRows = [...allRows];
    
    // Extract unique dates from transactions and ensure midnight UTC
    availableDates = [...new Set(allRows.map(row => {
        const dateCell = row.querySelector('td[data-full-date]');
        const date = new Date(dateCell.getAttribute('data-full-date'));
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0];
    }))].sort().reverse(); // Sort dates in descending order
    
    // Set initial date and page from URL or use defaults
    const urlParams = new URLSearchParams(window.location.search);
    currentDate = urlParams.get('date') || availableDates[0] || new Date().toISOString().split('T')[0];
    currentPage = parseInt(urlParams.get('page')) || 1;

    // Initialize flatpickr date picker with proper configuration
    const fp = flatpickr(dateFilter, {
        dateFormat: "Y-m-d",
        enableTime: false,
        maxDate: "today",
        defaultDate: currentDate,
        onChange: function(selectedDates) {
            if (selectedDates.length > 0) {
                // Convert to UTC midnight to match our stored dates
                const selectedDate = new Date(Date.UTC(
                    selectedDates[0].getFullYear(),
                    selectedDates[0].getMonth(),
                    selectedDates[0].getDate()
                ));
                currentDate = selectedDate.toISOString().split('T')[0];
                applyFilters();
                updateURL();
                initializeDatePagination();
            }
        }
    });

    // Bank filter event listener
    bankFilter.addEventListener('change', () => {
        applyFilters();
        updateURL();
    });

    // Add click handlers for sortable column headers
    setupSortableHeaders();

    // Initial load
    initializeDatePagination();
    applyFilters();
    updateFormReturnUrls();
});

// Setup click handlers for sortable column headers
function setupSortableHeaders() {
    // Find table headers
    const tableHeaders = document.querySelectorAll('#historyTab .table thead th');
    
    // Add sorting indicators and click handlers to sortable columns
    tableHeaders.forEach((header, index) => {
        // Make ONLY Bank header (index 1) sortable
        if (index === 1) {
            // Create a sortable header with indicator
            const headerText = header.textContent.trim();
            const fieldName = 'bank';
            
            header.innerHTML = `
                <div class="sortable-header" data-field="${fieldName}">
                    ${headerText}
                    <span class="sort-indicator ms-1">
                        <i class="bi bi-arrow-down-up"></i>
                    </span>
                </div>
            `;
            
            // Add click handler
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                sortTransactions(fieldName);
            });
        }
    });
}

// Sort transactions by the selected field
function sortTransactions(field) {
    // Toggle direction if already sorting by this field
    if (currentSortField === field) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    // Update sort indicators
    updateSortIndicators();
    
    // Sort the filtered rows
    if (filteredRows.length > 0) {
        filteredRows.sort((a, b) => {
            let valueA, valueB;
            
            if (field === 'bank') {
                valueA = a.cells[1].textContent.trim().toLowerCase();
                valueB = b.cells[1].textContent.trim().toLowerCase();
            } else if (field === 'account') {
                valueA = a.cells[2].textContent.trim().toLowerCase();
                valueB = b.cells[2].textContent.trim().toLowerCase();
            } else if (field === 'amount') {
                // Extract numeric amount from cells
                valueA = extractNumericAmount(a.cells[4]);
                valueB = extractNumericAmount(b.cells[4]);
            } else {
                return 0;
            }
            
            // Apply sort direction
            const direction = currentSortDirection === 'asc' ? 1 : -1;
            
            if (valueA < valueB) return -1 * direction;
            if (valueA > valueB) return 1 * direction;
            return 0;
        });
        
        // Reorder rows in DOM
        const tbody = document.querySelector('#historyTab tbody');
        filteredRows.forEach(row => {
            tbody.appendChild(row);
        });
    }
}

// Extract numeric amount from cell (handles different currency formats)
function extractNumericAmount(cell) {
    // Get text content or value from span if present
    const content = cell.querySelector('span') ? 
        cell.querySelector('span').textContent.trim() : 
        cell.textContent.trim();
        
    // Remove currency symbols and commas, then parse as float
    return parseFloat(content.replace(/[^\d.-]/g, '')) || 0;
}

// Update sort indicators in table headers
function updateSortIndicators() {
    const headers = document.querySelectorAll('.sortable-header');
    
    headers.forEach(header => {
        const field = header.getAttribute('data-field');
        const indicator = header.querySelector('.sort-indicator');
        
        if (field === currentSortField) {
            indicator.innerHTML = currentSortDirection === 'asc' ? 
                '<i class="bi bi-sort-alpha-down"></i>' : 
                '<i class="bi bi-sort-alpha-up"></i>';
        } else {
            indicator.innerHTML = '<i class="bi bi-arrow-down-up"></i>';
        }
    });
}

function updateFormReturnUrls() {
    document.querySelectorAll('form[action^="/toggle-bank-status/"] input[name="returnUrl"]').forEach(input => {
        const bankFilter = document.getElementById('bankFilter');
        const params = new URLSearchParams();
        
        // Check if we're on the combined page
        const isOnCombinedPage = window.location.pathname === '/bank';
        
        // Set appropriate parameters
        if (isOnCombinedPage) {
            params.set('tab', 'history');
        }
        
        params.set('date', currentDate);
        if (bankFilter.value) {
            params.set('bank', bankFilter.value);
        }
        
        // Set the return URL based on whether we're on the combined page or standalone page
        input.value = isOnCombinedPage ? 
            `/bank?${params.toString()}` : 
            `/bank-history?${params.toString()}`;
    });
}

function updateURL() {
    const bankFilter = document.getElementById('bankFilter');
    const params = new URLSearchParams(window.location.search);
    
    // Keep the tab parameter if we're on the combined page
    const isOnCombinedPage = window.location.pathname === '/bank';
    const currentTab = params.get('tab');
    
    // Update date and bank parameters
    params.set('date', currentDate);
    if (bankFilter.value) {
        params.set('bank', bankFilter.value);
    } else {
        params.delete('bank');
    }
    
    // If we're on the combined page, ensure the tab parameter is set to 'history'
    if (isOnCombinedPage) {
        params.set('tab', 'history');
    }
    
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({ date: currentDate }, '', newUrl);
    updateFormReturnUrls();
}

function initializeDatePagination() {
    const pagination = document.getElementById('pagination');
    const dateFilter = document.getElementById('dateFilter');
    pagination.innerHTML = '';

    const currentDateIndex = availableDates.indexOf(currentDate);
    
    // Previous date button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item${currentDateIndex === availableDates.length - 1 ? ' disabled' : ''}`;
    prevLi.innerHTML = '<a class="page-link" href="#" aria-label="Previous"><i class="bi bi-chevron-left"></i></a>';
    
    if (currentDateIndex < availableDates.length - 1) {
        prevLi.onclick = (e) => {
            e.preventDefault();
            currentDate = availableDates[currentDateIndex + 1];
            dateFilter._flatpickr.setDate(currentDate, true);
            applyFilters();
            updateURL();
            initializeDatePagination();
        };
    }
    pagination.appendChild(prevLi);

    // Current date indicator
    const currentLi = document.createElement('li');
    currentLi.className = 'page-item active';
    const formattedDate = new Date(currentDate + 'T00:00:00Z').toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    currentLi.innerHTML = `<span class="page-link">${formattedDate}</span>`;
    pagination.appendChild(currentLi);

    // Next date button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item${currentDateIndex === 0 ? ' disabled' : ''}`;
    nextLi.innerHTML = '<a class="page-link" href="#" aria-label="Next"><i class="bi bi-chevron-right"></i></a>';
    
    if (currentDateIndex > 0) {
        nextLi.onclick = (e) => {
            e.preventDefault();
            currentDate = availableDates[currentDateIndex - 1];
            dateFilter._flatpickr.setDate(currentDate, true);
            applyFilters();
            updateURL();
            initializeDatePagination();
        };
    }
    pagination.appendChild(nextLi);
}

function applyFilters() {
    const bankFilter = document.getElementById('bankFilter');
    const selectedBank = bankFilter.value;

    // Filter by selected date, ensuring UTC midnight comparison
    filteredRows = allRows.filter(row => {
        const dateCell = row.querySelector('td[data-full-date]');
        const rowDate = new Date(dateCell.getAttribute('data-full-date'));
        const rowDateStr = new Date(Date.UTC(
            rowDate.getFullYear(),
            rowDate.getMonth(),
            rowDate.getDate()
        )).toISOString().split('T')[0];
        return rowDateStr === currentDate;
    });

    // Then apply bank filter if selected
    if (selectedBank) {
        filteredRows = filteredRows.filter(row => {
            const bankCell = row.cells[1]; // Bank name is in the second column
            return bankCell.textContent === selectedBank;
        });
    }

    // Show/hide rows
    allRows.forEach(row => row.style.display = 'none');
    filteredRows.forEach(row => row.style.display = '');

    // Handle no results
    const tbody = document.querySelector('tbody');
    const existingNoTransactions = tbody.querySelector('.no-transactions');
    if (existingNoTransactions) {
        existingNoTransactions.remove();
    }

    if (filteredRows.length === 0) {
        const noTransactionsRow = document.createElement('tr');
        noTransactionsRow.className = 'no-transactions';
        noTransactionsRow.innerHTML = `<td colspan="8" class="text-center">No transactions found for ${new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}${selectedBank ? ` in bank: ${selectedBank}` : ''}</td>`;
        tbody.appendChild(noTransactionsRow);
    }

    updateSummary();
}

function updateSummary() {
    let totalReceivedUSD = 0;
    let totalReceivedIQD = 0;
    let receiveCount = 0;

    // Process the filtered rows to get transaction data
    filteredRows.forEach(row => {
        if (!row.classList.contains('no-transactions')) {
            // Only count transactions where the row is both checked and highlighted
            const checkbox = row.querySelector('.form-check-input');
            const isHighlighted = row.classList.contains('highlighted');
            
            // Skip this row if it's not both checked and highlighted
            if (!checkbox || !checkbox.checked || !isHighlighted) {
                return;
            }
            
            // Get transaction type from the amount cell's data attribute
            const amountCell = row.querySelector('td[data-transaction-type]');
            if (!amountCell) return;
            
            const type = amountCell.getAttribute('data-transaction-type').toLowerCase();
            
            if (type === 'receive') {
                // Get the edit button to extract original data
                const editButton = row.querySelector('button.btn-primary');
                
                if (editButton) {
                    try {
                        const transactionDataMatch = editButton.getAttribute('onclick').match(/showEditModal\(event, '(.+?)'\)/);
                        if (transactionDataMatch && transactionDataMatch[1]) {
                            const transactionData = JSON.parse(transactionDataMatch[1].replace(/\\"/g, '"'));
                            
                            // Get amount and tax directly from the transaction data
                            const amount = parseFloat(transactionData.amount || 0);
                            const tax = parseFloat(transactionData.tax || 0);
                            const currency = transactionData.currency || 'USD';
                            
                            // Calculate after-tax amount
                            const netAmount = amount - tax;
                            
                            // Add to the correct currency total
                            if (currency === 'IQD') {
                                totalReceivedIQD += netAmount;
                            } else {
                                totalReceivedUSD += netAmount;
                            }
                            
                            receiveCount++;
                        }
                    } catch (e) {
                        console.error('Error parsing transaction data', e);
                    }
                }
            }
        }
    });

    // Update amounts in summary box (showing after-tax amounts)
    document.querySelector('.amount.amount-iqd').textContent = `IQD: ${totalReceivedIQD.toLocaleString()}`;
    document.querySelector('.amount.amount-usd').textContent = `$${totalReceivedUSD.toFixed(2)}`;
    
    const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    document.querySelector('.count').textContent = `${receiveCount} Transactions on ${formattedDate}`;
}

function clearDateFilter() {
    const dateFilter = document.getElementById('dateFilter');
    
    // Reset to most recent date
    currentDate = availableDates[0];
    dateFilter._flatpickr.setDate(currentDate);
    
    applyFilters();
    updateURL();
    initializeDatePagination();
}

function clearBankFilter() {
    const bankFilter = document.getElementById('bankFilter');
    bankFilter.value = '';
    
    applyFilters();
    updateURL();
}

function confirmStatusChange(event, currentStatus, form) {
    event.preventDefault();
    event.stopPropagation();
    currentForm = form;
    const newStatus = currentStatus === 'pending' ? 'Completed' : 'Pending';
    const modal = new bootstrap.Modal(document.getElementById('statusChangeModal'));
    document.getElementById('newStatusText').textContent = newStatus;
    modal.show();
    return false;
}

document.getElementById('confirmStatusChange')?.addEventListener('click', function() {
    if (currentForm) {
        currentForm.submit();
    }
    bootstrap.Modal.getInstance(document.getElementById('statusChangeModal')).hide();
});

let transactionToDelete = null;

function confirmDelete(event, id) {
    event.preventDefault();
    event.stopPropagation();
    
    transactionToDelete = id;
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

document.getElementById('confirmDelete')?.addEventListener('click', async function() {
    if (!transactionToDelete) return;

    try {
        const response = await fetch(`/bank/delete/${transactionToDelete}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Remove the row from the table
            const row = document.querySelector(`tr[data-transaction-id="${transactionToDelete}"]`);
            if (row) {
                // Remove from DOM
                row.remove();
                
                // Remove from our arrays
                filteredRows = filteredRows.filter(r => r !== row);
                allRows = allRows.filter(r => r !== row);

                // Check if we need to show "no transactions" message
                const tbody = document.querySelector('tbody');
                if (filteredRows.length === 0) {
                    const noTransactionsRow = document.createElement('tr');
                    noTransactionsRow.className = 'no-transactions';
                    noTransactionsRow.innerHTML = `<td colspan="8" class="text-center">No transactions found for ${new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>`;
                    tbody.appendChild(noTransactionsRow);
                }

                // Update summary counts and amounts
                updateSummary();
                
                // Show success notification
                showToast('Transaction deleted successfully', 'success');
            } else {
                // If we can't find the row by ID, refresh all transactions
                fetchAndUpdateBankTransactions();
                showToast('Transaction deleted successfully', 'success');
            }
        } else {
            throw new Error('Failed to delete transaction');
            showToast('Failed to delete transaction', 'error');
        }
    } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Error deleting transaction. Please try again.');
    } finally {
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        modal.hide();
        transactionToDelete = null;
    }
});

function goToTransactionDetails(url) {
    const params = new URLSearchParams();
    params.set('returnDate', currentDate);
    if (bankFilter.value) {
        params.set('returnBank', bankFilter.value);
    }
    window.location.href = `${url}?${params.toString()}`;
}

function showEditModal(event, transactionData) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
        // Parse the transaction data
        const transaction = JSON.parse(transactionData);
        
        // Fill the form with current values
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editAmount').value = transaction.amount;
        
        // Set currency value
        const currencySelect = document.getElementById('editCurrency');
        if (currencySelect) {
            currencySelect.value = transaction.currency || 'USD';
        }
        
        // Set tax value if it exists
        const taxField = document.getElementById('editTax');
        if (taxField) {
            taxField.value = transaction.tax || '0';
        }
        
        document.getElementById('editBankName').value = transaction.bankName;

        // Populate the account dropdown and pre-select the current account
        const accountDropdown = document.getElementById('editAccountName');
        accountDropdown.innerHTML = '<option value="">Select account</option>';
        
        // Use the global accountsList we defined in the template
        if (window.accountsList && Array.isArray(window.accountsList)) {
            window.accountsList.forEach(account => {
                const option = document.createElement('option');
                option.value = account.name;
                option.text = account.name;
                option.selected = (transaction.accountName === account.name);
                accountDropdown.appendChild(option);
            });
        }
        
        document.getElementById('editTransactionType').value = transaction.transactionType;
        document.getElementById('editDescription').value = transaction.description || '';
        
        // Show the modal using Bootstrap 5 syntax
        const editModal = document.getElementById('editModal');
        const modal = bootstrap.Modal.getOrCreateInstance(editModal);
        modal.show();
    } catch (error) {
        console.error('Error parsing transaction data:', error, transactionData);
        alert('Error opening edit modal. Please try again.');
    }
}

document.getElementById('confirmEdit')?.addEventListener('click', async function() {
    const form = document.getElementById('editTransactionForm');
    
    // Use browser's built-in form validation
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(`/bank/update/${data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data) // Use data as is with its currency value
        });

        if (response.ok) {
            // Update the transaction data without reloading the page
            const updatedTransaction = await response.json();
            
            // Update the table data
            fetchAndUpdateBankTransactions();
            
            // Hide the modal
            const editModal = document.getElementById('editModal');
            const modal = bootstrap.Modal.getInstance(editModal);
            modal.hide();
            
            // Show success notification
            showToast('Transaction updated successfully', 'success');
        } else {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update transaction');
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert(error.message || 'Error updating transaction. Please try again.');
    }
});

function generateReportData() {
    const reportTableBody = document.getElementById('reportTableBody');
    const reportView = document.getElementById('reportView');

    // Clear previous content
    reportTableBody.innerHTML = '';

    // Filter transactions for the current date
    const currentDateTransactions = filteredRows.filter(row => {
        if (row.classList.contains('no-transactions')) return false;
        
        const dateCell = row.querySelector('td[data-full-date]');
        const rowDate = new Date(dateCell.getAttribute('data-full-date'));
        const rowDateStr = new Date(Date.UTC(
            rowDate.getFullYear(),
            rowDate.getMonth(),
            rowDate.getDate()
        )).toISOString().split('T')[0];
        return rowDateStr === currentDate;
    });

    // Add filtered transactions to the report with after-tax amounts
    currentDateTransactions.forEach(row => {
        const tr = document.createElement('tr');
        
        // Bank Name
        const bankName = row.cells[1].textContent.trim();
        tr.insertCell().textContent = bankName;

        // Account Name
        const accountName = row.cells[2].textContent.trim();
        tr.insertCell().textContent = accountName;

        // Get the original amount and tax from the transaction data
        const amountCell = row.cells[3].textContent.trim();
        let currency = 'USD';
        let amount = 0;
        let tax = 0;
        let afterTaxAmount = '';

        // Extract transaction data from edit button
        const editButton = row.querySelector('button.btn-primary');
        if (editButton) {
            try {
                const transactionDataMatch = editButton.getAttribute('onclick').match(/showEditModal\(event, '(.+?)'\)/);
                if (transactionDataMatch && transactionDataMatch[1]) {
                    const transactionData = JSON.parse(transactionDataMatch[1].replace(/\\"/g, '"'));
                    
                    // Extract amount and tax
                    amount = parseFloat(transactionData.amount || 0);
                    tax = parseFloat(transactionData.tax || 0);
                    currency = transactionData.currency || 'USD';
                    
                    // Calculate after-tax amount
                    const netAmount = Math.max(0, amount - tax);
                    
                    // Format the after-tax amount according to currency without "After Tax" label
                    if (currency === 'IQD') {
                        afterTaxAmount = `IQD ${netAmount.toLocaleString()}`;
                    } else {
                        afterTaxAmount = `$${netAmount.toFixed(2)}`;
                    }
                }
            } catch (e) {
                console.error('Error parsing transaction data', e);
                afterTaxAmount = amountCell; // Fallback to original amount if error
            }
        }

        // Use after-tax amount or fall back to original amount
        tr.insertCell().textContent = afterTaxAmount || amountCell;

        // Date (month and day only)
        const dateCell = row.querySelector('td[data-full-date]');
        const date = new Date(dateCell.getAttribute('data-full-date'));
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric'
        });
        tr.insertCell().textContent = dateStr;

        reportTableBody.appendChild(tr);
    });

    return currentDateTransactions.length > 0;
}

function printReport() {
    try {
        // Create a new window for printing
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        
        if (!printWindow) {
            alert("Please allow popup windows for printing.");
            return;
        }
        
        // Get only the highlighted rows that are checked
        let rowsHTML = '';
        if (filteredRows.length > 0) {
            // Filter to only get rows that are highlighted and checked
            const highlightedRows = filteredRows.filter(row => 
                !row.classList.contains('no-transactions') && 
                row.classList.contains('highlighted') && 
                row.querySelector('.form-check-input')?.checked
            );
            
            if (highlightedRows.length > 0) {
                highlightedRows.forEach(row => {
                    // Extract bank name
                    const bankName = row.cells[1].textContent.trim();
                    
                    // Extract account name
                    const accountName = row.cells[2].textContent.trim();
                    
                    // Get the amount
                    const amountText = row.cells[3].textContent.trim();
                    
                    // Extract date
                    const dateCell = row.querySelector('td[data-full-date]');
                    const dateStr = new Date(dateCell.getAttribute('data-full-date')).toLocaleDateString('en-US', {
                        weekday: 'short', 
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    });
                    
                    rowsHTML += `
                        <tr>
                            <td>${bankName}</td>
                            <td>${accountName}</td>
                            <td>${amountText}</td>
                            <td>${dateStr}</td>
                        </tr>
                    `;
                });
            } else {
                rowsHTML = `<tr><td colspan="4" class="text-center">No highlighted transactions found</td></tr>`;
            }
        } else {
            rowsHTML = `<tr><td colspan="4" class="text-center">No highlighted transactions found</td></tr>`;
        }
        
        // Format date for the report
        const formattedDate = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        
        // Build the complete HTML for the print window
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bank Transaction Report</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        margin: 20px;
                    }
                    h2 {
                        text-align: center;
                        margin-bottom: 10px;
                    }
                    p.date {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 8px;
                        text-align: left;
                    }
                    th {
                        background-color: #f2f2f2;
                    }
                    .text-center {
                        text-align: center;
                    }
                </style>
            </head>
            <body>
                <h2>Daily Transaction Report</h2>
                <p class="date">Date: ${formattedDate}</p>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 20%;">Bank Name</th>
                            <th style="width: 20%;">Account Name</th>
                            <th>Amount</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHTML}
                    </tbody>
                </table>
            </body>
            </html>
        `;
        
        // Write to the new window and print
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Wait for content to load before printing
        printWindow.onload = function() {
            setTimeout(function() {
                printWindow.print();
                printWindow.close();
            }, 250);
        };
    } catch (error) {
        console.error('Error preparing print report:', error);
        alert('Error preparing report for printing. Please try again.');
    }
}

function exportToPDF() {
    const reportView = document.getElementById('reportView');
    const reportTableBody = document.getElementById('reportTableBody');
    
    // Clear previous content
    reportTableBody.innerHTML = '';
    
    // Get only the highlighted rows that are checked
    const highlightedRows = filteredRows.filter(row => 
        !row.classList.contains('no-transactions') && 
        row.classList.contains('highlighted') && 
        row.querySelector('.form-check-input')?.checked
    );
    
    if (highlightedRows.length > 0) {
        // Add highlighted transactions to the report with after-tax amounts
        highlightedRows.forEach(row => {
            const tr = document.createElement('tr');
            
            // Bank Name
            const bankName = row.cells[1].textContent.trim();
            tr.insertCell().textContent = bankName;
    
            // Account Name
            const accountName = row.cells[2].textContent.trim();
            tr.insertCell().textContent = accountName;
    
            // Get the amount from the visible cell
            const amountCell = row.cells[3].textContent.trim();
            tr.insertCell().textContent = amountCell;
    
            // Date (month and day only)
            const dateCell = row.querySelector('td[data-full-date]');
            const date = new Date(dateCell.getAttribute('data-full-date'));
            const dateStr = date.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric'
            });
            tr.insertCell().textContent = dateStr;
    
            reportTableBody.appendChild(tr);
        });
        
        // Display and export the report view
        reportView.style.display = 'block';
        
        const opt = {
            margin: 1,
            filename: `bank-report-${currentDate}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
    
        html2pdf().set(opt).from(reportView).save().then(() => {
            reportView.style.display = 'none';
        });
    } else {
        alert('No highlighted transactions found. Please check at least one transaction to export.');
    }
}

// Fetch and update bank transactions via AJAX
async function fetchAndUpdateBankTransactions() {
    try {
        // Fetch updated transaction data
        const response = await fetch('/api/bank-transactions');
        if (!response.ok) {
            throw new Error('Failed to fetch updated transaction data');
        }
        
        const transactions = await response.json();
        
        // Get current date and bank filters
        const dateFilter = document.getElementById('dateFilter');
        const bankFilter = document.getElementById('bankFilter');
        const currentFilterDate = dateFilter._flatpickr ? dateFilter._flatpickr.selectedDates[0] : new Date();
        const selectedBank = bankFilter ? bankFilter.value : '';
        
        // Create a transaction row for each transaction
        const tableBody = document.querySelector('#historyTab tbody');
        if (!tableBody) return;
        
        // Clear existing rows
        tableBody.innerHTML = '';
        
        // Process transactions to match the current filter
        const utcDate = new Date(Date.UTC(
            currentFilterDate.getFullYear(),
            currentFilterDate.getMonth(),
            currentFilterDate.getDate()
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
                  (!selectedBank || transaction.bank === selectedBank);
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
            noTransactionsRow.innerHTML = `<td colspan="8" class="text-center">No transactions found for ${formattedDate}${selectedBank ? ` in bank: ${selectedBank}` : ''}</td>`;
            tableBody.appendChild(noTransactionsRow);
        } else {
            // Add each transaction to the table
            filteredTransactions.forEach(transaction => {
                // Create a new row with the transaction data
                const row = createBankTransactionRow(transaction);
                tableBody.appendChild(row);
            });
        }
        
        // Update global transaction rows arrays
        allRows = Array.from(document.querySelectorAll('tbody tr:not(.no-transactions)'));
        filteredRows = [...allRows];
        
        // Refresh dates
        availableDates = [...new Set(transactions.map(t => {
            const date = new Date(t.date);
            return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0];
        }))].filter(Boolean).sort().reverse();
        
        // Apply sorting
        sortTransactions(currentSortField);
        
        // Update pagination
        initializeDatePagination();
        
        // Update summary
        updateSummary();
    } catch (error) {
        console.error('Error fetching bank transactions:', error);
        showToast('Error fetching transaction data', 'error');
    }
}

// Helper function to create a bank transaction row
function createBankTransactionRow(transaction) {
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
    const detailPageUrl = `/transaction/bank/${transaction.id}`;
    
    // Create row content
    row.innerHTML = `
        <td>
            <div class="form-check">
                <input class="form-check-input" type="checkbox" ${transaction.confirmed ? 'checked' : ''}>
                <form action="/toggle-bank-status/${transaction.id}" method="post" style="display:none;">
                    <input type="hidden" name="returnUrl" value="/bank?tab=history">
                </form>
            </div>
        </td>
        <td data-bank="${transaction.bank}">${transaction.bank}</td>
        <td>${transaction.accountName}</td>
        <td>${transaction.nusinga || '-'}</td>
        <td data-transaction-type="${transaction.transactionType}">${formattedAmount}</td>
        <td>${transaction.tax ? `$${parseFloat(transaction.tax).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : '-'}</td>
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
        if (!e.target.closest('button') && !e.target.closest('.form-check')) {
            window.location.href = detailPageUrl;
        }
    });
    
    // Add click handler for the checkbox
    const checkbox = row.querySelector('.form-check-input');
    checkbox.addEventListener('click', async function(e) {
        e.stopPropagation();
        
        try {
            // Toggle transaction status via AJAX
            const response = await fetch(`/bank-history/confirm/${transaction.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to update transaction status');
            }
            
            // Toggle highlighted class on the row
            row.classList.toggle('highlighted');
            
            // Update summary statistics
            updateSummary();
        } catch (error) {
            console.error('Error updating transaction status:', error);
            // Revert checkbox state on error
            checkbox.checked = !checkbox.checked;
        }
    });
    
    return row;
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
