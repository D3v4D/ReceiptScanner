import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import axios from "axios";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  CssBaseline,
  TextField,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import "./App.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

type AuthUser = {
  id: number;
  email: string;
  username: string;
};

type ReceiptLineForm = {
  name: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  totalPrice: string;
};

type ReceiptForm = {
  storeName: string;
  storeAddress: string;
  storeTaxNumber: string;
  storeChain: string;
  purchaseDateTime: string;
  total: string;
  paymentMethod: string;
  currency: string;
  lines: ReceiptLineForm[];
};

const createEmptyLine = (): ReceiptLineForm => ({
  name: "",
  quantity: "1",
  unit: "piece",
  unitPrice: "0",
  totalPrice: "0",
});

const createEmptyForm = (): ReceiptForm => ({
  storeName: "",
  storeAddress: "",
  storeTaxNumber: "0",
  storeChain: "",
  purchaseDateTime: new Date().toISOString(),
  total: "0",
  paymentMethod: "CARD",
  currency: "HUF",
  lines: [createEmptyLine()],
});

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
};

const readValue = (
  source: Record<string, unknown>,
  keys: string[],
): string => {
  for (const key of keys) {
    const raw = source[key];
    if (raw !== undefined && raw !== null) {
      return String(raw);
    }
  }

  return "";
};

const parseJsonText = (text: string): unknown | null => {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue with fallback extraction.
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch?.[1]) {
    try {
      return JSON.parse(fencedMatch[1]);
    } catch {
      // Continue with fallback extraction.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const objectCandidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(objectCandidate);
    } catch {
      // Continue with array fallback.
    }
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    const arrayCandidate = trimmed.slice(firstBracket, lastBracket + 1);
    try {
      return JSON.parse(arrayCandidate);
    } catch {
      return null;
    }
  }

  return null;
};

const normalizeScanPayload = (value: unknown): unknown => {
  if (typeof value === "string") {
    return parseJsonText(value) ?? { rawResponse: value };
  }

  if (Array.isArray(value)) {
    return value;
  }

  const root = asRecord(value);
  if (!root) {
    return value;
  }

  if (root.payload && typeof root.payload === "object") {
    return normalizeScanPayload(root.payload);
  }

  if (root.formatted_json !== undefined) {
    const formattedJson = root.formatted_json;
    if (formattedJson && typeof formattedJson === "object") {
      return formattedJson;
    }
  }

  if (typeof root.formatted_text === "string") {
    const parsed = parseJsonText(root.formatted_text);
    if (parsed !== null) {
      return parsed;
    }
  }

  if (typeof root.message === "string") {
    const parsedMessage = parseJsonText(root.message);
    if (parsedMessage !== null) {
      return normalizeScanPayload(parsedMessage);
    }
  }

  for (const key of ["data", "result", "receipt", "payload"]) {
    const candidate = root[key];
    if (candidate && typeof candidate === "object") {
      const candidateRecord = asRecord(candidate);
      if (
        candidateRecord?.store ||
        candidateRecord?.products ||
        candidateRecord?.items ||
        candidateRecord?.lines
      ) {
        return candidate;
      }
    }
  }

  return root;
};

