var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x2) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x2, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x2)(function(x2) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/constants.js
var require_constants = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/constants.js"(exports, module) {
    "use strict";
    var BINARY_TYPES = ["nodebuffer", "arraybuffer", "fragments"];
    var hasBlob = typeof Blob !== "undefined";
    if (hasBlob) BINARY_TYPES.push("blob");
    module.exports = {
      BINARY_TYPES,
      CLOSE_TIMEOUT: 3e4,
      EMPTY_BUFFER: Buffer.alloc(0),
      GUID: "258EAFA5-E914-47DA-95CA-C5AB0DC85B11",
      hasBlob,
      kForOnEventAttribute: /* @__PURE__ */ Symbol("kIsForOnEventAttribute"),
      kListener: /* @__PURE__ */ Symbol("kListener"),
      kStatusCode: /* @__PURE__ */ Symbol("status-code"),
      kWebSocket: /* @__PURE__ */ Symbol("websocket"),
      NOOP: () => {
      }
    };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/buffer-util.js
var require_buffer_util = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/buffer-util.js"(exports, module) {
    "use strict";
    var { EMPTY_BUFFER } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    function concat(list, totalLength) {
      if (list.length === 0) return EMPTY_BUFFER;
      if (list.length === 1) return list[0];
      const target = Buffer.allocUnsafe(totalLength);
      let offset = 0;
      for (let i2 = 0; i2 < list.length; i2++) {
        const buf = list[i2];
        target.set(buf, offset);
        offset += buf.length;
      }
      if (offset < totalLength) {
        return new FastBuffer(target.buffer, target.byteOffset, offset);
      }
      return target;
    }
    function _mask(source, mask, output, offset, length) {
      for (let i2 = 0; i2 < length; i2++) {
        output[offset + i2] = source[i2] ^ mask[i2 & 3];
      }
    }
    function _unmask(buffer, mask) {
      for (let i2 = 0; i2 < buffer.length; i2++) {
        buffer[i2] ^= mask[i2 & 3];
      }
    }
    function toArrayBuffer(buf) {
      if (buf.length === buf.buffer.byteLength) {
        return buf.buffer;
      }
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
    }
    function toBuffer(data) {
      toBuffer.readOnly = true;
      if (Buffer.isBuffer(data)) return data;
      let buf;
      if (data instanceof ArrayBuffer) {
        buf = new FastBuffer(data);
      } else if (ArrayBuffer.isView(data)) {
        buf = new FastBuffer(data.buffer, data.byteOffset, data.byteLength);
      } else {
        buf = Buffer.from(data);
        toBuffer.readOnly = false;
      }
      return buf;
    }
    module.exports = {
      concat,
      mask: _mask,
      toArrayBuffer,
      toBuffer,
      unmask: _unmask
    };
    if (!process.env.WS_NO_BUFFER_UTIL) {
      try {
        const bufferUtil = __require("bufferutil");
        module.exports.mask = function(source, mask, output, offset, length) {
          if (length < 48) _mask(source, mask, output, offset, length);
          else bufferUtil.mask(source, mask, output, offset, length);
        };
        module.exports.unmask = function(buffer, mask) {
          if (buffer.length < 32) _unmask(buffer, mask);
          else bufferUtil.unmask(buffer, mask);
        };
      } catch (e) {
      }
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/limiter.js
var require_limiter = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/limiter.js"(exports, module) {
    "use strict";
    var kDone = /* @__PURE__ */ Symbol("kDone");
    var kRun = /* @__PURE__ */ Symbol("kRun");
    var Limiter = class {
      /**
       * Creates a new `Limiter`.
       *
       * @param {Number} [concurrency=Infinity] The maximum number of jobs allowed
       *     to run concurrently
       */
      constructor(concurrency) {
        this[kDone] = () => {
          this.pending--;
          this[kRun]();
        };
        this.concurrency = concurrency || Infinity;
        this.jobs = [];
        this.pending = 0;
      }
      /**
       * Adds a job to the queue.
       *
       * @param {Function} job The job to run
       * @public
       */
      add(job) {
        this.jobs.push(job);
        this[kRun]();
      }
      /**
       * Removes a job from the queue and runs it if possible.
       *
       * @private
       */
      [kRun]() {
        if (this.pending === this.concurrency) return;
        if (this.jobs.length) {
          const job = this.jobs.shift();
          this.pending++;
          job(this[kDone]);
        }
      }
    };
    module.exports = Limiter;
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/permessage-deflate.js
var require_permessage_deflate = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/permessage-deflate.js"(exports, module) {
    "use strict";
    var zlib = __require("zlib");
    var bufferUtil = require_buffer_util();
    var Limiter = require_limiter();
    var { kStatusCode } = require_constants();
    var FastBuffer = Buffer[Symbol.species];
    var TRAILER = Buffer.from([0, 0, 255, 255]);
    var kPerMessageDeflate = /* @__PURE__ */ Symbol("permessage-deflate");
    var kTotalLength = /* @__PURE__ */ Symbol("total-length");
    var kCallback = /* @__PURE__ */ Symbol("callback");
    var kBuffers = /* @__PURE__ */ Symbol("buffers");
    var kError = /* @__PURE__ */ Symbol("error");
    var zlibLimiter;
    var PerMessageDeflate2 = class {
      /**
       * Creates a PerMessageDeflate instance.
       *
       * @param {Object} [options] Configuration options
       * @param {(Boolean|Number)} [options.clientMaxWindowBits] Advertise support
       *     for, or request, a custom client window size
       * @param {Boolean} [options.clientNoContextTakeover=false] Advertise/
       *     acknowledge disabling of client context takeover
       * @param {Number} [options.concurrencyLimit=10] The number of concurrent
       *     calls to zlib
       * @param {Boolean} [options.isServer=false] Create the instance in either
       *     server or client mode
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {(Boolean|Number)} [options.serverMaxWindowBits] Request/confirm the
       *     use of a custom server window size
       * @param {Boolean} [options.serverNoContextTakeover=false] Request/accept
       *     disabling of server context takeover
       * @param {Number} [options.threshold=1024] Size (in bytes) below which
       *     messages should not be compressed if context takeover is disabled
       * @param {Object} [options.zlibDeflateOptions] Options to pass to zlib on
       *     deflate
       * @param {Object} [options.zlibInflateOptions] Options to pass to zlib on
       *     inflate
       */
      constructor(options) {
        this._options = options || {};
        this._threshold = this._options.threshold !== void 0 ? this._options.threshold : 1024;
        this._maxPayload = this._options.maxPayload | 0;
        this._isServer = !!this._options.isServer;
        this._deflate = null;
        this._inflate = null;
        this.params = null;
        if (!zlibLimiter) {
          const concurrency = this._options.concurrencyLimit !== void 0 ? this._options.concurrencyLimit : 10;
          zlibLimiter = new Limiter(concurrency);
        }
      }
      /**
       * @type {String}
       */
      static get extensionName() {
        return "permessage-deflate";
      }
      /**
       * Create an extension negotiation offer.
       *
       * @return {Object} Extension parameters
       * @public
       */
      offer() {
        const params = {};
        if (this._options.serverNoContextTakeover) {
          params.server_no_context_takeover = true;
        }
        if (this._options.clientNoContextTakeover) {
          params.client_no_context_takeover = true;
        }
        if (this._options.serverMaxWindowBits) {
          params.server_max_window_bits = this._options.serverMaxWindowBits;
        }
        if (this._options.clientMaxWindowBits) {
          params.client_max_window_bits = this._options.clientMaxWindowBits;
        } else if (this._options.clientMaxWindowBits == null) {
          params.client_max_window_bits = true;
        }
        return params;
      }
      /**
       * Accept an extension negotiation offer/response.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Object} Accepted configuration
       * @public
       */
      accept(configurations) {
        configurations = this.normalizeParams(configurations);
        this.params = this._isServer ? this.acceptAsServer(configurations) : this.acceptAsClient(configurations);
        return this.params;
      }
      /**
       * Releases all resources used by the extension.
       *
       * @public
       */
      cleanup() {
        if (this._inflate) {
          this._inflate.close();
          this._inflate = null;
        }
        if (this._deflate) {
          const callback = this._deflate[kCallback];
          this._deflate.close();
          this._deflate = null;
          if (callback) {
            callback(
              new Error(
                "The deflate stream was closed while data was being processed"
              )
            );
          }
        }
      }
      /**
       *  Accept an extension negotiation offer.
       *
       * @param {Array} offers The extension negotiation offers
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsServer(offers) {
        const opts = this._options;
        const accepted = offers.find((params) => {
          if (opts.serverNoContextTakeover === false && params.server_no_context_takeover || params.server_max_window_bits && (opts.serverMaxWindowBits === false || typeof opts.serverMaxWindowBits === "number" && opts.serverMaxWindowBits > params.server_max_window_bits) || typeof opts.clientMaxWindowBits === "number" && (typeof params.client_max_window_bits === "number" ? opts.clientMaxWindowBits > params.client_max_window_bits : !params.client_max_window_bits)) {
            return false;
          }
          return true;
        });
        if (!accepted) {
          throw new Error("None of the extension offers can be accepted");
        }
        if (opts.serverNoContextTakeover) {
          accepted.server_no_context_takeover = true;
        }
        if (opts.clientNoContextTakeover) {
          accepted.client_no_context_takeover = true;
        }
        if (typeof opts.serverMaxWindowBits === "number") {
          accepted.server_max_window_bits = opts.serverMaxWindowBits;
        }
        if (typeof opts.clientMaxWindowBits === "number") {
          accepted.client_max_window_bits = opts.clientMaxWindowBits;
        } else if (accepted.client_max_window_bits === true || opts.clientMaxWindowBits === false) {
          delete accepted.client_max_window_bits;
        }
        return accepted;
      }
      /**
       * Accept the extension negotiation response.
       *
       * @param {Array} response The extension negotiation response
       * @return {Object} Accepted configuration
       * @private
       */
      acceptAsClient(response) {
        const params = response[0];
        if (this._options.clientNoContextTakeover === false && params.client_no_context_takeover) {
          throw new Error('Unexpected parameter "client_no_context_takeover"');
        }
        if (!params.client_max_window_bits) {
          if (typeof this._options.clientMaxWindowBits === "number") {
            params.client_max_window_bits = this._options.clientMaxWindowBits;
          }
        } else if (this._options.clientMaxWindowBits === false || typeof this._options.clientMaxWindowBits === "number" && params.client_max_window_bits > this._options.clientMaxWindowBits) {
          throw new Error(
            'Unexpected or invalid parameter "client_max_window_bits"'
          );
        }
        return params;
      }
      /**
       * Normalize parameters.
       *
       * @param {Array} configurations The extension negotiation offers/reponse
       * @return {Array} The offers/response with normalized parameters
       * @private
       */
      normalizeParams(configurations) {
        configurations.forEach((params) => {
          Object.keys(params).forEach((key) => {
            let value = params[key];
            if (value.length > 1) {
              throw new Error(`Parameter "${key}" must have only a single value`);
            }
            value = value[0];
            if (key === "client_max_window_bits") {
              if (value !== true) {
                const num = +value;
                if (!Number.isInteger(num) || num < 8 || num > 15) {
                  throw new TypeError(
                    `Invalid value for parameter "${key}": ${value}`
                  );
                }
                value = num;
              } else if (!this._isServer) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else if (key === "server_max_window_bits") {
              const num = +value;
              if (!Number.isInteger(num) || num < 8 || num > 15) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
              value = num;
            } else if (key === "client_no_context_takeover" || key === "server_no_context_takeover") {
              if (value !== true) {
                throw new TypeError(
                  `Invalid value for parameter "${key}": ${value}`
                );
              }
            } else {
              throw new Error(`Unknown parameter "${key}"`);
            }
            params[key] = value;
          });
        });
        return configurations;
      }
      /**
       * Decompress data. Concurrency limited.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      decompress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._decompress(data, fin, (err2, result) => {
            done();
            callback(err2, result);
          });
        });
      }
      /**
       * Compress data. Concurrency limited.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @public
       */
      compress(data, fin, callback) {
        zlibLimiter.add((done) => {
          this._compress(data, fin, (err2, result) => {
            done();
            callback(err2, result);
          });
        });
      }
      /**
       * Decompress data.
       *
       * @param {Buffer} data Compressed data
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _decompress(data, fin, callback) {
        const endpoint = this._isServer ? "client" : "server";
        if (!this._inflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._inflate = zlib.createInflateRaw({
            ...this._options.zlibInflateOptions,
            windowBits
          });
          this._inflate[kPerMessageDeflate] = this;
          this._inflate[kTotalLength] = 0;
          this._inflate[kBuffers] = [];
          this._inflate.on("error", inflateOnError);
          this._inflate.on("data", inflateOnData);
        }
        this._inflate[kCallback] = callback;
        this._inflate.write(data);
        if (fin) this._inflate.write(TRAILER);
        this._inflate.flush(() => {
          const err2 = this._inflate[kError];
          if (err2) {
            this._inflate.close();
            this._inflate = null;
            callback(err2);
            return;
          }
          const data2 = bufferUtil.concat(
            this._inflate[kBuffers],
            this._inflate[kTotalLength]
          );
          if (this._inflate._readableState.endEmitted) {
            this._inflate.close();
            this._inflate = null;
          } else {
            this._inflate[kTotalLength] = 0;
            this._inflate[kBuffers] = [];
            if (fin && this.params[`${endpoint}_no_context_takeover`]) {
              this._inflate.reset();
            }
          }
          callback(null, data2);
        });
      }
      /**
       * Compress data.
       *
       * @param {(Buffer|String)} data Data to compress
       * @param {Boolean} fin Specifies whether or not this is the last fragment
       * @param {Function} callback Callback
       * @private
       */
      _compress(data, fin, callback) {
        const endpoint = this._isServer ? "server" : "client";
        if (!this._deflate) {
          const key = `${endpoint}_max_window_bits`;
          const windowBits = typeof this.params[key] !== "number" ? zlib.Z_DEFAULT_WINDOWBITS : this.params[key];
          this._deflate = zlib.createDeflateRaw({
            ...this._options.zlibDeflateOptions,
            windowBits
          });
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          this._deflate.on("data", deflateOnData);
        }
        this._deflate[kCallback] = callback;
        this._deflate.write(data);
        this._deflate.flush(zlib.Z_SYNC_FLUSH, () => {
          if (!this._deflate) {
            return;
          }
          let data2 = bufferUtil.concat(
            this._deflate[kBuffers],
            this._deflate[kTotalLength]
          );
          if (fin) {
            data2 = new FastBuffer(data2.buffer, data2.byteOffset, data2.length - 4);
          }
          this._deflate[kCallback] = null;
          this._deflate[kTotalLength] = 0;
          this._deflate[kBuffers] = [];
          if (fin && this.params[`${endpoint}_no_context_takeover`]) {
            this._deflate.reset();
          }
          callback(null, data2);
        });
      }
    };
    module.exports = PerMessageDeflate2;
    function deflateOnData(chunk) {
      this[kBuffers].push(chunk);
      this[kTotalLength] += chunk.length;
    }
    function inflateOnData(chunk) {
      this[kTotalLength] += chunk.length;
      if (this[kPerMessageDeflate]._maxPayload < 1 || this[kTotalLength] <= this[kPerMessageDeflate]._maxPayload) {
        this[kBuffers].push(chunk);
        return;
      }
      this[kError] = new RangeError("Max payload size exceeded");
      this[kError].code = "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH";
      this[kError][kStatusCode] = 1009;
      this.removeListener("data", inflateOnData);
      this.reset();
    }
    function inflateOnError(err2) {
      this[kPerMessageDeflate]._inflate = null;
      if (this[kError]) {
        this[kCallback](this[kError]);
        return;
      }
      err2[kStatusCode] = 1007;
      this[kCallback](err2);
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/validation.js
var require_validation = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/validation.js"(exports, module) {
    "use strict";
    var { isUtf8 } = __require("buffer");
    var { hasBlob } = require_constants();
    var tokenChars = [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 0 - 15
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // 16 - 31
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      0,
      // 32 - 47
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      // 48 - 63
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 64 - 79
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      // 80 - 95
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      // 96 - 111
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      1,
      0,
      1,
      0
      // 112 - 127
    ];
    function isValidStatusCode(code) {
      return code >= 1e3 && code <= 1014 && code !== 1004 && code !== 1005 && code !== 1006 || code >= 3e3 && code <= 4999;
    }
    function _isValidUTF8(buf) {
      const len = buf.length;
      let i2 = 0;
      while (i2 < len) {
        if ((buf[i2] & 128) === 0) {
          i2++;
        } else if ((buf[i2] & 224) === 192) {
          if (i2 + 1 === len || (buf[i2 + 1] & 192) !== 128 || (buf[i2] & 254) === 192) {
            return false;
          }
          i2 += 2;
        } else if ((buf[i2] & 240) === 224) {
          if (i2 + 2 >= len || (buf[i2 + 1] & 192) !== 128 || (buf[i2 + 2] & 192) !== 128 || buf[i2] === 224 && (buf[i2 + 1] & 224) === 128 || // Overlong
          buf[i2] === 237 && (buf[i2 + 1] & 224) === 160) {
            return false;
          }
          i2 += 3;
        } else if ((buf[i2] & 248) === 240) {
          if (i2 + 3 >= len || (buf[i2 + 1] & 192) !== 128 || (buf[i2 + 2] & 192) !== 128 || (buf[i2 + 3] & 192) !== 128 || buf[i2] === 240 && (buf[i2 + 1] & 240) === 128 || // Overlong
          buf[i2] === 244 && buf[i2 + 1] > 143 || buf[i2] > 244) {
            return false;
          }
          i2 += 4;
        } else {
          return false;
        }
      }
      return true;
    }
    function isBlob(value) {
      return hasBlob && typeof value === "object" && typeof value.arrayBuffer === "function" && typeof value.type === "string" && typeof value.stream === "function" && (value[Symbol.toStringTag] === "Blob" || value[Symbol.toStringTag] === "File");
    }
    module.exports = {
      isBlob,
      isValidStatusCode,
      isValidUTF8: _isValidUTF8,
      tokenChars
    };
    if (isUtf8) {
      module.exports.isValidUTF8 = function(buf) {
        return buf.length < 24 ? _isValidUTF8(buf) : isUtf8(buf);
      };
    } else if (!process.env.WS_NO_UTF_8_VALIDATE) {
      try {
        const isValidUTF8 = __require("utf-8-validate");
        module.exports.isValidUTF8 = function(buf) {
          return buf.length < 32 ? _isValidUTF8(buf) : isValidUTF8(buf);
        };
      } catch (e) {
      }
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/receiver.js
var require_receiver = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/receiver.js"(exports, module) {
    "use strict";
    var { Writable } = __require("stream");
    var PerMessageDeflate2 = require_permessage_deflate();
    var {
      BINARY_TYPES,
      EMPTY_BUFFER,
      kStatusCode,
      kWebSocket
    } = require_constants();
    var { concat, toArrayBuffer, unmask } = require_buffer_util();
    var { isValidStatusCode, isValidUTF8 } = require_validation();
    var FastBuffer = Buffer[Symbol.species];
    var GET_INFO = 0;
    var GET_PAYLOAD_LENGTH_16 = 1;
    var GET_PAYLOAD_LENGTH_64 = 2;
    var GET_MASK = 3;
    var GET_DATA = 4;
    var INFLATING = 5;
    var DEFER_EVENT = 6;
    var Receiver2 = class extends Writable {
      /**
       * Creates a Receiver instance.
       *
       * @param {Object} [options] Options object
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {String} [options.binaryType=nodebuffer] The type for binary data
       * @param {Object} [options.extensions] An object containing the negotiated
       *     extensions
       * @param {Boolean} [options.isServer=false] Specifies whether to operate in
       *     client or server mode
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message length
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       */
      constructor(options = {}) {
        super();
        this._allowSynchronousEvents = options.allowSynchronousEvents !== void 0 ? options.allowSynchronousEvents : true;
        this._binaryType = options.binaryType || BINARY_TYPES[0];
        this._extensions = options.extensions || {};
        this._isServer = !!options.isServer;
        this._maxBufferedChunks = options.maxBufferedChunks | 0;
        this._maxFragments = options.maxFragments | 0;
        this._maxPayload = options.maxPayload | 0;
        this._skipUTF8Validation = !!options.skipUTF8Validation;
        this[kWebSocket] = void 0;
        this._bufferedBytes = 0;
        this._buffers = [];
        this._compressed = false;
        this._payloadLength = 0;
        this._mask = void 0;
        this._fragmented = 0;
        this._masked = false;
        this._fin = false;
        this._opcode = 0;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._numFragments = 0;
        this._fragments = [];
        this._errored = false;
        this._loop = false;
        this._state = GET_INFO;
      }
      /**
       * Implements `Writable.prototype._write()`.
       *
       * @param {Buffer} chunk The chunk of data to write
       * @param {String} encoding The character encoding of `chunk`
       * @param {Function} cb Callback
       * @private
       */
      _write(chunk, encoding, cb) {
        if (this._opcode === 8 && this._state == GET_INFO) return cb();
        if (this._maxBufferedChunks > 0 && this._buffers.length >= this._maxBufferedChunks) {
          cb(
            this.createError(
              RangeError,
              "Too many buffered chunks",
              false,
              1008,
              "WS_ERR_TOO_MANY_BUFFERED_PARTS"
            )
          );
          return;
        }
        this._bufferedBytes += chunk.length;
        this._buffers.push(chunk);
        this.startLoop(cb);
      }
      /**
       * Consumes `n` bytes from the buffered data.
       *
       * @param {Number} n The number of bytes to consume
       * @return {Buffer} The consumed bytes
       * @private
       */
      consume(n) {
        this._bufferedBytes -= n;
        if (n === this._buffers[0].length) return this._buffers.shift();
        if (n < this._buffers[0].length) {
          const buf = this._buffers[0];
          this._buffers[0] = new FastBuffer(
            buf.buffer,
            buf.byteOffset + n,
            buf.length - n
          );
          return new FastBuffer(buf.buffer, buf.byteOffset, n);
        }
        const dst = Buffer.allocUnsafe(n);
        do {
          const buf = this._buffers[0];
          const offset = dst.length - n;
          if (n >= buf.length) {
            dst.set(this._buffers.shift(), offset);
          } else {
            dst.set(new Uint8Array(buf.buffer, buf.byteOffset, n), offset);
            this._buffers[0] = new FastBuffer(
              buf.buffer,
              buf.byteOffset + n,
              buf.length - n
            );
          }
          n -= buf.length;
        } while (n > 0);
        return dst;
      }
      /**
       * Starts the parsing loop.
       *
       * @param {Function} cb Callback
       * @private
       */
      startLoop(cb) {
        this._loop = true;
        do {
          switch (this._state) {
            case GET_INFO:
              this.getInfo(cb);
              break;
            case GET_PAYLOAD_LENGTH_16:
              this.getPayloadLength16(cb);
              break;
            case GET_PAYLOAD_LENGTH_64:
              this.getPayloadLength64(cb);
              break;
            case GET_MASK:
              this.getMask();
              break;
            case GET_DATA:
              this.getData(cb);
              break;
            case INFLATING:
            case DEFER_EVENT:
              this._loop = false;
              return;
          }
        } while (this._loop);
        if (!this._errored) cb();
      }
      /**
       * Reads the first two bytes of a frame.
       *
       * @param {Function} cb Callback
       * @private
       */
      getInfo(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        const buf = this.consume(2);
        if ((buf[0] & 48) !== 0) {
          const error = this.createError(
            RangeError,
            "RSV2 and RSV3 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_2_3"
          );
          cb(error);
          return;
        }
        const compressed = (buf[0] & 64) === 64;
        if (compressed && !this._extensions[PerMessageDeflate2.extensionName]) {
          const error = this.createError(
            RangeError,
            "RSV1 must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_RSV_1"
          );
          cb(error);
          return;
        }
        this._fin = (buf[0] & 128) === 128;
        this._opcode = buf[0] & 15;
        this._payloadLength = buf[1] & 127;
        if (this._opcode === 0) {
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (!this._fragmented) {
            const error = this.createError(
              RangeError,
              "invalid opcode 0",
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._opcode = this._fragmented;
        } else if (this._opcode === 1 || this._opcode === 2) {
          if (this._fragmented) {
            const error = this.createError(
              RangeError,
              `invalid opcode ${this._opcode}`,
              true,
              1002,
              "WS_ERR_INVALID_OPCODE"
            );
            cb(error);
            return;
          }
          this._compressed = compressed;
        } else if (this._opcode > 7 && this._opcode < 11) {
          if (!this._fin) {
            const error = this.createError(
              RangeError,
              "FIN must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_FIN"
            );
            cb(error);
            return;
          }
          if (compressed) {
            const error = this.createError(
              RangeError,
              "RSV1 must be clear",
              true,
              1002,
              "WS_ERR_UNEXPECTED_RSV_1"
            );
            cb(error);
            return;
          }
          if (this._payloadLength > 125 || this._opcode === 8 && this._payloadLength === 1) {
            const error = this.createError(
              RangeError,
              `invalid payload length ${this._payloadLength}`,
              true,
              1002,
              "WS_ERR_INVALID_CONTROL_PAYLOAD_LENGTH"
            );
            cb(error);
            return;
          }
        } else {
          const error = this.createError(
            RangeError,
            `invalid opcode ${this._opcode}`,
            true,
            1002,
            "WS_ERR_INVALID_OPCODE"
          );
          cb(error);
          return;
        }
        if (!this._fin && !this._fragmented) this._fragmented = this._opcode;
        this._masked = (buf[1] & 128) === 128;
        if (this._isServer) {
          if (!this._masked) {
            const error = this.createError(
              RangeError,
              "MASK must be set",
              true,
              1002,
              "WS_ERR_EXPECTED_MASK"
            );
            cb(error);
            return;
          }
        } else if (this._masked) {
          const error = this.createError(
            RangeError,
            "MASK must be clear",
            true,
            1002,
            "WS_ERR_UNEXPECTED_MASK"
          );
          cb(error);
          return;
        }
        if (this._payloadLength === 126) this._state = GET_PAYLOAD_LENGTH_16;
        else if (this._payloadLength === 127) this._state = GET_PAYLOAD_LENGTH_64;
        else this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+16).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength16(cb) {
        if (this._bufferedBytes < 2) {
          this._loop = false;
          return;
        }
        this._payloadLength = this.consume(2).readUInt16BE(0);
        this.haveLength(cb);
      }
      /**
       * Gets extended payload length (7+64).
       *
       * @param {Function} cb Callback
       * @private
       */
      getPayloadLength64(cb) {
        if (this._bufferedBytes < 8) {
          this._loop = false;
          return;
        }
        const buf = this.consume(8);
        const num = buf.readUInt32BE(0);
        if (num > Math.pow(2, 53 - 32) - 1) {
          const error = this.createError(
            RangeError,
            "Unsupported WebSocket frame: payload length > 2^53 - 1",
            false,
            1009,
            "WS_ERR_UNSUPPORTED_DATA_PAYLOAD_LENGTH"
          );
          cb(error);
          return;
        }
        this._payloadLength = num * Math.pow(2, 32) + buf.readUInt32BE(4);
        this.haveLength(cb);
      }
      /**
       * Payload length has been read.
       *
       * @param {Function} cb Callback
       * @private
       */
      haveLength(cb) {
        if (this._payloadLength && this._opcode < 8) {
          this._totalPayloadLength += this._payloadLength;
          if (this._totalPayloadLength > this._maxPayload && this._maxPayload > 0) {
            const error = this.createError(
              RangeError,
              "Max payload size exceeded",
              false,
              1009,
              "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
            );
            cb(error);
            return;
          }
        }
        if (this._masked) this._state = GET_MASK;
        else this._state = GET_DATA;
      }
      /**
       * Reads mask bytes.
       *
       * @private
       */
      getMask() {
        if (this._bufferedBytes < 4) {
          this._loop = false;
          return;
        }
        this._mask = this.consume(4);
        this._state = GET_DATA;
      }
      /**
       * Reads data bytes.
       *
       * @param {Function} cb Callback
       * @private
       */
      getData(cb) {
        let data = EMPTY_BUFFER;
        if (this._payloadLength) {
          if (this._bufferedBytes < this._payloadLength) {
            this._loop = false;
            return;
          }
          data = this.consume(this._payloadLength);
          if (this._masked && (this._mask[0] | this._mask[1] | this._mask[2] | this._mask[3]) !== 0) {
            unmask(data, this._mask);
          }
        }
        if (this._opcode > 7) {
          this.controlMessage(data, cb);
          return;
        }
        if (this._maxFragments > 0 && ++this._numFragments > this._maxFragments) {
          const error = this.createError(
            RangeError,
            "Too many message fragments",
            false,
            1008,
            "WS_ERR_TOO_MANY_BUFFERED_PARTS"
          );
          cb(error);
          return;
        }
        if (this._compressed) {
          this._state = INFLATING;
          this.decompress(data, cb);
          return;
        }
        if (data.length) {
          this._messageLength = this._totalPayloadLength;
          this._fragments.push(data);
        }
        this.dataMessage(cb);
      }
      /**
       * Decompresses data.
       *
       * @param {Buffer} data Compressed data
       * @param {Function} cb Callback
       * @private
       */
      decompress(data, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        perMessageDeflate.decompress(data, this._fin, (err2, buf) => {
          if (err2) return cb(err2);
          if (buf.length) {
            this._messageLength += buf.length;
            if (this._messageLength > this._maxPayload && this._maxPayload > 0) {
              const error = this.createError(
                RangeError,
                "Max payload size exceeded",
                false,
                1009,
                "WS_ERR_UNSUPPORTED_MESSAGE_LENGTH"
              );
              cb(error);
              return;
            }
            this._fragments.push(buf);
          }
          this.dataMessage(cb);
          if (this._state === GET_INFO) this.startLoop(cb);
        });
      }
      /**
       * Handles a data message.
       *
       * @param {Function} cb Callback
       * @private
       */
      dataMessage(cb) {
        if (!this._fin) {
          this._state = GET_INFO;
          return;
        }
        const messageLength = this._messageLength;
        const fragments = this._fragments;
        this._totalPayloadLength = 0;
        this._messageLength = 0;
        this._fragmented = 0;
        this._numFragments = 0;
        this._fragments = [];
        if (this._opcode === 2) {
          let data;
          if (this._binaryType === "nodebuffer") {
            data = concat(fragments, messageLength);
          } else if (this._binaryType === "arraybuffer") {
            data = toArrayBuffer(concat(fragments, messageLength));
          } else if (this._binaryType === "blob") {
            data = new Blob(fragments);
          } else {
            data = fragments;
          }
          if (this._allowSynchronousEvents) {
            this.emit("message", data, true);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", data, true);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        } else {
          const buf = concat(fragments, messageLength);
          if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
            const error = this.createError(
              Error,
              "invalid UTF-8 sequence",
              true,
              1007,
              "WS_ERR_INVALID_UTF8"
            );
            cb(error);
            return;
          }
          if (this._state === INFLATING || this._allowSynchronousEvents) {
            this.emit("message", buf, false);
            this._state = GET_INFO;
          } else {
            this._state = DEFER_EVENT;
            setImmediate(() => {
              this.emit("message", buf, false);
              this._state = GET_INFO;
              this.startLoop(cb);
            });
          }
        }
      }
      /**
       * Handles a control message.
       *
       * @param {Buffer} data Data to handle
       * @return {(Error|RangeError|undefined)} A possible error
       * @private
       */
      controlMessage(data, cb) {
        if (this._opcode === 8) {
          if (data.length === 0) {
            this._loop = false;
            this.emit("conclude", 1005, EMPTY_BUFFER);
            this.end();
          } else {
            const code = data.readUInt16BE(0);
            if (!isValidStatusCode(code)) {
              const error = this.createError(
                RangeError,
                `invalid status code ${code}`,
                true,
                1002,
                "WS_ERR_INVALID_CLOSE_CODE"
              );
              cb(error);
              return;
            }
            const buf = new FastBuffer(
              data.buffer,
              data.byteOffset + 2,
              data.length - 2
            );
            if (!this._skipUTF8Validation && !isValidUTF8(buf)) {
              const error = this.createError(
                Error,
                "invalid UTF-8 sequence",
                true,
                1007,
                "WS_ERR_INVALID_UTF8"
              );
              cb(error);
              return;
            }
            this._loop = false;
            this.emit("conclude", code, buf);
            this.end();
          }
          this._state = GET_INFO;
          return;
        }
        if (this._allowSynchronousEvents) {
          this.emit(this._opcode === 9 ? "ping" : "pong", data);
          this._state = GET_INFO;
        } else {
          this._state = DEFER_EVENT;
          setImmediate(() => {
            this.emit(this._opcode === 9 ? "ping" : "pong", data);
            this._state = GET_INFO;
            this.startLoop(cb);
          });
        }
      }
      /**
       * Builds an error object.
       *
       * @param {function(new:Error|RangeError)} ErrorCtor The error constructor
       * @param {String} message The error message
       * @param {Boolean} prefix Specifies whether or not to add a default prefix to
       *     `message`
       * @param {Number} statusCode The status code
       * @param {String} errorCode The exposed error code
       * @return {(Error|RangeError)} The error
       * @private
       */
      createError(ErrorCtor, message, prefix, statusCode, errorCode) {
        this._loop = false;
        this._errored = true;
        const err2 = new ErrorCtor(
          prefix ? `Invalid WebSocket frame: ${message}` : message
        );
        Error.captureStackTrace(err2, this.createError);
        err2.code = errorCode;
        err2[kStatusCode] = statusCode;
        return err2;
      }
    };
    module.exports = Receiver2;
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/sender.js
var require_sender = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/sender.js"(exports, module) {
    "use strict";
    var { Duplex } = __require("stream");
    var { randomFillSync } = __require("crypto");
    var {
      types: { isUint8Array }
    } = __require("util");
    var PerMessageDeflate2 = require_permessage_deflate();
    var { EMPTY_BUFFER, kWebSocket, NOOP } = require_constants();
    var { isBlob, isValidStatusCode } = require_validation();
    var { mask: applyMask, toBuffer } = require_buffer_util();
    var kByteLength = /* @__PURE__ */ Symbol("kByteLength");
    var maskBuffer = Buffer.alloc(4);
    var RANDOM_POOL_SIZE = 8 * 1024;
    var randomPool;
    var randomPoolPointer = RANDOM_POOL_SIZE;
    var DEFAULT = 0;
    var DEFLATING = 1;
    var GET_BLOB_DATA = 2;
    var Sender2 = class _Sender {
      /**
       * Creates a Sender instance.
       *
       * @param {Duplex} socket The connection socket
       * @param {Object} [extensions] An object containing the negotiated extensions
       * @param {Function} [generateMask] The function used to generate the masking
       *     key
       */
      constructor(socket, extensions, generateMask) {
        this._extensions = extensions || {};
        if (generateMask) {
          this._generateMask = generateMask;
          this._maskBuffer = Buffer.alloc(4);
        }
        this._socket = socket;
        this._firstFragment = true;
        this._compress = false;
        this._bufferedBytes = 0;
        this._queue = [];
        this._state = DEFAULT;
        this.onerror = NOOP;
        this[kWebSocket] = void 0;
      }
      /**
       * Frames a piece of data according to the HyBi WebSocket protocol.
       *
       * @param {(Buffer|String)} data The data to frame
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @return {(Buffer|String)[]} The framed data
       * @public
       */
      static frame(data, options) {
        let mask;
        let merge = false;
        let offset = 2;
        let skipMasking = false;
        if (options.mask) {
          mask = options.maskBuffer || maskBuffer;
          if (options.generateMask) {
            options.generateMask(mask);
          } else {
            if (randomPoolPointer === RANDOM_POOL_SIZE) {
              if (randomPool === void 0) {
                randomPool = Buffer.alloc(RANDOM_POOL_SIZE);
              }
              randomFillSync(randomPool, 0, RANDOM_POOL_SIZE);
              randomPoolPointer = 0;
            }
            mask[0] = randomPool[randomPoolPointer++];
            mask[1] = randomPool[randomPoolPointer++];
            mask[2] = randomPool[randomPoolPointer++];
            mask[3] = randomPool[randomPoolPointer++];
          }
          skipMasking = (mask[0] | mask[1] | mask[2] | mask[3]) === 0;
          offset = 6;
        }
        let dataLength;
        if (typeof data === "string") {
          if ((!options.mask || skipMasking) && options[kByteLength] !== void 0) {
            dataLength = options[kByteLength];
          } else {
            data = Buffer.from(data);
            dataLength = data.length;
          }
        } else {
          dataLength = data.length;
          merge = options.mask && options.readOnly && !skipMasking;
        }
        let payloadLength = dataLength;
        if (dataLength >= 65536) {
          offset += 8;
          payloadLength = 127;
        } else if (dataLength > 125) {
          offset += 2;
          payloadLength = 126;
        }
        const target = Buffer.allocUnsafe(merge ? dataLength + offset : offset);
        target[0] = options.fin ? options.opcode | 128 : options.opcode;
        if (options.rsv1) target[0] |= 64;
        target[1] = payloadLength;
        if (payloadLength === 126) {
          target.writeUInt16BE(dataLength, 2);
        } else if (payloadLength === 127) {
          target[2] = target[3] = 0;
          target.writeUIntBE(dataLength, 4, 6);
        }
        if (!options.mask) return [target, data];
        target[1] |= 128;
        target[offset - 4] = mask[0];
        target[offset - 3] = mask[1];
        target[offset - 2] = mask[2];
        target[offset - 1] = mask[3];
        if (skipMasking) return [target, data];
        if (merge) {
          applyMask(data, mask, target, offset, dataLength);
          return [target];
        }
        applyMask(data, mask, data, 0, dataLength);
        return [target, data];
      }
      /**
       * Sends a close message to the other peer.
       *
       * @param {Number} [code] The status code component of the body
       * @param {(String|Buffer)} [data] The message component of the body
       * @param {Boolean} [mask=false] Specifies whether or not to mask the message
       * @param {Function} [cb] Callback
       * @public
       */
      close(code, data, mask, cb) {
        let buf;
        if (code === void 0) {
          buf = EMPTY_BUFFER;
        } else if (typeof code !== "number" || !isValidStatusCode(code)) {
          throw new TypeError("First argument must be a valid error code number");
        } else if (data === void 0 || !data.length) {
          buf = Buffer.allocUnsafe(2);
          buf.writeUInt16BE(code, 0);
        } else {
          const length = Buffer.byteLength(data);
          if (length > 123) {
            throw new RangeError("The message must not be greater than 123 bytes");
          }
          buf = Buffer.allocUnsafe(2 + length);
          buf.writeUInt16BE(code, 0);
          if (typeof data === "string") {
            buf.write(data, 2);
          } else if (isUint8Array(data)) {
            buf.set(data, 2);
          } else {
            throw new TypeError("Second argument must be a string or a Uint8Array");
          }
        }
        const options = {
          [kByteLength]: buf.length,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 8,
          readOnly: false,
          rsv1: false
        };
        if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, buf, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(buf, options), cb);
        }
      }
      /**
       * Sends a ping message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      ping(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 9,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a pong message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Boolean} [mask=false] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback
       * @public
       */
      pong(data, mask, cb) {
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (byteLength > 125) {
          throw new RangeError("The data size must not be greater than 125 bytes");
        }
        const options = {
          [kByteLength]: byteLength,
          fin: true,
          generateMask: this._generateMask,
          mask,
          maskBuffer: this._maskBuffer,
          opcode: 10,
          readOnly,
          rsv1: false
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, false, options, cb]);
          } else {
            this.getBlobData(data, false, options, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, false, options, cb]);
        } else {
          this.sendFrame(_Sender.frame(data, options), cb);
        }
      }
      /**
       * Sends a data message to the other peer.
       *
       * @param {*} data The message to send
       * @param {Object} options Options object
       * @param {Boolean} [options.binary=false] Specifies whether `data` is binary
       *     or text
       * @param {Boolean} [options.compress=false] Specifies whether or not to
       *     compress `data`
       * @param {Boolean} [options.fin=false] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Function} [cb] Callback
       * @public
       */
      send(data, options, cb) {
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        let opcode = options.binary ? 2 : 1;
        let rsv1 = options.compress;
        let byteLength;
        let readOnly;
        if (typeof data === "string") {
          byteLength = Buffer.byteLength(data);
          readOnly = false;
        } else if (isBlob(data)) {
          byteLength = data.size;
          readOnly = false;
        } else {
          data = toBuffer(data);
          byteLength = data.length;
          readOnly = toBuffer.readOnly;
        }
        if (this._firstFragment) {
          this._firstFragment = false;
          if (rsv1 && perMessageDeflate && perMessageDeflate.params[perMessageDeflate._isServer ? "server_no_context_takeover" : "client_no_context_takeover"]) {
            rsv1 = byteLength >= perMessageDeflate._threshold;
          }
          this._compress = rsv1;
        } else {
          rsv1 = false;
          opcode = 0;
        }
        if (options.fin) this._firstFragment = true;
        const opts = {
          [kByteLength]: byteLength,
          fin: options.fin,
          generateMask: this._generateMask,
          mask: options.mask,
          maskBuffer: this._maskBuffer,
          opcode,
          readOnly,
          rsv1
        };
        if (isBlob(data)) {
          if (this._state !== DEFAULT) {
            this.enqueue([this.getBlobData, data, this._compress, opts, cb]);
          } else {
            this.getBlobData(data, this._compress, opts, cb);
          }
        } else if (this._state !== DEFAULT) {
          this.enqueue([this.dispatch, data, this._compress, opts, cb]);
        } else {
          this.dispatch(data, this._compress, opts, cb);
        }
      }
      /**
       * Gets the contents of a blob as binary data.
       *
       * @param {Blob} blob The blob
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     the data
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      getBlobData(blob, compress, options, cb) {
        this._bufferedBytes += options[kByteLength];
        this._state = GET_BLOB_DATA;
        blob.arrayBuffer().then((arrayBuffer) => {
          if (this._socket.destroyed) {
            const err2 = new Error(
              "The socket was closed while the blob was being read"
            );
            process.nextTick(callCallbacks, this, err2, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          const data = toBuffer(arrayBuffer);
          if (!compress) {
            this._state = DEFAULT;
            this.sendFrame(_Sender.frame(data, options), cb);
            this.dequeue();
          } else {
            this.dispatch(data, compress, options, cb);
          }
        }).catch((err2) => {
          process.nextTick(onError, this, err2, cb);
        });
      }
      /**
       * Dispatches a message.
       *
       * @param {(Buffer|String)} data The message to send
       * @param {Boolean} [compress=false] Specifies whether or not to compress
       *     `data`
       * @param {Object} options Options object
       * @param {Boolean} [options.fin=false] Specifies whether or not to set the
       *     FIN bit
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Boolean} [options.mask=false] Specifies whether or not to mask
       *     `data`
       * @param {Buffer} [options.maskBuffer] The buffer used to store the masking
       *     key
       * @param {Number} options.opcode The opcode
       * @param {Boolean} [options.readOnly=false] Specifies whether `data` can be
       *     modified
       * @param {Boolean} [options.rsv1=false] Specifies whether or not to set the
       *     RSV1 bit
       * @param {Function} [cb] Callback
       * @private
       */
      dispatch(data, compress, options, cb) {
        if (!compress) {
          this.sendFrame(_Sender.frame(data, options), cb);
          return;
        }
        const perMessageDeflate = this._extensions[PerMessageDeflate2.extensionName];
        this._bufferedBytes += options[kByteLength];
        this._state = DEFLATING;
        perMessageDeflate.compress(data, options.fin, (_, buf) => {
          if (this._socket.destroyed) {
            const err2 = new Error(
              "The socket was closed while data was being compressed"
            );
            callCallbacks(this, err2, cb);
            return;
          }
          this._bufferedBytes -= options[kByteLength];
          this._state = DEFAULT;
          options.readOnly = false;
          this.sendFrame(_Sender.frame(buf, options), cb);
          this.dequeue();
        });
      }
      /**
       * Executes queued send operations.
       *
       * @private
       */
      dequeue() {
        while (this._state === DEFAULT && this._queue.length) {
          const params = this._queue.shift();
          this._bufferedBytes -= params[3][kByteLength];
          Reflect.apply(params[0], this, params.slice(1));
        }
      }
      /**
       * Enqueues a send operation.
       *
       * @param {Array} params Send operation parameters.
       * @private
       */
      enqueue(params) {
        this._bufferedBytes += params[3][kByteLength];
        this._queue.push(params);
      }
      /**
       * Sends a frame.
       *
       * @param {(Buffer | String)[]} list The frame to send
       * @param {Function} [cb] Callback
       * @private
       */
      sendFrame(list, cb) {
        if (list.length === 2) {
          this._socket.cork();
          this._socket.write(list[0]);
          this._socket.write(list[1], cb);
          this._socket.uncork();
        } else {
          this._socket.write(list[0], cb);
        }
      }
    };
    module.exports = Sender2;
    function callCallbacks(sender, err2, cb) {
      if (typeof cb === "function") cb(err2);
      for (let i2 = 0; i2 < sender._queue.length; i2++) {
        const params = sender._queue[i2];
        const callback = params[params.length - 1];
        if (typeof callback === "function") callback(err2);
      }
    }
    function onError(sender, err2, cb) {
      callCallbacks(sender, err2, cb);
      sender.onerror(err2);
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/event-target.js
var require_event_target = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/event-target.js"(exports, module) {
    "use strict";
    var { kForOnEventAttribute, kListener } = require_constants();
    var kCode = /* @__PURE__ */ Symbol("kCode");
    var kData = /* @__PURE__ */ Symbol("kData");
    var kError = /* @__PURE__ */ Symbol("kError");
    var kMessage = /* @__PURE__ */ Symbol("kMessage");
    var kReason = /* @__PURE__ */ Symbol("kReason");
    var kTarget = /* @__PURE__ */ Symbol("kTarget");
    var kType = /* @__PURE__ */ Symbol("kType");
    var kWasClean = /* @__PURE__ */ Symbol("kWasClean");
    var Event = class {
      /**
       * Create a new `Event`.
       *
       * @param {String} type The name of the event
       * @throws {TypeError} If the `type` argument is not specified
       */
      constructor(type) {
        this[kTarget] = null;
        this[kType] = type;
      }
      /**
       * @type {*}
       */
      get target() {
        return this[kTarget];
      }
      /**
       * @type {String}
       */
      get type() {
        return this[kType];
      }
    };
    Object.defineProperty(Event.prototype, "target", { enumerable: true });
    Object.defineProperty(Event.prototype, "type", { enumerable: true });
    var CloseEvent = class extends Event {
      /**
       * Create a new `CloseEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {Number} [options.code=0] The status code explaining why the
       *     connection was closed
       * @param {String} [options.reason=''] A human-readable string explaining why
       *     the connection was closed
       * @param {Boolean} [options.wasClean=false] Indicates whether or not the
       *     connection was cleanly closed
       */
      constructor(type, options = {}) {
        super(type);
        this[kCode] = options.code === void 0 ? 0 : options.code;
        this[kReason] = options.reason === void 0 ? "" : options.reason;
        this[kWasClean] = options.wasClean === void 0 ? false : options.wasClean;
      }
      /**
       * @type {Number}
       */
      get code() {
        return this[kCode];
      }
      /**
       * @type {String}
       */
      get reason() {
        return this[kReason];
      }
      /**
       * @type {Boolean}
       */
      get wasClean() {
        return this[kWasClean];
      }
    };
    Object.defineProperty(CloseEvent.prototype, "code", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "reason", { enumerable: true });
    Object.defineProperty(CloseEvent.prototype, "wasClean", { enumerable: true });
    var ErrorEvent = class extends Event {
      /**
       * Create a new `ErrorEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.error=null] The error that generated this event
       * @param {String} [options.message=''] The error message
       */
      constructor(type, options = {}) {
        super(type);
        this[kError] = options.error === void 0 ? null : options.error;
        this[kMessage] = options.message === void 0 ? "" : options.message;
      }
      /**
       * @type {*}
       */
      get error() {
        return this[kError];
      }
      /**
       * @type {String}
       */
      get message() {
        return this[kMessage];
      }
    };
    Object.defineProperty(ErrorEvent.prototype, "error", { enumerable: true });
    Object.defineProperty(ErrorEvent.prototype, "message", { enumerable: true });
    var MessageEvent = class extends Event {
      /**
       * Create a new `MessageEvent`.
       *
       * @param {String} type The name of the event
       * @param {Object} [options] A dictionary object that allows for setting
       *     attributes via object members of the same name
       * @param {*} [options.data=null] The message content
       */
      constructor(type, options = {}) {
        super(type);
        this[kData] = options.data === void 0 ? null : options.data;
      }
      /**
       * @type {*}
       */
      get data() {
        return this[kData];
      }
    };
    Object.defineProperty(MessageEvent.prototype, "data", { enumerable: true });
    var EventTarget = {
      /**
       * Register an event listener.
       *
       * @param {String} type A string representing the event type to listen for
       * @param {(Function|Object)} handler The listener to add
       * @param {Object} [options] An options object specifies characteristics about
       *     the event listener
       * @param {Boolean} [options.once=false] A `Boolean` indicating that the
       *     listener should be invoked at most once after being added. If `true`,
       *     the listener would be automatically removed when invoked.
       * @public
       */
      addEventListener(type, handler, options = {}) {
        for (const listener of this.listeners(type)) {
          if (!options[kForOnEventAttribute] && listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            return;
          }
        }
        let wrapper;
        if (type === "message") {
          wrapper = function onMessage(data, isBinary) {
            const event = new MessageEvent("message", {
              data: isBinary ? data : data.toString()
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "close") {
          wrapper = function onClose(code, message) {
            const event = new CloseEvent("close", {
              code,
              reason: message.toString(),
              wasClean: this._closeFrameReceived && this._closeFrameSent
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "error") {
          wrapper = function onError(error) {
            const event = new ErrorEvent("error", {
              error,
              message: error.message
            });
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else if (type === "open") {
          wrapper = function onOpen() {
            const event = new Event("open");
            event[kTarget] = this;
            callListener(handler, this, event);
          };
        } else {
          return;
        }
        wrapper[kForOnEventAttribute] = !!options[kForOnEventAttribute];
        wrapper[kListener] = handler;
        if (options.once) {
          this.once(type, wrapper);
        } else {
          this.on(type, wrapper);
        }
      },
      /**
       * Remove an event listener.
       *
       * @param {String} type A string representing the event type to remove
       * @param {(Function|Object)} handler The listener to remove
       * @public
       */
      removeEventListener(type, handler) {
        for (const listener of this.listeners(type)) {
          if (listener[kListener] === handler && !listener[kForOnEventAttribute]) {
            this.removeListener(type, listener);
            break;
          }
        }
      }
    };
    module.exports = {
      CloseEvent,
      ErrorEvent,
      Event,
      EventTarget,
      MessageEvent
    };
    function callListener(listener, thisArg, event) {
      if (typeof listener === "object" && listener.handleEvent) {
        listener.handleEvent.call(listener, event);
      } else {
        listener.call(thisArg, event);
      }
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/extension.js
var require_extension = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/extension.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function push(dest, name, elem) {
      if (dest[name] === void 0) dest[name] = [elem];
      else dest[name].push(elem);
    }
    function parse2(header) {
      const offers = /* @__PURE__ */ Object.create(null);
      let params = /* @__PURE__ */ Object.create(null);
      let mustUnescape = false;
      let isEscaping = false;
      let inQuotes = false;
      let extensionName;
      let paramName;
      let start = -1;
      let code = -1;
      let end = -1;
      let i2 = 0;
      for (; i2 < header.length; i2++) {
        code = header.charCodeAt(i2);
        if (extensionName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i2;
          } else if (i2 !== 0 && (code === 32 || code === 9)) {
            if (end === -1 && start !== -1) end = i2;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i2}`);
            }
            if (end === -1) end = i2;
            const name = header.slice(start, end);
            if (code === 44) {
              push(offers, name, params);
              params = /* @__PURE__ */ Object.create(null);
            } else {
              extensionName = name;
            }
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i2}`);
          }
        } else if (paramName === void 0) {
          if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i2;
          } else if (code === 32 || code === 9) {
            if (end === -1 && start !== -1) end = i2;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i2}`);
            }
            if (end === -1) end = i2;
            push(params, header.slice(start, end), true);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            start = end = -1;
          } else if (code === 61 && start !== -1 && end === -1) {
            paramName = header.slice(start, i2);
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i2}`);
          }
        } else {
          if (isEscaping) {
            if (tokenChars[code] !== 1) {
              throw new SyntaxError(`Unexpected character at index ${i2}`);
            }
            if (start === -1) start = i2;
            else if (!mustUnescape) mustUnescape = true;
            isEscaping = false;
          } else if (inQuotes) {
            if (tokenChars[code] === 1) {
              if (start === -1) start = i2;
            } else if (code === 34 && start !== -1) {
              inQuotes = false;
              end = i2;
            } else if (code === 92) {
              isEscaping = true;
            } else {
              throw new SyntaxError(`Unexpected character at index ${i2}`);
            }
          } else if (code === 34 && header.charCodeAt(i2 - 1) === 61) {
            inQuotes = true;
          } else if (end === -1 && tokenChars[code] === 1) {
            if (start === -1) start = i2;
          } else if (start !== -1 && (code === 32 || code === 9)) {
            if (end === -1) end = i2;
          } else if (code === 59 || code === 44) {
            if (start === -1) {
              throw new SyntaxError(`Unexpected character at index ${i2}`);
            }
            if (end === -1) end = i2;
            let value = header.slice(start, end);
            if (mustUnescape) {
              value = value.replace(/\\/g, "");
              mustUnescape = false;
            }
            push(params, paramName, value);
            if (code === 44) {
              push(offers, extensionName, params);
              params = /* @__PURE__ */ Object.create(null);
              extensionName = void 0;
            }
            paramName = void 0;
            start = end = -1;
          } else {
            throw new SyntaxError(`Unexpected character at index ${i2}`);
          }
        }
      }
      if (start === -1 || inQuotes || code === 32 || code === 9) {
        throw new SyntaxError("Unexpected end of input");
      }
      if (end === -1) end = i2;
      const token = header.slice(start, end);
      if (extensionName === void 0) {
        push(offers, token, params);
      } else {
        if (paramName === void 0) {
          push(params, token, true);
        } else if (mustUnescape) {
          push(params, paramName, token.replace(/\\/g, ""));
        } else {
          push(params, paramName, token);
        }
        push(offers, extensionName, params);
      }
      return offers;
    }
    function format(extensions) {
      return Object.keys(extensions).map((extension2) => {
        let configurations = extensions[extension2];
        if (!Array.isArray(configurations)) configurations = [configurations];
        return configurations.map((params) => {
          return [extension2].concat(
            Object.keys(params).map((k) => {
              let values = params[k];
              if (!Array.isArray(values)) values = [values];
              return values.map((v) => v === true ? k : `${k}=${v}`).join("; ");
            })
          ).join("; ");
        }).join(", ");
      }).join(", ");
    }
    module.exports = { format, parse: parse2 };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/websocket.js
var require_websocket = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/websocket.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var https = __require("https");
    var http = __require("http");
    var net = __require("net");
    var tls = __require("tls");
    var { randomBytes, createHash } = __require("crypto");
    var { Duplex, Readable } = __require("stream");
    var { URL: URL2 } = __require("url");
    var PerMessageDeflate2 = require_permessage_deflate();
    var Receiver2 = require_receiver();
    var Sender2 = require_sender();
    var { isBlob } = require_validation();
    var {
      BINARY_TYPES,
      CLOSE_TIMEOUT,
      EMPTY_BUFFER,
      GUID,
      kForOnEventAttribute,
      kListener,
      kStatusCode,
      kWebSocket,
      NOOP
    } = require_constants();
    var {
      EventTarget: { addEventListener, removeEventListener }
    } = require_event_target();
    var { format, parse: parse2 } = require_extension();
    var { toBuffer } = require_buffer_util();
    var kAborted = /* @__PURE__ */ Symbol("kAborted");
    var protocolVersions = [8, 13];
    var readyStates = ["CONNECTING", "OPEN", "CLOSING", "CLOSED"];
    var subprotocolRegex = /^[!#$%&'*+\-.0-9A-Z^_`|a-z~]+$/;
    var WebSocket2 = class _WebSocket extends EventEmitter {
      /**
       * Create a new `WebSocket`.
       *
       * @param {(String|URL)} address The URL to which to connect
       * @param {(String|String[])} [protocols] The subprotocols
       * @param {Object} [options] Connection options
       */
      constructor(address, protocols, options) {
        super();
        this._binaryType = BINARY_TYPES[0];
        this._closeCode = 1006;
        this._closeFrameReceived = false;
        this._closeFrameSent = false;
        this._closeMessage = EMPTY_BUFFER;
        this._closeTimer = null;
        this._errorEmitted = false;
        this._extensions = {};
        this._paused = false;
        this._protocol = "";
        this._readyState = _WebSocket.CONNECTING;
        this._receiver = null;
        this._sender = null;
        this._socket = null;
        if (address !== null) {
          this._bufferedAmount = 0;
          this._isServer = false;
          this._redirects = 0;
          if (protocols === void 0) {
            protocols = [];
          } else if (!Array.isArray(protocols)) {
            if (typeof protocols === "object" && protocols !== null) {
              options = protocols;
              protocols = [];
            } else {
              protocols = [protocols];
            }
          }
          initAsClient(this, address, protocols, options);
        } else {
          this._autoPong = options.autoPong;
          this._closeTimeout = options.closeTimeout;
          this._isServer = true;
        }
      }
      /**
       * For historical reasons, the custom "nodebuffer" type is used by the default
       * instead of "blob".
       *
       * @type {String}
       */
      get binaryType() {
        return this._binaryType;
      }
      set binaryType(type) {
        if (!BINARY_TYPES.includes(type)) return;
        this._binaryType = type;
        if (this._receiver) this._receiver._binaryType = type;
      }
      /**
       * @type {Number}
       */
      get bufferedAmount() {
        if (!this._socket) return this._bufferedAmount;
        return this._socket._writableState.length + this._sender._bufferedBytes;
      }
      /**
       * @type {String}
       */
      get extensions() {
        return Object.keys(this._extensions).join();
      }
      /**
       * @type {Boolean}
       */
      get isPaused() {
        return this._paused;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onclose() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onerror() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onopen() {
        return null;
      }
      /**
       * @type {Function}
       */
      /* istanbul ignore next */
      get onmessage() {
        return null;
      }
      /**
       * @type {String}
       */
      get protocol() {
        return this._protocol;
      }
      /**
       * @type {Number}
       */
      get readyState() {
        return this._readyState;
      }
      /**
       * @type {String}
       */
      get url() {
        return this._url;
      }
      /**
       * Set up the socket and the internal resources.
       *
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Object} options Options object
       * @param {Boolean} [options.allowSynchronousEvents=false] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Function} [options.generateMask] The function used to generate the
       *     masking key
       * @param {Number} [options.maxBufferedChunks=0] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=0] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=0] The maximum allowed message size
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @private
       */
      setSocket(socket, head, options) {
        const receiver = new Receiver2({
          allowSynchronousEvents: options.allowSynchronousEvents,
          binaryType: this.binaryType,
          extensions: this._extensions,
          isServer: this._isServer,
          maxBufferedChunks: options.maxBufferedChunks,
          maxFragments: options.maxFragments,
          maxPayload: options.maxPayload,
          skipUTF8Validation: options.skipUTF8Validation
        });
        const sender = new Sender2(socket, this._extensions, options.generateMask);
        this._receiver = receiver;
        this._sender = sender;
        this._socket = socket;
        receiver[kWebSocket] = this;
        sender[kWebSocket] = this;
        socket[kWebSocket] = this;
        receiver.on("conclude", receiverOnConclude);
        receiver.on("drain", receiverOnDrain);
        receiver.on("error", receiverOnError);
        receiver.on("message", receiverOnMessage);
        receiver.on("ping", receiverOnPing);
        receiver.on("pong", receiverOnPong);
        sender.onerror = senderOnError;
        if (socket.setTimeout) socket.setTimeout(0);
        if (socket.setNoDelay) socket.setNoDelay();
        if (head.length > 0) socket.unshift(head);
        socket.on("close", socketOnClose);
        socket.on("data", socketOnData);
        socket.on("end", socketOnEnd);
        socket.on("error", socketOnError);
        this._readyState = _WebSocket.OPEN;
        this.emit("open");
      }
      /**
       * Emit the `'close'` event.
       *
       * @private
       */
      emitClose() {
        if (!this._socket) {
          this._readyState = _WebSocket.CLOSED;
          this.emit("close", this._closeCode, this._closeMessage);
          return;
        }
        if (this._extensions[PerMessageDeflate2.extensionName]) {
          this._extensions[PerMessageDeflate2.extensionName].cleanup();
        }
        this._receiver.removeAllListeners();
        this._readyState = _WebSocket.CLOSED;
        this.emit("close", this._closeCode, this._closeMessage);
      }
      /**
       * Start a closing handshake.
       *
       *          +----------+   +-----------+   +----------+
       *     - - -|ws.close()|-->|close frame|-->|ws.close()|- - -
       *    |     +----------+   +-----------+   +----------+     |
       *          +----------+   +-----------+         |
       * CLOSING  |ws.close()|<--|close frame|<--+-----+       CLOSING
       *          +----------+   +-----------+   |
       *    |           |                        |   +---+        |
       *                +------------------------+-->|fin| - - - -
       *    |         +---+                      |   +---+
       *     - - - - -|fin|<---------------------+
       *              +---+
       *
       * @param {Number} [code] Status code explaining why the connection is closing
       * @param {(String|Buffer)} [data] The reason why the connection is
       *     closing
       * @public
       */
      close(code, data) {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this.readyState === _WebSocket.CLOSING) {
          if (this._closeFrameSent && (this._closeFrameReceived || this._receiver._writableState.errorEmitted)) {
            this._socket.end();
          }
          return;
        }
        this._readyState = _WebSocket.CLOSING;
        this._sender.close(code, data, !this._isServer, (err2) => {
          if (err2) return;
          this._closeFrameSent = true;
          if (this._closeFrameReceived || this._receiver._writableState.errorEmitted) {
            this._socket.end();
          }
        });
        setCloseTimer(this);
      }
      /**
       * Pause the socket.
       *
       * @public
       */
      pause() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = true;
        this._socket.pause();
      }
      /**
       * Send a ping.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the ping is sent
       * @public
       */
      ping(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.ping(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Send a pong.
       *
       * @param {*} [data] The data to send
       * @param {Boolean} [mask] Indicates whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when the pong is sent
       * @public
       */
      pong(data, mask, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof data === "function") {
          cb = data;
          data = mask = void 0;
        } else if (typeof mask === "function") {
          cb = mask;
          mask = void 0;
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        if (mask === void 0) mask = !this._isServer;
        this._sender.pong(data || EMPTY_BUFFER, mask, cb);
      }
      /**
       * Resume the socket.
       *
       * @public
       */
      resume() {
        if (this.readyState === _WebSocket.CONNECTING || this.readyState === _WebSocket.CLOSED) {
          return;
        }
        this._paused = false;
        if (!this._receiver._writableState.needDrain) this._socket.resume();
      }
      /**
       * Send a data message.
       *
       * @param {*} data The message to send
       * @param {Object} [options] Options object
       * @param {Boolean} [options.binary] Specifies whether `data` is binary or
       *     text
       * @param {Boolean} [options.compress] Specifies whether or not to compress
       *     `data`
       * @param {Boolean} [options.fin=true] Specifies whether the fragment is the
       *     last one
       * @param {Boolean} [options.mask] Specifies whether or not to mask `data`
       * @param {Function} [cb] Callback which is executed when data is written out
       * @public
       */
      send(data, options, cb) {
        if (this.readyState === _WebSocket.CONNECTING) {
          throw new Error("WebSocket is not open: readyState 0 (CONNECTING)");
        }
        if (typeof options === "function") {
          cb = options;
          options = {};
        }
        if (typeof data === "number") data = data.toString();
        if (this.readyState !== _WebSocket.OPEN) {
          sendAfterClose(this, data, cb);
          return;
        }
        const opts = {
          binary: typeof data !== "string",
          mask: !this._isServer,
          compress: true,
          fin: true,
          ...options
        };
        if (!this._extensions[PerMessageDeflate2.extensionName]) {
          opts.compress = false;
        }
        this._sender.send(data || EMPTY_BUFFER, opts, cb);
      }
      /**
       * Forcibly close the connection.
       *
       * @public
       */
      terminate() {
        if (this.readyState === _WebSocket.CLOSED) return;
        if (this.readyState === _WebSocket.CONNECTING) {
          const msg = "WebSocket was closed before the connection was established";
          abortHandshake(this, this._req, msg);
          return;
        }
        if (this._socket) {
          this._readyState = _WebSocket.CLOSING;
          this._socket.destroy();
        }
      }
    };
    Object.defineProperty(WebSocket2, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2.prototype, "CONNECTING", {
      enumerable: true,
      value: readyStates.indexOf("CONNECTING")
    });
    Object.defineProperty(WebSocket2, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2.prototype, "OPEN", {
      enumerable: true,
      value: readyStates.indexOf("OPEN")
    });
    Object.defineProperty(WebSocket2, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSING", {
      enumerable: true,
      value: readyStates.indexOf("CLOSING")
    });
    Object.defineProperty(WebSocket2, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    Object.defineProperty(WebSocket2.prototype, "CLOSED", {
      enumerable: true,
      value: readyStates.indexOf("CLOSED")
    });
    [
      "binaryType",
      "bufferedAmount",
      "extensions",
      "isPaused",
      "protocol",
      "readyState",
      "url"
    ].forEach((property) => {
      Object.defineProperty(WebSocket2.prototype, property, { enumerable: true });
    });
    ["open", "error", "close", "message"].forEach((method) => {
      Object.defineProperty(WebSocket2.prototype, `on${method}`, {
        enumerable: true,
        get() {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) return listener[kListener];
          }
          return null;
        },
        set(handler) {
          for (const listener of this.listeners(method)) {
            if (listener[kForOnEventAttribute]) {
              this.removeListener(method, listener);
              break;
            }
          }
          if (typeof handler !== "function") return;
          this.addEventListener(method, handler, {
            [kForOnEventAttribute]: true
          });
        }
      });
    });
    WebSocket2.prototype.addEventListener = addEventListener;
    WebSocket2.prototype.removeEventListener = removeEventListener;
    module.exports = WebSocket2;
    function initAsClient(websocket, address, protocols, options) {
      const opts = {
        allowSynchronousEvents: true,
        autoPong: true,
        closeTimeout: CLOSE_TIMEOUT,
        protocolVersion: protocolVersions[1],
        maxBufferedChunks: 256 * 1024,
        maxFragments: 16 * 1024,
        maxPayload: 100 * 1024 * 1024,
        skipUTF8Validation: false,
        perMessageDeflate: true,
        followRedirects: false,
        maxRedirects: 10,
        ...options,
        socketPath: void 0,
        hostname: void 0,
        protocol: void 0,
        timeout: void 0,
        method: "GET",
        host: void 0,
        path: void 0,
        port: void 0
      };
      websocket._autoPong = opts.autoPong;
      websocket._closeTimeout = opts.closeTimeout;
      if (!protocolVersions.includes(opts.protocolVersion)) {
        throw new RangeError(
          `Unsupported protocol version: ${opts.protocolVersion} (supported versions: ${protocolVersions.join(", ")})`
        );
      }
      let parsedUrl;
      if (address instanceof URL2) {
        parsedUrl = address;
      } else {
        try {
          parsedUrl = new URL2(address);
        } catch {
          throw new SyntaxError(`Invalid URL: ${address}`);
        }
      }
      if (parsedUrl.protocol === "http:") {
        parsedUrl.protocol = "ws:";
      } else if (parsedUrl.protocol === "https:") {
        parsedUrl.protocol = "wss:";
      }
      websocket._url = parsedUrl.href;
      const isSecure = parsedUrl.protocol === "wss:";
      const isIpcUrl = parsedUrl.protocol === "ws+unix:";
      let invalidUrlMessage;
      if (parsedUrl.protocol !== "ws:" && !isSecure && !isIpcUrl) {
        invalidUrlMessage = `The URL's protocol must be one of "ws:", "wss:", "http:", "https:", or "ws+unix:"`;
      } else if (isIpcUrl && !parsedUrl.pathname) {
        invalidUrlMessage = "The URL's pathname is empty";
      } else if (parsedUrl.hash) {
        invalidUrlMessage = "The URL contains a fragment identifier";
      }
      if (invalidUrlMessage) {
        const err2 = new SyntaxError(invalidUrlMessage);
        if (websocket._redirects === 0) {
          throw err2;
        } else {
          emitErrorAndClose(websocket, err2);
          return;
        }
      }
      const defaultPort = isSecure ? 443 : 80;
      const key = randomBytes(16).toString("base64");
      const request = isSecure ? https.request : http.request;
      const protocolSet = /* @__PURE__ */ new Set();
      let perMessageDeflate;
      opts.createConnection = opts.createConnection || (isSecure ? tlsConnect : netConnect);
      opts.defaultPort = opts.defaultPort || defaultPort;
      opts.port = parsedUrl.port || defaultPort;
      opts.host = parsedUrl.hostname.startsWith("[") ? parsedUrl.hostname.slice(1, -1) : parsedUrl.hostname;
      opts.headers = {
        ...opts.headers,
        "Sec-WebSocket-Version": opts.protocolVersion,
        "Sec-WebSocket-Key": key,
        Connection: "Upgrade",
        Upgrade: "websocket"
      };
      opts.path = parsedUrl.pathname + parsedUrl.search;
      opts.timeout = opts.handshakeTimeout;
      if (opts.perMessageDeflate) {
        perMessageDeflate = new PerMessageDeflate2({
          ...opts.perMessageDeflate,
          isServer: false,
          maxPayload: opts.maxPayload
        });
        opts.headers["Sec-WebSocket-Extensions"] = format({
          [PerMessageDeflate2.extensionName]: perMessageDeflate.offer()
        });
      }
      if (protocols.length) {
        for (const protocol of protocols) {
          if (typeof protocol !== "string" || !subprotocolRegex.test(protocol) || protocolSet.has(protocol)) {
            throw new SyntaxError(
              "An invalid or duplicated subprotocol was specified"
            );
          }
          protocolSet.add(protocol);
        }
        opts.headers["Sec-WebSocket-Protocol"] = protocols.join(",");
      }
      if (opts.origin) {
        if (opts.protocolVersion < 13) {
          opts.headers["Sec-WebSocket-Origin"] = opts.origin;
        } else {
          opts.headers.Origin = opts.origin;
        }
      }
      if (parsedUrl.username || parsedUrl.password) {
        opts.auth = `${parsedUrl.username}:${parsedUrl.password}`;
      }
      if (isIpcUrl) {
        const parts = opts.path.split(":");
        opts.socketPath = parts[0];
        opts.path = parts[1];
      }
      let req;
      if (opts.followRedirects) {
        if (websocket._redirects === 0) {
          websocket._originalIpc = isIpcUrl;
          websocket._originalSecure = isSecure;
          websocket._originalHostOrSocketPath = isIpcUrl ? opts.socketPath : parsedUrl.host;
          const headers = options && options.headers;
          options = { ...options, headers: {} };
          if (headers) {
            for (const [key2, value] of Object.entries(headers)) {
              options.headers[key2.toLowerCase()] = value;
            }
          }
        } else if (websocket.listenerCount("redirect") === 0) {
          const isSameHost = isIpcUrl ? websocket._originalIpc ? opts.socketPath === websocket._originalHostOrSocketPath : false : websocket._originalIpc ? false : parsedUrl.host === websocket._originalHostOrSocketPath;
          if (!isSameHost || websocket._originalSecure && !isSecure) {
            delete opts.headers.authorization;
            delete opts.headers.cookie;
            if (!isSameHost) delete opts.headers.host;
            opts.auth = void 0;
          }
        }
        if (opts.auth && !options.headers.authorization) {
          options.headers.authorization = "Basic " + Buffer.from(opts.auth).toString("base64");
        }
        req = websocket._req = request(opts);
        if (websocket._redirects) {
          websocket.emit("redirect", websocket.url, req);
        }
      } else {
        req = websocket._req = request(opts);
      }
      if (opts.timeout) {
        req.on("timeout", () => {
          abortHandshake(websocket, req, "Opening handshake has timed out");
        });
      }
      req.on("error", (err2) => {
        if (req === null || req[kAborted]) return;
        req = websocket._req = null;
        emitErrorAndClose(websocket, err2);
      });
      req.on("response", (res) => {
        const location = res.headers.location;
        const statusCode = res.statusCode;
        if (location && opts.followRedirects && statusCode >= 300 && statusCode < 400) {
          if (++websocket._redirects > opts.maxRedirects) {
            abortHandshake(websocket, req, "Maximum redirects exceeded");
            return;
          }
          req.abort();
          let addr;
          try {
            addr = new URL2(location, address);
          } catch (e) {
            const err2 = new SyntaxError(`Invalid URL: ${location}`);
            emitErrorAndClose(websocket, err2);
            return;
          }
          initAsClient(websocket, addr, protocols, options);
        } else if (!websocket.emit("unexpected-response", req, res)) {
          abortHandshake(
            websocket,
            req,
            `Unexpected server response: ${res.statusCode}`
          );
        }
      });
      req.on("upgrade", (res, socket, head) => {
        websocket.emit("upgrade", res);
        if (websocket.readyState !== WebSocket2.CONNECTING) return;
        req = websocket._req = null;
        const upgrade = res.headers.upgrade;
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          abortHandshake(websocket, socket, "Invalid Upgrade header");
          return;
        }
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        if (res.headers["sec-websocket-accept"] !== digest) {
          abortHandshake(websocket, socket, "Invalid Sec-WebSocket-Accept header");
          return;
        }
        const serverProt = res.headers["sec-websocket-protocol"];
        let protError;
        if (serverProt !== void 0) {
          if (!protocolSet.size) {
            protError = "Server sent a subprotocol but none was requested";
          } else if (!protocolSet.has(serverProt)) {
            protError = "Server sent an invalid subprotocol";
          }
        } else if (protocolSet.size) {
          protError = "Server sent no subprotocol";
        }
        if (protError) {
          abortHandshake(websocket, socket, protError);
          return;
        }
        if (serverProt) websocket._protocol = serverProt;
        const secWebSocketExtensions = res.headers["sec-websocket-extensions"];
        if (secWebSocketExtensions !== void 0) {
          if (!perMessageDeflate) {
            const message = "Server sent a Sec-WebSocket-Extensions header but no extension was requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          let extensions;
          try {
            extensions = parse2(secWebSocketExtensions);
          } catch (err2) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          const extensionNames = Object.keys(extensions);
          if (extensionNames.length !== 1 || extensionNames[0] !== PerMessageDeflate2.extensionName) {
            const message = "Server indicated an extension that was not requested";
            abortHandshake(websocket, socket, message);
            return;
          }
          try {
            perMessageDeflate.accept(extensions[PerMessageDeflate2.extensionName]);
          } catch (err2) {
            const message = "Invalid Sec-WebSocket-Extensions header";
            abortHandshake(websocket, socket, message);
            return;
          }
          websocket._extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
        }
        websocket.setSocket(socket, head, {
          allowSynchronousEvents: opts.allowSynchronousEvents,
          generateMask: opts.generateMask,
          maxBufferedChunks: opts.maxBufferedChunks,
          maxFragments: opts.maxFragments,
          maxPayload: opts.maxPayload,
          skipUTF8Validation: opts.skipUTF8Validation
        });
      });
      if (opts.finishRequest) {
        opts.finishRequest(req, websocket);
      } else {
        req.end();
      }
    }
    function emitErrorAndClose(websocket, err2) {
      websocket._readyState = WebSocket2.CLOSING;
      websocket._errorEmitted = true;
      websocket.emit("error", err2);
      websocket.emitClose();
    }
    function netConnect(options) {
      options.path = options.socketPath;
      return net.connect(options);
    }
    function tlsConnect(options) {
      options.path = void 0;
      if (!options.servername && options.servername !== "") {
        options.servername = net.isIP(options.host) ? "" : options.host;
      }
      return tls.connect(options);
    }
    function abortHandshake(websocket, stream, message) {
      websocket._readyState = WebSocket2.CLOSING;
      const err2 = new Error(message);
      Error.captureStackTrace(err2, abortHandshake);
      if (stream.setHeader) {
        stream[kAborted] = true;
        stream.abort();
        if (stream.socket && !stream.socket.destroyed) {
          stream.socket.destroy();
        }
        process.nextTick(emitErrorAndClose, websocket, err2);
      } else {
        stream.destroy(err2);
        stream.once("error", websocket.emit.bind(websocket, "error"));
        stream.once("close", websocket.emitClose.bind(websocket));
      }
    }
    function sendAfterClose(websocket, data, cb) {
      if (data) {
        const length = isBlob(data) ? data.size : toBuffer(data).length;
        if (websocket._socket) websocket._sender._bufferedBytes += length;
        else websocket._bufferedAmount += length;
      }
      if (cb) {
        const err2 = new Error(
          `WebSocket is not open: readyState ${websocket.readyState} (${readyStates[websocket.readyState]})`
        );
        process.nextTick(cb, err2);
      }
    }
    function receiverOnConclude(code, reason) {
      const websocket = this[kWebSocket];
      websocket._closeFrameReceived = true;
      websocket._closeMessage = reason;
      websocket._closeCode = code;
      if (websocket._socket[kWebSocket] === void 0) return;
      websocket._socket.removeListener("data", socketOnData);
      process.nextTick(resume, websocket._socket);
      if (code === 1005) websocket.close();
      else websocket.close(code, reason);
    }
    function receiverOnDrain() {
      const websocket = this[kWebSocket];
      if (!websocket.isPaused) websocket._socket.resume();
    }
    function receiverOnError(err2) {
      const websocket = this[kWebSocket];
      if (websocket._socket[kWebSocket] !== void 0) {
        websocket._socket.removeListener("data", socketOnData);
        process.nextTick(resume, websocket._socket);
        websocket.close(err2[kStatusCode]);
      }
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err2);
      }
    }
    function receiverOnFinish() {
      this[kWebSocket].emitClose();
    }
    function receiverOnMessage(data, isBinary) {
      this[kWebSocket].emit("message", data, isBinary);
    }
    function receiverOnPing(data) {
      const websocket = this[kWebSocket];
      if (websocket._autoPong) websocket.pong(data, !this._isServer, NOOP);
      websocket.emit("ping", data);
    }
    function receiverOnPong(data) {
      this[kWebSocket].emit("pong", data);
    }
    function resume(stream) {
      stream.resume();
    }
    function senderOnError(err2) {
      const websocket = this[kWebSocket];
      if (websocket.readyState === WebSocket2.CLOSED) return;
      if (websocket.readyState === WebSocket2.OPEN) {
        websocket._readyState = WebSocket2.CLOSING;
        setCloseTimer(websocket);
      }
      this._socket.end();
      if (!websocket._errorEmitted) {
        websocket._errorEmitted = true;
        websocket.emit("error", err2);
      }
    }
    function setCloseTimer(websocket) {
      websocket._closeTimer = setTimeout(
        websocket._socket.destroy.bind(websocket._socket),
        websocket._closeTimeout
      );
    }
    function socketOnClose() {
      const websocket = this[kWebSocket];
      this.removeListener("close", socketOnClose);
      this.removeListener("data", socketOnData);
      this.removeListener("end", socketOnEnd);
      websocket._readyState = WebSocket2.CLOSING;
      if (!this._readableState.endEmitted && !websocket._closeFrameReceived && !websocket._receiver._writableState.errorEmitted && this._readableState.length !== 0) {
        const chunk = this.read(this._readableState.length);
        websocket._receiver.write(chunk);
      }
      websocket._receiver.end();
      this[kWebSocket] = void 0;
      clearTimeout(websocket._closeTimer);
      if (websocket._receiver._writableState.finished || websocket._receiver._writableState.errorEmitted) {
        websocket.emitClose();
      } else {
        websocket._receiver.on("error", receiverOnFinish);
        websocket._receiver.on("finish", receiverOnFinish);
      }
    }
    function socketOnData(chunk) {
      if (!this[kWebSocket]._receiver.write(chunk)) {
        this.pause();
      }
    }
    function socketOnEnd() {
      const websocket = this[kWebSocket];
      websocket._readyState = WebSocket2.CLOSING;
      websocket._receiver.end();
      this.end();
    }
    function socketOnError() {
      const websocket = this[kWebSocket];
      this.removeListener("error", socketOnError);
      this.on("error", NOOP);
      if (websocket) {
        websocket._readyState = WebSocket2.CLOSING;
        this.destroy();
      }
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/stream.js
var require_stream = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/stream.js"(exports, module) {
    "use strict";
    var WebSocket2 = require_websocket();
    var { Duplex } = __require("stream");
    function emitClose(stream) {
      stream.emit("close");
    }
    function duplexOnEnd() {
      if (!this.destroyed && this._writableState.finished) {
        this.destroy();
      }
    }
    function duplexOnError(err2) {
      this.removeListener("error", duplexOnError);
      this.destroy();
      if (this.listenerCount("error") === 0) {
        this.emit("error", err2);
      }
    }
    function createWebSocketStream2(ws, options) {
      let terminateOnDestroy = true;
      const duplex = new Duplex({
        ...options,
        autoDestroy: false,
        emitClose: false,
        objectMode: false,
        writableObjectMode: false
      });
      ws.on("message", function message(msg, isBinary) {
        const data = !isBinary && duplex._readableState.objectMode ? msg.toString() : msg;
        if (!duplex.push(data)) ws.pause();
      });
      ws.once("error", function error(err2) {
        if (duplex.destroyed) return;
        terminateOnDestroy = false;
        duplex.destroy(err2);
      });
      ws.once("close", function close() {
        if (duplex.destroyed) return;
        duplex.push(null);
      });
      duplex._destroy = function(err2, callback) {
        if (ws.readyState === ws.CLOSED) {
          callback(err2);
          process.nextTick(emitClose, duplex);
          return;
        }
        let called = false;
        ws.once("error", function error(err3) {
          called = true;
          callback(err3);
        });
        ws.once("close", function close() {
          if (!called) callback(err2);
          process.nextTick(emitClose, duplex);
        });
        if (terminateOnDestroy) ws.terminate();
      };
      duplex._final = function(callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._final(callback);
          });
          return;
        }
        if (ws._socket === null) return;
        if (ws._socket._writableState.finished) {
          callback();
          if (duplex._readableState.endEmitted) duplex.destroy();
        } else {
          ws._socket.once("finish", function finish() {
            callback();
          });
          ws.close();
        }
      };
      duplex._read = function() {
        if (ws.isPaused) ws.resume();
      };
      duplex._write = function(chunk, encoding, callback) {
        if (ws.readyState === ws.CONNECTING) {
          ws.once("open", function open() {
            duplex._write(chunk, encoding, callback);
          });
          return;
        }
        ws.send(chunk, callback);
      };
      duplex.on("end", duplexOnEnd);
      duplex.on("error", duplexOnError);
      return duplex;
    }
    module.exports = createWebSocketStream2;
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/subprotocol.js
var require_subprotocol = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/subprotocol.js"(exports, module) {
    "use strict";
    var { tokenChars } = require_validation();
    function parse2(header) {
      const protocols = /* @__PURE__ */ new Set();
      let start = -1;
      let end = -1;
      let i2 = 0;
      for (i2; i2 < header.length; i2++) {
        const code = header.charCodeAt(i2);
        if (end === -1 && tokenChars[code] === 1) {
          if (start === -1) start = i2;
        } else if (i2 !== 0 && (code === 32 || code === 9)) {
          if (end === -1 && start !== -1) end = i2;
        } else if (code === 44) {
          if (start === -1) {
            throw new SyntaxError(`Unexpected character at index ${i2}`);
          }
          if (end === -1) end = i2;
          const protocol2 = header.slice(start, end);
          if (protocols.has(protocol2)) {
            throw new SyntaxError(`The "${protocol2}" subprotocol is duplicated`);
          }
          protocols.add(protocol2);
          start = end = -1;
        } else {
          throw new SyntaxError(`Unexpected character at index ${i2}`);
        }
      }
      if (start === -1 || end !== -1) {
        throw new SyntaxError("Unexpected end of input");
      }
      const protocol = header.slice(start, i2);
      if (protocols.has(protocol)) {
        throw new SyntaxError(`The "${protocol}" subprotocol is duplicated`);
      }
      protocols.add(protocol);
      return protocols;
    }
    module.exports = { parse: parse2 };
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/ws/lib/websocket-server.js
var require_websocket_server = __commonJS({
  "D:/daily use/Coopanion/resources/app/node_modules/ws/lib/websocket-server.js"(exports, module) {
    "use strict";
    var EventEmitter = __require("events");
    var http = __require("http");
    var { Duplex } = __require("stream");
    var { createHash } = __require("crypto");
    var extension2 = require_extension();
    var PerMessageDeflate2 = require_permessage_deflate();
    var subprotocol2 = require_subprotocol();
    var WebSocket2 = require_websocket();
    var { CLOSE_TIMEOUT, GUID, kWebSocket } = require_constants();
    var keyRegex = /^[+/0-9A-Za-z]{22}==$/;
    var RUNNING = 0;
    var CLOSING = 1;
    var CLOSED = 2;
    var WebSocketServer2 = class extends EventEmitter {
      /**
       * Create a `WebSocketServer` instance.
       *
       * @param {Object} options Configuration options
       * @param {Boolean} [options.allowSynchronousEvents=true] Specifies whether
       *     any of the `'message'`, `'ping'`, and `'pong'` events can be emitted
       *     multiple times in the same tick
       * @param {Boolean} [options.autoPong=true] Specifies whether or not to
       *     automatically send a pong in response to a ping
       * @param {Number} [options.backlog=511] The maximum length of the queue of
       *     pending connections
       * @param {Boolean} [options.clientTracking=true] Specifies whether or not to
       *     track clients
       * @param {Number} [options.closeTimeout=30000] Duration in milliseconds to
       *     wait for the closing handshake to finish after `websocket.close()` is
       *     called
       * @param {Function} [options.handleProtocols] A hook to handle protocols
       * @param {String} [options.host] The hostname where to bind the server
       * @param {Number} [options.maxBufferedChunks=262144] The maximum number of
       *     buffered data chunks
       * @param {Number} [options.maxFragments=16384] The maximum number of message
       *     fragments
       * @param {Number} [options.maxPayload=104857600] The maximum allowed message
       *     size
       * @param {Boolean} [options.noServer=false] Enable no server mode
       * @param {String} [options.path] Accept only connections matching this path
       * @param {(Boolean|Object)} [options.perMessageDeflate=false] Enable/disable
       *     permessage-deflate
       * @param {Number} [options.port] The port where to bind the server
       * @param {(http.Server|https.Server)} [options.server] A pre-created HTTP/S
       *     server to use
       * @param {Boolean} [options.skipUTF8Validation=false] Specifies whether or
       *     not to skip UTF-8 validation for text and close messages
       * @param {Function} [options.verifyClient] A hook to reject connections
       * @param {Function} [options.WebSocket=WebSocket] Specifies the `WebSocket`
       *     class to use. It must be the `WebSocket` class or class that extends it
       * @param {Function} [callback] A listener for the `listening` event
       */
      constructor(options, callback) {
        super();
        options = {
          allowSynchronousEvents: true,
          autoPong: true,
          maxBufferedChunks: 256 * 1024,
          maxFragments: 16 * 1024,
          maxPayload: 100 * 1024 * 1024,
          skipUTF8Validation: false,
          perMessageDeflate: false,
          handleProtocols: null,
          clientTracking: true,
          closeTimeout: CLOSE_TIMEOUT,
          verifyClient: null,
          noServer: false,
          backlog: null,
          // use default (511 as implemented in net.js)
          server: null,
          host: null,
          path: null,
          port: null,
          WebSocket: WebSocket2,
          ...options
        };
        if (options.port == null && !options.server && !options.noServer || options.port != null && (options.server || options.noServer) || options.server && options.noServer) {
          throw new TypeError(
            'One and only one of the "port", "server", or "noServer" options must be specified'
          );
        }
        if (options.port != null) {
          this._server = http.createServer((req, res) => {
            const body = http.STATUS_CODES[426];
            res.writeHead(426, {
              "Content-Length": body.length,
              "Content-Type": "text/plain"
            });
            res.end(body);
          });
          this._server.listen(
            options.port,
            options.host,
            options.backlog,
            callback
          );
        } else if (options.server) {
          this._server = options.server;
        }
        if (this._server) {
          const emitConnection = this.emit.bind(this, "connection");
          this._removeListeners = addListeners(this._server, {
            listening: this.emit.bind(this, "listening"),
            error: this.emit.bind(this, "error"),
            upgrade: (req, socket, head) => {
              this.handleUpgrade(req, socket, head, emitConnection);
            }
          });
        }
        if (options.perMessageDeflate === true) options.perMessageDeflate = {};
        if (options.clientTracking) {
          this.clients = /* @__PURE__ */ new Set();
          this._shouldEmitClose = false;
        }
        this.options = options;
        this._state = RUNNING;
      }
      /**
       * Returns the bound address, the address family name, and port of the server
       * as reported by the operating system if listening on an IP socket.
       * If the server is listening on a pipe or UNIX domain socket, the name is
       * returned as a string.
       *
       * @return {(Object|String|null)} The address of the server
       * @public
       */
      address() {
        if (this.options.noServer) {
          throw new Error('The server is operating in "noServer" mode');
        }
        if (!this._server) return null;
        return this._server.address();
      }
      /**
       * Stop the server from accepting new connections and emit the `'close'` event
       * when all existing connections are closed.
       *
       * @param {Function} [cb] A one-time listener for the `'close'` event
       * @public
       */
      close(cb) {
        if (this._state === CLOSED) {
          if (cb) {
            this.once("close", () => {
              cb(new Error("The server is not running"));
            });
          }
          process.nextTick(emitClose, this);
          return;
        }
        if (cb) this.once("close", cb);
        if (this._state === CLOSING) return;
        this._state = CLOSING;
        if (this.options.noServer || this.options.server) {
          if (this._server) {
            this._removeListeners();
            this._removeListeners = this._server = null;
          }
          if (this.clients) {
            if (!this.clients.size) {
              process.nextTick(emitClose, this);
            } else {
              this._shouldEmitClose = true;
            }
          } else {
            process.nextTick(emitClose, this);
          }
        } else {
          const server = this._server;
          this._removeListeners();
          this._removeListeners = this._server = null;
          server.close(() => {
            emitClose(this);
          });
        }
      }
      /**
       * See if a given request should be handled by this server instance.
       *
       * @param {http.IncomingMessage} req Request object to inspect
       * @return {Boolean} `true` if the request is valid, else `false`
       * @public
       */
      shouldHandle(req) {
        if (this.options.path) {
          const index = req.url.indexOf("?");
          const pathname = index !== -1 ? req.url.slice(0, index) : req.url;
          if (pathname !== this.options.path) return false;
        }
        return true;
      }
      /**
       * Handle a HTTP Upgrade request.
       *
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @public
       */
      handleUpgrade(req, socket, head, cb) {
        socket.on("error", socketOnError);
        const key = req.headers["sec-websocket-key"];
        const upgrade = req.headers.upgrade;
        const version = +req.headers["sec-websocket-version"];
        if (req.method !== "GET") {
          const message = "Invalid HTTP method";
          abortHandshakeOrEmitwsClientError(this, req, socket, 405, message);
          return;
        }
        if (upgrade === void 0 || upgrade.toLowerCase() !== "websocket") {
          const message = "Invalid Upgrade header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (key === void 0 || !keyRegex.test(key)) {
          const message = "Missing or invalid Sec-WebSocket-Key header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
          return;
        }
        if (version !== 13 && version !== 8) {
          const message = "Missing or invalid Sec-WebSocket-Version header";
          abortHandshakeOrEmitwsClientError(this, req, socket, 400, message, {
            "Sec-WebSocket-Version": "13, 8"
          });
          return;
        }
        if (!this.shouldHandle(req)) {
          abortHandshake(socket, 400);
          return;
        }
        const secWebSocketProtocol = req.headers["sec-websocket-protocol"];
        let protocols = /* @__PURE__ */ new Set();
        if (secWebSocketProtocol !== void 0) {
          try {
            protocols = subprotocol2.parse(secWebSocketProtocol);
          } catch (err2) {
            const message = "Invalid Sec-WebSocket-Protocol header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        const secWebSocketExtensions = req.headers["sec-websocket-extensions"];
        const extensions = {};
        if (this.options.perMessageDeflate && secWebSocketExtensions !== void 0) {
          const perMessageDeflate = new PerMessageDeflate2({
            ...this.options.perMessageDeflate,
            isServer: true,
            maxPayload: this.options.maxPayload
          });
          try {
            const offers = extension2.parse(secWebSocketExtensions);
            if (offers[PerMessageDeflate2.extensionName]) {
              perMessageDeflate.accept(offers[PerMessageDeflate2.extensionName]);
              extensions[PerMessageDeflate2.extensionName] = perMessageDeflate;
            }
          } catch (err2) {
            const message = "Invalid or unacceptable Sec-WebSocket-Extensions header";
            abortHandshakeOrEmitwsClientError(this, req, socket, 400, message);
            return;
          }
        }
        if (this.options.verifyClient) {
          const info = {
            origin: req.headers[`${version === 8 ? "sec-websocket-origin" : "origin"}`],
            secure: !!(req.socket.authorized || req.socket.encrypted),
            req
          };
          if (this.options.verifyClient.length === 2) {
            this.options.verifyClient(info, (verified, code, message, headers) => {
              if (!verified) {
                return abortHandshake(socket, code || 401, message, headers);
              }
              this.completeUpgrade(
                extensions,
                key,
                protocols,
                req,
                socket,
                head,
                cb
              );
            });
            return;
          }
          if (!this.options.verifyClient(info)) return abortHandshake(socket, 401);
        }
        this.completeUpgrade(extensions, key, protocols, req, socket, head, cb);
      }
      /**
       * Upgrade the connection to WebSocket.
       *
       * @param {Object} extensions The accepted extensions
       * @param {String} key The value of the `Sec-WebSocket-Key` header
       * @param {Set} protocols The subprotocols
       * @param {http.IncomingMessage} req The request object
       * @param {Duplex} socket The network socket between the server and client
       * @param {Buffer} head The first packet of the upgraded stream
       * @param {Function} cb Callback
       * @throws {Error} If called more than once with the same socket
       * @private
       */
      completeUpgrade(extensions, key, protocols, req, socket, head, cb) {
        if (!socket.readable || !socket.writable) return socket.destroy();
        if (socket[kWebSocket]) {
          throw new Error(
            "server.handleUpgrade() was called more than once with the same socket, possibly due to a misconfiguration"
          );
        }
        if (this._state > RUNNING) return abortHandshake(socket, 503);
        const digest = createHash("sha1").update(key + GUID).digest("base64");
        const headers = [
          "HTTP/1.1 101 Switching Protocols",
          "Upgrade: websocket",
          "Connection: Upgrade",
          `Sec-WebSocket-Accept: ${digest}`
        ];
        const ws = new this.options.WebSocket(null, void 0, this.options);
        if (protocols.size) {
          const protocol = this.options.handleProtocols ? this.options.handleProtocols(protocols, req) : protocols.values().next().value;
          if (protocol) {
            headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
            ws._protocol = protocol;
          }
        }
        if (extensions[PerMessageDeflate2.extensionName]) {
          const params = extensions[PerMessageDeflate2.extensionName].params;
          const value = extension2.format({
            [PerMessageDeflate2.extensionName]: [params]
          });
          headers.push(`Sec-WebSocket-Extensions: ${value}`);
          ws._extensions = extensions;
        }
        this.emit("headers", headers, req);
        socket.write(headers.concat("\r\n").join("\r\n"));
        socket.removeListener("error", socketOnError);
        ws.setSocket(socket, head, {
          allowSynchronousEvents: this.options.allowSynchronousEvents,
          maxBufferedChunks: this.options.maxBufferedChunks,
          maxFragments: this.options.maxFragments,
          maxPayload: this.options.maxPayload,
          skipUTF8Validation: this.options.skipUTF8Validation
        });
        if (this.clients) {
          this.clients.add(ws);
          ws.on("close", () => {
            this.clients.delete(ws);
            if (this._shouldEmitClose && !this.clients.size) {
              process.nextTick(emitClose, this);
            }
          });
        }
        cb(ws, req);
      }
    };
    module.exports = WebSocketServer2;
    function addListeners(server, map) {
      for (const event of Object.keys(map)) server.on(event, map[event]);
      return function removeListeners() {
        for (const event of Object.keys(map)) {
          server.removeListener(event, map[event]);
        }
      };
    }
    function emitClose(server) {
      server._state = CLOSED;
      server.emit("close");
    }
    function socketOnError() {
      this.destroy();
    }
    function abortHandshake(socket, code, message, headers) {
      message = message || http.STATUS_CODES[code];
      headers = {
        Connection: "close",
        "Content-Type": "text/html",
        "Content-Length": Buffer.byteLength(message),
        ...headers
      };
      socket.once("finish", socket.destroy);
      socket.end(
        `HTTP/1.1 ${code} ${http.STATUS_CODES[code]}\r
` + Object.keys(headers).map((h) => `${h}: ${headers[h]}`).join("\r\n") + "\r\n\r\n" + message
      );
    }
    function abortHandshakeOrEmitwsClientError(server, req, socket, code, message, headers) {
      if (server.listenerCount("wsClientError")) {
        const err2 = new Error(message);
        Error.captureStackTrace(err2, abortHandshakeOrEmitwsClientError);
        server.emit("wsClientError", err2, socket, req);
      } else {
        abortHandshake(socket, code, message, headers);
      }
    }
  }
});

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/server.ts
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, extname as extname2, join as join2, normalize as normalize2, sep as sep2 } from "node:path";

// D:/daily use/Coopanion/resources/app/node_modules/ws/wrapper.mjs
var import_stream = __toESM(require_stream(), 1);
var import_extension = __toESM(require_extension(), 1);
var import_permessage_deflate = __toESM(require_permessage_deflate(), 1);
var import_receiver = __toESM(require_receiver(), 1);
var import_sender = __toESM(require_sender(), 1);
var import_subprotocol = __toESM(require_subprotocol(), 1);
var import_websocket = __toESM(require_websocket(), 1);
var import_websocket_server = __toESM(require_websocket_server(), 1);

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/server.ts
import { languageTag } from "cortico/core/language.ts";

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/packs.ts
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/zh.ts
var zh_default = {
  /** 没设称呼时,事件和气泡里对使用者的称呼 */
  defaultUser: "\u4F19\u4F34",
  /** 桌宠菜单与气泡 */
  menu: {
    /** 应用没给退出按钮起名时的名字 */
    quit: "\u9000\u51FA",
    /** 点电源键后菜单头上的确认问句 */
    quitPrompt: (label) => `${label}?`
  },
  /** 状态气泡:没有专门描述的工具调用 */
  busy: "\u5728\u5FD9",
  /** 语音输入:菜单里麦克风按钮的状态、引导和设置页的说明 */
  voice: {
    starting: "\u8BC6\u522B\u670D\u52A1\u542F\u52A8\u4E2D",
    notRunning: "\u8BC6\u522B\u670D\u52A1\u6CA1\u6709\u8FD0\u884C",
    modelMissing: (mb) => `\u8BC6\u522B\u6A21\u578B\u5C1A\u672A\u4E0B\u8F7D\uFF08\u7EA6 ${mb} MB\uFF09\uFF0C\u8BF7\u5728\u300C\u8BED\u97F3\u8F93\u5165\u300D\u9875\u4E0B\u8F7D`,
    badKey: (hotkey) => `\u65E0\u6CD5\u8BC6\u522B\u6309\u952E\u300C${hotkey}\u300D`,
    keyProblem: (problem) => `\u8BF4\u8BDD\u952E\u4E0D\u53EF\u7528\uFF0C\u6682\u4E0D\u8BC6\u522B\u8BF4\u8BDD\uFF1A${problem}`,
    always: "\u6301\u7EED\u6536\u97F3\uFF0C\u76F4\u63A5\u8BF4\u8BDD\u5373\u53EF",
    /** 用说话键开关收音;label 是含连击的完整按键名(「双击 左 Alt」) */
    toggleTaps: (label, taps) => `${label} \u5F00\u59CB\u6536\u97F3\uFF0C\u518D${taps === 2 ? "\u53CC\u51FB" : "\u4E09\u51FB"}\u505C\u6B62`,
    toggle: (key) => `\u6309\u4E00\u4E0B ${key} \u5F00\u59CB\u6536\u97F3\uFF0C\u518D\u6309\u4E00\u4E0B\u505C\u6B62`,
    holdTaps: (key, taps) => `\u5FEB\u901F\u6309${taps === 2 ? "\u4E00" : "\u4E24"}\u4E0B ${key}\uFF0C\u7D27\u63A5\u7740\u6309\u4F4F\u8BF4\u8BDD\uFF0C\u677E\u5F00\u5373\u53D1\u9001`,
    hold: (key) => `\u6309\u4F4F ${key} \u8BF4\u8BDD\uFF0C\u677E\u5F00\u5373\u53D1\u9001`,
    /** 「语音输入」页识别结果里,没识别出来的那一行 */
    failedLine: (error) => `[\u5931\u8D25] ${error}`
  },
  /** 说话键的名字,与 Windows 的键名一一对应;Mac 那组覆盖在上面 */
  keys: {
    LeftCtrl: "\u5DE6 Ctrl",
    RightCtrl: "\u53F3 Ctrl",
    LeftAlt: "\u5DE6 Alt",
    RightAlt: "\u53F3 Alt",
    LeftShift: "\u5DE6 Shift",
    RightShift: "\u53F3 Shift",
    RightWin: "\u53F3 Win",
    Backquote: "`",
    Mouse3: "\u9F20\u6807\u4E2D\u952E",
    Mouse4: "\u9F20\u6807\u4FA7\u952E 4",
    Mouse5: "\u9F20\u6807\u4FA7\u952E 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "\u5DE6 Control",
    RightCtrl: "\u53F3 Control",
    Alt: "Option",
    LeftAlt: "\u5DE6 Option",
    RightAlt: "\u53F3 Option",
    Win: "Command",
    RightWin: "\u53F3 Command"
  },
  /** 连按的说法,放在键名前:「双击 左 Alt」 */
  taps: (taps, keys) => `${taps === 2 ? "\u53CC\u51FB" : "\u4E09\u51FB"} ${keys}`,
  /** 说话键读不了的原因 */
  hotkey: {
    cannotRead: (why) => `\u65E0\u6CD5\u8BFB\u53D6\u952E\u76D8\u72B6\u6001\uFF1A${why}`,
    macNoKey: "Mac \u4E0A\u6CA1\u6709\u8FD9\u4E2A\u6309\u952E\uFF0C\u8BF7\u66F4\u6362\u8BF4\u8BDD\u952E",
    macPermission: "\u6CA1\u6709\u300C\u8F93\u5165\u76D1\u63A7\u300D\u6743\u9650\uFF1A\u5728\u300C\u7CFB\u7EDF\u8BBE\u7F6E \u2192 \u9690\u79C1\u4E0E\u5B89\u5168\u6027 \u2192 \u8F93\u5165\u76D1\u63A7\u300D\u91CC\u6253\u5F00 Coopanion\uFF0C\u518D\u91CD\u542F\u5B83\uFF1B\u5DF2\u7ECF\u5F00\u7740\u7684\u8BDD\uFF0C\u5148\u7528\u300C\u2212\u300D\u628A Coopanion \u79FB\u51FA\u5217\u8868\u518D\u52A0\u56DE\u6765\uFF1A\u66F4\u65B0\u540E\u7684\u65B0\u7248\u672C\u4E0D\u8BA4\u65E7\u6388\u6743",
    linuxNoKey: "Linux \u4E0A\u65E0\u6CD5\u8BFB\u53D6\u8BE5\u6309\u952E\uFF08\u4E0D\u652F\u6301\u9F20\u6807\u4FA7\u952E\uFF09\uFF0C\u8BF7\u66F4\u6362\u8BF4\u8BDD\u952E",
    linuxNoDisplay: "\u6309\u952E\u6536\u97F3\u5728 Linux \u4E0A\u9700\u8981 X11\uFF08\u6216 XWayland\uFF09\uFF1A\u6CA1\u6709\u627E\u5230 DISPLAY",
    linuxNoX11: "\u6309\u952E\u6536\u97F3\u8FDE\u4E0D\u4E0A X11 \u663E\u793A",
    unsupported: "\u6309\u952E\u6536\u97F3\u53EA\u5728 Windows\u3001macOS \u548C Linux \u4E0A\u53EF\u7528"
  },
  /** 打字键读不了的原因;另两种(读不了键盘、没有输入监控权限)与说话键共用 `hotkey` 里的 */
  typeKey: {
    macNoKey: "Mac \u4E0A\u6CA1\u6709\u8FD9\u4E2A\u6309\u952E\uFF0C\u8BF7\u66F4\u6362\u6253\u5B57\u952E",
    linuxNoKey: "Linux \u4E0A\u65E0\u6CD5\u8BFB\u53D6\u8BE5\u6309\u952E\uFF08\u4E0D\u652F\u6301\u9F20\u6807\u4FA7\u952E\uFF09\uFF0C\u8BF7\u66F4\u6362\u6253\u5B57\u952E",
    linuxNoDisplay: "\u6253\u5B57\u952E\u5728 Linux \u4E0A\u9700\u8981 X11\uFF08\u6216 XWayland\uFF09\uFF1A\u6CA1\u6709\u627E\u5230 DISPLAY",
    linuxNoX11: "\u6253\u5B57\u952E\u8FDE\u4E0D\u4E0A X11 \u663E\u793A",
    unsupported: "\u6253\u5B57\u952E\u53EA\u5728 Windows\u3001macOS \u548C Linux \u4E0A\u53EF\u7528"
  },
  /** Windows 自带的语音识别 */
  system: {
    name: (culture) => culture ? `Windows \u8BED\u97F3\u8BC6\u522B\uFF08${culture}\uFF09` : "Windows \u8BED\u97F3\u8BC6\u522B",
    noSpeech: "\u7CFB\u7EDF\u8BED\u97F3\u7EC4\u4EF6 System.Speech \u52A0\u8F7D\u4E0D\u4E86",
    noRecognizer: (language) => `\u7CFB\u7EDF\u91CC\u6CA1\u6709${language === "auto" ? "" : `\u300C${language}\u300D\u7684`}\u8BED\u97F3\u8BC6\u522B\u5668\uFF1A\u5728 Windows \u8BBE\u7F6E \u2192 \u65F6\u95F4\u548C\u8BED\u8A00 \u2192 \u8BED\u8A00\u91CC\u7ED9\u8BE5\u8BED\u8A00\u88C5\u4E0A\u300C\u8BED\u97F3\u8BC6\u522B\u300D`,
    windowsOnly: "\u7CFB\u7EDF\u8BED\u97F3\u8BC6\u522B\u53EA\u5728 Windows \u4E0A\u53EF\u7528",
    startFailed: (why) => `\u542F\u52A8\u5931\u8D25\uFF1A${why}`,
    exited: "\u7CFB\u7EDF\u8BED\u97F3\u8BC6\u522B\u8FDB\u7A0B\u9000\u51FA\u4E86",
    exitedCode: (code) => `\u7CFB\u7EDF\u8BED\u97F3\u8BC6\u522B\u8FDB\u7A0B\u9000\u51FA\uFF08\u9000\u51FA\u7801 ${code}\uFF09`,
    notReady: "\u7CFB\u7EDF\u8BED\u97F3\u8BC6\u522B\u5728\u671F\u9650\u5185\u6CA1\u6709\u5C31\u7EEA",
    notRunning: "\u7CFB\u7EDF\u8BED\u97F3\u8BC6\u522B\u6CA1\u6709\u8FD0\u884C",
    timeout: (ms) => `\u8BC6\u522B\u8D85\u65F6\uFF08${ms}ms\uFF09`,
    stopped: "\u7CFB\u7EDF\u8BED\u97F3\u8BC6\u522B\u5DF2\u505C\u6B62"
  },
  /** sherpa-onnx 跑的识别模型 */
  sherpa: {
    incomplete: "\u8BC6\u522B\u6A21\u578B\u6587\u4EF6\u4E0D\u5B8C\u6574\uFF0C\u8BF7\u91CD\u65B0\u4E0B\u8F7D",
    noRuntime: (platform) => `\u8FD9\u4E2A\u5E73\u53F0\uFF08${platform}\uFF09\u6CA1\u6709 sherpa-onnx \u7684\u8FD0\u884C\u5E93`,
    loadFailed: (why) => `\u8BC6\u522B\u6A21\u578B\u8F7D\u5165\u5931\u8D25\uFF1A${why}`,
    notLoaded: "\u8BC6\u522B\u6A21\u578B\u6CA1\u6709\u8F7D\u5165"
  },
  /** OpenAI 兼容的转写接口(引擎 api) */
  transcription: {
    noUrl: "\u8FD8\u6CA1\u6709\u586B\u5199\u8F6C\u5199\u63A5\u53E3\u7684\u5730\u5740",
    badUrl: (url) => `\u63A5\u53E3\u5730\u5740\u4E0D\u662F http \u6216 https \u7F51\u5740\uFF1A${url}`,
    httpRemote: "\u8FDC\u7A0B\u5730\u5740\u53EA\u80FD\u7528 https\uFF1Ahttp \u4E0D\u52A0\u5BC6\uFF0CAPI Key \u548C\u5F55\u97F3\u4F1A\u660E\u6587\u4F20\u8F93\u3002\u672C\u673A\u548C\u5C40\u57DF\u7F51\u7684\u5730\u5740\u53EF\u4EE5\u7528 http\u3002",
    noModel: "\u8FD8\u6CA1\u6709\u586B\u5199\u8F6C\u5199\u6A21\u578B",
    notRunning: "\u8F6C\u5199\u63A5\u53E3\u6CA1\u6709\u542F\u52A8",
    status: (status, message) => message ? `HTTP ${status}\uFF1A${message}` : `HTTP ${status}`,
    timeout: (ms) => `\u63A5\u53E3\u5728 ${ms} ms \u5185\u6CA1\u6709\u56DE\u5E94`,
    network: (why) => `\u8FDE\u4E0D\u4E0A\u63A5\u53E3\uFF1A${why}`,
    noText: "\u63A5\u53E3\u7684\u56DE\u5E94\u91CC\u6CA1\u6709 text"
  },
  /** 窗口运行时与识别模型的下载 */
  store: {
    noBuild: (platform) => `\u6CA1\u6709 ${platform} \u7684\u9884\u7F16\u8BD1\u5305`,
    downloading: (file) => `\u4E0B\u8F7D ${file}`,
    unpacking: "\u89E3\u538B",
    downloadingModel: "\u4E0B\u8F7D\u8BC6\u522B\u6A21\u578B",
    downloadingFrom: (file, host) => `\u4E0B\u8F7D ${file}\uFF08${host}\uFF09`,
    verifying: (file) => `\u6821\u9A8C ${file}`,
    mismatch: (sum) => `\u6821\u9A8C\u4E0D\u7B26\uFF1A${sum}\u2026`,
    failed: (file, why) => `${file} \u4E0B\u8F7D\u5931\u8D25\uFF08${why}\uFF09`,
    exitCode: (cmd, code, out) => `${cmd} \u9000\u51FA\u7801 ${code}\uFF1A${out}`
  },
  /** 形象包 figure.json 读不了的原因;字段名照写 */
  packs: {
    noManifest: (file) => `\u6CA1\u6709 ${file}`,
    badJson: (file, why) => `${file} \u4E0D\u662F\u5408\u6CD5\u7684 JSON\uFF1A${why}`,
    notInteger: (key, got) => `${key} \u5E94\u4E3A\u6574\u6570\uFF0C\u662F ${got}`,
    tooNew: (key, v, now) => `${key} \u662F ${v}\uFF0C\u8FD9\u4E00\u7248\u53EA\u8BA4\u5230 ${now}\uFF1A\u8981\u5148\u66F4\u65B0\u5E94\u7528`,
    tooOld: (key, v, oldest) => `${key} ${v} \u662F ${oldest} \u4E4B\u524D\u7684\u6D4B\u8BD5\u683C\u5F0F\uFF0C\u8BFB\u4E0D\u4E86`,
    badId: (got) => `id \u4E0D\u5408\u6CD5\uFF1A${got}`,
    noName: "name \u7F3A\u5931",
    noAbout: "about \u7F3A\u5931",
    badEntry: "entry \u6216 export \u4E0D\u5408\u6CD5",
    badModel: "model \u8DEF\u5F84\u4E0D\u5408\u6CD5",
    badThumb: "thumb \u8DEF\u5F84\u4E0D\u5408\u6CD5",
    badAxis: (got) => `axes \u91CC\u6709\u4E0D\u5408\u6CD5\u7684\u4E00\u9879\uFF1A${got}`,
    badOption: (axis, got) => `axes.${axis} \u91CC\u6709\u4E0D\u5408\u6CD5\u7684\u9009\u9879\uFF1A${got}`,
    badPreset: (got) => `presets \u91CC\u6709\u4E0D\u5408\u6CD5\u7684\u4E00\u9879\uFF1A${got}`,
    presetMissing: (preset, axis) => `presets.${preset} \u6CA1\u6709\u9009 ${axis} \u7684\u9009\u9879`,
    vocabNotArray: "vocab \u5E94\u4E3A\u6570\u7EC4",
    badWordId: (got) => `vocab \u91CC\u6709\u4E0D\u5408\u6CD5\u7684 id\uFF1A${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind \u662F ${kind}\uFF0C\u8FD9\u4E00\u7248\u4E0D\u8BA4\u8BC6\uFF0C\u8FD9\u4E2A\u8BCD\u4E0D\u7ED9 bot \u7528`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} \u5E94\u4E3A\u6570\u7EC4`,
    badWordName: (id, got) => `vocab.${id} \u7684\u540D\u5B57\u4E0D\u5408\u6CD5\uFF1A${got}`,
    nameTaken: (name) => `vocab \u91CC ${name} \u6307\u4E86\u4E0D\u6B62\u4E00\u4E2A\u8BCD`,
    noWordAbout: (id) => `vocab.${id}.about \u7F3A\u5931`,
    badSeconds: (id) => `vocab.${id}.seconds \u5E94\u4E3A\u6B63\u6570`,
    soundsNotObject: "sounds \u5E94\u4E3A\u5BF9\u8C61",
    badSoundName: (got) => `sounds \u91CC\u7684\u540D\u5B57\u4E0D\u5408\u6CD5\uFF1A${got}`,
    badSoundFile: (name) => `sounds.${name}.file \u5E94\u4E3A\u5F62\u8C61\u5305\u91CC\u7684\u6587\u4EF6`,
    badVolume: (name) => `sounds.${name}.volume \u5E94\u4E3A 0\u20131`,
    soundType: (name, file) => `sounds.${name} \u7684 ${file} \u4E0D\u662F\u8FD9\u4E00\u7248\u653E\u5F97\u4E86\u7684 .ogg\u3001.mp3 \u6216 .wav\uFF0C\u8FD9\u4E2A\u58F0\u97F3\u4E0D\u4F1A\u54CD`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind \u662F ${kind}\uFF0C\u8FD9\u4E00\u7248\u53EA\u8BA4 ${kinds.join("\u3001")}\uFF0C\u8FD9\u4E2A\u58F0\u97F3\u4E0D\u4F1A\u54CD`,
    soundMissing: (name, file) => `sounds.${name} \u7684 ${file} \u4E0D\u5B58\u5728\uFF0C\u8FD9\u4E2A\u58F0\u97F3\u4E0D\u4F1A\u54CD`,
    badWalk: (got) => `can.walk \u662F ${got}\uFF0C\u8FD9\u4E00\u7248\u4E0D\u8BA4\u8BC6\uFF0C\u6309\u4F1A\u8D70\u5904\u7406`,
    movesNotArray: "moves \u5E94\u4E3A\u6570\u7EC4",
    tooManyMoves: (max2) => `moves \u6700\u591A ${max2} \u9879`,
    badMoveId: (got) => `moves \u91CC\u6709\u4E0D\u5408\u6CD5\u7684 id\uFF1A${got}\uFF08left\u3001center\u3001right\u3001cursor \u548C\u6570\u5B57\u662F\u9ED8\u8BA4\u76EE\u6807\uFF09`,
    moveTaken: (id) => `moves \u91CC\u6709\u4E0D\u6B62\u4E00\u4E2A ${id}`,
    noMoveText: (id) => `moves.${id} \u7F3A\u5C11 name \u6216 about`,
    badMoveParams: (id, max2) => `moves.${id}.params \u5E94\u4E3A\u6700\u591A ${max2} \u9879\u7684\u6570\u7EC4\uFF0C\u6BCF\u9879\u6709 id\u3001about \u548C min \u5C0F\u4E8E max \u7684\u6570\u503C`,
    needsNotArray: "needs \u5E94\u4E3A\u6570\u7EC4",
    unknownNeed: (got) => `needs \u91CC\u7684 ${got} \u8FD9\u4E00\u7248\u4E0D\u8BA4\u8BC6\uFF0C\u4E0D\u63D0\u4F9B`,
    idTaken: (id, builtin) => `id ${id} \u5DF2\u88AB${builtin ? "\u5185\u7F6E\u5F62\u8C61" : "\u53E6\u4E00\u4E2A\u5F62\u8C61\u5305"}\u5360\u7528`
  },
  /** 在装扮页导入形象包 */
  importing: {
    badZip: (why) => `\u8FD9\u4E0D\u662F\u80FD\u8BFB\u7684 zip\uFF1A${why}`,
    tooBig: (mb) => `\u89E3\u5F00\u540E\u8D85\u8FC7 ${mb} MB`,
    truncated: "\u4E0A\u4F20\u7684\u5185\u5BB9\u4E0D\u5B8C\u6574",
    badPath: (path) => `\u6709\u4E00\u4E2A\u8DEF\u5F84\u4E0D\u80FD\u7528\uFF1A${path}`,
    builtinId: (id) => `id ${id} \u662F\u5185\u7F6E\u5F62\u8C61\u7684\uFF0C\u6362\u4E2A id \u624D\u80FD\u5BFC\u5165`,
    duplicateId: (id) => `id ${id} \u548C\u8FD9\u6B21\u5BFC\u5165\u7684\u53E6\u4E00\u4E2A\u5F62\u8C61\u5305\u91CD\u590D`,
    unpackFailed: (why) => `\u6CA1\u80FD\u89E3\u5F00\uFF1A${why}`,
    expired: "\u8FD9\u6B21\u5BFC\u5165\u5DF2\u7ECF\u8FC7\u671F\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9",
    noneChosen: "\u6CA1\u6709\u9009\u8981\u5BFC\u5165\u7684\u5F62\u8C61\u5305",
    zipOrFolder: "\u53EA\u6536 zip \u6216\u6587\u4EF6\u5939",
    overLimit: (mb) => `\u8D85\u8FC7 ${mb} MB`
  },
  /** 在装扮页卸载形象包 */
  removing: {
    notInstalled: (id) => `\u6CA1\u6709 id \u4E3A ${id} \u7684\u5F62\u8C61\u5305`,
    builtin: (id) => `${id} \u662F\u5185\u7F6E\u5F62\u8C61\uFF0C\u4E0D\u80FD\u5378\u8F7D`,
    elsewhere: (id) => `${id} \u4E0D\u5728\u5F62\u8C61\u5305\u7684\u5B89\u88C5\u76EE\u5F55\u91CC\uFF0C\u4E0D\u80FD\u5728\u8FD9\u91CC\u5378\u8F7D`,
    failed: (why) => `\u6CA1\u80FD\u5220\u9664\uFF1A${why}`
  },
  /** 桌宠想改设置、要先征得同意时的气泡:问句、三个按钮,以及每项改动的说法 */
  consent: {
    question: (items) => `\u6211\u60F3${items.join("\u3001")}\uFF0C\u53EF\u4EE5\u5417\uFF1F`,
    /** 可以 / 以后都可以(这几项以后不再问) / 不用了 */
    choices: ["\u53EF\u4EE5", "\u4EE5\u540E\u90FD\u53EF\u4EE5", "\u4E0D\u7528\u4E86"],
    list: (items) => items.join("\u3001"),
    pick: (axis, option) => `${axis}\uFF1A${option}`,
    figure: (to) => `\u6362\u6210${to}\u7684\u6837\u5B50`,
    scheme: (figure, look) => `\u6362\u4E00\u8EAB${figure}\u7684\u6253\u626E\uFF08${look}\uFF09`,
    roam: { free: "\u5E38\u8D70\u52A8", calm: "\u591A\u5F85\u7740", off: "\u4E0D\u4E71\u52A8" },
    roamTo: (to) => `\u8D70\u52A8\u6539\u6210\u300C${to}\u300D`,
    snore: (seconds) => seconds === 0 ? "\u7761\u7740\u65F6\u4E00\u76F4\u6253\u547C\u565C\u5230\u9192" : `\u6BCF\u6B21\u7761\u7740\u6253 ${seconds} \u79D2\u547C\u565C`,
    sound: (on) => on ? "\u6253\u5F00\u97F3\u6548" : "\u5173\u6389\u97F3\u6548",
    scale: (from, to) => `\u628A\u5927\u5C0F\u4ECE ${from} \u500D\u6539\u6210 ${to} \u500D`,
    bubbleSize: (from, to) => `\u628A\u6C14\u6CE1\u5C3A\u5BF8\u4ECE ${from} \u500D\u6539\u6210 ${to} \u500D`,
    fontSize: (from, to) => `\u628A\u5B57\u4F53\u5C3A\u5BF8\u4ECE ${from} \u500D\u6539\u6210 ${to} \u500D`,
    theme: { dark: "\u6362\u6210\u591C\u95F4\u6A21\u5F0F", light: "\u6362\u6210\u767D\u5929\u6A21\u5F0F" },
    hover: (list) => `\u628A\u60AC\u505C\u6309\u94AE\u6362\u6210${list}`,
    actions: { chat: "\u6253\u5B57", voice: "\u8BED\u97F3\u8F93\u5165", roam: "\u8D70\u52A8", theme: "\u591C\u95F4\u6A21\u5F0F", sound: "\u97F3\u6548", dress: "\u88C5\u626E", hide: "\u9690\u85CF\u684C\u5BA0" },
    user: (to) => `\u6539\u53EB\u4F60\u300C${to}\u300D`
  },
  /** 页面端口都被占用时 World 启动失败的原因 */
  portsTaken: (from, to, why) => `\u7AEF\u53E3 ${from}\u2013${to} \u90FD\u88AB\u5360\u7528\uFF1A${why}`,
  /** 控制台:World 页的状态灯、链接、面板与提示词说明 */
  console: {
    label: "\u684C\u5BA0",
    window: "\u684C\u5BA0\u7A97\u53E3",
    connected: "\u9875\u9762\u5DF2\u8FDE\u63A5",
    notOpen: "\u672A\u6253\u5F00",
    /** The window lamp while the page in the window reported that no figure would draw. */
    noBody: (reason) => `\u9875\u9762\u5DF2\u8FDE\u63A5\uFF0C\u5F62\u8C61\u65E0\u6CD5\u7ED8\u5236\uFF1A${reason}`,
    /** The window lamp's hint when a browser page stands in for the window. */
    alsoBrowser: (hint) => `${hint}\uFF1B\u6D4F\u89C8\u5668\u9875\u9762\u5DF2\u8FDE\u63A5`,
    voice: "\u8BED\u97F3\u8BC6\u522B",
    notStarted: "\u672A\u542F\u52A8",
    viewInBrowser: "\u5728\u6D4F\u89C8\u5668\u4E2D\u67E5\u770B\u684C\u5BA0",
    dress: "\u88C5\u626E",
    panels: {
      pet: { title: "\u684C\u5BA0", description: "\u7A97\u53E3\u3001\u88C5\u626E\u4E0E\u7A97\u53E3\u8FD0\u884C\u65F6\u3002" },
      voice: { title: "\u8BED\u97F3\u8F93\u5165", description: "\u8BC6\u522B\u5F15\u64CE\u3001\u7535\u5E73\u4E0E\u8BC6\u522B\u7ED3\u679C\u3002" }
    },
    envPrompt: { title: "\u684C\u5BA0\u73AF\u5883", description: "\u63CF\u8FF0\u684C\u5BA0\u7684\u8EAB\u4F53\u3001\u56DB\u4E2A\u5DE5\u5177\u4E0E\u8F93\u5165\u4E8B\u4EF6\u3002" },
    vars: {
      "pet.user": "\u5BF9\u4F7F\u7528\u8005\u7684\u79F0\u547C",
      "pet.vocab": "\u5F53\u524D\u5F62\u8C61\u7684\u8868\u60C5\u4E0E\u52A8\u4F5C\u8BCD\u8868",
      "pet.moves": "\u5F53\u524D\u5F62\u8C61\u81EA\u5E26\u7684 pet_move_to \u76EE\u6807\uFF1B\u6CA1\u6709\u65F6\u4E3A\u7A7A",
      "pet.voice": "\u8BED\u97F3\u8F93\u5165\u5F00\u7740\u8FD8\u662F\u5173\u7740",
      "pet.body": "\u5F53\u524D\u5F62\u8C61\u7684\u6837\u5B50",
      "pet.dress": "pet_set \u80FD\u9009\u7684\u5F62\u8C61\u4E0E\u6253\u626E",
      "pet.self": "\u300C\u81EA\u4E3B\u914D\u7F6E\u6743\u9650\u300D\uFF1A\u54EA\u4E9B\u8BBE\u7F6E\u76F4\u63A5\u6539\u3001\u54EA\u4E9B\u5148\u5F81\u5F97\u540C\u610F\uFF0C\u6216\u90FD\u4E0D\u80FD\u6539",
      "pet.chat": "\u5E94\u7528\u63D0\u4F9B\u5BF9\u8BDD\u9875\u65F6\uFF0C\u5BF9\u5B83\u7684\u8BF4\u660E\uFF1B\u6CA1\u6709\u65F6\u4E3A\u7A7A",
      "pet.reply": "\u5E94\u7528\u8BED\u8A00\u65E2\u4E0D\u662F\u7B80\u4F53\u4E2D\u6587\u4E5F\u4E0D\u662F\u82F1\u6587\u65F6\uFF0C\u8BA9 bot \u7528\u90A3\u79CD\u8BED\u8A00\u8BF4\u8BDD\u7684\u4E00\u53E5\uFF1B\u5426\u5219\u4E3A\u7A7A",
      "pet.cua": "\u7535\u8111\u64CD\u4F5C\u4E00\u8282\uFF1A\u622A\u56FE\u5750\u6807\u3001\u4F55\u65F6\u5148\u8BE2\u95EE\u4F7F\u7528\u8005\u3001\u8BA9\u4F4D\u89C4\u5219\uFF1B\u7535\u8111\u64CD\u4F5C\u5173\u95ED\u65F6\u4E3A\u7A7A"
    },
    noGuide: "\u8FD9\u4E2A\u5E94\u7528\u6CA1\u6709\u5F15\u5BFC",
    unknownMethod: (name) => `\u672A\u77E5\u65B9\u6CD5 ${name}`
  },
  /** 控制台的配置项(高级模式的 World 页与设置页) */
  config: {
    group: "\u684C\u5BA0",
    soundGroup: "\u97F3\u6548",
    asrGroup: "\u8BED\u97F3\u8F93\u5165",
    user: { title: "\u79F0\u547C", description: (max2) => `\u8BED\u97F3\u3001\u6253\u5B57\u548C\u4E92\u52A8\u4E8B\u4EF6\u91CC\u7528\u8FD9\u4E2A\u540D\u5B57\u6307\u4EE3\u4F60\uFF0C\u6700\u591A ${max2} \u4E2A\u5B57\u3002\u7559\u7A7A\u65F6\u7528\u9ED8\u8BA4\u79F0\u547C\u3002` },
    roam: { title: "\u8D70\u52A8", description: "free \u5E38\u8D70\u52A8\uFF1Bcalm \u591A\u5F85\u7740\uFF1Boff \u53EA\u505A\u88AB\u8981\u6C42\u7684\u52A8\u4F5C\u3002" },
    theme: { title: "\u591C\u95F4\u6A21\u5F0F", description: "dark \u591C\u95F4\uFF1A\u6D45\u8272\u8EAB\u4F53\u3001\u6DF1\u8272\u6C14\u6CE1\uFF1Blight \u767D\u5929\uFF1A\u6DF1\u8272\u8EAB\u4F53\u3001\u6D45\u8272\u6C14\u6CE1\u3002" },
    rememberPosition: { title: "\u8BB0\u4F4F\u4F4D\u7F6E", description: "\u9000\u51FA\u65F6\u8BB0\u4E0B\u684C\u5BA0\u7684\u6A2A\u5411\u4F4D\u7F6E\uFF0C\u4E0B\u6B21\u542F\u52A8\u843D\u56DE\u90A3\u91CC\uFF1B\u6709\u591A\u5757\u5C4F\u5E55\u65F6\u603B\u5728\u4E3B\u5C4F\u4E0A\u542F\u52A8\u3002" },
    hoverButtons: { title: "\u60AC\u505C\u6309\u94AE", description: (max2, ids) => `\u9F20\u6807\u505C\u5728\u684C\u5BA0\u8EAB\u4E0A\u65F6\u65C1\u8FB9\u51FA\u73B0\u7684\u6309\u94AE\uFF0C\u6700\u591A ${max2} \u4E2A\uFF0C\u9017\u53F7\u5206\u9694\uFF1A${ids}\u3002` },
    doubleClickChat: { title: "\u53CC\u51FB\u6253\u5F00\u6253\u5B57\u6846", description: "\u53CC\u51FB\u684C\u5BA0\u6253\u5F00\u6253\u5B57\u6846\u3002" },
    statusBubble: { title: "\u72B6\u6001\u6C14\u6CE1", description: "\u60F3\u4E8B\u60C5\u3001\u7FFB\u8BB0\u5FC6\u3001\u64CD\u4F5C\u7535\u8111\u65F6\u663E\u793A\u5728\u505A\u4EC0\u4E48\uFF0C\u4F1A\u663E\u793A\u6587\u4EF6\u540D\u3002" },
    saidBubbles: { title: "\u8F93\u5165\u6C14\u6CE1", description: "\u6253\u5B57\u3001\u8BED\u97F3\u548C\u5BF9\u8BDD\u9875\u53D1\u51FA\u7684\u6D88\u606F\u663E\u793A\u5728\u684C\u5BA0\u5934\u9876\uFF0C\u56DE\u590D\u540E\u6DE1\u51FA\u3002\u5173\u95ED\u65F6\u8BED\u97F3\u53EA\u5728\u8BC6\u522B\u4E2D\u663E\u793A\u3002" },
    selfAdjust: { title: "\u81EA\u4E3B\u914D\u7F6E\u6743\u9650", description: "off \u7981\u6B62\uFF1A\u4E0D\u80FD\u81EA\u884C\u6539\u8BBE\u7F6E\uFF0C\u4E5F\u4E0D\u80FD\u4E34\u65F6\u5B89\u9759\uFF1Bdefault \u9ED8\u8BA4\uFF1A\u5F62\u8C61\u3001\u914D\u8272\u3001\u8D70\u52A8\u548C\u6253\u547C\u76F4\u63A5\u6539\uFF0C\u5927\u5C0F\u3001\u6C14\u6CE1\u5C3A\u5BF8\u3001\u5B57\u4F53\u5C3A\u5BF8\u3001\u97F3\u6548\u3001\u591C\u95F4\u6A21\u5F0F\u3001\u60AC\u505C\u6309\u94AE\u548C\u79F0\u547C\u5148\u5F81\u5F97\u4F60\u540C\u610F\uFF1Bany \u4EFB\u610F\uFF1A\u90FD\u76F4\u63A5\u6539\uFF1Bcustom \u81EA\u5B9A\u4E49\uFF1A\u6309\u300C\u4E60\u60EF\u300D\u9875\u91CC\u7684\u52FE\u9009\uFF0C\u52FE\u4E0A\u7684\u76F4\u63A5\u6539\uFF0C\u5176\u4F59\u5148\u5F81\u5F97\u4F60\u540C\u610F\u3002" },
    windowEnabled: { title: "\u542F\u52A8\u65F6\u6253\u5F00\u684C\u5BA0\u7A97\u53E3" },
    scale: { title: "\u5927\u5C0F" },
    bubbleSize: { title: "\u6C14\u6CE1\u5C3A\u5BF8", description: "\u684C\u5BA0\u548C\u4F60\u7684\u6C14\u6CE1\u7684\u5BBD\u5EA6\u3001\u7559\u767D\u3001\u5706\u89D2\u548C\u5C3E\u5DF4\uFF0C1 \u4E3A\u9ED8\u8BA4\uFF1B\u5B57\u53F7\u4E0D\u53D8\u3002" },
    fontSize: { title: "\u5B57\u4F53\u5C3A\u5BF8", description: "\u6C14\u6CE1\u91CC\u6587\u5B57\u7684\u5927\u5C0F\uFF0C1 \u4E3A\u9ED8\u8BA4\uFF1B\u6C14\u6CE1\u5BBD\u5EA6\u4E0D\u53D8\u3002" },
    bubbleSpeed: { title: "\u6C14\u6CE1\u901F\u5EA6", description: "\u684C\u5BA0\u7684\u6C14\u6CE1\u9010\u5B57\u51FA\u73B0\u548C\u505C\u7559\u7684\u901F\u5EA6\uFF0C1 \u4E3A\u9ED8\u8BA4\uFF0C\u8D8A\u5927\u8D8A\u5FEB\u3002" },
    glow: { title: "\u5916\u53D1\u5149", description: "\u684C\u5BA0\u548C\u8EAB\u540E\u7684\u989C\u8272\u76F8\u8FD1\u65F6\uFF0C\u8EAB\u4F53\u5468\u56F4\u51FA\u73B0\u7684\u6D45\u8272\u5916\u53D1\u5149\u5411\u5916\u5EF6\u4F38\u591A\u5C11\u50CF\u7D20\uFF1B0 \u4E3A\u5173\u95ED\u3002" },
    frameRate: { title: "\u5E27\u7387", description: "\u8D70\u52A8\u3001\u88AB\u62CE\u7740\u3001\u8DF3\u8D77\u65F6\u6BCF\u79D2\u753B\u591A\u5C11\u5E27\uFF1B0 \u8DDF\u968F\u663E\u793A\u5668\u5237\u65B0\u7387\u3002\u8D85\u8FC7\u663E\u793A\u5668\u5237\u65B0\u7387\u65F6\u6309\u663E\u793A\u5668\u7684\u3002\u300C\u4E60\u60EF\u300D\u9875\u53EF\u9009 60\u3001120\u3001144 \u548C\u4E0D\u9650\u3002" },
    lockFrameRate: { title: "\u5E27\u7387\u9501\u5B9A", description: "\u9759\u6B62\u65F6\u4E5F\u6309\u300C\u5E27\u7387\u300D\u753B\u684C\u5BA0\u3002\u5173\u7740\u65F6\u7AD9\u7740\u3001\u5750\u7740\u3001\u7761\u7740\u964D\u5230\u6BCF\u79D2 30 \u5E27\u3002" },
    hideWhenFullscreen: { title: "\u5168\u5C4F\u65F6\u81EA\u52A8\u9690\u85CF", description: "\u5F00\u7740\u65F6\uFF0C\u524D\u53F0\u7A97\u53E3\u5168\u5C4F\u94FA\u6EE1\u684C\u5BA0\u6240\u5728\u7684\u90A3\u5757\u5C4F\uFF08\u6E38\u620F\u3001\u5168\u5C4F\u89C6\u9891\u3001\u6D4F\u89C8\u5668\u5168\u5C4F\uFF09\u5C31\u628A Coo \u85CF\u8D77\u6765\uFF0C\u9000\u51FA\u5168\u5C4F\u653E\u56DE\u6765\uFF1B\u6700\u5927\u5316\u7684\u7A97\u53E3\u4E0D\u7B97\u3002\u5173\u7740\u65F6\u4E00\u76F4\u6D6E\u5728\u4E0A\u9762\u3002" },
    exportOverlay: { title: "OBS \u753B\u9762", description: "\u5728 /overlay \u63D0\u4F9B\u684C\u5BA0\u7A97\u53E3\u7684\u900F\u660E\u753B\u9762\uFF0C\u4F9B OBS\u300C\u6D4F\u89C8\u5668\u300D\u6765\u6E90\u4F7F\u7528\uFF1B\u5173\u95ED\u65F6\u4E0D\u63D0\u4F9B\u3002" },
    electronFile: { title: "Electron \u7A0B\u5E8F", description: "\u7559\u7A7A\u65F6\u4F9D\u6B21\u7528 CORTICO_DESKTOP_PET_HOST \u548C\u9762\u677F\u91CC\u5B89\u88C5\u7684\u8FD0\u884C\u65F6\u3002" },
    port: { title: "\u9875\u9762\u7AEF\u53E3", description: "\u88AB\u5360\u7528\u65F6\u5411\u4E0A\u987A\u5EF6\u3002" },
    touchEnabled: { title: "\u4E92\u52A8\u53D1\u6210\u4E8B\u4EF6", description: "\u6233\u3001\u6478\u3001\u62CE\u8D77\u6765\u7529\u51FA\u53BB\u3002" },
    touchWakeOn: { title: "\u56DE\u5E94\u6A21\u5F0F", description: "poke\uFF1A\u53EA\u6709\u6233\u4E00\u4E0B\u9A6C\u4E0A\u56DE\u5E94\uFF0C\u5176\u4F59\u4E92\u52A8\u7B49\u4E0B\u6B21\u56DE\u5E94\u65F6\u4E00\u5E76\u9001\u8FBE\uFF1Ball\uFF1A\u6240\u6709\u4E92\u52A8\u90FD\u9A6C\u4E0A\u56DE\u5E94\uFF1Bnone\uFF1A\u6240\u6709\u4E92\u52A8\u90FD\u7B49\u4E0B\u6B21\u56DE\u5E94\u65F6\u4E00\u5E76\u9001\u8FBE\uFF1Bcustom\uFF1A\u6309\u300C\u4E60\u60EF\u300D\u9875\u52FE\u9009\u7684\u4E92\u52A8\u9A6C\u4E0A\u56DE\u5E94\u3002\u4E00\u6B21\u4E92\u52A8\u5F97\u5230\u56DE\u5E94\u4E4B\u540E\u3001\u672C\u8F6E\u7ED3\u675F\u4E4B\u524D\u7684\u4E92\u52A8\uFF0C\u90FD\u7B49\u4E0B\u6B21\u56DE\u5E94\u65F6\u4E00\u5E76\u9001\u8FBE\u3002" },
    sound: { title: "\u97F3\u6548\u603B\u5F00\u5173", description: "\u684C\u5BA0\u83DC\u5355\u91CC\u7684\u97F3\u6548\u6309\u94AE\u5207\u7684\u5C31\u662F\u8FD9\u4E2A\u3002" },
    sounds: {
      move: { title: "\u52A8\u4F5C", description: "\u8D70\u8DEF\u3001\u8DD1\u3001\u8DF3\u3001\u843D\u5730\u3001\u88AB\u7529\u51FA\u53BB\u3001\u70B9\u5934\u3001\u6447\u5934\u3001\u8F6C\u5708\u3001\u6655\u3001\u53D1\u6296\u3001\u8DF3\u821E\u3001\u5F20\u671B\u3002" },
      touch: { title: "\u4E92\u52A8", description: "\u88AB\u62CE\u8D77\u6765\u3001\u62CE\u7740\u6643\u3001\u88AB\u6478\u3001\u88AB\u6233\u3002" },
      face: { title: "\u8868\u60C5", description: "\u5F00\u5FC3\u3001\u7728\u773C\u3001\u559C\u6B22\u3001\u60CA\u8BB6\u3001\u751F\u6C14\u3001\u96BE\u8FC7\u3001\u5BB3\u7F9E\u3001\u6253\u54C8\u6B20\u3002" },
      snore: { title: "\u6253\u547C\u565C", description: "" },
      talk: { title: "\u8BF4\u8BDD", description: "\u6C14\u6CE1\u91CC\u9010\u5B57\u5192\u51FA\u7684\u53FD\u5495\u58F0\u3001\u9009\u9879\u5361\u7247\u5F39\u51FA\u7684\u58F0\u97F3\u3002" },
      ui: { title: "\u6309\u94AE\u4E0E\u63D0\u793A", description: "\u70B9\u6309\u94AE\u3001\u6C14\u6CE1\u5F39\u51FA\u3001\u9009\u4E2D\u3001\u5F00\u59CB\u548C\u7ED3\u675F\u542C\u4F60\u8BF4\u8BDD\u3002" }
    },
    snoreSeconds: { title: "\u547C\u565C\u65F6\u957F", suffix: "\u79D2", description: "\u6BCF\u6B21\u7761\u7740\u540E\u6253\u8FD9\u4E48\u4E45\u547C\u565C\u5C31\u5B89\u9759\u4E0B\u6765\uFF0CZ \u7167\u6837\u98D8\uFF1B0 = \u4E00\u76F4\u6253\u5230\u9192\u3002" },
    speech: { title: "\u8BF4\u8BDD\u58F0", description: "\u5F00\u542F\u540E\u6C14\u6CE1\u9010\u5B57\u5192\u51FA\u65F6\u5FF5\u51FA\u97F3\u8282\uFF0C\u4EE3\u66FF\u300C\u8BF4\u8BDD\u300D\u7C7B\u7684\u53FD\u5495\u58F0\uFF1B\u300C\u8BF4\u8BDD\u300D\u7C7B\u5173\u6389\u65F6\u4E5F\u4E0D\u51FA\u58F0\u3002" },
    speechPitch: { title: "\u8BF4\u8BDD\u58F0\u97F3\u9AD8", description: (a, b, c) => `low\u3001mid\u3001high \u4F9D\u6B21\u4E3A ${a}\u3001${b}\u3001${c} Hz\uFF1Bcustom \u7528\u81EA\u5B9A\u4E49\u97F3\u9AD8\u3002` },
    speechPitchHz: { title: "\u81EA\u5B9A\u4E49\u97F3\u9AD8" },
    speechSpeed: { title: "\u8BF4\u8BDD\u58F0\u8BED\u901F", description: (a, b, c) => `\u6BCF\u79D2\u6700\u591A\u5FF5\u51E0\u4E2A\u97F3\u8282\uFF1Alow\u3001mid\u3001high \u4F9D\u6B21\u4E3A ${a}\u3001${b}\u3001${c}\uFF1Bcustom \u7528\u81EA\u5B9A\u4E49\u8BED\u901F\u3002\u6BD4\u6587\u5B57\u6162\u65F6\uFF0C\u58F0\u97F3\u5728\u6587\u5B57\u6253\u5B8C\u540E\u624D\u5FF5\u5B8C\u3002` },
    speechRate: { title: "\u81EA\u5B9A\u4E49\u8BED\u901F", suffix: "\u97F3\u8282/\u79D2" },
    asrEnabled: { title: "\u8BED\u97F3\u8F93\u5165\u603B\u5F00\u5173" },
    asrEngine: { title: "\u8BC6\u522B\u5F15\u64CE", description: "funasr \u7528 FunASR \u7684 SenseVoiceSmall\uFF0C\u652F\u6301\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\u3001\u97E9\u6587\u548C\u7CA4\u8BED\uFF0C\u9996\u6B21\u8981\u4E0B\u8F7D\u7EA6 240 MB \u7684\u6A21\u578B\uFF1Bwhisper \u7528 OpenAI \u7684 Whisper small\uFF0C\u652F\u6301\u6CD5\u8BED\u3001\u5FB7\u8BED\u3001\u897F\u73ED\u7259\u8BED\u3001\u8461\u8404\u7259\u8BED\u3001\u610F\u5927\u5229\u8BED\u3001\u4FC4\u8BED\u7B49\u8FD1\u767E\u79CD\u8BED\u8A00\uFF0C\u9996\u6B21\u8981\u4E0B\u8F7D\u7EA6 360 MB \u7684\u6A21\u578B\uFF0C\u4E00\u53E5\u8BF4\u5B8C\u624D\u51FA\u5B57\uFF1B\u8FD9\u4E24\u4E2A\u90FD\u5728\u672C\u673A\u8BC6\u522B\u3002system \u7528 Windows \u81EA\u5E26\u7684\u8BED\u97F3\u8BC6\u522B\uFF0C\u4E0D\u7528\u4E0B\u8F7D\uFF0C\u51C6\u786E\u5EA6\u4F4E\u4E00\u4E9B\uFF08\u53EA\u5728 Windows \u4E0A\u6709\uFF09\u3002api \u628A\u6BCF\u53E5\u5F55\u97F3\u53D1\u9001\u7ED9 OpenAI \u517C\u5BB9\u7684\u8F6C\u5199\u63A5\u53E3\u8BC6\u522B\uFF0C\u4E00\u53E5\u8BF4\u5B8C\u624D\u51FA\u5B57\uFF1B\u5730\u5740\u548C\u6A21\u578B\u5728\u4E0B\u9762\u586B\u5199\uFF0CAPI Key \u5728\u300C\u8BED\u97F3\u8F93\u5165\u300D\u9875\u586B\u5199\u3002\u7559\u7A7A\u65F6\u6309\u5E94\u7528\u8BED\u8A00\u9009\uFF1A\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\u3001\u97E9\u6587\u7528 funasr\uFF0C\u5176\u4F59\u7528 whisper\u3002" },
    asrLanguage: { title: "\u8BED\u8A00", description: "ISO 639-1 \u8BED\u8A00\u4EE3\u7801\uFF0C\u6216 auto \u8BA9\u6A21\u578B\u81EA\u5DF1\u5224\u65AD\uFF1B\u7559\u7A7A\u65F6\u8DDF\u968F\u5E94\u7528\u8BED\u8A00\u3002FunASR \u8BA4 zh\u3001en\u3001ja\u3001ko\u3001yue\uFF0CWhisper \u8BA4 fr\u3001de\u3001es\u3001pt\u3001it\u3001ru \u7B49\u8FD1\u767E\u79CD\uFF0C\u4E0D\u8BA4\u7684\u4EE3\u7801\u6309 auto\u3002\u8F6C\u5199\u63A5\u53E3\u53EA\u5728\u4EE3\u7801\u662F\u4E24\u4E2A\u5B57\u6BCD\u65F6\u5E26\u4E0A\u8BED\u8A00\u3002" },
    asrApiUrl: { title: "\u8F6C\u5199\u63A5\u53E3\u5730\u5740", description: "\u5F15\u64CE\u4E3A api \u65F6\uFF0C\u6BCF\u53E5\u5F55\u97F3\u53D1\u9001\u5230\u8FD9\u4E2A\u5730\u5740\u540E\u9762\u7684 /audio/transcriptions\uFF0C\u4F8B\u5982 https://api.example.com/v1\u3002\u8FDC\u7A0B\u5730\u5740\u53EA\u80FD\u7528 https\uFF0C\u672C\u673A\u548C\u5C40\u57DF\u7F51\u7684\u5730\u5740\u53EF\u4EE5\u7528 http\u3002" },
    asrApiModel: { title: "\u8F6C\u5199\u6A21\u578B", description: "\u5F15\u64CE\u4E3A api \u65F6\u8BF7\u6C42\u91CC\u7684\u6A21\u578B\u540D\u3002" },
    asrThreads: { title: "CPU \u7EBF\u7A0B", description: "FunASR \u548C Whisper \u4E00\u6B21\u8BC6\u522B\u7528\u51E0\u4E2A\u7EBF\u7A0B\uFF0C0 = 2\u3002" },
    asrSimplified: { title: "\u8F6C\u6210\u7B80\u4F53", description: "\u5E94\u7528\u8BED\u8A00\u662F\u7B80\u4F53\u4E2D\u6587\u65F6\u628A\u8BC6\u522B\u51FA\u7684\u7E41\u4F53\u5B57\u8F6C\u6210\u7B80\u4F53\u3002" },
    thresholdDb: { title: "\u8BF4\u8BDD\u95E8\u69DB" },
    silenceMs: { title: "\u4E00\u53E5\u7ED3\u675F\u7684\u9759\u97F3" },
    maxUtteranceMs: { title: "\u4E00\u53E5\u6700\u957F" }
  },
  /** 控制台的「桌宠」「语音输入」面板 */
  panel: {
    pet: "\u684C\u5BA0",
    window: "\u684C\u5BA0\u7A97\u53E3",
    openWindow: "\u6253\u5F00\u7A97\u53E3",
    closeWindow: "\u5173\u95ED\u7A97\u53E3",
    runtime: "\u7A97\u53E3\u8FD0\u884C\u65F6",
    install: "\u5B89\u88C5",
    viewInBrowser: "\u5728\u6D4F\u89C8\u5668\u4E2D\u67E5\u770B",
    dress: "\u88C5\u626E",
    dressHint: "\u6539\u52A8\u4F1A\u7ACB\u523B\u4FDD\u5B58\uFF0C\u5E76\u540C\u6B65\u5230\u684C\u5BA0\u7A97\u53E3",
    connected: "\u5DF2\u8FDE\u63A5",
    starting: "\u542F\u52A8\u4E2D",
    cannotOpen: "\u65E0\u6CD5\u6253\u5F00",
    notOpen: "\u672A\u6253\u5F00",
    external: "\u4F7F\u7528\u5916\u90E8\u7A0B\u5E8F",
    installed: "\u5DF2\u5B89\u88C5",
    downloading: (progress) => `\u4E0B\u8F7D\u4E2D ${progress}`,
    installFailed: "\u5B89\u88C5\u5931\u8D25",
    notInstalled: "\u672A\u5B89\u88C5",
    noBuild: "\u672C\u5E73\u53F0\u6CA1\u6709\u9884\u7F16\u8BD1\u5305",
    electronSize: "Electron 44.4.4\uFF0C\u7EA6 150 MB",
    voice: "\u8BED\u97F3\u8F93\u5165",
    enable: "\u5F00\u542F\u8BED\u97F3\u8F93\u5165",
    enabledHint: "\u9EA6\u514B\u98CE\u4FDD\u6301\u5F00\u542F\uFF0C\u6309\u6536\u97F3\u65B9\u5F0F\u53D1\u9001\u7ED9 Coo",
    enabledHintOnPress: "\u6309\u4F4F\u8BF4\u8BDD\u952E\u65F6\u6253\u5F00\u9EA6\u514B\u98CE\uFF0C\u677E\u5F00\u540E\u5173\u95ED",
    disabledHint: "\u5DF2\u5173\u95ED\uFF1A\u4E0D\u6253\u5F00\u9EA6\u514B\u98CE\uFF0C\u4E0B\u9762\u7684\u8BBE\u7F6E\u6682\u4E0D\u751F\u6548",
    engine: "\u8BC6\u522B\u5F15\u64CE",
    funasr: "FunASR\uFF08\u672C\u673A\u8BC6\u522B\uFF09",
    system: "Windows \u81EA\u5E26",
    whisper: "Whisper\uFF08\u672C\u673A\u8BC6\u522B\uFF09",
    systemHint: "\u4E0D\u7528\u4E0B\u8F7D\uFF0C\u51C6\u786E\u5EA6\u4E00\u822C\uFF1B\u60F3\u8981\u66F4\u51C6\u6362\u6210 FunASR \u6216 Whisper",
    funasrHint: "SenseVoiceSmall\uFF0C\u5728\u672C\u673A\u8BC6\u522B\uFF0C\u652F\u6301\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\u3001\u97E9\u6587\u548C\u7CA4\u8BED",
    whisperHint: "Whisper small\uFF0C\u5728\u672C\u673A\u8BC6\u522B\uFF0C\u652F\u6301\u6CD5\u8BED\u3001\u5FB7\u8BED\u3001\u897F\u73ED\u7259\u8BED\u3001\u8461\u8404\u7259\u8BED\u3001\u610F\u5927\u5229\u8BED\u3001\u4FC4\u8BED\u7B49\uFF1B\u4E00\u53E5\u8BF4\u5B8C\u624D\u51FA\u5B57",
    api: "\u8F6C\u5199\u63A5\u53E3\uFF08OpenAI \u517C\u5BB9\uFF09",
    apiName: "\u8F6C\u5199\u63A5\u53E3",
    apiHint: "\u6BCF\u53E5\u5F55\u97F3\u53D1\u9001\u7ED9\u4E0B\u9762\u586B\u5199\u7684\u63A5\u53E3\u8BC6\u522B\uFF0C\u4E00\u53E5\u8BF4\u5B8C\u624D\u51FA\u5B57",
    apiUrl: "\u63A5\u53E3\u5730\u5740",
    apiModel: "\u6A21\u578B",
    apiKey: "API Key",
    keySaved: "\u5DF2\u4FDD\u5B58",
    keyMissing: "\u672A\u586B\u5199",
    server: "\u8BC6\u522B\u670D\u52A1",
    start: "\u542F\u52A8",
    stop: "\u505C\u6B62",
    ready: "\u5C31\u7EEA",
    error: "\u51FA\u9519",
    stopped: "\u5DF2\u505C\u6B62",
    model: "\u8BC6\u522B\u6A21\u578B",
    download: "\u4E0B\u8F7D",
    retry: "\u91CD\u8BD5",
    downloadFailed: "\u4E0B\u8F7D\u5931\u8D25",
    downloaded: "\u5DF2\u4E0B\u8F7D",
    notDownloaded: "\u672A\u4E0B\u8F7D",
    modelSource: (size) => `\u7EA6 ${size}\uFF0C\u4ECE ModelScope \u4E0B\u8F7D\uFF0C\u56FD\u5185\u53EF\u7528`,
    mic: "\u9EA6\u514B\u98CE",
    micStates: { on: "\u6536\u97F3\u4E2D", off: "\u672A\u6536\u97F3", denied: "\u88AB\u62D2\u7EDD", error: "\u51FA\u9519" },
    defaultDevice: "\u7CFB\u7EDF\u9ED8\u8BA4",
    missingDevice: "\u4E4B\u524D\u9009\u7684\u8BBE\u5907\uFF08\u73B0\u5728\u627E\u4E0D\u5230\uFF09",
    micN: (n) => `\u9EA6\u514B\u98CE ${n}`,
    mode: "\u6536\u97F3\u65B9\u5F0F",
    modes: { hold: "\u6309\u4F4F\u8BF4\u8BDD\u952E\u65F6\u6536\u97F3", toggle: "\u7528\u8BF4\u8BDD\u952E\u5207\u6362\u6536\u97F3", always: "\u6301\u7EED\u6536\u97F3" },
    openOnPress: "\u6309\u4F4F\u65F6\u624D\u6253\u5F00\u9EA6\u514B\u98CE",
    openOnPressHint: "\u7528\u84DD\u7259\u8033\u673A\u7B49\u4E00\u6253\u5F00\u9EA6\u514B\u98CE\u5C31\u5207\u5230\u901A\u8BDD\u6A21\u5F0F\u7684\u8033\u673A\u65F6\u5F00\u542F\uFF1B\u6309\u4E0B\u540E\u7A0D\u7B49\u518D\u8BF4\u8BDD\uFF0C\u5426\u5219\u5F00\u5934\u7684\u5B57\u53EF\u80FD\u542C\u4E0D\u5230",
    switchOn: "\u5DF2\u5F00\u542F",
    switchOff: "\u5DF2\u5173\u95ED",
    /** 说话键怎么按:按住说话、开关收音两种模式下的说法,按连按次数 */
    presses: {
      2: { hold: "\u53CC\u51FB\u518D\u6309\u4F4F", toggle: "\u53CC\u51FB\u5F00\u59CB\uFF0C\u518D\u53CC\u51FB\u505C\u6B62" },
      1: { hold: "\u76F4\u63A5\u6309\u4F4F", toggle: "\u6309\u4E00\u4E0B\u5F00\u59CB\uFF0C\u518D\u6309\u4E00\u4E0B\u505C\u6B62" },
      3: { hold: "\u4E09\u51FB\u518D\u6309\u4F4F", toggle: "\u4E09\u51FB\u5F00\u59CB\uFF0C\u518D\u4E09\u51FB\u505C\u6B62" }
    },
    capture: "\u6309\u4E0B\u65B0\u7684\u8BF4\u8BDD\u952E\uFF0C\u53EF\u4EE5\u662F\u7EC4\u5408\u952E\u6216\u9F20\u6807\u4FA7\u952E\u2026\uFF08Esc \u53D6\u6D88\uFF09",
    listening: "\u6B63\u5728\u503E\u542C",
    waitingKey: "\u7B49\u5F85\u8BF4\u8BDD\u952E",
    results: "\u8BC6\u522B\u7ED3\u679C",
    resultsHint: "\u5212\u7EBF\u7684\u6761\u76EE\u8FC7\u77ED\u6216\u7591\u4F3C\u5E7B\u89C9\uFF0C\u672A\u53D1\u9001",
    /** 语音输入页:说话键单独一行、识别结果为空时的那一行、音量条左边的字、音量条上门槛线的说明 */
    talkKeyName: "\u8BF4\u8BDD\u952E",
    changeKey: "\u66F4\u6539",
    cancelKey: "\u53D6\u6D88",
    level: "\u8F93\u5165\u97F3\u91CF",
    thresholdHint: "\u6BD4\u8FD9\u6761\u7EBF\u54CD\u7684\u58F0\u97F3\u624D\u7B97\u8BF4\u8BDD\uFF1B\u522B\u4EBA\u8BF4\u8BDD\u548C\u4F60\u4E00\u6837\u54CD\u65F6\u4E5F\u4F1A\u88AB\u8BC6\u522B",
    noResults: "\u6682\u65E0\u8BC6\u522B\u7ED3\u679C"
  },
  /** 对话页发消息被退回的原因与提示 */
  chat: {
    badImages: "\u56FE\u7247\u683C\u5F0F\u4E0D\u5BF9",
    tooManyImages: (max2) => `\u4E00\u6B21\u6700\u591A ${max2} \u5F20\u56FE`,
    badMime: (mime) => `\u4E0D\u652F\u6301\u7684\u56FE\u7247\u683C\u5F0F ${mime}`,
    emptyImage: "\u6709\u4E00\u5F20\u56FE\u662F\u7A7A\u7684",
    bigImage: (mb) => `\u5355\u5F20\u56FE\u4E0D\u80FD\u8D85\u8FC7 ${mb} MB`,
    offline: "\u5C1A\u672A\u8FDE\u63A5",
    notSent: "\u53D1\u9001\u5931\u8D25",
    tooLate: "\u8BE5\u6D88\u606F\u5DF2\u9001\u8FBE\uFF0C\u65E0\u6CD5\u64A4\u56DE\u3002"
  }
};

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/en.ts
var en = {
  /** What events and bubbles call the person while no name is set. */
  defaultUser: "Pal",
  /** The pet's menu and bubbles. */
  menu: {
    /** The power button's name when the app gives none. */
    quit: "Quit",
    /** The question in the menu header after the power button is clicked. */
    quitPrompt: (label) => `${label}?`
  },
  /** Status bubble: a tool call without its own description. */
  busy: "Working",
  /** Voice input: the microphone button's state in the menu, and the notes in the introduction and on the settings page. */
  voice: {
    starting: "Speech recognition is starting",
    notRunning: "Speech recognition is not running",
    modelMissing: (mb) => `The speech model is not downloaded yet (about ${mb} MB): download it on the Voice input page`,
    badKey: (hotkey) => `Unknown key "${hotkey}"`,
    keyProblem: (problem) => `The talk key is unavailable, so speech is not recognized for now: ${problem}`,
    always: "Always listening: just talk",
    /** The talk key switches listening on and off; `label` is the full key name with its presses ("Double-press Left Alt"). */
    toggleTaps: (label, taps) => `${label} to start listening, ${taps === 2 ? "double" : "triple"}-press again to stop`,
    toggle: (key) => `Press ${key} to start listening, press it again to stop`,
    holdTaps: (key, taps) => `Tap ${key} ${taps === 2 ? "once" : "twice"}, then hold it and talk; let go to send`,
    hold: (key) => `Hold ${key} and talk; let go to send`,
    /** A line in the Voice input page's results for a sentence that was not recognized. */
    failedLine: (error) => `[failed] ${error}`
  },
  /** Names of the talk keys, by their Windows key names; the Mac set goes over them. */
  keys: {
    LeftCtrl: "Left Ctrl",
    RightCtrl: "Right Ctrl",
    LeftAlt: "Left Alt",
    RightAlt: "Right Alt",
    LeftShift: "Left Shift",
    RightShift: "Right Shift",
    RightWin: "Right Win",
    Backquote: "`",
    Mouse3: "Middle mouse button",
    Mouse4: "Mouse button 4",
    Mouse5: "Mouse button 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "Left Control",
    RightCtrl: "Right Control",
    Alt: "Option",
    LeftAlt: "Left Option",
    RightAlt: "Right Option",
    Win: "Command",
    RightWin: "Right Command"
  },
  /** Repeated presses, put before the key name: "Double-press Left Alt". */
  taps: (taps, keys) => `${taps === 2 ? "Double" : "Triple"}-press ${keys}`,
  /** Why the talk key cannot be read. */
  hotkey: {
    cannotRead: (why) => `Cannot read the keyboard: ${why}`,
    macNoKey: "A Mac keyboard has no such key; pick another talk key",
    macPermission: 'No Input Monitoring permission: turn Coopanion on under System Settings \u2192 Privacy & Security \u2192 Input Monitoring, then restart it. If it is on already, remove Coopanion from the list with "\u2212" and add it back: an updated version does not inherit the old permission',
    linuxNoKey: "Linux cannot read this key (mouse side buttons do not work); pick another talk key",
    linuxNoDisplay: "The talk key needs X11 (or XWayland) on Linux: DISPLAY is not set",
    linuxNoX11: "The talk key cannot connect to the X11 display",
    unsupported: "The talk key works on Windows, macOS and Linux only"
  },
  /** Why the typing key cannot be read; the other two reasons (the keyboard, Input Monitoring) are the ones in `hotkey`. */
  typeKey: {
    macNoKey: "A Mac keyboard has no such key; pick another typing key",
    linuxNoKey: "Linux cannot read this key (mouse side buttons do not work); pick another typing key",
    linuxNoDisplay: "The typing key needs X11 (or XWayland) on Linux: DISPLAY is not set",
    linuxNoX11: "The typing key cannot connect to the X11 display",
    unsupported: "The typing key works on Windows, macOS and Linux only"
  },
  /** Windows' own speech recognizer. */
  system: {
    name: (culture) => culture ? `Windows Speech Recognition (${culture})` : "Windows Speech Recognition",
    noSpeech: "The System.Speech component does not load",
    noRecognizer: (language) => `Windows has no speech recognizer${language === "auto" ? "" : ` for "${language}"`}: add Speech recognition for the language under Windows Settings \u2192 Time & language \u2192 Language`,
    windowsOnly: "Windows Speech Recognition is only on Windows",
    startFailed: (why) => `Failed to start: ${why}`,
    exited: "The speech recognition process exited",
    exitedCode: (code) => `The speech recognition process exited (exit code ${code})`,
    notReady: "Windows Speech Recognition did not become ready in time",
    notRunning: "Windows Speech Recognition is not running",
    timeout: (ms) => `Recognition timed out (${ms} ms)`,
    stopped: "Windows Speech Recognition has stopped"
  },
  /** The speech models sherpa-onnx runs. */
  sherpa: {
    incomplete: "Some speech model files are missing: download it again",
    noRuntime: (platform) => `sherpa-onnx has no runtime for this platform (${platform})`,
    loadFailed: (why) => `The speech model failed to load: ${why}`,
    notLoaded: "The speech model is not loaded"
  },
  /** The OpenAI-compatible transcription service (engine api) */
  transcription: {
    noUrl: "The transcription service address is not set",
    badUrl: (url) => `The address is not an http or https URL: ${url}`,
    httpRemote: "A remote address must use https: http is not encrypted, so the API Key and the recordings would travel in plain text. Addresses on this computer or the local network may use http.",
    noModel: "The transcription model is not set",
    notRunning: "The transcription service is not started",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `The service did not answer within ${ms} ms`,
    network: (why) => `Cannot reach the service: ${why}`,
    noText: "The service answered without text"
  },
  /** Downloading the window runtime and the speech model. */
  store: {
    noBuild: (platform) => `No prebuilt package for ${platform}`,
    downloading: (file) => `Downloading ${file}`,
    unpacking: "Unpacking",
    downloadingModel: "Downloading the speech model",
    downloadingFrom: (file, host) => `Downloading ${file} (${host})`,
    verifying: (file) => `Verifying ${file}`,
    mismatch: (sum) => `Checksum mismatch: ${sum}\u2026`,
    failed: (file, why) => `${file} failed to download (${why})`,
    exitCode: (cmd, code, out) => `${cmd} exit code ${code}: ${out}`
  },
  /** Why a pack's figure.json cannot be read; field names as written there. */
  packs: {
    noManifest: (file) => `No ${file}`,
    badJson: (file, why) => `${file} is not valid JSON: ${why}`,
    notInteger: (key, got) => `${key} must be an integer, not ${got}`,
    tooNew: (key, v, now) => `${key} is ${v}; this version reads up to ${now}: update the app first`,
    tooOld: (key, v, oldest) => `${key} ${v} is a test format from before ${oldest} and cannot be read`,
    badId: (got) => `Invalid id: ${got}`,
    noName: "name is missing",
    noAbout: "about is missing",
    badEntry: "entry or export is invalid",
    badModel: "The model path is invalid",
    badThumb: "The thumb path is invalid",
    badAxis: (got) => `Invalid entry in axes: ${got}`,
    badOption: (axis, got) => `Invalid option in axes.${axis}: ${got}`,
    badPreset: (got) => `Invalid entry in presets: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} picks no option for ${axis}`,
    vocabNotArray: "vocab must be an array",
    badWordId: (got) => `Invalid id in vocab: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind is ${kind}, which this version does not know; the bot does not get this word`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} must be an array`,
    badWordName: (id, got) => `Invalid name in vocab.${id}: ${got}`,
    nameTaken: (name) => `${name} names more than one word in vocab`,
    noWordAbout: (id) => `vocab.${id}.about is missing`,
    badSeconds: (id) => `vocab.${id}.seconds must be a positive number`,
    soundsNotObject: "sounds must be an object",
    badSoundName: (got) => `Invalid name in sounds: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file must be a file in the pack`,
    badVolume: (name) => `sounds.${name}.volume must be 0\u20131`,
    soundType: (name, file) => `${file} of sounds.${name} is not an .ogg, .mp3 or .wav this version plays; the sound stays silent`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind is ${kind}; this version knows ${kinds.join(", ")} only, so the sound stays silent`,
    soundMissing: (name, file) => `${file} of sounds.${name} does not exist; the sound stays silent`,
    badWalk: (got) => `can.walk is ${got}, which this version does not know; taken as able to walk`,
    movesNotArray: "moves must be an array",
    tooManyMoves: (max2) => `moves holds at most ${max2} targets`,
    badMoveId: (got) => `Invalid id in moves: ${got} (left, center, right, cursor and numbers are the default targets)`,
    moveTaken: (id) => `${id} appears more than once in moves`,
    noMoveText: (id) => `moves.${id} has no name or about`,
    badMoveParams: (id, max2) => `moves.${id}.params must be an array of at most ${max2}, each with an id, an about, and numbers min below max`,
    needsNotArray: "needs must be an array",
    unknownNeed: (got) => `${got} in needs is not provided by this version and is left out`,
    idTaken: (id, builtin) => `id ${id} is taken by ${builtin ? "a built-in figure" : "another pack"}`
  },
  /** Importing packs on the dressing page. */
  importing: {
    badZip: (why) => `Not a readable zip: ${why}`,
    tooBig: (mb) => `Over ${mb} MB unpacked`,
    truncated: "The upload is incomplete",
    badPath: (path) => `A path cannot be used: ${path}`,
    builtinId: (id) => `id ${id} belongs to a built-in figure; change the id to import it`,
    duplicateId: (id) => `id ${id} is the same as another pack in this import`,
    unpackFailed: (why) => `Could not unpack: ${why}`,
    expired: "This import has expired; choose the files again",
    noneChosen: "No pack is chosen",
    zipOrFolder: "Only a zip or folders can be imported",
    overLimit: (mb) => `Over ${mb} MB`
  },
  /** Uninstalling packs on the dressing page. */
  removing: {
    notInstalled: (id) => `No figure pack has id ${id}`,
    builtin: (id) => `${id} is a built-in figure and cannot be uninstalled`,
    elsewhere: (id) => `${id} is not in the figure pack installation folder and cannot be uninstalled here`,
    failed: (why) => `Could not delete it: ${why}`
  },
  /** The bubble in which the pet asks the person's consent to a change of settings: the question, its three buttons, and how each change is said */
  consent: {
    question: (items) => `Can I ${items.join(", ")}?`,
    /** OK / Always OK (these items are not asked about again) / No thanks */
    choices: ["OK", "Always OK", "No thanks"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `switch to ${to}`,
    scheme: (figure, look) => `put on a different ${figure} look (${look})`,
    roam: { free: "Often", calm: "Now and then", off: "Stay put" },
    roamTo: (to) => `set my walking to "${to}"`,
    snore: (seconds) => seconds === 0 ? "snore until I wake" : `snore for ${seconds} s each time I sleep`,
    sound: (on) => on ? "turn sounds on" : "turn sounds off",
    scale: (from, to) => `change my size from ${from}\xD7 to ${to}\xD7`,
    bubbleSize: (from, to) => `change the bubble size from ${from}\xD7 to ${to}\xD7`,
    fontSize: (from, to) => `change the text size from ${from}\xD7 to ${to}\xD7`,
    theme: { dark: "switch to the night look", light: "switch to the day look" },
    hover: (list) => `change the hover buttons to ${list}`,
    actions: { chat: "Type", voice: "Voice input", roam: "Walking", theme: "Night mode", sound: "Sounds", dress: "Dress up", hide: "Hide pet" },
    user: (to) => `call you "${to}"`
  },
  /** Why the World fails to start when every page port is taken. */
  portsTaken: (from, to, why) => `Ports ${from}\u2013${to} are all taken: ${why}`,
  /** The console: the World page's lamps, links, panels and prompt notes. */
  console: {
    label: "Desktop pet",
    window: "Pet window",
    connected: "Page connected",
    notOpen: "Not open",
    /** The window lamp while the page in the window reported that no figure would draw. */
    noBody: (reason) => `Page connected, the figure cannot be drawn: ${reason}`,
    /** The window lamp's hint when a browser page stands in for the window. */
    alsoBrowser: (hint) => `${hint}; a browser page is connected`,
    voice: "Speech recognition",
    notStarted: "Not started",
    viewInBrowser: "View the pet in the browser",
    dress: "Dress up",
    panels: {
      pet: { title: "Desktop pet", description: "The window, the dress and the window runtime." },
      voice: { title: "Voice input", description: "Recognition engine, input level and what was heard." }
    },
    envPrompt: { title: "Desktop pet environment", description: "Describes the pet's body, four tools and input events." },
    vars: {
      "pet.user": "What the bot calls the person",
      "pet.vocab": "The current figure's expressions and motions",
      "pet.moves": "The current figure's own pet_move_to targets; empty when it has none",
      "pet.voice": "Whether voice input is on or off",
      "pet.body": "What the current figure looks like",
      "pet.dress": "The figures and dress pet_set can pick",
      "pet.self": "Self-adjustment: which settings change directly, which wait for consent, or that none can change",
      "pet.chat": "A note on the chat page when the app has one; empty otherwise",
      "pet.reply": "A line telling the bot which language to talk in when the app language is neither Simplified Chinese nor English; empty otherwise",
      "pet.cua": "The computer use part: screenshot coordinates, when the person is asked first, and staying out of their way; empty while computer use is off"
    },
    noGuide: "This app has no introduction",
    unknownMethod: (name) => `Unknown method ${name}`
  },
  /** The console's settings (the World page and settings in advanced mode). */
  config: {
    group: "Desktop pet",
    soundGroup: "Sounds",
    asrGroup: "Voice input",
    user: { title: "Your name", description: (max2) => `The name voice, typing and touch events call you by, up to ${max2} characters. Empty uses the default name.` },
    roam: { title: "Walking", description: "free walks about often; calm stays put most of the time; off moves only when asked." },
    theme: { title: "Night mode", description: "dark is night: a light body and dark bubbles; light is day: a dark body and light bubbles." },
    rememberPosition: { title: "Remember position", description: "Saves how far across the screen the pet stands when the app quits, and starts there next time; with several screens Coo always starts on the main one." },
    hoverButtons: { title: "Hover buttons", description: (max2, ids) => `Buttons beside the pet while the pointer rests on Coo, up to ${max2}, separated by commas: ${ids}.` },
    doubleClickChat: { title: "Double-click to type", description: "Double-clicking the pet opens the typing box." },
    statusBubble: { title: "Status bubble", description: "Shows what the pet is doing while Coo thinks, looks through memory or uses the computer, file names included." },
    saidBubbles: { title: "Input bubbles", description: "What the person types, says or sends from the chat page shows above the pet until Coo replies. When off, speech shows only while it is recognized." },
    selfAdjust: { title: "Self-adjustment", description: "off: Coo cannot change settings or keep quiet for a while. default: figure, dress, walking and snoring change directly; size, bubble size, text size, sounds, night mode, hover buttons and what Coo calls you wait for your consent. any: everything changes directly. custom: as ticked on the Habits page; ticked items change directly, the rest wait for your consent." },
    windowEnabled: { title: "Open the pet window at start" },
    scale: { title: "Size" },
    bubbleSize: { title: "Bubble size", description: "Width, padding, corners and tail of the pet's bubbles and yours, 1 being the default; the text keeps its size." },
    fontSize: { title: "Text size", description: "Size of the text in the bubbles, 1 being the default; the bubbles keep their width." },
    bubbleSpeed: { title: "Bubble speed", description: "How fast the pet's bubbles type out and how long they stay, 1 being the default; higher is faster." },
    glow: { title: "Outer glow", description: "How many pixels the light glow around the pet reaches when Coo's colors match the background; 0 turns it off." },
    frameRate: { title: "Frame rate", description: "Frames a second while the pet walks, is carried or jumps; 0 follows the display. Above the display's refresh rate the display's rate applies. The Habits page offers 60, 120, 144 and Unlimited." },
    lockFrameRate: { title: "Lock frame rate", description: "Draws the pet at the frame rate at rest too. When off, it drops to 30 frames a second while standing, sitting or asleep." },
    hideWhenFullscreen: { title: "Hide during full screen", description: "When on, the pet hides while the window in front fills the screen Coo is on (a game, a full-screen video, a browser in full screen) and comes back when full screen ends; a maximized window does not count. When off, Coo always stays on top." },
    exportOverlay: { title: "OBS overlay", description: "Serves the pet window's picture on a transparent background at /overlay for an OBS Browser source; off, nothing is served." },
    electronFile: { title: "Electron executable", description: "Empty uses CORTICO_DESKTOP_PET_HOST, then the runtime installed from the panel." },
    port: { title: "Page port", description: "Moves up to the next free port when taken." },
    touchEnabled: { title: "Touches become events", description: "Pokes, petting, and being picked up and thrown." },
    touchWakeOn: { title: "Response mode", description: "poke: only a poke gets a response right away; other touches wait for the next response. all: every touch gets one. none: every touch waits for the next response. custom: the touches ticked on the Habits page get one. After a touch gets a response, the touches until that turn ends wait for the next one." },
    sound: { title: "All sounds", description: "The sound button in the pet's menu flips this." },
    sounds: {
      move: { title: "Moving", description: "Walking, running, jumping, landing, being thrown, nodding, shaking, spinning, dizziness, shivering, dancing, looking about." },
      touch: { title: "Touch", description: "Being picked up, swung, petted, poked." },
      face: { title: "Faces", description: "Happy, wink, love, surprised, angry, sad, shy, yawning." },
      snore: { title: "Snoring", description: "" },
      talk: { title: "Talking", description: "The babble as bubble text appears, and choice cards popping up." },
      ui: { title: "Buttons and cues", description: "Button clicks, bubbles opening, picks, and listening starting and ending." }
    },
    snoreSeconds: { title: "Snore length", suffix: "s", description: "In each sleep the pet goes quiet after snoring this long; the z's keep floating. 0 = snore until waking." },
    speech: { title: "Speech", description: "Reads out a syllable as each character appears in a bubble, in place of the Talking babble; silent while Talking sounds are off." },
    speechPitch: { title: "Speech pitch", description: (a, b, c) => `low, mid and high are ${a}, ${b} and ${c} Hz; custom uses the custom pitch.` },
    speechPitchHz: { title: "Custom pitch" },
    speechSpeed: { title: "Speech speed", description: (a, b, c) => `Most syllables a second: low, mid and high are ${a}, ${b} and ${c}; custom uses the custom speed. Slower than the text, the voice ends after the text has finished.` },
    speechRate: { title: "Custom speed", suffix: "syllables/s" },
    asrEnabled: { title: "Voice input" },
    asrEngine: { title: "Recognition engine", description: "funasr runs FunASR's SenseVoiceSmall, for Chinese, English, Japanese, Korean and Cantonese, after a one-time download of about 240 MB; whisper runs OpenAI's Whisper small, for French, German, Spanish, Portuguese, Italian, Russian and about 90 more languages, after a one-time download of about 360 MB, and shows the text once a sentence ends; both recognize on this computer. system uses Windows' own speech recognition, with nothing to download and lower accuracy (Windows only). api sends the recording of each sentence to an OpenAI-compatible transcription service and shows the text once the sentence ends; its address and model are set below, its API Key on the Voice input page. Empty picks by the app language: funasr for Chinese, English, Japanese and Korean, whisper for the rest." },
    asrLanguage: { title: "Language", description: "An ISO 639-1 code, or auto to let the model tell; empty follows the app language. FunASR takes zh, en, ja, ko and yue, Whisper about a hundred codes such as fr, de, es, pt, it and ru; a code the model does not take reads as auto. The transcription service is sent the code only when it has two letters." },
    asrApiUrl: { title: "Transcription service address", description: "With engine api, each sentence is sent to /audio/transcriptions under this address, such as https://api.example.com/v1. A remote address must use https; addresses on this computer or the local network may use http." },
    asrApiModel: { title: "Transcription model", description: "The model named in requests with engine api." },
    asrThreads: { title: "CPU threads", description: "Threads FunASR and Whisper use for one recognition; 0 = 2." },
    asrSimplified: { title: "Convert to Simplified", description: "Turns Traditional characters in what was heard into Simplified while the app language is Simplified Chinese." },
    thresholdDb: { title: "Speech threshold" },
    silenceMs: { title: "Silence that ends a sentence" },
    maxUtteranceMs: { title: "Longest sentence" }
  },
  /** The console's Desktop pet and Voice input panels. */
  panel: {
    pet: "Desktop pet",
    window: "Pet window",
    openWindow: "Open window",
    closeWindow: "Close window",
    runtime: "Window runtime",
    install: "Install",
    viewInBrowser: "View in browser",
    dress: "Dress up",
    dressHint: "Changes are saved at once and reach the pet window",
    connected: "Connected",
    starting: "Starting",
    cannotOpen: "Cannot open",
    notOpen: "Not open",
    external: "Using an external program",
    installed: "Installed",
    downloading: (progress) => `Downloading ${progress}`,
    installFailed: "Install failed",
    notInstalled: "Not installed",
    noBuild: "No prebuilt package for this platform",
    electronSize: "Electron 44.4.4, about 150 MB",
    voice: "Voice input",
    enable: "Turn on voice input",
    enabledHint: "The microphone stays open; speech goes to Coo by the listening mode",
    enabledHintOnPress: "The microphone opens while the talk key is held and closes after release",
    disabledHint: "Off: the microphone stays closed, and the settings below wait",
    engine: "Recognition engine",
    funasr: "FunASR (on this computer)",
    system: "Windows built-in",
    whisper: "Whisper (on this computer)",
    systemHint: "Nothing to download, fair accuracy; switch to FunASR or Whisper for better results",
    funasrHint: "SenseVoiceSmall on this computer, for Chinese, English, Japanese, Korean and Cantonese",
    whisperHint: "Whisper small on this computer, for French, German, Spanish, Portuguese, Italian, Russian and more; the text appears once a sentence ends",
    api: "Transcription service (OpenAI-compatible)",
    apiName: "Transcription service",
    apiHint: "Each sentence is sent to the service set below; the text appears once a sentence ends",
    apiUrl: "Address",
    apiModel: "Model",
    apiKey: "API Key",
    keySaved: "Saved",
    keyMissing: "Not set",
    server: "Recognition service",
    start: "Start",
    stop: "Stop",
    ready: "Ready",
    error: "Error",
    stopped: "Stopped",
    model: "Speech model",
    download: "Download",
    retry: "Retry",
    downloadFailed: "Download failed",
    downloaded: "Downloaded",
    notDownloaded: "Not downloaded",
    modelSource: (size) => `About ${size}, downloaded from ModelScope`,
    mic: "Microphone",
    micStates: { on: "Listening", off: "Not listening", denied: "Denied", error: "Error" },
    defaultDevice: "System default",
    missingDevice: "The device picked before (not found now)",
    micN: (n) => `Microphone ${n}`,
    mode: "How it listens",
    modes: { hold: "While the talk key is held", toggle: "The talk key switches it on and off", always: "All the time" },
    openOnPress: "Open the microphone only while held",
    openOnPressHint: "Turn on for headsets, such as Bluetooth ones, that switch to call mode while the microphone is open; after pressing, wait a moment before speaking, or the first words may be missed",
    switchOn: "On",
    switchOff: "Off",
    /** How the talk key is pressed, for holding and for switching, by the number of presses. */
    presses: {
      2: { hold: "Double-press and hold", toggle: "Double-press to start and again to stop" },
      1: { hold: "Just hold", toggle: "Press to start, press again to stop" },
      3: { hold: "Triple-press and hold", toggle: "Triple-press to start and again to stop" }
    },
    capture: "Press the new talk key: a key combination or a mouse side button\u2026 (Esc cancels)",
    listening: "Listening",
    waitingKey: "Waiting for the talk key",
    results: "What was heard",
    resultsHint: "Struck-through lines were too short or likely hallucinated, and were not sent",
    talkKeyName: "Talk key",
    changeKey: "Change",
    cancelKey: "Cancel",
    level: "Input level",
    thresholdHint: "Only sound louder than this line counts as speech; someone else talking as loudly as you is heard too",
    noResults: "Nothing heard yet"
  },
  /** Why the chat page's message was turned back, and its notices. */
  chat: {
    badImages: "The images are not in a form this page sends",
    tooManyImages: (max2) => `At most ${max2} images at a time`,
    badMime: (mime) => `Unsupported image type ${mime}`,
    emptyImage: "One of the images is empty",
    bigImage: (mb) => `Each image must be under ${mb} MB`,
    offline: "Not connected yet",
    notSent: "Could not send it",
    tooLate: "That one has already been delivered and cannot be taken back."
  }
};
var en_default = en;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/zh-Hant.ts
var zhHant = {
  defaultUser: "\u5925\u4F34",
  menu: {
    quit: "\u7D50\u675F",
    quitPrompt: (label) => `${label}\uFF1F`
  },
  busy: "\u5728\u5FD9",
  voice: {
    starting: "\u8FA8\u8B58\u670D\u52D9\u555F\u52D5\u4E2D",
    notRunning: "\u8FA8\u8B58\u670D\u52D9\u6C92\u6709\u57F7\u884C",
    modelMissing: (mb) => `\u8FA8\u8B58\u6A21\u578B\u5C1A\u672A\u4E0B\u8F09\uFF08\u7D04 ${mb} MB\uFF09\uFF0C\u8ACB\u5728\u300C\u8A9E\u97F3\u8F38\u5165\u300D\u9801\u4E0B\u8F09`,
    badKey: (hotkey) => `\u7121\u6CD5\u8FA8\u8B58\u6309\u9375\u300C${hotkey}\u300D`,
    keyProblem: (problem) => `\u8AAA\u8A71\u9375\u7121\u6CD5\u4F7F\u7528\uFF0C\u66AB\u4E0D\u8FA8\u8B58\u8AAA\u8A71\uFF1A${problem}`,
    always: "\u6301\u7E8C\u6536\u97F3\uFF0C\u76F4\u63A5\u8AAA\u8A71\u5373\u53EF",
    toggleTaps: (label, taps) => `${label} \u958B\u59CB\u6536\u97F3\uFF0C\u518D\u6309${taps === 2 ? "\u5169" : "\u4E09"}\u4E0B\u505C\u6B62`,
    toggle: (key) => `\u6309\u4E00\u4E0B ${key} \u958B\u59CB\u6536\u97F3\uFF0C\u518D\u6309\u4E00\u4E0B\u505C\u6B62`,
    holdTaps: (key, taps) => `\u5FEB\u901F\u6309${taps === 2 ? "\u4E00" : "\u5169"}\u4E0B ${key}\uFF0C\u7DCA\u63A5\u8457\u6309\u4F4F\u8AAA\u8A71\uFF0C\u653E\u958B\u5373\u9001\u51FA`,
    hold: (key) => `\u6309\u4F4F ${key} \u8AAA\u8A71\uFF0C\u653E\u958B\u5373\u9001\u51FA`,
    failedLine: (error) => `[\u5931\u6557] ${error}`
  },
  keys: {
    LeftCtrl: "\u5DE6 Ctrl",
    RightCtrl: "\u53F3 Ctrl",
    LeftAlt: "\u5DE6 Alt",
    RightAlt: "\u53F3 Alt",
    LeftShift: "\u5DE6 Shift",
    RightShift: "\u53F3 Shift",
    RightWin: "\u53F3 Win",
    Backquote: "`",
    Mouse3: "\u6ED1\u9F20\u4E2D\u9375",
    Mouse4: "\u6ED1\u9F20\u5074\u9375 4",
    Mouse5: "\u6ED1\u9F20\u5074\u9375 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "\u5DE6 Control",
    RightCtrl: "\u53F3 Control",
    Alt: "Option",
    LeftAlt: "\u5DE6 Option",
    RightAlt: "\u53F3 Option",
    Win: "Command",
    RightWin: "\u53F3 Command"
  },
  taps: (taps, keys) => `${taps === 2 ? "\u6309\u5169\u4E0B" : "\u6309\u4E09\u4E0B"} ${keys}`,
  hotkey: {
    cannotRead: (why) => `\u7121\u6CD5\u8B80\u53D6\u9375\u76E4\u72C0\u614B\uFF1A${why}`,
    macNoKey: "Mac \u4E0A\u6C92\u6709\u9019\u500B\u6309\u9375\uFF0C\u8ACB\u66F4\u63DB\u8AAA\u8A71\u9375",
    macPermission: "\u6C92\u6709\u300C\u8F38\u5165\u76E3\u63A7\u300D\u6B0A\u9650\uFF1A\u5728\u300C\u7CFB\u7D71\u8A2D\u5B9A \u2192 \u96B1\u79C1\u6B0A\u8207\u5B89\u5168\u6027 \u2192 \u8F38\u5165\u76E3\u63A7\u300D\u88E1\u958B\u555F Coopanion\uFF0C\u518D\u91CD\u65B0\u555F\u52D5\u5B83\uFF1B\u5DF2\u7D93\u958B\u555F\u7684\u8A71\uFF0C\u5148\u7528\u300C\u2212\u300D\u628A Coopanion \u79FB\u51FA\u5217\u8868\u518D\u52A0\u56DE\u4F86\uFF1A\u66F4\u65B0\u5F8C\u7684\u65B0\u7248\u672C\u4E0D\u6703\u6CBF\u7528\u820A\u7684\u6388\u6B0A",
    linuxNoKey: "Linux \u4E0A\u7121\u6CD5\u8B80\u53D6\u8A72\u6309\u9375\uFF08\u4E0D\u652F\u63F4\u6ED1\u9F20\u5074\u9375\uFF09\uFF0C\u8ACB\u66F4\u63DB\u8AAA\u8A71\u9375",
    linuxNoDisplay: "\u6309\u9375\u6536\u97F3\u5728 Linux \u4E0A\u9700\u8981 X11\uFF08\u6216 XWayland\uFF09\uFF1A\u6C92\u6709\u8A2D\u5B9A DISPLAY",
    linuxNoX11: "\u6309\u9375\u6536\u97F3\u9023\u4E0D\u4E0A X11 \u986F\u793A",
    unsupported: "\u6309\u9375\u6536\u97F3\u53EA\u80FD\u5728 Windows\u3001macOS \u548C Linux \u4E0A\u4F7F\u7528"
  },
  typeKey: {
    macNoKey: "Mac \u4E0A\u6C92\u6709\u9019\u500B\u6309\u9375\uFF0C\u8ACB\u66F4\u63DB\u6253\u5B57\u9375",
    linuxNoKey: "Linux \u4E0A\u7121\u6CD5\u8B80\u53D6\u8A72\u6309\u9375\uFF08\u4E0D\u652F\u63F4\u6ED1\u9F20\u5074\u9375\uFF09\uFF0C\u8ACB\u66F4\u63DB\u6253\u5B57\u9375",
    linuxNoDisplay: "\u6253\u5B57\u9375\u5728 Linux \u4E0A\u9700\u8981 X11\uFF08\u6216 XWayland\uFF09\uFF1A\u6C92\u6709\u8A2D\u5B9A DISPLAY",
    linuxNoX11: "\u6253\u5B57\u9375\u9023\u4E0D\u4E0A X11 \u986F\u793A",
    unsupported: "\u6253\u5B57\u9375\u53EA\u80FD\u5728 Windows\u3001macOS \u548C Linux \u4E0A\u4F7F\u7528"
  },
  system: {
    name: (culture) => culture ? `Windows \u8A9E\u97F3\u8FA8\u8B58\uFF08${culture}\uFF09` : "Windows \u8A9E\u97F3\u8FA8\u8B58",
    noSpeech: "\u7CFB\u7D71\u8A9E\u97F3\u5143\u4EF6 System.Speech \u7121\u6CD5\u8F09\u5165",
    noRecognizer: (language) => `\u7CFB\u7D71\u88E1\u6C92\u6709${language === "auto" ? "" : `\u300C${language}\u300D\u7684`}\u8A9E\u97F3\u8FA8\u8B58\u5668\uFF1A\u8ACB\u5728 Windows \u8A2D\u5B9A \u2192 \u6642\u9593\u8207\u8A9E\u8A00 \u2192 \u8A9E\u8A00\u88E1\u70BA\u8A72\u8A9E\u8A00\u5B89\u88DD\u300C\u8A9E\u97F3\u8FA8\u8B58\u300D`,
    windowsOnly: "\u7CFB\u7D71\u8A9E\u97F3\u8FA8\u8B58\u53EA\u80FD\u5728 Windows \u4E0A\u4F7F\u7528",
    startFailed: (why) => `\u555F\u52D5\u5931\u6557\uFF1A${why}`,
    exited: "\u7CFB\u7D71\u8A9E\u97F3\u8FA8\u8B58\u8655\u7406\u7A0B\u5E8F\u7D50\u675F\u4E86",
    exitedCode: (code) => `\u7CFB\u7D71\u8A9E\u97F3\u8FA8\u8B58\u8655\u7406\u7A0B\u5E8F\u7D50\u675F\uFF08\u7D50\u675F\u4EE3\u78BC ${code}\uFF09`,
    notReady: "\u7CFB\u7D71\u8A9E\u97F3\u8FA8\u8B58\u6C92\u6709\u5728\u6642\u9650\u5167\u5C31\u7DD2",
    notRunning: "\u7CFB\u7D71\u8A9E\u97F3\u8FA8\u8B58\u6C92\u6709\u57F7\u884C",
    timeout: (ms) => `\u8FA8\u8B58\u903E\u6642\uFF08${ms} ms\uFF09`,
    stopped: "\u7CFB\u7D71\u8A9E\u97F3\u8FA8\u8B58\u5DF2\u505C\u6B62"
  },
  sherpa: {
    incomplete: "\u8FA8\u8B58\u6A21\u578B\u6A94\u6848\u4E0D\u5B8C\u6574\uFF0C\u8ACB\u91CD\u65B0\u4E0B\u8F09",
    noRuntime: (platform) => `\u9019\u500B\u5E73\u53F0\uFF08${platform}\uFF09\u6C92\u6709 sherpa-onnx \u7684\u57F7\u884C\u7A0B\u5F0F\u5EAB`,
    loadFailed: (why) => `\u8FA8\u8B58\u6A21\u578B\u8F09\u5165\u5931\u6557\uFF1A${why}`,
    notLoaded: "\u8FA8\u8B58\u6A21\u578B\u6C92\u6709\u8F09\u5165"
  },
  /** OpenAI 相容的轉寫介面(引擎 api) */
  transcription: {
    noUrl: "\u9084\u6C92\u6709\u586B\u5BEB\u8F49\u5BEB\u4ECB\u9762\u7684\u4F4D\u5740",
    badUrl: (url) => `\u4ECB\u9762\u4F4D\u5740\u4E0D\u662F http \u6216 https \u7DB2\u5740\uFF1A${url}`,
    httpRemote: "\u9060\u7AEF\u4F4D\u5740\u53EA\u80FD\u7528 https\uFF1Ahttp \u4E0D\u52A0\u5BC6\uFF0CAPI Key \u548C\u9304\u97F3\u6703\u4EE5\u660E\u6587\u50B3\u8F38\u3002\u672C\u6A5F\u548C\u5340\u57DF\u7DB2\u8DEF\u7684\u4F4D\u5740\u53EF\u4EE5\u7528 http\u3002",
    noModel: "\u9084\u6C92\u6709\u586B\u5BEB\u8F49\u5BEB\u6A21\u578B",
    notRunning: "\u8F49\u5BEB\u4ECB\u9762\u6C92\u6709\u555F\u52D5",
    status: (status, message) => message ? `HTTP ${status}\uFF1A${message}` : `HTTP ${status}`,
    timeout: (ms) => `\u4ECB\u9762\u5728 ${ms} ms \u5167\u6C92\u6709\u56DE\u61C9`,
    network: (why) => `\u9023\u4E0D\u4E0A\u4ECB\u9762\uFF1A${why}`,
    noText: "\u4ECB\u9762\u7684\u56DE\u61C9\u88E1\u6C92\u6709 text"
  },
  store: {
    noBuild: (platform) => `\u6C92\u6709 ${platform} \u7684\u9810\u5148\u7DE8\u8B6F\u5957\u4EF6`,
    downloading: (file) => `\u4E0B\u8F09 ${file}`,
    unpacking: "\u89E3\u58D3\u7E2E",
    downloadingModel: "\u4E0B\u8F09\u8FA8\u8B58\u6A21\u578B",
    downloadingFrom: (file, host) => `\u4E0B\u8F09 ${file}\uFF08${host}\uFF09`,
    verifying: (file) => `\u9A57\u8B49 ${file}`,
    mismatch: (sum) => `\u6AA2\u67E5\u78BC\u4E0D\u7B26\uFF1A${sum}\u2026`,
    failed: (file, why) => `${file} \u4E0B\u8F09\u5931\u6557\uFF08${why}\uFF09`,
    exitCode: (cmd, code, out) => `${cmd} \u7D50\u675F\u4EE3\u78BC ${code}\uFF1A${out}`
  },
  packs: {
    noManifest: (file) => `\u6C92\u6709 ${file}`,
    badJson: (file, why) => `${file} \u4E0D\u662F\u6709\u6548\u7684 JSON\uFF1A${why}`,
    notInteger: (key, got) => `${key} \u61C9\u70BA\u6574\u6578\uFF0C\u537B\u662F ${got}`,
    tooNew: (key, v, now) => `${key} \u662F ${v}\uFF0C\u9019\u4E00\u7248\u53EA\u8A8D\u5F97\u5230 ${now}\uFF1A\u8ACB\u5148\u66F4\u65B0\u61C9\u7528\u7A0B\u5F0F`,
    tooOld: (key, v, oldest) => `${key} ${v} \u662F ${oldest} \u4E4B\u524D\u7684\u6E2C\u8A66\u683C\u5F0F\uFF0C\u7121\u6CD5\u8B80\u53D6`,
    badId: (got) => `id \u7121\u6548\uFF1A${got}`,
    noName: "\u7F3A\u5C11 name",
    noAbout: "\u7F3A\u5C11 about",
    badEntry: "entry \u6216 export \u7121\u6548",
    badModel: "model \u8DEF\u5F91\u7121\u6548",
    badThumb: "thumb \u8DEF\u5F91\u7121\u6548",
    badAxis: (got) => `axes \u88E1\u6709\u4E00\u9805\u7121\u6548\uFF1A${got}`,
    badOption: (axis, got) => `axes.${axis} \u88E1\u6709\u7121\u6548\u7684\u9078\u9805\uFF1A${got}`,
    badPreset: (got) => `presets \u88E1\u6709\u4E00\u9805\u7121\u6548\uFF1A${got}`,
    presetMissing: (preset, axis) => `presets.${preset} \u6C92\u6709\u9078 ${axis} \u7684\u9078\u9805`,
    vocabNotArray: "vocab \u61C9\u70BA\u9663\u5217",
    badWordId: (got) => `vocab \u88E1\u6709\u7121\u6548\u7684 id\uFF1A${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind \u662F ${kind}\uFF0C\u9019\u4E00\u7248\u4E0D\u8A8D\u5F97\uFF0C\u9019\u500B\u8A5E\u4E0D\u7D66 bot \u7528`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} \u61C9\u70BA\u9663\u5217`,
    badWordName: (id, got) => `vocab.${id} \u7684\u540D\u5B57\u7121\u6548\uFF1A${got}`,
    nameTaken: (name) => `vocab \u88E1 ${name} \u6307\u4E86\u4E0D\u53EA\u4E00\u500B\u8A5E`,
    noWordAbout: (id) => `\u7F3A\u5C11 vocab.${id}.about`,
    badSeconds: (id) => `vocab.${id}.seconds \u61C9\u70BA\u6B63\u6578`,
    soundsNotObject: "sounds \u61C9\u70BA\u7269\u4EF6",
    badSoundName: (got) => `sounds \u88E1\u7684\u540D\u5B57\u7121\u6548\uFF1A${got}`,
    badSoundFile: (name) => `sounds.${name}.file \u61C9\u70BA\u5F62\u8C61\u5305\u88E1\u7684\u6A94\u6848`,
    badVolume: (name) => `sounds.${name}.volume \u61C9\u70BA 0\u20131`,
    soundType: (name, file) => `sounds.${name} \u7684 ${file} \u4E0D\u662F\u9019\u4E00\u7248\u80FD\u64AD\u653E\u7684 .ogg\u3001.mp3 \u6216 .wav\uFF0C\u9019\u500B\u8072\u97F3\u4E0D\u6703\u97FF`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind \u662F ${kind}\uFF0C\u9019\u4E00\u7248\u53EA\u8A8D\u5F97 ${kinds.join("\u3001")}\uFF0C\u9019\u500B\u8072\u97F3\u4E0D\u6703\u97FF`,
    soundMissing: (name, file) => `sounds.${name} \u7684 ${file} \u4E0D\u5B58\u5728\uFF0C\u9019\u500B\u8072\u97F3\u4E0D\u6703\u97FF`,
    badWalk: (got) => `can.walk \u662F ${got}\uFF0C\u9019\u4E00\u7248\u4E0D\u8A8D\u5F97\uFF0C\u7576\u4F5C\u6703\u8D70\u8DEF\u8655\u7406`,
    movesNotArray: "moves \u61C9\u70BA\u9663\u5217",
    tooManyMoves: (max2) => `moves \u6700\u591A ${max2} \u9805`,
    badMoveId: (got) => `moves \u88E1\u6709\u4E0D\u5408\u6CD5\u7684 id\uFF1A${got}\uFF08left\u3001center\u3001right\u3001cursor \u548C\u6578\u5B57\u662F\u9810\u8A2D\u76EE\u6A19\uFF09`,
    moveTaken: (id) => `moves \u88E1\u6709\u4E0D\u53EA\u4E00\u500B ${id}`,
    noMoveText: (id) => `moves.${id} \u7F3A\u5C11 name \u6216 about`,
    badMoveParams: (id, max2) => `moves.${id}.params \u61C9\u70BA\u6700\u591A ${max2} \u9805\u7684\u9663\u5217\uFF0C\u6BCF\u9805\u6709 id\u3001about \u548C min \u5C0F\u65BC max \u7684\u6578\u503C`,
    needsNotArray: "needs \u61C9\u70BA\u9663\u5217",
    unknownNeed: (got) => `needs \u88E1\u7684 ${got} \u9019\u4E00\u7248\u4E0D\u8A8D\u8B58\uFF0C\u4E0D\u63D0\u4F9B`,
    idTaken: (id, builtin) => `id ${id} \u5DF2\u88AB${builtin ? "\u5167\u5EFA\u5F62\u8C61" : "\u53E6\u4E00\u500B\u5F62\u8C61\u5305"}\u4F54\u7528`
  },
  importing: {
    badZip: (why) => `\u9019\u4E0D\u662F\u80FD\u8B80\u53D6\u7684 zip\uFF1A${why}`,
    tooBig: (mb) => `\u89E3\u58D3\u7E2E\u5F8C\u8D85\u904E ${mb} MB`,
    truncated: "\u4E0A\u50B3\u7684\u5167\u5BB9\u4E0D\u5B8C\u6574",
    badPath: (path) => `\u6709\u4E00\u500B\u8DEF\u5F91\u4E0D\u80FD\u7528\uFF1A${path}`,
    builtinId: (id) => `id ${id} \u5C6C\u65BC\u5167\u5EFA\u5F62\u8C61\uFF0C\u63DB\u500B id \u624D\u80FD\u532F\u5165`,
    duplicateId: (id) => `id ${id} \u548C\u9019\u6B21\u532F\u5165\u7684\u53E6\u4E00\u500B\u5F62\u8C61\u5305\u91CD\u8907`,
    unpackFailed: (why) => `\u7121\u6CD5\u89E3\u58D3\u7E2E\uFF1A${why}`,
    expired: "\u9019\u6B21\u532F\u5165\u5DF2\u7D93\u904E\u671F\uFF0C\u8ACB\u91CD\u65B0\u9078\u64C7",
    noneChosen: "\u6C92\u6709\u9078\u64C7\u8981\u532F\u5165\u7684\u5F62\u8C61\u5305",
    zipOrFolder: "\u53EA\u80FD\u532F\u5165 zip \u6216\u8CC7\u6599\u593E",
    overLimit: (mb) => `\u8D85\u904E ${mb} MB`
  },
  removing: {
    notInstalled: (id) => `\u6C92\u6709 id \u70BA ${id} \u7684\u5F62\u8C61\u5305`,
    builtin: (id) => `${id} \u662F\u5167\u5EFA\u5F62\u8C61\uFF0C\u7121\u6CD5\u89E3\u9664\u5B89\u88DD`,
    elsewhere: (id) => `${id} \u4E0D\u5728\u5F62\u8C61\u5305\u7684\u5B89\u88DD\u76EE\u9304\u4E2D\uFF0C\u7121\u6CD5\u5728\u9019\u88E1\u89E3\u9664\u5B89\u88DD`,
    failed: (why) => `\u7121\u6CD5\u522A\u9664\uFF1A${why}`
  },
  consent: {
    question: (items) => `\u6211\u60F3${items.join("\u3001")}\uFF0C\u53EF\u4EE5\u55CE\uFF1F`,
    choices: ["\u53EF\u4EE5", "\u4EE5\u5F8C\u90FD\u53EF\u4EE5", "\u4E0D\u7528\u4E86"],
    list: (items) => items.join("\u3001"),
    pick: (axis, option) => `${axis}\uFF1A${option}`,
    figure: (to) => `\u63DB\u6210${to}\u7684\u6A23\u5B50`,
    scheme: (figure, look) => `\u63DB\u4E00\u8EAB${figure}\u7684\u88DD\u626E\uFF08${look}\uFF09`,
    roam: { free: "\u5E38\u8D70\u52D5", calm: "\u591A\u5F85\u8457", off: "\u4E0D\u4E82\u52D5" },
    roamTo: (to) => `\u8D70\u52D5\u6539\u6210\u300C${to}\u300D`,
    snore: (seconds) => seconds === 0 ? "\u7761\u8457\u6642\u4E00\u76F4\u6253\u547C\u5230\u9192" : `\u6BCF\u6B21\u7761\u8457\u6253 ${seconds} \u79D2\u547C`,
    sound: (on) => on ? "\u958B\u555F\u97F3\u6548" : "\u95DC\u9589\u97F3\u6548",
    scale: (from, to) => `\u628A\u5927\u5C0F\u5F9E ${from} \u500D\u6539\u6210 ${to} \u500D`,
    bubbleSize: (from, to) => `\u628A\u6C23\u6CE1\u5C3A\u5BF8\u5F9E ${from} \u500D\u6539\u6210 ${to} \u500D`,
    fontSize: (from, to) => `\u628A\u5B57\u9AD4\u5C3A\u5BF8\u5F9E ${from} \u500D\u6539\u6210 ${to} \u500D`,
    theme: { dark: "\u63DB\u6210\u591C\u9593\u6A21\u5F0F", light: "\u63DB\u6210\u767D\u5929\u6A21\u5F0F" },
    hover: (list) => `\u628A\u61F8\u505C\u6309\u9215\u63DB\u6210${list}`,
    actions: { chat: "\u6253\u5B57", voice: "\u8A9E\u97F3\u8F38\u5165", roam: "\u8D70\u52D5", theme: "\u591C\u9593\u6A21\u5F0F", sound: "\u97F3\u6548", dress: "\u88DD\u626E", hide: "\u96B1\u85CF\u684C\u5BF5" },
    user: (to) => `\u6539\u53EB\u4F60\u300C${to}\u300D`
  },
  portsTaken: (from, to, why) => `\u9023\u63A5\u57E0 ${from}\u2013${to} \u90FD\u88AB\u4F54\u7528\uFF1A${why}`,
  console: {
    label: "\u684C\u5BF5",
    window: "\u684C\u5BF5\u8996\u7A97",
    connected: "\u9801\u9762\u5DF2\u9023\u7DDA",
    notOpen: "\u672A\u958B\u555F",
    noBody: (reason) => `\u9801\u9762\u5DF2\u9023\u7DDA\uFF0C\u5F62\u8C61\u7121\u6CD5\u7E6A\u88FD\uFF1A${reason}`,
    alsoBrowser: (hint) => `${hint}\uFF1B\u700F\u89BD\u5668\u9801\u9762\u5DF2\u9023\u7DDA`,
    voice: "\u8A9E\u97F3\u8FA8\u8B58",
    notStarted: "\u672A\u555F\u52D5",
    viewInBrowser: "\u5728\u700F\u89BD\u5668\u4E2D\u67E5\u770B\u684C\u5BF5",
    dress: "\u88DD\u626E",
    panels: {
      pet: { title: "\u684C\u5BF5", description: "\u8996\u7A97\u3001\u88DD\u626E\u8207\u8996\u7A97\u57F7\u884C\u74B0\u5883\u3002" },
      voice: { title: "\u8A9E\u97F3\u8F38\u5165", description: "\u8FA8\u8B58\u5F15\u64CE\u3001\u97F3\u91CF\u8207\u8FA8\u8B58\u7D50\u679C\u3002" }
    },
    envPrompt: { title: "\u684C\u5BF5\u74B0\u5883", description: "\u63CF\u8FF0\u684C\u5BF5\u7684\u8EAB\u9AD4\u3001\u56DB\u500B\u5DE5\u5177\u8207\u8F38\u5165\u4E8B\u4EF6\u3002" },
    vars: {
      "pet.user": "\u5C0D\u4F7F\u7528\u8005\u7684\u7A31\u547C",
      "pet.vocab": "\u76EE\u524D\u5F62\u8C61\u7684\u8868\u60C5\u8207\u52D5\u4F5C\u8A5E\u8868",
      "pet.moves": "\u76EE\u524D\u5F62\u8C61\u81EA\u5E36\u7684 pet_move_to \u76EE\u6A19\uFF1B\u6C92\u6709\u6642\u70BA\u7A7A",
      "pet.voice": "\u8A9E\u97F3\u8F38\u5165\u958B\u8457\u9084\u662F\u95DC\u8457",
      "pet.body": "\u76EE\u524D\u5F62\u8C61\u7684\u6A23\u5B50",
      "pet.dress": "pet_set \u80FD\u9078\u7684\u5F62\u8C61\u8207\u88DD\u626E",
      "pet.self": "\u300C\u81EA\u4E3B\u8A2D\u5B9A\u6B0A\u9650\u300D\uFF1A\u54EA\u4E9B\u8A2D\u5B9A\u76F4\u63A5\u6539\u3001\u54EA\u4E9B\u5148\u5FB5\u5F97\u540C\u610F\uFF0C\u6216\u90FD\u4E0D\u80FD\u6539",
      "pet.chat": "\u61C9\u7528\u7A0B\u5F0F\u63D0\u4F9B\u5C0D\u8A71\u9801\u6642\uFF0C\u5C0D\u5B83\u7684\u8AAA\u660E\uFF1B\u6C92\u6709\u6642\u70BA\u7A7A",
      "pet.reply": "\u61C9\u7528\u7A0B\u5F0F\u8A9E\u8A00\u65E2\u4E0D\u662F\u7C21\u9AD4\u4E2D\u6587\u4E5F\u4E0D\u662F\u82F1\u6587\u6642\uFF0C\u8B93 bot \u7528\u90A3\u7A2E\u8A9E\u8A00\u8AAA\u8A71\u7684\u4E00\u53E5\uFF1B\u5426\u5247\u70BA\u7A7A",
      "pet.cua": "\u96FB\u8166\u64CD\u4F5C\u4E00\u7BC0\uFF1A\u622A\u5716\u5EA7\u6A19\u3001\u4F55\u6642\u5148\u8A62\u554F\u4F7F\u7528\u8005\u3001\u8B93\u4F4D\u898F\u5247\uFF1B\u96FB\u8166\u64CD\u4F5C\u95DC\u9589\u6642\u70BA\u7A7A"
    },
    noGuide: "\u9019\u500B\u61C9\u7528\u7A0B\u5F0F\u6C92\u6709\u5F15\u5C0E",
    unknownMethod: (name) => `\u672A\u77E5\u7684\u65B9\u6CD5 ${name}`
  },
  config: {
    group: "\u684C\u5BF5",
    soundGroup: "\u97F3\u6548",
    asrGroup: "\u8A9E\u97F3\u8F38\u5165",
    user: { title: "\u7A31\u547C", description: (max2) => `\u8A9E\u97F3\u3001\u6253\u5B57\u548C\u4E92\u52D5\u4E8B\u4EF6\u88E1\u7528\u9019\u500B\u540D\u5B57\u7A31\u547C\u4F60\uFF0C\u6700\u591A ${max2} \u500B\u5B57\u3002\u7559\u7A7A\u6642\u4F7F\u7528\u9810\u8A2D\u7A31\u547C\u3002` },
    roam: { title: "\u8D70\u52D5", description: "free \u5E38\u8D70\u52D5\uFF1Bcalm \u591A\u5F85\u8457\uFF1Boff \u53EA\u505A\u88AB\u8981\u6C42\u7684\u52D5\u4F5C\u3002" },
    theme: { title: "\u591C\u9593\u6A21\u5F0F", description: "dark \u591C\u9593\uFF1A\u6DFA\u8272\u8EAB\u9AD4\u3001\u6DF1\u8272\u6C23\u6CE1\uFF1Blight \u767D\u5929\uFF1A\u6DF1\u8272\u8EAB\u9AD4\u3001\u6DFA\u8272\u6C23\u6CE1\u3002" },
    rememberPosition: { title: "\u8A18\u4F4F\u4F4D\u7F6E", description: "\u7D50\u675F\u6642\u8A18\u4E0B\u684C\u5BF5\u7684\u6A6B\u5411\u4F4D\u7F6E\uFF0C\u4E0B\u6B21\u555F\u52D5\u56DE\u5230\u90A3\u88E1\uFF1B\u6709\u591A\u500B\u87A2\u5E55\u6642\u4E00\u5F8B\u5728\u4E3B\u87A2\u5E55\u4E0A\u555F\u52D5\u3002" },
    hoverButtons: { title: "\u61F8\u505C\u6309\u9215", description: (max2, ids) => `\u6ED1\u9F20\u505C\u5728\u684C\u5BF5\u8EAB\u4E0A\u6642\u65C1\u908A\u51FA\u73FE\u7684\u6309\u9215\uFF0C\u6700\u591A ${max2} \u500B\uFF0C\u4EE5\u9017\u865F\u5206\u9694\uFF1A${ids}\u3002` },
    doubleClickChat: { title: "\u9EDE\u5169\u4E0B\u958B\u555F\u6253\u5B57\u6846", description: "\u5728\u684C\u5BF5\u4E0A\u9EDE\u5169\u4E0B\u958B\u555F\u6253\u5B57\u6846\u3002" },
    statusBubble: { title: "\u72C0\u614B\u6C23\u6CE1", description: "\u60F3\u4E8B\u60C5\u3001\u7FFB\u8A18\u61B6\u3001\u64CD\u4F5C\u96FB\u8166\u6642\u986F\u793A\u5728\u505A\u4EC0\u9EBC\uFF0C\u6703\u986F\u793A\u6A94\u540D\u3002" },
    saidBubbles: { title: "\u8F38\u5165\u6C23\u6CE1", description: "\u6253\u5B57\u3001\u8A9E\u97F3\u548C\u5C0D\u8A71\u9801\u9001\u51FA\u7684\u8A0A\u606F\u986F\u793A\u5728\u684C\u5BF5\u982D\u9802\uFF0C\u56DE\u8986\u5F8C\u6DE1\u51FA\u3002\u95DC\u9589\u6642\u8A9E\u97F3\u53EA\u5728\u8FA8\u8B58\u4E2D\u986F\u793A\u3002" },
    selfAdjust: { title: "\u81EA\u4E3B\u8A2D\u5B9A\u6B0A\u9650", description: "off \u7981\u6B62\uFF1A\u4E0D\u80FD\u81EA\u884C\u6539\u8A2D\u5B9A\uFF0C\u4E5F\u4E0D\u80FD\u81E8\u6642\u5B89\u975C\uFF1Bdefault \u9810\u8A2D\uFF1A\u5F62\u8C61\u3001\u914D\u8272\u3001\u8D70\u52D5\u548C\u6253\u547C\u76F4\u63A5\u6539\uFF0C\u5927\u5C0F\u3001\u6C23\u6CE1\u5C3A\u5BF8\u3001\u5B57\u9AD4\u5C3A\u5BF8\u3001\u97F3\u6548\u3001\u591C\u9593\u6A21\u5F0F\u3001\u61F8\u505C\u6309\u9215\u548C\u7A31\u547C\u5148\u5FB5\u5F97\u4F60\u540C\u610F\uFF1Bany \u4EFB\u610F\uFF1A\u90FD\u76F4\u63A5\u6539\uFF1Bcustom \u81EA\u8A02\uFF1A\u7167\u300C\u7FD2\u6163\u300D\u9801\u88E1\u7684\u52FE\u9078\uFF0C\u52FE\u4E0A\u7684\u76F4\u63A5\u6539\uFF0C\u5176\u9918\u5148\u5FB5\u5F97\u4F60\u540C\u610F\u3002" },
    windowEnabled: { title: "\u555F\u52D5\u6642\u958B\u555F\u684C\u5BF5\u8996\u7A97" },
    scale: { title: "\u5927\u5C0F" },
    bubbleSize: { title: "\u6C23\u6CE1\u5C3A\u5BF8", description: "\u684C\u5BF5\u548C\u4F60\u7684\u6C23\u6CE1\u7684\u5BEC\u5EA6\u3001\u7559\u767D\u3001\u5713\u89D2\u548C\u5C3E\u5DF4\uFF0C1 \u70BA\u9810\u8A2D\uFF1B\u5B57\u7D1A\u4E0D\u8B8A\u3002" },
    fontSize: { title: "\u5B57\u9AD4\u5C3A\u5BF8", description: "\u6C23\u6CE1\u88E1\u6587\u5B57\u7684\u5927\u5C0F\uFF0C1 \u70BA\u9810\u8A2D\uFF1B\u6C23\u6CE1\u5BEC\u5EA6\u4E0D\u8B8A\u3002" },
    bubbleSpeed: { title: "\u6C23\u6CE1\u901F\u5EA6", description: "\u684C\u5BF5\u7684\u6C23\u6CE1\u9010\u5B57\u51FA\u73FE\u548C\u505C\u7559\u7684\u901F\u5EA6\uFF0C1 \u70BA\u9810\u8A2D\uFF0C\u8D8A\u5927\u8D8A\u5FEB\u3002" },
    glow: { title: "\u5916\u767C\u5149", description: "\u684C\u5BF5\u548C\u8EAB\u5F8C\u7684\u984F\u8272\u76F8\u8FD1\u6642\uFF0C\u8EAB\u9AD4\u5468\u570D\u51FA\u73FE\u7684\u6DFA\u8272\u5916\u767C\u5149\u5411\u5916\u5EF6\u4F38\u591A\u5C11\u50CF\u7D20\uFF1B0 \u70BA\u95DC\u9589\u3002" },
    frameRate: { title: "\u5E40\u7387", description: "\u8D70\u52D5\u3001\u88AB\u62CE\u8457\u3001\u8DF3\u8D77\u6642\u6BCF\u79D2\u756B\u5E7E\u5E40\uFF1B0 \u8DDF\u96A8\u87A2\u5E55\u66F4\u65B0\u7387\u3002\u8D85\u904E\u87A2\u5E55\u66F4\u65B0\u7387\u6642\u4EE5\u87A2\u5E55\u7684\u70BA\u6E96\u3002\u300C\u7FD2\u6163\u300D\u9801\u53EF\u9078 60\u3001120\u3001144 \u548C\u4E0D\u9650\u3002" },
    lockFrameRate: { title: "\u5E40\u7387\u9396\u5B9A", description: "\u975C\u6B62\u6642\u4E5F\u4F9D\u300C\u5E40\u7387\u300D\u7E6A\u88FD\u684C\u5BF5\u3002\u95DC\u9589\u6642\u7AD9\u8457\u3001\u5750\u8457\u3001\u7761\u8457\u6703\u964D\u5230\u6BCF\u79D2 30 \u5E40\u3002" },
    hideWhenFullscreen: { title: "\u5168\u87A2\u5E55\u6642\u81EA\u52D5\u96B1\u85CF", description: "\u958B\u555F\u6642\uFF0C\u524D\u666F\u8996\u7A97\u4EE5\u5168\u87A2\u5E55\u92EA\u6EFF\u684C\u5BF5\u6240\u5728\u7684\u90A3\u500B\u87A2\u5E55\uFF08\u904A\u6232\u3001\u5168\u87A2\u5E55\u5F71\u7247\u3001\u700F\u89BD\u5668\u5168\u87A2\u5E55\uFF09\u5C31\u628A Coo \u85CF\u8D77\u4F86\uFF0C\u96E2\u958B\u5168\u87A2\u5E55\u5F8C\u518D\u653E\u56DE\u4F86\uFF1B\u6700\u5927\u5316\u7684\u8996\u7A97\u4E0D\u7B97\u3002\u95DC\u9589\u6642\u4E00\u5F8B\u6D6E\u5728\u6700\u4E0A\u5C64\u3002" },
    exportOverlay: { title: "OBS \u756B\u9762", description: "\u5728 /overlay \u63D0\u4F9B\u684C\u5BF5\u8996\u7A97\u7684\u900F\u660E\u756B\u9762\uFF0C\u4F9B OBS\u300C\u700F\u89BD\u5668\u300D\u4F86\u6E90\u4F7F\u7528\uFF1B\u95DC\u9589\u6642\u4E0D\u63D0\u4F9B\u3002" },
    electronFile: { title: "Electron \u7A0B\u5F0F", description: "\u7559\u7A7A\u6642\u4F9D\u5E8F\u4F7F\u7528 CORTICO_DESKTOP_PET_HOST \u548C\u9762\u677F\u88E1\u5B89\u88DD\u7684\u57F7\u884C\u74B0\u5883\u3002" },
    port: { title: "\u9801\u9762\u9023\u63A5\u57E0", description: "\u88AB\u4F54\u7528\u6642\u5F80\u4E0A\u9806\u5EF6\u5230\u4E0B\u4E00\u500B\u7A7A\u7684\u9023\u63A5\u57E0\u3002" },
    touchEnabled: { title: "\u4E92\u52D5\u9001\u6210\u4E8B\u4EF6", description: "\u6233\u3001\u6478\u3001\u62CE\u8D77\u4F86\u7529\u51FA\u53BB\u3002" },
    touchWakeOn: { title: "\u56DE\u61C9\u6A21\u5F0F", description: "poke\uFF1A\u53EA\u6709\u6233\u4E00\u4E0B\u99AC\u4E0A\u56DE\u61C9\uFF0C\u5176\u9918\u4E92\u52D5\u7B49\u4E0B\u6B21\u56DE\u61C9\u6642\u4E00\u4F75\u9001\u9054\uFF1Ball\uFF1A\u6240\u6709\u4E92\u52D5\u90FD\u99AC\u4E0A\u56DE\u61C9\uFF1Bnone\uFF1A\u6240\u6709\u4E92\u52D5\u90FD\u7B49\u4E0B\u6B21\u56DE\u61C9\u6642\u4E00\u4F75\u9001\u9054\uFF1Bcustom\uFF1A\u4F9D\u300C\u7FD2\u6163\u300D\u9801\u52FE\u9078\u7684\u4E92\u52D5\u99AC\u4E0A\u56DE\u61C9\u3002\u4E00\u6B21\u4E92\u52D5\u5F97\u5230\u56DE\u61C9\u4E4B\u5F8C\u3001\u672C\u8F2A\u7D50\u675F\u4E4B\u524D\u7684\u4E92\u52D5\uFF0C\u90FD\u7B49\u4E0B\u6B21\u56DE\u61C9\u6642\u4E00\u4F75\u9001\u9054\u3002" },
    sound: { title: "\u97F3\u6548\u7E3D\u958B\u95DC", description: "\u684C\u5BF5\u9078\u55AE\u88E1\u7684\u97F3\u6548\u6309\u9215\u5207\u63DB\u7684\u5C31\u662F\u9019\u500B\u3002" },
    sounds: {
      move: { title: "\u52D5\u4F5C", description: "\u8D70\u8DEF\u3001\u8DD1\u3001\u8DF3\u3001\u843D\u5730\u3001\u88AB\u7529\u51FA\u53BB\u3001\u9EDE\u982D\u3001\u6416\u982D\u3001\u8F49\u5708\u3001\u982D\u6688\u3001\u767C\u6296\u3001\u8DF3\u821E\u3001\u5F35\u671B\u3002" },
      touch: { title: "\u4E92\u52D5", description: "\u88AB\u62CE\u8D77\u4F86\u3001\u62CE\u8457\u6643\u3001\u88AB\u6478\u3001\u88AB\u6233\u3002" },
      face: { title: "\u8868\u60C5", description: "\u958B\u5FC3\u3001\u7728\u773C\u3001\u559C\u6B61\u3001\u9A5A\u8A1D\u3001\u751F\u6C23\u3001\u96E3\u904E\u3001\u5BB3\u7F9E\u3001\u6253\u54C8\u6B20\u3002" },
      snore: { title: "\u6253\u547C", description: "" },
      talk: { title: "\u8AAA\u8A71", description: "\u6C23\u6CE1\u6587\u5B57\u9010\u5B57\u5192\u51FA\u6642\u7684\u5630\u5495\u8072\u3001\u9078\u9805\u5361\u7247\u5F48\u51FA\u7684\u8072\u97F3\u3002" },
      ui: { title: "\u6309\u9215\u8207\u63D0\u793A", description: "\u9EDE\u6309\u9215\u3001\u6C23\u6CE1\u5F48\u51FA\u3001\u9078\u53D6\u3001\u958B\u59CB\u548C\u7D50\u675F\u807D\u4F60\u8AAA\u8A71\u3002" }
    },
    snoreSeconds: { title: "\u6253\u547C\u6642\u9577", suffix: "\u79D2", description: "\u6BCF\u6B21\u7761\u8457\u5F8C\u6253\u547C\u9019\u9EBC\u4E45\u5C31\u5B89\u975C\u4E0B\u4F86\uFF0CZ \u7167\u6A23\u98C4\uFF1B0 = \u4E00\u76F4\u6253\u5230\u9192\u4F86\u3002" },
    speech: { title: "\u8AAA\u8A71\u8072", description: "\u958B\u555F\u5F8C\u6C23\u6CE1\u9010\u5B57\u5192\u51FA\u6642\u5FF5\u51FA\u97F3\u7BC0\uFF0C\u4EE3\u66FF\u300C\u8AAA\u8A71\u300D\u985E\u7684\u5630\u5495\u8072\uFF1B\u300C\u8AAA\u8A71\u300D\u985E\u95DC\u6389\u6642\u4E5F\u4E0D\u51FA\u8072\u3002" },
    speechPitch: { title: "\u8AAA\u8A71\u8072\u97F3\u9AD8", description: (a, b, c) => `low\u3001mid\u3001high \u4F9D\u6B21\u70BA ${a}\u3001${b}\u3001${c} Hz\uFF1Bcustom \u7528\u81EA\u8A02\u97F3\u9AD8\u3002` },
    speechPitchHz: { title: "\u81EA\u8A02\u97F3\u9AD8" },
    speechSpeed: { title: "\u8AAA\u8A71\u8072\u8A9E\u901F", description: (a, b, c) => `\u6BCF\u79D2\u6700\u591A\u5FF5\u5E7E\u500B\u97F3\u7BC0\uFF1Alow\u3001mid\u3001high \u4F9D\u6B21\u70BA ${a}\u3001${b}\u3001${c}\uFF1Bcustom \u7528\u81EA\u8A02\u8A9E\u901F\u3002\u6BD4\u6587\u5B57\u6162\u6642\uFF0C\u8072\u97F3\u5728\u6587\u5B57\u6253\u5B8C\u5F8C\u624D\u5FF5\u5B8C\u3002` },
    speechRate: { title: "\u81EA\u8A02\u8A9E\u901F", suffix: "\u97F3\u7BC0/\u79D2" },
    asrEnabled: { title: "\u8A9E\u97F3\u8F38\u5165\u7E3D\u958B\u95DC" },
    asrEngine: { title: "\u8FA8\u8B58\u5F15\u64CE", description: "funasr \u4F7F\u7528 FunASR \u7684 SenseVoiceSmall\uFF0C\u652F\u63F4\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\u3001\u97D3\u6587\u548C\u7CB5\u8A9E\uFF0C\u7B2C\u4E00\u6B21\u8981\u4E0B\u8F09\u7D04 240 MB \u7684\u6A21\u578B\uFF1Bwhisper \u4F7F\u7528 OpenAI \u7684 Whisper small\uFF0C\u652F\u63F4\u6CD5\u8A9E\u3001\u5FB7\u8A9E\u3001\u897F\u73ED\u7259\u8A9E\u3001\u8461\u8404\u7259\u8A9E\u3001\u7FA9\u5927\u5229\u8A9E\u3001\u4FC4\u8A9E\u7B49\u8FD1\u767E\u7A2E\u8A9E\u8A00\uFF0C\u7B2C\u4E00\u6B21\u8981\u4E0B\u8F09\u7D04 360 MB \u7684\u6A21\u578B\uFF0C\u4E00\u53E5\u8AAA\u5B8C\u624D\u51FA\u5B57\uFF1B\u9019\u5169\u500B\u90FD\u5728\u672C\u6A5F\u8FA8\u8B58\u3002system \u4F7F\u7528 Windows \u5167\u5EFA\u7684\u8A9E\u97F3\u8FA8\u8B58\uFF0C\u4E0D\u7528\u4E0B\u8F09\uFF0C\u6E96\u78BA\u5EA6\u4F4E\u4E00\u4E9B\uFF08\u53EA\u5728 Windows \u4E0A\u6709\uFF09\u3002api \u628A\u6BCF\u53E5\u9304\u97F3\u50B3\u9001\u5230 OpenAI \u76F8\u5BB9\u7684\u8F49\u5BEB\u4ECB\u9762\u8FA8\u8B58\uFF0C\u4E00\u53E5\u8AAA\u5B8C\u624D\u51FA\u5B57\uFF1B\u4F4D\u5740\u548C\u6A21\u578B\u5728\u4E0B\u9762\u586B\u5BEB\uFF0CAPI Key \u5728\u300C\u8A9E\u97F3\u8F38\u5165\u300D\u9801\u586B\u5BEB\u3002\u7559\u7A7A\u6642\u4F9D\u61C9\u7528\u7A0B\u5F0F\u8A9E\u8A00\u9078\u64C7\uFF1A\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\u3001\u97D3\u6587\u7528 funasr\uFF0C\u5176\u9918\u7528 whisper\u3002" },
    asrLanguage: { title: "\u8A9E\u8A00", description: "ISO 639-1 \u8A9E\u8A00\u4EE3\u78BC\uFF0C\u6216 auto \u8B93\u6A21\u578B\u81EA\u5DF1\u5224\u65B7\uFF1B\u7559\u7A7A\u6642\u8DDF\u96A8\u61C9\u7528\u7A0B\u5F0F\u8A9E\u8A00\u3002FunASR \u8A8D\u5F97 zh\u3001en\u3001ja\u3001ko\u3001yue\uFF0CWhisper \u8A8D\u5F97 fr\u3001de\u3001es\u3001pt\u3001it\u3001ru \u7B49\u8FD1\u767E\u7A2E\uFF0C\u4E0D\u8A8D\u5F97\u7684\u4EE3\u78BC\u7576\u4F5C auto\u3002\u8F49\u5BEB\u4ECB\u9762\u53EA\u5728\u4EE3\u78BC\u662F\u5169\u500B\u5B57\u6BCD\u6642\u5E36\u4E0A\u8A9E\u8A00\u3002" },
    asrApiUrl: { title: "\u8F49\u5BEB\u4ECB\u9762\u4F4D\u5740", description: "\u5F15\u64CE\u70BA api \u6642\uFF0C\u6BCF\u53E5\u9304\u97F3\u50B3\u9001\u5230\u9019\u500B\u4F4D\u5740\u5F8C\u9762\u7684 /audio/transcriptions\uFF0C\u4F8B\u5982 https://api.example.com/v1\u3002\u9060\u7AEF\u4F4D\u5740\u53EA\u80FD\u7528 https\uFF0C\u672C\u6A5F\u548C\u5340\u57DF\u7DB2\u8DEF\u7684\u4F4D\u5740\u53EF\u4EE5\u7528 http\u3002" },
    asrApiModel: { title: "\u8F49\u5BEB\u6A21\u578B", description: "\u5F15\u64CE\u70BA api \u6642\u8ACB\u6C42\u88E1\u7684\u6A21\u578B\u540D\u7A31\u3002" },
    asrThreads: { title: "CPU \u57F7\u884C\u7DD2", description: "FunASR \u548C Whisper \u4E00\u6B21\u8FA8\u8B58\u4F7F\u7528\u5E7E\u500B\u57F7\u884C\u7DD2\uFF1B0 = 2\u3002" },
    asrSimplified: { title: "\u8F49\u6210\u7C21\u9AD4", description: "\u61C9\u7528\u7A0B\u5F0F\u8A9E\u8A00\u662F\u7C21\u9AD4\u4E2D\u6587\u6642\uFF0C\u628A\u8FA8\u8B58\u51FA\u7684\u7E41\u9AD4\u5B57\u8F49\u6210\u7C21\u9AD4\u3002" },
    thresholdDb: { title: "\u8AAA\u8A71\u9580\u6ABB" },
    silenceMs: { title: "\u4E00\u53E5\u7D50\u675F\u7684\u975C\u97F3" },
    maxUtteranceMs: { title: "\u4E00\u53E5\u6700\u9577" }
  },
  panel: {
    pet: "\u684C\u5BF5",
    window: "\u684C\u5BF5\u8996\u7A97",
    openWindow: "\u958B\u555F\u8996\u7A97",
    closeWindow: "\u95DC\u9589\u8996\u7A97",
    runtime: "\u8996\u7A97\u57F7\u884C\u74B0\u5883",
    install: "\u5B89\u88DD",
    viewInBrowser: "\u5728\u700F\u89BD\u5668\u4E2D\u67E5\u770B",
    dress: "\u88DD\u626E",
    dressHint: "\u8B8A\u66F4\u6703\u7ACB\u5373\u5132\u5B58\uFF0C\u4E26\u540C\u6B65\u5230\u684C\u5BF5\u8996\u7A97",
    connected: "\u5DF2\u9023\u7DDA",
    starting: "\u555F\u52D5\u4E2D",
    cannotOpen: "\u7121\u6CD5\u958B\u555F",
    notOpen: "\u672A\u958B\u555F",
    external: "\u4F7F\u7528\u5916\u90E8\u7A0B\u5F0F",
    installed: "\u5DF2\u5B89\u88DD",
    downloading: (progress) => `\u4E0B\u8F09\u4E2D ${progress}`,
    installFailed: "\u5B89\u88DD\u5931\u6557",
    notInstalled: "\u672A\u5B89\u88DD",
    noBuild: "\u6B64\u5E73\u53F0\u6C92\u6709\u9810\u5148\u7DE8\u8B6F\u5957\u4EF6",
    electronSize: "Electron 44.4.4\uFF0C\u7D04 150 MB",
    voice: "\u8A9E\u97F3\u8F38\u5165",
    enable: "\u958B\u555F\u8A9E\u97F3\u8F38\u5165",
    enabledHint: "\u9EA5\u514B\u98A8\u4FDD\u6301\u958B\u555F\uFF0C\u4F9D\u6536\u97F3\u65B9\u5F0F\u50B3\u9001\u7D66 Coo",
    enabledHintOnPress: "\u6309\u4F4F\u8AAA\u8A71\u9375\u6642\u958B\u555F\u9EA5\u514B\u98A8\uFF0C\u653E\u958B\u5F8C\u95DC\u9589",
    disabledHint: "\u5DF2\u95DC\u9589\uFF1A\u4E0D\u958B\u555F\u9EA5\u514B\u98A8\uFF0C\u4E0B\u9762\u7684\u8A2D\u5B9A\u66AB\u4E0D\u751F\u6548",
    engine: "\u8FA8\u8B58\u5F15\u64CE",
    funasr: "FunASR\uFF08\u672C\u6A5F\u8FA8\u8B58\uFF09",
    system: "Windows \u5167\u5EFA",
    whisper: "Whisper\uFF08\u672C\u6A5F\u8FA8\u8B58\uFF09",
    systemHint: "\u4E0D\u7528\u4E0B\u8F09\uFF0C\u6E96\u78BA\u5EA6\u666E\u901A\uFF1B\u60F3\u8981\u66F4\u6E96\u8ACB\u63DB\u6210 FunASR \u6216 Whisper",
    funasrHint: "SenseVoiceSmall\uFF0C\u5728\u672C\u6A5F\u8FA8\u8B58\uFF0C\u652F\u63F4\u4E2D\u6587\u3001\u82F1\u6587\u3001\u65E5\u6587\u3001\u97D3\u6587\u548C\u7CB5\u8A9E",
    whisperHint: "Whisper small\uFF0C\u5728\u672C\u6A5F\u8FA8\u8B58\uFF0C\u652F\u63F4\u6CD5\u8A9E\u3001\u5FB7\u8A9E\u3001\u897F\u73ED\u7259\u8A9E\u3001\u8461\u8404\u7259\u8A9E\u3001\u7FA9\u5927\u5229\u8A9E\u3001\u4FC4\u8A9E\u7B49\uFF1B\u4E00\u53E5\u8AAA\u5B8C\u624D\u51FA\u5B57",
    api: "\u8F49\u5BEB\u4ECB\u9762\uFF08OpenAI \u76F8\u5BB9\uFF09",
    apiName: "\u8F49\u5BEB\u4ECB\u9762",
    apiHint: "\u6BCF\u53E5\u9304\u97F3\u50B3\u9001\u5230\u4E0B\u9762\u586B\u5BEB\u7684\u4ECB\u9762\u8FA8\u8B58\uFF0C\u4E00\u53E5\u8AAA\u5B8C\u624D\u51FA\u5B57",
    apiUrl: "\u4ECB\u9762\u4F4D\u5740",
    apiModel: "\u6A21\u578B",
    apiKey: "API Key",
    keySaved: "\u5DF2\u5132\u5B58",
    keyMissing: "\u672A\u586B\u5BEB",
    server: "\u8FA8\u8B58\u670D\u52D9",
    start: "\u555F\u52D5",
    stop: "\u505C\u6B62",
    ready: "\u5C31\u7DD2",
    error: "\u932F\u8AA4",
    stopped: "\u5DF2\u505C\u6B62",
    model: "\u8FA8\u8B58\u6A21\u578B",
    download: "\u4E0B\u8F09",
    retry: "\u91CD\u8A66",
    downloadFailed: "\u4E0B\u8F09\u5931\u6557",
    downloaded: "\u5DF2\u4E0B\u8F09",
    notDownloaded: "\u672A\u4E0B\u8F09",
    modelSource: (size) => `\u7D04 ${size}\uFF0C\u5F9E ModelScope \u4E0B\u8F09`,
    mic: "\u9EA5\u514B\u98A8",
    micStates: { on: "\u6536\u97F3\u4E2D", off: "\u672A\u6536\u97F3", denied: "\u88AB\u62D2\u7D55", error: "\u932F\u8AA4" },
    defaultDevice: "\u7CFB\u7D71\u9810\u8A2D",
    missingDevice: "\u4E4B\u524D\u9078\u7684\u88DD\u7F6E\uFF08\u73FE\u5728\u627E\u4E0D\u5230\uFF09",
    micN: (n) => `\u9EA5\u514B\u98A8 ${n}`,
    mode: "\u6536\u97F3\u65B9\u5F0F",
    modes: { hold: "\u6309\u4F4F\u8AAA\u8A71\u9375\u6642\u6536\u97F3", toggle: "\u7528\u8AAA\u8A71\u9375\u5207\u63DB\u6536\u97F3", always: "\u6301\u7E8C\u6536\u97F3" },
    openOnPress: "\u6309\u4F4F\u6642\u624D\u958B\u555F\u9EA5\u514B\u98A8",
    openOnPressHint: "\u4F7F\u7528\u85CD\u7259\u8033\u6A5F\u7B49\u4E00\u958B\u555F\u9EA5\u514B\u98A8\u5C31\u5207\u5230\u901A\u8A71\u6A21\u5F0F\u7684\u8033\u6A5F\u6642\u958B\u555F\uFF1B\u6309\u4E0B\u5F8C\u7A0D\u7B49\u518D\u8AAA\u8A71\uFF0C\u5426\u5247\u958B\u982D\u7684\u5B57\u53EF\u80FD\u807D\u4E0D\u5230",
    switchOn: "\u5DF2\u958B\u555F",
    switchOff: "\u5DF2\u95DC\u9589",
    presses: {
      2: { hold: "\u6309\u5169\u4E0B\u518D\u6309\u4F4F", toggle: "\u6309\u5169\u4E0B\u958B\u59CB\uFF0C\u518D\u6309\u5169\u4E0B\u505C\u6B62" },
      1: { hold: "\u76F4\u63A5\u6309\u4F4F", toggle: "\u6309\u4E00\u4E0B\u958B\u59CB\uFF0C\u518D\u6309\u4E00\u4E0B\u505C\u6B62" },
      3: { hold: "\u6309\u4E09\u4E0B\u518D\u6309\u4F4F", toggle: "\u6309\u4E09\u4E0B\u958B\u59CB\uFF0C\u518D\u6309\u4E09\u4E0B\u505C\u6B62" }
    },
    capture: "\u6309\u4E0B\u65B0\u7684\u8AAA\u8A71\u9375\uFF0C\u53EF\u4EE5\u662F\u7D44\u5408\u9375\u6216\u6ED1\u9F20\u5074\u9375\u2026\uFF08Esc \u53D6\u6D88\uFF09",
    listening: "\u6B63\u5728\u50BE\u807D",
    waitingKey: "\u7B49\u5F85\u8AAA\u8A71\u9375",
    results: "\u8FA8\u8B58\u7D50\u679C",
    resultsHint: "\u5283\u7DDA\u7684\u9805\u76EE\u904E\u77ED\u6216\u7591\u4F3C\u5E7B\u89BA\uFF0C\u672A\u9001\u51FA",
    talkKeyName: "\u8AAA\u8A71\u9375",
    changeKey: "\u8B8A\u66F4",
    cancelKey: "\u53D6\u6D88",
    level: "\u8F38\u5165\u97F3\u91CF",
    thresholdHint: "\u6BD4\u9019\u689D\u7DDA\u97FF\u7684\u8072\u97F3\u624D\u7B97\u8AAA\u8A71\uFF1B\u5225\u4EBA\u8AAA\u8A71\u548C\u4F60\u4E00\u6A23\u97FF\u6642\u4E5F\u6703\u88AB\u8FA8\u8B58",
    noResults: "\u5C1A\u7121\u8FA8\u8B58\u7D50\u679C"
  },
  chat: {
    badImages: "\u5716\u7247\u683C\u5F0F\u4E0D\u5C0D",
    tooManyImages: (max2) => `\u4E00\u6B21\u6700\u591A ${max2} \u5F35\u5716`,
    badMime: (mime) => `\u4E0D\u652F\u63F4\u7684\u5716\u7247\u683C\u5F0F ${mime}`,
    emptyImage: "\u6709\u4E00\u5F35\u5716\u662F\u7A7A\u7684",
    bigImage: (mb) => `\u55AE\u5F35\u5716\u4E0D\u80FD\u8D85\u904E ${mb} MB`,
    offline: "\u5C1A\u672A\u9023\u7DDA",
    notSent: "\u50B3\u9001\u5931\u6557",
    tooLate: "\u8A72\u8A0A\u606F\u5DF2\u9001\u9054\uFF0C\u7121\u6CD5\u6536\u56DE\u3002"
  }
};
var zh_Hant_default = zhHant;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/ja.ts
var ja = {
  defaultUser: "\u76F8\u68D2",
  menu: {
    quit: "\u7D42\u4E86",
    quitPrompt: (label) => `${label}\u3057\u307E\u3059\u304B\uFF1F`
  },
  busy: "\u4F5C\u696D\u4E2D",
  voice: {
    starting: "\u97F3\u58F0\u8A8D\u8B58\u3092\u8D77\u52D5\u3057\u3066\u3044\u307E\u3059",
    notRunning: "\u97F3\u58F0\u8A8D\u8B58\u304C\u52D5\u4F5C\u3057\u3066\u3044\u307E\u305B\u3093",
    modelMissing: (mb) => `\u97F3\u58F0\u30E2\u30C7\u30EB\u304C\u307E\u3060\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3055\u308C\u3066\u3044\u307E\u305B\u3093\uFF08\u7D04 ${mb} MB\uFF09\uFF1A\u300C\u97F3\u58F0\u5165\u529B\u300D\u30DA\u30FC\u30B8\u3067\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u3066\u304F\u3060\u3055\u3044`,
    badKey: (hotkey) => `\u4E0D\u660E\u306A\u30AD\u30FC\u300C${hotkey}\u300D`,
    keyProblem: (problem) => `\u767A\u8A71\u30AD\u30FC\u304C\u4F7F\u3048\u306A\u3044\u305F\u3081\u3001\u5F53\u9762\u306F\u97F3\u58F0\u3092\u8A8D\u8B58\u3057\u307E\u305B\u3093\uFF1A${problem}`,
    always: "\u5E38\u306B\u805E\u304D\u53D6\u308A\u4E2D\uFF1A\u305D\u306E\u307E\u307E\u8A71\u3057\u3066\u304F\u3060\u3055\u3044",
    toggleTaps: (label, taps) => `${label}\u3068\u805E\u304D\u53D6\u308A\u958B\u59CB\u3001\u3082\u3046\u4E00\u5EA6 ${taps === 2 ? 2 : 3} \u56DE\u62BC\u3059\u3068\u505C\u6B62`,
    toggle: (key) => `${key} \u3092\u62BC\u3059\u3068\u805E\u304D\u53D6\u308A\u958B\u59CB\u3001\u3082\u3046\u4E00\u5EA6\u62BC\u3059\u3068\u505C\u6B62`,
    holdTaps: (key, taps) => `${key} \u3092 ${taps === 2 ? 1 : 2} \u56DE\u62BC\u3057\u3066\u304B\u3089\u62BC\u3057\u305F\u307E\u307E\u8A71\u3057\u3001\u96E2\u3059\u3068\u9001\u4FE1`,
    hold: (key) => `${key} \u3092\u62BC\u3057\u305F\u307E\u307E\u8A71\u3057\u3001\u96E2\u3059\u3068\u9001\u4FE1`,
    failedLine: (error) => `[\u5931\u6557] ${error}`
  },
  keys: {
    LeftCtrl: "\u5DE6 Ctrl",
    RightCtrl: "\u53F3 Ctrl",
    LeftAlt: "\u5DE6 Alt",
    RightAlt: "\u53F3 Alt",
    LeftShift: "\u5DE6 Shift",
    RightShift: "\u53F3 Shift",
    RightWin: "\u53F3 Win",
    Backquote: "`",
    Mouse3: "\u30DE\u30A6\u30B9\u306E\u4E2D\u30DC\u30BF\u30F3",
    Mouse4: "\u30DE\u30A6\u30B9\u30DC\u30BF\u30F3 4",
    Mouse5: "\u30DE\u30A6\u30B9\u30DC\u30BF\u30F3 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "\u5DE6 Control",
    RightCtrl: "\u53F3 Control",
    Alt: "Option",
    LeftAlt: "\u5DE6 Option",
    RightAlt: "\u53F3 Option",
    Win: "Command",
    RightWin: "\u53F3 Command"
  },
  taps: (taps, keys) => `${keys} \u3092 ${taps === 2 ? 2 : 3} \u56DE\u62BC\u3059`,
  hotkey: {
    cannotRead: (why) => `\u30AD\u30FC\u30DC\u30FC\u30C9\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\uFF1A${why}`,
    macNoKey: "Mac \u306E\u30AD\u30FC\u30DC\u30FC\u30C9\u306B\u306F\u3053\u306E\u30AD\u30FC\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u5225\u306E\u767A\u8A71\u30AD\u30FC\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
    macPermission: "\u5165\u529B\u76E3\u8996\u306E\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093\uFF1A\u300C\u30B7\u30B9\u30C6\u30E0\u8A2D\u5B9A \u2192 \u30D7\u30E9\u30A4\u30D0\u30B7\u30FC\u3068\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3 \u2192 \u5165\u529B\u76E3\u8996\u300D\u3067 Coopanion \u3092\u30AA\u30F3\u306B\u3057\u3066\u304B\u3089\u3001\u518D\u8D77\u52D5\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u3059\u3067\u306B\u30AA\u30F3\u306E\u5834\u5408\u306F\u3001\u300C\u2212\u300D\u3067 Coopanion \u3092\u4E00\u89A7\u304B\u3089\u5916\u3057\u3066\u304B\u3089\u8FFD\u52A0\u3057\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\u66F4\u65B0\u5F8C\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u306F\u4EE5\u524D\u306E\u6A29\u9650\u3092\u5F15\u304D\u7D99\u304E\u307E\u305B\u3093",
    linuxNoKey: "Linux \u3067\u306F\u3053\u306E\u30AD\u30FC\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\uFF08\u30DE\u30A6\u30B9\u306E\u30B5\u30A4\u30C9\u30DC\u30BF\u30F3\u306F\u4F7F\u3048\u307E\u305B\u3093\uFF09\u3002\u5225\u306E\u767A\u8A71\u30AD\u30FC\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
    linuxNoDisplay: "Linux \u3067\u767A\u8A71\u30AD\u30FC\u3092\u4F7F\u3046\u306B\u306F X11\uFF08\u307E\u305F\u306F XWayland\uFF09\u304C\u5FC5\u8981\u3067\u3059\uFF1ADISPLAY \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    linuxNoX11: "\u767A\u8A71\u30AD\u30FC\u304C X11 \u30C7\u30A3\u30B9\u30D7\u30EC\u30A4\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093",
    unsupported: "\u767A\u8A71\u30AD\u30FC\u306F Windows\u3001macOS\u3001Linux \u3067\u306E\u307F\u4F7F\u3048\u307E\u3059"
  },
  typeKey: {
    macNoKey: "Mac \u306E\u30AD\u30FC\u30DC\u30FC\u30C9\u306B\u306F\u3053\u306E\u30AD\u30FC\u304C\u3042\u308A\u307E\u305B\u3093\u3002\u5225\u306E\u30BF\u30A4\u30D4\u30F3\u30B0\u30AD\u30FC\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
    linuxNoKey: "Linux \u3067\u306F\u3053\u306E\u30AD\u30FC\u3092\u8AAD\u307F\u53D6\u308C\u307E\u305B\u3093\uFF08\u30DE\u30A6\u30B9\u306E\u30B5\u30A4\u30C9\u30DC\u30BF\u30F3\u306F\u4F7F\u3048\u307E\u305B\u3093\uFF09\u3002\u5225\u306E\u30BF\u30A4\u30D4\u30F3\u30B0\u30AD\u30FC\u3092\u9078\u3093\u3067\u304F\u3060\u3055\u3044",
    linuxNoDisplay: "Linux \u3067\u30BF\u30A4\u30D4\u30F3\u30B0\u30AD\u30FC\u3092\u4F7F\u3046\u306B\u306F X11\uFF08\u307E\u305F\u306F XWayland\uFF09\u304C\u5FC5\u8981\u3067\u3059\uFF1ADISPLAY \u304C\u8A2D\u5B9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    linuxNoX11: "\u30BF\u30A4\u30D4\u30F3\u30B0\u30AD\u30FC\u304C X11 \u30C7\u30A3\u30B9\u30D7\u30EC\u30A4\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093",
    unsupported: "\u30BF\u30A4\u30D4\u30F3\u30B0\u30AD\u30FC\u306F Windows\u3001macOS\u3001Linux \u3067\u306E\u307F\u4F7F\u3048\u307E\u3059"
  },
  system: {
    name: (culture) => culture ? `Windows \u97F3\u58F0\u8A8D\u8B58\uFF08${culture}\uFF09` : "Windows \u97F3\u58F0\u8A8D\u8B58",
    noSpeech: "System.Speech \u30B3\u30F3\u30DD\u30FC\u30CD\u30F3\u30C8\u3092\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093",
    noRecognizer: (language) => `Windows \u306B${language === "auto" ? "" : `\u300C${language}\u300D\u306E`}\u97F3\u58F0\u8A8D\u8B58\u30A8\u30F3\u30B8\u30F3\u304C\u3042\u308A\u307E\u305B\u3093\uFF1AWindows \u306E\u8A2D\u5B9A \u2192 \u6642\u523B\u3068\u8A00\u8A9E \u2192 \u8A00\u8A9E \u3067\u3001\u305D\u306E\u8A00\u8A9E\u306E\u300C\u97F3\u58F0\u8A8D\u8B58\u300D\u3092\u8FFD\u52A0\u3057\u3066\u304F\u3060\u3055\u3044`,
    windowsOnly: "Windows \u97F3\u58F0\u8A8D\u8B58\u306F Windows \u3067\u306E\u307F\u4F7F\u3048\u307E\u3059",
    startFailed: (why) => `\u8D77\u52D5\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A${why}`,
    exited: "\u97F3\u58F0\u8A8D\u8B58\u306E\u30D7\u30ED\u30BB\u30B9\u304C\u7D42\u4E86\u3057\u307E\u3057\u305F",
    exitedCode: (code) => `\u97F3\u58F0\u8A8D\u8B58\u306E\u30D7\u30ED\u30BB\u30B9\u304C\u7D42\u4E86\u3057\u307E\u3057\u305F\uFF08\u7D42\u4E86\u30B3\u30FC\u30C9 ${code}\uFF09`,
    notReady: "Windows \u97F3\u58F0\u8A8D\u8B58\u304C\u6642\u9593\u5185\u306B\u6E96\u5099\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
    notRunning: "Windows \u97F3\u58F0\u8A8D\u8B58\u304C\u52D5\u4F5C\u3057\u3066\u3044\u307E\u305B\u3093",
    timeout: (ms) => `\u8A8D\u8B58\u304C\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8\u3057\u307E\u3057\u305F\uFF08${ms} ms\uFF09`,
    stopped: "Windows \u97F3\u58F0\u8A8D\u8B58\u304C\u505C\u6B62\u3057\u307E\u3057\u305F"
  },
  sherpa: {
    incomplete: "\u97F3\u58F0\u30E2\u30C7\u30EB\u306E\u30D5\u30A1\u30A4\u30EB\u304C\u4E00\u90E8\u8DB3\u308A\u307E\u305B\u3093\uFF1A\u3082\u3046\u4E00\u5EA6\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u3057\u3066\u304F\u3060\u3055\u3044",
    noRuntime: (platform) => `sherpa-onnx \u306B\u306F\u3053\u306E\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\uFF08${platform}\uFF09\u7528\u306E\u30E9\u30F3\u30BF\u30A4\u30E0\u304C\u3042\u308A\u307E\u305B\u3093`,
    loadFailed: (why) => `\u97F3\u58F0\u30E2\u30C7\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF1A${why}`,
    notLoaded: "\u97F3\u58F0\u30E2\u30C7\u30EB\u304C\u8AAD\u307F\u8FBC\u307E\u308C\u3066\u3044\u307E\u305B\u3093"
  },
  /** OpenAI 互換の文字起こし API(エンジン api) */
  transcription: {
    noUrl: "\u6587\u5B57\u8D77\u3053\u3057 API \u306E\u30A2\u30C9\u30EC\u30B9\u304C\u672A\u5165\u529B\u3067\u3059",
    badUrl: (url) => `\u30A2\u30C9\u30EC\u30B9\u304C http \u307E\u305F\u306F https \u306E URL \u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF1A${url}`,
    httpRemote: "\u30EA\u30E2\u30FC\u30C8\u306E\u30A2\u30C9\u30EC\u30B9\u306F https \u306E\u307F\u4F7F\u3048\u307E\u3059\u3002http \u306F\u6697\u53F7\u5316\u3055\u308C\u305A\u3001API Key \u3068\u9332\u97F3\u304C\u5E73\u6587\u3067\u9001\u3089\u308C\u307E\u3059\u3002\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u3084\u30ED\u30FC\u30AB\u30EB\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306E\u30A2\u30C9\u30EC\u30B9\u306F http \u3067\u3082\u304B\u307E\u3044\u307E\u305B\u3093\u3002",
    noModel: "\u6587\u5B57\u8D77\u3053\u3057\u30E2\u30C7\u30EB\u304C\u672A\u5165\u529B\u3067\u3059",
    notRunning: "\u6587\u5B57\u8D77\u3053\u3057 API \u304C\u958B\u59CB\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    status: (status, message) => message ? `HTTP ${status}\uFF1A${message}` : `HTTP ${status}`,
    timeout: (ms) => `API \u304C ${ms} ms \u4EE5\u5185\u306B\u5FDC\u7B54\u3057\u307E\u305B\u3093\u3067\u3057\u305F`,
    network: (why) => `API \u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093\uFF1A${why}`,
    noText: "API \u306E\u5FDC\u7B54\u306B text \u304C\u3042\u308A\u307E\u305B\u3093"
  },
  store: {
    noBuild: (platform) => `${platform} \u7528\u306E\u30D3\u30EB\u30C9\u6E08\u307F\u30D1\u30C3\u30B1\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093`,
    downloading: (file) => `${file} \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D`,
    unpacking: "\u5C55\u958B\u4E2D",
    downloadingModel: "\u97F3\u58F0\u30E2\u30C7\u30EB\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D",
    downloadingFrom: (file, host) => `${file} \u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D\uFF08${host}\uFF09`,
    verifying: (file) => `${file} \u3092\u691C\u8A3C\u4E2D`,
    mismatch: (sum) => `\u30C1\u30A7\u30C3\u30AF\u30B5\u30E0\u304C\u4E00\u81F4\u3057\u307E\u305B\u3093\uFF1A${sum}\u2026`,
    failed: (file, why) => `${file} \u306E\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF08${why}\uFF09`,
    exitCode: (cmd, code, out) => `${cmd} \u7D42\u4E86\u30B3\u30FC\u30C9 ${code}\uFF1A${out}`
  },
  packs: {
    noManifest: (file) => `${file} \u304C\u3042\u308A\u307E\u305B\u3093`,
    badJson: (file, why) => `${file} \u306F\u6709\u52B9\u306A JSON \u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF1A${why}`,
    notInteger: (key, got) => `${key} \u306F\u6574\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\uFF08${got} \u306B\u306A\u3063\u3066\u3044\u307E\u3059\uFF09`,
    tooNew: (key, v, now) => `${key} \u306F ${v} \u3067\u3059\u304C\u3001\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u8AAD\u3081\u308B\u306E\u306F ${now} \u307E\u3067\u3067\u3059\uFF1A\u5148\u306B\u30A2\u30D7\u30EA\u3092\u66F4\u65B0\u3057\u3066\u304F\u3060\u3055\u3044`,
    tooOld: (key, v, oldest) => `${key} ${v} \u306F ${oldest} \u3088\u308A\u524D\u306E\u30C6\u30B9\u30C8\u5F62\u5F0F\u306E\u305F\u3081\u3001\u8AAD\u307F\u8FBC\u3081\u307E\u305B\u3093`,
    badId: (got) => `\u7121\u52B9\u306A id\uFF1A${got}`,
    noName: "name \u304C\u3042\u308A\u307E\u305B\u3093",
    noAbout: "about \u304C\u3042\u308A\u307E\u305B\u3093",
    badEntry: "entry \u307E\u305F\u306F export \u304C\u7121\u52B9\u3067\u3059",
    badModel: "model \u306E\u30D1\u30B9\u304C\u7121\u52B9\u3067\u3059",
    badThumb: "thumb \u306E\u30D1\u30B9\u304C\u7121\u52B9\u3067\u3059",
    badAxis: (got) => `axes \u306B\u7121\u52B9\u306A\u9805\u76EE\u304C\u3042\u308A\u307E\u3059\uFF1A${got}`,
    badOption: (axis, got) => `axes.${axis} \u306B\u7121\u52B9\u306A\u9078\u629E\u80A2\u304C\u3042\u308A\u307E\u3059\uFF1A${got}`,
    badPreset: (got) => `presets \u306B\u7121\u52B9\u306A\u9805\u76EE\u304C\u3042\u308A\u307E\u3059\uFF1A${got}`,
    presetMissing: (preset, axis) => `presets.${preset} \u3067 ${axis} \u306E\u9078\u629E\u80A2\u304C\u9078\u3070\u308C\u3066\u3044\u307E\u305B\u3093`,
    vocabNotArray: "vocab \u306F\u914D\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
    badWordId: (got) => `vocab \u306B\u7121\u52B9\u306A id \u304C\u3042\u308A\u307E\u3059\uFF1A${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind \u306E ${kind} \u306F\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u306F\u4E0D\u660E\u306A\u305F\u3081\u3001\u3053\u306E\u8A9E\u306F\u30DC\u30C3\u30C8\u306B\u6E21\u3055\u308C\u307E\u305B\u3093`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} \u306F\u914D\u5217\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`,
    badWordName: (id, got) => `vocab.${id} \u306B\u7121\u52B9\u306A\u540D\u524D\u304C\u3042\u308A\u307E\u3059\uFF1A${got}`,
    nameTaken: (name) => `vocab \u3067 ${name} \u304C\u8907\u6570\u306E\u8A9E\u306E\u540D\u524D\u306B\u306A\u3063\u3066\u3044\u307E\u3059`,
    noWordAbout: (id) => `vocab.${id}.about \u304C\u3042\u308A\u307E\u305B\u3093`,
    badSeconds: (id) => `vocab.${id}.seconds \u306F\u6B63\u306E\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`,
    soundsNotObject: "sounds \u306F\u30AA\u30D6\u30B8\u30A7\u30AF\u30C8\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059",
    badSoundName: (got) => `sounds \u306B\u7121\u52B9\u306A\u540D\u524D\u304C\u3042\u308A\u307E\u3059\uFF1A${got}`,
    badSoundFile: (name) => `sounds.${name}.file \u306F\u30D1\u30C3\u30AF\u5185\u306E\u30D5\u30A1\u30A4\u30EB\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`,
    badVolume: (name) => `sounds.${name}.volume \u306F 0\u20131 \u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`,
    soundType: (name, file) => `sounds.${name} \u306E ${file} \u306F\u3001\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u518D\u751F\u3067\u304D\u308B .ogg\u3001.mp3\u3001.wav \u3067\u306F\u306A\u3044\u305F\u3081\u3001\u3053\u306E\u97F3\u306F\u9CF4\u308A\u307E\u305B\u3093`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind \u306F ${kind} \u3067\u3059\u304C\u3001\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u304C\u6271\u3048\u308B\u306E\u306F ${kinds.join("\u3001")} \u3060\u3051\u306A\u306E\u3067\u3001\u3053\u306E\u97F3\u306F\u9CF4\u308A\u307E\u305B\u3093`,
    soundMissing: (name, file) => `sounds.${name} \u306E ${file} \u304C\u5B58\u5728\u3057\u306A\u3044\u305F\u3081\u3001\u3053\u306E\u97F3\u306F\u9CF4\u308A\u307E\u305B\u3093`,
    badWalk: (got) => `can.walk \u306E ${got} \u306F\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u306F\u4E0D\u660E\u306A\u305F\u3081\u3001\u6B69\u3051\u308B\u3082\u306E\u3068\u3057\u3066\u6271\u3044\u307E\u3059`,
    movesNotArray: "moves \u306F\u914D\u5217\u3067\u306A\u3051\u308C\u3070\u306A\u308A\u307E\u305B\u3093",
    tooManyMoves: (max2) => `moves \u306F\u6700\u5927 ${max2} \u4EF6\u3067\u3059`,
    badMoveId: (got) => `moves \u306B\u4E0D\u6B63\u306A id \u304C\u3042\u308A\u307E\u3059\uFF1A${got}\uFF08left\u3001center\u3001right\u3001cursor \u3068\u6570\u5024\u306F\u65E2\u5B9A\u306E\u884C\u304D\u5148\u3067\u3059\uFF09`,
    moveTaken: (id) => `moves \u306B ${id} \u304C\u8907\u6570\u3042\u308A\u307E\u3059`,
    noMoveText: (id) => `moves.${id} \u306B name \u304B about \u304C\u3042\u308A\u307E\u305B\u3093`,
    badMoveParams: (id, max2) => `moves.${id}.params \u306F\u6700\u5927 ${max2} \u4EF6\u306E\u914D\u5217\u3067\u3001\u5404\u9805\u76EE\u306B id\u3001about\u3001min \u304C max \u3088\u308A\u5C0F\u3055\u3044\u6570\u5024\u304C\u5FC5\u8981\u3067\u3059`,
    needsNotArray: "needs \u306F\u914D\u5217\u3067\u306A\u3051\u308C\u3070\u306A\u308A\u307E\u305B\u3093",
    unknownNeed: (got) => `needs \u306E ${got} \u306F\u3053\u306E\u30D0\u30FC\u30B8\u30E7\u30F3\u3067\u306F\u63D0\u4F9B\u3055\u308C\u306A\u3044\u305F\u3081\u3001\u7701\u304D\u307E\u3059`,
    idTaken: (id, builtin) => `id ${id} \u306F${builtin ? "\u5185\u8535\u30A2\u30D0\u30BF\u30FC" : "\u307B\u304B\u306E\u30D1\u30C3\u30AF"}\u3067\u4F7F\u308F\u308C\u3066\u3044\u307E\u3059`
  },
  importing: {
    badZip: (why) => `\u8AAD\u307F\u8FBC\u3081\u308B zip \u3067\u306F\u3042\u308A\u307E\u305B\u3093\uFF1A${why}`,
    tooBig: (mb) => `\u5C55\u958B\u5F8C\u306E\u30B5\u30A4\u30BA\u304C ${mb} MB \u3092\u8D85\u3048\u3066\u3044\u307E\u3059`,
    truncated: "\u30A2\u30C3\u30D7\u30ED\u30FC\u30C9\u304C\u4E0D\u5B8C\u5168\u3067\u3059",
    badPath: (path) => `\u4F7F\u3048\u306A\u3044\u30D1\u30B9\u304C\u3042\u308A\u307E\u3059\uFF1A${path}`,
    builtinId: (id) => `id ${id} \u306F\u5185\u8535\u30A2\u30D0\u30BF\u30FC\u306E\u3082\u306E\u3067\u3059\u3002\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B\u306B\u306F id \u3092\u5909\u3048\u3066\u304F\u3060\u3055\u3044`,
    duplicateId: (id) => `id ${id} \u304C\u4ECA\u56DE\u30A4\u30F3\u30DD\u30FC\u30C8\u3059\u308B\u307B\u304B\u306E\u30D1\u30C3\u30AF\u3068\u91CD\u8907\u3057\u3066\u3044\u307E\u3059`,
    unpackFailed: (why) => `\u5C55\u958B\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A${why}`,
    expired: "\u3053\u306E\u30A4\u30F3\u30DD\u30FC\u30C8\u306F\u671F\u9650\u5207\u308C\u3067\u3059\u3002\u30D5\u30A1\u30A4\u30EB\u3092\u9078\u3073\u76F4\u3057\u3066\u304F\u3060\u3055\u3044",
    noneChosen: "\u30D1\u30C3\u30AF\u304C\u9078\u3070\u308C\u3066\u3044\u307E\u305B\u3093",
    zipOrFolder: "\u30A4\u30F3\u30DD\u30FC\u30C8\u3067\u304D\u308B\u306E\u306F zip \u307E\u305F\u306F\u30D5\u30A9\u30EB\u30C0\u30FC\u3060\u3051\u3067\u3059",
    overLimit: (mb) => `${mb} MB \u3092\u8D85\u3048\u3066\u3044\u307E\u3059`
  },
  removing: {
    notInstalled: (id) => `id ${id} \u306E\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u306F\u3042\u308A\u307E\u305B\u3093`,
    builtin: (id) => `${id} \u306F\u5185\u8535\u30A2\u30D0\u30BF\u30FC\u306E\u305F\u3081\u3001\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3067\u304D\u307E\u305B\u3093`,
    elsewhere: (id) => `${id} \u306F\u30A2\u30D0\u30BF\u30FC\u30D1\u30C3\u30AF\u306E\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u5148\u30D5\u30A9\u30EB\u30C0\u30FC\u306B\u306A\u3044\u305F\u3081\u3001\u3053\u3053\u3067\u306F\u30A2\u30F3\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3067\u304D\u307E\u305B\u3093`,
    failed: (why) => `\u524A\u9664\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\uFF1A${why}`
  },
  consent: {
    question: (items) => `\u3053\u3046\u5909\u3048\u3066\u3082\u3044\u3044\u3067\u3059\u304B\uFF1F${items.join("\u3001")}`,
    choices: ["\u3044\u3044\u3088", "\u3053\u308C\u304B\u3089\u306F\u805E\u304B\u306A\u304F\u3066\u3044\u3044\u3088", "\u3084\u3081\u3066\u304A\u304F"],
    list: (items) => items.join("\u3001"),
    pick: (axis, option) => `${axis}\uFF1A${option}`,
    figure: (to) => `${to}\u306E\u59FF\u306B\u3059\u308B`,
    scheme: (figure, look) => `${figure}\u306E\u7740\u305B\u66FF\u3048\u3092\u5909\u3048\u308B\uFF08${look}\uFF09`,
    roam: { free: "\u3088\u304F\u6B69\u304F", calm: "\u3068\u304D\u3069\u304D\u6B69\u304F", off: "\u3058\u3063\u3068\u3059\u308B" },
    roamTo: (to) => `\u6B69\u304D\u56DE\u308A\u3092\u300C${to}\u300D\u306B\u3059\u308B`,
    snore: (seconds) => seconds === 0 ? "\u8D77\u304D\u308B\u307E\u3067\u3044\u3073\u304D\u3092\u304B\u304F" : `\u7720\u308B\u305F\u3073\u306B ${seconds} \u79D2\u3044\u3073\u304D\u3092\u304B\u304F`,
    sound: (on) => on ? "\u30B5\u30A6\u30F3\u30C9\u3092\u30AA\u30F3\u306B\u3059\u308B" : "\u30B5\u30A6\u30F3\u30C9\u3092\u30AA\u30D5\u306B\u3059\u308B",
    scale: (from, to) => `\u30B5\u30A4\u30BA\u3092 ${from} \u500D\u304B\u3089 ${to} \u500D\u306B\u3059\u308B`,
    bubbleSize: (from, to) => `\u5439\u304D\u51FA\u3057\u306E\u30B5\u30A4\u30BA\u3092 ${from} \u500D\u304B\u3089 ${to} \u500D\u306B\u3059\u308B`,
    fontSize: (from, to) => `\u6587\u5B57\u30B5\u30A4\u30BA\u3092 ${from} \u500D\u304B\u3089 ${to} \u500D\u306B\u3059\u308B`,
    theme: { dark: "\u591C\u306E\u898B\u305F\u76EE\u306B\u3059\u308B", light: "\u663C\u306E\u898B\u305F\u76EE\u306B\u3059\u308B" },
    hover: (list) => `\u30DB\u30D0\u30FC\u30DC\u30BF\u30F3\u3092${list}\u306B\u3059\u308B`,
    actions: { chat: "\u5165\u529B", voice: "\u97F3\u58F0\u5165\u529B", roam: "\u6B69\u304D\u56DE\u308A", theme: "\u30CA\u30A4\u30C8\u30E2\u30FC\u30C9", sound: "\u30B5\u30A6\u30F3\u30C9", dress: "\u7740\u305B\u66FF\u3048", hide: "\u30DA\u30C3\u30C8\u3092\u96A0\u3059" },
    user: (to) => `\u3042\u306A\u305F\u3092\u300C${to}\u300D\u3068\u547C\u3076`
  },
  portsTaken: (from, to, why) => `\u30DD\u30FC\u30C8 ${from}\u2013${to} \u306F\u3059\u3079\u3066\u4F7F\u7528\u4E2D\u3067\u3059\uFF1A${why}`,
  console: {
    label: "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u30DA\u30C3\u30C8",
    window: "\u30DA\u30C3\u30C8\u306E\u30A6\u30A3\u30F3\u30C9\u30A6",
    connected: "\u30DA\u30FC\u30B8\u63A5\u7D9A\u6E08\u307F",
    notOpen: "\u958B\u3044\u3066\u3044\u307E\u305B\u3093",
    noBody: (reason) => `\u30DA\u30FC\u30B8\u63A5\u7D9A\u6E08\u307F\u3001\u30A2\u30D0\u30BF\u30FC\u3092\u63CF\u753B\u3067\u304D\u307E\u305B\u3093\uFF1A${reason}`,
    alsoBrowser: (hint) => `${hint}\uFF1B\u30D6\u30E9\u30A6\u30B6\u30FC\u306E\u30DA\u30FC\u30B8\u304C\u63A5\u7D9A\u6E08\u307F`,
    voice: "\u97F3\u58F0\u8A8D\u8B58",
    notStarted: "\u672A\u8D77\u52D5",
    viewInBrowser: "\u30D6\u30E9\u30A6\u30B6\u30FC\u3067\u30DA\u30C3\u30C8\u3092\u898B\u308B",
    dress: "\u7740\u305B\u66FF\u3048",
    panels: {
      pet: { title: "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u30DA\u30C3\u30C8", description: "\u30A6\u30A3\u30F3\u30C9\u30A6\u3001\u7740\u305B\u66FF\u3048\u3001\u30A6\u30A3\u30F3\u30C9\u30A6\u306E\u30E9\u30F3\u30BF\u30A4\u30E0\u3002" },
      voice: { title: "\u97F3\u58F0\u5165\u529B", description: "\u8A8D\u8B58\u30A8\u30F3\u30B8\u30F3\u3001\u5165\u529B\u30EC\u30D9\u30EB\u3001\u805E\u304D\u53D6\u3063\u305F\u5185\u5BB9\u3002" }
    },
    envPrompt: { title: "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u30DA\u30C3\u30C8\u306E\u74B0\u5883", description: "\u30DA\u30C3\u30C8\u306E\u4F53\u30014 \u3064\u306E\u30C4\u30FC\u30EB\u3001\u5165\u529B\u30A4\u30D9\u30F3\u30C8\u306E\u8AAC\u660E\u3002" },
    vars: {
      "pet.user": "\u30DC\u30C3\u30C8\u304C\u30E6\u30FC\u30B6\u30FC\u3092\u547C\u3076\u540D\u524D",
      "pet.vocab": "\u73FE\u5728\u306E\u30A2\u30D0\u30BF\u30FC\u306E\u8868\u60C5\u3068\u52D5\u4F5C",
      "pet.moves": "\u73FE\u5728\u306E\u30A2\u30D0\u30BF\u30FC\u72EC\u81EA\u306E pet_move_to \u306E\u884C\u304D\u5148\u3002\u306A\u3044\u5834\u5408\u306F\u7A7A",
      "pet.voice": "\u97F3\u58F0\u5165\u529B\u306E\u30AA\u30F3\uFF0F\u30AA\u30D5",
      "pet.body": "\u73FE\u5728\u306E\u30A2\u30D0\u30BF\u30FC\u306E\u898B\u305F\u76EE",
      "pet.dress": "pet_set \u3067\u9078\u3079\u308B\u30A2\u30D0\u30BF\u30FC\u3068\u7740\u305B\u66FF\u3048",
      "pet.self": "\u300CCoo \u304C\u8A2D\u5B9A\u3059\u308B\u6A29\u9650\u300D\uFF1A\u76F4\u63A5\u5909\u3048\u308B\u8A2D\u5B9A\u3001\u540C\u610F\u3092\u5F97\u308B\u8A2D\u5B9A\u3001\u307E\u305F\u306F\u4F55\u3082\u5909\u3048\u3089\u308C\u306A\u3044\u3053\u3068",
      "pet.chat": "\u30A2\u30D7\u30EA\u306B\u30C1\u30E3\u30C3\u30C8\u30DA\u30FC\u30B8\u304C\u3042\u308B\u5834\u5408\u306F\u305D\u306E\u8AAC\u660E\u3001\u306A\u3044\u5834\u5408\u306F\u7A7A",
      "pet.reply": "\u30A2\u30D7\u30EA\u306E\u8A00\u8A9E\u304C\u7C21\u4F53\u5B57\u4E2D\u56FD\u8A9E\u3067\u3082\u82F1\u8A9E\u3067\u3082\u306A\u3044\u3068\u304D\u3001\u305D\u306E\u8A00\u8A9E\u3067\u8A71\u3059\u3088\u3046\u30DC\u30C3\u30C8\u306B\u4F1D\u3048\u308B\u4E00\u6587\u3002\u305D\u308C\u4EE5\u5916\u306F\u7A7A",
      "pet.cua": "\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u64CD\u4F5C\u306E\u7BC0\uFF1A\u30B9\u30AF\u30EA\u30FC\u30F3\u30B7\u30E7\u30C3\u30C8\u306E\u5EA7\u6A19\u3001\u5148\u306B\u30E6\u30FC\u30B6\u30FC\u306B\u78BA\u8A8D\u3059\u308B\u30BF\u30A4\u30DF\u30F3\u30B0\u3001\u30E6\u30FC\u30B6\u30FC\u306B\u8B72\u308B\u30EB\u30FC\u30EB\u3002\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u64CD\u4F5C\u304C\u30AA\u30D5\u306E\u3068\u304D\u306F\u7A7A"
    },
    noGuide: "\u3053\u306E\u30A2\u30D7\u30EA\u306B\u306F\u30AC\u30A4\u30C9\u304C\u3042\u308A\u307E\u305B\u3093",
    unknownMethod: (name) => `\u4E0D\u660E\u306A\u30E1\u30BD\u30C3\u30C9 ${name}`
  },
  config: {
    group: "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u30DA\u30C3\u30C8",
    soundGroup: "\u30B5\u30A6\u30F3\u30C9",
    asrGroup: "\u97F3\u58F0\u5165\u529B",
    user: { title: "\u3042\u306A\u305F\u306E\u547C\u3073\u540D", description: (max2) => `\u97F3\u58F0\u3001\u5165\u529B\u3001\u3075\u308C\u3042\u3044\u306E\u30A4\u30D9\u30F3\u30C8\u3067\u3042\u306A\u305F\u3092\u547C\u3076\u540D\u524D\u3002\u6700\u5927 ${max2} \u6587\u5B57\u3002\u7A7A\u6B04\u306A\u3089\u30C7\u30D5\u30A9\u30EB\u30C8\u306E\u547C\u3073\u540D\u3092\u4F7F\u3044\u307E\u3059\u3002` },
    roam: { title: "\u6B69\u304D\u56DE\u308A", description: "free \u306F\u3088\u304F\u6B69\u304D\u56DE\u308A\u3001calm \u306F\u307B\u3068\u3093\u3069\u3058\u3063\u3068\u3057\u3066\u3044\u3066\u3001off \u306F\u983C\u307E\u308C\u305F\u3068\u304D\u3060\u3051\u52D5\u304D\u307E\u3059\u3002" },
    theme: { title: "\u30CA\u30A4\u30C8\u30E2\u30FC\u30C9", description: "dark \u306F\u591C\uFF1A\u660E\u308B\u3044\u4F53\u3068\u6697\u3044\u5439\u304D\u51FA\u3057\u3002light \u306F\u663C\uFF1A\u6697\u3044\u4F53\u3068\u660E\u308B\u3044\u5439\u304D\u51FA\u3057\u3002" },
    rememberPosition: { title: "\u4F4D\u7F6E\u3092\u899A\u3048\u308B", description: "\u30A2\u30D7\u30EA\u7D42\u4E86\u6642\u306B\u30DA\u30C3\u30C8\u304C\u753B\u9762\u306E\u6A2A\u65B9\u5411\u306E\u3069\u3053\u306B\u3044\u305F\u304B\u3092\u4FDD\u5B58\u3057\u3001\u6B21\u56DE\u306F\u305D\u3053\u304B\u3089\u59CB\u3081\u307E\u3059\u3002\u753B\u9762\u304C\u8907\u6570\u3042\u308B\u3068\u304D\u306F\u3001\u5E38\u306B\u30E1\u30A4\u30F3\u753B\u9762\u3067\u8D77\u52D5\u3057\u307E\u3059\u3002" },
    hoverButtons: { title: "\u30DB\u30D0\u30FC\u30DC\u30BF\u30F3", description: (max2, ids) => `\u30DD\u30A4\u30F3\u30BF\u30FC\u3092\u4E57\u305B\u305F\u3068\u304D\u306B\u30DA\u30C3\u30C8\u306E\u6A2A\u306B\u51FA\u308B\u30DC\u30BF\u30F3\u3002\u6700\u5927 ${max2} \u500B\u3001\u30AB\u30F3\u30DE\u533A\u5207\u308A\uFF1A${ids}\u3002` },
    doubleClickChat: { title: "\u30C0\u30D6\u30EB\u30AF\u30EA\u30C3\u30AF\u3067\u5165\u529B", description: "\u30DA\u30C3\u30C8\u3092\u30C0\u30D6\u30EB\u30AF\u30EA\u30C3\u30AF\u3059\u308B\u3068\u5165\u529B\u6B04\u304C\u958B\u304D\u307E\u3059\u3002" },
    statusBubble: { title: "\u30B9\u30C6\u30FC\u30BF\u30B9\u5439\u304D\u51FA\u3057", description: "\u8003\u3048\u3066\u3044\u308B\u3068\u304D\u3001\u8A18\u61B6\u3092\u898B\u3066\u3044\u308B\u3068\u304D\u3001\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u3092\u64CD\u4F5C\u3057\u3066\u3044\u308B\u3068\u304D\u306B\u3001\u30DA\u30C3\u30C8\u304C\u4F55\u3092\u3057\u3066\u3044\u308B\u304B\u3092\u8868\u793A\u3057\u307E\u3059\u3002\u30D5\u30A1\u30A4\u30EB\u540D\u3082\u8868\u793A\u3055\u308C\u307E\u3059\u3002" },
    saidBubbles: { title: "\u5165\u529B\u306E\u5439\u304D\u51FA\u3057", description: "\u5165\u529B\u3001\u97F3\u58F0\u3001\u30C1\u30E3\u30C3\u30C8\u30DA\u30FC\u30B8\u304B\u3089\u9001\u3063\u305F\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u3001\u8FD4\u4E8B\u3092\u3059\u308B\u307E\u3067\u30DA\u30C3\u30C8\u306E\u4E0A\u306B\u8868\u793A\u3057\u307E\u3059\u3002\u30AA\u30D5\u306E\u3068\u304D\u3001\u97F3\u58F0\u306F\u8A8D\u8B58\u4E2D\u3060\u3051\u8868\u793A\u3055\u308C\u307E\u3059\u3002" },
    selfAdjust: { title: "Coo \u304C\u8A2D\u5B9A\u3059\u308B\u6A29\u9650", description: "off \u7981\u6B62\uFF1ACoo \u306F\u8A2D\u5B9A\u3092\u5909\u3048\u3089\u308C\u305A\u3001\u4E00\u6642\u7684\u306B\u9759\u304B\u306B\u3059\u308B\u3053\u3068\u3082\u3067\u304D\u307E\u305B\u3093\u3002default \u6A19\u6E96\uFF1A\u30A2\u30D0\u30BF\u30FC\u3001\u7740\u305B\u66FF\u3048\u3001\u6B69\u304D\u56DE\u308A\u3001\u3044\u3073\u304D\u306F\u76F4\u63A5\u5909\u3048\u3001\u30B5\u30A4\u30BA\u3001\u5439\u304D\u51FA\u3057\u306E\u30B5\u30A4\u30BA\u3001\u6587\u5B57\u30B5\u30A4\u30BA\u3001\u30B5\u30A6\u30F3\u30C9\u3001\u30CA\u30A4\u30C8\u30E2\u30FC\u30C9\u3001\u30DB\u30D0\u30FC\u30DC\u30BF\u30F3\u3001\u547C\u3073\u540D\u306F\u5148\u306B\u3042\u306A\u305F\u306E\u540C\u610F\u3092\u5F97\u307E\u3059\u3002any \u3059\u3079\u3066\uFF1A\u3069\u308C\u3082\u76F4\u63A5\u5909\u3048\u307E\u3059\u3002custom \u30AB\u30B9\u30BF\u30E0\uFF1A\u300C\u3075\u308B\u307E\u3044\u300D\u30DA\u30FC\u30B8\u306E\u30C1\u30A7\u30C3\u30AF\u3069\u304A\u308A\u3067\u3001\u30C1\u30A7\u30C3\u30AF\u3057\u305F\u9805\u76EE\u306F\u76F4\u63A5\u5909\u3048\u3001\u307B\u304B\u306F\u5148\u306B\u540C\u610F\u3092\u5F97\u307E\u3059\u3002" },
    windowEnabled: { title: "\u8D77\u52D5\u6642\u306B\u30DA\u30C3\u30C8\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u958B\u304F" },
    scale: { title: "\u30B5\u30A4\u30BA" },
    bubbleSize: { title: "\u5439\u304D\u51FA\u3057\u306E\u30B5\u30A4\u30BA", description: "\u30DA\u30C3\u30C8\u3068\u3042\u306A\u305F\u306E\u5439\u304D\u51FA\u3057\u306E\u5E45\u3001\u4F59\u767D\u3001\u89D2\u306E\u4E38\u307F\u3001\u3057\u3063\u307D\u30021 \u304C\u6A19\u6E96\u3067\u3001\u6587\u5B57\u306E\u5927\u304D\u3055\u306F\u5909\u308F\u308A\u307E\u305B\u3093\u3002" },
    fontSize: { title: "\u6587\u5B57\u30B5\u30A4\u30BA", description: "\u5439\u304D\u51FA\u3057\u306E\u6587\u5B57\u306E\u5927\u304D\u3055\u30021 \u304C\u6A19\u6E96\u3067\u3001\u5439\u304D\u51FA\u3057\u306E\u5E45\u306F\u5909\u308F\u308A\u307E\u305B\u3093\u3002" },
    bubbleSpeed: { title: "\u5439\u304D\u51FA\u3057\u306E\u901F\u3055", description: "\u30DA\u30C3\u30C8\u306E\u5439\u304D\u51FA\u3057\u306E\u6587\u5B57\u304C\u51FA\u308B\u901F\u3055\u3068\u8868\u793A\u6642\u9593\u30021 \u304C\u6A19\u6E96\u3067\u3001\u5927\u304D\u3044\u307B\u3069\u901F\u304F\u306A\u308A\u307E\u3059\u3002" },
    glow: { title: "\u5916\u5074\u306E\u5149", description: "\u30DA\u30C3\u30C8\u306E\u8272\u304C\u80CC\u666F\u3068\u8FD1\u3044\u3068\u304D\u306B\u4F53\u306E\u307E\u308F\u308A\u306B\u51FA\u308B\u6DE1\u3044\u5149\u304C\u4F55\u30D4\u30AF\u30BB\u30EB\u5E83\u304C\u308B\u304B\u30020 \u3067\u30AA\u30D5\u3002" },
    frameRate: { title: "\u30D5\u30EC\u30FC\u30E0\u30EC\u30FC\u30C8", description: "\u30DA\u30C3\u30C8\u304C\u6B69\u304F\u3001\u904B\u3070\u308C\u308B\u3001\u30B8\u30E3\u30F3\u30D7\u3059\u308B\u3068\u304D\u306E 1 \u79D2\u3042\u305F\u308A\u306E\u30D5\u30EC\u30FC\u30E0\u6570\u30020 \u306F\u30C7\u30A3\u30B9\u30D7\u30EC\u30A4\u306B\u5408\u308F\u305B\u307E\u3059\u3002\u30C7\u30A3\u30B9\u30D7\u30EC\u30A4\u306E\u30EA\u30D5\u30EC\u30C3\u30B7\u30E5\u30EC\u30FC\u30C8\u3092\u8D85\u3048\u308B\u5206\u306F\u30C7\u30A3\u30B9\u30D7\u30EC\u30A4\u306E\u30EC\u30FC\u30C8\u306B\u306A\u308A\u307E\u3059\u3002\u300C\u3075\u308B\u307E\u3044\u300D\u30DA\u30FC\u30B8\u3067\u306F 60\u3001120\u3001144\u3001\u7121\u5236\u9650\u3092\u9078\u3079\u307E\u3059\u3002" },
    lockFrameRate: { title: "\u30D5\u30EC\u30FC\u30E0\u30EC\u30FC\u30C8\u56FA\u5B9A", description: "\u9759\u6B62\u4E2D\u3082\u30D5\u30EC\u30FC\u30E0\u30EC\u30FC\u30C8\u3067\u30DA\u30C3\u30C8\u3092\u63CF\u753B\u3057\u307E\u3059\u3002\u30AA\u30D5\u306E\u3068\u304D\u306F\u3001\u7ACB\u3063\u3066\u3044\u308B\u3001\u5EA7\u3063\u3066\u3044\u308B\u3001\u7720\u3063\u3066\u3044\u308B\u3042\u3044\u3060\u306F 1 \u79D2 30 \u30D5\u30EC\u30FC\u30E0\u306B\u4E0B\u304C\u308A\u307E\u3059\u3002" },
    hideWhenFullscreen: { title: "\u5168\u753B\u9762\u8868\u793A\u4E2D\u306F\u96A0\u308C\u308B", description: "\u30AA\u30F3\u306E\u3068\u304D\u306F\u3001\u624B\u524D\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u304C\u30DA\u30C3\u30C8\u306E\u3044\u308B\u753B\u9762\u3044\u3063\u3071\u3044\u306B\u8868\u793A\u3055\u308C\u3066\u3044\u308B\u3042\u3044\u3060\uFF08\u30B2\u30FC\u30E0\u3001\u5168\u753B\u9762\u306E\u52D5\u753B\u3001\u5168\u753B\u9762\u8868\u793A\u306E\u30D6\u30E9\u30A6\u30B6\u30FC\uFF09\u30DA\u30C3\u30C8\u304C\u96A0\u308C\u3001\u5168\u753B\u9762\u8868\u793A\u304C\u7D42\u308F\u308B\u3068\u623B\u3063\u3066\u304D\u307E\u3059\u3002\u6700\u5927\u5316\u3057\u305F\u30A6\u30A3\u30F3\u30C9\u30A6\u306F\u5BFE\u8C61\u5916\u3067\u3059\u3002\u30AA\u30D5\u306E\u3068\u304D\u306F\u5E38\u306B\u6700\u524D\u9762\u306B\u8868\u793A\u3055\u308C\u307E\u3059\u3002" },
    exportOverlay: { title: "OBS \u30AA\u30FC\u30D0\u30FC\u30EC\u30A4", description: "\u30DA\u30C3\u30C8\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u306E\u753B\u9762\u3092\u900F\u660E\u306A\u80CC\u666F\u3067 /overlay \u306B\u51FA\u3057\u3001OBS \u306E\u300C\u30D6\u30E9\u30A6\u30B6\u300D\u30BD\u30FC\u30B9\u3067\u4F7F\u3048\u308B\u3088\u3046\u306B\u3057\u307E\u3059\u3002\u30AA\u30D5\u306E\u3068\u304D\u306F\u51FA\u3057\u307E\u305B\u3093\u3002" },
    electronFile: { title: "Electron \u5B9F\u884C\u30D5\u30A1\u30A4\u30EB", description: "\u7A7A\u6B04\u306A\u3089 CORTICO_DESKTOP_PET_HOST\u3001\u6B21\u306B\u30D1\u30CD\u30EB\u304B\u3089\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u3057\u305F\u30E9\u30F3\u30BF\u30A4\u30E0\u3092\u4F7F\u3044\u307E\u3059\u3002" },
    port: { title: "\u30DA\u30FC\u30B8\u306E\u30DD\u30FC\u30C8", description: "\u4F7F\u7528\u4E2D\u306E\u3068\u304D\u306F\u6B21\u306E\u7A7A\u304D\u30DD\u30FC\u30C8\u306B\u7E70\u308A\u4E0A\u3052\u307E\u3059\u3002" },
    touchEnabled: { title: "\u3075\u308C\u3042\u3044\u3092\u30A4\u30D9\u30F3\u30C8\u306B\u3059\u308B", description: "\u3064\u3064\u304F\u3001\u306A\u3067\u308B\u3001\u6301\u3061\u4E0A\u3052\u3066\u6295\u3052\u308B\u3002" },
    touchWakeOn: { title: "\u53CD\u5FDC\u30E2\u30FC\u30C9", description: "poke\uFF1A\u3064\u3064\u3044\u305F\u3068\u304D\u3060\u3051\u3059\u3050\u306B\u53CD\u5FDC\u3057\u3001\u307B\u304B\u306E\u3075\u308C\u3042\u3044\u306F\u6B21\u306E\u53CD\u5FDC\u6642\u306B\u307E\u3068\u3081\u3066\u5C4A\u304D\u307E\u3059\u3002all\uFF1A\u3059\u3079\u3066\u306E\u3075\u308C\u3042\u3044\u306B\u3059\u3050\u53CD\u5FDC\u3057\u307E\u3059\u3002none\uFF1A\u3059\u3079\u3066\u306E\u3075\u308C\u3042\u3044\u306F\u6B21\u306E\u53CD\u5FDC\u6642\u306B\u307E\u3068\u3081\u3066\u5C4A\u304D\u307E\u3059\u3002custom\uFF1A\u300C\u3075\u308B\u307E\u3044\u300D\u30DA\u30FC\u30B8\u3067\u30C1\u30A7\u30C3\u30AF\u3057\u305F\u3075\u308C\u3042\u3044\u306B\u3059\u3050\u53CD\u5FDC\u3057\u307E\u3059\u3002\u4E00\u5EA6\u53CD\u5FDC\u3057\u305F\u3042\u3068\u3001\u305D\u306E\u30BF\u30FC\u30F3\u304C\u7D42\u308F\u308B\u307E\u3067\u306E\u3075\u308C\u3042\u3044\u306F\u6B21\u306E\u53CD\u5FDC\u6642\u306B\u307E\u3068\u3081\u3066\u5C4A\u304D\u307E\u3059\u3002" },
    sound: { title: "\u3059\u3079\u3066\u306E\u30B5\u30A6\u30F3\u30C9", description: "\u30DA\u30C3\u30C8\u306E\u30E1\u30CB\u30E5\u30FC\u306E\u30B5\u30A6\u30F3\u30C9\u30DC\u30BF\u30F3\u3067\u3053\u308C\u3092\u5207\u308A\u66FF\u3048\u307E\u3059\u3002" },
    sounds: {
      move: { title: "\u52D5\u304D", description: "\u6B69\u304F\u3001\u8D70\u308B\u3001\u8DF3\u3076\u3001\u7740\u5730\u3001\u6295\u3052\u3089\u308C\u308B\u3001\u3046\u306A\u305A\u304F\u3001\u9996\u3092\u632F\u308B\u3001\u56DE\u308B\u3001\u76EE\u3092\u56DE\u3059\u3001\u9707\u3048\u308B\u3001\u8E0A\u308B\u3001\u898B\u56DE\u3059\u3002" },
      touch: { title: "\u3075\u308C\u3042\u3044", description: "\u6301\u3061\u4E0A\u3052\u3089\u308C\u308B\u3001\u632F\u308A\u56DE\u3055\u308C\u308B\u3001\u306A\u3067\u3089\u308C\u308B\u3001\u3064\u3064\u304B\u308C\u308B\u3002" },
      face: { title: "\u8868\u60C5", description: "\u3046\u308C\u3057\u3044\u3001\u30A6\u30A4\u30F3\u30AF\u3001\u30CF\u30FC\u30C8\u3001\u9A5A\u304D\u3001\u6012\u308A\u3001\u60B2\u3057\u3044\u3001\u7167\u308C\u3001\u3042\u304F\u3073\u3002" },
      snore: { title: "\u3044\u3073\u304D", description: "" },
      talk: { title: "\u304A\u3057\u3083\u3079\u308A", description: "\u5439\u304D\u51FA\u3057\u306E\u6587\u5B57\u304C\u51FA\u308B\u3068\u304D\u306E\u304A\u3057\u3083\u3079\u308A\u97F3\u3068\u3001\u9078\u629E\u30AB\u30FC\u30C9\u304C\u51FA\u308B\u97F3\u3002" },
      ui: { title: "\u30DC\u30BF\u30F3\u3068\u5408\u56F3", description: "\u30DC\u30BF\u30F3\u306E\u30AF\u30EA\u30C3\u30AF\u3001\u5439\u304D\u51FA\u3057\u304C\u958B\u304F\u97F3\u3001\u9078\u629E\u3001\u805E\u304D\u53D6\u308A\u306E\u958B\u59CB\u3068\u7D42\u4E86\u3002" }
    },
    snoreSeconds: { title: "\u3044\u3073\u304D\u306E\u9577\u3055", suffix: "\u79D2", description: "\u7720\u308B\u305F\u3073\u306B\u3001\u3053\u306E\u6642\u9593\u3044\u3073\u304D\u3092\u304B\u3044\u305F\u3042\u3068\u9759\u304B\u306B\u306A\u308A\u307E\u3059\u3002z \u306E\u6587\u5B57\u306F\u6D6E\u304B\u3073\u7D9A\u3051\u307E\u3059\u30020 = \u8D77\u304D\u308B\u307E\u3067\u3044\u3073\u304D\u3092\u304B\u304F\u3002" },
    speech: { title: "\u304A\u3057\u3083\u3079\u308A\u58F0", description: "\u5439\u304D\u51FA\u3057\u306B\u6587\u5B57\u304C\u51FA\u308B\u305F\u3073\u306B\u97F3\u7BC0\u3092\u8AAD\u307F\u4E0A\u3052\u3001\u300C\u304A\u3057\u3083\u3079\u308A\u300D\u306E\u52B9\u679C\u97F3\u306E\u4EE3\u308F\u308A\u306B\u9CF4\u3089\u3057\u307E\u3059\u3002\u300C\u304A\u3057\u3083\u3079\u308A\u300D\u3092\u30AA\u30D5\u306B\u3059\u308B\u3068\u9CF4\u308A\u307E\u305B\u3093\u3002" },
    speechPitch: { title: "\u304A\u3057\u3083\u3079\u308A\u58F0\u306E\u9AD8\u3055", description: (a, b, c) => `low\u3001mid\u3001high \u306F\u305D\u308C\u305E\u308C ${a}\u3001${b}\u3001${c} Hz\u3002custom \u306F\u30AB\u30B9\u30BF\u30E0\u306E\u9AD8\u3055\u3092\u4F7F\u3044\u307E\u3059\u3002` },
    speechPitchHz: { title: "\u30AB\u30B9\u30BF\u30E0\u306E\u9AD8\u3055" },
    speechSpeed: { title: "\u304A\u3057\u3083\u3079\u308A\u58F0\u306E\u901F\u3055", description: (a, b, c) => `1 \u79D2\u306B\u8AAD\u3080\u97F3\u7BC0\u306E\u4E0A\u9650\uFF1Alow\u3001mid\u3001high \u306F\u305D\u308C\u305E\u308C ${a}\u3001${b}\u3001${c}\u3002custom \u306F\u30AB\u30B9\u30BF\u30E0\u306E\u901F\u3055\u3092\u4F7F\u3044\u307E\u3059\u3002\u6587\u5B57\u3088\u308A\u9045\u3044\u3068\u3001\u6587\u5B57\u304C\u51FA\u7D42\u308F\u3063\u3066\u304B\u3089\u8AAD\u307F\u7D42\u3048\u307E\u3059\u3002` },
    speechRate: { title: "\u30AB\u30B9\u30BF\u30E0\u306E\u901F\u3055", suffix: "\u97F3\u7BC0/\u79D2" },
    asrEnabled: { title: "\u97F3\u58F0\u5165\u529B" },
    asrEngine: { title: "\u8A8D\u8B58\u30A8\u30F3\u30B8\u30F3", description: "funasr \u306F FunASR \u306E SenseVoiceSmall \u3092\u52D5\u304B\u3057\u3001\u4E2D\u56FD\u8A9E\u3001\u82F1\u8A9E\u3001\u65E5\u672C\u8A9E\u3001\u97D3\u56FD\u8A9E\u3001\u5E83\u6771\u8A9E\u306B\u5BFE\u5FDC\u3057\u307E\u3059\uFF08\u521D\u56DE\u306E\u307F\u7D04 240 MB \u306E\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u304C\u5FC5\u8981\uFF09\u3002whisper \u306F OpenAI \u306E Whisper small \u3092\u52D5\u304B\u3057\u3001\u30D5\u30E9\u30F3\u30B9\u8A9E\u3001\u30C9\u30A4\u30C4\u8A9E\u3001\u30B9\u30DA\u30A4\u30F3\u8A9E\u3001\u30DD\u30EB\u30C8\u30AC\u30EB\u8A9E\u3001\u30A4\u30BF\u30EA\u30A2\u8A9E\u3001\u30ED\u30B7\u30A2\u8A9E\u306E\u307B\u304B\u7D04 90 \u306E\u8A00\u8A9E\u306B\u5BFE\u5FDC\u3057\uFF08\u521D\u56DE\u306E\u307F\u7D04 360 MB \u306E\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u304C\u5FC5\u8981\uFF09\u3001\u6587\u3092\u8A00\u3044\u7D42\u3048\u3066\u304B\u3089\u6587\u5B57\u304C\u51FA\u307E\u3059\u3002\u3069\u3061\u3089\u3082\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u4E0A\u3067\u8A8D\u8B58\u3057\u307E\u3059\u3002system \u306F Windows \u5185\u8535\u306E\u97F3\u58F0\u8A8D\u8B58\u3092\u4F7F\u3044\u3001\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E0D\u8981\u3067\u3059\u304C\u7CBE\u5EA6\u306F\u4F4E\u3081\u3067\u3059\uFF08Windows \u306E\u307F\uFF09\u3002api \u306F\u6587\u3054\u3068\u306E\u9332\u97F3\u3092 OpenAI \u4E92\u63DB\u306E\u6587\u5B57\u8D77\u3053\u3057 API \u306B\u9001\u3063\u3066\u8A8D\u8B58\u3057\u3001\u6587\u3092\u8A00\u3044\u7D42\u3048\u3066\u304B\u3089\u6587\u5B57\u304C\u51FA\u307E\u3059\u3002\u30A2\u30C9\u30EC\u30B9\u3068\u30E2\u30C7\u30EB\u306F\u4E0B\u3067\u3001API Key \u306F\u300C\u97F3\u58F0\u5165\u529B\u300D\u30DA\u30FC\u30B8\u3067\u5165\u529B\u3057\u307E\u3059\u3002\u7A7A\u6B04\u306A\u3089\u30A2\u30D7\u30EA\u306E\u8A00\u8A9E\u3067\u9078\u3073\u307E\u3059\uFF1A\u4E2D\u56FD\u8A9E\u3001\u82F1\u8A9E\u3001\u65E5\u672C\u8A9E\u3001\u97D3\u56FD\u8A9E\u306F funasr\u3001\u305D\u308C\u4EE5\u5916\u306F whisper\u3002" },
    asrLanguage: { title: "\u8A00\u8A9E", description: "ISO 639-1 \u306E\u8A00\u8A9E\u30B3\u30FC\u30C9\u3001\u307E\u305F\u306F\u30E2\u30C7\u30EB\u306B\u5224\u5B9A\u3055\u305B\u308B auto\u3002\u7A7A\u6B04\u306A\u3089\u30A2\u30D7\u30EA\u306E\u8A00\u8A9E\u306B\u5F93\u3044\u307E\u3059\u3002FunASR \u306F zh\u3001en\u3001ja\u3001ko\u3001yue\u3001Whisper \u306F fr\u3001de\u3001es\u3001pt\u3001it\u3001ru \u306A\u3069\u7D04 100 \u306E\u30B3\u30FC\u30C9\u3092\u53D7\u3051\u4ED8\u3051\u3001\u53D7\u3051\u4ED8\u3051\u306A\u3044\u30B3\u30FC\u30C9\u306F auto \u3068\u3057\u3066\u6271\u3044\u307E\u3059\u3002\u6587\u5B57\u8D77\u3053\u3057 API \u306B\u306F 2 \u6587\u5B57\u306E\u30B3\u30FC\u30C9\u306E\u3068\u304D\u3060\u3051\u8A00\u8A9E\u3092\u4ED8\u3051\u307E\u3059\u3002" },
    asrApiUrl: { title: "\u6587\u5B57\u8D77\u3053\u3057 API \u306E\u30A2\u30C9\u30EC\u30B9", description: "\u30A8\u30F3\u30B8\u30F3\u304C api \u306E\u3068\u304D\u3001\u6587\u3054\u3068\u306E\u9332\u97F3\u3092\u3053\u306E\u30A2\u30C9\u30EC\u30B9\u306E\u5F8C\u308D\u306E /audio/transcriptions \u306B\u9001\u308A\u307E\u3059\uFF08\u4F8B\uFF1Ahttps://api.example.com/v1\uFF09\u3002\u30EA\u30E2\u30FC\u30C8\u306E\u30A2\u30C9\u30EC\u30B9\u306F https \u306E\u307F\u3001\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u3084\u30ED\u30FC\u30AB\u30EB\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF\u306E\u30A2\u30C9\u30EC\u30B9\u306F http \u3067\u3082\u304B\u307E\u3044\u307E\u305B\u3093\u3002" },
    asrApiModel: { title: "\u6587\u5B57\u8D77\u3053\u3057\u30E2\u30C7\u30EB", description: "\u30A8\u30F3\u30B8\u30F3\u304C api \u306E\u3068\u304D\u3001\u30EA\u30AF\u30A8\u30B9\u30C8\u306B\u5165\u308C\u308B\u30E2\u30C7\u30EB\u540D\u3002" },
    asrThreads: { title: "CPU \u30B9\u30EC\u30C3\u30C9", description: "FunASR \u3068 Whisper \u304C 1 \u56DE\u306E\u8A8D\u8B58\u306B\u4F7F\u3046\u30B9\u30EC\u30C3\u30C9\u6570\u30020 = 2\u3002" },
    asrSimplified: { title: "\u7C21\u4F53\u5B57\u306B\u5909\u63DB", description: "\u30A2\u30D7\u30EA\u306E\u8A00\u8A9E\u304C\u7C21\u4F53\u5B57\u4E2D\u56FD\u8A9E\u306E\u3068\u304D\u3001\u805E\u304D\u53D6\u3063\u305F\u5185\u5BB9\u306E\u7E41\u4F53\u5B57\u3092\u7C21\u4F53\u5B57\u306B\u5909\u63DB\u3057\u307E\u3059\u3002" },
    thresholdDb: { title: "\u767A\u8A71\u306E\u3057\u304D\u3044\u5024" },
    silenceMs: { title: "\u6587\u306E\u7D42\u308F\u308A\u3068\u307F\u306A\u3059\u7121\u97F3" },
    maxUtteranceMs: { title: "1 \u6587\u306E\u6700\u9577" }
  },
  panel: {
    pet: "\u30C7\u30B9\u30AF\u30C8\u30C3\u30D7\u30DA\u30C3\u30C8",
    window: "\u30DA\u30C3\u30C8\u306E\u30A6\u30A3\u30F3\u30C9\u30A6",
    openWindow: "\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u958B\u304F",
    closeWindow: "\u30A6\u30A3\u30F3\u30C9\u30A6\u3092\u9589\u3058\u308B",
    runtime: "\u30A6\u30A3\u30F3\u30C9\u30A6\u306E\u30E9\u30F3\u30BF\u30A4\u30E0",
    install: "\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB",
    viewInBrowser: "\u30D6\u30E9\u30A6\u30B6\u30FC\u3067\u898B\u308B",
    dress: "\u7740\u305B\u66FF\u3048",
    dressHint: "\u5909\u66F4\u306F\u3059\u3050\u306B\u4FDD\u5B58\u3055\u308C\u3001\u30DA\u30C3\u30C8\u306E\u30A6\u30A3\u30F3\u30C9\u30A6\u306B\u53CD\u6620\u3055\u308C\u307E\u3059",
    connected: "\u63A5\u7D9A\u6E08\u307F",
    starting: "\u8D77\u52D5\u4E2D",
    cannotOpen: "\u958B\u3051\u307E\u305B\u3093",
    notOpen: "\u958B\u3044\u3066\u3044\u307E\u305B\u3093",
    external: "\u5916\u90E8\u30D7\u30ED\u30B0\u30E9\u30E0\u3092\u4F7F\u7528\u4E2D",
    installed: "\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u6E08\u307F",
    downloading: (progress) => `\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E2D ${progress}`,
    installFailed: "\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    notInstalled: "\u672A\u30A4\u30F3\u30B9\u30C8\u30FC\u30EB",
    noBuild: "\u3053\u306E\u30D7\u30E9\u30C3\u30C8\u30D5\u30A9\u30FC\u30E0\u7528\u306E\u30D3\u30EB\u30C9\u6E08\u307F\u30D1\u30C3\u30B1\u30FC\u30B8\u304C\u3042\u308A\u307E\u305B\u3093",
    electronSize: "Electron 44.4.4\u3001\u7D04 150 MB",
    voice: "\u97F3\u58F0\u5165\u529B",
    enable: "\u97F3\u58F0\u5165\u529B\u3092\u30AA\u30F3\u306B\u3059\u308B",
    enabledHint: "\u30DE\u30A4\u30AF\u306F\u958B\u3044\u305F\u307E\u307E\u3067\u3001\u8A71\u3057\u305F\u5185\u5BB9\u306F\u805E\u304D\u53D6\u308A\u65B9\u306E\u8A2D\u5B9A\u3069\u304A\u308A Coo \u306B\u5C4A\u304D\u307E\u3059",
    enabledHintOnPress: "\u767A\u8A71\u30AD\u30FC\u3092\u62BC\u3057\u3066\u3044\u308B\u9593\u3060\u3051\u30DE\u30A4\u30AF\u3092\u958B\u304D\u3001\u96E2\u3059\u3068\u9589\u3058\u307E\u3059",
    disabledHint: "\u30AA\u30D5\uFF1A\u30DE\u30A4\u30AF\u306F\u9589\u3058\u305F\u307E\u307E\u3067\u3001\u4E0B\u306E\u8A2D\u5B9A\u306F\u4F7F\u308F\u308C\u307E\u305B\u3093",
    engine: "\u8A8D\u8B58\u30A8\u30F3\u30B8\u30F3",
    funasr: "FunASR\uFF08\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u4E0A\uFF09",
    system: "Windows \u5185\u8535",
    whisper: "Whisper\uFF08\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u4E0A\uFF09",
    systemHint: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u4E0D\u8981\u3001\u7CBE\u5EA6\u306F\u305D\u3053\u305D\u3053\u3002\u3088\u308A\u826F\u3044\u7D50\u679C\u306B\u306F FunASR \u304B Whisper \u306B\u5207\u308A\u66FF\u3048\u3066\u304F\u3060\u3055\u3044",
    funasrHint: "\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u4E0A\u306E SenseVoiceSmall\u3002\u4E2D\u56FD\u8A9E\u3001\u82F1\u8A9E\u3001\u65E5\u672C\u8A9E\u3001\u97D3\u56FD\u8A9E\u3001\u5E83\u6771\u8A9E\u306B\u5BFE\u5FDC",
    whisperHint: "\u3053\u306E\u30B3\u30F3\u30D4\u30E5\u30FC\u30BF\u30FC\u4E0A\u306E Whisper small\u3002\u30D5\u30E9\u30F3\u30B9\u8A9E\u3001\u30C9\u30A4\u30C4\u8A9E\u3001\u30B9\u30DA\u30A4\u30F3\u8A9E\u3001\u30DD\u30EB\u30C8\u30AC\u30EB\u8A9E\u3001\u30A4\u30BF\u30EA\u30A2\u8A9E\u3001\u30ED\u30B7\u30A2\u8A9E\u306A\u3069\u306B\u5BFE\u5FDC\u3002\u6587\u3092\u8A00\u3044\u7D42\u3048\u3066\u304B\u3089\u6587\u5B57\u304C\u51FA\u307E\u3059",
    api: "\u6587\u5B57\u8D77\u3053\u3057 API\uFF08OpenAI \u4E92\u63DB\uFF09",
    apiName: "\u6587\u5B57\u8D77\u3053\u3057 API",
    apiHint: "\u6587\u3054\u3068\u306E\u9332\u97F3\u3092\u4E0B\u3067\u5165\u529B\u3057\u305F API \u306B\u9001\u3063\u3066\u8A8D\u8B58\u3057\u307E\u3059\u3002\u6587\u3092\u8A00\u3044\u7D42\u3048\u3066\u304B\u3089\u6587\u5B57\u304C\u51FA\u307E\u3059",
    apiUrl: "\u30A2\u30C9\u30EC\u30B9",
    apiModel: "\u30E2\u30C7\u30EB",
    apiKey: "API Key",
    keySaved: "\u4FDD\u5B58\u6E08\u307F",
    keyMissing: "\u672A\u5165\u529B",
    server: "\u8A8D\u8B58\u30B5\u30FC\u30D3\u30B9",
    start: "\u958B\u59CB",
    stop: "\u505C\u6B62",
    ready: "\u6E96\u5099\u5B8C\u4E86",
    error: "\u30A8\u30E9\u30FC",
    stopped: "\u505C\u6B62\u4E2D",
    model: "\u97F3\u58F0\u30E2\u30C7\u30EB",
    download: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
    retry: "\u518D\u8A66\u884C",
    downloadFailed: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F",
    downloaded: "\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9\u6E08\u307F",
    notDownloaded: "\u672A\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9",
    modelSource: (size) => `\u7D04 ${size}\u3001ModelScope \u304B\u3089\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9`,
    mic: "\u30DE\u30A4\u30AF",
    micStates: { on: "\u805E\u304D\u53D6\u308A\u4E2D", off: "\u805E\u304D\u53D6\u3063\u3066\u3044\u307E\u305B\u3093", denied: "\u62D2\u5426\u3055\u308C\u307E\u3057\u305F", error: "\u30A8\u30E9\u30FC" },
    defaultDevice: "\u30B7\u30B9\u30C6\u30E0\u306E\u65E2\u5B9A",
    missingDevice: "\u4EE5\u524D\u306B\u9078\u3093\u3060\u30C7\u30D0\u30A4\u30B9\uFF08\u73FE\u5728\u898B\u3064\u304B\u308A\u307E\u305B\u3093\uFF09",
    micN: (n) => `\u30DE\u30A4\u30AF ${n}`,
    mode: "\u805E\u304D\u53D6\u308A\u65B9",
    modes: { hold: "\u767A\u8A71\u30AD\u30FC\u3092\u62BC\u3057\u3066\u3044\u308B\u3042\u3044\u3060", toggle: "\u767A\u8A71\u30AD\u30FC\u3067\u30AA\u30F3\uFF0F\u30AA\u30D5", always: "\u5E38\u306B" },
    openOnPress: "\u62BC\u3057\u3066\u3044\u308B\u9593\u3060\u3051\u30DE\u30A4\u30AF\u3092\u958B\u304F",
    openOnPressHint: "\u30DE\u30A4\u30AF\u3092\u958B\u304F\u3068\u901A\u8A71\u30E2\u30FC\u30C9\u306B\u5207\u308A\u66FF\u308F\u308B Bluetooth \u30A4\u30E4\u30DB\u30F3\u306A\u3069\u5411\u3051\u3067\u3001\u62BC\u3057\u3066\u304B\u3089\u5C11\u3057\u5F85\u3063\u3066\u8A71\u3055\u306A\u3044\u3068\u6700\u521D\u306E\u8A00\u8449\u304C\u5165\u3089\u306A\u3044\u3053\u3068\u304C\u3042\u308A\u307E\u3059",
    switchOn: "\u30AA\u30F3",
    switchOff: "\u30AA\u30D5",
    presses: {
      2: { hold: "2 \u56DE\u62BC\u3057\u3066\u304B\u3089\u9577\u62BC\u3057", toggle: "2 \u56DE\u62BC\u3057\u3066\u958B\u59CB\u3001\u3082\u3046\u4E00\u5EA6 2 \u56DE\u62BC\u3057\u3066\u505C\u6B62" },
      1: { hold: "\u305D\u306E\u307E\u307E\u9577\u62BC\u3057", toggle: "\u62BC\u3057\u3066\u958B\u59CB\u3001\u3082\u3046\u4E00\u5EA6\u62BC\u3057\u3066\u505C\u6B62" },
      3: { hold: "3 \u56DE\u62BC\u3057\u3066\u304B\u3089\u9577\u62BC\u3057", toggle: "3 \u56DE\u62BC\u3057\u3066\u958B\u59CB\u3001\u3082\u3046\u4E00\u5EA6 3 \u56DE\u62BC\u3057\u3066\u505C\u6B62" }
    },
    capture: "\u65B0\u3057\u3044\u767A\u8A71\u30AD\u30FC\u3092\u62BC\u3057\u3066\u304F\u3060\u3055\u3044\uFF1A\u30AD\u30FC\u306E\u7D44\u307F\u5408\u308F\u305B\u3001\u307E\u305F\u306F\u30DE\u30A6\u30B9\u306E\u30B5\u30A4\u30C9\u30DC\u30BF\u30F3\u2026\uFF08Esc \u3067\u30AD\u30E3\u30F3\u30BB\u30EB\uFF09",
    listening: "\u805E\u304D\u53D6\u308A\u4E2D",
    waitingKey: "\u767A\u8A71\u30AD\u30FC\u5F85\u3061",
    results: "\u805E\u304D\u53D6\u3063\u305F\u5185\u5BB9",
    resultsHint: "\u53D6\u308A\u6D88\u3057\u7DDA\u306E\u884C\u306F\u77ED\u3059\u304E\u308B\u304B\u5E7B\u899A\u306E\u53EF\u80FD\u6027\u304C\u9AD8\u3044\u305F\u3081\u3001\u9001\u4FE1\u3055\u308C\u307E\u305B\u3093\u3067\u3057\u305F",
    talkKeyName: "\u767A\u8A71\u30AD\u30FC",
    changeKey: "\u5909\u66F4",
    cancelKey: "\u30AD\u30E3\u30F3\u30BB\u30EB",
    level: "\u5165\u529B\u97F3\u91CF",
    thresholdHint: "\u3053\u306E\u7DDA\u3088\u308A\u5927\u304D\u3044\u97F3\u3060\u3051\u3092\u767A\u8A71\u3068\u3057\u3066\u6271\u3044\u307E\u3059\u3002\u307B\u304B\u306E\u4EBA\u304C\u3042\u306A\u305F\u3068\u540C\u3058\u304F\u3089\u3044\u306E\u58F0\u3067\u8A71\u3059\u3068\u3001\u305D\u308C\u3082\u8A8D\u8B58\u3055\u308C\u307E\u3059",
    noResults: "\u307E\u3060\u8A8D\u8B58\u7D50\u679C\u306F\u3042\u308A\u307E\u305B\u3093"
  },
  chat: {
    badImages: "\u753B\u50CF\u304C\u3053\u306E\u30DA\u30FC\u30B8\u3067\u9001\u308C\u308B\u5F62\u5F0F\u3067\u306F\u3042\u308A\u307E\u305B\u3093",
    tooManyImages: (max2) => `\u4E00\u5EA6\u306B\u9001\u308C\u308B\u753B\u50CF\u306F ${max2} \u679A\u307E\u3067\u3067\u3059`,
    badMime: (mime) => `\u5BFE\u5FDC\u3057\u3066\u3044\u306A\u3044\u753B\u50CF\u5F62\u5F0F ${mime}`,
    emptyImage: "\u7A7A\u306E\u753B\u50CF\u304C\u3042\u308A\u307E\u3059",
    bigImage: (mb) => `\u753B\u50CF\u306F 1 \u679A ${mb} MB \u672A\u6E80\u306B\u3057\u3066\u304F\u3060\u3055\u3044`,
    offline: "\u307E\u3060\u63A5\u7D9A\u3055\u308C\u3066\u3044\u307E\u305B\u3093",
    notSent: "\u9001\u4FE1\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F",
    tooLate: "\u305D\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u306F\u3082\u3046\u5C4A\u3044\u3066\u3044\u308B\u305F\u3081\u3001\u53D6\u308A\u6D88\u305B\u307E\u305B\u3093\u3002"
  }
};
var ja_default = ja;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/ko.ts
var ko = {
  defaultUser: "\uC9DD\uAFCD",
  menu: {
    quit: "\uC885\uB8CC",
    quitPrompt: (label) => `${label}?`
  },
  busy: "\uC791\uC5C5 \uC911",
  voice: {
    starting: "\uC74C\uC131 \uC778\uC2DD\uC744 \uC2DC\uC791\uD558\uB294 \uC911",
    notRunning: "\uC74C\uC131 \uC778\uC2DD\uC774 \uC2E4\uD589\uB418\uACE0 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    modelMissing: (mb) => `\uC74C\uC131 \uBAA8\uB378\uC744 \uC544\uC9C1 \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4(\uC57D ${mb} MB). \uC74C\uC131 \uC785\uB825 \uD398\uC774\uC9C0\uC5D0\uC11C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC138\uC694`,
    badKey: (hotkey) => `\uC54C \uC218 \uC5C6\uB294 \uD0A4 "${hotkey}"`,
    keyProblem: (problem) => `\uB9D0\uD558\uAE30 \uD0A4\uB97C \uC4F8 \uC218 \uC5C6\uC5B4 \uB2F9\uBD84\uAC04 \uC74C\uC131\uC744 \uC778\uC2DD\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4: ${problem}`,
    always: "\uD56D\uC0C1 \uB4E3\uB294 \uC911: \uADF8\uB0E5 \uB9D0\uD558\uC138\uC694",
    toggleTaps: (label, taps) => `${label} \uB20C\uB7EC \uB4E3\uAE30 \uC2DC\uC791, \uB2E4\uC2DC ${taps === 2 ? "\uB450" : "\uC138"} \uBC88 \uB204\uB974\uBA74 \uBA48\uCDA5\uB2C8\uB2E4`,
    toggle: (key) => `${key}\uC744(\uB97C) \uB204\uB974\uBA74 \uB4E3\uAE30 \uC2DC\uC791, \uB2E4\uC2DC \uB204\uB974\uBA74 \uBA48\uCDA5\uB2C8\uB2E4`,
    holdTaps: (key, taps) => `${key}\uC744(\uB97C) ${taps === 2 ? "\uD55C" : "\uB450"} \uBC88 \uC9E7\uAC8C \uB204\uB978 \uB4A4 \uBC14\uB85C \uB204\uB978 \uCC44\uB85C \uB9D0\uD558\uC138\uC694. \uB5BC\uBA74 \uBCF4\uB0C5\uB2C8\uB2E4`,
    hold: (key) => `${key}\uC744(\uB97C) \uB204\uB978 \uCC44\uB85C \uB9D0\uD558\uC138\uC694. \uB5BC\uBA74 \uBCF4\uB0C5\uB2C8\uB2E4`,
    failedLine: (error) => `[\uC2E4\uD328] ${error}`
  },
  keys: {
    LeftCtrl: "\uC67C\uCABD Ctrl",
    RightCtrl: "\uC624\uB978\uCABD Ctrl",
    LeftAlt: "\uC67C\uCABD Alt",
    RightAlt: "\uC624\uB978\uCABD Alt",
    LeftShift: "\uC67C\uCABD Shift",
    RightShift: "\uC624\uB978\uCABD Shift",
    RightWin: "\uC624\uB978\uCABD Win",
    Backquote: "`",
    Mouse3: "\uB9C8\uC6B0\uC2A4 \uAC00\uC6B4\uB370 \uBC84\uD2BC",
    Mouse4: "\uB9C8\uC6B0\uC2A4 \uBC84\uD2BC 4",
    Mouse5: "\uB9C8\uC6B0\uC2A4 \uBC84\uD2BC 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "\uC67C\uCABD Control",
    RightCtrl: "\uC624\uB978\uCABD Control",
    Alt: "Option",
    LeftAlt: "\uC67C\uCABD Option",
    RightAlt: "\uC624\uB978\uCABD Option",
    Win: "Command",
    RightWin: "\uC624\uB978\uCABD Command"
  },
  taps: (taps, keys) => `${keys} ${taps === 2 ? "\uB450" : "\uC138"} \uBC88`,
  hotkey: {
    cannotRead: (why) => `\uD0A4\uBCF4\uB4DC\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${why}`,
    macNoKey: "Mac \uD0A4\uBCF4\uB4DC\uC5D0\uB294 \uC774 \uD0A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uB9D0\uD558\uAE30 \uD0A4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    macPermission: '\uC785\uB825 \uBAA8\uB2C8\uD130\uB9C1 \uAD8C\uD55C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2DC\uC2A4\uD15C \uC124\uC815 \u2192 \uAC1C\uC778\uC815\uBCF4 \uBCF4\uD638 \uBC0F \uBCF4\uC548 \u2192 \uC785\uB825 \uBAA8\uB2C8\uD130\uB9C1\uC5D0\uC11C Coopanion\uC744 \uCF20 \uB4A4 \uB2E4\uC2DC \uC2DC\uC791\uD558\uC138\uC694. \uC774\uBBF8 \uCF1C\uC838 \uC788\uB2E4\uBA74 "\u2212"\uB85C \uBAA9\uB85D\uC5D0\uC11C Coopanion\uC744 \uC81C\uAC70\uD55C \uB4A4 \uB2E4\uC2DC \uCD94\uAC00\uD558\uC138\uC694. \uC5C5\uB370\uC774\uD2B8\uB41C \uBC84\uC804\uC740 \uC774\uC804 \uAD8C\uD55C\uC744 \uC774\uC5B4\uBC1B\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4',
    linuxNoKey: "Linux\uC5D0\uC11C\uB294 \uC774 \uD0A4\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4(\uB9C8\uC6B0\uC2A4 \uCE21\uBA74 \uBC84\uD2BC\uC740 \uC791\uB3D9\uD558\uC9C0 \uC54A\uC74C). \uB2E4\uB978 \uB9D0\uD558\uAE30 \uD0A4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    linuxNoDisplay: "\uB9D0\uD558\uAE30 \uD0A4\uB97C Linux\uC5D0\uC11C \uC4F0\uB824\uBA74 X11(\uB610\uB294 XWayland)\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. DISPLAY\uAC00 \uC124\uC815\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    linuxNoX11: "\uB9D0\uD558\uAE30 \uD0A4\uAC00 X11 \uB514\uC2A4\uD50C\uB808\uC774\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    unsupported: "\uB9D0\uD558\uAE30 \uD0A4\uB294 Windows, macOS, Linux\uC5D0\uC11C\uB9CC \uC791\uB3D9\uD569\uB2C8\uB2E4"
  },
  typeKey: {
    macNoKey: "Mac \uD0A4\uBCF4\uB4DC\uC5D0\uB294 \uC774 \uD0A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uC785\uB825 \uD0A4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    linuxNoKey: "Linux\uC5D0\uC11C\uB294 \uC774 \uD0A4\uB97C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4(\uB9C8\uC6B0\uC2A4 \uCE21\uBA74 \uBC84\uD2BC\uC740 \uC791\uB3D9\uD558\uC9C0 \uC54A\uC74C). \uB2E4\uB978 \uC785\uB825 \uD0A4\uB97C \uC120\uD0DD\uD558\uC138\uC694",
    linuxNoDisplay: "\uC785\uB825 \uD0A4\uB97C Linux\uC5D0\uC11C \uC4F0\uB824\uBA74 X11(\uB610\uB294 XWayland)\uC774 \uD544\uC694\uD569\uB2C8\uB2E4. DISPLAY\uAC00 \uC124\uC815\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    linuxNoX11: "\uC785\uB825 \uD0A4\uAC00 X11 \uB514\uC2A4\uD50C\uB808\uC774\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    unsupported: "\uC785\uB825 \uD0A4\uB294 Windows, macOS, Linux\uC5D0\uC11C\uB9CC \uC791\uB3D9\uD569\uB2C8\uB2E4"
  },
  system: {
    name: (culture) => culture ? `Windows \uC74C\uC131 \uC778\uC2DD(${culture})` : "Windows \uC74C\uC131 \uC778\uC2DD",
    noSpeech: "System.Speech \uAD6C\uC131 \uC694\uC18C\uB97C \uBD88\uB7EC\uC62C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4",
    noRecognizer: (language) => `Windows\uC5D0 ${language === "auto" ? "" : `"${language}"\uC6A9 `}\uC74C\uC131 \uC778\uC2DD\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. Windows \uC124\uC815 \u2192 \uC2DC\uAC04 \uBC0F \uC5B8\uC5B4 \u2192 \uC5B8\uC5B4\uC5D0\uC11C \uD574\uB2F9 \uC5B8\uC5B4\uC758 \uC74C\uC131 \uC778\uC2DD\uC744 \uCD94\uAC00\uD558\uC138\uC694`,
    windowsOnly: "Windows \uC74C\uC131 \uC778\uC2DD\uC740 Windows\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4",
    startFailed: (why) => `\uC2DC\uC791\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${why}`,
    exited: "\uC74C\uC131 \uC778\uC2DD \uD504\uB85C\uC138\uC2A4\uAC00 \uC885\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    exitedCode: (code) => `\uC74C\uC131 \uC778\uC2DD \uD504\uB85C\uC138\uC2A4\uAC00 \uC885\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4(\uC885\uB8CC \uCF54\uB4DC ${code})`,
    notReady: "Windows \uC74C\uC131 \uC778\uC2DD\uC774 \uC81C\uC2DC\uAC04\uC5D0 \uC900\uBE44\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    notRunning: "Windows \uC74C\uC131 \uC778\uC2DD\uC774 \uC2E4\uD589\uB418\uACE0 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    timeout: (ms) => `\uC778\uC2DD \uC2DC\uAC04\uC774 \uCD08\uACFC\uB418\uC5C8\uC2B5\uB2C8\uB2E4(${ms}ms)`,
    stopped: "Windows \uC74C\uC131 \uC778\uC2DD\uC774 \uC911\uC9C0\uB418\uC5C8\uC2B5\uB2C8\uB2E4"
  },
  sherpa: {
    incomplete: "\uC74C\uC131 \uBAA8\uB378 \uD30C\uC77C \uC77C\uBD80\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC138\uC694",
    noRuntime: (platform) => `sherpa-onnx\uC5D0\uB294 \uC774 \uD50C\uB7AB\uD3FC(${platform})\uC6A9 \uB7F0\uD0C0\uC784\uC774 \uC5C6\uC2B5\uB2C8\uB2E4`,
    loadFailed: (why) => `\uC74C\uC131 \uBAA8\uB378\uC744 \uBD88\uB7EC\uC624\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${why}`,
    notLoaded: "\uC74C\uC131 \uBAA8\uB378\uC744 \uBD88\uB7EC\uC624\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4"
  },
  /** OpenAI 호환 전사 API(엔진 api) */
  transcription: {
    noUrl: "\uC804\uC0AC API \uC8FC\uC18C\uB97C \uC785\uB825\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    badUrl: (url) => `\uC8FC\uC18C\uAC00 http \uB610\uB294 https URL\uC774 \uC544\uB2D9\uB2C8\uB2E4: ${url}`,
    httpRemote: "\uC6D0\uACA9 \uC8FC\uC18C\uB294 https\uB9CC \uC4F8 \uC218 \uC788\uC2B5\uB2C8\uB2E4. http\uB294 \uC554\uD638\uD654\uB418\uC9C0 \uC54A\uC544 API Key\uC640 \uB179\uC74C\uC774 \uD3C9\uBB38\uC73C\uB85C \uC804\uC1A1\uB429\uB2C8\uB2E4. \uC774 \uCEF4\uD4E8\uD130\uB098 \uB85C\uCEEC \uB124\uD2B8\uC6CC\uD06C\uC758 \uC8FC\uC18C\uB294 http\uB97C \uC368\uB3C4 \uB429\uB2C8\uB2E4.",
    noModel: "\uC804\uC0AC \uBAA8\uB378\uC744 \uC785\uB825\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    notRunning: "\uC804\uC0AC API\uAC00 \uC2DC\uC791\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `API\uAC00 ${ms} ms \uC548\uC5D0 \uC751\uB2F5\uD558\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4`,
    network: (why) => `API\uC5D0 \uC5F0\uACB0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4: ${why}`,
    noText: "API \uC751\uB2F5\uC5D0 text\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"
  },
  store: {
    noBuild: (platform) => `${platform}\uC6A9 \uC0AC\uC804 \uBE4C\uB4DC \uD328\uD0A4\uC9C0\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4`,
    downloading: (file) => `${file} \uB2E4\uC6B4\uB85C\uB4DC \uC911`,
    unpacking: "\uC555\uCD95 \uD574\uC81C \uC911",
    downloadingModel: "\uC74C\uC131 \uBAA8\uB378 \uB2E4\uC6B4\uB85C\uB4DC \uC911",
    downloadingFrom: (file, host) => `${file} \uB2E4\uC6B4\uB85C\uB4DC \uC911(${host})`,
    verifying: (file) => `${file} \uAC80\uC99D \uC911`,
    mismatch: (sum) => `\uCCB4\uD06C\uC12C \uBD88\uC77C\uCE58: ${sum}\u2026`,
    failed: (file, why) => `${file}\uC744(\uB97C) \uB2E4\uC6B4\uB85C\uB4DC\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4(${why})`,
    exitCode: (cmd, code, out) => `${cmd} \uC885\uB8CC \uCF54\uB4DC ${code}: ${out}`
  },
  packs: {
    noManifest: (file) => `${file}\uC774(\uAC00) \uC5C6\uC2B5\uB2C8\uB2E4`,
    badJson: (file, why) => `${file}\uC740(\uB294) \uC62C\uBC14\uB978 JSON\uC774 \uC544\uB2D9\uB2C8\uB2E4: ${why}`,
    notInteger: (key, got) => `${key}\uC740(\uB294) \uC815\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4. \uD604\uC7AC \uAC12: ${got}`,
    tooNew: (key, v, now) => `${key}\uC774(\uAC00) ${v}\uC785\uB2C8\uB2E4. \uC774 \uBC84\uC804\uC740 ${now}\uAE4C\uC9C0\uB9CC \uC77D\uC744 \uC218 \uC788\uC73C\uB2C8 \uBA3C\uC800 \uC571\uC744 \uC5C5\uB370\uC774\uD2B8\uD558\uC138\uC694`,
    tooOld: (key, v, oldest) => `${key} ${v}\uC740(\uB294) ${oldest} \uC774\uC804\uC758 \uD14C\uC2A4\uD2B8 \uD615\uC2DD\uC774\uB77C \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4`,
    badId: (got) => `\uC798\uBABB\uB41C id: ${got}`,
    noName: "name\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    noAbout: "about\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    badEntry: "entry \uB610\uB294 export\uAC00 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    badModel: "model \uACBD\uB85C\uAC00 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    badThumb: "thumb \uACBD\uB85C\uAC00 \uC798\uBABB\uB418\uC5C8\uC2B5\uB2C8\uB2E4",
    badAxis: (got) => `axes\uC5D0 \uC798\uBABB\uB41C \uD56D\uBAA9\uC774 \uC788\uC2B5\uB2C8\uB2E4: ${got}`,
    badOption: (axis, got) => `axes.${axis}\uC5D0 \uC798\uBABB\uB41C \uC635\uC158\uC774 \uC788\uC2B5\uB2C8\uB2E4: ${got}`,
    badPreset: (got) => `presets\uC5D0 \uC798\uBABB\uB41C \uD56D\uBAA9\uC774 \uC788\uC2B5\uB2C8\uB2E4: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset}\uC5D0 ${axis}\uC758 \uC635\uC158\uC774 \uC120\uD0DD\uB418\uC5B4 \uC788\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4`,
    vocabNotArray: "vocab\uC740 \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4",
    badWordId: (got) => `vocab\uC5D0 \uC798\uBABB\uB41C id\uAC00 \uC788\uC2B5\uB2C8\uB2E4: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind\uAC00 ${kind}\uC778\uB370 \uC774 \uBC84\uC804\uC740 \uC54C\uC9C0 \uBABB\uD558\uBBC0\uB85C \uBD07\uC5D0\uAC8C \uC774 \uB2E8\uC5B4\uB97C \uC8FC\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang}\uC740(\uB294) \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`,
    badWordName: (id, got) => `vocab.${id}\uC5D0 \uC798\uBABB\uB41C \uC774\uB984\uC774 \uC788\uC2B5\uB2C8\uB2E4: ${got}`,
    nameTaken: (name) => `vocab\uC5D0\uC11C ${name}\uC774(\uAC00) \uB458 \uC774\uC0C1\uC758 \uB2E8\uC5B4\uB97C \uAC00\uB9AC\uD0B5\uB2C8\uB2E4`,
    noWordAbout: (id) => `vocab.${id}.about\uC774 \uC5C6\uC2B5\uB2C8\uB2E4`,
    badSeconds: (id) => `vocab.${id}.seconds\uB294 \uC591\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`,
    soundsNotObject: "sounds\uB294 \uAC1D\uCCB4\uC5EC\uC57C \uD569\uB2C8\uB2E4",
    badSoundName: (got) => `sounds\uC5D0 \uC798\uBABB\uB41C \uC774\uB984\uC774 \uC788\uC2B5\uB2C8\uB2E4: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file\uC740 \uD329 \uC548\uC758 \uD30C\uC77C\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`,
    badVolume: (name) => `sounds.${name}.volume\uC740 0\u20131\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`,
    soundType: (name, file) => `sounds.${name}\uC758 ${file}\uC740(\uB294) \uC774 \uBC84\uC804\uC774 \uC7AC\uC0DD\uD560 \uC218 \uC788\uB294 .ogg, .mp3, .wav\uAC00 \uC544\uB2C8\uBBC0\uB85C \uC18C\uB9AC\uAC00 \uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind\uAC00 ${kind}\uC785\uB2C8\uB2E4. \uC774 \uBC84\uC804\uC740 ${kinds.join(", ")}\uB9CC \uC54C\uAE30 \uB54C\uBB38\uC5D0 \uC18C\uB9AC\uAC00 \uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4`,
    soundMissing: (name, file) => `sounds.${name}\uC758 ${file}\uC774(\uAC00) \uC5C6\uC73C\uBBC0\uB85C \uC18C\uB9AC\uAC00 \uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4`,
    badWalk: (got) => `can.walk\uAC00 ${got}\uC778\uB370 \uC774 \uBC84\uC804\uC740 \uC54C\uC9C0 \uBABB\uD558\uBBC0\uB85C \uAC78\uC744 \uC218 \uC788\uB294 \uAC83\uC73C\uB85C \uCC98\uB9AC\uD569\uB2C8\uB2E4`,
    movesNotArray: "moves\uB294 \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4",
    tooManyMoves: (max2) => `moves\uB294 \uCD5C\uB300 ${max2}\uAC1C\uC785\uB2C8\uB2E4`,
    badMoveId: (got) => `moves\uC5D0 \uC798\uBABB\uB41C id\uAC00 \uC788\uC2B5\uB2C8\uB2E4: ${got} (left, center, right, cursor\uC640 \uC22B\uC790\uB294 \uAE30\uBCF8 \uBAA9\uC801\uC9C0\uC785\uB2C8\uB2E4)`,
    moveTaken: (id) => `moves\uC5D0 ${id}\uC774(\uAC00) \uB450 \uBC88 \uC774\uC0C1 \uC788\uC2B5\uB2C8\uB2E4`,
    noMoveText: (id) => `moves.${id}\uC5D0 name \uB610\uB294 about\uC774 \uC5C6\uC2B5\uB2C8\uB2E4`,
    badMoveParams: (id, max2) => `moves.${id}.params\uB294 \uCD5C\uB300 ${max2}\uAC1C \uD56D\uBAA9\uC758 \uBC30\uC5F4\uC774\uC5B4\uC57C \uD558\uBA70, \uAC01 \uD56D\uBAA9\uC5D0 id, about, \uADF8\uB9AC\uACE0 min\uC774 max\uBCF4\uB2E4 \uC791\uC740 \uC22B\uC790\uAC00 \uC788\uC5B4\uC57C \uD569\uB2C8\uB2E4`,
    needsNotArray: "needs\uB294 \uBC30\uC5F4\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4",
    unknownNeed: (got) => `needs\uC758 ${got}\uC740(\uB294) \uC774 \uBC84\uC804\uC5D0\uC11C \uC81C\uACF5\uD558\uC9C0 \uC54A\uC544 \uC81C\uC678\uD569\uB2C8\uB2E4`,
    idTaken: (id, builtin) => `id ${id}\uC740(\uB294) \uC774\uBBF8 ${builtin ? "\uB0B4\uC7A5 \uC678\uD615" : "\uB2E4\uB978 \uD329"}\uC5D0\uC11C \uC4F0\uACE0 \uC788\uC2B5\uB2C8\uB2E4`
  },
  importing: {
    badZip: (why) => `\uC77D\uC744 \uC218 \uC788\uB294 zip\uC774 \uC544\uB2D9\uB2C8\uB2E4: ${why}`,
    tooBig: (mb) => `\uC555\uCD95\uC744 \uD480\uBA74 ${mb} MB\uB97C \uB118\uC2B5\uB2C8\uB2E4`,
    truncated: "\uC5C5\uB85C\uB4DC\uAC00 \uC644\uC804\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4",
    badPath: (path) => `\uC4F8 \uC218 \uC5C6\uB294 \uACBD\uB85C\uAC00 \uC788\uC2B5\uB2C8\uB2E4: ${path}`,
    builtinId: (id) => `id ${id}\uC740(\uB294) \uB0B4\uC7A5 \uC678\uD615\uC758 \uAC83\uC785\uB2C8\uB2E4. \uAC00\uC838\uC624\uB824\uBA74 id\uB97C \uBC14\uAFB8\uC138\uC694`,
    duplicateId: (id) => `id ${id}\uC774(\uAC00) \uC774\uBC88\uC5D0 \uAC00\uC838\uC624\uB294 \uB2E4\uB978 \uD329\uACFC \uAC19\uC2B5\uB2C8\uB2E4`,
    unpackFailed: (why) => `\uC555\uCD95\uC744 \uD480\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${why}`,
    expired: "\uC774 \uAC00\uC838\uC624\uAE30\uB294 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uD30C\uC77C\uC744 \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694",
    noneChosen: "\uC120\uD0DD\uD55C \uD329\uC774 \uC5C6\uC2B5\uB2C8\uB2E4",
    zipOrFolder: "zip \uD30C\uC77C\uC774\uB098 \uD3F4\uB354\uB9CC \uAC00\uC838\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4",
    overLimit: (mb) => `${mb} MB \uCD08\uACFC`
  },
  removing: {
    notInstalled: (id) => `id\uAC00 ${id}\uC778 \uC678\uD615 \uD329\uC774 \uC5C6\uC2B5\uB2C8\uB2E4`,
    builtin: (id) => `${id}\uC740(\uB294) \uB0B4\uC7A5 \uC678\uD615\uC774\uB77C \uC81C\uAC70\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4`,
    elsewhere: (id) => `${id}\uC740(\uB294) \uC678\uD615 \uD329 \uC124\uCE58 \uD3F4\uB354\uC5D0 \uC5C6\uC5B4 \uC5EC\uAE30\uC11C \uC81C\uAC70\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4`,
    failed: (why) => `\uC0AD\uC81C\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${why}`
  },
  consent: {
    question: (items) => `\uC774\uB807\uAC8C \uBC14\uAFD4\uB3C4 \uB420\uAE4C\uC694? ${items.join(", ")}`,
    choices: ["\uC88B\uC544\uC694", "\uC55E\uC73C\uB85C\uB294 \uC548 \uBB3C\uC5B4\uBD10\uB3C4 \uB3FC\uC694", "\uBC14\uAFB8\uC9C0 \uB9C8\uC138\uC694"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `${to} \uBAA8\uC2B5\uC73C\uB85C \uBC14\uAFB8\uAE30`,
    scheme: (figure, look) => `${figure} \uAFB8\uBBF8\uAE30 \uBC14\uAFB8\uAE30(${look})`,
    roam: { free: "\uC790\uC8FC", calm: "\uAC00\uB054", off: "\uC81C\uC790\uB9AC" },
    roamTo: (to) => `\uAC77\uAE30\uB97C '${to}'(\uC73C)\uB85C \uBC14\uAFB8\uAE30`,
    snore: (seconds) => seconds === 0 ? "\uAE70 \uB54C\uAE4C\uC9C0 \uCF54\uACE8\uAE30" : `\uC798 \uB54C\uB9C8\uB2E4 ${seconds}\uCD08 \uCF54\uACE8\uAE30`,
    sound: (on) => on ? "\uD6A8\uACFC\uC74C \uCF1C\uAE30" : "\uD6A8\uACFC\uC74C \uB044\uAE30",
    scale: (from, to) => `\uD06C\uAE30\uB97C ${from}\uBC30\uC5D0\uC11C ${to}\uBC30\uB85C \uBC14\uAFB8\uAE30`,
    bubbleSize: (from, to) => `\uB9D0\uD48D\uC120 \uD06C\uAE30\uB97C ${from}\uBC30\uC5D0\uC11C ${to}\uBC30\uB85C \uBC14\uAFB8\uAE30`,
    fontSize: (from, to) => `\uAE00\uC790 \uD06C\uAE30\uB97C ${from}\uBC30\uC5D0\uC11C ${to}\uBC30\uB85C \uBC14\uAFB8\uAE30`,
    theme: { dark: "\uC57C\uAC04 \uBAA8\uC2B5\uC73C\uB85C \uBC14\uAFB8\uAE30", light: "\uC8FC\uAC04 \uBAA8\uC2B5\uC73C\uB85C \uBC14\uAFB8\uAE30" },
    hover: (list) => `\uD638\uBC84 \uBC84\uD2BC\uC744 ${list}(\uC73C)\uB85C \uBC14\uAFB8\uAE30`,
    actions: { chat: "\uC785\uB825", voice: "\uC74C\uC131 \uC785\uB825", roam: "\uAC77\uAE30", theme: "\uC57C\uAC04 \uBAA8\uB4DC", sound: "\uD6A8\uACFC\uC74C", dress: "\uAFB8\uBBF8\uAE30", hide: "\uD3AB \uC228\uAE30\uAE30" },
    user: (to) => `'${to}'(\uC774)\uB77C\uACE0 \uBD80\uB974\uAE30`
  },
  portsTaken: (from, to, why) => `\uD3EC\uD2B8 ${from}\u2013${to}\uAC00 \uBAA8\uB450 \uC0AC\uC6A9 \uC911\uC785\uB2C8\uB2E4: ${why}`,
  console: {
    label: "\uB370\uC2A4\uD06C\uD1B1 \uD3AB",
    window: "\uD3AB \uCC3D",
    connected: "\uD398\uC774\uC9C0 \uC5F0\uACB0\uB428",
    notOpen: "\uC5F4\uB9AC\uC9C0 \uC54A\uC74C",
    noBody: (reason) => `\uD398\uC774\uC9C0 \uC5F0\uACB0\uB428, \uC678\uD615\uC744 \uADF8\uB9B4 \uC218 \uC5C6\uC74C: ${reason}`,
    alsoBrowser: (hint) => `${hint}; \uBE0C\uB77C\uC6B0\uC800 \uD398\uC774\uC9C0 \uC5F0\uACB0\uB428`,
    voice: "\uC74C\uC131 \uC778\uC2DD",
    notStarted: "\uC2DC\uC791 \uC548 \uB428",
    viewInBrowser: "\uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uD3AB \uBCF4\uAE30",
    dress: "\uAFB8\uBBF8\uAE30",
    panels: {
      pet: { title: "\uB370\uC2A4\uD06C\uD1B1 \uD3AB", description: "\uCC3D, \uAFB8\uBBF8\uAE30, \uCC3D \uB7F0\uD0C0\uC784." },
      voice: { title: "\uC74C\uC131 \uC785\uB825", description: "\uC778\uC2DD \uC5D4\uC9C4, \uC785\uB825 \uB808\uBCA8, \uB4E4\uC740 \uB0B4\uC6A9." }
    },
    envPrompt: { title: "\uB370\uC2A4\uD06C\uD1B1 \uD3AB \uD658\uACBD", description: "\uD3AB\uC758 \uBAB8, \uB3C4\uAD6C \uB124 \uAC00\uC9C0, \uC785\uB825 \uC774\uBCA4\uD2B8\uB97C \uC124\uBA85\uD569\uB2C8\uB2E4." },
    vars: {
      "pet.user": "\uBD07\uC774 \uC0AC\uC6A9\uC790\uB97C \uBD80\uB974\uB294 \uC774\uB984",
      "pet.vocab": "\uD604\uC7AC \uC678\uD615\uC758 \uD45C\uC815\uACFC \uB3D9\uC791",
      "pet.moves": "\uD604\uC7AC \uC678\uD615\uC774 \uAC00\uC9C4 pet_move_to \uBAA9\uC801\uC9C0. \uC5C6\uC73C\uBA74 \uBE44\uC5B4 \uC788\uC74C",
      "pet.voice": "\uC74C\uC131 \uC785\uB825\uC774 \uCF1C\uC838 \uC788\uB294\uC9C0 \uC5EC\uBD80",
      "pet.body": "\uD604\uC7AC \uC678\uD615\uC758 \uBAA8\uC2B5",
      "pet.dress": "pet_set\uC73C\uB85C \uACE0\uB97C \uC218 \uC788\uB294 \uC678\uD615\uACFC \uAFB8\uBBF8\uAE30",
      "pet.self": '"Coo\uAC00 \uC124\uC815\uD558\uB294 \uAD8C\uD55C": \uC9C1\uC811 \uBC14\uAFB8\uB294 \uC124\uC815, \uB3D9\uC758\uB97C \uAD6C\uD558\uB294 \uC124\uC815, \uB610\uB294 \uC544\uBB34\uAC83\uB3C4 \uBC14\uAFC0 \uC218 \uC5C6\uC74C',
      "pet.chat": "\uC571\uC5D0 \uB300\uD654 \uD398\uC774\uC9C0\uAC00 \uC788\uC73C\uBA74 \uADF8\uC5D0 \uB300\uD55C \uC124\uBA85, \uC5C6\uC73C\uBA74 \uBE48 \uAC12",
      "pet.reply": "\uC571 \uC5B8\uC5B4\uAC00 \uC911\uAD6D\uC5B4 \uAC04\uCCB4\uB3C4 \uC601\uC5B4\uB3C4 \uC544\uB2D0 \uB54C \uBD07\uC5D0\uAC8C \uADF8 \uC5B8\uC5B4\uB85C \uB9D0\uD558\uB77C\uACE0 \uC54C\uB9AC\uB294 \uD55C \uC904, \uADF8 \uC678\uC5D0\uB294 \uBE48 \uAC12",
      "pet.cua": "\uCEF4\uD4E8\uD130 \uC0AC\uC6A9 \uBD80\uBD84: \uC2A4\uD06C\uB9B0\uC0F7 \uC88C\uD45C, \uC0AC\uC6A9\uC790\uC5D0\uAC8C \uBA3C\uC800 \uBB3B\uB294 \uB54C, \uC0AC\uC6A9\uC790\uC5D0\uAC8C \uC591\uBCF4\uD558\uB294 \uADDC\uCE59. \uCEF4\uD4E8\uD130 \uC0AC\uC6A9\uC774 \uAEBC\uC838 \uC788\uC73C\uBA74 \uBE44\uC5B4 \uC788\uC74C"
    },
    noGuide: "\uC774 \uC571\uC5D0\uB294 \uC2DC\uC791 \uC548\uB0B4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4",
    unknownMethod: (name) => `\uC54C \uC218 \uC5C6\uB294 \uBA54\uC11C\uB4DC ${name}`
  },
  config: {
    group: "\uB370\uC2A4\uD06C\uD1B1 \uD3AB",
    soundGroup: "\uD6A8\uACFC\uC74C",
    asrGroup: "\uC74C\uC131 \uC785\uB825",
    user: { title: "\uBD80\uB97C \uC774\uB984", description: (max2) => `\uC74C\uC131, \uC785\uB825, \uD130\uCE58 \uC774\uBCA4\uD2B8\uC5D0\uC11C \uC0AC\uC6A9\uC790\uB97C \uBD80\uB974\uB294 \uC774\uB984\uC774\uBA70 \uCD5C\uB300 ${max2}\uC790\uC785\uB2C8\uB2E4. \uBE44\uC6CC \uB450\uBA74 \uAE30\uBCF8 \uC774\uB984\uC744 \uC501\uB2C8\uB2E4.` },
    roam: { title: "\uAC77\uAE30", description: "free\uB294 \uC790\uC8FC \uB3CC\uC544\uB2E4\uB2C8\uACE0, calm\uC740 \uB300\uBD80\uBD84 \uC81C\uC790\uB9AC\uC5D0 \uC788\uC73C\uBA70, off\uB294 \uC694\uCCAD\uBC1B\uC744 \uB54C\uB9CC \uC6C0\uC9C1\uC785\uB2C8\uB2E4." },
    theme: { title: "\uC57C\uAC04 \uBAA8\uB4DC", description: "dark\uB294 \uC57C\uAC04\uC73C\uB85C \uBC1D\uC740 \uBAB8\uACFC \uC5B4\uB450\uC6B4 \uB9D0\uD48D\uC120, light\uB294 \uC8FC\uAC04\uC73C\uB85C \uC5B4\uB450\uC6B4 \uBAB8\uACFC \uBC1D\uC740 \uB9D0\uD48D\uC120\uC785\uB2C8\uB2E4." },
    rememberPosition: { title: "\uC704\uCE58 \uAE30\uC5B5", description: "\uC571\uC744 \uC885\uB8CC\uD560 \uB54C \uD3AB\uC774 \uD654\uBA74 \uAC00\uB85C \uBC29\uD5A5 \uC5B4\uB514\uC5D0 \uC11C \uC788\uB294\uC9C0 \uC800\uC7A5\uD558\uACE0 \uB2E4\uC74C\uC5D0 \uADF8 \uC790\uB9AC\uC5D0\uC11C \uC2DC\uC791\uD569\uB2C8\uB2E4. \uD654\uBA74\uC774 \uC5EC\uB7EC \uAC1C\uC774\uBA74 \uD56D\uC0C1 \uC8FC \uD654\uBA74\uC5D0\uC11C \uC2DC\uC791\uD569\uB2C8\uB2E4." },
    hoverButtons: { title: "\uD638\uBC84 \uBC84\uD2BC", description: (max2, ids) => `\uD3EC\uC778\uD130\uB97C \uD3AB \uC704\uC5D0 \uC62C\uB824 \uB450\uBA74 \uC606\uC5D0 \uB098\uD0C0\uB098\uB294 \uBC84\uD2BC\uC73C\uB85C, \uCD5C\uB300 ${max2}\uAC1C\uB97C \uC27C\uD45C\uB85C \uAD6C\uBD84\uD569\uB2C8\uB2E4: ${ids}.` },
    doubleClickChat: { title: "\uB354\uBE14\uD074\uB9AD\uC73C\uB85C \uC785\uB825", description: "\uD3AB\uC744 \uB354\uBE14\uD074\uB9AD\uD558\uBA74 \uC785\uB825 \uC0C1\uC790\uAC00 \uC5F4\uB9BD\uB2C8\uB2E4." },
    statusBubble: { title: "\uC0C1\uD0DC \uB9D0\uD48D\uC120", description: "\uD3AB\uC774 \uC0DD\uAC01\uD558\uAC70\uB098, \uAE30\uC5B5\uC744 \uC0B4\uD3B4\uBCF4\uAC70\uB098, \uCEF4\uD4E8\uD130\uB97C \uC0AC\uC6A9\uD558\uB294 \uB3D9\uC548 \uBB34\uC5C7\uC744 \uD558\uB294\uC9C0 \uD30C\uC77C \uC774\uB984\uAE4C\uC9C0 \uBCF4\uC5EC \uC90D\uB2C8\uB2E4." },
    saidBubbles: { title: "\uC785\uB825 \uB9D0\uD48D\uC120", description: "\uC785\uB825, \uC74C\uC131, \uB300\uD654 \uD398\uC774\uC9C0\uC5D0\uC11C \uBCF4\uB0B8 \uBA54\uC2DC\uC9C0\uB97C \uD3AB\uC774 \uB2F5\uD560 \uB54C\uAE4C\uC9C0 \uC704\uC5D0 \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uB044\uBA74 \uC74C\uC131\uC740 \uC778\uC2DD\uD558\uB294 \uB3D9\uC548\uB9CC \uD45C\uC2DC\uB429\uB2C8\uB2E4." },
    selfAdjust: { title: "Coo\uAC00 \uC124\uC815\uD558\uB294 \uAD8C\uD55C", description: "off \uAE08\uC9C0: Coo\uAC00 \uC124\uC815\uC744 \uBC14\uAFC0 \uC218 \uC5C6\uACE0 \uC7A0\uC2DC \uC870\uC6A9\uD788 \uD558\uAE30\uB3C4 \uC4F8 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. default \uAE30\uBCF8: \uC678\uD615, \uAFB8\uBBF8\uAE30, \uAC77\uAE30, \uCF54\uACE8\uC774\uB294 \uC9C1\uC811 \uBC14\uAFB8\uACE0, \uD06C\uAE30, \uB9D0\uD48D\uC120 \uD06C\uAE30, \uAE00\uC790 \uD06C\uAE30, \uD6A8\uACFC\uC74C, \uC57C\uAC04 \uBAA8\uB4DC, \uD638\uBC84 \uBC84\uD2BC, \uBD80\uB97C \uC774\uB984\uC740 \uBA3C\uC800 \uB3D9\uC758\uB97C \uAD6C\uD569\uB2C8\uB2E4. any \uBAA8\uB450: \uC804\uBD80 \uC9C1\uC811 \uBC14\uAFC9\uB2C8\uB2E4. custom \uC0AC\uC6A9\uC790 \uC9C0\uC815: \u300C\uC2B5\uAD00\u300D \uD398\uC774\uC9C0\uC5D0\uC11C \uCCB4\uD06C\uD55C \uD56D\uBAA9\uC740 \uC9C1\uC811 \uBC14\uAFB8\uACE0, \uB098\uBA38\uC9C0\uB294 \uBA3C\uC800 \uB3D9\uC758\uB97C \uAD6C\uD569\uB2C8\uB2E4." },
    windowEnabled: { title: "\uC2DC\uC791\uD560 \uB54C \uD3AB \uCC3D \uC5F4\uAE30" },
    scale: { title: "\uD06C\uAE30" },
    bubbleSize: { title: "\uB9D0\uD48D\uC120 \uD06C\uAE30", description: "\uD3AB\uACFC \uB2F9\uC2E0\uC758 \uB9D0\uD48D\uC120 \uB108\uBE44, \uC5EC\uBC31, \uBAA8\uC11C\uB9AC, \uAF2C\uB9AC. 1\uC774 \uAE30\uBCF8\uC774\uBA70 \uAE00\uC790 \uD06C\uAE30\uB294 \uADF8\uB300\uB85C\uC785\uB2C8\uB2E4." },
    fontSize: { title: "\uAE00\uC790 \uD06C\uAE30", description: "\uB9D0\uD48D\uC120 \uC548 \uAE00\uC790 \uD06C\uAE30. 1\uC774 \uAE30\uBCF8\uC774\uBA70 \uB9D0\uD48D\uC120 \uB108\uBE44\uB294 \uADF8\uB300\uB85C\uC785\uB2C8\uB2E4." },
    bubbleSpeed: { title: "\uB9D0\uD48D\uC120 \uC18D\uB3C4", description: "\uD3AB \uB9D0\uD48D\uC120\uC758 \uAE00\uC790\uAC00 \uB098\uC624\uB294 \uC18D\uB3C4\uC640 \uBA38\uBB34\uB294 \uC2DC\uAC04. 1\uC774 \uAE30\uBCF8\uC774\uBA70 \uD074\uC218\uB85D \uBE68\uB77C\uC9D1\uB2C8\uB2E4." },
    glow: { title: "\uC678\uACFD \uBE5B", description: "\uD3AB\uACFC \uB4A4 \uBC30\uACBD\uC758 \uC0C9\uC774 \uBE44\uC2B7\uD560 \uB54C \uBAB8 \uC8FC\uC704\uC5D0 \uC0DD\uAE30\uB294 \uC605\uC740 \uBE5B\uC774 \uBA87 \uD53D\uC140 \uD37C\uC9C0\uB294\uC9C0. 0\uC774\uBA74 \uAEBC\uC9D0." },
    frameRate: { title: "\uD504\uB808\uC784 \uB808\uC774\uD2B8", description: "\uD3AB\uC774 \uAC77\uAC70\uB098, \uB4E4\uB824 \uC788\uAC70\uB098, \uC810\uD504\uD560 \uB54C \uCD08\uB2F9 \uADF8\uB9AC\uB294 \uD504\uB808\uC784 \uC218\uC785\uB2C8\uB2E4. 0\uC774\uBA74 \uB514\uC2A4\uD50C\uB808\uC774\uB97C \uB530\uB985\uB2C8\uB2E4. \uB514\uC2A4\uD50C\uB808\uC774 \uC8FC\uC0AC\uC728\uBCF4\uB2E4 \uB192\uC73C\uBA74 \uB514\uC2A4\uD50C\uB808\uC774 \uC8FC\uC0AC\uC728\uC774 \uC801\uC6A9\uB429\uB2C8\uB2E4. \uC2B5\uAD00 \uD398\uC774\uC9C0\uC5D0\uC11C\uB294 60, 120, 144, \uBB34\uC81C\uD55C \uC911\uC5D0\uC11C \uACE0\uB97C \uC218 \uC788\uC2B5\uB2C8\uB2E4." },
    lockFrameRate: { title: "\uD504\uB808\uC784 \uB808\uC774\uD2B8 \uACE0\uC815", description: "\uAC00\uB9CC\uD788 \uC788\uC744 \uB54C\uB3C4 \uD504\uB808\uC784 \uB808\uC774\uD2B8\uB300\uB85C \uD3AB\uC744 \uADF8\uB9BD\uB2C8\uB2E4. \uB044\uBA74 \uC11C \uC788\uAC70\uB098, \uC549\uC544 \uC788\uAC70\uB098, \uC7A0\uB4E0 \uB3D9\uC548 \uCD08\uB2F9 30\uD504\uB808\uC784\uC73C\uB85C \uB0AE\uCDA5\uB2C8\uB2E4." },
    hideWhenFullscreen: { title: "\uC804\uCCB4 \uD654\uBA74\uC77C \uB54C \uC228\uAE30\uAE30", description: "\uCF1C\uBA74 \uC55E\uC5D0 \uC788\uB294 \uCC3D\uC774 \uD3AB\uC774 \uC788\uB294 \uD654\uBA74\uC744 \uAC00\uB4DD \uCC44\uC6B0\uB294 \uB3D9\uC548(\uAC8C\uC784, \uC804\uCCB4 \uD654\uBA74 \uB3D9\uC601\uC0C1, \uC804\uCCB4 \uD654\uBA74 \uBE0C\uB77C\uC6B0\uC800) \uD3AB\uC744 \uC228\uAE30\uACE0, \uC804\uCCB4 \uD654\uBA74\uC774 \uB05D\uB098\uBA74 \uB2E4\uC2DC \uBCF4\uC5EC \uC90D\uB2C8\uB2E4. \uCD5C\uB300\uD654\uB41C \uCC3D\uC740 \uD574\uB2F9\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uB044\uBA74 \uD56D\uC0C1 \uB9E8 \uC704\uC5D0 \uB5A0 \uC788\uC2B5\uB2C8\uB2E4." },
    exportOverlay: { title: "OBS \uC624\uBC84\uB808\uC774", description: "\uD3AB \uCC3D\uC758 \uD654\uBA74\uC744 \uD22C\uBA85 \uBC30\uACBD\uC73C\uB85C /overlay\uC5D0 \uC81C\uACF5\uD574 OBS\uC758 \u300C\uBE0C\uB77C\uC6B0\uC800\u300D \uC18C\uC2A4\uC5D0\uC11C \uC4F8 \uC218 \uC788\uAC8C \uD569\uB2C8\uB2E4. \uB044\uBA74 \uC81C\uACF5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." },
    electronFile: { title: "Electron \uC2E4\uD589 \uD30C\uC77C", description: "\uBE44\uC6CC \uB450\uBA74 CORTICO_DESKTOP_PET_HOST\uB97C \uC4F0\uACE0, \uC5C6\uC73C\uBA74 \uD328\uB110\uC5D0\uC11C \uC124\uCE58\uD55C \uB7F0\uD0C0\uC784\uC744 \uC501\uB2C8\uB2E4." },
    port: { title: "\uD398\uC774\uC9C0 \uD3EC\uD2B8", description: "\uC0AC\uC6A9 \uC911\uC774\uBA74 \uB2E4\uC74C \uBE48 \uD3EC\uD2B8\uB85C \uC62C\uB77C\uAC11\uB2C8\uB2E4." },
    touchEnabled: { title: "\uD130\uCE58\uB97C \uC774\uBCA4\uD2B8\uB85C \uC804\uB2EC", description: "\uCC0C\uB974\uAE30, \uC4F0\uB2E4\uB4EC\uAE30, \uB4E4\uC5B4 \uC62C\uB824 \uB358\uC9C0\uAE30." },
    touchWakeOn: { title: "\uBC18\uC751 \uBAA8\uB4DC", description: "poke: \uCC0C\uB97C \uB54C\uB9CC \uBC14\uB85C \uBC18\uC751\uD558\uACE0, \uB098\uBA38\uC9C0 \uD130\uCE58\uB294 \uB2E4\uC74C \uBC18\uC751 \uB54C \uD568\uAED8 \uC804\uB2EC\uB429\uB2C8\uB2E4. all: \uBAA8\uB4E0 \uD130\uCE58\uC5D0 \uBC14\uB85C \uBC18\uC751\uD569\uB2C8\uB2E4. none: \uBAA8\uB4E0 \uD130\uCE58\uAC00 \uB2E4\uC74C \uBC18\uC751 \uB54C \uD568\uAED8 \uC804\uB2EC\uB429\uB2C8\uB2E4. custom: \u300C\uC2B5\uAD00\u300D \uD398\uC774\uC9C0\uC5D0\uC11C \uCCB4\uD06C\uD55C \uD130\uCE58\uC5D0 \uBC14\uB85C \uBC18\uC751\uD569\uB2C8\uB2E4. \uD55C \uBC88 \uBC18\uC751\uD55C \uB4A4 \uADF8 \uCC28\uB840\uAC00 \uB05D\uB0A0 \uB54C\uAE4C\uC9C0\uC758 \uD130\uCE58\uB294 \uB2E4\uC74C \uBC18\uC751 \uB54C \uD568\uAED8 \uC804\uB2EC\uB429\uB2C8\uB2E4." },
    sound: { title: "\uBAA8\uB4E0 \uD6A8\uACFC\uC74C", description: "\uD3AB \uBA54\uB274\uC758 \uD6A8\uACFC\uC74C \uBC84\uD2BC\uC774 \uC774 \uC124\uC815\uC744 \uCF1C\uACE0 \uB055\uB2C8\uB2E4." },
    sounds: {
      move: { title: "\uC6C0\uC9C1\uC784", description: "\uAC77\uAE30, \uB2EC\uB9AC\uAE30, \uC810\uD504, \uCC29\uC9C0, \uB358\uC838\uC9C0\uAE30, \uB044\uB355\uC774\uAE30, \uACE0\uAC1C \uC813\uAE30, \uD68C\uC804, \uC5B4\uC9C0\uB7EC\uC6C0, \uB5A8\uAE30, \uCDA4, \uB450\uB9AC\uBC88\uAC70\uB9AC\uAE30." },
      touch: { title: "\uD130\uCE58", description: "\uB4E4\uC5B4 \uC62C\uB824\uC9C0\uAE30, \uD754\uB4E4\uB9AC\uAE30, \uC4F0\uB2E4\uB4EC\uC5B4\uC9C0\uAE30, \uCC14\uB9AC\uAE30." },
      face: { title: "\uD45C\uC815", description: "\uAE30\uC068, \uC719\uD06C, \uC0AC\uB791, \uB180\uB78C, \uD654\uB0A8, \uC2AC\uD514, \uBD80\uB044\uB7EC\uC6C0, \uD558\uD488." },
      snore: { title: "\uCF54\uACE8\uC774", description: "" },
      talk: { title: "\uB9D0\uD558\uAE30", description: "\uB9D0\uD48D\uC120 \uAE00\uC790\uAC00 \uB098\uD0C0\uB0A0 \uB54C\uC758 \uC639\uC54C\uC774 \uC18C\uB9AC\uC640 \uC120\uD0DD \uCE74\uB4DC\uAC00 \uD280\uC5B4\uB098\uC624\uB294 \uC18C\uB9AC." },
      ui: { title: "\uBC84\uD2BC\uACFC \uC54C\uB9BC\uC74C", description: "\uBC84\uD2BC \uD074\uB9AD, \uB9D0\uD48D\uC120 \uC5F4\uB9BC, \uC120\uD0DD, \uB4E3\uAE30 \uC2DC\uC791\uACFC \uB05D." }
    },
    snoreSeconds: { title: "\uCF54\uACE8\uC774 \uC2DC\uAC04", suffix: "\uCD08", description: "\uC7A0\uB4E4 \uB54C\uB9C8\uB2E4 \uC774\uB9CC\uD07C \uCF54\uB97C \uACE4 \uB4A4 \uC870\uC6A9\uD574\uC9C0\uBA70, z\uB294 \uACC4\uC18D \uB5A0\uC624\uB985\uB2C8\uB2E4. 0 = \uAE70 \uB54C\uAE4C\uC9C0 \uCF54\uACE8\uC774." },
    speech: { title: "\uB9D0\uC18C\uB9AC", description: "\uB9D0\uD48D\uC120\uC5D0 \uAE00\uC790\uAC00 \uB098\uC62C \uB54C\uB9C8\uB2E4 \uC74C\uC808\uC744 \uC77D\uC5B4 \u300C\uB9D0\uD558\uAE30\u300D \uD6A8\uACFC\uC74C \uB300\uC2E0 \uB0C5\uB2C8\uB2E4. \u300C\uB9D0\uD558\uAE30\u300D\uB97C \uB044\uBA74 \uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." },
    speechPitch: { title: "\uB9D0\uC18C\uB9AC \uB192\uC774", description: (a, b, c) => `low, mid, high\uB294 \uAC01\uAC01 ${a}, ${b}, ${c} Hz\uC774\uBA70 custom\uC740 \uC0AC\uC6A9\uC790 \uC9C0\uC815 \uB192\uC774\uB97C \uC501\uB2C8\uB2E4.` },
    speechPitchHz: { title: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uB192\uC774" },
    speechSpeed: { title: "\uB9D0\uC18C\uB9AC \uC18D\uB3C4", description: (a, b, c) => `1\uCD08\uC5D0 \uC77D\uB294 \uC74C\uC808 \uC218\uC758 \uC0C1\uD55C: low, mid, high\uB294 \uAC01\uAC01 ${a}, ${b}, ${c}\uC774\uBA70 custom\uC740 \uC0AC\uC6A9\uC790 \uC9C0\uC815 \uC18D\uB3C4\uB97C \uC501\uB2C8\uB2E4. \uAE00\uC790\uBCF4\uB2E4 \uB290\uB9AC\uBA74 \uAE00\uC790\uAC00 \uB2E4 \uB098\uC628 \uB4A4\uC5D0 \uB2E4 \uC77D\uC2B5\uB2C8\uB2E4.` },
    speechRate: { title: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 \uC18D\uB3C4", suffix: "\uC74C\uC808/\uCD08" },
    asrEnabled: { title: "\uC74C\uC131 \uC785\uB825" },
    asrEngine: { title: "\uC778\uC2DD \uC5D4\uC9C4", description: "funasr\uB294 FunASR\uC758 SenseVoiceSmall\uC744 \uC2E4\uD589\uD574 \uC911\uAD6D\uC5B4, \uC601\uC5B4, \uC77C\uBCF8\uC5B4, \uD55C\uAD6D\uC5B4, \uAD11\uB465\uC5B4\uB97C \uC778\uC2DD\uD558\uBA70, \uCC98\uC74C \uD55C \uBC88 \uC57D 240 MB\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD569\uB2C8\uB2E4. whisper\uB294 OpenAI\uC758 Whisper small\uC744 \uC2E4\uD589\uD574 \uD504\uB791\uC2A4\uC5B4, \uB3C5\uC77C\uC5B4, \uC2A4\uD398\uC778\uC5B4, \uD3EC\uB974\uD22C\uAC08\uC5B4, \uC774\uD0C8\uB9AC\uC544\uC5B4, \uB7EC\uC2DC\uC544\uC5B4 \uC678 \uC57D 90\uAC1C \uC5B8\uC5B4\uB97C \uC778\uC2DD\uD558\uBA70, \uCC98\uC74C \uD55C \uBC88 \uC57D 360 MB\uB97C \uB2E4\uC6B4\uB85C\uB4DC\uD558\uACE0 \uD55C \uBB38\uC7A5\uC744 \uB9C8\uCCD0\uC57C \uAE00\uC790\uAC00 \uB098\uC635\uB2C8\uB2E4. \uB458 \uB2E4 \uC774 \uCEF4\uD4E8\uD130\uC5D0\uC11C \uC778\uC2DD\uD569\uB2C8\uB2E4. system\uC740 Windows \uC790\uCCB4 \uC74C\uC131 \uC778\uC2DD\uC744 \uC4F0\uBA70 \uB2E4\uC6B4\uB85C\uB4DC\uAC00 \uD544\uC694 \uC5C6\uC9C0\uB9CC \uC815\uD655\uB3C4\uAC00 \uB0AE\uC2B5\uB2C8\uB2E4(Windows \uC804\uC6A9). api\uB294 \uBB38\uC7A5\uB9C8\uB2E4 \uB179\uC74C\uC744 OpenAI \uD638\uD658 \uC804\uC0AC API\uB85C \uBCF4\uB0B4 \uC778\uC2DD\uD558\uBA70, \uD55C \uBB38\uC7A5\uC744 \uB9C8\uCCD0\uC57C \uAE00\uC790\uAC00 \uB098\uC635\uB2C8\uB2E4. \uC8FC\uC18C\uC640 \uBAA8\uB378\uC740 \uC544\uB798\uC5D0, API Key\uB294 \u300C\uC74C\uC131 \uC785\uB825\u300D \uD398\uC774\uC9C0\uC5D0 \uC785\uB825\uD569\uB2C8\uB2E4. \uBE44\uC6CC \uB450\uBA74 \uC571 \uC5B8\uC5B4\uC5D0 \uB530\uB77C \uACE0\uB985\uB2C8\uB2E4. \uC911\uAD6D\uC5B4, \uC601\uC5B4, \uC77C\uBCF8\uC5B4, \uD55C\uAD6D\uC5B4\uB294 funasr\uB97C, \uB098\uBA38\uC9C0\uB294 whisper\uB97C \uC501\uB2C8\uB2E4." },
    asrLanguage: { title: "\uC5B8\uC5B4", description: "ISO 639-1 \uC5B8\uC5B4 \uCF54\uB4DC \uB610\uB294 \uBAA8\uB378\uC774 \uD310\uB2E8\uD558\uAC8C \uD558\uB294 auto. \uBE44\uC6CC \uB450\uBA74 \uC571 \uC5B8\uC5B4\uB97C \uB530\uB985\uB2C8\uB2E4. FunASR\uB294 zh, en, ja, ko, yue\uB97C, Whisper\uB294 fr, de, es, pt, it, ru \uB4F1 \uC57D 100\uAC1C \uCF54\uB4DC\uB97C \uBC1B\uC73C\uBA70, \uBAA8\uB378\uC774 \uBC1B\uC9C0 \uC54A\uB294 \uCF54\uB4DC\uB294 auto\uB85C \uCC98\uB9AC\uD569\uB2C8\uB2E4. \uC804\uC0AC API\uC5D0\uB294 \uCF54\uB4DC\uAC00 \uB450 \uAE00\uC790\uC77C \uB54C\uB9CC \uC5B8\uC5B4\uB97C \uBCF4\uB0C5\uB2C8\uB2E4." },
    asrApiUrl: { title: "\uC804\uC0AC API \uC8FC\uC18C", description: "\uC5D4\uC9C4\uC774 api\uC77C \uB54C \uBB38\uC7A5\uB9C8\uB2E4 \uB179\uC74C\uC744 \uC774 \uC8FC\uC18C \uB4A4\uC758 /audio/transcriptions\uB85C \uBCF4\uB0C5\uB2C8\uB2E4(\uC608: https://api.example.com/v1). \uC6D0\uACA9 \uC8FC\uC18C\uB294 https\uB9CC \uC4F8 \uC218 \uC788\uACE0, \uC774 \uCEF4\uD4E8\uD130\uB098 \uB85C\uCEEC \uB124\uD2B8\uC6CC\uD06C\uC758 \uC8FC\uC18C\uB294 http\uB97C \uC368\uB3C4 \uB429\uB2C8\uB2E4." },
    asrApiModel: { title: "\uC804\uC0AC \uBAA8\uB378", description: "\uC5D4\uC9C4\uC774 api\uC77C \uB54C \uC694\uCCAD\uC5D0 \uB123\uB294 \uBAA8\uB378 \uC774\uB984." },
    asrThreads: { title: "CPU \uC2A4\uB808\uB4DC", description: "FunASR\uC640 Whisper\uAC00 \uD55C \uBC88 \uC778\uC2DD\uD560 \uB54C \uC4F0\uB294 \uC2A4\uB808\uB4DC \uC218. 0 = 2." },
    asrSimplified: { title: "\uAC04\uCCB4\uB85C \uBCC0\uD658", description: "\uC571 \uC5B8\uC5B4\uAC00 \uC911\uAD6D\uC5B4 \uAC04\uCCB4\uC77C \uB54C \uB4E4\uC740 \uB0B4\uC6A9\uC758 \uBC88\uCCB4\uC790\uB97C \uAC04\uCCB4\uC790\uB85C \uBC14\uAFC9\uB2C8\uB2E4." },
    thresholdDb: { title: "\uB9D0\uC18C\uB9AC \uC784\uACC4\uAC12" },
    silenceMs: { title: "\uBB38\uC7A5\uC744 \uB05D\uB0B4\uB294 \uCE68\uBB35" },
    maxUtteranceMs: { title: "\uCD5C\uB300 \uBB38\uC7A5 \uAE38\uC774" }
  },
  panel: {
    pet: "\uB370\uC2A4\uD06C\uD1B1 \uD3AB",
    window: "\uD3AB \uCC3D",
    openWindow: "\uCC3D \uC5F4\uAE30",
    closeWindow: "\uCC3D \uB2EB\uAE30",
    runtime: "\uCC3D \uB7F0\uD0C0\uC784",
    install: "\uC124\uCE58",
    viewInBrowser: "\uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C \uBCF4\uAE30",
    dress: "\uAFB8\uBBF8\uAE30",
    dressHint: "\uBCC0\uACBD \uC0AC\uD56D\uC740 \uBC14\uB85C \uC800\uC7A5\uB418\uC5B4 \uD3AB \uCC3D\uC5D0 \uBC18\uC601\uB429\uB2C8\uB2E4",
    connected: "\uC5F0\uACB0\uB428",
    starting: "\uC2DC\uC791 \uC911",
    cannotOpen: "\uC5F4 \uC218 \uC5C6\uC74C",
    notOpen: "\uC5F4\uB9AC\uC9C0 \uC54A\uC74C",
    external: "\uC678\uBD80 \uD504\uB85C\uADF8\uB7A8 \uC0AC\uC6A9 \uC911",
    installed: "\uC124\uCE58\uB428",
    downloading: (progress) => `\uB2E4\uC6B4\uB85C\uB4DC \uC911 ${progress}`,
    installFailed: "\uC124\uCE58 \uC2E4\uD328",
    notInstalled: "\uC124\uCE58 \uC548 \uB428",
    noBuild: "\uC774 \uD50C\uB7AB\uD3FC\uC6A9 \uC0AC\uC804 \uBE4C\uB4DC \uD328\uD0A4\uC9C0 \uC5C6\uC74C",
    electronSize: "Electron 44.4.4, \uC57D 150 MB",
    voice: "\uC74C\uC131 \uC785\uB825",
    enable: "\uC74C\uC131 \uC785\uB825 \uCF1C\uAE30",
    enabledHint: "\uB9C8\uC774\uD06C\uAC00 \uACC4\uC18D \uC5F4\uB824 \uC788\uACE0, \uB9D0\uD55C \uB0B4\uC6A9\uC740 \uB4E3\uB294 \uBC29\uC2DD\uC5D0 \uB530\uB77C Coo\uC5D0\uAC8C \uC804\uB2EC\uB429\uB2C8\uB2E4",
    enabledHintOnPress: "\uB9D0\uD558\uAE30 \uD0A4\uB97C \uB204\uB974\uB294 \uB3D9\uC548\uB9CC \uB9C8\uC774\uD06C\uB97C \uC5F4\uACE0, \uB5BC\uBA74 \uB2EB\uC2B5\uB2C8\uB2E4",
    disabledHint: "\uAEBC\uC9D0: \uB9C8\uC774\uD06C\uB294 \uB2EB\uD600 \uC788\uACE0 \uC544\uB798 \uC124\uC815\uC740 \uB300\uAE30\uD569\uB2C8\uB2E4",
    engine: "\uC778\uC2DD \uC5D4\uC9C4",
    funasr: "FunASR(\uC774 \uCEF4\uD4E8\uD130\uC5D0\uC11C \uC778\uC2DD)",
    system: "Windows \uB0B4\uC7A5",
    whisper: "Whisper(\uC774 \uCEF4\uD4E8\uD130\uC5D0\uC11C \uC778\uC2DD)",
    systemHint: "\uB2E4\uC6B4\uB85C\uB4DC\uAC00 \uD544\uC694 \uC5C6\uACE0 \uC815\uD655\uB3C4\uB294 \uBCF4\uD1B5\uC785\uB2C8\uB2E4. \uB354 \uB098\uC740 \uACB0\uACFC\uB97C \uC6D0\uD558\uBA74 FunASR \uB610\uB294 Whisper\uB85C \uBC14\uAFB8\uC138\uC694",
    funasrHint: "\uC774 \uCEF4\uD4E8\uD130\uC5D0\uC11C \uC2E4\uD589\uD558\uB294 SenseVoiceSmall\uB85C \uC911\uAD6D\uC5B4, \uC601\uC5B4, \uC77C\uBCF8\uC5B4, \uD55C\uAD6D\uC5B4, \uAD11\uB465\uC5B4\uB97C \uC778\uC2DD\uD569\uB2C8\uB2E4",
    whisperHint: "\uC774 \uCEF4\uD4E8\uD130\uC5D0\uC11C \uC2E4\uD589\uD558\uB294 Whisper small\uB85C \uD504\uB791\uC2A4\uC5B4, \uB3C5\uC77C\uC5B4, \uC2A4\uD398\uC778\uC5B4, \uD3EC\uB974\uD22C\uAC08\uC5B4, \uC774\uD0C8\uB9AC\uC544\uC5B4, \uB7EC\uC2DC\uC544\uC5B4 \uB4F1\uC744 \uC778\uC2DD\uD569\uB2C8\uB2E4. \uD55C \uBB38\uC7A5\uC744 \uB9C8\uCCD0\uC57C \uAE00\uC790\uAC00 \uB098\uC635\uB2C8\uB2E4",
    api: "\uC804\uC0AC API(OpenAI \uD638\uD658)",
    apiName: "\uC804\uC0AC API",
    apiHint: "\uBB38\uC7A5\uB9C8\uB2E4 \uB179\uC74C\uC744 \uC544\uB798\uC5D0 \uC785\uB825\uD55C API\uB85C \uBCF4\uB0B4 \uC778\uC2DD\uD569\uB2C8\uB2E4. \uD55C \uBB38\uC7A5\uC744 \uB9C8\uCCD0\uC57C \uAE00\uC790\uAC00 \uB098\uC635\uB2C8\uB2E4",
    apiUrl: "\uC8FC\uC18C",
    apiModel: "\uBAA8\uB378",
    apiKey: "API Key",
    keySaved: "\uC800\uC7A5\uB428",
    keyMissing: "\uC785\uB825 \uC548 \uB428",
    server: "\uC778\uC2DD \uC11C\uBE44\uC2A4",
    start: "\uC2DC\uC791",
    stop: "\uC911\uC9C0",
    ready: "\uC900\uBE44\uB428",
    error: "\uC624\uB958",
    stopped: "\uC911\uC9C0\uB428",
    model: "\uC74C\uC131 \uBAA8\uB378",
    download: "\uB2E4\uC6B4\uB85C\uB4DC",
    retry: "\uB2E4\uC2DC \uC2DC\uB3C4",
    downloadFailed: "\uB2E4\uC6B4\uB85C\uB4DC \uC2E4\uD328",
    downloaded: "\uB2E4\uC6B4\uB85C\uB4DC\uB428",
    notDownloaded: "\uB2E4\uC6B4\uB85C\uB4DC \uC548 \uB428",
    modelSource: (size) => `\uC57D ${size}, ModelScope\uC5D0\uC11C \uB2E4\uC6B4\uB85C\uB4DC`,
    mic: "\uB9C8\uC774\uD06C",
    micStates: { on: "\uB4E3\uB294 \uC911", off: "\uB4E3\uC9C0 \uC54A\uC74C", denied: "\uAC70\uBD80\uB428", error: "\uC624\uB958" },
    defaultDevice: "\uC2DC\uC2A4\uD15C \uAE30\uBCF8\uAC12",
    missingDevice: "\uC774\uC804\uC5D0 \uC120\uD0DD\uD55C \uC7A5\uCE58(\uC9C0\uAE08\uC740 \uCC3E\uC744 \uC218 \uC5C6\uC74C)",
    micN: (n) => `\uB9C8\uC774\uD06C ${n}`,
    mode: "\uB4E3\uB294 \uBC29\uC2DD",
    modes: { hold: "\uB9D0\uD558\uAE30 \uD0A4\uB97C \uB204\uB974\uACE0 \uC788\uB294 \uB3D9\uC548", toggle: "\uB9D0\uD558\uAE30 \uD0A4\uB85C \uCF1C\uACE0 \uB044\uAE30", always: "\uD56D\uC0C1" },
    openOnPress: "\uB204\uB974\uACE0 \uC788\uC744 \uB54C\uB9CC \uB9C8\uC774\uD06C \uC5F4\uAE30",
    openOnPressHint: "\uB9C8\uC774\uD06C\uB97C \uC5F4\uBA74 \uD1B5\uD654 \uBAA8\uB4DC\uB85C \uBC14\uB00C\uB294 \uBE14\uB8E8\uD22C\uC2A4 \uC774\uC5B4\uD3F0 \uB4F1\uC5D0 \uC4F0\uBA70, \uB204\uB978 \uB4A4 \uC7A0\uC2DC \uAE30\uB2E4\uB838\uB2E4\uAC00 \uB9D0\uD558\uC9C0 \uC54A\uC73C\uBA74 \uCCAB\uB9C8\uB514\uAC00 \uBE60\uC9C8 \uC218 \uC788\uC2B5\uB2C8\uB2E4",
    switchOn: "\uCF1C\uC9D0",
    switchOff: "\uAEBC\uC9D0",
    presses: {
      2: { hold: "\uB450 \uBC88 \uB204\uB978 \uB4A4 \uB204\uB974\uACE0 \uC788\uAE30", toggle: "\uB450 \uBC88 \uB20C\uB7EC \uC2DC\uC791, \uB2E4\uC2DC \uB450 \uBC88 \uB20C\uB7EC \uBA48\uCDA4" },
      1: { hold: "\uADF8\uB0E5 \uB204\uB974\uACE0 \uC788\uAE30", toggle: "\uB20C\uB7EC\uC11C \uC2DC\uC791, \uB2E4\uC2DC \uB20C\uB7EC \uBA48\uCDA4" },
      3: { hold: "\uC138 \uBC88 \uB204\uB978 \uB4A4 \uB204\uB974\uACE0 \uC788\uAE30", toggle: "\uC138 \uBC88 \uB20C\uB7EC \uC2DC\uC791, \uB2E4\uC2DC \uC138 \uBC88 \uB20C\uB7EC \uBA48\uCDA4" }
    },
    capture: "\uC0C8 \uB9D0\uD558\uAE30 \uD0A4\uB97C \uB204\uB974\uC138\uC694. \uD0A4 \uC870\uD569\uC774\uB098 \uB9C8\uC6B0\uC2A4 \uCE21\uBA74 \uBC84\uD2BC\uC744 \uC4F8 \uC218 \uC788\uC2B5\uB2C8\uB2E4\u2026(Esc\uB85C \uCDE8\uC18C)",
    listening: "\uB4E3\uB294 \uC911",
    waitingKey: "\uB9D0\uD558\uAE30 \uD0A4 \uB300\uAE30 \uC911",
    results: "\uB4E4\uC740 \uB0B4\uC6A9",
    resultsHint: "\uCDE8\uC18C\uC120\uC774 \uADF8\uC5B4\uC9C4 \uC904\uC740 \uB108\uBB34 \uC9E7\uAC70\uB098 \uD658\uAC01\uC73C\uB85C \uBCF4\uC5EC \uBCF4\uB0B4\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    talkKeyName: "\uB9D0\uD558\uAE30 \uD0A4",
    changeKey: "\uBCC0\uACBD",
    cancelKey: "\uCDE8\uC18C",
    level: "\uC785\uB825 \uC74C\uB7C9",
    thresholdHint: "\uC774 \uC120\uBCF4\uB2E4 \uD070 \uC18C\uB9AC\uB9CC \uB9D0\uC18C\uB9AC\uB85C \uCE69\uB2C8\uB2E4. \uB2E4\uB978 \uC0AC\uB78C\uC774 \uC0AC\uC6A9\uC790\uB9CC\uD07C \uD06C\uAC8C \uB9D0\uD558\uBA74 \uADF8 \uB9D0\uB3C4 \uC778\uC2DD\uB429\uB2C8\uB2E4",
    noResults: "\uC544\uC9C1 \uC778\uC2DD \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4"
  },
  chat: {
    badImages: "\uC774 \uD398\uC774\uC9C0\uC5D0\uC11C \uBCF4\uB0B4\uB294 \uD615\uC2DD\uC758 \uC774\uBBF8\uC9C0\uAC00 \uC544\uB2D9\uB2C8\uB2E4",
    tooManyImages: (max2) => `\uD55C \uBC88\uC5D0 \uC774\uBBF8\uC9C0\uB294 \uCD5C\uB300 ${max2}\uC7A5\uC785\uB2C8\uB2E4`,
    badMime: (mime) => `\uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC774\uBBF8\uC9C0 \uD615\uC2DD ${mime}`,
    emptyImage: "\uC774\uBBF8\uC9C0 \uC911 \uD558\uB098\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4",
    bigImage: (mb) => `\uC774\uBBF8\uC9C0\uB294 \uD55C \uC7A5\uB2F9 ${mb} MB \uBBF8\uB9CC\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`,
    offline: "\uC544\uC9C1 \uC5F0\uACB0\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4",
    notSent: "\uBCF4\uB0B4\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4",
    tooLate: "\uC774\uBBF8 \uC804\uB2EC\uB41C \uBA54\uC2DC\uC9C0\uB77C \uB418\uB3CC\uB9B4 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
  }
};
var ko_default = ko;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/fr.ts
var fr = {
  defaultUser: "Partenaire",
  menu: {
    quit: "Quitter",
    quitPrompt: (label) => `${label} ?`
  },
  busy: "Travaille",
  voice: {
    starting: "La reconnaissance vocale d\xE9marre",
    notRunning: "La reconnaissance vocale n'est pas lanc\xE9e",
    modelMissing: (mb) => `Le mod\xE8le vocal n'est pas encore t\xE9l\xE9charg\xE9 (environ ${mb} Mo) : t\xE9l\xE9chargez-le sur la page Saisie vocale`,
    badKey: (hotkey) => `Touche inconnue \xAB ${hotkey} \xBB`,
    keyProblem: (problem) => `La touche de parole est indisponible, la parole n'est donc pas reconnue pour l'instant : ${problem}`,
    always: "\xC9coute continue : parlez, tout simplement",
    toggleTaps: (label, taps) => `${label} pour commencer l'\xE9coute, encore un ${taps === 2 ? "double" : "triple"} appui pour arr\xEAter`,
    toggle: (key) => `Appuyez sur ${key} pour commencer l'\xE9coute, appuyez \xE0 nouveau pour arr\xEAter`,
    holdTaps: (key, taps) => `Appuyez ${taps === 2 ? "une fois" : "deux fois"} sur ${key}, puis maintenez-la et parlez ; rel\xE2chez pour envoyer`,
    hold: (key) => `Maintenez ${key} et parlez ; rel\xE2chez pour envoyer`,
    failedLine: (error) => `[\xE9chec] ${error}`
  },
  keys: {
    LeftCtrl: "Ctrl gauche",
    RightCtrl: "Ctrl droit",
    LeftAlt: "Alt gauche",
    RightAlt: "Alt droit",
    LeftShift: "Maj gauche",
    RightShift: "Maj droit",
    RightWin: "Win droit",
    Backquote: "`",
    Mouse3: "Bouton central de la souris",
    Mouse4: "Bouton 4 de la souris",
    Mouse5: "Bouton 5 de la souris"
  },
  macKeys: {
    Ctrl: "Contr\xF4le",
    LeftCtrl: "Contr\xF4le gauche",
    RightCtrl: "Contr\xF4le droit",
    Alt: "Option",
    LeftAlt: "Option gauche",
    RightAlt: "Option droit",
    Win: "Commande",
    RightWin: "Commande droit"
  },
  taps: (taps, keys) => `${taps === 2 ? "Double" : "Triple"} appui sur ${keys}`,
  hotkey: {
    cannotRead: (why) => `Impossible de lire le clavier : ${why}`,
    macNoKey: "Un clavier Mac n'a pas cette touche ; choisissez une autre touche de parole",
    macPermission: "Pas d'autorisation Surveillance de l'entr\xE9e : activez Coopanion dans R\xE9glages Syst\xE8me \u2192 Confidentialit\xE9 et s\xE9curit\xE9 \u2192 Surveillance de l'entr\xE9e, puis red\xE9marrez-le. S'il est d\xE9j\xE0 activ\xE9, retirez Coopanion de la liste avec \xAB \u2212 \xBB et ajoutez-le de nouveau : une version mise \xE0 jour n'h\xE9rite pas de l'ancienne autorisation",
    linuxNoKey: "Linux ne peut pas lire cette touche (les boutons lat\xE9raux de la souris ne fonctionnent pas) ; choisissez une autre touche de parole",
    linuxNoDisplay: "La touche de parole n\xE9cessite X11 (ou XWayland) sous Linux : DISPLAY n'est pas d\xE9fini",
    linuxNoX11: "La touche de parole ne peut pas se connecter \xE0 l'affichage X11",
    unsupported: "La touche de parole ne fonctionne que sous Windows, macOS et Linux"
  },
  typeKey: {
    macNoKey: "Un clavier Mac n'a pas cette touche ; choisissez une autre touche de saisie",
    linuxNoKey: "Linux ne peut pas lire cette touche (les boutons lat\xE9raux de la souris ne fonctionnent pas) ; choisissez une autre touche de saisie",
    linuxNoDisplay: "La touche de saisie n\xE9cessite X11 (ou XWayland) sous Linux : DISPLAY n'est pas d\xE9fini",
    linuxNoX11: "La touche de saisie ne peut pas se connecter \xE0 l'affichage X11",
    unsupported: "La touche de saisie ne fonctionne que sous Windows, macOS et Linux"
  },
  system: {
    name: (culture) => culture ? `Reconnaissance vocale Windows (${culture})` : "Reconnaissance vocale Windows",
    noSpeech: "Le composant System.Speech ne se charge pas",
    noRecognizer: (language) => `Windows n'a pas de reconnaissance vocale${language === "auto" ? "" : ` pour \xAB ${language} \xBB`} : ajoutez la reconnaissance vocale de cette langue dans Param\xE8tres Windows \u2192 Heure et langue \u2192 Langue`,
    windowsOnly: "La reconnaissance vocale Windows n'existe que sous Windows",
    startFailed: (why) => `\xC9chec du d\xE9marrage : ${why}`,
    exited: "Le processus de reconnaissance vocale s'est arr\xEAt\xE9",
    exitedCode: (code) => `Le processus de reconnaissance vocale s'est arr\xEAt\xE9 (code de sortie ${code})`,
    notReady: "La reconnaissance vocale Windows n'a pas \xE9t\xE9 pr\xEAte \xE0 temps",
    notRunning: "La reconnaissance vocale Windows n'est pas lanc\xE9e",
    timeout: (ms) => `D\xE9lai de reconnaissance d\xE9pass\xE9 (${ms} ms)`,
    stopped: "La reconnaissance vocale Windows s'est arr\xEAt\xE9e"
  },
  sherpa: {
    incomplete: "Des fichiers du mod\xE8le vocal manquent : t\xE9l\xE9chargez-le \xE0 nouveau",
    noRuntime: (platform) => `sherpa-onnx n'a pas d'environnement d'ex\xE9cution pour cette plateforme (${platform})`,
    loadFailed: (why) => `\xC9chec du chargement du mod\xE8le vocal : ${why}`,
    notLoaded: "Le mod\xE8le vocal n'est pas charg\xE9"
  },
  /** Le service de transcription compatible OpenAI (moteur api) */
  transcription: {
    noUrl: "L'adresse du service de transcription n'est pas renseign\xE9e",
    badUrl: (url) => `L'adresse n'est pas une URL http ou https : ${url}`,
    httpRemote: "Une adresse distante doit utiliser https : http n'est pas chiffr\xE9, l'API Key et les enregistrements circuleraient en clair. Les adresses de cet ordinateur ou du r\xE9seau local peuvent utiliser http.",
    noModel: "Le mod\xE8le de transcription n'est pas renseign\xE9",
    notRunning: "Le service de transcription n'est pas d\xE9marr\xE9",
    status: (status, message) => message ? `HTTP ${status} : ${message}` : `HTTP ${status}`,
    timeout: (ms) => `Le service n'a pas r\xE9pondu en ${ms} ms`,
    network: (why) => `Impossible de joindre le service : ${why}`,
    noText: "Le service a r\xE9pondu sans text"
  },
  store: {
    noBuild: (platform) => `Aucun paquet pr\xE9compil\xE9 pour ${platform}`,
    downloading: (file) => `T\xE9l\xE9chargement de ${file}`,
    unpacking: "D\xE9compression",
    downloadingModel: "T\xE9l\xE9chargement du mod\xE8le vocal",
    downloadingFrom: (file, host) => `T\xE9l\xE9chargement de ${file} (${host})`,
    verifying: (file) => `V\xE9rification de ${file}`,
    mismatch: (sum) => `Somme de contr\xF4le incorrecte : ${sum}\u2026`,
    failed: (file, why) => `\xC9chec du t\xE9l\xE9chargement de ${file} (${why})`,
    exitCode: (cmd, code, out) => `${cmd} code de sortie ${code} : ${out}`
  },
  packs: {
    noManifest: (file) => `${file} absent`,
    badJson: (file, why) => `${file} n'est pas un JSON valide : ${why}`,
    notInteger: (key, got) => `${key} doit \xEAtre un entier, pas ${got}`,
    tooNew: (key, v, now) => `${key} vaut ${v} ; cette version lit jusqu'\xE0 ${now} : mettez d'abord l'application \xE0 jour`,
    tooOld: (key, v, oldest) => `${key} ${v} est un format de test ant\xE9rieur \xE0 ${oldest} et ne peut pas \xEAtre lu`,
    badId: (got) => `id invalide : ${got}`,
    noName: "name manquant",
    noAbout: "about manquant",
    badEntry: "entry ou export invalide",
    badModel: "Le chemin model est invalide",
    badThumb: "Le chemin thumb est invalide",
    badAxis: (got) => `Entr\xE9e invalide dans axes : ${got}`,
    badOption: (axis, got) => `Option invalide dans axes.${axis} : ${got}`,
    badPreset: (got) => `Entr\xE9e invalide dans presets : ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} ne choisit aucune option pour ${axis}`,
    vocabNotArray: "vocab doit \xEAtre un tableau",
    badWordId: (got) => `id invalide dans vocab : ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind vaut ${kind}, que cette version ne conna\xEEt pas ; le bot ne re\xE7oit pas ce mot`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} doit \xEAtre un tableau`,
    badWordName: (id, got) => `Nom invalide dans vocab.${id} : ${got}`,
    nameTaken: (name) => `${name} d\xE9signe plusieurs mots dans vocab`,
    noWordAbout: (id) => `vocab.${id}.about manquant`,
    badSeconds: (id) => `vocab.${id}.seconds doit \xEAtre un nombre positif`,
    soundsNotObject: "sounds doit \xEAtre un objet",
    badSoundName: (got) => `Nom invalide dans sounds : ${got}`,
    badSoundFile: (name) => `sounds.${name}.file doit \xEAtre un fichier du pack`,
    badVolume: (name) => `sounds.${name}.volume doit \xEAtre compris entre 0 et 1`,
    soundType: (name, file) => `${file} de sounds.${name} n'est pas un .ogg, .mp3 ou .wav que cette version sait lire ; le son reste muet`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind vaut ${kind} ; cette version ne conna\xEEt que ${kinds.join(", ")}, le son reste donc muet`,
    soundMissing: (name, file) => `${file} de sounds.${name} n'existe pas ; le son reste muet`,
    badWalk: (got) => `can.walk vaut ${got}, que cette version ne conna\xEEt pas ; consid\xE9r\xE9 comme capable de marcher`,
    movesNotArray: "moves doit \xEAtre un tableau",
    tooManyMoves: (max2) => `moves contient au plus ${max2} destinations`,
    badMoveId: (got) => `id invalide dans moves : ${got} (left, center, right, cursor et les nombres sont les destinations par d\xE9faut)`,
    moveTaken: (id) => `${id} appara\xEEt plus d\u2019une fois dans moves`,
    noMoveText: (id) => `moves.${id} n\u2019a pas de name ou d\u2019about`,
    badMoveParams: (id, max2) => `moves.${id}.params doit \xEAtre un tableau d\u2019au plus ${max2} \xE9l\xE9ments, chacun avec un id, un about et des nombres min inf\xE9rieur \xE0 max`,
    needsNotArray: "needs doit \xEAtre un tableau",
    unknownNeed: (got) => `${got} dans needs n\u2019est pas fourni par cette version et est ignor\xE9`,
    idTaken: (id, builtin) => `l'id ${id} est d\xE9j\xE0 pris par ${builtin ? "un personnage int\xE9gr\xE9" : "un autre pack"}`
  },
  importing: {
    badZip: (why) => `Zip illisible : ${why}`,
    tooBig: (mb) => `Plus de ${mb} Mo une fois d\xE9compress\xE9`,
    truncated: "L'envoi est incomplet",
    badPath: (path) => `Un chemin est inutilisable : ${path}`,
    builtinId: (id) => `l'id ${id} appartient \xE0 un personnage int\xE9gr\xE9 ; changez l'id pour l'importer`,
    duplicateId: (id) => `l'id ${id} est identique \xE0 celui d'un autre pack de cette importation`,
    unpackFailed: (why) => `D\xE9compression impossible : ${why}`,
    expired: "Cette importation a expir\xE9 ; choisissez \xE0 nouveau les fichiers",
    noneChosen: "Aucun pack choisi",
    zipOrFolder: "Seuls un zip ou des dossiers peuvent \xEAtre import\xE9s",
    overLimit: (mb) => `Plus de ${mb} Mo`
  },
  removing: {
    notInstalled: (id) => `Aucun pack de personnage n'a l'id ${id}`,
    builtin: (id) => `${id} est un personnage int\xE9gr\xE9 et ne peut pas \xEAtre d\xE9sinstall\xE9`,
    elsewhere: (id) => `${id} n'est pas dans le dossier d'installation des packs de personnage ; impossible de le d\xE9sinstaller ici`,
    failed: (why) => `Suppression impossible : ${why}`
  },
  consent: {
    question: (items) => `Je peux ${items.join(", ")} ?`,
    choices: ["Oui", "Oui, toujours", "Non merci"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis} : ${option}`,
    figure: (to) => `prendre l'apparence de ${to}`,
    scheme: (figure, look) => `changer de tenue ${figure} (${look})`,
    roam: { free: "Souvent", calm: "De temps en temps", off: "Reste sur place" },
    roamTo: (to) => `r\xE9gler mes d\xE9placements sur \xAB ${to} \xBB`,
    snore: (seconds) => seconds === 0 ? "ronfler jusqu'au r\xE9veil" : `ronfler ${seconds} s \xE0 chaque sieste`,
    sound: (on) => on ? "activer les sons" : "couper les sons",
    scale: (from, to) => `passer de la taille ${from}\xD7 \xE0 ${to}\xD7`,
    bubbleSize: (from, to) => `passer la taille des bulles de ${from}\xD7 \xE0 ${to}\xD7`,
    fontSize: (from, to) => `passer la taille du texte de ${from}\xD7 \xE0 ${to}\xD7`,
    theme: { dark: "passer \xE0 l'aspect nuit", light: "passer \xE0 l'aspect jour" },
    hover: (list) => `mettre comme boutons au survol : ${list}`,
    actions: { chat: "\xC9crire", voice: "Saisie vocale", roam: "D\xE9placements", theme: "Mode nuit", sound: "Sons", dress: "Habiller", hide: "Masquer le compagnon" },
    user: (to) => `vous appeler \xAB ${to} \xBB`
  },
  portsTaken: (from, to, why) => `Les ports ${from}\u2013${to} sont tous occup\xE9s : ${why}`,
  console: {
    label: "Compagnon de bureau",
    window: "Fen\xEAtre du compagnon",
    connected: "Page connect\xE9e",
    notOpen: "Non ouverte",
    noBody: (reason) => `Page connect\xE9e, le personnage ne peut pas \xEAtre dessin\xE9 : ${reason}`,
    alsoBrowser: (hint) => `${hint} ; une page du navigateur est connect\xE9e`,
    voice: "Reconnaissance vocale",
    notStarted: "Non d\xE9marr\xE9e",
    viewInBrowser: "Voir le compagnon dans le navigateur",
    dress: "Habiller",
    panels: {
      pet: { title: "Compagnon de bureau", description: "La fen\xEAtre, la tenue et l'environnement d'ex\xE9cution de la fen\xEAtre." },
      voice: { title: "Saisie vocale", description: "Moteur de reconnaissance, niveau d'entr\xE9e et ce qui a \xE9t\xE9 entendu." }
    },
    envPrompt: { title: "Environnement du compagnon de bureau", description: "D\xE9crit le corps du compagnon, les quatre outils et les \xE9v\xE9nements d'entr\xE9e." },
    vars: {
      "pet.user": "Comment le bot appelle la personne",
      "pet.vocab": "Les expressions et mouvements du personnage actuel",
      "pet.moves": "Les destinations propres au personnage actuel (pet_move_to) ; vide s\u2019il n\u2019en a pas",
      "pet.voice": "Si la saisie vocale est activ\xE9e ou non",
      "pet.body": "L'apparence du personnage actuel",
      "pet.dress": "Les personnages et tenues que pet_set peut choisir",
      "pet.self": "Autor\xE9glage : quels r\xE9glages changent directement, lesquels attendent votre accord, ou qu'aucun ne peut changer",
      "pet.chat": "Une note sur la page de discussion quand l'application en a une ; vide sinon",
      "pet.reply": "Une ligne qui indique au bot dans quelle langue parler quand la langue de l'application n'est ni le chinois simplifi\xE9 ni l'anglais ; vide sinon",
      "pet.cua": "La partie contr\xF4le de l'ordinateur : coordonn\xE9es des captures d'\xE9cran, quand demander d'abord \xE0 la personne, r\xE8gles pour ne pas la g\xEAner ; vide quand le contr\xF4le de l'ordinateur est d\xE9sactiv\xE9"
    },
    noGuide: "Cette application n'a pas d'introduction",
    unknownMethod: (name) => `M\xE9thode inconnue ${name}`
  },
  config: {
    group: "Compagnon de bureau",
    soundGroup: "Sons",
    asrGroup: "Saisie vocale",
    user: { title: "Comment vous appeler", description: (max2) => `Le nom par lequel les \xE9v\xE9nements vocaux, \xE9crits et tactiles vous d\xE9signent, jusqu'\xE0 ${max2} caract\xE8res. Vide : le nom par d\xE9faut.` },
    roam: { title: "D\xE9placements", description: "free se prom\xE8ne souvent ; calm reste sur place la plupart du temps ; off ne bouge que sur demande." },
    theme: { title: "Mode nuit", description: "dark est la nuit : corps clair et bulles sombres ; light est le jour : corps sombre et bulles claires." },
    rememberPosition: { title: "M\xE9moriser la position", description: "Enregistre la position horizontale du compagnon quand l'application se ferme, pour un d\xE9marrage au m\xEAme endroit la fois suivante ; avec plusieurs \xE9crans, le d\xE9marrage se fait toujours sur l'\xE9cran principal." },
    hoverButtons: { title: "Boutons au survol", description: (max2, ids) => `Boutons \xE0 c\xF4t\xE9 du compagnon quand le pointeur est pos\xE9 dessus, jusqu'\xE0 ${max2}, s\xE9par\xE9s par des virgules : ${ids}.` },
    doubleClickChat: { title: "Double-clic pour \xE9crire", description: "Double-cliquer sur le compagnon ouvre la zone de saisie." },
    statusBubble: { title: "Bulle d'\xE9tat", description: "Montre ce que fait le compagnon pendant la r\xE9flexion, la consultation de la m\xE9moire ou l'utilisation de l'ordinateur, noms de fichiers compris." },
    saidBubbles: { title: "Bulles de saisie", description: "Ce qui est tap\xE9, dit ou envoy\xE9 depuis la page de discussion s'affiche au-dessus du compagnon jusqu'\xE0 la r\xE9ponse. D\xE9sactiv\xE9, la parole ne s'affiche que pendant la reconnaissance." },
    selfAdjust: { title: "Autor\xE9glage", description: "off : aucun changement de r\xE9glage ni mise au calme pour un moment \xE0 l'initiative de Coo. default : personnage, tenue, d\xE9placements et ronflements changent directement ; taille, taille des bulles, taille du texte, sons, mode nuit, boutons au survol et la fa\xE7on de vous appeler attendent votre accord. any : tout change directement. custom : selon les cases coch\xE9es sur la page Habitudes ; ce qui est coch\xE9 change directement, le reste attend votre accord." },
    windowEnabled: { title: "Ouvrir la fen\xEAtre du compagnon au d\xE9marrage" },
    scale: { title: "Taille" },
    bubbleSize: { title: "Taille des bulles", description: "Largeur, marges, coins et pointe des bulles du compagnon et des v\xF4tres, 1 par d\xE9faut ; le texte garde sa taille." },
    fontSize: { title: "Taille du texte", description: "Taille du texte dans les bulles, 1 par d\xE9faut ; les bulles gardent leur largeur." },
    bubbleSpeed: { title: "Vitesse des bulles", description: "Vitesse d'\xE9criture des bulles du compagnon et dur\xE9e d'affichage, 1 par d\xE9faut ; plus la valeur est grande, plus c'est rapide." },
    glow: { title: "Halo", description: "Port\xE9e en pixels du halo clair autour du compagnon quand les couleurs de Coo se confondent avec l'arri\xE8re-plan ; 0 le d\xE9sactive." },
    frameRate: { title: "Fr\xE9quence d'images", description: "Images par seconde quand le compagnon marche, saute ou se fait porter ; 0 suit l'\xE9cran. Au-del\xE0 de la fr\xE9quence de rafra\xEEchissement de l'\xE9cran, celle de l'\xE9cran s'applique. La page Habitudes propose 60, 120, 144 et Illimit\xE9e." },
    lockFrameRate: { title: "Verrouiller la fr\xE9quence", description: "Dessine aussi le compagnon \xE0 cette fr\xE9quence au repos. D\xE9sactiv\xE9, elle descend \xE0 30 images par seconde quand le compagnon se tient debout, s'assoit ou dort." },
    hideWhenFullscreen: { title: "Masquer en plein \xE9cran", description: "Activ\xE9, le compagnon se cache quand la fen\xEAtre au premier plan remplit l'\xE9cran de Coo (un jeu, une vid\xE9o en plein \xE9cran, un navigateur en plein \xE9cran) et revient \xE0 la fin du plein \xE9cran ; une fen\xEAtre agrandie ne compte pas. D\xE9sactiv\xE9, le compagnon reste toujours au premier plan." },
    exportOverlay: { title: "Overlay OBS", description: "Sert l'image de la fen\xEAtre du compagnon sur fond transparent \xE0 /overlay pour une source \xAB Navigateur \xBB d'OBS ; d\xE9sactiv\xE9, rien n'est servi." },
    electronFile: { title: "Ex\xE9cutable Electron", description: "Vide : CORTICO_DESKTOP_PET_HOST, puis l'environnement d'ex\xE9cution install\xE9 depuis le panneau." },
    port: { title: "Port de la page", description: "Passe au port libre suivant s'il est occup\xE9." },
    touchEnabled: { title: "Les contacts deviennent des \xE9v\xE9nements", description: "Petits coups, caresses, se faire soulever et lancer." },
    touchWakeOn: { title: "Mode de r\xE9ponse", description: "poke : seul un petit coup obtient une r\xE9ponse imm\xE9diate ; les autres contacts attendent la prochaine r\xE9ponse. all : chaque contact obtient une r\xE9ponse imm\xE9diate. none : chaque contact attend la prochaine r\xE9ponse. custom : les contacts coch\xE9s sur la page Habitudes obtiennent une r\xE9ponse imm\xE9diate. Apr\xE8s une r\xE9ponse, les contacts jusqu\u2019\xE0 la fin de ce tour attendent la suivante." },
    sound: { title: "Tous les sons", description: "Le bouton son du menu du compagnon bascule ce r\xE9glage." },
    sounds: {
      move: { title: "Mouvements", description: "Marcher, courir, sauter, atterrir, se faire lancer, hocher la t\xEAte, la secouer, tourner, vertige, frissons, danser, regarder autour." },
      touch: { title: "Contact", description: "Se faire soulever, balancer, caresser, tapoter." },
      face: { title: "Expressions", description: "Joie, clin d'\u0153il, amour, surprise, col\xE8re, tristesse, timidit\xE9, b\xE2illement." },
      snore: { title: "Ronflements", description: "" },
      talk: { title: "Parole", description: "Le babillage \xE0 l'apparition du texte des bulles, et les cartes de choix qui surgissent." },
      ui: { title: "Boutons et signaux", description: "Clics de boutons, ouverture des bulles, s\xE9lections, d\xE9but et fin de l'\xE9coute." }
    },
    snoreSeconds: { title: "Dur\xE9e des ronflements", suffix: "s", description: "\xC0 chaque sommeil, le compagnon se tait apr\xE8s avoir ronfl\xE9 ce temps ; les z continuent de flotter. 0 = ronfler jusqu'au r\xE9veil." },
    speech: { title: "Voix", description: "Prononce une syllabe \xE0 chaque caract\xE8re qui appara\xEEt dans une bulle, \xE0 la place du babil de Parole ; muette quand les sons Parole sont coup\xE9s." },
    speechPitch: { title: "Hauteur de la voix", description: (a, b, c) => `low, mid et high valent ${a}, ${b} et ${c} Hz ; custom utilise la hauteur personnalis\xE9e.` },
    speechPitchHz: { title: "Hauteur personnalis\xE9e" },
    speechSpeed: { title: "D\xE9bit de la voix", description: (a, b, c) => `Syllabes par seconde au plus : low, mid et high valent ${a}, ${b} et ${c} ; custom utilise le d\xE9bit personnalis\xE9. Plus lente que le texte, la voix finit apr\xE8s lui.` },
    speechRate: { title: "D\xE9bit personnalis\xE9", suffix: "syllabes/s" },
    asrEnabled: { title: "Saisie vocale" },
    asrEngine: { title: "Moteur de reconnaissance", description: "funasr ex\xE9cute SenseVoiceSmall de FunASR, pour le chinois, l'anglais, le japonais, le cor\xE9en et le cantonais, apr\xE8s un t\xE9l\xE9chargement unique d'environ 240 Mo ; whisper ex\xE9cute Whisper small d'OpenAI, pour le fran\xE7ais, l'allemand, l'espagnol, le portugais, l'italien, le russe et environ 90 autres langues, apr\xE8s un t\xE9l\xE9chargement unique d'environ 360 Mo, et affiche le texte une fois la phrase termin\xE9e ; les deux reconnaissent sur cet ordinateur. system utilise la reconnaissance vocale de Windows, sans t\xE9l\xE9chargement et moins pr\xE9cise (Windows uniquement). api envoie l'enregistrement de chaque phrase \xE0 un service de transcription compatible OpenAI et affiche le texte une fois la phrase termin\xE9e ; son adresse et son mod\xE8le se r\xE8glent ci-dessous, son API Key sur la page Saisie vocale. Vide : choix selon la langue de l'application, funasr pour le chinois, l'anglais, le japonais et le cor\xE9en, whisper pour les autres." },
    asrLanguage: { title: "Langue", description: "Un code ISO 639-1, ou auto pour laisser le mod\xE8le d\xE9cider ; vide suit la langue de l'application. FunASR accepte zh, en, ja, ko et yue, Whisper une centaine de codes comme fr, de, es, pt, it et ru ; un code que le mod\xE8le n'accepte pas vaut auto. Le service de transcription ne re\xE7oit le code que s'il a deux lettres." },
    asrApiUrl: { title: "Adresse du service de transcription", description: "Avec le moteur api, chaque phrase est envoy\xE9e \xE0 /audio/transcriptions sous cette adresse, par exemple https://api.example.com/v1. Une adresse distante doit utiliser https ; les adresses de cet ordinateur ou du r\xE9seau local peuvent utiliser http." },
    asrApiModel: { title: "Mod\xE8le de transcription", description: "Le mod\xE8le indiqu\xE9 dans les requ\xEAtes avec le moteur api." },
    asrThreads: { title: "Threads CPU", description: "Threads utilis\xE9s par FunASR et Whisper pour une reconnaissance ; 0 = 2." },
    asrSimplified: { title: "Convertir en simplifi\xE9", description: "Convertit en caract\xE8res simplifi\xE9s les caract\xE8res traditionnels entendus quand la langue de l'application est le chinois simplifi\xE9." },
    thresholdDb: { title: "Seuil de parole" },
    silenceMs: { title: "Silence qui termine une phrase" },
    maxUtteranceMs: { title: "Phrase la plus longue" }
  },
  panel: {
    pet: "Compagnon de bureau",
    window: "Fen\xEAtre du compagnon",
    openWindow: "Ouvrir la fen\xEAtre",
    closeWindow: "Fermer la fen\xEAtre",
    runtime: "Environnement d'ex\xE9cution",
    install: "Installer",
    viewInBrowser: "Voir dans le navigateur",
    dress: "Habiller",
    dressHint: "Les modifications sont enregistr\xE9es aussit\xF4t et transmises \xE0 la fen\xEAtre du compagnon",
    connected: "Connect\xE9e",
    starting: "D\xE9marrage",
    cannotOpen: "Ouverture impossible",
    notOpen: "Non ouverte",
    external: "Programme externe utilis\xE9",
    installed: "Install\xE9",
    downloading: (progress) => `T\xE9l\xE9chargement ${progress}`,
    installFailed: "\xC9chec de l'installation",
    notInstalled: "Non install\xE9",
    noBuild: "Aucun paquet pr\xE9compil\xE9 pour cette plateforme",
    electronSize: "Electron 44.4.4, environ 150 Mo",
    voice: "Saisie vocale",
    enable: "Activer la saisie vocale",
    enabledHint: "Le micro reste ouvert ; ce que vous dites va \xE0 Coo selon le mode d'\xE9coute",
    enabledHintOnPress: "Le micro s'ouvre tant que la touche de parole est maintenue et se ferme au rel\xE2chement",
    disabledHint: "D\xE9sactiv\xE9e : le micro reste ferm\xE9, et les r\xE9glages ci-dessous attendent",
    engine: "Moteur de reconnaissance",
    funasr: "FunASR (sur cet ordinateur)",
    system: "Int\xE9gr\xE9e \xE0 Windows",
    whisper: "Whisper (sur cet ordinateur)",
    systemHint: "Rien \xE0 t\xE9l\xE9charger, pr\xE9cision correcte ; passez \xE0 FunASR ou Whisper pour de meilleurs r\xE9sultats",
    funasrHint: "SenseVoiceSmall sur cet ordinateur, pour le chinois, l'anglais, le japonais, le cor\xE9en et le cantonais",
    whisperHint: "Whisper small sur cet ordinateur, pour le fran\xE7ais, l'allemand, l'espagnol, le portugais, l'italien, le russe et d'autres ; le texte s'affiche une fois la phrase termin\xE9e",
    api: "Service de transcription (compatible OpenAI)",
    apiName: "Service de transcription",
    apiHint: "Chaque phrase est envoy\xE9e au service r\xE9gl\xE9 ci-dessous ; le texte s'affiche une fois la phrase termin\xE9e",
    apiUrl: "Adresse",
    apiModel: "Mod\xE8le",
    apiKey: "API Key",
    keySaved: "Enregistr\xE9e",
    keyMissing: "Non renseign\xE9e",
    server: "Service de reconnaissance",
    start: "D\xE9marrer",
    stop: "Arr\xEAter",
    ready: "Pr\xEAt",
    error: "Erreur",
    stopped: "Arr\xEAt\xE9",
    model: "Mod\xE8le vocal",
    download: "T\xE9l\xE9charger",
    retry: "R\xE9essayer",
    downloadFailed: "\xC9chec du t\xE9l\xE9chargement",
    downloaded: "T\xE9l\xE9charg\xE9",
    notDownloaded: "Non t\xE9l\xE9charg\xE9",
    modelSource: (size) => `Environ ${size}, t\xE9l\xE9charg\xE9 depuis ModelScope`,
    mic: "Micro",
    micStates: { on: "\xC9coute", off: "N'\xE9coute pas", denied: "Refus\xE9", error: "Erreur" },
    defaultDevice: "D\xE9faut du syst\xE8me",
    missingDevice: "L'appareil choisi auparavant (introuvable)",
    micN: (n) => `Micro ${n}`,
    mode: "Mode d'\xE9coute",
    modes: { hold: "Tant que la touche de parole est maintenue", toggle: "La touche de parole l'active et la d\xE9sactive", always: "En continu" },
    openOnPress: "N'ouvrir le micro que pendant l'appui",
    openOnPressHint: "Pour les casques, Bluetooth par exemple, qui passent en mode appel quand le micro est ouvert ; apr\xE8s l'appui, attendez un instant avant de parler, sinon les premiers mots peuvent manquer",
    switchOn: "Activ\xE9",
    switchOff: "D\xE9sactiv\xE9",
    presses: {
      2: { hold: "Double appui puis maintien", toggle: "Double appui pour commencer, encore pour arr\xEAter" },
      1: { hold: "Simple maintien", toggle: "Appui pour commencer, nouvel appui pour arr\xEAter" },
      3: { hold: "Triple appui puis maintien", toggle: "Triple appui pour commencer, encore pour arr\xEAter" }
    },
    capture: "Appuyez sur la nouvelle touche de parole : une combinaison de touches ou un bouton lat\xE9ral de la souris\u2026 (\xC9chap pour annuler)",
    listening: "\xC9coute",
    waitingKey: "En attente de la touche de parole",
    results: "Ce qui a \xE9t\xE9 entendu",
    resultsHint: "Les lignes barr\xE9es \xE9taient trop courtes ou probablement hallucin\xE9es, et n'ont pas \xE9t\xE9 envoy\xE9es",
    talkKeyName: "Touche de parole",
    changeKey: "Modifier",
    cancelKey: "Annuler",
    level: "Niveau d'entr\xE9e",
    thresholdHint: "Seul un son plus fort que ce trait compte comme parole ; quelqu'un d'autre qui parle aussi fort que vous est entendu aussi",
    noResults: "Rien de reconnu pour le moment"
  },
  chat: {
    badImages: "Les images ne sont pas dans un format que cette page envoie",
    tooManyImages: (max2) => `Au plus ${max2} images \xE0 la fois`,
    badMime: (mime) => `Type d'image non pris en charge ${mime}`,
    emptyImage: "L'une des images est vide",
    bigImage: (mb) => `Chaque image doit faire moins de ${mb} Mo`,
    offline: "Pas encore connect\xE9",
    notSent: "Envoi impossible",
    tooLate: "Ce message a d\xE9j\xE0 \xE9t\xE9 remis et ne peut plus \xEAtre repris."
  }
};
var fr_default = fr;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/de.ts
var de = {
  defaultUser: "Kumpel",
  menu: {
    quit: "Beenden",
    quitPrompt: (label) => `${label}?`
  },
  busy: "Arbeitet",
  voice: {
    starting: "Spracherkennung startet",
    notRunning: "Spracherkennung l\xE4uft nicht",
    modelMissing: (mb) => `Das Sprachmodell ist noch nicht heruntergeladen (etwa ${mb} MB): Lade es auf der Seite Spracheingabe herunter`,
    badKey: (hotkey) => `Unbekannte Taste \u201E${hotkey}\u201C`,
    keyProblem: (problem) => `Die Sprechtaste ist nicht verf\xFCgbar, deshalb wird Sprache vorerst nicht erkannt: ${problem}`,
    always: "Ich h\xF6re immer zu: Sprich einfach",
    toggleTaps: (label, taps) => `${label}, um zuzuh\xF6ren; zum Beenden wieder ${taps === 2 ? "zweimal" : "dreimal"} dr\xFCcken`,
    toggle: (key) => `Dr\xFCck ${key}, um zuzuh\xF6ren, und noch einmal, um aufzuh\xF6ren`,
    holdTaps: (key, taps) => `Dr\xFCck ${key} ${taps === 2 ? "einmal" : "zweimal"} kurz, dann halte die Taste gedr\xFCckt und sprich; loslassen zum Senden`,
    hold: (key) => `Halte ${key} gedr\xFCckt und sprich; loslassen zum Senden`,
    failedLine: (error) => `[fehlgeschlagen] ${error}`
  },
  keys: {
    LeftCtrl: "Strg links",
    RightCtrl: "Strg rechts",
    LeftAlt: "Alt links",
    RightAlt: "Alt rechts",
    LeftShift: "Umschalt links",
    RightShift: "Umschalt rechts",
    RightWin: "Win rechts",
    Backquote: "`",
    Mouse3: "Mittlere Maustaste",
    Mouse4: "Maustaste 4",
    Mouse5: "Maustaste 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "Control links",
    RightCtrl: "Control rechts",
    Alt: "Wahltaste",
    LeftAlt: "Wahltaste links",
    RightAlt: "Wahltaste rechts",
    Win: "Befehlstaste",
    RightWin: "Befehlstaste rechts"
  },
  taps: (taps, keys) => `${keys} ${taps === 2 ? "zweimal" : "dreimal"} dr\xFCcken`,
  hotkey: {
    cannotRead: (why) => `Die Tastatur kann nicht gelesen werden: ${why}`,
    macNoKey: "Eine Mac-Tastatur hat diese Taste nicht; w\xE4hle eine andere Sprechtaste",
    macPermission: "Keine Berechtigung f\xFCr Eingabe\xFCberwachung: Schalte Coopanion unter Systemeinstellungen \u2192 Datenschutz & Sicherheit \u2192 Eingabe\xFCberwachung ein und starte es dann neu. Ist es schon eingeschaltet, entferne Coopanion mit \u201E\u2212\u201C aus der Liste und f\xFCge es wieder hinzu: Eine aktualisierte Version \xFCbernimmt die alte Berechtigung nicht",
    linuxNoKey: "Linux kann diese Taste nicht lesen (Maus-Seitentasten funktionieren nicht); w\xE4hle eine andere Sprechtaste",
    linuxNoDisplay: "Die Sprechtaste braucht unter Linux X11 (oder XWayland): DISPLAY ist nicht gesetzt",
    linuxNoX11: "Die Sprechtaste kann sich nicht mit dem X11-Display verbinden",
    unsupported: "Die Sprechtaste funktioniert nur unter Windows, macOS und Linux"
  },
  typeKey: {
    macNoKey: "Eine Mac-Tastatur hat diese Taste nicht; w\xE4hle eine andere Tipptaste",
    linuxNoKey: "Linux kann diese Taste nicht lesen (Maus-Seitentasten funktionieren nicht); w\xE4hle eine andere Tipptaste",
    linuxNoDisplay: "Die Tipptaste braucht unter Linux X11 (oder XWayland): DISPLAY ist nicht gesetzt",
    linuxNoX11: "Die Tipptaste kann sich nicht mit dem X11-Display verbinden",
    unsupported: "Die Tipptaste funktioniert nur unter Windows, macOS und Linux"
  },
  system: {
    name: (culture) => culture ? `Windows-Spracherkennung (${culture})` : "Windows-Spracherkennung",
    noSpeech: "Die Komponente System.Speech l\xE4sst sich nicht laden",
    noRecognizer: (language) => `Windows hat keine Spracherkennung${language === "auto" ? "" : ` f\xFCr \u201E${language}\u201C`}: F\xFCge unter Windows-Einstellungen \u2192 Zeit und Sprache \u2192 Sprache die Spracherkennung f\xFCr diese Sprache hinzu`,
    windowsOnly: "Die Windows-Spracherkennung gibt es nur unter Windows",
    startFailed: (why) => `Start fehlgeschlagen: ${why}`,
    exited: "Der Spracherkennungsprozess wurde beendet",
    exitedCode: (code) => `Der Spracherkennungsprozess wurde beendet (Exit-Code ${code})`,
    notReady: "Die Windows-Spracherkennung wurde nicht rechtzeitig bereit",
    notRunning: "Die Windows-Spracherkennung l\xE4uft nicht",
    timeout: (ms) => `Zeit\xFCberschreitung bei der Erkennung (${ms} ms)`,
    stopped: "Die Windows-Spracherkennung wurde gestoppt"
  },
  sherpa: {
    incomplete: "Einige Dateien des Sprachmodells fehlen: Lade es erneut herunter",
    noRuntime: (platform) => `sherpa-onnx hat keine Laufzeit f\xFCr diese Plattform (${platform})`,
    loadFailed: (why) => `Das Sprachmodell konnte nicht geladen werden: ${why}`,
    notLoaded: "Das Sprachmodell ist nicht geladen"
  },
  /** Der OpenAI-kompatible Transkriptionsdienst (Engine api) */
  transcription: {
    noUrl: "Die Adresse des Transkriptionsdiensts ist nicht eingetragen",
    badUrl: (url) => `Die Adresse ist keine http- oder https-URL: ${url}`,
    httpRemote: "Eine entfernte Adresse muss https verwenden: http ist unverschl\xFCsselt, API Key und Aufnahmen gingen im Klartext \xFCbers Netz. Adressen auf diesem Computer oder im lokalen Netz d\xFCrfen http verwenden.",
    noModel: "Das Transkriptionsmodell ist nicht eingetragen",
    notRunning: "Der Transkriptionsdienst ist nicht gestartet",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `Der Dienst hat nicht innerhalb von ${ms} ms geantwortet`,
    network: (why) => `Der Dienst ist nicht erreichbar: ${why}`,
    noText: "Der Dienst hat ohne text geantwortet"
  },
  store: {
    noBuild: (platform) => `Kein vorgefertigtes Paket f\xFCr ${platform}`,
    downloading: (file) => `Lade ${file} herunter`,
    unpacking: "Wird entpackt",
    downloadingModel: "Lade das Sprachmodell herunter",
    downloadingFrom: (file, host) => `Lade ${file} herunter (${host})`,
    verifying: (file) => `Pr\xFCfe ${file}`,
    mismatch: (sum) => `Pr\xFCfsumme stimmt nicht: ${sum}\u2026`,
    failed: (file, why) => `${file} konnte nicht heruntergeladen werden (${why})`,
    exitCode: (cmd, code, out) => `${cmd} Exit-Code ${code}: ${out}`
  },
  packs: {
    noManifest: (file) => `${file} fehlt`,
    badJson: (file, why) => `${file} ist kein g\xFCltiges JSON: ${why}`,
    notInteger: (key, got) => `${key} muss eine ganze Zahl sein, nicht ${got}`,
    tooNew: (key, v, now) => `${key} ist ${v}; diese Version liest bis ${now}: Aktualisiere zuerst die App`,
    tooOld: (key, v, oldest) => `${key} ${v} ist ein Testformat von vor ${oldest} und kann nicht gelesen werden`,
    badId: (got) => `Ung\xFCltige id: ${got}`,
    noName: "name fehlt",
    noAbout: "about fehlt",
    badEntry: "entry oder export ist ung\xFCltig",
    badModel: "Der model-Pfad ist ung\xFCltig",
    badThumb: "Der thumb-Pfad ist ung\xFCltig",
    badAxis: (got) => `Ung\xFCltiger Eintrag in axes: ${got}`,
    badOption: (axis, got) => `Ung\xFCltige Option in axes.${axis}: ${got}`,
    badPreset: (got) => `Ung\xFCltiger Eintrag in presets: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} w\xE4hlt keine Option f\xFCr ${axis}`,
    vocabNotArray: "vocab muss ein Array sein",
    badWordId: (got) => `Ung\xFCltige id in vocab: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind ist ${kind}, das diese Version nicht kennt; der Bot bekommt dieses Wort nicht`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} muss ein Array sein`,
    badWordName: (id, got) => `Ung\xFCltiger Name in vocab.${id}: ${got}`,
    nameTaken: (name) => `${name} bezeichnet in vocab mehr als ein Wort`,
    noWordAbout: (id) => `vocab.${id}.about fehlt`,
    badSeconds: (id) => `vocab.${id}.seconds muss eine positive Zahl sein`,
    soundsNotObject: "sounds muss ein Objekt sein",
    badSoundName: (got) => `Ung\xFCltiger Name in sounds: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file muss eine Datei im Paket sein`,
    badVolume: (name) => `sounds.${name}.volume muss zwischen 0 und 1 liegen`,
    soundType: (name, file) => `${file} von sounds.${name} ist keine .ogg-, .mp3- oder .wav-Datei, die diese Version abspielt; der Ton bleibt stumm`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind ist ${kind}; diese Version kennt nur ${kinds.join(", ")}, daher bleibt der Ton stumm`,
    soundMissing: (name, file) => `${file} von sounds.${name} existiert nicht; der Ton bleibt stumm`,
    badWalk: (got) => `can.walk ist ${got}, das diese Version nicht kennt; wird als gehf\xE4hig behandelt`,
    movesNotArray: "moves muss ein Array sein",
    tooManyMoves: (max2) => `moves enth\xE4lt h\xF6chstens ${max2} Ziele`,
    badMoveId: (got) => `Ung\xFCltige id in moves: ${got} (left, center, right, cursor und Zahlen sind die Standardziele)`,
    moveTaken: (id) => `${id} kommt in moves mehrfach vor`,
    noMoveText: (id) => `moves.${id} hat kein name oder about`,
    badMoveParams: (id, max2) => `moves.${id}.params muss ein Array mit h\xF6chstens ${max2} Eintr\xE4gen sein, jeder mit id, about und Zahlen min kleiner als max`,
    needsNotArray: "needs muss ein Array sein",
    unknownNeed: (got) => `${got} in needs stellt diese Version nicht bereit; ausgelassen`,
    idTaken: (id, builtin) => `id ${id} ist schon von ${builtin ? "einer eingebauten Figur" : "einem anderen Paket"} belegt`
  },
  importing: {
    badZip: (why) => `Kein lesbares ZIP: ${why}`,
    tooBig: (mb) => `Entpackt \xFCber ${mb} MB`,
    truncated: "Der Upload ist unvollst\xE4ndig",
    badPath: (path) => `Ein Pfad ist nicht verwendbar: ${path}`,
    builtinId: (id) => `id ${id} geh\xF6rt zu einer eingebauten Figur; \xE4ndere die id, um es zu importieren`,
    duplicateId: (id) => `id ${id} ist dieselbe wie bei einem anderen Paket in diesem Import`,
    unpackFailed: (why) => `Entpacken fehlgeschlagen: ${why}`,
    expired: "Dieser Import ist abgelaufen; w\xE4hle die Dateien erneut",
    noneChosen: "Kein Paket gew\xE4hlt",
    zipOrFolder: "Nur ein ZIP oder Ordner k\xF6nnen importiert werden",
    overLimit: (mb) => `\xDCber ${mb} MB`
  },
  removing: {
    notInstalled: (id) => `Kein Figurenpaket hat die id ${id}`,
    builtin: (id) => `${id} ist eine eingebaute Figur und kann nicht deinstalliert werden`,
    elsewhere: (id) => `${id} liegt nicht im Installationsordner der Figurenpakete und kann hier nicht deinstalliert werden`,
    failed: (why) => `L\xF6schen fehlgeschlagen: ${why}`
  },
  consent: {
    question: (items) => `Darf ich ${items.join(", ")}?`,
    choices: ["Ja", "Ja, immer", "Lieber nicht"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `zu ${to} wechseln`,
    scheme: (figure, look) => `ein anderes ${figure}-Outfit anziehen (${look})`,
    roam: { free: "Oft", calm: "Ab und zu", off: "Bleibt stehen" },
    roamTo: (to) => `mein Herumlaufen auf \u201E${to}\u201C stellen`,
    snore: (seconds) => seconds === 0 ? "bis zum Aufwachen schnarchen" : `in jedem Schlaf ${seconds} s schnarchen`,
    sound: (on) => on ? "die T\xF6ne einschalten" : "die T\xF6ne ausschalten",
    scale: (from, to) => `meine Gr\xF6\xDFe von ${from}\xD7 auf ${to}\xD7 \xE4ndern`,
    bubbleSize: (from, to) => `die Blasengr\xF6\xDFe von ${from}\xD7 auf ${to}\xD7 \xE4ndern`,
    fontSize: (from, to) => `die Schriftgr\xF6\xDFe von ${from}\xD7 auf ${to}\xD7 \xE4ndern`,
    theme: { dark: "zum Nacht-Look wechseln", light: "zum Tag-Look wechseln" },
    hover: (list) => `die Hover-Schaltfl\xE4chen auf ${list} \xE4ndern`,
    actions: { chat: "Tippen", voice: "Spracheingabe", roam: "Herumlaufen", theme: "Nachtmodus", sound: "T\xF6ne", dress: "Outfit", hide: "Haustier ausblenden" },
    user: (to) => `dich \u201E${to}\u201C nennen`
  },
  portsTaken: (from, to, why) => `Die Ports ${from}\u2013${to} sind alle belegt: ${why}`,
  console: {
    label: "Desktop-Haustier",
    window: "Haustier-Fenster",
    connected: "Seite verbunden",
    notOpen: "Nicht ge\xF6ffnet",
    noBody: (reason) => `Seite verbunden, die Figur kann nicht gezeichnet werden: ${reason}`,
    alsoBrowser: (hint) => `${hint}; eine Browserseite ist verbunden`,
    voice: "Spracherkennung",
    notStarted: "Nicht gestartet",
    viewInBrowser: "Haustier im Browser ansehen",
    dress: "Einkleiden",
    panels: {
      pet: { title: "Desktop-Haustier", description: "Das Fenster, das Outfit und die Fenster-Laufzeit." },
      voice: { title: "Spracheingabe", description: "Erkennungs-Engine, Eingangspegel und was geh\xF6rt wurde." }
    },
    envPrompt: { title: "Desktop-Haustier-Umgebung", description: "Beschreibt den K\xF6rper des Haustiers, die vier Tools und die Eingabeereignisse." },
    vars: {
      "pet.user": "Wie der Bot die Person nennt",
      "pet.vocab": "Die Ausdr\xFCcke und Bewegungen der aktuellen Figur",
      "pet.moves": "Die eigenen Ziele der aktuellen Figur f\xFCr pet_move_to; leer, wenn sie keine hat",
      "pet.voice": "Ob die Spracheingabe an oder aus ist",
      "pet.body": "Wie die aktuelle Figur aussieht",
      "pet.dress": "Die Figuren und Outfits, die pet_set w\xE4hlen kann",
      "pet.self": "Selbsteinstellung: welche Einstellungen sich direkt \xE4ndern, welche auf Zustimmung warten, oder dass sich keine \xE4ndern l\xE4sst",
      "pet.chat": "Ein Hinweis zur Chat-Seite, wenn die App eine hat; sonst leer",
      "pet.reply": "Eine Zeile, die dem Bot die Sprache zum Reden vorgibt, wenn die App-Sprache weder vereinfachtes Chinesisch noch Englisch ist; sonst leer",
      "pet.cua": "Der Teil zur Computersteuerung: Screenshot-Koordinaten, wann zuerst gefragt wird und die Regeln, der Person nicht in die Quere zu kommen; leer, solange die Computersteuerung aus ist"
    },
    noGuide: "Diese App hat keine Einf\xFChrung",
    unknownMethod: (name) => `Unbekannte Methode ${name}`
  },
  config: {
    group: "Desktop-Haustier",
    soundGroup: "T\xF6ne",
    asrGroup: "Spracheingabe",
    user: { title: "Wie du genannt wirst", description: (max2) => `Der Name, mit dem Sprach-, Tipp- und Ber\xFChrungsereignisse dich bezeichnen, bis zu ${max2} Zeichen. Leer verwendet den Standardnamen.` },
    roam: { title: "Herumlaufen", description: "free l\xE4uft oft herum; calm bleibt meistens stehen; off bewegt sich nur auf Aufforderung." },
    theme: { title: "Nachtmodus", description: "dark ist Nacht: heller K\xF6rper und dunkle Sprechblasen; light ist Tag: dunkler K\xF6rper und helle Sprechblasen." },
    rememberPosition: { title: "Position merken", description: "Speichert beim Beenden der App, wie weit links oder rechts auf dem Bildschirm das Haustier steht, und startet beim n\xE4chsten Mal dort; bei mehreren Bildschirmen startet Coo immer auf dem Hauptbildschirm." },
    hoverButtons: { title: "Hover-Schaltfl\xE4chen", description: (max2, ids) => `Schaltfl\xE4chen neben dem Haustier, solange der Mauszeiger auf Coo ruht, bis zu ${max2}, durch Kommas getrennt: ${ids}.` },
    doubleClickChat: { title: "Doppelklick zum Tippen", description: "Ein Doppelklick auf das Haustier \xF6ffnet das Eingabefeld." },
    statusBubble: { title: "Statusblase", description: "Zeigt, was das Haustier tut, w\xE4hrend Coo nachdenkt, das Ged\xE4chtnis durchsieht oder den Computer bedient, Dateinamen eingeschlossen." },
    saidBubbles: { title: "Eingabeblasen", description: "Getipptes, Gesprochenes und von der Chatseite Gesendetes erscheint \xFCber dem Haustier, bis Coo antwortet. Ausgeschaltet erscheint Gesprochenes nur w\xE4hrend der Erkennung." },
    selfAdjust: { title: "Selbsteinstellung", description: "off: Coo kann die Einstellungen nicht \xE4ndern und auch nicht zeitweise still sein. default: Figur, Outfit, Herumlaufen und Schnarchen \xE4ndert Coo direkt; Gr\xF6\xDFe, Blasengr\xF6\xDFe, Schriftgr\xF6\xDFe, T\xF6ne, Nachtmodus, Hover-Schaltfl\xE4chen und dein Name warten auf deine Zustimmung. any: Alles \xE4ndert Coo direkt. custom: wie auf der Seite \u201EGewohnheiten\u201C angehakt; Angehaktes \xE4ndert Coo direkt, der Rest wartet auf deine Zustimmung." },
    windowEnabled: { title: "Haustier-Fenster beim Start \xF6ffnen" },
    scale: { title: "Gr\xF6\xDFe" },
    bubbleSize: { title: "Blasengr\xF6\xDFe", description: "Breite, Innenabstand, Ecken und Spitze der Blasen des Haustiers und deiner, 1 ist der Standard; die Schrift beh\xE4lt ihre Gr\xF6\xDFe." },
    fontSize: { title: "Schriftgr\xF6\xDFe", description: "Gr\xF6\xDFe der Schrift in den Blasen, 1 ist der Standard; die Blasen behalten ihre Breite." },
    bubbleSpeed: { title: "Blasentempo", description: "Wie schnell die Blasen des Haustiers getippt werden und wie lange sie stehen bleiben, 1 ist der Standard; h\xF6here Werte sind schneller." },
    glow: { title: "Leuchtrand", description: "Wie viele Pixel der helle Schein um das Haustier reicht, wenn Coos Farben dem Hintergrund \xE4hneln; 0 schaltet ihn aus." },
    frameRate: { title: "Bildrate", description: "Bilder pro Sekunde, w\xE4hrend das Haustier l\xE4uft, getragen wird oder springt; 0 folgt dem Bildschirm. \xDCber der Bildwiederholrate des Bildschirms gilt die des Bildschirms. Die Seite Gewohnheiten bietet 60, 120, 144 und Unbegrenzt." },
    lockFrameRate: { title: "Bildrate fixieren", description: "Zeichnet das Haustier auch im Ruhezustand mit der Bildrate. Wenn aus, sinkt sie im Stehen, Sitzen oder Schlafen auf 30 Bilder pro Sekunde." },
    hideWhenFullscreen: { title: "Bei Vollbild ausblenden", description: "Wenn an, versteckt sich das Haustier, solange das Fenster im Vordergrund Coos Bildschirm f\xFCllt (ein Spiel, ein Vollbildvideo, ein Browser im Vollbild), und kommt zur\xFCck, wenn das Vollbild endet; ein maximiertes Fenster z\xE4hlt nicht. Wenn aus, bleibt Coo immer im Vordergrund." },
    exportOverlay: { title: "OBS-Overlay", description: "Stellt das Bild des Haustierfensters mit transparentem Hintergrund unter /overlay f\xFCr eine OBS-\u201EBrowser\u201C-Quelle bereit; aus, wird nichts bereitgestellt." },
    electronFile: { title: "Electron-Programmdatei", description: "Leer verwendet CORTICO_DESKTOP_PET_HOST, dann die im Panel installierte Laufzeit." },
    port: { title: "Seiten-Port", description: "Weicht auf den n\xE4chsten freien Port aus, wenn er belegt ist." },
    touchEnabled: { title: "Ber\xFChrungen werden zu Ereignissen", description: "Anstupsen, Streicheln, Hochheben und Werfen." },
    touchWakeOn: { title: "Reaktionsmodus", description: "poke: Nur Anstupsen bekommt sofort eine Reaktion; andere Ber\xFChrungen warten auf die n\xE4chste. all: Jede Ber\xFChrung bekommt sofort eine. none: Jede Ber\xFChrung wartet auf die n\xE4chste Reaktion. custom: Die auf der Seite \u201EGewohnheiten\u201C angehakten Ber\xFChrungen bekommen sofort eine. Nach einer Reaktion warten die Ber\xFChrungen bis zum Ende dieser Runde auf die n\xE4chste." },
    sound: { title: "Alle T\xF6ne", description: "Die Ton-Schaltfl\xE4che im Men\xFC des Haustiers schaltet das um." },
    sounds: {
      move: { title: "Bewegung", description: "Gehen, Rennen, Springen, Landen, Geworfenwerden, Nicken, Kopfsch\xFCtteln, Drehen, Schwindel, Zittern, Tanzen, Umherschauen." },
      touch: { title: "Ber\xFChrung", description: "Hochgehoben, geschwungen, gestreichelt, angestupst werden." },
      face: { title: "Gesichter", description: "Fr\xF6hlich, Zwinkern, Liebe, \xFCberrascht, w\xFCtend, traurig, sch\xFCchtern, G\xE4hnen." },
      snore: { title: "Schnarchen", description: "" },
      talk: { title: "Sprechen", description: "Das Geplapper, w\xE4hrend Sprechblasentext erscheint, und aufpoppende Auswahlkarten." },
      ui: { title: "Schaltfl\xE4chen und Signale", description: "Schaltfl\xE4chenklicks, sich \xF6ffnende Sprechblasen, Auswahlen sowie Beginn und Ende des Zuh\xF6rens." }
    },
    snoreSeconds: { title: "Schnarchdauer", suffix: "s", description: "In jedem Schlaf wird das Haustier nach so langem Schnarchen still; die Zs schweben weiter. 0 = schnarchen bis zum Aufwachen." },
    speech: { title: "Stimme", description: "Spricht f\xFCr jedes Zeichen, das in einer Sprechblase erscheint, eine Silbe statt des Plapperns von Sprechen; stumm, solange Sprechen-T\xF6ne aus sind." },
    speechPitch: { title: "Stimmh\xF6he", description: (a, b, c) => `low, mid und high sind ${a}, ${b} und ${c} Hz; custom nimmt die eigene H\xF6he.` },
    speechPitchHz: { title: "Eigene H\xF6he" },
    speechSpeed: { title: "Sprechtempo", description: (a, b, c) => `H\xF6chstens so viele Silben pro Sekunde: low, mid und high sind ${a}, ${b} und ${c}; custom nimmt das eigene Tempo. Langsamer als der Text, endet die Stimme nach ihm.` },
    speechRate: { title: "Eigenes Tempo", suffix: "Silben/s" },
    asrEnabled: { title: "Spracheingabe" },
    asrEngine: { title: "Erkennungs-Engine", description: "funasr f\xFChrt SenseVoiceSmall von FunASR aus, f\xFCr Chinesisch, Englisch, Japanisch, Koreanisch und Kantonesisch, nach einem einmaligen Download von etwa 240 MB; whisper f\xFChrt Whisper small von OpenAI aus, f\xFCr Franz\xF6sisch, Deutsch, Spanisch, Portugiesisch, Italienisch, Russisch und etwa 90 weitere Sprachen, nach einem einmaligen Download von etwa 360 MB, und zeigt den Text, sobald ein Satz endet; beide erkennen auf diesem Computer. system nutzt die Spracherkennung von Windows, ohne Download und weniger genau (nur Windows). api schickt die Aufnahme jedes Satzes an einen OpenAI-kompatiblen Transkriptionsdienst und zeigt den Text, sobald der Satz endet; Adresse und Modell werden unten eingetragen, der API Key auf der Seite Spracheingabe. Leer w\xE4hlt nach der App-Sprache: funasr f\xFCr Chinesisch, Englisch, Japanisch und Koreanisch, whisper f\xFCr die \xFCbrigen." },
    asrLanguage: { title: "Sprache", description: "Ein ISO-639-1-Code oder auto, damit das Modell selbst entscheidet; leer folgt der App-Sprache. FunASR nimmt zh, en, ja, ko und yue, Whisper etwa hundert Codes wie fr, de, es, pt, it und ru; ein Code, den das Modell nicht nimmt, gilt als auto. Der Transkriptionsdienst bekommt den Code nur, wenn er zwei Buchstaben hat." },
    asrApiUrl: { title: "Adresse des Transkriptionsdiensts", description: "Mit der Engine api geht jeder Satz an /audio/transcriptions unter dieser Adresse, etwa https://api.example.com/v1. Eine entfernte Adresse muss https verwenden; Adressen auf diesem Computer oder im lokalen Netz d\xFCrfen http verwenden." },
    asrApiModel: { title: "Transkriptionsmodell", description: "Der Modellname in den Anfragen mit der Engine api." },
    asrThreads: { title: "CPU-Threads", description: "Threads, die FunASR und Whisper f\xFCr eine Erkennung nutzen; 0 = 2." },
    asrSimplified: { title: "In Kurzzeichen umwandeln", description: "Wandelt Langzeichen im Geh\xF6rten in Kurzzeichen um, wenn die App-Sprache vereinfachtes Chinesisch ist." },
    thresholdDb: { title: "Sprechschwelle" },
    silenceMs: { title: "Stille, die einen Satz beendet" },
    maxUtteranceMs: { title: "L\xE4ngster Satz" }
  },
  panel: {
    pet: "Desktop-Haustier",
    window: "Haustier-Fenster",
    openWindow: "Fenster \xF6ffnen",
    closeWindow: "Fenster schlie\xDFen",
    runtime: "Fenster-Laufzeit",
    install: "Installieren",
    viewInBrowser: "Im Browser ansehen",
    dress: "Einkleiden",
    dressHint: "\xC4nderungen werden sofort gespeichert und erreichen das Haustier-Fenster",
    connected: "Verbunden",
    starting: "Startet",
    cannotOpen: "L\xE4sst sich nicht \xF6ffnen",
    notOpen: "Nicht ge\xF6ffnet",
    external: "Externes Programm wird verwendet",
    installed: "Installiert",
    downloading: (progress) => `Wird heruntergeladen ${progress}`,
    installFailed: "Installation fehlgeschlagen",
    notInstalled: "Nicht installiert",
    noBuild: "Kein vorgefertigtes Paket f\xFCr diese Plattform",
    electronSize: "Electron 44.4.4, etwa 150 MB",
    voice: "Spracheingabe",
    enable: "Spracheingabe einschalten",
    enabledHint: "Das Mikrofon bleibt offen; was du sagst, geht je nach Zuh\xF6rmodus an Coo",
    enabledHintOnPress: "Das Mikrofon \xF6ffnet sich, solange die Sprechtaste gehalten wird, und schlie\xDFt sich nach dem Loslassen",
    disabledHint: "Aus: Das Mikrofon bleibt geschlossen, und die Einstellungen unten warten",
    engine: "Erkennungs-Engine",
    funasr: "FunASR (auf diesem Computer)",
    system: "In Windows integriert",
    whisper: "Whisper (auf diesem Computer)",
    systemHint: "Kein Download, mittlere Genauigkeit; f\xFCr bessere Ergebnisse zu FunASR oder Whisper wechseln",
    funasrHint: "SenseVoiceSmall auf diesem Computer, f\xFCr Chinesisch, Englisch, Japanisch, Koreanisch und Kantonesisch",
    whisperHint: "Whisper small auf diesem Computer, f\xFCr Franz\xF6sisch, Deutsch, Spanisch, Portugiesisch, Italienisch, Russisch und mehr; der Text erscheint, sobald ein Satz endet",
    api: "Transkriptionsdienst (OpenAI-kompatibel)",
    apiName: "Transkriptionsdienst",
    apiHint: "Jeder Satz geht an den unten eingetragenen Dienst; der Text erscheint, sobald ein Satz endet",
    apiUrl: "Adresse",
    apiModel: "Modell",
    apiKey: "API Key",
    keySaved: "Gespeichert",
    keyMissing: "Nicht eingetragen",
    server: "Erkennungsdienst",
    start: "Starten",
    stop: "Stoppen",
    ready: "Bereit",
    error: "Fehler",
    stopped: "Gestoppt",
    model: "Sprachmodell",
    download: "Herunterladen",
    retry: "Erneut versuchen",
    downloadFailed: "Download fehlgeschlagen",
    downloaded: "Heruntergeladen",
    notDownloaded: "Nicht heruntergeladen",
    modelSource: (size) => `Etwa ${size}, von ModelScope heruntergeladen`,
    mic: "Mikrofon",
    micStates: { on: "H\xF6rt zu", off: "H\xF6rt nicht zu", denied: "Verweigert", error: "Fehler" },
    defaultDevice: "Systemstandard",
    missingDevice: "Das zuvor gew\xE4hlte Ger\xE4t (jetzt nicht gefunden)",
    micN: (n) => `Mikrofon ${n}`,
    mode: "Wie es zuh\xF6rt",
    modes: { hold: "Solange die Sprechtaste gehalten wird", toggle: "Die Sprechtaste schaltet es ein und aus", always: "Die ganze Zeit" },
    openOnPress: "Mikrofon nur beim Halten \xF6ffnen",
    openOnPressHint: "F\xFCr Headsets, etwa Bluetooth, die bei offenem Mikrofon in den Anrufmodus wechseln; nach dem Dr\xFCcken kurz warten und dann sprechen, sonst k\xF6nnen die ersten W\xF6rter fehlen",
    switchOn: "An",
    switchOff: "Aus",
    presses: {
      2: { hold: "Zweimal dr\xFCcken und halten", toggle: "Zweimal dr\xFCcken zum Starten, wieder zum Beenden" },
      1: { hold: "Einfach halten", toggle: "Dr\xFCcken zum Starten, erneut dr\xFCcken zum Beenden" },
      3: { hold: "Dreimal dr\xFCcken und halten", toggle: "Dreimal dr\xFCcken zum Starten, wieder zum Beenden" }
    },
    capture: "Dr\xFCck die neue Sprechtaste: eine Tastenkombination oder eine Maus-Seitentaste\u2026 (Esc bricht ab)",
    listening: "H\xF6rt zu",
    waitingKey: "Wartet auf die Sprechtaste",
    results: "Was geh\xF6rt wurde",
    resultsHint: "Durchgestrichene Zeilen waren zu kurz oder vermutlich halluziniert und wurden nicht gesendet",
    talkKeyName: "Sprechtaste",
    changeKey: "\xC4ndern",
    cancelKey: "Abbrechen",
    level: "Eingangspegel",
    thresholdHint: "Nur Schall, der lauter als dieser Strich ist, z\xE4hlt als Sprache; spricht jemand anderes so laut wie du, wird das auch erkannt",
    noResults: "Noch nichts erkannt"
  },
  chat: {
    badImages: "Die Bilder haben kein Format, das diese Seite sendet",
    tooManyImages: (max2) => `H\xF6chstens ${max2} Bilder auf einmal`,
    badMime: (mime) => `Nicht unterst\xFCtzter Bildtyp ${mime}`,
    emptyImage: "Eines der Bilder ist leer",
    bigImage: (mb) => `Jedes Bild muss kleiner als ${mb} MB sein`,
    offline: "Noch nicht verbunden",
    notSent: "Konnte nicht gesendet werden",
    tooLate: "Diese Nachricht wurde schon zugestellt und l\xE4sst sich nicht zur\xFCckholen."
  }
};
var de_default = de;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/es-419.ts
var es419 = {
  defaultUser: "Compa",
  menu: {
    quit: "Salir",
    quitPrompt: (label) => `\xBF${label}?`
  },
  busy: "Trabajando",
  voice: {
    starting: "El reconocimiento de voz se est\xE1 iniciando",
    notRunning: "El reconocimiento de voz no est\xE1 en ejecuci\xF3n",
    modelMissing: (mb) => `El modelo de voz a\xFAn no est\xE1 descargado (unos ${mb} MB): desc\xE1rgalo en la p\xE1gina Entrada de voz`,
    badKey: (hotkey) => `Tecla desconocida \u201C${hotkey}\u201D`,
    keyProblem: (problem) => `La tecla para hablar no est\xE1 disponible, as\xED que por ahora no se reconoce la voz: ${problem}`,
    always: "Siempre escuchando: solo habla",
    toggleTaps: (label, taps) => `Presiona ${label} para empezar a escuchar y de nuevo ${taps === 2 ? "dos" : "tres"} veces para parar`,
    toggle: (key) => `Presiona ${key} para empezar a escuchar y otra vez para parar`,
    holdTaps: (key, taps) => `Presiona ${key} ${taps === 2 ? "una vez" : "dos veces"}, luego mant\xE9n presionada la tecla y habla; su\xE9ltala para enviar`,
    hold: (key) => `Mant\xE9n presionada la tecla ${key} y habla; su\xE9ltala para enviar`,
    failedLine: (error) => `[fall\xF3] ${error}`
  },
  keys: {
    LeftCtrl: "Ctrl izquierdo",
    RightCtrl: "Ctrl derecho",
    LeftAlt: "Alt izquierdo",
    RightAlt: "Alt derecho",
    LeftShift: "Shift izquierdo",
    RightShift: "Shift derecho",
    RightWin: "Win derecho",
    Backquote: "`",
    Mouse3: "Bot\xF3n central del mouse",
    Mouse4: "Bot\xF3n 4 del mouse",
    Mouse5: "Bot\xF3n 5 del mouse"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "Control izquierdo",
    RightCtrl: "Control derecho",
    Alt: "Option",
    LeftAlt: "Option izquierdo",
    RightAlt: "Option derecho",
    Win: "Command",
    RightWin: "Command derecho"
  },
  taps: (taps, keys) => `${keys} ${taps === 2 ? "dos" : "tres"} veces`,
  hotkey: {
    cannotRead: (why) => `No se puede leer el teclado: ${why}`,
    macNoKey: "Un teclado Mac no tiene esa tecla; elige otra tecla para hablar",
    macPermission: "Falta el permiso de Monitoreo de entrada: activa Coopanion en Configuraci\xF3n del Sistema \u2192 Privacidad y seguridad \u2192 Monitoreo de entrada y luego rein\xEDcialo. Si ya est\xE1 activado, quita Coopanion de la lista con \u201C\u2212\u201D y vuelve a agregarlo: una versi\xF3n actualizada no hereda el permiso anterior",
    linuxNoKey: "Linux no puede leer esta tecla (los botones laterales del mouse no funcionan); elige otra tecla para hablar",
    linuxNoDisplay: "La tecla para hablar necesita X11 (o XWayland) en Linux: DISPLAY no est\xE1 definido",
    linuxNoX11: "La tecla para hablar no puede conectarse a la pantalla X11",
    unsupported: "La tecla para hablar solo funciona en Windows, macOS y Linux"
  },
  typeKey: {
    macNoKey: "Un teclado Mac no tiene esa tecla; elige otra tecla para escribir",
    linuxNoKey: "Linux no puede leer esta tecla (los botones laterales del mouse no funcionan); elige otra tecla para escribir",
    linuxNoDisplay: "La tecla para escribir necesita X11 (o XWayland) en Linux: DISPLAY no est\xE1 definido",
    linuxNoX11: "La tecla para escribir no puede conectarse a la pantalla X11",
    unsupported: "La tecla para escribir solo funciona en Windows, macOS y Linux"
  },
  system: {
    name: (culture) => culture ? `Reconocimiento de voz de Windows (${culture})` : "Reconocimiento de voz de Windows",
    noSpeech: "El componente System.Speech no se carga",
    noRecognizer: (language) => `Windows no tiene un reconocedor de voz${language === "auto" ? "" : ` para \u201C${language}\u201D`}: agrega Reconocimiento de voz para el idioma en Configuraci\xF3n de Windows \u2192 Hora e idioma \u2192 Idioma`,
    windowsOnly: "El reconocimiento de voz de Windows solo existe en Windows",
    startFailed: (why) => `No se pudo iniciar: ${why}`,
    exited: "El proceso de reconocimiento de voz termin\xF3",
    exitedCode: (code) => `El proceso de reconocimiento de voz termin\xF3 (c\xF3digo de salida ${code})`,
    notReady: "El reconocimiento de voz de Windows no estuvo listo a tiempo",
    notRunning: "El reconocimiento de voz de Windows no est\xE1 en ejecuci\xF3n",
    timeout: (ms) => `Se agot\xF3 el tiempo de reconocimiento (${ms} ms)`,
    stopped: "El reconocimiento de voz de Windows se detuvo"
  },
  sherpa: {
    incomplete: "Faltan archivos del modelo de voz: desc\xE1rgalo de nuevo",
    noRuntime: (platform) => `sherpa-onnx no tiene entorno de ejecuci\xF3n para esta plataforma (${platform})`,
    loadFailed: (why) => `No se pudo cargar el modelo de voz: ${why}`,
    notLoaded: "El modelo de voz no est\xE1 cargado"
  },
  /** El servicio de transcripción compatible con OpenAI (motor api) */
  transcription: {
    noUrl: "Falta la direcci\xF3n del servicio de transcripci\xF3n",
    badUrl: (url) => `La direcci\xF3n no es una URL http o https: ${url}`,
    httpRemote: "Una direcci\xF3n remota debe usar https: http no est\xE1 cifrado, as\xED que la API Key y las grabaciones viajar\xEDan en texto plano. Las direcciones de esta computadora o de la red local pueden usar http.",
    noModel: "Falta el modelo de transcripci\xF3n",
    notRunning: "El servicio de transcripci\xF3n no est\xE1 iniciado",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `El servicio no respondi\xF3 en ${ms} ms`,
    network: (why) => `No se puede conectar con el servicio: ${why}`,
    noText: "El servicio respondi\xF3 sin text"
  },
  store: {
    noBuild: (platform) => `No hay paquete precompilado para ${platform}`,
    downloading: (file) => `Descargando ${file}`,
    unpacking: "Descomprimiendo",
    downloadingModel: "Descargando el modelo de voz",
    downloadingFrom: (file, host) => `Descargando ${file} (${host})`,
    verifying: (file) => `Verificando ${file}`,
    mismatch: (sum) => `La suma de verificaci\xF3n no coincide: ${sum}\u2026`,
    failed: (file, why) => `No se pudo descargar ${file} (${why})`,
    exitCode: (cmd, code, out) => `${cmd} c\xF3digo de salida ${code}: ${out}`
  },
  packs: {
    noManifest: (file) => `Falta ${file}`,
    badJson: (file, why) => `${file} no es un JSON v\xE1lido: ${why}`,
    notInteger: (key, got) => `${key} debe ser un entero, no ${got}`,
    tooNew: (key, v, now) => `${key} es ${v}; esta versi\xF3n lee hasta ${now}: primero actualiza la app`,
    tooOld: (key, v, oldest) => `${key} ${v} es un formato de prueba anterior a ${oldest} y no se puede leer`,
    badId: (got) => `id no v\xE1lido: ${got}`,
    noName: "Falta name",
    noAbout: "Falta about",
    badEntry: "entry o export no es v\xE1lido",
    badModel: "La ruta de model no es v\xE1lida",
    badThumb: "La ruta de thumb no es v\xE1lida",
    badAxis: (got) => `Entrada no v\xE1lida en axes: ${got}`,
    badOption: (axis, got) => `Opci\xF3n no v\xE1lida en axes.${axis}: ${got}`,
    badPreset: (got) => `Entrada no v\xE1lida en presets: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} no elige ninguna opci\xF3n para ${axis}`,
    vocabNotArray: "vocab debe ser un arreglo",
    badWordId: (got) => `id no v\xE1lido en vocab: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind es ${kind}, que esta versi\xF3n no conoce; el bot no recibe esta palabra`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} debe ser un arreglo`,
    badWordName: (id, got) => `Nombre no v\xE1lido en vocab.${id}: ${got}`,
    nameTaken: (name) => `${name} nombra m\xE1s de una palabra en vocab`,
    noWordAbout: (id) => `Falta vocab.${id}.about`,
    badSeconds: (id) => `vocab.${id}.seconds debe ser un n\xFAmero positivo`,
    soundsNotObject: "sounds debe ser un objeto",
    badSoundName: (got) => `Nombre no v\xE1lido en sounds: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file debe ser un archivo del paquete`,
    badVolume: (name) => `sounds.${name}.volume debe estar entre 0 y 1`,
    soundType: (name, file) => `${file} de sounds.${name} no es un .ogg, .mp3 o .wav que esta versi\xF3n pueda reproducir; el sonido queda en silencio`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind es ${kind}; esta versi\xF3n solo conoce ${kinds.join(", ")}, as\xED que el sonido queda en silencio`,
    soundMissing: (name, file) => `${file} de sounds.${name} no existe; el sonido queda en silencio`,
    badWalk: (got) => `can.walk es ${got}, que esta versi\xF3n no conoce; se toma como que puede caminar`,
    movesNotArray: "moves debe ser un arreglo",
    tooManyMoves: (max2) => `moves admite como m\xE1ximo ${max2} destinos`,
    badMoveId: (got) => `id no v\xE1lido en moves: ${got} (left, center, right, cursor y los n\xFAmeros son los destinos predeterminados)`,
    moveTaken: (id) => `${id} aparece m\xE1s de una vez en moves`,
    noMoveText: (id) => `moves.${id} no tiene name o about`,
    badMoveParams: (id, max2) => `moves.${id}.params debe ser un arreglo de como m\xE1ximo ${max2} elementos, cada uno con id, about y n\xFAmeros min menor que max`,
    needsNotArray: "needs debe ser un arreglo",
    unknownNeed: (got) => `${got} en needs no lo ofrece esta versi\xF3n; se omite`,
    idTaken: (id, builtin) => `El id ${id} ya lo usa ${builtin ? "un personaje integrado" : "otro paquete"}`
  },
  importing: {
    badZip: (why) => `No es un zip legible: ${why}`,
    tooBig: (mb) => `M\xE1s de ${mb} MB descomprimido`,
    truncated: "La carga est\xE1 incompleta",
    badPath: (path) => `Una ruta no se puede usar: ${path}`,
    builtinId: (id) => `El id ${id} pertenece a un personaje integrado; cambia el id para importarlo`,
    duplicateId: (id) => `El id ${id} es igual al de otro paquete de esta importaci\xF3n`,
    unpackFailed: (why) => `No se pudo descomprimir: ${why}`,
    expired: "Esta importaci\xF3n expir\xF3; vuelve a elegir los archivos",
    noneChosen: "No se eligi\xF3 ning\xFAn paquete",
    zipOrFolder: "Solo se puede importar un zip o carpetas",
    overLimit: (mb) => `M\xE1s de ${mb} MB`
  },
  removing: {
    notInstalled: (id) => `Ning\xFAn paquete de personaje tiene el id ${id}`,
    builtin: (id) => `${id} es un personaje integrado y no se puede desinstalar`,
    elsewhere: (id) => `${id} no est\xE1 en la carpeta de instalaci\xF3n de paquetes de personaje; no se puede desinstalar aqu\xED`,
    failed: (why) => `No se pudo eliminar: ${why}`
  },
  consent: {
    question: (items) => `\xBFPuedo ${items.join(", ")}?`,
    choices: ["S\xED", "S\xED, siempre", "No, gracias"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `cambiar a ${to}`,
    scheme: (figure, look) => `ponerme otro atuendo de ${figure} (${look})`,
    roam: { free: "A menudo", calm: "De vez en cuando", off: "Sin moverse" },
    roamTo: (to) => `poner mis paseos en \xAB${to}\xBB`,
    snore: (seconds) => seconds === 0 ? "roncar hasta despertar" : `roncar ${seconds} s cada vez que duermo`,
    sound: (on) => on ? "activar los sonidos" : "desactivar los sonidos",
    scale: (from, to) => `cambiar mi tama\xF1o de ${from}\xD7 a ${to}\xD7`,
    bubbleSize: (from, to) => `cambiar el tama\xF1o de las burbujas de ${from}\xD7 a ${to}\xD7`,
    fontSize: (from, to) => `cambiar el tama\xF1o del texto de ${from}\xD7 a ${to}\xD7`,
    theme: { dark: "cambiar al aspecto de noche", light: "cambiar al aspecto de d\xEDa" },
    hover: (list) => `cambiar los botones al pasar el cursor a ${list}`,
    actions: { chat: "Escribir", voice: "Entrada de voz", roam: "Paseos", theme: "Modo nocturno", sound: "Sonidos", dress: "Vestuario", hide: "Ocultar mascota" },
    user: (to) => `llamarte \xAB${to}\xBB`
  },
  portsTaken: (from, to, why) => `Los puertos ${from}\u2013${to} est\xE1n todos ocupados: ${why}`,
  console: {
    label: "Mascota de escritorio",
    window: "Ventana de la mascota",
    connected: "P\xE1gina conectada",
    notOpen: "Sin abrir",
    noBody: (reason) => `P\xE1gina conectada, el personaje no se puede dibujar: ${reason}`,
    alsoBrowser: (hint) => `${hint}; hay una p\xE1gina del navegador conectada`,
    voice: "Reconocimiento de voz",
    notStarted: "Sin iniciar",
    viewInBrowser: "Ver la mascota en el navegador",
    dress: "Vestuario",
    panels: {
      pet: { title: "Mascota de escritorio", description: "La ventana, el vestuario y el entorno de ejecuci\xF3n de la ventana." },
      voice: { title: "Entrada de voz", description: "Motor de reconocimiento, nivel de entrada y lo que se escuch\xF3." }
    },
    envPrompt: { title: "Entorno de la mascota de escritorio", description: "Describe el cuerpo de la mascota, las cuatro herramientas y los eventos de entrada." },
    vars: {
      "pet.user": "C\xF3mo llama el bot a la persona",
      "pet.vocab": "Las expresiones y los movimientos del personaje actual",
      "pet.moves": "Los destinos propios del personaje actual (pet_move_to); vac\xEDo si no tiene",
      "pet.voice": "Si la entrada de voz est\xE1 activada o desactivada",
      "pet.body": "C\xF3mo se ve el personaje actual",
      "pet.dress": "Los personajes y atuendos que puede elegir pet_set",
      "pet.self": "Autoajuste: qu\xE9 ajustes cambian directamente, cu\xE1les esperan consentimiento, o que ninguno puede cambiar",
      "pet.chat": "Una nota sobre la p\xE1gina de chat cuando la app tiene una; vac\xEDo en otro caso",
      "pet.reply": "Una l\xEDnea que le dice al bot en qu\xE9 idioma hablar cuando el idioma de la app no es chino simplificado ni ingl\xE9s; vac\xEDo en otro caso",
      "pet.cua": "La parte de uso de la computadora: coordenadas de las capturas, cu\xE1ndo se pregunta primero a la persona y las reglas para no estorbarle; vac\xEDa mientras el uso de la computadora est\xE1 desactivado"
    },
    noGuide: "Esta app no tiene introducci\xF3n",
    unknownMethod: (name) => `M\xE9todo desconocido ${name}`
  },
  config: {
    group: "Mascota de escritorio",
    soundGroup: "Sonidos",
    asrGroup: "Entrada de voz",
    user: { title: "C\xF3mo llamarte", description: (max2) => `El nombre con el que te llaman los eventos de voz, escritura y toque, hasta ${max2} caracteres. Si est\xE1 vac\xEDo, se usa el nombre predeterminado.` },
    roam: { title: "Paseos", description: "free pasea a menudo; calm se queda en el mismo lugar la mayor parte del tiempo; off solo se mueve cuando se pide." },
    theme: { title: "Modo nocturno", description: "dark es noche: cuerpo claro y burbujas oscuras; light es d\xEDa: cuerpo oscuro y burbujas claras." },
    rememberPosition: { title: "Recordar posici\xF3n", description: "Guarda en qu\xE9 punto horizontal de la pantalla est\xE1 la mascota al cerrar la app y empieza ah\xED la pr\xF3xima vez; con varias pantallas siempre empieza en la principal." },
    hoverButtons: { title: "Botones al pasar el cursor", description: (max2, ids) => `Botones junto a la mascota mientras el puntero est\xE1 encima, hasta ${max2}, separados por comas: ${ids}.` },
    doubleClickChat: { title: "Doble clic para escribir", description: "Hacer doble clic en la mascota abre el cuadro de texto." },
    statusBubble: { title: "Burbuja de estado", description: "Muestra lo que hace la mascota mientras piensa, revisa la memoria o usa la computadora, incluidos los nombres de archivo." },
    saidBubbles: { title: "Burbujas de entrada", description: "Lo que se escribe, se dice o se env\xEDa desde la p\xE1gina de chat aparece sobre la mascota hasta que responde. Desactivado, la voz solo aparece mientras se reconoce." },
    selfAdjust: { title: "Autoajuste", description: "off: Coo no puede cambiar los ajustes ni quedarse en silencio un rato. default: personaje, atuendo, paseos y ronquidos cambian directamente; tama\xF1o, tama\xF1o de las burbujas, tama\xF1o del texto, sonidos, modo nocturno, botones al pasar el cursor y c\xF3mo te llama esperan tu consentimiento. any: todo cambia directamente. custom: seg\xFAn lo marcado en la p\xE1gina H\xE1bitos; lo marcado cambia directamente y lo dem\xE1s espera tu consentimiento." },
    windowEnabled: { title: "Abrir la ventana de la mascota al iniciar" },
    scale: { title: "Tama\xF1o" },
    bubbleSize: { title: "Tama\xF1o de las burbujas", description: "Ancho, m\xE1rgenes, esquinas y punta de las burbujas de la mascota y las tuyas, 1 es el valor predeterminado; el texto mantiene su tama\xF1o." },
    fontSize: { title: "Tama\xF1o del texto", description: "Tama\xF1o del texto en las burbujas, 1 es el valor predeterminado; las burbujas mantienen su ancho." },
    bubbleSpeed: { title: "Velocidad de las burbujas", description: "Qu\xE9 tan r\xE1pido se escriben las burbujas de la mascota y cu\xE1nto duran, 1 es el valor predeterminado; un valor mayor es m\xE1s r\xE1pido." },
    glow: { title: "Brillo exterior", description: "Cu\xE1ntos p\xEDxeles se extiende el brillo claro alrededor de la mascota cuando los colores de Coo se parecen al fondo; 0 lo apaga." },
    frameRate: { title: "Velocidad de fotogramas", description: "Fotogramas por segundo mientras la mascota camina, cuelga del puntero o salta; 0 sigue a la pantalla. Por encima de la frecuencia de actualizaci\xF3n de la pantalla, se usa la de la pantalla. La p\xE1gina H\xE1bitos ofrece 60, 120, 144 y Sin l\xEDmite." },
    lockFrameRate: { title: "Fijar velocidad de fotogramas", description: "Tambi\xE9n dibuja la mascota a esa velocidad en reposo. Si est\xE1 desactivado, baja a 30 fotogramas por segundo mientras est\xE1 de pie, se sienta o duerme." },
    hideWhenFullscreen: { title: "Ocultar en pantalla completa", description: "Si est\xE1 activado, la mascota se oculta mientras la ventana del frente ocupa toda la pantalla donde est\xE1 (un juego, un video en pantalla completa, un navegador en pantalla completa) y vuelve cuando termina la pantalla completa; una ventana maximizada no cuenta. Si est\xE1 desactivado, siempre queda encima." },
    exportOverlay: { title: "Overlay de OBS", description: "Sirve la imagen de la ventana de la mascota con fondo transparente en /overlay para una fuente \xABNavegador\xBB de OBS; si est\xE1 desactivado, no se sirve nada." },
    electronFile: { title: "Ejecutable de Electron", description: "Si est\xE1 vac\xEDo, se usa CORTICO_DESKTOP_PET_HOST y luego el entorno instalado desde el panel." },
    port: { title: "Puerto de la p\xE1gina", description: "Si est\xE1 ocupado, pasa al siguiente puerto libre." },
    touchEnabled: { title: "Los toques se vuelven eventos", description: "Toquecitos, caricias, levantadas y lanzamientos." },
    touchWakeOn: { title: "Modo de respuesta", description: "poke: solo un toque recibe respuesta enseguida; los dem\xE1s toques esperan a la siguiente respuesta. all: todos los toques reciben respuesta. none: todos los toques esperan a la siguiente respuesta. custom: reciben respuesta los toques marcados en la p\xE1gina H\xE1bitos. Tras una respuesta, los toques hasta el final de ese turno esperan a la siguiente." },
    sound: { title: "Todos los sonidos", description: "El bot\xF3n de sonido del men\xFA de la mascota cambia esto." },
    sounds: {
      move: { title: "Movimientos", description: "Caminar, correr, saltar, aterrizar, salir volando, asentir, negar con la cabeza, girar, marearse, temblar, bailar, mirar alrededor." },
      touch: { title: "Toque", description: "Levantadas, balanceos, caricias, toquecitos." },
      face: { title: "Caras", description: "Feliz, gui\xF1o, amor, sorpresa, enojo, tristeza, timidez, bostezo." },
      snore: { title: "Ronquidos", description: "" },
      talk: { title: "Habla", description: "El balbuceo mientras aparece el texto de la burbuja, y las tarjetas de opciones al aparecer." },
      ui: { title: "Botones y avisos", description: "Clics en botones, burbujas que se abren, selecciones, y el inicio y el fin de la escucha." }
    },
    snoreSeconds: { title: "Duraci\xF3n del ronquido", suffix: "s", description: "En cada siesta la mascota se queda en silencio tras roncar este tiempo; las z siguen flotando. 0 = roncar hasta despertar." },
    speech: { title: "Voz", description: "Dice una s\xEDlaba por cada car\xE1cter que aparece en un globo, en lugar del balbuceo de Habla; calla mientras los sonidos de Habla est\xE1n desactivados." },
    speechPitch: { title: "Tono de la voz", description: (a, b, c) => `low, mid y high son ${a}, ${b} y ${c} Hz; custom usa el tono personalizado.` },
    speechPitchHz: { title: "Tono personalizado" },
    speechSpeed: { title: "Velocidad de la voz", description: (a, b, c) => `S\xEDlabas por segundo como m\xE1ximo: low, mid y high son ${a}, ${b} y ${c}; custom usa la velocidad personalizada. Si es m\xE1s lenta que el texto, la voz termina despu\xE9s de \xE9l.` },
    speechRate: { title: "Velocidad personalizada", suffix: "s\xEDlabas/s" },
    asrEnabled: { title: "Entrada de voz" },
    asrEngine: { title: "Motor de reconocimiento", description: "funasr ejecuta SenseVoiceSmall de FunASR, para chino, ingl\xE9s, japon\xE9s, coreano y canton\xE9s, tras una descarga \xFAnica de unos 240 MB; whisper ejecuta Whisper small de OpenAI, para franc\xE9s, alem\xE1n, espa\xF1ol, portugu\xE9s, italiano, ruso y unos 90 idiomas m\xE1s, tras una descarga \xFAnica de unos 360 MB, y muestra el texto al terminar cada frase; ambos reconocen en esta computadora. system usa el reconocimiento de voz propio de Windows, sin descargas y con menor precisi\xF3n (solo en Windows). api env\xEDa la grabaci\xF3n de cada frase a un servicio de transcripci\xF3n compatible con OpenAI y muestra el texto al terminar la frase; su direcci\xF3n y su modelo se configuran abajo, y su API Key en la p\xE1gina Entrada de voz. Si est\xE1 vac\xEDo, se elige seg\xFAn el idioma de la app: funasr para chino, ingl\xE9s, japon\xE9s y coreano, y whisper para el resto." },
    asrLanguage: { title: "Idioma", description: "Un c\xF3digo ISO 639-1, o auto para que el modelo lo detecte; si est\xE1 vac\xEDo, sigue el idioma de la app. FunASR acepta zh, en, ja, ko y yue, y Whisper unos cien c\xF3digos como fr, de, es, pt, it y ru; un c\xF3digo que el modelo no acepta se toma como auto. El servicio de transcripci\xF3n recibe el c\xF3digo solo cuando tiene dos letras." },
    asrApiUrl: { title: "Direcci\xF3n del servicio de transcripci\xF3n", description: "Con el motor api, cada frase se env\xEDa a /audio/transcriptions bajo esta direcci\xF3n, por ejemplo https://api.example.com/v1. Una direcci\xF3n remota debe usar https; las direcciones de esta computadora o de la red local pueden usar http." },
    asrApiModel: { title: "Modelo de transcripci\xF3n", description: "El modelo que se indica en las solicitudes con el motor api." },
    asrThreads: { title: "Hilos de CPU", description: "Hilos que usan FunASR y Whisper en un reconocimiento; 0 = 2." },
    asrSimplified: { title: "Convertir a simplificado", description: "Convierte a simplificados los caracteres tradicionales de lo que se escuch\xF3 mientras el idioma de la app es chino simplificado." },
    thresholdDb: { title: "Umbral de voz" },
    silenceMs: { title: "Silencio que termina una frase" },
    maxUtteranceMs: { title: "Frase m\xE1s larga" }
  },
  panel: {
    pet: "Mascota de escritorio",
    window: "Ventana de la mascota",
    openWindow: "Abrir ventana",
    closeWindow: "Cerrar ventana",
    runtime: "Entorno de la ventana",
    install: "Instalar",
    viewInBrowser: "Ver en el navegador",
    dress: "Vestuario",
    dressHint: "Los cambios se guardan al instante y llegan a la ventana de la mascota",
    connected: "Conectada",
    starting: "Iniciando",
    cannotOpen: "No se puede abrir",
    notOpen: "Sin abrir",
    external: "Usando un programa externo",
    installed: "Instalado",
    downloading: (progress) => `Descargando ${progress}`,
    installFailed: "Fall\xF3 la instalaci\xF3n",
    notInstalled: "Sin instalar",
    noBuild: "No hay paquete precompilado para esta plataforma",
    electronSize: "Electron 44.4.4, unos 150 MB",
    voice: "Entrada de voz",
    enable: "Activar la entrada de voz",
    enabledHint: "El micr\xF3fono queda abierto; lo que dices llega a Coo seg\xFAn el modo de escucha",
    enabledHintOnPress: "El micr\xF3fono se abre mientras mantienes la tecla para hablar y se cierra al soltarla",
    disabledHint: "Desactivada: el micr\xF3fono queda cerrado y la configuraci\xF3n de abajo espera",
    engine: "Motor de reconocimiento",
    funasr: "FunASR (en esta computadora)",
    system: "Integrado de Windows",
    whisper: "Whisper (en esta computadora)",
    systemHint: "Sin descargas, precisi\xF3n aceptable; cambia a FunASR o Whisper para mejores resultados",
    funasrHint: "SenseVoiceSmall en esta computadora, para chino, ingl\xE9s, japon\xE9s, coreano y canton\xE9s",
    whisperHint: "Whisper small en esta computadora, para franc\xE9s, alem\xE1n, espa\xF1ol, portugu\xE9s, italiano, ruso y m\xE1s; el texto aparece al terminar cada frase",
    api: "Servicio de transcripci\xF3n (compatible con OpenAI)",
    apiName: "Servicio de transcripci\xF3n",
    apiHint: "Cada frase se env\xEDa al servicio configurado abajo; el texto aparece al terminar la frase",
    apiUrl: "Direcci\xF3n",
    apiModel: "Modelo",
    apiKey: "API Key",
    keySaved: "Guardada",
    keyMissing: "Sin configurar",
    server: "Servicio de reconocimiento",
    start: "Iniciar",
    stop: "Detener",
    ready: "Listo",
    error: "Error",
    stopped: "Detenido",
    model: "Modelo de voz",
    download: "Descargar",
    retry: "Reintentar",
    downloadFailed: "Fall\xF3 la descarga",
    downloaded: "Descargado",
    notDownloaded: "Sin descargar",
    modelSource: (size) => `Unos ${size}, se descarga de ModelScope`,
    mic: "Micr\xF3fono",
    micStates: { on: "Escuchando", off: "Sin escuchar", denied: "Denegado", error: "Error" },
    defaultDevice: "Predeterminado del sistema",
    missingDevice: "El dispositivo elegido antes (ahora no se encuentra)",
    micN: (n) => `Micr\xF3fono ${n}`,
    mode: "C\xF3mo escucha",
    modes: { hold: "Mientras se mantiene la tecla para hablar", toggle: "La tecla para hablar lo activa y desactiva", always: "Todo el tiempo" },
    openOnPress: "Abrir el micr\xF3fono solo al mantener la tecla",
    openOnPressHint: "Para auriculares, como los Bluetooth, que pasan al modo llamada con el micr\xF3fono abierto; despu\xE9s de presionar, espera un momento antes de hablar o se pueden perder las primeras palabras",
    switchOn: "Activado",
    switchOff: "Desactivado",
    presses: {
      2: { hold: "Presionar dos veces y mantener", toggle: "Presionar dos veces para empezar y otra vez para parar" },
      1: { hold: "Solo mantener", toggle: "Presionar para empezar y otra vez para parar" },
      3: { hold: "Presionar tres veces y mantener", toggle: "Presionar tres veces para empezar y otra vez para parar" }
    },
    capture: "Presiona la nueva tecla para hablar: una combinaci\xF3n de teclas o un bot\xF3n lateral del mouse\u2026 (Esc cancela)",
    listening: "Escuchando",
    waitingKey: "Esperando la tecla para hablar",
    results: "Lo que se escuch\xF3",
    resultsHint: "Las l\xEDneas tachadas eran demasiado cortas o probables alucinaciones, y no se enviaron",
    talkKeyName: "Tecla para hablar",
    changeKey: "Cambiar",
    cancelKey: "Cancelar",
    level: "Nivel de entrada",
    thresholdHint: "Solo el sonido m\xE1s fuerte que esta l\xEDnea cuenta como voz; si otra persona habla tan fuerte como t\xFA, tambi\xE9n se reconoce",
    noResults: "Todav\xEDa no hay resultados"
  },
  chat: {
    badImages: "Las im\xE1genes no est\xE1n en un formato que esta p\xE1gina env\xEDe",
    tooManyImages: (max2) => `Como m\xE1ximo ${max2} im\xE1genes a la vez`,
    badMime: (mime) => `Tipo de imagen no compatible: ${mime}`,
    emptyImage: "Una de las im\xE1genes est\xE1 vac\xEDa",
    bigImage: (mb) => `Cada imagen debe pesar menos de ${mb} MB`,
    offline: "A\xFAn no hay conexi\xF3n",
    notSent: "No se pudo enviar",
    tooLate: "Ese mensaje ya se entreg\xF3 y no se puede retirar."
  }
};
var es_419_default = es419;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/pt-BR.ts
var ptBR = {
  defaultUser: "Par\xE7a",
  menu: {
    quit: "Sair",
    quitPrompt: (label) => `${label}?`
  },
  busy: "Trabalhando",
  voice: {
    starting: "O reconhecimento de voz est\xE1 iniciando",
    notRunning: "O reconhecimento de voz n\xE3o est\xE1 em execu\xE7\xE3o",
    modelMissing: (mb) => `O modelo de voz ainda n\xE3o foi baixado (cerca de ${mb} MB): baixe-o na p\xE1gina Entrada de voz`,
    badKey: (hotkey) => `Tecla desconhecida \u201C${hotkey}\u201D`,
    keyProblem: (problem) => `A tecla para falar n\xE3o est\xE1 dispon\xEDvel, ent\xE3o por enquanto a fala n\xE3o \xE9 reconhecida: ${problem}`,
    always: "Sempre ouvindo: \xE9 s\xF3 falar",
    toggleTaps: (label, taps) => `Pressione ${label} para come\xE7ar a ouvir e de novo ${taps === 2 ? "duas" : "tr\xEAs"} vezes para parar`,
    toggle: (key) => `Pressione ${key} para come\xE7ar a ouvir e de novo para parar`,
    holdTaps: (key, taps) => `Pressione ${key} ${taps === 2 ? "uma vez" : "duas vezes"}, depois segure a tecla e fale; solte para enviar`,
    hold: (key) => `Segure ${key} e fale; solte para enviar`,
    failedLine: (error) => `[falhou] ${error}`
  },
  keys: {
    LeftCtrl: "Ctrl esquerdo",
    RightCtrl: "Ctrl direito",
    LeftAlt: "Alt esquerdo",
    RightAlt: "Alt direito",
    LeftShift: "Shift esquerdo",
    RightShift: "Shift direito",
    RightWin: "Win direito",
    Backquote: "`",
    Mouse3: "Bot\xE3o do meio do mouse",
    Mouse4: "Bot\xE3o 4 do mouse",
    Mouse5: "Bot\xE3o 5 do mouse"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "Control esquerdo",
    RightCtrl: "Control direito",
    Alt: "Option",
    LeftAlt: "Option esquerdo",
    RightAlt: "Option direito",
    Win: "Command",
    RightWin: "Command direito"
  },
  taps: (taps, keys) => `${keys} ${taps === 2 ? "duas" : "tr\xEAs"} vezes`,
  hotkey: {
    cannotRead: (why) => `N\xE3o foi poss\xEDvel ler o teclado: ${why}`,
    macNoKey: "O teclado do Mac n\xE3o tem essa tecla; escolha outra tecla para falar",
    macPermission: "Sem permiss\xE3o de Monitoramento de Entrada: ative o Coopanion em Ajustes do Sistema \u2192 Privacidade e Seguran\xE7a \u2192 Monitoramento de Entrada e reinicie-o. Se j\xE1 estiver ativado, remova o Coopanion da lista com \u201C\u2212\u201D e adicione-o de novo: uma vers\xE3o atualizada n\xE3o herda a permiss\xE3o antiga",
    linuxNoKey: "O Linux n\xE3o consegue ler essa tecla (os bot\xF5es laterais do mouse n\xE3o funcionam); escolha outra tecla para falar",
    linuxNoDisplay: "A tecla para falar precisa do X11 (ou XWayland) no Linux: DISPLAY n\xE3o est\xE1 definido",
    linuxNoX11: "A tecla para falar n\xE3o consegue se conectar \xE0 tela do X11",
    unsupported: "A tecla para falar s\xF3 funciona no Windows, macOS e Linux"
  },
  typeKey: {
    macNoKey: "O teclado do Mac n\xE3o tem essa tecla; escolha outra tecla para digitar",
    linuxNoKey: "O Linux n\xE3o consegue ler essa tecla (os bot\xF5es laterais do mouse n\xE3o funcionam); escolha outra tecla para digitar",
    linuxNoDisplay: "A tecla para digitar precisa do X11 (ou XWayland) no Linux: DISPLAY n\xE3o est\xE1 definido",
    linuxNoX11: "A tecla para digitar n\xE3o consegue se conectar \xE0 tela do X11",
    unsupported: "A tecla para digitar s\xF3 funciona no Windows, macOS e Linux"
  },
  system: {
    name: (culture) => culture ? `Reconhecimento de Fala do Windows (${culture})` : "Reconhecimento de Fala do Windows",
    noSpeech: "O componente System.Speech n\xE3o carrega",
    noRecognizer: (language) => `O Windows n\xE3o tem um reconhecedor de fala${language === "auto" ? "" : ` para \u201C${language}\u201D`}: adicione Reconhecimento de fala para o idioma em Configura\xE7\xF5es do Windows \u2192 Hora e idioma \u2192 Idioma`,
    windowsOnly: "O Reconhecimento de Fala do Windows s\xF3 existe no Windows",
    startFailed: (why) => `Falha ao iniciar: ${why}`,
    exited: "O processo de reconhecimento de fala foi encerrado",
    exitedCode: (code) => `O processo de reconhecimento de fala foi encerrado (c\xF3digo de sa\xEDda ${code})`,
    notReady: "O Reconhecimento de Fala do Windows n\xE3o ficou pronto a tempo",
    notRunning: "O Reconhecimento de Fala do Windows n\xE3o est\xE1 em execu\xE7\xE3o",
    timeout: (ms) => `O reconhecimento excedeu o tempo limite (${ms} ms)`,
    stopped: "O Reconhecimento de Fala do Windows parou"
  },
  sherpa: {
    incomplete: "Faltam arquivos do modelo de voz: baixe-o de novo",
    noRuntime: (platform) => `O sherpa-onnx n\xE3o tem ambiente de execu\xE7\xE3o para esta plataforma (${platform})`,
    loadFailed: (why) => `Falha ao carregar o modelo de voz: ${why}`,
    notLoaded: "O modelo de voz n\xE3o est\xE1 carregado"
  },
  /** O serviço de transcrição compatível com a OpenAI (motor api) */
  transcription: {
    noUrl: "O endere\xE7o do servi\xE7o de transcri\xE7\xE3o n\xE3o foi preenchido",
    badUrl: (url) => `O endere\xE7o n\xE3o \xE9 uma URL http ou https: ${url}`,
    httpRemote: "Um endere\xE7o remoto precisa usar https: http n\xE3o \xE9 criptografado, ent\xE3o a API Key e as grava\xE7\xF5es trafegariam em texto puro. Endere\xE7os deste computador ou da rede local podem usar http.",
    noModel: "O modelo de transcri\xE7\xE3o n\xE3o foi preenchido",
    notRunning: "O servi\xE7o de transcri\xE7\xE3o n\xE3o foi iniciado",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `O servi\xE7o n\xE3o respondeu em ${ms} ms`,
    network: (why) => `N\xE3o foi poss\xEDvel conectar ao servi\xE7o: ${why}`,
    noText: "O servi\xE7o respondeu sem text"
  },
  store: {
    noBuild: (platform) => `N\xE3o h\xE1 pacote pr\xE9-compilado para ${platform}`,
    downloading: (file) => `Baixando ${file}`,
    unpacking: "Descompactando",
    downloadingModel: "Baixando o modelo de voz",
    downloadingFrom: (file, host) => `Baixando ${file} (${host})`,
    verifying: (file) => `Verificando ${file}`,
    mismatch: (sum) => `A soma de verifica\xE7\xE3o n\xE3o confere: ${sum}\u2026`,
    failed: (file, why) => `Falha ao baixar ${file} (${why})`,
    exitCode: (cmd, code, out) => `${cmd} c\xF3digo de sa\xEDda ${code}: ${out}`
  },
  packs: {
    noManifest: (file) => `Falta ${file}`,
    badJson: (file, why) => `${file} n\xE3o \xE9 um JSON v\xE1lido: ${why}`,
    notInteger: (key, got) => `${key} deve ser um inteiro, n\xE3o ${got}`,
    tooNew: (key, v, now) => `${key} \xE9 ${v}; esta vers\xE3o l\xEA at\xE9 ${now}: atualize o app primeiro`,
    tooOld: (key, v, oldest) => `${key} ${v} \xE9 um formato de teste anterior a ${oldest} e n\xE3o pode ser lido`,
    badId: (got) => `id inv\xE1lido: ${got}`,
    noName: "Falta name",
    noAbout: "Falta about",
    badEntry: "entry ou export \xE9 inv\xE1lido",
    badModel: "O caminho de model \xE9 inv\xE1lido",
    badThumb: "O caminho de thumb \xE9 inv\xE1lido",
    badAxis: (got) => `Item inv\xE1lido em axes: ${got}`,
    badOption: (axis, got) => `Op\xE7\xE3o inv\xE1lida em axes.${axis}: ${got}`,
    badPreset: (got) => `Item inv\xE1lido em presets: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} n\xE3o escolhe nenhuma op\xE7\xE3o para ${axis}`,
    vocabNotArray: "vocab deve ser um array",
    badWordId: (got) => `id inv\xE1lido em vocab: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind \xE9 ${kind}, que esta vers\xE3o n\xE3o conhece; o bot n\xE3o recebe esta palavra`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} deve ser um array`,
    badWordName: (id, got) => `Nome inv\xE1lido em vocab.${id}: ${got}`,
    nameTaken: (name) => `${name} nomeia mais de uma palavra em vocab`,
    noWordAbout: (id) => `Falta vocab.${id}.about`,
    badSeconds: (id) => `vocab.${id}.seconds deve ser um n\xFAmero positivo`,
    soundsNotObject: "sounds deve ser um objeto",
    badSoundName: (got) => `Nome inv\xE1lido em sounds: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file deve ser um arquivo do pacote`,
    badVolume: (name) => `sounds.${name}.volume deve estar entre 0 e 1`,
    soundType: (name, file) => `${file} de sounds.${name} n\xE3o \xE9 um .ogg, .mp3 ou .wav que esta vers\xE3o reproduza; o som fica mudo`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind \xE9 ${kind}; esta vers\xE3o s\xF3 conhece ${kinds.join(", ")}, ent\xE3o o som fica mudo`,
    soundMissing: (name, file) => `${file} de sounds.${name} n\xE3o existe; o som fica mudo`,
    badWalk: (got) => `can.walk \xE9 ${got}, que esta vers\xE3o n\xE3o conhece; considerado capaz de andar`,
    movesNotArray: "moves deve ser uma lista",
    tooManyMoves: (max2) => `moves aceita no m\xE1ximo ${max2} destinos`,
    badMoveId: (got) => `id inv\xE1lido em moves: ${got} (left, center, right, cursor e n\xFAmeros s\xE3o os destinos padr\xE3o)`,
    moveTaken: (id) => `${id} aparece mais de uma vez em moves`,
    noMoveText: (id) => `moves.${id} n\xE3o tem name ou about`,
    badMoveParams: (id, max2) => `moves.${id}.params deve ser uma lista de no m\xE1ximo ${max2} itens, cada um com id, about e n\xFAmeros min menor que max`,
    needsNotArray: "needs deve ser uma lista",
    unknownNeed: (got) => `${got} em needs n\xE3o \xE9 oferecido por esta vers\xE3o; foi deixado de fora`,
    idTaken: (id, builtin) => `O id ${id} j\xE1 \xE9 usado por ${builtin ? "um personagem integrado" : "outro pacote"}`
  },
  importing: {
    badZip: (why) => `N\xE3o \xE9 um zip leg\xEDvel: ${why}`,
    tooBig: (mb) => `Mais de ${mb} MB descompactado`,
    truncated: "O envio est\xE1 incompleto",
    badPath: (path) => `Um caminho n\xE3o pode ser usado: ${path}`,
    builtinId: (id) => `O id ${id} pertence a um personagem integrado; mude o id para import\xE1-lo`,
    duplicateId: (id) => `O id ${id} \xE9 igual ao de outro pacote nesta importa\xE7\xE3o`,
    unpackFailed: (why) => `N\xE3o foi poss\xEDvel descompactar: ${why}`,
    expired: "Esta importa\xE7\xE3o expirou; escolha os arquivos de novo",
    noneChosen: "Nenhum pacote foi escolhido",
    zipOrFolder: "S\xF3 \xE9 poss\xEDvel importar um zip ou pastas",
    overLimit: (mb) => `Mais de ${mb} MB`
  },
  removing: {
    notInstalled: (id) => `Nenhum pacote de personagem tem o id ${id}`,
    builtin: (id) => `${id} \xE9 um personagem integrado e n\xE3o pode ser desinstalado`,
    elsewhere: (id) => `${id} n\xE3o est\xE1 na pasta de instala\xE7\xE3o de pacotes de personagem; n\xE3o \xE9 poss\xEDvel desinstal\xE1-lo aqui`,
    failed: (why) => `N\xE3o foi poss\xEDvel excluir: ${why}`
  },
  consent: {
    question: (items) => `Posso ${items.join(", ")}?`,
    choices: ["Pode", "Pode sempre", "N\xE3o, obrigado"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `mudar para ${to}`,
    scheme: (figure, look) => `trocar o visual de ${figure} (${look})`,
    roam: { free: "Com frequ\xEAncia", calm: "De vez em quando", off: "Sem se mexer" },
    roamTo: (to) => `deixar meus passeios em \u201C${to}\u201D`,
    snore: (seconds) => seconds === 0 ? "roncar at\xE9 acordar" : `roncar ${seconds} s cada vez que eu dormir`,
    sound: (on) => on ? "ligar os sons" : "desligar os sons",
    scale: (from, to) => `mudar meu tamanho de ${from}\xD7 para ${to}\xD7`,
    bubbleSize: (from, to) => `mudar o tamanho dos bal\xF5es de ${from}\xD7 para ${to}\xD7`,
    fontSize: (from, to) => `mudar o tamanho do texto de ${from}\xD7 para ${to}\xD7`,
    theme: { dark: "mudar para a apar\xEAncia de noite", light: "mudar para a apar\xEAncia de dia" },
    hover: (list) => `trocar os bot\xF5es ao passar o mouse para ${list}`,
    actions: { chat: "Digitar", voice: "Entrada de voz", roam: "Passeios", theme: "Modo noturno", sound: "Sons", dress: "Guarda-roupa", hide: "Ocultar o pet" },
    user: (to) => `chamar voc\xEA de \u201C${to}\u201D`
  },
  portsTaken: (from, to, why) => `As portas ${from}\u2013${to} est\xE3o todas ocupadas: ${why}`,
  console: {
    label: "Pet de \xE1rea de trabalho",
    window: "Janela do pet",
    connected: "P\xE1gina conectada",
    notOpen: "N\xE3o aberta",
    noBody: (reason) => `P\xE1gina conectada, o personagem n\xE3o pode ser desenhado: ${reason}`,
    alsoBrowser: (hint) => `${hint}; h\xE1 uma p\xE1gina do navegador conectada`,
    voice: "Reconhecimento de voz",
    notStarted: "N\xE3o iniciado",
    viewInBrowser: "Ver o pet no navegador",
    dress: "Guarda-roupa",
    panels: {
      pet: { title: "Pet de \xE1rea de trabalho", description: "A janela, o visual e o ambiente de execu\xE7\xE3o da janela." },
      voice: { title: "Entrada de voz", description: "Motor de reconhecimento, n\xEDvel de entrada e o que foi ouvido." }
    },
    envPrompt: { title: "Ambiente do pet de \xE1rea de trabalho", description: "Descreve o corpo do pet, as quatro ferramentas e os eventos de entrada." },
    vars: {
      "pet.user": "Como o bot chama a pessoa",
      "pet.vocab": "As express\xF5es e os movimentos do personagem atual",
      "pet.moves": "Os destinos pr\xF3prios do personagem atual (pet_move_to); vazio se n\xE3o tiver",
      "pet.voice": "Se a entrada de voz est\xE1 ligada ou desligada",
      "pet.body": "A apar\xEAncia do personagem atual",
      "pet.dress": "Os personagens e visuais que pet_set pode escolher",
      "pet.self": "Autoajuste: quais configura\xE7\xF5es mudam direto, quais esperam consentimento, ou que nenhuma pode mudar",
      "pet.chat": "Uma nota sobre a p\xE1gina de chat quando o app tem uma; vazio caso contr\xE1rio",
      "pet.reply": "Uma linha que diz ao bot em que idioma falar quando o idioma do app n\xE3o \xE9 chin\xEAs simplificado nem ingl\xEAs; vazio caso contr\xE1rio",
      "pet.cua": "A parte de uso do computador: coordenadas das capturas, quando a pessoa \xE9 consultada antes e as regras para n\xE3o atrapalh\xE1-la; vazia enquanto o uso do computador est\xE1 desligado"
    },
    noGuide: "Este app n\xE3o tem introdu\xE7\xE3o",
    unknownMethod: (name) => `M\xE9todo desconhecido ${name}`
  },
  config: {
    group: "Pet de \xE1rea de trabalho",
    soundGroup: "Sons",
    asrGroup: "Entrada de voz",
    user: { title: "Como chamar voc\xEA", description: (max2) => `O nome pelo qual os eventos de voz, digita\xE7\xE3o e toque chamam voc\xEA, at\xE9 ${max2} caracteres. Vazio usa o nome padr\xE3o.` },
    roam: { title: "Passeios", description: "free passeia com frequ\xEAncia; calm passeia pouco e quase sempre fica no lugar; off s\xF3 se mexe quando pedem." },
    theme: { title: "Modo noturno", description: "dark \xE9 noite: corpo claro e bal\xF5es escuros; light \xE9 dia: corpo escuro e bal\xF5es claros." },
    rememberPosition: { title: "Lembrar a posi\xE7\xE3o", description: "Salva em que ponto horizontal da tela o pet est\xE1 quando o app fecha e come\xE7a ali na pr\xF3xima vez; com v\xE1rias telas, sempre come\xE7a na principal." },
    hoverButtons: { title: "Bot\xF5es ao passar o mouse", description: (max2, ids) => `Bot\xF5es ao lado do pet enquanto o ponteiro est\xE1 em cima, at\xE9 ${max2}, separados por v\xEDrgulas: ${ids}.` },
    doubleClickChat: { title: "Clique duplo para digitar", description: "Clicar duas vezes no pet abre a caixa de texto." },
    statusBubble: { title: "Bal\xE3o de status", description: "Mostra o que o pet est\xE1 fazendo enquanto pensa, consulta a mem\xF3ria ou usa o computador, incluindo nomes de arquivos." },
    saidBubbles: { title: "Bal\xF5es de entrada", description: "O que \xE9 digitado, falado ou enviado pela p\xE1gina de chat aparece acima do pet at\xE9 Coo responder. Desligado, a fala s\xF3 aparece enquanto \xE9 reconhecida." },
    selfAdjust: { title: "Autoajuste", description: "off: Coo n\xE3o pode mudar as configura\xE7\xF5es nem fazer sil\xEAncio por um tempo. default: personagem, visual, passeios e ronco mudam direto; tamanho, tamanho dos bal\xF5es, tamanho do texto, sons, modo noturno, bot\xF5es ao passar o mouse e como chama voc\xEA esperam seu consentimento. any: tudo muda direto. custom: conforme marcado na p\xE1gina H\xE1bitos; o que estiver marcado muda direto e o resto espera seu consentimento." },
    windowEnabled: { title: "Abrir a janela do pet ao iniciar" },
    scale: { title: "Tamanho" },
    bubbleSize: { title: "Tamanho dos bal\xF5es", description: "Largura, margens, cantos e ponta dos bal\xF5es do pet e dos seus, 1 \xE9 o padr\xE3o; o texto mant\xE9m o tamanho." },
    fontSize: { title: "Tamanho do texto", description: "Tamanho do texto nos bal\xF5es, 1 \xE9 o padr\xE3o; os bal\xF5es mant\xEAm a largura." },
    bubbleSpeed: { title: "Velocidade dos bal\xF5es", description: "Velocidade com que os bal\xF5es do pet s\xE3o escritos e quanto tempo ficam, 1 \xE9 o padr\xE3o; valores maiores s\xE3o mais r\xE1pidos." },
    glow: { title: "Brilho externo", description: "Quantos pixels o brilho claro em volta do pet alcan\xE7a quando as cores do Coo se parecem com o fundo; 0 desliga." },
    frameRate: { title: "Taxa de quadros", description: "Quadros por segundo enquanto o pet anda ou pula, ou enquanto voc\xEA carrega o pet; 0 segue a tela. Acima da taxa de atualiza\xE7\xE3o da tela, vale a da tela. A p\xE1gina H\xE1bitos oferece 60, 120, 144 e Sem limite." },
    lockFrameRate: { title: "Travar taxa de quadros", description: "Desenha o pet nessa taxa tamb\xE9m em repouso. Desligado, cai para 30 quadros por segundo quando est\xE1 em p\xE9, na posi\xE7\xE3o sentada ou dormindo." },
    hideWhenFullscreen: { title: "Ocultar em tela cheia", description: "Ligado, o pet se esconde enquanto a janela em primeiro plano ocupa toda a tela onde o pet est\xE1 (um jogo, um v\xEDdeo em tela cheia, um navegador em tela cheia) e volta quando a tela cheia termina; uma janela maximizada n\xE3o conta. Desligado, fica sempre por cima." },
    exportOverlay: { title: "Overlay do OBS", description: "Serve a imagem da janela do pet com fundo transparente em /overlay para uma fonte \u201CNavegador\u201D do OBS; desligado, nada \xE9 servido." },
    electronFile: { title: "Execut\xE1vel do Electron", description: "Vazio usa CORTICO_DESKTOP_PET_HOST e depois o ambiente instalado pelo painel." },
    port: { title: "Porta da p\xE1gina", description: "Se estiver ocupada, passa para a pr\xF3xima porta livre." },
    touchEnabled: { title: "Toques viram eventos", description: "Cutucadas, carinho, e pegar e arremessar o pet." },
    touchWakeOn: { title: "Modo de resposta", description: "poke: s\xF3 um cutuc\xE3o recebe resposta na hora; os outros toques esperam a pr\xF3xima resposta. all: todo toque recebe resposta na hora. none: todo toque espera a pr\xF3xima resposta. custom: os toques marcados na p\xE1gina H\xE1bitos recebem resposta na hora. Depois de uma resposta, os toques at\xE9 o fim desse turno esperam a pr\xF3xima." },
    sound: { title: "Todos os sons", description: "O bot\xE3o de som no menu do pet alterna isto." },
    sounds: {
      move: { title: "Movimentos", description: "Andar, correr, pular, aterrissar, arremesso, acenar com a cabe\xE7a, balan\xE7ar a cabe\xE7a, girar, tontura, tremer, dan\xE7ar, olhar em volta." },
      touch: { title: "Toque", description: "Pegar, balan\xE7ar, fazer carinho, cutucar." },
      face: { title: "Express\xF5es", description: "Feliz, piscadela, amor, surpresa, raiva, tristeza, timidez, bocejo." },
      snore: { title: "Ronco", description: "" },
      talk: { title: "Fala", description: "O balbucio enquanto o texto do bal\xE3o aparece, e os cart\xF5es de op\xE7\xE3o surgindo." },
      ui: { title: "Bot\xF5es e avisos", description: "Cliques em bot\xF5es, bal\xF5es abrindo, sele\xE7\xF5es, e o in\xEDcio e o fim da escuta." }
    },
    snoreSeconds: { title: "Dura\xE7\xE3o do ronco", suffix: "s", description: "Em cada soneca o pet para de roncar depois desse tempo; os z continuam flutuando. 0 = roncar at\xE9 acordar." },
    speech: { title: "Voz", description: "Diz uma s\xEDlaba a cada caractere que aparece num bal\xE3o, no lugar do balbucio de Fala; fica muda enquanto os sons de Fala est\xE3o desligados." },
    speechPitch: { title: "Tom da voz", description: (a, b, c) => `low, mid e high s\xE3o ${a}, ${b} e ${c} Hz; custom usa o tom personalizado.` },
    speechPitchHz: { title: "Tom personalizado" },
    speechSpeed: { title: "Velocidade da voz", description: (a, b, c) => `S\xEDlabas por segundo no m\xE1ximo: low, mid e high s\xE3o ${a}, ${b} e ${c}; custom usa a velocidade personalizada. Mais lenta que o texto, a voz termina depois dele.` },
    speechRate: { title: "Velocidade personalizada", suffix: "s\xEDlabas/s" },
    asrEnabled: { title: "Entrada de voz" },
    asrEngine: { title: "Motor de reconhecimento", description: "funasr roda o SenseVoiceSmall do FunASR, para chin\xEAs, ingl\xEAs, japon\xEAs, coreano e canton\xEAs, depois de um download \xFAnico de cerca de 240 MB; whisper roda o Whisper small da OpenAI, para franc\xEAs, alem\xE3o, espanhol, portugu\xEAs, italiano, russo e cerca de 90 outros idiomas, depois de um download \xFAnico de cerca de 360 MB, e mostra o texto quando a frase termina; os dois reconhecem neste computador. system usa o reconhecimento de fala do pr\xF3prio Windows, sem download e com menos precis\xE3o (s\xF3 no Windows). api envia a grava\xE7\xE3o de cada frase a um servi\xE7o de transcri\xE7\xE3o compat\xEDvel com a OpenAI e mostra o texto quando a frase termina; o endere\xE7o e o modelo ficam abaixo, e a API Key na p\xE1gina Entrada de voz. Vazio escolhe pelo idioma do app: funasr para chin\xEAs, ingl\xEAs, japon\xEAs e coreano, whisper para os demais." },
    asrLanguage: { title: "Idioma", description: "Um c\xF3digo ISO 639-1, ou auto para o modelo identificar; vazio segue o idioma do app. O FunASR aceita zh, en, ja, ko e yue, e o Whisper cerca de cem c\xF3digos, como fr, de, es, pt, it e ru; um c\xF3digo que o modelo n\xE3o aceita vale como auto. O servi\xE7o de transcri\xE7\xE3o s\xF3 recebe o c\xF3digo quando ele tem duas letras." },
    asrApiUrl: { title: "Endere\xE7o do servi\xE7o de transcri\xE7\xE3o", description: "Com o motor api, cada frase vai para /audio/transcriptions sob este endere\xE7o, por exemplo https://api.example.com/v1. Um endere\xE7o remoto precisa usar https; endere\xE7os deste computador ou da rede local podem usar http." },
    asrApiModel: { title: "Modelo de transcri\xE7\xE3o", description: "O modelo indicado nas requisi\xE7\xF5es com o motor api." },
    asrThreads: { title: "Threads de CPU", description: "Threads que o FunASR e o Whisper usam em um reconhecimento; 0 = 2." },
    asrSimplified: { title: "Converter para simplificado", description: "Converte para simplificados os caracteres tradicionais do que foi ouvido enquanto o idioma do app \xE9 chin\xEAs simplificado." },
    thresholdDb: { title: "Limiar de fala" },
    silenceMs: { title: "Sil\xEAncio que encerra uma frase" },
    maxUtteranceMs: { title: "Frase mais longa" }
  },
  panel: {
    pet: "Pet de \xE1rea de trabalho",
    window: "Janela do pet",
    openWindow: "Abrir janela",
    closeWindow: "Fechar janela",
    runtime: "Ambiente da janela",
    install: "Instalar",
    viewInBrowser: "Ver no navegador",
    dress: "Guarda-roupa",
    dressHint: "As mudan\xE7as s\xE3o salvas na hora e chegam \xE0 janela do pet",
    connected: "Conectada",
    starting: "Iniciando",
    cannotOpen: "N\xE3o abre",
    notOpen: "N\xE3o aberta",
    external: "Usando um programa externo",
    installed: "Instalado",
    downloading: (progress) => `Baixando ${progress}`,
    installFailed: "Falha na instala\xE7\xE3o",
    notInstalled: "N\xE3o instalado",
    noBuild: "N\xE3o h\xE1 pacote pr\xE9-compilado para esta plataforma",
    electronSize: "Electron 44.4.4, cerca de 150 MB",
    voice: "Entrada de voz",
    enable: "Ligar a entrada de voz",
    enabledHint: "O microfone fica aberto; a fala vai para Coo conforme o modo de escuta",
    enabledHintOnPress: "O microfone abre enquanto a tecla para falar est\xE1 pressionada e fecha ao soltar",
    disabledHint: "Desligada: o microfone fica fechado e as configura\xE7\xF5es abaixo aguardam",
    engine: "Motor de reconhecimento",
    funasr: "FunASR (neste computador)",
    system: "Nativo do Windows",
    whisper: "Whisper (neste computador)",
    systemHint: "Sem download, precis\xE3o razo\xE1vel; mude para o FunASR ou o Whisper para resultados melhores",
    funasrHint: "SenseVoiceSmall neste computador, para chin\xEAs, ingl\xEAs, japon\xEAs, coreano e canton\xEAs",
    whisperHint: "Whisper small neste computador, para franc\xEAs, alem\xE3o, espanhol, portugu\xEAs, italiano, russo e outros; o texto aparece quando a frase termina",
    api: "Servi\xE7o de transcri\xE7\xE3o (compat\xEDvel com a OpenAI)",
    apiName: "Servi\xE7o de transcri\xE7\xE3o",
    apiHint: "Cada frase \xE9 enviada ao servi\xE7o configurado abaixo; o texto aparece quando a frase termina",
    apiUrl: "Endere\xE7o",
    apiModel: "Modelo",
    apiKey: "API Key",
    keySaved: "Salva",
    keyMissing: "N\xE3o preenchida",
    server: "Servi\xE7o de reconhecimento",
    start: "Iniciar",
    stop: "Parar",
    ready: "Pronto",
    error: "Erro",
    stopped: "Parado",
    model: "Modelo de voz",
    download: "Baixar",
    retry: "Tentar de novo",
    downloadFailed: "Falha no download",
    downloaded: "Baixado",
    notDownloaded: "N\xE3o baixado",
    modelSource: (size) => `Cerca de ${size}, baixado do ModelScope`,
    mic: "Microfone",
    micStates: { on: "Ouvindo", off: "Sem ouvir", denied: "Negado", error: "Erro" },
    defaultDevice: "Padr\xE3o do sistema",
    missingDevice: "O dispositivo escolhido antes (n\xE3o encontrado agora)",
    micN: (n) => `Microfone ${n}`,
    mode: "Como ouve",
    modes: { hold: "Enquanto a tecla para falar est\xE1 pressionada", toggle: "A tecla para falar liga e desliga", always: "O tempo todo" },
    openOnPress: "Abrir o microfone s\xF3 enquanto segura",
    openOnPressHint: "Para fones, como os Bluetooth, que mudam para o modo de chamada com o microfone aberto; depois de pressionar, espere um momento antes de falar, ou as primeiras palavras podem se perder",
    switchOn: "Ligado",
    switchOff: "Desligado",
    presses: {
      2: { hold: "Pressionar duas vezes e segurar", toggle: "Pressionar duas vezes para come\xE7ar e de novo para parar" },
      1: { hold: "S\xF3 segurar", toggle: "Pressionar para come\xE7ar e de novo para parar" },
      3: { hold: "Pressionar tr\xEAs vezes e segurar", toggle: "Pressionar tr\xEAs vezes para come\xE7ar e de novo para parar" }
    },
    capture: "Pressione a nova tecla para falar: uma combina\xE7\xE3o de teclas ou um bot\xE3o lateral do mouse\u2026 (Esc cancela)",
    listening: "Ouvindo",
    waitingKey: "Aguardando a tecla para falar",
    results: "O que foi ouvido",
    resultsHint: "As linhas riscadas eram curtas demais ou provavelmente alucinadas, e n\xE3o foram enviadas",
    talkKeyName: "Tecla para falar",
    changeKey: "Alterar",
    cancelKey: "Cancelar",
    level: "N\xEDvel de entrada",
    thresholdHint: "S\xF3 o som mais alto que esta linha conta como fala; se outra pessoa falar t\xE3o alto quanto voc\xEA, tamb\xE9m \xE9 reconhecida",
    noResults: "Nenhum resultado ainda"
  },
  chat: {
    badImages: "As imagens n\xE3o est\xE3o em um formato que esta p\xE1gina envia",
    tooManyImages: (max2) => `No m\xE1ximo ${max2} imagens por vez`,
    badMime: (mime) => `Tipo de imagem n\xE3o suportado: ${mime}`,
    emptyImage: "Uma das imagens est\xE1 vazia",
    bigImage: (mb) => `Cada imagem deve ter menos de ${mb} MB`,
    offline: "Ainda sem conex\xE3o",
    notSent: "N\xE3o foi poss\xEDvel enviar",
    tooLate: "Essa mensagem j\xE1 foi entregue e n\xE3o pode ser retirada."
  }
};
var pt_BR_default = ptBR;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/it.ts
var it = {
  defaultUser: "Partner",
  menu: {
    quit: "Esci",
    quitPrompt: (label) => `${label}?`
  },
  busy: "Al lavoro",
  voice: {
    starting: "Il riconoscimento vocale si sta avviando",
    notRunning: "Il riconoscimento vocale non \xE8 in esecuzione",
    modelMissing: (mb) => `Il modello vocale non \xE8 ancora scaricato (circa ${mb} MB): scaricalo nella pagina Input vocale`,
    badKey: (hotkey) => `Tasto sconosciuto \xAB${hotkey}\xBB`,
    keyProblem: (problem) => `Il tasto per parlare non \xE8 disponibile, quindi per ora la voce non viene riconosciuta: ${problem}`,
    always: "Ascolto sempre: parla e basta",
    toggleTaps: (label, taps) => `${label} per iniziare ad ascoltare, di nuovo ${taps === 2 ? "doppia" : "tripla"} pressione per smettere`,
    toggle: (key) => `Premi ${key} per iniziare ad ascoltare, premilo di nuovo per smettere`,
    holdTaps: (key, taps) => `Premi ${key} ${taps === 2 ? "una volta" : "due volte"}, poi tienilo premuto e parla; rilascia per inviare`,
    hold: (key) => `Tieni premuto ${key} e parla; rilascia per inviare`,
    failedLine: (error) => `[non riuscito] ${error}`
  },
  keys: {
    LeftCtrl: "Ctrl sinistro",
    RightCtrl: "Ctrl destro",
    LeftAlt: "Alt sinistro",
    RightAlt: "Alt destro",
    LeftShift: "Maiusc sinistro",
    RightShift: "Maiusc destro",
    RightWin: "Win destro",
    Backquote: "`",
    Mouse3: "Tasto centrale del mouse",
    Mouse4: "Tasto 4 del mouse",
    Mouse5: "Tasto 5 del mouse"
  },
  macKeys: {
    Ctrl: "Controllo",
    LeftCtrl: "Controllo sinistro",
    RightCtrl: "Controllo destro",
    Alt: "Opzione",
    LeftAlt: "Opzione sinistro",
    RightAlt: "Opzione destro",
    Win: "Comando",
    RightWin: "Comando destro"
  },
  taps: (taps, keys) => `${taps === 2 ? "Doppia" : "Tripla"} pressione su ${keys}`,
  hotkey: {
    cannotRead: (why) => `Impossibile leggere la tastiera: ${why}`,
    macNoKey: "Una tastiera Mac non ha questo tasto; scegli un altro tasto per parlare",
    macPermission: "Manca il permesso Monitoraggio input: attiva Coopanion in Impostazioni di Sistema \u2192 Privacy e sicurezza \u2192 Monitoraggio input, poi riavvialo. Se \xE8 gi\xE0 attivo, rimuovi Coopanion dall'elenco con \xAB\u2212\xBB e aggiungilo di nuovo: una versione aggiornata non eredita il vecchio permesso",
    linuxNoKey: "Linux non pu\xF2 leggere questo tasto (i tasti laterali del mouse non funzionano); scegli un altro tasto per parlare",
    linuxNoDisplay: "Su Linux il tasto per parlare richiede X11 (o XWayland): DISPLAY non \xE8 impostato",
    linuxNoX11: "Il tasto per parlare non riesce a collegarsi al display X11",
    unsupported: "Il tasto per parlare funziona solo su Windows, macOS e Linux"
  },
  typeKey: {
    macNoKey: "Una tastiera Mac non ha questo tasto; scegli un altro tasto per scrivere",
    linuxNoKey: "Linux non pu\xF2 leggere questo tasto (i tasti laterali del mouse non funzionano); scegli un altro tasto per scrivere",
    linuxNoDisplay: "Su Linux il tasto per scrivere richiede X11 (o XWayland): DISPLAY non \xE8 impostato",
    linuxNoX11: "Il tasto per scrivere non riesce a collegarsi al display X11",
    unsupported: "Il tasto per scrivere funziona solo su Windows, macOS e Linux"
  },
  system: {
    name: (culture) => culture ? `Riconoscimento vocale di Windows (${culture})` : "Riconoscimento vocale di Windows",
    noSpeech: "Il componente System.Speech non si carica",
    noRecognizer: (language) => `Windows non ha un riconoscimento vocale${language === "auto" ? "" : ` per \xAB${language}\xBB`}: aggiungi il riconoscimento vocale per la lingua in Impostazioni di Windows \u2192 Data/ora e lingua \u2192 Lingua`,
    windowsOnly: "Il riconoscimento vocale di Windows esiste solo su Windows",
    startFailed: (why) => `Avvio non riuscito: ${why}`,
    exited: "Il processo di riconoscimento vocale \xE8 terminato",
    exitedCode: (code) => `Il processo di riconoscimento vocale \xE8 terminato (codice di uscita ${code})`,
    notReady: "Il riconoscimento vocale di Windows non \xE8 stato pronto in tempo",
    notRunning: "Il riconoscimento vocale di Windows non \xE8 in esecuzione",
    timeout: (ms) => `Tempo scaduto per il riconoscimento (${ms} ms)`,
    stopped: "Il riconoscimento vocale di Windows si \xE8 fermato"
  },
  sherpa: {
    incomplete: "Mancano alcuni file del modello vocale: scaricalo di nuovo",
    noRuntime: (platform) => `sherpa-onnx non ha un runtime per questa piattaforma (${platform})`,
    loadFailed: (why) => `Caricamento del modello vocale non riuscito: ${why}`,
    notLoaded: "Il modello vocale non \xE8 caricato"
  },
  /** Il servizio di trascrizione compatibile con OpenAI (motore api) */
  transcription: {
    noUrl: "L'indirizzo del servizio di trascrizione non \xE8 impostato",
    badUrl: (url) => `L'indirizzo non \xE8 un URL http o https: ${url}`,
    httpRemote: "Un indirizzo remoto deve usare https: http non \xE8 cifrato, quindi l'API Key e le registrazioni viaggerebbero in chiaro. Gli indirizzi di questo computer o della rete locale possono usare http.",
    noModel: "Il modello di trascrizione non \xE8 impostato",
    notRunning: "Il servizio di trascrizione non \xE8 avviato",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `Il servizio non ha risposto entro ${ms} ms`,
    network: (why) => `Impossibile raggiungere il servizio: ${why}`,
    noText: "Il servizio ha risposto senza text"
  },
  store: {
    noBuild: (platform) => `Nessun pacchetto precompilato per ${platform}`,
    downloading: (file) => `Download di ${file}`,
    unpacking: "Estrazione",
    downloadingModel: "Download del modello vocale",
    downloadingFrom: (file, host) => `Download di ${file} (${host})`,
    verifying: (file) => `Verifica di ${file}`,
    mismatch: (sum) => `Checksum non corrispondente: ${sum}\u2026`,
    failed: (file, why) => `Download di ${file} non riuscito (${why})`,
    exitCode: (cmd, code, out) => `${cmd} codice di uscita ${code}: ${out}`
  },
  packs: {
    noManifest: (file) => `${file} mancante`,
    badJson: (file, why) => `${file} non \xE8 un JSON valido: ${why}`,
    notInteger: (key, got) => `${key} deve essere un intero, non ${got}`,
    tooNew: (key, v, now) => `${key} vale ${v}; questa versione legge fino a ${now}: aggiorna prima l'app`,
    tooOld: (key, v, oldest) => `${key} ${v} \xE8 un formato di prova precedente a ${oldest} e non pu\xF2 essere letto`,
    badId: (got) => `id non valido: ${got}`,
    noName: "name mancante",
    noAbout: "about mancante",
    badEntry: "entry o export non valido",
    badModel: "Il percorso model non \xE8 valido",
    badThumb: "Il percorso thumb non \xE8 valido",
    badAxis: (got) => `Voce non valida in axes: ${got}`,
    badOption: (axis, got) => `Opzione non valida in axes.${axis}: ${got}`,
    badPreset: (got) => `Voce non valida in presets: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} non sceglie alcuna opzione per ${axis}`,
    vocabNotArray: "vocab deve essere un array",
    badWordId: (got) => `id non valido in vocab: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind vale ${kind}, che questa versione non conosce; il bot non riceve questa parola`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} deve essere un array`,
    badWordName: (id, got) => `Nome non valido in vocab.${id}: ${got}`,
    nameTaken: (name) => `${name} indica pi\xF9 di una parola in vocab`,
    noWordAbout: (id) => `vocab.${id}.about mancante`,
    badSeconds: (id) => `vocab.${id}.seconds deve essere un numero positivo`,
    soundsNotObject: "sounds deve essere un oggetto",
    badSoundName: (got) => `Nome non valido in sounds: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file deve essere un file del pacchetto`,
    badVolume: (name) => `sounds.${name}.volume deve essere tra 0 e 1`,
    soundType: (name, file) => `${file} di sounds.${name} non \xE8 un .ogg, .mp3 o .wav che questa versione riproduce; il suono resta muto`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind vale ${kind}; questa versione conosce solo ${kinds.join(", ")}, quindi il suono resta muto`,
    soundMissing: (name, file) => `${file} di sounds.${name} non esiste; il suono resta muto`,
    badWalk: (got) => `can.walk vale ${got}, che questa versione non conosce; considerato in grado di camminare`,
    movesNotArray: "moves deve essere un array",
    tooManyMoves: (max2) => `moves contiene al massimo ${max2} destinazioni`,
    badMoveId: (got) => `id non valido in moves: ${got} (left, center, right, cursor e i numeri sono le destinazioni predefinite)`,
    moveTaken: (id) => `${id} compare pi\xF9 di una volta in moves`,
    noMoveText: (id) => `moves.${id} non ha name o about`,
    badMoveParams: (id, max2) => `moves.${id}.params deve essere un array di al massimo ${max2} elementi, ciascuno con id, about e numeri min minore di max`,
    needsNotArray: "needs deve essere un array",
    unknownNeed: (got) => `${got} in needs non \xE8 fornito da questa versione e viene escluso`,
    idTaken: (id, builtin) => `l'id ${id} \xE8 gi\xE0 usato da ${builtin ? "un personaggio integrato" : "un altro pacchetto"}`
  },
  importing: {
    badZip: (why) => `Non \xE8 uno zip leggibile: ${why}`,
    tooBig: (mb) => `Oltre ${mb} MB una volta estratto`,
    truncated: "Il caricamento \xE8 incompleto",
    badPath: (path) => `Un percorso non pu\xF2 essere usato: ${path}`,
    builtinId: (id) => `l'id ${id} appartiene a un personaggio integrato; cambia l'id per importarlo`,
    duplicateId: (id) => `l'id ${id} \xE8 uguale a quello di un altro pacchetto in questa importazione`,
    unpackFailed: (why) => `Impossibile estrarre: ${why}`,
    expired: "Questa importazione \xE8 scaduta; scegli di nuovo i file",
    noneChosen: "Nessun pacchetto scelto",
    zipOrFolder: "Si possono importare solo uno zip o delle cartelle",
    overLimit: (mb) => `Oltre ${mb} MB`
  },
  removing: {
    notInstalled: (id) => `Nessun pacchetto personaggio ha l'id ${id}`,
    builtin: (id) => `${id} \xE8 un personaggio integrato e non si pu\xF2 disinstallare`,
    elsewhere: (id) => `${id} non \xE8 nella cartella di installazione dei pacchetti personaggio; non si pu\xF2 disinstallare da qui`,
    failed: (why) => `Eliminazione non riuscita: ${why}`
  },
  consent: {
    question: (items) => `Posso ${items.join(", ")}?`,
    choices: ["S\xEC", "S\xEC, sempre", "No, grazie"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `passare a ${to}`,
    scheme: (figure, look) => `cambiare abiti di ${figure} (${look})`,
    roam: { free: "Spesso", calm: "Ogni tanto", off: "Resta sul posto" },
    roamTo: (to) => `impostare il mio movimento su \xAB${to}\xBB`,
    snore: (seconds) => seconds === 0 ? "russare fino al risveglio" : `russare ${seconds} s ogni volta che dormo`,
    sound: (on) => on ? "attivare i suoni" : "disattivare i suoni",
    scale: (from, to) => `cambiare dimensione da ${from}\xD7 a ${to}\xD7`,
    bubbleSize: (from, to) => `cambiare la dimensione dei fumetti da ${from}\xD7 a ${to}\xD7`,
    fontSize: (from, to) => `cambiare la dimensione del testo da ${from}\xD7 a ${to}\xD7`,
    theme: { dark: "passare all'aspetto notte", light: "passare all'aspetto giorno" },
    hover: (list) => `cambiare i pulsanti al passaggio in ${list}`,
    actions: { chat: "Scrivi", voice: "Input vocale", roam: "Movimento", theme: "Modalit\xE0 notte", sound: "Suoni", dress: "Guardaroba", hide: "Nascondi l'animaletto" },
    user: (to) => `chiamarti \xAB${to}\xBB`
  },
  portsTaken: (from, to, why) => `Le porte ${from}\u2013${to} sono tutte occupate: ${why}`,
  console: {
    label: "Animaletto da desktop",
    window: "Finestra dell'animaletto",
    connected: "Pagina connessa",
    notOpen: "Non aperta",
    noBody: (reason) => `Pagina connessa, il personaggio non pu\xF2 essere disegnato: ${reason}`,
    alsoBrowser: (hint) => `${hint}; \xE8 connessa una pagina del browser`,
    voice: "Riconoscimento vocale",
    notStarted: "Non avviato",
    viewInBrowser: "Guarda l'animaletto nel browser",
    dress: "Guardaroba",
    panels: {
      pet: { title: "Animaletto da desktop", description: "La finestra, il guardaroba e il runtime della finestra." },
      voice: { title: "Input vocale", description: "Motore di riconoscimento, livello di ingresso e cosa \xE8 stato sentito." }
    },
    envPrompt: { title: "Ambiente dell'animaletto da desktop", description: "Descrive il corpo dell'animaletto, i quattro strumenti e gli eventi di input." },
    vars: {
      "pet.user": "Come il bot chiama la persona",
      "pet.vocab": "Le espressioni e i movimenti del personaggio attuale",
      "pet.moves": "Le destinazioni proprie del personaggio attuale (pet_move_to); vuoto se non ne ha",
      "pet.voice": "Se l'input vocale \xE8 acceso o spento",
      "pet.body": "L'aspetto del personaggio attuale",
      "pet.dress": "I personaggi e gli abiti che pet_set pu\xF2 scegliere",
      "pet.self": "Autoregolazione: quali impostazioni cambiano direttamente, quali aspettano il consenso, o che nessuna pu\xF2 cambiare",
      "pet.chat": "Una nota sulla pagina chat quando l'app ne ha una; altrimenti vuoto",
      "pet.reply": "Una riga che dice al bot in che lingua parlare quando la lingua dell'app non \xE8 n\xE9 il cinese semplificato n\xE9 l'inglese; altrimenti vuoto",
      "pet.cua": "La parte sul controllo del computer: coordinate degli screenshot, quando chiedere prima alla persona e le regole per non intralciarla; vuota quando il controllo del computer \xE8 spento"
    },
    noGuide: "Quest'app non ha un'introduzione",
    unknownMethod: (name) => `Metodo sconosciuto ${name}`
  },
  config: {
    group: "Animaletto da desktop",
    soundGroup: "Suoni",
    asrGroup: "Input vocale",
    user: { title: "Come chiamarti", description: (max2) => `Il nome con cui gli eventi vocali, di scrittura e di tocco ti indicano, fino a ${max2} caratteri. Vuoto usa il nome predefinito.` },
    roam: { title: "Movimento", description: "free cammina spesso; calm resta sul posto quasi sempre; off si muove solo su richiesta." },
    theme: { title: "Modalit\xE0 notte", description: "dark \xE8 la notte: corpo chiaro e fumetti scuri; light \xE8 il giorno: corpo scuro e fumetti chiari." },
    rememberPosition: { title: "Ricorda la posizione", description: "Salva la posizione orizzontale dell'animaletto quando l'app si chiude, e la volta successiva l'animaletto riparte da l\xEC; con pi\xF9 schermi parte sempre su quello principale." },
    hoverButtons: { title: "Pulsanti al passaggio", description: (max2, ids) => `Pulsanti accanto all'animaletto mentre il puntatore resta sopra Coo, fino a ${max2}, separati da virgole: ${ids}.` },
    doubleClickChat: { title: "Doppio clic per scrivere", description: "Un doppio clic sull'animaletto apre la casella di testo." },
    statusBubble: { title: "Fumetto di stato", description: "Mostra cosa sta facendo l'animaletto mentre pensa, sfoglia la memoria o usa il computer, nomi dei file compresi." },
    saidBubbles: { title: "Fumetti di input", description: "Ci\xF2 che viene scritto, detto o inviato dalla pagina chat appare sopra l'animaletto finch\xE9 non risponde. Se disattivato, il parlato appare solo durante il riconoscimento." },
    selfAdjust: { title: "Autoregolazione", description: "off: Coo non pu\xF2 cambiare le impostazioni n\xE9 mettersi in silenzio per un po'. default: personaggio, abiti, movimento e russare cambiano direttamente; dimensione, dimensione dei fumetti, dimensione del testo, suoni, modalit\xE0 notte, pulsanti al passaggio e come ti chiama aspettano il tuo consenso. any: tutto cambia direttamente. custom: come spuntato nella pagina Abitudini; ci\xF2 che \xE8 spuntato cambia direttamente, il resto aspetta il tuo consenso." },
    windowEnabled: { title: "Apri la finestra dell'animaletto all'avvio" },
    scale: { title: "Dimensione" },
    bubbleSize: { title: "Dimensione dei fumetti", description: "Larghezza, margini, angoli e punta dei fumetti dell'animaletto e dei tuoi, 1 \xE8 il valore predefinito; il testo mantiene la sua dimensione." },
    fontSize: { title: "Dimensione del testo", description: "Dimensione del testo nei fumetti, 1 \xE8 il valore predefinito; i fumetti mantengono la loro larghezza." },
    bubbleSpeed: { title: "Velocit\xE0 dei fumetti", description: "Velocit\xE0 con cui i fumetti dell'animaletto vengono scritti e quanto restano, 1 \xE8 il valore predefinito; valori pi\xF9 alti sono pi\xF9 veloci." },
    glow: { title: "Bagliore esterno", description: "Quanti pixel si estende il bagliore chiaro attorno all'animaletto quando i colori di Coo somigliano allo sfondo; 0 lo spegne." },
    frameRate: { title: "Frequenza fotogrammi", description: "Fotogrammi al secondo mentre l'animaletto cammina, si fa portare o salta; 0 segue lo schermo. Oltre la frequenza di aggiornamento dello schermo vale quella dello schermo. La pagina Abitudini offre 60, 120, 144 e Illimitata." },
    lockFrameRate: { title: "Blocca la frequenza", description: "Disegna l'animaletto a questa frequenza anche quando non si muove. Se disattivato, scende a 30 fotogrammi al secondo quando sta in piedi, sta a sedere o dorme." },
    hideWhenFullscreen: { title: "Nascondi a schermo intero", description: "Se attivo, l'animaletto si nasconde mentre la finestra in primo piano riempie lo schermo di Coo (un gioco, un video a schermo intero, un browser a schermo intero) e torna quando lo schermo intero finisce; una finestra ingrandita non conta. Se disattivato, resta sempre in primo piano." },
    exportOverlay: { title: "Overlay OBS", description: "Fornisce l'immagine della finestra dell'animaletto su sfondo trasparente in /overlay per una sorgente \xABBrowser\xBB di OBS; se disattivato non fornisce nulla." },
    electronFile: { title: "Eseguibile Electron", description: "Vuoto usa CORTICO_DESKTOP_PET_HOST, poi il runtime installato dal pannello." },
    port: { title: "Porta della pagina", description: "Passa alla porta libera successiva se \xE8 occupata." },
    touchEnabled: { title: "I tocchi diventano eventi", description: "Colpetti, carezze, sollevamenti e lanci." },
    touchWakeOn: { title: "Modalit\xE0 di risposta", description: "poke: solo un colpetto riceve subito una risposta; gli altri tocchi attendono la risposta successiva. all: ogni tocco ne riceve una. none: ogni tocco attende la risposta successiva. custom: ricevono una risposta i tocchi spuntati nella pagina Abitudini. Dopo una risposta, i tocchi fino alla fine di quel turno attendono la successiva." },
    sound: { title: "Tutti i suoni", description: "Il pulsante dei suoni nel menu dell'animaletto attiva e disattiva questa opzione." },
    sounds: {
      move: { title: "Movimento", description: "Camminare, correre, saltare, atterrare, volare dopo un lancio, annuire, scuotere la testa, fare piroette, capogiro, brividi, ballare, guardarsi intorno." },
      touch: { title: "Tocco", description: "Sollevamenti, dondolii, carezze, colpetti." },
      face: { title: "Espressioni", description: "Felice, occhiolino, amore, sorpresa, rabbia, tristezza, timidezza, sbadiglio." },
      snore: { title: "Russare", description: "" },
      talk: { title: "Parlare", description: "Il borbottio mentre appare il testo del fumetto, e le schede di scelta che spuntano." },
      ui: { title: "Pulsanti e segnali", description: "Clic sui pulsanti, apertura dei fumetti, selezioni, inizio e fine dell'ascolto." }
    },
    snoreSeconds: { title: "Durata del russare", suffix: "s", description: "In ogni sonno l'animaletto smette di russare dopo questo tempo; le z continuano a fluttuare. 0 = russa fino al risveglio." },
    speech: { title: "Voce", description: "Pronuncia una sillaba per ogni carattere che appare in un fumetto, al posto del borbottio di Parlare; tace mentre i suoni Parlare sono spenti." },
    speechPitch: { title: "Altezza della voce", description: (a, b, c) => `low, mid e high sono ${a}, ${b} e ${c} Hz; custom usa l'altezza personalizzata.` },
    speechPitchHz: { title: "Altezza personalizzata" },
    speechSpeed: { title: "Velocit\xE0 della voce", description: (a, b, c) => `Sillabe al secondo al massimo: low, mid e high sono ${a}, ${b} e ${c}; custom usa la velocit\xE0 personalizzata. Pi\xF9 lenta del testo, la voce finisce dopo di esso.` },
    speechRate: { title: "Velocit\xE0 personalizzata", suffix: "sillabe/s" },
    asrEnabled: { title: "Input vocale" },
    asrEngine: { title: "Motore di riconoscimento", description: "funasr esegue SenseVoiceSmall di FunASR, per cinese, inglese, giapponese, coreano e cantonese, dopo un unico download di circa 240 MB; whisper esegue Whisper small di OpenAI, per francese, tedesco, spagnolo, portoghese, italiano, russo e circa altre 90 lingue, dopo un unico download di circa 360 MB, e mostra il testo a frase finita; entrambi riconoscono su questo computer. system usa il riconoscimento vocale di Windows, senza download e meno preciso (solo Windows). api invia la registrazione di ogni frase a un servizio di trascrizione compatibile con OpenAI e mostra il testo a frase finita; indirizzo e modello si impostano qui sotto, la API Key nella pagina Input vocale. Vuoto sceglie in base alla lingua dell'app: funasr per cinese, inglese, giapponese e coreano, whisper per le altre." },
    asrLanguage: { title: "Lingua", description: "Un codice ISO 639-1, o auto per lasciar decidere al modello; vuoto segue la lingua dell'app. FunASR accetta zh, en, ja, ko e yue, Whisper un centinaio di codici come fr, de, es, pt, it e ru; un codice che il modello non accetta vale come auto. Il servizio di trascrizione riceve il codice solo quando ha due lettere." },
    asrApiUrl: { title: "Indirizzo del servizio di trascrizione", description: "Con il motore api, ogni frase va a /audio/transcriptions sotto questo indirizzo, per esempio https://api.example.com/v1. Un indirizzo remoto deve usare https; gli indirizzi di questo computer o della rete locale possono usare http." },
    asrApiModel: { title: "Modello di trascrizione", description: "Il modello indicato nelle richieste con il motore api." },
    asrThreads: { title: "Thread CPU", description: "Thread che FunASR e Whisper usano per un riconoscimento; 0 = 2." },
    asrSimplified: { title: "Converti in semplificato", description: "Converte in caratteri semplificati i caratteri tradizionali sentiti quando la lingua dell'app \xE8 il cinese semplificato." },
    thresholdDb: { title: "Soglia del parlato" },
    silenceMs: { title: "Silenzio che chiude una frase" },
    maxUtteranceMs: { title: "Frase pi\xF9 lunga" }
  },
  panel: {
    pet: "Animaletto da desktop",
    window: "Finestra dell'animaletto",
    openWindow: "Apri finestra",
    closeWindow: "Chiudi finestra",
    runtime: "Runtime della finestra",
    install: "Installa",
    viewInBrowser: "Guarda nel browser",
    dress: "Guardaroba",
    dressHint: "Le modifiche vengono salvate subito e arrivano alla finestra dell'animaletto",
    connected: "Connessa",
    starting: "Avvio",
    cannotOpen: "Impossibile aprire",
    notOpen: "Non aperta",
    external: "Programma esterno in uso",
    installed: "Installato",
    downloading: (progress) => `Download ${progress}`,
    installFailed: "Installazione non riuscita",
    notInstalled: "Non installato",
    noBuild: "Nessun pacchetto precompilato per questa piattaforma",
    electronSize: "Electron 44.4.4, circa 150 MB",
    voice: "Input vocale",
    enable: "Attiva l'input vocale",
    enabledHint: "Il microfono resta aperto; ci\xF2 che dici arriva a Coo secondo la modalit\xE0 di ascolto",
    enabledHintOnPress: "Il microfono si apre mentre tieni premuto il tasto per parlare e si chiude quando lo rilasci",
    disabledHint: "Disattivato: il microfono resta chiuso e le impostazioni qui sotto restano in attesa",
    engine: "Motore di riconoscimento",
    funasr: "FunASR (su questo computer)",
    system: "Integrato in Windows",
    whisper: "Whisper (su questo computer)",
    systemHint: "Niente da scaricare, precisione discreta; passa a FunASR o Whisper per risultati migliori",
    funasrHint: "SenseVoiceSmall su questo computer, per cinese, inglese, giapponese, coreano e cantonese",
    whisperHint: "Whisper small su questo computer, per francese, tedesco, spagnolo, portoghese, italiano, russo e altre; il testo appare a frase finita",
    api: "Servizio di trascrizione (compatibile con OpenAI)",
    apiName: "Servizio di trascrizione",
    apiHint: "Ogni frase va al servizio impostato qui sotto; il testo compare a frase finita",
    apiUrl: "Indirizzo",
    apiModel: "Modello",
    apiKey: "API Key",
    keySaved: "Salvata",
    keyMissing: "Non impostata",
    server: "Servizio di riconoscimento",
    start: "Avvia",
    stop: "Ferma",
    ready: "Pronto",
    error: "Errore",
    stopped: "Fermato",
    model: "Modello vocale",
    download: "Scarica",
    retry: "Riprova",
    downloadFailed: "Download non riuscito",
    downloaded: "Scaricato",
    notDownloaded: "Non scaricato",
    modelSource: (size) => `Circa ${size}, scaricato da ModelScope`,
    mic: "Microfono",
    micStates: { on: "In ascolto", off: "Non in ascolto", denied: "Negato", error: "Errore" },
    defaultDevice: "Predefinito di sistema",
    missingDevice: "Il dispositivo scelto prima (ora non trovato)",
    micN: (n) => `Microfono ${n}`,
    mode: "Come ascolta",
    modes: { hold: "Mentre il tasto per parlare \xE8 premuto", toggle: "Il tasto per parlare lo accende e lo spegne", always: "Sempre" },
    openOnPress: "Apri il microfono solo tenendo premuto",
    openOnPressHint: "Per le cuffie, come quelle Bluetooth, che passano alla modalit\xE0 chiamata con il microfono aperto; dopo aver premuto, aspetta un attimo prima di parlare, altrimenti le prime parole possono andare perse",
    switchOn: "Attivo",
    switchOff: "Disattivo",
    presses: {
      2: { hold: "Doppia pressione e tieni premuto", toggle: "Doppia pressione per iniziare, di nuovo per smettere" },
      1: { hold: "Tieni premuto", toggle: "Premi per iniziare, premi di nuovo per smettere" },
      3: { hold: "Tripla pressione e tieni premuto", toggle: "Tripla pressione per iniziare, di nuovo per smettere" }
    },
    capture: "Premi il nuovo tasto per parlare: una combinazione di tasti o un tasto laterale del mouse\u2026 (Esc annulla)",
    listening: "In ascolto",
    waitingKey: "In attesa del tasto per parlare",
    results: "Cosa \xE8 stato sentito",
    resultsHint: "Le righe barrate erano troppo brevi o probabilmente allucinate, e non sono state inviate",
    talkKeyName: "Tasto per parlare",
    changeKey: "Cambia",
    cancelKey: "Annulla",
    level: "Livello di ingresso",
    thresholdHint: "Conta come parlato solo il suono pi\xF9 forte di questa linea; se qualcun altro parla forte quanto te, viene riconosciuto anche lui",
    noResults: "Ancora nessun risultato"
  },
  chat: {
    badImages: "Le immagini non sono in un formato che questa pagina invia",
    tooManyImages: (max2) => `Al massimo ${max2} immagini alla volta`,
    badMime: (mime) => `Tipo di immagine non supportato ${mime}`,
    emptyImage: "Una delle immagini \xE8 vuota",
    bigImage: (mb) => `Ogni immagine deve essere sotto i ${mb} MB`,
    offline: "Non ancora connesso",
    notSent: "Invio non riuscito",
    tooLate: "Questo messaggio \xE8 gi\xE0 stato consegnato e non pu\xF2 essere ritirato."
  }
};
var it_default = it;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/ru.ts
var pluralRules = new Intl.PluralRules("ru");
var plural = (n, one, few, many) => {
  const form = pluralRules.select(n);
  return form === "one" ? one : form === "many" ? many : few;
};
var ru = {
  defaultUser: "\u041D\u0430\u043F\u0430\u0440\u043D\u0438\u043A",
  menu: {
    quit: "\u0412\u044B\u0439\u0442\u0438",
    quitPrompt: (label) => `${label}?`
  },
  busy: "\u0420\u0430\u0431\u043E\u0442\u0430\u044E",
  voice: {
    starting: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442\u0441\u044F",
    notRunning: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E",
    modelMissing: (mb) => `\u041C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438 \u0435\u0449\u0451 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u0430 (\u043E\u043A\u043E\u043B\u043E ${mb} \u041C\u0411): \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0435\u0451 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \xAB\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434\xBB`,
    badKey: (hotkey) => `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043A\u043B\u0430\u0432\u0438\u0448\u0430 \xAB${hotkey}\xBB`,
    keyProblem: (problem) => `\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u043F\u043E\u043A\u0430 \u0440\u0435\u0447\u044C \u043D\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0451\u0442\u0441\u044F: ${problem}`,
    always: "\u0421\u043B\u0443\u0448\u0430\u044E \u0432\u0441\u0451 \u0432\u0440\u0435\u043C\u044F: \u043F\u0440\u043E\u0441\u0442\u043E \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435",
    toggleTaps: (label, taps) => `\u041D\u0430\u0436\u043C\u0438\u0442\u0435 ${label}, \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u043E\u0441\u043B\u0443\u0448\u0438\u0432\u0430\u043D\u0438\u0435, \u0438 \u0435\u0449\u0451 \u0440\u0430\u0437 ${taps === 2 ? "\u0434\u0432\u0430\u0436\u0434\u044B" : "\u0442\u0440\u0438\u0436\u0434\u044B"}, \u0447\u0442\u043E\u0431\u044B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C`,
    toggle: (key) => `\u041D\u0430\u0436\u043C\u0438\u0442\u0435 ${key}, \u0447\u0442\u043E\u0431\u044B \u043D\u0430\u0447\u0430\u0442\u044C \u043F\u0440\u043E\u0441\u043B\u0443\u0448\u0438\u0432\u0430\u043D\u0438\u0435, \u0438 \u0435\u0449\u0451 \u0440\u0430\u0437, \u0447\u0442\u043E\u0431\u044B \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C`,
    holdTaps: (key, taps) => `\u041D\u0430\u0436\u043C\u0438\u0442\u0435 ${key} ${taps === 2 ? "\u043E\u0434\u0438\u043D \u0440\u0430\u0437" : "\u0434\u0432\u0430 \u0440\u0430\u0437\u0430"}, \u0437\u0430\u0442\u0435\u043C \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439\u0442\u0435 \u0438 \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435; \u043E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C`,
    hold: (key) => `\u0423\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439\u0442\u0435 ${key} \u0438 \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435; \u043E\u0442\u043F\u0443\u0441\u0442\u0438\u0442\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C`,
    failedLine: (error) => `[\u043E\u0448\u0438\u0431\u043A\u0430] ${error}`
  },
  keys: {
    LeftCtrl: "\u041B\u0435\u0432\u044B\u0439 Ctrl",
    RightCtrl: "\u041F\u0440\u0430\u0432\u044B\u0439 Ctrl",
    LeftAlt: "\u041B\u0435\u0432\u044B\u0439 Alt",
    RightAlt: "\u041F\u0440\u0430\u0432\u044B\u0439 Alt",
    LeftShift: "\u041B\u0435\u0432\u044B\u0439 Shift",
    RightShift: "\u041F\u0440\u0430\u0432\u044B\u0439 Shift",
    RightWin: "\u041F\u0440\u0430\u0432\u044B\u0439 Win",
    Backquote: "`",
    Mouse3: "\u041A\u043E\u043B\u0451\u0441\u0438\u043A\u043E \u043C\u044B\u0448\u0438",
    Mouse4: "\u041C\u044B\u0448\u044C 4",
    Mouse5: "\u041C\u044B\u0448\u044C 5"
  },
  macKeys: {
    Ctrl: "Control",
    LeftCtrl: "\u041B\u0435\u0432\u044B\u0439 Control",
    RightCtrl: "\u041F\u0440\u0430\u0432\u044B\u0439 Control",
    Alt: "Option",
    LeftAlt: "\u041B\u0435\u0432\u044B\u0439 Option",
    RightAlt: "\u041F\u0440\u0430\u0432\u044B\u0439 Option",
    Win: "Command",
    RightWin: "\u041F\u0440\u0430\u0432\u044B\u0439 Command"
  },
  taps: (taps, keys) => `${keys} ${taps === 2 ? "\u0434\u0432\u0430\u0436\u0434\u044B" : "\u0442\u0440\u0438\u0436\u0434\u044B"}`,
  hotkey: {
    cannotRead: (why) => `\u041D\u0435 \u0443\u0434\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u044B: ${why}`,
    macNoKey: "\u041D\u0430 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u0435 Mac \u043D\u0435\u0442 \u0442\u0430\u043A\u043E\u0439 \u043A\u043B\u0430\u0432\u0438\u0448\u0438; \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
    macPermission: "\u041D\u0435\u0442 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \xAB\u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0432\u0432\u043E\u0434\u0430\xBB: \u0432\u043A\u043B\u044E\u0447\u0438\u0442\u0435 Coopanion \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u2192 \u041A\u043E\u043D\u0444\u0438\u0434\u0435\u043D\u0446\u0438\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438 \u0431\u0435\u0437\u043E\u043F\u0430\u0441\u043D\u043E\u0441\u0442\u044C \u2192 \u041C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u0432\u0432\u043E\u0434\u0430\xBB, \u0437\u0430\u0442\u0435\u043C \u043F\u0435\u0440\u0435\u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0435 \u0435\u0433\u043E. \u0415\u0441\u043B\u0438 \u043E\u043D \u0443\u0436\u0435 \u0432\u043A\u043B\u044E\u0447\u0451\u043D, \u0443\u0434\u0430\u043B\u0438\u0442\u0435 Coopanion \u0438\u0437 \u0441\u043F\u0438\u0441\u043A\u0430 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \xAB\u2212\xBB \u0438 \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u0441\u043D\u043E\u0432\u0430: \u043E\u0431\u043D\u043E\u0432\u043B\u0451\u043D\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u043D\u0435 \u043D\u0430\u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0441\u0442\u0430\u0440\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435",
    linuxNoKey: "\u0412 Linux \u044D\u0442\u0443 \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F (\u0431\u043E\u043A\u043E\u0432\u044B\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 \u043C\u044B\u0448\u0438 \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442); \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
    linuxNoDisplay: "\u041A\u043B\u0430\u0432\u0438\u0448\u0435 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u0432 Linux \u043D\u0443\u0436\u0435\u043D X11 (\u0438\u043B\u0438 XWayland): \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F DISPLAY \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u0430",
    linuxNoX11: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0434\u0438\u0441\u043F\u043B\u0435\u044E X11",
    unsupported: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432 Windows, macOS \u0438 Linux"
  },
  typeKey: {
    macNoKey: "\u041D\u0430 \u043A\u043B\u0430\u0432\u0438\u0430\u0442\u0443\u0440\u0435 Mac \u043D\u0435\u0442 \u0442\u0430\u043A\u043E\u0439 \u043A\u043B\u0430\u0432\u0438\u0448\u0438; \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u0432\u0432\u043E\u0434\u0430",
    linuxNoKey: "\u0412 Linux \u044D\u0442\u0443 \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F (\u0431\u043E\u043A\u043E\u0432\u044B\u0435 \u043A\u043D\u043E\u043F\u043A\u0438 \u043C\u044B\u0448\u0438 \u043D\u0435 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442); \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0434\u0440\u0443\u0433\u0443\u044E \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u0432\u0432\u043E\u0434\u0430",
    linuxNoDisplay: "\u041A\u043B\u0430\u0432\u0438\u0448\u0435 \u0432\u0432\u043E\u0434\u0430 \u0432 Linux \u043D\u0443\u0436\u0435\u043D X11 (\u0438\u043B\u0438 XWayland): \u043F\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430\u044F DISPLAY \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u0430",
    linuxNoX11: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0432\u0432\u043E\u0434\u0430 \u043D\u0435 \u043C\u043E\u0436\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0438\u0442\u044C\u0441\u044F \u043A \u0434\u0438\u0441\u043F\u043B\u0435\u044E X11",
    unsupported: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0432\u0432\u043E\u0434\u0430 \u0440\u0430\u0431\u043E\u0442\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u0432 Windows, macOS \u0438 Linux"
  },
  system: {
    name: (culture) => culture ? `\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows (${culture})` : "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows",
    noSpeech: "\u041A\u043E\u043C\u043F\u043E\u043D\u0435\u043D\u0442 System.Speech \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F",
    noRecognizer: (language) => `\u0412 Windows \u043D\u0435\u0442 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u0442\u0435\u043B\u044F \u0440\u0435\u0447\u0438${language === "auto" ? "" : ` \u0434\u043B\u044F \xAB${language}\xBB`}: \u0434\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \xAB\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438\xBB \u0434\u043B\u044F \u044D\u0442\u043E\u0433\u043E \u044F\u0437\u044B\u043A\u0430 \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B Windows \u2192 \u0412\u0440\u0435\u043C\u044F \u0438 \u044F\u0437\u044B\u043A \u2192 \u042F\u0437\u044B\u043A\xBB`,
    windowsOnly: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows \u0435\u0441\u0442\u044C \u0442\u043E\u043B\u044C\u043A\u043E \u0432 Windows",
    startFailed: (why) => `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C: ${why}`,
    exited: "\u041F\u0440\u043E\u0446\u0435\u0441\u0441 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F",
    exitedCode: (code) => `\u041F\u0440\u043E\u0446\u0435\u0441\u0441 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F (\u043A\u043E\u0434 \u0432\u044B\u0445\u043E\u0434\u0430 ${code})`,
    notReady: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows \u043D\u0435 \u0431\u044B\u043B\u043E \u0433\u043E\u0442\u043E\u0432\u043E \u0432\u043E\u0432\u0440\u0435\u043C\u044F",
    notRunning: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E",
    timeout: (ms) => `\u0412\u0440\u0435\u043C\u044F \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0438\u0441\u0442\u0435\u043A\u043B\u043E (${ms} \u043C\u0441)`,
    stopped: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows \u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E"
  },
  sherpa: {
    incomplete: "\u041D\u0435 \u0445\u0432\u0430\u0442\u0430\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u043C\u043E\u0434\u0435\u043B\u0438 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F: \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u0435 \u0435\u0451 \u0437\u0430\u043D\u043E\u0432\u043E",
    noRuntime: (platform) => `\u0414\u043B\u044F \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B (${platform}) \u043D\u0435\u0442 \u0441\u0440\u0435\u0434\u044B \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F sherpa-onnx`,
    loadFailed: (why) => `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F: ${why}`,
    notLoaded: "\u041C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u0430"
  },
  /** Совместимый с OpenAI сервис транскрибации (движок api) */
  transcription: {
    noUrl: "\u0410\u0434\u0440\u0435\u0441 \u0441\u0435\u0440\u0432\u0438\u0441\u0430 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D",
    badUrl: (url) => `\u0410\u0434\u0440\u0435\u0441 \u2014 \u043D\u0435 URL http \u0438\u043B\u0438 https: ${url}`,
    httpRemote: "\u0423\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C https: http \u043D\u0435 \u0448\u0438\u0444\u0440\u0443\u0435\u0442\u0441\u044F, \u0438 API Key \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0437\u0430\u043F\u0438\u0441\u044F\u043C\u0438 \u043F\u043E\u0439\u0434\u0443\u0442 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u043C \u0442\u0435\u043A\u0441\u0442\u043E\u043C. \u0410\u0434\u0440\u0435\u0441\u0430 \u044D\u0442\u043E\u0433\u043E \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0430 \u0438 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 \u0441\u0435\u0442\u0438 \u043C\u043E\u0433\u0443\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C http.",
    noModel: "\u041C\u043E\u0434\u0435\u043B\u044C \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438 \u043D\u0435 \u0437\u0430\u0434\u0430\u043D\u0430",
    notRunning: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438 \u043D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D",
    status: (status, message) => message ? `HTTP ${status}: ${message}` : `HTTP ${status}`,
    timeout: (ms) => `\u0421\u0435\u0440\u0432\u0438\u0441 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0437\u0430 ${ms} \u043C\u0441`,
    network: (why) => `\u041D\u0435 \u0443\u0434\u0430\u0451\u0442\u0441\u044F \u0441\u0432\u044F\u0437\u0430\u0442\u044C\u0441\u044F \u0441 \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u043C: ${why}`,
    noText: "\u0421\u0435\u0440\u0432\u0438\u0441 \u043E\u0442\u0432\u0435\u0442\u0438\u043B \u0431\u0435\u0437 text"
  },
  store: {
    noBuild: (platform) => `\u041D\u0435\u0442 \u0433\u043E\u0442\u043E\u0432\u043E\u0439 \u0441\u0431\u043E\u0440\u043A\u0438 \u0434\u043B\u044F ${platform}`,
    downloading: (file) => `\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 ${file}`,
    unpacking: "\u0420\u0430\u0441\u043F\u0430\u043A\u043E\u0432\u043A\u0430",
    downloadingModel: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043C\u043E\u0434\u0435\u043B\u0438 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F \u0440\u0435\u0447\u0438",
    downloadingFrom: (file, host) => `\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 ${file} (${host})`,
    verifying: (file) => `\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 ${file}`,
    mismatch: (sum) => `\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C\u043D\u0430\u044F \u0441\u0443\u043C\u043C\u0430 \u043D\u0435 \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442: ${sum}\u2026`,
    failed: (file, why) => `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C ${file} (${why})`,
    exitCode: (cmd, code, out) => `${cmd}, \u043A\u043E\u0434 \u0432\u044B\u0445\u043E\u0434\u0430 ${code}: ${out}`
  },
  packs: {
    noManifest: (file) => `\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u0430 ${file}`,
    badJson: (file, why) => `${file} \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u043C JSON: ${why}`,
    notInteger: (key, got) => `${key} \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u0446\u0435\u043B\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C, \u0430 \u043D\u0435 ${got}`,
    tooNew: (key, v, now) => `${key} \u0440\u0430\u0432\u043D\u043E ${v}; \u044D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u043F\u043E\u043D\u0438\u043C\u0430\u0435\u0442 \u043D\u0435 \u0432\u044B\u0448\u0435 ${now}: \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0435`,
    tooOld: (key, v, oldest) => `${key} ${v} \u2014 \u0442\u0435\u0441\u0442\u043E\u0432\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442, \u043F\u0440\u0435\u0434\u0448\u0435\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0439 ${oldest}; \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u0435\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F`,
    badId: (got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 id: ${got}`,
    noName: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 name",
    noAbout: "\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 about",
    badEntry: "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 entry \u0438\u043B\u0438 export",
    badModel: "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u0443\u0442\u044C model",
    badThumb: "\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u043F\u0443\u0442\u044C thumb",
    badAxis: (got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0432 axes: ${got}`,
    badOption: (axis, got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0432 axes.${axis}: ${got}`,
    badPreset: (got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 \u044D\u043B\u0435\u043C\u0435\u043D\u0442 \u0432 presets: ${got}`,
    presetMissing: (preset, axis) => `presets.${preset} \u043D\u0435 \u0432\u044B\u0431\u0438\u0440\u0430\u0435\u0442 \u0432\u0430\u0440\u0438\u0430\u043D\u0442 \u0434\u043B\u044F ${axis}`,
    vocabNotArray: "vocab \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C",
    badWordId: (got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 id \u0432 vocab: ${got}`,
    unknownKind: (id, kind) => `vocab.${id}.kind \u0440\u0430\u0432\u043D\u043E ${kind}; \u044D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u0442\u0430\u043A\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0435\u0442, \u0438 \u0431\u043E\u0442 \u043D\u0435 \u043F\u043E\u043B\u0443\u0447\u0438\u0442 \u044D\u0442\u043E \u0441\u043B\u043E\u0432\u043E`,
    namesNotArray: (id, lang) => `vocab.${id}.names.${lang} \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C`,
    badWordName: (id, got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0438\u043C\u044F \u0432 vocab.${id}: ${got}`,
    nameTaken: (name) => `${name} \u043E\u0431\u043E\u0437\u043D\u0430\u0447\u0430\u0435\u0442 \u0431\u043E\u043B\u044C\u0448\u0435 \u043E\u0434\u043D\u043E\u0433\u043E \u0441\u043B\u043E\u0432\u0430 \u0432 vocab`,
    noWordAbout: (id) => `\u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u0435\u0442 vocab.${id}.about`,
    badSeconds: (id) => `vocab.${id}.seconds \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0438\u0442\u0435\u043B\u044C\u043D\u044B\u043C \u0447\u0438\u0441\u043B\u043E\u043C`,
    soundsNotObject: "sounds \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C",
    badSoundName: (got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0438\u043C\u044F \u0432 sounds: ${got}`,
    badSoundFile: (name) => `sounds.${name}.file \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u043C \u0438\u0437 \u043F\u0430\u043A\u0435\u0442\u0430`,
    badVolume: (name) => `sounds.${name}.volume \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043E\u0442 0 \u0434\u043E 1`,
    soundType: (name, file) => `${file} \u0432 sounds.${name} \u043D\u0435 \u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0444\u0430\u0439\u043B\u043E\u043C .ogg, .mp3 \u0438\u043B\u0438 .wav, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u044D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u043C\u043E\u0436\u0435\u0442 \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u0435\u0441\u0442\u0438; \u0437\u0432\u0443\u043A \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u043D\u0435 \u0431\u0443\u0434\u0435\u0442`,
    soundKind: (name, kind, kinds) => `sounds.${name}.kind \u0440\u0430\u0432\u043D\u043E ${kind}; \u044D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u0437\u043D\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E ${kinds.join(", ")}, \u043F\u043E\u044D\u0442\u043E\u043C\u0443 \u0437\u0432\u0443\u043A \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u043D\u0435 \u0431\u0443\u0434\u0435\u0442`,
    soundMissing: (name, file) => `${file} \u0432 sounds.${name} \u043D\u0435 \u0441\u0443\u0449\u0435\u0441\u0442\u0432\u0443\u0435\u0442; \u0437\u0432\u0443\u043A \u0432\u043E\u0441\u043F\u0440\u043E\u0438\u0437\u0432\u043E\u0434\u0438\u0442\u044C\u0441\u044F \u043D\u0435 \u0431\u0443\u0434\u0435\u0442`,
    badWalk: (got) => `can.walk \u0440\u0430\u0432\u043D\u043E ${got}; \u044D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u0442\u0430\u043A\u043E\u0433\u043E \u043D\u0435 \u0437\u043D\u0430\u0435\u0442 \u0438 \u0441\u0447\u0438\u0442\u0430\u0435\u0442, \u0447\u0442\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436 \u0443\u043C\u0435\u0435\u0442 \u0445\u043E\u0434\u0438\u0442\u044C`,
    movesNotArray: "moves \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C",
    tooManyMoves: (max2) => `\u0432 moves \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${max2} \u0446\u0435\u043B\u0435\u0439`,
    badMoveId: (got) => `\u041D\u0435\u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u044B\u0439 id \u0432 moves: ${got} (left, center, right, cursor \u0438 \u0447\u0438\u0441\u043B\u0430 \u2014 \u0446\u0435\u043B\u0438 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E)`,
    moveTaken: (id) => `${id} \u0432\u0441\u0442\u0440\u0435\u0447\u0430\u0435\u0442\u0441\u044F \u0432 moves \u0431\u043E\u043B\u044C\u0448\u0435 \u043E\u0434\u043D\u043E\u0433\u043E \u0440\u0430\u0437\u0430`,
    noMoveText: (id) => `\u0443 moves.${id} \u043D\u0435\u0442 name \u0438\u043B\u0438 about`,
    badMoveParams: (id, max2) => `moves.${id}.params \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u0447\u0435\u043C \u0438\u0437 ${max2} \u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432, \u0443 \u043A\u0430\u0436\u0434\u043E\u0433\u043E id, about \u0438 \u0447\u0438\u0441\u043B\u0430 min \u043C\u0435\u043D\u044C\u0448\u0435 max`,
    needsNotArray: "needs \u0434\u043E\u043B\u0436\u0435\u043D \u0431\u044B\u0442\u044C \u043C\u0430\u0441\u0441\u0438\u0432\u043E\u043C",
    unknownNeed: (got) => `${got} \u0432 needs \u044D\u0442\u0430 \u0432\u0435\u0440\u0441\u0438\u044F \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442; \u043F\u0440\u043E\u043F\u0443\u0449\u0435\u043D\u043E`,
    idTaken: (id, builtin) => `id ${id} \u0443\u0436\u0435 \u0437\u0430\u043D\u044F\u0442 ${builtin ? "\u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u043C \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u043C" : "\u0434\u0440\u0443\u0433\u0438\u043C \u043F\u0430\u043A\u0435\u0442\u043E\u043C"}`
  },
  importing: {
    badZip: (why) => `\u041D\u0435 \u0443\u0434\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C zip: ${why}`,
    tooBig: (mb) => `\u0411\u043E\u043B\u044C\u0448\u0435 ${mb} \u041C\u0411 \u0432 \u0440\u0430\u0441\u043F\u0430\u043A\u043E\u0432\u0430\u043D\u043D\u043E\u043C \u0432\u0438\u0434\u0435`,
    truncated: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435\u043F\u043E\u043B\u043D\u0430\u044F",
    badPath: (path) => `\u041F\u0443\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C: ${path}`,
    builtinId: (id) => `id ${id} \u043F\u0440\u0438\u043D\u0430\u0434\u043B\u0435\u0436\u0438\u0442 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u043C\u0443 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0443; \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u0435 id, \u0447\u0442\u043E\u0431\u044B \u0438\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043F\u0430\u043A\u0435\u0442`,
    duplicateId: (id) => `id ${id} \u0441\u043E\u0432\u043F\u0430\u0434\u0430\u0435\u0442 \u0441 \u0434\u0440\u0443\u0433\u0438\u043C \u043F\u0430\u043A\u0435\u0442\u043E\u043C \u0432 \u044D\u0442\u043E\u043C \u0438\u043C\u043F\u043E\u0440\u0442\u0435`,
    unpackFailed: (why) => `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0440\u0430\u0441\u043F\u0430\u043A\u043E\u0432\u0430\u0442\u044C: ${why}`,
    expired: "\u0421\u0440\u043E\u043A \u044D\u0442\u043E\u0433\u043E \u0438\u043C\u043F\u043E\u0440\u0442\u0430 \u0438\u0441\u0442\u0451\u043A; \u0432\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0444\u0430\u0439\u043B\u044B \u0437\u0430\u043D\u043E\u0432\u043E",
    noneChosen: "\u041F\u0430\u043A\u0435\u0442 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D",
    zipOrFolder: "\u0418\u043C\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u043C\u043E\u0436\u043D\u043E \u0442\u043E\u043B\u044C\u043A\u043E zip \u0438\u043B\u0438 \u043F\u0430\u043F\u043A\u0438",
    overLimit: (mb) => `\u0411\u043E\u043B\u044C\u0448\u0435 ${mb} \u041C\u0411`
  },
  removing: {
    notInstalled: (id) => `\u041D\u0435\u0442 \u043F\u0430\u043A\u0435\u0442\u0430 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u0441 id ${id}`,
    builtin: (id) => `${id} \u2014 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436, \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F`,
    elsewhere: (id) => `${id} \u043D\u0435 \u043D\u0430\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0432 \u043F\u0430\u043F\u043A\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438 \u043F\u0430\u043A\u0435\u0442\u043E\u0432 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0435\u0439, \u043E\u0442\u0441\u044E\u0434\u0430 \u0435\u0433\u043E \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F`,
    failed: (why) => `\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C: ${why}`
  },
  consent: {
    question: (items) => `\u041C\u043E\u0436\u043D\u043E \u043C\u043D\u0435 ${items.join(", ")}?`,
    choices: ["\u041C\u043E\u0436\u043D\u043E", "\u041C\u043E\u0436\u043D\u043E \u0432\u0441\u0435\u0433\u0434\u0430", "\u041D\u0435 \u043D\u0430\u0434\u043E"],
    list: (items) => items.join(", "),
    pick: (axis, option) => `${axis}: ${option}`,
    figure: (to) => `\u0441\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0431\u043B\u0438\u043A \u043D\u0430 ${to}`,
    scheme: (figure, look) => `\u043D\u0430\u0434\u0435\u0442\u044C \u0434\u0440\u0443\u0433\u043E\u0439 \u043D\u0430\u0440\u044F\u0434 ${figure} (${look})`,
    roam: { free: "\u0427\u0430\u0441\u0442\u043E", calm: "\u0418\u043D\u043E\u0433\u0434\u0430", off: "\u041D\u0430 \u043C\u0435\u0441\u0442\u0435" },
    roamTo: (to) => `\u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \xAB${to}\xBB`,
    snore: (seconds) => seconds === 0 ? "\u0445\u0440\u0430\u043F\u0435\u0442\u044C \u0434\u043E \u043F\u0440\u043E\u0431\u0443\u0436\u0434\u0435\u043D\u0438\u044F" : `\u0445\u0440\u0430\u043F\u0435\u0442\u044C ${seconds} \u0441 \u043A\u0430\u0436\u0434\u044B\u0439 \u0440\u0430\u0437 \u0432\u043E \u0441\u043D\u0435`,
    sound: (on) => on ? "\u0432\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A\u0438" : "\u0432\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A\u0438",
    scale: (from, to) => `\u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440 \u0441 ${from}\xD7 \u043D\u0430 ${to}\xD7`,
    bubbleSize: (from, to) => `\u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440 \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432 \u0441 ${from}\xD7 \u043D\u0430 ${to}\xD7`,
    fontSize: (from, to) => `\u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u0440\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430 \u0441 ${from}\xD7 \u043D\u0430 ${to}\xD7`,
    theme: { dark: "\u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 \u043D\u043E\u0447\u043D\u043E\u0439 \u0432\u0438\u0434", light: "\u043F\u0435\u0440\u0435\u0439\u0442\u0438 \u043D\u0430 \u0434\u043D\u0435\u0432\u043D\u043E\u0439 \u0432\u0438\u0434" },
    hover: (list) => `\u043F\u043E\u0441\u0442\u0430\u0432\u0438\u0442\u044C \u043A\u043D\u043E\u043F\u043A\u0438 \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438: ${list}`,
    actions: { chat: "\u041D\u0430\u043F\u0438\u0441\u0430\u0442\u044C", voice: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434", roam: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C", theme: "\u041D\u043E\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C", sound: "\u0417\u0432\u0443\u043A\u0438", dress: "\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431", hide: "\u0421\u043A\u0440\u044B\u0442\u044C \u043F\u0438\u0442\u043E\u043C\u0446\u0430" },
    user: (to) => `\u043D\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u0432\u0430\u0441 \xAB${to}\xBB`
  },
  portsTaken: (from, to, why) => `\u0412\u0441\u0435 \u043F\u043E\u0440\u0442\u044B ${from}\u2013${to} \u0437\u0430\u043D\u044F\u0442\u044B: ${why}`,
  console: {
    label: "\u041D\u0430\u0441\u0442\u043E\u043B\u044C\u043D\u044B\u0439 \u043F\u0438\u0442\u043E\u043C\u0435\u0446",
    window: "\u041E\u043A\u043D\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
    connected: "\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430",
    notOpen: "\u041D\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u043E",
    noBody: (reason) => `\u0421\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430, \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u043D\u0435 \u0443\u0434\u0430\u0451\u0442\u0441\u044F \u043D\u0430\u0440\u0438\u0441\u043E\u0432\u0430\u0442\u044C: ${reason}`,
    alsoBrowser: (hint) => `${hint}; \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435`,
    voice: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438",
    notStarted: "\u041D\u0435 \u0437\u0430\u043F\u0443\u0449\u0435\u043D\u043E",
    viewInBrowser: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043F\u0438\u0442\u043E\u043C\u0446\u0430 \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435",
    dress: "\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431",
    panels: {
      pet: { title: "\u041D\u0430\u0441\u0442\u043E\u043B\u044C\u043D\u044B\u0439 \u043F\u0438\u0442\u043E\u043C\u0435\u0446", description: "\u041E\u043A\u043D\u043E, \u0433\u0430\u0440\u0434\u0435\u0440\u043E\u0431 \u0438 \u0441\u0440\u0435\u0434\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u043E\u043A\u043D\u0430." },
      voice: { title: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434", description: "\u0414\u0432\u0438\u0436\u043E\u043A \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F, \u0443\u0440\u043E\u0432\u0435\u043D\u044C \u0432\u0445\u043E\u0434\u043D\u043E\u0433\u043E \u0441\u0438\u0433\u043D\u0430\u043B\u0430 \u0438 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u043E\u0435." }
    },
    envPrompt: { title: "\u041E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u0435 \u043D\u0430\u0441\u0442\u043E\u043B\u044C\u043D\u043E\u0433\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0430", description: "\u041E\u043F\u0438\u0441\u044B\u0432\u0430\u0435\u0442 \u0442\u0435\u043B\u043E \u0438 \u0447\u0435\u0442\u044B\u0440\u0435 \u0438\u043D\u0441\u0442\u0440\u0443\u043C\u0435\u043D\u0442\u0430 \u043F\u0438\u0442\u043E\u043C\u0446\u0430, \u0430 \u0442\u0430\u043A\u0436\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0441\u043E\u0431\u044B\u0442\u0438\u044F." },
    vars: {
      "pet.user": "\u041A\u0430\u043A \u0431\u043E\u0442 \u043D\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430",
      "pet.vocab": "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0438 \u0434\u0432\u0438\u0436\u0435\u043D\u0438\u044F \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430",
      "pet.moves": "\u0421\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0435 \u0446\u0435\u043B\u0438 \u0442\u0435\u043A\u0443\u0449\u0435\u0433\u043E \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0430 \u0434\u043B\u044F pet_move_to; \u043F\u0443\u0441\u0442\u043E, \u0435\u0441\u043B\u0438 \u0438\u0445 \u043D\u0435\u0442",
      "pet.voice": "\u0412\u043A\u043B\u044E\u0447\u0451\u043D \u043B\u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434",
      "pet.body": "\u041A\u0430\u043A \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0442\u0435\u043A\u0443\u0449\u0438\u0439 \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436",
      "pet.dress": "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u0436\u0438 \u0438 \u043D\u0430\u0440\u044F\u0434\u044B, \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B\u0435 \u0434\u043B\u044F pet_set",
      "pet.self": "\u0421\u0430\u043C\u043E\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430: \u043A\u0430\u043A\u0438\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443, \u043A\u0430\u043A\u0438\u0435 \u0436\u0434\u0443\u0442 \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F, \u0438\u043B\u0438 \u0447\u0442\u043E \u043C\u0435\u043D\u044F\u0442\u044C \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F",
      "pet.chat": "\u041F\u043E\u044F\u0441\u043D\u0435\u043D\u0438\u0435 \u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u0447\u0430\u0442\u0430, \u0435\u0441\u043B\u0438 \u043E\u043D\u0430 \u0435\u0441\u0442\u044C \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438; \u0438\u043D\u0430\u0447\u0435 \u043F\u0443\u0441\u0442\u043E",
      "pet.reply": "\u0421\u0442\u0440\u043E\u043A\u0430, \u043A\u043E\u0442\u043E\u0440\u0430\u044F \u0433\u043E\u0432\u043E\u0440\u0438\u0442 \u0431\u043E\u0442\u0443, \u043D\u0430 \u043A\u0430\u043A\u043E\u043C \u044F\u0437\u044B\u043A\u0435 \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u044C, \u0435\u0441\u043B\u0438 \u044F\u0437\u044B\u043A \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u043D\u0435 \u0443\u043F\u0440\u043E\u0449\u0451\u043D\u043D\u044B\u0439 \u043A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439 \u0438 \u043D\u0435 \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u0438\u0439; \u0438\u043D\u0430\u0447\u0435 \u043F\u0443\u0441\u0442\u043E",
      "pet.cua": "\u0420\u0430\u0437\u0434\u0435\u043B \u043E\u0431 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0438 \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u043E\u043C: \u043A\u043E\u043E\u0440\u0434\u0438\u043D\u0430\u0442\u044B \u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442\u043E\u0432, \u043A\u043E\u0433\u0434\u0430 \u0441\u043D\u0430\u0447\u0430\u043B\u0430 \u0441\u043F\u0440\u0430\u0448\u0438\u0432\u0430\u0442\u044C \u0447\u0435\u043B\u043E\u0432\u0435\u043A\u0430, \u043F\u0440\u0430\u0432\u0438\u043B\u0430 \u043D\u0435 \u043C\u0435\u0448\u0430\u0442\u044C \u0435\u043C\u0443; \u043F\u0443\u0441\u0442\u043E, \u043F\u043E\u043A\u0430 \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u043E\u043C \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E"
    },
    noGuide: "\u0412 \u044D\u0442\u043E\u043C \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438 \u043D\u0435\u0442 \u043E\u0431\u0443\u0447\u0435\u043D\u0438\u044F",
    unknownMethod: (name) => `\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u043C\u0435\u0442\u043E\u0434 ${name}`
  },
  config: {
    group: "\u041D\u0430\u0441\u0442\u043E\u043B\u044C\u043D\u044B\u0439 \u043F\u0438\u0442\u043E\u043C\u0435\u0446",
    soundGroup: "\u0417\u0432\u0443\u043A\u0438",
    asrGroup: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434",
    user: { title: "\u041A\u0430\u043A \u043A \u0432\u0430\u043C \u043E\u0431\u0440\u0430\u0449\u0430\u0442\u044C\u0441\u044F", description: (max2) => `\u0418\u043C\u044F, \u043A\u043E\u0442\u043E\u0440\u044B\u043C \u0432\u0430\u0441 \u043D\u0430\u0437\u044B\u0432\u0430\u044E\u0442 \u0441\u043E\u0431\u044B\u0442\u0438\u044F \u0433\u043E\u043B\u043E\u0441\u0430, \u043D\u0430\u0431\u043E\u0440\u0430 \u0442\u0435\u043A\u0441\u0442\u0430 \u0438 \u043A\u0430\u0441\u0430\u043D\u0438\u0439; \u043D\u0435 \u0434\u043B\u0438\u043D\u043D\u0435\u0435 ${max2} ${plural(max2, "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432", "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432")}. \u0415\u0441\u043B\u0438 \u043F\u0443\u0441\u0442\u043E, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0438\u043C\u044F \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E.` },
    roam: { title: "\u0410\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C", description: "free \u0447\u0430\u0441\u0442\u043E \u0433\u0443\u043B\u044F\u0435\u0442; calm \u0431\u043E\u043B\u044C\u0448\u0443\u044E \u0447\u0430\u0441\u0442\u044C \u0432\u0440\u0435\u043C\u0435\u043D\u0438 \u0441\u0442\u043E\u0438\u0442 \u043D\u0430 \u043C\u0435\u0441\u0442\u0435; off \u0434\u0432\u0438\u0433\u0430\u0435\u0442\u0441\u044F, \u0442\u043E\u043B\u044C\u043A\u043E \u043A\u043E\u0433\u0434\u0430 \u043F\u043E\u043F\u0440\u043E\u0441\u044F\u0442." },
    theme: { title: "\u041D\u043E\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C", description: "dark \u2014 \u043D\u043E\u0447\u044C: \u0441\u0432\u0435\u0442\u043B\u043E\u0435 \u0442\u0435\u043B\u043E \u0438 \u0442\u0451\u043C\u043D\u044B\u0435 \u043E\u0431\u043B\u0430\u0447\u043A\u0430; light \u2014 \u0434\u0435\u043D\u044C: \u0442\u0451\u043C\u043D\u043E\u0435 \u0442\u0435\u043B\u043E \u0438 \u0441\u0432\u0435\u0442\u043B\u044B\u0435 \u043E\u0431\u043B\u0430\u0447\u043A\u0430." },
    rememberPosition: { title: "\u0417\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0442\u044C \u043F\u043E\u043B\u043E\u0436\u0435\u043D\u0438\u0435", description: "\u041F\u0440\u0438 \u0432\u044B\u0445\u043E\u0434\u0435 \u0438\u0437 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0437\u0430\u043F\u043E\u043C\u0438\u043D\u0430\u0435\u0442, \u0433\u0434\u0435 \u043F\u043E \u0433\u043E\u0440\u0438\u0437\u043E\u043D\u0442\u0430\u043B\u0438 \u0441\u0442\u043E\u0438\u0442 \u043F\u0438\u0442\u043E\u043C\u0435\u0446, \u0438 \u0432 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0440\u0430\u0437 \u043F\u0438\u0442\u043E\u043C\u0435\u0446 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0442\u0430\u043C \u0436\u0435; \u043F\u0440\u0438 \u043D\u0435\u0441\u043A\u043E\u043B\u044C\u043A\u0438\u0445 \u044D\u043A\u0440\u0430\u043D\u0430\u0445 \u2014 \u0432\u0441\u0435\u0433\u0434\u0430 \u043D\u0430 \u043E\u0441\u043D\u043E\u0432\u043D\u043E\u043C." },
    hoverButtons: { title: "\u041A\u043D\u043E\u043F\u043A\u0438 \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438", description: (max2, ids) => `\u041A\u043D\u043E\u043F\u043A\u0438 \u0440\u044F\u0434\u043E\u043C \u0441 \u043F\u0438\u0442\u043E\u043C\u0446\u0435\u043C, \u043F\u043E\u043A\u0430 \u043A\u0443\u0440\u0441\u043E\u0440 \u043D\u0430\u0432\u0435\u0434\u0451\u043D \u043D\u0430 \u043F\u0438\u0442\u043E\u043C\u0446\u0430; \u043D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${max2}, \u0447\u0435\u0440\u0435\u0437 \u0437\u0430\u043F\u044F\u0442\u0443\u044E: ${ids}.` },
    doubleClickChat: { title: "\u0414\u0432\u043E\u0439\u043D\u043E\u0439 \u0449\u0435\u043B\u0447\u043E\u043A \u0434\u043B\u044F \u0432\u0432\u043E\u0434\u0430", description: "\u0414\u0432\u043E\u0439\u043D\u043E\u0439 \u0449\u0435\u043B\u0447\u043E\u043A \u043F\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0443 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442 \u043F\u043E\u043B\u0435 \u0432\u0432\u043E\u0434\u0430." },
    statusBubble: { title: "\u041E\u0431\u043B\u0430\u0447\u043A\u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044F", description: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442, \u0447\u0442\u043E \u0434\u0435\u043B\u0430\u0435\u0442 \u043F\u0438\u0442\u043E\u043C\u0435\u0446: \u043E\u0431\u0434\u0443\u043C\u044B\u0432\u0430\u043D\u0438\u0435, \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440 \u043F\u0430\u043C\u044F\u0442\u0438 \u0438\u043B\u0438 \u0440\u0430\u0431\u043E\u0442\u0430 \u0441 \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u043E\u043C, \u0432\u043A\u043B\u044E\u0447\u0430\u044F \u0438\u043C\u0435\u043D\u0430 \u0444\u0430\u0439\u043B\u043E\u0432." },
    saidBubbles: { title: "\u041F\u0443\u0437\u044B\u0440\u0438 \u0432\u0432\u043E\u0434\u0430", description: "\u041D\u0430\u0431\u0440\u0430\u043D\u043D\u043E\u0435, \u0441\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043D\u043E\u0435 \u0441\u043E \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B \u0447\u0430\u0442\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043D\u0430\u0434 \u043F\u0438\u0442\u043E\u043C\u0446\u0435\u043C, \u043F\u043E\u043A\u0430 Coo \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u0442. \u0415\u0441\u043B\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E, \u0440\u0435\u0447\u044C \u0432\u0438\u0434\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F." },
    selfAdjust: { title: "\u0421\u0430\u043C\u043E\u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430", description: "off: \u0441\u0430\u043C\u043E\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u043D\u043E \u043C\u0435\u043D\u044F\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u0437\u0430\u0442\u0438\u0445\u0430\u0442\u044C \u043D\u0435\u043B\u044C\u0437\u044F. default: \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u0436, \u043D\u0430\u0440\u044F\u0434, \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0441\u0442\u044C \u0438 \u0445\u0440\u0430\u043F \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443; \u0440\u0430\u0437\u043C\u0435\u0440, \u0440\u0430\u0437\u043C\u0435\u0440 \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432, \u0440\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430, \u0437\u0432\u0443\u043A\u0438, \u043D\u043E\u0447\u043D\u043E\u0439 \u0440\u0435\u0436\u0438\u043C, \u043A\u043D\u043E\u043F\u043A\u0438 \u043F\u0440\u0438 \u043D\u0430\u0432\u0435\u0434\u0435\u043D\u0438\u0438 \u0438 \u043E\u0431\u0440\u0430\u0449\u0435\u043D\u0438\u0435 \u043A \u0432\u0430\u043C \u0436\u0434\u0443\u0442 \u0432\u0430\u0448\u0435\u0433\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F. any: \u0432\u0441\u0451 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443. custom: \u043A\u0430\u043A \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043E \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \xAB\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438\xBB; \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443, \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u043E\u0435 \u0436\u0434\u0451\u0442 \u0432\u0430\u0448\u0435\u0433\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u0438\u044F." },
    windowEnabled: { title: "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043E\u043A\u043D\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0430 \u043F\u0440\u0438 \u0437\u0430\u043F\u0443\u0441\u043A\u0435" },
    scale: { title: "\u0420\u0430\u0437\u043C\u0435\u0440" },
    bubbleSize: { title: "\u0420\u0430\u0437\u043C\u0435\u0440 \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432", description: "\u0428\u0438\u0440\u0438\u043D\u0430, \u043F\u043E\u043B\u044F, \u0443\u0433\u043B\u044B \u0438 \u0445\u0432\u043E\u0441\u0442\u0438\u043A \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432 \u043F\u0438\u0442\u043E\u043C\u0446\u0430 \u0438 \u0432\u0430\u0448\u0438\u0445, 1 \u2014 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E; \u0440\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F." },
    fontSize: { title: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430", description: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430 \u0432 \u043E\u0431\u043B\u0430\u0447\u043A\u0430\u0445, 1 \u2014 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E; \u0448\u0438\u0440\u0438\u043D\u0430 \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432 \u043D\u0435 \u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F." },
    bubbleSpeed: { title: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432", description: "\u0421\u043A\u043E\u0440\u043E\u0441\u0442\u044C, \u0441 \u043A\u043E\u0442\u043E\u0440\u043E\u0439 \u043F\u0435\u0447\u0430\u0442\u0430\u044E\u0442\u0441\u044F \u043E\u0431\u043B\u0430\u0447\u043A\u0430 \u043F\u0438\u0442\u043E\u043C\u0446\u0430, \u0438 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043E\u043D\u0438 \u0434\u0435\u0440\u0436\u0430\u0442\u0441\u044F; 1 \u2014 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E, \u0431\u043E\u043B\u044C\u0448\u0435 \u2014 \u0431\u044B\u0441\u0442\u0440\u0435\u0435." },
    glow: { title: "\u0412\u043D\u0435\u0448\u043D\u0435\u0435 \u0441\u0432\u0435\u0447\u0435\u043D\u0438\u0435", description: "\u041D\u0430 \u0441\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u0438\u043A\u0441\u0435\u043B\u0435\u0439 \u0440\u0430\u0441\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0441\u0432\u0435\u0442\u043B\u043E\u0435 \u0441\u0432\u0435\u0447\u0435\u043D\u0438\u0435 \u0432\u043E\u043A\u0440\u0443\u0433 \u043F\u0438\u0442\u043E\u043C\u0446\u0430, \u043A\u043E\u0433\u0434\u0430 \u0446\u0432\u0435\u0442\u0430 Coo \u0431\u043B\u0438\u0437\u043A\u0438 \u043A \u0444\u043E\u043D\u0443; 0 \u0432\u044B\u043A\u043B\u044E\u0447\u0430\u0435\u0442." },
    frameRate: { title: "\u0427\u0430\u0441\u0442\u043E\u0442\u0430 \u043A\u0430\u0434\u0440\u043E\u0432", description: "\u041A\u0430\u0434\u0440\u043E\u0432 \u0432 \u0441\u0435\u043A\u0443\u043D\u0434\u0443 \u0432\u043E \u0432\u0440\u0435\u043C\u044F \u0445\u043E\u0434\u044C\u0431\u044B, \u043F\u0440\u044B\u0436\u043A\u043E\u0432 \u0438 \u043F\u0435\u0440\u0435\u043D\u043E\u0441\u043A\u0438 \u043F\u0438\u0442\u043E\u043C\u0446\u0430; 0 \u2014 \u043A\u0430\u043A \u0443 \u0434\u0438\u0441\u043F\u043B\u0435\u044F. \u0412\u044B\u0448\u0435 \u0447\u0430\u0441\u0442\u043E\u0442\u044B \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0434\u0438\u0441\u043F\u043B\u0435\u044F \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0447\u0430\u0441\u0442\u043E\u0442\u0430 \u0434\u0438\u0441\u043F\u043B\u0435\u044F. \u041D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \xAB\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438\xBB \u0435\u0441\u0442\u044C 60, 120, 144 \u0438 \xAB\u0411\u0435\u0437 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\xBB." },
    lockFrameRate: { title: "\u0424\u0438\u043A\u0441\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0447\u0430\u0441\u0442\u043E\u0442\u0443 \u043A\u0430\u0434\u0440\u043E\u0432", description: "\u0420\u0438\u0441\u0443\u0435\u0442 \u043F\u0438\u0442\u043E\u043C\u0446\u0430 \u0441 \u044D\u0442\u043E\u0439 \u0447\u0430\u0441\u0442\u043E\u0442\u043E\u0439 \u0438 \u0432 \u043F\u043E\u043A\u043E\u0435. \u0415\u0441\u043B\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E, \u0447\u0430\u0441\u0442\u043E\u0442\u0430 \u043F\u0430\u0434\u0430\u0435\u0442 \u0434\u043E 30 \u043A\u0430\u0434\u0440\u043E\u0432 \u0432 \u0441\u0435\u043A\u0443\u043D\u0434\u0443, \u043F\u043E\u043A\u0430 \u043F\u0438\u0442\u043E\u043C\u0435\u0446 \u0441\u0442\u043E\u0438\u0442, \u0441\u0438\u0434\u0438\u0442 \u0438\u043B\u0438 \u0441\u043F\u0438\u0442." },
    hideWhenFullscreen: { title: "\u0421\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u0432 \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435", description: "\u0415\u0441\u043B\u0438 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E, \u043F\u0438\u0442\u043E\u043C\u0435\u0446 \u043F\u0440\u044F\u0447\u0435\u0442\u0441\u044F, \u043F\u043E\u043A\u0430 \u043E\u043A\u043D\u043E \u043D\u0430 \u043F\u0435\u0440\u0435\u0434\u043D\u0435\u043C \u043F\u043B\u0430\u043D\u0435 \u0437\u0430\u043D\u0438\u043C\u0430\u0435\u0442 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D, \u043D\u0430 \u043A\u043E\u0442\u043E\u0440\u043E\u043C \u0441\u0442\u043E\u0438\u0442 \u043F\u0438\u0442\u043E\u043C\u0435\u0446 (\u0438\u0433\u0440\u0430, \u0432\u0438\u0434\u0435\u043E \u043D\u0430 \u0432\u0435\u0441\u044C \u044D\u043A\u0440\u0430\u043D, \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0432 \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u043E\u043C \u0440\u0435\u0436\u0438\u043C\u0435), \u0438 \u0432\u043E\u0437\u0432\u0440\u0430\u0449\u0430\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u043F\u043E\u043B\u043D\u043E\u044D\u043A\u0440\u0430\u043D\u043D\u044B\u0439 \u0440\u0435\u0436\u0438\u043C \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F; \u0440\u0430\u0437\u0432\u0451\u0440\u043D\u0443\u0442\u043E\u0435 \u043E\u043A\u043D\u043E \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F. \u0415\u0441\u043B\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E, \u043F\u0438\u0442\u043E\u043C\u0435\u0446 \u0432\u0441\u0435\u0433\u0434\u0430 \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u043E\u0432\u0435\u0440\u0445." },
    exportOverlay: { title: "\u041E\u0432\u0435\u0440\u043B\u0435\u0439 \u0434\u043B\u044F OBS", description: "\u041E\u0442\u0434\u0430\u0451\u0442 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043E\u043A\u043D\u0430 \u043F\u0438\u0442\u043E\u043C\u0446\u0430 \u043D\u0430 \u043F\u0440\u043E\u0437\u0440\u0430\u0447\u043D\u043E\u043C \u0444\u043E\u043D\u0435 \u043F\u043E \u0430\u0434\u0440\u0435\u0441\u0443 /overlay \u0434\u043B\u044F \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A\u0430 \xAB\u0411\u0440\u0430\u0443\u0437\u0435\u0440\xBB \u0432 OBS; \u0435\u0441\u043B\u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E, \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u043E\u0442\u0434\u0430\u0451\u0442." },
    electronFile: { title: "\u0418\u0441\u043F\u043E\u043B\u043D\u044F\u0435\u043C\u044B\u0439 \u0444\u0430\u0439\u043B Electron", description: "\u0415\u0441\u043B\u0438 \u043F\u0443\u0441\u0442\u043E, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F CORTICO_DESKTOP_PET_HOST, \u0437\u0430\u0442\u0435\u043C \u0441\u0440\u0435\u0434\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F, \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043D\u0430\u044F \u0438\u0437 \u043F\u0430\u043D\u0435\u043B\u0438." },
    port: { title: "\u041F\u043E\u0440\u0442 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B", description: "\u0415\u0441\u043B\u0438 \u043F\u043E\u0440\u0442 \u0437\u0430\u043D\u044F\u0442, \u0431\u0435\u0440\u0451\u0442\u0441\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u0441\u0432\u043E\u0431\u043E\u0434\u043D\u044B\u0439." },
    touchEnabled: { title: "\u041A\u0430\u0441\u0430\u043D\u0438\u044F \u043A\u0430\u043A \u0441\u043E\u0431\u044B\u0442\u0438\u044F", description: "\u0422\u044B\u0447\u043A\u0438, \u043F\u043E\u0433\u043B\u0430\u0436\u0438\u0432\u0430\u043D\u0438\u044F, \u043A\u043E\u0433\u0434\u0430 \u043F\u0438\u0442\u043E\u043C\u0446\u0430 \u043F\u043E\u0434\u043D\u0438\u043C\u0430\u044E\u0442 \u0438 \u0431\u0440\u043E\u0441\u0430\u044E\u0442." },
    touchWakeOn: { title: "\u0420\u0435\u0436\u0438\u043C \u043E\u0442\u043A\u043B\u0438\u043A\u0430", description: "poke: \u0441\u0440\u0430\u0437\u0443 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043D\u0430 \u0442\u044B\u0447\u043E\u043A; \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043A\u0430\u0441\u0430\u043D\u0438\u044F \u0436\u0434\u0443\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430. all: \u0441\u0440\u0430\u0437\u0443 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u043B\u044E\u0431\u043E\u0435 \u043A\u0430\u0441\u0430\u043D\u0438\u0435. none: \u0432\u0441\u0435 \u043A\u0430\u0441\u0430\u043D\u0438\u044F \u0436\u0434\u0443\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430. custom: \u0441\u0440\u0430\u0437\u0443 \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442 \u043D\u0430 \u043A\u0430\u0441\u0430\u043D\u0438\u044F, \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \xAB\u041F\u0440\u0438\u0432\u044B\u0447\u043A\u0438\xBB. \u041F\u043E\u0441\u043B\u0435 \u043E\u0442\u0432\u0435\u0442\u0430 \u043A\u0430\u0441\u0430\u043D\u0438\u044F \u0434\u043E \u043A\u043E\u043D\u0446\u0430 \u044D\u0442\u043E\u0433\u043E \u0445\u043E\u0434\u0430 \u0436\u0434\u0443\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u0433\u043E \u043E\u0442\u0432\u0435\u0442\u0430." },
    sound: { title: "\u0412\u0441\u0435 \u0437\u0432\u0443\u043A\u0438", description: "\u0415\u0433\u043E \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043A\u043D\u043E\u043F\u043A\u0430 \u0437\u0432\u0443\u043A\u0430 \u0432 \u043C\u0435\u043D\u044E \u043F\u0438\u0442\u043E\u043C\u0446\u0430." },
    sounds: {
      move: { title: "\u0414\u0432\u0438\u0436\u0435\u043D\u0438\u044F", description: "\u0425\u043E\u0434\u044C\u0431\u0430, \u0431\u0435\u0433, \u043F\u0440\u044B\u0436\u043A\u0438, \u043F\u0440\u0438\u0437\u0435\u043C\u043B\u0435\u043D\u0438\u0435, \u043F\u043E\u043B\u0451\u0442 \u043F\u043E\u0441\u043B\u0435 \u0431\u0440\u043E\u0441\u043A\u0430, \u043A\u0438\u0432\u043A\u0438, \u043C\u043E\u0442\u0430\u043D\u0438\u0435 \u0433\u043E\u043B\u043E\u0432\u043E\u0439, \u043A\u0440\u0443\u0436\u0435\u043D\u0438\u0435, \u0433\u043E\u043B\u043E\u0432\u043E\u043A\u0440\u0443\u0436\u0435\u043D\u0438\u0435, \u0434\u0440\u043E\u0436\u044C, \u0442\u0430\u043D\u0446\u044B, \u043E\u0433\u043B\u044F\u0434\u044B\u0432\u0430\u043D\u0438\u0435." },
      touch: { title: "\u041A\u0430\u0441\u0430\u043D\u0438\u044F", description: "\u041A\u043E\u0433\u0434\u0430 \u043F\u043E\u0434\u043D\u0438\u043C\u0430\u044E\u0442, \u0440\u0430\u0441\u043A\u0430\u0447\u0438\u0432\u0430\u044E\u0442, \u0433\u043B\u0430\u0434\u044F\u0442, \u0442\u044B\u043A\u0430\u044E\u0442." },
      face: { title: "\u0412\u044B\u0440\u0430\u0436\u0435\u043D\u0438\u044F", description: "\u0420\u0430\u0434\u043E\u0441\u0442\u044C, \u043F\u043E\u0434\u043C\u0438\u0433\u0438\u0432\u0430\u043D\u0438\u0435, \u043B\u044E\u0431\u043E\u0432\u044C, \u0443\u0434\u0438\u0432\u043B\u0435\u043D\u0438\u0435, \u0437\u043B\u043E\u0441\u0442\u044C, \u0433\u0440\u0443\u0441\u0442\u044C, \u0441\u043C\u0443\u0449\u0435\u043D\u0438\u0435, \u0437\u0435\u0432\u043E\u0442\u0430." },
      snore: { title: "\u0425\u0440\u0430\u043F", description: "" },
      talk: { title: "\u0420\u0435\u0447\u044C", description: "\u0411\u043E\u0440\u043C\u043E\u0442\u0430\u043D\u0438\u0435, \u043F\u043E\u043A\u0430 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0442\u0435\u043A\u0441\u0442 \u0432 \u043E\u0431\u043B\u0430\u0447\u043A\u0435, \u0438 \u043F\u043E\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043A\u0430\u0440\u0442\u043E\u0447\u0435\u043A \u0441 \u0432\u0430\u0440\u0438\u0430\u043D\u0442\u0430\u043C\u0438." },
      ui: { title: "\u041A\u043D\u043E\u043F\u043A\u0438 \u0438 \u0441\u0438\u0433\u043D\u0430\u043B\u044B", description: "\u041D\u0430\u0436\u0430\u0442\u0438\u044F \u043A\u043D\u043E\u043F\u043E\u043A, \u043F\u043E\u044F\u0432\u043B\u0435\u043D\u0438\u0435 \u043E\u0431\u043B\u0430\u0447\u043A\u043E\u0432, \u0432\u044B\u0431\u043E\u0440, \u043D\u0430\u0447\u0430\u043B\u043E \u0438 \u043A\u043E\u043D\u0435\u0446 \u043F\u0440\u043E\u0441\u043B\u0443\u0448\u0438\u0432\u0430\u043D\u0438\u044F." }
    },
    snoreSeconds: { title: "\u0414\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0445\u0440\u0430\u043F\u0430", suffix: "\u0441", description: "\u041A\u0430\u0436\u0434\u044B\u0439 \u0440\u0430\u0437 \u0432\u043E \u0441\u043D\u0435 \u043F\u0438\u0442\u043E\u043C\u0435\u0446 \u0437\u0430\u043C\u043E\u043B\u043A\u0430\u0435\u0442, \u043F\u0440\u043E\u0445\u0440\u0430\u043F\u0435\u0432 \u0441\u0442\u043E\u043B\u044C\u043A\u043E; z \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u044E\u0442 \u043F\u043B\u044B\u0442\u044C. 0 = \u0445\u0440\u0430\u043F\u0435\u0442\u044C \u0434\u043E \u043F\u0440\u043E\u0431\u0443\u0436\u0434\u0435\u043D\u0438\u044F." },
    speech: { title: "\u0413\u043E\u043B\u043E\u0441", description: "\u041F\u0440\u043E\u0438\u0437\u043D\u043E\u0441\u0438\u0442 \u0441\u043B\u043E\u0433 \u043D\u0430 \u043A\u0430\u0436\u0434\u044B\u0439 \u0441\u0438\u043C\u0432\u043E\u043B, \u043F\u043E\u044F\u0432\u043B\u044F\u044E\u0449\u0438\u0439\u0441\u044F \u0432 \u043F\u0443\u0437\u044B\u0440\u0435, \u0432\u043C\u0435\u0441\u0442\u043E \u0431\u043E\u0440\u043C\u043E\u0442\u0430\u043D\u0438\u044F \xAB\u0420\u0435\u0447\u0438\xBB; \u043C\u043E\u043B\u0447\u0438\u0442, \u043F\u043E\u043A\u0430 \u0437\u0432\u0443\u043A\u0438 \xAB\u0420\u0435\u0447\u0438\xBB \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u044B." },
    speechPitch: { title: "\u0412\u044B\u0441\u043E\u0442\u0430 \u0433\u043E\u043B\u043E\u0441\u0430", description: (a, b, c) => `low, mid \u0438 high \u2014 ${a}, ${b} \u0438 ${c} \u0413\u0446; custom \u0431\u0435\u0440\u0451\u0442 \u0441\u0432\u043E\u044E \u0432\u044B\u0441\u043E\u0442\u0443.` },
    speechPitchHz: { title: "\u0421\u0432\u043E\u044F \u0432\u044B\u0441\u043E\u0442\u0430" },
    speechSpeed: { title: "\u0422\u0435\u043C\u043F \u0433\u043E\u043B\u043E\u0441\u0430", description: (a, b, c) => `\u041D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 \u0441\u0442\u043E\u043B\u044C\u043A\u0438\u0445 \u0441\u043B\u043E\u0433\u043E\u0432 \u0432 \u0441\u0435\u043A\u0443\u043D\u0434\u0443: low, mid \u0438 high \u2014 ${a}, ${b} \u0438 ${c}; custom \u0431\u0435\u0440\u0451\u0442 \u0441\u0432\u043E\u0439 \u0442\u0435\u043C\u043F. \u0415\u0441\u043B\u0438 \u0433\u043E\u043B\u043E\u0441 \u043C\u0435\u0434\u043B\u0435\u043D\u043D\u0435\u0435 \u0442\u0435\u043A\u0441\u0442\u0430, \u043E\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442 \u043F\u043E\u0441\u043B\u0435 \u043D\u0435\u0433\u043E.` },
    speechRate: { title: "\u0421\u0432\u043E\u0439 \u0442\u0435\u043C\u043F", suffix: "\u0441\u043B\u043E\u0433\u043E\u0432/\u0441" },
    asrEnabled: { title: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434" },
    asrEngine: { title: "\u0414\u0432\u0438\u0436\u043E\u043A \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F", description: "funasr \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 SenseVoiceSmall \u043E\u0442 FunASR, \u0434\u043B\u044F \u043A\u0438\u0442\u0430\u0439\u0441\u043A\u043E\u0433\u043E, \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u0433\u043E, \u044F\u043F\u043E\u043D\u0441\u043A\u043E\u0433\u043E, \u043A\u043E\u0440\u0435\u0439\u0441\u043A\u043E\u0433\u043E \u0438 \u043A\u0430\u043D\u0442\u043E\u043D\u0441\u043A\u043E\u0433\u043E, \u043F\u043E\u0441\u043B\u0435 \u043E\u0434\u043D\u043E\u043A\u0440\u0430\u0442\u043D\u043E\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043E\u043A\u043E\u043B\u043E 240 \u041C\u0411; whisper \u0437\u0430\u043F\u0443\u0441\u043A\u0430\u0435\u0442 Whisper small \u043E\u0442 OpenAI, \u0434\u043B\u044F \u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u043E\u0433\u043E, \u043D\u0435\u043C\u0435\u0446\u043A\u043E\u0433\u043E, \u0438\u0441\u043F\u0430\u043D\u0441\u043A\u043E\u0433\u043E, \u043F\u043E\u0440\u0442\u0443\u0433\u0430\u043B\u044C\u0441\u043A\u043E\u0433\u043E, \u0438\u0442\u0430\u043B\u044C\u044F\u043D\u0441\u043A\u043E\u0433\u043E, \u0440\u0443\u0441\u0441\u043A\u043E\u0433\u043E \u0438 \u0435\u0449\u0451 \u043E\u043A\u043E\u043B\u043E 90 \u044F\u0437\u044B\u043A\u043E\u0432, \u043F\u043E\u0441\u043B\u0435 \u043E\u0434\u043D\u043E\u043A\u0440\u0430\u0442\u043D\u043E\u0439 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u043E\u043A\u043E\u043B\u043E 360 \u041C\u0411, \u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0442\u0435\u043A\u0441\u0442, \u043A\u043E\u0433\u0434\u0430 \u0444\u0440\u0430\u0437\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0435\u043D\u0430; \u043E\u0431\u0430 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u044E\u0442 \u043D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435. system \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u043E\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435 \u0440\u0435\u0447\u0438 Windows, \u0431\u0435\u0437 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438 \u0441 \u043C\u0435\u043D\u044C\u0448\u0435\u0439 \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C\u044E (\u0442\u043E\u043B\u044C\u043A\u043E \u0432 Windows). api \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u044C \u043A\u0430\u0436\u0434\u043E\u0439 \u0444\u0440\u0430\u0437\u044B \u0432 \u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0441 OpenAI \u0441\u0435\u0440\u0432\u0438\u0441 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438 \u0438 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442 \u0442\u0435\u043A\u0441\u0442, \u043A\u043E\u0433\u0434\u0430 \u0444\u0440\u0430\u0437\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0435\u043D\u0430; \u0430\u0434\u0440\u0435\u0441 \u0438 \u043C\u043E\u0434\u0435\u043B\u044C \u0437\u0430\u0434\u0430\u044E\u0442\u0441\u044F \u043D\u0438\u0436\u0435, API Key \u2014 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \xAB\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434\xBB. \u0415\u0441\u043B\u0438 \u043F\u0443\u0441\u0442\u043E, \u0432\u044B\u0431\u043E\u0440 \u0437\u0430\u0432\u0438\u0441\u0438\u0442 \u043E\u0442 \u044F\u0437\u044B\u043A\u0430 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F: funasr \u0434\u043B\u044F \u043A\u0438\u0442\u0430\u0439\u0441\u043A\u043E\u0433\u043E, \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u0433\u043E, \u044F\u043F\u043E\u043D\u0441\u043A\u043E\u0433\u043E \u0438 \u043A\u043E\u0440\u0435\u0439\u0441\u043A\u043E\u0433\u043E, whisper \u0434\u043B\u044F \u043E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0445." },
    asrLanguage: { title: "\u042F\u0437\u044B\u043A", description: "\u041A\u043E\u0434 ISO 639-1 \u0438\u043B\u0438 auto, \u0447\u0442\u043E\u0431\u044B \u043C\u043E\u0434\u0435\u043B\u044C \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u0438\u043B\u0430 \u0441\u0430\u043C\u0430; \u0435\u0441\u043B\u0438 \u043F\u0443\u0441\u0442\u043E, \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u044F\u0437\u044B\u043A\u0443 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F. FunASR \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442 zh, en, ja, ko \u0438 yue, Whisper \u2014 \u043E\u043A\u043E\u043B\u043E \u0441\u043E\u0442\u043D\u0438 \u043A\u043E\u0434\u043E\u0432, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 fr, de, es, pt, it \u0438 ru; \u043A\u043E\u0434, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043C\u043E\u0434\u0435\u043B\u044C \u043D\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442, \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F auto. \u0421\u0435\u0440\u0432\u0438\u0441\u0443 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438 \u043A\u043E\u0434 \u043F\u0435\u0440\u0435\u0434\u0430\u0451\u0442\u0441\u044F, \u0442\u043E\u043B\u044C\u043A\u043E \u0435\u0441\u043B\u0438 \u0432 \u043D\u0451\u043C \u0434\u0432\u0435 \u0431\u0443\u043A\u0432\u044B." },
    asrApiUrl: { title: "\u0410\u0434\u0440\u0435\u0441 \u0441\u0435\u0440\u0432\u0438\u0441\u0430 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438", description: "\u0421 \u0434\u0432\u0438\u0436\u043A\u043E\u043C api \u043A\u0430\u0436\u0434\u0430\u044F \u0444\u0440\u0430\u0437\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043D\u0430 /audio/transcriptions \u043F\u043E\u0434 \u044D\u0442\u0438\u043C \u0430\u0434\u0440\u0435\u0441\u043E\u043C, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 https://api.example.com/v1. \u0423\u0434\u0430\u043B\u0451\u043D\u043D\u044B\u0439 \u0430\u0434\u0440\u0435\u0441 \u0434\u043E\u043B\u0436\u0435\u043D \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C https; \u0430\u0434\u0440\u0435\u0441\u0430 \u044D\u0442\u043E\u0433\u043E \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0430 \u0438 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0439 \u0441\u0435\u0442\u0438 \u043C\u043E\u0433\u0443\u0442 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C http." },
    asrApiModel: { title: "\u041C\u043E\u0434\u0435\u043B\u044C \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438", description: "\u0418\u043C\u044F \u043C\u043E\u0434\u0435\u043B\u0438 \u0432 \u0437\u0430\u043F\u0440\u043E\u0441\u0430\u0445 \u0441 \u0434\u0432\u0438\u0436\u043A\u043E\u043C api." },
    asrThreads: { title: "\u041F\u043E\u0442\u043E\u043A\u0438 CPU", description: "\u0421\u043A\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0442\u043E\u043A\u043E\u0432 FunASR \u0438 Whisper \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u043D\u0430 \u043E\u0434\u043D\u043E \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u0435; 0 = 2." },
    asrSimplified: { title: "\u041F\u0440\u0435\u043E\u0431\u0440\u0430\u0437\u043E\u0432\u044B\u0432\u0430\u0442\u044C \u0432 \u0443\u043F\u0440\u043E\u0449\u0451\u043D\u043D\u044B\u0435", description: "\u041F\u0435\u0440\u0435\u0432\u043E\u0434\u0438\u0442 \u0442\u0440\u0430\u0434\u0438\u0446\u0438\u043E\u043D\u043D\u044B\u0435 \u0438\u0435\u0440\u043E\u0433\u043B\u0438\u0444\u044B \u0432 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u043E\u043C \u0442\u0435\u043A\u0441\u0442\u0435 \u0432 \u0443\u043F\u0440\u043E\u0449\u0451\u043D\u043D\u044B\u0435, \u043A\u043E\u0433\u0434\u0430 \u044F\u0437\u044B\u043A \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0443\u043F\u0440\u043E\u0449\u0451\u043D\u043D\u044B\u0439 \u043A\u0438\u0442\u0430\u0439\u0441\u043A\u0438\u0439." },
    thresholdDb: { title: "\u041F\u043E\u0440\u043E\u0433 \u0440\u0435\u0447\u0438" },
    silenceMs: { title: "\u0422\u0438\u0448\u0438\u043D\u0430, \u0437\u0430\u0432\u0435\u0440\u0448\u0430\u044E\u0449\u0430\u044F \u0444\u0440\u0430\u0437\u0443" },
    maxUtteranceMs: { title: "\u0421\u0430\u043C\u0430\u044F \u0434\u043B\u0438\u043D\u043D\u0430\u044F \u0444\u0440\u0430\u0437\u0430" }
  },
  panel: {
    pet: "\u041D\u0430\u0441\u0442\u043E\u043B\u044C\u043D\u044B\u0439 \u043F\u0438\u0442\u043E\u043C\u0435\u0446",
    window: "\u041E\u043A\u043D\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
    openWindow: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u043E\u043A\u043D\u043E",
    closeWindow: "\u0417\u0430\u043A\u0440\u044B\u0442\u044C \u043E\u043A\u043D\u043E",
    runtime: "\u0421\u0440\u0435\u0434\u0430 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u0438\u044F \u043E\u043A\u043D\u0430",
    install: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C",
    viewInBrowser: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435",
    dress: "\u0413\u0430\u0440\u0434\u0435\u0440\u043E\u0431",
    dressHint: "\u0418\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u044F \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443 \u0438 \u043F\u043E\u043F\u0430\u0434\u0430\u044E\u0442 \u0432 \u043E\u043A\u043D\u043E \u043F\u0438\u0442\u043E\u043C\u0446\u0430",
    connected: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    starting: "\u0417\u0430\u043F\u0443\u0441\u043A",
    cannotOpen: "\u041D\u0435 \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F",
    notOpen: "\u041D\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u043E",
    external: "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F \u0432\u043D\u0435\u0448\u043D\u044F\u044F \u043F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u0430",
    installed: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    downloading: (progress) => `\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 ${progress}`,
    installFailed: "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C",
    notInstalled: "\u041D\u0435 \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    noBuild: "\u0414\u043B\u044F \u044D\u0442\u043E\u0439 \u043F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B \u043D\u0435\u0442 \u0433\u043E\u0442\u043E\u0432\u043E\u0439 \u0441\u0431\u043E\u0440\u043A\u0438",
    electronSize: "Electron 44.4.4, \u043E\u043A\u043E\u043B\u043E 150 \u041C\u0411",
    voice: "\u0413\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434",
    enable: "\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0433\u043E\u043B\u043E\u0441\u043E\u0432\u043E\u0439 \u0432\u0432\u043E\u0434",
    enabledHint: "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u043C; \u0441\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F Coo \u043F\u043E \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0435 \xAB\u041A\u0430\u043A \u0441\u043B\u0443\u0448\u0430\u0442\u044C\xBB",
    enabledHintOnPress: "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043E\u0442\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F, \u043F\u043E\u043A\u0430 \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430, \u0438 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0435\u0451 \u043E\u0442\u043F\u0443\u0441\u043A\u0430\u044E\u0442",
    disabledHint: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E: \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0437\u0430\u043A\u0440\u044B\u0442, \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0438\u0436\u0435 \u0436\u0434\u0443\u0442",
    engine: "\u0414\u0432\u0438\u0436\u043E\u043A \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F",
    funasr: "FunASR (\u043D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435)",
    system: "\u0412\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u044B\u0439 \u0432 Windows",
    whisper: "Whisper (\u043D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435)",
    systemHint: "\u0411\u0435\u0437 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438, \u0441\u0440\u0435\u0434\u043D\u044F\u044F \u0442\u043E\u0447\u043D\u043E\u0441\u0442\u044C; \u0434\u043B\u044F \u043B\u0443\u0447\u0448\u0438\u0445 \u0440\u0435\u0437\u0443\u043B\u044C\u0442\u0430\u0442\u043E\u0432 \u043F\u0435\u0440\u0435\u043A\u043B\u044E\u0447\u0438\u0442\u0435\u0441\u044C \u043D\u0430 FunASR \u0438\u043B\u0438 Whisper",
    funasrHint: "SenseVoiceSmall \u043D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435, \u0434\u043B\u044F \u043A\u0438\u0442\u0430\u0439\u0441\u043A\u043E\u0433\u043E, \u0430\u043D\u0433\u043B\u0438\u0439\u0441\u043A\u043E\u0433\u043E, \u044F\u043F\u043E\u043D\u0441\u043A\u043E\u0433\u043E, \u043A\u043E\u0440\u0435\u0439\u0441\u043A\u043E\u0433\u043E \u0438 \u043A\u0430\u043D\u0442\u043E\u043D\u0441\u043A\u043E\u0433\u043E",
    whisperHint: "Whisper small \u043D\u0430 \u044D\u0442\u043E\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435, \u0434\u043B\u044F \u0444\u0440\u0430\u043D\u0446\u0443\u0437\u0441\u043A\u043E\u0433\u043E, \u043D\u0435\u043C\u0435\u0446\u043A\u043E\u0433\u043E, \u0438\u0441\u043F\u0430\u043D\u0441\u043A\u043E\u0433\u043E, \u043F\u043E\u0440\u0442\u0443\u0433\u0430\u043B\u044C\u0441\u043A\u043E\u0433\u043E, \u0438\u0442\u0430\u043B\u044C\u044F\u043D\u0441\u043A\u043E\u0433\u043E, \u0440\u0443\u0441\u0441\u043A\u043E\u0433\u043E \u0438 \u0434\u0440\u0443\u0433\u0438\u0445; \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0444\u0440\u0430\u0437\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0435\u043D\u0430",
    api: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438 (\u0441\u043E\u0432\u043C\u0435\u0441\u0442\u0438\u043C\u044B\u0439 \u0441 OpenAI)",
    apiName: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0442\u0440\u0430\u043D\u0441\u043A\u0440\u0438\u0431\u0430\u0446\u0438\u0438",
    apiHint: "\u041A\u0430\u0436\u0434\u0430\u044F \u0444\u0440\u0430\u0437\u0430 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u0432 \u0441\u0435\u0440\u0432\u0438\u0441, \u0437\u0430\u0434\u0430\u043D\u043D\u044B\u0439 \u043D\u0438\u0436\u0435; \u0442\u0435\u043A\u0441\u0442 \u043F\u043E\u044F\u0432\u043B\u044F\u0435\u0442\u0441\u044F, \u043A\u043E\u0433\u0434\u0430 \u0444\u0440\u0430\u0437\u0430 \u0437\u0430\u043A\u043E\u043D\u0447\u0435\u043D\u0430",
    apiUrl: "\u0410\u0434\u0440\u0435\u0441",
    apiModel: "\u041C\u043E\u0434\u0435\u043B\u044C",
    apiKey: "API Key",
    keySaved: "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D",
    keyMissing: "\u041D\u0435 \u0437\u0430\u0434\u0430\u043D",
    server: "\u0421\u043B\u0443\u0436\u0431\u0430 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F",
    start: "\u0417\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u044C",
    stop: "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C",
    ready: "\u0413\u043E\u0442\u043E\u0432\u043E",
    error: "\u041E\u0448\u0438\u0431\u043A\u0430",
    stopped: "\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E",
    model: "\u041C\u043E\u0434\u0435\u043B\u044C \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u0432\u0430\u043D\u0438\u044F",
    download: "\u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C",
    retry: "\u041F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u044C",
    downloadFailed: "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u043D\u0435 \u0443\u0434\u0430\u043B\u0430\u0441\u044C",
    downloaded: "\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E",
    notDownloaded: "\u041D\u0435 \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E",
    modelSource: (size) => `\u041E\u043A\u043E\u043B\u043E ${size}, \u0437\u0430\u0433\u0440\u0443\u0436\u0430\u0435\u0442\u0441\u044F \u0441 ModelScope`,
    mic: "\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D",
    micStates: { on: "\u0421\u043B\u0443\u0448\u0430\u0435\u0442", off: "\u041D\u0435 \u0441\u043B\u0443\u0448\u0430\u0435\u0442", denied: "\u0414\u043E\u0441\u0442\u0443\u043F \u0437\u0430\u043F\u0440\u0435\u0449\u0451\u043D", error: "\u041E\u0448\u0438\u0431\u043A\u0430" },
    defaultDevice: "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u043E\u0435 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    missingDevice: "\u0423\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E, \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u0440\u0430\u043D\u044C\u0448\u0435 (\u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u043E)",
    micN: (n) => `\u041C\u0438\u043A\u0440\u043E\u0444\u043E\u043D ${n}`,
    mode: "\u041A\u0430\u043A \u0441\u043B\u0443\u0448\u0430\u0442\u044C",
    modes: { hold: "\u041F\u043E\u043A\u0430 \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u043A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430", toggle: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430 \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0438 \u0432\u044B\u043A\u043B\u044E\u0447\u0430\u0435\u0442", always: "\u0412\u0441\u0451 \u0432\u0440\u0435\u043C\u044F" },
    openOnPress: "\u041E\u0442\u043A\u0440\u044B\u0432\u0430\u0442\u044C \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u0440\u0438 \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0438",
    openOnPressHint: "\u0414\u043B\u044F \u0433\u0430\u0440\u043D\u0438\u0442\u0443\u0440, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 Bluetooth, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u044F\u0442 \u0432 \u0440\u0435\u0436\u0438\u043C \u0437\u0432\u043E\u043D\u043A\u0430, \u043F\u043E\u043A\u0430 \u043C\u0438\u043A\u0440\u043E\u0444\u043E\u043D \u043E\u0442\u043A\u0440\u044B\u0442; \u043F\u043E\u0441\u043B\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u044F \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435 \u043D\u0435\u043C\u043D\u043E\u0433\u043E \u0438 \u0442\u043E\u043B\u044C\u043A\u043E \u043F\u043E\u0442\u043E\u043C \u0433\u043E\u0432\u043E\u0440\u0438\u0442\u0435, \u0438\u043D\u0430\u0447\u0435 \u043F\u0435\u0440\u0432\u044B\u0435 \u0441\u043B\u043E\u0432\u0430 \u043C\u043E\u0433\u0443\u0442 \u043F\u0440\u043E\u043F\u0430\u0441\u0442\u044C",
    switchOn: "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    switchOff: "\u0412\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    presses: {
      2: { hold: "\u0414\u0432\u043E\u0439\u043D\u043E\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u0435 \u0438 \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435", toggle: "\u0414\u0432\u043E\u0439\u043D\u043E\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u0435: \u0441\u0442\u0430\u0440\u0442, \u0435\u0449\u0451 \u043E\u0434\u043D\u043E: \u0441\u0442\u043E\u043F" },
      1: { hold: "\u041F\u0440\u043E\u0441\u0442\u043E \u0443\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0442\u044C", toggle: "\u041D\u0430\u0436\u0430\u0442\u0438\u0435: \u0441\u0442\u0430\u0440\u0442, \u0435\u0449\u0451 \u043E\u0434\u043D\u043E: \u0441\u0442\u043E\u043F" },
      3: { hold: "\u0422\u0440\u043E\u0439\u043D\u043E\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u0435 \u0438 \u0443\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435", toggle: "\u0422\u0440\u043E\u0439\u043D\u043E\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u0435: \u0441\u0442\u0430\u0440\u0442, \u0435\u0449\u0451 \u043E\u0434\u043D\u043E: \u0441\u0442\u043E\u043F" }
    },
    capture: "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u043E\u0432\u0443\u044E \u043A\u043B\u0430\u0432\u0438\u0448\u0443 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430: \u0441\u043E\u0447\u0435\u0442\u0430\u043D\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448 \u0438\u043B\u0438 \u0431\u043E\u043A\u043E\u0432\u0443\u044E \u043A\u043D\u043E\u043F\u043A\u0443 \u043C\u044B\u0448\u0438\u2026 (Esc \u0434\u043B\u044F \u043E\u0442\u043C\u0435\u043D\u044B)",
    listening: "\u0421\u043B\u0443\u0448\u0430\u0435\u0442",
    waitingKey: "\u041E\u0436\u0438\u0434\u0430\u043D\u0438\u0435 \u043A\u043B\u0430\u0432\u0438\u0448\u0438 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
    results: "\u0420\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D\u043E\u0435",
    resultsHint: "\u0417\u0430\u0447\u0451\u0440\u043A\u043D\u0443\u0442\u044B\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u0431\u044B\u043B\u0438 \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u043A\u043E\u0440\u043E\u0442\u043A\u0438\u043C\u0438 \u0438\u043B\u0438 \u043F\u043E\u0445\u043E\u0436\u0438\u043C\u0438 \u043D\u0430 \u0433\u0430\u043B\u043B\u044E\u0446\u0438\u043D\u0430\u0446\u0438\u0438 \u0438 \u043D\u0435 \u0431\u044B\u043B\u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u044B",
    talkKeyName: "\u041A\u043B\u0430\u0432\u0438\u0448\u0430 \u0440\u0430\u0437\u0433\u043E\u0432\u043E\u0440\u0430",
    changeKey: "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C",
    cancelKey: "\u041E\u0442\u043C\u0435\u043D\u0430",
    level: "\u0423\u0440\u043E\u0432\u0435\u043D\u044C \u0432\u0445\u043E\u0434\u0430",
    thresholdHint: "\u0420\u0435\u0447\u044C\u044E \u0441\u0447\u0438\u0442\u0430\u0435\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0437\u0432\u0443\u043A \u0433\u0440\u043E\u043C\u0447\u0435 \u044D\u0442\u043E\u0439 \u0447\u0435\u0440\u0442\u044B; \u0435\u0441\u043B\u0438 \u043A\u0442\u043E-\u0442\u043E \u0434\u0440\u0443\u0433\u043E\u0439 \u0433\u043E\u0432\u043E\u0440\u0438\u0442 \u0442\u0430\u043A \u0436\u0435 \u0433\u0440\u043E\u043C\u043A\u043E, \u043A\u0430\u043A \u0432\u044B, \u0435\u0433\u043E \u0442\u043E\u0436\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u044E\u0442",
    noResults: "\u041F\u043E\u043A\u0430 \u043D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043E"
  },
  chat: {
    badImages: "\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u044D\u0442\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0430 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0435\u0442",
    tooManyImages: (max2) => `\u041D\u0435 \u0431\u043E\u043B\u044C\u0448\u0435 ${max2} ${plural(max2, "\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F", "\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439", "\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439")} \u0437\u0430 \u0440\u0430\u0437`,
    badMime: (mime) => `\u041D\u0435\u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u043C\u044B\u0439 \u0442\u0438\u043F \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F: ${mime}`,
    emptyImage: "\u041E\u0434\u043D\u043E \u0438\u0437 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 \u043F\u0443\u0441\u0442\u043E\u0435",
    bigImage: (mb) => `\u041A\u0430\u0436\u0434\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043C\u0435\u043D\u044C\u0448\u0435 ${mb} \u041C\u0411`,
    offline: "\u0415\u0449\u0451 \u043D\u0435\u0442 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F",
    notSent: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043F\u0440\u0430\u0432\u0438\u0442\u044C",
    tooLate: "\u042D\u0442\u043E \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u0443\u0436\u0435 \u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E, \u043E\u0442\u043E\u0437\u0432\u0430\u0442\u044C \u0435\u0433\u043E \u043D\u0435\u043B\u044C\u0437\u044F."
  }
};
var ru_default = ru;

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/i18n/index.ts
var PET_TEXT = { zh: zh_default, en: en_default, "zh-Hant": zh_Hant_default, ja: ja_default, ko: ko_default, fr: fr_default, de: de_default, "es-419": es_419_default, "pt-BR": pt_BR_default, it: it_default, ru: ru_default };
function petText(language = "zh") {
  const base = PET_TEXT[language === "zh" || language === "zh-Hant" ? "zh" : "en"];
  const own = language === "zh" || language === "en" ? void 0 : PET_TEXT[language];
  if (!own) return base;
  return { ...base, ...Object.fromEntries(Object.entries(own).filter(([, value]) => value !== void 0)) };
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/packs.ts
var BUILTIN_PACKS = [
  { dir: fileURLToPath(new URL("../web/coo/", import.meta.url)), base: "/web/coo/" },
  { dir: fileURLToPath(new URL("../web/whale/", import.meta.url)), base: "/web/whale/" }
];
function packFile(pack, path) {
  const root = normalize(pack.dir).replace(/[\\/]+$/, "") + sep;
  const full = normalize(join(root, path));
  return full.startsWith(root) ? full : null;
}

// D:/daily use/Coopanion/resources/app/node_modules/fflate/esm/index.mjs
import { createRequire } from "module";
var require2 = createRequire("/");
var _a;
var Worker;
var isMarkedAsUntransferable;
try {
  _a = require2("worker_threads"), Worker = _a.Worker, isMarkedAsUntransferable = _a.isMarkedAsUntransferable;
} catch (e) {
}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]);
var fdeb = new u8([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]);
var clim = new u8([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]);
var freb = function(eb, start) {
  var b = new u16(31);
  for (var i2 = 0; i2 < 31; ++i2) {
    b[i2] = start += 1 << eb[i2 - 1];
  }
  var r = new i32(b[30]);
  for (var i2 = 1; i2 < 30; ++i2) {
    for (var j = b[i2]; j < b[i2 + 1]; ++j) {
      r[j] = j - b[i2] << 5 | i2;
    }
  }
  return { b, r };
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
var fd = _b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (i = 0; i < 32768; ++i) {
  x = (i & 43690) >> 1 | (i & 21845) << 1;
  x = (x & 52428) >> 2 | (x & 13107) << 2;
  x = (x & 61680) >> 4 | (x & 3855) << 4;
  rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var x;
var i;
var hMap = (function(cd, mb, r) {
  var s = cd.length;
  var i2 = 0;
  var l = new u16(mb);
  for (; i2 < s; ++i2) {
    if (cd[i2])
      ++l[cd[i2] - 1];
  }
  var le = new u16(mb);
  for (i2 = 1; i2 < mb; ++i2) {
    le[i2] = le[i2 - 1] + l[i2 - 1] << 1;
  }
  var co;
  if (r) {
    co = new u16(1 << mb);
    var rvb = 15 - mb;
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        var sv = i2 << 4 | cd[i2];
        var r_1 = mb - cd[i2];
        var v = le[cd[i2] - 1]++ << r_1;
        for (var m = v | (1 << r_1) - 1; v <= m; ++v) {
          co[rev[v] >> rvb] = sv;
        }
      }
    }
  } else {
    co = new u16(s);
    for (i2 = 0; i2 < s; ++i2) {
      if (cd[i2]) {
        co[i2] = rev[le[cd[i2] - 1]++] >> 15 - cd[i2];
      }
    }
  }
  return co;
});
var flt = new u8(288);
for (i = 0; i < 144; ++i)
  flt[i] = 8;
var i;
for (i = 144; i < 256; ++i)
  flt[i] = 9;
var i;
for (i = 256; i < 280; ++i)
  flt[i] = 7;
var i;
for (i = 280; i < 288; ++i)
  flt[i] = 8;
var i;
var fdt = new u8(32);
for (i = 0; i < 32; ++i)
  fdt[i] = 5;
var i;
var flrm = /* @__PURE__ */ hMap(flt, 9, 1);
var fdrm = /* @__PURE__ */ hMap(fdt, 5, 1);
var max = function(a) {
  var m = a[0];
  for (var i2 = 1; i2 < a.length; ++i2) {
    if (a[i2] > m)
      m = a[i2];
  }
  return m;
};
var bits = function(d, p, m) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8) >> (p & 7) & m;
};
var bits16 = function(d, p) {
  var o = p / 8 | 0;
  return (d[o] | d[o + 1] << 8 | d[o + 2] << 16) >> (p & 7);
};
var shft = function(p) {
  return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
  if (s == null || s < 0)
    s = 0;
  if (e == null || e > v.length)
    e = v.length;
  return new u8(v.subarray(s, e));
};
var ec = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  // determined by compression function
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
];
var err = function(ind, msg, nt) {
  var e = new Error(msg || ec[ind]);
  e.code = ind;
  if (Error.captureStackTrace)
    Error.captureStackTrace(e, err);
  if (!nt)
    throw e;
  return e;
};
var inflt = function(dat, st, buf, dict) {
  var sl = dat.length, dl = dict ? dict.length : 0;
  if (!sl || st.f && !st.l)
    return buf || new u8(0);
  var noBuf = !buf;
  var resize = noBuf || st.i != 2;
  var noSt = st.i;
  if (noBuf)
    buf = new u8(sl * 3);
  var cbuf = function(l2) {
    var bl = buf.length;
    if (l2 > bl) {
      var nbuf = new u8(Math.max(bl * 2, l2));
      nbuf.set(buf);
      buf = nbuf;
    }
  };
  var final = st.f || 0, pos = st.p || 0, bt = st.b || 0, lm = st.l, dm = st.d, lbt = st.m, dbt = st.n;
  var tbts = sl * 8;
  do {
    if (!lm) {
      final = bits(dat, pos, 1);
      var type = bits(dat, pos + 1, 3);
      pos += 3;
      if (!type) {
        var s = shft(pos) + 4, l = dat[s - 4] | dat[s - 3] << 8, t = s + l;
        if (t > sl) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + l);
        buf.set(dat.subarray(s, t), bt);
        st.b = bt += l, st.p = pos = t * 8, st.f = final;
        continue;
      } else if (type == 1)
        lm = flrm, dm = fdrm, lbt = 9, dbt = 5;
      else if (type == 2) {
        var hLit = bits(dat, pos, 31) + 257, hcLen = bits(dat, pos + 10, 15) + 4;
        var tl = hLit + bits(dat, pos + 5, 31) + 1;
        pos += 14;
        var ldt = new u8(tl);
        var clt = new u8(19);
        for (var i2 = 0; i2 < hcLen; ++i2) {
          clt[clim[i2]] = bits(dat, pos + i2 * 3, 7);
        }
        pos += hcLen * 3;
        var clb = max(clt), clbmsk = (1 << clb) - 1;
        var clm = hMap(clt, clb, 1);
        for (var i2 = 0; i2 < tl; ) {
          var r = clm[bits(dat, pos, clbmsk)];
          pos += r & 15;
          var s = r >> 4;
          if (s < 16) {
            ldt[i2++] = s;
          } else {
            var c = 0, n = 0;
            if (s == 16)
              n = 3 + bits(dat, pos, 3), pos += 2, c = ldt[i2 - 1];
            else if (s == 17)
              n = 3 + bits(dat, pos, 7), pos += 3;
            else if (s == 18)
              n = 11 + bits(dat, pos, 127), pos += 7;
            while (n--)
              ldt[i2++] = c;
          }
        }
        var lt = ldt.subarray(0, hLit), dt = ldt.subarray(hLit);
        lbt = max(lt);
        dbt = max(dt);
        lm = hMap(lt, lbt, 1);
        dm = hMap(dt, dbt, 1);
      } else
        err(1);
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
    }
    if (resize)
      cbuf(bt + 131072);
    var lms = (1 << lbt) - 1, dms = (1 << dbt) - 1;
    var lpos = pos;
    for (; ; lpos = pos) {
      var c = lm[bits16(dat, pos) & lms], sym = c >> 4;
      pos += c & 15;
      if (pos > tbts) {
        if (noSt)
          err(0);
        break;
      }
      if (!c)
        err(2);
      if (sym < 256)
        buf[bt++] = sym;
      else if (sym == 256) {
        lpos = pos, lm = null;
        break;
      } else {
        var add = sym - 254;
        if (sym > 264) {
          var i2 = sym - 257, b = fleb[i2];
          add = bits(dat, pos, (1 << b) - 1) + fl[i2];
          pos += b;
        }
        var d = dm[bits16(dat, pos) & dms], dsym = d >> 4;
        if (!d)
          err(3);
        pos += d & 15;
        var dt = fd[dsym];
        if (dsym > 3) {
          var b = fdeb[dsym];
          dt += bits16(dat, pos) & (1 << b) - 1, pos += b;
        }
        if (pos > tbts) {
          if (noSt)
            err(0);
          break;
        }
        if (resize)
          cbuf(bt + 131072);
        var end = bt + add;
        if (bt < dt) {
          var shift = dl - dt, dend = Math.min(dt, end);
          if (shift + bt < 0)
            err(3);
          for (; bt < dend; ++bt)
            buf[bt] = dict[shift + bt];
        }
        for (; bt < end; ++bt)
          buf[bt] = buf[bt - dt];
      }
    }
    st.l = lm, st.p = lpos, st.b = bt, st.f = final;
    if (lm)
      final = 1, st.m = lbt, st.d = dm, st.n = dbt;
  } while (!final);
  return bt != buf.length && noBuf ? slc(buf, 0, bt) : buf.subarray(0, bt);
};
var et = /* @__PURE__ */ new u8(0);
var b2 = function(d, b) {
  return d[b] | d[b + 1] << 8;
};
var b4 = function(d, b) {
  return (d[b] | d[b + 1] << 8 | d[b + 2] << 16 | d[b + 3] << 24) >>> 0;
};
var b8 = function(d, b) {
  return b4(d, b) + b4(d, b + 4) * 4294967296;
};
function inflateSync(data, opts) {
  return inflt(data, { i: 2 }, opts && opts.out, opts && opts.dictionary);
}
var td = typeof TextDecoder != "undefined" && /* @__PURE__ */ new TextDecoder();
var tds = 0;
try {
  td.decode(et, { stream: true });
  tds = 1;
} catch (e) {
}
var dutf8 = function(d) {
  for (var r = "", i2 = 0; ; ) {
    var c = d[i2++];
    var eb = (c > 127) + (c > 223) + (c > 239);
    if (i2 + eb > d.length)
      return { s: r, r: slc(d, i2 - 1) };
    if (!eb)
      r += String.fromCharCode(c);
    else if (eb == 3) {
      c = ((c & 15) << 18 | (d[i2++] & 63) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63) - 65536, r += String.fromCharCode(55296 | c >> 10, 56320 | c & 1023);
    } else if (eb & 1)
      r += String.fromCharCode((c & 31) << 6 | d[i2++] & 63);
    else
      r += String.fromCharCode((c & 15) << 12 | (d[i2++] & 63) << 6 | d[i2++] & 63);
  }
};
function strFromU8(dat, latin1) {
  if (latin1) {
    var r = "";
    for (var i2 = 0; i2 < dat.length; i2 += 16384)
      r += String.fromCharCode.apply(null, dat.subarray(i2, i2 + 16384));
    return r;
  } else if (td) {
    return td.decode(dat);
  } else {
    var _a2 = dutf8(dat), s = _a2.s, r = _a2.r;
    if (r.length)
      err(8);
    return s;
  }
}
var slzh = function(d, b) {
  return b + 30 + b2(d, b + 26) + b2(d, b + 28);
};
var zh = function(d, b, z) {
  var fnl = b2(d, b + 28), efl = b2(d, b + 30), fn = strFromU8(d.subarray(b + 46, b + 46 + fnl), !(b2(d, b + 8) & 2048)), es = b + 46 + fnl;
  var _a2 = z64hs(d, es, efl, z, b4(d, b + 20), b4(d, b + 24), b4(d, b + 42)), sc = _a2[0], su = _a2[1], off = _a2[2];
  return [b2(d, b + 10), sc, su, fn, es + efl + b2(d, b + 32), off];
};
var z64hs = function(d, b, l, z, sc, su, off) {
  var nsc = sc == 4294967295, nsu = su == 4294967295, noff = off == 4294967295, e = b + l;
  var nf = nsc + nsu + noff;
  if (z && nf) {
    for (; b + 4 < e; b += 4 + b2(d, b + 2)) {
      if (b2(d, b) == 1) {
        return [
          nsc ? b8(d, b + 4 + 8 * nsu) : sc,
          nsu ? b8(d, b + 4) : su,
          noff ? b8(d, b + 4 + 8 * (nsu + nsc)) : off,
          1
        ];
      }
    }
    if (z < 2)
      err(13);
  }
  return [sc, su, off, 0];
};
function unzipSync(data, opts) {
  var files = {};
  var e = data.length - 22;
  for (; b4(data, e) != 101010256; --e) {
    if (!e || data.length - e > 65558)
      err(13);
  }
  ;
  var c = b2(data, e + 8);
  if (!c)
    return {};
  var o = b4(data, e + 16);
  var z = b4(data, e - 20) == 117853008;
  if (z) {
    var ze = b4(data, e - 12);
    z = b4(data, ze) == 101075792;
    if (z) {
      c = b4(data, ze + 32);
      o = b4(data, ze + 48);
    }
  }
  var fltr = opts && opts.filter;
  for (var i2 = 0; i2 < c; ++i2) {
    var _a2 = zh(data, o, z), c_2 = _a2[0], sc = _a2[1], su = _a2[2], fn = _a2[3], no = _a2[4], off = _a2[5], b = slzh(data, off);
    o = no;
    if (!fltr || fltr({
      name: fn,
      size: sc,
      originalSize: su,
      compression: c_2
    })) {
      if (!c_2)
        files[fn] = slc(data, b, b + sc);
      else if (c_2 == 8)
        files[fn] = inflateSync(data.subarray(b, b + sc), { out: new u8(su) });
      else
        err(14, "unknown compression type " + c_2);
    }
  }
  return files;
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/pack-import.ts
var PACK_DEPTH = 3;
var IMPORT_MAX = 128 * 1024 * 1024;
var BUNDLE_TYPE = "application/x-figure-files";
var THUMB_MAX = 1024 * 1024;
function filesFromZip(bytes, t = petText().importing) {
  let total = 0;
  let entries;
  try {
    entries = unzipSync(bytes, {
      // sizes as the zip states them; what was unpacked is counted again below
      filter: (f) => {
        total += f.originalSize;
        return !f.name.endsWith("/") && total <= IMPORT_MAX;
      }
    });
  } catch (err2) {
    return t.badZip(err2.message);
  }
  if (total > IMPORT_MAX) return t.tooBig(IMPORT_MAX / 1048576);
  const files = Object.entries(entries).map(([path, data]) => ({ path, bytes: data }));
  if (files.reduce((n, f) => n + f.bytes.length, 0) > IMPORT_MAX) return t.tooBig(IMPORT_MAX / 1048576);
  return files;
}
function filesFromBundle(bytes, t = petText().importing) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = new TextDecoder();
  const files = [];
  let at = 0;
  while (at < bytes.length) {
    if (at + 4 > bytes.length) return t.truncated;
    const pathLen = view.getUint32(at, true);
    at += 4;
    if (at + pathLen + 4 > bytes.length) return t.truncated;
    const path = text.decode(bytes.subarray(at, at + pathLen));
    at += pathLen;
    const size = view.getUint32(at, true);
    at += 4;
    if (at + size > bytes.length) return t.truncated;
    files.push({ path, bytes: bytes.subarray(at, at + size) });
    at += size;
  }
  return files;
}

// D:/daily use/Coopanion/resources/app/node_modules/cortico-world-desktop-pet/src/server.ts
var MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8",
  ".ogg": "audio/ogg",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav"
};
var PAGES = { "/pet": "pet.html", "/dress": "dress.html" };
var LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
var PORT_ATTEMPTS = 10;
var PACK_CSP = "sandbox allow-scripts; default-src 'none'";
var PAGE_CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws://127.0.0.1:* ws://localhost:*; img-src 'self' data:; media-src 'self' blob:; worker-src 'self' blob:; frame-ancestors 'self' http://127.0.0.1:* http://localhost:*";
var WATCHER_MESSAGES = /* @__PURE__ */ new Set(["text", "prefs", "control"]);
var PetServer = class {
  constructor(opts) {
    this.opts = opts;
  }
  opts;
  http = null;
  wss = null;
  pet = null;
  petIsWindow = false;
  /** Dressing pages and pet pages that only watch. */
  dressers = /* @__PURE__ */ new Set();
  /** The pet window process sending the overlay's frames, and the overlay pages watching. */
  overlaySource = null;
  overlayViewers = /* @__PURE__ */ new Set();
  /** What the source was last told. */
  overlayTold = null;
  boundPort = 0;
  windowKey = randomUUID();
  get port() {
    return this.boundPort;
  }
  get t() {
    return this.opts.text?.() ?? petText();
  }
  get origin() {
    return this.boundPort ? `http://127.0.0.1:${this.boundPort}` : "";
  }
  /** Only the window host receives this URL; its fragment stays out of HTTP requests and referrers. */
  get windowUrl() {
    return `${this.origin}/pet#key=${this.windowKey}`;
  }
  get petConnected() {
    return this.pet !== null && this.pet.readyState === this.pet.OPEN;
  }
  /** The connected pet page is the pet window, not a browser tab. */
  get petInWindow() {
    return this.petConnected && this.petIsWindow;
  }
  async start() {
    const base = this.opts.port();
    let lastErr = null;
    for (let i2 = 0; i2 < PORT_ATTEMPTS; i2++) {
      const server = createServer((req, res) => {
        void this.handle(req, res);
      });
      try {
        await new Promise((done, fail) => {
          server.once("error", fail);
          server.listen(base === 0 ? 0 : base + i2, "127.0.0.1", () => {
            server.off("error", fail);
            done();
          });
        });
      } catch (err2) {
        lastErr = err2;
        const code = err2.code;
        if (code === "EADDRINUSE" || code === "EACCES") continue;
        throw err2;
      }
      this.http = server;
      const addr = server.address();
      this.boundPort = typeof addr === "object" && addr ? addr.port : 0;
      this.wss = new import_websocket_server.default({ noServer: true });
      server.on("upgrade", (req, socket, head) => {
        if (!this.allowed(req, true)) {
          socket.end("HTTP/1.1 421 Misdirected Request\r\nConnection: close\r\n\r\n");
          return;
        }
        const url = new URL(req.url ?? "/", this.origin);
        if (url.pathname !== "/socket") {
          socket.destroy();
          return;
        }
        const params = url.searchParams;
        if ((params.get("host") === "window" || params.get("role") === "overlay-source") && params.get("key") !== this.windowKey) {
          socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
          return;
        }
        this.wss.handleUpgrade(req, socket, head, (ws) => this.accept(ws, req));
      });
      return this.boundPort;
    }
    throw new Error(this.t.portsTaken(base, base + PORT_ATTEMPTS - 1, lastErr?.message ?? ""));
  }
  async stop() {
    for (const ws of [this.pet, ...this.dressers, this.overlaySource, ...this.overlayViewers]) ws?.close();
    this.pet = null;
    this.dressers.clear();
    this.overlaySource = null;
    this.overlayViewers.clear();
    this.wss?.close();
    this.wss = null;
    const http = this.http;
    this.http = null;
    this.boundPort = 0;
    if (http) {
      http.closeAllConnections();
      await new Promise((r) => http.close(() => r()));
    }
  }
  /** Sends to the pet page; false when no page is connected. */
  sendPet(msg) {
    if (!this.petConnected) return false;
    this.pet.send(JSON.stringify(msg));
    return true;
  }
  /** Sends to the pet page and every dressing page. */
  broadcast(msg) {
    const text = JSON.stringify(msg);
    for (const ws of [this.pet, ...this.dressers]) if (ws && ws.readyState === ws.OPEN) ws.send(text);
  }
  /** Follows `overlay()`: off closes the overlay pages; the source streams while it is on and a page watches. */
  syncOverlay() {
    if (!this.overlayEnabled) for (const ws of this.overlayViewers) ws.close(4003, "overlay off");
    const source = this.overlaySource;
    if (!source || source.readyState !== source.OPEN) return;
    const on = this.overlayEnabled && this.overlayViewers.size > 0;
    if (on === this.overlayTold) return;
    this.overlayTold = on;
    source.send(JSON.stringify({ t: "overlay", on }));
  }
  get overlayEnabled() {
    return this.opts.overlay?.() ?? false;
  }
  /** Browser writes require this service's HTTP origin; local clients may omit Origin. Reads also allow loopback and opaque origins. */
  allowed(req, write) {
    if (!LOOPBACK.test(req.headers.host ?? "")) return false;
    const origin = req.headers.origin;
    if (origin === "null") return !write;
    if (!origin) return true;
    if (write) return origin === this.origin || origin === `http://localhost:${this.boundPort}`;
    try {
      return LOOPBACK.test(new URL(origin).host);
    } catch {
      return false;
    }
  }
  accept(ws, req) {
    const params = new URL(req.url ?? "/", "http://x").searchParams;
    const fromWindow = params.get("host") === "window";
    if (params.get("role") === "overlay-source") return this.acceptOverlaySource(ws);
    if (params.get("role") === "overlay") return this.acceptOverlayViewer(ws);
    ws.send(JSON.stringify({ t: "init", ...this.opts.snapshot() }));
    const watcher = params.get("role") !== "pet" || !fromWindow && this.petConnected && this.petIsWindow;
    if (!watcher) {
      const old = this.pet;
      this.pet = ws;
      this.petIsWindow = fromWindow;
      if (old) old.close(4e3, "replaced");
      this.opts.onPetConnect();
      ws.on("message", (data, isBinary) => {
        if (this.pet !== ws) return;
        if (isBinary) {
          const buf = data;
          if (buf.length % 2 === 0) this.opts.onAudio(new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)));
          return;
        }
        const msg = parse(data.toString());
        if (msg) this.opts.onPetMessage(msg);
      });
      ws.on("close", () => {
        if (this.pet !== ws) return;
        this.pet = null;
        this.opts.onPetDisconnect();
      });
      return;
    }
    if (params.get("role") === "pet") {
      ws.send(JSON.stringify({ t: "watching" }));
      ws.on("message", (data, isBinary) => {
        const msg = isBinary ? null : parse(data.toString());
        if (msg && WATCHER_MESSAGES.has(msg.t)) this.opts.onPetMessage(msg);
      });
    }
    this.dressers.add(ws);
    ws.on("close", () => this.dressers.delete(ws));
  }
  acceptOverlaySource(ws) {
    this.overlaySource?.close(4e3, "replaced");
    this.overlaySource = ws;
    this.overlayTold = null;
    ws.on("message", (data, isBinary) => {
      if (this.overlaySource !== ws || !isBinary || !this.overlayEnabled) return;
      for (const viewer of this.overlayViewers) if (viewer.readyState === viewer.OPEN) viewer.send(data, { binary: true });
    });
    ws.on("close", () => {
      if (this.overlaySource !== ws) return;
      this.overlaySource = null;
      const clear = Buffer.alloc(24);
      for (const viewer of this.overlayViewers) if (viewer.readyState === viewer.OPEN) viewer.send(clear, { binary: true });
    });
    this.syncOverlay();
  }
  acceptOverlayViewer(ws) {
    if (!this.overlayEnabled) {
      ws.close(4003, "overlay off");
      return;
    }
    this.overlayViewers.add(ws);
    ws.on("close", () => {
      this.overlayViewers.delete(ws);
      this.syncOverlay();
    });
    this.syncOverlay();
  }
  async handle(req, res) {
    if (!this.allowed(req, req.method !== "GET" && req.method !== "HEAD")) {
      res.writeHead(421).end();
      return;
    }
    const url = new URL(req.url ?? "/", "http://x");
    const path = url.pathname;
    if (req.method === "GET" && path === "/api/figures") {
      const importer = this.opts.importer;
      return json(res, 200, (this.opts.packs?.() ?? []).map((pack) => {
        const { id, base, manifest: m } = pack;
        return {
          id,
          base,
          name: m.name,
          thumb: m.thumb ?? null,
          entry: m.entry,
          export: m.export,
          model: m.model ?? null,
          axes: m.axes,
          presets: m.presets,
          vocab: m.vocab.map(({ id: w, kind, seconds, lasting }) => ({ id: w, kind, seconds, ...lasting ? { lasting } : {} })),
          sounds: m.sounds,
          can: m.can,
          needs: m.needs,
          voice: m.voice,
          effects: m.effects,
          bubble: m.bubble ?? null,
          removable: importer?.removable(pack) ?? false
        };
      }));
    }
    if (req.method === "GET" && path === "/api/figures/status") {
      return json(res, 200, {
        importable: !!this.opts.importer,
        max: IMPORT_MAX,
        depth: PACK_DEPTH,
        problems: (this.opts.packProblems?.() ?? []).filter((p) => !p.loaded).map((p) => ({ dir: basename(p.dir), reason: p.reason }))
      });
    }
    if (req.method === "POST" && path.startsWith("/api/figures/import") && this.opts.importer) return this.importRequest(req, res, path, this.opts.importer);
    if (req.method === "POST" && path === "/api/figures/remove" && this.opts.importer) {
      const msg = parse(await readBody(req) ?? "");
      if (typeof msg?.id !== "string") return json(res, 400, { error: "bad json" });
      const out = await this.opts.importer.remove(msg.id);
      return json(res, "error" in out ? 400 : 200, out);
    }
    if (req.method === "GET" && path === "/figure-frame") {
      const self = `http://${req.headers.host}`;
      return this.sendFile(res, join2(this.opts.webDir, "figure-frame.html"), [
        "sandbox allow-scripts",
        "default-src 'none'",
        `script-src ${self}`,
        `img-src ${self} data: blob:`,
        "style-src 'unsafe-inline'",
        "connect-src 'none'",
        // the pet page holds it, and the console that shows the pet page in its own frames (another local port) is an ancestor too
        `frame-ancestors ${self} http://127.0.0.1:* http://localhost:*`
      ].join("; "));
    }
    if (req.method === "GET" && path.startsWith("/packs/")) {
      const [, , id, ...rest] = path.split("/");
      const pack = (this.opts.packs?.() ?? []).find((p) => p.id === id && !p.builtin);
      const full2 = pack ? packFile(pack, decodeURIComponent(rest.join("/"))) : null;
      if (!full2) {
        res.writeHead(404).end();
        return;
      }
      return this.sendFile(res, full2, PACK_CSP, req.headers.origin === "null");
    }
    if (req.method === "GET" && path === "/api/state") return json(res, 200, this.opts.snapshot());
    if (req.method === "GET" && path === "/api/avatar") {
      const bytes = this.opts.avatarFile ? await readFile(this.opts.avatarFile).catch(() => null) : null;
      if (!bytes) {
        res.writeHead(404).end();
        return;
      }
      res.writeHead(200, { "content-type": "image/png", "cache-control": "no-cache" }).end(bytes);
      return;
    }
    if (req.method === "POST" && path === "/api/speech") {
      const msg = parse(await readBody(req) ?? "");
      if (!this.opts.speech) {
        res.writeHead(404).end();
        return;
      }
      if (typeof msg?.text !== "string") return json(res, 400, { error: "bad json" });
      return json(res, 200, { units: this.opts.speech(msg.text) });
    }
    if (req.method === "POST" && (path === "/api/skin" || path === "/api/prefs")) {
      const body = await readBody(req);
      const msg = body ? parse(body) : null;
      if (!msg) return json(res, 400, { error: "bad json" });
      if (path === "/api/skin") this.opts.onSkin(msg.skin);
      else this.opts.onPrefs(msg);
      return json(res, 200, { ok: true });
    }
    if (req.method === "POST" && path === "/api/image-bubble") {
      const body = await readBody(req, IMAGE_BUBBLE_MAX);
      const msg = body ? parse(body) : null;
      if (!msg || typeof msg.dataUrl !== "string") return json(res, 400, { error: "bad json" });
      if (!/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(msg.dataUrl)) {
        return json(res, 400, { error: "not an image data URL" });
      }
      if (msg.dataUrl.length > IMAGE_BUBBLE_MAX) return json(res, 413, { error: "image too large" });
      const duration = Math.max(1, Math.min(30, Number(msg.duration) || 3));
      const size = Math.max(0, Math.min(2e3, Number(msg.size) || 0));
      const scale = Math.max(0.1, Math.min(3, Number(msg.scale) || 1));
      const radius = Math.max(0, Math.min(64, Number(msg.radius) || 16));
      const sent = this.sendPet({ t: "image-bubble", dataUrl: msg.dataUrl, duration, size, scale, radius });
      if (!sent) return json(res, 409, { ok: false, error: "pet-not-connected" });
      return json(res, 200, { ok: true });
    }
    if (req.method !== "GET") {
      res.writeHead(405).end();
      return;
    }
    if (path === "/") {
      res.writeHead(302, { location: "/pet" }).end();
      return;
    }
    if (path === "/overlay") {
      if (!this.overlayEnabled) {
        res.writeHead(404).end();
        return;
      }
      return this.sendPage(res, join2(this.opts.webDir, "overlay.html"));
    }
    const file = PAGES[path] ?? (path.startsWith("/web/") ? path.slice(5) : null);
    if (!file) {
      res.writeHead(404).end();
      return;
    }
    const root = normalize2(this.opts.webDir).replace(/[\\/]+$/, "") + sep2;
    const full = normalize2(join2(root, file));
    if (!full.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (PAGES[path]) return this.sendPage(res, full);
    return this.sendFile(res, full, null, path.startsWith("/web/") && req.headers.origin === "null");
  }
  /** A page, its `<html lang>` set to the app language (`zh` as `zh-CN`). */
  async sendPage(res, full) {
    const lang = languageTag(this.opts.language?.() ?? "zh");
    try {
      const html = (await readFile(full, "utf8")).replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
      res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache", "content-security-policy": PAGE_CSP });
      res.end(html);
    } catch {
      res.writeHead(404).end();
    }
  }
  async importRequest(req, res, path, importer) {
    if (path === "/api/figures/import") {
      const type = (req.headers["content-type"] ?? "").split(";")[0].trim();
      if (type !== "application/zip" && type !== BUNDLE_TYPE) return json(res, 415, { error: this.t.importing.zipOrFolder });
      const bytes = await readBytes(req, IMPORT_MAX);
      if (!bytes) return json(res, 413, { error: this.t.importing.overLimit(IMPORT_MAX / 1048576) });
      const files = type === BUNDLE_TYPE ? filesFromBundle(bytes, this.t.importing) : filesFromZip(bytes, this.t.importing);
      if (typeof files === "string") return json(res, 400, { error: files });
      const out = await importer.stage(files, type === BUNDLE_TYPE);
      return json(res, "error" in out ? 400 : 200, out);
    }
    const body = await readBody(req);
    const msg = body ? parse(body) : null;
    if (path === "/api/figures/import/install" && msg && typeof msg.token === "string" && Array.isArray(msg.dirs)) {
      const replace = Array.isArray(msg.replace) ? msg.replace.filter((id) => typeof id === "string") : [];
      const out = await importer.install(msg.token, msg.dirs.filter((d) => typeof d === "string"), replace);
      return json(res, "error" in out ? 400 : "conflicts" in out ? 409 : 200, out);
    }
    if (path === "/api/figures/import/cancel") {
      await importer.cancel();
      return json(res, 200, { ok: true });
    }
    return json(res, 400, { error: "bad request" });
  }
  /** A file with the pages' CSP (or `csp`); `frame` answers the figure frame's CORS request. */
  async sendFile(res, full, csp, frame = false) {
    try {
      const bytes = await readFile(full);
      res.writeHead(200, {
        "content-type": MIME[extname2(full)] ?? "application/octet-stream",
        "cache-control": "no-cache",
        "content-security-policy": csp ?? PAGE_CSP,
        "x-content-type-options": "nosniff",
        ...frame ? { "access-control-allow-origin": "null" } : {}
      });
      res.end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  }
};
function parse(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}
function json(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}
function readBytes(req, max2) {
  return new Promise((done) => {
    if (Number(req.headers["content-length"] ?? 0) > max2) {
      req.resume();
      done(null);
      return;
    }
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > max2) {
        req.destroy();
        done(null);
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => done(Buffer.concat(chunks)));
    req.on("error", () => done(null));
  });
}
var MAX_BODY = 64 * 1024;
var IMAGE_BUBBLE_MAX = 8 * 1024 * 1024;
function readBody(req, max2 = MAX_BODY) {
  return new Promise((done) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > max2) {
        req.destroy();
        done(null);
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => done(Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => done(null));
  });
}
export {
  PetServer
};
