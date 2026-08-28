import { useState, useEffect, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const POSITIONS = ['South', 'West', 'North', 'East']

// ── Deck creation ────────────────────────────────────────────────────────────

function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank })
    }
  }
  return deck
}

function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// ── Card value calculation ───────────────────────────────────────────────────

function getCardValue(card, trump) {
  const { suit, rank } = card
  
  // Right bower (Jack of trump suit)
  if (rank === 'J' && suit === trump) return 100
  
  // Left bower (Jack of same color as trump)
  const leftBowerSuit = getLeftBowerSuit(trump)
  if (rank === 'J' && suit === leftBowerSuit) return 99
  
  // Other trump cards
  if (suit === trump) {
    const values = { 'A': 98, 'K': 97, 'Q': 96, '10': 95, '9': 94 }
    return values[rank] || 0
  }
  
  // Non-trump cards
  const values = { 'A': 14, 'K': 13, 'Q': 12, 'J': 11, '10': 10, '9': 9 }
  return values[rank] || 0
}

function getLeftBowerSuit(trump) {
  if (trump === '♠') return '♣'
  if (trump === '♣') return '♠'
  if (trump === '♥') return '♦'
  if (trump === '♦') return '♥'
  return null
}

function getEffectiveSuit(card, trump) {
  // Left bower is treated as trump suit
  const leftBowerSuit = getLeftBowerSuit(trump)
  if (card.rank === 'J' && card.suit === leftBowerSuit) {
    return trump
  }
  return card.suit
}

// ── Initial state ────────────────────────────────────────────────────────────

function initState() {
  const deck = shuffleDeck(createDeck())
  const hands = {
    South: deck.slice(0, 5),
    West: deck.slice(5, 10),
    North: deck.slice(10, 15),
    East: deck.slice(15, 20),
  }
  const upCard = deck[20]
  
  return {
    phase: 'bidding',  // 'bidding', 'dealer_discard', 'playing', 'trick_complete', 'hand_complete', 'game_over'
    hands,
    upCard,
    trump: null,
    dealer: 'East',
    currentPlayer: 'South',
    bidRound: 1,  // 1 = order up/pass, 2 = call any suit
    maker: null,
    alonePlayer: null,
    currentTrick: [],
    trickWinner: null,
    tricksWon: { SouthNorth: 0, WestEast: 0 },
    score: { SouthNorth: 0, WestEast: 0 },
    leadSuit: null,
    handHistory: [],
    message: '',
  }
}

// ── AI logic ─────────────────────────────────────────────────────────────────

function aiDecideBid(state, position) {
  const { upCard, bidRound, hands, dealer } = state
  const hand = hands[position]
  
  if (bidRound === 1) {
    // Decide whether to order up
    const trumpStrength = evaluateTrumpStrength(hand, upCard.suit)
    const shouldOrderUp = trumpStrength >= 3
    
    // Dealer should pick up if marginally decent
    if (position === dealer && trumpStrength >= 2) {
      return { action: 'order_up', alone: false }
    }
    
    return shouldOrderUp 
      ? { action: 'order_up', alone: trumpStrength >= 5 }
      : { action: 'pass' }
  } else {
    // Second round - must call if dealer (stick the dealer)
    const isDealer = position === dealer
    
    // Find best suit to call
    let bestSuit = null
    let bestStrength = isDealer ? 0 : 2.5
    
    for (const suit of SUITS) {
      if (suit === upCard.suit) continue
      const strength = evaluateTrumpStrength(hand, suit)
      if (strength > bestStrength) {
        bestStrength = strength
        bestSuit = suit
      }
    }
    
    if (bestSuit) {
      return { action: 'call', suit: bestSuit, alone: bestStrength >= 5 }
    }
    
    return { action: 'pass' }
  }
}

