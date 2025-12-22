/**
 * Settings Menu Integration Tests
 *
 * Tests the complete settings menu workflow including:
 * - Entry from idle state with settings button
 * - Axis selection
 * - Parameter navigation
 * - Value modification
 * - Exit actions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderSimulator,
  getAxisDisplayPureTextValue,
  getAxisDisplayPureNumberValue,
} from '../../../tests/helpers/integration-test-utils';

describe('Settings Menu Integration', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Entry and Axis Selection', () => {
    it('enters settings menu and shows SELECT', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Press settings button (wrench icon)
      await user.click(screen.getByTestId('btn-settings'));

      // Should show "SELECt" on X axis display
      expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');
      expect(getAxisDisplayPureTextValue('Y')).toBe('');
      expect(getAxisDisplayPureTextValue('Z')).toBe('');
    });

    it('selects X axis and enters parameter menu', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');

      // Select X axis
      await user.click(screen.getByTestId('axis-select-x'));

      // Should show first parameter (SCALE_TYPE = "LINEAR")
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
      expect(getAxisDisplayPureTextValue('Y')).toBe('LinEAr'); // Current value
    });

    it('selects Y axis and enters parameter menu', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-y'));

      // Should show first parameter for Y axis
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
      expect(getAxisDisplayPureTextValue('Y')).toBe('LinEAr');
    });

    it('selects Z axis and enters parameter menu', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-z'));

      // Should show first parameter for Z axis
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
      expect(getAxisDisplayPureTextValue('Y')).toBe('LinEAr');
    });

    it('exits to idle with clear key from axis selection', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      expect(getAxisDisplayPureTextValue('X')).toBe('SELECt');

      // Press clear to exit
      await user.click(screen.getByTestId('key-clear'));

      // Should return to idle (position display - will be numeric)
      // Just verify we're not in settings anymore by checking state indirectly
      // We can't use getAxisDisplayPureTextValue because display is now numeric
      const xDisplay = screen.getByTestId('axis-value-x').textContent;
      expect(xDisplay).not.toBe('SELECt');
    });
  });

  describe('Menu Navigation', () => {
    it('navigates down through parameters with key 2', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Start at SCALE_TYPE (LINEAR)
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

      // Navigate down to SC (scale resolution)
      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe('SC');
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(5); // Default 5 microns

      // Navigate down to DP (display resolution)
      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe('dP');
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(5); // Default 5 microns
    });

    it('navigates up through parameters with key 8', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Start at SCALE_TYPE
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

      // Navigate down to SC
      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe('SC');

      // Navigate back up to SCALE_TYPE
      await user.click(screen.getByTestId('key-8'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
    });

    it('wraps around to END when navigating up from first parameter', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Start at SCALE_TYPE (first parameter)
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');

      // Navigate up - should wrap to END
      await user.click(screen.getByTestId('key-8'));
      expect(getAxisDisplayPureTextValue('X')).toBe('End');
    });

    it('navigates to BEEP parameter', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate down multiple times to reach BEEP (parameter index 9)
      for (let i = 0; i < 9; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('bEEP');
      expect(getAxisDisplayPureTextValue('Y')).toBe('on'); // Default is ON
    });
  });

  describe('Parameter Modification', () => {
    it('toggles scale type from LINEAR to ANGULAR', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // At SCALE_TYPE (LINEAR)
      expect(getAxisDisplayPureTextValue('Y')).toBe('LinEAr');

      // Toggle with key 6
      await user.click(screen.getByTestId('key-6'));

      // Should now be ANGULAR
      expect(getAxisDisplayPureTextValue('Y')).toBe('AnGULAr');
    });

    it('toggles scale type back to LINEAR', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Toggle to ANGULAR
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('AnGULAr');

      // Toggle back to LINEAR
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('LinEAr');
    });

    it('cycles scale resolution values', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to SC parameter
      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe('SC');
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(5); // Default

      // Cycle: 5 → 10
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(10);

      // Cycle: 10 → 20
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(20);

      // Cycle: 20 → 1 (wraps around)
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(1);

      // Cycle: 1 → 2
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(2);

      // Cycle: 2 → 5 (back to start)
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(5);
    });

    it('toggles direction from LEFT to RIGHT', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to DIRECTION parameter (index 4)
      for (let i = 0; i < 4; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('LEFt');
      expect(getAxisDisplayPureTextValue('Y')).toBe('LEFt'); // Default

      // Toggle to RIGHT
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('riGht');

      // Toggle back to LEFT
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('LEFt');
    });

    it('toggles beep from ON to OFF', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to BEEP parameter (index 9)
      for (let i = 0; i < 9; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('bEEP');
      expect(getAxisDisplayPureTextValue('Y')).toBe('on'); // Default

      // Toggle to OFF
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('oFF');

      // Toggle back to ON
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('on');
    });

    it('toggles zero approach warning', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to ZERO_AP parameter (index 6)
      for (let i = 0; i < 6; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('2Ero AP');
      expect(getAxisDisplayPureTextValue('Y')).toBe('oFF'); // Default

      // Toggle to ON
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('bU22 on');
    });

    it('cycles sleep timer values', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to SLEEP_T parameter (index 10)
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('SLEEP t');
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(0); // Default 0 = disabled (displayed as "000")

      // Cycle through values: 0 → 5 → 10 → 15 → 30 → 60 → 120 → 0
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(5);

      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(10);

      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(15);
    });
  });

  describe('Exit Actions', () => {
    it('exits to idle when END parameter is selected and enter pressed', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to END parameter (index 13)
      for (let i = 0; i < 13; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('End');

      // Press enter to exit
      await user.click(screen.getByTestId('key-enter'));

      // Should return to idle (position display - will be numeric)
      const xDisplay = screen.getByTestId('axis-value-x').textContent;
      expect(xDisplay).not.toBe('End');
    });

    it('exits to idle when SAV CHG is selected and enter pressed', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to SAV CHG parameter (index 11)
      for (let i = 0; i < 11; i++) {
        await user.click(screen.getByTestId('key-2'));
      }

      expect(getAxisDisplayPureTextValue('X')).toBe('SAv chG');

      // Press enter to save and exit
      await user.click(screen.getByTestId('key-enter'));

      // Should return to idle (position display - will be numeric)
      const xDisplay = screen.getByTestId('axis-value-x').textContent;
      expect(xDisplay).not.toBe('SAv chG');
    });

    it('discards changes when exiting with clear key', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Navigate to BEEP and toggle to OFF
      for (let i = 0; i < 9; i++) {
        await user.click(screen.getByTestId('key-2'));
      }
      expect(getAxisDisplayPureTextValue('Y')).toBe('on');
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('oFF');

      // Exit without saving
      await user.click(screen.getByTestId('key-clear'));

      // Should return to idle (position display - will be numeric)
      const xDisplay = screen.getByTestId('axis-value-x').textContent;
      expect(xDisplay).not.toBe('bEEP');

      // Re-enter settings and check BEEP is still ON (changes were discarded)
      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));
      for (let i = 0; i < 9; i++) {
        await user.click(screen.getByTestId('key-2'));
      }
      expect(getAxisDisplayPureTextValue('Y')).toBe('on'); // Still ON
    });
  });

  describe('Complex Workflows', () => {
    it('modifies multiple parameters and navigates between them', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Modify SCALE_TYPE to ANGULAR
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('AnGULAr');

      // Navigate to SC and change to 10
      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe('SC');
      await user.click(screen.getByTestId('key-6')); // 5 → 10
      expect(getAxisDisplayPureNumberValue('Y', 0)).toBe(10);

      // Navigate back up to SCALE_TYPE and verify it's still ANGULAR
      await user.click(screen.getByTestId('key-8'));
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
      expect(getAxisDisplayPureTextValue('Y')).toBe('AnGULAr');
    });

    it('can configure different axes independently', async () => {
      const user = userEvent.setup();
      renderSimulator();

      // Configure X axis
      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Change X axis SCALE_TYPE to ANGULAR
      await user.click(screen.getByTestId('key-6'));
      expect(getAxisDisplayPureTextValue('Y')).toBe('AnGULAr');

      // Exit
      await user.click(screen.getByTestId('key-clear'));

      // Re-enter settings for Y axis
      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-y'));

      // Y axis should still be LINEAR (independent from X)
      expect(getAxisDisplayPureTextValue('X')).toBe('LinEAr');
      expect(getAxisDisplayPureTextValue('Y')).toBe('LinEAr');
    });

    it('navigates through entire parameter list', async () => {
      const user = userEvent.setup();
      renderSimulator();

      await user.click(screen.getByTestId('btn-settings'));
      await user.click(screen.getByTestId('axis-select-x'));

      // Expected parameter names in order
      const expectedParams = [
        'LinEAr',    // SCALE_TYPE (0)
        'SC',        // Scale resolution (1)
        'dP',        // Display resolution (2)
        'rAdiU5',    // RAD_DIA (3)
        'LEFt',      // DIRECTION (4)
        'CALib',     // Error compensation (5)
        '2Ero AP',   // Zero approach (6)
        'bP di5t',   // Backplane distance (7)
        'bP toLr',   // Backplane tolerance (8)
        'bEEP',      // Keypad beep (9)
        'SLEEP t',   // Sleep timer (10)
        'SAv chG',   // Save changes (11)
        'r5t dEF',   // Restore defaults (12)
        'End',       // Exit (13)
      ];

      // Start at first parameter
      expect(getAxisDisplayPureTextValue('X')).toBe(expectedParams[0]);

      // Navigate through all parameters
      for (let i = 1; i < expectedParams.length; i++) {
        await user.click(screen.getByTestId('key-2'));
        expect(getAxisDisplayPureTextValue('X')).toBe(expectedParams[i]);
      }

      // Wrap around to first parameter
      await user.click(screen.getByTestId('key-2'));
      expect(getAxisDisplayPureTextValue('X')).toBe(expectedParams[0]);
    });
  });
});
