// https://www.joshwcomeau.com/snippets/react-components/shift-by/
function ShiftBy({ x = 0, y = 0, children }) {
  return (
    <div
      style={{
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {children}
    </div>
  )
}
export default ShiftBy
