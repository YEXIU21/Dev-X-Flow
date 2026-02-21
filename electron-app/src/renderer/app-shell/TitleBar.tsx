export function TitleBar({ title }: { title: string }) {
  return (
    <div className="title-bar">
      <div className="title-bar-title">{title}</div>
      <div className="title-bar-spacer" />
    </div>
  )
}
