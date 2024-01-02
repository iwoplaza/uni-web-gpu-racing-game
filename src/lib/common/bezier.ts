import { vec2, vec4, type Vec2, type Vec4 } from 'wgpu-matrix';

function cbrt(x: number) {
  return Math.sign(x) * Math.pow(Math.abs(x), 1.0 / 3.0);
}

// It uses this quartic solver https://www.shadertoy.com/view/fsB3Wt by oneshade
function solveQuartic(a: number, b: number, c: number, d: number, e: number, roots: Vec4) {
  b /= a;
  c /= a;
  d /= a;
  e /= a; // Divide by leading coefficient to make it 1

  // Depress the quartic to x^4 + px^2 + qx + r by substituting x-b/4a
  // This can be found by substituting x+u and the solving for the value
  // of u that makes the t^3 term go away
  const bb = b * b;
  const p = (8.0 * c - 3.0 * bb) / 8.0;
  const q = (8.0 * d - 4.0 * c * b + bb * b) / 8.0;
  const r = (256.0 * e - 64.0 * d * b + 16.0 * c * bb - 3.0 * bb * bb) / 256.0;
  let n = 0; // Root counter

  // Solve for a root to (t^2)^3 + 2p(t^2)^2 + (p^2 - 4r)(t^2) - q^2 which resolves the
  // system of equations relating the product of two quadratics to the depressed quartic
  const ra = 2.0 * p;
  const rb = p * p - 4.0 * r;
  const rc = -q * q;

  // Depress using the method above
  const ru = ra / 3.0;
  const rp = rb - ra * ru;
  const rq = rc - (rb - (2.0 * ra * ra) / 9.0) * ru;

  let lambda: number;
  let rh = 0.25 * rq * rq + (rp * rp * rp) / 27.0;
  if (rh > 0.0) {
    // Use Cardano's formula in the case of one real root
    rh = Math.sqrt(rh);
    const ro = -0.5 * rq;
    lambda = cbrt(ro - rh) + cbrt(ro + rh) - ru;
  } else {
    // Use complex arithmetic in the case of three real roots
    const rm = Math.sqrt(-rp / 3.0);
    lambda = -2.0 * rm * Math.sin(Math.asin((1.5 * rq) / (rp * rm)) / 3.0) - ru;
  }

  // Newton iteration to fix numerical problems (using Horners method)
  // Suggested by @NinjaKoala
  for (let i = 0; i < 2; i++) {
    const a_2 = ra + lambda;
    const a_1 = rb + lambda * a_2;
    const b_2 = a_2 + lambda;

    const f = rc + lambda * a_1; // Evaluation of λ^3 + ra * λ^2 + rb * λ + rc
    const f1 = a_1 + lambda * b_2; // Derivative

    lambda -= f / f1; // Newton iteration step
  }

  // Solve two quadratics factored from the quartic using the cubic root
  if (lambda < 0.0) {
    return roots;
  }
  let t = Math.sqrt(lambda); // Because we solved for t^2 but want t
  const alpha = (2.0 * q) / t;
  const beta = lambda + ra;

  const u = 0.25 * b;
  t *= 0.5;

  let z = -alpha - beta;
  if (z > 0.0) {
    z = Math.sqrt(z) * 0.5;
    const h = t - u;
    roots[0] = h + z;
    roots[1] = h - z;
    n += 2;
  }

  let w = alpha - beta;
  if (w > 0.0) {
    w = Math.sqrt(w) * 0.5;
    const h = -t - u;
    roots[2] = h + w;
    roots[3] = h - w;
    if (n == 0) {
      roots[0] = roots[2];
      roots[1] = roots[3];
    }
    n += 2;
  }

  return roots;
}

export function cubicBezier2(uv: Vec2, a: Vec2, b: Vec2, c: Vec2, d: Vec2) {
  let s1 = -1.0;
  let s2 = 1.0;
  let H1 = -1.0;
  let H2 = 1.0;

  const S1 = vec2.add(vec2.sub(vec2.scale(vec2.sub(b, c), 3.0), a), d); // 3.0*(b-c)-a+d;
  const S2 = vec2.scale(vec2.sub(vec2.sub(vec2.add(c, a), b), b), 3.0); // 3.0*(c+a-b-b);
  const S3 = vec2.scale(vec2.sub(b, a), 3.0); // 3.0*(b-a);
  const S4 = vec2.sub(a, uv); // a-uv;

  const U1 = 3.0 * vec2.dot(S1, S1);
  const U2 = 5.0 * vec2.dot(S1, S2);
  const U3 = 4.0 * vec2.dot(S1, S3) + 2.0 * vec2.dot(S2, S2);
  const U4 = 3.0 * vec2.dot(S1, S4) + 3.0 * vec2.dot(S2, S3);
  const U5 = 2.0 * vec2.dot(S2, S4) + 1.0 * vec2.dot(S3, S3);
  const U6 = 1.0 * vec2.dot(S3, S4);

  for (let i = 0; i < 12; i += 1) {
    const s3 = (s1 + s2) / 2.0;
    const k = s3 / (1.0 - Math.abs(s3));
    const H3 = k * (k * (k * (k * (U1 * k + U2) + U3) + U4) + U5) + U6;

    if (H1 * H3 <= 0.0) {
      s2 = s3;
      H2 = H3;
    } else {
      s1 = s3;
      H1 = H3;
    }
  }

  let n1 = (s1 * H2 - s2 * H1) / (H2 - H1);
  n1 /= 1 - Math.abs(n1);

  const B1 = U1;
  const B2 = U2 + n1 * B1;
  const B3 = U3 + n1 * B2;
  const B4 = U4 + n1 * B3;
  const B5 = U5 + n1 * B4;

  const roots = vec4.create();
  solveQuartic(B1, B2, B3, B4, B5, roots);

  // Clipping the domain at the ends
  n1 = Math.max(0, Math.min(n1, 1));
  const n2 = Math.max(0, Math.min(roots[0], 1));
  const n3 = Math.max(0, Math.min(roots[1], 1));
  const n4 = Math.max(0, Math.min(roots[2], 1));
  const n5 = Math.max(0, Math.min(roots[3], 1));
  // END

  const N1 = vec2.add(
    vec2.scale(vec2.add(vec2.scale(vec2.add(vec2.scale(S1, n1), S2), n1), S3), n1),
    S4
  );
  const I1 = vec2.dot(N1, N1);
  const N2 = vec2.add(
    vec2.scale(vec2.add(vec2.scale(vec2.add(vec2.scale(S1, n2), S2), n2), S3), n2),
    S4
  );
  const I2 = vec2.dot(N2, N2);
  const N3 = vec2.add(
    vec2.scale(vec2.add(vec2.scale(vec2.add(vec2.scale(S1, n3), S2), n3), S3), n3),
    S4
  );
  const I3 = vec2.dot(N3, N3);
  const N4 = vec2.add(
    vec2.scale(vec2.add(vec2.scale(vec2.add(vec2.scale(S1, n4), S2), n4), S3), n4),
    S4
  );
  const I4 = vec2.dot(N4, N4);
  const N5 = vec2.add(
    vec2.scale(vec2.add(vec2.scale(vec2.add(vec2.scale(S1, n5), S2), n5), S3), n5),
    S4
  );
  const I5 = vec2.dot(N5, N5);

  return Math.sqrt(Math.min(Math.min(Math.min(Math.min(I1, I2), I3), I4), I5));
}
