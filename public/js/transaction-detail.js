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
    // Handle confirm status change button click
    document.getElementById('confirmStatusChange')?.addEventListener('click', function() {
        if (currentForm) {
            currentForm.submit();
        }
        // Hide the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('statusChangeModal'));
        modal.hide();
    });

    // Handle delete confirmation
    document.getElementById('confirmDelete')?.addEventListener('click', async function() {
        if (!transactionToDelete) return;

        try {
            const urlPath = window.location.pathname;
            const type = urlPath.split('/')[2]; // ['', 'transaction', 'hawala', 'id']
            
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
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Check if account is selected
        if (!data.accountName || data.accountName.trim() === '') {
            alert('Please select an account before saving changes.');
            return;
        }
        
        try {
            const urlPath = window.location.pathname;
            const pathSegments = urlPath.split('/');
            const type = pathSegments[2]; // ['', 'transaction', 'hawala', 'id']
            const endpoint = type === 'hawala' ? '/hawala' : '/bank';
            
            const response = await fetch(`${endpoint}/update/${data.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                // Reload the page to show updated data
                window.location.reload();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update transaction');
            }
        } catch (error) {
            console.error('Error updating transaction:', error);
            alert(error.message || 'Error updating transaction. Please try again.');
        }
    });

    // Handle copy buttons
    const copyButtons = document.querySelectorAll('.copy-button');
    copyButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const textToCopy = button.dataset.copyText;
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