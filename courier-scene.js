import { creatureDesign, PLAYER_CREATURE } from "./creatures.js";

// Heights and ground coordinates use the same world units as the riding simulation.
const facades = ["#ecc9a2", "#f2dab2", "#d39e89", "#a9c8c1", "#ead4c4"];
function facade(i) {
  const c = document.createElement("canvas");
  c.width = 192; c.height = 192;
  const g = c.getContext("2d");
  g.fillStyle = facades[i]; g.fillRect(0, 0, 192, 192);
  for (let floor = 0; floor < 3; floor++) {
    const y = floor * 64;
    for (let x = 12; x < 180; x += 48) {
      g.fillStyle = "#526e79"; g.fillRect(x, y + 13, 26, 30);
      g.fillStyle = "#a3c6cc"; g.fillRect(x + 2, y + 15, 10, 24);
      g.fillStyle = "#fff0cc"; g.fillRect(x - 4, y + 39, 34, 6);
    }
    g.fillStyle = "#685e5740"; g.fillRect(0, y + 49, 192, 4);
  }
  g.fillStyle = "#344e54"; g.fillRect(5, 156, 182, 36);
  for (let x = 0; x < 192; x += 12) {
    g.fillStyle = x % 24 ? "#fff0d6" : ["#de775f","#528f84","#c19849"][i % 3];
    g.fillRect(x, 152, 12, 10);
  }
  return c;
}

