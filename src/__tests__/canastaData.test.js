// src/__tests__/canastaData.test.js
import {
  createDeck,
  shuffleDeck,
  isValidMeld,
  canAddToMeld,
  canPickUpDiscardPile,
  canGoOut,
  calculateScore,
  isCanasta,
  isNaturalCanasta,
  getMeldRank,
  isBlack3,
  calculateCardPoints,
  getMinimumMeldRequirement,
  CARD_VALUES,
  SCORING,
} from '../data/canastaData'

describe('Canasta Data', () => {
  describe('createDeck', () => {
    it('should create a deck with 108 cards', () => {
      const deck = createDeck()
      expect(deck).toHaveLength(108)
    })

    it('should have 4 jokers', () => {
      const deck = createDeck()
      const jokers = deck.filter((c) => c.rank === 'JOKER')
      expect(jokers).toHaveLength(4)
    })

    it('should have 8 of each rank (2 decks)', () => {
      const deck = createDeck()
      const aces = deck.filter((c) => c.rank === 'A')
      expect(aces).toHaveLength(8) // 2 decks * 4 suits
    })

    it('should mark red 3s correctly', () => {
      const deck = createDeck()
      const red3s = deck.filter((c) => c.isRed3)
      expect(red3s).toHaveLength(4) // 2 decks * 2 red suits
    })

    it('should mark wild cards correctly', () => {
      const deck = createDeck()
      const wilds = deck.filter((c) => c.isWild)
      expect(wilds).toHaveLength(20) // 4 jokers + 8 twos (2 decks * 4 suits * 2)
    })
  })

  describe('shuffleDeck', () => {
    it('should return a deck with same length', () => {
      const deck = createDeck()
      const shuffled = shuffleDeck(deck)
      expect(shuffled).toHaveLength(deck.length)
    })

    it('should not modify original deck', () => {
      const deck = createDeck()
      const original = [...deck]
      shuffleDeck(deck)
      expect(deck).toEqual(original)
    })
  })

  describe('isValidMeld', () => {
    it('should validate a basic 3-card natural meld', () => {
      const cards = [
        { rank: 'K', suit: 'hearts', isWild: false },
        { rank: 'K', suit: 'diamonds', isWild: false },
        { rank: 'K', suit: 'clubs', isWild: false },
      ]
      expect(isValidMeld(cards)).toBe(true)
    })

    it('should validate a mixed meld with wild cards', () => {
      const cards = [
        { rank: 'A', suit: 'hearts', isWild: false },
        { rank: 'A', suit: 'diamonds', isWild: false },
        { rank: '2', suit: 'clubs', isWild: true },
      ]
      expect(isValidMeld(cards)).toBe(true)
    })

    it('should reject meld with less than 3 cards', () => {
      const cards = [
        { rank: 'K', suit: 'hearts', isWild: false },
        { rank: 'K', suit: 'diamonds', isWild: false },
      ]
      expect(isValidMeld(cards)).toBe(false)
    })

    it('should reject meld with less than 2 natural cards', () => {
      const cards = [
        { rank: 'K', suit: 'hearts', isWild: false },
        { rank: '2', suit: 'clubs', isWild: true },
        { rank: 'JOKER', suit: 'joker', isWild: true },
      ]
      expect(isValidMeld(cards)).toBe(false)
    })

    it('should reject meld with more than 3 wild cards', () => {
      const cards = [
        { rank: 'K', suit: 'hearts', isWild: false },
        { rank: 'K', suit: 'diamonds', isWild: false },
        { rank: '2', suit: 'clubs', isWild: true },
        { rank: '2', suit: 'spades', isWild: true },
        { rank: 'JOKER', suit: 'joker', isWild: true },
        { rank: 'JOKER', suit: 'joker', isWild: true },
      ]
      expect(isValidMeld(cards)).toBe(false)
    })

    it('should reject meld with different natural ranks', () => {
      const cards = [
        { rank: 'K', suit: 'hearts', isWild: false },
        { rank: 'Q', suit: 'diamonds', isWild: false },
        { rank: 'K', suit: 'clubs', isWild: false },
      ]
      expect(isValidMeld(cards)).toBe(false)
    })

    it('should reject meld of 3s', () => {
      const cards = [
        { rank: '3', suit: 'hearts', isWild: false },
        { rank: '3', suit: 'diamonds', isWild: false },
        { rank: '3', suit: 'clubs', isWild: false },
      ]
      expect(isValidMeld(cards)).toBe(false)
    })
  })

  describe('isCanasta', () => {
    it('should return true for 7+ cards', () => {
      const cards = new Array(7).fill({ rank: 'K', isWild: false })
      expect(isCanasta(cards)).toBe(true)
    })

    it('should return false for less than 7 cards', () => {
      const cards = new Array(6).fill({ rank: 'K', isWild: false })
      expect(isCanasta(cards)).toBe(false)
    })
  })

  describe('isNaturalCanasta', () => {
    it('should return true for 7+ natural cards', () => {
      const cards = new Array(7).fill({ rank: 'K', isWild: false })
      expect(isNaturalCanasta(cards)).toBe(true)
    })

    it('should return false if contains wild cards', () => {
      const cards = [
        ...new Array(6).fill({ rank: 'K', isWild: false }),
        { rank: '2', isWild: true },
      ]
      expect(isNaturalCanasta(cards)).toBe(false)
    })

    it('should return false for less than 7 cards', () => {
      const cards = new Array(6).fill({ rank: 'K', isWild: false })
      expect(isNaturalCanasta(cards)).toBe(false)
    })
  })

  describe('getMeldRank', () => {
    it('should return rank of natural cards', () => {
      const cards = [
        { rank: 'K', isWild: false },
        { rank: 'K', isWild: false },
        { rank: '2', isWild: true },
      ]
      expect(getMeldRank(cards)).toBe('K')
    })

    it('should return null for all wild cards', () => {
      const cards = [
        { rank: '2', isWild: true },
        { rank: 'JOKER', isWild: true },
      ]
      expect(getMeldRank(cards)).toBe(null)
    })
  })

  describe('isBlack3', () => {
    it('should return true for black 3s', () => {
      expect(isBlack3({ rank: '3', suit: 'clubs' })).toBe(true)
      expect(isBlack3({ rank: '3', suit: 'spades' })).toBe(true)
    })

    it('should return false for red 3s', () => {
      expect(isBlack3({ rank: '3', suit: 'hearts' })).toBe(false)
      expect(isBlack3({ rank: '3', suit: 'diamonds' })).toBe(false)
    })

    it('should return false for non-3s', () => {
      expect(isBlack3({ rank: 'K', suit: 'clubs' })).toBe(false)
    })
  })

  describe('calculateCardPoints', () => {
    it('should sum card values correctly', () => {
      const cards = [
        { value: 20 }, // Ace
        { value: 10 }, // King
        { value: 5 },  // 7
      ]
      expect(calculateCardPoints(cards)).toBe(35)
    })
  })

  describe('getMinimumMeldRequirement', () => {
    it('should return 15 for negative scores', () => {
      expect(getMinimumMeldRequirement(-100)).toBe(15)
    })

    it('should return 50 for scores 0-1499', () => {
      expect(getMinimumMeldRequirement(0)).toBe(50)
      expect(getMinimumMeldRequirement(1000)).toBe(50)
      expect(getMinimumMeldRequirement(1499)).toBe(50)
    })

    it('should return 90 for scores 1500-2999', () => {
      expect(getMinimumMeldRequirement(1500)).toBe(90)
      expect(getMinimumMeldRequirement(2000)).toBe(90)
      expect(getMinimumMeldRequirement(2999)).toBe(90)
    })

    it('should return 120 for scores 3000+', () => {
      expect(getMinimumMeldRequirement(3000)).toBe(120)
      expect(getMinimumMeldRequirement(5000)).toBe(120)
    })
  })

  describe('canAddToMeld', () => {
    it('should allow adding matching natural cards', () => {
      const meld = {
        cards: [
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
        ],
      }
      const cardsToAdd = [{ rank: 'K', isWild: false }]
      expect(canAddToMeld(meld, cardsToAdd)).toBe(true)
    })

    it('should allow adding wild cards', () => {
      const meld = {
        cards: [
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
        ],
      }
      const cardsToAdd = [{ rank: '2', isWild: true }]
      expect(canAddToMeld(meld, cardsToAdd)).toBe(true)
    })

    it('should reject adding non-matching natural cards', () => {
      const meld = {
        cards: [
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
        ],
      }
      const cardsToAdd = [{ rank: 'Q', isWild: false }]
      expect(canAddToMeld(meld, cardsToAdd)).toBe(false)
    })

    it('should reject if too many wild cards would result', () => {
      const meld = {
        cards: [
          { rank: 'K', isWild: false },
          { rank: 'K', isWild: false },
          { rank: '2', isWild: true },
          { rank: '2', isWild: true },
          { rank: 'JOKER', isWild: true },
        ],
      }
      const cardsToAdd = [{ rank: 'JOKER', isWild: true }]
      expect(canAddToMeld(meld, cardsToAdd)).toBe(false)
    })
  })

  describe('canPickUpDiscardPile', () => {
    it('should allow pickup with 2 matching natural cards', () => {
      const topCard = { rank: 'K', isWild: false, suit: 'hearts' }
      const hand = [
        { rank: 'K', isWild: false },
        { rank: 'K', isWild: false },
      ]
      const melds = []
      expect(canPickUpDiscardPile(topCard, hand, melds, false)).toBe(true)
    })

    it('should allow pickup with 1 matching card and existing meld', () => {
      const topCard = { rank: 'K', isWild: false, suit: 'hearts' }
      const hand = [{ rank: 'K', isWild: false }]
      const melds = [
        {
          cards: [
            { rank: 'K', isWild: false },
            { rank: 'K', isWild: false },
            { rank: 'K', isWild: false },
          ],
        },
      ]
      expect(canPickUpDiscardPile(topCard, hand, melds, false)).toBe(true)
    })

    it('should reject pickup of wild cards', () => {
      const topCard = { rank: '2', isWild: true, suit: 'hearts' }
      const hand = [{ rank: '2', isWild: true }]
      const melds = []
      expect(canPickUpDiscardPile(topCard, hand, melds, false)).toBe(false)
    })

    it('should reject pickup of black 3s', () => {
      const topCard = { rank: '3', suit: 'clubs' }
      const hand = [{ rank: '3', suit: 'spades' }]
      const melds = []
      expect(canPickUpDiscardPile(topCard, hand, melds, false)).toBe(false)
    })

    it('should require 2 matching cards when frozen', () => {
      const topCard = { rank: 'K', isWild: false, suit: 'hearts' }
      const hand = [{ rank: 'K', isWild: false }]
      const melds = [
        {
          cards: [
            { rank: 'K', isWild: false },
            { rank: 'K', isWild: false },
            { rank: 'K', isWild: false },
          ],
        },
      ]
      expect(canPickUpDiscardPile(topCard, hand, melds, true)).toBe(false)
    })
  })

  describe('canGoOut', () => {
    it('should allow going out with canasta and 1 or fewer cards', () => {
      const hand = [{ rank: 'K' }]
      const melds = [
        {
          cards: new Array(7).fill({ rank: 'A', isWild: false }),
        },
      ]
      expect(canGoOut(hand, melds)).toBe(true)
    })

    it('should reject going out without canasta', () => {
      const hand = []
      const melds = [
        {
          cards: [
            { rank: 'K', isWild: false },
            { rank: 'K', isWild: false },
            { rank: 'K', isWild: false },
          ],
        },
      ]
      expect(canGoOut(hand, melds)).toBe(false)
    })

    it('should reject going out with more than 1 card in hand', () => {
      const hand = [{ rank: 'K' }, { rank: 'Q' }]
      const melds = [
        {
          cards: new Array(7).fill({ rank: 'A', isWild: false }),
        },
      ]
      expect(canGoOut(hand, melds)).toBe(false)
    })
  })

  describe('calculateScore', () => {
    it('should calculate basic meld score', () => {
      const melds = [
        {
          cards: [
            { value: 20 },
            { value: 20 },
            { value: 20 },
          ],
        },
      ]
      const score = calculateScore(melds, 0, [], false, false)
      expect(score).toBe(60)
    })

    it('should add natural canasta bonus', () => {
      const melds = [
        {
          cards: new Array(7).fill({ value: 10, isWild: false }),
        },
      ]
      const score = calculateScore(melds, 0, [], false, false)
      expect(score).toBe(70 + SCORING.NATURAL_CANASTA)
    })

    it('should add mixed canasta bonus', () => {
      const melds = [
        {
          cards: [
            ...new Array(6).fill({ value: 10, isWild: false }),
            { value: 20, isWild: true },
          ],
        },
      ]
      const score = calculateScore(melds, 0, [], false, false)
      expect(score).toBe(80 + SCORING.MIXED_CANASTA)
    })

    it('should add red 3 bonuses', () => {
      const score = calculateScore([], 2, [], false, false)
      expect(score).toBe(200)
    })

    it('should add bonus for all 4 red 3s', () => {
      const score = calculateScore([], 4, [], false, false)
      expect(score).toBe(SCORING.ALL_RED_3S)
    })

    it('should subtract cards in hand', () => {
      const melds = [
        {
          cards: [
            { value: 20 },
            { value: 20 },
            { value: 20 },
          ],
        },
      ]
      const cardsInHand = [{ value: 10 }, { value: 5 }]
      const score = calculateScore(melds, 0, cardsInHand, false, false)
      expect(score).toBe(60 - 15)
    })

    it('should add going out bonus', () => {
      const melds = [
        {
          cards: new Array(7).fill({ value: 10, isWild: false }),
        },
      ]
      const score = calculateScore(melds, 0, [], true, false)
      expect(score).toBe(70 + SCORING.NATURAL_CANASTA + SCORING.GOING_OUT)
    })

    it('should add concealed going out bonus', () => {
      const melds = [
        {
          cards: new Array(7).fill({ value: 10, isWild: false }),
        },
      ]
      const score = calculateScore(melds, 0, [], true, true)
      expect(score).toBe(70 + SCORING.NATURAL_CANASTA + SCORING.CONCEALED_GOING_OUT)
    })

    it('should subtract red 3s if no melds', () => {
      const score = calculateScore([], 2, [], false, false)
      expect(score).toBe(-200)
    })
  })
})
