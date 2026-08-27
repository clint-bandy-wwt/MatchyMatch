// src/components/canasta/Card.jsx
import { clsx } from 'clsx'

const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
  joker: '🃏',
}

const SUIT_COLORS = {
  hearts: '#e31c79',
  diamonds: '#e31c79',
  clubs: '#1c0087',
  spades: '#1c0087',
  joker: '#8212c4',
}

export default function Card({ card, selected, onClick, faceDown, small }) {
  if (faceDown) {
    return (
      <div
        className={clsx(
          'card-back',
          small ? 'card-small' : 'card-normal',
          onClick && 'cursor-pointer hover:scale-105'
        )}
        onClick={onClick}
        style={{
          backgroundColor: '#1629b4',
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.05) 10px, rgba(255,255,255,.05) 20px)',
          borderRadius: '8px',
          border: '2px solid rgba(255,255,255,0.2)',
          transition: 'transform 0.2s',
        }}
      />
    )
  }

  const displayRank = card.rank === 'JOKER' ? '★' : card.rank
  const suitSymbol = SUIT_SYMBOLS[card.suit]
  const suitColor = SUIT_COLORS[card.suit]

  return (
    <div
      className={clsx(
        'card',
        small ? 'card-small' : 'card-normal',
        selected && 'card-selected',
        onClick && 'cursor-pointer hover:scale-105',
        card.isWild && 'card-wild',
        card.isRed3 && 'card-red3'
      )}
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        border: selected ? '3px solid #0a84ff' : '2px solid #ddd',
        padding: small ? '4px' : '8px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        transition: 'all 0.2s',
        boxShadow: selected
          ? '0 4px 12px rgba(10, 132, 255, 0.4)'
          : '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      {/* Top left corner */}
      <div
        style={{
          fontSize: small ? '12px' : '16px',
          fontWeight: 'bold',
          color: suitColor,
          lineHeight: 1,
        }}
      >
        <div>{displayRank}</div>
        <div style={{ fontSize: small ? '14px' : '18px' }}>{suitSymbol}</div>
      </div>

      {/* Center symbol */}
      <div
        style={{
          fontSize: small ? '20px' : '32px',
          color: suitColor,
          textAlign: 'center',
          margin: small ? '4px 0' : '8px 0',
        }}
      >
        {suitSymbol}
      </div>

      {/* Bottom right corner (upside down) */}
      <div
        style={{
          fontSize: small ? '12px' : '16px',
          fontWeight: 'bold',
          color: suitColor,
          lineHeight: 1,
          textAlign: 'right',
          transform: 'rotate(180deg)',
        }}
      >
        <div>{displayRank}</div>
        <div style={{ fontSize: small ? '14px' : '18px' }}>{suitSymbol}</div>
      </div>

      {/* Wild card indicator */}
      {card.isWild && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'rgba(255, 215, 0, 0.9)',
            color: '#1c0087',
            fontSize: small ? '8px' : '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '4px',
            pointerEvents: 'none',
          }}
        >
          WILD
        </div>
      )}
    </div>
  )
}
