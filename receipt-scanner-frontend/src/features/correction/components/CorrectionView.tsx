import { Alert, Box, Button, Grid, Stack, TextField, Typography } from "@mui/material";
import type { Dispatch, SetStateAction } from "react";
import type { ReceiptForm, ReceiptLineForm } from "../../../shared/types/receipt";

type MobileCorrectionView = "receipt" | "lines";

type CorrectionViewProps = {
  mobileCorrectionView: MobileCorrectionView;
  onMobileCorrectionViewChange: (value: MobileCorrectionView) => void;
  previewUrl: string | null;
  selectedFileLabel: string;
  receiptForm: ReceiptForm;
  setReceiptForm: Dispatch<SetStateAction<ReceiptForm>>;
  updateLine: (index: number, field: keyof ReceiptLineForm, value: string) => void;
  removeLine: (index: number) => void;
  addLine: () => void;
  onSubmitCorrection: () => Promise<void>;
  submittingCorrection: boolean;
};

export function CorrectionView({
  mobileCorrectionView,
  onMobileCorrectionViewChange,
  previewUrl,
  selectedFileLabel,
  receiptForm,
  setReceiptForm,
  updateLine,
  removeLine,
  addLine,
  onSubmitCorrection,
  submittingCorrection,
}: CorrectionViewProps) {
  return (
    <Stack spacing={1.2}>
      <Grid container spacing={1.2} className="mobile-correction-toggle" role="tablist" aria-label="Correction view switcher">
        <Grid size={6}>
          <Button
            variant={mobileCorrectionView === "receipt" ? "contained" : "outlined"}
            fullWidth
            onClick={() => onMobileCorrectionViewChange("receipt")}
          >
            Receipt
          </Button>
        </Grid>
        <Grid size={6}>
          <Button
            variant={mobileCorrectionView === "lines" ? "contained" : "outlined"}
            fullWidth
            onClick={() => onMobileCorrectionViewChange("lines")}
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
              <Box key={`line-${index}`} className="line-card">
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
              onClick={() => {
                void onSubmitCorrection();
              }}
              disabled={submittingCorrection}
            >
              {submittingCorrection ? "Submitting..." : "Submit Corrected Receipt"}
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}
