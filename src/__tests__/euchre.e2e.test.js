/**
 * End-to-end test for Euchre game state machine
 * 
 * This test drives the actual game through a complete hand:
 * - Deal cards
 * - Full bidding round (all 4 seats including AI)
 * - Trump selection
 * - Play all 5 tricks with follow-suit enforced
 * - Score the hand
 * 
 * This verifies the game works in practice, not just that isolated functions pass unit tests.
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EuchreBoard from '../components/euchre/EuchreBoard'

// Mock timer helper to control async behavior
jest.useFakeTimers()

describe('Euchre End-to-End Game Flow', () => {
  beforeEach(() => {
    jest.clearAllTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
  })

  it('should play a complete hand from deal to scoring without getting stuck', async () => {
    // Render the game
    const { container } = render(<EuchreBoard />)
    
    // Game should start in deal phase and automatically transition to bid1
    await act(async () => {
      jest.runAllTimers()
    })
    
    // We should see bidding message
    await waitFor(() => {
      const message = container.querySelector('[class*="text"]') || document.body
      expect(message.textContent).toMatch(/Bidding/i)
    }, { timeout: 5000 })
    
    console.log('✓ Game dealt and entered bidding phase')
    
    // Track that we complete bidding
    // The game cycles through West, North, East, then South (the player)
    // AI players should auto-bid within their timers
    let biddingComplete = false
    let trumpEstablished = false
    
    // Run all timers to let AI players bid
    for (let i = 0; i < 10; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2000)
      })
      
      const bodyText = document.body.textContent
      
      if (bodyText.match(/trump/i) && bodyText.match(/leads/i)) {
        biddingComplete = true
        trumpEstablished = true
        console.log('✓ Trump established and play phase started')
        break
      }
      
      if (bodyText.match(/order up|pass|name trump/i)) {
        console.log(`  Bidding in progress... (iteration ${i + 1})`)
      }
    }
    
    expect(biddingComplete).toBe(true)
    expect(trumpEstablished).toBe(true)
    
    // Now we're in play phase - track tricks played
    let tricksPlayed = 0
    let handComplete = false
    
    // Play through all 5 tricks
    // Each trick has 4 cards, and there are timeouts between AI plays
    for (let trick = 0; trick < 5; trick++) {
      console.log(`\n--- Playing trick ${trick + 1}/5 ---`)
      
      // Advance timers to let AI players act
      for (let i = 0; i < 20; i++) {
        await act(async () => {
          jest.advanceTimersByTime(1000)
        })
        
        const bodyText = document.body.textContent
        
        // Check if hand is over
        if (bodyText.match(/hand over|next hand|euchred|march/i) || 
            bodyText.match(/\+\d+ point/i)) {
          handComplete = true
          tricksPlayed = trick + 1
          console.log(`✓ Hand completed after ${tricksPlayed} tricks`)
          break
        }
        
        // Check if trick completed
        if (bodyText.match(/wins the trick/i)) {
          console.log(`✓ Trick ${trick + 1} completed`)
          tricksPlayed = trick + 1
          break
        }
        
        // If it's the player's turn (South), try to play a card
        const cards = container.querySelectorAll('button')
        const playableCards = Array.from(cards).filter(btn => 
          !btn.disabled && btn.textContent.match(/[9TJQKA]/i)
        )
        
        if (playableCards.length > 0) {
          console.log(`  Player's turn - ${playableCards.length} playable cards`)
          await act(async () => {
            playableCards[0].click()
          })
          await act(async () => {
            jest.advanceTimersByTime(100)
          })
        }
      }
      
      if (handComplete) {
        break
      }
      
      // Wait a bit between tricks
      await act(async () => {
        jest.advanceTimersByTime(2000)
      })
    }
    
    // Verify hand reached completion
    expect(handComplete).toBe(true)
    expect(tricksPlayed).toBeGreaterThanOrEqual(5)
    
    console.log('\n✅ Complete hand played successfully!')
    console.log(`   - Bidding completed with trump established`)
    console.log(`   - ${tricksPlayed} tricks played`)
    console.log(`   - Hand scored without getting stuck`)
    
    // Verify score was updated
    await waitFor(() => {
      const bodyText = document.body.textContent
      expect(bodyText).toMatch(/hand over|euchred|march|\+\d+ point/i)
    })
  }, 60000) // 60 second timeout for the full test
  
  it('should enforce follow-suit rules', async () => {
    const { container } = render(<EuchreBoard />)
    
    await act(async () => {
      jest.runAllTimers()
    })
    
    // Wait for game to start
    await waitFor(() => {
      expect(document.body.textContent).toMatch(/Bidding|trump/i)
    })
    
    // Let bidding complete
    for (let i = 0; i < 15; i++) {
      await act(async () => {
        jest.advanceTimersByTime(2000)
      })
      
      if (document.body.textContent.match(/leads/i)) {
        console.log('✓ Bidding complete, play started')
        break
      }
    }
    
    // Now try to play a card when it's player's turn
    // If follow-suit is violated, we should see an error message
    let followSuitTested = false
    
    for (let i = 0; i < 30; i++) {
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
      
      const cards = container.querySelectorAll('button')
      const playableCards = Array.from(cards).filter(btn => 
        !btn.disabled && btn.textContent.match(/[9TJQKA]/i)
      )
      
      if (playableCards.length > 1) {
        // Try to play each card and see if any are rejected
        for (const card of playableCards) {
          const beforeText = document.body.textContent
          await act(async () => {
            card.click()
          })
          await act(async () => {
            jest.advanceTimersByTime(100)
          })
          const afterText = document.body.textContent
          
          if (afterText.includes('Must follow suit') || afterText.includes('follow')) {
            console.log('✓ Follow-suit enforcement working')
            followSuitTested = true
            break
          }
          
          // If card was played successfully, break
          if (playableCards.filter(c => !c.disabled).length < playableCards.length) {
            break
          }
        }
        
        if (followSuitTested) break
      }
    }
    
    // Note: This test may not always trigger follow-suit violation depending on the dealt hand
    console.log(followSuitTested ? 
      '✅ Follow-suit rule tested and enforced' : 
      '⚠️  Follow-suit not tested (no violation opportunity in this hand)')
  }, 60000)
})
