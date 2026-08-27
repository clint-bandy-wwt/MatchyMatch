// Smoke test: every game board should mount, render, and unmount without
// throwing. This is deliberately shallow — it exists to catch "the game is a
// blank screen / white screen of death" bugs (bad imports, undefined data
// lookups, crashes in initial state or effects) across the whole game list
// in one run, not to verify each game's rules are correct.
import { render, cleanup } from '@testing-library/react';
import GameBoard from '../components/GameBoard';
import WordleBoard from '../components/wordle/WordleBoard';
import NumberCrunchBoard from '../components/numbercrunch/NumberCrunchBoard';
import CrosswordBoard from '../components/crossword/CrosswordBoard';
import WordChainBoard from '../components/wordchain/WordChainBoard';
import ScrambleBoard from '../components/scramble/ScrambleBoard';
import AnagramBoard from '../components/anagram/AnagramBoard';
import SudokuBoard from '../components/sudoku/SudokuBoard';
import TriviaBoard from '../components/trivia/TriviaBoard';
import MemoryBoard from '../components/memory/MemoryBoard';
import TypeRaceBoard from '../components/typerace/TypeRaceBoard';
import WordSearchBoard from '../components/wordsearch/WordSearchBoard';
import MathQuizBoard from '../components/mathquiz/MathQuizBoard';
import HangmanBoard from '../components/hangman/HangmanBoard';
import SnakeBoard from '../components/snake/SnakeBoard';
import SpellingBeeBoard from '../components/spellingbee/SpellingBeeBoard';
import Game2048Board from '../components/game2048/Game2048Board';
import MinesweeperBoard from '../components/minesweeper/MinesweeperBoard';
import TicTacToeBoard from '../components/tictactoe/TicTacToeBoard';
import BarrysBlitz from '../components/BarrysBlitz';
import GregsEggBoard from '../components/gregsEgg/GregsEggBoard';
import NathanielNinjaBoard from '../components/nathanielninja/NathanielNinjaBoard';
import NickOfTTimeBoard from '../components/nickofttime/NickOfTTimeBoard';
import ColourClashBoard from '../components/colourclash/ColourClashBoard';
import FlipFlopBoard from '../components/flipflop/FlipFlopBoard';
import DiceRollBoard from '../components/diceroll/DiceRollBoard';
import FlipCoinBoard from '../components/flipcoin/FlipCoinBoard';
import PuppyFetchBoard from '../components/puppyfetch/PuppyFetchBoard';
import CatMatchBoard from '../components/catmatch/CatMatchBoard';
import ChessBoard from '../components/chess/ChessBoard';
import KennyKenoBoard from '../components/kennykeno/KennyKenoBoard';
import RochellesSpinnerBoard from '../components/rochellespinner/RochellesSpinnerBoard';
import MartiniMatchBoard from '../components/martinimatch/MartiniMatchBoard';
import ManjualBoard from '../components/manjual/ManjualBoard';
import LatchamBoard from '../components/latcham/LatchamBoard';
import GeoffsGeometryBoard from '../components/geoffsgeometry/GeoffsGeometryBoard';
import GreatWallBoard from '../components/greatwall/GreatWallBoard';
import SamIAmBoard from '../components/samiam/SamIAmBoard';
import SpaceInvadersBoard from '../components/spaceinvaders/SpaceInvadersBoard';
import OregonTrailBoard from '../components/oregontrail/OregonTrailBoard';
import PongBoard from '../components/pong/PongBoard';
import EuchreBoard from '../components/euchre/EuchreBoard';
import { puzzles } from '../data/puzzles';

// Boards reachable from App.jsx's game switch, keyed by the same id used in
// GamePicker's GAMES list / App.jsx's activeGame value.
const BOARDS = [
  ['matchy', () => <GameBoard puzzle={puzzles[0]} onNewGame={() => {}} />],
  ['wordle', () => <WordleBoard />],
  ['crunch', () => <NumberCrunchBoard />],
  ['cross', () => <CrosswordBoard />],
  ['chain', () => <WordChainBoard />],
  ['scramble', () => <ScrambleBoard />],
  ['anagram', () => <AnagramBoard />],
  ['sudoku', () => <SudokuBoard />],
  ['trivia', () => <TriviaBoard />],
  ['memory', () => <MemoryBoard />],
  ['puppyfetch', () => <PuppyFetchBoard />],
  ['catmatch', () => <CatMatchBoard />],
  ['typerace', () => <TypeRaceBoard />],
  ['wordsearch', () => <WordSearchBoard />],
  ['mathquiz', () => <MathQuizBoard />],
  ['hangman', () => <HangmanBoard />],
  ['snake', () => <SnakeBoard dark={false} />],
  ['spellingbee', () => <SpellingBeeBoard />],
  ['2048', () => <Game2048Board />],
  ['minesweeper', () => <MinesweeperBoard />],
  ['tictactoe', () => <TicTacToeBoard />],
  ['barrysblitz', () => <BarrysBlitz />],
  ['gregsegg', () => <GregsEggBoard />],
  ['nathanielninja', () => <NathanielNinjaBoard />],
  ['nickofttime', () => <NickOfTTimeBoard />],
  ['colourclash', () => <ColourClashBoard />],
  ['flipflop', () => <FlipFlopBoard />],
  ['diceroll', () => <DiceRollBoard />],
  ['flipcoin', () => <FlipCoinBoard />],
  ['kennykeno', () => <KennyKenoBoard />],
  ['chess', () => <ChessBoard />],
  ['rochellespinner', () => <RochellesSpinnerBoard />],
  ['martinimatch', () => <MartiniMatchBoard />],
  ['manjual', () => <ManjualBoard />],
  ['latcham', () => <LatchamBoard />],
  ['geoffsgeometry', () => <GeoffsGeometryBoard />],
  ['greatwall', () => <GreatWallBoard />],
  ['samiam', () => <SamIAmBoard />],
  ['spaceinvaders', () => <SpaceInvadersBoard />],
  ['oregontrail', () => <OregonTrailBoard />],
  ['pong', () => <PongBoard />],
  ['euchre', () => <EuchreBoard />],
];

describe('game board smoke tests', () => {
  afterEach(() => {
    cleanup();
    jest.clearAllTimers();
  });

  test.each(BOARDS)('%s renders without throwing', (_id, renderBoard) => {
    expect(() => render(renderBoard())).not.toThrow();
  });
});
