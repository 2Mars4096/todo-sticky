# Product build and test boundary

Run `npm ci` and `npm run check` from this plugin directory. No Diane checkout,
account, provider, network service or standalone-app dependency installation is needed.

- `host-contract/` contains declarations for the consumed `diane-plugin/1`
  surface, inspected at Dear Diane commit
  `914c98c5709a3510fa5e3adf6af0c3ed9e82d304`. These are a contract snapshot,
  not a published SDK implementation. The unused private panel context stays opaque.
- `test-host-sdk/` supplies React contexts and deliberately unavailable service
  operations for product tests. Tests must mock service results explicitly.
  Its record-input helper only constructs fixture data; it is not host authorization.
- Source tests cover product behavior against those explicit mocks. They do not
  establish live host, desktop, account, provider or deployment compatibility.
- The production build retains React, declared peers and SDK imports as external.
  The package gate rejects bundled host/adapter code and undeclared dependencies.
- The dist smoke renders the actual generated JavaScript without a global React.
  It catches compiler/runtime omissions that source-only JSX tests would miss.
- Neither declarations nor adapters are shipped in the npm artifact. Optional
  full-host integration is a separate check; no absolute checkout path is required.

For an optional integration check, run
`npm run check:host -- /path/to/dear-diane/editor`. It typechecks the real host's
exports against these consumed declarations; it does not substitute the test
adapter or alter the host checkout. Source port tests remain in the distributable
package for the host's own integration suite; preview harnesses are excluded.
