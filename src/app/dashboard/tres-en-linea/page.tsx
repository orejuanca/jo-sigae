'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6],
]

type Cell = 'X' | 'O' | null
type Difficulty = 'facil' | 'dificil'

function checkWinner(board: Cell[]): { winner: Cell; line: number[] } | null {
  for (const [a,b,c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: [a,b,c] }
    }
  }
  return null
}

function isDraw(board: Cell[]): boolean {
  return board.every(c => c !== null) && !checkWinner(board)
}

function minimax(board: Cell[], isMax: boolean, depth: number): number {
  const result = checkWinner(board)
  if (result) return result.winner === 'O' ? 10 - depth : depth - 10
  if (board.every(c => c !== null)) return 0

  if (isMax) {
    let best = -Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O'
        best = Math.max(best, minimax(board, false, depth + 1))
        board[i] = null
      }
    }
    return best
  } else {
    let best = Infinity
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X'
        best = Math.min(best, minimax(board, true, depth + 1))
        board[i] = null
      }
    }
    return best
  }
}

function getBestMove(board: Cell[]): number {
  let bestScore = -Infinity
  let bestMove = -1
  for (let i = 0; i < 9; i++) {
    if (!board[i]) {
      board[i] = 'O'
      const score = minimax(board, false, 0)
      board[i] = null
      if (score > bestScore) {
        bestScore = score
        bestMove = i
      }
    }
  }
  return bestMove
}

function getRandomMove(board: Cell[]): number {
  const empty = board.map((c, i) => c === null ? i : -1).filter(i => i >= 0)
  return empty[Math.floor(Math.random() * empty.length)]
}

