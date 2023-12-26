import { dd } from './macros';
import wgsl from '../wgsl';

/**
 * Find roots using Cardano's method. http://en.wikipedia.org/wiki/Cubic_function#Cardano.27s_method
 */
const solveCubic2 = wgsl.fn('solve_cubic_2')`(a: vec3f) -> vec2f {
	let p  = a.y - a.x*a.x/3.;
  let p3 = p*p*p;
  let q  = a.x * (2.*a.x*a.x - 9.*a.y) / 27. + a.z;
  let d  = q*q + 4.*p3/27.;

	if (d > 0.) {
		var x = (vec2(1,-1)*sqrt(d) - q) * .5;
    x = sign(x) * pow(abs(x), vec2f(1./3.));
    return vec2f(x.x+x.y -a.x/3.);
  }

 	let v = acos( -sqrt(-27./p3)*q*.5 ) / 3.;
  let m = cos(v);
  let n = sin(v) * sqrt(3.);

	return vec2f(m+m, -n-m) * sqrt(-p/3.) - a.x/3.;
}
`;

// How to solve the equation below can be seen on this image.
// http://www.perbloksgaard.dk/research/DistanceToQuadraticBezier.jpg
export const quadBezier2 = wgsl.fn(
  'sdf_quad_bezier2'
)`(p: vec2f, a: vec2f, b: vec2f, c: vec2f) -> f32 {
	let b2 = mix(b + vec2(1e-4), b, abs(sign(2. * b - a - c)));
	let A = b2 - a;
	let B = c - b2 - A;
	let C = p - a;
	let D = A * 2.;
	var P = ${solveCubic2}( vec3(-3.*dot(A,B), dot(C,B)-2.*${dd('A')}, dot(C,A))/-${dd('B')} );
  P.x = min(max(P.x, 0.), 1.); // curve parameterization
  P.y = min(max(P.y, 0.), 1.); // curve parameterization

	return sqrt(
    min(
      ${dd('(D+B*P.x)*P.x - C')},
      ${dd('(D+B*P.y)*P.y - C')}
    )
  );
}
`;

const cbrt = wgsl.fn('cbrt')`(x: f32) -> f32 {
  return sign(x) * pow(abs(x), 1. / 3.);
}`;

// It uses this quartic solver https://www.shadertoy.com/view/fsB3Wt by oneshade
const solveQuartic = wgsl.fn(
  'solve_quartic'
)`(ai: f32, bi: f32, ci: f32, di: f32, ei: f32) -> vec4f {
  var roots: vec4f;

  var a = ai;
  var b = bi;
  var c = ci;
  var d = di;
  var e = ei;
  b /= a; c /= a; d /= a; e /= a; // Divide by leading coefficient to make it 1

  // Depress the quartic to x^4 + px^2 + qx + r by substituting x-b/4a
  // This can be found by substituting x+u and the solving for the value
  // of u that makes the t^3 term go away
  let bb = b * b;
  let p = (8.0 * c - 3.0 * bb) / 8.0;
  let q = (8.0 * d - 4.0 * c * b + bb * b) / 8.0;
  let r = (256.0 * e - 64.0 * d * b + 16.0 * c * bb - 3.0 * bb * bb) / 256.0;
  var n = 0; // Root counter

  // Solve for a root to (t^2)^3 + 2p(t^2)^2 + (p^2 - 4r)(t^2) - q^2 which resolves the
  // system of equations relating the product of two quadratics to the depressed quartic
  let ra =  2.0 * p;
  let rb =  p * p - 4.0 * r;
  let rc = -q * q;

  // Depress using the method above
  let ru = ra / 3.0;
  let rp = rb - ra * ru;
  let rq = rc - (rb - 2.0 * ra * ra / 9.0) * ru;

  var lambda: f32;
  var rh = 0.25 * rq * rq + rp * rp * rp / 27.0;
  if (rh > 0.0) { // Use Cardano's formula in the case of one real root
      rh = sqrt(rh);
      let ro = -0.5 * rq;
      lambda = ${cbrt}(ro - rh) + ${cbrt}(ro + rh) - ru;
  }

  else { // Use complex arithmetic in the case of three real roots
      let rm = sqrt(-rp / 3.0);
      lambda = -2.0 * rm * sin(asin(1.5 * rq / (rp * rm)) / 3.0) - ru;
  }

  // Newton iteration to fix numerical problems (using Horners method)
  // Suggested by @NinjaKoala
  for(var i=0; i < 2; i++) {
      let a_2 = ra + lambda;
      let a_1 = rb + lambda * a_2;
      let b_2 = a_2 + lambda;

      let f = rc + lambda * a_1; // Evaluation of λ^3 + ra * λ^2 + rb * λ + rc
      let f1 = a_1 + lambda * b_2; // Derivative

      lambda -= f / f1; // Newton iteration step
  }

  // Solve two quadratics factored from the quartic using the cubic root
  if (lambda < 0.0) {
    return roots;
  }
  var t = sqrt(lambda); // Because we solved for t^2 but want t
  let alpha = 2.0 * q / t;
  let beta = lambda + ra;

  let u = 0.25 * b;
  t *= 0.5;

  var z = -alpha - beta;
  if (z > 0.0) {
    z = sqrt(z) * 0.5;
    let h = t - u;
    roots.x = h + z;
    roots.y = h - z;
    n += 2;
  }

  var w = alpha - beta;
  if (w > 0.0) {
    w = sqrt(w) * 0.5;
    let h = -t - u;
    roots.z = h + w;
    roots.w = h - w;
    if (n == 0) {
      roots.x = roots.z;
      roots.y = roots.w;
    }
    n += 2;
  }

  return roots;
}`;

