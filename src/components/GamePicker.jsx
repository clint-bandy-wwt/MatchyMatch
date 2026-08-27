import { useEffect, useMemo, useState } from 'react'

const GAMES = [
  {
    id: 'matchy',
    name: 'Matchy Match',
    description: 'Group 20 words into 5 hidden categories',
    tag: 'Puzzle',
  },
  {
    id: 'wordle',
    name: 'Wordle',
    description: 'Guess the 5-letter word in 6 tries',
    tag: 'Word',
  },
  {
    id: 'crunch',
    name: 'Number Crunch',
    description: 'Hit the target using 6 numbers & operators',
    tag: 'Puzzle',
  },
  {
    id: 'cross',
    name: 'Crossword',
    description: 'Fill in the classic crossword grid',
    tag: 'Word',
  },
  {
    id: 'chain',
    name: 'Word Chain',
    description: 'Link words one letter change at a time',
    tag: 'Word',
  },
  {
    id: 'scramble',
    name: 'Scramble',
    description: 'Unscramble the jumbled letters',
    tag: 'Word',
  },
  {
    id: 'anagram',
    name: 'Anagram',
    description: 'Rearrange letters to find the hidden word',
    tag: 'Word',
  },
  {
    id: 'sudoku',
    name: 'Sudoku',
    description: 'Fill the 9×9 grid with digits 1–9',
    tag: 'Puzzle',
  },
  {
    id: 'trivia',
    name: 'Trivia',
    description: 'Test your knowledge across many topics',
    tag: 'Trivia',
  },
  {
    id: 'memory',
    name: 'Memory',
    description: 'Flip cards and find every matching pair',
    tag: 'Memory',
  },
  {
    id: 'puppyfetch',
    name: 'Puppy Fetch',
    description: 'Match all the dog breed pairs to get treats',
    tag: 'Memory',
  },
  {
    id: 'catmatch',
    name: 'Cat Match',
    description: 'Match all the kitties in the fewest moves',
    tag: 'Memory',
  },
  {
    id: 'typerace',
    name: 'Type Race',
    description: 'Type the passage as fast as you can',
    tag: 'Reflex',
  },
  {
    id: 'wordsearch',
    name: 'Word Search',
    description: 'Hunt for hidden words in the grid',
    tag: 'Word',
  },
  {
    id: 'mathquiz',
    name: 'Math Quiz',
    description: 'Solve rapid-fire arithmetic questions',
    tag: 'Puzzle',
  },
  {
    id: 'hangman',
    name: 'Hangman',
    description: 'Guess the word before the drawing is done',
    tag: 'Word',
  },
  {
    id: 'snake',
    name: 'Snake',
    description: "Eat, grow, and don't hit the walls",
    tag: 'Arcade',
  },
  {
    id: 'spellingbee',
    name: 'Spelling Bee',
    description: 'Make words from 7 letters — use the centre one',
    tag: 'Word',
  },
  {
    id: '2048',
    name: '2048',
    description: 'Slide & merge tiles to reach the 2048 tile',
    tag: 'Puzzle',
  },
  {
    id: 'minesweeper',
    name: 'Ryanfield',
    description: "Clear Ryan's field without hitting a bomb",
    tag: 'Puzzle',
    builder: 'Ryan',
  },
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe with Brian 🧠',
    description: 'Use your brain to beat Brian!',
    tag: 'Strategy',
    builder: 'Brian',
  },
  {
    id: 'barrysblitz',
    name: "Barry's Blitz",
    description: 'Race against time to match words to categories',
    tag: 'Word',
    builder: 'Barry',
  },
  {
    id: 'gregsegg',
    name: "Greg's Egg",
    description: "Tap Greg's eggs before they hatch — timing is everything!",
    tag: 'Reflex',
    builder: 'Greg',
  },
  {
    id: 'nathanielninja',
    name: "Nathaniel's Number Ninja",
    description: 'Identify numbers quickly before time runs out!',
    tag: 'Reflex',
    builder: 'Nathaniel',
  },
  {
    id: 'nickofttime',
    name: "Nick of T-Time",
    description: "Tap in the nick of time — land the marker in the green zone!",
    tag: 'Reflex',
    builder: 'Nick',
  },
  {
    id: 'colourclash',
    name: 'Colour Clash',
    description: 'Tap the ink colour, not the word — beat the Stroop effect!',
    tag: 'Reflex',
  },
  {
    id: 'flipflop',
    name: 'Flip Flop',
    description: 'Match all the fruit pairs in the fewest moves',
    tag: 'Memory',
  },
  {
    id: 'diceroll',
    name: 'Dice Roll',
    description: 'Roll two dice and try to hit the target sum',
    tag: 'Chaos',
  },
  {
    id: 'flipcoin',
    name: 'Flip Coin',
    description: 'Predict heads or tails and test your luck!',
    tag: 'Chaos',
  },
  {
    id: 'kennykeno',
    name: "Kenny's Keno",
    description: 'Pick numbers and match them to the draw!',
    tag: 'Chaos',
    builder: 'Kenny',
  },
  {
    id: 'chess',
    name: 'Chess',
    description: 'Play the classic game of chess against the AI, or a friend',
    tag: 'Strategy',
  },
  {
    id: 'rochellespinner',
    name: "Rochelle's Spinner",
    description: 'Spin the wheel and try your luck!',
    tag: 'Chaos',
    builder: 'Rochelle',
    isNew: true,
  },
  {
    id: 'martinimatch',
    name: 'Martini Match',
    description: 'Match cocktail names with their ingredients!',
    tag: 'Memory',
    isNew: true,
  },
  {
    id: 'manjual',
    name: 'Manju-al',
    description: 'Guess manju-related words with hints!',
    tag: 'Word',
  },
  {
    id: 'latcham',
    name: 'Latch-am If You Can',
    description: 'Click the locks before they escape — latch as many as you can!',
    tag: 'Reflex',
  },
  {
    id: 'geoffsgeometry',
    name: "Geoff's Geometry",
    description: 'Identify shapes as fast as you can in this geometric challenge!',
    tag: 'Reflex',
    builder: 'Geoff',
    isNew: true,
  },
  {
    id: 'oregontrail',
    name: 'Oregon Trail',
    description: 'Journey 2,000 miles to Oregon — manage supplies and survive the trail!',
    tag: 'Adventure',
  },
  {
    id: 'greatwall',
    name: 'The Great Wall',
    description: 'Break down the wall, one brick at a time!',
    tag: 'Arcade',
    isNew: true,
  },
  {
    id: 'samiam',
    name: 'Sam I Am',
    description: 'Guess the secret word from Dr. Seuss-style clues!',
    tag: 'Word',
    isNew: true,
  },
  {
    id: 'spaceinvaders',
    name: 'Space Invaders',
    description: 'Defend Earth from waves of alien invaders!',
    tag: 'Arcade',
  },
  {
    id: 'pong',
    name: 'Pong',
    description: 'Classic paddle game — first to 10 wins!',
    tag: 'Arcade',
    builder: 'Clint',
    isNew: true,
  },
]


