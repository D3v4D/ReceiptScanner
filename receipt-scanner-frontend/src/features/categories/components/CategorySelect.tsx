import { useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
  Stack,
  Typography,
} from "@mui/material";
import type { Category } from "../../../shared/types/receipt";

type CategorySelectProps = {
  label: string;
  value: number | null;
  categories: Category[];
  loading?: boolean;
  disabled?: boolean;
  onChange: (value: number | null) => void;
  onCreateCategory: (name: string, description?: string) => Promise<Category | null>;
};

export function CategorySelect({
  label,
  value,
  categories,
  loading = false,
  disabled = false,
  onChange,
  onCreateCategory,
}: CategorySelectProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) {
      return;
    }

    try {
      setCreatingCategory(true);
      const created = await onCreateCategory(name, newCategoryDescription.trim() || undefined);
      if (created) {
        setNewCategoryName("");
        setNewCategoryDescription("");
        setCreateDialogOpen(false);
      }
    } finally {
      setCreatingCategory(false);
    }
  };

  return (
    <>
      <Stack spacing={0.5}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Select
          value={value ?? ""}
          onChange={(event) => {
            const selected = String(event.target.value);
            onChange(selected === "" ? null : Number(selected));
          }}
          fullWidth
          size="small"
          displayEmpty
          renderValue={(selected: unknown) => {
            if (selected === "") {
              return "No category";
            }

            const selectedCategory = categories.find((category) => category.id === selected);
            return selectedCategory?.name ?? "No category";
          }}
        >
          <MenuItem value="">No category</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.id} value={category.id}>
              {category.name}
            </MenuItem>
          ))}
          <MenuItem
            value="__create__"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setCreateDialogOpen(true);
            }}
          >
            <Stack sx={{ width: "100%", pt: 0.5 }}>
              <Button
                variant="text"
                disabled={loading || disabled}
                sx={{ justifyContent: "flex-start", px: 0 }}
              >
                Add new category
              </Button>
            </Stack>
          </MenuItem>
        </Select>
      </Stack>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add category</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Category name"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              fullWidth
              autoFocus
            />
            <TextField
              label="Description"
              value={newCategoryDescription}
              onChange={(event) => setNewCategoryDescription(event.target.value)}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={creatingCategory}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleCreateCategory();
            }}
            disabled={creatingCategory || !newCategoryName.trim()}
          >
            {creatingCategory ? "Creating..." : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}