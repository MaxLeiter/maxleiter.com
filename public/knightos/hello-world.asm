#include "kernel.inc"
    .db "KEXC"
    .db KEXC_ENTRY_POINT
    .dw start
    .db KEXC_STACK_SIZE
    .dw 20
    .db KEXC_NAME
    .dw name
    .db KEXC_HEADER_END
name:
    .db "hello", 0
start:
    pcall(getLcdLock)
    pcall(getKeypadLock)
    pcall(allocScreenBuffer)
    pcall(clearBuffer)

    kld(hl, message)
    ld de, 0
    pcall(drawStr)

.loop:
    pcall(fastCopy)
    pcall(flushKeys)
    pcall(waitKey)

    cp kMODE
    jr nz, .loop

    ret

message:
    .db "Hello, KnightOS!", 0
