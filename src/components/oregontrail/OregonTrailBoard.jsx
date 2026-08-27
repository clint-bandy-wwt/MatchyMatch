import { useState, useEffect, useCallback, useRef } from 'react'
import './oregontrail.css'

const TOTAL_DISTANCE = 2000 // miles to Oregon
const STARTING_SUPPLIES = {
  food: 500,
  money: 400,
  oxen: 3,
  ammunition: 50,
  clothing: 5,
  parts: 3,
  medicine: 2
}

const PACE_SETTINGS = {
  steady: { speed: 8, foodConsumption: 3, exhaustionRate: 1, name: 'Steady' },
  strenuous: { speed: 12, foodConsumption: 5, exhaustionRate: 3, name: 'Strenuous' },
  grueling: { speed: 16, foodConsumption: 7, exhaustionRate: 5, name: 'Grueling' }
}

const RATION_SETTINGS = {
  filling: { foodConsumption: 3, healthBonus: 1, name: 'Filling' },
  meager: { foodConsumption: 2, healthBonus: 0, name: 'Meager' },
  barebones: { foodConsumption: 1, healthBonus: -1, name: 'Bare bones' }
}

const RIVERS = [
  { name: 'Kansas River', location: 102, depth: 2.5, width: 200 },
  { name: 'Big Blue River', location: 185, depth: 3.0, width: 250 },
  { name: 'Platte River', location: 450, depth: 1.5, width: 400 },
  { name: 'Green River', location: 1250, depth: 4.0, width: 300 },
  { name: 'Snake River', location: 1650, depth: 5.0, width: 350 }
]

const RANDOM_EVENTS = [
  { type: 'illness', message: 'Your party has contracted dysentery!', health: -20, chance: 0.15 },
  { type: 'illness', message: 'Someone broke their leg!', health: -15, chance: 0.1 },
  { type: 'oxLoss', message: 'An ox has died!', oxen: -1, chance: 0.08 },
  { type: 'theft', message: 'Thieves stole some supplies during the night!', food: -30, chance: 0.12 },
  { type: 'breakdown', message: 'Your wagon broke an axle!', parts: -1, money: -20, chance: 0.15 },
  { type: 'weather', message: 'A storm slowed your progress.', progress: -10, chance: 0.2 },
  { type: 'goodWeather', message: 'Perfect weather! You made great progress!', progress: 15, chance: 0.15 },
  { type: 'trade', message: 'You traded with friendly travelers!', food: 20, health: 5, chance: 0.1 },
  { type: 'find', message: 'You found abandoned supplies!', food: 25, ammunition: 10, chance: 0.08 }
]

