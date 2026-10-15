// @ts-nocheck
import { installWeather } from "../infinite/weather";

/**
 * Free Style weather (5.67.0): each day has its weather, and tomorrow's is known (the forecast in the top bar). It looks like the
 * Infinite world's weather (the same rain, splashes, blown leaves, lightning, clouds and fog) and it matters:
 * rain and storms help the farms (bread comes faster), fill the wells and lake buckets quicker and make people less thirsty;
 * a storm slows work outdoors; fog makes animals notice hunters later.
 */
export type Wx = "sunny" | "breezy" | "windy" | "overcast" | "rain" | "storm" | "fog";
export const WX_INFO: Record<Wx, { icon: string; name: string; note: string }> = {
  sunny: { icon: "☀️", name: "Sunny", note: "" },
  breezy: { icon: "🍃", name: "Breezy", note: "" },
  windy: { icon: "💨", name: "Windy", note: "" },
  overcast: { icon: "☁️", name: "Overcast", note: "" },
  rain: { icon: "🌧️", name: "Rain", note: "Farms grow faster, water is quicker to fetch, people get less thirsty." },
  storm: { icon: "⛈️", name: "Thunderstorm", note: "Like rain, but work outdoors is slower." },
  fog: { icon: "🌫️", name: "Fog", note: "Animals notice hunters later." },
};
export function rollWx(): Wx {
  const u = Math.random();
  return u < 0.25 ? "sunny" : u < 0.42 ? "breezy" : u < 0.55 ? "windy" : u < 0.68 ? "overcast" : u < 0.86 ? "rain" : u < 0.92 ? "storm" : "fog";
}

export function installFsWeather(ctx: any, game: any) {
  const env = ctx.env, S = game.S;
  if (!S.weather) S.weather = { today: "sunny", tomorrow: rollWx() };
  const wx = { kind: "clear", rainAmt: 0, fogAmt: 0, bloodAmt: 0, blood: false, day: 0, rain: null };
  env.iife = { wx };
  env.legacyDay = game.day();
  ctx.noBox = true;
  installWeather(ctx);
  const apply = () => { env.legacyDay = game.day(); wx.day = game.day(); ctx.x.setFlavor(S.weather.today); game.weather = S.weather.today; };
  apply();
  game.on((e: any) => {
    if (e.type !== "dawn") return;
    S.weather.today = S.weather.tomorrow; S.weather.tomorrow = rollWx();
    apply();
    const w = WX_INFO[S.weather.today as Wx];
    if (w.note) game.log(w.icon + " " + w.name + " today. " + w.note, "info");
  });
  ctx.frame.unshift((dt: number) => {
    const t = S.weather.today, wet = t === "rain" || t === "storm" ? 1 : 0, foggy = t === "fog" ? 1 : 0;
    wx.rainAmt += (wet - wx.rainAmt) * Math.min(1, dt * 0.5);
    wx.fogAmt += (foggy - wx.fogAmt) * Math.min(1, dt * 0.5);
    if (env.legacyDay !== game.day()) apply();
  });
}
