// Variables defined at module scope for wider accessibility
let bankCards;
let selectedBankInput;
let bankForm;

document.addEventListener('DOMContentLoaded', function() {
    // Initialize elements
    initializeElements();
    // Sort bank cards alphabetically by bank name
    sortBankCardsByName();
    // Set up event listeners
    setupEventListeners();
    
    // Set up bank table sort functionality
    setupBankTableSort();
    
    // Force sorting on initial load
    setTimeout(() => {
        // Check if we're on a page with bank sorting table
        const bankColumnHeader = document.getElementById('bankColumnHeader');
        if (bankColumnHeader) {
            console.log('DOMContentLoaded - Applying initial bank sort');
            sortBankTableByColumn('bank', 'asc');
        }
    }, 100);

    // Ensure the table applies the deep blue theme dynamically if needed
    const table = document.querySelector('table');
    if (table) {
        table.classList.add('deep-blue-table');
    }
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

// Function to sort bank cards by bank name
function sortBankCardsByName() {
    try {
        if (!bankCards || bankCards.length === 0) return;
        
        // Convert NodeList to Array for sorting
        const bankCardsArray = Array.from(bankCards);
        
        // Sort the array based on the data-bank attribute (bank name)
        bankCardsArray.sort((a, b) => {
            const bankNameA = a.dataset.bank.toUpperCase();
            const bankNameB = b.dataset.bank.toUpperCase();
            return bankNameA.localeCompare(bankNameB);
        });
        
        // Get the container of the bank cards
        const container = bankCardsArray[0].parentNode;
        
        // Append the sorted cards to the container
        bankCardsArray.forEach(card => container.appendChild(card));
        
        // Update the bankCards NodeList to reflect the new order
        bankCards = document.querySelectorAll('.bank-card');
        console.log('Bank cards sorted alphabetically by name');
    } catch (error) {
        console.error('Error sorting bank cards:', error);
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

        // Add ripple animation to submit button on click (same as hawala page)
        const submitBtn = document.querySelector('#bankForm button[type="submit"]');
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
    } catch (error) {
        console.error('Error setting up event listeners:', error);
    }
}

// Setup bank table sorting functionality
function setupBankTableSort() {
    // Get the bank column header and sort icon
    const bankColumnHeader = document.getElementById('bankColumnHeader');
    const bankSortIcon = document.getElementById('bankSortIcon');
    
    // Default sort direction (ascending)
    let currentSortDirection = 'asc';
    
    // If elements exist (we're on the bank history tab)
    if (bankColumnHeader && bankSortIcon) {
        // Sort the table by bank name initially (ascending)
        sortBankTableByColumn('bank', currentSortDirection);
        
        // Add click event listener to toggle sort direction
        bankColumnHeader.addEventListener('click', function() {
            // Toggle sort direction
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            
            // Update sort icon
            if (currentSortDirection === 'asc') {
                bankSortIcon.className = 'bi bi-sort-alpha-down ms-1';
            } else {
                bankSortIcon.className = 'bi bi-sort-alpha-up ms-1';
            }
            
            // Sort the table
            sortBankTableByColumn('bank', currentSortDirection);
        });
    }
}

// Function to sort bank table by column
function sortBankTableByColumn(column, direction) {
    try {
        console.log(`Sorting bank table by ${column}, direction: ${direction}`);
        
        const table = document.querySelector('#historyTab .table');
        if (!table) {
            console.warn('Bank table not found for sorting');
            return;
        }
        
        const tbody = table.querySelector('tbody');
        if (!tbody) {
            console.warn('Bank table tbody not found for sorting');
            return;
        }
        
        const rows = Array.from(tbody.querySelectorAll('tr.transaction-row'));
        if (rows.length === 0) {
            console.log('No bank rows found to sort');
            return;
        }
        
        console.log(`Found ${rows.length} bank rows to sort`);
        
        // Sort rows
        const sortedRows = rows.sort((rowA, rowB) => {
            try {
                // For bank column (index 1)
                const cellA = rowA.cells[1].textContent.trim().toLowerCase();
                const cellB = rowB.cells[1].textContent.trim().toLowerCase();
                
                // Sort based on direction
                return direction === 'asc' 
                    ? cellA.localeCompare(cellB) 
                    : cellB.localeCompare(cellA);
            } catch (err) {
                console.error('Error comparing bank rows:', err);
                return 0; // Keep original order if comparison fails
            }
        });
        
        // Remove existing rows
        rows.forEach(row => {
            if (row.parentNode === tbody) {
                tbody.removeChild(row);
            }
        });
        
        // Append sorted rows
        sortedRows.forEach(row => tbody.appendChild(row));
        
        console.log('Bank table sorting complete');
    } catch (error) {
        console.error('Error sorting bank table:', error);
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
        
        // Add event listener to refresh the page when modal is hidden
        document.getElementById('successModal').addEventListener('hidden.bs.modal', function() {
            window.location.reload();
        });
        
        // Reset form and selection
        this.reset();
        bankCards?.forEach(c => c.classList.remove('selected-bank'));
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error connecting to server. Please try again. If the problem persists, refresh the page.');
    }
}