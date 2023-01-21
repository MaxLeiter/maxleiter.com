// answer: 0 is CSS,
const toCSSMarkdown = (text: string) => {
  return text
}
// body {

// }

const questions = [
  {
    isCSS3: false,
    markdown: toCSSMarkdown(`body {
    behavior: url("advancedhover.htc");
}`),
  },
  {
    isCSS3: false,
    markdown: toCSSMarkdown(`margin-top: 10px\\9;`),
  },
  {
    isCSS3: false,
    markdown: toCSSMarkdown(`*padding: 10px;`),
  },
  {
    isCSS3: false,
    markdown: toCSSMarkdown(`body {
    zoom: 1;
}`),
  },
  {
    isCSS3: true,
    markdown: toCSSMarkdown(`body {
    background-color: hsla(240, 60%, 70%, 0.4);
}`),
  },
  {
    isCSS3: true,
    markdown: toCSSMarkdown(`body {
    all: initial;
}`),
  },
  {
    isCSS3: true,
    markdown: toCSSMarkdown(`body {
    cross-fade( url(white.png) 0%, url(black.png) 100%);
}`),
  },
  {
    isCSS3: true,
    markdown: toCSSMarkdown(`.container {
    scroll-snap-type: y mandatory;
}

.container div {
    scroll-snap-align: start;
}`),
  },
  {
    isCSS3: true,
    markdown: toCSSMarkdown(`body {
    order: 1;
}`),
  },
]

export default questions
