# Security Policy

## Reporting a vulnerability

Please do **not** open a public GitHub issue for security vulnerabilities.

Use GitHub's [private vulnerability reporting](https://github.com/panlatent/welcome-screen/security/advisories/new)
to submit a report. Include a description of the issue, steps to reproduce, and the
affected version if known.

You can expect an initial response within 7 days. Once a fix is released, the
advisory will be published with credit to the reporter (unless anonymity is
requested).

## Scope

WelcomeScreen is designed to run on trusted LANs. Of particular interest:

- The embedded HTTP server (`src-tauri/src/server.rs`) — auth middleware, upload
  handling, static file serving
- Anything that could allow unauthenticated access to the control API
- Path traversal or file-write primitives

## Known limitations

- Traffic between the phone and the screen is plain HTTP on the local network; the
  connection token protects against unauthorized use but not against someone
  sniffing the same network segment
- The connection token is carried in the URL query string; it may appear in browser
  history on the phone (mitigation: use the in-app token reset)
