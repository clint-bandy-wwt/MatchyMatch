const fs = require('fs');

let content = fs.readFileSync('src/hooks/useCribbageGame.js', 'utf8');

// Fix 1: Remove unused variable aiHandForCounting (line 643)
content = content.replace(
  "      const aiHandForCounting = [...aiHand, ...playedCards.filter(c => c.player === 'ai').map(c => ({ id: c.id, suit: c.suit, rank: c.rank, value: c.value }))]",
  "      // Hand counting would happen here in full implementation"
);

// Fix 2 & 3: Reorder functions - countHands before endPegging
const countHandsPattern = /  \/\*\*\n   \* Count hands and crib\n   \*\/\n  const countHands = useCallback\(\(\) => \{[\s\S]*?\}, \[cutCard, dealer, playerScore, aiScore, aiHand, playedCards, dealCards\]\)/;
const endPeggingPattern = /  \/\*\*\n   \* End pegging phase and move to counting\n   \*\/\n  const endPegging = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\)/;

const countHandsMatch = content.match(countHandsPattern);
const endPeggingMatch = content.match(endPeggingPattern);

if (countHandsMatch && endPeggingMatch) {
  const countHandsFunc = countHandsMatch[0];
  const endPeggingFunc = endPeggingMatch[0];
  
  // Get positions
  const countHandsIndex = content.indexOf(countHandsFunc);
  const endPeggingIndex = content.indexOf(endPeggingFunc);
  
  if (countHandsIndex > endPeggingIndex) {
    // Remove both
    content = content.replace(countHandsFunc, '%%COUNTHANDSTEMPMARKER%%');
    content = content.replace(endPeggingFunc, '%%ENDPEGGINGTEMPMARKER%%');
    
    // Swap them
    content = content.replace('%%ENDPEGGINGTEMPMARKER%%', countHandsFunc);
    content = content.replace('%%COUNTHANDSTEMPMARKER%%', endPeggingFunc);
  }
}

// Fix 3: Add countHands to endPegging dependencies
content = content.replace(
  "    setTimeout(() => countHands(), 1000)\n  }, [])",
  "    setTimeout(() => countHands(), 1000)\n  }, [countHands])"
);

// Fix 4: The helper functions need to be defined as regular functions, not in hooks
// They can't be in dependency arrays if they're defined inside the component
// Let's just add them correctly

fs.writeFileSync('src/hooks/useCribbageGame.js', content);

console.log("Fixed useCribbageGame.js");
