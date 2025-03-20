local QBCore = exports['qb-core']:GetCoreObject()
local activeInteractions = {}
local interactionId = 0

-- Utility function to process text and extract keys
local function ProcessInteractionText(text)
    local parts = {}
    local keyPattern = Config.KeySeparator .. "(..-)" .. Config.KeySeparator
    
    -- Extract keys and split text
    local currentPosition = 1
    local textLength = string.len(text)
    
    while currentPosition <= textLength do
        local keyStart, keyEnd = string.find(text, keyPattern, currentPosition)
        
        if keyStart then
            -- Add text before the key if exists
            if keyStart > currentPosition then
                local beforeText = string.sub(text, currentPosition, keyStart - 1)
                table.insert(parts, { type = "text", content = beforeText })
            end
            
            -- Add the key
            local key = string.sub(text, keyStart + string.len(Config.KeySeparator), keyEnd - string.len(Config.KeySeparator))
            table.insert(parts, { type = "key", content = key })
            
            -- Update position
            currentPosition = keyEnd + 1
        else
            -- Add remaining text
            local remainingText = string.sub(text, currentPosition)
            if remainingText and remainingText ~= "" then
                table.insert(parts, { type = "text", content = remainingText })
            end
            break
        end
    end
    
    return parts
end

-- Create a new interaction point
local function AddInteraction(coords, text, options)
    interactionId = interactionId + 1
    local id = interactionId
    
    local processedText = ProcessInteractionText(text)
    
    local interaction = {
        id = id,
        coords = coords,
        text = text,
        processedText = processedText,
        options = options or {},
        active = true,
        visible = false,
        mode = "icon" -- "icon" or "full"
    }
    
    activeInteractions[id] = interaction
    return id
end

-- Remove an interaction point
local function RemoveInteraction(id)
    if activeInteractions[id] then
        activeInteractions[id] = nil
        SendNUIMessage({
            action = "removeInteraction",
            id = id
        })
        return true
    end
    return false
end

-- Calculate screen position from 3D coords
local function Calculate3DToScreen(coords)
    local camCoords = GetGameplayCamCoord()
    local distance = #(coords - camCoords)
    
    -- Skip calculations for interactions too far away
    if distance > Config.RenderDistance then
        return {
            visible = false,
            distance = distance
        }
    end
    
    -- Check if the coordinates are in front of the camera
    local _, screenX, screenY = GetScreenCoordFromWorldCoord(coords.x, coords.y, coords.z)
    
    -- Only return if on screen and in front of the camera
    if screenX and screenY and screenX > 0 and screenX < 1 and screenY > 0 and screenY < 1 then
        return {
            x = screenX,
            y = screenY,
            distance = distance,
            visible = true
        }
    else
        return {
            visible = false,
            distance = distance
        }
    end
end

-- Export the functions
exports('AddInteraction', AddInteraction)
exports('RemoveInteraction', RemoveInteraction)

-- Replacement for traditional DrawText3D
function InteractUI(coords, text, options)
    local id = AddInteraction(coords, text, options)
    return id
end

-- Export replacement for DrawText3D
exports('DrawText3D', InteractUI)

