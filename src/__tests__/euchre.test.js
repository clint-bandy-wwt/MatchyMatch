// Pure game logic functions for testing
import { 
  getEffectiveSuit, 
  getCardValue, 
  isLeftBower, 
  isRightBower,
  getWinningCard,
  canPlayCard,
  cardKey,
  calculateHandScore,
  getNextDealer,
  getFirstBidder,
  getActivePlayers,
  getNextActivePlayer,
  getFirstPlayer
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
    // Test the actual scoring logic from euchreGameLogic.js
    
    it('awards 1 point for making 3 tricks', () => {
      const result = calculateHandScore(0, [3, 2], false)
      expect(result).toEqual({ team: 0, points: 1 })
    })
    
    it('awards 1 point for making 4 tricks', () => {
      const result = calculateHandScore(0, [4, 1], false)
      expect(result).toEqual({ team: 0, points: 1 })
    })
    
    it('awards 2 points for march (5 tricks)', () => {
      const result = calculateHandScore(0, [5, 0], false)
      expect(result).toEqual({ team: 0, points: 2 })
    })
    
    it('awards 4 points for march when going alone', () => {
      const result = calculateHandScore(0, [5, 0], true)
      expect(result).toEqual({ team: 0, points: 4 })
    })
    
    it('awards 2 points to defenders when makers are euchred', () => {
      const result = calculateHandScore(0, [2, 3], false)
      expect(result).toEqual({ team: 1, points: 2 })
    })
    
    it('awards 2 points to defenders when makers are euchred (1 trick)', () => {
      const result = calculateHandScore(1, [3, 2], false)
      expect(result).toEqual({ team: 0, points: 2 })
    })
  })
  
  describe('Dealer Rotation', () => {
    it('getNextDealer rotates dealer clockwise', () => {
      expect(getNextDealer(0)).toBe(1)
      expect(getNextDealer(1)).toBe(2)
      expect(getNextDealer(2)).toBe(3)
      expect(getNextDealer(3)).toBe(0)
    })
    
    it('getFirstBidder returns player left of dealer', () => {
      expect(getFirstBidder(0)).toBe(1)
      expect(getFirstBidder(1)).toBe(2)
      expect(getFirstBidder(2)).toBe(3)
      expect(getFirstBidder(3)).toBe(0)
    })
  })
  
  describe('Going Alone - Partner Sits Out', () => {
    it('getActivePlayers returns all 4 when not going alone', () => {
      expect(getActivePlayers(0, false)).toEqual([0, 1, 2, 3])
      expect(getActivePlayers(2, false)).toEqual([0, 1, 2, 3])
    })
    
    it('getActivePlayers excludes partner when going alone', () => {
      // Maker 0 (South), partner is 2 (North)
      expect(getActivePlayers(0, true)).toEqual([0, 1, 3])
      // Maker 1 (West), partner is 3 (East)
      expect(getActivePlayers(1, true)).toEqual([0, 1, 2])
      // Maker 2 (North), partner is 0 (South)
      expect(getActivePlayers(2, true)).toEqual([1, 2, 3])
      // Maker 3 (East), partner is 1 (West)
      expect(getActivePlayers(3, true)).toEqual([0, 2, 3])
    })
    
    it('getNextActivePlayer skips partner when going alone', () => {
      // Maker 0, partner 2 sits out: 0 -> 1 -> 3 -> 0
      expect(getNextActivePlayer(0, 0, true)).toBe(1)
      expect(getNextActivePlayer(1, 0, true)).toBe(3)
      expect(getNextActivePlayer(3, 0, true)).toBe(0)
      
      // Maker 1, partner 3 sits out: 0 -> 1 -> 2 -> 0
      expect(getNextActivePlayer(0, 1, true)).toBe(1)
      expect(getNextActivePlayer(1, 1, true)).toBe(2)
      expect(getNextActivePlayer(2, 1, true)).toBe(0)
    })
    
    it('getFirstPlayer returns left of dealer when not going alone', () => {
      expect(getFirstPlayer(0, 0, false)).toBe(1)
      expect(getFirstPlayer(1, 1, false)).toBe(2)
      expect(getFirstPlayer(2, 2, false)).toBe(3)
      expect(getFirstPlayer(3, 3, false)).toBe(0)
    })
    
    it('getFirstPlayer skips sitting partner when going alone', () => {
      // Maker 0, dealer 1: partner 2 sits out, first player should be 3 not 2
      expect(getFirstPlayer(1, 0, true)).toBe(3)
      // Maker 1, dealer 2: partner 3 sits out, first player should be 0 not 3
      expect(getFirstPlayer(2, 1, true)).toBe(0)
      // Maker 2, dealer 3: partner 0 sits out, first player should be 1 not 0
      expect(getFirstPlayer(3, 2, true)).toBe(1)
    })
  })
})
