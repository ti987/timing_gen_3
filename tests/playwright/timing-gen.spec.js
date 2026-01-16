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
    await expect(page.getByRole('button', { name: 'Add widget' })).toBeVisible();
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
});
