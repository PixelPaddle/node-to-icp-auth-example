# Node to ICP Auth Example

An example project demonstrating how to port a user authentication module from Node.js to the Internet Computer Protocol (ICP) using Azle. This project includes endpoints for user login and OTP-based two-factor authentication (2FA) verification, providing enhanced security and decentralization.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Endpoints](#api-endpoints)

## Introduction

This repository provides an example of migrating a user authentication module from a Node.js environment to the Internet Computer Protocol (ICP). The aim is to leverage ICP's decentralized architecture to enhance security, scalability, and user experience.

## Features

- User Login with OTP
- OTP-based Two-Factor Authentication (2FA) Verification
- Enhanced Security
- Decentralized Architecture

## Prerequisites

Before you begin, ensure you have met the following requirements:

- Node.js and npm installed
- ICP development environment set up (DFX, Azle)
- Basic knowledge of Node.js and ICP

## Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/PixelPaddle/node-to-icp-auth-example
    cd node-to-icp-auth-example
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Set up ICP environment:**

   Follow the [ICP setup guide](https://internetcomputer.org/docs/current/developer-docs/quickstart/hello10mins) to set up your development environment.


## Usage

1. **Setup Local Network:**

    ```bash
    dfx start --background
    ```

2. **Deploy the canister:**

    ```bash
    dfx deploy
    ```
Now you can access your endpoints.

## API Endpoints

### Login

- **Endpoint:** `/user/otp/login`
- **Method:** `POST`
- **Description:** Accepts an email address. If the email does not exist in , it is saved.

    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"email": "user@example.com"}' <Canister base url>/user/otp/login
    ```
### Verify OTP

- **Endpoint:** `/user/otp/verify`
- **Method:** `POST`
- **Description:** Verifies the OTP sent to the user's email address.

    ```bash
    curl -X POST -H "Content-Type: application/json" -d '{"email": "user@example.com", "otp": "123456"}' http://localhost:8000/user/otp/verify
    ```
