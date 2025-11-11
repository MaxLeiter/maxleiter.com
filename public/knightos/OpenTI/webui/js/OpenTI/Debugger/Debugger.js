define(["require", "z80e", "../wrap", "../TI/ASIC"], function(require, z80e, Wrap) {
    var wrapped = {};
    var new_wrapped = 0;

    function print_string(id, string_pointer) {
        wrapped[id].print(Pointer_stringify(string_pointer));
    }

    function window_closed(id) {
        wrapped[id].closed();
    }

    function new_state(id, current_state, new_title) {
        var state = new Debugger.State(current_state);
        var new_wrap = wrapped[id].new_state(state, Pointer_stringify(new_title));
        wrapped[new_wrapped] = new_wrap;
        return new_wrapped++;
    }

    var ids = {
        print_string: z80e.Module.Runtime.addFunction(print_string),
        window_closed: z80e.Module.Runtime.addFunction(window_closed),
        new_state: z80e.Module.Runtime.addFunction(new_state)
    };

    var Debugger = function(pointer) {
        if (typeof pointer == "number") {
        } else if (pointer.constructor == require("../TI/ASIC")) {
            pointer = z80e.Module["_init_debugger"](pointer.pointer);
        } else {
            throw "Either pass a pointer or an ASIC!";
        }

        this.pointer = pointer;

        this.flags = {};
        Wrap.Int32(this.flags, "echo", pointer, 1, 0);
        Wrap.Int32(this.flags, "echo_reg", pointer, 2, 1);
        pointer += 4;

        var _commands = {};
        Wrap.Int32(_commands, "length", pointer);
        pointer += 4;
        Wrap.Int32(_commands, "capacity", pointer);
        pointer += 4;
        Wrap.Int32(_commands, "commands_pointer", pointer);
        pointer += 4;

        if (typeof Proxy !== "undefined") { // Proxy is an experimental API
            this.commands = new Proxy(_commands, {
                get: function(target, key) {
                    if (isNaN(key)) {
                        return target[key];
                    } else if(parseInt(key, 10) < target.length) {
                        return new Debugger.Command(z80e.Module.HEAPU32[(target.commands_pointer + (parseInt(key, 10) * 4)) / 4]);
                    }
                },
                set: function(target, key, value) {
                    return false;
                },
                has: function(target, key) {
                    if (parseInt(key, 10) < target.length) {
                        return true;
                    } else {
                        return target.hasItem(key);
                    }
                },
                enumerate: function(target) {
                    var keys = [];
                    for (var i = 0; i < target.length; i++) {
                        keys.push(i);
                    }
                    return keys;
                }
            });
        }

        Wrap.Pointer(this, "asic", pointer, require("../TI/ASIC"));
        pointer += 4;

        Wrap.Int32(this, "state", pointer);
        pointer += 4;
    }

    var InterfaceState = function(pointer) {
        Wrap.Int32(this, "js_reference", pointer);
        pointer += 4;
        Wrap.Int32(this, "print_string", pointer);
        pointer += 4;
        Wrap.Int32(this, "new_state", pointer);
        pointer += 4;
        Wrap.Int32(this, "window_closed", pointer);
        pointer += 4;
    }

    Debugger.State = function(pointer, obj) {
        if (pointer.constructor == Debugger) {
            pointer = z80e.Module["_openti_new_state"](pointer.pointer, new_wrapped++);
            wrapped[new_wrapped - 1] = obj;
        } else {
            throw "Call this constructor with a Debugger!";
        }

        this.pointer = pointer;
        pointer += 12;

        Wrap.Pointer(this, "_interfaceState", pointer, InterfaceState);
        this._interfaceState.print_string = ids.print_string;
        this._interfaceState.new_state = ids.new_state;
        this._interfaceState.window_closed = ids.window_closed;

        this.interfaceState = wrapped[new_wrapped - 1];
        pointer += 4;
        
        Wrap.Pointer(this, "asic", pointer, require("../TI/ASIC"));
        pointer += 4;

        Wrap.Pointer(this, "debugger", pointer, Debugger);
        pointer += 12;

        Wrap.Int32(this, "log", pointer);
        pointer += 4;
    }

    Debugger.State.prototype.exec = function(command) {
        var stack = z80e.Module.Runtime.stackSave();
        var strpoint = allocate(intArrayFromString(command), 'i8', ALLOC_STACK);
        var ret = z80e.z80e.Module["_debugger_exec"](this.pointer, strpoint);
        z80e.Module.Runtime.stackRestore(stack);
        return ret;
    }

    Debugger.State.prototype.close = function() {
        z80e.Module["_openti_close_window"](this.pointer);
    }

    Debugger.Command = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated using a pointer!";
        }
        this.pointer = pointer;


        Object.defineProperty(this, "name", {
            get: (function() {
                return Pointer_stringify(z80e.Module.HEAPU32[this.pointer / 4]);
            }).bind(this)
        });
        pointer += 4;

        Wrap.Int32(this, "function", pointer);
        pointer += 4;

        Wrap.Int32(this, "priority", pointer);
        pointer += 4;

        Wrap.Int32(this, "state", pointer);
        pointer += 4;
    }

    Debugger.Command.sizeOf = function() {
        return 16;
    }

    return Debugger;
});
