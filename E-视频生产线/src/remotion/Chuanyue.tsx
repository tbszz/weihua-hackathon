import {AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {isImage, type ChuanyueProject} from '../chuanyue/project';

export type ChuanyueProps = ChuanyueProject;

const toFrames = (seconds: number, fps: number) => Math.round(seconds * fps);
const clamp = (value: number) => Math.max(0, Math.min(1, value));

const points = [
  {x: 0, y: 0.72, label: '预判', value: '24%', color: '#70d5c1'},
  {x: 0.16, y: 0.48, label: '张力', value: '38%', color: '#70d5c1'},
  {x: 0.31, y: 0.68, label: '载荷', value: '31%', color: '#e4b36e'},
  {x: 0.47, y: 0.19, label: '同步', value: '74%', color: '#e4b36e'},
  {x: 0.64, y: 0.5, label: '响应', value: '57%', color: '#70d5c1'},
  {x: 0.79, y: 0.27, label: '高度', value: '88%', color: '#70d5c1'},
  {x: 0.94, y: 0.48, label: '稳定', value: '79%', color: '#e4b36e'},
];

function SceneTitle({text, seconds}: {text: string; seconds: number}) {
  const frame = useCurrentFrame();
  const {fps, height, width} = useVideoConfig();
  const time = frame / fps;
  const opacity = interpolate(time, [0, 0.4, Math.max(0.7, seconds - 0.5), seconds], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0, 0, 1)});
  const reveal = spring({frame, fps, config: {damping: 22, stiffness: 130, mass: 0.7}});
  return <div style={{position: 'absolute', left: width * 0.075, top: height * 0.045, writingMode: 'vertical-rl', fontFamily: 'STXingkai, 华文行楷, KaiTi, serif', fontSize: height * 0.1, lineHeight: 1.05, letterSpacing: height * 0.012, color: '#fff', opacity, scale: `${interpolate(reveal, [0, 1], [1.12, 1])}`, transformOrigin: 'top left', textShadow: '0 0 6px #000, 0 2px 10px #0009'}}>{text}</div>;
}

function Subtitle({text}: {text: string}) {
  const {height} = useVideoConfig();
  const stroke = Math.max(1, Math.round(height / 540));
  const shadow = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 2]].map(([x, y]) => `${x * stroke}px ${y * stroke}px 0 #000`).join(',');
  return <div style={{position: 'absolute', left: '8%', right: '8%', bottom: height * 0.075, textAlign: 'center', fontFamily: 'Microsoft YaHei, sans-serif', fontWeight: 600, fontSize: height * 0.037, color: '#fff', textShadow: `${shadow}, 0 0 ${stroke * 4}px #0009`}}>{text}</div>;
}

export function Chuanyue({shots, subtitles, voices, sfx, bgm}: ChuanyueProps) {
  const {fps} = useVideoConfig();
  let offset = 0;
  return <AbsoluteFill style={{background: '#000'}}>
    {shots.map((shot, index) => {
      const from = offset;
      const duration = toFrames(shot.seconds, fps);
      offset += duration;
      return <Sequence key={shot.id} from={from} durationInFrames={duration} premountFor={fps}>
        <AbsoluteFill>{isImage(shot.src) ? <Img src={shot.src} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.65) brightness(.6)'}} /> : <OffthreadVideo src={shot.src} startFrom={toFrames(shot.trimStart, fps)} volume={shot.sourceVolume} muted={shot.sourceVolume === 0} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'saturate(.65) brightness(.6)'}} />}</AbsoluteFill>
        {shot.title && <SceneTitle text={shot.title} seconds={Math.min(shot.titleSeconds, shot.seconds - shot.titleStart)} />}
      </Sequence>;
    })}
    {subtitles.map((item, index) => <Sequence key={`sub-${index}`} from={toFrames(item.start, fps)} durationInFrames={Math.max(1, toFrames(item.end - item.start, fps))}><Subtitle text={item.text} /></Sequence>)}
    {voices.map((voice, index) => <Sequence key={`voice-${index}`} from={toFrames(voice.start, fps)}><Audio src={voice.src} volume={voice.volume} /></Sequence>)}
    {sfx.map((effect, index) => <Sequence key={`sfx-${index}`} from={toFrames(effect.start, fps)}><Audio src={effect.src} volume={effect.volume} /></Sequence>)}
    {bgm && <Sequence from={toFrames(bgm.start, fps)}><Audio src={bgm.src} startFrom={toFrames(bgm.trimStart, fps)} volume={bgm.volume} /></Sequence>}
  </AbsoluteFill>;
}