// Two-color gradients cycled across the grid, adapted from the Arcade
// design spec's tile palette.
const TILES = [
  'linear-gradient(140deg, #0086ea 0%, #1629b4 100%)',
  'linear-gradient(140deg, #8212c4 0%, #1629b4 100%)',
  'linear-gradient(140deg, #e31c79 0%, #8212c4 100%)',
  'linear-gradient(140deg, #39a283 0%, #0086ea 100%)',
  'linear-gradient(140deg, #1c0087 0%, #0086ea 100%)',
  'linear-gradient(140deg, #c33d04 0%, #e31c79 100%)',
  'linear-gradient(140deg, #0086ea 0%, #39a283 100%)',
  'linear-gradient(140deg, #4e4f5f 0%, #1c0087 100%)',
]

// Slight per-card resting tilt, cycled across the grid — straightens on
// hover. Adapted from the Arcade design spec's ROTS values.
const ROTS = ['-1.1deg', '0.8deg', '-0.5deg', '1.2deg', '-0.9deg', '0.4deg', '1deg', '-1.4deg']

function initialsFor(name) {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

const CATEGORIES = ['All', ...Array.from(new Set(GAMES.map((g) => g.tag))).sort()]

// Stable per-game tile color + resting rotation, keyed by id — independent
// of search/filter/sort order, so a game's card always looks the same.
const GAME_BY_ID = Object.fromEntries(
  GAMES.map((g, i) => [
    g.id,
    { ...g, tile: TILES[i % TILES.length], rot: ROTS[i % ROTS.length] },
  ])
)

const FAVORITES_KEY = 'matchy.favorites'
const RECENTS_KEY = 'matchy.recents'
const MAX_RECENTS = 5

export default function GamePicker({ onGameSelect }) {
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('All')
  const [sort, setSort] = useState('default')
  const [favOnly, setFavOnly] = useState(false)
  const [openId, setOpenId] = useState(null)
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })
  const [recents, setRecents] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents))
  }, [recents])

  useEffect(() => {
    if (!openId) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openId])

  const toggleFavorite = (id) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    )
  }

  const recordRecent = (id) => {
    setRecents((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENTS))
  }

  const playGame = (id) => {
    recordRecent(id)
    setOpenId(null)
    onGameSelect(id)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = GAMES.filter((g) => {
      if (tag !== 'All' && g.tag !== tag) return false
      if (favOnly && !favorites.includes(g.id)) return false
      if (
        q &&
        !g.name.toLowerCase().includes(q) &&
        !g.description.toLowerCase().includes(q) &&
        !(g.builder && g.builder.toLowerCase().includes(q))
      ) return false
      return true
    })
    if (sort === 'az') {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    }
    return list
  }, [query, tag, favOnly, favorites, sort])

  const categoryCount = CATEGORIES.length - 1

  const handleSurprise = () => {
    const pool = filtered.length > 0 ? filtered : GAMES
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setOpenId(pick.id)
  }

  const clearFilters = () => {
    setQuery('')
    setTag('All')
    setFavOnly(false)
  }

  return (
    <div className="w-full">
      {/* Hero */}
      <div className="arcade-hero -mx-4 sm:-mx-8 px-4 sm:px-8 pt-12 sm:pt-16 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row lg:items-end justify-between gap-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <span className="arcade-badge">AI Bootcamp</span>
              <span className="arcade-eyebrow">build · ship · play</span>
            </div>
            <h2
              className="m-0 tracking-tight"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(44px, 8vw, 76px)',
                lineHeight: 0.96,
                fontWeight: 300,
                letterSpacing: '-0.03em',
                color: 'var(--arcade-text)',
              }}
            >
              The <span style={{ fontWeight: 900, color: 'var(--arcade-blue)' }}>Arcade</span>
            </h2>
            <p
              className="mt-5"
              style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--arcade-text-muted)' }}
            >
              {GAMES.length} tiny games, zero instructions, mandatory puns.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="arcade-stat">
              <div className="arcade-stat__num" style={{ color: 'var(--arcade-indigo)' }}>{GAMES.length}</div>
              <div className="arcade-stat__label">games</div>
            </div>
            <div className="arcade-stat">
              <div className="arcade-stat__num" style={{ color: 'var(--arcade-pink)' }}>{categoryCount}</div>
              <div className="arcade-stat__label">categories</div>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="arcade-toolbar -mx-4 sm:-mx-8 px-4 sm:px-8">
        <div className="max-w-5xl mx-auto pt-8 pb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
            <div className="relative w-full sm:w-[280px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search games"
                className="arcade-search"
              />
              <svg
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="var(--arcade-text-faint)" strokeWidth="2" strokeLinecap="round"
                style={{ position: 'absolute', left: 15, top: 14 }}
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFavOnly((v) => !v)}
                className={`arcade-btn ${favOnly ? 'arcade-btn--fav-active' : ''}`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={favOnly ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                  <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.2-5.4-2.9-5.4 2.9 1-6.2L3.2 10l6.1-.9z" />
                </svg>
                Favorites
              </button>

              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="arcade-select"
              >
                <option value="default">Default order</option>
                <option value="az">A – Z</option>
              </select>

              <button onClick={handleSurprise} className="arcade-btn arcade-btn--primary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                  <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
                  <circle cx="15.5" cy="15.5" r="1.4" fill="currentColor" />
                  <circle cx="12" cy="12" r="1.4" fill="currentColor" />
                </svg>
                Surprise me
              </button>
            </div>
          </div>

          <div className="arcade-chip-row">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setTag(c)}
                className={`arcade-chip ${tag === c ? 'arcade-chip--active' : ''}`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Jump back in */}
      {recents.length > 0 && (
        <div className="max-w-5xl mx-auto pt-12">
          <div className="arcade-eyebrow" style={{ marginBottom: 14 }}>Jump back in</div>
          <div className="flex gap-3 flex-wrap">
            {recents.map((id) => {
              const g = GAME_BY_ID[id]
              if (!g) return null
              return (
                <button key={id} onClick={() => setOpenId(id)} className="arcade-recent">
                  <span className="arcade-recent__avatar" style={{ background: g.tile }}>
                    {initialsFor(g.name)}
                  </span>
                  {g.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-5xl mx-auto pt-16 pb-10">
        {filtered.length === 0 ? (
          <div className="arcade-empty">
            <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--arcade-text)' }}>No games match that.</div>
            <p style={{ margin: '10px 0 20px', fontSize: 14, color: 'var(--arcade-text-muted)' }}>
              Try a looser search — the puns are doing a lot of work here.
            </p>
            <button onClick={clearFilters} className="arcade-btn arcade-btn--primary" style={{ margin: '0 auto' }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="arcade-grid">
            {filtered.map((game) => {
              const isFav = favorites.includes(game.id)
              const g = GAME_BY_ID[game.id]
              return (
                <div
                  key={game.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(game.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenId(game.id)
                    }
                  }}
                  className="arcade-card"
                  style={{ '--card-rot': g.rot }}
                >
                  <div className="arcade-card__tile" style={{ background: g.tile }}>
                    <span className="arcade-card__initials">{initialsFor(game.name)}</span>
                    <span className="arcade-card__tag">{game.tag}</span>
                  </div>

                  <button
                    aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(game.id)
                    }}
                    className={`arcade-card__fav ${isFav ? 'arcade-card__fav--active' : ''}`}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                      <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.2-5.4-2.9-5.4 2.9 1-6.2L3.2 10l6.1-.9z" />
                    </svg>
                  </button>

                  <div className="flex items-center gap-2">
                    <h3 className="arcade-card__title">{game.name}</h3>
                    {game.isNew && <span className="arcade-card__new">New</span>}
                  </div>
                  <div className="arcade-card__byline">{game.builder ? `by ${game.builder}` : game.tag}</div>
                  <p className="arcade-card__desc">{game.description}</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Preview modal */}
      {openId && GAME_BY_ID[openId] && (
        <div
          onClick={() => setOpenId(null)}
          className="arcade-modal-backdrop"
        >
          <div onClick={(e) => e.stopPropagation()} className="arcade-modal">
            <div className="arcade-modal__art" style={{ background: GAME_BY_ID[openId].tile }}>
              <span className="arcade-modal__initials">{initialsFor(GAME_BY_ID[openId].name)}</span>
              <button
                onClick={() => setOpenId(null)}
                aria-label="Close"
                className="arcade-modal__close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="arcade-modal__body">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="arcade-modal__title">{GAME_BY_ID[openId].name}</h3>
                <span className="arcade-modal__tag">{GAME_BY_ID[openId].tag}</span>
              </div>
              {GAME_BY_ID[openId].builder && (
                <div className="arcade-modal__byline">by {GAME_BY_ID[openId].builder}</div>
              )}
              <p className="arcade-modal__desc">{GAME_BY_ID[openId].description}</p>
              <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 26 }}>
                <button onClick={() => playGame(openId)} className="arcade-btn arcade-btn--primary" style={{ height: 52, padding: '0 28px', fontSize: 16 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4.5l13 7.5-13 7.5z" />
                  </svg>
                  Play now
                </button>
                <button
                  onClick={() => toggleFavorite(openId)}
                  className={`arcade-btn ${favorites.includes(openId) ? 'arcade-btn--fav-active' : ''}`}
                  style={{ height: 52, padding: '0 22px', fontSize: 15 }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill={favorites.includes(openId) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                    <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.2-5.4-2.9-5.4 2.9 1-6.2L3.2 10l6.1-.9z" />
                  </svg>
                  {favorites.includes(openId) ? 'Favorited' : 'Add to favorites'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
