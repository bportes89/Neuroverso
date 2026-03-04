# Contribution Guidelines

Welcome to the Neuroverso repository! We greatly appreciate your interest in contributing to our project. Please follow these guidelines to ensure a smooth process for everyone involved.

## Code of Conduct
All contributors are expected to adhere to our [Code of Conduct](link-to-code-of-conduct). Be respectful and considerate to all community members.

## Setup Instructions
1. Clone the repository:
   ```
   git clone https://github.com/bportes89/Neuroverso.git
   cd Neuroverso
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm start
   ```

## Branch Naming Conventions
- Use `feature/` for new features.
- Use `bugfix/` for bug fixes.
- Use `hotfix/` for urgent fixes.
- Use lowercase letters and hyphens to separate words.

## Semantic Commit Guidelines
- Use the format: `type(scope): subject`
  - **Types:** feat, fix, docs, style, refactor, perf, test, chore
  - **Scopes:** optional, e.g., component name
- Example: `feat(login): add login functionality`

## Pull Request Process
1. Ensure your code follows the code style guidelines.
2. Update tests to ensure coverage of new code.
3. Submit a Pull Request (PR) to the main branch.
4. PR should have a clear title and description.

## Testing Requirements
- Write unit and integration tests for new features.
- Run tests locally before submitting a PR using:
  ```
  npm test
  ```

## Code Style
- Follow the [JavaScript Style Guide](link-to-style-guide).
- Ensure code is formatted using Prettier.

## Security Checklist
- Ensure to sanitize user input to prevent XSS.
- Validate and sanitize all data being sent to external services.

## Review Process
- All PRs shall be reviewed by at least two members of the team.
- Address any comments and updates suggested by the reviewers.
- Once approved, the PR will be merged into the main branch.

Thank you for contributing!