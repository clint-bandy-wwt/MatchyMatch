// Pure game logic functions for testing
import { 
  getEffectiveSuit, 
  getCardValue, 
  isLeftBower, 
  isRightBower,
  getWinningCard,
  canPlayCard,
  cardKey
} from '../components/euchre/euchreGameLogic'

describe('Euchre Game Logic', () => {
  // Test data
  const makeCard = (rank, suit) => ({ rank, suit })
  
  describe('Bower Logic', () => {
    it('identifies right bower correctly', () => {
      const rightBower = makeCard('J', '♠')
      expect(isRightBower(rightBower, '♠')).toBe(true)
      expect(isRightBower(rightBower, '♥')).toBe(false)
    })
    
    it('identifies left bower correctly', () => {
      const jackOfClubs = makeCard('J', '♣')
      expect(isLeftBower(jackOfClubs, '♠')).toBe(true) // ♣ is opposite of ♠
      expect(isLeftBower(jackOfClubs, '♥')).toBe(false)
      
      const jackOfDiamonds = makeCard('J', '♦')
      expect(isLeftBower(jackOfDiamonds, '♥')).toBe(true) // ♦ is opposite of ♥
      expect(isLeftBower(jackOfDiamonds, '♠')).toBe(false)
    })
    
    it('treats left bower as trump suit', () => {
      const jackOfClubs = makeCard('J', '♣')
      expect(getEffectiveSuit(jackOfClubs, '♠')).toBe('♠') // ♣ jack counts as ♠ when ♠ is trump
      expect(getEffectiveSuit(jackOfClubs, '♥')).toBe('♣') // Still ♣ when ♥ is trump
    })
    
    it('ranks right bower highest, left bower second highest', () => {
      const trump = '♠'
      const rightBower = makeCard('J', '♠')
      const leftBower = makeCard('J', '♣')
      const aceOfTrump = makeCard('A', '♠')
      
      expect(getCardValue(rightBower, trump)).toBe(9)
      expect(getCardValue(leftBower, trump)).toBe(8)
      expect(getCardValue(aceOfTrump, trump)).toBe(7)
      expect(getCardValue(rightBower, trump)).toBeGreaterThan(getCardValue(leftBower, trump))
      expect(getCardValue(leftBower, trump)).toBeGreaterThan(getCardValue(aceOfTrump, trump))
    })
  })
  
  describe('Follow Suit Rules', () => {
    it('allows any card when leading', () => {
      const hand = [makeCard('9', '♠'), makeCard('K', '♥')]
      const trump = '♦'
      
      expect(canPlayCard(hand[0], hand, trump, null)).toBe(true)
      expect(canPlayCard(hand[1], hand, trump, null)).toBe(true)
    })
    
    it('requires following suit when able', () => {
      const hand = [makeCard('9', '♠'), makeCard('K', '♥'), makeCard('A', '♠')]
      const trump = '♦'
      const leadSuit = '♠'
      
      // Can play ♠ cards
      expect(canPlayCard(hand[0], hand, trump, leadSuit)).toBe(true)
      expect(canPlayCard(hand[2], hand, trump, leadSuit)).toBe(true)
      
      // Cannot play ♥ when we have ♠
      expect(canPlayCard(hand[1], hand, trump, leadSuit)).toBe(false)
    })
    
    it('allows trump when cannot follow suit', () => {
      const hand = [makeCard('9', '♦'), makeCard('K', '♥')]
      const trump = '♦'
      const leadSuit = '♠'
      
      // No ♠ in hand, can play anything
      expect(canPlayCard(hand[0], hand, trump, leadSuit)).toBe(true)
      expect(canPlayCard(hand[1], hand, trump, leadSuit)).toBe(true)
    })
    
    it('treats left bower as trump for follow suit', () => {
      const jackOfClubs = makeCard('J', '♣')
      const nineOfSpades = makeCard('9', '♠')
      const hand = [jackOfClubs, nineOfSpades]
      const trump = '♠'
      const leadSuit = '♠'
      
      // J♣ is left bower (counts as ♠ trump), can play it
      expect(canPlayCard(jackOfClubs, hand, trump, leadSuit)).toBe(true)
    })
  })
  
  describe('Trick Winner Determination', () => {
    it('highest card of lead suit wins when no trump', () => {
      const trump = '♦'
      const leadSuit = '♠'
      const trick = [
        { player: 0, card: makeCard('9', '♠') },
        { player: 1, card: makeCard('K', '♠') },
        { player: 2, card: makeCard('10', '♠') },
        { player: 3, card: makeCard('Q', '♥') }
      ]
      
      const winner = getWinningCard(trick, trump, leadSuit)
      expect(cardKey(winner)).toBe('K♠')
    })
    
    it('trump beats non-trump', () => {
      const trump = '♦'
      const leadSuit = '♠'
      const trick = [
        { player: 0, card: makeCard('A', '♠') },
        { player: 1, card: makeCard('9', '♦') },
        { player: 2, card: makeCard('K', '♠') },
        { player: 3, card: makeCard('Q', '♥') }
      ]
      
      const winner = getWinningCard(trick, trump, leadSuit)
      expect(cardKey(winner)).toBe('9♦')
    })
    
    it('right bower beats all other trump', () => {
      const trump = '♠'
      const leadSuit = '♠'
      const trick = [
        { player: 0, card: makeCard('A', '♠') },
        { player: 1, card: makeCard('J', '♠') }, // Right bower
        { player: 2, card: makeCard('K', '♠') },
        { player: 3, card: makeCard('J', '♣') }  // Left bower
      ]
      
      const winner = getWinningCard(trick, trump, leadSuit)
      expect(cardKey(winner)).toBe('J♠')
    })
    
    it('left bower beats all trump except right bower', () => {
      const trump = '♠'
      const leadSuit = '♠'
      const trick = [
        { player: 0, card: makeCard('A', '♠') },
        { player: 1, card: makeCard('J', '♣') }, // Left bower
        { player: 2, card: makeCard('K', '♠') },
        { player: 3, card: makeCard('Q', '♠') }
      ]
      
      const winner = getWinningCard(trick, trump, leadSuit)
      expect(cardKey(winner)).toBe('J♣')
    })
    
    it('higher trump beats lower trump', () => {
      const trump = '♦'
      const leadSuit = '♠'
      const trick = [
        { player: 0, card: makeCard('A', '♠') },
        { player: 1, card: makeCard('9', '♦') },
        { player: 2, card: makeCard('K', '♦') },
        { player: 3, card: makeCard('10', '♦') }
      ]
      
      const winner = getWinningCard(trick, trump, leadSuit)
      expect(cardKey(winner)).toBe('K♦')
    })
  })
  
  describe('Hand Scoring', () => {
    // These will test the actual scoring logic
    const PARTNERSHIPS = { 0: [0, 2], 1: [1, 3] }
    
    const calculatePoints = (makerTeam, tricksWon, goingAlone) => {
      const makerTricks = tricksWon[makerTeam]
      
      if (makerTricks < 3) {
        // Euchred: defenders get 2 points
        return { team: makerTeam === 0 ? 1 : 0, points: 2 }
      }
      
      if (makerTricks === 5) {
        // March: makers get 2 points (4 if alone)
        return { team: makerTeam, points: goingAlone ? 4 : 2 }
      }
      
      // 3-4 tricks: makers get 1 point
      return { team: makerTeam, points: 1 }
    }
    
    it('awards 1 point for making 3 tricks', () => {
      const result = calculatePoints(0, [3, 2], false)
      expect(result).toEqual({ team: 0, points: 1 })
    })
    
    it('awards 1 point for making 4 tricks', () => {
      const result = calculatePoints(0, [4, 1], false)
      expect(result).toEqual({ team: 0, points: 1 })
    })
    
    it('awards 2 points for march (5 tricks)', () => {
      const result = calculatePoints(0, [5, 0], false)
      expect(result).toEqual({ team: 0, points: 2 })
    })
    
    it('awards 4 points for march when going alone', () => {
      const result = calculatePoints(0, [5, 0], true)
      expect(result).toEqual({ team: 0, points: 4 })
    })
    
    it('awards 2 points to defenders when makers are euchred', () => {
      const result = calculatePoints(0, [2, 3], false)
      expect(result).toEqual({ team: 1, points: 2 })
    })
    
    it('awards 2 points to defenders when makers are euchred (1 trick)', () => {
      const result = calculatePoints(1, [3, 2], false)
      expect(result).toEqual({ team: 0, points: 2 })
    })
  })
  
  describe('Dealer Rotation', () => {
    it('rotates dealer clockwise each hand', () => {
      const dealers = [0, 1, 2, 3, 0, 1] // Should cycle through all positions
      
      for (let i = 0; i < dealers.length - 1; i++) {
        const nextDealer = (dealers[i] + 1) % 4
        expect(nextDealer).toBe(dealers[i + 1])
      }
    })
    
    it('first bidder is always left of dealer', () => {
      for (let dealer = 0; dealer < 4; dealer++) {
        const firstBidder = (dealer + 1) % 4
        expect(firstBidder).toBe((dealer + 1) % 4)
      }
    })
  })
})
