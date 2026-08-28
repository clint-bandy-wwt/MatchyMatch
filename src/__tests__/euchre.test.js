import { render, screen, waitFor, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import EuchreBoard from '../components/euchre/EuchreBoard'
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

describe('EuchreBoard - Component Regression Tests', () => {
  it('should not get stuck when AI bids first (waitingForAI regression)', async () => {
    // REGRESSION: If deal effect doesn't set waitingForAI=true for AI seats,
    // the game hangs forever on "West to bid" because no AI turn fires.
    // This must FAIL if that line is removed from the deal useEffect.
    
    // Deck where West (AI) bids first. Dealer=South (0), so (0+1)%4=1 is West.
    const deck = [
      // 3-2-3-2 deal pattern starting left of dealer: West, North, East, South
      { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, { rank: 'Q', suit: '♣' }, // West (3)
      { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, // North (2)
      { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, { rank: 'Q', suit: '♦' }, // East (3)
      { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' }, // South (2)
      { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' }, // West (2)
      { rank: 'Q', suit: '♥' }, { rank: 'K', suit: '♥' }, { rank: 'A', suit: '♥' }, // North (3)
      { rank: 'K', suit: '♦' }, { rank: 'A', suit: '♦' }, // East (2)
      { rank: 'Q', suit: '♠' }, { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' }, // South (3)
      { rank: 'J', suit: '♣' }, // Up card
    ]
    
    render(<EuchreBoard initialDeck={deck} />)
    
    // Trigger initial effects
    jest.runAllTimers()
    await waitFor(() => true, { timeout: 10 })
    
    // Should show "West to bid" after dealing
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/West to bid/i)
    }, { timeout: 1000 })
    
    const beforeAI = document.body.textContent
    
    // Advance past AI delay (800ms)
    jest.advanceTimersByTime(900)
    
    // Game MUST have progressed - West passed, now North's turn
    await waitFor(() => {
      const after = document.body.textContent
      expect(after).not.toBe(beforeAI)
      expect(after).toMatch(/North to bid|East to bid|South to bid/i)
    }, { timeout: 500 })
  })

  it('should force AI dealer to call trump when stuck (aiMustCallTrump regression)', async () => {
    // REGRESSION: If aiMustCallTrump is not called in the useEffect for stuck dealer,
    // the game hangs forever with "Dealer must call trump. Choose a suit."
    // This must FAIL if that aiMustCallTrump call is removed.
    
    // Weak hands, all pass round 1, South (dealer) is stuck in round 2
    const deck = [
      { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, { rank: 'Q', suit: '♣' }, // West
      { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, // North
      { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, { rank: 'Q', suit: '♦' }, // East
      { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' }, // South
      { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' }, // West
      { rank: 'Q', suit: '♥' }, { rank: 'K', suit: '♥' }, { rank: 'A', suit: '♥' }, // North
      { rank: 'K', suit: '♦' }, { rank: 'A', suit: '♦' }, // East
      { rank: 'Q', suit: '♠' }, { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' }, // South
      { rank: 'J', suit: '♣' }, // Up card
    ]
    
    render(<EuchreBoard initialDeck={deck} />)
    
    // Trigger initial effects
    jest.runAllTimers()
    await waitFor(() => true, { timeout: 10 })
    
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/to bid/i)
    }, { timeout: 1000 })
    
    // Advance through round 1 - all pass (4 players)
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(1000)
      await waitFor(() => true, { timeout: 100 })
    }
    
    // Should be in round 2
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Choose trump suit/i)
    }, { timeout: 2000 })
    
    // Advance through round 2 - West, North, East pass (3 players)
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(1000)
      await waitFor(() => true, { timeout: 100 })
    }
    
    // Now South (dealer) is stuck - should auto-call after AI delay
    jest.advanceTimersByTime(1000)
    
    // Game MUST have progressed - trump was called
    await waitFor(() => {
      const text = document.body.textContent
      expect(text).toMatch(/Trump:|calls ♠|calls ♥|calls ♦/i)
    }, { timeout: 2000 })
  })

  it('should show Pass button for non-dealer in round 2 and allow clicking it', async () => {
    // REGRESSION: If the Pass button JSX is deleted from bidding2 phase,
    // non-dealer humans have no way to pass (only suit buttons shown).
    // This must FAIL if that <button>Pass</button> is removed.
    
    const deck = [
      { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, { rank: 'Q', suit: '♣' },
      { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' },
      { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, { rank: 'Q', suit: '♦' },
      { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' },
      { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' },
      { rank: 'Q', suit: '♥' }, { rank: 'K', suit: '♥' }, { rank: 'A', suit: '♥' },
      { rank: 'K', suit: '♦' }, { rank: 'A', suit: '♦' },
      { rank: 'Q', suit: '♠' }, { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' },
      { rank: 'J', suit: '♣' },
    ]
    
    render(<EuchreBoard initialDeck={deck} />)
    
    // Trigger initial effects
    jest.runAllTimers()
    await waitFor(() => true, { timeout: 10 })
    
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/to bid/i)
    }, { timeout: 1000 })
    
    // Advance through round 1
    for (let i = 0; i < 5; i++) {
      jest.advanceTimersByTime(1000)
      await waitFor(() => true, { timeout: 100 })
    }
    
    // Should be in round 2
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Choose trump suit/i)
    }, { timeout: 2000 })
    
    // Advance until South's turn (non-dealer)
    // West goes first in round 2 (currentPlayer should be 1 after round 1 ends)
    // Let West, North, East go (3 turns)
    for (let i = 0; i < 3; i++) {
      jest.advanceTimersByTime(1000)
      await waitFor(() => true, { timeout: 100 })
    }
    
    // Now it's South's turn (non-dealer)
    await waitFor(() => {
      const text = document.body.textContent
      expect(text).toMatch(/South/i)
      expect(text).not.toMatch(/Dealer must call/i)
    }, { timeout: 1000 })
    
    // Pass button MUST exist for non-dealer
    const passButton = screen.getByText(/^Pass$/i)
    expect(passButton).toBeInTheDocument()
    
    // Click it and verify game progresses
    const before = document.body.textContent
    fireEvent.click(passButton)
    
    jest.advanceTimersByTime(100)
    
    // Should have progressed (back to dealer who must call)
    await waitFor(() => {
      expect(document.body.textContent).not.toBe(before)
    }, { timeout: 500 })
  })
})
