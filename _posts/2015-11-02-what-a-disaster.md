---
title: what a disaster (statically linking go binaries for 32 bit alpine linux)
layout: post
---

in progress...

http://alpinelinux.org/downloads/
http://wiki.alpinelinux.org/wiki/Install_to_disk
setup-alpine

mount -t iso9660 /dev/cdrom /media/

echo "/media/apks" >> /etc/apk/repositories


http://wiki.alpinelinux.org/wiki/Connecting_to_a_wireless_access_point

go binary dist is hardcoded to use gcc...
alpine uses http://www.musl-libc.org/
go compiler doesnt work
go binaries compiled for linux dont work

env GOOS=linux GOARCH=386 go build -a .

Trace/breakpoint trap

echo 1 > /proc/sys/kernel/modify_ldt

https://github.com/golang/go/search?utf8=%E2%9C%93&q=modify_ldt


    When linking against the system libraries, we use its pthread_create... To insulate the rest of the tool chain from this ugliness, 8l rewrites 0(TLS) into -4(GS) for us.

    // call modify_ldt
    MOVL	$1, BX	// func = 1 (write)
    MOVL	AX, CX	// user_desc
    MOVL	$16, DX	// sizeof(user_desc)
    MOVL	$123, AX	// syscall - modify_ldt
    INVOKE_SYSINFO
