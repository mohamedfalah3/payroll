let currentForm = null;
let currentDate = null;
let currentPage = 1;
let allRows = [];
let filteredRows = [];
let availableDates = [];

document.addEventListener('DOMContentLoaded', () => {
    const dateFilter = document.getElementById('dateFilter');
    const bankFilter = document.getElementById('bankFilter');
    
    // Get all transaction rows
    allRows = Array.from(document.querySelectorAll('tbody tr:not(.no-transactions)'));
    filteredRows = [...allRows];
    
    // Extract unique dates from transactions and ensure midnight UTC
    availableDates = [...new Set(allRows.map(row => {
        const date = new Date(row.querySelector('td[data-full-date]').getAttribute('data-full-date'));
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

    // Initial load
    initializeDatePagination();
    applyFilters();
    updateFormReturnUrls();
});

function updateFormReturnUrls() {
    document.querySelectorAll('form[action^="/toggle-bank-status/"] input[name="returnUrl"]').forEach(input => {
        const bankFilter = document.getElementById('bankFilter');
        const params = new URLSearchParams();
        params.set('date', currentDate);
        if (bankFilter.value) {
            params.set('bank', bankFilter.value);
        }
        input.value = `/bank-history?${params.toString()}`;
    });
}

function updateURL() {
    const bankFilter = document.getElementById('bankFilter');
    const params = new URLSearchParams();
    params.set('date', currentDate);
    if (bankFilter.value) {
        params.set('bank', bankFilter.value);
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
    let totalReceivedEUR = 0;
    let receiveCount = 0;

    // Process the filtered rows to get transaction data
    filteredRows.forEach(row => {
        if (!row.classList.contains('no-transactions')) {
            const type = row.querySelector('.badge').textContent.trim().toLowerCase();
            
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
                            } else if (currency === 'EUR') {
                                totalReceivedEUR += netAmount;
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
    document.querySelector('.amount.amount-euro').textContent = `€${totalReceivedEUR.toFixed(2)}`;
    
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
            const row = document.querySelector(`tr[onclick*="${transactionToDelete}"]`);
            if (row) {
                // Remove from DOM
                row.remove();
                // Remove from our arrays
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

                // Update summary counts and amounts
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
            const result = await response.json();
            
            // Update the row in the table
            const row = document.querySelector(`tr[onclick*="${data.id}"]`);
            if (row) {
                const cells = row.getElementsByTagName('td');
                cells[1].textContent = result.bankName; // Bank Name
                cells[2].textContent = result.accountName; // Account Name
                
                // Format the amount according to the currency
                let formattedAmount;
                if (result.currency === 'IQD') {
                    formattedAmount = `IQD ${Number(result.amount).toLocaleString()}`;
                } else if (result.currency === 'EUR') {
                    formattedAmount = `€${Number(result.amount).toFixed(2)}`;
                } else {
                    formattedAmount = `$${Number(result.amount).toFixed(2)}`;
                }
                cells[3].innerHTML = formattedAmount; // Amount
                
                cells[5].textContent = result.description || '-'; // Description
            }
            
            // Update summary totals
            applyFilters();
            
            // Close the modal
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
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
                    } else if (currency === 'EUR') {
                        afterTaxAmount = `€${netAmount.toFixed(2)}`;
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
    const reportView = document.getElementById('reportView');
    
    if (generateReportData()) {
        reportView.style.display = 'block';
        window.print();
        reportView.style.display = 'none';
    } else {
        alert('No transactions found for the selected date.');
    }
}

function exportToPDF() {
    const reportView = document.getElementById('reportView');
    
    if (generateReportData()) {
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
        alert('No transactions found for the selected date.');
    }
}
