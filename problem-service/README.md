# Problem Service

RESTful API for managing coding problems. Supports CRUD operations with markdown sanitization for problem descriptions.

## Features

- Full CRUD for problems
- Markdown → HTML → sanitize → markdown pipeline for XSS prevention
- MongoDB storage with Mongoose ODM
- Winston logging (console, file, MongoDB)

## Running

```bash
npm install
npm run dev
```
