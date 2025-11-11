define(["z80e"], function(z80e) {
    var Keyboard = function(pointer) {
        if (!pointer) {
            throw "This object has to be instantiated with a pointer!";
        }
        this.pointer = pointer;
    }

    Keyboard.prototype.press = function(code) {
        z80e.Module["_depress_key"](this.pointer, code);
    }

    Keyboard.prototype.release = function(code) {
        z80e.Module["_release_key"](this.pointer, code);
    }

    return Keyboard;
});
