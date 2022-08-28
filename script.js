/*********
* made by Matthias Hurrle (@atzedent)
*/

/** @type {HTMLCanvasElement} */
const canvas = window.canvas
const gl = canvas.getContext('webgl')
const dpr = window.devicePixelRatio
const touches = new Set()

const vertexSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

attribute vec2 position;

void main(void) {
    gl_Position = vec4(position, 0., 1.);
}
`
const fragmentSource = `
/*********
* made by Matthias Hurrle (@atzedent)
*/

#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float time;
uniform float tween;
uniform vec2 resolution;
uniform int pointerCount;

#define T 10. * time
#define P pointerCount > 0

mat2 rot( in float a) {
  float s = sin(a),
    c = cos(a);

  return mat2(c, -s, s, c);
}

vec3 hsv2rgb(vec3 c) {
  vec4 k = vec4(1., 2. / 3., 1. / 3., 3.);
  vec3 p = abs(fract(c.xxx + k.xyz) * 6. - k.www);

  return c.z * mix(k.xxx, clamp(p - k.xxx, .0, 1.), c.y);
}

float herp(float x) {
  float res =
    P ?
    3. * x * x - 2. * x * x * x :
    smoothstep(.95, .05, x);

  return res * tween;
}

void main() {
  float mx = max(resolution.x, resolution.y);
  vec2 uv = (
    2. * gl_FragCoord.xy - resolution.xy
  ) / mx;

  uv *= rot(T * .01) * (P ? .5 + .25 * sin(T * .025) : 1.) * max(.125, tween);
  float sdf = .5 + .5 *
    sin(
      T * .125 - 20. *
      smoothstep(
        .0,
        1.,
        length(uv - (.05 *
          herp(.125 + .5 * -cos(T * .025))) / uv)
      )
    );
  
  float h = (1. - .5 * uv * rot(-T * .025)).x;
  float s = sdf;
  
  vec3 color = hsv2rgb(
    vec3(h, 2. - s, exp(sdf))
  );

  gl_FragColor = vec4(color, 1.0);
}
`
let time;
let buffer;
let program;
let resolution;
let pointerCount;
let tween;
let delta = 1
let then = 0
let timestamp = 0
let vertices = []
let fn = increment
let toggle = 0

function resize() {
	const {
		innerWidth: width,
		innerHeight: height
	} = window

	canvas.width = width * dpr
	canvas.height = height * dpr

	gl.viewport(0, 0, width * dpr, height * dpr)
}

function compile(shader, source) {
	gl.shaderSource(shader, source)
	gl.compileShader(shader)

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		console.error(gl.getShaderInfoLog(shader))
	}
}

function setup() {
	const vs = gl.createShader(gl.VERTEX_SHADER)
	const fs = gl.createShader(gl.FRAGMENT_SHADER)

	program = gl.createProgram()

	compile(vs, vertexSource)
	compile(fs, fragmentSource)

	gl.attachShader(program, vs)
	gl.attachShader(program, fs)
	gl.linkProgram(program)

	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error(gl.getProgramInfoLog(program))
	}

	vertices = [
		-1.0,
		-1.0,
		1.0,
		-1.0,
		-1.0,
		1.0,
		-1.0,
		1.0,
		1.0,
		-1.0,
		1.0,
		1.0
	]

	buffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)

	const position = gl.getAttribLocation(program, "position")

	gl.enableVertexAttribArray(position)
	gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)

	time = gl.getUniformLocation(program, "time")
	tween = gl.getUniformLocation(program, 'tween')
	pointerCount = gl.getUniformLocation(program, 'pointerCount')
	resolution = gl.getUniformLocation(program, 'resolution')
}

function draw() {
	gl.clearColor(0, 0, 0, 1.)
	gl.clear(gl.COLOR_BUFFER_BIT)

	gl.useProgram(program)
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer)

	gl.uniform1f(time, timestamp)
	gl.uniform1f(tween, delta)
	gl.uniform1i(pointerCount, toggle)
	gl.uniform2f(
		resolution,
		canvas.width,
		canvas.height
	)
	gl.drawArrays(gl.TRIANGLES, 0, vertices.length * .5)
}

function increment() {
	delta = Math.min(1, delta + (timestamp - then) * .1)
}

function decrement() {
	delta = Math.max(0, delta - (timestamp - then) * .1)
}

function loop(now) {
	timestamp = now / 1000
	
	if (!touches.size && delta === 0) {
	  if (toggle > 0) {
	    toggle = 0
	  } else {
	    toggle = 1
	  }
	}

	fn()
	draw()

	requestAnimationFrame(loop)
}

function init() {
	setup()
	resize()
	loop(0)
}

/** @param {PointerEvent} e Pointer Event */
function handlePointing(e) {
	const start = touches.size === 0
	touches.add(e.pointerId)

	if (start) {
		then = timestamp
		fn = decrement
	}
}

/** @param {PointerEvent} e Pointer Event */
function handleStopPointing(e) {
	touches.delete(e.pointerId)

	if (!touches.size) {
		then = timestamp
		fn = increment
	}
}

document.body.onload = init

document.onpointerdown = handlePointing
document.onpointerup = handleStopPointing
document.onpointercancel = handleStopPointing

window.onresize = resize