// Google Authentication and Dashboard Management

// User data
let currentUser = null;
let userWhiteboards = [];
const API_BASE_URL = '/.netlify/functions';

// DOM Elements
const loginContainer = document.getElementById('login-container');
const dashboardContainer = document.getElementById('dashboard-container');
const whiteboardContainer = document.getElementById('whiteboard-container');
const whiteboardsGrid = document.getElementById('whiteboards-grid');
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const createWhiteboardBtn = document.getElementById('create-whiteboard-btn');
const signOutBtn = document.getElementById('sign-out-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already signed in
    if (localStorage.getItem('whiteboardly_user')) {
        try {
            currentUser = JSON.parse(localStorage.getItem('whiteboardly_user'));
            onUserSignedIn();
        } catch (e) {
            console.error('Error parsing stored user:', e);
            localStorage.removeItem('whiteboardly_user');
        }
    }
    
    // Set up event listeners
    if (createWhiteboardBtn) {
        createWhiteboardBtn.addEventListener('click', createNewWhiteboard);
    }
    
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }
    
    if (backToDashboardBtn) {
        backToDashboardBtn.addEventListener('click', showDashboard);
    }
    
    // Set up filter dropdown
    const filterButton = document.querySelector('.filter-button');
    const filterDropdown = document.querySelector('.filter-dropdown-content');
    const filterOptions = document.querySelectorAll('.filter-option');
    
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            filterDropdown.classList.toggle('show');
        });
        
        // Close dropdown when clicking outside
        window.addEventListener('click', (e) => {
            if (!e.target.matches('.filter-button') && filterDropdown.classList.contains('show')) {
                filterDropdown.classList.remove('show');
            }
        });
        
        // Handle filter option selection
        filterOptions.forEach(option => {
            option.addEventListener('click', () => {
                // Update selected state
                filterOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Update button text
                filterButton.textContent = option.querySelector('span:last-child').textContent;
                
                // Close dropdown
                filterDropdown.classList.remove('show');
                
                // Apply filter
                applyWhiteboardFilter(option.querySelector('span:last-child').textContent);
            });
        });
    }
    
    // Set up refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            loadWhiteboards();
        });
    }
});

// Google Sign In Handler for new Google Identity Services
function handleCredentialResponse(response) {
    // Parse the JWT token
    const responsePayload = parseJwt(response.credential);
    
    currentUser = {
        id: responsePayload.sub,
        name: responsePayload.name,
        email: responsePayload.email,
        avatar: responsePayload.picture,
        token: response.credential
    };
    
    // Store user info
    localStorage.setItem('whiteboardly_user', JSON.stringify(currentUser));
    
    onUserSignedIn();
}

// Helper function to parse JWT tokens
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

// Handle when user is signed in
function onUserSignedIn() {
    if (!currentUser) return;
    
    // Update UI with user info
    if (userAvatar) userAvatar.src = currentUser.avatar;
    if (userName) userName.textContent = currentUser.name;
    
    // Load user's whiteboards
    loadWhiteboards();
    
    // Show dashboard
    showDashboard();
}

// Sign out
function signOut() {
    // Clear the user data
    currentUser = null;
    localStorage.removeItem('whiteboardly_user');
    
    // Return to login screen
    if (loginContainer) {
        loginContainer.classList.remove('hidden');
        loginContainer.classList.add('flex');
        loginContainer.style.display = 'flex';
    }
    
    if (dashboardContainer) {
        dashboardContainer.classList.add('hidden');
        dashboardContainer.classList.remove('flex');
        dashboardContainer.style.display = 'none';
    }
    
    if (whiteboardContainer) {
        whiteboardContainer.classList.add('hidden');
        whiteboardContainer.classList.remove('flex');
        whiteboardContainer.style.display = 'none';
    }
    
    // Reload the page to clear the Google Identity Services state
    window.location.reload();
}

