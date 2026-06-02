# Security Policy

## Supported Versions

This project is currently in **beta** development. We are committed to addressing security vulnerabilities in actively maintained versions.

| Version | Status | Supported |
| ------- | ------ | --------- |
| Beta (main) | Active Development | :white_check_mark: |
| v0.x.x | Beta Release | :white_check_mark: |


**Note:** As this project is in beta, security updates and patches may be released with new minor versions. We recommend users always keep their extension updated to the latest version.

## Reporting a Vulnerability

We take security seriously and appreciate responsible disclosure of any vulnerabilities found in markdown-chrome-extension.

### How to Report

**Do not create a public GitHub issue for security vulnerabilities.**

Instead, please report security vulnerabilities by:

1. **Email:** Send a detailed report to viny.rn.dev@gmail.com with the subject line: `Security Vulnerability Report: markdown-chrome-extension`
2. **GitHub Security Advisory:** Use GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/privately-reporting-a-security-vulnerability) feature

### What to Include

Please provide as much detail as possible:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity
- Any suggested fixes (if available)
- Your contact information for follow-up

### Response Timeline

We aim to:
- **Acknowledge** your report within 48 hours
- **Provide an initial assessment** within 5-7 business days
- **Release a patch** within 14 days for critical vulnerabilities (if feasible)
- **Keep you informed** throughout the remediation process

### Vulnerability Assessment Criteria

We will evaluate the severity based on:
- **Ease of exploitation** (how difficult is it to trigger the vulnerability?)
- **Scope of impact** (who and what is affected?)
- **Data sensitivity** (does it involve user data, credentials, or personal information?)
- **Attack vector** (network-based, local, requires user interaction?)

### Accepted vs. Declined Reports

**We accept and will address:**
- Authentication/authorization flaws
- Data exposure vulnerabilities
- Cross-site scripting (XSS) issues
- Injection attacks
- Cryptographic weaknesses
- Extension permission escalation

**Out of scope:**
- Issues in dependencies or third-party libraries (please report to their maintainers)
- Vulnerabilities requiring physical access
- Issues in user-controlled environments
- Social engineering attacks
- Theoretical vulnerabilities with no demonstrated impact

## Security Best Practices

Users of markdown-chrome-extension should:

1. **Keep your extension updated** – Check for updates regularly in Chrome Web Store
2. **Grant minimal permissions** – Only authorize permissions that are necessary
3. **Review permissions** – Understand what access this extension has to your browsing
4. **Report suspicious behavior** – If you notice unusual activity, report it immediately
5. **Use a password manager** – Never store credentials in unencrypted form

## Development Security

Contributors should follow these guidelines:

- Never commit sensitive credentials or API keys
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Follow the principle of least privilege
- Keep dependencies up-to-date
- Review security advisories for used libraries

## Contact

For security-related inquiries, please reach out to viny.rn.dev@gmail.com

For general questions or issues, please use the [GitHub Issues](https://github.com/Viny-Rn/markdown-chrome-extension/issues) page.

---

**Last Updated:** - 2026/06/01
**Version:** 1.0
