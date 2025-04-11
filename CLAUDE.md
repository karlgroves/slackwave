# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- Build/Run: `npm start` or `npm run dev` (with hot reload)
- No lint or test commands currently configured

## Code Style Guidelines

- ES6+ JavaScript with CommonJS modules (require/module.exports)
- Dependencies: express, axios, dotenv
- Error handling: use try/catch blocks with async/await
- Logging: use console.log/error for debugging
- Follow existing code patterns for new features:
  - Use descriptive variable names (camelCase)
  - Use async/await for asynchronous operations
  - Proper error handling and logging
  - Keep response formatting consistent with existing patterns
  - Handle edge cases and user input validation

## Project Info

Slack Slash Command for WAVE by WebAIM - processes web accessibility checks via the WAVE API and returns results to Slack.