import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import type { EditableReceiptLine, ReceiptApiResponse } from "../../../shared/types/receipt";

type ReceiptsViewProps = {
  receiptsLoading: boolean;
  receiptsError: string | null;
  receipts: ReceiptApiResponse[];
  selectedReceiptId: number | null;
  onSelectReceipt: (receiptId: number | null) => void;
  selectedReceipt: ReceiptApiResponse | null;
  selectedReceiptImageLoading: boolean;
  selectedReceiptImageError: string | null;
  selectedReceiptImageUrl: string | null;
  onRefresh: () => Promise<void>;
  onCompleteEdit: (receiptId: number, lines: EditableReceiptLine[]) => Promise<boolean>;
  onDeleteReceipt: (receiptId: number) => Promise<boolean>;
  receiptUpdateLoading: boolean;
  receiptUpdateError: string | null;
};

export function ReceiptsView({
  receiptsLoading,
  receiptsError,
  receipts,
  selectedReceiptId,
  onSelectReceipt,
  selectedReceipt,
  selectedReceiptImageLoading,
  selectedReceiptImageError,
  selectedReceiptImageUrl,
  onRefresh,
  onCompleteEdit,
  onDeleteReceipt,
  receiptUpdateLoading,
  receiptUpdateError,
}: ReceiptsViewProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftLines, setDraftLines] = useState<EditableReceiptLine[]>([]);

  useEffect(() => {
    if (!selectedReceipt) {
      setIsEditMode(false);
      setDraftLines([]);
      return;
    }

    setIsEditMode(false);
    setDraftLines(
      selectedReceipt.lines.map((line) => ({
        id: line.id,
        name: line.name,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: String(line.unitPrice),
      })),
    );
  }, [selectedReceipt]);

  const handleDraftLineChange = (
    index: number,
    field: keyof EditableReceiptLine,
    value: string,
  ) => {
    setDraftLines((prev) =>
      prev.map((line, lineIndex) => (lineIndex === index ? { ...line, [field]: value } : line)),
    );
  };

  const handleComplete = async () => {
    if (!selectedReceipt) {
      return;
    }

    const success = await onCompleteEdit(selectedReceipt.id, draftLines);
    if (success) {
      setIsEditMode(false);
      onSelectReceipt(null);
    }
  };

  const handleDiscard = () => {
    setIsEditMode(false);
    onSelectReceipt(null);
  };

  const handleDelete = async () => {
    if (!selectedReceipt) {
      return;
    }

    const confirmed = window.confirm("Delete this receipt permanently?");
    if (!confirmed) {
      return;
    }

    const success = await onDeleteReceipt(selectedReceipt.id);
    if (success) {
      setIsEditMode(false);
      onSelectReceipt(null);
    }
  };

  return (
    <Stack spacing={1.2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Uploaded Receipts</Typography>
        <Button variant="outlined" onClick={() => void onRefresh()} disabled={receiptsLoading}>
          {receiptsLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </Stack>

      {receiptsLoading ? (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={18} />
          <Typography color="text.secondary">Loading receipts...</Typography>
        </Stack>
      ) : null}

      {receiptsError ? <Alert severity="error">{receiptsError}</Alert> : null}

      {!receiptsLoading && !receiptsError && receipts.length === 0 ? (
        <Alert severity="info">No receipts uploaded yet.</Alert>
      ) : null}

      {!receiptsLoading && !receiptsError
        ? receipts.map((receipt) => (
            <Box
              key={receipt.id}
              className="line-card"
              sx={{
                cursor: "pointer",
                border: selectedReceiptId === receipt.id ? "1px solid" : undefined,
                borderColor: selectedReceiptId === receipt.id ? "primary.main" : undefined,
              }}
              onClick={() => onSelectReceipt(receipt.id)}
            >
              <Stack spacing={0.6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {receipt.storeName || "Unknown Store"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receipt #{receipt.id} | {new Date(receipt.purchaseDateTime).toLocaleString()} | {receipt.currency}
                </Typography>
                {receipt.sourceScanId ? (
                  <Typography variant="caption" color="text.secondary">
                    Source scan ID: {receipt.sourceScanId}
                  </Typography>
                ) : null}

                <Stack spacing={0.4} sx={{ mt: 0.6 }}>
                  {receipt.lines.map((line) => (
                    <Typography key={line.id} variant="body2">
                      {line.name} - {line.quantity} {line.unit} - {line.unitPrice} {receipt.currency}
                    </Typography>
                  ))}
                </Stack>
              </Stack>
            </Box>
          ))
        : null}

      <Dialog
        open={selectedReceipt !== null}
        onClose={() => {
          if (receiptUpdateLoading) {
            return;
          }
          onSelectReceipt(null);
        }}
        fullWidth
        maxWidth="md"
      >
        {selectedReceipt ? (
          <>
            <DialogTitle sx={{ pr: 12 }}>
              Receipt #{selectedReceipt.id} | {selectedReceipt.storeName || "Unknown Store"}
              <IconButton
                aria-label="Delete receipt"
                onClick={() => {
                  void handleDelete();
                }}
                disabled={receiptUpdateLoading}
                color="error"
                sx={{ position: "absolute", right: 52, top: 10 }}
              >
                <DeleteOutlineRoundedIcon />
              </IconButton>
              <IconButton
                aria-label="Edit receipt items"
                onClick={() => setIsEditMode(true)}
                disabled={isEditMode || receiptUpdateLoading}
                sx={{ position: "absolute", right: 12, top: 10 }}
              >
                <EditRoundedIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ maxHeight: "72vh" }}>
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">
                  {new Date(selectedReceipt.purchaseDateTime).toLocaleString()} | {selectedReceipt.currency}
                </Typography>

                {selectedReceiptImageLoading ? (
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <CircularProgress size={18} />
                    <Typography color="text.secondary">Loading image...</Typography>
                  </Stack>
                ) : null}

                {selectedReceiptImageError ? (
                  <Alert severity="info">{selectedReceiptImageError}</Alert>
                ) : null}

                {selectedReceiptImageUrl ? (
                  <Box
                    component="img"
                    src={selectedReceiptImageUrl}
                    alt={`Receipt ${selectedReceipt.id}`}
                    className="preview-image correction-preview-image receipt-focus-media"
                  />
                ) : null}

                <Typography variant="subtitle2">Items</Typography>

                {isEditMode ? (
                  <Stack spacing={1}>
                    {draftLines.map((line, index) => (
                      <Box key={line.id} className="line-card">
                        <Stack spacing={1}>
                          <TextField
                            label="Name"
                            value={line.name}
                            onChange={(event) =>
                              handleDraftLineChange(index, "name", event.target.value)
                            }
                            fullWidth
                          />
                          <Stack direction="row" spacing={1}>
                            <TextField
                              label="Quantity"
                              value={line.quantity}
                              onChange={(event) =>
                                handleDraftLineChange(index, "quantity", event.target.value)
                              }
                              fullWidth
                            />
                            <TextField
                              label="Unit"
                              value={line.unit}
                              onChange={(event) =>
                                handleDraftLineChange(index, "unit", event.target.value)
                              }
                              fullWidth
                            />
                            <TextField
                              label="Unit Price"
                              value={line.unitPrice}
                              onChange={(event) =>
                                handleDraftLineChange(index, "unitPrice", event.target.value)
                              }
                              fullWidth
                            />
                          </Stack>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Stack spacing={0.4}>
                    {selectedReceipt.lines.map((line) => (
                      <Typography key={line.id} variant="body2">
                        {line.name} - {line.quantity} {line.unit} - {line.unitPrice} {selectedReceipt.currency}
                      </Typography>
                    ))}
                  </Stack>
                )}

                {receiptUpdateError ? <Alert severity="error">{receiptUpdateError}</Alert> : null}
              </Stack>
            </DialogContent>

            <DialogActions>
              {isEditMode ? (
                <>
                  <Button onClick={handleDiscard} disabled={receiptUpdateLoading}>
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => {
                      void handleComplete();
                    }}
                    disabled={receiptUpdateLoading}
                  >
                    {receiptUpdateLoading ? "Completing..." : "Complete"}
                  </Button>
                </>
              ) : (
                <Button onClick={() => onSelectReceipt(null)}>Close</Button>
              )}
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Stack>
  );
}
