/**
 * The scene's GLSL. A physically-ish lit room: GGX highlights over a
 * procedural softbox, a spotlight with a volumetric cone, a planar mirror
 * floor whose blur is chosen per pixel from the reflection's height, and a
 * velocity buffer for motion blur. Every pass writes linear HDR; the composite
 * tone-maps with ACES at the end.
 */

const HEAD = '#version 300 es\nprecision highp float;\n'
const COMMON = `
uniform vec3 uCam; uniform vec3 uSpotPos; uniform vec3 uSpotDir; uniform vec3 uSpotCol; uniform float uSpotCos;
uniform vec3 uAccent; uniform float uTime; uniform float uFloorY; uniform float uRefl;
float D_GGX(float nh,float a){float a2=a*a;float d=nh*nh*(a2-1.)+1.;return a2/(3.14159*d*d+1e-5);}
float spotAt(vec3 p,out vec3 L){vec3 v=uSpotPos-p;float d=length(v);L=v/d;float c=dot(-L,uSpotDir);return smoothstep(uSpotCos,mix(uSpotCos,1.,.55),c)*(30./(10.+d*d*.6));}
vec3 envMap(vec3 r){
  float top=smoothstep(.45,.85,r.y)*smoothstep(1.,.2,abs(r.x));
  float strip=exp(-pow((r.y-.16)/.045,2.))*smoothstep(1.,.15,abs(r.x+.15));
  float side=exp(-pow((r.x-.78)/.14,2.))*smoothstep(-.3,.4,r.y);
  float lowFloor=smoothstep(0.,-.4,r.y)*.04;
  return vec3(.012,.015,.02)+top*vec3(2.2,2.25,2.35)+strip*vec3(1.1,1.12,1.2)+side*(uAccent*1.4+.15)+lowFloor;
}
`
export const VS_MESH = `${HEAD}
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNor; layout(location=2) in vec3 aUV;
uniform mat4 uModel,uPrevModel,uVP,uPrevVP;
out vec3 vW; out vec3 vN; out vec3 vUV; out vec3 vL; out vec4 vCur; out vec4 vPrev;
void main(){vec4 w=uModel*vec4(aPos,1.);vW=w.xyz;vN=mat3(uModel)*aNor;vUV=aUV;vL=aPos;vCur=uVP*w;vPrev=uPrevVP*(uPrevModel*vec4(aPos,1.));gl_Position=vCur;}`
const OUT = `layout(location=0) out vec4 oC; layout(location=1) out vec4 oV;
in vec4 vCur; in vec4 vPrev;
vec2 velo(){return (vCur.xy/vCur.w-vPrev.xy/vPrev.w)*.5;}
`
export const FS_TILE = `${HEAD}${COMMON}${OUT}
in vec3 vW; in vec3 vN; in vec3 vUV; in vec3 vL;
uniform sampler2D uTex,uBack; uniform float uAlpha,uFocus,uSweep,uHover,uHasBack; uniform vec2 uHalf; uniform float uRad;
float rsd(vec2 p,vec2 h,float r){vec2 q=abs(p)-h+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
void main(){
  if(uRefl>.5&&vW.y<uFloorY) discard;
  if(uRefl<.5&&vW.y<uFloorY-.002) discard;
  vec3 N=normalize(vN); vec3 V=normalize(uCam-vW);
  if(dot(N,V)<0.&&vUV.z>1.5) N=-N;
  vec3 L; float sp=spotAt(vW,L); float ndl=max(dot(N,L),0.); float ndv=max(dot(N,V),1e-3);
  vec3 H=normalize(L+V); float nh=max(dot(N,H),0.); float lh=max(dot(L,H),0.);
  float Fs=.04+.96*pow(1.-lh,5.); float Fe=.04+.96*pow(1.-ndv,5.);
  vec3 col; float face=vUV.z;
  vec3 R=reflect(-V,N);
  if(face<.5){
    vec3 alb=texture(uTex,vUV.xy).rgb;
    float lum=dot(alb,vec3(.2126,.7152,.0722));
    alb=mix(vec3(lum),alb,mix(.5,1.,uFocus));
    col=alb*(.5+.42*ndl*sp)*mix(.42,1.08,uFocus)*(1.+uHover*.12);
    col+=uSpotCol*D_GGX(nh,.09)*Fs*.25*ndl*sp*1.6;
    col+=envMap(R)*Fe*1.1;
    // chromatic sweep
    if(uSweep>0.&&uSweep<1.){
      float d=vUV.x*.85+(1.-vUV.y)*.5; float p=mix(-.5,1.9,uSweep); float w=.04;
      vec3 band=vec3(exp(-pow((d-p+.035)/w,2.)),exp(-pow((d-p)/w,2.)),exp(-pow((d-p-.035)/w,2.)));
      float wide=exp(-pow((d-p)/.22,2.));
      col+=(band*.9+wide*.16)*(1.-uSweep*.4)*smoothstep(0.,.08,uSweep);
    }
    float sd=rsd(vL.xy,uHalf,uRad);
    col+=vec3(.8,.9,1.)*smoothstep(-.045,-.008,sd)*(.10+uFocus*.5);
  } else if(face<1.5){
    vec3 alb=uHasBack>.5?texture(uBack,vec2(1.-vUV.x,vUV.y)).rgb:vec3(.03,.035,.045);
    col=alb*(.8+.25*ndl*sp)+envMap(R)*Fe*.8;
  } else {
    vec3 base=vec3(.03,.034,.04);
    col=base*(.4+ndl*sp)+uSpotCol*D_GGX(nh,.2)*Fs*.25*ndl*sp*2.+envMap(R)*(.04+.96*pow(1.-ndv,3.))*.9;
    col+=uAccent*pow(1.-ndv,2.)*.35*uFocus;
  }
  oC=vec4(col,uAlpha); oV=vec4(velo(),0.,uAlpha);
  if(uRefl>.5) oC.a=clamp((vW.y-uFloorY)/2.6,0.,1.);
}`
export const FS_AV = `${HEAD}${COMMON}${OUT}
in vec3 vW; in vec3 vN; in vec3 vUV; in vec3 vL;
uniform vec3 uColor; uniform float uAlpha;
void main(){
  if(uRefl>.5&&vW.y<uFloorY) discard;
  vec3 N=normalize(vN); vec3 V=normalize(uCam-vW); vec3 L; float sp=spotAt(vW,L);
  float wrap=max((dot(N,L)+.35)/1.35,0.);
  vec3 hemi=mix(vec3(.05,.05,.055),vec3(.34,.38,.46),N.y*.5+.5);
  vec3 col=uColor*(hemi*.9+uSpotCol*wrap*sp*.62);
  float ndv=max(dot(N,V),0.); float rim=pow(1.-ndv,3.);
  col+=(uAccent*.6+.2)*rim*.28;
  vec3 H=normalize(L+V); col+=uSpotCol*D_GGX(max(dot(N,H),0.),.35)*.03*sp*max(dot(N,L),0.);
  oC=vec4(col,uAlpha); oV=vec4(velo(),0.,1.);
  if(uRefl>.5) oC.a=clamp((vW.y-uFloorY)/2.6,0.,1.);
}`
export const FS_GLOW = `${HEAD}${COMMON}${OUT}
in vec3 vW; in vec3 vN; in vec3 vUV; in vec3 vL;
uniform vec2 uHalf; uniform float uRad, uInt;
float rsd(vec2 p,vec2 h,float r){vec2 q=abs(p)-h+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
void main(){
  if(vW.y<uFloorY) discard;
  float sd=rsd(vL.xy,uHalf,uRad);
  float g=exp(-max(sd,0.)*7.)*smoothstep(-.25,0.,sd);
  oC=vec4((uAccent*1.3+.08)*g*uInt,0.); oV=vec4(0.);
}`
export const VS_FS = `${HEAD}out vec2 vUV; void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUV=p;gl_Position=vec4(p*2.-1.,0.,1.);}`
export const FS_BG = `${HEAD}${COMMON}
in vec2 vUV; uniform mat4 uInvVP,uPrevVP; uniform vec3 uAccent2;
layout(location=0) out vec4 oC; layout(location=1) out vec4 oV;
float h1(float n){return fract(sin(n)*43758.5453);}
void main(){
  vec4 w=uInvVP*vec4(vUV*2.-1.,1.,1.); vec3 d=normalize(w.xyz/w.w-uCam);
  float y=d.y; float az=atan(d.x,-d.z);
  vec3 col=mix(vec3(.0012,.0014,.002),vec3(.009,.011,.014),exp(-abs(y)*8.));
  col+=vec3(.014,.016,.02)*exp(-pow(az*1.8,2.))*exp(-pow((y-.03)*5.,2.));
  // ribbons
  for(int i=0;i<4;i++){
    float fi=float(i);
    float c=y-(.2+.075*fi)-.09*sin(az*(1.3+fi*.3)+uTime*(.04+fi*.011)+fi*1.7)-.035*sin(az*2.7-uTime*.06+fi);
    float band=exp(-c*c/(.00012+fi*.00008));
    float soft=exp(-c*c/.004);
    col+=mix(uAccent,uAccent2,fi/3.)*(band*.05+soft*.007)*smoothstep(1.6,.1,abs(az))*smoothstep(.0,.15,y);
  }
  // ceiling panels
  if(y>.12){ float pz=1./max(y,.05); vec2 q=d.xz*pz; vec2 g=abs(fract(q*.25)-.5); col+=vec3(.03,.035,.04)*smoothstep(.47,.5,max(g.x,g.y))*smoothstep(.12,.3,y)*exp(-length(q)*.05); }
  oC=vec4(col,1.);
  vec4 pc=uPrevVP*vec4(uCam+d*100.,1.); vec4 cc=vec4(vUV*2.-1.,0.,1.);
  oV=vec4((cc.xy-pc.xy/pc.w)*.5,0.,1.);
  if(uRefl>.5) oC.a=1.;
}`
export const VS_FLOOR = `${HEAD}layout(location=0) in vec3 aPos; uniform mat4 uVP,uPrevVP; uniform float uFloorY; out vec3 vW; out vec4 vCur; out vec4 vPrev;
void main(){vec3 aP=aPos+vec3(0.,uFloorY,0.);vW=aP;vCur=uVP*vec4(aP,1.);vPrev=uPrevVP*vec4(aP,1.);gl_Position=vCur;}`
export const FS_FLOOR = `${HEAD}${COMMON}${OUT}
in vec3 vW; uniform sampler2D uReflT; uniform vec2 uRes; uniform vec4 uShadow[10]; uniform int uNShadow; uniform vec3 uAvatar;
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}
void main(){
  vec3 p=vW; vec3 V=normalize(uCam-p);
  float n=vnoise(p.xz*1.7)*.6+vnoise(p.xz*6.)*.4;
  vec2 suv=gl_FragCoord.xy/uRes;
  vec2 off=(vec2(vnoise(p.xz*3.1),vnoise(p.xz*3.1+7.))-.5)*.006;
  float h=texture(uReflT,suv).a;
  float lod=clamp(h,0.,1.)*5.+n*.6;
  vec3 refl=textureLod(uReflT,suv+off,lod).rgb;
  float ndv=max(V.y,0.); float F=.035+.965*pow(1.-ndv,5.);
  vec2 g=abs(fract(p.xz*.5)-.5); float seam=smoothstep(.488,.5,max(g.x,g.y));
  vec3 base=vec3(.005,.006,.0075)*(1.-seam*.5)*(.85+n*.3);
  vec3 L; float sp=spotAt(p,L);
  float sh=1.;
  for(int i=0;i<10;i++){ if(i>=uNShadow) break; vec4 s=uShadow[i]; vec2 q=abs(p.xz-s.xy)-vec2(s.z,.12); float dd=length(max(q,0.))+min(max(q.x,q.y),0.); sh*=1.-s.w*.55*(1.-smoothstep(-.2,.9,dd)); }
  vec2 ad=(p.xz-uAvatar.xz)/vec2(.42,.34); sh*=1.-.7*exp(-dot(ad,ad)*1.6);
  vec3 lit=base+uSpotCol*sp*max(L.y,0.)*.075*sh*(.8+n*.4)+uAccent*.012*exp(-length(p.xz-vec2(.5,-1.))*.25);
  float rough=.75+n*.25;
  vec3 col=lit+refl*mix(.42,1.,F)*rough*mix(1.,sh,.5);
  col+=uSpotCol*D_GGX(max(dot(vec3(0,1,0),normalize(L+V)),0.),.18)*.02*sp*sh;
  float dist=length(p.xz-uCam.xz); col=mix(col,vec3(.009,.011,.014),smoothstep(14.,90.,dist));
  oC=vec4(col,1.); oV=vec4(velo(),0.,1.);
}`
export const VS_PT = `${HEAD}layout(location=0) in vec4 aP; uniform mat4 uVP; uniform float uTime,uPx; out float vB; out vec3 vW;
void main(){vec3 p=aP.xyz; p.y=mod(p.y+uTime*.06*(.5+aP.w),5.6)-1.3; p.x+=sin(uTime*.2+aP.w*20.)*.3; p.z+=cos(uTime*.17+aP.w*13.)*.3; vW=p; vec4 c=uVP*vec4(p,1.); gl_Position=c; gl_PointSize=uPx*(.6+aP.w)/c.w; vB=.5+.5*sin(uTime*1.3+aP.w*40.);}`
export const FS_PT = `${HEAD}${COMMON}in float vB; in vec3 vW; layout(location=0) out vec4 oC; layout(location=1) out vec4 oV;
void main(){vec2 c=gl_PointCoord-.5; float a=exp(-dot(c,c)*18.); vec3 L; float sp=spotAt(vW,L); oC=vec4(uSpotCol*a*sp*.2*(.4+vB),0.); oV=vec4(0.);}`
export const FS_BRIGHT = `${HEAD}in vec2 vUV; uniform sampler2D uT; uniform vec2 uTx; out vec4 o;
void main(){vec3 c=vec3(0);for(int i=0;i<4;i++){vec2 of=vec2(i&1,i>>1)*2.-1.;c+=texture(uT,vUV+of*uTx).rgb;}c*=.25;float l=max(c.r,max(c.g,c.b));float k=clamp(l-.75,0.,1.2);k=k*k/(1.2+1e-4)*.5+max(l-1.95,0.);o=vec4(c*k/max(l,1e-4),1.);}`
export const FS_BLUR = `${HEAD}in vec2 vUV; uniform sampler2D uT; uniform vec2 uDir; out vec4 o;
void main(){vec3 c=texture(uT,vUV).rgb*.2270;c+=(texture(uT,vUV+uDir*1.3846).rgb+texture(uT,vUV-uDir*1.3846).rgb)*.3162;c+=(texture(uT,vUV+uDir*3.2308).rgb+texture(uT,vUV-uDir*3.2308).rgb)*.0703;o=vec4(c,1.);}`
export const FS_COMP = `${HEAD}${COMMON}in vec2 vUV; uniform sampler2D uScene,uVel,uDepth,uB0,uB1; uniform mat4 uInvVP; uniform float uMB,uFade,uFrame,uVolI,uBloomI; uniform vec2 uGVel; uniform vec2 uRes;
uniform vec3 uSpot2Pos,uSpot2Dir,uSpot2Col; out vec4 o;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
float h3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float n3(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float cone(vec3 p,vec3 sp,vec3 sd,float cs){vec3 v=p-sp;float d=length(v);float c=dot(v/d,sd);return smoothstep(cs,mix(cs,1.,.5),c)/(1.+d*d*.012);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec2 v=texture(uVel,vUV).xy+uGVel; v*=uMB; float vl=length(v); if(vl>.07) v*=.07/vl;
  float j=ign(gl_FragCoord.xy+uFrame*5.588);
  vec3 c=vec3(0);
  if(vl*uRes.x>1.5){ for(int i=0;i<10;i++){ float t=(float(i)+j)/10.-.5; c+=texture(uScene,vUV+v*t).rgb; } c/=10.; }
  else c=texture(uScene,vUV).rgb;
  // volumetric light
  float dz=texture(uDepth,vUV).r;
  vec4 wp=uInvVP*vec4(vUV*2.-1.,dz*2.-1.,1.); vec3 P=wp.xyz/wp.w; vec3 rd=P-uCam; float tm=min(length(rd),32.); rd/=max(length(rd),1e-4);
  if(rd.y<0.) tm=min(tm,(uFloorY-uCam.y)/rd.y);
  float acc=0.,acc2=0.; float st=tm/14.;
  for(int i=0;i<14;i++){ vec3 p=uCam+rd*(float(i)+j)*st; float nn=.55+.45*n3(p*.7+vec3(0.,-uTime*.08,uTime*.03)); acc+=cone(p,uSpotPos,uSpotDir,.962)*nn; acc2+=cone(p,uSpot2Pos,uSpot2Dir,.975)*nn; }
  float ph=1.+.6*pow(max(dot(rd,-uSpotDir),0.),3.);
  c+=(uSpotCol*acc*ph*.02+uSpot2Col*acc2*.022)*st*uVolI;
  c+=(texture(uB0,vUV).rgb*.55+texture(uB1,vUV).rgb*.7)*uBloomI;
  c*=1.08;
  c=aces(c);
  vec2 q=vUV-.5; c*=1.-dot(q,q)*.9;
  c=pow(c,vec3(1./2.2));
  c+=(j-.5)/255.*1.5;
  o=vec4(c*uFade,1.);
}`
