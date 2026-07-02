#!/usr/bin/env sh
# Helper script to raise file descriptor limit and start Next.js dev server.
# On macOS, `ulimit -n` increases the max open files to avoid Watchpack EMFILE errors.

ulimit -n 10240
exec next dev
