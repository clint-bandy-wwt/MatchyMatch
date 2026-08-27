# Canasta Card Game Implementation

## Overview
Canasta is a classic rummy-style card game that originated in Uruguay in the 1940s. This implementation is a simplified 2-player version (player vs AI) designed for web play.

## Game Components

### Deck
- Two standard 52-card decks (104 cards total) plus 4 jokers = 108 cards
- Ranks: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
- Suits: Hearts, Diamonds, Clubs, Spades
- Special cards: Jokers (wild), 2s (wild), 3s (special)

### Card Values
- Jokers: 50 points (wild)
- Aces: 20 points
- 2s: 20 points (wild)
- K, Q, J, 10, 9, 8: 10 points
- 7, 6, 5, 4, Black 3s: 5 points
- Red 3s: 100 points (bonus, cannot be melded)

### Wild Cards
- Jokers and 2s are wild cards
- Can substitute for any natural card in a meld
- Cannot be used to form a meld of wilds only

## Game Rules

### Setup
1. Each player is dealt 15 cards
2. One card is turned face-up to start the discard pile
3. If the initial card is a wild card, red 3, or black 3, draw another until a natural card appears
4. Remaining cards form the draw pile

### Turn Structure
A player's turn consists of:
1. **Draw**: Take 2 cards from the draw pile OR pick up the entire discard pile (if eligible)
2. **Meld** (optional): Lay down valid melds or add to existing melds
3. **Discard**: Place one card face-up on the discard pile

### Melds
A meld is a set of 3 or more cards of the same rank:
- **Natural Meld**: Contains only natural cards (no wilds)
- **Mixed Meld**: Contains natural cards plus 1-2 wild cards
- **Canasta**: A meld of 7 or more cards
  - Natural Canasta: 7+ cards, no wilds (500 points bonus)
  - Mixed Canasta: 7+ cards with wilds (300 points bonus)

### Meld Requirements
- Minimum 3 cards per meld
- Must have at least 2 natural cards
- Cannot have more than 3 wild cards in a meld
- Cannot meld 3s (black 3s can only be discarded)
- Red 3s are automatically played and cannot be melded

### Picking Up the Discard Pile
To pick up the discard pile, you must:
1. Have 2 natural cards matching the top discard card, OR
2. Have 1 natural card matching the top discard if you already have a meld of that rank
3. Immediately meld the top card with your matching cards
4. Take the entire discard pile into your hand

### Freezing the Discard Pile
The discard pile is "frozen" when:
- A wild card (2 or Joker) is discarded
- A black 3 is discarded (temporary freeze, only for next player)
- When frozen, you must have 2 natural cards to pick up the pile

### Going Out
To "go out" (end the round):
1. Must have at least one canasta (7+ card meld)
2. Meld or discard all cards in hand
3. Can go out "concealed" (all melds at once) for bonus points

### Red 3s
- Automatically played when drawn or dealt
- Worth 100 points each (800 if you have all 4)
- Replaced immediately by drawing another card
- Count against you if you haven't melded by end of round

## Scoring

### Card Points
Points are calculated from:
1. All melded cards (face value)
2. Canasta bonuses (500 natural, 300 mixed)
3. Red 3 bonuses (100 each, or 800 for all 4)
4. Going out bonus (100 points)
5. Concealed going out bonus (200 points)

### Penalties
- Cards left in hand are subtracted from score
- Red 3s count as -100 if you haven't melded

### Minimum Meld Requirement
First meld of the round must meet minimum point value:
- Score below 0: 15 points
- Score 0-1499: 50 points
- Score 1500-2999: 90 points
- Score 3000+: 120 points

### Winning
- First player/team to reach 5000 points wins
- If both players go over 5000, highest score wins

## Simplified Rules for This Implementation

To make the game more accessible for web play:

1. **2-Player Only**: Player vs AI opponent
2. **Single Round Focus**: Play one round at a time with running score
3. **Auto Red 3s**: Red 3s automatically played and replaced
4. **Clear Meld Display**: Visual separation of natural vs mixed melds
5. **Helpful Hints**: Show valid meld options and discard pile eligibility
6. **AI Opponent**: Computer player with strategic decision-making
7. **Turn Timer**: Optional timer to keep game moving
8. **Undo Last Action**: Allow undo within current turn (before discard)

## UI Components

### Main Board
- Player hand (bottom)
- AI hand (top, cards hidden)
- Draw pile (center left)
- Discard pile (center right)
- Player melds (bottom center)
- AI melds (top center)
- Score display
- Game controls

### Player Actions
- Click card to select/deselect
- "Draw from Pile" button
- "Take Discard Pile" button (enabled when valid)
- "Form Meld" button (enabled when valid selection)
- "Add to Meld" button (enabled when valid)
- "Discard" button (enabled when card selected)
- "Go Out" button (enabled when valid)

### Visual Feedback
- Selected cards highlighted
- Valid meld indicators
- Canasta indicators (7+ cards with special styling)
- Wild card indicators
- Frozen pile indicator
- Turn indicator
- Score animations

## AI Strategy

The AI opponent should:
1. Prioritize forming canastas
2. Pick up discard pile when advantageous
3. Avoid discarding cards that help the player
4. Try to go out when ahead in score
5. Block player from picking up valuable discard piles
6. Manage wild cards strategically

## Technical Implementation Notes

### State Management
- Game state in useCanasta hook
- Player hand, AI hand, draw pile, discard pile
- Player melds, AI melds
- Current turn, phase (draw/meld/discard)
- Scores, round number
- Frozen pile status

### Card Representation
```javascript
{
  id: 'unique-id',
  rank: 'A' | '2' | '3' | ... | 'K' | 'JOKER',
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker',
  value: number,
  isWild: boolean,
  isRed3: boolean
}
```

### Meld Representation
```javascript
{
  id: 'meld-id',
  rank: 'A' | '2' | ... | 'K',
  cards: Card[],
  isCanasta: boolean,
  isNatural: boolean
}
```

## Testing Considerations

- Deck shuffling and dealing
- Meld validation (natural, mixed, canasta)
- Discard pile pickup eligibility
- Minimum meld requirements
- Scoring calculations
- Going out validation
- AI decision making
- Edge cases (empty draw pile, etc.)
