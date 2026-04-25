import { Box, Card, CardContent, CircularProgress, Container, CssBaseline, Stack, Typography } from "@mui/material";

export function SessionLoadingView() {
  return (
    <>
      <CssBaseline />
      <Box className="app-shell">
        <Container maxWidth="md">
          <Card className="upload-card" elevation={6}>
            <CardContent>
              <Stack spacing={2} sx={{ py: 4, alignItems: "center" }}>
                <CircularProgress />
                <Typography color="text.secondary">Checking session...</Typography>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}
