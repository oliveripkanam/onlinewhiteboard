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
    loginContainer.style.display = 'flex';
    dashboardContainer.style.display = 'none';
    whiteboardContainer.style.display = 'none';
    
    // Reload the page to clear the Google Identity Services state
    window.location.reload();
}

// Shows the dashboard, hides other containers
function showDashboard() {
    if (!currentUser) return;
    
    loginContainer.style.display = 'none';
    dashboardContainer.style.display = 'block';
    whiteboardContainer.style.display = 'none';
    
    // Refresh whiteboard list
    loadWhiteboards();
}

// Load whiteboards from server
async function loadWhiteboards() {
    if (!currentUser) return;
    
    try {
        showLoadingIndicator();
        
        // Check if we're in a local environment (localhost)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
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

// Create a new whiteboard
async function createNewWhiteboard() {
    if (!currentUser) return;
    
    try {
        showLoadingIndicator();
        
        // Create new whiteboard object
        const newWhiteboard = {
            id: `wb-${Date.now()}`,
            name: `Whiteboard ${userWhiteboards.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            thumbnail: null
        };
        
        // Check if we're in a local environment
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        if (isLocalhost) {
            console.log('Running in local development - using localStorage for new whiteboard');
            // Just save to localStorage
            newWhiteboard.isLocal = true;
            userWhiteboards.push(newWhiteboard);
            localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
            openWhiteboard(newWhiteboard.id);
            hideLoadingIndicator();
            return;
        }
        
        // Production - send to server
        const response = await fetch(`${API_BASE_URL}/saveWhiteboard`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ whiteboard: newWhiteboard, content: null })
        });
        
        if (!response.ok) {
            throw new Error(`Error creating whiteboard: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Add to local array
        userWhiteboards.push(data.whiteboard || newWhiteboard);
        
        // Also save to localStorage as backup
        localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
        
        // Open the new whiteboard
        openWhiteboard(newWhiteboard.id);
    } catch (error) {
        console.error('Error creating whiteboard:', error);
        showError('Creating local whiteboard instead');
        
        // Fallback: create a local whiteboard only
        const newWhiteboard = {
            id: `local-${Date.now()}`,
            name: `Whiteboard ${userWhiteboards.length + 1}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            thumbnail: null,
            isLocal: true
        };
        
        userWhiteboards.push(newWhiteboard);
        localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
        
        // Refresh the display
        renderWhiteboardsList();
    } finally {
        hideLoadingIndicator();
    }
}

// Open a whiteboard
async function openWhiteboard(whiteboardId) {
    if (!currentUser || !whiteboardId) return;
    
    try {
        showLoadingIndicator();
        
        const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
        if (!whiteboard) {
            throw new Error(`Whiteboard not found: ${whiteboardId}`);
        }
        
        // Check if we're in local development
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        let whiteboardContent = null;
        
        // For local development or local whiteboards, use localStorage
        if (isLocalhost || whiteboard.isLocal) {
            console.log('Using localStorage for whiteboard content in development mode');
            whiteboardContent = localStorage.getItem(`whiteboard_content_${whiteboardId}`);
            
            // Set current whiteboard in our main app
            if (window.whiteboardApp) {
                window.whiteboardApp.loadWhiteboardContent(whiteboardId, whiteboardContent);
            }
            
            // Show whiteboard UI
            dashboardContainer.style.display = 'none';
            whiteboardContainer.style.display = 'flex';
            hideLoadingIndicator();
            return;
        }
        
        // If we're in production, try to fetch from server
        // Fetch content from server
        const response = await fetch(`${API_BASE_URL}/getWhiteboardContent?id=${whiteboardId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Error fetching whiteboard content: ${response.statusText}`);
        }
        
        const data = await response.json();
        whiteboardContent = data.content;
        
        // Set current whiteboard in our main app
        if (window.whiteboardApp) {
            window.whiteboardApp.loadWhiteboardContent(whiteboardId, whiteboardContent);
        }
        
        // Show whiteboard UI
        dashboardContainer.style.display = 'none';
        whiteboardContainer.style.display = 'flex';
        
    } catch (error) {
        console.error('Error opening whiteboard:', error);
        showError('Failed to open the whiteboard. Using local storage as fallback.');
        
        // Try from localStorage as last resort
        const whiteboardContent = localStorage.getItem(`whiteboard_content_${whiteboardId}`);
        
        if (window.whiteboardApp) {
            window.whiteboardApp.loadWhiteboardContent(whiteboardId, whiteboardContent || null);
            dashboardContainer.style.display = 'none';
            whiteboardContainer.style.display = 'flex';
        }
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
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
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
    
    if (!confirm('Are you sure you want to delete this whiteboard? This action cannot be undone.')) {
        return;
    }
    
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
        
        // Delete from server
        const response = await fetch(`${API_BASE_URL}/deleteWhiteboard?id=${whiteboardId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${currentUser.token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
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

// Render the whiteboards list
function renderWhiteboardsList() {
    if (!whiteboardsGrid) return;
    
    whiteboardsGrid.innerHTML = '';
    
    if (!userWhiteboards || userWhiteboards.length === 0) {
        whiteboardsGrid.innerHTML = '<div class="empty-state">No whiteboards yet. Create your first one!</div>';
        return;
    }
    
    userWhiteboards.forEach(whiteboard => {
        const card = document.createElement('div');
        card.className = 'whiteboard-card';
        card.dataset.id = whiteboard.id;
        
        const thumbnail = document.createElement('div');
        thumbnail.className = 'thumbnail';
        if (whiteboard.thumbnail) {
            thumbnail.style.backgroundImage = `url(${whiteboard.thumbnail})`;
        } else {
            thumbnail.classList.add('empty-thumbnail');
        }
        
        const info = document.createElement('div');
        info.className = 'info';
        
        const name = document.createElement('h3');
        name.textContent = whiteboard.name;
        
        const date = document.createElement('p');
        date.className = 'date';
        const formattedDate = new Date(whiteboard.updatedAt).toLocaleDateString();
        date.textContent = `Updated: ${formattedDate}`;
        
        const actions = document.createElement('div');
        actions.className = 'actions';
        
        const editBtn = document.createElement('button');
        editBtn.textContent = 'Open';
        editBtn.className = 'open-btn';
        editBtn.addEventListener('click', () => openWhiteboard(whiteboard.id));
        
        const renameBtn = document.createElement('button');
        renameBtn.textContent = 'Rename';
        renameBtn.className = 'rename-btn';
        renameBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            renameWhiteboard(whiteboard.id);
        });
        
        info.appendChild(name);
        info.appendChild(date);
        actions.appendChild(editBtn);
        actions.appendChild(renameBtn);
        info.appendChild(actions);
        
        card.appendChild(thumbnail);
        card.appendChild(info);
        
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                openWhiteboard(whiteboard.id);
            }
        });
        
        whiteboardsGrid.appendChild(card);
    });
}

// Rename whiteboard function
async function renameWhiteboard(whiteboardId) {
    if (!currentUser || !whiteboardId) return;
    
    try {
        const whiteboard = userWhiteboards.find(wb => wb.id === whiteboardId);
        if (!whiteboard) {
            throw new Error(`Whiteboard not found: ${whiteboardId}`);
        }
        
        // Prompt for new name
        const newName = prompt('Enter a new name for this whiteboard:', whiteboard.name);
        if (!newName || newName.trim() === '') return;
        
        // Update whiteboard name
        whiteboard.name = newName.trim();
        whiteboard.updatedAt = new Date().toISOString();
        
        // Check if we're in local environment
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Always save to localStorage
        localStorage.setItem('whiteboardly_local_boards', JSON.stringify(userWhiteboards));
        
        // If local environment or a local whiteboard, don't send to server
        if (isLocalhost || whiteboard.isLocal) {
            console.log('Updating whiteboard name in localStorage only (development mode)');
            renderWhiteboardsList();
            return;
        }
        
        // Production - update on server
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
        
        // Re-render the whiteboards list
        renderWhiteboardsList();
        
    } catch (error) {
        console.error('Error renaming whiteboard:', error);
        showError('Failed to rename the whiteboard. Changes saved locally only.');
    }
}

// UI Helpers
function showLoadingIndicator() {
    // Check if loading indicator already exists
    let loader = document.getElementById('loading-indicator');
    
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'loading-indicator';
        loader.innerHTML = '<div class="spinner"></div>';
        document.body.appendChild(loader);
    }
    
    loader.style.display = 'flex';
}

function hideLoadingIndicator() {
    const loader = document.getElementById('loading-indicator');
    if (loader) {
        loader.style.display = 'none';
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.classList.add('fade-out');
        setTimeout(() => {
            errorDiv.remove();
        }, 500);
    }, 3000);
}

// Expose methods to be used by the whiteboard app
window.whiteboardDashboard = {
    saveWhiteboard,
    showDashboard
}; 