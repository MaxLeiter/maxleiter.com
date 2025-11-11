define(
  ["require", "z80e", "../wrap", "../Runloop", "./MMU", "../Core/CPU",
   "../Debugger/HookInfo", "../Debugger/Debugger", "./Hardware/Hardware"],
  function(require, z80e, Wrap, Runloop, MMU) {
    var ASIC = function(device) {
        pointer = z80e.Module["_asic_init"](device);

        this.pointer = pointer;

        Wrap.Int32(this, "stopped", pointer);
        pointer += 4;

        Wrap.Int32(this, "device", pointer);
        pointer += 4;

        Wrap.Int32(this, "battery", pointer);
        pointer += 4;

        Wrap.Int32(this, "battery_remove_check", pointer);
        pointer += 4;

        Object.defineProperty(this, "clock_rate", {
            get: (function() {
                return z80e.Module.HEAP32[(this.pointer + 16) / 4];
            }).bind(this),
            set: (function(val) {
                z80e.Module["_asic_set_clock_rate"](this.pointer, val);
            }).bind(this)
        });

        pointer += 4;

        Object.defineProperty(this, "hardware", {
            get: (function() {
                return require("./Hardware/Hardware")(this.cpu);
            }.bind(this))
        });

        Wrap.Pointer(this, "cpu", pointer, require("../Core/CPU"));
        pointer += 4;

        Wrap.Pointer(this, "runloop", pointer, Runloop);
        pointer += 4;

        Wrap.Pointer(this, "mmu", pointer, MMU);
        pointer += 12;

        Wrap.Pointer(this, "hook", pointer, require("../Debugger/HookInfo"));
        pointer += 8;

        Wrap.Pointer(this, "debugger", pointer, require("../Debugger/Debugger"));
        pointer += 4;

    }

    ASIC.prototype.free = function() {
        z80e.Module["_asic_free"](this.pointer);
    }

    return ASIC;
});

