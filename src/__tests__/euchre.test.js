// Unit tests for Euchre trump logic: right bower, left bower, trump ranking,
// and effectiveSuit mapping. These verify the core card comparison rules that
// make Euchre distinct from standard trick-taking games.

// Since EuchreBoard.jsx defines these functions internally, we'll extract them
// for testing. In production, these live inside the component.

// Helper: determine which suit is the "other" suit of the same color
function getOtherSuit(trump) {
  return trump === '♠' ? '♣' : trump === '♣' ? '♠' : trump === '♥' ? '♦' : '♥';
}

// Returns the card's value for comparison (higher = stronger)
function cardValue(card, trump) {
  if (!trump) return 0;
  
  // Right bower (trump jack) = highest
  if (card.rank === 'J' && card.suit === trump) return 11;
  
  // Left bower (same color jack) = second highest
  const otherSuit = getOtherSuit(trump);
  if (card.rank === 'J' && card.suit === otherSuit) return 10;
  
  // Other trump cards
  if (card.suit === trump) {
    const vals = { 'A': 6, 'K': 5, 'Q': 4, '10': 3, '9': 2 };
    return vals[card.rank] || 0;
  }
  
  // Non-trump cards
  const vals = { 'A': 6, 'K': 5, 'Q': 4, 'J': 3, '10': 2, '9': 1 };
  return vals[card.rank] || 0;
}

// Returns the suit the card counts as (left bower counts as trump)
function effectiveSuit(card, trump) {
  // Left bower counts as trump suit
  if (card.rank === 'J') {
    const otherSuit = getOtherSuit(trump);
    if (card.suit === otherSuit) return trump;
  }
  return card.suit;
}

// Checks if hand can follow the lead suit
function canFollow(hand, leadSuit, trump) {
  return hand.some(c => effectiveSuit(c, trump) === leadSuit);
}

