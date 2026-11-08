import test from 'node:test';
import assert from 'node:assert/strict';
import { remoteIndex, verifyRows } from '../src/feishu.mjs';
test('飞书矩阵格式按真实本地 ID 定位远端记录，不按行号猜测',()=>{
 const result={ok:true,data:{fields:['名称','本地ID'],data:[['甲','a'],['乙','b']],record_id_list:['rec1','rec2'],has_more:false}};
 assert.deepEqual(remoteIndex(result),{a:'rec1',b:'rec2'});
});
test('飞书写后读短暂返回旧版本时等待重读，不误报成功',async()=>{
 let calls=0;
 const read=async()=>({data:{fields:['本地ID','名称'],data:++calls===1?[]:[['a','甲']],record_id_list:calls===1?[]:['rec1']}});
 await verifyRows([{'本地ID':'a','名称':'甲'}],read,async()=>{});
 assert.equal(calls,2);
});
test('飞书读回持续不一致仍然失败',async()=>{
 await assert.rejects(verifyRows([{'本地ID':'a','名称':'甲'}],async()=>({data:{fields:['本地ID','名称'],data:[['a','错误内容']],record_id_list:['rec1']}}),async()=>{}),/不一致/);
});
test('飞书分页或重复 ID 不能当作完整唯一索引',()=>{
 assert.throws(()=>remoteIndex({data:{has_more:true}}),/超过/);
 assert.throws(()=>remoteIndex({data:{fields:['本地ID'],data:[['a'],['a']],record_id_list:['rec1','rec2']}}),/重复/);
});
