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
  Container,
  CssBaseline,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import { apiClient } from "../shared/api/client";
import {
  createEmptyForm,
  createEmptyLine,
  type AuthUser,
  type Category,
  type EditableReceiptLine,
  type EditableReceiptMeta,
  type ReceiptApiResponse,
  type ReceiptForm,
  type ReceiptLineForm,
} from "../shared/types/receipt";
import {
  extractScanId,
  normalizeScanPayload,
  normalizeScanResultToForm,
} from "../features/scan/utils/scanNormalization";
import { buildReceiptPayload } from "../features/scan/utils/buildReceiptPayload";
import { AuthView } from "../features/auth/components/AuthView";
import { SpendingDashboardView } from "../features/dashboard/components/SpendingDashboardView";
import { ScanView } from "../features/scan/components/ScanView";
import { CorrectionView } from "../features/correction/components/CorrectionView";
import { ReceiptsView } from "../features/receipts/components/ReceiptsView";
import { SessionLoadingView } from "./components/SessionLoadingView";
import "./App.css";

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
  const [scanId, setScanId] = useState<number | null>(null);
  const [pendingCorrectionReceiptId, setPendingCorrectionReceiptId] = useState<number | null>(null);
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
  const [receipts, setReceipts] = useState<ReceiptApiResponse[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsError, setReceiptsError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
  const [selectedReceiptImageUrl, setSelectedReceiptImageUrl] = useState<string | null>(null);
  const [selectedReceiptImageLoading, setSelectedReceiptImageLoading] = useState(false);
  const [selectedReceiptImageError, setSelectedReceiptImageError] = useState<string | null>(null);
  const [receiptUpdateLoading, setReceiptUpdateLoading] = useState(false);
  const [receiptUpdateError, setReceiptUpdateError] = useState<string | null>(null);

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
    setScanId(null);
    setPendingCorrectionReceiptId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setReceiptForm(createEmptyForm());
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
    setScanId(null);
    setPendingCorrectionReceiptId(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setReceiptForm(createEmptyForm());
    setErrorMessage(null);
    setReceipts([]);
    setReceiptsError(null);
    setSelectedReceiptId(null);
    setSelectedReceiptImageUrl(null);
    setSelectedReceiptImageError(null);
    setLoginPassword("");
    navigate("/login");
  };

  const loadReceipts = async () => {
    try {
      setReceiptsLoading(true);
      setReceiptsError(null);
      const response = await apiClient.get<ReceiptApiResponse[]>("/api/receipts");
      setReceipts(response.data ?? []);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return;
        }

        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);
        setReceiptsError(backendMessage || "Failed to load receipts.");
      } else {
        setReceiptsError("Failed to load receipts.");
      }
    } finally {
      setReceiptsLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await apiClient.get<Category[]>("/api/categories");
      setCategories(response.data ?? []);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return;
        }
        setErrorMessage("Failed to load categories.");
      } else {
        setErrorMessage("Failed to load categories.");
      }
    } finally {
      setCategoriesLoading(false);
    }
  };

  const createCategory = async (name: string, description?: string): Promise<Category | null> => {
    try {
      const response = await apiClient.post<Category>("/api/categories", {
        name,
        description,
      });
      
      setCategories((prev) => [...prev, response.data]);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return null;
        }
        setErrorMessage("Failed to create category.");
      } else {
        setErrorMessage("Failed to create category.");
      }
      return null;
    }
  };

  const updateCategory = async (
    id: number,
    name: string,
    description?: string,
  ): Promise<Category | null> => {
    try {
      const response = await apiClient.put<Category>(`/api/categories/${id}`, {
        name,
        description,
      });

      setCategories((prev) =>
        prev.map((cat) => (cat.id === id ? response.data : cat)),
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return null;
        }
        setErrorMessage("Failed to update category.");
      } else {
        setErrorMessage("Failed to update category.");
      }
      return null;
    }
  };

  const deleteCategory = async (id: number): Promise<boolean> => {
    try {
      await apiClient.delete(`/api/categories/${id}`);
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return false;
        }
        setErrorMessage("Failed to delete category.");
      } else {
        setErrorMessage("Failed to delete category.");
      }
      return false;
    }
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

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage("This browser does not support camera access.");
        setCameraActive(false);
        return;
      }

      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // Some browsers may block autoplay; user interaction already happened, so this is best effort.
        }
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
    setCanCorrect(false);
    setScanId(null);
    setPendingCorrectionReceiptId(null);
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

  const handleStopCameraClick = () => {
    stopCamera();
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    setCanCorrect(false);
    setScanId(null);
    setPendingCorrectionReceiptId(null);
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
  };

  const hasMeaningfulPrefill = (prefill: Partial<ReceiptForm>): boolean => {
    return Object.values(prefill).some((field) => {
      if (Array.isArray(field)) {
        return field.length > 0;
      }

      return typeof field === "string" ? field.trim().length > 0 : Boolean(field);
    });
  };

  const buildCorrectionForm = (prefill: Partial<ReceiptForm>): ReceiptForm => {
    const base = createEmptyForm();

    return {
      storeName:
        prefill.storeName && prefill.storeName.trim().length > 0
          ? prefill.storeName
          : base.storeName,
      storeAddress:
        prefill.storeAddress && prefill.storeAddress.trim().length > 0
          ? prefill.storeAddress
          : base.storeAddress,
      storeTaxNumber:
        prefill.storeTaxNumber && prefill.storeTaxNumber.trim().length > 0
          ? prefill.storeTaxNumber
          : base.storeTaxNumber,
      storeChain:
        prefill.storeChain && prefill.storeChain.trim().length > 0
          ? prefill.storeChain
          : base.storeChain,
      purchaseDateTime:
        prefill.purchaseDateTime && prefill.purchaseDateTime.trim().length > 0
          ? prefill.purchaseDateTime
          : base.purchaseDateTime,
      total: prefill.total && prefill.total.trim().length > 0 ? prefill.total : base.total,
      paymentMethod:
        prefill.paymentMethod && prefill.paymentMethod.trim().length > 0
          ? prefill.paymentMethod
          : base.paymentMethod,
      currency: prefill.currency && prefill.currency.trim().length > 0 ? prefill.currency : base.currency,
      lines: prefill.lines && prefill.lines.length > 0 ? prefill.lines : [createEmptyLine()],
    };
  };

  const createDraftReceiptForCorrection = async (
    prefill: Partial<ReceiptForm>,
    sourceScanId: number | null,
  ) => {
    const preparedForm = buildCorrectionForm(prefill);
    console.log("[DEBUG] Prepared form after buildCorrectionForm:", preparedForm);
    console.log("[DEBUG] purchaseDateTime:", preparedForm.purchaseDateTime);
    const payload = buildReceiptPayload(preparedForm, sourceScanId);
    console.log("[DEBUG] Payload being sent to backend:", payload);
    const response = await apiClient.post<ReceiptApiResponse>("/api/receipts", payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    const createdReceipt = response.data;
    setReceiptForm(preparedForm);
    setScanId(createdReceipt.sourceScanId ?? sourceScanId);
    setPendingCorrectionReceiptId(createdReceipt.id);
    setCanCorrect(true);
    setReceipts((prev) => [createdReceipt, ...prev.filter((receipt) => receipt.id !== createdReceipt.id)]);
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

      const response = await apiClient.post(
        "/api/receipts/scan",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      console.log("[DEBUG] /api/receipts/scan response.data:", response.data);
      const normalizedResult = normalizeScanPayload(response.data);
      console.log("[DEBUG] normalizedResult:", normalizedResult);
      const persistedScanId = extractScanId(response.data);
      const prefill = normalizeScanResultToForm(normalizedResult);
      console.log("[DEBUG] prefill from scan:", prefill);
      await createDraftReceiptForCorrection(prefill, persistedScanId);
      navigate("/correction");
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return;
        }

        const normalizedFromError = normalizeScanPayload(error.response?.data);
        const prefill = normalizeScanResultToForm(normalizedFromError);
        const hasPrefill = hasMeaningfulPrefill(prefill);

        if (hasPrefill) {
          const fallbackScanId = extractScanId(error.response?.data);
          await createDraftReceiptForCorrection(prefill, fallbackScanId);
          setErrorMessage(null);
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
      lines: prev.lines.map((line, i) => {
        if (i !== index) {
          return line;
        }

        if (field === "categoryId") {
          return {
            ...line,
            categoryId: value.trim() === "" ? null : Number(value),
          };
        }

        return { ...line, [field]: value };
      }),
    }));
  };

  const submitCorrection = async () => {
    try {
      setSubmittingCorrection(true);
      setErrorMessage(null);

      const payload = buildReceiptPayload(receiptForm, scanId);
      if (pendingCorrectionReceiptId !== null) {
        const response = await apiClient.put<ReceiptApiResponse>(
          `/api/receipts/${pendingCorrectionReceiptId}`,
          payload,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        setReceipts((prev) =>
          prev.map((receipt) =>
            receipt.id === pendingCorrectionReceiptId ? response.data : receipt,
          ),
        );
      } else {
        await apiClient.post("/api/receipts", payload, {
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      setScanId(null);
      setPendingCorrectionReceiptId(null);
      setCanCorrect(false);
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

  const completeReceiptEdit = async (
    receiptId: number,
    editedLines: EditableReceiptLine[],
    editedMeta: EditableReceiptMeta,
  ): Promise<boolean> => {
    const targetReceipt = receipts.find((receipt) => receipt.id === receiptId);
    if (!targetReceipt) {
      setReceiptUpdateError("Selected receipt no longer exists.");
      return false;
    }

    try {
      setReceiptUpdateLoading(true);
      setReceiptUpdateError(null);

      const normalizedLines = editedLines.map((line) => {
        const quantity = Number(line.quantity);
        const unitPrice = Number(line.unitPrice);

        const safeQuantity = Number.isFinite(quantity) ? quantity : 0;
        const safeUnitPrice = Number.isFinite(unitPrice) ? unitPrice : 0;

        return {
          name: line.name,
          quantity: safeQuantity,
          unit: line.unit,
          unit_price: safeUnitPrice,
          total_price: safeQuantity * safeUnitPrice,
          category_id: line.category?.id,
        };
      });

      const computedTotal = normalizedLines.reduce((sum, line) => sum + line.total_price, 0);
      const parsedTotal = Number(editedMeta.total);
      const total = Number.isFinite(parsedTotal) ? parsedTotal : computedTotal;

      const storeName = editedMeta.storeName.trim() || targetReceipt.storeName;
      const storeAddress = editedMeta.storeAddress.trim() || targetReceipt.storeAddress;
      const storeChain = editedMeta.storeChain.trim() || targetReceipt.storeChain;
      const storeTaxNumber = editedMeta.storeTaxNumber.trim();
      const purchaseDateTime = editedMeta.purchaseDateTime.trim() || targetReceipt.purchaseDateTime;
      const paymentMethod = editedMeta.paymentMethod.trim() || targetReceipt.paymentMethod || "UNKNOWN";
      const currency = editedMeta.currency.trim() || targetReceipt.currency;

      const payload = {
        scan_id: targetReceipt.sourceScanId,
        store: {
          name: storeName,
          address: storeAddress,
          taxNumber: Number(storeTaxNumber || 0),
          chain: storeChain,
        },
        purchase_datetime: purchaseDateTime,
        products: normalizedLines,
        total,
        payment_method: paymentMethod,
        currency,
      };

      const response = await apiClient.put<ReceiptApiResponse>(
        `/api/receipts/${receiptId}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      setReceipts((prev) =>
        prev.map((receipt) => (receipt.id === receiptId ? response.data : receipt)),
      );
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return false;
        }

        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);

        setReceiptUpdateError(backendMessage || "Failed to update receipt.");
      } else {
        setReceiptUpdateError("Failed to update receipt.");
      }

      return false;
    } finally {
      setReceiptUpdateLoading(false);
    }
  };

  const deleteReceipt = async (receiptId: number): Promise<boolean> => {
    try {
      setReceiptUpdateLoading(true);
      setReceiptUpdateError(null);

      await apiClient.delete(`/api/receipts/${receiptId}`);
      setReceipts((prev) => prev.filter((receipt) => receipt.id !== receiptId));
      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (handleAuthFailure(error.response?.status)) {
          return false;
        }

        const backendMessage =
          typeof error.response?.data === "string"
            ? error.response.data
            : JSON.stringify(error.response?.data ?? {}, null, 2);
        setReceiptUpdateError(backendMessage || "Failed to delete receipt.");
      } else {
        setReceiptUpdateError("Failed to delete receipt.");
      }

      return false;
    } finally {
      setReceiptUpdateLoading(false);
    }
  };

  const selectedReceipt = useMemo(() => {
    if (selectedReceiptId === null) {
      return null;
    }

    return receipts.find((receipt) => receipt.id === selectedReceiptId) ?? null;
  }, [receipts, selectedReceiptId]);

  const handleSelectReceipt = (receiptId: number | null) => {
    setReceiptUpdateError(null);
    setSelectedReceiptId(receiptId);
  };

  useEffect(() => {
    if (selectedReceipt === null) {
      setSelectedReceiptImageUrl(null);
      setSelectedReceiptImageError(null);
      setSelectedReceiptImageLoading(false);
      return;
    }

    if (selectedReceipt.sourceScanId === null) {
      setSelectedReceiptImageUrl(null);
      setSelectedReceiptImageError("This receipt has no uploaded image attached.");
      setSelectedReceiptImageLoading(false);
      return;
    }

    let isActive = true;
    let createdUrl: string | null = null;

    const fetchImage = async () => {
      try {
        setSelectedReceiptImageLoading(true);
        setSelectedReceiptImageError(null);

        const response = await apiClient.get(`/api/receipts/${selectedReceiptId}/image`, {
          responseType: "blob",
        });

        if (!isActive) {
          return;
        }

        createdUrl = URL.createObjectURL(response.data as Blob);
        setSelectedReceiptImageUrl(createdUrl);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;
          if (handleAuthFailure(status)) {
            return;
          }
          if (error.response?.status === 404) {
            setSelectedReceiptImageError("No uploaded image is linked to this receipt.");
          } else if (status) {
            setSelectedReceiptImageError(`Could not load receipt image (HTTP ${status}).`);
          } else {
            setSelectedReceiptImageError("Could not load receipt image.");
          }
        } else {
          setSelectedReceiptImageError("Could not load receipt image.");
        }
        setSelectedReceiptImageUrl(null);
      } finally {
        if (isActive) {
          setSelectedReceiptImageLoading(false);
        }
      }
    };

    void fetchImage();

    return () => {
      isActive = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [selectedReceipt]);

  useEffect(() => {
    if (currentUser === null) {
      return;
    }

    void loadCategories();

    if (location.pathname === "/receipts" || location.pathname === "/dashboard") {
      void loadReceipts();
    }
  }, [currentUser, location.pathname]);

  useEffect(() => {
    if (selectedReceiptId === null) {
      return;
    }

    const exists = receipts.some((receipt) => receipt.id === selectedReceiptId);
    if (!exists) {
      setSelectedReceiptId(null);
    }
  }, [receipts, selectedReceiptId]);

  const isScanRoute = location.pathname === "/scan" || location.pathname === "/";
  const isReceiptsRoute = location.pathname === "/receipts";
  const isDashboardRoute = location.pathname === "/dashboard";
  const isAuthenticated = currentUser !== null;

  const scanView = (
    <ScanView
      selectedFile={selectedFile}
      selectedFileLabel={selectedFileLabel}
      previewUrl={previewUrl}
      uploading={uploading}
      startingCamera={startingCamera}
      cameraActive={cameraActive}
      videoRef={videoRef}
      onFileChange={handleFileChange}
      onScanClick={handleScanClick}
      onStopCamera={handleStopCameraClick}
      onUpload={handleUpload}
    />
  );

  const correctionView = (
    <CorrectionView
      mobileCorrectionView={mobileCorrectionView}
      onMobileCorrectionViewChange={setMobileCorrectionView}
      previewUrl={previewUrl}
      selectedFileLabel={selectedFileLabel}
      receiptForm={receiptForm}
      setReceiptForm={setReceiptForm}
      categories={categories}
      categoriesLoading={categoriesLoading}
      onCreateCategory={createCategory}
      updateLine={updateLine}
      removeLine={removeLine}
      addLine={addLine}
      onSubmitCorrection={submitCorrection}
      submittingCorrection={submittingCorrection}
    />
  );

  const guardedCorrectionView = canCorrect ? (
    correctionView
  ) : (
    <Navigate to="/scan" replace />
  );

  const receiptsView = (
    <ReceiptsView
      receiptsLoading={receiptsLoading}
      receiptsError={receiptsError}
      receipts={receipts}
      selectedReceiptId={selectedReceiptId}
      onSelectReceipt={handleSelectReceipt}
      selectedReceipt={selectedReceipt}
      selectedReceiptImageLoading={selectedReceiptImageLoading}
      selectedReceiptImageError={selectedReceiptImageError}
      selectedReceiptImageUrl={selectedReceiptImageUrl}
      onCompleteEdit={completeReceiptEdit}
      onDeleteReceipt={deleteReceipt}
      receiptUpdateLoading={receiptUpdateLoading}
      receiptUpdateError={receiptUpdateError}
      categories={categories}
      categoriesLoading={categoriesLoading}
      onCreateCategory={createCategory}
      onUpdateCategory={updateCategory}
      onDeleteCategory={deleteCategory}
    />
  );

  const dashboardView = (
    <SpendingDashboardView
      receiptsLoading={receiptsLoading}
      receiptsError={receiptsError}
      receipts={receipts}
    />
  );

  const authView = (
    <AuthView
      authMode={authMode}
      authSubmitting={authSubmitting}
      loginIdentifier={loginIdentifier}
      loginPassword={loginPassword}
      registerUsername={registerUsername}
      registerEmail={registerEmail}
      registerPassword={registerPassword}
      onLoginIdentifierChange={setLoginIdentifier}
      onLoginPasswordChange={setLoginPassword}
      onRegisterUsernameChange={setRegisterUsername}
      onRegisterEmailChange={setRegisterEmail}
      onRegisterPasswordChange={setRegisterPassword}
      onLogin={handleLogin}
      onRegister={handleRegister}
      onToggleMode={() => {
        setErrorMessage(null);
        setAuthMode((prev) => (prev === "login" ? "register" : "login"));
      }}
    />
  );

  if (authLoading) {
    return <SessionLoadingView />;
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
                      <Grid size={4}>
                        <Button
                          variant={isScanRoute ? "contained" : "outlined"}
                          fullWidth
                          className="mode-button"
                          onClick={() => navigate("/scan")}
                        >
                          Scan
                        </Button>
                      </Grid>
                      <Grid size={4}>
                        <Button
                          variant={isReceiptsRoute ? "contained" : "outlined"}
                          fullWidth
                          className="mode-button"
                          onClick={() => navigate("/receipts")}
                        >
                          Receipts
                        </Button>
                      </Grid>
                      <Grid size={4}>
                        <Button
                          variant={isDashboardRoute ? "contained" : "outlined"}
                          fullWidth
                          className="mode-button"
                          onClick={() => navigate("/dashboard")}
                        >
                          Dashboard
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
                    path="/receipts"
                    element={isAuthenticated ? receiptsView : <Navigate to="/login" replace />}
                  />
                  <Route
                    path="/dashboard"
                    element={isAuthenticated ? dashboardView : <Navigate to="/login" replace />}
                  />
                  <Route
                    path="*"
                    element={<Navigate to={isAuthenticated ? "/scan" : "/login"} replace />}
                  />
                </Routes>

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
