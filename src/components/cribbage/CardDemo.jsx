import Card from './Card'

/**
 * Visual demo/test component for the Cribbage Card component
 * 
 * This file demonstrates all card states and can be imported into
 * a test page or Storybook for visual testing.
 * 
 * Usage:
 * import CardDemo from './components/cribbage/CardDemo'
 * <CardDemo />
 */

export default function CardDemo() {
  const sampleCards = [
    { suit: 'hearts', rank: 'A', value: 1, id: 'AH' },
    { suit: 'diamonds', rank: 'K', value: 10, id: 'KD' },
    { suit: 'clubs', rank: 'Q', value: 10, id: 'QC' },
    { suit: 'spades', rank: 'J', value: 10, id: 'JS' },
    { suit: 'hearts', rank: '10', value: 10, id: '10H' },
    { suit: 'diamonds', rank: '5', value: 5, id: '5D' },
  ]

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold">Cribbage Card Component Demo</h1>

      {/* Normal Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Normal State</h2>
        <div className="flex gap-4 flex-wrap">
          {sampleCards.map((card) => (
            <Card key={card.id} card={card} size="medium" />
          ))}
        </div>
      </section>

      {/* Selected Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Selected State</h2>
        <div className="flex gap-4 flex-wrap">
          {sampleCards.slice(0, 3).map((card) => (
            <Card key={card.id} card={card} isSelected={true} size="medium" />
          ))}
        </div>
      </section>

      {/* Playable Cards (hover to see effect) */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Playable State (hover to see glow)</h2>
        <div className="flex gap-4 flex-wrap">
          {sampleCards.slice(0, 3).map((card) => (
            <Card
              key={card.id}
              card={card}
              isPlayable={true}
              onClick={() => alert(`Clicked ${card.rank} of ${card.suit}`)}
              size="medium"
            />
          ))}
        </div>
      </section>

      {/* Not Playable Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Not Playable State</h2>
        <div className="flex gap-4 flex-wrap">
          {sampleCards.slice(0, 3).map((card) => (
            <Card key={card.id} card={card} isPlayable={false} size="medium" />
          ))}
        </div>
      </section>

      {/* Hidden Cards */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Hidden State (card backs)</h2>
        <div className="flex gap-4 flex-wrap">
          {sampleCards.slice(0, 3).map((card) => (
            <Card key={card.id} card={card} isHidden={true} size="medium" />
          ))}
        </div>
      </section>

      {/* Size Variations */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Size Variations</h2>
        <div className="flex gap-4 items-end flex-wrap">
          <div>
            <p className="text-sm mb-2">Small</p>
            <Card card={sampleCards[0]} size="small" />
          </div>
          <div>
            <p className="text-sm mb-2">Medium</p>
            <Card card={sampleCards[0]} size="medium" />
          </div>
          <div>
            <p className="text-sm mb-2">Large</p>
            <Card card={sampleCards[0]} size="large" />
          </div>
        </div>
      </section>

      {/* Layout Helpers Demo */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Layout Helper: .cribbage-hand</h2>
        <div className="cribbage-hand">
          {sampleCards.map((card) => (
            <Card key={card.id} card={card} size="medium" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Layout Helper: .cribbage-hand-overlap</h2>
        <div className="cribbage-hand-overlap">
          {sampleCards.map((card) => (
            <Card key={card.id} card={card} size="medium" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Layout Helper: .cribbage-play-area</h2>
        <div className="cribbage-play-area">
          {sampleCards.slice(0, 4).map((card) => (
            <Card key={card.id} card={card} size="medium" />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-4">Layout Helper: .cribbage-crib</h2>
        <div className="cribbage-crib">
          {sampleCards.slice(0, 4).map((card) => (
            <Card key={card.id} card={card} isHidden={true} size="small" />
          ))}
        </div>
      </section>
    </div>
  )
}