export function streetScene(canvas) {
  const creature = creatureDesign(PLAYER_CREATURE);
  const g = canvas.getContext("2d", { alpha: false });
  if (!g) throw new Error("הדפדפן אינו תומך בתצוגת הרכיבה.");
  const textures = facades.map((_, i) => facade(i));
  const buildings = [], palms = [];
  for (let z = -2; z <= 4; z += 2) for (let x = -2; x <= 6; x += 2) {
    for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) {
      const n = buildings.length;
      const l = x + .37 + j * .64, t = z + .37 + k * .64;
      buildings.push({ l, r: l + .59, t, b: t + .59, h: .45 + (n * 13 % 9) * .08, tex: textures[n % 5] });
    }
    palms.push([x + .31, z + .63], [x + 1.4, z + 1.69]);
  }
  return (o, target, time) => {
    const w = canvas.width = Math.max(300, Math.min(900, Math.round(canvas.clientWidth)));
    const h = canvas.height = Math.max(200, Math.round(w * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
    const horizon = h * .42, focal = Math.min(w * .78, h * 1.13), eye = .18;
    const sn = Math.sin(o.angle), cs = Math.cos(o.angle);
    const cx = o.x - sn * .17, cz = o.y + cs * .17;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#69bade"); sky.addColorStop(1, "#ffe1ad");
    g.fillStyle = sky; g.fillRect(0, 0, w, horizon + 1);
    const road = g.createLinearGradient(0, horizon, 0, h);
    road.addColorStop(0, "#a8a59a"); road.addColorStop(1, "#505b62");
    g.fillStyle = road; g.fillRect(0, horizon, w, h);
    const project = (x, z, elev) => {
      const dx = x - cx, dz = z - cz, d = dx * sn - dz * cs;
      return d <= .015 ? null : [w / 2 + focal * (dx * cs + dz * sn) / d, horizon + focal * (eye - elev) / d, d];
    };
    const stripe = (x, z, a, b, color) => {
      const p = [[x,z],[x+a,z],[x+a,z+b],[x,z+b]].map(([u,v]) => project(u,v,0));
      if (p.some(v => !v)) return;
      g.fillStyle = color; g.beginPath(); p.forEach(([u,v],i) => i ? g.lineTo(u,v) : g.moveTo(u,v)); g.fill();
    };
    for (let i = 0; i <= 6; i += 2) for (let j = 0; j < 4; j += .4) {
      if (Math.abs(j - Math.round(j/2)*2) > .32) stripe(i-.009,j,.018,.16,"#eee2b4");
    }
    for (let j = 0; j <= 4; j += 2) for (let i = 0; i < 6; i += .4) {
      if (Math.abs(i - Math.round(i/2)*2) > .32) stripe(i,j-.009,.16,.018,"#eee2b4");
    }
    const paint = [];
    // Draw vertical faces as perspective-correct texture strips, clipped at the near plane.
    function wall(x1,z1,x2,z2,b,shade) {
      let a = (x1-cx)*sn-(z1-cz)*cs, d = (x2-cx)*sn-(z2-cz)*cs;
      if (a < .025 && d < .025) return;
      const lo = a < .025 ? (.025-a)/(d-a) : 0, hi = d < .025 ? (.025-a)/(d-a) : 1;
      const at = t => project(x1+(x2-x1)*t,z1+(z2-z1)*t,0);
      let p = at(lo), q = at(hi), u = lo, v = hi;
      if (p[0] > q[0]) { [p,q] = [q,p]; [u,v] = [v,u]; }
      const span = q[0]-p[0], left = Math.max(0,Math.floor(p[0])), right = Math.min(w,Math.ceil(q[0]));
      if (right <= left || span < .01) return;
      paint.push([(p[2]+q[2])/2, () => {
        for (let i = left; i < right; i += 3) {
          const k = Math.max(0, Math.min(1,(i-p[0])/span)), inv = (1-k)/p[2]+k/q[2];
          const tx = ((1-k)*u/p[2]+k*v/q[2])/inv;
          const top = horizon + (eye-b.h)*focal*inv, ht = b.h*focal*inv;
          g.drawImage(b.tex, Math.min(191,Math.max(0,tx*191)),0,1,192,i,top,Math.min(3,right-i),ht);
        }
        if (shade) {
          g.fillStyle="#24394238"; g.beginPath();
          g.moveTo(p[0],p[1]); g.lineTo(q[0],q[1]); g.lineTo(q[0],q[1]-b.h*focal/q[2]); g.lineTo(p[0],p[1]-b.h*focal/p[2]); g.fill();
        }
      }]);
    }
    for (const b of buildings) {
      if (cx < b.l) wall(b.l,b.t,b.l,b.b,b,true);
      if (cx > b.r) wall(b.r,b.b,b.r,b.t,b,true);
      if (cz < b.t) wall(b.r,b.t,b.l,b.t,b,false);
      if (cz > b.b) wall(b.l,b.b,b.r,b.b,b,false);
    }
    function sprite(x,z,size,draw) {
      const p = project(x,z,0);
      if (!p || p[2] < .07 || Math.abs(p[0]-w/2) > w*.8) return;
      paint.push([p[2], () => { g.save(); g.translate(p[0],p[1]); g.scale(size*focal/p[2],size*focal/p[2]); draw(); g.restore(); }]);
    }
    for (const [x,z] of palms) sprite(x,z,.33,() => {
      g.fillStyle="#977853"; g.fillRect(-.035,-.92,.07,.92);
      for (let k=-2;k<=2;k++) { g.fillStyle=k%2?"#467b62":"#61936d"; g.beginPath(); g.moveTo(0,-.86); g.quadraticCurveTo(k*.18,-1.32,k*.25,-.68+Math.abs(k)*.04); g.fill(); }
    });
    sprite(target.x,target.y,.26,() => {
      g.fillStyle="#ffde62"; g.beginPath(); g.ellipse(0,0,.46,.09,0,0,Math.PI*2); g.fill();
      g.translate(0,-.92+Math.sin(time/250)*.06); g.beginPath(); g.arc(0,-.26,.32,0,Math.PI*2); g.fill();
      g.beginPath(); g.moveTo(-.2,-.1);g.lineTo(.2,-.1);g.lineTo(0,.15);g.fill();
      g.fillStyle="#293e43";g.font="bold .34px sans-serif";g.textAlign="center";g.fillText(o.picked?"✓":"☕",0,-.15);
    });
    paint.sort((a,b) => b[0]-a[0]); paint.forEach(item => item[1]());
    // Rear view keeps the player's ears and luminous tail visible around the delivery bag.
    g.save(); g.translate(w*.5,h*.96); const scale=Math.min(w,h)*.003; g.scale(scale,scale);
    const pulse = Math.sin(time*.014)*Math.min(1,Math.abs(o.speed)*2);
    const oval=(x,y,rx,ry,color)=>{g.fillStyle=color;g.beginPath();g.ellipse(x,y,rx,ry,0,0,2*Math.PI);g.fill();};
    oval(0,-2,25,5,"#26383c66");oval(0,-21,6,23,"#242e38");oval(0,-21,2,18,"#899798");
    g.lineCap="round"; const line=(x,y,u,v,color,n)=>{g.strokeStyle=color;g.lineWidth=n;g.beginPath();g.moveTo(x,y);g.lineTo(u,v);g.stroke();};
    line(-8,-49,-9,-17+pulse*5,creature.color,7);line(8,-49,9,-17-pulse*5,creature.color,7);
    line(-19,-51,19,-51,"#303d42",3);line(-10,-69,-18,-52,creature.color,8);line(10,-69,18,-52,creature.color,8);
    oval(0,-61,17,20,creature.color);
    line(0,-45,12,-36,creature.color,8);oval(15,-36,5,6,creature.accent);
    g.fillStyle="#167a78";g.fillRect(-13,-69,26,22);g.fillStyle="#64ceac";g.fillRect(-14,-71,28,7);g.fillStyle="#f7e7bf";g.fillRect(-8,-56,16,3);
    oval(-12,-97,6,16,creature.color);oval(12,-97,6,16,creature.color);
    oval(-12,-100,3,10,creature.accent);oval(12,-100,3,10,creature.accent);
    oval(0,-82,15,13,creature.color);oval(0,-87,12,7,"#f0aa49");g.restore();
    // North-up street navigator and heading indicator.
    const m=Math.min(w*.20,h*.30), step=m/7, left=12, top=h-5*step-14;
    g.fillStyle="#193139dd";g.fillRect(left,top,m,5*step);
    const mx=x=>left+(x+.5)*step, mz=z=>top+(z+.5)*step;
    for(let x=0;x<=6;x+=2) {g.fillStyle="#81948e";g.fillRect(mx(x)-2,mz(0),4,4*step);}
    for(let z=0;z<=4;z+=2) {g.fillStyle="#81948e";g.fillRect(mx(0),mz(z)-2,6*step,4);}
    g.fillStyle="#ffe06c";g.beginPath();g.arc(mx(target.x),mz(target.y),4,0,7);g.fill();
    g.save();g.translate(mx(o.x),mz(o.y));g.rotate(o.angle);g.fillStyle="#66f6cd";g.beginPath();g.moveTo(0,-6);g.lineTo(4,4);g.lineTo(-4,4);g.fill();g.restore();
  };
}
