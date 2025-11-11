define(["require", "z80e", "../TI/Hardware/T6A04"], function(require, z80e) {
    function hook_memory(ref, address, value) {
        return hook_memory.hooks[ref](address, value);
    }
    hook_memory.hooks = {}
    hook_memory.next_hook = 0;

    function hook_register(ref, register, value) {
        return hook_register.hooks[ref](register, value);
    }
    hook_register.hooks = {}
    hook_register.next_hook = 0;

    function hook_execute(ref, address) {
        hook_execute.hooks[ref](address);
    }
    hook_execute.hooks = {}
    hook_execute.next_hook = 0;

    function hook_lcd(ref, lcd) {
        return hook_lcd.hooks[ref](new (require("../TI/Hardware/T6A04"))(lcd));
    }
    hook_lcd.hooks = {}
    hook_lcd.next_hook = 0;

    var ids = {
        memory: z80e.Module.Runtime.addFunction(hook_memory),
        register: z80e.Module.Runtime.addFunction(hook_register),
        execute: z80e.Module.Runtime.addFunction(hook_execute),
        lcd: z80e.Module.Runtime.addFunction(hook_lcd),
    };

    var HookInfo = function(pointer) {
        if (!pointer) {
            throw "This object can only be instantiated with a memory region predefined!";
        }

        this.pointer = pointer;
    };

    HookInfo.sizeOf = function() {
        return -1;
    }

    HookInfo.prototype.addMemoryRead = function(start, end, hook_func) {
        hook_memory.hooks[hook_memory.next_hook] = hook_func;
        return z80e.Module["_hook_add_memory_read"](this.pointer, start, end, hook_memory.next_hook++, ids.memory);
    }

    HookInfo.prototype.addMemoryWrite = function(start, end, hook_func) {
        hook_memory.hooks[hook_memory.next_hook] = hook_func;
        return z80e.Module["_hook_add_memory_write"](this.pointer, start, end, hook_memory.next_hook++, ids.memory);
    }

    HookInfo.prototype.addRegisterRead = function(register, hook_func) {
        hook_register.hooks[hook_register.next_hook] = hook_func;
        return z80e.Module["_hook_add_register_read"](this.pointer, register,hook_register.next_hook++, ids.register);
    }

    HookInfo.prototype.addRegisterWrite = function(register, hook_func) {
        hook_register.hooks[hook_register.next_hook] = hook_func;
        return z80e.Module["_hook_add_register_write"](this.pointer, register, hook_register.next_hook++, ids.register);
    }

    HookInfo.prototype.addBeforeExecution = function(hook_func) {
        hook_exec.hooks[hook_exec.next_hook] = hook_func;
        return z80e.Module["_hook_add_before_execution"](this.pointer, hook_exec.next_hook++, ids.exec);
    }

    HookInfo.prototype.addAfterExecution = function(hook_func) {
        hook_exec.hooks[hook_exec.next_hook] = hook_func;
        return z80e.Module["_hook_add_after_execution"](this.pointer, hook_exec.next_hook++, ids.exec);
    }

    HookInfo.prototype.addLCDUpdate = function(hook_func) {
        hook_lcd.hooks[hook_lcd.next_hook] = hook_func;
        return z80e.Module["_hook_add_lcd_update"](this.pointer, hook_lcd.next_hook++, ids.lcd);
    }

    return HookInfo;
});
