let currentForm = null;
let transactionToDelete = null;

function confirmStatusChange(event, currentStatus, form) {
    event.preventDefault();
    currentForm = form;
    const newStatus = currentStatus === 'pending' ? 'Completed' : 'Pending';
    
    // Set the new status text in the modal
    document.getElementById('newStatusText').textContent = newStatus;
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('statusChangeModal'));
    modal.show();
    
    return false;
}

function confirmDelete(event, id) {
    event.preventDefault();
    event.stopPropagation();
    transactionToDelete = id;
    
    // Show the delete confirmation modal
    const modal = new bootstrap.Modal(document.getElementById('deleteModal'));
    modal.show();
}

function showEditModal(event, transactionData) {
    event.preventDefault();
    event.stopPropagation();
    
    try {
        const transaction = JSON.parse(transactionData);
        
        // Fill the form with current values
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editAmount').value = transaction.amount;
        
        // Add type as a hidden field if not already present
        let typeInput = document.querySelector('input[name="type"]');
        if (!typeInput) {
            typeInput = document.createElement('input');
            typeInput.type = 'hidden';
            typeInput.name = 'type';
            document.getElementById('editTransactionForm').appendChild(typeInput);
        }
        typeInput.value = transaction.type;
        
        if (transaction.type === 'hawala') {
            document.getElementById('editCurrency').value = transaction.currency || 'USD';
            
            // Pre-select the market in the dropdown by name
            const marketDropdown = document.getElementById('editMarket');
            if (marketDropdown) {
                Array.from(marketDropdown.options).forEach(option => {
                    option.selected = (option.value === transaction.market);
                });
            }
            
            if (document.getElementById('editNusinga')) {
                document.getElementById('editNusinga').value = transaction.nusinga || '';
            }
            if (document.getElementById('editPurpose')) {
                document.getElementById('editPurpose').value = transaction.purpose || '';
            }
        } else {
            // Pre-select the bank in the dropdown by name
            const bankDropdown = document.getElementById('editBankName');
            if (bankDropdown) {
                Array.from(bankDropdown.options).forEach(option => {
                    option.selected = (option.value === transaction.bankName);
                });
            }
            // Set currency for bank
            if (document.getElementById('editCurrency')) {
                document.getElementById('editCurrency').value = transaction.currency || 'USD';
            }
            // Set tax for bank
            if (document.getElementById('editTax')) {
                document.getElementById('editTax').value = transaction.tax || '';
            }
            if (document.getElementById('editDescription')) {
                document.getElementById('editDescription').value = transaction.description || '';
            }
        }
        
        // Pre-select the account in the dropdown by name
        const accountDropdown = document.getElementById('editAccountName');
        if (accountDropdown) {
            Array.from(accountDropdown.options).forEach(option => {
                option.selected = (option.value === transaction.accountName);
            });
        }
        
        // Pre-select transaction type
        const typeDropdown = document.getElementById('editTransactionType');
        if (typeDropdown) {
            Array.from(typeDropdown.options).forEach(option => {
                option.selected = (option.value === transaction.transactionType);
            });
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    } catch (error) {
        console.error('Error parsing transaction data:', error);
        alert('Error opening edit modal. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase client is available - wait for it to load
    let firebaseLoaded = false;
    const checkFirebaseLoaded = () => {
        return window.FirebaseClient !== undefined;
    };

    // Poll for Firebase client loading if it's being used
    if (document.querySelector('script[src*="firebase-client.js"]')) {
        const checkInterval = setInterval(() => {
            if (checkFirebaseLoaded()) {
                firebaseLoaded = true;
                console.log('Firebase client loaded successfully');
                clearInterval(checkInterval);
            }
        }, 100);
        
        // Stop checking after 5 seconds to prevent infinite loop
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!firebaseLoaded) {
                console.error('Firebase client failed to load within timeout');
            }
        }, 5000);
    }

    // Handle confirm status change button click
    document.getElementById('confirmStatusChange')?.addEventListener('click', async function() {
        if (currentForm) {
            // If using Firebase, handle status change directly
            if (firebaseLoaded && window.transactionData) {
                try {
                    const modal = bootstrap.Modal.getInstance(document.getElementById('statusChangeModal'));
                    if (modal) modal.hide();
                    
                    // Show loading state
                    document.body.classList.add('wait-cursor');
                    const statusBadge = document.querySelector('.badge-pending, .badge-confirmed');
                    if (statusBadge) statusBadge.textContent = 'Updating...';
                    
                    await handleFirebaseStatusChange();
                } catch (error) {
                    console.error('Error changing status:', error);
                    alert('Error changing transaction status: ' + (error.message || 'Please try again'));
                    document.body.classList.remove('wait-cursor');
                }
            } else {
                // Submit the form for standard processing
                currentForm.submit();
            }
        } else {
            // Hide the modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('statusChangeModal'));
            if (modal) modal.hide();
        }
    });

    // Firebase status change handler - optimized version
    async function handleFirebaseStatusChange() {
        const transaction = window.transactionData;
        if (!transaction || !transaction.id) {
            throw new Error('Transaction data is missing');
        }
        
        const newStatus = transaction.status === 'pending' ? 'completed' : 'pending';
        console.log(`Updating transaction ${transaction.id} status to ${newStatus}`);
        
        // First, try server-side update which is most reliable
        try {
            // Show visual indicator
            document.body.classList.add('wait-cursor');
            const statusBadge = document.querySelector('.badge-pending, .badge-confirmed');
            if (statusBadge) {
                statusBadge.textContent = 'Updating...';
                statusBadge.className = statusBadge.className.replace('badge-pending', '').replace('badge-confirmed', '') + ' badge-updating';
            }
            
            const formData = new FormData();
            formData.append('returnUrl', window.location.pathname);
            
            const response = await fetch(`/toggle-${transaction.type}-status/${transaction.id}`, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                console.log('Status updated via server successfully');
                // Update the UI immediately without full page reload
                updateStatusInUI(newStatus);
                return;
            }
        } catch (serverErr) {
            console.warn('Server update attempt failed, trying direct Firebase update', serverErr);
        }
        
        // Server-side update failed, try direct Firebase update
        try {
            // Simple collections to try (both with and without capitalization)
            const possibleCollections = [
                `${transaction.type}Transactions`, // bankTransactions
                `${transaction.type.toLowerCase()}transactions`, // banktransactions
                `${transaction.type}transactions`, // bankTransactions 
                transaction.type // bank
            ];
            
            let updated = false;
            
            // Try each collection until one works
            for (const collectionName of possibleCollections) {
                try {
                    console.log(`Trying to update in collection: ${collectionName}`);
                    
                    // Use a minimal update object - just update what's needed
                    await window.FirebaseClient.updateDocument(collectionName, transaction.id, {
                        status: newStatus,
                        lastModified: new Date().toISOString()
                    });
                    
                    console.log(`Successfully updated status in ${collectionName}`);
                    updated = true;
                    break; // Exit loop if successful
                } catch (err) {
                    console.warn(`Failed to update ${collectionName}`, err);
                    // Continue to next collection
                }
            }
            
            if (updated) {
                // Update the UI immediately without full page reload
                updateStatusInUI(newStatus);
            } else {
                throw new Error('Could not update status in any collection');
            }
        } finally {
            document.body.classList.remove('wait-cursor');
        }
    }
    
    // Update status in UI without page reload
    function updateStatusInUI(newStatus) {
        // Update status badge
        const statusBadge = document.querySelector('.badge-pending, .badge-confirmed, .badge-updating');
        if (statusBadge) {
            statusBadge.textContent = newStatus;
            statusBadge.className = statusBadge.className.replace('badge-pending', '')
                                                    .replace('badge-confirmed', '')
                                                    .replace('badge-updating', '');
            statusBadge.classList.add(newStatus === 'completed' ? 'badge-confirmed' : 'badge-pending');
        }
        
        // Update the button text
        const toggleButton = document.querySelector('button[type="submit"]');
        if (toggleButton) {
            toggleButton.innerHTML = `<i class="bi bi-${newStatus === 'completed' ? 'arrow-counterclockwise' : 'check-circle'}"></i> Mark as ${newStatus === 'completed' ? 'Pending' : 'Completed'}`;
            toggleButton.className = toggleButton.className.replace('btn-success', '').replace('btn-warning', '');
            toggleButton.classList.add(newStatus === 'completed' ? 'btn-warning' : 'btn-success');
        }
        
        // Update window.transactionData to reflect the new status
        if (window.transactionData) {
            window.transactionData.status = newStatus;
        }
    }

    // Handle delete confirmation
    document.getElementById('confirmDelete')?.addEventListener('click', async function() {
        if (!transactionToDelete) return;
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
        this.disabled = true;
        const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
        if (modal) modal.hide();

        const transactionType = window.transactionData?.type || 'bank';
        let url = `/${transactionType}/delete/${transactionToDelete}`;
        try {
            const response = await fetch(url, { method: 'DELETE' });
            if (response.ok) {
                const returnDate = new URLSearchParams(window.location.search).get('returnDate');
                window.location.href = `/${transactionType}-history${returnDate ? `?date=${returnDate}` : ''}`;
            } else {
                throw new Error('Delete failed');
            }
        } catch (error) {
            alert('Error deleting transaction. Please try again.');
            this.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
            this.disabled = false;
        }
    });

    // Handle edit form submission
    document.getElementById('confirmEdit')?.addEventListener('click', async function() {
        const form = document.getElementById('editTransactionForm');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
        this.disabled = true;
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        if (modal) modal.hide();

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const transactionType = data.type || window.transactionData?.type || 'bank';
        let url, method;
        if (transactionType === 'bank') {
            url = `/bank/update/${data.id}`;
            method = 'PUT';
        } else {
            url = `/hawala/update/${data.id}`;
            method = 'PUT';
        }
        try {
            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (response.ok) {
                window.location.reload();
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            alert('Error editing transaction. Please try again.');
            this.innerHTML = '<i class="bi bi-check2 me-1"></i>Save Changes';
            this.disabled = false;
        }
    });

    // Handle delete confirmation
    document.getElementById('confirmDelete')?.addEventListener('click', async function() {
        if (!transactionToDelete) return;
        
        try {
            // Show processing state
            this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Deleting...';
            this.disabled = true;
            
            // Close the modal immediately to improve perceived performance
            const modal = bootstrap.Modal.getInstance(document.getElementById('deleteModal'));
            if (modal) modal.hide();
            
            // Get the transaction type from the window.transactionData
            const transactionType = window.transactionData?.type || 'bank';
            
            // Direct delete approach - faster and more reliable
            if (window.FirebaseClient) {
                // Most likely collection names based on transaction type
                const mainCollections = [
                    `${transactionType}Transactions`,
                    `${transactionType}transactions`
                ];
                
                // Try to delete from main collections first (most likely places)
                for (const collectionName of mainCollections) {
                    try {
                        await window.FirebaseClient.deleteDocument(collectionName, transactionToDelete);
                        console.log(`Document deleted from ${collectionName}`);
                        // If successful, immediately redirect
                        const returnDate = new URLSearchParams(window.location.search).get('returnDate');
                        window.location.href = `/${transactionType}-history${returnDate ? `?date=${returnDate}` : ''}`;
                        return;
                    } catch (err) {
                        console.log(`Couldn't delete from ${collectionName}, trying next option`);
                    }
                }
                
                // If we're still here, try the server-side API route
                console.log("Firebase direct delete unsuccessful, trying API route");
            }
            
            // Fall back to API route (works with or without Firebase)
            const response = await fetch(`/${transactionType}/delete/${transactionToDelete}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                console.log("Deleted via API route");
                const returnDate = new URLSearchParams(window.location.search).get('returnDate');
                window.location.href = `/${transactionType}-history${returnDate ? `?date=${returnDate}` : ''}`;
                return;
            }
            
            throw new Error('All delete attempts failed');
            
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Error deleting transaction. Please try again.');
            
            // Reset button state
            this.innerHTML = '<i class="bi bi-trash me-1"></i>Delete';
            this.disabled = false;
        }
    });

    // Handle edit form submission
    document.getElementById('confirmEdit')?.addEventListener('click', async function() {
        const form = document.getElementById('editTransactionForm');
        
        try {
            // Use browser's built-in form validation
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            // Show processing state
            this.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
            this.disabled = true;
            
            // Close the modal while processing for better perceived performance
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            if (modal) modal.hide();

            // Prepare the form data
            const formData = new FormData(form);
            const transactionData = Object.fromEntries(formData.entries());
            
            // Make sure we have the transaction type
            if (!transactionData.type) {
                transactionData.type = window.transactionData?.type || 'bank';
            }
            
            // Format number fields correctly
            if (transactionData.amount) {
                transactionData.amount = parseFloat(transactionData.amount);
            }

            // Preserve original fields from the current transaction
            // This is important to ensure we don't lose data when updating
            const originalTransaction = window.transactionData || {};
            
            // Merge the form data with the original transaction data
            // Form fields take precedence over original data
            const mergedData = {
                ...originalTransaction,
                ...transactionData,
                lastModified: new Date().toISOString()
            };
            
            console.log('Saving with transaction data:', mergedData);

            // Using Firebase - Optimized Direct Approach
            if (window.FirebaseClient) {
                // Most likely collection names based on transaction type
                const mainCollections = [
                    `${mergedData.type}Transactions`,
                    `${mergedData.type}transactions`
                ];
                
                let edited = false;
                
                // Try the most likely collections first for better performance
                for (const collectionName of mainCollections) {
                    try {
                        // Direct update without checking if document exists first (faster)
                        await window.FirebaseClient.updateDocument(collectionName, mergedData.id, mergedData);
                        console.log(`Document updated in ${collectionName}`);
                        edited = true;
                        
                        // Update the page content immediately without full reload for better UX
                        updateTransactionInUI(mergedData);
                        return;
                    } catch (err) {
                        console.log(`Couldn't update in ${collectionName}, trying next option`);
                    }
                }
                
                // If direct approach didn't work, try server-side API
                console.log("Firebase direct update unsuccessful, trying API route");
            }
            
            // Fall back to API route (works with or without Firebase)
            const response = await fetch(`/${mergedData.type}/edit/${mergedData.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(mergedData)
            });
            
            if (response.ok) {
                console.log("Updated via API route");
                // Reload the page to show changes
                window.location.reload();
                return;
            }
            
            throw new Error('All update attempts failed');
            
        } catch (error) {
            console.error('Error editing transaction:', error);
            alert('Error editing transaction. Please try again.');
            
            // Reset button state
            this.innerHTML = '<i class="bi bi-check2 me-1"></i>Save Changes';
            this.disabled = false;
        }
    });
    
    // Update transaction in UI without page reload
    function updateTransactionInUI(updatedTransaction) {
        console.log('Updating UI with transaction data:', updatedTransaction);
        
        // Update amount
        const amountElement = document.querySelector('.transaction-amount');
        if (amountElement && updatedTransaction.amount) {
            amountElement.textContent = formatCurrency(updatedTransaction.amount, updatedTransaction.currency || 'USD');
        }
        
        // Update account name
        const accountElement = document.querySelector('.transaction-account');
        if (accountElement && updatedTransaction.accountName) {
            accountElement.textContent = updatedTransaction.accountName;
        }
        
        // Update description/purpose
        const descriptionElement = document.querySelector('.transaction-description, .transaction-purpose');
        if (descriptionElement) {
            if (updatedTransaction.description) {
                descriptionElement.textContent = updatedTransaction.description;
            } else if (updatedTransaction.purpose) {
                descriptionElement.textContent = updatedTransaction.purpose;
            }
        }
        
        // Update bank/market name
        const bankElement = document.querySelector('.transaction-bank, .transaction-market');
        if (bankElement) {
            if (updatedTransaction.bankName) {
                bankElement.textContent = updatedTransaction.bankName;
            } else if (updatedTransaction.market) {
                bankElement.textContent = updatedTransaction.market;
            }
        }
        
        // Show success message
        const alertPlaceholder = document.querySelector('.alert-container') || document.createElement('div');
        if (!document.querySelector('.alert-container')) {
            alertPlaceholder.className = 'alert-container';
            document.querySelector('.container').prepend(alertPlaceholder);
        }
        
        const alertHTML = `
            <div class="alert alert-success alert-dismissible fade show" role="alert">
                Transaction updated successfully!
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertPlaceholder.innerHTML = alertHTML;
        
        // Auto dismiss after 3 seconds
        setTimeout(() => {
            const alert = document.querySelector('.alert');
            if (alert) {
                const bsAlert = new bootstrap.Alert(alert);
                bsAlert.close();
            }
        }, 3000);
        
        // Update window.transactionData to reflect changes
        window.transactionData = updatedTransaction;
    }
    
    // Helper function to format currency
    function formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    // Handle copy buttons
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const textToCopy = button.getAttribute('data-copy-text');
            try {
                await navigator.clipboard.writeText(textToCopy);
                
                // Change icon temporarily to show success
                const icon = button.querySelector('i');
                icon.className = 'fas fa-check';
                setTimeout(() => {
                    icon.className = 'fas fa-copy';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text:', err);
            }
        });
    });

    // Handle auto-formatting of amount inputs
    const amountInputs = document.querySelectorAll('input[type="number"][data-format="currency"]');
    amountInputs.forEach(input => {
        input.addEventListener('blur', (e) => {
            const value = parseFloat(e.target.value);
            if (!isNaN(value)) {
                e.target.value = value.toFixed(2);
            }
        });
    });
});