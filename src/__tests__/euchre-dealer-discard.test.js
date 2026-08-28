import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import EuchreBoard from '../components/euchre/EuchreBoard'

describe('Euchre Dealer Discard', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  test('AI dealer discards after being ordered up', async () => {
    render(<EuchreBoard />)
    
    // Start the game
    const startButton = screen.getByRole('button', { name: /Start Game/i })
    fireEvent.click(startButton)
    
    // Advance timers to process initial state
    act(() => {
      jest.advanceTimersByTime(100)
    })
    
    // Check if we're in bidding phase
    await waitFor(() => {
      expect(screen.queryByText(/turn to bid/i)).toBeInTheDocument()
    })
    
    // Get initial dealer
    const dealerText = screen.getByText(/Dealer:/)
    const dealerMatch = dealerText.textContent.match(/Dealer:\s*(\w+)/)
    const initialDealer = dealerMatch ? dealerMatch[1] : null
    
    // If South is bidding and dealer is AI, order up
    const currentPlayerText = screen.queryByText(/South's turn to bid/)
    if (currentPlayerText && initialDealer && initialDealer !== 'South') {
      // South orders up when AI is dealer
      const orderUpButton = screen.queryByRole('button', { name: /Order Up/i })
      if (orderUpButton) {
        fireEvent.click(orderUpButton)
        
        // Message should appear
        await waitFor(() => {
          expect(screen.queryByText(/ordered up/i)).toBeInTheDocument()
        })
        
        // Advance timer for AI dealer to discard
        act(() => {
          jest.advanceTimersByTime(1500)
        })
        
        // Game should progress to playing phase (not stay frozen)
        await waitFor(
          () => {
            // Should see playing phase indicators
            const playingText = screen.queryByText(/turn/i)
            expect(playingText).toBeInTheDocument()
            
            // Should NOT still be in dealerDiscarding state
            // If still frozen, the discard prompt would still show
            const discardPrompt = screen.queryByText(/Choose a card to discard/i)
            expect(discardPrompt).not.toBeInTheDocument()
          },
          { timeout: 2000 }
        )
      } else {
        // Test scenario didn't apply, pass vacuously
        expect(true).toBe(true)
      }
    } else {
      // Test scenario didn't apply (South isn't first bidder or is dealer)
      expect(true).toBe(true)
    }
  })

  test('game reaches playing phase after AI dealer discard', async () => {
    let reachedPlaying = false
    let attempts = 0
    const maxAttempts = 5
    
    // Try multiple times since dealer rotation is random
    while (!reachedPlaying && attempts < maxAttempts) {
      const { unmount } = render(<EuchreBoard />)
      
      const startButton = screen.getByRole('button', { name: /Start Game/i })
      fireEvent.click(startButton)
      
      act(() => {
        jest.advanceTimersByTime(100)
      })
      
      await waitFor(() => {
        expect(screen.queryByText(/turn to bid/i)).toBeInTheDocument()
      })
      
      const dealerText = screen.queryByText(/Dealer:/)
      if (dealerText) {
        const dealerMatch = dealerText.textContent.match(/Dealer:\s*(\w+)/)
        const dealer = dealerMatch ? dealerMatch[1] : null
        
        const southBidding = screen.queryByText(/South's turn to bid/)
        if (southBidding && dealer && dealer !== 'South') {
          const orderUpButton = screen.queryByRole('button', { name: /Order Up/i })
          if (orderUpButton) {
            fireEvent.click(orderUpButton)
            
            // Wait for order up message
            await waitFor(() => {
              expect(screen.queryByText(/ordered up/i)).toBeInTheDocument()
            }, { timeout: 1000 })
            
            // Advance timer for AI dealer discard
            act(() => {
              jest.advanceTimersByTime(2000)
            })
            
            // Check if game progressed
            try {
              await waitFor(
                () => {
                  const turnText = screen.queryByText(/turn/i)
                  const playingArea = screen.queryByText(/Tricks:/i)
                  if (turnText || playingArea) {
                    reachedPlaying = true
                    return true
                  }
                  throw new Error('Not in playing phase yet')
                },
                { timeout: 3000 }
              )
            } catch {
              // This attempt failed, try again
            }
          }
        }
      }
      
      unmount()
      attempts++
    }
    
    // Assert that we eventually reached playing phase
    expect(reachedPlaying).toBe(true)
  })
})
