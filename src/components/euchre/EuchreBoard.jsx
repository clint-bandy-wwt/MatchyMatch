import { useState, useEffect, useCallback } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['9', '10', 'J', 'Q', 'K', 'A']
const POSITIONS = ['South', 'West', 'North', 'East']

// Create 24-card Euchre deck
function createDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

// Shuffle array in place
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

// Get card power for trick evaluation
function getCardPower(card, trump, leadSuit) {
  const { rank, suit } = card
  
  // Right bower (Jack of trump)
  if (rank === 'J' && suit === trump) return 100
  
  // Left bower (Jack of same color as trump)
  const leftBowerSuit = getLeftBowerSuit(trump)
  if (rank === 'J' && suit === leftBowerSuit) return 99
  
  // Trump cards
  if (suit === trump) {
    const trumpOrder = ['9', '10', 'Q', 'K', 'A']
    return 50 + trumpOrder.indexOf(rank)
  }
  
  // Lead suit cards (if not trump)
  if (suit === leadSuit) {
    const regularOrder = ['9', '10', 'J', 'Q', 'K', 'A']
    return 10 + regularOrder.indexOf(rank)
  }
  
  // Other cards have no value
  return 0
}

// Get the suit of the left bower (same color as trump)
function getLeftBowerSuit(trump) {
  if (trump === '♠') return '♣'
  if (trump === '♣') return '♠'
  if (trump === '♥') return '♦'
  if (trump === '♦') return '♥'
  return null
}

// Get effective suit of a card (Jack of left bower suit counts as trump)
function getEffectiveSuit(card, trump) {
  if (card.rank === 'J' && card.suit === getLeftBowerSuit(trump)) {
    return trump
  }
  return card.suit
}

// Check if player can follow suit
function canFollowSuit(hand, leadSuit, trump) {
  return hand.some(card => getEffectiveSuit(card, trump) === leadSuit)
}

// Check if card is legal to play
function isLegalPlay(card, hand, leadSuit, trump) {
  if (leadSuit === null) return true // First card can be anything
  
  const cardSuit = getEffectiveSuit(card, trump)
  if (cardSuit === leadSuit) return true
  
  // Can play anything if can't follow suit
  return !canFollowSuit(hand, leadSuit, trump)
}

// Simple AI for bidding
function aiShouldOrder(hand, upcard, position, dealer) {
  // Count trump and high cards
  let trumpCount = 0
  let bowers = 0
  
  const trump = upcard.suit
  const leftBower = getLeftBowerSuit(trump)
  
  for (const card of hand) {
    if (card.rank === 'J' && card.suit === trump) bowers++
    if (card.rank === 'J' && card.suit === leftBower) bowers++
    if (card.suit === trump) trumpCount++
  }
  
  // Dealer has advantage (gets upcard)
  const isDealer = position === dealer
  
  // Order up with 2+ trump including a bower, or 3+ trump
  if (bowers > 0 && trumpCount >= 2) return true
  if (trumpCount >= 3 && isDealer) return true
  
  return false
}

// Simple AI for calling trump (round 2)
function aiShouldCall(hand) {
  const suitCounts = { '♠': 0, '♥': 0, '♦': 0, '♣': 0 }
  let bestSuit = null
  let bestScore = 0
  
  for (const card of hand) {
    suitCounts[card.suit]++
    
    // Score suits
    let score = suitCounts[card.suit]
    if (card.rank === 'J') score += 3
    if (card.rank === 'A') score += 2
    if (card.rank === 'K') score += 1
    
    if (score > bestScore) {
      bestScore = score
      bestSuit = card.suit
    }
  }
  
  // Call with 2+ cards in a suit
  if (suitCounts[bestSuit] >= 2 && bestScore >= 4) {
    return bestSuit
  }
  
  return null
}

