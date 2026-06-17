# Contributing

Contributions are welcome, especially updates to error patterns as Cloudflare may change D1 error formats without notice.

## Development

```bash
npm install
npm run build
npm test
```

To investigate actual D1 error messages using a local Miniflare instance:

```bash
npm run test:d1
```

## Pull Requests

- Add or update tests for any parser changes
- If you discovered a new D1 error format, include the raw `error.message` in the PR description
- Keep the scope small — one error pattern per PR is ideal

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](./LICENSE).
