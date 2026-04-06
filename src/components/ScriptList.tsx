type ScriptListProps = {
  title: string
  isActive: boolean
  onSelect: () => void
}

export function ScriptList({ title, isActive, onSelect }: ScriptListProps) {
  return (
    <button
      className={`script-card${isActive ? ' script-card--active' : ''}`}
      onClick={onSelect}
      type="button"
    >
      <span className="script-card__eyebrow">Script</span>
      <strong>{title}</strong>
    </button>
  )
}
