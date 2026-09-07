import { useState, useEffect, useCallback, useRef } from 'react'

// ── Constants ────────────────────────────────────────────────────────────────

const SUITS = ['♠', '♥', '♣', '♦']
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

function shuffleDeck(deck) {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// Card value in trick-taking (trump suit aware)
function cardValue(card, trump, ledSuit) {
  const { rank, suit } = card
  const leftBowerSuit = trump === '♠' ? '♣' : trump === '♣' ? '♠' : trump === '♥' ? '♦' : '♥'
  
  // Right bower (J of trump) = highest
  if (rank === 'J' && suit === trump) return 1000
  
  // Left bower (J of same color) = second highest
  if (rank === 'J' && suit === leftBowerSuit) return 900
  
  // Other trump cards
  if (suit === trump) {
    const trumpValues = { 'A': 800, 'K': 700, 'Q': 600, '10': 500, '9': 400 }
    return trumpValues[rank] || 0
  }
  
  // Must follow suit
  if (ledSuit && suit !== ledSuit) return 0
  
  // Non-trump cards
  const normalValues = { 'A': 300, 'K': 200, 'Q': 150, 'J': 100, '10': 50, '9': 10 }
  return normalValues[rank] || 0
}

// Get effective suit (left bower counts as trump suit)
function effectiveSuit(card, trump) {
  const { rank, suit } = card
  const leftBowerSuit = trump === '♠' ? '♣' : trump === '♣' ? '♠' : trump === '♥' ? '♦' : '♥'
  if (rank === 'J' && suit === leftBowerSuit) return trump
  return suit
}

function canPlayCard(card, hand, ledSuit, trump) {
  if (!ledSuit) return true // Leading the trick
  
  const cardSuit = effectiveSuit(card, trump)
  
  // Must follow suit if possible
  const hasSuit = hand.some(c => effectiveSuit(c, trump) === ledSuit)
  if (!hasSuit) return true // Can't follow suit, can play anything
  
  return cardSuit === ledSuit
}

// Simple AI for bidding
function aiBid(hand, upcard, position, dealer, pass1) {
  // Count trump cards (including left bower)
  const trumpSuit = upcard.suit
  const leftBowerSuit = trumpSuit === '♠' ? '♣' : trumpSuit === '♣' ? '♠' : trumpSuit === '♥' ? '♦' : '♥'
  
  let trumpCount = hand.filter(c => 
    c.suit === trumpSuit || (c.rank === 'J' && c.suit === leftBowerSuit)
  ).length
  
  if (position === dealer) trumpCount++ // Dealer will pick up the upcard
  
  // Round 1: order up if 3+ trump
  if (!pass1) {
    return trumpCount >= 3 ? 'order' : 'pass'
  }
  
  // Round 2: call a suit if 3+ cards in that suit
  const suitCounts = {}
  for (const suit of SUITS) {
    if (suit === trumpSuit) continue
    const leftBower = suit === '♠' ? '♣' : suit === '♣' ? '♠' : suit === '♥' ? '♦' : '♥'
    suitCounts[suit] = hand.filter(c => 
      c.suit === suit || (c.rank === 'J' && c.suit === leftBower)
    ).length
  }
  
  const bestSuit = Object.entries(suitCounts).reduce((a, b) => b[1] > a[1] ? b : a, [null, 0])
  return bestSuit[1] >= 3 ? bestSuit[0] : 'pass'
}

// Simple AI for card play
function aiPlayCard(hand, trick, trump) {
  const ledSuit = trick.length > 0 ? effectiveSuit(trick[0].card, trump) : null
  const playable = hand.filter(c => canPlayCard(c, hand, ledSuit, trump))
  
  if (playable.length === 0) return hand[0]
  
  // If leading, play highest trump or highest card
  if (!ledSuit) {
    const trumpCards = playable.filter(c => effectiveSuit(c, trump) === trump)
    if (trumpCards.length > 0) {
      return trumpCards.reduce((a, b) => 
        cardValue(a, trump, null) > cardValue(b, trump, null) ? a : b
      )
    }
    return playable.reduce((a, b) => 
      cardValue(a, trump, null) > cardValue(b, trump, null) ? a : b
    )
  }
  
  // Try to win the trick
  const currentWinner = trick.reduce((best, curr) => 
    cardValue(curr.card, trump, ledSuit) > cardValue(best.card, trump, ledSuit) ? curr : best
  )
  
  const canWin = playable.filter(c => 
    cardValue(c, trump, ledSuit) > cardValue(currentWinner.card, trump, ledSuit)
  )
  
  if (canWin.length > 0) {
    // Play lowest winning card
    return canWin.reduce((a, b) => 
      cardValue(a, trump, ledSuit) < cardValue(b, trump, ledSuit) ? a : b
    )
  }
  
  // Can't win, play lowest card
  return playable.reduce((a, b) => 
    cardValue(a, trump, ledSuit) < cardValue(b, trump, ledSuit) ? a : b
  )
}

function initGame() {
  const deck = shuffleDeck(createDeck())
  const hands = {
    South: deck.slice(0, 5),
    West: deck.slice(5, 10),
    North: deck.slice(10, 15),
    East: deck.slice(15, 20),
  }
  const upcard = deck[20]
  
  return {
    phase: 'bid1', // bid1, bid2, discard, play, trickEnd, handEnd
    hands,
    upcard,
    trump: null,
    maker: null,
    dealer: 0, // index in POSITIONS
    currentPlayer: 1, // West starts bidding (left of dealer)
    trick: [],
    tricksWon: { NS: 0, EW: 0 },
    score: { NS: 0, EW: 0 },
    passes: 0,
    goingAlone: false,
    alonePlayer: null,
    message: '',
    handNumber: 1,
  }
}

export default function EuchreBoard() {
  const [game, setGame] = useState(initGame)
  const aiTimerRef = useRef(null)
  
  const currentPosition = POSITIONS[game.currentPlayer]
  const isHumanTurn = currentPosition === 'South'
  const dealerPosition = POSITIONS[game.dealer]
  
  // Clear AI timer on unmount
  useEffect(() => {
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [])
  
  const handleBid = useCallback((action) => {
    setGame(prev => {
      const next = { ...prev, passes: action === 'pass' ? prev.passes + 1 : 0 }
      
      if (action === 'order') {
        // Upcard suit becomes trump
        next.trump = prev.upcard.suit
        next.maker = currentPosition
        next.message = `${currentPosition} orders up ${prev.upcard.rank}${prev.upcard.suit}`
        
        // Dealer picks up the upcard
        if (dealerPosition === 'South') {
          // Human dealer must discard
          next.phase = 'discard'
          next.currentPlayer = prev.dealer
          next.hands = {
            ...prev.hands,
            South: [...prev.hands.South, prev.upcard]
          }
        } else {
          // AI dealer picks up upcard and discards automatically
          const dealerHand = [...prev.hands[dealerPosition], prev.upcard]
          // Discard lowest non-trump
          const nonTrump = dealerHand.filter(c => effectiveSuit(c, next.trump) !== next.trump)
          const toDiscard = nonTrump.length > 0 
            ? nonTrump.reduce((a, b) => cardValue(a, next.trump, null) < cardValue(b, next.trump, null) ? a : b)
            : dealerHand.reduce((a, b) => cardValue(a, next.trump, null) < cardValue(b, next.trump, null) ? a : b)
          
          next.hands = {
            ...prev.hands,
            [dealerPosition]: dealerHand.filter(c => c !== toDiscard)
          }
          next.phase = 'play'
          next.currentPlayer = (prev.dealer + 1) % 4 // Left of dealer leads
        }
      } else {
        // Pass
        next.currentPlayer = (prev.currentPlayer + 1) % 4
        
        // All 4 passed in round 1?
        if (next.passes === 4) {
          next.phase = 'bid2'
          next.currentPlayer = (prev.dealer + 1) % 4 // Left of dealer starts round 2
          next.passes = 0
          next.message = 'Round 2 bidding - call a suit'
        }
      }
      
      return next
    })
  }, [currentPosition, dealerPosition])
  
  const handleCallSuit = useCallback((suit) => {
    setGame(prev => {
      const next = { ...prev }
      next.trump = suit
      next.maker = currentPosition
      next.message = `${currentPosition} calls ${suit}`
      next.phase = 'play'
      next.currentPlayer = (prev.dealer + 1) % 4 // Left of dealer leads
      return next
    })
  }, [currentPosition])
  
  const handleDiscard = useCallback((card) => {
    setGame(prev => {
      const next = { ...prev }
      next.hands = {
        ...prev.hands,
        South: prev.hands.South.filter(c => c !== card)
      }
      next.phase = 'play'
      next.currentPlayer = (prev.dealer + 1) % 4
      next.message = `${dealerPosition} discards and play begins`
      return next
    })
  }, [dealerPosition])
  
  const handlePlayCard = useCallback((card, position) => {
    setGame(prev => {
      const next = { ...prev }
      const pos = position || 'South'
      
      // Remove card from hand
      next.hands = {
        ...prev.hands,
        [pos]: prev.hands[pos].filter(c => c !== card)
      }
      
      // Add to trick
      next.trick = [...prev.trick, { card, position: pos }]
      
      // Check if trick is complete
      if (next.trick.length === 4) {
        // Determine winner
        const ledSuit = effectiveSuit(next.trick[0].card, prev.trump)
        const winner = next.trick.reduce((best, curr) => 
          cardValue(curr.card, prev.trump, ledSuit) > cardValue(best.card, prev.trump, ledSuit) ? curr : best
        )
        
        const winnerPos = winner.position
        const winnerTeam = (winnerPos === 'North' || winnerPos === 'South') ? 'NS' : 'EW'
        
        next.tricksWon = { ...prev.tricksWon, [winnerTeam]: prev.tricksWon[winnerTeam] + 1 }
        next.message = `${winnerPos} wins the trick`
        next.phase = 'trickEnd'
        next.currentPlayer = POSITIONS.indexOf(winnerPos)
        
        // Check if hand is over (all 5 tricks played)
        if (next.tricksWon.NS + next.tricksWon.EW === 5) {
          const makerTeam = (next.maker === 'North' || next.maker === 'South') ? 'NS' : 'EW'
          const makerTricks = next.tricksWon[makerTeam]
          
          let points = 0
          if (makerTricks === 5) {
            points = 2 // March
          } else if (makerTricks >= 3) {
            points = 1 // Made it
          } else {
            // Euchred
            points = -2
            const otherTeam = makerTeam === 'NS' ? 'EW' : 'NS'
            next.score = { ...prev.score, [otherTeam]: prev.score[otherTeam] + 2 }
            next.message = `${next.maker} euchred! ${otherTeam} gets 2 points`
          }
          
          if (points > 0) {
            next.score = { ...prev.score, [makerTeam]: prev.score[makerTeam] + points }
            next.message = `${makerTeam} wins ${points} point${points > 1 ? 's' : ''}`
          }
          
          next.phase = 'handEnd'
          
          // Check for game over
          if (next.score.NS >= 10 || next.score.EW >= 10) {
            const winner = next.score.NS >= 10 ? 'North/South' : 'East/West'
            next.message = `Game Over! ${winner} wins ${next.score.NS} - ${next.score.EW}`
          }
        }
        
        return next
      }
      
      // Next player's turn
      next.currentPlayer = (prev.currentPlayer + 1) % 4
      return next
    })
  }, [])
  
  // AI turns
  useEffect(() => {
    if (game.phase === 'bid1' && !isHumanTurn) {
      aiTimerRef.current = setTimeout(() => {
        const decision = aiBid(game.hands[currentPosition], game.upcard, currentPosition, dealerPosition, false)
        if (decision === 'order') {
          handleBid('order')
        } else {
          handleBid('pass')
        }
      }, 1000)
    } else if (game.phase === 'bid2' && !isHumanTurn) {
      aiTimerRef.current = setTimeout(() => {
        const decision = aiBid(game.hands[currentPosition], game.upcard, currentPosition, dealerPosition, true)
        if (decision === 'pass') {
          handleBid('pass')
        } else {
          handleCallSuit(decision)
        }
      }, 1000)
    } else if (game.phase === 'play' && !isHumanTurn) {
      aiTimerRef.current = setTimeout(() => {
        const card = aiPlayCard(game.hands[currentPosition], game.trick, game.trump)
        handlePlayCard(card, currentPosition)
      }, 1000)
    }
    
    return () => {
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
    }
  }, [game.phase, game.currentPlayer, isHumanTurn, game.hands, game.upcard, game.trick, game.trump, 
      currentPosition, dealerPosition, handleBid, handleCallSuit, handlePlayCard])
  
  const handleTrickEndContinue = useCallback(() => {
    setGame(prev => {
      const next = { ...prev }
      next.trick = []
      next.phase = 'play'
      // currentPlayer already set to trick winner
      return next
    })
  }, [])
  
  const handleNextHand = useCallback(() => {
    setGame(prev => {
      const deck = shuffleDeck(createDeck())
      const hands = {
        South: deck.slice(0, 5),
        West: deck.slice(5, 10),
        North: deck.slice(10, 15),
        East: deck.slice(15, 20),
      }
      const upcard = deck[20]
      const newDealer = (prev.dealer + 1) % 4
      
      return {
        ...prev,
        phase: 'bid1',
        hands,
        upcard,
        trump: null,
        maker: null,
        dealer: newDealer,
        currentPlayer: (newDealer + 1) % 4,
        trick: [],
        tricksWon: { NS: 0, EW: 0 },
        passes: 0,
        message: '',
        handNumber: prev.handNumber + 1,
      }
    })
  }, [])
  
  const handleNewGame = useCallback(() => {
    setGame(initGame())
  }, [])
  
  const renderCard = (card, onClick, disabled = false, faceDown = false, key = null) => {
    const isRed = card.suit === '♥' || card.suit === '♦'
    
    return (
      <button
        key={key}
        onClick={onClick}
        disabled={disabled}
        className="card"
        style={{
          width: 70,
          height: 100,
          border: '2px solid #333',
          borderRadius: 8,
          background: faceDown ? '#1e40af' : 'white',
          color: faceDown ? 'transparent' : isRed ? '#dc2626' : '#000',
          fontSize: faceDown ? 0 : 24,
          fontWeight: 'bold',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'transform 0.1s',
          ...(onClick && !disabled ? { ':hover': { transform: 'translateY(-4px)' } } : {})
        }}
      >
        {!faceDown && (
          <>
            <div>{card.rank}</div>
            <div>{card.suit}</div>
          </>
        )}
      </button>
    )
  }
  
  const isGameOver = game.score.NS >= 10 || game.score.EW >= 10
  
  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-5xl">
      {/* Header */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold">♠ Euchre ♥</h1>
        <div className="flex gap-8 text-lg font-semibold">
          <div>North/South: {game.score.NS}</div>
          <div>East/West: {game.score.EW}</div>
        </div>
        <div className="text-sm opacity-70">
          Hand {game.handNumber} • Dealer: {dealerPosition}
          {game.trump && ` • Trump: ${game.trump}`}
        </div>
      </div>
      
      {/* Message */}
      {game.message && (
        <div className="text-center text-lg font-semibold px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded">
          {game.message}
        </div>
      )}
      
      {/* Game Over */}
      {isGameOver && (
        <div className="flex flex-col items-center gap-4 p-6 bg-green-100 dark:bg-green-900 rounded-lg">
          <div className="text-2xl font-bold">
            {game.score.NS >= 10 ? 'North/South Wins!' : 'East/West Wins!'}
          </div>
          <div className="text-xl">
            Final Score: {game.score.NS} - {game.score.EW}
          </div>
          <button onClick={handleNewGame} className="btn-primary">
            New Game
          </button>
        </div>
      )}
      
      {/* Bidding Phase */}
      {!isGameOver && (game.phase === 'bid1' || game.phase === 'bid2') && (
        <div className="flex flex-col items-center gap-4 p-6 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          {/* Show human hand during bidding */}
          <div className="flex flex-col items-center gap-2 mb-2">
            <div className="text-sm font-semibold">Your Hand:</div>
            <div className="flex gap-2">
              {game.hands.South.map((card, idx) => 
                renderCard(card, null, true, false, `bid-${idx}`)
              )}
            </div>
          </div>
          
          <div className="text-xl font-semibold">
            {game.phase === 'bid1' ? 'Round 1 Bidding' : 'Round 2 Bidding'}
          </div>
          {game.phase === 'bid1' && (
            <div className="flex flex-col items-center gap-2">
              <div>Upcard:</div>
              {renderCard(game.upcard, null, true)}
            </div>
          )}
          <div className="text-lg">
            {isHumanTurn ? 'Your turn' : `${currentPosition} is deciding...`}
          </div>
          
          {isHumanTurn && game.phase === 'bid1' && (
            <div className="flex gap-3">
              <button onClick={() => handleBid('order')} className="btn-primary">
                Order Up
              </button>
              <button onClick={() => handleBid('pass')} className="btn-ghost">
                Pass
              </button>
            </div>
          )}
          
          {isHumanTurn && game.phase === 'bid2' && (
            <div className="flex flex-col gap-3">
              <div>Call a suit:</div>
              <div className="flex gap-2">
                {SUITS.filter(s => s !== game.upcard.suit).map(suit => (
                  <button
                    key={suit}
                    onClick={() => handleCallSuit(suit)}
                    className="btn-primary"
                    style={{ fontSize: 24 }}
                  >
                    {suit}
                  </button>
                ))}
              </div>
              <button onClick={() => handleBid('pass')} className="btn-ghost">
                Pass
              </button>
            </div>
          )}
        </div>
      )}
      
      {/* Discard Phase */}
      {!isGameOver && game.phase === 'discard' && (
        <div className="flex flex-col items-center gap-4 p-6 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
          <div className="text-xl font-semibold">Dealer: Pick up and discard a card</div>
          <div className="flex gap-2">
            {game.hands.South.map((card, idx) => 
              renderCard(card, () => handleDiscard(card), false, false, `discard-${idx}`)
            )}
          </div>
        </div>
      )}
      
      {/* Play Area */}
      {!isGameOver && (game.phase === 'play' || game.phase === 'trickEnd' || game.phase === 'handEnd') && (
        <div className="flex flex-col items-center gap-6 w-full">
          {/* North (top) */}
          <div className="flex flex-col items-center gap-2">
            <div className="font-semibold">
              North {game.dealer === 2 && '(D)'}
              {game.currentPlayer === 2 && game.phase === 'play' && ' 👈'}
            </div>
            <div className="flex gap-1">
              {game.hands.North.map((_, i) => 
                <div key={i} style={{ width: 70, height: 100, border: '2px solid #333', borderRadius: 8, background: '#1e40af' }} />
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between w-full max-w-4xl">
            {/* West (left) */}
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold">
                West {game.dealer === 1 && '(D)'}
                {game.currentPlayer === 1 && game.phase === 'play' && ' 👈'}
              </div>
              <div className="flex gap-1">
                {game.hands.West.map((_, i) => 
                  <div key={i} style={{ width: 70, height: 100, border: '2px solid #333', borderRadius: 8, background: '#1e40af' }} />
                )}
              </div>
            </div>
            
            {/* Trick in center */}
            <div className="flex flex-col items-center gap-3">
              <div className="text-sm font-semibold">
                Tricks: NS {game.tricksWon.NS} - EW {game.tricksWon.EW}
              </div>
              <div className="relative" style={{ width: 280, height: 280, border: '2px solid #666', borderRadius: 12, background: '#166534' }}>
                {game.trick.map((play, i) => {
                  const positions = {
                    South: { bottom: 10, left: '50%', transform: 'translateX(-50%)' },
                    West: { top: '50%', left: 10, transform: 'translateY(-50%)' },
                    North: { top: 10, left: '50%', transform: 'translateX(-50%)' },
                    East: { top: '50%', right: 10, transform: 'translateY(-50%)' },
                  }
                  return (
                    <div key={i} style={{ position: 'absolute', ...positions[play.position] }}>
                      {renderCard(play.card, null, true, false, `trick-${i}`)}
                    </div>
                  )
                })}
              </div>
              
              {game.phase === 'trickEnd' && (
                <button onClick={handleTrickEndContinue} className="btn-primary">
                  Continue
                </button>
              )}
              
              {game.phase === 'handEnd' && !isGameOver && (
                <button onClick={handleNextHand} className="btn-primary">
                  Next Hand
                </button>
              )}
            </div>
            
            {/* East (right) */}
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold">
                East {game.dealer === 3 && '(D)'}
                {game.currentPlayer === 3 && game.phase === 'play' && ' 👈'}
              </div>
              <div className="flex gap-1">
                {game.hands.East.map((_, i) => 
                  <div key={i} style={{ width: 70, height: 100, border: '2px solid #333', borderRadius: 8, background: '#1e40af' }} />
                )}
              </div>
            </div>
          </div>
          
          {/* South (bottom - human player) */}
          <div className="flex flex-col items-center gap-2">
            <div className="font-semibold">
              South (You) {game.dealer === 0 && '(D)'}
              {game.currentPlayer === 0 && game.phase === 'play' && ' 👈'}
            </div>
            <div className="flex gap-2">
              {game.hands.South.map((card, idx) => {
                const ledSuit = game.trick.length > 0 ? effectiveSuit(game.trick[0].card, game.trump) : null
                const canPlay = isHumanTurn && game.phase === 'play' && canPlayCard(card, game.hands.South, ledSuit, game.trump)
                return renderCard(
                  card, 
                  canPlay ? () => handlePlayCard(card, 'South') : null,
                  !canPlay,
                  false,
                  `south-${idx}`
                )
              })}
            </div>
          </div>
        </div>
      )}
      
      {/* Instructions */}
      <div className="text-center text-sm opacity-70 max-w-2xl">
        <p>Euchre: 24-card trick-taking game. Teams North/South vs East/West. First to 10 points wins.</p>
        <p>Trump suit is chosen by bidding. Follow suit when able. Right bower (J♠ when ♠ is trump) is highest, left bower (J♣) is second.</p>
      </div>
    </div>
  )
}
