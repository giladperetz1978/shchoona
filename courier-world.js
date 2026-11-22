import * as T from "./vendor/three.module.min.js";

export function buildStreet(canvas) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new T.Scene(), camera = new T.PerspectiveCamera(62, 1, .1, 320);
  scene.background = new T.Color(0xaad9ed);
  scene.fog = new T.FogExp2(0xf5d6b1, .009);
  scene.add(new T.HemisphereLight(0xfff6dc, 0xa0aba7, 2));
  const sun = new T.DirectionalLight(0xffdea4, 2.2);
  sun.position.set(-50, 75, 30); scene.add(sun);
  const box = new T.BoxGeometry(), ball = new T.SphereGeometry(1, 12, 8);
  const cone = new T.ConeGeometry(1, 1, 6), wheel = new T.TorusGeometry(.37,.06,8,24);
  const standard = new T.MeshLambertMaterial(), matrix = new T.Object3D(), batches = new Map();
  function staticPart(geometry, color, x,y,z, w,h,d, rot=0) {
    matrix.position.set(x,y,z); matrix.rotation.set(0,rot,0); matrix.scale.set(w,h,d); matrix.updateMatrix();
    if (!batches.has(geometry)) batches.set(geometry, []);
    batches.get(geometry).push([matrix.matrix.clone(), new T.Color(color)]);
  }
  const block = (...args) => staticPart(box,...args);
  block(0x515b63,60,-.3,40,420,.5,360);
  for (let i=0;i<9;i++) staticPart(ball, i%2 ? 0x869c80 : 0x93ab8b,-115+i*43,-10,-95-i%3*12,46,27+i%4*7,30);
  const facades = [0xe5c9a1,0xf0d8bd,0xd6ae98,0xc1cebf,0xe0c5b9];
  let n=0;
  for(let x=-40;x<=120;x+=40) for(let z=-40;z<=80;z+=40) {
    block(0xd5c8b2,x+20,.04,z+20,27,.3,27);
    for(const dx of [13,26]) for(const dz of [13,26]) {
      if (x===0 && z===0 || x===40 && z===40 && dz===13) continue;
      const bx=x+dx,bz=z+dz, floors=2+(n*7%4), height=3*floors;
      block(facades[n++%5],bx,height/2,bz,11,height,11);
      block(0xffe6c8,bx,height,bz,11.4,.36,11.4);
      block(0x8a918c,bx+2,height+.7,bz+1,2.5,1.4,2);
      for(let f=0;f<floors;f++) for(const side of [-1,1]) {
        const y=1.5+3*f;
        for(const offset of [-3.3,0,3.3]) {
          block(0x456671,bx+offset,y,bz+side*5.52,1.7,1.65,.12);
          block(0x587b83,bx+side*5.52,y,bz+offset,.12,1.65,1.7);
        }
        // A square rather than another residential block on the approach to the café.
        block(0xc49874,20,.21,20,25,.15,25);
        for (let i=0;i<4;i++) {
          block(0x9a654b,20,.6+i*.95,20,6-i*.7,.95,6-i*.7);
        }
        block(0xe9ccb1,20,8.7,20,3.6,10,3.6);
        block(0xa87658,20,12.6,20,4.2,.45,4.2);
        staticPart(cone,0x477d73,20,15,20,3.7,4,3.7);
        for (const [x,z] of [[9,10],[30,30],[9,30]]) {
          block(0x925e37,x,.74,z,3,.25,1);block(0xb78652,x,1.18,z+.45,3,.75,.16);
          for(const side of [-1,1]) block(0x425655,x+side,.39,z,.25,.65,.65);
        }
        for(let i=0;i<3;i++) {
          const x=50+i*9;
          block(0x985f41,x,.84,51,4.6,1.35,2.4);
          for(const side of [-1,1]) block(0x695844,x+side*2,1.9,51,.14,3.4,.14);
          for(let k=0;k<8;k++) block(k%2?0xffe2a9:[0x469677,0xc96148,0xe9ad49][i],x-2.1+k*.6,3.4,51,.6,.32,3.6);
          for(let j=0;j<12;j++) staticPart(ball,i%2?0xdca23b:0xb6503f,x-1.5+j%6*.54,1.61,50.4+Math.floor(j/6)*.55,.32,.28,.32);
        }
        for(const z of [12,32,52,72]) {
          block(0x465b60,33.5,3,z,.2,6,.2);
          block(0x465b60,34.2,6,z,1.6,.16,.15);
          block(0xf4d99c,35,5.88,z,.65,.18,.48);
        }
        if(f) {
          block(0xf5dec5,bx,y-.76,bz+side*5.9,7,.24,1.2);
          block(0xb0bcaf,bx,y-.23,bz+side*6.44,7,.65,.13);
        }
      }
    }
    for(const dz of [9,31]) {
      block(0x8f7556,x+7.4,2,z+dz,.45,4,.45);
      staticPart(ball,0x66a479,x+7.4,4.6,z+dz,2.1,1.85,1.9);
      staticPart(ball,0x8aba78,x+6.8,5.45,z+dz,1.4,1.35,1.4);
    }
    // Parked cars sit outside the playable lane.
    block(n%3?0x518896:0xe39270,x+6.45,.68,z+20,1.65,.9,3.9);
    block(0x435e6b,x+6.45,1.34,z+20,1.4,.62,2.15);
    for(const side of [-1,1]) for(const offset of [-1.2,1.2])
      staticPart(ball,0x343c41,x+6.45+side*.77,.42,z+20+offset,.18,.4,.4);
    for(let s=9;s<34;s+=6) {
      block(0xf1e3b6,x,0,z+s,.15,.02,2.1);
      block(0xf1e3b6,x+s,0,z,2.1,.02,.15);
    }
    for(let s=-4;s<=4;s+=1.35) block(0xefe9db,x+s,.014,z+6,.68,.02,2);
  }
  for(let i=0;i<8;i++) block(i%2?0xf8dfa3:0xbe644e,47.5+i*.75,3.1,-6.4,.75,.36,2.3);
  for(const [geometry, parts] of batches) {
    const mesh = new T.InstancedMesh(geometry, standard, parts.length);
    parts.forEach(([m,c],i)=>{ mesh.setMatrixAt(i,m); mesh.setColorAt(i,c); }); scene.add(mesh);
  }
  const mats = new Map();
  function model(parent,geometry,color,x,y,z,w,h,d) {
    if(!mats.has(color)) mats.set(color,new T.MeshLambertMaterial({color}));
    const part=new T.Mesh(geometry,mats.get(color));part.position.set(x,y,z);part.scale.set(w,h,d);parent.add(part);return part;
  }
  for(const rotation of [0,Math.PI/2]) {
    const face = new T.Group(); scene.add(face);face.position.set(20+Math.sin(rotation)*1.83,11,20+Math.cos(rotation)*1.83);face.rotation.y=rotation;
    model(face,ball,0xffefc5,0,0,0,1.33,1.33,.1);
    for(let i=0;i<12;i++) model(face,box,0x4c5e5a,Math.sin(i*Math.PI/6)*1.1,Math.cos(i*Math.PI/6)*1.1,.09,.07,.17,.08).rotation.z=-i*Math.PI/6;
    model(face,box,0x334841,0,.42,.12,.09,.85,.08);
    model(face,box,0x334841,.26,.16,.14,.64,.1,.07).rotation.z=.48;
  }
  const rider = new T.Group(); scene.add(rider);
  for(const z of [-.69,.69]) {
    model(rider,wheel,0x26343d,0,.44,z,1,1,1).rotation.y=Math.PI/2;
    model(rider,box,0xdd9161,0,.78,z*.83,.08,.8,.10).rotation.x=z*.45;
  }
  model(rider,box,0x32827e,0,.72,0,.15,.19,1.22);
  model(rider,box,0x36414b,0,1.07,.19,.41,.12,.42);
  model(rider,box,0x303c42,0,1.12,-.57,.76,.07,.08);
  const legs=[-1,1].map(side=>model(rider,box,0x34485b,side*.18,.83,.08,.21,.68,.24));
  model(rider,ball,0xe98b57,0,1.5,-.03,.34,.54,.29);
  for(const side of [-1,1]) model(rider,box,0xcb8969,side*.29,1.37,-.30,.14,.15,.66).rotation.x=-.36;
  model(rider,ball,0xc9926f,0,2.09,-.18,.22,.26,.22);
  model(rider,ball,0xf8ac42,0,2.24,-.17,.264,.17,.27);
  model(rider,box,0x137d76,0,1.48,.36,.73,.64,.51);
  model(rider,box,0x75dcb8,0,1.82,.36,.76,.10,.54);
  model(rider,box,0xffe1a0,0,1.43,.625,.49,.07,.025);
  const shadow=model(rider,ball,0x434e53,0,.02,0,.5,.016,1.15);
  shadow.position.x=.12;
  const customer=new T.Group();scene.add(customer);
  model(customer,ball,0x5960a0,0,1.15,0,.32,.53,.25);
  model(customer,ball,0xbf8263,0,1.94,0,.23,.25,.22);
  for(const side of [-1,1]) model(customer,box,0x394751,side*.14,.48,0,.18,.93,.22);
  const arm=model(customer,box,0xbf8263,.4,1.54,0,.15,.56,.18);
  const barista=customer.clone();scene.add(barista);barista.position.set(45,.04,0);
  model(barista,box,0x2e7a69,0,1.2,.22,.57,.78,.13);
  model(barista,box,0xc89b62,-.43,1.12,.2,.45,.57,.34);
  const walker=customer.clone();scene.add(walker);
  const car=new T.Group();scene.add(car);
  model(car,box,0xc05249,0,.72,0,1.8,.9,3.9);
  model(car,box,0x567482,0,1.38,.14,1.5,.65,2.25);
  for(const side of [-1,1]) {
    model(car,box,0xffe9b4,side*.58,.78,-1.97,.46,.24,.09);
    for(const end of [-1,1]) model(car,ball,0x34434b,side*.87,.4,end*1.21,.18,.4,.4);
  }
  const marker=model(scene,cone,0xffbb2f,0,3,0,.62,1.1,.62);marker.rotation.z=Math.PI;
  const ring=model(scene,wheel,0xffcc54,0,.06,0,8,8,1);ring.rotation.x=Math.PI/2;
  const sign=document.createElement("canvas"); sign.width=512; sign.height=128;
  const ctx=sign.getContext("2d");ctx.fillStyle="#214d4c";ctx.fillRect(0,0,512,128);
  ctx.font="bold 76px Arial";ctx.textAlign="center";ctx.fillStyle="#ffe5ad";ctx.fillText("קפה פינה",256,91);
  const texture=new T.CanvasTexture(sign);texture.colorSpace=T.SRGBColorSpace;
  const signMat=new T.MeshBasicMaterial({map:texture}), signGeo=new T.PlaneGeometry(7,1.75);
  const plaque=new T.Mesh(signGeo,signMat);plaque.position.set(50,4.2,-5.8);scene.add(plaque);
  let lastWidth=0,lastHeight=0,lastAngle=null,lastTime=null,lean=0;
  function draw(o,target,t) {
    const w=canvas.clientWidth,h=canvas.clientHeight;
    if(w!==lastWidth || h!==lastHeight) {
      renderer.setSize(w,h,false);camera.aspect=w/Math.max(1,h);camera.updateProjectionMatrix();lastWidth=w;lastHeight=h;
    }
    const x=o.x*20,z=o.y*20,s=Math.sin(o.angle),c=Math.cos(o.angle);
    const dt=lastTime===null?0:Math.min(.1,(t-lastTime)/1000);
    const turn=lastAngle===null?0:Math.atan2(Math.sin(o.angle-lastAngle),Math.cos(o.angle-lastAngle))/Math.max(.001,dt);
    lean=T.MathUtils.damp(lean,T.MathUtils.clamp(-turn*o.speed*.14,-.22,.22),9,dt);
    rider.position.set(x,0,z);rider.rotation.order="YXZ";rider.rotation.y=-o.angle;rider.rotation.z=lean;
    lastAngle=o.angle;lastTime=t;
    legs.forEach((leg,i)=>{leg.rotation.x=Math.sin(t*.014+i*Math.PI)*Math.min(1,Math.abs(o.speed)*2)*.55;});
    camera.position.set(x-s*4.3,2.85,z+c*4.3);camera.lookAt(x+s*4,1.15,z-c*4);
    marker.position.set(target.x*20,3.1+.28*Math.sin(t*.004),target.y*20);
    ring.position.set(marker.position.x,.06,marker.position.z);
    customer.visible=o.picked;customer.position.set(marker.position.x+1.5,0,marker.position.z);
    customer.rotation.y=Math.atan2(x-customer.position.x,z-customer.position.z);
    arm.rotation.z=-.85+.35*Math.sin(t*.006);
    // The car waits before the crossing while the pedestrian walks, then continues.
    const phase=(60-(o.deadline-Date.now())/1000+24)%24;
    const carZ=phase<5?70-phase*4:phase<12?50:50-(phase-12)*4;
    car.position.set(37.7,.02,carZ);
    walker.position.set(phase<5?33:phase<12?33+(phase-5)*2:47,Math.abs(Math.sin(t*.009))*(phase>=5&&phase<12?.06:0),46);
    walker.rotation.y=Math.PI/2;
    renderer.render(scene,camera);
  }
  draw.dispose=()=>{
    scene.traverse(obj=>{if(obj.isInstancedMesh) obj.dispose();});
    [box,ball,cone,wheel,standard,signGeo,signMat,texture,...mats.values()].forEach(item=>item.dispose());
    renderer.dispose();renderer.forceContextLoss();
  };
  return draw;
}
