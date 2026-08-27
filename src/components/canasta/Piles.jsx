// src/components/canasta/Piles.jsx
import Card from './Card'

export function DrawPile({ count, onDraw, disabled }) {
  return (
    <div className="canasta-pile">
      <div className="canasta-pile-title">Draw Pile</div>
      <div className="canasta-pile-cards">
        {count > 0 ? (
          <>
            <div style={{ position: 'absolute', top: 2, left: 2 }}>
              <Card card={{ rank: 'A', suit: 'spades' }} faceDown />
            </div>
            <div style={{ position: 'absolute', top: 0, left: 0 }}>
              <Card card={{ rank: 'A', suit: 'spades' }} faceDown />
            </div>
          </>
        ) : (
          <div
            style={{
              width: '70px',
              height: '100px',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--label-tertiary)',
              fontSize: '12px',
            }}
          >
            Empty
          </div>
        )}
      </div>
      <div className="canasta-pile-count">{count} cards</div>
      {onDraw && (
        <button
          onClick={onDraw}
          disabled={disabled || count === 0}
          className="canasta-btn canasta-btn-primary"
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          Draw 2 Cards
        </button>
      )}
    </div>
  )
}

export function DiscardPile({ cards, onPickUp, disabled, frozen }) {
  const topCard = cards.length > 0 ? cards[cards.length - 1] : null

  return (
    <div className="canasta-pile">
      <div className="canasta-pile-title">
        Discard Pile {frozen && '🔒'}
      </div>
      <div className="canasta-pile-cards">
        {topCard ? (
          <>
            {cards.length > 1 && (
              <div style={{ position: 'absolute', top: 2, left: 2 }}>
                <Card card={{ rank: 'A', suit: 'spades' }} faceDown />
              </div>
            )}
            <div
              style={{ position: 'absolute', top: 0, left: 0 }}
              className={frozen ? 'canasta-discard-frozen' : ''}
            >
              <Card card={topCard} />
            </div>
          </>
        ) : (
          <div
            style={{
              width: '70px',
              height: '100px',
              border: '2px dashed #ccc',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--label-tertiary)',
              fontSize: '12px',
            }}
          >
            Empty
          </div>
        )}
      </div>
      <div className="canasta-pile-count">{cards.length} cards</div>
      {onPickUp && (
        <button
          onClick={onPickUp}
          disabled={disabled || cards.length === 0}
          className="canasta-btn canasta-btn-warning"
          style={{ padding: '8px 16px', fontSize: '12px' }}
        >
          Take Pile
        </button>
      )}
    </div>
  )
}
