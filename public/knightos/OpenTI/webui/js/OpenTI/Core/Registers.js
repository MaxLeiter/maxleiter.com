define(["../wrap"], function(Wrap) {
    var Registers = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }
        this.pointer = pointer;

        Wrap.UInt16(this, "AF", pointer);
        Wrap.UInt8(this, "F", pointer);
        Wrap.UInt8(this, "A", pointer + 1);

        this.flags = {};
        Wrap.UInt8(this.flags, "C",  pointer, 128, 7);
        Wrap.UInt8(this.flags, "N",  pointer,  64, 6);
        Wrap.UInt8(this.flags, "PV", pointer,  32, 5);
        Wrap.UInt8(this.flags, "3",  pointer,  16, 4);
        Wrap.UInt8(this.flags, "H",  pointer,   8, 3);
        Wrap.UInt8(this.flags, "5",  pointer,   4, 2);
        Wrap.UInt8(this.flags, "Z",  pointer,   2, 1);
        Wrap.UInt8(this.flags, "S",  pointer,   1, 0);
        pointer += 2;

        Wrap.UInt16(this, "BC", pointer);
        Wrap.UInt8(this, "C", pointer);
        Wrap.UInt8(this, "B", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "DE", pointer);
        Wrap.UInt8(this, "E", pointer);
        Wrap.UInt8(this, "D", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "HL", pointer);
        Wrap.UInt8(this, "L", pointer);
        Wrap.UInt8(this, "H", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "_AF", pointer);
        Wrap.UInt16(this, "_BC", pointer + 2);
        Wrap.UInt16(this, "_DE", pointer + 4);
        Wrap.UInt16(this, "_HL", pointer + 6);
        pointer += 8;

        Wrap.UInt16(this, "PC", pointer);
        Wrap.UInt16(this, "SP", pointer + 2);
        pointer += 4;

        Wrap.UInt16(this, "IX", pointer);
        Wrap.UInt8(this, "IXL", pointer);
        Wrap.UInt8(this, "IXH", pointer + 1);
        pointer += 2;

        Wrap.UInt16(this, "IY", pointer);
        Wrap.UInt8(this, "IYL", pointer);
        Wrap.UInt8(this, "IYH", pointer + 1);
        pointer += 2;

        Wrap.UInt8(this, "I", pointer++);
        Wrap.UInt8(this, "R", pointer++);

        // 2 dummy bytes needed for 4-byte alignment
    }

    Registers.sizeOf = function() {
        return 26;
    }

    return Registers;
});
