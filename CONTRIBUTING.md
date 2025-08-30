# 🤝 Contributing to StreamHelper

Thank you for your interest in contributing to StreamHelper! This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Guidelines](#contribution-guidelines)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)
- [Feature Requests](#feature-requests)
- [Community](#community)

## 🎯 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. We are committed to providing a welcoming and inspiring community for all.

### Our Standards

- **Be respectful** and inclusive of all contributors
- **Be collaborative** and open to different viewpoints
- **Be constructive** in feedback and discussions
- **Be professional** in all interactions

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** and npm
- **Git** for version control
- **Chrome browser** for extension development
- **Basic knowledge** of Angular, Electron, and TypeScript

### First Steps

1. **Fork the repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/StreamHelper.git
   cd StreamHelper
   ```

2. **Set up upstream remote**
   ```bash
   git remote add upstream https://github.com/panoslin/StreamHelper.git
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🛠️ Development Setup

### Desktop Application

1. **Install dependencies**
   ```bash
   cd Client
   npm install
   ```

2. **Start development mode**
   ```bash
   npm run dev
   ```

3. **Build for production**
   ```bash
   npm run build
   ```

### Chrome Extension

1. **Load extension in Chrome**
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `Extension/` folder

2. **Make changes and reload**
   - Edit extension files
   - Click the reload button in `chrome://extensions/`

### Available Scripts

```bash
# Development
npm run dev          # Start development mode
npm run build        # Build for production
npm run start        # Start production build

# Testing
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier
```

## 📝 Contribution Guidelines

### What We're Looking For

- **Bug fixes** and improvements
- **New features** that align with project goals
- **Documentation** improvements
- **Performance** optimizations
- **UI/UX** enhancements
- **Testing** improvements

### What to Avoid

- **Breaking changes** without discussion
- **Large refactoring** without prior approval
- **Dependencies** that conflict with existing ones
- **Code** that doesn't follow our style guide

## 🎨 Code Style

### TypeScript/Angular

- **Strict mode**: Always use TypeScript strict mode
- **Interfaces**: Prefer interfaces over types for object shapes
- **Naming**: Use descriptive names, avoid abbreviations
- **Imports**: Group imports logically (Angular, third-party, local)

```typescript
// ✅ Good
import { Component, OnInit, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { DownloadService } from '../../services/download.service';

// ❌ Bad
import {Component, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {DownloadService} from '../../services/download.service';
```

### CSS/Styling

- **CSS Variables**: Use CSS custom properties for theming
- **BEM Methodology**: Follow BEM naming conventions
- **Responsive**: Ensure mobile-first responsive design
- **Accessibility**: Maintain proper contrast ratios

```css
/* ✅ Good */
.download-item {
  background-color: var(--app-surface);
  border: 1px solid var(--app-border);
}

.download-item__title {
  font-weight: 600;
  color: var(--app-text);
}

.download-item--completed {
  opacity: 0.7;
}

/* ❌ Bad */
.downloadItem {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
}
```

### Git Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
# ✅ Good
feat: add retry download functionality
fix: resolve WebSocket connection timeout issue
docs: update installation instructions
style: improve button hover effects
refactor: simplify download queue logic
test: add unit tests for download service

# ❌ Bad
added retry button
fixed bug
updated docs
```

## 🧪 Testing

### Test Structure

- **Unit Tests**: Test individual components and services
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test complete user workflows

### Writing Tests

```typescript
// ✅ Good test example
describe('DownloadService', () => {
  let service: DownloadService;
  let mockHttp: jasmine.SpyObj<HttpClient>;

  beforeEach(() => {
    mockHttp = jasmine.createSpyObj('HttpClient', ['get', 'post']);
    service = new DownloadService(mockHttp);
  });

  it('should create download item with correct properties', () => {
    const result = service.createDownload('test-url', 'test-name');
    
    expect(result.id).toBeDefined();
    expect(result.url).toBe('test-url');
    expect(result.name).toBe('test-name');
    expect(result.status).toBe('pending');
  });
});
```

### Running Tests

```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- --include="**/download.service.spec.ts"
```

## 🔄 Pull Request Process

### Before Submitting

1. **Ensure tests pass**
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

2. **Update documentation** if needed
3. **Add/update tests** for new functionality
4. **Check code coverage** maintains or improves

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Address feedback** and make requested changes
4. **Maintainer approval** required for merge

## 🐛 Reporting Issues

### Bug Report Template

```markdown
## Bug Description
Clear description of the issue

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 14.0]
- Node.js: [e.g., 18.17.0]
- Electron: [e.g., 28.0.0]
- Angular: [e.g., 17.0.0]

## Additional Context
Screenshots, logs, or other relevant information
```

### Before Reporting

- **Search existing issues** to avoid duplicates
- **Check documentation** for known solutions
- **Test on latest version** to confirm issue persists
- **Provide minimal reproduction** steps

## 💡 Feature Requests

### Feature Request Template

```markdown
## Feature Description
Clear description of the requested feature

## Use Case
Why this feature would be useful

## Proposed Solution
How you envision this feature working

## Alternatives Considered
Other approaches you've considered

## Additional Context
Any other relevant information
```

### Feature Request Guidelines

- **Align with project goals** and scope
- **Provide clear use cases** and benefits
- **Consider implementation complexity**
- **Be open to alternative approaches**

## 🌟 Community

### Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Code Reviews**: Learn from feedback on your PRs
- **Documentation**: Read and improve project docs

### Recognition

Contributors are recognized in several ways:

- **GitHub Contributors** page
- **Release notes** for significant contributions
- **Project documentation** acknowledgments
- **Community spotlight** for outstanding work

### Mentorship

New contributors can:

- **Ask questions** in discussions
- **Request help** with complex issues
- **Pair program** with experienced contributors
- **Get feedback** on early drafts

## 📚 Resources

### Learning Materials

- [Angular Documentation](https://angular.io/docs)
- [Electron Documentation](https://www.electronjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Chrome Extension Development](https://developer.chrome.com/docs/extensions/)

### Development Tools

- **VS Code**: Recommended IDE with Angular extensions
- **Chrome DevTools**: For extension debugging
- **Angular CLI**: For project scaffolding and building
- **ESLint + Prettier**: For code quality and formatting

## 🎉 Thank You!

Your contributions make StreamHelper better for everyone. Whether you're:

- **Fixing bugs** and improving stability
- **Adding features** that users need
- **Improving documentation** for clarity
- **Helping other contributors** with questions

Every contribution matters and helps build a better tool for the community!

---

**Questions?** Feel free to open a discussion or reach out to the maintainers. We're here to help you succeed! 🚀
