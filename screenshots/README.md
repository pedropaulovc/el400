# Seven Segment Display Character Screenshots

This directory contains screenshots of the SevenSegmentDigit component displaying various characters.

## Screenshots

### All Digits
![All Digits](seven-segment-all-digits.png)
Shows all digits 0-9 displayed on seven-segment displays.

### All Letters
![All Letters](seven-segment-all-letters.png)
Shows all supported letter characters displayed on seven-segment displays, including:
- A, b, C, c, d, E, F, G, h, I, i, J, L, l, n, m, P, r, S, t, U, v, X, Y

### Individual Character Examples

#### Letter A
![Letter A](seven-segment-letter-A.png)

#### Letter b (lowercase)
![Letter b](seven-segment-letter-b.png)

#### Letter E
![Letter E](seven-segment-letter-E.png)

#### Letter P
![Letter P](seven-segment-letter-P.png)

### Sample Word: "hELL"
![Sample Word](seven-segment-sample-word.png)
Demonstrates how multiple seven-segment digits can be combined to display words.

## Supported Characters

The component now supports:
- **Digits**: 0-9
- **Symbols**: - (minus), (space)
- **Letters**: A, b, C, c, d, E, F, G, h, I, i, J, L, l, n, m, P, r, S, t, U, v, X, Y

## Case Sensitivity

The component is **case-sensitive**. For example:
- 'C' and 'c' are both supported but render differently
- 'A' is supported but 'a' is not (will throw an error)

## Error Handling

The component throws an error if an unsupported character is provided, with a helpful message listing all supported characters.
