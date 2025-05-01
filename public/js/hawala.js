// Variables defined at module scope for wider accessibility
let marketCards;
let selectedMarketInput;
let hawalaForm;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    // Set up event listeners
    setupEventListeners();

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