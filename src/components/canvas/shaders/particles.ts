/* GLSL for the GPGPU particle simulation + point rendering. */

/** 3D simplex noise with analytic gradient (Ashima Arts / Stefan Gustavson, MIT). */
export const simplexGrad = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+10.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v, out vec3 gradient){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  vec4 m2=m*m;
  vec4 m4=m2*m2;
  vec4 pdotx=vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3));
  vec4 temp=m2*m*pdotx;
  gradient=-8.0*(temp.x*x0+temp.y*x1+temp.z*x2+temp.w*x3);
  gradient+=m4.x*p0+m4.y*p1+m4.z*p2+m4.w*p3;
  gradient*=105.0;
  return 105.0*dot(m4,pdotx);
}
vec3 hash32(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973));
  p3+=dot(p3,p3.yxz+33.33);
  return fract((p3.xxy+p3.yzz)*p3.zyx);
}
`;

export const velocityShader = /* glsl */ `
uniform float uTime;
uniform float uDelta;
uniform sampler2D uTargetA;
uniform sampler2D uTargetB;
uniform float uMorph;
uniform float uScatter;
uniform float uSpring;
uniform float uCurl;
uniform float uImpulse;
uniform float uBreath;
uniform vec3 uRayO;
uniform vec3 uRayD;
uniform float uMouse;
uniform float uMouseRadius;
uniform vec3 uAttractor;
uniform float uAttract;
uniform float uExplode;
${simplexGrad}
void main(){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  vec4 P=texture2D(texturePosition,uv);
  vec3 pos=P.xyz;
  float seed=P.w;
  vec3 vel=texture2D(textureVelocity,uv).xyz;
  float dt=min(uDelta,1.0/30.0);

  // Staggered morph: every particle leaves at a slightly different time.
  vec3 A=texture2D(uTargetA,uv).xyz;
  vec3 B=texture2D(uTargetB,uv).xyz;
  float m=clamp(uMorph*1.6-seed*0.6,0.0,1.0);
  m=m*m*(3.0-2.0*m);
  vec3 target=mix(A,B,m);

  // Slow "breathing" — a liquid radial wobble on the target surface.
  vec3 gN;
  float n=snoise(target*0.8+vec3(0.0,uTime*0.22,uTime*0.1),gN);
  target+=normalize(target+1e-4)*n*uBreath;

  vec3 acc=vec3(0.0);
  float spring=uSpring*(1.0-0.92*uScatter)*(1.0-0.9*uAttract);
  acc+=(target-pos)*14.0*spring;

  // Divergence-free curl noise flow (cross product of two noise gradients).
  vec3 ga; vec3 gb;
  vec3 q=pos*0.6+vec3(0.0,0.0,uTime*0.09);
  snoise(q,ga);
  snoise(q+vec3(31.4,17.1,9.7),gb);
  vec3 curl=cross(ga,gb);
  acc+=curl*(uCurl+uScatter*7.0);

  // Cursor force field: push away from the mouse ray and swirl around it.
  vec3 rel=pos-uRayO;
  vec3 closest=uRayO+uRayD*dot(rel,uRayD);
  vec3 away=pos-closest;
  float d=length(away);
  vec3 dir=away/max(d,1e-3);
  float f=smoothstep(uMouseRadius,0.0,d)*uMouse;
  acc+=dir*f*34.0+cross(uRayD,dir)*f*22.0;

  // Black hole while holding.
  vec3 toA=uAttractor-pos;
  float da=length(toA);
  vec3 dA=toA/max(da,0.03);
  acc+=dA*uAttract*(9.0+14.0/(1.0+da*da*3.0));
  acc+=cross(dA,uRayD)*uAttract*(10.0/(1.0+da));

  float damp=mix(4.0,1.6,uScatter)+uAttract*0.8;
  acc-=vel*damp;
  vel+=acc*dt;

  vec3 rnd=normalize(hash32(uv*913.17)*2.0-1.0+1e-4);
  vel+=rnd*uImpulse*(0.35+0.65*fract(seed*37.13));
  vel+=normalize(pos-uAttractor+rnd*0.35)*uExplode*(0.4+fract(seed*91.7));

  gl_FragColor=vec4(vel,1.0);
}
`;

export const positionShader = /* glsl */ `
uniform float uDelta;
void main(){
  vec2 uv=gl_FragCoord.xy/resolution.xy;
  vec4 P=texture2D(texturePosition,uv);
  vec3 vel=texture2D(textureVelocity,uv).xyz;
  float dt=min(uDelta,1.0/30.0);
  gl_FragColor=vec4(P.xyz+vel*dt,P.w);
}
`;

export const pointsVertex = /* glsl */ `
uniform sampler2D uPos;
uniform sampler2D uVel;
uniform float uSize;
uniform float uPixelRatio;
uniform float uTime;
uniform float uPulse;
uniform float uOpacity;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
attribute vec2 aRef;
attribute float aRand;
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec4 P=texture2D(uPos,aRef);
  vec3 v=texture2D(uVel,aRef).xyz;
  vec4 mv=modelViewMatrix*vec4(P.xyz,1.0);
  gl_Position=projectionMatrix*mv;
  float speed=length(v);
  float sz=uSize*(0.45+aRand*aRand*1.4)*(1.0+uPulse*2.5);
  gl_PointSize=max(1.0,sz*uPixelRatio/max(0.5,-mv.z));

  // Cool → warm gradient along a slowly turning axis.
  vec3 axis=normalize(vec3(sin(uTime*0.11),1.0,cos(uTime*0.13)*0.6));
  float t=0.5+0.42*dot(normalize(P.xyz+1e-4),axis)*min(1.0,length(P.xyz))+(aRand-0.5)*0.28;
  t=clamp(t,0.0,1.0);
  vec3 col=t<0.5?mix(uC1,uC2,t*2.0):mix(uC2,uC3,(t-0.5)*2.0);
  // Fast particles glow hotter.
  col=mix(col,vec3(0.85,0.95,1.0),smoothstep(1.2,7.0,speed)*0.65);
  vColor=col*(1.0+uPulse*3.0);
  vAlpha=uOpacity*(0.55+0.45*aRand);
}
`;

export const pointsFragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  vec2 c=gl_PointCoord-0.5;
  float d=length(c);
  float a=smoothstep(0.5,0.0,d);
  a*=a;
  gl_FragColor=vec4(vColor*a*vAlpha,1.0);
}
`;