-- Main thread that updates interaction positions and visibility
CreateThread(function()
    -- Initial cleanup on resource start
    SendNUIMessage({
        action = "clearInteractions"
    })
    
    -- Cache player position to reduce calls to GetEntityCoords
    local lastPlayerCoords = vector3(0, 0, 0)
    local lastUpdateTime = 0
    
    while true do
        local playerPed = PlayerPedId()
        local playerCoords = GetEntityCoords(playerPed)
        local currentTime = GetGameTimer()
        
        -- Check for menu/map open - DrawText3D style pause detection
        local isPaused = IsPauseMenuActive()
        local isMapOpen = isPaused and (IsBigmapActive() or (GetFirstBlipInfoId(8) ~= 0))
        
        if isPaused or IsControlPressed(0, 200) or isMapOpen then
            -- Clear UI immediately when menu/map open - same as DrawText3D behavior
            SendNUIMessage({
                action = "clearInteractions"
            })
            Wait(100) -- Reduce CPU usage during menu
        else
            -- Only do heavy processing if player has moved significantly or timer has elapsed
            local playerMoved = #(playerCoords - lastPlayerCoords) > 0.1
            local timeElapsed = (currentTime - lastUpdateTime) > Config.UpdateFrequency
            
            if playerMoved or timeElapsed then
                lastPlayerCoords = playerCoords
                lastUpdateTime = currentTime
                
                local hasInteractions = false
                local interactionsData = {}
                local visibleCount = 0
                
                -- Process interactions in order of distance (closest first)
                local orderedInteractions = {}
                for id, interaction in pairs(activeInteractions) do
                    local distance = #(interaction.coords - playerCoords)
                    if distance <= Config.RenderDistance then
                        table.insert(orderedInteractions, {id = id, interaction = interaction, distance = distance})
                    end
                end
                
                -- Sort by distance
                table.sort(orderedInteractions, function(a, b)
                    return a.distance < b.distance
                end)
                
                -- Process only closest interactions up to MaxInteractions
                for i, data in ipairs(orderedInteractions) do
                    if visibleCount >= Config.MaxInteractions then break end
                    
                    local id = data.id
                    local interaction = data.interaction
                    local distance = data.distance
                    
                    hasInteractions = true
                    
                    local screenData = Calculate3DToScreen(interaction.coords)
                    
                    if screenData.visible then
                        local mode = "hidden"
                        
                        -- Determine visibility mode based on distance
                        if distance <= Config.FullVisibilityDistance then
                            mode = "full"
                        elseif distance <= Config.IconVisibilityDistance then
                            mode = "icon"
                        end
                        
                        interaction.mode = mode
                        interaction.visible = mode ~= "hidden"
                        
                        -- If visible, add to the list to send to NUI
                        if interaction.visible then
                            visibleCount = visibleCount + 1
                            table.insert(interactionsData, {
                                id = id,
                                screenX = screenData.x,
                                screenY = screenData.y,
                                distance = distance,
                                mode = mode,
                                processedText = interaction.processedText,
                                options = interaction.options
                            })
                        end
                    else
                        interaction.visible = false
                    end
                end
                
                -- Send data to NUI if we have interactions
                if #interactionsData > 0 then
                    SendNUIMessage({
                        action = "updateInteractions",
                        interactions = interactionsData,
                        batch = Config.BatchUpdates
                    })
                elseif hasInteractions then
                    -- If we have interactions but none are visible, clear the UI
                    SendNUIMessage({
                        action = "clearInteractions"
                    })
                end
            end
        end
        
        Wait(0) -- Yield every frame but only do heavy work when needed
    end
end)

-- Removing the separate pause menu thread since it's now integrated into the main thread
-- Instead, add a thread to ensure UI remains clear during any menu state

CreateThread(function()
    local wasMenuActive = false
    
    while true do
        Wait(50) -- Check frequently but not every frame
        
        -- Check all menu conditions
        local isPaused = IsPauseMenuActive()
        local isMapOpen = isPaused and (IsBigmapActive() or (GetFirstBlipInfoId(8) ~= 0))
        local isMenuActive = isPaused or IsControlPressed(0, 200) or isMapOpen
        
        -- Menu just opened
        if isMenuActive and not wasMenuActive then
            SendNUIMessage({
                action = "clearInteractions"
            })
            wasMenuActive = true
        end
        
        -- Menu still open
        if isMenuActive then
            -- Keep sending clear while menu is open (to catch any that might appear)
            SendNUIMessage({
                action = "clearInteractions"
            })
        end
        
        -- Menu just closed
        if not isMenuActive and wasMenuActive then
            wasMenuActive = false
            -- UI will naturally reappear on next update cycle
        end
    end
end)

-- Regular cleanup timer to prevent stale interactions
CreateThread(function()
    while true do
        -- Only do periodic cleanup when needed, and less frequently
        Wait(10000) -- Wait longer between cleanups
        
        if next(activeInteractions) == nil then
            -- No active interactions, send cleanup just in case
            SendNUIMessage({
                action = "clearInteractions"
            })
        end
    end
end)

-- Clean UI on player death
CreateThread(function()
    while true do
        Wait(1000)
        local player = PlayerPedId()
        
        if IsEntityDead(player) then
            -- Player died, clear all interactions
            SendNUIMessage({
                action = "clearInteractions"
            })
            activeInteractions = {}
        end
    end
end)

-- Cleanup on resource stop
AddEventHandler('onResourceStop', function(resourceName)
    if resourceName == GetCurrentResourceName() then
        SendNUIMessage({
            action = "clearInteractions"
        })
    end
end)

-- Add a command to test the interaction system
RegisterCommand('testinteract', function()
    local playerPed = PlayerPedId()
    local coords = GetOffsetFromEntityInWorldCoords(playerPed, 0.0, 2.0, 0.0)
    
    local id = InteractUI(coords, "~key~E~key~ to open store", {
        colors = {
            primary = {r = 0, g = 173, b = 238, a = 255},
            secondary = {r = 255, g = 255, b = 255, a = 255}
        }
    })
    
    -- Remove after 10 seconds
    SetTimeout(10000, function()
        RemoveInteraction(id)
    end)
end)