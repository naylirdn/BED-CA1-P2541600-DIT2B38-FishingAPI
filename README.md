# Fishing Game API

## Description

The Fishing Game API is a RESTful API built with Express.js, libSQL and Drizzle ORM. It allows users to create accounts, catch fish from different fishing spots, store fish in their inventory, sell fish to earn coins, and manage their user account through CRUD operations.

## Technologies Used

- Express.js
- libSQL
- Drizzle ORM
- Swagger UI
- dotenv
- CORS
- Nodemon

## Setup

1. Install dependencies.

```bash
npm install
```

2. Create the database.

```bash
npm run db
```

3. Start the server.

```bash
npm run dev
```

The server will run on:

```
http://localhost:3000
```

## API Documentation

Swagger documentation is available at:

```
http://localhost:3000/api-docs
```

## Features

### User Management
- Create a new user
- Retrieve all users
- Retrieve a user by ID
- Search users by username
- Update a username
- Delete a user

### Fishing System
- View all available fish
- Catch fish from different fishing spots
- Automatically add caught fish to inventory
- Increase inventory quantity when catching duplicate fish
- Sell fish from inventory
- Earn coins after selling fish
- View a user's inventory

## API Endpoints

### Users

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/users` | Create a new user |
| GET | `/users` | Retrieve all users |
| GET | `/users?username=name` | Search user by username |
| GET | `/users/:id` | Retrieve user by ID |
| PUT | `/users/:id` | Update username |
| DELETE | `/users/:id` | Delete user |

### Fish

| Method | Endpoint | Description |
|---------|----------|-------------|
| GET | `/fish` | Retrieve all fish |
| POST | `/fish/catch-spot` | Catch a fish from a fishing spot |
| GET | `/fish/inventory/:user_id` | View user's inventory |
| POST | `/fish/sell` | Sell fish from inventory |

## Project Structure

```
project
│
├── controllers
│   ├── userController.js
│   └── fishController.js
│
├── models
│   ├── userModel.js
│   └── fishModel.js
│
├── routes
│   ├── userRoutes.js
│   └── fishRoutes.js
│
├── database
│   ├── schema.js
│   └── seed.js
│
├── data
│   ├── users.json
│   ├── fish.json
│   └── inventory.json
│
├── app.js
├── server.js
└── README.md
```

## Database Tables

### users

| Column | Description |
|---------|-------------|
| user_id | Unique user ID |
| username | Username |
| password | User password |
| coins | Current coin balance |

### fish

| Column | Description |
|---------|-------------|
| fish_id | Unique fish ID |
| fish_name | Fish name |
| sell_price | Selling price |
| spot | Fishing location |

### inventory

| Column | Description |
|---------|-------------|
| inventory_id | Inventory ID |
| user_id | User ID (Foreign Key) |
| fish_id | Fish ID (Foreign Key) |
| quantity | Quantity owned |

## Error Handling

The API performs validation and returns appropriate HTTP status codes.

Examples include:

- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 404 Not Found
- 409 Conflict
- 500 Internal Server Error

## Game Flow

1. Create a user.
2. Catch fish from a fishing spot.
3. Fish are added to the user's inventory.
4. View inventory.
5. Sell fish.
6. Coins are added to the user's account.

## Sample Request

### Create User

POST `/users`

```json
{
  "username": "nae",
  "password": "12345"
}
```

Response

```json
{
  "user_id": "user_1782658470453",
  "username": "nae",
  "password": "12345",
  "coins": 100
}
```

## Author

Singapore Polytechnic

School of Computing

ST0503 Backend Development CA1