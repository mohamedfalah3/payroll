// This file contains extra handlers for sorting table data
// It addresses the issue where sorting wasn't consistently applied on page load

// Wait for the full page to load, then apply sorting to the tables
window.addEventListener('load', function() {
    console.log('Window fully loaded - applying sorting fixes');
    
    // Check if we're on the hawala history tab - make sure sorting is applied  
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('tab') === 'history') {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            console.log('[Window Load] Reapplying market sort...');
            
            // Check if the sortTransactions function exists
            if (typeof sortTransactions === 'function') {
                sortTransactions();
            }
        }, 300);
    }
    
    // Check if we're on a page with a bank table - find the bank sort functionality
    const bankColumnHeader = document.getElementById('bankColumnHeader');
    const bankSortIcon = document.getElementById('bankSortIcon');
    
    if (bankColumnHeader && bankSortIcon) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            console.log('[Window Load] Reapplying bank sort...');
            
            // Check if the sortBankTableByColumn function exists
            if (typeof sortBankTableByColumn === 'function') {
                // Apply ascending sort by default
                sortBankTableByColumn('bank', 'asc');
            }
        }, 300);
    }
});
