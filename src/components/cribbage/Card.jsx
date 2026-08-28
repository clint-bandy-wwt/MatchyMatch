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

  // If hidden, show card back
  if (isHidden) {
    return (
      <div className={cardClasses} onClick={handleClick}>
        <div className="cribbage-card-back w-full h-full rounded-lg"></div>
      </div>
    )
  }

  return (
    <div className={cardClasses} onClick={handleClick}>
      {/* Card content */}
      <div className="w-full h-full bg-white rounded-lg border-2 border-gray-800 shadow-md flex flex-col relative p-1">
        {/* Top-left rank and suit */}
        <div
          className={clsx('absolute top-0.5 left-1 font-bold leading-none', rankSizes[size])}
          style={{ color: suitColor }}
        >
          <div>{card.rank}</div>
          <div className="text-xs leading-none">{suitSymbol}</div>
        </div>

        {/* Center suit symbol */}
        <div className="flex-1 flex items-center justify-center">
          <div
            className={clsx('font-bold leading-none', suitSizes[size])}
            style={{ color: suitColor }}
          >
            {suitSymbol}
          </div>
        </div>

        {/* Bottom-right rank and suit (rotated) */}
        <div
          className={clsx(
            'absolute bottom-0.5 right-1 font-bold leading-none transform rotate-180',
            rankSizes[size]
          )}
          style={{ color: suitColor }}
        >
          <div>{card.rank}</div>
          <div className="text-xs leading-none">{suitSymbol}</div>
        </div>
      </div>
    </div>
  )
}
