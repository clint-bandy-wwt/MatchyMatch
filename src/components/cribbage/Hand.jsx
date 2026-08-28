import Card from './Card'

export default function Hand({ 
  cards = [], 
  owner = 'player',
  selectedCards = [], 
  validPlays = [], 
  onCardClick = () => {},
  hidden = false,
  phase = '',
  label = ''
}) {
  const isCardSelected = (card) => {
    return selectedCards.some(c => c.id === card.id)
  }

  const isCardPlayable = (card) => {
    // During discard phase, all cards are selectable
    if (phase === 'discard' && owner === 'player') {
      return true
    }
    // During pegging phase, only validPlays are playable
    return validPlays.some(c => c.id === card.id)
  }

  const displayLabel = label || (owner === 'player' ? 'Your Hand' : 'AI Hand')

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {displayLabel} ({cards.length})
      </div>
      
      {cards.length === 0 ? (
        <div className="text-sm text-gray-500 italic">No cards</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2 md:gap-1 md:-space-x-6">
          {cards.map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className="transform transition-all duration-200 hover:scale-105 hover:z-10"
            >
              <Card
                card={card}
                isSelected={isCardSelected(card)}
                isPlayable={!hidden && isCardPlayable(card)}
                isHidden={hidden}
                onClick={() => !hidden && onCardClick(card)}
                size="medium"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
