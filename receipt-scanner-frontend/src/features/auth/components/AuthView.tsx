import { Button, Stack, TextField, Typography } from "@mui/material";

type AuthMode = "login" | "register";

type AuthViewProps = {
  authMode: AuthMode;
  authSubmitting: boolean;
  loginIdentifier: string;
  loginPassword: string;
  registerUsername: string;
  registerEmail: string;
  registerPassword: string;
  onLoginIdentifierChange: (value: string) => void;
  onLoginPasswordChange: (value: string) => void;
  onRegisterUsernameChange: (value: string) => void;
  onRegisterEmailChange: (value: string) => void;
  onRegisterPasswordChange: (value: string) => void;
  onLogin: () => Promise<void>;
  onRegister: () => Promise<void>;
  onToggleMode: () => void;
};

export function AuthView({
  authMode,
  authSubmitting,
  loginIdentifier,
  loginPassword,
  registerUsername,
  registerEmail,
  registerPassword,
  onLoginIdentifierChange,
  onLoginPasswordChange,
  onRegisterUsernameChange,
  onRegisterEmailChange,
  onRegisterPasswordChange,
  onLogin,
  onRegister,
  onToggleMode,
}: AuthViewProps) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="h6">{authMode === "login" ? "Sign In" : "Create Account"}</Typography>
      <Typography color="text.secondary" variant="body2">
        {authMode === "login"
          ? "Sign in before scanning or uploading receipts."
          : "Create an account, then start scanning receipts."}
      </Typography>

      {authMode === "login" ? (
        <>
          <TextField
            label="Username or Email"
            value={loginIdentifier}
            onChange={(event) => onLoginIdentifierChange(event.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={loginPassword}
            onChange={(event) => onLoginPasswordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void onLogin();
              }
            }}
            fullWidth
          />
        </>
      ) : (
        <>
          <TextField
            label="Username"
            value={registerUsername}
            onChange={(event) => onRegisterUsernameChange(event.target.value)}
            fullWidth
          />
          <TextField
            label="Email"
            value={registerEmail}
            onChange={(event) => onRegisterEmailChange(event.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={registerPassword}
            onChange={(event) => onRegisterPasswordChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void onRegister();
              }
            }}
            fullWidth
          />
        </>
      )}

      <Button
        variant="contained"
        size="large"
        onClick={() => {
          if (authMode === "login") {
            void onLogin();
            return;
          }
          void onRegister();
        }}
        disabled={authSubmitting}
      >
        {authSubmitting
          ? authMode === "login"
            ? "Signing in..."
            : "Creating account..."
          : authMode === "login"
            ? "Sign In"
            : "Create Account"}
      </Button>

      <Button variant="text" onClick={onToggleMode} disabled={authSubmitting}>
        {authMode === "login" ? "Need an account? Register" : "Already registered? Sign in"}
      </Button>
    </Stack>
  );
}