// Shows the dashboard, hides other containers
function showDashboard() {
    if (!currentUser && !isDevelopmentMode()) return;
    
    // Ensure login container is hidden
    if (loginContainer) {
        loginContainer.classList.add('hidden');
        loginContainer.classList.remove('flex');
        loginContainer.style.display = 'none'; // Add explicit display none for reliability
    }
    
    // Make dashboard visible
    if (dashboardContainer) {
        dashboardContainer.classList.remove('hidden');
        dashboardContainer.classList.add('flex');
        dashboardContainer.style.display = 'flex'; // Add explicit display flex for reliability
    }
    
    // Hide whiteboard container
    if (whiteboardContainer) {
        whiteboardContainer.classList.add('hidden');
        whiteboardContainer.classList.remove('flex');
        whiteboardContainer.style.display = 'none'; // Add explicit display none for reliability
    }
    
    console.log('[DEBUG] Dashboard should now be visible');
    console.log('[DEBUG] Container classes:', 
        'login:', loginContainer?.className,
        'dashboard:', dashboardContainer?.className,
        'whiteboard:', whiteboardContainer?.className
    );
    
    // Refresh whiteboard list
    loadWhiteboards();
}

// Check if in development mode
function isDevelopmentMode() {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

// Load whiteboards from server
async function loadWhiteboards() {
    if (!currentUser) return;
    
    try {
        showLoadingIndicator();
        
        // Check if we're in a local environment (localhost)
        const isLocalhost = isDevelopmentMode();
        
        // If local, skip API call and use localStorage only
        if (isLocalhost) {
            console.log('Running in local development - using localStorage for whiteboards');
            const localWhiteboards = localStorage.getItem('whiteboardly_local_boards');
            if (localWhiteboards) {
                try {
                    userWhiteboards = JSON.parse(localWhiteboards);
                } catch (e) {
                    console.error('Error parsing local whiteboards:', e);
                    userWhiteboards = [];
                }
            } else {
                userWhiteboards = [];
            }
            renderWhiteboardsList();
            hideLoadingIndicator();
            return;
        }
        
        // For production - fetch from Netlify function
        const response = await fetch(`${API_BASE_URL}/getWhiteboards`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error fetching whiteboards: ${response.statusText}`);
        }
        
        const data = await response.json();
        userWhiteboards = data.whiteboards || [];
        
        // Render whiteboards
        renderWhiteboardsList();
    } catch (error) {
        console.error('Error loading whiteboards:', error);
        showError('Using local storage for whiteboards (API unavailable)');
        
        // If API fails, check if we have any whiteboards in localStorage as fallback
        const localWhiteboards = localStorage.getItem('whiteboardly_local_boards');
        if (localWhiteboards) {
            try {
                userWhiteboards = JSON.parse(localWhiteboards);
                renderWhiteboardsList();
            } catch (e) {
                console.error('Error parsing local whiteboards:', e);
            }
        }
    } finally {
        hideLoadingIndicator();
    }
}

// Add the missing promptRenameWhiteboard function
function promptRenameWhiteboard(whiteboardId, nameElement) {
    // Find the whiteboard in the list
    const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
    if (!whiteboard) return;
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'rename-modal';
    
    // Create modal content
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Rename Whiteboard</h3>
            <form id="rename-form">
                <input type="text" id="new-whiteboard-name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                    value="${whiteboard.name}" placeholder="Enter whiteboard name">
                <div class="mt-4 flex justify-end gap-2">
                    <button type="button" id="cancel-rename" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                        Cancel
                    </button>
                    <button type="submit" id="confirm-rename" class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                        Rename
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Focus the input
    setTimeout(() => {
        const input = document.getElementById('new-whiteboard-name');
        if (input) {
            input.focus();
            input.select();
        }
    }, 50);
    
    // Handle cancel button
    document.getElementById('cancel-rename').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    // Handle form submission
    document.getElementById('rename-form').addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent form submission
        
        const newName = document.getElementById('new-whiteboard-name').value.trim();
        if (newName && newName !== whiteboard.name) {
            // Update whiteboard name
            whiteboard.name = newName;
            whiteboard.updatedAt = new Date().toISOString();
            
            // Update UI immediately
            if (nameElement) {
                nameElement.textContent = newName;
            }
            
            // Check if we're in local environment
            const isLocalhost = isDevelopmentMode();
            
            // Always save to localStorage
            localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
            
            // If not local or local whiteboard, send to server
            if (!isLocalhost && !whiteboard.isLocal) {
                try {
                    const response = await fetch(`${API_BASE_URL}/saveWhiteboard`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${currentUser.token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            whiteboard: whiteboard,
                            content: null
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Error renaming whiteboard: ${response.statusText}`);
                    }
                } catch (error) {
                    console.error('Error renaming whiteboard:', error);
                    showError('Failed to rename whiteboard on server. Changes saved locally.');
                }
            }
        }
        
        // Remove modal immediately after rename is processed
        document.body.removeChild(modal);
    });
    
    // We don't need the confirm-rename click handler anymore as we're using form submission
    // But we keep the Enter and Escape key handlers for better UX
    document.getElementById('new-whiteboard-name').addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.getElementById('cancel-rename').click();
        }
        // Enter key is handled automatically by form submission
    });
}

