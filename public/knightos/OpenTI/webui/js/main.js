var OpenTI;

var openti_log = {
    print: function(str) {
        $("#log pre").text($("#log pre").text() + str);
    },
    clear: function() {
        $("#log pre").text("");
    }
};

var openti_debug = {
    print: function(str) {
        $("#debugger pre").text($("#debugger pre").text() + str);
    },
    clear: function() {
        $("#debugger pre").text("");
    }
};
var update_lcd;
function do_update_lcd(lcd) {
    update_lcd = lcd;
}

var lcd_data = [];
var lcd_colors = [[0x99, 0xB1, 0x99], [0x00, 0x00, 0x00]];
function gen_pixeldata() {
    for (var i = 0; i <= 0xff; i++) {
        var arr = new Uint8Array(8 * 4 * 4);
        for (var j = 0; j < 8; j++) {
            var set = (i & (1 << j)) ? 1 : 0;
            for (var k = 0; k < 4; k++) {
                var view = (j * 16) + k * 4;
                arr[view + 0] = lcd_colors[set][0];
                arr[view + 1] = lcd_colors[set][1];
                arr[view + 2] = lcd_colors[set][2];
                arr[view + 3] = 0xFF;
            }
        }
        lcd_data.push(arr);
    }
}
gen_pixeldata();

function print_lcd(lcd) {
    var data = lcd_ctx.getImageData(0, 0, 384, 256);
    var ram = lcd.ram;
    for (var x = 0; x < (120 * 64) / 8; x++) {
        var octet = x % 15;
        if (octet > 11) {
            continue;
        }
        var line = Math.floor(x / 15) * 4;
        var tocopy = lcd_data[ram[x]];
        data.data.set(tocopy, ((line++) * 12 + octet) * (4 * 8 * 4));
        data.data.set(tocopy, ((line++) * 12 + octet) * (4 * 8 * 4));
        data.data.set(tocopy, ((line++) * 12 + octet) * (4 * 8 * 4));
        data.data.set(tocopy, ((line++) * 12 + octet) * (4 * 8 * 4));
    }
    lcd_ctx.putImageData(data, 0, 0);
    update_lcd = null;
}

var lcd_ctx;
$(function() {
    lcd_ctx = document.getElementById("screen").getContext("2d");
    lcd_ctx.fillStyle = "#99B199";
    lcd_ctx.fillRect(0, 0, 384, 256);
    $(".panel").each(function(a) {
        if ($(a).hasClass("collapsed")) {
            $(".panel-title", a).append($('<span class="glyphicon glyphicon-chevron-down pull-right"></span>'));
        } else {
            $(".panel-title", a).append($('<span class="glyphicon glyphicon-chevron-up pull-right"></span>'));
        }
        $(".panel-heading", a).click(function() {
            $("span", this).toggleClass("glyphicon-chevron-up").toggleClass("glyphicon-chevron-down");
            $(this).parent().toggleClass("collapsed");
        });
    });

    $("#debugger input").keypress(function (e) {
        if (e.which == 13) {
            var old_val = $(this).val();
            exec(old_val);
            $(this).val("");
            if (old_val.length != 0) {
                $(this).attr("placeholder", old_val);
            }
            return false;
        }
    });
});

var exec;

require(["OpenTI/OpenTI"], function(oti) {
    OpenTI = oti;

    var asic = new oti.TI.ASIC(oti.TI.DeviceType.TI84pSE);
    asic.debugger = new oti.Debugger.Debugger(asic);

    OpenTI.current_asic = asic;

    asic.hook.addLCDUpdate(do_update_lcd);

    var prev_command = "";
    exec = function(str) {
        openti_debug.print("z80e > "+str+"\n");

        if (str.length == 0) {
            str = prev_command;
        }
        prev_command = str;

        var state = new oti.Debugger.Debugger.State(asic.debugger,
            {
                print: function(str) { openti_debug.print(str); },
                new_state: function() { return this; },
                closed: function() { }
            });

        state.exec(str);
    }

    openti_log.print("OpenTI loaded!\n");
    var oReq = new XMLHttpRequest();
    oReq.open("GET", "http://builds.knightos.org/latest-TI84pSE.rom", true);
    oReq.responseType = "arraybuffer";

    oReq.onload = function (oEvent) {
        var arrayBuffer = oReq.response; // Note: not oReq.responseText
        if (arrayBuffer) {
            var byteArray = new Uint8Array(arrayBuffer);
            var pointer = allocate(byteArray, 'i8', ALLOC_STACK);
            Module.HEAPU32[asic.mmu._flashPointer] = pointer;

            openti_log.print("KnightOS "+Pointer_stringify(pointer + 0x64)+" loaded!\n");

            setTimeout(function tick() {
                if (!asic.stopped || asic.cpu.interrupt) {
                    asic.runloop.tick(asic.clock_rate / 60);
                }
                if (update_lcd) {
                    print_lcd(update_lcd);
                }
                setTimeout(tick, 1000 / 60);
            }, 1000 / 60);
        }
    }

    oReq.send(null);
});
