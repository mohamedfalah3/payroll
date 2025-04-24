// Variables defined at module scope for wider accessibility
let marketCards;
let selectedMarketInput;
let hawalaForm;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    // Set up event listeners
    setupEventListeners();
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
        }
    } catch (error) {
        console.error('Error initializing elements:', error);
    }
}

function setupEventListeners() {
    try {
        // Set up market card click listeners
        marketCards?.forEach(card => {
            card.addEventListener('click', function() {
                marketCards.forEach(c => c.classList.remove('selected-market'));
                this.classList.add('selected-market');
                selectedMarketInput.value = this.dataset.market;
            });
        });

        // Set up form submit listener
        hawalaForm?.addEventListener('submit', handleFormSubmit);
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    try {
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        
        // Client-side validation
        if (!data.market) {
            alert('Please select a market first');
            return;
        }
        if (!data.accountName) {
            alert('Please select an account');
            return;
        }
        if (!data.transactionType) {
            alert('Please select a transaction type');
            return;
        }
        if (!data.amount || isNaN(parseFloat(data.amount))) {
            alert('Please enter a valid amount');
            return;
        }
        if (!data.currency) {
            alert('Please select a currency');
            return;
        }
        
        const requestData = {
            ...data,
            amount: data.amount.toString(),
            nusinga: data.nusinga || '',
            purpose: data.purpose || ''
        };

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
        
        // Reset form and selection
        this.reset();
        marketCards?.forEach(c => c.classList.remove('selected-market'));
        selectedMarketInput.value = '';
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error connecting to server. Please try again. If the problem persists, refresh the page.');
    }
}