// Modify createNewWhiteboard to use a popup
async function createNewWhiteboard() {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.id = 'create-whiteboard-modal';
    
    // Create modal content
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Whiteboard</h3>
            <input type="text" id="new-whiteboard-name" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary" 
                value="Untitled Whiteboard" placeholder="Enter whiteboard name">
            <div class="mt-4 flex justify-end gap-2">
                <button id="cancel-create" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
                    Cancel
                </button>
                <button id="confirm-create" class="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary-dark">
                    Create
                </button>
            </div>
        </div>
    `;
    
    // Add to document
    document.body.appendChild(modal);
    
    // Focus the input
    setTimeout(() => {
        const input = document.getElementById('new-whiteboard-name');
        if (input) {
            input.focus();
            input.select();
        }
    }, 50);
    
    // Return a promise that resolves when the user confirms
    return new Promise((resolve, reject) => {
        // Handle cancel button
        document.getElementById('cancel-create').addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve(null); // User cancelled
        });
        
        // Handle confirm button
        document.getElementById('confirm-create').addEventListener('click', async () => {
            const whiteboardName = document.getElementById('new-whiteboard-name').value.trim() || "Untitled Whiteboard";
            document.body.removeChild(modal);
            
            try {
                showLoadingIndicator();
                
                const isLocalhost = isDevelopmentMode();
                let newWhiteboard;
                
                // Create local whiteboard object
                newWhiteboard = {
                    id: 'wb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
                    name: whiteboardName,
                    owner: currentUser?.id || 'local_user',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isLocal: isLocalhost,
                    content: null,
                    thumbnail: null
                };
                
                // Add to user's whiteboards
                userWhiteboards.push(newWhiteboard);
                
                // Save to localStorage (for both local and production for offline capability)
                localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
                
                // Only call API if not in local mode
                if (!isLocalhost) {
                    const response = await fetch(`${API_BASE_URL}/saveWhiteboard`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${currentUser.token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ 
                            whiteboard: newWhiteboard,
                            content: null
                        })
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Error saving whiteboard: ${response.statusText}`);
                    }
                    
                    // Get updated whiteboard with server ID
                    const data = await response.json();
                    if (data.whiteboard && data.whiteboard.id) {
                        // Update the local copy with server ID
                        const index = userWhiteboards.findIndex(wb => wb.id === newWhiteboard.id);
                        if (index !== -1) {
                            userWhiteboards[index] = data.whiteboard;
                            localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
                        }
                        newWhiteboard = data.whiteboard;
                    }
                }
                
                // Re-render the whiteboards list
                renderWhiteboardsList();
                
                // Open the newly created whiteboard
                openWhiteboard(newWhiteboard.id);
                resolve(newWhiteboard);
                
            } catch (error) {
                console.error('Error creating whiteboard:', error);
                showError('Failed to create new whiteboard. Please try again.');
                reject(error);
            } finally {
                hideLoadingIndicator();
            }
        });
        
        // Handle Enter key in input
        document.getElementById('new-whiteboard-name').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('confirm-create').click();
            } else if (e.key === 'Escape') {
                document.getElementById('cancel-create').click();
            }
        });
    });
}

