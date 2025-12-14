import { test, expect } from './helpers/fixtures';

test.describe('Unit Conversion Test', () => {
  test('should convert values when toggling units', async ({ dro }) => {
    await dro.goto();
    
    // Start in inch mode, set X to 1.0000
    await dro.selectAxis('X');
    await dro.enterNumber('1');
    await dro.enterButton.click();
    
    const inchValue = await dro.getAxisValue('X');
    console.log('Inch value:', inchValue);
    
    // Toggle to mm
    await dro.toggleInchMm();
    await expect(await dro.isMmUnits()).toBe(true);
    
    const mmValue = await dro.getAxisValue('X');
    console.log('MM value:', mmValue);
    console.log('Expected MM value:', inchValue * 25.4);
    
    // Should be converted to mm (1 inch = 25.4 mm)
    expect(mmValue).toBeCloseTo(inchValue * 25.4, 3);
    
    // Toggle back to inch
    await dro.toggleInchMm();
    await expect(await dro.isInchUnits()).toBe(true);
    
    const inchValue2 = await dro.getAxisValue('X');
    console.log('Inch value after toggle back:', inchValue2);
    
    // Should be back to original inch value
    expect(inchValue2).toBeCloseTo(inchValue, 4);
  });
});
