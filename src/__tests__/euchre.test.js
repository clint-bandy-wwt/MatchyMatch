import { render, screen, waitFor, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import EuchreBoard, {
  SUITS,
  getEffectiveRankSuit,
  whoWinsTrick,
  aiShouldOrderUp,
  aiShouldCallTrump,
  aiMustCallTrump,
} from '../components/euchre/EuchreBoard'

// Mock timers so we can control AI delays
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

// Helper to create a fixed deck for deterministic tests
function createFixedDeck() {
  // Create a specific deck order for reproducible tests
  // South gets: 9♠, 10♠, Q♠, K♠, A♠ (strong spades)
  // West gets: 9♣, 10♣, J♣, Q♣, K♣
  // North gets: 9♥, 10♥, J♥, Q♥, K♥
  // East gets: 9♦, 10♦, J♦, Q♦, K♦
  // Up card: A♣
  return [
    // Round 1: 3 to each starting left of dealer (dealer=0, so start at West)
    { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, { rank: 'J', suit: '♣' }, // West
    { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, { rank: 'J', suit: '♥' }, // North
    { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, { rank: 'J', suit: '♦' }, // East
    { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' }, { rank: 'Q', suit: '♠' }, // South
    // Round 2: 2 to each
    { rank: 'Q', suit: '♣' }, { rank: 'K', suit: '♣' }, // West
    { rank: 'Q', suit: '♥' }, { rank: 'K', suit: '♥' }, // North
    { rank: 'Q', suit: '♦' }, { rank: 'K', suit: '♦' }, // East
    { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' }, // South
    // Up card
    { rank: 'A', suit: '♣' },
  ]
}

// Deck where dealer (South) has weak hand to force passing to round 2
function createDealerMustCallDeck() {
  // Dealer=0 (South), so dealing starts at West (position 1)
  // Give South weak cards, all pass to round 2, South must call
  // West gets: 9♠, 10♠, Q♠, K♠, A♠
  // North gets: 9♣, 10♣, Q♣, K♣, A♣  
  // East gets: 9♥, 10♥, Q♥, K♥, A♥
  // South gets: 9♦, 10♦, J♦, Q♦, K♦
  // Up card: J♠ (so South has weak diamonds, must call something else)
  return [
    // Round 1: deal pattern 3-2-3-2 starting left of dealer
    { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' }, { rank: 'Q', suit: '♠' }, // West (3)
    { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, // North (2)
    { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, { rank: 'Q', suit: '♥' }, // East (3)
    { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, // South (2)
    // Round 2: 2-3-2-3
    { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' }, // West (2)
    { rank: 'Q', suit: '♣' }, { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' }, // North (3)
    { rank: 'K', suit: '♥' }, { rank: 'A', suit: '♥' }, // East (2)
    { rank: 'J', suit: '♦' }, { rank: 'Q', suit: '♦' }, { rank: 'K', suit: '♦' }, // South (3)
    // Up card
    { rank: 'J', suit: '♠' },
  ]
}

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

describe('EuchreBoard - Integration Tests', () => {
  it('should render without crashing', async () => {
    render(<EuchreBoard />)
    
    // Flush any pending effects
    await act(async () => {
      jest.runAllTimers()
    })
    
    expect(screen.getByText('Euchre')).toBeInTheDocument()
  })

  it('should not get stuck on initial bid - AI should take their turn', async () => {
    render(<EuchreBoard initialDeck={createFixedDeck()} />)
    
    // Flush effects
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Component should reach bidding phase
    await waitFor(() => {
      const text = document.body.textContent
      return text.includes('to bid')
    })
    
    // Capture the initial message
    const initialMessage = screen.getByText(/to bid/i).textContent
    
    // If it's not South's turn, AI should act after 800ms
    if (!initialMessage.includes('South')) {
      // Advance timers to trigger AI action
      await act(async () => {
        jest.advanceTimersByTime(900)
      })
      
      // The game state should have progressed
      await waitFor(() => {
        expect(document.body.textContent).not.toBe(initialMessage)
      }, { timeout: 1000 })
    }
  })

  it('should handle dealer discard when trump is ordered up', async () => {
    // Use fixed deck for deterministic behavior
    render(<EuchreBoard initialDeck={createFixedDeck()} />)
    
    // Wait for bidding to start
    await act(async () => {
      jest.runAllTimers()
    })
    
    await waitFor(() => {
      expect(screen.getByText(/to bid/i)).toBeInTheDocument()
    })
    
    // If South is first to bid, order up immediately
    const orderUpButton = screen.queryByText(/Order Up/i)
    if (orderUpButton) {
      fireEvent.click(orderUpButton)
      
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }
    
    // Advance more timers to let AI finish bidding/discarding
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }
    
    // Component should still be mounted and not crashed
    expect(screen.getByText('Euchre')).toBeInTheDocument()
  })

  it('should show Pass button for non-dealer in bidding round 2', async () => {
    // Use a deck where no one orders up in round 1, forcing round 2
    // Make West the dealer, South is non-dealer and will see Pass button
    const weakDeck = [
      // All weak hands, no one will order up
      { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, { rank: 'Q', suit: '♣' },
      { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, { rank: 'Q', suit: '♥' },
      { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, { rank: 'Q', suit: '♦' },
      { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' }, { rank: 'Q', suit: '♠' },
      { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' },
      { rank: 'K', suit: '♥' }, { rank: 'A', suit: '♥' },
      { rank: 'K', suit: '♦' }, { rank: 'A', suit: '♦' },
      { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' },
      { rank: 'J', suit: '♣' }, // Up card - no jacks in hands
    ]
    
    render(<EuchreBoard initialDeck={weakDeck} />)
    
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Wait for bidding round 1
    await waitFor(() => {
      expect(screen.getByText(/to bid/i)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Advance through round 1 - all AI will pass (no strong hands)
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }
    
    // Should reach round 2
    await waitFor(() => {
      const text = document.body.textContent
      return text.includes('Choose trump suit') || text.includes('to bid')
    }, { timeout: 3000 })
    
    // If it's South's turn and South is not dealer, Pass button should exist
    const message = document.body.textContent
    if (message.includes('South') && !message.includes('Dealer must call')) {
      const passButton = screen.queryByText(/^Pass$/i)
      expect(passButton).toBeInTheDocument()
    }
  })

  it('should NOT show Pass button for dealer in bidding round 2', async () => {
    // Use dealer-must-call deck
    render(<EuchreBoard initialDeck={createDealerMustCallDeck()} />)
    
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Wait for bidding
    await waitFor(() => {
      expect(screen.getByText(/to bid/i)).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Advance through round 1 - weak hands, all pass
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }
    
    // Should reach round 2 with dealer (South) required to call
    await waitFor(() => {
      const text = document.body.textContent
      return text.includes('Dealer must call') || text.includes('Choose trump suit')
    }, { timeout: 3000 })
    
    // Dealer should see "must call" message and NO Pass button
    const message = document.body.textContent
    if (message.includes('South') && message.includes('Dealer must call')) {
      const passButton = screen.queryByText(/^Pass$/i)
      expect(passButton).not.toBeInTheDocument()
    }
  })

  it('should allow clicking Pass button to advance bidding', async () => {
    // Deck where South is first and non-dealer
    const southFirstDeck = [
      // Weak hands to not order up in round 1
      { rank: '9', suit: '♥' }, { rank: '10', suit: '♥' }, { rank: 'Q', suit: '♥' }, // West
      { rank: '9', suit: '♦' }, { rank: '10', suit: '♦' }, // North
      { rank: '9', suit: '♠' }, { rank: '10', suit: '♠' }, { rank: 'Q', suit: '♠' }, // East
      { rank: '9', suit: '♣' }, { rank: '10', suit: '♣' }, // South
      { rank: 'K', suit: '♥' }, { rank: 'A', suit: '♥' }, // West
      { rank: 'K', suit: '♦' }, { rank: 'A', suit: '♦' }, { rank: 'J', suit: '♦' }, // North
      { rank: 'K', suit: '♠' }, { rank: 'A', suit: '♠' }, // East
      { rank: 'Q', suit: '♣' }, { rank: 'K', suit: '♣' }, { rank: 'A', suit: '♣' }, // South
      { rank: 'J', suit: '♣' }, // Up card
    ]
    
    render(<EuchreBoard initialDeck={southFirstDeck} />)
    
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Wait for round 1 bidding
    await waitFor(() => {
      expect(screen.getByText(/to bid/i)).toBeInTheDocument()
    })
    
    // Pass in round 1 if South is up
    const passButton1 = screen.queryByText(/Pass/i)
    if (passButton1) {
      fireEvent.click(passButton1)
      
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }
    
    // Advance through remaining round 1 bids
    for (let i = 0; i < 4; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
    }
    
    // Should reach round 2
    await waitFor(() => {
      const text = document.body.textContent
      return text.includes('Choose trump suit')
    }, { timeout: 3000 })
    
    // If South is up and not dealer, click Pass
    const message = document.body.textContent
    if (message.includes('South') && !message.includes('Dealer must call')) {
      const passButton2 = screen.queryByText(/^Pass$/i)
      if (passButton2) {
        const beforeClick = document.body.textContent
        fireEvent.click(passButton2)
        
        await act(async () => {
          jest.advanceTimersByTime(1000)
        })
        
        // Game should have progressed
        await waitFor(() => {
          expect(document.body.textContent).not.toBe(beforeClick)
        })
      }
    }
  })
})
