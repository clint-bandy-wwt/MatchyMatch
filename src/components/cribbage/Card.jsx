import { clsx } from 'clsx'
import './cribbage.css'

// Suit symbols using Unicode
const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

// Suit colors
const SUIT_COLORS = {
  hearts: '#dc2626',
  diamonds: '#dc2626',
  clubs: '#1f2937',
  spades: '#1f2937',
}

export default function Card({
  card,
  isSelected = false,
  isPlayable = true,
  isHidden = false,
  onClick,
  size = 'medium',
  className = '',
}) {
  // Size classes
  const sizeClasses = {
    small: 'w-12 h-16 text-xs',
    medium: 'w-16 h-24 text-sm',
    large: 'w-20 h-28 text-base',
  }

  // Rank font sizes
  const rankSizes = {
    small: 'text-base',
    medium: 'text-xl',
    large: 'text-2xl',
  }

  // Suit font sizes
  const suitSizes = {
    small: 'text-2xl',
    medium: 'text-4xl',
    large: 'text-5xl',
  }

  if (!card) {
    return null
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit]
  const suitColor = SUIT_COLORS[card.suit]

  // Handle click - only if playable and onClick is provided
  const handleClick = () => {
    if (onClick && isPlayable && !isHidden) {
      onClick()
    }
  }

  // Build class names
  const cardClasses = clsx(
    'cribbage-card',
    'relative rounded-lg select-none transition-all duration-200',
    'flex flex-col items-center justify-between',
    sizeClasses[size],
    {
      'cribbage-card-selected': isSelected && !isHidden,
      'cribbage-card-playable': isPlayable && !isHidden && !isSelected,
      'cribbage-card-not-playable': !isPlayable && !isHidden,
      'cribbage-card-hidden': isHidden,
      'cursor-pointer': isPlayable && !isHidden && onClick,
      'cursor-not-allowed': !isPlayable && !isHidden,
      'cursor-default': isHidden,
    },
    className
  )

  return (
    <div className={cardClasses} onClick={handleClick}>
      {isHidden ? (
        // Card back
        <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
          <div className="text-white text-2xl font-bold opacity-30">🂠</div>
        </div>
      ) : (
        // Card front
        <>
          {/* Top rank and suit */}
          <div className="flex flex-col items-center pt-1">
            <div className={clsx('font-bold leading-none', rankSizes[size])} style={{ color: suitColor }}>
              {card.rank}
            </div>
            <div className={clsx('leading-none', suitSizes[size])} style={{ color: suitColor }}>
              {suitSymbol}
            </div>
          </div>

          {/* Center suit symbol */}
          <div className={clsx('leading-none', suitSizes[size])} style={{ color: suitColor }}>
            {suitSymbol}
          </div>

          {/* Bottom rank and suit (upside down) */}
          <div className="flex flex-col items-center pb-1 rotate-180">
            <div className={clsx('font-bold leading-none', rankSizes[size])} style={{ color: suitColor }}>
              {card.rank}
            </div>
            <div className={clsx('leading-none', suitSizes[size])} style={{ color: suitColor }}>
              {suitSymbol}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
