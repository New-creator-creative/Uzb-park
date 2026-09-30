import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const $=id=>document.getElementById(id);
const scene=new THREE.Scene();
scene.fog=new THREE.Fog(0x9bbbd0,80,520);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,.1,900);
camera.position.set(0,6.2,11);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setSize(innerWidth,innerHeight); renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.15;
$('app').appendChild(renderer.domElement);

const hemi=new THREE.HemisphereLight(0xdff2ff,0x273028,2.2); scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff0cf,3.2); sun.position.set(-120,170,90); sun.castShadow=true; sun.shadow.mapSize.set(1536,1536); sun.shadow.camera.left=-180;sun.shadow.camera.right=180;sun.shadow.camera.top=180;sun.shadow.camera.bottom=-180; scene.add(sun);

const clock=new THREE.Clock();
const loader=new GLTFLoader();
const world=new THREE.Group(); scene.add(world);
const trafficGroup=new THREE.Group(); world.add(trafficGroup);

const mats={road:new THREE.MeshStandardMaterial({color:0x252b2e,roughness:.9}),side:new THREE.MeshStandardMaterial({color:0x8d8f8a,roughness:1}),grass:new THREE.MeshStandardMaterial({color:0x486b4a,roughness:1}),white:new THREE.MeshStandardMaterial({color:0xf4f3df,roughness:.7}),building:new THREE.MeshStandardMaterial({color:0x7b858b,roughness:.8}),glass:new THREE.MeshStandardMaterial({color:0x315366,metalness:.35,roughness:.18}),tree:new THREE.MeshStandardMaterial({color:0x2f6c42,roughness:1})};
function box(w,h,d,mat,x,y,z){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;world.add(m);return m}
function road(x,z,w,d){box(w,.12,d,mats.road,x,.02,z);}
function line(x,z,w,d){box(w,.025,d,mats.white,x,.09,z);}
function makeCity(){
  box(620,.15,620,mats.grass,0,-.08,0);
  const roads=[-180,-90,0,90,180];
  for(const z of roads){road(0,z,620,18);for(let x=-300;x<300;x+=18)line(x,z,5,.28)}
  for(const x of roads){road(x,0,18,620);for(let z=-300;z<300;z+=18)line(x,z,.28,5)}
  // sidewalks
  for(const z of roads){box(620,.25,2.8,mats.side,0,.12,z-10);box(620,.25,2.8,mats.side,0,.12,z+10)}
  for(const x of roads){box(2.8,.25,620,mats.side,x-10,.12,0);box(2.8,.25,620,mats.side,x+10,.12,0)}
  // city blocks
  for(let bx=-270;bx<=270;bx+=45){for(let bz=-270;bz<=270;bz+=45){if(Math.abs(bx%90)<1||Math.abs(bz%90)<1)continue;const h=12+Math.random()*34,w=25+Math.random()*13,d=25+Math.random()*13;box(w,h,d,mats.building,bx,h/2,bz);}}
  // windows
  for(let x=-270;x<=270;x+=45) for(let z=-270;z<=270;z+=45){if(Math.random()<.35)continue;const b=box(3,3,.12,mats.glass,x,12+Math.random()*12,z-6.5);b.castShadow=false}
  // trees near streets
  for(let i=0;i<150;i++){const side=Math.random()<.5;let x,z;if(side){x=(Math.floor(Math.random()*13)-6)*45+(Math.random()<.5?-14:14);z=(Math.random()*560-280)}else{z=(Math.floor(Math.random()*13)-6)*45+(Math.random()<.5?-14:14);x=(Math.random()*560-280)};const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.28,.38,2.5,7),new THREE.MeshStandardMaterial({color:0x654b36}));trunk.position.set(x,1.25,z);trunk.castShadow=true;world.add(trunk);const crown=new THREE.Mesh(new THREE.SphereGeometry(2.4+Math.random()*1.4,10,8),mats.tree);crown.position.set(x,4,z);crown.castShadow=true;world.add(crown)}
  // street lights
  for(let z=-270;z<=270;z+=45) for(const x of [-13,13]){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.08,.12,6,8),new THREE.MeshStandardMaterial({color:0x22272a,metalness:.6}));pole.position.set(x,3,z);world.add(pole);const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,8,8),new THREE.MeshStandardMaterial({color:0xffe8b2,emissive:0xffb93d,emissiveIntensity:2}));lamp.position.set(x,6,z);world.add(lamp)}
}
makeCity();

let player=null, playerReady=false, trafficTemplate=null;
function normalizeModel(root,targetLength=4.6){
 const box3=new THREE.Box3().setFromObject(root); const size=box3.getSize(new THREE.Vector3()); const max=Math.max(size.x,size.y,size.z); const s=targetLength/max; root.scale.multiplyScalar(s); root.updateMatrixWorld(true);
 const b2=new THREE.Box3().setFromObject(root); const center=b2.getCenter(new THREE.Vector3()); root.position.sub(new THREE.Vector3(center.x,b2.min.y,center.z));
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material.envMapIntensity=.8}}});
}
loader.load('models/car.glb',g=>{
 player=g.scene; normalizeModel(player,4.8); player.position.set(0,0.25,35); player.rotation.y=Math.PI; scene.add(player); playerReady=true; loadTraffic(); hideLoading();},undefined,e=>{console.error(e);hideLoading()});

