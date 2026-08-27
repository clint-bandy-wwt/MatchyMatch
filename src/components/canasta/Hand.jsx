// src/components/canasta/Hand.jsx
import Card from './Card'

export default function Hand({
  cards,
  selectedCards = [],
  onCardClick,
  title,
  faceDown = false,
}) {
  return (
    <div>
      {title && <div className="canasta-hand-title">{title}</div>}
      <div className="canasta-hand">
        {cards.length === 0 ? (
          <div
            style={{
              color: 'var(--label-tertiary)',
              fontSize: '14px',
              padding: '20px',
            }}
          >
            No cards
          </div>
        ) : (
          cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={selectedCards.some((c) => c.id === card.id)}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              faceDown={faceDown}
            />
          ))
        )}
      </div>
    </div>
  )
}
