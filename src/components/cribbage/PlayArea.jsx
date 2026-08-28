import Card from './Card'

export default function PlayArea({ 
  playedCards = [], 
  count = 0,
  maxCount = 31,
  lastAction = null
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-200 dark:border-green-700 min-h-32">
      <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Play Area
      </div>
      
      {playedCards.length === 0 ? (
        <div className="text-sm text-gray-500 italic">No cards played yet</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-2">
          {playedCards.map((play, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <Card
                card={play.card}
                size="small"
                isHidden={false}
              />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                {play.player === 'player' ? 'P' : 'AI'}
              </span>
            </div>
          ))}
        </div>
      )}
      
      <div className={`text-2xl font-bold ${count === 15 || count === 31 ? 'text-green-600' : 'text-gray-800 dark:text-gray-200'}`}>
        Count: {count} / {maxCount}
        {count === 15 && ' ✓'}
        {count === 31 && ' ✓✓'}
      </div>
      
      {lastAction === 'go' && (
        <div className="text-sm font-semibold text-orange-600">Go!</div>
      )}
    </div>
  )
}
