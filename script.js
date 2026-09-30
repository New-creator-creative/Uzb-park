import * as THREE from "three";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";

const $=id=>document.getElementById(id);
let money=Number(localStorage.getItem("uzbMoney"))||500;
let level=Number(localStorage.getItem("uzbLevel"))||1;
let paused=false,gameStarted=false,cameraMode=0;
let speed=0,maxSpeed=18,accel=8,brakePower=16,steerPower=.055;
let fuel=100,damage=0,missionDone=false,missionDistance=0;
const keys={left:false,right:false,gas:false,brake:false};

$("menuMoney").textContent=money;$("money").textContent=money;$("garageMoney").textContent=money;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x91b2c9);
scene.fog=new THREE.Fog(0x91b2c9,55,230);

const camera=new THREE.PerspectiveCamera(65,innerWidth/innerHeight,.1,1000);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:"high-performance"});
renderer.setSize(innerWidth,innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.15;
$("scene").appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xeaf6ff,0x33442f,2));
const sun=new THREE.DirectionalLight(0xffffff,3);
sun.position.set(-70,90,40);sun.castShadow=true;
sun.shadow.mapSize.width=1024;sun.shadow.mapSize.height=1024;
scene.add(sun);

const world=new THREE.Group();scene.add(world);

const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshStandardMaterial({color:0x3f6941,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;world.add(ground);

const roadMat=new THREE.MeshStandardMaterial({color:0x292e33,roughness:.9});
const road=new THREE.Mesh(new THREE.PlaneGeometry(24,170),roadMat);
road.rotation.x=-Math.PI/2;road.position.y=.01;road.receiveShadow=true;world.add(road);

const sideRoad1=road.clone();sideRoad1.rotation.z=Math.PI/2;sideRoad1.scale.set(1.5,1,1);sideRoad1.position.set(42,.015,0);world.add(sideRoad1);
const sideRoad2=sideRoad1.clone();sideRoad2.position.x=-42;world.add(sideRoad2);

const lineMat=new THREE.MeshBasicMaterial({color:0xffffff});
for(let z=-80;z<85;z+=8){
  const l=new THREE.Mesh(new THREE.BoxGeometry(.15,.025,4),lineMat);
  l.position.set(0,.04,z);world.add(l);
}
for(const x of [-11.5,11.5]){
  const l=new THREE.Mesh(new THREE.BoxGeometry(.18,.03,170),lineMat);
  l.position.set(x,.04,0);world.add(l);
}

function building(x,z,w,h,d){
  const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color:new THREE.Color().setHSL(.58,.08,.35+Math.random()*.12),roughness:.85}));
  b.position.set(x,h/2,z);b.castShadow=true;b.receiveShadow=true;world.add(b);
  for(let yy=2;yy<h-1;yy+=2.7){
    for(let xx=-w/2+1.2;xx<w/2;xx+=2.2){
      const win=new THREE.Mesh(new THREE.PlaneGeometry(.8,1),new THREE.MeshBasicMaterial({color:Math.random()>.75?0xffd36a:0x29414e}));
      win.position.set(x+xx,yy,z-d/2-.01);world.add(win);
    }
  }
}
building(-24,-15,16,12,18);building(25,-32,18,18,20);building(-26,25,20,15,18);building(25,35,17,13,17);

function tree(x,z){
  const g=new THREE.Group();
  const t=new THREE.Mesh(new THREE.CylinderGeometry(.25,.4,2.6,8),new THREE.MeshStandardMaterial({color:0x68472e}));
  t.position.y=1.3;t.castShadow=true;g.add(t);
  const c=new THREE.Mesh(new THREE.SphereGeometry(1.5,10,8),new THREE.MeshStandardMaterial({color:0x28653a,roughness:1}));
  c.position.y=3.2;c.castShadow=true;g.add(c);
  g.position.set(x,0,z);world.add(g);
}
for(let i=0;i<35;i++){const side=Math.random()>.5?1:-1;tree(side*(14+Math.random()*18),-80+Math.random()*160);}

