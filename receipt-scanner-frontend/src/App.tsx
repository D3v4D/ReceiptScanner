import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const selectedFileLabel = useMemo(() => {
    if (!selectedFile) {
      return "No file selected";
    }

    return `${selectedFile.name} (${Math.round(selectedFile.size / 1024)} KB)`;
  }, [selectedFile]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
  };

  const startCamera = async () => {
    try {
      setStartingCamera(true);
      setErrorMessage(null);
      setResult(null);

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (error) {
      if (!window.isSecureContext) {
        setErrorMessage(
          "Camera requires a secure context. Open the app on localhost or over HTTPS.",
        );
      } else if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          setErrorMessage(
            "Camera access was denied. Allow camera permission for this site in your browser settings.",
          );
        } else if (error.name === "NotFoundError") {
          setErrorMessage("No camera device was found on this machine.");
        } else if (error.name === "NotReadableError") {
          setErrorMessage(
            "Camera is busy or blocked by another application. Close other apps using the camera and try again.",
          );
        } else {
          setErrorMessage(`Could not access camera: ${error.message}`);
        }
      } else {
        setErrorMessage("Could not access camera. Check browser permissions.");
      }
      setCameraActive(false);
    } finally {
      setStartingCamera(false);
    }
  };

  const captureFromCamera = async () => {
    if (!videoRef.current) {
      setErrorMessage("Camera is not ready.");
      return;
    }

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage("Camera stream has no frame yet.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMessage("Unable to capture from camera.");
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.95);
    });

    if (!blob) {
      setErrorMessage("Failed to capture image.");
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const file = new File([blob], `receipt-${timestamp}.jpg`, {
      type: "image/jpeg",
    });

    setErrorMessage(null);
    setResult(null);
    setSelectedFile(file);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setResult(null);
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage("Please select an image first.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage(null);

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await axios.post(
        `${API_BASE_URL}/api/receipts/scan`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const responseText =
        typeof response.data === "string"
          ? response.data
          : JSON.stringify(response.data, null, 2);
      setResult(responseText);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);
        setErrorMessage(backendMessage || error.message);
      } else {
        setErrorMessage("Upload failed.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <CssBaseline />
      <Box className="app-shell">
        <Container maxWidth="sm">
          <Card className="upload-card" elevation={6}>
            <CardContent>
              <Stack spacing={2.5}>
                <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
                  Receipt Upload
                </Typography>
                <Typography color="text.secondary">
                  Choose an image file or take a picture with your camera.
                </Typography>

                <Grid container spacing={1.2}>
                  <Grid size={12}>
                    <Button
                      component="label"
                      variant="outlined"
                      fullWidth
                      startIcon={<ImageRoundedIcon />}
                    >
                      Select Image From Device
                      <input
                        hidden
                        accept="image/*"
                        capture="environment"
                        type="file"
                        onChange={handleFileChange}
                      />
                    </Button>
                  </Grid>
                  <Grid size={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PhotoCameraRoundedIcon />}
                      onClick={startCamera}
                      disabled={startingCamera}
                    >
                      {startingCamera ? "Starting..." : "Start Camera"}
                    </Button>
                  </Grid>
                  <Grid size={6}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={captureFromCamera}
                      disabled={!cameraActive}
                    >
                      Take Picture
                    </Button>
                  </Grid>
                  <Grid size={12}>
                    <Button
                      variant="text"
                      fullWidth
                      onClick={stopCamera}
                      disabled={!cameraActive}
                    >
                      Stop Camera
                    </Button>
                  </Grid>
                </Grid>

                {cameraActive ? (
                  <Box className="camera-shell">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="camera-preview"
                    />
                  </Box>
                ) : null}

                <Typography variant="body2" color="text.secondary">
                  {selectedFileLabel}
                </Typography>

                {previewUrl ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt="Selected receipt"
                    className="preview-image"
                  />
                ) : null}

                <Button
                  variant="contained"
                  size="large"
                  startIcon={
                    uploading ? <CircularProgress size={18} /> : <CloudUploadRoundedIcon />
                  }
                  onClick={handleUpload}
                  disabled={uploading || !selectedFile}
                >
                  {uploading ? "Uploading..." : "Upload to Backend"}
                </Button>

                <Divider />

                <Typography variant="caption" color="text.secondary">
                  Target: {(API_BASE_URL || "(same origin)") + "/api/receipts/scan"}
                </Typography>

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

                {result ? (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Response
                    </Typography>
                    <Box component="pre" className="result-box">
                      {result}
                    </Box>
                  </Box>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}

export default App;