describe('Euchre trump logic', () => {
  describe('right bower (trump Jack)', () => {
    it('should be the highest card when spades is trump', () => {
      const rightBower = { rank: 'J', suit: '♠' };
      const leftBower = { rank: 'J', suit: '♣' };
      const aceOfTrump = { rank: 'A', suit: '♠' };
      const trump = '♠';
      
      expect(cardValue(rightBower, trump)).toBeGreaterThan(cardValue(leftBower, trump));
      expect(cardValue(rightBower, trump)).toBeGreaterThan(cardValue(aceOfTrump, trump));
    });

    it('should be the highest card when hearts is trump', () => {
      const rightBower = { rank: 'J', suit: '♥' };
      const leftBower = { rank: 'J', suit: '♦' };
      const aceOfTrump = { rank: 'A', suit: '♥' };
      const trump = '♥';
      
      expect(cardValue(rightBower, trump)).toBeGreaterThan(cardValue(leftBower, trump));
      expect(cardValue(rightBower, trump)).toBeGreaterThan(cardValue(aceOfTrump, trump));
    });

    it('should have value 11', () => {
      const rightBower = { rank: 'J', suit: '♦' };
      const trump = '♦';
      
      expect(cardValue(rightBower, trump)).toBe(11);
    });
  });

  describe('left bower (same-color Jack)', () => {
    it('should beat ace of trump when spades is trump', () => {
      const leftBower = { rank: 'J', suit: '♣' }; // clubs with spades trump
      const aceOfTrump = { rank: 'A', suit: '♠' };
      const trump = '♠';
      
      expect(cardValue(leftBower, trump)).toBeGreaterThan(cardValue(aceOfTrump, trump));
    });

    it('should beat ace of trump when hearts is trump', () => {
      const leftBower = { rank: 'J', suit: '♦' }; // diamonds with hearts trump
      const aceOfTrump = { rank: 'A', suit: '♥' };
      const trump = '♥';
      
      expect(cardValue(leftBower, trump)).toBeGreaterThan(cardValue(aceOfTrump, trump));
    });

    it('should beat ace of trump when clubs is trump', () => {
      const leftBower = { rank: 'J', suit: '♠' }; // spades with clubs trump
      const aceOfTrump = { rank: 'A', suit: '♣' };
      const trump = '♣';
      
      expect(cardValue(leftBower, trump)).toBeGreaterThan(cardValue(aceOfTrump, trump));
    });

    it('should beat ace of trump when diamonds is trump', () => {
      const leftBower = { rank: 'J', suit: '♥' }; // hearts with diamonds trump
      const aceOfTrump = { rank: 'A', suit: '♦' };
      const trump = '♦';
      
      expect(cardValue(leftBower, trump)).toBeGreaterThan(cardValue(aceOfTrump, trump));
    });

    it('should have value 10', () => {
      const leftBower = { rank: 'J', suit: '♣' };
      const trump = '♠';
      
      expect(cardValue(leftBower, trump)).toBe(10);
    });

    it('should lose to right bower', () => {
      const rightBower = { rank: 'J', suit: '♠' };
      const leftBower = { rank: 'J', suit: '♣' };
      const trump = '♠';
      
      expect(cardValue(rightBower, trump)).toBeGreaterThan(cardValue(leftBower, trump));
    });
  });

  describe('trump vs non-trump', () => {
    it('should have lowest trump (9) beat ace of non-trump suit', () => {
      const nineOfTrump = { rank: '9', suit: '♠' };
      const aceOfNonTrump = { rank: 'A', suit: '♥' };
      const trump = '♠';
      
      // When comparing within same trick, trump always wins
      // 9 of trump (value 2 as trump) vs Ace of non-trump (value 6 as non-trump)
      // Trump cards are always higher than non-trump in trick-taking
      expect(cardValue(nineOfTrump, trump)).toBe(2); // trump value
      expect(cardValue(aceOfNonTrump, trump)).toBe(6); // non-trump value
      
      // The trick winner logic needs to check suit first - trump beats non-trump
      // This test verifies the values are set correctly for that logic
      expect(effectiveSuit(nineOfTrump, trump)).toBe(trump);
      expect(effectiveSuit(aceOfNonTrump, trump)).not.toBe(trump);
    });

    it('should have any trump beat any non-trump', () => {
      const trump = '♦';
      const trumpCards = [
        { rank: '9', suit: '♦' },
        { rank: '10', suit: '♦' },
        { rank: 'Q', suit: '♦' },
        { rank: 'K', suit: '♦' },
        { rank: 'A', suit: '♦' },
      ];
      const nonTrumpAce = { rank: 'A', suit: '♠' };
      
      trumpCards.forEach(trumpCard => {
        expect(effectiveSuit(trumpCard, trump)).toBe(trump);
        expect(effectiveSuit(nonTrumpAce, trump)).not.toBe(trump);
      });
    });
  });

  describe('effectiveSuit', () => {
    it('should map left bower to trump suit (spades trump)', () => {
      const leftBower = { rank: 'J', suit: '♣' };
      const trump = '♠';
      
      expect(effectiveSuit(leftBower, trump)).toBe('♠');
      expect(effectiveSuit(leftBower, trump)).not.toBe('♣');
    });

    it('should map left bower to trump suit (hearts trump)', () => {
      const leftBower = { rank: 'J', suit: '♦' };
      const trump = '♥';
      
      expect(effectiveSuit(leftBower, trump)).toBe('♥');
      expect(effectiveSuit(leftBower, trump)).not.toBe('♦');
    });

    it('should map left bower to trump suit (clubs trump)', () => {
      const leftBower = { rank: 'J', suit: '♠' };
      const trump = '♣';
      
      expect(effectiveSuit(leftBower, trump)).toBe('♣');
      expect(effectiveSuit(leftBower, trump)).not.toBe('♠');
    });

    it('should map left bower to trump suit (diamonds trump)', () => {
      const leftBower = { rank: 'J', suit: '♥' };
      const trump = '♦';
      
      expect(effectiveSuit(leftBower, trump)).toBe('♦');
      expect(effectiveSuit(leftBower, trump)).not.toBe('♥');
    });

    it('should not change suit for right bower', () => {
      const rightBower = { rank: 'J', suit: '♠' };
      const trump = '♠';
      
      expect(effectiveSuit(rightBower, trump)).toBe('♠');
    });

    it('should not change suit for regular trump cards', () => {
      const aceOfTrump = { rank: 'A', suit: '♥' };
      const trump = '♥';
      
      expect(effectiveSuit(aceOfTrump, trump)).toBe('♥');
    });

    it('should not change suit for non-trump cards', () => {
      const aceOfSpades = { rank: 'A', suit: '♠' };
      const trump = '♥';
      
      expect(effectiveSuit(aceOfSpades, trump)).toBe('♠');
    });

    it('should correctly map left bower for all suit combinations', () => {
      const suits = ['♠', '♣', '♥', '♦'];
      const colorPairs = [
        ['♠', '♣'], // black
        ['♣', '♠'], // black
        ['♥', '♦'], // red
        ['♦', '♥'], // red
      ];
      
      colorPairs.forEach(([trump, leftBowerSuit]) => {
        const leftBower = { rank: 'J', suit: leftBowerSuit };
        expect(effectiveSuit(leftBower, trump)).toBe(trump);
      });
    });
  });

  describe('canFollow - left bower follow suit rules', () => {
    it('should not require left bower when its printed suit is led', () => {
      const trump = '♠';
      const hand = [
        { rank: 'J', suit: '♣' }, // left bower - counts as spade
        { rank: 'A', suit: '♥' },
      ];
      const leadSuit = '♣'; // clubs led
      
      // Left bower is NOT clubs (it's trump), so player cannot follow
      expect(canFollow(hand, leadSuit, trump)).toBe(false);
    });

    it('should require left bower when trump is led', () => {
      const trump = '♠';
      const hand = [
        { rank: 'J', suit: '♣' }, // left bower - counts as spade
        { rank: 'A', suit: '♥' },
      ];
      const leadSuit = '♠'; // trump led
      
      // Left bower counts as trump, so player CAN follow
      expect(canFollow(hand, leadSuit, trump)).toBe(true);
    });

    it('should allow playing off-suit when left bower is only card of printed suit', () => {
      const trump = '♥';
      const hand = [
        { rank: 'J', suit: '♦' }, // left bower - counts as heart
        { rank: 'K', suit: '♠' },
      ];
      const leadSuit = '♦'; // diamonds led (left bower's printed suit)
      
      // Left bower is NOT diamonds (it's trump), so player cannot follow
      // This means they can play any card (off-suit)
      expect(canFollow(hand, leadSuit, trump)).toBe(false);
    });

    it('should correctly identify when player can follow with regular cards', () => {
      const trump = '♠';
      const hand = [
        { rank: 'J', suit: '♣' }, // left bower
        { rank: 'K', suit: '♥' },
        { rank: '9', suit: '♥' },
      ];
      const leadSuit = '♥';
      
      expect(canFollow(hand, leadSuit, trump)).toBe(true);
    });
  });

  describe('trump ranking order', () => {
    it('should rank all trump cards correctly when spades is trump', () => {
      const trump = '♠';
      const cards = [
        { rank: 'J', suit: '♠', name: 'right bower' },
        { rank: 'J', suit: '♣', name: 'left bower' },
        { rank: 'A', suit: '♠', name: 'ace of trump' },
        { rank: 'K', suit: '♠', name: 'king of trump' },
        { rank: 'Q', suit: '♠', name: 'queen of trump' },
        { rank: '10', suit: '♠', name: '10 of trump' },
        { rank: '9', suit: '♠', name: '9 of trump' },
      ];
      
      const values = cards.map(c => cardValue(c, trump));
      
      // Should be in descending order
      expect(values).toEqual([11, 10, 6, 5, 4, 3, 2]);
      
      // Verify each comparison
      for (let i = 0; i < values.length - 1; i++) {
        expect(values[i]).toBeGreaterThan(values[i + 1]);
      }
    });

    it('should rank all trump cards correctly when hearts is trump', () => {
      const trump = '♥';
      const cards = [
        { rank: 'J', suit: '♥', name: 'right bower' },
        { rank: 'J', suit: '♦', name: 'left bower' },
        { rank: 'A', suit: '♥', name: 'ace of trump' },
        { rank: 'K', suit: '♥', name: 'king of trump' },
        { rank: 'Q', suit: '♥', name: 'queen of trump' },
        { rank: '10', suit: '♥', name: '10 of trump' },
        { rank: '9', suit: '♥', name: '9 of trump' },
      ];
      
      const values = cards.map(c => cardValue(c, trump));
      
      expect(values).toEqual([11, 10, 6, 5, 4, 3, 2]);
    });
  });

  describe('same-color suit identification', () => {
    it('should identify black suits as same color', () => {
      expect(getOtherSuit('♠')).toBe('♣');
      expect(getOtherSuit('♣')).toBe('♠');
    });

    it('should identify red suits as same color', () => {
      expect(getOtherSuit('♥')).toBe('♦');
      expect(getOtherSuit('♦')).toBe('♥');
    });
  });
});

