import {Composition, registerRoot} from 'remotion';
import {Film} from './Film';
import {Chuanyue, type ChuanyueProps} from './Chuanyue';

const emptyChuanyue: ChuanyueProps = {title: '名场面穿越', width: 1920, height: 1080, fps: 30, shots: [], subtitles: [], voices: [], sfx: [], loudness: {targetLufs: -9.5, truePeak: -1}, claims: []};

registerRoot(() => <>
  <Composition id="Weihua" component={Film} width={1920} height={1080} fps={30} durationInFrames={1800} defaultProps={{scenes: [], assets: [], audio: []}} calculateMetadata={({props}) => ({durationInFrames: Math.max(1, props.scenes.reduce((sum, scene) => sum + Math.round(scene.seconds * 30), 0))})} />
  <Composition id="Chuanyue" component={Chuanyue} width={1920} height={1080} fps={30} durationInFrames={900} defaultProps={emptyChuanyue} calculateMetadata={({props}) => ({width: props.width, height: props.height, fps: props.fps, durationInFrames: Math.max(1, props.shots.reduce((sum, shot) => sum + Math.round(shot.seconds * props.fps), 0))})} />
</>);
