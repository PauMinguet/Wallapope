import { SignUp } from "@clerk/nextjs";
import { Box } from "@mui/material";

export default function Page() {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#000000",
      }}
    >
      <SignUp
        appearance={{
          elements: {
            formButtonPrimary: {
              backgroundColor: "#4169E1",
              "&:hover": {
                backgroundColor: "#364AAD",
              },
            },
            card: {
              backgroundColor: "#111111",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "12px",
            },
          },
        }}
      />
    </Box>
  );
} 