// Simple AI for playing cards
function aiPlayCard(hand, currentTrick, trump, leadSuit) {
  const legalCards = hand.filter(card => isLegalPlay(card, hand, leadSuit, trump))
  
  if (legalCards.length === 0) return hand[0]
  
  if (currentTrick.length === 0) {
    // Lead with highest trump if we have it
    const trumpCards = legalCards.filter(c => getEffectiveSuit(c, trump) === trump)
    if (trumpCards.length > 0) {
      return trumpCards.reduce((best, card) => 
        getCardPower(card, trump, trump) > getCardPower(best, trump, trump) ? card : best
      )
    }
    // Otherwise lead with highest card
    return legalCards.reduce((best, card) => 
      getCardPower(card, trump, leadSuit) > getCardPower(best, trump, leadSuit) ? card : best
    )
  }
  
  // Try to win the trick if possible
  const winningCard = currentTrick.reduce((best, play) => 
    getCardPower(play.card, trump, leadSuit) > getCardPower(best.card, trump, leadSuit) ? play : best
  )
  const winningPower = getCardPower(winningCard.card, trump, leadSuit)
  
  const canWin = legalCards.filter(c => getCardPower(c, trump, leadSuit) > winningPower)
  if (canWin.length > 0) {
    // Play lowest card that wins
    return canWin.reduce((best, card) => 
      getCardPower(card, trump, leadSuit) < getCardPower(best, trump, leadSuit) ? card : best
    )
  }
  
  // Can't win, play lowest card
  return legalCards.reduce((best, card) => 
    getCardPower(card, trump, leadSuit) < getCardPower(best, trump, leadSuit) ? card : best
  )
}

// Initialize game state
function initGame() {
  return {
    status: 'deal', // deal, bid1, bid2, play, trick-end, hand-end, game-over
    dealer: 0, // 0=South, 1=West, 2=North, 3=East
    hands: [[], [], [], []],
    upcard: null,
    trump: null,
    maker: null, // Who called trump
    goingAlone: false,
    currentPlayer: 0,
    currentTrick: [],
    leadSuit: null,
    tricksWon: [0, 0], // [NS team, EW team]
    score: [0, 0], // [NS team, EW team]
    bidRound: 1, // 1 or 2
    passCount: 0,
    message: '',
    trickWinner: null,
  }
}

// Card component
function Card({ card, onClick, playable, faceDown, small }) {
  const isRed = card && (card.suit === '♥' || card.suit === '♦')
  const scale = small ? 0.8 : 1
  
  return (
    <div
      onClick={playable ? onClick : undefined}
      className={`inline-flex items-center justify-center ${playable ? 'cursor-pointer hover:scale-110' : ''} transition-transform`}
      style={{
        width: `${60 * scale}px`,
        height: `${84 * scale}px`,
        backgroundColor: faceDown ? '#2a5298' : '#fff',
        border: '2px solid #333',
        borderRadius: '6px',
        fontSize: `${20 * scale}px`,
        fontWeight: 'bold',
        color: faceDown ? '#fff' : (isRed ? '#dc2626' : '#000'),
        boxShadow: playable ? '0 4px 6px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.2)',
      }}
    >
      {faceDown ? (
        <div style={{ fontSize: `${28 * scale}px` }}>🃏</div>
      ) : (
        <div className="flex flex-col items-center">
          <div>{card.rank}</div>
          <div style={{ fontSize: `${24 * scale}px`, marginTop: '-4px' }}>{card.suit}</div>
        </div>
      )}
    </div>
  )
}

