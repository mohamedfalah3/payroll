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
        
        if (transaction.type === 'hawala') {
            document.getElementById('editCurrency').value = transaction.currency || 'USD';
            document.getElementById('editMarket').value = transaction.market;
            document.getElementById('editNusinga').value = transaction.nusinga || '';
            document.getElementById('editPurpose').value = transaction.purpose || '';
            document.getElementById('editAccountName').value = transaction.accountName;
        } else {
            document.getElementById('editBankName').value = transaction.bankName;
            document.getElementById('editDescription').value = transaction.description || '';
        }
        
        document.getElementById('editTransactionType').value = transaction.transactionType;
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editModal'));
        modal.show();
    } catch (error) {
        console.error('Error parsing transaction data:', error);
        alert('Error opening edit modal. Please try again.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Check if Firebase client is available
    const useFirebase = window.FirebaseClient !== undefined;
    console.log('Firebase client available:', useFirebase);

    // Handle confirm status change button click
    document.getElementById('confirmStatusChange')?.addEventListener('click', function() {
        if (currentForm) {
            // If using Firebase, handle status change directly
            if (useFirebase && window.transactionData) {
                handleFirebaseStatusChange();
            } else {
                currentForm.submit();
            }
        }
        // Hide the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('statusChangeModal'));
        modal.hide();
    });

    // Firebase status change handler
    async function handleFirebaseStatusChange() {
        try {
            const transaction = window.transactionData;
            if (!transaction || !transaction.id) return;
            
            const collectionName = transaction.type === 'bank' ? 'bankTransactions' : 'hawalaTransactions';
            const newStatus = transaction.status === 'pending' ? 'completed' : 'pending';
            
            await window.FirebaseClient.updateDocument(collectionName, transaction.id, {
                status: newStatus,
                lastModified: new Date().toISOString()
            });
            
            // Reload the page to show the updated status
            window.location.reload();
        } catch (error) {
            console.error('Error updating transaction status:', error);
            alert('Error updating transaction status. Please try again.');
        }
    }

    // Handle delete confirmation
    document.getElementById('confirmDelete')?.addEventListener('click', async function() {
        if (!transactionToDelete) return;

        try {
            const urlPath = window.location.pathname;
            const type = urlPath.split('/')[2]; // ['', 'transaction', 'hawala', 'id']
            
            // If using Firebase, handle delete directly
            if (useFirebase) {
                const collectionName = type === 'hawala' ? 'hawalaTransactions' : 'bankTransactions';
                await window.FirebaseClient.deleteDocument(collectionName, transactionToDelete);
                
                // Redirect back to the history page
                const returnDate = new URLSearchParams(window.location.search).get('returnDate');
                window.location.href = `/${type}-history${returnDate ? `?date=${returnDate}` : ''}`;
                return;
            }
            
            // Standard API delete request
            const response = await fetch(`/${type}/delete/${transactionToDelete}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Redirect back to the history page
                const returnDate = new URLSearchParams(window.location.search).get('returnDate');
                window.location.href = `/${type}-history${returnDate ? `?date=${returnDate}` : ''}`;
            } else {
                throw new Error('Failed to delete transaction');
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Error deleting transaction. Please try again.');
        }
    });

    // Handle edit form submission
    document.getElementById('confirmEdit')?.addEventListener('click', async function() {
        const form = document.getElementById('editTransactionForm');
        
        // Use browser's built-in form validation
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const transactionData = Object.fromEntries(formData.entries());

        try {
            // If using Firebase, handle edit directly
            if (useFirebase) {
                const collectionName = transactionData.type === 'hawala' ? 'hawalaTransactions' : 'bankTransactions';
                await window.FirebaseClient.updateDocument(collectionName, transactionData.id, transactionData);
                
                // Reload the page to show the updated transaction
                window.location.reload();
                return;
            }

            // Standard API edit request
            const response = await fetch(`/transaction/edit/${transactionData.id}`, {
                method: 'POST',
                body: JSON.stringify(transactionData),
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                // Reload the page to show the updated transaction
                window.location.reload();
            } else {
                throw new Error('Failed to edit transaction');
            }
        } catch (error) {
            console.error('Error editing transaction:', error);
            alert('Error editing transaction. Please try again.');
        }
    });

    // Handle copy buttons
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
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