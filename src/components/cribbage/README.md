# Cribbage Card Component

Visual card component and styling for the Cribbage game in MatchyMatch.

## Files

- **Card.jsx** - Main card component
- **cribbage.css** - Styles and animations
- **CardDemo.jsx** - Visual demo/test component

## Card Component

### Props

```javascript
{
  card: {
    suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
    rank: 'A' | '2' | '3' | ... | 'K',
    value: number,
    id: string
  },
  isSelected: boolean,      // Card is selected by player
  isPlayable: boolean,      // Card can be played (valid move)
  isHidden: boolean,        // Show card back (opponent's hand)
  onClick: function,        // Handler for card click
  size: 'small' | 'medium' | 'large',  // Responsive sizing
  className: string         // Additional Tailwind classes
}
```

### Usage

```jsx
import Card from './components/cribbage/Card'

<Card 
  card={{ suit: 'hearts', rank: 'A', value: 1, id: 'AH' }}
  isSelected={false}
  isPlayable={true}
  isHidden={false}
  onClick={() => handleCardClick(card)}
  size="medium"
/>
```

### States

- **Normal**: White background, subtle shadow
- **Selected**: Elevated with green border, stronger shadow
- **Playable**: Subtle green glow on hover
- **Not Playable**: Dimmed/grayscale, reduced opacity
- **Hidden**: Blue gradient card back with joker emoji

### Sizes

- **Small**: 48×64px (w-12 h-16) - Mobile, compact areas
- **Medium**: 64×96px (w-16 h-24) - Default size
- **Large**: 80×112px (w-20 h-28) - Desktop, main hand

All sizes maintain 44px minimum touch target for accessibility.

## CSS Classes

### Layout Helpers

#### `.cribbage-hand`
Standard hand layout with gap spacing
```jsx
<div className="cribbage-hand">
  {cards.map(card => <Card key={card.id} card={card} />)}
</div>
```

#### `.cribbage-hand-overlap`
Overlapping card layout (fan effect)
```jsx
<div className="cribbage-hand-overlap">
  {cards.map(card => <Card key={card.id} card={card} />)}
</div>
```

#### `.cribbage-play-area`
Play area where cards are placed
```jsx
<div className="cribbage-play-area">
  {playedCards.map(card => <Card key={card.id} card={card} />)}
</div>
```

#### `.cribbage-crib`
Crib area for set-aside cards
```jsx
<div className="cribbage-crib">
  {cribCards.map(card => <Card key={card.id} card={card} />)}
</div>
```

#### `.cribbage-deck`
Deck display with card count
```jsx
<div className="cribbage-deck" data-count={deckCount}></div>
```

### Animation Classes

Apply these to trigger animations:

- `.cribbage-card-flip` - Card flip animation (0.6s)
- `.cribbage-card-play` - Play animation (0.4s)
- `.cribbage-card-deal` - Deal from deck animation (0.3s)
- `.cribbage-card-shuffle` - Shuffle animation (0.5s)

```jsx
<Card 
  card={card} 
  className="cribbage-card-deal" 
/>
```

## Animations

All animations are defined in `cribbage.css`:

- **cardLift** - Elevation animation for selection
- **cardFlip** - 180° flip for revealing
- **cardPlay** - Slide to play area
- **cardDeal** - Deal from deck
- **cardShuffle** - Shuffle effect

Animations respect `prefers-reduced-motion` for accessibility.

## Responsive Design

Cards automatically adapt to screen size:

- **Desktop**: Larger cards, full animations
- **Tablet**: Medium cards, overlapping hands
- **Mobile**: Smaller cards, tighter spacing

Breakpoints:
- `768px` - Tablet adjustments
- `480px` - Mobile optimizations

## Suit Colors

- ♥ Hearts: `#dc2626` (red)
- ♦ Diamonds: `#dc2626` (red)
- ♣ Clubs: `#1f2937` (black)
- ♠ Spades: `#1f2937` (black)

## Accessibility

- ✓ 44px minimum touch target
- ✓ Keyboard focus indicators
- ✓ Reduced motion support
- ✓ Semantic HTML
- ✓ Color contrast compliant

## Visual Testing

Run the demo component to see all states:

```jsx
import CardDemo from './components/cribbage/CardDemo'

// In your app or test page
<CardDemo />
```

The demo shows:
- All card states
- All sizes
- Layout helper examples
- Interactive click handlers

## Integration Notes

This is **Phase 1** of the Cribbage implementation - **visual components only**.

**No game logic is included** in these files. Other agents are building:
- Phase 2: Deck utilities and card management
- Phase 3: Scoring logic and game rules

To integrate:
1. Import `Card` component
2. Import `cribbage.css` in your board component
3. Use layout helper classes for positioning
4. Add game logic/state management
5. Wire up onClick handlers

## Future Enhancements

Potential additions (not in scope for Phase 1):
- Card tooltip with value info
- Drag-and-drop support
- Multi-select mode
- Custom suit colors/themes
- Sound effects
- Advanced animations (arc throw, etc.)

## Browser Support

Tested in:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

Uses modern CSS features:
- CSS Grid/Flexbox
- CSS Variables
- CSS Animations
- CSS Transform

---

**Version**: 1.0.0  
**Created**: Phase 1 - Agent 3  
**Last Updated**: 2024