export default function EuchreBoard() {
  const [game, setGame] = useState(initGame)

  // Deal cards
  const dealCards = useCallback(() => {
    const deck = shuffle(createDeck())
    const hands = [[], [], [], []]
    
    // Deal 5 cards to each player
    for (let i = 0; i < 5; i++) {
      for (let p = 0; p < 4; p++) {
        hands[p].push(deck.pop())
      }
    }
    
    const upcard = deck.pop()
    const firstBidder = (game.dealer + 1) % 4
    
    setGame(g => ({
      ...g,
      hands,
      upcard,
      currentPlayer: firstBidder,
      status: 'bid1',
      bidRound: 1,
      passCount: 0,
      trump: null,
      maker: null,
      goingAlone: false,
      currentTrick: [],
      leadSuit: null,
      tricksWon: [0, 0],
      message: 'Round 1: Order up or pass?',
    }))
  }, [game.dealer])

  // Handle ordering up the upcard
  const orderUp = useCallback((goAlone = false) => {
    const trump = game.upcard.suit
    const newHands = [...game.hands]
    
    // Dealer picks up the upcard
    newHands[game.dealer].push(game.upcard)
    
    const firstPlayer = (game.dealer + 1) % 4
    
    setGame(g => ({
      ...g,
      hands: newHands,
      trump,
      maker: g.currentPlayer,
      goingAlone: goAlone,
      status: goAlone ? 'discard' : (game.dealer === 0 ? 'discard' : 'play'),
      currentPlayer: game.dealer === 0 ? 0 : firstPlayer,
      message: goAlone ? 'Going alone! Dealer, discard a card.' : (game.dealer === 0 ? 'Discard a card.' : ''),
      upcard: null,
    }))
  }, [game])

  // Handle passing in bidding
  const passBid = useCallback(() => {
    const nextPlayer = (game.currentPlayer + 1) % 4
    const newPassCount = game.passCount + 1
    
    if (game.bidRound === 1 && newPassCount === 4) {
      // All passed round 1, go to round 2
      const firstBidder = (game.dealer + 1) % 4
      setGame(g => ({
        ...g,
        bidRound: 2,
        passCount: 0,
        currentPlayer: firstBidder,
        message: 'Round 2: Call a suit or pass?',
      }))
    } else if (game.bidRound === 2 && newPassCount === 4) {
      // All passed round 2, redeal
      setGame(g => ({
        ...g,
        message: 'All passed. Redealing...',
      }))
      setTimeout(() => {
        dealCards()
      }, 1500)
    } else {
      setGame(g => ({
        ...g,
        currentPlayer: nextPlayer,
        passCount: newPassCount,
      }))
    }
  }, [game, dealCards])

  // Handle calling trump (round 2)
  const callTrump = useCallback((suit, goAlone = false) => {
    const firstPlayer = (game.dealer + 1) % 4
    
    setGame(g => ({
      ...g,
      trump: suit,
      maker: g.currentPlayer,
      goingAlone: goAlone,
      status: 'play',
      currentPlayer: firstPlayer,
      message: goAlone ? `${POSITIONS[g.currentPlayer]} called ${suit} and is going alone!` : `${POSITIONS[g.currentPlayer]} called ${suit} as trump.`,
    }))
  }, [game])

  // Handle dealer discarding after picking up
  const discardCard = useCallback((card) => {
    const newHands = [...game.hands]
    const dealerHand = newHands[game.dealer]
    const idx = dealerHand.findIndex(c => c.rank === card.rank && c.suit === card.suit)
    if (idx >= 0) {
      dealerHand.splice(idx, 1)
    }
    
    const firstPlayer = (game.dealer + 1) % 4
    
    setGame(g => ({
      ...g,
      hands: newHands,
      status: 'play',
      currentPlayer: firstPlayer,
      message: '',
    }))
  }, [game])

  // Handle playing a card
  const playCard = useCallback((card) => {
    const hand = game.hands[game.currentPlayer]
    if (!isLegalPlay(card, hand, game.leadSuit, game.trump)) {
      setGame(g => ({ ...g, message: 'Illegal play! Must follow suit.' }))
      return
    }
    
    const newHands = [...game.hands]
    const idx = newHands[game.currentPlayer].findIndex(c => c.rank === card.rank && c.suit === card.suit)
    if (idx >= 0) {
      newHands[game.currentPlayer].splice(idx, 1)
    }
    
    const newTrick = [
      ...game.currentTrick,
      { player: game.currentPlayer, card }
    ]
    
    const newLeadSuit = game.leadSuit || getEffectiveSuit(card, game.trump)
    
    // Skip partner if going alone
    let nextPlayer = (game.currentPlayer + 1) % 4
    if (game.goingAlone) {
      const alonePartner = (game.maker + 2) % 4
      if (nextPlayer === alonePartner) {
        nextPlayer = (nextPlayer + 1) % 4
      }
    }
    
    if (newTrick.length === (game.goingAlone ? 3 : 4)) {
      // Trick is complete
      const winner = newTrick.reduce((best, play) => 
        getCardPower(play.card, game.trump, newLeadSuit) > getCardPower(best.card, game.trump, newLeadSuit) ? play : best
      )
      
      const winnerTeam = winner.player % 2 // 0=NS, 1=EW
      const newTricksWon = [...game.tricksWon]
      newTricksWon[winnerTeam]++
      
      setGame(g => ({
        ...g,
        hands: newHands,
        currentTrick: newTrick,
        tricksWon: newTricksWon,
        trickWinner: winner.player,
        status: 'trick-end',
        message: `${POSITIONS[winner.player]} wins the trick!`,
      }))
      
      // Check if hand is over
      setTimeout(() => {
        if (newTricksWon[0] + newTricksWon[1] === 5) {
          // Hand is over, calculate score
          const makerTeam = game.maker % 2
          const makerTricks = newTricksWon[makerTeam]
          
          let points = 0
          if (makerTricks >= 3) {
            if (makerTricks === 5) {
              points = game.goingAlone ? 4 : 2 // March
            } else {
              points = 1 // Made it
            }
          } else {
            // Euchred! Defense scores 2
            const defenseTeam = (makerTeam + 1) % 2
            const newScore = [...game.score]
            newScore[defenseTeam] += 2
            
            setGame(g => ({
              ...g,
              score: newScore,
              status: 'hand-end',
              message: 'Euchred! Defense scores 2 points!',
            }))
            
            setTimeout(() => {
              if (newScore[0] >= 10 || newScore[1] >= 10) {
                setGame(g => ({ ...g, status: 'game-over' }))
              } else {
                setGame(g => ({
                  ...initGame(),
                  dealer: (g.dealer + 1) % 4,
                  score: newScore,
                }))
                setTimeout(() => dealCards(), 500)
              }
            }, 2500)
            return
          }
          
          const newScore = [...game.score]
          newScore[makerTeam] += points
          
          setGame(g => ({
            ...g,
            score: newScore,
            status: 'hand-end',
            message: `${POSITIONS[game.maker]}'s team scores ${points} point${points > 1 ? 's' : ''}!`,
          }))
          
          setTimeout(() => {
            if (newScore[0] >= 10 || newScore[1] >= 10) {
              setGame(g => ({ ...g, status: 'game-over' }))
            } else {
              setGame(g => ({
                ...initGame(),
                dealer: (g.dealer + 1) % 4,
                score: newScore,
              }))
              setTimeout(() => dealCards(), 500)
            }
          }, 2500)
        } else {
          // Continue with next trick
          setGame(g => ({
            ...g,
            currentTrick: [],
            leadSuit: null,
            currentPlayer: winner.player,
            status: 'play',
            message: '',
          }))
        }
      }, 2000)
    } else {
      setGame(g => ({
        ...g,
        hands: newHands,
        currentTrick: newTrick,
        leadSuit: newLeadSuit,
        currentPlayer: nextPlayer,
      }))
    }
  }, [game, dealCards])

  // AI players auto-play
  useEffect(() => {
    if (game.status === 'bid1' && game.currentPlayer !== 0) {
      const timer = setTimeout(() => {
        const hand = game.hands[game.currentPlayer]
        if (aiShouldOrder(hand, game.upcard, game.currentPlayer, game.dealer)) {
          orderUp(false)
        } else {
          passBid()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
    
    if (game.status === 'bid2' && game.currentPlayer !== 0) {
      const timer = setTimeout(() => {
        const hand = game.hands[game.currentPlayer]
        const turnedDown = game.upcard.suit
        const callSuit = aiShouldCall(hand)
        
        if (callSuit && callSuit !== turnedDown) {
          callTrump(callSuit, false)
        } else {
          passBid()
        }
      }, 1000)
      return () => clearTimeout(timer)
    }
    
    if (game.status === 'discard' && game.dealer !== 0) {
      const timer = setTimeout(() => {
        const hand = game.hands[game.dealer]
        // Discard lowest non-trump card
        const nonTrump = hand.filter(c => getEffectiveSuit(c, game.trump) !== game.trump)
        const toDiscard = nonTrump.length > 0 ? 
          nonTrump.reduce((worst, card) => 
            getCardPower(card, game.trump, null) < getCardPower(worst, game.trump, null) ? card : worst
          ) : hand[0]
        discardCard(toDiscard)
      }, 1000)
      return () => clearTimeout(timer)
    }
    
    if (game.status === 'play' && game.currentPlayer !== 0) {
      const timer = setTimeout(() => {
        const hand = game.hands[game.currentPlayer]
        const card = aiPlayCard(hand, game.currentTrick, game.trump, game.leadSuit)
        playCard(card)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [game.status, game.currentPlayer, game, orderUp, passBid, callTrump, discardCard, playCard])

  // Start new game
  const startNewGame = () => {
    setGame(initGame())
    setTimeout(() => dealCards(), 100)
  }

  // Render player hand
  const renderHand = (position) => {
    const idx = POSITIONS.indexOf(position)
    const hand = game.hands[idx]
    const isCurrentPlayer = game.currentPlayer === idx
    const canPlay = game.status === 'play' && isCurrentPlayer && idx === 0
    const canDiscard = game.status === 'discard' && idx === 0
    
    return (
      <div className="flex gap-2 flex-wrap justify-center">
        {hand.map((card, i) => {
          const playable = (canPlay && isLegalPlay(card, hand, game.leadSuit, game.trump)) || canDiscard
          return (
            <Card
              key={i}
              card={card}
              playable={playable}
              onClick={() => canPlay ? playCard(card) : canDiscard ? discardCard(card) : null}
              small={position !== 'South'}
            />
          )
        })}
        {hand.length === 0 && game.status !== 'deal' && (
          <div className="text-sm opacity-50">No cards</div>
        )}
      </div>
    )
  }

  // Render current trick
  const renderTrick = () => {
    if (game.currentTrick.length === 0) return null
    
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-4">
          {game.currentTrick.map((play, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Card card={play.card} />
              <div className="text-xs font-semibold">{POSITIONS[play.player]}</div>
            </div>
          ))}
        </div>
      </div>
    )
  }


  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Score and Info Bar */}
      <div className="flex justify-between items-center mb-4 p-4 rounded-lg bg-gradient-to-r from-green-800 to-green-900 text-white">
        <div className="flex gap-6">
          <div>
            <div className="text-xs uppercase tracking-wider opacity-75">North/South</div>
            <div className="text-3xl font-bold">{game.score[0]}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider opacity-75">East/West</div>
            <div className="text-3xl font-bold">{game.score[1]}</div>
          </div>
        </div>
        <div className="text-center">
          {game.trump && (
            <div>
              <div className="text-xs uppercase tracking-wider opacity-75">Trump</div>
              <div className="text-3xl">{game.trump}</div>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider opacity-75">Tricks Won</div>
          <div className="text-lg">{game.tricksWon[0]} - {game.tricksWon[1]}</div>
        </div>
      </div>

      {/* Message */}
      {game.message && (
        <div className="mb-4 p-3 rounded-lg bg-blue-100 text-blue-900 text-center font-semibold">
          {game.message}
        </div>
      )}

      {/* Game Area */}
      {game.status === 'deal' && (
        <div className="flex flex-col items-center gap-4 py-20">
          <div style={{ fontSize: 60 }}>🃏</div>
          <h2 className="text-3xl font-bold">Euchre</h2>
          <p className="text-gray-600 text-center max-w-md">
            Classic 4-player trick-taking game. You (South) partner with North against East and West.
            First team to 10 points wins!
          </p>
          <button
            onClick={startNewGame}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            Deal Cards
          </button>
        </div>
      )}

      {game.status === 'game-over' && (
        <div className="flex flex-col items-center gap-4 py-20">
          <div style={{ fontSize: 60 }}>🏆</div>
          <h2 className="text-3xl font-bold">Game Over!</h2>
          <p className="text-xl">
            {game.score[0] >= 10 ? 'North/South wins!' : 'East/West wins!'}
          </p>
          <div className="text-2xl font-bold">
            Final Score: {game.score[0]} - {game.score[1]}
          </div>
          <button
            onClick={startNewGame}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            New Game
          </button>
        </div>
      )}

      {(game.status === 'bid1' || game.status === 'bid2' || game.status === 'discard' || game.status === 'play' || game.status === 'trick-end' || game.status === 'hand-end') && (
        <div className="space-y-4">
          {/* North (AI) */}
          <div className="text-center">
            <div className="text-sm font-semibold mb-2 flex items-center justify-center gap-2">
              North {game.dealer === 2 && '(Dealer)'}
              {game.currentPlayer === 2 && <span className="text-green-600">●</span>}
            </div>
            {renderHand('North')}
          </div>

          {/* Middle Area: West, Play Area, East */}
          <div className="grid grid-cols-3 gap-4 items-center" style={{ minHeight: '300px' }}>
            {/* West (AI) */}
            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                West {game.dealer === 1 && '(Dealer)'}
                {game.currentPlayer === 1 && <span className="text-green-600">●</span>}
              </div>
              {renderHand('West')}
            </div>

            {/* Center Play Area */}
            <div className="relative" style={{ minHeight: '250px' }}>
              {game.upcard && (game.status === 'bid1' || game.status === 'bid2') && (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm font-semibold">Upcard</div>
                  <Card card={game.upcard} />
                </div>
              )}
              {renderTrick()}
            </div>

            {/* East (AI) */}
            <div>
              <div className="text-sm font-semibold mb-2 flex items-center gap-2">
                East {game.dealer === 3 && '(Dealer)'}
                {game.currentPlayer === 3 && <span className="text-green-600">●</span>}
              </div>
              {renderHand('East')}
            </div>
          </div>

          {/* South (Human) */}
          <div className="text-center">
            <div className="text-sm font-semibold mb-2 flex items-center justify-center gap-2">
              South (You) {game.dealer === 0 && '(Dealer)'}
              {game.currentPlayer === 0 && <span className="text-green-600">●</span>}
            </div>
            {renderHand('South')}
          </div>

          {/* Bidding Controls */}
          {game.status === 'bid1' && game.currentPlayer === 0 && (
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => orderUp(false)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors"
              >
                Order Up
              </button>
              <button
                onClick={() => orderUp(true)}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white font-semibold rounded transition-colors"
              >
                Order Up (Alone)
              </button>
              <button
                onClick={passBid}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded transition-colors"
              >
                Pass
              </button>
            </div>
          )}

          {game.status === 'bid2' && game.currentPlayer === 0 && (
            <div className="flex gap-3 justify-center mt-4 flex-wrap">
              {SUITS.filter(s => s !== game.upcard.suit).map(suit => (
                <button
                  key={suit}
                  onClick={() => callTrump(suit, false)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded transition-colors"
                >
                  Call {suit}
                </button>
              ))}
              <button
                onClick={passBid}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded transition-colors"
              >
                Pass
              </button>
            </div>
          )}

          {game.status === 'discard' && game.currentPlayer === 0 && (
            <div className="text-center mt-4 p-3 rounded bg-yellow-100 text-yellow-900 font-semibold">
              Click a card to discard it
            </div>
          )}
        </div>
      )}
    </div>
  )
}
