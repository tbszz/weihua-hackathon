import http from 'node:http';
import fs from 'node:fs/promises';
import {tripoStatus,startGeneration,refreshGeneration,modelPath} from './providers/tripo-service.js';
import { buildAnalogies, buildClaims, buildSceneCandidates, getPayload, parseInput, validate } from './studio.js';

const port = Number(process.env.PORT || 8714);

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }
  try {
    if(req.method==='GET' && req.url==='/api/tripo/status')return send(res,200,await tripoStatus());
    if(req.method==='GET' && req.url==='/api/tripo/balance')return send(res,200,await tripoStatus({balance:true}));
    if(req.method==='POST' && req.url==='/api/tripo/generate')return send(res,202,await startGeneration());
    if(req.method==='GET' && req.url==='/api/tripo/task')return send(res,200,await refreshGeneration());
    if(req.method==='GET' && /^\/files\/tripo\/[A-Za-z0-9_-]+\.glb$/.test(req.url)) {
      const id=req.url.split('/').at(-1).slice(0,-4);
      const bytes=await fs.readFile(modelPath(id));
      res.writeHead(200,{'Content-Type':'model/gltf-binary','Content-Length':bytes.length,'Cache-Control':'private,max-age=3600'});return res.end(bytes);
    }
    if (req.method === 'GET' && req.url === '/api/health') return send(res, 200, { ok: true, service: 'crane-content-studio', mode: 'p0-demo' });
    if (req.method === 'GET' && req.url === '/api/bootstrap') return send(res, 200, getPayload());
    if (req.method === 'POST' && req.url === '/api/parse') {
      const { text = '' } = await readJson(req);
      const spec = parseInput(text);
      return send(res, 200, { spec, analogies: buildAnalogies(spec), validation: validate(spec) });
    }
    if (req.method === 'POST' && req.url === '/api/scene-compose') {
      return send(res, 200, { mode: 'cached_demo', candidates: buildSceneCandidates(), claims: buildClaims(), message: '当前使用本地缓存演示结果，接入图像编辑模型后替换此 provider。' });
    }
    if (req.method === 'POST' && req.url === '/api/validate') {
      const { spec, claims } = await readJson(req);
      const result = validate(spec, claims);
      return send(res, 200, { ...result, assetId: result.valid ? `media-studio-${Date.now()}` : null });
    }
    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, error.code==='ENOENT'?404:(error.status || 400), { error: error.code==='ENOENT'?'模型文件不存在。':error.message });
  }
});

server.listen(port, () => console.log(`studio API listening on http://localhost:${port}`));

export { server };
