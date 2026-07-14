// @typebot.io/react@0.10.6 ships a `types` field pointing at a .d.ts file that
// isn't actually included in the published npm tarball, so TypeScript can't
// resolve it. This shim declares the module loosely until upstream fixes it.
declare module "@typebot.io/react";
