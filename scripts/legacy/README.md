# Legacy Development Files

This directory contains development-only scripts and debug files that have been moved out of the runtime bundle.

## Files in this directory:

- `auth-debug.js` - Authentication debugging utilities (moved from root)
- `test-webhook-setup.js` - Webhook testing script (moved from root)

## Note:

These files are for development and testing purposes only and should not be included in production builds. They have been moved here to keep the root directory clean and prevent them from being accidentally included in the runtime bundle.

## Usage:

To use any of these scripts during development, run them from this directory:

```bash
cd scripts/legacy
node auth-debug.js
# or
node test-webhook-setup.js
``` 