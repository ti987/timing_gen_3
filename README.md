# Timing Gen 3 - Interactive Digital Logic Waveform Editor

An interactive web-based digital logic waveform editor for creating and editing timing diagrams. This tool lets users quickly draw signal waveforms, save them for later editing, and export to SVG for documentation.

## Features

- **Multiple Signal Types**: Clock, Bit, and Bus signals
- **Interactive Editing**:
  - Add signals with custom names and types
  - Toggle bit signal states by clicking
  - Set bus values with radix support (hex, dec, string, X, Z)
  - Right-click context menus for editing
  - Drag-and-drop signal reordering
- **Waveform Rendering**:
  - Clock signals with square waves
  - Bit signals with transitions, X (unknown), and Z (high-impedance) states
  - Bus signals with slew transitions and value labels
- **File Operations**:
  - Save/Load diagrams in JSON format
  - Export to SVG for documentation
- **Configurable**: Adjustable number of cycles

## Setup

### Prerequisites

The application uses Paper.js from CDN, so no manual download is required. However, if you need offline access:

1. **Paper.js Library** (optional for offline use): Download Paper.js from:
   ```
   https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.17/paper-full.min.js
   ```
   
2. Place the downloaded `paper-full.min.js` file in the `js/` directory
3. Update `index.html` to use local file instead of CDN

### Running the Application

1. Open `index.html` in a modern web browser (requires internet for CDN)
2. Or serve it using a local web server:
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000/index.html` in your browser

**Note**: The application will automatically fallback to a minimal Paper.js implementation (`js/paper-shim.js`) if the CDN is unavailable.

## Usage

### Adding Signals

1. Click the "Add Signal" button in the top menu
2. Enter a signal name
3. Select signal type (Clock, Bit, or Bus)
4. Click "OK"

### Editing Signals

- **Edit Signal Name/Type**: Right-click on signal name → "Edit"
- **Delete Signal**: Right-click on signal name → "Delete"
- **Toggle Bit Signal**: Left-click on any cycle of a bit signal to toggle between high (1) and low (0)
- **Set Bit Value**: Right-click on a cycle → select value (0, 1, X, or Z)
- **Set Bus Value**: Left-click on any cycle of a bus signal, enter value and radix

### Signal Reordering

- Click and drag a signal name up or down to reorder signals
- A red indicator line shows where the signal will be placed

### Saving and Loading

- **Save**: Click "Save" to download the current diagram as a JSON file
- **Load**: Click "Load" to open a previously saved JSON file
- **Export SVG**: Click "Export SVG" to download the diagram as an SVG image

### Configuration

- **Cycles**: Use the number input in the top menu to change the number of cycles displayed

## Signal Types

### Clock
- Generates a square wave pattern
- Not editable (always toggles high/low at each half-cycle)

### Bit
- Single-bit signals with states:
  - `0` (low): drawn at bottom
  - `1` (high): drawn at top
  - `Z` (high-impedance): drawn at middle
  - `X` (unknown): shown with crossed pattern
- Click to toggle, right-click for specific value

### Bus
- Multi-bit signals with:
  - Numeric values (hex, decimal)
  - String labels
  - `X` (unknown): shown with crossed pattern
  - `Z` (high-impedance): shown as middle line
- Slew transitions between value changes
- Value labels displayed in the waveform

## Technical Details

- Built with HTML5, CSS3, and JavaScript
- Uses Paper.js from CDN for vector graphics rendering (with local fallback)
- Canvas-based drawing for high-quality output
- JSON-based data storage format
- SVG export for documentation
- Organized structure: `js/` for JavaScript, `css/` for styles

## Data Format

The JSON file format contains:
```json
{
  "version": "3.0",
  "config": {
    "cycles": 20
  },
  "signals": [
    {
      "name": "clk",
      "type": "clock",
      "values": {}
    },
    {
      "name": "data",
      "type": "bus",
      "values": {
        "0": "X",
        "3": "0xAB",
        "8": "Z"
      }
    }
  ]
}
```

## Browser Compatibility

- Modern browsers with HTML5 Canvas support
- Tested on Chrome, Firefox, Safari, and Edge

## License

This project is part of the timing_gen series of timing diagram tools.
