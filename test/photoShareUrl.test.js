import test from 'node:test';
import assert from 'node:assert/strict';
import { photoShareUrl } from '../utils/photoShareUrl.js';
const request={protocol:'http',get:()=> 'localhost:8000'};
const interfaces={en0:[{family:'IPv4',internal:false,address:'192.168.1.25'}]};
test('local booth QR uses LAN address rather than phone localhost',()=>{
  assert.equal(photoShareUrl(request,'/photos/example-postcard.jpg','',interfaces),'http://192.168.1.25:8000/photos/example-postcard.jpg');
});
test('configured public origin takes priority for remote guests',()=>{
  assert.equal(photoShareUrl(request,'/photos/example.jpg','https://photos.example.com',interfaces),'https://photos.example.com/photos/example.jpg');
});
test('already reachable request host is preserved',()=>{
  assert.equal(photoShareUrl({...request,get:()=> '192.168.1.30:8000'},'/photos/example.jpg','',interfaces),'http://192.168.1.30:8000/photos/example.jpg');
});