const carRoot=new THREE.Group();scene.add(carRoot);
let car=null;
const loader=new GLTFLoader();
loader.load("models/car.glb",g=>{
  car=g.scene;
  // The supplied GLB is already Y-up; its long axis is Z.
  car.scale.setScalar(.25);
  car.position.set(0,0,0);
  car.rotation.y=Math.PI;
  car.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material)o.material.envMapIntensity=1.2;}});
  carRoot.add(car);
  $("loadBar").style.width="100%";$("loadText").textContent="Tayyor!";
  setTimeout(()=>{$("loading").style.opacity=0;setTimeout(()=>$("loading").remove(),500)},400);
},p=>{
  const n=p.total?Math.round(p.loaded/p.total*100):0;
  $("loadBar").style.width=n+"%";$("loadText").textContent=`Mashina ${n}% yuklandi...`;
},e=>{$("loadText").textContent="car.glb yuklanmadi";console.error(e)});

const target=new THREE.Mesh(new THREE.BoxGeometry(3.5,.04,6),new THREE.MeshStandardMaterial({color:0x35ff77,transparent:true,opacity:.28,emissive:0x0b4d20}));
target.position.set(0,.04,-42);world.add(target);
for(const x of [-1.75,1.75]){const q=new THREE.Mesh(new THREE.BoxGeometry(.1,.05,6),new THREE.MeshBasicMaterial({color:0x35ff77}));q.position.set(x,.07,-42);world.add(q)}

const traffic=[];
function makeTraffic(){
  const g=new THREE.Group();
  const color=[0xc92d2d,0x1764b5,0xf0f0f0,0x17191b,0xd5a313][Math.floor(Math.random()*5)];
  const body=new THREE.Mesh(new THREE.BoxGeometry(1.8,.65,4),new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.3}));
  body.position.y=.62;body.castShadow=true;g.add(body);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.4,.5,1.8),new THREE.MeshStandardMaterial({color:0x20252a,metalness:.5,roughness:.2}));
  roof.position.set(0,1.15,-.1);roof.castShadow=true;g.add(roof);
  g.position.set([-7,-3.5,3.5,7][Math.floor(Math.random()*4)],0,carRoot.position.z-70-Math.random()*140);
  world.add(g);traffic.push({mesh:g,spd:4+Math.random()*6});
}
for(let i=0;i<9;i++)makeTraffic();

function bind(id,key){
  const b=$(id);
  const down=e=>{e.preventDefault();keys[key]=true};
  const up=e=>{e.preventDefault();keys[key]=false};
  b.addEventListener("pointerdown",down);b.addEventListener("pointerup",up);b.addEventListener("pointercancel",up);b.addEventListener("pointerleave",up);
}
bind("left","left");bind("right","right");bind("gas","gas");bind("brake","brake");
addEventListener("keydown",e=>{if(e.key==="ArrowLeft")keys.left=true;if(e.key==="ArrowRight")keys.right=true;if(e.key==="ArrowUp"||e.key==="w")keys.gas=true;if(e.key==="ArrowDown"||e.key==="s")keys.brake=true});
addEventListener("keyup",e=>{if(e.key==="ArrowLeft")keys.left=false;if(e.key==="ArrowRight")keys.right=false;if(e.key==="ArrowUp"||e.key==="w")keys.gas=false;if(e.key==="ArrowDown"||e.key==="s")keys.brake=false});

