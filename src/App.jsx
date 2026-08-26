import { useState } from 'react'
import Header from './components/Header'
import { useDarkMode } from './hooks/useDarkMode'
import Footer from './components/Footer'
import GamePicker from './components/GamePicker'
import GameBoard from './components/GameBoard'
import WordleBoard from './components/wordle/WordleBoard'
import NumberCrunchBoard from './components/numbercrunch/NumberCrunchBoard'
import CrosswordBoard from './components/crossword/CrosswordBoard'
import WordChainBoard from './components/wordchain/WordChainBoard'
import ScrambleBoard from './components/scramble/ScrambleBoard'
import AnagramBoard from './components/anagram/AnagramBoard'
import SudokuBoard from './components/sudoku/SudokuBoard'
import TriviaBoard from './components/trivia/TriviaBoard'
import MemoryBoard from './components/memory/MemoryBoard'
import TypeRaceBoard from './components/typerace/TypeRaceBoard'
import WordSearchBoard from './components/wordsearch/WordSearchBoard'
import MathQuizBoard from './components/mathquiz/MathQuizBoard'
import HangmanBoard from './components/hangman/HangmanBoard'
import SnakeBoard from './components/snake/SnakeBoard'
import SpellingBeeBoard from './components/spellingbee/SpellingBeeBoard'
import Game2048Board from './components/game2048/Game2048Board'
import MinesweeperBoard from './components/minesweeper/MinesweeperBoard'
import TicTacToeBoard from './components/tictactoe/TicTacToeBoard'
import BarrysBlitz from './components/BarrysBlitz'
import GregsEggBoard from './components/gregsEgg/GregsEggBoard'
import NathanielNinjaBoard from './components/nathanielninja/NathanielNinjaBoard'
import NickOfTTimeBoard from './components/nickofttime/NickOfTTimeBoard'
import ColourClashBoard from './components/colourclash/ColourClashBoard'
import FlipFlopBoard from './components/flipflop/FlipFlopBoard'
import DiceRollBoard from './components/diceroll/DiceRollBoard'
import FlipCoinBoard from './components/flipcoin/FlipCoinBoard'
import PuppyFetchBoard from './components/puppyfetch/PuppyFetchBoard'
import CatMatchBoard from './components/catmatch/CatMatchBoard'
import ChessBoard from './components/chess/ChessBoard'
import KennyKenoBoard from './components/kennykeno/KennyKenoBoard'
import RochellesSpinnerBoard from './components/rochellespinner/RochellesSpinnerBoard'
import MartiniMatchBoard from './components/martinimatch/MartiniMatchBoard'
import ManjualBoard from './components/manjual/ManjualBoard'
import LatchamBoard from './components/latcham/LatchamBoard'
import GeoffsGeometryBoard from './components/geoffsgeometry/GeoffsGeometryBoard'
import GreatWallBoard from './components/greatwall/GreatWallBoard'
import SamIAmBoard from './components/samiam/SamIAmBoard'
import { puzzles } from './data/puzzles'
import OregonTrailBoard from './components/oregontrail/OregonTrailBoard'

const envIndex = parseInt(import.meta.env.VITE_PUZZLE_INDEX, 10)
const PUZZLE_INDEX =
  Number.isFinite(envIndex) && envIndex >= 0 && envIndex < puzzles.length
    ? envIndex
    : 0

