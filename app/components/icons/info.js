/**
 * CSS Variables:
 *
 * --info-stroke-circle-color
 *
 * --info-stroke-line-color
 */
const Info = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="feather feather-info"
  >
    <circle
      cx="12"
      cy="12"
      r="10"
      stroke="var(--info-stroke-circle-color, currentColor)"
    ></circle>
    <line
      x1="12"
      y1="16"
      x2="12"
      y2="12"
      stroke="var(--info-stroke-line-color, currentColor)"
    ></line>
    <line
      x1="12"
      y1="8"
      x2="12.01"
      y2="8"
      stroke="var(--info-stroke-line-color, currentColor)"
    ></line>
  </svg>
)

export default Info
