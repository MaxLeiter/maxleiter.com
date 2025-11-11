define(["require", "./T6A04", "./Keyboard"], function(require) {
    var Hardware = function(cpu) {
        var LCD = require("./T6A04");
        var Keyboard = require("./Keyboard");
        return {
            LCD: new LCD(cpu.devices[0x10].device),
            Keyboard: new Keyboard(cpu.devices[0x1].device)
        };
    }

    return Hardware;
});