export default function TresEnLineaPage() {
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null))
  const [xIsNext, setXIsNext] = useState(true)
  const [score, setScore] = useState({ x: 0, o: 0, draws: 0 })
  const [difficulty, setDifficulty] = useState<Difficulty>('dificil')
  const [mode, setMode] = useState<'pvp' | 'ia'>('ia')
  const [winLine, setWinLine] = useState<number[]>([])
  const aiThinking = useRef(false)

  const resetBoard = useCallback(() => {
    setBoard(Array(9).fill(null))
    setXIsNext(true)
    setWinLine([])
    aiThinking.current = false
  }, [])

  const resetScore = useCallback(() => {
    setScore({ x: 0, o: 0, draws: 0 })
    resetBoard()
  }, [resetBoard])

  const handleClick = useCallback((i: number) => {
    setBoard(prev => {
      if (prev[i] || checkWinner(prev) || isDraw(prev)) return prev
      if (mode === 'ia' && !xIsNext) return prev

      const newBoard = [...prev]
      newBoard[i] = xIsNext ? 'X' : 'O'

      const result = checkWinner(newBoard)
      if (result) {
        setWinLine(result.line)
        setScore(s => ({
          ...s,
          [result.winner === 'X' ? 'x' : 'o']: (s[result.winner === 'X' ? 'x' : 'o'] as number) + 1,
        }))
        setXIsNext(!xIsNext)
        return newBoard
      }
      if (isDraw(newBoard)) {
        setScore(s => ({ ...s, draws: s.draws + 1 }))
        setXIsNext(!xIsNext)
        return newBoard
      }

      setXIsNext(!xIsNext)
      return newBoard
    })
  }, [mode, xIsNext])

  // AI move effect
  useEffect(() => {
    if (mode !== 'ia' || xIsNext || aiThinking.current) return
    const result = checkWinner(board)
    const draw = isDraw(board)
    if (result || draw) return

    aiThinking.current = true
    const timer = setTimeout(() => {
      const boardCopy = [...board]
      const move = difficulty === 'dificil' ? getBestMove(boardCopy) : getRandomMove(boardCopy)
      if (move < 0) { aiThinking.current = false; return }

      const newBoard = [...board]
      newBoard[move] = 'O'
      setBoard(newBoard)

      const res = checkWinner(newBoard)
      if (res) {
        setWinLine(res.line)
        setScore(s => ({ ...s, o: s.o + 1 }))
      } else if (isDraw(newBoard)) {
        setScore(s => ({ ...s, draws: s.draws + 1 }))
      }
      setXIsNext(true)
      aiThinking.current = false
    }, 400)
    return () => clearTimeout(timer)
  }, [mode, xIsNext, board, difficulty])

  const result = checkWinner(board)
  const draw = isDraw(board)
  const gameOver = !!result || draw
  const aiTurn = mode === 'ia' && !xIsNext && !gameOver

  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 px-4">
        {/* Title */}
        <h1 className="text-4xl font-bold tracking-tight">
          Tres en Línea
        </h1>

        {/* Mode + Difficulty */}
        <div className="flex gap-3 flex-wrap justify-center">
          <div className="flex gap-1.5 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => { setMode('ia'); resetScore() }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'ia' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              vs IA
            </button>
            <button
              onClick={() => { setMode('pvp'); resetScore() }}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'pvp' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              2 Jugadores
            </button>
          </div>

          {mode === 'ia' && (
            <div className="flex gap-1.5 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => { setDifficulty('facil'); resetBoard() }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${difficulty === 'facil' ? 'bg-green-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                Fácil
              </button>
              <button
                onClick={() => { setDifficulty('dificil'); resetBoard() }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${difficulty === 'dificil' ? 'bg-red-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
              >
                Difícil
              </button>
            </div>
          )}
        </div>

        {/* Scoreboard */}
        <div className="flex items-center gap-6 text-sm">
          <div className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all ${!gameOver && xIsNext ? 'bg-blue-600/20 ring-1 ring-blue-500' : ''}`}>
            <span className={`text-2xl font-bold ${mode === 'ia' ? 'text-blue-400' : 'text-blue-300'}`}>X</span>
            <span className="text-gray-400 text-xs">
              {mode === 'ia' ? 'Tú' : 'Jugador 1'}
            </span>
            <span className="text-lg font-bold text-white">{score.x}</span>
          </div>
          <div className="flex flex-col items-center px-3 py-2">
            <span className="text-gray-500 text-xs">Empates</span>
            <span className="text-lg font-bold text-gray-300">{score.draws}</span>
          </div>
          <div className={`flex flex-col items-center px-4 py-2 rounded-lg transition-all ${!gameOver && !xIsNext ? 'bg-red-600/20 ring-1 ring-red-500' : ''}`}>
            <span className={`text-2xl font-bold ${mode === 'ia' ? 'text-red-400' : 'text-red-300'}`}>O</span>
            <span className="text-gray-400 text-xs">
              {mode === 'ia' ? 'IA' : 'Jugador 2'}
            </span>
            <span className="text-lg font-bold text-white">{score.o}</span>
          </div>
        </div>

        {/* Status */}
        <div className="h-8 flex items-center">
          {result && (
            <Badge variant={result.winner === 'X' ? 'default' : 'destructive'} className="text-base px-4 py-1 animate-pulse">
              {mode === 'ia'
                ? (result.winner === 'X' ? '¡Ganaste!' : 'La IA gana')
                : `¡${result.winner} gana!`}
            </Badge>
          )}
          {draw && (
            <Badge variant="secondary" className="text-base px-4 py-1">
              Empate
            </Badge>
          )}
          {!gameOver && (
            <span className="text-sm text-gray-400">
              {aiTurn ? 'La IA piensa...' : `Turno de ${xIsNext ? 'X' : 'O'}`}
            </span>
          )}
        </div>

        {/* Board */}
        <div className="grid grid-cols-3 gap-2.5 p-4 bg-gray-800/50 rounded-2xl backdrop-blur border border-gray-700/50">
          {board.map((cell, i) => {
            const isWinCell = winLine.includes(i)
            return (
              <button
                key={i}
                onClick={() => handleClick(i)}
                disabled={!!cell || gameOver || aiTurn}
                className={`
                  w-28 h-28 sm:w-32 sm:h-32 rounded-xl text-5xl sm:text-6xl font-black
                  flex items-center justify-center
                  transition-all duration-200
                  ${!cell && !gameOver && !aiTurn ? 'hover:bg-gray-700/50 cursor-pointer active:scale-95' : 'cursor-default'}
                  ${cell === 'X' ? 'text-blue-400 drop-shadow-[0_0_12px_rgba(96,165,250,0.5)]' : ''}
                  ${cell === 'O' ? 'text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.5)]' : ''}
                  ${isWinCell ? 'bg-yellow-500/20 ring-2 ring-yellow-400 scale-105' : ''}
                  ${!cell ? 'bg-gray-800/80' : 'bg-gray-800'}
                  border border-gray-700/60
                `}
              >
                {cell}
              </button>
            )
          })}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <Button onClick={resetBoard} variant="outline" size="sm">
            Nueva Partida
          </Button>
          <Button onClick={resetScore} variant="ghost" size="sm" className="text-gray-500">
            Reiniciar Marcador
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