export default function OregonTrailBoard() {
  const [gameState, setGameState] = useState('intro') // intro, playing, hunting, shop, river, gameover, victory
  const [distance, setDistance] = useState(0)
  const [supplies, setSupplies] = useState(STARTING_SUPPLIES)
  const [health, setHealth] = useState(100)
  const [pace, setPace] = useState('steady')
  const [rations, setRations] = useState('filling')
  const [day, setDay] = useState(1)
  const [message, setMessage] = useState('')
  const [eventLog, setEventLog] = useState([])
  const [crossedRivers, setCrossedRivers] = useState([])
  
  // Hunting mini-game state
  const [huntingTarget, setHuntingTarget] = useState(null)
  const [huntingScore, setHuntingScore] = useState(0)
  const [huntingTime, setHuntingTime] = useState(10)

  // Shop state
  const [shopSelection, setShopSelection] = useState({})
  const [shopMode, setShopMode] = useState('buy') // 'buy' or 'sell'
  
  // River crossing state
  const [currentRiver, setCurrentRiver] = useState(null)
  const [riverWeather, setRiverWeather] = useState('calm')
  
  // Ref to track if we've already logged game over
  const gameOverLoggedRef = useRef(false)

  const addLog = useCallback((msg) => {
    setEventLog(prev => [{ day, msg, id: Date.now() }, ...prev.slice(0, 9)])
  }, [day])

  const startGame = () => {
    setGameState('playing')
    gameOverLoggedRef.current = false
    addLog('Your journey on the Oregon Trail begins!')
  }

  const triggerRandomEvent = useCallback(() => {
    const roll = Math.random()
    let cumulative = 0
    
    for (const event of RANDOM_EVENTS) {
      cumulative += event.chance
      if (roll < cumulative) {
        addLog(event.message)
        setMessage(event.message)
        
        setSupplies(prev => ({
          ...prev,
          food: Math.max(0, prev.food + (event.food || 0)),
          oxen: Math.max(0, prev.oxen + (event.oxen || 0)),
          ammunition: Math.max(0, prev.ammunition + (event.ammunition || 0)),
          clothing: Math.max(0, prev.clothing + (event.clothing || 0)),
          parts: Math.max(0, prev.parts + (event.parts || 0)),
          medicine: Math.max(0, prev.medicine + (event.medicine || 0)),
          money: Math.max(0, prev.money + (event.money || 0))
        }))
        
        if (event.health) {
          setHealth(prev => Math.max(0, Math.min(100, prev + event.health)))
        }
        
        if (event.progress) {
          setDistance(prev => Math.max(0, Math.min(TOTAL_DISTANCE, prev + event.progress)))
        }
        
        setTimeout(() => setMessage(''), 3000)
        break
      }
    }
  }, [addLog])

  const checkForRiver = useCallback(() => {
    const uncrossedRiver = RIVERS.find(
      river => distance >= river.location && !crossedRivers.includes(river.name)
    )
    
    if (uncrossedRiver) {
      setCurrentRiver(uncrossedRiver)
      setRiverWeather(Math.random() < 0.3 ? 'rough' : 'calm')
      setGameState('river')
      addLog(`You have reached the ${uncrossedRiver.name}!`)
    }
  }, [distance, crossedRivers, addLog])

  const advanceDay = useCallback(() => {
    const currentPace = PACE_SETTINGS[pace]
    const currentRations = RATION_SETTINGS[rations]
    
    // Move forward
    const progress = currentPace.speed + (Math.random() * 4 - 2)
    setDistance(prev => Math.min(TOTAL_DISTANCE, prev + progress))
    
    // Consume food
    const foodUsed = currentRations.foodConsumption
    setSupplies(prev => ({
      ...prev,
      food: Math.max(0, prev.food - foodUsed)
    }))
    
    // Update health
    let healthChange = currentRations.healthBonus - (currentPace.exhaustionRate * 0.5)
    
    // Starvation penalty
    if (supplies.food <= 0) {
      healthChange -= 5
      addLog('Your party is starving!')
    }
    
    // No oxen penalty
    if (supplies.oxen <= 0) {
      healthChange -= 3
      addLog('Without oxen, travel is extremely difficult!')
    }
    
    setHealth(prev => Math.max(0, Math.min(100, prev + healthChange)))
    
    // Random events (20% chance per day)
    if (Math.random() < 0.2) {
      triggerRandomEvent()
    }
    
    setDay(prev => prev + 1)
  }, [pace, rations, supplies.food, supplies.oxen, triggerRandomEvent, addLog])

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return
    
    const timer = setInterval(() => {
      advanceDay()
    }, 2000) // Advance every 2 seconds
    
    return () => clearInterval(timer)
  }, [gameState, advanceDay])

  // Check for rivers after distance changes
  useEffect(() => {
    if (gameState === 'playing') {
      checkForRiver()
    }
  }, [distance, gameState, checkForRiver])

  const endHunting = useCallback(() => {
    const foodGained = Math.floor(huntingScore / 2)
    setSupplies(prev => ({ ...prev, food: prev.food + foodGained }))
    addLog(`You hunted ${foodGained} lbs of food!`)
    setGameState('playing')
  }, [huntingScore, addLog])

  // Check win/lose conditions
  useEffect(() => {
    if (gameState !== 'playing' || gameOverLoggedRef.current) return
    
    if (distance >= TOTAL_DISTANCE) {
      gameOverLoggedRef.current = true
      setTimeout(() => {
        addLog('You made it to Oregon!')
        setGameState('victory')
      }, 0)
    } else if (health <= 0) {
      gameOverLoggedRef.current = true
      setTimeout(() => {
        addLog('Your party has perished on the trail.')
        setGameState('gameover')
      }, 0)
    } else if (supplies.oxen <= 0 && Math.random() < 0.3) {
      gameOverLoggedRef.current = true
      setTimeout(() => {
        addLog('Without oxen, you cannot continue.')
        setGameState('gameover')
      }, 0)
    }
  }, [distance, health, supplies.oxen, gameState, addLog])

  // Hunting mini-game
  const startHunting = () => {
    if (supplies.ammunition < 5) {
      setMessage('Not enough ammunition!')
      setTimeout(() => setMessage(''), 2000)
      return
    }
    
    setGameState('hunting')
    setHuntingScore(0)
    setHuntingTime(10)
    spawnHuntingTarget()
  }

  const spawnHuntingTarget = () => {
    const animals = ['🦌', '🐇', '🦆', '🦬']
    const points = [50, 20, 15, 80]
    const idx = Math.floor(Math.random() * animals.length)
    
    setHuntingTarget({
      animal: animals[idx],
      points: points[idx],
      x: Math.random() * 80 + 10,
      y: Math.random() * 60 + 20
    })
  }

  const shootTarget = () => {
    if (!huntingTarget) return
    
    setHuntingScore(prev => prev + huntingTarget.points)
    setSupplies(prev => ({ ...prev, ammunition: prev.ammunition - 1 }))
    
    if (supplies.ammunition <= 1) {
      endHunting()
    } else {
      spawnHuntingTarget()
    }
  }

  useEffect(() => {
    if (gameState === 'hunting' && huntingTime > 0) {
      const timer = setInterval(() => {
        setHuntingTime(prev => {
          if (prev <= 1) {
            endHunting()
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [gameState, huntingTime, endHunting])

  const openShop = () => {
    setGameState('shop')
    setShopSelection({})
    setShopMode('buy')
  }

  const buyItems = () => {
    const prices = { food: 0.2, ammunition: 2, clothing: 10, parts: 20, oxen: 40, medicine: 25 }
    const cost = Object.entries(shopSelection).reduce((sum, [item, qty]) => {
      return sum + (prices[item] || 0) * qty
    }, 0)
    
    if (cost > supplies.money) {
      setMessage("You don't have enough money!")
      setTimeout(() => setMessage(''), 2000)
      return
    }
    
    setSupplies(prev => ({
      ...prev,
      money: prev.money - cost,
      food: prev.food + (shopSelection.food || 0),
      ammunition: prev.ammunition + (shopSelection.ammunition || 0),
      clothing: prev.clothing + (shopSelection.clothing || 0),
      parts: prev.parts + (shopSelection.parts || 0),
      oxen: prev.oxen + (shopSelection.oxen || 0),
      medicine: prev.medicine + (shopSelection.medicine || 0)
    }))
    
    addLog(`Spent $${cost.toFixed(2)} at the general store`)
    setGameState('playing')
  }

  const sellItems = () => {
    const prices = { food: 0.15, ammunition: 1.5, clothing: 7, parts: 15, medicine: 20 }
    const earnings = Object.entries(shopSelection).reduce((sum, [item, qty]) => {
      return sum + (prices[item] || 0) * qty
    }, 0)
    
    // Check if we have enough items to sell
    for (const [item, qty] of Object.entries(shopSelection)) {
      if (supplies[item] < qty) {
        setMessage(`You don't have enough ${item} to sell!`)
        setTimeout(() => setMessage(''), 2000)
        return
      }
    }
    
    setSupplies(prev => ({
      ...prev,
      money: prev.money + earnings,
      food: prev.food - (shopSelection.food || 0),
      ammunition: prev.ammunition - (shopSelection.ammunition || 0),
      clothing: prev.clothing - (shopSelection.clothing || 0),
      parts: prev.parts - (shopSelection.parts || 0),
      medicine: prev.medicine - (shopSelection.medicine || 0)
    }))
    
    addLog(`Earned $${earnings.toFixed(2)} by selling supplies`)
    setGameState('playing')
  }

  const crossRiver = (method) => {
    if (!currentRiver) return
    
    let success = true
    let losses = {}
    
    const weatherMultiplier = riverWeather === 'rough' ? 1.5 : 1.0
    
    switch (method) {
      case 'ford':
        // Risky but free
        const fordRisk = (currentRiver.depth / 5) * weatherMultiplier
        if (Math.random() < fordRisk) {
          success = false
          losses = {
            food: Math.floor(Math.random() * 50 + 20),
            clothing: Math.floor(Math.random() * 2),
            health: Math.floor(Math.random() * 30 + 10)
          }
          addLog(`Fording the ${currentRiver.name} went badly! You lost supplies and party members were injured.`)
        } else {
          addLog(`You successfully forded the ${currentRiver.name}!`)
        }
        break
        
      case 'caulk':
        // Medium risk, uses parts
        if (supplies.parts < 1) {
          setMessage('Not enough wagon parts to caulk the wagon!')
          setTimeout(() => setMessage(''), 2000)
          return
        }
        const caulkRisk = (currentRiver.depth / 8) * weatherMultiplier
        losses.parts = 1
        if (Math.random() < caulkRisk) {
          success = false
          losses = {
            ...losses,
            food: Math.floor(Math.random() * 30 + 10),
            health: Math.floor(Math.random() * 20 + 5)
          }
          addLog(`Caulking failed! The wagon took on water crossing the ${currentRiver.name}.`)
        } else {
          addLog(`You caulked the wagon and floated across the ${currentRiver.name}!`)
        }
        break
        
      case 'ferry':
        // Safe but expensive
        const ferryCost = Math.floor(currentRiver.depth * 5 + currentRiver.width * 0.1)
        if (supplies.money < ferryCost) {
          setMessage(`The ferry costs $${ferryCost}. You don't have enough money!`)
          setTimeout(() => setMessage(''), 2000)
          return
        }
        losses.money = ferryCost
        addLog(`You paid $${ferryCost} to take the ferry across the ${currentRiver.name}.`)
        break
        
      case 'wait':
        // Wait for better conditions
        const waitDays = Math.floor(Math.random() * 3 + 2)
        losses.food = waitDays * RATION_SETTINGS[rations].foodConsumption
        setDay(prev => prev + waitDays)
        addLog(`You waited ${waitDays} days for the river to calm. Used ${losses.food} lbs of food.`)
        break
    }
    
    // Apply losses
    setSupplies(prev => ({
      ...prev,
      food: Math.max(0, prev.food - (losses.food || 0)),
      clothing: Math.max(0, prev.clothing - (losses.clothing || 0)),
      parts: Math.max(0, prev.parts - (losses.parts || 0)),
      money: Math.max(0, prev.money - (losses.money || 0))
    }))
    
    if (losses.health) {
      setHealth(prev => Math.max(0, prev - losses.health))
    }
    
    // Mark river as crossed
    setCrossedRivers(prev => [...prev, currentRiver.name])
    setCurrentRiver(null)
    setGameState('playing')
  }

  const restartGame = () => {
    setGameState('intro')
    setDistance(0)
    setSupplies(STARTING_SUPPLIES)
    setHealth(100)
    setPace('steady')
    setRations('filling')
    setDay(1)
    setMessage('')
    setEventLog([])
    setCrossedRivers([])
    gameOverLoggedRef.current = false
  }

  // Intro screen
  if (gameState === 'intro') {
    return (
      <div className="oregon-trail">
        <div className="oregon-intro">
          <h1>🎮 The Oregon Trail 🐂</h1>
          <div className="oregon-intro-text">
            <p>The year is 1848. You and your family have decided to head west to Oregon in search of a better life.</p>
            <p>Your journey will be long and treacherous — 2,000 miles across plains, rivers, and mountains.</p>
            <p>Manage your supplies, maintain your health, and make it to Oregon alive!</p>
          </div>
          <div className="oregon-starting-supplies">
            <h3>Starting Supplies:</h3>
            <ul>
              <li>🌾 Food: {STARTING_SUPPLIES.food} lbs</li>
              <li>💰 Money: ${STARTING_SUPPLIES.money}</li>
              <li>🐂 Oxen: {STARTING_SUPPLIES.oxen}</li>
              <li>🔫 Ammunition: {STARTING_SUPPLIES.ammunition} bullets</li>
              <li>👕 Clothing: {STARTING_SUPPLIES.clothing} sets</li>
              <li>🔧 Wagon Parts: {STARTING_SUPPLIES.parts}</li>
              <li>💊 Medicine: {STARTING_SUPPLIES.medicine}</li>
            </ul>
          </div>
          <button className="oregon-btn oregon-btn-primary" onClick={startGame}>
            🚀 Begin Your Journey
          </button>
        </div>
      </div>
    )
  }

  // Victory screen
  if (gameState === 'victory') {
    return (
      <div className="oregon-trail">
        <div className="oregon-victory">
          <h1>🎉 You Made It! 🎉</h1>
          <div className="oregon-stats">
            <p>You reached Oregon in {day} days!</p>
            <p>Distance traveled: {Math.round(distance)} miles</p>
            <p>Final health: {Math.round(health)}%</p>
            <p>Remaining supplies:</p>
            <ul>
              <li>🌾 Food: {supplies.food} lbs</li>
              <li>💰 Money: ${supplies.money}</li>
              <li>🐂 Oxen: {supplies.oxen}</li>
            </ul>
          </div>
          <button className="oregon-btn oregon-btn-primary" onClick={restartGame}>
            Play Again
          </button>
        </div>
      </div>
    )
  }

  // Game Over screen
  if (gameState === 'gameover') {
    return (
      <div className="oregon-trail">
        <div className="oregon-gameover">
          <h1>💀 Game Over 💀</h1>
          <div className="oregon-stats">
            <p>Your journey ended after {day} days.</p>
            <p>Distance traveled: {Math.round(distance)} / {TOTAL_DISTANCE} miles</p>
            <p>Final health: {Math.round(health)}%</p>
            <p>You didn&apos;t make it to Oregon, but your story will be remembered.</p>
          </div>
          <button className="oregon-btn oregon-btn-primary" onClick={restartGame}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // River crossing screen
  if (gameState === 'river' && currentRiver) {
    const ferryCost = Math.floor(currentRiver.depth * 5 + currentRiver.width * 0.1)
    
    return (
      <div className="oregon-trail">
        <div className="oregon-river">
          <h2>🌊 {currentRiver.name} 🌊</h2>
          <div className="oregon-river-info">
            <p><strong>River Depth:</strong> {currentRiver.depth} feet</p>
            <p><strong>River Width:</strong> {currentRiver.width} feet</p>
            <p><strong>Weather Conditions:</strong> {riverWeather === 'rough' ? '⛈️ Rough' : '☀️ Calm'}</p>
          </div>
          
          <p className="oregon-river-prompt">
            You must cross the river. Choose your strategy carefully!
          </p>
          
          <div className="oregon-river-choices">
            <div className="oregon-river-choice">
              <button className="oregon-btn oregon-btn-primary" onClick={() => crossRiver('ford')}>
                🚶 Ford the River
              </button>
              <p className="oregon-choice-desc">
                Risk: <span className="risk-high">High</span> | Cost: Free<br/>
                Wade through the water. Risk losing supplies and health.
              </p>
            </div>
            
            <div className="oregon-river-choice">
              <button 
                className="oregon-btn oregon-btn-primary" 
                onClick={() => crossRiver('caulk')}
                disabled={supplies.parts < 1}
              >
                🛶 Caulk the Wagon
              </button>
              <p className="oregon-choice-desc">
                Risk: <span className="risk-medium">Medium</span> | Cost: 1 wagon part<br/>
                Float the wagon across. Safer than fording.
                {supplies.parts < 1 && <span className="warning"> (Need parts!)</span>}
              </p>
            </div>
            
            <div className="oregon-river-choice">
              <button 
                className="oregon-btn oregon-btn-primary" 
                onClick={() => crossRiver('ferry')}
                disabled={supplies.money < ferryCost}
              >
                ⛴️ Take the Ferry
              </button>
              <p className="oregon-choice-desc">
                Risk: <span className="risk-low">Low</span> | Cost: ${ferryCost}<br/>
                Pay for safe passage across the river.
                {supplies.money < ferryCost && <span className="warning"> (Need ${ferryCost}!)</span>}
              </p>
            </div>
            
            <div className="oregon-river-choice">
              <button className="oregon-btn" onClick={() => crossRiver('wait')}>
                ⏰ Wait for Conditions to Improve
              </button>
              <p className="oregon-choice-desc">
                Risk: <span className="risk-low">Low</span> | Cost: 2-4 days of food<br/>
                Wait for the river to calm. Uses time and food.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Shop screen
  if (gameState === 'shop') {
    const buyPrices = { food: 0.2, ammunition: 2, clothing: 10, parts: 20, oxen: 40, medicine: 25 }
    const sellPrices = { food: 0.15, ammunition: 1.5, clothing: 7, parts: 15, medicine: 20 }
    const prices = shopMode === 'buy' ? buyPrices : sellPrices
    
    const totalCost = Object.entries(shopSelection).reduce((sum, [item, qty]) => {
      return sum + (prices[item] || 0) * qty
    }, 0)
    
    return (
      <div className="oregon-trail">
        <div className="oregon-shop">
          <h2>🏪 General Store & Trading Post</h2>
          <p className="oregon-money">Your money: ${supplies.money}</p>
          
          <div className="oregon-shop-mode">
            <button 
              className={`oregon-btn ${shopMode === 'buy' ? 'oregon-btn-active' : ''}`}
              onClick={() => {
                setShopMode('buy')
                setShopSelection({})
              }}
            >
              💰 Buy
            </button>
            <button 
              className={`oregon-btn ${shopMode === 'sell' ? 'oregon-btn-active' : ''}`}
              onClick={() => {
                setShopMode('sell')
                setShopSelection({})
              }}
            >
              💵 Sell
            </button>
          </div>
          
          <div className="oregon-shop-items">
            {Object.entries(prices).map(([item, price]) => {
              if (item === 'oxen' && shopMode === 'sell') return null // Can't sell oxen
              
              return (
                <div key={item} className="oregon-shop-item">
                  <span className="oregon-shop-item-name">
                    {item.charAt(0).toUpperCase() + item.slice(1)} 
                    (${price.toFixed(2)})
                    {shopMode === 'sell' && <span className="oregon-shop-stock"> [You have: {supplies[item]}]</span>}
                  </span>
                  <div className="oregon-shop-controls">
                    <button
                      className="oregon-btn-small"
                      onClick={() => setShopSelection(prev => ({
                        ...prev,
                        [item]: Math.max(0, (prev[item] || 0) - 1)
                      }))}
                    >
                      -
                    </button>
                    <span className="oregon-shop-qty">{shopSelection[item] || 0}</span>
                    <button
                      className="oregon-btn-small"
                      onClick={() => setShopSelection(prev => ({
                        ...prev,
                        [item]: (prev[item] || 0) + 1
                      }))}
                      disabled={shopMode === 'sell' && (shopSelection[item] || 0) >= supplies[item]}
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          
          <p className="oregon-total">
            {shopMode === 'buy' ? 'Total Cost' : 'Total Earnings'}: ${totalCost.toFixed(2)}
          </p>
          
          <div className="oregon-shop-buttons">
            <button
              className="oregon-btn oregon-btn-primary"
              onClick={shopMode === 'buy' ? buyItems : sellItems}
              disabled={totalCost === 0 || (shopMode === 'buy' && totalCost > supplies.money)}
            >
              {shopMode === 'buy' ? 'Buy Items' : 'Sell Items'}
            </button>
            <button className="oregon-btn" onClick={() => setGameState('playing')}>
              Leave Store
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Hunting screen
  if (gameState === 'hunting') {
    return (
      <div className="oregon-trail">
        <div className="oregon-hunting">
          <div className="oregon-hunting-header">
            <h2>🔫 Hunting</h2>
            <div className="oregon-hunting-stats">
              <span>Time: {huntingTime}s</span>
              <span>Score: {huntingScore} lbs</span>
              <span>Ammo: {supplies.ammunition}</span>
            </div>
          </div>
          
          <div className="oregon-hunting-field" onClick={shootTarget}>
            {huntingTarget && (
              <div
                className="oregon-hunting-target"
                style={{
                  left: `${huntingTarget.x}%`,
                  top: `${huntingTarget.y}%`
                }}
              >
                {huntingTarget.animal}
              </div>
            )}
          </div>
          
          <p className="oregon-hunting-hint">Click the animals to shoot them!</p>
          <button className="oregon-btn" onClick={endHunting}>
            Stop Hunting
          </button>
        </div>
      </div>
    )
  }

  // Main game screen
  const progressPercent = (distance / TOTAL_DISTANCE) * 100

  return (
    <div className="oregon-trail">
      {message && <div className="oregon-message">{message}</div>}
      
      <div className="oregon-game">
        {/* Progress Bar */}
        <div className="oregon-progress">
          <div className="oregon-progress-bar">
            <div
              className="oregon-progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
            <span className="oregon-progress-wagon" style={{ left: `${progressPercent}%` }}>
              🚛
            </span>
          </div>
          <div className="oregon-progress-text">
            {Math.round(distance)} / {TOTAL_DISTANCE} miles
          </div>
        </div>

        {/* Status Panel */}
        <div className="oregon-status">
          <div className="oregon-status-item">
            <span className="oregon-label">Day:</span>
            <span className="oregon-value">{day}</span>
          </div>
          <div className="oregon-status-item">
            <span className="oregon-label">Health:</span>
            <div className="oregon-health-bar">
              <div
                className="oregon-health-fill"
                style={{ width: `${health}%` }}
              />
            </div>
            <span className="oregon-value">{Math.round(health)}%</span>
          </div>
        </div>

        {/* Supplies */}
        <div className="oregon-supplies">
          <h3>Supplies</h3>
          <div className="oregon-supplies-grid">
            <div>🌾 Food: {supplies.food} lbs</div>
            <div>💰 Money: ${supplies.money}</div>
            <div>🐂 Oxen: {supplies.oxen}</div>
            <div>🔫 Ammo: {supplies.ammunition}</div>
            <div>👕 Clothing: {supplies.clothing}</div>
            <div>🔧 Parts: {supplies.parts}</div>
            <div>💊 Medicine: {supplies.medicine}</div>
          </div>
        </div>

        {/* Controls */}
        <div className="oregon-controls">
          <div className="oregon-control-group">
            <label>Pace:</label>
            <select value={pace} onChange={(e) => setPace(e.target.value)}>
              {Object.entries(PACE_SETTINGS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name} ({val.speed} mi/day)
                </option>
              ))}
            </select>
          </div>

          <div className="oregon-control-group">
            <label>Rations:</label>
            <select value={rations} onChange={(e) => setRations(e.target.value)}>
              {Object.entries(RATION_SETTINGS).map(([key, val]) => (
                <option key={key} value={key}>
                  {val.name} ({val.foodConsumption} lbs/day)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="oregon-actions">
          <button className="oregon-btn" onClick={startHunting}>
            🔫 Hunt for Food
          </button>
          <button className="oregon-btn" onClick={openShop}>
            🏪 Trade & Rest
          </button>
          <button
            className="oregon-btn"
            onClick={() => {
              setHealth(prev => Math.min(100, prev + 10))
              addLog('You rested for a day.')
            }}
          >
            😴 Rest
          </button>
        </div>

        {/* Event Log */}
        <div className="oregon-log">
          <h3>Trail Log</h3>
          <div className="oregon-log-entries">
            {eventLog.map(entry => (
              <div key={entry.id} className="oregon-log-entry">
                <span className="oregon-log-day">Day {entry.day}:</span> {entry.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
