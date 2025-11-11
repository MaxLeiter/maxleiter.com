define(function(require) {
    return {
        Core: {
            CPU: require("./Core/CPU"),
            Registers: require("./Core/Registers"),
        },
        Debugger: {
            HookInfo: require("./Debugger/HookInfo"),
            Debugger: require("./Debugger/Debugger"),
        },
        TI: {
            ASIC: require("./TI/ASIC"),
            DeviceType: require("./TI/DeviceType"),
            MMU: require("./TI/MMU"),
            Hardware: require("./TI/Hardware/Hardware")
        },
        Runloop: require("./Runloop")
    };
});
