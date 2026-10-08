#!/bin/sh
# Size the V8 old-space heap from the container's actual memory limit.
#
# WHY THIS EXISTS
# ---------------
# Node does NOT use the whole container. It sizes its old-space heap to roughly
# HALF the cgroup limit, so a 2Gi container gave V8 only ~1005MB — and a large
# catalogue blew straight through that:
#
#   FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
#
# That kills the process with exit 139, which looks like a segfault, NOT like an
# OOM. The container is never OOMKilled (the container had memory to spare — V8
# didn't), so `kubectl describe` shows Error/139 and nothing about memory. The pod
# then restarts, loses its warm caches, and every request pays a full cold render
# until it OOMs again. It reads as "slow cold starts" rather than a crash loop.
#
# The build stage already set --max-old-space-size=4096; the RUNTIME stage did not,
# which is exactly the gap this closes.
#
# WHY NOT JUST HARDCODE 4096
# --------------------------
# A fixed 4096 is wrong in both directions: on a 2Gi container it lets V8 grow past
# the cgroup and get the whole pod OOMKilled (worse — no JS stack trace at all), and
# on an 8Gi container it wastes most of the memory. Deriving it keeps one image
# correct at every size.
#
# We take ~75% of the limit, leaving headroom for the non-heap side of the process
# (buffers, sharp/image work, the Next.js server itself), and clamp to [512, 8192].
# An explicitly-provided NODE_OPTIONS always wins so an operator can override.

set -e

if [ -z "${NODE_OPTIONS##*max-old-space-size*}" ] && [ -n "$NODE_OPTIONS" ]; then
	echo "[entrypoint] NODE_OPTIONS already pins a heap size; leaving it alone: $NODE_OPTIONS"
else
	LIMIT_BYTES=""
	# cgroup v2, then v1.
	if [ -r /sys/fs/cgroup/memory.max ]; then
		LIMIT_BYTES=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || echo "")
	elif [ -r /sys/fs/cgroup/memory/memory.limit_in_bytes ]; then
		LIMIT_BYTES=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo "")
	fi

	# "max" (no limit) or an absurd v1 sentinel means uncapped — let Node decide.
	case "$LIMIT_BYTES" in
		'' | max | *[!0-9]*) LIMIT_BYTES="" ;;
	esac
	if [ -n "$LIMIT_BYTES" ] && [ "$LIMIT_BYTES" -gt 68719476736 ]; then
		LIMIT_BYTES=""
	fi

	if [ -n "$LIMIT_BYTES" ]; then
		HEAP_MB=$((LIMIT_BYTES / 1024 / 1024 * 75 / 100))
		[ "$HEAP_MB" -lt 512 ] && HEAP_MB=512
		[ "$HEAP_MB" -gt 8192 ] && HEAP_MB=8192
		NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=$HEAP_MB"
		export NODE_OPTIONS
		echo "[entrypoint] container limit $((LIMIT_BYTES / 1024 / 1024))Mi -> --max-old-space-size=$HEAP_MB"
	else
		echo "[entrypoint] no container memory limit detected; leaving Node defaults"
	fi
fi

exec "$@"
