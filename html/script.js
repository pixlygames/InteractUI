// Global variables
let activeInteractions = {};
let defaultColors = {
    primary: {r: 255, g: 255, b: 255, a: 255},     // Text/key color (pure white)
    secondary: {r: 255, g: 255, b: 255, a: 255},   // Secondary text color (pure white)
    background: {r: 17, g: 207, b: 232, a: 230}    // Background color (bright blue)
};
let pendingUpdates = new Set(); // For batched updates
let updatePending = false; // Flag to avoid redundant animation frames

// Convert RGB object to CSS color string
function rgbToStyle(rgb) {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a / 255})`;
}

// Process all pending updates in one frame
function processPendingUpdates() {
    updatePending = false;
    if (pendingUpdates.size === 0) return;
    
    pendingUpdates.forEach(id => {
        const active = activeInteractions[id];
        if (active && active.element && active.pendingPosition) {
            // Set position based on mode
            if (active.element.classList.contains('icon-mode')) {
                // In icon mode, center the interaction
                active.element.style.left = `${active.pendingPosition.x * 100}%`;
            } else {
                // In full mode, align the first key with the position
                active.element.style.left = `${active.pendingPosition.x * 100}%`;
            }
            
            active.element.style.top = `${active.pendingPosition.y * 100}%`;
            active.pendingPosition = null;
        }
    });
    
    pendingUpdates.clear();
}

// Schedule an update for the next animation frame
function scheduleUpdate(id) {
    pendingUpdates.add(id);
    
    if (!updatePending) {
        updatePending = true;
        requestAnimationFrame(processPendingUpdates);
    }
}

// Create a new interaction element
function createInteractionElement(interaction) {
    // Create base element
    const element = document.createElement('div');
    element.id = `interaction-${interaction.id}`;
    element.className = 'interact-element';
    
    // Set initial positioning based on mode
    if (interaction.mode === 'icon') {
        element.style.left = `${interaction.screenX * 100}%`;
        element.classList.add('icon-mode');
    } else {
        // For full mode, we want the key to be at the same position as it would be in icon mode
        // So first key always appears at the center point
        findKeyPosition(interaction, (keyX) => {
            if (keyX !== null) {
                element.style.left = `${keyX * 100}%`;
            } else {
                element.style.left = `${interaction.screenX * 100}%`;
            }
        });
        element.classList.add('full-mode');
    }
    element.style.top = `${interaction.screenY * 100}%`;
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'interact-content';
    
    // Get colors from interaction options or use defaults
    const colors = interaction.options && interaction.options.colors 
        ? interaction.options.colors 
        : defaultColors;
    
    // Set content based on mode
    if (interaction.mode === 'icon') {
        // In icon mode, only show the first key
        let keyAdded = false;
        for (const part of interaction.processedText) {
            if (part.type === 'key' && !keyAdded) {
                const keySpan = document.createElement('span');
                keySpan.className = 'interact-key';
                keySpan.textContent = part.content;
                
                // Set key color
                keySpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                
                // Set background color
                keySpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                
                content.appendChild(keySpan);
                keyAdded = true;
                break;
            }
        }
    } else {
        // In full mode, build all content at once to reduce DOM operations
        const fragment = document.createDocumentFragment();
        let currentTextParts = [];
        let hasAddedKey = false;
        
        // Process and render each part with appropriate styling
        for (const part of interaction.processedText) {
            if (part.type === 'key') {
                // If we have accumulated text before this key, add it
                if (currentTextParts.length > 0) {
                    const textSpan = document.createElement('span');
                    textSpan.textContent = currentTextParts.join('');
                    // Apply same styling as key
                    textSpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                    textSpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                    fragment.appendChild(textSpan);
                    currentTextParts = [];
                }
                
                // Add the key with distinct styling
                const keySpan = document.createElement('span');
                keySpan.className = 'interact-key';
                keySpan.dataset.firstKey = !hasAddedKey; // Mark the first key
                keySpan.textContent = part.content;
                keySpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                keySpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                fragment.appendChild(keySpan);
                hasAddedKey = true;
            } else {
                // Collect text parts to group them
                currentTextParts.push(part.content);
            }
        }
        
        // Add any remaining text
        if (currentTextParts.length > 0) {
            const textSpan = document.createElement('span');
            textSpan.textContent = currentTextParts.join('');
            // Apply same styling as key
            textSpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
            textSpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
            fragment.appendChild(textSpan);
        }
        
        content.appendChild(fragment);
    }
    
    element.appendChild(content);
    
    // Add animation class
    element.classList.add('fade-in');
    
    // Add to container
    document.getElementById('interact-container').appendChild(element);
    
    // Add to active interactions
    activeInteractions[interaction.id] = {
        element: element,
        interaction: interaction,
        pendingPosition: null
    };
    
    // Show element in next animation frame for better performance
    requestAnimationFrame(() => {
        element.classList.add('visible');
    });
}

// Find the position where the first key should be placed
function findKeyPosition(interaction, callback) {
    // Default to center if no key is found
    let keyX = interaction.screenX;
    
    // Find the first key in processedText
    for (const part of interaction.processedText) {
        if (part.type === 'key') {
            // Found a key, use its position as anchor
            callback(keyX);
            return;
        }
    }
    
    // No key found, use default
    callback(null);
}

// Update an existing interaction
function updateInteraction(interaction) {
    const active = activeInteractions[interaction.id];
    
    if (!active) {
        createInteractionElement(interaction);
        return;
    }
    
    const element = active.element;
    
    // Update position differently based on mode
    if (interaction.mode === 'icon') {
        // In icon mode, center the element
        active.pendingPosition = {
            x: interaction.screenX,
            y: interaction.screenY
        };
    } else {
        // In full mode, try to position based on first key
        findKeyPosition(interaction, (keyX) => {
            active.pendingPosition = {
                x: keyX !== null ? keyX : interaction.screenX,
                y: interaction.screenY
            };
        });
    }
    
    // Schedule the position update for the next animation frame
    scheduleUpdate(interaction.id);
    
    // Only update content if mode changed
    if (active.interaction.mode !== interaction.mode) {
        // Remove old mode classes
        element.classList.remove('icon-mode', 'full-mode');
        
        // Add new mode class
        element.classList.add(interaction.mode === 'icon' ? 'icon-mode' : 'full-mode');
        
        // Clear content for rebuild - this is expensive, only do when necessary
        const content = element.querySelector('.interact-content');
        content.innerHTML = '';
        
        // Get colors from interaction options or use defaults
        const colors = interaction.options && interaction.options.colors 
            ? interaction.options.colors 
            : defaultColors;
        
        if (interaction.mode === 'icon') {
            // In icon mode, only show the first key
            let keyAdded = false;
            for (const part of interaction.processedText) {
                if (part.type === 'key' && !keyAdded) {
                    const keySpan = document.createElement('span');
                    keySpan.className = 'interact-key';
                    keySpan.textContent = part.content;
                    
                    // Set key color
                    keySpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                    
                    // Set background color
                    keySpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                    
                    content.appendChild(keySpan);
                    keyAdded = true;
                    break;
                }
            }
        } else {
            // In full mode, build all content at once
            const fragment = document.createDocumentFragment();
            let currentTextParts = [];
            let hasAddedKey = false;
            
            // Process and render each part with appropriate styling
            for (const part of interaction.processedText) {
                if (part.type === 'key') {
                    // If we have accumulated text before this key, add it
                    if (currentTextParts.length > 0) {
                        const textSpan = document.createElement('span');
                        textSpan.textContent = currentTextParts.join('');
                        // Apply same styling as key
                        textSpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                        textSpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                        fragment.appendChild(textSpan);
                        currentTextParts = [];
                    }
                    
                    // Add the key with distinct styling
                    const keySpan = document.createElement('span');
                    keySpan.className = 'interact-key';
                    keySpan.dataset.firstKey = !hasAddedKey; // Mark the first key
                    keySpan.textContent = part.content;
                    keySpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                    keySpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                    fragment.appendChild(keySpan);
                    hasAddedKey = true;
                } else {
                    // Collect text parts to group them
                    currentTextParts.push(part.content);
                }
            }
            
            // Add any remaining text
            if (currentTextParts.length > 0) {
                const textSpan = document.createElement('span');
                textSpan.textContent = currentTextParts.join('');
                // Apply same styling as key
                textSpan.style.color = rgbToStyle(colors.primary || defaultColors.primary);
                textSpan.style.backgroundColor = rgbToStyle(colors.background || defaultColors.background);
                fragment.appendChild(textSpan);
            }
            
            content.appendChild(fragment);
        }
    }
    
    // Update the stored interaction data
    active.interaction = interaction;
}

// Batch update multiple interactions at once
function batchUpdateInteractions(interactions) {
    // First process position updates through the batched system
    for (const interaction of interactions) {
        const active = activeInteractions[interaction.id];
        if (active) {
            active.pendingPosition = {
                x: interaction.screenX,
                y: interaction.screenY
            };
            pendingUpdates.add(interaction.id);
        } else {
            // Create new interactions for ones we don't have
            createInteractionElement(interaction);
        }
    }
    
    // Process all pending position updates in one frame
    if (pendingUpdates.size > 0 && !updatePending) {
        updatePending = true;
        requestAnimationFrame(processPendingUpdates);
    }
    
    // Check for interactions that need content updates (mode changes)
    // We handle these separately because they're more expensive
    for (const interaction of interactions) {
        const active = activeInteractions[interaction.id];
        if (active && active.interaction.mode !== interaction.mode) {
            // Mode changed - update content through normal function
            // which will rebuild the content elements
            updateInteraction(interaction);
        } else if (active) {
            // Just update the stored data
            active.interaction = interaction;
        }
    }
    
    // Remove any interactions not in the update
    const currentIds = interactions.map(i => i.id);
    for (const id in activeInteractions) {
        if (!currentIds.includes(parseInt(id))) {
            removeInteraction(id);
        }
    }
}

// Remove an interaction
function removeInteraction(id) {
    const active = activeInteractions[id];
    
    if (!active) return;
    
    const element = active.element;
    
    // For better performance, just remove it immediately 
    if (element && element.parentNode) {
        element.parentNode.removeChild(element);
    }
    delete activeInteractions[id];
}

// Clear all interactions
function clearInteractions() {
    // Clear container directly for immediate visual cleanup
    const container = document.getElementById('interact-container');
    if (container) {
        container.innerHTML = '';
    }
    
    // Also clear our tracking object
    activeInteractions = {};
}

// Hide all interactions
function hideAllInteractions() {
    for (const id in activeInteractions) {
        const element = activeInteractions[id].element;
        if (element) {
            element.classList.remove('visible');
        }
    }
}

// Show all interactions
function showAllInteractions() {
    for (const id in activeInteractions) {
        const element = activeInteractions[id].element;
        if (element) {
            element.classList.add('visible');
        }
    }
}

// Hide specific interaction
function hideInteraction(id) {
    const active = activeInteractions[id];
    if (active && active.element) {
        active.element.classList.remove('visible');
    }
}

// Show specific interaction
function showInteraction(id) {
    const active = activeInteractions[id];
    if (active && active.element) {
        active.element.classList.add('visible');
    }
}

// Event listener for messages from the game client
window.addEventListener('message', function(event) {
    const data = event.data;
    
    switch (data.action) {
        case 'updateInteractions':
            // Check if we should batch process updates
            if (data.batch && data.interactions.length > 1) {
                batchUpdateInteractions(data.interactions);
            } else {
                // Update or create interactions individually
                for (const interaction of data.interactions) {
                    updateInteraction(interaction);
                }
                
                // Remove any interactions not in the update
                const currentIds = data.interactions.map(i => i.id);
                for (const id in activeInteractions) {
                    if (!currentIds.includes(parseInt(id))) {
                        removeInteraction(id);
                    }
                }
            }
            break;
            
        case 'removeInteraction':
            removeInteraction(data.id);
            break;
            
        case 'clearInteractions':
            clearInteractions();
            break;
            
        case 'hideAllInteractions':
            hideAllInteractions();
            break;
            
        case 'showAllInteractions':
            showAllInteractions();
            break;
            
        case 'hideInteraction':
            hideInteraction(data.id);
            break;
            
        case 'showInteraction':
            showInteraction(data.id);
            break;
            
        case 'setDefaultColors':
            defaultColors = data.colors;
            break;
    }
});

// Inform the client that the UI is ready
window.addEventListener('load', function() {
    // Clear any possible leftover elements
    clearInteractions();
    
    fetch(`https://${GetParentResourceName()}/uiReady`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    });
}); 