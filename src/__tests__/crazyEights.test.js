import { describe, it, expect } from '@jest/globals'
import {
  buildDeck,
  shuffle,
  deal,
  canPlay,
  chooseAiCard,
  chooseSuitForAi,
  nextPlayer,
  hasWon,
  reshuffleDiscard,
  drawCard,
  getLegalCards,
  applyPlay,
  applyDraw,
  takeAiTurn,
} from '../components/crazyeights/crazyEightsLogic'

describe('crazyEightsLogic', () => {
  describe('buildDeck', () => {
    it('creates a deck with 52 unique cards', () => {
      const deck = buildDeck()
      expect(deck.length).toBe(52)

      // Check uniqueness
      const cardStrings = deck.map((c) => `${c.rank}${c.suit}`)
      const uniqueCards = new Set(cardStrings)
      expect(uniqueCards.size).toBe(52)
    })

    it('has 4 suits with 13 ranks each', () => {
      const deck = buildDeck()
      const suits = ['♠', '♥', '♦', '♣']
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

      for (const suit of suits) {
        const suitCards = deck.filter((c) => c.suit === suit)
        expect(suitCards.length).toBe(13)
        
        for (const rank of ranks) {
          const card = suitCards.find((c) => c.rank === rank)
          expect(card).toBeDefined()
        }
      }
    })
  })

  describe('shuffle', () => {
    it('returns a deck with the same cards', () => {
      const deck = buildDeck()
      const shuffled = shuffle(deck)
      
      expect(shuffled.length).toBe(deck.length)
      
      // All original cards should still be present
      for (const card of deck) {
        const found = shuffled.find(
          (c) => c.suit === card.suit && c.rank === card.rank
        )
        expect(found).toBeDefined()
      }
    })

    it('does not modify the original deck', () => {
      const deck = buildDeck()
      const original = [...deck]
      shuffle(deck)
      
      expect(deck).toEqual(original)
    })
  })

  describe('deal', () => {
    it('deals 5 cards to each of 4 players', () => {
      const deck = shuffle(buildDeck())
      const { hands, drawPile } = deal(deck, 4, 5)
      
      expect(hands.length).toBe(4)
      for (const hand of hands) {
        expect(hand.length).toBe(5)
      }
      expect(drawPile.length).toBe(52 - 20)
    })

    it('deals cards round-robin', () => {
      const deck = [
        { suit: '♠', rank: 'A' },
        { suit: '♥', rank: 'A' },
        { suit: '♦', rank: 'A' },
        { suit: '♣', rank: 'A' },
        { suit: '♠', rank: '2' },
        { suit: '♥', rank: '2' },
      ]
      const { hands } = deal(deck, 2, 2)
      
      expect(hands[0][0]).toEqual({ suit: '♠', rank: 'A' })
      expect(hands[1][0]).toEqual({ suit: '♥', rank: 'A' })
      expect(hands[0][1]).toEqual({ suit: '♦', rank: 'A' })
      expect(hands[1][1]).toEqual({ suit: '♣', rank: 'A' })
    })
  })

  describe('canPlay', () => {
    const topCard = { suit: '♠', rank: '5' }
    const activeSuit = '♠'

    it('allows playing an eight', () => {
      const eight = { suit: '♥', rank: '8' }
      expect(canPlay(eight, topCard, activeSuit)).toBe(true)
    })

    it('allows matching rank', () => {
      const five = { suit: '♥', rank: '5' }
      expect(canPlay(five, topCard, activeSuit)).toBe(true)
    })

    it('allows matching active suit', () => {
      const spade = { suit: '♠', rank: '7' }
      expect(canPlay(spade, topCard, activeSuit)).toBe(true)
    })

    it('rejects non-matching card', () => {
      const other = { suit: '♥', rank: '7' }
      expect(canPlay(other, topCard, activeSuit)).toBe(false)
    })

    it('respects changed suit after an eight', () => {
      const topCard = { suit: '♠', rank: '8' }
      const activeSuit = '♥'
      const heart = { suit: '♥', rank: '3' }
      const spade = { suit: '♠', rank: '3' }
      
      expect(canPlay(heart, topCard, activeSuit)).toBe(true)
      expect(canPlay(spade, topCard, activeSuit)).toBe(false)
    })
  })

  describe('chooseAiCard', () => {
    it('returns a playable non-eight first', () => {
      const hand = [
        { suit: '♥', rank: '3' },
        { suit: '♠', rank: '5' },
        { suit: '♦', rank: '8' },
      ]
      const topCard = { suit: '♠', rank: '7' }
      const activeSuit = '♠'
      
      const choice = chooseAiCard(hand, topCard, activeSuit)
      expect(choice).toEqual({ suit: '♠', rank: '5' })
    })

    it('plays an eight if no other card is playable', () => {
      const hand = [
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '8' },
      ]
      const topCard = { suit: '♠', rank: '7' }
      const activeSuit = '♠'
      
      const choice = chooseAiCard(hand, topCard, activeSuit)
      expect(choice).toEqual({ suit: '♦', rank: '8' })
    })

    it('returns null if no card can be played', () => {
      const hand = [
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '4' },
      ]
      const topCard = { suit: '♠', rank: '7' }
      const activeSuit = '♠'
      
      const choice = chooseAiCard(hand, topCard, activeSuit)
      expect(choice).toBeNull()
    })
  })

  describe('chooseSuitForAi', () => {
    it('returns the most common suit in hand', () => {
      const hand = [
        { suit: '♠', rank: '2' },
        { suit: '♠', rank: '3' },
        { suit: '♥', rank: '4' },
      ]
      const suit = chooseSuitForAi(hand)
      expect(suit).toBe('♠')
    })

    it('returns a suit even with empty hand', () => {
      const suit = chooseSuitForAi([])
      expect(['♠', '♥', '♦', '♣']).toContain(suit)
    })
  })

  describe('nextPlayer', () => {
    it('advances to the next player', () => {
      expect(nextPlayer(0, 4)).toBe(1)
      expect(nextPlayer(1, 4)).toBe(2)
      expect(nextPlayer(2, 4)).toBe(3)
    })

    it('wraps around to player 0', () => {
      expect(nextPlayer(3, 4)).toBe(0)
    })
  })

  describe('hasWon', () => {
    it('returns true for empty hand', () => {
      expect(hasWon([])).toBe(true)
    })

    it('returns false for non-empty hand', () => {
      const hand = [{ suit: '♠', rank: 'A' }]
      expect(hasWon(hand)).toBe(false)
    })
  })

  describe('reshuffleDiscard', () => {
    it('keeps the top card and shuffles the rest', () => {
      const discardPile = [
        { suit: '♠', rank: '2' },
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '4' },
      ]
      const drawPile = []
      
      const { newDrawPile, newDiscardPile } = reshuffleDiscard(discardPile, drawPile)
      
      expect(newDiscardPile.length).toBe(1)
      expect(newDiscardPile[0]).toEqual({ suit: '♦', rank: '4' })
      expect(newDrawPile.length).toBe(2)
    })

    it('returns empty piles if discard is empty', () => {
      const { newDrawPile, newDiscardPile } = reshuffleDiscard([], [])
      expect(newDrawPile.length).toBe(0)
      expect(newDiscardPile.length).toBe(0)
    })
  })

  describe('drawCard', () => {
    it('draws a card from the draw pile', () => {
      const drawPile = [
        { suit: '♠', rank: '2' },
        { suit: '♥', rank: '3' },
      ]
      const discardPile = [{ suit: '♦', rank: '4' }]
      
      const { card, newDrawPile, newDiscardPile } = drawCard(drawPile, discardPile)
      
      expect(card).toEqual({ suit: '♠', rank: '2' })
      expect(newDrawPile.length).toBe(1)
      expect(newDiscardPile).toEqual(discardPile)
    })

    it('reshuffles discard when draw pile is empty', () => {
      const drawPile = []
      const discardPile = [
        { suit: '♠', rank: '2' },
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '4' },
      ]
      
      const { card, newDrawPile, newDiscardPile } = drawCard(drawPile, discardPile)
      
      expect(card).toBeDefined()
      expect(newDiscardPile.length).toBe(1)
      expect(newDiscardPile[0]).toEqual({ suit: '♦', rank: '4' })
      expect(newDrawPile.length).toBe(1)
    })

    it('returns null if both piles are empty', () => {
      const { card } = drawCard([], [])
      expect(card).toBeNull()
    })
  })

  describe('getLegalCards', () => {
    it('returns all playable cards', () => {
      const hand = [
        { suit: '♠', rank: '5' },
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '8' },
        { suit: '♣', rank: '7' },
      ]
      const topCard = { suit: '♠', rank: '7' }
      const activeSuit = '♠'
      
      const legal = getLegalCards(hand, topCard, activeSuit)
      
      expect(legal.length).toBe(3)
      expect(legal).toContainEqual({ suit: '♠', rank: '5' })
      expect(legal).toContainEqual({ suit: '♦', rank: '8' })
      expect(legal).toContainEqual({ suit: '♣', rank: '7' })
    })

    it('returns empty array if no cards are legal', () => {
      const hand = [
        { suit: '♥', rank: '3' },
        { suit: '♦', rank: '4' },
      ]
      const topCard = { suit: '♠', rank: '7' }
      const activeSuit = '♠'
      
      const legal = getLegalCards(hand, topCard, activeSuit)
      expect(legal.length).toBe(0)
    })
  })

  describe('applyPlay', () => {
    it('removes the played card from the player hand', () => {
      const state = {
        hands: [[{ suit: '♠', rank: '5' }, { suit: '♥', rank: '3' }]],
        drawPile: [],
        discardPile: [{ suit: '♠', rank: '7' }],
      }
      const result = applyPlay(state, 0, { suit: '♠', rank: '5' })
      
      expect(result.hands[0].length).toBe(1)
      expect(result.hands[0][0]).toEqual({ suit: '♥', rank: '3' })
      expect(result.discardPile[result.discardPile.length - 1]).toEqual({ suit: '♠', rank: '5' })
    })
  })

  describe('applyDraw', () => {
    it('adds drawn card to player hand', () => {
      const state = {
        hands: [[{ suit: '♥', rank: '3' }]],
        drawPile: [{ suit: '♠', rank: '2' }],
        discardPile: [{ suit: '♠', rank: '7' }],
      }
      const result = applyDraw(state, 0)
      
      expect(result.hands[0].length).toBe(2)
      expect(result.drawnCard).toEqual({ suit: '♠', rank: '2' })
      expect(result.drawPile.length).toBe(0)
    })
  })

  describe('takeAiTurn', () => {
    it('plays a card if AI has one', () => {
      const state = {
        hands: [[], [{ suit: '♠', rank: '5' }], [], []],
        drawPile: [],
        discardPile: [{ suit: '♠', rank: '7' }],
      }
      const result = takeAiTurn(state, 1, '♠')
      
      expect(result.action).toBe('play')
      expect(result.hands[1].length).toBe(0)
    })

    it('draws if AI has no playable card', () => {
      const state = {
        hands: [[], [{ suit: '♥', rank: '3' }], [], []],
        drawPile: [{ suit: '♦', rank: '2' }],
        discardPile: [{ suit: '♠', rank: '7' }],
      }
      const result = takeAiTurn(state, 1, '♠')
      
      expect(result.action).toBe('draw-pass')
      expect(result.hands[1].length).toBe(2)
    })
  })

  describe('Card Conservation Invariant - 200 Full Games', () => {
    function countCards(state) {
      const allCards = []
      for (const hand of state.hands) {
        allCards.push(...hand)
      }
      allCards.push(...state.drawPile)
      allCards.push(...state.discardPile)
      return allCards
    }

    function checkInvariant(state, turnNum, gameNum) {
      const allCards = countCards(state)
      
      // Must have exactly 52 cards
      expect(allCards.length).toBe(52)
      
      // No duplicates
      const cardStrings = allCards.map((c) => `${c.rank}${c.suit}`)
      const uniqueCards = new Set(cardStrings)
      if (uniqueCards.size !== 52) {
        console.error(`Game ${gameNum}, Turn ${turnNum}: Duplicate cards detected!`)
        console.error('All cards:', cardStrings.sort())
        console.error('State:', JSON.stringify(state, null, 2))
      }
      expect(uniqueCards.size).toBe(52)
    }

    it('maintains exactly 52 unique cards through 200 complete games', () => {
      const MAX_TURNS = 500 // Prevent infinite loops
      
      for (let gameNum = 0; gameNum < 200; gameNum++) {
        // Initialize game
        const deck = shuffle(buildDeck())
        const { hands, drawPile } = deal(deck, 4, 5)
        const discardPile = [drawPile.shift()]
        
        let state = { hands, drawPile, discardPile }
        let currentPlayer = 0
        let activeSuit = discardPile[0].suit
        let turnNum = 0
        let winner = null
        
        // Check initial state
        checkInvariant(state, 0, gameNum)
        
        // Play until someone wins or max turns
        while (!winner && turnNum < MAX_TURNS) {
          turnNum++
          
          if (currentPlayer === 0) {
            // Human simulated play
            const topCard = state.discardPile[state.discardPile.length - 1]
            const legalCards = getLegalCards(state.hands[0], topCard, activeSuit)
            
            if (legalCards.length > 0) {
              const result = applyPlay(state, 0, legalCards[0])
              state = { hands: result.hands, drawPile: result.drawPile, discardPile: result.discardPile }
              activeSuit = legalCards[0].rank === '8' ? chooseSuitForAi(state.hands[0]) : legalCards[0].suit
            } else {
              const result = applyDraw(state, 0)
              state = { hands: result.hands, drawPile: result.drawPile, discardPile: result.discardPile }
            }
          } else {
            // AI turn
            const result = takeAiTurn(state, currentPlayer, activeSuit)
            state = { hands: result.hands, drawPile: result.drawPile, discardPile: result.discardPile }
            if (result.newSuit) activeSuit = result.newSuit
          }
          
          // Check invariant after every turn
          checkInvariant(state, turnNum, gameNum)
          
          // Check for winner
          if (hasWon(state.hands[currentPlayer])) {
            winner = currentPlayer
          }
          
          currentPlayer = nextPlayer(currentPlayer, 4)
        }
        
        // Each game must end with a winner within bounded turns
        if (!winner) {
          console.error(`Game ${gameNum} exceeded ${MAX_TURNS} turns without a winner`)
          console.error('Final state:', JSON.stringify(state, null, 2))
        }
        expect(winner).not.toBeNull()
        expect(turnNum).toBeLessThan(MAX_TURNS)
      }
    })
  })
})