function toast(t){$("toast").textContent=t;$("toast").style.opacity=1;clearTimeout(window.__toast);window.__toast=setTimeout(()=>$("toast").style.opacity=0,1200)}
function updateHUD(){
  $("speed").textContent=Math.round(speed*3.6);
  $("money").textContent=money;$("menuMoney").textContent=money;$("garageMoney").textContent=money;
  $("fuel").textContent=Math.max(0,Math.round(fuel));
  $("damage").textContent=Math.round(damage);
}
function resetCar(){carRoot.position.set(0,0,8);carRoot.rotation.set(0,0,0);speed=0;fuel=100;damage=0;missionDone=false;missionDistance=0;target.material.color.set(0x35ff77)}
function cameraUpdate(dt){
  let p;
  if(cameraMode===0)p=new THREE.Vector3(carRoot.position.x,3.4,carRoot.position.z+8);
  else if(cameraMode===1)p=new THREE.Vector3(carRoot.position.x,1.7,carRoot.position.z+3.2);
  else p=new THREE.Vector3(carRoot.position.x,8,carRoot.position.z+13);
  camera.position.lerp(p,5*dt);
  camera.lookAt(carRoot.position.x,.7,carRoot.position.z-10);
}
function collision(){
  for(const v of traffic){
    const dx=carRoot.position.x-v.mesh.position.x,dz=carRoot.position.z-v.mesh.position.z;
    if(Math.hypot(dx,dz)<2.4){
      speed*=.25;damage=Math.min(100,damage+8);toast("💥 Mashina shikastlandi!");
      v.mesh.position.z=carRoot.position.z-100-Math.random()*80;
      if(navigator.vibrate&&$("vibration").checked)navigator.vibrate(100);
    }
  }
}
function finish(){
  if(missionDone)return;
  missionDone=true;speed=0;money+=100;level++;
  localStorage.setItem("uzbMoney",money);localStorage.setItem("uzbLevel",level);
  $("finishText").textContent="+100 🪙  |  Level "+level;
  $("finishPanel").style.display="flex";updateHUD();
}
function update(dt){
  if(!gameStarted||paused||!car)return;
  if(keys.gas){speed+=accel*dt;fuel-=.18*dt}
  else speed-=5*dt;
  if(keys.brake)speed-=brakePower*dt;
  speed=THREE.MathUtils.clamp(speed,0,maxSpeed);
  let steer=(keys.left?-1:0)+(keys.right?1:0);
  carRoot.position.x+=steer*speed*steerPower;
  carRoot.position.x=THREE.MathUtils.clamp(carRoot.position.x,-10,10);
  carRoot.position.z-=speed*dt;
  carRoot.rotation.z=THREE.MathUtils.lerp(carRoot.rotation.z,-steer*.07,8*dt);
  missionDistance=Math.max(0,Math.abs(carRoot.position.z-(-42)));
  $("missionProgress").style.width=Math.min(100,Math.max(0,100-missionDistance/60*100))+"%";
  $("gpsArrow").textContent=carRoot.position.z>-42?"●":"✓";
  if(Math.hypot(carRoot.position.x-target.position.x,carRoot.position.z-target.position.z)<1.7&&speed<.7)finish();
  if(fuel<=0){fuel=0;speed=Math.max(0,speed-10*dt);toast("⛽ Yoqilg‘i tugadi")}
  if(damage>=100){speed=0;toast("🔧 Mashina ta’mirga muhtoj")}
  for(const v of traffic){
    v.mesh.position.z+=v.spd*dt;
    if(v.mesh.position.z>carRoot.position.z+35){v.mesh.position.z=carRoot.position.z-80-Math.random()*150;v.mesh.position.x=[-7,-3.5,3.5,7][Math.floor(Math.random()*4)]}
  }
  collision();cameraUpdate(dt);updateHUD();
}

$("playBtn").onclick=()=>{ $("menu").style.display="none";$("game").style.display="block";gameStarted=true;paused=false;resetCar() };
$("garageBtn").onclick=()=>{$("menu").style.display="none";$("garage").style.display="block"};
$("garageBack").onclick=()=>{$("garage").style.display="none";$("menu").style.display="block"};
$("settingsBtn").onclick=()=>{$("settings").style.display="flex"};
$("settingsBack").onclick=()=>{$("settings").style.display="none"};
$("pauseBtn").onclick=()=>{paused=!paused;$("pauseBtn").textContent=paused?"▶":"Ⅱ";$("pausePanel").style.display=paused?"flex":"none"};
$("resumeBtn").onclick=()=>{$("pauseBtn").click()};
$("exitBtn").onclick=()=>{$("pausePanel").style.display="none";$("game").style.display="none";$("menu").style.display="block";gameStarted=false};
$("cameraBtn").onclick=()=>{cameraMode=(cameraMode+1)%3};
$("nextBtn").onclick=()=>{$("finishPanel").style.display="none";resetCar()};
$("upgradeBtn").onclick=()=>{if(money>=250){money-=250;maxSpeed+=2;accel+=.8;localStorage.setItem("uzbMoney",money);updateHUD();toast("🔧 Upgrade qilindi")}else toast("🪙 Pul yetarli emas")};
$("quality").onchange=e=>{const v=e.target.value;renderer.setPixelRatio(v==="high"?Math.min(devicePixelRatio,1.5):v==="medium"?1:.75)};

addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);update(dt);renderer.render(scene,camera)}
animate();
