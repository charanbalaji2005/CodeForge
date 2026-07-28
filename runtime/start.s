# start.s - MiniCPP runtime, written entirely in hand-assembled x86-64.
#
# This is intentionally libc-free: the compiler links only against this
# runtime and the kernel via raw syscalls, so a MiniCPP program's
# executable has no external shared-library dependencies at all.
#
# Provides:
#   _start           - process entry point; calls main(), then exits with
#                       its return value (masked to a byte, per POSIX).
#   __mcpc_alloc      - bump allocator for `new` (extends the heap via the
#                       brk syscall; never frees -- adequate for a first
#                       codegen milestone, not for long-running programs).
#   print_int  - writes a signed decimal integer to stdout.
#   print_char - writes a single byte to stdout.
#   print_str  - writes a NUL-terminated string to stdout.

    .section .bss
    .align 8
heap_ptr:
    .zero 8
print_buf:
    .zero 32

    .text
    .globl _start
_start:
    call main
    mov  %rax, %rdi
    and  $0xff, %rdi
    mov  $60, %rax          # sys_exit
    syscall

    .globl __mcpc_alloc
# __mcpc_alloc(size: %rdi) -> pointer in %rax
__mcpc_alloc:
    mov  heap_ptr(%rip), %rax
    test %rax, %rax
    jnz  have_base
    # First call: discover the current break with brk(0).
    push %rdi                 # save requested size across the syscall
    xor  %rdi, %rdi
    mov  $12, %rax            # sys_brk
    syscall
    mov  %rax, heap_ptr(%rip)
    pop  %rdi
have_base:
    mov  heap_ptr(%rip), %rax # %rax = allocation start (this call's return value)
    mov  %rax, %rsi           # keep a copy of the start across the syscall
    add  %rdi, %rax           # %rax = requested new break = start + size
    mov  %rax, %rdi
    push %rsi
    mov  $12, %rax             # sys_brk
    syscall
    mov  %rax, heap_ptr(%rip)  # advance the bump pointer to the new break
    pop  %rax                   # return the allocation start
    ret

    .globl print_char
# print_char(c: %rdi)
print_char:
    push %rdi
    mov  %rsp, %rsi          # pointer to the byte on the stack
    mov  $1, %rax            # sys_write
    mov  $1, %rdi            # fd 1
    mov  $1, %rdx            # count
    syscall
    pop  %rdi
    ret

    .globl print_str
# print_str(s: %rdi)
print_str:
    mov  %rdi, %rsi           # buffer
    xor  %rdx, %rdx           # length accumulator
strlen_loop:
    cmpb $0, (%rsi, %rdx)
    je   strlen_done
    inc  %rdx
    jmp  strlen_loop
strlen_done:
    mov  $1, %rax             # sys_write
    mov  $1, %rdi              # fd 1
    syscall
    ret

    .globl print_int
# print_int(v: %rdi)
print_int:
    lea  print_buf(%rip), %rsi
    add  $31, %rsi
    movb $0, (%rsi)
    mov  %rdi, %rax
    mov  $0, %r8               # negative flag
    test %rax, %rax
    jns  pi_conv
    mov  $1, %r8
    neg  %rax
pi_conv:
    mov  $10, %rcx
pi_loop:
    xor  %rdx, %rdx
    div  %rcx
    add  $'0', %dl
    dec  %rsi
    mov  %dl, (%rsi)
    test %rax, %rax
    jnz  pi_loop
    test %r8, %r8
    jz   pi_sign_done
    dec  %rsi
    movb $'-', (%rsi)
pi_sign_done:
    lea  print_buf(%rip), %rdx
    add  $31, %rdx
    sub  %rsi, %rdx             # %rdx = length = end - start
    mov  $1, %rax                # sys_write
    mov  $1, %rdi                 # fd 1
    # %rsi already holds the buffer start, %rdx the length.
    syscall
    ret
