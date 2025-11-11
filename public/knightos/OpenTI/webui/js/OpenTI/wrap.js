define(["z80e"], function(z80e) {
    var Wrap = {};
    var ShouldWrap = {
        Int32: ["HEAP32", 4],
        UInt32: ["HEAPU32", 4],
        Int16: ["HEAP16", 2],
        UInt16: ["HEAPU16", 2],
        Int8: ["HEAP8", 1],
        UInt8: ["HEAPU8", 1],
    }
    for(var i in ShouldWrap) {
        var Heap = z80e.Module[ShouldWrap[i][0]];
        var Divisor = ShouldWrap[i][1];

        Wrap[i] = (function(Heap, Divisor) {
            return function(obj, name, location, bit, offset) {
                location /= Divisor;

                if (bit == undefined) {
                    bit = ~0;
                    offset = 0;
                }

                Object.defineProperty(obj, name, {
                    get: function() {
                        return (Heap[location] & bit) >> offset;
                    },
                    set: function(val) {
                        if (bit != ~0) {
                            Heap[location] &= ~bit;
                        }
                        Heap[location] |= (val << offset) & bit;
                    }
                });
            }
        })(Heap, Divisor);
    }

    Wrap.Pointer = function(obj, name, location, pointerClass) {
        location /= 4;

        Object.defineProperty(obj, name, {
            get: function() {
                return new pointerClass(z80e.Module.HEAPU32[location]);
            },

            set: function(val) {
                z80e.Module.HEAPU32[location] = val.pointer;
            }
        });
    }

    return Wrap;
});
