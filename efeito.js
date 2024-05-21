var canvas = document.getElementById("canvas");

// Define a largura e altura do canvas com base no tamanho da janela
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Inicializa o contexto WebGL
var gl = canvas.getContext('webgl');
if(!gl){
  console.error("Não foi possível inicializar o WebGL.");
}

// Tempo
var time = 0.0;

//************** Fontes dos shaders **************

// Fonte do vértice (vertex) shader
var vertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

// Fonte do fragmento (fragment) shader
var fragmentSource = `
precision highp float;
uniform float width;
uniform float height;
vec2 resolution = vec2(width, height);
uniform float time;
#define POINT_COUNT 8
vec2 points[POINT_COUNT];
const float speed = -0.5;
const float len = 0.25;
float intensity = 1.3;
float radius = 0.008;
//https://www.shadertoy.com/view/MlKcDD
//Signed distance to a quadratic bezier
float sdBezier(vec2 pos, vec2 A, vec2 B, vec2 C){    
  vec2 a = B - A;
  vec2 b = A - 2.0*B + C;
  vec2 c = a * 2.0;
  vec2 d = A - pos;
  float kk = 1.0 / dot(b,b);
  float kx = kk * dot(a,b);
  float ky = kk * (2.0*dot(a,a)+dot(d,b)) / 3.0;
  float kz = kk * dot(d,a);      
  float res = 0.0;
  float p = ky - kx*kx;
  float p3 = p*p*p;
  float q = kx*(2.0*kx*kx - 3.0*ky) + kz;
  float h = q*q + 4.0*p3;
  if(h >= 0.0){ 
    h = sqrt(h);
    vec2 x = (vec2(h, -h) - q) / 2.0;
    vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
    float t = uv.x + uv.y - kx;
    t = clamp( t, 0.0, 1.0 );
    // 1 root
    vec2 qos = d + (c + b*t)*t;
    res = length(qos);
  }else{
    float z = sqrt(-p);
    float v = acos( q/(p*z*2.0) ) / 3.0;
    float m = cos(v);
    float n = sin(v)*1.732050808;
    vec3 t = vec3(m + m, -n - m, n - m) * z - kx;
    t = clamp( t, 0.0, 1.0 );
    // 3 roots
    vec2 qos = d + (c + b*t.x)*t.x;
    float dis = dot(qos,qos);
        
    res = dis;
    qos = d + (c + b*t.y)*t.y;
    dis = dot(qos,qos);
    res = min(res,dis);
    
    qos = d + (c + b*t.z)*t.z;
    dis = dot(qos,qos);
    res = min(res,dis);
    res = sqrt( res );
  }
    
  return res;
}
//http://mathworld.wolfram.com/HeartCurve.html
vec2 getHeartPosition(float t){
  return vec2(16.0 * sin(t) * sin(t) * sin(t),
              -(13.0 * cos(t) - 5.0 * cos(2.0*t)
              - 2.0 * cos(3.0*t) - cos(4.0*t)));
}
//https://www.shadertoy.com/view/3s3GDn
float getGlow(float dist, float radius, float intensity){
  return pow(radius/dist, intensity);
}
float getSegment(float t, vec2 pos, float offset, float scale){
  for(int i = 0; i < POINT_COUNT; i++){
    points[i] = getHeartPosition(offset + float(i)*len + fract(speed * t) * 6.28);
  }
    
  vec2 c = (points[0] + points[1]) / 2.0;
  vec2 c_prev;
  float dist = 10000.0;
    
  for(int i = 0; i < POINT_COUNT-1; i++){
    //https://tinyurl.com/y2htbwkm
    c_prev = c;
    c = (points[i] + points[i+1]) / 2.0;
    dist = min(dist, sdBezier(pos, scale * c_prev, scale * points[i], scale * c));
  }
  return max(0.0, dist);
}
void main(){
  vec2 uv = gl_FragCoord.xy/resolution.xy;
  float widthHeightRatio = resolution.x/resolution.y;
  vec2 centre = vec2(0.5, 0.5);
  vec2 pos = centre - uv;
  pos.y /= widthHeightRatio;
  //Shift upwards to centre heart
  pos.y += 0.02;
  float scale = 0.000015 * height;
  
  float t = time;
    
  //Get first segment
  float dist = getSegment(t, pos, 0.0, scale);
  float glow = getGlow(dist, radius, intensity);
  
  vec3 col = vec3(0.0);
  //White core
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  //Pink glow
  col += glow * vec3(1.0,0.05,0.3);
  
  //Get second segment
  dist = getSegment(t, pos, 3.4, scale);
  glow = getGlow(dist, radius, intensity);
  
  //White core
  col += 10.0*vec3(smoothstep(0.003, 0.001, dist));
  //Blue glow
  col += glow * vec3(0.1,0.4,1.0);
        
  //Tone mapping
  col = 1.0 - exp(-col);
  //Gamma
  col = pow(col, vec3(0.4545));
  //Output to screen
  gl_FragColor = vec4(col,1.0);
}
`;

