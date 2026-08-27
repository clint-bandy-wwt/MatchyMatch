// src/__tests__/pokerCards.test.js
import { createDeck, sortHand, evaluateHand } from '../data/pokerCards';

describe('Poker Cards', () => {
  describe('createDeck', () => {
    it('should create a 52-card deck', () => {
      const deck = createDeck();
      expect(deck).toHaveLength(52);
    });

    it('should have unique card IDs', () => {
      const deck = createDeck();
      const ids = deck.map(card => card.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(52);
    });
  });

  describe('sortHand', () => {
    it('should sort cards by value in descending order', () => {
      const hand = [
        { rank: '5', value: 5, suit: '♥', id: '5♥' },
        { rank: 'A', value: 14, suit: '♠', id: 'A♠' },
        { rank: '2', value: 2, suit: '♦', id: '2♦' },
        { rank: 'K', value: 13, suit: '♣', id: 'K♣' },
        { rank: '10', value: 10, suit: '♥', id: '10♥' },
      ];

      const sorted = sortHand(hand);
      expect(sorted[0].rank).toBe('A'); // Ace should be first (highest)
      expect(sorted[1].rank).toBe('K');
      expect(sorted[2].rank).toBe('10');
      expect(sorted[3].rank).toBe('5');
      expect(sorted[4].rank).toBe('2');
    });

    it('should treat aces as high (value 14)', () => {
      const hand = [
        { rank: 'K', value: 13, suit: '♥', id: 'K♥' },
        { rank: 'A', value: 14, suit: '♠', id: 'A♠' },
      ];

      const sorted = sortHand(hand);
      expect(sorted[0].rank).toBe('A');
      expect(sorted[0].value).toBe(14);
    });

    it('should not mutate the original hand', () => {
      const hand = [
        { rank: '5', value: 5, suit: '♥', id: '5♥' },
        { rank: 'A', value: 14, suit: '♠', id: 'A♠' },
      ];

      const originalFirst = hand[0].rank;
      sortHand(hand);
      expect(hand[0].rank).toBe(originalFirst);
    });
  });

  describe('evaluateHand', () => {
    it('should recognize a Royal Flush', () => {
      const hand = [
        { rank: 'A', value: 14, suit: '♥', id: 'A♥' },
        { rank: 'K', value: 13, suit: '♥', id: 'K♥' },
        { rank: 'Q', value: 12, suit: '♥', id: 'Q♥' },
        { rank: 'J', value: 11, suit: '♥', id: 'J♥' },
        { rank: '10', value: 10, suit: '♥', id: '10♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Royal Flush');
      expect(result.rank).toBe(10);
    });

    it('should recognize a Straight Flush', () => {
      const hand = [
        { rank: '9', value: 9, suit: '♠', id: '9♠' },
        { rank: '8', value: 8, suit: '♠', id: '8♠' },
        { rank: '7', value: 7, suit: '♠', id: '7♠' },
        { rank: '6', value: 6, suit: '♠', id: '6♠' },
        { rank: '5', value: 5, suit: '♠', id: '5♠' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Straight Flush');
      expect(result.rank).toBe(9);
    });

    it('should recognize Four of a Kind', () => {
      const hand = [
        { rank: '7', value: 7, suit: '♥', id: '7♥' },
        { rank: '7', value: 7, suit: '♦', id: '7♦' },
        { rank: '7', value: 7, suit: '♣', id: '7♣' },
        { rank: '7', value: 7, suit: '♠', id: '7♠' },
        { rank: '2', value: 2, suit: '♥', id: '2♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Four of a Kind');
      expect(result.rank).toBe(8);
    });

    it('should recognize a Full House', () => {
      const hand = [
        { rank: 'K', value: 13, suit: '♥', id: 'K♥' },
        { rank: 'K', value: 13, suit: '♦', id: 'K♦' },
        { rank: 'K', value: 13, suit: '♣', id: 'K♣' },
        { rank: '5', value: 5, suit: '♠', id: '5♠' },
        { rank: '5', value: 5, suit: '♥', id: '5♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Full House');
      expect(result.rank).toBe(7);
    });

    it('should recognize a Flush', () => {
      const hand = [
        { rank: 'A', value: 14, suit: '♦', id: 'A♦' },
        { rank: '10', value: 10, suit: '♦', id: '10♦' },
        { rank: '7', value: 7, suit: '♦', id: '7♦' },
        { rank: '5', value: 5, suit: '♦', id: '5♦' },
        { rank: '2', value: 2, suit: '♦', id: '2♦' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Flush');
      expect(result.rank).toBe(6);
    });

    it('should recognize a Straight', () => {
      const hand = [
        { rank: '9', value: 9, suit: '♥', id: '9♥' },
        { rank: '8', value: 8, suit: '♦', id: '8♦' },
        { rank: '7', value: 7, suit: '♣', id: '7♣' },
        { rank: '6', value: 6, suit: '♠', id: '6♠' },
        { rank: '5', value: 5, suit: '♥', id: '5♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Straight');
      expect(result.rank).toBe(5);
    });

    it('should recognize Three of a Kind', () => {
      const hand = [
        { rank: 'Q', value: 12, suit: '♥', id: 'Q♥' },
        { rank: 'Q', value: 12, suit: '♦', id: 'Q♦' },
        { rank: 'Q', value: 12, suit: '♣', id: 'Q♣' },
        { rank: '8', value: 8, suit: '♠', id: '8♠' },
        { rank: '3', value: 3, suit: '♥', id: '3♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Three of a Kind');
      expect(result.rank).toBe(4);
    });

    it('should recognize Two Pair', () => {
      const hand = [
        { rank: 'J', value: 11, suit: '♥', id: 'J♥' },
        { rank: 'J', value: 11, suit: '♦', id: 'J♦' },
        { rank: '4', value: 4, suit: '♣', id: '4♣' },
        { rank: '4', value: 4, suit: '♠', id: '4♠' },
        { rank: '2', value: 2, suit: '♥', id: '2♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('Two Pair');
      expect(result.rank).toBe(3);
    });

    it('should recognize One Pair', () => {
      const hand = [
        { rank: 'A', value: 14, suit: '♥', id: 'A♥' },
        { rank: 'A', value: 14, suit: '♦', id: 'A♦' },
        { rank: 'K', value: 13, suit: '♣', id: 'K♣' },
        { rank: '7', value: 7, suit: '♠', id: '7♠' },
        { rank: '3', value: 3, suit: '♥', id: '3♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('One Pair');
      expect(result.rank).toBe(2);
    });

    it('should recognize High Card', () => {
      const hand = [
        { rank: 'A', value: 14, suit: '♥', id: 'A♥' },
        { rank: 'K', value: 13, suit: '♦', id: 'K♦' },
        { rank: '10', value: 10, suit: '♣', id: '10♣' },
        { rank: '7', value: 7, suit: '♠', id: '7♠' },
        { rank: '3', value: 3, suit: '♥', id: '3♥' },
      ];

      const result = evaluateHand(hand);
      expect(result.name).toBe('High Card');
      expect(result.rank).toBe(1);
    });
  });
});