function recolor(root,color){root.traverse(o=>{if(o.isMesh&&o.material){o.material=o.material.clone(); if(o.material.color)o.material.color.offsetHSL(0,0,0); if(color)o.material.color.set(color)}})}
function loadTraffic(){loader.load('models/traffic_car.glb',g=>{trafficTemplate=g.scene; normalizeModel(trafficTemplate,4.4); buildTraffic();},undefined,e=>console.warn('traffic GLB:',e));}
const traffic=[];
function buildTraffic(){
 const colors=[0x20252a,0xb72f31,0xd9d9d2,0x24558c,0x6d3d25,0xeeeeee,0x343434];
 for(let i=0;i<18;i++){const c=trafficTemplate.clone(true);normalizeModel(c,4.4);recolor(c,colors[i%colors.length]);let horizontal=i%2===0;const lane=(i%4<2?-4.2:4.2);if(horizontal){c.position.set(-260-i*2.5,.2,(i%4<2?-90:90));c.rotation.y=Math.PI/2}else{c.position.set(i%4<2?-90:90,.2,260-i*2.5);c.rotation.y=0}trafficGroup.add(c);traffic.push({o:c,horizontal,speed:9+Math.random()*7,dir:(i%4===0||i%4===3)?1:-1});}
}

let speed=0, fuel=100, money=Number(localStorage.getItem('uzb_money')||500), steer=0, gas=false, brake=false, paused=false, cameraMode=0, target=new THREE.Vector3(90,0,-90), missionDone=false;
$('money').textContent=money;
function updateHud(dt){$('speed').textContent=Math.round(Math.abs(speed)*3.6);$('fuel').textContent=Math.max(0,Math.round(fuel));const d=player?player.position.distanceTo(target):0;$('gpsDistance').textContent=Math.round(d)+' m';$('missionBar').style.width=Math.min(100,(1-d/150)*100)+'%';if(player){const a=Math.atan2(target.x-player.position.x,target.z-player.position.z);$('gpsArrow').style.transform=`rotate(${a-player.rotation.y}rad)`}}
function controls(){const bind=(id,down,up)=>{const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();down()});['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,e=>{e.preventDefault();up()}))};bind('gas',()=>gas=true,()=>gas=false);bind('brake',()=>brake=true,()=>brake=false);bind('left',()=>steer=-1,()=>{if(steer<0)steer=0});bind('right',()=>steer=1,()=>{if(steer>0)steer=0});window.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='w')gas=true;if(e.key==='ArrowDown'||e.key==='s')brake=true;if(e.key==='ArrowLeft'||e.key==='a')steer=-1;if(e.key==='ArrowRight'||e.key==='d')steer=1});window.addEventListener('keyup',e=>{if(e.key==='ArrowUp'||e.key==='w')gas=false;if(e.key==='ArrowDown'||e.key==='s')brake=false;if(e.key==='ArrowLeft'||e.key==='a')steer=0;if(e.key==='ArrowRight'||e.key==='d')steer=0})}
controls();
$('cameraBtn').onclick=()=>cameraMode=(cameraMode+1)%3;
$('pauseBtn').onclick=()=>{paused=true;$('pause').style.display='flex'};
$('resume').onclick=()=>{paused=false;$('pause').style.display='none'};
$('restart').onclick=()=>location.reload();
$('nextMission').onclick=()=>{missionDone=false;$('done').style.display='none';target.set((Math.random()>.5?180:-180),0,(Math.random()>.5?180:-180));missionDone=false};
$('gpsBtn').onclick=()=>{$('gpsPanel').style.display=$('gpsPanel').style.display==='block'?'none':'block'};
function drive(dt){if(!player)return;const accel=gas&&fuel>0?18:0;const drag=brake?22:5;speed+=(accel-drag*Math.sign(speed))*dt; if(!gas&&!brake)speed-=speed*Math.min(dt*.65,1); speed=THREE.MathUtils.clamp(speed,-8,31); if(gas)fuel-=dt*0.9; const turn=steer*1.6*(Math.abs(speed)/31+.18);player.rotation.y+=turn*dt*Math.sign(speed||1);const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));player.position.addScaledVector(forward,speed*dt);player.position.x=THREE.MathUtils.clamp(player.position.x,-292,292);player.position.z=THREE.MathUtils.clamp(player.position.z,-292,292);if(player.position.distanceTo(target)<9&&!missionDone){missionDone=true;money+=100;localStorage.setItem('uzb_money',money);$('money').textContent=money;$('done').style.display='flex'} }
function updateTraffic(dt){for(const t of traffic){if(t.horizontal)t.o.position.x+=t.speed*t.dir*dt;else t.o.position.z+=t.speed*t.dir*dt;if(t.o.position.x>300)t.o.position.x=-300;if(t.o.position.x<-300)t.o.position.x=300;if(t.o.position.z>300)t.o.position.z=-300;if(t.o.position.z<-300)t.o.position.z=300}}
function updateCamera(dt){if(!player)return;const forward=new THREE.Vector3(Math.sin(player.rotation.y),0,Math.cos(player.rotation.y));let desired;if(cameraMode===0)desired=player.position.clone().addScaledVector(forward,-12).add(new THREE.Vector3(0,6,0));else if(cameraMode===1)desired=player.position.clone().addScaledVector(forward,5).add(new THREE.Vector3(0,3.2,0));else desired=player.position.clone().add(new THREE.Vector3(0,22,0));camera.position.lerp(desired,1-Math.pow(.001,dt));const look=player.position.clone().addScaledVector(forward,8);look.y+=1.4;camera.lookAt(look)}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.035);if(!paused){drive(dt);updateTraffic(dt);updateCamera(dt);updateHud(dt)}renderer.render(scene,camera)}
function hideLoading(){setTimeout(()=>$('loading').style.display='none',900)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5))});
animate();
