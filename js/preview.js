// Живое превью танка на главном меню — тот же makeTank, что и в бою.
// Танк стоит на травяной плитке, покачивается и целится по кругу.

import { Application, Graphics } from './vendor/pixi.min.mjs';
import { makeTank } from './game.js';

export async function createTankPreview(el, color) {
  const app = new Application();
  await app.init({
    width: 300,
    height: 168,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  el.appendChild(app.canvas);

  const pad = new Graphics();
  pad.roundRect(46, 102, 208, 58, 16).fill({ color: 0x74bf49 }).stroke({ width: 5, color: 0x5d4037 });
  pad.roundRect(54, 110, 192, 10, 5).fill({ color: 0x6fbf56 });
  app.stage.addChild(pad);

  const tank = makeTank(color, 1.5);
  tank.position.set(146, 90);
  app.stage.addChild(tank);

  let t = 0;
  app.ticker.add((tk) => {
    t += tk.deltaMS / 1000;
    tank.y = 90 + Math.sin(t * 2) * 3;
    tank.turret.rotation = -0.08 + Math.sin(t * 0.7) * 0.06;
  });
}