function evaluateTrumpStrength(hand, trump) {
  let strength = 0
  const leftBowerSuit = getLeftBowerSuit(trump)
  
  for (const card of hand) {
    const effectiveSuit = getEffectiveSuit(card, trump)
    
    if (effectiveSuit === trump) {
      if (card.rank === 'J' && card.suit === trump) strength += 3  // Right bower
      else if (card.rank === 'J' && card.suit === leftBowerSuit) strength += 2.5  // Left bower
      else if (card.rank === 'A') strength += 2
      else if (card.rank === 'K') strength += 1
      else strength += 0.5
    } else if (card.rank === 'A') {
      strength += 0.5  // Off-suit ace
    }
  }
  
  return strength
}

function aiPlayCard(state, position) {
  const { hands, currentTrick, trump, leadSuit, alonePlayer } = state
  const hand = hands[position]
  
  if (hand.length === 0) return null
  
  // Get valid cards (must follow suit if possible)
  const validCards = getValidCards(hand, leadSuit, trump)
  
  if (validCards.length === 1) return validCards[0]
  
  // Simple AI strategy
  if (currentTrick.length === 0) {
    // Lead with highest trump if we have it
    const trumpCards = validCards.filter(c => getEffectiveSuit(c, trump) === trump)
    if (trumpCards.length > 0) {
      return trumpCards.sort((a, b) => getCardValue(b, trump) - getCardValue(a, trump))[0]
    }
    // Otherwise lead with lowest card
    return validCards.sort((a, b) => getCardValue(a, trump) - getCardValue(b, trump))[0]
  } else {
    // Try to win the trick if partner isn't winning
    const partnerIndex = (POSITIONS.indexOf(position) + 2) % 4
    const currentWinner = getCurrentTrickWinner(currentTrick, leadSuit, trump)
    const partnerIsWinning = currentWinner && 
      POSITIONS.indexOf(currentWinner.position) === partnerIndex
    
    if (partnerIsWinning) {
      // Dump lowest card
      return validCards.sort((a, b) => getCardValue(a, trump) - getCardValue(b, trump))[0]
    } else {
      // Try to win with lowest winning card
      const winningCards = validCards.filter(card => {
        const testTrick = [...currentTrick, { position, card }]
        const winner = getCurrentTrickWinner(testTrick, leadSuit, trump)
        return winner && winner.position === position
      })
      
      if (winningCards.length > 0) {
        return winningCards.sort((a, b) => getCardValue(a, trump) - getCardValue(b, trump))[0]
      } else {
        // Can't win, dump lowest
        return validCards.sort((a, b) => getCardValue(a, trump) - getCardValue(b, trump))[0]
      }
    }
  }
}

function getValidCards(hand, leadSuit, trump) {
  if (!leadSuit) return hand
  
  // Must follow suit if possible
  const followCards = hand.filter(card => getEffectiveSuit(card, trump) === leadSuit)
  return followCards.length > 0 ? followCards : hand
}

function getCurrentTrickWinner(trick, leadSuit, trump) {
  if (trick.length === 0) return null
  
  let winner = trick[0]
  let winningValue = getCardValue(winner.card, trump)
  const winningEffectiveSuit = getEffectiveSuit(winner.card, trump)
  
  for (let i = 1; i < trick.length; i++) {
    const play = trick[i]
    const cardValue = getCardValue(play.card, trump)
    const effectiveSuit = getEffectiveSuit(play.card, trump)
    
    // Trump beats non-trump
    if (effectiveSuit === trump && winningEffectiveSuit !== trump) {
      winner = play
      winningValue = cardValue
    } else if (effectiveSuit === winningEffectiveSuit && cardValue > winningValue) {
      // Same suit, higher value
      winner = play
      winningValue = cardValue
    }
  }
  
  return winner
}

// ── Main component ───────────────────────────────────────────────────────────

