function DeleteIcon() {
  return (
    <svg className="task-action-icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 4.5h10M6 2h4l.75 2.5M4.5 4.5l.6 9h5.8l.6-9M6.5 7v4M9.5 7v4" />
    </svg>
  )
}

export function DeleteAction({label, onClick, disabled}: {label:string; onClick:()=>void; disabled?:boolean}) {
  return <button type="button" className="task-text-action task-icon-action task-delete-action"
    title={label} aria-label={label} disabled={disabled} onClick={onClick}><DeleteIcon /></button>
}