// Open a whiteboard
async function openWhiteboard(whiteboardId) {
    if (!whiteboardId) {
        console.error('No whiteboard ID provided');
        return;
    }
    
    console.log('Opening whiteboard:', whiteboardId);
    
    try {
        showLoadingIndicator();
        
        // Show the whiteboard container and hide login/dashboard
        if (loginContainer) {
            loginContainer.classList.add('hidden');
            loginContainer.classList.remove('flex');
            loginContainer.style.display = 'none';
        }
        
        if (dashboardContainer) {
            dashboardContainer.classList.add('hidden');
            dashboardContainer.classList.remove('flex');
            dashboardContainer.style.display = 'none';
        }
        
        if (whiteboardContainer) {
            whiteboardContainer.classList.remove('hidden');
            whiteboardContainer.classList.add('flex');
            whiteboardContainer.style.display = 'flex';
        }
        
        console.log('[DEBUG] Container visibility after opening whiteboard:',
            'login:', loginContainer?.style.display,
            'dashboard:', dashboardContainer?.style.display,
            'whiteboard:', whiteboardContainer?.style.display
        );
        
        // Check if we're in a local environment
        const isLocalhost = isDevelopmentMode();
        
        // Find the whiteboard in our local array
        const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
        
        if (!whiteboard) {
            console.error('Whiteboard not found:', whiteboardId);
            showError('Whiteboard not found');
            return;
        }
        
        // Initialize whiteboard with content
        if (!window.whiteboardApp) {
            // Initialize the whiteboard if it doesn't exist
            console.log('Creating new whiteboard instance');
            window.whiteboardApp = new Whiteboard();
        }
        
        window.whiteboardApp.currentWhiteboardId = whiteboardId;
        
        // Force canvas size update
        if (window.whiteboardApp.canvas) {
            window.whiteboardApp.canvas.width = window.whiteboardApp.canvas.clientWidth;
            window.whiteboardApp.canvas.height = window.whiteboardApp.canvas.clientHeight;
        }
        
        // Reset view to ensure no offset when opening
        if (typeof window.whiteboardApp.resetView === 'function') {
            window.whiteboardApp.resetView();
        }
        
        console.log('Whiteboard initialized with ID:', whiteboardId);
        
    } catch (error) {
        console.error('Error opening whiteboard:', error);
        showError('Failed to open whiteboard');
    } finally {
        hideLoadingIndicator();
    }
}

// Save whiteboard
async function saveWhiteboard(whiteboardId, content, thumbnail) {
    if (!currentUser || !whiteboardId) return;
    
    try {
        const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
        if (!whiteboard) {
            throw new Error(`Whiteboard not found: ${whiteboardId}`);
        }
        
        // Update the whiteboard metadata
        whiteboard.updatedAt = new Date().toISOString();
        whiteboard.thumbnail = thumbnail;
        
        // Check if we're in local environment
        const isLocalhost = isDevelopmentMode();
        
        // Always save to localStorage
        localStorage.setItem(`whiteboard_content_${whiteboardId}`, content);
        localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
        
        // If local environment or a local whiteboard, don't send to server
        if (isLocalhost || whiteboard.isLocal) {
            console.log('Saving whiteboard to localStorage only (development mode)');
            return;
        }
        
        // Production - save to server
        const response = await fetch(`${API_BASE_URL}/saveWhiteboard`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                whiteboard: whiteboard,
                content: content 
            })
        });
        
        if (!response.ok) {
            throw new Error(`Error saving whiteboard: ${response.statusText}`);
        }
        
        // Update local array
        const index = userWhiteboards.findIndex(wb => wb.id === whiteboardId);
        if (index !== -1) {
            userWhiteboards[index] = whiteboard;
        }
        
    } catch (error) {
        console.error('Error saving whiteboard:', error);
        showError('Saving to local storage only');
        
        // Ensure it's saved to localStorage
        localStorage.setItem(`whiteboard_content_${whiteboardId}`, content);
    }
}

