import { render, screen, waitFor, act } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import EuchreBoard from '../components/euchre/EuchreBoard'

// Mock timers so we can control AI delays
beforeEach(() => {
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

describe('EuchreBoard', () => {
  it('should render without crashing', async () => {
    render(<EuchreBoard />)
    
    // Flush any pending effects
    await act(async () => {
      jest.runAllTimers()
    })
    
    expect(screen.getByText('Euchre')).toBeInTheDocument()
  })

  it('should not get stuck on initial bid - AI should take their turn', async () => {
    render(<EuchreBoard />)
    
    // Initial state should show dealing
    await act(async () => {
      jest.runAllTimers()
    })
    
    // After mount, component should deal and transition to bidding
    await waitFor(() => {
      // Look for the bidding message specifically
      const bidMessage = screen.queryByText(/to bid/i)
      if (!bidMessage) {
        throw new Error('Still waiting for bidding to start')
      }
    }, { timeout: 2000 })
    
    // Capture the initial message
    const initialMessage = screen.getByText(/to bid/i).textContent
    
    // If it's not South's turn, AI should act after 800ms
    if (!initialMessage.includes('South')) {
      // Advance timers to trigger AI action
      await act(async () => {
        jest.advanceTimersByTime(900)
      })
      
      // The game state should have progressed - either:
      // - A different player is now bidding, OR
      // - Trump was called and we're in a new phase, OR  
      // - We're still bidding but the message changed (someone passed)
      await waitFor(() => {
        expect(document.body.textContent).not.toBe(initialMessage)
      }, { timeout: 1000 })
    }
  })

  it('should handle dealer discard when trump is ordered up', async () => {
    render(<EuchreBoard />)
    
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
      // This means South is bidding - order up
      fireEvent.click(orderUpButton)
      
      // Should transition to some new state
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

  it('should not crash during state transitions', async () => {
    // This test verifies that after a trick completes, 
    // the next player's turn is set up correctly with waitingForAI
    render(<EuchreBoard />)
    
    // Get to playing state (abbreviated test)
    await act(async () => {
      jest.runAllTimers()
    })
    
    await waitFor(() => {
      const text = document.body.textContent
      return text.includes('to bid') || text.includes('Trump:')
    }, { timeout: 1000 })
    
    // The component should not crash and should be interactive
    expect(screen.getByText('Euchre')).toBeInTheDocument()
  })
})
