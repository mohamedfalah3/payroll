let currentForm = null;
let currentDate = null;
let currentPage = 1;
let allRows = [];
let filteredRows = [];
let availableDates = [];

document.addEventListener('DOMContentLoaded', () => {
    const dateFilter = document.getElementById('dateFilter');
    const marketFilter = document.getElementById('marketFilter');
    
    // Get all transaction rows
    allRows = Array.from(document.querySelectorAll('tbody tr:not(.no-transactions)'));
    filteredRows = [...allRows];
    
    // Extract unique dates from transactions and ensure midnight UTC
    availableDates = [...new Set(allRows.map(row => {
        const dateCell = row.querySelector('td[data-date]');
        if (!dateCell) return null;
        const date = new Date(dateCell.getAttribute('data-date'));
        return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString().split('T')[0];
    }))].filter(Boolean).sort().reverse(); // Sort dates in descending order
    
    // Set initial date and page from URL or use defaults
    const urlParams = new URLSearchParams(window.location.search);
    currentDate = urlParams.get('date') || availableDates[0] || new Date().toISOString().split('T')[0];
    currentPage = parseInt(urlParams.get('page')) || 1;
    
    // Set market filter from URL if present
    const marketParam = urlParams.get('market');
    if (marketParam) {
        marketFilter.value = marketParam;
    }

    // Initialize flatpickr date picker with proper configuration
    if (dateFilter) {
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
    }

    // Market filter event listener
    if (marketFilter) {
        marketFilter.addEventListener('change', () => {
            applyFilters();
            updateURL();
        });
    }

    // Initial load
    initializeDatePagination();
    applyFilters();
    updateFormReturnUrls();

    // Set initial summary values based on currently displayed transactions
    updateSummary();
});

function updateFormReturnUrls() {
    document.querySelectorAll('form[action^="/toggle-hawala-status/"] input[name="returnUrl"]').forEach(input => {
        // Set appropriate parameters
        if (isOnCombinedPage) {
            params.set('tab', 'history');
        }
        
        params.set('date', currentDate);
        if (marketFilter.value) {
            params.set('market', marketFilter.value);
        }
        
        // Set the return URL based on whether we're on the combined page or standalone page
        input.value = isOnCombinedPage ? 
            `/hawala?${params.toString()}` : 
            `/hawala-history?${params.toString()}`;
    });
}

