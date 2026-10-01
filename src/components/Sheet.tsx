import Icon from './Icon'
import { useRef, useState, type PointerEvent, type ReactNode } from 'react'

interface Props {
  onClose: () => void
  children: ReactNode
  /** Modal sheets dim the globe and block it; others leave it interactive. */
  modal?: boolean
  tall?: boolean
}

const DISMISS_PX = 90

export default function Sheet({ onClose, children, modal, tall }: Props) {
  const [closing, setClosing] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)
  const backdropPressed = useRef(false)

  const close = () => {
    if (closing) return
    setClosing(true)
    setTimeout(onClose, 220)
  }

  const onDown = (e: PointerEvent) => {
    start.current = e.clientY
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    if (start.current !== null) setDrag(Math.max(0, e.clientY - start.current))
  }
  const onUp = () => {
    start.current = null
    if (drag > DISMISS_PX) close()
    else setDrag(0)
  }

  return (
    <>
      {modal && (
        <div
          className={`backdrop ${closing ? 'out' : ''}`}
          // Only close for a tap that started on the backdrop, not the trailing click
          // of the tap that opened this sheet.
          onPointerDown={() => (backdropPressed.current = true)}
          onClick={() => backdropPressed.current && close()}
        />
      )}
      <section
        className={`sheet ${modal ? '' : 'docked'} ${tall ? 'tall' : ''} ${closing ? 'out' : ''}`}
        style={drag ? { transform: `translateY(${drag}px)`, transition: 'none' } : undefined}
        role="dialog"
      >
        <div className="grabber" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span />
        </div>
        <button className="sheet-close" onClick={close} aria-label="关闭">
          <Icon name="close" size={16} />
        </button>
        <div className="sheet-body">{children}</div>
      </section>
    </>
  )
}