// Delete a whiteboard
async function deleteWhiteboard(whiteboardId) {
    if (!currentUser || !whiteboardId) return;
    
    try {
        showLoadingIndicator();
        
        const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
        if (!whiteboard) {
            throw new Error(`Whiteboard not found: ${whiteboardId}`);
        }
        
        // If it's a local whiteboard, remove from localStorage only
        if (whiteboard.isLocal) {
            localStorage.removeItem(`whiteboard_content_${whiteboardId}`);
            userWhiteboards = userWhiteboards.filter(wb => wb.id !== whiteboardId);
            localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
            renderWhiteboardsList();
            return;
        }
        
        // Delete from server - changed from DELETE to POST for better compatibility
        const response = await fetch(`${API_BASE_URL}/deleteWhiteboard?id=${whiteboardId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Handle 404 as success - the whiteboard doesn't exist on server which is what we wanted
        if (response.status === 404) {
            console.log(`Whiteboard ${whiteboardId} not found on server, removing from local storage.`);
            // Just continue with local cleanup
        } else if (!response.ok) {
            throw new Error(`Error deleting whiteboard: ${response.statusText}`);
        }
        
        // Remove from local array
        userWhiteboards = userWhiteboards.filter(wb => wb.id !== whiteboardId);
        
        // Also update localStorage
        localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
        
        // Refresh the display
        renderWhiteboardsList();
    } catch (error) {
        console.error('Error deleting whiteboard:', error);
        showError('Failed to delete the whiteboard. Please try again.');
    } finally {
        hideLoadingIndicator();
    }
}

// Render whiteboards list in the dashboard
function renderWhiteboardsList() {
    if (!whiteboardsGrid) return;
    
    // Clear the grid
    whiteboardsGrid.innerHTML = '';
    
    // Add "Create New" button first
    const createNewCard = document.createElement('div');
    createNewCard.className = 'whiteboard-card bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center p-4 hover:bg-gray-100 transition-colors cursor-pointer min-h-[150px]';
    createNewCard.innerHTML = `
        <div class="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
        </div>
        <span class="text-sm font-medium text-gray-800">Create new whiteboard</span>
    `;
    createNewCard.addEventListener('click', createNewWhiteboard);
    whiteboardsGrid.appendChild(createNewCard);
    
    // Sort whiteboards by updated date (newest first)
    const sortedWhiteboards = [...userWhiteboards].sort((a, b) => {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });
    
    // Add each whiteboard card
    sortedWhiteboards.forEach(whiteboard => {
        const card = document.createElement('div');
        card.className = 'whiteboard-card bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow';
        
        // Thumbnail container (maintains aspect ratio)
        const thumbnailContainer = document.createElement('div');
        thumbnailContainer.className = 'h-24 bg-gray-50 relative overflow-hidden';
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'absolute inset-0 flex items-center justify-center';
        
        if (whiteboard.thumbnail) {
            const img = document.createElement('img');
            img.src = whiteboard.thumbnail;
            img.className = 'w-full h-full object-contain';
            thumbnail.appendChild(img);
        } else {
            thumbnail.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2z" />
                </svg>
            `;
        }
        
        thumbnailContainer.appendChild(thumbnail);
        card.appendChild(thumbnailContainer);
        
        // Whiteboard info
        const infoContainer = document.createElement('div');
        infoContainer.className = 'p-3';
        
        const nameWrapper = document.createElement('div');
        nameWrapper.className = 'flex items-center justify-between';
        
        const nameElement = document.createElement('h3');
        nameElement.className = 'whiteboard-name text-sm font-medium text-gray-800 truncate';
        nameElement.textContent = whiteboard.name;
        
        const editIcon = document.createElement('button');
        editIcon.className = 'upload-image-btn ml-2 text-gray-400 hover:text-gray-600';
        editIcon.title = 'Upload image to whiteboard';
        editIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        `;
        
        nameWrapper.appendChild(nameElement);
        nameWrapper.appendChild(editIcon);
        infoContainer.appendChild(nameWrapper);
        
        // Date info
        const dateInfo = document.createElement('p');
        dateInfo.className = 'text-xs text-gray-500 mt-1';
        const updateDate = new Date(whiteboard.updatedAt);
        dateInfo.textContent = `Last edited: ${updateDate.toLocaleDateString()}`;
        infoContainer.appendChild(dateInfo);
        
        // Action buttons
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'flex gap-2 mt-3';
        
        const openButton = document.createElement('button');
        openButton.className = 'flex-1 inline-flex justify-center items-center px-3 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary-dark transition-colors';
        openButton.textContent = 'Open';
        openButton.addEventListener('click', () => openWhiteboard(whiteboard.id));
        actionsContainer.appendChild(openButton);
        
        const renameButton = document.createElement('button');
        renameButton.className = 'inline-flex justify-center items-center px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 transition-colors';
        renameButton.textContent = 'Rename';
        renameButton.addEventListener('click', (e) => {
            e.stopPropagation();
            promptRenameWhiteboard(whiteboard.id, nameElement);
        });
        actionsContainer.appendChild(renameButton);
        
        const deleteButton = document.createElement('button');
        deleteButton.className = 'inline-flex justify-center items-center px-2 py-1.5 text-red-500 hover:text-red-700 transition-colors';
        deleteButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        `;
        deleteButton.addEventListener('click', (e) => {
            e.stopPropagation();
            confirmDeleteWhiteboard(whiteboard.id);
        });
        actionsContainer.appendChild(deleteButton);
        
        infoContainer.appendChild(actionsContainer);
        card.appendChild(infoContainer);
        
        // Add to grid
        whiteboardsGrid.appendChild(card);
        
        // Add image upload functionality
        editIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            uploadImageToWhiteboard(whiteboard.id);
        });
    });
}

