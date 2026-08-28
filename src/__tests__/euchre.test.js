import {
  SUITS,
  getEffectiveRankSuit,
  whoWinsTrick,
  aiShouldOrderUp,
  aiShouldCallTrump,
  aiMustCallTrump,
} from '../components/euchre/euchreHelpers'

// Mock timers so we can control AI delays
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('EuchreBoard - Pure Functions', () => {
  describe('getEffectiveRankSuit', () => {
    it('should identify right bower', () => {
      const card = { rank: 'J', suit: '♠' }
      const result = getEffectiveRankSuit(card, '♠')
      expect(result).toEqual({ rank: 'RB', suit: '♠' })
    })

    it('should identify left bower', () => {
      const card = { rank: 'J', suit: '♣' }
      const result = getEffectiveRankSuit(card, '♠')
      expect(result).toEqual({ rank: 'LB', suit: '♠' })
    })

    it('should return card unchanged when not trump', () => {
      const card = { rank: 'A', suit: '♥' }
      const result = getEffectiveRankSuit(card, '♠')
      expect(result).toEqual({ rank: 'A', suit: '♥' })
    })
  })

  describe('whoWinsTrick', () => {
    it('should return null for empty trick', () => {
      expect(whoWinsTrick([], '♠')).toBeNull()
    })

    it('should pick trump over led suit', () => {
      const trick = [
        { position: 'South', card: { rank: 'A', suit: '♥' } },
        { position: 'West', card: { rank: '9', suit: '♠' } }, // Trump
      ]
      expect(whoWinsTrick(trick, '♠')).toBe('West')
    })

    it('should pick right bower over all', () => {
      const trick = [
        { position: 'South', card: { rank: 'A', suit: '♠' } }, // Trump ace
        { position: 'West', card: { rank: 'J', suit: '♠' } }, // Right bower
      ]
      expect(whoWinsTrick(trick, '♠')).toBe('West')
    })
  })

  describe('aiShouldOrderUp', () => {
    it('should return orderUp for dealer with 1 strong trump', () => {
      const hand = [
        { rank: 'J', suit: '♠' }, // Strong trump (will be right bower)
        { rank: '9', suit: '♥' },
        { rank: '10', suit: '♥' },
        { rank: 'Q', suit: '♥' },
        { rank: 'K', suit: '♥' },
      ]
      const upCard = { rank: 'A', suit: '♠' }
      expect(aiShouldOrderUp(hand, upCard, 'South', 'South')).toBe('orderUp')
    })

    it('should return pass for non-dealer with only 1 strong trump', () => {
      const hand = [
        { rank: 'J', suit: '♠' }, // Strong trump
        { rank: '9', suit: '♥' },
        { rank: '10', suit: '♥' },
        { rank: 'Q', suit: '♥' },
        { rank: 'K', suit: '♥' },
      ]
      const upCard = { rank: 'A', suit: '♠' }
      expect(aiShouldOrderUp(hand, upCard, 'West', 'South')).toBe('pass')
    })

    it('should return orderUp for non-dealer with 2 strong trump', () => {
      const hand = [
        { rank: 'J', suit: '♠' }, // Right bower
        { rank: 'A', suit: '♠' }, // Ace of trump
        { rank: '10', suit: '♥' },
        { rank: 'Q', suit: '♥' },
        { rank: 'K', suit: '♥' },
      ]
      const upCard = { rank: '9', suit: '♠' }
      expect(aiShouldOrderUp(hand, upCard, 'West', 'South')).toBe('orderUp')
    })
  })

  describe('aiShouldCallTrump', () => {
    it('should return suit with 2+ strong trump', () => {
      const hand = [
        { rank: 'J', suit: '♥' }, // Strong
        { rank: 'A', suit: '♥' }, // Strong
        { rank: '9', suit: '♣' },
        { rank: '10', suit: '♣' },
        { rank: 'Q', suit: '♣' },
      ]
      expect(aiShouldCallTrump(hand, '♠')).toBe('♥')
    })

    it('should return null when no suit has 2+ strong trump', () => {
      const hand = [
        { rank: '9', suit: '♥' },
        { rank: '10', suit: '♥' },
        { rank: '9', suit: '♣' },
        { rank: '10', suit: '♣' },
        { rank: 'Q', suit: '♣' },
      ]
      expect(aiShouldCallTrump(hand, '♠')).toBeNull()
    })
  })

  describe('aiMustCallTrump', () => {
    it('should always return a valid suit', () => {
      const hand = [
        { rank: '9', suit: '♥' },
        { rank: '10', suit: '♥' },
        { rank: '9', suit: '♣' },
        { rank: '10', suit: '♣' },
        { rank: 'Q', suit: '♦' },
      ]
      const result = aiMustCallTrump(hand, '♠')
      expect(SUITS).toContain(result)
      expect(result).not.toBe('♠')
    })

    it('should pick the suit with the most trump cards', () => {
      const hand = [
        { rank: 'J', suit: '♥' }, // 3 hearts
        { rank: 'A', suit: '♥' },
        { rank: 'K', suit: '♥' },
        { rank: '9', suit: '♣' }, // 1 club
        { rank: '10', suit: '♦' }, // 1 diamond
      ]
      expect(aiMustCallTrump(hand, '♠')).toBe('♥')
    })
  })
})
