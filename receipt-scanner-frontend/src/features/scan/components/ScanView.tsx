import { useMemo } from "react";
import type { ChangeEvent, RefObject } from "react";
import { Box, Button, CircularProgress, Grid, Typography } from "@mui/material";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";

type ScanViewProps = {
  selectedFile: File | null;
  selectedFileLabel: string;
  previewUrl: string | null;
  uploading: boolean;
  startingCamera: boolean;
  cameraActive: boolean;
  formattedScanResult?: string;
  formattedCorrectionResult?: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onScanClick: () => Promise<void>;
  onStopCamera: () => void;
  onUpload: () => Promise<void>;
};

export function ScanView({
  selectedFile,
  selectedFileLabel,
  previewUrl,
  uploading,
  startingCamera,
  cameraActive,
  formattedScanResult,
  formattedCorrectionResult,
  videoRef,
  onFileChange,
  onScanClick,
  onStopCamera,
  onUpload,
}: ScanViewProps) {
  const uploadDisabled = useMemo(() => uploading || !selectedFile, [uploading, selectedFile]);

  return (
    <>
      <Grid container spacing={1.2}  sx={{
    justifyContent: "center"}}>
        <Grid size={6}>
          <Button
            component="label"
            variant="outlined"
            fullWidth
            startIcon={<ImageRoundedIcon />}
          >
            Select Image
            <input
              hidden
              accept="image/*"
              capture="environment"
              type="file"
              onChange={onFileChange}
            />
          </Button>
        </Grid>
        {/* <Grid size={6}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<PhotoCameraRoundedIcon />}
            onClick={() => {
              void onScanClick();
            }}
            disabled={startingCamera}
          >
            {startingCamera ? "Starting..." : "Scan"}
          </Button>
        </Grid> */}
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

      {cameraActive ? (
        <Button variant="text" onClick={onStopCamera}>
          Stop Camera
        </Button>
      ) : null}

      {/* <Typography variant="body2" color="text.secondary">
        {selectedFileLabel}
      </Typography> */}

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
        onClick={() => {
          void onUpload();
        }}
        disabled={uploadDisabled}
      >
        {uploading ? "Uploading..." : "Upload"}
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
}