describe('Euchre position tracking', () => {
  // Helper: rotate through bidding positions
  function nextPosition(pos, positions = ['South', 'West', 'North', 'East']) {
    const idx = positions.indexOf(pos);
    return positions[(idx + 1) % 4];
  }

  it('should cycle through positions in correct order', () => {
    const positions = ['South', 'West', 'North', 'East'];
    
    expect(nextPosition('South')).toBe('West');
    expect(nextPosition('West')).toBe('North');
    expect(nextPosition('North')).toBe('East');
    expect(nextPosition('East')).toBe('South');
  });

  it('should track bidding passes correctly', () => {
    const bidPasses = ['West', 'North'];
    
    // After 3 non-South players pass, bid1 should end
    expect(bidPasses.length).toBeLessThanOrEqual(3);
    expect(bidPasses.every(p => p !== 'South')).toBe(true);
  });

  it('should handle position after each pass', () => {
    let currentPos = 'West';
    const positions = ['South', 'West', 'North', 'East'];
    const bidPasses = [];
    
    // Simulate: West passes, North passes
    bidPasses.push(currentPos);
    currentPos = nextPosition(currentPos, positions); // North
    bidPasses.push(currentPos);
    currentPos = nextPosition(currentPos, positions); // East
    
    expect(bidPasses).toEqual(['West', 'North']);
    expect(currentPos).toBe('East');
  });
});
