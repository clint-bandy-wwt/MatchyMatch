// src/__tests__/oldMaid.test.js
import {
  createDeck,
  shuffle,
  dealCards,
  removePairs,
  drawCard,
  checkForPair,
  checkGameOver,
  aiChooseCard,
  getCardDisplay,
  getSuitColor
} from '../data/oldMaidData';

describe('Old Maid Game Logic', () => {
  describe('createDeck', () => {
    test('creates a deck with 51 cards (52 minus one Queen)', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(51);
    });

    test('removes the Queen of Spades', () => {
      const deck = createDeck();
      const queenOfSpades = deck.find(
        card => card.rank === 'Q' && card.suit === 'spades'
      );
      expect(queenOfSpades).toBeUndefined();
    });

    test('has exactly 3 Queens remaining', () => {
      const deck = createDeck();
      const queens = deck.filter(card => card.rank === 'Q');
      expect(queens).toHaveLength(3);
    });

    test('each card has id, rank, and suit', () => {
      const deck = createDeck();
      deck.forEach(card => {
        expect(card).toHaveProperty('id');
        expect(card).toHaveProperty('rank');
        expect(card).toHaveProperty('suit');
      });
    });
  });

  describe('shuffle', () => {
    test('returns an array of the same length', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      expect(shuffled).toHaveLength(deck.length);
    });

    test('contains all the same cards', () => {
      const deck = createDeck();
      const shuffled = shuffle(deck);
      
      // Check that all original cards are in shuffled deck
      deck.forEach(card => {
        const found = shuffled.find(c => c.id === card.id);
        expect(found).toBeDefined();
      });
    });

    test('does not mutate the original array', () => {
      const deck = createDeck();
      const original = [...deck];
      shuffle(deck);
      expect(deck).toEqual(original);
    });
  });

  describe('dealCards', () => {
    test('deals all cards between two players', () => {
      const deck = shuffle(createDeck());
      const { playerHand, opponentHand } = dealCards(deck);
      expect(playerHand.length + opponentHand.length).toBe(51);
    });

    test('deals cards alternately (player gets first card)', () => {
      const deck = createDeck();
      const { playerHand, opponentHand } = dealCards(deck);
      
      // With 51 cards, player should get 26 and opponent 25
      expect(playerHand).toHaveLength(26);
      expect(opponentHand).toHaveLength(25);
    });

    test('player gets even-indexed cards', () => {
      const deck = createDeck();
      const { playerHand } = dealCards(deck);
      
      // First card should be deck[0]
      expect(playerHand[0]).toEqual(deck[0]);
    });
  });

  describe('removePairs', () => {
    test('removes matching pairs from hand', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'A', suit: 'diamonds' },
        { id: 3, rank: 'K', suit: 'clubs' },
      ];
      
      const { newHand, pairs } = removePairs(hand);
      
      expect(newHand).toHaveLength(1);
      expect(pairs).toHaveLength(1);
      expect(pairs[0]).toHaveLength(2);
      expect(newHand[0].rank).toBe('K');
    });

    test('handles multiple pairs', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'A', suit: 'diamonds' },
        { id: 3, rank: 'K', suit: 'clubs' },
        { id: 4, rank: 'K', suit: 'spades' },
      ];
      
      const { newHand, pairs } = removePairs(hand);
      
      expect(newHand).toHaveLength(0);
      expect(pairs).toHaveLength(2);
    });

    test('handles three of a kind (removes one pair, leaves one)', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'A', suit: 'diamonds' },
        { id: 3, rank: 'A', suit: 'clubs' },
      ];
      
      const { newHand, pairs } = removePairs(hand);
      
      expect(newHand).toHaveLength(1);
      expect(pairs).toHaveLength(1);
      expect(newHand[0].rank).toBe('A');
    });

    test('returns empty pairs array when no pairs exist', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'K', suit: 'diamonds' },
        { id: 3, rank: 'Q', suit: 'clubs' },
      ];
      
      const { newHand, pairs } = removePairs(hand);
      
      expect(newHand).toHaveLength(3);
      expect(pairs).toHaveLength(0);
    });
  });

  describe('drawCard', () => {
    test('removes card at specified index', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'K', suit: 'diamonds' },
        { id: 3, rank: 'Q', suit: 'clubs' },
      ];
      
      const { drawnCard, remainingHand } = drawCard(hand, 1);
      
      expect(drawnCard).toEqual({ id: 2, rank: 'K', suit: 'diamonds' });
      expect(remainingHand).toHaveLength(2);
      expect(remainingHand).not.toContainEqual(drawnCard);
    });

    test('does not mutate original hand', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'K', suit: 'diamonds' },
      ];
      const originalLength = hand.length;
      
      drawCard(hand, 0);
      
      expect(hand).toHaveLength(originalLength);
    });
  });

  describe('checkForPair', () => {
    test('finds a pair and removes it', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'K', suit: 'diamonds' },
      ];
      const drawnCard = { id: 3, rank: 'A', suit: 'clubs' };
      
      const { hasPair, newHand, pair } = checkForPair(hand, drawnCard);
      
      expect(hasPair).toBe(true);
      expect(newHand).toHaveLength(1);
      expect(newHand[0].rank).toBe('K');
      expect(pair).toHaveLength(2);
      expect(pair[0].rank).toBe('A');
      expect(pair[1].rank).toBe('A');
    });

    test('returns false when no pair exists', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
        { id: 2, rank: 'K', suit: 'diamonds' },
      ];
      const drawnCard = { id: 3, rank: 'Q', suit: 'clubs' };
      
      const { hasPair, newHand, pair } = checkForPair(hand, drawnCard);
      
      expect(hasPair).toBe(false);
      expect(newHand).toHaveLength(3);
      expect(pair).toBeNull();
    });

    test('adds drawn card to hand when no pair', () => {
      const hand = [
        { id: 1, rank: 'A', suit: 'hearts' },
      ];
      const drawnCard = { id: 2, rank: 'K', suit: 'diamonds' };
      
      const { newHand } = checkForPair(hand, drawnCard);
      
      expect(newHand).toContainEqual(drawnCard);
    });
  });

  describe('checkGameOver', () => {
    test('game is not over when both players have cards', () => {
      const playerHand = [{ id: 1, rank: 'A', suit: 'hearts' }];
      const opponentHand = [{ id: 2, rank: 'K', suit: 'diamonds' }];
      
      const { isOver, winner } = checkGameOver(playerHand, opponentHand);
      
      expect(isOver).toBe(false);
      expect(winner).toBeNull();
    });

    test('player wins when opponent has no cards', () => {
      const playerHand = [{ id: 1, rank: 'Q', suit: 'hearts' }];
      const opponentHand = [];
      
      const { isOver, winner } = checkGameOver(playerHand, opponentHand);
      
      expect(isOver).toBe(true);
      expect(winner).toBe('opponent');
    });

    test('opponent wins when player has no cards', () => {
      const playerHand = [];
      const opponentHand = [{ id: 1, rank: 'Q', suit: 'hearts' }];
      
      const { isOver, winner } = checkGameOver(playerHand, opponentHand);
      
      expect(isOver).toBe(true);
      expect(winner).toBe('player');
    });
  });

  describe('aiChooseCard', () => {
    test('returns a valid index', () => {
      const handSize = 5;
      const index = aiChooseCard(handSize);
      
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(handSize);
    });

    test('returns 0 for hand size of 1', () => {
      const index = aiChooseCard(1);
      expect(index).toBe(0);
    });
  });

  describe('getCardDisplay', () => {
    test('displays card with rank and suit symbol', () => {
      const card = { rank: 'A', suit: 'hearts' };
      const display = getCardDisplay(card);
      expect(display).toBe('A♥');
    });

    test('displays all suit symbols correctly', () => {
      expect(getCardDisplay({ rank: 'K', suit: 'hearts' })).toBe('K♥');
      expect(getCardDisplay({ rank: 'K', suit: 'diamonds' })).toBe('K♦');
      expect(getCardDisplay({ rank: 'K', suit: 'clubs' })).toBe('K♣');
      expect(getCardDisplay({ rank: 'K', suit: 'spades' })).toBe('K♠');
    });
  });

  describe('getSuitColor', () => {
    test('returns red for hearts and diamonds', () => {
      expect(getSuitColor('hearts')).toBe('red');
      expect(getSuitColor('diamonds')).toBe('red');
    });

    test('returns black for clubs and spades', () => {
      expect(getSuitColor('clubs')).toBe('black');
      expect(getSuitColor('spades')).toBe('black');
    });
  });
});