export const cubicBezier2 = wgsl.fn(
  'sdf_cubic_bezier2'
)`(uv: vec2f, a: vec2f, b: vec2f, c: vec2f, d: vec2f) -> f32 {
  var s1 = -1.0;  let S1 = 3.0*(b-c)-a+d;
  var s2 =  1.0;  let S2 = 3.0*(c+a-b-b);
  var H1 = -1.0;  let S3 = 3.0*(b-a);
  var H2 =  1.0;  let S4 = a-uv;

  let U1 = 3.0*dot(S1,S1);
  let U2 = 5.0*dot(S1,S2);
  let U3 = 4.0*dot(S1,S3) + 2.0*dot(S2,S2);
  let U4 = 3.0*dot(S1,S4) + 3.0*dot(S2,S3);
  let U5 = 2.0*dot(S2,S4) + 1.0*dot(S3,S3);
  let U6 = 1.0*dot(S3,S4);

  for (var i = 0; i < 12; i += 1) {
    let s3 = (s1+s2)/2.0; let k = s3/(1.0-abs(s3));
    let H3 = k*(k*(k*(k*(U1*k+U2)+U3)+U4)+U5)+U6;

    if (H1*H3 <= 0.0) {
      s2 = s3;
      H2 = H3;
    } else {
      s1 = s3;
      H1 = H3;
    }
  }

  var n1 = (s1*H2-s2*H1) / (H2-H1);
  n1 /= 1. - abs(n1);

  // Clipping the domain at the ends
  n1 = max(0., min(n1, 1.));
  // END
  
  let B1 = U1;
  let B2 = U2+n1*B1;
  let B3 = U3+n1*B2;
  let B4 = U4+n1*B3;
  let B5 = U5+n1*B4;
  
  var roots = ${solveQuartic}(B1, B2, B3, B4, B5);
  
  let n2 = roots.x;
  let n3 = roots.y;
  let n4 = roots.z;
  let n5 = roots.w;

  let N1 = n1*(n1*(S1*n1+S2)+S3)+S4; let I1 = ${dd('N1')};
  let N2 = n2*(n2*(S1*n2+S2)+S3)+S4; let I2 = ${dd('N2')};
  let N3 = n3*(n3*(S1*n3+S2)+S3)+S4; let I3 = ${dd('N3')};
  let N4 = n4*(n4*(S1*n4+S2)+S3)+S4; let I4 = ${dd('N4')};
  let N5 = n5*(n5*(S1*n5+S2)+S3)+S4; let I5 = ${dd('N5')};

  return sqrt(min(min(min(min(I1,I2),I3),I4),I5));
}
`;