function App() {
  // null = home / game picker screen
  const [activeGame, setActiveGame] = useState(null)
  const [gameKey, setGameKey] = useState(0)
  const { dark, toggle: toggleDark } = useDarkMode()

  const handleNewGame = () => {
    setGameKey((k) => k + 1)
  }

  const handleGameSelect = (game) => {
    setActiveGame(game)
    setGameKey((k) => k + 1)
  }

  const handleGoHome = () => {
    setActiveGame(null)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        activeGame={activeGame}
        onGameChange={handleGameSelect}
        onGoHome={handleGoHome}
        dark={dark}
        onToggleDark={toggleDark}
      />
      <main className="flex-1 flex flex-col items-center pt-6 pb-10 px-4 sm:px-6">
        {!activeGame ? (
          <GamePicker onGameSelect={handleGameSelect} />
        ) : activeGame === 'matchy' ? (
          <GameBoard
            key={`matchy-${gameKey}`}
            puzzle={puzzles[PUZZLE_INDEX]}
            onNewGame={handleNewGame}
          />
        ) : activeGame === 'wordle' ? (
          <WordleBoard key={`wordle-${gameKey}`} />
        ) : activeGame === 'crunch' ? (
          <NumberCrunchBoard key={`crunch-${gameKey}`} />
        ) : activeGame === 'cross' ? (
          <CrosswordBoard key={`cross-${gameKey}`} />
        ) : activeGame === 'chain' ? (
          <WordChainBoard key={`chain-${gameKey}`} />
        ) : activeGame === 'scramble' ? (
          <ScrambleBoard key={`scramble-${gameKey}`} />
        ) : activeGame === 'anagram' ? (
          <AnagramBoard key={`anagram-${gameKey}`} />
        ) : activeGame === 'trivia' ? (
          <TriviaBoard key={`trivia-${gameKey}`} />
        ) : activeGame === 'memory' ? (
          <MemoryBoard key={`memory-${gameKey}`} />
        ) : activeGame === 'puppyfetch' ? (
          <PuppyFetchBoard key={`puppyfetch-${gameKey}`} />
        ) : activeGame === 'catmatch' ? (
          <CatMatchBoard key={`catmatch-${gameKey}`} />
        ) : activeGame === 'typerace' ? (
          <TypeRaceBoard key={`typerace-${gameKey}`} />
        ) : activeGame === 'wordsearch' ? (
          <WordSearchBoard key={`wordsearch-${gameKey}`} />
        ) : activeGame === 'mathquiz' ? (
          <MathQuizBoard key={`mathquiz-${gameKey}`} />
        ) : activeGame === 'hangman' ? (
          <HangmanBoard key={`hangman-${gameKey}`} />
        ) : activeGame === 'snake' ? (
          <SnakeBoard key={`snake-${gameKey}`} dark={dark} />
        ) : activeGame === 'spellingbee' ? (
          <SpellingBeeBoard key={`spellingbee-${gameKey}`} />
        ) : activeGame === '2048' ? (
          <Game2048Board key={`2048-${gameKey}`} />
        ) : activeGame === 'minesweeper' ? (
          <MinesweeperBoard key={`minesweeper-${gameKey}`} />
        ) : activeGame === 'tictactoe' ? (
          <TicTacToeBoard key={`tictactoe-${gameKey}`} />
        ) : activeGame === 'barrysblitz' ? (
          <BarrysBlitz key={`barrysblitz-${gameKey}`} />
        ) : activeGame === 'gregsegg' ? (
          <GregsEggBoard key={`gregsegg-${gameKey}`} />
        ) : activeGame === 'nathanielninja' ? (
          <NathanielNinjaBoard key={`nathanielninja-${gameKey}`} />
        ) : activeGame === 'nickofttime' ? (
          <NickOfTTimeBoard key={`nickofttime-${gameKey}`} />
        ) : activeGame === 'colourclash' ? (
          <ColourClashBoard key={`colourclash-${gameKey}`} />
        ) : activeGame === 'flipflop' ? (
          <FlipFlopBoard key={`flipflop-${gameKey}`} />
        ) : activeGame === 'diceroll' ? (
          <DiceRollBoard key={`diceroll-${gameKey}`} />
        ) : activeGame === 'flipcoin' ? (
          <FlipCoinBoard key={`flipcoin-${gameKey}`} />
        ) : activeGame === 'kennykeno' ? (
          <KennyKenoBoard key={`kennykeno-${gameKey}`} />
        ) : activeGame === 'chess' ? (
          <ChessBoard key={`chess-${gameKey}`} />
        ) : activeGame === 'rochellespinner' ? (
          <RochellesSpinnerBoard key={`rochellespinner-${gameKey}`} />
        ) : activeGame === 'martinimatch' ? (
          <MartiniMatchBoard key={`martinimatch-${gameKey}`} />
        ) : activeGame === 'manjual' ? (
          <ManjualBoard key={`manjual-${gameKey}`} />
        ) : activeGame === 'latcham' ? (
          <LatchamBoard key={`latcham-${gameKey}`} />
        ) : activeGame === 'geoffsgeometry' ? (
          <GeoffsGeometryBoard key={`geoffsgeometry-${gameKey}`} />
        ) : activeGame === 'greatwall' ? (
          <GreatWallBoard key={`greatwall-${gameKey}`} />
        ) : activeGame === 'samiam' ? (
          <SamIAmBoard key={`samiam-${gameKey}`} />
        ) : activeGame === 'oregontrail' ? (
          <OregonTrailBoard key={`oregontrail-${gameKey}`} />
        ) : (
          <SudokuBoard key={`sudoku-${gameKey}`} />
        )}
      </main>
      <Footer />
    </div>
  )
}

export default App
