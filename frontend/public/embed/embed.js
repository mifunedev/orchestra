(function () {
	"use strict";
	function Ma(k) {
		return k &&
			k.__esModule &&
			Object.prototype.hasOwnProperty.call(k, "default")
			? k.default
			: k;
	}
	var Rl = { exports: {} },
		Dn = {},
		Ll = { exports: {} },
		M = {};
	/**
	 * @license React
	 * react.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var Lo;
	function ja() {
		if (Lo) return M;
		Lo = 1;
		var k = Symbol.for("react.element"),
			O = Symbol.for("react.portal"),
			m = Symbol.for("react.fragment"),
			te = Symbol.for("react.strict_mode"),
			ye = Symbol.for("react.profiler"),
			fe = Symbol.for("react.provider"),
			ie = Symbol.for("react.context"),
			J = Symbol.for("react.forward_ref"),
			$ = Symbol.for("react.suspense"),
			ne = Symbol.for("react.memo"),
			ge = Symbol.for("react.lazy"),
			K = Symbol.iterator;
		function Y(c) {
			return c === null || typeof c != "object"
				? null
				: ((c = (K && c[K]) || c["@@iterator"]),
					typeof c == "function" ? c : null);
		}
		var Me = {
				isMounted: function () {
					return !1;
				},
				enqueueForceUpdate: function () {},
				enqueueReplaceState: function () {},
				enqueueSetState: function () {},
			},
			je = Object.assign,
			Q = {};
		function B(c, h, L) {
			((this.props = c),
				(this.context = h),
				(this.refs = Q),
				(this.updater = L || Me));
		}
		((B.prototype.isReactComponent = {}),
			(B.prototype.setState = function (c, h) {
				if (typeof c != "object" && typeof c != "function" && c != null)
					throw Error(
						"setState(...): takes an object of state variables to update or a function which returns an object of state variables.",
					);
				this.updater.enqueueSetState(this, c, h, "setState");
			}),
			(B.prototype.forceUpdate = function (c) {
				this.updater.enqueueForceUpdate(this, c, "forceUpdate");
			}));
		function be() {}
		be.prototype = B.prototype;
		function et(c, h, L) {
			((this.props = c),
				(this.context = h),
				(this.refs = Q),
				(this.updater = L || Me));
		}
		var j = (et.prototype = new be());
		((j.constructor = et), je(j, B.prototype), (j.isPureReactComponent = !0));
		var se = Array.isArray,
			Ve = Object.prototype.hasOwnProperty,
			q = { current: null },
			ae = { key: !0, ref: !0, __self: !0, __source: !0 };
		function de(c, h, L) {
			var I,
				U = {},
				A = null,
				G = null;
			if (h != null)
				for (I in (h.ref !== void 0 && (G = h.ref),
				h.key !== void 0 && (A = "" + h.key),
				h))
					Ve.call(h, I) && !ae.hasOwnProperty(I) && (U[I] = h[I]);
			var H = arguments.length - 2;
			if (H === 1) U.children = L;
			else if (1 < H) {
				for (var re = Array(H), Xe = 0; Xe < H; Xe++)
					re[Xe] = arguments[Xe + 2];
				U.children = re;
			}
			if (c && c.defaultProps)
				for (I in ((H = c.defaultProps), H)) U[I] === void 0 && (U[I] = H[I]);
			return {
				$$typeof: k,
				type: c,
				key: A,
				ref: G,
				props: U,
				_owner: q.current,
			};
		}
		function Te(c, h) {
			return {
				$$typeof: k,
				type: c.type,
				key: h,
				ref: c.ref,
				props: c.props,
				_owner: c._owner,
			};
		}
		function it(c) {
			return typeof c == "object" && c !== null && c.$$typeof === k;
		}
		function st(c) {
			var h = { "=": "=0", ":": "=2" };
			return (
				"$" +
				c.replace(/[=:]/g, function (L) {
					return h[L];
				})
			);
		}
		var Re = /\/+/g;
		function ke(c, h) {
			return typeof c == "object" && c !== null && c.key != null
				? st("" + c.key)
				: h.toString(36);
		}
		function xe(c, h, L, I, U) {
			var A = typeof c;
			(A === "undefined" || A === "boolean") && (c = null);
			var G = !1;
			if (c === null) G = !0;
			else
				switch (A) {
					case "string":
					case "number":
						G = !0;
						break;
					case "object":
						switch (c.$$typeof) {
							case k:
							case O:
								G = !0;
						}
				}
			if (G)
				return (
					(G = c),
					(U = U(G)),
					(c = I === "" ? "." + ke(G, 0) : I),
					se(U)
						? ((L = ""),
							c != null && (L = c.replace(Re, "$&/") + "/"),
							xe(U, h, L, "", function (Xe) {
								return Xe;
							}))
						: U != null &&
							(it(U) &&
								(U = Te(
									U,
									L +
										(!U.key || (G && G.key === U.key)
											? ""
											: ("" + U.key).replace(Re, "$&/") + "/") +
										c,
								)),
							h.push(U)),
					1
				);
			if (((G = 0), (I = I === "" ? "." : I + ":"), se(c)))
				for (var H = 0; H < c.length; H++) {
					A = c[H];
					var re = I + ke(A, H);
					G += xe(A, h, L, re, U);
				}
			else if (((re = Y(c)), typeof re == "function"))
				for (c = re.call(c), H = 0; !(A = c.next()).done; )
					((A = A.value), (re = I + ke(A, H++)), (G += xe(A, h, L, re, U)));
			else if (A === "object")
				throw (
					(h = String(c)),
					Error(
						"Objects are not valid as a React child (found: " +
							(h === "[object Object]"
								? "object with keys {" + Object.keys(c).join(", ") + "}"
								: h) +
							"). If you meant to render a collection of children, use an array instead.",
					)
				);
			return G;
		}
		function Ye(c, h, L) {
			if (c == null) return c;
			var I = [],
				U = 0;
			return (
				xe(c, I, "", "", function (A) {
					return h.call(L, A, U++);
				}),
				I
			);
		}
		function Pe(c) {
			if (c._status === -1) {
				var h = c._result;
				((h = h()),
					h.then(
						function (L) {
							(c._status === 0 || c._status === -1) &&
								((c._status = 1), (c._result = L));
						},
						function (L) {
							(c._status === 0 || c._status === -1) &&
								((c._status = 2), (c._result = L));
						},
					),
					c._status === -1 && ((c._status = 0), (c._result = h)));
			}
			if (c._status === 1) return c._result.default;
			throw c._result;
		}
		var X = { current: null },
			S = { transition: null },
			N = {
				ReactCurrentDispatcher: X,
				ReactCurrentBatchConfig: S,
				ReactCurrentOwner: q,
			};
		function x() {
			throw Error("act(...) is not supported in production builds of React.");
		}
		return (
			(M.Children = {
				map: Ye,
				forEach: function (c, h, L) {
					Ye(
						c,
						function () {
							h.apply(this, arguments);
						},
						L,
					);
				},
				count: function (c) {
					var h = 0;
					return (
						Ye(c, function () {
							h++;
						}),
						h
					);
				},
				toArray: function (c) {
					return (
						Ye(c, function (h) {
							return h;
						}) || []
					);
				},
				only: function (c) {
					if (!it(c))
						throw Error(
							"React.Children.only expected to receive a single React element child.",
						);
					return c;
				},
			}),
			(M.Component = B),
			(M.Fragment = m),
			(M.Profiler = ye),
			(M.PureComponent = et),
			(M.StrictMode = te),
			(M.Suspense = $),
			(M.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = N),
			(M.act = x),
			(M.cloneElement = function (c, h, L) {
				if (c == null)
					throw Error(
						"React.cloneElement(...): The argument must be a React element, but you passed " +
							c +
							".",
					);
				var I = je({}, c.props),
					U = c.key,
					A = c.ref,
					G = c._owner;
				if (h != null) {
					if (
						(h.ref !== void 0 && ((A = h.ref), (G = q.current)),
						h.key !== void 0 && (U = "" + h.key),
						c.type && c.type.defaultProps)
					)
						var H = c.type.defaultProps;
					for (re in h)
						Ve.call(h, re) &&
							!ae.hasOwnProperty(re) &&
							(I[re] = h[re] === void 0 && H !== void 0 ? H[re] : h[re]);
				}
				var re = arguments.length - 2;
				if (re === 1) I.children = L;
				else if (1 < re) {
					H = Array(re);
					for (var Xe = 0; Xe < re; Xe++) H[Xe] = arguments[Xe + 2];
					I.children = H;
				}
				return {
					$$typeof: k,
					type: c.type,
					key: U,
					ref: A,
					props: I,
					_owner: G,
				};
			}),
			(M.createContext = function (c) {
				return (
					(c = {
						$$typeof: ie,
						_currentValue: c,
						_currentValue2: c,
						_threadCount: 0,
						Provider: null,
						Consumer: null,
						_defaultValue: null,
						_globalName: null,
					}),
					(c.Provider = { $$typeof: fe, _context: c }),
					(c.Consumer = c)
				);
			}),
			(M.createElement = de),
			(M.createFactory = function (c) {
				var h = de.bind(null, c);
				return ((h.type = c), h);
			}),
			(M.createRef = function () {
				return { current: null };
			}),
			(M.forwardRef = function (c) {
				return { $$typeof: J, render: c };
			}),
			(M.isValidElement = it),
			(M.lazy = function (c) {
				return {
					$$typeof: ge,
					_payload: { _status: -1, _result: c },
					_init: Pe,
				};
			}),
			(M.memo = function (c, h) {
				return { $$typeof: ne, type: c, compare: h === void 0 ? null : h };
			}),
			(M.startTransition = function (c) {
				var h = S.transition;
				S.transition = {};
				try {
					c();
				} finally {
					S.transition = h;
				}
			}),
			(M.unstable_act = x),
			(M.useCallback = function (c, h) {
				return X.current.useCallback(c, h);
			}),
			(M.useContext = function (c) {
				return X.current.useContext(c);
			}),
			(M.useDebugValue = function () {}),
			(M.useDeferredValue = function (c) {
				return X.current.useDeferredValue(c);
			}),
			(M.useEffect = function (c, h) {
				return X.current.useEffect(c, h);
			}),
			(M.useId = function () {
				return X.current.useId();
			}),
			(M.useImperativeHandle = function (c, h, L) {
				return X.current.useImperativeHandle(c, h, L);
			}),
			(M.useInsertionEffect = function (c, h) {
				return X.current.useInsertionEffect(c, h);
			}),
			(M.useLayoutEffect = function (c, h) {
				return X.current.useLayoutEffect(c, h);
			}),
			(M.useMemo = function (c, h) {
				return X.current.useMemo(c, h);
			}),
			(M.useReducer = function (c, h, L) {
				return X.current.useReducer(c, h, L);
			}),
			(M.useRef = function (c) {
				return X.current.useRef(c);
			}),
			(M.useState = function (c) {
				return X.current.useState(c);
			}),
			(M.useSyncExternalStore = function (c, h, L) {
				return X.current.useSyncExternalStore(c, h, L);
			}),
			(M.useTransition = function () {
				return X.current.useTransition();
			}),
			(M.version = "18.3.1"),
			M
		);
	}
	var Oo;
	function Ol() {
		return (Oo || ((Oo = 1), (Ll.exports = ja())), Ll.exports);
	}
	/**
	 * @license React
	 * react-jsx-runtime.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var Do;
	function Fa() {
		if (Do) return Dn;
		Do = 1;
		var k = Ol(),
			O = Symbol.for("react.element"),
			m = Symbol.for("react.fragment"),
			te = Object.prototype.hasOwnProperty,
			ye =
				k.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,
			fe = { key: !0, ref: !0, __self: !0, __source: !0 };
		function ie(J, $, ne) {
			var ge,
				K = {},
				Y = null,
				Me = null;
			(ne !== void 0 && (Y = "" + ne),
				$.key !== void 0 && (Y = "" + $.key),
				$.ref !== void 0 && (Me = $.ref));
			for (ge in $) te.call($, ge) && !fe.hasOwnProperty(ge) && (K[ge] = $[ge]);
			if (J && J.defaultProps)
				for (ge in (($ = J.defaultProps), $))
					K[ge] === void 0 && (K[ge] = $[ge]);
			return {
				$$typeof: O,
				type: J,
				key: Y,
				ref: Me,
				props: K,
				_owner: ye.current,
			};
		}
		return ((Dn.Fragment = m), (Dn.jsx = ie), (Dn.jsxs = ie), Dn);
	}
	var Io;
	function Ua() {
		return (Io || ((Io = 1), (Rl.exports = Fa())), Rl.exports);
	}
	var ve = Ua(),
		Ke = Ol();
	const Aa = Ma(Ke);
	var wr = {},
		Dl = { exports: {} },
		Ae = {},
		Il = { exports: {} },
		Ml = {};
	/**
	 * @license React
	 * scheduler.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var Mo;
	function Va() {
		return (
			Mo ||
				((Mo = 1),
				(function (k) {
					function O(S, N) {
						var x = S.length;
						S.push(N);
						e: for (; 0 < x; ) {
							var c = (x - 1) >>> 1,
								h = S[c];
							if (0 < ye(h, N)) ((S[c] = N), (S[x] = h), (x = c));
							else break e;
						}
					}
					function m(S) {
						return S.length === 0 ? null : S[0];
					}
					function te(S) {
						if (S.length === 0) return null;
						var N = S[0],
							x = S.pop();
						if (x !== N) {
							S[0] = x;
							e: for (var c = 0, h = S.length, L = h >>> 1; c < L; ) {
								var I = 2 * (c + 1) - 1,
									U = S[I],
									A = I + 1,
									G = S[A];
								if (0 > ye(U, x))
									A < h && 0 > ye(G, U)
										? ((S[c] = G), (S[A] = x), (c = A))
										: ((S[c] = U), (S[I] = x), (c = I));
								else if (A < h && 0 > ye(G, x))
									((S[c] = G), (S[A] = x), (c = A));
								else break e;
							}
						}
						return N;
					}
					function ye(S, N) {
						var x = S.sortIndex - N.sortIndex;
						return x !== 0 ? x : S.id - N.id;
					}
					if (
						typeof performance == "object" &&
						typeof performance.now == "function"
					) {
						var fe = performance;
						k.unstable_now = function () {
							return fe.now();
						};
					} else {
						var ie = Date,
							J = ie.now();
						k.unstable_now = function () {
							return ie.now() - J;
						};
					}
					var $ = [],
						ne = [],
						ge = 1,
						K = null,
						Y = 3,
						Me = !1,
						je = !1,
						Q = !1,
						B = typeof setTimeout == "function" ? setTimeout : null,
						be = typeof clearTimeout == "function" ? clearTimeout : null,
						et = typeof setImmediate < "u" ? setImmediate : null;
					typeof navigator < "u" &&
						navigator.scheduling !== void 0 &&
						navigator.scheduling.isInputPending !== void 0 &&
						navigator.scheduling.isInputPending.bind(navigator.scheduling);
					function j(S) {
						for (var N = m(ne); N !== null; ) {
							if (N.callback === null) te(ne);
							else if (N.startTime <= S)
								(te(ne), (N.sortIndex = N.expirationTime), O($, N));
							else break;
							N = m(ne);
						}
					}
					function se(S) {
						if (((Q = !1), j(S), !je))
							if (m($) !== null) ((je = !0), Pe(Ve));
							else {
								var N = m(ne);
								N !== null && X(se, N.startTime - S);
							}
					}
					function Ve(S, N) {
						((je = !1), Q && ((Q = !1), be(de), (de = -1)), (Me = !0));
						var x = Y;
						try {
							for (
								j(N), K = m($);
								K !== null && (!(K.expirationTime > N) || (S && !st()));

							) {
								var c = K.callback;
								if (typeof c == "function") {
									((K.callback = null), (Y = K.priorityLevel));
									var h = c(K.expirationTime <= N);
									((N = k.unstable_now()),
										typeof h == "function"
											? (K.callback = h)
											: K === m($) && te($),
										j(N));
								} else te($);
								K = m($);
							}
							if (K !== null) var L = !0;
							else {
								var I = m(ne);
								(I !== null && X(se, I.startTime - N), (L = !1));
							}
							return L;
						} finally {
							((K = null), (Y = x), (Me = !1));
						}
					}
					var q = !1,
						ae = null,
						de = -1,
						Te = 5,
						it = -1;
					function st() {
						return !(k.unstable_now() - it < Te);
					}
					function Re() {
						if (ae !== null) {
							var S = k.unstable_now();
							it = S;
							var N = !0;
							try {
								N = ae(!0, S);
							} finally {
								N ? ke() : ((q = !1), (ae = null));
							}
						} else q = !1;
					}
					var ke;
					if (typeof et == "function")
						ke = function () {
							et(Re);
						};
					else if (typeof MessageChannel < "u") {
						var xe = new MessageChannel(),
							Ye = xe.port2;
						((xe.port1.onmessage = Re),
							(ke = function () {
								Ye.postMessage(null);
							}));
					} else
						ke = function () {
							B(Re, 0);
						};
					function Pe(S) {
						((ae = S), q || ((q = !0), ke()));
					}
					function X(S, N) {
						de = B(function () {
							S(k.unstable_now());
						}, N);
					}
					((k.unstable_IdlePriority = 5),
						(k.unstable_ImmediatePriority = 1),
						(k.unstable_LowPriority = 4),
						(k.unstable_NormalPriority = 3),
						(k.unstable_Profiling = null),
						(k.unstable_UserBlockingPriority = 2),
						(k.unstable_cancelCallback = function (S) {
							S.callback = null;
						}),
						(k.unstable_continueExecution = function () {
							je || Me || ((je = !0), Pe(Ve));
						}),
						(k.unstable_forceFrameRate = function (S) {
							0 > S || 125 < S
								? console.error(
										"forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported",
									)
								: (Te = 0 < S ? Math.floor(1e3 / S) : 5);
						}),
						(k.unstable_getCurrentPriorityLevel = function () {
							return Y;
						}),
						(k.unstable_getFirstCallbackNode = function () {
							return m($);
						}),
						(k.unstable_next = function (S) {
							switch (Y) {
								case 1:
								case 2:
								case 3:
									var N = 3;
									break;
								default:
									N = Y;
							}
							var x = Y;
							Y = N;
							try {
								return S();
							} finally {
								Y = x;
							}
						}),
						(k.unstable_pauseExecution = function () {}),
						(k.unstable_requestPaint = function () {}),
						(k.unstable_runWithPriority = function (S, N) {
							switch (S) {
								case 1:
								case 2:
								case 3:
								case 4:
								case 5:
									break;
								default:
									S = 3;
							}
							var x = Y;
							Y = S;
							try {
								return N();
							} finally {
								Y = x;
							}
						}),
						(k.unstable_scheduleCallback = function (S, N, x) {
							var c = k.unstable_now();
							switch (
								(typeof x == "object" && x !== null
									? ((x = x.delay),
										(x = typeof x == "number" && 0 < x ? c + x : c))
									: (x = c),
								S)
							) {
								case 1:
									var h = -1;
									break;
								case 2:
									h = 250;
									break;
								case 5:
									h = 1073741823;
									break;
								case 4:
									h = 1e4;
									break;
								default:
									h = 5e3;
							}
							return (
								(h = x + h),
								(S = {
									id: ge++,
									callback: N,
									priorityLevel: S,
									startTime: x,
									expirationTime: h,
									sortIndex: -1,
								}),
								x > c
									? ((S.sortIndex = x),
										O(ne, S),
										m($) === null &&
											S === m(ne) &&
											(Q ? (be(de), (de = -1)) : (Q = !0), X(se, x - c)))
									: ((S.sortIndex = h),
										O($, S),
										je || Me || ((je = !0), Pe(Ve))),
								S
							);
						}),
						(k.unstable_shouldYield = st),
						(k.unstable_wrapCallback = function (S) {
							var N = Y;
							return function () {
								var x = Y;
								Y = N;
								try {
									return S.apply(this, arguments);
								} finally {
									Y = x;
								}
							};
						}));
				})(Ml)),
			Ml
		);
	}
	var jo;
	function Ba() {
		return (jo || ((jo = 1), (Il.exports = Va())), Il.exports);
	}
	/**
	 * @license React
	 * react-dom.production.min.js
	 *
	 * Copyright (c) Facebook, Inc. and its affiliates.
	 *
	 * This source code is licensed under the MIT license found in the
	 * LICENSE file in the root directory of this source tree.
	 */ var Fo;
	function $a() {
		if (Fo) return Ae;
		Fo = 1;
		var k = Ol(),
			O = Ba();
		function m(e) {
			for (
				var t = "https://reactjs.org/docs/error-decoder.html?invariant=" + e,
					n = 1;
				n < arguments.length;
				n++
			)
				t += "&args[]=" + encodeURIComponent(arguments[n]);
			return (
				"Minified React error #" +
				e +
				"; visit " +
				t +
				" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."
			);
		}
		var te = new Set(),
			ye = {};
		function fe(e, t) {
			(ie(e, t), ie(e + "Capture", t));
		}
		function ie(e, t) {
			for (ye[e] = t, e = 0; e < t.length; e++) te.add(t[e]);
		}
		var J = !(
				typeof window > "u" ||
				typeof window.document > "u" ||
				typeof window.document.createElement > "u"
			),
			$ = Object.prototype.hasOwnProperty,
			ne =
				/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,
			ge = {},
			K = {};
		function Y(e) {
			return $.call(K, e)
				? !0
				: $.call(ge, e)
					? !1
					: ne.test(e)
						? (K[e] = !0)
						: ((ge[e] = !0), !1);
		}
		function Me(e, t, n, r) {
			if (n !== null && n.type === 0) return !1;
			switch (typeof t) {
				case "function":
				case "symbol":
					return !0;
				case "boolean":
					return r
						? !1
						: n !== null
							? !n.acceptsBooleans
							: ((e = e.toLowerCase().slice(0, 5)),
								e !== "data-" && e !== "aria-");
				default:
					return !1;
			}
		}
		function je(e, t, n, r) {
			if (t === null || typeof t > "u" || Me(e, t, n, r)) return !0;
			if (r) return !1;
			if (n !== null)
				switch (n.type) {
					case 3:
						return !t;
					case 4:
						return t === !1;
					case 5:
						return isNaN(t);
					case 6:
						return isNaN(t) || 1 > t;
				}
			return !1;
		}
		function Q(e, t, n, r, l, u, o) {
			((this.acceptsBooleans = t === 2 || t === 3 || t === 4),
				(this.attributeName = r),
				(this.attributeNamespace = l),
				(this.mustUseProperty = n),
				(this.propertyName = e),
				(this.type = t),
				(this.sanitizeURL = u),
				(this.removeEmptyString = o));
		}
		var B = {};
		("children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style"
			.split(" ")
			.forEach(function (e) {
				B[e] = new Q(e, 0, !1, e, null, !1, !1);
			}),
			[
				["acceptCharset", "accept-charset"],
				["className", "class"],
				["htmlFor", "for"],
				["httpEquiv", "http-equiv"],
			].forEach(function (e) {
				var t = e[0];
				B[t] = new Q(t, 1, !1, e[1], null, !1, !1);
			}),
			["contentEditable", "draggable", "spellCheck", "value"].forEach(
				function (e) {
					B[e] = new Q(e, 2, !1, e.toLowerCase(), null, !1, !1);
				},
			),
			[
				"autoReverse",
				"externalResourcesRequired",
				"focusable",
				"preserveAlpha",
			].forEach(function (e) {
				B[e] = new Q(e, 2, !1, e, null, !1, !1);
			}),
			"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope"
				.split(" ")
				.forEach(function (e) {
					B[e] = new Q(e, 3, !1, e.toLowerCase(), null, !1, !1);
				}),
			["checked", "multiple", "muted", "selected"].forEach(function (e) {
				B[e] = new Q(e, 3, !0, e, null, !1, !1);
			}),
			["capture", "download"].forEach(function (e) {
				B[e] = new Q(e, 4, !1, e, null, !1, !1);
			}),
			["cols", "rows", "size", "span"].forEach(function (e) {
				B[e] = new Q(e, 6, !1, e, null, !1, !1);
			}),
			["rowSpan", "start"].forEach(function (e) {
				B[e] = new Q(e, 5, !1, e.toLowerCase(), null, !1, !1);
			}));
		var be = /[\-:]([a-z])/g;
		function et(e) {
			return e[1].toUpperCase();
		}
		("accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height"
			.split(" ")
			.forEach(function (e) {
				var t = e.replace(be, et);
				B[t] = new Q(t, 1, !1, e, null, !1, !1);
			}),
			"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type"
				.split(" ")
				.forEach(function (e) {
					var t = e.replace(be, et);
					B[t] = new Q(t, 1, !1, e, "http://www.w3.org/1999/xlink", !1, !1);
				}),
			["xml:base", "xml:lang", "xml:space"].forEach(function (e) {
				var t = e.replace(be, et);
				B[t] = new Q(
					t,
					1,
					!1,
					e,
					"http://www.w3.org/XML/1998/namespace",
					!1,
					!1,
				);
			}),
			["tabIndex", "crossOrigin"].forEach(function (e) {
				B[e] = new Q(e, 1, !1, e.toLowerCase(), null, !1, !1);
			}),
			(B.xlinkHref = new Q(
				"xlinkHref",
				1,
				!1,
				"xlink:href",
				"http://www.w3.org/1999/xlink",
				!0,
				!1,
			)),
			["src", "href", "action", "formAction"].forEach(function (e) {
				B[e] = new Q(e, 1, !1, e.toLowerCase(), null, !0, !0);
			}));
		function j(e, t, n, r) {
			var l = B.hasOwnProperty(t) ? B[t] : null;
			(l !== null
				? l.type !== 0
				: r ||
					!(2 < t.length) ||
					(t[0] !== "o" && t[0] !== "O") ||
					(t[1] !== "n" && t[1] !== "N")) &&
				(je(t, n, l, r) && (n = null),
				r || l === null
					? Y(t) &&
						(n === null ? e.removeAttribute(t) : e.setAttribute(t, "" + n))
					: l.mustUseProperty
						? (e[l.propertyName] = n === null ? (l.type === 3 ? !1 : "") : n)
						: ((t = l.attributeName),
							(r = l.attributeNamespace),
							n === null
								? e.removeAttribute(t)
								: ((l = l.type),
									(n = l === 3 || (l === 4 && n === !0) ? "" : "" + n),
									r ? e.setAttributeNS(r, t, n) : e.setAttribute(t, n))));
		}
		var se = k.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,
			Ve = Symbol.for("react.element"),
			q = Symbol.for("react.portal"),
			ae = Symbol.for("react.fragment"),
			de = Symbol.for("react.strict_mode"),
			Te = Symbol.for("react.profiler"),
			it = Symbol.for("react.provider"),
			st = Symbol.for("react.context"),
			Re = Symbol.for("react.forward_ref"),
			ke = Symbol.for("react.suspense"),
			xe = Symbol.for("react.suspense_list"),
			Ye = Symbol.for("react.memo"),
			Pe = Symbol.for("react.lazy"),
			X = Symbol.for("react.offscreen"),
			S = Symbol.iterator;
		function N(e) {
			return e === null || typeof e != "object"
				? null
				: ((e = (S && e[S]) || e["@@iterator"]),
					typeof e == "function" ? e : null);
		}
		var x = Object.assign,
			c;
		function h(e) {
			if (c === void 0)
				try {
					throw Error();
				} catch (n) {
					var t = n.stack.trim().match(/\n( *(at )?)/);
					c = (t && t[1]) || "";
				}
			return (
				`
` +
				c +
				e
			);
		}
		var L = !1;
		function I(e, t) {
			if (!e || L) return "";
			L = !0;
			var n = Error.prepareStackTrace;
			Error.prepareStackTrace = void 0;
			try {
				if (t)
					if (
						((t = function () {
							throw Error();
						}),
						Object.defineProperty(t.prototype, "props", {
							set: function () {
								throw Error();
							},
						}),
						typeof Reflect == "object" && Reflect.construct)
					) {
						try {
							Reflect.construct(t, []);
						} catch (p) {
							var r = p;
						}
						Reflect.construct(e, [], t);
					} else {
						try {
							t.call();
						} catch (p) {
							r = p;
						}
						e.call(t.prototype);
					}
				else {
					try {
						throw Error();
					} catch (p) {
						r = p;
					}
					e();
				}
			} catch (p) {
				if (p && r && typeof p.stack == "string") {
					for (
						var l = p.stack.split(`
`),
							u = r.stack.split(`
`),
							o = l.length - 1,
							i = u.length - 1;
						1 <= o && 0 <= i && l[o] !== u[i];

					)
						i--;
					for (; 1 <= o && 0 <= i; o--, i--)
						if (l[o] !== u[i]) {
							if (o !== 1 || i !== 1)
								do
									if ((o--, i--, 0 > i || l[o] !== u[i])) {
										var s =
											`
` + l[o].replace(" at new ", " at ");
										return (
											e.displayName &&
												s.includes("<anonymous>") &&
												(s = s.replace("<anonymous>", e.displayName)),
											s
										);
									}
								while (1 <= o && 0 <= i);
							break;
						}
				}
			} finally {
				((L = !1), (Error.prepareStackTrace = n));
			}
			return (e = e ? e.displayName || e.name : "") ? h(e) : "";
		}
		function U(e) {
			switch (e.tag) {
				case 5:
					return h(e.type);
				case 16:
					return h("Lazy");
				case 13:
					return h("Suspense");
				case 19:
					return h("SuspenseList");
				case 0:
				case 2:
				case 15:
					return ((e = I(e.type, !1)), e);
				case 11:
					return ((e = I(e.type.render, !1)), e);
				case 1:
					return ((e = I(e.type, !0)), e);
				default:
					return "";
			}
		}
		function A(e) {
			if (e == null) return null;
			if (typeof e == "function") return e.displayName || e.name || null;
			if (typeof e == "string") return e;
			switch (e) {
				case ae:
					return "Fragment";
				case q:
					return "Portal";
				case Te:
					return "Profiler";
				case de:
					return "StrictMode";
				case ke:
					return "Suspense";
				case xe:
					return "SuspenseList";
			}
			if (typeof e == "object")
				switch (e.$$typeof) {
					case st:
						return (e.displayName || "Context") + ".Consumer";
					case it:
						return (e._context.displayName || "Context") + ".Provider";
					case Re:
						var t = e.render;
						return (
							(e = e.displayName),
							e ||
								((e = t.displayName || t.name || ""),
								(e = e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")),
							e
						);
					case Ye:
						return (
							(t = e.displayName || null),
							t !== null ? t : A(e.type) || "Memo"
						);
					case Pe:
						((t = e._payload), (e = e._init));
						try {
							return A(e(t));
						} catch {}
				}
			return null;
		}
		function G(e) {
			var t = e.type;
			switch (e.tag) {
				case 24:
					return "Cache";
				case 9:
					return (t.displayName || "Context") + ".Consumer";
				case 10:
					return (t._context.displayName || "Context") + ".Provider";
				case 18:
					return "DehydratedFragment";
				case 11:
					return (
						(e = t.render),
						(e = e.displayName || e.name || ""),
						t.displayName || (e !== "" ? "ForwardRef(" + e + ")" : "ForwardRef")
					);
				case 7:
					return "Fragment";
				case 5:
					return t;
				case 4:
					return "Portal";
				case 3:
					return "Root";
				case 6:
					return "Text";
				case 16:
					return A(t);
				case 8:
					return t === de ? "StrictMode" : "Mode";
				case 22:
					return "Offscreen";
				case 12:
					return "Profiler";
				case 21:
					return "Scope";
				case 13:
					return "Suspense";
				case 19:
					return "SuspenseList";
				case 25:
					return "TracingMarker";
				case 1:
				case 0:
				case 17:
				case 2:
				case 14:
				case 15:
					if (typeof t == "function") return t.displayName || t.name || null;
					if (typeof t == "string") return t;
			}
			return null;
		}
		function H(e) {
			switch (typeof e) {
				case "boolean":
				case "number":
				case "string":
				case "undefined":
					return e;
				case "object":
					return e;
				default:
					return "";
			}
		}
		function re(e) {
			var t = e.type;
			return (
				(e = e.nodeName) &&
				e.toLowerCase() === "input" &&
				(t === "checkbox" || t === "radio")
			);
		}
		function Xe(e) {
			var t = re(e) ? "checked" : "value",
				n = Object.getOwnPropertyDescriptor(e.constructor.prototype, t),
				r = "" + e[t];
			if (
				!e.hasOwnProperty(t) &&
				typeof n < "u" &&
				typeof n.get == "function" &&
				typeof n.set == "function"
			) {
				var l = n.get,
					u = n.set;
				return (
					Object.defineProperty(e, t, {
						configurable: !0,
						get: function () {
							return l.call(this);
						},
						set: function (o) {
							((r = "" + o), u.call(this, o));
						},
					}),
					Object.defineProperty(e, t, { enumerable: n.enumerable }),
					{
						getValue: function () {
							return r;
						},
						setValue: function (o) {
							r = "" + o;
						},
						stopTracking: function () {
							((e._valueTracker = null), delete e[t]);
						},
					}
				);
			}
		}
		function Sr(e) {
			e._valueTracker || (e._valueTracker = Xe(e));
		}
		function Bo(e) {
			if (!e) return !1;
			var t = e._valueTracker;
			if (!t) return !0;
			var n = t.getValue(),
				r = "";
			return (
				e && (r = re(e) ? (e.checked ? "true" : "false") : e.value),
				(e = r),
				e !== n ? (t.setValue(e), !0) : !1
			);
		}
		function kr(e) {
			if (
				((e = e || (typeof document < "u" ? document : void 0)), typeof e > "u")
			)
				return null;
			try {
				return e.activeElement || e.body;
			} catch {
				return e.body;
			}
		}
		function Fl(e, t) {
			var n = t.checked;
			return x({}, t, {
				defaultChecked: void 0,
				defaultValue: void 0,
				value: void 0,
				checked: n ?? e._wrapperState.initialChecked,
			});
		}
		function $o(e, t) {
			var n = t.defaultValue == null ? "" : t.defaultValue,
				r = t.checked != null ? t.checked : t.defaultChecked;
			((n = H(t.value != null ? t.value : n)),
				(e._wrapperState = {
					initialChecked: r,
					initialValue: n,
					controlled:
						t.type === "checkbox" || t.type === "radio"
							? t.checked != null
							: t.value != null,
				}));
		}
		function Ho(e, t) {
			((t = t.checked), t != null && j(e, "checked", t, !1));
		}
		function Ul(e, t) {
			Ho(e, t);
			var n = H(t.value),
				r = t.type;
			if (n != null)
				r === "number"
					? ((n === 0 && e.value === "") || e.value != n) && (e.value = "" + n)
					: e.value !== "" + n && (e.value = "" + n);
			else if (r === "submit" || r === "reset") {
				e.removeAttribute("value");
				return;
			}
			(t.hasOwnProperty("value")
				? Al(e, t.type, n)
				: t.hasOwnProperty("defaultValue") && Al(e, t.type, H(t.defaultValue)),
				t.checked == null &&
					t.defaultChecked != null &&
					(e.defaultChecked = !!t.defaultChecked));
		}
		function Wo(e, t, n) {
			if (t.hasOwnProperty("value") || t.hasOwnProperty("defaultValue")) {
				var r = t.type;
				if (
					!(
						(r !== "submit" && r !== "reset") ||
						(t.value !== void 0 && t.value !== null)
					)
				)
					return;
				((t = "" + e._wrapperState.initialValue),
					n || t === e.value || (e.value = t),
					(e.defaultValue = t));
			}
			((n = e.name),
				n !== "" && (e.name = ""),
				(e.defaultChecked = !!e._wrapperState.initialChecked),
				n !== "" && (e.name = n));
		}
		function Al(e, t, n) {
			(t !== "number" || kr(e.ownerDocument) !== e) &&
				(n == null
					? (e.defaultValue = "" + e._wrapperState.initialValue)
					: e.defaultValue !== "" + n && (e.defaultValue = "" + n));
		}
		var In = Array.isArray;
		function sn(e, t, n, r) {
			if (((e = e.options), t)) {
				t = {};
				for (var l = 0; l < n.length; l++) t["$" + n[l]] = !0;
				for (n = 0; n < e.length; n++)
					((l = t.hasOwnProperty("$" + e[n].value)),
						e[n].selected !== l && (e[n].selected = l),
						l && r && (e[n].defaultSelected = !0));
			} else {
				for (n = "" + H(n), t = null, l = 0; l < e.length; l++) {
					if (e[l].value === n) {
						((e[l].selected = !0), r && (e[l].defaultSelected = !0));
						return;
					}
					t !== null || e[l].disabled || (t = e[l]);
				}
				t !== null && (t.selected = !0);
			}
		}
		function Vl(e, t) {
			if (t.dangerouslySetInnerHTML != null) throw Error(m(91));
			return x({}, t, {
				value: void 0,
				defaultValue: void 0,
				children: "" + e._wrapperState.initialValue,
			});
		}
		function Qo(e, t) {
			var n = t.value;
			if (n == null) {
				if (((n = t.children), (t = t.defaultValue), n != null)) {
					if (t != null) throw Error(m(92));
					if (In(n)) {
						if (1 < n.length) throw Error(m(93));
						n = n[0];
					}
					t = n;
				}
				(t == null && (t = ""), (n = t));
			}
			e._wrapperState = { initialValue: H(n) };
		}
		function Ko(e, t) {
			var n = H(t.value),
				r = H(t.defaultValue);
			(n != null &&
				((n = "" + n),
				n !== e.value && (e.value = n),
				t.defaultValue == null && e.defaultValue !== n && (e.defaultValue = n)),
				r != null && (e.defaultValue = "" + r));
		}
		function Yo(e) {
			var t = e.textContent;
			t === e._wrapperState.initialValue &&
				t !== "" &&
				t !== null &&
				(e.value = t);
		}
		function Xo(e) {
			switch (e) {
				case "svg":
					return "http://www.w3.org/2000/svg";
				case "math":
					return "http://www.w3.org/1998/Math/MathML";
				default:
					return "http://www.w3.org/1999/xhtml";
			}
		}
		function Bl(e, t) {
			return e == null || e === "http://www.w3.org/1999/xhtml"
				? Xo(t)
				: e === "http://www.w3.org/2000/svg" && t === "foreignObject"
					? "http://www.w3.org/1999/xhtml"
					: e;
		}
		var xr,
			Go = (function (e) {
				return typeof MSApp < "u" && MSApp.execUnsafeLocalFunction
					? function (t, n, r, l) {
							MSApp.execUnsafeLocalFunction(function () {
								return e(t, n, r, l);
							});
						}
					: e;
			})(function (e, t) {
				if (e.namespaceURI !== "http://www.w3.org/2000/svg" || "innerHTML" in e)
					e.innerHTML = t;
				else {
					for (
						xr = xr || document.createElement("div"),
							xr.innerHTML = "<svg>" + t.valueOf().toString() + "</svg>",
							t = xr.firstChild;
						e.firstChild;

					)
						e.removeChild(e.firstChild);
					for (; t.firstChild; ) e.appendChild(t.firstChild);
				}
			});
		function Mn(e, t) {
			if (t) {
				var n = e.firstChild;
				if (n && n === e.lastChild && n.nodeType === 3) {
					n.nodeValue = t;
					return;
				}
			}
			e.textContent = t;
		}
		var jn = {
				animationIterationCount: !0,
				aspectRatio: !0,
				borderImageOutset: !0,
				borderImageSlice: !0,
				borderImageWidth: !0,
				boxFlex: !0,
				boxFlexGroup: !0,
				boxOrdinalGroup: !0,
				columnCount: !0,
				columns: !0,
				flex: !0,
				flexGrow: !0,
				flexPositive: !0,
				flexShrink: !0,
				flexNegative: !0,
				flexOrder: !0,
				gridArea: !0,
				gridRow: !0,
				gridRowEnd: !0,
				gridRowSpan: !0,
				gridRowStart: !0,
				gridColumn: !0,
				gridColumnEnd: !0,
				gridColumnSpan: !0,
				gridColumnStart: !0,
				fontWeight: !0,
				lineClamp: !0,
				lineHeight: !0,
				opacity: !0,
				order: !0,
				orphans: !0,
				tabSize: !0,
				widows: !0,
				zIndex: !0,
				zoom: !0,
				fillOpacity: !0,
				floodOpacity: !0,
				stopOpacity: !0,
				strokeDasharray: !0,
				strokeDashoffset: !0,
				strokeMiterlimit: !0,
				strokeOpacity: !0,
				strokeWidth: !0,
			},
			Ga = ["Webkit", "ms", "Moz", "O"];
		Object.keys(jn).forEach(function (e) {
			Ga.forEach(function (t) {
				((t = t + e.charAt(0).toUpperCase() + e.substring(1)), (jn[t] = jn[e]));
			});
		});
		function Zo(e, t, n) {
			return t == null || typeof t == "boolean" || t === ""
				? ""
				: n ||
					  typeof t != "number" ||
					  t === 0 ||
					  (jn.hasOwnProperty(e) && jn[e])
					? ("" + t).trim()
					: t + "px";
		}
		function Jo(e, t) {
			e = e.style;
			for (var n in t)
				if (t.hasOwnProperty(n)) {
					var r = n.indexOf("--") === 0,
						l = Zo(n, t[n], r);
					(n === "float" && (n = "cssFloat"),
						r ? e.setProperty(n, l) : (e[n] = l));
				}
		}
		var Za = x(
			{ menuitem: !0 },
			{
				area: !0,
				base: !0,
				br: !0,
				col: !0,
				embed: !0,
				hr: !0,
				img: !0,
				input: !0,
				keygen: !0,
				link: !0,
				meta: !0,
				param: !0,
				source: !0,
				track: !0,
				wbr: !0,
			},
		);
		function $l(e, t) {
			if (t) {
				if (Za[e] && (t.children != null || t.dangerouslySetInnerHTML != null))
					throw Error(m(137, e));
				if (t.dangerouslySetInnerHTML != null) {
					if (t.children != null) throw Error(m(60));
					if (
						typeof t.dangerouslySetInnerHTML != "object" ||
						!("__html" in t.dangerouslySetInnerHTML)
					)
						throw Error(m(61));
				}
				if (t.style != null && typeof t.style != "object") throw Error(m(62));
			}
		}
		function Hl(e, t) {
			if (e.indexOf("-") === -1) return typeof t.is == "string";
			switch (e) {
				case "annotation-xml":
				case "color-profile":
				case "font-face":
				case "font-face-src":
				case "font-face-uri":
				case "font-face-format":
				case "font-face-name":
				case "missing-glyph":
					return !1;
				default:
					return !0;
			}
		}
		var Wl = null;
		function Ql(e) {
			return (
				(e = e.target || e.srcElement || window),
				e.correspondingUseElement && (e = e.correspondingUseElement),
				e.nodeType === 3 ? e.parentNode : e
			);
		}
		var Kl = null,
			an = null,
			cn = null;
		function qo(e) {
			if ((e = lr(e))) {
				if (typeof Kl != "function") throw Error(m(280));
				var t = e.stateNode;
				t && ((t = Qr(t)), Kl(e.stateNode, e.type, t));
			}
		}
		function bo(e) {
			an ? (cn ? cn.push(e) : (cn = [e])) : (an = e);
		}
		function ei() {
			if (an) {
				var e = an,
					t = cn;
				if (((cn = an = null), qo(e), t))
					for (e = 0; e < t.length; e++) qo(t[e]);
			}
		}
		function ti(e, t) {
			return e(t);
		}
		function ni() {}
		var Yl = !1;
		function ri(e, t, n) {
			if (Yl) return e(t, n);
			Yl = !0;
			try {
				return ti(e, t, n);
			} finally {
				((Yl = !1), (an !== null || cn !== null) && (ni(), ei()));
			}
		}
		function Fn(e, t) {
			var n = e.stateNode;
			if (n === null) return null;
			var r = Qr(n);
			if (r === null) return null;
			n = r[t];
			e: switch (t) {
				case "onClick":
				case "onClickCapture":
				case "onDoubleClick":
				case "onDoubleClickCapture":
				case "onMouseDown":
				case "onMouseDownCapture":
				case "onMouseMove":
				case "onMouseMoveCapture":
				case "onMouseUp":
				case "onMouseUpCapture":
				case "onMouseEnter":
					((r = !r.disabled) ||
						((e = e.type),
						(r = !(
							e === "button" ||
							e === "input" ||
							e === "select" ||
							e === "textarea"
						))),
						(e = !r));
					break e;
				default:
					e = !1;
			}
			if (e) return null;
			if (n && typeof n != "function") throw Error(m(231, t, typeof n));
			return n;
		}
		var Xl = !1;
		if (J)
			try {
				var Un = {};
				(Object.defineProperty(Un, "passive", {
					get: function () {
						Xl = !0;
					},
				}),
					window.addEventListener("test", Un, Un),
					window.removeEventListener("test", Un, Un));
			} catch {
				Xl = !1;
			}
		function Ja(e, t, n, r, l, u, o, i, s) {
			var p = Array.prototype.slice.call(arguments, 3);
			try {
				t.apply(n, p);
			} catch (y) {
				this.onError(y);
			}
		}
		var An = !1,
			Er = null,
			_r = !1,
			Gl = null,
			qa = {
				onError: function (e) {
					((An = !0), (Er = e));
				},
			};
		function ba(e, t, n, r, l, u, o, i, s) {
			((An = !1), (Er = null), Ja.apply(qa, arguments));
		}
		function ec(e, t, n, r, l, u, o, i, s) {
			if ((ba.apply(this, arguments), An)) {
				if (An) {
					var p = Er;
					((An = !1), (Er = null));
				} else throw Error(m(198));
				_r || ((_r = !0), (Gl = p));
			}
		}
		function Xt(e) {
			var t = e,
				n = e;
			if (e.alternate) for (; t.return; ) t = t.return;
			else {
				e = t;
				do ((t = e), (t.flags & 4098) !== 0 && (n = t.return), (e = t.return));
				while (e);
			}
			return t.tag === 3 ? n : null;
		}
		function li(e) {
			if (e.tag === 13) {
				var t = e.memoizedState;
				if (
					(t === null &&
						((e = e.alternate), e !== null && (t = e.memoizedState)),
					t !== null)
				)
					return t.dehydrated;
			}
			return null;
		}
		function ui(e) {
			if (Xt(e) !== e) throw Error(m(188));
		}
		function tc(e) {
			var t = e.alternate;
			if (!t) {
				if (((t = Xt(e)), t === null)) throw Error(m(188));
				return t !== e ? null : e;
			}
			for (var n = e, r = t; ; ) {
				var l = n.return;
				if (l === null) break;
				var u = l.alternate;
				if (u === null) {
					if (((r = l.return), r !== null)) {
						n = r;
						continue;
					}
					break;
				}
				if (l.child === u.child) {
					for (u = l.child; u; ) {
						if (u === n) return (ui(l), e);
						if (u === r) return (ui(l), t);
						u = u.sibling;
					}
					throw Error(m(188));
				}
				if (n.return !== r.return) ((n = l), (r = u));
				else {
					for (var o = !1, i = l.child; i; ) {
						if (i === n) {
							((o = !0), (n = l), (r = u));
							break;
						}
						if (i === r) {
							((o = !0), (r = l), (n = u));
							break;
						}
						i = i.sibling;
					}
					if (!o) {
						for (i = u.child; i; ) {
							if (i === n) {
								((o = !0), (n = u), (r = l));
								break;
							}
							if (i === r) {
								((o = !0), (r = u), (n = l));
								break;
							}
							i = i.sibling;
						}
						if (!o) throw Error(m(189));
					}
				}
				if (n.alternate !== r) throw Error(m(190));
			}
			if (n.tag !== 3) throw Error(m(188));
			return n.stateNode.current === n ? e : t;
		}
		function oi(e) {
			return ((e = tc(e)), e !== null ? ii(e) : null);
		}
		function ii(e) {
			if (e.tag === 5 || e.tag === 6) return e;
			for (e = e.child; e !== null; ) {
				var t = ii(e);
				if (t !== null) return t;
				e = e.sibling;
			}
			return null;
		}
		var si = O.unstable_scheduleCallback,
			ai = O.unstable_cancelCallback,
			nc = O.unstable_shouldYield,
			rc = O.unstable_requestPaint,
			pe = O.unstable_now,
			lc = O.unstable_getCurrentPriorityLevel,
			Zl = O.unstable_ImmediatePriority,
			ci = O.unstable_UserBlockingPriority,
			Cr = O.unstable_NormalPriority,
			uc = O.unstable_LowPriority,
			fi = O.unstable_IdlePriority,
			Pr = null,
			vt = null;
		function oc(e) {
			if (vt && typeof vt.onCommitFiberRoot == "function")
				try {
					vt.onCommitFiberRoot(Pr, e, void 0, (e.current.flags & 128) === 128);
				} catch {}
		}
		var at = Math.clz32 ? Math.clz32 : ac,
			ic = Math.log,
			sc = Math.LN2;
		function ac(e) {
			return ((e >>>= 0), e === 0 ? 32 : (31 - ((ic(e) / sc) | 0)) | 0);
		}
		var Nr = 64,
			zr = 4194304;
		function Vn(e) {
			switch (e & -e) {
				case 1:
					return 1;
				case 2:
					return 2;
				case 4:
					return 4;
				case 8:
					return 8;
				case 16:
					return 16;
				case 32:
					return 32;
				case 64:
				case 128:
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
					return e & 4194240;
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
				case 67108864:
					return e & 130023424;
				case 134217728:
					return 134217728;
				case 268435456:
					return 268435456;
				case 536870912:
					return 536870912;
				case 1073741824:
					return 1073741824;
				default:
					return e;
			}
		}
		function Tr(e, t) {
			var n = e.pendingLanes;
			if (n === 0) return 0;
			var r = 0,
				l = e.suspendedLanes,
				u = e.pingedLanes,
				o = n & 268435455;
			if (o !== 0) {
				var i = o & ~l;
				i !== 0 ? (r = Vn(i)) : ((u &= o), u !== 0 && (r = Vn(u)));
			} else ((o = n & ~l), o !== 0 ? (r = Vn(o)) : u !== 0 && (r = Vn(u)));
			if (r === 0) return 0;
			if (
				t !== 0 &&
				t !== r &&
				(t & l) === 0 &&
				((l = r & -r),
				(u = t & -t),
				l >= u || (l === 16 && (u & 4194240) !== 0))
			)
				return t;
			if (((r & 4) !== 0 && (r |= n & 16), (t = e.entangledLanes), t !== 0))
				for (e = e.entanglements, t &= r; 0 < t; )
					((n = 31 - at(t)), (l = 1 << n), (r |= e[n]), (t &= ~l));
			return r;
		}
		function cc(e, t) {
			switch (e) {
				case 1:
				case 2:
				case 4:
					return t + 250;
				case 8:
				case 16:
				case 32:
				case 64:
				case 128:
				case 256:
				case 512:
				case 1024:
				case 2048:
				case 4096:
				case 8192:
				case 16384:
				case 32768:
				case 65536:
				case 131072:
				case 262144:
				case 524288:
				case 1048576:
				case 2097152:
					return t + 5e3;
				case 4194304:
				case 8388608:
				case 16777216:
				case 33554432:
				case 67108864:
					return -1;
				case 134217728:
				case 268435456:
				case 536870912:
				case 1073741824:
					return -1;
				default:
					return -1;
			}
		}
		function fc(e, t) {
			for (
				var n = e.suspendedLanes,
					r = e.pingedLanes,
					l = e.expirationTimes,
					u = e.pendingLanes;
				0 < u;

			) {
				var o = 31 - at(u),
					i = 1 << o,
					s = l[o];
				(s === -1
					? ((i & n) === 0 || (i & r) !== 0) && (l[o] = cc(i, t))
					: s <= t && (e.expiredLanes |= i),
					(u &= ~i));
			}
		}
		function Jl(e) {
			return (
				(e = e.pendingLanes & -1073741825),
				e !== 0 ? e : e & 1073741824 ? 1073741824 : 0
			);
		}
		function di() {
			var e = Nr;
			return ((Nr <<= 1), (Nr & 4194240) === 0 && (Nr = 64), e);
		}
		function ql(e) {
			for (var t = [], n = 0; 31 > n; n++) t.push(e);
			return t;
		}
		function Bn(e, t, n) {
			((e.pendingLanes |= t),
				t !== 536870912 && ((e.suspendedLanes = 0), (e.pingedLanes = 0)),
				(e = e.eventTimes),
				(t = 31 - at(t)),
				(e[t] = n));
		}
		function dc(e, t) {
			var n = e.pendingLanes & ~t;
			((e.pendingLanes = t),
				(e.suspendedLanes = 0),
				(e.pingedLanes = 0),
				(e.expiredLanes &= t),
				(e.mutableReadLanes &= t),
				(e.entangledLanes &= t),
				(t = e.entanglements));
			var r = e.eventTimes;
			for (e = e.expirationTimes; 0 < n; ) {
				var l = 31 - at(n),
					u = 1 << l;
				((t[l] = 0), (r[l] = -1), (e[l] = -1), (n &= ~u));
			}
		}
		function bl(e, t) {
			var n = (e.entangledLanes |= t);
			for (e = e.entanglements; n; ) {
				var r = 31 - at(n),
					l = 1 << r;
				((l & t) | (e[r] & t) && (e[r] |= t), (n &= ~l));
			}
		}
		var W = 0;
		function pi(e) {
			return (
				(e &= -e),
				1 < e ? (4 < e ? ((e & 268435455) !== 0 ? 16 : 536870912) : 4) : 1
			);
		}
		var mi,
			eu,
			hi,
			vi,
			yi,
			tu = !1,
			Rr = [],
			Tt = null,
			Rt = null,
			Lt = null,
			$n = new Map(),
			Hn = new Map(),
			Ot = [],
			pc =
				"mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(
					" ",
				);
		function gi(e, t) {
			switch (e) {
				case "focusin":
				case "focusout":
					Tt = null;
					break;
				case "dragenter":
				case "dragleave":
					Rt = null;
					break;
				case "mouseover":
				case "mouseout":
					Lt = null;
					break;
				case "pointerover":
				case "pointerout":
					$n.delete(t.pointerId);
					break;
				case "gotpointercapture":
				case "lostpointercapture":
					Hn.delete(t.pointerId);
			}
		}
		function Wn(e, t, n, r, l, u) {
			return e === null || e.nativeEvent !== u
				? ((e = {
						blockedOn: t,
						domEventName: n,
						eventSystemFlags: r,
						nativeEvent: u,
						targetContainers: [l],
					}),
					t !== null && ((t = lr(t)), t !== null && eu(t)),
					e)
				: ((e.eventSystemFlags |= r),
					(t = e.targetContainers),
					l !== null && t.indexOf(l) === -1 && t.push(l),
					e);
		}
		function mc(e, t, n, r, l) {
			switch (t) {
				case "focusin":
					return ((Tt = Wn(Tt, e, t, n, r, l)), !0);
				case "dragenter":
					return ((Rt = Wn(Rt, e, t, n, r, l)), !0);
				case "mouseover":
					return ((Lt = Wn(Lt, e, t, n, r, l)), !0);
				case "pointerover":
					var u = l.pointerId;
					return ($n.set(u, Wn($n.get(u) || null, e, t, n, r, l)), !0);
				case "gotpointercapture":
					return (
						(u = l.pointerId),
						Hn.set(u, Wn(Hn.get(u) || null, e, t, n, r, l)),
						!0
					);
			}
			return !1;
		}
		function wi(e) {
			var t = Gt(e.target);
			if (t !== null) {
				var n = Xt(t);
				if (n !== null) {
					if (((t = n.tag), t === 13)) {
						if (((t = li(n)), t !== null)) {
							((e.blockedOn = t),
								yi(e.priority, function () {
									hi(n);
								}));
							return;
						}
					} else if (
						t === 3 &&
						n.stateNode.current.memoizedState.isDehydrated
					) {
						e.blockedOn = n.tag === 3 ? n.stateNode.containerInfo : null;
						return;
					}
				}
			}
			e.blockedOn = null;
		}
		function Lr(e) {
			if (e.blockedOn !== null) return !1;
			for (var t = e.targetContainers; 0 < t.length; ) {
				var n = ru(e.domEventName, e.eventSystemFlags, t[0], e.nativeEvent);
				if (n === null) {
					n = e.nativeEvent;
					var r = new n.constructor(n.type, n);
					((Wl = r), n.target.dispatchEvent(r), (Wl = null));
				} else return ((t = lr(n)), t !== null && eu(t), (e.blockedOn = n), !1);
				t.shift();
			}
			return !0;
		}
		function Si(e, t, n) {
			Lr(e) && n.delete(t);
		}
		function hc() {
			((tu = !1),
				Tt !== null && Lr(Tt) && (Tt = null),
				Rt !== null && Lr(Rt) && (Rt = null),
				Lt !== null && Lr(Lt) && (Lt = null),
				$n.forEach(Si),
				Hn.forEach(Si));
		}
		function Qn(e, t) {
			e.blockedOn === t &&
				((e.blockedOn = null),
				tu ||
					((tu = !0),
					O.unstable_scheduleCallback(O.unstable_NormalPriority, hc)));
		}
		function Kn(e) {
			function t(l) {
				return Qn(l, e);
			}
			if (0 < Rr.length) {
				Qn(Rr[0], e);
				for (var n = 1; n < Rr.length; n++) {
					var r = Rr[n];
					r.blockedOn === e && (r.blockedOn = null);
				}
			}
			for (
				Tt !== null && Qn(Tt, e),
					Rt !== null && Qn(Rt, e),
					Lt !== null && Qn(Lt, e),
					$n.forEach(t),
					Hn.forEach(t),
					n = 0;
				n < Ot.length;
				n++
			)
				((r = Ot[n]), r.blockedOn === e && (r.blockedOn = null));
			for (; 0 < Ot.length && ((n = Ot[0]), n.blockedOn === null); )
				(wi(n), n.blockedOn === null && Ot.shift());
		}
		var fn = se.ReactCurrentBatchConfig,
			Or = !0;
		function vc(e, t, n, r) {
			var l = W,
				u = fn.transition;
			fn.transition = null;
			try {
				((W = 1), nu(e, t, n, r));
			} finally {
				((W = l), (fn.transition = u));
			}
		}
		function yc(e, t, n, r) {
			var l = W,
				u = fn.transition;
			fn.transition = null;
			try {
				((W = 4), nu(e, t, n, r));
			} finally {
				((W = l), (fn.transition = u));
			}
		}
		function nu(e, t, n, r) {
			if (Or) {
				var l = ru(e, t, n, r);
				if (l === null) (Su(e, t, r, Dr, n), gi(e, r));
				else if (mc(l, e, t, n, r)) r.stopPropagation();
				else if ((gi(e, r), t & 4 && -1 < pc.indexOf(e))) {
					for (; l !== null; ) {
						var u = lr(l);
						if (
							(u !== null && mi(u),
							(u = ru(e, t, n, r)),
							u === null && Su(e, t, r, Dr, n),
							u === l)
						)
							break;
						l = u;
					}
					l !== null && r.stopPropagation();
				} else Su(e, t, r, null, n);
			}
		}
		var Dr = null;
		function ru(e, t, n, r) {
			if (((Dr = null), (e = Ql(r)), (e = Gt(e)), e !== null))
				if (((t = Xt(e)), t === null)) e = null;
				else if (((n = t.tag), n === 13)) {
					if (((e = li(t)), e !== null)) return e;
					e = null;
				} else if (n === 3) {
					if (t.stateNode.current.memoizedState.isDehydrated)
						return t.tag === 3 ? t.stateNode.containerInfo : null;
					e = null;
				} else t !== e && (e = null);
			return ((Dr = e), null);
		}
		function ki(e) {
			switch (e) {
				case "cancel":
				case "click":
				case "close":
				case "contextmenu":
				case "copy":
				case "cut":
				case "auxclick":
				case "dblclick":
				case "dragend":
				case "dragstart":
				case "drop":
				case "focusin":
				case "focusout":
				case "input":
				case "invalid":
				case "keydown":
				case "keypress":
				case "keyup":
				case "mousedown":
				case "mouseup":
				case "paste":
				case "pause":
				case "play":
				case "pointercancel":
				case "pointerdown":
				case "pointerup":
				case "ratechange":
				case "reset":
				case "resize":
				case "seeked":
				case "submit":
				case "touchcancel":
				case "touchend":
				case "touchstart":
				case "volumechange":
				case "change":
				case "selectionchange":
				case "textInput":
				case "compositionstart":
				case "compositionend":
				case "compositionupdate":
				case "beforeblur":
				case "afterblur":
				case "beforeinput":
				case "blur":
				case "fullscreenchange":
				case "focus":
				case "hashchange":
				case "popstate":
				case "select":
				case "selectstart":
					return 1;
				case "drag":
				case "dragenter":
				case "dragexit":
				case "dragleave":
				case "dragover":
				case "mousemove":
				case "mouseout":
				case "mouseover":
				case "pointermove":
				case "pointerout":
				case "pointerover":
				case "scroll":
				case "toggle":
				case "touchmove":
				case "wheel":
				case "mouseenter":
				case "mouseleave":
				case "pointerenter":
				case "pointerleave":
					return 4;
				case "message":
					switch (lc()) {
						case Zl:
							return 1;
						case ci:
							return 4;
						case Cr:
						case uc:
							return 16;
						case fi:
							return 536870912;
						default:
							return 16;
					}
				default:
					return 16;
			}
		}
		var Dt = null,
			lu = null,
			Ir = null;
		function xi() {
			if (Ir) return Ir;
			var e,
				t = lu,
				n = t.length,
				r,
				l = "value" in Dt ? Dt.value : Dt.textContent,
				u = l.length;
			for (e = 0; e < n && t[e] === l[e]; e++);
			var o = n - e;
			for (r = 1; r <= o && t[n - r] === l[u - r]; r++);
			return (Ir = l.slice(e, 1 < r ? 1 - r : void 0));
		}
		function Mr(e) {
			var t = e.keyCode;
			return (
				"charCode" in e
					? ((e = e.charCode), e === 0 && t === 13 && (e = 13))
					: (e = t),
				e === 10 && (e = 13),
				32 <= e || e === 13 ? e : 0
			);
		}
		function jr() {
			return !0;
		}
		function Ei() {
			return !1;
		}
		function Ge(e) {
			function t(n, r, l, u, o) {
				((this._reactName = n),
					(this._targetInst = l),
					(this.type = r),
					(this.nativeEvent = u),
					(this.target = o),
					(this.currentTarget = null));
				for (var i in e)
					e.hasOwnProperty(i) && ((n = e[i]), (this[i] = n ? n(u) : u[i]));
				return (
					(this.isDefaultPrevented = (
						u.defaultPrevented != null
							? u.defaultPrevented
							: u.returnValue === !1
					)
						? jr
						: Ei),
					(this.isPropagationStopped = Ei),
					this
				);
			}
			return (
				x(t.prototype, {
					preventDefault: function () {
						this.defaultPrevented = !0;
						var n = this.nativeEvent;
						n &&
							(n.preventDefault
								? n.preventDefault()
								: typeof n.returnValue != "unknown" && (n.returnValue = !1),
							(this.isDefaultPrevented = jr));
					},
					stopPropagation: function () {
						var n = this.nativeEvent;
						n &&
							(n.stopPropagation
								? n.stopPropagation()
								: typeof n.cancelBubble != "unknown" && (n.cancelBubble = !0),
							(this.isPropagationStopped = jr));
					},
					persist: function () {},
					isPersistent: jr,
				}),
				t
			);
		}
		var dn = {
				eventPhase: 0,
				bubbles: 0,
				cancelable: 0,
				timeStamp: function (e) {
					return e.timeStamp || Date.now();
				},
				defaultPrevented: 0,
				isTrusted: 0,
			},
			uu = Ge(dn),
			Yn = x({}, dn, { view: 0, detail: 0 }),
			gc = Ge(Yn),
			ou,
			iu,
			Xn,
			Fr = x({}, Yn, {
				screenX: 0,
				screenY: 0,
				clientX: 0,
				clientY: 0,
				pageX: 0,
				pageY: 0,
				ctrlKey: 0,
				shiftKey: 0,
				altKey: 0,
				metaKey: 0,
				getModifierState: au,
				button: 0,
				buttons: 0,
				relatedTarget: function (e) {
					return e.relatedTarget === void 0
						? e.fromElement === e.srcElement
							? e.toElement
							: e.fromElement
						: e.relatedTarget;
				},
				movementX: function (e) {
					return "movementX" in e
						? e.movementX
						: (e !== Xn &&
								(Xn && e.type === "mousemove"
									? ((ou = e.screenX - Xn.screenX),
										(iu = e.screenY - Xn.screenY))
									: (iu = ou = 0),
								(Xn = e)),
							ou);
				},
				movementY: function (e) {
					return "movementY" in e ? e.movementY : iu;
				},
			}),
			_i = Ge(Fr),
			wc = x({}, Fr, { dataTransfer: 0 }),
			Sc = Ge(wc),
			kc = x({}, Yn, { relatedTarget: 0 }),
			su = Ge(kc),
			xc = x({}, dn, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }),
			Ec = Ge(xc),
			_c = x({}, dn, {
				clipboardData: function (e) {
					return "clipboardData" in e ? e.clipboardData : window.clipboardData;
				},
			}),
			Cc = Ge(_c),
			Pc = x({}, dn, { data: 0 }),
			Ci = Ge(Pc),
			Nc = {
				Esc: "Escape",
				Spacebar: " ",
				Left: "ArrowLeft",
				Up: "ArrowUp",
				Right: "ArrowRight",
				Down: "ArrowDown",
				Del: "Delete",
				Win: "OS",
				Menu: "ContextMenu",
				Apps: "ContextMenu",
				Scroll: "ScrollLock",
				MozPrintableKey: "Unidentified",
			},
			zc = {
				8: "Backspace",
				9: "Tab",
				12: "Clear",
				13: "Enter",
				16: "Shift",
				17: "Control",
				18: "Alt",
				19: "Pause",
				20: "CapsLock",
				27: "Escape",
				32: " ",
				33: "PageUp",
				34: "PageDown",
				35: "End",
				36: "Home",
				37: "ArrowLeft",
				38: "ArrowUp",
				39: "ArrowRight",
				40: "ArrowDown",
				45: "Insert",
				46: "Delete",
				112: "F1",
				113: "F2",
				114: "F3",
				115: "F4",
				116: "F5",
				117: "F6",
				118: "F7",
				119: "F8",
				120: "F9",
				121: "F10",
				122: "F11",
				123: "F12",
				144: "NumLock",
				145: "ScrollLock",
				224: "Meta",
			},
			Tc = {
				Alt: "altKey",
				Control: "ctrlKey",
				Meta: "metaKey",
				Shift: "shiftKey",
			};
		function Rc(e) {
			var t = this.nativeEvent;
			return t.getModifierState
				? t.getModifierState(e)
				: (e = Tc[e])
					? !!t[e]
					: !1;
		}
		function au() {
			return Rc;
		}
		var Lc = x({}, Yn, {
				key: function (e) {
					if (e.key) {
						var t = Nc[e.key] || e.key;
						if (t !== "Unidentified") return t;
					}
					return e.type === "keypress"
						? ((e = Mr(e)), e === 13 ? "Enter" : String.fromCharCode(e))
						: e.type === "keydown" || e.type === "keyup"
							? zc[e.keyCode] || "Unidentified"
							: "";
				},
				code: 0,
				location: 0,
				ctrlKey: 0,
				shiftKey: 0,
				altKey: 0,
				metaKey: 0,
				repeat: 0,
				locale: 0,
				getModifierState: au,
				charCode: function (e) {
					return e.type === "keypress" ? Mr(e) : 0;
				},
				keyCode: function (e) {
					return e.type === "keydown" || e.type === "keyup" ? e.keyCode : 0;
				},
				which: function (e) {
					return e.type === "keypress"
						? Mr(e)
						: e.type === "keydown" || e.type === "keyup"
							? e.keyCode
							: 0;
				},
			}),
			Oc = Ge(Lc),
			Dc = x({}, Fr, {
				pointerId: 0,
				width: 0,
				height: 0,
				pressure: 0,
				tangentialPressure: 0,
				tiltX: 0,
				tiltY: 0,
				twist: 0,
				pointerType: 0,
				isPrimary: 0,
			}),
			Pi = Ge(Dc),
			Ic = x({}, Yn, {
				touches: 0,
				targetTouches: 0,
				changedTouches: 0,
				altKey: 0,
				metaKey: 0,
				ctrlKey: 0,
				shiftKey: 0,
				getModifierState: au,
			}),
			Mc = Ge(Ic),
			jc = x({}, dn, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }),
			Fc = Ge(jc),
			Uc = x({}, Fr, {
				deltaX: function (e) {
					return "deltaX" in e
						? e.deltaX
						: "wheelDeltaX" in e
							? -e.wheelDeltaX
							: 0;
				},
				deltaY: function (e) {
					return "deltaY" in e
						? e.deltaY
						: "wheelDeltaY" in e
							? -e.wheelDeltaY
							: "wheelDelta" in e
								? -e.wheelDelta
								: 0;
				},
				deltaZ: 0,
				deltaMode: 0,
			}),
			Ac = Ge(Uc),
			Vc = [9, 13, 27, 32],
			cu = J && "CompositionEvent" in window,
			Gn = null;
		J && "documentMode" in document && (Gn = document.documentMode);
		var Bc = J && "TextEvent" in window && !Gn,
			Ni = J && (!cu || (Gn && 8 < Gn && 11 >= Gn)),
			zi = " ",
			Ti = !1;
		function Ri(e, t) {
			switch (e) {
				case "keyup":
					return Vc.indexOf(t.keyCode) !== -1;
				case "keydown":
					return t.keyCode !== 229;
				case "keypress":
				case "mousedown":
				case "focusout":
					return !0;
				default:
					return !1;
			}
		}
		function Li(e) {
			return (
				(e = e.detail),
				typeof e == "object" && "data" in e ? e.data : null
			);
		}
		var pn = !1;
		function $c(e, t) {
			switch (e) {
				case "compositionend":
					return Li(t);
				case "keypress":
					return t.which !== 32 ? null : ((Ti = !0), zi);
				case "textInput":
					return ((e = t.data), e === zi && Ti ? null : e);
				default:
					return null;
			}
		}
		function Hc(e, t) {
			if (pn)
				return e === "compositionend" || (!cu && Ri(e, t))
					? ((e = xi()), (Ir = lu = Dt = null), (pn = !1), e)
					: null;
			switch (e) {
				case "paste":
					return null;
				case "keypress":
					if (
						!(t.ctrlKey || t.altKey || t.metaKey) ||
						(t.ctrlKey && t.altKey)
					) {
						if (t.char && 1 < t.char.length) return t.char;
						if (t.which) return String.fromCharCode(t.which);
					}
					return null;
				case "compositionend":
					return Ni && t.locale !== "ko" ? null : t.data;
				default:
					return null;
			}
		}
		var Wc = {
			color: !0,
			date: !0,
			datetime: !0,
			"datetime-local": !0,
			email: !0,
			month: !0,
			number: !0,
			password: !0,
			range: !0,
			search: !0,
			tel: !0,
			text: !0,
			time: !0,
			url: !0,
			week: !0,
		};
		function Oi(e) {
			var t = e && e.nodeName && e.nodeName.toLowerCase();
			return t === "input" ? !!Wc[e.type] : t === "textarea";
		}
		function Di(e, t, n, r) {
			(bo(r),
				(t = $r(t, "onChange")),
				0 < t.length &&
					((n = new uu("onChange", "change", null, n, r)),
					e.push({ event: n, listeners: t })));
		}
		var Zn = null,
			Jn = null;
		function Qc(e) {
			Ji(e, 0);
		}
		function Ur(e) {
			var t = gn(e);
			if (Bo(t)) return e;
		}
		function Kc(e, t) {
			if (e === "change") return t;
		}
		var Ii = !1;
		if (J) {
			var fu;
			if (J) {
				var du = "oninput" in document;
				if (!du) {
					var Mi = document.createElement("div");
					(Mi.setAttribute("oninput", "return;"),
						(du = typeof Mi.oninput == "function"));
				}
				fu = du;
			} else fu = !1;
			Ii = fu && (!document.documentMode || 9 < document.documentMode);
		}
		function ji() {
			Zn && (Zn.detachEvent("onpropertychange", Fi), (Jn = Zn = null));
		}
		function Fi(e) {
			if (e.propertyName === "value" && Ur(Jn)) {
				var t = [];
				(Di(t, Jn, e, Ql(e)), ri(Qc, t));
			}
		}
		function Yc(e, t, n) {
			e === "focusin"
				? (ji(), (Zn = t), (Jn = n), Zn.attachEvent("onpropertychange", Fi))
				: e === "focusout" && ji();
		}
		function Xc(e) {
			if (e === "selectionchange" || e === "keyup" || e === "keydown")
				return Ur(Jn);
		}
		function Gc(e, t) {
			if (e === "click") return Ur(t);
		}
		function Zc(e, t) {
			if (e === "input" || e === "change") return Ur(t);
		}
		function Jc(e, t) {
			return (e === t && (e !== 0 || 1 / e === 1 / t)) || (e !== e && t !== t);
		}
		var ct = typeof Object.is == "function" ? Object.is : Jc;
		function qn(e, t) {
			if (ct(e, t)) return !0;
			if (
				typeof e != "object" ||
				e === null ||
				typeof t != "object" ||
				t === null
			)
				return !1;
			var n = Object.keys(e),
				r = Object.keys(t);
			if (n.length !== r.length) return !1;
			for (r = 0; r < n.length; r++) {
				var l = n[r];
				if (!$.call(t, l) || !ct(e[l], t[l])) return !1;
			}
			return !0;
		}
		function Ui(e) {
			for (; e && e.firstChild; ) e = e.firstChild;
			return e;
		}
		function Ai(e, t) {
			var n = Ui(e);
			e = 0;
			for (var r; n; ) {
				if (n.nodeType === 3) {
					if (((r = e + n.textContent.length), e <= t && r >= t))
						return { node: n, offset: t - e };
					e = r;
				}
				e: {
					for (; n; ) {
						if (n.nextSibling) {
							n = n.nextSibling;
							break e;
						}
						n = n.parentNode;
					}
					n = void 0;
				}
				n = Ui(n);
			}
		}
		function Vi(e, t) {
			return e && t
				? e === t
					? !0
					: e && e.nodeType === 3
						? !1
						: t && t.nodeType === 3
							? Vi(e, t.parentNode)
							: "contains" in e
								? e.contains(t)
								: e.compareDocumentPosition
									? !!(e.compareDocumentPosition(t) & 16)
									: !1
				: !1;
		}
		function Bi() {
			for (var e = window, t = kr(); t instanceof e.HTMLIFrameElement; ) {
				try {
					var n = typeof t.contentWindow.location.href == "string";
				} catch {
					n = !1;
				}
				if (n) e = t.contentWindow;
				else break;
				t = kr(e.document);
			}
			return t;
		}
		function pu(e) {
			var t = e && e.nodeName && e.nodeName.toLowerCase();
			return (
				t &&
				((t === "input" &&
					(e.type === "text" ||
						e.type === "search" ||
						e.type === "tel" ||
						e.type === "url" ||
						e.type === "password")) ||
					t === "textarea" ||
					e.contentEditable === "true")
			);
		}
		function qc(e) {
			var t = Bi(),
				n = e.focusedElem,
				r = e.selectionRange;
			if (
				t !== n &&
				n &&
				n.ownerDocument &&
				Vi(n.ownerDocument.documentElement, n)
			) {
				if (r !== null && pu(n)) {
					if (
						((t = r.start),
						(e = r.end),
						e === void 0 && (e = t),
						"selectionStart" in n)
					)
						((n.selectionStart = t),
							(n.selectionEnd = Math.min(e, n.value.length)));
					else if (
						((e =
							((t = n.ownerDocument || document) && t.defaultView) || window),
						e.getSelection)
					) {
						e = e.getSelection();
						var l = n.textContent.length,
							u = Math.min(r.start, l);
						((r = r.end === void 0 ? u : Math.min(r.end, l)),
							!e.extend && u > r && ((l = r), (r = u), (u = l)),
							(l = Ai(n, u)));
						var o = Ai(n, r);
						l &&
							o &&
							(e.rangeCount !== 1 ||
								e.anchorNode !== l.node ||
								e.anchorOffset !== l.offset ||
								e.focusNode !== o.node ||
								e.focusOffset !== o.offset) &&
							((t = t.createRange()),
							t.setStart(l.node, l.offset),
							e.removeAllRanges(),
							u > r
								? (e.addRange(t), e.extend(o.node, o.offset))
								: (t.setEnd(o.node, o.offset), e.addRange(t)));
					}
				}
				for (t = [], e = n; (e = e.parentNode); )
					e.nodeType === 1 &&
						t.push({ element: e, left: e.scrollLeft, top: e.scrollTop });
				for (
					typeof n.focus == "function" && n.focus(), n = 0;
					n < t.length;
					n++
				)
					((e = t[n]),
						(e.element.scrollLeft = e.left),
						(e.element.scrollTop = e.top));
			}
		}
		var bc = J && "documentMode" in document && 11 >= document.documentMode,
			mn = null,
			mu = null,
			bn = null,
			hu = !1;
		function $i(e, t, n) {
			var r =
				n.window === n ? n.document : n.nodeType === 9 ? n : n.ownerDocument;
			hu ||
				mn == null ||
				mn !== kr(r) ||
				((r = mn),
				"selectionStart" in r && pu(r)
					? (r = { start: r.selectionStart, end: r.selectionEnd })
					: ((r = (
							(r.ownerDocument && r.ownerDocument.defaultView) ||
							window
						).getSelection()),
						(r = {
							anchorNode: r.anchorNode,
							anchorOffset: r.anchorOffset,
							focusNode: r.focusNode,
							focusOffset: r.focusOffset,
						})),
				(bn && qn(bn, r)) ||
					((bn = r),
					(r = $r(mu, "onSelect")),
					0 < r.length &&
						((t = new uu("onSelect", "select", null, t, n)),
						e.push({ event: t, listeners: r }),
						(t.target = mn))));
		}
		function Ar(e, t) {
			var n = {};
			return (
				(n[e.toLowerCase()] = t.toLowerCase()),
				(n["Webkit" + e] = "webkit" + t),
				(n["Moz" + e] = "moz" + t),
				n
			);
		}
		var hn = {
				animationend: Ar("Animation", "AnimationEnd"),
				animationiteration: Ar("Animation", "AnimationIteration"),
				animationstart: Ar("Animation", "AnimationStart"),
				transitionend: Ar("Transition", "TransitionEnd"),
			},
			vu = {},
			Hi = {};
		J &&
			((Hi = document.createElement("div").style),
			"AnimationEvent" in window ||
				(delete hn.animationend.animation,
				delete hn.animationiteration.animation,
				delete hn.animationstart.animation),
			"TransitionEvent" in window || delete hn.transitionend.transition);
		function Vr(e) {
			if (vu[e]) return vu[e];
			if (!hn[e]) return e;
			var t = hn[e],
				n;
			for (n in t) if (t.hasOwnProperty(n) && n in Hi) return (vu[e] = t[n]);
			return e;
		}
		var Wi = Vr("animationend"),
			Qi = Vr("animationiteration"),
			Ki = Vr("animationstart"),
			Yi = Vr("transitionend"),
			Xi = new Map(),
			Gi =
				"abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(
					" ",
				);
		function It(e, t) {
			(Xi.set(e, t), fe(t, [e]));
		}
		for (var yu = 0; yu < Gi.length; yu++) {
			var gu = Gi[yu],
				ef = gu.toLowerCase(),
				tf = gu[0].toUpperCase() + gu.slice(1);
			It(ef, "on" + tf);
		}
		(It(Wi, "onAnimationEnd"),
			It(Qi, "onAnimationIteration"),
			It(Ki, "onAnimationStart"),
			It("dblclick", "onDoubleClick"),
			It("focusin", "onFocus"),
			It("focusout", "onBlur"),
			It(Yi, "onTransitionEnd"),
			ie("onMouseEnter", ["mouseout", "mouseover"]),
			ie("onMouseLeave", ["mouseout", "mouseover"]),
			ie("onPointerEnter", ["pointerout", "pointerover"]),
			ie("onPointerLeave", ["pointerout", "pointerover"]),
			fe(
				"onChange",
				"change click focusin focusout input keydown keyup selectionchange".split(
					" ",
				),
			),
			fe(
				"onSelect",
				"focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(
					" ",
				),
			),
			fe("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]),
			fe(
				"onCompositionEnd",
				"compositionend focusout keydown keypress keyup mousedown".split(" "),
			),
			fe(
				"onCompositionStart",
				"compositionstart focusout keydown keypress keyup mousedown".split(" "),
			),
			fe(
				"onCompositionUpdate",
				"compositionupdate focusout keydown keypress keyup mousedown".split(
					" ",
				),
			));
		var er =
				"abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(
					" ",
				),
			nf = new Set(
				"cancel close invalid load scroll toggle".split(" ").concat(er),
			);
		function Zi(e, t, n) {
			var r = e.type || "unknown-event";
			((e.currentTarget = n), ec(r, t, void 0, e), (e.currentTarget = null));
		}
		function Ji(e, t) {
			t = (t & 4) !== 0;
			for (var n = 0; n < e.length; n++) {
				var r = e[n],
					l = r.event;
				r = r.listeners;
				e: {
					var u = void 0;
					if (t)
						for (var o = r.length - 1; 0 <= o; o--) {
							var i = r[o],
								s = i.instance,
								p = i.currentTarget;
							if (((i = i.listener), s !== u && l.isPropagationStopped()))
								break e;
							(Zi(l, i, p), (u = s));
						}
					else
						for (o = 0; o < r.length; o++) {
							if (
								((i = r[o]),
								(s = i.instance),
								(p = i.currentTarget),
								(i = i.listener),
								s !== u && l.isPropagationStopped())
							)
								break e;
							(Zi(l, i, p), (u = s));
						}
				}
			}
			if (_r) throw ((e = Gl), (_r = !1), (Gl = null), e);
		}
		function b(e, t) {
			var n = t[Pu];
			n === void 0 && (n = t[Pu] = new Set());
			var r = e + "__bubble";
			n.has(r) || (qi(t, e, 2, !1), n.add(r));
		}
		function wu(e, t, n) {
			var r = 0;
			(t && (r |= 4), qi(n, e, r, t));
		}
		var Br = "_reactListening" + Math.random().toString(36).slice(2);
		function tr(e) {
			if (!e[Br]) {
				((e[Br] = !0),
					te.forEach(function (n) {
						n !== "selectionchange" &&
							(nf.has(n) || wu(n, !1, e), wu(n, !0, e));
					}));
				var t = e.nodeType === 9 ? e : e.ownerDocument;
				t === null || t[Br] || ((t[Br] = !0), wu("selectionchange", !1, t));
			}
		}
		function qi(e, t, n, r) {
			switch (ki(t)) {
				case 1:
					var l = vc;
					break;
				case 4:
					l = yc;
					break;
				default:
					l = nu;
			}
			((n = l.bind(null, t, n, e)),
				(l = void 0),
				!Xl ||
					(t !== "touchstart" && t !== "touchmove" && t !== "wheel") ||
					(l = !0),
				r
					? l !== void 0
						? e.addEventListener(t, n, { capture: !0, passive: l })
						: e.addEventListener(t, n, !0)
					: l !== void 0
						? e.addEventListener(t, n, { passive: l })
						: e.addEventListener(t, n, !1));
		}
		function Su(e, t, n, r, l) {
			var u = r;
			if ((t & 1) === 0 && (t & 2) === 0 && r !== null)
				e: for (;;) {
					if (r === null) return;
					var o = r.tag;
					if (o === 3 || o === 4) {
						var i = r.stateNode.containerInfo;
						if (i === l || (i.nodeType === 8 && i.parentNode === l)) break;
						if (o === 4)
							for (o = r.return; o !== null; ) {
								var s = o.tag;
								if (
									(s === 3 || s === 4) &&
									((s = o.stateNode.containerInfo),
									s === l || (s.nodeType === 8 && s.parentNode === l))
								)
									return;
								o = o.return;
							}
						for (; i !== null; ) {
							if (((o = Gt(i)), o === null)) return;
							if (((s = o.tag), s === 5 || s === 6)) {
								r = u = o;
								continue e;
							}
							i = i.parentNode;
						}
					}
					r = r.return;
				}
			ri(function () {
				var p = u,
					y = Ql(n),
					g = [];
				e: {
					var v = Xi.get(e);
					if (v !== void 0) {
						var E = uu,
							C = e;
						switch (e) {
							case "keypress":
								if (Mr(n) === 0) break e;
							case "keydown":
							case "keyup":
								E = Oc;
								break;
							case "focusin":
								((C = "focus"), (E = su));
								break;
							case "focusout":
								((C = "blur"), (E = su));
								break;
							case "beforeblur":
							case "afterblur":
								E = su;
								break;
							case "click":
								if (n.button === 2) break e;
							case "auxclick":
							case "dblclick":
							case "mousedown":
							case "mousemove":
							case "mouseup":
							case "mouseout":
							case "mouseover":
							case "contextmenu":
								E = _i;
								break;
							case "drag":
							case "dragend":
							case "dragenter":
							case "dragexit":
							case "dragleave":
							case "dragover":
							case "dragstart":
							case "drop":
								E = Sc;
								break;
							case "touchcancel":
							case "touchend":
							case "touchmove":
							case "touchstart":
								E = Mc;
								break;
							case Wi:
							case Qi:
							case Ki:
								E = Ec;
								break;
							case Yi:
								E = Fc;
								break;
							case "scroll":
								E = gc;
								break;
							case "wheel":
								E = Ac;
								break;
							case "copy":
							case "cut":
							case "paste":
								E = Cc;
								break;
							case "gotpointercapture":
							case "lostpointercapture":
							case "pointercancel":
							case "pointerdown":
							case "pointermove":
							case "pointerout":
							case "pointerover":
							case "pointerup":
								E = Pi;
						}
						var P = (t & 4) !== 0,
							me = !P && e === "scroll",
							f = P ? (v !== null ? v + "Capture" : null) : v;
						P = [];
						for (var a = p, d; a !== null; ) {
							d = a;
							var w = d.stateNode;
							if (
								(d.tag === 5 &&
									w !== null &&
									((d = w),
									f !== null &&
										((w = Fn(a, f)), w != null && P.push(nr(a, w, d)))),
								me)
							)
								break;
							a = a.return;
						}
						0 < P.length &&
							((v = new E(v, C, null, n, y)),
							g.push({ event: v, listeners: P }));
					}
				}
				if ((t & 7) === 0) {
					e: {
						if (
							((v = e === "mouseover" || e === "pointerover"),
							(E = e === "mouseout" || e === "pointerout"),
							v &&
								n !== Wl &&
								(C = n.relatedTarget || n.fromElement) &&
								(Gt(C) || C[kt]))
						)
							break e;
						if (
							(E || v) &&
							((v =
								y.window === y
									? y
									: (v = y.ownerDocument)
										? v.defaultView || v.parentWindow
										: window),
							E
								? ((C = n.relatedTarget || n.toElement),
									(E = p),
									(C = C ? Gt(C) : null),
									C !== null &&
										((me = Xt(C)), C !== me || (C.tag !== 5 && C.tag !== 6)) &&
										(C = null))
								: ((E = null), (C = p)),
							E !== C)
						) {
							if (
								((P = _i),
								(w = "onMouseLeave"),
								(f = "onMouseEnter"),
								(a = "mouse"),
								(e === "pointerout" || e === "pointerover") &&
									((P = Pi),
									(w = "onPointerLeave"),
									(f = "onPointerEnter"),
									(a = "pointer")),
								(me = E == null ? v : gn(E)),
								(d = C == null ? v : gn(C)),
								(v = new P(w, a + "leave", E, n, y)),
								(v.target = me),
								(v.relatedTarget = d),
								(w = null),
								Gt(y) === p &&
									((P = new P(f, a + "enter", C, n, y)),
									(P.target = d),
									(P.relatedTarget = me),
									(w = P)),
								(me = w),
								E && C)
							)
								t: {
									for (P = E, f = C, a = 0, d = P; d; d = vn(d)) a++;
									for (d = 0, w = f; w; w = vn(w)) d++;
									for (; 0 < a - d; ) ((P = vn(P)), a--);
									for (; 0 < d - a; ) ((f = vn(f)), d--);
									for (; a--; ) {
										if (P === f || (f !== null && P === f.alternate)) break t;
										((P = vn(P)), (f = vn(f)));
									}
									P = null;
								}
							else P = null;
							(E !== null && bi(g, v, E, P, !1),
								C !== null && me !== null && bi(g, me, C, P, !0));
						}
					}
					e: {
						if (
							((v = p ? gn(p) : window),
							(E = v.nodeName && v.nodeName.toLowerCase()),
							E === "select" || (E === "input" && v.type === "file"))
						)
							var z = Kc;
						else if (Oi(v))
							if (Ii) z = Zc;
							else {
								z = Xc;
								var T = Yc;
							}
						else
							(E = v.nodeName) &&
								E.toLowerCase() === "input" &&
								(v.type === "checkbox" || v.type === "radio") &&
								(z = Gc);
						if (z && (z = z(e, p))) {
							Di(g, z, n, y);
							break e;
						}
						(T && T(e, v, p),
							e === "focusout" &&
								(T = v._wrapperState) &&
								T.controlled &&
								v.type === "number" &&
								Al(v, "number", v.value));
					}
					switch (((T = p ? gn(p) : window), e)) {
						case "focusin":
							(Oi(T) || T.contentEditable === "true") &&
								((mn = T), (mu = p), (bn = null));
							break;
						case "focusout":
							bn = mu = mn = null;
							break;
						case "mousedown":
							hu = !0;
							break;
						case "contextmenu":
						case "mouseup":
						case "dragend":
							((hu = !1), $i(g, n, y));
							break;
						case "selectionchange":
							if (bc) break;
						case "keydown":
						case "keyup":
							$i(g, n, y);
					}
					var R;
					if (cu)
						e: {
							switch (e) {
								case "compositionstart":
									var D = "onCompositionStart";
									break e;
								case "compositionend":
									D = "onCompositionEnd";
									break e;
								case "compositionupdate":
									D = "onCompositionUpdate";
									break e;
							}
							D = void 0;
						}
					else
						pn
							? Ri(e, n) && (D = "onCompositionEnd")
							: e === "keydown" &&
								n.keyCode === 229 &&
								(D = "onCompositionStart");
					(D &&
						(Ni &&
							n.locale !== "ko" &&
							(pn || D !== "onCompositionStart"
								? D === "onCompositionEnd" && pn && (R = xi())
								: ((Dt = y),
									(lu = "value" in Dt ? Dt.value : Dt.textContent),
									(pn = !0))),
						(T = $r(p, D)),
						0 < T.length &&
							((D = new Ci(D, e, null, n, y)),
							g.push({ event: D, listeners: T }),
							R ? (D.data = R) : ((R = Li(n)), R !== null && (D.data = R)))),
						(R = Bc ? $c(e, n) : Hc(e, n)) &&
							((p = $r(p, "onBeforeInput")),
							0 < p.length &&
								((y = new Ci("onBeforeInput", "beforeinput", null, n, y)),
								g.push({ event: y, listeners: p }),
								(y.data = R))));
				}
				Ji(g, t);
			});
		}
		function nr(e, t, n) {
			return { instance: e, listener: t, currentTarget: n };
		}
		function $r(e, t) {
			for (var n = t + "Capture", r = []; e !== null; ) {
				var l = e,
					u = l.stateNode;
				(l.tag === 5 &&
					u !== null &&
					((l = u),
					(u = Fn(e, n)),
					u != null && r.unshift(nr(e, u, l)),
					(u = Fn(e, t)),
					u != null && r.push(nr(e, u, l))),
					(e = e.return));
			}
			return r;
		}
		function vn(e) {
			if (e === null) return null;
			do e = e.return;
			while (e && e.tag !== 5);
			return e || null;
		}
		function bi(e, t, n, r, l) {
			for (var u = t._reactName, o = []; n !== null && n !== r; ) {
				var i = n,
					s = i.alternate,
					p = i.stateNode;
				if (s !== null && s === r) break;
				(i.tag === 5 &&
					p !== null &&
					((i = p),
					l
						? ((s = Fn(n, u)), s != null && o.unshift(nr(n, s, i)))
						: l || ((s = Fn(n, u)), s != null && o.push(nr(n, s, i)))),
					(n = n.return));
			}
			o.length !== 0 && e.push({ event: t, listeners: o });
		}
		var rf = /\r\n?/g,
			lf = /\u0000|\uFFFD/g;
		function es(e) {
			return (typeof e == "string" ? e : "" + e)
				.replace(
					rf,
					`
`,
				)
				.replace(lf, "");
		}
		function Hr(e, t, n) {
			if (((t = es(t)), es(e) !== t && n)) throw Error(m(425));
		}
		function Wr() {}
		var ku = null,
			xu = null;
		function Eu(e, t) {
			return (
				e === "textarea" ||
				e === "noscript" ||
				typeof t.children == "string" ||
				typeof t.children == "number" ||
				(typeof t.dangerouslySetInnerHTML == "object" &&
					t.dangerouslySetInnerHTML !== null &&
					t.dangerouslySetInnerHTML.__html != null)
			);
		}
		var _u = typeof setTimeout == "function" ? setTimeout : void 0,
			uf = typeof clearTimeout == "function" ? clearTimeout : void 0,
			ts = typeof Promise == "function" ? Promise : void 0,
			of =
				typeof queueMicrotask == "function"
					? queueMicrotask
					: typeof ts < "u"
						? function (e) {
								return ts.resolve(null).then(e).catch(sf);
							}
						: _u;
		function sf(e) {
			setTimeout(function () {
				throw e;
			});
		}
		function Cu(e, t) {
			var n = t,
				r = 0;
			do {
				var l = n.nextSibling;
				if ((e.removeChild(n), l && l.nodeType === 8))
					if (((n = l.data), n === "/$")) {
						if (r === 0) {
							(e.removeChild(l), Kn(t));
							return;
						}
						r--;
					} else (n !== "$" && n !== "$?" && n !== "$!") || r++;
				n = l;
			} while (n);
			Kn(t);
		}
		function Mt(e) {
			for (; e != null; e = e.nextSibling) {
				var t = e.nodeType;
				if (t === 1 || t === 3) break;
				if (t === 8) {
					if (((t = e.data), t === "$" || t === "$!" || t === "$?")) break;
					if (t === "/$") return null;
				}
			}
			return e;
		}
		function ns(e) {
			e = e.previousSibling;
			for (var t = 0; e; ) {
				if (e.nodeType === 8) {
					var n = e.data;
					if (n === "$" || n === "$!" || n === "$?") {
						if (t === 0) return e;
						t--;
					} else n === "/$" && t++;
				}
				e = e.previousSibling;
			}
			return null;
		}
		var yn = Math.random().toString(36).slice(2),
			yt = "__reactFiber$" + yn,
			rr = "__reactProps$" + yn,
			kt = "__reactContainer$" + yn,
			Pu = "__reactEvents$" + yn,
			af = "__reactListeners$" + yn,
			cf = "__reactHandles$" + yn;
		function Gt(e) {
			var t = e[yt];
			if (t) return t;
			for (var n = e.parentNode; n; ) {
				if ((t = n[kt] || n[yt])) {
					if (
						((n = t.alternate),
						t.child !== null || (n !== null && n.child !== null))
					)
						for (e = ns(e); e !== null; ) {
							if ((n = e[yt])) return n;
							e = ns(e);
						}
					return t;
				}
				((e = n), (n = e.parentNode));
			}
			return null;
		}
		function lr(e) {
			return (
				(e = e[yt] || e[kt]),
				!e || (e.tag !== 5 && e.tag !== 6 && e.tag !== 13 && e.tag !== 3)
					? null
					: e
			);
		}
		function gn(e) {
			if (e.tag === 5 || e.tag === 6) return e.stateNode;
			throw Error(m(33));
		}
		function Qr(e) {
			return e[rr] || null;
		}
		var Nu = [],
			wn = -1;
		function jt(e) {
			return { current: e };
		}
		function ee(e) {
			0 > wn || ((e.current = Nu[wn]), (Nu[wn] = null), wn--);
		}
		function Z(e, t) {
			(wn++, (Nu[wn] = e.current), (e.current = t));
		}
		var Ft = {},
			Le = jt(Ft),
			Be = jt(!1),
			Zt = Ft;
		function Sn(e, t) {
			var n = e.type.contextTypes;
			if (!n) return Ft;
			var r = e.stateNode;
			if (r && r.__reactInternalMemoizedUnmaskedChildContext === t)
				return r.__reactInternalMemoizedMaskedChildContext;
			var l = {},
				u;
			for (u in n) l[u] = t[u];
			return (
				r &&
					((e = e.stateNode),
					(e.__reactInternalMemoizedUnmaskedChildContext = t),
					(e.__reactInternalMemoizedMaskedChildContext = l)),
				l
			);
		}
		function $e(e) {
			return ((e = e.childContextTypes), e != null);
		}
		function Kr() {
			(ee(Be), ee(Le));
		}
		function rs(e, t, n) {
			if (Le.current !== Ft) throw Error(m(168));
			(Z(Le, t), Z(Be, n));
		}
		function ls(e, t, n) {
			var r = e.stateNode;
			if (((t = t.childContextTypes), typeof r.getChildContext != "function"))
				return n;
			r = r.getChildContext();
			for (var l in r) if (!(l in t)) throw Error(m(108, G(e) || "Unknown", l));
			return x({}, n, r);
		}
		function Yr(e) {
			return (
				(e =
					((e = e.stateNode) && e.__reactInternalMemoizedMergedChildContext) ||
					Ft),
				(Zt = Le.current),
				Z(Le, e),
				Z(Be, Be.current),
				!0
			);
		}
		function us(e, t, n) {
			var r = e.stateNode;
			if (!r) throw Error(m(169));
			(n
				? ((e = ls(e, t, Zt)),
					(r.__reactInternalMemoizedMergedChildContext = e),
					ee(Be),
					ee(Le),
					Z(Le, e))
				: ee(Be),
				Z(Be, n));
		}
		var xt = null,
			Xr = !1,
			zu = !1;
		function os(e) {
			xt === null ? (xt = [e]) : xt.push(e);
		}
		function ff(e) {
			((Xr = !0), os(e));
		}
		function Ut() {
			if (!zu && xt !== null) {
				zu = !0;
				var e = 0,
					t = W;
				try {
					var n = xt;
					for (W = 1; e < n.length; e++) {
						var r = n[e];
						do r = r(!0);
						while (r !== null);
					}
					((xt = null), (Xr = !1));
				} catch (l) {
					throw (xt !== null && (xt = xt.slice(e + 1)), si(Zl, Ut), l);
				} finally {
					((W = t), (zu = !1));
				}
			}
			return null;
		}
		var kn = [],
			xn = 0,
			Gr = null,
			Zr = 0,
			tt = [],
			nt = 0,
			Jt = null,
			Et = 1,
			_t = "";
		function qt(e, t) {
			((kn[xn++] = Zr), (kn[xn++] = Gr), (Gr = e), (Zr = t));
		}
		function is(e, t, n) {
			((tt[nt++] = Et), (tt[nt++] = _t), (tt[nt++] = Jt), (Jt = e));
			var r = Et;
			e = _t;
			var l = 32 - at(r) - 1;
			((r &= ~(1 << l)), (n += 1));
			var u = 32 - at(t) + l;
			if (30 < u) {
				var o = l - (l % 5);
				((u = (r & ((1 << o) - 1)).toString(32)),
					(r >>= o),
					(l -= o),
					(Et = (1 << (32 - at(t) + l)) | (n << l) | r),
					(_t = u + e));
			} else ((Et = (1 << u) | (n << l) | r), (_t = e));
		}
		function Tu(e) {
			e.return !== null && (qt(e, 1), is(e, 1, 0));
		}
		function Ru(e) {
			for (; e === Gr; )
				((Gr = kn[--xn]), (kn[xn] = null), (Zr = kn[--xn]), (kn[xn] = null));
			for (; e === Jt; )
				((Jt = tt[--nt]),
					(tt[nt] = null),
					(_t = tt[--nt]),
					(tt[nt] = null),
					(Et = tt[--nt]),
					(tt[nt] = null));
		}
		var Ze = null,
			Je = null,
			le = !1,
			ft = null;
		function ss(e, t) {
			var n = ot(5, null, null, 0);
			((n.elementType = "DELETED"),
				(n.stateNode = t),
				(n.return = e),
				(t = e.deletions),
				t === null ? ((e.deletions = [n]), (e.flags |= 16)) : t.push(n));
		}
		function as(e, t) {
			switch (e.tag) {
				case 5:
					var n = e.type;
					return (
						(t =
							t.nodeType !== 1 || n.toLowerCase() !== t.nodeName.toLowerCase()
								? null
								: t),
						t !== null
							? ((e.stateNode = t), (Ze = e), (Je = Mt(t.firstChild)), !0)
							: !1
					);
				case 6:
					return (
						(t = e.pendingProps === "" || t.nodeType !== 3 ? null : t),
						t !== null ? ((e.stateNode = t), (Ze = e), (Je = null), !0) : !1
					);
				case 13:
					return (
						(t = t.nodeType !== 8 ? null : t),
						t !== null
							? ((n = Jt !== null ? { id: Et, overflow: _t } : null),
								(e.memoizedState = {
									dehydrated: t,
									treeContext: n,
									retryLane: 1073741824,
								}),
								(n = ot(18, null, null, 0)),
								(n.stateNode = t),
								(n.return = e),
								(e.child = n),
								(Ze = e),
								(Je = null),
								!0)
							: !1
					);
				default:
					return !1;
			}
		}
		function Lu(e) {
			return (e.mode & 1) !== 0 && (e.flags & 128) === 0;
		}
		function Ou(e) {
			if (le) {
				var t = Je;
				if (t) {
					var n = t;
					if (!as(e, t)) {
						if (Lu(e)) throw Error(m(418));
						t = Mt(n.nextSibling);
						var r = Ze;
						t && as(e, t)
							? ss(r, n)
							: ((e.flags = (e.flags & -4097) | 2), (le = !1), (Ze = e));
					}
				} else {
					if (Lu(e)) throw Error(m(418));
					((e.flags = (e.flags & -4097) | 2), (le = !1), (Ze = e));
				}
			}
		}
		function cs(e) {
			for (
				e = e.return;
				e !== null && e.tag !== 5 && e.tag !== 3 && e.tag !== 13;

			)
				e = e.return;
			Ze = e;
		}
		function Jr(e) {
			if (e !== Ze) return !1;
			if (!le) return (cs(e), (le = !0), !1);
			var t;
			if (
				((t = e.tag !== 3) &&
					!(t = e.tag !== 5) &&
					((t = e.type),
					(t = t !== "head" && t !== "body" && !Eu(e.type, e.memoizedProps))),
				t && (t = Je))
			) {
				if (Lu(e)) throw (fs(), Error(m(418)));
				for (; t; ) (ss(e, t), (t = Mt(t.nextSibling)));
			}
			if ((cs(e), e.tag === 13)) {
				if (((e = e.memoizedState), (e = e !== null ? e.dehydrated : null), !e))
					throw Error(m(317));
				e: {
					for (e = e.nextSibling, t = 0; e; ) {
						if (e.nodeType === 8) {
							var n = e.data;
							if (n === "/$") {
								if (t === 0) {
									Je = Mt(e.nextSibling);
									break e;
								}
								t--;
							} else (n !== "$" && n !== "$!" && n !== "$?") || t++;
						}
						e = e.nextSibling;
					}
					Je = null;
				}
			} else Je = Ze ? Mt(e.stateNode.nextSibling) : null;
			return !0;
		}
		function fs() {
			for (var e = Je; e; ) e = Mt(e.nextSibling);
		}
		function En() {
			((Je = Ze = null), (le = !1));
		}
		function Du(e) {
			ft === null ? (ft = [e]) : ft.push(e);
		}
		var df = se.ReactCurrentBatchConfig;
		function ur(e, t, n) {
			if (
				((e = n.ref),
				e !== null && typeof e != "function" && typeof e != "object")
			) {
				if (n._owner) {
					if (((n = n._owner), n)) {
						if (n.tag !== 1) throw Error(m(309));
						var r = n.stateNode;
					}
					if (!r) throw Error(m(147, e));
					var l = r,
						u = "" + e;
					return t !== null &&
						t.ref !== null &&
						typeof t.ref == "function" &&
						t.ref._stringRef === u
						? t.ref
						: ((t = function (o) {
								var i = l.refs;
								o === null ? delete i[u] : (i[u] = o);
							}),
							(t._stringRef = u),
							t);
				}
				if (typeof e != "string") throw Error(m(284));
				if (!n._owner) throw Error(m(290, e));
			}
			return e;
		}
		function qr(e, t) {
			throw (
				(e = Object.prototype.toString.call(t)),
				Error(
					m(
						31,
						e === "[object Object]"
							? "object with keys {" + Object.keys(t).join(", ") + "}"
							: e,
					),
				)
			);
		}
		function ds(e) {
			var t = e._init;
			return t(e._payload);
		}
		function ps(e) {
			function t(f, a) {
				if (e) {
					var d = f.deletions;
					d === null ? ((f.deletions = [a]), (f.flags |= 16)) : d.push(a);
				}
			}
			function n(f, a) {
				if (!e) return null;
				for (; a !== null; ) (t(f, a), (a = a.sibling));
				return null;
			}
			function r(f, a) {
				for (f = new Map(); a !== null; )
					(a.key !== null ? f.set(a.key, a) : f.set(a.index, a),
						(a = a.sibling));
				return f;
			}
			function l(f, a) {
				return ((f = Kt(f, a)), (f.index = 0), (f.sibling = null), f);
			}
			function u(f, a, d) {
				return (
					(f.index = d),
					e
						? ((d = f.alternate),
							d !== null
								? ((d = d.index), d < a ? ((f.flags |= 2), a) : d)
								: ((f.flags |= 2), a))
						: ((f.flags |= 1048576), a)
				);
			}
			function o(f) {
				return (e && f.alternate === null && (f.flags |= 2), f);
			}
			function i(f, a, d, w) {
				return a === null || a.tag !== 6
					? ((a = Co(d, f.mode, w)), (a.return = f), a)
					: ((a = l(a, d)), (a.return = f), a);
			}
			function s(f, a, d, w) {
				var z = d.type;
				return z === ae
					? y(f, a, d.props.children, w, d.key)
					: a !== null &&
						  (a.elementType === z ||
								(typeof z == "object" &&
									z !== null &&
									z.$$typeof === Pe &&
									ds(z) === a.type))
						? ((w = l(a, d.props)), (w.ref = ur(f, a, d)), (w.return = f), w)
						: ((w = xl(d.type, d.key, d.props, null, f.mode, w)),
							(w.ref = ur(f, a, d)),
							(w.return = f),
							w);
			}
			function p(f, a, d, w) {
				return a === null ||
					a.tag !== 4 ||
					a.stateNode.containerInfo !== d.containerInfo ||
					a.stateNode.implementation !== d.implementation
					? ((a = Po(d, f.mode, w)), (a.return = f), a)
					: ((a = l(a, d.children || [])), (a.return = f), a);
			}
			function y(f, a, d, w, z) {
				return a === null || a.tag !== 7
					? ((a = on(d, f.mode, w, z)), (a.return = f), a)
					: ((a = l(a, d)), (a.return = f), a);
			}
			function g(f, a, d) {
				if ((typeof a == "string" && a !== "") || typeof a == "number")
					return ((a = Co("" + a, f.mode, d)), (a.return = f), a);
				if (typeof a == "object" && a !== null) {
					switch (a.$$typeof) {
						case Ve:
							return (
								(d = xl(a.type, a.key, a.props, null, f.mode, d)),
								(d.ref = ur(f, null, a)),
								(d.return = f),
								d
							);
						case q:
							return ((a = Po(a, f.mode, d)), (a.return = f), a);
						case Pe:
							var w = a._init;
							return g(f, w(a._payload), d);
					}
					if (In(a) || N(a))
						return ((a = on(a, f.mode, d, null)), (a.return = f), a);
					qr(f, a);
				}
				return null;
			}
			function v(f, a, d, w) {
				var z = a !== null ? a.key : null;
				if ((typeof d == "string" && d !== "") || typeof d == "number")
					return z !== null ? null : i(f, a, "" + d, w);
				if (typeof d == "object" && d !== null) {
					switch (d.$$typeof) {
						case Ve:
							return d.key === z ? s(f, a, d, w) : null;
						case q:
							return d.key === z ? p(f, a, d, w) : null;
						case Pe:
							return ((z = d._init), v(f, a, z(d._payload), w));
					}
					if (In(d) || N(d)) return z !== null ? null : y(f, a, d, w, null);
					qr(f, d);
				}
				return null;
			}
			function E(f, a, d, w, z) {
				if ((typeof w == "string" && w !== "") || typeof w == "number")
					return ((f = f.get(d) || null), i(a, f, "" + w, z));
				if (typeof w == "object" && w !== null) {
					switch (w.$$typeof) {
						case Ve:
							return (
								(f = f.get(w.key === null ? d : w.key) || null),
								s(a, f, w, z)
							);
						case q:
							return (
								(f = f.get(w.key === null ? d : w.key) || null),
								p(a, f, w, z)
							);
						case Pe:
							var T = w._init;
							return E(f, a, d, T(w._payload), z);
					}
					if (In(w) || N(w))
						return ((f = f.get(d) || null), y(a, f, w, z, null));
					qr(a, w);
				}
				return null;
			}
			function C(f, a, d, w) {
				for (
					var z = null, T = null, R = a, D = (a = 0), Ce = null;
					R !== null && D < d.length;
					D++
				) {
					R.index > D ? ((Ce = R), (R = null)) : (Ce = R.sibling);
					var V = v(f, R, d[D], w);
					if (V === null) {
						R === null && (R = Ce);
						break;
					}
					(e && R && V.alternate === null && t(f, R),
						(a = u(V, a, D)),
						T === null ? (z = V) : (T.sibling = V),
						(T = V),
						(R = Ce));
				}
				if (D === d.length) return (n(f, R), le && qt(f, D), z);
				if (R === null) {
					for (; D < d.length; D++)
						((R = g(f, d[D], w)),
							R !== null &&
								((a = u(R, a, D)),
								T === null ? (z = R) : (T.sibling = R),
								(T = R)));
					return (le && qt(f, D), z);
				}
				for (R = r(f, R); D < d.length; D++)
					((Ce = E(R, f, D, d[D], w)),
						Ce !== null &&
							(e &&
								Ce.alternate !== null &&
								R.delete(Ce.key === null ? D : Ce.key),
							(a = u(Ce, a, D)),
							T === null ? (z = Ce) : (T.sibling = Ce),
							(T = Ce)));
				return (
					e &&
						R.forEach(function (Yt) {
							return t(f, Yt);
						}),
					le && qt(f, D),
					z
				);
			}
			function P(f, a, d, w) {
				var z = N(d);
				if (typeof z != "function") throw Error(m(150));
				if (((d = z.call(d)), d == null)) throw Error(m(151));
				for (
					var T = (z = null), R = a, D = (a = 0), Ce = null, V = d.next();
					R !== null && !V.done;
					D++, V = d.next()
				) {
					R.index > D ? ((Ce = R), (R = null)) : (Ce = R.sibling);
					var Yt = v(f, R, V.value, w);
					if (Yt === null) {
						R === null && (R = Ce);
						break;
					}
					(e && R && Yt.alternate === null && t(f, R),
						(a = u(Yt, a, D)),
						T === null ? (z = Yt) : (T.sibling = Yt),
						(T = Yt),
						(R = Ce));
				}
				if (V.done) return (n(f, R), le && qt(f, D), z);
				if (R === null) {
					for (; !V.done; D++, V = d.next())
						((V = g(f, V.value, w)),
							V !== null &&
								((a = u(V, a, D)),
								T === null ? (z = V) : (T.sibling = V),
								(T = V)));
					return (le && qt(f, D), z);
				}
				for (R = r(f, R); !V.done; D++, V = d.next())
					((V = E(R, f, D, V.value, w)),
						V !== null &&
							(e &&
								V.alternate !== null &&
								R.delete(V.key === null ? D : V.key),
							(a = u(V, a, D)),
							T === null ? (z = V) : (T.sibling = V),
							(T = V)));
				return (
					e &&
						R.forEach(function (Qf) {
							return t(f, Qf);
						}),
					le && qt(f, D),
					z
				);
			}
			function me(f, a, d, w) {
				if (
					(typeof d == "object" &&
						d !== null &&
						d.type === ae &&
						d.key === null &&
						(d = d.props.children),
					typeof d == "object" && d !== null)
				) {
					switch (d.$$typeof) {
						case Ve:
							e: {
								for (var z = d.key, T = a; T !== null; ) {
									if (T.key === z) {
										if (((z = d.type), z === ae)) {
											if (T.tag === 7) {
												(n(f, T.sibling),
													(a = l(T, d.props.children)),
													(a.return = f),
													(f = a));
												break e;
											}
										} else if (
											T.elementType === z ||
											(typeof z == "object" &&
												z !== null &&
												z.$$typeof === Pe &&
												ds(z) === T.type)
										) {
											(n(f, T.sibling),
												(a = l(T, d.props)),
												(a.ref = ur(f, T, d)),
												(a.return = f),
												(f = a));
											break e;
										}
										n(f, T);
										break;
									} else t(f, T);
									T = T.sibling;
								}
								d.type === ae
									? ((a = on(d.props.children, f.mode, w, d.key)),
										(a.return = f),
										(f = a))
									: ((w = xl(d.type, d.key, d.props, null, f.mode, w)),
										(w.ref = ur(f, a, d)),
										(w.return = f),
										(f = w));
							}
							return o(f);
						case q:
							e: {
								for (T = d.key; a !== null; ) {
									if (a.key === T)
										if (
											a.tag === 4 &&
											a.stateNode.containerInfo === d.containerInfo &&
											a.stateNode.implementation === d.implementation
										) {
											(n(f, a.sibling),
												(a = l(a, d.children || [])),
												(a.return = f),
												(f = a));
											break e;
										} else {
											n(f, a);
											break;
										}
									else t(f, a);
									a = a.sibling;
								}
								((a = Po(d, f.mode, w)), (a.return = f), (f = a));
							}
							return o(f);
						case Pe:
							return ((T = d._init), me(f, a, T(d._payload), w));
					}
					if (In(d)) return C(f, a, d, w);
					if (N(d)) return P(f, a, d, w);
					qr(f, d);
				}
				return (typeof d == "string" && d !== "") || typeof d == "number"
					? ((d = "" + d),
						a !== null && a.tag === 6
							? (n(f, a.sibling), (a = l(a, d)), (a.return = f), (f = a))
							: (n(f, a), (a = Co(d, f.mode, w)), (a.return = f), (f = a)),
						o(f))
					: n(f, a);
			}
			return me;
		}
		var _n = ps(!0),
			ms = ps(!1),
			br = jt(null),
			el = null,
			Cn = null,
			Iu = null;
		function Mu() {
			Iu = Cn = el = null;
		}
		function ju(e) {
			var t = br.current;
			(ee(br), (e._currentValue = t));
		}
		function Fu(e, t, n) {
			for (; e !== null; ) {
				var r = e.alternate;
				if (
					((e.childLanes & t) !== t
						? ((e.childLanes |= t), r !== null && (r.childLanes |= t))
						: r !== null && (r.childLanes & t) !== t && (r.childLanes |= t),
					e === n)
				)
					break;
				e = e.return;
			}
		}
		function Pn(e, t) {
			((el = e),
				(Iu = Cn = null),
				(e = e.dependencies),
				e !== null &&
					e.firstContext !== null &&
					((e.lanes & t) !== 0 && (He = !0), (e.firstContext = null)));
		}
		function rt(e) {
			var t = e._currentValue;
			if (Iu !== e)
				if (((e = { context: e, memoizedValue: t, next: null }), Cn === null)) {
					if (el === null) throw Error(m(308));
					((Cn = e), (el.dependencies = { lanes: 0, firstContext: e }));
				} else Cn = Cn.next = e;
			return t;
		}
		var bt = null;
		function Uu(e) {
			bt === null ? (bt = [e]) : bt.push(e);
		}
		function hs(e, t, n, r) {
			var l = t.interleaved;
			return (
				l === null ? ((n.next = n), Uu(t)) : ((n.next = l.next), (l.next = n)),
				(t.interleaved = n),
				Ct(e, r)
			);
		}
		function Ct(e, t) {
			e.lanes |= t;
			var n = e.alternate;
			for (n !== null && (n.lanes |= t), n = e, e = e.return; e !== null; )
				((e.childLanes |= t),
					(n = e.alternate),
					n !== null && (n.childLanes |= t),
					(n = e),
					(e = e.return));
			return n.tag === 3 ? n.stateNode : null;
		}
		var At = !1;
		function Au(e) {
			e.updateQueue = {
				baseState: e.memoizedState,
				firstBaseUpdate: null,
				lastBaseUpdate: null,
				shared: { pending: null, interleaved: null, lanes: 0 },
				effects: null,
			};
		}
		function vs(e, t) {
			((e = e.updateQueue),
				t.updateQueue === e &&
					(t.updateQueue = {
						baseState: e.baseState,
						firstBaseUpdate: e.firstBaseUpdate,
						lastBaseUpdate: e.lastBaseUpdate,
						shared: e.shared,
						effects: e.effects,
					}));
		}
		function Pt(e, t) {
			return {
				eventTime: e,
				lane: t,
				tag: 0,
				payload: null,
				callback: null,
				next: null,
			};
		}
		function Vt(e, t, n) {
			var r = e.updateQueue;
			if (r === null) return null;
			if (((r = r.shared), (F & 2) !== 0)) {
				var l = r.pending;
				return (
					l === null ? (t.next = t) : ((t.next = l.next), (l.next = t)),
					(r.pending = t),
					Ct(e, n)
				);
			}
			return (
				(l = r.interleaved),
				l === null ? ((t.next = t), Uu(r)) : ((t.next = l.next), (l.next = t)),
				(r.interleaved = t),
				Ct(e, n)
			);
		}
		function tl(e, t, n) {
			if (
				((t = t.updateQueue),
				t !== null && ((t = t.shared), (n & 4194240) !== 0))
			) {
				var r = t.lanes;
				((r &= e.pendingLanes), (n |= r), (t.lanes = n), bl(e, n));
			}
		}
		function ys(e, t) {
			var n = e.updateQueue,
				r = e.alternate;
			if (r !== null && ((r = r.updateQueue), n === r)) {
				var l = null,
					u = null;
				if (((n = n.firstBaseUpdate), n !== null)) {
					do {
						var o = {
							eventTime: n.eventTime,
							lane: n.lane,
							tag: n.tag,
							payload: n.payload,
							callback: n.callback,
							next: null,
						};
						(u === null ? (l = u = o) : (u = u.next = o), (n = n.next));
					} while (n !== null);
					u === null ? (l = u = t) : (u = u.next = t);
				} else l = u = t;
				((n = {
					baseState: r.baseState,
					firstBaseUpdate: l,
					lastBaseUpdate: u,
					shared: r.shared,
					effects: r.effects,
				}),
					(e.updateQueue = n));
				return;
			}
			((e = n.lastBaseUpdate),
				e === null ? (n.firstBaseUpdate = t) : (e.next = t),
				(n.lastBaseUpdate = t));
		}
		function nl(e, t, n, r) {
			var l = e.updateQueue;
			At = !1;
			var u = l.firstBaseUpdate,
				o = l.lastBaseUpdate,
				i = l.shared.pending;
			if (i !== null) {
				l.shared.pending = null;
				var s = i,
					p = s.next;
				((s.next = null), o === null ? (u = p) : (o.next = p), (o = s));
				var y = e.alternate;
				y !== null &&
					((y = y.updateQueue),
					(i = y.lastBaseUpdate),
					i !== o &&
						(i === null ? (y.firstBaseUpdate = p) : (i.next = p),
						(y.lastBaseUpdate = s)));
			}
			if (u !== null) {
				var g = l.baseState;
				((o = 0), (y = p = s = null), (i = u));
				do {
					var v = i.lane,
						E = i.eventTime;
					if ((r & v) === v) {
						y !== null &&
							(y = y.next =
								{
									eventTime: E,
									lane: 0,
									tag: i.tag,
									payload: i.payload,
									callback: i.callback,
									next: null,
								});
						e: {
							var C = e,
								P = i;
							switch (((v = t), (E = n), P.tag)) {
								case 1:
									if (((C = P.payload), typeof C == "function")) {
										g = C.call(E, g, v);
										break e;
									}
									g = C;
									break e;
								case 3:
									C.flags = (C.flags & -65537) | 128;
								case 0:
									if (
										((C = P.payload),
										(v = typeof C == "function" ? C.call(E, g, v) : C),
										v == null)
									)
										break e;
									g = x({}, g, v);
									break e;
								case 2:
									At = !0;
							}
						}
						i.callback !== null &&
							i.lane !== 0 &&
							((e.flags |= 64),
							(v = l.effects),
							v === null ? (l.effects = [i]) : v.push(i));
					} else
						((E = {
							eventTime: E,
							lane: v,
							tag: i.tag,
							payload: i.payload,
							callback: i.callback,
							next: null,
						}),
							y === null ? ((p = y = E), (s = g)) : (y = y.next = E),
							(o |= v));
					if (((i = i.next), i === null)) {
						if (((i = l.shared.pending), i === null)) break;
						((v = i),
							(i = v.next),
							(v.next = null),
							(l.lastBaseUpdate = v),
							(l.shared.pending = null));
					}
				} while (!0);
				if (
					(y === null && (s = g),
					(l.baseState = s),
					(l.firstBaseUpdate = p),
					(l.lastBaseUpdate = y),
					(t = l.shared.interleaved),
					t !== null)
				) {
					l = t;
					do ((o |= l.lane), (l = l.next));
					while (l !== t);
				} else u === null && (l.shared.lanes = 0);
				((nn |= o), (e.lanes = o), (e.memoizedState = g));
			}
		}
		function gs(e, t, n) {
			if (((e = t.effects), (t.effects = null), e !== null))
				for (t = 0; t < e.length; t++) {
					var r = e[t],
						l = r.callback;
					if (l !== null) {
						if (((r.callback = null), (r = n), typeof l != "function"))
							throw Error(m(191, l));
						l.call(r);
					}
				}
		}
		var or = {},
			gt = jt(or),
			ir = jt(or),
			sr = jt(or);
		function en(e) {
			if (e === or) throw Error(m(174));
			return e;
		}
		function Vu(e, t) {
			switch ((Z(sr, t), Z(ir, e), Z(gt, or), (e = t.nodeType), e)) {
				case 9:
				case 11:
					t = (t = t.documentElement) ? t.namespaceURI : Bl(null, "");
					break;
				default:
					((e = e === 8 ? t.parentNode : t),
						(t = e.namespaceURI || null),
						(e = e.tagName),
						(t = Bl(t, e)));
			}
			(ee(gt), Z(gt, t));
		}
		function Nn() {
			(ee(gt), ee(ir), ee(sr));
		}
		function ws(e) {
			en(sr.current);
			var t = en(gt.current),
				n = Bl(t, e.type);
			t !== n && (Z(ir, e), Z(gt, n));
		}
		function Bu(e) {
			ir.current === e && (ee(gt), ee(ir));
		}
		var ue = jt(0);
		function rl(e) {
			for (var t = e; t !== null; ) {
				if (t.tag === 13) {
					var n = t.memoizedState;
					if (
						n !== null &&
						((n = n.dehydrated),
						n === null || n.data === "$?" || n.data === "$!")
					)
						return t;
				} else if (t.tag === 19 && t.memoizedProps.revealOrder !== void 0) {
					if ((t.flags & 128) !== 0) return t;
				} else if (t.child !== null) {
					((t.child.return = t), (t = t.child));
					continue;
				}
				if (t === e) break;
				for (; t.sibling === null; ) {
					if (t.return === null || t.return === e) return null;
					t = t.return;
				}
				((t.sibling.return = t.return), (t = t.sibling));
			}
			return null;
		}
		var $u = [];
		function Hu() {
			for (var e = 0; e < $u.length; e++)
				$u[e]._workInProgressVersionPrimary = null;
			$u.length = 0;
		}
		var ll = se.ReactCurrentDispatcher,
			Wu = se.ReactCurrentBatchConfig,
			tn = 0,
			oe = null,
			we = null,
			Ee = null,
			ul = !1,
			ar = !1,
			cr = 0,
			pf = 0;
		function Oe() {
			throw Error(m(321));
		}
		function Qu(e, t) {
			if (t === null) return !1;
			for (var n = 0; n < t.length && n < e.length; n++)
				if (!ct(e[n], t[n])) return !1;
			return !0;
		}
		function Ku(e, t, n, r, l, u) {
			if (
				((tn = u),
				(oe = t),
				(t.memoizedState = null),
				(t.updateQueue = null),
				(t.lanes = 0),
				(ll.current = e === null || e.memoizedState === null ? yf : gf),
				(e = n(r, l)),
				ar)
			) {
				u = 0;
				do {
					if (((ar = !1), (cr = 0), 25 <= u)) throw Error(m(301));
					((u += 1),
						(Ee = we = null),
						(t.updateQueue = null),
						(ll.current = wf),
						(e = n(r, l)));
				} while (ar);
			}
			if (
				((ll.current = sl),
				(t = we !== null && we.next !== null),
				(tn = 0),
				(Ee = we = oe = null),
				(ul = !1),
				t)
			)
				throw Error(m(300));
			return e;
		}
		function Yu() {
			var e = cr !== 0;
			return ((cr = 0), e);
		}
		function wt() {
			var e = {
				memoizedState: null,
				baseState: null,
				baseQueue: null,
				queue: null,
				next: null,
			};
			return (
				Ee === null ? (oe.memoizedState = Ee = e) : (Ee = Ee.next = e),
				Ee
			);
		}
		function lt() {
			if (we === null) {
				var e = oe.alternate;
				e = e !== null ? e.memoizedState : null;
			} else e = we.next;
			var t = Ee === null ? oe.memoizedState : Ee.next;
			if (t !== null) ((Ee = t), (we = e));
			else {
				if (e === null) throw Error(m(310));
				((we = e),
					(e = {
						memoizedState: we.memoizedState,
						baseState: we.baseState,
						baseQueue: we.baseQueue,
						queue: we.queue,
						next: null,
					}),
					Ee === null ? (oe.memoizedState = Ee = e) : (Ee = Ee.next = e));
			}
			return Ee;
		}
		function fr(e, t) {
			return typeof t == "function" ? t(e) : t;
		}
		function Xu(e) {
			var t = lt(),
				n = t.queue;
			if (n === null) throw Error(m(311));
			n.lastRenderedReducer = e;
			var r = we,
				l = r.baseQueue,
				u = n.pending;
			if (u !== null) {
				if (l !== null) {
					var o = l.next;
					((l.next = u.next), (u.next = o));
				}
				((r.baseQueue = l = u), (n.pending = null));
			}
			if (l !== null) {
				((u = l.next), (r = r.baseState));
				var i = (o = null),
					s = null,
					p = u;
				do {
					var y = p.lane;
					if ((tn & y) === y)
						(s !== null &&
							(s = s.next =
								{
									lane: 0,
									action: p.action,
									hasEagerState: p.hasEagerState,
									eagerState: p.eagerState,
									next: null,
								}),
							(r = p.hasEagerState ? p.eagerState : e(r, p.action)));
					else {
						var g = {
							lane: y,
							action: p.action,
							hasEagerState: p.hasEagerState,
							eagerState: p.eagerState,
							next: null,
						};
						(s === null ? ((i = s = g), (o = r)) : (s = s.next = g),
							(oe.lanes |= y),
							(nn |= y));
					}
					p = p.next;
				} while (p !== null && p !== u);
				(s === null ? (o = r) : (s.next = i),
					ct(r, t.memoizedState) || (He = !0),
					(t.memoizedState = r),
					(t.baseState = o),
					(t.baseQueue = s),
					(n.lastRenderedState = r));
			}
			if (((e = n.interleaved), e !== null)) {
				l = e;
				do ((u = l.lane), (oe.lanes |= u), (nn |= u), (l = l.next));
				while (l !== e);
			} else l === null && (n.lanes = 0);
			return [t.memoizedState, n.dispatch];
		}
		function Gu(e) {
			var t = lt(),
				n = t.queue;
			if (n === null) throw Error(m(311));
			n.lastRenderedReducer = e;
			var r = n.dispatch,
				l = n.pending,
				u = t.memoizedState;
			if (l !== null) {
				n.pending = null;
				var o = (l = l.next);
				do ((u = e(u, o.action)), (o = o.next));
				while (o !== l);
				(ct(u, t.memoizedState) || (He = !0),
					(t.memoizedState = u),
					t.baseQueue === null && (t.baseState = u),
					(n.lastRenderedState = u));
			}
			return [u, r];
		}
		function Ss() {}
		function ks(e, t) {
			var n = oe,
				r = lt(),
				l = t(),
				u = !ct(r.memoizedState, l);
			if (
				(u && ((r.memoizedState = l), (He = !0)),
				(r = r.queue),
				Zu(_s.bind(null, n, r, e), [e]),
				r.getSnapshot !== t || u || (Ee !== null && Ee.memoizedState.tag & 1))
			) {
				if (
					((n.flags |= 2048),
					dr(9, Es.bind(null, n, r, l, t), void 0, null),
					_e === null)
				)
					throw Error(m(349));
				(tn & 30) !== 0 || xs(n, t, l);
			}
			return l;
		}
		function xs(e, t, n) {
			((e.flags |= 16384),
				(e = { getSnapshot: t, value: n }),
				(t = oe.updateQueue),
				t === null
					? ((t = { lastEffect: null, stores: null }),
						(oe.updateQueue = t),
						(t.stores = [e]))
					: ((n = t.stores), n === null ? (t.stores = [e]) : n.push(e)));
		}
		function Es(e, t, n, r) {
			((t.value = n), (t.getSnapshot = r), Cs(t) && Ps(e));
		}
		function _s(e, t, n) {
			return n(function () {
				Cs(t) && Ps(e);
			});
		}
		function Cs(e) {
			var t = e.getSnapshot;
			e = e.value;
			try {
				var n = t();
				return !ct(e, n);
			} catch {
				return !0;
			}
		}
		function Ps(e) {
			var t = Ct(e, 1);
			t !== null && ht(t, e, 1, -1);
		}
		function Ns(e) {
			var t = wt();
			return (
				typeof e == "function" && (e = e()),
				(t.memoizedState = t.baseState = e),
				(e = {
					pending: null,
					interleaved: null,
					lanes: 0,
					dispatch: null,
					lastRenderedReducer: fr,
					lastRenderedState: e,
				}),
				(t.queue = e),
				(e = e.dispatch = vf.bind(null, oe, e)),
				[t.memoizedState, e]
			);
		}
		function dr(e, t, n, r) {
			return (
				(e = { tag: e, create: t, destroy: n, deps: r, next: null }),
				(t = oe.updateQueue),
				t === null
					? ((t = { lastEffect: null, stores: null }),
						(oe.updateQueue = t),
						(t.lastEffect = e.next = e))
					: ((n = t.lastEffect),
						n === null
							? (t.lastEffect = e.next = e)
							: ((r = n.next), (n.next = e), (e.next = r), (t.lastEffect = e))),
				e
			);
		}
		function zs() {
			return lt().memoizedState;
		}
		function ol(e, t, n, r) {
			var l = wt();
			((oe.flags |= e),
				(l.memoizedState = dr(1 | t, n, void 0, r === void 0 ? null : r)));
		}
		function il(e, t, n, r) {
			var l = lt();
			r = r === void 0 ? null : r;
			var u = void 0;
			if (we !== null) {
				var o = we.memoizedState;
				if (((u = o.destroy), r !== null && Qu(r, o.deps))) {
					l.memoizedState = dr(t, n, u, r);
					return;
				}
			}
			((oe.flags |= e), (l.memoizedState = dr(1 | t, n, u, r)));
		}
		function Ts(e, t) {
			return ol(8390656, 8, e, t);
		}
		function Zu(e, t) {
			return il(2048, 8, e, t);
		}
		function Rs(e, t) {
			return il(4, 2, e, t);
		}
		function Ls(e, t) {
			return il(4, 4, e, t);
		}
		function Os(e, t) {
			if (typeof t == "function")
				return (
					(e = e()),
					t(e),
					function () {
						t(null);
					}
				);
			if (t != null)
				return (
					(e = e()),
					(t.current = e),
					function () {
						t.current = null;
					}
				);
		}
		function Ds(e, t, n) {
			return (
				(n = n != null ? n.concat([e]) : null),
				il(4, 4, Os.bind(null, t, e), n)
			);
		}
		function Ju() {}
		function Is(e, t) {
			var n = lt();
			t = t === void 0 ? null : t;
			var r = n.memoizedState;
			return r !== null && t !== null && Qu(t, r[1])
				? r[0]
				: ((n.memoizedState = [e, t]), e);
		}
		function Ms(e, t) {
			var n = lt();
			t = t === void 0 ? null : t;
			var r = n.memoizedState;
			return r !== null && t !== null && Qu(t, r[1])
				? r[0]
				: ((e = e()), (n.memoizedState = [e, t]), e);
		}
		function js(e, t, n) {
			return (tn & 21) === 0
				? (e.baseState && ((e.baseState = !1), (He = !0)),
					(e.memoizedState = n))
				: (ct(n, t) ||
						((n = di()), (oe.lanes |= n), (nn |= n), (e.baseState = !0)),
					t);
		}
		function mf(e, t) {
			var n = W;
			((W = n !== 0 && 4 > n ? n : 4), e(!0));
			var r = Wu.transition;
			Wu.transition = {};
			try {
				(e(!1), t());
			} finally {
				((W = n), (Wu.transition = r));
			}
		}
		function Fs() {
			return lt().memoizedState;
		}
		function hf(e, t, n) {
			var r = Wt(e);
			if (
				((n = {
					lane: r,
					action: n,
					hasEagerState: !1,
					eagerState: null,
					next: null,
				}),
				Us(e))
			)
				As(t, n);
			else if (((n = hs(e, t, n, r)), n !== null)) {
				var l = Ue();
				(ht(n, e, r, l), Vs(n, t, r));
			}
		}
		function vf(e, t, n) {
			var r = Wt(e),
				l = {
					lane: r,
					action: n,
					hasEagerState: !1,
					eagerState: null,
					next: null,
				};
			if (Us(e)) As(t, l);
			else {
				var u = e.alternate;
				if (
					e.lanes === 0 &&
					(u === null || u.lanes === 0) &&
					((u = t.lastRenderedReducer), u !== null)
				)
					try {
						var o = t.lastRenderedState,
							i = u(o, n);
						if (((l.hasEagerState = !0), (l.eagerState = i), ct(i, o))) {
							var s = t.interleaved;
							(s === null
								? ((l.next = l), Uu(t))
								: ((l.next = s.next), (s.next = l)),
								(t.interleaved = l));
							return;
						}
					} catch {
					} finally {
					}
				((n = hs(e, t, l, r)),
					n !== null && ((l = Ue()), ht(n, e, r, l), Vs(n, t, r)));
			}
		}
		function Us(e) {
			var t = e.alternate;
			return e === oe || (t !== null && t === oe);
		}
		function As(e, t) {
			ar = ul = !0;
			var n = e.pending;
			(n === null ? (t.next = t) : ((t.next = n.next), (n.next = t)),
				(e.pending = t));
		}
		function Vs(e, t, n) {
			if ((n & 4194240) !== 0) {
				var r = t.lanes;
				((r &= e.pendingLanes), (n |= r), (t.lanes = n), bl(e, n));
			}
		}
		var sl = {
				readContext: rt,
				useCallback: Oe,
				useContext: Oe,
				useEffect: Oe,
				useImperativeHandle: Oe,
				useInsertionEffect: Oe,
				useLayoutEffect: Oe,
				useMemo: Oe,
				useReducer: Oe,
				useRef: Oe,
				useState: Oe,
				useDebugValue: Oe,
				useDeferredValue: Oe,
				useTransition: Oe,
				useMutableSource: Oe,
				useSyncExternalStore: Oe,
				useId: Oe,
				unstable_isNewReconciler: !1,
			},
			yf = {
				readContext: rt,
				useCallback: function (e, t) {
					return ((wt().memoizedState = [e, t === void 0 ? null : t]), e);
				},
				useContext: rt,
				useEffect: Ts,
				useImperativeHandle: function (e, t, n) {
					return (
						(n = n != null ? n.concat([e]) : null),
						ol(4194308, 4, Os.bind(null, t, e), n)
					);
				},
				useLayoutEffect: function (e, t) {
					return ol(4194308, 4, e, t);
				},
				useInsertionEffect: function (e, t) {
					return ol(4, 2, e, t);
				},
				useMemo: function (e, t) {
					var n = wt();
					return (
						(t = t === void 0 ? null : t),
						(e = e()),
						(n.memoizedState = [e, t]),
						e
					);
				},
				useReducer: function (e, t, n) {
					var r = wt();
					return (
						(t = n !== void 0 ? n(t) : t),
						(r.memoizedState = r.baseState = t),
						(e = {
							pending: null,
							interleaved: null,
							lanes: 0,
							dispatch: null,
							lastRenderedReducer: e,
							lastRenderedState: t,
						}),
						(r.queue = e),
						(e = e.dispatch = hf.bind(null, oe, e)),
						[r.memoizedState, e]
					);
				},
				useRef: function (e) {
					var t = wt();
					return ((e = { current: e }), (t.memoizedState = e));
				},
				useState: Ns,
				useDebugValue: Ju,
				useDeferredValue: function (e) {
					return (wt().memoizedState = e);
				},
				useTransition: function () {
					var e = Ns(!1),
						t = e[0];
					return ((e = mf.bind(null, e[1])), (wt().memoizedState = e), [t, e]);
				},
				useMutableSource: function () {},
				useSyncExternalStore: function (e, t, n) {
					var r = oe,
						l = wt();
					if (le) {
						if (n === void 0) throw Error(m(407));
						n = n();
					} else {
						if (((n = t()), _e === null)) throw Error(m(349));
						(tn & 30) !== 0 || xs(r, t, n);
					}
					l.memoizedState = n;
					var u = { value: n, getSnapshot: t };
					return (
						(l.queue = u),
						Ts(_s.bind(null, r, u, e), [e]),
						(r.flags |= 2048),
						dr(9, Es.bind(null, r, u, n, t), void 0, null),
						n
					);
				},
				useId: function () {
					var e = wt(),
						t = _e.identifierPrefix;
					if (le) {
						var n = _t,
							r = Et;
						((n = (r & ~(1 << (32 - at(r) - 1))).toString(32) + n),
							(t = ":" + t + "R" + n),
							(n = cr++),
							0 < n && (t += "H" + n.toString(32)),
							(t += ":"));
					} else ((n = pf++), (t = ":" + t + "r" + n.toString(32) + ":"));
					return (e.memoizedState = t);
				},
				unstable_isNewReconciler: !1,
			},
			gf = {
				readContext: rt,
				useCallback: Is,
				useContext: rt,
				useEffect: Zu,
				useImperativeHandle: Ds,
				useInsertionEffect: Rs,
				useLayoutEffect: Ls,
				useMemo: Ms,
				useReducer: Xu,
				useRef: zs,
				useState: function () {
					return Xu(fr);
				},
				useDebugValue: Ju,
				useDeferredValue: function (e) {
					var t = lt();
					return js(t, we.memoizedState, e);
				},
				useTransition: function () {
					var e = Xu(fr)[0],
						t = lt().memoizedState;
					return [e, t];
				},
				useMutableSource: Ss,
				useSyncExternalStore: ks,
				useId: Fs,
				unstable_isNewReconciler: !1,
			},
			wf = {
				readContext: rt,
				useCallback: Is,
				useContext: rt,
				useEffect: Zu,
				useImperativeHandle: Ds,
				useInsertionEffect: Rs,
				useLayoutEffect: Ls,
				useMemo: Ms,
				useReducer: Gu,
				useRef: zs,
				useState: function () {
					return Gu(fr);
				},
				useDebugValue: Ju,
				useDeferredValue: function (e) {
					var t = lt();
					return we === null
						? (t.memoizedState = e)
						: js(t, we.memoizedState, e);
				},
				useTransition: function () {
					var e = Gu(fr)[0],
						t = lt().memoizedState;
					return [e, t];
				},
				useMutableSource: Ss,
				useSyncExternalStore: ks,
				useId: Fs,
				unstable_isNewReconciler: !1,
			};
		function dt(e, t) {
			if (e && e.defaultProps) {
				((t = x({}, t)), (e = e.defaultProps));
				for (var n in e) t[n] === void 0 && (t[n] = e[n]);
				return t;
			}
			return t;
		}
		function qu(e, t, n, r) {
			((t = e.memoizedState),
				(n = n(r, t)),
				(n = n == null ? t : x({}, t, n)),
				(e.memoizedState = n),
				e.lanes === 0 && (e.updateQueue.baseState = n));
		}
		var al = {
			isMounted: function (e) {
				return (e = e._reactInternals) ? Xt(e) === e : !1;
			},
			enqueueSetState: function (e, t, n) {
				e = e._reactInternals;
				var r = Ue(),
					l = Wt(e),
					u = Pt(r, l);
				((u.payload = t),
					n != null && (u.callback = n),
					(t = Vt(e, u, l)),
					t !== null && (ht(t, e, l, r), tl(t, e, l)));
			},
			enqueueReplaceState: function (e, t, n) {
				e = e._reactInternals;
				var r = Ue(),
					l = Wt(e),
					u = Pt(r, l);
				((u.tag = 1),
					(u.payload = t),
					n != null && (u.callback = n),
					(t = Vt(e, u, l)),
					t !== null && (ht(t, e, l, r), tl(t, e, l)));
			},
			enqueueForceUpdate: function (e, t) {
				e = e._reactInternals;
				var n = Ue(),
					r = Wt(e),
					l = Pt(n, r);
				((l.tag = 2),
					t != null && (l.callback = t),
					(t = Vt(e, l, r)),
					t !== null && (ht(t, e, r, n), tl(t, e, r)));
			},
		};
		function Bs(e, t, n, r, l, u, o) {
			return (
				(e = e.stateNode),
				typeof e.shouldComponentUpdate == "function"
					? e.shouldComponentUpdate(r, u, o)
					: t.prototype && t.prototype.isPureReactComponent
						? !qn(n, r) || !qn(l, u)
						: !0
			);
		}
		function $s(e, t, n) {
			var r = !1,
				l = Ft,
				u = t.contextType;
			return (
				typeof u == "object" && u !== null
					? (u = rt(u))
					: ((l = $e(t) ? Zt : Le.current),
						(r = t.contextTypes),
						(u = (r = r != null) ? Sn(e, l) : Ft)),
				(t = new t(n, u)),
				(e.memoizedState =
					t.state !== null && t.state !== void 0 ? t.state : null),
				(t.updater = al),
				(e.stateNode = t),
				(t._reactInternals = e),
				r &&
					((e = e.stateNode),
					(e.__reactInternalMemoizedUnmaskedChildContext = l),
					(e.__reactInternalMemoizedMaskedChildContext = u)),
				t
			);
		}
		function Hs(e, t, n, r) {
			((e = t.state),
				typeof t.componentWillReceiveProps == "function" &&
					t.componentWillReceiveProps(n, r),
				typeof t.UNSAFE_componentWillReceiveProps == "function" &&
					t.UNSAFE_componentWillReceiveProps(n, r),
				t.state !== e && al.enqueueReplaceState(t, t.state, null));
		}
		function bu(e, t, n, r) {
			var l = e.stateNode;
			((l.props = n), (l.state = e.memoizedState), (l.refs = {}), Au(e));
			var u = t.contextType;
			(typeof u == "object" && u !== null
				? (l.context = rt(u))
				: ((u = $e(t) ? Zt : Le.current), (l.context = Sn(e, u))),
				(l.state = e.memoizedState),
				(u = t.getDerivedStateFromProps),
				typeof u == "function" && (qu(e, t, u, n), (l.state = e.memoizedState)),
				typeof t.getDerivedStateFromProps == "function" ||
					typeof l.getSnapshotBeforeUpdate == "function" ||
					(typeof l.UNSAFE_componentWillMount != "function" &&
						typeof l.componentWillMount != "function") ||
					((t = l.state),
					typeof l.componentWillMount == "function" && l.componentWillMount(),
					typeof l.UNSAFE_componentWillMount == "function" &&
						l.UNSAFE_componentWillMount(),
					t !== l.state && al.enqueueReplaceState(l, l.state, null),
					nl(e, n, l, r),
					(l.state = e.memoizedState)),
				typeof l.componentDidMount == "function" && (e.flags |= 4194308));
		}
		function zn(e, t) {
			try {
				var n = "",
					r = t;
				do ((n += U(r)), (r = r.return));
				while (r);
				var l = n;
			} catch (u) {
				l =
					`
Error generating stack: ` +
					u.message +
					`
` +
					u.stack;
			}
			return { value: e, source: t, stack: l, digest: null };
		}
		function eo(e, t, n) {
			return { value: e, source: null, stack: n ?? null, digest: t ?? null };
		}
		function to(e, t) {
			try {
				console.error(t.value);
			} catch (n) {
				setTimeout(function () {
					throw n;
				});
			}
		}
		var Sf = typeof WeakMap == "function" ? WeakMap : Map;
		function Ws(e, t, n) {
			((n = Pt(-1, n)), (n.tag = 3), (n.payload = { element: null }));
			var r = t.value;
			return (
				(n.callback = function () {
					(vl || ((vl = !0), (yo = r)), to(e, t));
				}),
				n
			);
		}
		function Qs(e, t, n) {
			((n = Pt(-1, n)), (n.tag = 3));
			var r = e.type.getDerivedStateFromError;
			if (typeof r == "function") {
				var l = t.value;
				((n.payload = function () {
					return r(l);
				}),
					(n.callback = function () {
						to(e, t);
					}));
			}
			var u = e.stateNode;
			return (
				u !== null &&
					typeof u.componentDidCatch == "function" &&
					(n.callback = function () {
						(to(e, t),
							typeof r != "function" &&
								($t === null ? ($t = new Set([this])) : $t.add(this)));
						var o = t.stack;
						this.componentDidCatch(t.value, {
							componentStack: o !== null ? o : "",
						});
					}),
				n
			);
		}
		function Ks(e, t, n) {
			var r = e.pingCache;
			if (r === null) {
				r = e.pingCache = new Sf();
				var l = new Set();
				r.set(t, l);
			} else ((l = r.get(t)), l === void 0 && ((l = new Set()), r.set(t, l)));
			l.has(n) || (l.add(n), (e = If.bind(null, e, t, n)), t.then(e, e));
		}
		function Ys(e) {
			do {
				var t;
				if (
					((t = e.tag === 13) &&
						((t = e.memoizedState),
						(t = t !== null ? t.dehydrated !== null : !0)),
					t)
				)
					return e;
				e = e.return;
			} while (e !== null);
			return null;
		}
		function Xs(e, t, n, r, l) {
			return (e.mode & 1) === 0
				? (e === t
						? (e.flags |= 65536)
						: ((e.flags |= 128),
							(n.flags |= 131072),
							(n.flags &= -52805),
							n.tag === 1 &&
								(n.alternate === null
									? (n.tag = 17)
									: ((t = Pt(-1, 1)), (t.tag = 2), Vt(n, t, 1))),
							(n.lanes |= 1)),
					e)
				: ((e.flags |= 65536), (e.lanes = l), e);
		}
		var kf = se.ReactCurrentOwner,
			He = !1;
		function Fe(e, t, n, r) {
			t.child = e === null ? ms(t, null, n, r) : _n(t, e.child, n, r);
		}
		function Gs(e, t, n, r, l) {
			n = n.render;
			var u = t.ref;
			return (
				Pn(t, l),
				(r = Ku(e, t, n, r, u, l)),
				(n = Yu()),
				e !== null && !He
					? ((t.updateQueue = e.updateQueue),
						(t.flags &= -2053),
						(e.lanes &= ~l),
						Nt(e, t, l))
					: (le && n && Tu(t), (t.flags |= 1), Fe(e, t, r, l), t.child)
			);
		}
		function Zs(e, t, n, r, l) {
			if (e === null) {
				var u = n.type;
				return typeof u == "function" &&
					!_o(u) &&
					u.defaultProps === void 0 &&
					n.compare === null &&
					n.defaultProps === void 0
					? ((t.tag = 15), (t.type = u), Js(e, t, u, r, l))
					: ((e = xl(n.type, null, r, t, t.mode, l)),
						(e.ref = t.ref),
						(e.return = t),
						(t.child = e));
			}
			if (((u = e.child), (e.lanes & l) === 0)) {
				var o = u.memoizedProps;
				if (
					((n = n.compare),
					(n = n !== null ? n : qn),
					n(o, r) && e.ref === t.ref)
				)
					return Nt(e, t, l);
			}
			return (
				(t.flags |= 1),
				(e = Kt(u, r)),
				(e.ref = t.ref),
				(e.return = t),
				(t.child = e)
			);
		}
		function Js(e, t, n, r, l) {
			if (e !== null) {
				var u = e.memoizedProps;
				if (qn(u, r) && e.ref === t.ref)
					if (((He = !1), (t.pendingProps = r = u), (e.lanes & l) !== 0))
						(e.flags & 131072) !== 0 && (He = !0);
					else return ((t.lanes = e.lanes), Nt(e, t, l));
			}
			return no(e, t, n, r, l);
		}
		function qs(e, t, n) {
			var r = t.pendingProps,
				l = r.children,
				u = e !== null ? e.memoizedState : null;
			if (r.mode === "hidden")
				if ((t.mode & 1) === 0)
					((t.memoizedState = {
						baseLanes: 0,
						cachePool: null,
						transitions: null,
					}),
						Z(Rn, qe),
						(qe |= n));
				else {
					if ((n & 1073741824) === 0)
						return (
							(e = u !== null ? u.baseLanes | n : n),
							(t.lanes = t.childLanes = 1073741824),
							(t.memoizedState = {
								baseLanes: e,
								cachePool: null,
								transitions: null,
							}),
							(t.updateQueue = null),
							Z(Rn, qe),
							(qe |= e),
							null
						);
					((t.memoizedState = {
						baseLanes: 0,
						cachePool: null,
						transitions: null,
					}),
						(r = u !== null ? u.baseLanes : n),
						Z(Rn, qe),
						(qe |= r));
				}
			else
				(u !== null
					? ((r = u.baseLanes | n), (t.memoizedState = null))
					: (r = n),
					Z(Rn, qe),
					(qe |= r));
			return (Fe(e, t, l, n), t.child);
		}
		function bs(e, t) {
			var n = t.ref;
			((e === null && n !== null) || (e !== null && e.ref !== n)) &&
				((t.flags |= 512), (t.flags |= 2097152));
		}
		function no(e, t, n, r, l) {
			var u = $e(n) ? Zt : Le.current;
			return (
				(u = Sn(t, u)),
				Pn(t, l),
				(n = Ku(e, t, n, r, u, l)),
				(r = Yu()),
				e !== null && !He
					? ((t.updateQueue = e.updateQueue),
						(t.flags &= -2053),
						(e.lanes &= ~l),
						Nt(e, t, l))
					: (le && r && Tu(t), (t.flags |= 1), Fe(e, t, n, l), t.child)
			);
		}
		function ea(e, t, n, r, l) {
			if ($e(n)) {
				var u = !0;
				Yr(t);
			} else u = !1;
			if ((Pn(t, l), t.stateNode === null))
				(fl(e, t), $s(t, n, r), bu(t, n, r, l), (r = !0));
			else if (e === null) {
				var o = t.stateNode,
					i = t.memoizedProps;
				o.props = i;
				var s = o.context,
					p = n.contextType;
				typeof p == "object" && p !== null
					? (p = rt(p))
					: ((p = $e(n) ? Zt : Le.current), (p = Sn(t, p)));
				var y = n.getDerivedStateFromProps,
					g =
						typeof y == "function" ||
						typeof o.getSnapshotBeforeUpdate == "function";
				(g ||
					(typeof o.UNSAFE_componentWillReceiveProps != "function" &&
						typeof o.componentWillReceiveProps != "function") ||
					((i !== r || s !== p) && Hs(t, o, r, p)),
					(At = !1));
				var v = t.memoizedState;
				((o.state = v),
					nl(t, r, o, l),
					(s = t.memoizedState),
					i !== r || v !== s || Be.current || At
						? (typeof y == "function" &&
								(qu(t, n, y, r), (s = t.memoizedState)),
							(i = At || Bs(t, n, i, r, v, s, p))
								? (g ||
										(typeof o.UNSAFE_componentWillMount != "function" &&
											typeof o.componentWillMount != "function") ||
										(typeof o.componentWillMount == "function" &&
											o.componentWillMount(),
										typeof o.UNSAFE_componentWillMount == "function" &&
											o.UNSAFE_componentWillMount()),
									typeof o.componentDidMount == "function" &&
										(t.flags |= 4194308))
								: (typeof o.componentDidMount == "function" &&
										(t.flags |= 4194308),
									(t.memoizedProps = r),
									(t.memoizedState = s)),
							(o.props = r),
							(o.state = s),
							(o.context = p),
							(r = i))
						: (typeof o.componentDidMount == "function" && (t.flags |= 4194308),
							(r = !1)));
			} else {
				((o = t.stateNode),
					vs(e, t),
					(i = t.memoizedProps),
					(p = t.type === t.elementType ? i : dt(t.type, i)),
					(o.props = p),
					(g = t.pendingProps),
					(v = o.context),
					(s = n.contextType),
					typeof s == "object" && s !== null
						? (s = rt(s))
						: ((s = $e(n) ? Zt : Le.current), (s = Sn(t, s))));
				var E = n.getDerivedStateFromProps;
				((y =
					typeof E == "function" ||
					typeof o.getSnapshotBeforeUpdate == "function") ||
					(typeof o.UNSAFE_componentWillReceiveProps != "function" &&
						typeof o.componentWillReceiveProps != "function") ||
					((i !== g || v !== s) && Hs(t, o, r, s)),
					(At = !1),
					(v = t.memoizedState),
					(o.state = v),
					nl(t, r, o, l));
				var C = t.memoizedState;
				i !== g || v !== C || Be.current || At
					? (typeof E == "function" && (qu(t, n, E, r), (C = t.memoizedState)),
						(p = At || Bs(t, n, p, r, v, C, s) || !1)
							? (y ||
									(typeof o.UNSAFE_componentWillUpdate != "function" &&
										typeof o.componentWillUpdate != "function") ||
									(typeof o.componentWillUpdate == "function" &&
										o.componentWillUpdate(r, C, s),
									typeof o.UNSAFE_componentWillUpdate == "function" &&
										o.UNSAFE_componentWillUpdate(r, C, s)),
								typeof o.componentDidUpdate == "function" && (t.flags |= 4),
								typeof o.getSnapshotBeforeUpdate == "function" &&
									(t.flags |= 1024))
							: (typeof o.componentDidUpdate != "function" ||
									(i === e.memoizedProps && v === e.memoizedState) ||
									(t.flags |= 4),
								typeof o.getSnapshotBeforeUpdate != "function" ||
									(i === e.memoizedProps && v === e.memoizedState) ||
									(t.flags |= 1024),
								(t.memoizedProps = r),
								(t.memoizedState = C)),
						(o.props = r),
						(o.state = C),
						(o.context = s),
						(r = p))
					: (typeof o.componentDidUpdate != "function" ||
							(i === e.memoizedProps && v === e.memoizedState) ||
							(t.flags |= 4),
						typeof o.getSnapshotBeforeUpdate != "function" ||
							(i === e.memoizedProps && v === e.memoizedState) ||
							(t.flags |= 1024),
						(r = !1));
			}
			return ro(e, t, n, r, u, l);
		}
		function ro(e, t, n, r, l, u) {
			bs(e, t);
			var o = (t.flags & 128) !== 0;
			if (!r && !o) return (l && us(t, n, !1), Nt(e, t, u));
			((r = t.stateNode), (kf.current = t));
			var i =
				o && typeof n.getDerivedStateFromError != "function"
					? null
					: r.render();
			return (
				(t.flags |= 1),
				e !== null && o
					? ((t.child = _n(t, e.child, null, u)), (t.child = _n(t, null, i, u)))
					: Fe(e, t, i, u),
				(t.memoizedState = r.state),
				l && us(t, n, !0),
				t.child
			);
		}
		function ta(e) {
			var t = e.stateNode;
			(t.pendingContext
				? rs(e, t.pendingContext, t.pendingContext !== t.context)
				: t.context && rs(e, t.context, !1),
				Vu(e, t.containerInfo));
		}
		function na(e, t, n, r, l) {
			return (En(), Du(l), (t.flags |= 256), Fe(e, t, n, r), t.child);
		}
		var lo = { dehydrated: null, treeContext: null, retryLane: 0 };
		function uo(e) {
			return { baseLanes: e, cachePool: null, transitions: null };
		}
		function ra(e, t, n) {
			var r = t.pendingProps,
				l = ue.current,
				u = !1,
				o = (t.flags & 128) !== 0,
				i;
			if (
				((i = o) ||
					(i = e !== null && e.memoizedState === null ? !1 : (l & 2) !== 0),
				i
					? ((u = !0), (t.flags &= -129))
					: (e === null || e.memoizedState !== null) && (l |= 1),
				Z(ue, l & 1),
				e === null)
			)
				return (
					Ou(t),
					(e = t.memoizedState),
					e !== null && ((e = e.dehydrated), e !== null)
						? ((t.mode & 1) === 0
								? (t.lanes = 1)
								: e.data === "$!"
									? (t.lanes = 8)
									: (t.lanes = 1073741824),
							null)
						: ((o = r.children),
							(e = r.fallback),
							u
								? ((r = t.mode),
									(u = t.child),
									(o = { mode: "hidden", children: o }),
									(r & 1) === 0 && u !== null
										? ((u.childLanes = 0), (u.pendingProps = o))
										: (u = El(o, r, 0, null)),
									(e = on(e, r, n, null)),
									(u.return = t),
									(e.return = t),
									(u.sibling = e),
									(t.child = u),
									(t.child.memoizedState = uo(n)),
									(t.memoizedState = lo),
									e)
								: oo(t, o))
				);
			if (
				((l = e.memoizedState), l !== null && ((i = l.dehydrated), i !== null))
			)
				return xf(e, t, o, r, i, l, n);
			if (u) {
				((u = r.fallback), (o = t.mode), (l = e.child), (i = l.sibling));
				var s = { mode: "hidden", children: r.children };
				return (
					(o & 1) === 0 && t.child !== l
						? ((r = t.child),
							(r.childLanes = 0),
							(r.pendingProps = s),
							(t.deletions = null))
						: ((r = Kt(l, s)), (r.subtreeFlags = l.subtreeFlags & 14680064)),
					i !== null
						? (u = Kt(i, u))
						: ((u = on(u, o, n, null)), (u.flags |= 2)),
					(u.return = t),
					(r.return = t),
					(r.sibling = u),
					(t.child = r),
					(r = u),
					(u = t.child),
					(o = e.child.memoizedState),
					(o =
						o === null
							? uo(n)
							: {
									baseLanes: o.baseLanes | n,
									cachePool: null,
									transitions: o.transitions,
								}),
					(u.memoizedState = o),
					(u.childLanes = e.childLanes & ~n),
					(t.memoizedState = lo),
					r
				);
			}
			return (
				(u = e.child),
				(e = u.sibling),
				(r = Kt(u, { mode: "visible", children: r.children })),
				(t.mode & 1) === 0 && (r.lanes = n),
				(r.return = t),
				(r.sibling = null),
				e !== null &&
					((n = t.deletions),
					n === null ? ((t.deletions = [e]), (t.flags |= 16)) : n.push(e)),
				(t.child = r),
				(t.memoizedState = null),
				r
			);
		}
		function oo(e, t) {
			return (
				(t = El({ mode: "visible", children: t }, e.mode, 0, null)),
				(t.return = e),
				(e.child = t)
			);
		}
		function cl(e, t, n, r) {
			return (
				r !== null && Du(r),
				_n(t, e.child, null, n),
				(e = oo(t, t.pendingProps.children)),
				(e.flags |= 2),
				(t.memoizedState = null),
				e
			);
		}
		function xf(e, t, n, r, l, u, o) {
			if (n)
				return t.flags & 256
					? ((t.flags &= -257), (r = eo(Error(m(422)))), cl(e, t, o, r))
					: t.memoizedState !== null
						? ((t.child = e.child), (t.flags |= 128), null)
						: ((u = r.fallback),
							(l = t.mode),
							(r = El({ mode: "visible", children: r.children }, l, 0, null)),
							(u = on(u, l, o, null)),
							(u.flags |= 2),
							(r.return = t),
							(u.return = t),
							(r.sibling = u),
							(t.child = r),
							(t.mode & 1) !== 0 && _n(t, e.child, null, o),
							(t.child.memoizedState = uo(o)),
							(t.memoizedState = lo),
							u);
			if ((t.mode & 1) === 0) return cl(e, t, o, null);
			if (l.data === "$!") {
				if (((r = l.nextSibling && l.nextSibling.dataset), r)) var i = r.dgst;
				return (
					(r = i),
					(u = Error(m(419))),
					(r = eo(u, r, void 0)),
					cl(e, t, o, r)
				);
			}
			if (((i = (o & e.childLanes) !== 0), He || i)) {
				if (((r = _e), r !== null)) {
					switch (o & -o) {
						case 4:
							l = 2;
							break;
						case 16:
							l = 8;
							break;
						case 64:
						case 128:
						case 256:
						case 512:
						case 1024:
						case 2048:
						case 4096:
						case 8192:
						case 16384:
						case 32768:
						case 65536:
						case 131072:
						case 262144:
						case 524288:
						case 1048576:
						case 2097152:
						case 4194304:
						case 8388608:
						case 16777216:
						case 33554432:
						case 67108864:
							l = 32;
							break;
						case 536870912:
							l = 268435456;
							break;
						default:
							l = 0;
					}
					((l = (l & (r.suspendedLanes | o)) !== 0 ? 0 : l),
						l !== 0 &&
							l !== u.retryLane &&
							((u.retryLane = l), Ct(e, l), ht(r, e, l, -1)));
				}
				return (Eo(), (r = eo(Error(m(421)))), cl(e, t, o, r));
			}
			return l.data === "$?"
				? ((t.flags |= 128),
					(t.child = e.child),
					(t = Mf.bind(null, e)),
					(l._reactRetry = t),
					null)
				: ((e = u.treeContext),
					(Je = Mt(l.nextSibling)),
					(Ze = t),
					(le = !0),
					(ft = null),
					e !== null &&
						((tt[nt++] = Et),
						(tt[nt++] = _t),
						(tt[nt++] = Jt),
						(Et = e.id),
						(_t = e.overflow),
						(Jt = t)),
					(t = oo(t, r.children)),
					(t.flags |= 4096),
					t);
		}
		function la(e, t, n) {
			e.lanes |= t;
			var r = e.alternate;
			(r !== null && (r.lanes |= t), Fu(e.return, t, n));
		}
		function io(e, t, n, r, l) {
			var u = e.memoizedState;
			u === null
				? (e.memoizedState = {
						isBackwards: t,
						rendering: null,
						renderingStartTime: 0,
						last: r,
						tail: n,
						tailMode: l,
					})
				: ((u.isBackwards = t),
					(u.rendering = null),
					(u.renderingStartTime = 0),
					(u.last = r),
					(u.tail = n),
					(u.tailMode = l));
		}
		function ua(e, t, n) {
			var r = t.pendingProps,
				l = r.revealOrder,
				u = r.tail;
			if ((Fe(e, t, r.children, n), (r = ue.current), (r & 2) !== 0))
				((r = (r & 1) | 2), (t.flags |= 128));
			else {
				if (e !== null && (e.flags & 128) !== 0)
					e: for (e = t.child; e !== null; ) {
						if (e.tag === 13) e.memoizedState !== null && la(e, n, t);
						else if (e.tag === 19) la(e, n, t);
						else if (e.child !== null) {
							((e.child.return = e), (e = e.child));
							continue;
						}
						if (e === t) break e;
						for (; e.sibling === null; ) {
							if (e.return === null || e.return === t) break e;
							e = e.return;
						}
						((e.sibling.return = e.return), (e = e.sibling));
					}
				r &= 1;
			}
			if ((Z(ue, r), (t.mode & 1) === 0)) t.memoizedState = null;
			else
				switch (l) {
					case "forwards":
						for (n = t.child, l = null; n !== null; )
							((e = n.alternate),
								e !== null && rl(e) === null && (l = n),
								(n = n.sibling));
						((n = l),
							n === null
								? ((l = t.child), (t.child = null))
								: ((l = n.sibling), (n.sibling = null)),
							io(t, !1, l, n, u));
						break;
					case "backwards":
						for (n = null, l = t.child, t.child = null; l !== null; ) {
							if (((e = l.alternate), e !== null && rl(e) === null)) {
								t.child = l;
								break;
							}
							((e = l.sibling), (l.sibling = n), (n = l), (l = e));
						}
						io(t, !0, n, null, u);
						break;
					case "together":
						io(t, !1, null, null, void 0);
						break;
					default:
						t.memoizedState = null;
				}
			return t.child;
		}
		function fl(e, t) {
			(t.mode & 1) === 0 &&
				e !== null &&
				((e.alternate = null), (t.alternate = null), (t.flags |= 2));
		}
		function Nt(e, t, n) {
			if (
				(e !== null && (t.dependencies = e.dependencies),
				(nn |= t.lanes),
				(n & t.childLanes) === 0)
			)
				return null;
			if (e !== null && t.child !== e.child) throw Error(m(153));
			if (t.child !== null) {
				for (
					e = t.child, n = Kt(e, e.pendingProps), t.child = n, n.return = t;
					e.sibling !== null;

				)
					((e = e.sibling),
						(n = n.sibling = Kt(e, e.pendingProps)),
						(n.return = t));
				n.sibling = null;
			}
			return t.child;
		}
		function Ef(e, t, n) {
			switch (t.tag) {
				case 3:
					(ta(t), En());
					break;
				case 5:
					ws(t);
					break;
				case 1:
					$e(t.type) && Yr(t);
					break;
				case 4:
					Vu(t, t.stateNode.containerInfo);
					break;
				case 10:
					var r = t.type._context,
						l = t.memoizedProps.value;
					(Z(br, r._currentValue), (r._currentValue = l));
					break;
				case 13:
					if (((r = t.memoizedState), r !== null))
						return r.dehydrated !== null
							? (Z(ue, ue.current & 1), (t.flags |= 128), null)
							: (n & t.child.childLanes) !== 0
								? ra(e, t, n)
								: (Z(ue, ue.current & 1),
									(e = Nt(e, t, n)),
									e !== null ? e.sibling : null);
					Z(ue, ue.current & 1);
					break;
				case 19:
					if (((r = (n & t.childLanes) !== 0), (e.flags & 128) !== 0)) {
						if (r) return ua(e, t, n);
						t.flags |= 128;
					}
					if (
						((l = t.memoizedState),
						l !== null &&
							((l.rendering = null), (l.tail = null), (l.lastEffect = null)),
						Z(ue, ue.current),
						r)
					)
						break;
					return null;
				case 22:
				case 23:
					return ((t.lanes = 0), qs(e, t, n));
			}
			return Nt(e, t, n);
		}
		var oa, so, ia, sa;
		((oa = function (e, t) {
			for (var n = t.child; n !== null; ) {
				if (n.tag === 5 || n.tag === 6) e.appendChild(n.stateNode);
				else if (n.tag !== 4 && n.child !== null) {
					((n.child.return = n), (n = n.child));
					continue;
				}
				if (n === t) break;
				for (; n.sibling === null; ) {
					if (n.return === null || n.return === t) return;
					n = n.return;
				}
				((n.sibling.return = n.return), (n = n.sibling));
			}
		}),
			(so = function () {}),
			(ia = function (e, t, n, r) {
				var l = e.memoizedProps;
				if (l !== r) {
					((e = t.stateNode), en(gt.current));
					var u = null;
					switch (n) {
						case "input":
							((l = Fl(e, l)), (r = Fl(e, r)), (u = []));
							break;
						case "select":
							((l = x({}, l, { value: void 0 })),
								(r = x({}, r, { value: void 0 })),
								(u = []));
							break;
						case "textarea":
							((l = Vl(e, l)), (r = Vl(e, r)), (u = []));
							break;
						default:
							typeof l.onClick != "function" &&
								typeof r.onClick == "function" &&
								(e.onclick = Wr);
					}
					$l(n, r);
					var o;
					n = null;
					for (p in l)
						if (!r.hasOwnProperty(p) && l.hasOwnProperty(p) && l[p] != null)
							if (p === "style") {
								var i = l[p];
								for (o in i)
									i.hasOwnProperty(o) && (n || (n = {}), (n[o] = ""));
							} else
								p !== "dangerouslySetInnerHTML" &&
									p !== "children" &&
									p !== "suppressContentEditableWarning" &&
									p !== "suppressHydrationWarning" &&
									p !== "autoFocus" &&
									(ye.hasOwnProperty(p)
										? u || (u = [])
										: (u = u || []).push(p, null));
					for (p in r) {
						var s = r[p];
						if (
							((i = l != null ? l[p] : void 0),
							r.hasOwnProperty(p) && s !== i && (s != null || i != null))
						)
							if (p === "style")
								if (i) {
									for (o in i)
										!i.hasOwnProperty(o) ||
											(s && s.hasOwnProperty(o)) ||
											(n || (n = {}), (n[o] = ""));
									for (o in s)
										s.hasOwnProperty(o) &&
											i[o] !== s[o] &&
											(n || (n = {}), (n[o] = s[o]));
								} else (n || (u || (u = []), u.push(p, n)), (n = s));
							else
								p === "dangerouslySetInnerHTML"
									? ((s = s ? s.__html : void 0),
										(i = i ? i.__html : void 0),
										s != null && i !== s && (u = u || []).push(p, s))
									: p === "children"
										? (typeof s != "string" && typeof s != "number") ||
											(u = u || []).push(p, "" + s)
										: p !== "suppressContentEditableWarning" &&
											p !== "suppressHydrationWarning" &&
											(ye.hasOwnProperty(p)
												? (s != null && p === "onScroll" && b("scroll", e),
													u || i === s || (u = []))
												: (u = u || []).push(p, s));
					}
					n && (u = u || []).push("style", n);
					var p = u;
					(t.updateQueue = p) && (t.flags |= 4);
				}
			}),
			(sa = function (e, t, n, r) {
				n !== r && (t.flags |= 4);
			}));
		function pr(e, t) {
			if (!le)
				switch (e.tailMode) {
					case "hidden":
						t = e.tail;
						for (var n = null; t !== null; )
							(t.alternate !== null && (n = t), (t = t.sibling));
						n === null ? (e.tail = null) : (n.sibling = null);
						break;
					case "collapsed":
						n = e.tail;
						for (var r = null; n !== null; )
							(n.alternate !== null && (r = n), (n = n.sibling));
						r === null
							? t || e.tail === null
								? (e.tail = null)
								: (e.tail.sibling = null)
							: (r.sibling = null);
				}
		}
		function De(e) {
			var t = e.alternate !== null && e.alternate.child === e.child,
				n = 0,
				r = 0;
			if (t)
				for (var l = e.child; l !== null; )
					((n |= l.lanes | l.childLanes),
						(r |= l.subtreeFlags & 14680064),
						(r |= l.flags & 14680064),
						(l.return = e),
						(l = l.sibling));
			else
				for (l = e.child; l !== null; )
					((n |= l.lanes | l.childLanes),
						(r |= l.subtreeFlags),
						(r |= l.flags),
						(l.return = e),
						(l = l.sibling));
			return ((e.subtreeFlags |= r), (e.childLanes = n), t);
		}
		function _f(e, t, n) {
			var r = t.pendingProps;
			switch ((Ru(t), t.tag)) {
				case 2:
				case 16:
				case 15:
				case 0:
				case 11:
				case 7:
				case 8:
				case 12:
				case 9:
				case 14:
					return (De(t), null);
				case 1:
					return ($e(t.type) && Kr(), De(t), null);
				case 3:
					return (
						(r = t.stateNode),
						Nn(),
						ee(Be),
						ee(Le),
						Hu(),
						r.pendingContext &&
							((r.context = r.pendingContext), (r.pendingContext = null)),
						(e === null || e.child === null) &&
							(Jr(t)
								? (t.flags |= 4)
								: e === null ||
									(e.memoizedState.isDehydrated && (t.flags & 256) === 0) ||
									((t.flags |= 1024), ft !== null && (So(ft), (ft = null)))),
						so(e, t),
						De(t),
						null
					);
				case 5:
					Bu(t);
					var l = en(sr.current);
					if (((n = t.type), e !== null && t.stateNode != null))
						(ia(e, t, n, r, l),
							e.ref !== t.ref && ((t.flags |= 512), (t.flags |= 2097152)));
					else {
						if (!r) {
							if (t.stateNode === null) throw Error(m(166));
							return (De(t), null);
						}
						if (((e = en(gt.current)), Jr(t))) {
							((r = t.stateNode), (n = t.type));
							var u = t.memoizedProps;
							switch (((r[yt] = t), (r[rr] = u), (e = (t.mode & 1) !== 0), n)) {
								case "dialog":
									(b("cancel", r), b("close", r));
									break;
								case "iframe":
								case "object":
								case "embed":
									b("load", r);
									break;
								case "video":
								case "audio":
									for (l = 0; l < er.length; l++) b(er[l], r);
									break;
								case "source":
									b("error", r);
									break;
								case "img":
								case "image":
								case "link":
									(b("error", r), b("load", r));
									break;
								case "details":
									b("toggle", r);
									break;
								case "input":
									($o(r, u), b("invalid", r));
									break;
								case "select":
									((r._wrapperState = { wasMultiple: !!u.multiple }),
										b("invalid", r));
									break;
								case "textarea":
									(Qo(r, u), b("invalid", r));
							}
							($l(n, u), (l = null));
							for (var o in u)
								if (u.hasOwnProperty(o)) {
									var i = u[o];
									o === "children"
										? typeof i == "string"
											? r.textContent !== i &&
												(u.suppressHydrationWarning !== !0 &&
													Hr(r.textContent, i, e),
												(l = ["children", i]))
											: typeof i == "number" &&
												r.textContent !== "" + i &&
												(u.suppressHydrationWarning !== !0 &&
													Hr(r.textContent, i, e),
												(l = ["children", "" + i]))
										: ye.hasOwnProperty(o) &&
											i != null &&
											o === "onScroll" &&
											b("scroll", r);
								}
							switch (n) {
								case "input":
									(Sr(r), Wo(r, u, !0));
									break;
								case "textarea":
									(Sr(r), Yo(r));
									break;
								case "select":
								case "option":
									break;
								default:
									typeof u.onClick == "function" && (r.onclick = Wr);
							}
							((r = l), (t.updateQueue = r), r !== null && (t.flags |= 4));
						} else {
							((o = l.nodeType === 9 ? l : l.ownerDocument),
								e === "http://www.w3.org/1999/xhtml" && (e = Xo(n)),
								e === "http://www.w3.org/1999/xhtml"
									? n === "script"
										? ((e = o.createElement("div")),
											(e.innerHTML = "<script><\/script>"),
											(e = e.removeChild(e.firstChild)))
										: typeof r.is == "string"
											? (e = o.createElement(n, { is: r.is }))
											: ((e = o.createElement(n)),
												n === "select" &&
													((o = e),
													r.multiple
														? (o.multiple = !0)
														: r.size && (o.size = r.size)))
									: (e = o.createElementNS(e, n)),
								(e[yt] = t),
								(e[rr] = r),
								oa(e, t, !1, !1),
								(t.stateNode = e));
							e: {
								switch (((o = Hl(n, r)), n)) {
									case "dialog":
										(b("cancel", e), b("close", e), (l = r));
										break;
									case "iframe":
									case "object":
									case "embed":
										(b("load", e), (l = r));
										break;
									case "video":
									case "audio":
										for (l = 0; l < er.length; l++) b(er[l], e);
										l = r;
										break;
									case "source":
										(b("error", e), (l = r));
										break;
									case "img":
									case "image":
									case "link":
										(b("error", e), b("load", e), (l = r));
										break;
									case "details":
										(b("toggle", e), (l = r));
										break;
									case "input":
										($o(e, r), (l = Fl(e, r)), b("invalid", e));
										break;
									case "option":
										l = r;
										break;
									case "select":
										((e._wrapperState = { wasMultiple: !!r.multiple }),
											(l = x({}, r, { value: void 0 })),
											b("invalid", e));
										break;
									case "textarea":
										(Qo(e, r), (l = Vl(e, r)), b("invalid", e));
										break;
									default:
										l = r;
								}
								($l(n, l), (i = l));
								for (u in i)
									if (i.hasOwnProperty(u)) {
										var s = i[u];
										u === "style"
											? Jo(e, s)
											: u === "dangerouslySetInnerHTML"
												? ((s = s ? s.__html : void 0), s != null && Go(e, s))
												: u === "children"
													? typeof s == "string"
														? (n !== "textarea" || s !== "") && Mn(e, s)
														: typeof s == "number" && Mn(e, "" + s)
													: u !== "suppressContentEditableWarning" &&
														u !== "suppressHydrationWarning" &&
														u !== "autoFocus" &&
														(ye.hasOwnProperty(u)
															? s != null && u === "onScroll" && b("scroll", e)
															: s != null && j(e, u, s, o));
									}
								switch (n) {
									case "input":
										(Sr(e), Wo(e, r, !1));
										break;
									case "textarea":
										(Sr(e), Yo(e));
										break;
									case "option":
										r.value != null && e.setAttribute("value", "" + H(r.value));
										break;
									case "select":
										((e.multiple = !!r.multiple),
											(u = r.value),
											u != null
												? sn(e, !!r.multiple, u, !1)
												: r.defaultValue != null &&
													sn(e, !!r.multiple, r.defaultValue, !0));
										break;
									default:
										typeof l.onClick == "function" && (e.onclick = Wr);
								}
								switch (n) {
									case "button":
									case "input":
									case "select":
									case "textarea":
										r = !!r.autoFocus;
										break e;
									case "img":
										r = !0;
										break e;
									default:
										r = !1;
								}
							}
							r && (t.flags |= 4);
						}
						t.ref !== null && ((t.flags |= 512), (t.flags |= 2097152));
					}
					return (De(t), null);
				case 6:
					if (e && t.stateNode != null) sa(e, t, e.memoizedProps, r);
					else {
						if (typeof r != "string" && t.stateNode === null)
							throw Error(m(166));
						if (((n = en(sr.current)), en(gt.current), Jr(t))) {
							if (
								((r = t.stateNode),
								(n = t.memoizedProps),
								(r[yt] = t),
								(u = r.nodeValue !== n) && ((e = Ze), e !== null))
							)
								switch (e.tag) {
									case 3:
										Hr(r.nodeValue, n, (e.mode & 1) !== 0);
										break;
									case 5:
										e.memoizedProps.suppressHydrationWarning !== !0 &&
											Hr(r.nodeValue, n, (e.mode & 1) !== 0);
								}
							u && (t.flags |= 4);
						} else
							((r = (n.nodeType === 9 ? n : n.ownerDocument).createTextNode(r)),
								(r[yt] = t),
								(t.stateNode = r));
					}
					return (De(t), null);
				case 13:
					if (
						(ee(ue),
						(r = t.memoizedState),
						e === null ||
							(e.memoizedState !== null && e.memoizedState.dehydrated !== null))
					) {
						if (
							le &&
							Je !== null &&
							(t.mode & 1) !== 0 &&
							(t.flags & 128) === 0
						)
							(fs(), En(), (t.flags |= 98560), (u = !1));
						else if (((u = Jr(t)), r !== null && r.dehydrated !== null)) {
							if (e === null) {
								if (!u) throw Error(m(318));
								if (
									((u = t.memoizedState),
									(u = u !== null ? u.dehydrated : null),
									!u)
								)
									throw Error(m(317));
								u[yt] = t;
							} else
								(En(),
									(t.flags & 128) === 0 && (t.memoizedState = null),
									(t.flags |= 4));
							(De(t), (u = !1));
						} else (ft !== null && (So(ft), (ft = null)), (u = !0));
						if (!u) return t.flags & 65536 ? t : null;
					}
					return (t.flags & 128) !== 0
						? ((t.lanes = n), t)
						: ((r = r !== null),
							r !== (e !== null && e.memoizedState !== null) &&
								r &&
								((t.child.flags |= 8192),
								(t.mode & 1) !== 0 &&
									(e === null || (ue.current & 1) !== 0
										? Se === 0 && (Se = 3)
										: Eo())),
							t.updateQueue !== null && (t.flags |= 4),
							De(t),
							null);
				case 4:
					return (
						Nn(),
						so(e, t),
						e === null && tr(t.stateNode.containerInfo),
						De(t),
						null
					);
				case 10:
					return (ju(t.type._context), De(t), null);
				case 17:
					return ($e(t.type) && Kr(), De(t), null);
				case 19:
					if ((ee(ue), (u = t.memoizedState), u === null)) return (De(t), null);
					if (((r = (t.flags & 128) !== 0), (o = u.rendering), o === null))
						if (r) pr(u, !1);
						else {
							if (Se !== 0 || (e !== null && (e.flags & 128) !== 0))
								for (e = t.child; e !== null; ) {
									if (((o = rl(e)), o !== null)) {
										for (
											t.flags |= 128,
												pr(u, !1),
												r = o.updateQueue,
												r !== null && ((t.updateQueue = r), (t.flags |= 4)),
												t.subtreeFlags = 0,
												r = n,
												n = t.child;
											n !== null;

										)
											((u = n),
												(e = r),
												(u.flags &= 14680066),
												(o = u.alternate),
												o === null
													? ((u.childLanes = 0),
														(u.lanes = e),
														(u.child = null),
														(u.subtreeFlags = 0),
														(u.memoizedProps = null),
														(u.memoizedState = null),
														(u.updateQueue = null),
														(u.dependencies = null),
														(u.stateNode = null))
													: ((u.childLanes = o.childLanes),
														(u.lanes = o.lanes),
														(u.child = o.child),
														(u.subtreeFlags = 0),
														(u.deletions = null),
														(u.memoizedProps = o.memoizedProps),
														(u.memoizedState = o.memoizedState),
														(u.updateQueue = o.updateQueue),
														(u.type = o.type),
														(e = o.dependencies),
														(u.dependencies =
															e === null
																? null
																: {
																		lanes: e.lanes,
																		firstContext: e.firstContext,
																	})),
												(n = n.sibling));
										return (Z(ue, (ue.current & 1) | 2), t.child);
									}
									e = e.sibling;
								}
							u.tail !== null &&
								pe() > Ln &&
								((t.flags |= 128), (r = !0), pr(u, !1), (t.lanes = 4194304));
						}
					else {
						if (!r)
							if (((e = rl(o)), e !== null)) {
								if (
									((t.flags |= 128),
									(r = !0),
									(n = e.updateQueue),
									n !== null && ((t.updateQueue = n), (t.flags |= 4)),
									pr(u, !0),
									u.tail === null &&
										u.tailMode === "hidden" &&
										!o.alternate &&
										!le)
								)
									return (De(t), null);
							} else
								2 * pe() - u.renderingStartTime > Ln &&
									n !== 1073741824 &&
									((t.flags |= 128), (r = !0), pr(u, !1), (t.lanes = 4194304));
						u.isBackwards
							? ((o.sibling = t.child), (t.child = o))
							: ((n = u.last),
								n !== null ? (n.sibling = o) : (t.child = o),
								(u.last = o));
					}
					return u.tail !== null
						? ((t = u.tail),
							(u.rendering = t),
							(u.tail = t.sibling),
							(u.renderingStartTime = pe()),
							(t.sibling = null),
							(n = ue.current),
							Z(ue, r ? (n & 1) | 2 : n & 1),
							t)
						: (De(t), null);
				case 22:
				case 23:
					return (
						xo(),
						(r = t.memoizedState !== null),
						e !== null && (e.memoizedState !== null) !== r && (t.flags |= 8192),
						r && (t.mode & 1) !== 0
							? (qe & 1073741824) !== 0 &&
								(De(t), t.subtreeFlags & 6 && (t.flags |= 8192))
							: De(t),
						null
					);
				case 24:
					return null;
				case 25:
					return null;
			}
			throw Error(m(156, t.tag));
		}
		function Cf(e, t) {
			switch ((Ru(t), t.tag)) {
				case 1:
					return (
						$e(t.type) && Kr(),
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					);
				case 3:
					return (
						Nn(),
						ee(Be),
						ee(Le),
						Hu(),
						(e = t.flags),
						(e & 65536) !== 0 && (e & 128) === 0
							? ((t.flags = (e & -65537) | 128), t)
							: null
					);
				case 5:
					return (Bu(t), null);
				case 13:
					if (
						(ee(ue), (e = t.memoizedState), e !== null && e.dehydrated !== null)
					) {
						if (t.alternate === null) throw Error(m(340));
						En();
					}
					return (
						(e = t.flags),
						e & 65536 ? ((t.flags = (e & -65537) | 128), t) : null
					);
				case 19:
					return (ee(ue), null);
				case 4:
					return (Nn(), null);
				case 10:
					return (ju(t.type._context), null);
				case 22:
				case 23:
					return (xo(), null);
				case 24:
					return null;
				default:
					return null;
			}
		}
		var dl = !1,
			Ie = !1,
			Pf = typeof WeakSet == "function" ? WeakSet : Set,
			_ = null;
		function Tn(e, t) {
			var n = e.ref;
			if (n !== null)
				if (typeof n == "function")
					try {
						n(null);
					} catch (r) {
						ce(e, t, r);
					}
				else n.current = null;
		}
		function ao(e, t, n) {
			try {
				n();
			} catch (r) {
				ce(e, t, r);
			}
		}
		var aa = !1;
		function Nf(e, t) {
			if (((ku = Or), (e = Bi()), pu(e))) {
				if ("selectionStart" in e)
					var n = { start: e.selectionStart, end: e.selectionEnd };
				else
					e: {
						n = ((n = e.ownerDocument) && n.defaultView) || window;
						var r = n.getSelection && n.getSelection();
						if (r && r.rangeCount !== 0) {
							n = r.anchorNode;
							var l = r.anchorOffset,
								u = r.focusNode;
							r = r.focusOffset;
							try {
								(n.nodeType, u.nodeType);
							} catch {
								n = null;
								break e;
							}
							var o = 0,
								i = -1,
								s = -1,
								p = 0,
								y = 0,
								g = e,
								v = null;
							t: for (;;) {
								for (
									var E;
									g !== n || (l !== 0 && g.nodeType !== 3) || (i = o + l),
										g !== u || (r !== 0 && g.nodeType !== 3) || (s = o + r),
										g.nodeType === 3 && (o += g.nodeValue.length),
										(E = g.firstChild) !== null;

								)
									((v = g), (g = E));
								for (;;) {
									if (g === e) break t;
									if (
										(v === n && ++p === l && (i = o),
										v === u && ++y === r && (s = o),
										(E = g.nextSibling) !== null)
									)
										break;
									((g = v), (v = g.parentNode));
								}
								g = E;
							}
							n = i === -1 || s === -1 ? null : { start: i, end: s };
						} else n = null;
					}
				n = n || { start: 0, end: 0 };
			} else n = null;
			for (
				xu = { focusedElem: e, selectionRange: n }, Or = !1, _ = t;
				_ !== null;

			)
				if (
					((t = _), (e = t.child), (t.subtreeFlags & 1028) !== 0 && e !== null)
				)
					((e.return = t), (_ = e));
				else
					for (; _ !== null; ) {
						t = _;
						try {
							var C = t.alternate;
							if ((t.flags & 1024) !== 0)
								switch (t.tag) {
									case 0:
									case 11:
									case 15:
										break;
									case 1:
										if (C !== null) {
											var P = C.memoizedProps,
												me = C.memoizedState,
												f = t.stateNode,
												a = f.getSnapshotBeforeUpdate(
													t.elementType === t.type ? P : dt(t.type, P),
													me,
												);
											f.__reactInternalSnapshotBeforeUpdate = a;
										}
										break;
									case 3:
										var d = t.stateNode.containerInfo;
										d.nodeType === 1
											? (d.textContent = "")
											: d.nodeType === 9 &&
												d.documentElement &&
												d.removeChild(d.documentElement);
										break;
									case 5:
									case 6:
									case 4:
									case 17:
										break;
									default:
										throw Error(m(163));
								}
						} catch (w) {
							ce(t, t.return, w);
						}
						if (((e = t.sibling), e !== null)) {
							((e.return = t.return), (_ = e));
							break;
						}
						_ = t.return;
					}
			return ((C = aa), (aa = !1), C);
		}
		function mr(e, t, n) {
			var r = t.updateQueue;
			if (((r = r !== null ? r.lastEffect : null), r !== null)) {
				var l = (r = r.next);
				do {
					if ((l.tag & e) === e) {
						var u = l.destroy;
						((l.destroy = void 0), u !== void 0 && ao(t, n, u));
					}
					l = l.next;
				} while (l !== r);
			}
		}
		function pl(e, t) {
			if (
				((t = t.updateQueue),
				(t = t !== null ? t.lastEffect : null),
				t !== null)
			) {
				var n = (t = t.next);
				do {
					if ((n.tag & e) === e) {
						var r = n.create;
						n.destroy = r();
					}
					n = n.next;
				} while (n !== t);
			}
		}
		function co(e) {
			var t = e.ref;
			if (t !== null) {
				var n = e.stateNode;
				switch (e.tag) {
					case 5:
						e = n;
						break;
					default:
						e = n;
				}
				typeof t == "function" ? t(e) : (t.current = e);
			}
		}
		function ca(e) {
			var t = e.alternate;
			(t !== null && ((e.alternate = null), ca(t)),
				(e.child = null),
				(e.deletions = null),
				(e.sibling = null),
				e.tag === 5 &&
					((t = e.stateNode),
					t !== null &&
						(delete t[yt],
						delete t[rr],
						delete t[Pu],
						delete t[af],
						delete t[cf])),
				(e.stateNode = null),
				(e.return = null),
				(e.dependencies = null),
				(e.memoizedProps = null),
				(e.memoizedState = null),
				(e.pendingProps = null),
				(e.stateNode = null),
				(e.updateQueue = null));
		}
		function fa(e) {
			return e.tag === 5 || e.tag === 3 || e.tag === 4;
		}
		function da(e) {
			e: for (;;) {
				for (; e.sibling === null; ) {
					if (e.return === null || fa(e.return)) return null;
					e = e.return;
				}
				for (
					e.sibling.return = e.return, e = e.sibling;
					e.tag !== 5 && e.tag !== 6 && e.tag !== 18;

				) {
					if (e.flags & 2 || e.child === null || e.tag === 4) continue e;
					((e.child.return = e), (e = e.child));
				}
				if (!(e.flags & 2)) return e.stateNode;
			}
		}
		function fo(e, t, n) {
			var r = e.tag;
			if (r === 5 || r === 6)
				((e = e.stateNode),
					t
						? n.nodeType === 8
							? n.parentNode.insertBefore(e, t)
							: n.insertBefore(e, t)
						: (n.nodeType === 8
								? ((t = n.parentNode), t.insertBefore(e, n))
								: ((t = n), t.appendChild(e)),
							(n = n._reactRootContainer),
							n != null || t.onclick !== null || (t.onclick = Wr)));
			else if (r !== 4 && ((e = e.child), e !== null))
				for (fo(e, t, n), e = e.sibling; e !== null; )
					(fo(e, t, n), (e = e.sibling));
		}
		function po(e, t, n) {
			var r = e.tag;
			if (r === 5 || r === 6)
				((e = e.stateNode), t ? n.insertBefore(e, t) : n.appendChild(e));
			else if (r !== 4 && ((e = e.child), e !== null))
				for (po(e, t, n), e = e.sibling; e !== null; )
					(po(e, t, n), (e = e.sibling));
		}
		var Ne = null,
			pt = !1;
		function Bt(e, t, n) {
			for (n = n.child; n !== null; ) (pa(e, t, n), (n = n.sibling));
		}
		function pa(e, t, n) {
			if (vt && typeof vt.onCommitFiberUnmount == "function")
				try {
					vt.onCommitFiberUnmount(Pr, n);
				} catch {}
			switch (n.tag) {
				case 5:
					Ie || Tn(n, t);
				case 6:
					var r = Ne,
						l = pt;
					((Ne = null),
						Bt(e, t, n),
						(Ne = r),
						(pt = l),
						Ne !== null &&
							(pt
								? ((e = Ne),
									(n = n.stateNode),
									e.nodeType === 8
										? e.parentNode.removeChild(n)
										: e.removeChild(n))
								: Ne.removeChild(n.stateNode)));
					break;
				case 18:
					Ne !== null &&
						(pt
							? ((e = Ne),
								(n = n.stateNode),
								e.nodeType === 8
									? Cu(e.parentNode, n)
									: e.nodeType === 1 && Cu(e, n),
								Kn(e))
							: Cu(Ne, n.stateNode));
					break;
				case 4:
					((r = Ne),
						(l = pt),
						(Ne = n.stateNode.containerInfo),
						(pt = !0),
						Bt(e, t, n),
						(Ne = r),
						(pt = l));
					break;
				case 0:
				case 11:
				case 14:
				case 15:
					if (
						!Ie &&
						((r = n.updateQueue),
						r !== null && ((r = r.lastEffect), r !== null))
					) {
						l = r = r.next;
						do {
							var u = l,
								o = u.destroy;
							((u = u.tag),
								o !== void 0 && ((u & 2) !== 0 || (u & 4) !== 0) && ao(n, t, o),
								(l = l.next));
						} while (l !== r);
					}
					Bt(e, t, n);
					break;
				case 1:
					if (
						!Ie &&
						(Tn(n, t),
						(r = n.stateNode),
						typeof r.componentWillUnmount == "function")
					)
						try {
							((r.props = n.memoizedProps),
								(r.state = n.memoizedState),
								r.componentWillUnmount());
						} catch (i) {
							ce(n, t, i);
						}
					Bt(e, t, n);
					break;
				case 21:
					Bt(e, t, n);
					break;
				case 22:
					n.mode & 1
						? ((Ie = (r = Ie) || n.memoizedState !== null),
							Bt(e, t, n),
							(Ie = r))
						: Bt(e, t, n);
					break;
				default:
					Bt(e, t, n);
			}
		}
		function ma(e) {
			var t = e.updateQueue;
			if (t !== null) {
				e.updateQueue = null;
				var n = e.stateNode;
				(n === null && (n = e.stateNode = new Pf()),
					t.forEach(function (r) {
						var l = jf.bind(null, e, r);
						n.has(r) || (n.add(r), r.then(l, l));
					}));
			}
		}
		function mt(e, t) {
			var n = t.deletions;
			if (n !== null)
				for (var r = 0; r < n.length; r++) {
					var l = n[r];
					try {
						var u = e,
							o = t,
							i = o;
						e: for (; i !== null; ) {
							switch (i.tag) {
								case 5:
									((Ne = i.stateNode), (pt = !1));
									break e;
								case 3:
									((Ne = i.stateNode.containerInfo), (pt = !0));
									break e;
								case 4:
									((Ne = i.stateNode.containerInfo), (pt = !0));
									break e;
							}
							i = i.return;
						}
						if (Ne === null) throw Error(m(160));
						(pa(u, o, l), (Ne = null), (pt = !1));
						var s = l.alternate;
						(s !== null && (s.return = null), (l.return = null));
					} catch (p) {
						ce(l, t, p);
					}
				}
			if (t.subtreeFlags & 12854)
				for (t = t.child; t !== null; ) (ha(t, e), (t = t.sibling));
		}
		function ha(e, t) {
			var n = e.alternate,
				r = e.flags;
			switch (e.tag) {
				case 0:
				case 11:
				case 14:
				case 15:
					if ((mt(t, e), St(e), r & 4)) {
						try {
							(mr(3, e, e.return), pl(3, e));
						} catch (P) {
							ce(e, e.return, P);
						}
						try {
							mr(5, e, e.return);
						} catch (P) {
							ce(e, e.return, P);
						}
					}
					break;
				case 1:
					(mt(t, e), St(e), r & 512 && n !== null && Tn(n, n.return));
					break;
				case 5:
					if (
						(mt(t, e),
						St(e),
						r & 512 && n !== null && Tn(n, n.return),
						e.flags & 32)
					) {
						var l = e.stateNode;
						try {
							Mn(l, "");
						} catch (P) {
							ce(e, e.return, P);
						}
					}
					if (r & 4 && ((l = e.stateNode), l != null)) {
						var u = e.memoizedProps,
							o = n !== null ? n.memoizedProps : u,
							i = e.type,
							s = e.updateQueue;
						if (((e.updateQueue = null), s !== null))
							try {
								(i === "input" &&
									u.type === "radio" &&
									u.name != null &&
									Ho(l, u),
									Hl(i, o));
								var p = Hl(i, u);
								for (o = 0; o < s.length; o += 2) {
									var y = s[o],
										g = s[o + 1];
									y === "style"
										? Jo(l, g)
										: y === "dangerouslySetInnerHTML"
											? Go(l, g)
											: y === "children"
												? Mn(l, g)
												: j(l, y, g, p);
								}
								switch (i) {
									case "input":
										Ul(l, u);
										break;
									case "textarea":
										Ko(l, u);
										break;
									case "select":
										var v = l._wrapperState.wasMultiple;
										l._wrapperState.wasMultiple = !!u.multiple;
										var E = u.value;
										E != null
											? sn(l, !!u.multiple, E, !1)
											: v !== !!u.multiple &&
												(u.defaultValue != null
													? sn(l, !!u.multiple, u.defaultValue, !0)
													: sn(l, !!u.multiple, u.multiple ? [] : "", !1));
								}
								l[rr] = u;
							} catch (P) {
								ce(e, e.return, P);
							}
					}
					break;
				case 6:
					if ((mt(t, e), St(e), r & 4)) {
						if (e.stateNode === null) throw Error(m(162));
						((l = e.stateNode), (u = e.memoizedProps));
						try {
							l.nodeValue = u;
						} catch (P) {
							ce(e, e.return, P);
						}
					}
					break;
				case 3:
					if (
						(mt(t, e),
						St(e),
						r & 4 && n !== null && n.memoizedState.isDehydrated)
					)
						try {
							Kn(t.containerInfo);
						} catch (P) {
							ce(e, e.return, P);
						}
					break;
				case 4:
					(mt(t, e), St(e));
					break;
				case 13:
					(mt(t, e),
						St(e),
						(l = e.child),
						l.flags & 8192 &&
							((u = l.memoizedState !== null),
							(l.stateNode.isHidden = u),
							!u ||
								(l.alternate !== null && l.alternate.memoizedState !== null) ||
								(vo = pe())),
						r & 4 && ma(e));
					break;
				case 22:
					if (
						((y = n !== null && n.memoizedState !== null),
						e.mode & 1 ? ((Ie = (p = Ie) || y), mt(t, e), (Ie = p)) : mt(t, e),
						St(e),
						r & 8192)
					) {
						if (
							((p = e.memoizedState !== null),
							(e.stateNode.isHidden = p) && !y && (e.mode & 1) !== 0)
						)
							for (_ = e, y = e.child; y !== null; ) {
								for (g = _ = y; _ !== null; ) {
									switch (((v = _), (E = v.child), v.tag)) {
										case 0:
										case 11:
										case 14:
										case 15:
											mr(4, v, v.return);
											break;
										case 1:
											Tn(v, v.return);
											var C = v.stateNode;
											if (typeof C.componentWillUnmount == "function") {
												((r = v), (n = v.return));
												try {
													((t = r),
														(C.props = t.memoizedProps),
														(C.state = t.memoizedState),
														C.componentWillUnmount());
												} catch (P) {
													ce(r, n, P);
												}
											}
											break;
										case 5:
											Tn(v, v.return);
											break;
										case 22:
											if (v.memoizedState !== null) {
												ga(g);
												continue;
											}
									}
									E !== null ? ((E.return = v), (_ = E)) : ga(g);
								}
								y = y.sibling;
							}
						e: for (y = null, g = e; ; ) {
							if (g.tag === 5) {
								if (y === null) {
									y = g;
									try {
										((l = g.stateNode),
											p
												? ((u = l.style),
													typeof u.setProperty == "function"
														? u.setProperty("display", "none", "important")
														: (u.display = "none"))
												: ((i = g.stateNode),
													(s = g.memoizedProps.style),
													(o =
														s != null && s.hasOwnProperty("display")
															? s.display
															: null),
													(i.style.display = Zo("display", o))));
									} catch (P) {
										ce(e, e.return, P);
									}
								}
							} else if (g.tag === 6) {
								if (y === null)
									try {
										g.stateNode.nodeValue = p ? "" : g.memoizedProps;
									} catch (P) {
										ce(e, e.return, P);
									}
							} else if (
								((g.tag !== 22 && g.tag !== 23) ||
									g.memoizedState === null ||
									g === e) &&
								g.child !== null
							) {
								((g.child.return = g), (g = g.child));
								continue;
							}
							if (g === e) break e;
							for (; g.sibling === null; ) {
								if (g.return === null || g.return === e) break e;
								(y === g && (y = null), (g = g.return));
							}
							(y === g && (y = null),
								(g.sibling.return = g.return),
								(g = g.sibling));
						}
					}
					break;
				case 19:
					(mt(t, e), St(e), r & 4 && ma(e));
					break;
				case 21:
					break;
				default:
					(mt(t, e), St(e));
			}
		}
		function St(e) {
			var t = e.flags;
			if (t & 2) {
				try {
					e: {
						for (var n = e.return; n !== null; ) {
							if (fa(n)) {
								var r = n;
								break e;
							}
							n = n.return;
						}
						throw Error(m(160));
					}
					switch (r.tag) {
						case 5:
							var l = r.stateNode;
							r.flags & 32 && (Mn(l, ""), (r.flags &= -33));
							var u = da(e);
							po(e, u, l);
							break;
						case 3:
						case 4:
							var o = r.stateNode.containerInfo,
								i = da(e);
							fo(e, i, o);
							break;
						default:
							throw Error(m(161));
					}
				} catch (s) {
					ce(e, e.return, s);
				}
				e.flags &= -3;
			}
			t & 4096 && (e.flags &= -4097);
		}
		function zf(e, t, n) {
			((_ = e), va(e));
		}
		function va(e, t, n) {
			for (var r = (e.mode & 1) !== 0; _ !== null; ) {
				var l = _,
					u = l.child;
				if (l.tag === 22 && r) {
					var o = l.memoizedState !== null || dl;
					if (!o) {
						var i = l.alternate,
							s = (i !== null && i.memoizedState !== null) || Ie;
						i = dl;
						var p = Ie;
						if (((dl = o), (Ie = s) && !p))
							for (_ = l; _ !== null; )
								((o = _),
									(s = o.child),
									o.tag === 22 && o.memoizedState !== null
										? wa(l)
										: s !== null
											? ((s.return = o), (_ = s))
											: wa(l));
						for (; u !== null; ) ((_ = u), va(u), (u = u.sibling));
						((_ = l), (dl = i), (Ie = p));
					}
					ya(e);
				} else
					(l.subtreeFlags & 8772) !== 0 && u !== null
						? ((u.return = l), (_ = u))
						: ya(e);
			}
		}
		function ya(e) {
			for (; _ !== null; ) {
				var t = _;
				if ((t.flags & 8772) !== 0) {
					var n = t.alternate;
					try {
						if ((t.flags & 8772) !== 0)
							switch (t.tag) {
								case 0:
								case 11:
								case 15:
									Ie || pl(5, t);
									break;
								case 1:
									var r = t.stateNode;
									if (t.flags & 4 && !Ie)
										if (n === null) r.componentDidMount();
										else {
											var l =
												t.elementType === t.type
													? n.memoizedProps
													: dt(t.type, n.memoizedProps);
											r.componentDidUpdate(
												l,
												n.memoizedState,
												r.__reactInternalSnapshotBeforeUpdate,
											);
										}
									var u = t.updateQueue;
									u !== null && gs(t, u, r);
									break;
								case 3:
									var o = t.updateQueue;
									if (o !== null) {
										if (((n = null), t.child !== null))
											switch (t.child.tag) {
												case 5:
													n = t.child.stateNode;
													break;
												case 1:
													n = t.child.stateNode;
											}
										gs(t, o, n);
									}
									break;
								case 5:
									var i = t.stateNode;
									if (n === null && t.flags & 4) {
										n = i;
										var s = t.memoizedProps;
										switch (t.type) {
											case "button":
											case "input":
											case "select":
											case "textarea":
												s.autoFocus && n.focus();
												break;
											case "img":
												s.src && (n.src = s.src);
										}
									}
									break;
								case 6:
									break;
								case 4:
									break;
								case 12:
									break;
								case 13:
									if (t.memoizedState === null) {
										var p = t.alternate;
										if (p !== null) {
											var y = p.memoizedState;
											if (y !== null) {
												var g = y.dehydrated;
												g !== null && Kn(g);
											}
										}
									}
									break;
								case 19:
								case 17:
								case 21:
								case 22:
								case 23:
								case 25:
									break;
								default:
									throw Error(m(163));
							}
						Ie || (t.flags & 512 && co(t));
					} catch (v) {
						ce(t, t.return, v);
					}
				}
				if (t === e) {
					_ = null;
					break;
				}
				if (((n = t.sibling), n !== null)) {
					((n.return = t.return), (_ = n));
					break;
				}
				_ = t.return;
			}
		}
		function ga(e) {
			for (; _ !== null; ) {
				var t = _;
				if (t === e) {
					_ = null;
					break;
				}
				var n = t.sibling;
				if (n !== null) {
					((n.return = t.return), (_ = n));
					break;
				}
				_ = t.return;
			}
		}
		function wa(e) {
			for (; _ !== null; ) {
				var t = _;
				try {
					switch (t.tag) {
						case 0:
						case 11:
						case 15:
							var n = t.return;
							try {
								pl(4, t);
							} catch (s) {
								ce(t, n, s);
							}
							break;
						case 1:
							var r = t.stateNode;
							if (typeof r.componentDidMount == "function") {
								var l = t.return;
								try {
									r.componentDidMount();
								} catch (s) {
									ce(t, l, s);
								}
							}
							var u = t.return;
							try {
								co(t);
							} catch (s) {
								ce(t, u, s);
							}
							break;
						case 5:
							var o = t.return;
							try {
								co(t);
							} catch (s) {
								ce(t, o, s);
							}
					}
				} catch (s) {
					ce(t, t.return, s);
				}
				if (t === e) {
					_ = null;
					break;
				}
				var i = t.sibling;
				if (i !== null) {
					((i.return = t.return), (_ = i));
					break;
				}
				_ = t.return;
			}
		}
		var Tf = Math.ceil,
			ml = se.ReactCurrentDispatcher,
			mo = se.ReactCurrentOwner,
			ut = se.ReactCurrentBatchConfig,
			F = 0,
			_e = null,
			he = null,
			ze = 0,
			qe = 0,
			Rn = jt(0),
			Se = 0,
			hr = null,
			nn = 0,
			hl = 0,
			ho = 0,
			vr = null,
			We = null,
			vo = 0,
			Ln = 1 / 0,
			zt = null,
			vl = !1,
			yo = null,
			$t = null,
			yl = !1,
			Ht = null,
			gl = 0,
			yr = 0,
			go = null,
			wl = -1,
			Sl = 0;
		function Ue() {
			return (F & 6) !== 0 ? pe() : wl !== -1 ? wl : (wl = pe());
		}
		function Wt(e) {
			return (e.mode & 1) === 0
				? 1
				: (F & 2) !== 0 && ze !== 0
					? ze & -ze
					: df.transition !== null
						? (Sl === 0 && (Sl = di()), Sl)
						: ((e = W),
							e !== 0 ||
								((e = window.event), (e = e === void 0 ? 16 : ki(e.type))),
							e);
		}
		function ht(e, t, n, r) {
			if (50 < yr) throw ((yr = 0), (go = null), Error(m(185)));
			(Bn(e, n, r),
				((F & 2) === 0 || e !== _e) &&
					(e === _e && ((F & 2) === 0 && (hl |= n), Se === 4 && Qt(e, ze)),
					Qe(e, r),
					n === 1 &&
						F === 0 &&
						(t.mode & 1) === 0 &&
						((Ln = pe() + 500), Xr && Ut())));
		}
		function Qe(e, t) {
			var n = e.callbackNode;
			fc(e, t);
			var r = Tr(e, e === _e ? ze : 0);
			if (r === 0)
				(n !== null && ai(n),
					(e.callbackNode = null),
					(e.callbackPriority = 0));
			else if (((t = r & -r), e.callbackPriority !== t)) {
				if ((n != null && ai(n), t === 1))
					(e.tag === 0 ? ff(ka.bind(null, e)) : os(ka.bind(null, e)),
						of(function () {
							(F & 6) === 0 && Ut();
						}),
						(n = null));
				else {
					switch (pi(r)) {
						case 1:
							n = Zl;
							break;
						case 4:
							n = ci;
							break;
						case 16:
							n = Cr;
							break;
						case 536870912:
							n = fi;
							break;
						default:
							n = Cr;
					}
					n = Ta(n, Sa.bind(null, e));
				}
				((e.callbackPriority = t), (e.callbackNode = n));
			}
		}
		function Sa(e, t) {
			if (((wl = -1), (Sl = 0), (F & 6) !== 0)) throw Error(m(327));
			var n = e.callbackNode;
			if (On() && e.callbackNode !== n) return null;
			var r = Tr(e, e === _e ? ze : 0);
			if (r === 0) return null;
			if ((r & 30) !== 0 || (r & e.expiredLanes) !== 0 || t) t = kl(e, r);
			else {
				t = r;
				var l = F;
				F |= 2;
				var u = Ea();
				(_e !== e || ze !== t) && ((zt = null), (Ln = pe() + 500), ln(e, t));
				do
					try {
						Of();
						break;
					} catch (i) {
						xa(e, i);
					}
				while (!0);
				(Mu(),
					(ml.current = u),
					(F = l),
					he !== null ? (t = 0) : ((_e = null), (ze = 0), (t = Se)));
			}
			if (t !== 0) {
				if (
					(t === 2 && ((l = Jl(e)), l !== 0 && ((r = l), (t = wo(e, l)))),
					t === 1)
				)
					throw ((n = hr), ln(e, 0), Qt(e, r), Qe(e, pe()), n);
				if (t === 6) Qt(e, r);
				else {
					if (
						((l = e.current.alternate),
						(r & 30) === 0 &&
							!Rf(l) &&
							((t = kl(e, r)),
							t === 2 && ((u = Jl(e)), u !== 0 && ((r = u), (t = wo(e, u)))),
							t === 1))
					)
						throw ((n = hr), ln(e, 0), Qt(e, r), Qe(e, pe()), n);
					switch (((e.finishedWork = l), (e.finishedLanes = r), t)) {
						case 0:
						case 1:
							throw Error(m(345));
						case 2:
							un(e, We, zt);
							break;
						case 3:
							if (
								(Qt(e, r),
								(r & 130023424) === r && ((t = vo + 500 - pe()), 10 < t))
							) {
								if (Tr(e, 0) !== 0) break;
								if (((l = e.suspendedLanes), (l & r) !== r)) {
									(Ue(), (e.pingedLanes |= e.suspendedLanes & l));
									break;
								}
								e.timeoutHandle = _u(un.bind(null, e, We, zt), t);
								break;
							}
							un(e, We, zt);
							break;
						case 4:
							if ((Qt(e, r), (r & 4194240) === r)) break;
							for (t = e.eventTimes, l = -1; 0 < r; ) {
								var o = 31 - at(r);
								((u = 1 << o), (o = t[o]), o > l && (l = o), (r &= ~u));
							}
							if (
								((r = l),
								(r = pe() - r),
								(r =
									(120 > r
										? 120
										: 480 > r
											? 480
											: 1080 > r
												? 1080
												: 1920 > r
													? 1920
													: 3e3 > r
														? 3e3
														: 4320 > r
															? 4320
															: 1960 * Tf(r / 1960)) - r),
								10 < r)
							) {
								e.timeoutHandle = _u(un.bind(null, e, We, zt), r);
								break;
							}
							un(e, We, zt);
							break;
						case 5:
							un(e, We, zt);
							break;
						default:
							throw Error(m(329));
					}
				}
			}
			return (Qe(e, pe()), e.callbackNode === n ? Sa.bind(null, e) : null);
		}
		function wo(e, t) {
			var n = vr;
			return (
				e.current.memoizedState.isDehydrated && (ln(e, t).flags |= 256),
				(e = kl(e, t)),
				e !== 2 && ((t = We), (We = n), t !== null && So(t)),
				e
			);
		}
		function So(e) {
			We === null ? (We = e) : We.push.apply(We, e);
		}
		function Rf(e) {
			for (var t = e; ; ) {
				if (t.flags & 16384) {
					var n = t.updateQueue;
					if (n !== null && ((n = n.stores), n !== null))
						for (var r = 0; r < n.length; r++) {
							var l = n[r],
								u = l.getSnapshot;
							l = l.value;
							try {
								if (!ct(u(), l)) return !1;
							} catch {
								return !1;
							}
						}
				}
				if (((n = t.child), t.subtreeFlags & 16384 && n !== null))
					((n.return = t), (t = n));
				else {
					if (t === e) break;
					for (; t.sibling === null; ) {
						if (t.return === null || t.return === e) return !0;
						t = t.return;
					}
					((t.sibling.return = t.return), (t = t.sibling));
				}
			}
			return !0;
		}
		function Qt(e, t) {
			for (
				t &= ~ho,
					t &= ~hl,
					e.suspendedLanes |= t,
					e.pingedLanes &= ~t,
					e = e.expirationTimes;
				0 < t;

			) {
				var n = 31 - at(t),
					r = 1 << n;
				((e[n] = -1), (t &= ~r));
			}
		}
		function ka(e) {
			if ((F & 6) !== 0) throw Error(m(327));
			On();
			var t = Tr(e, 0);
			if ((t & 1) === 0) return (Qe(e, pe()), null);
			var n = kl(e, t);
			if (e.tag !== 0 && n === 2) {
				var r = Jl(e);
				r !== 0 && ((t = r), (n = wo(e, r)));
			}
			if (n === 1) throw ((n = hr), ln(e, 0), Qt(e, t), Qe(e, pe()), n);
			if (n === 6) throw Error(m(345));
			return (
				(e.finishedWork = e.current.alternate),
				(e.finishedLanes = t),
				un(e, We, zt),
				Qe(e, pe()),
				null
			);
		}
		function ko(e, t) {
			var n = F;
			F |= 1;
			try {
				return e(t);
			} finally {
				((F = n), F === 0 && ((Ln = pe() + 500), Xr && Ut()));
			}
		}
		function rn(e) {
			Ht !== null && Ht.tag === 0 && (F & 6) === 0 && On();
			var t = F;
			F |= 1;
			var n = ut.transition,
				r = W;
			try {
				if (((ut.transition = null), (W = 1), e)) return e();
			} finally {
				((W = r), (ut.transition = n), (F = t), (F & 6) === 0 && Ut());
			}
		}
		function xo() {
			((qe = Rn.current), ee(Rn));
		}
		function ln(e, t) {
			((e.finishedWork = null), (e.finishedLanes = 0));
			var n = e.timeoutHandle;
			if ((n !== -1 && ((e.timeoutHandle = -1), uf(n)), he !== null))
				for (n = he.return; n !== null; ) {
					var r = n;
					switch ((Ru(r), r.tag)) {
						case 1:
							((r = r.type.childContextTypes), r != null && Kr());
							break;
						case 3:
							(Nn(), ee(Be), ee(Le), Hu());
							break;
						case 5:
							Bu(r);
							break;
						case 4:
							Nn();
							break;
						case 13:
							ee(ue);
							break;
						case 19:
							ee(ue);
							break;
						case 10:
							ju(r.type._context);
							break;
						case 22:
						case 23:
							xo();
					}
					n = n.return;
				}
			if (
				((_e = e),
				(he = e = Kt(e.current, null)),
				(ze = qe = t),
				(Se = 0),
				(hr = null),
				(ho = hl = nn = 0),
				(We = vr = null),
				bt !== null)
			) {
				for (t = 0; t < bt.length; t++)
					if (((n = bt[t]), (r = n.interleaved), r !== null)) {
						n.interleaved = null;
						var l = r.next,
							u = n.pending;
						if (u !== null) {
							var o = u.next;
							((u.next = l), (r.next = o));
						}
						n.pending = r;
					}
				bt = null;
			}
			return e;
		}
		function xa(e, t) {
			do {
				var n = he;
				try {
					if ((Mu(), (ll.current = sl), ul)) {
						for (var r = oe.memoizedState; r !== null; ) {
							var l = r.queue;
							(l !== null && (l.pending = null), (r = r.next));
						}
						ul = !1;
					}
					if (
						((tn = 0),
						(Ee = we = oe = null),
						(ar = !1),
						(cr = 0),
						(mo.current = null),
						n === null || n.return === null)
					) {
						((Se = 1), (hr = t), (he = null));
						break;
					}
					e: {
						var u = e,
							o = n.return,
							i = n,
							s = t;
						if (
							((t = ze),
							(i.flags |= 32768),
							s !== null && typeof s == "object" && typeof s.then == "function")
						) {
							var p = s,
								y = i,
								g = y.tag;
							if ((y.mode & 1) === 0 && (g === 0 || g === 11 || g === 15)) {
								var v = y.alternate;
								v
									? ((y.updateQueue = v.updateQueue),
										(y.memoizedState = v.memoizedState),
										(y.lanes = v.lanes))
									: ((y.updateQueue = null), (y.memoizedState = null));
							}
							var E = Ys(o);
							if (E !== null) {
								((E.flags &= -257),
									Xs(E, o, i, u, t),
									E.mode & 1 && Ks(u, p, t),
									(t = E),
									(s = p));
								var C = t.updateQueue;
								if (C === null) {
									var P = new Set();
									(P.add(s), (t.updateQueue = P));
								} else C.add(s);
								break e;
							} else {
								if ((t & 1) === 0) {
									(Ks(u, p, t), Eo());
									break e;
								}
								s = Error(m(426));
							}
						} else if (le && i.mode & 1) {
							var me = Ys(o);
							if (me !== null) {
								((me.flags & 65536) === 0 && (me.flags |= 256),
									Xs(me, o, i, u, t),
									Du(zn(s, i)));
								break e;
							}
						}
						((u = s = zn(s, i)),
							Se !== 4 && (Se = 2),
							vr === null ? (vr = [u]) : vr.push(u),
							(u = o));
						do {
							switch (u.tag) {
								case 3:
									((u.flags |= 65536), (t &= -t), (u.lanes |= t));
									var f = Ws(u, s, t);
									ys(u, f);
									break e;
								case 1:
									i = s;
									var a = u.type,
										d = u.stateNode;
									if (
										(u.flags & 128) === 0 &&
										(typeof a.getDerivedStateFromError == "function" ||
											(d !== null &&
												typeof d.componentDidCatch == "function" &&
												($t === null || !$t.has(d))))
									) {
										((u.flags |= 65536), (t &= -t), (u.lanes |= t));
										var w = Qs(u, i, t);
										ys(u, w);
										break e;
									}
							}
							u = u.return;
						} while (u !== null);
					}
					Ca(n);
				} catch (z) {
					((t = z), he === n && n !== null && (he = n = n.return));
					continue;
				}
				break;
			} while (!0);
		}
		function Ea() {
			var e = ml.current;
			return ((ml.current = sl), e === null ? sl : e);
		}
		function Eo() {
			((Se === 0 || Se === 3 || Se === 2) && (Se = 4),
				_e === null ||
					((nn & 268435455) === 0 && (hl & 268435455) === 0) ||
					Qt(_e, ze));
		}
		function kl(e, t) {
			var n = F;
			F |= 2;
			var r = Ea();
			(_e !== e || ze !== t) && ((zt = null), ln(e, t));
			do
				try {
					Lf();
					break;
				} catch (l) {
					xa(e, l);
				}
			while (!0);
			if ((Mu(), (F = n), (ml.current = r), he !== null)) throw Error(m(261));
			return ((_e = null), (ze = 0), Se);
		}
		function Lf() {
			for (; he !== null; ) _a(he);
		}
		function Of() {
			for (; he !== null && !nc(); ) _a(he);
		}
		function _a(e) {
			var t = za(e.alternate, e, qe);
			((e.memoizedProps = e.pendingProps),
				t === null ? Ca(e) : (he = t),
				(mo.current = null));
		}
		function Ca(e) {
			var t = e;
			do {
				var n = t.alternate;
				if (((e = t.return), (t.flags & 32768) === 0)) {
					if (((n = _f(n, t, qe)), n !== null)) {
						he = n;
						return;
					}
				} else {
					if (((n = Cf(n, t)), n !== null)) {
						((n.flags &= 32767), (he = n));
						return;
					}
					if (e !== null)
						((e.flags |= 32768), (e.subtreeFlags = 0), (e.deletions = null));
					else {
						((Se = 6), (he = null));
						return;
					}
				}
				if (((t = t.sibling), t !== null)) {
					he = t;
					return;
				}
				he = t = e;
			} while (t !== null);
			Se === 0 && (Se = 5);
		}
		function un(e, t, n) {
			var r = W,
				l = ut.transition;
			try {
				((ut.transition = null), (W = 1), Df(e, t, n, r));
			} finally {
				((ut.transition = l), (W = r));
			}
			return null;
		}
		function Df(e, t, n, r) {
			do On();
			while (Ht !== null);
			if ((F & 6) !== 0) throw Error(m(327));
			n = e.finishedWork;
			var l = e.finishedLanes;
			if (n === null) return null;
			if (((e.finishedWork = null), (e.finishedLanes = 0), n === e.current))
				throw Error(m(177));
			((e.callbackNode = null), (e.callbackPriority = 0));
			var u = n.lanes | n.childLanes;
			if (
				(dc(e, u),
				e === _e && ((he = _e = null), (ze = 0)),
				((n.subtreeFlags & 2064) === 0 && (n.flags & 2064) === 0) ||
					yl ||
					((yl = !0),
					Ta(Cr, function () {
						return (On(), null);
					})),
				(u = (n.flags & 15990) !== 0),
				(n.subtreeFlags & 15990) !== 0 || u)
			) {
				((u = ut.transition), (ut.transition = null));
				var o = W;
				W = 1;
				var i = F;
				((F |= 4),
					(mo.current = null),
					Nf(e, n),
					ha(n, e),
					qc(xu),
					(Or = !!ku),
					(xu = ku = null),
					(e.current = n),
					zf(n),
					rc(),
					(F = i),
					(W = o),
					(ut.transition = u));
			} else e.current = n;
			if (
				(yl && ((yl = !1), (Ht = e), (gl = l)),
				(u = e.pendingLanes),
				u === 0 && ($t = null),
				oc(n.stateNode),
				Qe(e, pe()),
				t !== null)
			)
				for (r = e.onRecoverableError, n = 0; n < t.length; n++)
					((l = t[n]),
						r(l.value, { componentStack: l.stack, digest: l.digest }));
			if (vl) throw ((vl = !1), (e = yo), (yo = null), e);
			return (
				(gl & 1) !== 0 && e.tag !== 0 && On(),
				(u = e.pendingLanes),
				(u & 1) !== 0 ? (e === go ? yr++ : ((yr = 0), (go = e))) : (yr = 0),
				Ut(),
				null
			);
		}
		function On() {
			if (Ht !== null) {
				var e = pi(gl),
					t = ut.transition,
					n = W;
				try {
					if (((ut.transition = null), (W = 16 > e ? 16 : e), Ht === null))
						var r = !1;
					else {
						if (((e = Ht), (Ht = null), (gl = 0), (F & 6) !== 0))
							throw Error(m(331));
						var l = F;
						for (F |= 4, _ = e.current; _ !== null; ) {
							var u = _,
								o = u.child;
							if ((_.flags & 16) !== 0) {
								var i = u.deletions;
								if (i !== null) {
									for (var s = 0; s < i.length; s++) {
										var p = i[s];
										for (_ = p; _ !== null; ) {
											var y = _;
											switch (y.tag) {
												case 0:
												case 11:
												case 15:
													mr(8, y, u);
											}
											var g = y.child;
											if (g !== null) ((g.return = y), (_ = g));
											else
												for (; _ !== null; ) {
													y = _;
													var v = y.sibling,
														E = y.return;
													if ((ca(y), y === p)) {
														_ = null;
														break;
													}
													if (v !== null) {
														((v.return = E), (_ = v));
														break;
													}
													_ = E;
												}
										}
									}
									var C = u.alternate;
									if (C !== null) {
										var P = C.child;
										if (P !== null) {
											C.child = null;
											do {
												var me = P.sibling;
												((P.sibling = null), (P = me));
											} while (P !== null);
										}
									}
									_ = u;
								}
							}
							if ((u.subtreeFlags & 2064) !== 0 && o !== null)
								((o.return = u), (_ = o));
							else
								e: for (; _ !== null; ) {
									if (((u = _), (u.flags & 2048) !== 0))
										switch (u.tag) {
											case 0:
											case 11:
											case 15:
												mr(9, u, u.return);
										}
									var f = u.sibling;
									if (f !== null) {
										((f.return = u.return), (_ = f));
										break e;
									}
									_ = u.return;
								}
						}
						var a = e.current;
						for (_ = a; _ !== null; ) {
							o = _;
							var d = o.child;
							if ((o.subtreeFlags & 2064) !== 0 && d !== null)
								((d.return = o), (_ = d));
							else
								e: for (o = a; _ !== null; ) {
									if (((i = _), (i.flags & 2048) !== 0))
										try {
											switch (i.tag) {
												case 0:
												case 11:
												case 15:
													pl(9, i);
											}
										} catch (z) {
											ce(i, i.return, z);
										}
									if (i === o) {
										_ = null;
										break e;
									}
									var w = i.sibling;
									if (w !== null) {
										((w.return = i.return), (_ = w));
										break e;
									}
									_ = i.return;
								}
						}
						if (
							((F = l),
							Ut(),
							vt && typeof vt.onPostCommitFiberRoot == "function")
						)
							try {
								vt.onPostCommitFiberRoot(Pr, e);
							} catch {}
						r = !0;
					}
					return r;
				} finally {
					((W = n), (ut.transition = t));
				}
			}
			return !1;
		}
		function Pa(e, t, n) {
			((t = zn(n, t)),
				(t = Ws(e, t, 1)),
				(e = Vt(e, t, 1)),
				(t = Ue()),
				e !== null && (Bn(e, 1, t), Qe(e, t)));
		}
		function ce(e, t, n) {
			if (e.tag === 3) Pa(e, e, n);
			else
				for (; t !== null; ) {
					if (t.tag === 3) {
						Pa(t, e, n);
						break;
					} else if (t.tag === 1) {
						var r = t.stateNode;
						if (
							typeof t.type.getDerivedStateFromError == "function" ||
							(typeof r.componentDidCatch == "function" &&
								($t === null || !$t.has(r)))
						) {
							((e = zn(n, e)),
								(e = Qs(t, e, 1)),
								(t = Vt(t, e, 1)),
								(e = Ue()),
								t !== null && (Bn(t, 1, e), Qe(t, e)));
							break;
						}
					}
					t = t.return;
				}
		}
		function If(e, t, n) {
			var r = e.pingCache;
			(r !== null && r.delete(t),
				(t = Ue()),
				(e.pingedLanes |= e.suspendedLanes & n),
				_e === e &&
					(ze & n) === n &&
					(Se === 4 || (Se === 3 && (ze & 130023424) === ze && 500 > pe() - vo)
						? ln(e, 0)
						: (ho |= n)),
				Qe(e, t));
		}
		function Na(e, t) {
			t === 0 &&
				((e.mode & 1) === 0
					? (t = 1)
					: ((t = zr), (zr <<= 1), (zr & 130023424) === 0 && (zr = 4194304)));
			var n = Ue();
			((e = Ct(e, t)), e !== null && (Bn(e, t, n), Qe(e, n)));
		}
		function Mf(e) {
			var t = e.memoizedState,
				n = 0;
			(t !== null && (n = t.retryLane), Na(e, n));
		}
		function jf(e, t) {
			var n = 0;
			switch (e.tag) {
				case 13:
					var r = e.stateNode,
						l = e.memoizedState;
					l !== null && (n = l.retryLane);
					break;
				case 19:
					r = e.stateNode;
					break;
				default:
					throw Error(m(314));
			}
			(r !== null && r.delete(t), Na(e, n));
		}
		var za;
		za = function (e, t, n) {
			if (e !== null)
				if (e.memoizedProps !== t.pendingProps || Be.current) He = !0;
				else {
					if ((e.lanes & n) === 0 && (t.flags & 128) === 0)
						return ((He = !1), Ef(e, t, n));
					He = (e.flags & 131072) !== 0;
				}
			else ((He = !1), le && (t.flags & 1048576) !== 0 && is(t, Zr, t.index));
			switch (((t.lanes = 0), t.tag)) {
				case 2:
					var r = t.type;
					(fl(e, t), (e = t.pendingProps));
					var l = Sn(t, Le.current);
					(Pn(t, n), (l = Ku(null, t, r, e, l, n)));
					var u = Yu();
					return (
						(t.flags |= 1),
						typeof l == "object" &&
						l !== null &&
						typeof l.render == "function" &&
						l.$$typeof === void 0
							? ((t.tag = 1),
								(t.memoizedState = null),
								(t.updateQueue = null),
								$e(r) ? ((u = !0), Yr(t)) : (u = !1),
								(t.memoizedState =
									l.state !== null && l.state !== void 0 ? l.state : null),
								Au(t),
								(l.updater = al),
								(t.stateNode = l),
								(l._reactInternals = t),
								bu(t, r, e, n),
								(t = ro(null, t, r, !0, u, n)))
							: ((t.tag = 0),
								le && u && Tu(t),
								Fe(null, t, l, n),
								(t = t.child)),
						t
					);
				case 16:
					r = t.elementType;
					e: {
						switch (
							(fl(e, t),
							(e = t.pendingProps),
							(l = r._init),
							(r = l(r._payload)),
							(t.type = r),
							(l = t.tag = Uf(r)),
							(e = dt(r, e)),
							l)
						) {
							case 0:
								t = no(null, t, r, e, n);
								break e;
							case 1:
								t = ea(null, t, r, e, n);
								break e;
							case 11:
								t = Gs(null, t, r, e, n);
								break e;
							case 14:
								t = Zs(null, t, r, dt(r.type, e), n);
								break e;
						}
						throw Error(m(306, r, ""));
					}
					return t;
				case 0:
					return (
						(r = t.type),
						(l = t.pendingProps),
						(l = t.elementType === r ? l : dt(r, l)),
						no(e, t, r, l, n)
					);
				case 1:
					return (
						(r = t.type),
						(l = t.pendingProps),
						(l = t.elementType === r ? l : dt(r, l)),
						ea(e, t, r, l, n)
					);
				case 3:
					e: {
						if ((ta(t), e === null)) throw Error(m(387));
						((r = t.pendingProps),
							(u = t.memoizedState),
							(l = u.element),
							vs(e, t),
							nl(t, r, null, n));
						var o = t.memoizedState;
						if (((r = o.element), u.isDehydrated))
							if (
								((u = {
									element: r,
									isDehydrated: !1,
									cache: o.cache,
									pendingSuspenseBoundaries: o.pendingSuspenseBoundaries,
									transitions: o.transitions,
								}),
								(t.updateQueue.baseState = u),
								(t.memoizedState = u),
								t.flags & 256)
							) {
								((l = zn(Error(m(423)), t)), (t = na(e, t, r, n, l)));
								break e;
							} else if (r !== l) {
								((l = zn(Error(m(424)), t)), (t = na(e, t, r, n, l)));
								break e;
							} else
								for (
									Je = Mt(t.stateNode.containerInfo.firstChild),
										Ze = t,
										le = !0,
										ft = null,
										n = ms(t, null, r, n),
										t.child = n;
									n;

								)
									((n.flags = (n.flags & -3) | 4096), (n = n.sibling));
						else {
							if ((En(), r === l)) {
								t = Nt(e, t, n);
								break e;
							}
							Fe(e, t, r, n);
						}
						t = t.child;
					}
					return t;
				case 5:
					return (
						ws(t),
						e === null && Ou(t),
						(r = t.type),
						(l = t.pendingProps),
						(u = e !== null ? e.memoizedProps : null),
						(o = l.children),
						Eu(r, l) ? (o = null) : u !== null && Eu(r, u) && (t.flags |= 32),
						bs(e, t),
						Fe(e, t, o, n),
						t.child
					);
				case 6:
					return (e === null && Ou(t), null);
				case 13:
					return ra(e, t, n);
				case 4:
					return (
						Vu(t, t.stateNode.containerInfo),
						(r = t.pendingProps),
						e === null ? (t.child = _n(t, null, r, n)) : Fe(e, t, r, n),
						t.child
					);
				case 11:
					return (
						(r = t.type),
						(l = t.pendingProps),
						(l = t.elementType === r ? l : dt(r, l)),
						Gs(e, t, r, l, n)
					);
				case 7:
					return (Fe(e, t, t.pendingProps, n), t.child);
				case 8:
					return (Fe(e, t, t.pendingProps.children, n), t.child);
				case 12:
					return (Fe(e, t, t.pendingProps.children, n), t.child);
				case 10:
					e: {
						if (
							((r = t.type._context),
							(l = t.pendingProps),
							(u = t.memoizedProps),
							(o = l.value),
							Z(br, r._currentValue),
							(r._currentValue = o),
							u !== null)
						)
							if (ct(u.value, o)) {
								if (u.children === l.children && !Be.current) {
									t = Nt(e, t, n);
									break e;
								}
							} else
								for (u = t.child, u !== null && (u.return = t); u !== null; ) {
									var i = u.dependencies;
									if (i !== null) {
										o = u.child;
										for (var s = i.firstContext; s !== null; ) {
											if (s.context === r) {
												if (u.tag === 1) {
													((s = Pt(-1, n & -n)), (s.tag = 2));
													var p = u.updateQueue;
													if (p !== null) {
														p = p.shared;
														var y = p.pending;
														(y === null
															? (s.next = s)
															: ((s.next = y.next), (y.next = s)),
															(p.pending = s));
													}
												}
												((u.lanes |= n),
													(s = u.alternate),
													s !== null && (s.lanes |= n),
													Fu(u.return, n, t),
													(i.lanes |= n));
												break;
											}
											s = s.next;
										}
									} else if (u.tag === 10)
										o = u.type === t.type ? null : u.child;
									else if (u.tag === 18) {
										if (((o = u.return), o === null)) throw Error(m(341));
										((o.lanes |= n),
											(i = o.alternate),
											i !== null && (i.lanes |= n),
											Fu(o, n, t),
											(o = u.sibling));
									} else o = u.child;
									if (o !== null) o.return = u;
									else
										for (o = u; o !== null; ) {
											if (o === t) {
												o = null;
												break;
											}
											if (((u = o.sibling), u !== null)) {
												((u.return = o.return), (o = u));
												break;
											}
											o = o.return;
										}
									u = o;
								}
						(Fe(e, t, l.children, n), (t = t.child));
					}
					return t;
				case 9:
					return (
						(l = t.type),
						(r = t.pendingProps.children),
						Pn(t, n),
						(l = rt(l)),
						(r = r(l)),
						(t.flags |= 1),
						Fe(e, t, r, n),
						t.child
					);
				case 14:
					return (
						(r = t.type),
						(l = dt(r, t.pendingProps)),
						(l = dt(r.type, l)),
						Zs(e, t, r, l, n)
					);
				case 15:
					return Js(e, t, t.type, t.pendingProps, n);
				case 17:
					return (
						(r = t.type),
						(l = t.pendingProps),
						(l = t.elementType === r ? l : dt(r, l)),
						fl(e, t),
						(t.tag = 1),
						$e(r) ? ((e = !0), Yr(t)) : (e = !1),
						Pn(t, n),
						$s(t, r, l),
						bu(t, r, l, n),
						ro(null, t, r, !0, e, n)
					);
				case 19:
					return ua(e, t, n);
				case 22:
					return qs(e, t, n);
			}
			throw Error(m(156, t.tag));
		};
		function Ta(e, t) {
			return si(e, t);
		}
		function Ff(e, t, n, r) {
			((this.tag = e),
				(this.key = n),
				(this.sibling =
					this.child =
					this.return =
					this.stateNode =
					this.type =
					this.elementType =
						null),
				(this.index = 0),
				(this.ref = null),
				(this.pendingProps = t),
				(this.dependencies =
					this.memoizedState =
					this.updateQueue =
					this.memoizedProps =
						null),
				(this.mode = r),
				(this.subtreeFlags = this.flags = 0),
				(this.deletions = null),
				(this.childLanes = this.lanes = 0),
				(this.alternate = null));
		}
		function ot(e, t, n, r) {
			return new Ff(e, t, n, r);
		}
		function _o(e) {
			return ((e = e.prototype), !(!e || !e.isReactComponent));
		}
		function Uf(e) {
			if (typeof e == "function") return _o(e) ? 1 : 0;
			if (e != null) {
				if (((e = e.$$typeof), e === Re)) return 11;
				if (e === Ye) return 14;
			}
			return 2;
		}
		function Kt(e, t) {
			var n = e.alternate;
			return (
				n === null
					? ((n = ot(e.tag, t, e.key, e.mode)),
						(n.elementType = e.elementType),
						(n.type = e.type),
						(n.stateNode = e.stateNode),
						(n.alternate = e),
						(e.alternate = n))
					: ((n.pendingProps = t),
						(n.type = e.type),
						(n.flags = 0),
						(n.subtreeFlags = 0),
						(n.deletions = null)),
				(n.flags = e.flags & 14680064),
				(n.childLanes = e.childLanes),
				(n.lanes = e.lanes),
				(n.child = e.child),
				(n.memoizedProps = e.memoizedProps),
				(n.memoizedState = e.memoizedState),
				(n.updateQueue = e.updateQueue),
				(t = e.dependencies),
				(n.dependencies =
					t === null ? null : { lanes: t.lanes, firstContext: t.firstContext }),
				(n.sibling = e.sibling),
				(n.index = e.index),
				(n.ref = e.ref),
				n
			);
		}
		function xl(e, t, n, r, l, u) {
			var o = 2;
			if (((r = e), typeof e == "function")) _o(e) && (o = 1);
			else if (typeof e == "string") o = 5;
			else
				e: switch (e) {
					case ae:
						return on(n.children, l, u, t);
					case de:
						((o = 8), (l |= 8));
						break;
					case Te:
						return (
							(e = ot(12, n, t, l | 2)),
							(e.elementType = Te),
							(e.lanes = u),
							e
						);
					case ke:
						return (
							(e = ot(13, n, t, l)),
							(e.elementType = ke),
							(e.lanes = u),
							e
						);
					case xe:
						return (
							(e = ot(19, n, t, l)),
							(e.elementType = xe),
							(e.lanes = u),
							e
						);
					case X:
						return El(n, l, u, t);
					default:
						if (typeof e == "object" && e !== null)
							switch (e.$$typeof) {
								case it:
									o = 10;
									break e;
								case st:
									o = 9;
									break e;
								case Re:
									o = 11;
									break e;
								case Ye:
									o = 14;
									break e;
								case Pe:
									((o = 16), (r = null));
									break e;
							}
						throw Error(m(130, e == null ? e : typeof e, ""));
				}
			return (
				(t = ot(o, n, t, l)),
				(t.elementType = e),
				(t.type = r),
				(t.lanes = u),
				t
			);
		}
		function on(e, t, n, r) {
			return ((e = ot(7, e, r, t)), (e.lanes = n), e);
		}
		function El(e, t, n, r) {
			return (
				(e = ot(22, e, r, t)),
				(e.elementType = X),
				(e.lanes = n),
				(e.stateNode = { isHidden: !1 }),
				e
			);
		}
		function Co(e, t, n) {
			return ((e = ot(6, e, null, t)), (e.lanes = n), e);
		}
		function Po(e, t, n) {
			return (
				(t = ot(4, e.children !== null ? e.children : [], e.key, t)),
				(t.lanes = n),
				(t.stateNode = {
					containerInfo: e.containerInfo,
					pendingChildren: null,
					implementation: e.implementation,
				}),
				t
			);
		}
		function Af(e, t, n, r, l) {
			((this.tag = t),
				(this.containerInfo = e),
				(this.finishedWork =
					this.pingCache =
					this.current =
					this.pendingChildren =
						null),
				(this.timeoutHandle = -1),
				(this.callbackNode = this.pendingContext = this.context = null),
				(this.callbackPriority = 0),
				(this.eventTimes = ql(0)),
				(this.expirationTimes = ql(-1)),
				(this.entangledLanes =
					this.finishedLanes =
					this.mutableReadLanes =
					this.expiredLanes =
					this.pingedLanes =
					this.suspendedLanes =
					this.pendingLanes =
						0),
				(this.entanglements = ql(0)),
				(this.identifierPrefix = r),
				(this.onRecoverableError = l),
				(this.mutableSourceEagerHydrationData = null));
		}
		function No(e, t, n, r, l, u, o, i, s) {
			return (
				(e = new Af(e, t, n, i, s)),
				t === 1 ? ((t = 1), u === !0 && (t |= 8)) : (t = 0),
				(u = ot(3, null, null, t)),
				(e.current = u),
				(u.stateNode = e),
				(u.memoizedState = {
					element: r,
					isDehydrated: n,
					cache: null,
					transitions: null,
					pendingSuspenseBoundaries: null,
				}),
				Au(u),
				e
			);
		}
		function Vf(e, t, n) {
			var r =
				3 < arguments.length && arguments[3] !== void 0 ? arguments[3] : null;
			return {
				$$typeof: q,
				key: r == null ? null : "" + r,
				children: e,
				containerInfo: t,
				implementation: n,
			};
		}
		function Ra(e) {
			if (!e) return Ft;
			e = e._reactInternals;
			e: {
				if (Xt(e) !== e || e.tag !== 1) throw Error(m(170));
				var t = e;
				do {
					switch (t.tag) {
						case 3:
							t = t.stateNode.context;
							break e;
						case 1:
							if ($e(t.type)) {
								t = t.stateNode.__reactInternalMemoizedMergedChildContext;
								break e;
							}
					}
					t = t.return;
				} while (t !== null);
				throw Error(m(171));
			}
			if (e.tag === 1) {
				var n = e.type;
				if ($e(n)) return ls(e, n, t);
			}
			return t;
		}
		function La(e, t, n, r, l, u, o, i, s) {
			return (
				(e = No(n, r, !0, e, l, u, o, i, s)),
				(e.context = Ra(null)),
				(n = e.current),
				(r = Ue()),
				(l = Wt(n)),
				(u = Pt(r, l)),
				(u.callback = t ?? null),
				Vt(n, u, l),
				(e.current.lanes = l),
				Bn(e, l, r),
				Qe(e, r),
				e
			);
		}
		function _l(e, t, n, r) {
			var l = t.current,
				u = Ue(),
				o = Wt(l);
			return (
				(n = Ra(n)),
				t.context === null ? (t.context = n) : (t.pendingContext = n),
				(t = Pt(u, o)),
				(t.payload = { element: e }),
				(r = r === void 0 ? null : r),
				r !== null && (t.callback = r),
				(e = Vt(l, t, o)),
				e !== null && (ht(e, l, o, u), tl(e, l, o)),
				o
			);
		}
		function Cl(e) {
			if (((e = e.current), !e.child)) return null;
			switch (e.child.tag) {
				case 5:
					return e.child.stateNode;
				default:
					return e.child.stateNode;
			}
		}
		function Oa(e, t) {
			if (((e = e.memoizedState), e !== null && e.dehydrated !== null)) {
				var n = e.retryLane;
				e.retryLane = n !== 0 && n < t ? n : t;
			}
		}
		function zo(e, t) {
			(Oa(e, t), (e = e.alternate) && Oa(e, t));
		}
		function Bf() {
			return null;
		}
		var Da =
			typeof reportError == "function"
				? reportError
				: function (e) {
						console.error(e);
					};
		function To(e) {
			this._internalRoot = e;
		}
		((Pl.prototype.render = To.prototype.render =
			function (e) {
				var t = this._internalRoot;
				if (t === null) throw Error(m(409));
				_l(e, t, null, null);
			}),
			(Pl.prototype.unmount = To.prototype.unmount =
				function () {
					var e = this._internalRoot;
					if (e !== null) {
						this._internalRoot = null;
						var t = e.containerInfo;
						(rn(function () {
							_l(null, e, null, null);
						}),
							(t[kt] = null));
					}
				}));
		function Pl(e) {
			this._internalRoot = e;
		}
		Pl.prototype.unstable_scheduleHydration = function (e) {
			if (e) {
				var t = vi();
				e = { blockedOn: null, target: e, priority: t };
				for (var n = 0; n < Ot.length && t !== 0 && t < Ot[n].priority; n++);
				(Ot.splice(n, 0, e), n === 0 && wi(e));
			}
		};
		function Ro(e) {
			return !(
				!e ||
				(e.nodeType !== 1 && e.nodeType !== 9 && e.nodeType !== 11)
			);
		}
		function Nl(e) {
			return !(
				!e ||
				(e.nodeType !== 1 &&
					e.nodeType !== 9 &&
					e.nodeType !== 11 &&
					(e.nodeType !== 8 || e.nodeValue !== " react-mount-point-unstable "))
			);
		}
		function Ia() {}
		function $f(e, t, n, r, l) {
			if (l) {
				if (typeof r == "function") {
					var u = r;
					r = function () {
						var p = Cl(o);
						u.call(p);
					};
				}
				var o = La(t, r, e, 0, null, !1, !1, "", Ia);
				return (
					(e._reactRootContainer = o),
					(e[kt] = o.current),
					tr(e.nodeType === 8 ? e.parentNode : e),
					rn(),
					o
				);
			}
			for (; (l = e.lastChild); ) e.removeChild(l);
			if (typeof r == "function") {
				var i = r;
				r = function () {
					var p = Cl(s);
					i.call(p);
				};
			}
			var s = No(e, 0, !1, null, null, !1, !1, "", Ia);
			return (
				(e._reactRootContainer = s),
				(e[kt] = s.current),
				tr(e.nodeType === 8 ? e.parentNode : e),
				rn(function () {
					_l(t, s, n, r);
				}),
				s
			);
		}
		function zl(e, t, n, r, l) {
			var u = n._reactRootContainer;
			if (u) {
				var o = u;
				if (typeof l == "function") {
					var i = l;
					l = function () {
						var s = Cl(o);
						i.call(s);
					};
				}
				_l(t, o, e, l);
			} else o = $f(n, t, e, l, r);
			return Cl(o);
		}
		((mi = function (e) {
			switch (e.tag) {
				case 3:
					var t = e.stateNode;
					if (t.current.memoizedState.isDehydrated) {
						var n = Vn(t.pendingLanes);
						n !== 0 &&
							(bl(t, n | 1),
							Qe(t, pe()),
							(F & 6) === 0 && ((Ln = pe() + 500), Ut()));
					}
					break;
				case 13:
					(rn(function () {
						var r = Ct(e, 1);
						if (r !== null) {
							var l = Ue();
							ht(r, e, 1, l);
						}
					}),
						zo(e, 1));
			}
		}),
			(eu = function (e) {
				if (e.tag === 13) {
					var t = Ct(e, 134217728);
					if (t !== null) {
						var n = Ue();
						ht(t, e, 134217728, n);
					}
					zo(e, 134217728);
				}
			}),
			(hi = function (e) {
				if (e.tag === 13) {
					var t = Wt(e),
						n = Ct(e, t);
					if (n !== null) {
						var r = Ue();
						ht(n, e, t, r);
					}
					zo(e, t);
				}
			}),
			(vi = function () {
				return W;
			}),
			(yi = function (e, t) {
				var n = W;
				try {
					return ((W = e), t());
				} finally {
					W = n;
				}
			}),
			(Kl = function (e, t, n) {
				switch (t) {
					case "input":
						if ((Ul(e, n), (t = n.name), n.type === "radio" && t != null)) {
							for (n = e; n.parentNode; ) n = n.parentNode;
							for (
								n = n.querySelectorAll(
									"input[name=" + JSON.stringify("" + t) + '][type="radio"]',
								),
									t = 0;
								t < n.length;
								t++
							) {
								var r = n[t];
								if (r !== e && r.form === e.form) {
									var l = Qr(r);
									if (!l) throw Error(m(90));
									(Bo(r), Ul(r, l));
								}
							}
						}
						break;
					case "textarea":
						Ko(e, n);
						break;
					case "select":
						((t = n.value), t != null && sn(e, !!n.multiple, t, !1));
				}
			}),
			(ti = ko),
			(ni = rn));
		var Hf = { usingClientEntryPoint: !1, Events: [lr, gn, Qr, bo, ei, ko] },
			gr = {
				findFiberByHostInstance: Gt,
				bundleType: 0,
				version: "18.3.1",
				rendererPackageName: "react-dom",
			},
			Wf = {
				bundleType: gr.bundleType,
				version: gr.version,
				rendererPackageName: gr.rendererPackageName,
				rendererConfig: gr.rendererConfig,
				overrideHookState: null,
				overrideHookStateDeletePath: null,
				overrideHookStateRenamePath: null,
				overrideProps: null,
				overridePropsDeletePath: null,
				overridePropsRenamePath: null,
				setErrorHandler: null,
				setSuspenseHandler: null,
				scheduleUpdate: null,
				currentDispatcherRef: se.ReactCurrentDispatcher,
				findHostInstanceByFiber: function (e) {
					return ((e = oi(e)), e === null ? null : e.stateNode);
				},
				findFiberByHostInstance: gr.findFiberByHostInstance || Bf,
				findHostInstancesForRefresh: null,
				scheduleRefresh: null,
				scheduleRoot: null,
				setRefreshHandler: null,
				getCurrentFiber: null,
				reconcilerVersion: "18.3.1-next-f1338f8080-20240426",
			};
		if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ < "u") {
			var Tl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
			if (!Tl.isDisabled && Tl.supportsFiber)
				try {
					((Pr = Tl.inject(Wf)), (vt = Tl));
				} catch {}
		}
		return (
			(Ae.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = Hf),
			(Ae.createPortal = function (e, t) {
				var n =
					2 < arguments.length && arguments[2] !== void 0 ? arguments[2] : null;
				if (!Ro(t)) throw Error(m(200));
				return Vf(e, t, null, n);
			}),
			(Ae.createRoot = function (e, t) {
				if (!Ro(e)) throw Error(m(299));
				var n = !1,
					r = "",
					l = Da;
				return (
					t != null &&
						(t.unstable_strictMode === !0 && (n = !0),
						t.identifierPrefix !== void 0 && (r = t.identifierPrefix),
						t.onRecoverableError !== void 0 && (l = t.onRecoverableError)),
					(t = No(e, 1, !1, null, null, n, !1, r, l)),
					(e[kt] = t.current),
					tr(e.nodeType === 8 ? e.parentNode : e),
					new To(t)
				);
			}),
			(Ae.findDOMNode = function (e) {
				if (e == null) return null;
				if (e.nodeType === 1) return e;
				var t = e._reactInternals;
				if (t === void 0)
					throw typeof e.render == "function"
						? Error(m(188))
						: ((e = Object.keys(e).join(",")), Error(m(268, e)));
				return ((e = oi(t)), (e = e === null ? null : e.stateNode), e);
			}),
			(Ae.flushSync = function (e) {
				return rn(e);
			}),
			(Ae.hydrate = function (e, t, n) {
				if (!Nl(t)) throw Error(m(200));
				return zl(null, e, t, !0, n);
			}),
			(Ae.hydrateRoot = function (e, t, n) {
				if (!Ro(e)) throw Error(m(405));
				var r = (n != null && n.hydratedSources) || null,
					l = !1,
					u = "",
					o = Da;
				if (
					(n != null &&
						(n.unstable_strictMode === !0 && (l = !0),
						n.identifierPrefix !== void 0 && (u = n.identifierPrefix),
						n.onRecoverableError !== void 0 && (o = n.onRecoverableError)),
					(t = La(t, null, e, 1, n ?? null, l, !1, u, o)),
					(e[kt] = t.current),
					tr(e),
					r)
				)
					for (e = 0; e < r.length; e++)
						((n = r[e]),
							(l = n._getVersion),
							(l = l(n._source)),
							t.mutableSourceEagerHydrationData == null
								? (t.mutableSourceEagerHydrationData = [n, l])
								: t.mutableSourceEagerHydrationData.push(n, l));
				return new Pl(t);
			}),
			(Ae.render = function (e, t, n) {
				if (!Nl(t)) throw Error(m(200));
				return zl(null, e, t, !1, n);
			}),
			(Ae.unmountComponentAtNode = function (e) {
				if (!Nl(e)) throw Error(m(40));
				return e._reactRootContainer
					? (rn(function () {
							zl(null, null, e, !1, function () {
								((e._reactRootContainer = null), (e[kt] = null));
							});
						}),
						!0)
					: !1;
			}),
			(Ae.unstable_batchedUpdates = ko),
			(Ae.unstable_renderSubtreeIntoContainer = function (e, t, n, r) {
				if (!Nl(n)) throw Error(m(200));
				if (e == null || e._reactInternals === void 0) throw Error(m(38));
				return zl(e, t, n, !1, r);
			}),
			(Ae.version = "18.3.1-next-f1338f8080-20240426"),
			Ae
		);
	}
	var Uo;
	function Ha() {
		if (Uo) return Dl.exports;
		Uo = 1;
		function k() {
			if (
				!(
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ > "u" ||
					typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE != "function"
				)
			)
				try {
					__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(k);
				} catch (O) {
					console.error(O);
				}
		}
		return (k(), (Dl.exports = $a()), Dl.exports);
	}
	var Ao;
	function Wa() {
		if (Ao) return wr;
		Ao = 1;
		var k = Ha();
		return (
			(wr.createRoot = k.createRoot),
			(wr.hydrateRoot = k.hydrateRoot),
			wr
		);
	}
	var Qa = Wa();
	const Vo = "orchestra_embed_thread_";
	function Ka(k) {
		return typeof k == "string"
			? k
			: Array.isArray(k)
				? k
						.filter(
							(O) =>
								(O == null ? void 0 : O.type) === "text" &&
								typeof (O == null ? void 0 : O.text) == "string",
						)
						.map((O) => O.text)
						.join("")
				: "";
	}
	function Ya({ agentId: k, apiBase: O, token: m }) {
		const [te, ye] = Ke.useState(!1),
			[fe, ie] = Ke.useState([]),
			[J, $] = Ke.useState(""),
			[ne, ge] = Ke.useState(!1),
			[K, Y] = Ke.useState(() => {
				try {
					return localStorage.getItem(`${Vo}${k}`);
				} catch {
					return null;
				}
			}),
			Me = Ke.useRef(null),
			je = Ke.useRef(null),
			Q = Ke.useRef(null);
		(Ke.useEffect(() => {
			var j;
			(j = Me.current) == null || j.scrollIntoView({ behavior: "smooth" });
		}, [fe]),
			Ke.useEffect(() => {
				te &&
					setTimeout(() => {
						var j;
						return (j = je.current) == null ? void 0 : j.focus();
					}, 100);
			}, [te]));
		const B = Ke.useCallback(
				(j) => {
					Y(j);
					try {
						localStorage.setItem(`${Vo}${k}`, j);
					} catch {}
				},
				[k],
			),
			be = Ke.useCallback(async () => {
				var Ve;
				const j = J.trim();
				if (!j || ne) return;
				(ie((q) => [...q, { role: "user", content: j }]),
					$(""),
					ge(!0),
					ie((q) => [...q, { role: "assistant", content: "" }]));
				const se = new AbortController();
				Q.current = se;
				try {
					const q = { "Content-Type": "application/json" };
					m && (q.Authorization = `Bearer ${m}`);
					const ae = await fetch(
						`${O}/api/v0/assistants/public/${k}/embed-chat`,
						{
							method: "POST",
							headers: q,
							body: JSON.stringify({ message: j, thread_id: K }),
							signal: se.signal,
						},
					);
					if (!ae.ok) {
						let Re = `Error: ${ae.status}`;
						try {
							Re = (await ae.json()).detail || Re;
						} catch {}
						ie((ke) => {
							const xe = [...ke];
							return (
								(xe[xe.length - 1] = { role: "assistant", content: Re }),
								xe
							);
						});
						return;
					}
					const de = ae.headers.get("X-Thread-Id");
					de && B(de);
					const Te = (Ve = ae.body) == null ? void 0 : Ve.getReader();
					if (!Te) return;
					const it = new TextDecoder();
					let st = "";
					for (;;) {
						const { done: Re, value: ke } = await Te.read();
						if (Re) break;
						st += it.decode(ke, { stream: !0 });
						const xe = st.split(`
`);
						st = xe.pop() || "";
						for (const Ye of xe) {
							if (!Ye.startsWith("data: ")) continue;
							const Pe = Ye.slice(6).trim();
							if (Pe !== "[DONE]")
								try {
									const X = JSON.parse(Pe);
									if (!Array.isArray(X) || X.length < 2) continue;
									const [S, N] = X;
									if (
										(S === "metadata" &&
											N != null &&
											N.thread_id &&
											B(N.thread_id),
										S === "messages" && Array.isArray(N))
									) {
										const x = N[0];
										if (x && x.content !== void 0) {
											const c = Ka(x.content);
											c &&
												ie((h) => {
													const L = [...h],
														I = L[L.length - 1];
													return (
														(I == null ? void 0 : I.role) === "assistant" &&
															(L[L.length - 1] = {
																...I,
																content: I.content + c,
															}),
														L
													);
												});
										}
									}
									if (S === "error") {
										const x =
											typeof N == "string"
												? N
												: (N == null ? void 0 : N.error) || "An error occurred";
										ie((c) => {
											const h = [...c],
												L = h[h.length - 1];
											return (
												(L == null ? void 0 : L.role) === "assistant" &&
													!L.content &&
													(h[h.length - 1] = { role: "assistant", content: x }),
												h
											);
										});
									}
								} catch {}
						}
					}
				} catch (q) {
					q instanceof Error &&
						q.name !== "AbortError" &&
						ie((ae) => {
							const de = [...ae],
								Te = de[de.length - 1];
							return (
								(Te == null ? void 0 : Te.role) === "assistant" &&
									!Te.content &&
									(de[de.length - 1] = {
										role: "assistant",
										content: "Failed to get response. Please try again.",
									}),
								de
							);
						});
				} finally {
					(ge(!1), (Q.current = null));
				}
			}, [J, ne, k, O, m, K, B]),
			et = (j) => {
				j.key === "Enter" && !j.shiftKey && (j.preventDefault(), be());
			};
		return ve.jsxs("div", {
			style: {
				position: "fixed",
				bottom: "20px",
				right: "20px",
				zIndex: 2147483647,
				fontFamily: "system-ui, -apple-system, sans-serif",
			},
			children: [
				te &&
					ve.jsxs("div", {
						style: {
							width: "380px",
							height: "520px",
							marginBottom: "12px",
							borderRadius: "12px",
							background: "#fff",
							boxShadow: "0 8px 32px rgba(0,0,0,0.16)",
							display: "flex",
							flexDirection: "column",
							overflow: "hidden",
							border: "1px solid #e5e7eb",
						},
						children: [
							ve.jsxs("div", {
								style: {
									padding: "14px 16px",
									background: "#111",
									color: "#fff",
									fontSize: "14px",
									fontWeight: 600,
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									flexShrink: 0,
								},
								children: [
									ve.jsx("span", { children: "Chat" }),
									ve.jsx("button", {
										onClick: () => ye(!1),
										style: {
											background: "none",
											border: "none",
											color: "#fff",
											cursor: "pointer",
											fontSize: "18px",
											padding: "0 4px",
											lineHeight: 1,
										},
										children: "✕",
									}),
								],
							}),
							ve.jsxs("div", {
								style: {
									flex: 1,
									overflowY: "auto",
									padding: "12px",
									display: "flex",
									flexDirection: "column",
									gap: "8px",
								},
								children: [
									fe.length === 0 &&
										ve.jsx("div", {
											style: {
												flex: 1,
												display: "flex",
												alignItems: "center",
												justifyContent: "center",
												color: "#9ca3af",
												fontSize: "13px",
												textAlign: "center",
												padding: "20px",
											},
											children: "Send a message to start chatting",
										}),
									fe.map((j, se) =>
										ve.jsx(
											"div",
											{
												style: {
													display: "flex",
													justifyContent:
														j.role === "user" ? "flex-end" : "flex-start",
												},
												children: ve.jsx("div", {
													style: {
														maxWidth: "80%",
														padding: "8px 12px",
														borderRadius:
															j.role === "user"
																? "12px 12px 2px 12px"
																: "12px 12px 12px 2px",
														background: j.role === "user" ? "#111" : "#f3f4f6",
														color: j.role === "user" ? "#fff" : "#111",
														fontSize: "13px",
														lineHeight: "1.5",
														wordBreak: "break-word",
														whiteSpace: "pre-wrap",
													},
													children:
														j.content ||
														(ne && se === fe.length - 1
															? ve.jsx("span", {
																	style: { color: "#9ca3af" },
																	children: "…",
																})
															: null),
												}),
											},
											se,
										),
									),
									ve.jsx("div", { ref: Me }),
								],
							}),
							ve.jsxs("div", {
								style: {
									padding: "10px 12px",
									borderTop: "1px solid #e5e7eb",
									display: "flex",
									gap: "8px",
									flexShrink: 0,
								},
								children: [
									ve.jsx("input", {
										ref: je,
										type: "text",
										value: J,
										onChange: (j) => $(j.target.value),
										onKeyDown: et,
										placeholder: "Type a message...",
										disabled: ne,
										style: {
											flex: 1,
											padding: "8px 12px",
											borderRadius: "8px",
											border: "1px solid #e5e7eb",
											fontSize: "13px",
											outline: "none",
											background: ne ? "#f9fafb" : "#fff",
											color: "#111",
											fontFamily: "inherit",
										},
									}),
									ve.jsx("button", {
										onClick: be,
										disabled: ne || !J.trim(),
										style: {
											padding: "8px 14px",
											borderRadius: "8px",
											border: "none",
											background: ne || !J.trim() ? "#d1d5db" : "#111",
											color: "#fff",
											cursor: ne || !J.trim() ? "default" : "pointer",
											fontSize: "13px",
											fontWeight: 500,
											fontFamily: "inherit",
											flexShrink: 0,
										},
										children: "Send",
									}),
								],
							}),
							ve.jsxs("div", {
								style: {
									padding: "6px 12px",
									textAlign: "center",
									fontSize: "11px",
									color: "#9ca3af",
									borderTop: "1px solid #e5e7eb",
									flexShrink: 0,
								},
								children: [
									"Powered by",
									" ",
									ve.jsx("a", {
										href: `${O}/a/${k}`,
										target: "_blank",
										rel: "noopener noreferrer",
										style: { color: "#6b7280", textDecoration: "underline" },
										children: "Orchestra",
									}),
								],
							}),
						],
					}),
				ve.jsx("button", {
					onClick: () => ye(!te),
					"aria-label": te ? "Close chat" : "Open chat",
					style: {
						width: "56px",
						height: "56px",
						borderRadius: "50%",
						background: "#111",
						color: "#fff",
						border: "none",
						cursor: "pointer",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
						fontSize: "24px",
						marginLeft: "auto",
					},
					children: te ? "✕" : "💬",
				}),
			],
		});
	}
	function Xa() {
		const k =
			document.currentScript ?? document.querySelector("script[data-agent-id]");
		if (!k) return null;
		const O = k.getAttribute("data-agent-id");
		if (!O) return null;
		const m = k.getAttribute("data-api-base") ?? window.location.origin,
			te = k.getAttribute("data-token") ?? void 0;
		return { agentId: O, apiBase: m, token: te };
	}
	function jl(k) {
		const O = Xa(),
			m = {
				agentId:
					(k == null ? void 0 : k.agentId) ??
					(O == null ? void 0 : O.agentId) ??
					"",
				apiBase:
					(k == null ? void 0 : k.apiBase) ??
					(O == null ? void 0 : O.apiBase) ??
					window.location.origin,
				token: (k == null ? void 0 : k.token) ?? (O == null ? void 0 : O.token),
			};
		if (!m.agentId) {
			console.error("[Orchestra Embed] Missing data-agent-id attribute");
			return;
		}
		const te = document.createElement("div");
		((te.id = "orchestra-embed-root"), document.body.appendChild(te));
		const ye = te.attachShadow({ mode: "open" }),
			fe = document.createElement("div");
		(ye.appendChild(fe),
			Qa.createRoot(fe).render(
				ve.jsx(Aa.StrictMode, {
					children: ve.jsx(Ya, {
						agentId: m.agentId,
						apiBase: m.apiBase,
						token: m.token,
					}),
				}),
			));
	}
	(typeof document < "u" &&
		(document.readyState === "loading"
			? document.addEventListener("DOMContentLoaded", () => jl())
			: jl()),
		(window.OrchestraEmbed = { init: jl }));
})();
