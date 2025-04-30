// Variables defined at module scope for wider accessibility
let bankCards;
let selectedBankInput;
let bankForm;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    // Set up event listeners
    setupEventListeners();
});

function initializeElements() {
    try {
        bankCards = document.querySelectorAll('.bank-card');
        selectedBankInput = document.querySelector('input[name="bankName"]');
        bankForm = document.getElementById('bankForm');

        if (!selectedBankInput) {
            console.error('Bank input not found');
            return;
        }
        if (!bankForm) {
            console.error('Bank form not found');
            return;
        }
        if (bankCards.length === 0) {
            console.warn('No bank cards found. Please add banks first.');
        }
    } catch (error) {
        console.error('Error initializing elements:', error);
    }
}

function setupEventListeners() {
    try {
        // Set up bank card click listeners
        bankCards?.forEach(card => {
            card.addEventListener('click', function() {
                bankCards.forEach(c => c.classList.remove('selected-bank'));
                this.classList.add('selected-bank');
                selectedBankInput.value = this.dataset.bank;
            });
        });

        // Set up form submit listener
        bankForm?.addEventListener('submit', handleFormSubmit);
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();

    try {
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        // If tax field is empty, set it to 0
        if (!data.tax || data.tax.trim() === '') {
            data.tax = '0';
        }
        
        const response = await fetch('/bank/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to process transfer');
            } else {
                throw new Error('Server returned ' + response.status + ' ' + response.statusText);
            }
        }

        const result = await response.json();
        
        // Update success modal content
        document.getElementById('successMessage').textContent = 'Bank transfer processed successfully!';
        
        // Format the amount and include tax information if tax was entered
        let amountDisplay = `${data.currency} ${parseFloat(data.amount).toLocaleString()}`;
        if (parseFloat(data.tax) > 0) {
            amountDisplay += ` (Tax: ${data.currency} ${parseFloat(data.tax).toLocaleString()})`;
        }
        
        document.getElementById('modalAmount').textContent = amountDisplay;
        document.getElementById('modalBankName').textContent = data.bankName;
        document.getElementById('modalAccountName').textContent = data.accountName;
        document.getElementById('modalType').textContent = data.transactionType;
        document.getElementById('modalDescription').textContent = data.description || '-';
        
        // Show success modal
        const successModal = new bootstrap.Modal(document.getElementById('successModal'));
        successModal.show();
        
        // Reset form and selection
        this.reset();
        bankCards?.forEach(c => c.classList.remove('selected-bank'));
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error connecting to server. Please try again. If the problem persists, refresh the page.');
    }
}