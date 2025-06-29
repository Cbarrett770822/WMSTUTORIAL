# WMS Tutorial App - Frontend

This is the frontend portion of the WMS Tutorial Application, a React-based web application for warehouse management system tutorials and demonstrations.

## Features

- User authentication and authorization
- Admin panel for user management
- Process management dashboard
- Presentation viewer and editor
- Settings management with server synchronization
- Responsive UI using Material-UI components

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env.development` file with the following content:
   ```
   REACT_APP_DEV_MODE=true
   ```

### Running the Application

Start the development server:

```
npm start
```

The application will be available at http://localhost:3001.

### Building for Production

```
npm run build
```

## Backend Connection

This frontend is designed to work with the WMS Tutorial App Backend. By default, it expects the backend to be running at http://localhost:8889.

You can modify the proxy setting in `package.json` if your backend is running on a different port or host.

## Authentication

The application uses a token-based authentication system. For development purposes, you can use the following credentials:

- Username: admin
- Password: password

## License

This project is proprietary and confidential.
