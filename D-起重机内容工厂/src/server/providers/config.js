import fs from 'node:fs';
import path from 'node:path';
import { ProxyAgent, fetch as proxyFetch } from 'undici';

export function tripoFetcher(env=process.env) {
  const proxy=env.HTTPS_PROXY || env.HTTP_PROXY;
  const dispatcher=proxy ? new ProxyAgent(proxy) : undefined;
  return (url, options={})=>proxyFetch(url,{...options,...(dispatcher?{dispatcher}:{})});
}

export function readTripoConfig({env=process.env, sharedPath='E:/室内设计/tuiqiao-re/app/.env'}={}) {
  const selected=env.TRIPO_ENV_FILE || sharedPath;
  const fileVars={};
  if(fs.existsSync(selected)) {
    for(const line of fs.readFileSync(selected,'utf8').split(/\r?\n/)) {
      const m=line.match(/^\s*(TRIPO_API_KEY|TRIPO_MODEL)\s*=\s*(.*)$/);
      if(m)fileVars[m[1]]=m[2].trim().replace(/^(['"])(.*)\1$/,'$2');
    }
  }
  return {
    apiKey:env.TRIPO_API_KEY || fileVars.TRIPO_API_KEY || '',
    model:env.TRIPO_MODEL || fileVars.TRIPO_MODEL || 'v3.1-20260211',
    source:env.TRIPO_API_KEY?'environment':fileVars.TRIPO_API_KEY?'existing-project':'missing',
  };
}