// Generate a random pastel color for thumbnails without images
function getRandomPastelColor() {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 70%, 85%)`;
}

// Show loading indicator
function showLoadingIndicator() {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
        loadingEl.classList.remove('hidden');
    }
}

// Hide loading indicator
function hideLoadingIndicator() {
    const loadingEl = document.getElementById('loading-indicator');
    if (loadingEl) {
        loadingEl.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    const errorEl = document.getElementById('error-message');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorEl.classList.add('hidden');
        }, 5000);
    }
}

// Expose methods to be used by the whiteboard app
window.whiteboardDashboard = {
    saveWhiteboard,
    showDashboard
};

// Apply filter to whiteboards
function applyWhiteboardFilter(filterText) {
    // For this demo, we're just reloading all whiteboards
    // In a real app, you'd filter based on ownership
    loadWhiteboards();
}

// Add the missing confirmDeleteWhiteboard function
function confirmDeleteWhiteboard(whiteboardId) {
    // Find the whiteboard in the list
    const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
    if (!whiteboard) return;
    
    // Ask for confirmation before deleting
    const confirmMessage = `Are you sure you want to delete "${whiteboard.name}"?`;
    if (confirm(confirmMessage)) {
        // If user confirms, delete the whiteboard
        deleteWhiteboard(whiteboardId);
    }
}

// Add image upload handler function
async function uploadImageToWhiteboard(whiteboardId) {
    // Find the whiteboard
    const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
    if (!whiteboard) return;
    
    // Create an input element for file selection
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*'; // Accept all image types
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    
    // Handle file selection
    fileInput.onchange = async (event) => {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            // Show loading indicator
            showLoadingIndicator();
            
            // Create a unique ID for the image
            const imageId = `img_${Date.now()}`;
            
            // Read the file as a data URL
            const reader = new FileReader();
            reader.onload = async function(e) {
                try {
                    const imageData = e.target.result;
                    
                    // Open the whiteboard to add the image
                    await openWhiteboard(whiteboardId);
                    
                    // Add image to whiteboard after it's loaded
                    // We need to wait for the whiteboard to initialize
                    setTimeout(() => {
                        if (window.whiteboardApp && typeof window.whiteboardApp.addImage === 'function') {
                            window.whiteboardApp.addImage(imageData);
                            console.log('Image added to whiteboard:', imageId);
                        } else {
                            console.error('Whiteboard app not initialized or addImage method not available');
                            showError('Unable to add image to whiteboard. Try again later.');
                        }
                        hideLoadingIndicator();
                    }, 500);
                    
                } catch (error) {
                    console.error('Error adding image to whiteboard:', error);
                    showError('Failed to add image to whiteboard');
                    hideLoadingIndicator();
                }
            };
            
            // Error handling for file reading
            reader.onerror = function() {
                console.error('Error reading file');
                showError('Error reading image file');
                hideLoadingIndicator();
            };
            
            // Start reading the file
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('Error handling file upload:', error);
            showError('Error uploading image');
            hideLoadingIndicator();
        } finally {
            // Clean up
            document.body.removeChild(fileInput);
        }
    };
    
    // Trigger file selection dialog
    fileInput.click();
} 