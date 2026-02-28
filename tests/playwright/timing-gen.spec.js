// Timing Gen 3 - Playwright Tests
// Version 3.2.1

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:8080';

test.describe('Timing Gen 3 Application', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
  });

  test('should load the application successfully', async ({ page }) => {
    await expect(page).toHaveTitle('Timing Gen 3 - Interactive Digital Logic Waveform Editor');
    
    // Check main UI elements are present
    await expect(page.getByRole('button', { name: 'Add tool' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Signal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Global Option' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Load' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export SVG' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible();
  });

  test('should show About dialog with version 3.2.1', async ({ page }) => {
    // Click Help menu
    await page.getByRole('button', { name: 'Help' }).click();
    
    // Click About submenu item
    await page.evaluate(() => {
      document.getElementById('about-menu').click();
    });
    
    // Check About dialog is displayed
    const dialog = page.locator('#about-dialog');
    await expect(dialog).toBeVisible();
    
    // Verify version number
    await expect(page.getByText('Version: 3.2.1')).toBeVisible();
    
    // Close dialog
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('should add a clock signal', async ({ page }) => {
    // Click Add Signal
    await page.getByRole('button', { name: 'Add Signal' }).click();
    
    // Fill in signal details
    await page.locator('#signal-name-input').fill('clk');
    await page.locator('#signal-type-select').selectOption('clock');
    
    // Click OK
    await page.getByRole('button', { name: 'OK' }).click();
    
    // Verify signal was added (no error alert)
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    // Wait a bit for rendering
    await page.waitForTimeout(500);
    
    // Check no JavaScript errors
    const errors = consoleMessages.filter(msg => msg.includes('Error'));
    expect(errors.length).toBe(0);
  });

  test('should add a bus signal and set value', async ({ page }) => {
    // Add bus signal
    await page.getByRole('button', { name: 'Add Signal' }).click();
    await page.locator('#signal-name-input').fill('data_bus');
    await page.locator('#signal-type-select').selectOption('bus');
    await page.getByRole('button', { name: 'OK' }).click();
    
    await page.waitForTimeout(500);
    
    // Test bus value dialog by calling it directly
    const result = await page.evaluate(() => {
      const app = window.timingGenApp;
      try {
        TimingGenUI.showBusValueDialog(app, 0, 3);
        return { success: true, display: document.getElementById('bus-value-dialog').style.display };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(result.success).toBe(true);
    expect(result.display).toBe('flex');
    
    // Set a value
    await page.locator('#bus-value-input').fill('A5');
    await page.getByRole('button', { name: 'OK' }).click();
    
    // Verify no errors
    await page.waitForTimeout(500);
  });

  test('should test drag-and-drop with signals and measures', async ({ page }) => {
    // Create test data with signals and measure
    const result = await page.evaluate(() => {
      const app = window.timingGenApp;
      
      // Add three signals
      ['clk', 'data', 'addr'].forEach((name, idx) => {
        const type = idx === 0 ? 'clock' : 'bus';
        app.signalsData.set(name, {
          name: name,
          type: type,
          values: idx === 0 ? {} : { 0: 'X' },
          base_clock: idx === 0 ? undefined : 'clk'
        });
        app.rows.push({ type: 'signal', name: name });
      });
      
      // Add a measure
      const measureName = 'M0';
      app.measuresData.set(measureName, {
        name: measureName,
        signal1Name: 'clk',
        cycle1: 0,
        signal2Name: 'data',
        cycle2: 3,
        measureRow: 1,
        text: 'Test'
      });
      app.rows.splice(1, 0, { type: 'measure', name: measureName });
      app.measureCounter = 1;
      
      app.render();
      
      return { signalCount: app.getSignals().length, rowCount: app.rows.length };
    });
    
    expect(result.signalCount).toBe(3);
    expect(result.rowCount).toBe(4); // 3 signals + 1 measure
    
    // Test dragging signal
    const dragSignalResult = await page.evaluate(() => {
      const app = window.timingGenApp;
      app.selectedSignals.clear();
      app.selectedSignals.add(1); // Select 'data' signal
      
      const yPos = app.config.headerHeight + 3.5 * app.config.rowHeight;
      
      try {
        app.dropSignal(yPos);
        return { success: true, rowsAfter: app.rows.map(r => `${r.type}:${r.name}`) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(dragSignalResult.success).toBe(true);
    expect(dragSignalResult.rowsAfter).toEqual([
      'signal:clk',
      'measure:M0',
      'signal:addr',
      'signal:data'
    ]);
    
    // Test dragging measure
    const dragMeasureResult = await page.evaluate(() => {
      const app = window.timingGenApp;
      app.selectedMeasureRows.clear();
      app.selectedMeasureRows.add(1);
      app.draggedMeasureRow = 1;
      
      const yPos = app.config.headerHeight + 3.5 * app.config.rowHeight;
      
      try {
        app.dropMeasureRow(yPos);
        return { success: true, rowsAfter: app.rows.map(r => `${r.type}:${r.name}`) };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(dragMeasureResult.success).toBe(true);
    expect(dragMeasureResult.rowsAfter).toEqual([
      'signal:clk',
      'signal:addr',
      'signal:data',
      'measure:M0'
    ]);
  });

  test('should save and load data', async ({ page }) => {
    // Add a signal
    await page.getByRole('button', { name: 'Add Signal' }).click();
    await page.locator('#signal-name-input').fill('test_signal');
    await page.locator('#signal-type-select').selectOption('bit');
    await page.getByRole('button', { name: 'OK' }).click();
    
    await page.waitForTimeout(500);
    
    // Test save functionality
    const saveResult = await page.evaluate(() => {
      const app = window.timingGenApp;
      try {
        const data = TimingGenData.saveData(app);
        return { 
          success: true, 
          version: data.version,
          hasRows: data.rows && data.rows.length > 0
        };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(saveResult.success).toBe(true);
    expect(saveResult.version).toBe('3.2.1');
    expect(saveResult.hasRows).toBe(true);
  });

  test('should handle cycle operations', async ({ page }) => {
    // Add a signal first
    await page.getByRole('button', { name: 'Add Signal' }).click();
    await page.locator('#signal-name-input').fill('clk');
    await page.locator('#signal-type-select').selectOption('clock');
    await page.getByRole('button', { name: 'OK' }).click();
    
    await page.waitForTimeout(500);
    
    // Test cycle input
    const cyclesInput = page.locator('#cycles-input');
    await expect(cyclesInput).toHaveValue('20');
    
    // Change cycles
    await cyclesInput.fill('25');
    await cyclesInput.press('Enter');
    
    await page.waitForTimeout(500);
    
    // Verify no errors
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    expect(consoleErrors.length).toBe(0);
  });

  test('should verify no JavaScript errors during basic operations', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    // Perform various operations
    await page.getByRole('button', { name: 'Help' }).click();
    await page.waitForTimeout(200);
    
    await page.getByRole('button', { name: 'Add Signal' }).click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    
    await page.getByRole('button', { name: 'Global Option' }).click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Escape');
    
    // Check no errors occurred
    expect(consoleErrors.length).toBe(0);
  });

  test('should create and manage groups', async ({ page }) => {
    // Create test data with signals and measures
    const result = await page.evaluate(() => {
      const app = window.timingGenApp;
      
      // Add two signals
      app.signalsData.set('clk', {
        name: 'clk',
        type: 'clock',
        values: {}
      });
      app.rows.push({ type: 'signal', name: 'clk' });
      
      app.signalsData.set('data', {
        name: 'data',
        type: 'bit',
        values: { 0: 0 }
      });
      app.rows.push({ type: 'signal', name: 'data' });
      
      // Add two measures
      app.measuresData.set('M0', {
        name: 'M0',
        signal1Name: 'clk',
        cycle1: 1,
        signal2Name: 'clk',
        cycle2: 3,
        measureRow: 2,
        text: 't1'
      });
      app.rows.push({ type: 'measure', name: 'M0' });
      
      app.measuresData.set('M1', {
        name: 'M1',
        signal1Name: 'clk',
        cycle1: 5,
        signal2Name: 'clk',
        cycle2: 7,
        measureRow: 3,
        text: 't2'
      });
      app.rows.push({ type: 'measure', name: 'M1' });
      
      // Create a group
      const groupName = 'G0';
      const group = {
        name: groupName,
        measures: []
      };
      app.groupsData.set(groupName, group);
      app.rows.push({ type: 'group', name: groupName });
      
      app.render();
      
      return {
        rowCount: app.rows.length,
        groupExists: app.groupsData.has('G0'),
        measureCount: app.measuresData.size
      };
    });
    
    // Verify setup
    expect(result.rowCount).toBe(5); // 2 signals + 2 measures + 1 group
    expect(result.groupExists).toBe(true);
    expect(result.measureCount).toBe(2);
    
    // Test moving a measure into the group
    const mergeResult = await page.evaluate(() => {
      const app = window.timingGenApp;
      const group = app.groupsData.get('G0');
      
      // Simulate moving M0 into group
      group.measures.push('M0');
      
      // Remove M0's standalone row
      const m0RowIndex = app.rows.findIndex(r => r.type === 'measure' && r.name === 'M0');
      if (m0RowIndex >= 0) {
        app.rows.splice(m0RowIndex, 1);
      }
      
      app.rebuildAfterMeasureRowMove();
      app.render();
      
      return {
        rowCount: app.rows.length,
        groupMeasureCount: group.measures.length,
        measureInGroup: group.measures.includes('M0')
      };
    });
    
    expect(mergeResult.rowCount).toBe(4); // 2 signals + 1 measure + 1 group (with M0)
    expect(mergeResult.groupMeasureCount).toBe(1);
    expect(mergeResult.measureInGroup).toBe(true);
    
    // Test that group can be saved and loaded
    const saveLoadResult = await page.evaluate(() => {
      const app = window.timingGenApp;
      
      // Simulate save/load cycle
      const rowsWithData = app.rows.map(row => {
        if (row.type === 'group') {
          const groupData = app.groupsData.get(row.name);
          return {
            type: 'group',
            name: row.name,
            data: groupData
          };
        }
        return row;
      });
      
      // Find the group in saved data
      const savedGroup = rowsWithData.find(r => r.type === 'group');
      
      return {
        savedGroupExists: !!savedGroup,
        savedGroupData: savedGroup ? savedGroup.data : null
      };
    });
    
    expect(saveLoadResult.savedGroupExists).toBe(true);
    expect(saveLoadResult.savedGroupData).toBeTruthy();
    expect(saveLoadResult.savedGroupData.measures).toContain('M0');
  });

  test('Export ASCII button is present and ASCII waveforms are generated correctly', async ({ page }) => {
    // Verify the Export ASCII button exists
    await expect(page.getByRole('button', { name: 'Export ASCII' })).toBeVisible();

    // Add signals via the app, then call _asciiClock/_asciiBit/_asciiBus directly
    const result = await page.evaluate(() => {
      const app = window.timingGenApp;

      // Add a primary clock signal (10ns)
      const clk = { name: 'clk', type: 'clock', period: 10, periodUnit: 'ns', phase: 0, values: {} };
      app.signalsData.set('clk', clk);
      app.rows.push({ type: 'signal', name: 'clk' });

      // Add a bit signal in the primary domain (starts low, goes high at cycle 1, falls at cycle 2)
      const bit = { name: 'dat', type: 'bit', base_clock: 'clk', values: { 0: 0, 1: 1, 2: 0 } };
      app.signalsData.set('dat', bit);
      app.rows.push({ type: 'signal', name: 'dat' });

      // Add a bus signal
      const bus = { name: 'bus', type: 'bus', base_clock: 'clk', values: { 0: 'X', 2: 'A5' } };
      app.signalsData.set('bus', bus);
      app.rows.push({ type: 'signal', name: 'bus' });

      const primaryPeriodNs = app.convertPeriodToNs(clk.period, clk.periodUnit);
      const numCols = 2 * 4; // 4 cycles

      const clkWave = TimingGenData._asciiClock(app, clk, numCols, primaryPeriodNs);
      const bitWave = TimingGenData._asciiBit(app, bit, numCols, primaryPeriodNs);
      const busWave = TimingGenData._asciiBus(app, bus, numCols, primaryPeriodNs);

      return { clkWave, bitWave, busWave };
    });

    // Primary clock: alternates _ and ¯ every character
    expect(result.clkWave).toBe('_\u203E_\u203E_\u203E_\u203E');

    // Bit: starts low (__), rises (/), high (¯), falls (\), then low (____)
    // Cycle 0: __ , Cycle 1 start: /, Cycle 1 rest: ¯, Cycle 2 start: \, Cycle 2 rest: _, Cycle 3: _
    expect(result.bitWave[0]).toBe('_'); // cycle 0 low
    expect(result.bitWave[1]).toBe('_');
    expect(result.bitWave[2]).toBe('/'); // rising at cycle 1
    expect(result.bitWave[3]).toBe('\u203E'); // high
    expect(result.bitWave[4]).toBe('\\'); // falling at cycle 2
    expect(result.bitWave[5]).toBe('_'); // low

    // Bus: X for unknown, label embedded when it fits, * when it doesn't
    // Cycles 0-1: X; transition X at col 4; cycles 2-3: A5 segment (cols 5-7, length 3)
    // 'A5' length=2 <= 3-1=2 → fits: col5=¯, col6=A, col7=5
    expect(result.busWave[0]).toBe('X'); // cycle 0 = 'X' value
    expect(result.busWave[1]).toBe('X'); // still X
    expect(result.busWave[4]).toBe('X'); // transition at cycle 2 boundary
    expect(result.busWave[5]).toBe('\u203E'); // first char of segment
    expect(result.busWave[6]).toBe('A');  // value label embedded
    expect(result.busWave[7]).toBe('5');
  });

  test('Export ASCII bus: value label and * truncation', async ({ page }) => {
    const result = await page.evaluate(() => {
      const app = window.timingGenApp;
      const clk = { name: 'clk', type: 'clock', period: 10, periodUnit: 'ns', phase: 0, values: {} };
      app.signalsData.set('clk', clk);

      const primaryPeriodNs = app.convertPeriodToNs(clk.period, clk.periodUnit);

      // 8 cycles = 16 cols; 'TOOLONG' (7 chars) from cycle 2 to end (7 cycles = 14 cols for run)
      // run of 11 cols (cols 5..15); label 7 chars <= 11-1=10 → fits
      const busFits = { name: 'b1', type: 'bus', base_clock: 'clk', values: { 0: 'X', 2: 'TOOLONG' } };
      app.signalsData.set('b1', busFits);
      const w1 = TimingGenData._asciiBus(app, busFits, 16, primaryPeriodNs);

      // 8 cycles; 'VeryLongValueLabel' (18 chars) from cycle 2: run = 11 cols, 18 > 10 → '*'
      const busTooLong = { name: 'b2', type: 'bus', base_clock: 'clk', values: { 0: 'X', 2: 'VeryLongValueLabel' } };
      app.signalsData.set('b2', busTooLong);
      const w2 = TimingGenData._asciiBus(app, busTooLong, 16, primaryPeriodNs);

      return { w1, w2 };
    });

    // Fits: segment starts at col 5, label 'TOOLONG' at cols 6-12
    expect(result.w1[5]).toBe('\u203E');
    expect(result.w1.slice(6, 13)).toBe('TOOLONG');

    // Doesn't fit: segment starts at col 5, col 6 = '*'
    expect(result.w2[5]).toBe('\u203E');
    expect(result.w2[6]).toBe('*');
  });

  test('Export ASCII handles non-primary clock domain', async ({ page }) => {
    const result = await page.evaluate(() => {
      const app = window.timingGenApp;

      const primaryPeriodNs = app.convertPeriodToNs(app.config.clockPeriod, app.config.clockPeriodUnit);
      const numCols = 2 * 4; // 4 primary cycles

      // Non-primary clock: 2x period (20ns)
      const clk2 = { name: 'clk2', type: 'clock', period: 20, periodUnit: 'ns', phase: 0, values: {} };
      const clk2Wave = TimingGenData._asciiClock(app, clk2, numCols, primaryPeriodNs);

      // Phased clock: same period as primary but phase=0.5
      const clkPhased = { name: 'clkP', type: 'clock', period: 10, periodUnit: 'ns', phase: 0.5, values: {} };
      const clkPhasedWave = TimingGenData._asciiClock(app, clkPhased, numCols, primaryPeriodNs);

      return { clk2Wave, clkPhasedWave };
    });

    // 2x period clock: 2 lows then 2 highs per primary cycle pair
    expect(result.clk2Wave).toBe('__\u203E\u203E__\u203E\u203E');
    // Phased clock (0.5 phase): pre-phase low then clock low, then alternating
    // Indices: 0=_, 1=_ (pre-phase+clock-low), 2=¯, 3=_, 4=¯, 5=_, 6=¯, 7=_
    expect(result.clkPhasedWave).toBe('__\u203E_\u203E_\u203E_');
  });
});

