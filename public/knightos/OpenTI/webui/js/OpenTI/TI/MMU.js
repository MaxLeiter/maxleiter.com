define(["require", "z80e", "../wrap", "../Debugger/HookInfo"], function(require, z80e, Wrap) {
    var MMU = function(pointer) {
        if (typeof pointer == "undefined") {
            throw "Either pass a pointer or a device type!";
        } else if (pointer < 6) {
            pointer = z80e.Module["_ti_mmu_init"](pointer);
        }

        this.pointer = pointer;

        this.settings = {};
        Wrap.UInt16(this.settings, "ram_pages", pointer);
        pointer += 2;
        Wrap.UInt16(this.settings, "flash_pages", pointer);
        pointer += 2;

        this.banks = [];
        for (var i = 0; i < 4; i++) {
            var bank = {};
            Wrap.UInt8(bank, "page", pointer);
            pointer += 4;
            Wrap.Int32(bank, "flash", pointer);
            pointer += 4;
            this.banks.push(bank);
        }

        this._ramPointer = pointer / 4;
        pointer += 4;

        Object.defineProperty(this, "ram", {
            get: (function() {
                return new Uint8Array(z80e.Module.HEAPU8, z80e.Module.HEAPU32[this._ramPointer], this.settings.ram_pages * 0x4000);
            }).bind(this)
        });

        this._flashPointer = pointer / 4;
        pointer += 4;

        Object.defineProperty(this, "flash", {
            get: (function() {
                return new Uint8Array(z80e.Module.HEAPU8, z80e.Module.HEAPU32[this._flashPointer], this.settings.flash_pages * 0x4000);
            }).bind(this)
        });
        
        Wrap.Int32(this, "flash_unlocked", pointer);
        pointer += 4;
        
        Wrap.Pointer(this, "hook", pointer, require("../Debugger/HookInfo"));
    }
    
    MMU.prototype.readByte = function(address) {
        return z80e.Module["_ti_read_byte"](this.pointer, address);
    }
    
    MMU.prototype.writeByte = function(address, value) {
        return z80e.Module["_ti_write_byte"](this.pointer, address, value);
    }
    
    MMU.prototype.forceWriteByte = function(address, value) {
        return z80e.Module["_mmu_force_write"](this.pointer, address, value);
    }
    
    MMU.prototype.free = function() {
        z80e.Module["_ti_mmu_free"](this.pointer);
    }
    
    return MMU;
});
