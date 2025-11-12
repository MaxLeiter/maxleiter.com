define(["require", "z80e", "../wrap", "./Registers", "../Debugger/HookInfo"], function(require, z80e, Wrap, Registers) {
    CPU = function(pointer) {
        if (!pointer) {
            pointer = z80e.Module["_cpu_init"]();
        }
        this.pointer = pointer;

        this.devices = [];
        for (var i = 0; i < 0x100; i++) {
            this.devices.push(new CPU.IODevice(pointer));
            pointer += CPU.IODevice.sizeOf();
        }
        this.registers = new Registers(pointer);
        pointer += Registers.sizeOf();

        Wrap.UInt8(this, "IFF1", pointer, 1, 0);
        Wrap.UInt8(this, "IFF2", pointer, 2, 1);
        Wrap.UInt8(this, "int_mode", pointer, 12, 2);
        Wrap.UInt8(this, "halted", pointer, 32, 5);
        pointer++;

        Wrap.UInt8(this, "bus", pointer++);

        Wrap.UInt16(this, "prefix", pointer);
        pointer += 2;

        Wrap.UInt32(this, "memory", pointer);
        pointer += 4;

        //Wrap.Function(this, "read_byte", pointer);
        pointer += 4;
        //Wrap.Function(this, "write_byte", pointer);
        pointer += 4;

        Wrap.Int32(this, "interrupt", pointer);
        pointer += 4;

        Wrap.Pointer(this, "hook", pointer, require("../Debugger/HookInfo"));
    }

    CPU.prototype.execute = function(cycles) {
        if (!cycles) {
            cycles = -1;
        }
        return z80e.Module["_cpu_execute"](this.pointer, cycles);
    }

    CPU.prototype.free = function() {
        z80e.Module["_cpu_free"](this.pointer);
    }

    CPU.sizeOf = function() {
        return 100 * CPU.IODevice.sizeOf() + 20 + HookInfo.sizeOf();
    }

    CPU.IODevice = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }

        this.pointer = pointer;
        Wrap.UInt32(this, "device", pointer);
        // TODO: function wrapping
    }

    CPU.IODevice.sizeOf = function() {
        return 3 * 4;
    }

    return CPU;
});