export default function EuchreBoard() {
  const [state, setState] = useState(initState)
  
  const advanceToNextPlayer = useCallback((currentPos) => {
    const currentIndex = POSITIONS.indexOf(currentPos)
    const nextIndex = (currentIndex + 1) % 4
    return POSITIONS[nextIndex]
  }, [])
  
  const getTeam = useCallback((position) => {
    return position === 'South' || position === 'North' ? 'SouthNorth' : 'WestEast'
  }, [])
  
  // AI turn processing
  useEffect(() => {
    if (state.currentPlayer === 'South') return
    if (state.phase === 'game_over') return
    if (state.phase === 'trick_complete') return
    if (state.phase === 'hand_complete') return
    
    const timer = setTimeout(() => {
      if (state.phase === 'bidding') {
        const decision = aiDecideBid(state, state.currentPlayer)
        handleBidDecision(decision)
      } else if (state.phase === 'dealer_discard' && state.currentPlayer === state.dealer) {
        // AI dealer discards lowest card
        const hand = state.hands[state.dealer]
        const sortedHand = [...hand].sort((a, b) => 
          getCardValue(a, state.trump) - getCardValue(b, state.trump)
        )
        handleDealerDiscard(sortedHand[0])
      } else if (state.phase === 'playing') {
        const card = aiPlayCard(state, state.currentPlayer)
        if (card) {
          handlePlayCard(card)
        }
      }
    }, 800)
    
    return () => clearTimeout(timer)
  }, [state.currentPlayer, state.phase])
  
  const handleBidDecision = useCallback((decision) => {
    setState(prevState => {
      const { currentPlayer, bidRound, dealer, upCard } = prevState
      
      if (decision.action === 'order_up' || decision.action === 'call') {
        // Someone made trump
        const trump = decision.action === 'order_up' ? upCard.suit : decision.suit
        const newState = {
          ...prevState,
          trump,
          maker: currentPlayer,
          alonePlayer: decision.alone ? currentPlayer : null,
          message: `${currentPlayer} ${decision.action === 'order_up' ? 'ordered up' : 'called'} ${trump}${decision.alone ? ' and is going alone!' : ''}`,
        }
        
        if (decision.action === 'order_up') {
          // Dealer picks up the up card and must discard
          const dealerHand = [...prevState.hands[dealer], upCard]
          newState.hands = { ...prevState.hands, [dealer]: dealerHand }
          newState.phase = 'dealer_discard'
          newState.currentPlayer = dealer
        } else {
          // Start playing
          newState.phase = 'playing'
          newState.currentPlayer = advanceToNextPlayer(dealer)
          newState.leadSuit = null
          newState.currentTrick = []
        }
        
        return newState
      } else {
        // Pass
        const nextPlayer = advanceToNextPlayer(currentPlayer)
        
        // Check if we've gone around once
        if (nextPlayer === advanceToNextPlayer(dealer) && bidRound === 1) {
          // Start round 2
          return {
            ...prevState,
            bidRound: 2,
            currentPlayer: nextPlayer,
            message: 'Round 2: Call any suit',
          }
        } else if (nextPlayer === advanceToNextPlayer(dealer) && bidRound === 2) {
          // Everyone passed - shouldn't happen with stick-the-dealer, but reset hand
          return {
            ...initState(),
            score: prevState.score,
            message: 'All passed - dealing new hand',
          }
        } else {
          return {
            ...prevState,
            currentPlayer: nextPlayer,
            message: `${currentPlayer} passed`,
          }
        }
      }
    })
  }, [advanceToNextPlayer])
  
  const handleDealerDiscard = useCallback((card) => {
    setState(prevState => {
      const dealerHand = prevState.hands[prevState.dealer].filter(c => 
        !(c.suit === card.suit && c.rank === card.rank)
      )
      
      return {
        ...prevState,
        hands: { ...prevState.hands, [prevState.dealer]: dealerHand },
        phase: 'playing',
        currentPlayer: advanceToNextPlayer(prevState.dealer),
        leadSuit: null,
        currentTrick: [],
        message: `${prevState.dealer} discarded`,
      }
    })
  }, [advanceToNextPlayer])
  
  const handlePlayCard = useCallback((card) => {
    setState(prevState => {
      const { currentPlayer, hands, currentTrick, trump, leadSuit, alonePlayer } = prevState
      
      // Remove card from hand
      const newHands = {
        ...hands,
        [currentPlayer]: hands[currentPlayer].filter(c => 
          !(c.suit === card.suit && c.rank === card.rank)
        ),
      }
      
      // Add to trick
      const newTrick = [...currentTrick, { position: currentPlayer, card }]
      const newLeadSuit = leadSuit || getEffectiveSuit(card, trump)
      
      // Check if trick is complete (4 cards or 3 if someone went alone)
      const expectedPlayers = alonePlayer ? 3 : 4
      
      if (newTrick.length === expectedPlayers) {
        // Trick complete
        const winner = getCurrentTrickWinner(newTrick, newLeadSuit, trump)
        const winnerTeam = getTeam(winner.position)
        const newTricksWon = {
          ...prevState.tricksWon,
          [winnerTeam]: prevState.tricksWon[winnerTeam] + 1,
        }
        
        // Check if hand is complete (5 tricks)
        const totalTricks = newTricksWon.SouthNorth + newTricksWon.WestEast
        
        if (totalTricks === 5) {
          // Hand complete - calculate score
          const makerTeam = getTeam(prevState.maker)
          const makerTricks = newTricksWon[makerTeam]
          const wentAlone = !!alonePlayer
          
          let points = 0
          let message = ''
          
          if (makerTricks >= 3 && makerTricks < 5) {
            points = 1
            message = `${makerTeam} made trump and won (1 point)`
          } else if (makerTricks === 5 && !wentAlone) {
            points = 2
            message = `${makerTeam} marched (2 points)!`
          } else if (makerTricks === 5 && wentAlone) {
            points = 4
            message = `${alonePlayer} marched alone (4 points)!`
          } else {
            // Euchred
            const defenderTeam = makerTeam === 'SouthNorth' ? 'WestEast' : 'SouthNorth'
            const newScore = {
              ...prevState.score,
              [defenderTeam]: prevState.score[defenderTeam] + 2,
            }
            
            // Check for game over
            if (newScore[defenderTeam] >= 10) {
              return {
                ...prevState,
                hands: newHands,
                currentTrick: newTrick,
                trickWinner: winner.position,
                tricksWon: newTricksWon,
                score: newScore,
                phase: 'game_over',
                message: `${defenderTeam} wins the game! (Euchred for 2 points)`,
              }
            }
            
            return {
              ...prevState,
              hands: newHands,
              currentTrick: newTrick,
              trickWinner: winner.position,
              tricksWon: newTricksWon,
              score: newScore,
              phase: 'hand_complete',
              message: `${makerTeam} was euchred! ${defenderTeam} gets 2 points`,
            }
          }
          
          const newScore = {
            ...prevState.score,
            [makerTeam]: prevState.score[makerTeam] + points,
          }
          
          // Check for game over
          if (newScore[makerTeam] >= 10 || newScore[makerTeam === 'SouthNorth' ? 'WestEast' : 'SouthNorth'] >= 10) {
            return {
              ...prevState,
              hands: newHands,
              currentTrick: newTrick,
              trickWinner: winner.position,
              tricksWon: newTricksWon,
              score: newScore,
              phase: 'game_over',
              message: `${newScore.SouthNorth >= 10 ? 'South-North' : 'West-East'} wins the game!`,
            }
          }
          
          return {
            ...prevState,
            hands: newHands,
            currentTrick: newTrick,
            trickWinner: winner.position,
            tricksWon: newTricksWon,
            score: newScore,
            phase: 'hand_complete',
            message,
          }
        }
        
        return {
          ...prevState,
          hands: newHands,
          currentTrick: newTrick,
          trickWinner: winner.position,
          tricksWon: newTricksWon,
          leadSuit: null,
          phase: 'trick_complete',
          message: `${winner.position} won the trick`,
        }
      } else {
        // Continue trick
        let nextPlayer = advanceToNextPlayer(currentPlayer)
        
        // Skip alone player's partner
        if (alonePlayer) {
          const aloneIndex = POSITIONS.indexOf(alonePlayer)
          const partnerIndex = (aloneIndex + 2) % 4
          const nextIndex = POSITIONS.indexOf(nextPlayer)
          if (nextIndex === partnerIndex) {
            nextPlayer = advanceToNextPlayer(nextPlayer)
          }
        }
        
        return {
          ...prevState,
          hands: newHands,
          currentTrick: newTrick,
          leadSuit: newLeadSuit,
          currentPlayer: nextPlayer,
        }
      }
    })
  }, [advanceToNextPlayer, getTeam])
  
  const handleContinueAfterTrick = useCallback(() => {
    setState(prevState => {
      return {
        ...prevState,
        phase: 'playing',
        currentPlayer: prevState.trickWinner,
        currentTrick: [],
        leadSuit: null,
      }
    })
  }, [])
  
  const handleNewHand = useCallback(() => {
    setState(prevState => {
      const newState = initState()
      return {
        ...newState,
        score: prevState.score,
        dealer: advanceToNextPlayer(prevState.dealer),
      }
    })
  }, [advanceToNextPlayer])
  
  const handleNewGame = useCallback(() => {
    setState(initState())
  }, [])
  
  // Render helpers
  const renderCard = (card, onClick, isUpCard = false) => {
    if (!card) return null
    
    const isRed = card.suit === '♥' || card.suit === '♦'
    const color = isRed ? '#ef4444' : '#1f2937'
    
    return (
      <div
        onClick={onClick}
        className={`inline-block px-3 py-2 rounded-lg border-2 text-center font-bold cursor-pointer transition-all hover:scale-105 ${
          onClick ? 'hover:shadow-lg' : ''
        } ${isUpCard ? 'ring-2 ring-yellow-400' : ''}`}
        style={{
          backgroundColor: 'white',
          borderColor: '#d1d5db',
          color,
          minWidth: '60px',
        }}
      >
        <div style={{ fontSize: '1.2rem' }}>{card.rank}</div>
        <div style={{ fontSize: '1.5rem' }}>{card.suit}</div>
      </div>
    )
  }
  
  const canPlayCard = (card) => {
    if (state.phase !== 'playing') return false
    if (state.currentPlayer !== 'South') return false
    
    const validCards = getValidCards(state.hands.South, state.leadSuit, state.trump)
    return validCards.some(c => c.suit === card.suit && c.rank === card.rank)
  }
  
  const canDealerDiscard = (card) => {
    return state.phase === 'dealer_discard' && 
           state.currentPlayer === 'South' && 
           state.dealer === 'South'
  }
  
  // Render
  const { phase, hands, upCard, trump, currentPlayer, bidRound, currentTrick, score, tricksWon, message } = state
  
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">♠ Euchre ♥</h1>
        <div className="flex justify-center gap-8 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">South-North</div>
            <div className="text-3xl font-bold">{score.SouthNorth}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">West-East</div>
            <div className="text-3xl font-bold">{score.WestEast}</div>
          </div>
        </div>
        {trump && (
          <div className="text-lg mb-2">
            Trump: <span className="font-bold text-2xl">{trump}</span>
          </div>
        )}
        {message && (
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
            {message}
          </div>
        )}
      </div>
      
      {/* Game board */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* West */}
        <div className="col-start-1 row-start-2 flex flex-col items-center justify-center">
          <div className="text-sm font-medium mb-2">
            West {currentPlayer === 'West' && '👈'}
          </div>
          <div className="text-xs text-gray-500 mb-1">{hands.West.length} cards</div>
          <div className="text-sm">Tricks: {tricksWon.WestEast}</div>
        </div>
        
        {/* North */}
        <div className="col-start-2 row-start-1 flex flex-col items-center">
          <div className="text-sm font-medium mb-2">
            North {currentPlayer === 'North' && '👆'}
          </div>
          <div className="text-xs text-gray-500 mb-1">{hands.North.length} cards</div>
          <div className="text-sm">Tricks: {tricksWon.SouthNorth}</div>
        </div>
        
        {/* Center - Current trick and up card */}
        <div className="col-start-2 row-start-2 flex flex-col items-center justify-center min-h-[200px] border-2 border-gray-300 dark:border-gray-600 rounded-lg p-4">
          {phase === 'bidding' && upCard && (
            <div className="text-center">
              <div className="text-sm mb-2">Up Card:</div>
              {renderCard(upCard, null, true)}
            </div>
          )}
          
          {currentTrick.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              {currentTrick.map((play, i) => (
                <div key={i} className="text-center">
                  <div className="text-xs mb-1">{play.position}</div>
                  {renderCard(play.card)}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* East */}
        <div className="col-start-3 row-start-2 flex flex-col items-center justify-center">
          <div className="text-sm font-medium mb-2">
            East {currentPlayer === 'East' && '👉'}
          </div>
          <div className="text-xs text-gray-500 mb-1">{hands.East.length} cards</div>
          <div className="text-sm">Tricks: {tricksWon.WestEast}</div>
        </div>
        
        {/* South (Player) */}
        <div className="col-start-2 row-start-3 flex flex-col items-center">
          <div className="text-sm font-medium mb-2">
            You {currentPlayer === 'South' && '(Your turn)'}
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
            {hands.South.map((card, i) => {
              const playable = canPlayCard(card)
              const discardable = canDealerDiscard(card)
              return (
                <div key={i}>
                  {renderCard(
                    card,
                    playable ? () => handlePlayCard(card) : 
                    discardable ? () => handleDealerDiscard(card) : 
                    null
                  )}
                </div>
              )
            })}
          </div>
          <div className="text-sm mt-2">Tricks: {tricksWon.SouthNorth}</div>
        </div>
      </div>
      
      {/* Bidding controls */}
      {phase === 'bidding' && currentPlayer === 'South' && (
        <div className="flex justify-center gap-3 mb-4">
          {bidRound === 1 ? (
            <>
              <button
                onClick={() => handleBidDecision({ action: 'order_up', alone: false })}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Order Up
              </button>
              <button
                onClick={() => handleBidDecision({ action: 'order_up', alone: true })}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
              >
                Order Up (Alone)
              </button>
              <button
                onClick={() => handleBidDecision({ action: 'pass' })}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                Pass
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm mb-2">Call trump:</div>
              <div className="flex gap-2">
                {SUITS.filter(s => s !== upCard.suit).map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleBidDecision({ action: 'call', suit, alone: false })}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-2xl"
                  >
                    {suit}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handleBidDecision({ action: 'pass' })}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium mt-2"
              >
                Pass
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Dealer discard message */}
      {phase === 'dealer_discard' && currentPlayer === 'South' && (
        <div className="text-center mb-4">
          <div className="text-lg font-medium text-yellow-600 dark:text-yellow-400">
            Click a card to discard
          </div>
        </div>
      )}
      
      {/* Continue button after trick */}
      {phase === 'trick_complete' && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handleContinueAfterTrick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Continue
          </button>
        </div>
      )}
      
      {/* New hand button */}
      {phase === 'hand_complete' && (
        <div className="flex justify-center mb-4">
          <button
            onClick={handleNewHand}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Deal Next Hand
          </button>
        </div>
      )}
      
      {/* Game over */}
      {phase === 'game_over' && (
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg"
          >
            New Game
          </button>
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
        <h3 className="font-bold mb-2">How to Play:</h3>
        <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
          <li>You are South, partnered with North against West and East</li>
          <li>In bidding: Order up the face-up card or pass. Second round: call any other suit</li>
          <li>Dealer must pick up ordered-up card and discard one</li>
          <li>Right bower (J of trump) is highest, then left bower (J of same color)</li>
          <li>Must follow lead suit if possible</li>
          <li>First team to 10 points wins</li>
          <li>Making trump and taking 3-4 tricks = 1 point, all 5 = 2 points (4 if alone)</li>
          <li>Getting euchred (making trump but taking &lt;3 tricks) = 2 points to opponents</li>
        </ul>
      </div>
    </div>
  )
}