const extractScanId = (value: unknown): number | null => {
  const root = asRecord(value);
  if (!root) {
    return null;
  }

  const scanIdCandidate = root.scan_id ?? root.scanId;
  if (typeof scanIdCandidate === "number" && Number.isFinite(scanIdCandidate)) {
    return scanIdCandidate;
  }

  if (typeof scanIdCandidate === "string") {
    const parsed = Number(scanIdCandidate);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const normalizeScanResultToForm = (value: unknown): Partial<ReceiptForm> => {
  const normalized = normalizeScanPayload(value);
  const root = asRecord(normalized);
  if (!root) {
    return {};
  }

  const store = asRecord(root.store) ?? {};
  const productArray = Array.isArray(root.products)
    ? root.products
    : Array.isArray(root.lines)
      ? root.lines
      : Array.isArray(root.items)
        ? root.items
        : [];

  const lines: ReceiptLineForm[] = productArray
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .map((item) => ({
      name: readValue(item, ["name", "productName", "description", "item"]),
      quantity: readValue(item, ["quantity", "qty", "amount"]),
      unit: readValue(item, ["unit", "uom"]),
      unitPrice: readValue(item, ["unit_price", "unitPrice", "price"]),
      totalPrice: readValue(item, ["total_price", "totalPrice", "lineTotal", "sum"]),
    }));

  return {
    storeName: readValue(store, ["name", "storeName"]) || readValue(root, ["storeName", "store_name"]),
    storeAddress: readValue(store, ["address", "storeAddress"]),
    storeTaxNumber: readValue(store, ["taxNumber", "tax_number", "vat", "vat_number"]),
    storeChain: readValue(store, ["chain", "storeChain"]),
    purchaseDateTime: readValue(root, ["purchase_datetime", "purchaseDateTime", "date", "datetime"]),
    total: readValue(root, ["total", "grand_total", "amount_total"]),
    paymentMethod: readValue(root, ["payment_method", "paymentMethod", "payment"]),
    currency: readValue(root, ["currency", "curr"]),
    lines,
  };
};

const buildReceiptPayload = (form: ReceiptForm, scanId: number | null) => ({
  scan_id: scanId,
  store: {
    name: form.storeName,
    address: form.storeAddress,
    taxNumber: Number(form.storeTaxNumber || 0),
    chain: form.storeChain,
  },
  purchase_datetime: form.purchaseDateTime,
  products: form.lines.map((line) => ({
    name: line.name,
    quantity: Number(line.quantity || 0),
    unit: line.unit,
    unit_price: Number(line.unitPrice || 0),
    total_price: Number(line.totalPrice || 0),
  })),
  total: Number(form.total || 0),
  payment_method: form.paymentMethod,
  currency: form.currency,
});

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submittingCorrection, setSubmittingCorrection] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [canCorrect, setCanCorrect] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<unknown | null>(null);
  const [scanId, setScanId] = useState<number | null>(null);
  const [correctionResult, setCorrectionResult] = useState<unknown | null>(null);
  const [receiptForm, setReceiptForm] = useState<ReceiptForm>(createEmptyForm());
  const [mobileCorrectionView, setMobileCorrectionView] = useState<"receipt" | "lines">("lines");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

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

  useEffect(() => {
    const bootstrapAuth = async () => {
      try {
        const response = await apiClient.get<AuthUser>("/api/auth/me");
        setCurrentUser(response.data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status !== 401) {
          setErrorMessage("Could not verify session. Please sign in.");
        }
        setCurrentUser(null);
      } finally {
        setAuthLoading(false);
      }
    };

    void bootstrapAuth();
  }, []);

  const handleAuthFailure = (status?: number): boolean => {
    if (status !== 401 && status !== 403) {
      return false;
    }

    setCurrentUser(null);
    setCanCorrect(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setErrorMessage("Your session expired. Please sign in again.");
    navigate("/login");
    return true;
  };

  const handleLogin = async () => {
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setErrorMessage("Please provide your username/email and password.");
      return;
    }

    try {
      setAuthSubmitting(true);
      setErrorMessage(null);
      const response = await apiClient.post<AuthUser>("/api/auth/login", {
        identifier: loginIdentifier,
        password: loginPassword,
      });
      setCurrentUser(response.data);
      setLoginPassword("");
      navigate("/scan");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);
        setErrorMessage(backendMessage || "Invalid credentials.");
      } else {
        setErrorMessage("Login failed.");
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleRegister = async () => {
    if (!registerUsername.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      setErrorMessage("Please provide username, email, and password.");
      return;
    }

    try {
      setAuthSubmitting(true);
      setErrorMessage(null);

      await apiClient.post("/api/users", {
        username: registerUsername,
        email: registerEmail,
        password: registerPassword,
      });

      const response = await apiClient.post<AuthUser>("/api/auth/login", {
        identifier: registerUsername,
        password: registerPassword,
      });

      setCurrentUser(response.data);
      setRegisterPassword("");
      setLoginPassword("");
      setAuthMode("login");
      navigate("/scan");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);
        setErrorMessage(backendMessage || "Registration failed.");
      } else {
        setErrorMessage("Registration failed.");
      }
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post("/api/auth/logout");
    } catch {
      // Local state reset below is authoritative for UI logout.
    }

    stopCamera();
    setCurrentUser(null);
    setCanCorrect(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setScanResult(null);
    setCorrectionResult(null);
    setReceiptForm(createEmptyForm());
    setErrorMessage(null);
    setLoginPassword("");
    navigate("/login");
  };

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
      setScanResult(null);

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
    setScanResult(null);
    setSelectedFile(file);
    stopCamera();
  };

  const handleScanClick = async () => {
    if (cameraActive) {
      await captureFromCamera();
      return;
    }

    await startCamera();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setScanResult(null);
    setScanId(null);
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
      setCorrectionResult(null);

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await apiClient.post(
        "/api/receipts/scan",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      const normalizedResult = normalizeScanPayload(response.data);
      const persistedScanId = extractScanId(response.data);

      setScanResult(normalizedResult);
      setScanId(persistedScanId);
      setCanCorrect(true);

      const prefill = normalizeScanResultToForm(normalizedResult);
      setReceiptForm((prev) => ({
        ...prev,
        ...prefill,
        lines: prefill.lines && prefill.lines.length > 0 ? prefill.lines : prev.lines,
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return;
        }

        const normalizedFromError = normalizeScanPayload(error.response?.data);
        const prefill = normalizeScanResultToForm(normalizedFromError);
        const hasPrefill = Object.values(prefill).some((field) => {
          if (Array.isArray(field)) {
            return field.length > 0;
          }

          return typeof field === "string" ? field.trim().length > 0 : Boolean(field);
        });

        if (hasPrefill) {
          setScanResult(normalizedFromError);
          setScanId(extractScanId(error.response?.data));
          setCanCorrect(true);
          setErrorMessage(null);
          setReceiptForm((prev) => ({
            ...prev,
            ...prefill,
            lines: prefill.lines && prefill.lines.length > 0 ? prefill.lines : prev.lines,
          }));
          navigate("/correction");
          return;
        }

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

  const addLine = () => {
    setReceiptForm((prev) => ({ ...prev, lines: [...prev.lines, createEmptyLine()] }));
  };

  const removeLine = (index: number) => {
    setReceiptForm((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, field: keyof ReceiptLineForm, value: string) => {
    setReceiptForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }));
  };

  const submitCorrection = async () => {
    try {
      setSubmittingCorrection(true);
      setErrorMessage(null);

      const payload = buildReceiptPayload(receiptForm, scanId);
      const response = await apiClient.post("/api/receipts", payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      setCorrectionResult(response.data);
      setScanId(null);
      navigate("/scan");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return;
        }

        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);
        setErrorMessage(backendMessage || error.message);
      } else {
        setErrorMessage("Failed to submit corrected data.");
      }
    } finally {
      setSubmittingCorrection(false);
    }
  };

  const formattedScanResult = useMemo(() => {
    if (!scanResult) {
      return "";
    }

    return JSON.stringify(scanResult, null, 2);
  }, [scanResult]);

  const formattedCorrectionResult = useMemo(() => {
    if (!correctionResult) {
      return "";
    }

    return JSON.stringify(correctionResult, null, 2);
  }, [correctionResult]);

  const isScanRoute = location.pathname === "/scan" || location.pathname === "/";
  const isAuthenticated = currentUser !== null;

  const scanView = (
    <>
      <Grid container spacing={1.2}>
        <Grid size={6}>
          <Button
            component="label"
            variant="outlined"
            fullWidth
            startIcon={<ImageRoundedIcon />}
          >
            Upload
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
            onClick={() => {
              void handleScanClick();
            }}
            disabled={startingCamera}
          >
            {startingCamera ? "Starting..." : "Scan"}
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

      {formattedScanResult ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Extracted JSON
          </Typography>
          <Box component="pre" className="result-box">
            {formattedScanResult}
          </Box>
        </Box>
      ) : null}

      {formattedCorrectionResult ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Saved Receipt Response
          </Typography>
          <Box component="pre" className="result-box">
            {formattedCorrectionResult}
          </Box>
        </Box>
      ) : null}
    </>
  );

  const correctionView = (
    <Stack spacing={1.2}>
      <Grid container spacing={1.2} className="mobile-correction-toggle" role="tablist" aria-label="Correction view switcher">
        <Grid size={6}>
          <Button
            variant={mobileCorrectionView === "receipt" ? "contained" : "outlined"}
            fullWidth
            onClick={() => setMobileCorrectionView("receipt")}
          >
            Receipt
          </Button>
        </Grid>
        <Grid size={6}>
          <Button
            variant={mobileCorrectionView === "lines" ? "contained" : "outlined"}
            fullWidth
            onClick={() => setMobileCorrectionView("lines")}
          >
            Lines
          </Button>
        </Grid>
      </Grid>

      <Typography variant="h6">Correct Extracted Data</Typography>
      <Typography color="text.secondary" variant="body2">
        Fix the fields below and submit to the Kotlin API.
      </Typography>

      <Grid container spacing={1.2}>
        <Grid
          size={{ xs: 12, md: 5 }}
          className={`correction-panel ${mobileCorrectionView === "receipt" ? "active" : "inactive"}`}
        >
          <Stack spacing={1.2} className="receipt-focus-panel">
            <Typography variant="subtitle2">Scanned Receipt</Typography>
            {previewUrl ? (
              <Box
                component="img"
                src={previewUrl}
                alt="Scanned receipt"
                className="preview-image correction-preview-image receipt-focus-media"
              />
            ) : (
              <Alert severity="info">No receipt image preview is available.</Alert>
            )}
            <Typography variant="caption" color="text.secondary">
              {selectedFileLabel}
            </Typography>
          </Stack>
        </Grid>

        <Grid
          size={{ xs: 12, md: 7 }}
          className={`correction-panel ${mobileCorrectionView === "lines" ? "active" : "inactive"}`}
        >
          <Stack spacing={1.2}>
            <TextField
              label="Store Name"
              value={receiptForm.storeName}
              onChange={(event) =>
                setReceiptForm((prev) => ({ ...prev, storeName: event.target.value }))
              }
              fullWidth
            />
            <TextField
              label="Store Address"
              value={receiptForm.storeAddress}
              onChange={(event) =>
                setReceiptForm((prev) => ({ ...prev, storeAddress: event.target.value }))
              }
              fullWidth
            />
            <Grid container spacing={1.2}>
              <Grid size={6}>
                <TextField
                  label="Store Tax Number"
                  value={receiptForm.storeTaxNumber}
                  onChange={(event) =>
                    setReceiptForm((prev) => ({
                      ...prev,
                      storeTaxNumber: event.target.value,
                    }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Store Chain"
                  value={receiptForm.storeChain}
                  onChange={(event) =>
                    setReceiptForm((prev) => ({ ...prev, storeChain: event.target.value }))
                  }
                  fullWidth
                />
              </Grid>
            </Grid>

            <TextField
              label="Purchase Datetime"
              value={receiptForm.purchaseDateTime}
              onChange={(event) =>
                setReceiptForm((prev) => ({
                  ...prev,
                  purchaseDateTime: event.target.value,
                }))
              }
              fullWidth
            />

            <Grid container spacing={1.2}>
              <Grid size={6}>
                <TextField
                  label="Total"
                  value={receiptForm.total}
                  onChange={(event) =>
                    setReceiptForm((prev) => ({ ...prev, total: event.target.value }))
                  }
                  fullWidth
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  label="Currency"
                  value={receiptForm.currency}
                  onChange={(event) =>
                    setReceiptForm((prev) => ({ ...prev, currency: event.target.value }))
                  }
                  fullWidth
                />
              </Grid>
            </Grid>

            <TextField
              label="Payment Method"
              value={receiptForm.paymentMethod}
              onChange={(event) =>
                setReceiptForm((prev) => ({
                  ...prev,
                  paymentMethod: event.target.value,
                }))
              }
              fullWidth
            />

            <Typography variant="subtitle2">Receipt Lines</Typography>

            {receiptForm.lines.map((line, index) => (
              <Box key={`${index}-${line.name}`} className="line-card">
                <Grid container spacing={1.2}>
                  <Grid size={12}>
                    <TextField
                      label="Name"
                      value={line.name}
                      onChange={(event) =>
                        updateLine(index, "name", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Quantity"
                      value={line.quantity}
                      onChange={(event) =>
                        updateLine(index, "quantity", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Unit"
                      value={line.unit}
                      onChange={(event) => updateLine(index, "unit", event.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Unit Price"
                      value={line.unitPrice}
                      onChange={(event) =>
                        updateLine(index, "unitPrice", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                  <Grid size={6}>
                    <TextField
                      label="Total Price"
                      value={line.totalPrice}
                      onChange={(event) =>
                        updateLine(index, "totalPrice", event.target.value)
                      }
                      fullWidth
                    />
                  </Grid>
                </Grid>
                <Button
                  variant="text"
                  color="error"
                  onClick={() => removeLine(index)}
                  sx={{ mt: 1 }}
                >
                  Remove Line
                </Button>
              </Box>
            ))}

            <Button variant="outlined" onClick={addLine} fullWidth>
              Add Line
            </Button>

            <Button
              variant="contained"
              size="large"
              onClick={submitCorrection}
              disabled={submittingCorrection}
            >
              {submittingCorrection ? "Submitting..." : "Submit Corrected Receipt"}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );

  const guardedCorrectionView = canCorrect ? (
    correctionView
  ) : (
    <Navigate to="/scan" replace />
  );

  const authView = (
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
            onChange={(event) => setLoginIdentifier(event.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleLogin();
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
            onChange={(event) => setRegisterUsername(event.target.value)}
            fullWidth
          />
          <TextField
            label="Email"
            value={registerEmail}
            onChange={(event) => setRegisterEmail(event.target.value)}
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={registerPassword}
            onChange={(event) => setRegisterPassword(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void handleRegister();
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
            void handleLogin();
            return;
          }
          void handleRegister();
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

      <Button
        variant="text"
        onClick={() => {
          setErrorMessage(null);
          setAuthMode((prev) => (prev === "login" ? "register" : "login"));
        }}
        disabled={authSubmitting}
      >
        {authMode === "login" ? "Need an account? Register" : "Already registered? Sign in"}
      </Button>
    </Stack>
  );

  if (authLoading) {
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

  return (
    <>
      <CssBaseline />
      <Box className="app-shell">
        <Container maxWidth="md">
          <Card className="upload-card" elevation={6}>
            <CardContent>
              <Stack spacing={2.5} className="content-stack">
                <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }} className="title-text">
                  Receipt Upload
                </Typography>
                {isAuthenticated ? (
                  <Stack spacing={1.4}>
                    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                      <Typography color="text.secondary" className="subtitle-text">
                        Choose an image file or take a picture with your camera.
                      </Typography>
                      <Button variant="text" onClick={() => void handleLogout()}>
                        Sign Out ({currentUser.username})
                      </Button>
                    </Stack>

                    <Grid container spacing={1.2}>
                      <Grid size={6}>
                        <Button
                          variant={isScanRoute ? "contained" : "outlined"}
                          fullWidth
                          className="mode-button"
                          onClick={() => navigate("/scan")}
                        >
                          Scan Mode
                        </Button>
                      </Grid>
                      <Grid size={6}>
                        <Button
                          variant={!isScanRoute ? "contained" : "outlined"}
                          fullWidth
                          className="mode-button"
                          onClick={() => {
                            if (!canCorrect) {
                              setErrorMessage("Upload and process a receipt first, then correct it.");
                              navigate("/scan");
                              return;
                            }

                            navigate("/correction");
                          }}
                          disabled={!canCorrect}
                        >
                          Correction Mode
                        </Button>
                      </Grid>
                    </Grid>
                  </Stack>
                ) : null}

                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to={isAuthenticated ? "/scan" : "/login"} replace />}
                  />
                  <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/scan" replace /> : authView}
                  />
                  <Route
                    path="/scan"
                    element={isAuthenticated ? scanView : <Navigate to="/login" replace />}
                  />
                  <Route
                    path="/correction"
                    element={isAuthenticated ? guardedCorrectionView : <Navigate to="/login" replace />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to={isAuthenticated ? "/scan" : "/login"} replace />}
                  />
                </Routes>

                {isAuthenticated ? (
                  <Typography variant="caption" color="text.secondary">
                    Target: {(API_BASE_URL || "(same origin)") + "/api/receipts/scan"}
                  </Typography>
                ) : null}

                {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </>
  );
}

export default App;
