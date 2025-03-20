Config = {}

-- Distance settings
Config.FullVisibilityDistance = 2.0  -- Distance at which the full interaction text is shown
Config.IconVisibilityDistance = 5.0  -- Distance at which only the icon/key is shown
Config.MaxDistance = 10.0           -- Maximum distance for displaying interaction elements

-- Appearance settings
Config.DefaultColors = {
    primary = {
        r = 0,
        g = 191,
        b = 255,
        a = 255
    },
    secondary = {
        r = 255,
        g = 255,
        b = 255,
        a = 255
    },
    background = {
        r = 0, 
        g = 73,
        b = 136,
        a = 200
    }
}

-- Animation settings
Config.AnimationDuration = 50       -- Animation duration in ms (even faster)
Config.AnimationEasing = 'ease-out'  -- Animation easing function (simpler)

-- Performance settings
Config.UpdateFrequency = 7         -- How often to update UI positions in ms
Config.RenderDistance = 15.0         -- Distance to check for interactions
Config.MaxInteractions = 10          -- Maximum number of interactions to show at once
Config.UseRequestAnimationFrame = true  -- Use RAF for smoother animations
Config.BatchUpdates = true           -- Batch UI updates for better performance

-- Pause Menu settings
Config.PauseMenuCheckInterval = 300  -- How often to check for pause menu in ms
Config.RestoreDelay = 500            -- Delay before restoring UI after pause menu closes (ms)

-- Key configuration
Config.KeySeparator = '~key~'        -- Separator for key highlights in text 