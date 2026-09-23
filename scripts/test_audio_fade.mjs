/**
 * Music fades must stay inside HTMLMediaElement's [0, 1] volume range.
 * A frame timestamp slightly before or after the fade window used to throw
 * IndexSizeError (negative volume).
 */
import { clampMediaVolume, fadeProgress, fadeVolumePair } from '../web/js/music.js';

let failed = 0;
function assert(cond, msg) {
  if (!cond) { failed++; console.error('FAIL', msg); }
  else console.log('ok ', msg);
}

assert(clampMediaVolume(-0.002) === 0, 'negative volume clamps to 0');
assert(clampMediaVolume(1.4) === 1, 'volume above 1 clamps to 1');
assert(clampMediaVolume(0.32) === 0.32, 'in-range volume is unchanged');
assert(clampMediaVolume(Number.NaN) === 0, 'NaN volume clamps to 0');
assert(clampMediaVolume(undefined) === 0, 'missing volume clamps to 0');

assert(fadeProgress(-15, 2400) === 0, 'clock skew behind t0 stays at 0');
assert(fadeProgress(2400 + 40, 2400) === 1, 'clock skew past the end stays at 1');
assert(fadeProgress(1200, 2400) === 0.5, 'mid fade is half');

const early = fadeVolumePair(0.32, 0.32, -15, 2400);
assert(early.to === 0 && early.from === 0.32, `early fade volumes stay legal (${early.to}, ${early.from})`);
const late = fadeVolumePair(0.32, 0.32, 2415, 2400);
assert(late.to === 0.32 && late.from === 0, `late fade volumes stay legal (${late.to}, ${late.from})`);
const overshoot = fadeVolumePair(0.32, 0.32, 2400 * 1.00625, 2400);
assert(overshoot.to >= 0 && overshoot.to <= 1 && overshoot.from >= 0 && overshoot.from <= 1, 'overshoot pair is inside [0, 1]');
assert(overshoot.from === 0, 'overshoot finishes the outgoing track at 0');

const negStart = fadeVolumePair(-0.00201333, 0.32, 10, 2400);
assert(negStart.to >= 0 && negStart.to <= 1 && negStart.from >= 0 && negStart.from <= 1, 'a negative start volume cannot produce an illegal fade');

if (failed) {
  console.error(`${failed} failed`);
  process.exit(1);
}
console.log('audio fade clamps ok');
