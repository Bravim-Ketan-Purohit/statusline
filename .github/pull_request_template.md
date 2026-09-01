## What this changes

<!-- One or two sentences. -->

## Checks

- [ ] `pnpm verify` passes (build + tests + the perf gate)
- [ ] If this touches the render path, `pnpm bench` render cost is still under 75 ms
- [ ] If this adds a tile, it declares a tier and appears in `statusline tiles`
- [ ] No network call was added to the render path
