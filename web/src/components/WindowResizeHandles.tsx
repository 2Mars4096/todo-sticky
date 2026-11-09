import { getCurrentWindow } from '@tauri-apps/api/window'

type ResizeDirection = Parameters<ReturnType<typeof getCurrentWindow>['startResizeDragging']>[0]

const resizeHandles = [
  ['north', 'North'],
  ['east', 'East'],
  ['south', 'South'],
  ['west', 'West'],
  ['north-east', 'NorthEast'],
  ['south-east', 'SouthEast'],
  ['south-west', 'SouthWest'],
  ['north-west', 'NorthWest'],
] as const

export function WindowResizeHandles() {
  const startResize = (direction: ResizeDirection) => (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (event.button !== 0) return

    event.preventDefault()
    event.stopPropagation()
    void getCurrentWindow().startResizeDragging(direction).catch(error => {
      console.error('Window resize failed', error)
    })
  }

  return (
    <div className="window-resize-handles" aria-hidden="true">
      {resizeHandles.map(([name, direction]) => (
        <div
          key={name}
          className={`window-resize-handle ${name}`}
          onPointerDown={startResize(direction)}
        />
      ))}
    </div>
  )
}
