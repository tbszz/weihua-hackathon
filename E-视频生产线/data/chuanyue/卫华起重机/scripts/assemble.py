# 应急出片：Chuanyue 模板修好前，按原片拆解规格用 FFmpeg 直接硬切+叠字+混音+母带
import json,sys,subprocess,pathlib,re
from PIL import Image,ImageDraw,ImageFont
P=pathlib.Path(sys.argv[1]); out=P/"out-ffmpeg"; out.mkdir(exist_ok=True); ov=out/"ov"; ov.mkdir(exist_ok=True)
pj=json.loads((P/"project.json").read_text(encoding="utf-8")); W,H,FPS=pj["width"],pj["height"],pj["fps"]
TF=ImageFont.truetype("C:/Windows/Fonts/STXINGKA.TTF",int(H*0.10)); SF=ImageFont.truetype("C:/Windows/Fonts/simhei.ttf",int(H*0.05))
def title_png(text,path):
    im=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(im); x=int(W*0.075); y=int(H*0.045); step=int(H*0.10*1.02)
    for i,ch in enumerate(text):
        for dx,dy in ((4,4),(3,3)): d.text((x+dx,y+i*step+dy),ch,font=TF,fill=(0,0,0,150))
        d.text((x,y+i*step),ch,font=TF,fill=(255,255,255,255))
    im.save(path)
def sub_png(text,path):
    im=Image.new("RGBA",(W,H),(0,0,0,0)); d=ImageDraw.Draw(im)
    d.text((W/2,H*0.86),text,font=SF,fill="white",anchor="mm",stroke_width=max(3,int(H*0.004)),stroke_fill="black"); im.save(path)
# 1) 画面：逐镜头裁切 → 拼接
segs=[]; t=0.0; tl=[]
for i,s in enumerate(pj["shots"]):
    f=out/f"v{i:02d}.mp4"; segs.append(f)
    subprocess.run(["ffmpeg","-v","error","-y","-ss",str(s["trimStart"]),"-i",str(P/s["src"]),"-t",str(s["seconds"]),
      "-vf",f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1","-af","aresample=48000,apad","-t",str(s["seconds"]),
      "-c:v","libx264","-crf","16","-preset","fast","-c:a","pcm_s16le","-ac","2",str(f).replace(".mp4",".mkv")],check=True)
    segs[-1]=pathlib.Path(str(f).replace(".mp4",".mkv"))
    if s.get("title"): tl.append((s["title"],t+s.get("titleStart",0),s.get("titleSeconds",3)))
    t+=s["seconds"]
total=t
(out/"list.txt").write_text("".join(f"file '{p.as_posix()}'\n" for p in segs),encoding="utf-8")
subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",str(out/"list.txt"),"-c","copy",str(out/"cut.mkv")],check=True)
# 2) 叠字：标题 + 字幕
inputs=["-i",str(out/"cut.mkv")]; fc=[]; last="[0:v]"; k=1
items=[("t",a,b,b+c) for a,b,c in tl]+[("s",x["text"],x["start"],x["end"]) for x in pj["subtitles"]]
for n,(kind,text,a,b) in enumerate(items):
    png=ov/f"{kind}{n:02d}.png"; (title_png if kind=="t" else sub_png)(text,png)
    inputs+=["-i",str(png)]; fc.append(f"{last}[{k}:v]overlay=enable='between(t,{a:.3f},{b:.3f})'[o{k}]"); last=f"[o{k}]"; k+=1
# 3) 混音：素材环境声 + 对白 + 音效 + 配乐
amix=[f"[0:a]volume={pj['shots'][0]['sourceVolume']}[a0]"]; labels=["[a0]"]
for x in pj["voices"]:
    inputs+=["-i",str(P/x["src"])]; ms=int(x["start"]*1000); amix.append(f"[{k}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms},volume=1.6[a{k}]"); labels.append(f"[a{k}]"); k+=1
for x in pj["sfx"]:
    inputs+=["-i",str(P/x["src"])]; ms=int(x["start"]*1000); amix.append(f"[{k}:a]aresample=48000,adelay={ms}|{ms},volume=0.8[a{k}]"); labels.append(f"[a{k}]"); k+=1
inputs+=["-i",str(P/pj["bgm"]["src"])]; amix.append(f"[{k}:a]aresample=48000,volume={pj['bgm']['volume']}[a{k}]"); labels.append(f"[a{k}]")
amix.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0:duration=first,atrim=0:{total}[mix]")
graph=";".join(fc+amix)
subprocess.run(["ffmpeg","-v","error","-y",*inputs,"-filter_complex",graph,"-map",last,"-map","[mix]","-t",str(total),"-c:v","libx264","-crf","18","-preset","medium","-pix_fmt","yuv420p","-c:a","pcm_s16le",str(out/"mix.mkv")],check=True)
# 4) 母带：压缩 + 增益 + 限幅，迭代到目标响度
target=pj["loudness"]["targetLufs"]; tp=pj["loudness"]["truePeak"]; gain=6.0
def lufs(f):
    r=subprocess.run(["ffmpeg","-i",str(f),"-af","ebur128=peak=true","-f","null","-"],capture_output=True,text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS",r)[-1]), float(re.findall(r"LRA:\s+([\d.]+) LU",r)[-1]), float(re.findall(r"Peak:\s+(-?[\d.]+) dBFS",r)[-1])
for it in range(5):
    af=f"acompressor=threshold=-24dB:ratio=6:attack=5:release=120:makeup=4,volume={gain:.2f}dB,alimiter=limit={10**((tp-0.8)/20):.4f}:attack=2:release=60:level=disabled"
    subprocess.run(["ffmpeg","-v","error","-y","-i",str(out/"mix.mkv"),"-map","0:v","-map","0:a","-c:v","copy","-af",af,"-c:a","aac","-b:a","192k","-ar","48000",str(P/"out-ffmpeg"/"film.mp4")],check=True)
    I,LRA,pk=lufs(out/"film.mp4"); print(f"pass {it}: gain {gain:.2f} → {I} LUFS, LRA {LRA}, peak {pk}")
    if abs(I-target)<=0.5: break
    gain+=target-I
print(json.dumps({"film":str(out/"film.mp4"),"seconds":total,"lufs":I,"lra":LRA,"truePeak":pk},ensure_ascii=False))
