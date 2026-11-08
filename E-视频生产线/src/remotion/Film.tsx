import {AbsoluteFill, Audio, Img, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DemoAsset, StoryboardScene} from '../demo/pipeline';

export type FilmProps = {scenes: StoryboardScene[]; assets: DemoAsset[]; audio: string[]; music?: string};

function Shot({scene, asset, audio}: {scene: StoryboardScene; asset: DemoAsset; audio?: string}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const duration = scene.seconds * fps;
  const entrance = interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  const scale = interpolate(frame, [0, duration], [1.01, 1.12]);
  const caption = scene.narration.split(/\n|(?<=[，。！？：])/).map((line) => line.trim()).filter(Boolean);
  const weights = caption.map((text) => text.length);
  const total = weights.reduce((sum, length) => sum + length, 0);
  const fraction = Math.min(frame / Math.max(duration - fps, 1), 0.999);
  let accumulated = 0;
  const currentCaption = caption.find((_, index) => {accumulated += weights[index] / total; return fraction < accumulated;}) ?? caption.at(-1);
  return <AbsoluteFill style={{background: '#101b23', fontFamily: 'Microsoft YaHei, sans-serif', color: '#fff'}}>
    <AbsoluteFill style={{transform: `scale(${scale})`, filter: 'saturate(0.78) contrast(1.06)'}}>
      {asset.kind === 'video' ? <OffthreadVideo src={asset.image} muted style={{width: '100%', height: '100%', objectFit: 'cover'}} /> : <Img src={asset.image} style={{width: '100%', height: '100%', objectFit: 'cover'}} />}
    </AbsoluteFill>
    <AbsoluteFill style={{background: 'linear-gradient(0deg,rgba(4,14,23,.95),transparent 65%)'}} />
    <AbsoluteFill style={{backgroundImage: 'linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px)', backgroundSize: '90px 90px'}} />
    <div style={{position: 'absolute', top: 66, left: 100, right: 100, display: 'flex', justifyContent: 'space-between', fontSize: 22, letterSpacing: 4}}><span>WEIHUA / 重器影像</span><span style={{color: '#e8b576'}}>P0 DEMO · {asset.source ? '公开图片 / 演示' : '结构示意 / 演示'}</span></div>
    {scene.claim && <div style={{position: 'absolute', left: 110, top: 250, borderLeft: '6px solid #e44a3c', paddingLeft: 34, opacity: entrance}}><div style={{fontSize: 30}}>{scene.claim.label}</div><div style={{fontSize: 120, fontWeight: 800, letterSpacing: -5}}>{scene.claim.value}</div><div style={{fontSize: 21, color: '#c3d4d9'}}>数据来源：卫华官网 / 3800t 门机</div></div>}
    <div style={{position: 'absolute', left: 110, bottom: 225, fontSize: 64, maxWidth: 1640, fontWeight: 800, opacity: entrance, transform: `translateY(${(1 - entrance) * 25}px)`}}>{scene.title}</div>
    <div style={{position: 'absolute', left: 110, right: 110, bottom: 118, fontSize: 42, textAlign: 'center', textShadow: '0 3px 8px black'}}>{currentCaption}</div>
    <div style={{position: 'absolute', top: ((frame * 5) % 1000) + 50, left: 96, right: 96, height: 2, background: '#c6e5f655', boxShadow: '0 0 10px #d6efff'}} />
    <div style={{position: 'absolute', bottom: 70, left: 110, width: 1700, height: 3, background: '#ffffff33'}}><div style={{width: `${frame / duration * 100}%`, height: 3, background: '#e44a3c'}} /></div>
    {frame < 12 && <AbsoluteFill style={{background: 'linear-gradient(100deg,transparent,#f6e8d0,#d34635,transparent)', transform: `translateX(${interpolate(frame, [0, 12], [-120, 120])}%)`}} />}
    {audio && <Audio src={audio} volume={0.95} />}
  </AbsoluteFill>;
}

export function Film({scenes, assets, audio, music}: FilmProps) {
  const {fps} = useVideoConfig();
  let offset = 0;
  return <AbsoluteFill style={{background: '#101b23'}}>{scenes.map((scene, index) => {
    const from = offset;
    offset += Math.round(scene.seconds * fps);
    const asset = assets.find((candidate) => candidate.id === scene.assetId)!;
    return <Sequence key={scene.id} from={from} durationInFrames={Math.round(scene.seconds * fps)} premountFor={fps}><Shot scene={scene} asset={asset} audio={audio[index]} /></Sequence>;
  })}{music && <Audio src={music} volume={0.09} loop />}</AbsoluteFill>;
}
