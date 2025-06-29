# WMS Tutorial App - Backend

This is the backend portion of the WMS Tutorial Application, using Netlify Functions (serverless) to provide API endpoints for the frontend.

## Features

- User authentication and authorization
- MongoDB integration for data persistence
- API endpoints for user settings, presentations, and processes
- Test scripts for verifying functionality

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- MongoDB Atlas account (or local MongoDB instance)

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.development` file with the following content:
   ```
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   DEBUG_DB_CONNECTION=true
   DISABLE_DEV_FALLBACK=false
   ```

### Running the Backend Server

Start the Netlify Functions development server:

```
npm start
```

The server will be available at http://localhost:8889.

### Testing

Run the authentication test:

```
npm run test:auth
```

Run the database connection test:

```
npm run test:db
```

Run the presentations API test:

```
npm run test:presentations
```

Run the processes API test:

```
npm run test:processes
```

## API Endpoints

### Authentication
- `POST /api/login` - Authenticate user and get token
- `GET /api/authenticate` - Verify token and get user info

### User Settings
- `GET /api/get-user-settings` - Get user settings
- `POST /api/save-user-settings` - Save user settings

### Presentations
- `GET /api/getPresentations` - Get user presentations
- `POST /api/savePresentations` - Save user presentations

### Processes
- `GET /api/getProcesses` - Get user processes
- `POST /api/saveProcesses` - Save user processes

### Testing
- `GET /api/test-db-connection` - Test MongoDB connection
- `GET /api/test-mongodb-connection` - Detailed MongoDB connection test

## Default Users

The system supports development fallback users:

- Admin: username `admin`, password `password`
- User: username `user`, password `password`
- Supervisor: username `supervisor`, password `password`

## License

This project is proprietary and confidential.
