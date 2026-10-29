// Живое превью танка на главном меню — тот же makeTank, что и в бою.
// Танк стоит на травяной плитке, покачивается и целится по кругу.

import { Application, Graphics } from './vendor/pixi.min.mjs';
import { makeTank } from './game.js';

export async function createTankPreview(el, color) {
  const app = new Application();
  await app.init({
    width: 300,
    height: 210,
    backgroundAlpha: 0,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  el.appendChild(app.canvas);

  const pad = new Graphics();
  pad.roundRect(50, 138, 200, 58, 16).fill({ color: 0x74bf49 }).stroke({ width: 5, color: 0x5d4037 });
  pad.roundRect(58, 146, 184, 10, 5).fill({ color: 0x6fbf56 });
  app.stage.addChild(pad);

  const tank = makeTank(color, 1.7);
  tank.position.set(150, 128);
  app.stage.addChild(tank);

  let t = 0;
  app.ticker.add((tk) => {
    t += tk.deltaMS / 1000;
    tank.y = 128 + Math.sin(t * 2) * 4;
    tank.turret.rotation = -0.08 + Math.sin(t * 0.7) * 0.06;
  });
}
