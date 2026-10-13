import { describe, expect, it } from 'vitest';
import { bezelFor, displacementAt, maxDisplacement, roundedRect, squircle } from '../engine/src/effects/liquidGlass.ts';

describe('liquid glass optics', () => {
  it('the bezel is a rim: it grows with the shape, then stops growing', () => {
    expect(bezelFor(20, 20)).toBe(8);
    expect(bezelFor(200, 60)).toBeCloseTo(13.2);
    expect(bezelFor(2000, 2000)).toBe(28);
  });
  it('the convex squircle rises from 0 at the rim to 1 on the flat top, and is steepest at the rim', () => {
    expect(squircle(0).height).toBeCloseTo(0);
    expect(squircle(1).height).toBeCloseTo(1);
    expect(squircle(0).slope).toBe(Infinity);
    expect(squircle(1).slope).toBeCloseTo(0);
    let last = -1;
    for (let t = 0; t <= 1; t += 0.05) { const h = squircle(t).height; expect(h).toBeGreaterThanOrEqual(last); last = h; }
  });
  it('light is bent within the rim and not at all on the flat top (Snell\'s law, n = 1.5)', () => {
    const bezel = 20;
    expect(displacementAt(1, bezel)).toBeCloseTo(0, 6);
    expect(displacementAt(0, bezel)).toBeGreaterThan(displacementAt(0.5, bezel));
    expect(displacementAt(0.5, bezel)).toBeGreaterThan(displacementAt(0.9, bezel));
    // at the rim the ray meets a (nearly) vertical wall: theta1 = 86 deg, sin(theta2) = sin(86 deg)/1.5, shift = thickness * tan(theta1 - theta2)
    const t1 = (86 * Math.PI) / 180, t2 = Math.asin(Math.sin(t1) / 1.5);
    expect(displacementAt(0, bezel)).toBeCloseTo((bezel * 0.9 * 0.5) * Math.tan(t1 - t2), 6);
    // the peak is a little inside the rim, where the glass is thicker but the wall is still steep; never smaller than at the rim
    expect(maxDisplacement(bezel)).toBeGreaterThanOrEqual(displacementAt(0, bezel));
    for (let t = 0; t <= 1; t += 0.01) expect(displacementAt(t, bezel)).toBeLessThanOrEqual(maxDisplacement(bezel) + 1e-3);
  });
  it('the displacement stays inside the shape (rays must land under the element, backdrop-filter cannot see outside it)', () => {
    for (const bezel of [8, 14, 28]) expect(maxDisplacement(bezel)).toBeLessThan(bezel);
  });
  it('signed distance and outward normal of a rounded rectangle', () => {
    const r = roundedRect(0, 0, 100, 30, 15);
    expect(r.sd).toBeCloseTo(-30); // the middle is 30 px from the top and bottom
    const top = roundedRect(0, -25, 100, 30, 15);
    expect(top.sd).toBeCloseTo(-5); expect(top.nx).toBe(0); expect(top.ny).toBe(-1);
    const corner = roundedRect(95, -25, 100, 30, 15); // inside the round corner
    expect(corner.nx).toBeGreaterThan(0); expect(corner.ny).toBeLessThan(0);
    expect(roundedRect(120, 0, 100, 30, 15).sd).toBeCloseTo(20); // outside
  });
});