function updateURL() {
    const marketFilter = document.getElementById('marketFilter');
    const params = new URLSearchParams(window.location.search);
    
    // Keep the tab parameter if we're on the combined page
    const isOnCombinedPage = window.location.pathname === '/hawala';
    const currentTab = params.get('tab');
    
    // Update date and market parameters
    params.set('date', currentDate);
    if (marketFilter.value) {
        params.set('market', marketFilter.value);
    } else {
        params.delete('market');
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
    });

    // Then apply market filter if selected
    if (selectedMarket) {
        filteredRows = filteredRows.filter(row => {
            const marketCell = row.querySelector('td[data-market]');
            return marketCell.getAttribute('data-market') === selectedMarket;
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
        noTransactionsRow.innerHTML = `<td colspan="6" class="text-center">No transactions found for ${new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}${selectedMarket ? ` in market: ${selectedMarket}` : ''}</td>`;
        tbody.appendChild(noTransactionsRow);
    }

    updateSummary();
}

function updateSummary() {
    let totalReceivedUSD = 0;
    let totalReceivedIQD = 0;
    let totalReceivedEUR = 0;
    let totalSentUSD = 0;
    let totalSentIQD = 0;
    let totalSentEUR = 0;
    let receiveCount = 0;
    let sendCount = 0;

    // Check if there are no transactions
    if (filteredRows.length === 0 || filteredRows.every(row => row.classList.contains('no-transactions'))) {
        // Reset all amounts to zero when no transactions are found
        document.querySelector('.receive-box .amount.amount-usd').textContent = '$0.00';
        document.querySelector('.receive-box .amount.amount-iqd').textContent = 'IQD: 0';
        document.querySelector('.receive-box .amount.amount-euro').textContent = '€0.00';
        
        document.querySelector('.send-box .amount.amount-usd').textContent = '$0.00';
        document.querySelector('.send-box .amount.amount-iqd').textContent = 'IQD: 0';
        document.querySelector('.send-box .amount.amount-euro').textContent = '€0.00';
        
        document.querySelector('.balance-box .amount:not(.amount-iqd):not(.amount-euro)').textContent = '$0.00';
        document.querySelector('.balance-box .amount.amount-iqd').textContent = 'IQD: 0';
        document.querySelector('.balance-box .amount.amount-euro').textContent = '€0.00';
    } else {
        // Calculate totals if there are transactions
        filteredRows.forEach(row => {
            if (!row.classList.contains('no-transactions')) {
                const amountCell = row.querySelector('td:nth-child(4)').textContent.trim();
                const type = row.querySelector('.badge').textContent.trim().toLowerCase();
                
                let amount;
                if (amountCell.startsWith('IQD')) {
                    amount = parseFloat(amountCell.replace('IQD', '').replace(/,/g, ''));
                    if (type === 'receive') {
                        totalReceivedIQD += amount;
                        receiveCount++;
                    } else if (type === 'send') {
                        totalSentIQD += amount;
                        sendCount++;
                    }
                } else if (amountCell.startsWith('€')) {
                    amount = parseFloat(amountCell.replace('€', '').replace(/,/g, ''));
                    if (type === 'receive') {
                        totalReceivedEUR += amount;
                        receiveCount++;
                    } else if (type === 'send') {
                        totalSentEUR += amount;
                        sendCount++;
                    }
                } else {
                    amount = parseFloat(amountCell.replace('$', '').replace(/,/g, ''));
                    if (type === 'receive') {
                        totalReceivedUSD += amount;
                        receiveCount++;
                    } else if (type === 'send') {
                        totalSentUSD += amount;
                        sendCount++;
                    }
                }
            }
        });

        // Update amounts in summary boxes
        document.querySelector('.receive-box .amount.amount-usd').textContent = `$${totalReceivedUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.querySelector('.receive-box .amount.amount-iqd').textContent = `IQD: ${totalReceivedIQD.toLocaleString()}`;
        document.querySelector('.receive-box .amount.amount-euro').textContent = `€${totalReceivedEUR.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        document.querySelector('.send-box .amount.amount-usd').textContent = `$${totalSentUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.querySelector('.send-box .amount.amount-iqd').textContent = `IQD: ${totalSentIQD.toLocaleString()}`;
        document.querySelector('.send-box .amount.amount-euro').textContent = `€${totalSentEUR.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const balanceUSD = totalReceivedUSD - totalSentUSD;
        const balanceIQD = totalReceivedIQD - totalSentIQD;
        const balanceEUR = totalReceivedEUR - totalSentEUR;
        
        // Update balance box amounts with appropriate classes
        const balanceBoxUSD = document.querySelector('.balance-box .amount:not(.amount-iqd):not(.amount-euro)');
        balanceBoxUSD.textContent = `$${balanceUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        balanceBoxUSD.className = `amount ${balanceUSD >= 0 ? 'positive' : 'negative'}`;
        
        const balanceBoxIQD = document.querySelector('.balance-box .amount.amount-iqd');
        balanceBoxIQD.textContent = `IQD: ${balanceIQD.toLocaleString()}`;
        balanceBoxIQD.className = `amount amount-iqd ${balanceIQD >= 0 ? 'positive' : 'negative'}`;
        
        const balanceBoxEUR = document.querySelector('.balance-box .amount.amount-euro');
        balanceBoxEUR.textContent = `€${balanceEUR.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        balanceBoxEUR.className = `amount amount-euro ${balanceEUR >= 0 ? 'positive' : 'negative'}`;
    }

    // Update counts
    document.getElementById('receiveCount').textContent = `${receiveCount} Transactions`;
    document.getElementById('sendCount').textContent = `${sendCount} Transactions`;

    const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('totalCount').textContent = `${receiveCount + sendCount} Transactions on ${formattedDate}`;
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

function clearMarketFilter() {
    const marketFilter = document.getElementById('marketFilter');
    marketFilter.value = '';
    
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

document.getElementById('confirmStatusChange')?.addEventListener('click', async function() {
    if (!currentForm) return;
    
    try {
        const formAction = currentForm.getAttribute('action');
        const response = await fetch(formAction, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // Close the modal first
        bootstrap.Modal.getInstance(document.getElementById('statusChangeModal')).hide();

        // Even if there's an error in the response, the status is likely updated on the server
        // Update the UI to reflect the new status
        const row = currentForm.closest('tr');
        const statusCell = currentForm.closest('td');
        const statusButton = statusCell.querySelector('button');
        const oldStatus = statusButton.textContent.trim().toLowerCase();
        const newStatus = oldStatus === 'pending' ? 'completed' : 'pending';
        
        statusButton.textContent = newStatus === 'pending' ? 'Pending' : 'Completed';
        statusButton.className = `badge ${newStatus === 'pending' ? 'badge-pending' : 'badge-confirmed'}`;
        
        // Reapply filters and update summary
        applyFilters();
        currentForm = null;

    } catch (error) {
        console.error('Error updating status:', error);
        // Don't show an alert - the status is likely updated anyway
        bootstrap.Modal.getInstance(document.getElementById('statusChangeModal')).hide();
        currentForm = null;
    }
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
        const response = await fetch(`/hawala/delete/${transactionToDelete}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Remove the row from the table
            const row = document.querySelector(`tr[onclick*="${transactionToDelete}"]`);
            if (row) {
                // Remove from both DOM and our filtered rows array
                row.remove();
                filteredRows = filteredRows.filter(r => !r.querySelector(`[onclick*="${transactionToDelete}"]`));
                allRows = allRows.filter(r => !r.querySelector(`[onclick*="${transactionToDelete}"]`));

                // Check if we need to show "no transactions" message
                const tbody = document.querySelector('tbody');
                if (filteredRows.length === 0) {
                    const noTransactionsRow = document.createElement('tr');
                    noTransactionsRow.className = 'no-transactions';
                    noTransactionsRow.innerHTML = `<td colspan="7" class="text-center">No transactions found for ${new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</td>`;
                    tbody.appendChild(noTransactionsRow);
                }

                // Update summary counts and amounts immediately
                updateSummary();
            }
        } else {
            throw new Error('Failed to delete transaction');
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
    const marketFilter = document.getElementById('marketFilter');
    if (marketFilter.value) {
        params.set('returnMarket', marketFilter.value);
    }
    window.location.href = `${url}?${params.toString()}`;
}

function showEditModal(event, transactionData) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
        const transaction = JSON.parse(transactionData);
        
        // Fill the form with current values
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editAmount').value = transaction.amount;
        document.getElementById('editCurrency').value = transaction.currency || 'USD';
        document.getElementById('editMarket').value = transaction.market;
        
        // Handle account dropdown properly
        const accountDropdown = document.getElementById('editAccountName');
        const marketDropdown = document.getElementById('editMarket');
        
        // Pre-select the market in the dropdown
        Array.from(marketDropdown.options).forEach(option => {
            option.selected = (option.value === transaction.market);
        });
        
        // Pre-select the account in the dropdown
        Array.from(accountDropdown.options).forEach(option => {
            option.selected = (option.value === transaction.accountName);
        });
        
        document.getElementById('editNusinga').value = transaction.nusinga || '';
        document.getElementById('editTransactionType').value = transaction.transactionType;
        document.getElementById('editPurpose').value = transaction.purpose || '';
        
        // Show the modal
        const editModal = new bootstrap.Modal(document.getElementById('editModal'));
        editModal.show();
    } catch (error) {
        console.error('Error parsing transaction data:', error);
        alert('Error opening edit modal. Please try again.');
    }
}

// Add event listener for edit form submission
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
        const response = await fetch(`/hawala/update/${data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            const result = await response.json();
            
            // Update the row in the table
            const row = document.querySelector(`tr[onclick*="${data.id}"]`);
            if (row) {
                const cells = row.getElementsByTagName('td');
                cells[1].textContent = data.market; // Market
                cells[2].textContent = data.accountName; // Account Name
                
                // Update amount display based on currency
                const currencySymbol = {
                    'USD': '$',
                    'EUR': '€',
                    'IQD': 'IQD '
                }[data.currency] || '$';
                cells[3].textContent = `${currencySymbol}${Number(data.amount).toLocaleString()}`; // Amount
                
                cells[4].innerHTML = `<span class="badge badge-${data.transactionType.toLowerCase()}">${data.transactionType}</span>`; // Type
                cells[5].textContent = data.nusinga || '-'; // Nusinga
                cells[6].textContent = data.purpose || '-'; // Purpose
            }
            
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        } else {
            throw new Error('Failed to update transaction');
        }
    } catch (error) {
        console.error('Error updating transaction:', error);
        alert('Error updating transaction. Please try again.');
    }
});

// Add the report generation and export functions
function generateReportData() {
    const reportTableBody = document.getElementById('reportTableBody');
    const reportView = document.getElementById('reportView');
    const reportDate = document.getElementById('reportDate');

    // Clear previous content
    reportTableBody.innerHTML = '';

    // Set the current date for the report
    const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    reportDate.textContent = formattedDate;

    console.log('Generating report data for date:', currentDate);
    console.log('Found filtered rows:', filteredRows.length);

    // Filter transactions for the current date
    const currentDateTransactions = filteredRows.filter(row => {
        // Skip rows that are "no transactions" placeholders
        if (row.classList.contains('no-transactions')) return false;
        
        // Get the date from the cell with data-date attribute
        const dateCell = row.querySelector('td[data-date]');
        if (!dateCell) {
            console.log('Row missing data-date attribute:', row);
            return false;
        }
        
        // Parse the date and convert to ISO string for comparison
        const rowDate = new Date(dateCell.getAttribute('data-date'));
        const rowDateStr = new Date(Date.UTC(
            rowDate.getFullYear(),
            rowDate.getMonth(), 
            rowDate.getDate()
        )).toISOString().split('T')[0];
        
        // Compare with current date and make sure it's not a placeholder row
        return rowDateStr === currentDate && !row.classList.contains('no-transactions');
    });

    console.log('Found transactions for current date:', currentDateTransactions.length);

    // Add filtered transactions to the report in the specified order
    currentDateTransactions.forEach(row => {
        const tr = document.createElement('tr');
        
        // 1. Market Name
        const marketCell = row.querySelector('td[data-market]');
        const marketName = marketCell ? marketCell.getAttribute('data-market') : row.cells[1].textContent.trim();
        tr.insertCell().textContent = marketName;

        // 2. Account Name
        const accountName = row.cells[2].textContent.trim();
        tr.insertCell().textContent = accountName;

        // 3. Amount (red if sent, black if received)
        const amountCell = row.querySelector('td:nth-child(4)').textContent.trim();
        const typeCell = row.querySelector('.badge');
        const type = typeCell ? typeCell.textContent.trim().toLowerCase() : '';
        const amountElement = tr.insertCell();

        // Set the amount text
        amountElement.textContent = amountCell;
        
        // Color the amount red if it's a 'send' transaction
        if (type === 'send') {
            amountElement.classList.add('amount-sent');
        }

        // 4. Date (only month and day)
        const dateCell = row.querySelector('td[data-date]');
        const date = new Date(dateCell.getAttribute('data-date'));
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
    console.log('Print report called, current date:', currentDate);
    
    if (generateReportData()) {
        const reportView = document.getElementById('reportView');
        reportView.style.display = 'block';
        window.print();
        setTimeout(() => {
            reportView.style.display = 'none';
        }, 500);
    } else {
        alert('No transactions found for the selected date.');
    }
}

function exportToPDF() {
    if (generateReportData()) {
        const reportView = document.getElementById('reportView');
        const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        
        // Make report view visible before generating PDF
        reportView.style.display = 'block';
        
        // Configure PDF options
        const options = {
            margin: 10,
            filename: `Hawala_Transactions_${formattedDate.replace(/\s/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        // Generate and download PDF
        html2pdf()
            .from(reportView)
            .set(options)
            .save()
            .then(() => {
                // Hide the report view after generating PDF
                setTimeout(() => {
                    reportView.style.display = 'none';
                }, 100);
            });
    } else {
        alert('No transactions found for the selected date.');
    }
}
