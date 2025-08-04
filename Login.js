import React from 'react';
import './Login.css';

const Login = ({ onLogin }) => {
  const handleSubmit = (event) => {
    event.preventDefault();
    // In a real application, you would add username/password validation here.
    onLogin();
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input type="text" id="username" name="username" required />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  );
};

export default Login;