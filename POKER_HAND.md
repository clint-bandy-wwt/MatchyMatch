# Poker Hand Game

## Overview

Poker Hand is a card game where players are dealt 5 cards that are automatically sorted with aces high. Players can select cards to replace and then evaluate their poker hand.

## Key Features

### Auto-Sorting with Aces High

The core feature of this game is **automatic hand sorting**. Every time cards are dealt or replaced, they are automatically sorted by value in descending order, with aces being the highest value (14).

```javascript
// Cards are sorted using the sortHand function
export function sortHand(hand) {
  return [...hand].sort((a, b) => b.value - a.value);
}
```

### Card Values

- **Ace**: 14 (highest)
- **King**: 13
- **Queen**: 12
- **Jack**: 11
- **10-2**: Face value

## How to Play

1. **Deal Hand**: Click "Deal Hand" to receive 5 cards, automatically sorted with aces high
2. **Select Cards**: Click on cards you want to replace
3. **Replace Cards**: Click "Replace Selected" to draw new cards (hand will auto-sort again)
4. **Evaluate**: Click "Evaluate Hand" to see your poker hand ranking

## Poker Hand Rankings

1. **Royal Flush** (Rank 10): A, K, Q, J, 10 of the same suit
2. **Straight Flush** (Rank 9): Five consecutive cards of the same suit
3. **Four of a Kind** (Rank 8): Four cards of the same rank
4. **Full House** (Rank 7): Three of a kind plus a pair
5. **Flush** (Rank 6): Five cards of the same suit
6. **Straight** (Rank 5): Five consecutive cards
7. **Three of a Kind** (Rank 4): Three cards of the same rank
8. **Two Pair** (Rank 3): Two different pairs
9. **One Pair** (Rank 2): Two cards of the same rank
10. **High Card** (Rank 1): No matching cards

## Technical Implementation

### Data Structure

Each card is represented as an object:

```javascript
{
  suit: '♥',      // Heart, Diamond, Club, or Spade
  rank: 'A',      // Display value (A, K, Q, J, 10-2)
  value: 14,      // Numeric value for sorting (Ace = 14)
  id: 'A♥'        // Unique identifier
}
```

### Auto-Sort Behavior

- Cards are sorted **immediately** when dealt
- Cards are sorted **after** replacement
- Sorting is **non-mutating** (creates a new array)
- Sort order is **descending** by value (highest first)

### Files

- `src/data/pokerCards.js` - Card data structures and utilities
- `src/components/poker/PokerBoard.jsx` - Main game component
- `src/components/poker/Poker.css` - Game styling
- `src/__tests__/pokerCards.test.js` - Unit tests

## Example Usage

```javascript
import { createDeck, shuffleDeck, dealCards, sortHand } from './data/pokerCards';

// Create and shuffle a deck
const deck = shuffleDeck(createDeck());

// Deal 5 cards
const { dealtCards, remainingDeck } = dealCards(deck, 5);

// Auto-sort the hand (aces high)
const sortedHand = sortHand(dealtCards);

// sortedHand is now sorted with highest cards first
// Example: [A♠, K♥, 10♦, 7♣, 3♠]
```

## Design Decisions

1. **Aces High**: Aces are always treated as the highest card (value 14), consistent with most poker variants
2. **Immutable Sorting**: The `sortHand` function creates a new array rather than mutating the original
3. **Automatic Sorting**: Hands are automatically sorted to reduce cognitive load on the player
4. **Visual Feedback**: Selected cards lift up to show they're selected for replacement
5. **Color Coding**: Red suits (hearts, diamonds) and black suits (clubs, spades) are visually distinct

## Future Enhancements

- Add different game modes (Texas Hold'em, Five Card Draw, etc.)
- Implement betting system
- Add multiplayer support
- Track statistics and hand history
- Add animations for card dealing and replacement
- Implement sound effects
