define(["z80e"], function(z80e) {
    var Runloop = function(pointer) {
        if (!pointer) {
            pointer = z80e.Module["_runloop_init"]();
        }

        this.pointer = pointer;
    }

    Runloop.prototype.tick = function(cycles) {
        if (!cycles) {
            return z80e.Module["_runloop_tick"](this.pointer);
        } else {
            return z80e.Module["_runloop_tick_cycles"](this.pointer, cycles);
        }
    }

    return Runloop;
});
