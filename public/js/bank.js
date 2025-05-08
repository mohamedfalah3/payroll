// Variables defined at module scope for wider accessibility
let bankCards;
let selectedBankInput;
let bankForm;

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the bank page
    const isBankPage = document.querySelector('.bank-page');
    if (!isBankPage) return;

    // Initialize elements
    initializeElements();
    // Sort bank cards alphabetically by bank name
    sortBankCardsByName();
    // Set up event listeners
    setupEventListeners();

    // Ensure the table applies the deep blue theme dynamically if needed
    const table = document.querySelector('table');
    if (table) {
        table.classList.add('deep-blue-table');
    }

    // Bank card selection
    const bankCardsContainer = document.getElementById('bankCardsContainer');
    const bankNameInput = document.getElementById('bankNameInput');
    const bankForm = document.getElementById('bankForm');
    
    // Add click event to bank cards
    if (bankCardsContainer) {
        const bankCards = bankCardsContainer.querySelectorAll('.bank-card');
        bankCards.forEach(card => {
            card.addEventListener('click', function() {
                // Remove selected class from all cards
                bankCards.forEach(c => c.classList.remove('selected'));
                // Add selected class to clicked card
                this.classList.add('selected');
                // Set bank name in hidden input
                const bankName = this.dataset.bank;
                if (bankNameInput) {
                    bankNameInput.value = bankName;
                }
            });
        });
    }

    // Form submission
    if (bankForm) {
        bankForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate form
            if (!validateBankForm()) {
                return;
            }

            // Get form data
            const formData = new FormData(bankForm);
            const data = {
                bankName: formData.get('bankName'),
                accountName: formData.get('accountName'),
                nusinga: formData.get('nusinga'),
                transactionType: formData.get('transactionType'),
                currency: formData.get('currency'),
                amount: formData.get('amount'),
                description: formData.get('description')
            };

            // Send data to server
            submitBankTransaction(data);
        });
    }

    // Form validation
    function validateBankForm() {
        const bankName = bankNameInput.value;
        const accountName = document.getElementById('accountNameSelect').value;
        const amount = document.getElementById('amountInput').value;

        if (!bankName) {
            alert('Please select a bank');
            return false;
        }

        if (!accountName) {
            alert('Please select an account');
            return false;
        }

        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return false;
        }

        return true;
    }

    // Submit bank transaction
    function submitBankTransaction(data) {
        fetch('/bank/process', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                showSuccessModal(data);
            } else {
                alert(data.message || 'Transaction failed');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred while processing the transaction');
        });
    }

    // Show success modal
    function showSuccessModal(data) {
        const successModal = document.getElementById('successModal');
        if (successModal) {
            const successMessage = document.getElementById('successMessage');
            const modalAmount = document.getElementById('modalAmount');
            const modalBankName = document.getElementById('modalBankName');
            const modalAccountName = document.getElementById('modalAccountName');
            const modalType = document.getElementById('modalType');
            const modalDescription = document.getElementById('modalDescription');
            
            if (successMessage) successMessage.textContent = data.message || 'Transaction processed successfully!';
            
            const transaction = data.transaction;
            if (transaction) {
                if (modalAmount) {
                    modalAmount.textContent = transaction.currency === 'IQD' 
                        ? `IQD ${parseFloat(transaction.amount).toLocaleString()}`
                        : `$${parseFloat(transaction.amount).toLocaleString()}`;
                }
                if (modalBankName) modalBankName.textContent = transaction.bankName;
                if (modalAccountName) modalAccountName.textContent = transaction.accountName;
                if (modalType) modalType.textContent = transaction.transactionType === 'receive' ? 'Receive' : 'Send';
                if (modalDescription) modalDescription.textContent = transaction.description || '-';
            }
            
            const bsModal = new bootstrap.Modal(successModal);
            bsModal.show();
            
            // Reset form after successful transaction
            bankForm.reset();
            // Remove selected class from all cards
            const bankCards = bankCardsContainer.querySelectorAll('.bank-card');
            bankCards.forEach(c => c.classList.remove('selected'));
        }
    }
    
    // Handle edit transaction
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('show.bs.modal', function(event) {
            const button = event.relatedTarget;
            const transactionData = button ? JSON.parse(button.getAttribute('data-transaction')) : null;
            
            if (transactionData) {
                document.getElementById('editTransactionId').value = transactionData.id;
                document.getElementById('editAmount').value = transactionData.amount;
                document.getElementById('editCurrency').value = transactionData.currency || 'USD';
                document.getElementById('editBankName').value = transactionData.bankName;
                document.getElementById('editAccountName').value = transactionData.accountName;
                document.getElementById('editNusinga').value = transactionData.nusinga || '';
                document.getElementById('editTransactionType').value = transactionData.transactionType;
                document.getElementById('editDescription').value = transactionData.description || '';
                document.getElementById('editTax').value = transactionData.tax || '0';
            }
        });
        
        // Handle edit form submission
        document.getElementById('confirmEdit').addEventListener('click', function() {
            const form = document.getElementById('editTransactionForm');
            const formData = new FormData(form);
            const data = {
                id: formData.get('id'),
                amount: formData.get('amount'),
                currency: formData.get('currency'),
                bankName: formData.get('bankName'),
                accountName: formData.get('accountName'),
                nusinga: formData.get('nusinga'),
                transactionType: formData.get('transactionType'),
                description: formData.get('description'),
                tax: formData.get('tax')
            };
            
            fetch('/transaction/bank/update', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    bootstrap.Modal.getInstance(editModal).hide();
                    
                    // Show success message and reload page
                    alert('Transaction updated successfully');
                    window.location.reload();
                } else {
                    alert(data.message || 'Failed to update transaction');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred while updating the transaction');
            });
        });
    }
    
    // Delete transaction
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        let transactionIdToDelete = null;
        
        window.confirmDelete = function(event, transactionId) {
            event.stopPropagation();
            transactionIdToDelete = transactionId;
            const bsModal = new bootstrap.Modal(deleteModal);
            bsModal.show();
        };
        
        document.getElementById('confirmDelete').addEventListener('click', function() {
            if (transactionIdToDelete) {
                fetch(`/transaction/bank/delete/${transactionIdToDelete}`, {
                    method: 'POST'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        bootstrap.Modal.getInstance(deleteModal).hide();
                        
                        // Show success message and reload page
                        alert('Transaction deleted successfully');
                        window.location.reload();
                    } else {
                        alert(data.message || 'Failed to delete transaction');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('An error occurred while deleting the transaction');
                });
            }
        });
    }
    
    // Function to show edit modal - available globally
    window.showEditModal = function(event, transactionJSON) {
        event.stopPropagation();
        const transaction = typeof transactionJSON === 'string' 
            ? JSON.parse(transactionJSON.replace(/&quot;/g, '"')) 
            : transactionJSON;
            
        const modal = document.getElementById('editModal');
        const bsModal = new bootstrap.Modal(modal);
        
        document.getElementById('editTransactionId').value = transaction.id;
        document.getElementById('editAmount').value = transaction.amount;
        document.getElementById('editCurrency').value = transaction.currency || 'USD';
        document.getElementById('editBankName').value = transaction.bankName;
        document.getElementById('editAccountName').value = transaction.accountName;
        document.getElementById('editNusinga').value = transaction.nusinga || '';
        document.getElementById('editTransactionType').value = transaction.transactionType;
        document.getElementById('editDescription').value = transaction.description || '';
        document.getElementById('editTax').value = transaction.tax || '0';
        
        bsModal.show();
    };
    
    // Transaction row click handler
    window.goToTransactionDetails = function(url) {
        window.location.href = url;
    };
    
    // Transaction row highlighting
    window.toggleHighlight = function(checkbox, transactionId) {
        const row = document.querySelector(`tr[data-transaction-id="${transactionId}"]`);
        if (row) {
            if (checkbox.checked) {
                row.classList.add('highlighted');
            } else {
                row.classList.remove('highlighted');
            }
        }
    };
    
    window.toggleRowHighlight = function(transactionId) {
        const row = document.querySelector(`tr[data-transaction-id="${transactionId}"]`);
        const checkbox = row.querySelector('input[type="checkbox"]');
        
        if (row) {
            row.classList.toggle('highlighted');
            if (checkbox) {
                checkbox.checked = row.classList.contains('highlighted');
            }
        }
    };
});