import {createInitialJob, createDemoStoryboard} from '../demo/pipeline';

const job = createInitialJob();
const template = process.argv.includes('--factory') ? 'smart-factory' : job.template;
const scenes = createDemoStoryboard(template === 'smart-factory' ? '走进卫华智能工厂' : job.topic, job.assets, template);
const response = await fetch('http://127.0.0.1:8705/api/render', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({scenes})});
const created = await response.json();
if (!response.ok) throw new Error(JSON.stringify(created));
console.log(JSON.stringify(created));
let lastProgress = -1;
for (;;) {
  const state = await fetch(`http://127.0.0.1:8705/api/render/${created.id}`).then((poll) => poll.json());
  if (state.progress !== lastProgress) {console.log(JSON.stringify(state)); lastProgress = state.progress;}
  if (state.status !== 'running') {console.log(JSON.stringify(state)); if (state.status === 'failed') process.exitCode = 1; break;}
  await new Promise((resolve) => setTimeout(resolve, 2000));
}