//************** Funções utilitárias **************

// Redimensiona o canvas quando a janela é redimensionada
window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  // Define a largura e altura do canvas com base no tamanho da janela
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

//************** Funções utilitárias **************

// Redimensiona o canvas quando a janela é redimensionada
window.addEventListener('resize', onWindowResize, false);

function onWindowResize(){
  // Define a largura e altura do canvas com base no tamanho da janela
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  // Define a visualização (viewport) do WebGL para abranger todo o canvas
  gl.viewport(0, 0, canvas.width, canvas.height);
  // Atualiza os uniformes de largura e altura no programa do shader
  gl.uniform1f(widthHandle, window.innerWidth);
  gl.uniform1f(heightHandle, window.innerHeight);
}

// Compila o shader e combina com o código-fonte
function compileShader(shaderSource, shaderType){
  var shader = gl.createShader(shaderType);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
  if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
    throw "Falha na compilação do shader: " + gl.getShaderInfoLog(shader);
  }
  return shader;
}

// Função utilitária para verificar se um atributo está presente no programa
function getAttribLocation(program, name) {
  var attributeLocation = gl.getAttribLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Não foi possível encontrar o atributo ' + name + '.';
  }
  return attributeLocation;
}

// Função utilitária para verificar se um uniforme está presente no programa
function getUniformLocation(program, name) {
  var attributeLocation = gl.getUniformLocation(program, name);
  if (attributeLocation === -1) {
    throw 'Não foi possível encontrar o uniforme ' + name + '.';
  }
  return attributeLocation;
}

//************** Criação dos shaders **************

// Cria os shaders de vértice e fragmento
var vertexShader = compileShader(vertexSource, gl.VERTEX_SHADER);
var fragmentShader = compileShader(fragmentSource, gl.FRAGMENT_SHADER);

// Cria o programa de shaders
var program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

gl.useProgram(program);

// Configura um retângulo que cobre todo o canvas
var vertexData = new Float32Array([
  -1.0,  1.0,   // canto superior esquerdo
  -1.0, -1.0,   // canto inferior esquerdo
   1.0,  1.0,   // canto superior direito
   1.0, -1.0,   // canto inferior direito
]);

// Cria o buffer de vértices
var vertexDataBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

// Define o layout dos dados no buffer de vértices
var positionHandle = getAttribLocation(program, 'position');

gl.enableVertexAttribArray(positionHandle);
gl.vertexAttribPointer(positionHandle,
  2,        // posição é um vec2 (2 valores por componente)
  gl.FLOAT, // cada componente é um float
  false,    // não normaliza os valores
  2 * 4,    // dois componentes float de 4 bytes por vértice (float de 32 bits tem 4 bytes)
  0         // quantos bytes dentro do buffer começar
);

// Define os uniformes
var timeHandle = getUniformLocation(program, 'time');
var widthHandle = getUniformLocation(program, 'width');
var heightHandle = getUniformLocation(program, 'height');

gl.uniform1f(widthHandle, window.innerWidth);
gl.uniform1f(heightHandle, window.innerHeight);

var lastFrame = Date.now();
var thisFrame;

function draw(){
  // Atualiza o tempo
  thisFrame = Date.now();
  time += (thisFrame - lastFrame)/1000; 
  lastFrame = thisFrame;

  // Envia os uniformes para o programa
  gl.uniform1f(timeHandle, time);
  // Desenha uma tira de triângulos conectando os vértices 0-4
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  requestAnimationFrame(draw);
}

draw();