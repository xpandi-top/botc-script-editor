import { useCallback, useRef } from 'react'
import type React from 'react'

export interface DrawState {
  color: string
  size: number
  tool: 'pen' | 'eraser'
}

export function useCommunicationCanvas(drawState: DrawState) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const history = useRef<ImageData[]>([])

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * dpr, y: (t.clientY - rect.top) * dpr }
    }
    return {
      x: (e.clientX - rect.left) * dpr,
      y: (e.clientY - rect.top) * dpr,
    }
  }

  const saveHistory = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    history.current = [...history.current.slice(-19), ctx.getImageData(0, 0, canvas.width, canvas.height)]
  }, [])

  const undo = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || history.current.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const last = history.current.pop()!
    ctx.putImageData(last, 0, 0)
  }, [])

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    saveHistory()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [saveHistory])

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()
    saveHistory()
    isDrawing.current = true
    lastPos.current = getPos(e)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveHistory, drawState])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e) e.preventDefault()
    if (!isDrawing.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const pos = getPos(e)
    if (!pos || !lastPos.current) return
    const dpr = window.devicePixelRatio || 1
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawState.tool === 'eraser' ? '#ffffff' : drawState.color
    ctx.lineWidth   = drawState.size * dpr * (drawState.tool === 'eraser' ? 4 : 1)
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawState])

  const endDraw = useCallback(() => {
    isDrawing.current = false
    lastPos.current = null
  }, [])

  return { canvasRef, initCanvas, clearCanvas, undo, startDraw, draw, endDraw }
}
