import { Fragment, createContext, useState, useContext, useMemo, useReducer } from 'react';
import './App.css';

const WIDTH = 4;
const HEIGHT = 3;
const PLAYER_A_INIT_COLOR = '#c96c54';
const PLAYER_B_INIT_COLOR = '#6bde99';

const range = n => Array(n).fill().map((_, i) => i)
const matrix = (w, h, f) => range(h).map(j => range(w).map(i => f(j, i)))
const updateMatrix = (m, j, i, v) => ([
  ...m.slice(0, j),
  [...m[j].slice(0, i), v, ...m[j].slice(i + 1)],
  ...m.slice(j + 1),
])
const sum = items => items.reduce((acc, x) => acc + x, 0)

const PLAYER_A = 'PLAYER_A';
const PLAYER_B = 'PLAYER_B';
const TIE = 'TIE';
const MAX_SCORE = WIDTH * HEIGHT;

const initPlayers = {
  [PLAYER_A]: PLAYER_A_INIT_COLOR,
  [PLAYER_B]: PLAYER_B_INIT_COLOR,
}

const initState = {
  player: PLAYER_A,
  horizonals: matrix(WIDTH, HEIGHT + 1, () => null),
  verticals: matrix(WIDTH + 1, HEIGHT, () => null),
  cells: matrix(WIDTH, HEIGHT, () => null),
  scores: {
    [PLAYER_A]: 0,
    [PLAYER_B]: 0,
  },
  winner: null,
}

const cellOccupied = (state, y, x) => (
  state.horizonals[y][x] && state.horizonals[y+1][x] && 
  state.verticals[y][x] && state.verticals[y][x+1]
)
const reduceCells = (state, player, coordinates) => {
  const occupyingCells = coordinates
    .filter(([y, x]) => x >= 0 && y >= 0 && x < WIDTH && y < HEIGHT)
    .filter(([y, x]) => cellOccupied(state, y, x));
  if (occupyingCells.length === 0) return state;
  return {
    ...state,
    cells: occupyingCells.reduce((cs, [y, x]) => updateMatrix(cs, y, x, player), state.cells),
    occupyingCells,
  };
}

const reduceWinner = scores => {
  const scoreEntries = (scores |> Object.entries).sort((a, b) => b[1] - a[1])
  if ((scoreEntries.map(s => s[1]) |> sum) < MAX_SCORE) return null;
  if (MAX_SCORE / 2 === scoreEntries[0][1]) return TIE;
  return scoreEntries[0][0];
}
const reducePlayer = ({ occupyingCells, ...state }) => {
  if ((occupyingCells?.length || 0) === 0) {
    return {
      ...state,
      player: state.player === PLAYER_A ? PLAYER_B : PLAYER_A,
    }
  }

  const scores = {
    ...state.scores,
    [state.player]: state.scores[state.player] + occupyingCells.length,
  }
  return {
    ...state,
    scores,
    winner: reduceWinner(scores),
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'occupy-horizonal':
      if (state.horizonals[action.j][action.i]) return state;
      return {
        ...state,
        horizonals: updateMatrix(state.horizonals, action.j, action.i, state.player),
      }
        |> (_ => reduceCells(_, state.player, [[action.j, action.i], [action.j - 1, action.i]]))
        |> reducePlayer;
    case 'occupy-vertical':
      if (state.verticals[action.j][action.i]) return state;
      return {
        ...state,
        verticals: updateMatrix(state.verticals, action.j, action.i, state.player),
      }
        |> (_ => reduceCells(_, state.player, [[action.j, action.i], [action.j, action.i - 1]]))
        |> reducePlayer;
    case 'reset':
      return initState;
    default:
      return state;
  }
}

const GameContext = createContext('squaring-game');
const PlayerContext = createContext('player');

function PlayerColor({ player }) {
  const [playerColors, setPlayerColors] = useContext(PlayerContext);
  return (
    <input type='color' value={playerColors[player]} onChange={e => setPlayerColors({
      ...playerColors, [player]: e.target.value,
    })} />
  )
}

function ScoreBoard() {
  const { state: { player, scores, winner }, dispatch } = useContext(GameContext);
  const [playerColors] = useContext(PlayerContext);
  const highLightedPlayer = winner || player;

  return (
    <>
      { winner && (
        <>
          <button onClick={() => dispatch({ type: 'reset' })}>
            Play again
          </button>
          <h1 className='winner' style={winner !== TIE ? { background: playerColors[winner] } : null}>
            { winner === TIE ? 'Tie' : 'Winner' }
          </h1>
        </>
      ) }
      <div className='players'>
        { [PLAYER_A, PLAYER_B].map(p => (
          <div key={p} className='' style={highLightedPlayer === p ? {background: playerColors[p]} : null}>
            <PlayerColor player={p} />
            <div>{ scores[p] }</div>
          </div>
        )) }
      </div>
    </>
  )
}

function Horizonal({ j, i }) {
  const { state: { horizonals }, occupyHorizonals } = useContext(GameContext);
  const [playerColors] = useContext(PlayerContext);
  return (
    <div className='horizonal' style={{ background: playerColors[horizonals[j][i]] }} onClick={occupyHorizonals[j][i]} />
  );
}
function Vertical({ j, i }) {
  const { state: { verticals }, occupyVerticals } = useContext(GameContext);
  const [playerColors] = useContext(PlayerContext);
  return (
    <div className='vertical' style={{ background: playerColors[verticals[j][i]] }} onClick={occupyVerticals[j][i]} />
  );
}
function Cell({ y, x }) {
  const { state: { cells } } = useContext(GameContext);
  const [playerColors] = useContext(PlayerContext);
  return (
    <div className='cell' style={{ background: playerColors[cells[y][x]] }} />
  );
}

function App() {
  const [playerColors, setPlayerColors] = useState(initPlayers)
  const [state, dispatch] = useReducer(reducer, initState);
  // console.log(state)

  const occupyHorizonals = useMemo(() => (
    matrix(WIDTH, HEIGHT + 1, (j, i) => () => dispatch({ type: 'occupy-horizonal', i, j }))
  ), [])
  const occupyVerticals = useMemo(() => (
    matrix(WIDTH + 1, HEIGHT, (j, i) => () => dispatch({ type: 'occupy-vertical', i, j }))
  ), [])

  return (
    <div className='squaring-game-app'>
      <PlayerContext.Provider value={[playerColors, setPlayerColors]}>
        <GameContext.Provider value={{ state, occupyHorizonals, occupyVerticals, dispatch }}>
          <ScoreBoard />
          <main className='board'>
            { range(HEIGHT).map(y => (
              <Fragment key={y}>
                <div className='line'>
                  { range(WIDTH).map(x => (
                    <Fragment key={x}>
                      <div className='dot' />
                      <Horizonal j={y} i={x} />
                    </Fragment>
                  )) }
                  <div className='dot' />
                </div>
                <div className='line'>
                  { range(WIDTH).map(x => (
                    <Fragment key={x}>
                      <Vertical j={y} i={x} />
                      <Cell y={y} x={x} />
                    </Fragment>
                  )) }
                  <Vertical j={y} i={WIDTH} />
                </div>
              </Fragment>
            )) }
            <div className='line'>
              { range(WIDTH).map(x => (
                <Fragment key={x}>
                  <div className='dot' />
                  <Horizonal j={HEIGHT} i={x} />
                </Fragment>
              )) }
              <div className='dot' />
            </div>
          </main>
        </GameContext.Provider>
      </PlayerContext.Provider>
    </div>
  );
}

export default App;
