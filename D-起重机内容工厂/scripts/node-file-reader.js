// Node-only FileReader bridge for Three.js GLTFExporter; browser uses native FileReader.
export class NodeFileReader {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(result => { this.result=result; this.onloadend?.(); }).catch(error=>this.onerror?.(error)); }
  readAsDataURL(blob) { blob.arrayBuffer().then(result=> { this.result='data:'+blob.type+';base64,'+Buffer.from(result).toString('base64'); this.onloadend?.(); }).catch(error=>this.onerror?.(error)); }
}
if(typeof globalThis.FileReader==='undefined')globalThis.FileReader=NodeFileReader;

