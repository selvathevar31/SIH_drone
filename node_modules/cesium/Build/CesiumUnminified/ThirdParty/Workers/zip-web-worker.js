!(function() {
  "use strict";
  const { Array: t, Object: e, Number: n, Math: s, Error: r, Uint8Array: o, Uint16Array: i, Uint32Array: a, Int32Array: c, Map: l, DataView: f, Promise: w, TextEncoder: u, crypto: h, postMessage: p, TransformStream: d, ReadableStream: y, WritableStream: m, CompressionStream: g, DecompressionStream: S } = self, b = void 0, k = "undefined", v = "function", z = new o(), C = [[], [], [], [], [], [], [], []];
  for (let t2 = 0; 256 > t2; t2++) {
    let e2 = t2;
    for (let t3 = 0; 8 > t3; t3++) e2 = 1 & e2 ? e2 >>> 1 ^ 3988292384 : e2 >>> 1;
    C[0][t2] = e2;
  }
  for (let t2 = 0; 256 > t2; t2++) for (let e2 = 1; 8 > e2; e2++) {
    const n2 = C[e2 - 1][t2];
    C[e2][t2] = n2 >>> 8 ^ C[0][255 & n2];
  }
  const [I, A, x, P, R, U, W, D] = C;
  class M {
    constructor(t2) {
      this.t = t2 || -1;
    }
    append(t2) {
      let e2 = 0 | this.t;
      const n2 = 0 | t2.length;
      let s2 = 0;
      if (n2 >= 8 && t2.buffer) {
        const r2 = new f(t2.buffer, t2.byteOffset, n2), o2 = n2 - 8;
        for (; o2 >= s2; s2 += 8) {
          const t3 = e2 ^ r2.getInt32(s2, true), n3 = r2.getInt32(s2 + 4, true);
          e2 = D[255 & t3] ^ W[t3 >>> 8 & 255] ^ U[t3 >>> 16 & 255] ^ R[t3 >>> 24 & 255] ^ P[255 & n3] ^ x[n3 >>> 8 & 255] ^ A[n3 >>> 16 & 255] ^ I[n3 >>> 24 & 255];
        }
      }
      for (; n2 > s2; s2++) e2 = e2 >>> 8 ^ I[255 & (e2 ^ t2[s2])];
      this.t = e2;
    }
    get() {
      return ~this.t;
    }
  }
  class _ extends d {
    constructor() {
      let t2;
      const e2 = new M();
      super({ transform(t3, n2) {
        e2.append(t3), n2.enqueue(t3);
      }, flush() {
        const n2 = new o(4);
        new f(n2.buffer).setUint32(0, e2.get()), t2.value = n2;
      } }), t2 = this;
    }
  }
  const B = { concat(t2, e2) {
    if (0 === t2.length || 0 === e2.length) return t2.concat(e2);
    const n2 = t2[t2.length - 1], s2 = B.o(n2);
    return 32 === s2 ? t2.concat(e2) : B.i(e2, s2, 0 | n2, t2.slice(0, t2.length - 1));
  }, l(t2) {
    const e2 = t2.length;
    if (0 === e2) return 0;
    const n2 = t2[e2 - 1];
    return 32 * (e2 - 1) + B.o(n2);
  }, u(t2, e2) {
    if (32 * t2.length < e2) return t2;
    const n2 = (t2 = t2.slice(0, s.ceil(e2 / 32))).length;
    return e2 &= 31, n2 > 0 && e2 && (t2[n2 - 1] = B.h(e2, t2[n2 - 1] & 2147483648 >> e2 - 1, 1)), t2;
  }, h: (t2, e2, n2) => 32 === t2 ? e2 : (n2 ? 0 | e2 : e2 << 32 - t2) + 1099511627776 * t2, o: (t2) => s.round(t2 / 1099511627776) || 32, i(t2, e2, n2, s2) {
    for (void 0 === s2 && (s2 = []); e2 >= 32; e2 -= 32) s2.push(n2), n2 = 0;
    if (0 === e2) return s2.concat(t2);
    for (let r3 = 0; r3 < t2.length; r3++) s2.push(n2 | t2[r3] >>> e2), n2 = t2[r3] << 32 - e2;
    const r2 = t2.length ? t2[t2.length - 1] : 0, o2 = B.o(r2);
    return s2.push(B.h(e2 + o2 & 31, e2 + o2 > 32 ? n2 : s2.pop(), 1)), s2;
  } }, T = { bytes: { p(t2) {
    const e2 = B.l(t2) / 8, n2 = new o(e2);
    let s2;
    for (let r2 = 0; e2 > r2; r2++) 3 & r2 || (s2 = t2[r2 / 4]), n2[r2] = s2 >>> 24, s2 <<= 8;
    return n2;
  }, m(t2) {
    const e2 = [];
    let n2, s2 = 0;
    for (n2 = 0; n2 < t2.length; n2++) s2 = s2 << 8 | t2[n2], 3 & ~n2 || (e2.push(s2), s2 = 0);
    return 3 & n2 && e2.push(B.h(8 * (3 & n2), s2)), e2;
  } } }, V = class {
    constructor(t2) {
      const e2 = this;
      e2.blockSize = 512, e2.S = [1732584193, 4023233417, 2562383102, 271733878, 3285377520], e2.k = [1518500249, 1859775393, 2400959708, 3395469782], t2 ? (e2.v = t2.v.slice(0), e2.C = t2.C.slice(0), e2.I = t2.I) : e2.reset();
    }
    reset() {
      const t2 = this;
      return t2.v = t2.S.slice(0), t2.C = [], t2.I = 0, t2;
    }
    update(t2) {
      const e2 = this;
      "string" == typeof t2 && (t2 = T.A.m(t2));
      const n2 = e2.C = B.concat(e2.C, t2), s2 = e2.I, o2 = e2.I = s2 + B.l(t2);
      if (o2 > 9007199254740991) throw new r("Cannot hash more than 2^53 - 1 bits");
      const i2 = new a(n2);
      let c2 = 0;
      for (let t3 = e2.blockSize + s2 - (e2.blockSize + s2 & e2.blockSize - 1); o2 >= t3; t3 += e2.blockSize) e2.P(i2.subarray(16 * c2, 16 * (c2 + 1))), c2 += 1;
      return n2.splice(0, 16 * c2), e2;
    }
    R() {
      const t2 = this;
      let e2 = t2.C;
      const n2 = t2.v;
      e2 = B.concat(e2, [B.h(1, 1)]);
      for (let t3 = e2.length + 2; 15 & t3; t3++) e2.push(0);
      for (e2.push(s.floor(t2.I / 4294967296)), e2.push(0 | t2.I); e2.length; ) t2.P(e2.splice(0, 16));
      return t2.reset(), n2;
    }
    U(t2, e2, n2, s2) {
      return t2 > 19 ? t2 > 39 ? t2 > 59 ? t2 > 79 ? void 0 : e2 ^ n2 ^ s2 : e2 & n2 | e2 & s2 | n2 & s2 : e2 ^ n2 ^ s2 : e2 & n2 | ~e2 & s2;
    }
    W(t2, e2) {
      return e2 << t2 | e2 >>> 32 - t2;
    }
    P(e2) {
      const n2 = this, r2 = n2.v, o2 = t(80);
      for (let t2 = 0; 16 > t2; t2++) o2[t2] = e2[t2];
      let i2 = r2[0], a2 = r2[1], c2 = r2[2], l2 = r2[3], f2 = r2[4];
      for (let t2 = 0; 79 >= t2; t2++) {
        16 > t2 || (o2[t2] = n2.W(1, o2[t2 - 3] ^ o2[t2 - 8] ^ o2[t2 - 14] ^ o2[t2 - 16]));
        const e3 = n2.W(5, i2) + n2.U(t2, a2, c2, l2) + f2 + o2[t2] + n2.k[s.floor(t2 / 20)] | 0;
        f2 = l2, l2 = c2, c2 = n2.W(30, a2), a2 = i2, i2 = e3;
      }
      r2[0] = r2[0] + i2 | 0, r2[1] = r2[1] + a2 | 0, r2[2] = r2[2] + c2 | 0, r2[3] = r2[3] + l2 | 0, r2[4] = r2[4] + f2 | 0;
    }
  }, K = { importKey: (t2) => new K.D(T.bytes.m(t2)), M(t2, e2, n2, s2) {
    if (n2 = n2 || 1e4, 0 > s2 || 0 > n2) throw new r("invalid params to pbkdf2");
    const o2 = 1 + (s2 >> 5) << 2;
    let i2, a2, c2, l2, w2;
    const u2 = new ArrayBuffer(o2), h2 = new f(u2);
    let p2 = 0;
    const d2 = B;
    for (e2 = T.bytes.m(e2), w2 = 1; (o2 || 1) > p2; w2++) {
      for (i2 = a2 = t2.encrypt(d2.concat(e2, [w2])), c2 = 1; n2 > c2; c2++) for (a2 = t2.encrypt(a2), l2 = 0; l2 < a2.length; l2++) i2[l2] ^= a2[l2];
      for (c2 = 0; (o2 || 1) > p2 && c2 < i2.length; c2++) h2.setInt32(p2, i2[c2]), p2 += 4;
    }
    return u2.slice(0, s2 / 8);
  }, D: class {
    constructor(t2) {
      const e2 = this, n2 = e2._ = V, s2 = [[], []];
      e2.B = [new n2(), new n2()];
      const r2 = e2.B[0].blockSize / 32;
      t2.length > r2 && (t2 = new n2().update(t2).R());
      for (let e3 = 0; r2 > e3; e3++) s2[0][e3] = 909522486 ^ t2[e3], s2[1][e3] = 1549556828 ^ t2[e3];
      e2.B[0].update(s2[0]), e2.B[1].update(s2[1]), e2.T = new n2(e2.B[0]);
    }
    reset() {
      const t2 = this;
      t2.T = new t2._(t2.B[0]), t2.V = false;
    }
    update(t2) {
      this.V = true, this.T.update(t2);
    }
    digest() {
      const t2 = this, e2 = t2.T.R(), n2 = new t2._(t2.B[1]).update(e2).R();
      return t2.reset(), n2;
    }
    encrypt(t2) {
      if (this.V) throw new r("encrypt on already updated hmac called!");
      return this.update(t2), this.digest(t2);
    }
  } }, j = typeof h != k && typeof h.getRandomValues == v, E = "Invalid password", L = "Invalid signature", O = "zipjs-abort-check-password";
  function H(t2) {
    if (j) return h.getRandomValues(t2);
    throw new r("Crypto API not supported");
  }
  const Z = 16, F = { name: "PBKDF2" }, N = e.assign({ hash: { name: "HMAC" } }, F), q = e.assign({ iterations: 1e3, hash: { name: "SHA-1" } }, F), G = ["deriveBits"], J = [8, 12, 16], Q = [16, 24, 32], X = 10, Y = [0, 0, 0, 0], $ = typeof h != k, tt = $ && h.subtle, et = $ && typeof tt != k, nt = T.bytes, st = class {
    constructor(t2) {
      const e2 = this;
      e2.K = [[[], [], [], [], []], [[], [], [], [], []]], e2.K[0][0][0] || e2.j();
      const n2 = e2.K[0][4], s2 = e2.K[1], o2 = t2.length;
      let i2, a2, c2, l2 = 1;
      if (4 !== o2 && 6 !== o2 && 8 !== o2) throw new r("invalid aes key size");
      for (e2.k = [a2 = t2.slice(0), c2 = []], i2 = o2; 4 * o2 + 28 > i2; i2++) {
        let t3 = a2[i2 - 1];
        (i2 % o2 === 0 || 8 === o2 && i2 % o2 === 4) && (t3 = n2[t3 >>> 24] << 24 ^ n2[t3 >> 16 & 255] << 16 ^ n2[t3 >> 8 & 255] << 8 ^ n2[255 & t3], i2 % o2 === 0 && (t3 = t3 << 8 ^ t3 >>> 24 ^ l2 << 24, l2 = l2 << 1 ^ 283 * (l2 >> 7))), a2[i2] = a2[i2 - o2] ^ t3;
      }
      for (let t3 = 0; i2; t3++, i2--) {
        const e3 = a2[3 & t3 ? i2 : i2 - 4];
        c2[t3] = 4 >= i2 || 4 > t3 ? e3 : s2[0][n2[e3 >>> 24]] ^ s2[1][n2[e3 >> 16 & 255]] ^ s2[2][n2[e3 >> 8 & 255]] ^ s2[3][n2[255 & e3]];
      }
    }
    encrypt(t2) {
      return this.L(t2, 0);
    }
    decrypt(t2) {
      return this.L(t2, 1);
    }
    j() {
      const t2 = this.K[0], e2 = this.K[1], n2 = t2[4], s2 = e2[4], r2 = [], o2 = [];
      let i2, a2, c2, l2;
      for (let t3 = 0; 256 > t3; t3++) o2[(r2[t3] = t3 << 1 ^ 283 * (t3 >> 7)) ^ t3] = t3;
      for (let f2 = i2 = 0; !n2[f2]; f2 ^= a2 || 1, i2 = o2[i2] || 1) {
        let o3 = i2 ^ i2 << 1 ^ i2 << 2 ^ i2 << 3 ^ i2 << 4;
        o3 = o3 >> 8 ^ 255 & o3 ^ 99, n2[f2] = o3, s2[o3] = f2, l2 = r2[c2 = r2[a2 = r2[f2]]];
        let w2 = 16843009 * l2 ^ 65537 * c2 ^ 257 * a2 ^ 16843008 * f2, u2 = 257 * r2[o3] ^ 16843008 * o3;
        for (let n3 = 0; 4 > n3; n3++) t2[n3][f2] = u2 = u2 << 24 ^ u2 >>> 8, e2[n3][o3] = w2 = w2 << 24 ^ w2 >>> 8;
      }
      for (let n3 = 0; 5 > n3; n3++) t2[n3] = t2[n3].slice(0), e2[n3] = e2[n3].slice(0);
    }
    L(t2, e2) {
      if (4 !== t2.length) throw new r("invalid aes block size");
      const n2 = this.k[e2], s2 = n2.length / 4 - 2, o2 = [0, 0, 0, 0], i2 = this.K[e2], a2 = i2[0], c2 = i2[1], l2 = i2[2], f2 = i2[3], w2 = i2[4];
      let u2, h2, p2, d2 = t2[0] ^ n2[0], y2 = t2[e2 ? 3 : 1] ^ n2[1], m2 = t2[2] ^ n2[2], g2 = t2[e2 ? 1 : 3] ^ n2[3], S2 = 4;
      for (let t3 = 0; s2 > t3; t3++) u2 = a2[d2 >>> 24] ^ c2[y2 >> 16 & 255] ^ l2[m2 >> 8 & 255] ^ f2[255 & g2] ^ n2[S2], h2 = a2[y2 >>> 24] ^ c2[m2 >> 16 & 255] ^ l2[g2 >> 8 & 255] ^ f2[255 & d2] ^ n2[S2 + 1], p2 = a2[m2 >>> 24] ^ c2[g2 >> 16 & 255] ^ l2[d2 >> 8 & 255] ^ f2[255 & y2] ^ n2[S2 + 2], g2 = a2[g2 >>> 24] ^ c2[d2 >> 16 & 255] ^ l2[y2 >> 8 & 255] ^ f2[255 & m2] ^ n2[S2 + 3], S2 += 4, d2 = u2, y2 = h2, m2 = p2;
      for (let t3 = 0; 4 > t3; t3++) o2[e2 ? 3 & -t3 : t3] = w2[d2 >>> 24] << 24 ^ w2[y2 >> 16 & 255] << 16 ^ w2[m2 >> 8 & 255] << 8 ^ w2[255 & g2] ^ n2[S2++], u2 = d2, d2 = y2, y2 = m2, m2 = g2, g2 = u2;
      return o2;
    }
  }, rt = class {
    constructor(t2, e2) {
      this.O = t2, this.H = e2, this.Z = e2;
    }
    reset() {
      this.Z = this.H;
    }
    update(t2) {
      return this.F(this.O, t2, this.Z);
    }
    N(t2) {
      if (255 & ~(t2 >> 24)) t2 += 1 << 24;
      else {
        let e2 = t2 >> 16 & 255, n2 = t2 >> 8 & 255, s2 = 255 & t2;
        255 === e2 ? (e2 = 0, 255 === n2 ? (n2 = 0, 255 === s2 ? s2 = 0 : ++s2) : ++n2) : ++e2, t2 = 0, t2 += e2 << 16, t2 += n2 << 8, t2 += s2;
      }
      return t2;
    }
    q(t2) {
      0 === (t2[0] = this.N(t2[0])) && (t2[1] = this.N(t2[1]));
    }
    F(t2, e2, n2) {
      let s2;
      if (!(s2 = e2.length)) return [];
      const r2 = B.l(e2);
      for (let r3 = 0; s2 > r3; r3 += 4) {
        this.q(n2);
        const s3 = t2.encrypt(n2);
        e2[r3] ^= s3[0], e2[r3 + 1] ^= s3[1], e2[r3 + 2] ^= s3[2], e2[r3 + 3] ^= s3[3];
      }
      return B.u(e2, r2);
    }
  }, ot = K.D;
  let it = $ && et && typeof tt.importKey == v, at = $ && et && typeof tt.deriveBits == v;
  class ct extends d {
    constructor({ password: t2, rawPassword: e2, encryptionStrength: n2, checkPasswordOnly: s2 }) {
      super({ start() {
        ft(this, t2, e2, n2);
      }, async transform(t3, e3) {
        const n3 = this, { password: i2, strength: a2, G: c2, ready: l2 } = n3;
        i2 ? (await (async (t4, e4, n4, s3) => {
          const o2 = await ut(t4, e4, n4, dt(s3, 0, J[e4])), i3 = dt(s3, J[e4]);
          if (o2[0] != i3[0] || o2[1] != i3[1]) throw new r(E);
        })(n3, a2, i2, dt(t3, 0, J[a2] + 2)), t3 = dt(t3, J[a2] + 2), s2 ? e3.error(new r(O)) : c2()) : await l2;
        const f2 = new o(t3.length - X - (t3.length - X) % Z);
        e3.enqueue(wt(n3, t3, f2, 0, X, true));
      }, async flush(t3) {
        const { J: e3, X: n3, pending: s3, ready: o2 } = this;
        if (n3 && e3) {
          await o2;
          const i2 = dt(s3, 0, s3.length - X), a2 = dt(s3, s3.length - X);
          let c2 = z;
          if (i2.length) {
            const t4 = mt(nt, i2);
            n3.update(t4);
            const s4 = e3.update(t4);
            c2 = yt(nt, s4);
          }
          const l2 = dt(yt(nt, n3.digest()), 0, X);
          let f2 = s3.length < X ? 1 : 0;
          for (let t4 = 0; X > t4; t4++) f2 |= l2[t4] ^ a2[t4];
          if (f2) throw new r(L);
          t3.enqueue(c2);
        }
      } });
    }
  }
  class lt extends d {
    constructor({ password: t2, rawPassword: e2, encryptionStrength: n2 }) {
      let s2;
      super({ start() {
        ft(this, t2, e2, n2);
      }, async transform(t3, e3) {
        const n3 = this, { password: s3, strength: r2, G: i2, ready: a2 } = n3;
        let c2 = z;
        s3 ? (c2 = await (async (t4, e4, n4) => {
          const s4 = H(new o(J[e4]));
          return pt(s4, await ut(t4, e4, n4, s4));
        })(n3, r2, s3), i2()) : await a2;
        const l2 = new o(c2.length + t3.length - t3.length % Z);
        l2.set(c2, 0), e3.enqueue(wt(n3, t3, l2, c2.length, 0));
      }, async flush(t3) {
        const { J: e3, X: n3, pending: r2, ready: o2 } = this;
        if (n3 && e3) {
          await o2;
          let i2 = z;
          if (r2.length) {
            const t4 = e3.update(mt(nt, r2));
            n3.update(t4), i2 = yt(nt, t4);
          }
          s2.signature = yt(nt, n3.digest()).slice(0, X), t3.enqueue(pt(i2, s2.signature));
        }
      } }), s2 = this;
    }
  }
  function ft(t2, n2, s2, r2) {
    e.assign(t2, { ready: new w((e2) => t2.G = e2), password: ht(n2, s2), strength: r2 - 1, pending: z });
  }
  function wt(t2, e2, n2, s2, r2, i2) {
    const { J: a2, X: c2, pending: l2 } = t2;
    l2.length && (e2 = pt(l2, e2));
    const f2 = e2.length - r2;
    let w2;
    for (n2 = ((t3, e3) => {
      if (e3 && e3 > t3.length) {
        const n3 = t3;
        (t3 = new o(e3)).set(n3, 0);
      }
      return t3;
    })(n2, s2 + (f2 - f2 % Z)), w2 = 0; f2 - Z >= w2; w2 += Z) {
      const t3 = mt(nt, dt(e2, w2, w2 + Z));
      i2 && c2.update(t3);
      const r3 = a2.update(t3);
      i2 || c2.update(r3), n2.set(yt(nt, r3), w2 + s2);
    }
    return t2.pending = dt(e2, w2), n2;
  }
  async function ut(n2, s2, r2, i2) {
    n2.password = null;
    const a2 = await (async (t2, e2, n3, s3, r3) => {
      if (!it) return K.importKey(e2);
      try {
        return await tt.importKey("raw", e2, n3, false, r3);
      } catch {
        return it = false, K.importKey(e2);
      }
    })(0, r2, N, 0, G), c2 = await (async (t2, e2, n3) => {
      if (!at) return K.M(e2, t2.salt, q.iterations, n3);
      try {
        return await tt.deriveBits(t2, e2, n3);
      } catch {
        return at = false, K.M(e2, t2.salt, q.iterations, n3);
      }
    })(e.assign({ salt: i2 }, q), a2, 8 * (2 * Q[s2] + 2)), l2 = new o(c2), f2 = mt(nt, dt(l2, 0, Q[s2])), w2 = mt(nt, dt(l2, Q[s2], 2 * Q[s2])), u2 = dt(l2, 2 * Q[s2]);
    return e.assign(n2, { keys: { key: f2, Y: w2, passwordVerification: u2 }, J: new rt(new st(f2), t.from(Y)), X: new ot(w2) }), u2;
  }
  function ht(t2, e2) {
    return e2 === b ? ((t3) => {
      if (typeof u == k) {
        const e3 = new o((t3 = unescape(encodeURIComponent(t3))).length);
        for (let n2 = 0; n2 < e3.length; n2++) e3[n2] = t3.charCodeAt(n2);
        return e3;
      }
      return new u().encode(t3);
    })(t2) : e2;
  }
  function pt(t2, e2) {
    let n2 = t2;
    return t2.length + e2.length && (n2 = new o(t2.length + e2.length), n2.set(t2, 0), n2.set(e2, t2.length)), n2;
  }
  function dt(t2, e2, n2) {
    return t2.subarray(e2, n2);
  }
  function yt(t2, e2) {
    return t2.p(e2);
  }
  function mt(t2, e2) {
    return t2.m(e2);
  }
  class gt extends d {
    constructor({ password: t2, rawPassword: e2, passwordVerification: n2, checkPasswordOnly: s2 }) {
      super({ start() {
        bt(this, t2, e2, n2);
      }, transform(t3, e3) {
        const n3 = this;
        if (n3.password || n3.rawPassword) {
          const e4 = kt(n3, t3.subarray(0, 12));
          if (n3.password = n3.rawPassword = null, 0 != (e4.at(-1) ^ n3.passwordVerification)) throw new r(E);
          t3 = t3.subarray(12);
        }
        s2 ? e3.error(new r(O)) : e3.enqueue(kt(n3, t3));
      } });
    }
  }
  class St extends d {
    constructor({ password: t2, rawPassword: e2, passwordVerification: n2 }) {
      super({ start() {
        bt(this, t2, e2, n2);
      }, transform(t3, e3) {
        const n3 = this;
        let s2, r2;
        if (n3.password || n3.rawPassword) {
          n3.password = n3.rawPassword = null;
          const e4 = H(new o(12));
          e4[11] = n3.passwordVerification, s2 = new o(t3.length + e4.length), s2.set(vt(n3, e4), 0), r2 = 12;
        } else s2 = new o(t3.length), r2 = 0;
        s2.set(vt(n3, t3), r2), e3.enqueue(s2);
      } });
    }
  }
  function bt(t2, n2, s2, r2) {
    e.assign(t2, { password: n2, rawPassword: s2, passwordVerification: r2 }), ((t3, n3, s3) => {
      const r3 = [305419896, 591751049, 878082192];
      if (e.assign(t3, { keys: r3, $: new M(r3[0]), tt: new M(r3[2]) }), s3) for (let e2 = 0; e2 < s3.length; e2++) zt(t3, s3[e2]);
      else for (let e2 = 0; e2 < n3.length; e2++) zt(t3, n3.charCodeAt(e2));
    })(t2, n2, s2);
  }
  function kt(t2, e2) {
    const n2 = new o(e2.length);
    for (let s2 = 0; s2 < e2.length; s2++) n2[s2] = Ct(t2) ^ e2[s2], zt(t2, n2[s2]);
    return n2;
  }
  function vt(t2, e2) {
    const n2 = new o(e2.length);
    for (let s2 = 0; s2 < e2.length; s2++) n2[s2] = Ct(t2) ^ e2[s2], zt(t2, e2[s2]);
    return n2;
  }
  function zt(t2, e2) {
    let [, n2] = t2.keys;
    t2.$.append([e2]);
    const r2 = ~t2.$.get();
    n2 = At(s.imul(At(n2 + It(r2)), 134775813) + 1), t2.tt.append([n2 >>> 24]);
    const o2 = ~t2.tt.get();
    t2.keys = [r2, n2, o2];
  }
  function Ct(t2) {
    const e2 = 2 | t2.keys[2];
    return It(s.imul(e2, 1 ^ e2) >>> 8);
  }
  function It(t2) {
    return 255 & t2;
  }
  function At(t2) {
    return 4294967295 & t2;
  }
  class xt extends d {
    constructor(t2, { chunkSize: e2, CompressionStreamZlib: n2, CompressionStream: s2 }) {
      super({});
      const { compressed: r2, encrypted: o2, useCompressionStream: i2, zipCrypto: a2, signed: c2, level: l2, deflate64: w2 } = t2, u2 = this;
      let h2, p2, d2, y2 = super.readable;
      const m2 = c2 && r2 && !w2 && (!o2 || a2) && !(!i2 || !s2);
      o2 && !a2 || !c2 || m2 || (h2 = new _(), y2 = Dt(y2, h2)), r2 && (m2 ? (d2 = new Pt(), y2 = Mt(y2, new s2("gzip")), y2 = Dt(y2, d2)) : y2 = Wt(y2, i2, { level: l2, chunkSize: e2 }, s2, n2, s2)), o2 && (a2 ? y2 = Dt(y2, new St(t2)) : (p2 = new lt(t2), y2 = Dt(y2, p2))), Ut(u2, y2, () => {
        let t3;
        o2 && !a2 && (t3 = p2.signature), o2 && !a2 || !c2 || (t3 = m2 ? d2.signature : new f(h2.value.buffer).getUint32(0)), u2.signature = t3;
      });
    }
  }
  class Pt extends d {
    constructor() {
      let t2, e2 = 10, n2 = new o(0);
      super({ transform(t3, r2) {
        if (e2) {
          const n3 = s.min(e2, t3.length);
          if (e2 -= n3, !(t3 = t3.subarray(n3)).length) return;
        }
        const i2 = n2.length + t3.length;
        if (8 >= i2) {
          const e3 = new o(i2);
          return e3.set(n2), e3.set(t3, n2.length), void (n2 = e3);
        }
        const a2 = i2 - 8, c2 = new o(a2), l2 = s.min(a2, n2.length);
        c2.set(n2.subarray(0, l2), 0), a2 > l2 && c2.set(t3.subarray(0, a2 - l2), l2), r2.enqueue(c2);
        const f2 = new o(8), w2 = n2.length - l2;
        w2 && f2.set(n2.subarray(l2), 0), f2.set(t3.subarray(a2 - l2), w2), n2 = f2;
      }, flush() {
        const e3 = new f(n2.buffer, n2.byteOffset, n2.byteLength);
        t2.signature = e3.getUint32(0, true), t2.uncompressedSize = e3.getUint32(4, true);
      } }), t2 = this;
    }
  }
  class Rt extends d {
    constructor(t2, { chunkSize: e2, DecompressionStreamZlib: n2, DecompressionStream: s2 }) {
      super({});
      const { zipCrypto: o2, encrypted: i2, signed: a2, signature: c2, compressed: l2, useCompressionStream: w2, deflate64: u2 } = t2;
      let h2, p2, d2 = super.readable;
      i2 && (o2 ? d2 = Dt(d2, new gt(t2)) : (p2 = new ct(t2), d2 = Dt(d2, p2))), l2 && (d2 = Wt(d2, w2, { chunkSize: e2, deflate64: u2 }, s2, n2, s2), d2 = ((t3) => {
        const e3 = t3.getReader();
        return new y({ async pull(t4) {
          let n3;
          try {
            n3 = await e3.read();
          } catch (t5) {
            if (t5 && t5.message) throw t5;
            const e4 = new r("Invalid compressed data");
            throw e4.cause = t5, e4;
          }
          const { value: s3, done: o3 } = n3;
          o3 ? t4.close() : t4.enqueue(s3);
        }, cancel: (t4) => e3.cancel(t4) });
      })(d2)), i2 && !o2 || !a2 || (h2 = new _(), d2 = Dt(d2, h2)), Ut(this, d2, () => {
        if ((!i2 || o2) && a2) {
          const t3 = new f(h2.value.buffer);
          if (c2 != t3.getUint32(0, false)) throw new r(L);
        }
      });
    }
  }
  function Ut(t2, n2, s2) {
    n2 = Dt(n2, new d({ flush: s2 })), e.defineProperty(t2, "readable", { get: () => n2 });
  }
  function Wt(t2, e2, n2, s2, r2, o2) {
    const i2 = e2 && s2 ? s2 : r2 || o2, a2 = n2.deflate64 ? "deflate64-raw" : "deflate-raw";
    let c2;
    try {
      c2 = new i2(a2, n2);
    } catch (t3) {
      if (!e2) throw t3;
      if (r2) c2 = new r2(a2, n2);
      else {
        if (!o2) throw t3;
        c2 = new o2(a2, n2);
      }
    }
    return Mt(t2, c2);
  }
  function Dt(t2, e2) {
    return t2.pipeThrough(e2);
  }
  function Mt(t2, e2) {
    const n2 = e2.writable.getWriter(), s2 = t2.getReader();
    return (async () => {
      try {
        for (; ; ) {
          await n2.ready;
          const t3 = await s2.read();
          if (t3.done) {
            await n2.close();
            break;
          }
          await n2.write(t3.value);
        }
      } catch (t3) {
        await (async (t4, e3) => {
          try {
            await t4.abort(e3);
          } catch {
          }
        })(n2, t3), await (async (t4, e3) => {
          try {
            await t4.cancel(e3);
          } catch {
          }
        })(s2, t3);
      }
    })(), e2.readable;
  }
  const _t = "data", Bt = "close";
  class Tt extends d {
    constructor(t2, n2) {
      super({});
      const s2 = this, { codecType: o2 } = t2;
      let i2;
      o2.startsWith("deflate") ? i2 = xt : o2.startsWith("inflate") && (i2 = Rt), s2.outputSize = 0;
      let a2 = 0;
      const c2 = new i2(t2, n2), l2 = super.readable, f2 = new d({ transform(t3, e2) {
        t3 && t3.length && (a2 += t3.length, e2.enqueue(t3));
      }, flush() {
        e.assign(s2, { inputSize: a2 });
      } }), w2 = new d({ transform(e2, n3) {
        if (e2 && e2.length && (n3.enqueue(e2), s2.outputSize += e2.length, t2.outputSize !== b && s2.outputSize > t2.outputSize)) throw new r("Invalid uncompressed size");
      }, flush() {
        const { signature: t3 } = c2;
        e.assign(s2, { signature: t3, inputSize: a2 });
      } });
      e.defineProperty(s2, "readable", { get: () => l2.pipeThrough(f2).pipeThrough(c2).pipeThrough(w2) });
    }
  }
  class Vt extends d {
    constructor(t2) {
      let e2;
      1 > t2 && (t2 = 65536), super({ transform: (n2, s2) => {
        if (e2) {
          const t3 = new o(e2.length + n2.length);
          t3.set(e2), t3.set(n2, e2.length), n2 = t3, e2 = null;
        }
        let r2 = 0;
        for (; n2.length - r2 > t2; ) s2.enqueue(n2.slice(r2, r2 + t2)), r2 += t2;
        e2 = r2 ? n2.slice(r2) : n2;
      }, flush(t3) {
        e2 && e2.length && t3.enqueue(e2);
      } });
    }
  }
  let Kt = 2;
  try {
    typeof navigator != k && navigator.hardwareConcurrency && (Kt = navigator.hardwareConcurrency);
  } catch {
  }
  const jt = { workerURI: "./core/web-worker-wasm.js", wasmURI: "./core/streams/zlib-wasm/zlib-streams.wasm", chunkSize: 65536, maxWorkers: Kt, terminateWorkerTimeout: 5e3, workerStarvationTimeout: 5e3, useWebWorkers: true, useCompressionStream: true, CompressionStream: typeof g != k && g, DecompressionStream: typeof S != k && S };
  e.assign({}, jt);
  const Et = new l(), Lt = new l();
  let Ot, Ht, Zt, Ft, Nt, qt = 0;
  async function Gt(t2) {
    let e2, r2;
    try {
      const { options: o2, config: i2 } = t2;
      if (!o2.useCompressionStream) try {
        await self.initModule(t2.config);
      } catch {
        o2.useCompressionStream = true;
      }
      i2.CompressionStream = self.CompressionStream, i2.DecompressionStream = self.DecompressionStream;
      const a2 = { highWaterMark: 1 }, c2 = t2.readable || new y({ async pull(t3) {
        const e3 = new w((t4) => Et.set(qt, t4));
        Jt({ type: "pull", messageId: qt }), qt = (qt + 1) % n.MAX_SAFE_INTEGER;
        const { value: s2, done: r3 } = await e3;
        t3.enqueue(s2), r3 && t3.close();
      } }, a2);
      r2 = t2.writable || new m({ async write(t3) {
        let e3;
        const s2 = new w((t4) => e3 = t4);
        Lt.set(qt, e3), Jt({ type: _t, value: t3, messageId: qt }), qt = (qt + 1) % n.MAX_SAFE_INTEGER, await s2;
      } }, a2), e2 = new Tt(o2, i2), Ot = new AbortController();
      const { signal: l2 } = Ot;
      await c2.pipeThrough(e2).pipeThrough(new Vt(((t3) => s.max(t3.chunkSize, 64))(i2))).pipeTo(r2, { signal: l2, preventClose: true, preventAbort: true }), await r2.getWriter().close();
      const { signature: f2, inputSize: u2, outputSize: h2 } = e2;
      Jt({ type: Bt, result: { signature: f2, inputSize: u2, outputSize: h2 } });
    } catch (t3) {
      if (t3.outputSize = e2 ? e2.outputSize : 0, r2 && !r2.locked) try {
        await r2.getWriter().close();
      } catch {
      }
      Qt(t3);
    }
  }
  function Jt(t2) {
    let { value: e2 } = t2;
    if (e2) if (e2.length) try {
      e2 = new o(e2), t2.value = e2.buffer, p(t2, [t2.value]);
    } catch {
      p(t2);
    }
    else p(t2);
    else p(t2);
  }
  function Qt(t2 = new r("Unknown error")) {
    const { message: e2, stack: n2, code: s2, name: o2, outputSize: i2 } = t2;
    p({ error: { message: e2, stack: n2, code: s2, name: o2, outputSize: i2 } });
  }
  function Xt(t2, e2, n2 = {}) {
    const i2 = "number" == typeof n2.level ? n2.level : -1, a2 = "number" == typeof n2.outBuffer ? n2.outBuffer : 65536, c2 = "number" == typeof n2.inBufferSize ? n2.inBufferSize : 65536;
    return new d({ start() {
      try {
        let n3;
        if (this.et = Zt(a2), this.in = Zt(c2), this.inBufferSize = c2, !this.et || !this.in) throw new r("allocation failed");
        if (this.nt = new o(a2), t2 ? (this.st = Ht.deflate_process, this.rt = Ht.deflate_last_consumed, this.ot = Ht.deflate_end, this.it = Ht.deflate_new(), n3 = "gzip" === e2 ? Ht.deflate_init_gzip(this.it, i2) : "deflate-raw" === e2 ? Ht.deflate_init_raw(this.it, i2) : Ht.deflate_init(this.it, i2)) : "deflate64-raw" === e2 ? (this.st = Ht.inflate9_process, this.rt = Ht.inflate9_last_consumed, this.ot = Ht.inflate9_end, this.it = Ht.inflate9_new(), n3 = Ht.inflate9_init_raw(this.it)) : (this.st = Ht.inflate_process, this.rt = Ht.inflate_last_consumed, this.ot = Ht.inflate_end, this.it = Ht.inflate_new(), n3 = "deflate-raw" === e2 ? Ht.inflate_init_raw(this.it) : "gzip" === e2 ? Ht.inflate_init_gzip(this.it) : Ht.inflate_init(this.it)), 0 !== n3) throw new r("init failed:" + n3);
      } catch (t3) {
        throw l2(this), t3;
      }
    }, transform(e3, n3) {
      try {
        const i3 = e3, c3 = new o(Nt.buffer), l3 = this.st, f2 = this.rt, w2 = this.et, u2 = this.nt;
        let h2 = 0;
        for (; h2 < i3.length; ) {
          const e4 = s.min(i3.length - h2, 32768);
          if ((!this.in || this.inBufferSize < e4) && (this.in && Ft && (Ft(this.in), this.in = 0), this.in = Zt(e4), this.inBufferSize = e4, !this.in)) throw new r("allocation failed");
          c3.set(i3.subarray(h2, h2 + e4), this.in);
          const o2 = l3(this.it, this.in, e4, w2, a2, 0), p2 = 16777215 & o2;
          if (p2 && (u2.set(c3.subarray(w2, w2 + p2), 0), n3.enqueue(u2.slice(0, p2))), !t2) {
            const t3 = o2 >> 24 & 255, e5 = 128 & t3 ? t3 - 256 : t3;
            if (0 > e5) throw new r("process error:" + e5);
          }
          const d2 = f2(this.it);
          if (0 === d2) break;
          h2 += d2;
        }
      } catch (t3) {
        l2(this), n3.error(t3);
      }
    }, flush(e3) {
      try {
        const n3 = new o(Nt.buffer), s2 = this.st, i3 = this.et, c3 = this.nt;
        for (; ; ) {
          const o2 = s2(this.it, 0, 0, i3, a2, 4), l3 = 16777215 & o2, f2 = o2 >> 24 & 255;
          if (!t2) {
            const t3 = 128 & f2 ? f2 - 256 : f2;
            if (0 > t3) throw new r("process error:" + t3);
          }
          if (l3 && (c3.set(n3.subarray(i3, i3 + l3), 0), e3.enqueue(c3.slice(0, l3))), 1 === f2 || 0 === l3) break;
        }
      } catch (t3) {
        e3.error(t3);
      } finally {
        const t3 = l2(this);
        0 !== t3 && e3.error(new r("end error:" + t3));
      }
    }, cancel() {
      l2(this);
    } });
    function l2(t3) {
      let e3 = 0;
      return t3.it && t3.ot && (e3 = t3.ot(t3.it)), t3.it = 0, t3.in && Ft && Ft(t3.in), t3.in = 0, t3.et && Ft && Ft(t3.et), t3.et = 0, e3;
    }
  }
  addEventListener("message", ({ data: t2 }) => {
    const { type: e2, messageId: n2, value: s2, done: r2 } = t2;
    try {
      if ("start" == e2 && Gt(t2), e2 == _t) {
        const t3 = Et.get(n2);
        Et.delete(n2), t3({ value: new o(s2), done: r2 });
      }
      if ("ack" == e2) {
        const t3 = Lt.get(n2);
        Lt.delete(n2), t3();
      }
      e2 == Bt && Ot.abort();
    } catch (t3) {
      Qt(t3);
    }
  });
  class Yt {
    constructor(t2 = "deflate", e2) {
      return Xt(true, t2, e2);
    }
  }
  class $t {
    constructor(t2 = "deflate", e2) {
      return Xt(false, t2, e2);
    }
  }
  Yt.ct = true, $t.ct = true;
  let te = false;
  self.initModule = async (t2) => {
    try {
      const e2 = await (async (t3, { baseURI: e3 }) => {
        if (!te) {
          let n2, s2;
          try {
            try {
              s2 = new URL(t3, e3);
            } catch {
            }
            const r2 = await fetch(s2);
            n2 = await r2.arrayBuffer();
          } catch (e4) {
            if (!t3.startsWith("data:application/wasm;base64,")) throw e4;
            n2 = ((t4) => {
              const e5 = t4.split(",")[1], n3 = atob(e5), s3 = n3.length, r2 = new o(s3);
              for (let t5 = 0; s3 > t5; ++t5) r2[t5] = n3.charCodeAt(t5);
              return r2.buffer;
            })(t3);
          }
          ((t4) => {
            if (Ht = t4, { malloc: Zt, free: Ft, memory: Nt } = Ht, "function" != typeof Zt || "function" != typeof Ft || !Nt) throw Ht = Zt = Ft = Nt = null, new r("Invalid WASM module");
          })((await WebAssembly.instantiate(n2)).instance.exports), te = true;
        }
      })(t2.wasmURI, t2);
      return t2.CompressionStreamZlib = Yt, t2.DecompressionStreamZlib = $t, e2;
    } catch {
    }
  };
})();
