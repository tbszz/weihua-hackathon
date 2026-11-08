import {startGeneration,refreshGeneration,tripoStatus} from '../src/server/providers/tripo-service.js';
const action=process.argv[2];
try{
  const result=action==='--start'?await startGeneration():action==='--balance'?await tripoStatus({balance:true}):await refreshGeneration();
  console.log(JSON.stringify(result,null,2));
}catch(e){console.error(JSON.stringify({error:e.message,status:e.status}));process.exitCode=1;}

