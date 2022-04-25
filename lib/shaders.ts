// Largely from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
export function loadShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
) {
  const shader = gl.createShader(type)

  if (!shader) {
    console.error('createShader: failed to create shader')
    return
  }

  gl.shaderSource(shader, source)

  gl.compileShader(shader)
  // Commented out because of https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#dont_check_shader_compile_status_unless_linking_fails
  // if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
  //   console.error("createShader: an error occurred compiling the shaders: ", type, source, gl.getShaderInfoLog(shader));
  // }
  return shader
}

export function createProgram(
  gl: WebGLRenderingContext,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader
) {
  const program = gl.createProgram()

  if (!program) {
    console.error('createProgram: failed to create program')
    return
  }

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      'createProgram: unable to initialize the shader program: ',
      gl.getProgramInfoLog(program)
    )
  }

  return program
}

// Shaders largely from https://jameshfisher.com/2017/10/22/webgl-game-of-life/
export const stateShader = (size: number) => `
precision mediump float;
uniform sampler2D state;
void main(void) {
  vec2 coord = vec2(gl_FragCoord)/${size}.0;
  gl_FragColor = texture2D(state, coord);
  // gl_FragColor.a = 0.35;
}
`

export const textureShader = (size: number) => `
precision mediump float;
uniform sampler2D previousState;
int wasAlive(vec2 coord) {
  if (coord.x < 0.0 || ${size}.0 < coord.x || coord.y < 0.0 || ${size}.0 < coord.y) return 0;
  vec4 px = texture2D(previousState, coord/${size}.0);
  return px.r < 0.1 ? 0 : 1;
}
void main(void) {
  vec2 coord = vec2(gl_FragCoord);
  int aliveNeighbors =
    wasAlive(coord+vec2(-1.,-1.)) +
    wasAlive(coord+vec2(-1.,0.)) +
    wasAlive(coord+vec2(-1.,1.)) +
    wasAlive(coord+vec2(0.,-1.)) +
    wasAlive(coord+vec2(0.,1.)) +
    wasAlive(coord+vec2(1.,-1.)) +
    wasAlive(coord+vec2(1.,0.)) +
    wasAlive(coord+vec2(1.,1.));
  bool nowAlive = wasAlive(coord) == 1 ? 2 <= aliveNeighbors && aliveNeighbors <= 3 : 3 == aliveNeighbors;
  if (!nowAlive) gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  else if (nowAlive) {
    // Color gradually based on number of neighbors
    float color;
    if (aliveNeighbors == 1) color = 0.1;
    if (aliveNeighbors == 2) color = 0.2;
    else if (aliveNeighbors == 3) color = 0.4;
    else color = 0.0;
    gl_FragColor = vec4(color, color, color, 1.0);
    // set opacity to half
    gl_FragColor.a = 0.1;
  }
}
`
