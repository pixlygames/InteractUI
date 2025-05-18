# InteractUI

A modern UI interaction system for QBCore FiveM servers. This resource replaces the traditional DrawText3D functionality with a sleek, modern, HTML-based UI that supports both distance-based scaling and visual customization.

YouTube https://youtu.be/MHJOwQdNuBk

![1](https://github.com/user-attachments/assets/af286d9d-b2f8-496c-b8a6-6a7266aa3143)
![2](https://github.com/user-attachments/assets/66dc0beb-b411-4f0d-9500-c4d056cbb0ca)
![3](https://github.com/user-attachments/assets/1fa931ff-5209-480b-9849-7a45aa9afa06)


## Features

- Modern, clean UI design with floating interaction elements
- Distance-based interaction display
  - From 1-5 meters: Only shows the interaction key (e.g., "E") in a blue button
  - When closer than 1 meter: Shows full interaction text with the key styled separately
- No backgrounds - clean and minimal UI elements with subtle text shadows for visibility
- Configurable colors for all UI elements
- Significantly better performance than native DrawText3D
- Smooth animations and low latency updates
- Key highlighting with pulsing glow effect
- Easy integration with existing scripts
- Comprehensive test environment for previewing UI

## Installation

1. Upload the `interactUI` folder to your server's resources directory
2. Add `ensure interactUI` to your server.cfg (after qb-core)
3. Restart your server

## Usage

### Basic Example

Replace traditional DrawText3D calls in your scripts:

**Before:**
```lua
QBCore.Functions.DrawText3D(coords.x, coords.y, coords.z, "Press E to open the store")
```

**After:**
```lua
exports['interactUI']:DrawText3D(coords, "~key~E~key~ to open the store")
```

### Key Element Formatting

Use the `~key~` separator to highlight keys in the text:

- Single key: `"~key~E~key~ to open store"`
- Multiple keys: `"Press ~key~E~key~ to open or ~key~ESC~key~ to cancel"`

### Advanced Usage with Custom Colors

You can customize the appearance of the interaction:

```lua
exports['interactUI']:AddInteraction(coords, "~key~E~key~ to open store", {
    colors = {
        primary = {r = 255, g = 255, b = 255, a = 255},   -- Key color (white)
        secondary = {r = 255, g = 255, b = 255, a = 255}, -- Text color (white)
        background = {r = 17, g = 207, b = 232, a = 230}  -- Background color (turquoise)
    }
})
```

## Configuration

You can customize the behavior in `client/config.lua`:

```lua
Config = {
    -- Distance settings
    FullVisibilityDistance = 1.0,  -- Distance for full text to show
    IconVisibilityDistance = 5.0,  -- Distance for just the key to show
    
    -- Performance settings
    UpdateFrequency = 50,          -- How often to update UI (ms)
    
    -- Key configuration
    KeySeparator = '~key~'         -- Separator for key highlighting
}
```

## Performance Considerations

This resource is designed to be highly performant:
- Uses optimized update frequency (50ms by default)
- Only renders interactions within a reasonable distance
- Automatically cleans up interactions when players die
- Periodic cleanup of stale UI elements

## License

This resource is licensed under the MIT License. 
