import numpy as np, wave, sys, os
SR=48000; P=sys.argv[1]; os.makedirs(P+"/music",exist_ok=True); os.makedirs(P+"/sfx",exist_ok=True)
rng=np.random.default_rng(7)
def write(path,x):
    x=np.clip(x/ (np.abs(x).max()+1e-9)*0.89,-1,1); st=np.stack([x,x],1) if x.ndim==1 else x
    with wave.open(path,"wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st*32767).astype(np.int16).tobytes())
def lp(x,a): # one-pole lowpass
    y=np.empty_like(x); s=0.0
    for i,v in enumerate(x): s+=a*(v-s); y[i]=s
    return y
def env(n,att,dec): t=np.arange(n)/SR; return np.minimum(t/att,1)*np.exp(-t/dec)
def taiko(dur=0.9,f0=62):
    n=int(dur*SR); t=np.arange(n)/SR; f=f0*(1+1.5*np.exp(-t*30)); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*env(n,0.002,0.25)+0.35*lp(rng.standard_normal(n),0.08)*env(n,0.001,0.04)
def boom(dur=2.5):
    n=int(dur*SR); t=np.arange(n)/SR; f=45*(1+3*np.exp(-t*12)); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*env(n,0.003,0.9)+0.5*lp(rng.standard_normal(n),0.05)*env(n,0.002,0.35)
def saw(f,n): t=np.arange(n)/SR; return 2*((t*f)%1)-1
def brass(chord,dur=0.7):
    n=int(dur*SR); x=sum(saw(f,n)+saw(f*1.004,n) for f in chord); return lp(x,0.06)*env(n,0.02,0.35)
L=33.0; N=int(L*SR); mix=np.zeros(N)
def put(x,t,g=1.0):
    i=int(t*SR); j=min(N,i+len(x)); mix[i:j]+=g*x[:j-i]
# string drone, D minor, rising filter
n=N; t=np.arange(n)/SR
dr=sum(saw(f,n) for f in (73.4,110,146.8,174.6)); drone=lp(dr,0.02)*(0.5+0.5*np.minimum(t/31,1))
mix+=0.35*drone
beat=60/125
for k in range(int(L/beat)):
    tt=k*beat
    put(taiko(),tt,0.9 if k%4==0 else 0.55)
    if k%2==1: put(taiko(0.4,95),tt+beat/2,0.35)
for tt in (2.0,8.4,14.5,22.0,28.5): put(boom(),tt,1.4); put(brass((146.8,174.6,220,293.6)),tt,0.9)
for tt in np.arange(4,31,4*beat): put(brass((146.8,220,293.6),0.4),tt,0.45)
fade=np.ones(N); fade[-int(2*SR):]=np.linspace(1,0,int(2*SR)); write(P+"/music/epic-bed.wav",lp(mix,0.5)*fade)
# sfx
def whoosh(d=0.9):
    n=int(d*SR); x=rng.standard_normal(n); a=np.linspace(0.01,0.25,n); y=np.empty(n); s=0
    for i in range(n): s+=a[i]*(x[i]-s); y[i]=s
    return y*np.sin(np.linspace(0,np.pi,n))**2
write(P+"/sfx/whoosh.wav",whoosh()); write(P+"/sfx/impact.wav",boom(1.8)); write(P+"/sfx/hit.wav",boom(3.0)+0.6*np.pad(brass((73.4,110,146.8,220),1.5),(0,int(1.5*SR))))
print("ok")
